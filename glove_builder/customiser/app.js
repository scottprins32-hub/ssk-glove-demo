/* SSK glove configurator — "Straight Line".
   Eight steps, one decision at a time, covering all 36 questions of SSK's
   custom glove order form. */

import {PRICE_CENTS,MATERIAL_FIELDS,quoteDesign,crocAll,normaliseMaterials} from './commerce-pricing.js';
import { loadGlove, GloveRenderer, assetURL, setImageSource, preloadImages } from './glove-engine.js';
import { NativeFrames, PublicRenders } from './render-cache.js';
import { stageBackground } from './stage-background.js';
import { encodeV4, decodeV4, isV4, encodeV3, decodeV3, isV3, decodeV2, decodeV1, isV2 } from './refcode.js';
import { WEB_REFERENCES, WITHDRAWN_WEBS, HANDS, SIZES, POSITIONS, PADS, WEBS, EMB_FONTS, FLAGS, CIRCLE_COLORS,
         OFFSTAGE, STARTERS, COLOUR_ORDER, NATIVE_WEB, PALETTE_OF,
         UNCONFIRMED_BULLETS, T } from './glove-catalog.js';
import { addDesign } from './gallery-store.js';
import { initStage } from './stage-interact.js'; import { chosenColour, markPicked, linkedFields, cleanPicked, whiteBlank } from './picked.js';

/* SSK Europe's prices, confirmed by Pim 2026-08-29: the Pro glove is
   € 294,95 off the shelf, € 374,95 once you configure your own. This is the
   configurator, so it quotes the custom price. */
// Scott confirmed snakeskin for the large exterior panels, at no surcharge.
// Crocodile is all nine back panels or none (Scott, 22 Oct 2026): a draft or
// code with only some of them in crocodile opens with all of them.
const cleanMaterials = input => normaliseMaterials(input);
const materialLabel = value => value === 'snakeskin' ? 'Crocodile pattern' : (S.lang === 'nl' ? 'Normaal leer' : 'Standard leather');
function layerMaterials(D=R.DATA, map=viewLayerField()) {
  return Object.fromEntries(D.zones.map(z=>[z.id,S.materials?.[map[z.id]] || 'standard']));
}
const UNSET = '#C4C9D0';           // --gray-300: reads as 'not picked', not as a colour
// Pim confirmed the flag surcharge through Scott on 7 October 2026.
// Integer cents: all UI and order exports use this single calculation.
const hasFlag = (s = S) => !!s.flag && s.flag !== 'None';
const priceBreakdown = (s = S) => quoteDesign(s);
const money = cents => new Intl.NumberFormat(S.lang === 'nl' ? 'nl-NL' : 'en-IE',
  { style: 'currency', currency: 'EUR' }).format(cents / 100);

/* Which render layer each colour field drives. Fields absent from this map
   are real order fields the back view cannot show — see OFFSTAGE. */
const FIELD_TO_LAYER = {
  web: 'web', palm: 'palm', back2:'back2', back3: 'back3', back4: 'back4', back5: 'back5',
  back6: 'back6', back7: 'back78', back8: 'back8', belt: 'belt', lining: 'lining',
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
  welting: 'welting', binding: 'binding', laces: 'laces', stitching:'stitching',
  back3:'back3',back4:'back4',back6:'back6',back7:'back7',belt:'belt',thumb_loops:'thumb_loops'
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
/* Native traced palm thread and PALM-P1 insert thread share the order's
   stitching field. Additional traced finger/trim fields remain independent. */
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

/* Palm leather folds under the web onto the back. The full lower exterior piece follows
   Palm Color. Back 2 is the separate panel between thumb-wingtip welting and web,
   visible in the thumb view (Scott correction, 8 October 2026). */
/* A flag is embroidered on one piece of leather, so back3 and back4 stop
   being separate choices — see the orange glove, where the Dutch flag sits
   on a single unsplit index-finger panel. */
const indexIsOnePiece = () => hasFlag() && S.flagPosition !== 'middle';
const middleIsOnePiece = () => hasFlag() && S.flagPosition === 'middle';
const colourPart = f => indexIsOnePiece() && f === 'back4' ? 'back3'
  : middleIsOnePiece() && f === 'back6' ? 'back5' : f;
function coupleFlagPanels(s = S) {
  if (!hasFlag(s)) return;
  const [a, b] = s.flagPosition === 'middle' ? ['back5','back6'] : ['back3','back4'];
  const value = s.colors[a] || s.colors[b];
  if (value) s.colors[a] = s.colors[b] = value;
  s.materials = cleanMaterials(s.materials);
  if (s.materials[a] === 'snakeskin') s.materials[b] = 'snakeskin';
  else delete s.materials[b];
  if (s.part === b) s.part = a;
}
const colourLabel = f => f === 'back3' && indexIsOnePiece() ? t('indexOnePiece')
  : f === 'back5' && middleIsOnePiece() ? t('middleOnePiece') : fieldLabel(f, S.lang);

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
  colors: {}, materials: {}, hand: null, size: '11.75"', position: null, pad: null, webType: NATIVE_WEB,
  thumbText: '', thumbFont: null, thumbMain: null, thumbOutline: null,
  thumbNumber: '', circle: null, numberColor: null, flag: null, flagPosition: 'index', flagOther: '',
  pinkyText: '',
  name: '', phone: '',
  // A withdrawn web a saved design or link named (WITHDRAWN_WEBS). Kept, so a
  // reload still says why the web is empty; never an order option. Cleared
  // when an available web is chosen.
  withdrawnWeb: null
};
let DATA, R, ctx, undoStack = [], redoStack = [], suppress = false;
const nativeFrames=new NativeFrames();
const publicRenders=new PublicRenders((window.__SSK_RENDER_REVISION__ || '')+'|scott-back-palm-r03|thumb-r13',window.__SSK_PERF__?.nonce || '');
let defaultVisual=null;
const visualKey=()=>JSON.stringify([S.colors,S.materials,S.hand,S.size,S.webType,S.pad,S.bullet,S.flag,S.flagPosition,
  S.thumbText,S.thumbNumber,S.pinkyText,S.circle,S.numberColor]);
const nativeFrameKey=(view,renderer=R)=>view+'|'+!!renderer.flagImg+'|'+Object.keys(renderer.views[view]?.imgs || {}).length;
const rememberPublic=(key,image)=>{
  const write=()=>publicRenders.write(key,image);
  if(window.requestIdleCallback) requestIdleCallback(write,{timeout:2000}); else setTimeout(write,32);
};
const sideFrameJobs=new Set();
function prepareSideFrame(view) {
  if(!starterFlagsReady || S.webType!==NATIVE_WEB || !R.views[view]?.ready) return;
  const signature=visualKey(),job=signature+'|'+view;
  if(sideFrameJobs.has(job)) return;
  sideFrameJobs.add(job);
  const work=async()=>{
    try {
      if(visualKey()!==signature || S.view===view || S.step===3) return;
      let data=R.views[view].DATA;
      const saved=signature===defaultVisual ? await publicRenders.read('default:'+view,data.w,data.h) : null;
      if(visualKey()!==signature || S.view===view || S.step===3) return;
      // A separate renderer cannot move the displayed glove or its picking map.
      const renderer=new GloveRenderer({ ...R.views.back,views:R.views });
      renderer._flags=R._flags;renderer.setView(view);
      renderer.setFlag(flagArt(),null,S.flagPosition);renderer.setWeb(null);renderer.setWebMarked(false);data=renderer.DATA;
      renderer.setPad(PAD_PART[S.pad] || null,S.colors.pad_color ? hexOf('pad_color') : null);
      const map=view==='palm' ? PALM_FIELDS : Object.fromEntries(data.zones.map(z=>[z.id,z.field]));
      renderer.setMaterials(layerMaterials(data,map));
      nativeFrames.select(signature);
      const key=nativeFrameKey(view,renderer);
      if(nativeFrames.get(key)) return;
      if(saved) {nativeFrames.put(key,saved);return;}
      const canvas=document.createElement('canvas');canvas.width=data.w;canvas.height=data.h;
      const image=renderer.drawCached(canvas.getContext('2d'),layerState(data,map),S.bullet,null,hasFlag(),isLefty(),nativeFrames,key);
      if(signature===defaultVisual && !Object.keys(R.views[view].assetErrors).length)
        rememberPublic('default:'+view,image);
    } catch { /* Preparing an angle is optional; selection retains its normal path. */ }
    finally {sideFrameJobs.delete(job);}
  };
  // Late enough that a first visit is interactive before the sides are drawn.
  if(window.requestIdleCallback) requestIdleCallback(work,{timeout:8000}); else setTimeout(work,3000);
}
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
const tsub = (k, sub) => (T[S.lang][k] || T.en[k] || {})[sub] || '';
let interact = null;        // stage-interact, once the glove is up

/* ------------------------------------------------------------------ state */
function answered(q) {
  if (q.id === 'personalCheck') return S.personalCheck !== true;
  if (q.id.startsWith('c:')) return !!chosenColour(S, q.id.slice(2));
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
  if (colors.palm) colors.back2 = colors.palm;      // one leather, one colour

  const clean = {
    lang: o.lang === 'en' ? 'en' : 'nl',
    part: COLOUR_ORDER.includes(o.part) ? o.part : 'web',
    // A badge that no longer exists, or is switched off, becomes unanswered:
    // substituting another one would change the order without saying so.
    bullet: (Number.isInteger(o.bullet) && DATA.bullets[o.bullet] &&
             DATA.bullets[o.bullet].active !== false) ? o.bullet : null,
    colors, materials: cleanMaterials(o.materials),
    hand: byId(HANDS, o.hand),
    size: inList(SIZES, o.size),
    position: byId(POSITIONS, o.position),   // advice only; never ordered
    pad: byId(PADS, o.pad),
    webType: byId(WEBS, o.webType),
    thumbFont: byId(EMB_FONTS, o.thumbFont),
    flag: byId(FLAGS, o.flag),
    flagPosition: o.flagPosition === 'middle' ? 'middle' : 'index',
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
    personalCheck: o.personalCheck === true, picked: cleanPicked(o.picked),
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
  coupleFlagPanels(clean);
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
  if (window.__SSK_PERF__) return; // Isolated benchmark never replaces a customer's draft.
  try {
    const o = { ...S, schemaVersion: 1 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(o));
    const saved = $('#saved');
    if (saved && save.last && save.last !== JSON.stringify(o)) {
      saved.textContent = t('savedNow'); saved.classList.add('is-on');
      clearTimeout(save.t); save.t = setTimeout(() => saved.classList.remove('is-on'), 1400);
    }
    save.last = JSON.stringify(o);
  } catch (e) { /* no storage: the session still works, it just won't persist */ }
}
function load() {
  if (window.__SSK_PERF__) return null;
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
  out.thumbMark = {text:S.thumbNumber,circle:CIRCLE_COLORS.find(c=>c[0]===S.circle)?.[1],thread:DATA.palettes.embroidery.find(c=>c[0]===S.numberColor)?.[2]};
  return out;
}
// The order's reference: the form's answers, whatever view is on screen.
const code = () => encodeV4(S, S.bullet == null ? null
  : (DATA.bullets[S.bullet] || {}).name ?? null);

/* A pasted code, applied through the same validation as a restored draft, so
   it cannot produce an order the form itself would refuse. A version-2 code
   is a whole order and replaces every choice it covers; an old one carries
   only colours and the badge, so it leaves everything else as it was. A
   badge that is gone, or not orderable, comes back unanswered. */
function applyPasted(text) {
  const current = isV4(text) || isV3(text) || isV2(text);
  const d = isV4(text) ? decodeV4(text) : isV3(text) ? decodeV3(text) : isV2(text) ? decodeV2(text) : decodeV1(text);
  if (!d) return 'bad';
  if (d.ambiguous) return 'ambiguous';
  const bi = d.bulletName == null ? -1
    : DATA.bullets.findIndex((b) => b.name === d.bulletName);
  const next = { ...S, colors: current ? d.colors : { ...S.colors, ...d.colors },
                 bullet: bi < 0 ? null : bi };
  if (current) {
    next.flagPosition = (isV4(text) || isV3(text)) ? d.flagPosition : 'index';
    next.materials = isV4(text) ? cleanMaterials(d.materials) : {};
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
  Object.assign(S, order); markPicked(S, ...COLOUR_ORDER);   // a pasted code is a chosen design
  S.part = colourPart(S.part);
  return 'ok';
}
const shareLink = () => location.origin + location.pathname + '#' + encodeState(true);

/* ----------------------------------------------------------------- canvas */
const flagArt = () => {
  const f = FLAGS.find(f => f.id === S.flag);
  return (f && f.art) || null;
};
/* The ink pill under the chosen side's tab glides to the new one. */
function paintViewInk(vw) {
  let ink = vw.querySelector('.stage-view-ink');
  const on = vw.querySelector('button.is-on');
  if (!on || !on.offsetWidth) return;
  if (!ink) { ink = el('span', 'stage-view-ink is-placing'); ink.setAttribute('aria-hidden', 'true'); vw.prepend(ink); vw.classList.add('has-ink'); }
  ink.style.transform = `translateX(${on.offsetLeft}px)`; ink.style.width = on.offsetWidth + 'px';
  if (ink.classList.contains('is-placing')) requestAnimationFrame(() => requestAnimationFrame(() => ink.classList.remove('is-placing')));
}
function paintView() {
  const vw = $('#stageview');
  if (!vw || vw.hidden) return;
  for (const b of vw.querySelectorAll('button')) {
    b.hidden = !R.hasView(b.dataset.view);
    b.querySelector('span').textContent = t(VIEW_KEYS[b.dataset.view]);
    b.setAttribute('aria-label', t(VIEW_KEYS[b.dataset.view]));
    b.classList.toggle('is-on', b.dataset.view === S.view);
    b.setAttribute('aria-pressed', String(b.dataset.view === S.view));
    const a = viewAvailability(b.dataset.view);
    // A missing web render is a notice within this angle, not a navigation lock.
    b.setAttribute('aria-disabled', 'false');
    b.title = a.ok ? '' : a.reason === 'webWithdrawn' ? withdrawnNote() : vt(a.reason);
  }
  paintViewInk(vw);
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
  // A deferred angle has not yet verified its inserts. Keep it selectable
  // without falsely declaring that its web picture does not exist.
  if (R.views[view]?.ready === false) return { ok: true, pending: true, note: null };
  const native = !w || w.id === NATIVE_WEB;
  if (view === 'pinky') return { ok: true, note: native ? null : 'pinkyNoWeb' };
  if (native) return { ok: true, note: null };
  if (view === 'back') return w.render && R.views.back?.DATA?.webs?.[w.render]
    ? { ok: true, note: null } : { ok: false, reason: 'webNoBack' };
  if (view === 'palm') return w.render && (R.views.palm?.DATA?.palmWebs?.entries?.[w.render]
      || R.views.palm?.hasPendingSelection?.(w.render))
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
  if ((field==='back8' || (R.DATA.tracedSeams && ['back2','palm'].includes(field))) && S.view === 'back' && viewAvailability('back').ok) return false;
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
const viewLoadMessage = () => R.views[S.view]?.absent ? vt('viewNotLoaded') : S.lang === 'nl'
  ? 'Deze weergave kon niet laden. Kies de weergave opnieuw om het nog eens te proberen.'
  : 'This view could not load. Select it again to retry.';
let selectionRequest = null, initialRendered = false;
const selectedAssets = () => {
  const web = selectedWeb()?.render || null;
  const snake = Object.values(S.materials || {}).includes('snakeskin');
  return { view: R.views[S.view], web, snake, bullet: S.bullet, key: JSON.stringify([S.view, web, snake, S.bullet]) };
};
const selectionIsReady = () => {
  const { view, web, snake, bullet } = selectedAssets();
  return !!view?.selectionReady(web, snake, bullet);
};
const selectionMessage = failed => S.lang === 'nl'
  ? (failed ? 'Deze optie kon niet laden. Probeer het opnieuw.' : 'Gekozen optie laden…')
  : (failed ? 'This option could not load. Please retry.' : 'Loading selected option…');
function selectionRetry(show) {
  let button = $('#option-retry');
  if (!button && show) {
    button = el('button', 'btn btn-ghost'); button.id = 'option-retry'; button.type = 'button';
    button.onclick = () => { selectionRequest = null; draw(); paint(); };
    document.querySelector('.stage').appendChild(button);
  }
  if (button) {
    button.hidden = !show;
    button.textContent = S.lang === 'nl' ? 'Opnieuw proberen' : 'Retry';
  }
}
function gateSelection(target) {
  const selected = selectedAssets();
  if (selected.view.selectionReady(selected.web, selected.snake, selected.bullet)) return false;
  if (target !== ctx) throw new Error('Selected option is still loading');
  if (selectionRequest?.key !== selected.key) selectionRequest = { key: selected.key };
  const request = selectionRequest;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  $('#glove').setAttribute('aria-busy', String(!request.error));
  $('#stagehint').textContent = selectionMessage(!!request.error);
  selectionRetry(!!request.error);
  if (!request.pending && !request.error) {
    request.pending = selected.view.loadSelection(selected.web, selected.snake, selected.bullet).then(() => {
      if (selected.view === R.views.thumb) registerThumbViews();
      if (selectionRequest === request && selectedAssets().key === request.key) { draw(); paint(S.step !== 7 && S.step !== 5); }
    }).catch(error => {
      request.error = error;
      if (selectionRequest === request && selectedAssets().key === request.key) { draw(); paint(S.step !== 7 && S.step !== 5); }
    });
  }
  return true;
}
function registerThumbViews() {
  const est = estimatedThumbViews(R.views.thumb);
  if (est) { Object.assign(R.views, est.views); Object.assign(C3_ROUTE, est.bodyOfWeb); }
}
function draw(target = ctx, highlight = S.step === 3) {
  if (!R) return;
  selectionRetry(false);
  const pendingView = R.views[S.view];
  if (pendingView && pendingView.ready === false && !pendingView.absent) {
    if (target !== ctx) throw new Error('View is still loading');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    $('#glove').setAttribute('aria-busy','true');
    $('#stagehint').textContent = S.lang === 'nl' ? 'Weergave laden…' : 'Loading view…';
    if (!pendingView.redrawPending) {
      pendingView.redrawPending = true;
      const requested = S.view;
      pendingView.load().then(() => {
        registerThumbViews();
        if (S.view === requested) { draw(); paint(S.step !== 0 && S.step !== 7 && S.step !== 5); }
      }).catch(error => {
        window.__SSK_PERF__?.failure(error);
        if (S.view === requested) {
          $('#glove').removeAttribute('aria-busy');
          $('#glove').classList.add('is-ready');
          drawUnavailable(ctx, 'viewNotLoaded');
          $('#stagehint').textContent = viewLoadMessage();
          paintView();
        }
      }).finally(() => { pendingView.redrawPending = false; });
    }
    return;
  }
  if (target === ctx) $('#glove').removeAttribute('aria-busy');
  // The palm is a second view of the same glove. Everything the back view
  // hangs on the glove — a swapped web, the flag, the bullet, the pad — has
  // no asset on this side, and the engine skips each of them on that basis.
  const w = WEBS.find(w => w.id === S.webType);
  const avail = viewAvailability(S.view, w);
  if (!avail.ok) { drawUnavailable(target, avail.reason); if (target === ctx) $('#glove').classList.add('is-ready'); return; }
  if (gateSelection(target)) return;
  if (target === ctx) $('#glove').removeAttribute('aria-busy');
  // The webs C3 covers are drawn on the estimated body of their family, not the
  // photograph. Each family has its own view name so I-webs stay off the EM body.
  const view = S.view === 'thumb' && thumbEstimatedViewOf(w) || S.view;
  if (!R.setView(view)) { drawUnavailable(target, 'viewNotLoaded'); return; }
  const cv = target.canvas;
  if (cv.width !== R.DATA.w || cv.height !== R.DATA.h) {
    cv.width = R.DATA.w; cv.height = R.DATA.h;
  }
  R.setFlag(flagArt(), () => draw(), S.flagPosition);   // redraws once the SVG has decoded
  R.setWeb(w && w.render);
  // A side view shows only the web it was photographed with.
  R.setWebMarked(!!w && w.id !== NATIVE_WEB);
  // The pad is fitted or it is not; until a colour is chosen it is white,
  // which is the order the form asks in.
  R.setPad(PAD_PART[S.pad] || null,
           S.colors.pad_color ? hexOf('pad_color') : null);
  R.setMaterials(layerMaterials());
  // A finger under its flag is one piece: both its panels light up together.
  const litFields = indexIsOnePiece() && S.part === 'back3' ? ['back3', 'back4']
    : middleIsOnePiece() && S.part === 'back5' ? ['back5', 'back6'] : [S.part];
  const litIds = highlight ? litFields.map(f => viewFieldLayer()[f]).filter(Boolean) : [];
  const selected=litIds.length ? { id:litIds[0],ids:litIds,amount:0.16 } : null;
  if(target===ctx && !selected) {
    const signature=visualKey();nativeFrames.select(signature);
    const image=R.drawCached(target,layerState(),S.bullet,null,hasFlag(),isLefty(),nativeFrames,nativeFrameKey(view));
    if(signature===defaultVisual && !Object.keys(R.views[S.view]?.assetErrors || {}).length)
      rememberPublic('default:'+view,image);
  } else R.draw(target,layerState(),S.bullet,selected,hasFlag(),isLefty());
  if (target === ctx) {
    const state = layerState();
    const colours = R.DATA.zones
      .map(z => (DATA.palettes[z.group] || []).find(c => c[0] === state[z.id])?.[2]);
    if (R.pad && R.imgs[R.pad] && R.DATA.bbox[R.pad]) colours.push(R.padHex);
    const stage = document.querySelector('.stage');
    stage.style.setProperty('--glove-background', stageBackground(colours, studioDark()));
    stage.style.setProperty('--glow', S.colors.palm ? hexOf('palm') : 'transparent');
  }
  if (target === ctx) {
    $('#glove').classList.add('is-ready');
    interact?.refresh();
    paintCompare();
  }
  if (target === ctx && !initialRendered) {
    initialRendered = true;
    performance.mark('ssk-ready');
  }
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
  if (S.colors.back7 && S.colors.back8 && (S.colors.back7 !== S.colors.back8 || (S.materials?.back7 || 'standard') !== (S.materials?.back8 || 'standard')) && !['back', 'pinky'].includes(S.view))
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
    const img = el('img'); img.src = assetURL(w.img); img.alt = w.id; img.loading = 'lazy';
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
/* Shipped starter pictures (render_starters.mjs). Used only while the key
   they were drawn from still matches: what a starter looks like depends on
   the back-view data, the colourways and the catalogue's starters. */
const starterKey = () => {
  const s = JSON.stringify([DATA.w, DATA.h, DATA.presets, DATA.materialFinish, DATA.materialResponse,
    STARTERS.map(st => [st.id, st.colors, st.bullet, st.flag, st.flagPosition]), DATA.bullets.map(b => [b.name, b.active, b.asset])]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0') + '-' + s.length.toString(36);
};
let shippedStarters = null;   // { width, hands: { RHT: [...ids], LHT: [...] } } or false
async function loadShippedStarters() {
  if (shippedStarters !== null) return shippedStarters;
  shippedStarters = false;
  try {
    const r = await fetch(assetURL('assets/starters/manifest.json'), { cache: 'force-cache' });
    if (r.ok) { const m = await r.json(); if (m && m.key === starterKey() && m.hands) shippedStarters = m; }
  } catch {}
  return shippedStarters;
}
const shippedStarter = st => {
  const hand = isLefty() ? 'LHT' : 'RHT';
  return shippedStarters && shippedStarters.hands?.[hand]?.includes(st.id)
    ? assetURL(`assets/starters/${st.id.replace(/[^A-Za-z0-9_-]+/g, '_')}-${hand}.webp`) : null;
};
// Full-resolution starter renders survive UI repaint. Render only visible
// cards, one animation frame at a time; detached cards cannot queue more work.
const starterImages = new Map();
let starterRenderer, starterObserver;
const previewTask = callback => requestAnimationFrame(callback);
function renderStart(b) {
  starterObserver?.disconnect();
  // Starter cards always show the back and never mutate the active view.
  const starterR = starterRenderer || (starterRenderer = new GloveRenderer(R.views.back));
  starterR.setWeb(null); starterR.setWebMarked(false);
  // Reuse decoded flag images; thumbnail draws are synchronous.
  starterR._flags = R._flags || {};
  const hero = el('div', 'hero');
  hero.appendChild(el('span', 'hero-kick', t('heroKick')));
  hero.appendChild(el('p', 'hero-line', t('heroLine')));
  const facts = el('ul', 'hero-facts');
  facts.innerHTML = `<li><b>${money(priceBreakdown({ ...S, flag: null }).base)}</b>${t('heroFrom')}</li>`
    + `<li><b>${COLOUR_ORDER.length - 1}</b>${t('heroParts')}</li>`
    + `<li><b>${Object.keys(VIEW_KEYS).filter(v => v === 'back' || R.hasView(v)).length}</b>${t('heroViews')}</li>`;
  hero.appendChild(facts);
  const start = el('button', 'btn btn-primary', `${t('heroStart')} →`);
  start.type = 'button'; start.dataset.key = 'hero|start';
  start.onclick = () => { flushText(); S.step = 1; paint(); };
  hero.appendChild(start);
  b.appendChild(hero);
  b.appendChild(el('span', 'field-lab', t('starters')));
  const grid = el('div', 'cards starter-cards');
  const pendingStarters = [], showWhenMounted = [];
  const groups = { built: t('built'), national: t('national'),
                   signature: t('signature'), blank: t('blankTag') };
  for (const st of STARTERS) {
    const c = el('button', 'card' + (S.startId === st.id ? ' is-on' : ''));
    c.type = 'button';
    c.setAttribute('aria-pressed', String(S.startId === st.id));
    c.dataset.key = 'starter|' + st.id;
    const shipped = shippedStarter(st);
    if (shipped) {
      // Drawn once by render_starters.mjs: no render on the customer's device.
      const img = el('img'); img.src = shipped; img.alt = ''; img.decoding = 'async';
      img.loading = grid.children.length < 2 ? 'eager' : 'lazy';   // the first row is in view
      img.width = shippedStarters.width; img.height = Math.round(DATA.h * shippedStarters.width / DATA.w);
      c.appendChild(img);
      c.appendChild(el('span', 'cap',
        `<span class="kick">${groups[st.group]}</span><span class="nm">${st[S.lang]}</span>`));
      c.onclick = () => { applyStarter(st); paint(); };
      grid.appendChild(c);
      continue;
    }
    // Keep the source pixels: a 200px bitmap blurs on Retina and browser zoom.
    // CSS controls the card size; the backing canvas retains the full render.
    const cv = el('canvas'); cv.width = DATA.w; cv.height = DATA.h;
    cv.dataset.previewPending = 'true';
    c.appendChild(cv);
    c.appendChild(el('span', 'cap',
      `<span class="kick">${groups[st.group]}</span><span class="nm">${st[S.lang]}</span>`));
    c.onclick = () => { applyStarter(st); paint(); };
    grid.appendChild(c);
    const key = st.id + '|' + isLefty() + '|' + Object.keys(R._flags || {}).sort().join(',');
    const show = async () => {
      if (!cv.isConnected) return;
      let image = starterImages.get(key);
      if(!image) image=await publicRenders.read('starter:'+key,DATA.w,DATA.h);
      if(!cv.isConnected) return;
      if (!image) {
        image = document.createElement('canvas'); image.width = DATA.w; image.height = DATA.h;
        const prev = { colors: S.colors, bullet:S.bullet, flag:S.flag,
          flagPosition:S.flagPosition, part:S.part, materials:S.materials };
        // applyStarter fills colours in place; never lend it the live object.
        S.colors = { ...S.colors };
        try {
          applyStarter(st, true);
          starterR.setFlag(flagArt(), null, S.flagPosition);
          starterR.draw(image.getContext('2d'), layerState(starterR.DATA, LAYER_TO_FIELD),
            S.bullet, null, hasFlag(), isLefty());
        } finally { Object.assign(S, prev); }
        if(starterFlagsReady) rememberPublic('starter:'+key,image);
      }
      if(!starterImages.has(key)) {
        starterImages.set(key, image);
        // At most one full-resolution set per hand plus a pending flag set.
        if (starterImages.size > STARTERS.length * 3) starterImages.delete(starterImages.keys().next().value);
      }
      cv.getContext('2d').drawImage(image, 0, 0);
      delete cv.dataset.previewPending;
      reportPerformance();
    };
    if (starterImages.has(key)) showWhenMounted.push(show);
    else pendingStarters.push([cv, show]);
  }
  b.appendChild(grid);
  // paint() attaches b after renderStart returns.
  requestAnimationFrame(() => {
    showWhenMounted.forEach(show => show());
    const jobs = [];
    let running = false;
    const run = async () => {
      const next = jobs.shift();
      if (next) { await next(); previewTask(run); } else running = false;
    };
    const observer = starterObserver = new IntersectionObserver(entries => {
      if (!grid.isConnected) { observer.disconnect(); return; }
      for (const entry of entries) if (entry.isIntersecting) {
        observer.unobserve(entry.target);
        const job = pendingStarters.find(([cv]) => cv === entry.target)?.[1];
        if (job) jobs.push(job);
      }
      if (jobs.length && !running) { running = true; previewTask(run); }
    }, {rootMargin:'150px'});
    pendingStarters.forEach(([cv]) => observer.observe(cv));
  });

  const f = el('div', 'field hero-open');
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
    if (notice) notice.textContent = t((isV4(raw) || isV3(raw) || isV2(raw)) ? 'codeNoText' : 'legacyNotice');
  };
  row.append(inp, go);
  f.append(row, feedback);
  b.appendChild(f);
}

function applyStarter(st, quiet) {
  if (!quiet) snapshot();
  S.materials = {};
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
  if (S.colors.palm) S.colors.back2 = S.colors.palm;
  if (st.bullet != null) S.bullet = st.bullet;
  // a national build comes with its flag on; every other starter clears it
  S.flag = st.flag || null;
  S.flagPosition = st.flagPosition === 'middle' ? 'middle' : 'index';
  coupleFlagPanels();
  // Reset the shared hood/pad colour with the colourway; a later manual
  // choice remains independent until another starter is selected.
  S.colors.pad_color = S.colors.back3;
  if (!quiet) { S.startId = st.id; S.picked = {}; draw(); }
}

/* --------------------------------------------------------------- 2. fit */
function renderFit(b) {
  b.appendChild(choiceField(t('hand'), HANDS.map(h => ({
    id: h.id, label: h[S.lang], sub: h.sub
  })), S.hand, v => { snapshot(); S.hand = v; draw(); paint(); }, true));

  const pos = POSITIONS.find(p => p.id === S.position);
  const posF = choiceField(t('position'), POSITIONS.map(p => ({ id: p.id, label: p[S.lang], sub: p.sizes.join(' · ') })),
    S.position, v => { snapshot(); S.position = S.position === v ? null : v; paint(); }, false);
  posF.appendChild(el('p', 'size-advice', pos ? t('sizeAdvice') : t('positionLead')));
  b.appendChild(posF);

  b.appendChild(choiceField(t('size'), SIZES.map(s => ({ id: s, label: s, rec: !!pos && pos.sizes.includes(s) })),
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
  previewR.setFlag(flagArt(), null, S.flagPosition);
  previewR.setMaterials(layerMaterials(DATA, LAYER_TO_FIELD));
  const selectedWeb = WEBS.find(w => w.id === S.webType);
  previewR.setWeb(selectedWeb && selectedWeb.render);
  previewR.setPad(PAD_PART[S.pad] || null, S.colors.pad_color ? hexOf('pad_color') : null);
  const cards = field.querySelectorAll('.cards .card');
  const key = JSON.stringify([S.colors, S.hand, S.pad, S.bullet, S.flag, S.flagPosition,
                              S.webType, S.materials, box]);
  if (key !== thumbKey) { thumbs.clear(); thumbKey = key; }
  const put = (card, cv) => {
    delete card.dataset.previewPending;
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
    if (hit) put(card, hit); else {
      card.dataset.previewPending = 'true';
      todo.push([it, card, setUp]);
    }
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
  // Fetch independent option images together. Keep the expensive composites
  // one per frame; serial downloads previously added a round trip per card.
  const prepared = new Map();
  requestAnimationFrame(() => {
    if (!field.isConnected || key !== thumbKey) return;
    for (const [it, card, setUp] of todo) {
      setUp(previewR);
      const pending = R.views.back.loadSelection(previewR.web,
        Object.values(S.materials || {}).includes('snakeskin'), S.bullet);
      prepared.set(it.id, pending); pending.catch(() => {});
    }
  });
  // One per frame. Four full-canvas composites in a single frame is half a
  // second of locked-up page on a laptop and worse on a phone; spread out,
  // the cards fill in one after another and nothing blocks.
  const step = async () => {
    const job = todo.shift();
    if (!job || !field.isConnected || key !== thumbKey) return;
    const [it, card, setUp] = job;
    setUp(previewR);
    try {
      await (prepared.get(it.id) || R.views.back.loadSelection(previewR.web, Object.values(S.materials || {}).includes('snakeskin'), S.bullet));
    } catch {
      if (field.isConnected && key === thumbKey) {
        if (!card.querySelector('.preview-error')) card.appendChild(el('span', 'note preview-error',
          S.lang === 'nl' ? 'Voorbeeld niet geladen. Kies deze optie om opnieuw te proberen.'
            : 'Preview unavailable. Choose this option to retry.'));
        requestAnimationFrame(step);
      }
      return;
    }
    if (!field.isConnected || key !== thumbKey) return;
    card.querySelector('.preview-error')?.remove();
    previewR.setMaterials(layerMaterials(previewR.DATA,LAYER_TO_FIELD));
    previewR.draw(tc, layerState(previewR.DATA, LAYER_TO_FIELD), S.bullet, null, hasFlag(), isLefty());
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
    const img = el('img'); img.alt = `${r.id}: ${t('webRefBadge')}`;
    setImageSource(img, r.img);
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

import { estimatedThumbViews } from './c3-thumb.js';
/* {slug -> viewName}. Populated at load once the C3 bodies decode. */
const C3_ROUTE = {};
/* H-Web and every web C3 does not list stay on the photographed side. */
const thumbEstimatedViewOf = w => (w && w.id !== NATIVE_WEB && w.render
  && C3_ROUTE[w.render] && R?.views?.[C3_ROUTE[w.render]]) ? C3_ROUTE[w.render] : null;
const estimatesThumb = w => !!thumbEstimatedViewOf(w);

/* ----------------------------------------------------------- 4. colours */
/* The twenty parts, grouped the way a hand is: the back, the palm side,
   and the lacing that finishes it. */
const PART_GROUPS = [
  ['groupBack', ['web', 'back1', 'back2', 'back3', 'back4', 'back5', 'back6', 'back7', 'back8', 'back9']],
  ['groupPalm', ['palm', 'belt', 'lining', 'thumb_loops', 'pinky_loops']],
  ['groupTrim', ['binding', 'welting', 'laces', 'stitching', 'ring_emb']]
];
/* The palette, by family. SSK numbers its colours; the families are only a
   way to find one faster, and the metallics sit apart because they are. */
const FAMILY_OF = (num, name) => /gold|silver|foil/i.test(name) ? 'metal'
  : ['10', '90', '93'].includes(num) ? 'neutral'
  : ['25', '80'].includes(num) ? 'purple'
  : +num >= 20 && +num <= 39 ? 'warm'
  : +num >= 40 && +num <= 49 ? 'earth'
  : +num >= 50 && +num <= 52 ? 'green'
  : +num >= 55 && +num <= 79 ? 'blue' : 'neutral';
const FAMILY_ORDER = ['neutral', 'warm', 'earth', 'green', 'blue', 'purple', 'metal'];
const PART_SEEN = new Set();
function renderColours(b) {
  // One finish for the whole back, Back 1 to 9 together.
  const material = choiceField(t('backFinish'), [
    {id:'standard', label:materialLabel('standard'), sub:t('backFinishStdSub')},
    {id:'snakeskin', label:'Crocodile pattern', sub:t('backFinishCrocSub')}
  ], crocAll(S.materials) ? 'snakeskin' : 'standard', value => {
    snapshot(); S.materials = value === 'snakeskin' ? normaliseMaterials({ back1: 'snakeskin' }) : {};
    draw(); paint();
  }, true);
  material.classList.add('material-picker');
  b.appendChild(material);
  for (const [groupKey, fields] of PART_GROUPS) {
    const group = el('div', 'part-group');
    group.appendChild(el('span', 'part-group-lab', t(groupKey)));
    const parts = el('div', 'parts');
    for (const f of fields) {
      if (colourPart(f) !== f) continue;   // merged into back3 / back5
      const p = el('button', 'part' + (S.part === f ? ' is-on' : ''));
      p.type = 'button';
      p.dataset.key = 'part|' + f;
      p.innerHTML = `<span class="chip" style="background:${hexOf(f)}"></span>` + colourLabel(f)
        + (f === 'back2' ? ` <small>· ${t('tiedPalm')}</small>` : '');
      p.title = tsub('partDesc', f);
      p.setAttribute('aria-pressed', String(S.part === f));
      p.onclick = () => {
        tick();
        if (paintPart(f)) return;
        S.part = f;
        colourView(f);
        draw(); paint();                 // the tint follows the chosen part
      };
      parts.appendChild(p);
    }
    group.appendChild(parts);
    b.appendChild(group);
  }
  const desc = tsub('partDesc', S.part);
  if (desc) b.appendChild(el('p', 'part-desc', `${partIcon(S.part)}<span><b>${colourLabel(S.part)}</b> — ${desc}</span>`));
  b.appendChild(swatchFamilies(
    S.part,
    (S.part === 'back3' && indexIsOnePiece()) ? t('indexMerged')
      : (S.part === 'back5' && middleIsOnePiece()) ? t('middleMerged')
      : sideData() ? (sideData().fieldsShown.includes(S.part) ? null : t('notOnThisSide'))
      : (R.DATA.zones.some(z=>z.id===FIELD_TO_LAYER[S.part]) ? null : OFFSTAGE[S.part] || null)));
  // Thread the colour of the leather it runs through disappears into it.
  if (S.part === 'stitching' && S.colors.stitching && [S.colors.palm, S.colors.back3, S.colors.back5, S.colors.web]
      .filter(Boolean).every(c => c === S.colors.stitching))
    b.appendChild(el('p', 'note', t('stitchContrast')));
  b.appendChild(el('p', 'note swatch-note', t('swatchNote')));
  if (/^back/.test(S.part)) {
    const all = el('button', 'btn btn-ghost', t('applyAll'));
    all.type = 'button'; all.style.alignSelf = 'flex-start';
    all.onclick = () => {
      snapshot();
      const v = S.colors[S.part];
      for (let i = 1; i <= 9; i++) S.colors['back' + i] = v;
      S.colors.palm = S.colors.back2; markPicked(S, 'back1', 'back2', 'back3', 'back4', 'back5', 'back6', 'back7', 'back8', 'back9', 'palm');
      draw(); paint();
    };
    b.appendChild(all);
  }
}
/* The swatch grid for one part: the colours already on this glove first,
   then the palette by family. Same buttons and keys as swatchGrid, so the
   keyboard and the checks find them where they were. */
/* One colour onto one part, with the parts that are cut from the same
   leather following. */
function setColour(field, v) {
  snapshot();
  S.colors[field] = v;
  if (indexIsOnePiece() && (field === 'back3' || field === 'back4')) S.colors.back3 = S.colors.back4 = v;
  if (middleIsOnePiece() && (field === 'back5' || field === 'back6')) S.colors.back5 = S.colors.back6 = v;
  if (field === 'palm' || field === 'back2') S.colors.palm = S.colors.back2 = v; markPicked(S, field, ...linkedFields(field, indexIsOnePiece(), middleIsOnePiece()));
  if (held && PALETTE_OF(field) === held.palette) { held = { ...held, num: v, hex: hexOf(field), label: colName(field) }; }
  draw(); paint();
}
/* Paint mode: a colour is held, and every part clicked takes it. */
let held = null, swatchQuery = '';
function holdColour(field) {
  const num = S.colors[field];
  if (!num) return;
  held = { num, hex: hexOf(field), label: colName(field), palette: PALETTE_OF(field) };
  interact?.hold({ hex: held.hex, label: held.label });
  $('#stage').classList.add('is-holding');
  paint();
}
function releaseColour() {
  if (!held) return;
  held = null; interact?.hold(null);
  $('#stage').classList.remove('is-holding');
  paint();
}
// A held colour onto a part, if the part takes colours from that palette.
function paintPart(field) {
  if (!held || PALETTE_OF(field) !== held.palette) return false;
  S.part = field;
  setColour(field, held.num);
  return true;
}
function filterSwatches(root) {
  const q = swatchQuery.trim().toLowerCase();
  let any = false;
  for (const g of root.querySelectorAll('.sw-group')) {
    let shown = 0;
    for (const sw of g.querySelectorAll('.sw')) {
      const hit = !q || sw.textContent.toLowerCase().includes(q);
      sw.hidden = !hit; if (hit) shown++;
    }
    g.hidden = !shown; any ||= shown > 0;
  }
  root.querySelector('.sw-none').hidden = any || !q;
}
function swatchFamilies(field, note) {
  const pal = DATA.palettes[PALETTE_OF(field)], label = colourLabel(field), value = chosenColour(S, field);
  const pick = v => setColour(field, v);
  const f = el('div', 'field');
  f.appendChild(labelRow(label, true, value != null));
  if (note) f.appendChild(el('p', 'note', note));
  const tools = el('div', 'sw-tools');
  const search = el('input'); search.type = 'search'; search.placeholder = t('searchColour'); search.value = swatchQuery;
  search.setAttribute('aria-label', t('searchColour')); search.dataset.key = 'swsearch';
  search.oninput = () => { swatchQuery = search.value; filterSwatches(f); };
  const holdBtn = el('button', 'sw-hold'); holdBtn.type = 'button'; holdBtn.dataset.key = 'hold';
  const holdsThis = held && held.palette === PALETTE_OF(field);
  holdBtn.setAttribute('aria-pressed', String(!!holdsThis));
  holdBtn.innerHTML = holdsThis
    ? `<span class="chip" style="background:${held.hex}"></span>${t('holding')} ${held.label} · ${t('release')}`
    : `<span class="chip" style="background:${value ? hexOf(field) : 'transparent'}"></span>${t('hold')}`;
  holdBtn.disabled = !holdsThis && !value;
  holdBtn.onclick = () => holdsThis ? releaseColour() : holdColour(field);
  tools.append(search, holdBtn);
  f.appendChild(tools);
  f.appendChild(el('p', 'sw-none', t('noColour')));
  const button = ([num, name, hx]) => {
    const sw = el('button', 'sw' + (value === num ? ' is-on' : ''));
    sw.type = 'button';
    sw.setAttribute('aria-pressed', String(value === num));
    sw.dataset.key = `${label}|${num}`;
    sw.innerHTML = `<span class="chip" style="background:${hx}"></span><span class="num">${num}.</span><span class="nm">${name}</span>`;
    sw.onclick = () => { tick(); pick(num); };
    return sw;
  };
  const used = [...new Set(COLOUR_ORDER.filter(x => PALETTE_OF(x) === PALETTE_OF(field)).map(x => S.colors[x]).filter(Boolean))]
    .map(num => pal.find(c => c[0] === num)).filter(Boolean);
  if (used.length > 1) {
    const g = el('div', 'sw-group');
    g.appendChild(el('span', 'sw-group-lab', t('inUse')));
    const row = el('div', 'sw-used'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', t('inUse'));
    for (const c of used) { const sw = button(c); sw.dataset.key = `${label}|used|${c[0]}`; row.appendChild(sw); }
    g.appendChild(row); f.appendChild(g);
  }
  const families = new Map();
  for (const c of pal) {
    const fam = FAMILY_OF(c[0], c[1]);
    if (!families.has(fam)) families.set(fam, []);
    families.get(fam).push(c);
  }
  for (const fam of FAMILY_ORDER) {
    const list = families.get(fam); if (!list) continue;
    const g = el('div', 'sw-group');
    if (families.size > 2) g.appendChild(el('span', 'sw-group-lab', tsub('family', fam)));
    const grid = el('div', 'swatches'); grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', `${label} · ${tsub('family', fam)}`);
    for (const c of list) grid.appendChild(button(c));
    g.appendChild(grid); f.appendChild(g);
  }
  filterSwatches(f);
  return f;
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
    c.innerHTML = `<img src="${assetURL(bl.thumb)}" alt="" loading="lazy"${bl.sourceBox ? ' style="object-fit:contain;padding:8px;box-sizing:border-box"' : ''}>` +
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
    v => { const changed = !!S.thumbNumber !== !!twoChars(v); S.thumbNumber = twoChars(v); draw(); return changed; },
    false, 'text', twoChars, 'thumb');
  circleField.appendChild(el('p', 'note', t('circleHint')));
  b.appendChild(circleField);
  b.appendChild(choiceField(t('circle'), CIRCLE_COLORS.map(([n, hx]) => ({
    id: n, label: n, swatch: hx
  })), S.circle, v => { snapshot(); S.circle = v; draw(); paint(); }, !!S.thumbNumber));
  if (S.thumbNumber) b.appendChild(swatchGrid(t('numberColor'), DATA.palettes.embroidery.filter(c=>['10','20','25','35','39','50','60','70','80','90','95','48'].includes(c[0])), S.numberColor, v=>{snapshot();S.numberColor=v;draw();paint();},true,null));
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
    coupleFlagPanels();
    if (hasFlag()) S.view = 'back';
    if (v !== 'Other Flag') S.flagOther = '';
    draw(); paint();
  }, false));
  b.appendChild(el('p', 'note', t('flagPriceNote').replace('%s', money(PRICE_CENTS.flag))));
  if (hasFlag()) b.appendChild(choiceField(t('flagPosition'), [
    { id: 'index', label: t('indexFinger') }, { id: 'middle', label: t('middleFinger') }
  ], S.flagPosition, v => {
    snapshot(); S.flagPosition = v; coupleFlagPanels(); S.view = 'back'; draw(); paint();
  }, true));
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
    f.innerHTML = `<img src="${assetURL(src)}" alt="" loading="lazy">` +
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
function saveToGalleryField() {
  const box = el('div', 'field gallery-save');
  box.appendChild(el('span', 'field-lab', t('saveToGallery')));
  const nameInput = el('input'); nameInput.type = 'text'; nameInput.maxLength = 60;
  nameInput.placeholder = t('galleryNamePh'); nameInput.value = S.name || '';
  nameInput.setAttribute('aria-label', t('galleryNamePh'));
  const saveBtn = el('button', 'btn btn-ghost', t('saveToGalleryBtn')); saveBtn.type = 'button';
  saveBtn.style.alignSelf = 'flex-start';
  const status = el('p', 'note'); status.setAttribute('role', 'status');
  saveBtn.onclick = async () => {
    saveBtn.disabled = true; status.textContent = '';
    try {
      if (flushText()) paint();
      const name = nameInput.value.trim() || t('untitledDesign');
      if (!await readyForExport()) throw Error('assets_not_ready');
      const full = proofImage(), thumb = document.createElement('canvas');
      thumb.width = 240; thumb.height = Math.max(1, Math.round(full.height * 240 / full.width));
      thumb.getContext('2d').drawImage(full, 0, 0, thumb.width, thumb.height);
      addDesign({id: crypto.randomUUID(), name, refcode: code(), savedAt: new Date().toISOString(),
        thumb: thumb.toDataURL('image/jpeg', 0.78), state: encodeState(true)});
      status.textContent = t('gallerySaved');
      const gallery = el('a', 'btn btn-ghost', t('myDesigns'));
      gallery.href = './gallery.html'; status.append(' ', gallery);
    } catch { status.textContent = t('gallerySaveFail'); }
    finally { saveBtn.disabled = false; }

  };
  box.append(nameInput, saveBtn, status);
  return box;
}
/* What each open question is called, and where it is answered. */
function questionLabel(q) {
  if (q.id.startsWith('c:')) return colourLabel(colourPart(q.id.slice(2)));
  const key = { hand: 'hand', size: 'size', pad: 'pad', webType: 'webType', bullet: 'bullet',
    name: 'name', phone: 'phone', thumbFont: 'thumbFont', thumbMain: 'thumbMain', thumbOutline: 'thumbOutline',
    circle: 'circle', numberColor: 'numberColor', flagOther: 'flagOther', personalCheck: 'personalCheck' }[q.id];
  return key ? t(key) : q.id;
}
const questionStep = q => Math.max(0, STEP_FIELDS.findIndex(fields => fields.includes(q.id)));
function missingList(open) {
  const box = el('div', 'field');
  box.appendChild(el('span', 'field-lab', `${t('missingTitle')} <span class="req">${open.length}</span>`));
  const list = el('div', 'missing');
  for (const q of open) {
    const a = el('a'); a.href = '#'; a.dataset.key = 'missing|' + q.id;
    a.innerHTML = `<span>${questionLabel(q)}</span><small>${t('goFix')} · ${t(STEPS[questionStep(q)].title)} →</small>`;
    a.onclick = ev => {
      ev.preventDefault(); flushText();
      S.step = questionStep(q);
      if (q.id.startsWith('c:')) { S.part = colourPart(q.id.slice(2)); colourView(S.part); draw(); }
      paint();
    };
    list.appendChild(a);
  }
  box.appendChild(list);
  return box;
}
/* The glove from its four sides, drawn once per design and kept until the
   design changes. A side the chosen web has no picture of says so. */
let stripJob = null;
function reviewStrip() {
  const wrap = el('div', 'field');
  wrap.appendChild(el('span', 'field-lab', t('fourSides')));
  const strip = el('div', 'review-strip');
  const key = visualKey() + '|' + S.lang;
  const views = Object.keys(VIEW_KEYS).filter(v => v === 'back' || R.hasView(v));
  const figs = {};
  for (const v of views) {
    const fig = el('figure');
    const wait = el('div', 'strip-wait', '…');
    fig.append(wait, el('figcaption', null, t(VIEW_KEYS[v])));
    figs[v] = fig; strip.appendChild(fig);
  }
  wrap.appendChild(strip);
  const show = previews => {
    for (const p of previews) {
      const fig = figs[p.view]; if (!fig) continue;
      const slot = fig.firstChild;
      if (p.available) {
        const img = el('img'); img.src = p.dataUrl; img.alt = t(VIEW_KEYS[p.view]); img.loading = 'lazy';
        img.onclick = () => { S.view = p.view; draw(); paint(false); };
        fig.replaceChild(img, slot);
      } else slot.textContent = t(VIEW_KEYS[p.view]) + ': —';
    }
  };
  if (reviewStrip.cache?.key === key) { show(reviewStrip.cache.previews); return wrap; }
  const job = stripJob = { key };
  captureOrderViews().then(previews => {
    if (stripJob !== job || !strip.isConnected) return;
    reviewStrip.cache = { key, previews }; show(previews);
  }).catch(() => { for (const fig of Object.values(figs)) fig.firstChild.textContent = '—'; });
  return wrap;
}
function renderReview(b) {
  const open = requiredQuestions().filter(q => !answered(q));
  b.appendChild(reviewStrip());
  if (open.length) b.appendChild(missingList(open));
  else b.appendChild(el('p', 'note note-ok', t('allSet')));
  if (S.flag === 'Other Flag' && S.flagOther.trim()) b.appendChild(el('p', 'note', t('flagPending')));
  b.appendChild(buildSpec());
  const commerceHost=document.createElement('div');b.appendChild(commerceHost);
  import('./commerce-ui.js').then(({mountCommerce})=>{
    if(commerceHost.isConnected)mountCommerce(commerceHost,{lang:S.lang,complete:!open.length,
      getDesign:()=>structuredClone(S),capture:captureOrderViews,onParked:parkedGlove});
    reportPerformance();
  }).catch(()=>{commerceHost.textContent=S.lang==='nl'?'Bestelfunctie kon niet worden geladen. Probeer opnieuw.':'Ordering could not load. Please try again.';});
  if (contactOpen()) b.appendChild(el('p', 'note', t('contactMissing')));
  b.appendChild(saveToGalleryField());
  const go = el('button', 'btn btn-primary', t('finish'));
  go.type = 'button'; go.style.alignSelf = 'flex-start';
  go.onclick = openSheet;
  b.appendChild(go);
  const lim = limitsBlock();
  const det = el('details', 'limits');
  det.appendChild(el('summary', null, t('limitsSummary')));
  while (lim.firstChild) { const c = lim.firstChild; if (c.tagName === 'STRONG') { lim.removeChild(c); continue; } det.appendChild(c); }
  b.appendChild(det);
}

async function captureOrderViews() {
  const snapshot=structuredClone(S),previews=[];
  const art=flagArt(),renderer=new GloveRenderer({...R.views.back,views:R.views});
  await renderer.preloadFlags(art?[art]:[]);
  for(const view of ['back','palm','thumb','pinky']) previews.push(await renderDesignView(snapshot,view,renderer));
  return previews;
}
/* One side of one design, drawn by its own renderer so the stage never moves. */
async function renderDesignView(snapshot,view,renderer) {
  const web=WEBS.find(w=>w.id===snapshot.webType),art=(FLAGS.find(f=>f.id===snapshot.flag)||{}).art||null;
  {
    const bundle=R.views[view];
    if(bundle?.load)await bundle.load();
    registerThumbViews();
    if(bundle?.loadSelection)await bundle.loadSelection(web?.render,Object.values(snapshot.materials||{}).includes('snakeskin'),snapshot.bullet);
    registerThumbViews();
    const availability=viewAvailability(view,web);
    if(!availability.ok)return {view,available:false,notes:[vt(availability.reason)]};
    const angle=view==='thumb'&&thumbEstimatedViewOf(web)||view;
    renderer.views=R.views;
    if(!renderer.setView(angle))throw new Error('View unavailable');
    renderer.setWeb(web?.render);renderer.setWebMarked(!!web&&web.id!==NATIVE_WEB);
    renderer.setFlag(art,null,snapshot.flagPosition);
    const padColour=DATA.palettes.leather.find(c=>c[0]===snapshot.colors.pad_color)?.[2]||null;
    renderer.setPad(PAD_PART[snapshot.pad]||null,padColour);
    const D=renderer.DATA,map=view==='back'?LAYER_TO_FIELD:view==='palm'?{...PALM_FIELDS,stitching:'stitching'}:Object.fromEntries(D.zones.map(z=>[z.id,z.field]));
    renderer.setMaterials(Object.fromEntries(D.zones.map(z=>[z.id,snapshot.materials?.[map[z.id]]||'standard'])));
    const state=Object.fromEntries(D.zones.map(z=>[z.id,snapshot.colors[map[z.id]]||DATA.palettes[z.group][0][0]]));state.palm=snapshot.colors.palm||'10';
    state.thumbMark={text:snapshot.thumbNumber,circle:CIRCLE_COLORS.find(c=>c[0]===snapshot.circle)?.[1],thread:DATA.palettes.embroidery.find(c=>c[0]===snapshot.numberColor)?.[2]};
    const canvas=document.createElement('canvas');canvas.width=D.w;canvas.height=D.h;
    renderer.draw(canvas.getContext('2d'),state,snapshot.bullet,null,hasFlag(snapshot),/^L/.test(snapshot.hand));
    const notes=availability.note?[vt(availability.note)]:[];
    notes.push(snapshot.lang==='nl'?`Maat ${snapshot.size} wordt besteld; de afbeelding toont een representatieve maat.`:`Size ${snapshot.size} is ordered; this image shows a representative size.`);
    if(snapshot.thumbText||snapshot.pinkyText)notes.push(snapshot.lang==='nl'?'Personalisatie wordt volgens de specificatie gemaakt en is niet op deze afbeelding getekend.':'Personalization follows the specification and is not drawn in this preview.');
    return {view,available:true,dataUrl:canvas.toDataURL('image/webp',.92),notes};
  }
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
      o.label + (o.sub ? `<small>${o.sub}</small>` : '') + (o.rec ? `<span class="rec">${t('recommended')}</span>` : '');
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
    c.innerHTML = `<span class="cap"><span class="nm">${o.label}</span></span>`;
    if(o.img) {
      const image=el('img');image.alt='';image.loading='lazy';c.prepend(image);
      // The promise settles after this card is mounted. Packed images never
      // start a redundant original-URL request while the preview is prepared.
      setImageSource(image,o.img);
    }
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
  return swatchGrid(colourLabel(field), DATA.palettes[PALETTE_OF(field)],
    chosenColour(S, field), v => {
      snapshot();
      S.colors[field] = v; markPicked(S, field, ...linkedFields(field, indexIsOnePiece(), middleIsOnePiece()));
      if (indexIsOnePiece() && (field === 'back3' || field === 'back4')) {
        S.colors.back3 = S.colors.back4 = v;
      }
      if (middleIsOnePiece() && (field === 'back5' || field === 'back6')) {
        S.colors.back5 = S.colors.back6 = v;
      }
      // Back 2 is cut from the palm leather (Scott, 25 Sep 2026): one colour.
      if (field === 'palm' || field === 'back2') S.colors.palm = S.colors.back2 = v;
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
    if (colourPart(f) !== f) continue;
    push(colourLabel(f), colName(f));
  }
  rows.push(['#', S.lang === 'nl' ? 'Leersoort' : 'Leather finish']);
  push(t('backFinish'), crocAll(S.materials) ? 'Crocodile pattern (Back 1-9)' : materialLabel('standard'));
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
  if (hasFlag()) push(t('flagPosition'), t(S.flagPosition === 'middle' ? 'middleFinger' : 'indexFinger'));
  rows.push(['#', t('pricing')]);
  const price = priceBreakdown();
  push(t('baseGlove'), money(price.base));
  if (price.flag) push(t('flagExtra'), money(price.flag));
  push(t('totalPrice'), money(price.total));
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
  const wrap = el('div', 'spec');
  let dl = null;
  for (const [k, v] of specRows()) {
    if (k === '#') { wrap.appendChild(el('h2', null, v)); dl = el('dl'); wrap.appendChild(dl); continue; }
    if (!dl) { dl = el('dl'); wrap.appendChild(dl); }
    const term = el('dt'), value = el('dd');
    term.textContent = k; value.textContent = v;
    dl.append(term, value);
  }
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
  lines.push('', t('designLink') + ': ' + shareLink(), '', t('sendLead'));
  return lines.join('\n');
}

/* ----------------------------------------------------------- share card */
/* The picture people send each other: the glove on a dark ground, the
   player's name, the design code, and the colours that make it. Everything
   on it comes from the design; the limitations travel in the specification. */
const CARD_FONTS = ['800 72px "Barlow Condensed"', '600 28px "Barlow Condensed"', '500 22px "IBM Plex Mono"', '400 24px Barlow'];
async function cardImage() {
  try { await Promise.all(CARD_FONTS.map(f => document.fonts.load(f))); } catch {}
  const glove = document.createElement('canvas');
  draw(glove.getContext('2d'), false);
  draw();                                       // draw() switched the renderer's shared state
  const W = 1200, H = 1500, out = document.createElement('canvas');
  out.width = W; out.height = H;
  const g = out.getContext('2d');
  g.fillStyle = '#121212'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 560, 80, W / 2, 560, 760);
  glow.addColorStop(0, 'rgba(255,255,255,.14)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // stitch line across the top
  g.strokeStyle = '#C8102E'; g.lineWidth = 6; g.setLineDash([26, 18]); g.lineCap = 'round';
  g.beginPath(); g.moveTo(72, 96); g.lineTo(W - 72, 96); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#C8102E'; g.font = '500 22px "IBM Plex Mono", monospace'; g.textBaseline = 'alphabetic';
  g.fillText((S.lang === 'nl' ? 'SSK PRO CUSTOM · OP BESTELLING' : 'SSK PRO CUSTOM · MADE TO ORDER'), 72, 160);
  // All four sides: the back large on the left, the palm, thumb and pinky
  // sides stacked on the right. A side without a picture gets its name.
  const sides = await captureOrderViews().catch(() => []);
  const pic = v => sides.find(x => x.view === v && x.available);
  const loadPic = v => new Promise(r => { const d = pic(v); if (!d) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = d.dataUrl; });
  const smalls = await Promise.all(['palm', 'thumb', 'pinky'].map(loadPic));
  const fit = (img, box, shadow) => {
    const k = Math.min(box.w / img.width, box.h / img.height), gw = img.width * k, gh = img.height * k;
    if (shadow) { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 60; g.shadowOffsetY = 30; }
    g.drawImage(img, box.x + (box.w - gw) / 2, box.y + (box.h - gh) / 2, gw, gh);
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
  };
  fit(glove, { x: 72, y: 190, w: 720, h: 860 }, true);
  ['palm', 'thumb', 'pinky'].forEach((v, i) => {
    const box = { x: 820, y: 200 + i * 285, w: 308, h: 260 };
    const img = smalls[i];
    if (img) fit(img, box, false);
    g.fillStyle = '#9A9A9A'; g.font = '500 16px "IBM Plex Mono", monospace'; g.textAlign = 'center';
    g.fillText(t(VIEW_KEYS[v]).toUpperCase(), box.x + box.w / 2, box.y + box.h + 16); g.textAlign = 'left';
  });
  // name, code, colours
  const name = (S.thumbText.trim() || S.name.trim() || (S.lang === 'nl' ? 'Mijn handschoen' : 'My glove')).toUpperCase();
  g.fillStyle = '#FFFFFF'; g.font = '800 72px "Barlow Condensed", Impact, sans-serif';
  let size = 72; while (g.measureText(name).width > W - 144 && size > 40) { size -= 4; g.font = `800 ${size}px "Barlow Condensed", Impact, sans-serif`; }
  g.fillText(name, 72, 1150);
  const w = WEBS.find(w => w.id === S.webType);
  g.fillStyle = '#B9BCC1'; g.font = '400 24px Barlow, "Helvetica Neue", Arial, sans-serif';
  g.fillText([S.size, w ? w.id : null, S.hand ? HANDS.find(h => h.id === S.hand)?.[S.lang] : null].filter(Boolean).join('  ·  '), 72, 1192);
  const chips = ['palm', 'web', 'back3', 'laces', 'welting', 'binding'].map(f => [f, hexOf(f), S.colors[f]]).filter(c => c[2]);
  let cx = 72; const cy = 1226;
  for (const [f, hx, num] of chips) {
    g.fillStyle = hx; g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(cx, cy, 56, 56, 8); g.fill(); g.stroke();
    g.fillStyle = '#9A9A9A'; g.font = '500 16px "IBM Plex Mono", monospace';
    g.fillText(num, cx, cy + 86);
    cx += 84;
  }
  // code plate
  const codeText = code();
  g.font = '500 22px "IBM Plex Mono", monospace';
  const cw = Math.min(W - 144, g.measureText(codeText).width + 48), ch = 56, px = 72, py = 1352;
  g.strokeStyle = '#C8102E'; g.lineWidth = 3; g.setLineDash([10, 8]);
  g.beginPath(); g.roundRect(px, py, cw, ch, 6); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#FFFFFF'; g.fillText(codeText, px + 24, py + 36);
  g.fillStyle = '#737373'; g.font = '500 14px "IBM Plex Mono", monospace';
  g.fillText(t('reference').toUpperCase(), px, py - 12);
  g.fillStyle = '#737373'; g.font = '400 20px Barlow, "Helvetica Neue", Arial, sans-serif';
  g.fillText('SSK Europe', 72, H - 40);
  g.textAlign = 'right';
  g.fillText(money(priceBreakdown().total), W - 72, H - 40);
  g.textAlign = 'left';
  return out;
}
/* The part icons: one sprite, in the order the generator wrote it. */
const PART_ICONS = ['web', 'back3', 'back4', 'back5', 'back6', 'back7', 'back8', 'belt', 'lining', 'binding', 'welting', 'laces',
  'pinky_loops', 'stitching', 'ring_emb', 'palm', 'back1', 'back9', 'thumb_loops', 'back2', 'back34', 'back56'];
// A finger under its flag is one piece: its icon shows both panels in red.
const partIcon = part => {
  const key = part === 'back3' && indexIsOnePiece() ? 'back34' : part === 'back5' && middleIsOnePiece() ? 'back56' : part;
  const i = PART_ICONS.indexOf(key); return i < 0 ? '' : `<i class="pico" style="--i:${i}" aria-hidden="true"></i>`;
};

/* ------------------------------------------------------- turntable clip */
/* A few seconds of the glove turning through its sides, 4:5 for Instagram
   and WhatsApp, recorded off a canvas. Shared where the phone can, saved
   otherwise. */
const CLIP_MIMES = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
const clipMime = () => CLIP_MIMES.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || null;
const clipSupported = () => !!(clipMime() && HTMLCanvasElement.prototype.captureStream);
async function turnClip(ev) {
  const b = ev.currentTarget, was = b.textContent, mime = clipMime();
  if (!mime || b.disabled) return;
  b.disabled = true; b.textContent = t('clipBusy');
  try {
    if (flushText()) paint();
    if (!await readyForExport()) throw new Error('not ready');
    const views = (await captureOrderViews()).filter(v => v.available);
    if (!views.length) throw new Error('no views');
    const frames = await Promise.all(views.map(v => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = v.dataUrl; })));
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const HOLD = 900, FLIP = 320, total = frames.length * (HOLD + FLIP);
    const band = { x: 60, y: 120, w: W - 120, h: 980 };
    const plate = code();
    const drawFrame = (img, scaleX, alpha) => {
      const k = Math.min(band.w / img.width, band.h / img.height), gw = img.width * k, gh = img.height * k;
      g.save(); g.globalAlpha = alpha; g.translate(W / 2, band.y + band.h / 2); g.scale(scaleX, 1);
      g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 50; g.shadowOffsetY = 24;
      g.drawImage(img, -gw / 2, -gh / 2, gw, gh); g.restore();
    };
    const paintAt = ms => {
      g.fillStyle = '#121212'; g.fillRect(0, 0, W, H);
      const glow = g.createRadialGradient(W / 2, 560, 60, W / 2, 560, 700);
      glow.addColorStop(0, 'rgba(255,255,255,.13)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      const slot = Math.min(frames.length - 1, Math.floor(ms / (HOLD + FLIP))), inSlot = ms - slot * (HOLD + FLIP);
      if (inSlot < HOLD || slot === frames.length - 1) drawFrame(frames[slot], 1, 1);
      else {   // a short turn: this side folds away, the next unfolds
        const p = (inSlot - HOLD) / FLIP;
        if (p < .5) drawFrame(frames[slot], Math.cos(p * Math.PI), 1 - p);
        else drawFrame(frames[slot + 1], Math.cos((1 - p) * Math.PI), p);
      }
      g.fillStyle = '#C8102E'; g.font = '500 26px "IBM Plex Mono", monospace';
      g.fillText(S.lang === 'nl' ? 'SSK PRO CUSTOM · OP BESTELLING' : 'SSK PRO CUSTOM · MADE TO ORDER', 60, 80);
      g.fillStyle = '#FFFFFF'; g.font = '500 30px "IBM Plex Mono", monospace'; g.fillText(plate, 60, H - 110);
      g.fillStyle = '#9A9A9A'; g.font = '400 24px Barlow, "Helvetica Neue", Arial, sans-serif';
      g.fillText('SSK Europe', 60, H - 56);
      g.textAlign = 'right'; g.fillText(money(priceBreakdown().total), W - 60, H - 56); g.textAlign = 'left';
    };
    paintAt(0);
    const stream = c.captureStream(30), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise(r => { rec.onstop = r; });
    rec.start(200);
    const t0 = performance.now();
    await new Promise(r => { const step = () => { const ms = performance.now() - t0; paintAt(Math.min(ms, total)); if (ms < total + 120) requestAnimationFrame(step); else r(); }; requestAnimationFrame(step); });
    rec.stop(); await done;
    const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
    const file = new File(chunks, `SSK-${plate}.${ext}`, { type: mime.split(';')[0] });
    let shared = false;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: t('sendTitle'), text: `${t('reference')}: ${plate}` }); shared = true; }
      catch (e) { if (e?.name === 'AbortError') shared = true; }
    }
    if (!shared) { const u = URL.createObjectURL(file); const a = el('a'); a.href = u; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
    b.textContent = t('clipDone');
  } catch (e) { b.textContent = t('clipFailed'); }
  setTimeout(() => { b.textContent = was; b.disabled = false; }, 1800);
}
$('#turnclip').onclick = turnClip;

async function cardBlob() {
  const c = await cardImage();
  return new Promise(r => c.toBlob(r, 'image/png'));
}

/* ---------------------------------------------------------------- sheet */
let sheetReturnFocus;
async function readyForExport() {
  for (;;) {
    const selected = selectedAssets();
    try {
      await selected.view.load();
      registerThumbViews();
      if (viewAvailability(S.view).ok) await selected.view.loadSelection(selected.web, selected.snake, selected.bullet);
    } catch (error) {
      if (selectedAssets().key === selected.key) {
        selectionRequest = { key: selected.key, error }; draw(); paint(S.step !== 7 && S.step !== 5);
      }
      return false;
    }
    if (selectedAssets().key === selected.key) return true;
  }
}
async function openSheet() {
  if (flushText()) paint();
  if (!await readyForExport()) return;
  sheetReturnFocus = document.activeElement;
  $('#sheetcode').textContent = code();
  // The card goes out through the phone's own share sheet where there is one.
  const ws = $('#webshare');
  ws.hidden = !(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] }));
  // WhatsApp gets the words and the link; the picture comes off the card.
  $('#whatsapp').href = 'https://wa.me/?text=' + encodeURIComponent(
    `${t('sendTitle')}\n${t('reference')}: ${code()}\n${money(priceBreakdown().total)}\n${shareLink()}`);
  $('#turnclip').hidden = !clipSupported();
  const host = $('#spechost');
  host.textContent = '';
  host.appendChild(limitsBlock());
  host.appendChild(buildSpec());
  $('#sheetstatus').textContent = designStatus();
  // The sheet opens at once; the card (fonts, a full draw) fills in after.
  $('#shot').removeAttribute('src'); $('#shot').alt = '';
  $('#scrim').hidden = false;
  for (const e of document.querySelectorAll('body > header, body > nav, body > main, body > footer')) e.inert = true;
  $('#sheetx').focus();
  const opened = openSheet.n = (openSheet.n || 0) + 1;
  const card = await cardImage();
  if (openSheet.n !== opened || $('#scrim').hidden) return;
  $('#shot').src = card.toDataURL('image/png');
  $('#shot').alt = [t('sendTitle'), code()].join(' ');
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
  const buttons = [...$('#scrim').querySelectorAll('button:not(:disabled):not([hidden]), a[href]:not([hidden])')];
  const first = buttons[0], last = buttons.at(-1);
  if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
  else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
});

/* -------------------------------------------------------------- compare */
/* One kept version, beside the live glove. Kept on this device only, like
   the draft; it never travels with a link or an order. */
const KEPT_KEY = 'ssk-glove-kept-v1';
let kept = null, compareOn = false, ghostRenderer = null, ghostKey = '';
function loadKept() {   // after the catalogue is up: cleanState needs it
  try { const k = JSON.parse(localStorage.getItem(KEPT_KEY)); if (k && k.state) kept = { ...k, state: cleanState(k.state) || null }; if (kept && !kept.state) kept = null; } catch { kept = null; }
}
const keptCode = () => kept ? encodeV4(kept.state, kept.state.bullet == null ? null : (DATA.bullets[kept.state.bullet] || {}).name ?? null) : '';
function keepVersion() {
  if (flushText()) paint();
  const state = structuredClone(S); for (const k of PRIVATE) delete state[k];
  kept = { state, when: new Date().toISOString() };
  try { localStorage.setItem(KEPT_KEY, JSON.stringify(kept)); } catch {}
  compareOn = true; ghostKey = ''; paintCompare(); paintSummary();
}
function clearKept() {
  kept = null; compareOn = false; ghostKey = '';
  try { localStorage.removeItem(KEPT_KEY); } catch {}
  paintCompare(); paintSummary();
}
function restoreKept() {
  if (!kept) return;
  snapshot();
  const keepStep = S.step, keepLang = S.lang;
  Object.assign(S, structuredClone(kept.state), { step: keepStep, lang: keepLang });
  draw(); paint();
}
async function paintCompare() {
  const stage = $('#stage'), ghost = $('#ghost');
  const on = !!(kept && compareOn && R);
  stage.classList.toggle('is-compare', on);
  if (on && interact) interact.zoomReset(false);
  ghost.hidden = !on;
  if (!on) return;
  $('#ghostcode').textContent = keptCode();
  const key = [S.view, JSON.stringify(kept.state), S.lang].join('|');
  if (key === ghostKey) return;
  ghostKey = key;
  try {
    ghostRenderer ||= new GloveRenderer({ ...R.views.back, views: R.views });
    const art = (FLAGS.find(f => f.id === kept.state.flag) || {}).art || null;
    await ghostRenderer.preloadFlags(art ? [art] : []);
    const p = await renderDesignView(kept.state, S.view, ghostRenderer);
    if (ghostKey !== key) return;
    $('#ghostimg').src = p.available ? p.dataUrl : '';
    $('#ghostimg').alt = p.available ? t('kept') : (p.notes || []).join(' ');
  } catch { if (ghostKey === key) $('#ghostimg').removeAttribute('src'); }
}
$('#ghostimg').onclick = restoreKept;
function paintCompareControls() {
  const box = $('#sumcompare'); if (!box) return;
  box.textContent = '';
  const keepBtn = el('button', 'btn btn-ghost', t('keepVersion')); keepBtn.type = 'button'; keepBtn.onclick = keepVersion;
  box.appendChild(keepBtn);
  if (!kept) return;
  const cmp = el('button', 'btn btn-ghost', t('compareOn')); cmp.type = 'button';
  cmp.setAttribute('aria-pressed', String(compareOn));
  cmp.onclick = () => { compareOn = !compareOn; paintCompare(); paintSummary(); };
  const back = el('button', 'btn btn-ghost', t('restoreKept')); back.type = 'button'; back.onclick = restoreKept;
  const clear = el('button', 'btn btn-ghost', t('clearKept')); clear.type = 'button'; clear.onclick = clearKept;
  const when = new Date(kept.when);
  const info = el('span', 'sum-kept', `${keptCode()} · ${t('keptAt').replace('%s', isNaN(when) ? '—' : when.toLocaleString(S.lang === 'nl' ? 'nl-NL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }))}`);
  box.append(cmp, back, clear, info);
}

/* ---------------------------------------------------------------- resume */
/* The draft came back on its own. Say so once, with the way out. */
function showResume() {
  const box = $('#resume'); if (!box) return;
  $('#resumetext').innerHTML = `${t('resumed')} <span>· <code>${code()}</code></span>`;
  box.hidden = false;
  clearTimeout(showResume.t); showResume.t = setTimeout(() => { box.hidden = true; }, 12000);
}
/* A glove was saved into the order; the next one starts from this design,
   back at the first step, with the way to a blank glove at hand. */
function parkedGlove(saved, items) {
  snapshot();
  S.step = 0; S.personalCheck = false;
  draw(); paint();
  const box = $('#resume'); if (!box) return;
  $('#resumetext').innerHTML = `${t('parked').replace('%n', items.length)} <span>· <code>${saved.reference}</code></span>`;
  box.hidden = false;
  clearTimeout(showResume.t); showResume.t = setTimeout(() => { box.hidden = true; }, 15000);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function startOver() {
  snapshot();
  const keepers = { lang: S.lang, name: S.name, phone: S.phone };
  Object.assign(S, { step: 0, part: 'web', bullet: 7, view: 'back', colors: {}, materials: {}, hand: null, size: '11.75"',
    pad: 'None', webType: NATIVE_WEB, withdrawnWeb: null, thumbText: '', thumbFont: null, thumbMain: null, thumbOutline: null,
    thumbNumber: '', circle: null, numberColor: null, flag: null, flagPosition: 'index', flagOther: '', pinkyText: '',
    personalCheck: false, startId: STARTERS[0].id, picked: {} }, keepers);
  applyStarter(STARTERS[0], true); whiteBlank(S, DATA);   // exactly the glove the page opens with
  $('#resume').hidden = true;
  draw(); paint();
}
$('#startover').onclick = startOver;

/* ------------------------------------------------------ summary drawer */
function paintSummary() {
  paintCompareControls();
  const body = $('#sumbody');
  if (!body || $('#sumdrawer').hidden) return;
  body.textContent = '';
  body.appendChild(buildSpec());
}
function openSummary() {
  if (flushText()) paint();
  const drawer = $('#sumdrawer');
  clearTimeout(closeSummary._t);
  drawer.hidden = false; drawer.inert = false; drawer.removeAttribute('aria-hidden');
  $('#summary').setAttribute('aria-expanded', 'true');
  void drawer.offsetHeight;            // commit the off-screen start frame
  drawer.classList.add('is-open');     // then slide it in
  document.body.classList.add('sum-open');  // push the builder aside
  paintSummary();
  $('#sumx').focus();
}
function closeSummary() {
  const drawer = $('#sumdrawer');
  if (drawer.hidden || !drawer.classList.contains('is-open')) return;
  drawer.inert = true; drawer.setAttribute('aria-hidden', 'true');
  $('#summary').setAttribute('aria-expanded', 'false');
  drawer.classList.remove('is-open');  // slide out
  document.body.classList.remove('sum-open');
  $('#summary')?.focus();
  // Drop it from layout once the slide-out finishes.
  clearTimeout(closeSummary._t);
  closeSummary._t = setTimeout(() => { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, 220);
}
$('#summary').onclick = () => {
  const drawer = $('#sumdrawer');
  if (drawer.hidden || !drawer.classList.contains('is-open')) openSummary();
  else closeSummary();
};
$('#sumx').onclick = closeSummary;
document.addEventListener('keydown', ev => {
  if ($('#sumdrawer').hidden) return;
  if (ev.key === 'Escape') { ev.preventDefault(); closeSummary(); }
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
async function downloadImage() {
  if (flushText()) paint();
  if (!await readyForExport()) return;
  const blob = await cardBlob();
  const url = URL.createObjectURL(blob);
  const a = el('a'); a.href = url; a.download = `SSK-${code()}.png`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#sheetimg').onclick = downloadImage;
$('#sumimg').onclick = downloadImage;
$('#webshare').onclick = async ev => {
  const b = ev.currentTarget;
  try {
    const file = new File([await cardBlob()], `SSK-${code()}.png`, { type: 'image/png' });
    await navigator.share({ files: [file], title: t('sendTitle'), text: `${t('reference')}: ${code()}\n${shareLink()}` });
  } catch (e) { if (e?.name !== 'AbortError') copyToClipboard({ currentTarget: b }, shareLink()); }
};

/* The bar names the next open choice and takes you to it. */
function paintBarNext() {
  const a = $('#barnext'); if (!a) return;
  const open = requiredQuestions().filter(q => !answered(q));
  a.hidden = false;
  if (!open.length) { a.innerHTML = `<b>${t('allChosen')}</b>`; a.classList.add('is-done'); a.onclick = ev => { ev.preventDefault(); S.step = STEPS.length - 1; paint(); }; return; }
  a.classList.remove('is-done');
  const q = open[0];
  a.innerHTML = `<b>${t('stillToChoose').replace('%n', open.length)}</b><span>${questionLabel(q)}</span>`;
  a.title = `${t('goFix')} · ${t(STEPS[questionStep(q)].title)}`;
  a.onclick = ev => {
    ev.preventDefault(); flushText();
    S.step = questionStep(q);
    if (q.id.startsWith('c:')) { S.part = colourPart(q.id.slice(2)); colourView(S.part); draw(); }
    paint();
    const field = [...document.querySelectorAll('#body .field-lab')].find(l => l.textContent.trim().startsWith(questionLabel(q)));
    field?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
}

/* First visit: three short hints, one at a time, once per device. */
const COACH = [['turn', '#stageview'], ['pick', '#glove'], ['compare', '#summary']];
function coachMarks() {
  try { if (localStorage.getItem('ssk-coached')) return; } catch { return; }
  if (matchMedia('(max-width: 900px)').matches) { try { localStorage.setItem('ssk-coached', '1'); } catch {} return; }
  let i = 0;
  const box = el('div', 'coach'); box.setAttribute('role', 'status');
  const text = el('span'), btn = el('button', 'btn btn-primary'); btn.type = 'button';
  const dots = el('span', 'coach-dots');
  box.append(text, dots, btn); document.body.appendChild(box);
  const place = () => {
    const [key, sel] = COACH[i];
    text.textContent = tsub('coach', key); btn.textContent = i < COACH.length - 1 ? '→' : t('gotIt');
    dots.innerHTML = COACH.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    const target = document.querySelector(sel), r = target?.getBoundingClientRect();
    if (!r) { next(); return; }
    box.style.visibility = 'hidden'; box.hidden = false;
    const w = box.offsetWidth, h = box.offsetHeight;
    let x = r.left + r.width / 2 - w / 2, y = r.bottom + 12;
    if (sel === '#glove') { x = r.left + r.width / 2 - w / 2; y = r.top + r.height * .55; }
    x = Math.max(12, Math.min(window.innerWidth - w - 12, x)); y = Math.min(window.innerHeight - h - 12, y);
    box.style.left = x + 'px'; box.style.top = y + 'px'; box.style.visibility = '';
    document.querySelectorAll('.is-coached').forEach(e => e.classList.remove('is-coached'));
    target.classList.add('is-coached');
  };
  const done = () => { box.remove(); document.querySelectorAll('.is-coached').forEach(e => e.classList.remove('is-coached')); try { localStorage.setItem('ssk-coached', '1'); } catch {} };
  const next = () => { i++; if (i >= COACH.length) done(); else place(); };
  btn.onclick = next;
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && box.isConnected) done(); });
  place();
}

/* ------------------------------------------------------- price & menu */
function paintPricePop() {
  const pop = $('#pricepop'), price = priceBreakdown();
  pop.innerHTML = `<dl><dt>${t('baseGlove')}</dt><dd>${money(price.base)}</dd>`
    + (price.flag ? `<dt>${t('flagExtra')}</dt><dd>${money(price.flag)}</dd>` : '')
    + `<dt class="tot">${t('totalPrice')}</dt><dd class="tot">${money(price.total)}</dd></dl>`
    + `<p>${t('flagPriceNote').replace('%s', money(PRICE_CENTS.flag))}</p>`;
}
function togglePricePop(open) {
  const pop = $('#pricepop'), on = open ?? pop.hidden;
  pop.hidden = !on; $('#pricebtn').setAttribute('aria-expanded', String(on));
  if (on) paintPricePop();
}
$('#pricebtn').onclick = () => togglePricePop();
/* The code, short: first and last group. A click copies the whole thing. */
function paintCode() {
  const full = code(), g = full.split('-');
  $('#refcode').textContent = full;
  $('#refshort').textContent = g.length > 3 ? `${g[0]}-${g[1]}…${g.at(-1)}` : full;
}
$('#refbtn').onclick = async () => {
  const b = $('#refbtn'), lab = b.querySelector('.ref-lab'), was = t('reference');
  b.classList.add('is-full');
  try { await navigator.clipboard.writeText(code()); lab.textContent = t('codeCopied'); b.classList.add('is-copied'); } catch {}
  clearTimeout(paintCode.t);
  paintCode.t = setTimeout(() => { b.classList.remove('is-full', 'is-copied'); lab.textContent = was; }, 2600);
};
/* The studio: a dark ground under the glove. Remembered on this device. */
const studioDark = () => document.documentElement.dataset.studio === 'dark';
function setStudio(dark) {
  document.documentElement.dataset.studio = dark ? 'dark' : '';
  if (!dark) delete document.documentElement.dataset.studio;
  $('#studio').setAttribute('aria-pressed', String(dark));
  $('#studio').title = t(dark ? 'studioOff' : 'studio'); $('#studio').setAttribute('aria-label', t(dark ? 'studioOff' : 'studio'));
  try { localStorage.setItem('ssk-studio', dark ? 'dark' : 'light'); } catch {}
  if (R) draw();
}
$('#studio').onclick = () => setStudio(!studioDark());
try { if (localStorage.getItem('ssk-studio') === 'dark') setStudio(true); } catch {}
$('#more').onclick = () => {
  const open = document.querySelector('.hdr').classList.toggle('is-open');
  $('#more').setAttribute('aria-expanded', String(open));
};
document.addEventListener('pointerdown', ev => {
  if (!$('#pricepop').hidden && !ev.target.closest('#pricepop, #pricebtn')) togglePricePop(false);
  const hdr = document.querySelector('.hdr');
  if (hdr.classList.contains('is-open') && !ev.target.closest('.hdr')) { hdr.classList.remove('is-open'); $('#more').setAttribute('aria-expanded', 'false'); }
});
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Escape') return;
  if (held) releaseColour();
  if (!$('#pricepop').hidden) togglePricePop(false);
  const hdr = document.querySelector('.hdr');
  if (hdr.classList.contains('is-open')) { hdr.classList.remove('is-open'); $('#more').setAttribute('aria-expanded', 'false'); }
});

/* A roving tab stop over a group of buttons: the chosen one (or the first)
   takes the Tab, arrows walk the rest. */
function roving(buttons) {
  if (buttons.length < 2) return;
  const on = buttons.find(x => x.getAttribute('aria-pressed') === 'true') || buttons[0];
  for (const x of buttons) x.tabIndex = x === on ? 0 : -1;
  const move = (from, d) => {
    const vis = buttons.filter(x => !x.hidden && x.offsetParent !== null);
    const i = Math.max(0, vis.indexOf(from)), to = vis[(i + d + vis.length) % vis.length];
    if (!to) return;
    for (const x of buttons) x.tabIndex = -1;
    to.tabIndex = 0; to.focus();
  };
  for (const x of buttons) x.addEventListener('keydown', ev => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
    if (!d) return;
    ev.preventDefault(); move(x, d);
  });
}

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
  $('#sumx').setAttribute('aria-label', L === 'en' ? 'Close summary' : 'Sluiten');
  $('#steps').setAttribute('aria-label', L === 'en' ? 'Steps' : 'Stappen');
  const hadKey = focusKey(document.activeElement);
  const wasStep = paint.lastStep;
  const revealMaterial = false;
  paint.lastPart = S.part;
  paint.lastStep = S.step;
  if (interact && wasStep !== S.step) interact.zoomReset(false);
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = t(e.dataset.t);
  $('#lang-nl').classList.toggle('is-on', L === 'nl');
  $('#lang-en').classList.toggle('is-on', L === 'en');
  $('#keysbtn').title = t('shortcuts');
  if (!$('#keyspop').hidden) paintKeys();
  paintView();

  // steps
  const nav = $('#steps'); nav.textContent = '';
  STEPS.forEach((st, i) => {
    const open = stepOpen(i);
    const b = el('button', 'step' + (i === S.step ? ' is-on' : '')
      + (STEP_FIELDS[i].length || st.key === 'you' ? (open ? ' is-todo' : ' is-done') : ''));
    b.type = 'button';
    b.dataset.key = 'step|' + i;
    b.innerHTML = `<span class="n">${i + 1}</span>${t(st.title)}` +
      (STEP_FIELDS[i].length ? `<span class="dot${open ? ' todo' : ''}"></span>` : '');
    b.onclick = () => { flushText(); S.step = i; paint(); };
    nav.appendChild(b);
  });
  // The rail scrolls sideways on a phone: keep the current step in view.
  nav.querySelector('.is-on')?.scrollIntoView({ inline: 'center', block: 'nearest' });

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
  // A new step rises into place; a repaint of the same one stays put.
  if (wasStep !== S.step && S.step !== 3 && held) { held = null; interact?.hold(null); $('#stage').classList.remove('is-holding'); }
  if (wasStep !== S.step) {
    const panel = document.querySelector('.panel');
    panel.classList.remove('is-entering'); void panel.offsetWidth; panel.classList.add('is-entering');
    clearTimeout(paint.enterT); paint.enterT = setTimeout(() => panel.classList.remove('is-entering'), 900);
    interact?.clear();
  }
  if (rebuildBody) {
    const b = $('#body');
    // A choice repaints the same step: keep the reader where they were.
    const keep = wasStep === S.step && !revealMaterial ? b.scrollTop : 0;
    const keepPage = wasStep === S.step ? document.scrollingElement.scrollTop : null;
    b.textContent = ''; st.render(b); b.scrollTop = keep;
    // The palette and the part pills are one tab stop each; the arrow keys
    // move inside them. Thirty swatches as thirty stops put the next step
    // out of reach of a Tab key.
    for (const f of b.querySelectorAll('.field')) roving([...f.querySelectorAll('.sw')]);
    roving([...b.querySelectorAll('.part')]);
    if (keepPage != null) document.scrollingElement.scrollTop = keepPage;
  }

  // stage
  const tag = $('#stagetag');
  if (S.step === 3) {
    tag.hidden = false;
    const ico = partIcon(S.part);
    tag.classList.toggle('has-ico', !!ico);
    tag.innerHTML = `${ico}<span>${colourLabel(S.part)} · ${colName(S.part) || '—'}</span>`;
  } else tag.hidden = true;
  // On any step, the stage says when it is not showing the chosen web.
  const wn = webPreviewNote();
  const off = [...($('#stageview')?.querySelectorAll('button') || [])]
    .filter(b => !viewAvailability(b.dataset.view).ok).map(b => t(VIEW_KEYS[b.dataset.view]));
  const palmNote = [STAGE_NOTES.includes(wn) ? (wn === 'thumbEstimated' ? t(wn) : vt(wn)) : '',
    off.length ? vt('anglesUnavailable').replace('%s', off.join(', ')) : '',
    withdrawnNote()].filter(Boolean).join(' ');
  const optionWaiting = viewAvailability(S.view).ok && !selectionIsReady();
  $('#stagehint').textContent = R.views[S.view]?.error ? viewLoadMessage()
    : R.views[S.view]?.ready === false
    ? (S.lang === 'nl' ? 'Weergave laden…' : 'Loading view…')
    : optionWaiting ? selectionMessage(selectionRequest?.key === selectedAssets().key && !!selectionRequest.error) : S.step === 3
    ? [t('pickPart'), palmNote].filter(Boolean).join(' ')
    : palmNote;

  // header + bar
  paintCode();
  $('#studio').title = t(studioDark() ? 'studioOff' : 'studio');
  const total = money(priceBreakdown().total);
  if ($('#price').textContent !== total && $('#price').textContent !== '—') {
    const pb = $('#pricebtn'); pb.classList.remove('is-bumped'); void pb.offsetWidth; pb.classList.add('is-bumped');
  }
  $('#price').textContent = total;
  if (!$('#pricepop').hidden) paintPricePop();
  const d = doneCount();
  $('#donecount').textContent = d;
  $('#totalcount').textContent = countedQuestions().length;
  $('#barfill').style.width = (100 * d / countedQuestions().length) + '%';
  paintBarNext();
  const body = $('#body'); body.dataset.code = code(); body.dataset.when = new Date().toLocaleDateString(S.lang === 'nl' ? 'nl-NL' : 'en-GB');
  $('#prev').disabled = S.step === 0;
  $('#next').textContent = S.step === STEPS.length - 1 ? t('sendIt')
    : `${t(STEPS[S.step + 1].title)} →`;
  $('#undo').disabled = !undoStack.length && !textTx;
  $('#redo').disabled = !redoStack.length;

  // A newly selected part exposes its material controls. Move keyboard focus
  // with that visible context instead of leaving it on an offscreen part pill.
  if (revealMaterial && wasStep === S.step) {
    $('#body .material-picker [aria-pressed="true"]')?.focus({ preventScroll: true });
  } else if (hadKey && wasStep !== undefined && wasStep !== S.step && hadKey.startsWith('step|')) {
    const h = $('#steptitle');
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  } else if (hadKey && !document.contains(document.activeElement) || document.activeElement === document.body) {
    const again = [...document.querySelectorAll('#steps button, #body button, #body input, #body select, #body textarea')]
      .find((e) => focusKey(e) === hadKey);
    if (again) again.focus({ preventScroll: true });
  }

  paintSummary();
  save();
  reportPerformance();
  if (S.step === 1) warmWebOptions();
}

const warmedSizes = new Set();
function warmWebOptions() {
  const key = S.size;
  if (!key || warmedSizes.has(key)) return;
  warmedSizes.add(key);
  preloadImages([...WEBS.filter(w=>w.sizes.includes(key)),...WEB_REFERENCES].map(w=>w.img)).catch(()=>warmedSizes.delete(key));
  for (const web of WEBS.filter(w => w.sizes.includes(key))) {
    R.views.back.loadSelection(web.render || null, false).catch(() => warmedSizes.delete(key));
  }
}

// Optional, test-only observer. No observer or storage changes on normal visits.
function reportPerformance() {
  window.__SSK_PERF__?.ready({ step:S.step, view:S.view,
    ready:initialRendered && selectionIsReady() && viewAvailability(S.view).ok,
    flagsReady:S.step !== 0 || starterFlagsReady,
    reviewReady:S.step !== 7 || !!document.querySelector('.commerce-panel'),
    width:ctx?.canvas.width, height:ctx?.canvas.height,
    renderCache:{publicHits:publicRenders.hits,publicWrites:publicRenders.writes,
      frameBytes:nativeFrames.bytes,frames:nativeFrames.entries.size} });
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
// ⌘Z / Ctrl+Z and ⌘⇧Z / Ctrl+Y, anywhere a text field is not taking them.
/* ------------------------------------------------------------ shortcuts */
/* Digits jump to a step, ? opens the list. Nothing fires while typing. */
const typing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
function paintKeys() {
  const dl = $('#keyslist'); if (!dl) return;
  const K = T[S.lang].keys || T.en.keys;
  const rows = [['?', K.help], ['1 – 8', K.steps], ['← →', K.turn], ['scroll · ⌥', K.zoom], ['Esc', K.esc], ['⌘ Z', K.undo], ['⌘ ⇧ Z', K.redo]];
  dl.innerHTML = rows.map(([k, d]) => `<dt><kbd>${k}</kbd></dt><dd>${d}</dd>`).join('');
}
function toggleKeys(on = $('#keyspop').hidden) {
  const pop = $('#keyspop'); if (!pop) return;
  if (on) paintKeys();
  pop.hidden = !on;
  $('#keysbtn')?.setAttribute('aria-expanded', String(on));
  if (on) $('#keysclose').focus(); else $('#keysbtn')?.focus();
}
$('#keysclose').onclick = () => toggleKeys(false);
$('#keysbtn').onclick = () => toggleKeys();
document.addEventListener('keydown', ev => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey || typing() || !$('#scrim').hidden) return;
  if (ev.key === '?') { ev.preventDefault(); toggleKeys(); return; }
  if (ev.key === 'Escape' && !$('#keyspop').hidden) { toggleKeys(false); return; }
  if (/^[1-8]$/.test(ev.key) && R && $('#keyspop').hidden) {
    const n = +ev.key - 1; if (n === S.step) return;
    ev.preventDefault(); if (flushText()) paint(); S.step = n; paint();
  }
});

document.addEventListener('keydown', ev => {
  if (!(ev.metaKey || ev.ctrlKey) || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
  const k = ev.key.toLowerCase();
  if (k === 'z' && !ev.shiftKey) { ev.preventDefault(); $('#undo').click(); }
  else if ((k === 'z' && ev.shiftKey) || k === 'y') { ev.preventDefault(); $('#redo').click(); }
});
// A short tick on a phone when a part or a colour is chosen. Nothing on desktops.
const tick = () => { try { navigator.vibrate?.(8); } catch {} };

let starterFlagsReady = false;
const savedDraft = load();
const requestedInitialView = decodeState(location.hash.slice(1))?.view
  || (savedDraft && typeof savedDraft === 'object' ? savedDraft.view : null);
loadGlove({ progressive:true, initialView: Object.hasOwn(VIEW_KEYS, requestedInitialView)
  ? requestedInitialView : 'back' }).then(async bundle => {
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
  applyStarter(STARTERS[0], true);
  S.startId = STARTERS[0].id;
  // Shared links open directly; a saved draft restores automatically so the
  // glove loads the visitor's own design without a prompt.
  const h = location.hash.slice(1);
  const shared = h ? cleanSharedState(decodeState(h)) : null;
  S.size = '11.75"'; S.webType = NATIVE_WEB; S.pad = 'None'; S.picked = {}; whiteBlank(S, DATA);
  defaultVisual=visualKey();
  window.__SSK_STARTER_KEY__ = starterKey();     // read by render_starters.mjs
  await loadShippedStarters();
  loadKept();
  const o = cleanState(shared);
  if (o) Object.assign(S, o, { step: 0 });
  else {
    const draft = cleanState(savedDraft);
    // First visit, nothing shared: the browser's language picks the start.
    if (!draft && !savedDraft) S.lang = /^nl\b/i.test(navigator.language || '') ? 'nl' : 'en';
    if (draft) Object.assign(S, draft, { step: Number.isInteger(savedDraft.step)
      && savedDraft.step >= 0 && savedDraft.step < STEPS.length ? savedDraft.step : 0 });
    if (draft && (S.step > 0 || visualKey() !== defaultVisual)) setTimeout(showResume, 600);
  }
  if (h) history.replaceState(null, '', location.pathname + location.search);

  const cv = $('#glove');
  const VIEW_ORDER = ['back', 'thumb', 'palm', 'pinky'];
  const shownViews = () => VIEW_ORDER.filter(v => v === 'back' || R.hasView(v));
  // The glove turns round, never jumps: from the back to the palm it passes
  // the thumb or the pinky side, whichever way it was last turned. A tab
  // next door goes the short way.
  let lastDir = 1;
  const sidePicture = v => {
    const w = WEBS.find(x => x.id === S.webType);
    if (!R.hasView(v) || !viewAvailability(v, w).ok || R.views[v]?.ready === false) return null;
    const cached = nativeFrames.get(nativeFrameKey(v === 'thumb' && thumbEstimatedViewOf(w) || v));
    if (cached) return cached;
    const keep = S.view;
    try { const c = document.createElement('canvas'); S.view = v; draw(c.getContext('2d'), false); return c; }
    catch { return null; }
    finally { S.view = keep; }
  };
  const turnTo = (view, direction) => {
    if (!R.hasView(view) || view === S.view) return;
    const list = shownViews(), n = list.length, from = list.indexOf(S.view), to = list.indexOf(view);
    if (direction == null) {
      const fwd = (to - from + n) % n, back = (from - to + n) % n;
      direction = fwd < back ? 1 : back < fwd ? -1 : lastDir;
    }
    lastDir = direction;
    const via = [];
    if (from >= 0 && to >= 0) for (let i = (from + direction + n) % n; i !== to && via.length < n; i = (i + direction + n) % n) via.push(list[i]);
    const swap = () => { S.view = view; draw(); paint(S.step !== 0); };
    if (!interact) { swap(); return; }
    const pictures = matchMedia('(prefers-reduced-motion: reduce)').matches ? [] : via.map(sidePicture).filter(Boolean);
    interact.flip(direction, swap, t(VIEW_KEYS[view]), pictures);
  };
  interact = initStage({
    canvas: cv, label: $('#stagelabel'), stage: $('#stage'), frame: $('#stageframe'),
    renderer: () => R, mirror: isLefty,
    zoneOf: (x, y) => (viewAvailability(S.view).ok && selectionIsReady()) ? R.zoneAt(x, y, isLefty()) : null,
    describe: id => {
      const f = id && viewLayerField()[id]; if (!f) return null;
      const part = colourPart(f);
      return { name: colourLabel(part), colour: colName(part) || '' };
    },
    onPick: id => {
      const f = id && viewLayerField()[id];
      if (!f) return;
      tick();
      if (S.step === 3 && paintPart(colourPart(f))) return;
      S.step = 3; S.part = colourPart(f); draw(); paint();
    },
    onTurn: dir => {
      const list = shownViews(); if (list.length < 2) return;
      $('#stageturn').hidden = true;
      try { localStorage.setItem('ssk-turned', '1'); } catch {}
      const i = list.indexOf(S.view);
      turnTo(list[(i + dir + list.length) % list.length], dir);
    }
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
      b.innerHTML = `<img src="${assetURL('assets/ui/view-' + id + '.png')}" alt="" width="26" height="26"><span></span>`;
      b.onclick = () => {
        if (!R.hasView(id)) return;
        turnTo(id);
      };
      // Warm an angle on intent. Avoid competing with the selected web by
      // immediately downloading all side views after the first frame.
      const warmView = () => {
        if (!selectionIsReady()) return;
        R.views[id].load().then(() => { registerThumbViews(); paintView(); }).catch(() => {});
      };
      b.addEventListener('pointerenter', warmView);
      b.addEventListener('focus', warmView);
      vw.appendChild(b);
    }
  } else $('#stageturn').hidden = true;
  try { if (localStorage.getItem('ssk-turned')) $('#stageturn').hidden = true; } catch {}

  if(visualKey()===defaultVisual && S.view==='back') {
    let image=await publicRenders.read('default:back',DATA.w,DATA.h);
    // No cached frame on this device: the shipped picture of the blank glove
    // (render_starters.mjs) is the first frame, and the engine draws nothing
    // until a choice changes it.
    if(!image && shippedStarters?.defaultBack && !isLefty()) {
      try {
        const img=new Image(); img.src=assetURL('assets/starters/'+shippedStarters.defaultBack); await img.decode();
        if(img.naturalWidth===DATA.w && img.naturalHeight===DATA.h) {
          image=document.createElement('canvas'); image.width=DATA.w; image.height=DATA.h;
          image.getContext('2d').drawImage(img,0,0);
        }
      } catch { image=null; }
    }
    if(image) { nativeFrames.select(defaultVisual);nativeFrames.put(nativeFrameKey('back'),image); }
  }
  draw(); paint();
  setTimeout(coachMarks, 1600);
  // The pick map costs ten draws; take it in idle time so the first hover
  // over the glove does not pay for it.
  const warmOwners = () => { try { if (S.view === 'back' && selectionIsReady()) R.backOwners(isLefty()); } catch {} };
  (window.requestIdleCallback || (f => setTimeout(f, 2500)))(warmOwners, { timeout: 9000 });
  $('#stage').addEventListener('pointerenter', warmOwners, { once: true });
  // The opening: until someone touches the page, the glove turns to its next
  // side every few seconds. The first touch, key or scroll ends it for good.
  let idle = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stopIdle = () => { idle = false; clearInterval(idleTimer); };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart']) document.addEventListener(type, stopIdle, { once: true, capture: true, passive: true });
  const idleTimer = setInterval(() => {
    if (!idle || S.step !== 0 || document.hidden || !selectionIsReady()) return;
    const list = shownViews(); if (list.length < 2) return;
    turnTo(list[(list.indexOf(S.view) + 1) % list.length], 1);
  }, 3800);
  R.preloadFlags(FLAGS.map(f => f.art)).then(() => {
    starterFlagsReady = true;
    // Flag selection keeps its own decoded callback; only starter cards need
    // refreshing when the complete flag set becomes available.
    if (S.step === 0) paint();
  });
  // The selected back is decoded and drawn. Prepare angles while starter
  // cards render, at low network priority; a customer may switch immediately.
  // Failures remain retryable through the normal selected-view load path.
  // The other sides are several megabytes. They come after the first touch,
  // or after six seconds of looking, whichever is first; never before the
  // page is usable. A tab on a side loads it on intent as before.
  let sidesWarmed = false;
  const warmSides = () => {
    if (sidesWarmed) return; sidesWarmed = true;
    for (const view of ['palm','pinky']) {
      R.views[view]?.load({priority:'low'}).then(()=>{
        registerThumbViews();
        prepareSideFrame(view);
      }).catch(() => {});
    }
    // Thumb's many individual plates stay on its existing intent/selection
    // path, so optional downloads cannot flood the Web step's requests.
  };
  for (const type of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(type, warmSides, { once: true, capture: true, passive: true });
  setTimeout(warmSides, 6000);
  setTimeout(() => { import('./commerce-ui.js').catch(() => {}); }, 1200);
}).catch(error => {
  console.error('Glove initialization failed', error);
  $('#steptitle').textContent = t('loadError');
  $('#steplead').textContent = t('loadRetry');
  $('#next').disabled = true;
});
