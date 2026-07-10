# Method — how the UK public-funding map is built

**Last reviewed:** 10 July 2026  
**Status:** Coverage-first editorial and publication method  
**Scope:** UK public health, education and related next-generation programmes, with deeper England coverage

This method protects the meaning of the map. It is deliberately stricter than
“copy every public spreadsheet”. A figure enters only with enough context to
say what it is, whose boundary it covers, which period it belongs to and what
the source does not prove.

The method has three promises:

1. pooled revenue will not be turned into a fictional tax-to-provider trail;
2. plans, legal authority, allocations, payments and actual spend will not be
   blurred together; and
3. institutional transparency will not become a bulk people dossier.

## The unit of publication

The map publishes small, sourced claims rather than one large story. Its
collections are:

- `sources`;
- `institutions`;
- `governanceUnits`;
- `offices`;
- `relationships`;
- `funds`;
- `programmes`;
- `fundingMechanisms`;
- `allocations`;
- `contacts`;
- `officeLocations`;
- `pipelineStages`; and
- `transparencyGaps`.

An institution is not a programme. A programme is not an allocation. A
funding mechanism is not a payment. An office is not the person who holds it.
Keeping these apart makes later corrections local and visible.

## Source admission

The first pass uses current official primary material only:

1. enacted legislation and official parliamentary Supply records;
2. official Estimates, budgets and financial directions;
3. audited accounts and official statistics;
4. official allocation tables, grant conditions, formulas, contracts and
   scheme rules;
5. official registers, organograms, board pages, minutes and committee pages;
6. regulator, inspector, audit and parliamentary-scrutiny publications; and
7. official service and contact pages for the operational route.

Search results, press reporting, think-tank analysis and commercial databases
can reveal a source but do not become the authority for a record. A government
press release can prove what was announced. It cannot by itself prove enacted
authority, a payment or outturn.

Each source record should carry:

- a stable source ID;
- title, publisher and direct URL;
- publication, update and observation dates where available;
- jurisdictions and the source's authority class;
- the exact claims or fields it supports;
- a `doesNotProve` statement;
- reuse and attribution notes; and
- replacement, withdrawal or conflict status.

A PDF page, table, section, spreadsheet tab or page heading is recorded as the
locator when the source permits it. A landing page alone is not enough when the
claim comes from a particular table.

## Revenue and borrowing

The default model is:

```text
tax and other receipts → Consolidated Fund
borrowing → finances the overall gap and supports government cash
Parliament → authority through Supply
HM Treasury → control and cash issue
department or devolved government → later funding choices
```

The map does not allocate a percentage of an individual's income tax, VAT or
corporation tax to health or education. Government accounts do not support that
trace.

National Insurance contributions receive a narrow exception in the graph only
for the statutory NHS allocation. The record must still explain that the
allocation joins total NHS funding and cannot be followed to a named service or
provider.

Barnett consequentials are represented as block-grant changes. The formula does
not decide the devolved government's health or education allocation. A later
devolved budget decision needs its own record and source.

Every allocation includes a plain `traceabilityWarning`. Typical warnings are:

- pooled revenue cannot be traced to this allocation;
- this is a block grant and is not ring-fenced to the comparable programme;
- this is a formula allocation, not proof of payment;
- this is payment administration, not commissioning authority; or
- this is audited group outturn, not provider-level cash spend.

## Classifying money correctly

### Budget

A budget is a plan for a named boundary and period. Spending Review totals,
national budgets and departmental settlements normally enter with status
`plan` or `forecast`, according to the source. A budget headline is not copied
without its inclusions, exclusions and price basis.

### Estimate

An Estimate is a request to Parliament for resource, capital and cash. It is
not labelled `authorised` until the relevant Supply and Appropriation
legislation creates that authority. Where a current Estimate is useful before
enactment, it is a plan-stage source or pipeline record and says so visibly.

A Vote on Account, Main Estimate and Supplementary Estimate are separate
events. A later instrument does not silently rewrite the earlier record.

### Authorisation

`authorised` means the cited law, direction or other applicable instrument has
created or lawfully assigned the stated limit. It does not mean the full amount
was allocated or spent.

### Allocation

An allocation assigns an amount to a body, place, programme or formula. Initial
and revised allocations are different states. A formula's illustrative or
notional output is not called a final allocation.

### Payment

A payment is admitted only when an official cash, transaction or settlement
record proves it. Contract value, grant maximum, loan-book value, invoice and
allocation are not payment substitutes.

The coverage-first schema does not yet publish a separate payment collection.
Payment routes can be described in `pipelineStages` and
`fundingMechanisms`, but a payment amount must not be placed in `allocations`
merely to fill that gap. A later payment collection needs its own admission,
privacy, retention and reconciliation review.

### Outturn

`outturn` is admitted from an audited account or an official final return. It
retains that publication's accounting and consolidation boundary. Provisional
or first-release statistics say that they are provisional. An outturn can be
actual on an accrual basis without being a list of cash payments.

## Required allocation context

Amounts are integer GBP minor units in `amountMinor`; floating-point pounds are
not used. Each allocation also records:

- `financialYear`;
- `status`: `forecast`, `plan`, `authorised`, `revised` or `outturn`;
- `budgetBoundary`;
- `accountingBasis`: `cash`, `accrual`, `mixed` or `not-stated`;
- `grossOrNet`: `gross`, `net` or `not-stated`;
- `priceBasis`: `nominal`, `real` or `not-stated`;
- an `asOf` date;
- the source IDs; and
- the `traceabilityWarning`.

Where relevant it also records resource or capital, DEL or AME, ring-fencing,
formula status, containment, additive status and comparability notes. If the
source does not state an accounting or price basis, the value is
`not-stated`; the editor does not infer it from the publisher.

Negative amounts are admitted only when the source and field explain the
meaning, such as income, repayment, transfer or netting. A minus sign is never
silently described as lower spending.

## Period rules

The government's financial year and an education academic year are separate
time boundaries.

- Financial years are displayed as `FY 2026-27` and use 1 April to 31 March.
- Academic years are displayed as `AY 2026/27` and retain the scheme's own
  stated dates or label.
- Multi-year settlements keep their start and end years and are not repeated
  as if the full amount applied in each year.
- A calendar-year or tax-year amount keeps that period instead of being
  squeezed into a financial year.

The present `allocations` collection admits an amount only when an official
source anchors it to the recorded financial year. An academic-year-only amount
may support the programme or mechanism map, but it remains outside the
financial-year allocation collection until an official bridge or a separately
reviewed period shape exists. The missing bridge becomes a transparency gap.

If an official source supplies a financial-year profile for an academic-year
award, that profile can be entered directly. An editor-created pro-rata split
must state the formula, inputs and limitations and cannot be presented as an
official allocation.

## Preventing double counting

Containment is explicit. For example:

- a departmental total may contain an NHS England limit;
- an NHS England allocation may contain an integrated care board allocation;
- the Dedicated Schools Grant contains four blocks;
- an academy payment route may start with recoupment from a local-authority
  schools allocation;
- student-loan capital can appear within a departmental total; and
- a devolved portfolio total can sit alongside a local-government settlement
  that also supports education or care.

Child records may point to a parent boundary. The record then states whether
the amount is additive, non-additive, partly overlapping or not yet known. A
user request for a total must use only components proved non-overlapping within
the same period, status, basis and price boundary.

The following are never silently added:

- plan and outturn;
- resource and capital;
- gross and net;
- financial and academic years;
- national and provider subsets;
- grant and loan-book measures;
- allocation and payment; or
- a block grant and the devolved spending financed partly from it.

## Funding mechanisms

The map uses the narrowest supported mechanism. Principal classes include:

- parliamentary authority;
- block grant;
- grant-in-aid;
- ring-fenced or non-ring-fenced grant;
- formula allocation;
- discretionary or competitive grant;
- contract or commissioned service;
- loan and loan repayment;
- levy and account credit;
- pooled budget; and
- capital or financial transaction.

The legal authority, formula, conditions and payment administrator are separate
attributes or relationships. “Funds” does not automatically mean “controls”,
“owns”, “commissions” or “directs operationally”.

A contract award proves the award described by the official notice. It does not
prove payment, performance or influence. A grant condition proves a condition,
not that every recipient complied with it.

## Relationships and governance

Relationships use exact verbs. Examples include:

- authorises spending for;
- sets a financial limit for;
- sponsors;
- allocates to;
- delegates commissioning to;
- commissions from;
- administers payment for;
- pools money with;
- regulates;
- inspects;
- audits;
- appoints;
- scrutinises; and
- accounts or reports to.

Every edge records its jurisdiction, effective dates, source and a negative
constraint where confusion is likely. Sponsorship is not operational command.
Inspection is not funding control. Appointment is not daily direction. A local
authority can fund or commission a provider without owning it.

Boards, panels and committees are `governanceUnits`. Their remit, parent body,
statutory or advisory status, decision or recommendation power, official
membership page, minutes and interests page can be recorded. Collective power
belongs to the unit; it is not copied to each member.

When a unit closes, merges or is replaced, the old record receives an end date
and a typed successor link. It is not left current because its old GOV.UK page
still resolves.

## Four nations, four systems

Every institution, programme, mechanism and allocation carries its applicable
jurisdiction. `UK` is used only when the source truly has UK-wide scope.

- England maps DHSC, NHS England, integrated care boards, local authorities,
  DfE, OfS, SLC, DSIT, UKRI and direct/provider routes.
- Scotland maps the Scottish budget, NHS boards, integration authorities,
  councils, Scottish Funding Council, Education Scotland, SAAS and providers.
- Wales maps the Welsh budget, local health boards, NHS trusts and special
  health authorities, the Joint Commissioning Committee, councils, Medr,
  student support and providers.
- Northern Ireland maps the Executive and Votes, Departments of Health,
  Education and Economy, SPPG, health and social-care trusts, the Education
  Authority, FE and HE institutions, and student-finance delivery.

A similar label does not create equivalence. An English integrated care board,
Scottish integration joint board, Welsh local health board and Northern Irish
health and social-care trust have different legal and operational roles.

Devolved headline budgets are not ranked against each other without matching
scope, population, accounting basis, price basis, period and service boundary.
If those checks fail, comparability is `not-comparable` with a reason.

## England first, coverage before depth

The first release aims to include the main funding spine and provider classes
for each lane before attempting every provider-level record.

England depth order is:

1. Treasury and parliamentary authority;
2. DHSC, DfE, DWP and DSIT departmental boundaries;
3. NHS England, local-authority, OfS, SLC and UKRI funding routes;
4. integrated care, public-health, early-years, schools, SEND/high needs,
   16-to-19, adult skills, apprenticeships, HE and research mechanisms;
5. national and local governance units;
6. provider classes and stable identifier bridges; and then
7. provider allocations, payments and outturn where official records support
   each step.

Depth follows the formal power and money path, not fame or search popularity.
An omitted local record means “not mapped yet”, not “does not exist”.

## Provider identity

Classifying a provider and proving a funding relationship are separate acts.
The map can describe a provider class before it names every provider.

Named organisations require a stable official identifier where one exists.
Candidate bridges include:

- ODS and other official health-organisation codes;
- local-authority codes;
- GIAS URNs and academy-trust identifiers;
- UKPRNs;
- OfS or HESA provider identifiers;
- Companies House and charity numbers; and
- official research-organisation identifiers.

An exact identifier match can support a join after dates and legal form are
checked. A display-name match is only a review candidate. Similar names,
trading names, reorganisations and shared addresses do not prove identity.

Named private, charitable or social-enterprise providers need an official
contract, grant, regulatory or allocation source. Sole traders, partnerships
and small primary-care contractors can carry personal-data risk and require a
separate publication decision; they are not assumed organisation-only.

A provider site, legal entity and group parent are different records when the
source distinguishes them.

## Next-generation population scope

`programmes.populationScope` is a plain aggregate description of the intended
or stated beneficiary population. It is not a list of people and does not
contain patient, pupil or student identifiers.

The description comes from the official programme purpose. TaxSorted does not
infer age, disability, care experience, income or another characteristic from
an institution or postcode.

Population scopes are non-exclusive discovery labels. They do not make amounts
additive. A total for “the next generation” is published only when:

1. an official source defines that total and boundary; or
2. every component has the same time and accounting basis, non-overlap is
   proved, and the derivation is published.

Otherwise the interface lists relevant programmes and says that no supported
total exists. A missing total is more truthful than an impressive double count.

## Offices, personnel and contacts

`offices` describe formal roles, powers and accountability. They do not contain
the current holder's name. Where current leadership matters, an office may use:

```text
currentHolderPublication:
  mode: official-source-link-only
  url: the institution's own current page
  asOf: the date checked
  reason: why current leadership is relevant to this office
```

The open JSON does not copy biographies, career histories, portraits, direct
emails or a changing roster of board members. An official biography can be
read at the linked institution; TaxSorted does not turn it into a permanent
profile. This prevents a coverage map from drifting into bulk personnel
tracking.

Contacts must be public institutional routes needed to understand, question or
use the service:

- switchboard;
- shared programme mailbox;
- contact form;
- FOI route;
- complaints route; or
- official public office.

Every contact has `functionalOnly: true`. Email addresses are never inferred.
Every office location has `residential: false`. Home addresses, personal phone
numbers, personal social accounts, junior staff directories and individual
work patterns are excluded.

## Collection and publication pipeline

The route does not scrape an upstream website during an API request.

```text
allowlisted official source
  → bounded retrieval
  → authority and reuse classification
  → smallest useful claim
  → period, money and jurisdiction normalisation
  → stable identity and relationship review
  → source locator + observation date
  → containment, comparability and privacy checks
  → human review of the prose and diff
  → immutable snapshot
  → validated snapshot loaded by the service
```

The stages are:

1. **Choose the source.** Record why it is authoritative for this claim.
2. **Retrieve narrowly.** Keep the table, page or fields needed; do not mirror
   an entire site by default.
3. **State the claim.** Write what the source supports and what it does not.
4. **Normalise cautiously.** Preserve the publisher's amount, period and
   accounting boundary before deriving anything.
5. **Resolve identity.** Prefer official IDs and effective dates.
6. **Attach evidence.** Point each material field or edge to its source and
   locator.
7. **Check overlap.** Mark containment and comparability before offering totals.
8. **Check people and rights.** Remove unnecessary personal fields and verify
   reuse terms.
9. **Validate.** Reject missing references, duplicate IDs, impossible dates,
   unsupported enum values and unsafe contacts.
10. **Read the diff as prose.** A valid shape can still claim the wrong thing.
11. **Publish atomically.** A failed update leaves the prior reviewed snapshot
    available.
12. **Expose gaps.** Uncertainty is a record, not an empty-space guess.

## Derived records and joins

A derived record names its input source IDs, method version and calculation.
It is labelled `derived`; it never inherits the authority class of the source.

Permitted early derivations include:

- exact sums of published rows within one stated total and boundary;
- identity crosswalks based on exact official identifiers; and
- simple date or minor-unit normalisation that preserves the original value.

They still need reconciliation to the publisher's control total where one
exists. Rounding differences and suppressed rows are recorded.

Not permitted without separate evidence:

- tax-to-provider attribution;
- name-only entity merges;
- conversion of an allocation into a payment;
- causal claims from funding, meetings or contracts;
- inferred operational control from sponsorship;
- inferred beneficiary characteristics; or
- an additive total from overlapping population scopes.

## Validation rules

Before release, the data must pass checks for:

- unique, stable IDs;
- resolvable cross-collection references;
- a source for every material fact and relationship;
- integer minor-unit money;
- allowed allocation state and basis values;
- real dates and coherent effective ranges;
- no current relationship to a body after its supported closure date;
- no `authorised` label supported only by a proposal or Estimate;
- explicit FY/AY treatment;
- explicit containment and non-additive warnings;
- no private or inferred contact fields;
- no holder names in the open office records; and
- no silent source conflict.

Tests protect shape and common category errors. They cannot decide whether a
sentence overstates a source. Human review remains part of publication.

## Freshness and change detection

Review is triggered by an official update, not only a calendar:

- Supply, budgets, directions and allocations: at each official release or
  revision;
- current institutions, contacts and governance links: every 30 days while
  presented as current;
- programme rules and operational guidance: every 90 days or on announced
  change;
- audited accounts and annual statistics: at each annual publication; and
- legislation and structural reforms: at commencement, amendment or a
  supported operative decision.

`asOf` means when the source state was checked. It is not a promise that the
source remains unchanged. A review alarm does not make a lawful programme
expire. If a current fact becomes stale, retain its last-supported date and add
a gap rather than presenting it as freshly verified.

Announcements of future reorganisation enter as proposals or future pipeline
stages. The current graph changes only when the applicable official evidence
supports the effective change.

## Source conflicts

When official sources disagree:

1. retain both source records;
2. identify the exact disputed field, boundary and date;
3. prefer enacted law for legal authority;
4. prefer the current scheme-specific source for operational detail while
   checking it against law and accounts;
5. create a `transparencyGaps` record; and
6. withhold a total or deterministic claim until the conflict is resolved.

A newer publication does not erase the fact that an older value governed an
earlier period.

## Versioning and releases

Record IDs are opaque and are not based on array position or display order.
They are never deliberately recycled.

- An additive optional field can remain within a schema major after review.
- Removing a field, changing its type, unit, meaning, primary key or
  nullability is a breaking change.
- Changing an amount or office because an official source changed creates a
  new snapshot and effective state; it does not require a schema major.
- Each release should publish its schema version, dataset version, observation
  date, record counts and exact-byte checksum.
- Superseded records keep their identity and replacement link.
- Removed records receive a tombstone with the date and reason.

The project still needs an immutable public release and tombstone ledger before
an outsider can fully audit the non-reuse promise across all releases. Until
then that limitation remains a named gap.

## Corrections

A correction should identify:

- dataset and record ID;
- disputed field;
- source or evidence;
- whether the problem is fact, date, identity, boundary, interpretation,
  privacy or reuse rights; and
- whether urgent serving restriction is needed.

The reviewer checks the official source, records the decision, supersedes or
tombstones the record, reruns validation and publishes a new snapshot. A
correction does not rewrite a historical source to match today's structure.

Ordinary non-sensitive corrections can use the public repository issue
tracker. Private, personal or safety-sensitive information must not be posted
there. A complete confidential intake is not yet live; this is a production
gap, especially for any future dataset that increases personal-data risk.

A publication off-switch is a bounded hosting and review control. It does not
make committed repository data confidential and cannot recall copies already
downloaded. Unsafe or unapproved data must not enter the public static corpus.

## Reuse and attribution

TaxSorted's schema, field names and original summaries are one layer. The
official material described by them is another. TaxSorted does not relicense
Parliament, a government, regulator, NHS body or other publisher.

For every source:

- record the known licence or reuse statement;
- keep attribution and source links with extracted facts;
- use link-first publication where replication rights are unresolved;
- do not copy logos, portraits or wholesale documents; and
- do not treat public access as permission to republish every field in bulk.

Reusers should retain stable record IDs, source IDs, dates, attribution,
method version and limitations. The base dataset bytes approved for publication
are intended to be open without an account, but upstream rights remain
source-specific. See the
[draft public data design charter](../../../docs/PUBLIC-DATA-CHARTER.md) for the
project-wide boundary.

## Known method and coverage gaps

- The corpus is coverage-first. Local and provider-level completeness is not
  claimed.
- There is no separate reviewed payment collection yet.
- Academic-year-only allocations need a future period shape or official
  financial-year bridge before they can join financial-year totals.
- Cross-nation comparability remains limited by different service,
  consolidation and accounting boundaries.
- Current-year authority, allocations and plans are ahead of audited outturn.
- Some official tables lack stable provider identifiers or clean successor
  links.
- Provider contracts, payments, activity and outcomes are not yet one joined
  chain.
- Programme population scopes overlap and cannot support an additive
  next-generation total by themselves.
- Exact field-level reuse terms remain unresolved for some sources.
- Current-holder and governance pages can change without an archive or machine
  feed.
- The public release/tombstone history and confidential correction route are
  not complete.

These gaps are part of the product. “Unknown”, “not comparable” and “not yet
mapped” are useful answers when the official record cannot support a stronger
one.
