// Requires the current static frontend at http://127.0.0.1:4318 and installed
// Google Chrome. Uses an isolated browser context and synthetic drafts only.
// No saved browser profile, account, provider request or real tax data is used.
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { childEnvironment, checkoutState, safeError } = require('./runtime-smoke.cjs');

const origin = 'http://127.0.0.1:4318';
const results = path.resolve(__dirname, '../test-results');
const preparationKey = year => `taxsorted-return-preparation-v1:${year}`;
const label = year => year.replace('-', '–');
const syntheticEmployment = {
  name: 'Synthetic browser fixture', pay: '12345.67', tax: '2345.67',
  notes: 'Synthetic private preparation note',
};

// Installed before app JavaScript. The checklist legitimately fetches the
// canonical envelope on mount. Counting that fetch alone cannot establish
// whether preparation was used. These accessors observe extraction of each
// preparation slot from the renderer's already-cloned IDB result. They do not
// change persisted data, bypass app code or read either slot themselves.
function observePreparationReads() {
  const years = ['2025-26', '2026-27'];
  const keys = Object.fromEntries(years.map(year => [`taxsorted-return-preparation-v1:${year}`, year]));
  const counts = globalThis.__preparationProgressReads = {
    envelopeRequests: 0, checklistRequests: 0,
    preparationRequests: { '2025-26': 0, '2026-27': 0 },
    preparationSlotAccesses: { '2025-26': 0, '2026-27': 0 },
    indexedDbWrites: 0, localStorageWrites: 0,
  };
  const get = IDBObjectStore.prototype.get;
  IDBObjectStore.prototype.get = function (key) {
    if (key === 'taxsorted-local-workspace-v1') counts.envelopeRequests += 1;
    if (key === 'taxsorted.tax-checklist-v1') counts.checklistRequests += 1;
    if (Object.hasOwn(keys, key)) counts.preparationRequests[keys[key]] += 1;
    return get.call(this, key);
  };
  const descriptor = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'result');
  const wrapped = new WeakSet();
  Object.defineProperty(IDBRequest.prototype, 'result', {
    ...descriptor,
    get() {
      const value = descriptor.get.call(this);
      if (value?.schema === 'taxsorted.local-workspace/1' && value.values && !wrapped.has(value.values)) {
        wrapped.add(value.values);
        for (const [key, year] of Object.entries(keys)) {
          if (!Object.hasOwn(value.values, key)) continue;
          const stored = Object.getOwnPropertyDescriptor(value.values, key);
          if (!Object.hasOwn(stored, 'value')) continue;
          let current = stored.value;
          Object.defineProperty(value.values, key, {
            enumerable: stored.enumerable, configurable: true,
            get() { counts.preparationSlotAccesses[year] += 1; return current; },
            set(next) { current = next; },
          });
        }
      }
      return value;
    },
  });
  for (const method of ['put', 'add', 'delete', 'clear']) {
    const original = IDBObjectStore.prototype[method];
    IDBObjectStore.prototype[method] = function (...args) {
      counts.indexedDbWrites += 1;
      return original.apply(this, args);
    };
  }
  for (const method of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (...args) {
      if (this === globalThis.localStorage) counts.localStorageWrites += 1;
      return original.apply(this, args);
    };
  }
}

async function readCounters(page) {
  return page.evaluate(() => structuredClone(globalThis.__preparationProgressReads));
}

// Call through a separate inspection page so these reads never contaminate
// the app journey's counters. Contents stay in process memory, never reports.
async function savedState(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('keyval-store');
    open.onerror = () => reject(new Error('Synthetic saved-state inspection failed'));
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('keyval', 'readonly');
      const store = tx.objectStore('keyval');
      const keys = store.getAllKeys();
      const values = store.getAll();
      tx.oncomplete = () => { db.close(); resolve({ keys: keys.result, values: values.result, localStorage: { ...localStorage } }); };
      tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Synthetic saved-state inspection failed')); };
    };
  }));
}

async function replaceSyntheticSlot(page, year, missing) {
  await page.evaluate(({ key, missing }) => new Promise((resolve, reject) => {
    const open = indexedDB.open('keyval-store');
    open.onerror = () => reject(new Error('Synthetic fixture update failed'));
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('keyval', 'readwrite');
      const store = tx.objectStore('keyval');
      const get = store.get('taxsorted-local-workspace-v1');
      get.onsuccess = () => {
        const workspace = get.result;
        workspace.values[key] = missing ? undefined : { schema: 'synthetic damaged preparation' };
        store.put(workspace, 'taxsorted-local-workspace-v1');
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Synthetic fixture update failed')); };
    };
  }), { key: preparationKey(year), missing });
}

async function settled(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function count(region, name, expected) {
  const actual = await region.locator('dt').filter({ hasText: new RegExp(`^${name}$`) }).evaluate(element => element.nextElementSibling.textContent);
  assert.equal(Number(actual), expected);
}

async function destination(link, expected) {
  const actual = new URL(await link.getAttribute('href'), origin);
  const target = new URL(expected, origin);
  assert.equal(actual.origin, target.origin);
  assert.equal(actual.pathname.replace(/\/$/, ''), target.pathname.replace(/\/$/, ''));
  assert.equal(actual.search, target.search);
  assert.equal(actual.hash, target.hash);
}

async function focused(locator) {
  await locator.waitFor();
  await locator.page().waitForFunction(element => document.activeElement === element, await locator.elementHandle());
}

async function checkLayout(page, report, surface) {
  const prefix = surface === 'tasks' ? 'preparation-tasks' : 'preparation-progress';
  for (const width of [1440, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await settled(page);
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    report.viewportChecks.push({ surface, width, height: 1000, zoomPercent: 100, horizontalOverflow });
    assert.equal(horizontalOverflow, false);
    if (width !== 320) {
      const filename = `${prefix}-${width}.png`;
      await page.evaluate(() => window.scrollTo(0, 0));
      await settled(page);
      await page.screenshot({ path: path.join(results, filename), fullPage: true });
      report.screenshots.push(filename);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  await settled(page);
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  report.viewportChecks.push({ surface, width: 1440, height: 1000, zoomPercent: 200, method: 'CSS zoom; browser toolbar zoom and assistive technology not exercised', horizontalOverflow });
  assert.equal(horizontalOverflow, false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settled(page);
  const filename = `${prefix}-200-percent.png`;
  await page.screenshot({ path: path.join(results, filename), fullPage: true });
  report.screenshots.push(filename);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
}

async function savePreparation(page, year, step) {
  step(`open synthetic ${year} preparation`);
  await page.goto(`${origin}/prepare/?year=${year}`);
  await page.locator('#prepare-year').waitFor();
  assert.equal(await page.locator('#prepare-year').inputValue(), year);
  await page.getByRole('button', { name: 'Start preparation', exact: true }).click();
  const answer = (name, value) => page.getByRole('group', { name, exact: true }).getByRole('radio', { name: value, exact: true }).check();
  if (year === '2025-26') {
    step(`answer synthetic ${year} circumstances`);
    await answer('Employment', 'Yes');
    await answer('Property income', 'Not sure');
    await answer('Pensions', 'Yes');
    step(`open synthetic ${year} evidence`);
    await page.getByRole('navigation', { name: 'Preparation steps' }).getByRole('button', { name: 'Step 2 Evidence', exact: true }).click();
    await page.locator('#evidence-pension-status').selectOption('collected');
    step(`add synthetic ${year} employment record`);
    await page.getByRole('button', { name: 'Add an employment', exact: true }).click();
    const employment = page.getByRole('region', { name: 'Employment 1', exact: true });
    step(`name synthetic ${year} employment record`);
    await employment.getByLabel('Employer or job label', { exact: true }).fill(syntheticEmployment.name);
    await employment.locator('input[id$="-pay"]').fill(syntheticEmployment.pay);
    await employment.locator('input[id$="-tax"]').fill(syntheticEmployment.tax);
    await employment.locator('textarea[id$="-notes"]').fill(syntheticEmployment.notes);
    step(`choose synthetic ${year} document type`);
    await employment.locator('select[id$="-type"]').selectOption('P45');
    step(`choose synthetic ${year} document year`);
    await employment.locator('select[id$="-year"]').selectOption(year);
  } else {
    step(`answer synthetic ${year} circumstances`);
    await answer('Employment', 'No');
    await answer('Property income', 'Yes');
    await answer('Savings and investments', 'Yes');
    await answer('Other income', 'Not sure');
    step(`open synthetic ${year} evidence`);
    await page.getByRole('navigation', { name: 'Preparation steps' }).getByRole('button', { name: 'Step 2 Evidence', exact: true }).click();
    await page.locator('#evidence-property-status').selectOption('reviewed');
    await page.locator('#evidence-savings-investments-status').selectOption('unresolved');
  }
  step(`save synthetic ${year} draft`);
  await page.getByRole('button', { name: 'Save preparation on this device', exact: true }).click();
  await page.getByText('Preparation saved on this device. No information was uploaded.', { exact: true }).waitFor();
}

async function run() {
  const report = {
    schema: 'taxsorted.preparation-progress-browser-smoke/1', startedAt: new Date().toISOString(),
    ...checkoutState(childEnvironment()), status: 'running', data: 'synthetic only',
    checkoutMetadataMeaning: 'Working checkout at test start; not a claim of static build provenance.',
    testedOrigin: origin, platform: process.platform, arch: process.arch, osVersion: os.release(),
    nodeVersion: process.version, playwrightVersion: require('playwright/package.json').version,
    browserChannel: 'chrome', checks: [], viewportChecks: [], screenshots: [],
    readObservationMeaning: 'The checklist reads the shared envelope on mount. Exact slot request and result-property access counters observe preparation extraction, not whether preparation bytes were physically fetched in that envelope.',
    pageErrorCount: 0, blockedExternalRequests: 0, cleanup: { contextClosed: false, browserClosed: false },
  };
  let stage = 'launch isolated browser';
  let browser;
  let context;
  try {
    await fs.mkdir(results, { recursive: true });
    browser = await chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: true, env: childEnvironment() });
    report.browserVersion = browser.version();
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    context.on('page', page => {
      page.on('pageerror', () => { report.pageErrorCount += 1; });
      page.setDefaultTimeout(10_000);
    });
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      report.blockedExternalRequests += 1;
      return route.abort();
    });
    await context.addInitScript(observePreparationReads);
    const setup = await context.newPage();
    stage = 'save both synthetic preparation years through their UI';
    for (const year of ['2025-26', '2026-27']) await savePreparation(setup, year, value => { stage = value; });
    await setup.goto(`${origin}/checkup/?for=landlords`);
    await setup.getByRole('checkbox').first().check();
    await setup.getByRole('button', { name: 'Save checklist', exact: true }).click();
    await setup.getByRole('status').filter({ hasText: 'Checklist saved on this device.' }).waitFor();
    stage = 'adopt synthetic drafts into canonical workspace through the backup UI';
    await setup.goto(`${origin}/backups/`);
    await setup.getByRole('button', { name: 'Prepare a workspace backup', exact: true }).click();
    await setup.getByRole('heading', { name: 'Check your saved workspace', exact: true }).waitFor();
    const baseline = await savedState(setup);
    assert.ok(baseline.keys.includes('taxsorted-local-workspace-v1'));
    report.checks.push('Two distinct synthetic preparation years and a checklist saved through the UI; canonical workspace activated through explicit backup capture');

    const page = await context.newPage();
    stage = 'observe checklist hydration without preparation extraction';
    await page.goto(`${origin}/checkup/?for=landlords`);
    await page.getByRole('button', { name: 'Show my saved progress', exact: true }).waitFor();
    await settled(page);
    const idle = report.idleReadCounters = await readCounters(page);
    assert.ok(idle.envelopeRequests > 0);
    assert.ok(idle.checklistRequests > 0);
    assert.deepEqual(idle.preparationRequests, { '2025-26': 0, '2026-27': 0 });
    assert.deepEqual(idle.preparationSlotAccesses, { '2025-26': 0, '2026-27': 0 });
    assert.equal(idle.indexedDbWrites, 0);
    assert.equal(idle.localStorageWrites, 0);
    report.checks.push('Checklist hydration fetched its shared envelope but made zero preparation slot requests or observed preparation slot accesses');

    stage = 'show selected-year counts and bounded next actions';
    await page.getByRole('button', { name: 'Show my saved progress', exact: true }).click();
    const first = page.getByRole('region', { name: 'Your 2025–26 preparation', exact: true });
    await first.waitFor();
    await count(first, 'Unanswered questions', 5);
    await count(first, 'Answers marked “Not sure”', 1);
    await count(first, 'Evidence collected', 1);
    await count(first, 'Evidence unresolved', 1);
    await count(first, 'Employment records unresolved', 1);
    await first.getByText(/1 P45 or other record needs/).waitFor();
    const firstRead = report.firstYearReadCounters = await readCounters(page);
    assert.equal(firstRead.preparationRequests['2025-26'], 1);
    assert.ok(firstRead.preparationSlotAccesses['2025-26'] > 0);
    assert.equal(firstRead.preparationRequests['2026-27'], 0);
    assert.equal(firstRead.preparationSlotAccesses['2026-27'], 0);
    stage = 'verify context-correct next-action destinations';
    const actions = page.getByRole('region', { name: 'Choose a next step', exact: true }).getByRole('link');
    assert.equal(await actions.count(), 3);
    await destination(actions.nth(0), '/prepare?year=2025-26&view=tasks');
    await destination(actions.nth(1), '/books/workspace?activity=uk-property');
    await destination(actions.nth(2), '/passport#passport-income-title');
    stage = 'verify unchanged checklist and saved workspace after progress read';
    assert.equal(await page.getByRole('checkbox').first().isChecked(), true);
    assert.deepEqual(await savedState(setup), baseline);

    stage = 'verify responsive layout and enlarged rendering';
    await checkLayout(page, report, 'overview');

    stage = 'switch preparation year without another read or loss of selector focus';
    const selector = page.getByRole('combobox', { name: 'Preparation tax year', exact: true });
    await selector.focus();
    await selector.selectOption('2026-27');
    await settled(page);
    assert.equal(await selector.evaluate(element => document.activeElement === element), true);
    assert.equal(await first.count(), 0);
    assert.equal(await page.getByRole('region', { name: 'Choose a next step', exact: true }).count(), 0);
    assert.deepEqual(await readCounters(page), firstRead);
    // Follow the real keyboard path from the native selector to the Show button.
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: 'Show my saved progress', exact: true }).evaluate(element => document.activeElement === element), true);
    await page.keyboard.press('Enter');
    const second = page.getByRole('region', { name: 'Your 2026–27 preparation', exact: true });
    await second.waitFor();
    await count(second, 'Unanswered questions', 4);
    await count(second, 'Answers marked “Not sure”', 1);
    await count(second, 'Evidence marked reviewed', 1);
    await count(second, 'Evidence unresolved', 1);
    await second.getByText(/Employment is not marked “Yes”/).waitFor();
    await destination(page.getByRole('link', { name: 'Resume your 2026–27 preparation', exact: true }), '/prepare?year=2026-27&view=tasks');
    assert.ok((await readCounters(page)).preparationSlotAccesses['2026-27'] > 0);
    assert.deepEqual(await savedState(setup), baseline);
    report.checks.push('Explicit Show extracted only the selected year, displayed distinct saved counts, retained three context-correct actions and preserved all saved data');
    report.checks.push('Changing year removed the old overview without a read; keyboard Tab and Enter showed the chosen year');

    for (const year of ['2026-27', '2025-26']) {
      stage = `follow ${year} resume link without an automatic preparation read`;
      if (year === '2025-26') {
        await page.goto(`${origin}/checkup/?for=individuals`);
        await page.getByRole('button', { name: 'Show my saved progress', exact: true }).click();
        await page.getByRole('region', { name: 'Your 2025–26 preparation', exact: true }).waitFor();
      }
      const before = await readCounters(page);
      await page.getByRole('link', { name: `Resume your ${label(year)} preparation`, exact: true }).click();
      await page.waitForURL(url => url.pathname.replace(/\/$/, '') === '/prepare' && url.searchParams.get('year') === year && url.searchParams.get('view') === 'tasks');
      await page.locator('#prepare-year').waitFor();
      assert.equal(await page.locator('#prepare-year').inputValue(), year);
      await settled(page);
      assert.deepEqual(await readCounters(page), before);
      await page.getByRole('button', { name: 'Resume saved preparation', exact: true }).click();
      await page.getByRole('heading', { name: '3. Review', exact: true }).waitFor();
      await page.getByRole('region', { name: 'Your tasks and questions', exact: true }).waitFor();
      await page.getByRole('navigation', { name: 'Preparation steps' }).getByRole('button', { name: 'Step 1 Circumstances', exact: true }).click();
      await page.getByRole('heading', { name: '1. Circumstances', exact: true }).waitFor();
      assert.equal(await page.getByRole('group', { name: 'Employment', exact: true }).getByRole('radio', { name: year === '2025-26' ? 'Yes' : 'No', exact: true }).isChecked(), true);
      const resumed = await readCounters(page);
      assert.ok(resumed.preparationRequests[year] > before.preparationRequests[year]);
      assert.ok(resumed.preparationSlotAccesses[year] > before.preparationSlotAccesses[year]);
      assert.deepEqual(await savedState(setup), baseline);
    }
    report.checks.push('Both task links preselected the correct year without reading it; explicit Resume opened Review with tasks and the matching saved answers, changing no saved data');

    stage = 'inspect first tasks and reveal remaining questions with keyboard focus';
    const reviewStep = page.getByRole('navigation', { name: 'Preparation steps' }).getByRole('button', { name: 'Step 3 Review', exact: true });
    await reviewStep.click();
    const tasks = page.getByRole('region', { name: 'Your tasks and questions', exact: true });
    await tasks.waitFor();
    assert.equal(await tasks.getByRole('listitem').count(), 3);
    const expand = tasks.getByRole('button', { name: /^Show all \d+ tasks and questions$/ });
    await expand.focus();
    await page.keyboard.press('Enter');
    assert.ok(await tasks.getByRole('listitem').count() > 3);
    await focused(tasks.getByRole('listitem').nth(3).getByRole('heading'));
    const taskText = await tasks.textContent();
    for (const value of Object.values(syntheticEmployment)) assert.equal(taskText.includes(value), false);
    await tasks.getByRole('button', { name: 'Show first 3 tasks and questions', exact: true }).click();
    await focused(tasks.getByRole('button', { name: /^Show all \d+ tasks and questions$/ }));
    stage = 'verify task guidance layout at narrow widths and enlarged rendering';
    await checkLayout(page, report, 'tasks');
    report.checks.push('Review shows three concrete tasks initially; expanding reveals remaining questions with keyboard focus and no employment labels, figures or notes in the generated task text');

    stage = 'follow an uncertain property task to its selected answer';
    const task = title => tasks.getByRole('listitem').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await tasks.getByRole('button', { name: /^Show all \d+ tasks and questions$/ }).click();
    await task('Clarify: Property income').getByRole('button', { name: 'Review this answer', exact: true }).click();
    const property = page.getByRole('group', { name: 'Property income', exact: true });
    await focused(property.getByRole('radio', { name: 'Not sure', exact: true }));
    await property.getByRole('radio', { name: 'No', exact: true }).check();
    await reviewStep.click();
    await tasks.waitFor();
    const remaining = tasks.getByRole('button', { name: /^Show all \d+ tasks and questions$/ });
    if (await remaining.count()) await remaining.click();
    assert.equal(await task('Clarify: Property income').count(), 0);
    assert.deepEqual(await savedState(setup), baseline);
    assert.equal((await readCounters(page)).indexedDbWrites, 0);
    assert.equal((await readCounters(page)).localStorageWrites, 0);
    report.checks.push('A property question focused its selected Not sure answer; changing it to No removed the corresponding on-page task without saving or changing the persisted workspace');

    stage = 'follow unsupported employment task to the employment heading';
    await task('Follow up P45 or other employment documents').getByRole('button', { name: 'Open this evidence', exact: true }).click();
    await focused(page.getByRole('heading', { name: 'Your employment documents', exact: true }));
    await reviewStep.click();
    stage = 'preview fixed task questions with the correct year and optional figures excluded';
    assert.equal(await page.getByRole('checkbox', { name: 'Include employment figures', exact: true }).isChecked(), false);
    assert.equal(await page.getByRole('checkbox', { name: 'Include my employment notes', exact: true }).isChecked(), false);
    await page.getByRole('button', { name: 'Preview summary', exact: true }).click();
    const preview = page.getByLabel('Preparation summary preview', { exact: true });
    await preview.waitFor();
    const summary = await preview.textContent();
    assert.ok(summary.includes('Preparation actions and questions'));
    assert.ok(summary.includes('Tax year: 2025–26'));
    assert.ok(summary.includes('Question for HMRC or an adviser:'));
    assert.ok(summary.includes('How should I use my P45 or other employment documents'));
    assert.equal(summary.includes(syntheticEmployment.pay), false);
    assert.equal(summary.includes(syntheticEmployment.tax), false);
    assert.equal(summary.includes(syntheticEmployment.notes), false);
    assert.equal(await page.getByRole('button', { name: 'Download plain-text summary', exact: true }).isDisabled(), true);
    assert.deepEqual(await savedState(setup), baseline);
    report.checks.push('The P45 follow-up focused employment evidence; the deliberate summary preview included current tasks, adviser questions and the selected year while omitting optional figures and notes, with download still awaiting acknowledgement');

    stage = 'discard only unsaved task-answer edits before choosing another year';
    await page.getByRole('button', { name: 'Choose another tax year', exact: true }).click();
    await page.getByRole('button', { name: 'Discard unsaved changes', exact: true }).click();
    await page.locator('#prepare-year').waitFor();
    assert.deepEqual(await savedState(setup), baseline);
    report.checks.push('Explicit discard returned to the year chooser and left the original saved preparations and checklist unchanged');

    for (const missing of [true, false]) {
      stage = `check ${missing ? 'missing' : 'damaged'} preparation without fabricated counts or replacement`;
      await replaceSyntheticSlot(setup, '2026-27', missing);
      const altered = await savedState(setup);
      await page.goto(`${origin}/checkup/?for=individuals`);
      await page.getByRole('combobox', { name: 'Preparation tax year', exact: true }).selectOption('2026-27');
      await page.getByRole('button', { name: 'Show my saved progress', exact: true }).click();
      const region = page.getByRole('region', { name: 'Your 2026–27 preparation', exact: true });
      await region.waitFor();
      assert.equal(await region.locator('dl').count(), 0);
      await region.getByText(missing ? /No saved preparation was found/ : /could not be read/).waitFor();
      await page.getByRole('link', { name: `${missing ? 'Start' : 'Check'} your 2026–27 preparation`, exact: true }).click();
      await page.locator('#prepare-year').waitFor();
      assert.equal(await page.locator('#prepare-year').inputValue(), '2026-27');
      if (!missing) {
        await page.getByRole('button', { name: 'Resume saved preparation', exact: true }).click();
        await page.getByRole('alert').waitFor();
        assert.equal(await page.getByRole('heading', { name: '1. Circumstances', exact: true }).count(), 0);
      }
      assert.deepEqual(await savedState(setup), altered);
    }
    report.checks.push('Missing and damaged synthetic drafts displayed no invented counts; exact-year links and a failed damaged-draft resume preserved the saved workspace');
    assert.equal(report.pageErrorCount, 0);
    assert.equal(report.blockedExternalRequests, 0);
    report.status = 'pass';
  } catch (error) {
    report.status = 'fail'; report.failedStage = stage; report.failureCategory = safeError(error);
    process.exitCode = 1;
  } finally {
    if (context) { await context.close(); report.cleanup.contextClosed = true; }
    if (browser) { await browser.close(); report.cleanup.browserClosed = true; }
    report.finishedAt = new Date().toISOString();
    await fs.mkdir(results, { recursive: true });
    await fs.writeFile(path.join(results, 'preparation-progress-browser-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  }
}

if (require.main === module) run().catch(() => { console.error('Preparation progress browser smoke cleanup failed.'); process.exitCode = 1; });
module.exports = { run };
