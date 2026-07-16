# Tax Position Passport

The Tax Position Passport is a portable account of what a person says is true,
what remains unknown, what evidence they say they hold and what one bounded tax
check concluded.

It is not an identity document. It is not a tax return. It is not proof that an
accountant reviewed anything or that HMRC received anything.

## First release

The first Passport lives at `/passport` and covers:

- employment as a mapped income source, without a PAYE or tax-code calculation
- self-employment, UK property and foreign property as explicit `yes`, `no` or
  `unknown` facts
- an evidence index that records `held`, `missing`, `not-checked` or
  `not-expected`
- the existing full browser-side MTD Income Tax readiness check
- a printable accountant handoff
- a versioned JSON export

The complete MTD request travels beside its complete `TaxAnswer`. This preserves
the facts, unknowns, effective dates, reasoning, source receipts, confidence
boundary and next actions needed to understand or replay the conclusion.

## Privacy and consent

Opening `/passport` checks for a saved Passport. If none exists, the page
creates a working draft in memory but creates no Passport record and stores no
tax facts. The browser may still create ordinary IndexedDB database metadata
while checking local storage.

Only the button labelled **Save this Passport** writes the draft to IndexedDB in
that browser. IndexedDB is ordinary browser site data, not application-layer
encryption supplied by TaxSorted. Someone with access to the same browser
profile may be able to read it, and browser eviction or clearing site data may
erase it. Export a copy when durability matters.

The page asks for no:

- name
- address
- email or phone number
- NINO value
- UTR
- bank details
- document upload

The MTD check asks only whether a National Insurance number existed at a stated
date. It never asks for the number.

The delete control removes only the Passport key. It does not remove Starter
Books, VAT businesses, account data or HMRC sandbox connections.

Downloaded JSON and browser-created PDFs are outside TaxSorted's storage
boundary and are not encrypted by TaxSorted. The page says this before export.

## Assurance words

Every export states:

```json
{
  "identityVerified": false,
  "signed": false,
  "professionallyReviewed": false,
  "filed": false
}
```

The user may confirm that they reviewed the visible facts before handoff. That
confirmation means only `checked-by-user-not-professional-approval`.

Evidence is always labelled `named-by-user-not-inspected`.

## Machine contract

Envelope:

```text
taxsorted.uk.tax-position-passport/1
```

Public static resources:

```text
GET /v1/uk/tax-expert/tax-position-passport/schema
GET /v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax
GET /openapi/tax-expert-uk.json
```

The first two routes contain no taxpayer data. They are cacheable, carry
exact-byte SHA-256 ETags and allow public read CORS.

JSON Schema validates the bounded wire structure, canonical tuple order,
capability identity and complete why graph. Some meaning crosses fields and
therefore remains a runtime check: source answers must agree with
`not-expected` evidence, the MTD request and answer must name the same
capability, and the TaxAnswer graph and evidence references must be coherent.
The Passport is unsigned and does not prove that the carried answer was derived
from the carried request; a relying consumer can replay the request with its
chosen engine version. Consumers should use JSON Schema for structural
validation, then TypeScript consumers can run the cross-field semantic checks
with `assertTaxPositionPassportInvariants` from
`@taxsorted/engine/uk/passport`. The schema advertises this boundary in
`x-taxsorted-runtime-invariants`.

The served schema is a self-contained, committed snapshot generated from the
canonical Zod contract before release. The API test gate checks that the
snapshot is current, compiles the actual served schema with a Draft 2020-12
validator, validates the synthetic example and rejects impossible dates,
unexpected nested fields, incomplete why graphs and wrong capability IDs.
Production only parses the JSON snapshot; it does not rebuild the nested schema
graph in memory.

There is deliberately no Passport `POST`, upload, cloud store, share link or
CRUD API. Adding one would create authentication, retention, deletion,
confidential-intake and security duties that a local export does not need.

The v1 envelope may contain zero or one MTD position. Zero is valid for a
facts-only Passport such as an employment-only source map; TaxSorted does not
invent a PAYE calculation to fill the array.

## Source boundary

The Passport does not invent a second tax-source format. An MTD position carries
the existing `TaxAnswer.evidence.sources` ledger, including publisher, URL,
source kind, legal force, status, effective period, retrieval and review dates,
what the source supports and what it does not prove.

The evidence-index prompts link to current official guidance:

- [MTD Income Tax overview](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/before-you-use-this-guide)
- [MTD qualifying income](https://www.gov.uk/guidance/work-out-your-qualifying-income-for-making-tax-digital-for-income-tax)
- [MTD digital records](https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/create-digital-records)
- [employment pay and tax records](https://www.gov.uk/keeping-your-pay-tax-records/employees-and-limited-company-directors)
- [self-employed records](https://www.gov.uk/self-employed-records/what-records-to-keep)
- [Income Tax (Digital Obligations) Regulations 2026](https://www.legislation.gov.uk/uksi/2026/336/contents/made)

These pages were checked on 16 July 2026. Official guidance explains HMRC's
current position; the statutory instrument is binding law. The MTD `TaxAnswer`
keeps those kinds and legal-force labels distinct.

## Known gaps

The first release does not:

- import Passport files
- sign or verify identity
- inspect evidence
- read Starter Books automatically
- represent separate trades as separate profile objects
- calculate PAYE or a whole-person tax liability
- cover every pension, gain, partnership, trust, company or cross-border case
- grant an accountant authority to act
- submit anything to HMRC

Import is deferred because safe import needs a file-size limit, duplicate-key
rejection, strict depth and schema validation, safe rendering and a clear merge
rule. Cloud sharing is a separate security product, not a small export feature.

## Why it is separate from Starter Books

Starter Books preserve accounting events, revisions, evidence origins and
ledger scope. A Passport preserves a person's stated source map, evidence
states and assessment handoff. They have different meanings and different
deletion boundaries, so they use separate schemas and IndexedDB keys.

The Passport links to the Starter Books export but never silently reads or
copies its records.
