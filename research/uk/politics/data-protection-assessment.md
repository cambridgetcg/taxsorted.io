# UK politics directory — data-protection assessment draft

**Prepared:** 2026-07-10
**Decision owner:** Yu / TaxSorted
**Status:** draft for review; not an approval to publish

This is a working record for the production gate, not legal advice. It follows the
ICO's guidance that public-domain information remains subject to fairness,
transparency and lawful-basis duties.

## Purpose

Help a person understand who holds public political office, how to reach the office,
what formal roles and declared financial interests are on record, and what the person
has recently done in Parliament. Give developers the same source-linked facts through
a read-only API.

The service must not become a targeting list, a private-person dossier, or an engine
for inferring beliefs, relationships, motive or wrongdoing.

## Proposed data classes

| Data | Purpose | Source | Initial sensitivity | Publish decision |
|---|---|---|---|---|
| name, public title, House, seat, dates | identify office-holder | UK Parliament | ordinary personal data | proposed yes |
| declared party | explain representation and Parliamentary grouping | UK Parliament | special category (political belief) | proposed for elected MPs under Article 9(2)(e); peers need separate review |
| generic office inbox/switchboard/address | let the public reach the office | UK Parliament/GOV.UK | low | proposed yes |
| named professional email/phone | let the public reach the office | UK Parliament | medium | field-by-field review, freshness and objection route required |
| publicly listed staff name/job | explain publicly funded office personnel | UK Parliament | medium | not approved until necessity and expectations are assessed |
| registered interests | show statutory declarations | UK Parliament | medium/high; can include third parties | proposed only after minimisation; strip address, donor/payer/location lines and omit family-interest categories |
| recent contributions and election result | show public activity and democratic mandate | UK Parliament | low/medium | proposed yes, source/context required |
| donor name and party donation | show statutory political-finance return | Electoral Commission | special category may be revealed | disabled pending licence and Article 9 assessment |
| ministerial gift/hospitality counterparty | show the official transparency return | GOV.UK department CSV | ordinary or special-category third-party data | parser built; disabled pending field, necessity and correction review |
| senior police office-holder name/rank | identify current public accountability office | force-published Police API | ordinary personal data with safety context | disabled pending seniority, necessity, freshness and security review |
| corporate contract/grant/subsidy/land event | show a public organisation transaction | official procurement/register source | normally organisational; source can contain personal fields | organisation identifiers only; strip contacts and addresses; land needs its separate licence |
| official-text surface metrics | make attributed public language measurable | Hansard and official texts | behavioural profiling when identifiable | method only; disabled pending separate LIA, DPIA and Article 14 notice |

## Article 6 candidate basis

Candidate: legitimate interests — public understanding, accountability, easier access
to official democratic records, and reuse by civic software.

Before approval, record:

1. the exact legitimate interest;
2. why each field is necessary rather than merely interesting;
3. whether a link to the source would meet the purpose with less processing;
4. the likely expectations and impact on office-holders, staff and third parties;
5. the safeguards that make the balance fair;
6. the owner who approved the balance and the review date.

## Article 9 candidate condition

ICO guidance gives an explicit example: an MP's political affiliation may be
“manifestly made public” through the deliberate act of standing for election. That
can support Article 9(2)(e) for the affiliation they stood under. It does not create a
blanket permission for every political inference or for every other person in the
record. In particular, peers, staff, donors and family members need their own analysis.

No inferred political view is permitted. A party field is an attributed official
claim with dates, not a timeless claim about belief.

## Main risks and controls

| Risk | Control in the first build | Further decision before launch |
|---|---|---|
| private contact redistribution | professional-type allow-list; reject home/private/personal/residential | test every upstream type; correction/objection handling |
| address or family exposure inside free text | remove donor, payer, destination, location and address lines; omit explicit family/spouse/civil-partner categories | adversarial test corpus; decide whether interests need a manual review layer |
| staff or third-party surprise | no contact enrichment; source link; missing stays missing | assess necessity; consider excluding staff from public API by default |
| stale roles or contacts | live official source; retrieval time; cache measured in minutes | retention and stale-source policy; reshuffle monitoring |
| false corruption/influence claims | neutral transaction wording and explicit coverage warning | moderation/editorial policy for future derived summaries |
| bulk targeting | no write/contact endpoint, small pages and bounded calls | rate limits, abuse monitoring and terms of use |
| source or licence drift | source manifest and licence gate | periodic terms check; ingest off-switch |
| person misidentification | stable upstream IDs; never merge on name | reviewed identity-link process for later sources |
| portrait rights | do not republish portraits | per-image rights only if a later product genuinely needs them |
| operational or officer safety | institution and senior-accountability-office whitelist; no lower-rank or operational records | source-specific security review and immediate emergency stop |
| cached named records after a stop | named responses use `Cache-Control: no-store` | purge any external cache during incident response and verify every named route returns 503 |
| inferred quid pro quo from multiple records | typed events, exact-ID joins and explicit `doesNotProve`; no influence score or graph-path accusation | editorial review for any future official-finding lane |

## Transparency notice must say

- who controls the joined record and how to contact them;
- the purposes, Article 6 basis and Article 9 condition used;
- every source family and data category;
- who receives the API data and that it is public;
- retention and refresh rules;
- correction, objection, restriction and complaint routes;
- whether any field is withheld or removed by TaxSorted;
- that official-source correction and TaxSorted mapping correction are different paths.

## Decisions still open

- [ ] approve or reject legitimate interests for each field class;
- [ ] approve Article 9(2)(e) for elected-party affiliation and decide peers separately;
- [ ] decide whether named Parliamentary staff are necessary for v1;
- [ ] separately approve the registered-interest category and free-text projection;
- [ ] decide whether named professional email addresses remain in the JSON API or only the UI;
- [ ] complete the DPIA consultation and sign-off;
- [ ] publish the Article 14 privacy notice and correction/objection route;
- [ ] set retention, refresh, rate-limit and incident-response rules;
- [ ] obtain Electoral Commission database-reuse terms before enabling donations.
- [ ] approve or reject the ministerial gift/hospitality field and third-party-counterparty projection;
- [ ] approve a named senior law-enforcement office threshold and safety/correction process;
- [ ] keep natural-person property search unimplemented and record the corporate-land dataset licence before ingest;
- [ ] complete a separate assessment before any identifiable official-language metrics are calculated;
- [ ] publish and test the master personal-data emergency-stop procedure.

## Official guidance read

- ICO, special-category conditions:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/what-are-the-conditions-for-processing/>
- ICO, data-protection impact assessments:
  <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-impact-assessments/>
- UK Parliament, Open Parliament Licence v3.0:
  <https://www.parliament.uk/site-information/copyright/open-parliament-licence/>
- Electoral Commission, regulated-entities privacy notice:
  <https://www.electoralcommission.org.uk/privacy-policy/regulated-entities>
