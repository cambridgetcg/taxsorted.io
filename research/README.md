# Research — the open book's source

> **Mission**: Make tax simple for everyone — every country, every tax, every kind of taxpayer
> **Pillar**: Learn (this corpus becomes the public `/learn` pages)

Knowledge is organised by *where it is true*:

```
research/
├── _schema/    # The shapes every country fills in — being promoted out of uk/
├── world/      # True everywhere: the neutral tax ontology, treaty layer
└── uk/         # Country #1 — the proof, drawn deep
    ├── filing/        # Every form: who files, deadline formula, penalties, how to submit
    ├── laws/          # Statutes with amendment history & point-in-time lookups
    ├── entities/      # WHO files: all legal forms, mapped to person·business·charity·trust
    ├── tax-types/     # WHAT taxes exist (UK instance of the world ontology)
    ├── deadlines/     # The UK tax calendar
    ├── competitive/   # The UK market map
    ├── technical/     # HMRC integration landscape (OAuth, fraud headers, APIs)
    ├── politics/      # Elections, offices, finance evidence and public accountability
    ├── charities/     # Relief conditions, regulators, money, control, duties and safe help routes
    ├── charity-accountability/ # Zero-row words/actions contract, safety method and example
    ├── observer-accountability/ # Watching-the-watchers principle, contract, source doors and walls
    ├── public-funding/ # Tax pools, authority, health, education, delivery and audit
    ├── tax-industry/  # Entry routes, qualifications, gates, pay, origins and barriers
    ├── tax-expert/    # Evidence contract, honest coverage stages and deep expert paths
    └── tax-system/    # Actors, permissions, accounts, collection, enforcement and evidence
```

Adding a country means copying the schemas, not inventing a structure:
`research/ie/`, `research/de/`, `research/us/` … each filled to whatever depth is
honest, and marked so — guides first, rails later.

## House rules

- New documents carry a metadata header (`Last Updated` / `Confidence` / `Status`);
  older ones are brought up to it as they're touched — about a third still lack one.
- Every fact has **one canonical home**; everywhere else links to it.
- Sources, open questions and cross-references are part of the document, not optional.
- Plain words. If a rule can't be explained simply, the explanation is wrong.

## State of the book

| Area | Depth |
|---|---|
| `uk/filing/` | Deep — forms, deadlines, penalties, APIs, submission workflow |
| `uk/laws/legislation-by-entity/` | Deep — 16 entity profiles, section-level, point-in-time |
| `uk/tax-types/sdlt.md` | Deep — current rates, source ledger, safe API boundary, XML rail |
| `uk/tax-system/` | Deep — 4 collection lanes, permissions, infrastructure, collaborators, cases and gaps |
| `uk/tax-industry/` | Deep — roles, qualifications, exams, costs, lawful pathways, economics and barriers |
| `uk/tax-expert/` | Coverage-first expert architecture — one shared answer contract; MTD Income Tax is the first deep path |
| `uk/charities/` | Deep sector map — conditional reliefs, registers, legal forms, funding, finance, control, duties and privacy boundaries |
| `uk/charity-accountability/` | Candidate-only contract — evidence types, exact joins, admission conditions, safe comparison and a zero-row validator example |
| `uk/observer-accountability/` | Observer reciprocity — institutional mandate, method, relations, words, actions, responses, challenges and zero-row admission boundary |
| `uk/public-funding/` | Coverage-first graph — pooled tax, parliamentary authority, health and education allocations, governance, delivery and audit |
| `uk/politics/` | Growing — Westminster directory plus finance, election, enforcement and formal-power methods |
| `uk/entities/`, remaining `uk/tax-types/`, `uk/deadlines/` | Reference-level |
| `uk/competitive/`, `uk/technical/` | Scaffolds |
| `world/` | Seeded — ontology distilled, treaty layer pending |

The politics book also contains a proposed, unimplemented
[official-events evidence contract](uk/politics/official-events-method.md) for
official words, votes, decisions, appointments, budget approvals, enforcement
actions and corrections.
