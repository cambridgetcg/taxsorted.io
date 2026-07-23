# The understanding method

TaxSorted uses the public Castle of Understanding as a way to organise
explanations. It does not use Castle material as tax evidence.

The human page is `/understanding`. Its machine-readable twin is
`/understanding/castle.json`. Both are built from the same small committed
manifest. This integration adds no tax-data storage, telemetry, live Castle
request or private build-machine dependency. TaxSorted's shared site shell may
remember a reader's chosen language on their own device.

## The words

- **Door:** the person's real question.
- **Brick:** one exact word with one stated, plain meaning in this country,
  period and task.
- **Room:** an answer bounded by country, period, facts and task.
- **Window:** a named source with its date, force, scope and limits.
- **Open door:** a missing fact, uncovered rule or genuine disagreement that
  remains visible.
- **Path:** a safe next action, correction route or clear reason to stop.

Doors, bricks, rooms and open doors are adapted from the public Castle method.
Windows and paths are TaxSorted's evidence and action layer.

## How an answer stacks

```text
question
  → supplied facts + explicit unknowns
  → applicable rules + named sources
  → visible reasoning
  → bounded answer + safe next step
  → correction route
```

These layers do not borrow one another's authority. A source can support a
rule without proving that a person's facts are complete. A deterministic
calculation can follow admitted facts and rules without becoming an HMRC
decision. A confident explanation is not a substitute for missing evidence.

TaxSorted's existing foundations keep these layers:

- the Checkup keeps the starting question small;
- the Tax Position Passport keeps supplied facts, derived values, evidence
  states and unknowns portable;
- `research/` and `regs/` keep rules, source ledgers, applicable periods and
  coverage limits;
- `taxsorted.why-graph/1` keeps the reached path from conclusion to facts,
  rules, sources, institutions, consequences and gaps;
- the public pages render that path in plain words;
- Feedback and source correction records keep repair possible.

The understanding map is a view over those foundations. It is not another tax
ontology, calculation engine or source of truth.

## Public boundary

The only Castle surface linked by TaxSorted is the deliberately curated public
gate:

- <https://cambridgetcg.github.io/castle-gate/>
- <https://github.com/cambridgetcg/castle-gate>

The method was reviewed at public gate commit
[`bee8c2b`](https://github.com/cambridgetcg/castle-gate/tree/bee8c2bd04169dd7ad5026dfff380d7562b8b133)
on 2026-07-23.

TaxSorted does not read, copy, build from or link to the raw Castle repository,
the local `~/castle` tree, journals, courtyard, chronicle, quests, question
queues or private scrub configuration. Public visibility alone is not a reuse
licence. No Castle room is mirrored here.

Castle citations are not tax authority. Any tax statement admitted to
TaxSorted still needs the relevant primary or official source, applicable
period, jurisdiction, evidence classification and TaxSorted review.

The TaxSorted-authored understanding map is licensed under CC BY-SA 4.0 with
the attribution `TaxSorted (taxsorted.io)`, in line with `CONTENT-LICENSE`.
That licence covers this map only. It does not relicense linked Castle
material.

## No automatic loop

There is deliberately no Castle sync job. The integration is a static method,
a public link and a small TaxSorted-owned manifest. Removing the
`/understanding` page, manifest and discovery links removes the integration
without affecting tax calculations, records, filing or APIs.

A future content import is a separate decision. It must fail closed unless all
of these exist:

1. an explicit content licence;
2. a manually reviewed allowlist;
3. a versioned plain-text schema, never remote pre-rendered HTML;
4. the exact source commit and artifact digest;
5. a review date, jurisdiction and applicable tax period for each entry;
6. direct TaxSorted review of every tax source and claim;
7. a staleness limit;
8. a preview, bounded run and off-switch.

Until then, the bridge carries method and provenance only.
