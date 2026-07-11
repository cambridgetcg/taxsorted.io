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

An agent can arrive without scraping the human site:

```text
GET https://api.taxsorted.io/agent.txt
GET https://api.taxsorted.io/.well-known/agent.txt
GET https://api.taxsorted.io/v1/wake
GET https://api.taxsorted.io/        Accept: application/json
```

The two manifests are byte-identical flat text. `GET /v1/wake` is their canonical,
deterministic JSON orientation: current dataset versions and publication states, resource
handles, source/gap/schema lanes, public-data rights, literal safety walls and typed next
actions. It is stateless and sets no identity cookie. The API root returns those same wake
bytes only when `Accept` asks for JSON; ordinary browser-shaped requests retain the normal
closed-door response. This doorway adopts useful ideas from the XENIA agent-interface and
agent-experience framework without claiming conformance or importing peer ratings.

Start at one small catalogue. It names every dataset family, version, screening or review
status, content licence, publication boundary and the route to its full distribution catalogue:

```text
GET https://api.taxsorted.io/v1/open-data
GET https://api.taxsorted.io/v1/open-data/rights
GET https://api.taxsorted.io/v1/open-data/releases
GET https://api.taxsorted.io/v1/open-data/releases/feed.json
GET https://api.taxsorted.io/v1/open-data/releases/feed.atom
GET https://api.taxsorted.io/openapi-public.json
GET https://api.taxsorted.io/openapi.json
```

The full OpenAPI document remains available for compatibility. Agents should normally use the
bounded public description or one dataset slice:

```text
GET /openapi/tax-system-uk.json
GET /openapi/tax-industry-uk.json
GET /openapi/charities-uk.json
GET /openapi/public-funding-uk.json
GET /openapi/politics-uk.json
```

Each slice is self-contained, cacheable by exact-byte ETag, and gives every operation a stable
`operationId` and one plain domain tag. Slice construction fails if a selected operation does
not explicitly declare `security: []`; an authenticated operation cannot silently enter the
public description merely because somebody mounted it under a public-looking path.

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

All four families also expose a dataset-wide resolver:

```text
GET /v1/tax-industry/uk/records/{id}
```

It returns the collection, corpus key, record and canonical collection URL, so a caller does not
need to guess which array owns an ID. While a publication gate is closed, a protected known ID
and an unknown ID deliberately return the same `503` shape; source and gap IDs retain their
documented public-while-closed access.

After the tax-industry catalogue reports that bodies are available, download a version-named
spreadsheet file:

```sh
curl --fail --location --remote-header-name --remote-name \
  https://api.taxsorted.io/v1/tax-industry/uk/exports/roles/csv
```

Under that same open state, read the data in JavaScript:

```js
const response = await fetch(
  "https://api.taxsorted.io/v1/tax-industry/uk/exports/roles/json",
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

The central release ledger is one append-only list of dataset checkpoints. Its first four rows
are baseline snapshots observed public on 2026-07-11, not claims that every record changed that
day. JSON Feed 1.1 and Atom are generated from the same rows. The Atom timestamps are explicitly
day-normalised because Atom requires date-times; they are not asserted publication times. There
is no immutable snapshot archive yet: `links.currentGraph` is mutable,
`links.immutableSnapshot` is `null`, and a mirror must accept current graph bytes for an older
checkpoint only when their SHA-256 digest matches. Deployment captures the live checkpoint
prefix before release and refuses a candidate that changes or removes an earlier row. The first
release check uses the push event's pre-push main SHA rather than assuming `HEAD^` was the last
deployed candidate.

Sector-map and central-catalogue `GET` representations also have documented `HEAD` operations.
Sector-map and central-catalogue static routes reject query parameters with `400` and `Cache-Control: no-store`;
filtering belongs on a collection query URL, not on a detail, bulk or metadata URL. Politics route
query behavior remains route-specific and is documented separately in OpenAPI.

Public errors add the RFC 9457 fields `type`, `title`, `status`, `detail` and `instance` while
retaining established `error`, `message` and endpoint-specific recovery fields. The default
media type is `application/problem+json`; a client that explicitly sends
`Accept: application/json` receives the same additive body under the legacy media type. Problem
`instance` contains only the route path, never query values that might hold a credential or
personal fact. The current HTTPS problem-type URIs are stable identifiers, not yet
dereferenceable documentation pages.

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

## Protocol choices for agents

The canonical data plane is ordinary HTTP: links, exact validators, conditional requests,
JSON/NDJSON/CSV, and stable URLs. JSON Feed and Atom add a mature polling protocol without an
account or server-held cursor. This is easy to cache, inspect, mirror and use from old or new
clients.

MCP is deliberately not the canonical data plane today. The current remote protocol adds a
JSON-RPC lifecycle, session handling and a comparatively large SDK dependency while its HTTP
transport is still evolving. A future MCP service should be a thin, separately deployable
adapter over these same URLs, not a second source of truth. SOAP, OData, SPARQL and ActivityPub
also add machinery without improving this dataset's present read-and-mirror jobs; they are not
core interfaces. DCAT or CSVW metadata may be added later when a real catalogue consumer needs
them.

## Agent orientation — one honest front door

An agent can start at either of these equivalent, ordered plain-text discovery files:

```text
GET /agent.txt
GET /.well-known/agent.txt
```

`GET` and `HEAD` are supported. Both files point to the canonical `GET /v1/wake` response,
whose schema is `taxsorted.agent-wake/1`. The API root returns the exact same wake bytes only
when `Accept` includes `application/json`; an ordinary request to `/` still gets the closed-door
`404`. The wake response states its scoped access boundary, current dataset publication states,
resource handles, evidence lanes, seven typed walls and bounded next actions. It grants no extra
access, identity or authority and does not change any publication switch. Its no-account,
no-session and no-cookie statement applies only to the doorway and listed public read routes,
not to filing or authenticated calculation services.

The charity route family also treats an error as an instruction. Its versioned
`taxsorted.charity-error/1` envelope keeps the established charity casing—`walls_intact` and
`next_actions`—while naming the request method/path. Agent-door errors use the separate
`taxsorted.agent-error/1` envelope and camel-case `nextActions`; the schema field lets a client
choose the right parser without guessing. Bounded `400`, `404` and publication-state `503`
responses state the reason and repeat the relevant safety walls. A client can
recover from a bad filter, missing ID or closed collection without silently broadening the
query. The field is a machine-readable statement about the response path; it is not a
cryptographic attestation or proof that every possible implementation defect is absent.

The doorway itself needs no account. The external GitHub correction tracker does require a
GitHub account to submit and is not a private or sensitive intake; the wake resource states both
facts explicitly.

This interaction shape was inspired by
[XENIA by Yu and Fable](https://github.com/cambridgetcg/xenia), a CC BY-SA 4.0
agent-interaction and agent-experience framework. TaxSorted adapts only the useful ideas named
here: a small machine-addressed discovery file, immediate orientation and refusals that explain
the next safe action. It does **not** adopt XENIA's ratings, decentralised identifiers, agent
identity or continuity model, tokens, wallets, covenants or broader claims about machine minds.
The wake response expressly claims no full-framework conformance.
Its CC BY-SA link applies to the adapted manifest and wake representation; TaxSorted's server source
code remains under the repository's AGPL-3.0 licence.

These are implementation facts in this workspace, not a deployment claim. After an
authorised release, retrieve both manifest paths and follow every advertised URL on the
public host before calling the door live.

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
GET /v1/charities/uk/accountability
GET /v1/charities/uk/accountability/schema
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
  "https://api.taxsorted.io/v1/charities/uk/help?helpCategory=find-an-organisation",
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

### Accountability shape: open contract, empty ledger

The two accountability routes publish a design contract only. They are useful now because a
builder can prepare structurally compatible records and challenge the comparison method before
TaxSorted collects an organisation row:

```text
GET /v1/charities/uk/accountability
GET /v1/charities/uk/accountability/schema
```

`accountability` is not one of the current charity-sector collections and has no data export,
item or ingestion route. The index describes the future dataset, its 17-entry `collectionGuide`
and the complete admission boundary; the second response is structural JSON Schema. JSON Schema
does not perform graph, digest, chronology, source-bridge, disclosure, arithmetic or release-chain
refinements. Run the checked-in zero-row example through the runtime validator:

```sh
npm run validate:charity-accountability-candidate --workspace api -- \
  research/uk/charity-accountability/examples/zero-row-candidate.json
```

The command reads one local file, makes no network request and writes nothing. A successful result
still says `candidate-not-admitted`; it is neither submission nor publication approval.

The framework status is exactly `schema-only-not-admitted`. Its stable collection order is
`organisations`, `identifierMappings`, `documents`, `voices`, `claims`, `programmes`,
`fundingEvents`, `financialFacts`, `assetAggregates`, `controlRelations`, `observations`,
`outcomes`, `evaluations`, `comparisons`, `coverageGaps`, `tombstones`, `releases`. Within an
immutable candidate assembly, records sort by a 1–100 character lowercase ASCII `id`; syntax
alone is not safety,
so IDs must also be opaque or non-personal and human-reviewed. A cursor is tied to that candidate
and cannot silently continue into another one. Candidate history is one acyclic predecessor chain;
every predecessor must have been assembled no later than its child, and every active evidence or
review timestamp must be no later than the current `candidateAssembledAt`.
A tombstone's `releaseId` names the first candidate that carries it, so its effective time cannot
be later than that candidate's assembly. It remains in every later candidate, and each release's
tombstone count equals the cumulative retained ledger through that release.

The planned ledger puts attributed public claims beside records of action while keeping the
evidence kind visible. A voice identifies the speaking organisation and its capacity. A claim
stores a human-reviewed TaxSorted paraphrase, its modality and a reviewed locator back to the
publisher's wording; it does not present the paraphrase as a quotation. Locator equality is
checked, but its exactness and resolvability are editorial assertions, not mechanical proof.
Exact words mean what was available at review time. A document states whether TaxSorted knows
only the publisher's current URL, a publisher version/digest or a lawfully archived link.
Documents,
programmes, funding events, finance facts, asset aggregates, observations, outcomes and
evaluations remain separate records. None silently stands in for another: an award is not a
payment; payment is not delivery; delivery is not an outcome; and a self-reported outcome is
not an independent evaluation. Documents may keep reviewed metadata plus bounded public
source-review declarations and notes; source bodies, excerpts, images and attachments remain
external and are not admitted or stored by the contract.
`publicDocumentAndReviewFieldsReview` covers every public document/source-review field, including
permanence text, review IDs, attribution, terms URLs, limitations, locators and notes. It asserts
that none contains
a person, contact, address, named pay, personal belief detail or belief inference about a person,
or a copied source body/excerpt; locators are pointers only, review notes are capped at five and
limitations at ten. This remains a human
assertion, not automated semantic proof.

`taxsorted-derived` is reserved for a structured
`derived-exact-arithmetic` financial fact and a labelled
`taxsorted-source-comparison` evaluation. A TaxSorted editorial number cannot
masquerade as reported, audited or restated; programmes, funding, assets,
control, observations and outcomes remain externally attributed.

Identity and context travel with the claim. A future subject-organisation join must use an exact
published register identifier. Regulators and public funders may instead use an exact canonical
official-institution URI that is explicitly not called a legal-entity ID. An award or transaction
identifier is separately namespaced when its source supplies one and can never serve as an
organisation join. Programmes and filings retain their admitted source locator; item-level asset
identity is outside this version.
`exact-published-identifier` is the mapping method and privacy review requires
`exact-published-identifier-only`; display names, similar addresses, domains and people are
never join keys. If one internal organisation carries multiple official identifiers, a separate
human-reviewed bridge must point to an admitted source locator that explicitly publishes both;
the privacy flag by itself cannot bridge registers. Every mapping must be listed by the exact
organisation it references, and every listed mapping must point back. The uppercase-alphanumeric
rule accepts only ASCII letters, digits, ordinary spaces and hyphens before canonicalisation;
punctuation and Unicode lookalikes fail. Each processed record carries its admitted source use and review;
where the record type needs them, it also carries observation time, source voice, period, defined
scope, defined metric, units, money basis, method and limitations. A comparison names the exact
records and rule used; it does not hide its reasoning in a score.

Value-bearing records cannot claim that a still-present value was “suppressed.” If a small or
unknown-population aggregate cannot be published safely, the value is omitted and a
`suppressed-for-disclosure-risk` coverage gap records the boundary with the fixed public text
“A value was omitted after disclosure-risk review.” and “No inference should be made from its
absence.” It carries no source-document pointer, so the gap cannot repeat the omitted value or
lead directly back to it. Publishable disclosure review
is required for every financial fact, anonymous or aggregate funding, programmes, observations,
outcomes and evaluations. Staff-cost and remuneration metrics,
and aggregate public donations, are always reviewed as people-derived aggregates with a stated
smallest cell; an unknown or unsafe population is omitted to a gap. A structured derived financial fact is an acyclic signed sum of at least two
distinct compatible minor-unit inputs and is recomputed by the runtime validator. Differences
must remain safe integer minor units. Ratios store the exact source numerator and non-zero
denominator; no rounded floating-point quotient is part of the base contract. A derived
financial fact follows its inputs and their reviews, then receives its own disclosure review. A
numeric comparison's disclosure review follows both records and the human comparison review. A
people-derived input forces either result to remain people-derived with its own reviewed-safe cell.
Periods must match except for an explicit `change-over-time` relation; all other context and money
basis fields must still align.

Review time has meaning. Source review follows retrieval; normalisation follows source readiness;
disclosure review follows the record it approves; final privacy review follows any applicable
normalisation and disclosure review so it sees their public text; and a comparison waits until
both referenced records and their required reviews are ready. Derived facts wait for their input
reviews; numeric-comparison disclosure review follows the comparison's editorial review.

Missing evidence is a gap, not a contradiction and not proof that an event did not happen. A
future `inconsistent-with` relation may be emitted only after human review finds logically
incompatible statements about the same exact organisation identifier, period, scope key and
definition, and metric key and definition. Two money records must also match on money basis,
measurement stage and amount date before they can carry that relation. Different dates, stages,
scopes, methods or source voices remain visible as differences. TaxSorted does not
produce an honesty, trust, faith, efficiency, value-for-money or impact ranking.

Neither route returns organisation evidence records in this release. The two named gates are the
immediate missing systems, not a complete publication checklist. `confidential-correction-safety-intake` requires a tested confidential
intake with identity-safe triage, urgent suppression and an auditable resolution path.
`asset-level-rights-admission-digest` requires every exact source asset to receive a reviewed
link decision and locator-specific derived-use decision. Its content digest detects mutation of
the declared review record; it proves neither legality nor reviewer identity. An
organisation-level publisher decision is too broad. Version 1 describes and validates only
`candidate-not-admitted` documents; no API route accepts or publishes them. All nine exposed
`admissionConditions` must also pass: controller/lawful-basis, retention and rights records; a
formal DPIA decision; expiring asset review; a deliberately small territorial field set;
end-to-end correction, suppression and rollback exercises; reviewer calibration; clear public
meaning; and a monitored emergency stop. Tombstone identifiers and release summaries receive
privacy review so correction metadata cannot repeat removed content. A future operational
publication envelope must resolve real check IDs against an audit store before any row is distributed.

Production serving uses `UK_CHARITIES_PUBLIC_DATA_ENABLED=true`; the independent
`UK_CHARITIES_EMERGENCY_STOP=true` wins. While the release is closed, the overview, sources,
register doors, gaps, manifest, schema, dictionary, export index and schema-only accountability
contract remain readable. That contract contains no organisation evidence rows for the stop to
expose. The stop cannot recall copies already downloaded or committed publicly.

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
GET /v1/public-funding/uk/records/{id}
GET /v1/public-funding/uk/changes?after={opaque-cursor}&limit=100
GET /v1/public-funding/uk/manifest
GET /v1/public-funding/uk/schema
GET /v1/public-funding/uk/dictionary
GET /v1/public-funding/uk/exports
GET /v1/public-funding/uk/exports/{collection}/{json|ndjson|csv}
```

Collection pages preserve `limit` and `offset` compatibility while adding `page.hasMore`,
body `links.self/next/prev` and matching HTTP `Link` relations. The universal resolver returns
the record's collection and canonical collection URL. It follows the resolved collection's
publication gate; it is not a route around a closed dataset.

The change feed is TaxSorted publication history, not a claim about what government did. Its
first append-only event honestly establishes the reviewed snapshot and explicitly declines to
invent retrospective per-record changes. Keep `page.nextCursor` and replay it unchanged as
`after`; TaxSorted stores no caller session. Future releases must append a matching checkpoint
or the API refuses to boot with a stale change feed. Event IDs, sequences and cursors must stay
unique and ordered; `previousEventHash` and `eventHash` form a checked hash chain so rewriting an
earlier checkpoint changes its published identity. The deployment gate also captures the live
pre-deploy event prefix, compares it with the candidate history before deployment, and then
requires that exact prefix after deployment. Production releases are serialised and both live
reads force cache revalidation.

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
  "https://api.taxsorted.io/v1/politics/uk/datasets/enforcement-governance",
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
