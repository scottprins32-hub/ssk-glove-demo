import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {starterRenderKey} from '../glove_builder/customiser/starter-cache.js';
import {STARTERS} from '../glove_builder/customiser/glove-catalog.js';

const data = JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/glove-data.json', import.meta.url)));

test('any wrist registration change rejects the previous starter pictures', () => {
  const before = starterRenderKey(data, STARTERS);
  for (const index of [0, 7, 13, 14, 15, 16]) {
    for (const field of ['artAngleDegrees', 'sourceBox', 'mountSize', 'mountOffset']) {
      const changed = structuredClone(data);
      const value = changed.bullets[index][field];
      if (Array.isArray(value)) value[0] += 1;
      else changed.bullets[index][field] = (value || 0) + 1;
      assert.notEqual(starterRenderKey(changed, STARTERS), before, `${index}: ${field}`);
    }
  }
  const moved = structuredClone(data); moved.bulletBox[0]++;
  assert.notEqual(starterRenderKey(moved, STARTERS), before);
});

test('hosted asset URLs and new thumbnail URLs do not invalidate identical artwork registration', () => {
  const hosted = structuredClone(data);
  for (const key of Object.keys(hosted.assets)) hosted.assets[key] = `https://example.com/${key}`;
  for (const badge of hosted.bullets) {
    badge.source = `https://example.com/${badge.asset}`;
    badge.thumb = 'assets/new-thumbnail.webp';
    badge.active = false; // Ordering availability never changes these pixels.
  }
  assert.equal(starterRenderKey(hosted, STARTERS), starterRenderKey(data, STARTERS));
});

test('starter colour and badge choices invalidate the cached picture', () => {
  const before = starterRenderKey(data, STARTERS);
  const changed = structuredClone(STARTERS); changed[0].bullet = 15;
  assert.notEqual(starterRenderKey(data, changed), before);
  changed[0].colors.binding = '90';
  assert.notEqual(starterRenderKey(data, changed), before);
});

test('shipped pictures match the current registration for every starter and both hands', async () => {
  const manifest = JSON.parse(await readFile(new URL('../glove_builder/customiser/assets/starters/manifest.json', import.meta.url)));
  assert.equal(manifest.key, starterRenderKey(data, STARTERS));
  for (const hand of ['RHT', 'LHT']) {
    assert.deepEqual(manifest.hands[hand], STARTERS.map(s => s.id));
    for (const st of STARTERS) {
      const name = st.id.replace(/[^A-Za-z0-9_-]+/g, '_') + '-' + hand + '.webp';
      assert.ok((await readFile(new URL('../glove_builder/customiser/assets/starters/' + name, import.meta.url))).length > 0);
    }
  }
});
