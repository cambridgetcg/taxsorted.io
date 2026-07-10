# Publication assessment — UK charities bounded v1

**Prepared:** 10 July 2026
**Decision:** publish the sector-first human guide; do not publish a local register,
bulk people directory or religion graph

This is a design and data-minimisation record, not legal advice or a declaration that every
future charity dataset is safe.

## Public purpose

The release helps a person:

- find the correct official charity register;
- understand conditional charity tax relief;
- distinguish governance from ordinary ownership;
- read income, spending, assets, funding and pay disclosures without flattening them;
- approach an organisation through its own public service route; and
- know where ordinary service complaints, regulatory concerns and urgent matters diverge.

Those purposes do not require TaxSorted to republish trustee names, addresses or personal
contacts.

## Information actually published

The static page contains:

- links to the three territorial regulator/register doors;
- TaxSorted-authored explanations of tax, control, finance and help-seeking boundaries;
- links to HMRC and regulator guidance; and
- links to the bounded TaxSorted API description and OpenAPI contract; and
- a link to a schema-only accountability index and structural JSON Schema describing how a
  later organisation-level words-and-actions ledger would work.

It contains no locally mirrored organisation row and makes no upstream request when a reader
opens the page.

The accountability framework's exact status is `schema-only-not-admitted`. It exposes the
planned collections, exact-identifier joins, provenance, comparison rules, hard exclusions,
stable release order, two immediate publication blockers and nine admission conditions. It
exposes no organisation, document, claim, funding, finance, asset, observation, outcome,
evaluation or comparison row.

## Excluded information

- trustee, officer, employee, clergy, volunteer, donor, member, attendee, beneficiary or
  applicant records;
- names linked across organisations;
- personal emails, phones, social accounts or biographies;
- home, residential or unreviewed registered addresses;
- portraits, signatures or filed-document images;
- named salary, individual Gift Aid or individual donation data;
- safeguarding cases, allegations, investigations or complaint dossiers;
- inferred religion, denomination, belief, ethnicity, health, vulnerability or family link;
- reverse person, postcode or property search; and
- scores of trustworthiness, impact, efficiency, faith, influence or risk.

## Why public source does not settle publication

Official registers are intentionally public, but bulk copying changes findability,
persistence, linkage and foreseeable use. Register fields can include names and addresses;
association with a religious organisation can also invite an unsupported inference about a
person's belief.

The first release therefore sends the reader to the official source for a particular lookup
and does not create a second people index. This is data minimisation, not an attempt to hide
public institutional accountability.

## Religious organisations

“Advancement of religion” may be an official purpose category for an organisation. The
category is not treated as a claim about the beliefs of trustees, staff, donors, members,
attendees or people receiving help.

The guide does not catalogue denominations or congregations and does not imply that all
religious organisations are registered charities. Any later organisation field must be
officially sourced, necessary to the stated purpose and unable to become a hidden people
classification through joins.

## Source-rights boundary

TaxSorted writes its own explanations and links to upstream pages. It does not reproduce the
register databases in this release.

This matters because source terms are specific. For example, OSCR's download page applies
Open Government Licence attribution and additional use statements to its register download,
including that a user must not claim a recreated list is the Scottish Charity Register.
Those terms must travel with any future Scottish snapshot; a TaxSorted content licence cannot
replace them.

Each future exact source asset needs separate link and locator-specific derived-use decisions
before derived-field admission, persistent storage or redistribution. The minimal access needed
to inspect the source may precede the assessment when its access terms allow it; the recorded
review itself cannot precede that retrieval. It must record whether only the publisher's
current URL, a publisher version/digest or a lawful archive link is known, and its review must
remain current. Locators are human-reviewed pointers, not mechanically resolved anchors,
semantic proof or an archive. Uncertain rights permit links and independently written
summaries, not a silent mirror. Every public document/source-review field—including permanence
text, review IDs, attribution, terms URLs, limitations, locators and bounded notes—must pass an
explicit no-person/no-sensitive-data/no-source-excerpt review; locators must be pointers only.

## Risks and controls

| Risk | First-release control | Required before expansion |
| --- | --- | --- |
| Personal or home details become easier to target | No local organisation or people rows; link to official lookup | Exact field allowlist, address classification, necessity review and confidential correction route |
| Religious purpose becomes a people-belief graph | Organisation-purpose explanation only; no names or joins | Separate special-category and foreseeable-harm assessment for any named service |
| Famous-charity selection looks like endorsement | No hand-picked directory | A complete, documented inclusion rule and visible coverage limits |
| Financial totals become performance rankings | Explain measures, periods and accounting boundaries separately | Machine fields for precision, consolidation, restrictions and `doesNotProve` |
| Public words and actions become a character verdict | Publish only the evidence schema; keep voice, stage, method and missing evidence distinct | Human-reviewed exact-context comparisons; never emit an honesty, trust, faith, efficiency or impact score |
| Similar names or undocumented cross-register links create a false organisation history | No organisation rows; official-register lookup remains the identity door | Exact published identifiers and explicit reviewed bridges that publish both IDs; unmatched records become coverage gaps |
| A small aggregate identifies a person | No organisation evidence rows | Review programmes, anonymous or aggregate funding, every financial fact, observations, outcomes and evaluations. `aggregate-public-donations`, `staff-costs-aggregate`, `remuneration-bands-aggregate` and `trustee-remuneration-aggregate` are always people-derived and need a stated smallest cell and reviewed-safe decision; unknown basis or unsafe cells become suppression coverage gaps. |
| A public schema is mistaken for collection approval | Status is `schema-only-not-admitted`; two blockers and nine conditions are machine-readable | Separate human release decision only after every admission condition is evidenced and approved |
| An old service contact harms someone seeking help | Use organisation-owned current route; promise no availability | Review alarms, checked dates, correction process and urgent-help signposting |
| Tax relief is described as blanket exemption | State conditions and separate direct tax, VAT and trading | Field-level legal evidence and review on rule changes |
| TaxSorted looks like an official register | Name and link each regulator; state no local mirror | Prominent source attribution and no official-register branding |

## Future organisation corpus gate

Do not open an organisation snapshot until all nine framework conditions have evidence and
approval:

1. `named-blockers-resolved`;
2. `controller-lawful-basis-retention-and-rights`;
3. `formal-dpia-decision`;
4. `asset-rights-expiry-and-locator-review`;
5. `small-territorial-field-set-reviewed`;
6. `end-to-end-correction-and-rollback-exercised`;
7. `comparison-review-guidance-calibrated`;
8. `public-meaning-and-limits-explained`; and
9. `monitored-emergency-stop`.

These conditions carry the source and jurisdiction scope, non-arbitrary inclusion rule,
field allowlist, lawful-basis and retention decisions, privacy and security review, opaque or
non-personal IDs, exact identifier bridges, disclosure review, correction and rollback tests,
human approval and bounded off-switch needed for a real release.

The two immediate machine-named blockers are `confidential-correction-safety-intake` and
`asset-level-rights-admission-digest`. A publisher-level, domain-level or dataset-family rights
decision cannot satisfy the second one. Each register field, filing, annual-report document,
award, payment record, evaluation or other source asset proposed for processing needs its own
decision. The digest proves neither legality nor reviewer identity, and resolving both blockers
does not satisfy the other eight admission conditions. Documents remain link-only: reviewed
document metadata plus bounded public source-review declarations and notes may be admitted, but
source bodies, excerpts, images and attachments may not.

The planned comparison layer also does not relax the gate. An organisation join must use an
exact published identifier; multiple official IDs require a reviewed source bridge that
publishes both. Mapping membership must point both ways between the mapping and organisation;
uppercase-alphanumeric values accept only the declared ASCII alphabet before canonicalisation.
`inconsistent-with` requires human approval and the same
organisation, period, scope and metric. When both records carry money, basis, measurement stage
and amount date must also match. Missing evidence, changed measurement stage, different method or
different source voice stays a gap or difference, not a finding against the organisation.

A derived financial fact follows its inputs and reviews, then receives a fresh disclosure review. A
numeric comparison's disclosure review follows both records and the human comparison review;
people-derived status propagates to either result. A period difference permits arithmetic only
for an explicit `change-over-time` relation with organisation, scope, metric and money basis still
aligned.

TaxSorted-derived assertions are limited to structured exact-arithmetic financial facts and
labelled TaxSorted source-comparison evaluations. Reported, audited and restated finance,
programmes, funding, assets, control, observations and outcomes stay externally attributed;
labelled TaxSorted editorial claims remain separate.

Any future record ID, tombstone target/replacement/release ID and release change summary needs
human review to exclude personal or removed content. Releases use `candidateAssembledAt`, form
one predecessor chain from the current candidate and reject evidence or review times after the
candidate or dataset cutoff. A tombstone's `releaseId` names its first carrying candidate, and its
effective time cannot postdate that candidate's assembly. It remains in every later candidate,
whose tombstone count must equal the cumulative retained ledger through that release.

The static framework used by the existing tax graphs must not receive a national register by
default. It clones the corpus and prepares several full representations in memory. A
register-scale release needs partitioned immutable files and a separate bounded query index.

## Named-person gate

The current decision is **not admitted**. A future named-office lookup would need a specific
public purpose that a source link cannot meet with less processing, plus current legal-basis,
fairness, necessity, notice, correction, objection, security, retention and special-category
review. It must not create a bulk export, general name search or inferred affiliation graph.

## Corrections and recall

Ordinary factual corrections may use TaxSorted's public issue tracker. Nobody should put a
private case, safeguarding report, personal detail or security concern into a public issue.

Once public data is copied, a hosted off-switch cannot recall it. The protective step is to
keep unapproved and sensitive information out of the repository and release artifact in the
first place.
