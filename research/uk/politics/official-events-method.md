# Official events method — words, decisions and actions

**Last updated:** 2026-07-10
**Confidence:** proposed evidence and safety contract; source-by-source rights decisions remain open
**Status:** proposed and unimplemented — no dataset or API described here has been released

## Purpose

This method proposes a small, evidence-first way to show what a UK public body
or public office formally said or did. It covers official statements, recorded
votes, decisions, appointments, budget approvals, published enforcement actions
and later corrections.

The record must stay smaller than its source. TaxSorted would publish structured
facts, an independently written factual summary and a direct official link. It
would not copy a speech, transcript or quotation, build a text embedding, or
infer rhetoric, personality, emotion, honesty, ideology, intent, competence,
management style or influence.

This is a publication design, not a claim that every public record may lawfully
be republished. Copyright, database rights and data-protection duties are
separate questions and must be settled for each source family.

## The three collections

The proposed model has three collections. It does not create separate tables for
each kind of event and it does not create another people directory.

1. `official-events` holds the official event and its evidence.
2. `official-event-attributions` links an event to a named public role-holder in
   a stated capacity. It has a separate publication gate and no bulk export.
3. `official-event-corrections` keeps corrections and removals append-only.

All IDs are opaque, permanent strings. Array position and display text are never
identity. An ID is not reused after correction, withdrawal or deletion.

## Shared evidence rules

Every substantive record has `sourceIds` and at least one `evidence` item. Each
evidence item has exactly these fields:

| Field               | Type                         | Meaning                                                                |
| ------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| `sourceId`          | non-empty ID                 | Joins the existing official-source ledger.                             |
| `fields`            | non-empty JSON Pointer array | The exact record fields supported by this observation.                 |
| `locator`           | non-empty string             | Page, row, division, minute, paragraph or other reproducible locator.  |
| `recordUrl`         | HTTPS URL                    | The particular official record, not merely a publisher home page.      |
| `publisherRecordId` | string or `null`             | The publisher's stable identifier when one exists.                     |
| `observedOn`        | `YYYY-MM-DD`                 | When TaxSorted checked the record.                                     |
| `method`            | enum                         | `manual-review`, `official-api-projection` or `derived-exact-id-join`. |

Evidence may support only fields that exist. A source reference without field
evidence fails validation. A derived join must preserve the evidence on both
sides and may use only an exact official identifier or a documented manual
review. A name match is a research candidate, never a published join.

Every event also carries:

- `proves`: one narrow statement of what the official record establishes;
- `doesNotProve`: one or more explicit limits;
- `sourceIds`: the complete, deduplicated source set;
- `reviewedOn`: the date of the latest TaxSorted review.

A record cannot prove motive, private agreement, causal influence, effectiveness,
integrity, guilt or wrongdoing unless a competent official finding expressly
establishes that exact matter. Co-occurrence is not a relationship. A later event
is not evidence that an earlier statement caused it.

## `official-events`

### Common fields

Each event is a strict object with no unreviewed extra fields:

| Field               | Type                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `id`                | permanent ID                                                                                       |
| `kind`              | `official-statement`, `vote`, `decision`, `appointment`, `budget-approval` or `enforcement-action` |
| `title`             | short factual label                                                                                |
| `summary`           | independently written factual summary                                                              |
| `occurredOn`        | `YYYY-MM-DD`                                                                                       |
| `publishedOn`       | `YYYY-MM-DD` or `null`                                                                             |
| `effectiveFrom`     | `YYYY-MM-DD` or `null`                                                                             |
| `effectiveTo`       | `YYYY-MM-DD` or `null`                                                                             |
| `jurisdictions`     | non-empty string array                                                                             |
| `institutionIds`    | institution ID array                                                                               |
| `governanceUnitIds` | board, committee or panel ID array                                                                 |
| `officeIds`         | formal-office ID array                                                                             |
| `topics`            | controlled topic ID array                                                                          |
| `recordState`       | `source-reported`, `current`, `superseded`, `withdrawn`, `corrected` or `quashed`                  |
| `publicationClass`  | `institutional`, `named-public-accountability` or `case-sensitive`                                 |
| `details`           | one strict object selected by `kind`                                                               |
| `relatedRecords`    | typed record references                                                                            |
| `proves`            | non-empty string                                                                                   |
| `doesNotProve`      | non-empty string array                                                                             |
| `sourceIds`         | non-empty source ID array                                                                          |
| `evidence`          | non-empty evidence array                                                                           |
| `reviewedOn`        | `YYYY-MM-DD`                                                                                       |

`relatedRecords` contains only `relation`, `collection` and `id`. Allowed
relations are `concerns`, `authorises`, `implements`, `appoints-to`, `funds`,
`supersedes`, `corrects`, `appeals` and `quashes`. Target collections are an
explicit allow-list drawn from politics and public-funding records. In
particular, a budget approval links to the existing allocation record instead
of restating money under a new meaning.

### Strict event details

`official-statement` details contain:

- `statementKind`: `oral-statement`, `written-statement`, `official-speech`,
  `official-answer`, `signed-letter` or `institutional-release`;
- `authorshipBasis`: `officially-attributed-speaker`, `signed-author` or
  `institutional-publication`;
- `textPolicy`: the literal value `link-only-no-copied-body`;
- `textRepublished`: the literal value `false`.

An institutional press release belongs to the institution unless the source
expressly establishes personal authorship. “Delivered by” does not mean
“written by”. TaxSorted stores no verbatim quotation, transcript, excerpt,
embedding or generated rhetoric analysis.

`vote` details contain:

- `bodyId`, `divisionId`, `question` and `collectiveOutcome`;
- published `ayes`, `noes` and `otherCount`, each an integer or `null`;
- `missingChoiceMeaning`: the literal value `unknown-not-abstention`.

An individual choice belongs in the separately gated attribution collection.
If the official record does not list a person, TaxSorted records no choice. It
must never infer absence, pairing, abstention or motive.

`decision` details contain:

- `decisionKind`: `resolution`, `order`, `policy-decision`,
  `regulatory-decision`, `committee-recommendation` or
  `administrative-decision`;
- `outcome`: `approved`, `rejected`, `adopted`, `deferred`, `withdrawn`,
  `revoked` or `other`;
- `officialReference` and an optional `effectiveOn`.

A press notice can prove that a decision was announced; only the competent
minute, notice, instrument or law proves its formal effect.

`appointment` details contain `officeId`, `termStart`, `termEnd`, `process`
(`elected`, `appointed`, `nominated`, `confirmed` or `designated`) and `outcome`
(`made`, `recommended`, `confirmed`, `ended` or `withdrawn`). The event describes
the formal office and process. A named appointer or appointee belongs in the
attribution collection; biographies, employment histories and inferred
qualifications do not belong here.

`budget-approval` details contain:

- `allocationIds`, joining the public-funding corpus;
- `approvalStage`: `proposal`, `committee-recommendation`,
  `parliamentary-authorisation`, `administrative-allocation`, `revision` or
  `accounts-adoption`;
- `financialYear`;
- `effect`: `authorises-limit`, `sets-budget-control`, `approves-allocation`,
  `revises-allocation` or `adopts-accounts`.

Authority, allocation, payment and outturn remain different facts. Approval of
a limit does not prove that money was paid or spent, and pooled tax is not traced
to a named service without a source that lawfully creates that link.

`enforcement-action` details contain:

- `caseReference`, `caseState`, `legalBasis`, `outcome` and `finality`;
- optional `amountMinor` as integer currency minor units and `currency`.

Allowed first-release case states are `notice`, `finding`, `sanction`,
`undertaking`, `referral`, `appeal-outcome` and `quashed`. An allegation is not a
finding; an investigation is not a breach; a finding is not a final result while
an appeal remains live. `finality` is `interim`, `final`, `under-appeal` or
`overturned`. Victims, witnesses, suspects, individual complaints, disciplinary
files, rank-and-file personnel and live operational information are outside this
model.

## `official-event-attributions`

This collection is the only proposed event collection permitted to carry a
direct natural-person identifier. A base event can still identify someone
indirectly through an office, date, subject and source link, so every event also
passes the identifiability and publication review below. Each attribution row is
strict and contains:

| Field              | Type                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `id`               | permanent ID                                                                                       |
| `eventId`          | existing official-event ID                                                                         |
| `actorKind`        | `public-role-holder`                                                                               |
| `actorId`          | exact ID from an approved official people source                                                   |
| `officeId`         | formal office held for this event                                                                  |
| `role`             | `issuer`, `speaker`, `voter`, `decision-maker`, `appointer`, `appointee`, `approver` or `enforcer` |
| `capacity`         | `individual`, `collective-member` or `delegated`                                                   |
| `recordedChoice`   | vote choice or `null`                                                                              |
| `attributionBasis` | `event-record` or `event-record-plus-official-roster`                                              |
| `asAt`             | `YYYY-MM-DD`                                                                                       |
| `publicationClass` | literal `named-public-accountability`                                                              |
| `proves`           | narrow statement of what the attribution establishes                                               |
| `doesNotProve`     | non-empty attribution-limit array                                                                  |
| `sourceIds`        | non-empty source ID array                                                                          |
| `evidence`         | non-empty evidence array                                                                           |

`recordedChoice`, when present, is `aye`, `no`, `teller-aye`, `teller-no`,
`explicit-abstention` or `other`. It is valid only for a vote event. Missing is
unknown; it is never converted to abstention.

The event record itself must expressly identify the person and their capacity
in that event. An official roster may validate an exact actor-to-office join
already established by the event record; it can never create the event
attribution, prove that an office-holder acted, or fill a missing participant.

The first named scope is limited to elected representatives, ministers,
statutory office-holders, officially published board or committee members and
separately approved senior accountability offices. It does not create a
directory of general civil servants, teachers, clinicians, police officers,
contractors or support staff.

The API would resolve `actorId` through the separately reviewed people service.
It would not duplicate names, contacts or biographies in an event row, accept a
name-only join, expose a general reverse-person search or offer a named bulk
download.

An attribution proves only that the official source recorded the named holder in
the stated role and capacity. It does not prove personal authorship beyond the
source's attribution, motive, agreement with every part of a collective act,
influence over another event or responsibility outside that formal capacity.

## `official-event-corrections`

Corrections are new immutable rows. An old event is not silently rewritten or
removed from history. Each correction contains:

| Field                | Type                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `id`                 | permanent ID                                                                                              |
| `eventId`            | affected event ID                                                                                         |
| `attributionId`      | affected attribution ID or `null`                                                                         |
| `changeKind`         | `official-source-correction`, `taxsorted-mapping-correction`, `withdrawal`, `supersession` or `tombstone` |
| `changedFields`      | non-empty JSON Pointer array                                                                              |
| `changedAt`          | timestamp                                                                                                 |
| `replacementEventId` | event ID or `null`                                                                                        |
| `tombstone`          | boolean                                                                                                   |
| `neutralSummary`     | short factual explanation                                                                                 |
| `sourceIds`          | non-empty source ID array                                                                                 |
| `evidence`           | non-empty evidence array                                                                                  |

A public correction never contains the complainant's identity, private evidence
or private reply route. A correction for a gated record must not reveal the
hidden record. Tombstone metadata remains sufficient to prevent ID reuse and to
tell mirrors that a record must no longer be served.

## Source families and their limits

Only first-party official records establish an event in the first release:

- UK Parliament official transcripts, written statements, division records,
  votes, proceedings, committee records and APIs;
- GOV.UK or devolved-government speeches, statements and departmental
  publications that clearly identify their institutional status;
- legislation, statutory instruments, signed minutes, published decision
  notices, official appointment announcements and official rosters;
- Estimates, Supply and Appropriation Acts, official settlements and published
  board or committee budget approvals;
- official regulator, court, tribunal and oversight decisions or notices;
- the publisher's corrected record, withdrawal notice or replacement, and
  TaxSorted's own mapping-change record.

News reports, campaign material, political-party pages and social-media posts may
help locate an official source but do not establish a first-release event.
Party and social sources need their own attribution, deletion, retention and
reuse review before admission.

The existing official-source ledger remains canonical. Each source entry must
state its publisher, jurisdiction, kind, reviewed date, next review date, reuse
status, publication mode, what it supports and what it does not prove. OPL, OGL
or another open licence applies only within its terms. It does not settle
third-party rights or create a data-protection lawful basis. Where record reuse
is unresolved, TaxSorted distributes only its own structure, factual summary and
link.

## Publication gates

An institutional event may enter the open bulk dataset only when it is genuinely
about a body or collective act, carries no identifiable natural-person
attribution, has resolved source rights and passes the dataset admission review.
Removing a name does not make a record anonymous when office, date, subject and
source link readily identify the holder.

`case-sensitive` is an internal review state only in the first release. It is
never served by the institutional event path, the named-attribution path or a
bulk export. Any later outward use needs its own human-approved admission record,
target minimisation, urgent restriction route and documented Article 6 lawful
basis plus the Article 10 or other applicable criminal-offence-data conditions
and safeguards. Approval of named public-office attribution does not approve a
case target, complainant, victim, witness, suspect or defendant.

Named statements and votes are personal data and may reveal political opinions.
Before any attribution route opens, the human release owner must approve:

1. the public purpose, necessity and exact named-office scope;
2. the Article 6 lawful basis and, where required, Article 9 condition;
3. the legitimate-interests and data-protection impact assessments;
4. Article 14 privacy information and a working private correction, objection,
   restriction and urgent-safety route;
5. source-specific copyright, database-right and attribution decisions;
6. field-level minimisation, security, cache, retention and review rules;
7. a dataset admission record bound to the reviewed schema digest.

Public availability alone passes none of these gates. The named service uses
`Cache-Control: no-store`, bounded date windows, bounded cursor pages, no name
query and an independent emergency stop. Approval of one source family does not
open another. Approval of one named lookup does not create a named bulk export.

Current official guidance for that review:

- ICO, legitimate interests:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/>
- ICO, conditions for processing special-category data:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-conditions-for-processing/>
- ICO, criminal-offence data:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/criminal-offence-data/>
- ICO, the right to be informed:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-be-informed/>

## Retention and repair

Each source family needs an approved retention period and reason before release;
there is no indefinite default. Review dates test continuing accuracy, source
availability, office scope and necessity. Named attributions are reviewed when
the office ends, a source changes, a person objects or the stated public purpose
no longer requires distribution.

TaxSorted stores the mapped facts and source metadata, not a private archive of
speech bodies. When a credible mapping, identity, privacy or safety problem is
reported, the affected named record is restricted while it is checked. Repair
includes the correction row, cache purge, version change and notice to known
mirrors where proportionate. A source error and a TaxSorted mapping error remain
different correction paths.

## Proposed API shape

These paths are names for the proposed contract, not live endpoint claims:

```text
GET /v1/politics/uk/records
GET /v1/politics/uk/records/{id}
GET /v1/politics/uk/records/corrections
GET /v1/politics/uk/people/{id}/records
GET /v1/politics/uk/records/{id}/attributions
```

Institutional event queries may filter by `kind`, institution, governance unit,
office, jurisdiction, topic, state, source, bounded dates and an exact related
record ID. Results sort deterministically by occurrence date and ID. They do not
sort people by power, importance, rhetoric, personality or supposed impact.

The named paths require the separate attribution gate. They accept an exact
official person ID, event kind, office ID, bounded dates, limit and cursor. They
have no bulk JSON, NDJSON or CSV distribution.

## Validation before implementation

A future implementation should use a strict discriminated schema and graph
validation. Boot or build must fail when:

- an ID is duplicated or a reference does not resolve;
- an event's `details` object does not match its `kind`;
- evidence points to a missing field or unknown source;
- an attribution uses a name match or an unapproved actor class;
- a vote absence is represented as abstention;
- a budget approval invents an allocation or silently changes its accounting
  meaning;
- an enforcement state collapses allegation, finding, sanction or appeal;
- a correction creates a cycle, reuses an ID or hides its replacement;
- an unreviewed field or nested path reaches an outward projection.

Until that validation, the source-family rights reviews and the named
publication decisions exist, this document remains a method proposal only.
