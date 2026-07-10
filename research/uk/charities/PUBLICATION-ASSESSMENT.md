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
- links to the bounded TaxSorted API description and OpenAPI contract.

It contains no locally mirrored organisation row and makes no upstream request when a reader
opens the page.

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

Each future source family needs a recorded rights decision before retrieval, storage or
redistribution. Uncertain rights permit links and independently written summaries, not a
silent mirror.

## Risks and controls

| Risk | First-release control | Required before expansion |
| --- | --- | --- |
| Personal or home details become easier to target | No local organisation or people rows; link to official lookup | Exact field allowlist, address classification, necessity review and confidential correction route |
| Religious purpose becomes a people-belief graph | Organisation-purpose explanation only; no names or joins | Separate special-category and foreseeable-harm assessment for any named service |
| Famous-charity selection looks like endorsement | No hand-picked directory | A complete, documented inclusion rule and visible coverage limits |
| Financial totals become performance rankings | Explain measures, periods and accounting boundaries separately | Machine fields for precision, consolidation, restrictions and `doesNotProve` |
| An old service contact harms someone seeking help | Use organisation-owned current route; promise no availability | Review alarms, checked dates, correction process and urgent-help signposting |
| Tax relief is described as blanket exemption | State conditions and separate direct tax, VAT and trading | Field-level legal evidence and review on rule changes |
| TaxSorted looks like an official register | Name and link each regulator; state no local mirror | Prominent source attribution and no official-register branding |

## Future organisation corpus gate

Do not open an organisation snapshot until all of these exist:

1. exact source and jurisdiction scope;
2. a non-arbitrary inclusion rule;
3. source and database-rights decision;
4. opaque stable IDs and exact official identifier joins;
5. top-level and nested field allowlists;
6. prohibited-field and free-text review;
7. documented update, retention, correction and tombstone rules;
8. a confidential route for personal or safety-sensitive reports;
9. human approval tied to the exact admission-ledger digest; and
10. a bounded hosted emergency stop.

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
