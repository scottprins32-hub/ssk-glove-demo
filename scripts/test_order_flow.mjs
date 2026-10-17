import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../glove_builder/customiser/order.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('start().catch(', 'globalThis.started=start().catch(');
async function boot({connected=true,configFailure=false,storage=true,owner=false,expired=false}={}) {
 const elements=[];function node(tag,text='',cls=''){const e={tag,textContent:text,cls,children:[],disabled:false,checked:false,hidden:false,append(...v){this.children.push(...v);this.lastChild=this.children.at(-1);},prepend(...v){this.children.unshift(...v);},replaceChildren(...v){this.children=v;},setAttribute(){},focus(){this.focused=true;}};elements.push(e);return e;}
 const status=node('p'),host=node('div'),heading=node('h1'),eyebrow=node('p'),aside=node('aside'),calls=[],redirects=[],keys=new Map();if(owner)keys.set('draft_123','owner-key');
 const draft={id:'draft_123',design:{lang:'en'},expiresAt:'2026-11-17T12:00:00Z'};
 const context={console,Intl,Date,document:{documentElement:{},createTextNode:s=>s,querySelector:q=>q==='#status'?status:q==='#order-content'?host:q==='h1'?heading:eyebrow},node,displayDraft:()=>aside,readOrderFragment:()=>({id:'draft_123',token:'view-key'}),TEST_MODE:true,
 api:async(action,input)=>{calls.push({action,input});if(action==='read'){if(expired)throw {code:'design_expired'};return draft;}if(action==='config'){if(configFailure)throw {code:'service_unavailable'};return {connected};}if(action==='copy')return {id:'copy_123',checkoutToken:'copy-owner',viewToken:'copy-view'};if(action==='checkout')return {url:'https://sskeurope.ccvshop.nl/checkout'};return {status:'draft',paid:false};},
 getCheckoutKey:id=>keys.get(id),saveCheckoutKey:(id,key)=>{if(storage)keys.set(id,key);},checkoutStorageAvailable:()=>storage,orderFragment:(id,key)=>id+'.'+key,errorMessage:e=>e.code,SHOP:{productUrl:'https://sskeurope.ccvshop.nl/SSK-Custom-Glove'},safeCheckoutUrl:s=>s,navigator:{clipboard:{writeText:async()=>{}}},location:{href:'http://local/order.html#read-key',assign:url=>redirects.push(url)}};
 vm.runInNewContext(source,context);await context.started;
 return {elements,status,host,calls,redirects,keys,button:elements.find(e=>['Continue to secure checkout','Order this design'].includes(e.textContent)),check:elements.find(e=>e.tag==='input')};
}
test('configuration outage still displays the saved design but blocks checkout',async()=>{const h=await boot({configFailure:true});assert.ok(h.button);assert.equal(h.button.disabled,true);assert.equal(h.host.hidden,false);});
test('recipient confirms before copy and gets new isolated checkout authority',async()=>{const h=await boot();await h.button.onclick();assert.equal(h.calls.filter(c=>c.action==='copy').length,0);h.check.checked=true;await h.button.onclick();assert.equal(h.keys.get('draft_123'),undefined);assert.equal(h.keys.get('copy_123'),'copy-owner');assert.deepEqual(h.redirects,['./order.html#copy_123.copy-view']);});
test('owner continues with own token and never copies another snapshot',async()=>{const h=await boot({owner:true});h.check.checked=true;await h.button.onclick();assert.equal(h.calls.find(c=>c.action==='checkout').input.token,'owner-key');assert.equal(h.calls.filter(c=>c.action==='copy').length,0);});
test('blocked session storage performs no copy, checkout, or redirect',async()=>{const h=await boot({storage:false});h.check.checked=true;await h.button.onclick();assert.equal(h.button.disabled,true);assert.equal(h.calls.filter(c=>['copy','checkout'].includes(c.action)).length,0);assert.equal(h.redirects.length,0);});
test('expired link gives a recovery path without checkout requests',async()=>{const h=await boot({expired:true});assert.equal(h.status.textContent,'design_expired');assert.ok(h.host.children.some(e=>e.tag==='a'));assert.equal(h.calls.length,1);});

import {displaySpecification} from '../glove_builder/customiser/commerce-summary.js';
test('Dutch review uses readable labels and exact embroidery color codes',()=>{
 const rows=displaySpecification([['Flag position','middle'],['thumbText','QA Élodie'],['thumbMain','10'],['back3 material','Standard leather']],'nl');
 assert.deepEqual(rows,[['Plaats van de vlag','Middelvinger'],['Borduring duim','QA Élodie'],['Hoofdgaren','10 · White'],['Back 3 · leertype','Normaal leer']]);
});

test('selected-asset completion preserves pending review save controls',async()=>{
 const app=await readFile(new URL('../glove_builder/customiser/app.js',import.meta.url),'utf8');
 const gate=app.slice(app.indexOf('function gateSelection('),app.indexOf('function registerThumbViews('));
 for(const step of [5,7]) {
   const paints=[];let resolve;const pending=new Promise(r=>resolve=r),view={selectionReady:()=>false,loadSelection:()=>pending};
   const context={S:{step},R:{views:{thumb:{}}},ctx:{canvas:{width:1,height:1},clearRect(){}},selectionRequest:null,
     selectedAssets:()=>({view,key:'stable'}),$:()=>({setAttribute(){}}),selectionMessage:()=>'',selectionRetry(){},registerThumbViews(){},draw(){},paint:arg=>paints.push(arg)};
   vm.runInNewContext(gate+';gateSelection(ctx);',context);resolve();await pending;await Promise.resolve();
   assert.deepEqual(paints,[false],'Do not detach the active save or embroidery inputs');
 }
});

test('failed export keeps visible review save error controls attached',async()=>{
 const app=await readFile(new URL('../glove_builder/customiser/app.js',import.meta.url),'utf8');
 const fn=app.slice(app.indexOf('async function readyForExport('),app.indexOf('async function openSheet('));
 const paints=[],view={load:async()=>{throw Error('offline');}};
 const context={S:{step:7},selectedAssets:()=>({view,key:'one'}),registerThumbViews(){},viewAvailability:()=>({ok:true}),draw(){},paint:arg=>paints.push(arg),selectionRequest:null};
 vm.runInNewContext(fn+';globalThis.result=readyForExport();',context);assert.equal(await context.result,false);assert.deepEqual(paints,[false]);
});
