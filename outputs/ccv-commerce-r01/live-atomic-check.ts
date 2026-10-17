const tag='ssk-qa-'+Date.now(),report={tag,claims:[],admissions:[],resets:[]};
const rates=base44.entities.GloveRateBucket,drafts=base44.entities.GloveOrderDraft;
let rateId,draftId;
try {
 const row=await rates.create({key:'0000',uses:0,expires_at:new Date(Date.now()+3600000).toISOString()});rateId=row.id;report.initialRate=row;
 const resets=await Promise.allSettled(Array.from({length:5},()=>rates.updateMany({id:rateId,$or:[{key:'initial-global'},{key:{$lt:tag}}]},{$set:{key:tag,uses:0}})));
 report.resets=resets.map(r=>r.status==='fulfilled'?r.value:{error:r.reason.status||'unknown'});
 const admission=await Promise.allSettled(Array.from({length:5},()=>rates.updateMany({id:rateId,key:tag,uses:{$lt:3}},{$inc:{uses:1}})));
 report.admissions=admission.map(r=>r.status==='fulfilled'?r.value:{error:r.reason.status||'unknown'});report.finalRate=await rates.get(rateId);
 const draft=await drafts.create({reference:tag,design:{synthetic:true},quote:{total:37495},previews:[],view_hash:'synthetic',checkout_hash:'synthetic',client_hash:tag,expires_at:new Date(Date.now()+3600000).toISOString(),status:'draft'});draftId=draft.id;
 const claims=await Promise.allSettled(Array.from({length:5},()=>drafts.updateMany({id:draftId,status:'draft'},{$set:{status:'submitting'}})));
 report.claims=claims.map(r=>r.status==='fulfilled'?r.value:{error:r.reason.status||'unknown'});report.finalDraft=await drafts.get(draftId);
} catch(e){report.error={status:e.status,message:e.message};}
finally {report.cleanup=[];for(const [entity,id] of [[rates,rateId],[drafts,draftId]])if(id)try{await entity.delete(id);report.cleanup.push({id,deleted:true});}catch(e){report.cleanup.push({id,error:e.status});}console.log(JSON.stringify(report));}
