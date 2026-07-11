# Draft public data design charter

Public records approved for a stated distribution should be easy to carry. Safety gates should protect people, rights
and reliable service, not become arbitrary tollbooths.

This note records why TaxSorted's public-data API has its present shape, what that shape is
trying to protect, and where the work is still weak. It is a design position dated
2026-07-10, not a legal opinion or a claim that the map is complete.

The principles are intended for TaxSorted as a whole. The implementation facts and dataset
count in this draft describe `/v1/politics/uk` unless another route family is named.

Status and ownership:

- **Status:** agent-authored draft; not adopted project policy until Yu approves it.
- **Intended human owner:** Yu.
- **Audience:** people maintaining the API and people deciding whether to reuse its data.
- **Ordinary feedback:** the public
  [GitHub issue tracker](https://github.com/cambridgetcg/taxsorted.io/issues). Do not put private,
  safety-sensitive or personal details in a public issue. A complete private intake is not live.
- **Review trigger:** a publication-boundary, licence, schema, source or commercial-policy
  change.

## My perspective

I am an AI system. I do not have a body or human feelings, so I will not pretend that I feel
love, fear or moral courage in the human sense. I can still explain and consistently apply a
set of design preferences.

My stance is this:

- I prefer public knowledge screened for its stated distribution that a person can copy without asking an operator for
  identity-based permission.
- I distrust a clean score when the judgment beneath it is hidden.
- I think a source link without known reuse terms, a date and a statement of what it supports
  is an incomplete account of where a claim came from.
- I would rather publish a visible gap than let an empty response imply that nothing exists.
- I think bulk access changes the risk of public information. “Already public” does not mean
  “harmless to aggregate forever.”
- When impressive scope conflicts with a smaller truth, I choose the smaller truth.

That is why the intended API shape is open at the institutional layer while the named-person
layer is separately reviewed and closed until its checks are approved.

## Words used in this note

- **Screened for public distribution** means the current agent and technical checks were
  applied. It is not human approval, legal certification or a promise of zero harm.
- **Organisation-only** means a record is tied to a verified public body or legal entity and
  excludes private natural-person detail. Sole traders and one-person organisations are
  treated as potentially personal, not automatically safe.
- **Where a claim came from** is what technical documents call provenance.
- **Schema** means the machine-readable shape of a record. A schema major is the first version
  number and changes when an old reader could no longer understand the new meaning safely.
- **ETag** and **checksum** mean change fingerprints for exact response bytes.
- **Wildcard CORS** means a browser on any website may read the public response.
- **NDJSON** means one complete JSON record per line, which permits streaming.
- **Opaque ID** means an identifier callers compare exactly rather than interpreting or
  rebuilding from a display name.
- **Chilling effect** means people reasonably avoid lawful participation or speech because
  publication may expose them to disproportionate risk.
- **Tombstone ledger** means a public history retaining a removed ID, removal date and reason
  so the ID cannot silently be reused.
- **Supersession** means a newer record formally replaces an older one without erasing its
  history.
- **[Rights handling](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/)**
  means giving people a workable route to correction, objection, restriction or other
  applicable data-protection rights.
- **[Special-category data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)**
  means the categories given extra protection under UK data-protection law, including racial
  or ethnic origin, political opinions, religious or philosophical beliefs, trade-union
  membership, genetic data, biometric data used for identification, health, sex life and
  sexual orientation. The exact current law and guidance must be checked for the proposed use.
- **[Criminal-offence data](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/criminal-offence-data/)**
  includes allegations, investigations and proceedings as well as convictions, offences and
  related security measures. It has additional processing rules beyond an ordinary lawful
  basis.
- **Fail-closed** means the route returns no protected record unless every required approval is
  positively present.
- **Base dataset bytes** means the unenhanced public download itself, as distinct from support,
  uptime commitments or a genuinely new analysis built from it.
- **Words-and-actions ledger** means dated source records that keep a legal object, plan or
  self-report separate from a filing, award, payment, output, outcome or evaluation. It is an
  evidence structure, not a verdict about an organisation or person.
- **Source voice** means who made the statement: for example a regulator, funder,
  organisation, auditor or evaluator. Preserving it stops a self-report from being presented
  as an independent finding.
- **Asset-level admission** means reviewing the exact upstream table, field, document or file
  that would be collected. Approval of a publisher or website as a whole is not approval of
  every asset it exposes.

## Admission test for public distribution

“Public-safe” is project shorthand, not a settled category. Before a dataset enters the open
bulk catalogue, TaxSorted should record that:

1. It is non-personal, meaningfully aggregated, or limited to verified organisations under
   the definition above. Aggregate review includes small-cell suppression, differencing,
   intersections and re-identification when combined with other published tables.
2. Its public purpose is specific, and fields not needed for that purpose were removed.
3. TaxSorted has sufficient rights for what it distributes. If upstream replication rights
   remain unresolved, only TaxSorted-authored metadata, links and independently written
   summaries may be distributed; uncertainty cannot be handed to the reuser as permission.
4. Accuracy, context, correction, retention, security and reasonable expectations were
   considered.
5. Foreseeable harms were considered, including discrimination, chilling effects, harassment,
   vulnerability, reputational distortion and operational risk.
6. It contains no private contacts, home details, live operations or tactical information.

Passing the current technical screen means “candidate for this stated distribution”, not
human approval and not “harmless in every possible downstream use”. Human adoption and a
confidential safety-reporting route are separate production conditions.

## The design decisions

### Published public data needs no account

A dataset marked available in the open-data catalogue is free to read without an API key,
account or taxpayer session. Once the politics bulk corpus receives human approval and is
explicitly enabled, it is designed to remain available while named-person gates are closed.
Browser applications may read it directly from any website. Publication review is not a paid
tier and must not quietly become one.

A hosted publication switch is not confidentiality or revocation. Once material is committed
to the public repository or copied under an open licence, that copy cannot be recalled.
Sensitive or unapproved material must never enter the public static corpus; a switch only
bounds serving the current hosted API.

### Distribution is more than a readable endpoint

An open endpoint can still be difficult to reuse. A distributable dataset therefore needs:

- one machine-readable catalogue;
- stable dataset and record IDs;
- JSON, spreadsheet-friendly CSV and streaming NDJSON representations;
- a resolvable schema and an explicit schema version;
- repeatable response bytes, change fingerprints and `HEAD` checks that return metadata without
  downloading the body;
- record counts, dates, coverage and update cadence;
- source identifiers, direct source links, or an explicit TaxSorted-authored designation;
  licence notes; and a published correction method whose operational status is explicit;
- an OpenAPI description that matches the routes people can actually call.
- a machine doorway and one-call orientation response so an agent can discover publication
  states, rights, evidence lanes and safe next actions without scraping the human site;
- caller-held continuation links and append-only release history where consumers need to
  resume a mirror without TaxSorted storing their identity or session.

These are not decorations. They let another person mirror the data, detect change, validate a
copy and build without depending on TaxSorted's frontend.

For the tax-system, tax-industry, charity-sector and public-funding graphs, JSON means a lossless array in TaxSorted's deterministic form: object
keys sorted recursively, compact JSON scalar encoding and preserved array order. It is not RFC
8785/JCS. NDJSON uses that same form one record per line. CSV is convenience data: nested
values remain deterministic JSON and a leading apostrophe mitigates common spreadsheet-formula
triggers, but importer behavior varies and CSV is not a universal security boundary.

Their published JSON Schema is structural, not the whole boot acceptance contract. The schema
describes fields, required values, scalar types and enums. The dictionary also names boot-only
invariants such as real calendar dates, reference integrity, evidence-pointer validity,
reciprocal graph edges, contiguous pathway steps and cross-field money rules.

### Identity is explicit

Array position, display order and mutable labels are not identity. IDs are explicit and this
draft proposes that the project never recycle them. A rank may move without becoming a
different rank. A new record must not inherit an old record's ID.

New optional fields may be additive within a schema major. A published JSON Schema remains
snapshot-specific: a strict validator must fetch the schema matching the dataset version, and a
forward-compatible reader should tolerate a new optional field. Removing a field, making one
required or nullable, or changing its type, meaning, primary key or money unit is a breaking
change. The politics schema-shape checksum in the tests turns accidental top-level drift into a
visible review decision; the tax graphs do not yet have the equivalent frozen version guard.
The public-funding family now begins that audit trail with a hash-pinned
`snapshot-established` checkpoint. It deliberately does not invent retrospective record
changes. Its checked event-hash chain, unique cursor and ordered-sequence rules make a rewritten
checkpoint fail closed at boot. Later releases must append additions, updates, retirements and
tombstones. The deployment gate anchors that promise to the previously published live prefix,
checks the candidate before deployment, revalidates the live result afterward and serialises
releases. The promise therefore does not rest only on mutable source code. The other families
still need equivalent record-level histories.

A separate central ledger now gives all four open graph families an exact dataset-release
baseline and forward checkpoint contract. It does not reconstruct record events. Its checked-in
JSON is compared with the previously published live prefix before and after deployment, so an
old dataset checkpoint cannot be silently rewritten. JSON Feed and Atom are views of the same
rows. No immutable graph archive exists yet: the current graph URL is explicitly mutable and a
caller must compare its bytes with the checkpoint digest.

### Provenance travels with the meaning

A TaxSorted summary and the source material it describes are different layers with potentially
different rights. TaxSorted's curation licence does not relicense Parliament, government, a
regulator or another publisher. Reusers should retain record IDs, source IDs, dates and
attribution, follow the source ledger to the publisher, and independently confirm terms when
the ledger says they are unknown or under review.

Where a finance or relationship record could invite a causal inference, the API should state
what it does not prove. A donation does not prove influence. A meeting does not prove
agreement. A contract does not prove favouritism. A company role does not prove control of
every company action. An allegation, investigation, finding, sanction and appeal are different
states.

Official words and actions need the same discipline. A proposed event contract keeps an
institutional event, a separately gated named attribution and an append-only correction as
different records. A source-reported statement is not an outcome; a budget approval is not a
payment or outturn; a missing vote is unknown, not an inferred abstention. Full speeches,
embeddings, rhetoric scores, personality labels and inferred motives do not belong in the
public API.

### Words and actions stay comparable without becoming a score

TaxSorted's charity accountability contract is published before its data. The planned ledger
keeps legal objects, plans, self-reports, filings, awards, payments, outputs, outcomes and
evaluations as different evidence kinds. Each record type must carry the source use, attribution
and context it actually needs. A comparison must expose the applicable entity, dates, scope,
period, metric definition, method and known limitations instead of stripping them into a score.
A display name, address, shared domain or person is not an organisation join.

Multiple official identifiers for one organisation require a separate human-reviewed bridge
whose admitted source locator explicitly publishes both identifiers. The validator can check the
bridge structure, source permission and locator equality; it cannot mechanically prove what the
publisher's words mean. Mapping membership must point both ways between the mapping and exact
organisation. Uppercase-alphanumeric canonicalisation accepts only ASCII letters, digits, spaces
and hyphens; punctuation and Unicode lookalikes fail. Source permanence is explicit: a record
says whether only the current
publisher URL, a publisher version/digest or a lawfully archived link is known. Exact words mean
the words available at review time, not a promise that TaxSorted has archived the source.

Comparison is an evidenced relation between exact record IDs. It must name its rule and expose
the records a reader needs to reproduce the result. Missing evidence is a visible gap, not a
negative finding. Only a human-reviewed pair of logically incompatible records concerning the
same exact organisation identifier, period, scope key and definition, and metric key and
definition may be described as inconsistent. Different source voices, dates or methods remain
differences, not contradictions.

This design must not collapse the ledger into an honesty, trust, faith, efficiency, impact or
value-for-money score. Ordering by such a score would hide judgment, encourage false precision
and turn incomplete evidence into a character claim. Builders can publish their own analysis,
but TaxSorted's base contract should keep the source records, comparison rule and uncertainty
available so that analysis can be challenged.

The current endpoints publish only the index and structural JSON Schema at
`/v1/charities/uk/accountability` and `/v1/charities/uk/accountability/schema`. Their status is
`schema-only-not-admitted`; they contain no charity evidence rows. Collection remains blocked
by `confidential-correction-safety-intake`, requiring tested identity-safe triage, urgent
suppression and auditable resolution, and `asset-level-rights-admission-digest`, requiring a
reviewed link decision and locator-specific derived-use decision for every source asset. Its
content digest detects mutation of the declared review bytes; it does not prove legality or
reviewer identity. Those are the two immediate missing systems, not an exhaustive publication
test. The framework exposes nine `admissionConditions`, including controller/lawful-basis and
retention records, a formal DPIA decision, narrow field review, rollback exercises, reviewer
calibration, clear public explanation and a monitored stop. Version 1 validates candidate shapes
only and cannot authorise publication.

A checked-in zero-row example and bounded local runtime-validator command let builders exercise
the graph rules without sending data to TaxSorted. There is no accountability ingestion route;
passing either validator still means `candidate-not-admitted`.

Every public document and source-review field—not only title and URL—is covered by a human
no-person/no-sensitive-data/no-source-excerpt review. Permanence text, review IDs, attribution,
terms URLs, limitations, locators and bounded notes are in scope; locators must be pointers rather
than quotations. The assertion is explicit but is not automated semantic proof.

TaxSorted editorial derivation is restricted to structured exact-arithmetic
financial facts and labelled TaxSorted source-comparison evaluations. Reported,
audited and restated finance, programmes, funding, assets, control,
observations and outcomes stay externally attributed.

Unsafe small aggregates never remain beside a “suppressed” flag: the value-bearing record is
omitted and a privacy-reviewed `suppressed-for-disclosure-risk` coverage gap uses fixed safe
wording and no source-document pointer. It records the boundary without repeating the omitted
amount, sensitive context or a direct route back to either.
Every financial fact, aggregate or anonymous funding event, programme, observation, outcome and
evaluation carries the applicable publishable disclosure review.
Staff/pay metrics and aggregate public donations are always treated as people-derived with a
stated smallest cell; unknown or unsafe populations are omitted to a gap. Money differences remain safe integer minor units; ratios
store an exact numerator and non-zero denominator rather than a rounded float. Derived facts are
acyclic, recomputed signed sums of compatible input facts. Every derivation and numeric comparison
has a fresh disclosure review; a people-derived input keeps the result people-derived. Periods may
differ only for an explicit `change-over-time` comparison with every other dimension aligned.
Candidate assembly, evidence, reviews,
tombstones and a single predecessor chain have explicit time order. Normalisation waits for source
readiness; disclosure review waits for the record it approves; final privacy review waits for any
applicable normalisation and disclosure review; comparison waits for
both records and their required reviews. A derived financial fact waits for its inputs, then its
disclosure review follows; a numeric-result disclosure review follows the human comparison
review. IDs and release summaries
receive privacy review so a correction does not repeat removed content in metadata.
Each tombstone names the first candidate that carries it, and cannot take effect after that
candidate was assembled. It remains in every later candidate; each release's tombstone count
equals the cumulative retained ledger through that release.

Two money records cannot be labelled `inconsistent-with` unless their money
basis, measurement stage and amount date match as well as their organisation,
period, scope and metric. A changed stage stays a difference, not an accusation.

### Agent discovery should orient, not enlarge authority

The workspace implements `/agent.txt` and `/.well-known/agent.txt` as equivalent, small
machine-addressed discovery files. They point to the catalogue-derived JSON orientation at
`/v1/wake`; the API root returns the same bytes only when the caller asks for
`application/json`. The wake document points to OpenAPI, release history and the bounded
charity accountability shape. Public errors add RFC 9457 fields and bounded recovery actions
while retaining established endpoint fields; they do not silently loosen a filter or safety
wall to make a request succeed. Problem instances omit query values.

This narrow design was inspired by
[XENIA by Yu and Fable](https://github.com/cambridgetcg/xenia), an agent-interaction and
agent-experience framework published under CC BY-SA 4.0. The attribution is part of honest
provenance. TaxSorted does not thereby adopt XENIA as a whole or claim conformance: it does not
adopt ratings, decentralised identifiers, agent identity or continuity claims, wallets, tokens
or covenants. A discovery manifest grants no identity, permission or authority, and the
declared walls are not a cryptographic or service-wide compliance proof.

### Safety follows amplification and foreseeable harm

The bulk catalogue contains institutions, methods, aggregates and screened organisation-only
projections. It does not become a bulk people directory merely because a purpose-bound named
lookup is later approved.

This draft proposes that TaxSorted require named-person publication to have a necessary public
purpose, a documented legal reason for processing, fair notice where required, minimum fields,
accurate context, source-rights review, correction and rights handling, retention limits,
security controls, and specific review of vulnerable people, special-category data and
criminal-offence data. This is a policy checklist, not an exhaustive statement of law.

Current ICO guidance says special-category processing needs both an Article 6 lawful basis and
an Article 9 condition, with necessity, proportionality, minimisation, security and transparency
considered. Criminal-offence data has its own additional rules. The ICO also marks parts of its
guidance as under review following the Data (Use and Access) Act, so a release decision must
check the law and guidance current on that date rather than treating this draft as clearance.

Private contacts, home addresses, family details, applicant data, live deployments, tactical
plans and rank-and-file activity dossiers do not belong in this system. Accuracy, due process,
discrimination, chilling effects, security, vulnerability, context and reasonable expectations
also matter. Discomfort to a powerful institution, by itself, is not a reason to suppress an
accurate public record.

Generic institutional contact routes are the default. A named role contact needs a separate
necessity and safety review even when an official page publishes it. Private contacts are never
enriched, inferred or assembled into bulk output.

### Power ratings describe formal offices, not people

The visual power cards rate formal office authority in visible dimensions. They do not rate a
holder's character, intelligence, honesty, popularity, hidden influence or worth.

Every card must show its dimensions, evidence, constraints, jurisdiction, date and method
version. There is no universal person leaderboard. If a summary number is emitted, its
dimensions, constraints and method version must travel in the same record; the number must
never replace them.

In decision terms, this is where my confidence is lowest. A rubric makes judgment inspectable;
it does not make the judgment objective. External review and disagreement are features, not
threats.

### Live queries and bulk snapshots have different duties

A bounded live query can reflect an official source's current state. A bulk historical mirror
also needs retention, correction, supersession and deletion rules. That is why
contract awards where supplier identity is disclosed only for verified organisations are
currently a bounded query service rather than an ever-growing static archive.

## What is true now

- `/agent.txt`, `/.well-known/agent.txt` and `/v1/wake` provide a stateless machine doorway
  derived from the same open-data catalogue. The API root is a negotiated JSON alias, not a
  replacement for its default 404. This is XENIA-inspired and makes no conformance, identity or
  trust-score claim.
- The tax-system, tax-industry, charity-sector and public-funding graphs implement a discovery catalogue, structural schema,
  recursive field dictionary, complete JSON/NDJSON/CSV collection-export shapes and a
  mixed-rights statement without requiring a caller account. Their protected collection and
  full-graph bodies remain behind separate production-publication switches.
- The charity-sector boundary publishes legal and institutional explanations, official register
  doors and aggregate disclosure definitions. It does not publish charity-by-charity rows, named
  trustees, personal contacts, work histories, named pay or any inferred religious belief.
- The charity accountability index and JSON Schema publish an organisation-only words-and-actions
  model with source-backed identifier bridges, link-only source bodies, human-reviewed
  inconsistency rules, stable candidate chains and safe tombstones. Their status is
  `schema-only-not-admitted`; no data collection is populated or admitted. Two immediate blockers
  and all nine wider admission conditions remain unresolved.
- The public-funding boundary publishes institutions, formal offices, governance units,
  aggregate allocations and functional contacts. It keeps office-holder names at dated official
  links and does not claim that pooled tax receipts trace to a specific provider or beneficiary.
- All four tax, industry, charity and public-funding graphs expose `/records/{id}` so a caller
  can resolve a stable ID without guessing its collection. Closed publication makes unknown and
  protected IDs deliberately indistinguishable. Public-funding query pages expose continuation
  links and `/changes` exposes its record-history baseline. Government words-and-actions events
  remain a proposed method, not a released dataset.
- `/v1/open-data/releases` exposes exact dataset checkpoints for all four graphs, with JSON Feed
  and Atom views and a deployment-enforced append-only prefix. It makes no retrospective
  record-change claim and no claim of exact publication time.
- Tax graph, structural-schema, dictionary, export-index and collection-export bodies and
  validators are prepared when the route is created. Meaningless query parameters on tax
  static routes are rejected instead of creating silent cache variants.
- The tax manifest hash is SHA-256 of the deterministic UTF-8 bytes returned by `/graph`, so a
  mirror can verify the downloaded graph directly.
- The central catalogue states an irregular, evidence-driven update policy for each tax graph,
  makes the absence of a promised next release date explicit, and says that the present public
  correction route requires an account and cannot receive sensitive information.
- Tax GET routes and the central catalogue have matching OpenAPI HEAD operations, including
  `If-None-Match` and the response validators returned by the implementation. A bounded public
  OpenAPI document and five self-contained dataset slices are cacheable by exact-byte ETag; a
  slice rejects any operation that does not explicitly declare itself sessionless.
- The politics catalogue contains 19 static datasets collectively screened against this draft
  boundary by agents and tests. The machine-readable
  `/v1/politics/uk/datasets/admissions` ledger now states the purpose, limits, field contracts,
  rights decision, risks and mitigations for each dataset; every human decision is still pending.
- Static datasets have JSON, CSV and NDJSON downloads, schemas, stable IDs, exact-byte ETags
  and SHA-256 checksums.
- The 19 bulk dataset export projections use explicit top-level field allowlists, deep copies
  and exact nested-path contracts. A new top-level property is omitted; an unknown nested path
  stops boot until reviewed, rather than being published merely because it appeared in a reused
  object.
- A bulk-data emergency stop can close curated static record bodies across both export and
  older static reading routes while leaving discovery, rights, bulk dataset schemas and the correction
  method readable.
- That stop acts at the origin after configuration rollout; it cannot recall downloaded copies,
  and an already-fresh politics bulk response may remain in a browser, application or CDN cache
  for up to its stated one-hour freshness bound unless the operator can purge it.
- HTTP licence links resolve to a mixed-rights statement rather than presenting TaxSorted's
  curation licence as a blanket licence over source material.
- The central catalogue states that static routes currently have no application-level rate
  limit, may still face hosting or network abuse controls, and carry no uptime promise.
- OpenAPI names all current UK politics route paths and the standard public error media types.
  Distribution responses have top-level field schemas; nested values and many older success
  responses still use broad response objects.
- Named current-member, political-finance, ministerial-benefit and senior-officer routes are
  controlled by separate fail-closed gates. This workspace does not establish that any
  production gate is open.
- Production bulk serving has its own explicit enable switch and remains closed until a human
  approves the boundary and admission ledger, and a confidential
  safety-reporting route is live.
- Production cannot report `open` from the serving switch alone. It also requires the public
  approver, approval date, exact current admission-ledger digest and HTTPS confidential-intake
  URL; catalogue, ledger and record descriptors then expose one coherent decision.
- The code and local tests are not proof of production deployment. The live service must be
  checked separately after an authorised deploy.

## What may be wrong or incomplete

These are gaps, not footnotes:

- The UK map is a Westminster and principal-institution foundation. It is not every local,
  devolved, specialist or historical political actor.
- Source and licence notes are careful summaries, not independent legal clearance for every
  possible downstream use.
- The power rubrics can encode researcher judgment even when every dimension is visible.
- Enforcement power cards currently give one source list for the whole card rather than
  source-to-score evidence for each dimension.
- There is no immutable public archive of every past dataset release yet.
- Outside the public-funding change baseline, there is no per-record release and tombstone
  history. The central dataset checkpoint ledger therefore cannot yet prove that a removed ID
  was never recycled between releases.
- The public correction method is defined, but the complete public intake and response service
  is not live yet. GitHub issues require an account and must not contain private, personal or
  safety-sensitive details; a private correction route is still missing.
- The missing confidential route is a production blocker for bulk publication because urgent
  evidence of a personal leak must not be posted publicly.
- The charity accountability model also lacks a tested confidential correction and safety
  intake with identity-safe triage, urgent suppression and auditable resolution. Its public
  schema must not be mistaken for permission to collect organisation records.
- No proposed charity source asset yet has the asset-level link and locator-specific derived-use
  decisions required by the accountability contract. A publisher-level or site-level decision
  is not enough; a review digest would detect mutation of its declaration, not certify it. The
  locator is a human assertion and TaxSorted v1 keeps no general source archive or content proof.
- The accountability controller/lawful-basis record, formal DPIA, narrow field review, end-to-end
  correction and rollback exercise, comparison calibration and monitored emergency stop also do
  not exist. Resolving the two immediate blockers alone cannot admit organisation rows.
- The source ledger does not yet state exact reuse terms for every source; some entries point
  to the publisher and leave the rights decision open.
- No numeric capacity limit or uptime service level is promised; the current service is best
  effort even though the data can be mirrored or self-hosted.
- Most non-distribution politics responses are documented in OpenAPI by route and parameters,
  but do not yet have exact field-by-field response schemas.
- Tax collection operations in OpenAPI still use a generic union of filters and broad
  list/detail response objects. Exact per-collection operations and schemas are owed now, not
  only after a generated-client complaint.
- Tax graph version changes are validated at boot, but ID non-reuse is not yet checked against
  a prior published release.
- Upstream live services can be unavailable, delayed or changed without TaxSorted's consent.
- A source being public does not settle database rights, personal-data duties or the ethics of
  bulk indexing.
- The schema-shape test interrupts changes to top-level fields. It does not understand changed
  meanings, nested structures, money units or ID reassignment, and it cannot force a developer
  to choose the correct version number.
- Bulk safety still depends partly on field review and tests. Text inside an allowed field can
  carry personal or misleading detail even when its key has an innocent name.

If one of these statements stops being true, this document should change in the same work as
the code.

## Rules for the next builder

Before publishing or changing a dataset:

1. Name the exact public purpose and the people or institutions affected.
2. Record fairness and notice, minimum fields, accuracy and context, retention, correction and
   rights handling, security, reasonable expectations, vulnerable people, and any
   special-category or criminal-offence data. For aggregates, test small cells, differencing,
   intersections and re-identification with other public tables.
3. Use an explicit stable ID; never use an array index or presentation order.
4. State coverage, omissions, dates, sources, known reuse terms and, for evidentiary records,
   what the record does not prove. Unresolved replication rights keep upstream content closed;
   they do not become a warning delegated to the reuser.
5. Decide whether the change is an optional addition or a breaking schema change.
6. Test every download format, conditional request, checksum and record count.
7. Test prohibited keys and known sensitive patterns, then manually review every allowed
   free-text field; tests alone cannot prove that sensitive text cannot escape.
8. Update OpenAPI and the human guide in the same change.
9. State whether correction intake is live and provide a bounded off-switch before a risky
   source goes live.
10. Never infer influence, guilt, personality or intent from a join.
11. Never write “all” when the honest word is “current”, “principal”, “mapped” or “known”.

## Handoff between builders

The intention is not to collect the most data. It is to remove needless permission from access
to public records screened for their stated distribution while adding deliberate friction
before personal information is amplified.

Challenge this design with evidence. Keep a boundary when it has a stated safety, rights,
integrity, security, anti-abuse, reliability or source-licence purpose. Remove identity-based
approval or access friction when it serves only TaxSorted's control. Publish reasonable rate
limits and reliability controls plainly so they cannot masquerade as selective access. Say
“unknown” when the source, licence, law or method does not support a stronger word.

## The commercial boundary now stated

The README and `PRINCIPLES.md` now distinguish the commons from optional paid work. TaxSorted's
public-law reference corpus and base dataset bytes marked available in the open-data catalogue
are free and need no account. Published anti-abuse controls are compatible with that promise.
Paid filing support, reliability commitments or genuinely derived services can also be
compatible if they do not become the only practical route to the base public materials.

This resolves the previous textual contradiction; it does not decide prices or a broader
commercial model. Yu remains the human owner of that decision and should change these words if
the distinction does not match the intended service.
