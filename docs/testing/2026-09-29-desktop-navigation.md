# Direct recovery and desktop navigation — 29 September 2026

Local verification and all four corrected native jobs passed in
[run 36601360712](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36601360712)
at commit `fd73870d08e3e14fbd279c924e012539c4b973ee`. The app implementation is
unchanged from `fb0eac623bee8345e52ceef70645535038df8f0a`; the subsequent change
tightens the test's observation of wrong-password rejection. The native campaign
completed at **17:14:16 UTC on 29 September 2026**.
Manual consumer acceptance remains **NOT RUN**.

## What changed

- **Money records → Backups** opens a dedicated, expanded recovery page. The
  desktop status bar, File menu and data-help page link directly to it. Other
  Books views offer links; the older Income Tax records route retains its
  embedded disclosure.
- An empty workspace offers restoration alongside manual entry and CSV import.
  The restore shortcut keeps property context and focuses its destination after
  the records store loads. A jump link also reaches restore before the save form.
- Save and restore have separate headings. While unlocking an incoming file,
  unrelated new-backup password fields are hidden. The required encrypted safety
  copy sits immediately below the preview and before replacement confirmation.
- **Navigate → Back / Forward** follows the current window's Chromium history.
  Shortcuts are `Cmd+[` / `Cmd+]` on Mac and `Alt+Left` / `Alt+Right` on Windows
  and Linux. Menu availability tracks full-page and in-page navigation and resets
  when a window closes. The desktop Money records link opens the saved workspace.

Leaving Backups clears passwords, selected file and preview. Returning does not
resume a pending replacement. History navigation does not undo saved record changes
or save unfinished forms. Encryption, exact safety snapshot, stale-edit rejection
and atomic Books replacement retain their existing contracts. There is no new
renderer bridge, account requirement or persistent navigation state.

## Local evidence

| Check | Result |
|---|---|
| Frontend | 864 tests across 110 files passed |
| Desktop boundaries, navigation and sanitised diagnostics | 51 tests passed |
| Source scaffold | Eight tests passed |
| TypeScript and targeted ESLint | Passed |
| Offline build | 81 pages built and staged; publication gate closed |
| Source Electron walkthrough | Seven checks passed, including five navigation assertions; corrected backup-specific wrong-password wait also passed locally |
| Visual review | 390px window and 200% zoom fit without horizontal overflow; wide and narrow backup controls reviewed |

The source walkthrough exercises the actual native menu callbacks and verifies
their accelerator definitions. It follows the empty-workspace restore link,
checks focus, navigates Back/Forward through property routes, exports an encrypted
file, independently decrypts it, rejects a wrong password, checks both saved records
on Money, returns with native Back and confirms transient recovery state is blank.
It then reselects the file, unlocks, saves an independently decrypted protected
safety copy, confirms restore and inspects the remaining record. The native File
menu also opens recovery directly. All seven existing runtime boundaries remain
covered. Zero renderer errors and zero network observer hits were recorded.

Local walkthroughs used only synthetic records and owned temporary profiles;
cleanup completed. Visual inspection entered no password or personal records.
Local runtime evidence identifies its dirty development checkout before the final
harness commit; visual captures record the unchanged app implementation revision.
The native matrix provides clean-revision evidence.
Physical menu and shortcut key delivery remain part of manual case M02.

## Native evidence and handoff

| Target | Source / unpacked / installed runtime checks | Installer path |
|---|---|---|
| Windows x64 | PASS: 7 / 7 / 7 | PASS: NSIS install/runtime/uninstall |
| Linux x64 | PASS: 7 / 7 / 8 | PASS: actual read-only FUSE AppImage |
| Intel Mac x64 | PASS: 7 / 7 / 7 | PASS: copied app after DMG ejection |
| Apple silicon Mac | PASS: 7 / 7 / 7 | PASS: copied app after DMG ejection |

All 12 runtime reports identify the same clean `fd73870d` checkout. Each records
`wrongPasswordRejectionObserved: true`, encrypted export, independent decryption,
record preservation, encrypted safety copy and confirmed restore, plus all five
navigation assertions. All report zero renderer errors and zero network observer
hits, enabled sandboxing, and complete app/observer/owned temporary cleanup.
Packaged and installed runs also removed their synthetic app profiles. The network
probes cover the exercised app-session boundaries, not every device network path.

Each target passed 864 frontend tests across 110 files and 388 engine tests across
31 files. macOS/Linux passed all 51 desktop and eight scaffold tests. Windows passed
49 desktop and six scaffold tests, with two POSIX-launcher and two Windows-symlink
skips respectively. No other failures or skips were reported.

Both Macs verified their ad-hoc integrity signatures and recorded Gatekeeper
rejection (exit 3). Linux verified the actual archive, read-only FUSE mount,
reviewed launcher and released mounts. Windows verified current-user installation,
registration and shortcuts, installed runtime, uninstall, and preservation of a
synthetic profile sentinel; all six owned-state cleanup checks passed. The sentinel
does not establish Books recovery after reinstall. Residual OS installer cache is
handled by disposable runner teardown.

The corrected campaign handoff is retained under
`desktop/dist/friction-36601360712/`, with six platform packages, sanitised evidence,
runner checksums and a fresh source scaffold. All six downloaded packages match
their runner checksums; the DMG, NSIS and AppImage hashes also match their installer
reports. Mac ZIP alternatives are hashed but were not separately installed.
The handoff README identifies the later source/documentation revision separately
from the native tested revision. Hosted artifacts expire after 14 days; the local
handoff keeps the downloaded copies.

### Source handoff check

The final scaffold check found that the conservative backup-directory exclusion
also omitted the new application's `books/workspace/backups/page.tsx`. The source
copier now permits that exact reviewed source file. Adjacent personal backup files,
other backup directories, generated pages, ignored files and symlinks remain
excluded. A regression checks both inclusion and those exclusions.

After this source-copy-only correction, all **nine scaffold tests** passed on the
development Mac. A fresh scaffold completed the scoped clean dependency install
and offline build/staging; the Backups route was present in source, exported pages
and the staged app. Its temporary project was removed. This does not alter the
native application, and the native campaign's eight-test scaffold result remains
the result for its recorded revision. The source ZIP includes this correction and
the completed guide; it excludes dependencies, app profiles and known
private/generated paths. These path exclusions do not scan arbitrary contents for
embedded secrets.

## Test correction and retained failure evidence

The [initial campaign](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36598641779)
is retained under `desktop/dist/friction-36598641779/` as
superseded evidence, including the Windows failure. It is not a complete download
handoff. The failure occurred after successful installed payload, navigation and
persistence checks, with zero renderer errors or observed network requests and
complete runtime/profile cleanup. The installer conservatively retained its
installation for disposable runner teardown after the runtime failure.

The harness had used a page-wide `role=alert` wait. Next also creates a
screen-reader route-announcement alert. A real local reproduction found one global
alert before decryption and two after rejection: the broad wait could pass early
or fail immediately with a strict-locator error. The corrected harness waits for
the specific unlock failure inside the backup-controls region and requires the
unlock password to have cleared before checking that both saved records remain.
It records observed rejection separately and uses fixed failure stages/categories
without logging error messages, paths, passwords or decrypted records. App and
storage behavior are unchanged by this test correction.

Earlier protected-backup packages remain historical and do not include this
navigation update. Earlier native reports do not establish the newly explicit
observation of wrong-password rejection; the corrected campaign is the evidence
for that assertion.

This remains a test preview. The [manual plan](../DESKTOP-TESTING.md) records
consumer installation, trust prompts, real file dialogs, physical network
disconnection, reboot, cross-environment recovery, reinstall and two-version
upgrade separately. Mac ad-hoc signatures do not supply Developer ID/notarisation;
Windows previews are unsigned. Protection covers exported Books files; the live
profile, Passport, checklist, attachments and other exports are outside its scope.
No public release or production deployment was performed.
