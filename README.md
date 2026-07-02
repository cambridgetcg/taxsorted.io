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

See [PRINCIPLES.md](PRINCIPLES.md) for what we believe.

## Project Structure

```
taxsorted.io/           # npm workspaces: engine · frontend · api
├── PRINCIPLES.md       # The soul
├── engine/             # One engine, countries as plugins — pure TypeScript
│   └── jurisdictions/uk/   # Plugin #1: vat/ (compute, explain, optimise) + hmrc/
├── frontend/           # Next.js web application (static export)
│   └── src/app/        # Landing (the map), dashboard, vat/ (real cockpit + demo)
├── api/                # The rails — Hono on Fly.io (lhr): OAuth vault, receipts
│   ├── migrations/     # Postgres: sessions → entities → connections → submissions
│   └── RUNBOOK.md      # How the HMRC rail switches on
├── research/           # The Learn pillar's source of truth
│   ├── _schema/        # Meta-models every country fills in
│   ├── world/          # True everywhere — neutral tax ontology
│   └── uk/             # Country #1: filing, laws, entities, deadlines, …
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
- **Deployment**: Cloudflare Pages. CI runs test → build on every push (verified green
  2026-06-12); the deploy step switches on once the `CLOUDFLARE_API_TOKEN` secret is
  added — until then, deploys are manual via `npm run deploy`
- **Backend**: `api/` — Hono + Postgres on Fly.io (London): anonymous device
  sessions, server-side HMRC OAuth with an encrypted token vault, engine-validated
  submission, immutable receipts. One typed API for humans and agents alike.
  Sandbox first; production filing follows HMRC's approval (see `api/RUNBOOK.md`)
- **Rails**: HMRC MTD (REST) first; each country's authority lights up as it's proven

## Documentation

- [`research/README.md`](research/README.md) — the open book's index
- [`research/uk/filing/README.md`](research/uk/filing/README.md) — every UK filing
  obligation: forms, deadline formulas, penalties, API specs, submission workflow
- [`research/uk/personal-tax/README.md`](research/uk/personal-tax/README.md) — UK personal-tax optimisation playbook (玩爆英國個税), source ledger, and safe boundaries
- `/uk/personal-tax` — public page: 7 UK plays, official receipts, ordinary counter-moves

## License

Proprietary - All rights reserved.

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
