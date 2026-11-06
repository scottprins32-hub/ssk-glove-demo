import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {validateDesign,safeCheckoutUrl} from '../glove_builder/customiser/commerce-contract.js';
import {COLOUR_ORDER} from '../glove_builder/customiser/glove-catalog.js';
import {quoteDesign} from '../glove_builder/customiser/commerce-pricing.js';
const source=(await readFile(new URL('../glove_builder/customiser/commerce-ui.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export function mountCommerce','function mountCommerce');
function boot({complete=true,storage=true,checkoutFailure=false,captureChange=false}={}) {
 const nodes=[],calls=[],redirects=[],keys=new Map();let cart=[],seq=0;
 const design={hand:'RHT',size:'11.75"',webType:'H-Web',pad:'None',bullet:7,colors:Object.fromEntries(COLOUR_ORDER.map(f=>[f,'10'])),materials:{},name:'Private buyer',phone:'123456789'};
 function node(tag){const el={tag,children:[],dataset:{},disabled:false,hidden:false,checked:false,append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);},replaceChildren(...items){this.children=items;},setAttribute(){},focus(){this.focused=true;}};nodes.push(el);return el;}
 const host=node('div');const context={console,validateDesign,safeCheckoutUrl,quoteDesign,MAX_ORDER_ITEMS:6,TEST_MODE:false,
 document:{createElement:node,createTextNode:s=>s},location:{assign:url=>redirects.push(url)},navigateCheckout:url=>redirects.push(url),
 loadCart:()=>cart,addToCart:saved=>{cart=cart.filter(i=>i.id!==saved.id);cart.push(saved);return cart;},removeFromCart:id=>{cart=cart.filter(i=>i.id!==id);},formatMoney:c=>String(c),orderItemsFragment:items=>items.map(i=>i.id+'.'+i.viewToken).join(','),
 checkoutStorageAvailable:()=>storage,saveCheckoutKey:(id,key)=>keys.set(id,key),getCheckoutKey:id=>keys.get(id),errorMessage:e=>e.code,
 api:async(action,input)=>{calls.push({action,input});if(action==='create')return {id:'draft_'+(++seq),viewToken:'view-'+seq,checkoutToken:'own-'+seq,reference:'SSK4-QA'};if(checkoutFailure){checkoutFailure=false;throw {code:'shop_unavailable'};}return {url:'https://sskeurope.ccvshop.nl/website/index.php?Show=WebShopBasket&OrderId=qa'};}};
 vm.runInNewContext(source+';globalThis.mount=mountCommerce;',context);
 context.mount(host,{lang:'nl',complete,capture:async()=>{if(captureChange)design.colors.back2='20';return [];},getDesign:()=>structuredClone(design)});
 return {nodes,calls,redirects,design,button:nodes.find(e=>e.dataset.orderSave),check:nodes.find(e=>e.tag==='input'),get cart(){return cart;}};
}

test('basket requires complete design and explicit review, not buyer contact',async()=>{
 const h=boot();await h.button.onclick();assert.equal(h.calls.length,0);
 h.check.checked=true;await h.button.onclick();
 const created=h.calls.find(c=>c.action==='create');assert.equal(created.input.design.name,undefined);assert.equal(created.input.design.phone,undefined);
 assert.equal(h.calls.find(c=>c.action==='checkout').input.destination,'basket');assert.match(h.redirects[0],/Show=WebShopBasket/);
 const incomplete=boot({complete:false});incomplete.check.checked=true;await incomplete.button.onclick();assert.equal(incomplete.calls.length,0);
});

test('double click creates one snapshot and one CCV basket request',async()=>{
 const h=boot();h.check.checked=true;await Promise.all([h.button.onclick(),h.button.onclick()]);
 assert.equal(h.calls.filter(c=>c.action==='create').length,1);assert.equal(h.calls.filter(c=>c.action==='checkout').length,1);
});

test('failed basket transfer retains the saved glove and retries its same identity',async()=>{
 const h=boot({checkoutFailure:true});h.check.checked=true;await h.button.onclick();assert.equal(h.cart.length,1);assert.equal(h.redirects.length,0);
 await h.button.onclick();assert.equal(h.cart.length,1);assert.equal(h.calls.filter(c=>c.action==='create').length,1);
 const requests=h.calls.filter(c=>c.action==='checkout');assert.equal(requests.length,2);assert.equal(requests[0].input.items[0].id,requests[1].input.items[0].id);
});

test('storage blocked or design edited during capture never creates a draft or basket',async()=>{
 for(const opts of [{storage:false},{captureChange:true}]){const h=boot(opts);h.check.checked=true;await h.button.onclick();assert.equal(h.calls.length,0);assert.equal(h.redirects.length,0);}
});
