// The starter cards, drawn once here instead of ten times on every first
// visit. Each starter is rendered by the real page, both hands, and saved
// half size under customiser/assets/starters with a manifest that names the
// data it was drawn from; the page uses the pictures only while that key
// still matches, and draws live otherwise.
//
//   NODE_PATH=<dir holding playwright> node glove_builder/render_starters.mjs
//
// Run it after anything that changes how a starter looks: a colourway, a
// badge, a flag, the back-view assets or the material pipeline.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, 'customiser');
const OUT = path.join(ROOT, 'assets/starters');
const WIDTH = 464;   // the card is ~200 css px wide; this covers 2x screens
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { console.error('SKIP: playwright not found (set NODE_PATH)'); process.exit(3); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname.split('?')[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => document.getElementById('glove')?.classList.contains('is-ready'));
// The same key the page computes (app.js starterKey): what a starter's
// picture depends on, as the page sees it.
const { key, ids } = await page.evaluate(async () => {
  const { STARTERS } = await import('./glove-catalog.js');
  return { key: window.__SSK_STARTER_KEY__, ids: STARTERS.map(s => s.id) };
});
if (!key) throw new Error('the page did not publish __SSK_STARTER_KEY__');
const manifest = { key, width: WIDTH, hands: { RHT: [], LHT: [] } };
for (const hand of ['RHT', 'LHT']) {
  for (const id of ids) {
    await page.evaluate(([id, hand]) => {
      const o = JSON.parse(localStorage.getItem('ssk-glove-v1') || '{}');
      Object.assign(o, { step: 0, view: 'back', hand, startId: id, webType: 'H-Web', pad: 'None' });
      localStorage.setItem('ssk-glove-v1', JSON.stringify(o));
    }, [id, hand]);
    await page.reload();
    await page.waitForFunction(() => document.getElementById('glove')?.classList.contains('is-ready'));
    await page.evaluate(id => document.querySelector(`[data-key="starter|${id}"]`)?.click(), id);
    // flags decode after the first frame; wait for the page to say so
    await page.waitForFunction(() => !document.getElementById('glove').hasAttribute('aria-busy'));
    await page.waitForTimeout(900);
    const data = await page.evaluate(w => {
      const c = document.getElementById('glove'), s = document.createElement('canvas');
      s.width = w; s.height = Math.round(c.height * w / c.width);
      s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
      return s.toDataURL('image/webp', 0.86);
    }, WIDTH);
    fs.writeFileSync(path.join(OUT, `${id.replace(/[^A-Za-z0-9_-]+/g, '_')}-${hand}.webp`), Buffer.from(data.split(',')[1], 'base64'));
    manifest.hands[hand].push(id);
    // The glove a first visitor sees: the blank starter, right-handed, full
    // size, so the first frame is a picture and not a render.
    if (id === 'blank' && hand === 'RHT') {
      const full = await page.evaluate(() => document.getElementById('glove').toDataURL('image/webp', 0.9));
      fs.writeFileSync(path.join(OUT, 'default-back.webp'), Buffer.from(full.split(',')[1], 'base64'));
      manifest.defaultBack = 'default-back.webp';
    }
    console.log(`  ${hand} ${id}`);
  }
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
await browser.close(); server.close();
const bytes = fs.readdirSync(OUT).reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`wrote ${OUT.replace(HERE + path.sep, '')}: ${ids.length * 2} pictures, ${(bytes / 1024).toFixed(0)} KB, key ${key}`);
if (errors.length) { console.error('page errors:', errors); process.exit(1); }
