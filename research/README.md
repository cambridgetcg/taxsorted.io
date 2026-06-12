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
    └── technical/     # HMRC integration landscape (OAuth, fraud headers, APIs)
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
| `uk/entities/`, `uk/tax-types/`, `uk/deadlines/` | Reference-level |
| `uk/competitive/`, `uk/technical/` | Scaffolds |
| `world/` | Seeded — ontology distilled, treaty layer pending |
