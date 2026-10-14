// Deterministic loader regressions; no browser, network or third-party packages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../glove_builder/customiser/glove-engine.js', import.meta.url), 'utf8');
let moduleId = 0;
const settle = () => new Promise(resolve => setImmediate(resolve));

async function harness({ failures = {}, imageFailures = {}, manualImages = false, metadata, versions } = {}) {
  const requests = new Map(), images = new Map(), pendingImages = new Map();
  globalThis.window = { __SSK_ASSET_VERSIONS__: versions };
  globalThis.location = { protocol: 'https:' };
  globalThis.document = { createElement: () => ({
    getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }) })
  }) };
  globalThis.fetch = async url => {
    const count = (requests.get(url) || 0) + 1;
    requests.set(url, count);
    if (count <= (failures[url] || 0)) return { ok: false };
    return { ok: true, json: async () => structuredClone(metadata || { w: 1, h: 1, palettes: {}, zones: [],
      assets: { glove: 'body.png', _idmap: 'id.png' } }) };
  };
  globalThis.Image = class {
    set src(src) {
      this.url = src;
      const count = (images.get(src) || 0) + 1;
      images.set(src, count);
      const finish = () => count <= (imageFailures[src] || 0) ? this.onerror() : this.onload();
      if (manualImages === true || (Array.isArray(manualImages) && manualImages.includes(src))) pendingImages.set(src, finish);
      else queueMicrotask(finish);
    }
  };
  const engine = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64') + '#' + moduleId++);
  const renderer = Object.create(engine.GloveRenderer.prototype);
  return { ...engine, renderer, requests, images, finish: async src => { pendingImages.get(src)(); await settle(); } };
}

test('failed optional metadata stays visible and retries without reloading the page', async () => {
  const h = await harness({ failures: { 'assets/palm-data.json': 2 } });
  const bundle = await h.loadGlove({ progressive: true });
  const renderer = new h.GloveRenderer(bundle);
  const palm = bundle.views.palm;
  await assert.rejects(palm.load(), /data could not be loaded/);
  assert.equal(renderer.hasView('palm'), true);
  assert.equal(palm.ready, false);
  assert.ok(palm.error);
  const retry = palm.load();
  assert.equal(palm.error, null, 'show loading rather than a stale error during retry');
  const [first, second] = await Promise.all([retry, palm.load()]);
  assert.equal(first, second);
  assert.equal(palm.ready, true);
  assert.equal(palm.error, null);
  assert.equal(h.requests.get('assets/palm-data.json'), 3);
  assert.equal(h.images.get('body.png'), 1);
  assert.equal(h.images.get('id.png'), 1);
});

test('a complete load retains a failed optional view for a later retry', async () => {
  const h = await harness({ failures: { 'assets/pinky-data.json': 2 } });
  const bundle = await h.loadGlove();
  assert.equal(bundle.views.back.ready, true);
  assert.equal(bundle.views.pinky.ready, false);
  await bundle.views.pinky.load();
  assert.equal(bundle.views.pinky.ready, true);
});

test('failed back metadata can retry the whole bundle', async () => {
  const h = await harness({ failures: { 'assets/glove-data.json': 1 } });
  await assert.rejects(h.loadGlove({ progressive: true }));
  assert.equal((await h.loadGlove({ progressive: true })).ready, true);
  assert.equal(h.requests.get('assets/glove-data.json'), 2);
});

test('failed core images can retry while successful images stay cached', async () => {
  const h = await harness({ imageFailures: { 'body.png': 1 } });
  await assert.rejects(h.loadGlove({ progressive: true }), /body could not be loaded/);
  assert.equal((await h.loadGlove({ progressive: true })).ready, true);
  assert.equal(h.images.get('body.png'), 2);
  assert.equal(h.images.get('id.png'), 1);
});

test('preload and repeated flag selections share one decode and latest redraw', async () => {
  const h = await harness({ manualImages: true });
  let oldDraws = 0, latestDraws = 0;
  const preload = h.renderer.preloadFlags(['nl.svg', 'nl.svg']);
  h.renderer.setFlag('nl.svg', () => oldDraws++);
  h.renderer.setFlag('nl.svg', () => latestDraws++, 'middle');
  assert.equal(h.images.get('nl.svg'), 1);
  await h.finish('nl.svg'); await preload;
  assert.equal(oldDraws, 0);
  assert.equal(latestDraws, 1);
  assert.equal(h.renderer.flagPosition, 'middle');
  assert.equal(h.renderer.flagImg.url, 'nl.svg');
  h.renderer.setFlag('nl.svg', () => latestDraws++);
  assert.equal(h.images.get('nl.svg'), 1);
  assert.equal(latestDraws, 1);
});

test('late flag cannot replace another selection or restore a removed flag', async () => {
  const h = await harness({ manualImages: true });
  let draws = 0;
  h.renderer.setFlag('nl.svg', () => draws++);
  h.renderer.setFlag('jp.svg', () => draws++, 'middle');
  await h.finish('nl.svg');
  assert.equal(draws, 0); assert.equal(h.renderer.flagImg, null);
  await h.finish('jp.svg');
  assert.equal(draws, 1); assert.equal(h.renderer.flagImg.url, 'jp.svg');
  h.renderer.setFlag('cu.svg', () => draws++);
  h.renderer.setFlag(null);
  await h.finish('cu.svg');
  assert.equal(draws, 1); assert.equal(h.renderer.flagImg, null);
});

test('failed flag decode can retry after preload failure', async () => {
  const h = await harness({ manualImages: true, imageFailures: { 'nl.svg': 1 } });
  let draws = 0;
  const preload = h.renderer.preloadFlags(['nl.svg']);
  h.renderer.setFlag('nl.svg', () => draws++);
  await h.finish('nl.svg'); await preload;
  assert.equal(draws, 0); assert.equal(h.renderer.flagImg, null);
  h.renderer.setFlag('nl.svg', () => draws++);
  await h.finish('nl.svg');
  assert.equal(h.images.get('nl.svg'), 2);
  assert.equal(draws, 1); assert.equal(h.renderer.flagImg.url, 'nl.svg');
});

const optionalMetadata = {
  w: 1, h: 1, palettes: {}, zones: [{ id: 'panel' }],
  approvedH: { shared: 'shared' }, nativeHContour: { assets: { alias: 'nativeAlias' } },
  webs: {
    a: { web: 'web_a', attachment: { asset: 'attach' }, shared: 'shared' },
    b: { web: 'web_b', attachment: { asset: 'attach' } }
  },
  assets: { glove: 'body.png', _idmap: 'id.png', _hdLeather: 'leather.png', _hdLace: 'lace.png',
    _snakeLeather: 'snake.png', panel: 'panel.png', panel_hi: 'panel-hi.png',
    nativeAlias: 'native.png', shared: 'shared.png', web_a: 'a.png', web_a_hi: 'a-hi.png',
    web_b: 'b.png', attach: 'attach.png' }
};

test('progressive back defers only web roots and crocodile, with priority core assets first', async () => {
  const h = await harness({ metadata: optionalMetadata });
  const bundle = await h.loadGlove({ progressive: true });
  const back = bundle.views.back;
  assert.deepEqual([...h.images.keys()].slice(0, 4), ['body.png', 'id.png', 'leather.png', 'lace.png']);
  assert.deepEqual([...h.images.keys()].sort(), ['body.png','id.png','leather.png','lace.png',
    'panel.png','panel-hi.png','native.png','shared.png'].sort());
  assert.equal(back.selectionReady(null), true);
  assert.equal(back.selectionReady('a'), false);
  await back.loadSelection('a');
  assert.equal(back.selectionReady('a'), true);
  assert.equal(back.selectionReady('b'), false);
  assert.equal(back.selectionReady('a', true), false);
  for (const src of ['a.png', 'a-hi.png', 'attach.png']) assert.equal(h.images.get(src), 1);
  assert.equal(h.images.has('b.png'), false);
  assert.equal(h.images.has('snake.png'), false);
  await back.loadSelection('a', true);
  assert.equal(back.selectionReady('a', true), true);
  assert.equal(h.images.get('snake.png'), 1);
});

test('real back metadata base closure requests 97 URLs and keeps every non-web dependency', async () => {
  const metadata = JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/glove-data.json', import.meta.url)));
  const h = await harness({ metadata });
  const bundle = await h.loadGlove({ progressive: true });
  assert.equal(Object.keys(bundle.imgs).length, 100);
  assert.equal(h.images.size, 97);
  for (const web of Object.keys(metadata.webs)) {
    await bundle.views.back.loadSelection(web);
    assert.equal(bundle.views.back.selectionReady(web), true);
  }
  await bundle.views.back.loadSelection(null, true);
  assert.equal(Object.keys(bundle.imgs).length, 154);
  assert.equal(h.images.size, 151);
});

test('concurrent options and repeated selection share in-flight image decodes', async () => {
  const h = await harness({ metadata: optionalMetadata, manualImages: ['a.png','a-hi.png','b.png','attach.png'] });
  const bundle = await h.loadGlove({ progressive: true });
  const back = bundle.views.back;
  const a = back.loadSelection('a'), again = back.loadSelection('a'), b = back.loadSelection('b');
  assert.equal(a, again);
  await settle();
  for (const src of ['a.png','a-hi.png','b.png','attach.png']) assert.equal(h.images.get(src), 1);
  assert.equal(back.selectionReady('a'), false);
  for (const src of ['a.png','a-hi.png','attach.png','b.png']) await h.finish(src);
  await Promise.all([a,b]);
  assert.equal(back.selectionReady('a'), true);
  assert.equal(back.selectionReady('b'), true);
});

test('failed optional image leaves selection unready and retry keeps successful dependencies', async () => {
  const h = await harness({ metadata: optionalMetadata, imageFailures: { 'a-hi.png': 1, 'snake.png': 1 } });
  const bundle = await h.loadGlove({ progressive: true });
  const back = bundle.views.back;
  await assert.rejects(back.loadSelection('a', true), /Selected option could not be loaded/);
  assert.equal(back.ready, true);
  assert.equal(back.selectionReady('a', true), false);
  await back.loadSelection('a', true);
  assert.equal(back.selectionReady('a', true), true);
  assert.equal(h.images.get('a-hi.png'), 2);
  assert.equal(h.images.get('snake.png'), 2);
  assert.equal(h.images.get('a.png'), 1);
  assert.equal(h.images.get('attach.png'), 1);
});

test('default complete API still includes every optional back web and texture', async () => {
  const h = await harness({ metadata: optionalMetadata });
  const bundle = await h.loadGlove();
  for (const view of Object.values(bundle.views)) {
    assert.equal(view.ready, true);
    assert.equal(view.selectionReady('a', true), true);
    assert.equal(view.selectionReady('b', true), true);
  }
  assert.deepEqual([...h.images.keys()].sort(), [...new Set(Object.values(optionalMetadata.assets))].sort());
});

test('hashed URLs cover metadata, decoded assets and flags while offline/external sources stay unchanged', async () => {
  const h = await harness({ versions: { 'assets/glove-data.json': 'data-hash', 'body.png': 'body-hash',
    'nl.svg': 'flag-hash', 'external.png?x=1': 'query-hash', 'https://example.com/a.png': 'unused',
    'data:image/png;base64,AAAA': 'unused' } });
  await h.loadGlove({ progressive: true });
  assert.equal(h.requests.get('assets/glove-data.json?v=data-hash'), 1);
  assert.equal(h.images.get('body.png?v=body-hash'), 1);
  await h.renderer.preloadFlags(['nl.svg']);
  assert.equal(h.images.get('nl.svg?v=flag-hash'), 1);
  assert.equal(h.assetURL('unmapped.png'), 'unmapped.png');
  assert.equal(h.assetURL('external.png?x=1'), 'external.png?x=1&v=query-hash');
  assert.equal(h.assetURL('https://example.com/a.png'), 'https://example.com/a.png');
  assert.equal(h.assetURL('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
});

const appSource = await readFile(new URL('../glove_builder/customiser/app.js', import.meta.url), 'utf8');
function appGateHarness() {
  const gateSource = appSource.slice(appSource.indexOf('let selectionRequest ='), appSource.indexOf('function registerThumbViews()'));
  return new Function(`
    const S = { view:'back', webType:'a', materials:{}, lang:'en' };
    const ready = new Set(), pending = new Map(), calls = [], draws = [];
    const R = { views: { back: {
      selectionReady: web => ready.has(web),
      loadSelection: web => { calls.push(web); return new Promise((resolve, reject) => pending.set(web, {
        resolve: () => { ready.add(web); resolve(); }, reject })); }
    } } };
    const nodes = { '#glove': {setAttribute() {}}, '#stagehint': {} };
    const $ = key => nodes[key], el = () => ({});
    const document = {querySelector: () => ({appendChild: button => { nodes['#'+button.id] = button; }})};
    const ctx = {canvas:{width:1,height:1},clearRect() {}};
    const selectedWeb = () => ({render:S.webType});
    const paint = () => {};
    const draw = () => { if (!gateSelection(ctx)) draws.push(S.webType); };
    ${gateSource}
    return { S, pending, calls, draws, nodes, draw, gate: () => gateSelection(ctx),
      proofGate: () => gateSelection({}), ready };
  `)();
}

test('actual app gate ignores late selection completion and never draws an unready option', async () => {
  const h = appGateHarness();
  assert.equal(h.gate(), true);
  assert.throws(h.proofGate, /Selected option is still loading/);
  h.S.webType = 'b';
  assert.equal(h.gate(), true);
  h.pending.get('a').resolve(); await settle();
  assert.deepEqual(h.draws, []);
  h.pending.get('b').resolve(); await settle();
  assert.deepEqual(h.draws, ['b']);
  assert.equal(h.gate(), false);
});

test('actual app gate exposes a retry button and retries only when requested', async () => {
  const h = appGateHarness();
  h.draw();
  h.pending.get('a').reject(new Error('offline')); await settle();
  assert.deepEqual(h.draws, []);
  assert.equal(h.nodes['#option-retry'].hidden, false);
  assert.match(h.nodes['#stagehint'].textContent, /could not load/);
  h.draw();
  assert.deepEqual(h.calls, ['a']);
  h.nodes['#option-retry'].onclick();
  assert.deepEqual(h.calls, ['a','a']);
  h.pending.get('a').resolve(); await settle();
  assert.deepEqual(h.draws, ['a']);
});

test('deferred angle stays selectable until its web availability is verified', () => {
  const fn = appSource.slice(appSource.indexOf('function viewAvailability('), appSource.indexOf('/* Choosing a web'));
  const h = new Function(`const S={}; const R={hasView:()=>true,views:{palm:{ready:false,DATA:{}}}};
    const selectedWeb=()=>({id:'Standard I',render:'standard-i'}); const NATIVE_WEB='H-Web';
    ${fn}; return {R,availability:()=>viewAvailability('palm')};`)();
  assert.equal(h.availability().pending, true);
  assert.equal(h.availability().ok, true);
  h.R.views.palm.ready = true;
  assert.equal(h.availability().ok, false, 'a verified missing insert stays unavailable');
  h.R.views.palm.DATA.palmWebs = {entries:{'standard-i':{}}};
  assert.equal(h.availability().ok, true);
});

test('ownership maps survive tint invalidation but are bounded and context-specific', async () => {
  const h = await harness();
  const bundle = await h.loadGlove();
  const r = new h.GloveRenderer(bundle);
  let draws=0; r.draw=()=>{draws++;};
  const own=r.backOwners(false);
  r.cache.clear(); r.nativeContourKey=null;
  assert.equal(r.backOwners(false),own);
  assert.equal(draws,1);
  r.setMaterials({back3:'snakeskin'});
  assert.notEqual(r.backOwners(false),own);
  r.setMaterials({});
  assert.equal(r.backOwners(false),own);
  for(let i=0;i<10;i++){r.pad='pad'+i;r.backOwners(false);}
  assert.equal(r.ownerMaps.size,8);
  r.DATA={...r.DATA}; r.backOwners(false);
  assert.equal(r.ownerMaps.size,1);
  r.imgs={...r.imgs}; r.backOwners(true);
  assert.equal(r.ownerMaps.size,1);
});

test('pad-mask reuse follows both the immutable input layer and pad image', async () => {
  const h=await harness(); const r=new h.GloveRenderer(await h.loadGlove());
  const input={width:1,height:1,_ox:0,_oy:0};
  r.pad='hood'; r.imgs.hood={};
  const mask=r.underPad(input,null);
  assert.equal(r.underPad(input,null),mask);
  assert.notEqual(r.underPad({...input},null),mask);
  r.imgs.hood={}; assert.notEqual(r.underPad(input,null),mask);
  r.pad=null; assert.equal(r.underPad(input,null),input);
});
