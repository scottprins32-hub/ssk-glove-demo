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
    return c ? c[2] : '#C4C9D0';   // --gray-300, matching app.js
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
      const k = (this.DATA.sheen || {})[id];
      g.globalCompositeOperation = 'lighter';
      if (k != null) g.globalAlpha = k;
      g.drawImage(hi, -x0, -y0);
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(this.imgs[id], -x0, -y0);
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
  setFlag(src, onReady) {
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

  // Whether the finger pad is fitted, and in what colour. White until the
  // customer picks one — that is the order the form asks in.
  setPad(on, hex) {
    this.pad = !!on;
    this.padHex = hex || '#F2F0EA';
  }

  // Which web to render, by slug, or null for the glove's own.
  setWeb(slug) {
    this.web = (slug && this.DATA.webs && this.DATA.webs[slug]) ? slug : null;
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
  drawFlag(ctx) {
    const M = this.DATA.flagMount, im = this.flagImg;
    if (!M || !im) return;
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
    octx.rotate(M.angle);
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

    // Shading. A multiply onto empty canvas paints the source rather than
    // doing nothing, so the panel would flood the whole finger — clip to the
    // patch first. The welt is left out on purpose: its groove is exactly what
    // the merge erases, and multiplying it back draws the seam through the
    // flag. The clip is fixed in device space, so resetting the transform
    // underneath it is safe.
    octx.save();
    octx.translate(M.cx, M.cy);
    octx.rotate(M.angle);
    octx.beginPath();
    octx.rect(-M.w / 2, -L / 2, M.w, L);
    octx.clip();
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.globalCompositeOperation = 'multiply';
    octx.drawImage(this.panelMask(['back3', 'back4']), 0, 0);
    octx.restore();

    // Clipping does include the welt, or the closed seam slices the patch.
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(this.panelMask(['back3', 'back4', 'welt_index']), 0, 0);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 6; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }

  // highlight: { id, amount } brightens one zone (hover / selection feedback)
  // mergeIndex: the index finger is one piece under a flag, so close the welt
  // seam that splits back3 from back4 by painting it in the panel's colour.
  draw(ctx, state, bulletSel, highlight, mergeIndex, mirror = false) {
    const D = this.DATA;
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
    for (const z of D.zones) {
      // A chosen web replaces the glove's own, whole: the stock web and the
      // lacing through it both go, or the new one sits under the old one's
      // laces. What stays is the lacing outside the web — the knotted lace
      // sits on the outside of the glove and passes over any web.
      if (swap && z.id === 'web') {
        // webfinger is the index finger's own edge, carried in the same
        // cutout so the join comes from one photograph. It is finger leather,
        // so it takes back3's colour, not the web's.
        // The finger strip goes on LAST, over the web, not under it. Its
        // alpha is feathered to hide the join between two photographs, and
        // underneath the web it had nothing but page to feather onto — a
        // pale hairline down the whole seam. On the glove the finger's
        // rolled edge is in front of the web anyway.
        for (const [key, zone] of [[swap.web, 'web'],
                                   [swap.laceweb, 'laces'],
                                   [swap.webfinger, 'back3']]) {
          if (!key || !this.imgs[key] || !D.bbox[key]) continue;
          const c = this.tinted(key, this.hex(zone, state));
          ctx.drawImage(c, c._ox, c._oy);
        }
        continue;
      }
      const c = this.tinted(z.id, this.hex(z.id, state));
      if (z.id === 'embroidery') {
        const eb = D.bbox.embroidery;
        this.unmirror(ctx, eb[0], eb[2], mirror,
                      () => ctx.drawImage(c, c._ox, c._oy));
      } else {
        ctx.drawImage(c, c._ox, c._oy);
      }
      // The pad is one piece of leather laid over the finger, so the welt
      // seam that splits the finger runs under it, not across it — Scott,
      // looking at the seam drawn over the top: "it should always overlap
      // the welting, always." It goes on after the welting for that. The
      // lining and the binding then go back over its lower end, because on
      // the photograph the pad disappears under the binding rather than
      // sitting on top of it.
      if (z.id === 'welting' && this.pad && this.imgs.pad && D.bbox.pad) {
        const pd = this.tinted('pad', this.padHex || '#F2F0EA');
        ctx.drawImage(pd, pd._ox, pd._oy);
        for (const over of ['lining', 'binding']) {
          if (!this.imgs[over] || !D.bbox[over]) continue;
          const o = this.tinted(over, this.hex(over, state));
          ctx.drawImage(o, o._ox, o._oy);
        }
      }
      // The lace running through the stock web is split off the laces layer,
      // because it belongs to the web type — a different web is laced
      // differently. It still takes the lace colour.
      // The web's own stitching goes with the web, exactly as its lacing does.
      if (z.id === 'stitching' && !swap
          && this.imgs.stitching_web && D.bbox.stitching_web) {
        const w = this.tinted('stitching_web', this.hex('stitching', state));
        ctx.drawImage(w, w._ox, w._oy);
      }
      if (z.id === 'laces') {
        if (!swap && this.imgs.laces_web && D.bbox.laces_web) {
          const w = this.tinted('laces_web', this.hex('laces', state));
          ctx.drawImage(w, w._ox, w._oy);
        }
        // The knotted lace belongs to the web, not the glove: the Standard I
        // has none. Any web that does not declare knot:false keeps it.
        if (this.imgs.laces_knot && D.bbox.laces_knot
            && !(swap && swap.knot === false)) {
          const k = this.tinted('laces_knot', this.hex('laces', state));
          ctx.drawImage(k, k._ox, k._oy);
        }
      }
    }
    // The stretch of knotted lace that hangs off the rim has no glove behind
    // it, so a web that declines the knot has to take it away or it stays as
    // a lace-shaped tab floating beside the hand. This comes after the zones,
    // not with the web punch-out: the segmentation cut part of that lace into
    // back 2, which would otherwise paint it straight back in.
    if (swap && swap.knot === false && this.imgs.knot_cut) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(this.imgs.knot_cut, 0, 0);
      ctx.restore();
    }
    if (mergeIndex && this.imgs.welt_index && D.bbox.welt_index) {
      const c = this.tinted('welt_index', this.hex('back3', state));
      ctx.drawImage(c, c._ox, c._oy);
    }
    if (mergeIndex) {
      const M = D.flagMount, r = Math.max(M.w, M.h);
      this.unmirror(ctx, M.cx - r, M.cx + r, mirror, () => this.drawFlag(ctx));
    }
    const bb = D.bulletBox;
    this.unmirror(ctx, bb[0], bb[2], mirror,
                  () => this.drawBullet(ctx, bulletSel));
    if (highlight && highlight.id && D.bbox[highlight.id]) {
      const c = this.tinted(highlight.id, '#ffffff');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = highlight.amount;
      ctx.drawImage(c, c._ox, c._oy);
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // The id map is of the right-handed glove, so a click on a mirrored render
  // has to be folded back before it is looked up, or every panel selects the
  // one opposite it.
  zoneAt(x, y, mirror = false) {
    const D = this.DATA;
    if (mirror) x = D.w - 1 - x;
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
