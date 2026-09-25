/* Does a finished order reach SSK Europe the way Pim works with it?

     NODE_PATH=<dir holding playwright> PW_CHROMIUM=<chrome> \
       node glove_builder/order_check.mjs

   Two halves. The page half drives the real configurator in Chromium with
   the order endpoint intercepted: build a glove, add a second, send, and
   read back what was posted and what the customer is told. The endpoint
   half feeds that same request to api/order.mjs in dry mode and checks the
   mails and the workbook it would send: Pim's three header rows, one row
   per glove, colours as "70.Navy", the order number with its check
   character, and the refusals (no gloves, bad code, honeypot).

   Exit 0 pass, 1 fail, 3 when Playwright is unavailable (not a pass). */

import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { EventEmitter } from 'node:events';
import { inflateRawSync } from 'node:zlib';
import { tmpdir } from 'node:os';

const pwFrom = (process.env.NODE_PATH ?? '').split(':').filter(Boolean)
  .map(d => join(d, 'playwright/index.mjs')).find(existsSync);
let chromium;
try {
  ({ chromium } = await import(pwFrom ?? 'playwright'));
} catch {
  console.log('SKIP  Playwright not found (set NODE_PATH); nothing was checked');
  process.exit(3);
}

const ROOT = join(new URL('./', import.meta.url).pathname, 'customiser/');
const PORT = Number(process.env.PORT ?? 8836);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  let path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^\/+/, '');
  if (!path) path = 'index.html';
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT);

let failures = 0;
const fail = m => { console.log(`FAIL  ${m}`); failures++; };
const ok = m => console.log(`ok    ${m}`);
const check = (cond, what, detail = '') => (cond ? ok(what) : fail(`${what}${detail ? ' — ' + detail : ''}`));

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM
  ?? '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const BASE = `http://127.0.0.1:${PORT}/`;
// The page links a web font; a sandbox without egress stalls minutes on it.
await ctx.route('**', (route) =>
  route.request().url().startsWith(BASE) ? route.continue() : route.abort());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

const COLORS = { web: '70', back1: '70', back2: '32', back3: '70', back4: '70',
  back5: '70', back6: '70', back7: '70', back8: '70', back9: '32', palm: '70',
  belt: '32', lining: '70', binding: '45', welting: '45', laces: '45',
  stitching: '45', ring_emb: '39', thumb_loops: '45', pinky_loops: '45', pad_color: '35' };
const GLOVE_A = { hand: 'RHT', size: '11.75"', pad: 'Finger Pad', webType: 'Spiral I-Web',
  bullet: 0, colors: COLORS, thumbText: 'Scott Prins', thumbFont: 'Brush', thumbMain: '39',
  thumbNumber: 'MP', circle: 'Navy', numberColor: '39', pinkyText: 'Modern Pitching',
  flag: 'Netherlands', name: 'Scott Prins', phone: '0612345678', email: 'scott@example.com',
  lang: 'nl', step: 7, personalCheck: false };

const setDraft = (patch) => page.evaluate((patch) => {
  const o = JSON.parse(localStorage.getItem('ssk-glove-v1') || '{}');
  localStorage.setItem('ssk-glove-v1', JSON.stringify({ ...o, ...patch }));
}, patch);
const reload = async () => {
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('#steps .step').length === 8);
  await page.waitForTimeout(700);
};

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1200);
await setDraft(GLOVE_A);
await reload();
// The draft restores on step 0; go to the review step.
await page.evaluate(() => document.querySelectorAll('#steps .step')[7].click());
await page.waitForTimeout(600);

const rows = () => page.evaluate(() => [...document.querySelectorAll('#body .gloves .glove-row')].map(r => r.textContent));
check((await rows()).length === 1, 'the review step lists the glove on the stage as glove 1 of 1');
check(await page.evaluate(() => !document.querySelector('#body [data-key="addGlove"]').disabled),
  'a complete glove can be added to the order');

// ---- a second glove
await page.click('#body [data-key="addGlove"]');
await page.waitForTimeout(600);
const afterAdd = await page.evaluate(() => ({
  cart: JSON.parse(localStorage.getItem('ssk-glove-cart-v1') || '[]').length,
  step: document.querySelector('#steps .step.is-on .n').textContent,
  draft: JSON.parse(localStorage.getItem('ssk-glove-v1') || '{}'),
}));
check(afterAdd.cart === 1, 'the finished glove waits in the order', String(afterAdd.cart));
check(afterAdd.step === '1', 'a new glove starts at step 1', afterAdd.step);
check(afterAdd.draft.hand === null && afterAdd.draft.thumbText === '' && afterAdd.draft.name === 'Scott Prins',
  'the new glove asks fit and lettering again and keeps the buyer', JSON.stringify([afterAdd.draft.hand, afterAdd.draft.thumbText, afterAdd.draft.name]));

const GLOVE_B = { ...GLOVE_A, hand: 'LHT', size: '12"', webType: 'H-Web', thumbText: 'Lars',
  thumbNumber: '', pinkyText: '', flag: 'None', colors: { ...COLORS, web: '90', back1: '90' } };
await setDraft(GLOVE_B);
await reload();
await page.evaluate(() => document.querySelectorAll('#steps .step')[7].click());
await page.waitForTimeout(600);
const two = await rows();
check(two.length === 2 && /Handschoen 1/.test(two[0]) && /op het podium/.test(two[1]),
  'the review step lists the waiting glove and the one on the stage', two.map(s => s.slice(0, 40)).join(' | '));
check(await page.evaluate(() => JSON.parse(localStorage.getItem('ssk-glove-cart-v1')).length === 1),
  'the waiting glove survives a reload');

// ---- send: the endpoint is intercepted and answered like the real one
let posted = null;
await page.route('**/api/order', async (route) => {
  posted = JSON.parse(route.request().postData());
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, orderNumber: 'SSK-260925-7K3QM', gloves: posted.gloves.length }) });
});
await page.click('#next');                          // "Controleren & bestellen"
await page.waitForFunction(() => !document.getElementById('scrim').hidden);
check(await page.evaluate(() => !document.getElementById('send').disabled), 'a complete order can be sent');
await page.click('#send');
await page.waitForFunction(() => !document.getElementById('orderdone').hidden, null, { timeout: 15000 });

check(!!posted && posted.gloves.length === 2, 'one request carries both gloves', JSON.stringify(posted && posted.gloves.length));
if (posted) {
  const [a, b] = posted.gloves;
  check(a.code !== b.code && /^SSK2-/.test(a.code) && /^SSK2-/.test(b.code), 'each glove has its own design code');
  check(a.image !== b.image, 'each glove is drawn as itself, not as the one on the stage');
  check(a.design.colours.web === '70.Navy' && b.design.colours.web === '90.Black' && a.design.colours.pad_color === '35.Orange',
    'colours are sent as SSK writes them, code dot name', JSON.stringify([a.design.colours.web, b.design.colours.web]));
  check(a.design.hand === 'RHT' && b.design.hand === 'LHT' && a.design.bullet === 'Edge Gold',
    'hand, size and badge travel by name');
  check(a.design.thumbText === 'Scott Prins' && a.design.pinkyText === 'Modern Pitching' && a.design.thumbMain === '39.Gold',
    'the lettering and its thread travel with the glove');
  check(posted.contact.email === 'scott@example.com' && posted.contact.name === 'Scott Prins', 'the buyer is on the order, not on a glove');
  const jpeg = g => /^data:image\/jpeg;base64,/.test(g.image) && g.image.length < 400 * 1024;
  check(jpeg(a) && jpeg(b), 'each glove comes with a JPEG under the size limit', `${a.image.length} / ${b.image.length}`);
  check(a.spec.length > 20 && a.spec.some(([k, v]) => v === 'Spiral I-Web'), 'the specification rows are included');
}
const done = await page.evaluate(() => ({
  num: document.getElementById('ordernum').textContent,
  step2: document.getElementById('paystep2').textContent,
  step3: document.getElementById('paystep3').textContent,
  href: document.getElementById('checkout').getAttribute('href'),
  cart: JSON.parse(localStorage.getItem('ssk-glove-cart-v1') || '[]').length,
}));
check(done.num === 'SSK-260925-7K3QM', 'the customer sees the order number', done.num);
check(/2/.test(done.step2) && done.step3.includes('SSK-260925-7K3QM'), 'the pay steps carry the quantity and the number', done.step2 + ' / ' + done.step3);
check(/sskeurope\.ccvshop\.nl/.test(done.href), 'the pay button goes to the SSK Europe shop', done.href);
check(done.cart === 0, 'the order leaves the page once it is sent');

// ---- not configured: the page says so and keeps the copy path
await page.unroute('**/api/order');
await page.route('**/api/order', route => route.fulfill({ status: 503, contentType: 'application/json',
  body: JSON.stringify({ ok: false, error: 'not-configured' }) }));
await page.click('#keep2');
await page.click('#next');
await page.waitForFunction(() => !document.getElementById('scrim').hidden);
await page.click('#send');
await page.waitForFunction(() => document.getElementById('sendnote').textContent.length > 0);
const note = await page.evaluate(() => document.getElementById('sendnote').textContent);
check(/nog niet aan/.test(note), 'without a configured endpoint the page says ordering by e-mail is off', note);
check(await page.evaluate(() => !document.getElementById('send').disabled), 'and sending can be retried');

// ---- no e-mail: no sending
await page.click('#keep');
await setDraft({ email: 'not-an-address' });
await reload();
await page.evaluate(() => document.querySelectorAll('#steps .step')[7].click());
await page.click('#next');
await page.waitForFunction(() => !document.getElementById('scrim').hidden);
check(await page.evaluate(() => document.getElementById('send').disabled), 'an order without a valid e-mail address cannot be sent');
check(await page.evaluate(() => !!document.querySelectorAll('#steps .step')[6].querySelector('.dot.todo')),
  'the details step asks for the e-mail address');

check(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '));
await browser.close();
server.close();

/* ---------------------------------------------------------- the endpoint */
process.env.ORDER_TRANSPORT = 'dry';
process.env.CHECKOUT_URL = 'https://sskeurope.ccvshop.nl/SSK-Custom-Gloves';
const { default: handler } = await import('../api/order.mjs');
const { isOrderNumber, SHEET_COLUMNS } = await import('./customiser/order-sheet.js');
let ipN = 0;
// A fresh address per call, so the rate limit only bites where it is tested.
function call(body, method = 'POST', ip = null) {
  ip = ip || `10.0.${Math.floor(++ipN / 250)}.${ipN % 250}`;
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method; req.headers = { origin: 'https://sskeurope.ccvshop.nl', 'x-forwarded-for': ip }; req.socket = {};
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; },
      end(s) { resolve({ status: this.statusCode, headers: this.headers, body: s ? JSON.parse(s) : null }); } };
    handler(req, res);
    if (method === 'POST') process.nextTick(() => { req.emit('data', Buffer.from(JSON.stringify(body))); req.emit('end'); });
  });
}
if (posted) {
  const r = await call(posted);
  check(r.status === 200 && r.body.ok && r.body.gloves === 2, 'the endpoint accepts what the page posts', JSON.stringify(r.body).slice(0, 120));
  check(isOrderNumber(r.body.orderNumber) && /^SSK-\d{6}-[0-9A-HJ-NP-Z]{5}$/.test(r.body.orderNumber),
    'the order number has a date, four characters and a check character', r.body.orderNumber);
  const bad = r.body.orderNumber.slice(0, -1) + (r.body.orderNumber.endsWith('0') ? '1' : '0');
  check(!isOrderNumber(bad), 'a mistyped order number is refused', bad);
  check(r.headers['access-control-allow-origin'] === '*', 'the shop\'s embedded page may post here');
  const { pim, customer } = r.body.mails;
  check(pim.attachments.length === 3 && /\.xlsx$/.test(pim.attachments[0].filename)
    && pim.attachments.slice(1).every(a => /\.jpg$/.test(a.filename)), 'Pim gets the workbook and one picture per glove',
    pim.attachments.map(a => a.filename).join(', '));
  check(pim.reply_to === 'scott@example.com' && customer.to[0] === 'scott@example.com',
    'replies go to the buyer and the buyer gets a copy');
  check(customer.text.includes(r.body.orderNumber) && customer.text.includes('aantal op 2') && customer.text.includes('sskeurope.ccvshop.nl'),
    'the buyer\'s copy says how to pay: the number, the quantity, the shop');
  check(pim.text.includes(posted.gloves[0].code) && pim.text.includes(posted.gloves[1].code) && pim.text.includes('Modern Pitching'),
    'Pim\'s mail carries both design codes and the lettering');

  // The workbook: unzip the sheet and read the cells back.
  const zip = Buffer.from(pim.attachments[0].content, 'base64');
  const out = join(tmpdir(), `ssk-order-check.xlsx`);
  writeFileSync(out, zip);
  const entries = {};
  for (let p = 0; p + 30 <= zip.length && zip.readUInt32LE(p) === 0x04034b50;) {
    const nameLen = zip.readUInt16LE(p + 26), extraLen = zip.readUInt16LE(p + 28);
    const compLen = zip.readUInt32LE(p + 18);
    const name = zip.toString('utf8', p + 30, p + 30 + nameLen);
    const data = zip.subarray(p + 30 + nameLen + extraLen, p + 30 + nameLen + extraLen + compLen);
    entries[name] = inflateRawSync(data).toString('utf8');
    p += 30 + nameLen + extraLen + compLen;
  }
  const sheet = entries['xl/worksheets/sheet1.xml'] || '';
  const cells = [...sheet.matchAll(/<c r="([A-Z]+)(\d+)"(?: t="inlineStr")?>(?:<v>([^<]*)<\/v>|<is><t[^>]*>([^<]*)<\/t><\/is>)<\/c>/g)]
    .map(m => [m[1], +m[2], m[3] ?? m[4]]);
  const cell = (col, row) => (cells.find(c => c[0] === col && c[1] === row) || [])[2];
  check(Object.keys(entries).length === 5 && sheet.includes('<sheetData>'), 'the attachment is a workbook with one sheet');
  check(cell('A', 1) === 'No' && cell('C', 1) === 'REFERENCE＃' && cell('K', 1) === 'Color' && cell('AV', 1) === 'Flags',
    'row 1 carries Pim\'s group headers in his columns', [cell('A', 1), cell('C', 1), cell('K', 1), cell('AV', 1)].join(' | '));
  check(cell('F', 2) === 'RHT' && cell('G', 2) === 'LHT' && cell('Z', 2) === '⑰Welting' && cell('AH', 2) === '㉒',
    'row 2 carries his sub-headers');
  check(cell('K', 3) === 'Palm' && cell('U', 3) === 'Back9' && cell('AD', 3) === 'Stitching' && cell('AQ', 3) === 'Embroidery Color',
    'row 3 carries his column names');
  check(cell('A', 4) === '1' && cell('A', 5) === '2' && cell('C', 4) === 'Scott Prins' && cell('D', 4) === 'AP1',
    'one row per glove, numbered, with the buyer as reference', [cell('A', 4), cell('A', 5), cell('C', 4)].join(' | '));
  check(cell('E', 4) === '11.75' && cell('F', 4) === '1' && cell('G', 4) === undefined && cell('G', 5) === '1' && cell('F', 5) === undefined,
    'size without the inch sign, quantity under RHT or LHT', [cell('E', 4), cell('F', 4), cell('G', 4), cell('F', 5), cell('G', 5)].join(' | '));
  check(cell('J', 4) === 'Spiral I WEB' && cell('K', 4) === '70.Navy' && cell('L', 5) === '90.Black' && cell('I', 4) === '35.Orange',
    'web and colours as Pim writes them', [cell('J', 4), cell('K', 4), cell('L', 5), cell('I', 4)].join(' | '));
  check(cell('AK', 4) === 'Scott Prins' && cell('AL', 4) === 'Brush' && cell('AM', 4) === '39.Gold' && cell('AO', 4) === 'MP' && cell('AP', 4) === 'Navy',
    'thumb lettering, font, thread, number and circle land in their columns');
  check(cell('AU', 4) === 'Please Embroider on Pinky Modern Pitching in Brush Gold' && cell('AV', 4) === 'Please add Netherlands Flag to index finger',
    'pinky text and flag become Pim\'s request sentences', [cell('AU', 4), cell('AV', 4)].join(' | '));
  check(cell('AU', 5) === undefined && cell('AV', 5) === undefined && cell('AO', 5) === undefined,
    'a glove without pinky text, flag or number leaves those cells empty');
  check(cell('AG', 4) === 'Conventional' && cell('AT', 4) === undefined && cell('Z', 4) === undefined,
    'back style is filled; welting type and emboss are left to Pim');
  const oc = SHEET_COLUMNS.findIndex(c => c.key === 'orderNumber');
  check(cell(colName(oc), 4) === r.body.orderNumber && cell(colName(oc + 2), 4) === posted.gloves[0].code,
    'the order number and design code are appended after his last column');
  ok(`workbook written to ${out}`);
}
function colName(i) { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; }

const base = posted || { lang: 'nl', contact: { name: 'A', phone: '1', email: 'a@b.co' }, gloves: [] };
check((await call({ ...base, gloves: [] })).body.error === 'no-gloves', 'an order without gloves is refused');
check((await call({ ...base, website: 'x' })).status === 403, 'the honeypot refuses a bot');
check((await call({ ...base, contact: { ...base.contact, email: 'nope' } })).body.error === 'email', 'a bad e-mail address is refused');
if (posted) {
  const g = posted.gloves[0];
  check((await call({ ...base, gloves: [{ ...g, code: g.code.slice(0, -1) + (g.code.endsWith('0') ? '1' : '0') }] })).body.error === 'code',
    'a design code with a wrong check character is refused');
  check((await call({ ...base, gloves: Array(6).fill(g) })).body.error === 'too-many', 'more than five gloves is refused');
  check((await call({ ...base, gloves: [{ ...g, image: 'data:image/png;base64,AAAA' }] })).body.error === 'image', 'only a JPEG is accepted as the picture');
}
check((await call(base, 'GET')).status === 405, 'only POST is served');
delete process.env.ORDER_TRANSPORT;
check((await call(base)).status === 503 && (await call(base)).body.error === 'not-configured',
  'without mail settings the endpoint says it is not configured');
let limited = 0;
process.env.ORDER_TRANSPORT = 'dry';
for (let i = 0; i < 8; i++) if ((await call(base, 'POST', '10.9.9.9')).status === 429) limited++;
check(limited > 0, 'a burst from one address is rate limited', String(limited));

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
