# Making Tax Digital (MTD): Requirements Guide

> **Authority**: HMRC
> **Last Updated**: 2026-02-01

---

## Overview

Making Tax Digital is HMRC's programme to digitise the UK tax system. Different taxes have different MTD requirements and timelines.

---

## MTD for VAT

### Status: Fully Implemented

| Milestone | Date |
|-----------|------|
| **Phase 1** | April 2019 (>£85k threshold) |
| **Phase 2** | April 2022 (all VAT registered) |

### Who Must Comply

| Business | MTD Required? |
|----------|---------------|
| **VAT registered (any turnover)** | Yes |
| **Voluntary VAT registration** | Yes |
| **Digitally excluded** | Exemption available |

### Requirements

| Requirement | Detail |
|-------------|--------|
| **Digital records** | Keep records digitally |
| **Digital links** | Data must flow digitally |
| **Compatible software** | Must use MTD software |
| **API submission** | Submit via HMRC API |

### Digital Links

All data from original entry to submission must be digitally linked:
- No manual re-typing
- Copy/paste allowed with audit trail
- Bridging software acceptable

### Exemptions

| Exemption | Criteria |
|-----------|----------|
| **Digital exclusion** | Age, disability, remoteness, religion |
| **Insolvency** | During insolvency proceedings |
| **Practical difficulties** | Case-by-case basis |

---

## MTD for Income Tax Self Assessment (ITSA)

### Status: Phased Implementation

| Phase | Date | Who |
|-------|------|-----|
| **Phase 1** | April 2026 | Income >£50,000 |
| **Phase 2** | April 2027 | Income >£30,000 |
| **Future** | TBC | Income >£20,000 |

### Income Threshold

Gross income from:
- Self-employment
- Property income

Combined threshold determines mandate date.

### Requirements

| Requirement | Detail |
|-------------|--------|
| **Digital records** | Keep business records digitally |
| **Quarterly updates** | Submit every quarter |
| **EOPS** | End of Period Statement |
| **Final declaration** | Replaces SA100 |

### Quarterly Update Deadlines

| Quarter | Deadline |
|---------|----------|
| **6 Apr - 5 Jul** | 5 August |
| **6 Jul - 5 Oct** | 5 November |
| **6 Oct - 5 Jan** | 5 February |
| **6 Jan - 5 Apr** | 5 May |

### End of Period Statement (EOPS)

Due by 31 January following tax year end.

### Final Declaration

Replaces current SA100:
- Confirms all income reported
- Calculates final tax liability
- Due by 31 January

### Partnerships

| Partnership Size | MTD ITSA |
|-----------------|----------|
| **Individual partners** | Based on individual income threshold |
| **Partnership itself** | Reporting requirements TBC |

---

## MTD for Corporation Tax

### Status: Not Yet Mandated

| Milestone | Expected Date |
|-----------|---------------|
| **Pilot** | 2026 onwards |
| **Mandate** | Not before April 2026 |

### Expected Requirements

Based on HMRC consultation:
- Digital record keeping
- Quarterly reporting possible
- Compatible software
- API submission

---

## Software Requirements

### MTD for VAT Compatible Software

Must be able to:
- Store digital records
- Provide digital links
- Calculate VAT figures
- Submit to HMRC via API
- Receive HMRC acknowledgments

### MTD for ITSA Compatible Software

Must be able to:
- Store income and expense records
- Calculate quarterly figures
- Submit quarterly updates
- Submit EOPS
- Submit final declaration

### Free Software

| Software | MTD VAT | MTD ITSA |
|----------|---------|----------|
| **HMRC's own** | Limited | TBC |
| **Commercial (free tier)** | Various | Various |

---

## Record Keeping

### Digital Records Required

| Record | MTD VAT | MTD ITSA |
|--------|---------|----------|
| **Business name/address** | Yes | Yes |
| **VAT registration number** | Yes | N/A |
| **Sales/income** | Yes | Yes |
| **Purchases/expenses** | Yes | Yes |
| **VAT calculations** | Yes | N/A |
| **Adjustments** | Yes | Yes |

### Retention Period

| Record Type | Retention |
|-------------|-----------|
| **VAT records** | 6 years |
| **Income tax records** | 5 years from 31 Jan |
| **Company records** | 6 years from period end |

---

## Penalties for MTD Non-Compliance

### Failure to Use MTD Software

| Offence | Penalty |
|---------|---------|
| **First offence** | Warning |
| **Repeated failure** | Up to £400 |
| **Continued failure** | Daily penalties |

### Late Submission (MTD)

Same penalty regime as underlying tax:
- VAT: Points-based system
- ITSA: Standard SA penalties (adapting)

---

## Agent Access

### Agent Authorisation

| Service | Authorisation Method |
|---------|---------------------|
| **MTD VAT** | Digital handshake or 64-8 |
| **MTD ITSA** | Digital handshake |
| **SA** | 64-8 form |

### Software for Agents

Multi-client functionality required:
- Manage multiple businesses
- Submit on behalf of clients
- Access client records

---

## Transition Considerations

### From Paper to Digital

| Step | Action |
|------|--------|
| **1** | Choose compatible software |
| **2** | Set up digital records |
| **3** | Import opening data |
| **4** | Establish digital links |
| **5** | Test submission |

### Spreadsheet Users

Bridging software can connect spreadsheets to HMRC:
- Maintains spreadsheet workflow
- Adds API connectivity
- Must have digital links

---

## MTD Timeline Summary

| Tax | Current Status | Next Milestone |
|-----|----------------|----------------|
| **VAT** | Mandatory (all) | Complete |
| **ITSA (>£50k)** | Pilot | April 2026 mandate |
| **ITSA (>£30k)** | N/A | April 2027 mandate |
| **Corporation Tax** | Not mandated | 2026+ pilot |
| **PAYE** | RTI (since 2013) | Already digital |

---

## Sources

### Legislation
- [FA 2017 Sch.14](https://www.legislation.gov.uk/ukpga/2017/10/schedule/14) - MTD framework
- [VAT (Amendment) Regs 2018](https://www.legislation.gov.uk/uksi/2018/261) - MTD VAT

### HMRC Guidance
- [GOV.UK: MTD for VAT](https://www.gov.uk/vat-record-keeping/making-tax-digital-for-vat)
- [GOV.UK: MTD for ITSA](https://www.gov.uk/guidance/using-making-tax-digital-for-income-tax)

---

*MTD requirements compiled: 2026-02-01*
