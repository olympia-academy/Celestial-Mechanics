'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {once} = require('node:events');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const output = path.join(__dirname, 'output');
fs.mkdirSync(output, {recursive: true});
function number(text) { return Number(text.replace(/[\s\u00a0]/g, '').replace(',', '.').replace('−', '-')); }
(async () => {
  process.env.PORT = '0';
  const server = require('./server.cjs');
  await once(server, 'listening');
  let browser;
  try {
    browser = await chromium.launch({headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined});
    const page = await browser.newPage({viewport: {width: 1440, height: 1100}, deviceScaleFactor: 1, reducedMotion: 'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.getElementById('eccentricity-value').textContent !== '—');
    await page.screenshot({path: path.join(output, 'initial.png'), fullPage: true});
    assert.equal(await page.locator('#error-message').isVisible(), false);
    assert.equal(await page.locator('#play-button').textContent(), 'Spill av');
    for (const [preset, name] of [['circle', 'Sirkel'], ['ellipse', 'Ellipse'], ['parabola', 'Parabel'], ['hyperbola', 'Hyperbel']]) {
      await page.locator('[data-preset="' + preset + '"]').click();
      assert.equal(await page.locator('#orbit-type').textContent(), name);
      const e = number(await page.locator('#eccentricity-value').textContent());
      const energy = number(await page.locator('#energy-value').textContent());
      if (preset === 'circle') { assert.equal(e, 0); assert.ok(energy < 0); }
      if (preset === 'ellipse') { assert.ok(e > 0 && e < 1); assert.ok(energy < 0); }
      if (preset === 'parabola') { assert.equal(e, 1); assert.equal(energy, 0); }
      if (preset === 'hyperbola') { assert.ok(e > 1); assert.ok(energy > 0); }
    }
    await page.locator('#mass-ratio-number').fill('0');
    await page.locator('#mass-ratio-number').press('Tab');
    await page.locator('[data-preset="circle"]').click();
    assert.equal(number(await page.locator('#speed-number').inputValue()), 1);
    await page.locator('#mass-ratio-number').fill('1');
    await page.locator('#mass-ratio-number').press('Tab');
    assert.equal(number(await page.locator('#speed-number').inputValue()), 1);
    assert.equal(await page.locator('#orbit-type').textContent(), 'Ellipse');
    assert.equal(number(await page.locator('#eccentricity-value').textContent()), 0.5);
    await page.locator('#circular-button').click();
    assert.equal(await page.locator('#orbit-type').textContent(), 'Sirkel');
    assert.ok(Math.abs(number(await page.locator('#speed-number').inputValue()) - Math.SQRT2) < 1e-8);
    await page.locator('[data-preset="binary"]').click();
    await page.locator('#show-vectors').check();
    await page.locator('#show-apsides').check();
    await page.locator('#play-button').click();
    await page.waitForTimeout(450);
    await page.locator('#play-button').click();
    assert.ok(number(await page.locator('#time-display').textContent()) > 0);
    const paused = await page.locator('#time-display').textContent();
    await page.waitForTimeout(200);
    const paused2 = await page.locator('#time-display').textContent();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#time-display').textContent(), paused2);
    for (const frame of ['primary', 'relative', 'barycentric']) {
      await page.locator('#reference-frame').selectOption(frame);
      assert.equal(await page.locator('#error-message').isVisible(), false);
    }
    await page.screenshot({path: path.join(output, 'desktop.png'), fullPage: true});
    await page.locator('#speed-number').fill('0');
    await page.locator('#speed-number').press('Tab');
    assert.equal(await page.locator('#orbit-type').textContent(), 'Radiell bevegelse');
    await page.locator('#play-button').click();
    await page.waitForFunction(() => document.getElementById('error-message').textContent.includes('singulær'), {timeout: 6000});
    assert.equal(await page.locator('#play-button').textContent(), 'Spill av');
    await page.locator('[data-preset="ellipse"]').click();
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.screenshot({path: path.join(output, 'mobile.png'), fullPage: true});
    await page.setViewportSize({width: 320, height: 700});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.goto(pathToFileURL(path.join(output, 'himmelmekanikk.html')).href, {waitUntil: 'load'});
    await page.waitForFunction(() => document.getElementById('eccentricity-value').textContent !== '—');
    await page.locator('[data-preset="parabola"]').click();
    assert.equal(await page.locator('#orbit-type').textContent(), 'Parabel');
    assert.equal(await page.locator('#error-message').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('UI verified: all conics, mass response, presets, playback, reference frames, radial collision, responsive layout (320/390 px), offline HTML. No browser errors.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
