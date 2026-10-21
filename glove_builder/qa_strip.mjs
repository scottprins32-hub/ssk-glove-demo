// One design, four sides, one picture — and the same for the previous build,
// side by side, so a regression in a web, a trim or a view shows up as a pair
// of images that differ, not as a customer's complaint.
//
//   NODE_PATH=<dir holding playwright> node glove_builder/qa_strip.mjs [design...] [--out DIR] [--base DIR]
//
// A design is a design link (…#…), a reference code (SSK4-…), or one of the
// starter ids (blank, pro, nl, jp …). With none given, every starter runs.
// --out defaults to glove_builder/runs/qa-strip/<git short sha>; --base is an
// earlier run to put beside it. Exit 1 when any view failed to render.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, 'customiser');
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); }
catch { console.error('SKIP: playwright not found (set NODE_PATH)'); process.exit(3); }

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); if (i < 0) return dflt; const v = args[i + 1]; args.splice(i, 2); return v; };
const sha = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: HERE, encoding: 'utf8' }).trim(); } catch { return 'work'; } })();
const OUT = path.resolve(opt('--out', path.join(HERE, 'runs/qa-strip', sha)));
const BASE = opt('--base', null) && path.resolve(opt('--base', null) || '');
const VIEWS = ['back', 'palm', 'thumb', 'pinky'];
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
const starters = await page.evaluate(async () => (await import('./glove-catalog.js')).STARTERS.map(s => s.id));
const designs = args.length ? args : starters;
let failed = 0;
const manifest = [];
for (const design of designs) {
  const name = design.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40);
  if (design.includes('#')) { await page.goto(url.replace('index.html', '') + design.slice(design.indexOf('#'))); }
  else {
    await page.goto(url);
    await page.waitForFunction(() => document.getElementById('glove')?.classList.contains('is-ready'));
    if (starters.includes(design)) await page.evaluate(id => document.querySelector(`[data-key="starter|${id}"]`)?.click(), design);
    else {
      await page.evaluate(() => void 0);
      await page.fill('.hero-open input', design);
      await page.click('.hero-open .btn');
    }
  }
  await page.waitForTimeout(800);
  const views = [];
  for (const view of VIEWS) {
    const ok = await page.evaluate(v => { const b = document.querySelector(`#stageview button[data-view="${v}"]`); if (!b || b.hidden) return false; b.click(); return true; }, view);
    if (!ok) { views.push(null); continue; }
    try {
      await page.waitForFunction(() => { const c = document.getElementById('glove'); return c && !c.hasAttribute('aria-busy'); }, null, { timeout: 20000 });
      await page.waitForTimeout(700);
      const data = await page.evaluate(() => document.getElementById('glove').toDataURL('image/png'));
      const file = path.join(OUT, `${name}-${view}.png`);
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      views.push(file);
    } catch (e) { views.push(null); failed++; console.error(`  ${design} ${view}: ${e.message.split('\n')[0]}`); }
  }
  const code = await page.evaluate(() => document.getElementById('refcode').textContent);
  manifest.push({ design, code, views: views.map(v => v && path.basename(v)) });
  console.log(`  ${design.padEnd(24)} ${code}  ${views.filter(Boolean).length}/${VIEWS.length} views`);
}
await browser.close(); server.close();
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ sha, when: new Date().toISOString(), designs: manifest }, null, 1));

// One HTML sheet: each design a row, four views across, the base build's
// picture under each where there is one.
const cell = (dir, f) => f && fs.existsSync(path.join(dir, f)) ? `<img src="${path.relative(OUT, path.join(dir, f))}" loading="lazy">` : '<div class="none">—</div>';
const rows = manifest.map(m => `<tr><th>${m.design}<br><code>${m.code}</code></th>${m.views.map((f, i) =>
  `<td><small>${VIEWS[i]}</small>${cell(OUT, f)}${BASE ? `<small>base</small>${cell(BASE, f)}` : ''}</td>`).join('')}</tr>`).join('');
fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>QA strip ${sha}</title>
<style>body{font:13px system-ui;margin:16px;background:#f4f4f4}table{border-collapse:collapse}th,td{vertical-align:top;padding:6px;border-bottom:1px solid #ddd;text-align:left}
img{display:block;width:180px;background:#aaa;border-radius:4px}small{display:block;color:#666;font:10px ui-monospace,monospace;text-transform:uppercase;margin:4px 0 2px}.none{width:180px;height:200px;display:grid;place-items:center;color:#999;background:#e8e8e8;border-radius:4px}code{font-size:10px}</style>
<h1>QA strip · ${sha}${BASE ? ` vs ${path.basename(BASE)}` : ''}</h1><p>${manifest.length} designs · ${new Date().toLocaleString()}</p><table>${rows}</table>`);
console.log(`wrote ${path.relative(process.cwd(), OUT)}/index.html${failed ? ` — ${failed} view(s) failed` : ''}`);
if (errors.length) console.error('page errors:', errors);
process.exit(failed || errors.length ? 1 : 0);
