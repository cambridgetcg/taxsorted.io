# Entity Layer: Complete Path Map

> **Purpose**: Visual map of all entity types and their paths through the filing system
> **Layer**: 1 of 5 (Foundation Layer)
> **Status**: Complete

---

## Entity Taxonomy Tree

```
                                    ┌─────────────────────────────────────┐
                                    │            ENTITY                    │
                                    │      (Root of all filings)          │
                                    └─────────────────┬───────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
    ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
    │        INDIVIDUAL         │   │       ORGANISATION        │   │          TRUST            │
    │    (Natural Person)       │   │     (Legal Entity)        │   │    (Settlement)           │
    └─────────────┬─────────────┘   └─────────────┬─────────────┘   └─────────────┬─────────────┘
                  │                               │                               │
         ┌────────┴────────┐           ┌─────────┴─────────┐           ┌─────────┴─────────┐
         │                 │           │                   │           │                   │
         ▼                 ▼           ▼                   ▼           ▼                   ▼
    ┌─────────┐      ┌─────────┐ ┌───────────┐      ┌───────────┐ ┌─────────┐      ┌─────────┐
    │Employed │      │  Self-  │ │Partnership│      │  Company  │ │ Taxable │      │Non-Tax- │
    │  Only   │      │Employed │ │           │      │           │ │         │      │  able   │
    └─────────┘      └─────────┘ └─────┬─────┘      └─────┬─────┘ └────┬────┘      └─────────┘
                                       │                  │            │
                                       │                  │            │
    ┌──────────────────────────────────┼──────────────────┼────────────┼──────────────────────────┐
    │                                  │                  │            │                          │
    │        ┌─────────────────────────┼──────────────────┼────────────┘                          │
    │        │                         │                  │                                       │
    │        ▼                         ▼                  ▼                                       │
    │   ┌─────────┐             ┌───────────┐      ┌───────────┐                                  │
    │   │  Bare   │             │Discret-   │      │Interest   │                                  │
    │   │  Trust  │             │ionary     │      │in Poss.   │                                  │
    │   └─────────┘             └───────────┘      └───────────┘                                  │
    │                                                                                             │
    └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Entity Type Map

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ENTITY LAYER MAP                                              │
│                              (All 17 Entity Types Supported)                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║  INDIVIDUALS                                                                               ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                            ║  │
│  ║  ┌─────────────────────────────────┐    ┌─────────────────────────────────┐               ║  │
│  ║  │  INDIVIDUAL-EMPLOYED            │    │  INDIVIDUAL-SELF-EMPLOYED       │               ║  │
│  ║  │  ─────────────────────────────  │    │  ─────────────────────────────  │               ║  │
│  ║  │  Identifiers:                   │    │  Identifiers:                   │               ║  │
│  ║  │  • NINO ✓                       │    │  • NINO ✓                       │               ║  │
│  ║  │  • UTR (if SA required)         │    │  • UTR ✓                        │               ║  │
│  ║  │                                 │    │  • VRN (if VAT reg)             │               ║  │
│  ║  │  Key Attributes:                │    │                                 │               ║  │
│  ║  │  • Income > £150k?              │    │  Key Attributes:                │               ║  │
│  ║  │  • HICBC applicable?            │    │  • Turnover                     │               ║  │
│  ║  │  • Rental income?               │    │  • VAT registered?              │               ║  │
│  ║  │  • Capital gains?               │    │  • Has employees?               │               ║  │
│  ║  │                                 │    │  • MTD ITSA mandated?           │               ║  │
│  ║  │  Primary Filings:               │    │                                 │               ║  │
│  ║  │  • SA100 (maybe)                │    │  Primary Filings:               │               ║  │
│  ║  │                                 │    │  • SA100 / MTD ITSA ✓           │               ║  │
│  ║  │  Path: Simple                   │    │  • VAT100 (if registered)       │               ║  │
│  ║  └─────────────────────────────────┘    │  • PAYE/RTI (if employer)       │               ║  │
│  ║                                         │                                 │               ║  │
│  ║                                         │  Path: Complex                  │               ║  │
│  ║                                         └─────────────────────────────────┘               ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                  │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║  PARTNERSHIPS                                                                              ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                            ║  │
│  ║  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐          ║  │
│  ║  │  GENERAL-PARTNERSHIP  │  │         LLP           │  │  LIMITED-PARTNERSHIP  │          ║  │
│  ║  │  ───────────────────  │  │  ───────────────────  │  │  ───────────────────  │          ║  │
│  ║  │                       │  │                       │  │                       │          ║  │
│  ║  │  Identifiers:         │  │  Identifiers:         │  │  Identifiers:         │          ║  │
│  ║  │  • UTR ✓              │  │  • UTR ✓              │  │  • UTR ✓              │          ║  │
│  ║  │  • VRN (if VAT)       │  │  • CRN ✓              │  │  • CRN ✓              │          ║  │
│  ║  │                       │  │  • VRN (if VAT)       │  │  • VRN (if VAT)       │          ║  │
│  ║  │  Filings:             │  │                       │  │                       │          ║  │
│  ║  │  • SA800 ✓            │  │  Filings:             │  │  Filings:             │          ║  │
│  ║  │  • SA104 (per partner)│  │  • SA800 ✓            │  │  • SA800 ✓            │          ║  │
│  ║  │  • VAT100 (if reg)    │  │  • SA104 (per member) │  │  • SA104 (per partner)│          ║  │
│  ║  │  • PAYE/RTI (if emp)  │  │  • CH Accounts ✓      │  │  • CH Accounts (maybe)│          ║  │
│  ║  │                       │  │  • CS01 ✓             │  │  • CS01 ✓             │          ║  │
│  ║  │  CH Filing: NO        │  │  • VAT100 (if reg)    │  │  • VAT100 (if reg)    │          ║  │
│  ║  └───────────────────────┘  │  • PAYE/RTI (if emp)  │  │  • PAYE/RTI (if emp)  │          ║  │
│  ║                             │                       │  │                       │          ║  │
│  ║                             │  CH Filing: YES       │  │  CH Filing: MAYBE     │          ║  │
│  ║                             └───────────────────────┘  └───────────────────────┘          ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                  │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║  COMPANIES                                                                                 ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                            ║  │
│  ║  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐          ║  │
│  ║  │ PRIVATE-LIMITED-CO    │  │  PUBLIC-LIMITED-CO    │  │         CIC           │          ║  │
│  ║  │  ───────────────────  │  │  ───────────────────  │  │  ───────────────────  │          ║  │
│  ║  │                       │  │                       │  │                       │          ║  │
│  ║  │  Identifiers:         │  │  Identifiers:         │  │  Identifiers:         │          ║  │
│  ║  │  • UTR ✓              │  │  • UTR ✓              │  │  • UTR ✓              │          ║  │
│  ║  │  • CRN ✓              │  │  • CRN ✓              │  │  • CRN ✓              │          ║  │
│  ║  │  • VRN (if VAT)       │  │  • VRN (if VAT)       │  │  • VRN (if VAT)       │          ║  │
│  ║  │                       │  │                       │  │                       │          ║  │
│  ║  │  Filings:             │  │  Filings:             │  │  Filings:             │          ║  │
│  ║  │  • CT600 ✓            │  │  • CT600 ✓            │  │  • CT600 ✓            │          ║  │
│  ║  │  • CH Accounts ✓      │  │  • CH Accounts ✓      │  │  • CH Accounts ✓      │          ║  │
│  ║  │  • CS01 ✓             │  │  • CS01 ✓             │  │  • CS01 ✓             │          ║  │
│  ║  │  • VAT100 (if reg)    │  │  • VAT100 (if reg)    │  │  • CIC Report ✓       │          ║  │
│  ║  │  • PAYE/RTI (if emp)  │  │  • PAYE/RTI (if emp)  │  │  • VAT100 (if reg)    │          ║  │
│  ║  │                       │  │                       │  │  • PAYE/RTI (if emp)  │          ║  │
│  ║  │  Accounts deadline:   │  │  Accounts deadline:   │  │                       │          ║  │
│  ║  │  ARD + 9 months       │  │  ARD + 6 months       │  │  Extra regulator:     │          ║  │
│  ║  └───────────────────────┘  └───────────────────────┘  │  CIC Regulator        │          ║  │
│  ║                                                        └───────────────────────┘          ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                  │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║  CHARITIES                                                                                 ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                            ║  │
│  ║  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐          ║  │
│  ║  │  CHARITABLE-COMPANY   │  │         CIO           │  │ UNINCORP-CHARITY      │          ║  │
│  ║  │  (CLG)                │  │                       │  │                       │          ║  │
│  ║  │  ───────────────────  │  │  ───────────────────  │  │  ───────────────────  │          ║  │
│  ║  │                       │  │                       │  │                       │          ║  │
│  ║  │  Identifiers:         │  │  Identifiers:         │  │  Identifiers:         │          ║  │
│  ║  │  • UTR (if trading)   │  │  • Charity No ✓       │  │  • Charity No ✓       │          ║  │
│  ║  │  • CRN ✓              │  │  • VRN (if VAT)       │  │  • VRN (if VAT)       │          ║  │
│  ║  │  • Charity No ✓       │  │                       │  │                       │          ║  │
│  ║  │  • VRN (if VAT)       │  │  Filings:             │  │  Filings:             │          ║  │
│  ║  │                       │  │  • CC Annual Return ✓ │  │  • CC Annual Return ✓ │          ║  │
│  ║  │  Filings:             │  │  • CC Accounts        │  │  • CC Accounts        │          ║  │
│  ║  │  • CT600 (if trading) │  │    (if >£25k)         │  │    (if >£25k)         │          ║  │
│  ║  │  • CH Accounts ✓      │  │  • VAT100 (if reg)    │  │  • VAT100 (if reg)    │          ║  │
│  ║  │  • CS01 ✓             │  │  • PAYE/RTI (if emp)  │  │  • PAYE/RTI (if emp)  │          ║  │
│  ║  │  • CC Annual Return ✓ │  │                       │  │                       │          ║  │
│  ║  │  • CC Accounts (>£25k)│  │  NO Companies House   │  │  NO Companies House   │          ║  │
│  ║  │  • VAT100 (if reg)    │  │  NO Corporation Tax   │  │  NO Corporation Tax   │          ║  │
│  ║  │  • PAYE/RTI (if emp)  │  │                       │  │  (unless trading)     │          ║  │
│  ║  │                       │  │                       │  │                       │          ║  │
│  ║  │  3 regulators!        │  │  1 regulator          │  │  1 regulator          │          ║  │
│  ║  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘          ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                  │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║  TRUSTS                                                                                    ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                            ║  │
│  ║  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐          ║  │
│  ║  │  DISCRETIONARY-TRUST  │  │  BARE-TRUST           │  │  INTEREST-IN-POSS     │          ║  │
│  ║  │  ───────────────────  │  │  ───────────────────  │  │  ───────────────────  │          ║  │
│  ║  │                       │  │                       │  │                       │          ║  │
│  ║  │  Identifiers:         │  │  Identifiers:         │  │  Identifiers:         │          ║  │
│  ║  │  • UTR ✓              │  │  • UTR (maybe)        │  │  • UTR ✓              │          ║  │
│  ║  │  • TRS ID ✓           │  │  • TRS ID ✓           │  │  • TRS ID ✓           │          ║  │
│  ║  │                       │  │                       │  │                       │          ║  │
│  ║  │  Tax Status: TAXABLE  │  │  Tax Status:          │  │  Tax Status: TAXABLE  │          ║  │
│  ║  │                       │  │  Usually NOT taxable  │  │                       │          ║  │
│  ║  │  Filings:             │  │  (beneficiary taxed)  │  │  Filings:             │          ║  │
│  ║  │  • SA900 ✓            │  │                       │  │  • SA900 ✓            │          ║  │
│  ║  │  • TRS Registration ✓ │  │  Filings:             │  │  • TRS Registration ✓ │          ║  │
│  ║  │  • TRS Update ✓       │  │  • TRS Registration ✓ │  │  • TRS Update ✓       │          ║  │
│  ║  │  • IHT100 (events)    │  │  • TRS Update         │  │  • IHT100 (events)    │          ║  │
│  ║  │  • CGT 60-day         │  │    (if changes)       │  │  • CGT 60-day         │          ║  │
│  ║  │    (property sales)   │  │                       │  │    (property sales)   │          ║  │
│  ║  │                       │  │  NO SA900             │  │                       │          ║  │
│  ║  │  API: Portal only!    │  │  API: Portal only!    │  │  API: Portal only!    │          ║  │
│  ║  └───────────────────────┘  └───────────────────────┘  └───────────────────────┘          ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                  │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║  MUTUALS (FCA Registered)                                                                  ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                            ║  │
│  ║  ┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐         ║  │
│  ║  │  COOPERATIVE-SOCIETY                │  │  COMMUNITY-BENEFIT-SOCIETY          │         ║  │
│  ║  │  ───────────────────────────────    │  │  ───────────────────────────────    │         ║  │
│  ║  │                                     │  │                                     │         ║  │
│  ║  │  Identifiers:                       │  │  Identifiers:                       │         ║  │
│  ║  │  • UTR ✓                            │  │  • UTR ✓                            │         ║  │
│  ║  │  • FRN (FCA number) ✓               │  │  • FRN (FCA number) ✓               │         ║  │
│  ║  │  • VRN (if VAT)                     │  │  • Charity No (if charitable)       │         ║  │
│  ║  │                                     │  │  • VRN (if VAT)                     │         ║  │
│  ║  │  Filings:                           │  │                                     │         ║  │
│  ║  │  • CT600 ✓                          │  │  Filings:                           │         ║  │
│  ║  │  • FCA Annual Return ✓              │  │  • CT600 (unless exempt)            │         ║  │
│  ║  │  • VAT100 (if reg)                  │  │  • FCA Annual Return ✓              │         ║  │
│  ║  │  • PAYE/RTI (if emp)                │  │  • CC Annual Return (if charitable) │         ║  │
│  ║  │                                     │  │  • VAT100 (if reg)                  │         ║  │
│  ║  │  Regulator: FCA                     │  │  • PAYE/RTI (if emp)                │         ║  │
│  ║  │  NO Companies House                 │  │                                     │         ║  │
│  ║  │                                     │  │  Regulators: FCA + maybe CC         │         ║  │
│  ║  └─────────────────────────────────────┘  └─────────────────────────────────────┘         ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity → Filing Path Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            ENTITY → FILING PATHS                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│                                                                                                  │
│   ENTITY TYPE                   MANDATORY FILINGS                  CONDITIONAL FILINGS          │
│   ───────────                   ─────────────────                  ────────────────────          │
│                                                                                                  │
│                                        HMRC TAX                                                  │
│                                        ────────                                                  │
│   Individual (Employed)    ─────────►  SA100 ────────────────────► (if criteria met)            │
│                                                                                                  │
│   Individual (Self-Emp)    ─────────►  SA100 / MTD ITSA ─────────► VAT100, PAYE/RTI             │
│                                                                                                  │
│   General Partnership      ─────────►  SA800 ────────────────────► VAT100, PAYE/RTI             │
│                                        + SA104 (each partner)                                    │
│                                                                                                  │
│   LLP                      ─────────►  SA800 ────────────────────► VAT100, PAYE/RTI             │
│                                        + SA104 (each member)                                     │
│                                                                                                  │
│   Private Ltd Company      ─────────►  CT600 ────────────────────► VAT100, PAYE/RTI             │
│                                                                                                  │
│   Public Ltd Company       ─────────►  CT600 ────────────────────► VAT100, PAYE/RTI             │
│                                                                                                  │
│   CIC                      ─────────►  CT600 ────────────────────► VAT100, PAYE/RTI             │
│                                                                                                  │
│   Charitable Company       ─────────►  CT600 (if trading) ───────► VAT100, PAYE/RTI             │
│                                                                                                  │
│   CIO                      ─────────►  (none) ───────────────────► VAT100, PAYE/RTI             │
│                                                                                                  │
│   Trust (Taxable)          ─────────►  SA900 ────────────────────► IHT100, CGT 60-day           │
│                                                                                                  │
│   Co-operative             ─────────►  CT600 ────────────────────► VAT100, PAYE/RTI             │
│                                                                                                  │
│   Community Benefit Soc    ─────────►  CT600 (unless exempt) ────► VAT100, PAYE/RTI             │
│                                                                                                  │
│                                                                                                  │
│                                    COMPANIES HOUSE                                               │
│                                    ───────────────                                               │
│   LLP                      ─────────►  Accounts + CS01                                           │
│                                                                                                  │
│   Private Ltd Company      ─────────►  Accounts + CS01                                           │
│                                                                                                  │
│   Public Ltd Company       ─────────►  Accounts + CS01                                           │
│                                                                                                  │
│   CIC                      ─────────►  Accounts + CS01 + CIC Report                              │
│                                                                                                  │
│   Charitable Company       ─────────►  Accounts + CS01                                           │
│                                                                                                  │
│   Limited Partnership      ─────────►  CS01 (+ maybe Accounts)                                   │
│                                                                                                  │
│                                                                                                  │
│                                   CHARITY COMMISSION                                             │
│                                   ──────────────────                                             │
│   Charitable Company       ─────────►  CC Annual Return + CC Accounts                            │
│                                                                                                  │
│   CIO                      ─────────►  CC Annual Return + CC Accounts                            │
│                                                                                                  │
│   Unincorp Charity         ─────────►  CC Annual Return + CC Accounts                            │
│                                                                                                  │
│   Community Benefit Soc    ─────────►  CC Annual Return (if charitable)                          │
│                                                                                                  │
│                                                                                                  │
│                                          FCA                                                     │
│                                          ───                                                     │
│   Co-operative             ─────────►  FCA Annual Return                                         │
│                                                                                                  │
│   Community Benefit Soc    ─────────►  FCA Annual Return                                         │
│                                                                                                  │
│                                                                                                  │
│                                   TRUST REGISTRATION                                             │
│                                   ──────────────────                                             │
│   All Trusts               ─────────►  TRS Registration + TRS Update                             │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity Attributes Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         ATTRIBUTE DECISION TREE                                                  │
│                    (How attributes affect filing requirements)                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│                                                                                                  │
│                               ┌─────────────────────┐                                            │
│                               │   ANY ENTITY TYPE   │                                            │
│                               └──────────┬──────────┘                                            │
│                                          │                                                       │
│                    ┌─────────────────────┼─────────────────────┐                                │
│                    │                     │                     │                                │
│                    ▼                     ▼                     ▼                                │
│           ┌───────────────┐     ┌───────────────┐     ┌───────────────┐                         │
│           │ VAT Registered│     │ Has Employees │     │   Turnover    │                         │
│           │      ?        │     │      ?        │     │   >£50k?      │                         │
│           └───────┬───────┘     └───────┬───────┘     └───────┬───────┘                         │
│                   │                     │                     │                                  │
│           ┌───────┴───────┐     ┌───────┴───────┐     ┌───────┴───────┐                         │
│           │               │     │               │     │               │                         │
│           ▼               ▼     ▼               ▼     ▼               ▼                         │
│        ┌─────┐         ┌─────┐ ┌─────┐      ┌─────┐ ┌─────┐      ┌─────┐                        │
│        │ YES │         │ NO  │ │ YES │      │ NO  │ │ YES │      │ NO  │                        │
│        └──┬──┘         └──┬──┘ └──┬──┘      └──┬──┘ └──┬──┘      └──┬──┘                        │
│           │               │       │             │       │             │                          │
│           ▼               ▼       ▼             ▼       ▼             ▼                          │
│      ┌─────────┐     ┌────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐ ┌────────┐                   │
│      │ VAT100  │     │No VAT  │ │PAYE FPS │ │No PAYE │ │MTD ITSA │ │Optional│                   │
│      │Quarterly│     │filings │ │PAYE EPS │ │filings │ │Mandated │ │MTD ITSA│                   │
│      │via MTD  │     │        │ │P11D, P60│ │        │ │from 2026│ │        │                   │
│      └─────────┘     └────────┘ └─────────┘ └────────┘ └─────────┘ └────────┘                   │
│                                                                                                  │
│                                                                                                  │
│   FOR INDIVIDUALS SPECIFICALLY:                                                                  │
│   ─────────────────────────────                                                                  │
│                                                                                                  │
│                               ┌─────────────────────┐                                            │
│                               │     INDIVIDUAL      │                                            │
│                               └──────────┬──────────┘                                            │
│                                          │                                                       │
│                         ┌────────────────┼────────────────┐                                     │
│                         │                │                │                                     │
│                         ▼                ▼                ▼                                     │
│                  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                              │
│                  │Self-employed│  │Income >£150k│  │Rental income│                              │
│                  │     ?       │  │     ?       │  │     ?       │                              │
│                  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                              │
│                         │                │                │                                      │
│                    ┌────┴────┐      ┌────┴────┐      ┌────┴────┐                                │
│                    │         │      │         │      │         │                                │
│                    ▼         ▼      ▼         ▼      ▼         ▼                                │
│                 ┌─────┐   ┌─────┐ ┌─────┐  ┌─────┐ ┌─────┐  ┌─────┐                             │
│                 │ YES │   │ NO  │ │ YES │  │ NO  │ │ YES │  │ NO  │                             │
│                 └──┬──┘   └──┬──┘ └──┬──┘  └──┬──┘ └──┬──┘  └──┬──┘                             │
│                    │         │       │         │       │         │                               │
│                    ▼         │       ▼         │       ▼         │                               │
│               ┌─────────┐    │  ┌─────────┐    │  ┌─────────┐    │                              │
│               │  SA100  │    │  │  SA100  │    │  │  SA100  │    │                              │
│               │Required │    │  │Required │    │  │Required │    │                              │
│               │+ SA103  │    │  │         │    │  │+ SA105  │    │                              │
│               └─────────┘    │  └─────────┘    │  └─────────┘    │                              │
│                              │                 │                 │                               │
│                              └────────┬────────┴────────┬────────┘                              │
│                                       │                 │                                        │
│                                       ▼                 ▼                                        │
│                                  ┌─────────────────────────┐                                    │
│                                  │   CHECK OTHER CRITERIA  │                                    │
│                                  │   • Capital gains?      │                                    │
│                                  │   • Foreign income?     │                                    │
│                                  │   • HICBC applicable?   │                                    │
│                                  │   • Untaxed income?     │                                    │
│                                  └─────────────────────────┘                                    │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity Identifier Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              IDENTIFIER REQUIREMENTS BY ENTITY                                   │
├───────────────────────┬──────┬──────┬──────┬──────┬─────────┬──────┬──────┬──────┬─────────────┤
│ Entity Type           │ NINO │ UTR  │ VRN  │ CRN  │CharityNo│ FRN  │TRS ID│ PAYE │ Notes       │
├───────────────────────┼──────┼──────┼──────┼──────┼─────────┼──────┼──────┼──────┼─────────────┤
│ Individual (Employed) │  ✓   │ (✓)  │  -   │  -   │    -    │  -   │  -   │  -   │UTR if SA    │
│ Individual (Self-Emp) │  ✓   │  ✓   │ (✓)  │  -   │    -    │  -   │  -   │ (✓)  │VRN/PAYE opt │
│ General Partnership   │  -   │  ✓   │ (✓)  │  -   │    -    │  -   │  -   │ (✓)  │             │
│ LLP                   │  -   │  ✓   │ (✓)  │  ✓   │    -    │  -   │  -   │ (✓)  │             │
│ Limited Partnership   │  -   │  ✓   │ (✓)  │  ✓   │    -    │  -   │  -   │ (✓)  │             │
│ Private Ltd Company   │  -   │  ✓   │ (✓)  │  ✓   │    -    │  -   │  -   │ (✓)  │             │
│ Public Ltd Company    │  -   │  ✓   │ (✓)  │  ✓   │    -    │  -   │  -   │ (✓)  │             │
│ CIC                   │  -   │  ✓   │ (✓)  │  ✓   │    -    │  -   │  -   │ (✓)  │             │
│ Charitable Company    │  -   │ (✓)  │ (✓)  │  ✓   │    ✓    │  -   │  -   │ (✓)  │UTR if trade │
│ CIO                   │  -   │  -   │ (✓)  │  -   │    ✓    │  -   │  -   │ (✓)  │No UTR/CRN   │
│ Unincorp Charity      │  -   │  -   │ (✓)  │  -   │   (✓)   │  -   │  -   │ (✓)  │If registered│
│ Discretionary Trust   │  -   │  ✓   │  -   │  -   │    -    │  -   │  ✓   │  -   │             │
│ Bare Trust            │  -   │ (✓)  │  -   │  -   │    -    │  -   │  ✓   │  -   │UTR if taxed │
│ Interest in Poss      │  -   │  ✓   │  -   │  -   │    -    │  -   │  ✓   │  -   │             │
│ Co-operative Society  │  -   │  ✓   │ (✓)  │  -   │    -    │  ✓   │  -   │ (✓)  │             │
│ Comm Benefit Society  │  -   │  ✓   │ (✓)  │  -   │   (✓)   │  ✓   │  -   │ (✓)  │             │
├───────────────────────┴──────┴──────┴──────┴──────┴─────────┴──────┴──────┴──────┴─────────────┤
│ Legend: ✓ = Required, (✓) = Conditional/Optional, - = Not Applicable                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Entity to Regulator Mapping

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY → REGULATOR RELATIONSHIPS                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│                                                                                                  │
│                           ┌──────────────────────────────────────────────────────────────────┐  │
│                           │                           HMRC                                   │  │
│                           │               (All entities with tax obligations)                │  │
│                           │                                                                  │  │
│    ┌──────────────────────┼──────────────────────┼──────────────────────┼─────────────────┐  │  │
│    │                      │                      │                      │                 │  │  │
│    ▼                      ▼                      ▼                      ▼                 │  │  │
│  Individual            Partnership            Company               Trust                 │  │  │
│  (SA100/MTD)           (SA800)               (CT600)               (SA900)               │  │  │
│                                                                                           │  │  │
│                           └──────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│                           ┌──────────────────────────────────────────────────────────────────┐  │
│                           │                     COMPANIES HOUSE                              │  │
│                           │           (Companies, LLPs, Limited Partnerships)                │  │
│                           │                                                                  │  │
│    ┌──────────────────────┼──────────────────────┼──────────────────────┐                    │  │
│    │                      │                      │                      │                    │  │
│    ▼                      ▼                      ▼                      │                    │  │
│   LLP                 Private Ltd          Public Ltd               CIC                     │  │
│ (Accounts+CS)        (Accounts+CS)        (Accounts+CS)         (Accounts+CS)               │  │
│                                                                                              │  │
│                           └──────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│                           ┌──────────────────────────────────────────────────────────────────┐  │
│                           │                   CHARITY COMMISSION                             │  │
│                           │               (Charities registered in E&W)                      │  │
│                           │                                                                  │  │
│    ┌──────────────────────┼──────────────────────┼──────────────────────┐                    │  │
│    │                      │                      │                      │                    │  │
│    ▼                      ▼                      ▼                      │                    │  │
│  Charitable             CIO                Unincorporated          Charitable               │  │
│  Company           (CC only)                Charity                  CBS                    │  │
│ (CC + CH)                                   (CC only)                                        │  │
│                           └──────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│                           ┌──────────────────────────────────────────────────────────────────┐  │
│                           │                          FCA                                     │  │
│                           │              (Co-operatives, Benefit Societies)                  │  │
│                           │                                                                  │  │
│    ┌──────────────────────┼──────────────────────┐                                          │  │
│    │                      │                      │                                          │  │
│    ▼                      ▼                      │                                          │  │
│  Co-operative        Community                                                              │  │
│  Society             Benefit Soc                                                            │  │
│                                                                                              │  │
│                           └──────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│                           ┌──────────────────────────────────────────────────────────────────┐  │
│                           │                      CIC REGULATOR                               │  │
│                           │                   (CICs only)                                    │  │
│                           │                                                                  │  │
│    ┌──────────────────────┤                                                                 │  │
│    │                      │                                                                 │  │
│    ▼                      │                                                                 │  │
│   CIC                     │                                                                 │  │
│ (CIC Report)              │                                                                 │  │
│                           └──────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│                                                                                                  │
│   MULTI-REGULATOR ENTITIES:                                                                     │
│   ─────────────────────────                                                                     │
│                                                                                                  │
│   • Charitable Company (CLG): HMRC + Companies House + Charity Commission (3 regulators)        │
│   • CIC: HMRC + Companies House + CIC Regulator (3 regulators)                                  │
│   • Charitable CBS: HMRC + FCA + Charity Commission (3 regulators)                              │
│   • LLP: HMRC + Companies House (2 regulators)                                                  │
│   • Standard Company: HMRC + Companies House (2 regulators)                                     │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Filing Complexity Score by Entity

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                            FILING COMPLEXITY SCORE                                               │
│                         (Number of potential filings)                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   Entity Type                    Regulators  Core Filings  Conditional  Total   Complexity      │
│   ───────────────────────────    ──────────  ────────────  ───────────  ─────   ──────────      │
│                                                                                                  │
│   Individual (Employed)              1            0             1          1    ★☆☆☆☆ (1)       │
│   Individual (Self-Employed)         1            1             3          4    ★★☆☆☆ (2)       │
│   General Partnership                1            1             2          3    ★★☆☆☆ (2)       │
│   LLP                                2            3             2          5    ★★★☆☆ (3)       │
│   Limited Partnership                2            2             2          4    ★★☆☆☆ (2)       │
│   Private Limited Company            2            3             2          5    ★★★☆☆ (3)       │
│   Public Limited Company             2            3             2          5    ★★★☆☆ (3)       │
│   CIC                                3            4             2          6    ★★★★☆ (4)       │
│   Charitable Company (CLG)           3            5             3          8    ★★★★★ (5)       │
│   CIO                                1            2             2          4    ★★☆☆☆ (2)       │
│   Unincorporated Charity             1            2             2          4    ★★☆☆☆ (2)       │
│   Discretionary Trust                1            3             2          5    ★★★☆☆ (3)       │
│   Bare Trust                         1            1             1          2    ★☆☆☆☆ (1)       │
│   Interest in Possession Trust       1            3             2          5    ★★★☆☆ (3)       │
│   Co-operative Society               2            2             2          4    ★★☆☆☆ (2)       │
│   Community Benefit Society          2-3          2-3           2          4-6  ★★★☆☆ (3)       │
│                                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                                  │
│   HIGHEST COMPLEXITY: Charitable Company (CLG) - 3 regulators, 5+ mandatory filings             │
│   LOWEST COMPLEXITY: Individual (Employed) - 1 regulator, 0-1 filings                           │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation: Entity Layer TypeScript

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY LAYER - COMPLETE TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

type EntityCategory = 'individual' | 'partnership' | 'company' | 'charity' | 'trust' | 'mutual';

type EntityType =
  // Individuals
  | 'individual-employed'
  | 'individual-self-employed'
  // Partnerships
  | 'general-partnership'
  | 'llp'
  | 'limited-partnership'
  // Companies
  | 'private-limited-company'
  | 'public-limited-company'
  | 'cic'
  // Charities
  | 'charitable-company'
  | 'cio'
  | 'unincorporated-charity'
  // Trusts
  | 'discretionary-trust'
  | 'bare-trust'
  | 'interest-in-possession-trust'
  // Mutuals
  | 'cooperative-society'
  | 'community-benefit-society';

// ─────────────────────────────────────────────────────────────────────────────
// IDENTIFIERS
// ─────────────────────────────────────────────────────────────────────────────

interface EntityIdentifiers {
  // HMRC Identifiers
  nino?: string;              // National Insurance Number (individuals)
  utr?: string;               // Unique Taxpayer Reference (10 digits)
  vrn?: string;               // VAT Registration Number (9 digits)
  payeRef?: string;           // PAYE Reference (e.g., 123/AB12345)

  // Companies House
  crn?: string;               // Company Registration Number (8 chars)

  // Charity Commission
  charityNumber?: string;     // Registered charity number

  // FCA
  frnNumber?: string;         // Financial Reference Number

  // Trust Registration Service
  trsId?: string;             // TRS unique reference
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTRIBUTES (Affect filing requirements)
// ─────────────────────────────────────────────────────────────────────────────

interface EntityAttributes {
  // VAT Status
  vatRegistered: boolean;
  vatScheme?: 'standard' | 'flat-rate' | 'annual-accounting' | 'cash-accounting';
  vatStaggerGroup?: 1 | 2 | 3;  // Determines VAT period ends

  // Employment Status
  hasEmployees: boolean;
  employeeCount?: number;
  payrollFrequency?: 'weekly' | 'fortnightly' | 'four-weekly' | 'monthly';

  // Financial
  turnover?: number;
  grossAssets?: number;

  // MTD Status
  mtdVatMandated: boolean;
  mtdItsaMandated: boolean;
  mtdItsaVoluntary: boolean;

  // Accounting
  accountingPeriodEnd?: Date;
  accountingReferenceDate?: string;  // e.g., "31 March"
  firstAccountingPeriod?: boolean;

  // Special Status
  dormant?: boolean;
  inLiquidation?: boolean;
  exempt?: boolean;

  // Individual-specific
  selfEmployed?: boolean;
  hasRentalIncome?: boolean;
  hasCapitalGains?: boolean;
  highIncomeChildBenefit?: boolean;
  incomeOver150k?: boolean;

  // Trust-specific
  taxableTrust?: boolean;

  // Charity-specific
  isTrading?: boolean;
  incomeOver25k?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTITY INTERFACE
// ─────────────────────────────────────────────────────────────────────────────

interface Entity {
  id: string;
  type: EntityType;
  category: EntityCategory;

  // Display
  name: string;
  tradingName?: string;

  // Identifiers
  identifiers: EntityIdentifiers;

  // Attributes (determine filings)
  attributes: EntityAttributes;

  // Address
  registeredAddress?: Address;
  tradingAddress?: Address;

  // Key dates
  incorporationDate?: Date;
  commencementDate?: Date;

  // Contacts
  contacts: Contact[];

  // Related entities
  relatedEntities?: RelatedEntity[];

  // Agent relationship
  agentId?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORTING TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Address {
  line1: string;
  line2?: string;
  line3?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

interface Contact {
  id: string;
  name: string;
  role: 'director' | 'partner' | 'trustee' | 'secretary' | 'accountant' | 'primary';
  email: string;
  phone?: string;
  isPrimary: boolean;
}

interface RelatedEntity {
  entityId: string;
  relationship: 'subsidiary' | 'parent' | 'partner' | 'member' | 'beneficiary' | 'settlor' | 'trustee';
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY FACTORY
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_CATEGORY_MAP: Record<EntityType, EntityCategory> = {
  'individual-employed': 'individual',
  'individual-self-employed': 'individual',
  'general-partnership': 'partnership',
  'llp': 'partnership',
  'limited-partnership': 'partnership',
  'private-limited-company': 'company',
  'public-limited-company': 'company',
  'cic': 'company',
  'charitable-company': 'charity',
  'cio': 'charity',
  'unincorporated-charity': 'charity',
  'discretionary-trust': 'trust',
  'bare-trust': 'trust',
  'interest-in-possession-trust': 'trust',
  'cooperative-society': 'mutual',
  'community-benefit-society': 'mutual',
};

function createEntity(type: EntityType, data: Partial<Entity>): Entity {
  return {
    id: generateId(),
    type,
    category: ENTITY_CATEGORY_MAP[type],
    name: data.name || '',
    identifiers: data.identifiers || {},
    attributes: {
      vatRegistered: false,
      hasEmployees: false,
      mtdVatMandated: false,
      mtdItsaMandated: false,
      mtdItsaVoluntary: false,
      ...data.attributes
    },
    contacts: data.contacts || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: data.createdBy || 'system',
    ...data
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTITY VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

function validateEntity(entity: Entity): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required identifiers by type
  const requiredIdentifiers = getRequiredIdentifiers(entity.type);
  for (const id of requiredIdentifiers) {
    if (!entity.identifiers[id as keyof EntityIdentifiers]) {
      errors.push({
        field: `identifiers.${id}`,
        message: `${id.toUpperCase()} is required for ${entity.type}`,
        code: 'MISSING_IDENTIFIER'
      });
    }
  }

  // Validate identifier formats
  if (entity.identifiers.nino && !isValidNINO(entity.identifiers.nino)) {
    errors.push({
      field: 'identifiers.nino',
      message: 'Invalid NINO format',
      code: 'INVALID_NINO'
    });
  }

  if (entity.identifiers.utr && !isValidUTR(entity.identifiers.utr)) {
    errors.push({
      field: 'identifiers.utr',
      message: 'Invalid UTR format (must be 10 digits)',
      code: 'INVALID_UTR'
    });
  }

  // VAT registration consistency
  if (entity.attributes.vatRegistered && !entity.identifiers.vrn) {
    errors.push({
      field: 'identifiers.vrn',
      message: 'VRN required when VAT registered',
      code: 'MISSING_VRN'
    });
  }

  // Employee consistency
  if (entity.attributes.hasEmployees && !entity.identifiers.payeRef) {
    warnings.push({
      field: 'identifiers.payeRef',
      message: 'PAYE reference not provided',
      suggestion: 'Add PAYE reference if employer'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function getRequiredIdentifiers(type: EntityType): string[] {
  switch (type) {
    case 'individual-employed':
      return ['nino'];
    case 'individual-self-employed':
      return ['nino', 'utr'];
    case 'general-partnership':
      return ['utr'];
    case 'llp':
    case 'limited-partnership':
      return ['utr', 'crn'];
    case 'private-limited-company':
    case 'public-limited-company':
    case 'cic':
      return ['utr', 'crn'];
    case 'charitable-company':
      return ['crn', 'charityNumber'];
    case 'cio':
      return ['charityNumber'];
    case 'unincorporated-charity':
      return [];  // May not be registered
    case 'discretionary-trust':
    case 'interest-in-possession-trust':
      return ['utr', 'trsId'];
    case 'bare-trust':
      return ['trsId'];
    case 'cooperative-society':
    case 'community-benefit-society':
      return ['utr', 'frnNumber'];
    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function isValidNINO(nino: string): boolean {
  return /^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i.test(nino);
}

function isValidUTR(utr: string): boolean {
  return /^\d{10}$/.test(utr);
}

function isValidVRN(vrn: string): boolean {
  return /^\d{9}$/.test(vrn);
}

function isValidCRN(crn: string): boolean {
  return /^[A-Z]{2}\d{6}$|^\d{8}$/i.test(crn);
}

function generateId(): string {
  return `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

---

*Entity Layer Map created: 2026-02-01*
*Layer 1 of 5: Foundation complete*
