import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCommerce,withDeliveryBudget} from '../commerce/backend/service.js';
import {createCcv} from '../commerce/backend/ccv.js';
import {COLOUR_ORDER} from '../glove_builder/customiser/glove-catalog.js';
const appUrl='https://ssk-glove-configurator-da8db964.base44.app/';
function harness({noteFailure=false}={}){
 const rows=new Map();let clock=new Date('2026-11-06T12:00:00Z'),memos,prepares=0,notes=0;
 const design={lang:'nl',hand:'RHT',size:'11.75"',webType:'H-Web',pad:'None',bullet:7,flag:'None',colors:Object.fromEntries(COLOUR_ORDER.map(f=>[f,'10'])),materials:{},name:'Private buyer',phone:'123456789'};
 const previews=['back','palm','thumb','pinky'].map(view=>({view,available:false,notes:['Fixture without image']}));
 const store={reserveRate:async()=>true,create:async data=>{const d={...data,id:'draft_production_'+rows.size,created_date:clock.toISOString()};rows.set(d.id,d);return structuredClone(d);},get:async id=>structuredClone(rows.get(id)),update:async(id,p)=>Object.assign(rows.get(id),p),claim:async id=>{const d=rows.get(id);if(d.status!=='draft')return false;d.status='submitting';return true;},list:async()=>[...rows.values()]};
 const ccv={configured:true,product:async()=>({price:374.95,discount:0}),prepare:async(d,m)=>{prepares++;memos=m;return {id:123,url:'https://sskeurope.ccvshop.nl/checkout',basketUrl:'https://sskeurope.ccvshop.nl/website/index.php?Show=WebShopBasket&OrderId=fixture'};},order:async()=>({id:123,is_completed:false,paid:false,basket_href:'https://sskeurope.ccvshop.nl/website/index.php?Show=WebShopBasket&OrderId=fixture'}),attachProductionLinks:async()=>{notes++;if(noteFailure)throw Error('Note unavailable');return {verified:true};}};
 const run=createCommerce({store,ccv,appUrl,now:()=>clock,checkoutEnabled:true,requireAdmin:async u=>{if(u?.role!=='admin')throw Error('admin_required');}});
 const save=()=>run({action:'create',confirmed:true,design,previews});
 return {run,save,rows,setClock:d=>clock=new Date(d),get memos(){return [].concat(memos)},get prepares(){return prepares},get notes(){return notes}};
}
async function ready(h){const d=await h.save();await h.run({action:'checkout',id:d.id,token:d.checkoutToken,destination:'basket'});const result=await h.run({action:'admin-production-links',id:d.id},{user:{role:'admin'}});const url=new URL(result.links[0].url),[id,token]=url.hash.slice(1).split('.');return {d,url,id,token};}

test('CCV memo links to exact four-view snapshot through a separate read-only capability',async()=>{
 const h=harness(),{d,url,id,token}=await ready(h);
 assert.equal(url.origin,appUrl.slice(0,-1));assert.equal(url.pathname,'/production.html');assert.notEqual(token,d.viewToken);assert.notEqual(token,d.checkoutToken);
 assert.ok(h.memos[0].includes(url.href));
 const p=await h.run({action:'production-read',id,token});assert.equal(p.id,d.id);assert.equal(p.previews.length,4);assert.equal(p.production.ccvOrderId,123);assert.equal(p.design.name,undefined);assert.equal(p.design.phone,undefined);
 assert.equal(p.checkout_hash,undefined);assert.equal(p.view_hash,undefined);assert.equal(p.checkoutToken,undefined);
 for(const action of ['read','copy','checkout','status'])await assert.rejects(h.run({action,id,token,confirmed:true}),/design_not_found/);
 await assert.rejects(h.run({action:'production-read',id,token:d.checkoutToken}),/design_not_found/);
 const other=await h.save();await assert.rejects(h.run({action:'production-read',id:other.id,token}),/design_not_found/);
 for(const action of ['admin-production-links','admin-deliver-designs','admin-list'])await assert.rejects(h.run({action,id,token,confirmed:true}),/admin_required/);
});

test('production access lasts one year while customer draft expiration remains thirty days',async()=>{
 const h=harness(),{d,id,token}=await ready(h);h.setClock('2027-02-06T12:00:00Z');
 assert.equal((await h.run({action:'production-read',id,token})).id,id);
 await assert.rejects(h.run({action:'read',id,token:d.viewToken}),/design_expired/);
 h.setClock('2027-11-07T12:00:00Z');await assert.rejects(h.run({action:'production-read',id,token}),/design_expired/);
});

test('production access fails closed for uncertain, malformed or unsubmitted records',async()=>{
 const h=harness(),{id,token}=await ready(h);
 for(const status of ['draft','submitting','uncertain']){h.rows.get(id).status=status;await assert.rejects(h.run({action:'production-read',id,token}),/design_not_found/);}
 h.rows.get(id).status='ready';h.rows.get(id).checkout_hash=undefined;await assert.rejects(h.run({action:'production-read',id,token}),/design_not_found/);
 for(const id of [undefined,'bad','../path'])await assert.rejects(h.run({action:'production-read',id,token}),/design_not_found/);
});

test('note service outage cannot create a duplicate basket or invalidate memo delivery',async()=>{
 const h=harness({noteFailure:true}),{d,url}=await ready(h);assert.ok(h.memos[0].includes(url.href));assert.equal(h.rows.get(d.id).status,'ready');
 await h.run({action:'checkout',id:d.id,token:d.checkoutToken,destination:'basket'});assert.equal(h.prepares,1);
 await assert.rejects(h.run({action:'admin-deliver-designs',id:d.id,confirmed:false},{user:{role:'admin'}}),/design_confirmation_required/);
 await assert.rejects(h.run({action:'admin-deliver-designs',id:d.id,confirmed:true},{user:{role:'admin'}}),/Note unavailable/);
 assert.equal(h.prepares,1);
});

test('completed bundle repair returns one private link per snapshot and never creates another order',async()=>{
 const h=harness(),a=await h.save(),b=await h.save();await h.run({action:'checkout',items:[a,b].map(d=>({id:d.id,token:d.checkoutToken})),destination:'basket'});
 const result=await h.run({action:'admin-deliver-designs',id:a.id,confirmed:true},{user:{role:'admin'}});assert.equal(result.orderId,123);assert.equal(result.links.length,2);assert.equal(h.prepares,1);
 const urls=new Set(result.links.map(l=>l.url));assert.equal(urls.size,2);
});

test('CCV attaches and verifies an internal note idempotently without replacing rows or emailing anyone',async()=>{
 const calls=[],notes=[{type:'internal',note:'Existing note'}],links=[{id:'draft_delivery_01',reference:'SSK-EXACT',url:appUrl+'production.html#draft_delivery_01.'+'a'.repeat(64)}];
 const ccv=createCcv({key:'test',secret:'test',fetcher:async(url,options)=>{calls.push({url,method:options.method});assert.ok(url.endsWith('/orders/123/ordernotes/'));assert.ok(['GET','POST'].includes(options.method));if(options.method==='POST'){const payload=JSON.parse(options.body);assert.deepEqual(Object.keys(payload),['note']);notes.push({type:'internal',note:'<p>'+payload.note.replaceAll('\n','<br />')+'</p>'});return new Response(null,{status:204});}return Response.json({items:notes});}});
 assert.equal((await ccv.attachProductionLinks(123,links)).verified,true);assert.equal((await ccv.attachProductionLinks(123,links)).alreadyPresent,true);assert.equal(calls.filter(c=>c.method==='POST').length,1);assert.equal(notes[0].note,'Existing note');
 const note=notes[1].note;assert.ok(note.includes(links[0].url));assert.ok(note.includes('4 afbeeldingen'));
 await assert.rejects(ccv.attachProductionLinks(123,[{...links[0],url:'https://evil.test/production.html#draft_delivery_01.'+'a'.repeat(64)}]),/invalid_request/);
});

test('merchant routing follows configured active function and production view offers no checkout controls',async()=>{
 const merchant=await readFile(new URL('../glove_builder/customiser/merchant.js',import.meta.url),'utf8'),html=await readFile(new URL('../glove_builder/customiser/production.html',import.meta.url),'utf8'),js=await readFile(new URL('../glove_builder/customiser/production.js',import.meta.url),'utf8');
 assert.ok(merchant.includes('API_ENDPOINT'));assert.ok(!merchant.includes('ssk-commerce-v14'));assert.ok(html.includes('no-referrer'));assert.ok(html.includes('noindex,nofollow'));assert.ok(js.includes("api('production-read'"));assert.ok(!js.includes("api('checkout'"));assert.ok(!js.includes('localStorage'));assert.ok(js.includes('Afbeelding opslaan'));
});


test('optional design-note budget returns even for an adapter that never settles and aborts its work',async()=>{
 let signal;const start=performance.now();
 await assert.rejects(withDeliveryBudget(s=>{signal=s;return new Promise(()=>{});},20),/design_delivery_unavailable/);
 assert.equal(signal.aborted,true);assert.ok(performance.now()-start<500);
});

test('every note request shares the same whole-operation abort signal',async()=>{
 const controller=new AbortController(),seen=[],notes=[],links=[{id:'draft_delivery_01',reference:'SSK',url:appUrl+'production.html#draft_delivery_01.'+'b'.repeat(64)}];
 const ccv=createCcv({key:'key',secret:'secret',fetcher:async(url,options)=>{seen.push(options.signal);if(options.method==='POST')notes.push({type:'internal',note:JSON.parse(options.body).note});return Response.json({items:notes});}});
 await ccv.attachProductionLinks(123,links,{signal:controller.signal});assert.equal(seen.length,3);assert.ok(seen.every(s=>s===controller.signal));
 controller.abort();await assert.rejects(ccv.attachProductionLinks(123,links,{signal:controller.signal}));assert.equal(seen.length,3);
});


test('switching design-card links clears the previous design and ignores a slower older response',async()=>{
 const source=(await readFile(new URL('../glove_builder/customiser/production.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export function renderProduction','function renderProduction');
 const host={hidden:false,children:['old'],replaceChildren(){this.children=[];}},status={},handlers={},pending={};let item=null;
 const context={document:{querySelector:s=>s==='#status'?status:host},window:{addEventListener:(event,fn)=>handlers[event]=fn},readOrderFragment:()=>item,api:(_,request)=>new Promise(resolve=>pending[request.id]=resolve),errorMessage:()=> 'error',Intl,Date};
 vm.runInNewContext(source,context);assert.equal(host.hidden,true);assert.deepEqual(host.children,[]);
 context.renderProduction=d=>{host.hidden=false;host.children=[d.id];};
 const reply=id=>({id,expiresAt:'2027-11-06T00:00:00Z'});
 item={id:'first',token:'a'};const a=handlers.hashchange();item={id:'second',token:'b'};const b=handlers.hashchange();
 pending.second(reply('second'));await b;pending.first(reply('first'));await a;assert.deepEqual(host.children,['second']);
 item=null;await handlers.hashchange();assert.equal(host.hidden,true);assert.deepEqual(host.children,[]);
});
