/* Does the form's embroidered text land on the glove the way it is ordered?

     NODE_PATH=<dir holding playwright> PW_CHROMIUM=<chrome> \
       node glove_builder/embroidery_check.mjs

   Serves customiser/, loads it with an order in localStorage and reads the
   stage back, for the pinky text on the pinky side and the thumb text on
   the thumb side, in both hands:

   - the text changes pixels only on the panel it is stitched on,
   - those pixels carry the main thread's colour, and the outline thread's
     when an outline font is chosen,
   - on the left hand the text sits at the mirrored place but is not the
     mirror image (it reads the right way), and
   - a Kanji font draws nothing and the stage says why.

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
const PORT = Number(process.env.PORT ?? 8835);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
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
const embHex = code => DATA.palettes.embroidery.find(c => c[0] === code)[2];
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const MAIN = '45', OUTLINE = '20';         // yellow tan thread, cardinal outline
const COLORS = { web: '70', back1: '70', back2: '20', back3: '70', back4: '70',
  back5: '70', back6: '70', back7: '70', back8: '70', back9: '70', palm: '70',
  belt: '20', binding: '10', welting: '10', laces: '10', stitching: '10',
  ring_emb: '10', lining: '70', thumb_loops: '10', pinky_loops: '10' };

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM
  ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${PORT}/index.html`);
await page.waitForFunction(() => document.querySelectorAll('#stageview button').length > 0);

async function open(view, hand, extra) {
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('ssk-glove-v1') || '{}'));
  Object.assign(st, { view, hand, webType: 'H-Web', size: '12"', colors: COLORS, step: 5,
    lang: 'en', thumbText: '', pinkyText: '', thumbFont: 'Script', thumbMain: MAIN,
    thumbOutline: OUTLINE }, extra);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), ['ssk-glove-v1', JSON.stringify(st)]);
  await page.reload();
  await page.waitForFunction(v =>
    document.querySelector(`#stageview button[data-view="${v}"].is-on`), view);
  await page.waitForFunction(() => document.fonts.check('400 40px "Yellowtail"')
    && document.fonts.check('700 40px "Barlow Condensed"'));
  await page.waitForTimeout(500);
}
const snap = () => page.evaluate(() => {
  const c = document.getElementById('glove');
  return { w: c.width, h: c.height,
           px: Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data) };
});
const panelMask = (view, zone, hand) => page.evaluate(async ([view, zone, hand]) => {
  const D = await (await fetch(`assets/${view}-data.json`)).json();
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = D.assets[zone]; });
  const m = document.createElement('canvas'); m.width = D.w; m.height = D.h;
  const g = m.getContext('2d');
  if (hand === 'LHT') g.setTransform(-1, 0, 0, 1, D.w, 0);
  g.drawImage(img, 0, 0);
  const a = g.getImageData(0, 0, D.w, D.h).data;
  const out = new Array(D.w * D.h);
  for (let p = 0; p < out.length; p++) out[p] = a[p * 4 + 3] > 0 ? 1 : 0;
  return out;
}, [view, zone, hand]);

const moved = (a, b) => {
  const out = [];
  for (let i = 0; i < a.px.length; i += 4)
    if (Math.abs(a.px[i] - b.px[i]) + Math.abs(a.px[i + 1] - b.px[i + 1])
        + Math.abs(a.px[i + 2] - b.px[i + 2]) > 24) out.push(i / 4);
  return out;
};
const near = (s, idx, hex, tol) => {
  const want = rgb(hex);
  let n = 0;
  for (const p of idx) {
    const d = Math.hypot(s.px[p * 4] - want[0], s.px[p * 4 + 1] - want[1], s.px[p * 4 + 2] - want[2]);
    if (d <= tol) n++;
  }
  return n / Math.max(idx.length, 1);
};
const centroid = (idx, w) => {
  let sx = 0, sy = 0;
  for (const p of idx) { sx += p % w; sy += (p / w) | 0; }
  return [sx / idx.length, sy / idx.length];
};

const checked = await page.evaluate(() => document.fonts.check('400 40px "Yellowtail"')
  && document.fonts.check('400 40px "Kaushan Script"') && document.fonts.check('700 40px "Barlow Condensed"'));
if (checked) ok('the three embroidery faces are loaded'); else fail('an embroidery face did not load');

for (const view of ['pinky', 'thumb']) {
  const D = JSON.parse(readFileSync(join(ROOT, `assets/${view}-data.json`)));
  const M = D.textMount;
  if (!M) { fail(`${view}: no textMount in its data`); continue; }
  const field = M.field, text = 'Scott Prins';
  const runs = {};
  for (const hand of ['RHT', 'LHT']) {
    console.log(`\n${view}, ${hand}: ${field} on ${M.zone}`);
    await open(view, hand, {});
    const base = await snap();
    await open(view, hand, { [field]: text });
    const withText = await snap();
    const idx = moved(base, withText);
    const mask = await panelMask(view, M.zone, hand);
    const outside = idx.filter(p => !mask[p]).length;
    if (idx.length < 800) fail(`${hand}: text moved only ${idx.length} px`);
    else if (outside) fail(`${hand}: ${outside} of ${idx.length} text px lie off ${M.zone}`);
    else ok(`${hand}: text changes ${idx.length} px, all on ${M.zone}`);
    const f = near(withText, idx, embHex(MAIN), 70);
    if (f < 0.4) fail(`${hand}: only ${(100 * f).toFixed(0)}% of the text is near the main thread ${embHex(MAIN)}`);
    else ok(`${hand}: ${(100 * f).toFixed(0)}% of the text carries the main thread's colour`);
    runs[hand] = { idx, snap: withText, w: withText.w };

    await open(view, hand, { [field]: text, thumbFont: 'Script with Outline' });
    const outlined = await snap();
    const idxO = moved(base, outlined);
    const fo = near(outlined, idxO, embHex(OUTLINE), 70);
    if (fo < 0.12) fail(`${hand}: only ${(100 * fo).toFixed(0)}% of the outlined text is near the outline thread`);
    else ok(`${hand}: an outline font adds the outline thread (${(100 * fo).toFixed(0)}% of its pixels)`);

    await open(view, hand, { [field]: text, thumbFont: 'Kanji' });
    const kanji = await snap();
    const hint = await page.evaluate(() => document.getElementById('stagehint').textContent);
    const nk = moved(base, kanji).length;
    if (nk) fail(`${hand}: a Kanji font drew ${nk} px`);
    else if (!/Kanji/.test(hint)) fail(`${hand}: Kanji is not drawn but the stage does not say so`);
    else ok('Kanji draws nothing and the stage says why');
  }
  // The left hand: the same place, mirrored. The lettering is re-laid rather
  // than mirrored (it reads the other way along the same line), so the ink's
  // centre can sit a little from where a mirror image would put it: along
  // the line by twice the ink's own offset from the run's centre, across it
  // by at most a cap height. A text in the wrong place would be off by its
  // own length.
  const R = runs.RHT, L = runs.LHT, w = R.w;
  const cr = centroid(R.idx, w), cl = centroid(L.idx, w);
  const ux = -M.ux, uy = M.uy;                     // "up" on the left hand
  const diff = [cl[0] - (w - 1 - cr[0]), cl[1] - cr[1]];
  const along = Math.abs(diff[0] * -uy + diff[1] * ux);
  const across = Math.abs(diff[0] * ux + diff[1] * uy);
  if (along > 0.06 * M.length || across > M.height) fail(`${view}: left-hand text sits ${along.toFixed(1)} px along and ${across.toFixed(1)} px across its line from the mirrored place`);
  else ok(`${view}: left-hand text sits at the mirrored place (${along.toFixed(1)} px along its line, ${across.toFixed(1)} across)`);
  let differ = 0;
  for (const p of L.idx) {
    const x = p % w, y = (p / w) | 0, q = y * w + (w - 1 - x);
    const d = Math.abs(L.snap.px[p * 4] - R.snap.px[q * 4]) + Math.abs(L.snap.px[p * 4 + 1] - R.snap.px[q * 4 + 1])
      + Math.abs(L.snap.px[p * 4 + 2] - R.snap.px[q * 4 + 2]);
    if (d > 60) differ++;
  }
  const fd = differ / Math.max(L.idx.length, 1);
  if (fd < 0.15) fail(`${view}: left-hand text is the mirror image of the right (${(100 * fd).toFixed(0)}% differ)`);
  else ok(`${view}: left-hand text is re-laid, not mirrored (${(100 * fd).toFixed(0)}% of its pixels differ from the mirror)`);
}

if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
server.close();
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
