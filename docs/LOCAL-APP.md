# TaxSorted Local

TaxSorted Local packages the existing service hub, personal checklist, tax guides,
calculators, Passport and money records into a desktop app. Its first audience is
individuals, sole traders and landlords who want to prepare their tax on their own
device. The website and desktop edition share the frontend and tax engine so fixes
and clearer journeys reach both.

The desktop edition loads bundled pages at `taxsorted://app`; it does not require
a web server, TaxSorted account or internet connection for those local tools.
Accounts, live provider connections, hosted public-data requests and online filing
are unavailable in this offline edition. It does not send a completed return to HMRC.
Current source-review limits and unsupported tax cases remain visible in the shared
tools. Bundling a guide does not extend its review period.

## Run from source

Install Node.js 22 and Git. From the project root:

```sh
npm ci --workspace frontend --workspace @taxsorted/engine --workspace @taxsorted/desktop
npm run desktop:install-runtime
npm run desktop:build
npm run desktop:start
```

Dependency installation needs the internet. `desktop:install-runtime` explicitly
downloads the pinned Electron executable; Electron 44's npm package does not install
that executable during `npm ci`. The environment doctor only inspects it and never
starts a download. Building stages the static frontend into `desktop/bundle`;
running the app reads that bundle. No
personal records are needed to build it. The scoped install deliberately leaves out
the API workspace's dependencies: its existing AgentTool SDK download is unavailable.
The API source still supplies the frontend's local research review check, using the
shared TypeScript runner installed with the frontend. No API service is started.

The desktop build requires the professional-opportunity publication gate to be
closed. An admitted hosted research feed depends on a live expiry guard that is not
part of an offline app; staging stops if that condition is not met.

For a disposable development profile, after building:

```sh
npm run desktop:start -- --profile-dir=/absolute/path/to/a/new-test-profile
```

This override is accepted only by an unpackaged development run. Use synthetic data
for development. Profile selection is not authentication or protection against another
process using the same OS account.

## Scaffold a personal project

From an existing TaxSorted Git checkout:

```sh
node scripts/create-local-project.mjs ../my-taxsorted
cd ../my-taxsorted
npm ci --workspace frontend --workspace @taxsorted/engine --workspace @taxsorted/desktop
npm run desktop:install-runtime
npm run desktop:build
npm run desktop:start
```

The destination must be new, outside the source checkout, with an existing parent
directory. Scaffolding makes no network requests and does not install dependencies.
It creates a source copy from the current working tree, including eligible uncommitted
source changes. It copies no Git history or remote configuration. To start fresh local
history, run `git init` in the new project; this also enables scaffolding from it later.

The explicit source allowlist includes the frontend, engine, desktop wrapper, API
source used by build checks, public research inputs, documentation, scripts and build
configuration. It excludes ignored files even when tracked, symlinks and paths below
them, environment files, known credential/private paths, dependency folders, app
profiles, logs, backups and generated output. Source files and directories are created
with owner-only permissions on systems that support POSIX modes.

These are path and filename exclusions, not an embedded-secret scanner. Keep tax
records and credentials outside the source tree, and review source before sharing a
customised project. Public rule corpora and synthetic fixtures are project inputs and
are retained. A source copy does not transfer a person's existing app records.

The scaffold preserves the app's identity. Multiple source copies run by the same OS
account use the same default app profile; they are not separate person accounts.
Use separate OS accounts when different people need private records on one computer.

## Where personal data lives

The app uses its own persistent Chromium storage, separate from the website in a web
browser. Books and other local features retain their existing IndexedDB/local storage
contracts. The desktop **Help → Show app data folder** command opens its profile:

| OS | Default profile directory |
|---|---|
| macOS | `~/Library/Application Support/TaxSorted Local` |
| Windows | `%APPDATA%\TaxSorted Local` |
| Linux | `$XDG_CONFIG_HOME/TaxSorted Local`, or `~/.config/TaxSorted Local` |

These locations follow [Electron's app-data conventions](https://www.electronjs.org/docs/latest/api/app#appgetpathname).
Keeping the app identifier, profile directory and `taxsorted://app` origin stable lets
replacement app builds reuse that local storage. An app update does not create a backup.

This version does **not** add app-level encryption or a password vault. Local storage
and exported Books backups are unencrypted; OS account access and disk protection
matter. Another process or person with access to that OS account can access the profile.
It is not an adviser multi-client security boundary. Use device encryption, separate
OS accounts where needed, and a protected backup location for sensitive records.

Use **Money records → Back up or restore your Books** to save a deliberate backup and
move Books between the website and desktop edition. Existing website storage is not
imported automatically. [Books backup and restore](BOOKS-BACKUP.md) documents replacement
confirmation, restore checks and its exact coverage. The Books backup does not include
Passport facts, personal checklists, sign-in sessions or attachments. Those features
currently have separate persistence/export capabilities; there is no complete encrypted
workspace backup in this release.

Removing app data or an OS account can remove local records. The Windows installer is
configured to retain app data on uninstall. Do not rely on uninstall or reinstall as a
backup procedure on any OS.

## Network and integration boundaries

The renderer has no Node integration or preload bridge. It runs with Electron's
sandbox, context isolation and web security enabled. The desktop session blocks
HTTP(S), WebSocket and `file://` requests and permits the bundled app origin and local
download data. No telemetry SDK, auto-updater or online account sign-in is added.

Opening a public website requires a native confirmation showing the destination. It
then opens in the person's normal browser, whose network and privacy settings apply.
TaxSorted does not attach stored tax records to that action. This session restriction
does not function as a firewall for other applications or a promise that the OS itself
makes no network requests. Source installs and packaging download build dependencies.

| Capability | Local edition |
|---|---|
| Audience services and personal checklist | Bundled, saved on this device |
| Supported calculations and bundled tax guidance | Run locally; existing scope/review gates apply |
| Money records and supported file imports | Local storage and deliberate file selection |
| Books backup/restore and adviser exports | Deliberate files; exported records are unencrypted |
| Passport | Local facts and its existing export; separate from Books backup |
| Provider authorisation and synchronisation | Unavailable offline |
| TaxSorted account and cloud/public API features | Unavailable offline |
| HMRC submissions | Unavailable offline; local preparation is not filing |

## Package for each OS

After `npm run desktop:build`, run the relevant command on a native build machine:

| Target | Command | Output |
|---|---|---|
| macOS Apple silicon | `npm run desktop:package -- --mac --arm64` | `.dmg` and `.zip` |
| macOS Intel | `npm run desktop:package -- --mac --x64` | `.dmg` and `.zip` |
| Windows x64 | `npm run desktop:package -- --win --x64` | NSIS `.exe` installer |
| Linux x64 | `npm run desktop:package -- --linux --x64` | `.AppImage` |

Artifacts are written to `desktop/dist`. They contain application code and bundled
public inputs, not the developer's app profile. The packaging command disables
publication. macOS previews receive an ad-hoc integrity signature, with hardened
runtime enabled, from the pinned local signing tool. A dedicated packaging hook
uses a literal ad-hoc identity and disables certificate discovery, provisioning
and timestamp services. The builder's automatic certificate signing and
notarisation remain disabled. This signature identifies no publisher and does not
provide Developer ID trust or notarisation; Windows previews remain unsigned.
OS trust prompts are expected; a successful build alone is not an installation or
runtime test on every supported machine.

The [desktop build workflow](../.github/workflows/desktop-build.yml) defines a
native matrix for these four targets, Node 22, scaffold/desktop tests and app builds.
Installer-path checks additionally exercise copied/ejected DMG apps, current-user
NSIS installation/uninstallation and the actual mounted AppImage. They retain
separate installer/runtime evidence and do not replace consumer installation tests.
It uploads preview installers/archives and allowlisted result summaries with 14-day
retention. It has read-only repository permissions, manual dispatch and a source-change
push trigger limited to `feat/service-oriented-rebuild-20260929`, no release publication
step and no signing credentials. Its runner labels follow the
[GitHub-hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
Adding the workflow locally does not run it or create public downloads. Windows, Linux
and Intel Mac packages need their native workflow and installation checks before they
can be advertised as tested downloads.

Public distribution remains a separate release step: choose a release version,
review included source, run each OS build and installation/relaunch/export/restore
journey, create checksums, and explicitly configure signing/notarisation and publication.
See [Electron's signing guidance](https://www.electronjs.org/docs/latest/tutorial/code-signing).
This source implementation does not register developer accounts, access signing
credentials, publish binaries or change OS trust settings.

## Verification and next work

Use the [desktop validation plan](DESKTOP-TESTING.md) and its per-target result
template for Windows 11, Ubuntu and Intel Mac acceptance. It separates CI smoke
checks from real installation, native dialogs, network-off use and data recovery.

The [29 September native campaign](testing/2026-09-29-native-campaign.md) passed all
four native CI jobs at commit `1b64679a1a8141fdf54f742e5ca43ea0328feab3`: Windows x64,
Linux x64, Intel Mac and Apple silicon. Each source and packaged app passed seven
synthetic runtime checks; all eight runs reported zero renderer errors and zero
loopback observer requests. Six downloaded preview package files matched their
runner checksums. Manual consumer installation/dialog tests remain NOT RUN; Windows
used Server 2025 and Linux used Xvfb with a scoped AppArmor prerequisite.

The follow-on [installer automation](DESKTOP-TESTING.md#installer-path-automation)
checks the downloaded artifact path in disposable runners. macOS copies the app
out of its read-only DMG and ejects it before runtime checks; Windows installs and
uninstalls the NSIS artifact with current-user registration and a synthetic
data-retention sentinel; Linux requires the actual read-only FUSE mount and keeps
the sandbox enabled. Run-specific installer evidence establishes results for
these paths. It does not retroactively extend the earlier campaign or complete
M01–M14. Uninstall retention of a sentinel is separate from real Books recovery.

Inspection of the earlier Linux AppImage found a generated desktop command with
`--no-sandbox` and a launcher that could add that flag after a failed user-namespace
probe. That archived Linux artifact must not be distributed. Its passing unpacked
runtime result did not cover this wrapper. The replacement uses an explicit
launcher that keeps sandbox requirements and removes the injected desktop flag;
the new native AppImage check must establish its actual mounted runtime result.

Development Macs can run the documented `--inspect-only` DMG check without
launching the app or accessing its normal profile. It compares the copied package
against the current staging and records signing/Gatekeeper assessment. Preview
trust rejection remains visible; the helper does not change OS trust settings.

Initial local verification before that campaign (Apple silicon macOS, Node 22.23.3):

| Check | Result |
|---|---|
| Frontend suite | 767 tests passed; affected copy tests rerun after final wording edits |
| Desktop boundary suite | 22 tests passed |
| Scaffold suite | 6 tests passed |
| Frontend lint and TypeScript | Passed |
| Fresh scaffold | Scoped clean install, 80 static pages built and offline staging passed |
| Native Electron runtime | Sandbox/context isolation, no renderer Node access, CSP and session request blocking verified |
| Personal workflow | Checklist and synthetic Books record persisted through app quit/relaunch; backup exported and restored after confirmation |
| External links | Cancel default opens nothing; approval forwards the public URL (system-browser call stubbed in test) |
| macOS Apple silicon package | DMG and ZIP built; packaged application launched; bundled pages match staging; both licences included |

The runtime walkthrough used disposable profiles and synthetic records. Its download
harness supplied a temporary save path after checking the app's native Save-dialog
options. A loopback observer received zero requests in remote-fetch boundary checks.
The initial packaged-app launch checked its home screen; it did not install the
DMG into Applications or use a real person's tax records. The later native campaign
ran the complete packaged smoke on all four targets; its consumer installation,
native dialog and upgrade limitations are recorded in the campaign report.

The final campaign artifacts are under `desktop/dist/native-36564143019/`, with
per-platform installers/archives, checksum lists and sanitised test evidence. The
`TaxSorted-Local-0.1.0-test-source.zip` handoff in that directory is regenerated after
the campaign report is committed, using the scaffold exclusions and no installed
dependencies. Earlier local preview artifacts remain in `desktop/dist`. No production
release or signing/notarisation was performed.

Run the source-copy and desktop boundary tests without using real records:

```sh
node --test scripts/__tests__/create-local-project.test.mjs
npm test --workspace @taxsorted/desktop
```

The scaffold tests use temporary synthetic Git repositories to check private/generated
file exclusion, ignored tracked files, current source changes, symlinks, invalid paths
and refusal to overwrite an existing destination. They do not inspect or copy a real
person's app profile. Desktop tests cover the local URL and packaged-file boundary;
native app walkthroughs establish UI and persistence behaviour beyond those unit tests.

The next product increment should make encrypted full-workspace backup/restore and
recovery understandable before adding opt-in online connections. Any future connected
edition needs an explicit view of what leaves the device, the party receiving it and
the current authorisation; the offline edition should remain independently useful.
