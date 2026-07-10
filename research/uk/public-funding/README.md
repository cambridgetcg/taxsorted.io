# UK public funding: health, education and the next generation

**Last reviewed:** 10 July 2026  
**Status:** Coverage-first research map; England is mapped more deeply  
**Confidence:** High for the cited structures and distinctions; incomplete coverage is listed openly

This work maps how public authority and money move into health and education.
It is meant to help a person answer four separate questions:

1. who is legally responsible;
2. which body controls or allocates a budget;
3. which route can carry money to a provider; and
4. what the latest official record actually proves happened.

The canonical machine record is
[`data/uk-public-funding.json`](data/uk-public-funding.json). The prepared route
family is `/v1/public-funding/uk`; a workspace implementation is not proof that
the route has been deployed or opened in production.

This is a map of public institutions, programmes and aggregate funding. It is
not a patient, pupil, student or public-servant directory.

## The first truth: most tax is pooled

Most UK tax receipts do not travel in a labelled line from one taxpayer to one
school, hospital or university. Receipts are paid into the Consolidated Fund,
Parliament authorises spending, HM Treasury controls the approved limits and
departments or devolved governments make later funding decisions. Borrowing
finances the public-sector gap; it is not normally earmarked to a named service.

National Insurance contributions are a limited special case. Legislation
provides for an NHS allocation before the balance reaches the National
Insurance Fund. That does not make an individual's contribution traceable to a
particular appointment, trust or health board.

The devolved block grants are also not education or health cheques. Barnett
consequentials change a government's overall block grant. Scotland, Wales and
Northern Ireland then make their own budget choices alongside devolved revenue
and any permitted borrowing.

The data therefore never creates a false edge from a named tax to a named
provider. Each money record carries a `traceabilityWarning` explaining how far
the source really follows the money.

## Six money facts that must stay separate

| Word | What it means here | What it does not prove |
|---|---|---|
| Budget | A government's plan or settlement for a stated boundary and period | Parliamentary authority, payment or actual spend |
| Estimate | A request to Parliament for resource, capital and cash limits | Enacted authority before the relevant Supply legislation passes |
| Authorisation | The legal authority and limit created by legislation or another applicable power | That the full amount was allocated, paid or spent |
| Allocation | A decision assigning an amount to a body, place, programme or formula | Cash receipt, service delivery or final cost |
| Payment | A cash transfer or settlement proved by a payment record | Accrued cost, performance or the recipient's final use |
| Outturn | What an official account or statistical return reports after the period | A live cash ledger or a directly comparable number under another accounting boundary |

An NHS payment scheme is a set of pricing and payment rules, not the NHS
budget. An NHS Standard Contract sets terms, not proof of payment. A school
national funding-formula table may be a notional allocation rather than the
school's final budget. A student-loan outlay, loan-book face value, carrying
value, repayment and forecast subsidy are five different measures.

The corpus keeps resource and capital, DEL and AME, gross and net, cash and
accrual, and nominal and real prices separate. It does not add figures simply
because each contains a pound sign.

## Financial years and academic years

`2026-27` is ambiguous unless its period is named.

- A UK government financial year runs from 1 April to 31 March.
- A school, college or university academic year follows the teaching cycle and
  can differ by nation and scheme.
- Academy General Annual Grant and many 16-to-19 or tertiary allocations may be
  stated for an academic year while departmental accounts report financial
  years.

The interface must display `FY 2026-27` or `AY 2026/27`, never an unqualified
year. An academic-year figure is not converted into a financial-year figure
unless an official bridge or a published, reproducible apportionment supports
the conversion. Without that bridge the amount remains separate and the gap is
visible.

## The UK-wide spine

```text
tax and other receipts ──► Consolidated Fund
borrowing ───────────────► public-sector financing and daily cash support
                                      │
                         Parliament authorises Supply
                                      │
                           HM Treasury controls limits
                       ┌──────────────┴──────────────┐
                  UK departments             devolved block grants
                  and UK-wide bodies          + devolved revenue
                       │                       │       │       │
                    England                Scotland  Wales   Northern Ireland
                       │
              funders and commissioners
                       │
        public, charitable and verified private providers
```

The map records the legislature, treasury or consolidated fund, department,
funding body, commissioner, local authority, provider class, regulator and
scrutiny body as distinct institutions. Funding, sponsorship, regulation,
inspection and operational direction are different relationships.

## England: deeper health lanes

The current coverage follows these principal routes:

- Parliament and HM Treasury → Department of Health and Social Care: spending
  authority and controls;
- Department of Health and Social Care → NHS England: annual financial
  directions and group limits;
- NHS England → 36 integrated care boards: recurrent, programme and other
  allocations from 1 April 2026;
- NHS England or an integrated care board → NHS trusts, NHS foundation trusts,
  primary-care contractors, independent providers, charities and social
  enterprises: commissioning and contract routes;
- Department of Health and Social Care → upper-tier and unitary local
  authorities: ring-fenced section 31 public-health grants;
- integrated care board + local authority → pooled arrangement: section 75 and
  Better Care Fund routes; and
- commissioner or contractor → NHS Business Services Authority → provider:
  payment administration in supported primary-care lanes. Administration does
  not make NHSBSA the commissioner.

Provider selection under the Provider Selection Regime, contract terms under
the NHS Standard Contract and prices under the NHS Payment Scheme are kept
separate from the source of budget authority.

Announced reform is not silently shown as current structure. At this review
date, proposed NHS England abolition, later transfers of functions, integrated
care partnership removal and future control totals remain future proposals or
plans to the extent stated by their official sources.

## England: deeper education lanes

### Early years, schools and high needs

- Department for Education → local authority → early-years provider: three
  early-years formula streams. The 2026-27 operational guide requires a local
  authority to pass through at least 97% of each entitlement stream.
- Department for Education → local authority: Dedicated Schools Grant, split
  into schools, central school services, high needs and early-years blocks.
- Local authority → maintained school: the authority's local formula and
  delegated budget.
- Department for Education → academy trust: direct General Annual Grant after
  the corresponding local-authority amount is recouped.
- Department for Education → local authority, academy or other eligible
  setting: pupil-premium grant under its stated grant conditions.
- Core setting + local authority → child or young person's provision: core
  high-needs support, place funding and needs-led top-up are separate layers.
  The high-needs route covers ages 0 to 25 and alternative provision.

Schools forums, elected councils, academy trust boards and school governing
bodies have different decision and scrutiny roles. Regional advisory boards
ended on 31 March 2026 and are not represented as active bodies.

### Further education, adult skills and apprenticeships

- Department for Education → sixth form, college or other provider: 16-to-19
  formula allocation using the applicable learner and programme factors.
- Department for Education → further-education college: revenue agreement,
  programme grant or capital allocation as the source states.
- Department for Work and Pensions owns current adult-skills policy while the
  Department for Education implements specified 2026-27 Adult Skills Fund
  payments on its behalf. Devolved-authority areas have separate routes.
- Employer → HMRC: apprenticeship levy tax.
- Apprenticeship service → employer account: the applicable English share and
  government top-up.
- Employer or service → training and assessment provider: payment under the
  current apprenticeship funding rules and funding band.

The Education and Skills Funding Agency closed on 31 March 2025. Its former
activity is not attributed to a current body. Apprenticeship policy moved to
the Department for Work and Pensions on 1 April 2026.

### Higher education, student finance and research

- Department for Education → Office for Students → registered English
  provider: teaching, strategic-priority and capital grant routes.
- Department for Education → Student Loans Company → student or provider:
  maintenance and tuition-fee loan delivery.
- Borrower → HMRC or Student Loans Company: income-contingent repayment.
- Department for Science, Innovation and Technology → UK Research and
  Innovation → nine councils → eligible organisation: formula funding,
  competitive grant, fellowship, contract or loan according to the scheme.
- Research England → English higher-education provider: quality-related and
  knowledge-exchange formula funding.

UKRI award types are not flattened into “grant”. Student finance is not added
to institutional teaching grants unless the question and accounting boundary
explicitly require both.

## Scotland, Wales and Northern Ireland

The same words do not always name the same structure in all four nations.

| Nation | Health route covered first | Education route covered first |
|---|---|---|
| Scotland | Scottish budget → 14 territorial and 8 national NHS boards; health and social-care integration through 30 integration joint boards and the Highland lead-agency arrangement | Scottish budget and local-government settlement → councils and schools; Scottish Funding Council → colleges and universities; SAAS → student support |
| Wales | Welsh budget → 7 local health boards, 3 NHS trusts and 2 special health authorities; the NHS Wales Joint Commissioning Committee handles specified national and specialised services | Welsh budget → non-ring-fenced local-government settlement → school formulas; Medr → tertiary education, apprenticeships and research; student support through the Welsh policy and SLC delivery route |
| Northern Ireland | Executive/Department of Health → Strategic Planning and Performance Group → 5 regional health and social-care trusts, the NI Ambulance Service, primary care and other providers | Department of Education → Education Authority → grant-aided schools; Department for the Economy → FE colleges and HE institutions; Student Finance NI through departmental, EA and SLC delivery |

Block grants are shown before devolved portfolio decisions. A Whitehall
department's budget change is not presented as the amount Scotland, Wales or
Northern Ireland spent on the corresponding service.

## “Next generation” is a lens, not a made-up total

Programmes can carry a plain aggregate `populationScope`, such as early years,
school-age learners, people aged 0 to 25 receiving high-needs support,
care-experienced young people, apprentices or higher-education students. These
descriptions are for finding relevant programmes. They are not person records
and they do not assert that every pound benefits only that group.

The tags overlap. A disabled 18-year-old apprentice may fall within several
descriptions; a school capital programme can benefit many cohorts over many
years; public health can benefit children and adults together. TaxSorted does
not sum overlapping tagged programmes into a “next-generation budget”. It
publishes a total only when an official source defines that total or when a
reproducible calculation proves that the component boundaries do not overlap.

## Provider classes

The first pass classifies providers before trying to enumerate every provider.

Health classes include NHS trusts and foundation trusts, health boards,
integrated care boards, primary-care contractors, local authorities, public
health providers, independent providers, charities, voluntary and community
organisations, social enterprises and social-care providers.

Education classes include local authorities, maintained schools, academy
trusts and academies, special schools, alternative provision, early-years
providers, school sixth forms, further-education colleges, independent training
providers, assessment organisations, higher-education providers, research
institutes and student-finance delivery bodies.

A provider class does not prove a particular award or payment. A private,
charitable or social-enterprise provider appears as a named organisation only
after an official identifier and an official funding, contract or regulatory
record establish the relevant relationship. Name similarity is not enough.

## What is in the machine map

The collections have one job each:

- `sources` — official evidence, dates, authority and reuse notes;
- `institutions` — public bodies and screened provider classes or organisations;
- `governanceUnits` — boards, committees, panels and other collective units;
- `offices` — formal roles and their powers, without holder names;
- `relationships` — typed responsibility, accountability and funding edges;
- `funds` — named public funds or bounded pots;
- `programmes` — purpose, sector, jurisdictions and aggregate population scope;
- `fundingMechanisms` — formula, grant, grant-in-aid, contract, loan, levy or
  other route;
- `allocations` — amount, year, state, boundary and accounting basis;
- `contacts` — functional institutional channels only;
- `officeLocations` — public non-residential offices;
- `pipelineStages` — the steps from pooled revenue and authority to delivery;
- `transparencyGaps` — missing, conflicting or not-yet-comparable evidence.

Read [METHOD.md](METHOD.md) for the admission, normalisation, privacy,
correction and release rules.

## Governance, people and contacts

The open corpus maps a formal office, not a dossier about its holder. An office
may contain an `official-source-link-only` pointer to the institution's current
holder page, an as-of date and the reason the link matters. Names and
biographical profiles do not enter the bulk JSON.

Official personnel and governance doors include:

- [Department for Education organisation](https://www.gov.uk/government/organisations/department-for-education)
  and [governance](https://www.gov.uk/government/organisations/department-for-education/about/our-governance);
- [Office for Students board](https://www.officeforstudents.org.uk/about/how-we-are-run/who-we-are/our-board/);
- [UKRI board](https://www.ukri.org/who-we-are/how-we-are-governed/ukri-board/);
- [Student Loans Company governance](https://www.gov.uk/government/organisations/student-loans-company/about/our-governance);
- [Scottish Funding Council board](https://www.sfc.ac.uk/about-us/sfc-board/);
- [Medr board and governance](https://www.medr.cymru/en/board-and-governance/); and
- [Northern Ireland Education Authority structure](https://www.eani.org.uk/about-us/corporate-information/organisational-structure/organisational-structure-roles).

These links let a reader check the current public record. TaxSorted does not
turn the changing names into a permanent bulk personnel history.

Formal power is not inferred from salary, fame, budget size or proximity to a
minister. Each office instead records its actual responsibility, decision
scope, constraints, appointment route and accountability. TaxSorted's existing
[`/v1/politics/uk/power/method`](../politics/system-method.md)
scores formal offices in visible dimensions and never scores a person's worth,
character or hidden influence. This coverage-first corpus links to that method
instead of inventing a second, incompatible leaderboard; funding-specific
calibration is a declared deep-dive task.

Contacts are limited to a switchboard, shared mailbox, contact form, FOI route,
complaints route or published public office. Every contact says
`functionalOnly: true`; every location says `residential: false`. Personal
mobile numbers, home addresses, inferred email formats and staff-directories
are excluded even when a search engine has indexed them.

## Main official source doors

### Public finance

- [Supply Estimates guidance 2026](https://www.gov.uk/government/publications/supply-estimates-guidance-manual/supply-estimates-a-guidance-manual-2026)
- [Consolidated Fund Account 2024-25](https://assets.publishing.service.gov.uk/media/68f257121c9076042263f048/Consolidated_Fund_Account_2024-25.pdf)
- [Statement of Funding Policy 2025](https://assets.publishing.service.gov.uk/media/684859e3d0ca5d7801e4e6f6/Statement_of_Funding_Policy.pdf)
- [Main Supply Estimates 2026-27](https://www.gov.uk/government/publications/main-supply-estimates-2026-to-2027)

### Health

- [2026-27 financial directions to NHS England](https://www.gov.uk/government/publications/2026-to-2027-financial-directions-to-nhs-england/2026-to-2027-financial-directions-to-nhs-england)
- [NHS England allocations](https://www.england.nhs.uk/allocations/)
- [Integrated care boards from April 2026](https://www.england.nhs.uk/publication/integrated-care-boards-in-england/)
- [2026-27 NHS Payment Scheme](https://www.england.nhs.uk/long-read/2026-27-nhs-payment-scheme/)
- [Public-health grants to local authorities 2026-27](https://www.gov.uk/government/publications/public-health-grants-to-local-authorities-2026-to-2027)
- [Better Care Fund framework 2026-27](https://www.gov.uk/government/publications/better-care-fund-framework-2026-to-2027/better-care-fund-framework-2026-to-2027)

### Education and research

- [DfE annual report and accounts 2024-25](https://www.gov.uk/government/publications/department-for-education-consolidated-annual-report-and-accounts-2024-to-2025/dfe-consolidated-annual-report-and-accounts-2024-to-2025-html-version)
- [Early-years funding 2026-27](https://www.gov.uk/government/publications/early-years-funding-2026-to-2027)
- [Dedicated Schools Grant 2026-27](https://www.gov.uk/government/publications/dedicated-schools-grant-dsg-2026-to-2027)
- [High-needs funding operational guide 2026-27](https://www.gov.uk/government/publications/high-needs-funding-arrangements-2026-to-2027/high-needs-funding-2026-to-2027-operational-guide)
- [16-to-19 funding 2026-27](https://www.gov.uk/guidance/16-to-19-funding-information-for-2026-to-2027)
- [Adult Skills Fund rules 2026-27](https://www.gov.uk/government/publications/adult-skills-fund-funding-rules/adult-skills-fund-funding-and-performance-management-rules-2026-to-2027)
- [Apprenticeship funding rules 2026-27](https://www.gov.uk/government/publications/apprenticeship-funding-rules-and-assessment-plan-guidance-2026-to-2027)
- [OfS funding guidance 2026-27](https://www.officeforstudents.org.uk/news-blog-and-events/press-and-media/the-office-for-students-receives-funding-guidance-for-2026-27/)
- [Student-loan forecasts for England 2025-26](https://explore-education-statistics.service.gov.uk/find-statistics/student-loan-forecasts-for-england/2025-26)
- [DSIT Main Estimate memorandum 2026-27](https://www.gov.uk/government/publications/dsit-main-estimate-memorandum-2026-to-2027/dsit-main-estimate-memorandum-2026-to-2027)

### Devolved systems

- [Scottish Budget 2026-27: Health and Social Care](https://www.gov.scot/publications/scottish-budget-2026-2027/pages/5/)
  and [Education and Skills](https://www.gov.scot/publications/scottish-budget-2026-2027/pages/8/)
- [Welsh Final Budget 2026-27](https://www.gov.wales/sites/default/files/publications/2026-01/final-budget-2026-2027-report.pdf)
- [Welsh health-board allocations 2026-27](https://www.gov.wales/health-board-allocations-2026-2027-whc2025055)
- [Welsh school-funding explanation](https://www.gov.wales/funding-schools-faqs-html)
- [Northern Ireland 2026-27 Vote on Account](https://www.finance-ni.gov.uk/sites/default/files/2026-02/Northern%20Ireland%20Estimates%20-%20Vote%20on%20Account%202026-27.pdf)
- [Northern Ireland Common Funding Scheme 2026-27](https://www.education-ni.gov.uk/publications/common-funding-scheme-2026-27)

## Provenance and publication

The route is not a live scraper. The safe path is:

```text
allowlisted official source
  → narrow claim
  → source locator and observation date
  → money, period and jurisdiction classification
  → identity and relationship checks
  → privacy and reuse review
  → human-readable diff
  → immutable reviewed snapshot
```

Every source says what it supports and what it does not prove. Every derived
join names its inputs and method. Unknowns and conflicts become gap records,
not plausible filler.

Stable IDs are never deliberately recycled. Corrections supersede a record or
publish a tombstone; they do not quietly rewrite history. Breaking meaning,
units or identity requires a schema-major change. The source, observation date,
snapshot version and correction state travel with the record.

TaxSorted's summaries and schema can have different reuse terms from the
underlying official material. Reusers should retain source IDs, links, dates
and attribution and follow each source's stated terms. A publication switch is
a review and hosting control, not confidentiality and not a way to recall a
downloaded copy.

## Explicit gaps at this review

- Coverage reaches the principal national routes and provider classes, not
  every local authority, provider, board, committee, programme or payment.
- Current-year plans and allocations are newer than the latest audited
  outturn. They cannot be presented as one reconciled year.
- An Estimate is not enacted supply. The exact 2026-27 authority in force must
  be checked against the legislation at the time of each release.
- Northern Ireland did not have a verified final full multi-year budget in the
  reviewed material. Draft proposals and the Vote on Account remain labelled
  as such.
- Announced health reforms, including future NHS England function transfers,
  are not current relationships until the cited law or operative decision says
  they are.
- Wales's July 2026 supplementary-budget proposal was not treated as authorised
  at this review date.
- The national Dedicated Schools Grant total still needs a checked aggregation
  of the current local-authority allocation file rather than a copied headline.
- Complete current SAAS governance and award extraction, consolidated Medr
  programme allocations and post-election parliamentary committee snapshots
  remain depth-two work.
- Provider-level payment, contract, service-volume and outcome records are not
  yet joined across systems. An allocation is therefore not presented as
  delivery.
- Cross-system identifiers remain incomplete. Important bridges include ODS
  codes, local-authority codes, GIAS URNs, UKPRNs, OfS/HESA identifiers,
  Companies House numbers, charity numbers and official research identifiers.
- `populationScope` descriptions overlap. No additive next-generation total is
  currently supportable from those tags alone.
- Contact pages, membership pages and office structures can change between
  reviews. The official link and as-of date are the live checking route.
- Reuse terms are not yet confirmed field by field for every upstream source.
  Unresolved replication rights require link-first publication.
- A public correction route exists through the repository issue tracker, but a
  complete confidential safety-reporting route is not yet live. Private or
  safety-sensitive information must not be posted in a public issue.

The honest first release is broad and incomplete. Depth comes next: one funding
lane at a time, with allocation, payment, outturn, governance and provider
evidence kept in their proper places.
