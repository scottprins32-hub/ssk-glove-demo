import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFactoryPacket} from '../commerce/production/packet.js';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../commerce/production/package.json',import.meta.url));
const {unzipSync,strFromU8}=require('fflate'),{encode}=require('fast-png'),{PDFDocument}=require('pdf-lib');
import {COLOUR_ORDER} from '../glove_builder/customiser/glove-catalog.js';
const original=encode({width:2,height:2,data:new Uint8Array(16).fill(255),channels:4});
const design=()=>({hand:'RHT',size:'11.75"',webType:'H-Web',pad:'None',bullet:7,colors:Object.fromEntries(COLOUR_ORDER.map(k=>[k,'10'])),materials:{},flag:'None',lang:'nl',thumbText:'É14',name:'DO NOT EXPORT BUYER',phone:'0600000000'});
const draft=(i=0)=>({id:'snapshot_'+i,reference:'SSK-TEST-'+i,quantity:i+1,design:design(),previews:['back','palm','thumb','pinky'].map(view=>({view,available:true,dataUrl:'data:image/png;base64,'+Buffer.from(original).toString('base64'),notes:[]}))});
test('PDF, original-image ZIP and inline mail retain all designs and quantities',async()=>{const drafts=[draft(),draft(1)],packet=await buildFactoryPacket({order:{id:77,ordernumber_full:'28803'},drafts});assert.equal(packet.manifest.totalCustomGloves,3);assert.equal(packet.manifest.designs.length,2);const zip=unzipSync(packet.zipBytes);assert.equal(Object.keys(zip).filter(k=>k.endsWith('.png')).length,8);for(const bytes of Object.entries(zip).filter(([k])=>k.endsWith('.png')).map(([,v])=>v))assert.deepEqual(bytes,original);const manifest=JSON.parse(strFromU8(zip['order-specification.json']));assert.equal(manifest.designs[1].quantity,2);assert.equal(manifest.designs[0].design.name,undefined);assert.equal(manifest.designs[0].design.phone,undefined);assert.ok(!packet.html.includes('DO NOT EXPORT BUYER'));assert.equal(packet.attachments.filter(a=>a.content_id).length,8);const pdf=await PDFDocument.load(packet.pdfBytes);assert.equal(pdf.getPageCount(),5);});
test('unavailable views are explicit and do not fabricate images',async()=>{const d=draft();d.previews=d.previews.map(p=>({...p,available:false}));const packet=await buildFactoryPacket({order:{id:77},drafts:[d]});assert.ok(packet.html.includes('No approved image supplied'));assert.equal(packet.attachments.length,2);assert.ok(packet.manifest.designs[0].previews.every(p=>!p.available));});
test('mail HTML escapes personalization and order values',async()=>{const d=draft();d.design.thumbText='<b>';const p=await buildFactoryPacket({order:{id:77,ordernumber_full:'A&B'},drafts:[d]});assert.ok(p.html.includes('&lt;b&gt;'));assert.ok(p.html.includes('A&amp;B'));assert.ok(!p.html.includes('<b>'));});
test('invalid quantities and oversized compressed dimensions fail without resizing',async()=>{for(const quantity of [0,100,1.5])await assert.rejects(()=>buildFactoryPacket({order:{id:77},drafts:[{...draft(),quantity}]}),/packet_quantity_invalid/);const d=draft(),bytes=Uint8Array.from(original);new DataView(bytes.buffer).setUint32(16,10000);d.previews[0].dataUrl='data:image/png;base64,'+Buffer.from(bytes).toString('base64');await assert.rejects(()=>buildFactoryPacket({order:{id:77},drafts:[d]}),/packet_image_dimensions/);});
test('valid Japanese and emoji personalization preserves literal UTF-8 without losing the packet',async()=>{const d=draft();d.design.thumbText='山田⚾';const packet=await buildFactoryPacket({order:{id:77},drafts:[d]});assert.ok(packet.html.includes('山田⚾'));const zip=unzipSync(packet.zipBytes);assert.ok(strFromU8(zip['01-SSK-TEST-0/specification.txt']).includes('山田⚾'));assert.ok(packet.pdfBytes.length>0);});

test('WebP packet still works when the hosted runtime prohibits WebAssembly',async()=>{const compile=WebAssembly.compile;WebAssembly.compile=()=>Promise.reject(new WebAssembly.CompileError('fixture blocked'));try{const d=draft();for(const p of d.previews)p.dataUrl='data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQssrUsv+BiOh/AAA=';const packet=await buildFactoryPacket({order:{id:77},drafts:[d]});assert.ok(packet.pdfBytes.length>0);assert.deepEqual(unzipSync(packet.zipBytes)['01-SSK-TEST-0/back.webp'],new Uint8Array(Buffer.from('UklGRh4AAABXRUJQVlA4TBEAAAAvAUAAAAdQssrUsv+BiOh/AAA=','base64')));}finally{WebAssembly.compile=compile;}});

test('native mail includes a PDF and exact originals for each separate design',async()=>{
 const {nativeDelivery}=await import('../commerce/production/native-packet.js');
 const packet=await nativeDelivery(await buildFactoryPacket({order:{id:77,ordernumber_full:'28803'},drafts:[draft(),draft(1)]}));
 assert.equal(packet.messages.length,2);assert.equal(packet.deliveryFormat,'base44-attachments-v1');
 for(const [i,message]of packet.messages.entries()){
  assert.equal(message.attachmentNames.length,5);assert.ok(!message.html.includes('cid:'));assert.ok(!message.html.includes('ZIP are attached'));
  const attachments=message.attachmentNames.map(name=>packet.attachments.find(a=>a.filename===name));
  assert.ok(attachments.every(a=>!a.filename.endsWith('.zip')&&Buffer.from(a.content,'base64').length<4800000));
  assert.equal((await PDFDocument.load(Buffer.from(attachments[0].content,'base64'))).getPageCount(),3);
  for(const a of attachments.slice(1))assert.deepEqual(new Uint8Array(Buffer.from(a.content,'base64')),original);
  assert.ok(message.subject.includes('design '+(i+1)+'/2'));
 }
});
test('native mail preserves explicit missing-image status without fabricating attachments',async()=>{
 const {nativeDelivery}=await import('../commerce/production/native-packet.js');const d=draft();d.previews=d.previews.map(p=>({...p,available:false}));
 const packet=await nativeDelivery(await buildFactoryPacket({order:{id:77},drafts:[d]}));assert.equal(packet.messages[0].attachmentNames.length,1);
});
test('native mail keeps full representative-image qualifications in the mailed PDF and HTML',async()=>{
 const {nativeDelivery}=await import('../commerce/production/native-packet.js');const d=draft(),note='Size 13 ordered; the image shows a representative size.';d.previews[0].notes=[note,'Personalization is specified but not visible in this image.','<literal note>'];
 const packet=await nativeDelivery(await buildFactoryPacket({order:{id:77},drafts:[d]}));assert.ok(packet.messages[0].html.includes(note));assert.ok(packet.messages[0].html.includes('&lt;literal note&gt;'));
 const attachment=packet.attachments.find(a=>a.filename===packet.messages[0].attachmentNames[0]);assert.equal((await PDFDocument.load(Buffer.from(attachment.content,'base64'))).getPageCount(),4);
});
test('accepted large PNG previews use a bounded PDF overview and preserve originals',async()=>{
 const {deflateSync}=await import('node:zlib'),{validatePreviews}=await import('../glove_builder/customiser/commerce-contract.js'),{nativeDelivery}=await import('../commerce/production/native-packet.js');
 const width=1000,height=1000,raw=Buffer.alloc((width*3+1)*height);let seed=12345678;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 for(let y=0;y<height;y++){let offset=y*(width*3+1);raw[offset++]=1;for(let x=0;x<width;x++)for(let c=0;c<3;c++)raw[offset++]=rand()%(x===0?256:2);}
 const crc=input=>{let c=0xffffffff;for(const b of input){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const t=Buffer.from(type),length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([length,t,data,check]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=2;
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
 const d=draft();d.previews=validatePreviews(d.previews.map(p=>({...p,dataUrl:'data:image/png;base64,'+png.toString('base64')})));
 const source=await buildFactoryPacket({order:{id:77},drafts:[d]});assert.ok(source.pdfBytes.length>4800000);
 const packet=await nativeDelivery(source),attachments=packet.messages[0].attachmentNames.map(name=>packet.attachments.find(a=>a.filename===name));assert.equal(attachments.length,5);
 assert.ok(attachments.every(a=>Buffer.from(a.content,'base64').length<4800000));for(const a of attachments.slice(1))assert.deepEqual(Buffer.from(a.content,'base64'),png);
});
