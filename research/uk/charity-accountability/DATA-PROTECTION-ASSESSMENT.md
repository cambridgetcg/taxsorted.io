# Data-protection design assessment

Assessment date: 2026-07-10.

Decision: keep the accountability layer schema-only. Do not process or publish
organisation records until the actual pipeline has a completed controller
assessment, source-specific rights decisions, a tested confidential correction
route and a formal DPIA decision.

This document is an early design assessment, not a completed DPIA and not legal
advice.

## Intended purpose

The narrow purpose is to help people and software understand, at organisation
level, how human-reviewed faithful paraphrases of claims attributed to a UK
charity relate to what admitted sources report about its programmes, funding,
aggregate finances, aggregate assets, organisation-level control, activity, outcomes and
evaluations. The linked publisher is the place to read its words as available at
review time. The permanence record must say whether a publisher version or
lawful archive is known; a current-URL-only link is not a TaxSorted archive.

The purpose is not outreach, direct marketing, individual profiling, belief
classification, donor or beneficiary discovery, trustee research, recruitment,
credit scoring, law-enforcement intelligence or automated allegation.

## Why public sources still need a data-protection assessment

An organisation record is not automatically personal data. But charity sources
can contain trustee and officer names, signatures, emails, telephone numbers,
home or service addresses, pay, safeguarding material and facts about small
groups that identify people in context. Combining sources can make a person
identifiable even when a single field appears harmless.

Religious or philosophical beliefs are special-category personal data. The ICO
states that deliberately inferring those beliefs about a person is
special-category processing regardless of confidence. It also warns that even
where the publisher does not make the inference, foreseeable inferences by
others should inform fairness and minimisation. [ICO special-category and
inference guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-is-special-category-data/)
(reviewed 2026-07-10).

The ICO’s principles require lawfulness, fairness and transparency, purpose
limitation, minimisation, accuracy, storage limitation, security and
accountability. [ICO guide to the data-protection
principles](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/)
(reviewed 2026-07-10). Its minimisation guidance says data should be adequate,
relevant and limited to what is necessary, with periodic deletion of what is no
longer needed. [ICO data-minimisation
guidance](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/)
(reviewed 2026-07-10).

## Data deliberately excluded

The contract has no place for:

- natural-person records or identifiers;
- trustee, officer, worker, donor, beneficiary or congregation membership;
- personal or functional contact details;
- addresses or asset locations;
- named pay;
- individual outcomes;
- individual control relations;
- personal religious or philosophical belief; or
- inferred belief, ethnicity, politics, health, sexuality or other sensitive
  profile.

Source documents remain external links. Reviewed document metadata plus bounded
public source-review declarations and notes may be stored; source bodies,
excerpts, images and attachments are not. A source may itself contain people;
the processed record may not.

## Main risks and controls

| Risk | Likely harm | Contract control | Control still needed before admission |
| --- | --- | --- | --- |
| A register or filing includes people or private-looking contact/address data, or review metadata repeats it. | Unwanted exposure, contact or targeting. | Link-only documents. Every public document/source-review field—including title, URL, permanence text, review IDs, attribution, terms URLs, limitations, locators and bounded notes—has a human review with person/contact/address/pay/belief flags false, copied body/excerpt false and locators pointer-only. Derived records have the same strict exclusions. | Asset-level field review, automated quarantine, sampling and urgent suppression. |
| Combining charity purpose, trustee or venue material enables belief inference about a person. | Discrimination, harassment, loss of freedom of belief or association. | No person graph, no belief field, no personal-belief processing, no inference, organisation-only voices and claims. | Red-team the actual source fields and search interface; prohibit person and belief queries at every layer. |
| Named remuneration is extracted from accounts. | Financial privacy harm and sensationalised comparison. | Only aggregate staff costs, aggregate remuneration bands and aggregate trustee remuneration; named pay is structurally false. | Source-field screening and editorial examples for edge cases involving a sole worker or tiny band. |
| A small aggregate or arithmetic result identifies a beneficiary, donor or worker. | Re-identification and disclosure of sensitive circumstances. | Programmes, anonymous or aggregate funding, every financial fact, observations, outcomes and evaluations need the applicable human disclosure review. A derived financial fact follows its inputs and reviews before receiving its own disclosure review; a numeric comparison's disclosure review follows both records and the human comparison review. `aggregate-public-donations`, `staff-costs-aggregate`, `remuneration-bands-aggregate` and `trustee-remuneration-aggregate` are always people-derived, and that status propagates to derived results and numeric comparisons. People-derived values need a stated smallest cell and reviewed-safe decision. Organisation-only is reserved for genuinely non-person-derived values. Unknown population basis, an unsafe cell or other suppression need means omit the value and create a `suppressed-for-disclosure-risk` coverage gap with fixed safe wording and no source-document pointer. | Source-specific minimum-cell, differencing and singling-out policy; test omission, arithmetic propagation, safe gap text and absent source pointers end to end. |
| Public disclosure-review limitations are added after the record's privacy check. | Sensitive or personal detail escapes through review metadata. | Final processed-record privacy review must follow the statistical-disclosure review and therefore see its public limitations text. | Test temporal ordering for every disclosure-reviewed collection. |
| Name matching, malformed identifier text or an undocumented cross-register link joins the wrong organisation. | False claims, reputational harm and misdirected scrutiny. | Exact published identifiers only. Mapping membership points both ways between mapping and organisation. Uppercase-alphanumeric rules accept only ASCII letters, digits, spaces and hyphens. Multiple official IDs need explicit human-reviewed source bridges that publish both identifiers; conflicting or unbridged IDs fail and gaps replace guesses. | Source-specific canonicalisation tests and human conflict queue. |
| Two figures look comparable but use different periods or accounting bases. | Misleading allegation or ranking. | Exact context and money-basis matching. Arithmetic stops on mismatches except that a different period is allowed only for an explicit `change-over-time` relation with every other dimension aligned. | Reviewer guidance and interface labels that keep every dimension visible. |
| A model turns a difference into an accusation. | Reputational harm and unfair automated judgement. | Machine proposals stay outside the exported candidate; every comparison is human-approved, and `inconsistent-with` needs exact organisation, period, scope, metric and definitions. Two money records must also match basis, measurement stage and amount date. | Trained reviewers, calibration, appeal and periodic error audit. |
| Old or corrected information remains reachable. | Continuing inaccuracy and harm after correction. | Immutable releases plus fixed-text removal tombstones. Dataset and retained tombstone target IDs must be reviewed as opaque or non-personal; corrected or replaced rows point to replacements. A tombstone names its first carrying candidate, cannot take effect after that candidate was assembled, remains in every later candidate and is covered by each release's exact cumulative tombstone count. | Confidential intake, service-level targets, cache purge and downstream correction notice. |
| A public correction reveals more sensitive information. | Secondary disclosure and retaliation. | Framework declares confidential intake a blocker and warns against public issues. | Build and test the private channel, reporter authentication choices and safety triage. |
| Source terms, content or rights change. | Unlawful reuse, breach of conditions or a stale paraphrase presented as current. | Link publication and derived-field use need separate, dated decisions. The record distinguishes a current publisher URL from a publisher version/digest or lawful archive link. Reviews expire before candidate use; locators are human-reviewed pointers, not mechanical proof or archives. A digest detects a changed declaration, not whether its conclusion is correct. | Source-term monitoring, expiry enforcement and whole-source rollback. |
| A record, review or release summary leaks personal or removed detail. | New disclosure through identifiers, free text or correction history. | Opaque or non-personal record-ID policy; reviewed tombstone identifiers and fixed explanations; release change-summary privacy review; removed or sensitive content cannot be repeated. All record and review times must be no later than candidate assembly and dataset generation. | Sample real identifiers and summaries, exercise rollback and audit downstream correction handling. |

## Necessity and proportionality

The organisation-level chain can serve the stated purpose without a people
layer. Exact official identifiers are more accurate than names and require less
contextual personal data; cross-register identity still needs an explicit
reviewed bridge. Applicable people-derived money, derived results, numeric
comparisons and outcomes answer structural questions without exposing
individuals only after disclosure review. Every financial fact is classified by
that review; exact organisation-only facts and
organisation-to-organisation flows remain distinct. Link-only source
doors provide a way to verify without creating a second archive of filings that
can change or be suppressed.

No necessity has been shown for trustee histories, biographies, personal
contacts, residential addresses, individual pay, donor identities, beneficiary
identities or belief classification. They therefore remain outside the design.

The design also rejects a single global performance score. Different money
bases, programme scopes, outcome methods and organisational purposes do not
collapse honestly into one rank.

## Lawful basis and roles

No lawful basis is selected by this schema. That decision needs the real
controller, processors, purposes, sources, fields, retention, audience and
risks. Any claim that source publication alone creates a lawful basis is too
broad.

Before records are admitted, document:

- who is controller and any processors or joint controllers;
- the Article 6 lawful basis for each actual processing purpose;
- whether any personal or special-category data is unavoidably processed in
  source screening, even if it is never published;
- any applicable Article 9 condition and safeguards—or stop that processing;
- privacy information and how affected people can find it;
- retention and deletion for staging, quarantine, logs and backups;
- security, access and processor contracts;
- individual-rights handling; and
- whether prior consultation with the ICO is required for any unmitigated high
  risk.

## Rights and correction

The future intake must accept access, rectification, erasure, restriction,
objection and safety reports without forcing disclosure in public. It should
allow a reporter to identify a URL or record without explaining sensitive
facts in the first message. Urgent suppression and ordinary correction are
different paths. The system should preserve an auditable decision while
keeping reporter identity and removed content out of public tombstones.

Downstream users need release IDs, source links and tombstones so they can apply
corrections. TaxSorted cannot promise that a public API consumer will erase a
local copy; terms and correction feeds should make that duty explicit, and the
remaining risk must be assessed before any publication decision.

## Residual risk and decision

Even with the schema controls, contextual identification, source changes,
misleading comparison, hostile reuse and delayed downstream correction remain
possible. The two missing immediate systems make those risks unacceptable
today, but resolving them would not be sufficient: all nine framework admission
conditions still need evidence and approval. A matching digest can detect a
changed declaration; it cannot prove that the review was lawful or genuine.

Result: **schema-only-not-admitted**. Revisit this assessment against a small,
named source and exact field list only through the full nine-condition decision,
including a formal DPIA, operational rights/retention handling, source expiry,
tested correction and rollback, calibrated review and a monitored emergency
stop. Do not treat this document as approval for national ingestion.
