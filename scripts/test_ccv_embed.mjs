import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
import {trustedEmbed,navigateCheckout} from '../glove_builder/customiser/embed-context.js';
const SHOP='https://sskeurope.ccvshop.nl',BUILDER='https://ssk-glove-configurator-da8db964.base44.app';
test('only SSK or the builder may frame the builder, including all ancestors',()=>{
 assert.equal(trustedEmbed(SHOP+'/SSK-Custom-Glove',[SHOP],BUILDER),true);
 for(const [ref,ancestors] of [['',[]],['https://evil.test',[SHOP]],[SHOP,[SHOP,'https://evil.test']]])assert.equal(trustedEmbed(ref,ancestors,BUILDER),false);
});
test('embedded checkout asks only its trusted merchant parent to navigate',()=>{
 const messages=[],assignments=[],parent={postMessage:(...x)=>messages.push(x)};
 navigateCheckout(SHOP+'/website/index.php?Show=WebShopOneStepCheckout&OrderId=example',{parent,document:{referrer:SHOP+'/SSK-Custom-Glove'},location:{origin:BUILDER,ancestorOrigins:[SHOP],assign:x=>assignments.push(x)}});
 assert.equal(messages[0][1],SHOP);assert.equal(messages[0][0].type,'ssk:checkout');assert.equal(assignments.length,0);
 assert.throws(()=>navigateCheckout('https://evil.test'));
});
test('merchant ignores messages from other frames/origins and unsafe checkout destinations',async()=>{
 const assignments=[],frame={dataset:{},style:{},contentWindow:{}},section={style:{}};let receive;
 const context={location:{origin:SHOP,assign:url=>assignments.push(url)},document:{getElementById:id=>id.endsWith('-frame')?frame:section,querySelector:()=>null},window:{addEventListener:(event,handler)=>receive=handler},URL};
 vm.runInNewContext(await readFile(new URL('../glove_builder/customiser/shop-embed.js',import.meta.url),'utf8'),context);
 const valid={origin:BUILDER,source:frame.contentWindow,data:{type:'ssk:checkout',url:SHOP+'/website/index.php?Show=WebShopOneStepCheckout&OrderId=abc'}};
 for(const bad of [{...valid,origin:'https://evil.test'},{...valid,source:{}},{...valid,data:{...valid.data,url:'https://evil.test/'}},{...valid,data:{...valid.data,url:SHOP+'/other'}}])receive(bad);
 assert.equal(assignments.length,0);receive(valid);assert.equal(assignments.length,1);
 receive({...valid,data:{...valid.data,url:SHOP+'/website/index.php?Show=WebShopBasket&OrderId=abc'}});assert.equal(assignments.length,2);
});

test('same-origin preview parents navigate the top document without a dropped message',()=>{
 const assigned=[];const win={parent:{postMessage(){},location:{origin:BUILDER,assign:url=>assigned.push(url)}},document:{referrer:BUILDER+'/'},location:{origin:BUILDER,ancestorOrigins:[BUILDER]}};
 navigateCheckout(SHOP+'/website/index.php?Show=WebShopOneStepCheckout&OrderId=abc',win);assert.equal(assigned.length,1);
});

test('internal iframe navigation keeps checkout addressed to SHOP when referrer becomes BUILDER',()=>{
 const messages=[],win={parent:{postMessage:(...args)=>messages.push(args)},document:{referrer:BUILDER+'/index.html'},location:{origin:BUILDER,ancestorOrigins:[SHOP]}};
 navigateCheckout(SHOP+'/website/index.php?Show=WebShopOneStepCheckout&OrderId=abc',win);assert.equal(messages[0][1],SHOP);
});
