#!/usr/bin/env node
'use strict';

// Native, disposable-runner test of the actual NSIS artifact. Never run this
// against a personal Windows account or an existing TaxSorted installation.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, execFileSync } = require('node:child_process');
const { parseArgs } = require('node:util');
const { inspectPackage } = require('./inspect-package.cjs');
const { validateInstalledRuntime } = require('./runtime-evidence.cjs');

const project = path.resolve(__dirname, '../..');
const results = path.join(project, 'desktop/test-results');
// electron-builder 26 derives this UUID v5 from io.taxsorted.local and its
// 50e065bc-3134-11e6-9bab-38c9862bdaf3 namespace (NsisTarget.js).
const appGuid = '43a5eaab-bdd0-5e82-8f6b-5eb92805d7b7';
const sentinelName = 'installer-test-synthetic-sentinel.txt';

function refusal(code) { return Object.assign(new Error(code), { code }); }

function requireDisposableRunner(options, platform = process.platform, env = process.env) {
  if (!options.disposableAccount || platform !== 'win32' || env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted' || env.RUNNER_OS !== 'Windows') throw refusal('DISPOSABLE_WINDOWS_RUNNER_REQUIRED');
  if (!env.RUNNER_TEMP || !env.APPDATA || !env.LOCALAPPDATA || !env.SystemRoot) throw refusal('MISSING_RUNNER_PATHS');
}

function nsisArguments(directory, uninstall = false) {
  // NSIS requires these final arguments to be UNQUOTED, even with spaces.
  // Spawn directly with windowsVerbatimArguments; never pass through a shell.
  // https://nsis.sourceforge.io/Docs/Chapter3.html#installerusage
  if (!path.win32.isAbsolute(directory) || /["\r\n\0]/.test(directory) || path.win32.normalize(directory) !== directory || path.win32.parse(directory).root === directory) throw refusal('INVALID_INSTALL_DIRECTORY');
  return ['/S', '/currentuser', `${uninstall ? '_?=' : '/D='}${directory}`];
}

async function absent(filename) {
  try { await fs.lstat(filename); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

async function regularFile(filename) {
  const stat = await fs.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink()) throw refusal('EXPECTED_REGULAR_FILE');
}

function powershellJson(script, env, probe, timings) {
  const powershell = path.join(env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
  const started = Date.now();
  try {
    // Include a bounded allowance for the hosted runner's first Windows
    // PowerShell startup; a cold-start delay is possible, not established.
    const output = execFileSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000, windowsHide: true });
    return JSON.parse(output.replace(/^\uFEFF/, '').trim());
  } finally { timings?.push({ probe, elapsedMs: Date.now() - started }); }
}

function windowsShortcuts(env, timings) {
  const locations = powershellJson(`
    $ErrorActionPreference = 'Stop'
    $desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::DesktopDirectory, [Environment+SpecialFolderOption]::DoNotVerify)
    $programs = [Environment]::GetFolderPath([Environment+SpecialFolder]::Programs, [Environment+SpecialFolderOption]::DoNotVerify)
    ConvertTo-Json -InputObject @($desktop, $programs) -Compress
  `, env, 'shortcut-locations', timings);
  if (!Array.isArray(locations) || locations.length !== 2 || locations.some(location => typeof location !== 'string' || !path.win32.isAbsolute(location))) throw refusal('INVALID_SHORTCUT_LOCATIONS');
  return locations.map(location => path.join(location, 'TaxSorted Local.lnk'));
}

function registryState(env, timings) {
  // Exact product keys in both views; missing keys are distinct from permission
  // or query failures. Values stay internal and never enter evidence or logs.
  const script = `
    $ErrorActionPreference = 'Stop'
    $rows = @()
    foreach ($hive in @('CurrentUser', 'LocalMachine')) {
      foreach ($view in @('Registry64', 'Registry32')) {
        $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::$hive, [Microsoft.Win32.RegistryView]::$view)
        try {
          foreach ($kind in @('install', 'uninstall')) {
            $keyPath = if ($kind -eq 'install') { 'Software\\${appGuid}' } else { 'Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${appGuid}' }
            $key = $base.OpenSubKey($keyPath)
            if ($null -ne $key) {
              try { $rows += @{ hive=$hive; view=$view; kind=$kind; location=$key.GetValue('InstallLocation'); version=$key.GetValue('DisplayVersion') } }
              finally { $key.Dispose() }
            }
          }
        } finally { $base.Dispose() }
      }
    }
    ConvertTo-Json -InputObject @($rows) -Compress
  `;
  const rows = powershellJson(script, env, 'product-registry', timings);
  if (!Array.isArray(rows)) throw refusal('INVALID_REGISTRY_RESPONSE');
  return rows;
}

function validateRegistration(rows, directory, version) {
  assert.ok(rows.length > 0, 'Installer registration must exist');
  assert.ok(rows.every(row => row.hive === 'CurrentUser'), 'Installation must be scoped to current user');
  assert.ok(rows.some(row => row.kind === 'install'), 'Installation location must be registered');
  assert.ok(rows.some(row => row.kind === 'uninstall'), 'Uninstall entry must be registered');
  for (const row of rows) {
    if (row.kind === 'install') assert.equal(path.win32.normalize(row.location).toLowerCase(), directory.toLowerCase(), 'Registered installation must match the task-owned path');
    if (row.kind === 'uninstall') assert.equal(row.version, version, 'Registered version must match the installer');
  }
}

function validateRuntimeSmoke(smoke, report) {
  validateInstalledRuntime(smoke, { ...report, platform: 'win32', arch: 'x64' });
}

function runNative(executable, args, env, { milliseconds = 180_000, verbatim = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { env, cwd: project, stdio: 'ignore', shell: false, windowsHide: true, windowsVerbatimArguments: verbatim });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { execFileSync(path.join(env.SystemRoot, 'System32/taskkill.exe'), ['/pid', String(child.pid), '/T', '/F'], { env, stdio: 'ignore', timeout: 5_000, windowsHide: true }); } catch {}
      reject(refusal('CHILD_PROCESS_TIMEOUT'));
    }, milliseconds);
    child.once('error', () => { clearTimeout(timer); reject(refusal('CHILD_PROCESS_START_FAILED')); });
    child.once('close', code => {
      clearTimeout(timer);
      if (timedOut) return;
      if (code !== 0) reject(refusal('CHILD_PROCESS_NONZERO'));
      else resolve();
    });
  });
}

async function removeOwnedSentinel(profile, token) {
  if (!(await fs.lstat(profile)).isDirectory()) throw refusal('SENTINEL_PROFILE_CHANGED');
  const names = await fs.readdir(profile);
  if (names.length !== 1 || names[0] !== sentinelName) throw refusal('SENTINEL_PROFILE_CHANGED');
  const sentinel = path.join(profile, sentinelName);
  await regularFile(sentinel);
  if (await fs.readFile(sentinel, 'utf8') !== token) throw refusal('SENTINEL_PROFILE_CHANGED');
  // Deliberately nonrecursive: an unexpected writer prevents cleanup.
  await fs.unlink(sentinel);
  await fs.rmdir(profile);
}

async function run(options) {
  const { childEnvironment, normalProfile, safeError, checkoutState } = require('./runtime-smoke.cjs');
  const env = childEnvironment();
  const report = {
    schema: 'taxsorted.windows-installer-test/1', startedAt: new Date().toISOString(),
    platform: process.platform, arch: process.arch, osVersion: os.release(),
    ...checkoutState(env), status: 'running', checks: [], probes: [],
    runtimeEvidence: 'installed-smoke.json', data: 'synthetic only',
    cleanup: { uninstalled: false, registrationRemoved: false, shortcutsRemoved: false, sentinelRemoved: false, temporaryFilesRemoved: false, lockRemoved: false },
    limits: 'Silent current-user NSIS lifecycle on a disposable GitHub Windows Server runner. Does not establish Windows 11 standard-user installation, interactive wizard, UAC, SmartScreen, native dialog, reboot or version-upgrade coverage. Retention checks a synthetic sentinel, not a real tax profile. Runner disposal removes residual OS installer cache.',
  };
  const check = name => report.checks.push({ name });
  let stage = 'require a fresh disposable Windows runner';
  let temporary, installDirectory, uninstaller, profile, lock, token, shortcuts;
  let installStarted = false, uninstallAttempted = false, sentinelCreated = false;
  let safeToUninstall = true;
  try {
    requireDisposableRunner(options);
    const manifest = JSON.parse(await fs.readFile(path.join(project, 'desktop/package.json'), 'utf8'));
    const expected = path.join(project, 'desktop/dist', `TaxSorted-Local-${manifest.version}-win-x64.exe`);
    if (!options.installer || path.resolve(options.installer).toLowerCase() !== expected.toLowerCase() || process.arch !== 'x64') throw refusal('EXPECTED_NATIVE_BUILD_ARTIFACT');
    await regularFile(expected);
    report.artifact = { name: path.basename(expected), sha256: crypto.createHash('sha256').update(await fs.readFile(expected)).digest('hex') };
    stage = 'verify the normal profile and runtime lock are absent';
    profile = normalProfile(env);
    if (!(await absent(profile)) || !(await absent(profile + '.runtime-smoke-lock'))) throw refusal('EXISTING_PROFILE_OR_INSTALLATION');
    stage = 'read existing current-user and machine installation registry keys';
    if (registryState(env, report.probes).length) throw refusal('EXISTING_PROFILE_OR_INSTALLATION');
    stage = 'read Desktop and Start menu shortcut locations and verify absence';
    shortcuts = windowsShortcuts(env, report.probes);
    for (const shortcut of shortcuts) if (!(await absent(shortcut))) throw refusal('EXISTING_APPLICATION_SHORTCUT');
    stage = 'claim the fresh profile for this installer test';
    token = crypto.randomUUID();
    lock = profile + '.installer-test-lock';
    await fs.writeFile(lock, token, { flag: 'wx', mode: 0o600 });
    if (!(await absent(profile))) throw refusal('PROFILE_CHANGED');
    check('Fresh profile and no previous per-user or per-machine registration');
    temporary = await fs.mkdtemp(path.join(process.env.RUNNER_TEMP, 'taxsorted-nsis-'));
    installDirectory = path.join(temporary, 'TaxSorted Local');
    const executable = path.join(installDirectory, 'TaxSorted Local.exe');
    uninstaller = path.join(installDirectory, 'Uninstall TaxSorted Local.exe');

    stage = 'install the current-user NSIS artifact';
    installStarted = true;
    safeToUninstall = false;
    await runNative(expected, nsisArguments(installDirectory), env, { verbatim: true });
    safeToUninstall = true;
    await regularFile(executable);
    await regularFile(uninstaller);
    stage = 'verify installed current-user registration and shortcuts';
    validateRegistration(registryState(env, report.probes), installDirectory, manifest.version);
    for (const shortcut of shortcuts) await regularFile(shortcut);
    if (!(await absent(profile))) throw refusal('INSTALLER_UNEXPECTEDLY_CREATED_PROFILE');
    check('Silent installer completed, current-user registration and Desktop/Start menu shortcuts exist, and application did not auto-launch');
    stage = 'inspect installed runtime and public pages';
    const inspection = await inspectPackage(path.join(installDirectory, 'resources'));
    report.packageInspection = { status: inspection.status, runtimeFiles: inspection.runtimeFiles, bundledFiles: inspection.bundledFiles, version: inspection.version };
    check('Installed runtime and public pages match this checkout and staging');

    stage = 'exercise the installed app with synthetic data';
    const smokeFile = path.join(results, 'installed-smoke.json');
    if (!(await absent(smokeFile))) throw refusal('EXISTING_INSTALLED_RUNTIME_EVIDENCE');
    safeToUninstall = false;
    try {
      await runNative(process.execPath, [path.join(__dirname, 'runtime-smoke.cjs'), '--mode=packaged', `--executable=${executable}`, '--disposable-os-account', '--report-name=installed-smoke'], env, { milliseconds: 300_000 });
    } finally {
      try {
        const smoke = JSON.parse(await fs.readFile(smokeFile, 'utf8'));
        validateRuntimeSmoke(smoke, report);
        safeToUninstall = smoke.cleanup?.appClosed === true;
        report.runtime = { status: smoke.status, checks: smoke.checks?.length, rendererErrorCount: smoke.rendererErrorCount, remoteObserverHits: smoke.remoteObserverHits, cleanup: smoke.cleanup };
      } catch {}
    }
    if (!safeToUninstall || report.runtime?.status !== 'passed' || !(await absent(profile))) throw refusal('INSTALLED_RUNTIME_NOT_CLEAN');
    check('Installed app passed sandbox, offline, persistence and backup/restore smoke');

    stage = 'create a fresh synthetic retention sentinel';
    await fs.mkdir(profile);
    await fs.writeFile(path.join(profile, sentinelName), token, { flag: 'wx', mode: 0o600 });
    sentinelCreated = true;

    stage = 'uninstall and verify synthetic data retention';
    // _?= prevents the NSIS uninstaller relaunching itself and returning early.
    // Run a copied uninstaller so the install directory can disappear fully.
    const copiedUninstaller = path.join(temporary, 'test-uninstaller.exe');
    await fs.copyFile(uninstaller, copiedUninstaller);
    uninstallAttempted = true;
    await runNative(copiedUninstaller, nsisArguments(installDirectory, true), env, { verbatim: true });
    if (!(await absent(installDirectory))) throw refusal('INSTALL_DIRECTORY_REMAINS');
    report.cleanup.uninstalled = true;
    stage = 'verify uninstalled registration, shortcuts and retained synthetic sentinel';
    if (registryState(env, report.probes).length) throw refusal('INSTALLER_REGISTRATION_REMAINS');
    report.cleanup.registrationRemoved = true;
    for (const shortcut of shortcuts) if (!(await absent(shortcut))) throw refusal('APPLICATION_SHORTCUT_REMAINS');
    report.cleanup.shortcutsRemoved = true;
    if (await fs.readFile(path.join(profile, sentinelName), 'utf8') !== token) throw refusal('SYNTHETIC_DATA_NOT_RETAINED');
    check('Uninstaller completed, removed application, registration and shortcuts, and retained the synthetic profile sentinel');
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = { stage, ...safeError(error) };
  } finally {
    if (installStarted && !uninstallAttempted && safeToUninstall && uninstaller) {
      try {
        await regularFile(uninstaller);
        const copy = path.join(temporary, 'test-uninstaller.exe');
        await fs.copyFile(uninstaller, copy);
        await runNative(copy, nsisArguments(installDirectory, true), env, { verbatim: true });
        report.cleanup.uninstalled = await absent(installDirectory);
        report.cleanup.registrationRemoved = registryState(env, report.probes).length === 0;
        report.cleanup.shortcutsRemoved = (await Promise.all(shortcuts.map(absent))).every(Boolean);
      } catch (error) { report.cleanup.uninstallError = safeError(error); }
    }
    if (sentinelCreated && safeToUninstall) {
      try { await removeOwnedSentinel(profile, token); report.cleanup.sentinelRemoved = true; }
      catch (error) { report.cleanup.sentinelError = safeError(error); report.status = 'failed'; }
    }
    if (temporary && (!installStarted || (report.cleanup.uninstalled && report.cleanup.registrationRemoved && report.cleanup.shortcutsRemoved))) {
      try { await fs.rm(temporary, { recursive: true }); report.cleanup.temporaryFilesRemoved = true; }
      catch (error) { report.cleanup.temporaryError = safeError(error); report.status = 'failed'; }
    }
    if (lock && token) {
      try {
        if (await fs.readFile(lock, 'utf8') !== token) throw refusal('INSTALLER_LOCK_CHANGED');
        await fs.unlink(lock);
        report.cleanup.lockRemoved = true;
      }
      catch (error) { report.cleanup.lockError = safeError(error); report.status = 'failed'; }
    }
    report.finishedAt = new Date().toISOString();
    await fs.mkdir(results, { recursive: true });
    await fs.writeFile(path.join(results, 'windows-installer.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  }
  console.log(`${report.status === 'passed' ? 'PASS' : 'FAIL'}: Windows NSIS lifecycle. Evidence: desktop/test-results/windows-installer.json`);
  if (report.failure) console.error(`Stopped during: ${report.failure.stage} (${report.failure.code || report.failure.type}).`);
  return report.status === 'passed' ? 0 : 1;
}

if (require.main === module) {
  try {
    const { values } = parseArgs({ options: { installer: { type: 'string' }, 'disposable-os-account': { type: 'boolean' } } });
    run({ installer: values.installer, disposableAccount: values['disposable-os-account'] }).then(code => { process.exitCode = code; }).catch(() => { console.error('Windows installer test could not write evidence.'); process.exitCode = 1; });
  } catch { console.error('Use --installer=<built native installer> --disposable-os-account on a disposable Windows GitHub runner.'); process.exitCode = 2; }
}

module.exports = { requireDisposableRunner, nsisArguments, validateRegistration, validateRuntimeSmoke, removeOwnedSentinel };
