import test from 'node:test';
import assert from 'node:assert/strict';
import {joinedPalmLighting} from '../glove_builder/customiser/glove-engine.js';
import {readFile} from 'node:fs/promises';
function fixture(){
 const w=32,h=28,base=new Uint8ClampedArray(w*h*4),tone=new Float32Array(w*h).fill(248);
 for(let y=5;y<22;y++)for(let x=6;x<25;x++)base[(y*w+x)*4+3]=255;
 const rw=80,rh=75,rb=new Uint8ClampedArray(rw*rh*4),rt=new Float32Array(rw*rh);
 for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){const j=y*rw+x;rb[j*4+3]=255;rt[j]=201;}
 return {base,tone,box:[40,31,72,59],ref:{base:rb,tone:rt},refBox:[10,15,90,90],bounds:[6,5,25,22]};
}
test('inserted fold inherits registered palm light and retains exact alpha/contour',()=>{
 const f=fixture(),original=f.base.slice(),outside=f.tone.slice();
 assert.equal(joinedPalmLighting(f.tone,f.base,f.box,f.ref,f.refBox,f.bounds),true);
 for(let j=0;j<f.tone.length;j++)assert.equal(f.tone[j],f.base[j*4+3]?201:outside[j]);
 assert.deepEqual(f.base,original);
});
test('registered lighting follows source coordinates across different bounding boxes',()=>{
 const f=fixture();for(let y=0;y<75;y++)for(let x=0;x<80;x++)f.ref.tone[y*80+x]=170+x*.5;
 joinedPalmLighting(f.tone,f.base,f.box,f.ref,f.refBox,f.bounds);
 for(const [x,y] of [[8,8],[21,17]])assert.ok(Math.abs(f.tone[y*32+x]-(170+(40+x-10)*.5))<.01);
});
test('small source leather detail remains without source exposure bias',()=>{
 const f=fixture();for(let y=5;y<22;y++)for(let x=6;x<25;x++)f.tone[y*32+x]=248+((x+y)%2?3:-3);
 joinedPalmLighting(f.tone,f.base,f.box,f.ref,f.refBox,f.bounds);
 const a=f.tone[12*32+12],b=f.tone[12*32+13];
 assert.ok(b-a>3 && b-a<5);assert.ok(Math.abs((a+b)/2-201)<.2);
});
test('missing opaque reference never invents lighting or changes the fold',()=>{
 const f=fixture(),original=f.tone.slice();f.ref.base.fill(0);
 assert.equal(joinedPalmLighting(f.tone,f.base,f.box,f.ref,f.refBox,f.bounds),false);
 assert.deepEqual(f.tone,original);
});
test('only the two I-web palm support pieces opt into joining; roles and signed masks remain unchanged',async()=>{
 const d=JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/palm-data.json',import.meta.url)));
 const joined=Object.entries(d.materialResponse).filter(([,v])=>v.joinLighting);
 assert.deepEqual(joined.map(([k])=>k).sort(),['i_merge_spiral_i_palm','i_merge_standard_i_palm']);
 for(const [id,response] of joined){assert.equal(response.joinLighting.source,'palm');assert.ok(d.assets[id]);}
 assert.deepEqual(d.palmWebs.roles,{leather:'web',laces:'laces',stitching:'stitching'});
 assert.equal(Object.keys(d.palmWebs.entries).length,8);
});

test('removed donor fragments cannot remain lace picking targets',async()=>{const {palmTopLaceFragment}=await import('../glove_builder/customiser/glove-engine.js');assert.equal(palmTopLaceFragment(413,139),true);assert.equal(palmTopLaceFragment(450,700),false);assert.equal(palmTopLaceFragment(620,90),false);});

test('palm figure thread strengthens existing coverage without filling gaps or changing colour family',async()=>{
 const {definePalmThread}=await import('../glove_builder/customiser/glove-engine.js');
 const rgba=new Uint8ClampedArray([0,0,0,0,235,235,235,64,235,235,235,255]);
 definePalmThread(rgba,[242,240,234]);assert.equal(rgba[3],0);assert.ok(rgba[7]>64);assert.equal(rgba[11],255);
 assert.deepEqual(Array.from(rgba.slice(8,11)),[242,240,234]);assert.ok(rgba[4]<242);assert.ok(rgba[4]>rgba[6]);
});

test('web edge shading retains alpha and open spaces, with the centre light unchanged',async()=>{
 const {shadePalmWebEdges}=await import('../glove_builder/customiser/glove-engine.js');
 const base=new Uint8ClampedArray(9*9*4),tone=new Float32Array(81).fill(233);
 for(let y=1;y<8;y++)for(let x=1;x<8;x++)base[(y*9+x)*4+3]=255;
 const original=base.slice();shadePalmWebEdges(tone,base,9,9,8);
 assert.equal(tone[4*9+1],225);assert.equal(tone[4*9+4],233);assert.equal(tone[0],233);assert.deepEqual(base,original);
});

test('palm web lighting recipes cannot reuse an earlier recipe tint',async()=>{
 const {GloveRenderer}=await import('../glove_builder/customiser/glove-engine.js');
 const r={view:'palm',web:'standard-i',views:{palm:{DATA:{palmWebs:{entries:{'standard-i':{},smk:{},smlee:{}}}}}},cache:new Map([['web|white',{}]]),order:['web|white'],syncNativeHContour(){}};
 GloveRenderer.prototype.setWeb.call(r,'smk');assert.equal(r.cache.size,0);assert.equal(r.order.length,0);
 r.cache.set('web|white',{});GloveRenderer.prototype.setWeb.call(r,'smlee');assert.equal(r.cache.size,1);
 GloveRenderer.prototype.setWeb.call(r,'standard-i');assert.equal(r.cache.size,0);
});
