# Tax Legislation by Entity: UK Tax Acts Mapped to Legal Entities

> **PP Dimension**: TRUTH
> **Purpose**: Map every UK legal entity type to its relevant tax legislation with full amendment history
> **Last Updated**: 2026-02-01

---

## Overview

This directory contains comprehensive legislative profiles for each UK legal entity type, documenting:

1. **Which Acts apply** - The specific tax legislation governing each entity
2. **Which sections matter** - The key provisions for each entity type
3. **Original text** - How the law read when first enacted
4. **All amendments** - Every change made via Finance Acts and SIs
5. **Current text** - The law as it stands today
6. **Point-in-time lookup** - What the law was on any given date

---

## Directory Structure

```
legislation-by-entity/
├── README.md                    # This file
├── _template.md                 # Template for entity profiles
│
├── individual/
│   ├── employed.md              ✓ PAYE employees
│   └── self-employed.md         ✓ Sole traders
│
├── partnership/
│   ├── general.md               ✓ General partnerships (E&W)
│   ├── limited.md               ✓ Limited partnerships
│   └── scottish.md              ✓ Scottish partnerships (separate personality)
│
├── company/
│   ├── limited-private.md       ✓ Private limited companies
│   ├── limited-public.md        ○ PLCs (planned)
│   └── llp.md                   ✓ Limited Liability Partnerships
│
├── charity/
│   ├── charitable-company.md    ✓ Company limited by guarantee (charitable)
│   ├── cio.md                   ✓ Charitable Incorporated Organisation
│   └── unincorporated.md        ○ Unincorporated charities (planned)
│
├── trust/
│   ├── bare.md                  ✓ Bare trusts
│   ├── interest-in-possession.md ✓
│   ├── discretionary.md         ✓
│   └── non-resident.md          ○ (planned)
│
├── special/
│   ├── cic.md                   ✓ Community Interest Company
│   ├── cooperative.md           ✓ Cooperatives & CBS
│   ├── building-society.md      ○ (planned)
│   ├── friendly-society.md      ○ (planned)
│   └── unincorporated-assoc.md  ○ Clubs, societies (planned)
│
├── investment/
│   ├── reit.md                  ✓ Real Estate Investment Trust
│   ├── vct.md                   ✓ Venture Capital Trust
│   └── oeic-unit-trust.md       ○ Collective investments (planned)
│
└── cross-reference/
    ├── entity-to-sections.md    ✓ Entity → Legislation lookup
    ├── section-to-entities.md   ✓ Legislation → Entity lookup
    └── amendment-timeline.md    ○ Chronological all amendments (planned)
```

**Legend**: ✓ = Complete | ○ = Planned

---

## Quick Reference: Primary Legislation by Entity

| Entity Type | Income Tax | Corp Tax | CGT | IHT | VAT |
|-------------|------------|----------|-----|-----|-----|
| **Individual (employed)** | ITA 2007, ITEPA 2003 | - | TCGA 1992 | IHTA 1984 | VATA 1994 |
| **Sole Trader** | ITA 2007, ITTOIA 2005 | - | TCGA 1992 | IHTA 1984 | VATA 1994 |
| **Partnership** | ITA 2007, ITTOIA 2005 | - | TCGA 1992 | IHTA 1984 | VATA 1994 |
| **Ltd Company** | - | CTA 2009, CTA 2010 | TCGA 1992 | - | VATA 1994 |
| **LLP** | ITA 2007* | CTA 2010* | TCGA 1992 | - | VATA 1994 |
| **Charity** | ITA 2007 (exempt) | CTA 2010 Pt.11 (exempt) | TCGA 1992 (exempt) | IHTA 1984 (exempt) | VATA 1994 (partial) |
| **Trust** | ITA 2007 | - | TCGA 1992 | IHTA 1984 | VATA 1994 |
| **CIC** | - | CTA 2009, CTA 2010 | TCGA 1992 | - | VATA 1994 |
| **REIT** | - | CTA 2010 Pt.12 | TCGA 1992 | - | VATA 1994 |

*LLPs are generally tax-transparent (members taxed) but can be taxed as companies in certain circumstances.

---

## Key Consolidated Tax Acts

### Income Tax (Individuals, Partnerships, Trusts)

| Act | Abbreviation | Year | Chapters | Key Content |
|-----|--------------|------|----------|-------------|
| Income Tax Act | **ITA 2007** | 2007 c.3 | 1034 | Charge, rates, allowances, reliefs |
| Income Tax (Earnings and Pensions) Act | **ITEPA 2003** | 2003 c.1 | 725 | Employment income, benefits, PAYE |
| Income Tax (Trading and Other Income) Act | **ITTOIA 2005** | 2005 c.5 | 883 | Trading, property, savings income |

### Corporation Tax (Companies)

| Act | Abbreviation | Year | Chapters | Key Content |
|-----|--------------|------|----------|-------------|
| Corporation Tax Act | **CTA 2009** | 2009 c.4 | 1329 | Trading income, loan relationships |
| Corporation Tax Act | **CTA 2010** | 2010 c.4 | 1181 | Charge, rates, reliefs, groups |

### Capital Gains Tax

| Act | Abbreviation | Year | Chapters | Key Content |
|-----|--------------|------|----------|-------------|
| Taxation of Chargeable Gains Act | **TCGA 1992** | 1992 c.12 | 290 | CGT charge, computation, reliefs |

### Inheritance Tax

| Act | Abbreviation | Year | Chapters | Key Content |
|-----|--------------|------|----------|-------------|
| Inheritance Tax Act | **IHTA 1984** | 1984 c.51 | 272 | IHT charge, settlements, reliefs |

### VAT

| Act | Abbreviation | Year | Chapters | Key Content |
|-----|--------------|------|----------|-------------|
| Value Added Tax Act | **VATA 1994** | 1994 c.23 | 97 + Scheds | VAT charge, registration, rates |

### Administration

| Act | Abbreviation | Year | Chapters | Key Content |
|-----|--------------|------|----------|-------------|
| Taxes Management Act | **TMA 1970** | 1970 c.9 | 119 | Returns, assessments, appeals |

---

## How to Use This Resource

### 1. Find Legislation for an Entity

→ Go to the relevant entity folder (e.g., `individual/self-employed.md`)
→ See "Relevant Legislation" section for all applicable Acts and sections

### 2. Find Historical Version of a Section

→ Find the entity profile
→ Locate the section in "Section-by-Section Analysis"
→ Use "Point-in-Time Lookup" table to find the version for any date

### 3. Trace All Amendments to a Section

→ Find the section in the entity profile
→ See "Amendment History" table for chronological changes
→ Each amendment cites the Finance Act provision that made the change

### 4. Cross-Reference Between Entities

→ Use `cross-reference/entity-to-sections.md` to find all entities affected by a section
→ Use `cross-reference/section-to-entities.md` to find all sections for an entity

---

## Methodology

### Sources

1. **Primary**: [legislation.gov.uk](https://www.legislation.gov.uk/) - Official UK legislation
2. **Point-in-time**: legislation.gov.uk "Point in Time" feature
3. **Amendments**: Finance Act provisions + legislation.gov.uk "Changes to legislation"
4. **Interpretation**: HMRC internal manuals

### Version Control

- **Original**: `/enacted` version from legislation.gov.uk
- **Amendments**: Tracked by Finance Act year and section/schedule
- **Current**: Latest available revised version

### Update Schedule

- Finance Acts: Updated within 30 days of Royal Assent
- Statutory Instruments: Updated as published
- Review: Annual comprehensive review each April

---

## Related Documents

- [Legislative Process](../finance-acts/legislative-process.md) - How Finance Acts create law
- [Key Amendments Timeline](../key-amendments-timeline.md) - Master chronological list
- [Entity Historical Origins](../../entities/historical-origins.md) - Origins of each entity type

---

*Database initiated: 2026-02-01*
*Methodology: PP Path Builder (Creativity Mode)*
