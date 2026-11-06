const TO='info@sskeurope.com';
export function mailConfiguration(env){
 const provider=env('SSK_PRODUCTION_MAIL_PROVIDER')||'';
 if(provider==='resend')return {provider,ready:!!env('SSK_RESEND_API_KEY')&&!!env('SSK_PRODUCTION_FROM'),recipient:TO};
 if(provider==='smtp')return {provider,ready:!!env('SSK_SMTP_HOST')&&!!env('SSK_SMTP_USER')&&!!env('SSK_SMTP_PASSWORD')&&!!env('SSK_PRODUCTION_FROM'),recipient:TO};
 return {provider:null,ready:false,recipient:TO};
}
export function createMailer({env,fetcher=fetch,smtpTransport}){
 const config=mailConfiguration(env),enabled=env('SSK_PRODUCTION_MAIL_ENABLED')==='true';
 return {...config,enabled,async send(packet,key){
  if(!enabled||!config.ready)throw Object.assign(Error('mail_connection_required'),{safeToRetry:true});
  if(!/^[a-zA-Z0-9_:@.-]{10,200}$/.test(key))throw Error('invalid_delivery_key');
  const from=env('SSK_PRODUCTION_FROM');if(!/^[^\r\n]+@[^\r\n]+$/.test(from))throw Error('mail_sender_invalid');
  if(config.provider==='resend'){
   let response;try{response=await fetcher('https://api.resend.com/emails',{method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+env('SSK_RESEND_API_KEY'),'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from,to:[TO],subject:packet.subject,html:packet.html,attachments:packet.attachments.map(a=>({filename:a.filename,content:a.content,content_type:a.content_type,...(a.content_id?{content_id:a.content_id}:{})}))})});}
   catch{throw Object.assign(Error('mail_outcome_unknown'),{safeToRetry:false});}
   const body=await response.json().catch(()=>({}));
   if(!response.ok){const safe=[400,401,403,422,429].includes(response.status);throw Object.assign(Error('mail_provider_rejected'),{safeToRetry:safe});}
   if(typeof body.id!=='string')throw Object.assign(Error('mail_outcome_unknown'),{safeToRetry:false});
   return {messageId:body.id,provider:'resend',recipient:TO};
  }
  const port=Number(env('SSK_SMTP_PORT')||465);if(![465,587].includes(port)||!smtpTransport)throw Object.assign(Error('smtp_configuration_invalid'),{safeToRetry:true});
  const transport=smtpTransport({host:env('SSK_SMTP_HOST'),port,secure:port===465,requireTLS:port===587,auth:{user:env('SSK_SMTP_USER'),pass:env('SSK_SMTP_PASSWORD')},tls:{rejectUnauthorized:true},connectionTimeout:10000,socketTimeout:20000});
  try{const result=await transport.sendMail({from,to:TO,subject:packet.subject,html:packet.html,messageId:'<'+key.replaceAll(':','-')+'@sskeurope.com>',attachments:packet.attachments.map(a=>({filename:a.filename,content:a.content,encoding:'base64',contentType:a.content_type,...(a.content_id?{cid:a.content_id}:{})}))});if(!result.accepted?.includes(TO))throw Error('not_accepted');return {messageId:result.messageId,provider:'smtp',recipient:TO};}
  catch(error){throw Object.assign(Error('mail_outcome_unknown'),{safeToRetry:['EAUTH','ECONNECTION','EDNS'].includes(error.code)});}
  finally{transport.close?.();}
 }};
}
