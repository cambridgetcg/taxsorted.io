# TaxSorted.io Research Architecture

> **Mission**: Build the UK's most user-friendly tax filing platform
> **Domain**: taxsorted.io
> **Target Market**: UK taxpayers (individuals, sole traders, small businesses)

---

## Architecture Overview (PP Framework)

```
research/
├── TRUTH Dimension (What is accurate)
│   ├── laws/                 # Primary legislation
│   ├── deadlines/            # Calendar facts
│   └── compliance/           # HMRC requirements
│
├── UNDERSTANDING Dimension (Who, What, How Much)
│   ├── entities/             # WHO files taxes
│   ├── tax-types/            # WHAT taxes exist
│   └── calculations/         # HOW MUCH to pay
│
├── BEAUTY Dimension (Clean Experience)
│   ├── filing-process/       # HOW to file
│   └── user-journeys/        # Experience flows
│
├── JUSTICE Dimension (Consequences)
│   ├── penalties/            # What happens if wrong
│   └── compliance/           # Proper adherence
│
└── CREATIVITY Dimension (Our Differentiation)
    ├── competitive/          # Market landscape
    ├── technical/            # Integration specs
    ├── market/               # User research
    └── product/              # Our innovation
```

---

## Research Sections

### 1. Entities (`entities/`)
**Question**: WHO needs to file taxes in the UK?

| Entity Type | Directory | Priority |
|-------------|-----------|----------|
| Individuals (employed) | `individuals/` | P1 |
| Sole Traders | `sole-traders/` | P1 |
| Limited Companies | `limited-companies/` | P2 |
| Partnerships | `partnerships/` | P2 |
| LLPs | `llps/` | P3 |
| Charities | `charities/` | P3 |
| Trusts | `trusts/` | P3 |
| Non-UK Residents | `non-residents/` | P3 |

### 2. Tax Types (`tax-types/`)
**Question**: WHAT taxes exist in the UK?

| Tax Type | Directory | Relevance |
|----------|-----------|-----------|
| Income Tax / Self Assessment | `income-tax/` | Core |
| VAT | `vat/` | Core |
| Corporation Tax | `corporation-tax/` | Core |
| PAYE | `paye/` | Core |
| National Insurance | `national-insurance/` | Core |
| Capital Gains Tax | `capital-gains-tax/` | Secondary |
| Dividend Tax | `dividend-tax/` | Secondary |
| Stamp Duty | `stamp-duty/` | Secondary |
| Inheritance Tax | `inheritance-tax/` | Tertiary |
| Business Rates | `business-rates/` | Tertiary |

### 3. Filing Process (`filing-process/`)
**Question**: HOW do you file taxes?

- `registration/` - Getting set up with HMRC
- `making-tax-digital/` - MTD requirements & transition
- `online-filing/` - Digital submission
- `paper-filing/` - Legacy processes
- `agent-authorization/` - Third-party access
- `record-keeping/` - What to retain
- `payment-methods/` - How to pay HMRC

### 4. Laws & Regulations (`laws/`)
**Question**: What are the RULES?

- `finance-acts/` - Primary legislation (annual)
- `statutory-instruments/` - Secondary legislation
- `hmrc-manuals/` - Official guidance
- `case-law/` - Tribunal & court decisions
- `anti-avoidance/` - GAAR, DOTAS, etc.
- `international-treaties/` - Double taxation, OECD

### 5. Deadlines (`deadlines/`)
**Question**: WHEN must things happen?

- `tax-year-calendar/` - 6 April - 5 April structure
- `filing-deadlines/` - By tax type
- `payment-deadlines/` - When money is due
- `quarterly-mtd/` - MTD quarterly updates
- `penalty-dates/` - When penalties kick in

### 6. Calculations (`calculations/`)
**Question**: HOW MUCH tax is owed?

- `tax-rates-bands/` - Current & historical rates
- `personal-allowances/` - Tax-free amounts
- `business-allowances/` - Capital allowances, etc.
- `reliefs-deductions/` - What reduces tax
- `exemptions/` - What's not taxed
- `special-schemes/` - EIS, SEIS, R&D credits

### 7. User Journeys (`user-journeys/`)
**Question**: What is the USER EXPERIENCE?

- `first-time-filers/` - Onboarding journey
- `annual-filers/` - Returning users
- `amendments-corrections/` - Fixing mistakes
- `appeals-disputes/` - Challenging HMRC
- `refunds/` - Getting money back

### 8. Compliance (`compliance/`)
**Question**: What must be ADHERED to?

- `hmrc-requirements/` - Statutory obligations
- `audit-risk/` - What triggers scrutiny
- `record-retention/` - How long to keep records
- `reporting-obligations/` - What must be reported

### 9. Penalties (`penalties/`)
**Question**: What are the CONSEQUENCES?

- `late-filing/` - Missing deadlines
- `late-payment/` - Not paying on time
- `inaccuracy/` - Errors in returns
- `failure-to-notify/` - Not registering
- `appeals/` - Challenging penalties

### 10. Competitive Analysis (`competitive/`)
**Question**: What EXISTS in the market?

- `uk-tax-software/` - FreeAgent, Xero, QuickBooks, etc.
- `hmrc-tools/` - Government offerings
- `accountancy-firms/` - Traditional competition
- `feature-comparison/` - Matrix of capabilities
- `pricing-analysis/` - Market pricing

### 11. Technical Integration (`technical/`)
**Question**: How do we INTEGRATE with HMRC?

- `hmrc-apis/` - API documentation
- `mtd-specifications/` - Making Tax Digital specs
- `data-formats/` - XML, JSON schemas
- `security-requirements/` - OAuth, encryption
- `authentication/` - Government Gateway

### 12. Market Research (`market/`)
**Question**: Who are our USERS?

- `demographics/` - Target segments
- `pain-points/` - User frustrations
- `pricing-models/` - Revenue strategies
- `go-to-market/` - Launch strategy
- `user-research/` - Interviews, surveys

---

## Research Workflow

### Phase 1: Foundation (Weeks 1-2)
1. [ ] Entities: Complete `sole-traders/` and `individuals/`
2. [ ] Tax Types: Complete `income-tax/` (Self Assessment)
3. [ ] Deadlines: Map complete tax calendar
4. [ ] Laws: Identify primary legislation

### Phase 2: Core Product (Weeks 3-4)
1. [ ] Filing Process: Document Self Assessment flow
2. [ ] Calculations: Tax rates, allowances, reliefs
3. [ ] User Journeys: First-time filer flow
4. [ ] Technical: HMRC API research

### Phase 3: Expansion (Weeks 5-6)
1. [ ] Tax Types: VAT, Corporation Tax
2. [ ] Entities: Limited companies, partnerships
3. [ ] Competitive: Full market analysis
4. [ ] Market: User research synthesis

### Phase 4: Compliance & Launch (Weeks 7-8)
1. [ ] Compliance: Full HMRC requirements
2. [ ] Penalties: Complete penalty regime
3. [ ] Technical: Integration specifications
4. [ ] Market: Go-to-market strategy

---

## File Naming Conventions

```
{topic}-{subtopic}.md           # Research documents
{topic}-sources.md              # Source links & references
{topic}-questions.md            # Open questions
{topic}-summary.md              # Executive summary
```

## Quality Standards

Each research document should include:
1. **Sources**: Cite HMRC, legislation, or authoritative source
2. **Last Updated**: Date of last verification
3. **Confidence Level**: High/Medium/Low
4. **Open Questions**: What still needs research
5. **Cross-References**: Links to related sections

---

## Key HMRC Resources

- [HMRC Website](https://www.gov.uk/government/organisations/hm-revenue-customs)
- [Self Assessment](https://www.gov.uk/self-assessment-tax-returns)
- [Making Tax Digital](https://www.gov.uk/making-tax-digital)
- [HMRC Manuals](https://www.gov.uk/hmrc-internal-manuals)
- [Tax Legislation](https://www.legislation.gov.uk/)
- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk/)

---

*Research architecture created: 2026-02-01*
*Framework: Purpose Prompter (PP)*
