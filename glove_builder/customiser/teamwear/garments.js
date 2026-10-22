// Flat vector garment templates. Every colourable part is a path with
// data-zone, so the stage is a control: clicking a part selects it.
// These are stand-ins until Pim's product artwork arrives; the zone ids are
// the contract, so swapping the drawing keeps every saved design valid.

const OUTLINE = 'stroke="#0b0b0c" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="round"';
const SEAM = 'fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.1" stroke-dasharray="4 3"';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function zone(id, d, colors, extra = '') {
  const fill = colors[id] || '#cccccc';
  return `<path data-zone="${id}" d="${d}" fill="${fill}" ${OUTLINE} ${extra}/>`;
}

// Soft fabric light: darker edges, a lift through the middle.
function defs(uid) {
  return `<defs>
    <linearGradient id="shade-${uid}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity=".22"/>
      <stop offset=".22" stop-color="#000" stop-opacity="0"/>
      <stop offset=".5" stop-color="#fff" stop-opacity=".10"/>
      <stop offset=".78" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".22"/>
    </linearGradient>
    <linearGradient id="fall-${uid}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".08"/>
      <stop offset="1" stop-color="#000" stop-opacity=".14"/>
    </linearGradient>
    <pattern id="mesh-${uid}" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.3" fill="#000" fill-opacity=".35"/>
    </pattern>
  </defs>`;
}

function shade(d, uid) {
  return `<path d="${d}" fill="url(#shade-${uid})" pointer-events="none"/><path d="${d}" fill="url(#fall-${uid})" pointer-events="none"/>`;
}

// Text in team lettering. Outline is drawn under the fill (paint-order).
const FONTS = {
  block: { family: "'Barlow Condensed', Impact, sans-serif", weight: 800, style: 'normal' },
  varsity: { family: "Rockwell, 'Roboto Slab', Georgia, serif", weight: 800, style: 'normal' },
  script: { family: "'Brush Script MT', 'Segoe Script', cursive", weight: 700, style: 'italic' },
};
function lettering(text, x, y, size, look, opts = {}) {
  if (!text) return '';
  const f = FONTS[look.font] || FONTS.block;
  const stroke = look.outline && look.outline !== 'none'
    ? `stroke="${look.outline}" stroke-width="${Math.max(2, size / 9)}" paint-order="stroke" stroke-linejoin="round"` : '';
  const len = opts.maxWidth ? `textLength="${opts.maxWidth}" lengthAdjust="spacingAndGlyphs"` : '';
  const rot = opts.rotate ? `transform="rotate(${opts.rotate} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${f.family}" font-weight="${f.weight}" font-style="${f.style}" font-size="${size}" fill="${look.fill}" ${stroke} ${len} ${rot} pointer-events="none">${esc(text)}</text>`;
}

// Logo or text placed on a placement box {x,y,w,h}.
// Lettering with no colour chosen yet contrasts with the garment, so white
// text never disappears on a white shirt.
function contrastFor(hex) {
  const n = parseInt(String(hex || '#000').slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#0B0B0C' : '#FFFFFF';
}

function placement(box, deco, look) {
  if (!deco || deco.kind === 'none') return '';
  if (deco.kind === 'logo' && deco.logo) {
    return `<image href="${deco.logo}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>`;
  }
  if (deco.kind === 'text' && deco.text) {
    const size = Math.min(box.h, (box.w * 1.9) / Math.max(3, deco.text.length));
    const fit = deco.text.length > 4 ? box.w : null;
    return lettering(deco.text, box.x + box.w / 2, box.y + box.h / 2 + size * 0.36, size,
      { fill: deco.fill || look.fill, outline: deco.outline ?? look.outline, font: deco.font || look.font },
      { maxWidth: fit, rotate: box.rotate });
  }
  if (deco.kind === 'logo') {
    return `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="4" fill="none" stroke="#c8102e" stroke-width="1.5" stroke-dasharray="5 4" pointer-events="none"/>
      <text x="${box.x + box.w / 2}" y="${box.y + box.h / 2 + 4}" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#c8102e" pointer-events="none">LOGO</text>`;
  }
  return '';
}

function decorations(view, spec, state) {
  const look = state.lettering;
  const auto = { ...look, fill: contrastFor(state.colors.body || state.colors.front || state.colors.crown) };
  return (spec.placements || []).filter(p => p.view === view)
    .map(p => placement(p.box, state.deco[p.id], auto)).join('');
}

// --------------------------------------------------------------- tops
// Shared torso for shirts. Sleeve length decides the silhouette.
const TORSO = 'M140,50 Q200,82 260,50 L300,62 L300,140 L312,420 Q200,432 88,420 L100,140 L100,62 Z';
const SLEEVE_SHORT_L = 'M100,62 L42,98 L22,170 L80,188 L100,140 Z';
const SLEEVE_SHORT_R = 'M300,62 L358,98 L378,170 L320,188 L300,140 Z';
const CUFF_SHORT_L = 'M22,170 L80,188 L85,179 L27,161 Z';
const CUFF_SHORT_R = 'M378,170 L320,188 L315,179 L373,161 Z';
const SLEEVE_LONG_L = 'M100,62 L50,104 L24,390 L76,398 L100,160 Z';
const SLEEVE_LONG_R = 'M300,62 L350,104 L376,390 L324,398 L300,160 Z';
const CUFF_LONG_L = 'M24,390 L76,398 L78,374 L27,367 Z';
const CUFF_LONG_R = 'M376,390 L324,398 L322,374 L373,367 Z';
const HEM = 'M88,420 Q200,432 312,420 L311,396 Q200,408 89,396 Z';

function shirt(view, spec, state, uid) {
  const c = state.colors;
  const v = spec.variant;
  const longSleeve = v.sleeve === 'long';
  const out = [];
  out.push(zone('body', TORSO, c));
  if (v.rib) out.push(zone('trim', HEM, c));
  out.push(zone('sleeves', longSleeve ? SLEEVE_LONG_L : SLEEVE_SHORT_L, c));
  out.push(zone('sleeves', longSleeve ? SLEEVE_LONG_R : SLEEVE_SHORT_R, c));
  if (spec.zones.some(z => z.id === 'trim')) {
    out.push(zone('trim', longSleeve ? CUFF_LONG_L : CUFF_SHORT_L, c));
    out.push(zone('trim', longSleeve ? CUFF_LONG_R : CUFF_SHORT_R, c));
  }
  if (view === 'front') {
    if (v.neck === 'vbutton') {
      out.push(`<path d="M156,48 Q200,40 244,48 L200,104 Z" fill="${c.body}" ${OUTLINE}/><path d="M156,48 Q200,40 244,48 L200,104 Z" fill="#000" fill-opacity=".35" pointer-events="none"/>`);
      out.push(zone('trim', 'M146,50 L200,116 L254,50 L244,47 L200,102 L156,47 Z', c));
      const end = v.placket === 'full' ? 420 : 190;
      out.push(zone('piping', `M190,112 L190,${end} L194,${end} L194,112 Z`, c));
      out.push(zone('piping', `M206,112 L206,${end} L210,${end} L210,112 Z`, c));
      const buttons = v.placket === 'full' ? [140, 192, 244, 296, 348, 398] : [138, 170];
      buttons.forEach(y => out.push(`<circle data-zone="buttons" cx="200" cy="${y}" r="5.5" fill="${c.buttons || '#fff'}" ${OUTLINE}/>`));
    } else if (v.neck === 'polo') {
      out.push(`<path d="M150,50 Q200,70 250,50 L200,100 Z" fill="#000" fill-opacity=".3" pointer-events="none"/>`);
      out.push(zone('trim', 'M146,50 L200,98 L174,108 L128,72 Z', c));
      out.push(zone('trim', 'M254,50 L200,98 L226,108 L272,72 Z', c));
      out.push(`<path d="M193,100 L193,170 L207,170 L207,100" ${SEAM}/>`);
      [118, 146].forEach(y => out.push(`<circle data-zone="buttons" cx="200" cy="${y}" r="4.5" fill="${c.buttons || '#fff'}" ${OUTLINE}/>`));
    } else {
      out.push(`<path d="M150,51 Q200,84 250,51 Q200,66 150,51 Z" fill="#000" fill-opacity=".35" pointer-events="none"/>`);
      out.push(zone('trim', 'M140,50 Q200,82 260,50 L250,52 Q200,72 150,52 Z', c));
    }
  } else {
    out.push(zone('trim', 'M140,50 Q200,60 260,50 L256,58 Q200,68 144,58 Z', c));
  }
  out.push(`<path d="M100,62 L100,140 M300,62 L300,140" ${SEAM}/>`);
  out.push(shade(TORSO, uid));
  out.push(decorations(view, spec, state));
  if (view === 'back' && spec.names) out.push(namesAndNumbers(state, 200, 120, 270));
  if (view === 'front' && spec.names) out.push(frontNumber(state, 146, 262));
  return out.join('');
}

// The 3-inch number on the front, left of centre as worn on a jersey.
function frontNumber(state, x, y) {
  const n = state.names;
  if (!n.enabled || !n.front) return '';
  return lettering(state.preview?.number || '23', x, y, 46, { fill: n.fill, outline: n.outline, font: n.font });
}

function namesAndNumbers(state, cx, nameY, numY) {
  const n = state.names;
  if (!n.enabled) return '';
  const p = state.preview || {};
  const look = { fill: n.fill, outline: n.outline, font: n.font };
  const name = (p.name || 'NAAM').toUpperCase();
  return (n.name !== false ? lettering(name, cx, nameY, 30, look, { maxWidth: Math.min(180, name.length * 19) }) : '')
    + (n.back !== false ? lettering(p.number || '23', cx, numY, 130, look) : '');
}

function hoodie(view, spec, state, uid) {
  const c = state.colors;
  const zip = spec.variant.zip;
  const out = [];
  out.push(zone('body', TORSO, c));
  out.push(zone('trim', HEM, c));
  out.push(zone('sleeves', SLEEVE_LONG_L, c));
  out.push(zone('sleeves', SLEEVE_LONG_R, c));
  out.push(zone('trim', CUFF_LONG_L, c));
  out.push(zone('trim', CUFF_LONG_R, c));
  if (view === 'front') {
    out.push(zone('hood', 'M128,58 C112,-6 288,-6 272,58 Q200,100 128,58 Z', c));
    out.push(`<path d="M150,56 C150,14 250,14 250,56 Q200,90 150,56 Z" fill="#000" fill-opacity=".45" pointer-events="none"/>`);
    if (zip) {
      out.push(zone('zipper', 'M197,88 L203,88 L203,420 L197,420 Z', c));
      out.push(zone('pocket', 'M118,300 L190,300 L190,380 L104,380 Z', c));
      out.push(zone('pocket', 'M282,300 L210,300 L210,380 L296,380 Z', c));
    } else {
      out.push(zone('pocket', 'M130,300 L270,300 L292,384 L108,384 Z', c));
      out.push(`<path d="M146,300 L128,384 M254,300 L272,384" ${SEAM}/>`);
    }
    out.push(`<path d="M186,86 L182,170 M214,86 L218,170" fill="none" stroke="${c.drawcord || '#fff'}" stroke-width="3.2" stroke-linecap="round" data-zone="drawcord"/>`);
  } else {
    out.push(zone('hood', 'M132,58 C116,-4 284,-4 268,58 C250,120 150,120 132,58 Z', c));
    out.push(`<path d="M200,6 L200,110" ${SEAM}/>`);
  }
  out.push(shade(TORSO, uid));
  out.push(decorations(view, spec, state));
  if (view === 'back' && spec.names) out.push(namesAndNumbers(state, 200, 160, 290));
  if (view === 'front' && spec.names) out.push(frontNumber(state, 150, 290));
  return out.join('');
}

function jacket(view, spec, state, uid) {
  const c = state.colors;
  const v = spec.variant;
  const half = v.zip === 'half';
  const long = v.sleeve !== 'short';
  const out = [];
  out.push(zone('body', TORSO, c));
  out.push(zone('yoke', 'M140,50 Q200,82 260,50 L300,62 L300,128 Q200,140 100,128 L100,62 Z', c));
  out.push(zone('trim', HEM, c));
  out.push(zone('sleeves', long ? SLEEVE_LONG_L : SLEEVE_SHORT_L, c));
  out.push(zone('sleeves', long ? SLEEVE_LONG_R : SLEEVE_SHORT_R, c));
  out.push(zone('trim', long ? CUFF_LONG_L : CUFF_SHORT_L, c));
  out.push(zone('trim', long ? CUFF_LONG_R : CUFF_SHORT_R, c));
  if (spec.zones.some(z => z.id === 'stripe')) {
    out.push(zone('stripe', 'M62,112 L72,116 L48,364 L38,362 Z', c));
    out.push(zone('stripe', 'M338,112 L328,116 L352,364 L362,362 Z', c));
  }
  if (view === 'front') {
    out.push(zone('trim', 'M146,40 Q200,64 254,40 L262,58 Q200,92 138,58 Z', c));
    if (v.pockets) {
      out.push(zone('pocket', 'M112,270 L184,270 L184,350 L114,350 Z', c));
      out.push(zone('pocket', 'M288,270 L216,270 L216,350 L286,350 Z', c));
      out.push(`<path d="M112,282 L184,282 M216,282 L288,282" ${SEAM}/>`);
    }
    out.push(zone('zipper', `M197,84 L203,84 L203,${half ? 200 : 420} L197,${half ? 200 : 420} Z`, c));
    out.push(`<circle cx="200" cy="96" r="5" fill="${c.zipper || '#ccc'}" ${OUTLINE} data-zone="zipper"/>`);
  } else {
    out.push(zone('trim', 'M146,40 Q200,52 254,40 L262,58 Q200,70 138,58 Z', c));
  }
  out.push(shade(TORSO, uid));
  out.push(decorations(view, spec, state));
  if (view === 'back' && spec.names) out.push(namesAndNumbers(state, 200, 165, 295));
  if (view === 'front' && spec.names) out.push(frontNumber(state, 150, 250));
  return out.join('');
}

// --------------------------------------------------------------- bottoms
function pants(view, spec, state, uid) {
  const c = state.colors;
  const v = spec.variant;
  const hem = v.length === 'short' ? 240 : v.length === 'knicker' ? 330 : 440;
  const crotch = v.length === 'short' ? 170 : 150;
  const flare = v.length === 'short' ? 14 : 0;
  const legs = `M110,50 L290,50 L300,200 L${292 + flare},${hem} L212,${hem} L200,${crotch} L188,${hem} L${108 - flare},${hem} L100,200 Z`;
  const out = [];
  out.push(zone('body', legs, c));
  out.push(zone('waist', 'M108,22 L292,22 L292,52 L108,52 Z', c));
  if (v.length === 'knicker') {
    out.push(zone('waist', `M108,${hem - 18} L188,${hem - 18} L188,${hem} L108,${hem} Z`, c));
    out.push(zone('waist', `M212,${hem - 18} L292,${hem - 18} L292,${hem} L212,${hem} Z`, c));
  }
  if (spec.zones.some(z => z.id === 'piping')) {
    out.push(`<path data-zone="piping" d="M110,52 L100,200 L${108 - flare},${hem}" fill="none" stroke="${c.piping}" stroke-width="9" stroke-linejoin="round"/>`);
    out.push(`<path data-zone="piping" d="M290,52 L300,200 L${292 + flare},${hem}" fill="none" stroke="${c.piping}" stroke-width="9" stroke-linejoin="round"/>`);
  }
  [130, 170, 230, 270].forEach(x => out.push(`<rect x="${x - 4}" y="20" width="8" height="34" rx="2" fill="${c.waist}" ${OUTLINE} data-zone="waist"/>`));
  if (view === 'front') {
    out.push(`<path d="M200,52 L200,${crotch - 10}" ${SEAM}/>`);
    out.push(`<path d="M128,62 Q140,100 112,112 M272,62 Q260,100 288,112" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.6"/>`);
  } else {
    out.push(`<path d="M132,90 L176,90 L176,124 L132,124 Z M224,90 L268,90 L268,124 L224,124 Z" ${SEAM}/>`);
  }
  out.push(shade(legs, uid));
  out.push(decorations(view, spec, state));
  if (view === 'back' && spec.names && state.names.enabled) {
    const look = { fill: state.names.fill, outline: state.names.outline, font: state.names.font };
    out.push(lettering(state.preview?.number || '23', 154, 116, 34, look));
  }
  return out.join('');
}

function socks(view, spec, state, uid) {
  const c = state.colors;
  const sock = (dx) => `M${150 + dx},20 L${230 + dx},20 L${228 + dx},300 Q${232 + dx},360 ${280 + dx},372 Q${310 + dx},380 ${306 + dx},410 Q${300 + dx},432 ${250 + dx},430 L${180 + dx},428 Q${146 + dx},424 ${150 + dx},380 Z`;
  const out = [];
  [-70, 60].forEach(dx => {
    out.push(zone('body', sock(dx), c));
    out.push(zone('trim', `M${150 + dx},20 L${230 + dx},20 L${230 + dx},52 L${150 + dx},52 Z`, c));
    out.push(zone('stripe', `M${150 + dx},80 L${230 + dx},80 L${230 + dx},96 L${150 + dx},96 Z`, c));
    out.push(shade(sock(dx), uid));
  });
  return out.join('');
}

// --------------------------------------------------------------- caps
function cap(view, spec, state, uid) {
  const c = state.colors;
  const v = spec.variant;
  const out = [];
  const crown = 'M76,222 C70,34 330,34 324,222 Z';
  out.push(zone('sides', crown, c));
  if (view === 'front') {
    out.push(zone('front', 'M124,222 C114,40 286,40 276,222 Z', c));
    out.push(`<path d="M200,84 L200,222" ${SEAM}/><path d="M131,214 C124,90 186,62 198,86 M269,214 C276,90 214,62 202,86" ${SEAM}/>`);
    out.push(`<path d="M74,214 Q200,236 326,214 L326,226 Q200,248 74,226 Z" fill="#000" fill-opacity=".45" pointer-events="none"/>`);
    out.push(zone('visor', 'M60,216 Q200,248 340,216 Q346,246 200,284 Q54,246 60,216 Z', c));
    out.push(`<path d="M76,232 Q200,262 324,232" ${SEAM}/>`);
  } else {
    out.push(`<path d="M200,84 L200,222 M114,206 C104,110 150,72 194,84 M286,206 C296,110 250,72 206,84" ${SEAM}/>`);
    if (v.closure === 'fitted') {
      out.push(zone('trim', 'M76,206 Q200,230 324,206 L325,224 Q200,248 75,224 Z', c));
    } else {
      out.push(`<path d="M146,226 Q146,168 200,166 Q254,168 254,226 Z" fill="#000" fill-opacity=".6" pointer-events="none"/>`);
      out.push(zone('trim', 'M136,200 L264,200 L264,216 L136,216 Z', c));
      out.push(`<rect x="188" y="196" width="24" height="24" rx="3" fill="#bfbfbf" ${OUTLINE} pointer-events="none"/>`);
    }
  }
  out.push(`<circle data-zone="button" cx="200" cy="82" r="10" fill="${c.button}" ${OUTLINE}/>`);
  out.push(shade(crown, uid));
  out.push(decorations(view, spec, state));
  return out.join('');
}

function bag(view, spec, state, uid) {
  const c = state.colors;
  const shape = 'M100,110 L300,110 Q320,110 320,130 L320,400 Q320,420 300,420 L100,420 Q80,420 80,400 L80,130 Q80,110 100,110 Z';
  return [
    `<path d="M150,110 Q150,40 200,40 Q250,40 250,110" fill="none" stroke="${c.trim}" stroke-width="12" data-zone="trim"/>`,
    zone('body', shape, c),
    zone('trim', 'M80,300 L320,300 L320,330 L80,330 Z', c),
    `<path d="M110,150 L290,150" ${SEAM}/>`,
    shade(shape, uid),
    decorations(view, spec, state),
  ].join('');
}

const DRAW = { shirt, hoodie, jacket, pants, socks, cap, bag };
const VIEWBOX = { shirt: '0 -10 400 450', hoodie: '0 -20 400 460', jacket: '0 -10 400 450', pants: '0 0 400 460', socks: '0 0 400 450', cap: '40 50 320 250', bag: '40 20 320 420' };

// ------------------------------------------------------------ photographs
let PHOTOS = {};
let PHOTO_BACK = {};
export function setPhotos(index, backs) { PHOTOS = index || {}; PHOTO_BACK = backs || {}; }

export function photoFor(spec, colour, view) {
  const set = PHOTOS[spec.variant.photo];
  if (!set) return null;
  const entry = set[colour] || Object.values(set)[0];
  return entry?.[view] || null;
}

function photo(view, spec, state) {
  const img = photoFor(spec, state.photoColour, view);
  const { w, h } = img;
  const out = [`<image href="${img.src}" x="0" y="0" width="${w}" height="${h}" data-zone="body"/>`];
  (spec.placements || []).filter(p => p.view === view && p.photoBox).forEach(p => {
    const [x, y, bw, bh, rot = 0, skew = 0] = p.photoBox;
    const box = { x: x * w, y: y * h, w: bw * w, h: bh * h };
    const cx = box.x + box.w / 2; const cy = box.y + box.h / 2;
    const deco = placement(box, state.deco[p.id], { ...state.lettering, fill: contrastFor(state.photoHex) });
    if (deco) out.push(`<g transform="translate(${cx} ${cy}) rotate(${rot}) skewY(${skew}) translate(${-cx} ${-cy})">${deco}</g>`);
  });
  const back = PHOTO_BACK[spec.variant.photo];
  if (view === 'back' && back && spec.names && state.names.enabled) {
    const n = state.names; const look = { fill: n.fill, outline: n.outline, font: n.font };
    const p = state.preview || {};
    const [cx, nameY, numY, numH] = back;
    if (n.name !== false) {
      const name = (p.name || 'NAAM').toUpperCase();
      out.push(lettering(name, cx * w, nameY * h, h * 0.045, look, { maxWidth: Math.min(w * 0.5, name.length * h * 0.028) }));
    }
    if (n.back !== false) out.push(lettering(p.number || '23', cx * w, numY * h, numH * h, look));
  }
  return { body: out.join(''), viewBox: `0 0 ${w} ${h}` };
}

let uidSeq = 0;
// spec: { template, variant, zones, placements, names } ; state: colors, deco, names, lettering, preview
export function renderGarment(spec, state, view = 'front', opts = {}) {
  const uid = `g${++uidSeq}`;
  const label = esc(opts.label || '');
  if (spec.variant.photo && photoFor(spec, state.photoColour, view)) {
    const ph = photo(view, spec, state);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ph.viewBox}" role="img" aria-label="${label}">${defs(uid)}${ph.body}</svg>`;
  }
  const draw = DRAW[spec.template];
  if (!draw) return '';
  const body = draw(view, spec, state, uid);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX[spec.template]}" role="img" aria-label="${label}">${defs(uid)}${body}</svg>`;
}

export function hasBack(spec) {
  if (spec.variant.photo && PHOTOS[spec.variant.photo]) return Object.values(PHOTOS[spec.variant.photo]).some(c => c.back);
  return spec.template !== 'socks' && spec.template !== 'bag';
}
