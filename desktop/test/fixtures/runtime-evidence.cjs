'use strict';

// Synthetic evidence only; this fixture is not a report of a real app run.
function runtimeFixture(platform = 'win32', arch = 'x64', appImage = false) {
  return {
    schema: 'taxsorted.desktop-runtime-smoke/1', status: 'passed', mode: 'packaged', platform, arch,
    runId: 'fresh', startedAt: new Date(2_000).toISOString(), finishedAt: new Date(3_000).toISOString(),
    checkoutCommit: 'a'.repeat(40), checkoutHadLocalChanges: false,
    checks: Array.from({ length: appImage ? 9 : 8 }, (_, index) => ({ name: `Synthetic check ${index + 1}` })),
    rendererErrorCount: 0, remoteObserverHits: 0,
    cleanup: { appClosed: true, observerClosed: true, temporaryFilesRemoved: true, packagedProfileRemoved: true },
    runtime: {
      isPackaged: true, platform, arch,
      noSandboxSwitch: false, disableSetuidSandboxSwitch: false, disableWebSecuritySwitch: false,
      preferences: {
        sandbox: true, contextIsolation: true, nodeIntegration: false, nodeIntegrationInWorker: false,
        webSecurity: true, webviewTag: false, allowRunningInsecureContent: false,
      },
      osSandbox: platform === 'linux'
        ? { method: 'linux-renderer-process-flags', seccompFilter: true, noNewPrivileges: true }
        : { method: 'electron-process-metric', sandboxed: true },
    },
    navigation: { nativeBackForward: true, propertyContextRetained: true, restoreLinkFocused: true, backupStateClearedOnReturn: true, directBackupMenu: true },
    backupProtection: {
      schema: 'taxsorted.encrypted-books-backup/1', encryptedExport: true, independentDecryption: true,
      wrongPasswordRejectionObserved: true, wrongPasswordPreservedRecords: true, encryptedSafetyCopy: true, confirmedRestore: true,
    },
    workspaceRecovery: {
      schema: 'taxsorted.encrypted-workspace-backup/1', encryptedExport: true, independentDecryption: true,
      allSavedSections: true, bothPreparationYears: true, wrongPasswordPreservedWork: true,
      encryptedSafetyCopy: true, confirmedRestore: true, persistedAfterRelaunch: true, oldBooksFormatRetained: true,
    },
    ...(appImage ? { appImage: {
      archiveMatches: true, executableInsideMount: true, fuseMounted: true, readOnlyMount: true,
      reviewedLauncher: true, sandboxedDesktopEntry: true, mountsReleased: true, payloadInspection: { status: 'pass' },
    } } : {}),
  };
}

function expectedFixture(platform = 'win32', arch = 'x64', appImage = false) {
  return { platform, arch, appImage, startedAt: 1_000, checkoutCommit: 'a'.repeat(40), checkoutHadLocalChanges: false, previousRunId: 'older' };
}

module.exports = { runtimeFixture, expectedFixture };
