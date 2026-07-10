# Method

Reviewed: 2026-07-10.

This method governs a future organisation-level accountability dataset. It
does not authorise collection. The current admissible record count is zero.

## 1. Stop at the gate

Check the frozen framework first. The two publication blockers name the
immediate missing systems; they are not a complete publication test. If either
blocker is unresolved, stop. Schema, route and user-interface work may continue
with empty collections; source ingestion and organisation record publication
may not.

The blockers are:

- a tested confidential correction and safety intake; and
- separate source-asset link and locator-specific derived-use decisions, with a
  mutation-integrity digest of the declared review record.

Even after those systems exist, admission remains stopped until all nine
framework `admissionConditions` are evidenced and approved: named blockers;
controller, lawful-basis, retention and rights decisions; a formal DPIA;
source-asset rights, review expiry and locator review; a small territorial field
set; exercised correction and rollback; calibrated comparison review; a public
explanation of meaning and limits; and a monitored emergency stop.

## 2. Admit the source asset

Treat each register page, filing, account, award notice, evaluation and other
source as a separate asset. For each asset:

1. record the canonical HTTPS URL, publisher, title, publication date and
   retrieval time;
2. identify applicable terms, licence, database rights, attribution and access
   conditions;
3. check whether the source may contain people, contacts, addresses, named pay,
   safeguarding material or personal belief data;
4. review every field that will be public in the document and source-review
   record—including permanence text, review IDs, derived-use terms, attribution,
   limitations, locators and notes—and confirm that it contains no person,
   contact, address, named pay, personal belief detail or belief inference about
   a person, source body or excerpt;
5. decide link permission separately from every allowed derived-use type and
   source locator;
6. record one honest source-permanence mode: current publisher URL only,
   publisher-versioned with its version or digest, or a lawfully archived link;
7. give the review an expiry date that still covers candidate generation;
8. store reviewed document metadata plus bounded public source-review
   declarations and notes—source bodies, excerpts, images and attachments
   remain external; keep locators as pointers rather than quotations; and
9. hash the canonical document identity and rights/safety review with only its
   digest field omitted.

The digest detects mutation of the declared review record. It proves neither
legality, reviewer identity nor that an external workflow happened. A changed
URL, source version, term, allowed locator, use type or safety finding requires
a new assessment and digest. A locator is a human-reviewed source pointer, not
a mechanically resolved anchor, semantic proof or source archive. The exact
publisher words are available only as they stood at review time unless a known
publisher version or lawful archive is recorded. A link-only decision cannot
support a derived record. Unknown rights mean link-only or stop; they never
mean presumed reuse. The all-public-fields review is a human assertion, not
automated semantic proof, and operational admission must still inspect it.

## 3. Establish organisation identity exactly

Create a subject organisation only when an admitted official source supplies an
exact public register identifier. A regulator or public funder may instead use
an exact canonical HTTPS institution URI, explicitly labelled as institutional
identity rather than a legal-entity ID. Store the namespace, displayed value,
canonical value and source document.

Allowed joins are exact published identifiers:

- charity number to the same charity number;
- company number to the same company number; or
- canonical official-institution URI to the same reviewed regulator or public
  funder URI.

An award or transaction identifier is separately namespaced on a funding event.
It may be associated only after the recipient or funder is identified exactly;
it can never become an organisation join key.

Do not join by name, trading style, domain, postcode, officer, trustee, text
similarity, model score or “likely match.” When one organisation has multiple
official identifiers, every mapping must be connected through explicit
`identifierBridges`. Each bridge needs a reviewed source use whose locator
publishes both identifiers and a human review of that assertion. A privacy flag
alone is not a bridge. When the exact bridge is absent, create a coverage gap.
Every mapping must appear in the `exactIdentifierMappingIds` list of the exact
organisation it references, and every listed mapping must point back to that
organisation. Values using `uppercase-alphanumeric-remove-spaces-and-hyphens`
accept only ASCII letters, digits, ordinary spaces and hyphens before
canonicalisation; punctuation and Unicode lookalikes fail.

An official identifier may map to only one canonical organisation in a
release. Conflicts are quarantined for human review.

## 4. Keep source, voice and modality separate

A document is the source door. A voice is the organisation-level capacity in
which an institution is attributed as speaking. A claim is a human-approved
faithful paraphrase and its modality; the publisher link is where its words may
be read as available at review time, subject to the recorded permanence mode.

Modalities have distinct meanings:

- `states`: presents a proposition without a result claim;
- `reports`: describes a past or current result;
- `promises`: commits to future conduct;
- `targets`: names a desired measurable state;
- `estimates`: supplies an uncertain quantity;
- `evaluates`: makes a judgement;
- `disputes`: rejects another proposition;
- `regulator-finds`: records a regulator’s conclusion;
- `auditor-opines`: records an audit opinion; and
- `taxsorted-analysis`: TaxSorted’s own labelled analysis.

Never collapse these to a generic “fact.” Do not store copied quotations in
version 1. Normalise only the organisation-level proposition, preserve its
exact admitted source use, and record that verbatim text is not stored. A
non-editorial voice must match an exact source author or publisher organisation
with the appropriate role.

A charity’s source-stated religious purpose may be represented as an
organisation claim. It must never be used to infer any natural person’s belief.

## 5. Separate work, money, action and result

- A `programme` is organised work and its aggregate scope.
- A `fundingEvent` is a dated award, commitment, payment or aggregate flow.
- A `financialFact` is a reported aggregate or exact arithmetic derivation.
- An `assetAggregate` is a category total, never an asset inventory.
- A `controlRelation` links two exact organisation IDs, never people.
- An `observation` says what action or event an attributed source reports or
  records; it is not silently presented as independent proof.
- An `outcome` says what aggregate result is reported or measured and how
  strongly it is attributed.
- An `evaluation` preserves method, limitations, independence and the
  organisation-level finding.

`taxsorted-derived` is reserved for a structured `derived-exact-arithmetic`
financial fact and a labelled `taxsorted-source-comparison` evaluation. A
reported, audited or restated financial number cannot use the TaxSorted
editorial voice, and programmes, funding events, assets, control relations,
observations and outcomes must remain attributed to an external institutional
source voice.

These collections must not stand in for one another. An award is not a
payment; a payment is not delivery; an output is not an outcome; an outcome is
not proof of causation; a filed asset total is not an addressable list of
property.

Human statistical-disclosure review is mandatory for programmes,
observations, outcomes, evaluations and every financial fact. It is also
mandatory for anonymous or aggregate funding; an exact
organisation-to-organisation funding event does not carry that review.
The reviewer must say whether a value is people-derived or genuinely
organisation-only. `aggregate-public-donations`, `staff-costs-aggregate`,
`remuneration-bands-aggregate` and `trustee-remuneration-aggregate` are always
people-derived. Every people-derived aggregate needs a stated smallest cell and
an in-context reviewed-safe decision. An unknown population basis or unsafe
cell means omit the value-bearing row and create a
`suppressed-for-disclosure-risk` coverage gap instead. That gap uses only the
fixed public wording “A value was omitted after disclosure-risk review.” and
“No inference should be made from its absence.” It carries no source-document
pointer, so it cannot repeat the omitted value or lead directly back to it.

Review order is part of the evidence. Source admission follows retrieval;
normalisation follows source readiness; disclosure review follows the record it
approves; and the final privacy review follows any applicable normalisation and
disclosure review so it sees their public text. Comparison review waits for both
referenced records and all of their required reviews. A derived financial fact waits for
its inputs and their reviews. Every derivation and numeric comparison receives
a fresh statistical-disclosure review; a people-derived input makes the result
people-derived too.

## 6. Comparable money

Store GBP as a signed safe integer in minor units. Never use a binary floating
point amount for stored money.

Before calculating a difference or ratio, both records must match exactly on:

- organisation, scope and metric;
- period, except that an explicit `change-over-time` comparison requires two
  different periods while every other dimension remains aligned;
- currency;
- accounting basis;
- gross or net presentation;
- VAT basis;
- nominal, current-price, real or unstated price basis;
- price base date when values are real; and
- standalone, group, consolidated or unstated scope.

Measurement stage—forecast, budget, commitment, payment, accrual, outturn,
estimate or restatement—must remain visible. Different stages can answer a
useful question, but they are not interchangeable.

If a required dimension differs, record `not-comparable` in the candidate and
name the difference. Do not calculate. The only permitted mismatch for
arithmetic is the period in an explicit `change-over-time` relation.
Differences are `right amount - left amount` and must remain safe integers.
Ratios preserve the right and left
minor-unit amounts as `numeratorMinor` and a non-zero `denominatorMinor`, with
representation `exact-rational-source-minor-units`; no floating quotient is
stored.

A `derived-exact-arithmetic` financial fact is not free-form arithmetic. Its
operation is `signed-sum-of-minor-unit-inputs`, with at least two distinct input
facts and coefficients restricted to `-1` or `1`. Inputs must match the output's
organisation, period, scope key and definition, money basis, measurement stage
and amount date; input metrics may differ because the output can be a newly
defined derived metric. The validator recomputes the safe-integer result and
rejects derivation cycles. A derived financial fact follows its inputs and their
reviews; its own disclosure review follows that observation. A numeric
comparison's disclosure review follows both records and the human comparison
review. If an input is people-derived, either result review must also say
people-derived and state a reviewed-safe smallest cell.

## 7. Compare without manufacturing accusations

Every comparable record carries the same defined context:

```text
organisationId + period + scopeKey + scopeDefinition + metricKey + metricDefinition
```

A comparison resolves both records by exact ID and checks their complete keys.
The relation `inconsistent-with` is unavailable unless:

1. an accountability editor has approved it;
2. both records concern the exact same organisation;
3. their periods are exactly the same;
4. their scopes are exactly the same; and
5. their metrics are exactly the same.

When both records carry money, `inconsistent-with` also requires the same money
basis, measurement stage and amount date. A forecast, commitment, payment or
outturn cannot become a contradiction merely because the numbers differ.

The editor records a rationale and limitations but no reviewer name. Every
comparison in the exported candidate is human-approved. Machine proposals and
rejections stay outside that collection. A
numerical difference, different measurement stage, source silence or missing
record is not by itself inconsistency.

## 8. Publish uncertainty

Use `coverageGaps` for missing periods, missing identifiers, unclear scope,
unclear metrics, source conflicts, rights questions, temporary failures,
deliberate boundaries and values omitted for disclosure risk. Suppression is a
coverage gap, never a hidden value or a flag attached to a published value.
Never fill a gap from likelihood or implication.

When a record must leave a candidate history, remove it and add a tombstone.
Dataset record IDs and the tombstone, target, replacement and release IDs it
retains must be opaque or non-personal and human-reviewed. The tombstone keeps
only those identifiers, reason, release, a permitted replacement pointer and
fixed reason-bound text. A corrected or replaced record needs a replacement.
It cannot repeat removed or sensitive content. Its `releaseId` names the first
candidate that carries the tombstone, so `effectiveAt` cannot be later than
that candidate's assembly time. Keep the tombstone in every later candidate;
each release's tombstone count must equal the cumulative retained ledger
through that release.

## 9. Make immutable candidates

Every record and candidate-release ID is 1–100 lowercase ASCII letters, digits
and hyphens. Sort each
collection by ASCII ID ascending. IDs are globally unique across active record
collections. Version 1 validates only `candidate-not-admitted` datasets and
`candidate` history records; this is a structural check, not an ingestion or
publication API. Every history record carries `candidateAssembledAt`. All candidates must
be reachable from `meta.currentReleaseId` through one predecessor chain;
predecessor assembly times cannot run backwards. Records, source retrievals,
reviews, gaps, tombstones and candidate assembly times cannot postdate either
`meta.generatedAt` or the current candidate assembly time. A candidate states
exact collection counts, its schema ID, dataset digest, prior candidate and
change summary. The summary has its own privacy review and must not repeat
removed or sensitive content.

The cursor payload has four ordered fields:

```json
{"version":"taxsorted.cursor/1","releaseId":"…","collection":"…","lastId":"…"}
```

Encode the canonical UTF-8 JSON as base64url. A cursor belongs to one immutable
candidate and cannot be carried to another. An invalid or stale cursor must
return a typed error and a safe next action to restart the requested candidate.

Operational publication admission is outside this schema. A later versioned
envelope must resolve confidential-intake, source-review, human-approval and
emergency-stop check IDs against the real audit store. A status flag or digest
inside a submitted dataset cannot prove those checks happened.

The repository includes an executable empty example and a local validator:

```sh
npm run validate:charity-accountability-candidate --workspace api -- research/uk/charity-accountability/examples/zero-row-candidate.json
```

Success confirms the candidate shape only. It does not ingest the file, grant
publication admission or resolve any of the nine conditions.

## 10. Correct safely

Corrections that contain no sensitive material may eventually use a public
route. Any report involving a person, safeguarding, private contact details,
belief, security or threatened harm must go through the confidential intake.
Urgent suppression must not wait for a full merits decision. Every correction
needs a receipt, status, resolution reason and release/tombstone trail visible
to the reporter without exposing their identity publicly.
