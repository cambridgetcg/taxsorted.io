# Desktop validation plan

Prepare and test one identifiable build on each target before describing it as a
tested download. The [29 September native campaign](testing/2026-09-29-native-campaign.md)
records the original source/package checks; the
[installer campaign](testing/2026-09-29-installer-campaign.md) records the later
artifact-path checks and packaging repairs. The
[protected Books campaign](testing/2026-09-29-protected-books.md) records the first
encrypted recovery flow. The earlier
[navigation and recovery campaign](testing/2026-09-29-desktop-navigation.md) passed
all four targets with direct recovery, native Back/Forward and an explicit
observation of wrong-password rejection. The complete workspace campaign below
adds recovery of Passport, both preparation years and checklist on all four targets.
Manual consumer
acceptance remains **NOT RUN**. Start each new build's
[result template](testing/desktop-result-template.md) at NOT RUN; the previous result
does not transfer automatically. Earlier local checks are recorded in
[Local app](LOCAL-APP.md#verification-and-next-work).

## Complete workspace recovery campaign — 30 September 2026

[Run 36742667838](https://github.com/cambridgetcg/taxsorted.io/actions/runs/36742667838)
passed on all four targets at **16:33 UTC on 30 September 2026**, testing clean commit
`af4a5abfc05d773447bed8d88477e4de5bd1868a`. This candidate
adds encrypted complete-workspace recovery to the established Books-only journey.
The expanded walkthrough saves Books, Passport, both preparation years and the
checklist; exports and independently decrypts a protected backup; changes each
area; observes wrong-password rejection; checks the exact protected safety copy;
restores; quits and relaunches; then compares every recovered section.

| Target | Source / packaged / installed recovery | Installer lifecycle |
|---|---|---|
| Windows x64 | PASS: 8 / 8 / 8 checks | PASS: NSIS install, registration/shortcuts, runtime, uninstall and synthetic retention |
| Linux x64 | PASS: 8 / 8 / 9 checks | PASS: actual FUSE-mounted AppImage, reviewed launcher and released mounts |
| Intel Mac x64 | PASS: 8 / 8 / 8 checks | PASS: DMG copy, image ejection, installed runtime and cleanup |
| Apple silicon control | PASS: 8 / 8 / 8 checks | PASS: DMG copy, image ejection, installed runtime and cleanup |

All 12 runtime reports identify the exact clean revision, all nine workspace
recovery flags, six Books protection flags and five navigation flags, zero renderer
errors or network observer hits and all applicable cleanup. The shared validator
accepted every packaged/installed report. Windows completed all five installer
checks and six cleanup checks, including retention of the synthetic sentinel;
this does not establish real-record uninstall/reinstall recovery.
Both ad-hoc Mac signatures verify; Gatekeeper rejects them with exit 3. Linux uses
the documented disposable CI AppArmor allowance and Xvfb. These observations do not
establish ordinary consumer trust prompts, stock Linux desktop policy or manual
acceptance. M01–M15 retain their separate manual statuses.

The earlier Windows run failed a preparation focus assertion that checked the DOM
before React's passive focus effect completed. The test now waits for the same
required focus state; no timeout increase, skip or production behavior change was
needed. The installer validators also now share one explicit recovery contract,
replacing obsolete seven-check expectations. The local preparation suite passed
24 tests and the expanded desktop suite passed 56 before this campaign.

Downloaded packages, manifests and sanitised evidence are retained in
`desktop/dist/workspace-36742667838/`. All six downloaded files match their runner
manifests and checksum lists; both DMGs, the NSIS EXE and AppImage also match their
installer reports. `campaign-verification.json` records the combined local audit.
Mac ZIP alternatives are checksummed but were not independently installed.
Hosted artifacts retain the workflow's 14-day expiry. No public release or
production deployment is part of this campaign.

## Consumer acceptance preparation — 30 September 2026

Four transfer-ready packets for that exact candidate are retained under
`desktop/dist/acceptance-36742667838/`: `windows-x64`, `linux-x64`, `macos-x64`
and `macos-arm64`. Each contains the matching installer, SHA-256 list, selected
manifest, bounded campaign provenance, synthetic CSV, OS-specific walkthrough and
prefilled `RESULT.md`. The walkthrough includes M01–M15. The packets contain no
app profiles, saved tax backups, credentials or raw logs. Every manual case starts
**NOT RUN**; retained CI results do not fill in a new environment's observations.

The generator verifies the expected clean commit, target/architecture, installer
and runtime evidence, recovery/cleanup checks, artifact size and SHA-256 before
copying, then verifies the copied installer again. It refuses existing output.
Its 23 checks and the complete 79-test desktop suite passed on the development Mac.
Each target also has a ZIP beside its folder; all seven archive members were
compared with their source files, and the parent `SHA256SUMS.txt` identifies the
four transfer archives. These ZIPs are acceptance packs, not new app builds.
To prepare another copy, choose a new output directory with an existing parent:

```sh
node desktop/testing/prepare-acceptance.cjs \
  --campaign=desktop/dist/workspace-36742667838 \
  --output=desktop/dist/acceptance-36742667838-new \
  --commit=af4a5abfc05d773447bed8d88477e4de5bd1868a
```

Transfer the complete target folder, compare its installer checksum on the target,
and start with M01 in a standard disposable OS account. Windows first-launch
checks must cover the interactive install-mode choice: the current builder
configuration allows a current-user/all-users choice and elevation, whereas CI
explicitly selected `/currentuser`. Record any elevation request and chosen
destination. On Ubuntu, record executable permission, missing FUSE and AppArmor
sandbox refusals separately; the CI allowance is not consumer packaging support.

The available development host is macOS 15.7.3 (24G419), Apple silicon. `utmctl
list` returned no configured VM; the inspected local VM inventory did not supply
Windows 11 x64 or Ubuntu x64 GNOME. No native Intel test host is established. This
account already has a TaxSorted profile, which is preserved. Consumer acceptance
therefore still needs the target devices/VMs and their disposable accounts; no
packaged test is launched against the existing profile. Source-mode native-dialog
automation can provide supplemental evidence here without claiming manual or
Intel acceptance.

### Supplemental native-dialog result

At **17:47 UTC on 30 September 2026**, the isolated arm64 source run passed three
actual macOS dialog checks: cancelling the workspace restore picker preserved
selection/storage, cancelling Save produced no export and preserved saved work,
and pressing Save export created one encrypted file. Independent Node decryption
recovered the exact synthetic checklist and confirmed the other workspace areas
were absent. Password inputs cleared after cancelled export. Zero renderer errors
were observed; the process exited and its temporary profile, export and helper
were removed. No existing TaxSorted profile was opened or changed.

The repeatable command is:

```sh
node desktop/testing/macos-native-dialogs.cjs
```

It requires the built source bundle, pinned Electron/Playwright, Swift command-line
tools, an unlocked English-language macOS GUI session and already-granted
Accessibility access. It compiles a temporary helper and acts on native dialogs
belonging to its own source process, including the system AppKit file-panel
service. It does not request OS permissions, replace Electron dialog methods or
set a DownloadItem save path. Only the test process's Downloads location is
redirected to its temporary export directory. Failure leaves manual cases unpassed.

The sanitised report is `desktop/test-results/macos-native-dialogs.json`. It records
the development checkout `ae7b780` with new test/documentation changes and the
542-file staged-page digest
`70c92af67ed66cc3041ba90492749a34e9df925742bd2935e1d724e6e60956cb`.
Application runtime and frontend source have no changes from candidate `af4a5ab`;
this source-mode result still does not establish that candidate's Finder install,
quarantine behavior, screen-reader use, reboot, physical network-off behavior or
manual acceptance. **All M01–M15 consumer statuses remain NOT RUN.**

## Environments and what each establishes

| Target | Automated environment | Original runtime campaign | Manual acceptance environment | Manual status |
|---|---|---|---|---|
| Windows x64 | `windows-2025` | PASS | Windows 11 x64 VM on an x64 host, fresh standard local test account | NOT RUN |
| Linux x64 | `ubuntu-24.04`, Xvfb | PASS | Ubuntu 24.04 x64 Desktop, GNOME graphical session, fresh test account | NOT RUN |
| Intel Mac x64 | `macos-15-intel` | PASS | Actual supported Intel Mac running macOS 15, fresh standard test account | NOT RUN |
| Apple silicon control | `macos-15` | PASS | Apple silicon Mac running macOS 15, fresh standard test account | NOT RUN |

The pinned labels select the architectures listed in
[GitHub's runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
`windows-2025` uses [Windows Server 2025](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md).
Its executable and silent-installer smoke tests do not establish Windows 11
SmartScreen or ordinary-user behaviour. Likewise, Xvfb does not establish GNOME's
real file dialogs; mounted AppImage evidence requires the separate launcher check
below.

Rosetta on Apple silicon is a supplemental x64 compatibility check. It translates
Intel applications, so it cannot substitute for the Intel hardware row.
[Apple describes that translation](https://support.apple.com/en-us/102527).
Windows on ARM emulation and x64 QEMU software emulation are also supplemental,
and must be labelled as such. A Docker CLI, emulator or VM application's presence
does not establish a running target OS.

## Prepare a disposable test environment

1. Use a dedicated VM/device and synthetic data only. Keep personal accounts,
   cloud drive mounts, browser sessions, passwords, signing credentials and real
   tax exports out of it. Install OS updates before taking a clean snapshot.
2. Create a standard local OS account dedicated to this campaign. Use an admin
   account only for explicit prerequisite installation. Do not run TaxSorted as
   root or administrator. Record a non-identifying account label in the result.
3. Obtain the exact candidate installer and `SHA256SUMS.txt`; compare its SHA-256
   before running it. Record version, source revision, artifact filename, checksum,
   architecture, OS build and signing classification (unsigned, ad-hoc or developer
   signed). A checksum identifies
   bytes; it does not establish publisher trust.
4. For source/automated tests, install Git and Node 22, then run the scoped `npm ci`,
   `npm run desktop:install-runtime` and `npm run desktop:build` from
   [Local app](LOCAL-APP.md#run-from-source). Electron 44's executable requires that
   explicit download step; the doctor does not install it. Finish downloads before
   the offline scenario. Do not use real records to make a build pass.
5. Take a **clean prerequisites** VM snapshot before first app launch. For physical
   Macs, use a fresh test account with no existing TaxSorted profile and record that
   starting condition. After the persistence cases, use a separate **synthetic data
   saved** snapshot for reinstall/upgrade cases.

Reset by restoring the disposable VM snapshot or returning to a fresh test account.
Do not delete a person's existing profile to obtain a clean test. Copies of the
source and installed app share the default TaxSorted profile within one OS account;
they are not separate person accounts. Source-mode tests use a disposable development
profile; packaged tests use the dedicated OS account. Close other TaxSorted processes
before each run.

| Platform | Preparation and first launch |
|---|---|
| Windows 11 x64 | Use an x64 image from [Microsoft](https://www.microsoft.com/en-us/software-download/windows11), with its supported VM prerequisites. Keep Defender, SmartScreen and UAC enabled. Run the NSIS installer interactively as the standard test account; record destination, any elevation request and every trust prompt. |
| Ubuntu 24.04 x64 | Use [Ubuntu Desktop](https://ubuntu.com/tutorials/install-ubuntu-desktop), log into GNOME and record Wayland/X11. Keep AppArmor and the normal user-namespace policy enabled. Check the AppImage's executable permission and launch it from the desktop/file manager. |
| Intel Mac | Use an Intel model on [Apple's macOS 15 compatibility list](https://support.apple.com/en-us/120282). Keep Gatekeeper/SIP enabled. Mount the DMG, copy the app into Applications, eject the DMG, then launch the installed app. Record trust prompts; launching the build-tree `.app` is a separate check. |
| Apple silicon control | Follow the same DMG procedure using the arm64 artifact on Apple silicon. Record the host and executable architecture. |

Preview trust prompts are expected observations. macOS preview integrity signatures
are ad-hoc, without a Developer ID or notarisation; Windows previews remain unsigned.
If normal OS policy prevents installation or launch, record the exact
boundary as **BLOCKED**; do not disable the security product or system policy to turn
the result green. A later signed candidate needs its own installation run.

### Linux display, FUSE and sandbox prerequisites

Headed automation on a machine without a display uses `xvfb-run -a` before the smoke
command, as described in [Playwright's CI guide](https://playwright.dev/docs/ci#running-headed).
A real GNOME session remains required for the manual cases.

AppImage's FUSE 2 library package is `libfuse2t64` on Ubuntu 24.04. If absent, install
that package through the test machine's normal package manager and record the change.
Keep FUSE 3 installed. [AppImage documents both the package rename and extraction fallback](https://docs.appimage.org/user-guide/troubleshooting/fuse.html).
An unpacked binary or `--appimage-extract-and-run` can diagnose a FUSE problem, but
neither passes the mounted AppImage launch case.

Ubuntu 24.04 also restricts user namespaces through AppArmor. A sandbox refusal is
a different boundary from missing FUSE or display libraries.
[Ubuntu's security description](https://ubuntu.com/blog/whats-new-in-security-for-ubuntu-24-04-lts)
explains that policy. Record any workflow-installed, executable-specific AppArmor
rule as part of the CI environment. Such a rule does not establish that an AppImage
launches under an unchanged consumer installation. If stock desktop launch needs a
new rule, record the manual case as blocked pending reviewed packaging support.

Do not use `--no-sandbox`, disable AppArmor, change global user-namespace restrictions,
or run the app as root to bypass a failure. Record the failed operation, prerequisite
and affected cases; leave them unpassed.

## Automated checks

Run these from the project root after building. The doctor reports prerequisites;
it does not install them or prove UI behaviour.

```sh
npm run desktop:install-runtime
npm run desktop:doctor -- --require-bundle
node --test scripts/__tests__/create-local-project.test.mjs
npm run test --workspace frontend --workspace @taxsorted/engine
npm run desktop:test
npm run desktop:smoke -- --mode=source
```

Native CI additionally pins the expected runtime with doctor flags such as
`--expect-platform=win32 --expect-arch=x64`; macOS uses `darwin`, Linux uses `linux`.
On headless Linux use `xvfb-run -a npm run desktop:smoke -- --mode=source`.

The browser recovery check uses installed Google Chrome, a fresh isolated context
and the current static frontend served on loopback. Start the server in one terminal
after building, then run the check in another:

```sh
python3 -m http.server 4318 --bind 127.0.0.1 --directory frontend/out
```

```sh
node desktop/testing/workspace-browser-smoke.cjs
```

It blocks non-loopback requests and uses synthetic data only. It verifies the idle
backup page's saved-data read boundary, narrow layouts and three open editors
(Passport, preparation and checklist) refusing writes after an actual encrypted
restore in another tab. Saved state is compared after every rejection; unsaved edits
remain visible. The sanitised report is `desktop/test-results/workspace-browser-smoke.json`.
This browser check does not replace native installer or real file-dialog acceptance.

After packaging, use the actual executable and resource directory for that artifact:

```sh
npm run desktop:inspect -- "--resources=ABSOLUTE_RESOURCES_DIRECTORY" --write-evidence
npm run desktop:smoke -- --mode=packaged "--executable=ABSOLUTE_EXECUTABLE_PATH" --disposable-os-account
npm run desktop:checksums
```

Replace the uppercase placeholders. Resource roots are the `.app/Contents/Resources`
directory on macOS and the unpacked application's `resources` directory on Windows
and Linux. The executable is the app binary, not the NSIS installer or DMG. Use Xvfb
for packaged Linux automation if no graphical session is available. The
`--disposable-os-account` flag is the operator's acknowledgement of an already
disposable account; it does not create or isolate one.

The [workflow](../.github/workflows/desktop-build.yml) prepares native builds and
evidence on the triggers below. An unpacked packaged-app launch checks the
packaged runtime. Installer-path automation adds the checks below; manual consumer
installation cases still remain. Inspect the
generated report for the assertions actually run, including sandbox settings,
renderer isolation, local routes, persistence and request blocking. Do not infer a
pass from command availability or from an uploaded installer alone.

Installer acceptance uses one shared runtime-evidence validator. It requires the
current workspace-recovery assertions (all saved areas, both preparation years,
protected safety copy and persistence after relaunch), retained Books recovery,
navigation, sandbox evidence and complete owned-state cleanup. An older report with
only a success label or the previous seven-check journey cannot satisfy it.

The workflow declares manual dispatch and source-change pushes on
`feat/service-oriented-rebuild-20260929`. These campaigns used branch pushes;
manual dispatch was unavailable while the workflow existed only on the feature
branch. It uploads only preview artifacts and allowlisted result summaries for
14 days. It does not publish a release. Its Linux setup grants user
namespaces to the exact source runtime, unpacked executable and AppImage paths
through a temporary AppArmor profile, then removes that profile. It does not alter
this development Mac. The Windows hosted
runner is an administrator with UAC disabled, another reason to keep the standard-user
Windows 11 installation cases separate.

Local preparation on 29 September 2026 found an arm64 Mac with working Rosetta, UTM
and QEMU commands. QEMU x64 offers software emulation; no target VM was started.
The Docker CLI could not connect to its local daemon socket. Those observations do
not provide Windows, Linux or native Intel test results. Use the native CI matrix and
the dedicated environments above for those rows.

[Playwright's Electron API](https://playwright.dev/docs/api/class-electron) is
experimental, defaults its launch sandbox option to false and does not intercept
native Electron dialogs. The harness must explicitly enable the sandbox. Automated
dialog substitutes or preset download paths check application logic, not OS dialog
interaction. If automation cannot launch a future hardened build, investigate the
harness boundary without weakening the shipped application's security.

### Installer-path automation

These checks extend the original runtime campaign. Their implementation and a
successful package build do not establish a native result: use each run's separate
installer report and `installed-smoke.json`. The earlier campaign's recorded
results remain unchanged.

Follow-on inspection found that the earlier Linux AppImage's desktop entry used
`Exec=AppRun --no-sandbox %U`, and its generated launcher could add `--no-sandbox`
when a user-namespace probe failed. That archived Linux AppImage is unsuitable
for distribution. The earlier unpacked-runtime sandbox checks remain valid; they
did not launch the AppImage wrapper. The replacement package removes the injected
desktop argument and supplies an `AppRun` that refuses sandbox-disabling switches
instead of adding them. The replacement passed the mounted artifact/runtime checks
in the [installer campaign](testing/2026-09-29-installer-campaign.md), including
inspection of the mounted launcher. Stock-desktop acceptance remains separate.

| Target | Automated path | Evidence in `desktop/test-results/` | Remaining boundary |
|---|---|---|---|
| Both Macs | Verify DMG; mount read-only; copy the app into a new temporary Applications directory; inspect the copied payload; eject the image; assess signing/Gatekeeper; run complete packaged smoke on the copy | `macos-installer.json`, `installed-smoke.json` | Finder installation, quarantine/trust prompts and real Applications-folder behaviour |
| Windows x64 | Install actual NSIS artifact silently for the current user into an owned directory; inspect registration/payload; smoke the installed app; uninstall and check registration removal and retention of a synthetic profile sentinel | `windows-installer.json`, `installed-smoke.json` | Interactive wizard, Windows 11 standard-user permissions, SmartScreen/UAC and real-record reinstall persistence |
| Linux x64 | Execute the actual AppImage; verify its matching archive, executable inside a read-only FUSE mount and mounted payload; run complete packaged smoke and confirm mount cleanup | `linux-installer.json`, `installed-smoke.json` | Stock Ubuntu policy, file-manager launch, desktop integration and GNOME interaction |

Full installer tests require a fresh disposable native GitHub-hosted runner and the
explicit `--disposable-os-account` acknowledgement. These checks do not create a
test account. They refuse an existing TaxSorted profile and exclude self-hosted
runners.
The Windows helper refuses existing product registration, and its uninstall
retention test uses only a clearly named synthetic sentinel. It does not prove
that real Books survive uninstall/reinstall; M13 remains separate.

Use the helpers from the project root after the native package build:

```sh
node desktop/testing/install-macos.cjs --installer=desktop/dist/TaxSorted-Local-0.1.0-mac-arm64.dmg --disposable-os-account
node desktop/testing/install-windows.cjs --installer=desktop/dist/TaxSorted-Local-0.1.0-win-x64.exe --disposable-os-account
xvfb-run -a node desktop/testing/install-linux.cjs --installer=desktop/dist/TaxSorted-Local-0.1.0-linux-x86_64.AppImage --disposable-os-account
```

Choose only the command matching the native runner; Intel Mac uses `mac-x64.dmg`.
Update the version in filenames when packaging a new version. The Linux check
rejects extraction fallback and verifies the actual renderer sandbox; its scoped
CI AppArmor allowance remains an explicit environment prerequisite.

On a development Mac, use the non-launching inspection mode instead:

```sh
node desktop/testing/install-macos.cjs --installer=desktop/dist/TaxSorted-Local-0.1.0-mac-arm64.dmg --inspect-only
```

This mode verifies/mounts/copies/ejects the DMG and records signature/Gatekeeper
assessments without opening the app or reading its normal profile. The package
must match the current local staging exactly. An archived CI package may have
different generated page names even at the same source revision; inspect it
against that build's staging, or package the current local staging for this check.
Do not weaken the comparison. [Apple documents Gatekeeper assessment separately
from signing](https://developer.apple.com/library/archive/technotes/tn2206/).
An ad-hoc preview may be rejected; the result is recorded without changing
security policy, and it is not consumer installation acceptance.

The macOS packaging hook uses a literal ad-hoc signing identity with certificate
validation/discovery and provisioning disabled. It keeps hardened runtime enabled
and uses the pinned builder's entitlements for Electron JIT and library loading;
timestamp services and notarisation are disabled. This repairs bundle integrity
after packaging without establishing a publisher identity. The pinned builder's
direct `identity: "-"` path first searches Keychain identities, so the hook invokes
the pinned signing library directly while builder `mac.identity` remains `null`.
[The builder's v26 signing documentation](https://www.electron.build/v26/docs/features/code-signing/code-signing-mac/)
describes the distinction between ad-hoc and Developer ID signatures.

Installer summaries identify artifact bytes with SHA-256 and keep test-checkout
metadata separate from artifact provenance. Cleanup removes only owned test
material after confirmed application shutdown or image ejection; an unconfirmed
shutdown/mount retains material and fails the check. No app profiles or backups
are included in uploaded evidence. **M01–M15 remain NOT RUN until their manual
observations are recorded.**

## Manual cases on each native desktop

Use this synthetic `desktop-test.csv`; the amounts are ordinary pounds, with a
negative amount for money out. Select the matching year and self-employment activity.

```csv
date,amount,description
2026-05-01,120.00,SYNTHETIC desktop income
2026-05-02,-20.00,SYNTHETIC desktop expense
```

Run in order and record **PASS**, **FAIL**, **BLOCKED** or **NOT RUN** for every ID.

| ID | Action | Required observation |
|---|---|---|
| M01 | Install/launch through the OS route above. Open Help → Show app data folder. | Correct architecture, usable window and expected profile location; no unexpected elevation or account requirement. Record all trust/prerequisite friction. |
| M02 | Visit Individuals, Sole traders and Landlords; open each checklist and follow a records link. Use Navigate → Back / Forward and their native shortcuts (Cmd+[ / Cmd+] on Mac, Alt+Left / Alt+Right elsewhere). Open Books-only Backups from its Books section and complete workspace recovery from the status bar and File menu. Use keyboard navigation, 200% zoom and a narrow window. | Clear audience/activity context, reachable navigation, visible focus and usable controls without clipped essential actions. History commands retain the visited activity and disable at their respective ends. Recovery opens directly; navigating away and returning clears passwords, file selection and preview. |
| M03 | Choose checklist items. Open CSV import, cancel the native file picker, then reopen and select the synthetic CSV. Review mapping before importing. | Cancel changes no records; two rows appear for review with £120 in and £20 out. Confirm activity/scope and review decisions before expecting confirmed totals. |
| M04 | Open Money records → Backups → Save current Books. Keep password-protected export selected. Enter/repeat a synthetic test password and acknowledge no reset. First cancel the native Save dialog, then repeat and save to the test account's folder. | Cancel creates no export and changes no records; save creates a protected file in the chosen location. Verify the file exists before affirming a safety copy. The raw JSON has encrypted payload, not readable record notes. |
| M05 | With that copy saved, start restore and cancel the native file picker. Reopen, select the protected backup and cancel before unlocking. Repeat, unlock with its test password, then cancel the replacement confirmation. | Each cancellation preserves current Books and clears password fields. The unlocked preview explains replacement and requires a fresh protected safety copy and explicit confirmation before applying it. |
| M06 | Record current counts/amounts. Try `not-json`, `{"schema":"unsupported-test/0"}`, a wrong password and a copy with modified ciphertext. | All are rejected with useful messages before replacement; counts, values and review states remain unchanged after reload. The original valid file remains recoverable with its correct password. |
| M07 | Add a distinct synthetic record after the backup, then restore the valid backup through its complete confirmation flow. | Restored rows match the backup; the later record is absent; scope requires confirmation again. Review the documented restore limits, not merely a success toast. |
| M08 | Fully quit the app, relaunch from the OS, then reboot/log in and relaunch again. | Checklist choices and restored Books persist; the default profile location remains stable. Window close alone on macOS is not a full quit. |
| M09 | After downloads are complete, disconnect the dedicated VM's network adapter (or the test device's network), leaving its firewall enabled. Relaunch and repeat checklist/edit/export/restore. | Bundled local tools continue working; unavailable online functions stay clearly unavailable. Record network state and exact actions. Offline success is not proof of zero network attempts. |
| M10 | Reconnect the dedicated test environment. Open a public source link; cancel its native confirmation, then repeat and approve. | Cancel opens no browser. Approval opens only the displayed public URL in the normal browser; no saved record or synthetic marker is added to its URL. This deliberately uses the browser's network. |
| M11 | Visit account, provider and filing routes while using the local edition. | Online-only actions cannot claim a successful connection/submission. Local preparation and exports remain understandable without sign-in. |
| M12 | Export protected Books from a source run using a separate disposable `--profile-dir`. Quit it; unlock/restore in the packaged app's test account. Export from the package and restore into a second fresh source profile. Also open a legacy plain Books backup. | Both protected directions and legacy input preserve synthetic records within the backup contract. Legacy input still defaults to a protected safety copy. Checklist/Passport transfer is not implied. |
| M13 | Save a safety backup and a snapshot. Uninstall/remove only the test app using the OS's normal route; retain its data. Reinstall the same version and launch. | Previously saved synthetic data survives; otherwise fail the persistence expectation and document recovery. Windows uses its uninstaller; macOS replaces the app bundle; Linux replaces the AppImage file. |
| M14 | When a genuinely newer candidate version exists, install it over the prior version with the saved synthetic profile, then repeat M04–M08. | No unexpected migration loss or profile/origin change. Keep **NOT RUN** until two distinct versioned builds are available; same-version reinstall is not an upgrade test. |
| M15 | Save synthetic Books, Passport, both preparation years and checklist. Export from `/backups`; exercise native Save cancellation then save successfully. Change each section, unlock the original backup, download/check the protected current-work safety copy and restore. Quit/relaunch, inspect every section, then repeat in a fresh profile with an absent section. Transfer between website and desktop in disposable profiles. | All saved sections recover together; absent sections clear deliberately; incorrect passwords and cancelled operations preserve current work. Safety copy contains the later work. Old open editors cannot save over restoration and remain able to show unsaved entries until reloaded. File transfer excludes sessions, unsaved forms, original documents and attachments. Record cross-browser/platform results separately. |

For M09, a reversible outbound rule scoped to the test app in the disposable
environment may supplement adapter disconnection. Record the rule and remove it
afterwards. Do not weaken the firewall. Record automated request probes separately:
an observed zero-request result covers those probes and session configuration, not
all OS services, future integrations or every possible network path.

See [Books backup](BOOKS-BACKUP.md) for the exact file contract. Native Cancel/Save,
file-picker accessibility and installer UX must be observed by a person in these
cases, even when automated smoke passes.

## Evidence and release decision

Copy the [template](testing/desktop-result-template.md) once per OS/architecture and
artifact checksum. Record the date, operator label, VM/hardware classification,
exact OS build, command results, case statuses and short reproduction notes. Link
the doctor's JSON, source/packaged/installed smoke summaries, the applicable
installer summary, `desktop/test-results/package-inspection.json`,
`desktop/dist/artifact-manifest.json` and checksums when they exist. A missing report
is **NOT RUN** or **BLOCKED**, never an inferred pass.

Retain only bounded result summaries, hashes and reviewed screenshots showing
synthetic data. Do not upload app profiles, IndexedDB files, tax backups, environment
dumps, raw process/console logs, HARs, traces or crash dumps. Keep failure diagnostics
local; copy only the reviewed error classification and minimal non-sensitive evidence
into the result. Retain CI evidence for 14 days as configured, without treating that
retention as a backup of anybody's records.

| Severity | Examples | Acceptance |
|---|---|---|
| P0 | Saved records leave the app without the described action; restore corrupts unrelated data; protection bypass required | Stop the candidate; preserve minimal evidence and repair before any release |
| P1 | Cannot install/launch on the target under supported normal security; data lost on restart; backup/restore or cancellation fails | Target cannot be marked supported; fix and rerun affected cases |
| P2 | Essential navigation, keyboard use, text clarity or export location is misleading | Fix before broad distribution, or explicitly record a bounded preview limitation |
| P3 | Cosmetic defect with all tasks reachable | Record for follow-up |

A target passes consumer acceptance only with matching automated evidence, manual
M01–M13 and M15 passes, and no open P0/P1 issue. M14 remains an explicit release limitation
until an upgrade pair is available. **BLOCKED** identifies an unmet environment or
artifact prerequisite; it does not waive the corresponding acceptance case.
Developer ID signing, notarisation and publication remain separately authorised
release work.

Official environment references above were checked on 29 September 2026; recheck
them when changing runner images, Electron, Playwright or supported OS versions.

## Preparation evidence on this development Mac

The following historical preparation checks were completed on 29 September 2026,
before the native campaign fixes, using Node 22.23.3 and macOS arm64. The
[campaign report](testing/2026-09-29-native-campaign.md) records the later tested
revision and counts; manual installer cases remain separate.

| Preparation check | Observed result |
|---|---|
| Read-only environment doctor | Passed for darwin/arm64 with staged pages; does not execute Electron's auto-installer |
| Desktop policy, protocol and test-tool suite | 29 tests passed |
| Source scaffold suite | 6 tests passed |
| Fresh scaffold install | Scoped clean install resolved ASAR 3.4.1 and Playwright 1.63.0; copied desktop tests passed |
| Source runtime walkthrough | Seven checks passed, zero renderer errors and zero loopback observer requests |
| Effective sandbox | macOS renderer process metric reported sandboxed; no sandbox-disabling launch switches |
| Packaged-profile refusal | Synthetic existing-profile check stopped before Electron import and preserved the fixture |
| Existing Apple silicon package inspection | Four declared runtime files and 515 staged public files matched; licences present |
| Workflow definition | Four explicit native runner/architecture combinations; manual dispatch and source-change pushes limited to the rebuild branch |

Runtime evidence is written to `desktop/test-results/source-smoke.json`; package
inspection writes `desktop/test-results/package-inspection.json`. Generated evidence
is ignored by Git. These local preparation checks did not start target VMs or
establish outcomes for the subsequent native CI campaign.

Initial follow-on local DMG inspection at 12:29 UTC on 29 September rebuilt the
arm64 package from the current staging. Its read-only mount, copy,
architecture/payload comparison and ejection completed; four runtime files and
515 public files matched. Gatekeeper was enabled, but signature verification
failed and Gatekeeper assessment returned exit 1, an assessment error, with the diagnostic
`code has no resources but signature indicates they must be present`. This is
**not trust acceptance**. An earlier attempt against the retained CI DMG correctly
failed the strict staging comparison because that build's generated page names
differed; both attempts cleaned up their mounts/copies. The retained CI artifact
was unchanged.

The deterministic ad-hoc packaging hook repaired that integrity failure. Repackaging
and non-launching DMG inspection finished successfully at **12:35:41 UTC**: all
five checks passed, strict signature verification succeeded, and Gatekeeper
returned **rejected (exit 3)** because this preview has no Developer ID/notarisation.
The inspector now requires a valid integrity signature. The repaired local DMG's
SHA-256 is `73f950210aa4ac193f203131a106fad6c93dd758a078aec8070b4084628da7b8`;
image and temporary installation cleanup completed. No local app was launched or
normal TaxSorted profile accessed in any of these inspections. Native installed
runtime and manual acceptance remain separate results.

The current campaign handoff is
`desktop/dist/friction-36601360712/TaxSorted-Local-0.1.0-test-source.zip`. It carries
the source, this plan, result template and test scripts. Unzip it into a new directory in the dedicated
test environment, use Node 22 and follow the scoped install, explicit runtime-download
and build commands. It includes no installed dependencies, app profiles or generated
tax backups. Tested installers, per-platform checksums and sanitised evidence are
retained separately under `desktop/dist/friction-36601360712/`. Its README identifies
the native tested revision and the source handoff revision. The earlier protected
Books campaign predates the direct recovery/navigation update; the earlier installer
campaigns predate encrypted Books files. The `native-36564143019/` folder is
historical; its Linux AppImage is retired.
