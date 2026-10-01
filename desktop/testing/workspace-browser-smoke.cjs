// Requires installed Google Chrome and the current static frontend on
// http://127.0.0.1:4318. Chrome always starts with a temporary profile.
// Uses a disposable browser context and synthetic saved work only. No provider
// requests, existing browser profile, saved password or raw tax-data report.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { chromium } = require('playwright');
const { childEnvironment, checkoutState, safeError } = require('./runtime-smoke.cjs');

const origin = 'http://127.0.0.1:4318';
const results = path.resolve(__dirname, '../test-results');
const passwordAcknowledgement = 'I understand that TaxSorted cannot reset this password or recover the backup without it.';

async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('keyval-store');
    open.onerror = () => reject(new Error('Synthetic workspace read failed'));
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('keyval', 'readonly');
      const request = tx.objectStore('keyval').get('taxsorted-local-workspace-v1');
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onerror = tx.onabort = () => { db.close(); reject(new Error('Synthetic workspace read failed')); };
    };
  }));
}

async function run() {
  const report = {
    schema: 'taxsorted.workspace-browser-smoke/1', startedAt: new Date().toISOString(),
    ...checkoutState(childEnvironment()), status: 'running', data: 'synthetic only',
    checkoutMetadataMeaning: 'Working checkout at test start; not a claim of static build provenance.',
    testedOrigin: origin, platform: process.platform, arch: process.arch, osVersion: os.release(),
    nodeVersion: process.version, playwrightVersion: require('playwright/package.json').version,
    browserChannel: 'chrome', viewportChecks: [],
    checks: [], pageErrorCount: 0, blockedExternalRequests: 0,
    cleanup: { browserClosed: false, temporaryFilesRemoved: false },
  };
  let stage = 'launch isolated browser';
  let browser;
  let temporary;
  try {
    await fs.mkdir(results, { recursive: true });
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-workspace-browser-'));
    browser = await chromium.launch({ channel: 'chrome', headless: true, chromiumSandbox: true, env: childEnvironment() });
    report.browserVersion = browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    context.on('page', page => {
      page.on('pageerror', () => { report.pageErrorCount += 1; });
      page.setDefaultTimeout(10_000);
    });
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      report.blockedExternalRequests += 1;
      return route.abort();
    });
    await context.addInitScript(() => {
      globalThis.__workspaceBrowserReads = { indexedDbOpens: 0, indexedDbReads: 0, storedTaxReads: 0 };
      const open = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (...args) {
        globalThis.__workspaceBrowserReads.indexedDbOpens += 1;
        return open.apply(this, args);
      };
      for (const method of ['get', 'getAll', 'getAllKeys', 'getKey', 'openCursor', 'openKeyCursor', 'count']) {
        const original = IDBObjectStore.prototype[method];
        IDBObjectStore.prototype[method] = function (...args) {
          globalThis.__workspaceBrowserReads.indexedDbReads += 1;
          return original.apply(this, args);
        };
      }
      const getItem = Storage.prototype.getItem;
      const taxKeys = new Set(['taxsorted.tax-checklist-v1', 'taxsorted-local-books-v2', 'taxsorted-records-v1', 'taxsorted-tax-position-passport-draft-v1', 'taxsorted-return-preparation-v1:2025-26', 'taxsorted-return-preparation-v1:2026-27']);
      Storage.prototype.getItem = function (key) {
        if (taxKeys.has(key)) globalThis.__workspaceBrowserReads.storedTaxReads += 1;
        return getItem.call(this, key);
      };
    });
    const recovery = await context.newPage();
    stage = 'verify deliberate-read boundary';
    await recovery.goto(`${origin}/backups/`);
    await recovery.getByRole('button', { name: 'Prepare a workspace backup', exact: true }).waitFor();
    // Allow hydration and two rendered frames before checking the idle page.
    await recovery.waitForTimeout(300);
    report.idleReadCounters = await recovery.evaluate(() => globalThis.__workspaceBrowserReads);
    assert.equal(report.idleReadCounters.indexedDbReads, 0);
    assert.equal(report.idleReadCounters.storedTaxReads, 0);
    for (const width of [1440, 375, 320]) {
      stage = `verify workspace layout at ${width} pixels`;
      await recovery.setViewportSize({ width, height: 1000 });
      const horizontalOverflow = await recovery.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      report.viewportChecks.push({ width, height: 1000, horizontalOverflow });
      assert.equal(horizontalOverflow, false);
    }
    await recovery.setViewportSize({ width: 375, height: 1000 });
    await recovery.screenshot({ path: path.join(results, 'workspace-browser-mobile.png'), fullPage: true });
    await recovery.setViewportSize({ width: 1440, height: 1000 });
    report.checks.push('Workspace page opens with zero observed saved-data reads; no overflow at 320, 375 or 1440 pixels');

    stage = 'save synthetic Passport';
    const setup = await context.newPage();
    await setup.goto(`${origin}/passport/`);
    await setup.locator('input[name="passport-income-employment"][value="yes"]').check();
    await setup.getByRole('button', { name: 'Save this Passport', exact: true }).click();
    await setup.getByText(/^Saved in this browser /).waitFor();

    stage = 'save synthetic preparation';
    await setup.goto(`${origin}/prepare/`);
    await setup.locator('#prepare-year').selectOption('2025-26');
    await setup.getByRole('button', { name: 'Start preparation', exact: true }).click();
    await setup.getByRole('group', { name: 'Employment', exact: true }).getByRole('radio', { name: 'Yes', exact: true }).check();
    await setup.getByRole('button', { name: 'Save preparation on this device', exact: true }).click();
    await setup.getByText('Preparation saved on this device. No information was uploaded.', { exact: true }).waitFor();

    stage = 'save synthetic checklist';
    await setup.goto(`${origin}/checkup/?for=landlords`);
    await setup.getByRole('checkbox').first().check();
    await setup.getByRole('button', { name: 'Save checklist', exact: true }).click();
    await setup.getByRole('status').filter({ hasText: 'Checklist saved on this device.' }).waitFor();
    await setup.close();

    const password = randomBytes(32).toString('base64');
    const backup = path.join(temporary, 'workspace.encrypted.json');
    async function protect() {
      await recovery.getByLabel('Backup password', { exact: true }).fill(password);
      await recovery.getByLabel('Repeat backup password', { exact: true }).fill(password);
      await recovery.getByRole('checkbox', { name: passwordAcknowledgement, exact: true }).check();
    }
    async function download(name, destination) {
      const pending = recovery.waitForEvent('download');
      await recovery.getByRole('button', { name, exact: true }).click();
      const item = await pending;
      await item.saveAs(destination);
      assert.equal(await item.failure(), null);
    }
    stage = 'download synthetic encrypted workspace through the UI';
    await recovery.getByRole('button', { name: 'Prepare a workspace backup', exact: true }).click();
    await recovery.getByRole('heading', { name: 'Check your saved workspace', exact: true }).waitFor();
    assert.ok((await recovery.evaluate(() => globalThis.__workspaceBrowserReads)).indexedDbReads > 0);
    await protect();
    await download('Download protected workspace backup', backup);
    assert.equal(JSON.parse(await fs.readFile(backup, 'utf8')).schema, 'taxsorted.encrypted-workspace-backup/1');
    const beforeRestore = await snapshot(recovery);

    stage = 'leave three older editors open with unsaved synthetic changes';
    const passport = await context.newPage();
    await passport.goto(`${origin}/passport/`);
    await passport.locator('input[name="passport-income-employment"][value="yes"]').waitFor();
    assert.equal(await passport.locator('input[name="passport-income-employment"][value="yes"]').isChecked(), true);
    await passport.locator('input[name="passport-income-employment"][value="no"]').check();
    const preparation = await context.newPage();
    await preparation.goto(`${origin}/prepare/`);
    await preparation.locator('#prepare-year').selectOption('2025-26');
    await preparation.getByRole('button', { name: 'Resume saved preparation', exact: true }).click();
    await preparation.getByRole('group', { name: 'Employment', exact: true }).getByRole('radio', { name: 'No', exact: true }).check();
    const checklist = await context.newPage();
    await checklist.goto(`${origin}/checkup/?for=landlords`);
    assert.equal(await checklist.getByRole('checkbox').first().isChecked(), true);
    await checklist.getByRole('checkbox').first().uncheck();

    stage = 'restore through preview and required encrypted safety-copy flow';
    await recovery.getByLabel('Choose a workspace backup to restore', { exact: true }).setInputFiles(backup);
    await recovery.getByLabel('Password for this backup', { exact: true }).fill(password);
    await recovery.getByRole('button', { name: 'Unlock workspace preview', exact: true }).click();
    await recovery.getByRole('heading', { name: 'Check before replacing saved work', exact: true }).waitFor();
    await protect();
    await download('Download protected safety copy', path.join(temporary, 'safety-copy.encrypted.json'));
    await recovery.getByRole('checkbox', { name: /^I have checked that the safety copy was saved/ }).check();
    await recovery.getByRole('button', { name: 'Replace saved workspace', exact: true }).click();
    await recovery.getByRole('status').filter({ hasText: 'Your saved workspace was replaced.' }).waitFor();
    const restored = await snapshot(recovery);
    assert.notEqual(restored.generation, beforeRestore.generation);
    for (const key of ['taxsorted-tax-position-passport-draft-v1', 'taxsorted-return-preparation-v1:2025-26', 'taxsorted.tax-checklist-v1']) assert.deepEqual(restored.values[key], beforeRestore.values[key]);
    report.checks.push('Real encrypted download, protected safety copy and confirmed restore changed the workspace generation while preserving saved synthetic work');

    stage = 'reject stale preparation save in another tab';
    await preparation.getByRole('button', { name: 'Save preparation on this device', exact: true }).click();
    await preparation.getByRole('alert').filter({ hasText: 'Your changes could not be saved.' }).waitFor();
    assert.equal(await preparation.getByRole('group', { name: 'Employment', exact: true }).getByRole('radio', { name: 'No', exact: true }).isChecked(), true);
    assert.deepEqual(await snapshot(recovery), restored);
    report.checks.push('Stale preparation save is refused; unsaved entries remain visible and restored state is unchanged');

    stage = 'reject stale Passport save in another tab';
    await passport.getByRole('button', { name: 'Save this Passport', exact: true }).click();
    await passport.getByRole('alert').filter({ hasText: 'This workspace changed after you opened it.' }).waitFor();
    assert.equal(await passport.locator('input[name="passport-income-employment"][value="no"]').isChecked(), true);
    assert.deepEqual(await snapshot(recovery), restored);
    report.checks.push('Stale Passport save is refused; unsaved entries remain visible and restored state is unchanged');

    stage = 'reject stale checklist save in another tab';
    await checklist.getByRole('button', { name: 'Save checklist', exact: true }).click();
    await checklist.getByRole('alert').filter({ hasText: 'This workspace changed after you opened it.' }).waitFor();
    assert.equal(await checklist.getByRole('checkbox').first().isChecked(), false);
    assert.deepEqual(await snapshot(recovery), restored);
    report.checks.push('Stale checklist save is refused; unsaved checkmarks remain visible and restored state is unchanged');
    assert.equal(report.pageErrorCount, 0);
    assert.equal(report.blockedExternalRequests, 0);
    report.status = 'pass';
  } catch (error) {
    report.status = 'fail'; report.failedStage = stage; report.failureCategory = safeError(error);
    process.exitCode = 1;
  } finally {
    if (browser) { await browser.close(); report.cleanup.browserClosed = true; }
    if (temporary) { await fs.rm(temporary, { recursive: true, force: true }); report.cleanup.temporaryFilesRemoved = true; }
    report.finishedAt = new Date().toISOString();
    await fs.mkdir(results, { recursive: true });
    await fs.writeFile(path.join(results, 'workspace-browser-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  }
}

if (require.main === module) run().catch(() => { console.error('Workspace browser smoke cleanup failed.'); process.exitCode = 1; });
module.exports = { run };
