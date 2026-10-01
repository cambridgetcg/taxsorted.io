#!/usr/bin/env node
'use strict';

// Inspect locally without launching; full installation smoke is restricted to a
// disposable hosted runner. Never replace an existing application or profile.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');
const { childEnvironment, normalProfile, safeError, checkoutState } = require('./runtime-smoke.cjs');
const { inspectPackage } = require('./inspect-package.cjs');
const { validateInstalledRuntime } = require('./runtime-evidence.cjs');

const project = path.resolve(__dirname, '../..');
const results = path.join(project, 'desktop/test-results');

async function absent(location) {
  try { await fs.lstat(location); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

function command(file, args, env, timeout = 60_000) {
  return spawnSync(file, args, { env, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function succeeded(result, label) {
  assert.ok(!result.error && result.status === 0, label);
  return result;
}

async function run(options) {
  const env = childEnvironment();
  const report = {
    schema: 'taxsorted.desktop-installer/1', platform: process.platform, arch: process.arch,
    osVersion: os.release(), ...checkoutState(env),
    method: options['inspect-only'] ? 'dmg-inspection-only' : 'dmg-copy-eject-installed-runtime',
    data: 'synthetic only',
    startedAt: new Date().toISOString(), status: 'running', checks: [],
    cleanup: { imageDetached: false, installationRemoved: false },
    limits: 'Copies into an owned temporary Applications directory. CLI assessment and runtime automation do not establish Finder installation, quarantine handling, native dialogs or notarisation. Checkout metadata describes this test, not independent artifact provenance.',
  };
  let owned;
  let mount;
  let detachNeeded = false;
  let runtimeStarted = false;
  let runtimeClosed = false;
  let stage = 'validate test boundary';
  const check = name => report.checks.push(name);
  try {
    assert.equal(process.platform, 'darwin', 'macOS is required');
    assert.ok(options.installer, 'Pass --installer=<DMG>');
    if (!options['inspect-only']) {
      assert.equal(options['disposable-os-account'], true, 'A disposable OS account is required');
      assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Full installation smoke requires a hosted GitHub runner');
      assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted', 'Self-hosted machines are excluded');
      assert.ok(await absent(normalProfile(env)), 'Refuse an existing TaxSorted profile');
    }
    const installer = path.resolve(options.installer);
    const stat = await fs.lstat(installer);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Expected a regular DMG');
    const version = require('../package.json').version;
    assert.equal(path.basename(installer), `TaxSorted-Local-${version}-mac-${process.arch}.dmg`);
    report.artifact = { file: path.basename(installer), sha256: crypto.createHash('sha256').update(await fs.readFile(installer)).digest('hex'), bytes: stat.size };
    check('Regular native architecture DMG identified and hashed');

    stage = 'verify and mount read-only disk image';
    succeeded(command('/usr/bin/hdiutil', ['verify', '-quiet', installer], env), 'DMG verification failed');
    owned = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-dmg-test-'));
    mount = path.join(owned, 'image');
    await fs.mkdir(mount);
    // If attach times out, detach must still be confirmed before removing this
    // directory. No force-unmount is used, even on failure.
    detachNeeded = true;
    succeeded(command('/usr/bin/hdiutil', ['attach', installer, '-readonly', '-nobrowse', '-noautoopen', '-mountpoint', mount, '-plist'], env), 'DMG mount failed');
    check('Disk image verified and mounted read-only');

    stage = 'copy application out of disk image';
    const sourceApp = path.join(mount, 'TaxSorted Local.app');
    const sourceStat = await fs.lstat(sourceApp);
    assert.ok(sourceStat.isDirectory() && !sourceStat.isSymbolicLink());
    const applications = path.join(owned, 'Applications');
    await fs.mkdir(applications);
    const installedApp = path.join(applications, 'TaxSorted Local.app');
    succeeded(command('/usr/bin/ditto', [sourceApp, installedApp], env), 'Application copy failed');
    const executable = path.join(installedApp, 'Contents/MacOS/TaxSorted Local');
    const architectures = succeeded(command('/usr/bin/lipo', ['-archs', executable], env), 'Cannot inspect executable architecture').stdout.trim().split(/\s+/);
    assert.ok(architectures.includes(process.arch === 'x64' ? 'x86_64' : 'arm64'));
    report.packageInspection = await inspectPackage(path.join(installedApp, 'Contents/Resources'));
    check('Copied application architecture, runtime and public pages match this build');

    stage = 'eject disk image before app launch';
    succeeded(command('/usr/bin/hdiutil', ['detach', mount], env), 'DMG detach failed');
    detachNeeded = false;
    report.cleanup.imageDetached = true;
    check('Disk image detached before testing the copied app');

    stage = 'record signing and Gatekeeper assessment';
    const signature = command('/usr/bin/codesign', ['--verify', '--deep', '--strict', installedApp], env);
    const policy = command('/usr/sbin/spctl', ['--assess', '--type', 'execute', '--ignore-cache', '--no-cache', '--verbose=4', installedApp], env);
    report.trust = {
      codeSignatureVerifies: !signature.error && signature.status === 0,
      gatekeeperAssessment: !policy.error && policy.status === 0 ? 'accepted' : !policy.error && policy.status === 3 ? 'rejected' : 'assessment-error',
      assessmentExitCode: policy.status,
      meaning: 'Ad-hoc preview assessment is recorded, not bypassed. A CLI launch does not test consumer trust prompts.',
    };
    assert.equal(report.trust.codeSignatureVerifies, true, 'Preview ad-hoc signature must verify');
    check('Read-only signature and Gatekeeper results recorded without policy changes');

    if (!options['inspect-only']) {
      stage = 'exercise installed application';
      const evidence = path.join(results, 'installed-smoke.json');
      // A fresh evidence file is required: a previous success cannot satisfy this run.
      assert.ok(await absent(evidence), 'Refuse an existing installed runtime report');
      runtimeStarted = true;
      const runtimeStart = Date.now();
      const smoke = command(process.execPath, [path.join(__dirname, 'runtime-smoke.cjs'), '--mode=packaged', `--executable=${executable}`, '--disposable-os-account', '--report-name=installed-smoke'], env, 300_000);
      const runtime = JSON.parse(await fs.readFile(evidence, 'utf8'));
      runtimeClosed = runtime.cleanup?.appClosed === true;
      succeeded(smoke, 'Installed app runtime failed');
      validateInstalledRuntime(runtime, { ...report, startedAt: runtimeStart });
      report.runtimeEvidence = 'installed-smoke.json';
      check('Copied application passes complete packaged runtime after DMG ejection');
    }
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = { stage, ...safeError(error) };
  } finally {
    if (detachNeeded && mount) {
      const detached = command('/usr/bin/hdiutil', ['detach', mount], env);
      if (!detached.error && detached.status === 0) {
        report.cleanup.imageDetached = true;
        detachNeeded = false;
      }
    }
    if (owned && !detachNeeded && (!runtimeStarted || runtimeClosed)) {
      try { await fs.rm(owned, { recursive: true, force: true }); report.cleanup.installationRemoved = true; }
      catch (error) { report.cleanup.error = safeError(error); }
    }
    if (owned && (!report.cleanup.imageDetached || !report.cleanup.installationRemoved)) report.status = 'failed';
    report.finishedAt = new Date().toISOString();
    await fs.mkdir(results, { recursive: true });
    await fs.writeFile(path.join(results, 'macos-installer.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  }
  console.log(`${report.status === 'passed' ? 'PASS' : 'FAIL'}: macOS disk-image test. Evidence: desktop/test-results/macos-installer.json`);
  return report.status === 'passed' ? 0 : 1;
}

if (require.main === module) {
  try {
    const { values } = parseArgs({ options: { installer: { type: 'string' }, 'inspect-only': { type: 'boolean' }, 'disposable-os-account': { type: 'boolean' } } });
    run(values).then(code => { process.exitCode = code; }).catch(error => { console.error(`macOS installer test could not complete (${safeError(error).type}).`); process.exitCode = 1; });
  } catch { console.error('Use --installer=<DMG> with --inspect-only or --disposable-os-account.'); process.exitCode = 2; }
}
module.exports = { run };
