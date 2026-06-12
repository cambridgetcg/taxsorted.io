# PP Path Builder: Comprehensive Filing Requirements Guide

> **PP Mode**: CREATIVITY (Building New Structure)
> **Date**: 2026-02-01
> **Project**: TaxSorted.io Filing Requirements Database

---

## Execution Status

> **Status**: ✅ COMPLETE (All 6 Waypoints Achieved)
> **Completed**: 2026-02-01

---

## Phase 1: Anchor Points

### 1.1 CURRENT STATE ASSESSMENT (Where Am I?)

```
PREVIOUS STATE (Before This Plan)
├── ✓ Entity profiles exist (legislation-by-entity/)
├── ✓ Each profile has basic "Filing Requirements" section
├── ✓ Tax returns mentioned (SA100, CT600, SA800, etc.)
├── ✓ Deadlines partially documented
├── ✗ NO comprehensive filing forms reference
├── ✗ NO complete deadline matrix
├── ✗ NO penalty structure documented
├── ✗ NO MTD requirements detailed
├── ✗ NO regulatory filings (CH, CC, FCA) consolidated
├── ✗ NO filing workflow diagrams
└── ✗ NO entity → all required filings single lookup

CURRENT STATE (After Execution)
├── ✓ Entity profiles exist (legislation-by-entity/)
├── ✓ Filing requirements directory complete
├── ✓ All HMRC forms documented (SA100, SA800, SA900, CT600, VAT100, PAYE)
├── ✓ All regulatory forms documented (CH, CC, FCA, CIC, TRS)
├── ✓ Deadline calculation rules documented
├── ✓ Penalty structure consolidated
├── ✓ MTD requirements documented
└── ✓ Entity → filings cross-reference matrix complete
```

**What Exists**:
- Scattered filing info across 16 entity profiles
- Basic form names (SA100, CT600, SA800, SA900)
- Some deadlines (31 January, 9 months + 1 day)

**What's Missing**:
- Single source of truth: "What does Entity X need to file, when, and where?"
- Complete form reference with all supplementary pages
- Penalty structure for late filing/payment
- MTD requirements and timeline
- Regulatory filings beyond HMRC (Companies House, Charity Commission, FCA)
- Filing frequency (annual, quarterly, ad-hoc)
- Electronic vs paper requirements

---

### 1.2 PURPOSE DEFINITION (Where Do I Want To Go?)

**Purpose Statement**: Create a comprehensive filing requirements database that answers "What must Entity X file, to whom, by when, how, and what happens if they don't?" for every UK legal entity type.

### Success Criteria (Measurable)

```markdown
## Definition of Done

1. [x] Every entity type has complete filing matrix ✓ (by-entity/filing-matrix.md)
2. [x] Every required form is documented with:
   - Form name and number ✓
   - Filing authority (HMRC, CH, CC, FCA) ✓
   - Deadline formula ✓
   - Submission method (online, paper, software) ✓
   - Supplementary pages required ✓
3. [x] Every deadline documented with:
   - Base calculation (end of tax year, accounting period end) ✓
   - Specific date formula ✓ (deadlines/deadline-rules.md)
   - Extension conditions (if any) ✓
4. [x] Penalty structure for each filing:
   - Late filing penalties ✓
   - Late payment penalties ✓
   - Interest rates ✓
   - Penalty mitigation/appeal ✓ (penalties/penalty-structure.md)
5. [x] MTD requirements documented:
   - Current mandates ✓
   - Future rollout timeline ✓
   - Software requirements ✓
   - Exemptions ✓ (mtd/mtd-requirements.md)
6. [x] Regulatory filings (non-HMRC) complete:
   - Companies House ✓ (confirmation-statement.md, annual-accounts.md)
   - Charity Commission ✓ (annual-return.md, charity-accounts.md)
   - FCA ✓ (fca-mutuals.md)
   - CIC Regulator ✓ (cic-report.md)
   - TRS ✓ (trs.md)
7. [x] Cross-reference matrices:
   - Entity → All filings lookup ✓ (by-entity/filing-matrix.md)
   - Filing → All entities lookup ✓ (included in matrix)
   - Calendar view (what's due each month) ✓ (deadlines/calendar-template.md)
```

---

## Phase 2: Waypoint Definition

```
CURRENT STATE ──> W1 ──> W2 ──> W3 ──> W4 ──> W5 ──> W6 ──> PURPOSE
                  │      │      │      │      │      │
              Structure Forms Regulator Deadlines Penalties MTD/X-Ref
                  ✓      ✓      ✓        ✓        ✓        ✓

ALL WAYPOINTS COMPLETE ✅
```

---

### W1: Directory Structure & Form Reference Template

**Predecessor**: Current State
**Successor**: W2

**What This Waypoint Achieves**:
- Establish directory structure for filing requirements
- Create template for documenting each form
- Create template for entity filing matrix

**Success Criteria**:
- [x] Directory structure created ✓
- [x] Form documentation template defined ✓ (_form-template.md)
- [x] Entity filing matrix template defined ✓

**Deliverables**:
```
research/uk/filing/
├── FILING_REQUIREMENTS_PLAN.md    # This file
├── README.md                       # Index and methodology
├── _form-template.md               # Template for each form
├── _entity-matrix-template.md      # Template for entity filing summary
│
├── forms/
│   ├── hmrc/
│   │   ├── sa100.md               # Individual SA return
│   │   ├── sa103.md               # Self-employment supplement
│   │   ├── sa104.md               # Partnership supplement
│   │   ├── sa800.md               # Partnership return
│   │   ├── sa900.md               # Trust return
│   │   ├── ct600.md               # Corporation Tax return
│   │   ├── vat100.md              # VAT return
│   │   ├── p11d.md                # Benefits in kind
│   │   ├── p60.md                 # Employee year-end certificate
│   │   └── paye-rti.md            # Real Time Information
│   │
│   ├── companies-house/
│   │   ├── confirmation-statement.md
│   │   ├── annual-accounts.md
│   │   ├── aa01-change-accounting-date.md
│   │   └── other-filings.md
│   │
│   ├── charity-commission/
│   │   ├── annual-return.md
│   │   ├── charity-accounts.md
│   │   └── serious-incident-report.md
│   │
│   └── other-regulators/
│       ├── fca-annual-return.md   # Co-operatives
│       ├── cic-report.md          # CIC annual report
│       └── trs-registration.md    # Trust Registration Service
│
├── by-entity/
│   ├── individual-employed.md
│   ├── individual-self-employed.md
│   ├── partnership-general.md
│   ├── partnership-limited.md
│   ├── partnership-scottish.md
│   ├── company-ltd.md
│   ├── company-llp.md
│   ├── charity-company.md
│   ├── charity-cio.md
│   ├── trust-bare.md
│   ├── trust-discretionary.md
│   ├── trust-iip.md
│   ├── special-cic.md
│   ├── special-cooperative.md
│   ├── investment-reit.md
│   └── investment-vct.md
│
├── deadlines/
│   ├── calendar-overview.md        # Month-by-month what's due
│   ├── calculation-rules.md        # How deadlines are calculated
│   └── extension-rules.md          # When extensions apply
│
├── penalties/
│   ├── late-filing.md              # Filing penalties by form
│   ├── late-payment.md             # Payment penalties + interest
│   └── penalty-appeals.md          # Reasonable excuse, mitigation
│
├── mtd/
│   ├── mtd-overview.md             # Making Tax Digital overview
│   ├── mtd-vat.md                  # MTD for VAT (current)
│   ├── mtd-itsa.md                 # MTD for Income Tax (coming)
│   └── mtd-ct.md                   # MTD for Corporation Tax (future)
│
└── cross-reference/
    ├── entity-to-filings.md        # Entity → All filings lookup
    ├── filing-to-entities.md       # Filing → All entities lookup
    └── annual-calendar.md          # Calendar view
```

---

### W2: HMRC Tax Return Forms

**Predecessor**: W1
**Successor**: W3

**What This Waypoint Achieves**:
- Document all primary HMRC tax return forms
- Include supplementary pages and schedules
- Cross-reference to entity types

**Success Criteria**:
- [x] SA100 (Individual) complete with all supplements ✓
- [x] SA800 (Partnership) complete ✓
- [x] SA900 (Trust) complete ✓
- [x] CT600 (Corporation Tax) complete with schedules ✓
- [x] VAT100 complete ✓
- [x] PAYE forms (P11D, P60, RTI) complete ✓

**Forms to Document**:

| Form | Entity Types | Priority |
|------|--------------|----------|
| SA100 | Individuals (self-employed, directors, high earners) | High |
| SA103 | Self-employed supplement | High |
| SA104 | Partnership supplement | High |
| SA105 | Property income supplement | Medium |
| SA106 | Foreign income supplement | Medium |
| SA108 | Capital gains supplement | Medium |
| SA800 | Partnership return | High |
| SA900 | Trust return | High |
| CT600 | All companies | High |
| CT600A-L | CT600 supplementary pages | High |
| VAT100 | VAT registered entities | High |
| P11D | Employers (benefits) | High |
| P60 | Employers (employee certificates) | High |
| RTI | Employers (payroll) | High |

---

### W3: Regulatory Filings (Non-HMRC)

**Predecessor**: W2
**Successor**: W4

**What This Waypoint Achieves**:
- Document Companies House filings
- Document Charity Commission filings
- Document FCA filings (co-operatives)
- Document CIC Regulator filings
- Document TRS (Trust Registration Service)

**Success Criteria**:
- [x] Companies House: confirmation statement, accounts, changes ✓
- [x] Charity Commission: annual return, accounts, reporting ✓
- [x] FCA: co-operative annual return ✓
- [x] CIC Regulator: CIC report ✓
- [x] TRS: trust registration and updates ✓

**Filings to Document**:

| Regulator | Filing | Entity Types |
|-----------|--------|--------------|
| Companies House | Confirmation statement | Ltd, LLP, CIC |
| Companies House | Annual accounts | Ltd, LLP, CIC |
| Companies House | Change filings (directors, PSC) | Ltd, LLP, CIC |
| Charity Commission | Annual return | Charities (income >£10k) |
| Charity Commission | Accounts | Charities (income >£25k) |
| Charity Commission | Serious incident report | All charities |
| FCA | Annual return | Co-operatives, CBS |
| CIC Regulator | CIC Report | CICs |
| HMRC/TRS | Trust registration | All express trusts |
| HMRC/TRS | Annual updates | Registered trusts |

---

### W4: Deadline Calculation Rules

**Predecessor**: W3
**Successor**: W5

**What This Waypoint Achieves**:
- Document deadline calculation formulas
- Create calendar overview
- Document extension rules

**Success Criteria**:
- [x] Every form has deadline formula documented ✓
- [x] Calendar overview shows monthly obligations ✓
- [x] Extension rules documented ✓

**Deadline Types to Document**:

| Deadline Type | Formula | Examples |
|---------------|---------|----------|
| **Tax year based** | Fixed dates relative to 5 April | SA100: 31 Jan following |
| **Accounting period based** | X months after period end | CT600: 12 months after |
| **Payment based** | Different from filing | CT payment: 9 months + 1 day |
| **Quarterly** | Every 3 months | VAT, MTD ITSA |
| **Event triggered** | X days after event | P11D: 6 July after tax year |
| **Registration based** | X days after registration | VAT: first return period |

---

### W5: Penalty Structure

**Predecessor**: W4
**Successor**: W6

**What This Waypoint Achieves**:
- Document late filing penalties for each form
- Document late payment penalties and interest
- Document penalty appeals and reasonable excuse

**Success Criteria**:
- [x] Filing penalties: fixed + daily + percentage ✓
- [x] Payment penalties: initial + 5% + 10% ✓
- [x] Interest rates documented ✓
- [x] Reasonable excuse criteria ✓
- [x] Appeal process ✓

**Penalty Categories**:

| Category | Structure | Source |
|----------|-----------|--------|
| SA100 late filing | £100 → +£10/day → +5% → +5% | TMA 1970 s.93 |
| CT600 late filing | £100 → £200 → 10% → 20% | FA 1998 Sch.18 |
| VAT late filing | Points-based (from 2023) | FA 2021 |
| Late payment | 5% at 30 days, +5% at 6 months, +5% at 12 months | FA 2009 |
| Interest | Bank Rate + 2.5% | SI (updated) |

---

### W6: MTD Requirements & Cross-Reference

**Predecessor**: W5
**Successor**: PURPOSE

**What This Waypoint Achieves**:
- Document MTD for VAT (current)
- Document MTD for Income Tax (coming April 2026)
- Document MTD for CT (future)
- Create all cross-reference matrices

**Success Criteria**:
- [x] MTD VAT requirements complete ✓
- [x] MTD ITSA requirements complete (with timeline) ✓
- [x] MTD CT requirements noted (future) ✓
- [x] Entity → All filings matrix complete ✓
- [x] Filing → All entities matrix complete ✓
- [x] Annual calendar complete ✓

**MTD Timeline**:

| MTD Mandate | Go-Live | Applies To |
|-------------|---------|------------|
| MTD for VAT | April 2019 | VAT registered (>£85k) |
| MTD for VAT (all) | April 2022 | All VAT registered |
| MTD for ITSA | April 2026 | Self-employed/landlords >£50k |
| MTD for ITSA (phase 2) | April 2027 | Self-employed/landlords >£30k |
| MTD for CT | TBC | Companies |

---

## Phase 3: Research Areas

### HMRC Sources

| Topic | Source | URL |
|-------|--------|-----|
| SA forms | GOV.UK | gov.uk/self-assessment-forms-and-helpsheets |
| CT600 | GOV.UK | gov.uk/company-tax-returns |
| VAT | GOV.UK | gov.uk/vat-returns |
| Penalties | GOV.UK | gov.uk/tax-appeals |
| MTD | GOV.UK | gov.uk/making-tax-digital |

### Legislation

| Topic | Source |
|-------|--------|
| Filing requirements | TMA 1970 |
| Penalties (SA) | TMA 1970 s.93, Sch.55 |
| Penalties (CT) | FA 1998 Sch.18 |
| Penalties (VAT) | FA 2021 (new regime) |
| Interest | FA 2009 s.101 |

### Regulator Sources

| Regulator | Source |
|-----------|--------|
| Companies House | gov.uk/government/organisations/companies-house |
| Charity Commission | gov.uk/government/organisations/charity-commission |
| FCA (Mutuals) | fca.org.uk/firms/mutuals |
| CIC Regulator | gov.uk/government/organisations/office-of-the-regulator-of-community-interest-companies |

---

## Phase 4: Execution Plan

### Waypoint Execution Order

| Waypoint | Description | Dependencies |
|----------|-------------|--------------|
| **W1** | Structure & templates | None |
| **W2** | HMRC tax forms | W1 |
| **W3** | Regulatory filings | W1 |
| **W4** | Deadlines | W2, W3 |
| **W5** | Penalties | W4 |
| **W6** | MTD & cross-reference | W2, W3, W4, W5 |

### Parallel Execution

W2 and W3 can run in parallel after W1.

```
W1 ──┬──> W2 (HMRC forms) ──┬──> W4 (Deadlines) ──> W5 (Penalties) ──> W6 (MTD/X-ref)
     │                      │
     └──> W3 (Regulatory) ──┘
```

---

## Definition of Done

The Filing Requirements Guide is complete when:

1. **Every entity** has a single-page summary showing:
   - All required filings
   - All deadlines
   - All regulators involved

2. **Every form** has documentation showing:
   - What it is
   - Who files it
   - When it's due
   - How to file
   - Penalties for failure

3. **Cross-references** enable:
   - Start with entity → see all filings
   - Start with form → see all entities
   - Start with month → see all deadlines

4. **MTD requirements** are clear for:
   - Current mandates
   - Future rollout
   - Exemptions

5. **Penalties** are documented with:
   - Amounts
   - Escalation
   - Appeals process

---

*Plan created: 2026-02-01*
*PP Mode: CREATIVITY (Waypoint System)*
