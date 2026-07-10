# Method — UK charities bounded v1

**Reviewed:** 10 July 2026
**Status:** operational method for the human guide; organisation mirror not admitted

## Purpose

Help a person understand the UK charity system, verify an organisation at the official
source, read finance without misleading comparisons, understand conditional tax relief and
reach an organisation through a public service route.

The method is designed to expose institutions and rules without turning public registers
into a permanent people directory.

## Collection path

```text
allowlisted primary public source
  → identify the jurisdiction and exact claim
  → classify law, regulator guidance, register fact or organisation self-report
  → record what the source supports and what it does not prove
  → remove fields not needed for the public purpose
  → review rights, freshness, personal-data and safety boundaries
  → attach a direct source link and review date
  → publish the smallest useful TaxSorted explanation
```

The request path does not scrape an upstream register. The human page is static and makes
no remote request. Official sources remain the current identity and filing record.

## Accountability contract — method before collection

The accountability API publishes a framework and structural schema with status
`schema-only-not-admitted`. It contains no organisation evidence rows. Publishing the method
first lets another builder test the shape without treating a public source as automatic
permission to ingest it.

The planned stable collection order is:

```text
organisations → identifierMappings → documents → voices → claims → programmes
→ fundingEvents → financialFacts → assetAggregates → controlRelations
→ observations → outcomes → evaluations → comparisons → coverageGaps
→ tombstones → releases
```

Record and candidate-release IDs are 1–100 lowercase ASCII letters, digits and
hyphens. Within an immutable candidate release they
sort by ID in bytewise ascending order. Cursors bind to the release; they do not drift into a
new release. IDs must be opaque or non-personal and human-reviewed. Removed IDs remain in
tombstones and cannot be silently recycled. Tombstone, target, replacement and release IDs
receive their own retained-identifier review. A tombstone's `releaseId` names the first candidate
that carries it, and its effective time cannot postdate that candidate's assembly. It remains in
every later candidate, whose tombstone count must equal the cumulative retained ledger. Every
release records `candidateAssembledAt`, and
all releases must form one predecessor chain leading from the current release, in nondecreasing
assembly time. Records and reviews cannot postdate current candidate assembly or dataset
generation. The release change summary receives a privacy review and cannot repeat removed or
sensitive content. The current release carries a verified SHA-256 digest
of canonical UTF-8 dataset bytes with only that release's own `datasetDigest` value omitted;
the exact algorithm and preimage rule travel with the release. That check detects mutation of
the declared bytes; it proves neither source rights nor publication approval.

A future source path is narrower than admitting a website:

```text
exact source asset
  → rights, safety and field review
  → separate link and locator-specific derived-use decisions
  → permanence mode + review expiry + mutation-integrity review digest
  → exact published organisation identifier mapping
  → faithful paraphrase or organisation-only derived record with provenance and review
  → human-reviewed comparison or explicit coverage gap
  → immutable release record and counts
```

Documents remain link-only. Reviewed document metadata plus bounded public source-review
declarations and notes may be stored; source bodies, excerpts, images and attachments are not.
Every derived source use must match an approved use type
and locator. The document says whether only a current publisher URL, a publisher version/digest
or a lawful archive link is known; its review must remain unexpired at candidate generation.
Locators are human-reviewed source pointers, not mechanically resolved anchors, semantic proof
or a source archive. Every public document/source-review field—including permanence text, review
IDs, attribution, terms URLs, limitations, locators and bounded notes—is reviewed to exclude
people, contacts, addresses, named pay, personal belief detail or belief inference about a person,
and a copied source body or excerpt; locators must be pointers, not quotations. The publisher is
the place to read its words as available at review time.
A derived record's privacy review is a human
assertion that natural-person data, contacts, addresses, named pay and personal belief data are
absent, that no belief inference occurred, and that the join used exact published identifiers;
the validator cannot semantically prove those free-text claims.

Programmes, observations, outcomes, evaluations and every financial fact always need a
statistical-disclosure review. Anonymous or aggregate funding needs one too; an exact
organisation-to-organisation funding event does not. Review distinguishes
people-derived aggregates from genuinely organisation-only values. `aggregate-public-donations`,
`staff-costs-aggregate`, `remuneration-bands-aggregate` and
`trustee-remuneration-aggregate` are always people-derived, with a stated smallest cell and
reviewed-safe decision. If the population basis is unknown or the cell is unsafe, omit the
value-bearing row and publish a `suppressed-for-disclosure-risk` coverage gap with fixed safe
wording and no source-document pointer instead.

Source admission follows retrieval and normalisation follows source readiness. Statistical
disclosure review follows the record and any evaluation normalisation it approves; the final
privacy review follows that disclosure review so it sees the review's public limitations text.
Comparison review waits for both records, and comparison privacy review also follows its result
disclosure review.

## Source order

Use the narrowest source that can support the claim:

1. enacted legislation for legal powers, duties and tax rules;
2. the relevant territorial charity regulator for registration, filing and governance;
3. HMRC for charity tax recognition, relief and trading treatment;
4. an official register for one organisation's identity and filed record;
5. filed accounts and annual reports for dated finance and activity claims;
6. the organisation's own site for its current service and contact description.

An organisation's account of its work is a self-report. A regulator entry proves what the
register records, not service quality. Filed expenditure does not prove impact. A funding
award does not prove payment, delivery, endorsement or control.

## Jurisdiction rule

England and Wales, Scotland and Northern Ireland have separate charity registers and
regulators. Do not silently apply one jurisdiction's threshold, return, legal form or
enforcement route to another.

Absence from one search result is not proof that an organisation is not charitable. The
reader must consider the jurisdiction, official identifier, exempt or excepted status and
the regulator's current registration rules.

## Identity rule

- Prefer the exact official charity number over a name.
- Treat a registered legal entity, public-facing brand and trading subsidiary as separate
  until an official identifier or reviewed filing connects them.
- Never join organisations by a similar name, address, website domain or trustee.
- A changed name does not create a new entity.
- A removed identifier must not be reassigned to a different entity.

The first release links to registers rather than creating local organisation IDs. A later
mirror needs permanent IDs, exact identifier mappings, releases and tombstones from its first
public version.

The accountability schema makes that requirement stricter. `exact-published-identifier` is
the only organisation mapping method and privacy review records
`exact-published-identifier-only`. A missing exact identifier becomes a coverage gap; it is not
permission to try a similar name, address, domain, trustee or probabilistic match.

If one organisation has several official identifiers, explicit `identifierBridges` must connect
every mapping. Each bridge needs an admitted locator that publishes both IDs and a human review
of that assertion. A general privacy declaration does not establish the bridge.

## Finance rule

Keep these measures separate and dated:

- income;
- expenditure;
- assets and liabilities;
- restricted, designated and unrestricted funds;
- reserves policy;
- staff cost, employee count and published pay bands;
- grant or contract award, payment and expenditure;
- charity-only and consolidated group accounts.

Money needs a currency, reporting period, accounting boundary and source precision. Do not
rank organisations by a number stripped of those facts. Do not derive a named person's pay
from an organisational disclosure.

For machine comparison, match organisation, scope key and metric key exactly. Match the period
too, except that an explicit `change-over-time` relation requires different periods while the
other dimensions remain aligned. Money
also needs the same currency, accounting basis, gross/net basis, VAT basis, price basis and
consolidation scope. Keep forecast, budget, commitment, payment, accrual, outturn, estimate and
restatement stages visible even where exact arithmetic is possible. Apart from the explicit
period exception, if the dimensions differ, record `not-comparable` and name the differences
rather than manufacturing a delta.

A derived financial fact is a recomputed `signed-sum-of-minor-unit-inputs`: at least two distinct
compatible facts, each with coefficient `-1` or `1`, and no cycles. A difference is right minus
left and must remain a safe integer. A ratio stores the exact right and left minor-unit values as
its numerator and non-zero denominator; it does not store a floating quotient. A derived
financial fact follows its inputs and reviews, then receives its own disclosure review. A numeric
comparison's disclosure review follows the referenced records and human comparison review. If
any input is people-derived, the result must be reviewed as people-derived too.

## Words, actions and comparison rule

- A `voice` records who is speaking and whether the voice is the subject organisation,
  regulator, auditor, funder, delivery partner, evaluator or TaxSorted editorial analysis.
- A `claim` stores a normalised statement and modality; verbatim source text is not copied.
- Funding events, finance facts, asset aggregates and organisation-to-organisation control
  relations describe distinct parts of the machinery.
- Observations record sourced activity or events. Outcomes record reported or measured change
  with attribution strength. Evaluations keep the evaluator, method, independence and limits.
- A coverage gap records what was not published, not collected, unavailable, unclear or
  deliberately bounded, including a value omitted for disclosure risk. A gap is not a negative
  finding, and a suppressed value must not remain in a value-bearing collection.

The TaxSorted-derived assertion is reserved for structured exact-arithmetic financial facts and
labelled TaxSorted source-comparison evaluations. A reported, audited or restated number cannot
use it; programmes, funding, assets, control, observations and outcomes stay externally
attributed.

A comparison references exact record IDs and exposes its context, dimension decision,
explanation, limitations and review state. The comparison context anchors the left record;
the four dimension decisions are recomputed from both referenced records. `not-comparable`
therefore preserves a real period, scope or metric mismatch instead of forcing false equality,
and `change-over-time` requires the same organisation, scope and metric across different
periods. `inconsistent-with` is admitted only after a human reviewer confirms the same exactly
identified organisation, period, scope and metric. When both records carry money, their money
basis, measurement stage and amount date must also match. A missing record, changed stage,
numerical difference or different source voice is not enough.

No comparison may become an honesty, trust, faith, efficiency, value-for-money or impact
score or leaderboard. The purpose is to make evidence challengeable, not to replace judgment
with a number.

## Tax rule

Do not label charities simply `tax-exempt`. Record the tax, qualifying income or activity,
conditions, exclusions, recognition requirement, relevant jurisdiction and review date.

Keep direct tax, VAT, business rates, PAYE and Gift Aid distinct. Keep a charity and its
trading subsidiary distinct. A policy explanation and the operative legal rule are separate
claims and may need different sources.

## Contact and help rule

The first release links to an official register and organisation website. If a later record
contains a contact route, admit only a generic public service form, switchboard, public help
line or role-based inbox deliberately published for that purpose.

Do not copy:

- a home or merely registered address;
- a named trustee's email or phone;
- a personal social account;
- a volunteer, donor, beneficiary, attendee or applicant contact;
- free text containing a case history or safeguarding detail.

Do not promise eligibility, availability or a response. Record what the organisation states,
when it was checked and where the person can confirm it.

## Religious-purpose rule

An official charitable-purpose category belongs to an organisation record. It is not a
statement about any person's belief. No person-to-religion join, denomination inference,
membership list or attendance record is permitted.

Named trustees and office-holders remain outside the bulk design even when an upstream
register displays them. A later purpose-bound named service would need its own legal basis,
necessity test, privacy notice, correction and objection process, confidential intake, human
approval and emergency stop.

## Freshness

Suggested review alarms, not promises that a fact remains correct until that date:

- current register and public contact doors: 30 days;
- organisation service descriptions: 90 days;
- tax and regulatory guidance: 90 days or on a known change;
- legislation and structural explanations: 180 days or on commencement/amendment;
- annual accounts and finance: after the next filed reporting period.

## Correction

A correction to TaxSorted's explanation and a correction to an official register are
different tasks. TaxSorted should link the official correction route and correct its own
mapping without pretending to amend the upstream record.

Public GitHub issues may receive ordinary factual corrections only. Private, personal,
safeguarding or safety-sensitive evidence requires a confidential intake before any local
organisation corpus can open.

That intake is a named immediate accountability blocker:
`confidential-correction-safety-intake`. It must support identity-safe triage, urgent
suppression and auditable resolution and must be tested before data admission. The second
blocker, `asset-level-rights-admission-digest`, requires a reviewed rights and safety decision
for every exact source asset, with separate link and locator-specific derived-use decisions. Its
content digest detects mutation of the review record; it does not certify the legal conclusion.
Neither blocker is resolved by publishing the schema, and resolving both is not sufficient.
All nine framework conditions must also be evidenced and approved: the blockers; controller,
lawful basis, retention and rights handling; a formal DPIA; source expiry and locator review; a
small territorial field set; exercised correction and rollback; calibrated comparison review;
public explanation of meaning and limits; and a monitored emergency stop.

Builders can run the runtime graph validator against the executable zero-row candidate from the
repository root:

```sh
npm run validate:charity-accountability-candidate --workspace api -- research/uk/charity-accountability/examples/zero-row-candidate.json
```

This local command checks candidate structure. It does not upload, ingest or publish data and
cannot satisfy an admission condition.

## Primary doors reviewed

- Charity Commission search: <https://www.gov.uk/find-charity-information>
- OSCR search: <https://www.oscr.org.uk/about-charities/search-the-register/>
- CCNI register guidance: <https://www.charitycommissionni.org.uk/start-up-a-charity/register-of-charities/>
- HMRC charity tax overview: <https://www.gov.uk/charities-and-tax>
- HMRC and Charity Commission trading overview: <https://www.gov.uk/guidance/charities-and-trading>
- Charity structure guide: <https://www.gov.uk/guidance/charity-types-how-to-choose-a-structure-cc22a>
- England and Wales reporting collection: <https://www.gov.uk/government/collections/charity-accounts-financial-reporting-and-tax>
- Charity complaint routes: <https://www.gov.uk/complain-about-charity>
