const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { signingOptions } = require('../scripts/ad-hoc-sign.cjs');

function context() {
  return {
    electronPlatformName: 'darwin',
    appOutDir: path.resolve('synthetic-build'),
    packager: {
      config: { mac: { identity: null, notarize: false, hardenedRuntime: true } },
      appInfo: { productFilename: 'TaxSorted Local' },
    },
  };
}

test('preview signing excludes credential discovery, provisioning and timestamp services', () => {
  const options = signingOptions(context(), 'darwin');
  assert.equal(options.identity, '-');
  assert.equal(options.identityValidation, false);
  assert.equal(options.preAutoEntitlements, false);
  assert.equal(options.preEmbedProvisioningProfile, false);
  assert.equal(options.strictVerify, true);
  const file = options.optionsForFile();
  assert.equal(file.hardenedRuntime, true);
  assert.equal(file.timestamp, 'none');
  assert.equal(file.entitlements, require.resolve('app-builder-lib/templates/entitlements.mac.plist'));
});

test('preview signing refuses configurations that could select credentials or invalidate signing order', () => {
  for (const mutate of [
    value => { value.packager.config.mac.identity = '-'; },
    value => { value.packager.config.mac.notarize = true; },
    value => { value.packager.config.mac.hardenedRuntime = false; },
    value => { value.packager.config.electronFuses = {}; },
  ]) {
    const value = context();
    mutate(value);
    assert.throws(() => signingOptions(value, 'darwin'), { code: 'ERR_ASSERTION' });
  }
  assert.throws(() => signingOptions(context(), 'linux'), { code: 'ERR_ASSERTION' });
  assert.equal(signingOptions({ electronPlatformName: 'linux' }, 'linux'), null);
  assert.equal(signingOptions({ electronPlatformName: 'win32' }, 'win32'), null);
});
