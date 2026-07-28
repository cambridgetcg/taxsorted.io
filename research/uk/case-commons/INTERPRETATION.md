# Tax-dispute interpretation framework

**Last updated:** 2026-07-28
**Status:** framework implemented; first case-derived release awaiting separate publication review
**Scope:** decided UK tax disputes in the public case commons

## What this adds

A case summary says what happened. An interpretation must also show how to
read it.

TaxSorted reads each admitted case through twelve dimensions:

1. identity and tax context;
2. procedural posture and route;
3. questions and issues;
4. material and disputed facts;
5. governing rules and authorities;
6. each party's arguments;
7. evidence, burden and standard;
8. decisive reasoning;
9. supporting and rejected reasoning;
10. holding and disposition;
11. remedies, money and costs;
12. later history, transfer limits and counterfactuals.

Each dimension is marked `mapped`, `partial`, `not-mapped` or
`not-applicable`. Absence is kept as a gap. It is never filled from intuition.

## Major challenges

A major challenge is a difficulty that materially changes how the case should
be read. It is not a difficulty score or a prediction.

Every challenge names:

- its kind;
- whether it was decisive, material or contextual in the decided case;
- its present state;
- its impact on interpretation;
- the evidence a new case would need;
- any blockers;
- how the decided case resolved it, if it did;
- exact case-record pointers and source IDs.

The common kinds are route and jurisdiction, timing and procedure, material
facts, statutory interpretation, authority and precedent, burden and standard,
characterisation, causation and quantification, remedy and enforcement, later
history, and transfer to new facts.

## Decisive reasoning

“Decisive” means outcome-determinative within the issue being mapped, or part
of an independently sufficient branch supporting the disposition. It does not
mean every decisive branch was globally necessary once another sufficient
branch existed. “Supporting” means a reason explains or strengthens the route.
“Boundary” keeps a later outcome, a missing question or a non-effect from
being folded into the holding.

The API publishes concise, source-linked judicial reasons. It does not ask for
or claim to expose a model's hidden chain of thought.

The same reasons can be projected into TaxSorted's shared WhyGraph contract:

```text
holding
  → decisive and supporting reasons
    → admitted claims
      → official sources
  → remedy
  → explicit limits and unmapped gaps
```

The graph structure and labels are TaxSorted analysis with `advisory` effect;
they are not an official-decision record. Judicial propositions remain linked
to their official sources.

The original case packet remains canonical. The interpretation is a derived
view and carries the packet digest and record pointers needed to get back to
it. For Haworth, Issues 1 and 2 are partly mapped. Issues 3 and 4, and the
separate Senior Courts Act 1981 section 31(2A) materiality and relief step
attached to Issue 2, remain
explicit gaps in the canonical record. The derived view must not imply that
every legal misdirection requires quashing.

## Agent path

An agent should:

1. read the framework;
2. list admitted case IDs;
3. fetch the complete source-resolving case packet;
4. fetch the interpretation for dimensions and challenges;
5. traverse the WhyGraph for decisive support and explicit gaps;
6. follow official sources before relying on a claim;
7. keep a new person's facts outside TaxSorted's public API.

The surface is read-only. It has no case intake, private upload, outcome
prediction, lawyer matching or representation route.

## Training records

The training export is a deterministic projection of approved public case
packets plus clearly marked TaxSorted-derived labels. It provides strict,
task-shaped examples for:

- mapping dimensions;
- identifying decisive reasons;
- separating procedural, merits and money outcomes;
- identifying major interpretation challenges.

Each example keeps its case ID, packet URL and digest, source IDs and record
pointers, framework version and adapter identity. Its safety record says that
the source packet is approved while the labels are TaxSorted-derived, and that
qualified legal review is not asserted. A consumer fetches that exact packet
and verifies the digest instead of treating the task output as self-supporting.
Examples from one case stay in one split so the same dispute cannot leak
across training and evaluation partitions.

The current commons contains one deep case. Its records are useful as format
examples and evaluation seeds, but TaxSorted makes no claim that one case is a
sufficient or representative model-training corpus. The export must not be
used for outcome prediction, win scoring or automated legal advice.

Runtime tax-expert requests, private professional assessments and user data
are not part of this training export and are not used for training by this
service.

## Separate publication decision

The source corpus approval does not approve TaxSorted's new interpretation
labels. Case interpretations, WhyGraphs, training records and the derived
sections of the human case page need a second decision in
[`data/interpretation-publication-approval.json`](data/interpretation-publication-approval.json).

That decision binds:

- the framework and corpus versions;
- the exact packet digest;
- the adapter identity;
- the interpretation and WhyGraph digests;
- every training-example digest;
- the exact case-ID set;
- one digest over the complete derived-release manifest.

The checked-in decision is `pending-review`. Pending, malformed, stale or
mismatched decisions build and publish no case-specific derived artifact. The
case-independent framework, schemas, agent guide and already-approved source
packet remain readable. Computing a digest is not approval.

## Routes

```text
GET /v1/case-commons/uk/interpretation
GET /v1/case-commons/uk/interpretation/schema
GET /v1/case-commons/uk/agent
GET /v1/case-commons/uk/cases/{caseId}/interpretation
GET /v1/case-commons/uk/cases/{caseId}/why-graph
GET /v1/case-commons/uk/training
GET /v1/case-commons/uk/training/examples
GET /v1/case-commons/uk/training/examples.ndjson
GET /v1/case-commons/uk/training/schema
GET /openapi/case-commons-uk.json
```

Frameworks and schemas stay readable when case publication is closed. A
case-derived route opens only when both the source-packet gate and the separate
exact derived-release gate pass. The case emergency stop, case-level stops and
`UK_TAX_DISPUTE_INTERPRETATION_EMERGENCY_STOP` can still close it.
