'use strict';

// Deterministic local integrity signing only. The pinned builder's identity "-"
// path first searches keychain identities; call osx-sign directly instead.
const assert = require('node:assert/strict');
const path = require('node:path');

function signingOptions(context, hostPlatform = process.platform) {
  if (context.electronPlatformName !== 'darwin') return null;
  assert.equal(hostPlatform, 'darwin', 'macOS previews require a native macOS build');
  const config = context.packager.config;
  assert.equal(config.mac?.identity, null, 'Automatic certificate signing must remain disabled');
  assert.equal(config.mac?.notarize, false, 'Preview notarisation must remain disabled');
  assert.equal(config.mac?.hardenedRuntime, true, 'Preview hardened runtime must remain enabled');
  // Builder flips fuses after afterPack, which would invalidate this signature.
  assert.ok(config.electronFuses == null, 'Review signing order before introducing Electron fuse changes');
  const product = context.packager.appInfo.productFilename;
  assert.ok(product && path.basename(product) === product, 'Expected an application basename');
  assert.ok(path.isAbsolute(context.appOutDir), 'Expected an absolute build output directory');
  const entitlements = require.resolve('app-builder-lib/templates/entitlements.mac.plist');
  return {
    app: path.join(context.appOutDir, `${product}.app`),
    platform: 'darwin',
    identity: '-',
    identityValidation: false,
    preAutoEntitlements: false,
    preEmbedProvisioningProfile: false,
    strictVerify: true,
    optionsForFile: () => ({
      entitlements,
      hardenedRuntime: true,
      // No timestamp service or developer credential participates in a preview.
      timestamp: 'none',
    }),
  };
}

async function signPreview(context) {
  const options = signingOptions(context);
  if (!options) return;
  const { signAsync } = require('@electron/osx-sign');
  await signAsync(options);
  console.log('TaxSorted macOS preview: ad-hoc integrity signature verified; no publisher identity or notarisation.');
}

module.exports = signPreview;
module.exports.signingOptions = signingOptions;
