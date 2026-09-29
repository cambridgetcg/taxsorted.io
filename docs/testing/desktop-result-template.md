# Desktop validation result

**Overall: NOT RUN**

Copy this template for one artifact checksum and one OS/architecture. Replace a
status only after recording the observation. Instructions and expected results are
in [Desktop validation](../DESKTOP-TESTING.md).

| Identity | Value |
|---|---|
| Run date (UTC) / operator label | NOT RUN |
| App version / source revision / dirty source description | NOT RUN |
| Artifact filename / SHA-256 | NOT RUN |
| Package signing/notarisation state | NOT RUN |
| OS edition, exact version/build, kernel if applicable | NOT RUN |
| Host architecture / app architecture | NOT RUN |
| Hardware, VM or emulator; hypervisor/version; translation in use | NOT RUN |
| Standard disposable OS-account label; no prior TaxSorted profile confirmed | NOT RUN |
| Clean snapshot/account baseline reference | NOT RUN |
| Node / Electron / Playwright versions | NOT RUN |
| GNOME Wayland/X11 or Xvfb; real GUI session available | NOT RUN |
| Firewall and OS security policy; added FUSE/display/AppArmor prerequisites | NOT RUN |
| Network-off method and restoration | NOT RUN |

Do not paste account names, machine serial numbers, full environment variables or
profile contents. Use test labels and record only settings material to the result.

| Automated evidence | Status | Sanitised report reference / observation |
|---|---|---|
| Doctor with expected platform/architecture and bundle requirement | NOT RUN | |
| Scoped clean install and desktop build | NOT RUN | |
| Scaffold tests | NOT RUN | |
| Shared frontend and calculation-engine tests | NOT RUN | |
| Desktop boundary tests | NOT RUN | |
| Source-mode smoke | NOT RUN | |
| Packaged application inspection | NOT RUN | |
| Packaged-mode smoke in disposable account | NOT RUN | |
| Actual installer/AppImage lifecycle and cleanup | NOT RUN | |
| Installed-app smoke, including sandbox and data persistence | NOT RUN | |
| Artifact checksums/manifest | NOT RUN | |

| Manual case | Status | Observation / minimal evidence reference |
|---|---|---|
| M01 Native installation, trust prompts, launch and profile | NOT RUN | |
| M02 Audience routes, keyboard, zoom and narrow window | NOT RUN | |
| M03 Native CSV picker cancel/import and two-row review | NOT RUN | |
| M04 Native export Save cancel/save | NOT RUN | |
| M05 Restore picker/confirmation cancellation preserves data | NOT RUN | |
| M06 Malformed/unsupported restore preserves data | NOT RUN | |
| M07 Confirmed restore matches safety copy | NOT RUN | |
| M08 Full quit, relaunch and reboot persistence | NOT RUN | |
| M09 Real network-off local workflows | NOT RUN | |
| M10 Native external-link confirmation cancel/approve | NOT RUN | |
| M11 Online routes honestly unavailable | NOT RUN | |
| M12 Source ↔ native Books backup portability | NOT RUN | |
| M13 Same-version uninstall/reinstall retains profile | NOT RUN | |
| M14 Prior-version → new-version upgrade | NOT RUN | Needs two distinct versioned artifacts |

Synthetic-data comparison: **NOT RUN**. Record only record counts, synthetic amounts,
review/history counts and expected changes. Do not attach the backup or app profile.

## Failures and environment blocks

| Case / severity | Expected and observed | Reproduction / exact failed boundary | Next action / retest |
|---|---|---|---|
| NOT RUN | | | |

Use P0/P1/P2/P3 from the plan. A blocked launch must identify whether the boundary
was OS trust, architecture, display, FUSE, sandbox policy or the app itself. A CI-only
allow rule, extracted AppImage or translated architecture must stay visible here.

## Decision

- Target acceptance: **NOT RUN**
- Open P0/P1 defects: **NOT ASSESSED**
- Upgrade compatibility: **NOT RUN**
- Consumer installer/native dialog checks: **NOT RUN**
- Signing/notarisation/publication: **NOT RUN; separate release work**
- Evidence reviewed to exclude profiles, backups, credentials and raw logs: **NOT RUN**
- Test network/security changes restored and disposable environment reset: **NOT RUN**

A pass applies only to the recorded artifact, environment and completed cases.
Supplemental emulation or automation does not replace a required native manual case.
