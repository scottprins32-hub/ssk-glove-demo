// Local QA proxy. Never exposes credentials, never forwards CCV writes.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createCommerce} from '../commerce/backend/service.js';
import {createStore} from '../commerce/backend/store.js';
import {API_REVISION} from '../glove_builder/customiser/commerce-config.js';
const root=path.resolve('_base44'),port=Number(process.env.SSK_PREVIEW_PORT||8892);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.avif':'image/avif'};
// Optional local-only design demo, explicitly labelled. Never simulates payment.
let simulate;
if(process.env.SSK_PREVIEW_SIMULATE==='1') {
 const rows=new Map(),rate={id:'local-rate',key:'initial-global',uses:0};
 const match=(r,q)=>Object.entries(q).every(([k,v])=>v&&typeof v==='object'?Object.entries(v).every(([op,x])=>op==='$lt'&&r[k]<x):r[k]===v);
 const patch=(r,p)=>{Object.assign(r,p.$set||{});for(const [k,v] of Object.entries(p.$inc||{}))r[k]+=v;};
 const entity={create:async data=>{const r={...data,id:crypto.randomUUID()};rows.set(r.id,r);return structuredClone(r);},
   get:async id=>structuredClone(rows.get(id)),update:async(id,data)=>{Object.assign(rows.get(id),data);return structuredClone(rows.get(id));},
   list:async()=>[...rows.values()],updateMany:async(q,p)=>{const r=rows.get(q.id);if(!r||!match(r,q))return {updated:0};patch(r,p);return {updated:1};}};
 const buckets={get:async()=>structuredClone(rate),updateMany:async(q,p)=>{if(!match(rate,q))return {updated:0};patch(rate,p);return {updated:1};}};
 simulate=createCommerce({store:createStore(entity,buckets,'local-rate'),ccv:{configured:false},requireAdmin:async()=>{throw Error('No admin in local demo');},appUrl:'http://127.0.0.1:'+port+'/'});
}
http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/commerce'){
   if(req.method!=='POST'){res.writeHead(405);res.end();return;}
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>3000000)throw Error('Too large');}
   const input=JSON.parse(body);
   if(simulate){try{const result=await simulate(input);res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({...result,apiRevision:API_REVISION}));}catch(e){res.writeHead(e.status||503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.code||'service_unavailable'}));}return;}
   if(!['config','create','copy','read','status'].includes(input.action)){res.writeHead(403);res.end('{"error":"preview_read_only_checkout"}');return;}
   const upstream=await fetch('https://base44.app/api/apps/6acecad7d76f2c87da8db964/functions/ssk-commerce-v10',{method:'POST',headers:{'Content-Type':'application/json','X-App-Id':'6acecad7d76f2c87da8db964'},body});
   const reply=await upstream.text();console.log(JSON.stringify({action:input.action,requestBytes:Buffer.byteLength(body),status:upstream.status,error:upstream.ok?undefined:reply.slice(0,160)}));res.writeHead(upstream.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(reply);return;
  }
  if(url.pathname==='/commerce-config.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});res.end("export const API_ENDPOINT='/api/commerce';export const APP_ID='6acecad7d76f2c87da8db964';export const TEST_MODE=true;export const API_REVISION='ccv-r02-01';");return;}
  const filename=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!filename.startsWith(root+path.sep)||!(await stat(filename)).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(filename));
 }catch{res.writeHead(503);res.end('Preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log('SSK commerce '+(simulate?'LOCAL DEMO':'live-backend preview')+': http://127.0.0.1:'+port));
