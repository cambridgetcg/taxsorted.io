# Phase 2: Property Business API Integration Specification

> **Priority**: 5
> **Complexity**: Medium
> **Status**: Live (MTD ITSA mandatory from April 2026 for >£50k)

---

## Overview

| Aspect | Detail |
|--------|--------|
| **API Name** | Property Business (MTD) |
| **Version** | 6.0 |
| **Type** | REST |
| **Base URL (Sandbox)** | `https://test-api.service.hmrc.gov.uk` |
| **Base URL (Production)** | `https://api.service.hmrc.gov.uk` |
| **Authentication** | OAuth 2.0 |
| **Fraud Headers** | Mandatory |

---

## Purpose

Submit property rental income and expenses for:
- UK property (standard residential, FHL)
- Foreign property
- Quarterly updates
- Annual summaries

---

## Property Types

| Type | Description | API Path Segment |
|------|-------------|------------------|
| **UK Non-FHL** | Standard UK rental property | `uk-property-non-fhl` |
| **UK FHL** | UK Furnished Holiday Lettings | `uk-property-fhl` |
| **Foreign Non-FHL** | Overseas rental property | `foreign-property-non-fhl` |
| **Foreign FHL** | EEA Furnished Holiday Lettings | `foreign-property-fhl` |

---

## Endpoints

### 1. Create Period Summary (UK Property)

**Purpose**: Submit quarterly income and expenses

```
POST /individuals/business/property/{nino}/{businessId}/period/{typeOfBusiness}
```

**Path Parameters**:
| Parameter | Description |
|-----------|-------------|
| `nino` | National Insurance Number |
| `businessId` | Business ID from Business Details API |
| `typeOfBusiness` | Property type (see above) |

**Request Body (UK Non-FHL)**:
```json
{
  "fromDate": "2024-04-06",
  "toDate": "2024-07-05",
  "income": {
    "periodAmount": 15000.00,
    "premiumsOfLeaseGrant": 0.00,
    "reversePremiums": 0.00,
    "otherIncome": 200.00,
    "taxDeducted": 0.00,
    "rentARoom": {
      "amountClaimed": 0.00
    }
  },
  "expenses": {
    "premisesRunningCosts": 2000.00,
    "repairsAndMaintenance": 1500.00,
    "financialCosts": 3000.00,
    "professionalFees": 500.00,
    "costOfServices": 300.00,
    "travelCosts": 200.00,
    "other": 400.00,
    "residentialFinancialCost": 2500.00,
    "residentialFinancialCostsCarriedForward": 0.00,
    "rentARoom": {
      "amountClaimed": 0.00
    }
  }
}
```

**Response** (201 Created):
```json
{
  "submissionId": "4557ecb5-fd32-48cc-81f5-e6acd1099f3c"
}
```

---

### 2. Create Period Summary (Foreign Property)

**Request Body (Foreign Non-FHL)**:
```json
{
  "fromDate": "2024-04-06",
  "toDate": "2024-07-05",
  "income": {
    "periodAmount": 8000.00,
    "premiumsOfLeaseGrant": 0.00,
    "otherIncome": 0.00,
    "foreignTaxPaidOrDeducted": 800.00,
    "specialWithholdingTaxOrUkTaxPaid": 0.00
  },
  "expenses": {
    "premisesRunningCosts": 1000.00,
    "repairsAndMaintenance": 500.00,
    "financialCosts": 1500.00,
    "professionalFees": 300.00,
    "costOfServices": 200.00,
    "travelCosts": 400.00,
    "other": 100.00,
    "residentialFinancialCost": 1200.00,
    "broughtFwdResidentialFinancialCost": 0.00
  }
}
```

---

### 3. Amend Period Summary

```
PUT /individuals/business/property/{nino}/{businessId}/period/{typeOfBusiness}/{submissionId}
```

---

### 4. Retrieve Period Summary

```
GET /individuals/business/property/{nino}/{businessId}/period/{typeOfBusiness}/{submissionId}
```

---

### 5. List Period Summaries

```
GET /individuals/business/property/{nino}/{businessId}/period/{typeOfBusiness}
```

**Response**:
```json
{
  "submissions": [
    {
      "submissionId": "4557ecb5-fd32-48cc-81f5-e6acd1099f3c",
      "fromDate": "2024-04-06",
      "toDate": "2024-07-05"
    }
  ]
}
```

---

### 6. Retrieve Annual Summary

```
GET /individuals/business/property/{nino}/{businessId}/annual/{typeOfBusiness}/{taxYear}
```

**Response (UK Non-FHL)**:
```json
{
  "adjustments": {
    "privateUseAdjustment": 500.00,
    "balancingCharge": 0.00,
    "periodOfGraceAdjustment": false,
    "businessPremisesRenovationAllowanceBalancingCharges": 0.00,
    "nonResidentLandlord": false,
    "ukRentARoom": {
      "jointlyLet": false
    }
  },
  "allowances": {
    "annualInvestmentAllowance": 5000.00,
    "zeroEmissionsGoodsVehicleAllowance": 0.00,
    "businessPremisesRenovationAllowance": 0.00,
    "otherCapitalAllowance": 0.00,
    "costOfReplacingDomesticGoods": 1500.00,
    "propertyIncomeAllowance": 0.00,
    "electricChargePointAllowance": 0.00,
    "structuredBuildingAllowance": 0.00,
    "enhancedStructuredBuildingAllowance": 0.00,
    "zeroEmissionsCarAllowance": 0.00
  }
}
```

---

### 7. Update Annual Summary

```
PUT /individuals/business/property/{nino}/{businessId}/annual/{typeOfBusiness}/{taxYear}
```

---

## Income Categories

### UK Property Income

| Field | SA105 Box | Description |
|-------|-----------|-------------|
| `periodAmount` | Box 5 | Rent and receipts |
| `premiumsOfLeaseGrant` | Box 6 | Lease premiums |
| `reversePremiums` | Box 7 | Reverse premiums |
| `otherIncome` | Box 8 | Other property income |
| `taxDeducted` | Box 9 | Tax already deducted |

### Rent-a-Room

| Field | Description |
|-------|-------------|
| `rentARoom.amountClaimed` | Rent-a-room relief (up to £7,500) |

---

## Expense Categories

### UK Property Expenses

| Field | SA105 Box | Description |
|-------|-----------|-------------|
| `premisesRunningCosts` | Box 13 | Rent, rates, insurance |
| `repairsAndMaintenance` | Box 14 | Repairs |
| `financialCosts` | Box 15 | Loan interest (pre-2017 rules) |
| `professionalFees` | Box 16 | Legal, management, accountancy |
| `costOfServices` | Box 17 | Gardening, cleaning, etc. |
| `travelCosts` | Box 18 | Travel to properties |
| `other` | Box 19 | Other allowable expenses |

### Residential Finance Costs

| Field | Description |
|-------|-------------|
| `residentialFinancialCost` | Finance costs for 20% tax credit |
| `residentialFinancialCostsCarriedForward` | Unused relief |

**Note**: Since 2020-21, residential finance costs give 20% tax credit, not deduction.

---

## Allowances

| Allowance | Description |
|-----------|-------------|
| `annualInvestmentAllowance` | AIA on plant & machinery |
| `costOfReplacingDomesticGoods` | Replacement furniture relief |
| `propertyIncomeAllowance` | £1,000 trading allowance |
| `structuredBuildingAllowance` | Commercial building relief |
| `zeroEmissionsCarAllowance` | Electric car 100% |

---

## FHL vs Non-FHL

### Furnished Holiday Lettings

| Aspect | Non-FHL | FHL |
|--------|---------|-----|
| **Finance costs** | 20% tax credit | Full deduction |
| **Capital gains** | Standard rules | Business asset reliefs |
| **Loss relief** | Against property income | Against total income |
| **Pension contributions** | Not relevant earnings | Relevant earnings |

### FHL Qualifying Criteria

| Test | Requirement |
|------|-------------|
| **Availability** | Available 210+ days/year |
| **Letting** | Let 105+ days/year |
| **Pattern of occupation** | No >31 day lets exceeding 155 days total |

---

## Data Model

### Property Business Entity

```typescript
interface PropertyBusiness {
  id: string;
  clientId: string;
  nino: string;
  businessId: string; // From HMRC

  propertyType: 'uk-non-fhl' | 'uk-fhl' | 'foreign-non-fhl' | 'foreign-fhl';

  // Properties in portfolio
  properties: Property[];

  createdAt: Date;
  updatedAt: Date;
}

interface Property {
  id: string;
  address: string;
  postcode: string;
  country: string;
  isFHL: boolean;
  acquisitionDate: Date;
  acquisitionCost: number;
}
```

### Period Summary Entity

```typescript
interface PropertyPeriod {
  id: string;
  businessId: string;
  submissionId: string; // From HMRC

  fromDate: Date;
  toDate: Date;

  // Income
  income: {
    periodAmount: number;
    premiumsOfLeaseGrant: number;
    reversePremiums: number;
    otherIncome: number;
    taxDeducted: number;
    foreignTaxPaid?: number;
  };

  // Expenses
  expenses: {
    premisesRunningCosts: number;
    repairsAndMaintenance: number;
    financialCosts: number;
    professionalFees: number;
    costOfServices: number;
    travelCosts: number;
    other: number;
    residentialFinancialCost: number;
  };

  // Status
  status: 'draft' | 'submitted' | 'amended';
  submittedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Multi-Property Aggregation

### Challenge

HMRC expects **aggregated totals** across all properties in a portfolio, not per-property submissions.

### Solution

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROPERTY AGGREGATION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Property 1: 123 High St          Property 2: 45 Oak Lane               │
│  ─────────────────────────        ───────────────────────               │
│  Rent: £5,000                     Rent: £6,000                          │
│  Repairs: £500                    Repairs: £1,000                       │
│  Interest: £1,000                 Interest: £1,200                      │
│                                                                          │
│         │                                  │                             │
│         └──────────────┬───────────────────┘                             │
│                        │                                                 │
│                        ▼                                                 │
│           ┌────────────────────────┐                                     │
│           │  AGGREGATED TOTALS     │                                     │
│           │  ──────────────────    │                                     │
│           │  Total Rent: £11,000   │                                     │
│           │  Total Repairs: £1,500 │                                     │
│           │  Total Interest: £2,200│                                     │
│           └────────────────────────┘                                     │
│                        │                                                 │
│                        ▼                                                 │
│           POST to HMRC Property API                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## UI Components

### Property Portfolio Screen

```
┌─────────────────────────────────────────────────────────────┐
│  PROPERTY PORTFOLIO                             [+ Add]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  UK PROPERTIES                                               │
│  ─────────────────────────────────────────────────────────── │
│  🏠 123 High Street, London SW1 1AA                          │
│     Non-FHL | Acquired: Jan 2020 | £350,000                  │
│     Q1 Income: £5,000 | Expenses: £1,800                     │
│                                                              │
│  🏠 45 Oak Lane, Manchester M1 2BB                           │
│     Non-FHL | Acquired: Mar 2022 | £180,000                  │
│     Q1 Income: £6,000 | Expenses: £2,400                     │
│                                                              │
│  FOREIGN PROPERTIES                                          │
│  ─────────────────────────────────────────────────────────── │
│  🏠 Apt 5, Costa del Sol, Spain                              │
│     FHL (EEA) | Acquired: Jun 2021 | €150,000                │
│     Q1 Income: €4,000 | Expenses: €1,200                     │
│                                                              │
│  ─────────────────────────────────────────────────────────── │
│  QUARTERLY SUMMARY (Q1 2024-25)                              │
│  UK Non-FHL Total: Income £11,000 | Net £6,800               │
│  Foreign FHL Total: Income €4,000 | Net €2,800               │
│                                                              │
│  [Review & Submit Q1 Update]                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `RULE_INCORRECT_PERIOD` | Period dates invalid |
| 400 | `RULE_BOTH_EXPENSES_SUPPLIED` | Can't mix detailed + consolidated |
| 400 | `RULE_INCORRECT_FHL_STATUS` | FHL rules not met |
| 403 | `CLIENT_NOT_SUBSCRIBED` | Not in MTD ITSA |
| 404 | `NO_DATA_FOUND` | Business not found |

---

## Implementation Checklist

### Setup
- [ ] OAuth scopes for property
- [ ] Fraud prevention headers

### Endpoints
- [ ] POST create period (UK non-FHL)
- [ ] POST create period (UK FHL)
- [ ] POST create period (Foreign)
- [ ] PUT amend period
- [ ] GET retrieve period
- [ ] GET list periods
- [ ] GET annual summary
- [ ] PUT update annual summary

### Data Layer
- [ ] Property entity
- [ ] Property portfolio
- [ ] Period aggregation logic
- [ ] FHL qualification check

### UI
- [ ] Property portfolio management
- [ ] Per-property income/expenses
- [ ] Aggregated quarterly summary
- [ ] Submit flow

---

*Integration spec created: 2026-02-01*
