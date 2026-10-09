// Shared compositing engine for the SSK glove configurator.
// Assets and palettes come from assets/glove-data.json, extracted verbatim
// from glove_builder/customiser/index.html in scottprins32-hub/ssk-glove-demo.

const gloveLoads = new Map();
const decodedImages = new Map();
const materialSurfaces = new WeakMap();
const materialColours = new Map();

// Retain render dependencies, not superseded tracing/review exports. Metadata
// references (including aliases, web inserts and material sources) are followed
// recursively; each diffuse layer brings its highlight partner with it.
function renderAssets(DATA) {
  const keys = new Set();
  const take = name => {
    if (typeof name !== 'string' || !DATA.assets[name] || keys.has(name)) return;
    keys.add(name); take(name + '_hi');
  };
  const walk = value => {
    if (typeof value === 'string') take(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (key !== 'bbox') walk(child);
    }
  };
  for (const [key, value] of Object.entries(DATA)) {
    if (!['assets','bbox','source','presets','palettes'].includes(key) && !key.startsWith('user')) walk(value);
  }
  for (const key of ['glove','_idmap','_hdLeather','_hdLace','_snakeLeather',
    'marks','pad','hood','bullet_logo','bullet_logo_tb','edge_gold','edge_silver','edge_gunmetal',
    'laces_web','laces_knot','stitching_web','welt_index','web_cut','knot_cut',
    'approved_h_common_cut','approved_h_cut','approved_h_openings','native_h_openings',
    'standard_remnants','master_pinky_openings','binding_thread_detail','thumb_circle_art']) take(key);
  return [...keys];
}
function decodeImage(src) {
  if (!decodedImages.has(src)) decodedImages.set(src, new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => { decodedImages.delete(src); reject(new Error('Image could not be loaded')); };
    im.src = src;
  }));
  return decodedImages.get(src);
}
export function loadGlove({ progressive = false, initialView = 'back' } = {}) {
  const mode = progressive ? 'progressive|' + initialView : 'complete';
  if (gloveLoads.has(mode)) return gloveLoads.get(mode);
  const pending = (async () => {
    const names = ['back','palm','thumb','pinky'];
    // Start metadata requests together, but never put an optional side's
    // metadata on the critical path of the back view.
    const metadata = names.map(async name => {
      const key = name === 'back' ? 'glove' : name;
      try {
        const inlined = window['__' + key.toUpperCase() + '_DATA__'];
        if (inlined) return structuredClone(inlined);
        const response = await fetch('assets/' + key + '-data.json');
        if (!response.ok) throw new Error('Glove data could not be loaded');
        return await response.json();
      } catch (error) { if (name === 'back') throw error; return null; }
    });
    const backData = await metadata[0], views = {};
    for (let i = 0; i < names.length; i++) {
      const v = { DATA: i === 0 ? backData : { w:backData.w, h:backData.h,
        zones:[], fieldsShown:[], fieldsNotShown:[], palettes:backData.palettes },
        imgs:{}, idData:null, ready:false, assetErrors:{} };
      let loading;
      v.load = () => loading || (loading = (async () => {
        const DATA = await metadata[i];
        if (!DATA) { v.absent = true; throw new Error('View data is unavailable'); }
        DATA.palettes = backData.palettes; v.DATA = DATA; v.error = null;
        const keys = renderAssets(DATA);
        // Hosted HTTPS benefits from HTTP/2 multiplexing. Keep the tighter
        // bound for local HTTP servers, where excessive sockets caused resets.
        const parallelImages = location.protocol === 'https:' ? 24 : 8;
        // Optional failed inserts/badges must not take the base glove down.
        // The existing palm SHA gate excludes missing/incorrect insert parts.
        // Core body/ID map/alias failures remain explicit and retryable.
        let next = 0;
        await Promise.all(Array.from({length: Math.min(parallelImages, keys.length)}, async () => {
          while (next < keys.length) {
            const key = keys[next++];
            try {
              v.imgs[key] = await decodeImage(DATA.assets[key]);
              delete v.assetErrors[key];
            } catch (error) { v.assetErrors[key] = error; }
          }
        }));
        const core = ['glove','_idmap', ...DATA.zones.map(z => z.id),
          ...Object.values(DATA.nativeHContour?.assets || {})];
        if (core.some(key => DATA.assets[key] && !v.imgs[key])) throw new Error('Glove body could not be loaded');
        const ic = document.createElement('canvas'); ic.width = DATA.w; ic.height = DATA.h;
        const g = ic.getContext('2d', { willReadFrequently: true });
        g.drawImage(v.imgs._idmap, 0, 0);
        v.idData = g.getImageData(0, 0, DATA.w, DATA.h).data;
        if (names[i] === 'palm') await verifyPalmWebs(v);
        v.ready = true; v.error = null;
        return v;
      })().catch(error => { loading = null; v.error = error; throw error; }));
      views[names[i]] = v;
    }
    await Promise.all((progressive ? [...new Set(['back', initialView])] : names)
      .map(name => views[name]?.load().catch(error => {
        if (name === 'back') throw error;
        if (!progressive) views[name] = null;
      })));
    return { ...views.back, views };
  })();
  gloveLoads.set(mode, pending);
  pending.catch(() => gloveLoads.delete(mode));
  return pending;
}

// PALM-P2 (outputs/2d-finish-plan/CONTRACT-PALM-P2.json): the six PALM-P1
// estimated web inserts plus the two reviewed I-web estimates, on the
// photographed palm. Nothing in palmWebs is trusted: the
// contract SHA, the mask and layer SHA-256s, each web's manifest/source/review
// pins (the I webs have their own review) and the role→zone map are compiled
// in below from the contract, and the
// JSON only has to agree with them. The bytes actually fetched are hashed
// against these pins, never against the JSON's own sha256. A bad contract,
// mask, role map, view or size takes every web out; a bad entry takes its web
// out. The masks are root's greyscale files, so luminance becomes alpha here
// and nowhere else.
const P1_REVIEW = '93acc944140f730716dccb2f3a27885bd07d68fd51ec7def140c923e35a74489';
const I_REVIEW = '2e8d7c4f524f9af62759e29ce9bc7e376d044cf763a820ea5ba12cf456d0e95e';
const PALM_P3 = {
  contract: '58041d2eb94edd6be7299a4668f08d32178409c6d5446757835af4485e9daeb7',
  footprint: 'ac2530572536613413ed62dfe76193f73970a8c2d466f9ef8cae97d9da78ccfd',
  protected: '8bc0dd8a99bf55fd0040efe12227429f724d97560ec665ac19b0dce71b210004',
  roles: { leather: ['web', 2, 'leather'], laces: ['laces', 7, 'lace'], stitching: ['stitching', 8, 'stitching'] },
  // web: [manifest, source, review evidence, leather, laces, stitching]
  webs: {
    smlee: ['f60af8605645206776fc239169c5eb9330bc84f1b2d6f467a6afa0f7fa9889d9', 'ee1a6cd156921a46c2fc932ab7bee5b4f3508aa34f6a19c796a94d18e2e1d58e', P1_REVIEW,
      'd767b08c4f76925a83c2b019df92ad79e19683b850033df915fe5b8171bf9b13', '3bd7c4628ecf91b83f9e31a335a9dd5ae76cd5c13bb91f2f015e0274a9fe080c', '3489f4a59af150e244cb0613b83c00b6fe5dd248f619fd79381b754d0677a4c4'],
    smk: ['0e1ef566fbd2b824322b2f08a1851b116713113995fc2346c98868c1885a51dc', 'f7414dd5a2138f035b501c2979d4b7a5eac55ae89904424d309c37da7d89ff1d', P1_REVIEW,
      '518f55bab9fe717bb671701b584f518939c1c71726f6db9da9178040645218fe', '3bd7c4628ecf91b83f9e31a335a9dd5ae76cd5c13bb91f2f015e0274a9fe080c', 'df5d24be00087683129dc03a151a595bd74821594da585a62d6a65f542334a65'],
    'em-rocket': ['d4da5aa85c51160c22ddeb5066ff89e0326bd5742c7293cb1368ea08f49060eb', 'ddc2239dc737b7f4593a048d1f7c72432da07e09eab025cbf273f667bd3a5082', P1_REVIEW,
      'feb6af7ff7bd56354dcdfbfa15ebd75b1a8f4265e97a2eb84a51f0ab3009f35b', '1e6979bb1972947bb5f1b85e1ae35aeb9cbbb9ae6f66171fb7ba3f526f523075', '527a7a19bc57eb0497187497670ed6e08df2291dceb15ebe90d2afd06707ce3a'],
    'closed-diamond-net': ['21f16b8ae459a53978353f3e499c67f320f8e91c1e6dfacefdc8b6a2cb37ae21', 'a79ad42540f26e554c7a8a1c0e23e312d872bd31b8d40c19ac70212718272764', P1_REVIEW,
      'e23455b1e110365018bcb61ac583cb2d5e466997d20245879a874a725bc57319', '7002cd343e9620b65ac6aa2f0185fb803a3463db5ee8c9f060e08fcc19166940', 'cbde9fe2f35935d518cb5134bac84c7178439c0f9b0ccdc8fe14a95ca02a393f'],
    'modified-trapeze': ['bb9959f42b72cea8b9a234d4b9a6b89490bb88051a025e8887647e9dc0a9823c', '3a66480b16270f95791d288de6eee981b1123479264392045fba5dcd504b9407', P1_REVIEW,
      '85aa5a1109a7d1683529ec1b828c995668c75f3057c9c0809413abba5e0d5456', '470175ac781e3bf041d505f74f11ba7cf32358f6014dfaf5c59a9609c17dedcb', 'd76c4c42aae0a99097cdfa1669f92a42fed8ceadd4d317b1431cc5562807113c'],
    trapeze: ['e6067a0071dfc15e364f924b36c0b791b98bdcdb4a9ccd0c140e11dfa30f3699', '734e29aa47e6be73341f67d19463ca2362dc11fd9a4a7f6a30adf54ca6398225', P1_REVIEW,
      '5ec509373453d36945e8b99cd68cffc99f14f491aeff60ce2276dc3cc0b5d8b6', '1f8ebb5f8f0cd59079842ae8d4e0b2d15db79743f60f1ed6e9bc5c4d5af8ab39', '48bbaef61ddca0454e8ffe8eb56a9f5dadc7679d369ba1c594a2a8f5aeedc7a5'],
    'standard-i': ["142bb7d7460a185b313ebb828c462e0c7131d19ddc038d94a73dd58bd83d6ab5","d79decf75aab9c215d43a061ef91aa2d66c71e674c08aa6793861da8bdfb5707","d72b82528dc4d3c172c64d5225b6b07cc71ab69e2e024a1c0d63324ae9c812a1","165db51c60f30c2b642bda357d702fe9570f07782f9b64f24fb3ba257d1613bf","c3b02db336374a649340c70141ff68b74eb9bb2dfe2bded9a2205fa16fa8a3d8","29bc5e7f299f6e6fe88bee407afaa36e658a4738dfd6d82e8a063866feef5e7e","9df277dda0e3cbf701ec07148273d2d800fe6a4e695608b6b1a78c92f2bf3381"],
    'spiral-i': ["03d57b94f7003ced4436d01542031df331dfc6a0ed906d7364570a79271a5f02","0392b4fbf14124048e3391debdd91f0b038b1f97a32777e0f09f1c04205f6e7a","d72b82528dc4d3c172c64d5225b6b07cc71ab69e2e024a1c0d63324ae9c812a1","91db7ffa2588c2c87b6a66f0ff736f95f663f23ba9b47fa2a68998ebba5b7a52","cd0a5a63e7f5936b8aa8a453009500a0474c1e5d90b7c62ecc42b65955897d67","805ff52e851e0c57faed9c51399b52c1330c536cfff45e0d4ff37b4e8e35b1e5","0cc1bf3e7de14a3483b3ae5a9ca5d04bf9b7ff60623492fed7f6a442b0b20395"],
  },
};
async function verifyPalmWebs(v) {
  const P = v.DATA.palmWebs;
  if (!P) return;
  v.DATA.palmWebs = null;
  const { DATA, imgs } = v, W = DATA.w, H = DATA.h, T = PALM_P3;
  const same = (a, b) => JSON.stringify(Object.keys(a || {}).sort()) === JSON.stringify(Object.keys(b).sort());
  if (P.view !== 'palm' || P.contract?.revision !== 'PALM-P3' || P.contract?.sha256 !== T.contract
      || P.dimensions?.[0] !== W || P.dimensions?.[1] !== H || W !== 1534 || H !== 1400 || !crypto?.subtle) return;
  if (!same(P.roles, T.roles)) return;
  for (const [role, [id, n, group]] of Object.entries(T.roles)) {
    if (P.roles[role] !== id) return;
    const z = DATA.zones.filter(z => z.n === n);
    if (z.length !== 1 || z[0].id !== id || z[0].group !== group
        || DATA.zones.filter(z => z.id === id).length !== 1) return;
  }
  // The bytes behind an asset key, hashed once per URL.
  const hashes = new Map();
  const ok = async (part, want) => {
    if (!part || typeof part.asset !== 'string' || part.sha256 !== want) return false;
    // tinted() places the layer by its box. Every reviewed PALM-P2 layer is
    // full-frame, so the box must be exactly [0, 0, W, H]: a shifted,
    // cropped or empty box would move or erase a verified layer.
    const box = DATA.bbox?.[part.asset];
    if (!Array.isArray(box) || box.length !== 4
        || ![0, 0, W, H].every((n, i) => Object.is(box[i], n))) return false;
    const im = imgs[part.asset], url = DATA.assets[part.asset];
    if (!im || typeof url !== 'string' || im.naturalWidth !== W || im.naturalHeight !== H) return false;
    if (!hashes.has(url)) hashes.set(url, (async () => {
      try {
        const buf = await (await fetch(url)).arrayBuffer();
        return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))]
          .map(b => b.toString(16).padStart(2, '0')).join('');
      } catch { return null; }
    })());
    return (await hashes.get(url)) === want;
  };
  if (!(await ok(P.footprint, T.footprint)) || !(await ok(P.protected, T.protected))) return;
  for (const m of [P.footprint, P.protected]) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(imgs[m.asset], 0, 0);
    const d = g.getImageData(0, 0, W, H);
    for (let i = 0; i < d.data.length; i += 4) {
      const a = Math.round(d.data[i] * d.data[i + 3] / 255);
      d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a;
    }
    g.putImageData(d, 0, 0);
    imgs[m.asset + '#alpha'] = c;
  }
  const entries = {};
  for (const [web, [manifest, source, evidence, ...layers]] of Object.entries(T.webs)) {
    const e = P.entries?.[web];
    if (!e || e.status !== 'estimated' || e.manifestSHA256 !== manifest || e.sourceSHA256 !== source
        || e.assetReview?.verdict !== 'PASS' || e.assetReview?.evidenceSHA256 !== evidence
        || !same(e.parts, T.roles)) continue;
    const roles = Object.keys(T.roles);
    if (!(await Promise.all(roles.map((k, i) => ok(e.parts[k], layers[i])))).every(Boolean)) continue;
    // Only a compiled, reviewed fourth layer may extend the continuous palm
    // beneath an I-web. Arbitrary metadata cannot introduce a new role.
    const supportHash = layers[3];
    if (supportHash) {
      const palms = DATA.zones.filter(z => z.id === 'palm' || z.n === 1);
      if (palms.length !== 1 || palms[0].id !== 'palm' || palms[0].n !== 1
          || palms[0].group !== 'leather' || !(await ok(e.palmSupport, supportHash))) continue;
    } else if (e.palmSupport) continue;
    entries[web] = { status: 'estimated', manifestSHA256: manifest, sourceSHA256: source,
      assetReview: { verdict: 'PASS', scope: e.assetReview.scope, evidenceSHA256: evidence },
      ...(supportHash ? { palmSupport: { asset: e.palmSupport.asset, sha256: supportHash } } : {}),
      parts: Object.fromEntries(roles.map((k, i) => [k, { asset: e.parts[k].asset, sha256: layers[i] }])) };
  }
  v.DATA.palmWebs = { ...P, contract: { ...P.contract, sha256: T.contract },
    roles: Object.fromEntries(Object.entries(T.roles).map(([k, [id]]) => [k, id])),
    footprint: { asset: P.footprint.asset, sha256: T.footprint },
    protected: { asset: P.protected.asset, sha256: T.protected }, entries };
}

export function shade(hx, f) {
  const n = parseInt(hx.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = f > 0 ? 255 : 0, k = Math.abs(f);
  r = Math.round(r + (t - r) * k); g = Math.round(g + (t - g) * k);
  b = Math.round(b + (t - b) * k);
  return `rgb(${r},${g},${b})`;
}

// Per-zone, per-colour tinted layers are cached at the layer's bounding box,
// so changing one colour re-tints one small rectangle instead of the whole
// 929x1100 stack. A redraw is then ~18 drawImage calls.
export class GloveRenderer {
  constructor(bundle) {
    this.views = bundle.views || { back: bundle };
    this.view = 'back';
    this.DATA = bundle.DATA;
    this.imgs = bundle.imgs;
    this.idData = bundle.idData;
    this.cache = new Map();
    this.order = [];
    this.materialCache = materialSurfaces;
    this.off = document.createElement('canvas');
    this.off.width = this.DATA.w; this.off.height = this.DATA.h;
    this.octx = this.off.getContext('2d');
  }

  // Which side of the glove is being drawn. The tint cache is keyed by zone
  // id and colour, and four ids — palm, web, binding, laces — exist on both
  // views with different pixels behind them, so it has to go.
  // Material selection is independent from colour and cannot target small
  // trims, web leather or the palm fold. Values are render-zone ids.
  setMaterials(input = {}) {
    const allowed = ['back1','back2','back3','back4','back5','back6','back7','back8','back9','back78','belt'];
    const next = Object.fromEntries(allowed.filter(k=>input[k]==='snakeskin').map(k=>[k,'snakeskin']));
    const key=JSON.stringify(next);
    if(key===this.materialSelectionKey)return;
    this.materialSelectionKey=key;this.materials=next;
    this.cache.clear();this.order=[];
  }

  setView(name) {
    const v = this.views[name];
    if (!v || name === this.view) return !!v;
    this.view = name;
    this.DATA = v.DATA; this.imgs = v.imgs; this.idData = v.idData;
    this.nativeContourKey = null; // setView restored the base assets; reselect aliases on draw/pick.
    this.cache.clear(); this.order = [];
    this.off.width = this.DATA.w; this.off.height = this.DATA.h;
    return true;
  }

  // User H-web contours are native-H-only. Alternate thumb inserts keep the
  // original photographed base; never leak the H perimeter into another web.
  syncNativeHContour() {
    const base = this.views[this.view];
    const def = base.DATA.nativeHContour;
    const active = this.view === 'thumb' && !this.web && !this.webMarked && def;
    const key = this.view + '|' + (active ? def.revision : 'base');
    if (this.nativeContourKey === key) return;
    this.DATA = base.DATA; this.imgs = base.imgs; this.idData = base.idData;
    if (active) {
      if (!this.nativeContourBundle || this.nativeContourBundle.base !== base) {
        const imgs = { ...base.imgs };
        for (const [zone, asset] of Object.entries(def.assets)) imgs[zone] = base.imgs[asset];
        const c = document.createElement('canvas'); c.width=base.DATA.w; c.height=base.DATA.h;
        const g = c.getContext('2d'); g.drawImage(imgs._idmap,0,0);
        this.nativeContourBundle = { base, imgs, DATA: { ...base.DATA,
          bbox: { ...base.DATA.bbox, ...def.bbox },
          zones: def.zones || base.DATA.zones, fieldsShown: def.fieldsShown || base.DATA.fieldsShown,
          fieldsNotShown: def.fieldsNotShown || base.DATA.fieldsNotShown },
          idData: g.getImageData(0,0,c.width,c.height).data };
      }
      Object.assign(this, { DATA:this.nativeContourBundle.DATA,
        imgs:this.nativeContourBundle.imgs, idData:this.nativeContourBundle.idData });
    }
    this.nativeContourKey=key; this.cache.clear(); this.order=[];
  }

  hasView(name) { return !!this.views[name] && !this.views[name].absent; }

  hex(zoneId, state) {
    const z = this.DATA.zones.find(z => z.id === zoneId);
    const pal = this.DATA.palettes[z.group];
    const c = pal.find(c => c[0] === state[zoneId]);
    return c ? c[2] : '#C4C9D0';   // --gray-300, matching app.js
  }

  // The photographed hood covers web lacing at the index finger. Mask in
  // layer coordinates so the same construction holds for either hand.
  // keep: a layer-space rect [x0,y0,x1,y1] left unmasked (padUnder: the
  // binding and lining go back over the pad's lower end).
  underPad(c, keep) {
    const pad = this.pad && this.imgs[this.pad];
    if (!pad) return c;
    const masked = document.createElement('canvas');
    masked.width = c.width; masked.height = c.height;
    const g = masked.getContext('2d');
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(pad, -c._ox, -c._oy);
    if (keep) {
      // copy, not source-over: the original replaces what the mask kept
      // there, so antialiased edges outside the pad are not drawn twice.
      g.globalCompositeOperation = 'copy';
      g.save();
      g.beginPath();
      g.rect(keep[0] - c._ox, keep[1] - c._oy, keep[2] - keep[0], keep[3] - keep[1]);
      g.clip();
      g.drawImage(c, 0, 0);
      g.restore();
    }
    masked._ox = c._ox; masked._oy = c._oy;
    return masked;
  }

  // A cut drawn after the pad must not open a seam through it: the pad is
  // leather laid over the finger, so its footprint is taken out of the cut.
  // With no pad the cut image itself is returned, so nothing else changes.
  sparePad(cut) {
    const pad = this.pad && this.imgs[this.pad];
    if (!pad || !cut) return cut;
    const key = 'spare|' + this.pad + '|' + (cut.src || cut._key || '');
    const hit = cut.src || cut._key ? this.cache.get(key) : null;
    if (hit) return hit;
    const masked = document.createElement('canvas');
    masked.width = cut.width; masked.height = cut.height;
    const g = masked.getContext('2d');
    g.drawImage(cut, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(pad, 0, 0);
    if (cut.src || cut._key) this.cache.set(key, masked);
    return masked;
  }

  // Remove the stock web stitching's soft rim only when replacing its web.
  outsideWeb(c) {
    if (!this.imgs.web_cut) return c;
    const masked = document.createElement('canvas');
    masked.width = c.width; masked.height = c.height;
    const g = masked.getContext('2d');
    g.drawImage(c, 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(this.imgs.web_cut, -c._ox, -c._oy);
    masked._ox = c._ox; masked._oy = c._oy;
    return masked;
  }

  // Material response is shared across photographs and estimated inserts.
  // Normalize source light and add material detail; masks and ownership stay unchanged.
  // Embroidery, thread, logos and flags keep their existing render path.
  materialSurface(id, role) {
    // Two ownership pieces cut from one source keep that source's illumination.
    // Boxes remain identical: a colour-only split must not relight either piece.
    const source = this.DATA.materialSources?.[id];
    if (source && source !== id && this.imgs[source]
        && this.DATA.bbox[source]?.every((v,i) => v === this.DATA.bbox[id][i])) {
      return this.materialSurface(source, role);
    }
    const zone = this.DATA.zones.find(z => z.id === role);
    const leather = ['pad', 'hood'].includes(role)
      || zone && ['leather', 'lace'].includes(zone.group);
    if (!leather) return null;
    const img = this.imgs[id], hi = this.imgs[id + '_hi'];
    let surfaces = this.materialCache.get(img);
    if (!surfaces) { surfaces = new Map(); this.materialCache.set(img, surfaces); }
    const response = this.DATA.materialResponse?.[id];
    const surfaceKey = JSON.stringify([role, this.materials?.[role] || 'standard',
      this.DATA.h, this.DATA.bbox[id], response]);
    let surface = surfaces.get(surfaceKey);
    if (surface && surface.hi === hi && surface.texture === this.imgs._hdLeather
        && surface.laceTexture === this.imgs._hdLace && surface.snakeTexture === this.imgs._snakeLeather) return surface;
    const [x0,y0,x1,y1] = this.DATA.bbox[id];
    const c = document.createElement('canvas'); c.width=x1-x0; c.height=y1-y0;
    const g = c.getContext('2d', {willReadFrequently:true});
    g.drawImage(img,-x0,-y0);
    const base=g.getImageData(0,0,c.width,c.height).data;
    g.clearRect(0,0,c.width,c.height);
    if(hi)g.drawImage(hi,-x0,-y0);
    const light=g.getImageData(0,0,c.width,c.height).data;
    const tone=new Float32Array(c.width*c.height), hist=new Uint32Array(766);
    let n=0;
    for(let i=0,j=0;i<base.length;i+=4,j++){
      // Source pairs split diffuse and specular at neutral grey. Recombine
      // for calibration so clipped white diffuse retains its highlight detail.
      const v=(base[i]+base[i+1]+base[i+2])/3
        +2*(light[i]+light[i+1]+light[i+2])/3*light[i+3]/255;
      tone[j]=v;
      if(base[i+3]>=245){hist[Math.min(765,Math.round(v))]++;n++;}
    }
    if(n<64)return null; // no invented texture on empty/tiny masks
    const quantile=q=>{let total=0;for(let i=0;i<hist.length;i++){total+=hist[i];if(total>=n*q)return i;}return 255;};
    const lo=quantile(.1),mid=quantile(.5),high=quantile(.9);
    // A common midtone and highlight headroom. Only compress contrast:
    // expanding a flat cutout would amplify pores/noise into false relief.
    const lower=Math.min(1,(response?.shadowRange ?? 40)/Math.max(1,mid-lo));
    const upper=Math.min(1,22/Math.max(1,high-mid));
    for(let j=0;j<tone.length;j++){
      const v=tone[j];
      tone[j]=Math.max(0,Math.min(280,248+(v-mid)*(v<mid?lower:upper)));
    }
    // The generated input is material only. Source geometry, masks and all
    // picking remain unchanged. Embroidery/thread never enter this path.
    if (this.imgs._hdLeather) {
      const w=c.width,h=c.height,radius=Math.max(1,Math.round(this.DATA.h/550));
      const weights=new Float32Array(tone.length), weighted=new Float32Array(tone.length);
      for(let j=0;j<tone.length;j++){weights[j]=base[j*4+3]/255;weighted[j]=tone[j]*weights[j];}
      const box=(src)=>{
        const tmp=new Float32Array(src.length),out=new Float32Array(src.length);
        for(let y=0;y<h;y++){let sum=0;for(let x=0;x<=radius&&x<w;x++)sum+=src[y*w+x];
          for(let x=0;x<w;x++){tmp[y*w+x]=sum;if(x-radius>=0)sum-=src[y*w+x-radius];if(x+radius+1<w)sum+=src[y*w+x+radius+1];}}
        for(let x=0;x<w;x++){let sum=0;for(let y=0;y<=radius&&y<h;y++)sum+=tmp[y*w+x];
          for(let y=0;y<h;y++){out[y*w+x]=sum;if(y-radius>=0)sum-=tmp[(y-radius)*w+x];if(y+radius+1<h)sum+=tmp[(y+radius+1)*w+x];}}
        return out;
      };
      const snake=this.materials?.[role]==='snakeskin' && !!this.imgs._snakeLeather;
      const blur=box(weighted),weight=box(weights),tex=this.leatherGrain(snake,zone?.group==='lace');
      const lace=zone?.group==='lace',strength=snake?17:lace?2.2:8.5;
      // The material coordinates are separable: wrap each row/column once,
      // not twice per pixel. This preserves the exact same texture samples.
      const tx=Int32Array.from({length:w},(_,x)=>tex.wrap(x+x0));
      const ty=Int32Array.from({length:h},(_,y)=>tex.wrap(y+y0)*tex.size);
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const j=y*w+x;if(!weights[j])continue;
        const macro=weight[j]>0?blur[j]/weight[j]:tone[j],detail=tone[j]-macro;
        // Keep dark stitch/crease edges that remain in photographed leather;
        // suppress only the noisy high-frequency illumination around them.
        const retained=detail < -9 ? detail : detail*.24;
        const grain=tex.values[ty[y]+tx[x]];
        tone[j]=Math.max(0,Math.min(298,(response?.midtone ?? (snake||lace?246:248))+(macro-248)*(response?.relief ?? (snake||lace?1.2:1.35))+retained+grain*strength));
      }
    }
    surface={hi,tone,base,lo,mid,high,lower,upper,role,
      texture:this.imgs._hdLeather, laceTexture:this.imgs._hdLace, snakeTexture:this.imgs._snakeLeather};
    surfaces.set(surfaceKey,surface);
    return surface;
  }

  leatherGrain(snake = false, lace = false) {
    const im=this.imgs[snake?'_snakeLeather':lace?'_hdLace':'_hdLeather'], size=Math.max(128,Math.round(this.DATA.h*(snake?.40:.5)));
    const key='hd-leather|'+snake+'|'+lace+'|'+size;
    if(this.cache.has(key))return this.cache.get(key);
    const c=document.createElement('canvas');c.width=c.height=size;
    const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0,size,size);
    const p=g.getImageData(0,0,size,size).data,values=new Float32Array(size*size);
    let sum=0,sum2=0;
    for(let j=0;j<values.length;j++){const v=p[j*4];values[j]=v;sum+=v;sum2+=v*v;}
    const mean=sum/values.length,sd=Math.max(1,Math.sqrt(sum2/values.length-mean*mean));
    for(let j=0;j<values.length;j++)values[j]=Math.max(-2.6,Math.min(2.6,(values[j]-mean)/sd));
    // Mirrored repeat has no edge discontinuity, even if generated tile edges
    // are not exactly periodic. Coordinates follow the view, never a panel bbox.
    const wrap=v=>{v=((v%(2*size))+2*size)%(2*size);return v<size?v:2*size-1-v;};
    const result={values,size,wrap,sample:(x,y)=>values[wrap(y)*size+wrap(x)]};this.cache.set(key,result);return result;
  }

  tinted(id, hx, sheenOf = id, materialOf = sheenOf) {
    const key = id + '|' + hx + '|' + sheenOf + '|' + materialOf;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const [x0, y0, x1, y1] = this.DATA.bbox[id];
    const c = document.createElement('canvas');
    c.width = Math.max(1, x1 - x0); c.height = Math.max(1, y1 - y0);
    const g = c.getContext('2d', {willReadFrequently:true});
    g.drawImage(this.imgs[id], -x0, -y0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = hx;
    g.fillRect(0, 0, c.width, c.height);
    // A multiply can only darken, so the leather's sheen has to be added
    // rather than tinted — that is what keeps highlights on a white glove
    // and stops a black one flattening into a silhouette.
    //
    // How MUCH sheen is not the layer's to decide. Every highlight was cut
    // from one photograph and carries that glove's own lighting: unscaled,
    // the belt adds 38 per channel where the middle finger adds 5, so a
    // customer who picks Navy everywhere gets a grey belt. DATA.sheen holds
    // the per-layer scale that evens them out — measured by
    // glove_builder/sheen.py, not tuned by eye.
    const hi = this.imgs[id + '_hi'];
    if (hi) {
      const k = (this.DATA.sheen || {})[sheenOf];
      g.globalCompositeOperation = 'lighter';
      if (k != null) g.globalAlpha = k;
      g.drawImage(hi, -x0, -y0);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(this.imgs[id], -x0, -y0);
    const surface = this.materialSurface(id, materialOf);
    if (surface) {
      // Preserve the original composited alpha, including anti-alias coverage.
      const pixels=g.getImageData(0,0,c.width,c.height), rgba=pixels.data;
      let rgb=materialColours.get(hx);
      if (!rgb) {
        if (/^#[0-9a-f]{6}$/i.test(hx)) {
          const value=parseInt(hx.slice(1),16); rgb=[value>>16,(value>>8)&255,value&255];
        } else {
          const colour=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
          colour.canvas.width=colour.canvas.height=1;colour.fillStyle=hx;colour.fillRect(0,0,1,1);
          rgb=colour.getImageData(0,0,1,1).data;
        }
        materialColours.set(hx,rgb);
      }
      const [red,green,blue]=rgb;
      for(let i=0,j=0;i<rgba.length;i+=4,j++)if(rgba[i+3]){
        const v=surface.tone[j],diffuse=Math.min(255,v)/255,specular=Math.max(0,v-255)/2;
        rgba[i]=Math.min(255,Math.round(red*diffuse+specular));
        rgba[i+1]=Math.min(255,Math.round(green*diffuse+specular));
        rgba[i+2]=Math.min(255,Math.round(blue*diffuse+specular));
      }
      g.putImageData(pixels,0,0);
    }
    c._ox = x0; c._oy = y0;
    this.cache.set(key, c);
    this.order.push(key);
    if (this.order.length > 240) this.cache.delete(this.order.shift());
    return c;
  }

  /* A left-handed glove is a right-handed one mirrored — that is how they
     are built, and how SSK's own form offers them. So the whole render is
     flipped horizontally. Letters and logos are not symmetric, though: under
     that flip the SSK wordmark, the bullet patch and the flag all come out
     backwards. Flipping a mark about its OWN centre first cancels against the
     global flip, so it lands on the mirrored side of the glove and still
     reads the right way round. */
  unmirror(ctx, x0, x1, on, fn) {
    if (!on) return fn();
    ctx.save();
    ctx.translate(x0 + x1, 0);
    ctx.scale(-1, 1);
    fn();
    ctx.restore();
  }

  drawBullet(ctx, bulletSel) {
    const opt = this.DATA.bullets[bulletSel];
    const imgs = this.imgs;
    if (!imgs.bullet_logo) return;
    // A photographed patch wins over everything: the rainbow one has no tint
    // (it is four threads and a blue border) but does have its own asset.
    if (opt && opt.asset && imgs[opt.asset]) { ctx.drawImage(imgs[opt.asset], 0, 0); return; }
    if (!opt || opt.tint === null) { ctx.drawImage(imgs.bullet_logo, 0, 0); return; }
    const bb = this.DATA.bulletBox;
    const octx = this.octx, off = this.off;
    octx.clearRect(0, 0, off.width, off.height);
    octx.globalCompositeOperation = 'source-over';
    if (opt.material === 'rubber' || opt.material === 'plastic') {
      const g = octx.createLinearGradient(0, bb[1], 0, bb[3]);
      if (opt.material === 'rubber') {
        g.addColorStop(0, shade(opt.tint, 0.62));
        g.addColorStop(0.35, opt.tint);
        g.addColorStop(0.62, shade(opt.tint, -0.28));
        g.addColorStop(0.78, shade(opt.tint, 0.30));
        g.addColorStop(1, shade(opt.tint, -0.45));
      } else {
        g.addColorStop(0, shade(opt.tint, 0.55));
        g.addColorStop(0.5, opt.tint);
        g.addColorStop(1, shade(opt.tint, -0.22));
      }
      octx.fillStyle = g;
      octx.fillRect(bb[0] - 4, bb[1] - 4, bb[2] - bb[0] + 8, bb[3] - bb[1] + 8);
      octx.globalCompositeOperation = 'destination-in';
      octx.drawImage(imgs.bullet_logo_tb, 0, 0);
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.filter = 'brightness(0)';
      ctx.drawImage(imgs.bullet_logo_tb, 2, 3);
      ctx.filter = 'none';
      ctx.restore();
      ctx.drawImage(off, 0, 0);
      if (opt.material === 'plastic') {
        ctx.save();
        ctx.beginPath();
        ctx.rect(bb[0], bb[1], bb[2] - bb[0], (bb[3] - bb[1]) * 0.32);
        ctx.clip();
        ctx.globalAlpha = 0.30;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bb[0], bb[1], bb[2] - bb[0], (bb[3] - bb[1]) * 0.32);
        ctx.restore();
      }
      return;
    }
    octx.drawImage(imgs.bullet_logo_tb, 0, 0);
    octx.globalCompositeOperation = 'multiply';
    octx.fillStyle = opt.tint;
    octx.fillRect(0, 0, off.width, off.height);
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(imgs.bullet_logo_tb, 0, 0);
    ctx.drawImage(off, 0, 0);
  }

  // Eight small SVGs. Decoding them up front keeps setFlag synchronous, which
  // is what the starter thumbnails need — they draw one glove per frame and
  // cannot wait on a load.
  preloadFlags(srcs) {
    this._flags = this._flags || {};
    return Promise.all([...new Set(srcs.filter(Boolean))].map(src =>
      new Promise(res => {
        const im = new Image();
        im.onload = () => { this._flags[src] = im; res(); };
        im.onerror = res;
        im.src = src;
      })));
  }

  // The flag patch on the index finger. SVGs decode asynchronously, so the
  // app hands over a URL and gets a callback once there is something to draw.
  setFlag(src, onReady, position = 'index') {
    this.flagPosition = position === 'middle' ? 'middle' : 'index';
    this._flags = this._flags || {};
    this.flagSrc = src || null;
    this.flagImg = src ? (this._flags[src] || null) : null;
    if (!src || this.flagImg) return;
    const im = new Image();
    im.onload = () => {
      this._flags[src] = im;
      if (this.flagSrc === src) { this.flagImg = im; if (onReady) onReady(); }
    };
    im.src = src;
  }

  // Which of the two things can be fitted to the index finger — 'pad',
  // 'hood', or nothing — and in what colour. White until the customer picks
  // one, which is the order the form asks in. Both are one piece of leather
  // laid over the finger, cut from SSK's own photograph of it, and both
  // render the same way.
  setPad(part, hex) {
    this.pad = (part === true) ? 'pad' : (part || null);
    this.padHex = hex || '#F2F0EA';
  }

  // Whether the chosen web is one a side view has no photograph of.
  setWebMarked(on) { this.webMarked = !!on; }

  // Grey stripes in the shape of a layer's alpha, cached per layer.
  hatch(id) {
    const key = 'hatch|' + id;
    let c = this.cache.get(key);
    if (c) return c;
    const D = this.DATA;
    c = document.createElement('canvas');
    c.width = D.w; c.height = D.h;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(40,40,40,0.55)';
    g.fillRect(0, 0, D.w, D.h);
    g.strokeStyle = 'rgba(255,255,255,0.75)';
    g.lineWidth = 6;
    for (let x = -D.h; x < D.w; x += 22) {
      g.beginPath(); g.moveTo(x, D.h); g.lineTo(x + D.h, 0); g.stroke();
    }
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(this.imgs[id], 0, 0);
    this.cache.set(key, c);
    return c;
  }

  // Which web to render, by slug, or null for the glove's own.
  setWeb(slug) {
    this.web = slug && (this.DATA.webs?.[slug] || this.DATA.thumbWebs?.[slug]
      || this.DATA.palmWebs?.entries?.[slug]) ? slug : null;
  }

  // Reuse a photographed, cleaned lace knot at the attachment point of a
  // replacement web. Source/target rectangles are native view coordinates;
  // the normal draw transform mirrors this together with the glove.
  webAttachment(hx) {
    const p = this.DATA.webs?.[this.web]?.attachment;
    if (!p || !this.imgs[p.asset] || !this.DATA.bbox[p.asset]) return null;
    const key = 'web-attachment|' + this.web + '|' + hx;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = document.createElement('canvas'); c.width = this.DATA.w; c.height = this.DATA.h;
    const g = c.getContext('2d'), t = this.tinted(p.asset, hx, p.asset, 'laces');
    const [sx, sy, sw, sh] = p.source, [dx, dy, dw, dh] = p.target;
    g.drawImage(t, sx - t._ox, sy - t._oy, sw, sh, dx, dy, dw, dh);
    c._ox = c._oy = 0;
    this.cache.set(key, c);
    return c;
  }

  // The insert's own parts, tinted, cut to the footprint: right-handed layer
  // space, like every other layer.
  palmInsertLayer(e, state) {
    const D = this.DATA, P = D.palmWebs;
    const hx = Object.values(P.roles).map(z => this.hex(z, state));
    if (e.palmSupport) hx.push(this.hex('palm', state));
    const key = 'palm-insert|' + this.web + '|' + hx.join();
    let c = this.cache.get(key);
    if (c) return c;
    c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
    const g = c.getContext('2d');
    if (e.palmSupport) {
      const t = this.tinted(e.palmSupport.asset, this.hex('palm', state), e.palmSupport.asset, 'palm');
      g.drawImage(t, t._ox, t._oy);
    }
    for (const [part, zone] of Object.entries(P.roles)) {
      const t = this.tinted(e.parts[part].asset, this.hex(zone, state), e.parts[part].asset, zone);
      g.drawImage(t, t._ox, t._oy);
    }
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(this.imgs[P.footprint.asset + '#alpha'], 0, 0);
    this.cache.set(key, c); this.order.push(key);
    if (this.order.length > 240) this.cache.delete(this.order.shift());
    return c;
  }

  // Alpha of one layer, for picking. Kept out of the eviction list, like hit|.
  palmAlpha(asset) {
    const key = 'palm-alpha|' + asset;
    let a = this.cache.get(key);
    if (a) return a;
    const D = this.DATA, c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(this.imgs[asset + '#alpha'] || this.imgs[asset], 0, 0);
    const d = g.getImageData(0, 0, D.w, D.h).data;
    a = new Uint8Array(D.w * D.h);
    for (let j = 0; j < a.length; j++) a[j] = d[j * 4 + 3];
    this.cache.set(key, a);
    return a;
  }

  // Union of a set of layers, kept for masking. Not in the tint cache's
  // eviction list — there is one of these and it never changes.
  panelMask(ids) {
    const key = 'mask|' + ids.join(',');
    let c = this.cache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = this.DATA.w; c.height = this.DATA.h;
    const g = c.getContext('2d');
    for (const id of ids) if (this.imgs[id]) g.drawImage(this.imgs[id], 0, 0);
    this.cache.set(key, c);
    return c;
  }

  // A rectangular embroidered patch, laid on the index finger the way SSK
  // sews it: a quarter turn, so the stripes run along the finger, with the
  // leather's own shading multiplied back over it.
  flagMount() {
    if (!this.DATA.flagMount) return null;
    return this.flagPosition === 'middle' ? this.DATA.flagMounts?.middle : this.DATA.flagMount;
  }
  flagPanelMask(ids, mirror) {
    // Cloth bridges the split finger. Keep the exterior antialiasing, but
    // make each interior row opaque so a photographed welt groove cannot
    // turn into transparency inside the embroidered patch.
    const solidKey='flag-solid|'+ids.join(',');
    let mask=this.cache.get(solidKey);
    if(!mask){
      const source=this.panelMask(ids);
      mask=document.createElement('canvas');mask.width=source.width;mask.height=source.height;
      const g=mask.getContext('2d');g.drawImage(source,0,0);
      const pixels=g.getImageData(0,0,mask.width,mask.height),a=pixels.data;
      for(let y=0;y<mask.height;y++){
        let first=-1,last=-1;
        for(let x=0;x<mask.width;x++)if(a[(y*mask.width+x)*4+3]>=192){if(first<0)first=x;last=x;}
        for(let x=first+1;first>=0&&x<last;x++)a[(y*mask.width+x)*4+3]=255;
      }
      g.putImageData(pixels,0,0);this.cache.set(solidKey,mask);
    }
    if (!mirror || this.flagPosition !== 'middle') return mask;
    const key = 'flag-mask|' + ids.join(',') + '|' + this.flagMount().cx;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = document.createElement('canvas'); c.width = mask.width; c.height = mask.height;
    const g = c.getContext('2d'); g.setTransform(-1, 0, 0, 1, 2 * this.flagMount().cx, 0);
    g.drawImage(mask, 0, 0); this.cache.set(key, c); return c;
  }
  drawFlag(ctx, mirror) {
    const M = this.flagMount(), im = this.flagImg;
    if (!M || !im) return;
    // The patch is sewn along the finger, and the finger leans the other way
    // on a left-handed glove. The patch is flipped back about its own centre
    // so it stays readable, which leaves its LEAN right-handed — the same
    // fault the SSK wordmark had, and Scott saw it on both: "somehow the flag
    // also goes, which is weird... and the curvature of the SSK logo on the
    // ring finger is still curved as a righty glove." Negating the angle
    // leans it with the finger it is sewn to.
    const ang = mirror ? -M.angle : M.angle;
    // The patch is as wide as the finger allows; its length follows the flag's
    // own proportions, so the Stars and Stripes (19:10) does not get squashed
    // into the 3:2 the mount was measured at.
    const ar = im.naturalWidth && im.naturalHeight
      ? im.naturalWidth / im.naturalHeight : M.h / M.w;
    const L = M.w * ar;
    const octx = this.octx, off = this.off;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.globalCompositeOperation = 'source-over';
    octx.clearRect(0, 0, off.width, off.height);

    octx.save();
    octx.translate(M.cx, M.cy);
    octx.rotate(ang);
    octx.save();
    octx.rotate(Math.PI / 2);              // hoist to the fingertip
    octx.drawImage(im, -L / 2, -M.w / 2, L, M.w);
    octx.restore();
    // thread ridges, running across the stripes
    octx.globalCompositeOperation = 'multiply';
    octx.strokeStyle = 'rgba(0,0,0,0.17)';
    octx.lineWidth = 1;
    octx.beginPath();
    for (let y = -L / 2 + 1.5; y < L / 2; y += 3) {
      octx.moveTo(-M.w / 2, y); octx.lineTo(M.w / 2, y);
    }
    octx.stroke();
    octx.restore();

    // The embroidery covers the seam. Give the patch its own continuous
    // cylindrical shading, so the split finger's welt/groove cannot show
    // through its fabric as a vertical stripe.
    octx.save();
    octx.translate(M.cx, M.cy);
    octx.rotate(ang);
    octx.beginPath();
    octx.rect(-M.w / 2, -L / 2, M.w, L);
    octx.clip();
    octx.globalCompositeOperation = 'multiply';
    const shade = octx.createLinearGradient(-M.w/2,0,M.w/2,0);
    shade.addColorStop(0,'#b9b9b9');shade.addColorStop(.32,'#fff');
    shade.addColorStop(.68,'#f9f9f9');shade.addColorStop(1,'#c8c8c8');
    octx.fillStyle=shade;octx.fillRect(-M.w/2,-L/2,M.w,L);
    octx.globalCompositeOperation='source-atop';
    octx.strokeStyle='rgba(255,255,255,.34)';octx.lineWidth=.55;
    octx.beginPath();
    for(let y=-L/2;y<L/2;y+=2){octx.moveTo(-M.w/2,y);octx.lineTo(M.w/2,y+.8);}
    octx.stroke();
    // A tightly stitched perimeter, kept inside the finger footprint.
    octx.strokeStyle='rgba(20,20,20,.25)';octx.lineWidth=1.4;
    octx.strokeRect(-M.w/2+1.1,-L/2+1.1,M.w-2.2,L-2.2);
    octx.strokeStyle='rgba(255,255,255,.75)';octx.lineWidth=1.05;
    octx.setLineDash([1.2,1.35]);
    octx.strokeRect(-M.w/2+2,-L/2+2,M.w-4,L-4);octx.setLineDash([]);
    octx.restore();

    // Clipping does include the welt, or the closed seam slices the patch.
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(this.flagPanelMask(M.clip || ['back3', 'back4', 'welt_index'], mirror), 0, 0);

    const cover = this.flagCover || document.createElement('canvas'); cover.width = off.width; cover.height = off.height;
    const cg = cover.getContext('2d');
    if (mirror) cg.setTransform(-1, 0, 0, 1, 2 * M.cx, 0);
    cg.drawImage(off, 0, 0); this.flagCover = cover;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  // The official palm artwork is a deboss in the leather, not embroidery.
  // Keep the two marks readable on either hand, without mirroring their glyphs.
  drawPalmStamps(ctx, mirror) {
    for (const mark of this.DATA.palmStamps || []) {
      const im = this.imgs[mark.asset];
      if (!im) continue;
      const [x0,y0,x1,y1] = mark.box, w=x1-x0, h=y1-y0;
      this.unmirror(ctx,x0,x1,mirror,()=>{
        ctx.save();ctx.translate((x0+x1)/2,(y0+y1)/2);
        ctx.rotate((mirror?-1:1)*(mark.angle||0));
        // A narrow light lip and dark recess retain the selected leather hue.
        const key='stamp-lip|'+mark.asset;
        let lip=this.cache.get(key);
        if(!lip){lip=document.createElement('canvas');lip.width=im.width;lip.height=im.height;
          const g=lip.getContext('2d');g.drawImage(im,0,0);g.globalCompositeOperation='source-in';
          g.fillStyle='#fff';g.fillRect(0,0,lip.width,lip.height);this.cache.set(key,lip);}
        ctx.globalCompositeOperation='screen';ctx.globalAlpha=.16;
        ctx.drawImage(lip,-w/2+.7,-h/2+1,w,h);
        ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.53;
        ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();
      });
    }
  }

  // highlight: { id, amount } brightens one zone (hover / selection feedback)
  // mergeIndex: a flag is fitted, so draw the flag overlay. The index welting
  // keeps the welting colour and sheen; only the flag's own footprint covers it.
  draw(ctx, state, bulletSel, highlight, mergeIndex, mirror = false) {
    this.syncNativeHContour();
    const D = this.DATA;
    // What lies over the glove besides its zones; backOwners needs the same.
    this._drawn = [bulletSel, mergeIndex];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, D.w, D.h);
    if (mirror) ctx.setTransform(-1, 0, 0, 1, D.w, 0);
    ctx.drawImage(this.imgs.glove, 0, 0);
    const swap = this.web && D.webs && D.webs[this.web];
    // The neutral base has the stock web and its lacing painted into it, so
    // skipping those zones leaves them behind in plain tan. Cut them out.
    //
    // Nothing is put back behind the new web. Backing the opening with solid
    // leather did hide the ragged edges, but it also filled the gaps a web is
    // supposed to have, so the stock web's top bar showed through as a slab.
    // An open web should show background through it, because that is what an
    // open web does.
    if (swap && this.imgs.web) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      // A hard stencil, not the layers themselves: punching with their own
      // soft alpha only partly removes every antialiased edge pixel, and the
      // dark web leather that survives reads as a black rim round the opening.
      if (this.imgs.web_cut) {
        ctx.drawImage(this.imgs.web_cut, 0, 0);
      } else {
        ctx.drawImage(this.imgs.web, 0, 0);
        if (this.imgs.laces_web) ctx.drawImage(this.imgs.laces_web, 0, 0);
      }
      ctx.restore();
    }
    // Once the pad is on, every later zone goes under it: the fitted part is
    // its own leather with its own stitched outline (YellowPad1.jpg, hood.jpg
    // show no body lace or stitching through it). Only the binding and lining
    // come back over its lower end, inside padUnder.
    // The hood is different: hood.jpg shows its rounded lower cap lying free
    // over the hand opening, so for the hood nothing comes back over it.
    let padOn = false;
    const padKeep = this.pad === 'pad' ? D.padUnder : null;
    const onPad = (c, zid) => !padOn ? c : this.underPad(c,
      (zid === 'lining' || zid === 'binding') ? padKeep : null);
    for (const z of D.zones) {
      // A chosen web replaces the glove's own, whole: the stock web and the
      // lacing through it both go, or the new one sits under the old one's
      // laces. What stays is the lacing outside the web — the knotted lace
      // sits on the outside of the glove and passes over any web.
      // A swapped web is drawn after the loop, not in it: the calibration
      // glove's knotted lace has to be punched away first, and a web that
      // carries its own knot would be punched with it.
      if (swap && z.id === 'web') continue;
      let tinted = this.tinted(z.id, this.hex(z.id, state));
      // H thumb windows show a fixed white backing, independent of palm colour.
      // This is a display backing, not additional web leather or lace ownership.
      if (z.id === 'palm' && this.view === 'thumb' && !this.web && !this.webMarked
          && D.nativeHWhiteWindows && this.imgs[D.nativeHWhiteWindows]) {
        const local = document.createElement('canvas');
        local.width = tinted.width; local.height = tinted.height;
        const g = local.getContext('2d'); g.drawImage(tinted, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.drawImage(this.imgs[D.nativeHWhiteWindows], -tinted._ox, -tinted._oy);
        local._ox = tinted._ox; local._oy = tinted._oy; tinted = local;
      }
      if (z.id === 'stitching' && swap?.bodyStitching && swap.bodyPatch) {
        const r = swap.bodyPatch, patch = this.tinted(swap.bodyStitching, this.hex(z.id,state));
        const local = document.createElement('canvas'); local.width=tinted.width; local.height=tinted.height;
        const lg=local.getContext('2d');lg.drawImage(tinted,0,0);
        lg.save();lg.beginPath();lg.rect(r[0]-tinted._ox,r[1]-tinted._oy,r[2]-r[0],r[3]-r[1]);lg.clip();
        lg.clearRect(0,0,local.width,local.height);lg.drawImage(patch,patch._ox-tinted._ox,patch._oy-tinted._oy);lg.restore();
        local._ox=tinted._ox;local._oy=tinted._oy;tinted=local;
      }
      let c = onPad(swap && z.id === 'stitching' ? this.outsideWeb(tinted) : tinted, z.id);
      if (z.id === 'stitching' && D.thumbBadgeThread) {
        const original=c;c=document.createElement('canvas');c.width=original.width;c.height=original.height;
        c._ox=original._ox;c._oy=original._oy;const g=c.getContext('2d');g.drawImage(original,0,0);
        const b=D.thumbBadgeThread;
        g.save();g.globalCompositeOperation='destination-out';g.fillStyle='#fff';
        g.beginPath();g.ellipse(b.cx-c._ox,b.cy-c._oy,b.rx+5,b.ry+5,b.angle,0,Math.PI*2);g.fill();g.restore();
      }
      if (z.id === 'embroidery' && mirror && D.embroideryLHT
          && this.imgs[D.embroideryLHT]) {
        const e = this.tinted(D.embroideryLHT, this.hex(z.id, state), z.id);
        ctx.drawImage(e, e._ox, e._oy);
      } else if (z.id === 'embroidery') {
        // Letter by letter, each flipped about its own centre. See embParts
        // in build_assets.py: flipping the wordmark as a whole keeps it
        // readable on a lefty but leaves its arc right-handed, and puts it
        // beside the relief of itself that the neutral base carries.
        const parts = (D.embParts && D.embParts.length)
          ? D.embParts : [D.bbox.embroidery];
        for (const [px0, py0, px1, py1] of parts) {
          const pw = px1 - px0, ph = py1 - py0;
          this.unmirror(ctx, px0, px1, mirror,
                        () => ctx.drawImage(c, px0 - c._ox, py0 - c._oy,
                                            pw, ph, px0, py0, pw, ph));
        }
      } else {
        ctx.drawImage(c, c._ox, c._oy);
        // Under a swapped web the calibration glove's knot is not drawn, and
        // the panels it lay on have to be whole without it. knotHeal names a
        // patch over the knot's footprint on this panel, filled from the
        // panel's own leather (build_assets.py); it takes the panel's colour
        // and the panel's sheen, so it is the same leather. The native H-web
        // never draws it.
        const kh = swap && D.knotHeal?.[z.id];
        if (kh && this.imgs[kh] && D.bbox[kh]) {
          const p = onPad(this.tinted(kh, this.hex(z.id, state), z.id), z.id);
          ctx.drawImage(p, p._ox, p._oy);
          if (swap.knotHeal?.[z.id] && swap.bodyPatch) {
            const r=swap.bodyPatch, q=onPad(this.tinted(swap.knotHeal[z.id],this.hex(z.id,state),z.id),z.id);
            ctx.save();ctx.beginPath();ctx.rect(r[0],r[1],r[2]-r[0],r[3]-r[1]);ctx.clip();ctx.drawImage(q,q._ox,q._oy);ctx.restore();
          }
        }
        // A zone can carry lettering of its own that the global flip turns
        // backwards — on the palm, the embossed "Sasaki PRO Custom Made",
        // the SHOKUNIN stamp and the SSK wordmark are pressed into the palm
        // leather rather than being pieces in their own right. build_palm.py
        // lifts them off it into a multiply mask, so the leather here is
        // smooth and each mark can be flipped about its own centre — landing
        // it on the mirrored side of the glove, still reading forwards, with
        // nothing but the letters having moved.
        const mk = D.marks;
        if (z.id === 'palm' && D.palmStamps) this.drawPalmStamps(ctx, mirror);
        if (mk && mk.zone === z.id && this.imgs.marks) {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          for (const [bx0, by0, bx1, by1] of mk.boxes) {
            const bw = bx1 - bx0, bh = by1 - by0;
            this.unmirror(ctx, bx0, bx1, mirror,
                          () => ctx.drawImage(this.imgs.marks,
                                              bx0, by0, bw, bh,
                                              bx0, by0, bw, bh));
          }
          ctx.restore();
        }
      }
      // The pad is one piece of leather laid over the finger, so the welt
      // seam that splits the finger runs under it, not across it — Scott,
      // looking at the seam drawn over the top: "it should always overlap
      // the welting, always." It goes on after the welting for that. The
      // lining and the binding then go back over its lower end, because on
      // the photograph the pad disappears under the binding rather than
      // sitting on top of it.
      if (z.id === 'welting' && this.pad && this.imgs[this.pad]
          && D.bbox[this.pad]) {
        const pd = this.tinted(this.pad, this.padHex || '#F2F0EA');
        ctx.drawImage(pd, pd._ox, pd._oy);
        // Hood thread follows the shared stitch colour, independently of leather.
        const threadId = D.fingerThread?.[this.pad];
        if (threadId && this.imgs[threadId]) {
          const thread = this.tinted(threadId, this.hex('stitching', state));
          ctx.drawImage(thread, thread._ox, thread._oy);
        }
        padOn = true;
        // Clipped to where the binding is a solid band. Drawing all of it
        // brought back a spur of welt seam that the segmentation had put on
        // the binding's layer, and on the pad that is a blue dot poking out
        // of the leather with nothing attached to it.
        const u = D.padUnder;
        ctx.save();
        if (u) {
          ctx.beginPath();
          ctx.rect(u[0], u[1], u[2] - u[0], u[3] - u[1]);
          ctx.clip();
        }
        for (const over of ['lining', 'binding']) {
          if (!this.imgs[over] || !D.bbox[over]) continue;
          const t = this.tinted(over, this.hex(over, state));
          const o = this.pad === 'pad' ? t : this.underPad(t);
          ctx.drawImage(o, o._ox, o._oy);
        }
        ctx.restore();
      }
      // The lace running through the stock web is split off the laces layer,
      // because it belongs to the web type — a different web is laced
      // differently. It still takes the lace colour.
      // The web's own stitching goes with the web, exactly as its lacing does.
      if (z.id === 'stitching' && !swap
          && this.imgs.stitching_web && D.bbox.stitching_web) {
        const w = onPad(this.tinted('stitching_web', this.hex('stitching', state)), 'stitching');
        ctx.drawImage(w, w._ox, w._oy);
      }
      if (z.id === 'laces') {
        if (!swap && this.imgs.laces_web && D.bbox.laces_web) {
          const w = this.underPad(this.tinted('laces_web', this.hex('laces', state), 'laces_web', 'laces'));
          ctx.drawImage(w, w._ox, w._oy);
        }
        // The calibration knot belongs only to the native web. Replacement
        // webs supply their lace layers; the I-webs additionally position a
        // cleaned shared knot through attachment metadata after the web cut.
        if (this.imgs.laces_knot && D.bbox.laces_knot && !swap) {
          const k = this.underPad(this.tinted('laces_knot', this.hex('laces', state), 'laces_knot', 'laces'));
          ctx.drawImage(k, k._ox, k._oy);
        }
      }
    }
    // Glove laces and finger welting remain the same for every selected web.
    if (D.approvedH && this.imgs.approved_h_common_cut) {
      ctx.save();ctx.globalCompositeOperation='destination-out';
      ctx.drawImage(this.sparePad(this.imgs.approved_h_common_cut),0,0);ctx.restore();
      for (const [key,zone] of D.approvedH.layers.slice(2)) {
        const layer=this.underPad(this.tinted(key,this.hex(zone,state),key,zone));
        ctx.drawImage(layer,layer._ox,layer._oy);
      }
    }
    // Scott's approved H-web tracing, in the fixed master coordinates.
    if (!swap && D.approvedH && this.imgs.approved_h_cut) {
      ctx.save();ctx.globalCompositeOperation='destination-out';
      ctx.drawImage(this.sparePad(this.imgs.approved_h_cut),0,0);ctx.restore();
      for (const [key,zone] of D.approvedH.layers.slice(0,2)) {
        const raw=this.tinted(key,this.hex(zone,state),key,zone);
        const layer=this.underPad(raw);
        ctx.drawImage(layer,layer._ox,layer._oy);
      }
      // Approved H thread must survive the late web-leather replacement.
      const thread = D.approvedH.stitching;
      if (thread && this.imgs[thread]) {
        const layer = this.underPad(this.tinted(thread, this.hex('stitching', state), thread, 'stitching'));
        ctx.drawImage(layer, layer._ox, layer._oy);
      }
      ctx.save();ctx.globalCompositeOperation='destination-out';
      ctx.drawImage(this.sparePad(this.imgs.approved_h_openings),0,0);ctx.restore();
    }
    // The original photo shows three small gaps between finger and H-web.
    // Punch after material layers so segmentation cannot paint them closed.
    if (!swap && this.imgs.native_h_openings) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(this.sparePad(this.imgs.native_h_openings), 0, 0);
      ctx.restore();
    }
    // The stretch of knotted lace that hangs off the rim has no glove behind
    // it, so a web that declines the knot has to take it away or it stays as
    // a lace-shaped tab floating beside the hand. This comes after the zones,
    // not with the web punch-out: the segmentation cut part of that lace into
    // back 2, which would otherwise paint it straight back in.
    if (swap && this.imgs.knot_cut) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(this.sparePad(this.imgs.knot_cut), 0, 0);
      ctx.restore();
    }
    if (this.web === 'standard-i' && this.imgs.standard_remnants) {
      ctx.save();ctx.globalCompositeOperation='destination-out';
      ctx.drawImage(this.sparePad(this.imgs.standard_remnants),0,0);ctx.restore();
    }
    // And only now the web itself, on top of a glove with nothing of the
    // calibration glove's web left anywhere on it.
    if (swap) {
      if (swap.cut && this.imgs[swap.cut]) {
        ctx.save();ctx.globalCompositeOperation='destination-out';
        ctx.drawImage(this.sparePad(this.imgs[swap.cut]),0,0);ctx.restore();
      }
      // webfinger is the index finger's own edge, carried in the same cutout
      // so the join comes from one photograph. It is finger leather, so it
      // takes back3's colour, not the web's — and it goes on last, over the
      // web: its alpha is feathered to hide the join between two
      // photographs, and under the web that feather had nothing but page to
      // ramp onto, which was a pale hairline down the whole seam.
      for (const [key, zone] of [[swap.palm, 'palm'], [swap.web, 'web'],
                                 [swap.stitching, 'stitching'],
                                 [swap.laceweb, 'laces'],
                                 [swap.webfinger, 'back3']]) {
        if (!key || !this.imgs[key] || !D.bbox[key]) continue;
        const tinted = this.tinted(key, this.hex(zone, state), key, zone);
        const c = this.underPad(tinted);
        ctx.drawImage(c, c._ox, c._oy);
      }
      const attachment = this.webAttachment(this.hex('laces', state));
      if (attachment) ctx.drawImage(this.underPad(attachment), 0, 0);
    }
    // Selected thumb inserts replace only their registered panel footprint.
    // Native finger, thumb, rim and external laces remain the photographed body.
    const thumbInsert = D.thumbWebs?.[this.web];
    if (thumbInsert && this.imgs[thumbInsert.cut]) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(this.sparePad(this.imgs[thumbInsert.cut]), 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      for (const [part, zone] of [['palm', 'palm'], ['leather', 'web'], ['laces', 'laces'], ['stitching', 'stitching']]) {
        if (!thumbInsert[part]) continue;
        const c = this.tinted(thumbInsert[part], this.hex(zone, state), thumbInsert[part], zone);
        ctx.drawImage(c, c._ox, c._oy);
      }
      ctx.restore();
    }
    // A selected palm insert replaces the footprint only. The photographed
    // foreground (fingers, thumb, palm edge) is put back exactly as drawn, and
    // an uncovered part of the footprint stays empty — no backing in the holes.
    const palmInsert = D.palmWebs?.entries?.[this.web];
    if (palmInsert) {
      const fp = this.imgs[D.palmWebs.footprint.asset + '#alpha'];
      const pr = this.imgs[D.palmWebs.protected.asset + '#alpha'];
      const nat = document.createElement('canvas'); nat.width = D.w; nat.height = D.h;
      const gn = nat.getContext('2d');
      gn.drawImage(ctx.canvas, 0, 0);
      if (mirror) gn.setTransform(-1, 0, 0, 1, D.w, 0);
      gn.globalCompositeOperation = 'destination-in';
      gn.drawImage(pr, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(fp, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.palmInsertLayer(palmInsert, state), 0, 0);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(pr, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(nat, 0, 0);
      ctx.restore();
    }
    // A side view photographed with one web only (the thumb side shows the
    // calibration glove's H-Web). Any other web is hatched there, web and
    // the lacing through it, and never drawn as if it were the one ordered.
    if (this.webMarked && !thumbInsert && D.webMarker && this.imgs[D.webMarker]) {
      ctx.drawImage(this.hatch(D.webMarker), 0, 0);
    }
    // The index welt stays welting under a flag: same colour, same sheen, from
    // the welting layer itself. Only the flag patch below covers its footprint.
    if (mergeIndex && this.flagMount()) {
      const M = this.flagMount(), r = Math.max(M.w, M.h);
      this.unmirror(ctx, M.cx - r, M.cx + r, mirror,
                    () => this.drawFlag(ctx, mirror));
    }
    if (mirror && D.thumbCircle && this.imgs.thumb_circle_art) {
      const badge = D.thumbCircle;
      ctx.save();
      // Keep glyphs readable while aligning the badge plane with the
      // mirrored ellipse, rather than leaving its tilt right-handed.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(D.w - badge.cx, badge.cy);
      ctx.rotate(badge.leftRotation - 2 * (D.thumbBadgeThread?.angle || 0));
      // circle-art is a full source photograph; only its badge is artwork.
      // Without this clip the left-handed thumb was overwritten in tan.
      ctx.beginPath();ctx.ellipse(0,0,64,51,.33,0,Math.PI*2);ctx.clip();
      ctx.drawImage(this.imgs.thumb_circle_art, -badge.cx, -badge.cy);
      ctx.restore();
    }
    if (D.thumbBadgeThread) {
      const b=D.thumbBadgeThread;
      ctx.save();ctx.translate(b.cx,b.cy);ctx.rotate(b.angle);
      ctx.beginPath();ctx.ellipse(0,0,b.rx,b.ry,0,0,Math.PI*2);
      ctx.strokeStyle=this.hex('stitching',state);ctx.lineWidth=1.55;
      ctx.lineCap='round';ctx.setLineDash([2.65,3.5]);ctx.stroke();ctx.restore();
    }
    const bb = D.bulletBox;
    if (bb) {
      this.unmirror(ctx, bb[0], bb[2], mirror,
                    () => this.drawBullet(ctx, bulletSel));
    }
    if (highlight && highlight.id && D.bbox[highlight.id]) {
      let c = this.tinted(highlight.id, '#ffffff');
      if (thumbInsert) {
        const key = 'thumb-highlight|' + this.web + '|' + highlight.id;
        let fitted = this.cache.get(key);
        if (!fitted) {
          fitted = document.createElement('canvas'); fitted.width = D.w; fitted.height = D.h;
          const g = fitted.getContext('2d');
          g.drawImage(c, c._ox, c._oy);
          g.globalCompositeOperation = 'destination-out';
          g.drawImage(this.imgs[thumbInsert.cut], 0, 0);
          g.globalCompositeOperation = 'source-over';
          const part = {web:'leather',laces:'laces',stitching:'stitching',palm:'palm'}[highlight.id];
          if (part && thumbInsert[part]) {
            const layer = this.tinted(thumbInsert[part], '#ffffff');
            g.drawImage(layer, layer._ox, layer._oy);
          }
          fitted._ox = 0; fitted._oy = 0;
          this.cache.set(key, fitted);
        }
        c = fitted;
      }
      if (palmInsert) {
        const P = D.palmWebs, key = 'palm-highlight|' + this.web + '|' + highlight.id;
        let fitted = this.cache.get(key);
        if (!fitted) {
          fitted = document.createElement('canvas'); fitted.width = D.w; fitted.height = D.h;
          const g = fitted.getContext('2d');
          g.drawImage(c, c._ox, c._oy);
          g.globalCompositeOperation = 'destination-out';
          g.drawImage(this.imgs[P.footprint.asset + '#alpha'], 0, 0);
          const part = Object.keys(P.roles).find(k => P.roles[k] === highlight.id);
          const asset = highlight.id === 'palm' && palmInsert.palmSupport
            ? palmInsert.palmSupport.asset : part && palmInsert.parts[part].asset;
          if (asset) {
            const s = document.createElement('canvas'); s.width = D.w; s.height = D.h;
            const gs = s.getContext('2d'), l = this.tinted(asset, '#ffffff');
            gs.drawImage(l, l._ox, l._oy);
            gs.globalCompositeOperation = 'destination-in';
            gs.drawImage(this.imgs[P.footprint.asset + '#alpha'], 0, 0);
            gs.globalCompositeOperation = 'destination-out';
            gs.drawImage(this.imgs[P.protected.asset + '#alpha'], 0, 0);
            g.globalCompositeOperation = 'source-over';
            g.drawImage(s, 0, 0);
          }
          fitted._ox = 0; fitted._oy = 0;
          this.cache.set(key, fitted);
        }
        c = fitted;
      }
      // A new web attachment hides the underlying leather's selection and
      // participates in the lace selection at its actual rendered position.
      const attachment = this.webAttachment('#ffffff');
      if (attachment) {
        const fitted = document.createElement('canvas'); fitted.width = D.w; fitted.height = D.h;
        const g = fitted.getContext('2d'); g.drawImage(c, c._ox, c._oy);
        g.globalCompositeOperation = 'destination-out'; g.drawImage(attachment, 0, 0);
        if (highlight.id === 'laces') {
          g.globalCompositeOperation = 'source-over'; g.drawImage(attachment, 0, 0);
        }
        fitted._ox = fitted._oy = 0; c = fitted;
      }
      // Selection feedback follows the same visible overlap as the leather.
      // Preserve the pad's binding/lining overlap; the hood covers both.
      c = this.underPad(c, this.pad === 'pad'
        && ['binding', 'lining'].includes(highlight.id) ? D.padUnder : null);
      const fingerThread = D.fingerThread?.[this.pad];
      if (highlight.id === 'stitching' && fingerThread && this.imgs[fingerThread]) {
        const combined = document.createElement('canvas'); combined.width = D.w; combined.height = D.h;
        const g = combined.getContext('2d'); g.drawImage(c, c._ox, c._oy);
        const thread = this.tinted(fingerThread, '#ffffff');
        g.drawImage(thread, thread._ox, thread._oy);
        combined._ox = combined._oy = 0; c = combined;
      }
      ctx.save();
      if (mergeIndex && this.flagMount() && this.flagImg && this.flagCover) {
        const clipped = document.createElement('canvas'); clipped.width = D.w; clipped.height = D.h;
        const g = clipped.getContext('2d'); g.drawImage(c, c._ox, c._oy);
        g.globalCompositeOperation = 'destination-out'; g.drawImage(this.flagCover, 0, 0);
        clipped._ox = clipped._oy = 0; c = clipped;
      }
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = highlight.amount;
      ctx.drawImage(c, c._ox, c._oy);
      ctx.restore();
    }
    if (this.imgs.lining && this.DATA.assets.lining?.includes('_refined')) {
      const lining=this.underPad(this.tinted('lining',this.hex('lining',state)),this.pad==='pad'?D.padUnder:null);
      ctx.drawImage(lining,lining._ox,lining._oy);
    }
    if (this.imgs.binding_thread_detail) {
      const thread=this.underPad(this.tinted('binding_thread_detail',this.hex('stitching',state)),this.pad==='pad'?D.padUnder:null);
      ctx.drawImage(thread,thread._ox,thread._oy);
    }
    if (this.imgs.master_pinky_openings) {
      ctx.save();ctx.globalCompositeOperation='destination-out';
      ctx.drawImage(this.sparePad(this.imgs.master_pinky_openings),0,0);ctx.restore();
    }
    // Source-photographed H web relief: bars, raised rails and thread belong
    // to web/stitching even where the legacy segmentation labelled a sidewall palm.
    if (this.view === 'thumb' && !this.web && !this.webMarked && D.nativeHDetail) {
      const h = D.nativeHDetail;
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(this.imgs[h.cut], 0, 0); ctx.restore();
      for (const [asset, zone] of [[h.leather, 'web'], [h.stitching, 'stitching']]) {
        const layer = this.tinted(asset, this.hex(zone, state), zone);
        ctx.drawImage(layer, layer._ox, layer._oy);
      }
      // The native highlight is below this replacement; restore its editing
      // feedback on the repaired owner layers without changing proof renders.
      if (highlight && ['web', 'stitching'].includes(highlight.id)) {
        const asset = highlight.id === 'web' ? h.leather : h.stitching;
        const bright = this.tinted(asset, '#ffffff', highlight.id);
        const local = document.createElement('canvas'); local.width=D.w; local.height=D.h;
        const g=local.getContext('2d'); g.drawImage(bright,bright._ox,bright._oy);
        if(highlight.id==='web') {
          g.globalCompositeOperation='destination-out'; g.drawImage(this.imgs[h.stitching],0,0);
        }
        ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=highlight.amount;
        ctx.drawImage(local,0,0); ctx.restore();
      }
    }
    // User-traced native H thumb openings expose the page background.
    // Apply after material layers so hidden palm/body backing cannot fill them.
    if (this.view === 'thumb' && !this.web && !this.webMarked
        && D.nativeHTransparentWindows && this.imgs[D.nativeHTransparentWindows]) {
      ctx.save(); ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(this.imgs[D.nativeHTransparentWindows], 0, 0); ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Who owns each pixel of the back view, read off draw() itself. The id map
  // is the calibration glove's segmentation: once another web, the approved
  // H tracing, a pad or a flag is drawn, a click there lands on whatever used
  // to be underneath. Here each role is drawn dark against a light glove, and
  // a pixel belongs to the role that changes it most — so a click selects the
  // colour it will actually change. A pixel no colour reaches (an open
  // window, the pad, the flag, the bullet) picks nothing. Colours do not move
  // ownership, so the map is kept per web, pad, hand, flag and bullet, in
  // canvas space: the mirrored render is read as drawn, nothing is folded.
  backOwners(mirror) {
    const D = this.DATA, [bullet, flag] = this._drawn || [null, false];
    const key = ['own', this.web || '', this.pad || '', mirror ? 1 : 0,
      flag && this.flagMount() && this.flagImg ? this.flagSrc + ':' + this.flagPosition : '', bullet ?? ''].join('|');
    let own = this.cache.get(key);
    if (own) return own;
    const lum = h => { const n = parseInt(h.slice(1), 16);
      return 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255); };
    const ends = {};
    for (const [grp, pal] of Object.entries(D.palettes)) {
      const s = [...pal].sort((a, b) => lum(b[2]) - lum(a[2]));
      ends[grp] = [s[0][0], s[s.length - 1][0]];
    }
    const light = Object.fromEntries(D.zones.map(z => [z.id, ends[z.group][0]]));
    const c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    const render = s => {
      this.draw(g, s, bullet, null, flag, mirror);
      return g.getImageData(0, 0, D.w, D.h).data;
    };
    const base = render(light), N = D.w * D.h;
    own = new Uint8Array(N);
    const best = new Uint8Array(N);
    for (const z of D.zones) {
      const d = render({ ...light, [z.id]: ends[z.group][1] });
      for (let j = 0, i = 0; j < N; j++, i += 4) {
        if (base[i + 3] < 128) continue;
        const v = Math.max(Math.abs(d[i] - base[i]), Math.abs(d[i + 1] - base[i + 1]),
                           Math.abs(d[i + 2] - base[i + 2]));
        if (v >= 2 && v > best[j]) { best[j] = v; own[j] = z.n; }
      }
    }
    this.cache.set(key, own);
    return own;
  }

  // The id map is of the right-handed glove, so a click on a mirrored render
  // has to be folded back before it is looked up, or every panel selects the
  // one opposite it.
  zoneAt(x, y, mirror = false) {
    this.syncNativeHContour();
    const D = this.DATA;
    if (this.view === 'back') {
      if (x < 0 || y < 0 || x >= D.w || y >= D.h) return null;
      const n = this.backOwners(mirror)[(y | 0) * D.w + (x | 0)];
      return n ? D.zones.find(z => z.n === n)?.id || null : null;
    }
    if (mirror) x = D.w - 1 - x;
    if (x < 0 || y < 0 || x >= D.w || y >= D.h) return null;
    if (this.view === 'thumb' && !this.web && !this.webMarked && !D.nativeHDetail && D.nativeHWhiteWindows
        && this.imgs[D.nativeHWhiteWindows]) {
      const n = this.idData[((y | 0) * D.w + (x | 0)) * 4];
      if (D.zones.find(z => z.n === n)?.id === 'palm') {
        const key = 'hit|' + D.nativeHWhiteWindows;
        let data = this.cache.get(key);
        if (!data) {
          const c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
          const g = c.getContext('2d'); g.drawImage(this.imgs[D.nativeHWhiteWindows], 0, 0);
          data = g.getImageData(0, 0, D.w, D.h).data; this.cache.set(key, data);
        }
        if (data[((y | 0) * D.w + (x | 0)) * 4 + 3] >= 128) return null;
      }
    }
    if (this.view === 'thumb' && !this.web && !this.webMarked && D.nativeHTransparentWindows
        && this.imgs[D.nativeHTransparentWindows]) {
      const n = this.idData[((y | 0) * D.w + (x | 0)) * 4];
      {
        const key = 'hit|' + D.nativeHTransparentWindows;
        let data = this.cache.get(key);
        if (!data) {
          const c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
          const g = c.getContext('2d'); g.drawImage(this.imgs[D.nativeHTransparentWindows], 0, 0);
          data = g.getImageData(0, 0, D.w, D.h).data; this.cache.set(key, data);
        }
        if (data[((y | 0) * D.w + (x | 0)) * 4 + 3] >= 128) return null;
      }
    }
    if (this.view === 'thumb' && !this.web && !this.webMarked && D.nativeHDetail) {
      const key = 'hit|' + D.nativeHDetail.idmap;
      let data = this.cache.get(key);
      if (!data) {
        const c = document.createElement('canvas'); c.width=D.w; c.height=D.h;
        const g = c.getContext('2d'); g.drawImage(this.imgs[D.nativeHDetail.idmap],0,0);
        data=g.getImageData(0,0,D.w,D.h).data; this.cache.set(key,data);
      }
      const i=((y|0)*D.w+(x|0))*4;
      if(data[i+3]>=128) return D.zones.find(z=>z.n===data[i])?.id || null;
    }
    const insert = D.thumbWebs?.[this.web];
    if (insert && this.imgs[insert.idmap]) {
      const key = 'hit|' + insert.idmap;
      let data = this.cache.get(key);
      if (!data) {
        const c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
        const g = c.getContext('2d', {willReadFrequently:true});
        g.drawImage(this.imgs[insert.idmap], 0, 0);
        data = g.getImageData(0, 0, D.w, D.h).data;
        this.cache.set(key, data);
      }
      const i = ((y | 0) * D.w + (x | 0)) * 4;
      if (data[i + 3]) return D.zones.find(z => z.n === data[i])?.id || null;
      // A window: the insert's cut took the body out here and no insert part
      // went back in, so nothing is drawn and nothing may be picked. The cut
      // is the one draw() erases with, pad footprint spared.
      if (this.imgs[insert.cut]) {
        const cutKey = 'hitcut|' + insert.cut + '|' + (this.pad || '');
        let cut = this.cache.get(cutKey);
        if (!cut) {
          const c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
          const g = c.getContext('2d', {willReadFrequently:true});
          g.drawImage(this.sparePad(this.imgs[insert.cut]), 0, 0);
          cut = g.getImageData(0, 0, D.w, D.h).data;
          this.cache.set(cutKey, cut);
        }
        if (cut[i + 3] >= 128) return null;
      }
    }
    // A palm insert: the photographed foreground wins, then whichever of the
    // insert's thread, lace and leather is most visible where it is drawn —
    // stitching over laces over leather, as draw() stacks them. Where the
    // footprint shows nothing, nothing is picked.
    const pe = D.palmWebs?.entries?.[this.web];
    if (pe) {
      const P = D.palmWebs, j = (y | 0) * D.w + (x | 0);
      if (this.palmAlpha(P.protected.asset)[j] < 128) {
        const f = this.palmAlpha(P.footprint.asset)[j] / 255;
        if (f >= 0.5) {
          const a = k => this.palmAlpha(pe.parts[k].asset)[j] / 255;
          const s = a('stitching'), l = a('laces'), w = a('leather');
          const p = pe.palmSupport ? this.palmAlpha(pe.palmSupport.asset)[j] / 255 : 0;
          const vis = [['stitching', s], ['laces', l * (1 - s)], ['leather', w * (1 - l) * (1 - s)],
            ['palm', p * (1 - w) * (1 - l) * (1 - s)]];
          if (f * (1 - (1 - s) * (1 - l) * (1 - w) * (1 - p)) < 0.5) return null;
          let best = vis[0];
          for (const v of vis) if (v[1] > best[1]) best = v;
          return best[0] === 'palm' ? 'palm' : P.roles[best[0]];
        }
      }
    }
    let idData = this.idData;
    // User-traced pinky lettering stays readable on a left-handed glove;
    // its relocated artwork needs the matching visible-material pick map.
    if (mirror && D.view === 'pinky' && D.idmapLHT && this.imgs[D.idmapLHT]) {
      const key = 'pinky-lht-picks|' + D.idmapLHT;
      idData = this.cache.get(key);
      if (!idData) {
        const c = document.createElement('canvas'); c.width = D.w; c.height = D.h;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(this.imgs[D.idmapLHT], 0, 0);
        idData = g.getImageData(0, 0, D.w, D.h).data;
        this.cache.set(key, idData);
      }
    }
    const n = idData[((y | 0) * D.w + (x | 0)) * 4];
    const z = D.zones.find(z => z.n === n);
    return z ? z.id : null;
  }
}

// Reference codes live in refcode.js: they encode the order form's answers,
// not this renderer's zones, so no view or rebuild can change what one means.

export function applyPreset(DATA, name) {
  const pr = DATA.presets[name];
  const state = {};
  for (const z of DATA.zones) {
    const v = pr[z.id] !== undefined ? pr[z.id] : pr['_panels'];
    const pal = DATA.palettes[z.group];
    state[z.id] = pal.some(c => c[0] === v) ? v : pal[0][0];
  }
  return state;
}
