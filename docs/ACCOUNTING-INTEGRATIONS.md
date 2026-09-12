# Accounting integrations: records to receipt

Last reviewed: 2026-08-25

Implementation-status correction: 2026-09-12; external-source review dates are unchanged.

Status: **target design, not a claim of live provider access.** CSV/manual local books and the
labelled HMRC sandbox paths exist. A made-up, local-development provider proves the account-owned
organisation selection, browser-local page commit, exact acknowledgement and whole-run checkpoint
protocol without credentials, network access or customer data. A separate, default-closed Xero
pilot now implements OAuth, encrypted versioned token custody, organisation selection and explicit
binding to a TaxSorted profile. It has no financial dataset reader and cannot import invoices,
bank transactions or payments. Enabling that private pilot requires the operator configuration
and account allowlist in the [runbook](../api/RUNBOOK.md#private-xero-authorisation-pilot).
Webhook endpoints, reconciliation, direct migration and marketplace listings remain future work.

### Working local proof

With the synthetic API switch enabled outside production, `/books/connect/demo` now walks the
provider-neutral path end to end:

1. require a full passkey session and an explicit account-owned TaxSorted entity;
2. offer exactly one fictional GB/GBP organisation;
3. bind the server source to a separate made-up IndexedDB store and one local activity ledger;
4. fetch two deterministic pages containing three fictional bank transactions;
5. check each raw-page digest and complete manifest before one atomic local write;
6. renew and verify the same fenced lease before each page, acknowledgement and completion;
7. refuse cursor loops or browser safety budgets before saving the unsafe page; and
8. promote matching API and local checkpoints only after the complete run.

The browser and API must hold the same completed checkpoint before a later incremental cursor is
reused. The made-up records never enter ordinary Starter Books. Its scoped clear button deletes
only the demo store and creates a fresh local replica ID, so a surviving device cookie cannot
inherit records or coverage that the browser no longer holds. The page has a human Stop control
that releases the exact fenced server run; the API also has separate connector and sync emergency
stops. This proof has no provider OAuth, token, callback, webhook or provider network call and is
hard-disabled in production.

The browser guard currently allows at most 1,000 pages, 1,000 raw records on one page and 100,000
raw records in one run; an adapter may choose smaller limits. These are defensive client bounds,
not a substitute for provider-specific server policy. A browser crash during an active partial run
currently cancels or waits for the short lease to expire, then restarts from the last whole
checkpoint. Discovering and resuming that exact active run needs a separate server contract and is
not part of the working proof yet.

## The boundary

An accounting connection proves that TaxSorted can read some provider data. It does not prove
that the books are complete, reconciled, correctly mapped to tax, or ready to file.

Keep three things separate:

1. **Accounting source** — a CSV, Xero, QuickBooks, FreeAgent or another record keeper.
2. **TaxSorted books** — the reviewed events, evidence links, corrections and tax mappings that
   TaxSorted can explain.
3. **Tax authority module** — HMRC VAT or Income Tax obligations, submissions and receipts.

No source connector may write straight to an HMRC payload. Every source enters through the same
review boundary that the existing CSV importer uses.

```text
accounting source
  → provider adapter
  → visible import run
  → Money Inbox review
  → reconciliation and completeness gate
  → reviewed books
  → tax-module mapping and explanation
  → HMRC obligation
  → approval and declaration
  → immutable submitted snapshot
  → receipt
  → liability / payment reconciliation
```

## Five different doors

TaxSorted should never hide a referral link behind the word “integration”. The bridge has five
plainly different doors:

1. **Guide** — help someone choose a product, then link to its official signup. No provider data
   or permission is involved.
2. **Connect** — use the provider's OAuth consent flow to read an existing organisation. The
   redirect is the permission ceremony; the resulting API connection is the integration.
3. **Review** — bring provider records through the same visible, reversible review path as CSV.
4. **Move** — prepare an export or, later, an explicitly approved write plan for a destination
   provider. This is separate from ordinary sync.
5. **File** — use the independent HMRC module only after source, review, reconciliation and
   approval gates pass.

The public accounting APIs reviewed here operate on an existing Xero organisation, QuickBooks
company, FreeAgent account or Sage business. They do not document a general endpoint that buys or
creates the provider subscription. For a new customer, the honest route is official signup,
return to TaxSorted, OAuth consent, organisation choice, then a first sync.

## First release: local books stay local

Starter Books currently lives in browser IndexedDB. A provider connector must not quietly turn
that promise into cloud accounting storage.

The first provider release uses a **local replica with a server-side permission door**:

```text
provider signup / marketplace / accountant referral
                       ↓
              provider OAuth consent
                       ↓
TaxSorted API: encrypted grant · selected organisation · page manifest · dirty hint
                       ↓ private, no-store pages; no provider token
browser replica: raw versions → normalized records → review → evidence → readiness snapshot
                       ↓ deliberate tax mapping and approval
separate HMRC module: obligation → submission snapshot → receipt → payment check
```

| Data | First-release home |
|---|---|
| One-time OAuth attempts, encrypted access and refresh tokens | TaxSorted API |
| Provider user/grant and deliberately selected organisation metadata | TaxSorted API |
| Deliberate organisation → TaxSorted entity binding | TaxSorted API |
| Browser replica → local-ledger binding | That browser's IndexedDB only |
| Verified webhook hint, connection dirty generation and rate-limit state | TaxSorted API; bounded metadata only |
| Raw provider record versions and normalized records | Browser IndexedDB |
| Reviewed events, conflicts, attachments and explanations | Browser IndexedDB |
| Staged page cursor and committed coverage checkpoint | Per browser replica; API advances only from a matching post-commit acknowledgement |

The browser never receives a provider access token. It asks the TaxSorted API for bounded provider
pages; the API proxies them without retaining the financial payload. Each page carries a stored or
signed API manifest. The browser appends the raw and normalized versions in one local transaction,
then acknowledges that exact manifest. A matching acknowledgement advances only a staged resume
cursor. The committed coverage checkpoint advances after the whole dataset run completes.

Organisation discovery is temporary. The API fetches the smallest selection list the provider
allows, gives it a short expiry and persists only organisations the person deliberately selects.
This matters especially for accountant grants that can reveal a whole client list.

A webhook verifies and records **something changed**. Its raw body is discarded after raw-byte
signature verification; only bounded deduplication and dirty metadata remain. It does not fetch or
alter the books while the person is away. Each browser replica tracks its own cleared dirty
generation, so one device cannot make another look current. The next foreground sync repairs the
local replica. A final refresh is required before a filing-readiness snapshot.

Each fresh browser installation or restored export receives a new replica ID and performs an
initial comparison; replica IDs and committed checkpoints are never restored or cloned. Only one
sync may run for a connection and replica across tabs, using a browser lock with a short IndexedDB
lease fallback for local coordination. The API is authoritative: it grants one renewable active-run
lease per connection and replica with a monotonic fencing token. Every page, acknowledgement and
completion rejects a stale fence after expiry or takeover. Before fetching, TaxSorted checks
storage capacity. Quota, eviction and attachment failures pause safely, keep the last complete
checkpoint and offer export/space recovery. Offline books remain readable; sync resumes explicitly
when the person is online again.

A later shared cloud workspace is a separate custody choice with its own consent, retention,
encryption, roles, export and deletion contract. It must not arrive as an invisible change to the
local-first connector.

Long-lived provider tokens require a fully signed-in, passkey-backed TaxSorted account. An
anonymous browser or recovery-only session may use local CSV, but may not create or control a
provider grant.

## One small connector contract

Every accounting adapter has the same jobs:

- authorise with the least access it can use;
- list organisations and make the user choose one deliberately;
- verify legal name, identifier, base currency and period settings; treat provider accounting
  settings as evidence and ask the person to confirm the TaxSorted tax basis;
- take an initial snapshot, then fetch changes from a durable cursor;
- namespace every source identity by provider, organisation and object type;
- preserve the provider's revision, timestamp, original tax code and currency;
- fetch evidence separately and keep its source association;
- declare capabilities and blind spots instead of pretending every provider is alike;
- report connection health, last complete sync and an exact recovery action;
- disconnect one organisation without touching any HMRC authority connection;
- let the user export the imported records and TaxSorted review history.

The adapter produces import candidates. It cannot mark them ready, reconcile them, choose a tax
treatment, approve a filing or submit to HMRC.

### Capabilities are data

Each adapter declares whether it can read:

- ledger transactions;
- accounts and provider tax codes;
- attachments;
- bank-statement observations;
- reconciliation state;
- native tax-return state and receipts;
- incremental changes;
- webhooks.

Missing capability is a visible product state, not a hidden implementation detail. A final
pre-filing refresh is required even when webhooks exist.

### Capability truth is more than yes or no

Use observations with these states:

```text
available | partial | unavailable | permission-missing
unknown | degraded | disabled
```

Each observation names the dataset or action, organisation, granted scope, object/date coverage,
checked time, expiry, limitation, recovery action and official source. Effective capability is the
intersection of:

```text
provider API × granted permission × organisation plan/settings
             × provider health × completed local sync
```

For example, “Xero supports invoices” is not enough. TaxSorted must still say whether this user
granted invoice access, whether the chosen plan and role allow it, what period the local replica
holds, and whether the latest sync completed.

## Domain objects and stable identities

One `connected` flag cannot describe the system. Keep these objects separate:

| Object | Meaning |
|---|---|
| `ProviderAuthorisation` | One user's consent and rotating token set. It may reveal organisations on demand, but does not retain every discovery result. |
| `ProviderOrganisation` | One deliberately selected Xero tenant, QuickBooks `realmId`, FreeAgent company/practice client or Sage business. |
| `SourceConnection` | A server-side binding from one selected provider organisation to one TaxSorted entity. |
| `ReplicaLedgerBinding` | A local-only binding from a source connection and browser replica to one local ledger. |
| `SyncReplica` | One browser installation's local-books store. “Last complete sync” belongs to this replica and is never cloned on restore. |
| `SyncRun` | One append-only initial, incremental, repair or pre-filing attempt, holding the current renewable lease and fencing token. |
| `PageManifest` / `StagedResumeCursor` | API-bound page facts and the next safe page within an incomplete run. |
| `DatasetCheckpoint` | The last wholly completed local coverage for one dataset; partial runs cannot replace it. |
| `WebhookSignal` | A verified, deduplicated prompt that marks an organisation dirty. |
| `RawRecordVersion` | One immutable provider observation before TaxSorted interpretation. |
| `NormalizedRecordVersion` | A deterministic provider-neutral view with its mapper version and limitations. |
| `ImportDecision` / `ConflictCase` | What a person accepted, excluded or resolved, with reason and history. |
| `ReconciliationCheck` / `ReadinessSnapshot` | Period-specific proof and filing gates. |
| `WriteIntent` / `MigrationRun` | Future controlled writes; never part of the read adapter. |

Stable provider identity is:

```text
provider + environment + organisation ID + object type + provider object ID
```

A version adds the payload digest, provider revision/`SyncToken` where supplied and source update
time. Provider revision values are evidence, not the sole identity.

The local-books v3 foundation now has provider-namespaced identities, opaque text revisions,
immutable raw and normalized versions, provider conflict cases, complete page manifests and
per-replica dataset checkpoints. [Versioned local backup/restore](BOOKS-BACKUP.md) now preserves
record evidence with a fresh replica, while retiring provider bindings and old coverage.
A real connector still needs attachment custody, conflict resolution actions, the wider
storage-failure recovery model and full reconciliation/readiness evidence before launch.

## Split provider access from accounting interpretation

The driver fetches provider truth. The normalizer interprets its shape. They are separate so a
provider API change cannot silently change tax treatment.

```ts
interface ProviderDriver {
  provider: "xero" | "quickbooks" | "freeagent" | "sage-accounting-uk";
  beginAuthorisation(input: AuthorisationRequest): Promise<AuthorisationRedirect>;
  finishAuthorisation(input: AuthorisationCallback): Promise<ProviderAuthorisation>;
  refresh(authorisationId: string): Promise<void>;
  revoke(authorisationId: string): Promise<void>;
  listOrganisations(authorisationId: string): Promise<ProviderOrganisation[]>;
  probeCapabilities(organisationId: string): Promise<CapabilityObservation[]>;
  pullPage(input: PullPageRequest): Promise<RawProviderPage>;
  fetchAttachment(input: AttachmentRequest): Promise<ReadableStream>;
  verifyWebhook?(request: WebhookRequest): Promise<WebhookSignal[]>;
}

interface ProviderNormalizer {
  version: string;
  normalize(raw: RawRecordVersion): NormalizedRecordVersion[];
}

// A later package with separate permission, allowlists and tests.
interface ProviderWriter {
  preview(intents: WriteIntent[]): Promise<WritePreview>;
  send(writeIntentId: string): Promise<WriteOutcome>;
  verify(outcomeId: string): Promise<WriteVerification>;
}
```

Normalized records stay typed: bank observation, explanation, invoice, bill, credit note,
payment, journal, account, tax code, attachment reference and provider return state. One provider
record may produce zero, one or several review candidates. Do not flatten an invoice, its payment
and its bank observation into one GBP cash event.

When one raw record produces several review candidates, each candidate needs its own stable child
source ID (for example an invoice-line discriminator). A changed content digest is a revision, not
a new identity; it opens a conflict and must not be linked to the older reviewed event.

Every normalized version keeps its raw references, normalizer and mapping versions, original
currency, provider tax code and status, fields that were absent or unavailable, and a plain
limitation. A suggested TaxSorted category remains a suggestion until reviewed.

## OAuth and the token boundary

Use one provider registry and one OAuth gateway, while keeping separate client credentials,
redirect URIs, scopes and token rules per provider.

- use server-side authorization-code flow; add PKCE wherever the provider supports it;
- generate a high-entropy nonce, store only its hash with the server-held PKCE verifier, and put
  the nonce in short-lived signed `state` bound to provider, full-session TaxSorted account and an
  allowlisted return path;
- atomically consume the nonce hash before code exchange, then compare every binding so replayed
  callbacks fail even when the `state` signature is valid;
- register and compare redirect URIs exactly; never accept a caller-supplied redirect target;
- exchange codes and store tokens only on the API server;
- encrypt token fields with authenticated context containing provider, grant ID and key version;
- replace rotating refresh tokens atomically under a per-grant lock;
- never place codes, tokens, record bodies, NINOs or VAT numbers in logs;
- request the narrowest provider access available and explain every scope before leaving
  TaxSorted. Xero supplies granular read scopes; QuickBooks supplies one broad accounting scope,
  while FreeAgent derives access from the authorising user's permissions. For QuickBooks and
  FreeAgent, the first adapter must therefore enforce read-only behaviour itself by containing all
  provider traffic in a driver that permits only documented `GET` operations;
- treat pause, provider revocation, local-data deletion and TaxSorted-account deletion as four
  different actions.

These controls follow the current [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700.html).
Provider OpenID sign-in can shorten marketplace onboarding, but it must not become the only key to
the TaxSorted account. A person must retain an independent TaxSorted passkey/recovery route so
disconnecting or leaving an accounting provider does not lock them out of their tax trail.

## Sync, checkpoints and repair

Use a staged resume cursor and a committed coverage checkpoint per organisation, browser replica
and dataset. A single global cursor hides partial failure.

1. Start a run from the last committed dataset checkpoint and the replica's cleared dirty
   generation. Acquire the single server lease and its monotonic fence; use the browser lock only
   to avoid needless contention between local tabs.
2. Record the current webhook dirty generation and, where the provider supplies one, an upper
   bound. Otherwise record a run-start watermark and require overlap plus a post-scan comparison.
3. Fetch one bounded page with the provider-specific overlap window. The API stores or signs a
   manifest containing run, replica, dataset, sequence, fencing token, expected digest/count,
   current and next cursor, optional upper bound, dirty generation and expiry.
4. Return the page only to the owning full session with `Cache-Control: private, no-store`.
5. Validate shape and append raw provider versions in IndexedDB.
6. Run the versioned normalizer, create or hold review candidates, and commit the complete page in
   the same local transaction using stable source identity and content digest.
7. Acknowledge the manifest ID and digest under the current fence. The API accepts only an
   idempotent exact match to its manifest; a client-supplied digest or stale fencing token cannot
   authorize progress.
8. Advance the staged resume cursor for that run. A crash or missing acknowledgement replays the
   page safely and leaves the committed coverage checkpoint unchanged.
9. After the final page and every matching acknowledgement, complete the dataset run under the
   current fence and promote its committed coverage checkpoint atomically. Recheck the dirty
   generation: a webhook that arrived during the run leaves this replica dirty and schedules
   another repair pass.
10. Run the provider's repair path: webhook plus CDC, incremental polling or bounded comparison.
    When the old checkpoint falls outside a provider's delta window, use a full bounded comparison.
11. Before filing, refresh every dataset used by that period and compare the period again.

Webhook handling is deliberately small:

```text
received → raw-byte signature verified → raw body discarded → deduplicated → connection marked dirty
         → browser opens → canonical provider page fetched → local commit → checkpoint acknowledged
```

Never treat a webhook body as accounting truth. An absent object becomes a tombstone only when the
provider explicitly reports deletion or a completed comparison proves absence. Absence from a
partial list is not deletion.

Rate budgets, `Retry-After`, page size and overlap live in provider policy data. Work stops at a
page boundary when disabled; an incomplete run may retain a staged resume cursor but never advances
the committed coverage checkpoint.

## Conflicts, reconciliation and filing readiness

Provider changes do not overwrite reviewed events. They open a conflict with the old version, new
version, actor, time and resolution reason. Conflict kinds include changed/deleted source,
possible duplicate, mapping-version change, unknown provider tax code, ledger rebinding and a
late change after a filing freeze.

The normal recovery path is **Fix in provider → refresh TaxSorted → review the new version**.
Where a provider documents object-specific deep links, use them to return the person to the exact
invoice, bill, payment or bank transaction instead of a generic provider home page. Xero documents
this route today; every other provider needs its own verified link policy. TaxSorted may later offer
a direct write only through the separate writer contract.

A reconciliation check keeps source account, period, committed checkpoint, provider-balance
visibility, provider balance, TaxSorted balance, difference, evidence and human explanation.
Where an API cannot expose reconciliation, that capability stays `unavailable`; acknowledgement
cannot turn the provider capability into “available”. The separate filing gate may still pass when
the person supplies dated statement or balance evidence, TaxSorted compares it with the local
books, and the person explicitly confirms the provider-side check. Missing or stale independent
evidence blocks readiness; the permanent API blind spot alone does not.

A readiness snapshot freezes:

- exact raw and normalized version references;
- capability observations and connector blind spots;
- committed checkpoints and freshness;
- open blockers and acknowledged warnings;
- reconciliation results;
- mapping/policy versions, approver and time.

This snapshot, not connection colour, is what a tax module may consume.

## State machines

Keep these states visible and independent:

```text
Authorisation: pending → active → reauthorisation-required | revoked | failed
Connection:    selecting → active ↔ paused → disconnected
Sync:          queued → fetching → staged → committed | failed | cancelled
Candidate:     pending → accepted | excluded | conflict
Conflict:      open → resolved
Write:         draft → previewed → approved → queued → sending
               → accepted | rejected | outcome-unknown
Verification:  verified-applied | verified-not-applied | manual-review
Migration:     planned → baseline-copied → deltas-caught-up → compared
               → cutover-approved → cutover → verified | rolled-back
```

“Connection health” is a projection of these states, not a stored green Boolean.

## Controlled writes and migration

The first connector package is physically read-only. A later writer needs separate code,
provider permission where the provider offers it, a TaxSorted feature switch and an operation
allowlist. Where a provider exposes one broad accounting scope, TaxSorted's own write lock still
defaults closed.

Every immutable server-held write intent carries the exact payload and preview, preview digest,
target organisation, expected source revision/`SyncToken`, idempotency key and human approval. The
writer receives only that intent ID, reloads and revalidates the approval, feature switch, target,
expected revision and exact payload, then emits from an outbox. Provider response and
read-after-write evidence stay with the intent. `outcome-unknown` never triggers a blind retry; it
resolves only to `verified-applied`, `verified-not-applied` or `manual-review`.

Start direct migration with new low-risk objects only. Do not begin with deletes, bank
reconciliation, filed-period changes, provider tax submission or lock-date changes. Name one
authoritative system before and after cutover; do not maintain an indefinite two-way write loop.

The first useful migration release can remain simpler: a reviewed, downloadable migration pack,
an official provider signup door, a return checklist and read-only comparison after import.

## Off-switches

Provide independent switches for all accounting connectors, one provider, one dataset, webhook
intake, foreground sync, future background sync, attachments, writes and one connection.

Every switch must block new relevant calls, stop bounded work at the next page boundary, prevent
checkpoint advancement for incomplete work, preserve readable/exportable local records and show
the exact disabled reason and recovery step. Pausing sync never silently revokes consent or erases
records; those remain deliberate separate actions.

Turning off ordinary webhook intake must not create an unbounded provider retry storm. Where the
provider supports it, unregister the subscription. Otherwise verify the request, discard its body,
return the provider-required success and retain only a bounded suppressed-hint count. A suspected
signature-verifier incident is the separate hard-close case and follows the provider incident
runbook even if retries result.

## What the leaders teach

### Xero

Xero's OAuth model separates the user grant from the connected tenant. TaxSorted should keep its
token record separate from each chosen organisation, pass tenant context explicitly and allow
only one refresh at a time. Xero webhooks cover only part of the accounting surface, so they are
a prompt to sync rather than proof that a period is complete.

Use the standard server-side OAuth flow and current granular read scopes. Do not start with the
premium generated Journals endpoint or any write scope. Manual Journals are a different endpoint
and remain available below Xero's Advanced tier. Check the organisation's actions because the
authorising user's role and plan can still remove an apparent capability.

The important limit is explicit: the ordinary Xero Accounting API does not expose unreconciled
bank-statement lines and cannot reconcile them. Xero's richer Finance API is a closed
financial-services/lending partnership, not a dependency a general TaxSorted connector can assume.
A Xero connector must therefore say
**reconciliation not visible through this connection**. It must never turn “connected” into
“checked”.

The current March 2026 commercial path is concrete: Starter permits five free connections, Core
permits 50, and Plus is the first tier that can be certified and listed. Xero recommends learning
with a few beta users while preparing the listing; certification separately requires ten active
customer connections. Plus also brings Rapid Sync for a new
connection; the Advanced tier and separate approval are needed for Bulk Connections and the
premium Journals endpoint. Costs and limits belong in a dated operating record because they can
change.

After certification, the App Store can send an existing Xero customer into **Sign Up with Xero**,
which creates or pre-fills the TaxSorted account—not a Xero organisation. TaxSorted may also apply
separately for Xero referral or channel programmes for people who do not yet use Xero. Any payment
or discount must be disclosed and must never affect the suitability explanation.

Xero's current developer terms prohibit using API-derived data to train or contribute to an
AI/ML model. TaxSorted should apply the stricter rule to every provider by default: customer
records never enter model training. Any external-model inference over provider data needs a
provider-specific terms review, a defined feature and clear user consent before it is designed.

Official sources:

- [Xero current developer pricing and tiers](https://developer.xero.com/pricing)
- [Xero API limits](https://developer.xero.com/documentation/guides/oauth2/limits)
- [Xero OAuth scopes](https://developer.xero.com/documentation/guides/oauth2/scopes/)
- [Xero tenants](https://developer.xero.com/documentation/guides/oauth2/tenants/)
- [Xero token integrity guidance](https://developer.xero.com/documentation/best-practices/data-integrity/managing-tokens)
- [Xero webhooks](https://developer.xero.com/documentation/guides/webhooks/overview/)
- [Xero object deep links](https://developer.xero.com/documentation/guides/how-to-guides/deep-link-xero/)
- [Xero bank-statements API boundary](https://developer.xero.com/documentation/api/accounting/bankstatements)
- [Xero Finance API partnership boundary](https://developer.xero.com/documentation/api/finance/overview)
- [Xero history and notes](https://developer.xero.com/documentation/api/accounting/historyandnotes)
- [Xero attachments](https://developer.xero.com/documentation/api/accounting/attachments)
- [Xero certification checkpoints](https://developer.xero.com/documentation/xero-app-store/app-partner-guides/certification-checkpoints)
- [Xero app growth guidance](https://developer.xero.com/documentation/xero-app-store/app-partner-guides/building-and-growing-your-app/)
- [Sign Up with Xero](https://developer.xero.com/documentation/xero-app-store/app-partner-guides/sign-up)
- [Xero app-partner features](https://developer.xero.com/documentation/xero-app-store/app-partner-guides/app-partner-features)
- [Xero organisation endpoint: GET only](https://developer.xero.com/documentation/api/accounting/organisation)

#### First Xero pilot envelope

Keep the five-organisation pilot narrower than Xero itself:

- one UK Xero organisation with GBP base currency, bound to a TaxSorted entity whose identity and
  ownership have been checked as this person's sole trade or UK-property activity; limited
  companies, partnerships, trusts, charities and organisations owned by somebody else stay
  blocked;
- one deliberately selected local ledger; mixed activities wait for an explicit
  account/tracking-category mapping;
- `openid profile email offline_access`, plus granular read access for settings,
  bank transactions, payments and invoices;
- a bounded date window covering the tax period being reviewed, with visible earlier-date limits;
- organisation settings, accounts/tax codes, spend/receive-money records and invoice-payment links
  preserved as typed source versions;
- only supported GBP cash movements become Money Inbox candidates; transfers and non-cash objects
  remain visible but do not become income or expenses automatically;
- multi-currency treatment, payroll, stock, CIS, attachments, generated journals, provider writes
  and provider-native tax filing remain out of the pilot;
- because the public API cannot inspect native reconciliation, TaxSorted asks the person to finish
  it in Xero, refresh, supply dated statement or balance evidence and confirm the check; readiness
  remains blocked until that independent evidence is present and fresh.

If the organisation, source object or accounting basis falls outside that envelope, show the exact
reason and export path. Do not import a convenient subset and call the period complete.

### QuickBooks Online

QuickBooks binds OAuth to a company `realmId`. Its webhook guidance says events may be missed or
arrive out of order, and recommends Change Data Capture as repair. TaxSorted should copy that
repair posture: webhook, incremental comparison, then a final refresh. Provider `SyncToken` and
request IDs matter if write-back ever lands; the first connector remains read-only.

Change Data Capture is a repair aid, not a permanent history: the documented window is the
preceding 30 days, one response is capped at 1,000 objects, and some entities including tax-code
objects are excluded. TaxSorted must repair inside that window or fall back to a fuller bounded
comparison; a late webhook cannot make an expired gap complete.

Intuit supplies sandbox companies and allows a production app to remain unlisted. Production
credentials still require its app assessment and continuing security obligations. Public listing
adds technical, security and marketing review.

The strongest extension of the QuickBooks App Store route is **Accountant Ready**. After TaxSorted
is listed, implements Intuit Single Sign-on and enables Accountant Ready, a QuickBooks Online
Accountant user can find and recommend it to clients. Each company must remain keyed by `realmId`;
one accountant login must never merge client records.

QuickBooks' VAT checker is a useful readiness pattern: find missing VAT, unmatched bank items,
duplicates and unusual values before filing. Its own checker does not recommend the correct VAT
code. TaxSorted can add a cited explanation and visible uncertainty without turning a suggestion
into a fact.

Official sources:

- [QuickBooks sandbox companies](https://developer.intuit.com/app/developer/qbo/docs/develop/sandboxes/manage-your-sandboxes)
- [QuickBooks OAuth](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization/oauth-2.0)
- [QuickBooks webhook practices](https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks/best-practices)
- [QuickBooks Change Data Capture](https://developer.intuit.com/app/developer/qbo/docs/learn/explore-the-quickbooks-online-api/change-data-capture)
- [QuickBooks VAT error checker](https://quickbooks.intuit.com/learn-support/en-uk/help-article/value-added-tax/quickbooks-vat-error-checker-faq/L0wJl2L5y_GB_en_GB)
- [QuickBooks production requirements](https://developer.intuit.com/app/developer/qbo/docs/go-live/publish-app/platform-requirements)
- [QuickBooks marketplace and Accountant route](https://developer.intuit.com/app/developer/qbo/docs/go-live/list-on-the-app-store)
- [Make an app Accountant Ready](https://developer.intuit.com/app/developer/qbo/docs/go-live/list-on-the-app-store/make-your-app-accountant-ready)

### FreeAgent

FreeAgent has the cleanest return-state vocabulary to borrow: `unfiled`, `pending`, `rejected`,
`filed` and `marked_as_filed`, with filing time, form-bundle reference, payment state and VAT-box
breakdown. “Marked locally” must stay different from “accepted by HMRC”. Its bank model also
keeps a bank observation separate from one or more explanations.

Its current public API documents timestamp polling rather than webhooks. Use `updated_since` where
available, overlap the window and run a bounded comparison. Do not turn absence of public webhook
documentation into a claim that no private partner facility exists.

The published operating limits are 120 requests per minute, 3,600 per hour and 15 token refreshes
per minute. Keep those budgets in provider policy data and coordinate refreshes per grant; do not
turn a limit response into a partial checkpoint.

FreeAgent's strongest ecosystem opening is its separate Accountancy Practice API. A practice app
can list permitted clients, select one through `X-Subdomain`, then use the ordinary company
endpoints on that client's behalf. This deserves its own authorisation type and client selector;
it must never be faked as many unrelated consumer grants. A curated partner-integration directory
is a separate application to FreeAgent's integrations team.

Official sources:

- [FreeAgent OAuth and sandbox](https://dev.freeagent.com/docs/oauth)
- [FreeAgent API limits and write verbs](https://dev.freeagent.com/docs/introduction)
- [FreeAgent VAT Returns API](https://dev.freeagent.com/docs/vat_returns)
- [FreeAgent bank transactions](https://dev.freeagent.com/docs/bank_transactions)
- [FreeAgent bank-transaction explanations](https://dev.freeagent.com/docs/bank_transaction_explanations)
- [FreeAgent account locks](https://dev.freeagent.com/docs/account_locks)
- [FreeAgent Accountancy Practice API](https://dev.freeagent.com/docs/accountancy_practice_api)
- [FreeAgent partner integrations](https://www.freeagent.com/integrations/)

### Sage Accounting UK

Sage's VAT flow asks what to do with older unreported transactions — now, later or never — while
preparing a return. TaxSorted should keep that choice and its reason. A late transaction must not
silently jump periods or disappear.

Name the connector precisely: **Sage Accounting API v3.1 for UK businesses**. “Sage” also names
Sage 50, Sage Active, payroll, final-accounts and other products with different APIs. The v3.1
surface spans contacts, invoices, payments, banking, journals, opening balances, attachments,
settings and taxes. Read/write support varies by endpoint, country, Sage plan and the connected
user's role; some UK settings and tax resources are read-only.

The public v3.1 reference documents `updated_or_created_since` and `deleted_since` on useful list
endpoints, but no Accounting webhook surface was found. Treat polling plus a periodic comparison
as the supported public design, while asking Sage directly about partner-only facilities.

Sage's Tech Partner and Marketplace route can distribute a per-business connector. Sage for
Accountants supplies a separate practice channel and already acknowledges mixed Xero, QuickBooks
and Sage client portfolios—evidence that TaxSorted's provider-neutral view is useful, and also a
reason to make the tax explanation and portability genuinely distinct.

- [Sage VAT return flow](https://gb-kb.sage.com/portal/app/portlets/results/viewsolution.jsp?solutionid=222001000101356)
- [Sage Accounting API v3.1](https://developer.sage.com/accounting/apis/sagebusinesscloudaccounting/3.1.0/accounting)
- [Sage Accounting journals](https://developer.sage.com/accounting/apis/sagebusinesscloudaccounting/3.1.0/accounting/groups/transactions/tags/journals)
- [Sage Tech Partners](https://www.sage.com/en-gb/partners/tech-partners/)
- [Sage Marketplace](https://www.sage.com/en-gb/app-marketplace/)
- [Sage for Accountants client management](https://www.sage.com/en-gb/accountants/client-management/)

## How TaxSorted uses the ecosystems

The ecosystems provide four different kinds of leverage. Keep them separate so distribution does
not distort accounting truth.

| Route | What it gives TaxSorted | Product rule |
|---|---|---|
| Direct OAuth | Existing TaxSorted users can connect their provider organisation. | Read-only first; provider is replaceable. |
| Provider marketplace | Xero/QuickBooks/Sage customers can discover TaxSorted inside their existing workflow. | Listing copy names actual live capabilities and limits. |
| Accountant/practice channel | One professional can introduce and, where permitted, connect many client organisations. | Each client stays separately selected, isolated and inspectable; authority may be a direct client grant or a practice grant that explicitly covers that client. |
| Referral/channel programme | A person without software can reach official signup; TaxSorted may receive a provider-defined benefit. | Suitability comes first; disclose the relationship and current terms. |

Practice access needs a product boundary that does not exist in today's one-owner local books:

- `Workspace` isolates one client/business review space, local store, export and filing trail;
- `Principal` names the client, accountant or other person acting in that workspace;
- `ClientAuthority` records what that principal may view, prepare, approve or submit, for which
  client and until when;
- provider practice permission proves access to accounting records only. It is not client approval
  of TaxSorted's treatment and never proves HMRC agent or filing authority.

FreeAgent Practice and QuickBooks Accountant Ready therefore wait until those objects, client
selection, role checks and per-client local-store/export isolation pass the shared tests. Direct
single-company connectors do not need to wait for the later practice product.

Recommended order:

1. **Xero five-connection technical pilot.** Use only synthetic, demo or developer-owned data while
   proving the read-only contract; make no marketplace or filing-readiness claim.
2. **Safe real-customer foundation, then Xero private beta.** Put privacy, retention, deletion,
   incident, support and every disconnect path live before connecting a customer organisation.
   Add verified webhook hints, repair, final refresh and real rate/egress monitoring.
3. **FreeAgent single-company connection.** Reuse the contract and its bank
   observation/explanation model without introducing practice authority yet.
4. **QuickBooks direct connection and App Store path.** Build multi-`realmId` isolation,
   webhook+CDC repair and the production assessment before listing.
5. **Practice foundation, then channels.** Add `Workspace`, `Principal` and `ClientAuthority` plus
   per-client storage/export isolation before FreeAgent Practice or QuickBooks Accountant Ready.
   Add Intuit SSO and Accountant Ready only after App Store listing.
6. **Sage Accounting UK.** Add only the exact v3.1 product, with plan/country/role capability
   checks and polling. Pursue Tech Partner distribution after real client proof.
7. **Marketplace certification.** Apply only after direct users have proved the connector and its
   support burden. Acquisition must not be the first production test.

Before any real customer organisation is connected, TaxSorted needs public privacy and terms,
support and connection-management pages, one-organisation disconnect and account-deletion flows,
a tested breach/incident process, provider-specific retention/deletion wording and security review
evidence. Peak-tax-season support limits and listing-specific evidence are added before a
marketplace submission. App-store identity may start account creation where required, but the
TaxSorted passkey and recovery path remain provider-independent.

## Proposed API surface

Keep verbs and destructive meanings explicit:

```text
POST   /v1/accounting/authorisations/:provider/start
GET    /v1/accounting/authorisations/:provider/callback
GET    /v1/accounting/authorisations
GET    /v1/accounting/authorisations/:id/organisations # short-lived selection view
DELETE /v1/accounting/authorisations/:id              # revoke whole grant after showing every affected connection; keep local books

POST   /v1/accounting/source-connections               # persist one selected org/entity link
GET    /v1/accounting/source-connections/:id/status    # exact localReplicaId query; never enumerate sibling replicas
POST   /v1/accounting/source-connections/:id/pause
POST   /v1/accounting/source-connections/:id/resume
DELETE /v1/accounting/source-connections/:id           # unlink one org with provider-specific tenant-disconnect semantics; keep local books

POST   /v1/accounting/source-connections/:id/replicas  # create a fresh browser replica; never restore an old ID

POST   /v1/accounting/source-connections/:id/sync-runs # acquire server lease and monotonic fence
POST   /v1/accounting/sync-runs/:id/lease              # renew only the current fenced lease
POST   /v1/accounting/sync-runs/:id/pages/:dataset     # current fence; private, no-store page plus API-bound manifest
POST   /v1/accounting/sync-runs/:id/acknowledgements   # current fence; idempotent exact-manifest acknowledgement
POST   /v1/accounting/sync-runs/:id/complete           # current fence; recheck dirty generation, then promote coverage
POST   /v1/accounting/sync-runs/:id/cancel             # exact fence/local replica; cleanup remains open under stops

POST   /v1/accounting/webhooks/:provider               # signed provider calls only
```

The callback redirects to a clean frontend URL after atomically consuming the nonce and code; it
never renders a page that loads third-party scripts while the code remains in browser history. The
organisation selection view expires quickly and creates no durable organisation until selection.
The sync page endpoint returns provider records only to the owning full session, sets
`Cache-Control: private, no-store` and never returns the provider token.

Pause, one-organisation disconnect, whole-grant revocation and local erasure are different
operations. Whole-grant revocation shows its blast radius and transitions every linked source
connection; one-organisation disconnect follows that provider's tenant-removal rules without
pretending a broad grant was revoked.

Future write and migration routes live under a separately disabled `/v1/accounting/writes` surface.
They do not appear until the writer contract, outbox and verification states are implemented.

## Shared connector test contract

Every provider adapter must pass the same deterministic suite:

- OAuth nonce expiry, atomic consumption/replay, exact callback, PKCE where supported, scope change
  and refresh-token race tests;
- account, selected-organisation and browser-replica isolation; unselected practice-client lists
  expire and are not retained;
- deliberate organisation/entity and replica-local ledger selection with stable source identity;
- a restored or new browser gets a fresh replica and initial comparison, never another device's
  committed coverage;
- browser locking plus the authoritative server lease; stale-tab fencing after expiry/takeover;
  offline resume; IndexedDB quota/eviction and independent attachment failure;
- pagination, overlap, replay, changed versions, explicit deletions and partial-list absence;
- page-manifest tampering, wrong sequence/count/digest/cursor/fence, expiry, idempotent
  acknowledgement, partial-run resume and whole-run checkpoint promotion;
- webhook signature failure, raw-body disposal, duplicates, reordering, omission, per-replica dirty
  watermarks, mid-run arrival, off-switch suppression and repair;
- deterministic raw→normalized golden fixtures with mapper-version changes;
- missing permission, plan limits, partial/degraded capability observations and exact recovery;
- source-change conflicts and stale sync; unavailable provider reconciliation passes only with
  fresh independent evidence and an explicit human check;
- one-organisation disconnect, whole-grant blast radius, local-data preservation and separate
  erasure;
- every off-switch during each state, proving incomplete work cannot advance a checkpoint;
- local IndexedDB schema migration, export, restore and source-history preservation;
- later write idempotency, provider concurrency/version conflict, partial failure and
  `outcome-unknown` resolution to applied, not applied or manual review.

Provider sandbox smoke tests sit outside deterministic CI, use synthetic data and have a bounded
manual trigger. No test suite touches a real customer organisation.

## One HMRC gateway, small tax modules

Shared gateway work belongs in one place:

- OAuth and encrypted rotating tokens;
- explicit reauthorisation health: HMRC refresh tokens stop working after 18 months, so expiry is
  a dated state with an early recovery path, not a surprise at filing time;
- user, main-agent and supporting-agent authority;
- fraud-prevention headers;
- API-version registry;
- a durable application-wide rate limit and submission outbox;
- correlation IDs, errors and recovery classes.

Tax-specific work stays in regime adapters:

| Module | Interface | TaxSorted state on 2026-08-01 |
|---|---|---|
| VAT | HMRC MTD VAT REST API | Sandbox path exists. Starter Books does not yet derive a VAT return. No production-filing claim. |
| Income Tax | HMRC MTD Income Tax REST APIs | Sandbox status, obligations, business discovery, cumulative quarterly updates, narrow in-year calculation and receipts exist. Year-end adjustments, other income, final declaration and account/payment follow-through do not. |
| Self Assessment Assist | HMRC Assist REST API | A separate future advisory module. It can return tailored official warnings, actions and GOV.UK links; it does not become TaxSorted's tax decision or a filing gate by itself. |
| VAT Assist | HMRC Assist REST API | Separate future advisory module documented by HMRC for availability from April 2027. It must remain distinct from the VAT submit action. |
| Corporation Tax | HMRC legacy XML plus accounts/computation attachments | Separate future adapter; it is not an MTD REST module. |
| PAYE | HMRC RTI XML | Separate future payroll product; it is not an accounting-provider toggle. |

Every module follows the same visible states:

```text
draft → validated → explained → approved → declared → submitting
      → accepted | rejected | outcome-unknown
      → obligation checked → liability checked → payment checked
      → corrected where needed
```

An HTTP success is not proof that a liability is settled. The product checks the later HMRC
account state and keeps `marked_as_filed_elsewhere` separate from HMRC acceptance.

TaxSorted can be legitimate bridging software only if the source-to-return journey remains a
digital link. CSV import/export and API transfer can form that link; copying figures by hand from
one product to another cannot. Preserve the imported source, mapping and prepared snapshot so the
person can inspect the digital journey rather than trusting a total with no trail.

## The actual user flow

1. **Choose the record source.** CSV is open now. A person without the chosen provider uses its
   official signup, then returns; TaxSorted never claims that redirect created an integration.
2. **Sign in fully.** Provider grants require the TaxSorted passkey-backed account and may not be
   created from an anonymous or recovery-only session.
3. **Understand and consent.** Show the exact read access, data custody and blind spots before the
   provider OAuth redirect.
4. **Choose and bind the organisation.** Verify legal name, identifier, currency and provider
   settings, then ask the person to confirm the TaxSorted tax basis and deliberately link the
   organisation to one entity and local ledger. Never infer it from connection order.
5. **Show the sync.** Date range, objects read, additions, changes, omissions and last complete
   sync are visible before review.
6. **Resolve one queue.** Unknown category, unexplained bank item, duplicate, conflict, missing
   evidence, unusual value, late item and unmapped tax code sit together.
7. **Reconcile.** Match source balances and state what the connector cannot see. This is a filing
   gate, not a green icon earned by OAuth.
8. **Refresh the filing period.** Repair missed changes, capture capabilities and freeze a
   readiness snapshot for the browser replica.
9. **Connect one HMRC module.** VAT and Income Tax hold separate scopes and may be disconnected
   separately.
10. **Start from HMRC's obligation.** Use its period and open/fulfilled state; do not invent a
   filing period from accounting-provider UI state.
11. **Explain the return.** Total → mapped accounts → reviewed events → evidence → plain reason →
   current official guidance.
12. **Preflight.** Blockers and warnings are different. Show source freshness and API blind spots.
13. **Freeze and approve.** Save the exact figures, evidence map, declaration wording, approver
    and time.
14. **Submit and receipt.** Keep pending, accepted, rejected and outcome-unknown distinct. Never
    invite a blind retry.
15. **Finish the money loop.** Show the amount and due date, use HMRC's payment door, then check
    liability and payment state later.
16. **Correct without erasing.** Link a cumulative resubmission, amendment or next-period
    adjustment to the filed snapshot it corrects.

## Official HMRC and GOV.UK starting points

Public filing guidance comes first; the developer material below it is for building and operating
the separate HMRC modules.

- [Use Making Tax Digital for Income Tax](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax)
- [Making Tax Digital for VAT](https://www.gov.uk/government/collections/making-tax-digital-for-vat)
- [Create digital records](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records)
- [Send cumulative quarterly updates](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates)
- [Make year-end adjustments](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/adjust-your-self-employment-and-property-income)
- [Submit the tax return](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/submit-your-tax-return)
- [Pay a Self Assessment tax bill](https://www.gov.uk/pay-self-assessment-tax-bill)
- [Correct a Self Assessment tax return](https://www.gov.uk/self-assessment-tax-returns/corrections)
- [VAT digital records and digital links](https://www.gov.uk/government/publications/vat-notice-70022-making-tax-digital-for-vat)
- [Tasks that remain outside MTD Income Tax software](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/tasks-outside-mtd-software.html)
- [MTD Income Tax end-to-end developer guide](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/)
- [MTD Income Tax minimum functionality](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/how-to-integrate.html)
- [HMRC OAuth for user-restricted endpoints](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints)
- [HMRC web-app-via-server fraud headers](https://developer.service.hmrc.gov.uk/guides/fraud-prevention/connection-method/web-app-via-server/)
- [HMRC Self Assessment Assist API](https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/self-assessment-assist/1.0)
- [HMRC VAT Assist integration guidance](https://developer.service.hmrc.gov.uk/guides/vat-mtd-end-to-end-service-guide/documentation/hints.html)
- [HMRC user authorisation and 18-month refresh-token lifetime](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints)

## Delivery order

1. Keep CSV as the first source adapter. **Versioned Books backup/restore is implemented**;
   CSV remains a record import/export, not a complete-history restore file.
2. Upgrade local books for provider origins, opaque revisions, raw/normalized versions, attachment
   custody, explicit conflict resolution, fresh-on-restore replica IDs, storage-failure recovery
   and export/restore.
3. Finish separate-ledger selection plus reconciliation and completeness gates. Mixed businesses
   or unsupported currencies stay blocked, not guessed into one ledger.
4. Build the shared authorisation/organisation/source-connection model, encrypted versioned token
   vault, temporary organisation selection, capability observations, page manifests, staged and
   committed replica checkpoints, tab locking and all off-switches. **The synthetic sync proof and
   closed Xero authorisation/token-custody pilot implement parts of this foundation; they do not
   establish complete provider ingestion.**
5. Put public privacy/terms/support pages, retention and deletion rules, one-organisation
   disconnect, whole-grant/account deletion and the tested incident process in the shared
   foundation before a real customer organisation connects.
6. Prove page/commit/manifest acknowledgement and repair with a made-up adapter and the shared
   conformance suite before any provider credential enters the system. **The deterministic
   foreground proof now renews its lease, preserves provider-neutral 0:n normalisation, rejects
   unsafe page/record budgets before local commit and promotes only whole-run checkpoints. Active
   partial-run resume, authoritative server budgets and webhook repair remain future work.**
7. Run a five-connection Xero technical pilot with read-only granular scopes, foreground sync and
   synthetic, demo or developer-owned data. **The implemented pilot currently stops at
   authorisation and organisation binding; the financial reader and foreground sync remain to
   build.** No App Store or filing-readiness claim.
8. Add Xero webhook hints, incremental polling, missed-event repair, filing-time refresh, rate and
   egress monitoring, then admit a bounded private beta only after step 5 is verified.
9. Add a FreeAgent single-company driver and QuickBooks direct connections through the same
   contract. For QuickBooks, add multi-`realmId` isolation, webhooks plus CDC repair and its
   production assessment.
10. Build `Workspace`, `Principal` and `ClientAuthority` plus per-client local-store/export
    isolation before FreeAgent Practice or QuickBooks Accountant Ready. Keep HMRC authority
    separate.
11. Add Sage Accounting UK only with explicit plan/country/role coverage.
12. Ship reviewed migration packs before direct writes. Build the separate writer/outbox/read-back
    system only after exports and read-only comparison prove demand.
13. Complete Income Tax year-end/account/payment modules and derive VAT from reviewed books before
    any provider path can support a production-filing claim.
14. Consider an opt-in shared cloud-books replica only as a separate custody product, never as a
    silent connector upgrade.

Each step works alone. Each external connector has its own off-switch. Nothing reaches production
because a card says “connected”.
