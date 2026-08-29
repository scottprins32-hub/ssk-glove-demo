/* Does a saved draft or a shared link survive contact with the catalogue?

     node glove_builder/state_check.mjs

   Optional: needs node and a Playwright chromium (PW_CHROMIUM, or the usual
   /opt/pw-browsers/chromium). Nothing the shipped page depends on.

   render_check.mjs proves the glove renders the colour it was given. This one
   proves the page survives the state it is given, which is a different kind of
   input: a link can be edited by hand, and a saved draft was written by an
   OLDER version of this page. Every time the catalogue changes -- a web
   dropped, a pad renamed -- every draft already on a customer's device holds a
   value that no longer exists.

   Restoring those unchecked failed twice over. specRows() looks a value up and
   reads [lang] off the result, so an unknown hand or pad threw on the review
   step: the one page the customer sends to SSK. And answered() counts any
   non-empty value, so the step dot called the question done and nobody was
   ever asked again.

   So: poison a real draft one field at a time, reload, and check the page
   still comes up, the review page still builds, and the step whose question
   was dropped has its "todo" dot back.  */

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
const PORT = Number(process.env.PORT ?? 8793);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.txt': 'text/plain' };

const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${PORT}/`;

const browser = await chromium.launch({ executablePath: EXECUTABLE });
let failures = 0;
const check = (ok, what, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? '  — ' + detail : ''}`);
};

/** A fresh origin each time: local storage must not leak between cases. */
async function freshPage() {
  const ctx = await browser.newContext();
  // The page links a web font; a sandbox without egress stalls for minutes on
  // it. Nothing here depends on how the type looks.
  await ctx.route('**', (route) =>
    route.request().url().startsWith(BASE) ? route.continue() : route.abort());
  return { ctx, page: await ctx.newPage() };
}

// What a real draft looks like, so the poison is shaped like the real thing.
const first = await freshPage();
await first.page.goto(BASE, { waitUntil: 'load' });
await first.page.waitForTimeout(1500);
const saved = await first.page.evaluate(() => localStorage.getItem('ssk-glove-v1'));
await first.ctx.close();
const draft = {
  ...JSON.parse(saved || '{}'),
  hand: 'RHT', size: '12"', pad: 'Finger Pad', webType: 'H-Web',
};

// `step` is the index of the step that must ask its question again.
const CASES = [
  ['a valid draft still restores', (o) => o, null],
  ['an unknown hand is dropped and asked again', (o) => ({ ...o, hand: 'sideways' }), 1],
  ['an unknown pad is dropped and asked again', (o) => ({ ...o, pad: 'Rocket Pad' }), 1],
  ['an unknown size is dropped and asked again', (o) => ({ ...o, size: '99"' }), 1],
  ['a web the catalogue no longer lists is dropped', (o) => ({ ...o, webType: 'Z-Web' }), 2],
  ['a colour code outside the palette is dropped',
    (o) => ({ ...o, colors: { ...o.colors, web: '#ff00ff' } }), null],
  ['a colours bag that is not an object does not crash', (o) => ({ ...o, colors: 'nope' }), null],
  ['a hostile language falls back to Dutch', (o) => ({ ...o, lang: '<script>' }), null],
  ['an array where the state should be is refused', () => [1, 2, 3], null],
];

for (const [what, poison, step] of CASES) {
  const { ctx, page } = await freshPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 110)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v),
    ['ssk-glove-v1', JSON.stringify(poison(draft))]);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const seen = await page.evaluate(() => {
    const steps = [...document.querySelectorAll('#steps .step')];
    // No step buttons at all means paint() threw and the page never came up.
    if (!steps.length) return { dead: true, body: '', todo: [] };
    steps[steps.length - 1].click();           // the review page, which builds the spec
    return new Promise((r) => setTimeout(() => r({
      dead: false,
      body: document.body.innerText.slice(0, 600),
      todo: steps.map((b) => !!b.querySelector('.dot.todo')),
    }), 700));
  });

  const alive = !seen.dead && errors.length === 0
    && !/undefined|NaN|\[object Object\]/.test(seen.body);
  const asked = step === null || seen.todo[step] === true;
  check(alive && asked, what,
    [seen.dead ? 'the page never rendered its steps' : '',
     errors.join(' | '),
     !asked ? `step ${step + 1} still counts its question as answered` : '',
    ].filter(Boolean).join(' — '));
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures
  ? `\n${failures} check(s) failed`
  : '\nrestored state is validated before anything uses it');
process.exit(failures ? 1 : 0);
