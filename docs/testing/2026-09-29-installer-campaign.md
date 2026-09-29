# Native installer campaign — 29 September 2026

**Native automated installer matrix: PASS on all four targets. Manual consumer
acceptance: NOT RUN.** This follow-on campaign exercises the packaged artifact,
after the source and unpacked-runtime checks. Consumer installation and native-dialog acceptance remain
separate in the [manual plan](../DESKTOP-TESTING.md#manual-cases-on-each-native-desktop).

## Repairs established by artifact inspection

- The previous Linux AppImage's generated desktop command included `--no-sandbox`;
  its launcher could also add that flag automatically. The package now uses a
  reviewed launcher that rejects security-disabling arguments, and its desktop
  entry has no injected sandbox flag. The personal scaffold includes this launcher
  and preserves executable permissions where supported.
- macOS previews previously retained invalid signature metadata. A deterministic
  ad-hoc signing hook now supplies a verifiable integrity signature with hardened
  runtime enabled. It uses no developer certificate, provisioning profile,
  timestamp service or notarisation. Gatekeeper rejection remains expected for
  these previews; successful automation is not publisher trust.

## Native results

The final run is [36573482985](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36573482985),
testing `6166b5274995d8250a38710bea71c1c95f9759ea`. It completed successfully at
**13:28:53 UTC** on `feat/service-oriented-rebuild-20260929`.

| Target | Installer path | Result |
|---|---|---|
| Windows x64 | Current-user NSIS install, installed-app smoke, uninstall, registration/shortcut removal and retention of a synthetic profile sentinel | PASS |
| Linux x64 | Direct AppImage launch, read-only FUSE mount, mounted payload/launcher inspection, runtime smoke and mount cleanup | PASS |
| Intel Mac x64 | Read-only DMG mount, app copy, image ejection, signature verification and copied-app smoke | PASS |
| Apple silicon Mac | Same DMG path on native arm64 | PASS |

Each target passed **772 frontend tests and 388 engine tests**. macOS/Linux passed
44 desktop and eight scaffold tests. Windows passed 42 desktop tests and skipped
two POSIX launcher tests; it passed six scaffold tests and skipped two symlink
tests. No other tests were skipped or failed.

All **12 runtime reports** identify the same clean tested checkout. Source and
unpacked apps passed seven checks each on every target; installed apps passed seven
each, with an eighth mounted-AppImage check on Linux. Every report recorded zero
renderer errors, zero loopback observer hits and successful owned-state cleanup.
These network observations cover the tested app-session probes, not device-wide
silence. Package inspection matched four runtime files and 515 public files on
macOS/Linux, or 517 public files on Windows, against each build's own staging.

Both Macs' strict ad-hoc signature verification passed. Gatekeeper recorded
**rejected, exit 3**; no OS trust setting changed. Linux verified the matching
archive, executable inside a read-only FUSE mount, exact reviewed launcher, desktop
entry without sandbox-disabling arguments and complete mount release. Its
renderer reported seccomp filtering and no-new-privileges enabled.

Windows passed all five installer lifecycle checks, including registration and
shortcut creation/removal, installed runtime and retention of the synthetic
sentinel. The final lifecycle took 3 minutes 20 seconds. Read-only probes ranged
from 0.4 to 57.7 seconds within their 60-second bound. Its six owned-state cleanup
flags passed; runner disposal handles residual OS-managed installer cache.

## Earlier attempts and repairs

The first installer run,
[36569333488](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36569333488),
tested `e474b255039eaef19380d7bd5423ba019fe11b04`. Linux and Apple silicon passed
their complete installer paths. Intel stopped at a frontend test timeout; its
six page-wide link queries were scoped to their existing section without changing
assertions or timeouts. Windows passed both runtime modes, then its first
read-only registry query exceeded 15 seconds before installation began. The query
now has a 60-second bound, a precise stage and sanitised timing evidence.

The second run,
[36570928503](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36570928503),
tested `1cb99a431c79421a03d3ab881f4c0b469368d357`. Windows, Linux and Apple silicon
passed their complete installer paths. Windows' read-only PowerShell probes took
25–42 seconds, establishing that the earlier 15-second bound was too short on
this runner; this was not confined to the first query. Its lifecycle took
6 minutes 41 seconds and cleaned up all owned test state; disposal of the runner
removes residual OS-managed installer cache. Intel passed the earlier
scoped-query test, then exposed a CSV-import focus race: the completion message
could render before its effect moved focus. The assertion now waits for focus,
with the same expected element and existing test timeout. The affected five-test
suite passed locally. Neither frontend repair changed product behaviour.

## Artifacts and remaining acceptance

The earlier campaign folder remains for history and is marked retired. Its Linux
AppImage must not be distributed. New artifacts and summaries are retained under
`desktop/dist/installers-36573482985/`; hosted artifacts expire after 14 days.
Checksums identify file bytes; evidence records the test checkout separately.

| Directory/file | Contents |
|---|---|
| `windows-x64/` | Tested NSIS installer, build manifest and checksum list |
| `linux-x64/` | Tested AppImage, build manifest and checksum list |
| `macos-x64/`, `macos-arm64/` | Tested DMGs, alternative ZIP packages, manifests and checksum lists |
| `evidence/<platform>/` | Source, unpacked and installed runtime summaries, package inspection and installer report |
| `TaxSorted-Local-0.1.0-test-source.zip` | Fresh source scaffold with this report, testing plan, result template and test tools |
| `SHA256SUMS.txt` | Aggregate checksums for the six package files and source archive |

All six downloaded package files matched their runner checksum lists. The four
DMG/NSIS/AppImage hashes also matched the artifacts identified in the installer
reports. ZIP alternatives were retained and hashed; their extraction path was not
separately exercised. The source handoff is generated after this report is committed
and excludes dependencies, app profiles and known private/generated paths. Those
path exclusions do not inspect arbitrary embedded secrets.

These are test previews. Windows uses Server 2025 with an administrative runner,
not a Windows 11 standard account. Linux uses Xvfb and a temporary exact-path
AppArmor allowance, not stock-desktop policy. Macs copy into an owned temporary
Applications directory, not through Finder. The Windows retention check covers a
synthetic sentinel, not a Books reinstall or upgrade.

Real native dialogs, OS trust prompts, physical network disconnection, reboot,
cross-environment recovery, reinstall and a two-version upgrade remain manual
acceptance work. **M01–M14 are not completed by this automation.** No production
deployment, public release, developer signing or notarisation was performed.
App records and backups remain unencrypted under the documented
[OS-account/storage boundary](../LOCAL-APP.md).
