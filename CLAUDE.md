# TaxSorted.io

## What This Is
International tax platform — every country, every tax, every kind of taxpayer (person,
business, charity, trust). Three pillars: **Learn** (open book of tax rules in plain
words), **File** (derive-never-key workbench), **Connect** (rails to the authorities +
the same engine as a typed API). One engine; countries are plugins — rules, dates and
words, never forks. The UK is jurisdiction #1, the proof. Read PRINCIPLES.md first;
it is the soul and the design language.

## Current State
Restated 2026-06-12 from UK-only to international scope; rails built the same day.
npm workspaces: `engine/` (carved out, tests green), `api/` (Hono + Postgres,
HMRC sandbox connector with live credentials in Fly secrets, verified via
`GET /v1/health` → `hmrc.configured:true`), `frontend/` (real cockpit at /vat wired
to the api; demo "sample books" routes kept and labelled). Anonymous device sessions
are v1 auth — real accounts are a hard precondition for production filing.

## Tech Stack
- Next.js 16 (App Router, **static export** — no server runtime in frontend)
- React 19, TypeScript, Tailwind CSS 4, Radix UI components
- Vitest (testing — gates the CI build)
- Deploy: **Cloudflare Pages**. CI (GitHub Actions) tests and builds every push; the
  deploy step skips until the `CLOUDFLARE_API_TOKEN` secret is added, so deploys are
  manual (`npm run deploy`) today. CI verified green by dispatch 2026-06-12 after its
  first three runs (2026-06-06) startup-failed on a GitHub-side validation hiccup.
- Backend (planned): Fly.io (lhr) + Postgres; the AWS/Aurora terraform plan is retired

## Project Structure
- `frontend/` — Next.js web application
  - `src/app/` — landing (the map), `(dashboard)/`, `vat/[entityId]/`
  - `src/lib/vat/` — pure UK VAT engine: compute, explain, categorise, optimise,
    deadlines, effective-dated config (`Dated`/`pick`) — destined for
    `engine/jurisdictions/uk/` when the engine is carved out
  - `src/lib/hmrc/` — HMRC MTD client (OAuth, fraud headers) — needs a server to be real
- `research/` — the Learn pillar's source
  - `_schema/` — the shapes every country fills in (being promoted out of `uk/`;
    see its README for where each shape lives today)
  - `world/` — jurisdiction-neutral knowledge (tax ontology)
  - `uk/` — country #1: `filing/`, `laws/`, `entities/`, `tax-types/`, `deadlines/`,
    `competitive/`, `technical/`
- `infrastructure/` — delivery truth lives in `.github/workflows/deploy.yml`

## Direction (the roadmap's spine)
1. Ship `/learn` from the research corpus — public pages, zero backend needed
2. ~~Carve out `engine/`~~ done 2026-06-12 (`engine/jurisdictions/uk/`; core
   abstractions — money in minor units, rule tables — still to extract)
3. ~~Stand up `api/`~~ built 2026-06-12, deployed to Fly with HMRC sandbox
   credentials live. Production credentials: not yet applied for (milestone M3);
   hard precondition: real user accounts before any production rail
4. Wire the UK end to end (sandbox receipt = the proof), then country #2
   (Ireland VAT3); adding a country must touch no core code

## How to Run
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
npm run build  # Production build (static export to out/)
npm test       # Run tests — keep green; CI runs this before every build
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
- `PRINCIPLES.md` — read this first
- `frontend/src/app/page.tsx` — the map (landing)
- `frontend/src/lib/vat/` — the engine seed
- `research/uk/filing/README.md` — UK filing requirements overview
- `research/uk/filing/submission/workflow/submission-workflow.md` — the 5-layer
  submission architecture (Entity → Obligation Resolver → Filing Registry →
  Submission Router → Status Tracker); UK-instanced today, built to generalize
