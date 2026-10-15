import {createClientFromRequest} from 'npm:@base44/sdk@0.8.54';
import {createCommerce,tokenHash} from './lib/service.js';
import {createStore} from './lib/store.js';
import {createCcv} from './lib/ccv.js';
import {CommerceError} from './lib/commerce-contract.js';

const APP_ID='6acecad7d76f2c87da8db964';
const allowed=new Set(['https://ssk-glove-configurator-da8db964.base44.app','https://scottprins32-hub.github.io','https://sskeurope.ccvshop.nl']);
Deno.serve(async(request)=>{
  const origin=request.headers.get('Origin');
  const cors={'Vary':'Origin','Access-Control-Allow-Origin':origin&&allowed.has(origin)?origin:'null',
    'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, X-App-Id','Cache-Control':'no-store'};
  if(origin&&!allowed.has(origin)) return Response.json({error:'origin_denied'},{status:403,headers:cors});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return Response.json({error:'method_not_allowed'},{status:405,headers:cors});
  let diagnosticAdmin=false;
  try {
    const reader=request.body?.getReader();let length=0,parts=[];
    if(!reader)throw new CommerceError('invalid_request');
    for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;
      if(length>3000000){await reader.cancel();throw new CommerceError('request_too_large',413);}parts.push(value);}
    const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
    let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new CommerceError('invalid_request');}
    // Validate the platform context, then pass the original request to the SDK.
    // Keep the SDK entry point intact after validating the platform context.
    if(request.headers.get('Base44-App-Id')!==APP_ID)throw new CommerceError('invalid_platform_context',403);
    const apiUrl=new URL(request.headers.get('Base44-Api-Url')||'https://base44.app');
    if(apiUrl.origin!=='https://base44.app'||!['','/'].includes(apiUrl.pathname)||apiUrl.search||apiUrl.hash||apiUrl.username||apiUrl.password)throw new CommerceError('invalid_platform_context',403);
    const client=createClientFromRequest(request);
    const entity=client.asServiceRole.entities.GloveOrderDraft;
    const rawStore=createStore(entity,client.asServiceRole.entities.GloveRateBucket,'6ad0d87a4f12d75db8726165');
    const store=Object.fromEntries(Object.entries(rawStore).map(([name,fn])=>[name,async(...args)=>{try{return await fn(...args);}catch(error){error.phase=name;throw error;}}]));
    const ccv=createCcv({key:Deno.env.get('CCV_API_KEY'),secret:Deno.env.get('CCV_API_SECRET')});
    const requireAdmin=async()=>{let user;try{user=await client.auth.me();}catch{}if(user?.role!=='admin')throw new CommerceError('admin_required',403);};
    if(body.diagnostics===true){await requireAdmin();diagnosticAdmin=true;}
    const service=createCommerce({store,ccv,requireAdmin,appUrl:'https://ssk-glove-configurator-da8db964.base44.app/'});
    const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
    const clientFingerprint=await tokenHash(APP_ID+'|'+ip);
    return Response.json({...await service(body,{clientFingerprint}),apiRevision:'ccv-r01-14'},{headers:cors});
  } catch(error) {
    console.error('SSK commerce failure',error?.name,error?.status,error?.message);
    return Response.json({error:error instanceof CommerceError?error.code:'service_unavailable',apiRevision:'ccv-r01-14',error_kind:error instanceof CommerceError?undefined:error?.name,upstream_status:error?.status||error?.response?.status,error_phase:error?.phase,diagnostic:diagnosticAdmin?{message:error?.message,detail:error?.response?.data?.detail}:undefined},
      {status:error instanceof CommerceError?error.status:503,headers:cors});
  }
});
