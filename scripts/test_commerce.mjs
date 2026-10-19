import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import { validateDesign, quoteDesign, validatePreviews, safeCheckoutUrl, specification } from '../glove_builder/customiser/commerce-contract.js';
import {COMMERCE_CATALOG} from '../glove_builder/customiser/commerce-catalog.js';
import {COLOUR_ORDER} from '../glove_builder/customiser/glove-catalog.js';
import {createCcv,signRequest} from '../commerce/backend/ccv.js';
import {createCommerce,tokenHash} from '../commerce/backend/service.js';

export const fixture=()=>({hand:'RHT',size:'11.75"',webType:'H-Web',pad:'None',bullet:7,
  colors:Object.fromEntries(COLOUR_ORDER.map(f=>[f,'10'])),materials:{},flag:'None',lang:'nl'});
export const previews=()=>['back','palm','thumb','pinky'].map(view=>({view,available:false,notes:['Test: no preview supplied.']}));
export function harness(ccvOverrides={},options={}) {
  const data=new Map(),rates=new Map();let seq=0,posts=0;
  const store={get:async id=>structuredClone(data.get(id)),create:async d=>{
    const row={...structuredClone(d),id:'draft_'+String(++seq).padStart(10,'0'),created_date:new Date().toISOString()};data.set(row.id,row);return structuredClone(row);},
    update:async(id,patch)=>{Object.assign(data.get(id),structuredClone(patch));return structuredClone(data.get(id));},
    list:async()=>[...data.values()],reserveRate:async(hash,hour)=>{const k=hour,n=rates.get(k)||0;if(n>=100)return false;rates.set(k,n+1);return true;},
    claim:async(id)=>{const d=data.get(id);if(d.status!=='draft')return false;d.status='submitting';return true;}};
  const ccv={configured:true,product:async()=>({id:896372573,name:'SSK Custom Glove',price:374.95,discount:0}),
    prepare:async(d)=>{posts++;return {id:777,url:'https://sskeurope.ccvshop.nl/checkout?basket=example'};},
    order:async(id,d)=>({id,is_completed:false,paid:false,checkout_href:'https://sskeurope.ccvshop.nl/checkout',reservationnumber:'SSK-'+d.id,currency:'EUR',total_orderrow_price:d.quote.total/100,order_row_taxes_included:true}),...ccvOverrides};
  const run=createCommerce({store,ccv,requireAdmin:async u=>{if(u?.role!=='admin')throw Object.assign(Error('admin_required'),{status:403});},appUrl:'https://example.com/',checkoutEnabled:true,...options});
  const save=()=>run({action:'create',confirmed:true,design:fixture(),previews:previews()});
  return {run,save,data,store,ccv,get posts(){return posts;}};
}
test('a missing hand and invalid size/web cannot become a checkout', () => {
  assert.throws(()=>validateDesign({}), /design/);
});
test('quotes are computed in cents and a flag is exactly five euros', () => {
  assert.equal(quoteDesign({flag:'None'}).total,37495);
  assert.equal(quoteDesign({flag:'Japan'}).total,37995);
});
test('snapshot strips contact details, unsupported state and client totals',()=>{
  const d=validateDesign({...fixture(),name:'Private Buyer',phone:'123456789',total:1,price:1});
  assert.equal(d.name,undefined);assert.equal(d.phone,undefined);assert.equal(d.total,undefined);
  assert.equal(quoteDesign(d).total,37495);
});
test('every known catalogue has a valid all-white value and valid badge',()=>{
  assert.equal(validateDesign(fixture()).webType,'H-Web');assert.equal(COMMERCE_CATALOG.bullets[7].active,true);
});
test('reject unavailable web, mismatched size and unknown palette code',()=>{
  for(const patch of [{webType:'Sasaki 1-Web'},{size:'12.5"',webType:'Spiral I-Web'},{colors:{...fixture().colors,back8:'0'}}])assert.throws(()=>validateDesign({...fixture(),...patch}));
});
test('Crocodile only applies to eligible individual panels without surcharge',()=>{
  const d=validateDesign({...fixture(),materials:{back3:'snakeskin',back5:'snakeskin',back7:'snakeskin'}});
  assert.equal(quoteDesign(d).total,37495);assert.equal(d.materials.back4,undefined);
  for(const f of ['web','palm','laces','welting','pad_color'])assert.throws(()=>validateDesign({...fixture(),materials:{[f]:'snakeskin'}}));
});
test('flagged finger must have matching colour and material on both halves',()=>{
  const d={...fixture(),flag:'Japan',flagPosition:'middle'};
  assert.equal(validateDesign(d).flagPosition,'middle');
  assert.throws(()=>validateDesign({...d,colors:{...d.colors,back6:'20'}}));
  assert.throws(()=>validateDesign({...d,materials:{back5:'snakeskin'}}));
});
test('personalization and numbers retain exact validated text outside reference code',()=>{
  const d=validateDesign({...fixture(),thumbText:'Modern Pitching',pinkyText:'SCOTT',thumbFont:'Block',thumbMain:'10',thumbNumber:'32',circle:'White',numberColor:'20'});
  assert.ok(specification(d).some(([k,v])=>k==='thumbText'&&v==='Modern Pitching'));
  assert.throws(()=>validateDesign({...d,thumbText:'A'.repeat(19)}));
  assert.throws(()=>validateDesign({...d,thumbNumber:'<'}));
  assert.throws(()=>validateDesign({...d,personalCheck:true}));
});
test('preview rejects SVG, duplicate views, oversized and fake image signatures',()=>{
  assert.throws(()=>validatePreviews(previews().slice(1)));
  assert.throws(()=>validatePreviews(previews().map(p=>({...p,view:'back'}))));
  for(const dataUrl of ['data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,aGVsbG8=','data:image/png;base64,'+'A'.repeat(1100001)])
    assert.throws(()=>validatePreviews(previews().map((p,i)=>i?p:{...p,available:true,dataUrl})));
});
test('only the official shop origin is accepted for checkout redirects',()=>{
  assert.equal(safeCheckoutUrl('https://sskeurope.ccvshop.nl/checkout'),'https://sskeurope.ccvshop.nl/checkout');
  for(const url of ['javascript:alert(1)','https://evil.test/','https://sskeurope.ccvshop.nl.evil.test','https://user:secret@sskeurope.ccvshop.nl/','http://sskeurope.ccvshop.nl'])assert.throws(()=>safeCheckoutUrl(url));
});
test('CCV HMAC signs the exact request bytes and UTC date',async()=>{
  const args=['public','secret','POST','/api/rest/v1/orders/','{"is_completed":false}','2026-10-15T12:00:00Z'];
  const actual=await signRequest(...args);
  assert.equal(actual,createHmac('sha512','secret').update([args[0],args[2],args[3],args[4],args[5]].join('|')).digest('hex'));
});
test('read and checkout have separate unguessable hashed capabilities',async()=>{
  const h=harness(),d=await h.save();assert.notEqual(d.viewToken,d.checkoutToken);
  assert.equal(h.data.get(d.id).view_hash,await tokenHash(d.viewToken));
  assert.equal((await h.run({action:'read',id:d.id,token:d.viewToken})).viewToken,undefined);
  await assert.rejects(h.run({action:'checkout',id:d.id,token:d.viewToken}),/design_not_found/);
  await assert.rejects(h.run({action:'read',id:d.id,token:d.checkoutToken}),/design_not_found/);
});
test('unconfirmed and expired designs never reach checkout',async()=>{
  const h=harness();await assert.rejects(h.run({action:'create',design:fixture(),previews:previews()}),/design_confirmation_required/);
  const d=await h.save();h.data.get(d.id).expires_at='2000-01-01T00:00:00Z';
  await assert.rejects(h.run({action:'checkout',id:d.id,token:d.checkoutToken}),/design_expired/);assert.equal(h.posts,0);
});
test('missing credentials leaves draft usable and never performs CCV writes',async()=>{
  const h=harness({configured:false}),d=await h.save();
  await assert.rejects(h.run({action:'checkout',id:d.id,token:d.checkoutToken}),/checkout_not_connected/);
  assert.equal(h.data.get(d.id).status,'draft');assert.equal(h.posts,0);
});
test('concurrent checkout and retry issue exactly one CCV POST',async()=>{
  const h=harness(),d=await h.save(),request={action:'checkout',id:d.id,token:d.checkoutToken};
  const results=await Promise.allSettled(Array.from({length:12},()=>h.run(request)));
  assert.equal(h.posts,1);assert.ok(results.some(r=>r.status==='fulfilled'));
  assert.match((await h.run(request)).url,/sskeurope/);assert.equal(h.posts,1);
});
test('an uncertain POST stays locked and cannot silently retry',async()=>{
  let calls=0;const h=harness({prepare:async()=>{calls++;throw Error('timeout after possible write');}}),d=await h.save();
  const request={action:'checkout',id:d.id,token:d.checkoutToken};
  await assert.rejects(h.run(request),/checkout_needs_review/);
  await assert.rejects(h.run(request),/checkout_needs_review/);
  assert.equal(calls,1);assert.equal(h.data.get(d.id).status,'uncertain');
});
test('a product-price change or custom flag blocks automatic checkout',async()=>{
  const h=harness({product:async()=>({price:400})}),d=await h.save();
  await assert.rejects(h.run({action:'checkout',id:d.id,token:d.checkoutToken}),/shop_price_changed/);assert.equal(h.posts,0);
  const h2=harness(),custom=await h2.run({action:'create',confirmed:true,design:{...fixture(),flag:'Other Flag',flagOther:'Team flag'},previews:previews()});
  await assert.rejects(h2.run({action:'checkout',id:custom.id,token:custom.checkoutToken}),/flag_requires_confirmation/);
});
test('admin records and reconciliation reject anonymous callers',async()=>{
  const h=harness();for(const action of ['admin-list','admin-read','admin-check','admin-reconcile','admin-order-check'])await assert.rejects(h.run({action}),/admin_required/);
  assert.deepEqual(await h.run({action:'admin-list'},{user:{role:'admin'}}),{drafts:[]});
});
test('payment status is obtained from CCV rather than client-supplied flags',async()=>{
  const h=harness(),d=await h.save();await h.run({action:'checkout',id:d.id,token:d.checkoutToken});
  const status=await h.run({action:'status',id:d.id,token:d.checkoutToken,paid:true});assert.equal(status.paid,false);
});
test('CCV adapter creates only an unpaid incomplete order and checks its amount',async()=>{
  let body;const calls=[];const d={id:'draft_demo',design:fixture(),quote:quoteDesign(fixture())};
  const memo=['Snapshot: '+d.id,...specification(d.design).map(([k,v])=>k+': '+v)].join('\n');
  const ccv=createCcv({key:'public',secret:'secret',fetcher:async(url,options)=>{
    calls.push({url,options});
    if(url.includes('/products/'))return Response.json({id:896372573,name:'SSK Custom Glove',price:374.95});
    if(options.method==='POST'){body=JSON.parse(options.body);return Response.json({id:77});}
    if(url.endsWith('/orderrows/'))return Response.json({items:[{order_id:77,product_id:896372573,count:1,discount:0,price:374.95,total_price:374.95,tax:21,memo}]});
    return Response.json({id:77,reservationnumber:'SSK-'+d.id,currency:'EUR',total_orderrow_price:374.95,order_row_taxes_included:true,is_completed:false,paid:false,checkout_href:'https://sskeurope.ccvshop.nl/checkout'});
  }});
  await ccv.prepare(d,memo);assert.equal(body.is_completed,false);assert.equal(body.paid,false);
  assert.equal(body.orderrows[0].price,374.95);assert.equal(body.orderrows[0].memo,memo);
  assert.equal(body.total_shipping,undefined);assert.equal(body.orderrows[0].tax,undefined);
  assert.equal(calls.length,4);assert.ok(calls.every(c=>c.options.redirect==='manual'));
});
test('CCV post network failures are uncertain and upstream messages are not exposed',async()=>{
  const ccv=createCcv({key:'key',secret:'secret',fetcher:async(url,options)=>{
    if(options.method==='GET')return Response.json({id:896372573,name:'SSK Custom Glove'});throw Error('contains SECRET');}});
  await assert.rejects(ccv.prepare({id:'id',quote:{total:37495},design:fixture()},'memo'),/checkout_outcome_unknown/);
});

test('concurrent design saves respect the storage admission limit',async()=>{const h=harness();const results=await Promise.allSettled(Array.from({length:120},()=>h.save()));assert.equal(results.filter(r=>r.status==='fulfilled').length,100);assert.equal(h.data.size,100);});
test('inactive outline does not reach a manufacturing specification',()=>{const d=validateDesign({...fixture(),thumbText:'SCOTT',thumbFont:'Block',thumbMain:'10',thumbOutline:'untrusted color'});assert.equal(d.thumbOutline,null);assert.equal(specification(d).some(([k])=>k==='thumbOutline'),false);});

// Real repository adapter, with atomic Mongo-query semantics in a deterministic entity fake.
const {createStore}=await import('../commerce/backend/store.js');
const match=(row,q)=>Object.entries(q).every(([key,value])=>key==='$or'?value.some(x=>match(row,x)):value&&typeof value==='object'?Object.entries(value).every(([op,v])=>op==='$lt'?row[key]<v:op==='$ne'?row[key]!==v:false):row[key]===value);
function rateAdapter(row){const buckets={get:async()=>structuredClone(row),updateMany:async(q,patch)=>{if(!row||!match(row,q))return {updated:0};Object.assign(row,patch.$set||{});if(patch.$inc)for(const[k,v]of Object.entries(patch.$inc))row[k]+=v;return {updated:1};}};return createStore({},buckets,'singleton');}
test('deployed rate adapter admits at most 100 across different visitors',async()=>{const row={id:'singleton',key:'initial-global',uses:0},store=rateAdapter(row);const results=await Promise.all(Array.from({length:120},(_,i)=>store.reserveRate('visitor'+i,'2026-10-15T13')));assert.ok(results.filter(Boolean).length>0);assert.ok(results.filter(Boolean).length<=100);assert.equal(row.uses,results.filter(Boolean).length);});
test('deployed rate adapter rolls forward once and fails closed for stale hours or missing singleton',async()=>{const row={id:'singleton',key:'2026-10-15T13',uses:100},store=rateAdapter(row);assert.equal(await store.reserveRate('x','2026-10-15T14'),true);assert.equal(row.uses,1);assert.equal(await store.reserveRate('x','2026-10-15T13'),false);assert.equal(row.uses,1);assert.equal(await rateAdapter(null).reserveRate('x','2026-10-15T14'),false);});
test('completed cached orders cannot reopen checkout',async()=>{const h=harness({order:async()=>({is_completed:true,paid:true})}),d=await h.save();await h.run({action:'checkout',id:d.id,token:d.checkoutToken});await assert.rejects(()=>h.run({action:'checkout',id:d.id,token:d.checkoutToken}),/already_ordered/);assert.equal(h.posts,1);});
test('private proof adapter preserves large exact images in bounded fields',async()=>{
 const e={create:async data=>({...data,id:'proof_test'})},adapter=createStore(e,{},'unused');
 const dataUrl='data:image/png;base64,'+'A'.repeat(650000);
 const saved=await adapter.create({previews:[{view:'back',available:true,dataUrl,notes:[]},{view:'thumb',available:false,notes:['Unavailable']}]});
 assert.equal(saved.previews[0].dataUrl,undefined);assert.ok(saved.previews[0].chunks.every(s=>s.length<=8192));
 const publicViews=await adapter.publicPreviews(saved.previews);assert.equal(publicViews[0].dataUrl,dataUrl);assert.equal(publicViews[0].chunks,undefined);
 const copied=await adapter.create(saved);assert.deepEqual(copied.previews,saved.previews);
});
test('shared view copy creates separate checkout authority and preserves validated design',async()=>{
 const h=harness(),source=await h.save();const own=await h.run({action:'copy',id:source.id,token:source.viewToken,confirmed:true});
 assert.notEqual(source.id,own.id);assert.notEqual(source.checkoutToken,own.checkoutToken);
 assert.deepEqual(h.data.get(source.id).design,h.data.get(own.id).design);
 await assert.rejects(h.run({action:'copy',id:source.id,token:source.checkoutToken,confirmed:true}),/design_not_found/);
});

test('deployed equality admission reaches the hourly ceiling sequentially',async()=>{const row={id:'singleton',key:'2026-10-15T13',uses:0},store=rateAdapter(row);for(let i=0;i<100;i++)assert.equal(await store.reserveRate('x','2026-10-15T13'),true);assert.equal(await store.reserveRate('x','2026-10-15T13'),false);assert.equal(row.uses,100);});

test('ambiguous admission consumes quota but cannot over-admit',async()=>{let row={id:'single',key:'2026-10-15T13',uses:0},fail=true;const buckets={get:async()=>structuredClone(row),updateMany:async(q,p)=>{if(row.uses===q.uses){row.uses++;if(fail){fail=false;throw Object.assign(Error('zero-match or committed response lost'),{status:500});}return {updated:1};}throw Object.assign(Error('no match'),{status:500});}};const store=createStore({},buckets,'single');assert.equal(await store.reserveRate('x','2026-10-15T13'),true);assert.equal(row.uses,2);});
test('ambiguous checkout claim fails closed rather than submitting again',async()=>{const e={updateMany:async()=>{throw Object.assign(Error('no match'),{status:500});},get:async()=>({status:'submitting'})};assert.equal(await createStore(e,{},'x').claim('draft_test'),false);});

test('installed credentials do not enable public ordering without explicit approval',async()=>{
 for(const value of [undefined,false,'true',1]){
  const h=harness({}, {checkoutEnabled:value}),d=await h.save();
  const config=await h.run({action:'config'});assert.equal(config.connected,true);assert.equal(config.checkoutEnabled,false);
  await assert.rejects(h.run({action:'checkout',id:d.id,token:d.checkoutToken,checkoutEnabled:true,confirmed:true,purpose:'acceptance-test'}),/checkout_approval_pending/);
  assert.equal(h.posts,0);assert.equal(h.data.get(d.id).status,'draft');
  assert.equal((await h.run({action:'read',id:d.id,token:d.viewToken})).id,d.id);
 }
});
test('paused ordering blocks previously ready checkout links and prevents upstream reads',async()=>{
 let reads=0;const h=harness({order:async()=>{reads++;throw Error('must not run');}}, {checkoutEnabled:false});
 const d=await h.save();Object.assign(h.data.get(d.id),{status:'ready',checkout_url:'https://sskeurope.ccvshop.nl/checkout',ccv_order_id:777});
 await assert.rejects(h.run({action:'checkout',id:d.id,token:d.checkoutToken}),/checkout_approval_pending/);assert.equal(reads,0);assert.equal(h.posts,0);
});
test('acceptance checkout requires admin plus separate strict switch and explicit confirmation',async()=>{
 const h=harness({}, {checkoutEnabled:false,acceptanceTestsEnabled:true}),d=await h.save();
 const request={action:'admin-test-checkout',id:d.id,token:d.checkoutToken,confirmed:true,purpose:'acceptance-test'};
 await assert.rejects(h.run(request),/admin_required/);
 for(const patch of [{confirmed:false},{purpose:'order'},{token:d.viewToken}])await assert.rejects(h.run({...request,...patch},{user:{role:'admin'}}));
 assert.equal(h.posts,0);
 for(const value of [undefined,false,'true',1]){
  const disabled=harness({}, {checkoutEnabled:false,acceptanceTestsEnabled:value}),saved=await disabled.save();
  await assert.rejects(disabled.run({...request,id:saved.id,token:saved.checkoutToken},{user:{role:'admin'}}),/acceptance_tests_disabled/);assert.equal(disabled.posts,0);
 }
});
test('admin acceptance baskets use the real quote and specification while public ordering stays off',async()=>{
 for(const flag of ['None','Japan']){
  let memo,quote;const h=harness({prepare:async(d,m)=>{memo=m;quote=d.quote;return {id:777,url:'https://sskeurope.ccvshop.nl/checkout'};}},{checkoutEnabled:false,acceptanceTestsEnabled:true});
  const d=await h.run({action:'create',confirmed:true,design:{...fixture(),flag,thumbText:'QA TEST',thumbFont:'Block',thumbMain:'10'},previews:previews()});
  const request={action:'admin-test-checkout',id:d.id,token:d.checkoutToken,confirmed:true,purpose:'acceptance-test'};
  assert.match((await h.run(request,{user:{role:'admin'}})).url,/sskeurope/);
  assert.equal(quote.total,flag==='None'?37495:37995);assert.match(memo,/ACCEPTANCE TEST — DO NOT FULFIL/);assert.match(memo,/thumbText: QA TEST/);
  assert.equal((await h.run({action:'config'})).checkoutEnabled,false);
  await assert.rejects(h.run({...request,action:'checkout'},{user:{role:'admin'}}),/checkout_approval_pending/);
 }
});
test('concurrent admin test clicks and retry still create only one unpaid basket',async()=>{
 const h=harness({}, {checkoutEnabled:false,acceptanceTestsEnabled:true}),d=await h.save();
 const request={action:'admin-test-checkout',id:d.id,token:d.checkoutToken,confirmed:true,purpose:'acceptance-test'},ctx={user:{role:'admin'}};
 const results=await Promise.allSettled(Array.from({length:8},()=>h.run(request,ctx)));
 assert.equal(h.posts,1);assert.ok(results.some(r=>r.status==='fulfilled'));await h.run(request,ctx);assert.equal(h.posts,1);
});
test('service defaults fail closed with connected keys',async()=>{
 const h=harness(),run=createCommerce({store:h.store,ccv:h.ccv,requireAdmin:async()=>{},appUrl:'https://example.com/'});
 assert.equal((await run({action:'config'})).checkoutEnabled,false);
 await assert.rejects(run({action:'checkout'}),/checkout_approval_pending/);
 await assert.rejects(run({action:'admin-test-checkout',confirmed:true,purpose:'acceptance-test'}),/acceptance_tests_disabled/);
});

test('hosted credential namespace cannot arm cached legacy runtimes',async()=>{
 const index=await readFile(new URL('../base44/functions/ssk-commerce-v14/index.ts',import.meta.url),'utf8');
 assert.match(index,/Deno\.env\.get\('CCV_SHOP_API_KEY'\)/);assert.match(index,/Deno\.env\.get\('CCV_SHOP_API_SECRET'\)/);
 assert.doesNotMatch(index,/Deno\.env\.get\('CCV_API_(KEY|SECRET)'\)/);
 assert.match(index,/checkoutEnabled:Deno\.env\.get\('CCV_LIVE_ORDERING_V14_ENABLED'\)==='true'/);
});

test('edge-compatible manual redirects never forward credentials or accept a redirected product',async()=>{
 let calls=0;const ccv=createCcv({key:'key',secret:'secret',fetcher:async(_url,options)=>{
  calls++;assert.equal(options.redirect,'manual');return new Response('',{status:302,headers:{Location:'https://evil.test/'}});
 }});
 await assert.rejects(ccv.product(),/shop_unavailable/);assert.equal(calls,1);
});

test('CCV row verification tolerates shipping totals but rejects altered product rows or lost specification',async()=>{
 const draft={id:'row_test',design:fixture(),quote:quoteDesign(fixture())};
 const memo=['Snapshot: '+draft.id,...specification(draft.design).map(([k,v])=>k+': '+v)].join('\n');
 const good={order_id:77,product_id:896372573,count:1,price:374.95,total_price:374.95,discount:0,tax:21,memo};
 for(const patch of [null,{price:1},{total_price:1},{count:2},{discount:5},{product_id:123},{memo:'Incomplete specification'},{order_id:88}]){
  const ccv=createCcv({key:'key',secret:'secret',fetcher:async url=>Response.json(url.endsWith('/orderrows/')?{items:[{...good,...patch}]}:{id:77,reservationnumber:'SSK-'+draft.id,currency:'EUR',order_row_taxes_included:true,total_orderrow_price:384.65,total_shipping:9.7,total_price:384.65})});
  if(patch)await assert.rejects(ccv.order(77,draft),/checkout_verification_failed/);else assert.equal((await ccv.order(77,draft)).verifiedRow.price,374.95);
 }
});
test('known CCV ID is retained for reconciliation after a post-write verification failure',async()=>{
 const h=harness({prepare:async()=>{const e=Object.assign(Error('checkout_verification_failed'),{ccvOrderId:77});throw e;}}),d=await h.save();
 await assert.rejects(h.run({action:'checkout',id:d.id,token:d.checkoutToken}),/checkout_needs_review/);
 assert.equal(h.data.get(d.id).ccv_order_id,77);assert.equal(h.data.get(d.id).status,'uncertain');
});
