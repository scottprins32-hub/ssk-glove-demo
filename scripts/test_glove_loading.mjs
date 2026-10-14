// Deterministic loader regressions; no browser, network or third-party packages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../glove_builder/customiser/glove-engine.js', import.meta.url), 'utf8');
let moduleId = 0;
const settle = () => new Promise(resolve => setImmediate(resolve));

async function harness({ failures = {}, imageFailures = {}, manualImages = false } = {}) {
  const requests = new Map(), images = new Map(), pendingImages = new Map();
  globalThis.window = {};
  globalThis.location = { protocol: 'https:' };
  globalThis.document = { createElement: () => ({
    getContext: () => ({ drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray(4) }) })
  }) };
  globalThis.fetch = async url => {
    const count = (requests.get(url) || 0) + 1;
    requests.set(url, count);
    if (count <= (failures[url] || 0)) return { ok: false };
    return { ok: true, json: async () => ({ w: 1, h: 1, palettes: {}, zones: [],
      assets: { glove: 'body.png', _idmap: 'id.png' } }) };
  };
  globalThis.Image = class {
    set src(src) {
      this.url = src;
      const count = (images.get(src) || 0) + 1;
      images.set(src, count);
      const finish = () => count <= (imageFailures[src] || 0) ? this.onerror() : this.onload();
      if (manualImages) pendingImages.set(src, finish);
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
