# PP Path Builder: Tax Legislation Tracking by Entity Type

> **PP Mode**: CREATIVITY (Uncharted Territory)
> **Date**: 2026-02-01
> **Project**: TaxSorted.io Legislative Database

---

## Phase 1: Anchor Points

### 1.1 CURRENT STATE ASSESSMENT (Where Am I?)

```
CURRENT STATE
├── ✓ Research architecture exists (research/)
├── ✓ Entity taxonomy defined (entities/README.md)
├── ✓ Historical origins documented (entities/historical-origins.md)
├── ✓ Key amendments timeline exists (laws/key-amendments-timeline.md)
├── ✓ Finance Act process documented (laws/finance-acts/legislative-process.md)
├── ✗ NO systematic legislation-to-entity mapping
├── ✗ NO point-in-time version tracking
├── ✗ NO consolidated amendment history per entity
└── ✗ NO original vs current text comparison
```

**What Works**:
- Entity types identified (Individual, Sole Trader, Partnership, Ltd Company, LLP, Charity, Trust, Special Forms)
- Historical legislation timeline exists
- Finance Act process understood

**What's Missing**:
- Systematic mapping: "Which sections of which Acts apply to Entity X?"
- Version tracking: Original text → each amendment → current text
- Point-in-time database: "What was the law for Entity X on Date Y?"

---

### 1.2 PURPOSE DEFINITION (Where Do I Want To Go?)

**Purpose Statement**: Create a comprehensive legislative database that maps every UK legal entity type to its relevant tax legislation, tracks all amendments from original enactment to present, and enables point-in-time queries.

### Success Criteria (Measurable)

```markdown
## Definition of Done

1. [ ] Every entity type has a dedicated legislation profile
2. [ ] Each profile lists ALL relevant Acts and sections
3. [ ] Each relevant section has:
   - Original enacted text
   - Every amendment (date, source Act, change)
   - Current text
4. [ ] Point-in-time queries possible: "What applied to [entity] on [date]?"
5. [ ] Cross-references between entities complete
6. [ ] Machine-readable format (structured data)
7. [ ] Human-readable summaries
```

### Capabilities Required
- Extract legislation from legislation.gov.uk
- Track section-level amendments
- Map entities to relevant provisions
- Present before/after comparisons

### Out of Scope (Explicitly)
- Case law analysis (separate project)
- Non-UK legislation
- Detailed HMRC guidance tracking (separate project)

---

## Phase 2: Territory Assessment

### Gate 0: Territory Check

```
IS THIS UNCHARTED?

Search attempts:
├── "entity legislation mapping" in codebase: 0 results
├── "CTA tracking" in codebase: 0 results
├── "point-in-time" in codebase: 0 results
├── "version history" in laws/: 0 results
└── Near-miss: key-amendments-timeline.md (list only, no full text)

VERDICT: ✓ UNCHARTED TERRITORY
         No systematic CTA-to-entity mapping exists
         key-amendments-timeline.md is close but doesn't include:
         - Full section text
         - Entity-specific mapping
         - Point-in-time versions
```

**→ CREATIVITY MODE ENGAGED**

---

## Phase 3: Entity-to-Legislation Mapping (TRUTH)

### 3.1 Master Entity List

| Entity Type | Primary Tax Treatment | Key Acts |
|-------------|----------------------|----------|
| **Individual (Employed)** | PAYE, Income Tax | ITA 2007, ITEPA 2003, TMA 1970 |
| **Individual (Self-Employed / Sole Trader)** | Income Tax, Class 2/4 NI | ITA 2007, ITTOIA 2005, TMA 1970 |
| **Partnership** | Tax-transparent | ITA 2007, ITTOIA 2005, Partnership Act 1890 |
| **Scottish Partnership** | Tax-transparent + legal personality | ITA 2007, ITTOIA 2005, Partnership Act 1890 s.4(2) |
| **Limited Partnership** | Tax-transparent | ITA 2007, ITTOIA 2005, LP Act 1907 |
| **Limited Company** | Corporation Tax | CTA 2009, CTA 2010, CA 2006 |
| **LLP** | Tax-transparent (usually) | ITA 2007, ITTOIA 2005, LLP Act 2000 |
| **Charity** | Exempt (conditions) | CTA 2010 Part 11, ITA 2007, Charities Act 2011 |
| **CIO** | Exempt (charity) | CTA 2010 Part 11, Charities Act 2011 |
| **CIC** | Corporation Tax (NOT exempt) | CTA 2009, CTA 2010, CA 2006 |
| **Trust** | Income Tax / CGT | ITA 2007, TCGA 1992, IHTA 1984, Trustee Act 2000 |
| **Cooperative / CBS** | Corp Tax (exempt if charitable) | CTA 2010, Co-op & CBS Act 2014 |
| **Building Society** | Corporation Tax | CTA 2010, Building Societies Act 1986 |
| **Friendly Society** | Partial exemption | CTA 2010, Friendly Societies Act 1992 |
| **REIT** | Exempt on qualifying income | CTA 2010 Part 12 |
| **VCT** | Tax reliefs for investors | ITA 2007 Part 6 |

### 3.2 Consolidated Tax Acts (CTAs) - The Core Legislation

```
UK TAX LEGISLATION ARCHITECTURE
═══════════════════════════════

INCOME TAX (Individuals, Partnerships, Trusts)
├── Income Tax Act 2007 (ITA 2007)
│   ├── Part 2: Basic provisions (rates, allowances)
│   ├── Part 3: Personal reliefs
│   ├── Part 4: Loss relief
│   ├── Part 5: Enterprise investment schemes (EIS, VCT, SEIS)
│   ├── Part 6: VCT reliefs
│   └── Part 14: Deduction of tax at source
│
├── Income Tax (Earnings and Pensions) Act 2003 (ITEPA 2003)
│   ├── Part 2: Employment income
│   ├── Part 3: Employment income: earnings and benefits
│   ├── Part 9: Pension income
│   └── Part 11: PAYE
│
├── Income Tax (Trading and Other Income) Act 2005 (ITTOIA 2005)
│   ├── Part 2: Trading income
│   ├── Part 3: Property income
│   ├── Part 4: Savings and investment income
│   └── Part 5: Miscellaneous income

CORPORATION TAX (Companies, LLPs taxed as companies)
├── Corporation Tax Act 2009 (CTA 2009)
│   ├── Part 3: Trading income
│   ├── Part 4: Property income
│   ├── Part 5: Loan relationships
│   ├── Part 6: Relationships treated as loan relationships
│   ├── Part 7: Derivative contracts
│   └── Part 8: Intangible fixed assets
│
├── Corporation Tax Act 2010 (CTA 2010)
│   ├── Part 2: Charge to corporation tax
│   ├── Part 3: Companies with small profits
│   ├── Part 4: Loss relief
│   ├── Part 5: Group relief
│   ├── Part 8: Oil activities
│   ├── Part 11: Charitable companies (EXEMPT)
│   ├── Part 12: Real Estate Investment Trusts (REITs)
│   └── Part 24: Community investment tax relief

CAPITAL GAINS TAX
├── Taxation of Chargeable Gains Act 1992 (TCGA 1992)
│   ├── Part I: General provisions
│   ├── Part II: Assets (what's chargeable)
│   ├── Part III: Individuals, partnerships, settlements
│   ├── Part IV: Shares and securities
│   └── Part V: Transfer of business assets (rollover etc)

INHERITANCE TAX
├── Inheritance Tax Act 1984 (IHTA 1984)
│   ├── Part I: General
│   ├── Part II: Exempt transfers
│   ├── Part III: Settlements
│   └── Part V: Miscellaneous reliefs

VALUE ADDED TAX
├── Value Added Tax Act 1994 (VATA 1994)
│   ├── Part I: Charge to VAT
│   ├── Schedule 1: Registration
│   ├── Schedule 8: Zero-rating
│   └── Schedule 9: Exemptions

TAX ADMINISTRATION
├── Taxes Management Act 1970 (TMA 1970)
│   ├── Part I: Returns
│   ├── Part II: Assessments
│   ├── Part IV: Collection and recovery
│   ├── Part V: Appeals
│   └── Part IX: Interest on overdue tax
```

---

## Phase 4: Waypoint Definition

### The Path

```
CURRENT ──► W1 ──► W2 ──► W3 ──► W4 ──► W5 ──► W6 ──► PURPOSE
  │          │      │      │      │      │      │         │
  0%       15%    30%    50%    65%    80%    95%      100%

W1: Structure     (Create directory architecture)
W2: Individual    (Complete individual/sole trader mapping)
W3: Company       (Complete company/LLP mapping)
W4: Partnership   (Complete partnership mapping)
W5: Special       (Complete special entities: Charity, Trust, CIC, CIO, etc.)
W6: Cross-ref     (Cross-references, validation, machine-readable export)
```

---

### Waypoint W1: Directory Structure & Template

**Achieves**: Establishes the architecture for all subsequent work

**Success Criteria**:
- [ ] Directory structure created
- [ ] Template file defined
- [ ] First example completed (proof of concept)

**Deliverables**:
```
research/laws/legislation-by-entity/
├── README.md                    # Index and methodology
├── _template.md                 # Template for each entity
│
├── individual/
│   ├── employed.md              # PAYE workers
│   └── self-employed.md         # Sole traders
│
├── partnership/
│   ├── general.md               # General partnership
│   ├── limited.md               # LP
│   └── scottish.md              # Scottish LP/partnership
│
├── company/
│   ├── limited.md               # Ltd company
│   ├── plc.md                   # Public company
│   └── llp.md                   # LLP
│
├── charity/
│   ├── charitable-company.md
│   ├── cio.md
│   └── unincorporated.md
│
├── trust/
│   ├── bare.md
│   ├── interest-in-possession.md
│   ├── discretionary.md
│   └── non-resident.md
│
├── special/
│   ├── cic.md                   # Community Interest Company
│   ├── cooperative.md           # Cooperative / CBS
│   ├── building-society.md
│   ├── friendly-society.md
│   └── unincorporated-assoc.md
│
├── investment/
│   ├── reit.md
│   ├── vct.md
│   └── oeic-unit-trust.md
│
└── cross-reference/
    ├── entity-to-sections.md    # Quick lookup
    └── section-to-entities.md   # Reverse lookup
```

---

### Waypoint W2: Individual / Sole Trader

**Achieves**: Complete legislative mapping for most common entity types

**Relevant Legislation**:
| Act | Key Sections | Applies To |
|-----|--------------|------------|
| **ITA 2007** | s.1-6 (charge), s.10-21 (rates), s.35-46 (personal allowances) | All individuals |
| **ITEPA 2003** | Part 2-3 (employment income), Part 11 (PAYE) | Employed |
| **ITTOIA 2005** | Part 2 (trading income), Part 3 (property) | Self-employed |
| **TMA 1970** | s.8 (returns), s.9 (assessments), Schedule | All |
| **TCGA 1992** | Part I, III | All (on disposals) |

**Sections to Track (Example - ITA 2007 s.35 Personal Allowance)**:
```
SECTION: ITA 2007, Section 35 - Personal Allowance

ORIGINAL (6 April 2007):
"An individual who makes a claim is entitled to a personal
allowance of £5,035 for a tax year if the individual—
(a) is under the age of 65 throughout the tax year, and
(b) meets the requirements of section 56 (residence etc)."

AMENDMENT 1 (Finance Act 2008):
- Amount changed: £5,035 → £6,035

AMENDMENT 2 (Finance Act 2009):
- Added: High income taper (s.35(2))
- Amount: £6,475

[... continue for each amendment ...]

AMENDMENT N (Finance Act 2021):
- Amount: £12,570
- Frozen until 2025-26

CURRENT (as at 2026-02-01):
"An individual who makes a claim is entitled to a personal
allowance of £12,570 for a tax year if the individual meets
the requirements of section 56 (residence etc)."

POINT-IN-TIME LOOKUP:
- 2010-04-06: £6,475
- 2015-04-06: £10,600
- 2020-04-06: £12,500
- 2024-04-06: £12,570
```

---

### Waypoint W3: Company / LLP

**Relevant Legislation**:
| Act | Key Sections | Applies To |
|-----|--------------|------------|
| **CTA 2009** | Part 3 (trading), Part 5 (loan relationships) | All companies |
| **CTA 2010** | s.3 (rate), Part 3 (small profits), Part 5 (groups) | All companies |
| **CA 2006** | Filing, directors, accounts | All companies |
| **TMA 1970** | Schedule 18 (CT returns) | All companies |

---

### Waypoint W4: Partnership

**Relevant Legislation**:
| Act | Key Sections | Applies To |
|-----|--------------|------------|
| **Partnership Act 1890** | s.1-4 (definition), s.4(2) (Scottish) | All partnerships |
| **ITA 2007** | s.848-850 (allocation of profits) | Tax treatment |
| **ITTOIA 2005** | Part 2 (trading) | Partnership trading |
| **LP Act 1907** | All | Limited partnerships |

---

### Waypoint W5: Special Entities

**Charity**:
| Act | Key Sections |
|-----|--------------|
| **CTA 2010** | Part 11 (exemptions) |
| **ITA 2007** | s.521-537 (income exemptions) |
| **Charities Act 2011** | Definition, registration |
| **TCGA 1992** | s.256 (exemption) |

**Trust**:
| Act | Key Sections |
|-----|--------------|
| **ITA 2007** | s.479-517 (trust rates) |
| **TCGA 1992** | Part III (settlements) |
| **IHTA 1984** | Part III (settlements) |

**CIC** (NOT exempt - taxed as company):
| Act | Key Sections |
|-----|--------------|
| **CTA 2009/2010** | Standard company provisions |
| **CA 2006** | Company provisions |
| **CIC Regulations 2005** | Specific CIC rules |

**REIT**:
| Act | Key Sections |
|-----|--------------|
| **CTA 2010** | Part 12 (ss.518-609) |

---

### Waypoint W6: Cross-Reference & Validation

**Entity → Sections Matrix**:
| Entity | ITA 2007 | ITEPA 2003 | ITTOIA 2005 | CTA 2009 | CTA 2010 | TCGA 1992 |
|--------|----------|------------|-------------|----------|----------|-----------|
| Individual (employed) | ✓ | ✓ | - | - | - | ✓ |
| Sole Trader | ✓ | - | ✓ | - | - | ✓ |
| Partnership | ✓ | - | ✓ | - | - | ✓ |
| Ltd Company | - | - | - | ✓ | ✓ | ✓ |
| LLP | ✓/- | - | ✓/- | ✓/- | ✓/- | ✓ |
| Charity | ✓ (exempt) | - | - | - | ✓ (exempt) | ✓ (exempt) |
| Trust | ✓ | - | ✓ | - | - | ✓ |

---

## Phase 5: Template Definition

### Entity Legislation Profile Template

```markdown
# [Entity Type]: Legislative Profile

> **Last Updated**: [date]
> **Confidence**: [High/Medium/Low]

---

## Overview

| Aspect | Detail |
|--------|--------|
| **Legal Form** | [Incorporated/Unincorporated] |
| **Tax Personality** | [Separate/Transparent] |
| **Primary Tax** | [Income Tax/Corporation Tax] |
| **CGT Applicable** | [Yes/No/Exempt] |
| **VAT Applicable** | [Standard rules/Exempt/Partial] |

---

## Relevant Legislation

### Primary Acts

| Act | Key Sections | Purpose |
|-----|--------------|---------|
| [Act Name] | [Section numbers] | [What it governs] |

### Secondary Legislation (SIs)

| SI | Purpose |
|----|---------|
| [SI Name] | [What it implements] |

---

## Section-by-Section Analysis

### [Act Name], Section [X]: [Title]

**Original (enacted [date])**:
> "[Full original text]"

**Amendments**:

| Date | Amending Act | Change |
|------|--------------|--------|
| [date] | [FA year] | [description of change] |

**Current (as at [date])**:
> "[Full current text]"

**Point-in-Time Versions**:
| Date | Value/Text |
|------|------------|
| [date] | [version] |

---

## Cross-References

### Related Entity Types
- [Entity] - [relationship]

### Related Sections
- [Section] - [why related]

---

## Sources

- [legislation.gov.uk links]
- [HMRC manual references]
```

---

## Phase 6: Execution Plan

### Light-Ahead Loop for Each Waypoint

```
FOR EACH WAYPOINT:

1. ASSESS
   └─ What legislation.gov.uk sections need extracting?
   └─ What point-in-time versions exist?

2. RESEARCH
   └─ Fetch original enacted version
   └─ Fetch all amendments (from FA provisions)
   └─ Fetch current version
   └─ Cross-reference HMRC manuals

3. BUILD
   └─ Create entity profile using template
   └─ Document each section with full history
   └─ Create point-in-time lookup table

4. VALIDATE
   └─ Verify against legislation.gov.uk
   └─ Check cross-references complete
   └─ Test point-in-time queries

5. CAPTURE
   └─ Update cross-reference matrices
   └─ Document any gotchas discovered
```

---

## Phase 7: Data Sources

### Primary Sources

| Source | URL | Use |
|--------|-----|-----|
| **legislation.gov.uk** | legislation.gov.uk | Official text, point-in-time |
| **UK Parliament** | bills.parliament.uk | Finance Act amendments |
| **HMRC Manuals** | gov.uk/hmrc-internal-manuals | Interpretation |

### Automation Potential

```
FUTURE: API/Scraping for legislation.gov.uk

URL Pattern for point-in-time:
https://www.legislation.gov.uk/ukpga/[YEAR]/[CHAPTER]/section/[NUMBER]/[DATE]

Examples:
- ITA 2007 s.35 (current): /ukpga/2007/3/section/35
- ITA 2007 s.35 (2019):    /ukpga/2007/3/section/35/2019-04-06
- ITA 2007 s.35 (enacted): /ukpga/2007/3/section/35/enacted

Amendment notes available in each page's "Changes to legislation" section
```

---

## Creativity Gates Verification

| Gate | Status | Evidence |
|------|--------|----------|
| **G0: Territory** | ✓ UNCHARTED | No existing entity-to-CTA mapping in codebase |
| **G1: Pioneering** | ✓ PASS | Genuinely new - no systematic tracking exists |
| **G2: Path-Building** | ✓ PASS | Template defined, others can follow |
| **G3: Extension** | ✓ PASS | Connects to existing laws/, entities/ |
| **G4: Vision** | ✓ PASS | Clear purpose: point-in-time entity-legislation queries |
| **G5: Foundation** | ✓ PASS | Enables future TaxSorted app features |
| **G6: Integration** | ✓ PASS | Bridges entities/ and laws/ directories |

---

## Progress Tracking

| Waypoint | Status | Completion |
|----------|--------|------------|
| W1: Structure | ☐ Pending | 0% |
| W2: Individual/Sole Trader | ☐ Pending | 0% |
| W3: Company/LLP | ☐ Pending | 0% |
| W4: Partnership | ☐ Pending | 0% |
| W5: Special Entities | ☐ Pending | 0% |
| W6: Cross-Reference | ☐ Pending | 0% |
| **OVERALL** | | **0%** |

---

## Next Action

**W1: Create Directory Structure**
1. Create `research/laws/legislation-by-entity/` directory tree
2. Create `_template.md` with full template
3. Create one proof-of-concept: `individual/self-employed.md` with ITA 2007 s.35

---

*Plan Created: 2026-02-01*
*PP Mode: Creativity (Path Builder)*
*Ready for Waypoint W1 execution*
