import{createClientFromRequest}from'npm:@base44/sdk@0.8.59';
import nodemailer from'npm:nodemailer@10.3.1';
import{createCcv}from'./lib/ccv.js';
import{createProductionWorker}from'./lib/worker.js';
import{productionStore}from'./lib/production-store.js';
import{createMailer}from'./lib/mailer.js';
import{buildFactoryPacket}from'./lib/packet.bundle.js';
const APP_ID='6acecad7d76f2c87da8db964';
Deno.serve(async request=>{
 const origin=request.headers.get('Origin'),allowed=new Set(['https://ssk-glove-configurator-da8db964.base44.app','https://base44.app']);
 const cors={'Vary':'Origin','Access-Control-Allow-Origin':origin&&allowed.has(origin)?origin:'null','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-App-Id','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const json=(value:unknown,options:any={})=>Response.json(value,{...options,headers:{...cors,...(options.headers||{})}});
 if(origin&&!allowed.has(origin))return json({error:'origin_denied'},{status:403});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return json({error:'method_not_allowed'},{status:405});
 let authenticated=false;
 try{
  if(request.headers.get('Base44-App-Id')!==APP_ID)return json({error:'invalid_platform_context'},{status:403});
  const apiUrl=new URL(request.headers.get('Base44-Api-Url')||'https://base44.app');
  if(!['https://base44.app','https://ssk-glove-configurator-da8db964.base44.app'].includes(apiUrl.origin)||!['','/'].includes(apiUrl.pathname)||apiUrl.search||apiUrl.hash||apiUrl.username||apiUrl.password)return json({error:'invalid_platform_context'},{status:403});
  const client=createClientFromRequest(request);let user;try{user=await client.auth.me();}catch{}
  // Native Base44 schedules authenticate as their creator. Public requests
  // cannot trigger email delivery, select a recipient, or fetch packet files.
  if(user?.role!=='admin')return json({error:'admin_required'},{status:403});
  authenticated=true;
  const raw=await request.text();if(raw.length>4096)return json({error:'request_too_large'},{status:413});
  const input=JSON.parse(raw);
  const store=productionStore(client.asServiceRole.entities.GloveOrderDraft),ccv=createCcv({key:Deno.env.get('CCV_SHOP_API_KEY'),secret:Deno.env.get('CCV_SHOP_API_SECRET')}),mailer=createMailer({env:n=>Deno.env.get(n),smtpTransport:config=>nodemailer.createTransport(config)});
  const bounded=async(p,ms)=>{let timer;try{return await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('packet_storage_timeout')),ms);})]);}finally{clearTimeout(timer);}};
  const files={async save(name,data){const result=await bounded(client.asServiceRole.integrations.Core.UploadPrivateFile({file:new File([JSON.stringify(data)],name,{type:'application/json'})}),40000);if(typeof result.file_uri!=='string')throw Error('packet_storage_failed');return result.file_uri;},async read(uri){if(typeof uri!=='string'||!uri.startsWith('mp/private/'+APP_ID+'/'))throw Error('packet_storage_invalid');const result=await bounded(client.asServiceRole.integrations.Core.CreateFileSignedUrl({file_uri:uri,expires_in:300}),20000);const url=new URL(result.signed_url);if(url.protocol!=='https:'||url.origin!=='https://media.base44.com'||!url.pathname.startsWith('/files/private/'+APP_ID+'/'))throw Error('packet_storage_invalid');const response=await fetch(url.href,{headers:{Accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('packet_storage_failed');const raw=await response.text();if(raw.length>120000000)throw Error('packet_storage_too_large');return JSON.parse(raw);}};
  const worker=createProductionWorker({store,ccv,buildPacket:buildFactoryPacket,files,mailer,onError:detail=>console.error('SSK production phase',JSON.stringify(detail))});
  if(input.action==='list'){const offset=Number.isSafeInteger(input.offset)&&input.offset>=0&&input.offset<=10000?input.offset:0;const rows=await client.asServiceRole.entities.GloveOrderDraft.filter({status:{$in:['ready','ordered']},ccv_order_id:{$gt:0}},'-created_date',50,offset,['id','reference','ccv_order_id','bundle','production_delivery']);return json({orders:rows.filter(r=>!r.bundle||r.bundle[0]===r.id).map(r=>({id:r.id,reference:r.reference,orderId:r.ccv_order_id,designs:r.bundle?.length||1,state:r.production_delivery?.state||'unchecked',orderNumber:r.production_delivery?.order_number||null,error:r.production_delivery?.error||null,packetReady:!!r.production_delivery?.file_uri})),nextOffset:rows.length===50?offset+50:null});}
  if(input.action==='config')return json({provider:mailer.provider,mailConnected:mailer.ready,emailEnabled:mailer.enabled,recipient:mailer.recipient});
  if(input.action==='scan')return json({results:await worker.scan(),mailConnected:mailer.ready,emailEnabled:mailer.enabled});
  if(input.action==='prepare'&&/^[a-zA-Z0-9_-]{8,80}$/.test(input.id))return json(await worker.process(input.id,{prepareOnly:true}));
  if(input.action==='send'&&input.confirmed===true&&/^[a-zA-Z0-9_-]{8,80}$/.test(input.id))return json(await worker.process(input.id));
  if(input.action==='packet'&&/^[a-zA-Z0-9_-]{8,80}$/.test(input.id)){const row=await store.get(input.id);if(!row.production_delivery?.file_uri)return json({error:'packet_not_prepared'},{status:404});return json(await files.read(row.production_delivery.file_uri));}
  return json({error:'invalid_action'},{status:400});
 }catch(error){console.error('SSK production error',JSON.stringify({name:error?.name,frames:String(error?.stack||'').split('\n').slice(1,3).map(s=>s.replace(/\?[^ )]+/g,'?[redacted]'))}));return json({error:(/^[a-z][a-z0-9_]{2,80}$/.test(error?.message||'')?error.message:'production_unavailable'),...(authenticated?{diagnostic:{name:error?.name,message:error?.name==='TypeError'?String(error.message).replace(/https?:\/\/[^\s)]+/g,'[storage-url]').slice(0,300):undefined,frames:String(error?.stack||'').split('\n').slice(1,3).map(s=>s.replace(/\?[^ )]+/g,'?[redacted]'))}}:{})},{status:503});}
});
