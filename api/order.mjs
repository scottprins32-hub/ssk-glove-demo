/* POST /api/order — one finished order, from the configurator to Pim.

   The page sends the gloves of one order (one to five) with their design
   codes, the resolved specification, the sheet row values and a JPEG of
   each. This function:

     1. checks the request against the same limits the page uses, and
        re-verifies every design code's check character;
     2. gives the order a number the customer can type into the shop
        ("SSK-260925-7K3QM": date, four characters, one check character);
     3. writes Pim's order sheet — his workbook layout, one row per glove —
        and e-mails it to SSK Europe with the specification and the images;
     4. e-mails the customer the same number with the instruction to pay in
        the shop, quantity = number of gloves, order number in the field;
     5. returns the number. Nothing is stored anywhere: the e-mail is the
        record, and the shop's own order (with the number in it) is the
        payment.

   Configuration (Vercel project environment variables):
     RESEND_API_KEY   key from resend.com (the sender)
     ORDER_TO         Pim's address, where orders go
     ORDER_FROM       a sender on a domain verified in Resend,
                      e.g. "SSK Europe configurator <orders@sskeurope.nl>"
     ORDER_CC         optional, extra recipients (comma separated)
     ORDER_ORIGINS    optional, allowed page origins (comma separated);
                      default "*" so the single-file bundle inside the CCV
                      shop can post here too
     CHECKOUT_URL     optional, the shop page to pay on; goes in the
                      customer's mail
     ORDER_TRANSPORT  "dry" returns the mails instead of sending them
                      (the check uses this); anything else sends.

   Without RESEND_API_KEY and ORDER_TO the endpoint answers 503
   "not-configured" and the page falls back to copying the specification. */

import { randomBytes } from 'node:crypto';
import { sheetTable, makeOrderNumber, ORDER_ALPHA, LIMITS, SHEET_COLUMNS }
  from '../glove_builder/customiser/order-sheet.js';
import { decodeV2, isV2 } from '../glove_builder/customiser/refcode.js';
import { workbook } from '../glove_builder/order/xlsx.mjs';

export const config = { maxDuration: 30 };

const MAX_BODY = 3 * 1024 * 1024;
const RESEND = 'https://api.resend.com/emails';

/* A leaky bucket per address, in this instance's memory. Not a guarantee
   (a function instance is not forever) but it stops one browser from
   filling Pim's inbox in a loop. */
const bucket = new Map();
function allow(ip) {
  const now = Date.now();
  const b = bucket.get(ip) || { n: 0, t: now };
  b.n = Math.max(0, b.n - (now - b.t) / 20000);   // one order every 20 s refills
  b.t = now;
  if (b.n >= 5) return false;
  b.n += 1; bucket.set(ip, b);
  if (bucket.size > 5000) bucket.clear();
  return true;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) reject(new Error('too-large')); else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('bad-json')); } });
    req.on('error', reject);
  });
}

/* The request, checked field by field. Returns {order, gloves} or a
   string naming what is wrong. */
export function validate(body) {
  if (!body || typeof body !== 'object') return 'bad-json';
  if (str(body.website, 10)) return 'refused';          // honeypot field
  const lang = body.lang === 'en' ? 'en' : 'nl';
  const c = body.contact || {};
  const order = {
    name: str(c.name, 60), phone: str(c.phone, 24), email: str(c.email, 120), lang,
  };
  if (!order.name || !order.phone) return 'contact';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) return 'email';
  if (!Array.isArray(body.gloves) || !body.gloves.length) return 'no-gloves';
  if (body.gloves.length > LIMITS.gloves) return 'too-many';
  const gloves = [];
  const keys = new Set(SHEET_COLUMNS.map((col) => col.key));
  for (const g of body.gloves) {
    if (!g || typeof g !== 'object') return 'glove';
    const code = str(g.code, 60);
    if (!isV2(code) || !decodeV2(code)) return 'code';
    const d = g.design && typeof g.design === 'object' ? g.design : {};
    const design = {};
    for (const k of ['hand', 'size', 'pad', 'webType', 'bullet', 'thumbText', 'thumbFont',
      'thumbMain', 'thumbOutline', 'thumbNumber', 'circle', 'numberColor', 'pinkyText', 'flag']) {
      design[k] = str(d[k], LIMITS.text);
    }
    design.colours = {};
    if (d.colours && typeof d.colours === 'object') {
      for (const [k, v] of Object.entries(d.colours)) {
        if (/^[a-z_0-9]{1,16}$/.test(k)) design.colours[k] = str(v, 40);
      }
    }
    if (!Array.isArray(g.spec) || g.spec.length > LIMITS.specLines) return 'spec';
    const spec = g.spec.map((r) => Array.isArray(r) ? [str(r[0], LIMITS.text), str(r[1], LIMITS.text)] : null);
    if (spec.some((r) => !r)) return 'spec';
    let image = null;
    if (g.image != null) {
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(g.image));
      if (!m || m[1].length > LIMITS.image) return 'image';
      image = m[1];
    }
    gloves.push({ code, design, spec, image });
    void keys;
  }
  return { order, gloves };
}

function randomChars(n) {
  const bytes = randomBytes(n), out = [];
  for (const b of bytes) out.push(ORDER_ALPHA[b % ORDER_ALPHA.length]);
  return out.join('');
}

/* The mails. Text first: an order is read on a phone in a shop. */
export function buildMails(order, gloves, orderNumber, env) {
  const n = gloves.length;
  const nl = order.lang !== 'en';
  const gloveWord = n === 1 ? (nl ? 'handschoen' : 'glove') : (nl ? 'handschoenen' : 'gloves');
  const specBlock = (g, i) => [
    `=== ${nl ? 'Handschoen' : 'Glove'} ${i + 1} / ${n} — ${orderNumber}-${i + 1} — ${g.code}`,
    ...g.spec.map(([k, v]) => (k === '#' ? `\n[${v}]` : `${k}: ${v}`)),
  ].join('\n');
  const contact = [`${nl ? 'Naam' : 'Name'}: ${order.name}`, `${nl ? 'Telefoon' : 'Phone'}: ${order.phone}`, `E-mail: ${order.email}`].join('\n');
  const checkout = env.CHECKOUT_URL || '';

  const toPim = {
    subject: `Custom glove order ${orderNumber} — ${order.name} (${n} ${gloveWord})`,
    text: [
      `Nieuwe custom glove bestelling uit de configurator.`,
      ``,
      `Bestelnummer: ${orderNumber}`,
      `Aantal handschoenen: ${n}`,
      contact,
      ``,
      `De klant betaalt in de shop met dit bestelnummer in het bestelveld en aantal ${n}.`,
      `Het order sheet (jouw kolommen, ${n} ${n === 1 ? 'regel' : 'regels'}) zit als Excel-bijlage bij deze mail; de foto's van de handschoenen ook.`,
      ``,
      ...gloves.map(specBlock).flatMap((s) => [s, '']),
    ].join('\n'),
  };
  const toCustomer = {
    subject: nl ? `Je SSK custom glove bestelling ${orderNumber}` : `Your SSK custom glove order ${orderNumber}`,
    text: nl ? [
      `Bedankt, ${order.name}. Je ontwerp is bij SSK Europe aangekomen.`,
      ``,
      `Bestelnummer: ${orderNumber}`,
      `Aantal handschoenen: ${n}`,
      ``,
      `Zo rond je de bestelling af:`,
      `1. Ga naar de SSK Europe shop${checkout ? `: ${checkout}` : ''}.`,
      `2. Kies de custom handschoen, zet het aantal op ${n}.`,
      `3. Vul dit bestelnummer in het veld voor de configurator in: ${orderNumber}`,
      `4. Reken af zoals je gewend bent. SSK Europe koppelt je betaling aan dit ontwerp.`,
      ``,
      `Pas na je betaling gaat de bestelling naar SSK. Vragen? Antwoord op deze mail.`,
      ``,
      ...gloves.map(specBlock).flatMap((s) => [s, '']),
    ].join('\n') : [
      `Thank you, ${order.name}. Your design has reached SSK Europe.`,
      ``,
      `Order number: ${orderNumber}`,
      `Number of gloves: ${n}`,
      ``,
      `To complete the order:`,
      `1. Go to the SSK Europe shop${checkout ? `: ${checkout}` : ''}.`,
      `2. Choose the custom glove and set the quantity to ${n}.`,
      `3. Enter this order number in the configurator field: ${orderNumber}`,
      `4. Pay as usual. SSK Europe matches your payment to this design.`,
      ``,
      `The order goes to SSK only after your payment. Questions? Reply to this mail.`,
      ``,
      ...gloves.map(specBlock).flatMap((s) => [s, '']),
    ].join('\n'),
  };
  for (const m of [toPim, toCustomer]) {
    m.html = `<pre style="font:14px/1.45 ui-monospace,Menlo,Consolas,monospace;white-space:pre-wrap">${esc(m.text)}</pre>`;
  }
  return { toPim, toCustomer };
}

export function buildSheet(order, gloves, orderNumber) {
  const { header, rows } = sheetTable(
    gloves.map((g) => ({ ...g.design, code: g.code })),
    { ...order, orderNumber });
  const widths = SHEET_COLUMNS.map((c) => (c.h1 && c.h1.length > 12 ? 18 : 12));
  return workbook([...header, ...rows], 'Order Sheet glove', widths);
}

async function send(env, mail) {
  const r = await fetch(RESEND, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(mail),
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

function cors(req, res, env) {
  const allowed = (env.ORDER_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.origin || '';
  const ok = allowed.includes('*') ? '*' : (allowed.includes(origin) ? origin : null);
  if (ok) res.setHeader('access-control-allow-origin', ok);
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('access-control-max-age', '600');
  return !!ok;
}

export default async function handler(req, res) {
  const env = process.env;
  const allowed = cors(req, res, env);
  res.setHeader('cache-control', 'no-store');
  const json = (status, obj) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); };
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' });
  if (!allowed) return json(403, { ok: false, error: 'origin' });
  const dry = env.ORDER_TRANSPORT === 'dry';
  if (!dry && !(env.RESEND_API_KEY && env.ORDER_TO && env.ORDER_FROM)) {
    return json(503, { ok: false, error: 'not-configured' });
  }
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '?').split(',')[0].trim();
  if (!allow(ip)) return json(429, { ok: false, error: 'rate' });

  let body;
  try { body = await readBody(req); }
  catch (e) { return json(e.message === 'too-large' ? 413 : 400, { ok: false, error: e.message }); }
  const v = validate(body);
  if (typeof v === 'string') return json(v === 'refused' ? 403 : 400, { ok: false, error: v });
  const { order, gloves } = v;

  const orderNumber = makeOrderNumber(new Date(), randomChars(4));
  const mails = buildMails(order, gloves, orderNumber, env);
  const xlsx = buildSheet(order, gloves, orderNumber);
  const images = gloves.map((g, i) => g.image && ({
    filename: `${orderNumber}-${i + 1}.jpg`, content: g.image,
  })).filter(Boolean);
  const pim = {
    from: env.ORDER_FROM, to: [env.ORDER_TO],
    cc: (env.ORDER_CC || '').split(',').map((s) => s.trim()).filter(Boolean),
    reply_to: order.email,
    subject: mails.toPim.subject, text: mails.toPim.text, html: mails.toPim.html,
    attachments: [
      { filename: `SSK-order-${orderNumber}.xlsx`, content: xlsx.toString('base64') },
      ...images,
    ],
  };
  if (!pim.cc.length) delete pim.cc;
  const customer = {
    from: env.ORDER_FROM, to: [order.email], reply_to: env.ORDER_TO,
    subject: mails.toCustomer.subject, text: mails.toCustomer.text, html: mails.toCustomer.html,
    attachments: images,
  };
  if (dry) {
    return json(200, { ok: true, orderNumber, gloves: gloves.length, dry: true,
      mails: { pim, customer } });
  }
  try {
    await send(env, pim);
  } catch (e) {
    console.error('order: mail to SSK failed', e);
    return json(502, { ok: false, error: 'send' });
  }
  // The customer's copy is a courtesy: if it fails the order still went.
  let customerCopy = true;
  try { await send(env, customer); } catch (e) { console.error('order: customer copy failed', e); customerCopy = false; }
  return json(200, { ok: true, orderNumber, gloves: gloves.length, customerCopy });
}
