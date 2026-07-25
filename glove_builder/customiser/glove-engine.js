// Shared compositing engine for the SSK glove configurator.
// Assets and palettes come from assets/glove-data.json, extracted verbatim
// from glove_builder/customiser/index.html in scottprins32-hub/ssk-glove-demo.

let _p = null;

export function loadGlove() {
  if (_p) return _p;
  _p = (async () => {
    // bundle.py inlines the same object as window.__GLOVE_DATA__, so the
    // single-file build needs no fetch
    const DATA = window.__GLOVE_DATA__
      || await (await fetch('assets/glove-data.json')).json();
    const imgs = {};
    await Promise.all(Object.entries(DATA.assets).map(([n, src]) => new Promise(res => {
      const im = new Image();
      im.onload = () => { imgs[n] = im; res(); };
      im.onerror = () => { res(); };
      im.src = src;
    })));
    const ic = document.createElement('canvas');
    ic.width = DATA.w; ic.height = DATA.h;
    const ictx = ic.getContext('2d', { willReadFrequently: true });
    ictx.drawImage(imgs._idmap, 0, 0);
    const idData = ictx.getImageData(0, 0, DATA.w, DATA.h).data;
    return { DATA, imgs, idData };
  })();
  return _p;
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
    this.DATA = bundle.DATA;
    this.imgs = bundle.imgs;
    this.idData = bundle.idData;
    this.cache = new Map();
    this.order = [];
    this.off = document.createElement('canvas');
    this.off.width = this.DATA.w; this.off.height = this.DATA.h;
    this.octx = this.off.getContext('2d');
  }

  hex(zoneId, state) {
    const z = this.DATA.zones.find(z => z.id === zoneId);
    const pal = this.DATA.palettes[z.group];
    const c = pal.find(c => c[0] === state[zoneId]);
    return c ? c[2] : '#888888';
  }

  tinted(id, hx) {
    const key = id + '|' + hx;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const [x0, y0, x1, y1] = this.DATA.bbox[id];
    const c = document.createElement('canvas');
    c.width = Math.max(1, x1 - x0); c.height = Math.max(1, y1 - y0);
    const g = c.getContext('2d');
    g.drawImage(this.imgs[id], -x0, -y0);
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = hx;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(this.imgs[id], -x0, -y0);
    c._ox = x0; c._oy = y0;
    this.cache.set(key, c);
    this.order.push(key);
    if (this.order.length > 240) this.cache.delete(this.order.shift());
    return c;
  }

  drawBullet(ctx, bulletSel) {
    const opt = this.DATA.bullets[bulletSel];
    const imgs = this.imgs;
    if (!imgs.bullet_logo) return;
    if (!opt || opt.tint === null) { ctx.drawImage(imgs.bullet_logo, 0, 0); return; }
    if (opt.asset && imgs[opt.asset]) { ctx.drawImage(imgs[opt.asset], 0, 0); return; }
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

  // highlight: { id, amount } brightens one zone (hover / selection feedback)
  draw(ctx, state, bulletSel, highlight) {
    const D = this.DATA;
    ctx.clearRect(0, 0, D.w, D.h);
    ctx.drawImage(this.imgs.glove, 0, 0);
    for (const z of D.zones) {
      const c = this.tinted(z.id, this.hex(z.id, state));
      ctx.drawImage(c, c._ox, c._oy);
    }
    this.drawBullet(ctx, bulletSel);
    if (highlight && highlight.id && D.bbox[highlight.id]) {
      const c = this.tinted(highlight.id, '#ffffff');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = highlight.amount;
      ctx.drawImage(c, c._ox, c._oy);
      ctx.restore();
    }
  }

  zoneAt(x, y) {
    const D = this.DATA;
    if (x < 0 || y < 0 || x >= D.w || y >= D.h) return null;
    const n = this.idData[((y | 0) * D.w + (x | 0)) * 4];
    const z = D.zones.find(z => z.n === n);
    return z ? z.id : null;
  }
}

// The reference code packs every zone choice (5 bits: index in that zone's
// palette) plus the bullet logo (4 bits) into one base36 string, and decodes
// again, so it doubles as a shareable link.
export function refCode(DATA, state, bulletSel) {
  let bits = 0n;
  for (const z of DATA.zones) {
    const pal = DATA.palettes[z.group];
    const i = Math.max(0, pal.findIndex(c => c[0] === state[z.id]));
    bits = (bits << 5n) | BigInt(i & 31);
  }
  bits = (bits << 4n) | BigInt(bulletSel & 15);
  const s = bits.toString(36).toUpperCase().padStart(20, '0');
  return 'SSK-' + s.match(/.{4}/g).join('-');
}

export function applyCode(DATA, code) {
  const s = String(code).toUpperCase().replace(/^#?SSK-?/, '').replace(/-/g, '');
  if (!/^[0-9A-Z]{1,20}$/.test(s)) return null;
  let bits = 0n;
  for (const ch of s) bits = bits * 36n + BigInt(parseInt(ch, 36));
  const bullet = Number(bits & 15n);
  bits >>= 4n;
  const state = {};
  for (const z of [...DATA.zones].reverse()) {
    const pal = DATA.palettes[z.group];
    const c = pal[Number(bits & 31n)];
    bits >>= 5n;
    if (c) state[z.id] = c[0];
  }
  return { state, bulletSel: DATA.bullets[bullet] ? bullet : 0 };
}

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
