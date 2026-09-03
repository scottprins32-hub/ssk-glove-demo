/* Can the glove be built with nothing but Tab and Enter?

     node glove_builder/keyboard_check.mjs

   Optional: needs node and a Playwright chromium (PW_CHROMIUM, or the usual
   /opt/pw-browsers/chromium). Nothing the shipped page depends on.

   Every choice repaints the whole panel from scratch, which destroys the
   element that had focus and parks focus on <body>. A mouse never notices. A
   keyboard user's next Tab starts again from the top of the page -- eleven
   presses back to the web they just chose, every time -- and a screen reader
   is thrown back to the document start with no announcement.

   paint() puts focus back on the replacement control, matched by a data-key
   that survives the rebuild. The key must not be the class name: that gains
   " is-on" the instant a control is chosen, so the one control whose focus
   matters most is exactly the one a class-based key fails to match. This
   walks each kind of control there is -- starter card, option button, web
   card, colour part, colour swatch -- chooses one by keyboard, and checks
   focus is still on it afterwards.  */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

let chromium;
try {
  const gRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  const require = createRequire(import.meta.url);
  ({ chromium } = require(require.resolve('playwright', { paths: [gRoot] })));
} catch (err) {
  console.error('SKIP: playwright not resolvable globally (npm i -g playwright).');
  console.error(String(err.message).split('\n')[0]);
  process.exit(0);
}

const ROOT = normalize(new URL('./customiser/', import.meta.url).pathname);
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium';
const PORT = Number(process.env.PORT ?? 8794);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.txt': 'text/plain', '.jpg': 'image/jpeg' };

const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
// The page links a web font; a sandbox without egress stalls minutes on it.
await ctx.route('**', (route) =>
  route.request().url().startsWith(BASE) ? route.continue() : route.abort());

let failures = 0;
const check = (ok, what, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? '  — ' + detail : ''}`);
};

const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 110)));
const active = () => page.evaluate(() => {
  const a = document.activeElement;
  return { tag: a.tagName, cls: String(a.className).split(' ')[0],
    key: a.dataset ? a.dataset.key : null, text: a.textContent.trim().slice(0, 26) };
});

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1600);
// The web step lists nothing without a size, and the colour step needs a part.
await page.evaluate(() => {
  const o = JSON.parse(localStorage.getItem('ssk-glove-v1') || '{}');
  Object.assign(o, { hand: 'RHT', size: '11.75"', pad: 'Finger Pad' });
  localStorage.setItem('ssk-glove-v1', JSON.stringify(o));
});
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1600);

/** Tab until `want` matches the focused element, then Enter, then report. */
async function chooseByKeyboard(what, stepIndex, want, settle = 900) {
  await page.evaluate((i) => document.querySelectorAll('#steps .step')[i].click(), stepIndex);
  await page.waitForTimeout(settle);
  let seen = null;
  for (let i = 0; i < 60; i += 1) {
    await page.keyboard.press('Tab');
    seen = await active();
    if (want(seen)) break;
  }
  if (!want(seen)) { check(false, `${what}: Tab never reached one`, JSON.stringify(seen)); return; }
  const before = seen;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(settle);
  const after = await active();
  check(after.tag !== 'BODY' && after.key === before.key,
    `${what} keeps focus after the repaint`,
    `${before.key ?? before.text} -> ${after.key ?? after.tag}`);
}

await chooseByKeyboard('a starter card', 0, (a) => a.cls === 'card');
await chooseByKeyboard('an option button', 1, (a) => a.cls === 'opt-btn');
await chooseByKeyboard('a web card', 2, (a) => a.cls === 'card', 1400);
await chooseByKeyboard('a colour part', 3, (a) => a.cls === 'part');
await chooseByKeyboard('a colour swatch', 3, (a) => a.cls === 'sw');

// Opening a different step is the one case where staying put is wrong: the
// reader needs to hear where they landed, so the step's heading takes focus.
for (let i = 0; i < 40; i += 1) {
  await page.keyboard.press('Tab');
  const a = await active();
  if (a.key === 'step|5') break;
}
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
const landed = await active();
check(landed.tag === 'H1', 'opening a step moves focus to its heading', JSON.stringify(landed));

check(errors.length === 0, 'no page errors', errors.join(' | '));

await browser.close();
server.close();
console.log(failures
  ? `\n${failures} check(s) failed`
  : '\nthe glove can be built by keyboard without losing your place');
process.exit(failures ? 1 : 0);
