# Protected Books recovery — 29 September 2026

**Native automated matrix: PASS on all four targets. Manual consumer acceptance:
NOT RUN.**

Books downloads now default to password protection. Restore unlocks a preview on
the device, requires an encrypted copy of the Books currently present, and retains
the existing explicit replacement confirmation and atomic storage guard. Ordinary
plain downloads require a deliberate compatibility choice and acknowledgement;
old plain backups still open. The preview identifies the actual file format.

This protects exported Books files, not the live app profile, Passport, checklist,
attachments or other ordinary exports. There is no password reset or server-held
recovery key. The [backup contract](../BOOKS-BACKUP.md) records the complete format,
cryptography, coverage, limits and recovery instructions.

## Local verification

These checks completed on the development Apple silicon Mac before the final
implementation commit. The native matrix below establishes the exact clean revision.

| Check | Result |
|---|---|
| Frontend suite | 850 tests across 110 files passed |
| Calculation engine | 388 tests across 31 files passed |
| Desktop boundaries | 44 tests passed |
| Source scaffold | Eight tests passed |
| TypeScript and ESLint for changed frontend files | Passed |
| Offline build/staging | 80 pages built; publication gate remained closed |
| Actual source Electron walkthrough | Seven checks passed; protected export, independent decryption, wrong-password refusal, protected safety copy and confirmed restore verified |
| Wide/narrow backup controls | Visually reviewed; narrow panel had no horizontal overflow; no password or personal records entered |

The 69 codec cases include independent Node crypto interoperability in both
directions, fresh salt/IV generation, a full 10 MiB payload, authentication failures,
hostile parameters, file/decoded-size limits, strict envelope/base64, duplicate
members, Unicode/BOM boundaries and unavailable crypto. The 16 UI cases include
the exact preflight safety snapshot, stale edits, delayed completion after file
changes/cancellation/unmount/store changes, blocked download, legacy input and
post-restore refresh failure. The existing 40 Books-parser tests also passed.

The source walkthrough reported zero renderer errors and zero observed requests
in its network probes. It used only synthetic records, temporary exports and an
owned temporary profile; cleanup completed. Visual inspection also used an owned
temporary profile and closed/removed it afterwards. The full frontend suite emitted
existing DOM-nesting/prop warnings in unrelated submission/dashboard/VAT tests;
none failed, and the exercised desktop recovery flow had no renderer errors.

## Native packaged results

[Run 36578036975](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36578036975)
tests `261cf6ae90eebc923409cd7f618e5cb6f6bd88cb` on
`feat/service-oriented-rebuild-20260929`. All four jobs completed successfully at
**14:07:48 UTC**.

| Target | Source / unpacked / installed recovery | Actual installer path |
|---|---|---|
| Windows x64 | PASS: 7 / 7 / 7 checks | PASS: NSIS install/runtime/uninstall |
| Linux x64 | PASS: 7 / 7 / 8 checks | PASS: actual read-only FUSE AppImage |
| Intel Mac x64 | PASS: 7 / 7 / 7 checks | PASS: copied app after DMG ejection |
| Apple silicon Mac | PASS: 7 / 7 / 7 checks | PASS: copied app after DMG ejection |

All 12 native runtime reports identify the same clean tested checkout and include
`backupProtection` with the protected schema and all five checks true: encrypted
export, independent decryption, wrong-password preservation, encrypted safety copy
and confirmed restore. All report zero renderer errors/observer hits and complete
app, observer and owned temporary/profile cleanup. The harness does not persist its
synthetic password or decrypted records in the report. Network evidence covers
the exercised app-session probes, not every device/network path.

Each target passed 850 frontend and 388 engine tests. macOS/Linux passed all
44 desktop and eight scaffold tests. Windows passed 42 desktop and six scaffold
tests, with the same two POSIX-launcher and two Windows-symlink skips as the prior
campaign. Both Macs verified their ad-hoc signatures and recorded Gatekeeper
rejection (exit 3). Linux verified its matching archive, read-only FUSE mount,
reviewed launcher, sandboxed renderer and mount cleanup. Windows verified current-user
installation, registration/shortcuts, installed runtime, uninstall and retention
of a synthetic profile sentinel; owned-state cleanup passed, with residual OS
installer cache handled by runner disposal.

## Handoff and remaining acceptance

The campaign folder is `desktop/dist/protected-books-36578036975/`. It retains
platform installers/archives, runner manifests/checksums and sanitised evidence.
A fresh `TaxSorted-Local-0.1.0-test-source.zip` scaffold and aggregate
`SHA256SUMS.txt` are generated after this report is committed. All six downloaded
package files matched their runner checksums; the four DMG/NSIS/AppImage hashes
also matched the installer evidence. Mac ZIP alternatives are retained and hashed,
not separately installed. The source copy includes the recovery guide and test
tools; it excludes dependencies, app profiles and known private/generated paths.
Those source-path exclusions are not an embedded-secret scanner.

`evidence/<platform>/` contains source, unpacked and installed runtime summaries,
package inspection and the installer report. `evidence/local/` preserves the
pre-commit local smoke report and password-free UI captures as supplementary
evidence. Hosted artifacts expire after 14 days. Earlier installer campaigns remain
historical and predate password-protected Books files.

This is a test preview. [Manual cases M01–M14](../DESKTOP-TESTING.md#manual-cases-on-each-native-desktop)
remain NOT RUN, including native Save cancellation, real consumer trust prompts,
physical network disconnection, reboot, cross-environment recovery, reinstall and
a two-version upgrade. Windows CI uses Server 2025 with an administrative runner;
Linux uses Xvfb and an exact-path AppArmor allowance; Macs use temporary copied
applications. Ad-hoc Mac signatures do not provide Developer ID/notarisation, and
Windows previews are unsigned. No release or production deployment was performed.

The next recovery increment needs a shared atomic storage boundary and restore
generation before Passport and checklist can join a complete workspace backup.
Their current independent save mechanisms must not be treated as an atomic restore.
