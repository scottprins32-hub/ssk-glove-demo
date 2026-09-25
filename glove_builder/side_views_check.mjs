/* Do the thumb-side and pinky-side views render the order they are given?

     NODE_PATH=<dir holding playwright> PW_CHROMIUM=<chrome> \
       node glove_builder/side_views_check.mjs [--out <dir>]

   Loads side_views/index.html the way a visitor would, drives it through
   window.__side, and reads the canvas back:

   - every zone renders its order field's colour (median within TOLERANCE),
   - changing one field changes that field's pixels and no others,
   - the left-handed render is the right-handed one through the mirror
     (except inside the embroidery's letters, which flip on their own),
   - the glove body is the same whichever web is chosen, and a web the view
     has no photograph of is marked as such, never shown as done.

   Exit 0 when all pass, 1 on a failure, 3 when Playwright is unavailable (a
   skip is not a pass). Renders are written to --out for looking at: the
   numbers say the colours landed; only looking says it looks right. */

import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
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

const HERE = new URL('./', import.meta.url).pathname;
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium';
const PORT = Number(process.env.PORT ?? 8833);
const TOLERANCE = Number(process.env.TOLERANCE ?? 25);
const oi = process.argv.indexOf('--out');
const OUT = oi > 0 ? process.argv[oi + 1] : '/tmp/side-views-check';
mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\/+/, '');
  const file = join(HERE, path);
  if (!file.startsWith(HERE) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT);

let failures = 0;
const fail = msg => { console.log(`FAIL  ${msg}`); failures += 1; };
const ok = msg => console.log(`ok    ${msg}`);

// two orders far apart in every field
const A = { web: '70', back1: '20', back2: '35', back3: '60', back4: '90',
  back5: '45', back6: '10', back7: '43', back8: '50', back9: '25', palm: '12',
  belt: '48', binding: '10', welting: '90', laces: '45', stitching: '20',
  ring_emb: '10', lining: '35' };
const B = { web: '10', back1: '70', back2: '90', back3: '20', back4: '10',
  back5: '70', back6: '90', back7: '10', back8: '20', back9: '90', palm: '90',
  belt: '10', binding: '90', welting: '10', laces: '90', stitching: '10',
  ring_emb: '90', lining: '60' };

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${PORT}/side_views/index.html`);
await page.waitForFunction(() => window.__side, null, { timeout: 20000 });

// Everything is measured in the page; only counts and medians come back.
await page.evaluate(() => {
  const snaps = {}, masks = {};
  const maskOf = (view, hand) => {
    const key = view + hand;
    if (masks[key]) return masks[key];
    const v = window.__side.views[view], D = v.DATA;
    const m = document.createElement('canvas');
    m.width = D.w; m.height = D.h;
    const g = m.getContext('2d', { willReadFrequently: true });
    const zones = {};
    for (const z of D.zones) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, D.w, D.h);
      // the left hand's lettering is its own asset (side-views.js)
      const img = hand === 'LHT' && z.id === 'embroidery' && D.embroideryLHT
        ? v.imgs[D.embroideryLHT] : v.imgs[z.id];
      if (hand === 'LHT') g.setTransform(-1, 0, 0, 1, D.w, 0);
      g.drawImage(img, 0, 0);
      const a = g.getImageData(0, 0, D.w, D.h).data;
      const any = new Uint8Array(D.w * D.h), solid = [];
      for (let p = 0; p < any.length; p++) {
        const al = a[p * 4 + 3];
        if (al > 0) any[p] = 1;
        if (al > 250) solid.push(p);
      }
      zones[z.id] = { field: z.field, any, solid };
    }
    return (masks[key] = { w: D.w, h: D.h, zones, embParts: D.embParts || [] });
  };
  window.__chk = {
    snap(key, view, hand, colors, webType) {
      window.__side.set({ view, hand, webType, colors });
      const c = document.getElementById('glove');
      snaps[key] = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const M = maskOf(view, hand);
      return { w: M.w, h: M.h, warn: !document.getElementById('webWarn').hidden,
               zones: Object.fromEntries(Object.entries(M.zones)
                 .map(([id, z]) => [id, { field: z.field, solid: z.solid.length }])) };
    },
    medians(key, view, hand) {
      // outside the badge, which lies over the belt and is not the belt
      const px = snaps[key], out = {}, M = maskOf(view, hand);
      const bb = window.__side.views[view].DATA.bulletBox;
      const inBadge = p => {
        if (!bb) return false;
        let x = p % M.w; const y = (p / M.w) | 0;
        if (hand === 'LHT') x = M.w - 1 - x;
        return x >= bb[0] && x < bb[2] && y >= bb[1] && y < bb[3];
      };
      for (const [id, z] of Object.entries(M.zones)) {
        const solid = z.solid.filter(p => !inBadge(p));
        if (solid.length < 200) continue;
        out[id] = [0, 1, 2].map(ch => {
          const v = solid.map(p => px[p * 4 + ch]).sort((a, b) => a - b);
          return v[v.length >> 1];
        });
      }
      return out;
    },
    moved(k1, k2, view, hand, field) {
      const a = snaps[k1], b = snaps[k2], M = maskOf(view, hand);
      const inside = new Uint8Array(M.w * M.h);
      for (const z of Object.values(M.zones)) {
        if (z.field !== field) continue;
        for (let p = 0; p < inside.length; p++) if (z.any[p]) inside[p] = 1;
      }
      let moved = 0, outside = 0;
      for (let p = 0; p < inside.length; p++) {
        const i = p * 4;
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
          moved++;
          if (!inside[p]) outside++;
        }
      }
      return { moved, outside };
    },
    // pixels that moved outside the web and its lacing (the web marker)
    webMoved(k1, k2, view, hand) {
      const a = snaps[k1], b = snaps[k2], v = window.__side.views[view], D = v.DATA;
      const inside = new Uint8Array(D.w * D.h);
      if (D.webMarker) {
        const m = document.createElement('canvas');
        m.width = D.w; m.height = D.h;
        const g = m.getContext('2d', { willReadFrequently: true });
        if (hand === 'LHT') g.setTransform(-1, 0, 0, 1, D.w, 0);
        g.drawImage(v.imgs[D.webMarker], 0, 0);
        const al = g.getImageData(0, 0, D.w, D.h).data;
        for (let p = 0; p < inside.length; p++) if (al[p * 4 + 3]) inside[p] = 1;
      }
      let outside = 0;
      for (let p = 0; p < inside.length; p++) {
        const i = p * 4;
        if ((a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) && !inside[p]) outside++;
      }
      return { outside };
    },
    mirror(kr, kl, view) {
      // outside the lettering and the badge, which read the right way in
      // both hands rather than being mirrored
      const r = snaps[kr], l = snaps[kl], R = maskOf(view, 'RHT'), L = maskOf(view, 'LHT');
      const W = R.w, letters = new Uint8Array(W * R.h);
      const bb = window.__side.views[view].DATA.bulletBox;
      if (bb) {
        for (let y = bb[1]; y < bb[3]; y++) for (let x = bb[0]; x < bb[2]; x++) {
          letters[y * W + x] = 1; letters[y * W + (W - 1 - x)] = 1;
        }
      }
      for (const M of [R, L]) {
        const e = M.zones.embroidery;
        if (!e) continue;
        for (let p = 0; p < letters.length; p++) if (e.any[p]) {
          const y = Math.floor(p / W), x = p % W;
          letters[p] = 1; letters[y * W + (W - 1 - x)] = 1;
        }
      }
      let n = 0, worst = 0;
      for (let y = 0; y < R.h; y++) for (let x = 0; x < W; x++) {
        if (letters[y * W + x]) continue;
        const i = (y * W + x) * 4, j = (y * W + (W - 1 - x)) * 4;
        let d = 0;
        for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(r[i + c] - l[j + c]));
        if (d > 2) n++;
        if (d > worst) worst = d;
      }
      return { n, worst };
    },
  };
});
// which views carry a web marker (read from their data files)
const window_marker = Object.fromEntries(['thumb', 'pinky', 'heel'].map(v => {
  const f = join(HERE, `customiser/assets/${v}-data.json`);
  return [v, existsSync(f) && !!JSON.parse(readFileSync(f)).webMarker];
}));
const snap = (key, view, hand, colors, webType = 'H-Web') =>
  page.evaluate(a => window.__chk.snap(...a), [key, view, hand, colors, webType]);
const call = (fn, ...args) => page.evaluate(([fn, args]) => window.__chk[fn](...args), [fn, args]);

const palettes = JSON.parse(readFileSync(join(HERE, 'customiser/assets/glove-data.json'))).palettes;
const PAL = { stitching: 'stitching', ring_emb: 'embroidery', binding: 'lace', welting: 'lace', laces: 'lace' };
const hexOf = (field, code) => {
  const c = palettes[PAL[field] ?? 'leather'].find(e => e[0] === code);
  return c && c[2];
};
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

for (const view of ['thumb', 'pinky', 'heel']) {
  for (const hand of ['RHT', 'LHT']) {
    console.log(`\n${view}, ${hand}`);
    for (const [name, order] of [['order A', A], ['order B', B]]) {
      const r = await snap('o', view, hand, order);
      const med = await call('medians', 'o', view, hand);
      let worst = 0, worstZone = '';
      const DV = JSON.parse(readFileSync(join(HERE, `customiser/assets/${view}-data.json`)));
      for (const [zid, got] of Object.entries(med)) {
        const f = r.zones[zid].field;
        // a cavity (the lining) is held darker than its swatch on purpose
        const depth = DV.cavity && DV.cavity[zid];
        const want = rgb(hexOf(f, order[f])).map(v => depth ? v * (1 - depth) : v);
        const d = Math.hypot(...got.map((g, i) => g - want[i])) * (depth ? 0.5 : 1);
        if (d > worst) { worst = d; worstZone = zid; }
        if (d > TOLERANCE) fail(`${view} ${hand} ${name}: ${zid} renders rgb(${got}) ` +
          `for ${f}=${order[f]} ${hexOf(f, order[f])} (${d.toFixed(1)})`);
      }
      ok(`${name}: ${Object.keys(med).length} zones, worst ${worstZone} at ${worst.toFixed(1)} from its field's swatch`);
    }
    const base = await snap('base', view, hand, A);
    for (const [zid, z] of Object.entries(base.zones)) {
      await snap('one', view, hand, { ...A, [z.field]: B[z.field] });
      const { moved, outside } = await call('moved', 'base', 'one', view, hand, z.field);
      if (outside) fail(`${view} ${hand}: changing ${z.field} moved ${outside} px outside ${z.field}`);
      else if (!moved && z.solid > 200) fail(`${view} ${hand}: changing ${z.field} moved nothing`);
    }
    ok(`each of ${Object.keys(base.zones).length} fields changes only its own pixels`);
    const other = await snap('other', view, hand, A, 'Modified Trapeze-Web');
    const { outside } = await call('webMoved', 'base', 'other', view, hand);
    if (outside) fail(`${view} ${hand}: choosing another web moved ${outside} body px`);
    else ok('the glove body is identical whichever web is chosen');
    const hasWeb = !!(window_marker[view]);
    if (hasWeb) {
      if (other.warn) ok('an unphotographed web is marked as not photographed');
      else fail(`${view}: an unphotographed web is not marked`);
    } else if (other.warn) fail(`${view}: web warning shown on a view with no web`);
  }
  await snap('R', view, 'RHT', A);
  await snap('L', view, 'LHT', A);
  const { n, worst } = await call('mirror', 'R', 'L', view);
  if (n) fail(`${view}: left hand differs from the mirrored right hand at ${n} px (worst ${worst})`);
  else ok(`${view}: left hand is the right hand mirrored (worst channel difference ${worst})`);
}

// renders to look at
for (const view of ['thumb', 'pinky', 'heel']) for (const hand of ['RHT', 'LHT']) {
  await page.evaluate(([v, h]) => window.__side.set({ view: v, hand: h, webType: 'H-Web' }), [view, hand]);
  await page.locator('#glove').screenshot({ path: join(OUT, `${view}_${hand}.png`) });
}
if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
await browser.close();
server.close();
console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
