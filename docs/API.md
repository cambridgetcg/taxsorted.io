# TaxSorted developer API

Tax answers software can act on — and show its workings.

The first developer surface is a deterministic SDLT calculator for one ordinary residential
purchase in England or Northern Ireland. It is a bounded calculation service, not a generic
tax-advice chatbot and not yet a filing rail.

Alongside calculations, five UK maps explain the systems around the answer. The
tax-system graph covers authority, accounts, permissions, collection and challenge. The
tax-industry graph covers roles, qualifications, legal and market gates, lawful entry paths,
pay evidence and barriers. The politics catalogue covers elections, public funding, formal
office power, enforcement and evidence methods. The charity-sector graph covers official
registers, conditional tax treatments, obligations, funding, finance disclosures, control
structures and safe help routes. Their public metadata needs no API key or
taxpayer session; protected record bodies still require their explicit production-publication
switch. Static downloads make no upstream network call; clearly labelled live query services
may read their named official source.

The public-funding graph follows the pooled-tax fiscal spine into health and education across
all four nations. It separates plans, parliamentary authority, allocations and outturn; maps
formal offices, boards and functional contacts; and keeps non-comparable money visibly apart.

This guide describes the implementation in this workspace, not proof that the public host has
been deployed. After an authorised deploy, verify `/v1/health`, `/openapi.json` and the relevant
catalogue before treating an example as live.

Do not infer deployment from this file or from a local build. Check `/v1/health`,
`/openapi.json`, `/v1/open-data` and the dataset's overview on the public host; a release note
must record the verified deployment separately.

The reasons, safety boundary and known weaknesses are recorded in the
[draft public data design charter](PUBLIC-DATA-CHARTER.md). It is an agent-authored governance
proposal awaiting Yu's adoption, not settled project policy. Factual route and current-state
claims in this API guide remain testable documentation: if implementation changes one, change
the words in the same work.

## Open data — no key, no account

Start at one small catalogue. It names every dataset family, version, screening or review
status, content licence, publication boundary and the route to its full distribution catalogue:

```text
GET https://api.taxsorted.io/v1/open-data
GET https://api.taxsorted.io/v1/open-data/rights
GET https://api.taxsorted.io/openapi.json
```

The tax-system, tax-industry, charity-sector and public-funding datasets have the same prepared distribution shape. The
metadata routes remain readable when deployed; protected collection and full-graph bodies return
`503` until that family's catalogue says it is available. Source and gap collections stay readable:

```text
GET /v1/tax-industry/uk/schema
GET /v1/tax-industry/uk/dictionary
GET /v1/tax-industry/uk/exports
GET /v1/tax-industry/uk/exports/roles/json
GET /v1/tax-industry/uk/exports/roles/ndjson
GET /v1/tax-industry/uk/exports/roles/csv
```

Replace `tax-industry` with `tax-system`, `charities` or `public-funding`, and `roles` with any collection named
by that dataset's export index. When the publication switch is open, downloads are complete and unpaginated.
Query routes remain the place for search and filtering.

After the tax-industry catalogue reports that bodies are available, download a version-named
spreadsheet file:

```sh
curl --fail --location --remote-header-name --remote-name \
  https://api.taxsorted.io/v1/tax-industry/uk/exports/roles/csv
```

Under that same open state, read the data in JavaScript:

```js
const response = await fetch(
  "https://api.taxsorted.io/v1/tax-industry/uk/exports/roles/json"
);
if (!response.ok) throw new Error(`TaxSorted returned ${response.status}`);
const roles = await response.json();
console.log(roles.map(({ id, name }) => ({ id, name })));
```

Or, after the tax-system family is open, stream one record per line in Python:

```python
import json
from urllib.request import urlopen

url = "https://api.taxsorted.io/v1/tax-system/uk/exports/pipeline/ndjson"
with urlopen(url) as response:
    for line in response:
        stage = json.loads(line)
        print(stage["id"], stage["name"])
```

Tax graph JSON is a lossless array in TaxSorted's deterministic form: object keys are sorted
recursively, encoding is compact and array order is preserved. This is not RFC 8785/JCS.
NDJSON uses the same lossless form with one complete record per line. CSV is a spreadsheet
convenience copy, not a universal security boundary: arrays and objects remain deterministic
JSON inside cells, and a leading apostrophe mitigates common formula triggers beginning `=`,
`+`, `-` or `@`, including after ASCII whitespace. Importer behavior varies.

Use a record's `id`, never its array position, as identity. The dictionary explains the
friendly path aliases (`accounts` → `accountTypes`, `pipeline` → `pipelineStages`, `study`
→ `studyResources`, `gaps` → `transparencyGaps`), cross-collection references, field
conventions, nested field paths and fixed CSV columns. The schema route is the structural JSON
Schema generated from the Zod shape. The dictionary separately lists boot-only cross-field and
graph invariants—reference integrity, evidence pointers, reciprocal edges and other checks that
JSON Schema does not express.

Every readable static catalogue and open export representation carries an ETag. Dataset responses also link
their licence and schema and state their review or schema version. To mirror a file, save its
ETag and send it back later:

```sh
curl --fail --header 'If-None-Match: "sha256-…"' \
  https://api.taxsorted.io/v1/tax-industry/uk/exports/roles/ndjson
```

HTTP 304 means the validator supplied for that requested resource still matches its exact
response bytes. Keep validators per URL and format; two requests may legitimately have the
same ETag when their bytes are identical. Cache policy is stated on each response:
tax-system, tax-industry, charity-sector and public-funding release routes
revalidate within five minutes, while the deployed politics bulk catalogue revalidates
within one hour.

The catalogue also states each dataset family's current update policy and whether its correction
channel accepts private or sensitive material. The tax-system, tax-industry, charity-sector and public-funding
maps are updated irregularly when evidence changes, a correction is accepted or a new review pass
completes; there is no promised next release date. The current GitHub correction route requires an
account and is public, so it must not receive private, personal or safety-sensitive information. A
private intake is not live.

Sector-map and central-catalogue `GET` representations also have documented `HEAD` operations.
Sector-map and central-catalogue static routes reject query parameters with `400` and `Cache-Control: no-store`;
filtering belongs on a collection query URL, not on a detail, bulk or metadata URL. Politics route
query behavior remains route-specific and is documented separately in OpenAPI.

No application-level rate limit currently applies to these static public routes. Hosting and
network abuse protections may still act, so prefer one bulk export over many item requests.
The hosted endpoint is best effort, not an uptime service-level promise; the datasets,
schemas and code can be mirrored or self-hosted.

TaxSorted-written summaries and the compiled research corpus are CC BY-SA 4.0. A copy-ready
attribution line appears in each export index. Linked source material keeps its own rights;
each source ledger states the reuse information known for that source family and leaves
uncertain terms explicit. The API links to source material; it does not relicense it. The
server source code remains AGPL-3.0. Catalogues, manifests, dictionaries and export indexes
link the public GitHub issue tracker for corrections.

## Calculation service — workspace key

```text
POST https://api.taxsorted.io/v1/uk/sdlt/calculations
```

The calculation route is server-to-server. Give a workspace key in the standard header:

```text
Authorization: Bearer ts_test_...
```

Keys are 32 random bytes. The database holds only their SHA-256 digest, a harmless prefix,
their workspace, mode and scopes. The first scope is `sdlt:calculate`. Browser passkeys and
machine keys are separate identities by design.

Create a local design-partner key with a configured API database:

```bash
npm run create:api-key --workspace api -- "Firm name"
```

Add `--live` only for a production workspace. The plaintext key is shown once.

## Request

Every fact is required, including negative answers. A missing or misspelled field is rejected;
it never quietly becomes “no.” Money is integer pence. This one-dwelling scope caps supplied
consideration at £10 billion so every published pre-rounding decimal remains exact.

```json
{
  "effectiveDate": "2026-07-10",
  "chargeableConsiderationPence": 29500000,
  "land": {
    "jurisdiction": "england",
    "use": "residential",
    "interest": "freehold",
    "dwellingCount": 1
  },
  "buyerKind": "individual",
  "treatment": {
    "firstTimeBuyerRelief": "do-not-claim",
    "higherRates": "standard",
    "nonResidentSurcharge": "do-not-apply"
  },
  "specialCases": {
    "linkedTransactions": false,
    "sharedOwnership": false,
    "otherReliefClaimed": false,
    "complexConsideration": false,
    "transitionalContractMayApply": false
  }
}
```

The treatment fields are legal classifications supplied by the caller. TaxSorted does not
pretend that `additionalProperty` or `livesAbroad` is enough to resolve the statutes.

## Outcomes

`status: "calculated"` includes:

- the final tax in pence;
- every marginal band and exact rate;
- the amount removed by HMRC's final whole-pound round-down;
- reliefs and surcharges actually applied;
- decisions such as a first-time-buyer claim being over its price cap;
- primary sources, rule revision and review date;
- a SHA-256 hash of the canonical request and rule revision.

`status: "needs_review"` is an equally successful HTTP 200 response. It carries stable,
source-linked reasons and `calculation: null`. A complex case never looks like a zero-tax
answer.

The enacted table can have no known legal end date without becoming a forecast. The hosted
service therefore returns `needs_review` for an effective date after the server's current UTC
date. The separate ruleset `reviewedOn` date remains visible for research-freshness monitoring;
it is not misused as the law's expiry date.

Malformed JSON returns 400; valid JSON with missing, misspelled or invalid facts returns 422.
The route accepts `application/json` bodies up to 16 KiB; other media types return 415 and
larger requests return 413 before parsing. Missing, expired and revoked keys all return the
same 401. A real key without the scope returns 403. Every response carries `X-Request-Id`.

## What the hash means

The request hash proves that the same normalized facts and rule revision were used. It helps
callers deduplicate and compare calculations. It is not a receipt: nothing is stored by the
stateless calculation route, and the hash is not signed.

A future `prepare` or `submit` call will need an idempotency key and a stored, retrievable,
append-only record before TaxSorted calls it a receipt.

## Data boundary

The calculator does not need names, addresses, client files, Government Gateway details or
HMRC tokens. It reads the supplied transaction facts, returns the result, and does not create
a browser session. Workspace and key records are the only persistent data in this slice.

Production access still needs rate limits, a published privacy and retention statement,
security testing, key rotation/revocation operations and design-partner review. None of those
gaps is hidden by the OpenAPI document.

## The commons and the hosted service

The engine and cited rule ledger remain open. The calculation-service API key controls safe
operation and abuse; public reference-data routes need no key. Any future calculation-service
charge should pay for maintained rules, isolation, uptime, audit records and support — never
for access to the law itself.

## Public UK tax-system graph

The reviewed snapshot is available as one graph or filtered collections:

```text
GET /v1/tax-system/uk
GET /v1/tax-system/uk/graph
GET /v1/tax-system/uk/{actors|relationships|frameworks|rules|accounts|systems}
GET /v1/tax-system/uk/{permissions|pipeline|cases|sources|gaps}
GET /v1/tax-system/uk/{collection}/{id}
GET /v1/tax-system/uk/manifest
GET /v1/tax-system/uk/schema
GET /v1/tax-system/uk/dictionary
GET /v1/tax-system/uk/exports
GET /v1/tax-system/uk/exports/{collection}/{json|ndjson|csv}
```

Collection filters are exact and optional. Across the graph they include `q`, `kind`,
`sector`, `category`, `layer`, `lane`, `status`, `type`, `authority`, `jurisdiction`,
`actorId`, `stageId`, `ruleId`, `systemId`, `sourceId`, `limit` and `offset`. The dictionary
lists only the filters valid for each collection. Unknown, irrelevant or repeated filters
and unknown referenced IDs return 400 so a misspelling cannot silently broaden a legal
query. A schema-defined enum value with no matching record is valid and returns an empty page;
a value outside that enum returns 400. `q` is capped at 100 characters; `limit` is 1–100.

Every non-source detail response resolves its sources. Every substantive non-source record also
carries field-level evidence pointers, a page or statutory locator and observation date.
Source-detail responses are the ledger entries themselves; those records say both what
they support and what they do not prove. Manuals, guidance, primary law, judgments,
registers and oversight material remain distinct.

The enforcement path uses `nextStageIds`, not a promised sequence: HMRC itself says its
powers are conditional and not listed in a fixed order. Registration, AML supervision,
professional authorisation, client authority, account access, API access and software
recognition are separate permission objects.

Responses are read-only, wildcard-CORS, sessionless and cacheable. A validator for the exact
response bytes supports weak, list and wildcard `If-None-Match`; clients keep it with the URL
and format that produced it. The graph contains no taxpayer data or actual identifiers.
Production publication is an explicit switch; while closed, `sources`, `gaps`, `manifest`,
`schema`, `dictionary` and the export index remain public. Source and gap exports remain
downloadable; protected graph and collection exports return 503 with `no-store`.

The publication flag is a hosted-current-service switch, not confidentiality or revocation.
Once a corpus is committed to the public repository or copied under its licence, that copy
cannot be recalled. Sensitive or unapproved material must never enter the public static corpus.

The human map and method live in [`research/uk/tax-system/`](../research/uk/tax-system/).

## Public UK tax-industry graph

The industry map keeps four facts separate: what the law requires, what a regulator or
platform requires for particular work, what a professional body requires of its members,
and what employers or clients commonly prefer. A qualification is never presented as a
national licence merely because it is useful or prestigious.

```text
GET /v1/tax-industry/uk
GET /v1/tax-industry/uk/graph
GET /v1/tax-industry/uk/{sources|institutions|roles|qualifications|gates}
GET /v1/tax-industry/uk/{pathways|study|compensation|barriers|gaps}
GET /v1/tax-industry/uk/{collection}/{id}
GET /v1/tax-industry/uk/manifest
GET /v1/tax-industry/uk/schema
GET /v1/tax-industry/uk/dictionary
GET /v1/tax-industry/uk/exports
GET /v1/tax-industry/uk/exports/{collection}/{json|ndjson|csv}
```

Collection filters are exact and optional: `q`, `kind`, `category`, `status`,
`legalStatus`, `type`, `gateId`, `roleId`, `qualificationId`, `institutionId`, `sourceId`,
`limit` and `offset`. Each collection accepts only filters that describe it; unknown or
irrelevant filters return 400 instead of quietly producing a broad or empty result. Pathway
`gateId` and `qualificationId` filters inspect the pathway steps. `q` is capped at 100
characters and `limit` is 1–100. Repeated parameters and unknown enum/record IDs return 400.
A schema-defined enum value that is not present in the current snapshot instead returns a valid
empty page.

Role detail joins the gates, qualifications, pathways and compensation records that refer
to it. Institution detail joins qualifications, gates, compensation and barriers.
Qualification detail joins study resources, pathways, gates and barriers. Every non-source
detail response resolves its source records. Source-detail responses are the ledger entries
themselves, and their `doesNotProve` fields are part of the contract.

Responses are read-only, wildcard-CORS, sessionless and cacheable; ETags support conditional
GETs. The corpus contains no taxpayer records. Production publication uses the
independent `UK_TAX_INDUSTRY_PUBLIC_DATA_ENABLED=true` switch. While it is closed, the
overview, `sources`, `gaps`, `manifest`, `schema`, `dictionary` and export index remain
public; source and gap exports remain downloadable; protected collections, exports and the
full graph return 503.

As with the tax-system graph, this switch controls only the current hosted service. It is not
confidentiality or revocation, and it cannot recall a public-repository or lawfully mirrored copy.
Sensitive or unapproved material must never enter the public static corpus.

The map is dated evidence, not legal, careers or earnings advice. Compensation records keep
salary, apprenticeship wage, partner profit share, fee income and service-line revenue as
different measures; they are not personal earnings promises.

The plain-language route map, launch boundary and reading guide live in
[`research/uk/tax-industry/`](../research/uk/tax-industry/).

## Public UK charity-sector graph

This first release explains the system around UK charities and religious organisations. It
does not mirror individual charities. Religion is an organisation-level charitable-purpose
category only; the API never infers or indexes a person's belief. A charity is normally
governed and its assets stewarded for charitable purposes, not owned like an equity company.

```text
GET /v1/charities/uk
GET /v1/charities/uk/map
GET /v1/charities/uk/graph
GET /v1/charities/uk/{sources|regulators|registers|legal-forms|tax-treatments}
GET /v1/charities/uk/{obligations|funding|finance|control|help|pipeline|gaps}
GET /v1/charities/uk/{collection}/{id}
GET /v1/charities/uk/manifest
GET /v1/charities/uk/schema
GET /v1/charities/uk/dictionary
GET /v1/charities/uk/exports
GET /v1/charities/uk/exports/{collection}/{json|ndjson|csv}
```

For example, mirror every reviewed tax-treatment explanation without an account:

```sh
curl --fail --location --remote-header-name --remote-name \
  https://api.taxsorted.io/v1/charities/uk/exports/tax-treatments/ndjson
```

Or discover the official organisation-search doors from an application:

```js
const response = await fetch(
  "https://api.taxsorted.io/v1/charities/uk/help?helpCategory=find-an-organisation"
);
if (!response.ok) throw new Error(`TaxSorted returned ${response.status}`);
const { data: routes } = await response.json();
```

The records answer what each regulator and register covers, how legal forms hold assets,
which tax treatments may apply and on what conditions, what charities must report, which
funding mechanisms exist, how accounts expose finance and aggregate pay, and which generic
official or organisation-level route a person can use to ask for help. `q`, `limit` and
`offset` are bounded; exact filters are collection-specific and listed by the dictionary.
There is deliberately no person, trustee-name, personal-contact, religion, denomination,
recipient or donor filter.

Relief is not described as a reward for religion or as blanket tax exemption. Advancement of
religion is one possible charitable purpose, but charitable status still depends on the
applicable charity test and public benefit; HMRC tax recognition and charitable use of funds
add separate conditions. VAT relief is limited rather than universal. TaxSorted's explanation
of the policy bargain is labelled as analysis, not legislation.

The corpus contains no charity-by-charity rows, people directory, work histories, named pay,
home addresses, personal email or phone numbers, donor, beneficiary, congregation or volunteer
identities, inferred beliefs, or fuzzy cross-register matches. Complete organisation discovery
is delegated to the official register doors in the `registers` collection. A later partitioned
organisation layer needs an explicit inclusion rule, source-by-source rights checks, exact-ID
joins, a private safety/correction route and a fresh privacy assessment before publication.

Production serving uses `UK_CHARITIES_PUBLIC_DATA_ENABLED=true`; the independent
`UK_CHARITIES_EMERGENCY_STOP=true` wins. While the release is closed, the overview, sources,
register doors, gaps, manifest, schema, dictionary and export index remain readable. The stop
cannot recall copies already downloaded or committed publicly.

The method, publication assessment and reading guide live in
[`research/uk/charities/`](../research/uk/charities/).

## Public UK funding graph

The funding graph answers a deliberately narrower and more honest question than “where did my
tax pound go?” Most UK tax receipts enter pooled public funds, so an ordinary receipt cannot be
traced to one school, hospital or programme. The API instead maps the evidenced chain from
collection, parliamentary authority and Treasury control to departmental allocations, delivery,
accounts, audit and scrutiny.

```text
GET /v1/public-funding/uk
GET /v1/public-funding/uk/graph
GET /v1/public-funding/uk/{sources|institutions|governance|offices}
GET /v1/public-funding/uk/{relationships|funds|programmes|mechanisms|allocations}
GET /v1/public-funding/uk/{contacts|locations|pipeline|gaps}
GET /v1/public-funding/uk/{collection}/{id}
GET /v1/public-funding/uk/manifest
GET /v1/public-funding/uk/schema
GET /v1/public-funding/uk/dictionary
GET /v1/public-funding/uk/exports
GET /v1/public-funding/uk/exports/{collection}/{json|ndjson|csv}
```

All money is integer pence. Read `financialYear`, `status`, `budgetBoundary`,
`accountingBasis`, `grossOrNet`, `priceBasis`, `containedInAllocationId`,
`notComparableToIds` and `traceabilityWarning` before combining figures. Programme
`beneficiaryTags` make children, young people, learners and future workforce investment
findable; they are overlapping labels, not additive spending totals.

The corpus contains public-body classes and formal offices, not copied current-holder names.
Each office links to the dated official holder publication. Contacts are generic functional
routes and locations are published non-residential institutional addresses. Source and gap
records remain readable while production publication is closed. Production serving uses
`UK_PUBLIC_FUNDING_PUBLIC_DATA_ENABLED=true`; the independent
`UK_PUBLIC_FUNDING_EMERGENCY_STOP=true` wins.

The plain-language guide and method live in
[`research/uk/public-funding/`](../research/uk/public-funding/).

## Public UK politics and integrity API

The politics API separates people, institutions, formal office powers and source-reported
finance events. Non-personal methods and organisation-first records require no account or
taxpayer session.

### Start here: no key

Datasets marked open are free, read-only and available to browser and server applications
through wildcard CORS after this API release is deployed. There is no sign-up, token or special
request header. The workspace production configuration fails record bodies closed pending human
approval of the boundary and admission ledger, plus a confidential safety-reporting route; once deployed,
the catalogue, rights statement, bulk dataset schemas and correction method remain readable.

```bash
curl -fsS \
  'https://api.taxsorted.io/v1/politics/uk/datasets' \
  -o taxsorted-politics-catalogue.json
```

Only after the catalogue marks a dataset `open` should a caller fetch its record or download
URL. `development-preview` means local access without a human release; `publication-review`
means no approval is recorded; `approved-disabled` means approval is recorded but hosted
serving is off; `emergency-stopped` overrides every bulk body. In production, `open` requires
the serving switch, public approver, approval date, exact current admission-ledger digest and
an HTTPS confidential-intake URL together.

The root points to the catalogue. `/manifest` is a stable catalogue alias for automated
discovery.

```text
GET /v1/politics/uk
GET /v1/politics/uk/manifest
GET /v1/politics/uk/datasets
GET /v1/politics/uk/datasets/schema
GET /v1/politics/uk/datasets/rights
GET /v1/politics/uk/datasets/admissions
GET /v1/politics/uk/datasets/{datasetId}
GET /v1/politics/uk/datasets/{datasetId}/schema
GET /v1/politics/uk/datasets/{datasetId}/download?format=json
GET /v1/politics/uk/datasets/{datasetId}/download?format=csv
GET /v1/politics/uk/datasets/{datasetId}/download?format=ndjson
```

A politics JSON dataset is a self-describing envelope with `dataset`, `data` and `links`—not a
raw array. CSV carries one record per row; array and object values use TaxSorted deterministic
JSON inside one cell. NDJSON carries
one complete record per line for streaming. The catalogue supplies exact distribution URLs,
record counts, field names and observed types, privacy class, coverage, update cadence, licence
notes and the official `sourceIds` used by each dataset.

Dataset and record IDs are opaque permanent identifiers and must not be recycled. Join on
those IDs or exact official identifiers, not display names. The current release uses explicit
IDs, but a public release and tombstone ledger is still needed to audit non-reuse across time.
New optional fields may be added within schema major
1; removing a field, making one required or nullable, or changing its type, meaning, primary
key or money unit requires a new schema major. Keep `sourceIds` where present; source-ledger
records instead carry their own `sourceId` and official URL. TaxSorted's curation licence does
not replace a source publisher's terms; consult the catalogue licence and the
`official-sources` dataset before redistributing a mirror. The HTTP `rel="license"` link points
to `/datasets/rights`, which explicitly separates the curation licence from source-specific
rights instead of presenting one blanket licence to automated reusers.

Every readable catalogue and open static dataset representation has an `ETag`. A mirror should retain it and
send it back as `If-None-Match`; an unchanged representation returns HTTP 304 without another
body. ETags are representation-specific, so retain one for each JSON, CSV or NDJSON file.
Dataset responses also carry `X-Dataset-Version`, `X-Schema-Version`, `X-Record-Count` and
`X-Checksum-SHA256`.

```bash
curl -fsS \
  --etag-save taxsorted.etag \
  --etag-compare taxsorted.etag \
  'https://api.taxsorted.io/v1/politics/uk/datasets' \
  -o taxsorted-politics-catalogue.json
```

```js
const response = await fetch(
  "https://api.taxsorted.io/v1/politics/uk/datasets/enforcement-governance"
);
if (!response.ok) throw new Error(`TaxSorted returned ${response.status}`);

const { dataset, data } = await response.json();
console.log(dataset.id, dataset.licence, data);
```

### Query and method routes

```text
GET /v1/politics/uk/system
GET /v1/politics/uk/elections/process
GET /v1/politics/uk/funding/{rules|public}
GET /v1/politics/uk/power/{method|offices}
GET /v1/politics/uk/integrity
GET /v1/politics/uk/integrity/sources
GET /v1/politics/uk/integrity/corrections
GET /v1/politics/uk/relationships/{schema|datasets}
GET /v1/politics/uk/relationships/contracts?from=YYYY-MM-DD&to=YYYY-MM-DD&take=20
GET /v1/politics/uk/enforcement/{institutions|governance|ranks|pay-benefits}
GET /v1/politics/uk/enforcement/{workforce|funding|vacancies|activities}
GET /v1/politics/uk/enforcement/private-security
GET /v1/politics/uk/enforcement/power/{method|offices}
GET /v1/politics/uk/enforcement/forces
```

Contract windows are bounded to 31 days and 20 releases. The façade strips addresses,
contact people, direct contacts and attachment bodies. A supplier name appears only with a
verified public organisation identifier. Money is integer minor units. Every record says
that an award does not establish political involvement, influence, favouritism or wrongdoing.

The law-enforcement graph is not one command chain. Appointment, strategy, funding,
operational direction, complaint oversight, inspection and prosecution are distinct edge
types with explicit negative constraints. Formal-authority cards rate offices, not holders,
and show all seven dimensions; there is no global leaderboard.

Named current-member, political-finance, ministerial-benefit and senior-police-office routes
have separate fail-closed production gates. Named responses are never shared-cacheable. The
master personal-data emergency stop overrides every named gate. No route provides private
addresses, natural-person reverse property search, lower-rank personnel dossiers, live
operations, individual complaints or allegations, or inferred personality and corruption
scores.

The human map and publication contract live in
[`research/uk/politics/`](../research/uk/politics/).
