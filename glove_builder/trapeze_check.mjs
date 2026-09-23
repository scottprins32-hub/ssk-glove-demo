/* Do the Trapeze and Modified Trapeze render as the webs they were cut from?

     NODE_PATH=<dir holding playwright> PW_CHROMIUM=<chrome> \
       node glove_builder/trapeze_check.mjs [--out <dir>]

   Optional, like render_check.mjs: needs node and a Playwright chromium, and
   nothing the shipped page depends on. Playwright is imported from NODE_PATH
   (ES modules ignore NODE_PATH, so it is resolved here by hand), falling back
   to the /tmp/pw install render_check.mjs uses.

   These two are lattices: most of what the customer sees is lace, and the
   rest is leather and the daylight between them. So the page is loaded the
   way a customer gets there — web type chosen, the size it is sold in, each
   hand — with the web leather and the lace in their photographed colours and
   in colours as far apart as the palette goes, and read back off the canvas:

   - the web's leather reads the web colour and its lace the lace colour,
   - every window read off the photograph is open on the page,
   - changing the web colour leaves every lace pixel alone and changing the
     lace colour leaves every leather pixel alone, so the two order-form
     questions stay two,
   - and the left-handed render is the right-handed one through the mirror.

   The measuring happens in the page. The regions are built there from the
   layers' own alpha, and only medians, counts and the region's pixels as one
   base64 string come back, so a render costs a second rather than a minute.

   Every render is also written out as a PNG (to --out, default
   /tmp/trapeze-check): the numbers say the colours landed, and only looking
   says the web looks like the photograph.  */

import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const pwFrom = (process.env.NODE_PATH ?? '').split(':').filter(Boolean)
  .map(d => join(d, 'playwright/index.mjs')).find(existsSync)
  ?? '/tmp/pw/node_modules/playwright/index.mjs';
const { chromium } = await import(pwFrom);

const HERE = new URL('./', import.meta.url).pathname;
const ROOT = join(HERE, 'customiser/');
const RUNS = join(HERE, 'runs/');
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium';
const PORT = Number(process.env.PORT ?? 8801);
const TOLERANCE = Number(process.env.TOLERANCE ?? 25);
const oi = process.argv.indexOf('--out');
const OUT = oi > 0 ? process.argv[oi + 1] : '/tmp/trapeze-check';
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const DATA = JSON.parse(readFileSync(join(ROOT, 'assets/glove-data.json')));
const { WEBS } = await import(join(ROOT, 'glove-catalog.js'));
const hexOf = code => DATA.palettes.lace.find(c => c[0] === code)[2];

let failures = 0;
const fail = msg => { console.log(`FAIL  ${msg}`); failures += 1; };

// body, web leather, lace — the photograph's own first, then contrasts
const WEB_IDS = {
  'trapeze': { id: 'Trapeze-Web', source: ['10', '10', '80'] },
  'modified-trapeze': { id: 'Modified Trapeze-Web', source: ['90', '90', 'GF'] },
};
for (const [slug, { id }] of Object.entries(WEB_IDS)) {
  const w = WEBS.find(x => x.id === id);
  if (!w || w.render !== slug) fail(`catalogue: ${id} does not render '${slug}'`);
  if (!DATA.webs[slug]) fail(`glove-data.json has no web '${slug}'`);
}

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  // the traced windows, warped onto the glove, are test evidence rather than
  // an asset, so they are served from runs/ for this check only
  const [base, rel] = url.startsWith('/__runs/') ? [RUNS, url.slice(8)] : [ROOT, url];
  const file = normalize(join(base, rel));
  if (!file.startsWith(base) || !existsSync(file)) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: EXECUTABLE });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });

const PANELS = ['back2', 'back3', 'back4', 'back5', 'back6', 'back7', 'belt',
  'lining', 'binding', 'welting', 'thumb_loops', 'pinky_loops', 'stitching',
  'ring_emb', 'palm', 'pad_color'];
const colours = (body, web, laces) => ({
  ...Object.fromEntries(PANELS.map(f => [f, body === 'GF' ? '45' : body])),
  web, laces });

async function render(slug, hand, name, [body, web, laces]) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  const w = WEBS.find(x => x.render === slug);
  await page.addInitScript(([cs, hd, wt, sz]) => {
    localStorage.setItem('ssk-glove-v1', JSON.stringify({
      lang: 'en', part: 'web', bullet: 7, colors: cs, hand: hd,
      size: sz, pad: 'None', webType: wt, thumbText: '', thumbFont: null,
      thumbMain: null, thumbOutline: null, thumbNumber: '', circle: null,
      numberColor: null, flag: null, name: '', phone: '' }));
  }, [colours(body, web, laces), hand, w.id, w.sizes[0]]);
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => [...document.querySelectorAll('canvas')]
    .some(c => c.width > 500), null, { timeout: 20000 });
  await page.waitForTimeout(600);
  const got = await page.evaluate(async ([W, H, pair, slug, mirror]) => {
    const stage = [...document.querySelectorAll('canvas')]
      .filter(c => c.width === W && c.height === H)[0];
    if (!stage) return null;
    const alphaOf = async (src) => {
      const img = new Image();
      img.src = src;
      try { await img.decode(); } catch (e) { return null; }
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      c.getContext('2d').drawImage(img, 0, 0, W, H);
      const d = c.getContext('2d').getImageData(0, 0, W, H).data;
      const a = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3];
      return a;
    };
    const web = await alphaOf(`assets/${pair.web}.webp`);
    const lace = await alphaOf(`assets/${pair.laceweb}.webp`);
    const win = await alphaOf(`__runs/web-${slug}/window_aligned.png`);
    // the index finger lies over the web's edge, so a window it covers is
    // covered by the glove in front of it, not closed by the web
    const finger = await alphaOf('assets/back3.webp');
    if (!web || !lace || !win || !finger) return { missing: true };
    const px = stage.getContext('2d').getImageData(0, 0, W, H).data;
    // regions in the right-handed layers' own coordinates; on a lefty the
    // canvas is mirrored and they are not, so the lookup mirrors back
    const at = i => {
      if (!mirror) return i * 4;
      const x = i % W, y = (i - x) / W;
      return (y * W + (W - 1 - x)) * 4;
    };
    const reg = { leather: [], lace: [], window: [] };
    for (let i = 0; i < W * H; i++) {
      if (lace[i] >= 250) reg.lace.push(i);
      else if (web[i] >= 250 && lace[i] === 0) reg.leather.push(i);
      else if (win[i] >= 200 && web[i] < 8 && lace[i] < 8 && finger[i] < 8)
        reg.window.push(i);
    }
    const lit = idx => {
      // the lit band, 70th-90th percentile of luminance, as render_check reads
      const pts = [];
      for (const i of idx) {
        const j = at(i);
        if (px[j + 3] >= 240) pts.push([px[j], px[j + 1], px[j + 2]]);
      }
      const lum = pts.map(p => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]);
      const s = [...lum].sort((a, b) => a - b);
      const lo = s[Math.floor(s.length * 0.7)], hi = s[Math.floor(s.length * 0.9)];
      const band = pts.filter((_, i) => lum[i] >= lo && lum[i] <= hi);
      const mid = ch => band.map(p => p[ch]).sort((a, b) => a - b)[band.length >> 1];
      return [mid(0), mid(1), mid(2), pts.length];
    };
    const bytes = idx => {
      let s = '';
      for (const i of idx) {
        const j = at(i);
        s += String.fromCharCode(px[j], px[j + 1], px[j + 2]);
      }
      return btoa(s);
    };
    let open = 0;
    for (const i of reg.window) if (px[at(i) + 3] < 40) open += 1;
    return {
      leather: lit(reg.leather), lace: lit(reg.lace),
      nWindow: reg.window.length, open,
      leatherBytes: bytes(reg.leather), laceBytes: bytes(reg.lace),
      png: stage.toDataURL('image/png'),
    };
  }, [DATA.w, DATA.h, DATA.webs[slug], slug, hand === 'LHT']);
  await page.close();
  if (errs.length) fail(`${slug} ${hand} ${name}: page error ${errs[0]}`);
  if (!got) { fail(`${slug} ${hand} ${name}: no stage canvas`); return null; }
  if (got.missing) { fail(`${slug}: a layer or runs/web-${slug}/window_aligned.png is missing`); return null; }
  writeFileSync(join(OUT, `${slug}_${hand}_${name.replace(/[^a-z]+/gi, '-')}.png`),
    Buffer.from(got.png.split(',')[1], 'base64'));
  return got;
}

const off = (got, hex) => Math.hypot(...[1, 3, 5].map((k, i) =>
  parseInt(hex.slice(k, k + 2), 16) - got[i]));
const hexStr = c => '#' + c.slice(0, 3).map(v => v.toString(16).padStart(2, '0'))
  .join('').toUpperCase();
const moved = (a, b) => {
  const x = Buffer.from(a, 'base64'), y = Buffer.from(b, 'base64');
  let n = 0, worst = 0;
  for (let i = 0; i < x.length; i += 3) {
    const d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]),
                       Math.abs(x[i + 2] - y[i + 2]));
    if (d) n += 1;
    worst = Math.max(worst, d);
  }
  return [n, worst, x.length / 3];
};

for (const [slug, { source }] of Object.entries(WEB_IDS)) {
  const SCENARIOS = [
    ['photographed colours', source],
    ['red web, yellow lace, white body', ['10', '32', '45']],
    ['royal web, white lace, black body', ['90', '60', '10']],
    ['white web, black lace, navy body', ['70', '10', '90']],
    ['web colour only changed', ['10', '50', '45']],
    ['lace colour only changed', ['10', '32', '80']],
  ];
  const seen = {};
  for (const hand of ['RHT', 'LHT']) {
    console.log(`\n${slug}, ${hand}`);
    for (const [name, cs] of SCENARIOS) {
      const r = await render(slug, hand, name, cs);
      if (!r || r.missing) continue;
      seen[`${hand}:${name}`] = r;
      const dl = off(r.leather, hexOf(cs[1])), dc = off(r.lace, hexOf(cs[2]));
      const open = r.open / Math.max(r.nWindow, 1);
      const ok = dl <= TOLERANCE && dc <= TOLERANCE && open >= 0.97;
      if (!ok) failures += 1;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(34)} leather ${hexStr(r.leather)}`
        + ` vs ${hexOf(cs[1])} (${dl.toFixed(1)}), lace ${hexStr(r.lace)} vs`
        + ` ${hexOf(cs[2])} (${dc.toFixed(1)}), windows ${(100 * open).toFixed(1)}%`
        + ` open of ${r.nWindow} px`);
    }
    // one control at a time: the other part must not move by a single level
    const base = seen[`${hand}:${SCENARIOS[1][0]}`];
    for (const [other, keep, label] of [
      [SCENARIOS[4][0], 'laceBytes', 'web colour changed, lace'],
      [SCENARIOS[5][0], 'leatherBytes', 'lace colour changed, leather']]) {
      const o = seen[`${hand}:${other}`];
      if (!base || !o) continue;
      const [n, worst, total] = moved(base[keep], o[keep]);
      const ok = n === 0;
      if (!ok) failures += 1;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label} pixels unchanged:`
        + ` ${total - n} of ${total}` + (n ? `, worst ${worst} levels` : ''));
    }
  }
  // the lefty is the righty through the mirror, pixel for pixel on the web
  for (const [name] of SCENARIOS.slice(0, 2)) {
    const a = seen[`RHT:${name}`], b = seen[`LHT:${name}`];
    if (!a || !b) continue;
    const [n1, w1, t1] = moved(a.leatherBytes, b.leatherBytes);
    const [n2, w2, t2] = moved(a.laceBytes, b.laceBytes);
    const worst = Math.max(w1, w2);
    const ok = worst <= 4;
    if (!ok) failures += 1;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}: left hand mirrors right on`
      + ` ${t1 + t2} web px, worst channel difference ${worst}`);
  }
}

await browser.close();
server.close();
console.log(`\nrenders in ${OUT}`);
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
