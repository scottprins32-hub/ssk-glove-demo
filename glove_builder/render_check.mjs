/* Does the glove come out the colour the customer picked?

     node glove_builder/render_check.mjs

   Optional: needs node and a Playwright chromium (PW_CHROMIUM, or the usual
   /opt/pw-browsers/chromium). Nothing the shipped page depends on.

   Every other check in this repo reads the assets. This one reads the
   RENDER, because the defect it exists for was invisible in the assets: the
   engine adds a highlight layer on top of the tint, each highlight was cut
   from one photograph, and unscaled they disagreed by a factor of seven. One
   colour went in and several came out — picking Navy everywhere produced a
   navy glove with a #615C60 grey belt. No file was wrong; the composite was.

   So: paint the whole glove one colour, then read each zone back off the
   canvas through idmap.png and compare it with the hex that zone was given.
   A zone is allowed the sheen the renderer adds on purpose (about 8 per
   channel, ~14 in distance) and not much more.  */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { chromium } from '/tmp/pw/node_modules/playwright/index.mjs';

const ROOT = new URL('./customiser/', import.meta.url).pathname;
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium';
const PORT = Number(process.env.PORT ?? 8791);
const TOLERANCE = Number(process.env.TOLERANCE ?? 25);
const MIME = { '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

const DATA = JSON.parse(readFileSync(join(ROOT, 'assets/glove-data.json')));
const FIELD_TO_LAYER = {
  web: 'web', back2: 'back2', back3: 'back3', back4: 'back4', back5: 'back5',
  back6: 'back6', back7: 'back78', belt: 'belt', lining: 'lining',
  binding: 'binding', welting: 'welting', laces: 'laces',
  thumb_loops: 'thumb_loops', pinky_loops: 'pinky_loops',
  stitching: 'stitching', ring_emb: 'embroidery' };
const LAYER_TO_FIELD = Object.fromEntries(
  Object.entries(FIELD_TO_LAYER).map(([f, l]) => [l, f]));

const server = createServer((req, res) => {
  const file = normalize(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });

/* One colour everywhere is the honest test: any difference the render shows
   is the render's, not the customer's. */
const everything = (code, overrides = {}) => {
  const out = {};
  for (const f of Object.keys(FIELD_TO_LAYER)) out[f] = code;
  return { ...out, palm: code, pad_color: code, ...overrides };
};

const SCENARIOS = [
  ['all Navy', everything('70')],
  ['all White', everything('10')],
  ['all Black', everything('90')],
  ['Navy body, Columbia trim', everything('70', {
    web: '65', binding: '65', welting: '65', laces: '65',
    thumb_loops: '65', pinky_loops: '65' })],
];

let failures = 0;
for (const [name, colors] of SCENARIOS) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(cs => {
    localStorage.setItem('ssk-glove-v1', JSON.stringify({
      lang: 'nl', part: 'web', bullet: 7, colors: cs, hand: 'RHT',
      size: '11.75', pad: 'No', webType: null, thumbText: '', thumbFont: null,
      thumbMain: null, thumbOutline: null, thumbNumber: '', circle: null,
      numberColor: null, flag: null, name: '', phone: '' }));
  }, colors);
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => [...document.querySelectorAll('canvas')]
    .some(c => c.width > 500), null, { timeout: 20000 });
  await page.waitForTimeout(800);

  const read = await page.evaluate(async ([w, h, zones]) => {
    const stage = [...document.querySelectorAll('canvas')]
      .filter(c => c.width === w && c.height === h)
      .sort((a, b) => b.width - a.width)[0];
    if (!stage) return null;
    const px = stage.getContext('2d').getImageData(0, 0, w, h).data;

    const alphaOf = async (src) => {
      const img = new Image();
      img.src = src;
      try { await img.decode(); } catch (e) { return null; }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.getContext('2d').getImageData(0, 0, w, h).data;
    };
    const ids = await alphaOf('assets/idmap.png');
    if (!ids) return null;

    const out = {};
    for (const z of zones) {
      // idmap alone is a CLICK map: on the embroidery it fills the gaps
      // between the letters, so it reads back the panel behind the mark
      // rather than the mark. The zone is where the map and the layer's own
      // alpha agree, and which is still visible on the finished canvas.
      const own = await alphaOf(`assets/${z.id}.webp`);
      const pts = [];
      for (let i = 0; i < w * h; i++) {
        if (px[i * 4 + 3] < 240) continue;
        if (ids[i * 4] !== z.n) continue;
        if (own && own[i * 4 + 3] < 200) continue;
        pts.push([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]);
      }
      if (pts.length < 400) continue;
      // The lit band, 70th-90th percentile of luminance: the same band a
      // leather is read with off a photograph.
      const lum = pts.map(p => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]);
      const sorted = [...lum].sort((a, b) => a - b);
      const lo = sorted[Math.floor(sorted.length * 0.70)];
      const hi = sorted[Math.floor(sorted.length * 0.90)];
      const band = pts.filter((_, i) => lum[i] >= lo && lum[i] <= hi);
      const mid = ch => {
        const v = band.map(p => p[ch]).sort((a, b) => a - b);
        return v[Math.floor(v.length / 2)];
      };
      out[z.n] = [mid(0), mid(1), mid(2), pts.length];
    }
    return out;
  }, [DATA.w, DATA.h, DATA.zones.map(z => ({ id: z.id, n: z.n }))]);

  if (errs.length) {
    console.log(`FAIL  ${name} — page error: ${errs[0]}`);
    failures += 1;
  }
  if (!read) {
    console.log(`FAIL  ${name} — no stage canvas`);
    failures += 1;
    await page.close();
    continue;
  }

  console.log(`\n${name}`);
  for (const z of DATA.zones) {
    const got = read[z.n];
    if (!got) continue;
    const field = LAYER_TO_FIELD[z.id] ?? z.id;
    const code = colors[field];
    const entry = DATA.palettes[z.group].find(c => c[0] === code);
    if (!entry) continue;
    const want = [1, 3, 5].map(i => parseInt(entry[2].slice(i, i + 2), 16));
    const off = Math.hypot(...want.map((v, i) => v - got[i]));
    const hex = '#' + got.slice(0, 3)
      .map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    const ok = off <= TOLERANCE;
    if (!ok) failures += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${z.id.padEnd(12)} chose ${entry[2]}`
      + ` reads ${hex}  off by ${off.toFixed(1)}  (${got[3]} px)`);
  }
  await page.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} zone(s) outside ${TOLERANCE}` : '\nall zones render the colour they were given');
process.exit(failures ? 1 : 0);
