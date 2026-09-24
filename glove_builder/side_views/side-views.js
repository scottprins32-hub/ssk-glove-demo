/* Thumb-side and pinky-side preview of the fixed SSK base glove.

   Uses the configurator's own renderer (../customiser/glove-engine.js) and
   catalogue unchanged: a side view is one more view in the shape the palm
   view already has. Colours are the same order fields the configurator
   stores, and "Neem kleuren over" reads the configurator's saved order.

   The glove body never depends on the web. Only the thumb view shows a web,
   and it was photographed with the calibration glove's own H-Web; any other
   web is drawn hatched and named as not photographed, never as done. */

import { GloveRenderer } from '../customiser/glove-engine.js';
import { NATIVE_WEB, WEBS, STARTERS, PALETTE_OF } from '../customiser/glove-catalog.js';

const SAVE_KEY = 'ssk-glove-v1';          // the configurator's own key
const VIEWS = { thumb: 'Duimzijde', pinky: 'Pinkzijde' };
const LEATHER_FIELDS = ['web', 'back1', 'back2', 'back3', 'back4', 'back5',
  'back6', 'back7', 'back8', 'back9', 'palm', 'belt', 'lining', 'thumb_loops',
  'pinky_loops'];

async function decode(DATA) {
  const imgs = {};
  await Promise.all(Object.entries(DATA.assets).map(([n, src]) =>
    new Promise(res => {
      const im = new Image();
      im.onload = () => { imgs[n] = im; res(); };
      im.onerror = () => res();
      im.src = src;
    })));
  const c = document.createElement('canvas');
  c.width = DATA.w; c.height = DATA.h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(imgs._idmap, 0, 0);
  return { DATA, imgs, idData: g.getImageData(0, 0, DATA.w, DATA.h).data };
}

/* A starter's `_panels` stands for every leather field it does not name. */
function expand(colors) {
  const out = { ...colors };
  if (colors._panels) {
    for (const f of LEATHER_FIELDS) if (!(f in colors)) out[f] = colors._panels;
  }
  if (colors.embroidery && !out.ring_emb) out.ring_emb = colors.embroidery;
  delete out._panels; delete out.embroidery;
  return out;
}

export async function boot() {
  const back = await (await fetch('../customiser/assets/glove-data.json')).json();
  const views = {};
  for (const v of Object.keys(VIEWS)) {
    const D = await (await fetch(`../customiser/assets/${v}-data.json`)).json();
    // asset paths in the data are relative to the configurator
    for (const k of Object.keys(D.assets)) D.assets[k] = '../customiser/' + D.assets[k];
    D.palettes = back.palettes;
    views[v] = await decode(D);
  }
  const R = new GloveRenderer({ views, ...views.thumb });
  R.view = null;
  R.web = null; R.pad = null;

  const S = {
    view: 'thumb', hand: 'RHT', webType: NATIVE_WEB,
    colors: expand(STARTERS.find(s => s.id === 'jp').colors),
  };

  const canvas = document.getElementById('glove');
  const ctx = canvas.getContext('2d');

  function zoneState(D) {
    const st = {};
    for (const z of D.zones) st[z.id] = S.colors[z.field];
    return st;
  }

  function draw() {
    R.setView(S.view);
    const v = views[S.view], D = v.DATA;
    canvas.width = D.w; canvas.height = D.h;
    const mirror = S.hand === 'LHT';
    const zs = zoneState(D);
    // The lettering is drawn here rather than by the engine: for a left hand
    // it is the separately built embroidery_lht (reflected across its own
    // text line, build_side_views.py), so the word reads along the mirrored
    // finger at the mirrored slant.
    const emb = D.zones.find(z => z.id === 'embroidery');
    const embHex = emb ? R.hex('embroidery', zs) : null;
    const all = D.zones;
    if (emb) D.zones = all.filter(z => z !== emb);
    try { R.draw(ctx, zs, null, null, false, mirror); } finally { D.zones = all; }
    if (emb) {
      const key = mirror && D.embroideryLHT ? D.embroideryLHT : 'embroidery';
      const c = R.tinted(key, embHex, 'embroidery');
      ctx.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? D.w : 0, 0);
      ctx.drawImage(c, c._ox, c._oy);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // A web this view has no photograph of: hatched, and said so.
    const warn = document.getElementById('webWarn');
    const missing = D.webZone && S.webType && S.webType !== D.photographedWeb;
    warn.hidden = !missing;
    if (missing) {
      const im = v.imgs[D.webMarker] || v.imgs[D.webZone];
      const h = document.createElement('canvas');
      h.width = D.w; h.height = D.h;
      const g = h.getContext('2d');
      g.fillStyle = 'rgba(40,40,40,0.55)';
      g.fillRect(0, 0, D.w, D.h);
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = 6;
      for (let x = -D.h; x < D.w; x += 22) {
        g.beginPath(); g.moveTo(x, D.h); g.lineTo(x + D.h, 0); g.stroke();
      }
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(im, 0, 0);
      ctx.setTransform(mirror ? -1 : 1, 0, 0, 1, mirror ? D.w : 0, 0);
      ctx.drawImage(h, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      warn.textContent = `Web "${S.webType}" is niet gefotografeerd vanaf de duimzijde. ` +
        `Het gearceerde deel is de ${D.photographedWeb} van de basishandschoen met de veters ` +
        `erdoorheen, niet het gekozen web. ` +
        `De rest van de handschoen is wel correct.`;
    }
    document.getElementById('fixedNote').textContent = S.view === 'thumb'
      ? 'De duimcirkel met SSK-logo, de lichte bies boven de belt en de rand van de bullet ' +
        'staan vast zoals gefotografeerd; cirkelkleur en duimnummer worden hier niet getoond.'
      : 'Het ingestikte SSK op de ringvinger volgt het veld "SSK embroidery".';
    renderFields();
  }

  function renderFields() {
    const D = views[S.view].DATA;
    const box = document.getElementById('fields');
    box.textContent = '';
    for (const z of D.zones) {
      const pal = back.palettes[PALETTE_OF(z.field)];
      const lab = document.createElement('label');
      lab.textContent = z.label;
      const sel = document.createElement('select');
      sel.dataset.field = z.field;
      for (const [code, name] of pal) {
        const o = document.createElement('option');
        o.value = code; o.textContent = `${code} ${name}`;
        sel.appendChild(o);
      }
      sel.value = S.colors[z.field] ?? '';
      sel.onchange = () => { S.colors[z.field] = sel.value; draw(); };
      lab.appendChild(sel);
      box.appendChild(lab);
    }
    document.getElementById('hidden').textContent =
      'Niet zichtbaar in dit aanzicht: ' + D.fieldsNotShown.join(', ') + '.';
  }

  function buttons(id, entries, key) {
    const box = document.getElementById(id);
    box.textContent = '';
    for (const [value, text] of entries) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = text; b.dataset.value = value;
      b.setAttribute('aria-pressed', String(S[key] === value));
      b.onclick = () => { S[key] = value; buttons(id, entries, key); draw(); };
      box.appendChild(b);
    }
  }
  buttons('views', Object.entries(VIEWS), 'view');
  buttons('hands', [['RHT', 'Rechtshandig (RHT)'], ['LHT', 'Linkshandig (LHT)']], 'hand');

  const webSel = document.getElementById('web');
  for (const w of WEBS) {
    const o = document.createElement('option');
    o.value = w.id; o.textContent = w.id;
    webSel.appendChild(o);
  }
  webSel.value = S.webType;
  webSel.onchange = () => { S.webType = webSel.value; draw(); };

  document.getElementById('fromApp').onclick = () => {
    try {
      const o = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!o) return;
      S.colors = { ...S.colors, ...(o.colors || {}) };
      if (o.hand === 'LHT' || o.hand === 'RHT') S.hand = o.hand;
      if (o.webType) S.webType = o.webType;
      webSel.value = S.webType;
      buttons('hands', [['RHT', 'Rechtshandig (RHT)'], ['LHT', 'Linkshandig (LHT)']], 'hand');
      draw();
    } catch { /* nothing saved, or not readable here */ }
  };

  draw();
  // for side_views_check.mjs
  window.__side = {
    views, S, draw,
    set(o) { Object.assign(S, o); if (o.colors) S.colors = { ...o.colors }; draw(); },
  };
}

boot();
