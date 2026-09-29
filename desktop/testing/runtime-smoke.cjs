#!/usr/bin/env node
'use strict';

// Exercises the real app with synthetic data. No production preference bypass,
// network-policy replacement, preload, or renderer bridge is installed here.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { constants: fileModes } = require('node:fs');

const desktopRoot = path.resolve(__dirname, '..');
const projectRoot = path.dirname(desktopRoot);
const timeoutMs = 30_000;

function optionsFrom(args) {
  const options = { mode: 'source', executable: null, disposableAccount: false };
  for (const argument of args) {
    if (argument.startsWith('--mode=')) options.mode = argument.slice(7);
    else if (argument.startsWith('--executable=')) options.executable = argument.slice(13);
    else if (argument === '--disposable-os-account') options.disposableAccount = true;
    else if (argument === '--report-name=installed-smoke') options.reportName = 'installed-smoke';
    else if (argument === '--expect-appimage') options.expectAppImage = true;
    else throw new Error('Unknown option. Use --mode=source or --mode=packaged --executable=<native executable> --disposable-os-account.');
  }
  if (!['source', 'packaged'].includes(options.mode)) throw new Error('Mode must be source or packaged.');
  if (options.mode === 'source' && (options.executable || options.disposableAccount)) throw new Error('Source mode uses the installed Electron runtime and a fresh temporary profile.');
  if (options.mode === 'packaged' && (!options.executable || !options.disposableAccount)) throw new Error('Packaged tests require --executable=<native executable> and --disposable-os-account. Run only in a disposable OS account or isolated CI runner.');
  if (options.mode !== 'packaged' && (options.reportName || options.expectAppImage)) throw new Error('Installer evidence requires packaged mode.');
  return options;
}

function childEnvironment() {
  // Retain platform/GUI essentials; do not forward cloud credentials, runtime
  // injection flags, Playwright debug logging or broad agent environments.
  const names = [
    'PATH', 'Path', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA',
    'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'TMPDIR',
    'USER', 'USERNAME', 'LOGNAME', 'SHELL', 'DISPLAY', 'WAYLAND_DISPLAY',
    'XDG_CONFIG_HOME', 'XDG_RUNTIME_DIR', 'XDG_DATA_DIRS', 'DBUS_SESSION_BUS_ADDRESS',
    'XAUTHORITY', 'LANG', 'LANGUAGE', 'LC_ALL', 'LC_CTYPE', 'LC_MESSAGES', 'CI',
  ];
  const env = {};
  for (const name of names) if (typeof process.env[name] === 'string') env[name] = process.env[name];
  if (process.env.APPIMAGE_EXTRACT_AND_RUN === '1') env.APPIMAGE_EXTRACT_AND_RUN = '1';
  return env;
}

function normalProfile(env) {
  let appData;
  if (process.platform === 'darwin') appData = path.join(os.homedir(), 'Library', 'Application Support');
  else if (process.platform === 'win32') {
    if (!env.APPDATA) throw new Error('Windows APPDATA must be available to verify a fresh packaged profile.');
    appData = env.APPDATA;
  } else appData = env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(appData, 'TaxSorted Local');
}

async function absent(filename) {
  try { await fs.lstat(filename); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

async function bounded(promise, label, milliseconds = timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timeout: ${label}`)), milliseconds); }),
    ]);
  } finally { clearTimeout(timer); }
}

async function waitUntil(read, label, milliseconds = timeoutMs) {
  const until = Date.now() + milliseconds;
  while (Date.now() < until) {
    const value = await bounded(read(), label, Math.max(1, until - Date.now()));
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timeout: ${label}`);
}

function safeError(error) {
  const code = typeof error?.code === 'string' && /^[A-Z_0-9]{1,60}$/.test(error.code) ? error.code : undefined;
  const name = typeof error?.name === 'string' && /^[A-Za-z]{1,60}$/.test(error.name) ? error.name : 'Error';
  // Commands, environments, private paths and raw app error text are not reports.
  return { type: name, ...(code ? { code } : {}) };
}

function refusal(code, message) {
  return Object.assign(new Error(message), { code });
}

function checkoutState(env) {
  try {
    const options = { cwd: projectRoot, env, encoding: 'utf8', timeout: 3_000, stdio: ['ignore', 'pipe', 'ignore'] };
    const value = execFileSync('git', ['rev-parse', 'HEAD'], options).trim();
    const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], options);
    return { checkoutCommit: /^[a-f0-9]{40,64}$/.test(value) ? value : null, checkoutHadLocalChanges: status.length > 0 };
  } catch { return { checkoutCommit: null, checkoutHadLocalChanges: null }; }
}

async function run(options) {
  const env = childEnvironment();
  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid;
  const results = path.join(desktopRoot, 'test-results');
  const reportPath = path.join(results, `${options.reportName || `${options.mode}-smoke`}.json`);
  const report = {
    schema: 'taxsorted.desktop-runtime-smoke/1', runId, mode: options.mode,
    platform: process.platform, arch: process.arch, osVersion: os.release(),
    ...checkoutState(env),
    checkoutMetadataMeaning: 'The test checkout at run start; not build provenance for a packaged artifact. Runtime and bundled artifact evidence are checked separately.',
    startedAt: new Date().toISOString(), status: 'running',
    data: 'synthetic only', checks: [], rendererErrorCount: 0, remoteObserverHits: 0,
    cleanup: { appClosed: false, observerClosed: false, temporaryFilesRemoved: false, packagedProfileRemoved: false },
  };
  let stage = 'prepare isolated test environment';
  let temporary;
  let expectedProfile;
  let profileVerified = false;
  let packagedLock;
  let app;
  let shutdownConfirmed = true;
  const appImageMounts = new Set();
  let spy;
  let hits = 0;
  let failed = false;

  const check = (name, detail) => report.checks.push({ name, ...(detail ? { detail } : {}) });
  const evaluate = (callback, argument) => bounded(app.evaluate(callback, argument), stage);

  async function closeApp() {
    if (!app) {
      if (!shutdownConfirmed) throw refusal('APP_SHUTDOWN_UNCONFIRMED', 'Test files are retained because app shutdown could not be confirmed.');
      return;
    }
    const closing = app;
    app = undefined;
    try {
      await bounded(closing.close(), 'close test app', 15_000);
      if (options.expectAppImage && appImageMounts.size) {
        await waitUntil(async () => {
          const entries = (await fs.readFile('/proc/self/mountinfo', 'utf8')).split('\n');
          const mounted = entries.map(line => (line.split(' ')[4] || '').replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8))));
          return [...appImageMounts].every(directory => !mounted.includes(directory));
        }, 'release AppImage FUSE mounts', 10_000);
        report.appImage.mountsReleased = true;
      }
      shutdownConfirmed = true;
    } catch (error) {
      // A forced stop is best effort. Keep cleanup unconfirmed after a failed
      // graceful close, even when the launcher exits, so no profile is removed.
      const child = closing.process();
      try {
        if (child.pid && process.platform === 'win32') {
          // Playwright launches Electron through cmd.exe on Windows; killing
          // that shell alone leaves Electron and its renderer processes alive.
          execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { env, stdio: 'ignore', windowsHide: true, timeout: 5_000 });
        } else if (child.pid && child.exitCode === null) {
          // Playwright gives this POSIX launch its own process group.
          process.kill(-child.pid, 'SIGKILL');
        }
      } catch { /* Preserve the original failure and retain the test files. */ }
      throw error;
    }
  }

  try {
    await fs.mkdir(results, { recursive: true });
    temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-runtime-smoke-'));
    expectedProfile = options.mode === 'source' ? path.join(temporary, 'profile') : normalProfile(env);
    if (options.mode === 'packaged') {
      if (!(await absent(expectedProfile))) throw refusal('EXISTING_APP_PROFILE', 'Packaged smoke refuses an existing TaxSorted Local profile. Use a fresh disposable OS account.');
      await fs.mkdir(path.dirname(expectedProfile), { recursive: true });
      packagedLock = expectedProfile + '.runtime-smoke-lock';
      try { await fs.writeFile(packagedLock, runId, { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code === 'EEXIST') throw refusal('PROFILE_TEST_IN_USE', 'A packaged profile smoke test already holds the test lock.'); throw error; }
      if (!(await absent(expectedProfile))) throw refusal('PROFILE_CHANGED', 'The packaged profile is no longer fresh.');
    }

    const { _electron } = require('playwright');
    // Inspect installed metadata; importing Electron 44 can install missing binaries.
    const executable = options.mode === 'source' ? require('./doctor.cjs').electronExecutablePath() : path.resolve(options.executable);
    if (!executable) throw refusal('MISSING_ELECTRON_RUNTIME', 'Run npm run desktop:install-runtime after installing the scoped dependencies.');
    try { await fs.access(executable, fileModes.X_OK); }
    catch (error) { throw refusal(error.code === 'ENOENT' ? 'MISSING_EXECUTABLE' : 'EXECUTABLE_ACCESS_DENIED', 'The native app executable is missing or cannot be executed.'); }
    if (!(await fs.stat(executable)).isFile()) throw refusal('EXECUTABLE_NOT_FILE', 'Pass the native executable file, not an application or output directory.');
    spy = http.createServer((_request, response) => { hits += 1; response.end('Unexpected network request'); });
    await bounded(new Promise((resolve, reject) => { spy.once('error', reject); spy.listen(0, '127.0.0.1', resolve); }), 'start loopback observer', 5_000);
    const remote = `http://127.0.0.1:${spy.address().port}/synthetic-network-probe`;

    async function launch() {
      shutdownConfirmed = false;
      app = await _electron.launch({
        executablePath: executable,
        args: options.mode === 'source' ? [desktopRoot, `--profile-dir=${expectedProfile}`] : [],
        env, timeout: timeoutMs, chromiumSandbox: true, bypassCSP: false,
      });
      const page = await bounded(app.firstWindow(), 'open test window');
      page.setDefaultTimeout(timeoutMs);
      page.setDefaultNavigationTimeout(timeoutMs);
      page.on('pageerror', () => { report.rendererErrorCount += 1; });
      const runtime = await evaluate(({ app, BrowserWindow }) => {
        const preferences = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
        return {
          isPackaged: app.isPackaged, appVersion: app.getVersion(),
          electronVersion: process.versions.electron, chromiumVersion: process.versions.chrome,
          nodeVersion: process.versions.node, platform: process.platform, arch: process.arch,
          userData: app.getPath('userData'), sessionData: app.getPath('sessionData'),
          noSandboxSwitch: app.commandLine.hasSwitch('no-sandbox'),
          disableSetuidSandboxSwitch: app.commandLine.hasSwitch('disable-setuid-sandbox'),
          disableWebSecuritySwitch: app.commandLine.hasSwitch('disable-web-security'),
          preferences: {
            sandbox: preferences.sandbox, contextIsolation: preferences.contextIsolation,
            nodeIntegration: preferences.nodeIntegration, nodeIntegrationInWorker: preferences.nodeIntegrationInWorker,
            webSecurity: preferences.webSecurity, webviewTag: preferences.webviewTag,
            allowRunningInsecureContent: preferences.allowRunningInsecureContent,
          },
        };
      });
      assert.equal(runtime.isPackaged, options.mode === 'packaged');
      assert.equal(runtime.platform, process.platform, 'The native app platform must match the test host');
      assert.equal(runtime.arch, process.arch, 'The native app architecture must match the test host');
      const expected = await fs.realpath(expectedProfile);
      assert.equal(await fs.realpath(runtime.userData), expected, 'App profile must be the fresh test profile');
      assert.equal(await fs.realpath(runtime.sessionData), expected, 'Session profile must be the fresh test profile');
      profileVerified = true;
      if (options.expectAppImage) {
        assert.equal(process.platform, 'linux', 'AppImage evidence requires Linux');
        const probe = await evaluate((_electron, artifact) => {
          const fs = process.getBuiltinModule('fs');
          const path = process.getBuiltinModule('path');
          const appDir = process.env.APPDIR && fs.realpathSync(process.env.APPDIR);
          const appImage = process.env.APPIMAGE && fs.realpathSync(process.env.APPIMAGE);
          const executable = fs.realpathSync(process.execPath);
          const decode = value => value.replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
          const mount = fs.readFileSync('/proc/self/mountinfo', 'utf8').split('\n').map(line => line.split(' ')).find(fields => decode(fields[4] || '') === appDir);
          const separator = mount?.indexOf('-');
          const relative = appDir ? path.relative(appDir, executable) : null;
          return {
            archiveMatches: Boolean(appImage && appImage === fs.realpathSync(artifact)),
            executableInsideMount: Boolean(relative && relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative)),
            fuseMounted: Boolean(mount && separator > 0 && /^fuse(?:\.|$)/.test(mount[separator + 1])),
            readOnlyMount: Boolean(mount && mount[5].split(',').includes('ro')),
            resources: process.resourcesPath,
            mountPoint: appDir,
          };
        }, executable);
        const firstAppImageProbe = !report.appImage;
        const { resources: _resources, mountPoint: _mountPoint, ...publicProbe } = probe;
        report.appImage = { ...publicProbe, mountsReleased: false };
        if (probe.mountPoint) appImageMounts.add(probe.mountPoint);
        for (const key of ['archiveMatches', 'executableInsideMount', 'fuseMounted', 'readOnlyMount']) assert.equal(probe[key], true, `AppImage ${key} must be verified`);
        const payloadInspection = await require('./inspect-package.cjs').inspectPackage(probe.resources);
        const appRun = await fs.readFile(path.join(probe.mountPoint, 'AppRun'));
        assert.ok(appRun.equals(await fs.readFile(path.join(desktopRoot, 'assets/AppRun'))), 'Mounted AppImage must use the reviewed sandbox-preserving launcher');
        const desktopEntry = await fs.readFile(path.join(probe.mountPoint, 'taxsorted-local.desktop'), 'utf8');
        assert.match(desktopEntry, /^Exec=AppRun %U\r?$/m, 'Desktop shortcut must not disable the sandbox');
        if (firstAppImageProbe) check('Actual AppImage archive launches from a read-only FUSE mount; mounted payload matches staging');
        report.appImage = { ...publicProbe, payloadInspection, reviewedLauncher: true, sandboxedDesktopEntry: true, mountsReleased: false };
      }
      // Never write user-profile paths to evidence.
      const { userData: _userData, sessionData: _sessionData, ...publicRuntime } = runtime;
      report.runtime = publicRuntime;
      assert.equal(runtime.noSandboxSwitch, false);
      assert.equal(runtime.disableSetuidSandboxSwitch, false);
      assert.equal(runtime.disableWebSecuritySwitch, false);
      assert.deepEqual(runtime.preferences, {
        sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInWorker: false,
        webSecurity: true, webviewTag: false, allowRunningInsecureContent: false,
      });
      await page.getByText('Local app · offline', { exact: true }).waitFor();
      // Electron documents ProcessMetric.sandboxed on macOS/Windows. On Linux,
      // retain only the renderer's seccomp/no-new-privileges flags, never /proc.
      // https://www.electronjs.org/docs/latest/api/structures/process-metric
      const osSandbox = await evaluate(({ app, BrowserWindow }) => {
        const pid = BrowserWindow.getAllWindows()[0].webContents.getOSProcessId();
        if (process.platform === 'darwin' || process.platform === 'win32') {
          const metric = app.getAppMetrics().find(item => item.pid === pid);
          return { method: 'electron-process-metric', sandboxed: metric?.sandboxed === true };
        }
        if (process.platform === 'linux') {
          const status = process.getBuiltinModule('fs').readFileSync(`/proc/${pid}/status`, 'utf8');
          return {
            method: 'linux-renderer-process-flags',
            seccompFilter: /^Seccomp:\s*2\s*$/m.test(status),
            noNewPrivileges: /^NoNewPrivs:\s*1\s*$/m.test(status),
          };
        }
        return { method: 'unsupported-platform' };
      });
      report.runtime.osSandbox = osSandbox;
      if (process.platform === 'darwin' || process.platform === 'win32') assert.equal(osSandbox.sandboxed, true);
      else assert.deepEqual(osSandbox, { method: 'linux-renderer-process-flags', seccompFilter: true, noNewPrivileges: true });
      return page;
    }

    stage = 'launch and verify effective sandbox and isolated profile';
    let page = await launch();
    const evaluatePage = (callback, argument) => bounded(page.evaluate(callback, argument), stage);
    assert.deepEqual(await evaluatePage(() => [typeof window.require, typeof window.process]), ['undefined', 'undefined']);
    check('Fresh isolated profile; OS sandbox metric or Linux renderer flags verified; no disabling sandbox switches or renderer Node access');

    stage = 'verify renderer CSP and default-session network blocking';
    const home = await page.goto('taxsorted://app/');
    assert.ok(home.headers()['content-security-policy'].includes("connect-src 'self'"));
    const rendererProbe = await evaluatePage(async url => {
      let violation;
      const observe = event => { if (event.effectiveDirective === 'connect-src') violation = event.effectiveDirective; };
      document.addEventListener('securitypolicyviolation', observe);
      let result;
      try { await fetch(url, { signal: AbortSignal.timeout(3_000) }); result = 'connected'; }
      catch { result = 'blocked'; }
      const deadline = Date.now() + 2_000;
      while (!violation && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
      document.removeEventListener('securitypolicyviolation', observe);
      return { result, violation: violation || null };
    }, remote);
    assert.deepEqual(rendererProbe, { result: 'blocked', violation: 'connect-src' });
    assert.equal(await evaluate(async ({ session }, url) => {
      try { await session.defaultSession.fetch(url, { signal: AbortSignal.timeout(3_000) }); return 'connected'; }
      catch { return 'blocked'; }
    }, remote), 'blocked');
    assert.equal(hits, 0);
    check('Renderer connect-src violation and independent default-session fetch blocked; observer received zero requests');

    stage = 'create synthetic checklist and Books record';
    const baselineNote = `Synthetic runtime smoke ${runId} baseline`;
    const extraNote = `Synthetic runtime smoke ${runId} after backup`;
    async function addRecord(note, amount) {
      // Empty Books use a button; populated Books use a native details summary.
      await page.locator('button, summary').filter({ hasText: /^Add money in or out$/ }).click();
      await page.getByLabel('How much?', { exact: true }).fill(amount);
      await page.getByLabel('Your note (optional)', { exact: true }).fill(note);
      await page.locator('form').filter({ has: page.getByLabel('How much?', { exact: true }) }).locator('button[type=submit]').click();
      await page.getByText('Added. Check this item before it changes your totals.', { exact: true }).waitFor();
      await page.getByText(note, { exact: true }).first().waitFor();
    }
    await page.goto('taxsorted://app/checkup/?for=landlords');
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Save checklist', exact: true }).click();
    await page.getByText('Saved on this device', { exact: true }).waitFor();
    stage = 'retain property activity through client navigation';
    const propertyRoute = pathname => url => url.pathname.replace(/\/$/, '') === pathname && url.searchParams.get('activity') === 'uk-property';
    await page.getByRole('link', { name: 'Open property records', exact: true }).click();
    await page.waitForURL(propertyRoute('/books/workspace/money'));
    // Exercise different destinations, waiting for the router to commit each
    // transition. A click can finish before a client-side URL update does.
    await page.getByRole('navigation', { name: 'Books sections' }).getByRole('link', { name: 'Today', exact: true }).click();
    await page.waitForURL(propertyRoute('/books/workspace'));
    await page.getByRole('navigation', { name: 'Books sections' }).getByRole('link', { name: 'Money', exact: true }).click();
    await page.waitForURL(propertyRoute('/books/workspace/money'));
    stage = 'save synthetic Books record';
    await addRecord(baselineNote, '123.45');
    check('Client navigation retains landlord activity; synthetic checklist and money record saved');

    stage = 'verify persistence across app quit and restart';
    await closeApp();
    page = await launch();
    await page.goto('taxsorted://app/checkup/');
    await page.getByRole('checkbox').first().waitFor();
    await waitUntil(() => page.getByRole('checkbox').first().isChecked(), 'restore saved checklist');
    await page.goto('taxsorted://app/books/workspace/money/?activity=uk-property');
    await page.getByText(baselineNote, { exact: true }).first().waitFor();
    check('Checklist and IndexedDB money record persist across full app quit and relaunch');

    async function exportBackup(buttonName, filename) {
      await evaluate(({ session }, output) => {
        const state = { result: null, saveDialog: null };
        globalThis.__taxsortedSmokeDownload = state;
        const listener = (_event, item) => {
          state.saveDialog = item.getSaveDialogOptions();
          item.setSavePath(output);
          item.once('done', (_event, status) => { clearTimeout(timer); state.result = status; });
        };
        const timer = setTimeout(() => {
          session.defaultSession.removeListener('will-download', listener);
          state.result = 'timeout';
        }, 15_000);
        timer.unref();
        session.defaultSession.once('will-download', listener);
      }, filename);
      await page.getByRole('button', { name: buttonName, exact: true }).click();
      const result = await waitUntil(() => evaluate(() => globalThis.__taxsortedSmokeDownload.result), 'complete synthetic export', 20_000);
      assert.equal(result, 'completed');
      const saveDialog = await evaluate(() => globalThis.__taxsortedSmokeDownload.saveDialog);
      assert.equal(saveDialog.title, 'Save your TaxSorted export');
      assert.equal(saveDialog.buttonLabel, 'Save export');
      return JSON.parse(await fs.readFile(filename, 'utf8'));
    }

    stage = 'export and restore synthetic Books with required confirmation';
    const backup = path.join(temporary, 'books-backup.json');
    await page.getByText('Back up or restore your Books', { exact: true }).click();
    stage = 'export initial synthetic Books backup';
    const exported = await exportBackup('Download a Books backup', backup);
    assert.ok(JSON.stringify(exported).includes(baselineNote));
    stage = 'add later synthetic record to verify actual backup replacement';
    await addRecord(extraNote, '9.99');
    stage = 'preview restore and require backup confirmation';
    await page.getByLabel('Choose a Books backup to restore', { exact: true }).setInputFiles(backup);
    await page.getByRole('heading', { name: 'Check before replacing your Books', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Replace these Books with the backup', exact: true }).isDisabled(), true);
    stage = 'export current Books before replacing them';
    const beforeRestore = await exportBackup('Download the Books currently here', path.join(temporary, 'before-restore.json'));
    assert.ok(JSON.stringify(beforeRestore).includes(extraNote));
    stage = 'confirm restore and verify earlier synthetic state is restored';
    await page.getByRole('checkbox', { name: 'I have saved the current Books and understand that restoring will replace them with this backup.', exact: true }).check();
    await page.getByRole('button', { name: 'Replace these Books with the backup', exact: true }).click();
    await page.getByText(/Your Books were replaced\./).waitFor();
    await page.getByText(baselineNote, { exact: true }).first().waitFor();
    // The success notice precedes the asynchronous ledger refresh.
    await page.getByText(extraNote, { exact: true }).waitFor({ state: 'detached' });
    assert.equal(await page.getByText(extraNote, { exact: true }).count(), 0);
    check('Blob export configures native Save options; validated JSON restores after backup and confirmation; later synthetic record removed');

    stage = 'verify external-link cancellation and explicit handoff';
    await page.goto('taxsorted://app/trust/');
    await evaluate(({ dialog, shell }) => {
      globalThis.__taxsortedSmokeExternal = {
        response: 0, prompts: [], opened: [],
        originalDialog: dialog.showMessageBox, originalOpen: shell.openExternal,
      };
      dialog.showMessageBox = async (_window, options) => {
        const state = globalThis.__taxsortedSmokeExternal;
        state.prompts.push({ defaultId: options.defaultId, cancelId: options.cancelId, buttons: options.buttons });
        return { response: state.response };
      };
      shell.openExternal = async url => { globalThis.__taxsortedSmokeExternal.opened.push(url); };
    });
    try {
      const sourceLink = page.getByRole('link', { name: /Read the source code/ });
      await sourceLink.click();
      await waitUntil(() => evaluate(() => globalThis.__taxsortedSmokeExternal.prompts.length === 1), 'observe external link prompt');
      const cancelled = await evaluate(() => ({ prompts: globalThis.__taxsortedSmokeExternal.prompts, opened: globalThis.__taxsortedSmokeExternal.opened }));
      assert.deepEqual(cancelled.prompts[0], { defaultId: 0, cancelId: 0, buttons: ['Cancel', 'Open website'] });
      assert.deepEqual(cancelled.opened, []);
      await evaluate(() => { globalThis.__taxsortedSmokeExternal.response = 1; });
      await sourceLink.click();
      await waitUntil(() => evaluate(() => globalThis.__taxsortedSmokeExternal.opened.length === 1), 'observe approved browser handoff');
      assert.deepEqual(await evaluate(() => globalThis.__taxsortedSmokeExternal.opened), ['https://github.com/cambridgetcg/taxsorted.io']);
      assert.equal(page.url(), 'taxsorted://app/trust/');
      check('External link defaults to Cancel; cancellation opens nothing; explicit approval forwards public URL to stubbed browser only');
    } finally {
      await evaluate(({ dialog, shell }) => {
        dialog.showMessageBox = globalThis.__taxsortedSmokeExternal.originalDialog;
        shell.openExternal = globalThis.__taxsortedSmokeExternal.originalOpen;
        delete globalThis.__taxsortedSmokeExternal;
      });
    }

    stage = 'verify offline routes and protected research';
    await page.goto('taxsorted://app/account/');
    await page.getByRole('heading', { name: 'This service needs an online connection.', exact: true }).waitFor();
    await page.goto('taxsorted://app/download/');
    await page.locator('h1').waitFor();
    assert.equal(await evaluatePage(() => document.documentElement.scrollWidth > innerWidth), false);
    const protectedResponse = await page.goto('taxsorted://app/UK/OPPORTUNITIES/index.html');
    assert.equal(protectedResponse.status(), 403);
    assert.equal(report.rendererErrorCount, 0);
    assert.equal(hits, 0);
    check('Online-only route explains its limit; setup page fits; case aliases cannot expose protected research');
    report.status = 'passed';
  } catch (error) {
    failed = true;
    report.status = 'failed';
    report.failure = { stage, ...safeError(error) };
  } finally {
    try { await closeApp(); report.cleanup.appClosed = true; }
    catch (error) { failed = true; report.cleanup.appError = safeError(error); }
    try {
      if (spy) {
        spy.closeAllConnections();
        await bounded(new Promise(resolve => spy.close(resolve)), 'close network observer', 5_000);
      }
      report.cleanup.observerClosed = true;
    } catch (error) { failed = true; report.cleanup.observerError = safeError(error); }
    if (options.mode === 'packaged' && profileVerified && report.cleanup.appClosed) {
      try { await fs.rm(expectedProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); report.cleanup.packagedProfileRemoved = true; }
      catch (error) { failed = true; report.cleanup.profileError = safeError(error); }
    }
    if (packagedLock) {
      try { if (await fs.readFile(packagedLock, 'utf8') === runId) await fs.unlink(packagedLock); }
      catch (error) { if (error.code !== 'ENOENT') { failed = true; report.cleanup.lockError = safeError(error); } }
    }
    if (temporary && report.cleanup.appClosed) {
      try { await fs.rm(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); report.cleanup.temporaryFilesRemoved = true; }
      catch (error) { failed = true; report.cleanup.temporaryError = safeError(error); }
    }
    report.remoteObserverHits = hits;
    report.finishedAt = new Date().toISOString();
    if (failed) report.status = 'failed';
    await fs.mkdir(results, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  }
  const resultPath = path.relative(projectRoot, reportPath);
  console.log(`${failed ? 'FAIL' : 'PASS'}: ${options.mode} runtime smoke. Evidence: ${resultPath}`);
  if (report.failure) console.error(`Stopped during: ${report.failure.stage} (${report.failure.code || report.failure.type}). Raw app output and environment values are intentionally omitted.`);
  return failed ? 1 : 0;
}

if (require.main === module) {
  let options;
  try { options = optionsFrom(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
  if (options) run(options).then(code => { process.exitCode = code; }).catch(error => {
    console.error(`Runtime smoke could not write its evidence (${safeError(error).type}).`);
    process.exitCode = 1;
  });
}
module.exports = { optionsFrom, childEnvironment, normalProfile, safeError, checkoutState };
