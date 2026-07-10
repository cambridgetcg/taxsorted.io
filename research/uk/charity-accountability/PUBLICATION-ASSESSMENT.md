# Publication assessment

Decision date: 2026-07-10.

Decision: **do not admit or publish organisation records**.

Approved now:

- the schema contract;
- generated JSON Schema;
- the frozen framework and machine orientation;
- a framework response that contains no organisation evidence rows; and
- methodology, publication boundaries and data-protection assessment.

Not approved now:

- downloading source bodies into TaxSorted;
- building a national charity mirror;
- admitting any charity, religious organisation or related organisation row;
- publishing claims, finance, funding, assets, control, observations, outcomes,
  evaluations or comparisons about a named organisation; or
- exposing any person, trustee, officer, worker, donor, beneficiary, contact,
  address, named pay or inferred belief.

This is an engineering and editorial assessment, not legal advice.

## Why publication is stopped

### 1. Confidential correction and safety intake does not yet exist

Accountability records can be wrong even when each source is public. Registers
change, filings are restated, identifiers collide, organisations merge, and a
source can expose information later suppressed for safety. A public issue
tracker cannot safely receive a report about a person, belief, address,
safeguarding or threatened harm.

Before admission, TaxSorted needs private intake, identity-safe triage, an
urgent suppression path, decision records, reporter receipts, response times,
appeal/review, and release/tombstone integration. These controls must be tested,
not merely documented.

### 2. Source-asset rights and admission decisions are not operational

“Publicly visible” does not answer what TaxSorted may copy, transform,
redistribute or combine. The answer can differ by publisher, dataset, field,
licence, API terms and document.

The Charity Commission API supplies current register information but requires
registration and an API key and is rate-limited. Its page is OGL except where
otherwise stated, but that does not erase privacy and field-level review.
[Charity Commission API documentation](https://register-of-charities.charitycommission.gov.uk/en/documentation-on-the-api)
(reviewed 2026-07-10).

OSCR permits a daily register download under stated conditions, including
attribution, no direct marketing and no claim that a derived list is the
Scottish Charity Register. Its page also warns that some income figures include
subsidiaries. Those conditions and field meanings must travel with any record.
[OSCR register download and terms](https://www.oscr.org.uk/about-charities/search-the-register/download-the-scottish-charity-register/)
(reviewed 2026-07-10).

The planned review separates permission to link from permission to derive exact
fields through named source locators. Those locators are human-reviewed
editorial pointers, not mechanically resolved anchors, proof of page meaning or
a source archive. Each document must say whether only a current publisher URL,
a publisher version/digest or a lawful archive link is known, and its review
must remain unexpired at candidate generation. The review digest detects
mutation of the declaration; it proves neither legality nor reviewer identity.
Until the actual review workflow exists, records fail closed.

These are the two immediate missing systems. They are not the complete
publication test: all nine machine-readable `admissionConditions` below must
also be evidenced and approved.

## What the schema does protect

- all objects are strict; unrecognised fields fail rather than disappear;
- documents retain reviewed metadata plus bounded public source-review
  declarations and notes; source bodies, excerpts, images and attachments
  remain external;
- every public document and source-review field—including permanence text,
  identifiers, attribution, terms URLs, limitations, locators and bounded
  notes—has an explicit human no-person/no-sensitive-data/no-source-excerpt
  review; locators must be pointers only;
- every derived source use needs an approved use type and reviewed locator, but
  the locator remains a human assertion rather than mechanical proof;
- source permanence and review expiry are explicit;
- every processed record declares that people, contacts, addresses, named pay
  and personal belief data are absent;
- every join is an exact published identifier join, and multiple official IDs
  require explicit reviewed bridges whose source publishes both identifiers;
- mapping membership points both ways between each mapping and its organisation;
  uppercase-alphanumeric rules reject punctuation and Unicode lookalikes;
- organisation identifiers cannot map to two organisations;
- programmes, anonymous or aggregate funding, every financial fact,
  observations, outcomes and evaluations receive the required
  statistical-disclosure review;
- `aggregate-public-donations`, `staff-costs-aggregate`,
  `remuneration-bands-aggregate` and `trustee-remuneration-aggregate` are always
  people-derived and require a stated smallest cell and reviewed-safe decision;
- a value requiring suppression is omitted and represented by a
  `suppressed-for-disclosure-risk` coverage gap with fixed safe wording and no
  source-document pointer;
- disclosure review distinguishes people-derived aggregates from
  genuinely organisation-only values; an unknown population basis fails closed;
- final processed-record privacy review follows the applicable disclosure
  review, so disclosure limitations cannot escape the free-text check;
- programme populations, money, pay and assets remain aggregates;
- control relations connect organisations only;
- claims retain institutional voice and modality;
- observations, outcomes and evaluations remain distinct;
- `taxsorted-derived` is limited to structured exact-arithmetic financial facts
  and labelled TaxSorted source-comparison evaluations;
- all candidate comparisons are human-approved, and `inconsistent-with` also
  needs exact organisation, period, scope, metric and definition alignment;
  when both records carry money, basis, measurement stage and amount date must
  also match;
- exact financial derivations are recomputed signed sums of compatible
  safe-integer minor-unit inputs; money differences stay safe integers and
  ratios retain an exact numerator and non-zero denominator; a derived
  financial fact follows its inputs and their reviews before receiving its own
  disclosure review; a numeric comparison's disclosure review follows both
  records and the human comparison review; people-derived status propagates to
  either result;
- record and retained tombstone identifiers are reviewed as opaque or
  non-personal;
- gaps, removals and releases are first-class records; release change summaries
  receive privacy review and cannot repeat removed or sensitive content;
- a tombstone cannot take effect after the first candidate named by its
  `releaseId` was assembled; it remains in every later candidate, and every
  release declares the exact cumulative retained tombstone count;
- `candidateAssembledAt`, one predecessor chain and generation/assembly cutoffs
  prevent future-dated candidate evidence; and
- stable ordering and release-bound cursors make a result reproducible.

These are necessary controls. They are not sufficient permission to publish.
Free text and source links still need human review; a producer can make a false
safety declaration; an exact join can still join the wrong field; and an
accurate record can still create an unfair or unsafe combined picture.

## Conditions for a new decision

Reassess publication only when all of the following framework conditions have
evidence and approval:

1. `named-blockers-resolved`: both immediate framework blockers are resolved
   and tested;
2. `controller-lawful-basis-retention-and-rights`: data controller, purposes,
   lawful basis, retention and rights handling have
   been recorded for the actual pipeline;
3. `formal-dpia-decision`: a formal DPIA decision has been made against the real
   sources and fields;
4. `asset-rights-expiry-and-locator-review`: each source asset has separate link
   and locator-specific derived-use decisions, a mutation-detection digest,
   human-reviewed locators, an honest permanence declaration and a review-expiry
   date;
5. `small-territorial-field-set-reviewed`: one territorial source and a very
   small field set have passed legal,
   privacy, security and editorial review;
6. `end-to-end-correction-and-rollback-exercised`: explicit exact-ID bridges,
   source changes, correction, urgent suppression, tombstones, cache handling
   and full rollback have been exercised end to end;
7. `comparison-review-guidance-calibrated`: comparison reviewers have written
   guidance, calibration examples, appeal handling and periodic error review;
8. `public-meaning-and-limits-explained`: the public interface explains source
   voice, TaxSorted analysis,
   uncertainty, money dimensions and non-equivalence; and
9. `monitored-emergency-stop`: monitoring has an off-switch that can stop
   organisation publication without
   taking the sector framework or source doors offline.

The first candidate should be deliberately small and reversible. National
coverage is not a release criterion; safety and interpretability are.

## Exit decision

Current status remains `schema-only-not-admitted`. Version 1 describes and validates candidate
documents only; no API route accepts or publishes them. The zero-row framework endpoint and
schema discovery may ship; organisation content may not. A future external admission envelope must resolve real check
IDs against the operational audit store rather than trusting fields supplied
inside a dataset.

The repository's
[zero-row candidate](examples/zero-row-candidate.json) can be checked with:

```sh
npm run validate:charity-accountability-candidate --workspace api -- research/uk/charity-accountability/examples/zero-row-candidate.json
```

That local command validates structure and graph rules only. It does not upload,
ingest or publish the file, and it cannot satisfy an admission condition.
