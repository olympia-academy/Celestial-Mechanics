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
async function setNumber(page, id, value) {
  await page.locator('#' + id).fill(String(value));
  await page.locator('#' + id).press('Tab');
}
async function expectValidPrecisionFields(page) {
  const fields = await page.locator('#mass-ratio-number, #speed-number').evaluateAll(inputs =>
    inputs.map(input => ({id: input.id, valid: input.validity.valid, message: input.validationMessage})));
  for (const field of fields) assert.ok(field.valid, field.id + ': ' + field.message);
}
async function expectNoOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'The page must fit the viewport');
}
async function expectReadableMetrics(page) {
  const metrics = await page.locator('.metric').evaluateAll(elements => elements.map(element => {
    const output = element.querySelector('output');
    const range = document.createRange();
    range.selectNodeContents(output);
    const text = range.getBoundingClientRect();
    const cell = element.getBoundingClientRect();
    const label = element.querySelector('span').getBoundingClientRect();
    return {
      id: output.id,
      contained: text.left >= cell.left - 1 && text.right <= cell.right + 1 && text.top >= cell.top - 1 && text.bottom <= cell.bottom + 1,
      overlapsLabel: text.left < label.right && text.right > label.left && text.top < label.bottom && text.bottom > label.top
    };
  }));
  for (const metric of metrics) {
    assert.ok(metric.contained, metric.id + ' must fit its metric cell without clipping or overflowing');
    assert.equal(metric.overlapsLabel, false, metric.id + ' must not overlap its label');
  }
}
async function initialConditionsAndTime(page) {
  return {
    params: await page.locator('#mass-ratio-number, #distance, #speed-number, #angle').evaluateAll(inputs => inputs.map(input => input.value)),
    time: number(await page.locator('#time-display').textContent())
  };
}
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
    await page.addInitScript(() => {
      const prototype = CanvasRenderingContext2D.prototype;
      const clearRect = prototype.clearRect;
      const fillText = prototype.fillText;
      window.orbitCanvasLabels = [];
      prototype.clearRect = function (...args) {
        if (this.canvas.id === 'orbit-canvas') window.orbitCanvasLabels = [];
        return clearRect.apply(this, args);
      };
      prototype.fillText = function (text, x, y, ...args) {
        if (this.canvas.id === 'orbit-canvas') window.orbitCanvasLabels.push({text, x, y});
        return fillText.call(this, text, x, y, ...args);
      };
    });
    const baseUrl = 'http://127.0.0.1:' + server.address().port;
    await page.goto(baseUrl + '/', {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.getElementById('eccentricity-value').textContent !== '—');
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.locator('h1').textContent(), 'Celestial Mechanics');
    await page.screenshot({path: path.join(output, 'initial.png'), fullPage: true});
    assert.equal(await page.locator('#error-message').isVisible(), false);
    assert.equal(await page.locator('#play-button').textContent(), 'Play');
    await expectValidPrecisionFields(page);
    for (const [preset, name] of [['circle', 'Circle'], ['ellipse', 'Ellipse'], ['parabola', 'Parabola'], ['hyperbola', 'Hyperbola']]) {
      await page.locator('[data-preset="' + preset + '"]').click();
      assert.equal(await page.locator('#orbit-type').textContent(), name);
      const e = number(await page.locator('#eccentricity-value').textContent());
      const energy = number(await page.locator('#energy-value').textContent());
      if (preset === 'circle') { assert.equal(e, 0); assert.ok(energy < 0); }
      if (preset === 'ellipse') { assert.ok(e > 0 && e < 1); assert.ok(energy < 0); }
      if (preset === 'parabola') { assert.equal(e, 1); assert.equal(energy, 0); }
      if (preset === 'hyperbola') { assert.ok(e > 1); assert.ok(energy > 0); }
      await expectValidPrecisionFields(page);
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
    assert.equal(await page.locator('#orbit-type').textContent(), 'Circle');
    assert.ok(Math.abs(number(await page.locator('#speed-number').inputValue()) - Math.SQRT2) < 1e-8);
    await page.locator('[data-preset="binary"]').click();
    await page.locator('#show-vectors').check();
    await page.locator('#show-apsides').check();
    await page.locator('#play-button').click();
    await page.waitForTimeout(450);
    await page.locator('#play-button').click();
    assert.ok(number(await page.locator('#time-display').textContent()) > 0);
    await page.waitForTimeout(200);
    const paused2 = await page.locator('#time-display').textContent();
    await page.waitForTimeout(200);
    assert.equal(await page.locator('#time-display').textContent(), paused2);
    const beforeLanguageChange = await initialConditionsAndTime(page);
    await page.locator('#language-select').selectOption('nb');
    assert.equal(await page.locator('html').getAttribute('lang'), 'nb');
    assert.equal(await page.locator('h1').textContent(), 'Himmelmekanikk');
    assert.equal(await page.locator('#play-button').textContent(), 'Spill av');
    assert.deepEqual(await initialConditionsAndTime(page), beforeLanguageChange, 'Changing language must preserve the initial conditions and elapsed time');
    await page.locator('#language-select').selectOption('en');
    assert.equal(await page.locator('h1').textContent(), 'Celestial Mechanics');
    assert.deepEqual(await initialConditionsAndTime(page), beforeLanguageChange);
    for (const frame of ['primary', 'relative', 'barycentric']) {
      await page.locator('#reference-frame').selectOption(frame);
      assert.equal(await page.locator('#error-message').isVisible(), false);
    }
    await page.screenshot({path: path.join(output, 'desktop.png'), fullPage: true});
    await page.locator('#speed-number').fill('0');
    await page.locator('#speed-number').press('Tab');
    assert.equal(await page.locator('#orbit-type').textContent(), 'Radial motion');
    await page.locator('#play-button').click();
    await page.waitForFunction(() => document.getElementById('error-message').textContent.includes('singular'), null, {timeout: 6000});
    assert.equal(await page.locator('#play-button').textContent(), 'Play');
    await page.locator('[data-preset="ellipse"]').click();
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(100);
    await expectNoOverflow(page);
    await page.screenshot({path: path.join(output, 'mobile.png'), fullPage: true});
    await page.setViewportSize({width: 320, height: 700});
    await setNumber(page, 'mass-ratio-number', 0);
    await page.locator('#distance').evaluate(input => {
      input.value = '1';
      input.dispatchEvent(new Event('input', {bubbles: true}));
    });
    await page.locator('[data-preset="ellipse"]').click();
    await page.waitForFunction(() => {
      const labels = window.orbitCanvasLabels.map(label => label.text);
      return (labels.includes('Peri') || labels.includes('Periapsis')) && (labels.includes('Apo') || labels.includes('Apoapsis'));
    });
    const apsisLabels = await page.evaluate(() => window.orbitCanvasLabels.map(label => label.text));
    assert.ok(apsisLabels.includes('Apo') || apsisLabels.includes('Apoapsis'), 'Both apsis labels must be drawn on a fitted mobile ellipse');
    await setNumber(page, 'speed-number', 1.41421);
    assert.equal(await page.locator('#eccentricity-value').textContent(), '0.99998992');
    await expectValidPrecisionFields(page);
    await expectNoOverflow(page);
    await expectReadableMetrics(page);
    await page.screenshot({path: path.join(output, 'mobile-precision.png'), fullPage: true});

    await page.goto(baseUrl + '/?lang=nb', {waitUntil: 'networkidle'});
    assert.equal(await page.locator('html').getAttribute('lang'), 'nb');
    assert.equal(await page.locator('h1').textContent(), 'Himmelmekanikk');
    assert.equal(await page.locator('#language-select').inputValue(), 'nb');
    assert.equal(await page.locator('#play-button').textContent(), 'Spill av');
    await expectNoOverflow(page);
    await expectReadableMetrics(page);
    for (const [preset, name] of [['circle', 'Sirkel'], ['ellipse', 'Ellipse'], ['parabola', 'Parabel'], ['hyperbola', 'Hyperbel']]) {
      await page.locator('[data-preset="' + preset + '"]').click();
      assert.equal(await page.locator('#orbit-type').textContent(), name);
      assert.ok((await page.locator('[data-preset="' + preset + '"]').textContent()).includes(name));
      await expectValidPrecisionFields(page);
    }
    await page.locator('#play-button').click();
    assert.equal(await page.locator('#play-button').textContent(), 'Pause');
    await page.waitForTimeout(200);
    await page.locator('#play-button').click();
    assert.equal(await page.locator('#play-button').textContent(), 'Spill av');
    await page.screenshot({path: path.join(output, 'mobile-norwegian.png'), fullPage: true});
    await page.setViewportSize({width: 1440, height: 1100});
    await page.locator('[data-preset="ellipse"]').click();
    await page.screenshot({path: path.join(output, 'desktop-norwegian.png'), fullPage: true});
    await setNumber(page, 'speed-number', 0);
    assert.equal(await page.locator('#orbit-type').textContent(), 'Radiell bevegelse');
    await page.locator('#play-button').click();
    await page.waitForFunction(() => document.getElementById('error-message').textContent.includes('singulær'), null, {timeout: 6000});
    assert.equal(await page.locator('#play-button').textContent(), 'Spill av');
    await page.waitForFunction(() => Number(document.getElementById('time-display').textContent.replace(',', '.')) === 1.11);
    const norwegianCollision = await page.locator('#error-message').textContent();
    const collisionState = await initialConditionsAndTime(page);
    await page.locator('#language-select').selectOption('en');
    assert.ok((await page.locator('#error-message').textContent()).includes('The point masses meet'));
    assert.deepEqual(await initialConditionsAndTime(page), collisionState, 'Translating a collision message must preserve the stopped simulation');
    await page.locator('#language-select').selectOption('nb');
    assert.equal(await page.locator('#error-message').textContent(), norwegianCollision);
    assert.equal(new URL(page.url()).searchParams.get('lang'), 'nb', 'The selected language must be reflected in the shareable URL');
    await page.reload({waitUntil: 'networkidle'});
    assert.equal(await page.locator('html').getAttribute('lang'), 'nb', 'Reloading the selected-language URL must retain Norwegian');
    assert.equal(await page.locator('h1').textContent(), 'Himmelmekanikk');
    await page.goto(baseUrl + '/?lang=en', {waitUntil: 'networkidle'});
    assert.equal(await page.locator('html').getAttribute('lang'), 'en', 'The explicit English URL must select English after visiting the Norwegian version');
    assert.equal(await page.locator('h1').textContent(), 'Celestial Mechanics');

    for (const [filename, language, title, parabola] of [
      ['himmelmekanikk.html', 'en', 'Celestial Mechanics', 'Parabola'],
      ['himmelmekanikk.nb.html', 'nb', 'Himmelmekanikk', 'Parabel']
    ]) {
      const offlinePage = await browser.newPage({viewport: {width: 320, height: 700}, reducedMotion: 'reduce'});
      offlinePage.on('pageerror', error => errors.push(filename + ': ' + error.message));
      offlinePage.on('request', request => {
        if (/^https?:/.test(request.url())) errors.push(filename + ' requested an online dependency: ' + request.url());
      });
      await offlinePage.goto(pathToFileURL(path.join(output, filename)).href, {waitUntil: 'load'});
      await offlinePage.waitForFunction(() => document.getElementById('eccentricity-value').textContent !== '—');
      assert.equal(await offlinePage.locator('html').getAttribute('lang'), language);
      assert.equal(await offlinePage.locator('h1').textContent(), title);
      await offlinePage.locator('[data-preset="parabola"]').click();
      assert.equal(await offlinePage.locator('#orbit-type').textContent(), parabola);
      assert.equal(await offlinePage.locator('#error-message').isVisible(), false);
      await expectValidPrecisionFields(offlinePage);
      await expectNoOverflow(offlinePage);
      await offlinePage.locator('#language-select').selectOption(language === 'en' ? 'nb' : 'en');
      assert.equal(await offlinePage.locator('#orbit-type').textContent(), language === 'en' ? 'Parabel' : 'Parabola');
      await offlinePage.close();
    }
    await page.goto(baseUrl + '/assets/logo/preview.html', {waitUntil: 'networkidle'});
    const logos = await page.locator('img').evaluateAll(images => images.map(image => ({
      source: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    })));
    assert.deepEqual(logos.map(logo => logo.source).sort(), ['celestial-mechanics-en.svg', 'himmelmekanikk-no.svg']);
    for (const logo of logos) assert.ok(logo.loaded, logo.source + ' must render in the logo preview');
    await page.screenshot({path: path.join(output, 'logo-preview.png'), fullPage: true});
    assert.deepEqual(errors, []);
    console.log('UI verified: all conics, mass response, valid precision fields, playback, reference frames, radial collision in both languages, mobile apsides and precise readouts (320/390 px), English/Norwegian without resetting, language URLs and reload, both bilingual offline HTML files, both SVG logos. No browser errors.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
