# Tax Types: WHAT Taxes Exist in the UK?

> **PP Dimension**: UNDERSTANDING
> **Core Question**: What are the different UK taxes and how do they work?

---

## UK Tax Landscape

```
                        ┌─────────────────────────────────────┐
                        │         UK TAX SYSTEM               │
                        └─────────────────────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
   ┌────▼────┐                    ┌──────▼──────┐                  ┌──────▼──────┐
   │ INCOME  │                    │ TRANSACTION │                  │   WEALTH    │
   │  TAXES  │                    │    TAXES    │                  │    TAXES    │
   └────┬────┘                    └──────┬──────┘                  └──────┬──────┘
        │                                │                                │
   ┌────┴────────────┐          ┌───────┴───────┐              ┌─────────┴─────────┐
   │                 │          │               │              │                   │
Income Tax    Corporation    VAT          Stamp Duty    Capital Gains    Inheritance
   │             Tax                        (SDLT)           Tax              Tax
   │
PAYE        National
           Insurance
```

---

## Tax Type Matrix

| Tax | Who Pays | Rate Range | Filing | Frequency |
|-----|----------|------------|--------|-----------|
| **Income Tax** | Individuals | 0-45% | Self Assessment | Annual |
| **Corporation Tax** | Companies | 19-25% | CT600 | Annual |
| **VAT** | Businesses >£90k | 0-20% | VAT Return | Quarterly |
| **PAYE** | Employers | N/A | RTI | Monthly |
| **National Insurance** | Workers/Employers | 2-13.8% | Via PAYE/SA | Monthly/Annual |
| **Capital Gains Tax** | Asset sellers | 10-28% | Self Assessment | Annual |
| **Dividend Tax** | Shareholders | 0-39.35% | Self Assessment | Annual |
| **Stamp Duty (SDLT)** | Property buyers | 0-17% | SDLT Return | Per transaction |
| **Inheritance Tax** | Estates | 40% | IHT400 | Per death |
| **Business Rates** | Businesses | Varies | Council | Annual |

---

## Research Priority

### P1 - Core MVP (Self Assessment Focus)
1. **Income Tax** - The heart of Self Assessment
2. **National Insurance** - Classes 2 & 4 for self-employed

### P2 - Small Business
3. **VAT** - Threshold, registration, returns
4. **Corporation Tax** - Small company basics

### P3 - Comprehensive
5. **Capital Gains Tax** - Property, investments
6. **Dividend Tax** - Company directors
7. **PAYE** - Employer responsibilities
8. **Stamp Duty** - Property transactions
9. **Inheritance Tax** - Estate planning
10. **Business Rates** - Premises costs

---

## Detailed Research Areas

### Income Tax (`income-tax/`)
```
Priority: P1 - CORE

Research Areas:
- [ ] Tax bands & rates (current year + history)
- [ ] Personal allowance rules
- [ ] Taxable income categories
- [ ] Employment income (P60, benefits in kind)
- [ ] Self-employment income (trading profits)
- [ ] Rental income (property)
- [ ] Savings income (interest)
- [ ] Dividend income
- [ ] Foreign income
- [ ] Allowable deductions
- [ ] Tax reliefs available
- [ ] Scottish/Welsh rate variations
```

### National Insurance (`national-insurance/`)
```
Priority: P1 - CORE

Research Areas:
- [ ] Class 1 (employees)
- [ ] Class 1A (employers - benefits)
- [ ] Class 2 (self-employed flat rate)
- [ ] Class 3 (voluntary)
- [ ] Class 4 (self-employed profits)
- [ ] Thresholds and rates
- [ ] Small profits threshold
- [ ] Employment allowance
- [ ] State pension implications
```

### VAT (`vat/`)
```
Priority: P2

Research Areas:
- [ ] Registration threshold (£90k)
- [ ] Voluntary registration benefits
- [ ] VAT schemes (Flat Rate, Cash, Annual)
- [ ] VAT rates (standard, reduced, zero, exempt)
- [ ] MTD for VAT requirements
- [ ] VAT return filing
- [ ] Input vs output VAT
- [ ] Partial exemption
- [ ] EC sales/purchases (post-Brexit)
```

### Corporation Tax (`corporation-tax/`)
```
Priority: P2

Research Areas:
- [ ] Small profits rate vs main rate
- [ ] Associated companies
- [ ] Accounting periods
- [ ] CT600 return
- [ ] Payment deadlines
- [ ] Quarterly instalment payments
- [ ] Loss relief
- [ ] Capital allowances
- [ ] R&D tax credits
```

### Capital Gains Tax (`capital-gains-tax/`)
```
Priority: P3

Research Areas:
- [ ] Annual exempt amount
- [ ] Rates (basic vs higher rate)
- [ ] Residential property surcharge
- [ ] Business Asset Disposal Relief
- [ ] Investors' Relief
- [ ] Share pooling rules
- [ ] Principal Private Residence relief
- [ ] 60-day reporting for property
```

---

## 2024/25 Tax Year Quick Reference

| Tax | Key Threshold/Rate |
|-----|-------------------|
| Personal Allowance | £12,570 |
| Basic Rate Band | £12,571 - £50,270 (20%) |
| Higher Rate | £50,271 - £125,140 (40%) |
| Additional Rate | Over £125,140 (45%) |
| NI Class 2 | £3.45/week (if profits >£12,570) |
| NI Class 4 | 6% (£12,570-£50,270), 2% above |
| VAT Threshold | £90,000 |
| Corporation Tax | 19% (<£50k), 25% (>£250k) |
| CGT Annual Exempt | £3,000 |
| Dividend Allowance | £500 |

---

## Files to Create

```
tax-types/
├── README.md (this file)
├── income-tax/
│   ├── overview.md
│   ├── rates-bands.md
│   ├── personal-allowance.md
│   ├── taxable-income.md
│   ├── reliefs.md
│   └── scottish-welsh.md
├── national-insurance/
│   ├── overview.md
│   ├── classes.md
│   ├── thresholds.md
│   └── self-employed.md
├── vat/
│   ├── overview.md
│   ├── registration.md
│   ├── schemes.md
│   ├── rates.md
│   └── mtd-vat.md
└── [other tax types...]
```

---

## Key Sources

- [HMRC: Income Tax rates](https://www.gov.uk/income-tax-rates)
- [HMRC: National Insurance](https://www.gov.uk/national-insurance)
- [HMRC: VAT](https://www.gov.uk/vat-businesses)
- [HMRC: Corporation Tax](https://www.gov.uk/corporation-tax)
- [HMRC: Capital Gains Tax](https://www.gov.uk/capital-gains-tax)
