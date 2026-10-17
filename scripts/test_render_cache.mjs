import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeFrames,PublicRenders} from '../glove_builder/customiser/render-cache.js';

test('native frames evict by bytes and least recent use, and never cross designs',()=>{
  const cache=new NativeFrames(32), image={width:2,height:2};
  cache.select('red');cache.put('back',image);cache.put('palm',image);
  assert.equal(cache.get('back'),image);cache.put('pinky',image);
  assert.equal(cache.get('palm'),undefined);assert.equal(cache.bytes,32);
  cache.put('huge',{width:100,height:100});assert.equal(cache.bytes,32);
  cache.select('blue');assert.equal(cache.bytes,0);assert.equal(cache.get('back'),undefined);
});

test('missing browser storage cannot reject startup or attempt a write',async()=>{
  const previous=globalThis.indexedDB;delete globalThis.indexedDB;
  try {
    const cache=new PublicRenders('revision');await cache.ready;
    assert.equal(await cache.read('starter:blank',2,2),null);
    assert.doesNotThrow(()=>cache.write('starter:blank',{width:2,height:2,toBlob(){throw Error('must not encode');}}));
    assert.equal(cache.failed,true);
  } finally {globalThis.indexedDB=previous;}
});

test('public cache rejects unknown keys, wrong dimensions, and non-PNG records',async()=>{
  const cache=new PublicRenders('revision','isolated-cold-key');await cache.ready;
  assert.equal(cache.prefix,'revision/isolated-cold-key/');
  cache.blobs.set('starter:blank',{width:2,height:2,blob:new Blob(['x'],{type:'image/jpeg'})});
  assert.equal(await cache.read('starter:blank',2,2),null);
  assert.equal(cache.blobs.has('starter:blank'),false,'invalid PNG can be replaced by a normal render');
  cache.blobs.set('starter:blank',{width:3,height:2,blob:new Blob(['x'],{type:'image/png'})});
  assert.equal(await cache.read('starter:blank',2,2),null);
  assert.equal(cache.blobs.has('starter:blank'),false,'wrong dimensions can be replaced');
  assert.equal(await cache.read('customer:private',2,2),null);
  assert.notEqual(new PublicRenders('new-revision').prefix,cache.prefix);
  assert.notEqual(new PublicRenders('revision','other-cold-key').prefix,cache.prefix);
});

test('public PNG decode failure releases its URL and uses normal rendering fallback',async()=>{
  const cache=new PublicRenders('revision');await cache.ready;
  const previous=globalThis.Image, revoke=URL.revokeObjectURL;let revoked=0;
  cache.blobs.set('default:back',{width:2,height:2,blob:new Blob(['bad'],{type:'image/png'})});
  globalThis.Image=class{set src(value){queueMicrotask(()=>this.onerror());}};
  URL.revokeObjectURL=()=>revoked++;
  try {assert.equal(await cache.read('default:back',2,2),null);assert.equal(revoked,1);assert.equal(cache.blobs.has('default:back'),false);}
  finally {globalThis.Image=previous;URL.revokeObjectURL=revoke;}
});
