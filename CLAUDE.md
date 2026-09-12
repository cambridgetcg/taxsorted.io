# TaxSorted.io

## What This Is
International tax platform — every country, every tax, every kind of taxpayer (person,
business, charity, trust). The public journey is **Check · Plan · Books · File ·
Put it right · Understand**. One engine; countries are plugins — rules, dates and
words, never forks. The UK is jurisdiction #1, the proof. Read PHILOSOPHY.md first —
the ground (law is a creation; execution is its meaning; the product exists to close
the execution gap from the citizen's side) — then PRINCIPLES.md, the soul and the
design language that rests on it. The philosophy is core, not a module: every service
expresses it (the expression map is in PHILOSOPHY.md §"What this demands of us"),
and its public face is `/philosophy`.

## Current State
Source map reviewed 2026-09-12. Start with [docs/README.md](docs/README.md) for the
current contracts, source ownership and historical plans. Source inspection does not
establish that a production switch is open or that tax sources have been re-reviewed.

The npm workspaces are `engine/`, `api/` and `frontend/`. Starter Books serves UK
sole traders and landlords with browser-local records, CSV/manual import, explicit
review and per-business figures. An Account does not back up those books. Planning
inputs, learning examples and actual records remain separate. Passkey accounts and
recovery codes exist; anonymous device sessions support the sandbox path.

VAT and MTD Income Tax have labelled sandbox rails. Income Tax covers status,
obligations, business discovery, quarterly updates, narrow in-year calculations and
receipts. Year-end filing and production HMRC recognition remain outstanding.

The synthetic accounting connector proves local page commits and whole-run checkpoints
in development. Xero has an implemented, default-closed private authorisation pilot:
OAuth, encrypted token custody and explicit organisation binding, with no financial
dataset reader. See [api/RUNBOOK.md](api/RUNBOOK.md#private-xero-authorisation-pilot).

Developer API slice added 2026-07-10 and deepened through 2026-07-15: pure UK residential SDLT
calculation and MTD Income Tax readiness assessment, primary-source ledgers, workspace API keys
hashed at rest, a public professional-tools manifest, and task-sized OpenAPI 3.1. A valid caller can
inspect only its presented key at `GET /v1/api-workspace`; operators can issue finite-lived keys,
overlap rotation and explicitly revoke. It is server-to-server and stateless and never creates the
browser sessions used by the human filing cockpit. Public key intake/delivery, self-service,
authenticated operator audit, filing and HMRC recognition are not live.

Public research datasets, schemas and agent discovery have their own publication
controls. A schema, candidate corpus or source connection is not proof of an admitted
dataset, a current tax answer or permission to file.

## Tech Stack
- Next.js 16 (App Router, **static export** — no server runtime in frontend)
- React 19, TypeScript, Tailwind CSS 4, Radix UI components
- Vitest (testing — gates the CI build)
- Deploy: **Fly.io first, then Cloudflare Pages**. CI tests, validates, builds and deploys
  every push to `main`; the frontend moves only after the API and its live contract checks
  pass. See `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` and
  [infrastructure/README.md](infrastructure/README.md) for the release contract.
- Backend: Hono on Fly.io (`lhr`) + Postgres; the AWS/Aurora terraform plan is retired

## Project Structure
- `engine/` — shared pure TypeScript contracts and calculations
  - `core/` — accounting contracts and the shared why graph
  - `jurisdictions/uk/` — ITSA, VAT, personal tax, SDLT and expert/Passport modules
- `api/` — Hono routes, account/session boundaries, HMRC and accounting adapters,
  publication controls, Postgres migrations and operator tools
  - `src/app.ts` — application composition; `src/index.ts` — process bootstrap
- `frontend/` — Next.js web application
  - `src/app/` — public task hubs, local books, guides and labelled sandbox routes
  - `src/features/books/` — shared Books workspace used by Books and ITSA route wrappers
  - `src/lib/` — browser storage, imports, derived figures and typed API clients
  - `src/components/` — shared UI and task components
- `research/` — source notes, methods, candidate material and runtime datasets
  - `_schema/` — the shapes every country fills in (being promoted out of `uk/`;
    see its README for where each shape lives today)
  - `world/` — jurisdiction-neutral knowledge (tax ontology)
  - `uk/*/data/` — several corpora are imported by the frontend and read by the API;
    moving them requires updating consumers, validators and Docker copy rules together
- `regs/research/` — dated MTD and government research, with source and verification notes
- `content/seeds/` — recovered legacy copy with stale figures; not publishable as-is
- `docs/` — current product and integration contracts plus historical implementation plans
- `infrastructure/` — delivery truth lives in `.github/workflows/deploy.yml`

## Direction (the roadmap's spine)
1. Strengthen the current local-books journey: review, separate businesses, source trails,
   export/restore, evidence custody, reconciliation and completeness.
2. Renew overdue tax-source reviews before admitting answers. Preserve honest
   `source_review_required`, unknown and out-of-scope outcomes.
3. Extend the bounded Xero authorisation pilot into one read-only financial adapter through
   the existing review boundary only after its privacy, deletion and incident gates hold.
4. Complete Income Tax year-end and account/payment follow-through, and derive VAT from
   reviewed books. Keep sandbox, prepared, approved, delivered and receipted states explicit.
5. Close the recognition and operational gates in `api/RUNBOOK.md` before production filing.
   Wider providers, entities and jurisdictions follow the shared contracts and proven scope.

## How to Run
```bash
# From the repository root, using Node 22 and the committed lockfile:
npm ci
npm run dev --workspace frontend  # http://localhost:3000
npm test                          # all workspace suites
npm run typecheck
npm run validate:learn
npm run build                     # static export to frontend/out/
```

## Conventions
- Plain words everywhere — UI copy, code names, docs. No jargon, no fear.
- Prepare vs file stays honestly distinct: prepared = figures ready, filed = sent
  and receipted. Never blur the two. Only show doors that open (no dead links).
- Money/dates/rates are versioned config (`Dated`/`pick`), never constants.
- Research docs keep metadata headers (Last Updated / Confidence / Status) and
  one-canonical-home-per-fact.

## Kingdom Engine
Independent (TaxSorted.io product)

## Key Files
- [docs/README.md](docs/README.md) — ordered reading path and current/historical boundaries
- [docs/ACCOUNTING-PRODUCT.md](docs/ACCOUNTING-PRODUCT.md) — evidence through filing
- [docs/PEOPLE-POWER-TAX-FRAMEWORK.md](docs/PEOPLE-POWER-TAX-FRAMEWORK.md) — planning,
  consent, capability states and release tests
- [docs/ACCOUNTING-INTEGRATIONS.md](docs/ACCOUNTING-INTEGRATIONS.md) — provider and HMRC boundaries
- [docs/API.md](docs/API.md) — public and authenticated machine contracts
- [api/RUNBOOK.md](api/RUNBOOK.md) — publication controls, sandbox proofs and remaining gates
