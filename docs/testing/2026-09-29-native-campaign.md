# Native desktop campaign — 29 September 2026

**Native automated matrix: PASS on all four targets. Manual consumer acceptance:
NOT RUN.** Source and packaged applications completed the same seven synthetic
runtime checks on Windows x64, Linux x64, native Intel Mac and Apple silicon Mac.

The final [GitHub Actions run](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36564143019)
completed successfully at **11:58:25 UTC**, testing commit
[`1b64679a1a8141fdf54f742e5ca43ea0328feab3`](https://github.com/cambridgetcg/taxsorted.io/commit/1b64679a1a8141fdf54f742e5ca43ea0328feab3)
on `feat/service-oriented-rebuild-20260929`. All eight smoke reports identify that
clean checkout. The workflow built previews and uploaded artifacts; it did not
publish a release or deploy the service.

## Final results

| Target / native runner | Shared tests, desktop build and packaging | Source smoke | Packaged smoke | Package inspection | Consumer installation/manual cases |
|---|---|---|---|---|---|
| Windows x64 / `windows-2025` | PASS | 7/7 | 7/7 | PASS: 4 runtime files, 517 public files | NOT RUN on Windows 11 |
| Linux x64 / `ubuntu-24.04` | PASS | 7/7 | 7/7 | PASS: 4 runtime files, 515 public files | NOT RUN in a real GNOME session or mounted AppImage |
| Intel Mac x64 / `macos-15-intel` | PASS | 7/7 | 7/7 | PASS: 4 runtime files, 515 public files | NOT RUN through DMG installation/native dialogs |
| Apple silicon / `macos-15` | PASS | 7/7 | 7/7 | PASS: 4 runtime files, 515 public files | NOT RUN through DMG installation/native dialogs |

Each target passed **772 frontend tests, 388 engine tests and 29 desktop tests**.
The scaffold suite passed all eight tests on macOS/Linux; Windows passed six and
explicitly skipped two symlink tests because Windows symlink privileges vary. The
desktop protocol's Windows junction tests ran. There were no skipped desktop tests.

All package inspections matched the declared runtime, that runner's staged public
pages and both licence files. The research publication gate was closed. The Windows
public-file count differs from the other builds; inspection compares each package
against its own staging rather than claiming byte-identical builds across OSes.

The seven runtime checks covered effective sandbox/isolation, request blocking,
landlord navigation and saving, quit/relaunch persistence, confirmed backup/restore,
external-link confirmation and offline-route limits. Every run recorded **zero
renderer errors**, zero loopback observer hits and successful app/observer/temporary
file cleanup. Packaged runs also removed their test-created profiles; that cleanup
field is inapplicable to source runs, whose temporary directories were removed.

Electron 44.4.5 ran with its security controls enabled. Native Intel preflight
reported x64 and `translated: false`. macOS/Windows reported the OS sandbox metric
enabled; Linux reported renderer seccomp filtering and no-new-privileges enabled.

## Failed attempts and repairs

| Attempt | Tested revision | Observed outcome | Repair carried into the next attempt |
|---|---|---|---|
| [36562160198](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36562160198) | `8f4b3333ff09b2877c8126eb4407bbf1c7a63450` | Windows scaffold failed worktree-root validation. Both Macs failed runtime preflight after successful packaging/inspection; Linux prerequisite setup failed. No runtime smoke passed. | Use Git's root/prefix answer instead of comparing absolute path spellings. Explicitly download Electron's executable: its v44 npm package has no postinstall step, and the doctor correctly does not auto-install it. |
| [36562913158](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36562913158) | `db07dbe9e0f533c4cb8a422a73a7e166f9cfdc04` | Windows, Linux and Apple silicon reached source runtime but failed the landlord navigation assertion. Intel's frontend suite had four timeouts; its engine suite passed. Packaged runtime remained untested. | Read activity from the destination router query, with non-actionable loading fallbacks; wait for committed navigation in smoke. Limit CI frontend workers to two without changing timeouts or assertions. |
| [36564143019](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36564143019) | `1b64679a1a8141fdf54f742e5ca43ea0328feab3` | All four jobs, all eight runtime smoke runs and all package inspections passed. | Final tested application revision; this reporting document follows that revision. |

The navigation repair added five regression tests. CI worker limits changed without
relaxing assertions or timeouts. Failed attempts retain their recorded failures.

## Retained artifacts and evidence

Local campaign root: `desktop/dist/native-36564143019/`.

| Directory | Contents |
|---|---|
| `windows-x64/` | NSIS `.exe`, artifact manifest and `SHA256SUMS.txt` |
| `linux-x64/` | `.AppImage`, artifact manifest and `SHA256SUMS.txt` |
| `macos-x64/` | Intel `.dmg` and `.zip`, artifact manifest and `SHA256SUMS.txt` |
| `macos-arm64/` | Apple silicon `.dmg` and `.zip`, artifact manifest and `SHA256SUMS.txt` |
| `evidence/<platform>/` | `source-smoke.json`, `packaged-smoke.json`, `package-inspection.json` |

All six downloaded package files matched their runner's SHA-256 list. All eight
runtime reports matched the clean tested revision and required check/error/cleanup
fields. Hashes identify bytes, not publisher identity. Hosted artifacts have 14-day
retention; local files are ignored by Git.

The campaign source handoff is
`desktop/dist/native-36564143019/TaxSorted-Local-0.1.0-test-source.zip`, regenerated
after the final report is committed. It contains the source, plan/report and test
tools, separate from the six tested packages. Neither installed dependencies, app
profiles nor raw app logs are included. Use the tested revision above for application
provenance; scaffold exclusions are not an embedded-secret scanner.

## Remaining acceptance boundaries

The [manual plan](../DESKTOP-TESTING.md#manual-cases-on-each-native-desktop) still has
**M01–M14 NOT RUN** for this campaign:

- Windows used **Server 2025** with an administrative runner/UAC disabled; Windows
  11 standard-user installation and SmartScreen remain untested.
- Linux used Xvfb, an unpacked binary and a temporary exact-path AppArmor rule,
  removed afterwards. GNOME dialogs and mounted AppImage launch under stock policy
  remain untested.
- Both Macs launched build-output apps; DMG installation and consumer Gatekeeper
  behaviour remain untested.

Real native dialogs/browser opening, network-off use, cross-environment transfer,
OS reboot, reinstall and a two-version upgrade remain manual work. Automation preset
the export path and stubbed the browser call. No developer signing, notarisation or
production release was performed.

Network observations cover the tested app-session probes, not device-wide silence.
Records/backups remain unencrypted under the [documented OS-account boundary](../LOCAL-APP.md).
Native CI passing does not complete consumer acceptance.
