# Operating evidence inventory

Repository review: **2026-09-12**. This is the PG-12 inventory, not an approval to
release. It separates evidence already described in the repository from evidence
that must be reconciled with the operator's private records. No private approval
pack, live edge configuration, provider account or production database was inspected.
An unverified gate does not mean the external work has not been done.

The proposed scopes are independent: local preparation, HMRC VAT filing, HMRC Income
Tax filing, and a customer accounting-provider pilot. Passing the software release
checks only establishes the tested repository state. Each broader scope needs its
own recorded decision. The current [release checks](../scripts/release/README.md)
require HMRC sandbox state; the Xero authorisation pilot has no financial reader.

## Evidence and next actions

No accountable person is assigned by this document. The owner column identifies the
role needed; the operator must record the person and accepted evidence in the release
record before opening the affected scope.

| Gate / scope | Repository evidence | Status in this review | Owner needed / next action |
|---|---|---|---|
| HMRC recognition, separately for VAT and Income Tax | [Production runbook](../api/RUNBOOK.md#production-later-not-now), sandbox paths and fraud-header observations | External recognition unverified; Income Tax year-end coverage and durable submission outcomes remain code gaps (PG-07–09) | Product operator with relevant HMRC approval contact: reconcile dated recognition, exact app/rail scope, functionality matrix and outstanding conditions |
| Account recovery and support continuity | [Account implementation](../api/src/routes/account.ts) and runbook describe passkeys, recovery codes, revocation and loss of all credentials | Codes-only behavior implemented; acceptance of the production recovery/support boundary unverified | Account/service owner: record accepted recovery policy, support route, loss scenarios, abuse controls and an exercised recovery procedure; Books backup does not recover an account |
| Security assurance | [Supply-chain policy](../api/RUNBOOK.md#supply-chain-the-passkey-libraries-g7), automated gates and account tests | Repository checks available; independent assurance and remediation acceptance unverified | Security owner: link private review scope/date, unresolved findings, retest and decision for the exact proposed capability; tests do not replace independent review |
| Privacy, retention and deletion | [Accounting admission contract](ACCOUNTING-INTEGRATIONS.md#delivery-order), operator-access policy and provider cleanup implementation | Public policy/operating evidence not established by this review; historical runbook requirements need reconciliation | Privacy/service owner: reconcile current obligations with qualified advice and private records; link approved notices, data map, retention/deletion, transfer and incident procedures, with exercised deletion evidence |
| Login, recovery and submission abuse controls | [Runbook rate-limit gap](../api/RUNBOOK.md#production-later-not-now), explicit browser Origin checks | Origin checks address a different threat; actual edge rules and rate-limit operation unverified | Infrastructure/security owner: inspect deployed rules, document scope and limits, exercise allowed/blocked traffic and alert/recovery behavior in the permitted environment |
| Backup, disaster recovery and continuity | [Infrastructure notes](../infrastructure/README.md) describe one Postgres machine/volume with snapshots; local Books custody is separate | Dated infrastructure description; current snapshots and database restore exercise unverified | Infrastructure/service owner: record current retention, recovery objectives, last disposable restore exercise and token-key custody dependency; never treat a browser export as an API/database backup |
| Incident stop and release rollback | [Release workflow](../.github/workflows/deploy.yml) captures rollback points; [Xero runbook](../api/RUNBOOK.md#private-xero-authorisation-pilot) defines quarantine and cleanup | Procedures/code present; current operator access and end-to-end exercise unverified | Release/incident owner: record a permitted exercise covering API plus static frontend, retained cleanup access, monitoring, communications and reopening conditions |
| Customer provider admission | [Integration contract](ACCOUNTING-INTEGRATIONS.md) limits early work to synthetic/demo/developer-owned data; Xero auth, encrypted custody and organisation binding exist | Financial import absent (PG-11); customer admission unverified and not enabled by this batch | Provider/product owner: choose exact read-only dataset/organisation scope, complete code and provider contract proofs, then reconcile terms, privacy, support and explicit admission decision |
| Accessibility and usable recovery | Frontend tests and current user flows | No independent accessibility or assistive-technology exercise established here | Product/accessibility owner: exercise keyboard, screen reader, errors, local restore and filing approval for the supported journeys; record findings and accepted limitations |

## Release decision record

For each proposed scope, retain these fields in the appropriate private operating
store, with a non-sensitive pointer here when available:

- Capability and supported users/data/environment; repository revision and deployed
  artifact identifiers.
- Accountable owner, reviewer where required, decision date and next review trigger.
- Evidence references, scope and dates; outstanding conditions and explicit outcome
  (`pending`, `approved within stated scope`, or `closed`).
- Off-switch, rollback/recovery procedure, last permitted exercise and monitoring owner.

Do not place credentials, taxpayer data, approval correspondence or confidential
security findings in the public repository. This inventory currently records **no new
production or customer-pilot approval**. The next action is evidence reconciliation
and assignment, alongside the remaining [code work](PRODUCTION-GAPS.md).
