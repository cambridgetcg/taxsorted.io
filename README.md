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
taxsorted.io/
├── PRINCIPLES.md       # The soul
├── frontend/           # Next.js web application (static export)
│   └── src/
│       ├── app/        # Routes: landing, dashboard, vat/
│       └── lib/        # VAT engine + HMRC client (moving to engine/jurisdictions/uk)
├── research/           # The Learn pillar's source of truth
│   ├── _schema/        # Meta-models every country fills in
│   ├── world/          # True everywhere — neutral tax ontology
│   └── uk/             # Country #1: filing, laws, entities, deadlines, …
└── infrastructure/     # Delivery: Cloudflare Pages CI; API server on Fly.io (planned)
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
- **Backend (planned)**: Fly.io (London) + Postgres — server-side OAuth, token vault,
  queued submissions, one typed API for humans and agents alike
- **Rails**: HMRC MTD (REST) first; each country's authority lights up as it's proven

## Documentation

- [`research/README.md`](research/README.md) — the open book's index
- [`research/uk/filing/README.md`](research/uk/filing/README.md) — every UK filing
  obligation: forms, deadline formulas, penalties, API specs, submission workflow

## License

Proprietary - All rights reserved.
