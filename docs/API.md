# TaxSorted developer API

Tax answers software can act on — and show its workings.

The first developer surface was a deterministic SDLT calculator for one ordinary residential
purchase in England or Northern Ireland. The second is an evidence-backed MTD Income Tax
readiness assessment and public capability registry. Both are bounded services, not a generic
tax-advice chatbot and not a filing rail.

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
actions. It also advertises authenticated task tools under a separate access contract, rather
than folding their methods or credentials into the read-only doorway. It is stateless and sets
no identity cookie. The API root returns those same wake
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
GET /openapi/accountability-uk.json
GET /openapi/case-commons-uk.json
GET /openapi/professional-opportunities-uk.json
GET /openapi/tax-expert-uk.json
GET /openapi/professional-tools-uk.json
```

The tax-expert slice also publishes the portable, browser-local Tax Position
Passport contract:

```text
GET /v1/uk/tax-expert/tax-position-passport/schema
GET /v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax
```

Both are static public reads with synthetic or structural data only. They do
not accept a Passport, taxpayer facts or documents and do not create a server
record. The human browser builds and optionally saves the Passport locally,
then exports `taxsorted.uk.tax-position-passport/1`. See
[`TAX-POSITION-PASSPORT.md`](TAX-POSITION-PASSPORT.md).

The JSON Schema covers the bounded wire structure. Cross-field meaning is
additionally checked by `assertTaxPositionPassportInvariants` from
`@taxsorted/engine/uk/passport`; the schema lists those checks in
`x-taxsorted-runtime-invariants`. The unsigned envelope keeps request and answer
together but does not prove derivation; a relying consumer can replay the
request. The served Passport schema is a self-contained, committed snapshot
generated from the canonical Zod contract before release. API startup serves
that JSON file without converting the nested Passport contract into a second
JSON Schema graph. Cross-field MTD request rules, including cessation
chronology, are enforced by the Passport runtime invariant check.

Each slice is self-contained, cacheable by exact-byte ETag, and gives every operation a stable
`operationId` and one plain domain tag. Dataset and framework slices fail construction if a
selected operation does not explicitly declare `security: []`. The tax-expert task slice is a
different class: it intentionally contains a public capability `GET` and a secured assessment
`POST`, preserving the operation-level `WorkspaceKey` security declaration and required
`tax-expert:assess` scope. The professional-tools slice joins that assessment, the public
capability registry and the residential SDLT calculation into one bounded contract while keeping
each operation's own scope and security declaration.

The observer-accountability doorway is a framework and candidate contract, not an admitted
case dataset:

```text
GET /v1/accountability/uk
GET /v1/accountability/uk/schema
```

The framework makes investigation power inspectable through exact institutional identity,
mandate, commissioning, funding, method, evidence selection, limits, words, public actions,
structured action targets and referral destinations, responses, corrections and challenge
routes. Its candidate schema has five collections:
`institutionalRelations`, `investigationEngagements`, `investigationActions`,
`institutionalResponses` and `coverageGaps`. Every observer must have a sourced accountability
or challenge relation, or an explicit unmapped-route gap. All five collections are currently
zero-row. There are no named-investigator profiles, private networks, unpublished or operational case files, witness data,
operational tactics, trust scores or motive inferences. Schema validation cannot replace source
rights, operational privacy review, confidential correction intake, human approval or a tested
off-switch. Literal privacy flags and structural validation cannot detect personal data,
allegations or unsafe context hidden in free text; every field still needs human review.
Disclosure states carry field-specific receipts or a scoped, dated coverage gap, and an active
"not published" gap cannot coexist with a fully published state.

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
resource handles, evidence lanes, eight typed walls and bounded next actions. It grants no extra
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

## Shared why graph — follow an answer to its receipts and limits

The public why-graph framework is a sessionless, read-only explanation contract:

```text
GET /v1/why-graph
GET /v1/why-graph/adopters
GET /v1/why-graph/schema
GET /openapi/why-graph.json
```

The task-sized OpenAPI keeps `#/components/schemas/WhyGraph` explicitly and names it in
`x-taxsorted-shared-components`, even though the two public routes return the framework and the
structural JSON Schema rather than a taxpayer graph instance.
Version 1 uses bounded typed JSON adjacency because agents can consume it directly through ordinary
JSON and OpenAPI. Stable IDs and naturally directed relations leave a clean later projection to
JSON-LD or RDF; v1 does not make every caller resolve an external context.

It defines `taxsorted.why-graph/1`. Start at `rootNodeId`, then follow edges outward from the
conclusion. A reached reasoning step selects exact fact records by stable path, distinguishes a
binding rule that was decisive from one merely checked, and connects claims and rules to admitted
sources. Separate relations name who legally holds a duty, who performs an action, who administers
the regime and who has power to make an official decision. Consequences, correction routes and
known gaps remain part of the same traversal.

The graph is connective tissue, not a replacement ontology. Referenced answer and public-dataset
records remain canonical. Supplied case-level financial and identity fact values are not copied
into graph text or IDs; fixed public rule parameters may still be named as rules.
Fact nodes carry selectors back to the containing answer. Node and edge IDs are semantic, arrays
are ASCII sorted, every endpoint must resolve, every node must be reachable from the conclusion
and cycles fail runtime validation. JSON Schema checks only the structural part of that contract.

The adopter index names current producers and keeps their access boundaries separate. The first
adopter lives at `/reasoning/whyGraph` in successful MTD Income Tax assessments. The
field is optional in the published `taxsorted.tax-answer/1` OpenAPI schema. This is additive for
forward-compatible v1 readers; strict validators must refresh the OpenAPI document and capability
version before accepting the new response member. The current MTD capability always emits it and
declares that fact through an OpenAPI extension. Its graph contains only reached or explicitly
blocking decision records, so a return-duty exit does not pretend that continuation or cessation
facts were read, or that threshold, exemption and obligation stages ran.

The second adopter is the standalone public template
`/v1/charities/uk/tax-treatments/{id}/why-graph`. It traces all nine substantive treatment fields
through exact `sourceId + JSON Pointer` evidence declarations. A `dataset-record` reference still
selects the whole canonical record; adopter `claimSelectors` carry the exact field pointers without
inventing fragment semantics in WhyGraph/1. The current corpus has guidance rather than admitted
primary-law records, so binding provisions, case applicability and official challenge routes remain
explicit gaps. Guidance never becomes a rule node.

TaxSorted's conclusion has `authority: taxsorted-analysis`, `effect: advisory` and
`externalStateChange: false`. Correcting TaxSorted's explanation is not an HMRC review. An exact
statutory review, appeal, complaint, payment-support or enforcement route needs the actual official
notice, decision type, date and jurisdiction. Until those facts exist and the route is mapped, the
graph ends in `gap:official-enforcement-and-review-route`; it never invents an appeal right.
The graph keeps the caller, relevant-person duty holder, administrator and official decision-maker
separate. It does not invent an authorised-agent identity: who will actually perform a duty and any
authority to act remain an explicit gap unless a future capability can prove them.

## UK professional opportunity atlas — read-only research

The atlas maps source-backed classes of specialist work rather than private
claimants or professional leads:

```text
GET /v1/professional-opportunities/uk
GET /v1/professional-opportunities/uk/method
GET /v1/professional-opportunities/uk/opportunities
GET /v1/professional-opportunities/uk/opportunities/{id}
GET /v1/professional-opportunities/uk/scrutiny
GET /v1/professional-opportunities/uk/sources
GET /v1/professional-opportunities/uk/assessment-template
GET /v1/professional-opportunities/uk/assessment-schema
GET /v1/professional-opportunities/uk/schema
GET /v1/professional-opportunities/uk/packet-schema
GET /v1/professional-opportunities/uk/rights
GET /openapi/professional-opportunities-uk.json
```

All routes are sessionless `GET`/`HEAD` resources with wildcard public CORS,
ETags and exact-byte checksums. They accept no query, body, account or key.
There is no POST route, private intake, professional matching, firm ranking,
revenue estimate, win probability, filing or external action.

An opportunity packet resolves all of its cited official sources and relevant
institutional-scrutiny records. Its content digest identifies the canonical
packet fields; it does not establish truth, current law, professional status or
the merits of a private matter. Evidence labels keep court findings, oversight
findings, official statistics, stakeholder assessments and TaxSorted fairness
questions distinct.

The shared workflow also carries three source-resolved route guides: appeal or
statutory review, complaint through the Adjudicator and PHSO, and judicial
review in England and Wales. Their route, deadline and boundary wording is part
of the exact corpus digest rather than duplicated in the frontend.

The blank assessment is a portable local contract. A professional can validate
a completed private copy without sending it anywhere:

```bash
npm run validate:professional-opportunity-assessment -- \
  ./private-assessment.json
```

The validator checks schema shape and finite internal stage and terminal-decision
transitions only. Packet id, version and digest are caller-maintained references:
the command does not fetch the public packet or verify that identity, a register,
professional status or a declaration against an external source. Required fields
depend on the reached stage and terminal decision. It prints no file path, field
name, value, raw validation message or client fact. Completed files remain in the
firm's approved matter system and have no TaxSorted submission endpoint.

Production packet publication additionally requires the exact corpus-bound
approval, a complete machine-checked qualified UK professional review record and
`UK_PROFESSIONAL_OPPORTUNITIES_PUBLIC_DATA_ENABLED=true`.
That review record must identify the reviewer and capacity, completion date and
evidence reference, and must affirm current law and territory, privacy and threat
review, no intake or marketplace, an exercised emergency-stop drill, and assigned
correction and withdrawal owners. It must also record a public-safe institutional
right-of-reply disposition, basis and evidence reference. Review cannot predate
source retrieval and the decision cannot predate review. Do not put private contact,
client or matter evidence in this record. Missing or partly false review data fails
closed.
`UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP=true` closes the packet surface;
`UK_PROFESSIONAL_OPPORTUNITIES_STOPPED_IDS` can contain exact stable IDs.
While qualified review is pending or the global stop is active, only the
schemas, rights and blank local assessment remain inspectable; the substantive
method and source ledger close with the atlas.

The separately deployed static site has its own public-data and emergency-stop
build variables with the same names. Neither deployment can recall a downloaded
copy.

## Professional tools — lawyers and accountants

Start here for the two professional jobs that are executable now:

```text
GET /v1/uk/professional-tools
GET /openapi/professional-tools-uk.json
```

The public manifest is the honest integration doorway for solicitors, conveyancers, accountants
and tax advisers. It contains complete request examples, required workspace scopes, review stops,
retry boundaries, evidence returned, facts not to send and the practice capabilities that do not
exist. The task-sized OpenAPI includes:

```text
GET  /v1/api-workspace                                valid key; no task scope
POST /v1/uk/sdlt/calculations                         scope: sdlt:calculate
POST /v1/uk/tax-expert/mtd-income-tax/assessments     scope: tax-expert:assess
```

The two POST task calls are stateless and server-to-server. Repeating one creates no application
record, filing or other external state change, but a later response is not promised to be
byte-identical after the trusted evaluation date, ruleset or source ledger changes. The OpenAPI
request bodies contain complete examples, and each task's `401` or `403` response links back to
this manifest and slice. The separate GET inspection has no task scope, query parameters, request
body or `403` state.

Access remains a material gap. Workspace keys are operator-issued to existing design partners.
Operators can issue an expiring key, inspect it, create an overlapping replacement and explicitly
revoke it. A caller can use `GET /v1/api-workspace` to inspect only the presented key without
sending client facts. There is still no public self-service provisioning, confidential
access-request intake or secure public key-delivery channel, and a browser account does not provide
a workspace key. Do not put client facts or access requests in the public GitHub issue tracker. A
workspace key identifies the calling workspace. Financial and transaction facts may still be
personal data even when the request omits names, NINOs, UTRs and addresses; the caller remains
responsible for its lawful basis, minimisation and matter-file controls.

These routes are not a professional practice system. They do not provide client or matter records,
caller matter references, document storage, portfolio or batch operations, firm roles and
approvals, HMRC agent authority, filing, an immutable evidence archive, a signed evidence pack or a
production SLA. The separate browser HMRC rail is sandbox-only and is not connected to workspace
keys. No professional rate-limit contract, privacy and retention policy, published security
assessment, self-service key lifecycle, authenticated operator audit trail, high-availability
contract or SLA is published.

A firm relying on a result must retain the exact request, exact response, `X-Request-ID`, returned
request hash when present, capability or ruleset versions, relied-on sources, fact classification,
reviewer and sign-off in its own matter file. TaxSorted returns a bounded computation, not a
retrievable professional file or submission receipt.

### Inspect the presented workspace key

```text
GET /v1/api-workspace
Authorization: Bearer ts_test_...
```

This call requires a valid key but no task scope. Send no query string and no declared request body;
either is rejected with `400` before authentication and supplied values are not echoed. It accepts
no client facts, makes no change and returns `Cache-Control: no-store`. It is server-to-server;
browser bearer calls are not enabled by CORS. The response identifies the workspace and presented
key by UUID, gives the harmless key prefix, mode, sorted scopes, creation timestamp and expiry, and
marks each current professional task as authorised or not authorised. `expiresAt` can be `null` on
a legacy non-expiring key; every key created by the current operator commands has a finite expiry.
The response does not return the workspace or key name, any sibling key, hash, secret, revocation
history, browser identity or HMRC
connection. A missing, expired, revoked or suspended credential returns the same `401 invalid_token`
shape; this endpoint has no insufficient-scope `403` state.

## UK tax expert — coverage and first deep path

The public capability registry separates product depth into six honest stages:

```text
GET /v1/uk/tax-expert
mapped → explained → classified → calculated → prepared → filed
```

It needs no account or key. A mapped capability is not advertised as calculated, and a prepared
capability is not advertised as filed. The registry currently marks MTD Income Tax readiness and
residential SDLT as the two available deep paths; other journeys keep their exclusions visible.

The first expert assessment is server-to-server:

```text
POST /v1/uk/tax-expert/mtd-income-tax/assessments
Authorization: Bearer ts_test_...
Content-Type: application/json
```

It requires the `tax-expert:assess` workspace scope. The task-sized OpenAPI 3.1 description is:

```text
GET /openapi/tax-expert-uk.json
GET /openapi/professional-tools-uk.json
```

The assessment is repeatable for the same request facts, trusted server evaluation date and
admitted ruleset and source ledger; the request alone does not promise byte-identical output on
another date. It is stateless. It does not collect a name, NINO, UTR or address, does not sign
anyone up, does not file, and does not write request facts to application storage. A workspace
key still identifies the calling workspace. Keys are operator-created for credentialed design
partners; there is no public self-service key-provisioning or confidential access-request route.
The browser version at `/uk/tax-expert` runs the same engine locally without calling this route.

Every fact is explicit. `"unknown"` is different from zero or false. Money is non-negative integer
pence. The entry fact records whether the person was required to deliver the relevant 2024/25
return, so failing to file cannot create an escape. Current classification uses period-specific
residence and admitted return figures; later working figures stay labelled as forecasts.

```json
{
  "schema": "taxsorted.uk.mtd-income-tax.request/1",
  "asOfDate": "2026-07-11",
  "person": {
    "relevantReturnPosition": "required-and-submitted",
    "hadNationalInsuranceNumberAtStartOf2026To27": true
  },
  "income": {
    "taxYears": {
      "2024-25": {
        "basis": "submitted-return",
        "residence": "uk-resident",
        "selfEmploymentGrossPence": 4000000,
        "ukPropertyGrossPence": 500000,
        "foreignPropertyGrossPence": 600000
      },
      "2025-26": {
        "basis": "working-estimate",
        "residence": "uk-resident",
        "selfEmploymentGrossPence": 0,
        "ukPropertyGrossPence": 0,
        "foreignPropertyGrossPence": 0
      },
      "2026-27": {
        "basis": "unknown",
        "residence": "unknown",
        "selfEmploymentGrossPence": "unknown",
        "ukPropertyGrossPence": "unknown",
        "foreignPropertyGrossPence": "unknown"
      }
    },
    "atLeastOneRelevantReturnActivityContinuedAtEntry": true,
    "lastRelevantActivityCessationDate": "at-least-one-continues",
    "relevantReturnWasAmended": false,
    "annualisationOrOtherSpecialRulesMayApply": false
  },
  "exemption": {
    "returnIndicators": [],
    "digitalExclusion": "not-approved-or-pending",
    "otherExemptionApplication": "none"
  },
  "reporting": {
    "updatePeriod": "standard"
  }
}
```

The response uses `taxsorted.tax-answer/1`. It keeps these parts separate:

- capability version and task;
- effective date, independent evaluation date, knowledge date, period, territory and rules;
- provided, derived and unknown facts, plus any real assumptions;
- answer and step-by-step reasoning;
- an additive why graph showing the reached and decisive path without copying financial values;
- claims and sources, with source kind and legal force separated;
- confidence basis and blockers — explicitly not a probability;
- escalation reasons, facts needed and useful next actions;
- data-use and retention statement.

Possible MTD decisions are `in_scope`, `out_of_scope`, `exempt`, `exemption_possible`,
`hmrc_decision_needed`, `insufficient_facts`, `professional_review_needed`,
`source_review_required` and `outside_supported_date`. An application-based exemption is always an
HMRC decision. Return amendments, annualisation and other admitted special cases stop for review.
Automatic exemptions are derived only from concrete return indicators or NINO status; callers do
not submit a generic legal conclusion. A separate HMRC status records any application based on an
indicator expected on a later return, so an unreviewed future exemption cannot be silently missed.

The exact April 2026 boundary is tested: £50,000 is not over the threshold; £50,000.01 is. Gross
self-employment and property income are added before expenses. UK residents include foreign
property income; non-UK residents generally include UK property and self-employment admitted to the
UK return. Employment, an individual's partnership profit share, dividends and pensions are not
included in MTD qualifying income.

For the 2026/27 cohort the answer shows 7 August, 7 November, 7 February and 7 May quarterly
deadlines, then the annual return and payment path. Regulation 5 activity continuity is tied to an
activity represented on the relevant return: a different new source cannot stand in for it. A
mid-year final-entry-activity cessation keeps the notice, the final update for the cessation period
and the annual return. An exempt person keeps normal Self Assessment: paper and online filing
deadlines are shown separately, and payment remains due on 31 January. There is no penalty for
missing a 2026/27 quarterly-update deadline, but required updates must still be sent before the
return; that penalty note is never attached to an exempt or out-of-scope answer.

Tax calculation bodies also reject duplicate JSON object fields before normal schema parsing. This
prevents two systems from reading different values from an ambiguous request. Malformed or duplicate
JSON returns `400`; wrong media type `415`; oversize bodies `413`; a valid JSON shape with missing or
extra facts `422`. Error bodies never reflect submitted financial values.

This is an expert contract, not a generic tax chatbot. A later conversational layer may ask for the
next fact and explain admitted results, but it cannot invent rates, change rules, override the engine
or submit to HMRC.

## Calculation service — workspace key

```text
POST https://api.taxsorted.io/v1/uk/sdlt/calculations
```

The professional doorway and the task-sized OpenAPI that includes SDLT are public:

```text
GET https://api.taxsorted.io/v1/uk/professional-tools
GET https://api.taxsorted.io/openapi/professional-tools-uk.json
```

The calculation route is server-to-server. Give a workspace key in the standard header:

```text
Authorization: Bearer ts_test_...
```

Keys are 32 random bytes. The database holds only their SHA-256 digest, a harmless prefix,
their workspace, mode and scopes. Browser passkeys and machine keys are separate identities by
design. New keys default to `sdlt:calculate`; request only the expert scope when that is the task:

Create a design-partner workspace from a private terminal with the intended API database configured.
The command requires a finite expiry no more than 400 days after the database clock:

```bash
EXPIRES_AT="$(node -e 'console.log(new Date(Date.now() + 365 * 864e5).toISOString())')"
npm run create:api-key --workspace api -- \
  "Firm name" \
  --expires-at="${EXPIRES_AT}" \
  --scope=sdlt:calculate \
  --scope=tax-expert:assess
```

Add `--live` only for a production workspace. The plaintext key is shown once; the database stores
only its digest and safe prefix.

Existing workspaces use the operator lifecycle command:

```bash
npm run manage:api-key --workspace api -- --help
npm run manage:api-key --workspace api -- inspect --key-id="${KEY_ID}"
npm run manage:api-key --workspace api -- issue \
  --workspace-id="${WORKSPACE_ID}" \
  --mode=test \
  --scope=sdlt:calculate \
  --scope=tax-expert:assess \
  --expires-at="${EXPIRES_AT}" \
  --name="design partner replacement"
npm run manage:api-key --workspace api -- rotate \
  --key-id="${OLD_KEY_ID}" \
  --expires-at="${EXPIRES_AT}" \
  --name="verified replacement"
npm run manage:api-key --workspace api -- revoke \
  --key-id="${OLD_KEY_ID}" \
  --confirm-prefix="${OLD_KEY_PREFIX}"
```

`rotate` preserves the old key's mode and scopes and leaves it active. Deliver the new plaintext
through an independently agreed private channel, call `GET /v1/api-workspace` with it, move the
consumer, verify it, and only then revoke the old UUID and exact safe prefix. By default, revocation
requires another active key in the same mode, containing every old scope and valid for more than
five minutes. `--allow-last-key` is the explicit emergency off-switch; it can leave the workspace
unable to authenticate. These commands are operator tools, not a self-service or authenticated
administration API, and they do not create an operator audit trail.

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
- the trusted server evaluation date used for the future-date boundary;
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
callers deduplicate and compare calculations. It does not cover `trust.evaluatedOn`, which is
returned separately because the hosted future-date stop depends on the server's UTC date. Compare
all three before comparing two results. The hash is not a receipt: nothing is stored by the
stateless calculation route, and the hash is not signed.

A future `prepare` or `submit` call will need an idempotency key and a stored, retrievable,
append-only record before TaxSorted calls it a receipt.

## Data boundary

The calculator does not need names, addresses, client files, Government Gateway details or
HMRC tokens. It reads the supplied transaction facts, returns the result, and does not create
a browser session. Workspace and key records are the only persistent data in this slice.

Production access still needs rate limits, a published privacy and retention statement, security
testing, self-service lifecycle, secure public key delivery, authenticated operator audit and
design-partner review. None of those gaps is hidden by the OpenAPI document.

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
GET /v1/charities/uk/tax-treatments/{id}/why-graph
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

Each of the ten tax-treatment records has a deterministic explanation subresource. It keeps the
treatment effect beside the circumstances in which tax, recovery or clawback may arise, preserves
official-summary versus TaxSorted-analysis voice, and links only to sources whose evidence entry
names the exact field pointer. It is not an organisation assessment. Stored graphs carry the corpus
version, but their hrefs resolve the live dataset rather than an immutable historical snapshot;
retain referenced records or compare versions before replaying an old graph.

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

The public-office pathway slice is deliberately independent of both the named-person gate and
the reviewed bulk-record gate. It contains TaxSorted-written, source-linked rules and provider
doors only: no candidate, applicant, party-preference or voter records. It remains readable
while those broader collections await approval. The politics emergency stop still closes it,
so a misclassified API release has one immediate off-switch. The separately deployed static
human page requires a Cloudflare Pages rollback and cache purge, as documented in the runbook.

```text
GET /v1/politics/uk/public-office-pathways
GET /v1/politics/uk/public-office-pathways/offices
GET /v1/politics/uk/public-office-pathways/offices/{officeId}
GET /v1/politics/uk/public-office-pathways/support
GET /v1/politics/uk/public-office-pathways/rights
GET /v1/politics/uk/public-office-pathways/schema
```

Version 1 deeply maps only a UK Parliamentary candidate in Great Britain and a principal-
council candidate in England. It records other office families as gaps rather than borrowing
the wrong signatures, deposit, electoral system, finance or pay rules. It makes no personal
eligibility decision and has no write method. The human rendering is
[`/uk/politics/stand/`](https://taxsorted.io/uk/politics/stand/).

The public-decision pathway slice starts with a desired outcome and maps where
formal authority sits. Version 1 deeply covers one UK central-tax primary-law
chain and deliberately separates policy change, HMRC administration, a
personal tax appeal and an HMRC service complaint.

```text
GET /v1/politics/uk/public-decision-pathways
GET /v1/politics/uk/public-decision-pathways/decisions
GET /v1/politics/uk/public-decision-pathways/decisions/{decisionId}
GET /v1/politics/uk/public-decision-pathways/doors
GET /v1/politics/uk/public-decision-pathways/rights
GET /v1/politics/uk/public-decision-pathways/schema
```

The deep record keeps proposer, formal decider, implementer, scrutineer and
adjudicator roles distinct. Each lawful public door states its procedural
effect, deadline rule, identity and publication boundary, limit and
no-guarantee statement. Dated event windows carry `checkedOn`, `closesOn`,
`reviewAfter` and `scopeStatus`; callers must verify the official source before
acting. Barriers distinguish official procedure from a labelled TaxSorted
inference.

This slice has no political profile, personalised, ideological or ranked
recommendation, influence score, account, tracking, message, submission,
appeal decision or representation method. Its general process options are
unranked TaxSorted-written guidance and are labelled separately from official
mechanism descriptions.
Unknown child paths and every write method remain closed. Like the public-office
slice, it stays readable while broader politics gates await approval but closes
under the politics bulk emergency stop. The human guide is
[`/uk/politics/decisions/`](https://taxsorted.io/uk/politics/decisions/).

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
