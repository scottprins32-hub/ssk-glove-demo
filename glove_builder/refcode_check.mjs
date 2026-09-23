/* Do reference codes mean what they meant when they were issued?

     node glove_builder/refcode_check.mjs

   No browser needed. Two things are checked:
   - every old "SSK-" code in refcode_v1_fixtures.json (made by the retired
     encoder, against the layout those codes were issued with) decodes to
     exactly the colours and badge it was made from;
   - a new "SSK2-" code round-trips every answer it covers, at the edges of
     every table, and refuses a mistyped character.                        */

import { readFileSync } from 'node:fs';
import { encodeV2, decodeV2, decodeV1 } from './customiser/refcode.js';

let failures = 0;
const check = (ok, what, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? '  — ' + detail : ''}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const { cases } = JSON.parse(readFileSync(
  new URL('./refcode_v1_fixtures.json', import.meta.url)));
let v1bad = 0;
for (const c of cases) {
  const d = decodeV1(c.code);
  const keys = Object.keys(c.colors).sort();
  if (!d || !same(keys.map((k) => d.colors[k]), keys.map((k) => c.colors[k]))
      || d.bulletName !== c.bulletName) v1bad += 1;
}
check(v1bad === 0, `${cases.length} issued SSK- codes decode as they were made`,
  v1bad ? `${v1bad} differ` : '');

const orders = [
  { colors: {} },
  { colors: { web: '10', back1: '10', laces: 'GF', stitching: '93',
              ring_emb: '95', pad_color: '93' },
    hand: 'LHT', size: '12.75"', pad: 'Finger Hood', webType: 'Trapeze-Web',
    flag: 'Other Flag', circle: 'White', thumbFont: 'Kanji with Shadow',
    thumbMain: '95', thumbOutline: '10', numberColor: '90', bulletName: 'Red/Gold' },
  { colors: { web: '35', belt: '90', binding: '10' }, hand: 'RHT', size: '11.5"',
    pad: 'None', webType: 'Spiral I-Web', flag: 'None', circle: 'Black',
    thumbFont: 'Block', thumbMain: '10', thumbOutline: null, numberColor: null,
    bulletName: 'Edge Gold' },
];
for (const [i, o] of orders.entries()) {
  const code = encodeV2(o, o.bulletName ?? null);
  const d = decodeV2(code);
  const keys = ['hand', 'size', 'pad', 'webType', 'flag', 'circle', 'thumbFont',
    'thumbMain', 'thumbOutline', 'numberColor'];
  const ok = d && same(Object.keys(d.colors).sort().map((k) => d.colors[k]),
                       Object.keys(o.colors).sort().map((k) => o.colors[k]))
    && keys.every((k) => (d[k] ?? null) === (o[k] ?? null))
    && (d.bulletName ?? null) === (o.bulletName ?? null);
  check(ok, `SSK2 order ${i + 1} round-trips`, code);
  let refused = 0, tries = 0;
  const body = code.replace(/^SSK2-/, '').replace(/-/g, '');
  for (let p = 0; p < body.length; p++) {
    for (const ch of '0Z') {
      if (body[p] === ch) continue;
      tries += 1;
      if (decodeV2('SSK2-' + body.slice(0, p) + ch + body.slice(p + 1)) === null) refused += 1;
    }
  }
  check(refused === tries, `SSK2 order ${i + 1}: every single-character typo is refused`,
    `${refused}/${tries}`);
}
check(decodeV2('SSK-0000-0000') === null, 'an old code is not read as a new one');
let threw = null;
for (const junk of ['', 'SSK2-', 'SSK-', 'hello', 'SSK2-!!!!', 'SSK-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-Z']) {
  try { decodeV1(junk); decodeV2(junk); } catch (e) { threw = `${junk}: ${e}`; }
}
check(threw === null, 'junk input is refused, never thrown on', threw || '');

console.log(failures ? `\n${failures} check(s) failed` : '\nreference codes keep their meaning');
process.exit(failures ? 1 : 0);
