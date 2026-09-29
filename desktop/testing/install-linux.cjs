#!/usr/bin/env node
'use strict';

// Runs the actual AppImage launcher in a fresh disposable Linux runner account.
// It never disables the sandbox, changes system policy, or deletes an app profile.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { appImageName } = require('./linux-userns-profile.cjs');
const { childEnvironment, normalProfile, safeError, checkoutState } = require('./runtime-smoke.cjs');

const projectRoot = path.resolve(__dirname, '../..');
const resultRoot = path.join(projectRoot, 'desktop/test-results');

function parseOptions(args) {
  const options = { installer: null, disposableAccount: false };
  for (const argument of args) {
    if (argument.startsWith('--installer=') && !options.installer) options.installer = argument.slice(12);
    else if (argument === '--disposable-os-account' && !options.disposableAccount) options.disposableAccount = true;
    else throw new Error('Use --installer=<built AppImage> --disposable-os-account.');
  }
  if (!options.installer || !options.disposableAccount) throw new Error('An AppImage and explicit disposable-account acknowledgement are required.');
  return options;
}

function validateRuntimeEvidence(report, previousRunId, startedAt, architecture) {
  assert.equal(report.schema, 'taxsorted.desktop-runtime-smoke/1');
  assert.equal(report.status, 'passed');
  assert.equal(report.mode, 'packaged');
  assert.equal(report.platform, 'linux');
  assert.equal(report.arch, architecture);
  assert.equal(typeof report.runId, 'string');
  assert.notEqual(report.runId, previousRunId, 'Installed runtime evidence must come from this invocation');
  assert.ok(Number.isFinite(Date.parse(report.startedAt)) && Date.parse(report.startedAt) >= startedAt, 'Installed runtime evidence must be fresh');
  assert.equal(report.rendererErrorCount, 0);
  assert.equal(report.remoteObserverHits, 0);
  for (const key of ['archiveMatches', 'executableInsideMount', 'fuseMounted', 'readOnlyMount', 'reviewedLauncher', 'sandboxedDesktopEntry', 'mountsReleased']) assert.equal(report.appImage?.[key], true, `Actual AppImage evidence required: ${key}`);
  assert.equal(report.appImage?.payloadInspection?.status, 'pass');
  for (const key of ['appClosed', 'observerClosed', 'temporaryFilesRemoved', 'packagedProfileRemoved']) assert.equal(report.cleanup?.[key], true, `Runtime cleanup must be confirmed: ${key}`);
}

async function absent(filename) {
  try { await fs.lstat(filename); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

async function sha256(filename) {
  return createHash('sha256').update(await fs.readFile(filename)).digest('hex');
}

async function run(options) {
  const env = childEnvironment();
  const version = require('../package.json').version;
  const report = {
    schema: 'taxsorted.linux-appimage-test/1', status: 'running',
    startedAt: new Date().toISOString(), platform: process.platform, arch: process.arch,
    osVersion: os.release(), ...checkoutState(env), data: 'synthetic only',
    launchMethod: 'AppImage archive executed directly; extraction fallback is disabled',
    checks: [],
    limits: 'Disposable Ubuntu CI with FUSE libraries, Xvfb and an exact-path CI AppArmor user-namespace allowance when required. Does not establish stock Ubuntu policy compatibility, desktop integration or physical display behaviour.',
  };
  let stage = 'verify disposable native Linux runner';
  let failed = false;
  try {
    assert.equal(process.platform, 'linux', 'Run in native Linux CI');
    assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Disposable GitHub runner required');
    assert.equal(process.env.RUNNER_ENVIRONMENT, 'github-hosted', 'Self-hosted machines are excluded');
    assert.equal(options.disposableAccount, true);
    assert.ok(process.getuid() !== 0 && process.geteuid() !== 0, 'Run as an ordinary user');
    assert.ok(env.DISPLAY, 'An X display is required');
    assert.ok(!process.env.APPIMAGE_EXTRACT_AND_RUN, 'The actual FUSE launcher must be tested');
    assert.ok(!process.env.APPIMAGE && !process.env.APPDIR, 'Run the test harness outside an AppImage');
    assert.ok(await absent(normalProfile(env)), 'An existing TaxSorted profile must be preserved; use a fresh runner');

    stage = 'verify built AppImage identity';
    const expected = path.join(projectRoot, 'desktop/dist', appImageName(version, process.arch));
    const installer = path.resolve(options.installer);
    assert.equal(installer, expected, 'Use the current native AppImage from desktop/dist');
    const stat = await fs.lstat(installer);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'AppImage must be a regular file');
    assert.equal(await fs.realpath(installer), path.join(await fs.realpath(path.dirname(expected)), path.basename(expected)));
    await fs.access(installer, constants.X_OK);
    const header = await fs.open(installer, 'r');
    try {
      const signature = Buffer.alloc(11);
      await header.read(signature, 0, signature.length, 0);
      assert.ok(signature.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) && signature.subarray(8, 11).equals(Buffer.from([0x41, 0x49, 0x02])), 'Expected a type-2 AppImage');
    } finally { await header.close(); }
    report.artifact = { name: path.basename(installer), sizeBytes: stat.size, sha256: await sha256(installer), version };
    report.checks.push('Built AppImage identity and executable permission');

    stage = 'launch AppImage and exercise its mounted app';
    const smokePath = path.join(resultRoot, 'installed-smoke.json');
    let previousRunId;
    try { previousRunId = JSON.parse(await fs.readFile(smokePath, 'utf8')).runId; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const smokeStartedAt = Date.now();
    // The runtime harness owns its app, FUSE mounts and synthetic profile. It
    // has bounded operations and retains data if shutdown cannot be confirmed.
    // The outer CI job supplies the final time bound if the harness itself dies.
    execFileSync(process.execPath, [
      path.join(__dirname, 'runtime-smoke.cjs'), '--mode=packaged',
      `--executable=${installer}`, '--disposable-os-account',
      '--report-name=installed-smoke', '--expect-appimage',
    ], { cwd: projectRoot, env, stdio: 'ignore' });
    const smoke = JSON.parse(await fs.readFile(smokePath, 'utf8'));
    validateRuntimeEvidence(smoke, previousRunId, smokeStartedAt, process.arch);
    assert.equal(smoke.checkoutCommit, report.checkoutCommit);
    report.runtimeReport = 'installed-smoke.json';
    report.runtimeCheckCount = smoke.checks.length;
    report.appImage = smoke.appImage;
    report.cleanup = smoke.cleanup;
    report.checks.push('Actual archive launches, relaunches and passes the packaged runtime checks');

    stage = 'verify archive and profile after shutdown';
    assert.equal(await sha256(installer), report.artifact.sha256);
    assert.ok(await absent(normalProfile(env)), 'Synthetic app profile must be removed after verified shutdown');
    report.checks.push('Archive bytes unchanged and synthetic profile removed');
    report.status = 'passed';
  } catch (error) {
    failed = true;
    report.status = 'failed';
    report.failure = { stage, ...safeError(error) };
  } finally {
    report.finishedAt = new Date().toISOString();
    await fs.mkdir(resultRoot, { recursive: true });
    await fs.writeFile(path.join(resultRoot, 'linux-installer.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  }
  console.log(`${failed ? 'FAIL' : 'PASS'}: Linux AppImage launcher. Evidence: desktop/test-results/linux-installer.json`);
  if (failed) console.error(`Stopped during: ${report.failure.stage} (${report.failure.code || report.failure.type}).`);
  return failed ? 1 : 0;
}

if (require.main === module) {
  let options;
  try { options = parseOptions(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
  if (options) run(options).then(code => { process.exitCode = code; }).catch(error => {
    console.error(`Linux AppImage test could not write evidence (${safeError(error).type}).`);
    process.exitCode = 1;
  });
}

module.exports = { parseOptions, validateRuntimeEvidence };
