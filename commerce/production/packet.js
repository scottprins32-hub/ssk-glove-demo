import {PDFDocument,rgb} from 'pdf-lib';
import UPNGModule from '@pdf-lib/upng';
const UPNG=typeof UPNGModule.decode==='function'?UPNGModule:UPNGModule.default;
import fontkit from '@pdf-lib/fontkit';
import {encode as pngEncode} from 'fast-png';
import {zipSync,strToU8} from 'fflate';
import decodeWebp,{init as initWebp} from '@jsquash/webp/decode.js';
import {WebPDecoder} from './vendor/WebPDecoder.js';
import {fontBytes,webpWasmBytes} from './packet-assets.js';
import {specification} from '../../glove_builder/customiser/commerce-contract.js';
import {displaySpecification} from '../../glove_builder/customiser/commerce-summary.js';
const MAIL_LIMIT=35000000;
const enc=new TextEncoder(),views={back:'Back',palm:'Palm',thumb:'Thumb side',pinky:'Pinky side'};
const partNames={back1:'Back 1 — thumb wingtip',back2:'Back 2 — rest of thumb',back3:'Back 3 — index, first part',back4:'Back 4 — index, second part',back5:'Back 5 — middle finger, first part',back6:'Back 6 — middle finger, second part',back7:'Back 7 — whole ring finger',back8:'Back 8 — rest of pinky',back9:'Back 9 — pinky wingtip'};
const escape=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const safeName=s=>String(s).replace(/[^A-Za-z0-9_-]/g,'-').slice(0,85);
let codec;
async function decodeImage(dataUrl){
 const match=/^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl||'');if(!match)throw Error('packet_image_invalid');
 const bytes=unb64(match[2]);if(bytes.length>1500000)throw Error('packet_image_too_large');
 let rgba;
 if(match[1]==='webp'){
  // Decode only bounded generated-preview dimensions; do not resize originals.
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),kind=String.fromCharCode(...bytes.subarray(12,16));let width,height;
  if(kind==='VP8X'){width=1+v.getUint8(24)+(v.getUint8(25)<<8)+(v.getUint8(26)<<16);height=1+v.getUint8(27)+(v.getUint8(28)<<8)+(v.getUint8(29)<<16);}
  else if(kind==='VP8L'){const bits=v.getUint32(21,true);width=1+(bits&16383);height=1+((bits>>>14)&16383);}
  else if(kind==='VP8 '){width=v.getUint16(26,true)&16383;height=v.getUint16(28,true)&16383;}
  if(!width||!height||width>4096||height>4096||width*height>8000000)throw Error('packet_image_dimensions');
  if(!codec){if(typeof globalThis.ImageData==='undefined')globalThis.ImageData=class{constructor(data,width,height){this.data=data;this.width=width;this.height=height;}};codec=WebAssembly.compile(webpWasmBytes).then(async module=>{await initWebp(module);return true;}).catch(error=>{if(error?.name==='CompileError')return false;throw error;});}
  if(await codec)rgba=await decodeWebp(bytes.buffer);else{const decoded=new WebPDecoder(bytes);rgba={width:Number(decoded.width[0]),height:Number(decoded.height[0]),data:new Uint8Array(decoded.getData())};}
  if(rgba.width!==width||rgba.height!==height)throw Error('packet_image_dimensions');
  return {bytes,ext:match[1],png:pngEncode({width,height,data:new Uint8Array(rgba.data),channels:4}),rgba};
 }
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width,height;
 if(match[1]==='png') {
  if(bytes.length<24||[137,80,78,71,13,10,26,10].some((b,i)=>bytes[i]!==b))throw Error('packet_image_invalid');
  width=v.getUint32(16);height=v.getUint32(20);
 } else {
  if(bytes[0]!==255||bytes[1]!==216)throw Error('packet_image_invalid');
  let offset=2;
  while(offset+4<bytes.length) {
   if(bytes[offset]!==255)throw Error('packet_image_invalid');
   const marker=bytes[offset+1],length=v.getUint16(offset+2);
   if(length<2||offset+2+length>bytes.length)throw Error('packet_image_invalid');
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=v.getUint16(offset+5);width=v.getUint16(offset+7);break;}
   offset+=2+length;
  }
 }
 if(!width||!height||width>4096||height>4096||width*height>8000000)throw Error('packet_image_dimensions');
 if(match[1]==='png'){
  const decoded=UPNG.decode(bytes.buffer);if(decoded.frames?.length>1)throw Error('packet_image_invalid');
  rgba={width,height,data:new Uint8Array(UPNG.toRGBA8(decoded)[0])};
 }
 return {bytes,ext:match[1],png:match[1]==='png'?bytes:null,rgba};
}
function thumbnail(image,max=400){
 if(!image.rgba)return {bytes:image.bytes,type:'image/'+image.ext};
 const src=image.rgba,scale=Math.min(1,max/Math.max(src.width,src.height)),width=Math.max(1,Math.round(src.width*scale)),height=Math.max(1,Math.round(src.height*scale)),data=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sx=(x+.5)/scale-.5,sy=(y+.5)/scale-.5,x0=Math.max(0,Math.min(src.width-1,Math.floor(sx))),y0=Math.max(0,Math.min(src.height-1,Math.floor(sy))),x1=Math.min(src.width-1,x0+1),y1=Math.min(src.height-1,y0+1),fx=Math.max(0,Math.min(1,sx-x0)),fy=Math.max(0,Math.min(1,sy-y0));
  for(let c=0;c<4;c++)data[(y*width+x)*4+c]=Math.round(src.data[(y0*src.width+x0)*4+c]*(1-fx)*(1-fy)+src.data[(y0*src.width+x1)*4+c]*fx*(1-fy)+src.data[(y1*src.width+x0)*4+c]*(1-fx)*fy+src.data[(y1*src.width+x1)*4+c]*fx*fy);
 }
 return {bytes:pngEncode({width,height,data,channels:4}),type:'image/png'};
}
const rowsFor=d=>{const spec=specification(d.design);return displaySpecification(spec,'en').map(([label,value],i)=>[partNames[spec[i][0]]||label,String(value)]);};
export async function buildFactoryPacket({order,drafts}){
 if(!Number.isSafeInteger(order.id)||!Array.isArray(drafts)||!drafts.length||drafts.length>6)throw Error('packet_order_invalid');
 const number=String(order.ordernumber_full||order.ordernumber||order.order_number||order.id),name='SSK-Order-'+safeName(number),pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(fontBytes,{subset:true}),glyphs=new Set(font.getCharacterSet()),attachments=[],zipFiles={},gloves=[],htmlGloves=[],imagePages=new Set(),pdfGroups=[];
 // Never discard valid personalization when the PDF font lacks a glyph.
 // Literal text stays in HTML and UTF-8 source files; PDF notation is explicit.
 const printable=s=>[...String(s)].map(c=>glyphs.has(c.codePointAt(0))?c:'[U+'+c.codePointAt(0).toString(16).toUpperCase()+'] ').join('');
 const text=(page,s,x,y,size=10)=>{page.drawText(printable(s),{x,y,size,font,color:rgb(.06,.06,.06)});};
 const wrap=(s,size,width)=>{const lines=[];for(const line of printable(s).split('\n')){let current='';for(const word of line.split(' ')){const trial=current?current+' '+word:word;if(current&&font.widthOfTextAtSize(trial,size)>width){lines.push(current);current=word;}else current=trial;}lines.push(current);}return lines;};
 const page=(title,index)=>{const p=pdf.addPage([595.28,841.89]);p.drawRectangle({x:0,y:788,width:595.28,height:54,color:rgb(.06,.06,.06)});p.drawText('SSK PRO CUSTOM',{x:32,y:807,size:17,font,color:rgb(1,1,1)});text(p,'Order '+number+' · '+title,32,766,12);text(p,'SSK Europe · '+(index??'Order overview')+' · specifications are authoritative',32,22,8);return p;};
 const overview=page('Production specification');text(overview,'Custom glove designs: '+drafts.length,32,728,14);text(overview,'Payment and production release are handled by SSK Europe.',32,704,10);text(overview,'This package contains custom gloves only; other shop items are excluded.',32,686,9);
 let summaryY=650,totalQuantity=0;
 for(let i=0;i<drafts.length;i++){
  const d=drafts[i],qty=Number(d.quantity??1);if(!Number.isSafeInteger(qty)||qty<1||qty>99)throw Error('packet_quantity_invalid');totalQuantity+=qty;
  const rows=rowsFor(d),folder=String(i+1).padStart(2,'0')+'-'+safeName(d.reference),record={id:d.id,reference:d.reference,quantity:qty,design:{...d.design},specification:specification(d.design),previews:[]};delete record.design.name;delete record.design.phone;
  text(overview,(i+1)+'. '+d.design.size+' · '+d.design.webType+' · '+d.design.hand+' · quantity '+qty,32,summaryY,11);text(overview,d.reference,42,summaryY-19,8);summaryY-=56;
  const firstPage=pdf.getPageCount();const sheet=page('Design '+(i+1)+' of '+drafts.length+' · quantity '+qty,'Design '+(i+1));text(sheet,d.reference,32,744,8);
  imagePages.add(pdf.getPageCount()-1);let imageHtml='';
  for(let j=0;j<4;j++){
   const view=['back','palm','thumb','pinky'][j],p=d.previews.find(p=>p.view===view),x=32+(j%2)*272,y=407-Math.floor(j/2)*328;let caption=views[view];
   text(sheet,caption,x,y+290,11);
   if(!p?.available){text(sheet,'No approved image supplied.',x,y+160,9);imageHtml+='<td style="width:25%;padding:8px">'+caption+'<br>No approved image supplied</td>';record.previews.push({view,available:false,notes:p?.notes||[]});continue;}
   const dataUrl=p.dataUrl||p.chunks?.join(''),decoded=await decodeImage(dataUrl),image=decoded.png?await pdf.embedPng(decoded.png):await pdf.embedJpg(decoded.bytes),factor=Math.min(250/image.width,260/image.height);sheet.drawImage(image,{x:x+(250-image.width*factor)/2,y:y+20+(260-image.height*factor)/2,width:image.width*factor,height:image.height*factor});
   zipFiles[folder+'/'+view+'.'+decoded.ext]=decoded.bytes;
   const thumb=thumbnail(decoded),cid='ssk-'+order.id+'-'+i+'-'+view+'@production',filename=folder+'-'+view+'-preview.'+(thumb.type==='image/png'?'png':decoded.ext);attachments.push({filename,content:b64(thumb.bytes),content_type:thumb.type,content_id:cid,disposition:'inline'});
   imageHtml+='<td style="width:25%;padding:8px;vertical-align:top"><img src="cid:'+cid+'" width="140" style="max-width:100%;height:auto" alt="'+escape(caption)+'"><br>'+caption+'</td>';
   const notes=(p.notes||[]).map(String).map(s=>s.replace(/^Maat (.+) wordt besteld; de afbeelding toont een representatieve maat\.$/,'Size $1 ordered; the image shows a representative size.').replace(/Personalisatie wordt volgens de specificatie gemaakt en is niet op deze afbeelding (?:zichtbaar|getekend)\./,'Personalization follows the specification and is not visible in this image.'));record.previews.push({view,available:true,file:folder+'/'+view+'.'+decoded.ext,notes});
   for(const [n,line] of wrap(notes.join(' '),6.2,250).slice(0,2).entries())text(sheet,line,x,y+7-n*7,6.2);
  }
  let specPage=page('Design '+(i+1)+' · full specification','Design '+(i+1)),y=714;
  text(specPage,'Missing font glyphs use [U+code]; original text is in the email and UTF-8 source files.',32,739,7);
  for(const [key,value]of rows){const a=wrap(key,8.5,210),b=wrap(value,9,300),height=Math.max(a.length,b.length)*13+8;if(y-height<45){specPage=page('Design '+(i+1)+' · specification continued','Design '+(i+1));y=736;}a.forEach((line,k)=>text(specPage,line,32,y-k*13,8.5));b.forEach((line,k)=>text(specPage,line,255,y-k*13,9));specPage.drawLine({start:{x:32,y:y-height+6},end:{x:563,y:y-height+6},thickness:.35,color:rgb(.85,.85,.85)});y-=height;}
  pdfGroups.push(Array.from({length:pdf.getPageCount()-firstPage},(_,n)=>firstPage+n));
  zipFiles[folder+'/specification.json']=strToU8(JSON.stringify(record,null,2));zipFiles[folder+'/specification.txt']=strToU8(['SSK Europe production specification','Order '+number,'Design '+(i+1)+' of '+drafts.length,'Quantity: '+qty,d.reference,...rows.map(([k,v])=>k+': '+v)].join('\n'));
  gloves.push(record);htmlGloves.push('<h2 style="color:#111">Design '+(i+1)+' of '+drafts.length+' · quantity '+qty+'</h2><p>'+escape(d.reference)+'</p><table role="presentation" width="100%"><tr>'+imageHtml+'</tr></table><table style="width:100%;border-collapse:collapse">'+rows.map(([k,v])=>'<tr><th style="padding:5px;text-align:left;border-bottom:1px solid #ddd">'+escape(k)+'</th><td style="padding:5px;border-bottom:1px solid #ddd">'+escape(v)+'</td></tr>').join('')+'</table>');
 }
 text(overview,'Total custom gloves: '+totalQuantity,32,summaryY-10,12);
 const manifest={schemaVersion:1,orderId:order.id,orderNumber:number,totalCustomGloves:totalQuantity,designs:gloves};zipFiles['order-specification.json']=strToU8(JSON.stringify(manifest,null,2));
 const pdfBytes=await pdf.save(),zipBytes=zipSync(zipFiles,{level:6});attachments.unshift({filename:name+'-production.pdf',content:b64(pdfBytes),content_type:'application/pdf',disposition:'attachment'},{filename:name+'-originals.zip',content:b64(zipBytes),content_type:'application/zip',disposition:'attachment'});
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f5f5;font:14px/1.5 Arial,sans-serif;color:#111"><div style="max-width:900px;margin:auto;background:white;padding:24px"><h1>SSK Europe · Order '+escape(number)+'</h1><p><strong>'+drafts.length+' custom design(s) · '+totalQuantity+' glove(s)</strong></p><p>Complete production specification for forwarding to SSK Japan. The PDF overview and original images/specifications ZIP are attached. Shipping/customer details and retail prices are excluded.</p><p><strong>Production release must be confirmed by SSK Europe. This is not a payment receipt.</strong></p>'+htmlGloves.join('<hr style="margin:30px 0">')+'<p>Specifications are authoritative. Images may be representative; see the PDF and source specifications for image notes.</p></div></body></html>';
 const estimatedBytes=attachments.reduce((n,a)=>n+a.content.length,enc.encode(html).length);
 let inline=attachments.filter(a=>a.content_id),emailHtml=html;
 if(inline.reduce((n,a)=>n+a.content.length,0)>8000000){inline=[];emailHtml=html.replace(/<img [^>]+>/g,'<span>Original view included in the PDF / ZIP</span>');}
 const overhead=enc.encode(emailHtml).length+inline.reduce((n,a)=>n+a.content.length,0)+10000;
 const sendAttachments=[];
 if(attachments[0].content.length+overhead<=MAIL_LIMIT)sendAttachments.push(attachments[0]);
 else {
  // Keep the complete image PDF for administrator download. Email the full
  // specification PDF and the untouched original views as separate ZIP files.
  const compact=await PDFDocument.create(),indices=Array.from({length:pdf.getPageCount()},(_,i)=>i).filter(i=>!imagePages.has(i));
  for(const p of await compact.copyPages(pdf,indices))compact.addPage(p);
  sendAttachments.push({filename:name+'-specification.pdf',content:b64(await compact.save()),content_type:'application/pdf',disposition:'attachment'});
 }
 if(attachments[1].content.length+overhead<=MAIL_LIMIT)sendAttachments.push(attachments[1]);
 else for(let i=0;i<gloves.length;i++){
  const prefix=String(i+1).padStart(2,'0')+'-',files=Object.fromEntries(Object.entries(zipFiles).filter(([key])=>key.startsWith(prefix)));files['order-specification.json']=zipFiles['order-specification.json'];
  sendAttachments.push({filename:name+'-design-'+(i+1)+'-originals.zip',content:b64(zipSync(files,{level:6})),content_type:'application/zip',disposition:'attachment'});
 }
 const groups=[];let current=[],size=overhead;
 for(const a of sendAttachments){if(a.content.length+overhead>MAIL_LIMIT)throw Error('packet_attachment_too_large');if(size+a.content.length>MAIL_LIMIT){groups.push(current);current=[];size=overhead;}current.push(a);size+=a.content.length;}if(current.length)groups.push(current);
 const subject='SSK Custom · Order '+number+' · '+totalQuantity+' glove(s) · production pack';
 for(const a of sendAttachments)if(!attachments.some(existing=>existing.filename===a.filename))attachments.push(a);
 const messages=groups.map((files,i)=>({subject:subject+(groups.length>1?' · part '+(i+1)+'/'+groups.length:''),html:emailHtml.replace('<h1>','<p><strong>Production package part '+(i+1)+' of '+groups.length+'. Keep / forward all parts together.</strong></p><h1>'),attachmentNames:[...files,...inline].map(a=>a.filename)}));
 return {pdfGroups,messages,subject:'SSK Custom · Order '+number+' · '+totalQuantity+' glove(s) · production pack',html,attachments,manifest,pdfBytes,zipBytes,estimatedBytes};
}
export function previewEmail(packet){let html=packet.html;for(const a of packet.attachments.filter(a=>a.content_id))html=html.replaceAll('cid:'+a.content_id,'data:'+a.content_type+';base64,'+a.content);return html;}
