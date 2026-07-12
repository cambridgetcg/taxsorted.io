# TaxSorted.io

**Tax, understood. Then sorted.**

International tax, made simple for everyone — a person, a business, a charity, a trust:
same door, same plain words, same engine. Three things in one calm place:

- **Learn** — the open book. Every rule we cover explained in plain words: what it means,
  what you must do, what you can skip, how to optimise. Free, public, no account.
- **File** — the workbench. Every figure derived from your records (*derive, never key*),
  the answer first, nothing sent without your eyes and your consent.
- **Connect** — the rails. A direct line to the authorities themselves (HMRC first —
  being built), and the same engine as a typed API: every answer a person reads,
  software will be able to call.

Underneath sits one engine; every country is rules, dates and words plugged into it —
never a fork of the product. The UK is drawn first and drawn deep: the proof, not the limit.

TaxSorted's open book, public-law reference corpus and base public datasets are a **commons**:
free and open-source, no price, no bait tier, no donations button. Optional filing support or
derived services may charge fairly for work that saves time or money, but payment must never
become the practical gate to those base public materials. People file their own taxes; we pave
the road.

**Now building:** Making Tax Digital for Income Tax (mandatory since 6 April 2026 for
sole traders & landlords over £50k) — digital records → cumulative quarterly updates →
year-end return, aiming to be the first open-source software on HMRC's recognised list.
2026-27 has no penalty for missing a quarterly-update deadline, but every required update is still
required before the return can be submitted. The annual return and payment rules remain.

**Tax expert foundation:** `/uk/tax-expert` publishes an honest coverage map and a local-only
MTD Income Tax readiness expert. The API exposes the same understanding as
`taxsorted.tax-answer/1`: explicit facts and unknowns, applicability, reasoning, source kind and
legal force, confidence basis, escalation and data use. Its shared why graph traces the reached
path from conclusion to facts, binding rules, claims, sources, institutions, consequences and
explicit gaps in challenge routing without copying supplied case values into graph text. The
authenticated assessment sits beside
the source-backed SDLT calculator; both use strict bounded requests and never guess zero. See
[`docs/API.md`](docs/API.md), `GET /v1/uk/tax-expert` and `GET /openapi.json`.

See [PRINCIPLES.md](PRINCIPLES.md) for what we believe.

## Project Structure

```
taxsorted.io/           # npm workspaces: engine · frontend · api
├── PRINCIPLES.md       # The soul
├── engine/             # One engine, countries as plugins — pure TypeScript
│   └── jurisdictions/uk/   # Plugin #1: tax rules plus the expert contract and coverage registry
├── frontend/           # Next.js web application (static export)
│   └── src/app/        # Landing (the map), dashboard, vat/ (real cockpit + demo)
├── api/                # The rails — Hono on Fly.io: browser accounts + workspace API keys
│   ├── migrations/     # Postgres: sessions → entities → connections → submissions
│   └── RUNBOOK.md      # How the HMRC rail switches on
├── regs/               # Our understanding of the law, open and cited — wrong is catchable
├── research/           # The Learn pillar's source of truth
│   ├── _schema/        # Meta-models every country fills in
│   ├── world/          # True everywhere — neutral tax ontology
│   └── uk/             # Country #1: filing, laws, entities, deadlines, …
├── docs/               # Specs, plans, runbooks
└── infrastructure/     # Delivery truth
```

## Getting Started

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
npm test       # the quality gate — tax math is tested as data-driven cases
```

## Tech Stack

- **Frontend**: Next.js 16 (App Router, static export), React 19, TypeScript, Tailwind CSS 4
- **Deployment**: Fly API first, then Cloudflare Pages. CI runs tests, typechecks, data
  validators, a high-severity production dependency audit and the static build on every push;
  frontend deployment proceeds only after the API deploy succeeds.
- **Backend**: `api/` — Hono + Postgres on Fly.io (London): anonymous device
  sessions, server-side HMRC OAuth with an encrypted token vault, engine-validated
  submission, immutable receipts. One typed API for humans and agents alike.
  Sandbox first; production filing follows HMRC's approval (see `api/RUNBOOK.md`)
- **Developer API**: server-to-server workspace keys (SHA-256 digests at rest), OpenAPI 3.1,
  `POST /v1/uk/sdlt/calculations` and
  `POST /v1/uk/tax-expert/mtd-income-tax/assessments`. Tax requests are stateless, reject
  duplicate JSON facts and never create the browser cookies used by the filing cockpit.
- **Machine doorway**: public, sessionless `/agent.txt`, `/.well-known/agent.txt` and
  `/v1/wake` routes orient agents with current dataset versions, publication states, rights,
  evidence lanes, safety walls and typed next actions. A separate tax-expert task descriptor
  names its authenticated `POST`, workspace scope, input/storage boundary and OpenAPI contract
  without changing the doorway's read-only access claim. The design is inspired by XENIA; no
  conformance claim or agent identity/session is created.
- **Shared why graph**: sessionless `GET /v1/why-graph`, its structural schema at
  `/v1/why-graph/schema`, adopter index at `/v1/why-graph/adopters` and task-sized
  `/openapi/why-graph.json` publish the connective contract used by the MTD expert and charity
  tax-treatment records. The graph is a derived traversal index, not a second source of truth or
  ingestion route. It separates who acts, who administers and who makes an official decision;
  a TaxSorted result is not an HMRC decision and missing enforcement or appeal coverage remains a gap.
- **Tax-system graph**: implemented sessionless `GET /v1/tax-system/uk` routes, with protected
  bodies behind an explicit production-publication switch, covering the
  authority chain, collection lanes, accounts, infrastructure, private collaborators,
  permissions, enforcement, challenge routes, cases, evidence and known transparency gaps.
- **Tax-industry graph**: implemented sessionless `GET /v1/tax-industry/uk` routes, with protected
  bodies behind an explicit production-publication switch, covering
  roles, qualifications, exams, study materials, costs, pay evidence, origins, legal and
  market gates, lawful entry paths and the mechanics of structural barriers.
- **Charity-sector graph**: sessionless `GET /v1/charities/uk` routes explain official UK
  registers, legal forms, conditional tax treatments, obligations, funding, finance and pay
  disclosures, control structures and safe help routes. Every tax treatment has a deterministic
  `/v1/charities/uk/tax-treatments/{id}/why-graph` trace with exact field evidence and explicit
  law, case-applicability and challenge-route gaps. A schema-only accountability door at
  `/v1/charities/uk/accountability`, with its structural contract at
  `/v1/charities/uk/accountability/schema`, explains how a later words-and-actions ledger would
  keep attributed, human-reviewed paraphrases linked to reviewed source locators, expose source
  permanence, preserve applicable dates, defined scope and exact identifiers, and avoid a trust
  score. Locator meaning is an editorial assertion, not mechanical proof. Version 1
  describes and validates only `candidate-not-admitted` documents; no route accepts or publishes
  them. Its status is `schema-only-not-admitted`, it contains no organisation records, and its
  two immediate blockers do not replace the nine-condition publication test. The first
  release deliberately has no mirrored charity-by-charity records, people directory, personal
  contacts or inferred beliefs.
- **Public-funding graph**: sessionless `GET /v1/public-funding/uk` routes map the pooled-tax
  fiscal spine, health and education funding, all four UK nations, formal offices, boards,
  aggregate allocations, functional contacts, delivery stages, audit and known gaps. It does
  not pretend an ordinary tax pound can be traced to one school or hospital.
  The append-only `/changes` feed lets mirrors resume from caller-held cursors, while
  `/records/{id}` resolves stable IDs without making builders guess their collection.
- **Observer accountability**: sessionless `GET /v1/accountability/uk` publishes the
  “observer is also observed” protocol, official investigation/appeal/oversight source doors and
  a zero-row candidate contract. The schema at `/v1/accountability/uk/schema` separates formal
  institutional relations, investigation engagements, public actions, institutional responses
  and coverage gaps. Every observer needs a sourced accountability route or an explicit gap;
  there are no people dossiers, private networks, live-case records, motive inferences or scores.
- **Shared machine contract**: tax-system, tax-industry, charity-sector and public-funding maps
  all expose `/records/{id}`. `/v1/open-data/releases` publishes deployment-guarded dataset
  checkpoints with JSON Feed and Atom views. `/openapi-public.json`, five dataset slices, a
  separate observer-accountability and why-graph framework slices and one secured tax-expert task slice give
  agents bounded, cacheable contracts; the full `/openapi.json` remains available. Public errors
  carry RFC 9457 fields and recovery actions without reflecting query values.
- **Rails**: HMRC MTD (REST) first; each country's authority lights up as it's proven

Agents can begin at `/agent.txt` or `/.well-known/agent.txt`. Those byte-identical small text
manifests point to the canonical JSON orientation at `/v1/wake`, public/full OpenAPI, the
open-data catalogue and release feeds,
the charity and observer accountability shapes, the why-graph contract, the separately credentialed tax-expert task and
the safety walls. The API root returns the same wake bytes
only when a caller explicitly asks for JSON; its ordinary closed-door response is unchanged. The
charity API also turns errors into instructions:
a refusal names the reason, confirms the walls remain intact and gives bounded next actions.
These files are implemented in this workspace; check the public host before treating them as
deployed.

That narrow interaction pattern was inspired by
[XENIA by Yu and Fable](https://github.com/cambridgetcg/xenia), published under CC BY-SA 4.0.
TaxSorted borrows machine discovery, orientation and useful refusal ideas; it does not adopt
XENIA's ratings, decentralised identifiers, identity model, tokens or wider agent-world claims.

## Self-hosting & HMRC credentials

Register YOUR OWN application on HMRC's Developer Hub — client_id/client_secret
are never published or shared (HMRC policy). See `api/RUNBOOK.md`.

## Documentation

- [`research/README.md`](research/README.md) — the open book's index
- [`research/uk/filing/README.md`](research/uk/filing/README.md) — every UK filing
  obligation: forms, deadline formulas, penalties, API specs, submission workflow
- [`research/uk/personal-tax/README.md`](research/uk/personal-tax/README.md) — UK personal-tax optimisation playbook (玩爆英國個税), source ledger, and safe boundaries
- [`research/uk/tax-expert/README.md`](research/uk/tax-expert/README.md) — the shared evidence contract, capability map, privacy boundary and first deep MTD path
- [`research/uk/tax-types/sdlt.md`](research/uk/tax-types/sdlt.md) — the first SDLT ruleset,
  its primary sources, exclusions, rounding and legacy XML recognition path
- [`research/uk/tax-system/README.md`](research/uk/tax-system/README.md) — who makes,
  feeds, runs, funds, challenges and enforces UK tax, with a machine-readable evidence graph
- [`research/uk/tax-industry/README.md`](research/uk/tax-industry/README.md) — how people
  enter the industry, what each credential or licence really does, who controls it and pays
- [`research/uk/charities/README.md`](research/uk/charities/README.md) — how the UK charity
  sector works: relief conditions, registers, money, stewardship, duties and safe reuse
- [`research/uk/charity-accountability/README.md`](research/uk/charity-accountability/README.md)
  — the zero-row words-and-actions contract, full admission conditions, example and validator
- [`research/uk/public-funding/README.md`](research/uk/public-funding/README.md) — how pooled
  public money becomes authority, allocations, health and education delivery, accounts and audit
- `/uk/accountability` — public page: who watches, under what authority and method, what they
  publish, who can challenge them, and where the evidence still stops
- [`research/uk/politics/official-events-method.md`](research/uk/politics/official-events-method.md)
  — proposed evidence contract for official words, votes, decisions and actions; named
  attributions remain unimplemented behind a separate legal and human review
- [`docs/PUBLIC-DATA-CHARTER.md`](docs/PUBLIC-DATA-CHARTER.md) — the agent-authored draft
  explaining the public API's distribution, safety and rights choices; awaiting Yu's adoption
- `/uk/tax-industry` — public page: roles, exams, lawful routes, pay, origins and barriers
- `/uk/charities` — public page: conditional reliefs, regulators, money, control and help routes
- `/uk/public-funding` — public page: where tax joins public funds and how health and education money moves
- `/uk/personal-tax` — public page: 7 UK plays, official receipts, ordinary counter-moves
- `/uk/tax-expert` — public page: honest UK coverage stages and a local-only MTD readiness assessment
- `regs/research/` — the MTD Income Tax regulatory corpus: mandate, API surface,
  recognition process, fraud-prevention headers, 2026-27 tax substance — every claim cited

## UK personal tax threshold optimiser

The engine now includes a legal UK personal threshold scanner for 2026/27:

```ts
import { planUKPersonalTax } from "@taxsorted/engine/uk/personal";

const plan = planUKPersonalTax({
  employmentIncome: 112_000,
  children: 2,
  reliefAtSourcePensionContributionsNet: 9_600,
});
```

It is deliberately **planning/compliance tooling**, not evasion tooling. It highlights
lawful pressure points and records the caveats instead of inventing fake loopholes:

- adjusted net income and reliefs
- £100,000 Personal Allowance taper / effective 60% band
- High Income Child Benefit Charge around £60,000–£80,000
- pension annual allowance, tapered annual allowance and MPAA warnings
- dividend allowance and CGT annual exempt amount reminders
- legal levers such as pension contributions, salary sacrifice, Gift Aid, ISA sheltering,
  disposal timing and spouse/civil-partner planning where real and documented

Scope note: the module covers UK-wide thresholds and England/Wales/Northern Ireland
non-savings income-tax bands. Scottish earned-income bands are flagged as a caveat rather
than silently miscalculated.

## License

Code: AGPL-3.0 (see [LICENSE](LICENSE)) — the MTD VAT precedent showed free tools get
captured and re-priced; AGPL keeps hosted forks honest. Content (Learn pages, `regs/`
research corpus): CC BY-SA 4.0 (see [CONTENT-LICENSE](CONTENT-LICENSE)).

Built in the open by one human and one AI, mapped to HMRC's generative-AI guidelines
(transparency page coming with M2).
