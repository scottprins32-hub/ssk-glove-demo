// Web lace must lie beneath a fitted pad or hood, in either hand.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const OV=process.env.ASSET_OVERRIDE; const files=new Set(OV ? readdirSync(OV) : []);
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
const page = await browser.newPage();
await page.route('**/assets/*', r => { const n = new URL(r.request().url()).pathname.split('/').pop();
  return files.has(n) ? r.fulfill({ body: readFileSync(`${OV}/${n}`), contentType: n.endsWith('.json') ? 'application/json' : 'image/webp' }) : r.fallback(); });
await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8766/'), { waitUntil: 'networkidle' });
const res = await page.evaluate(async () => { 
  const { loadGlove, GloveRenderer } = await import('./glove-engine.js');
  const bundle = await loadGlove(); const D = bundle.DATA, W = D.w, H = D.h;
  const state = {}; for (const z of D.zones) state[z.id] = z.group === 'lace' ? '90' : (z.id === 'web' ? '60' : '10');
  const laceIds = id => id.startsWith('laceweb_') || id === 'laces_web' || id === 'laces_knot';
  const make = patched => {const R=new GloveRenderer(bundle);if(!patched)R.underPad=c=>c;return R;};
  const render = (R, web, part, mirror) => { R.setWeb(web); R.setPad(part, '#E03C31'); const c = document.createElement('canvas'); c.width = W; c.height = H;
    R.draw(c.getContext("2d"), state, 7, null, false, mirror); return c.getContext("2d").getImageData(0, 0, W, H).data; };
  const alpha = id => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(bundle.imgs[id], 0, 0); return g.getImageData(0, 0, W, H).data; };
  const lace = [0x30, 0x31, 0x32], padc = [0xE0, 0x3C, 0x31];
  const out = [];
  for (const part of ['pad', 'hood']) {
    const pa = alpha(part);
    for (const web of [null,...Object.keys(D.webs)]) for (const mirror of [false, true]) {
      const row = { part, web: web || 'H-Web', hand: mirror ? 'LHT' : 'RHT' };
      for (const patched of [false, true]) {
        const px = render(make(patched), web, part, mirror); let n = 0, tot = 0;
        for (let i = 0; i < W * H; i++) { const x = i % W, y = (i - x) / W; const j = mirror ? y * W + (W - 1 - x) : i;
          if (pa[j * 4 + 3] < 200) continue; tot++;
          const p = [px[i*4], px[i*4+1], px[i*4+2]]; const dl = Math.hypot(...p.map((v, k) => v - lace[k])), dp = Math.hypot(...p.map((v, k) => v - padc[k]));
          if (dl < dp) n++; }
        row[patched ? 'after' : 'before'] = n; row.padPx = tot; }
      out.push(row); }
  }
  // no-pad identity and pad-draw identity outside the pad
  const ident = [];
  for (const web of ['smlee', null, 'trapeze', 'standard-i']) for (const mirror of [false, true]) {
    const a = render(make(false), web, null, mirror), b = render(make(true), web, null, mirror); let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    ident.push({ web: web || 'H-Web', hand: mirror ? 'LHT' : 'RHT', noPadBytesDiffer: d }); }
  return { out, ident };
});

if(process.env.RESULTS)writeFileSync(process.env.RESULTS,JSON.stringify(res,null,2));
await browser.close();
for(const row of res.ident)assert.equal(row.noPadBytesDiffer,0);
for(const row of res.out){const floor=res.out.find(x=>x.part===row.part&&x.hand===row.hand&&x.web==='spiral-i').after;assert.ok(Math.abs(row.after-floor)<=5,JSON.stringify(row));}
console.log('PASS: '+res.out.length+' web/pad/hand cases; no-pad renders byte-identical.');
