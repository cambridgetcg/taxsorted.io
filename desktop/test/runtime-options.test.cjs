const { test } = require('node:test');
const assert = require('node:assert/strict');
const { optionsFrom, safeError } = require('../testing/runtime-smoke.cjs');

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

test('runtime diagnostics classify locator failures without emitting raw text or private values', () => {
  const error = new Error('locator.waitFor: strict mode violation; synthetic-private-path and synthetic-password');
  assert.deepEqual(safeError(error), { type: 'Error', category: 'ambiguous-locator' });
  for (const [message, category] of [
    ['Element is not attached to the DOM: synthetic-private-path', 'detached-element'],
    ['Target page, context or browser has been closed: synthetic-password', 'closed-target'],
    ['Execution context was destroyed: synthetic-url', 'interrupted-navigation'],
    ['Timeout 30000ms exceeded: synthetic-password', 'timeout'],
  ]) assert.deepEqual(safeError(new Error(message)), { type: 'Error', category });
  assert.deepEqual(safeError(new Error('Unclassified synthetic-private-value')), { type: 'Error' });
});
