/* Reference codes: the whole order in a string a customer can read out.

   Version 2 ("SSK2-…") encodes the order form's own answers, not the render.
   The first code ("SSK-…") packed the colours of the back view's render
   zones and the badge. That tied it to things that have nothing to do with
   an order: switching to the palm view changed the code, and a rebuild that
   moved the thumb loops' last pixels into the laces dropped a zone and made
   every older code decode one zone out of step. It also left out the hand,
   size, pad, web, flag and thumb options, so a code never described a glove.

   Every table below is FROZEN and APPEND-ONLY. A code stores positions in
   these tables, so reordering or removing an entry silently changes what
   every issued code means. New options go at the end; retired ones stay.
   Free text (names, phone, embroidery wording) is not in the code: it is
   personal, and it is on the order sheet the code travels with.            */

const RC_V2 = {
  colours: ['web', 'back1', 'back2', 'back3', 'back4', 'back5', 'back6',
    'back7', 'back8', 'back9', 'palm', 'belt', 'lining', 'binding', 'welting',
    'laces', 'thumb_loops', 'pinky_loops', 'stitching', 'ring_emb', 'pad_color'],
  // SSK's colour codes per palette. The codes are the specification; there
  // are no hex values behind them (README), so this is what an order is.
  palettes: {
    leather: ['10', '12', '20', '25', '32', '33', '35', '37', '40', '41', '43',
      '44', '45', '46', '48', '49', '50', '51', '52', '55', '60', '65', '70',
      '71', '75', '80', '90', '93'],
    lace: ['10', '12', '20', '25', '32', '33', '35', '37', '40', '41', '43',
      '44', '45', '46', '48', '49', '50', '51', '52', '55', '60', '65', '70',
      '71', '75', '80', '90', '93', 'GF'],
    stitching: ['10', '12', '20', '25', '35', '40', '45', '51', '60', '70',
      '75', '80', '90', '93'],
    embroidery: ['10', '12', '20', '25', '33', '34', '35', '37', '39', '40',
      '42', '43', '44', '45', '48', '49', '50', '51', '52', '60', '70', '75',
      '80', '90', '95'],
  },
  hand: ['RHT', 'LHT'],
  size: ['11.5"', '11.75"', '12"', '12.25"', '12.5"', '12.75"'],
  pad: ['None', 'Finger Pad', 'Finger Hood'],
  webType: ['Spiral I-Web', 'Standard I-Web', 'SMS-Web', 'SMK-Web', 'H-Web',
    'SMLEE-Web', 'Modified Trapeze-Web', 'Basket-Web', 'Em Rocket-Web',
    'Sasaki 1-Web', 'Sasaki 2-Web', 'Closed Diamond Net-Web', 'Trapeze-Web'],
  // By name, so a badge keeps its identity whatever slot it sits in today.
  // The two Silicone patches were never orderable; they keep their places.
  bullet: ['Edge Gold', 'Edge Silver', 'Edge Gun Metal', 'Silicone Gold',
    'Silicone Silver', 'Red/Green', 'Rainbow', 'Black/Gold', 'Black/Pink',
    'Black/Purple', 'Black/Silver', 'Green/Gold', 'Winered/Gold', 'Blue/Gold',
    'Navy/Gold', 'White/Gold', 'Red/Gold'],
  flag: ['None', 'Netherlands', 'Belgium', 'Germany', 'Italy',
    'United States', 'Japan', 'Curaçao', 'Aruba', 'Sint Maarten', 'Other Flag'],
  circle: ['Black', 'Navy', 'Yellow', 'Red', 'Blue', 'White'],
  thumbFont: ['Block', 'Script', 'Brush', 'Kanji', 'Block with Outline',
    'Script with Outline', 'Brush with Outline', 'Kanji with Outline',
    'Block with Shadow', 'Script with Shadow', 'Brush with Shadow',
    'Kanji with Shadow'],
};
const RC_PALETTE_OF = (f) =>
  f === 'stitching' ? 'stitching' :
  f === 'ring_emb' ? 'embroidery' :
  (f === 'binding' || f === 'welting' || f === 'laces') ? 'lace' : 'leather';
const RC_SCALARS = ['hand', 'size', 'pad', 'webType', 'bullet', 'flag', 'circle',
  'thumbFont'];
const RC_EMB_FIELDS = ['thumbMain', 'thumbOutline', 'numberColor'];

/* Every slot in writing order: [key, table]. Value 0 = unanswered, n = the
   table's entry n-1, so a slot holds table.length + 1 values. */
const RC_SLOTS = [
  ...RC_V2.colours.map((f) => [f, RC_V2.palettes[RC_PALETTE_OF(f)], 'colour']),
  ...RC_SCALARS.map((k) => [k, RC_V2[k], 'scalar']),
  ...RC_EMB_FIELDS.map((k) => [k, RC_V2.palettes.embroidery, 'scalar']),
];
const RC_ALPHA = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // no I or O: read aloud
const RC_B = BigInt(RC_ALPHA.length);

// Luhn mod N over the code alphabet: catches every single mistyped character
// and most swapped neighbours, for any alphabet size. (A plain weighted sum
// mod 34 does not: a weight sharing a factor with 34 lets typos through.)
function rcCheck(body) {
  const n = RC_ALPHA.length;
  let factor = 2, sum = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    let a = factor * RC_ALPHA.indexOf(body[i]);
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(a / n) + (a % n);
  }
  return RC_ALPHA[(n - (sum % n)) % n];
}

/** The order as a code. `bulletName` is the chosen badge's name, or null. */
export function encodeV2(S, bulletName) {
  let n = 0n;
  for (const [key, table, kind] of RC_SLOTS) {
    const v = kind === 'colour' ? (S.colors || {})[key]
      : key === 'bullet' ? bulletName : S[key];
    const i = v == null ? -1 : table.indexOf(v);
    n = n * BigInt(table.length + 1) + BigInt(i + 1);
  }
  let body = '';
  do { body = RC_ALPHA[Number(n % RC_B)] + body; n /= RC_B; } while (n > 0n);
  body += rcCheck(body);
  return 'SSK2-' + body.match(/.{1,4}/g).join('-');
}

/** A code back into answers: {colors, hand, size, …, bulletName}, or null
    when it is not a version-2 code or its check character is wrong. */
export function decodeV2(code) {
  const s = String(code).toUpperCase().trim().replace(/^#?SSK2-?/, '')
    .replace(/[\s-]/g, '');
  if (s.length < 2 || [...s].some((ch) => RC_ALPHA.indexOf(ch) < 0)) return null;
  const body = s.slice(0, -1);
  if (rcCheck(body) !== s.slice(-1)) return null;
  let n = 0n;
  for (const ch of body) n = n * RC_B + BigInt(RC_ALPHA.indexOf(ch));
  const out = { colors: {} };
  for (const [key, table, kind] of [...RC_SLOTS].reverse()) {
    const r = BigInt(table.length + 1);
    const i = Number(n % r); n /= r;
    const v = i === 0 ? null : table[i - 1];
    if (kind === 'colour') { if (v) out.colors[key] = v; }
    else if (key === 'bullet') out.bulletName = v;
    else out[key] = v;
  }
  if (n !== 0n) return null;          // more digits than a code can hold
  return out;
}

export const isV2 = (code) => /^\s*#?SSK2-?/i.test(String(code));

/* Version 1, decode only. Every "SSK-…" code issued before 23 Sep 2026 was
   packed against this zone list (read off the build of that time: the only
   layout the assets had from 25 Jul to 23 Sep). The palettes above are
   byte-for-byte the ones it used. A handful of codes minted in the preview on
   23 Sep used a 15-zone list without thumb_loops; they cannot be told apart
   and will decode one zone out, which the paste field cannot detect. */
const RC_V1_ZONES = [['back2', 'leather'], ['back78', 'leather'],
  ['back6', 'leather'], ['back5', 'leather'], ['back4', 'leather'],
  ['back3', 'leather'], ['web', 'leather'], ['belt', 'leather'],
  ['lining', 'leather'], ['binding', 'lace'], ['welting', 'lace'],
  ['thumb_loops', 'leather'], ['pinky_loops', 'leather'], ['laces', 'lace'],
  ['embroidery', 'embroidery'], ['stitching', 'stitching']];
const RC_V1_BULLETS = ['Edge Gold', 'Edge Silver', 'Edge Gun Metal',
  'Silicone Gold', 'Silicone Silver', 'Red/Green', 'Rainbow', 'Black/Gold',
  'Black/Pink', 'Black/Purple', 'Black/Silver', 'Green/Gold', 'Winered/Gold',
  'Blue/Gold', 'Navy/Gold'];
// render zone -> order field, as the back view mapped them
const RC_V1_FIELD = { back78: 'back7', embroidery: 'ring_emb' };

/** An old "SSK-…" code: colours by field, and the badge by name. */
export function decodeV1(code) {
  const s = String(code).toUpperCase().trim().replace(/^#?SSK-?/, '')
    .replace(/[\s-]/g, '');
  if (!/^[0-9A-Z]{1,20}$/.test(s)) return null;
  let bits = 0n;
  for (const ch of s) bits = bits * 36n + BigInt(parseInt(ch, 36));
  const bullet = Number(bits & 15n);
  bits >>= 4n;
  const colors = {};
  for (const [zone, group] of [...RC_V1_ZONES].reverse()) {
    const c = RC_V2.palettes[group][Number(bits & 31n)];
    bits >>= 5n;
    if (c) colors[RC_V1_FIELD[zone] || zone] = c;
  }
  return { colors, bulletName: RC_V1_BULLETS[bullet] ?? null };
}
