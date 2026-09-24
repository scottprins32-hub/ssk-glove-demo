// Exercise every registered photographed web through the production renderer.
// BASE_URL serves customiser; OUT_DIR receives review images and measured results.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const { chromium } = createRequire(import.meta.url)('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const out = process.env.OUT_DIR || 'work/web-matrix';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
try {
  const page = await browser.newPage();
  if (process.env.ASSET_OVERRIDE) await page.route('**/assets/*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop();
    try {
      const body = await readFile(`${process.env.ASSET_OVERRIDE}/${name}`);
      await route.fulfill({ body, contentType: name.endsWith('.json') ? 'application/json' : 'image/webp' });
    } catch { await route.continue(); }
  });
  await page.goto(base);
  const result = await page.evaluate(async () => {
    const { loadGlove, GloveRenderer } = await import('./glove-engine.js');
    const { WEBS, NATIVE_WEB } = await import('./glove-catalog.js');
    const bundle = await loadGlove(), D = bundle.DATA;
    const missingAssets = Object.keys(D.assets).filter(id => !bundle.imgs[id]);
    if (missingAssets.length) throw Error('Undecoded assets: ' + missingAssets.join(', '));
    const R = new GloveRenderer(bundle);
    const c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const state = Object.fromEntries(D.zones.map(z => [z.id, D.palettes[z.group][0][0]]));
    Object.assign(state, { web: '70', laces: '45' });
    const supported = WEBS.filter(w => w.render || w.id === NATIVE_WEB);
    const rows = [], images = [];
    for (const web of supported) {
      if (web.render && !D.webs[web.render]) throw Error('Missing registration: ' + web.id);
      R.setWeb(web.render || null);
      const swap = web.render ? D.webs[web.render] : null;
      const masks = {};
      for (const [zone, id] of [['web', swap?.web || 'web'], ['laces', swap?.laceweb || 'laces_web']]) {
        const m = document.createElement('canvas'); m.width = D.w; m.height = D.h;
        const g = m.getContext('2d');
        if (!bundle.imgs[id]) throw Error('Missing material mask: ' + id);
        g.drawImage(bundle.imgs[id], 0, 0);
        masks[zone] = g.getImageData(0, 0, D.w, D.h).data;
      }
      let rightPixels;
      for (const mirror of [false, true]) {
        R.draw(ctx, state, null, null, false, mirror);
        const before = ctx.getImageData(0, 0, D.w, D.h).data;
        let mirrorMismatch = 0, mirrorSamples = 0;
        if (!mirror) rightPixels = before;
        else for (let y=0; y<D.h; y++) for (let x=0; x<D.w; x++) {
          const source = (y*D.w+x)*4, dest = (y*D.w+D.w-1-x)*4;
          if (masks.web[source+3] < 240 && masks.laces[source+3] < 240) continue;
          mirrorSamples++;
          if (Math.abs(rightPixels[source]-before[dest])+Math.abs(rightPixels[source+1]-before[dest+1])+Math.abs(rightPixels[source+2]-before[dest+2]) > 20) mirrorMismatch++;
        }
        images.push({ name: (web.render || 'h-web') + (mirror ? '-LHT' : '-RHT'), data: c.toDataURL('image/png') });
        const counts = {};
        for (const [zone, code] of [['web', '10'], ['laces', '90']]) {
          R.draw(ctx, { ...state, [zone]: code }, null, null, false, mirror);
          const after = ctx.getImageData(0, 0, D.w, D.h).data;
          let changed = 0, alphaChanged = 0;
          for (let i = 0; i < before.length; i += 4) {
            if (before[i+3] !== after[i+3]) alphaChanged++;
            const pixel=i/4, x=pixel%D.w, y=Math.floor(pixel/D.w);
            const mi=(y*D.w+(mirror ? D.w-1-x : x))*4;
            if (masks[zone][mi+3] > 200 && Math.abs(before[i]-after[i]) + Math.abs(before[i+1]-after[i+1]) + Math.abs(before[i+2]-after[i+2]) > 20) changed++;
          }
          counts[zone] = { changed, alphaChanged };
        }
        rows.push({ webName: web.id, hand: mirror ? 'LHT' : 'RHT', mirrorMismatch, mirrorSamples, ...counts });
      }
    }
    return { rows, images, unsupported: WEBS.filter(w => !w.render && w.id !== NATIVE_WEB).map(w => w.id) };
  });
  for (const im of result.images) await writeFile(`${out}/${im.name}.png`, Buffer.from(im.data.split(',')[1], 'base64'));
  delete result.images;
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2) + '\n');
  for (const row of result.rows) assert.ok(!row.mirrorSamples || row.mirrorMismatch / row.mirrorSamples < .01, `${row.webName}: web must mirror correctly`);
  for (const row of result.rows) for (const zone of ['web', 'laces']) {
    assert.ok(row[zone].changed > 500, `${row.webName} ${row.hand}: ${zone} colour must visibly change`);
    assert.equal(row[zone].alphaChanged, 0, `${row.webName} ${row.hand}: recolouring must preserve openings`);
  }
  console.log(`PASS: ${result.rows.length} web/hand renders; web-local leather/lace recolouring preserves alpha; mirrored web pixels match.`);
  console.log('Photo-only catalogue entries:', result.unsupported.join(', '));
} finally { await browser.close(); }
