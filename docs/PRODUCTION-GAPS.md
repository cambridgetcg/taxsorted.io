# Production gaps and concrete fixes

Prepared 2026-09-12 from the [architecture audit](ARCHITECTURE-AUDIT.md), inspected
baseline `25871cc1bde61b858ab89650692e52333f3f4f28` and the bounded refactors built on
it. This is the next-work backlog; it does not implement these fixes, renew tax
sources, enable a provider or approve production filing.

The existing local preparation product, a reproducible release, a financial provider
import and recognised production filing have different completion conditions. The
current three-workspace architecture can support them; a rewrite is unnecessary.

## Priorities and release boundaries

`Code` means repository implementation and tests. `Evidence review` means checking
sources and recording the result. `External decision / operations` means an owner,
qualified reviewer, provider or authority must supply a decision or operating evidence.
A passing test cannot substitute for that evidence.

| ID | Priority | Work package | Classification | What it gates |
|---|---|---|---|---|
| PG-01 | P0 | Restore a reproducible release gate | Code | Next release under the existing CI contract |
| PG-02 | P0 | Renew MTD source evidence | Evidence review + Code | Reliance on a fresh MTD expert classification; the overdue-source response remains valid meanwhile |
| PG-03 | P1 | Restore local books safely | Code + product decision | A recoverable local-books product; Account sign-in still does not back up books |
| PG-04 | P1 | Prove book scope and completeness | Code + product decision | Broader business support and claims of reconciled/complete books |
| PG-05 | P1 | Fix the VAT validation and review context | Code | A sound VAT preparation and approval boundary |
| PG-06 | P1 | Consistent protection for browser mutations | Code | Hardening existing account-owned mutations |
| PG-07 | P1 | Fence the HMRC grant lifecycle | Code + operational migration | Safe HMRC connection changes and refresh/disconnect behavior |
| PG-08 | P1 | Durable submission attempts and evidence | Code | Production submission with recoverable outcomes |
| PG-09 | P2 | Complete the supported Income Tax filing journey | Code + Evidence review | The declared Income Tax production-filing scope |
| PG-10 | P2 | Derive VAT from reviewed books | Code + Evidence review | A Books-to-VAT claim |
| PG-11 | P2 | One read-only financial provider import | Code + External decision / operations | Importing real provider records; authorisation alone is insufficient |
| PG-12 | P1, concurrent | Close recognition and operational gates | External decision / operations + Code | Opening any production filing rail or admitting a customer provider pilot |
| PG-13 | P3 | Finish bounded module and documentation cleanup | Code / documentation | Maintainability; generally not a blocker to the current narrow preparation product |

P2 work may be designed before P1 finishes. Its dependent capability must remain closed
until its acceptance evidence exists. Missing full accounting, additional providers or
additional jurisdictions does not invalidate a clearly bounded local preparation tool.

## Work packages

### PG-01 — Restore a reproducible release gate

**Gap and evidence.** The audit's production dependency check reported seven affected
entries, including critical Next and high sharp entries. [Root overrides](../package.json)
and the [frontend manifest](../frontend/package.json) pin the relevant dependency
choices. The existing [PR gate](../.github/workflows/ci.yml) fails on high severity.
The static build also warns that Next infers a workspace root from the unrelated home
lockfile. The audit establishes a gate failure, not a demonstrated production exploit.
The canonical-checkout dependency inspection also reports the pinned sharp override
outside Next's declared range; reconcile overrides with the selected releases rather
than treating a successful install summary as the full dependency check.

**Implementation path.** Make a dedicated dependency/lockfile patch using compatible,
reviewed releases. Check direct pins and overrides together; avoid a forced mass update.
Set the intended repository root explicitly in [Next config](../frontend/next.config.ts)
using the installed Next version's documented option. Keep Node 22 and the committed
root lockfile as the reproducibility contract; preserve the home lockfile.

**Acceptance.** Clean `npm ci` on Node 22; all workspace tests, frontend lint,
typechecks, corpus validators, high-severity production audit and static build pass.
The inferred-root warning is gone, the publication worker preserves its closed state,
and changed dependency/runtime implications are recorded. Recheck the advisory feed
when implementing; the audit count is a dated observation.

**Dependencies.** None. One owner changes manifests and lockfile; other workstreams
avoid dependency edits until this patch is integrated.

### PG-02 — Renew MTD source evidence without weakening the stop

**Gap and evidence.** [MTD expert rules](../engine/jurisdictions/uk/expert/mtd-income-tax.ts)
set `reviewDueOn` to 2026-08-11 and return `source_review_required` after that date.
The release canary accepts the explicit degraded state. Corpus shape validation does
not prove that a source is current.

**Implementation path.** Review every admitted primary source against its supported
claims, applicable periods and stated limits. Record retrieval/review evidence and
resolve changes in the rules, why graph, explanations and affected consumer fixtures.
Update review dates only after that work. Document the next review trigger and owner.

**Acceptance.** Every changed claim has review evidence; current-date classifications
match admitted sources; the exact due-date boundary and overdue stop remain tested.
Unknown facts, unsupported dates and contradictory facts still stop safely. Public UI,
Passport and authenticated API agree on the result and source status. Update release
canary expectations only to match the newly admitted evidence.

**Dependencies.** Can run beside PG-01 with separate file ownership. Where the evidence
needs qualified judgement, that review remains outstanding until supplied; do not
replace it with a mechanical date change.

### PG-03 — Restore local books safely

**Gap and evidence.** [RecordsStore](../frontend/src/lib/records.ts) exposes JSON/CSV
exports but no complete backup restore operation. [Local books](../frontend/src/lib/local-books.ts)
retain review state, revisions, conflicts, provider identities and replica metadata
that a transaction CSV alone cannot preserve.

**Implementation path.** Define a versioned backup envelope and strict restore
validation. First ship an explicit replace-from-backup flow with a preflight summary
and an export of existing work; defer merging two histories to a separate contract.
Restore atomically, preserve evidence/revision links and assign a fresh local replica
identity. Provider coverage and account/HMRC bindings must be invalidated or explicitly
re-established, never silently inherited as current authority.

**Acceptance.** Export → clear a disposable store → restore reproduces supported book
facts, money, review states and history. Malformed/oversized files, duplicate IDs,
broken references, unsupported versions, quota failure and interrupted writes leave
the previous store intact. Restored books cannot reuse another replica's checkpoint
or appear ready to file without the required confirmation. The user can leave with
their work without signing in.

**Dependencies.** None for design/implementation; PG-01 for release. Decide restore
semantics before extending the persistence model in PG-04 or PG-11.

### PG-04 — Prove business scope and completeness

**Gap and evidence.** The [Books feature](../frontend/src/features/books/records-client.tsx),
[record store](../frontend/src/lib/records.ts) and [quarter summary](../frontend/src/lib/quarter-summary.ts)
support a deliberately narrow business/currency/year scope. Multiple ledgers of one
activity pause some derived views; mixed historical records cannot simply be treated
as one confirmed business. Receipt attachments and bank reconciliation are absent.

**Implementation path.** First make supported-scope selection and exclusion explicit
through import, review, totals and preparation. Add a reversible, history-preserving
assignment/splitting operation before widening ledger support. Then deliver attachment
custody and reconciliation as separate slices: each needs export/restore, deletion,
storage-failure and completeness semantics. A full chart of accounts and balanced
journal remain later accounting scope, not labels for current cash movement totals.

**Acceptance.** Only confirmed records in the selected business/year/currency count;
waiting and excluded records never count. Switching context or splitting records
cannot leak another business's values or preserve an obsolete approval. Reconciliation
shows unexplained differences and missing coverage instead of guessing completeness.
Attachments, when added, survive PG-03 backup/restore with their record links intact.

**Dependencies.** PG-03 for persistence extensions; PG-02 when a derived view relies on
fresh MTD expert evidence. One owner coordinates record-store schema changes.

### PG-05 — Fix VAT validation and exact review context

**Gap and evidence.** The active pure VAT validator shares
[vat-api.ts](../engine/jurisdictions/uk/hmrc/vat-api.ts) with unused direct fetch helpers.
Its finite/decimal validation is narrower than its comments. The
[VAT return form](../frontend/src/components/vat/vat-return-form.tsx) retains period
state, and the [filing client](../frontend/src/app/vat/file/file-client.tsx) uses a
generic “Not filed” failure title; both need controlled context/latency tests.
API request validation does not establish the exported pure function's contract.

**Implementation path.** Extract pure validation/totals into a transport-free module,
retain compatibility exports, and state the money representation at each boundary.
Bind a reviewed draft to entity, VRN, obligation period, values and revision. On a
context change, cancel or discard stale responses and require review of the new draft.
Render validation failure, proven non-delivery and uncertain delivery separately.

**Acceptance.** Direct engine tests cover nonfinite, fractional, negative and boundary
values according to the chosen VAT contract. Delayed entity/period-switch tests prove
that a stale response cannot submit or render as the new context's receipt. No unknown
outcome is titled “Not filed”. Existing supported calculations and exports remain
compatible; browser bundles do not acquire server transport.

**Dependencies.** Extraction and context fixes can start independently. Final submission
status UI depends on PG-08's durable outcome contract.

### PG-06 — Protect every browser mutation consistently

**Gap and evidence.** [Account](../api/src/routes/account.ts) and
[accounting](../api/src/routes/accounting.ts) mutations check allowlisted Origin.
[Entity writes](../api/src/routes/entities.ts), [VAT submission](../api/src/routes/vat.ts)
and [HMRC disconnect](../api/src/routes/connect.ts) lack the equivalent explicit check.
CORS configuration alone does not prove mutation protection.

**Implementation path.** Introduce one browser-mutation guard and apply it to the
explicit browser route families. Preserve OAuth callback/state validation, safe reads
and server-to-server workspace-key tasks as their own contracts. Review ownership,
full-passkey versus recovery-only identity, and body validation at the same boundary.

**Acceptance.** Missing, malformed and unapproved origins cannot trigger protected
mutations; approved origins still work. Cross-account and recovery-only callers cannot
gain full authority. Integration tests through the assembled app verify that blocked
requests make no database/provider mutation and do not alter public API cookie behavior.

**Dependencies.** None for the bounded guard patch. Coordinate route edits with PG-07
and PG-08; do not serialize the entire programme behind this work.

### PG-07 — Fence the HMRC grant lifecycle

**Gap and evidence.** [HMRC transport](../api/src/hmrc.ts) refreshes/upserts tokens
without a generation fence. [Disconnect](../api/src/routes/connect.ts) revokes upstream
then deletes locally. Their ordering permits a refresh/disconnect race. Connection
lookup uses entity/rail while the provider environment follows global configuration.

**Implementation path.** Give grants explicit environment and taxpayer/rail identity,
generation, lifecycle state and bounded operation ownership. Fence refresh writes
against disconnect/reconnect, record uncertain revocation, and define migration rules
for existing rows. A global environment or VRN change must not reuse a mismatched
grant. Preserve provider-specific refresh/revocation behavior rather than copying the
Xero adapter mechanically.

**Acceptance.** Real Postgres concurrency tests with a controlled provider cover two
refreshes, refresh versus disconnect, reconnect versus a late refresh, process failure,
expired ownership and uncertain revocation. No stale operation revives a deleted grant,
overwrites newer credentials or calls the wrong environment/taxpayer. Migration,
recovery and emergency-stop procedures are documented and exercised on disposable data.

**Dependencies.** PG-06 for exposed browser mutations; coordinate SQL migration ownership
with PG-08. Operational application of a migration is a separate release action.

### PG-08 — Persist approval, attempts and outcomes before external submission

**Gap and evidence.** [VAT](../api/src/routes/vat.ts) checks a receipt, sends to HMRC,
then inserts it: a unique row constraint is too late to serialize the external action.
[ITSA](../api/src/routes/itsa-submit.ts) already reports HMRC success followed by a
failed receipt write honestly, but persists only after the external request and
overwrites the previous payload on cumulative corrections. A correction count is not
an immutable history of approved payloads and authority responses.

**Implementation path.** Persist an exact approved snapshot and intent before network
work; create append-only attempts with a constrained transition model, operation
ownership and correlation evidence. Define local deduplication and provider semantics
separately. Keep delivery-unknown and accepted-but-not-locally-recorded states recoverable.
Reconcile with the provider's supported read/obligation surface before deciding whether
retry is safe. Store each ITSA correction as a new revision linked to the prior one.

**Acceptance.** Real Postgres plus a deterministic provider proves concurrent duplicate
requests, timeout before/after acceptance, crash after send, failed receipt persistence,
restart, correction and revoked authority. No blind automatic resend follows ambiguity;
the exact approved payload, attempt and response remain inspectable. UI status survives
reload and never implies acceptance, payment or settlement from a transport response alone.

**Dependencies.** PG-05 for VAT approval/context; PG-06 and PG-07 for authority; complete
those contracts before enabling the service. Schema and stubbed state-machine work may
proceed in parallel against agreed interfaces. PG-12 still gates real filing.

### PG-09 — Finish the supported Income Tax year-end journey

**Gap and evidence.** [Integration capability table](ACCOUNTING-INTEGRATIONS.md#one-hmrc-gateway-small-tax-modules)
and the [HMRC runbook](../api/RUNBOOK.md) distinguish existing sandbox status,
obligations, businesses, quarters and narrow calculations from missing year-end
adjustments, losses/other income, final declaration and account/payment follow-through.

**Implementation path.** Record the exact supported taxpayer and income-source scope.
Map each required stage to current HMRC contracts and official sources; implement
regime-specific adapters over PG-08. Keep engine estimates, HMRC calculations, the
user's declaration, receipt and later liability/payment state separate. Unsupported
facts stop or hand off explicitly instead of being omitted from a complete-return claim.

**Acceptance.** A minimum-functionality matrix links every claimed stage to code,
sources and sandbox evidence. Supported end-to-end cases cover corrections and adverse
HMRC states; unsupported cases stop before declaration. Restart preserves the exact
approved return and follow-through state. A final receipt does not imply settlement.

**Dependencies.** PG-02, PG-04 and PG-08 for the claimed path; PG-12 before production.
No provider integration is required to prove a manual/CSV-based supported journey.

### PG-10 — Derive VAT from reviewed books

**Gap and evidence.** The current VAT cockpit is a manual nine-box workflow; Starter
Books is scoped to Income Tax cash movements. The [accounting product](ACCOUNTING-PRODUCT.md)
and corrected `/file` copy do not claim that existing books derive a VAT return.

**Implementation path.** Define a supported VAT regime, tax-point/evidence model,
input-tax treatment, rounding and adjustment rules with current sources. Preserve
the source-to-box derivation and digital trail; route unsupported schemes and facts
to review. Feed an immutable derived snapshot into PG-05/PG-08 rather than relabelling
manual values as book-derived figures.

**Acceptance.** Every supported box resolves to reviewed events/adjustments and a rule
version. Missing evidence, unsupported treatment and changed books block approval.
Sourced fixtures and reconciliation prove the supported regimes; UI and API expose
the same scope. Manual entry remains honestly distinguished wherever retained.

**Dependencies.** PG-04, PG-05 and PG-08; current VAT source review; PG-12 before real
filing. This can follow the Income Tax wedge rather than delaying its narrower release.

### PG-11 — Admit one read-only financial provider adapter

**Gap and evidence.** The [Xero pilot](../api/RUNBOOK.md#private-xero-authorisation-pilot)
implements OAuth, token custody and organisation binding with empty financial dataset
capabilities. [Synthetic sync](../api/src/accounting-synthetic.ts) proves the local
page/acknowledgement/checkpoint protocol; it is not a real financial reader.

**Implementation path.** Choose one bounded read-only Xero dataset and explicit
organisation, date, currency and accounting-basis limits. Add versioned normalisation
through the existing To check boundary, preserving raw origins and provider revisions.
Implement provider rate/budget limits, token and disconnect behavior, partial-run repair,
changed/deleted-record conflicts and a visible completeness/reconciliation gate.
Start with authorised demo/developer-owned data and preserve the independent off-switch.

**Acceptance.** Provider contract fixtures and an explicitly authorised pilot prove
pagination, duplicates, changes/deletions, expiry, throttling, interruption and disconnect.
No unconfirmed record counts or reaches a filing payload. Browser acknowledgement and
whole-run checkpoints agree; restored replicas cannot inherit stale coverage. Scope and
missing coverage remain visible. Privacy, retention/deletion, terms and incident evidence
exist before admitting customer organisations; marketplace or filing claims stay separate.

**Dependencies.** PG-03/PG-04 for custody and review, PG-12 for the applicable provider
operational decision. It does not require PG-09/PG-10 to offer bounded reviewed imports,
but cannot claim filing readiness until the relevant tax module is proven.

### PG-12 — Supply recognition and operating evidence

**Gap and evidence.** The [production runbook](../api/RUNBOOK.md#production-later-not-now)
still records recovery-policy work, security assurance, privacy operations and edge
rate limiting alongside HMRC approval. This audit did not inspect private approval
records, commissioned reviews or actual production edge rules. Treat these as
unverified project gates, not conclusions about the user's current external position.

**Implementation path.** Assign an operating owner and reconcile the runbook with
existing private evidence first. Record the accepted recovery boundary, support and
continuity model, privacy/retention/deletion and incident processes, relevant security
review and accessibility evidence. Verify actual edge protections. Compile the exact
HMRC recognition/functionality evidence for each proposed rail. Keep confidential
materials in their appropriate private store; the public repo needs status, scope,
owner and non-sensitive evidence pointers, not personal or credential records.

**Acceptance.** Each proposed release gate has an owner, dated evidence, remaining
conditions and an explicit decision. Recovery, deletion, incident, rollback and support
procedures are exercised in their permitted environment. The recognised scope and
production configuration match the claimed capability. Opening a production rail or
customer pilot is a separate authorised release, with an off-switch and post-release
verification; a code review cannot mark it approved.

**Dependencies.** Start evidence inventory alongside PG-01/PG-02. Recognition evidence
depends on the relevant PG-07–PG-10 sandbox proofs. Provider admission uses the narrower
PG-11 scope and its own applicable requirements.

### PG-13 — Extract and retire only proven boundaries

**Gap and evidence.** The [audit](ARCHITECTURE-AUDIT.md#orphans-misplaced-modules-and-intentional-held-work)
identifies unreachable dashboard/fixture/UI islands and large mixed modules. The first
patch already moved shared Books out of an ITSA route, separated app assembly from
bootstrap, extracted smoke scripts and corrected documentation; do not repeat it.

**Implementation path.** After behavioral hardening, split `developer-api.ts` along
existing registration functions, persistence/import services along transaction
boundaries, and runbooks by operational responsibility. Introduce a dataset resource
interface before moving runtime JSON. Retire confirmed unused modules/assets in a
separate patch; preserve legacy editorial seeds and divergent user work with provenance.

**Acceptance.** Public OpenAPI operations, schema references, session boundaries,
admitted bytes/hashes and publication states are unchanged. Imports/build/tests prove
each extraction; storage changes retain migration and transaction guarantees. Every
retired item has a reachability rationale; historical plans and user-authored material
remain discoverable. No runtime corpus is moved as an accidental orphan.

**Dependencies.** Independent documentation/fixture cleanup can run early with exclusive
paths. Defer invasive HMRC, Books and connector moves until their PG-03–PG-11 contracts
are settled; do not combine them with a behavior fix merely to reduce file size.

## Concrete batches and parallel sequence

| Batch | Parallel work | Integration and exit condition |
|---|---|---|
| 1 — Release and source recovery | PG-01 dependency owner; PG-02 source-review owner; PG-12 evidence inventory | Reproducible checks pass; evidence is renewed or the source-overdue stop remains explicit. No capability switch opens automatically |
| 2 — Safe preparation | PG-03 backup/restore; PG-05 VAT pure contract/context; PG-06 browser mutation guard | Each has focused regression evidence, then the full release gate. PG-04 follows the agreed persistence contract; avoid overlapping record-store edits |
| 3 — Durable filing | PG-07 grant lifecycle; PG-08 intent/attempt schema and provider-stub state machine | Agree identity, environment, fences and SQL ownership first. Integrate real-database failure tests, then connect the UI; PG-09 follows for the declared Income Tax scope |
| 4 — Provider ingress | PG-11 bounded financial reader alongside PG-09 tax completion, after PG-03/PG-04 and applicable PG-12 gates | Authorised read-only pilot, exact local review/checkpoint evidence and off-switch. Provider completeness and tax readiness remain distinct |
| 5 — Additional coverage | PG-10 Books-to-VAT, further accounting depth and PG-13 extractions | Admit each capability independently; wider provider/company/country scope follows evidence rather than navigation changes |

The immediate recommended implementation batch is **PG-01**, with **PG-02 evidence
review** and **PG-12 operating-evidence inventory** running independently. Next, ship
PG-03 and PG-06 as bounded preparation/security improvements while PG-05 is reproduced
and fixed. Give migrations, lockfile changes and the record-store schema one owner per
batch. Source review, external decisions and permission to release remain explicit
dependencies throughout.
