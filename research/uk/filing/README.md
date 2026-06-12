# Filing Requirements: Complete UK Tax & Regulatory Filing Guide

> **Purpose**: Single source of truth for all UK filing obligations by entity type
> **Last Updated**: 2026-02-01

---

## Overview

This directory documents **every filing requirement** for UK legal entities:

1. **What to file** - Form names, numbers, supplementary pages
2. **To whom** - HMRC, Companies House, Charity Commission, FCA, etc.
3. **When** - Deadlines with calculation formulas
4. **How** - Online, paper, software requirements
5. **Consequences** - Penalties for late/non-filing

---

## Directory Structure

```
filing/
├── README.md                          # This file
├── FILING_REQUIREMENTS_PLAN.md        # Master plan
├── _form-template.md                  # Template for new form docs
│
├── forms/                             # Individual form documentation
│   ├── hmrc/
│   │   ├── sa100.md                  ✓ Self Assessment (individual)
│   │   ├── sa800.md                  ✓ Partnership return
│   │   ├── sa900.md                  ✓ Trust return
│   │   ├── ct600.md                  ✓ Corporation Tax return
│   │   ├── vat100.md                 ✓ VAT return
│   │   └── paye-rti.md               ✓ PAYE Real Time Information
│   │
│   ├── companies-house/
│   │   ├── confirmation-statement.md ✓ CS01
│   │   └── annual-accounts.md        ✓ Annual accounts
│   │
│   ├── charity-commission/
│   │   ├── annual-return.md          ✓ Charity Annual Return
│   │   └── charity-accounts.md       ✓ Charity accounts + SORP
│   │
│   └── other-regulators/
│       ├── fca-mutuals.md            ✓ Co-operatives/CBS
│       ├── cic-report.md             ✓ CIC annual report
│       └── trs.md                    ✓ Trust Registration Service
│
├── by-entity/
│   └── filing-matrix.md              ✓ Cross-reference all entities
│
├── deadlines/
│   ├── deadline-rules.md             ✓ Calculation formulas
│   └── calendar-template.md          ✓ Calendar template
│
├── penalties/
│   └── penalty-structure.md          ✓ All penalties consolidated
│
├── mtd/
│   └── mtd-requirements.md           ✓ MTD VAT & ITSA requirements
│
└── submission/
    ├── portals-and-apis.md           ✓ Where to file + API availability
    ├── hmrc-api-research.md          ✓ Extensive HMRC API coverage analysis
    │
    ├── integrations/                 # Detailed API integration specs
    │   ├── phase1-vat-mtd.md         ✓ VAT MTD API (REST)
    │   ├── phase1-obligations.md     ✓ Obligations API (deadlines/status)
    │   ├── phase1-agent-auth.md      ✓ Agent Authorisation API
    │   ├── phase2-self-employment.md ✓ Self Employment Business API
    │   ├── phase2-property.md        ✓ Property Business API
    │   ├── phase2-calculations.md    ✓ Individual Calculations API
    │   ├── phase3-paye-rti.md        ✓ PAYE/RTI XML API
    │   └── phase3-ct600.md           ✓ CT600 XML + iXBRL
    │
    └── workflow/                     # Submission workflow design
        ├── submission-workflow.md    ✓ Entity-centric submission workflow
        ├── entity-layer-map.md       ✓ Complete entity type path visualization
        ├── mvp-frontend-map.md       ✓ MVP frontend path visualization
        └── dashboard-design.md       ✓ Dashboard component specifications
```

---

## Quick Reference: Filing by Entity Type

| Entity | HMRC | Companies House | Other |
|--------|------|-----------------|-------|
| **Self-Employed** | SA100 + SA103 | - | - |
| **Employed** | Usually none | - | - |
| **Ltd Company** | CT600, PAYE | Accounts, CS | - |
| **LLP** | SA800, SA104 per member | Accounts, CS | - |
| **General Partnership** | SA800, SA104 per partner | - | - |
| **Charitable Company** | CT600 | Accounts, CS | CC Annual Return |
| **CIO** | CT600 | - | CC Annual Return |
| **Discretionary Trust** | SA900 | - | TRS |
| **CIC** | CT600 | Accounts, CS | CIC Report |
| **Co-operative** | CT600 | - | FCA Return |
| **REIT** | CT600 + REIT pages | Accounts, CS | - |
| **VCT** | CT600 | Accounts, CS | - |

**CS** = Confirmation Statement

---

## Key Deadlines Summary

| Filing | Deadline |
|--------|----------|
| **SA100** (paper) | 31 October following tax year |
| **SA100** (online) | 31 January following tax year |
| **SA payment** | 31 January (balancing) + 31 July (POA) |
| **CT600** | 12 months after accounting period end |
| **CT payment** | 9 months + 1 day after period end |
| **VAT return** | 1 month + 7 days after VAT period |
| **Confirmation Statement** | Within 14 days of review period end |
| **CH Accounts** | 9 months (private) / 6 months (public) after year end |
| **CC Annual Return** | 10 months after financial year end |

---

## API Integration Specs

Detailed integration specifications for automating filing submissions:

### Phase 1: Core MTD (REST APIs)
| API | Purpose | Complexity |
|-----|---------|------------|
| **VAT MTD** | Submit VAT returns | Medium |
| **Obligations** | Track deadlines & status | Low |
| **Agent Auth** | Manage client authorizations | Medium |

### Phase 2: Income Tax MTD (REST APIs)
| API | Purpose | Complexity |
|-----|---------|------------|
| **Self Employment** | Quarterly updates, annual summaries | Medium |
| **Property Business** | UK/Foreign property income | Medium |
| **Individual Calculations** | Tax calculations, crystallisation | Medium-High |

### Phase 3: Legacy XML APIs
| API | Purpose | Complexity |
|-----|---------|------------|
| **PAYE/RTI** | Payroll submissions (FPS, EPS) | High |
| **CT600** | Corporation Tax + iXBRL accounts | Very High |

See `/submission/integrations/` for detailed specs including:
- Endpoint documentation
- Request/response formats
- Authentication flows
- Data models
- Error handling
- Implementation checklists

---

## Submission Workflow Architecture

The **entity-centric submission workflow** provides a unified approach to tax filing:

```
ENTITY → OBLIGATION RESOLVER → FILING REGISTRY → SUBMISSION ROUTER → STATUS TRACKER
```

### 5-Layer Architecture

| Layer | Purpose |
|-------|---------|
| **1. Entity** | Source of truth - defines taxpayer and attributes |
| **2. Obligation Resolver** | Rules engine - determines required filings from entity type |
| **3. Filing Registry** | Tracks all obligations, periods, deadlines, status |
| **4. Submission Router** | Routes to correct handler (MTD REST / XML Gateway / Portal) |
| **5. Status Tracker** | State machine for submission lifecycle |

### Submission Channels

| Channel | Filings | Authentication |
|---------|---------|----------------|
| **MTD REST API** | VAT, MTD ITSA (SE, Property, Calculations) | OAuth 2.0 + Fraud Headers |
| **XML Gateway** | CT600+iXBRL, PAYE/RTI, SA (legacy), CIS | Government Gateway |
| **Portal Only** | SA900, P11D, CH Accounts, CC Returns | Manual (export data) |

See `/submission/workflow/submission-workflow.md` for complete design with:
- TypeScript interfaces and data models
- State machine for filing lifecycle
- Deadline calculation engine
- Submission handler implementations
- UI component mockups

---

## MVP Frontend Design

The **MVP Frontend Path Map** provides complete visualization of the TaxSorted.io user interface:

### Site Map
```
Landing → Login/Register → Dashboard → Filings → Calendar → Entities → Settings
```

### Key User Journeys
| Journey | Steps |
|---------|-------|
| **Onboarding** | Sign up → Select entity type → Enter identifiers → Set attributes → View obligations |
| **VAT Submission** | Check HMRC connection → Enter figures → Validate → Review & declare → Submit → Confirmation |

### Core Screens
- **Dashboard**: Attention required, upcoming deadlines, recent submissions, compliance score
- **Filings**: Filterable list of all filing obligations with status
- **Calendar**: Month view with deadline markers
- **Entity Detail**: Identifiers, attributes, required filings, HMRC connections

### Technology Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **State**: TanStack Query (server), Context/Zustand (client)
- **Backend**: Next.js API Routes, Prisma ORM, NextAuth.js
- **Infrastructure**: Vercel, Vercel Postgres, Resend (email)

### MVP Feature Scope
| Priority | Features |
|----------|----------|
| **P0** | Auth, Entity CRUD, Obligation resolver, Filing dashboard, Status tracking |
| **P1** | VAT MTD submission, Calendar view, Email reminders |

See `/submission/workflow/mvp-frontend-map.md` for complete specifications including:
- Detailed wireframes (ASCII)
- Component hierarchy
- State management architecture
- API routes structure
- Data flow diagrams
- Implementation phases

---

## Dashboard Design

The **Dashboard Design** provides detailed component specifications for the main user interface:

### Layout Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ ZONE A: Entity Header (full width)                          │
├─────────────────────────────────────┬───────────────────────┤
│ ZONE B1: Attention Required         │ ZONE C1: Compliance   │
├─────────────────────────────────────┤       Score           │
│ ZONE B2: Upcoming Deadlines         ├───────────────────────┤
├─────────────────────────────────────┤ ZONE C2: HMRC         │
│ ZONE B3: Recent Submissions         │       Connections     │
│                                     ├───────────────────────┤
│                                     │ ZONE C3: Quick Actions│
└─────────────────────────────────────┴───────────────────────┘
```

### Dashboard Zones
| Zone | Purpose | Key Data |
|------|---------|----------|
| **Entity Header** | Current entity context + switcher | Entity name, type, identifiers |
| **Attention Required** | Critical/overdue filings | Urgency cards with penalties |
| **Upcoming Deadlines** | Next 30 days timeline | Grouped by date with countdown |
| **Recent Submissions** | Submission history | Status, timestamp, confirmation |
| **Compliance Score** | Overall health metric | Percentage + trend indicator |
| **HMRC Connections** | OAuth status | Connection health by service |
| **Quick Actions** | Common tasks | Context-aware shortcuts |

See `/submission/workflow/dashboard-design.md` for complete specifications including:
- TypeScript interfaces and data models
- React component implementations
- React Query state management patterns
- Loading, error, and empty states
- Accessibility requirements (WCAG 2.1 AA)
- Performance considerations

---

## Sources

### HMRC
- [Self Assessment forms](https://www.gov.uk/self-assessment-forms-and-helpsheets)
- [Company Tax Returns](https://www.gov.uk/company-tax-returns)
- [VAT Returns](https://www.gov.uk/vat-returns)
- [Making Tax Digital](https://www.gov.uk/making-tax-digital)

### Regulators
- [Companies House](https://www.gov.uk/government/organisations/companies-house)
- [Charity Commission](https://www.gov.uk/government/organisations/charity-commission)
- [FCA Mutuals](https://www.fca.org.uk/firms/mutuals)

### Legislation
- Taxes Management Act 1970 (filing requirements)
- Finance Act 1998 Sch.18 (CT returns)
- Finance Act 2021 (VAT penalty reform)

---

*Filing guide created: 2026-02-01*
