const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { appImageName } = require('../testing/linux-userns-profile.cjs');
const { parseOptions, validateRuntimeEvidence } = require('../testing/install-linux.cjs');

async function launcherFixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted launcher '));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const launcher = path.join(directory, 'AppRun');
  await fs.copyFile(path.join(__dirname, '../assets/AppRun'), launcher);
  await fs.chmod(launcher, 0o755);
  await fs.writeFile(path.join(directory, 'taxsorted-local'), '#!/usr/bin/env bash\nprintf "%s\\n" "${APPDIR}" "$@"\n', { mode: 0o755 });
  return { directory, launcher, env: { PATH: process.env.PATH, APPDIR: directory } };
}

test('AppImage launcher preserves arguments and does not add sandbox bypass flags', { skip: process.platform === 'win32' }, async t => {
  const fixture = await launcherFixture(t);
  const result = spawnSync(fixture.launcher, ['taxsorted://app/a path/', '--inspect=0'], { env: fixture.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trimEnd().split('\n'), [fixture.directory, 'taxsorted://app/a path/', '--inspect=0']);
});

test('AppImage launcher refuses security bypasses before executing the app', { skip: process.platform === 'win32' }, async t => {
  const fixture = await launcherFixture(t);
  for (const argument of ['--no-sandbox', '--no-sandbox=true', '--disable-setuid-sandbox', '--disable-web-security=1']) {
    const result = spawnSync(fixture.launcher, [argument], { env: fixture.env, encoding: 'utf8' });
    assert.equal(result.status, 64);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /requires its browser security controls/);
  }
});

test('AppImage executable names are tied to the version and native architecture', () => {
  assert.equal(appImageName('0.1.0', 'x64'), 'TaxSorted-Local-0.1.0-linux-x86_64.AppImage');
  assert.equal(appImageName('0.2.0-preview.1', 'arm64'), 'TaxSorted-Local-0.2.0-preview.1-linux-arm64.AppImage');
  assert.throws(() => appImageName('../0.1.0', 'x64'));
  assert.throws(() => appImageName('0.1.0', 'ia32'));
});

test('Linux packaging includes the owned launcher and excludes desktop sandbox bypass arguments', async () => {
  const yaml = require('js-yaml');
  const config = yaml.load(await fs.readFile(path.join(__dirname, '../electron-builder.yml'), 'utf8'));
  assert.deepEqual(config.appImage.executableArgs, []);
  assert.deepEqual(config.linux.extraFiles, [{ from: 'assets/AppRun', to: 'AppRun' }]);
  if (process.platform !== 'win32') assert.ok((await fs.stat(path.join(__dirname, '../assets/AppRun'))).mode & 0o111);
});

test('AppImage installer test requires an explicit artifact and disposable account', () => {
  assert.deepEqual(parseOptions(['--installer=/built/test.AppImage', '--disposable-os-account']), { installer: '/built/test.AppImage', disposableAccount: true });
  for (const args of [[], ['--installer=/built/test.AppImage'], ['--disposable-os-account'], ['--installer=a', '--installer=b', '--disposable-os-account']]) assert.throws(() => parseOptions(args));
});

test('AppImage test rejects stale reports, extraction fallback and incomplete cleanup', () => {
  const fixture = {
    schema: 'taxsorted.desktop-runtime-smoke/1', status: 'passed', mode: 'packaged', platform: 'linux', arch: 'x64',
    runId: 'fresh', startedAt: new Date(2_000).toISOString(), rendererErrorCount: 0, remoteObserverHits: 0,
    appImage: { archiveMatches: true, executableInsideMount: true, fuseMounted: true, readOnlyMount: true, reviewedLauncher: true, sandboxedDesktopEntry: true, mountsReleased: true, payloadInspection: { status: 'pass' } },
    cleanup: { appClosed: true, observerClosed: true, temporaryFilesRemoved: true, packagedProfileRemoved: true },
  };
  validateRuntimeEvidence(fixture, 'older', 1_000, 'x64');
  assert.throws(() => validateRuntimeEvidence(fixture, 'fresh', 1_000, 'x64'));
  assert.throws(() => validateRuntimeEvidence(fixture, 'older', 3_000, 'x64'));
  for (const [key, value] of [['fuseMounted', false], ['readOnlyMount', false], ['reviewedLauncher', false], ['sandboxedDesktopEntry', false], ['mountsReleased', false], ['payloadInspection', { status: 'fail' }]]) {
    assert.throws(() => validateRuntimeEvidence({ ...fixture, appImage: { ...fixture.appImage, [key]: value } }, 'older', 1_000, 'x64'));
  }
  assert.throws(() => validateRuntimeEvidence({ ...fixture, cleanup: { ...fixture.cleanup, appClosed: false } }, 'older', 1_000, 'x64'));
});
