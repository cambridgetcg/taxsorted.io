# UK charities — the bounded first map

**Reviewed:** 10 July 2026
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
GET https://api.taxsorted.io/v1/charities/uk/{sources|regulators|registers|legal-forms|tax-treatments}
GET https://api.taxsorted.io/v1/charities/uk/{obligations|funding|finance|control|help|pipeline|gaps}
GET https://api.taxsorted.io/v1/charities/uk/exports
GET https://api.taxsorted.io/v1/charities/uk/exports/{collection}/{json|ndjson|csv}
GET https://api.taxsorted.io/v1/charities/uk/dictionary
GET https://api.taxsorted.io/openapi.json
```

The first route describes the sector map and its publication boundary. It is not a local
copy of the three official registers. There is no bulk people export or religion graph.
When a later organisation snapshot is proposed, its source rights, inclusion rule, exact
fields, correction route, update cadence and safety review must be approved first.

## Method and publication decision

- [METHOD.md](METHOD.md) records how claims are selected, reviewed and kept separate.
- [PUBLICATION-ASSESSMENT.md](PUBLICATION-ASSESSMENT.md) records why the first release is
  sector-first and why named-person aggregation remains out of scope.

This is public research, not legal, tax, accounting, safeguarding or grant advice. Check the
current regulator, HMRC and the organisation itself before acting.
