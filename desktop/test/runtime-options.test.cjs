const { test } = require('node:test');
const assert = require('node:assert/strict');
const { optionsFrom } = require('../testing/runtime-smoke.cjs');

test('installer evidence cannot select arbitrary files or weaken the disposable-account boundary', () => {
  const packaged = ['--mode=packaged', '--executable=/synthetic/app', '--disposable-os-account'];
  assert.equal(optionsFrom([...packaged, '--report-name=installed-smoke']).reportName, 'installed-smoke');
  for (const report of ['../profile', '/tmp/other', 'source-smoke', 'packaged-smoke']) {
    assert.throws(() => optionsFrom([...packaged, `--report-name=${report}`]));
  }
  assert.throws(() => optionsFrom(['--mode=source', '--report-name=installed-smoke']));
  assert.throws(() => optionsFrom(['--mode=packaged', '--executable=/synthetic/app', '--report-name=installed-smoke']));
});

test('AppImage expectations apply only to a packaged app', () => {
  assert.throws(() => optionsFrom(['--mode=source', '--expect-appimage']));
  assert.equal(optionsFrom(['--mode=packaged', '--executable=/synthetic/app', '--disposable-os-account', '--expect-appimage']).expectAppImage, true);
});
