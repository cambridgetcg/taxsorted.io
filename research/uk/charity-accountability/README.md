# UK charity organisation accountability

Status: **schema only; no organisation records admitted**.

This directory defines how TaxSorted could connect a human-reviewed faithful
paraphrase of what an attributed source reports a UK charity or related
organisation said with what admitted public sources report about its funding,
activity and outcomes.
The aim is understanding, not a people directory and not an accusation engine.

The executable contract is
`api/src/uk-charity-accountability.ts`. It exports:

- `ukCharityAccountabilitySchema` — the strict Zod dataset validator;
- `ukCharityAccountabilitySchemaDocument` — generated JSON Schema 2020-12;
- `ukCharityAccountabilityFramework` — frozen orientation, boundaries,
  blockers, sorting, cursor and money-comparison rules; and
- `UkCharityAccountabilityDataset` — the inferred TypeScript type.

The framework status is `schema-only-not-admitted`. That phrase matters: a
well-formed schema is not evidence that collecting or publishing a record is
lawful, fair, accurate or safe.

The generated JSON Schema checks strict candidate shapes and local rules. The Zod
schema additionally checks the graph: references, source-review expiry and
permanence declarations, source-use permission, identifier ownership and
explicit bridges, aggregate disclosure reviews, attributed voices, exact money
arithmetic, comparison alignment, release chronology, counts, order and safe
tombstones. Source locators and review statements remain human assertions; the
validator does not prove what a page means. Passing either validator is not
publication admission. A later external envelope must resolve every admission
condition and real intake, source-review, emergency-stop and human-approval check
ID against an operational audit store.

## What the map separates

| Collection | Question it answers | Boundary |
| --- | --- | --- |
| `organisations` | Which registered organisation or official institution is being described? | Subject organisations use exact public register IDs; regulators and public funders may instead use an exact canonical official-institution URI. Multiple official IDs need explicit, human-reviewed source bridges that publish both identifiers. |
| `identifierMappings` | Which exact official identifier establishes the join? | Named charity/company registers, or an exact canonical official-institution URI for regulators/public funders; never an award ID, name match or probability. Mapping and organisation lists must point to each other. Uppercase-alphanumeric rules accept only ASCII letters, digits, spaces and hyphens before canonicalisation. |
| `documents` | Which public source door supports the record? | Link permission and derived use are separate decisions. Every public document/source-review field is reviewed for people, contacts, addresses, named pay, personal belief detail or belief inference about a person, and a copied source body or excerpt. Notes and limitations are bounded; locators are pointers, not quotations or mechanically verified anchors. Permanence and expiry stay explicit. |
| `voices` | Which institution is attributed as speaking? | Exact source author/publisher organisation and role, or labelled TaxSorted editorial voice—not a natural person. |
| `claims` | What is the attributed source statement? | A human-approved faithful paraphrase and modality. The publisher is the place to read its words as available at review time, subject to the recorded permanence mode. |
| `programmes` | What organised work was planned or delivered? | Aggregate purpose and population scope; no beneficiary records. |
| `fundingEvents` | What organisation-level award, commitment, payment or aggregate flow was reported? | Anonymous or aggregate funding needs disclosure review; `aggregate-public-donations` is always people-derived and needs a stated smallest cell. An exact organisation-to-organisation event does not use that review. |
| `financialFacts` | What aggregate financial fact was filed or derived by exact arithmetic? | Every fact receives a disclosure review and says whether it is genuinely organisation-only or people-derived. `staff-costs-aggregate`, `remuneration-bands-aggregate` and `trustee-remuneration-aggregate` are always people-derived and need a stated smallest cell and reviewed-safe decision. Every TaxSorted-derived number uses structured exact arithmetic, receives a fresh review and propagates people-derived status from its inputs. Named pay is forbidden. |
| `assetAggregates` | What aggregate asset value was reported? | Category totals only; no asset-level identity, address or location. |
| `controlRelations` | What organisation controls or is linked to what organisation? | Organisation-to-organisation relations only; no trustee or other natural-person control graph. |
| `observations` | What organisation-level action or event was observed? | Source-backed observation with disclosure review, kept separate from a claimed outcome or independent proof. |
| `outcomes` | What aggregate result was reported or measured? | Population aggregate, explicit attribution strength and disclosure review; no individual outcome data. |
| `evaluations` | Who evaluated the work and how? | Evaluator organisation, method, reviewed finding, limits, independence status and disclosure review; no evaluator biography. |
| `comparisons` | How do two aligned candidate records relate? | Every exported comparison is human-approved. Every numeric result has a fresh disclosure review and propagates people-derived status. Differences use safe-integer minor units; ratios retain the exact numerator and non-zero denominator and never store a floating quotient. Two money records need matching basis, stage and amount date before `inconsistent-with`. |
| `coverageGaps` | What is unknown, unavailable, conflicting or deliberately excluded? | Absence stays visible. An unknown population basis or unsafe cell means the value is omitted; its suppression gap has fixed safe wording and no source-document pointer. |
| `tombstones` | What record was removed and why? | Uses fixed reason-bound text and reviewed opaque or non-personal retained IDs; removed or sensitive detail is not repeated. `releaseId` names the first candidate carrying it, and its effective time cannot postdate that assembly. The tombstone remains in every later candidate, whose tombstone count equals the cumulative retained ledger. |
| `releases` | Which immutable candidate chain was assembled? | `candidateAssembledAt` anchors a single predecessor chain and time cutoffs. Change summaries receive privacy review and cannot repeat removed or sensitive content. A digest is not approval to publish. |

The intended reading path is:

```text
exact organisation identity
  → public source document
  → institutional voice and claim
  → programme / funding / finance / assets / control
  → observation → outcome → evaluation
  → human-reviewed comparison
  → visible gaps, corrections and release history
```

This lets a builder show “the organisation promised X” beside “the filed or
evaluated record reports Y” without silently turning a difference into a claim
of wrongdoing.

## Two immediate blockers and nine admission conditions

The two machine-named blockers are the immediate missing systems, not the whole
publication test:

1. `confidential-correction-safety-intake`: a private route for corrections and
   safety reports, with identity-safe triage, urgent suppression and an
   auditable resolution path.
2. `asset-level-rights-admission-digest`: separate reviewed link and
   locator-specific derived-use decisions for every source asset. The digest makes
   a declared review mutation-evident; it proves neither legality nor reviewer
   identity.

Public GitHub issues are not a substitute for the confidential intake. They
can expose the very information a person needs removed.

No organisation row may be admitted until all nine framework
`admissionConditions` are evidenced and approved:

1. `named-blockers-resolved`;
2. `controller-lawful-basis-retention-and-rights`;
3. `formal-dpia-decision`;
4. `asset-rights-expiry-and-locator-review`;
5. `small-territorial-field-set-reviewed`;
6. `end-to-end-correction-and-rollback-exercised`;
7. `comparison-review-guidance-calibrated`;
8. `public-meaning-and-limits-explained`; and
9. `monitored-emergency-stop`.

## Build and validate a zero-row candidate

[The zero-row candidate](examples/zero-row-candidate.json) is an executable
shape with empty evidence collections and one candidate release. Validate it
from the repository root with:

```sh
npm run validate:charity-accountability-candidate --workspace api -- research/uk/charity-accountability/examples/zero-row-candidate.json
```

The command uses the runtime Zod graph validator. It is a local file validator,
not an upload, ingestion or publication API, and success says only that the
candidate shape passes the current structural contract.

## Agent orientation and XENIA

The framework’s compact arrival orientation, declared boundaries, explicit
errors and recovery actions were adapted from **XENIA by Yu and Fable**. Its
canonical source is [github.com/cambridgetcg/xenia](https://github.com/cambridgetcg/xenia),
reviewed 2026-07-10. CC BY-SA 4.0 applies only to the adapted agent-manifest and
wake-orientation expression; TaxSorted implementation source remains AGPL-3.0.
TaxSorted does not claim full XENIA conformance and does not adopt XENIA ratings,
decentralised identifiers, identity continuity, wallets, tokens or covenants.
XENIA is not the source of this dataset’s legal, privacy, charity, financial or
editorial rules.

## Read next

- [METHOD.md](METHOD.md) explains admission, normalisation, comparison and
  release mechanics.
- [PUBLICATION-ASSESSMENT.md](PUBLICATION-ASSESSMENT.md) records the present
  no-publication decision and its exit conditions.
- [DATA-PROTECTION-ASSESSMENT.md](DATA-PROTECTION-ASSESSMENT.md) records the
  privacy risks and why organisation-only structure is still not enough by
  itself.
