# Phase 2: Self Employment Business API Integration Specification

> **Priority**: 4
> **Complexity**: Medium
> **Status**: Live (MTD ITSA mandatory from April 2026 for >£50k)

---

## Overview

| Aspect | Detail |
|--------|--------|
| **API Name** | Self Employment Business (MTD) |
| **Version** | 5.0 |
| **Type** | REST |
| **Base URL (Sandbox)** | `https://test-api.service.hmrc.gov.uk` |
| **Base URL (Production)** | `https://api.service.hmrc.gov.uk` |
| **Authentication** | OAuth 2.0 |
| **Fraud Headers** | Mandatory |

---

## Purpose

Submit self-employment income and expenses for:
- Quarterly updates (MTD ITSA)
- Annual summaries
- Adjustments

---

## Endpoints

### 1. Create Period Summary (Quarterly Update)

**Purpose**: Submit quarterly income and expenses

```
POST /individuals/business/self-employment/{nino}/{businessId}/period
```

**Path Parameters**:
| Parameter | Description |
|-----------|-------------|
| `nino` | National Insurance Number |
| `businessId` | Business ID from Business Details API |

**Request Body**:
```json
{
  "periodFromDate": "2024-04-06",
  "periodToDate": "2024-07-05",
  "periodIncome": {
    "turnover": 25000.00,
    "other": 500.00
  },
  "periodExpenses": {
    "costOfGoods": {
      "amount": 5000.00,
      "disallowableAmount": 0.00
    },
    "paymentsToSubcontractors": {
      "amount": 2000.00,
      "disallowableAmount": 0.00
    },
    "wagesAndStaffCosts": {
      "amount": 3000.00,
      "disallowableAmount": 0.00
    },
    "carVanTravelExpenses": {
      "amount": 1500.00,
      "disallowableAmount": 300.00
    },
    "premisesRunningCosts": {
      "amount": 2000.00,
      "disallowableAmount": 0.00
    },
    "maintenanceCosts": {
      "amount": 500.00,
      "disallowableAmount": 0.00
    },
    "adminCosts": {
      "amount": 800.00,
      "disallowableAmount": 0.00
    },
    "businessEntertainmentCosts": {
      "amount": 200.00,
      "disallowableAmount": 200.00
    },
    "advertisingCosts": {
      "amount": 1000.00,
      "disallowableAmount": 0.00
    },
    "interestOnBankOtherLoans": {
      "amount": 300.00,
      "disallowableAmount": 0.00
    },
    "financeCharges": {
      "amount": 100.00,
      "disallowableAmount": 0.00
    },
    "irrecoverableDebts": {
      "amount": 0.00,
      "disallowableAmount": 0.00
    },
    "professionalFees": {
      "amount": 1500.00,
      "disallowableAmount": 500.00
    },
    "depreciation": {
      "amount": 0.00,
      "disallowableAmount": 0.00
    },
    "otherExpenses": {
      "amount": 600.00,
      "disallowableAmount": 0.00
    }
  }
}
```

**Response** (201 Created):
```json
{
  "periodId": "2024-04-06_2024-07-05"
}
```

---

### 2. Amend Period Summary

**Purpose**: Update a previously submitted quarterly update

```
PUT /individuals/business/self-employment/{nino}/{businessId}/period/{periodId}
```

Same request body as create.

---

### 3. Retrieve Period Summary

**Purpose**: Get a submitted quarterly update

```
GET /individuals/business/self-employment/{nino}/{businessId}/period/{periodId}
```

**Response** (200 OK):
Returns the submitted period data.

---

### 4. List All Period Summaries

**Purpose**: Get all quarterly updates for a business

```
GET /individuals/business/self-employment/{nino}/{businessId}/period
```

**Response** (200 OK):
```json
{
  "periods": [
    {
      "periodId": "2024-04-06_2024-07-05",
      "periodFromDate": "2024-04-06",
      "periodToDate": "2024-07-05"
    },
    {
      "periodId": "2024-07-06_2024-10-05",
      "periodFromDate": "2024-07-06",
      "periodToDate": "2024-10-05"
    }
  ]
}
```

---

### 5. Retrieve Annual Summary

**Purpose**: Get annual totals and adjustments

```
GET /individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}
```

**Tax Year Format**: `2024-25`

**Response** (200 OK):
```json
{
  "adjustments": {
    "includedNonTaxableProfits": 0.00,
    "basisAdjustment": 0.00,
    "overlapReliefUsed": 0.00,
    "accountingAdjustment": 0.00,
    "averagingAdjustment": 0.00,
    "outstandingBusinessIncome": 0.00,
    "balancingChargeBpra": 0.00,
    "balancingChargeOther": 0.00,
    "goodsAndServicesOwnUse": 500.00
  },
  "allowances": {
    "annualInvestmentAllowance": 10000.00,
    "capitalAllowanceMainPool": 2000.00,
    "capitalAllowanceSpecialRatePool": 0.00,
    "zeroEmissionsGoodsVehicleAllowance": 0.00,
    "businessPremisesRenovationAllowance": 0.00,
    "enhancedCapitalAllowance": 0.00,
    "allowanceOnSales": 0.00,
    "capitalAllowanceSingleAssetPool": 0.00,
    "tradingIncomeAllowance": 0.00,
    "electricChargePointAllowance": 0.00,
    "structuredBuildingAllowance": 0.00,
    "zeroEmissionsCarAllowance": 0.00
  },
  "nonFinancials": {
    "businessDetailsChangedRecently": false,
    "class4NicsExemptionReason": "non-resident"
  }
}
```

---

### 6. Update Annual Summary

**Purpose**: Submit annual adjustments and allowances

```
PUT /individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}
```

---

## Expense Categories

### Detailed Expenses

| Category | SA103 Box | Disallowable? |
|----------|-----------|---------------|
| `costOfGoods` | Box 10 | Yes |
| `paymentsToSubcontractors` | Box 11 (CIS) | Yes |
| `wagesAndStaffCosts` | Box 12 | Yes |
| `carVanTravelExpenses` | Box 13 | Yes |
| `premisesRunningCosts` | Box 14 | Yes |
| `maintenanceCosts` | Box 15 | Yes |
| `adminCosts` | Box 16 | Yes |
| `businessEntertainmentCosts` | Box 17 | Yes (usually 100%) |
| `advertisingCosts` | Box 18 | Yes |
| `interestOnBankOtherLoans` | Box 19 | Yes |
| `financeCharges` | Box 20 | Yes |
| `irrecoverableDebts` | Box 21 | Yes |
| `professionalFees` | Box 22 | Yes |
| `depreciation` | Box 23 | Yes (100%) |
| `otherExpenses` | Box 24 | Yes |

### Consolidated Expenses (Alternative)

For businesses with turnover <£90,000:

```json
{
  "periodExpenses": {
    "consolidatedExpenses": 15000.00
  }
}
```

---

## Allowances

| Allowance | Description | Max Amount |
|-----------|-------------|------------|
| `annualInvestmentAllowance` | AIA on qualifying plant | £1,000,000 |
| `capitalAllowanceMainPool` | 18% writing down | Unlimited |
| `capitalAllowanceSpecialRatePool` | 6% writing down | Unlimited |
| `zeroEmissionsGoodsVehicleAllowance` | 100% first year | Unlimited |
| `tradingIncomeAllowance` | Simplified allowance | £1,000 |
| `structuredBuildingAllowance` | Commercial buildings | 3% per year |
| `zeroEmissionsCarAllowance` | Electric cars | 100% |

---

## Data Model

### Self Employment Entity

```typescript
interface SelfEmploymentBusiness {
  id: string;
  clientId: string;
  nino: string;
  businessId: string; // From HMRC

  // Business details
  tradingName: string;
  businessDescription: string;
  businessAddressPostcode: string;
  commencementDate: Date;

  // Status
  active: boolean;

  createdAt: Date;
  updatedAt: Date;
}
```

### Period Summary Entity

```typescript
interface SelfEmploymentPeriod {
  id: string;
  businessId: string;
  periodId: string; // From HMRC

  periodFromDate: Date;
  periodToDate: Date;

  // Income
  turnover: number;
  otherIncome: number;

  // Expenses (detailed)
  expenses: {
    costOfGoods: ExpenseItem;
    paymentsToSubcontractors: ExpenseItem;
    wagesAndStaffCosts: ExpenseItem;
    carVanTravelExpenses: ExpenseItem;
    premisesRunningCosts: ExpenseItem;
    maintenanceCosts: ExpenseItem;
    adminCosts: ExpenseItem;
    businessEntertainmentCosts: ExpenseItem;
    advertisingCosts: ExpenseItem;
    interestOnBankOtherLoans: ExpenseItem;
    financeCharges: ExpenseItem;
    irrecoverableDebts: ExpenseItem;
    professionalFees: ExpenseItem;
    depreciation: ExpenseItem;
    otherExpenses: ExpenseItem;
  };

  // OR Consolidated
  consolidatedExpenses?: number;

  // Status
  status: 'draft' | 'submitted' | 'amended';
  submittedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseItem {
  amount: number;
  disallowableAmount: number;
}
```

---

## Quarterly Update Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    QUARTERLY UPDATE WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Quarter Start (e.g., 6 April)                                          │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  USER ENTERS TRANSACTIONS                                        │   │
│  │  - Sales invoices                                                │   │
│  │  - Expense receipts                                              │   │
│  │  - Bank transactions                                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  TAXSORTED CATEGORIZES                                           │   │
│  │  - Maps to HMRC expense categories                               │   │
│  │  - Identifies disallowable portions                              │   │
│  │  - Calculates totals                                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  Quarter End (e.g., 5 July)                                             │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  REVIEW & SUBMIT                                                 │   │
│  │  - User reviews summary                                          │   │
│  │  - POST period summary to HMRC                                   │   │
│  │  - Deadline: 5 August                                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  Obligation fulfilled ✓                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## UI Components

### Quarterly Summary Screen

```
┌─────────────────────────────────────────────────────────────┐
│  Q1 2024-25: 6 Apr - 5 Jul                    Due: 5 Aug    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INCOME                                                      │
│  ─────────────────────────────────────────────────────────── │
│  Turnover                              £25,000.00            │
│  Other income                             £500.00            │
│                                        ──────────            │
│  Total Income                          £25,500.00            │
│                                                              │
│  EXPENSES                                                    │
│  ─────────────────────────────────────────────────────────── │
│  Cost of goods sold                     £5,000.00            │
│  Staff costs                            £3,000.00            │
│  Travel                                 £1,500.00  (£300 dis)│
│  Premises                               £2,000.00            │
│  Professional fees                      £1,500.00  (£500 dis)│
│  Entertainment                            £200.00  (£200 dis)│
│  Other expenses                         £4,300.00            │
│                                        ──────────            │
│  Total Expenses                        £17,500.00            │
│  Disallowable                          (£1,000.00)           │
│                                                              │
│  NET PROFIT (before adjustments)         £8,000.00           │
│                                                              │
│  [Save Draft]                          [Submit to HMRC]      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `FORMAT_NINO` | Invalid NINO |
| 400 | `FORMAT_BUSINESS_ID` | Invalid business ID |
| 400 | `RULE_INCORRECT_PERIOD` | Period dates invalid |
| 400 | `RULE_OVERLAPPING_PERIOD` | Period overlaps existing |
| 400 | `RULE_TAX_YEAR_NOT_SUPPORTED` | Tax year not available |
| 403 | `CLIENT_NOT_SUBSCRIBED` | Client not in MTD ITSA |
| 404 | `NO_DATA_FOUND` | Business/period not found |

---

## Implementation Checklist

### Setup
- [ ] Extend OAuth scopes for self-assessment
- [ ] Implement fraud prevention headers

### Endpoints
- [ ] POST create period summary
- [ ] PUT amend period summary
- [ ] GET retrieve period summary
- [ ] GET list all periods
- [ ] GET annual summary
- [ ] PUT update annual summary

### Data Layer
- [ ] Self Employment Business entity
- [ ] Period Summary entity
- [ ] Transaction categorization logic
- [ ] Disallowable calculation rules

### UI
- [ ] Transaction entry
- [ ] Expense categorization
- [ ] Quarterly summary review
- [ ] Submit to HMRC flow
- [ ] Annual adjustments screen

---

*Integration spec created: 2026-02-01*
