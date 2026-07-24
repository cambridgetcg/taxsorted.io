# Method

## Purpose

This corpus identifies UK tax work where a professional can add lawful, evidence-based value. It
also makes tax administration inspectable by preserving official findings, institutional
responses, limits and correction routes together.

It is designed to fail closed:

- no private case intake;
- no automated matching;
- no professional marketplace;
- no filing, submission or payment;
- no probability, likely fee, revenue, damages or payout estimate; and
- no publication of identifiable tax evidence.

The source of record is
[`data/uk-professional-opportunities.json`](data/uk-professional-opportunities.json).

## What counts as an opportunity

An opportunity is a source-backed area where professional judgment can improve one or more of:

- classification of the governing tax or legal route;
- preservation of a deadline or procedural right;
- quality and provenance of technical evidence;
- calculation of the lawful tax base;
- correction of a return, declaration, valuation, payroll or account;
- challenge of an appealable decision; or
- evidence of direct cost and service failure through a complaint route.

It is not:

- a person or company lead;
- an invitation to litigate;
- a professional recommendation;
- a predicted outcome;
- an amount recoverable;
- a claim that a regulator acted unlawfully; or
- permission to handle private evidence.

## Selection

The first nine records were selected because each has:

1. an official or primary legal route;
2. a material need for specialist factual or procedural judgment;
3. a money model that can be expressed without predicting success;
4. a meaningful zero or adverse scenario;
5. a route-specific evidence checklist; and
6. enough current official material to state the principal deadline and counterweight.

The set is deliberately not ranked. Absence from the set means “not yet researched here”, not
“unimportant” or “unprofitable”.

## Sources

Permitted sources for this version are:

- primary and secondary legislation;
- Supreme Court or other official judicial material;
- official government guidance and procedure;
- HMRC and Valuation Office operational manuals;
- official corporate and oversight reports;
- independent public audit by the National Audit Office; and
- regulatory or professional registers used only to verify a claimed status.

Every source has an id, title, publisher, URL, source type, territories, retrieval date and note.
Every `sourceIds` value resolves to one source object. Sources were retrieved on 24 July 2026.

An official source is not automatically neutral or complete. HMRC guidance supports what HMRC
publishes about its process; legislation and binding judgments control where they differ. An annual
report's success rate uses the reporting body's definitions. A professional register proves the
listed status at the time checked, not competence for a new matter.

## Evidence states

Scrutiny records use one of six values:

| State | Meaning |
|---|---|
| `court-finding` | A court or tribunal reached the stated finding in the cited proceeding |
| `oversight-finding` | An official complaint, audit or oversight body made the finding within its remit |
| `official-statistic` | A public body reported the aggregate figure under its definitions |
| `stakeholder-assessment` | A named stakeholder process reported the assessment; representativeness is not assumed |
| `taxsorted-fairness-question` | TaxSorted poses a bounded question from sourced facts; this is not a legal conclusion |
| `unknown` | Evidence does not yet support a stronger state |

The state applies to the exact `statement`, not to every interpretation someone might attach to it.

## Scrutiny record test

Each scrutiny record has exactly:

- `id`;
- `title`;
- `evidenceState`;
- `statement`;
- `doesNotProve`;
- `counterweightOrResponse`;
- `correctionOrReviewRoute`;
- `affectedInstitutions`; and
- `sourceIds`.

The unit is an institution or official process. It is never an employee dossier.

A record is included only if its statement can be supported without inferring motive. The
`doesNotProve` field blocks the most likely overclaim. The counterweight retains a material
institutional response, repair, different official measure or adverse fact. The route says how an
affected person can seek correction without pretending that a complaint replaces an appeal.

## Opportunity record test

Each record must identify:

- id, slug, title, tax area, territories and publication state;
- issue patterns, without targeting a named person;
- why specialist judgment matters;
- professional roles and verifiable gates;
- authority, procedure and scope limits;
- deadline warnings with an explicit “Immediate check” action;
- lawful value mechanisms and their limits;
- all money states;
- minimum evidence;
- a route-specific, stoppable workflow;
- distinct challenge routes;
- counterweights;
- linked scrutiny where relevant; and
- complete source references.

No record may state a likely outcome, fee, revenue, probability, recommended firm, private contact
or public-body motive.

The exact-content publication decision is not a one-word switch. Approval requires a completed,
named qualified-review record with the reviewer's capacity, completion date and evidence reference.
It also requires explicit confirmation of current law, territory, deadlines and routes; privacy and
threat review; no intake, marketplace or submission path; a tested emergency stop; and named
correction and withdrawal ownership. An institutional right-of-reply disposition and its public-safe
basis and evidence reference are required; the review cannot predate source retrieval or the
decision. Never record contact details, client facts or private evidence in the approval file.
Missing, pending or partly false review data fails closed.

## Professional gates

Four gate kinds are used:

| Gate | Meaning |
|---|---|
| `legal-requirement` | Law requires the stated registration, supervision or status for the described activity |
| `regulator-or-platform-condition` | A regulator, system or TaxSorted safety boundary requires verification |
| `professional-body-rule` | A title or regulated professional status must be checked against its body or register |
| `prudent-specialism` | The work is not legally reserved but competent practice requires demonstrated subject experience |

A role can have more than one gate. Every role retains a prudent-specialism gate, while a legal,
professional-body, registration or platform gate applies only when its stated task and facts
trigger it. No gate may be copied into a claim that all UK tax advice requires a professional
licence.

### Finance Act 2026 registration boundary

The new HMRC regime applies, subject to its conditions and exceptions, to a paid tax-adviser
business interacting with HMRC for a client. It is phased by business circumstances between May
2026 and March 2027.

The business legal entity is the registration unit. Registration is not a universal qualification.
Activities solely concerning qualifying court or tribunal appeals are within a statutory exception,
as are stated customs and rating activities. A business performing mixed in-scope work cannot use
one excepted activity to avoid registration for all of its work.

Before referral, recheck the current guidance, the business's actual activities and window, its
Agent Services Account state, anti-money-laundering supervision, insurance, conflicts, authority
and exact competence.

## Deadline method

Each record gives warning periods, not legal conclusions for a live matter.

The workflow uses the earliest plausible clock until a competent reviewer confirms otherwise.
Capture:

- date on the decision;
- date and method of notification;
- date actually received;
- portal timestamps;
- tax, period and territory;
- whether the communication is a decision, request, notice or complaint response;
- appeal, review, payment and postponement effects;
- any separate complaint or judicial-review timing; and
- proof of protective action.

Negotiation, complaint, internal escalation and silence do not extend a statutory period unless the
governing law or an effective written decision says so.

## Challenge-route separation

The shared public guide keeps three source-resolved forks distinct:

| Guide | Used for | Does not by itself decide |
|---|---|---|
| Appeal or statutory review | An appealable tax decision, assessment or penalty, with tribunal where available | Complaint handling |
| Complaint → Adjudicator → PHSO | Eligible service complaints, escalation and possible discretionary redress | Tax merits where a statutory route controls |
| Judicial review (England and Wales) | Public-law legality where specialist advice confirms it is appropriate | A substitute merits appeal |

Correction, statutory appeal, statutory review and tribunal remain separately recorded inside the
first fork and in each opportunity's specific routes. Scotland and Northern Ireland have separate
judicial-review court rules.

The work product maintains a separate deadline and outcome for every route.

## Money method

The model deliberately prevents “amount affected” from becoming “potential gain”.

For every matter:

1. state the gross amount touched;
2. isolate the legally qualifying base;
3. calculate the amount actually claimed;
4. record the amount accepted;
5. record cash received or usable credit actually posted;
6. record tax, reimbursement or another amount actually paid by the client;
7. separate discretionary redress;
8. record costs actually incurred;
9. record interest actually received under its identified legal basis;
10. record interest actually paid or still due under its identified legal basis;
11. record professional fees actually invoiced; and
12. calculate the final client position after residual liability and tax effects.

Every record also states:

- the calculation method;
- what the number does not mean; and
- a zero or negative scenario.

No expected value, probability-weighting or contingent market fee belongs in this corpus.

## Evidence method

Evidence is organised as a fact table, not a persuasive story.

For each item retain:

- original or reliable copy;
- provenance;
- date;
- author or system;
- matter and period;
- fact the item supports;
- limits or contradictory material;
- privilege or confidentiality status;
- later correction; and
- delivery record where submitted.

Missing evidence is `unknown`, not proof against an institution or taxpayer. Potentially privileged
material is segregated for legal review. Public research contains no private evidence.

## Local and decentralised custody

“Decentralised” here means that a qualified person or organisation can use the open, sourced
workflow without surrendering private case custody to TaxSorted.

It does not mean putting tax records on a public ledger.

A local implementation should:

- store evidence under the client's or professional's control;
- exchange only the minimum authorised bundle;
- retain a source and correction ledger;
- produce a portable, human-readable export;
- keep an off-switch for every process;
- use bounded retries and finite terminal decisions; and
- publish only redacted institution-level learning after review.

The shared terminal decisions are:

- `declined`;
- `needs-more-evidence`;
- `refer-with-consent`; and
- `suitable-for-further-private-review`.

There is no automatic acceptance state.

## Hosted distribution and correction

Version `2026-07-24.3` has a separate checked-in publication decision bound to its exact canonical
digest and nine IDs. This repository is public, so the corpus and research notes are already
publicly readable on GitHub. The decision is a hosted-distribution and endorsement gate, not a
confidentiality or pre-publication gate.

Its current status is `pending-qualified-review`, so TaxSorted's protected official API and
frontend projection remain closed. A future `approved-for-hosted-distribution` decision can open
only that read-only hosted research projection; it cannot activate intake, matching, advice,
representation, filing or payment. That decision must be made by a named, separately authorised
human publisher, cite evidence separate from the review pack and bind the exact pack reference.
Hosted production activation also needs:

- fresh law and source review;
- qualified review of every displayed deadline;
- privacy, security and threat review;
- proof that no intake, marketplace or submission path is exposed;
- an exercised `UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP`;
- accessible corrections; and
- an owner for withdrawal and downstream correction.

The summary approval is backed by one exact, public-safe qualified-review pack. The pack must cover
every source, opportunity, scrutiny record and affected institution; resolve independently verified
capacity, conflict declarations and purpose-typed evidence for tax, legal/procedural,
editorial-fairness, privacy/security and release-operations roles; actively assign those roles; and
bind its canonical digest into the approval references. The review cycle and later review-by window
are each bounded to 93 days. A complete pack remains evidence only: it cannot change a serving
switch or approve its own hosted distribution. The API and machine wake recheck expiry per request;
the static atlas is also behind a narrow Cloudflare UTC-date guard and uses no-store responses.

The public correction URL is
<https://github.com/cambridgetcg/taxsorted.io/issues>. It is not confidential. Private tax evidence
must not be posted there. This version intentionally declares no confidential correction channel;
that gap must be closed before accepting private material.

When a durable correction is made:

1. record the previous and new statement;
2. identify the source and reason;
3. update the version and law-as-at date where material;
4. identify every affected record and output;
5. notify any downstream publisher that may still rely on the old claim; and
6. retain the correction without silently rewriting history.

Future material that genuinely requires review before any public disclosure must stay in private
review storage with appropriate access control until that review is complete. Public repository
branches, pull requests and unapproved files are not pre-publication storage.

## Validation

For this version:

- JSON parses strictly;
- record counts match metadata;
- opportunity, scrutiny and source ids are unique;
- the three top-level record arrays are ordered by id;
- all source references resolve;
- all scrutiny evidence states are allowed;
- every professional role has separately stated gates, and the exact ordered union of their source
  references;
- every deadline warning contains an immediate check;
- every opportunity contains all twelve ordered money-state fields plus its calculation method,
  meaning limit and zero-or-negative scenario; and
- every source has `retrievedAt: 2026-07-24`.

Validation proves corpus structure. It does not prove live deployment, professional competence or
the outcome of a tax matter.
