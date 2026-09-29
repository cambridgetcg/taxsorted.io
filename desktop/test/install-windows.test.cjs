const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { requireDisposableRunner, nsisArguments, validateRegistration, validateRuntimeSmoke, removeOwnedSentinel } = require('../testing/install-windows.cjs');

test('Windows installer test refuses personal, self-hosted and non-Windows environments', () => {
  const options = { disposableAccount: true };
  const env = { GITHUB_ACTIONS: 'true', RUNNER_ENVIRONMENT: 'github-hosted', RUNNER_OS: 'Windows', RUNNER_TEMP: 'C:\\Temp', APPDATA: 'C:\\AppData', LOCALAPPDATA: 'C:\\Local', SystemRoot: 'C:\\Windows' };
  assert.doesNotThrow(() => requireDisposableRunner(options, 'win32', env));
  assert.throws(() => requireDisposableRunner({}, 'win32', env));
  assert.throws(() => requireDisposableRunner(options, 'darwin', env));
  for (const changed of [{ GITHUB_ACTIONS: 'false' }, { RUNNER_ENVIRONMENT: 'self-hosted' }, { RUNNER_OS: 'Linux' }, { APPDATA: '' }]) assert.throws(() => requireDisposableRunner(options, 'win32', { ...env, ...changed }));
});

test('NSIS path arguments preserve spaces without quotes and prevent malformed final arguments', () => {
  const directory = 'C:\\Runner Temp\\taxsorted-test\\TaxSorted Local';
  assert.deepEqual(nsisArguments(directory), ['/S', '/currentuser', `/D=${directory}`]);
  assert.deepEqual(nsisArguments(directory, true), ['/S', '/currentuser', `_?=${directory}`]);
  for (const directory of ['relative', 'C:\\', 'C:\\one\\..\\two', 'C:\\bad"name', 'C:\\bad\nname']) assert.throws(() => nsisArguments(directory));
});

test('registration check rejects all-users installation and unexpected location or version', () => {
  const directory = 'C:\\Temp\\TaxSorted Local';
  const rows = [{ hive: 'CurrentUser', kind: 'install', location: directory.toLowerCase() }, { hive: 'CurrentUser', kind: 'uninstall', version: '0.1.0' }];
  assert.doesNotThrow(() => validateRegistration(rows, directory, '0.1.0'));
  assert.throws(() => validateRegistration([], directory, '0.1.0'));
  assert.throws(() => validateRegistration(rows.map(row => ({ ...row, hive: 'LocalMachine' })), directory, '0.1.0'));
  assert.throws(() => validateRegistration(rows, 'C:\\Somewhere Else', '0.1.0'));
  assert.throws(() => validateRegistration(rows, directory, '0.2.0'));
});

test('installed runtime evidence rejects stale, wrong-checkout or incomplete smoke results', () => {
  const report = { startedAt: '2026-09-29T10:00:00.000Z', checkoutCommit: 'a'.repeat(40), checkoutHadLocalChanges: false };
  const smoke = { schema: 'taxsorted.desktop-runtime-smoke/1', mode: 'packaged', platform: 'win32', arch: 'x64', ...report, startedAt: '2026-09-29T10:01:00.000Z', finishedAt: '2026-09-29T10:02:00.000Z', status: 'passed', checks: Array(7).fill({ name: 'synthetic check' }), rendererErrorCount: 0, remoteObserverHits: 0, cleanup: { appClosed: true, observerClosed: true, temporaryFilesRemoved: true, packagedProfileRemoved: true } };
  assert.doesNotThrow(() => validateRuntimeSmoke(smoke, report));
  for (const changed of [{ mode: 'source' }, { platform: 'darwin' }, { arch: 'arm64' }, { checkoutCommit: 'b'.repeat(40) }, { startedAt: '2026-09-28T10:01:00.000Z' }, { status: 'failed' }, { checks: [] }, { remoteObserverHits: 1 }, { cleanup: { ...smoke.cleanup, appClosed: false } }]) assert.throws(() => validateRuntimeSmoke({ ...smoke, ...changed }, report));
});

test('sentinel cleanup preserves directories containing unexpected data or a changed token', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'taxsorted-installer-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const profile = path.join(root, 'profile');
  await fs.mkdir(profile);
  const sentinel = path.join(profile, 'installer-test-synthetic-sentinel.txt');
  await fs.writeFile(sentinel, 'owned-token');
  await assert.rejects(removeOwnedSentinel(profile, 'different-token'));
  await fs.writeFile(path.join(profile, 'unexpected-record.json'), '{}');
  await assert.rejects(removeOwnedSentinel(profile, 'owned-token'));
  assert.equal(await fs.readFile(sentinel, 'utf8'), 'owned-token');
  await fs.unlink(path.join(profile, 'unexpected-record.json'));
  await removeOwnedSentinel(profile, 'owned-token');
  await assert.rejects(fs.lstat(profile), { code: 'ENOENT' });
});
