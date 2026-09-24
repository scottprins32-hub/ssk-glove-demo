// Validate palm material controls, mirrored rendering and hit targets.
// Optional PALM_ASSETS points to an isolated candidate directory.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
try {
  const page = await browser.newPage();
  if (process.env.PALM_ASSETS) {
    await page.route('**/assets/palm-data.json', async r => r.fulfill({contentType:'application/json',body:await readFile(`${process.env.PALM_ASSETS}/palm-data.json`)}));
    await page.route('**/assets/palm/*', async r => r.fulfill({contentType:'image/webp',body:await readFile(`${process.env.PALM_ASSETS}/palm/${new URL(r.request().url()).pathname.split('/').pop()}`)}));
  }
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8766/');
  const results = await page.evaluate(async () => {
    const {loadGlove,GloveRenderer}=await import('./glove-engine.js');
    const bundle=await loadGlove(),R=new GloveRenderer(bundle);
    if(!R.setView('palm'))throw Error('Palm assets did not load');
    const D=R.DATA,c=document.createElement('canvas');c.width=D.w;c.height=D.h;
    const g=c.getContext('2d',{willReadFrequently:true}),s=Object.fromEntries(D.zones.map(z=>[z.id,'10']));
    R.draw(g,s,null,null,false,false);const base=g.getImageData(0,0,D.w,D.h).data;
    const rows=[];
    for(const z of D.zones){
      if(!R.imgs[z.id])throw Error('Missing material '+z.id);
      g.clearRect(0,0,D.w,D.h);g.drawImage(R.imgs[z.id],0,0);const mask=g.getImageData(0,0,D.w,D.h).data;
      R.draw(g,{...s,[z.id]:'90'},null,null,false,false);const changed=g.getImageData(0,0,D.w,D.h).data;
      let pixels=0,alphaChanged=0,hitSamples=0,hitMismatch=0;
      for(let i=0;i<base.length;i+=4){
        if(base[i+3]!==changed[i+3])alphaChanged++;
        if(mask[i+3]<240)continue;
        if(Math.abs(base[i]-changed[i])+Math.abs(base[i+1]-changed[i+1])+Math.abs(base[i+2]-changed[i+2])>20)pixels++;
        // Sample solid mask interiors that the production hit-map owns.
        const n=i/4,x=n%D.w,y=Math.floor(n/D.w);
        if(n%97===0 && R.idData[i]===z.n){hitSamples++;if(R.zoneAt(x,y,false)!==z.id || R.zoneAt(D.w-1-x,y,true)!==z.id)hitMismatch++;}
      }
      rows.push({zone:z.id,pixels,alphaChanged,hitSamples,hitMismatch});
    }
    R.draw(g,s,null,null,false,true);const left=g.getImageData(0,0,D.w,D.h).data;
    let mirrorMismatch=0;
    for(let y=0;y<D.h;y++)for(let x=0;x<D.w;x++){
      // The renderer intentionally keeps embossed lettering readable on a
      // lefty. Compare material geometry outside those documented boxes.
      if((D.marks?.boxes||[]).some(([x0,y0,x1,y1])=>x>=x0&&x<x1&&y>=y0&&y<y1))continue;
      const a=(y*D.w+x)*4,b=(y*D.w+D.w-1-x)*4;
      if(Math.abs(base[a]-left[b])+Math.abs(base[a+1]-left[b+1])+Math.abs(base[a+2]-left[b+2])+Math.abs(base[a+3]-left[b+3])>4)mirrorMismatch++;
    }
    return {rows,mirrorMismatch};
  });
  for(const r of results.rows){assert.ok(r.pixels>500,`${r.zone} must recolour visibly`);assert.equal(r.alphaChanged,0,`${r.zone} preserves silhouette`);assert.ok(r.hitSamples>10);assert.equal(r.hitMismatch,0,`${r.zone} hit targets agree in both hands`);}
  assert.equal(results.mirrorMismatch,0,'palm materials mirror exactly outside readable lettering');
  console.log(JSON.stringify(results));
  console.log(`PASS: ${results.rows.length} palm materials recolour, silhouette is stable and both-hand hit targets match.`);
} finally {await browser.close();}
