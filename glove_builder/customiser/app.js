/* SSK glove configurator — "Straight Line".
   Eight steps, one decision at a time, covering all 36 questions of SSK's
   custom glove order form. */

import { loadGlove, GloveRenderer, refCode, applyCode } from './glove-engine.js';
import { HANDS, SIZES, PADS, WEBS, EMB_FONTS, FLAGS, CIRCLE_COLORS,
         OFFSTAGE, STARTERS, COLOUR_ORDER, NATIVE_WEB, T } from './glove-catalog.js';

/* SSK Europe's prices (from Pim via Scott, 2026-07-25): the Pro glove is
   € 294,95 off the shelf, € 374,95 once you configure your own. This is the
   configurator, so it quotes the custom price. */
const BASE_PRICE = '€ 374,95';
const STOCK_PRICE = '€ 294,95';

/* Which render layer each colour field drives. Fields absent from this map
   are real order fields the back view cannot show — see OFFSTAGE. */
const FIELD_TO_LAYER = {
  web: 'web', back2: 'back2', back3: 'back3', back4: 'back4', back5: 'back5',
  back6: 'back6', back7: 'back78', belt: 'belt', lining: 'lining',
  binding: 'binding', welting: 'welting', laces: 'laces',
  thumb_loops: 'thumb_loops', pinky_loops: 'pinky_loops',
  stitching: 'stitching', ring_emb: 'embroidery'
};
const LAYER_TO_FIELD = Object.fromEntries(
  Object.entries(FIELD_TO_LAYER).map(([f, l]) => [l, f]));

/* The palm and back 2 are cut from one piece of leather, so they cannot take
   different colours. SSK's own form says as much under Palm Color — "small
   part on back of glove under the web is part of the palm" — and that part is
   exactly what this view calls back 2. The form still asks twice, so both are
   still answered; picking either one answers the other. */
const TIED = { palm: 'back2', back2: 'palm' };

/* A flag is embroidered on one piece of leather, so back3 and back4 stop
   being separate choices — see the orange glove, where the Dutch flag sits
   on a single unsplit index-finger panel. */
const indexIsOnePiece = () => !!S.flag && S.flag !== 'None';

const PALETTE_OF = f =>
  f === 'stitching' ? 'stitching' :
  f === 'ring_emb' ? 'embroidery' :
  (f === 'binding' || f === 'welting' || f === 'laces') ? 'lace' : 'leather';

/* label key in T for each colour field */
const FIELD_LABEL = {
  web: 'webColor', palm: 'palm', belt: 'belt', lining: 'lining',
  binding: 'binding', welting: 'welting', laces: 'laces',
  thumb_loops: 'thumbLoops', pinky_loops: 'pinkyLoops', stitching: 'stitching',
  ring_emb: 'ringEmb', pad_color: 'padColor'
};
const BACK_NAMES = {
  en: ['Thumb wingtip', 'Rest of thumb', 'Index, 1st part', 'Index, 2nd part',
       'Middle, 1st part', 'Middle, 2nd part', 'Whole ring finger',
       'Rest of pinky', 'Pinky wingtip'],
  nl: ['Wingtip duim', 'Rest van de duim', 'Wijsvinger, 1e deel', 'Wijsvinger, 2e deel',
       'Middelvinger, 1e deel', 'Middelvinger, 2e deel', 'Hele ringvinger',
       'Rest van de pink', 'Wingtip pink']
};
const fieldLabel = (f, lang) => {
  const m = /^back([1-9])$/.exec(f);
  let s = m ? `Back ${m[1]} — ${BACK_NAMES[lang][+m[1] - 1]}`
            : (T[lang][FIELD_LABEL[f]] || f);
  if (TIED[f]) s += ` ${T[lang].tiedTo.replace('%s', fieldName(TIED[f], lang))}`;
  return s;
};
/* the other half of a tied pair, named without recursing back into the suffix */
const fieldName = (f, lang) => {
  const m = /^back([1-9])$/.exec(f);
  return m ? `Back ${m[1]}` : (T[lang][FIELD_LABEL[f]] || f);
};

/* 36 order-form questions. `req` mirrors the form's required flag. */
const QUESTIONS = [
  ...COLOUR_ORDER.map(f => ({ id: 'c:' + f, req: f !== 'pad_color' })),
  { id: 'hand', req: true }, { id: 'size', req: true }, { id: 'pad', req: true },
  { id: 'webType', req: true }, { id: 'bullet', req: true },
  { id: 'name', req: true }, { id: 'phone', req: true },
  { id: 'thumbText', req: false }, { id: 'thumbFont', req: false },
  { id: 'thumbMain', req: false }, { id: 'thumbOutline', req: false },
  { id: 'thumbNumber', req: false }, { id: 'circle', req: false },
  { id: 'numberColor', req: false }, { id: 'flag', req: false }
];

const S = {
  lang: 'nl', step: 0, part: 'web', bullet: 7,
  colors: {}, hand: null, size: null, pad: null, webType: null,
  thumbText: '', thumbFont: null, thumbMain: null, thumbOutline: null,
  thumbNumber: '', circle: null, numberColor: null, flag: null,
  name: '', phone: ''
};
let DATA, R, ctx, undoStack = [], redoStack = [], suppress = false;

const $ = s => document.querySelector(s);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const t = k => T[S.lang][k] || k;

/* ------------------------------------------------------------------ state */
function answered(q) {
  if (q.id.startsWith('c:')) return !!S.colors[q.id.slice(2)];
  const v = S[q.id];
  return v !== null && v !== undefined && v !== '';
}
const doneCount = () => QUESTIONS.filter(answered).length;

function snapshot() {
  if (suppress) return;
  undoStack.push(JSON.stringify(S));
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
}
function restore(json) {
  const keep = S.step, o = JSON.parse(json);
  Object.assign(S, o, { step: keep });
  suppress = true; draw(); paint(); suppress = false;
}

/* A link describes the glove, not the person. Name and phone are answers on
   the order form, not part of the design, and a configuration gets pasted
   into WhatsApp — contact details should not travel with it. */
const PRIVATE = ['name', 'phone'];

function encodeState(forLink = false) {
  const o = { ...S }; delete o.step;
  if (forLink) for (const k of PRIVATE) delete o[k];
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeState(s) {
  try {
    const j = decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
    return JSON.parse(j);
  } catch (e) { return null; }
}

/* Where work in progress lives.

   The URL used to do this job: every repaint rewrote an 830-character hash,
   which is why it never sat still. It was the wrong tool three times over —
   unreadable to paste, no help to the back button (replaceState makes no
   history entry), and it carried the customer's name and phone into anything
   they shared. Local storage is better at the one job that mattered: it
   survives a refresh AND a browser restart, and it never leaves the device.

   Every read and write is wrapped — a private window or blocked site data
   makes these throw, and losing the draft is not worth breaking the page. */
const SAVE_KEY = 'ssk-glove-v1';

function save() {
  try {
    const o = { ...S }; delete o.step;
    localStorage.setItem(SAVE_KEY, JSON.stringify(o));
  } catch (e) { /* no storage: the session still works, it just won't persist */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/* Colours the renderer needs, keyed by layer id. */
function layerState() {
  const out = {};
  for (const z of DATA.zones) {
    const f = LAYER_TO_FIELD[z.id];
    out[z.id] = S.colors[f] || DATA.palettes[z.group][0][0];
  }
  return out;
}
const code = () => refCode(DATA, layerState(), S.bullet);

/* ----------------------------------------------------------------- canvas */
const flagArt = () => {
  const f = FLAGS.find(f => f.id === S.flag);
  return (f && f.art) || null;
};
function draw() {
  R.setFlag(flagArt(), draw);      // redraws once the SVG has decoded
  const w = WEBS.find(w => w.id === S.webType);
  R.setWeb(w && w.render);
  // The pad is fitted or it is not; until a colour is chosen it is white,
  // which is the order the form asks in.
  R.setPad(S.pad === 'Finger Pad', S.colors.pad_color ? hexOf('pad_color') : null);
  R.draw(ctx, layerState(), S.bullet,
    S.step === 3 && FIELD_TO_LAYER[S.part]
      ? { id: FIELD_TO_LAYER[S.part], amount: 0.16 } : null,
    indexIsOnePiece());
}

/* ------------------------------------------------------------------ steps */
const STEPS = [
  { key: 'start', title: 'start', lead: 'pickStart', render: renderStart },
  { key: 'fit', title: 'fit', lead: null, render: renderFit },
  { key: 'web', title: 'webType', lead: null, render: renderWeb },
  { key: 'colours', title: 'colours', lead: 'pickColour', render: renderColours },
  { key: 'logos', title: 'logos', lead: null, render: renderLogos },
  { key: 'personal', title: 'name2', lead: null, render: renderPersonal },
  { key: 'you', title: 'details', lead: null, render: renderYou },
  { key: 'review', title: 'review', lead: null, render: renderReview }
];

/* fields each step is responsible for, for the per-step status dot */
const STEP_FIELDS = [
  [], ['hand', 'size', 'pad', 'c:pad_color'], ['webType'],
  COLOUR_ORDER.filter(f => f !== 'pad_color').map(f => 'c:' + f),
  ['bullet', 'c:ring_emb'],
  ['thumbText', 'thumbFont', 'thumbMain', 'thumbOutline', 'thumbNumber',
   'circle', 'numberColor', 'flag'],
  ['name', 'phone'], []
];
function stepOpen(i) {
  return STEP_FIELDS[i]
    .map(id => QUESTIONS.find(q => q.id === id))
    .filter(q => q && q.req && !answered(q)).length;
}

/* ------------------------------------------------------------- 1. start */
function renderStart(b) {
  const grid = el('div', 'cards');
  const groups = { stock: t('stock'), national: t('national'),
                   signature: t('signature'), blank: t('blankTag') };
  for (const st of STARTERS) {
    const c = el('button', 'card' + (S.startId === st.id ? ' is-on' : ''));
    c.type = 'button';
    const cv = el('canvas'); cv.width = 200; cv.height = 237;
    cv.style.width = '100%'; cv.style.aspectRatio = '200/237';
    c.appendChild(cv);
    c.appendChild(el('span', 'cap',
      `<span class="kick">${groups[st.group]}</span><span class="nm">${st[S.lang]}</span>` +
      (st.slot ? `<span class="sub">${t('sigSlot')}</span>` : '')));
    c.onclick = () => { applyStarter(st); paint(); };
    grid.appendChild(c);
    // thumbnail rendered from the real compositor, flag and all
    requestAnimationFrame(() => {
      const g = cv.getContext('2d');
      const prev = { ...S.colors }, pb = S.bullet, pf = S.flag;
      applyStarter(st, true);
      R.setFlag(flagArt());
      const tmp = document.createElement('canvas');
      tmp.width = DATA.w; tmp.height = DATA.h;
      R.draw(tmp.getContext('2d'), layerState(), S.bullet, null,
             indexIsOnePiece());
      g.drawImage(tmp, 0, 0, 200, 237);
      S.colors = prev; S.bullet = pb; S.flag = pf;
      R.setFlag(flagArt());          // the renderer holds one flag at a time
    });
  }
  b.appendChild(grid);

  const f = el('div', 'field');
  f.appendChild(el('span', 'field-lab', t('open')));
  const row = el('div', 'opts');
  const inp = el('input'); inp.type = 'text'; inp.placeholder = t('paste');
  inp.style.flex = '1 1 200px';
  const go = el('button', 'btn btn-ghost', t('open')); go.type = 'button';
  go.onclick = () => {
    const r = applyCode(DATA, inp.value.trim());
    if (!r) { inp.style.borderColor = 'var(--red-600)'; return; }
    snapshot();
    for (const [layer, num] of Object.entries(r.state)) {
      const fld = LAYER_TO_FIELD[layer];
      if (fld) S.colors[fld] = num;
    }
    S.bullet = r.bulletSel; draw(); paint();
  };
  row.append(inp, go);
  f.appendChild(row);
  b.appendChild(f);
}

function applyStarter(st, quiet) {
  if (!quiet) snapshot();
  const pr = DATA.presets[st.id] || st.colors || DATA.presets['Navy & Orange'];
  for (const f of COLOUR_ORDER) {
    // The pad is fitted white and stays white until someone picks a colour —
    // a starter colourway should not answer an optional question for them.
    if (f === 'pad_color') continue;
    const pal = DATA.palettes[PALETTE_OF(f)];
    let v = pr[FIELD_TO_LAYER[f]] !== undefined ? pr[FIELD_TO_LAYER[f]]
          : pr[f] !== undefined ? pr[f] : pr._panels;
    if (v === undefined) v = pal[0][0];
    if (!pal.some(c => c[0] === v)) v = pal[0][0];
    S.colors[f] = v;
  }
  for (const [a, b] of Object.entries(TIED))   // one piece, one colour
    if (S.colors[a] === undefined) S.colors[a] = S.colors[b];
  S.colors.palm = S.colors.back2;
  if (st.bullet != null) S.bullet = st.bullet;
  // a national build comes with its flag on; every other starter clears it
  S.flag = st.flag || null;
  if (indexIsOnePiece()) S.colors.back4 = S.colors.back3;
  if (!quiet) { S.startId = st.id; draw(); }
}

/* --------------------------------------------------------------- 2. fit */
function renderFit(b) {
  b.appendChild(choiceField(t('hand'), HANDS.map(h => ({
    id: h.id, label: h[S.lang], sub: h.sub
  })), S.hand, v => { snapshot(); S.hand = v; paint(); }, true));

  b.appendChild(choiceField(t('size'), SIZES.map(s => ({ id: s, label: s })),
    S.size, v => {
      snapshot(); S.size = v;
      if (S.webType && !WEBS.find(w => w.id === S.webType).sizes.includes(v)) S.webType = null;
      paint();
    }, true));

  b.appendChild(cardField(t('pad'), PADS.map(p => ({
    id: p.id, label: p[S.lang], img: p.img
  })), S.pad, v => { snapshot(); S.pad = v; draw(); paint(); }, true));

  const padOn = S.pad && S.pad !== 'None';
  const note = !padOn ? OFFSTAGE.pad_color
             : S.pad === 'Finger Hood' ? t('hoodNotDrawn') : null;
  b.appendChild(swatchField('pad_color', note, false));
}

/* --------------------------------------------------------------- 3. web */
function renderWeb(b) {
  if (!S.size) {
    b.appendChild(el('p', 'note', t('chooseSize')));
    return;
  }
  const fit = WEBS.filter(w => w.sizes.includes(S.size));
  b.appendChild(el('p', 'note',
    `${fit.length} ${t('filtered')} ${S.size}`));
  b.appendChild(cardField(t('webType'), fit.map(w => ({
    id: w.id, label: w.id, img: w.img
  })), S.webType, v => { snapshot(); S.webType = v; draw(); paint(); }, true));
  // Only some webs are photographed. The rest are ordered correctly but the
  // preview still shows the standard one, and saying so beats letting someone
  // believe the picture is their glove.
  const w = WEBS.find(w => w.id === S.webType);
  if (w && !w.render && w.id !== NATIVE_WEB)
    b.appendChild(el('p', 'note', t('webNotDrawn')));
  b.appendChild(swatchField('web', null, true));
}

/* ----------------------------------------------------------- 4. colours */
function renderColours(b) {
  const parts = el('div', 'parts');
  for (const f of COLOUR_ORDER) {
    if (f === 'pad_color') continue;
    if (f === 'back4' && indexIsOnePiece()) continue;   // merged into back3
    const p = el('button', 'part' + (S.part === f ? ' is-on' : ''));
    p.type = 'button';
    p.innerHTML = `<span class="chip" style="background:${hexOf(f)}"></span>` +
                  (f === 'back3' && indexIsOnePiece()
                    ? t('indexOnePiece') : fieldLabel(f, S.lang));
    p.onclick = () => { S.part = f; paint(); };
    parts.appendChild(p);
  }
  b.appendChild(parts);
  b.appendChild(swatchField(
    S.part,
    (S.part === 'back3' && indexIsOnePiece()) ? t('indexMerged')
                                              : (OFFSTAGE[S.part] || null),
    true));

  if (/^back/.test(S.part)) {
    const all = el('button', 'btn btn-ghost', t('applyAll'));
    all.type = 'button'; all.style.alignSelf = 'flex-start';
    all.onclick = () => {
      snapshot();
      const v = S.colors[S.part];
      for (let i = 1; i <= 9; i++) S.colors['back' + i] = v;
      draw(); paint();
    };
    b.appendChild(all);
  }
}

/* ------------------------------------------------------------- 5. logos */
function renderLogos(b) {
  const grid = el('div', 'cards');
  DATA.bullets.forEach((bl, i) => {
    const c = el('button', 'card' + (i === S.bullet ? ' is-on' : ''));
    c.type = 'button';
    c.innerHTML = `<img src="${bl.thumb}" alt="" loading="lazy">` +
      `<span class="cap"><span class="nm">${bl.name}</span>` +
      (bl.active === false ? `<span class="sub">${t('notShown')}</span>` : '') + `</span>`;
    if (bl.active === false) c.disabled = true;
    c.onclick = () => { snapshot(); S.bullet = i; draw(); paint(); };
    grid.appendChild(c);
  });
  const f = el('div', 'field');
  f.appendChild(labelRow(t('bullet'), true, S.bullet != null));
  f.appendChild(grid);
  b.appendChild(f);
  b.appendChild(swatchField('ring_emb', null, true));
}

/* ---------------------------------------------------- 6. personalisation */
function renderPersonal(b) {
  b.appendChild(refStrip([
    ['assets/ref/thumb_name.webp', t('thumbText')],
    ['assets/ref/thumb_circle.webp', t('thumbNumber')]
  ]));
  b.appendChild(textField(t('thumbText'), S.thumbText, 18,
    v => { S.thumbText = v; paint(false); }));
  if (S.thumbText) {
    b.appendChild(cardField(t('thumbFont'), EMB_FONTS.map(f => ({
      id: f.id, label: f.id, img: f.img
    })), S.thumbFont, v => { snapshot(); S.thumbFont = v; paint(); }, false));
    b.appendChild(threadField('thumbMain', t('thumbMain')));
    if (/Outline|Shadow/.test(S.thumbFont || ''))
      b.appendChild(threadField('thumbOutline', t('thumbOutline')));
  }
  const twoChars = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
  const circleField = textField(t('thumbNumber'), S.thumbNumber, 2,
    v => { S.thumbNumber = twoChars(v); paint(false); },
    false, 'text', twoChars);
  circleField.appendChild(el('p', 'note', t('circleHint')));
  b.appendChild(circleField);
  b.appendChild(choiceField(t('circle'), CIRCLE_COLORS.map(([n, hx]) => ({
    id: n, label: n, swatch: hx
  })), S.circle, v => { snapshot(); S.circle = v; paint(); }, false));
  if (S.thumbNumber) b.appendChild(threadField('numberColor', t('numberColor')));
  b.appendChild(cardField(t('flag'), FLAGS.map(f => ({
    id: f.id, label: f[S.lang] || f.id, img: f.img
  })), S.flag, v => {
    snapshot(); S.flag = v;
    // one piece of leather now, so the two halves share a colour
    if (indexIsOnePiece()) S.colors.back4 = S.colors.back3;
    draw(); paint();
  }, false));
}
/* Photographs of the real thing, so the wording is not the only guide to
   what these options actually look like. */
function refStrip(items) {
  const wrap = el('div', 'refs');
  for (const [src, cap] of items) {
    const f = el('figure', 'refshot');
    f.innerHTML = `<img src="${src}" alt="" loading="lazy">` +
                  `<figcaption>${cap}</figcaption>`;
    wrap.appendChild(f);
  }
  return wrap;
}
function threadField(key, label) {
  const pal = DATA.palettes.embroidery;
  return swatchGrid(label, pal, S[key], v => { snapshot(); S[key] = v; paint(); }, false, null);
}

/* --------------------------------------------------------- 7. your details */
function renderYou(b) {
  b.appendChild(textField(t('name'), S.name, 60, v => { S.name = v; paint(false); }, true));
  b.appendChild(textField(t('phone'), S.phone, 24, v => { S.phone = v; paint(false); }, true, 'tel'));
}

/* -------------------------------------------------------------- 8. review */
function renderReview(b) {
  const open = QUESTIONS.filter(q => q.req && !answered(q));
  if (open.length) {
    b.appendChild(el('p', 'note',
      `${t('required')}: ${open.length}`));
  } else {
    b.appendChild(el('p', 'note', t('allSet')));
  }
  b.appendChild(buildSpec());
  const go = el('button', 'btn btn-primary', t('finish'));
  go.type = 'button'; go.style.alignSelf = 'flex-start';
  go.onclick = openSheet;
  b.appendChild(go);
}

/* --------------------------------------------------------------- widgets */
function hexOf(f) {
  const pal = DATA.palettes[PALETTE_OF(f)];
  const c = pal.find(c => c[0] === S.colors[f]);
  return c ? c[2] : '#cccccc';
}
/* "still needed" only while it actually is; optional fields say so once. */
function labelRow(label, required, satisfied) {
  const tail = required
    ? (satisfied ? '' : `<span class="req">${t('required')}</span>`)
    : `<span class="opt">${t('optional')}</span>`;
  return el('span', 'field-lab', `${label} ${tail}`);
}
function choiceField(label, opts, value, onPick, required) {
  const f = el('div', 'field');
  f.appendChild(labelRow(label, required, value != null));
  const row = el('div', 'opts');
  for (const o of opts) {
    const b = el('button', 'opt-btn' + (value === o.id ? ' is-on' : ''));
    b.type = 'button';
    b.innerHTML = (o.swatch
      ? `<span class="chip" style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${o.swatch};border:1px solid rgba(0,0,0,.25);vertical-align:-1px;margin-right:6px"></span>` : '') +
      o.label + (o.sub ? `<small>${o.sub}</small>` : '');
    b.onclick = () => onPick(o.id);
    row.appendChild(b);
  }
  f.appendChild(row);
  return f;
}
function cardField(label, opts, value, onPick, required) {
  const f = el('div', 'field');
  f.appendChild(labelRow(label, required, value != null));
  const grid = el('div', 'cards');
  for (const o of opts) {
    const c = el('button', 'card' + (value === o.id ? ' is-on' : ''));
    c.type = 'button';
    c.innerHTML = (o.img ? `<img src="${o.img}" alt="" loading="lazy">` : '') +
      `<span class="cap"><span class="nm">${o.label}</span></span>`;
    c.onclick = () => onPick(o.id);
    grid.appendChild(c);
  }
  f.appendChild(grid);
  return f;
}
function swatchGrid(label, pal, value, onPick, required, note) {
  const f = el('div', 'field');
  f.appendChild(labelRow(label, required, value != null));
  if (note) f.appendChild(el('p', 'note', note));
  const grid = el('div', 'swatches');
  for (const [num, name, hx] of pal) {
    const s = el('button', 'sw' + (value === num ? ' is-on' : ''));
    s.type = 'button';
    s.innerHTML = `<span class="chip" style="background:${hx}"></span>` +
                  `<span class="num">${num}.</span><span class="nm">${name}</span>`;
    s.onclick = () => onPick(num);
    grid.appendChild(s);
  }
  f.appendChild(grid);
  return f;
}
function swatchField(field, note, required) {
  return swatchGrid(fieldLabel(field, S.lang), DATA.palettes[PALETTE_OF(field)],
    S.colors[field], v => {
      snapshot();
      S.colors[field] = v;
      if (TIED[field]) S.colors[TIED[field]] = v;
      if (indexIsOnePiece() && (field === 'back3' || field === 'back4')) {
        S.colors.back3 = S.colors.back4 = v;
      }
      draw(); paint();
    }, required, note);
}
function textField(label, value, max, onInput, required, type, clean) {
  const f = el('div', 'field');
  f.appendChild(labelRow(label, required, !!value));
  const i = el('input'); i.type = type || 'text'; i.value = value || '';
  i.maxLength = max;
  let tm;
  i.oninput = () => {
    if (clean) {                       // show exactly what gets ordered
      const c = clean(i.value);
      if (c !== i.value) i.value = c;
    }
    clearTimeout(tm);
    tm = setTimeout(() => onInput(i.value), 250);
  };
  i.onblur = () => { snapshot(); onInput(i.value); };
  f.appendChild(i);
  return f;
}

/* ----------------------------------------------------------------- spec */
function specRows() {
  const L = S.lang, rows = [];
  const push = (k, v) => rows.push([k, v || '—']);
  rows.push(['#', t('fit')]);
  push(t('hand'), S.hand && HANDS.find(h => h.id === S.hand)[L]);
  push(t('size'), S.size);
  push(t('pad'), S.pad && PADS.find(p => p.id === S.pad)[L]);
  push(t('padColor'), colName('pad_color'));
  rows.push(['#', t('web')]);
  push(t('webType'), S.webType);
  push(t('webColor'), colName('web'));
  rows.push(['#', t('colours')]);
  for (const f of COLOUR_ORDER) {
    if (f === 'web' || f === 'pad_color' || f === 'ring_emb') continue;
    if (f === 'back4' && indexIsOnePiece()) continue;
    push(f === 'back3' && indexIsOnePiece() ? t('indexOnePiece')
                                            : fieldLabel(f, L), colName(f));
  }
  rows.push(['#', t('logos')]);
  push(t('bullet'), DATA.bullets[S.bullet] && DATA.bullets[S.bullet].name);
  push(t('ringEmb'), colName('ring_emb'));
  rows.push(['#', t('personal')]);
  push(t('thumbText'), S.thumbText);
  push(t('thumbFont'), S.thumbFont);
  push(t('thumbMain'), embName(S.thumbMain));
  push(t('thumbOutline'), embName(S.thumbOutline));
  push(t('thumbNumber'), S.thumbNumber);
  push(t('circle'), S.circle);
  push(t('numberColor'), embName(S.numberColor));
  push(t('flag'), S.flag);
  rows.push(['#', t('you')]);
  push(t('name'), S.name);
  push(t('phone'), S.phone);
  return rows;
}
function colName(f) {
  const pal = DATA.palettes[PALETTE_OF(f)];
  const c = pal.find(c => c[0] === S.colors[f]);
  return c ? `${c[0]}. ${c[1]}` : null;
}
function embName(num) {
  const c = DATA.palettes.embroidery.find(c => c[0] === num);
  return c ? `${c[0]}. ${c[1]}` : null;
}
function buildSpec() {
  const wrap = el('div', 'spec'), dl = el('dl');
  for (const [k, v] of specRows()) {
    if (k === '#') { dl.appendChild(el('h3', null, v)); continue; }
    dl.appendChild(el('dt', null, k));
    dl.appendChild(el('dd', null, v));
  }
  wrap.appendChild(dl);
  return wrap;
}
function specText() {
  const lines = [`SSK custom glove — ${t('reference')}: ${code()}`, ''];
  for (const [k, v] of specRows())
    lines.push(k === '#' ? `\n[${v}]` : `${k}: ${v}`);
  if (BASE_PRICE) lines.push('', `${t('basePrice')} ${BASE_PRICE}`);
  return lines.join('\n');
}

/* ---------------------------------------------------------------- sheet */
function openSheet() {
  $('#sheetcode').textContent = code();
  $('#shot').src = $('#glove').toDataURL('image/png');
  const host = $('#spechost');
  host.textContent = '';
  host.appendChild(buildSpec());
  $('#scrim').hidden = false;
}
$('#sheetx').onclick = $('#keep').onclick = () => { $('#scrim').hidden = true; };
async function copyToClipboard(ev, txt) {
  const b = ev.currentTarget, was = b.textContent;   // nulled once we await
  try { await navigator.clipboard.writeText(txt); }
  catch (e) {
    const a = el('textarea'); a.value = txt; document.body.appendChild(a);
    a.select(); document.execCommand('copy'); a.remove();
  }
  b.textContent = t('copied');
  setTimeout(() => { b.textContent = was; }, 1600);
}
$('#copy').onclick = ev => copyToClipboard(ev, specText());
/* The only place a URL is ever written. Asked for, not imposed. */
$('#copylink').onclick = ev => copyToClipboard(ev,
  location.origin + location.pathname + '#' + encodeState(true));

/* ----------------------------------------------------------------- paint */
function paint(rebuildBody = true) {
  const L = S.lang;
  document.documentElement.lang = L;
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = t(e.dataset.t);
  $('#lang-nl').classList.toggle('is-on', L === 'nl');
  $('#lang-en').classList.toggle('is-on', L === 'en');

  // steps
  const nav = $('#steps'); nav.textContent = '';
  STEPS.forEach((st, i) => {
    const open = stepOpen(i);
    const b = el('button', 'step' + (i === S.step ? ' is-on' : ''));
    b.type = 'button';
    b.innerHTML = `<span class="n">${i + 1}</span>${t(st.title)}` +
      (STEP_FIELDS[i].length ? `<span class="dot${open ? ' todo' : ''}"></span>` : '');
    b.onclick = () => { S.step = i; paint(); };
    nav.appendChild(b);
  });

  const st = STEPS[S.step];
  $('#stepnum').textContent = String(S.step + 1).padStart(2, '0');
  $('#steptot').textContent = String(STEPS.length).padStart(2, '0');
  $('#steptitle').textContent = t(st.title);
  $('#steplead').textContent = st.lead ? t(st.lead) : '';
  const open = stepOpen(S.step);
  const state = $('#stepstate');
  state.textContent = open ? `${open} ${t('left')}` : t('done');
  state.classList.toggle('todo', open > 0);

  if (rebuildBody) {
    const b = $('#body'); b.textContent = ''; st.render(b); b.scrollTop = 0;
  }

  // stage
  const tag = $('#stagetag');
  if (S.step === 3) {
    tag.hidden = false;
    tag.textContent = `${fieldLabel(S.part, L)} · ${colName(S.part) || '—'}`;
  } else tag.hidden = true;
  $('#stagehint').textContent = S.step === 3 ? t('pickPart') : '';

  // header + bar
  $('#refcode').textContent = code();
  $('#price').textContent = BASE_PRICE;
  const d = doneCount();
  $('#donecount').textContent = d;
  $('#totalcount').textContent = QUESTIONS.length;
  $('#barfill').style.width = (100 * d / QUESTIONS.length) + '%';
  $('#prev').disabled = S.step === 0;
  $('#next').textContent = S.step === STEPS.length - 1 ? t('sendIt')
    : `${t(STEPS[S.step + 1].title)} →`;
  $('#undo').disabled = !undoStack.length;
  $('#redo').disabled = !redoStack.length;

  save();
}

/* ------------------------------------------------------------------ wire */
$('#prev').onclick = () => { if (S.step > 0) { S.step--; paint(); } };
$('#next').onclick = () => {
  if (S.step === STEPS.length - 1) return openSheet();
  S.step++; paint();
};
$('#lang-nl').onclick = () => { S.lang = 'nl'; paint(); };
$('#lang-en').onclick = () => { S.lang = 'en'; paint(); };
$('#undo').onclick = () => {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(S));
  restore(undoStack.pop()); paint();
};
$('#redo').onclick = () => {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(S));
  restore(redoStack.pop()); paint();
};

loadGlove().then(bundle => {
  DATA = bundle.DATA;
  R = new GloveRenderer(bundle);
  ctx = $('#glove').getContext('2d');
  R.preloadFlags(FLAGS.map(f => f.art)).then(() => { draw(); paint(); });

  applyStarter(STARTERS[0], true);
  S.startId = STARTERS[0].id;
  // A link someone was sent wins over whatever this device had saved; failing
  // that, pick the draft back up. Then clear the hash — leaving it in the bar
  // would go stale the moment anything changed, which is how it came to look
  // like the address was following you around.
  const h = location.hash.slice(1);
  const shared = h ? decodeState(h) : null;
  const o = shared || load();
  if (o) Object.assign(S, o, { step: 0 });
  if (h) history.replaceState(null, '', location.pathname + location.search);

  const cv = $('#glove');
  cv.addEventListener('click', ev => {
    const r = cv.getBoundingClientRect();
    const id = R.zoneAt((ev.clientX - r.left) * cv.width / r.width,
                        (ev.clientY - r.top) * cv.height / r.height);
    const f = id && LAYER_TO_FIELD[id];
    if (!f) return;
    S.step = 3; S.part = f; paint();
  });
  cv.addEventListener('pointermove', ev => {
    if (S.step !== 3) return;
    const r = cv.getBoundingClientRect();
    const id = R.zoneAt((ev.clientX - r.left) * cv.width / r.width,
                        (ev.clientY - r.top) * cv.height / r.height);
    cv.style.cursor = id ? 'pointer' : 'default';
  });

  draw(); paint();
});
