import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {CIRCLE_COLORS,COLOUR_ORDER} from '../glove_builder/customiser/glove-catalog.js';
import {encodeV4,decodeV4} from '../glove_builder/customiser/refcode.js';
import {validateDesign} from '../glove_builder/customiser/commerce-contract.js';
import {validateDesign as hosted} from '../base44/functions/ssk-commerce-v14/lib/commerce-contract.js';
const data=JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/thumb-data.json',import.meta.url)));
const fixture={hand:'RHT',size:'11.75"',webType:'H-Web',pad:'None',flag:'None',bullet:0,colors:Object.fromEntries(COLOUR_ORDER.map(k=>[k,'10'])),materials:{},thumbNumber:'14',circle:'Navy',numberColor:'20'};
test('one/two digits or initials and independent circle/thread colours survive validation',()=>{
 for(const text of ['1','14','S','SP','A7'])for(const [circle]of CIRCLE_COLORS){
  const raw={...fixture,thumbNumber:text,circle};const a=validateDesign(raw);assert.deepEqual(a,hosted(raw));assert.equal(a.thumbNumber,text);assert.equal(a.circle,circle);assert.equal(a.numberColor,'20');
  assert.equal(decodeV4(encodeV4(a,'Edge Gold')).circle,circle);
 }
 for(const text of ['ABC','123','a','<'])assert.throws(()=>validateDesign({...fixture,thumbNumber:text}));
});
test('legacy circle slots remain append-only; Navy remains available',()=>{assert.deepEqual(CIRCLE_COLORS.slice(0,6).map(c=>c[0]),['Black','Navy','Yellow','Red','Blue','White']);assert.ok(CIRCLE_COLORS.length<16)});
test('thumb badge source crop excludes transparent outlier pixels and uses one centre',()=>{
 const b=data.thumbBadge;assert.deepEqual(b.sourceBox,[143,118,982,982]);assert.equal(b.artAngleDegrees,-60);assert.equal(b.sskAngleDegrees,40);assert.equal(b.sskLeftAngleDegrees,-16);assert.equal(b.cx,390);assert.equal(b.cy,844);assert.ok(b.stitchRadius>b.radius);assert.equal(b.stitchRadius-b.radius,5);
 assert.equal(data.nativeHContour.traceSha256.length,64);
});
