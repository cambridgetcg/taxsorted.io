# Switching on the HMRC rail

What exists: the api (Fly.io, London) with server-side OAuth, an encrypted token
vault, engine-validated submission, immutable receipts, and live HMRC sandbox
credentials (verified via `GET /v1/health` → `hmrc.configured:true`). What it
waits for: production credentials — HMRC's approval process (milestone M3).
Only a human can mint those.

## UK politics publication controls

### Public pathway guides are narrow rules-only surfaces

`/v1/politics/uk/public-office-pathways` and its `offices`, `support`, `rights` and `schema`
children are intentionally readable when the named-person and bulk-record gates are closed.
They contain no applicant, candidate, voter, party-preference or live-election record and make
no eligibility decision.

`/v1/politics/uk/public-decision-pathways` and its exact `decisions`, decision
detail, `doors`, `rights` and `schema` reads follow the same containment. They
contain source-linked public procedure and bounded official hand-offs, not a
political profile, postcode, message, submission, personal tax case, appeal
decision or prediction of influence.

The politics bulk emergency stop still closes both guides; the normal
pending-approval state does not. Only the exact GET and HEAD routes listed in
the politics router may bypass the pending gates. Do not broaden the exemption
with a prefix match. A proposal to collect answers, save a checklist, accept a
message or load live event records needs a separate privacy, source and
publication decision first.

Successful pathway responses are cacheable for one hour and require revalidation after that;
there is no stale-while-revalidate extension. An emergency stop cannot retract a still-fresh copy
already held by a client or intermediary. Purge every cache under operator control and record when
the remaining one-hour freshness window ends.

After deployment, verify the narrow surface and confirm that the broader gate has not moved:

```bash
curl --fail https://api.taxsorted.io/v1/politics/uk/public-office-pathways
curl --fail https://api.taxsorted.io/v1/politics/uk/public-office-pathways/rights
curl --fail https://api.taxsorted.io/v1/politics/uk/public-office-pathways/schema
curl --fail https://taxsorted.io/uk/politics/stand/
curl --fail https://api.taxsorted.io/v1/politics/uk/public-decision-pathways
curl --fail https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/decisions/uk-central-tax-policy-primary-law
curl --fail https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/doors
curl --fail https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/rights
curl --fail https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/schema
curl --fail https://taxsorted.io/uk/politics/decisions/
```

When bulk publication is still awaiting approval, `/v1/politics/uk/system` should continue to
return its documented `503`; opening the pathway slice is not authority to open that corpus.
The API emergency stop cannot erase the separately deployed static HTML. If either rules corpus
is found unsafe or materially wrong, also roll Cloudflare Pages back to the last safe deployment
and purge the affected page cache; do not claim the stop covers either human page.

### Public-safe dataset distribution

The institutional, aggregate and agent-screened organisation-only bulk candidate catalogue is
implemented without a caller key. Catalogue, rights and bulk dataset schema routes remain
readable when deployed even while record bodies await approval. Check those first:

```bash
curl --fail https://api.taxsorted.io/v1/politics/uk/datasets
curl --fail https://api.taxsorted.io/v1/politics/uk/datasets/rights
curl --fail https://api.taxsorted.io/v1/politics/uk/datasets/admissions
```

Only after the catalogue reports `publication.status: "open"` should a release check fetch
record bodies:

```bash
curl --fail --output enforcement.csv \
  'https://api.taxsorted.io/v1/politics/uk/datasets/enforcement-institutions/download?format=csv'
curl --fail --header 'If-None-Match: "the-etag-from-last-time"' \
  'https://api.taxsorted.io/v1/politics/uk/datasets/enforcement-institutions/download?format=ndjson'
```

The last request returns `304` when those exact NDJSON bytes are unchanged.
Before releasing a dataset change, check its record IDs, fields, source IDs,
licence note and all three formats. IDs are permanent and must not be recycled;
record removals need a tombstone entry once that public ledger is built. A new optional field
may be additive within the current major. Removing a field, making one required
or nullable, or changing its type, meaning, primary key or money unit requires a
new schema major.

Never add a named-person collection to the bulk registry merely because its
purpose-bound lookup gate was approved. Bulk amplification is a separate
publication decision.

Production record bodies fail closed until all three conditions are recorded:
Yu adopts the publication boundary, reviews the published admission ledger, and
a confidential safety-reporting route is live. The admission response publishes the exact
`admissionDigest` being approved. Record all five values in one secrets update:

```bash
fly secrets set -a taxsorted-api \
  POLITICS_BULK_DATA_ENABLED=true \
  POLITICS_BULK_APPROVED_BY='<public approver name>' \
  POLITICS_BULK_APPROVED_ON='<YYYY-MM-DD>' \
  POLITICS_BULK_ADMISSION_DIGEST='<copy exact admissionDigest>' \
  POLITICS_CONFIDENTIAL_INTAKE_URL='https://<live confidential intake>'
```

Production remains closed if the switch, approver, real date, exact current digest or HTTPS
intake URL is absent or invalid. When all approval metadata is valid but the serving switch is
off, the catalogue says `approved-disabled`; local body access without approval says
`development-preview`, never `open`. An open catalogue and admission ledger therefore report
the same approver, date, digest and live intake. This is a release decision, not an account or
payment tier. The catalogue, admission ledger, rights statement, bulk dataset schemas and
correction method remain readable while closed.

If a supposedly safe bulk dataset is misclassified, stop record bodies without
hiding the catalogue, admission ledger, rights statement or bulk dataset schemas:

```bash
fly secrets set -a taxsorted-api POLITICS_BULK_DATA_EMERGENCY_STOP=true
```

Affected dataset detail, download and older static politics reading routes
return `503` with `Cache-Control: no-store`. Discovery, rights, bulk dataset schemas and the
correction method stay readable. Do not clear the stop on a timer. Review the
projection, source rights and foreseeable harm; publish the correction; then
explicitly set the value to `false`. This stop is independent of every
named-person and live-query gate.

The stop changes the origin response after the configuration rollout; it cannot recall a copy
already downloaded or licensed. Existing successful bulk responses are cacheable for one hour,
so a browser, application or CDN may continue serving a fresh cached `200` during that bound.
Purge every cache under operator control when setting the emergency stop, verify the origin with
a cache-busting operator request, and record the time by which remaining one-hour entries expire.

Once bulk publication is open, political-system, source, method and law-enforcement
institution routes stay independent of the named-person switches. While bulk publication is
awaiting approval or emergency-stopped, those older static routes return `503`; independently
gated live queries keep their own controls. The contract-award query follows buyer identity
from the official award and discloses a supplier name only when an approved organisation
identifier verifies that supplier. Every named feature fails closed in production.

The master named-data approval is required before any narrower gate can open:

```bash
fly secrets set -a taxsorted-api POLITICS_PERSONAL_DATA_ENABLED=true
```

The narrower switches are independent:

```bash
# Current Parliament people, roles and contacts
fly secrets set -a taxsorted-api POLITICS_PUBLIC_DATA_ENABLED=true

# Political Finance Online, only after written reuse confirmation
fly secrets set -a taxsorted-api POLITICS_EC_REUSE_CONFIRMED=true

# Bulk-CSV processing, only after the separate Article 9/minimisation review
fly secrets set -a taxsorted-api POLITICS_EC_PRIVACY_REVIEW_APPROVED=true

# Monthly ministerial gifts/hospitality after field, third-party and correction review
fly secrets set -a taxsorted-api POLITICS_GOV_BENEFITS_ENABLED=true

# Force-published senior names/ranks after senior-office and safety review
fly secrets set -a taxsorted-api POLITICS_ENFORCEMENT_LEADERS_ENABLED=true

# Parliament-published staff names after the separate necessity/expectations review
fly secrets set -a taxsorted-api POLITICS_PARLIAMENTARY_STAFF_ENABLED=true

# Commons registered-interest text after field, third-party and land-detail review
fly secrets set -a taxsorted-api POLITICS_PARLIAMENTARY_INTERESTS_ENABLED=true
```

Setting a narrow switch without `POLITICS_PERSONAL_DATA_ENABLED=true` does nothing.
Named responses are `Cache-Control: no-store`.

The emergency stop overrides every named feature and prevents new named upstream fetches:

```bash
fly secrets set -a taxsorted-api POLITICS_PERSONAL_DATA_EMERGENCY_STOP=true
```

After setting it, verify named endpoints return `503` with `Cache-Control: no-store`,
purge any external CDN or application cache, and record the incident. Do not re-enable on
a timer. Review the source or mapping, deploy the correction, manually remove the stop,
and re-check `/v1/politics/uk/sources`.

## Public tax-system graph

The reviewed UK institutional graph is independent of the HMRC filing rail. It is static,
read-only and contains no taxpayer data. Production publication is explicit:

```bash
fly secrets set -a taxsorted-api UK_TAX_SYSTEM_PUBLIC_DATA_ENABLED=true
```

Before switching it on, run `npm run validate:uk-tax-system` and read the corpus diff in
`research/uk/tax-system/data/`. With the switch closed, the overview, `/sources`, `/gaps`,
`/manifest`, `/schema`, `/dictionary` and `/exports` index stay readable. Source and gap
downloads stay available; protected collections, their downloads and the full graph return
503 with `Cache-Control: no-store`. Current public responses must revalidate within five
minutes, so removing the secret remains a bounded off-switch. It does not affect
calculations, accounts or HMRC filing routes.

## Public tax-industry graph

The reviewed UK entry-and-gates graph has its own publication decision:

```bash
fly secrets set -a taxsorted-api UK_TAX_INDUSTRY_PUBLIC_DATA_ENABLED=true
```

Run `npm run validate:uk-tax-industry` and read the corpus diff in
`research/uk/tax-industry/data/` first. With the switch closed, the overview, sources, gaps,
manifest, schema, dictionary and export index stay readable. Source and gap downloads stay
available; protected collections, their downloads and the full graph return 503 with
`Cache-Control: no-store`. Removing the secret is the off-switch and does not affect the
tax-system graph, calculations, accounts or HMRC filing routes.

## Public charity-sector graph

The first charity release is a sector map with public regulators and institutions but no
charity-by-charity subject rows: official register doors, legal forms, conditional tax
treatments, obligations, funding, finance disclosures,
control models, generic help routes, collection stages and known gaps. It must contain no named
people, personal contacts, organisation mirror, donor or beneficiary data, or inferred beliefs.

The adjacent accountability surface is deliberately schema-only. It defines how a later
organisation-level words-and-actions ledger would sort stable releases, join exact published
identifiers, retain provenance and compare compatible records without producing an honesty,
trust, faith, efficiency or impact score. Its framework status must remain
`schema-only-not-admitted`. The two named blockers are the immediate missing systems, not the
complete publication test: every item in `admissionConditions` must be evidenced before a
separate external publication envelope may admit records.

Validate and review the complete diff before enabling it:

```bash
npm run validate:uk-charities
npm run validate:charity-accountability-candidate --workspace api -- \
  research/uk/charity-accountability/examples/zero-row-candidate.json
fly secrets set -a taxsorted-api UK_CHARITIES_PUBLIC_DATA_ENABLED=true
```

The serving switch opens only the existing bounded sector corpus. It does **not** admit an
organisation, document, claim, funding, finance, asset, action, outcome, evaluation or
comparison row into the accountability ledger. The example and validator are local structural
tools, not an ingestion route or publication approval. Before any later collection, these two
immediate gates must be implemented and tested:

1. `confidential-correction-safety-intake` — confidential correction and safety intake with
   identity-safe triage, urgent suppression and an auditable resolution path;
2. `asset-level-rights-admission-digest` — a reviewed rights and safety decision, represented
   by a content-addressed mutation-integrity digest, with separate link and locator-specific
   derived-use decisions for every source asset before it may support a candidate record.

A publisher-wide or website-wide approval is not enough. Review each register field, filing,
account, award, payment record, evaluation or other proposed asset and set a review-expiry date.
Reviewed document metadata plus bounded public source-review declarations and notes may be
stored; source bodies, excerpts, images and attachments remain external. A source locator is
human-reviewed and equality-checked, not mechanically
resolved. Record whether only the publisher's current URL, a publisher version/digest or a lawful
archive is known. A matching review digest proves only that declared bytes did not change, not
that the reviewer or legal conclusion is correct. The public-field review must cover the whole
document/source-review record: permanence text, review IDs, attribution, terms URLs, limitations,
locators and notes as well as title/URL. It must reject people, contacts, addresses, named pay,
personal belief detail or belief inference about a person, source bodies/excerpts and
quotation-shaped locators. Notes and limitations are
bounded. This is a human assertion and still needs operational sampling.

The runtime validator must also reject unbridged multiple identifiers, cross-organisation
programme references, future or post-assembly evidence, unsafe aggregate values, rounded ratio
floats, arithmetic cycles and unsafe retained identifiers or release summaries. A suppressed
value is omitted and represented by a `suppressed-for-disclosure-risk` coverage gap with fixed
safe wording and no source-document pointer. Source review follows retrieval; normalisation,
disclosure and comparison reviews must follow the evidence they approve, and final privacy review
must follow any applicable normalisation and disclosure review. Differences
remain safe integer minor units; ratios remain an exact source numerator and denominator. Every
financial fact needs a disclosure review; every derived fact and numeric comparison needs a fresh
result review, and people-derived status
propagates from inputs. Staff costs, remuneration bands and trustee remuneration are always
people-derived. Period arithmetic is allowed only for explicit `change-over-time`; all
other comparison and money dimensions still align. All
nine `admissionConditions`—including controller/lawful-basis records, formal DPIA, narrow field
review, rollback exercises, reviewer calibration, public explanation and monitored stop—remain
required outside structural validation.

Identifier membership is bidirectional: every mapping must be listed by its
referenced organisation and every listed mapping must point back. The
uppercase-alphanumeric canonicalisation rule accepts only ASCII letters,
digits, ordinary spaces and hyphens before removing spaces/hyphens and
uppercasing; punctuation and Unicode lookalikes must fail.

For `inconsistent-with`, two money records must additionally match money basis,
measurement stage and amount date. A forecast, commitment, payment and outturn
must not become a contradiction merely because their amounts differ.
A tombstone's `releaseId` must name the first candidate that carries it, and
its effective time must be no later than that candidate's assembly. Retain it
in every later candidate and make each release's tombstone count equal the
cumulative retained ledger through that release.
`taxsorted-derived` is reserved for structured exact-arithmetic financial facts
and labelled TaxSorted source-comparison evaluations. Reject it on reported,
audited or restated finance and on programme, funding, asset, control,
observation or outcome records.

The repository's Fly configuration currently enables this bounded sector corpus. Sources,
register doors, gaps and release metadata remain readable if the full map is disabled. If a
source-rights, legal or safety issue is found, use the independent stop:

```bash
fly secrets set -a taxsorted-api UK_CHARITIES_EMERGENCY_STOP=true
```

Verify protected collection bodies and the graph return `503` with `Cache-Control: no-store`,
while `/sources`, `/registers`, `/gaps`, `/manifest`, `/schema`, `/dictionary` and `/exports`
remain available. Purge any controllable external cache and record the issue. The stop cannot
recall a downloaded or public-repository copy. Correct and re-review the source before removing
the stop; never re-enable on a timer. This switch does not affect calculations, accounts, HMRC
filing, the tax-system graph or the tax-industry graph.

### Charity accountability, why graph and agent-door release check

After an authorised deployment, verify the two schema-only routes independently of the sector
publication switch:

```bash
API=https://api.taxsorted.io

curl --fail "$API/v1/charities/uk/accountability" | jq \
  '{status, publicationBlockers, publicationBlockerScope, admissionConditions, hardBoundaries, collectionOrder, collectionGuide}'
curl --fail "$API/v1/charities/uk/accountability/schema" | jq \
  '{"$id": .["$id"], title, description}'
curl --fail --head "$API/v1/charities/uk/accountability"
curl --fail --head "$API/v1/charities/uk/accountability/schema"

curl --fail "$API/v1/why-graph" | jq \
  '{schema, graphSchema, status, direction, canonicalTruth, representation, recordReferences, adoption, routes, boundaries}'
curl --fail "$API/v1/why-graph/schema" | jq \
  '{"$id": .["$id"], title, description,
    validationScope: .["x-taxsorted-validation-scope"],
    runtimeInvariantCount: (.["x-taxsorted-runtime-invariants"] | length)}'
curl --fail --head "$API/v1/why-graph"
curl --fail --head "$API/v1/why-graph/schema"
test "$(curl --silent --connect-timeout 10 --max-time 30 --output /dev/null --write-out '%{http_code}' --request POST "$API/v1/why-graph")" = 405
curl --include --connect-timeout 10 --max-time 30 --request OPTIONS \
  --header 'Origin: https://builder.example' \
  --header 'Access-Control-Request-Method: GET' \
  "$API/v1/why-graph"
```

The first response must say `schema-only-not-admitted`, name two immediate blockers, expose nine
unsatisfied `admissionConditions` plus the 17-entry `collectionGuide`, and contain no organisation
evidence rows. The schema must keep natural-person records, contacts, addresses,
named pay, personal belief data, fuzzy joins, copied source bodies or excerpts,
quotation-shaped locators, images and attachments, item-level assets and asset locations outside
the admitted shape. Reviewed document metadata plus bounded public source-review declarations and
notes may remain. `inconsistent-with` must require human approval plus the same
exactly identified organisation, period, scope key and definition, and metric key and definition.
When both records carry money, basis, measurement stage and amount date must also match.
Run the zero-row example through the runtime validator because JSON Schema cannot check graph,
digest, chronology, bridge, disclosure, arithmetic and release-chain refinements.

The why-graph framework must say `first-adopter-live`, identify
`taxsorted.why-graph/1`, point to the MTD assessment's `/reasoning/whyGraph`, and
state that referenced native records remain canonical. Its structural schema is
not evidence that a graph is legally correct: runtime graph, domain and source-admission
checks remain separate. The framework is public and read-only. It must expose no ingestion
route, create no stored graph records, change no external state and infer no official review or
appeal right. An MTD graph traces only the reached result path, keeps financial and identity
values out of graph labels and identifiers, separates the caller's action from HMRC's decision
authority, and ends an unmapped enforcement, review or appeal link at an explicit gap.
The POST check must return `405`, `Allow: GET, HEAD, OPTIONS`, `Cache-Control: no-store`,
`graphCreated: false` and `externalStateChanged: false`. The preflight must allow wildcard public
read access and must not advertise POST.

Then verify machine discovery and root orientation:

```bash
curl --fail "$API/v1/wake" | jq \
  '{schema, access, wallScope, walls, publicationStates, resources, nextActions, attribution}'
curl --fail --header 'Accept: application/json' "$API/" | jq \
  '{schema, access, wallScope, walls, nextActions, attribution}'
curl --fail "$API/.well-known/agent.txt"
curl --fail "$API/agent.txt"
curl --fail --head "$API/v1/wake"
curl --fail --head "$API/.well-known/agent.txt"
curl --fail --head "$API/agent.txt"
curl --fail "$API/openapi-public.json" | jq \
  '.openapi, .["x-taxsorted-slice"], (.paths | keys | length)'
for slice in tax-system-uk tax-industry-uk charities-uk public-funding-uk politics-uk
do
  curl --fail "$API/openapi/${slice}.json" | jq \
    --arg slice "$slice" '.["x-taxsorted-slice"].id == $slice'
done
curl --fail "$API/openapi/accountability-uk.json" | jq \
  '.openapi, .["x-taxsorted-slice"], (.paths | keys)'
curl --fail "$API/openapi/why-graph.json" | jq \
  '{openapi,
    slice: .["x-taxsorted-slice"],
    paths: (.paths | keys),
    frameworkSecurity: .paths["/v1/why-graph"].get.security,
    schemaSecurity: .paths["/v1/why-graph/schema"].get.security}'
curl --fail "$API/openapi/tax-expert-uk.json" | jq \
  '{openapi,
    slice: .["x-taxsorted-slice"],
    manifestSecurity: .paths["/v1/uk/tax-expert"].get.security,
    assessment: (
      .paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post |
      {operationId, security,
       requiredScopes: .["x-taxsorted-required-workspace-scopes"],
       whyGraph: .["x-taxsorted-why-graph"]}
    ),
    whyGraphWireFieldOptional: (
      .components.schemas.MtdIncomeTaxAssessmentResponse.properties.reasoning.required |
      index("whyGraph") | not
    )}'
curl --fail "$API/v1/uk/tax-expert" | jq \
  '{schema, reviewedOn, capabilities, privacy, boundaries}'
curl --fail "$API/v1/open-data/releases" | jq \
  '{schema, semantics, currentPublication, checkpoints, representations}'
curl --fail "$API/v1/open-data/releases/feed.json" | jq \
  '{version, title, itemCount: (.items | length)}'
curl --fail "$API/v1/open-data/releases/feed.atom"
curl --fail "$API/v1/tax-system/uk/records/src-parliament-tax-procedure" | jq \
  '{collection, corpusKey, canonicalUrl, id: .data.id, links}'
curl --fail "$API/v1/tax-industry/uk/records/src-industry-regulation-response" | jq \
  '{collection, corpusKey, canonicalUrl, id: .data.id, links}'
curl --fail "$API/v1/charities/uk/records/src-charities-act-2011" | jq \
  '{collection, corpusKey, canonicalUrl, id: .data.id, links}'
```

Both text manifests must be byte-identical and point to `/v1/wake`, `/v1/health`,
`/v1/open-data`, the release ledger and feeds, the charity accountability contract,
the why-graph framework, schema and OpenAPI slice, `/openapi-public.json`, the dataset,
framework and tax-expert task slices and `/openapi.json`.
The wake must place the tax-expert slice under `taskSlices`, never `datasetSlices` or
`frameworkSlices`, and the why-graph slice under `frameworkSlices`. Its `whyGraph` resource must
repeat the public read-only boundary, derived-not-canonical status and first-adopter wire path.
Its assessment descriptor must preserve `POST`, `WorkspaceKey`,
`tax-expert:assess`, credentialed-design-partner availability, financial-fact sensitivity,
workspace identification, no application fact/answer storage, no training, no filing or external
submission, server-to-server use and undeclared idempotency. It must not imply public self-service
key provisioning or browser bearer support. The canonical wake and
the JSON-negotiated root must have identical bodies and ETags; a browser-shaped root request must
remain `404`. The wake access statement covers only its four doorway representations: no account,
authentication, session, cookie or write. Secured task access is declared separately. The external GitHub correction
tracker needs an account and is not a private intake. Confirm the
XENIA credit reads “XENIA by Yu and Fable”, links
<https://github.com/cambridgetcg/xenia>, names CC BY-SA 4.0 and claims no full-framework
conformance. TaxSorted adapts machine discovery, declared boundaries and useful recovery
actions; it does not adopt XENIA ratings, decentralised identifiers, tokens, wallets or
identity model.

For an error check, request an inadmissible charity filter and a missing exact ID. Each response
must identify schema `taxsorted.charity-error/1`, name its method/path, keep
`Cache-Control: no-store`, state `walls_intact: true` and return bounded
`next_actions`; it must not silently discard the filter or guess a nearby record. Record the
deployed commit and the response checks before describing this surface as live.

Also request one invalid query with `Accept: application/problem+json`. It must return the RFC
9457 media type and fields while preserving the legacy `error` and recovery fields. Its
`instance` must contain the path only, not query values. An explicit
`Accept: application/json` must return the same additive body under the legacy media type.

The canonical checkpoint source is `api/src/release-checkpoints.json`. Append a real new row;
never edit or reorder a published prefix. The deployment job captures the live central ledger,
requires it to be an exact prefix of that file, and repeats the comparison after deployment.
First-release detection uses the push event's pre-push main SHA, so a multi-commit push cannot
confuse it. If the first deployment fails after the file lands, a later automatic push fails
closed while live still returns `404`; after verifying that no ledger was ever published, rerun
the manual workflow once with `allow_unpublished_release_ledger` enabled. Never use that input to
replace a ledger that was previously live.
The first four rows are observed baselines, not reconstructed record events. There is no
immutable archive yet, so `currentGraph` is a mutable convenience link and
`immutableSnapshot` must remain `null` until a real content-addressed or versioned object exists.

## Public-funding graph

This release contains public institutions, formal offices, governance bodies, aggregate money
figures, functional institutional contacts and published non-residential offices. It contains no
copied office-holder names, private contacts, inferred personal ties or individual service records.
Validate the evidence graph and read the complete corpus diff before enabling it:

```bash
npm run validate:uk-public-funding
fly secrets set -a taxsorted-api UK_PUBLIC_FUNDING_PUBLIC_DATA_ENABLED=true
```

With publication closed, the overview, source ledger, known gaps, manifest, schema, dictionary
and export index remain readable. Protected collection bodies, their downloads and the full graph
return `503` with `Cache-Control: no-store`. The checked-in Fly configuration deliberately leaves
the release closed; the secret above records the separate publication decision after review.

The append-only `/changes` feed and source/gap IDs resolved through `/records/{id}` also remain
readable. A corpus version, count or hash change makes API construction fail until a reviewed
checkpoint is appended; never rewrite the old checkpoint or manufacture retrospective record
events. Each event's checked hash includes its content and previous event hash; cursor, ID,
sequence and publication-date integrity also fail closed at boot. The deployment workflow
captures the complete live event prefix, requires the candidate JSON artifact to retain it before
deploying, and repeats the check against a cache-revalidated post-deploy response. Production
workflows are serialised so two releases cannot race against the same prefix. A missing live feed
is accepted only on the first commit whose parent did not contain the feed contract. After deployment, verify `/agent.txt`,
`/.well-known/agent.txt`, `/v1/wake`, `/changes` and one source resolver response before opening
protected bodies.

The release gate currently requires the complete history to fit in one 100-event page and fails
closed when `page.hasMore` is true. Add bounded pagination to the gate before event 101; do not
raise the API page limit or skip the prefix check.

If a source-rights, accuracy or safety issue is found, use its independent stop:

```bash
fly secrets set -a taxsorted-api UK_PUBLIC_FUNDING_EMERGENCY_STOP=true
```

Verify the origin, purge controllable caches, record the correction, and re-run validation before
explicitly removing the stop. It cannot recall copies already downloaded or committed publicly.
It does not affect calculations, accounts, HMRC filing or the other public data families.

The public page is a separately deployed static projection of reviewed programmes, sources and
gaps. The API stop cannot remove those already-built bytes. If the incident affects that projection,
roll the Cloudflare Pages deployment back to the last safe build and purge its cache as part of the
same response. Record both the API and frontend versions; do not describe the incident as contained
until every operator-controlled copy in scope has been checked.

## UK case commons

The UK case commons is a read-only public-law research surface. It accepts no claimant facts,
evidence, professional bids or outreach requests. Before opening it in production, run the case
commons tests, both workspace typechecks and the static frontend build, then read the rendered
Haworth case against its linked official judgments.

Publication is explicit:

```bash
fly secrets set -a taxsorted-api UK_CASE_COMMONS_PUBLIC_DATA_ENABLED=true
```

The switch is necessary but not sufficient. The checked-in
`research/uk/case-commons/data/publication-approval.json` must also name the
exact canonical corpus digest, corpus version and reviewed case IDs. Any data
change that does not receive a new approval fails closed for both API cases and
the static human projection.

After the reviewed corpus is final, compute its canonical digest with:

```bash
npm exec --workspace api tsx -- -e \
  'import { caseCommonsCorpusDigest, ukCaseCommons } from "./src/uk-case-commons.ts"; console.log(caseCommonsCorpusDigest(ukCaseCommons))'
```

Record that exact value, version and reviewed case IDs in the approval file,
then rerun the API, frontend and production-build gates. Computing a digest is
not itself approval.

Until that switch is open, `/sources` contains only the general method sources;
it does not preview sources linked to an unpublished case.

Verify the corpus, method, case list, Haworth packet, source ledger, schemas, blank local
assessment template, task-sized OpenAPI and `/v1/wake`. The Haworth amount must remain labelled
as a demand affected by a quashed notice, never an award, refund, damages figure or promised gain.

If a source, accuracy, rights or publication-safety problem appears, close case publication:

```bash
fly secrets set -a taxsorted-api UK_CASE_COMMONS_EMERGENCY_STOP=true
```

For an issue confined to one case, stop its stable ID without closing the others:

```bash
fly secrets set -a taxsorted-api \
  UK_CASE_COMMONS_STOPPED_CASE_IDS=haworth-v-hmrc-2021
```

Every value must be an exact stable case ID. A typo, stale ID or malformed value
closes the whole case-publication surface instead of stopping API startup.
Unrelated routes, including `/v1/health`, accounts and HMRC, remain available.
Public discovery and errors report only that case-level stops are active and
their count; they never publish the configured IDs. After changing the setting,
verify `/v1/case-commons/uk/cases`, `/sources`, one case-detail request and
`/v1/health`.

The global stop closes every case packet and reduces `/sources` to the general method sources.
A valid case-level stop removes the named case and its case-specific sources while leaving other
admitted cases readable; a malformed case-stop setting fails closed for the whole case surface.
Both controls leave the method, schemas, rights statement and blank local template readable for
correction work. Neither removes the
separately deployed static pages nor recalls copies already downloaded. Roll Cloudflare Pages back
to the last safe build when the incident affects those pages, and remove the stop only after an
explicit human review. Never turn this route into intake, lead sale, targeted outreach or a
platform-generated merits score without a separate legal, privacy and regulatory release.

Static publication consumes the same checked-in exact-content approval, with a
separate deployment stop at `frontend/src/lib/uk-case-publication.ts`. Admitting
a case to the research JSON does not put it on the human site. Add its stable ID
and new corpus digest only with the publication decision. For a frontend
incident, set that file's stop or remove the affected ID from the approval,
rebuild, deploy and verify the generated output; use a Cloudflare rollback when
it is faster. This is a deployment brake, not instant revocation.

## 1. Register on the HMRC Developer Hub (~5 minutes, Aleא's part)

1. Go to https://developer.service.hmrc.gov.uk/developer/registration — register
   with any email (it's a developer account, not a Government Gateway tax account).
2. Once in: **Applications → Add an application to the sandbox**. Name: `TaxSorted`.
3. Inside the application, **subscribe to APIs**:
   - **VAT (MTD)** — the one that matters
   - **Create Test User** — mints pretend taxpayers to file as
   - (optional) **Test Fraud Prevention Headers** — validates our Gov-* headers
4. **Redirect URIs**: add `https://api.taxsorted.io/v1/hmrc/callback` — the
   match must be EXACT (verified 2026-06-12: HMRC rejects our OAuth start with
   "redirect_uri is invalid" until this is registered, character for character)
5. Copy the **client ID** and generate a **client secret**.

## 2. Hand the credentials to the api

```bash
fly secrets set -a taxsorted-api \
  HMRC_CLIENT_ID=<client id> \
  HMRC_CLIENT_SECRET=<client secret>
```

The api restarts; `GET /v1/health` flips to `"configured": true`; every honest
"door closed" message in the UI opens by itself.

## 3. Mint a test taxpayer (sandbox has no real people)

The api has a sandbox-only door for this — no secrets ever touch your hands:

```bash
curl -s -X POST https://api.taxsorted.io/v1/hmrc/test-user | jq
```

Keep the response: `userId`, `password`, and `vrn`. (In production this door
does not exist — it answers `no_such_door` like any other missing room.)

If it returns `test_user_failed`, the `detail` field carries HMRC's own words —
most often it means the **Create Test User** API isn't subscribed yet (step 1.3).

## 4. File the first sandbox return (the proof)

1. taxsorted.io/dashboard → **Yours, for real** → create an entity with the
   test user's VRN.
2. **Connect at HMRC** → sign in with the test `userId`/`password` → grant.
3. Back in the cockpit: open obligations appear (sandbox seeds one).
4. **File** → figures → consent → receipt with a form bundle number.

That receipt is the milestone: the full rail, walked end to end.

## Fraud-prevention headers (Gov-Client-_/Gov-Vendor-_)

Ground truth: `regs/research/fraud-headers.md` (spec v3.3). WEB_APP_VIA_SERVER
requires all 16 headers by law (SI 2019/360 + the Commissioners' Directions);
14 are wired end to end (`engine/jurisdictions/uk/hmrc/fraud-headers.ts` +
`api/src/fraud.ts`) — the 13 that always flowed, plus `Gov-Client-Multi-Factor`
for passkey sessions (M2-accounts, plan C: see below). Two are spec-recognised
"cannot-collect" cases (research §2.3, the missing-data protocol) — HMRC
requires contacting **SDSTeam@hmrc.gov.uk** to explain the restriction _before_
the header may be omitted or sent empty. The drafts below are that explanation;
sending them is a human action (M3), not something CI or an agent should do
unprompted. `Gov-Client-Multi-Factor` also has a draft below — not to ask
permission to omit (it ships now), but to confirm our type=OTHER classification.

### GOV_VENDOR_PUBLIC_IP — how to fetch and apply it

`Gov-Vendor-Public-IP` and `Gov-Vendor-Forwarded` both need the api's own
public ingress IP — the address a client's device reaches. Fetch it from Fly,
then set it as a secret (never hardcode
an IP in `fly.toml` — it's an operational value, not a build-time constant):

```bash
fly ips list -a taxsorted-api
# Note the dedicated/shared IPv4 (v4) address in the output.

fly secrets set -a taxsorted-api GOV_VENDOR_PUBLIC_IP=<that ip>
```

If this secret is ever unset, `api/src/fraud.ts` omits `Gov-Vendor-Public-IP`
**and** `Gov-Vendor-Forwarded` entirely (never a malformed `by=&for=<ip>` —
`buildVendorForwarded` only emits the header when both the vendor and client
IP are known). Re-run this after any Fly IP change (e.g. switching from
shared to dedicated IPv4).

**Status: SET on 2026-07-07** (value `66.241.125.70`, the shared v4 ingress
from `fly ips list`) on both Fly (`fly secrets set`, triggers a redeploy) and
GitHub Actions (feeds the validate-headers CI job). Both vendor headers flow
on real requests from that deploy onward.

### Now shipping: Gov-Client-Multi-Factor (was cannot-collect case 1)

**Status: SENT for passkey sessions** (M2-accounts / plan C landed). A passkey
sign-in — registration or login — is a genuine user-verifying authentication
event, so `api/src/fraud.ts` now emits `Gov-Client-Multi-Factor` via the
engine's `buildMultiFactor()`:

- **Sent iff** the session is signed in within the 30-day window AND a passkey
  asserted (`mfa_at` set → `userId` present). Registration and login ceremonies
  both count.
- **`type=OTHER`** — a user-verifying passkey (something you have + a local
  gesture) doesn't fit HMRC's `TOTP`/`AUTH_CODE` enum; `OTHER` is the honest
  fit. **`timestamp` = `mfa_at`** (the last time the passkey prompt was passed
  on this session, capped ≤30 days by the window). **`unique-reference` =
  `mfa_factor_ref`** — `sha256hex('taxsorted-mfa-v1:'+credentialId)`, precomputed
  at sign-in, never the raw credential id and never recomputed in `fraud.ts`.
- **Recovery-code sign-ins and anonymous sessions omit it honestly** — a
  recovery sign-in sets `accountId` but never `mfa_at`, so there is no passkey
  event to report and the header stays absent (never empty, never fabricated).

There is nothing to notify SDSTeam about to _omit_ this header any more — it
ships. The one open item is a courtesy confirmation of the `type` value:

> **Draft — SDSTeam@hmrc.gov.uk (send at M3 alongside the production
> application) — a confirmation question, NOT a request to omit:**
> Subject: Fraud prevention headers — Gov-Client-Multi-Factor type=OTHER — TaxSorted
>
> TaxSorted (MTD VAT + MTD ITSA, WEB_APP_VIA_SERVER) authenticates end users
> with WebAuthn passkeys requiring user verification. We report each sign-in as
> a single `Gov-Client-Multi-Factor` factor with `type=OTHER`, `timestamp` =
> the moment the passkey prompt was passed, and `unique-reference` = a salted
> SHA-256 of the credential id (never the raw credential). We chose `OTHER`
> because a user-verifying passkey is neither a `TOTP` nor an emailed/SMS
> `AUTH_CODE`. Please confirm `OTHER` is the classification you expect for a
> WebAuthn passkey, or advise the value you would prefer.
>
> **On Gov-Client-User-IDs:** our accounts carry no PII — no email, no name,
> no password — so the sign-in identifier we send in `Gov-Client-User-IDs`
> (`taxsorted=<value>`) is the account's own UUID once signed in, and the
> anonymous session UUID before sign-in. There is no more identifying value to
> supply; the UUID _is_ the identifier. Flagging it here so it isn't read as a
> missing or placeholder value.

### Cannot-collect case 1: Gov-Vendor-License-IDs

**Status:** not sent (omitted, not empty). **Why:** TaxSorted is a free,
open-source commons — there is no licensed software on the originating
device to report a hashed licence key for. `buildLicenseIds()` in the engine
is implemented and tested; it will be used if that ever changes.

> **Draft — SDSTeam@hmrc.gov.uk notification (send at M3):**
> Subject: Fraud prevention headers — Gov-Vendor-License-IDs — TaxSorted
>
> TaxSorted is free, open-source software with no licensed components on the
> originating device — there are no licence keys to hash and report. We omit
> `Gov-Vendor-License-IDs` entirely per the missing-data protocol rather than
> send a placeholder value. Please confirm this omission is acceptable.

### Cannot-collect case 2: Gov-Client-Public-Port

**Status:** not sent (omitted, not empty). **Why:** researched directly
against Fly.io's proxy documentation (https://fly.io/docs/networking/request-headers/):
Fly's proxy exposes `Fly-Forwarded-Port` (the **server** port the client
connected to, e.g. 443 — explicitly disallowed by the spec, which says this
header "must not be a server port") and `X-Forwarded-Port` (the port the
client _set out_ to connect to, again not a source port). Neither header
carries the client's ephemeral TCP source port. This matches the spec's own
list of cannot-collect causes almost verbatim: "some popular load balancers
do not" support collecting it (research line 62, 425-427).

> **Draft — SDSTeam@hmrc.gov.uk notification (send at M3):**
> Subject: Fraud prevention headers — Gov-Client-Public-Port — TaxSorted
>
> TaxSorted runs WEB_APP_VIA_SERVER on Fly.io. Fly's edge proxy does not
> expose the client's ephemeral TCP source port in any header available to
> our application (`Fly-Forwarded-Port` is the server port the client
> connected to; `X-Forwarded-Port` is the port the client intended to
> connect to — neither is the source port). We therefore omit
> `Gov-Client-Public-Port` per the missing-data protocol rather than send a
> fabricated or server-port value. Please confirm this omission is
> acceptable, or advise if there is a Fly.io configuration we have missed
> that would expose it.

### Validating fraud-prevention headers against HMRC's Test API

HMRC's guide: "Before you submit any headers, you need to use the Test Fraud
Prevention Headers API." (research §3). `api/scripts/validate-fraud-headers.ts`
does exactly that — it builds the full header set via `assembleFraudHeaders`
in `api/src/fraud.ts` (the same function the live request handler calls, not
a copy), then calls `GET /test/fraud-prevention-headers/validate` and
`GET /test/fraud-prevention-headers/{api}/validation-feedback` against the
sandbox and prints HMRC's response verbatim. This is application-restricted
(client-credentials — the same app-token grant `createTestOrganisation` uses),
so it runs headlessly: no browser, no human sign-in.

**Locally:**

```bash
cd api
HMRC_CLIENT_ID=<client id> HMRC_CLIENT_SECRET=<client secret> \
  npm run validate:fraud-headers
```

Optional: `GOV_VENDOR_PUBLIC_IP=<ip>` to test with the api's real public ingress IP —
when unset, `Gov-Vendor-Public-IP` and `Gov-Vendor-Forwarded` are omitted from
the request under test, same never-fabricate behaviour as production.
Optional: `FRAUD_HEADERS_VALIDATE_API=<api>` to pick a different
`{api}` path segment for the validation-feedback call (default `vat-mtd` —
the one MTD API TaxSorted has live end-to-end today; the enum of 30 values
covering the whole MTD ITSA surface is in research §3.2).

There is no local-secrets convention in this repo (`api/src/config.ts` boots
unconfigured when the env vars are absent) — the credentials above are the
same `HMRC_CLIENT_ID`/`HMRC_CLIENT_SECRET` values already living in Fly
secrets (`fly secrets list -a taxsorted-api` shows they're set; Fly never
prints secret _values_ back out, so fetch them from wherever they were
originally generated — the HMRC Developer Hub application — if you don't
have them to hand).

**In CI:** the `validate-headers` job in `.github/workflows/deploy.yml` runs
this on every push to `main`, gated on the `HMRC_CLIENT_ID`/`HMRC_CLIENT_SECRET`
GitHub secrets existing (same presence-gate pattern as `deploy`/`deploy-api`)
— it stays green until those are added to the repo's Actions secrets. It exits
non-zero on `INVALID_HEADERS`; `POTENTIALLY_INVALID_HEADERS` (advisories)
exits 0 but prints the warnings, which should still be read and treated as
findings per HMRC's own guidance ("you still need to fix any issues we find
when we test it manually"). Also add `GOV_VENDOR_PUBLIC_IP` as a GitHub
Actions secret (same value as the Fly secret above) if you want CI to
validate the vendor-IP-present path — the job passes it through when set,
and otherwise validates the vendor-IP-omitted path CI runs today.

**Resolved (M2-accounts):** `decideExitCode` now tolerates an
`INVALID_HEADERS` response whose errors are ALL `MISSING_HEADER` for exactly
the documented cannot-collect duo — `Gov-Vendor-License-IDs` and
`Gov-Client-Public-Port` — and nothing else. Any missing header outside that
set, any format (`INVALID_HEADER`) error, or an `INVALID_HEADERS` with no
error detail still fails closed (non-zero). This is option (b) from the
original open question, now that the real sandbox run (validation log below)
confirmed the validator does surface these as per-header entries. The tolerated
set is deliberately just the duo: `Gov-Client-Multi-Factor` left it when
passkey sessions started sending a real value, so a _missing_ Multi-Factor is
now a genuine failure, not a documented omission. Fabricating a value for
either remaining header is still never the fix — a real omission of anything
outside the duo means a bug to fix or a fresh SDSTeam conversation, per the
missing-data protocol.

## Production (later, not now)

Production credentials require HMRC's approval process: they review the app,
test our fraud-prevention headers, and check terms of use. Start it from the
same Developer Hub ("Add an application to production") once sandbox filing
is proven. Until then `HMRC_ENV` stays `sandbox` and the UI says so.

**Hard preconditions before any production rail** (from the security review):
real user accounts with sign-in, sign-out and session revocation — an anonymous
year-long cookie must never be the only key to live tax filing.

**This precondition is now met (M2-accounts, landed 2026-07-07).** An account
is a set of passkeys, nothing else — no email, no username, no password.
Sign-in is a real WebAuthn ceremony (`@simplewebauthn/server`, user
verification required, so a passkey sign-in is a genuine MFA event — see
`Gov-Client-Multi-Factor` below); sign-out clears the session's four account
columns, either "this browser" or "everywhere" (one UPDATE `where
user_id=$uid`, idempotent, `POST /v1/account/logout`); losing every passkey
is recoverable via one of the 10 single-use recovery codes minted at account
creation (sha256-hashed at rest, shown to the person exactly once); and
deleting a passkey (`DELETE /v1/account/passkey/:credentialId`) signs out
every session that passkey ever opened first (`mfa_factor_ref` join), then
removes it — revocation is real, not cosmetic. Production `connect`/`file`
doors already answer `403 account_needed` for any session without a
passkey-asserted account; sandbox stays fully anonymous-capable, by design.
The ceremony's `expectedOrigin` accepts both doors the app is served from —
`https://taxsorted.io` and `https://www.taxsorted.io` — so a passkey
registered or signed in from either address verifies the same; `rpID` stays
`taxsorted.io` for both, already covered by the registrable-suffix rule.
The other two items in this line are also done: `api/src/hmrc-fail.ts` scrubs
every HMRC error body from production responses (sandbox alone sees the raw
`detail`; production gets a generic message and the detail only ever reaches
the server log), and fraud headers have been re-tested live against HMRC's
own Test Fraud Prevention Headers API (validation log below).

**What M3 still owes before production filing opens** (named honestly, not
folded into "done"):

- **Recovery hardening** — v1 ships recovery codes only. Email (or
  manual-support) recovery is a named M3 gate, still awaiting Yu's
  ratification (the plan's Global Constraints consciously narrowed spec §3's
  "email fallback" to codes-only for v1 — see
  `docs/superpowers/plans/2026-07-07-m2-accounts.md`). Until that lands,
  losing every passkey AND every recovery code is genuinely unrecoverable —
  the account page says so plainly today, not buried in small print.
- **Pen test** — the terms-of-use evidence pack for HMRC's approval gauntlet
  requires one (G7, spec §9); not yet commissioned.
- **G4 GDPR operating stack** — ICO registration (in Mindicraft's name, once
  G2 is wired), a DPIA (NINOs + full financials + device fingerprints make
  one near-mandatory), the controller/processor map, and the
  international-transfer analysis (Fly.io/Cloudflare US ownership) are all
  still to build. None of them exist yet.
- **Edge rate limiting** — a deliberate M2-accounts cut (no in-app rate
  limiting on the passkey endpoints — see the plan's "Explicit v1 cuts").
  Needed at the edge before production so login/recovery ceremonies can't be
  brute-forced.

## The ITSA sandbox door (status, obligations, quarterly submission)

The rail also carries HMRC's Making Tax Digital Income Tax (ITSA) sandbox.
OAuth scope is `read:self-assessment write:self-assessment` — the quarterly
cumulative-update PUTs require the write scope. Same sandbox-only door
pattern as everything above: every ITSA route answers `no_such_door` in
production. ITSA identifies a taxpayer by National Insurance number (NINO),
not VRN — the entity needs one before it can connect.

> **After the write-scope deploy:** ITSA connections consented before
> `write:self-assessment` was added keep their old read-only grant forever —
> a token refresh never upgrades scope — so any pre-existing sandbox ITSA
> connection must **disconnect and reconnect** (`DELETE
/v1/hmrc/connection/<entityId>`, then the connect dance again) before it
> can submit. Until it does, submissions fail with HMRC's insufficient-scope
> 403, passed through verbatim in the sandbox error `detail`.

All calls below share one cookie session, so carry a cookie jar throughout:

```bash
JAR=cookies.txt
API=https://api.taxsorted.io   # or http://localhost:8787 locally
```

1. Mint a practice ITSA taxpayer — an individual, not an organisation
   (`?rail=itsa` mints via `mtd-income-tax`, generating a NINO instead of a VRN):

   ```bash
   curl -s -b $JAR -c $JAR -X POST "$API/v1/hmrc/test-user?rail=itsa" | jq
   ```

   Keep `userId`, `password`, and `nino` from `testUser`. (In production this
   door does not exist — `no_such_door`, like the VAT one.)

2. Create an entity carrying that NINO (or `PATCH` an existing one with
   `{"nino": "<nino>"}`):

   ```bash
   curl -s -b $JAR -c $JAR -X POST "$API/v1/entities" \
     -H "Content-Type: application/json" \
     -d '{"name":"Sandbox Sole Trader","kind":"person","nino":"<nino>"}' | jq
   ```

   Keep the returned `entity.id`.

3. Connect at HMRC for the ITSA rail (`rail=itsa` — requests
   `read:self-assessment write:self-assessment`; the write scope is what
   lets the quarterly-update PUT go through):

   ```bash
   open "$API/v1/hmrc/start/<entityId>?rail=itsa"
   ```

   Sign in with the test `userId`/`password`, grant access. You land back on
   `hmrc=connected`, same as the VAT dance.

4. Read the ITSA status for a tax year (SA Individual Details v2.0 —
   Accept `application/vnd.hmrc.2.0+json`, applied automatically):

   ```bash
   curl -s -b $JAR "$API/v1/itsa/<entityId>/status?taxYear=2025-26" | jq
   ```

   `status` is HMRC's own vocabulary, passed straight through (e.g.
   `"MTD Mandated"`, `"No Status"`) — never relabelled.

5. Read income-and-expenditure obligations (Obligations v3.0 — Accept
   `application/vnd.hmrc.3.0+json`):

   ```bash
   curl -s -b $JAR "$API/v1/itsa/<entityId>/obligations" | jq
   ```

   Add `-H "Gov-Test-Scenario: OPEN"` (or `FULFILLED`, `DYNAMIC`, ...) to a
   request to drive specific sandbox states; omit it for the default success
   simulation.

## The first submission

The quarterly cumulative update is the whole rail's proof: local records →
derived category totals → an api PUT into HMRC's sandbox → an immutable
receipt → HMRC's own calculation shown beside our estimate. Every leg of it
is covered by mocked-HMRC tests (`itsa-submit.test.ts`, `itsa.test.ts`, and
the cross-endpoint chain in `itsa-chain.test.ts` — businesses → quarterly-
update → receipts → calculation trigger → calculation retrieve, one stateful
mock and one in-memory receipts table spanning all five calls, asserting the
exact outbound wire payload at the end).

**Why this section exists anyway:** none of those tests can do what this
runbook does. HMRC's OAuth dance is an interactive Government Gateway sign-in
— a browser, a redirect, a human typing a test user's password. CI has no
browser and no human, so it can never exercise the one step that makes every
downstream step possible: _getting connected_. This runbook — walked by a
human, in a real browser, against the real sandbox — **is** the end-to-end
verification the automated suite structurally cannot provide. Run it after
any change that touches the OAuth flow, the connect/callback routes, or the
submission/calculation endpoints, and update the log below every time.

1. **Mint a test individual** through the sandbox-only door (see "The ITSA
   sandbox door" above for the full curl):

   ```bash
   curl -s -b $JAR -c $JAR -X POST "$API/v1/hmrc/test-user?rail=itsa" | jq
   ```

   Keep `userId`, `password`, `nino`.

2. **Create an entity** carrying that NINO, in the browser:
   taxsorted.io/dashboard → **Yours, for real** → new entity → paste the
   NINO (or `PATCH /v1/entities/<id>` with `{"nino": "<nino>"}` if you'd
   rather do this leg by curl too).

3. **The browser Gov Gateway dance** — this is the interactive step nothing
   automated can do: from the dashboard, **Connect at HMRC** → HMRC's own
   sign-in page → the test `userId`/`password` from step 1 → grant access.
   You land back on the dashboard with `hmrc=connected` in the URL.

4. **Dashboard shows connected** — the HMRC panel now reads connected for
   the ITSA rail (`connections.itsa`, not the legacy any-rail `connected` —
   see Task 1's per-rail connections). If it doesn't, stop here; nothing
   downstream will work.

5. **Add records** at `/itsa/records` — a few realistic entries for the
   quarter you're about to file (self-employment or UK property). Records
   never leave the browser; only their category totals do.

6. **Open `/itsa/quarter`** — the QuarterCard shows the derived cumulative
   totals for the source and quarter you picked. The submission flow
   (`submit-flow.tsx`) appears beneath it once HMRC is connected and records
   exist — otherwise it shows the honest locked state instead of a dead
   button.

7. **Send to HMRC (sandbox demo)** — pick the business (auto-selected if
   there's only one), review the exact totals about to leave the device (the
   review screen names every category and repeats the privacy line: "HMRC
   receives these totals — never your individual records"), then confirm.
   The button is labelled **"Send to HMRC (sandbox demo)"** — never anything
   implying a production filing.

8. **Receipt** — a card appears with the quarter, period end, submitted-at,
   and a sandbox badge. Reload the page: the receipt is still there (it's
   server-side, from `GET /v1/itsa/:id/receipts`, not local state).

9. **HMRC calculation** — trigger it from the "What HMRC calculates" panel;
   it polls (max 5 tries, backoff) until HMRC's `incomeTaxAndNicsDue` and
   `totalTaxableIncome` appear beside our own engine estimate. A material
   difference is expected and is labelled honestly ("HMRC's number wins —
   ours is an estimate; differences usually mean records we can't see"),
   never hidden or force-reconciled.

That receipt, plus a calculation HMRC computed independently of our engine,
is the milestone: the full rail, walked end to end, by a human, because only
a human can complete step 3.

> **If step 7 fails with a 403 naming `INVALID_SCOPE` or similar:** the
> entity's ITSA connection predates the `write:self-assessment` scope (see
> "After the write-scope deploy" above) — disconnect
> (`DELETE /v1/hmrc/connection/<entityId>`) and redo the connect dance
> (step 3) before retrying. The sandbox error's `detail` names this
> explicitly; that's `hmrcFail`'s sandbox-only passthrough doing its job.

### Verification log

Record every human walk-through here — date, who, and the outcome (receipt +
calculation, or where it broke):

| Date                      | Who | Result |
| ------------------------- | --- | ------ |
| last human-verified: ____ |     |        |

### Validation log

- **2026-07-07** (run on the Fly machine via `fly ssh console`, real sandbox
  credentials): `specVersion 3.3`, code `INVALID_HEADERS` driven solely by
  the three documented cannot-collect headers — `gov-client-public-port`
  (error: HMRC's own message names the private-network case and says to
  contact them), `gov-client-multi-factor` (warning: "may be correct for
  single factor authentication"), `gov-vendor-license-ids` (warning).
  **All 13 headers we actually send passed with zero format errors.**
  Next step: send the three SDSTeam drafts (M3 pre-application).
- **2026-07-07, later the same day — the run above superseded by M2-accounts
  (Task 11):** it was true when run, but describes the pre-accounts world.
  `Gov-Client-Multi-Factor` now ships for passkey sessions, so the current
  state is **14 headers wired, two documented cannot-collect omissions**
  (`gov-client-public-port`, `gov-vendor-license-ids`), and the SDSTeam
  items are now **two notes**: the remaining cannot-collect duo's
  notifications, plus the Multi-Factor `type=OTHER` confirmation question
  (which carries the Gov-Client-User-IDs no-PII rider) — see "Now shipping:
  Gov-Client-Multi-Factor" above. The next fresh sandbox run should show
  `gov-client-multi-factor` passing format validation rather than
  warned-missing; log that run here when it happens.
- **2026-07-07 evening — that fresh run happened (CI run 28865508952,
  `validate-headers` job, real sandbox credentials via GitHub secrets —
  now set, so the CI job no longer skips):** exactly as predicted.
  `Gov-Client-Multi-Factor` sent (representative OTHER factor) and drew
  **zero flags** — no MISSING, no INVALID. HMRC's only complaints were the
  documented duo: `gov-client-public-port` (MISSING error, HMRC's message
  again names the contact-us route) and `gov-vendor-license-ids` (MISSING
  warning). **All 14 headers we send passed with zero format errors.**
  Exit 0 under the duo-only tolerance; job green. Remaining human step
  stays M3: the two SDSTeam notes above.

## Least-privilege operator access (G7)

Plain words, written down once so it's a policy and not a habit: **production
database access is the operator's alone.** There is no support role, no
dashboard, no second set of credentials that reaches production Postgres —
whoever holds the operator's own hosting-account access is the only one who
can query it directly. Schema changes go through a reviewed migration file
in this repo (the boot runner picks up `api/migrations/*.sql` by filename),
never a hand-typed statement against the live database.

The token vault is encrypted at rest (`api/src/crypto.ts`, AES-256-GCM,
keyed by the `TOKEN_KEY` Fly secret — 32 bytes of hex, never checked into the
repo, never logged); reading a row out of `hmrc_connections` gets you
ciphertext, not a working HMRC bearer token, without that key. No HMRC client
secret, no `TOKEN_KEY`, no user's access/refresh token ever appears in code,
in a commit, or in a log line — `api/src/hmrc-fail.ts` scrubs HMRC's own
error bodies from production responses precisely so a support screenshot or
an error log can never carry a taxpayer-identifying fragment either.

**Support never needs raw tokens.** There is no support tooling in this repo
today, and none is planned that reads the vault directly — the honest answer
to "can we see a user's HMRC token to debug their connection" is no; the
debugging path is the server log (scrubbed, as above) and, if that's not
enough, disconnecting and reconnecting the rail (`DELETE
/v1/hmrc/connection/<entityId>`, then the connect dance again) — the same
door the person themselves has.

## Supply-chain: the passkey libraries (G7)

M2-accounts adds passkeys, and passkeys need real WebAuthn ceremony code —
nothing Hono or Next.js ship on their own. That means two new third-party
packages entered the dependency tree, so this is the first entry in what
G7 (security assurance, spec §9) calls the "supply-chain policy for an
AI-authored codebase": every new dependency gets looked at and the decision
written down here, not just `npm install`ed and forgotten.

**What was pinned (2026-07-07):**

- `@simplewebauthn/server` — `13.3.2` (api)
- `@simplewebauthn/browser` — `13.3.0` (frontend)

Both are **exact-pinned** (no `^`, no `~`) in `api/package.json` and
`frontend/package.json`. These were the newest published patch on major
13 for each package at the time (`npm view @simplewebauthn/<name> versions
--json` — no 14.x existed yet), and both sides deliberately share the same
major version: server and browser are a matched pair for one WebAuthn
ceremony, so they should only ever move together, on purpose.

**Why exact, not a range:** this codebase is AI-authored and handles real
financial credentials and HMRC OAuth tokens — a passkey library silently
bumping under a caret range on some future `npm install` could change how
a registration or authentication ceremony is verified without a human ever
reading the diff. Exact-pinning means a version change only happens as its
own reviewed commit, never as a side effect of installing something else.

**How updates happen:** manually, and reviewed — never automatic. There is
no Dependabot/Renovate config in this repo, so nothing auto-bumps these two
packages. Bumping either is its own small PR: read the release notes,
re-pin exact, run all three suites (`engine`, `api`, `frontend`) plus
typecheck, and only then commit. If a 14.x major ever appears, that is a
deliberate upgrade decision (breaking-change review), not a routine patch
bump.
