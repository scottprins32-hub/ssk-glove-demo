import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GloveRenderer} from '../glove_builder/customiser/glove-engine.js';
import {encodeV4,decodeV4} from '../glove_builder/customiser/refcode.js';
import {COLOUR_ORDER} from '../glove_builder/customiser/glove-catalog.js';
import {validateDesign} from '../glove_builder/customiser/commerce-contract.js';
import {validateDesign as validateHostedDesign} from '../base44/functions/ssk-commerce-v14/lib/commerce-contract.js';
import {createCommerce} from '../commerce/backend/service.js';
const data=JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/glove-data.json',import.meta.url)));
const fixture={hand:'RHT',size:'11.75"',webType:'H-Web',pad:'None',flag:'None',colors:Object.fromEntries(COLOUR_ORDER.map(f=>[f,'10'])),materials:{}};
test('append-only silicone identities agree in UI, saved codes and hosted contract',()=>{
 assert.deepEqual(data.bullets.slice(0,15).map(b=>b.name),['Edge Gold','Edge Silver','Edge Gun Metal','White/Gold','Red/Gold','Red/Green','Rainbow','Black/Gold','Black/Pink','Black/Purple','Black/Silver','Green/Gold','Winered/Gold','Blue/Gold','Navy/Gold']);
 for(const [index,name]of[[15,'Silicone Gold'],[16,'Silicone Silver']]){
  assert.equal(data.bullets[index].name,name);assert.equal(decodeV4(encodeV4(fixture,name)).bulletName,name);
  const design={...fixture,bullet:index};assert.deepEqual(validateHostedDesign(design),validateDesign(design));
 }
});
test('first HD silicone contours use uniform scale on either hand',()=>{
 for(const index of[15,16])for(const mirror of[false,true]){
  const b=data.bullets[index],image={},calls=[],ctx={save(){},restore(){},translate(){},scale(){},drawImage(...a){calls.push(a);}},r={DATA:data,imgs:{bullet_logo:{},[b.asset]:image}};
  GloveRenderer.prototype.unmirror.call(r,ctx,data.bulletBox[0],data.bulletBox[2],mirror,()=>GloveRenderer.prototype.drawBullet.call(r,ctx,index));
  const[im,sx,sy,sw,sh,x,y,w,h]=calls[0];assert.equal(im,image);assert.ok(Math.abs(w/sw-h/sh)<1e-12);assert.ok(Math.abs(w-235)<1e-10);assert.ok(h>139&&h<=155);
  assert.ok(Math.abs(x+w/2-(data.bulletBox[0]+data.bulletBox[2])/2-b.mountOffset[0])<1e-10);
  assert.ok(Math.abs(y+h/2-(data.bulletBox[1]+data.bulletBox[3])/2-b.mountOffset[1])<1e-10);
 }
});
test('new silicone drafts save while default checkout remains blocked before CCV access',async()=>{
 let rows=0,posts=0;const store={create:async d=>({...d,id:'draft_'+(++rows)}),reserveRate:async()=>true};
 const ccv={configured:true,prepare:async()=>{posts++;throw Error('CCV must not be called');}};
 const service=createCommerce({store,ccv,requireAdmin:async()=>{},appUrl:'https://example.com'});
 for(const index of[15,16]){
  const draft=await service({action:'create',confirmed:true,design:{...fixture,bullet:index},previews:['back','palm','thumb','pinky'].map(view=>({view,available:false,notes:['No test preview']}))});
  assert.ok(draft.id);await assert.rejects(service({action:'checkout',id:draft.id,token:draft.checkoutToken}),/checkout_approval_pending/);
 }
 assert.equal((await service({action:'config'})).checkoutEnabled,false);assert.equal(posts,0);assert.equal(rows,2);
});

test('offset badge reflection keeps its actual centre on the mirrored wrist',()=>{
 for(const b of data.bullets.filter(b=>b.sourceBox)){
  const dx=b.mountOffset[0],bb=data.bulletBox,cx=(bb[0]+bb[2])/2+dx,calls=[];
  GloveRenderer.prototype.unmirror.call({}, {save(){},restore(){},translate(x,y){calls.push([x,y])},scale(){}},bb[0]+dx,bb[2]+dx,true,()=>{});
  assert.equal(calls[0][0]-cx,cx);
 }
});
