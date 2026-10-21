import test from 'node:test';
import assert from 'node:assert/strict';
import {GloveRenderer} from '../glove_builder/customiser/glove-engine.js';
function renderer(){return {DATA:{zones:[{id:'lining',group:'leather'},{id:'binding',group:'lace'},{id:'laces',group:'lace'}],palettes:{leather:[['10','White','#F2F0EA'],['90','Black','#303132']],lace:[['10','White','#F2F0EA'],['90','Black','#303132']]}},imgs:{lining:{},binding:{}}};}
test('matching lining receives subtle lighting while binding/laces and order state stay exact',()=>{
 for(const code of ['10','90']){
  const r=renderer(),state=Object.freeze({lining:code,binding:code,laces:code});
  const lining=GloveRenderer.prototype.hex.call(r,'lining',state);
  const binding=GloveRenderer.prototype.hex.call(r,'binding',state);
  assert.notEqual(lining,binding);assert.equal(GloveRenderer.prototype.hex.call(r,'laces',state),binding);
  for(const i of[1,3,5])assert.ok(parseInt(lining.slice(i,i+2),16)<parseInt(binding.slice(i,i+2),16));
  assert.deepEqual(state,{lining:code,binding:code,laces:code});
 }
});
test('different colours and hidden binding retain the original lining colour',()=>{
 const r=renderer();assert.equal(GloveRenderer.prototype.hex.call(r,'lining',{lining:'10',binding:'90'}),'#F2F0EA');
 delete r.imgs.binding;assert.equal(GloveRenderer.prototype.hex.call(r,'lining',{lining:'10',binding:'10'}),'#F2F0EA');
});
test('saved selection of a removed native layer cannot crash drawing',()=>{
 const r={DATA:{w:1,h:1,zones:[],bbox:{binding:[0,0,1,1]},assets:{}},imgs:{glove:{}},syncNativeHContour(){},tinted(){throw Error('Missing layer tinted');}};
 const ctx={setTransform(){},clearRect(){},drawImage(){}};
 assert.doesNotThrow(()=>GloveRenderer.prototype.draw.call(r,ctx,{},null,{id:'binding',amount:.16},false));
});
