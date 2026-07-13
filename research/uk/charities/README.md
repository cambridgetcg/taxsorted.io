# UK charities — the bounded first map

**Reviewed:** 13 July 2026
**Status:** sector-first human guide; no local charity-register mirror

This directory explains where the official UK charity records live, why charity tax
relief is conditional, who governs charitable resources, what annual finance can and
cannot show, and how a person can ask an organisation for help.

The first release is deliberately smaller than the public registers. It does not copy a
national organisation directory, trustee list, address book or religion graph into
TaxSorted. A public register is a place to verify a particular organisation. It is not
automatic permission to assemble every public field into a permanent bulk profile.

## Start with the official register

Charity regulation is territorial. These are the primary search doors:

| Jurisdiction | Official door | What to remember |
| --- | --- | --- |
| England and Wales | [Charity Commission register](https://www.gov.uk/find-charity-information) | The service shows registered charities. Some charities are excepted, exempt or below the ordinary registration threshold, so absence is not proof that an organisation is not charitable. |
| Scotland | [Scottish Charity Register](https://www.oscr.org.uk/about-charities/search-the-register/) | OSCR says it keeps the register of charities in Scotland. Its search includes purposes, status, form, geography and income filters. |
| Northern Ireland | [CCNI register guidance and search](https://www.charitycommissionni.org.uk/start-up-a-charity/register-of-charities/) | CCNI explains what its register contains and how registration and annual reporting work. Registration has its own Northern Ireland process. |

Search with the exact charity number when one is available. Treat a public-facing brand
and a registered legal entity as different until an official identifier connects them.
One brand can involve a charity, a company and a trading subsidiary.

## The tax bargain, stated carefully

“Charities do not pay tax” is false as a general rule.

[HMRC's overview](https://www.gov.uk/charities-and-tax) says a charity can receive
certain reliefs after HMRC recognition. Most qualifying income is relieved only while the
money is used for charitable purposes. Non-qualifying income and non-charitable spending
can produce tax. VAT has separate rules and is not a blanket charity exemption.

TaxSorted's structural reading—using the England and Wales public-benefit framework
alongside UK HMRC rules—is:

```text
resources applied to charitable purposes and public benefit
  ↔ conditional tax relief, governance duties and public reporting
```

That is an explanation of the structure, not a statutory statement or a claim that every
organisation is effective, well run or entitled to every relief. Scotland and Northern
Ireland require their own charity-law sources. Activity matters. Legal form matters.
Jurisdiction, HMRC recognition, the governing document and the use of funds matter.

Trading is a good example. The joint HMRC and Charity Commission
[trading guidance](https://www.gov.uk/guidance/charities-and-trading) separates
primary-purpose trading, the small-trading exemption, ordinary taxable trading and trading
through a subsidiary. HMRC's more detailed
[trading note](https://www.gov.uk/government/publications/charities-detailed-guidance-notes/annex-iv-trading-and-business-activities-basic-principles)
also keeps direct tax and VAT analysis separate.

## Walk each tax statement as a graph

Every current `taxTreatments` record has a standalone explanation at:

```text
GET /v1/charities/uk/tax-treatments/{id}/why-graph
```

The graph joins nine stable field claims to reviewed evidence through the exact source ID and JSON
Pointer already declared by the corpus. Composite editorial fields name every reviewed source
that collectively carries the proposition; one convenient source is not allowed to stand in for
the whole argument. It keeps a neutral treatment effect beside the reverse tax, recovery or
clawback path. It contains no organisation, person, contact, belief, transaction, amount or case
assessment.

The non-charitable-expenditure treatment now carries a selected exact statutory spine: separate
trust and company records for ITA 2007 sections 539–543 and 562–564 and CTA 2010 sections 492–496
and 515–517. Every rule points to one exact current provision, the treatment fields it bears on,
its taxpayer class, conditions, effective-date knowledge and what it does not prove. The graph
marks those rules `checked-not-decisive`: it shows that the reasoning considered the law, never
that a sector record applied it to a case.

The other treatments still publish `binding-provision-not-mapped` rather than promoting guidance
to law. The admitted spine also remains partial: the supplementary middle provisions, separate
chargeable-gains attribution rules and case-specific return, assessment, payment, appeal and debt
routes remain explicit gaps. Two narrow procedure records cover only the attribution-specification
and conditional HMRC-determination powers in ITA section 542 and CTA section 495. Read
[`CHARITY-TAX-LAW-GAP.md`](CHARITY-TAX-LAW-GAP.md) for the provision map and
[`CHARITY-TAX-PROCEDURE-GAP.md`](CHARITY-TAX-PROCEDURE-GAP.md) for the procedure boundary.

## Control is not ordinary ownership

A charity is not normally owned through freely tradable shares. Its governing document
states its purposes and decision structure. Trustees direct and steward the charity, and
members may have defined voting powers. In England and Wales, a corporate charity can hold
assets in its own name; an unincorporated charity may need trustees or a custodian to hold
property. Scotland and Northern Ireland have their own legal forms and rules; check the
territorial regulator.

The Charity Commission's
[structure guide](https://www.gov.uk/guidance/charity-types-how-to-choose-a-structure-cc22a)
explains how a CIO, charitable company, unincorporated association and trust differ.
TaxSorted therefore uses words such as `governs`, `holds`, `controls a subsidiary` and
`regulates`. It does not invent an `owner` where the legal structure does not have one.

## Read the money without flattening it

Annual reports and accounts can reveal useful, dated facts. The following measures are not
interchangeable:

- **Income** is what came in during a reporting period. It is not cash remaining.
- **Expenditure** is what was recognised as spent. It is not a direct measure of impact.
- **Assets** are resources controlled or held at a date. Buildings, restricted funds and
  investments are not necessarily available to spend.
- **Reserves** follow an accounting and trustee-policy context. They are not simply a spare
  bank balance.
- **Staff costs and pay bands** are different from a named person's salary.
- **A grant or contract award** is not proof of payment, delivery, endorsement or success.
- **Group figures** can include subsidiaries and should not be compared with a
  charity-only return without checking the accounting boundary.

The Charity Commission's
[accounts, reporting and tax collection](https://www.gov.uk/government/collections/charity-accounts-financial-reporting-and-tax)
is the England and Wales starting point. OSCR publishes separate
[charity-finance guidance](https://www.oscr.org.uk/managing-a-charity/managing-charity-trustees/guidance-and-good-practice-for-charity-trustees/charity-finances/),
and CCNI links its annual-reporting material from its register guidance.

## Put words beside actions, with their labels intact

TaxSorted now publishes the shape of a future organisation accountability ledger, not the
ledger's organisation records. Its status is `schema-only-not-admitted`. The purpose is to let
people and builders inspect the evidence model before collection begins.

The planned reading path is:

```text
exact organisation identifiers
  → public document door and source voice
  → human-reviewed faithful paraphrase or plan
  → funding, finance, aggregate assets and organisation control
  → reported observation, outcome and evaluation
  → explicit comparison or coverage gap
```

The types stay separate. An organisation's plan or self-report is not a filing. An award is not
a payment. A payment is not proof of delivery. An output is not an outcome. An outcome claim is
not an independent evaluation. TaxSorted preserves who is speaking, what source asset supports
the record and the context that record type needs. When records are compared, the applicable
entity, dates, period, defined scope, defined metric, units, method and limitations remain
visible rather than being stripped into a score.

Names are for reading, not joining. A later organisation row must map through an exact
published official identifier. Similar names, domains, addresses, trustees or other people
cannot create a match. If an exact join or compatible record is unavailable, the honest result
is a coverage gap. If one organisation has multiple official identifiers, explicit
human-reviewed source bridges must connect them and the reviewed locator must publish both.
Every mapping must also appear in the exact organisation's mapping list and point back to it.
Uppercase-alphanumeric canonicalisation accepts only ASCII letters, digits, spaces and hyphens;
punctuation and Unicode lookalikes fail.

TaxSorted-derived assertions are reserved for structured exact-arithmetic financial facts and
labelled TaxSorted source-comparison evaluations. Reported, audited and restated finance,
programmes, funding, assets, control, observations and outcomes stay externally attributed.

Missing evidence does not make a claim false. A numerical difference does not by itself show
inconsistency. The planned `inconsistent-with` relation requires human approval and the same
exactly identified organisation, period, scope and metric. Different definitions, methods,
accounting bases, stages and source voices stay visible as differences. TaxSorted produces no
honesty, trust, faith, efficiency, value-for-money or impact ranking.

No organisation evidence row is admitted yet. Two immediate systems remain blocking:

- `confidential-correction-safety-intake`: a tested confidential route with identity-safe
  triage, urgent suppression and an auditable resolution path;
- `asset-level-rights-admission-digest`: a reviewed, content-addressed rights and safety
  record with separate link and locator-specific derived-use decisions for each register field,
  filing, account, award, payment record, evaluation or other source asset. Its digest detects
  mutation of the declared review; it does not prove that the rights conclusion is correct.

These blockers are not the complete publication test. All nine framework admission conditions
must also be evidenced and approved: the blockers; controller, lawful basis, retention and
rights handling; a formal DPIA; source rights, expiry and human locator review; a small reviewed
territorial field set; exercised correction and rollback; calibrated comparison review; public
explanation of meaning and limits; and a monitored emergency stop.

The source documents are link-only. TaxSorted may keep reviewed document metadata plus bounded
public source-review declarations and notes, but does not copy source bodies, excerpts, images or
attachments into this contract. Each source
states whether only the publisher's current URL, a publisher version/digest or a lawful archive
link is known, and its review expires. A locator is a human-reviewed pointer, not a mechanically
resolved anchor, proof or archive. An approval for a publisher or website as a whole cannot
stand in for the asset-level review. The human review covers every public document/source-review
field—including permanence text, review IDs, attribution, terms URLs, limitations, locators and
bounded notes—and excludes people, contacts, addresses, named pay, personal belief detail or
belief inference about a person, and a copied source body or excerpt. Locators must be pointers,
not quotations.

Values that are unsafe to disclose are omitted from value-bearing rows and represented as
coverage gaps. The contract requires disclosure review for every financial fact, programme,
observation, outcome, evaluation and anonymous or aggregate funding event.
`aggregate-public-donations`, `staff-costs-aggregate`,
`remuneration-bands-aggregate` and `trustee-remuneration-aggregate` are always people-derived,
with a stated smallest cell and reviewed-safe decision. Organisation-only is reserved for truly
non-person-derived values; an unknown basis or unsafe cell becomes a suppressed coverage gap
with fixed safe wording and no source-document pointer.
Exact derived money uses signed integer sums; ratios
retain their exact minor-unit numerator and non-zero denominator rather than a floating quotient.
Every derived fact and numeric comparison receives a fresh disclosure review; people-derived
status propagates from its inputs. Different periods permit arithmetic only for an explicit
`change-over-time` relation with all other dimensions aligned.
Two money records need matching basis, measurement stage and amount date before
`inconsistent-with`; a stage change stays a difference, not an accusation.

## How to ask an organisation for help

1. Verify the organisation and number in the appropriate official register.
2. Read its stated purposes, activities, area and latest reporting date.
3. Follow the organisation's own website from the register when one is supplied.
4. Use a generic service form, public help line or role-based inbox rather than a
   trustee's personal details.
5. Say what kind of help you need, the relevant area, any eligibility fact the service
   explicitly asks for, and whether the matter is urgent.
6. Ask whether the service is open, whether there is a referral route, whether it charges,
   and what documents it needs before sending sensitive material.
7. If the organisation cannot help, ask for the official name of a more suitable service.

Do not assume charitable status means an organisation provides direct help to individuals.
Some fund research, make grants, run membership bodies, maintain buildings or work through
partner organisations.

For a service complaint, contact the charity first unless immediate safety or suspected
illegal activity requires the appropriate authority. GOV.UK's
[charity complaint guide](https://www.gov.uk/complain-about-charity) explains the England
and Wales routes and links to the different processes for Scotland and Northern Ireland.

## Religious charities

Advancement of religion can be an official charitable-purpose category. Where an official
register records it, it is an organisation-level purpose or classification; it does not
establish the private beliefs of a trustee, employee, donor, member, attendee or beneficiary.

This release does not create denomination profiles, membership lists, clergy directories or
person-to-religion links. It also does not claim that every religious organisation is a
registered charity. The three jurisdictions have different registration and regulatory
rules, and a register search must be read in that context.

## API door

The bounded public route is:

```text
GET https://api.taxsorted.io/v1/charities/uk
GET https://api.taxsorted.io/v1/charities/uk/{sources|regulators|registers|legal-forms|tax-treatments|tax-rules}
GET https://api.taxsorted.io/v1/charities/uk/{obligations|funding|finance|control|help|official-procedures|pipeline|gaps}
GET https://api.taxsorted.io/v1/charities/uk/records/{id}
GET https://api.taxsorted.io/v1/charities/uk/exports
GET https://api.taxsorted.io/v1/charities/uk/exports/{collection}/{json|ndjson|csv}
GET https://api.taxsorted.io/v1/charities/uk/dictionary
GET https://api.taxsorted.io/v1/charities/uk/accountability
GET https://api.taxsorted.io/v1/charities/uk/accountability/schema
GET https://api.taxsorted.io/openapi/charities-uk.json
```

The first route describes the sector map and its publication boundary. It is not a local
copy of the three official registers. There is no bulk people export or religion graph.
When a later organisation snapshot is proposed, its source rights, inclusion rule, exact
fields, correction route, update cadence and safety review must be approved first.

Agents can discover the machine routes through `GET /agent.txt` or
`GET /.well-known/agent.txt`; both point to the canonical JSON orientation at `GET /v1/wake`.
The API root returns the same bytes only when a caller explicitly asks for JSON. Charity API
errors also name the reason and safe next actions instead of returning a bare refusal. This limited
shape adapts machine discovery, declared boundaries, errors and recovery actions from
[XENIA by Yu and Fable](https://github.com/cambridgetcg/xenia), its canonical source. CC BY-SA
4.0 applies only to the adapted agent-manifest and wake-orientation expression; TaxSorted
implementation source remains AGPL-3.0. TaxSorted does not claim full XENIA conformance and does
not adopt its ratings,
decentralised identifiers, identity or continuity model, wallets, tokens or covenants.

## Method and publication decision

- [METHOD.md](METHOD.md) records how claims are selected, reviewed and kept separate.
- [PUBLICATION-ASSESSMENT.md](PUBLICATION-ASSESSMENT.md) records why the first release is
  sector-first and why named-person aggregation remains out of scope.
- [The accountability contract](../charity-accountability/README.md) documents the
  candidate-only schema, source-use method, privacy assessment and publication blockers.

This is public research, not legal, tax, accounting, safeguarding or grant advice. Check the
current regulator, HMRC and the organisation itself before acting.
