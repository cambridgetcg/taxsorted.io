# UK observer accountability

Reviewed 11 July 2026.

This is the research note behind `GET /v1/accountability/uk` and the human page at
`/uk/accountability`.

## The decision

“The observer is also observed” is useful here as a rule of symmetric accountability, not a
literal claim that an investigator and an investigated body are one being.

An investigator is not a neutral eye outside the graph. Its public identity, authority,
commissioning, funding, method, evidence choices, limits, words, actions, corrections and
challenge routes are public acts that can be sourced too.

The reverse boundary matters just as much: transparency is not total visibility. A public
interest in institutional power does not create a public entitlement to an investigator's home,
private relationships, beliefs, personality, family, private messages or live operational work.
The first unit is therefore an institution acting in a public capacity, not a person dossier.

My view is that this is the honest middle. Making observers uninspectable protects power. Making
people infinitely inspectable reproduces the same power under a friendlier label.

## The invariant

Every institution named as an observer on an investigation engagement must have at least one
sourced accountability or challenge relation—review, complaint, appeal, audit or oversight—or a
coverage gap explicitly saying that the route has not been mapped.

The chain need not be infinite. It may terminate at a final court, statute, Parliament, election
or public disclosure. The endpoint and its limit must be stated instead of silently drawing an
institution as the final authority on truth.

TaxSorted is inside the invariant. Its choices to select, omit, paraphrase, compare, correct and
publish are observations too.

## What “network” means

Only a typed, published institution-to-institution relation:

- commissioned by
- funded by
- appointed by
- sponsored by
- overseen by
- audited by
- complaints handled by
- appealable to
- reviewable by
- reports to
- refers cases to
- cooperates with

These are not synonyms. Funding is not control. Appointment is not operational direction.
Cooperation is not collusion. A complaint is not a finding. The API refuses a generic
“connected to” edge because it hides the claim a reader is being asked to believe.

## What “words” and “doings” mean

Words are a dated, attributed, human-reviewed faithful paraphrase plus a publisher door. The
source remains the place for exact words unless a separate rights review permits copying.

Doings are sourced public procedural events: opening, changing scope, requesting evidence,
interviewing, visiting, referring, publishing a provisional or final finding, sanctioning,
correcting, retracting or closing.

The following states must remain separate:

```text
procedural only
allegation — not determined
no determination
no breach found
breach found
decision under appeal
final, subject to judicial review
corrected
withdrawn
```

An institutional response is its own record. It does not overwrite the observer's finding, and
the finding does not overwrite the response.

## The API contract

The candidate schema has five collections:

1. `institutionalRelations`

   Exact organisation references, one typed relation, dates, public meaning, source-document
   pointers and an explicit statement that the edge does not itself claim control.

2. `investigationEngagements`

   Investigator and subject institutions, commissioner and funder if published, scope, period,
   mandate, methods, evidence-selection rules, output doors, limits, independence status,
   correction route and accountability relations. Empty commissioner, funder, method and output
   claims use explicit disclosure states. Published absence and planned-output claims need
   field-specific source receipts; unknown or unpublished claims need a scoped, dated gap with
   the documents that were checked.

3. `investigationActions`

   One public procedural event, its exact institutional actor and investigator-or-commissioner
   capacity, structured declared-subject targets,
   referral destinations where relevant, outcome state, faithful paraphrase and source pointers.
   The target and destination cannot be left implicit in prose for actions whose meaning depends
   on them.

4. `institutionalResponses`

   One subject institution's published acceptance, partial acceptance, dispute, correction
   request, appeal or withdrawal, tied to the action it answers.

5. `coverageGaps`

   Missing mandate, method, commissioner, funding, durable output, response, source rights or
   observer-accountability route.

The candidate validator requires exact base-dataset references, sorted globally unique IDs,
valid dates, organisation-only privacy declarations and declared base-dataset references. It
rejects contradictory live disclosure gaps and enforces the observer reciprocity invariant. It
does not resolve pinned base records or detect
personal data, allegations or unsafe context hidden in free text. Passing validation does not
establish legality, source rights, reviewer identity or publication approval.

## Why there are zero records

The framework and source doors are live. The five candidate collections contain no records.
The copyable example is [`examples/zero-row-candidate.json`](examples/zero-row-candidate.json);
it passes the runtime validator without pretending a case exists.

Real investigation records are not admitted because TaxSorted does not yet have:

- a confidential correction and safety intake;
- an operational controller, lawful-basis, retention and DPIA decision for this processing;
- a per-source link and derived-use admission ledger for investigator outputs;
- a monitored emergency stop and exercised rollback for the future record set;
- an audit store that can prove the declared human and source reviews occurred.

Publishing the shape now lets builders align without pretending those systems exist. Filling it
with attractive examples would weaken the truth of the boundary.

## Love-style experiment loop

The playful shorthand is “fuck around and find out—with receipts.” The public meaning is a
bounded, reversible inquiry:

```text
hypothesis
→ small pilot
→ public institutional observation
→ exact evidence and limits
→ counterevidence and challenge
→ rights, privacy and hostile-use test
→ observe / adopt / adapt / discard
→ stop and roll back when a wall is hit
```

Stop when source rights are unclear, personal or sensitive data appears, exact identity is not
available, a relation would need inference, fair correction is unavailable, or the off-switch
cannot be exercised.

## Official source doors

| System | What the source exposes | Official door |
|---|---|---|
| HMRC compliance | Compliance-check process and review/appeal choices | [HMRC compliance checks](https://www.gov.uk/guidance/hmrc-compliance-checks-help-and-support) |
| HMRC criminal work | Powers, judicial safeguards, civil/criminal separation and oversight | [Criminal investigation](https://www.gov.uk/government/publications/criminal-investigation/criminal-investigation) |
| HMRC service | Two internal complaint reviews before the Adjudicator | [Complain about HMRC](https://www.gov.uk/complain-about-hmrc) |
| Adjudicator | Personal independence beside HMRC staffing, funding and legal structure | [Service-level agreement](https://www.gov.uk/government/publications/adjudicators-office-service-level-agreement-with-hmrc-and-voa/service-level-agreement-for-the-provision-of-complaints-adjudication-services-for-hm-revenue-and-customs-and-valuation-office-agency-by-the-adjudicato) |
| Tax tribunal | Independent appeal scope and procedure | [First-tier Tax Tribunal](https://www.gov.uk/government/publications/appeal-to-the-tax-chamber-of-the-first-tier-tribunal-t242/how-to-appeal-to-the-first-tier-tax-tribunal) |
| Charity Commission | Inquiry powers, safeguards, review and appeal | [Statutory inquiries](https://www.gov.uk/government/publications/statutory-inquiries-into-charities-guidance-for-charities-cc46/statutory-inquiries-into-charities-guidance-for-charities) |
| Charity Commission service | Complaint scope and PHSO route | [Complaints procedure](https://www.gov.uk/government/organisations/charity-commission/about/complaints-procedure) |
| NAO | C&AG independence and the NAO's own budget scrutiny and external audit | [Governance](https://www.nao.org.uk/about-us/governance/) |
| Electoral Commission | Opening tests, evidence, determinations, sanctions, publication and appeal | [How investigations work](https://www.electoralcommission.org.uk/political-registration-and-regulation/our-enforcement-work/investigations/how-investigations-work) |
| PHSO | Service feedback, narrow decision review and judicial-review boundary | [Feedback about PHSO](https://www.ombudsman.org.uk/about-us/feedback-about-our-service) |
| ICO | Enforcement, audits, decisions, complaints data and investigations | [Action taken](https://ico.org.uk/action-weve-taken/) |
| ICO itself | Service, case-review, Tribunal, PHSO and judicial-review routes | [Complain about the ICO](https://ico.org.uk/make-a-complaint/complaints-and-compliments-about-us/complain-about-us/) |
| Private investigation | Current SIA activity-based list; TaxSorted infers that private investigation is not itself named | [Find out if you need an SIA licence](https://www.gov.uk/guidance/find-out-if-you-need-an-sia-licence) |

Official self-description is evidence of what an institution says and publishes. It is not
independent proof that every practice matches the description. A later event ledger should add
court decisions, independent audit, corrections and institutional responses without converting
disagreement into a score.
