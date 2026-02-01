# Deadlines: WHEN Must Things Happen?

> **PP Dimension**: TRUTH
> **Core Question**: What are the critical dates in the UK tax calendar?

---

## UK Tax Year Structure

```
        UK TAX YEAR: 6 April 2024 → 5 April 2025

   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec   Jan   Feb   Mar   Apr
    │                                                       │                 │
    │◄──────────────── Tax Year 2024/25 ──────────────────►│                 │
    6th                                                    │                5th
                                                           │
                                             ┌─────────────┴─────────────┐
                                             │   31 January 2026         │
                                             │   SA Filing & Payment     │
                                             │   Deadline                │
                                             └───────────────────────────┘
```

---

## Critical Deadlines Calendar

### Self Assessment (Most Important for MVP)

| Deadline | What | Penalty |
|----------|------|---------|
| **5 October** | Register for SA (new taxpayers) | Late registration penalty |
| **31 October** | Paper return deadline | £100 immediate |
| **31 January** | Online return deadline | £100 immediate |
| **31 January** | Pay tax owed | Interest + 5% at 30 days |
| **28 February** | 30 days late (return) | £10/day (max 90 days) |
| **31 July** | Payment on Account (2nd) | Interest + surcharges |
| **1 August** | 3 months late (return) | £300 or 5% of tax |
| **1 February** | 6 months late (return) | Another £300 or 5% |
| **1 August** | 12 months late (return) | Another £300 or 100% of tax |

### VAT

| Deadline | What | Frequency |
|----------|------|-----------|
| **1 month + 7 days after period end** | VAT return & payment | Quarterly |
| **Registration** | Within 30 days of exceeding threshold | One-time |

### Corporation Tax

| Deadline | What |
|----------|------|
| **12 months after accounting period end** | CT600 return |
| **9 months + 1 day after period end** | Payment (small companies) |
| **Quarterly instalments** | Large companies |

### PAYE/RTI

| Deadline | What | Frequency |
|----------|------|-----------|
| **On or before payday** | FPS submission | Each pay run |
| **22nd of month** | PAYE payment (electronic) | Monthly |
| **19th of month** | PAYE payment (cheque) | Monthly |
| **5 April** | Final FPS of tax year | Annual |
| **19 April** | Final PAYE payment | Annual |

### Other Key Dates

| Date | What |
|------|------|
| **60 days after completion** | CGT on UK property report & payment |
| **6 months after death** | IHT account (IHT400) |
| **End of month after grant** | IHT payment |

---

## 2024/25 Tax Year Key Dates

| Date | Event |
|------|-------|
| 6 Apr 2024 | Tax year 2024/25 starts |
| 5 Oct 2024 | Register for Self Assessment (new) |
| 31 Oct 2024 | Paper SA return deadline (2023/24) |
| 30 Dec 2024 | Online SA if wanting PAYE coding adjustment |
| 31 Jan 2025 | Online SA deadline + payment (2023/24) |
| 5 Apr 2025 | Tax year 2024/25 ends |
| 31 Jul 2025 | 2nd Payment on Account (2024/25) |
| 5 Oct 2025 | Register for SA (new for 2024/25) |
| 31 Jan 2026 | Online SA deadline (2024/25) |

---

## MTD Quarterly Deadlines

Making Tax Digital requires quarterly updates:

| Quarter | Period | Deadline |
|---------|--------|----------|
| Q1 | 6 Apr - 5 Jul | 5 Aug |
| Q2 | 6 Jul - 5 Oct | 5 Nov |
| Q3 | 6 Oct - 5 Jan | 5 Feb |
| Q4 | 6 Jan - 5 Apr | 5 May |
| Final Declaration | Full year | 31 Jan |

**MTD Timeline:**
- Apr 2024: MTD for VAT (all VAT-registered)
- Apr 2026: MTD for Income Tax (>£50k)
- Apr 2027: MTD for Income Tax (>£30k)

---

## Product Features Needed

### Deadline Reminders
- [ ] Configurable reminder lead times (1 week, 1 month)
- [ ] Email notifications
- [ ] Push notifications (mobile)
- [ ] Calendar integration (iCal, Google)
- [ ] SMS alerts (premium)

### Deadline Tracker Dashboard
- [ ] Visual timeline
- [ ] Days remaining countdown
- [ ] Red/amber/green status
- [ ] Completed vs pending

### Smart Deadlines
- [ ] Entity-specific calendars
- [ ] Accounting period flexibility
- [ ] Holiday adjustments (bank holidays)
- [ ] Weekend roll-forward rules

---

## Research Questions

- [ ] Exactly when do deadlines fall on weekends/holidays?
- [ ] What are the appeal processes for missed deadlines?
- [ ] How do HMRC systems handle timezone issues?
- [ ] What "reasonable excuse" provisions exist?
- [ ] How do penalties escalate over time?

---

## Sources

- [HMRC: Self Assessment deadlines](https://www.gov.uk/self-assessment-tax-returns/deadlines)
- [HMRC: Penalties for late filing](https://www.gov.uk/self-assessment-tax-returns/penalties)
- [HMRC: VAT deadlines](https://www.gov.uk/vat-returns/deadlines)
- [HMRC: Corporation Tax deadlines](https://www.gov.uk/corporation-tax)
- [HMRC: MTD timeline](https://www.gov.uk/making-tax-digital)
