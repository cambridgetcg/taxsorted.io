#!/usr/bin/env node
'use strict';

// Supplemental SOURCE-mode automation, not consumer/manual acceptance. Uses the
// real native dialogs through already-granted Accessibility access; it never
// replaces Electron's dialog methods or sets a DownloadItem's save path.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash, createDecipheriv, pbkdf2Sync, randomBytes } = require('node:crypto');
const { _electron } = require('playwright');
const { childEnvironment, checkoutState, safeError } = require('./runtime-smoke.cjs');
const { regularFiles } = require('./inspect-package.cjs');

const desktop = path.resolve(__dirname, '..');
const acknowledgement = 'I understand that TaxSorted cannot reset this password or recover the backup without it.';

async function until(read, milliseconds = 10_000) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    const value = await read();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Object.assign(new Error('Native dialog observation timed out'), { code: 'DIALOG_TIMEOUT' });
}

async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('keyval-store');
    open.onerror = () => reject(new Error('Synthetic snapshot unavailable'));
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction('keyval', 'readonly');
      const values = transaction.objectStore('keyval').getAll();
      const keys = transaction.objectStore('keyval').getAllKeys();
      transaction.oncomplete = () => {
        database.close();
        resolve({ keys: keys.result, values: values.result, legacyChecklist: localStorage.getItem('taxsorted.tax-checklist-v1') });
      };
      transaction.onerror = transaction.onabort = () => { database.close(); reject(new Error('Synthetic snapshot failed')); };
    };
  }));
}

function decrypt(envelope, password) {
  assert.equal(envelope.schema, 'taxsorted.encrypted-workspace-backup/1');
  assert.deepEqual(Object.keys(envelope.kdf).sort(), ['hash', 'iterations', 'name', 'salt']);
  assert.deepEqual(Object.keys(envelope.cipher).sort(), ['iv', 'keyLength', 'name', 'tagLength']);
  assert.equal(envelope.kdf.iterations, 600_000);
  assert.equal(envelope.kdf.name, 'PBKDF2');
  assert.equal(envelope.kdf.hash, 'SHA-256');
  assert.equal(envelope.cipher.name, 'AES-GCM');
  assert.equal(envelope.cipher.keyLength, 256);
  assert.equal(envelope.cipher.tagLength, 128);
  function base64(value) {
    assert.equal(typeof value, 'string');
    const decoded = Buffer.from(value, 'base64');
    assert.equal(decoded.toString('base64'), value);
    return decoded;
  }
  const salt = base64(envelope.kdf.salt);
  const iv = base64(envelope.cipher.iv);
  const ciphertext = base64(envelope.ciphertext);
  assert.equal(salt.length, 16);
  assert.equal(iv.length, 12);
  assert.ok(ciphertext.length > 16 && ciphertext.length <= 12 * 1024 * 1024 + 16);
  const key = pbkdf2Sync(password, salt, 600_000, 32, 'sha256');
  let plaintext;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAAD(Buffer.from(JSON.stringify({ schema: envelope.schema, kdf: envelope.kdf, cipher: envelope.cipher })));
    decipher.setAuthTag(ciphertext.subarray(-16));
    plaintext = Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } finally { key.fill(0); plaintext?.fill(0); }
}

function checklistFrom(saved) {
  const records = Object.fromEntries(saved.keys.map((key, index) => [key, saved.values[index]]));
  const workspace = records['taxsorted-local-workspace-v1'];
  const raw = workspace ? workspace.values['taxsorted.tax-checklist-v1'] : records['taxsorted.tax-checklist-v1'] ?? saved.legacyChecklist;
  return JSON.parse(raw);
}

async function run() {
  const env = childEnvironment();
  const report = {
    schema: 'taxsorted.macos-native-dialogs/1', startedAt: new Date().toISOString(),
    ...checkoutState(env), platform: process.platform, arch: process.arch, osVersion: os.release(),
    mode: 'source', status: 'running', data: 'synthetic only',
    limits: 'Supplemental Accessibility automation in an existing development OS account with a disposable source profile. Not a packaged installer, human observation, screen-reader, reboot, physical offline, Intel hardware or cross-platform acceptance result. Downloads directory is redirected only inside this test process.',
    manualAcceptance: 'NOT RUN', checks: [], rendererErrorCount: 0,
    cleanup: { appClosed: false, temporaryFilesRemoved: false },
  };
  let owned;
  let app;
  let helper;
  let stage = 'verify macOS and compile scoped Accessibility helper';
  try {
    assert.equal(process.platform, 'darwin');
    assert.equal(process.argv.length, 2, 'This source-only check accepts no arguments');
    owned = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-native-dialogs-'));
    helper = path.join(owned, 'native-dialog-accessibility');
    execFileSync('/usr/bin/swiftc', [path.join(__dirname, 'macos-dialog-accessibility.swift'), '-o', helper], {
      env, timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const downloads = path.join(owned, 'exports');
    await fs.mkdir(downloads, { mode: 0o700 });
    const profile = path.join(owned, 'profile');
    const executable = require('./doctor.cjs').electronExecutablePath();
    const bundleHash = createHash('sha256');
    const bundleFiles = await regularFiles(path.join(desktop, 'bundle'));
    for (const name of bundleFiles) {
      bundleHash.update(name + '\0');
      bundleHash.update(createHash('sha256').update(await fs.readFile(path.join(desktop, 'bundle', name))).digest());
    }
    report.stagedPages = { files: bundleFiles.length, sha256: bundleHash.digest('hex'), meaning: 'Sorted relative names, NUL separator and binary SHA-256 of each staged file; identifies tested staging only.' };

    stage = 'launch isolated source app';
    app = await _electron.launch({ executablePath: executable, args: [desktop, `--profile-dir=${profile}`], env, chromiumSandbox: true, timeout: 15_000 });
    const runtime = await app.evaluate(({ app, BrowserWindow }) => ({
      packaged: app.isPackaged, userData: app.getPath('userData'), sessionData: app.getPath('sessionData'),
      electron: process.versions.electron, arch: process.arch,
      sandbox: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().sandbox,
      noSandbox: app.commandLine.hasSwitch('no-sandbox'),
    }));
    assert.equal(runtime.packaged, false);
    assert.equal(runtime.userData, profile);
    assert.equal(runtime.sessionData, profile);
    assert.equal(runtime.arch, process.arch);
    assert.equal(runtime.sandbox, true);
    assert.equal(runtime.noSandbox, false);
    report.runtime = { electron: runtime.electron, arch: runtime.arch, isolatedProfile: true, sandboxPreference: true, noSandboxSwitch: false };
    // The normal profile and OS Downloads preferences are never changed.
    await app.evaluate(({ app }, location) => app.setPath('downloads', location), downloads);
    const accessibility = operation => {
      try {
        return JSON.parse(execFileSync(helper, [
          '--pid', String(app.process().pid), '--executable', executable, operation,
        ], { env, timeout: 8_000, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }));
      } catch (error) {
        // The helper emits only its fixed schema/allowlisted reason codes. Never
        // include raw command diagnostics or the executable/profile path.
        try {
          const failure = JSON.parse(String(error.stdout));
          if (failure.schema === 'taxsorted.macos-native-dialog/1' && /^[a-z-]{1,50}$/.test(failure.reason)) {
            error.code = failure.reason.replaceAll('-', '_').toUpperCase();
          }
        } catch { /* Keep only safeError's bounded classification. */ }
        throw error;
      }
    };
    const native = async name => {
      await until(() => accessibility('inspect').knownButtons?.includes(name));
      const result = accessibility(name);
      assert.equal(result.succeeded, true);
      await until(() => accessibility('inspect').sheetCount === 0);
    };
    const page = await app.firstWindow();
    page.setDefaultTimeout(10_000);
    page.setDefaultNavigationTimeout(10_000);
    page.on('pageerror', () => { report.rendererErrorCount += 1; });
    stage = 'save synthetic checklist';
    await page.goto('taxsorted://app/checkup/?for=landlords');
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Save checklist', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Checklist saved on this device.' }).waitFor();
    const before = await snapshot(page);
    assert.ok(before.keys.includes('taxsorted.tax-checklist-v1') || before.keys.includes('taxsorted-local-workspace-v1'));
    const originalChecklist = checklistFrom(before);
    assert.equal(originalChecklist.audience, 'landlords');
    assert.equal(originalChecklist.checked.landlords.length, 1);

    stage = 'cancel actual native workspace file picker';
    await page.goto('taxsorted://app/backups/');
    const input = page.getByLabel('Choose a workspace backup to restore', { exact: true });
    await input.click();
    await native('Cancel');
    assert.equal(await input.inputValue(), '');
    assert.deepEqual(await snapshot(page), before);
    report.checks.push('Actual native restore picker Cancel leaves selection empty and saved workspace unchanged');

    stage = 'prepare synthetic protected workspace export';
    await page.getByRole('button', { name: 'Prepare a workspace backup', exact: true }).click();
    await page.getByRole('heading', { name: 'Check your saved workspace', exact: true }).waitFor();
    // Deliberate preparation may adopt the legacy slots into the canonical
    // workspace. Check that it preserves data, then compare subsequent native
    // Save actions against this post-adoption storage baseline.
    const prepared = await snapshot(page);
    assert.deepEqual(checklistFrom(prepared), originalChecklist);
    const password = randomBytes(32).toString('base64');
    async function prepareDownload() {
      await page.getByLabel('Backup password', { exact: true }).fill(password);
      await page.getByLabel('Repeat backup password', { exact: true }).fill(password);
      await page.getByRole('checkbox', { name: acknowledgement, exact: true }).check();
      // Observe only. In particular, do not call item.setSavePath or change the
      // native dialog options; the app's production will-download handler runs.
      await app.evaluate(({ session }) => {
        globalThis.__taxsortedNativeDialogResult = null;
        session.defaultSession.once('will-download', (_event, item) => {
          item.once('done', (_event, state) => { globalThis.__taxsortedNativeDialogResult = state; });
        });
      });
      await page.getByRole('button', { name: 'Download protected workspace backup', exact: true }).click();
    }
    const downloadResult = () => until(() => app.evaluate(() => globalThis.__taxsortedNativeDialogResult));

    stage = 'cancel actual native Save dialog';
    await prepareDownload();
    await native('Cancel');
    assert.equal(await downloadResult(), 'cancelled');
    assert.deepEqual(await fs.readdir(downloads), []);
    assert.deepEqual(await snapshot(page), prepared);
    assert.equal(await page.getByLabel('Backup password', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Repeat backup password', { exact: true }).inputValue(), '');
    report.checks.push('Actual native Save Cancel reports cancellation, creates no export and preserves saved workspace');

    stage = 'save through actual native Save dialog';
    await prepareDownload();
    await native('Save export');
    assert.equal(await downloadResult(), 'completed');
    const files = await fs.readdir(downloads);
    assert.equal(files.length, 1);
    const saved = path.join(downloads, files[0]);
    const stat = await fs.lstat(saved);
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    assert.ok(stat.size > 0 && stat.size <= 17 * 1024 * 1024);
    const bytes = await fs.readFile(saved);
    const envelope = JSON.parse(bytes.toString('utf8'));
    assert.deepEqual(Object.keys(envelope).sort(), ['cipher', 'ciphertext', 'kdf', 'schema']);
    const recovered = decrypt(envelope, password);
    assert.equal(recovered.schema, 'taxsorted.workspace-backup/1');
    assert.deepEqual(recovered.checklist, originalChecklist);
    assert.equal(recovered.books, null);
    assert.equal(recovered.passport, null);
    assert.deepEqual(recovered.preparations, { '2025-26': null, '2026-27': null });
    assert.deepEqual(await snapshot(page), prepared);
    report.checks.push('Actual native Save export creates one encrypted file; independent decryption recovers the synthetic checklist; saved workspace unchanged');
    assert.equal(report.rendererErrorCount, 0);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = { stage, ...safeError(error) };
  } finally {
    if (app) {
      // Only the process launched here and its synthetic profile can be closed.
      // A hung app leaves its files in place for diagnosis instead of deleting
      // storage beneath a running process.
      try {
        // Playwright disposes its protocol object when close completes, so
        // app.process() can become undefined afterwards. Keep the actual child
        // handle while it is still attached, then verify that owned child exited.
        const child = app.process();
        assert.ok(child?.pid, 'Owned Electron child is unavailable');
        let timer;
        try { await Promise.race([app.close(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Close timeout')), 10_000); })]); }
        finally { clearTimeout(timer); }
        await until(() => child.exitCode !== null || child.signalCode !== null, 5_000);
        report.cleanup.appClosed = true;
      } catch { report.cleanup.appClosed = false; }
    } else report.cleanup.appClosed = true;
    if (owned && report.cleanup.appClosed) {
      try { await fs.rm(owned, { recursive: true, force: true }); report.cleanup.temporaryFilesRemoved = true; }
      catch { report.cleanup.temporaryFilesRemoved = false; }
    }
    if (!report.cleanup.appClosed || (owned && !report.cleanup.temporaryFilesRemoved)) report.status = 'failed';
    report.finishedAt = new Date().toISOString();
    await fs.mkdir(path.join(desktop, 'test-results'), { recursive: true });
    await fs.writeFile(path.join(desktop, 'test-results/macos-native-dialogs.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  }
  console.log(`${report.status === 'passed' ? 'PASS' : 'FAIL'}: supplemental macOS native dialogs. Evidence: desktop/test-results/macos-native-dialogs.json`);
  return report.status === 'passed' ? 0 : 1;
}

if (require.main === module) run().then(code => { process.exitCode = code; }).catch(() => {
  console.error('Native dialog check could not complete; inspect the local sanitised report.'); process.exitCode = 1;
});
