# UK tax-services industry map

This directory explains who may do tax work, what each gate actually permits,
how people qualify, what it costs, how the institutions formed, and where money
and power sit.

The core distinction is simple:

- **Law** reserves a small set of acts and offices.
- **Regulators and HMRC** control particular activities and system access.
- **Professional bodies** control their own designations and member practice.
- **Employers** add recruitment and experience filters of their own.
- **Markets** add tuition, insurance, software and reputation costs.

Calling all five layers a “licence” hides how the industry works. Every role,
qualification, gate and pathway in the data keeps them separate.

## What is in the snapshot

[`data/uk-tax-industry.json`](data/uk-tax-industry.json) contains:

- institutions and their origins, legal form, governance, funding and limits;
- roles, including what is reserved and generally unreserved;
- ATT, CTA, ACA, ACCA, AAT, SQE and insolvency qualification routes;
- assessments, experience, sponsors, supervisors, fees and study material;
- business, AML, data, HMRC, professional, legal, insolvency, enforcement and
  software gates;
- lawful lowest-friction pathways, with stop conditions;
- salary, apprenticeship, service-revenue and partner-profit evidence kept as
  different measures;
- structural barriers, their stated rationale, who benefits, who bears them,
  safeguards and lawful alternatives;
- named gaps where public evidence cannot support a stronger conclusion.

Version `2026-07-10.2` contains 98 reviewed sources, 15 institutions, 10 roles,
7 qualifications, 18 gates, 10 pathways, 11 study resources, 14 compensation or
economics records, 14 barriers and 10 transparency gaps.

## The shortest honest routes

The data does not treat “shortest” as “skip the rules.” It means the least
burdensome lawful route for the work actually performed.

| Intended work | Shortest honest route |
| --- | --- |
| Learn tax and get paid | Join a supervised assistant/apprenticeship role; let work, experience and funded study run together. |
| Give ordinary tax advice | Build real competence, establish the business, then activate AML, data, HMRC and client-authority gates only when the service triggers them. A voluntary designation is not generally required by law. |
| Use ATT or CTA letters | Pass the body's assessments, complete the experience/sponsor requirements, join and maintain membership. This does not replace statutory business gates. |
| Become a chartered accountant | Choose ACA when a good authorised-employer agreement exists; choose ACCA when multi-employer experience flexibility matters more. |
| Conduct reserved legal work | Qualify and obtain the individual and firm authorisation that the exact activity requires. Ordinary standalone tax advice is not itself one of the six reserved legal activities in England and Wales. |
| Hold an insolvency office | Build qualifying cases, pass JIEB, obtain individual RPB authorisation, PII and bond. Software or a company cannot take the appointment instead. |
| Take control of goods | Obtain the Level 2 knowledge route, checks, bond and two-year County Court certificate—and still have a separate writ, warrant or statutory power for each case. |
| Build a tax API | Start with B2B calculation, validation and export. Let the customer remain adviser and filer of record. Add AML supervision for personalised calculations and HMRC production/recognition only when those capabilities are real. |

## TaxSorted launch boundary

The initial API lane is deliberately narrow:

```text
law/accountancy firm = adviser of record + client authority + filing
TaxSorted             = sourced rules + calculation + explanation + export
```

Capability flags should be separate, not one vague `compliant` field:

```text
information_only
personalised_tax_calculation
aml_supervised_or_exception_verified
hmrc_software_provider
hmrc_agent_registered
client_authority_present
filing_product_recognised
reserved_legal_provider
authorised_insolvency_practitioner
certificated_enforcement
```

A universal rates endpoint is different from a named-client calculation. HMRC's
current accountancy-service-provider guidance says automation does not remove
AML scope from customer-specific calculation. The B2B exception is narrow and
depends on every customer's actual supervision, contracts and operating system.

## API

The public, sessionless route is:

```text
GET /v1/tax-industry/uk
GET /v1/tax-industry/uk/graph
GET /v1/tax-industry/uk/{sources|institutions|roles|qualifications|gates}
GET /v1/tax-industry/uk/{pathways|study|compensation|barriers|gaps}
GET /v1/tax-industry/uk/{collection}/{id}
GET /v1/tax-industry/uk/manifest
GET /v1/tax-industry/uk/schema
GET /v1/tax-industry/uk/dictionary
GET /v1/tax-industry/uk/exports
GET /v1/tax-industry/uk/exports/{collection}/{json|ndjson|csv}
```

Examples:

```text
/v1/tax-industry/uk/pathways?q=lowest%20friction
/v1/tax-industry/uk/gates?legalStatus=mandatory
/v1/tax-industry/uk/qualifications?status=voluntary-designation
/v1/tax-industry/uk/barriers?type=experience-loop
/v1/tax-industry/uk/pathways?gateId=gate-aml-supervision
```

Production publication is fail-closed until
`UK_TAX_INDUSTRY_PUBLIC_DATA_ENABLED=true`. Sources, gaps and the manifest stay
visible during review, as do the schema, dictionary and export index. Source and
gap exports remain downloadable; protected collection exports do not. Responses
are cacheable, have exact representation-specific ETags and never create taxpayer
sessions.

The dictionary makes aliases and joins explicit: `study` is the public path for
the `studyResources` corpus field, and fields such as `qualificationIds` name
their target collection. The structural JSON Schema is generated from the Zod
record shape; the dictionary lists the additional graph
and cross-field checks enforced at boot. Complete collection exports need no key
or account: JSON and NDJSON preserve every value; spreadsheet-oriented CSV keeps
nested values as compact JSON and mitigates common formula triggers. Start at
`/v1/open-data` to discover this and the collection-and-enforcement graph from one
place.

Validate before publication:

```sh
npm run validate:uk-tax-industry
npm test --workspace api -- --run src/__tests__/uk-tax-industry.test.ts
```

## Reading the evidence

Every source says both what it supports and what it does **not** prove. Each
record maps reviewed source locators to JSON pointers. Company and
professional-body reports remain self-reports. Salary, fee income, firm revenue
and equity-partner profit never become interchangeable merely because each is a
pound amount.

This is public research, not legal, careers or earnings advice. Rules, fees,
routes and software access change; use the source and review date before acting.
