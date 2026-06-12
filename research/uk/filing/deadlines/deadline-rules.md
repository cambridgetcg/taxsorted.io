# UK Filing Deadline Calculation Rules

> **Last Updated**: 2026-02-01

---

## Overview

This document defines the calculation rules for UK tax and regulatory filing deadlines. Use these formulas to calculate specific deadlines based on period end dates.

---

## HMRC Deadlines

### Self Assessment (Individuals) - SA100

| Event | Calculation |
|-------|-------------|
| **Tax year end** | 5 April |
| **Paper filing** | 31 October following tax year end |
| **Online filing** | 31 January following tax year end |
| **Payment due** | 31 January following tax year end |
| **POA 1** | 31 January in tax year |
| **POA 2** | 31 July following tax year end |
| **Balancing payment** | 31 January following tax year end |

**Formula**:
```
Paper deadline = 31 October Y+1 (where Y is the tax year ending 5 April)
Online deadline = 31 January Y+1
Payment deadline = 31 January Y+1
```

### Partnership Return - SA800

| Event | Calculation |
|-------|-------------|
| **Period end** | Accounting period end (or 5 April) |
| **Paper filing** | 31 October following tax year end |
| **Online filing** | 31 January following tax year end |

Same as individual SA but no payment (partners pay individually).

### Trust Return - SA900

| Event | Calculation |
|-------|-------------|
| **Tax year end** | 5 April |
| **Paper filing** | 31 October following tax year end |
| **Online filing** | 31 January following tax year end |
| **Payment due** | 31 January following tax year end |

Same as individual SA.

### Corporation Tax - CT600

| Event | Calculation |
|-------|-------------|
| **Period end** | Accounting Reference Date (ARD) |
| **Filing deadline** | 12 months after period end |
| **Payment deadline** | 9 months + 1 day after period end |
| **Large company instalments** | Quarterly (see below) |

**Formula**:
```
Filing deadline = ARD + 12 months
Payment deadline = ARD + 9 months + 1 day
```

**Large Company Instalment Dates** (profits >£1.5m):
```
Instalment 1: 6 months + 14 days after period start
Instalment 2: 9 months + 14 days after period start
Instalment 3: 14 days after period end
Instalment 4: 3 months + 14 days after period end
```

### VAT Return - VAT100

| Event | Calculation |
|-------|-------------|
| **Quarter end** | Standard quarters or stagger |
| **Filing deadline** | 1 month + 7 days after quarter end |
| **Payment deadline** | Same as filing (DD: +3 working days) |

**Formula**:
```
Filing deadline = Quarter end + 1 month + 7 days
```

**Standard Quarters**:
- Q1: Jan-Mar → 7 May
- Q2: Apr-Jun → 7 August
- Q3: Jul-Sep → 7 November
- Q4: Oct-Dec → 7 February

### PAYE/RTI

| Event | Calculation |
|-------|-------------|
| **FPS** | On or before each payday |
| **EPS** | 19th of following month |
| **Payment (electronic)** | 22nd of following month |
| **Payment (post)** | 19th of following month |

**Year-End**:
```
Final FPS: On/before last payday of tax year
P60 to employees: 31 May
P11D submission: 6 July
Class 1A NI payment: 22 July
```

---

## Companies House Deadlines

### Annual Accounts

| Company Type | Calculation |
|--------------|-------------|
| **Private company** | ARD + 9 months |
| **Public company** | ARD + 6 months |
| **First accounts** | 21 months from incorporation OR 3 months from ARD (longer) |

**Formula**:
```
Private: ARD + 9 months
Public: ARD + 6 months
New company: MAX(incorporation + 21 months, ARD + 3 months)
```

### Confirmation Statement

| Event | Calculation |
|-------|-------------|
| **Review period end** | 12 months from last CS (or incorporation) |
| **Filing deadline** | Review period end + 14 days |

**Formula**:
```
Review date = Last CS date + 12 months (or incorporation + 12 months)
Filing deadline = Review date + 14 days
```

---

## Charity Commission Deadlines

### Annual Return + Accounts

| Event | Calculation |
|-------|-------------|
| **Financial year end** | Charity's FYE |
| **Filing deadline** | FYE + 10 months |

**Formula**:
```
Filing deadline = FYE + 10 months
```

---

## Other Regulators

### CIC Report

Filed WITH Companies House accounts:
```
Deadline = ARD + 9 months (same as CH accounts)
```

### FCA Mutuals (Co-operatives)

```
Filing deadline = FYE + 7 months
```

### Trust Registration Service

| Event | Calculation |
|-------|-------------|
| **New taxable trust** | 90 days from creation |
| **Existing trust becomes taxable** | 90 days from trigger event |
| **Annual update** | 31 January (if SA900) or 90 days from change |

---

## Weekend and Bank Holiday Rules

### HMRC

| Authority | Rule |
|-----------|------|
| **Self Assessment** | If deadline falls on weekend/bank holiday, due on next working day |
| **CT600** | Same - next working day |
| **VAT** | Same - next working day |
| **PAYE** | Same - next working day |

### Companies House

| Authority | Rule |
|-----------|------|
| **Accounts** | If deadline falls on weekend/bank holiday, due on next working day |
| **Confirmation Statement** | Same - next working day |

### Charity Commission

| Authority | Rule |
|-----------|------|
| **Annual Return** | If deadline falls on weekend/bank holiday, due on next working day |

---

## Key Dates Calendar

### Tax Year 2025-26

| Date | Event |
|------|-------|
| **6 April 2025** | Tax year starts |
| **5 April 2026** | Tax year ends |
| **31 July 2025** | POA 2 for 2024-25 |
| **5 October 2025** | Register for SA (new taxpayers) |
| **31 October 2025** | Paper SA deadline (2024-25) |
| **31 January 2026** | Online SA + payment (2024-25), POA 1 (2025-26) |
| **31 July 2026** | POA 2 for 2025-26 |
| **31 October 2026** | Paper SA deadline (2025-26) |
| **31 January 2027** | Online SA + payment (2025-26) |

### Employer Calendar (Monthly)

| Day | Event |
|-----|-------|
| **Payday** | FPS due |
| **19th** | EPS deadline, postal PAYE payment |
| **22nd** | Electronic PAYE payment |

### VAT Calendar (Quarterly)

| Quarter End | Filing/Payment Deadline |
|-------------|------------------------|
| 31 March | 7 May |
| 30 June | 7 August |
| 30 September | 7 November |
| 31 December | 7 February |

---

## Calculation Examples

### Example 1: Ltd Company (31 March ARD)

| Filing | Calculation | Deadline |
|--------|-------------|----------|
| **CT600** | 31 Mar + 12 months | 31 March next year |
| **CT payment** | 31 Mar + 9m + 1d | 1 January next year |
| **CH accounts** | 31 Mar + 9 months | 31 December same year |
| **Confirmation Statement** | Review + 14 days | Varies |

### Example 2: Charity (31 December FYE)

| Filing | Calculation | Deadline |
|--------|-------------|----------|
| **CC Annual Return** | 31 Dec + 10 months | 31 October next year |
| **Charitable company CH** | 31 Dec + 9 months | 30 September next year |

### Example 3: Partnership (31 March Year End)

| Filing | Calculation | Deadline |
|--------|-------------|----------|
| **SA800** | 31 Jan following tax year | 31 January Y+1 |
| **Individual partners SA104** | Same | 31 January Y+1 |

---

## Period End vs Tax Year

### When They Differ

| Entity | Period End | Tax Year |
|--------|------------|----------|
| **Individuals** | N/A | 6 Apr - 5 Apr |
| **Partnerships** | Accounting period | Basis period rules |
| **Companies** | ARD | N/A (no tax year) |
| **Trusts** | N/A | 6 Apr - 5 Apr |
| **Charities** | FYE | 6 Apr - 5 Apr (for claims) |

### Basis Period Rules (Partnerships)

New rules from 2024-25:
- Tax year basis
- Profits for period ending in tax year
- Transition rules for existing businesses

---

## Early Filing

### Benefits

| Filing | Early Filing Benefit |
|--------|---------------------|
| **SA** | More time to pay/plan |
| **CT600** | Refunds processed faster |
| **VAT** | Refunds processed faster |
| **Accounts** | Avoid late filing risk |

### Earliest Filing Dates

| Filing | Earliest |
|--------|----------|
| **SA** | 6 April (start of tax year) |
| **CT600** | Day after period ends |
| **VAT** | Last day of VAT period |
| **CH Accounts** | Day after period ends |

---

## Sources

### Legislation
- [TMA 1970 s.59B](https://www.legislation.gov.uk/ukpga/1970/9/section/59B) - SA payment dates
- [FA 1998 Sch.18](https://www.legislation.gov.uk/ukpga/1998/36/schedule/18) - CT filing/payment
- [CA 2006 s.442](https://www.legislation.gov.uk/ukpga/2006/46/section/442) - Accounts deadline

---

*Deadline rules compiled: 2026-02-01*
