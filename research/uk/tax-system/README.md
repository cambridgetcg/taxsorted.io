# The UK tax system, end to end

**Last reviewed:** 10 July 2026
**Status:** Deep v1 — reviewed public evidence, representative rather than exhaustive
**Confidence:** High for the cited relationships; open gaps are part of the dataset

This map answers a question tax websites usually dodge: not only *what is the
rule*, but who made it, who receives the facts, which account changes, who may
touch the money, who may compel payment, who grants each permission, and who
can stop or review the action.

The canonical machine record is
[`data/uk-tax-system.json`](data/uk-tax-system.json). It currently contains:

- 73 reviewed official sources;
- 40 public, judicial, professional and private actor classes;
- 37 evidence-backed relationships;
- 9 explanations of why the machinery is designed this way;
- 15 legal or conduct frameworks;
- 9 account types and 11 public or partly disclosed systems;
- 12 deliberately distinct permission types;
- 27 conditional stages across central, local, devolved and criminal lanes;
- 8 decided case studies; and
- 19 unresolved gaps or source conflicts.

The API serves that reviewed package without contacting an upstream website in
the request path:

```text
GET /v1/tax-system/uk
GET /v1/tax-system/uk/graph
GET /v1/tax-system/uk/actors[/:id]
GET /v1/tax-system/uk/relationships[/:id]
GET /v1/tax-system/uk/frameworks[/:id]
GET /v1/tax-system/uk/rules[/:id]
GET /v1/tax-system/uk/accounts[/:id]
GET /v1/tax-system/uk/systems[/:id]
GET /v1/tax-system/uk/permissions[/:id]
GET /v1/tax-system/uk/pipeline[/:id]
GET /v1/tax-system/uk/cases[/:id]
GET /v1/tax-system/uk/sources[/:id]
GET /v1/tax-system/uk/gaps[/:id]
GET /v1/tax-system/uk/manifest
GET /v1/tax-system/uk/schema
GET /v1/tax-system/uk/dictionary
GET /v1/tax-system/uk/exports
GET /v1/tax-system/uk/exports/{collection}/{json|ndjson|csv}
```

The dictionary explains collection aliases (`accounts` → `accountTypes`,
`pipeline` → `pipelineStages`, `gaps` → `transparencyGaps`), cross-collection
references, valid filters and CSV columns. The structural JSON Schema is generated
from the Zod record shape; the dictionary also lists graph-wide invariants enforced only
by the boot validator. Complete, unpaginated collection exports are public
without an API key: deterministic lossless JSON, streamable NDJSON and a
spreadsheet-oriented CSV copy that keeps nested values as JSON and mitigates
common formula triggers. `/v1/open-data` is the single catalog for this graph
and the tax-industry map.

## Four meanings of “collect”

The system becomes understandable once four activities stop sharing one word.

1. **Collect facts.** A taxpayer files; an employer sends payroll; a bank sends
   interest; a platform reports prescribed seller data.
2. **Create the charge.** A self-assessment, payroll return, authority
   assessment, penalty or interest rule puts an amount on a tax account.
3. **Collect money.** Government Banking and commercial payment rails clear a
   transfer, then HMRC or the other authority allocates it to the right charge.
4. **Recover debt.** Only after a valid amount is due and unpaid does the
   support, private-contact and coercive-recovery graph begin.

A bank reporting interest does not decide the tax. Ecospend initiating a bank
payment does not allocate it to a Self Assessment charge. A private debt agency
does not acquire HMRC officer powers. A court that grants a charging order does
not remake the underlying assessment.

## The main civil path

This is a graph, not a conveyor belt:

```text
policy and law
  → register identity / tax record / agent / application
  → taxpayer return + third-party data
  → self-assessment or authority assessment
  → charge + payment allocation
  → pay and reconcile ───────────────────────────────→ resolved
  → compliance decision → review / tribunal / appeal
  → interest or penalty
  → contact + vulnerability + Time to Pay
      ↘ private agency: letter / SMS / phone only
      ↘ validated enforcement choice
          ↘ goods       ↘ bank hold       ↘ court / insolvency
```

HMRC's own current guidance says enforcement choices are not listed in a fixed
order. Every pipeline record therefore carries possible next stages, trigger
facts, account effects, jurisdiction, safeguards and evidence. It never says
“this inevitably happens next.”

## Who holds which power

| Layer | Main actor | What the actor does not become |
|---|---|---|
| Policy | HM Treasury and ministers | The collecting officer or the court |
| Primary law | Parliament; devolved legislatures within competence | An individual caseworker |
| Central administration | HMRC Commissioners and authorised officers | The legislature or independent tribunal |
| Property valuation | Valuation Office inside HMRC from 1 April 2026 | The council that issues the bill |
| Local property tax | Councils; LPS in Northern Ireland | One UK-wide account operator |
| Devolved tax | Revenue Scotland; Welsh Revenue Authority | Collector of every tax in that territory |
| Legal challenge | FTT, Upper Tribunal and appellate courts | HMRC's complaints team |
| Service complaint | HMRC tiers, Adjudicator, then PHSO through an MP | A tax appeal or payment stay |
| Criminal investigation | Trained authorised FIS/RIS officers | The independent charging authority |
| Criminal prosecution | CPS, COPFS or PPSNI | The investigator or civil Debt Management team |
| Systemic scrutiny | NAO, PAC and Treasury Committee | Resolver of an individual tax liability |

## Permissions that must never be flattened

“Licensed tax provider” is usually too vague to be true. The data keeps these
separate:

| Permission | Grantor or controller | It permits | It does **not** prove |
|---|---|---|---|
| Client authority | Taxpayer | Defined agent or software action | Competence or HMRC registration |
| HMRC adviser registration | HMRC under Finance Act 2026 | In-scope paid interaction with HMRC | Endorsement or a licence for all advice |
| Agent Services Account | HMRC | Access to supported agent services | Client authority, AML status or qualification |
| AML supervision | HMRC or applicable professional body | Operating an in-scope supervised business | Legal authorisation or HMRC endorsement |
| Legal authorisation | Approved legal regulator | The regulated profession and reserved work | Universal authority over tax advisers |
| Professional membership | CIOT, ATT or another body | Use of a designation under member rules | Statutory regulation of non-members |
| API production access | HMRC Developer Hub | Production calls by an application | User consent, recognition or approval |
| OAuth user grant | Taxpayer through HMRC | Scoped user-restricted API calls | The user's password or unlimited authority |
| Software recognition | HMRC tax-specific team | Listed/tested interface status | Approval, accreditation or security certification |
| Enforcement certificate | County Court judge | Private taking-control work in England and Wales | Tax assessment or a particular court order |
| Insolvency licence | Recognised professional body | Acting as statutory insolvency office-holder | Being HMRC's debt collector |
| FCA debt permission | FCA | Applicable regulated debt-contact activity | Visits, seizure or proof of a live HMRC allocation |

The 2026 adviser-registration duty is staged and action-specific. It regulates
paid interaction with HMRC, not every conversation that could be called tax
advice. HMRC also states that an Agent Services Account is not endorsement.

## Accounts and infrastructure

The public account is not the underlying ledger.

| Surface or system | Plain meaning |
|---|---|
| Government Gateway | Sign-in and enrolment; not client authority |
| GOV.UK One Login | Partially migrated individual identity; not yet universal |
| Personal / Business Tax Account | Human-facing view across supported services |
| Agent Services Account | Registered agent organisation, staff permissions and links to client grants |
| Developer application + OAuth | Application identity plus a separate user's scoped grant |
| RTI Core → ETMP / EBS | Published payroll path from FPS to employer charge and employee deductions |
| CESA / ETMP / NPS / EBS-BROCS / SAFE / OAS | Publicly named tax, record and payment systems—not one proven unified ledger |
| IDMS / Debt Management | Overdue work items, contact and enforcement casework |
| Government Banking | Commercial rails and reconciliation for government money |
| Council, LPS, SETS and WRA services | Separate local and devolved account worlds |

The corpus names systems only to the depth made public in official services,
manuals and awards. It does not reconstruct security-sensitive topology.

## Private collaborators with evidence boundaries

| Relationship confirmed at review date | What the source proves | What it does not prove |
|---|---|---|
| Government Banking ↔ Barclays, Citibank, NatWest, Bottomline, Worldpay | The five are named financial partners | Scope and value for every service, uptime or incidents |
| HMRC ↔ Ecospend | £2,260,457 Open Banking award, 29 Aug 2024–28 Aug 2027 | Spend-to-date or possession of bank credentials |
| HMRC ↔ Accenture UK | Up to £305.69m digital-platform run/change award, 20 May 2024–19 May 2029 | Sole ownership of every platform or blame for an incident |
| HMRC ↔ Capgemini UK | £100m Income Tax Sub Domain award, 15 Jan 2025–14 Jan 2031 | Exact components, subcontractors, spend or performance |
| HMRC ↔ nine named debt agencies | They may use letter, SMS and phone, take payment or discuss Time to Pay | A live case allocation, contract value, visits or coercive powers |

The nine current debt-contact names are LCS, Advantis, Ardent/DRS, Bluestone,
BPO, BWL, CCS Collect, Moorcroft and Pastdue. HMRC says they never visit. A
case they cannot resolve returns to HMRC.

## What happens when tax remains unpaid

The main safety gates are as important as the powers:

- HMRC says it normally tries contact and affordable resolution before action,
  except where fraud or crime is suspected.
- Time to Pay changes the pursuit path; it does not necessarily stop interest.
- Before enforcement, published internal checks ask whether debt is due,
  correctly linked, unpaid and normally not under appeal or dispute.
- England and Wales goods action needs the relevant power and notice. Private
  agents are normally court-certificated; HMRC officers are exempt.
- Direct Recovery of Debts has a protected balance, a hold notice, narrow
  objection grounds and a County Court route.
- Courts grant judicial remedies. Scotland uses summary-warrant and diligence
  machinery; Northern Ireland has separate rules.
- Insolvency is described by HMRC as a final course. HMRC is then a creditor;
  it does not direct the appointed insolvency practitioner.
- Simple inability to pay is civil. Serious suspected dishonesty has a separate
  trained-investigator → independent-prosecutor → criminal-court chain.

## One live source conflict

The public HMRC non-payment page, updated 17 June 2026, still displays the old
England and Wales goods-enforcement fees of £75 / £235 / £110 and a £1,500
percentage threshold. The 2026 amendment and HMRC's July manual show £79 /
£247 / £116 and £1,900 for new instructions from 1 May 2026, plus the new
14-day or qualifying 28-day notice periods.

The API exposes this as `gap-taking-control-fee-conflict`. It does not silently
pick the easier source.

## Case studies

| Case | Machine lesson |
|---|---|
| *HMRC v Tooth* [2021] UKSC 17 | HMRC can lose the result while winning a general point; deliberate conduct must be proved precisely |
| *Bartram v HMRC* [2012] UKUT 184 | A no-return determination has no ordinary appeal; using the wrong door can lose the real deadline |
| *Perrin v HMRC* [2018] UKUT 156 | Reasonable excuse is objective but uses the actual taxpayer's circumstances |
| *BPP Holdings v HMRC* [2017] UKSC 55 | HMRC is subject to tribunal case-management rules like a litigant |
| *R (Haworth) v HMRC* [2021] UKSC 25 | A powerful notice needs its exact statutory threshold, not administrative confidence |
| *Hurstwood v Rossendale* [2021] UKSC 16 | Local councils litigate their own taxes; purposive interpretation still works through the statute |
| *Totel v HMRC* [2018] UKSC 44 | Payment during appeal is tax-specific; VAT and direct-tax routes differ |
| *R v Allen* [2001] UKHL 45 | Criminal fraud involves proved dishonesty; it must not be confused with inability to pay |

## What remains invisible

The gap ledger records, among other things:

- no unified adviser or ASA verification register;
- no public per-application API production-access register;
- thin software-recognition assurance metadata;
- no canonical Gateway ↔ One Login ↔ ASA ↔ software credential map;
- fragmented field-level tax data-flow descriptions;
- procurement records that do not join cleanly to components and performance;
- no national local-tax account or enforcement API;
- private debt allocation, fees and outcomes not joined to current agency names;
- current and future AML-supervisor models easy to confuse;
- incomplete case-law and appeal-status coverage;
- no provision-level Act → commencement → amendment timeline; and
- manuals that mix current instructions with legacy system names.

Read [METHOD.md](METHOD.md) for how facts enter, change and leave the published
corpus. Unknown is a first-class value here. Transparency is not pretending the
state has published what it has not.
