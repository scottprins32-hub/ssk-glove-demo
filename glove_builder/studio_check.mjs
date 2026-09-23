// Order and sharing regression checks. Start the customiser on BASE_URL first.
// NODE_PATH may point to a Playwright installation; PW_CHROMIUM selects Chromium.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(() => document.querySelectorAll('#steps button').length === 8);
  await page.locator('#lang-en').click();
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('ssk-glove-v1')));
  const hostile = '<img src=x onerror="window.xss=1">';
  await page.evaluate(([state, name]) => localStorage.setItem('ssk-glove-v1', JSON.stringify({ ...state, name, phone: '0612345678', thumbText: 'MY GLOVE', size: '11.5"', webType: 'H-Web', colors: { ...state.colors, palm: '10', back2: '90' } })), [original, hostile]);
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll('#steps button').length === 8);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('ssk-glove-v1')));
  assert.equal(state.webType, null, 'incompatible size/web must be cleared');
  assert.notEqual(state.colors.palm, state.colors.back2, 'independent palm and thumb colours survive');
  const beforeInvalid = await page.evaluate(() => localStorage.getItem('ssk-glove-v1'));
  await page.locator('#body input').fill('https://example.com/#e30');
  await page.locator('#body .field button').click();
  assert.match(await page.locator('#body [role="status"]').textContent(), /could not be opened/);
  assert.equal(await page.evaluate(() => localStorage.getItem('ssk-glove-v1')), beforeInvalid, 'invalid import preserves draft');
  await page.locator('#steps button').nth(5).click();
  // Font labels differ by language/catalogue; check the known main-thread widget.
  assert.ok(await page.locator('.field').filter({ has: page.locator('.swatches') }).first().locator('.req').count(), 'embroidery thread is visibly required');
  await page.locator('#steps button').first().click();
  const colourCode = await page.locator('#refcode').textContent();
  await page.locator('[data-view="palm"]').click();
  assert.equal(await page.locator('#refcode').textContent(), colourCode, 'view does not change colour code');
  await page.locator('#steps button').last().click();
  assert.equal(await page.locator('.spec img').count(), 0, 'user text never becomes markup');
  assert.ok((await page.locator('.spec').textContent()).includes(hostile));
  assert.equal(await page.evaluate(() => window.xss), undefined);
  await page.locator('#next').click();
  assert.match(await page.locator('#sheetstatus').textContent(), /Draft:/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'sheetx');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'keep');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#scrim').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'next');
  await page.locator('#share').click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const shared = JSON.parse(Buffer.from(link.split('#')[1], 'base64url').toString());
  assert.equal(shared.name, undefined); assert.equal(shared.phone, undefined);
  assert.equal(shared.thumbText, 'MY GLOVE');
  const next = await context.newPage();
  await next.goto(link); await next.waitForFunction(() => document.querySelectorAll('#steps button').length === 8);
  const roundtrip = await next.evaluate(() => JSON.parse(localStorage.getItem('ssk-glove-v1')));
  assert.equal(roundtrip.thumbText, state.thumbText);
  assert.deepEqual(roundtrip.colors, state.colors);
  assert.equal(roundtrip.name, ''); assert.equal(roundtrip.phone, '');
  await page.locator('#next').click();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download').click();
  const downloaded = await downloadPromise;
  const spec = await readFile(await downloaded.path(), 'utf8');
  assert.ok(spec.includes(hostile)); assert.ok(spec.includes('#')); assert.ok(spec.includes('Saving does not place an order'));
  await page.keyboard.press('Escape');
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.locator('.price').isVisible(), `price visible at ${width}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal overflow at ${width}`);
    for (let i = 0; i < 8; i++) {
      await page.locator('#steps button').nth(i).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `step ${i+1} no overflow at ${width}`);
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: hostile text, colour independence, compatible restoration, stable palette code, private full-design sharing, draft status, modal keyboard, download, all steps at four widths.');
} finally { await browser.close(); }
