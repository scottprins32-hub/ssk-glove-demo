import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import {unzipSync} from 'fflate';
const LIMIT=4800000,TOTAL=9500000;
const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const b64=data=>{let s='';for(let i=0;i<data.length;i+=8192)s+=String.fromCharCode(...data.subarray(i,i+8192));return btoa(s);};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;');
const safeName=s=>String(s).replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80);
const views={back:'Back',palm:'Palm',thumb:'Thumb side',pinky:'Pinky side'};
// The native provider accepts documents/images, not ZIPs or CID attachments.
// Each design gets one PDF plus its four untouched original images.
export async function nativeDelivery(packet) {
 const source=await PDFDocument.load(packet.pdfBytes),files=unzipSync(packet.zipBytes),attachments=[...packet.attachments],messages=[];
 if(packet.pdfGroups?.length!==packet.manifest.designs.length)throw Error('native_pdf_groups_missing');
 for(let i=0;i<packet.manifest.designs.length;i++){
  const design=packet.manifest.designs[i],group=packet.pdfGroups[i],orderName=safeName(packet.manifest.orderNumber);let pdf=await PDFDocument.create();
  pdf.setCreationDate(new Date('2000-01-01T00:00:00Z'));pdf.setModificationDate(new Date('2000-01-01T00:00:00Z'));
  pdf.addPage((await pdf.copyPages(source,[0]))[0]);
  const font=await pdf.embedFont(StandardFonts.Helvetica),page=pdf.addPage([595.28,841.89]);
  page.drawText('SSK Europe - Design '+(i+1)+' of '+packet.manifest.designs.length+' - quantity '+design.quantity,{x:32,y:805,size:13,font});
  page.drawText('Overview images. Full-resolution original views are attached separately.',{x:32,y:781,size:9,font});
  let n=0;const originals=[];
  for(const view of ['back','palm','thumb','pinky']){
   const preview=design.previews.find(p=>p.view===view),x=32+(n%2)*272,y=430-Math.floor(n/2)*335;n++;
   page.drawText(views[view],{x,y:y+305,size:11,font,color:rgb(.08,.08,.08)});
   if(!preview?.available){page.drawText('No approved image supplied.',{x,y:y+165,size:9,font});continue;}
   const original=files[preview.file];if(!original)throw Error('native_original_missing');
   const thumb=packet.attachments.find(a=>a.content_id?.includes('-'+i+'-'+view+'@'));
   if(!thumb)throw Error('native_preview_missing');
   const image=thumb.content_type==='image/png'?await pdf.embedPng(bytes(thumb.content)):await pdf.embedJpg(bytes(thumb.content));
   const scale=Math.min(250/image.width,280/image.height);page.drawImage(image,{x:x+(250-image.width*scale)/2,y:y+15+(280-image.height*scale)/2,width:image.width*scale,height:image.height*scale});
   originals.push({filename:'SSK-'+orderName+'-design-'+(i+1)+'-'+view+'.'+preview.file.split('.').at(-1),content:b64(original)});
  }
  for(const p of await pdf.copyPages(source,group.slice(1)))pdf.addPage(p);
  const compact=pdf,full=await PDFDocument.create();full.setCreationDate(new Date('2000-01-01T00:00:00Z'));full.setModificationDate(new Date('2000-01-01T00:00:00Z'));
  for(const p of await full.copyPages(source,[0,...group]))full.addPage(p);
  // Keep full source-image PDF pages whenever the provider's limit permits.
  pdf=(await full.save()).length<LIMIT-150000?full:compact;
  const notes=design.previews.filter(p=>p.notes?.length),noteHtml=notes.map(p=>'<li><strong>'+escape(views[p.view]||p.view)+'</strong><ul>'+p.notes.map(note=>'<li>'+escape(note)+'</li>').join('')+'</ul></li>').join('');
  if(notes.length){
   const noteFont=await pdf.embedFont(StandardFonts.Helvetica),supported=new Set(noteFont.getCharacterSet());
   const printable=s=>[...String(s)].map(c=>supported.has(c.codePointAt(0))?c:'[U+'+c.codePointAt(0).toString(16).toUpperCase()+'] ').join('');
   let notesPage,y=0;const line=text=>{if(y<45){notesPage=pdf.addPage([595.28,841.89]);notesPage.drawText('Image qualifications - design '+(i+1),{x:32,y:805,size:13,font:noteFont});y=778;}notesPage.drawText(text,{x:32,y,size:9,font:noteFont});y-=14;};
   for(const preview of notes){line(views[preview.view]||preview.view);for(const note of preview.notes){let current='';for(const c of printable(note)){if(noteFont.widthOfTextAtSize(current+c,9)>525){line(current);current='';}current+=c;}line(current);line('');}}
  }
  const filename='SSK-'+orderName+'-design-'+(i+1)+'-production.pdf',pdfData=await pdf.save();
  const nativeAttachments=[{filename,content:b64(pdfData)},...originals];
  if(nativeAttachments.length>5||nativeAttachments.some(a=>bytes(a.content).length>LIMIT)||nativeAttachments.reduce((sum,a)=>sum+bytes(a.content).length,0)>TOTAL)throw Error('native_attachment_limits');
  for(const a of nativeAttachments)attachments.push({...a,content_type:a.filename.endsWith('.pdf')?'application/pdf':'image/'+a.filename.split('.').at(-1),disposition:'attachment'});
  const html=packet.html.replace(/<img [^>]+>/g,'<span>See attached PDF</span>').replace('The PDF overview and original images/specifications ZIP are attached.','The production PDF and full-resolution original images are attached.').replace('see the PDF and source specifications for image notes.','see the attached PDF and the image qualifications below.').replace('</body>','<h2>Image qualifications for design '+(i+1)+'</h2><ul>'+noteHtml+'</ul></body>').replace('<h1>','<p><strong>Design '+(i+1)+' of '+packet.manifest.designs.length+' - quantity '+design.quantity+'. Keep and forward all numbered parts together.</strong></p><h1>');
  messages.push({subject:packet.subject+' - design '+(i+1)+'/'+packet.manifest.designs.length,html,attachmentNames:nativeAttachments.map(a=>a.filename)});
 }
 return {...packet,attachments,messages,deliveryFormat:'base44-attachments-v1'};
}
