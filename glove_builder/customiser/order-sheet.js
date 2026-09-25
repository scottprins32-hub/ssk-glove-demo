/* The order as Pim's order sheet sees it.

   SSK Europe collects custom glove orders in one workbook
   ("SSK Custom Gloves Order <month>.xlsx", sheet "Order Sheet glove") that
   goes to SSK Japan: one row per glove, three header rows, and colours
   written as "70.Navy" — SSK's code, a dot, SSK's name. This module turns a
   finished design into that row, so what Pim receives is what he already
   works with, not a new format to retype.

   Plain ES module with no DOM and no catalogue import: the page fills the
   row with names it resolves itself, and the order endpoint (api/order.mjs)
   imports the same file to write the workbook. Both sides agree on the
   columns because there is only one list of them. */

/* Pim's columns, in his order. `key` is the property of the row object;
   `h1`/`h2`/`h3` are the three header rows exactly as in his workbook
   (a run of columns under one h1 is merged there; here it is repeated once
   and left blank after, which is what a merged range reads as). */
export const SHEET_COLUMNS = [
  { key: 'no', h1: 'No' },
  { key: 'po', h1: 'PO#' },
  { key: 'reference', h1: 'REFERENCE＃' },
  { key: 'pattern', h1: 'Pattern' },
  { key: 'size', h1: 'Size' },
  { key: 'qtyRHT', h1: 'QTY', h2: 'RHT' },
  { key: 'qtyLHT', h2: 'LHT' },
  { key: 'pad', h1: 'Finger Pad' },
  { key: 'padColor', h1: 'Finger Pad Color' },
  { key: 'web', h1: 'Web' },
  { key: 'palm', h1: 'Color', h2: '①', h3: 'Palm' },
  { key: 'webColor', h2: '②', h3: 'Web' },
  { key: 'back1', h2: '③', h3: 'Back1' },
  { key: 'back2', h2: '④', h3: 'Back2' },
  { key: 'back3', h2: '⑤', h3: 'Back3' },
  { key: 'back4', h2: '⑥', h3: 'Back4' },
  { key: 'back5', h2: '⓻', h3: 'Back5' },
  { key: 'back6', h2: '⑧', h3: 'Back6' },
  { key: 'back7', h2: '⑨', h3: 'Back7' },
  { key: 'back8', h2: '⑩', h3: 'Back8' },
  { key: 'back9', h2: '⑪', h3: 'Back9' },
  { key: 'thumbLoops', h2: '⑫', h3: 'Thumb Loops' },
  { key: 'pinkyLoops', h2: '⑬', h3: 'Pinky Loops' },
  { key: 'belt', h2: '⑭', h3: 'Belt' },
  { key: 'lining', h2: '⑮', h3: 'Lining' },
  { key: 'weltingType', h2: '⑰Welting', h3: 'Type' },
  { key: 'welting', h3: 'Color' },
  { key: 'laces', h2: '⑱', h3: 'Lacing' },
  { key: 'binding', h2: '⑲', h3: 'Binding' },
  { key: 'stitching', h2: '⑳', h3: 'Stitching' },
  { key: 'ringEmb', h1: 'Ring  Finger Embroidery', h3: 'Embroidery' },
  { key: 'ringEmbColor', h2: '㉑', h3: 'Embroidery color' },
  { key: 'backStyle', h1: 'Back Style' },
  { key: 'bullet', h1: 'Bullet Logo', h2: '㉒', h3: 'Wrist Strap' },
  { key: 'palmLogoCenter', h1: 'Palm Logo', h2: 'Center' },
  { key: 'palmLogoHeel', h2: 'Heel' },
  { key: 'thumbText', h1: 'Thumb Embroidery', h3: 'Name' },
  { key: 'thumbFont', h3: 'Font' },
  { key: 'thumbMain', h2: 'Embroidery Color' },
  { key: 'thumbOutline', h2: 'Embroidery Color Outline' },
  { key: 'thumbNumber', h1: 'Thumb Number', h2: 'Number', h3: 'Number' },
  { key: 'circle', h3: 'Base color' },
  { key: 'numberColor', h3: 'Embroidery Color' },
  { key: 'bulletEmb', h2: 'Bullet' },
  { key: 'bulletEmbColor', h3: 'Embroidery Color' },
  { key: 'patternNote', h1: 'Pattern' },
  { key: 'embroideryNote', h1: 'Embroidery' },
  { key: 'flagNote', h1: 'Flags' },
  // Not in Pim's workbook: what ties a row back to the customer's payment
  // in the shop and to the configurator. Appended after his last column so
  // his layout is untouched.
  { key: 'orderNumber', h1: 'Configurator order' },
  { key: 'gloveNo', h1: 'Glove' },
  { key: 'code', h1: 'Design code' },
  { key: 'phone', h1: 'Phone' },
  { key: 'email', h1: 'E-mail' },
];

/* What every row carries that the form does not ask. "Conventional" is the
   only back style SSK Europe orders and every row in Pim's workbook has it.
   Welting type and the crocodile emboss are also on every row of his, but
   the form has no question for either, so they are left for Pim to fill:
   a default would order a finish nobody chose. */
export const SHEET_FIXED = { pattern: 'AP1', backStyle: 'Conventional' };

/* A design, with its names already resolved, as one sheet row.

   `g` (one glove):
     hand 'RHT'|'LHT', size '11.75"', pad 'None'|'Finger Pad'|'Finger Hood',
     webType 'H-Web', colours {field: '70.Navy'} for every colour field the
     form has (pad_color may be missing), bullet 'Edge Gold',
     thumbText, thumbFont, thumbMain '39.Gold', thumbOutline, thumbNumber,
     circle 'Navy', numberColor, pinkyText, flag 'Netherlands'|'None'|null,
     code 'SSK2-…'
   `o` (the order): orderNumber, name, phone, email
   `no`: 1-based position in the order. */
export function sheetRow(g, o, no) {
  const c = g.colours || {};
  const font = g.thumbFont || '';
  const thread = (v) => (v ? String(v).replace(/^\d+\.\s*/, '') : '');
  const padOn = g.pad && g.pad !== 'None';
  const row = {
    no, po: '',
    reference: o.name || '',
    pattern: SHEET_FIXED.pattern,
    size: String(g.size || '').replace(/"$/, ''),
    qtyRHT: g.hand === 'RHT' ? 1 : '',
    qtyLHT: g.hand === 'LHT' ? 1 : '',
    pad: g.pad || '',
    padColor: padOn ? (c.pad_color || '10.White') : '',
    web: String(g.webType || '').replace(/-Web$/, ' WEB'),
    palm: c.palm || '', webColor: c.web || '',
    back1: c.back1 || '', back2: c.back2 || '', back3: c.back3 || '',
    back4: c.back4 || '', back5: c.back5 || '', back6: c.back6 || '',
    back7: c.back7 || '', back8: c.back8 || '', back9: c.back9 || '',
    thumbLoops: c.thumb_loops || '', pinkyLoops: c.pinky_loops || '',
    belt: c.belt || '', lining: c.lining || '',
    weltingType: '', welting: c.welting || '',
    laces: c.laces || '', binding: c.binding || '', stitching: c.stitching || '',
    ringEmb: c.ring_emb ? 'SSK' : '', ringEmbColor: c.ring_emb || '',
    backStyle: SHEET_FIXED.backStyle,
    bullet: g.bullet || '',
    palmLogoCenter: '', palmLogoHeel: '',
    thumbText: g.thumbText || '',
    thumbFont: g.thumbText ? font : '',
    thumbMain: g.thumbText ? (g.thumbMain || '') : '',
    thumbOutline: g.thumbText && /Outline|Shadow/.test(font) ? (g.thumbOutline || '') : '',
    thumbNumber: g.thumbNumber || '',
    circle: g.thumbNumber ? (g.circle || '') : '',
    numberColor: g.thumbNumber ? (g.numberColor || '') : '',
    bulletEmb: '', bulletEmbColor: '',
    patternNote: '',
    embroideryNote: g.pinkyText
      ? `Please Embroider on Pinky ${g.pinkyText} in ${[font, thread(g.thumbMain)].filter(Boolean).join(' ')}`.trim()
      : '',
    flagNote: !g.flag || g.flag === 'None' ? ''
      : g.flag === 'Other Flag' ? 'Please add flag to index finger (flag to be confirmed with the customer)'
      : `Please add ${g.flag} Flag to index finger`,
    orderNumber: o.orderNumber || '',
    gloveNo: no,
    code: g.code || '',
    phone: o.phone || '', email: o.email || '',
  };
  return row;
}

/* The three header rows and one value row per glove, as arrays of cells in
   column order: what a workbook or a CSV is written from. */
export function sheetTable(gloves, o) {
  const cols = SHEET_COLUMNS;
  const header = ['h1', 'h2', 'h3'].map((h) => cols.map((col) => col[h] || ''));
  const rows = gloves.map((g, i) => {
    const r = sheetRow(g, o, i + 1);
    return cols.map((col) => r[col.key] ?? '');
  });
  return { header, rows };
}

/* Order numbers: what the customer types into the shop's checkout so Pim can
   match the payment to the e-mailed sheet. "SSK-" + date + 4 characters
   from an alphabet without I and O (read aloud on the phone) + one Luhn
   check character, so a typo in the shop is caught rather than matched to
   the wrong order. */
export const ORDER_ALPHA = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function orderCheck(body) {
  const n = ORDER_ALPHA.length;
  let factor = 2, sum = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    const a = factor * ORDER_ALPHA.indexOf(body[i]);
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(a / n) + (a % n);
  }
  return ORDER_ALPHA[(n - (sum % n)) % n];
}
/** `random` gives 4 characters of ORDER_ALPHA; `date` is a Date (UTC). */
export function makeOrderNumber(date, random) {
  const d = date.toISOString().slice(2, 10).replace(/-/g, '');
  const body = d + String(random).toUpperCase();
  if (!/^\d{6}[0-9A-HJ-NP-Z]{4}$/.test(body)) throw new Error('order number: bad body');
  return `SSK-${d}-${body.slice(6)}${orderCheck(body)}`;
}
export function isOrderNumber(s) {
  const m = /^\s*SSK-?(\d{6})-?([0-9A-HJ-NP-Z]{4})([0-9A-HJ-NP-Z])\s*$/i.exec(String(s).toUpperCase());
  return !!m && orderCheck(m[1] + m[2]) === m[3];
}

/* Limits both sides enforce, so a request that breaks them is refused
   before anything is built from it. */
export const LIMITS = {
  gloves: 5,             // per order; the shop's quantity field carries the same number
  text: 120,             // any free-text field
  specLines: 80,         // spec rows per glove
  image: 400 * 1024,     // one JPEG of the glove, in bytes of base64
};
