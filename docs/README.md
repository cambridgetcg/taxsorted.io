# Documentation map

Source map reviewed 2026-09-12. This index describes the repository's contracts and
implementation boundaries; it does not renew tax-source reviews or attest to live
deployment settings.

The [architecture audit](ARCHITECTURE-AUDIT.md) records the inspected revision,
module map, orphan candidates, first refactors and production gaps.
Use the [production gap plan](PRODUCTION-GAPS.md) for prioritized fixes and acceptance
checks, and the [consolidation record](CONSOLIDATION.md) for local/GitHub history.

## Start here

Read [PHILOSOPHY.md](../PHILOSOPHY.md) and [PRINCIPLES.md](../PRINCIPLES.md) for the
purpose and product commitments, then [the root README](../README.md) for the public
scope. The current journey is **Check · Plan · Books · File · Put it right · Understand**.

| Order | Document | What it owns |
|---|---|---|
| 1 | [Accounting product](ACCOUNTING-PRODUCT.md) | Evidence → event → books → accounts → tax → filing; current local-books scope and deeper accounting work |
| 2 | [People-power tax framework](PEOPLE-POWER-TAX-FRAMEWORK.md) | Separate planning and compliance facts, module capabilities, consent, proof and correction |
| 3 | [Accounting integrations](ACCOUNTING-INTEGRATIONS.md) | Provider contracts, browser replicas, review, sync checkpoints and independent HMRC modules |
| 4 | [Tax Position Passport](TAX-POSITION-PASSPORT.md) | Browser-local facts, unknowns, evidence states and portable handoff |
| 5 | [API contract](API.md) | Public discovery, workspace keys, bounded tasks and published machine contracts |
| 6 | [Public-data charter](PUBLIC-DATA-CHARTER.md) | Evidence, reuse, privacy and publication conditions for public datasets |
| 7 | [Understanding method](UNDERSTANDING-METHOD.md) | The explanation layer over existing facts, sources, rules and gaps |

## Follow a workflow

| Work | Read next | Implementation boundary |
|---|---|---|
| Keep and review records | Accounting product, then accounting integrations | Browser-local books; an Account does not create a backup or shared ledger |
| Import provider records | Accounting integrations, then [private Xero pilot](../api/RUNBOOK.md#private-xero-authorisation-pilot) | Synthetic page-sync proof works in development. Xero authorisation, token custody and organisation binding are implemented behind a closed pilot; financial dataset import is not implemented |
| Prepare and file | People-power framework, then [HMRC runbook](../api/RUNBOOK.md) | VAT/ITSA sandbox routes exist; production filing and full year-end follow-through remain gated |
| Answer a tax question | [Tax-expert research](../research/uk/tax-expert/README.md), API contract and Passport | Engine rules own calculations and source-review stops; unknown facts stay visible |
| Publish a dataset | Public-data charter, the corpus's method/review files and HMRC runbook publication sections | Candidate, schema-only, admitted and publicly enabled are distinct states |
| Build and release | [Infrastructure](../infrastructure/README.md), [PR checks](../.github/workflows/ci.yml) and [release workflow](../.github/workflows/deploy.yml) | API release and contract checks precede the frontend release |

## Sources and ownership

- [Research index](../research/README.md) maps jurisdictional notes, methods, sources
  and known gaps. A research note is not automatically a supported product capability.
- [Research schemas](../research/_schema/README.md) and the [world ontology](../research/world/README.md)
  hold reusable shapes. Promotion to a neutral schema has its own stated conditions.
- [MTD and government research](../regs/research/) preserves dated source checks behind
  engine rules and guides. Read each review date and scope; older notes are not current-law
  assurance.
- Several `research/uk/*/data/` corpora are runtime inputs, consumed directly by API
  modules and frontend builds. Their validators, publication controls and
  [Docker copy rules](../api/Dockerfile) are part of that contract. They cannot be moved as
  unused notes without updating those consumers together.
- [Content seeds](../content/seeds/README.md) are recovered legacy page copy with
  provenance and an explicit stale-figures warning. Use their structure as editorial
  input only; publication requires current sources and supported engine calculations.

Use current code and contract tests to establish implementation, the runbook and
deployment evidence to establish operations, and each source ledger to establish the
admitted evidence and review period. A discrepancy belongs in the relevant contract;
one kind of evidence must not stand in for another.

## Historical designs and plans

The [July commons design](superpowers/specs/2026-07-03-taxsorted-uk-commons-design.md)
and [July implementation plans](superpowers/plans/) preserve the original M0–M2
decisions and task breakdowns. They are historical planning records, not an executable
current backlog. Some unchecked tasks have shipped, some paths and checkout names have
changed, and newer product contracts supersede portions of the design. Preserve explicit
human decisions and their context when reconciling them.

In particular, the July spec's proposed server-side record store was superseded by the
[M2 rails plan](superpowers/plans/2026-07-06-m2-rails.md): individual books stay in the
browser and quarterly submission sends derived totals. The current product and
integration contracts retain that custody boundary. Provider token custody and server
sync metadata do not create a cloud ledger.

The [February filing workflow designs](../research/uk/filing/submission/workflow/)
contain useful entity, obligation and submission concepts alongside an earlier dashboard
and navigation proposal. Their old frontend map is not the current six-door product
specification. Treat dated technical and competitive research the same way: preserve
provenance, then check the current implementation and sources before reusing a claim.
