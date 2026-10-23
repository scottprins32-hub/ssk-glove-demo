// Loader/verification regressions using production metadata and asset bytes.
// Images/canvas are mocked; this does not certify rendering or browser timing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

const root = new URL('../glove_builder/customiser/', import.meta.url);
const source = await readFile(new URL('glove-engine.js', root), 'utf8');
const app = await readFile(new URL('app.js', root), 'utf8');
const metadata = Object.fromEntries(await Promise.all(['glove', 'palm', 'thumb', 'pinky'].map(async name =>
  [`assets/${name}-data.json`, JSON.parse(await readFile(new URL(`assets/${name}-data.json`, root)))])));
const palmData = metadata['assets/palm-data.json'];
const manifest = palmData.palmWebs;
const commonKeys = [manifest.footprint.asset, manifest.protected.asset];
const partKeys = web => [...Object.values(manifest.entries[web].parts).map(part => part.asset),
  ...(manifest.entries[web].palmSupport ? [manifest.entries[web].palmSupport.asset] : [])];
const urls = keys => [...new Set(keys.map(key => palmData.assets[key]))].sort();
const bankURLs = urls([...commonKeys, ...Object.keys(manifest.entries).flatMap(partKeys)]);
const assetBytes = new Map(await Promise.all(bankURLs.map(async url => [url, await readFile(new URL(url, root))])));
const settle = () => new Promise(resolve => setImmediate(resolve));
let moduleId = 0;

async function harness({ imageFailures = {}, corrupt = [], heldHashes = [], mutate, versions = {} } = {}) {
  const data = structuredClone(metadata);
  mutate?.(data['assets/palm-data.json']);
  const images = new Map(), hashes = new Map(), requests = new Map(), waiting = new Map();
  const corruptURLs = new Set(corrupt), held = new Set(heldHashes);
  const cleanURL = url => url.split(/[?#]/)[0];
  const versioned = url => versions[url] ? `${url}?v=${versions[url]}` : url;
  const increment = (map, key) => { const n = (map.get(key) || 0) + 1; map.set(key, n); return n; };
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  globalThis.window = { __SSK_ASSET_VERSIONS__: versions };
  globalThis.location = { protocol: 'https:' };
  globalThis.document = { createElement: () => ({ getContext: () => ({
    drawImage() {}, putImageData() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) })
  }) }) };
  globalThis.Image = class {
    set src(url) {
      this.url = url;
      const path = cleanURL(url), count = increment(images, url);
      const bytes = assetBytes.get(path);
      // The verified layers are real PNGs: use their actual IHDR dimensions.
      this.naturalWidth = bytes ? bytes.readUInt32BE(16) : 1534;
      this.naturalHeight = bytes ? bytes.readUInt32BE(20) : 1400;
      queueMicrotask(() => count <= (imageFailures[path] || 0) ? this.onerror() : this.onload());
    }
  };
  globalThis.fetch = async url => {
    increment(requests, url);
    const path = cleanURL(url);
    if (data[path]) return { ok: true, json: async () => structuredClone(data[path]) };
    assert.ok(assetBytes.has(path), `unexpected verification fetch: ${url}`);
    increment(hashes, url);
    if (held.has(path)) await new Promise(resolve => waiting.set(path, resolve));
    const bytes = Buffer.from(assetBytes.get(path));
    if (corruptURLs.has(path)) bytes[bytes.length - 1] ^= 1;
    return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  };
  const engine = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64') + '#' + moduleId++);
  return { ...engine, images, hashes, requests, corruptURLs, versioned,
    waitForHash: async path => {
      for (let i = 0; i < 1000 && !waiting.has(path); i++) await settle();
      assert.ok(waiting.has(path), `verification did not reach ${path}`);
    },
    release: path => { held.delete(path); assert.ok(waiting.has(path)); waiting.get(path)(); waiting.delete(path); }
  };
}

async function progressive(h) {
  const bundle = await h.loadGlove({ progressive: true });
  await bundle.views.palm.load();
  return bundle;
}

test('native progressive H loads palm body without alternate inserts, masks or snake', async () => {
  const h = await harness();
  const bundle = await h.loadGlove({ progressive: true });
  assert.equal(bundle.views.palm.ready, false);
  for (const url of bankURLs) assert.equal(h.images.has(url), false, url);
  await bundle.views.palm.load();
  const palm = bundle.views.palm;
  assert.equal(palm.ready, true);
  assert.equal(palm.selectionReady(null), true);
  assert.equal(palm.DATA.palmWebs, null);
  assert.equal(palm.hasPendingSelection('smk'), true);
  assert.equal(palm.selectionReady('smk'), false);
  assert.equal(h.hashes.size, 0);
  for (const url of [...bankURLs, palmData.assets._snakeLeather]) assert.equal(h.images.has(url), false, url);
  for (const key of ['glove', '_idmap', ...palmData.zones.map(zone => zone.id)]) assert.ok(palm.imgs[key], key);
  for (const key of ['_hdLeather', '_hdLace']) assert.equal(h.images.get(palmData.assets[key]), 1, 'shared texture decodes once');
});

test('selected I-web loads and verifies only its layers, support and common masks', async () => {
  const h = await harness(), bundle = await progressive(h), palm = bundle.views.palm;
  const before = new Set(h.images.keys());
  await palm.loadSelection('standard-i');
  const wanted = urls([...commonKeys, ...partKeys('standard-i')]);
  assert.deepEqual([...h.images.keys()].filter(url => !before.has(url)).sort(), wanted);
  assert.deepEqual([...h.hashes.keys()].sort(), wanted);
  assert.deepEqual(Object.keys(palm.DATA.palmWebs.entries), ['standard-i']);
  assert.equal(palm.selectionReady('standard-i'), true);
  assert.equal(palm.hasPendingSelection('standard-i'), false);
  assert.equal(palm.selectionReady('spiral-i'), false);
  assert.equal(h.images.has(palmData.assets._snakeLeather), false);
  const renderer = new h.GloveRenderer(bundle);
  renderer.setView('palm'); renderer.setWeb('standard-i');
  assert.equal(renderer.web, 'standard-i');
});

test('concurrent selections preserve both verified entries and share common hashes and masks', async () => {
  const held = palmData.assets[manifest.entries.smk.parts.leather.asset];
  const h = await harness({ heldHashes: [held] }), palm = (await progressive(h)).views.palm;
  const smk = palm.loadSelection('smk');
  assert.equal(palm.loadSelection('smk'), smk, 'same selection shares its promise');
  const standard = palm.loadSelection('standard-i');
  await h.waitForHash(held);
  await standard;
  assert.deepEqual(Object.keys(palm.DATA.palmWebs.entries), ['standard-i']);
  const alpha = commonKeys.map(key => palm.imgs[key + '#alpha']);
  assert.equal(palm.selectionReady('smk'), false);
  h.release(held); await smk;
  assert.deepEqual(Object.keys(palm.DATA.palmWebs.entries).sort(), ['smk', 'standard-i']);
  for (let i = 0; i < commonKeys.length; i++) {
    assert.equal(palm.imgs[commonKeys[i] + '#alpha'], alpha[i], 'common alpha canvas is reused');
    assert.equal(h.hashes.get(palmData.assets[commonKeys[i]]), 1);
  }
  for (const count of h.images.values()) assert.equal(count, 1);
  assert.equal(palm.selectionReady('smk'), true);
  assert.equal(palm.selectionReady('standard-i'), true);
});

for (const [label, key] of [['selected layer', manifest.entries.smk.parts.leather.asset], ['common mask', commonKeys[0]]]) {
  test(`corrupt ${label} bytes fail closed and retry rehashes only the failure`, async () => {
    const bad = palmData.assets[key];
    const h = await harness({ corrupt: [bad] }), bundle = await progressive(h), palm = bundle.views.palm;
    await assert.rejects(palm.loadSelection('smk'), /could not be verified/);
    assert.equal(palm.DATA.palmWebs?.entries?.smk, undefined);
    assert.equal(palm.selectionReady('smk'), false);
    assert.equal(palm.hasPendingSelection('smk'), true);
    const renderer = new h.GloveRenderer(bundle);
    renderer.setView('palm'); renderer.setWeb('smk');
    assert.equal(renderer.web, null, 'unverified insert cannot be selected for rendering');
    h.corruptURLs.delete(bad);
    await palm.loadSelection('smk');
    assert.equal(palm.selectionReady('smk'), true);
    assert.equal(h.hashes.get(bad), 2);
    for (const [url, count] of h.hashes) if (url !== bad) assert.equal(count, 1, url);
    for (const count of h.images.values()) assert.equal(count, 1, 'hash retry keeps successful decodes');
  });
}

test('failed palm body retry retains the original unverified manifest', async () => {
  const body = palmData.assets.glove;
  const h = await harness({ imageFailures: { [body]: 1 } });
  const palm = (await h.loadGlove({ progressive: true })).views.palm;
  await assert.rejects(palm.load(), /body could not be loaded/);
  assert.equal(palm.ready, false);
  assert.equal(palm.DATA.palmWebs, null);
  assert.equal(palm.hasPendingSelection('spiral-i'), true);
  const retry = palm.load();
  assert.equal(palm.load(), retry);
  await retry;
  await palm.loadSelection('spiral-i');
  assert.equal(palm.selectionReady('spiral-i'), true);
  assert.equal(h.images.get(body), 2);
  assert.equal(h.requests.get('assets/palm-data.json'), 1);
});

test('failed selected image retries without repeating successful decodes', async () => {
  const bad = palmData.assets[manifest.entries.smk.parts.laces.asset];
  const h = await harness({ imageFailures: { [bad]: 1 } }), palm = (await progressive(h)).views.palm;
  await assert.rejects(palm.loadSelection('smk'), /Selected option could not be loaded/);
  assert.equal(palm.ready, true);
  assert.equal(palm.selectionReady('smk'), false);
  assert.equal(h.hashes.size, 0, 'missing images never reach verification');
  await palm.loadSelection('smk');
  assert.equal(palm.selectionReady('smk'), true);
  assert.equal(h.images.get(bad), 2);
  for (const [url, count] of h.images) if (url !== bad) assert.equal(count, 1, url);
});

test('progressive initial palm stays native until the chosen option is requested', async () => {
  const h = await harness(), bundle = await h.loadGlove({ progressive: true, initialView: 'palm' });
  assert.equal(bundle.views.palm.ready, true);
  assert.equal(bundle.views.palm.selectionReady(null), true);
  assert.equal(h.hashes.size, 0);
  for (const url of bankURLs) assert.equal(h.images.has(url), false, url);
  await bundle.views.palm.loadSelection(null, true);
  assert.equal(bundle.views.palm.selectionReady(null, true), true);
  assert.equal(h.images.get(palmData.assets._snakeLeather), 1);
  assert.equal(h.hashes.size, 0);
});

test('progressive thumb and pinky defer snake until requested and share its decode', async () => {
  const h = await harness(), bundle = await h.loadGlove({ progressive: true });
  const sides = [bundle.views.thumb, bundle.views.pinky];
  await Promise.all(sides.map(view => view.load()));
  const snake = palmData.assets._snakeLeather;
  assert.equal(h.images.has(snake), false);
  for (const view of sides) {
    assert.equal(view.ready, true);
    assert.equal(view.selectionReady(null), true);
    assert.equal(view.selectionReady(null, true), false);
    for (const key of ['glove', '_idmap', ...view.DATA.zones.map(zone => zone.id),
      ...Object.values(view.DATA.nativeHContour?.assets || {})]) {
      if (view.DATA.assets[key]) assert.ok(view.imgs[key], key);
    }
  }
  await Promise.all(sides.map(view => view.loadSelection(null, true)));
  for (const view of sides) assert.equal(view.selectionReady(null, true), true);
  assert.equal(h.images.get(snake), 1);
  assert.equal(sides[0].imgs._snakeLeather, sides[1].imgs._snakeLeather);
});

test('cached native H thumb picks up deferred snake without switching views', async () => {
  const h = await harness(), bundle = await h.loadGlove({ progressive: true });
  const thumb = bundle.views.thumb;
  await thumb.load();
  const renderer = new h.GloveRenderer(bundle);
  renderer.setView('thumb');
  renderer.syncNativeHContour();
  assert.notEqual(renderer.imgs, thumb.imgs, 'native H uses its own aliased image collection');
  assert.equal(renderer.imgs._snakeLeather, undefined);
  await thumb.loadSelection(null, true);
  assert.ok(thumb.imgs._snakeLeather);
  renderer.syncNativeHContour();
  assert.equal(renderer.view, 'thumb');
  assert.equal(renderer.imgs._snakeLeather, thumb.imgs._snakeLeather,
    'refresh the active native contour after the deferred texture loads');
  for (const [zone, asset] of Object.entries(thumb.DATA.nativeHContour.assets)) {
    assert.equal(renderer.imgs[zone], thumb.imgs[asset], `retain native alias ${zone}`);
  }
});

test('complete API still eagerly loads all views and verifies all eight palm entries', async () => {
  const h = await harness(), bundle = await h.loadGlove(), palm = bundle.views.palm;
  for (const view of Object.values(bundle.views)) assert.equal(view.ready, true);
  assert.deepEqual(Object.keys(palm.DATA.palmWebs.entries).sort(), Object.keys(manifest.entries).sort());
  assert.equal(Object.keys(palm.DATA.palmWebs.entries).length, 8);
  assert.deepEqual([...h.hashes.keys()].sort(), bankURLs);
  for (const web of Object.keys(manifest.entries)) assert.equal(palm.selectionReady(web, true), true, web);
  for (const url of [...bankURLs, palmData.assets._snakeLeather]) assert.equal(h.images.get(url), 1, url);
});

test('selected verification uses the same versioned URL as image loading', async () => {
  const url = palmData.assets[manifest.entries.smk.parts.leather.asset];
  const h = await harness({ versions: { [url]: 'test-version' } }), palm = (await progressive(h)).views.palm;
  await palm.loadSelection('smk');
  assert.equal(h.images.get(h.versioned(url)), 1);
  assert.equal(h.hashes.get(h.versioned(url)), 1);
  assert.equal(h.images.has(url), false);
  assert.equal(h.hashes.has(url), false);
});

test('lazy verification retains the global contract and selected bbox gates', async () => {
  for (const mutate of [
    data => { data.palmWebs.contract.sha256 = '0'.repeat(64); },
    data => { data.palmWebs.roles.leather = 'palm'; },
    data => { data.bbox[manifest.entries.smk.parts.leather.asset] = [1, 0, 1534, 1400]; }
  ]) {
    const h = await harness({ mutate }), palm = (await progressive(h)).views.palm;
    await assert.rejects(palm.loadSelection('smk'), /could not be verified/);
    assert.equal(palm.selectionReady('smk'), false);
    assert.equal(palm.DATA.palmWebs?.entries?.smk, undefined);
    assert.equal(palm.selectionReady(null), true, 'native H remains available');
  }
});

test('actual app keeps pending palm selectable but gates drawing until verification completes', async () => {
  const held = palmData.assets[manifest.entries.smk.parts.leather.asset];
  const h = await harness({ heldHashes: [held] }), bundle = await progressive(h);
  const availability = app.slice(app.indexOf('function viewAvailability('), app.indexOf('/* Choosing a web'));
  const gate = app.slice(app.indexOf('let selectionRequest ='), app.indexOf('function registerThumbViews()'));
  const drawSource = app.slice(app.indexOf('function draw(target = ctx,'), app.indexOf('/* What the picture cannot show'));
  assert.ok(availability.startsWith('function viewAvailability('));
  assert.ok(gate.startsWith('let selectionRequest ='));
  assert.ok(drawSource.startsWith('function draw(target = ctx,'));
  const ui = new Function('R', `
    const S = { view:'palm', webType:'smk', materials:{}, colors:{}, lang:'en' }, NATIVE_WEB='H-Web';
    const WEBS=[{id:'smk',render:'smk'}], PAD_PART={}, DATA=R.DATA;
    const stageBackground=()=> '#949494', interact=null, paintCompare=()=>{}, studioDark=()=>false, indexIsOnePiece=()=>false, middleIsOnePiece=()=>false;
    const selectedWeb = () => ({id:S.webType, render:S.webType}), draws=[];
    const nodes = {'#glove':{setAttribute(){},removeAttribute(){},classList:{add(){}}}, '#stagehint':{}};
    const $ = key => nodes[key], el = () => ({}), paint = () => {};
    const document = {querySelector:()=>({style:{setProperty(){}},appendChild:node=>{nodes['#'+node.id]=node;}})};
    const ctx = {canvas:{width:1,height:1},clearRect(){}};
    const flagArt=()=>null, layerMaterials=()=>({}), layerState=()=>({}), hasFlag=()=>false, isLefty=()=>false;
    const visualKey=()=>'test',nativeFrameKey=()=>'',defaultVisual=null;
    const nativeFrames={select(){},get(){return null;},put(){}},rememberPublic=()=>{};
    const drawUnavailable=()=>{throw Error('unexpected unavailable view');};
    R.draw=()=>draws.push(R.web);
    ${availability}
    ${gate}
    ${drawSource}
    return {draws,draw,availability:()=>viewAvailability('palm'),pending:()=>selectionRequest.pending};
  `)(new h.GloveRenderer(bundle));
  assert.equal(ui.availability().ok, true);
  assert.equal(bundle.views.palm.selectionReady('smk'), false);
  ui.draw();
  await h.waitForHash(held);
  assert.deepEqual(ui.draws, [], 'pending alternate never draws the native fallback');
  h.release(held); await ui.pending();
  assert.deepEqual(ui.draws, ['smk']);
  assert.equal(ui.availability().ok, true);
});
