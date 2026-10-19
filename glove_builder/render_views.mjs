// Render every view of the current builder with each part in its own colour.
//   NODE_PATH=<dir holding playwright> node glove_builder/render_views.mjs [outdir]
// Serves customiser/ itself, sets the draft through local storage the way a
// returning customer's draft is restored, and saves the stage canvas per view.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, 'customiser');
const OUT = path.resolve(process.argv[2] || path.join(HERE, 'runs/view-tracer'));
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { console.error('playwright not found: set NODE_PATH'); process.exit(3); }

// One colour per order field, chosen to be told apart at a glance. Palm and
// Back 2 are one leather (Back 2 always follows the palm).
export const COLORS = {
  palm: '10', back2: '10', web: '50', back1: '80', back3: '60', back4: '32', back5: '37',
  back6: '52', back7: '49', back8: '46', back9: '35', belt: '90', lining: '93',
  binding: '75', welting: '25', laces: '12', thumb_loops: '12', pinky_loops: '12',
  stitching: '90', ring_emb: '39'
};
const VIEWS = ['back', 'palm', 'thumb', 'pinky'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
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
for (const view of VIEWS) {
  await page.evaluate(([colors, view]) => localStorage.setItem('ssk-glove-v1', JSON.stringify(
    { schemaVersion: 1, lang: 'nl', step: 2, colors, hand: 'RHT', size: '11.75"', webType: null, view, bullet: null })), [COLORS, view]);
  await page.reload();
  await page.waitForFunction(() => { const c = document.getElementById('glove'); return c && c.width > 0; });
  await page.waitForTimeout(3500);
  const shot = await page.evaluate(() => { const c = document.getElementById('glove'); return [c.width, c.height, c.toDataURL('image/png')]; });
  fs.writeFileSync(path.join(OUT, `${view}.png`), Buffer.from(shot[2].split(',')[1], 'base64'));
  console.log(`  ${view} ${shot[0]}x${shot[1]}`);
}
fs.writeFileSync(path.join(OUT, 'colors.json'), JSON.stringify(COLORS, null, 1));
await browser.close(); server.close();
if (errors.length) { console.error(errors); process.exit(1); }
