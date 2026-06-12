# Entities: WHO Files Taxes in the UK?

> **PP Dimension**: UNDERSTANDING
> **Core Question**: What legal structures exist and what are their tax obligations?

---

## Taxonomy: Entity Type vs Residency Status

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UK TAX ENTITY MODEL                             │
└─────────────────────────────────────────────────────────────────────────┘

  ENTITY TYPE (what you are)              RESIDENCY STATUS (where you're based)
  ──────────────────────────              ────────────────────────────────────

  ┌─────────────┐                         ┌──────────────┐
  │ Individuals │ ───────────────────────►│ UK Resident  │ Full UK tax
  └─────────────┘                         │ Non-Resident │ UK-source only
                                          └──────────────┘
  ┌─────────────┐
  │ Sole Traders│ (individuals trading - same residency rules apply)
  └─────────────┘
                                          ┌──────────────────┐
  ┌─────────────┐                         │ UK Incorporated  │ UK Corp Tax
  │ Ltd Company │ ───────────────────────►│ Non-UK (branch)  │ UK profits only
  └─────────────┘                         └──────────────────┘

  ┌─────────────┐                         ┌──────────────┐
  │ Partnership │ ───────────────────────►│ UK Based     │ Partners taxed
  └─────────────┘                         │ Non-UK Based │ UK profits only
                                          └──────────────┘
  ┌─────────────┐                         ┌──────────────┐
  │   Trusts    │ ───────────────────────►│ UK Resident  │ Full UK tax
  └─────────────┘                         │ Non-Resident │ UK-source only
                                          └──────────────┘

  Residency is a MODIFIER on entity type, not a separate entity.
```

---

## Entity Matrix (UK Residents)

| Entity Type | Income Tax | Corp Tax | VAT | PAYE | NI | Self Assessment |
|-------------|------------|----------|-----|------|-----|-----------------|
| Individuals (employed) | Via PAYE | - | - | Employer | Class 1 | Sometimes |
| Sole Traders | Yes | - | If >£90k | - | Class 2 & 4 | Yes |
| Partnerships | Partners pay | - | If >£90k | If employees | Partners pay | Yes |
| Limited Companies | - | Yes | If >£90k | Yes | Employer | - |
| LLPs | Members pay | - | If >£90k | If employees | Members pay | Yes |
| Charities | Exempt* | Exempt* | Partial | If employees | If employees | Varies |
| Trusts | Yes | - | Rare | - | - | Yes |

### Non-Resident Modifications

| Entity Type | Tax Treatment |
|-------------|---------------|
| Non-resident individuals | UK-source income only (rental, employment, trading) |
| Non-UK incorporated companies | UK branch/PE profits, UK property income |
| Non-UK partnerships | UK-source profits allocated to partners |
| Non-resident trusts | UK-source income, special anti-avoidance rules |

---

## Directory Structure

```
entities/
├── README.md (this file)
│
├── individuals/
│   ├── uk-resident/           # Full UK tax obligations
│   └── non-resident/          # UK-source income only
│
├── sole-traders/              # Individuals trading (residency inherited)
│
├── partnerships/
│   ├── uk-based/              # UK partnership rules
│   └── non-uk-based/          # International partnerships
│
├── limited-companies/
│   ├── uk-incorporated/       # Full UK Corporation Tax
│   └── non-uk-incorporated/   # UK branch/PE taxation
│
├── llps/                      # Limited Liability Partnerships
│
├── charities/                 # Charitable organizations
│
└── trusts/
    ├── uk-resident/           # UK resident trusts
    └── non-uk-resident/       # Offshore trusts
```

---

## Research Priority

### P1 - Core MVP
1. **Sole Traders** - Primary target market
2. **Individuals (UK resident)** - Employed with side income

### P2 - Phase 2
3. **Limited Companies (UK)** - Small Ltd companies
4. **Partnerships (UK)** - Simple partnerships

### P3 - Future
5. **LLPs** - Professional services
6. **Charities** - Non-profit sector
7. **Trusts** - Estate planning
8. **Non-resident variants** - Expats, foreign investors, offshore structures

---

## Research Questions by Entity

### Individuals (`individuals/`)

#### UK Resident (`individuals/uk-resident/`)
- [ ] When is Self Assessment required?
- [ ] P60/P45 understanding
- [ ] Additional income sources requiring SA
- [ ] Marriage allowance transfer
- [ ] Gift Aid reclaim for higher rate
- [ ] Pension contribution relief
- [ ] Rental income reporting
- [ ] Foreign income reporting (arising vs remittance)

#### Non-Resident (`individuals/non-resident/`)
- [ ] Statutory Residence Test (SRT)
- [ ] Split-year treatment
- [ ] UK-source income rules
- [ ] Rental income from UK property
- [ ] Non-Resident Landlord Scheme
- [ ] Double taxation relief
- [ ] Leaving/returning to UK

### Sole Traders (`sole-traders/`)
- [ ] Registration process with HMRC
- [ ] UTR (Unique Taxpayer Reference) acquisition
- [ ] What constitutes trading income?
- [ ] Allowable business expenses
- [ ] Cash basis vs accruals accounting
- [ ] VAT registration threshold & process
- [ ] Class 2 & Class 4 NI calculations
- [ ] Record keeping requirements
- [ ] MTD obligations timeline

### Limited Companies (`limited-companies/`)

#### UK Incorporated (`limited-companies/uk-incorporated/`)
- [ ] Corporation Tax registration
- [ ] CT600 filing requirements
- [ ] Director's responsibilities
- [ ] Salary vs dividends optimization
- [ ] Company accounts requirements
- [ ] Confirmation statement (Companies House)
- [ ] Small company thresholds
- [ ] Associated companies rules

#### Non-UK Incorporated (`limited-companies/non-uk-incorporated/`)
- [ ] Permanent Establishment rules
- [ ] UK branch registration
- [ ] Transfer pricing
- [ ] Diverted Profits Tax
- [ ] Withholding taxes

### Partnerships (`partnerships/`)

#### UK Based (`partnerships/uk-based/`)
- [ ] Partnership registration
- [ ] SA800 partnership return
- [ ] Profit allocation methods
- [ ] Partner's Self Assessment
- [ ] Joining/leaving partnerships
- [ ] Partnership capital accounts

#### Non-UK Based (`partnerships/non-uk-based/`)
- [ ] UK trading through partnership
- [ ] Mixed partnerships
- [ ] International profit allocation

### Trusts (`trusts/`)

#### UK Resident (`trusts/uk-resident/`)
- [ ] Trust registration (TRS)
- [ ] Income vs capital distinction
- [ ] Trust rate taxation
- [ ] Beneficiary taxation
- [ ] Trust types (bare, discretionary, interest in possession)

#### Non-UK Resident (`trusts/non-uk-resident/`)
- [ ] Offshore trust rules
- [ ] Settlor/beneficiary charges
- [ ] Reporting requirements
- [ ] Anti-avoidance (transfer of assets abroad)

---

## Residency Determination Rules

### Individuals: Statutory Residence Test (SRT)

```
┌─────────────────────────────────────────────────────────────┐
│              STATUTORY RESIDENCE TEST (SRT)                 │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   Automatic           Automatic         Sufficient
   Overseas Test       UK Test           Ties Test
        │                  │                  │
   (Non-resident      (UK resident       (Days + UK ties
    if met)            if met)            = complex calc)
```

### Companies: Central Management & Control
- Where board decisions made
- Where strategic control exercised
- Place of incorporation (default)

### Trusts: Trustee Residence
- All trustees UK resident → UK resident trust
- Mixed trustees → complex rules apply

---

## Key Regulatory Bodies

| Body | Responsibility |
|------|----------------|
| HMRC | Tax collection, Self Assessment, VAT, PAYE |
| Companies House | Company registration, annual filings |
| Charity Commission | Charity registration, compliance |
| FCA | Financial services regulation |
| Trust Registration Service | Trust registration (TRS) |

---

## Sources

- [HMRC: Set up as self-employed](https://www.gov.uk/set-up-self-employed)
- [HMRC: Self Assessment](https://www.gov.uk/self-assessment-tax-returns)
- [HMRC: Tax on foreign income](https://www.gov.uk/tax-foreign-income)
- [HMRC: Statutory Residence Test](https://www.gov.uk/government/publications/rdr3-statutory-residence-test-srt)
- [HMRC: Non-resident landlords](https://www.gov.uk/guidance/paying-tax-on-rental-income-if-youre-non-resident)
- [Companies House: Starting a company](https://www.gov.uk/limited-company-formation)
- [HMRC: Corporation Tax](https://www.gov.uk/corporation-tax)
- [HMRC: Trusts and taxes](https://www.gov.uk/trusts-taxes)
