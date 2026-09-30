const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateInstalledRuntime } = require('../testing/runtime-evidence.cjs');
const { runtimeFixture, expectedFixture } = require('./fixtures/runtime-evidence.cjs');

test('complete installed recovery evidence is accepted on each native target', () => {
  for (const [platform, arch, appImage] of [['win32', 'x64', false], ['darwin', 'x64', false], ['darwin', 'arm64', false], ['linux', 'x64', true]]) {
    assert.doesNotThrow(() => validateInstalledRuntime(runtimeFixture(platform, arch, appImage), expectedFixture(platform, arch, appImage)));
  }
});

test('older seven-check reports and padded or incomplete recovery reports are rejected', () => {
  const complete = runtimeFixture();
  for (const checks of [complete.checks.slice(0, 7), [...complete.checks, { name: 'Extra' }], Array(8).fill({ name: 'Repeated' }), [...complete.checks.slice(0, 7), {}]]) {
    assert.throws(() => validateInstalledRuntime({ ...complete, checks }, expectedFixture()));
  }
  for (const section of ['navigation', 'backupProtection', 'workspaceRecovery']) {
    const absent = structuredClone(complete);
    delete absent[section];
    assert.throws(() => validateInstalledRuntime(absent, expectedFixture()), `Missing ${section}`);
    for (const [key, value] of Object.entries(complete[section])) {
      for (const replacement of [undefined, value === true ? false : 'wrong-schema']) {
        const incomplete = structuredClone(complete);
        incomplete[section][key] = replacement;
        assert.throws(() => validateInstalledRuntime(incomplete, expectedFixture()), `${section}.${key}`);
      }
    }
  }
});

test('installed evidence must match the checkout and come from a completed fresh run', () => {
  for (const changed of [
    { schema: 'older' }, { status: 'failed' }, { mode: 'source' }, { platform: 'darwin' }, { arch: 'arm64' },
    { checkoutCommit: 'b'.repeat(40) }, { checkoutHadLocalChanges: true }, { runId: 'older' }, { runId: '' },
    { startedAt: new Date(500).toISOString() }, { startedAt: 'invalid' }, { finishedAt: new Date(500).toISOString() }, { finishedAt: undefined },
    { rendererErrorCount: 1 }, { remoteObserverHits: 1 },
  ]) assert.throws(() => validateInstalledRuntime({ ...runtimeFixture(), ...changed }, expectedFixture()));
  assert.throws(() => validateInstalledRuntime(runtimeFixture(), { ...expectedFixture(), checkoutCommit: null }));
  assert.throws(() => validateInstalledRuntime(runtimeFixture(), { ...expectedFixture(), checkoutHadLocalChanges: undefined }));
});

test('runtime security and every cleanup flag remain mandatory', () => {
  for (const section of ['cleanup', 'runtime']) {
    const incomplete = runtimeFixture();
    delete incomplete[section];
    assert.throws(() => validateInstalledRuntime(incomplete, expectedFixture()));
  }
  for (const key of Object.keys(runtimeFixture().cleanup)) {
    const incomplete = runtimeFixture();
    incomplete.cleanup[key] = false;
    assert.throws(() => validateInstalledRuntime(incomplete, expectedFixture()), key);
  }
  for (const [key, value] of Object.entries(runtimeFixture().runtime)) {
    const incomplete = runtimeFixture();
    incomplete.runtime[key] = typeof value === 'boolean' ? !value : undefined;
    assert.throws(() => validateInstalledRuntime(incomplete, expectedFixture()), key);
  }
});

test('the ninth AppImage check requires a real mounted launcher and completed cleanup', () => {
  const expected = expectedFixture('linux', 'x64', true);
  const complete = runtimeFixture('linux', 'x64', true);
  assert.throws(() => validateInstalledRuntime({ ...complete, checks: complete.checks.slice(0, 8) }, expected));
  for (const key of Object.keys(complete.appImage)) {
    const incomplete = structuredClone(complete);
    incomplete.appImage[key] = key === 'payloadInspection' ? { status: 'fail' } : false;
    assert.throws(() => validateInstalledRuntime(incomplete, expected), key);
  }
});
