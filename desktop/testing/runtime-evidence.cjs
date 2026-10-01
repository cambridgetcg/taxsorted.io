'use strict';

const assert = require('node:assert/strict');

// Installer reports must prove the current complete journey, not merely contain
// a success label from an older harness. Keep this contract shared across OSes.
function validateInstalledRuntime(smoke, expected) {
  assert.equal(smoke.schema, 'taxsorted.desktop-runtime-smoke/1');
  assert.equal(smoke.status, 'passed');
  assert.equal(smoke.mode, 'packaged');
  assert.equal(smoke.platform, expected.platform);
  assert.equal(smoke.arch, expected.arch);
  assert.match(expected.checkoutCommit, /^[a-f0-9]{40,64}$/);
  assert.equal(typeof expected.checkoutHadLocalChanges, 'boolean');
  assert.equal(smoke.checkoutCommit, expected.checkoutCommit);
  assert.equal(smoke.checkoutHadLocalChanges, expected.checkoutHadLocalChanges);
  assert.equal(typeof smoke.runId, 'string');
  assert.ok(smoke.runId.length > 0);
  assert.notEqual(smoke.runId, expected.previousRunId, 'Installed runtime evidence must come from this invocation');
  const startedAt = typeof expected.startedAt === 'number' ? expected.startedAt : Date.parse(expected.startedAt);
  assert.ok(Number.isFinite(startedAt) && Date.parse(smoke.startedAt) >= startedAt, 'Installed runtime evidence must be fresh');
  assert.ok(Date.parse(smoke.finishedAt) >= Date.parse(smoke.startedAt), 'Installed runtime evidence must be completed');

  assert.ok(Array.isArray(smoke.checks));
  assert.equal(smoke.checks.length, expected.appImage ? 9 : 8, 'All current runtime checks are required');
  const names = smoke.checks.map(check => check?.name);
  assert.ok(names.every(name => typeof name === 'string' && name.trim().length > 0));
  assert.equal(new Set(names).size, names.length, 'Repeated checks cannot satisfy the runtime contract');
  assert.equal(smoke.rendererErrorCount, 0);
  assert.equal(smoke.remoteObserverHits, 0);
  for (const key of ['appClosed', 'observerClosed', 'temporaryFilesRemoved', 'packagedProfileRemoved']) {
    assert.equal(smoke.cleanup?.[key], true, `Runtime cleanup must be confirmed: ${key}`);
  }

  assert.equal(smoke.runtime?.isPackaged, true);
  assert.equal(smoke.runtime.platform, expected.platform);
  assert.equal(smoke.runtime.arch, expected.arch);
  for (const key of ['noSandboxSwitch', 'disableSetuidSandboxSwitch', 'disableWebSecuritySwitch']) {
    assert.equal(smoke.runtime[key], false, `Runtime security bypass must be absent: ${key}`);
  }
  assert.deepEqual(smoke.runtime.preferences, {
    sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInWorker: false,
    webSecurity: true, webviewTag: false, allowRunningInsecureContent: false,
  });
  assert.deepEqual(smoke.runtime.osSandbox, expected.platform === 'linux'
    ? { method: 'linux-renderer-process-flags', seccompFilter: true, noNewPrivileges: true }
    : { method: 'electron-process-metric', sandboxed: true });

  for (const key of ['nativeBackForward', 'propertyContextRetained', 'restoreLinkFocused', 'backupStateClearedOnReturn', 'directBackupMenu']) {
    assert.equal(smoke.navigation?.[key], true, `Navigation evidence required: ${key}`);
  }
  assert.equal(smoke.backupProtection?.schema, 'taxsorted.encrypted-books-backup/1');
  for (const key of ['encryptedExport', 'independentDecryption', 'wrongPasswordRejectionObserved', 'wrongPasswordPreservedRecords', 'encryptedSafetyCopy', 'confirmedRestore']) {
    assert.equal(smoke.backupProtection[key], true, `Books recovery evidence required: ${key}`);
  }
  assert.equal(smoke.workspaceRecovery?.schema, 'taxsorted.encrypted-workspace-backup/1');
  for (const key of ['encryptedExport', 'independentDecryption', 'allSavedSections', 'bothPreparationYears', 'wrongPasswordPreservedWork', 'encryptedSafetyCopy', 'confirmedRestore', 'persistedAfterRelaunch', 'oldBooksFormatRetained']) {
    assert.equal(smoke.workspaceRecovery[key], true, `Workspace recovery evidence required: ${key}`);
  }

  if (expected.appImage) {
    assert.equal(expected.platform, 'linux');
    for (const key of ['archiveMatches', 'executableInsideMount', 'fuseMounted', 'readOnlyMount', 'reviewedLauncher', 'sandboxedDesktopEntry', 'mountsReleased']) {
      assert.equal(smoke.appImage?.[key], true, `Actual AppImage evidence required: ${key}`);
    }
    assert.equal(smoke.appImage?.payloadInspection?.status, 'pass');
  }
}

module.exports = { validateInstalledRuntime };
