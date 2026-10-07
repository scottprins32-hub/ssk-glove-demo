/* SSK glove configurator — "Straight Line".
   Eight steps, one decision at a time, covering all 36 questions of SSK's
   custom glove order form. */

import { loadGlove, GloveRenderer } from './glove-engine.js';
import { encodeV2, decodeV2, decodeV1, isV2 } from './refcode.js';
import { WEB_REFERENCES, WITHDRAWN_WEBS, HANDS, SIZES, PADS, WEBS, EMB_FONTS, FLAGS, CIRCLE_COLORS,
         OFFSTAGE, STARTERS, COLOUR_ORDER, NATIVE_WEB, PALETTE_OF,
         UNCONFIRMED_BULLETS, T } from './glove-catalog.js';

/* SSK Europe's prices, confirmed by Pim 2026-08-29: the Pro glove is
   € 294,95 off the shelf, € 374,95 once you configure your own. This is the
   configurator, so it quotes the custom price. */
const UNSET = '#C4C9D0';           // --gray-300: reads as 'not picked', not as a colour
const BASE_PRICE = '€ 374,95';
const STOCK_PRICE = '€ 294,95';

/* Which render layer each colour field drives. Fields absent from this map
   are real order fields the back view cannot show — see OFFSTAGE. */
const FIELD_TO_LAYER = {
  web: 'web', palm: 'palm', back2: 'back2', back3: 'back3', back4: 'back4', back5: 'back5',
  back6: 'back6', back7: 'back78', belt: 'belt', lining: 'lining',
  binding: 'binding', welting: 'welting', laces: 'laces',
  thumb_loops: 'thumb_loops', pinky_loops: 'pinky_loops',
  stitching: 'stitching', ring_emb: 'embroidery'
};
const LAYER_TO_FIELD = Object.fromEntries(
  Object.entries(FIELD_TO_LAYER).map(([f, l]) => [l, f]));

/* The palm view has its own zones, and three of them are fields the back
   view collects without showing: the palm itself and the two wingtips. On
   this side they carry their own names, so the map is the identity. */
const PALM_FIELDS = {
  palm: 'palm', web: 'web', back1: 'back1', back9: 'back9',
  welting: 'welting', binding: 'binding', laces: 'laces'
};
/* The thumb and pinky sides name their zones' order fields in their own
   data (build_side_views.py), so their maps are read from there. */
const SIDE_VIEWS = ['thumb', 'pinky'];
const VIEW_KEYS = { back: 'viewBack', palm: 'viewPalm', thumb: 'viewThumb',
                    pinky: 'viewPinky' };
const sideData = () => (SIDE_VIEWS.includes(S.view) && R && R.views[S.view]
  ? (R.view === S.view || (S.view === 'thumb' && typeof R.view === 'string' && R.view.startsWith('thumbEstimated:'))
      ? R.DATA : R.views[S.view].DATA)
  : null);
/* A PALM-P1 insert brings its own thread (zone 8), so the stitching colour is
   a palm field only while one is drawn. The palm body's own thread is baked
   into the photograph and is never offered as recolourable. */
const palmFields = () => R && R.view === 'palm' && R.DATA.palmWebs?.entries?.[R.web]
  ? { ...PALM_FIELDS, stitching: 'stitching' } : PALM_FIELDS;
const viewLayerField = () => {
  const SD = sideData();
  if (SD) return Object.fromEntries(SD.zones.map(z => [z.id, z.field]));
  return S.view === 'palm' ? palmFields() : LAYER_TO_FIELD;
};
const viewFieldLayer = () => {
  if (sideData() || S.view === 'palm') {
    return Object.fromEntries(Object.entries(viewLayerField()).map(([l, f]) => [f, l]));
  }
  return FIELD_TO_LAYER;
};

/* Palm leather folds under the web onto the back. That local fold follows
   Palm Color; Back 2 remains the separate outer thumb panel (SSK parts diagram). */
/* A flag is embroidered on one piece of leather, so back3 and back4 stop
   being separate choices — see the orange glove, where the Dutch flag sits
   on a single unsplit index-finger panel. */
const indexIsOnePiece = () => !!S.flag && S.flag !== 'None';

// What the form calls it, and what the renderer calls the layer.
const PAD_PART = { 'Finger Pad': 'pad', 'Finger Hood': 'hood' };

/* A left-handed thrower's glove is the mirror of a right-handed one. The
   calibration glove is right-handed, so the preview flips for the other. */
const isLefty = () => /^L/i.test(S.hand || '');

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
  return s;
};
/* 36 order-form questions. `req` mirrors the form's required flag. */
const QUESTIONS = [
  ...COLOUR_ORDER.map(f => ({ id: 'c:' + f, req: f !== 'pad_color' })),
  { id: 'hand', req: true }, { id: 'size', req: true }, { id: 'pad', req: true },
  { id: 'webType', req: true }, { id: 'bullet', req: true },
  // Contact is the buyer's, not the design's: a draft is complete without it.
  // contactOpen() reports it separately, for sending to SSK Europe.
  { id: 'name', req: false, contact: true }, { id: 'phone', req: false, contact: true },
  { id: 'thumbText', req: false }, { id: 'thumbFont', req: false },
  { id: 'thumbMain', req: false }, { id: 'thumbOutline', req: false },
  { id: 'thumbNumber', req: false }, { id: 'circle', req: false },
  { id: 'pinkyText', req: false },
  { id: 'numberColor', req: false }, { id: 'flag', req: false },
  // "Other Flag" is not an instruction until it names the flag.
  { id: 'flagOther', req: false },
  // Not on SSK's form: set only after a reference code is opened, because a
  // code carries no names or numbers. Answered until then, so it never shows.
  { id: 'personalCheck', req: true }
];

const S = {
  lang: 'nl', step: 0, part: 'web', bullet: 7,
  view: 'back',
  colors: {}, hand: null, size: '11.75"', pad: null, webType: NATIVE_WEB,
  thumbText: '', thumbFont: null, thumbMain: null, thumbOutline: null,
  thumbNumber: '', circle: null, numberColor: null, flag: null, flagOther: '',
  pinkyText: '',
  name: '', phone: '',
  // A withdrawn web a saved design or link named (WITHDRAWN_WEBS). Kept, so a
  // reload still says why the web is empty; never an order option. Cleared
  // when an available web is chosen.
  withdrawnWeb: null
};
let DATA, R, ctx, undoStack = [], redoStack = [], suppress = false;
/* The web question reads unanswered while S.withdrawnWeb is set; this says why. */
const withdrawnNote = () => (S.withdrawnWeb && !S.webType)
  ? t('webWithdrawn').replace('%s', S.withdrawnWeb) : '';

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
  if (q.id === 'personalCheck') return S.personalCheck !== true;
  if (q.id.startsWith('c:')) return !!S.colors[q.id.slice(2)];
  if (q.id === 'phone') return phoneOk(S.phone);
  const v = S[q.id];
  return v !== null && v !== undefined && (typeof v !== 'string' || v.trim() !== '');
}
/* Permissive on purpose: country codes, spaces, dots, dashes, brackets, a
   slash, and an extension. What it refuses is text with no number in it. */
function phoneOk(v) {
  if (typeof v !== 'string') return false;
  const [main, ext] = v.trim().split(/\s*(?:ext\.?|extension|x|toestel|tst\.?)\s*(?=\d)/i);
  if (ext !== undefined && !/^\d{1,6}$/.test(ext)) return false;
  if (!/^\+?[\d\s().\-\/]+$/.test(main || '')) return false;
  const digits = main.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}
const contactOpen = () => QUESTIONS.filter(q => q.contact && !answered(q)).length;
const requiredQuestions = () => QUESTIONS.filter(q => q.req
  || (q.id === 'flagOther' && S.flag === 'Other Flag')
  || (['thumbFont', 'thumbMain'].includes(q.id) && (S.thumbText.trim() || S.pinkyText.trim()))
  || (q.id === 'thumbOutline' && (S.thumbText.trim() || S.pinkyText.trim()) && /Outline|Shadow/.test(S.thumbFont || ''))
  || (['circle', 'numberColor'].includes(q.id) && S.thumbNumber));
const countedQuestions = () => requiredQuestions().filter(q => q.id !== 'personalCheck');
const doneCount = () => countedQuestions().filter(answered).length;

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
  const o = { ...S, schemaVersion: 1 }; delete o.step;
  if (forLink) for (const k of PRIVATE) delete o[k];
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeState(s) {
  if (s.length > 16000) return null;
  try {
    const j = decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
    return JSON.parse(j);
  } catch (e) { return null; }
}

/* A shared link and a saved draft are both input, and neither is trustworthy:
   one can be edited by hand, and the other was written by an older version of
   this page. Restoring either unchecked put values into S that the catalogue
   no longer offers, and two things went wrong with that. specRows() looks a
   value up and reads [lang] off the result, so an unknown hand or pad threw on
   the review step -- the one page the customer sends to SSK. And answered()
   counts any non-empty value, so the step dot called the question done and
   nobody was asked again.

   Dropping what the catalogue cannot name fixes both at once: the field reads
   empty, its dot goes back to todo, and the customer is asked the question
   again. Free text is kept but bounded. Runs after DATA is loaded, because
   the colour codes are validated against the real palettes. */
function cleanState(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  const inList = (list, v) => (list.includes(v) ? v : null);
  const byId = (list, v) => (list.some((x) => x.id === v) ? v : null);
  const text = (v) => (typeof v === 'string' ? v.trim().slice(0, 120) : '');
  const embCode = (v) =>
    (DATA.palettes.embroidery.some((c) => c[0] === v) ? v : null);

  const src = (o.colors && typeof o.colors === 'object') ? o.colors : {};
  const colors = {};
  for (const f of COLOUR_ORDER) {
    const pal = DATA.palettes[PALETTE_OF(f)] || [];
    if (pal.some((c) => c[0] === src[f])) colors[f] = src[f];
  }

  const clean = {
    lang: o.lang === 'en' ? 'en' : 'nl',
    part: COLOUR_ORDER.includes(o.part) ? o.part : 'web',
    // A badge that no longer exists, or is switched off, becomes unanswered:
    // substituting another one would change the order without saying so.
    bullet: (Number.isInteger(o.bullet) && DATA.bullets[o.bullet] &&
             DATA.bullets[o.bullet].active !== false) ? o.bullet : null,
    colors,
    hand: byId(HANDS, o.hand),
    size: inList(SIZES, o.size),
    pad: byId(PADS, o.pad),
    webType: byId(WEBS, o.webType),
    thumbFont: byId(EMB_FONTS, o.thumbFont),
    flag: byId(FLAGS, o.flag),
    // Only meaningful with Other Flag; anywhere else it would be a stray name.
    flagOther: o.flag === 'Other Flag' ? text(o.flagOther).slice(0, 40) : '',
    circle: CIRCLE_COLORS.some((c) => c[0] === o.circle) ? o.circle : null,
    thumbMain: embCode(o.thumbMain),
    thumbOutline: embCode(o.thumbOutline),
    numberColor: embCode(o.numberColor),
    thumbText: text(o.thumbText).slice(0, 18),
    pinkyText: text(o.pinkyText).slice(0, 18),
    thumbNumber: text(o.thumbNumber).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2),
    name: text(o.name).slice(0, 60),
    phone: text(o.phone).slice(0, 32),     // room for a country code and extension
    view: Object.keys(VIEW_KEYS).includes(o.view) ? o.view : 'back',
    personalCheck: o.personalCheck === true,
  };
  if (clean.webType && !WEBS.find(w => w.id === clean.webType).sizes.includes(clean.size)) clean.webType = null;
  // A withdrawn web is never mapped to another one: it is dropped, so the
  // customer has to choose, and the page says why.
  clean.withdrawnWeb = clean.webType ? null
    : WITHDRAWN_WEBS.includes(o.webType) ? o.webType
    : WITHDRAWN_WEBS.includes(o.withdrawnWeb) ? o.withdrawnWeb : null;
  // Only carry a starter through if it still exists; otherwise leave whatever
  // the page already set, rather than blanking the highlight to undefined.
  if (STARTERS.some((st) => st.id === o.startId)) clean.startId = o.startId;
  return clean;
}

// A syntactically valid JSON object is not necessarily an SSK design.
// Recognize the existing link format before replacing somebody's current draft.
function cleanSharedState(raw) {
  if (!raw || !raw.colors || typeof raw.colors !== 'object' || Array.isArray(raw.colors)
      || !Object.hasOwn(raw, 'bullet')) return null;
  const clean = cleanState(raw);
  // Versioned links may intentionally contain an unanswered/blank design.
  // Legacy unversioned links still need a recognizable palette selection.
  return clean && (raw.schemaVersion === 1 || Object.keys(clean.colors).length) ? clean : null;
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
    const o = { ...S, schemaVersion: 1 }; delete o.step;
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
function layerState(D = R ? R.DATA : DATA, map = viewLayerField()) {
  const out = {};
  for (const z of D.zones) {
    const f = map[z.id];
    out[z.id] = S.colors[f] || DATA.palettes[z.group][0][0];
  }
  out.palm = S.colors.palm || '10';
  return out;
}
// The order's reference: the form's answers, whatever view is on screen.
const code = () => encodeV2(S, S.bullet == null ? null
  : (DATA.bullets[S.bullet] || {}).name ?? null);

/* A pasted code, applied through the same validation as a restored draft, so
   it cannot produce an order the form itself would refuse. A version-2 code
   is a whole order and replaces every choice it covers; an old one carries
   only colours and the badge, so it leaves everything else as it was. A
   badge that is gone, or not orderable, comes back unanswered. */
function applyPasted(text) {
  const d = isV2(text) ? decodeV2(text) : decodeV1(text);
  if (!d) return 'bad';
  if (d.ambiguous) return 'ambiguous';
  const bi = d.bulletName == null ? -1
    : DATA.bullets.findIndex((b) => b.name === d.bulletName);
  const next = { ...S, colors: isV2(text) ? d.colors : { ...S.colors, ...d.colors },
                 bullet: bi < 0 ? null : bi };
  if (isV2(text)) {
    for (const k of ['hand', 'size', 'pad', 'webType', 'flag', 'circle',
                     'thumbFont', 'thumbMain', 'thumbOutline', 'numberColor'])
      next[k] = d[k];
    // The code carries no free text, so the thumb and pinky wording and the
    // number belong to whoever had the page before: keeping them would put
    // another player's name on this order under this code's styling. They
    // are cleared and asked again. Name and phone are the buyer's, not the
    // design's, and stay.
    next.thumbText = ''; next.pinkyText = ''; next.thumbNumber = ''; next.flagOther = '';
    // …and the order is not complete until someone has looked: without this
    // the restored glove reads "All set" with its lettering silently gone.
    next.personalCheck = true;
  }
  const o = cleanState(next);
  if (!o) return 'bad';
  const { lang, part, view, ...order } = o;
  snapshot();                     // only once the code is known to be good
  Object.assign(S, order);
  return 'ok';
}
const shareLink = () => location.origin + location.pathname + '#' + encodeState(true);

/* ----------------------------------------------------------------- canvas */
const flagArt = () => {
  const f = FLAGS.find(f => f.id === S.flag);
  return (f && f.art) || null;
};
function paintView() {
  const vw = $('#stageview');
  if (!vw || vw.hidden) return;
  for (const b of vw.children) {
    b.textContent = t(VIEW_KEYS[b.dataset.view]);
    b.classList.toggle('is-on', b.dataset.view === S.view);
    b.setAttribute('aria-pressed', String(b.dataset.view === S.view));
    const a = viewAvailability(b.dataset.view);
    // A missing web render is a notice within this angle, not a navigation lock.
    b.setAttribute('aria-disabled', 'false');
    b.title = a.ok ? '' : a.reason === 'webWithdrawn' ? withdrawnNote() : vt(a.reason);
  }
}

/* Which sides of the glove can honestly show the chosen web. One answer, used
   by the view buttons, the stage, the picture and the proof. Read from the
   loaded data, never assumed:
     - H-Web is the photographed glove: every side.
     - Pinky side: the web is not visible from there, so every web, said so.
     - Back: only when the back data carries a render for that web.
     - Palm: H-Web, or one of the six PALM-P1 estimated inserts the loaded
       palm data registers and the engine verified. The two I-web estimates
       are not installed and stay unavailable, never an H-Web.
     - Thumb: H-Web, or a reviewed C3 estimate. The legacy thumb inserts in
       thumb-data predate the accepted studies and wait for a reviewed
       replacement; they are never shown as current.
   An unavailable side is drawn as an explicit notice, never as an H-Web. */
const VIEW_TEXT = {
  en: {
    pinkyNoWeb: 'The web is not visible from the pinky side. Your web is ordered as chosen.',
    webNoBack: 'There is no picture of this web yet. It is ordered exactly as chosen.',
    webNoPalm: 'There is no palm picture of this web yet. It is ordered exactly as chosen.',
    palmEstimated: 'Estimated palm view: the web is a generated inside-face render on the photographed H-Web palm, not a photograph of this web. Fit and construction are not shown. Your web and colours are ordered as chosen.',
    thumbAwaitingReview: 'The thumb-side picture of this web is being redone and is not shown until it is approved. It is ordered exactly as chosen.',
    webNoThumb: 'There is no thumb-side picture of this web yet. It is ordered exactly as chosen.',
    viewNotLoaded: 'This side could not be loaded.',
    viewUnavailableTitle: 'No picture of this side for %s',
    anglesUnavailable: 'Not available for this web: %s.',
    limUnavailable: 'No picture of the %s for %s; the image shows a notice instead.'
  },
  nl: {
    pinkyNoWeb: 'Het web is vanaf de pinkzijde niet zichtbaar. Je web wordt besteld zoals gekozen.',
    webNoBack: 'Van dit web is nog geen afbeelding. Het wordt precies zo besteld.',
    webNoPalm: 'Van dit web is nog geen afbeelding van de binnenkant. Het wordt precies zo besteld.',
    palmEstimated: 'Geschatte binnenkant: het web is een gegenereerde render op de gefotografeerde H-Web-palm, geen foto van dit web. Pasvorm en constructie worden niet getoond. Je web en kleuren worden besteld zoals gekozen.',
    thumbAwaitingReview: 'De afbeelding van de duimzijde van dit web wordt opnieuw gemaakt en pas getoond na goedkeuring. Het wordt precies zo besteld.',
    webNoThumb: 'Van dit web is nog geen afbeelding van de duimzijde. Het wordt precies zo besteld.',
    viewNotLoaded: 'Deze kant kon niet worden geladen.',
    viewUnavailableTitle: 'Geen afbeelding van deze kant voor %s',
    anglesUnavailable: 'Niet beschikbaar voor dit web: %s.',
    limUnavailable: 'Geen afbeelding van de %s voor %s; de afbeelding toont een melding.'
  }
};
const vt = k => (VIEW_TEXT[S.lang] || VIEW_TEXT.en)[k] || t(k);
const selectedWeb = () => WEBS.find(w => w.id === S.webType);
function viewAvailability(view, w = selectedWeb()) {
  if (S.withdrawnWeb && !S.webType) return { ok: false, reason: 'webWithdrawn' };
  if (!R || (view !== 'back' && !R.hasView(view))) return { ok: false, reason: 'viewNotLoaded' };
  const native = !w || w.id === NATIVE_WEB;
  if (view === 'pinky') return { ok: true, note: native ? null : 'pinkyNoWeb' };
  if (native) return { ok: true, note: null };
  if (view === 'back') return w.render && R.views.back?.DATA?.webs?.[w.render]
    ? { ok: true, note: null } : { ok: false, reason: 'webNoBack' };
  if (view === 'palm') return w.render && R.views.palm?.DATA?.palmWebs?.entries?.[w.render]
    ? { ok: true, note: 'palmEstimated' } : { ok: false, reason: 'webNoPalm' };
  if (view === 'thumb') {
    if (estimatesThumb(w)) return { ok: true, note: 'thumbEstimated' };
    return R.views.thumb?.DATA?.thumbWebs?.[w.render]
      ? { ok: false, reason: 'thumbAwaitingReview' } : { ok: false, reason: 'webNoThumb' };
  }
  return { ok: false, reason: 'viewNotLoaded' };
}
/* Choosing a web preserves the user's angle. If this web has no reviewed
   asset for that angle, keep the angle and show its existing honest notice. */
function editView(view) {
  if (!R || !R.hasView(view) || S.view === view) return false;
  S.view = view;
  return true;
}
function colourView(field) {
  // These parts are most clearly separated in their side view.
  const preferred = { back1: 'thumb', back2: 'thumb', back8: 'pinky',
    back9: 'pinky', palm: 'palm' }[field];
  if (preferred && viewAvailability(preferred).ok) return editView(preferred);
  if (viewAvailability(S.view).ok && viewFieldLayer()[field]) return false;
  // Retain any angle already showing the part; otherwise find a view that
  // can actually render it. Never change the web to make a view available.
  for (const view of ['back', 'palm', 'thumb', 'pinky']) {
    if (!viewAvailability(view).ok) continue;
    const fields = view === 'back' ? Object.keys(FIELD_TO_LAYER)
      : view === 'palm' ? Object.keys(PALM_FIELDS)
      : R.views[view].DATA.fieldsShown;
    if (fields.includes(field)) return editView(view);
  }
  return false;
}
function drawUnavailable(target, reason) {
  const D = R.views.back.DATA, cv = target.canvas;
  if (cv.width !== D.w || cv.height !== D.h) { cv.width = D.w; cv.height = D.h; }
  const g = target;
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, D.w, D.h);
  g.fillStyle = '#EEF0F2';
  g.fillRect(0, 0, D.w, D.h);
  g.fillStyle = '#3A3F47';
  g.textAlign = 'center';
  const w = selectedWeb();
  const lines = [[vt('viewUnavailableTitle').replace('%s', w ? w.id : (S.withdrawnWeb || '')), 'bold 34px system-ui, sans-serif'],
                 [t(VIEW_KEYS[S.view]), '30px system-ui, sans-serif']];
  let y = D.h / 2 - 80;
  for (const [txt, font] of lines) { g.font = font; g.fillText(txt, D.w / 2, y); y += 52; }
  g.font = '26px system-ui, sans-serif';
  let cur = '';
  for (const word of (reason === 'webWithdrawn' ? withdrawnNote() : vt(reason)).split(' ')) {
    const next = cur ? cur + ' ' + word : word;
    if (cur && g.measureText(next).width > D.w - 120) { g.fillText(cur, D.w / 2, y); y += 36; cur = word; }
    else cur = next;
  }
  if (cur) g.fillText(cur, D.w / 2, y);
  g.restore();
}

/* The selection tint is an editing aid, not part of the glove: only the
   Colours step shows it, and a proof never does (see proofImage). */
function draw(target = ctx, highlight = S.step === 3) {
  if (!R) return;
  // The palm is a second view of the same glove. Everything the back view
  // hangs on the glove — a swapped web, the flag, the bullet, the pad — has
  // no asset on this side, and the engine skips each of them on that basis.
  const w = WEBS.find(w => w.id === S.webType);
  const avail = viewAvailability(S.view, w);
  if (!avail.ok) { drawUnavailable(target, avail.reason); return; }
  // The webs C3 covers are drawn on the estimated body of their family, not the
  // photograph. Each family has its own view name so I-webs stay off the EM body.
  const view = S.view === 'thumb' && thumbEstimatedViewOf(w) || S.view;
  if (!R.setView(view)) { drawUnavailable(target, 'viewNotLoaded'); return; }
  const cv = target.canvas;
  if (cv.width !== R.DATA.w || cv.height !== R.DATA.h) {
    cv.width = R.DATA.w; cv.height = R.DATA.h;
  }
  R.setFlag(flagArt(), () => draw());   // redraws once the SVG has decoded
  R.setWeb(w && w.render);
  // A side view shows only the web it was photographed with.
  R.setWebMarked(!!w && w.id !== NATIVE_WEB);
  // The pad is fitted or it is not; until a colour is chosen it is white,
  // which is the order the form asks in.
  R.setPad(PAD_PART[S.pad] || null,
           S.colors.pad_color ? hexOf('pad_color') : null);
  R.draw(target, layerState(), S.bullet,
    highlight && viewFieldLayer()[S.part]
      ? { id: viewFieldLayer()[S.part], amount: 0.16 } : null,
    indexIsOnePiece(), isLefty());
}

/* What the picture cannot show, in words. The same list goes on the Review
   step, under the saved image, burned into the image, and into the exported
   text, so a proof never travels without it. */
function proofLimits() {
  const L = S.lang, out = [];
  out.push(t('limView').replace('%s', t(VIEW_KEYS[S.view])));
  if (withdrawnNote()) out.push(withdrawnNote());
  const w = WEBS.find(w => w.id === S.webType);
  const a = viewAvailability(S.view, w);
  if (!a.ok && a.reason === 'webWithdrawn') { /* said by withdrawnNote above */ }
  else if (!a.ok) out.push(vt('limUnavailable').replace('%s', t(VIEW_KEYS[S.view])).replace('%s', w ? w.id : '—'), vt(a.reason));
  else if (a.note === 'thumbEstimated') out.push(t('thumbEstimated'));
  else if (a.note) out.push(vt(a.note));
  if (S.thumbText.trim() || S.pinkyText.trim() || S.thumbNumber) out.push(t('limPersonal'));
  if (S.flag === 'Other Flag') out.push(t('limOtherFlag').replace('%s', S.flagOther.trim() || '—'));
  if (S.size) out.push(t('limSize').replace('%s', S.size));
  if (S.colors.back7 && S.colors.back8 && S.colors.back7 !== S.colors.back8 && S.view !== 'pinky')
    out.push(t('limBack8'));
  return out;
}
/* The saved picture: a clean draw — no selection tint, whichever step is
   open — with the limitations written underneath it. */
function proofImage() {
  const glove = document.createElement('canvas');
  draw(glove.getContext('2d'), false);
  const lines = proofLimits(), pad = 28, size = 24, lh = 32, maxW = glove.width - 2 * pad;
  const out = document.createElement('canvas');
  const g = out.getContext('2d');
  g.font = `${size}px system-ui, sans-serif`;
  const wrapped = [];
  for (const line of [t('limitsTitle') + ':', ...lines.map(l => '• ' + l)]) {
    let cur = '';
    for (const word of line.split(' ')) {
      const next = cur ? cur + ' ' + word : word;
      if (cur && g.measureText(next).width > maxW) { wrapped.push(cur); cur = '  ' + word; }
      else cur = next;
    }
    wrapped.push(cur);
  }
  out.width = glove.width;
  out.height = glove.height + pad * 2 + wrapped.length * lh;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, out.width, out.height);
  g.drawImage(glove, 0, 0);
  g.font = `${size}px system-ui, sans-serif`;
  g.fillStyle = '#1C1F24'; g.textBaseline = 'top';
  wrapped.forEach((l, i) => g.fillText(l, pad, glove.height + pad + i * lh));
  // Redraw the stage, since draw() switched the renderer's shared state.
  draw();
  return out;
}
function limitsBlock() {
  const box = el('div', 'note limits');
  box.appendChild(el('strong', null, t('limitsTitle')));
  const ul = el('ul');
  for (const l of proofLimits()) { const li = el('li'); li.textContent = l; ul.appendChild(li); }
  box.appendChild(ul);
  const w = WEBS.find(w => w.id === S.webType);
  if (w && w.id !== NATIVE_WEB && w.img) {
    const f = el('figure', 'refshot webref');
    const img = el('img'); img.src = w.img; img.alt = w.id; img.loading = 'lazy';
    const cap = el('figcaption'); cap.textContent = `${t('limWebRef')}: ${w.id}`;
    f.append(img, cap);
    box.appendChild(f);
  }
  return box;
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
   'pinkyText',
   'circle', 'numberColor', 'flag', 'flagOther', 'personalCheck'],
  ['name', 'phone'], []
];
function stepOpen(i) {
  if (STEPS[i].key === 'you') return contactOpen();
  return STEP_FIELDS[i]
    .map(id => requiredQuestions().find(q => q.id === id))
    .filter(q => q && !answered(q)).length;
}

/* ------------------------------------------------------------- 1. start */
function renderStart(b) {
  // Starter cards always show the back and never mutate the active view.
  const starterR = new GloveRenderer(R.views.back);
  // Reuse decoded flag images; thumbnail draws are synchronous.
  starterR._flags = R._flags || {};
  const grid = el('div', 'cards starter-cards');
  const groups = { built: t('built'), national: t('national'),
                   signature: t('signature'), blank: t('blankTag') };
  for (const st of STARTERS) {
    const c = el('button', 'card' + (S.startId === st.id ? ' is-on' : ''));
    c.type = 'button';
    c.setAttribute('aria-pressed', String(S.startId === st.id));
    c.dataset.key = 'starter|' + st.id;
    // Keep the source pixels: a 200px bitmap blurs on Retina and browser zoom.
    // CSS controls the card size; the backing canvas retains the full render.
    const cv = el('canvas'); cv.width = DATA.w; cv.height = DATA.h;
    cv.style.width = '100%'; cv.style.aspectRatio = DATA.w + '/' + DATA.h;
    c.appendChild(cv);
    c.appendChild(el('span', 'cap',
      `<span class="kick">${groups[st.group]}</span><span class="nm">${st[S.lang]}</span>`));
    c.onclick = () => { applyStarter(st); paint(); };
    grid.appendChild(c);
    // thumbnail rendered from the real compositor, flag and all
    requestAnimationFrame(() => {
      const g = cv.getContext('2d');
      const prev = { ...S.colors }, pb = S.bullet, pf = S.flag;
      applyStarter(st, true);
      starterR.setFlag(flagArt());
      starterR.draw(g, layerState(DATA, LAYER_TO_FIELD), S.bullet, null,
             indexIsOnePiece(), isLefty());
      S.colors = prev; S.bullet = pb; S.flag = pf;
      starterR.setFlag(flagArt());          // the renderer holds one flag at a time
    });
  }
  b.appendChild(grid);

  const f = el('div', 'field');
  f.appendChild(el('span', 'field-lab', t('open')));
  const row = el('div', 'opts');
  const inp = el('input'); inp.type = 'text'; inp.placeholder = t('paste');
  inp.style.flex = '1 1 200px';
  inp.setAttribute('aria-label', t('paste'));
  const feedback = el('p', 'note'); feedback.setAttribute('role', 'status');
  const go = el('button', 'btn btn-ghost', t('open')); go.type = 'button';
  go.onclick = () => {
    const raw = inp.value.trim();
    const hash = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '';
    const restored = hash ? cleanSharedState(decodeState(hash)) : null;
    if (restored) {
      snapshot();
      for (const k of PRIVATE) delete restored[k];
      Object.assign(S, restored); draw(); paint(); return;
    }
    const r = hash ? 'bad' : applyPasted(raw);
    if (r !== 'ok') {
      inp.setAttribute('aria-invalid', 'true');
      feedback.textContent = t(hash ? 'invalidDesign' : r === 'ambiguous' ? 'codeAmbiguous' : 'codeBad');
      return;
    }
    inp.removeAttribute('aria-invalid');
    draw(); paint();
    const notice = $('#body [role="status"]');
    if (notice) notice.textContent = t(isV2(raw) ? 'codeNoText' : 'legacyNotice');
  };
  row.append(inp, go);
  f.append(row, feedback);
  b.appendChild(f);
}

function applyStarter(st, quiet) {
  if (!quiet) snapshot();
  // A starter is either a named colourway in the data or carries its own
  // colours; the last resort is whatever colourway the data lists first,
  // rather than a name that has to keep existing.
  const pr = DATA.presets[st.id] || st.colors
    || Object.values(DATA.presets)[0] || {};
  for (const f of COLOUR_ORDER) {
    // Match optional finger protection to the starter index colour below,
    // after all panel colours have been resolved.
    if (f === 'pad_color') continue;
    const pal = DATA.palettes[PALETTE_OF(f)];
    let v = pr[FIELD_TO_LAYER[f]] !== undefined ? pr[FIELD_TO_LAYER[f]]
          : pr[f] !== undefined ? pr[f] : pr._panels;
    if (v === undefined) v = pal[0][0];
    if (!pal.some(c => c[0] === v)) v = pal[0][0];
    S.colors[f] = v;
  }
  if (st.bullet != null) S.bullet = st.bullet;
  // a national build comes with its flag on; every other starter clears it
  S.flag = st.flag || null;
  if (indexIsOnePiece()) S.colors.back4 = S.colors.back3;
  // Reset the shared hood/pad colour with the colourway; a later manual
  // choice remains independent until another starter is selected.
  S.colors.pad_color = S.colors.back3;
  if (!quiet) { S.startId = st.id; draw(); }
}

/* --------------------------------------------------------------- 2. fit */
function renderFit(b) {
  b.appendChild(choiceField(t('hand'), HANDS.map(h => ({
    id: h.id, label: h[S.lang], sub: h.sub
  })), S.hand, v => { snapshot(); S.hand = v; draw(); paint(); }, true));

  b.appendChild(choiceField(t('size'), SIZES.map(s => ({ id: s, label: s })),
    S.size, v => {
      snapshot(); S.size = v;
      if (S.webType && !WEBS.find(w => w.id === S.webType)?.sizes.includes(v)) S.webType = null;
      draw(); paint();
    }, true));

  const padF = cardField(t('pad'), PADS.map(p => ({
    id: p.id, label: p[S.lang], img: p.img
  })), S.pad, v => { snapshot(); S.pad = v; draw(); paint(); }, true,
    'portrait');
  b.appendChild(padF);
  padThumbs(padF);

  const padOn = S.pad && S.pad !== 'None';
  const note = padOn ? null : OFFSTAGE.pad_color;
  b.appendChild(swatchField('pad_color', note, false));
}

// The picker's pictures are SSK's own order-form thumbnails: a different
// glove in a different colour for every row, several with Japanese captions
// burned into them. Five of the thirteen webs can be drawn on the customer's
// own glove now, and choosing between two pictures of your own glove is a
// different thing from choosing between two pictures of someone else's. The
// other eight keep the form's photograph, and the note under the picker
// already says when the preview cannot follow.
// x, y, w, h in canvas pixels — 3:4 over the whole web. A web is tall and
// narrow, and in a landscape card it came out too small to tell one from
// another, which is the only thing the picker is for.
// A 3/4 crop of the render, in canvas pixels: x, y, w, h.
const WEB_BOX = [404, 10, 525, 700];      // the whole web
const PAD_BOX = [205, 120, 585, 780];     // the index finger, below the flag to the binding
// Cached on everything a thumbnail depends on, which is everything except
// which option is selected — clicking down a list changes only the ring
// round a card, and re-rendering four gloves to move it is 480 ms of nothing.
let thumbKey = null;
const thumbs = new Map();

// Replace an option card's supplied photograph with the customer's own glove,
// rendered from the compositor. `jobs` is [id, setUp] per drawable card, where
// setUp() puts the renderer in the state that card is offering.
function liveThumbs(field, items, box, jobFor) {
  const previewR = new GloveRenderer(R.views.back);
  previewR._flags = R._flags || {};
  previewR.setFlag(flagArt());
  const selectedWeb = WEBS.find(w => w.id === S.webType);
  previewR.setWeb(selectedWeb && selectedWeb.render);
  previewR.setPad(PAD_PART[S.pad] || null, S.colors.pad_color ? hexOf('pad_color') : null);
  const cards = field.querySelectorAll('.cards .card');
  const key = JSON.stringify([S.colors, S.hand, S.pad, S.bullet, S.flag,
                              S.webType, box]);
  if (key !== thumbKey) { thumbs.clear(); thumbKey = key; }
  const put = (card, cv) => {
    const shown = el('canvas');
    shown.width = cv.width; shown.height = cv.height;
    shown.getContext('2d').drawImage(cv, 0, 0);
    const old = card.querySelector('img, canvas');
    if (old) card.replaceChild(shown, old);
    else card.insertBefore(shown, card.firstChild);
  };
  const todo = [];
  items.forEach((it, i) => {
    const card = cards[i];
    const setUp = card && jobFor(it);
    if (!setUp) return;
    const hit = thumbs.get(box[0] + ':' + it.id);
    if (hit) put(card, hit); else todo.push([it, card, setUp]);
  });
  if (!todo.length) return;
  const tmp = document.createElement('canvas');
  tmp.width = DATA.w; tmp.height = DATA.h;
  const tc = tmp.getContext('2d');
  // Always the back of the glove, whichever view the stage is showing: the
  // crops below are in the back view's pixels, and a web or a pad is what
  // these cards are about.
  let [sx, sy, sw, sh] = box;
  // The render is mirrored for a left-handed glove, so what the crop is
  // aimed at is on the other side of it and the crop has to mirror too.
  if (isLefty()) sx = DATA.w - sx - sw;
  // One per frame. Four full-canvas composites in a single frame is half a
  // second of locked-up page on a laptop and worse on a phone; spread out,
  // the cards fill in one after another and nothing blocks.
  const step = () => {
    const job = todo.shift();
    if (!job) return;
    const [it, card, setUp] = job;
    setUp(previewR);
    previewR.draw(tc, layerState(DATA, LAYER_TO_FIELD), S.bullet, null, indexIsOnePiece(), isLefty());
    const cv = document.createElement('canvas');
    cv.width = 300; cv.height = 400;
    cv.getContext('2d').drawImage(tmp, sx, sy, sw, sh, 0, 0, 300, 400);
    thumbs.set(box[0] + ':' + it.id, cv);
    if (card.isConnected) put(card, cv);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function webThumbs(field, fit) {
  liveThumbs(field, fit, WEB_BOX,
             w => (w.render || w.id === NATIVE_WEB)
               ? renderer => renderer.setWeb(w.render || null) : null);
}

// The finger pad, shown fitted rather than as a photograph of the part on its
// own. Scott, on the supplied picture: "it shows only the top part of the
// finger pad, and it doesn't really give an accurate description of what it
// is or what it would look like." The hood has no photograph to render from,
// so it keeps SSK's.
function padThumbs(field) {
  const hex = S.colors.pad_color ? hexOf('pad_color') : null;
  liveThumbs(field, PADS, PAD_BOX,
             p => (p.id === 'None' || PAD_PART[p.id])
               ? renderer => renderer.setPad(PAD_PART[p.id] || null, hex) : null);
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
  const field = cardField(t('webType'), fit.map(w => ({
    id: w.id, label: w.id, img: w.img
  })), S.webType, v => { snapshot(); S.webType = v; S.withdrawnWeb = null; draw(); paint(); }, true,
    'portrait');
  b.appendChild(field);
  webThumbs(field, fit);
  const wd = withdrawnNote();
  if (wd) b.appendChild(el('p', 'note note-warn', wd)).setAttribute('role', 'status');
  // Pictures of form webs that are not offered. Figures, not buttons: they
  // hold no state and nothing about them reaches the design or the order.
  const refs = el('section', 'web-refs');
  refs.setAttribute('aria-labelledby', 'webrefs-title');
  const h = el('h3', 'web-refs-title'); h.id = 'webrefs-title'; h.textContent = t('webRefTitle');
  refs.append(h, el('p', 'note', t('webRefNote')));
  const grid = el('div', 'web-refs-grid');
  for (const r of WEB_REFERENCES) {
    const fig = el('figure', 'web-ref');
    const img = el('img'); img.src = r.img; img.alt = `${r.id}: ${t('webRefBadge')}`; img.loading = 'lazy';
    const cap = el('figcaption');
    cap.append(el('strong', null, r.id), el('span', 'web-ref-badge', t('webRefBadge')));
    fig.append(img, cap); grid.appendChild(fig);
  }
  refs.appendChild(grid); b.appendChild(refs);
  // Only some webs are photographed. The rest are ordered correctly but the
  // preview still shows the standard one, and saying so beats letting someone
  // believe the picture is their glove.
  const note = webPreviewNote();
  if (note) b.appendChild(el('p', 'note', note === 'webWithdrawn' ? withdrawnNote() : vt(note)));
  b.appendChild(swatchField('web', null, true));
}

/* Whether the picture shows the web that will be ordered, per view. Only
   some webs are photographed at all, and those are cut for the back view
   only: the palm view has no asset for a swapped web and draws the stock one
   (see draw()). Saying so beats letting someone believe the picture is their
   glove. */
function webPreviewNote() {
  if (!R) return null;
  const a = viewAvailability(S.view);
  return a.ok ? a.note : a.reason;
}
/* Notes the stage itself carries, whatever step is open. */
const STAGE_NOTES = ['pinkyNoWeb', 'webNoBack', 'webNoPalm', 'thumbAwaitingReview',
                     'webNoThumb', 'viewNotLoaded', 'thumbEstimated', 'palmEstimated'];

/* Contract C3 (outputs/2d-finish-plan/CONTRACT-C3.json). For the webs it
   lists, the thumb side is drawn on a generated body — never the photograph —
   and per Scott's 29 Sep correction (draft-3) there are TWO body families,
   ONE fixed webless body each, and one web-local insert per web:
     - i  : standard-i, spiral-i share the webless i-fixed body (Standard I r03
            with its web removed to a bed). Two inserts, one per web. Neither
            insert has a thumb-side web-leather tab; the index attachment is
            the inward lace return, two short in/out points.
     - em : smlee, em-rocket, closed-diamond-net share the webless em-fixed
            body (EM Rocket r08, web removed to a bed). Three inserts.
   Both bodies keep a full 360° stitch ring around the SSK thumb-circle
   badge, delivered as body 'stitching' pixels (n=9) so it follows the
   stitching colour. The block sits in thumb-data.json as estimatedBody, so
   bundle.py inlines its assets with the rest. Until the installer writes a
   REVIEWED block, or if a body's layers or ANY insert of a web in its
   servesWebs is missing, there is no view for that body and the photographed
   thumb side, its inserts and its hatch behave exactly as before. */
const C3_ROLES = ['leather', 'laces', 'stitching', 'palm', 'cut', 'idmap'];
/* Draft-3: the two accepted bodies and their exact family/servesWebs. The route
   is driven by this table, not by data-block keys — an attacker who edited
   thumb-data.json cannot invent a body id, swap a family label or claim an
   I-web on the em-fixed body. Anything not in this map is ignored. */
const C3_FAMILIES = Object.freeze({
  'i-fixed':  Object.freeze({ family: 'i',  servesWebs: Object.freeze(['standard-i', 'spiral-i']) }),
  'em-fixed': Object.freeze({ family: 'em', servesWebs: Object.freeze(['smlee', 'em-rocket', 'closed-diamond-net']) })
});
/* {slug -> viewName}. Populated at load once the C3 bodies decode. */
const C3_ROUTE = {};
function estimatedThumbViews(v) {
  const B = v && v.DATA.estimatedBody;
  if (!B || B.contractRevision !== 'C3' || B.status !== 'REVIEWED'
      || B.label !== 'estimated' || !B.bodies) return null;
  const views = {}, bodyOfWeb = {}, inserts = (B.inserts && typeof B.inserts === 'object') ? B.inserts : {};
  // Iterate the canonical map, not B.bodies: an unknown bodyId, or a body
  // whose family / servesWebs disagree with the contract, never gets a view.
  for (const [bodyId, spec] of Object.entries(C3_FAMILIES)) {
    const body = B.bodies[bodyId];
    if (!body || body.family !== spec.family || !body.thumbCircle
        || !Array.isArray(body.servesWebs)
        || body.servesWebs.length !== spec.servesWebs.length
        || !spec.servesWebs.every(s => body.servesWebs.includes(s))) continue;
    // Defence in depth: the two families' canonical servesWebs sets are
    // disjoint, so any overlap in bodyOfWeb means the block was tampered
    // with — drop this body rather than route a slug twice.
    if (body.servesWebs.some(s => bodyOfWeb[s])) continue;
    // Every served slug must have an insert entry; missing insert fails closed.
    if (!body.servesWebs.every(s => inserts[s] && typeof inserts[s] === 'object')) continue;
    const imgs = {}, bbox = {};
    let ok = true;
    const take = (name, key) => {
      if (!key || !v.imgs[key]) { ok = false; return; }
      imgs[name] = v.imgs[key];
      if (v.DATA.bbox[key]) bbox[name] = v.DATA.bbox[key];
    };
    // Nothing of the photographed body is carried over: a zone's _hi sheen
    // left behind would light the estimated leather with the photograph.
    for (const [name, key] of Object.entries(body.layers || {})) take(name, key);
    for (const s of body.servesWebs) for (const key of Object.values(inserts[s])) take(key, key);
    // The generated body shows its welting, which the photograph's zones do
    // not: the one zone C3 may add, and only in this view.
    const extra = (body.zones || []).filter(z => z.id === 'welting' && z.n === 10
      && z.field === 'welting' && z.group === 'lace').slice(0, 1);
    const zones = [...v.DATA.zones, ...extra];
    if (!ok || !imgs.glove || !imgs._idmap || !imgs.thumb_circle_art
        || !zones.every(z => imgs[z.id] && bbox[z.id])
        || !body.servesWebs.every(s => C3_ROLES.every(r => imgs[inserts[s][r]] && bbox[inserts[s][r]]))) continue;
    const shown = extra.map(z => z.field);
    // Every web served by this body gets a thumbWebs entry; the engine's
    // insert block runs for both families identically.
    const thumbWebs = Object.fromEntries(body.servesWebs.map(s => [s, inserts[s]]));
    const DATA = { ...v.DATA, zones, bbox, thumbWebs, thumbCircle: body.thumbCircle,
                   sheen: body.sheen || {}, webMarker: null,
                   fieldsShown: [...v.DATA.fieldsShown, ...shown],
                   fieldsNotShown: v.DATA.fieldsNotShown.filter(f => !shown.includes(f)) };
    const c = document.createElement('canvas');
    c.width = DATA.w; c.height = DATA.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(imgs._idmap, 0, 0);
    const viewName = 'thumbEstimated:' + bodyId;
    views[viewName] = { DATA, imgs, idData: g.getImageData(0, 0, DATA.w, DATA.h).data };
    for (const s of body.servesWebs) bodyOfWeb[s] = viewName;
  }
  return Object.keys(views).length ? { views, bodyOfWeb } : null;
}
/* H-Web and every web C3 does not list stay on the photographed side. */
const thumbEstimatedViewOf = w => (w && w.id !== NATIVE_WEB && w.render
  && C3_ROUTE[w.render] && R?.views?.[C3_ROUTE[w.render]]) ? C3_ROUTE[w.render] : null;
const estimatesThumb = w => !!thumbEstimatedViewOf(w);

/* ----------------------------------------------------------- 4. colours */
function renderColours(b) {
  const parts = el('div', 'parts');
  for (const f of COLOUR_ORDER) {
    if (f === 'pad_color') continue;
    if (f === 'back4' && indexIsOnePiece()) continue;   // merged into back3
    const p = el('button', 'part' + (S.part === f ? ' is-on' : ''));
    p.type = 'button';
    p.dataset.key = 'part|' + f;
    p.innerHTML = `<span class="chip" style="background:${hexOf(f)}"></span>` +
                  (f === 'back3' && indexIsOnePiece()
                    ? t('indexOnePiece') : fieldLabel(f, S.lang));
    p.setAttribute('aria-pressed', String(S.part === f));
    p.onclick = () => {
      S.part = f;
      colourView(f);
      draw(); paint();                 // the tint follows the chosen part
    };
    parts.appendChild(p);
  }
  b.appendChild(parts);
  b.appendChild(swatchField(
    S.part,
    (S.part === 'back3' && indexIsOnePiece()) ? t('indexMerged')
      : sideData() ? (sideData().fieldsShown.includes(S.part) ? null : t('notOnThisSide'))
      : (OFFSTAGE[S.part] || null),
    true));

  b.appendChild(el('p', 'note swatch-note', t('swatchNote')));

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
    if (UNCONFIRMED_BULLETS.includes(bl.name)) return;
    const c = el('button', 'card' + (i === S.bullet ? ' is-on' : ''));
    c.type = 'button';
    c.setAttribute('aria-pressed', String(i === S.bullet));
    c.dataset.key = 'bullet|' + i;
    c.innerHTML = `<img src="${bl.thumb}" alt="" loading="lazy">` +
      `<span class="cap"><span class="nm">${bl.name}</span>` +
      (bl.active === false
        ? `<span class="sub">${t(bl.pending ? 'askPim' : 'notShown')}</span>` : '') + `</span>`;
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
  if (S.personalCheck) {
    const box = el('div', 'field');
    box.appendChild(el('p', 'note', t('codeNoText')));
    const ok = el('button', 'btn btn-ghost', t('personalOk'));
    ok.type = 'button';
    ok.onclick = () => { snapshot(); S.personalCheck = false; paint(); };
    box.appendChild(ok);
    b.appendChild(box);
  }
  b.appendChild(refStrip([
    ['assets/ref/thumb_name.webp', t('thumbText')],
    ['assets/ref/thumb_circle.webp', t('thumbNumber')]
  ]));
  b.appendChild(textField(t('thumbText'), S.thumbText, 18,
    v => { const changed = !!S.thumbText.trim() !== !!v.trim(); S.thumbText = v; return changed; }, false, 'text', null, 'thumb'));
  if (S.thumbText.trim() || S.pinkyText.trim()) {
    b.appendChild(cardField(t('thumbFont'), EMB_FONTS.map(f => ({
      id: f.id, label: f.id, img: f.img
    })), S.thumbFont, v => { snapshot(); S.thumbFont = v; paint(); }, true));
    b.appendChild(threadField('thumbMain', t('thumbMain')));
    if (/Outline|Shadow/.test(S.thumbFont || ''))
      b.appendChild(threadField('thumbOutline', t('thumbOutline')));
  }
  const twoChars = v => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
  const circleField = textField(t('thumbNumber'), S.thumbNumber, 2,
    v => { const changed = !!S.thumbNumber !== !!twoChars(v); S.thumbNumber = twoChars(v); return changed; },
    false, 'text', twoChars, 'thumb');
  circleField.appendChild(el('p', 'note', t('circleHint')));
  b.appendChild(circleField);
  b.appendChild(choiceField(t('circle'), CIRCLE_COLORS.map(([n, hx]) => ({
    id: n, label: n, swatch: hx
  })), S.circle, v => { snapshot(); S.circle = v; paint(); }, !!S.thumbNumber));
  if (S.thumbNumber) b.appendChild(threadField('numberColor', t('numberColor')));
  // Pinky embroidery is not one of the 36 questions on SSK's form, but it is
  // orderable — Scott's own glove reads "Modern Pitching" there, and Pim has
  // confirmed it. Font and thread follow the thumb's; if the pinky can carry
  // its own, it needs its own two questions rather than sharing them.
  const pinky = textField(t('pinkyText'), S.pinkyText, 18,
    v => { const changed = !!S.pinkyText.trim() !== !!v.trim(); S.pinkyText = v; return changed; }, false, 'text', null, 'pinky');
  if (S.pinkyText.trim()) pinky.appendChild(el('p', 'note', t('pinkyHint')));
  b.appendChild(pinky);
  b.appendChild(cardField(t('flag'), FLAGS.map(f => ({
    id: f.id, label: f[S.lang] || f.id, img: f.img
  })), S.flag, v => {
    snapshot(); S.flag = v;
    // one piece of leather now, so the two halves share a colour
    if (indexIsOnePiece()) S.colors.back4 = S.colors.back3;
    if (v !== 'Other Flag') S.flagOther = '';
    draw(); paint();
  }, false));
  if (S.flag === 'Other Flag') {
    const other = textField(t('flagOther'), S.flagOther, 40,
      v => { const changed = !!S.flagOther.trim() !== !!v.trim(); S.flagOther = v; return changed; }, true);
    other.appendChild(el('p', 'note', t(S.flagOther.trim() ? 'flagPending' : 'flagOtherNeeded')));
    b.appendChild(other);
  }
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
  return swatchGrid(label, pal, S[key], v => { snapshot(); S[key] = v; paint(); }, requiredQuestions().some(q => q.id === key), null);
}

/* --------------------------------------------------------- 7. your details */
function renderYou(b) {
  const status = el('p', 'note');
  status.setAttribute('role', 'status');
  const showStatus = () => { status.textContent = t(contactOpen() ? 'contactMissing' : 'contactReady'); };
  b.appendChild(textField(t('name'), S.name, 60, v => { S.name = v; showStatus(); return false; }, true));
  const phone = textField(t('phone'), S.phone, 32,
    v => { S.phone = v; showPhone(); showStatus(); return false; }, true, 'tel');
  const input = phone.querySelector('input'), msg = el('p', 'note', t('phoneBad'));
  msg.id = 'phonemsg';
  input.setAttribute('aria-describedby', 'phonemsg');
  input.autocomplete = 'tel';
  // Checked in place, so typing is never interrupted by a rebuild.
  const showPhone = () => {
    const bad = !!S.phone.trim() && !phoneOk(S.phone);
    msg.hidden = !bad;
    if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  };
  phone.appendChild(msg);
  showPhone();
  b.appendChild(phone);
  showStatus();
  b.appendChild(status);
}

/* -------------------------------------------------------------- 8. review */
function renderReview(b) {
  const open = requiredQuestions().filter(q => !answered(q));
  if (open.length) {
    b.appendChild(el('p', 'note',
      `${t('required')}: ${open.length}`));
  } else {
    b.appendChild(el('p', 'note', t('allSet')));
  }
  if (S.flag === 'Other Flag' && S.flagOther.trim()) b.appendChild(el('p', 'note', t('flagPending')));
  b.appendChild(el('p', 'note', t(contactOpen() ? 'contactMissing' : 'contactReady')));
  b.appendChild(limitsBlock());
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
  // nothing chosen yet. Was '#cccccc' here and '#888888' in the renderer —
  // two literals for the same failure, neither of them on the grey ramp.
  return c ? c[2] : UNSET;
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
  row.setAttribute('role', 'group'); row.setAttribute('aria-label', label);
  for (const o of opts) {
    const b = el('button', 'opt-btn' + (value === o.id ? ' is-on' : ''));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(value === o.id));
    b.dataset.key = `${label}|${o.id}`;
    b.innerHTML = (o.swatch
      ? `<span class="chip" style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${o.swatch};border:1px solid rgba(0,0,0,.25);vertical-align:-1px;margin-right:6px"></span>` : '') +
      o.label + (o.sub ? `<small>${o.sub}</small>` : '');
    b.onclick = () => onPick(o.id);
    row.appendChild(b);
  }
  f.appendChild(row);
  return f;
}
function cardField(label, opts, value, onPick, required, shape) {
  const f = el('div', 'field');
  f.appendChild(labelRow(label, required, value != null));
  const grid = el('div', 'cards' + (shape ? ' is-' + shape : ''));
  grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', label);
  for (const o of opts) {
    const c = el('button', 'card' + (value === o.id ? ' is-on' : ''));
    c.type = 'button';
    c.setAttribute('aria-pressed', String(value === o.id));
    c.dataset.key = `${label}|${o.id}`;
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
  grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', label);
  for (const [num, name, hx] of pal) {
    const s = el('button', 'sw' + (value === num ? ' is-on' : ''));
    s.type = 'button';
    s.setAttribute('aria-pressed', String(value === num));
    s.dataset.key = `${label}|${num}`;
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
      if (indexIsOnePiece() && (field === 'back3' || field === 'back4')) {
        S.colors.back3 = S.colors.back4 = v;
      }
      draw(); paint();
    }, required, note);
}
/* One edit of one text field is one undo step. The state before the first
   keystroke is kept, and pushed when the edit ends (blur, navigation, undo,
   redo, save) — pushing on blur, as this used to, recorded the state the
   debounce had already changed, so Undo kept the new text. The pending
   debounce lives here too, so whatever ends the edit can flush it. */
let textTx = null;   // { key, before, timer, apply, rebuild }
function flushText() {
  const tx = textTx;
  if (!tx) return false;
  textTx = null;
  clearTimeout(tx.timer);
  if (tx.apply) tx.rebuild = tx.apply() || tx.rebuild;
  if (JSON.stringify(S) !== tx.before && !suppress) {
    undoStack.push(tx.before);
    if (undoStack.length > 60) undoStack.shift();
    redoStack.length = 0;
  }
  return tx.rebuild;
}
/* Repainting during blur rebuilt the step buttons between mousedown and
   mouseup, so the first click after typing went nowhere. While a pointer is
   down the repaint waits until its click has been delivered. */
let pointerDown = false;
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
for (const type of ['pointerup', 'pointercancel'])
  document.addEventListener(type, () => { pointerDown = false; }, true);
function afterPointer(fn) {
  if (!pointerDown) { setTimeout(fn, 0); return; }
  const done = () => {
    document.removeEventListener('pointerup', done, true);
    document.removeEventListener('pointercancel', done, true);
    pointerDown = false;
    setTimeout(fn, 0);          // click is dispatched before this runs
  };
  document.addEventListener('pointerup', done, true);
  document.addEventListener('pointercancel', done, true);
}
function textField(label, value, max, apply, required, type, clean, preferredView) {
  const f = el('div', 'field');
  f.appendChild(labelRow(label, required, !!value));
  const i = el('input'); i.type = type || 'text'; i.value = value || '';
  i.maxLength = max;
  i.setAttribute('aria-label', label);
  const key = 'text|' + label;
  i.dataset.key = key;
  i.required = !!required;
  i.onfocus = () => {
    if (preferredView && editView(preferredView)) { draw(); paint(false); }
  };
  i.oninput = () => {
    if (clean) {                       // show exactly what gets ordered
      const c = clean(i.value);
      if (c !== i.value) i.value = c;
    }
    if (textTx && textTx.key !== key) flushText();
    if (!textTx) textTx = { key, before: JSON.stringify(S), timer: 0, apply: null, rebuild: false };
    const tx = textTx, v = i.value;
    clearTimeout(tx.timer);
    tx.apply = () => apply(v);
    tx.timer = setTimeout(() => {
      if (textTx !== tx) return;
      tx.rebuild = tx.apply() || tx.rebuild;
      tx.apply = null;
      // The field is still being typed in: a rebuild is only for fields that
      // appear or disappear with it (font, thread), and focus is restored.
      if (tx.rebuild) { tx.rebuild = false; paint(true); } else paint(false);
    }, 250);
  };
  i.onblur = () => {
    // A rebuild removing this input is not the end of the edit.
    if (!i.isConnected || !textTx || textTx.key !== key) return;
    const rebuild = flushText();
    afterPointer(() => paint(rebuild));
  };
  f.appendChild(i);
  return f;
}

/* ----------------------------------------------------------------- spec */
function specRows() {
  const L = S.lang, rows = [];
  const push = (k, v) => rows.push([k, typeof v === 'string' ? v.trim() || '—' : v || '—']);
  const active = key => requiredQuestions().some(q => q.id === key);
  rows.push(['#', t('fit')]);
  push(t('hand'), S.hand && HANDS.find(h => h.id === S.hand)?.[L]);
  push(t('size'), S.size);
  push(t('pad'), S.pad && PADS.find(p => p.id === S.pad)?.[L]);
  push(t('padColor'), S.pad && S.pad !== 'None' ? colName('pad_color') || '10. White' : null);
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
  push(t('pinkyText'), S.pinkyText);
  push(t('thumbFont'), active('thumbFont') ? S.thumbFont : null);
  push(t('thumbMain'), active('thumbMain') ? embName(S.thumbMain) : null);
  push(t('thumbOutline'), active('thumbOutline') ? embName(S.thumbOutline) : null);
  push(t('thumbNumber'), S.thumbNumber);
  push(t('circle'), active('circle') ? S.circle : null);
  push(t('numberColor'), active('numberColor') ? embName(S.numberColor) : null);
  push(t('flag'), S.flag === 'Other Flag'
    ? `${S.flag}: ${S.flagOther.trim() || '—'} (${t(S.flagOther.trim() ? 'flagPending' : 'flagOtherNeeded')})`
    : S.flag);
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
    const term = el('dt'), value = el('dd');
    term.textContent = k; value.textContent = v;
    dl.append(term, value);
  }
  wrap.appendChild(dl);
  return wrap;
}
/* Design completeness and contact completeness are separate facts. */
const designStatus = () => [
  requiredQuestions().some(q => !answered(q)) ? t('draftNotice') : t('readyNotice'),
  S.flag === 'Other Flag' && S.flagOther.trim() ? t('flagPending') : '',
  t(contactOpen() ? 'contactMissing' : 'contactReady')
].filter(Boolean).join(' ');
function specText() {
  if (flushText()) paint();
  const lines = [`SSK custom glove — ${t('reference')}: ${code()}`, designStatus(), '',
    `[${t('limitsTitle')}]`, ...proofLimits().map(l => '- ' + l)];
  const w = WEBS.find(w => w.id === S.webType);
  // The offline bundle inlines w.img as a data: URI; never put raw bytes in text.
  const ref = w && w.img && !/^data:/i.test(w.img) ? w.img : null;
  if (w) lines.push(`- ${t('webType')}: ${w.id}${ref ? ` (${t('limWebRef')}: ${ref})` : ''}`);
  lines.push('');
  for (const [k, v] of specRows())
    lines.push(k === '#' ? `\n[${v}]` : `${k}: ${v}`);
  if (BASE_PRICE) lines.push('', `${t('basePrice')} ${BASE_PRICE}`);
  lines.push('', t('designLink') + ': ' + shareLink(), '', t('sendLead'));
  return lines.join('\n');
}

/* ---------------------------------------------------------------- sheet */
let sheetReturnFocus;
function openSheet() {
  if (flushText()) paint();
  sheetReturnFocus = document.activeElement;
  $('#sheetcode').textContent = code();
  $('#shot').src = proofImage().toDataURL('image/png');
  $('#shot').alt = [t('limitsTitle'), ...proofLimits()].join(' ');
  const host = $('#spechost');
  host.textContent = '';
  host.appendChild(limitsBlock());
  host.appendChild(buildSpec());
  $('#sheetstatus').textContent = designStatus();
  $('#scrim').hidden = false;
  for (const e of document.querySelectorAll('body > header, body > nav, body > main, body > footer')) e.inert = true;
  $('#sheetx').focus();
}
function closeSheet() {
  $('#scrim').hidden = true;
  for (const e of document.querySelectorAll('body > header, body > nav, body > main, body > footer')) e.inert = false;
  if (sheetReturnFocus?.isConnected) sheetReturnFocus.focus();
}
$('#sheetx').onclick = $('#keep').onclick = closeSheet;
document.addEventListener('keydown', ev => {
  if ($('#scrim').hidden) return;
  if (ev.key === 'Escape') { ev.preventDefault(); closeSheet(); }
  if (ev.key !== 'Tab') return;
  const buttons = [...$('#scrim').querySelectorAll('button:not(:disabled)')];
  const first = buttons[0], last = buttons.at(-1);
  if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
  else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
});
async function copyToClipboard(ev, txt) {
  const b = ev.currentTarget, was = b.textContent;   // nulled once we await
  try { await navigator.clipboard.writeText(txt); }
  catch (e) {
    const a = el('textarea'); a.value = txt; document.body.appendChild(a);
    a.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch {}
    a.remove();
    if (!copied) { b.textContent = t('copyFailed'); setTimeout(() => { b.textContent = was; }, 2500); return; }
  }
  b.textContent = t('copied');
  setTimeout(() => { b.textContent = was; }, 1600);
}
$('#copy').onclick = ev => copyToClipboard(ev, specText());
/* The only place a URL is ever written. Asked for, not imposed. */
$('#copylink').onclick = ev => copyToClipboard(ev,
  shareLink());
$('#share').onclick = ev => copyToClipboard(ev, shareLink());
$('#download').onclick = () => {
  const url = URL.createObjectURL(new Blob([specText()], { type: 'text/plain;charset=utf-8' }));
  const a = el('a'); a.href = url; a.download = 'SSK-glove-design.txt';
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* ----------------------------------------------------------------- paint */
/* Every paint rebuilds the step nav and the body from scratch, which destroys
   whatever had focus and parks it on <body>. A mouse user never notices; a
   keyboard user's next Tab starts from the top of the page again, on every
   single choice. So: remember the focused control by a key that survives the
   rebuild, and put focus back on its replacement. Opening a different step is
   the one case where the old control is the wrong place to be -- there the
   step's heading takes it, so the reader hears where they are. */
const focusKey = (e) => e && e !== document.body && e.dataset
  // Never className: it gains " is-on" the moment a control is chosen, so the
  // one control whose focus matters most is the one it would fail to match.
  ? (e.dataset.key || `${e.tagName}|${e.id}|${e.textContent.trim()}`)
  : null;

function paint(rebuildBody = true) {
  if (!R) return; // Controls can be clicked while optional views are still loading.
  const L = S.lang;
  document.documentElement.lang = L;
  const hadKey = focusKey(document.activeElement);
  const wasStep = paint.lastStep;
  paint.lastStep = S.step;
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = t(e.dataset.t);
  $('#lang-nl').classList.toggle('is-on', L === 'nl');
  $('#lang-en').classList.toggle('is-on', L === 'en');
  paintView();

  // steps
  const nav = $('#steps'); nav.textContent = '';
  STEPS.forEach((st, i) => {
    const open = stepOpen(i);
    const b = el('button', 'step' + (i === S.step ? ' is-on' : ''));
    b.type = 'button';
    b.dataset.key = 'step|' + i;
    b.innerHTML = `<span class="n">${i + 1}</span>${t(st.title)}` +
      (STEP_FIELDS[i].length ? `<span class="dot${open ? ' todo' : ''}"></span>` : '');
    b.onclick = () => { flushText(); S.step = i; paint(); };
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

  // Entering or leaving Colours adds or removes the selection tint.
  if (wasStep !== undefined && wasStep !== S.step && (wasStep === 3 || S.step === 3)) draw();
  if (rebuildBody) {
    const b = $('#body');
    // A choice repaints the same step: keep the reader where they were.
    const keep = wasStep === S.step ? b.scrollTop : 0;
    const keepPage = wasStep === S.step ? document.scrollingElement.scrollTop : null;
    b.textContent = ''; st.render(b); b.scrollTop = keep;
    if (keepPage != null) document.scrollingElement.scrollTop = keepPage;
  }

  // stage
  const tag = $('#stagetag');
  if (S.step === 3) {
    tag.hidden = false;
    tag.textContent = `${fieldLabel(S.part, L)} · ${colName(S.part) || '—'}`;
  } else tag.hidden = true;
  // On any step, the stage says when it is not showing the chosen web.
  const wn = webPreviewNote();
  const off = [...($('#stageview')?.children || [])]
    .filter(b => !viewAvailability(b.dataset.view).ok).map(b => t(VIEW_KEYS[b.dataset.view]));
  const palmNote = [STAGE_NOTES.includes(wn) ? (wn === 'thumbEstimated' ? t(wn) : vt(wn)) : '',
    off.length ? vt('anglesUnavailable').replace('%s', off.join(', ')) : '',
    withdrawnNote()].filter(Boolean).join(' ');
  $('#stagehint').textContent = S.step === 3
    ? [t('pickPart'), palmNote].filter(Boolean).join(' ')
    : palmNote;

  // header + bar
  $('#refcode').textContent = code();
  $('#price').textContent = BASE_PRICE;
  const d = doneCount();
  $('#donecount').textContent = d;
  $('#totalcount').textContent = countedQuestions().length;
  $('#barfill').style.width = (100 * d / countedQuestions().length) + '%';
  $('#prev').disabled = S.step === 0;
  $('#next').textContent = S.step === STEPS.length - 1 ? t('sendIt')
    : `${t(STEPS[S.step + 1].title)} →`;
  $('#undo').disabled = !undoStack.length && !textTx;
  $('#redo').disabled = !redoStack.length;

  if (hadKey && wasStep !== undefined && wasStep !== S.step && hadKey.startsWith('step|')) {
    const h = $('#steptitle');
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  } else if (hadKey && !document.contains(document.activeElement) || document.activeElement === document.body) {
    const again = [...document.querySelectorAll('#steps button, #body button, #body input, #body select, #body textarea')]
      .find((e) => focusKey(e) === hadKey);
    if (again) again.focus({ preventScroll: true });
  }

  save();
}

/* ------------------------------------------------------------------ wire */
$('#prev').onclick = () => { flushText(); if (S.step > 0) { S.step--; paint(); } };
$('#next').onclick = () => {
  flushText();
  if (S.step === STEPS.length - 1) return openSheet();
  S.step++; paint();
};
$('#lang-nl').onclick = () => { S.lang = 'nl'; paint(); };
$('#lang-en').onclick = () => { S.lang = 'en'; paint(); };
$('#undo').onclick = () => {
  flushText();
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(S));
  restore(undoStack.pop()); paint();
};
$('#redo').onclick = () => {
  flushText();
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(S));
  restore(redoStack.pop()); paint();
};

loadGlove().then(bundle => {
  DATA = bundle.DATA;
  // The catalogue decides what can be ordered; the asset data only draws it.
  for (const b of DATA.bullets) {
    if (UNCONFIRMED_BULLETS.includes(b.name)) { b.active = false; b.pending = true; }
  }
  R = new GloveRenderer(bundle);
  // Not views of their own: draw() switches the thumb side to the estimated
  // view of the routed web's family. Two families, up to two view names
  // ('thumbEstimated:i-fixed', 'thumbEstimated:em-fixed').
  const est = estimatedThumbViews(R.views.thumb);
  if (est) { Object.assign(R.views, est.views); Object.assign(C3_ROUTE, est.bodyOfWeb); }
  ctx = $('#glove').getContext('2d');
  R.preloadFlags(FLAGS.map(f => f.art)).then(() => { draw(); paint(); });

  applyStarter(STARTERS[0], true);
  S.startId = STARTERS[0].id;
  // A link someone was sent wins over whatever this device had saved; failing
  // that, pick the draft back up. Then clear the hash — leaving it in the bar
  // would go stale the moment anything changed, which is how it came to look
  // like the address was following you around.
  const h = location.hash.slice(1);
  const shared = h ? cleanSharedState(decodeState(h)) : null;
  const o = cleanState(shared || load());
  if (o) Object.assign(S, o, { step: 0 });
  if (h) history.replaceState(null, '', location.pathname + location.search);

  const cv = $('#glove');
  cv.addEventListener('click', ev => {
    if (!viewAvailability(S.view).ok) return;
    const r = cv.getBoundingClientRect();
    const id = R.zoneAt((ev.clientX - r.left) * cv.width / r.width,
                        (ev.clientY - r.top) * cv.height / r.height, isLefty());
    const f = id && viewLayerField()[id];
    if (!f) return;
    S.step = 3; S.part = f; draw(); paint();
  });
  cv.addEventListener('pointermove', ev => {
    if (S.step !== 3 || !viewAvailability(S.view).ok) { cv.style.cursor = 'default'; return; }
    const r = cv.getBoundingClientRect();
    const id = R.zoneAt((ev.clientX - r.left) * cv.width / r.width,
                        (ev.clientY - r.top) * cv.height / r.height, isLefty());
    cv.style.cursor = id ? 'pointer' : 'default';
  });

  // Which side of the glove. Each view past the back is a separate data file
  // and is only offered when it loaded; the page has to work without them.
  const vw = $('#stageview');
  const views = Object.keys(VIEW_KEYS).filter(id => id === 'back' || R.hasView(id));
  if (views.length > 1) {
    vw.hidden = false;
    for (const id of views) {
      const b = el('button');
      b.type = 'button'; b.dataset.view = id;
      b.onclick = () => {
        if (!R.hasView(id)) return;
        S.view = id; draw(); paint();
      };
      vw.appendChild(b);
    }
  }

  // Phones: the preview can be made smaller to give the choices room. Only
  // shown by the stylesheet on narrow screens; nothing else is hidden.
  const size = el('button', 'btn btn-ghost stage-size');
  size.type = 'button';
  size.setAttribute('aria-pressed', 'false');
  size.dataset.t = 'previewSmaller';
  size.onclick = () => {
    const small = document.querySelector('.stage').classList.toggle('is-compact');
    size.setAttribute('aria-pressed', String(small));
    size.dataset.t = small ? 'previewLarger' : 'previewSmaller';
    size.textContent = t(size.dataset.t);
  };
  document.querySelector('.stage').appendChild(size);

  draw(); paint();
}).catch(error => {
  console.error('Glove initialization failed', error);
  $('#steptitle').textContent = t('loadError');
  $('#steplead').textContent = t('loadRetry');
  $('#next').disabled = true;
});
