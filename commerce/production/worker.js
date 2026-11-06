import {tokenHash} from '../backend/service.js';
const VERSION='factory-packet-v2';
const safeError=e=>/^[a-z][a-z0-9_]{2,80}$/.test(e?.message||'')?e.message:'production_unavailable';
const synthetic=d=>/^(?:QA(?:\s|$)|ACCEPTANCE(?:\s|$)|DO NOT FULFIL(?:\s|$))/i.test(d.design?.thumbText||'');
export function createProductionWorker({store,ccv,buildPacket,files,mailer,onError=()=>{},now=()=>new Date(),id=()=>crypto.randomUUID()}) {
 const stamp=()=>now().toISOString(),later=minutes=>new Date(now().getTime()+minutes*60000).toISOString();
 async function process(leadId,{prepareOnly=false}={}) {
  const lead=await store.get(leadId);
  if(!lead?.ccv_order_id||!['ready','ordered'].includes(lead.status))return {status:'not_transferred'};
  const ids=Array.isArray(lead.bundle)?lead.bundle:[lead.id];
  if(ids[0]!==lead.id){await store.cas(lead,{state:'bundle_member',checked_at:stamp()});return {status:'bundle_member'};}
  if(!ids.length||ids.length>6||new Set(ids).size!==ids.length)throw Error('production_bundle_invalid');
  const previous=lead.production_delivery||{};
  if(['sent','uncertain','cancelled','synthetic_skipped'].includes(previous.state))return {status:previous.state};
  if(['processing','sending'].includes(previous.state)) {
   if(!Number.isFinite(Date.parse(previous.claimed_at))||now().getTime()-Date.parse(previous.claimed_at)>600000) {
    const state=previous.state==='sending'?'uncertain':'failed';
    await store.cas(lead,{...previous,state,error:'previous_run_interrupted',checked_at:stamp(),next_attempt_at:later(5)});
    return {status:state};
   }
   return {status:previous.state};
  }
  const claim=id(),state={...previous,state:'processing',claim,claimed_at:stamp(),checked_at:stamp(),next_attempt_at:later(5),version:VERSION,error:null};
  if(!await store.cas(lead,state))return {status:'busy'};
  let sending=false,phase='bundle';
  const finish=async(value)=>{if(!await store.finish(lead.id,claim,{...state,...value}))throw Error('production_claim_lost');};
  try {
   const drafts=await Promise.all(ids.map(x=>x===lead.id?lead:store.get(x)));
   if(drafts.some(d=>!d||d.ccv_order_id!==lead.ccv_order_id||!['ready','ordered'].includes(d.status)||JSON.stringify(d.bundle||[d.id])!==JSON.stringify(ids)))throw Error('production_bundle_invalid');
   if(drafts.some(synthetic)){await finish({state:'synthetic_skipped'});return {status:'synthetic_skipped'};}
   phase='verify_order';const order=await ccv.order(lead.ccv_order_id,drafts,{production:true});
   if(Number(order.status)===8){await finish({state:'cancelled'});return {status:'cancelled'};}
   if(order.is_completed!==true){await finish({state:'awaiting_checkout',next_attempt_at:later(15)});return {status:'awaiting_checkout'};}
   phase='signature';const signature=await tokenHash(JSON.stringify({version:VERSION,order:order.id,designs:drafts.map(d=>[d.id,d.design,d.quote]),quantities:order.verifiedRows.map(r=>Number(r.count))}));
   if(previous.sent_parts?.length&&previous.signature!==signature)throw Error('production_partially_sent_order_changed');
   Object.assign(state,{signature,sent_parts:previous.signature===signature?(previous.sent_parts||[]):[],order_number:String(order.ordernumber_full||order.ordernumber||order.order_number||order.id)});
   let packet;phase='read_packet';
   if(previous.file_uri&&previous.signature===signature)packet=await files.read(previous.file_uri);
   else {
    const normalized=drafts.map((d,i)=>({...d,quantity:Number(order.verifiedRows[i].count),previews:d.previews.map(p=>p.available?{...p,dataUrl:p.dataUrl||p.chunks?.join('')}:p)}));
    phase='build_packet';const built=await buildPacket({order,drafts:normalized});
    packet={messages:built.messages,subject:built.subject,html:built.html,attachments:built.attachments,manifest:built.manifest};
    phase='store_packet';state.file_uri=await files.save('SSK-'+state.order_number+'-production.json',packet);
   }
   if(prepareOnly||!mailer.enabled||!mailer.ready) {
    phase='persist_ready';await finish({state:'ready',prepared_at:stamp(),error:mailer.ready?null:'mail_connection_required'});
    return {status:'ready',orderId:order.id,orderNumber:state.order_number,designs:drafts.length,mailConnected:mailer.ready};
   }
   // Recheck the authoritative order, without changing its products or payment.
   const latest=await ccv.order(order.id,drafts,{production:true});
   if(latest.is_completed!==true||Number(latest.status)===8||JSON.stringify(latest.verifiedRows.map(r=>Number(r.count)))!==JSON.stringify(order.verifiedRows.map(r=>Number(r.count))))throw Error('production_order_changed');
   await finish({state:'sending'});sending=true;
   const messages=packet.messages?.length?packet.messages:[packet];
   for(let part=0;part<messages.length;part++) {
    if(state.sent_parts.some(p=>p.part===part))continue;
    let receipt;
    try {const message=messages[part],attachments=message.attachmentNames?.map(name=>packet.attachments.find(a=>a.filename===name));if(attachments?.some(a=>!a))throw Error('packet_attachment_missing');receipt=await mailer.send(attachments?{...message,attachments}:message,'ssk:'+order.id+':'+signature+':'+part);}
    catch(error) {
     const status=error.safeToRetry===true?'failed':'uncertain';
     await finish({state:status,error:safeError(error)});return {status,error:safeError(error)};
    }
    state.sent_parts.push({part,message_id:receipt.messageId,provider:receipt.provider});
    await finish({state:'sending'});
   }
   await finish({state:'sent',sent_at:stamp(),message_id:state.sent_parts.map(p=>p.message_id).join(','),provider:state.sent_parts[0]?.provider,error:null});
   return {status:'sent',orderId:order.id,messageId:state.sent_parts.map(p=>p.message_id).join(',')};
  } catch(error) {
   onError({phase,name:error?.name||'Error',...(error?.name==='CompileError'?{codecError:String(error.message).slice(0,300)}:{}),frames:String(error?.stack||'').split('\n').slice(1,4).map(s=>s.replace(/\?[^ )]+/g,'?[redacted]'))});
   // Once transmission might have happened, never turn an unknown outcome into
   // a retryable failure. An administrator must reconcile provider evidence.
   const status=sending||error.message==='production_partially_sent_order_changed'?'uncertain':'failed',code=safeError(error);
   await store.finish(lead.id,claim,{...state,state:status,error:code}).catch(()=>false);
   return {status,error:code,phase};
  }
 }
 async function scan() {
  // Fetch a stable projected batch before modifying it. Persisted next-attempt
  // times keep abandoned carts and failures from starving later paid orders.
  const rows=await store.candidates({at:stamp(),mailEnabled:mailer.enabled&&mailer.ready,limit:50});
  const results=[];
  for(const row of rows) {
   if(['sent','uncertain','cancelled','synthetic_skipped'].includes(row.production_delivery?.state))continue;
   if(row.production_delivery?.state==='ready'&&(!mailer.enabled||!mailer.ready))continue;
   if(row.production_delivery?.next_attempt_at>stamp())continue;
   try{results.push({id:row.id,...await process(row.id)});}
   catch(error){results.push({id:row.id,status:'failed',error:safeError(error)});}
   if(results.length===3)break;
  }
  return results;
 }
 return {process,scan};
}
