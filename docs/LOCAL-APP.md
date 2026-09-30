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
personal records are needed to build it. The scoped install leaves out the API workspace's
dependencies because the local app does not need its online service or operator tooling.
Full-workspace `npm ci` also works: the September 30 infrastructure repair uses the
existing exact SDK version from npm with the same lockfile integrity, replacing the
unavailable GitHub download. See the [infrastructure roadmap](../infrastructure/README.md#infrastructure-roadmap).
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

The live profile remains unencrypted by the app. OS account access and disk protection
matter: another process or person with access to that OS account can access the profile.
Workspace backups are always password-protected. Books-only backups are protected
by default, with an explicit unencrypted option for compatibility. Other exports,
including Passport and CSV, remain unencrypted.
This is not an adviser multi-client security boundary. Use device encryption, separate
OS accounts where needed, and a protected backup location for sensitive records.

Use **Back up saved work** at `/backups` to move saved Books, Tax Passport,
preparation drafts for both supported years (2025–26 and 2026–27), and personal
checklists between the website and desktop edition. Existing website storage is not
imported automatically. Save each tool first: unsaved forms, original documents,
receipt attachments, account sessions, provider credentials, app preferences and
the synthetic-provider demonstration are outside this copy. Keep the password
separately: TaxSorted cannot reset it or recover the file without it.

Opening the backup page reads no saved tax data. **Prepare a workspace backup**
reads a snapshot, shows its coverage, and offers a password-protected download.
To recover, choose a protected workspace file, unlock and compare it with the
current work, download the exact current snapshot as a protected safety copy,
check that the file was saved, and confirm replacement. A started download alone
does not prove a file exists. Restore replaces all listed areas together; a section
marked **Not saved** clears that section. It does not merge histories or file a return.
Reload the app and other open tabs after restoration, then check the recovered work.

**Money records → Backups** still handles existing Books-only files, including
older plain backups. Its formats, provider-link retirement and compatibility flow
are documented in [Books backup and restore](BOOKS-BACKUP.md).

Removing app data or an OS account can remove local records. The Windows installer is
configured to retain app data on uninstall. Do not rely on uninstall or reinstall as a
backup procedure on any OS.

## Finding your way around

**Prepare my tax return** at `/prepare` is available from My tax year, Services
and the desktop File menu. It keeps separate local drafts for 2025–26 and 2026–27;
opening the page does not read them, and saving requires an explicit action.
The live draft is ordinary app storage, not encrypted by TaxSorted. Its optional
plain-text summary is a handover, not a restorable or password-protected backup.
Underlying evidence documents remain with the person; no documents are uploaded.
Unsaved preparation can be resumed after client navigation within the same window.
That recovery is memory-only and ends on reload or quit. Full desktop navigation
or closing an unsaved preparation asks whether to keep editing or leave without
saving; keeping editing is the default. Save explicitly for durable recovery.

The desktop **Money records** navigation opens the saved workspace directly.
**Backups** has its own Books section; the local status bar and **File → Back up or
restore workspace** open the complete recovery page. An empty Books workspace offers
Books restore beside manual entry and CSV import. Both recovery pages require a
preview and protected safety copy before replacement.

**Navigate → Back / Forward** follows the current window's page history, including
Books activity choices. macOS uses `Cmd+[` / `Cmd+]`; Windows and Linux use
`Alt+Left` / `Alt+Right`. A command is disabled when there is no page in that
direction. These commands navigate pages; they do not undo record changes or save
unfinished forms. Leaving Backups clears transient passwords, file selection and
restore preview. Returning requires selecting the file again.

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
| Complete saved workspace recovery | Encrypted file for Books, Passport, both preparation years and checklists; atomic replacement |
| Books backup/restore | Password-protected by default; plain compatibility files require explicit choice |
| Adviser, Passport and CSV exports | Deliberate unencrypted files; separate from protected Books backups |
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

The current [navigation and recovery campaign](testing/2026-09-29-desktop-navigation.md)
passed all four native installer jobs at
`fd73870d08e3e14fbd279c924e012539c4b973ee`. All 12 source, unpacked and installed
runtime reports verify the five navigation assertions and six backup assertions,
including explicit observation of wrong-password rejection. Each target passed
864 frontend and 388 engine tests; the report records platform-specific desktop,
scaffold, installer and cleanup results. Manual consumer acceptance remains NOT RUN.

The earlier [protected Books campaign](testing/2026-09-29-protected-books.md) passed all four
native installer jobs at `261cf6ae90eebc923409cd7f618e5cb6f6bd88cb`. Its 12 source,
unpacked and installed runtime reports verify encrypted export, independent
decryption, encrypted safety copy and confirmed restore. Its broad alert wait did
not establish observed wrong-password rejection; that assertion is covered by the
corrected campaign above.
Each target passed 850 frontend and 388 engine tests; the report records desktop,
scaffold and cleanup results plus the remaining manual acceptance boundaries.

The [29 September native campaign](testing/2026-09-29-native-campaign.md) passed all
four native CI jobs at commit `1b64679a1a8141fdf54f742e5ca43ea0328feab3`: Windows x64,
Linux x64, Intel Mac and Apple silicon. Each source and packaged app passed seven
synthetic runtime checks; all eight runs reported zero renderer errors and zero
loopback observer requests. Six downloaded preview package files matched their
runner checksums. Manual consumer installation/dialog tests remain NOT RUN; Windows
used Server 2025 and Linux used Xvfb with a scoped AppArmor prerequisite.

The follow-on [installer automation](DESKTOP-TESTING.md#installer-path-automation)
checks the packaged artifact path in disposable runners. macOS copies the app
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
launcher that keeps sandbox requirements and removes the injected desktop flag.
The [installer campaign](testing/2026-09-29-installer-campaign.md) records the
replacement's passing mounted AppImage checks and the other native installer paths.

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

The current navigation and recovery artifacts are under
`desktop/dist/friction-36601360712/`, with per-platform installers/archives,
checksum lists and sanitised test evidence. The
`TaxSorted-Local-0.1.0-test-source.zip` handoff in that directory uses the scaffold
exclusions and contains no installed dependencies. Its README identifies the native
tested revision and the later source/documentation revision. Earlier local preview
artifacts remain in `desktop/dist` as historical evidence; the old Linux AppImage is
retired. macOS previews have
ad-hoc integrity signatures. Earlier installer campaigns predate password-protected
Books backups; each result applies to its recorded revision. No production release,
developer signing or notarisation was performed.

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

Complete workspace recovery uses a shared [storage boundary](../frontend/src/lib/workspace-storage.ts)
and [recovery coordinator](../frontend/src/lib/workspace-backup-store.ts). Explicit
backup/preview first validates the complete saved snapshot, then adopts it in one
IndexedDB transaction while holding the existing Books and Passport Web Locks.
Checklist saves now use IndexedDB, reading an older localStorage copy only until
that slot has been adopted. Ordinary page opening does not activate the workspace.
Old direct-key writers cannot replace the canonical workspace after adoption.

Replacement compares every covered slot against the preview and commits all of them
with a fresh generation in one transaction. Intervening writes require a new preview
and safety copy; failed commits retain the previous workspace. Open editor sessions
retain their generation and cannot save over a later restore, including previously
absent drafts and preparation parked during client navigation. Initial adoption alone
keeps those editors usable. Restore asks the user to reload; it does not erase their
unsaved forms automatically. Web Locks are required for workspace activation/restore.

The inner `taxsorted.workspace-backup/1` format is limited to 12 MiB; its encrypted
`taxsorted.encrypted-workspace-backup/1` envelope is limited to 17 MiB. It reuses the
Books AES-256-GCM/PBKDF2 implementation with a distinct authenticated schema. Plain
workspace imports and cross-format files are rejected. Books retain their existing
10 MiB payload bound, historical evidence and validation. Restore gives Books a new
replica, retires provider bindings/checkpoints and requires business confirmation again.
Encrypted exports protect files; live profile storage remains unencrypted.

The 30 September local source run on macOS arm64 passed the expanded native
walkthrough: protected workspace export and independent Node decryption, wrong
password rejection, the exact current-work safety copy, confirmed replacement and
full quit/relaunch recovery of Books, Passport, both preparation years and checklist.
Existing Books-only recovery and offline request blocking passed in the same run.
The sanitised report is `desktop/test-results/source-smoke.json`, run
`2026-09-30T15-57-29-980Z-20093`, against local changes on `6175c20`.
The frontend suite passed 1,147 tests; desktop unit tests passed 51, infrastructure
checks 33 and scaffold checks 9. Typechecks and frontend lint passed; the build
generated 83 pages and all 35 selected release contracts passed.

A separate isolated Chrome check passed the real encrypted restore flow with three
older editor tabs open: Passport, preparation and checklist rejected stale saves,
retained unsaved entries on screen and left the restored snapshot unchanged. The
idle backup page made zero observed saved-data reads; layouts had no horizontal
overflow at 320, 375 and 1,440 pixels. Its sanitised report and mobile screenshot
are under `desktop/test-results/workspace-browser-*`; the repeatable command is in
the [testing guide](DESKTOP-TESTING.md#automated-checks).

The shared native harness now runs this journey in source, packaged and installed
campaigns. Windows, Linux, Intel Mac and packaged/installer runs of this new journey
remain unrun; earlier native campaigns do not establish this change's result.
Real native Save cancellation, consumer installation and cross-platform transfer
remain in [manual acceptance](DESKTOP-TESTING.md#manual-cases-on-each-native-desktop).

Any future connected edition needs an explicit view of what
leaves the device, the party receiving it and the current authorisation; the offline
edition should remain independently useful.
