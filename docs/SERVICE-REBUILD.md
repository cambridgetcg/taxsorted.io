# TaxSorted service rebuild

Baseline: `origin/main` at `3e3fa56`; reviewed 29 September 2026. This is a local
product rebuild, not a production release or a tax-source review.

## Purpose

Help a person understand what applies to them, organise the relevant records, and
take the next useful step towards sorting their tax. Begin with individuals, UK
sole traders and UK landlords. Give advisers and organisations useful, accurately
bounded routes into the same tools.

The interface should answer: Is this for me? What can I do now? Where will my work
be kept? What happens next?

## Service map

| Entry | Job | Existing capability reused |
|---|---|---|
| `/` | Choose a starting point or resume records | Audience catalogue, MTD check, records workspace |
| `/services` | Find a service by situation or task | Searchable catalogue; no new tax logic |
| `/services/individuals` | Understand personal income and prepare a handover | Personal-tax checks, Income Tax guide, Passport, official help |
| `/services/sole-traders` | Work from an MTD check through records to preparation | MTD, local books, sole-trade projection, quarter totals |
| `/services/landlords` | Keep property work distinct from a sole trade | MTD, property records, landlord guidance, quarter totals |
| `/services/advisers` | Help someone prepare an inspectable handover | Expert coverage, deeper MTD check, Passport export |
| `/services/organisations` | Understand scope before entering data | Tax-identity map, labelled VAT test workspace, guidance |
| `/checkup?for=landlords` | Resume saved work in My tax year and keep personal reminders | Optional local Books/Passport progress; catalogue destinations and explicit checkmarks |
| `/books` | Choose and open money records | Existing browser-local Books workspace |
| `/books/connect` | Bring in existing records | Manual entry and CSV; truthful provider availability |
| `/file` | Prepare and find an actual filing route | Existing quarter/VAT preparation and official authority routes |
| `/passport` | Prepare a tax summary and handover | Existing Passport contract, save, export and print |

Audience choice is navigation context, not a determination of tax status. People
may use several paths. A landlord is never routed into the sole-trader-only
trading-allowance comparison.

## Names and navigation

Keep TaxSorted as the product name and preserve established URLs, data formats
and storage keys. Rename visible tasks to explain what the person can do.

| Previous public name | New entry name | Stable destination |
|---|---|---|
| Check / Tax Checkup | My tax year | `/checkup` |
| Books / Starter Books | Money records | `/books` and `/books/workspace` |
| File and pay | Prepare a return | `/file` |
| Tax Position Passport | Tax summary and handover | `/passport` |
| Understand | Tax guides | `/learn` |
| Put it right | Help & corrections | `/put-it-right` |
| Plan | Compare sole-trader choices, where supported | `/plan` |

Global navigation: Services, My tax year, Money records, Tax guides, and Help &
corrections, with Account and language controls as utilities. The old capability
families remain available through their existing routes.

## One mechanism per concern

- `frontend/src/lib/tax-services.ts` owns audience order, service destinations,
  actions and capability descriptions. Homepage, directory, audience pages and
  checklist consume it. Ordered checklist tasks and additional relevant services
  are separate, so a short checklist does not hide CSV import from search. The
  catalogue does not own tax rates or eligibility.
- `engine/` still owns calculations, effective dates and source-review stops.
  This rebuild does not change them or renew their evidence dates.
- My tax year reads local Books and Passport progress only after **Show my saved
  progress**. It displays a temporary snapshot and up to three next actions for
  individuals, sole traders or landlords. The reader uses the existing stored
  values without creating or migrating records. Refresh is explicit; hiding the
  snapshot, changing audience or leaving the page clears it. No snapshot or
  permission preference is saved, and no tax figures are displayed or uploaded.
- Books counts cover **6 April 2026–5 April 2027** and keep trading/property
  activities separate. Passport progress is general, not tied to that tax year.
  Missing, older, damaged and inaccessible records remain distinct from an empty
  review queue. The view does not establish completeness, eligibility, tax due,
  reviewed evidence or filing readiness.
- The personal checklist retains its established storage key and format. It
  saves only the selected audience and manually checked service steps after an
  explicit save. These reminders are not year-specific and never change when a
  snapshot is read or a tool is opened. No account is required.
- `frontend/src/lib/books-navigation.ts` carries only a recognised activity
  through workspace links. Existing `start=csv|manual` and fragment targets
  survive. No identifiers or arbitrary incoming query parameters are copied.
- `frontend/src/lib/accounting-integrations.ts` remains the provider-status and
  official-link registry. Authorisation, import and filing stay separate.
- The static Next.js export remains the delivery model. No second backend,
  duplicated account system, cloud ledger or paid service is introduced.

## Integration boundaries

| Capability | What it does today | What it does not do |
|---|---|---|
| Money records | Manual/CSV intake, review, separate supported trade/property books, totals and backup | Bank-feed reconciliation, general company accounts, automatic cloud backup |
| Activity context | Keeps a property entry selected through workspace/import links | Treats audience choice as confirmed ownership or a tax fact |
| Passport | Deliberate local save, export and printable handover | Shared adviser workspace, inspected documents, client authority |
| Accounting providers | Describes import routes; Xero has a closed authorisation pilot in the backend | Public provider imports or a working Xero financial reader |
| HMRC | Existing, explicitly authorised VAT/Income Tax sandbox journeys | Production filing, complete Income Tax year-end filing or recognition |
| Accounts | Existing sign-in/session capabilities | Backup of local records or an adviser/client relationship |

## Implementation and acceptance

1. **Establish the baseline.** The older `taxsorted.io` checkout is a VAT
   prototype. Build from current main in an isolated worktree and preserve the
   existing checkouts and branches.
2. **Make the front door useful.** A visitor reaches a relevant tool from an
   audience page or searches by task. Each service names its scope and links to
   an implemented route.
3. **Connect the journey.** The checklist remembers explicitly saved progress,
   keeps audience progress separate and handles inaccessible/malformed browser
   storage. Opening a tool never means the tax work is complete.
4. **Repair context loss.** Property context survives Today/Money/Business/Tax
   navigation and import actions. It suggests an activity for entry; existing
   records are not rewritten or reclassified.
5. **Simplify work pages.** Records, importing, preparation and handover lead
   with actions. Detailed accounting/delivery-state explanations sit in
   disclosures rather than preceding the task.
6. **Verify.** Component/persistence tests, frontend/engine suites, TypeScript,
   lint, gated static build, route/anchor checks and desktop/mobile journeys.
   Use synthetic inputs only.

## Next delivery work

These are existing product gaps, not capabilities implied by the new design.
Keep detailed gates in the linked documents rather than duplicating a second
operational plan.

| Priority | Next outcome | Acceptance boundary / owner |
|---|---|---|
| 1 | Review and release this rebuild | Visual review, CI, existing release workflow; publication separately authorised |
| 2 | Trustworthy source currency | Renew due source reviews; retain unknown/review-required outcomes — engine/research maintainers |
| 3 | More complete local books | Reconciliation and completeness under [Accounting product](ACCOUNTING-PRODUCT.md); backups remain explicit |
| 4 | One useful external import | Read-only Xero financial adapter through review; privacy/deletion/incident gates in [Accounting integrations](ACCOUNTING-INTEGRATIONS.md) and [runbook](../api/RUNBOOK.md) |
| 5 | Complete production filing | Year-end, recognition, receipts and operational evidence in [production gaps](PRODUCTION-GAPS.md) and runbook |
| 6 | Collaborative adviser service | Explicit client authority, tenant isolation and controlled sharing before invitations/shared data |

Audience pages expose the actual scope now. They do not assert complete tax
preparation for every audience.

## Verification record — 29 September 2026

Verified with Node 22.23.3 against this local worktree:

| Check | Result |
|---|---|
| `npm test --workspace frontend` | 106 files, 737 tests passed |
| `npm test --workspace @taxsorted/engine` | 31 files, 388 tests passed |
| `npm run typecheck --workspace frontend` | Passed |
| `npm run lint --workspace frontend` | Passed |
| `npm run build` | Static export passed, including prebuild review check and postbuild publication guard |
| Exported routes/anchors | 374 internal links across 12 entry pages resolved |
| Chromium desktop/mobile | 12 pages at 1440px and 375px; no horizontal overflow or page errors |
| Translated navigation | All six locales at 320, 375, 768, 1280 and 1440px; no horizontal overflow |
| Interactive journeys | Explicit checklist save/reload, separate audience progress, property context through four Books sections, property-entry default, search/empty recovery, mobile Escape/focus passed |
| `git diff --check` | Passed |

Browser verification used an isolated profile, synthetic choices, and blocked
all non-local HTTP requests. It did not connect a live provider, create an
account, or submit tax data. Screenshots and the browser report are in
`/tmp/taxsorted-service-preview/`; the local static preview is on loopback port 4318.

The full-workspace dependency install hit an existing HTTP 404 for the API's
`@agenttool/sdk` release tarball. A scoped frontend/engine lockfile install
succeeded without dependency changes. The API suite was not run; backend code,
credentials and deployment configuration were not changed. No push or deployment
was performed. The public site still serves the previously deployed version.

## My tax year — 30 September 2026

`/checkup` now joins optional saved-work progress to the existing personal
checklist. The primary audience pages, homepage, six navigation translations,
footer and desktop menu use **My tax year**. Adviser and organisation journeys
retain their personal checklist without reading records for a client.

`frontend/src/lib/tax-year-progress.ts` reads four existing IndexedDB keys in one
read-only transaction after the visitor's request. It validates Books before
counting events in the fixed 2026–27 period. Excluded-only business groups do not
prompt confirmation. Older formats or unseen legacy records prompt opening Books
for its existing migration path; the overview never migrates them. Passport
evidence uses the same effective-state helper as the Passport page, so sources
marked absent do not produce irrelevant evidence tasks. Only counts, status and
timestamps reach the panel. Opening IndexedDB may initialise an empty database
on a fresh profile; the overview writes no saved tax records or consent preference.

The panel puts up to three next actions before detailed counts. It distinguishes
when the snapshot was read from when the Passport was saved, requires an explicit
refresh for later changes, and discards pending results after hide, unmount or
audience change. Existing checklist storage is unchanged. Books action links keep
activity context, but their destinations still show all saved dates/businesses.

Verified locally with Node 22:

| Check | Result |
|---|---|
| Frontend suite | 933 tests across 112 files passed, including 47 reader and 20 panel cases; 36 affected page/panel tests rerun after final layout changes |
| Desktop boundary suite | 51 tests passed |
| Source scaffold | Nine tests passed; fresh copy includes the new module/tests and Backups route, excludes generated browser evidence |
| Frontend TypeScript and ESLint | Passed |
| Static export and offline staging | 81 pages; research publication gate remained closed |
| Source Electron walkthrough | Seven existing runtime checks passed; synthetic checklist, navigation, encrypted recovery and cleanup preserved |
| Isolated browser walkthrough | Opt-in only, four IndexedDB reads and zero record writes; period/activity separation, unknown versus unanswered, maximum three actions, hide/focus, audience change and checklist persistence checked |
| Layout | 320px, 390px and 200% zoom without horizontal overflow; wide and narrow views reviewed |

Browser checks used synthetic records in a fresh context, with zero renderer errors
and zero external request attempts; the context was closed afterwards. The retained
sanitised report and screenshots are under `desktop/test-results/my-tax-year-*`.
The source Electron report is supplementary local evidence, not a new native
installer campaign. Existing downloaded installers retain their earlier recorded
revision. No tax calculations, accounts, provider connections or HMRC submissions
were added, and no production deployment was performed.
