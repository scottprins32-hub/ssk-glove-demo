/* Do the thumb and pinky sides work inside the configurator?

     NODE_PATH=<dir holding playwright> PW_CHROMIUM=<chrome> \
       node glove_builder/side_views_app_check.mjs

   Serves customiser/ and loads it the way a customer does, with an order in
   localStorage, then reads the stage canvas:

   - the view switcher offers back, palm, thumb side and pinky side,
   - on each side, in each hand, every zone shows its order field's colour,
   - clicking a zone on the stage selects that zone's order field,
   - choosing an unphotographed web hatches the thumb side's web, says so,
     and leaves every other pixel alone; the pinky side does not change.

   Exit 0 pass, 1 fail, 3 when Playwright is unavailable (not a pass). */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const pwFrom = (process.env.NODE_PATH ?? '').split(':').filter(Boolean)
  .map(d => join(d, 'playwright/index.mjs')).find(existsSync);
let chromium;
try {
  ({ chromium } = await import(pwFrom ?? 'playwright'));
} catch {
  console.log('SKIP  Playwright not found (set NODE_PATH); nothing was checked');
  process.exit(3);
}

const ROOT = join(new URL('./', import.meta.url).pathname, 'customiser/');
const PORT = Number(process.env.PORT ?? 8834);
const TOLERANCE = Number(process.env.TOLERANCE ?? 25);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const server = createServer((req, res) => {
  let path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\/+/, '');
  if (!path) path = 'index.html';
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT);

let failures = 0;
const fail = m => { console.log(`FAIL  ${m}`); failures++; };
const ok = m => console.log(`ok    ${m}`);

const DATA = JSON.parse(readFileSync(join(ROOT, 'assets/glove-data.json')));
const PAL = { stitching: 'stitching', ring_emb: 'embroidery', binding: 'lace',
  welting: 'lace', laces: 'lace' };
const hexOf = (f, code) => DATA.palettes[PAL[f] ?? 'leather'].find(c => c[0] === code)[2];
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const COLORS = { web: '70', back1: '20', back2: '35', back3: '60', back4: '90',
  back5: '45', back6: '10', back7: '43', back8: '50', back9: '25', palm: '12',
  belt: '48', binding: '10', welting: '90', laces: '45', stitching: '20',
  ring_emb: '10', lining: '10', thumb_loops: '10', pinky_loops: '10' };

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM
  ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const url = `http://127.0.0.1:${PORT}/index.html`;
await page.goto(url);
await page.waitForFunction(() => document.querySelectorAll('#stageview button').length > 0);

const views = await page.evaluate(() =>
  [...document.querySelectorAll('#stageview button')].map(b => b.dataset.view));
if (['back', 'palm', 'thumb', 'pinky'].every(v => views.includes(v)))
  ok(`view switcher offers ${views.join(', ')}`);
else fail(`view switcher offers ${views.join(', ')}`);

async function open(view, hand, webType, step = 0) {
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('ssk-glove-v1') || '{}'));
  Object.assign(st, { view, hand, webType, size: '12"', colors: COLORS, step, lang: 'en' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), ['ssk-glove-v1', JSON.stringify(st)]);
  await page.reload();
  await page.waitForFunction(v => {
    const c = document.getElementById('glove');
    return document.querySelector(`#stageview button[data-view="${v}"].is-on`) && c.width > 0;
  }, view);
  await page.waitForTimeout(400);
}

// In the page: zone masks from the view's own layers, the way the engine
// draws them, and the stage canvas read back.
const measure = (view, hand) => page.evaluate(async ([view, hand]) => {
  const D = await (await fetch(`assets/${view}-data.json`)).json();
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const c = document.getElementById('glove');
  const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const m = document.createElement('canvas');
  m.width = D.w; m.height = D.h;
  const g = m.getContext('2d', { willReadFrequently: true });
  const out = { w: c.width, h: c.height, dw: D.w, dh: D.h, zones: {} };
  for (const z of D.zones) {
    const id = hand === 'LHT' && z.id === 'embroidery' && D.embroideryLHT ? D.embroideryLHT : z.id;
    const img = await load(D.assets[id]);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, D.w, D.h);
    if (hand === 'LHT') g.setTransform(-1, 0, 0, 1, D.w, 0);
    g.drawImage(img, 0, 0);
    const a = g.getImageData(0, 0, D.w, D.h).data;
    const solid = [];
    for (let p = 0; p < D.w * D.h; p++) if (a[p * 4 + 3] > 250) solid.push(p);
    if (solid.length < 200) continue;
    const med = [0, 1, 2].map(ch => {
      const v = solid.map(p => px[p * 4 + ch]).sort((x, y) => x - y);
      return v[v.length >> 1];
    });
    // a click point well inside the zone
    const cx = solid.map(p => p % D.w), cy = solid.map(p => (p / D.w) | 0);
    const inner = solid.filter(p => {
      const x = p % D.w, y = (p / D.w) | 0;
      for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) {
        const q = (y + dy) * D.w + x + dx;
        if (a[q * 4 + 3] <= 250) return false;
      }
      return true;
    });
    const pick = inner.length ? inner[inner.length >> 1] : solid[solid.length >> 1];
    out.zones[z.id] = { field: z.field, med, at: [pick % D.w, (pick / D.w) | 0], n: solid.length };
  }
  return out;
}, [view, hand]);

const snap = () => page.evaluate(() => {
  const c = document.getElementById('glove');
  return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
});

for (const view of ['thumb', 'pinky']) {
  for (const hand of ['RHT', 'LHT']) {
    await open(view, hand, 'H-Web');
    const r = await measure(view, hand);
    if (r.w !== r.dw || r.h !== r.dh) fail(`${view} ${hand}: stage ${r.w}x${r.h}, view is ${r.dw}x${r.dh}`);
    let worst = 0, at = '';
    for (const [zid, z] of Object.entries(r.zones)) {
      const d = Math.hypot(...z.med.map((v, i) => v - rgb(hexOf(z.field, COLORS[z.field]))[i]));
      if (d > worst) { worst = d; at = zid; }
      if (d > TOLERANCE) fail(`${view} ${hand}: ${zid} shows rgb(${z.med}) for ${z.field} (${d.toFixed(1)})`);
    }
    ok(`${view} ${hand}: ${Object.keys(r.zones).length} zones in their fields' colours (worst ${at} ${worst.toFixed(1)})`);

    // clicking a zone picks its field
    let wrong = 0;
    for (const [zid, z] of Object.entries(r.zones)) {
      const box = await page.locator('#glove').boundingBox();
      await page.mouse.click(box.x + (z.at[0] + 0.5) * box.width / r.w,
                             box.y + (z.at[1] + 0.5) * box.height / r.h);
      await page.waitForTimeout(60);
      const on = await page.evaluate(() => {
        const b = document.querySelector('.part.is-on');
        return b ? b.dataset.key.split('|')[1] : null;
      });
      if (on !== z.field) { wrong++; fail(`${view} ${hand}: clicking ${zid} selected ${on}, not ${z.field}`); }
    }
    if (!wrong) ok(`${view} ${hand}: clicking each zone selects its order field`);

    // an unphotographed web: body unchanged, web hatched and explained
    await open(view, hand, 'H-Web');
    const base = await snap();
    await open(view, hand, 'Modified Trapeze-Web');
    const other = await snap();
    const hint = await page.evaluate(() => document.getElementById('stagehint').textContent);
    const D = JSON.parse(readFileSync(join(ROOT, `assets/${view}-data.json`)));
    let moved = 0;
    for (let i = 0; i < base.length; i += 4)
      if (base[i] !== other[i] || base[i + 1] !== other[i + 1] || base[i + 2] !== other[i + 2]) moved++;
    if (D.webMarker) {
      const inMark = await page.evaluate(async ([src, hand, w, h]) => {
        const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
        const m = document.createElement('canvas'); m.width = w; m.height = h;
        const g = m.getContext('2d');
        if (hand === 'LHT') g.setTransform(-1, 0, 0, 1, w, 0);
        g.drawImage(img, 0, 0);
        const a = g.getImageData(0, 0, w, h).data;
        const out = [];
        for (let p = 0; p < w * h; p++) if (a[p * 4 + 3]) out.push(p);
        return out;
      }, [D.assets[D.webMarker], hand, D.w, D.h]);
      const mark = new Set(inMark);
      let outside = 0;
      for (let i = 0; i < base.length; i += 4) {
        if (mark.has(i / 4)) continue;
        if (base[i] !== other[i] || base[i + 1] !== other[i + 1] || base[i + 2] !== other[i + 2]) outside++;
      }
      if (outside) fail(`${view} ${hand}: another web moved ${outside} px outside the web`);
      else if (!moved) fail(`${view} ${hand}: an unphotographed web is not marked`);
      else ok(`${view} ${hand}: an unphotographed web is hatched (${moved} px), the body is unchanged`);
      if (!hint.includes('H-Web')) fail(`${view} ${hand}: stage does not say the web is not photographed ("${hint}")`);
    } else {
      if (moved) fail(`${view} ${hand}: choosing a web changed ${moved} px on a side with no web`);
      else ok(`${view} ${hand}: choosing another web changes nothing on this side`);
      if (hint) fail(`${view} ${hand}: unexpected stage note "${hint}"`);
    }
  }
}

if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
server.close();
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
