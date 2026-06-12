# Phase 2: Individual Calculations API Integration Specification

> **Priority**: 6
> **Complexity**: Medium-High
> **Status**: Live (MTD ITSA)

---

## Overview

| Aspect | Detail |
|--------|--------|
| **API Name** | Individual Calculations (MTD) |
| **Version** | 6.0 |
| **Type** | REST |
| **Base URL (Sandbox)** | `https://test-api.service.hmrc.gov.uk` |
| **Base URL (Production)** | `https://api.service.hmrc.gov.uk` |
| **Authentication** | OAuth 2.0 |
| **Fraud Headers** | Mandatory |

---

## Purpose

The Individual Calculations API is **critical for tax planning and liability preview**:
- Triggers HMRC tax calculation engine
- Returns detailed tax liability breakdown
- Shows allowances and reliefs applied
- Enables "what-if" scenario planning
- Generates in-year estimates
- Produces final crystallisation figures

---

## Calculation Types

| Type | Purpose | When Used |
|------|---------|-----------|
| **In-Year Estimate** | Forecast liability | Throughout tax year |
| **Intent to Crystallise** | Pre-final calculation | Before final declaration |
| **Final Declaration** | Crystallisation | Year-end submission |

---

## Endpoints

### 1. Trigger a Self Assessment Tax Calculation

**Purpose**: Request HMRC to calculate tax based on submitted data

```
POST /individuals/calculations/self-assessment/{nino}/{taxYear}
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `nino` | String | National Insurance Number |
| `taxYear` | String | Tax year (e.g., `2024-25`) |

**Request Body** (Optional - for crystallisation intent):
```json
{
  "calculationType": "crystallisation"
}
```

**Response** (202 Accepted):
```json
{
  "id": "f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c"
}
```

**Note**: Calculation is asynchronous. Poll the retrieve endpoint.

---

### 2. Retrieve Self Assessment Tax Calculation

**Purpose**: Get calculated tax liability details

```
GET /individuals/calculations/self-assessment/{nino}/{taxYear}/{calculationId}
```

**Response** (200 OK):
```json
{
  "metadata": {
    "calculationId": "f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c",
    "taxYear": "2024-25",
    "requestedBy": "customer",
    "calculationReason": "customerRequest",
    "calculationTimestamp": "2024-07-15T10:30:00.000Z",
    "calculationType": "inYear",
    "intentToSubmitFinalDeclaration": false,
    "finalDeclaration": false,
    "periodFrom": "2024-04-06",
    "periodTo": "2025-04-05"
  },
  "inputs": {
    "personalInformation": {
      "taxRegime": "UK",
      "class2VoluntaryContributions": false
    },
    "incomeSources": {
      "selfEmployments": [
        {
          "incomeSourceId": "XAIS12345678901",
          "incomeSourceName": "Freelance Consulting",
          "accountingPeriodStartDate": "2024-04-06",
          "accountingPeriodEndDate": "2025-04-05",
          "source": "MTD"
        }
      ],
      "ukProperty": [
        {
          "incomeSourceId": "XPIS12345678901",
          "source": "MTD"
        }
      ]
    }
  },
  "calculation": {
    "allowancesAndDeductions": {
      "personalAllowance": 12570,
      "giftOfInvestmentsAndPropertyToCharity": 0,
      "marriageAllowanceTransferOut": 0
    },
    "reliefs": {
      "reliefsClaimed": [
        {
          "type": "vctSubscriptions",
          "amountClaimed": 5000,
          "allowableAmount": 5000,
          "rate": 30
        }
      ]
    },
    "taxCalculation": {
      "incomeTax": {
        "totalIncomeReceivedFromAllSources": 85000,
        "totalAllowancesAndDeductions": 12570,
        "totalTaxableIncome": 72430,
        "payPensionsProfit": {
          "taxBands": [
            {
              "name": "BRT",
              "rate": 20,
              "bandLimit": 37700,
              "apportionedBandLimit": 37700,
              "income": 37700,
              "taxAmount": 7540
            },
            {
              "name": "HRT",
              "rate": 40,
              "bandLimit": 125140,
              "apportionedBandLimit": 87440,
              "income": 34730,
              "taxAmount": 13892
            }
          ],
          "totalAmount": 21432
        },
        "savingsAndGains": {
          "taxBands": [],
          "totalAmount": 0
        },
        "dividends": {
          "taxBands": [],
          "totalAmount": 0
        },
        "incomeTaxCharged": 21432,
        "totalReliefs": 1500,
        "incomeTaxDueAfterReliefs": 19932
      },
      "nics": {
        "class2Nics": {
          "amount": 179.40,
          "weeklyRate": 3.45,
          "weeks": 52,
          "underSmallProfitsThreshold": false
        },
        "class4Nics": {
          "nic4Bands": [
            {
              "name": "ZRT",
              "rate": 0,
              "threshold": 12570,
              "apportionedThreshold": 12570,
              "income": 12570,
              "amount": 0
            },
            {
              "name": "BRT",
              "rate": 6,
              "threshold": 50270,
              "apportionedThreshold": 50270,
              "income": 37700,
              "amount": 2262
            },
            {
              "name": "HRT",
              "rate": 2,
              "threshold": 999999999,
              "apportionedThreshold": 999999999,
              "income": 34730,
              "amount": 694.60
            }
          ],
          "totalAmount": 2956.60
        },
        "totalNic": 3136.00
      },
      "totalIncomeTaxAndNicsDue": 23068.00,
      "totalStudentLoansRepaymentDue": 0,
      "totalAnnuityPaymentsTaxCharged": 0,
      "totalRoyaltyPaymentsTaxCharged": 0,
      "totalTaxDeducted": 0,
      "totalIncomeTaxNicsCharged": 23068.00,
      "taxDeductedAtSource": {
        "ukLandAndProperty": 0,
        "savings": 0,
        "cis": 0
      },
      "incomeTaxNicsDue": 23068.00
    },
    "endOfYearEstimate": {
      "incomeSource": [
        {
          "incomeSourceId": "XAIS12345678901",
          "incomeSourceType": "self-employment",
          "taxableIncome": 60000
        },
        {
          "incomeSourceId": "XPIS12345678901",
          "incomeSourceType": "uk-property",
          "taxableIncome": 12430
        }
      ],
      "totalEstimatedIncome": 85000,
      "totalTaxableIncome": 72430,
      "incomeTaxAmount": 21432,
      "nic2": 179.40,
      "nic4": 2956.60,
      "totalNicAmount": 3136.00,
      "totalTaxDeductedBeforeCodingOut": 0,
      "totalIncomeTaxAndNicsDue": 23068.00
    },
    "messages": [
      {
        "id": "C15506",
        "text": "A Personal Savings Allowance of £500 has been applied to your savings income."
      }
    ]
  }
}
```

---

### 3. List Self Assessment Tax Calculations

**Purpose**: Get all calculations for a tax year

```
GET /individuals/calculations/self-assessment/{nino}/{taxYear}
```

**Response** (200 OK):
```json
{
  "calculations": [
    {
      "calculationId": "f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c",
      "calculationTimestamp": "2024-07-15T10:30:00.000Z",
      "calculationType": "inYear"
    },
    {
      "calculationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "calculationTimestamp": "2024-10-20T14:45:00.000Z",
      "calculationType": "inYear"
    }
  ]
}
```

---

### 4. Submit Final Declaration (Crystallisation)

**Purpose**: Final tax return submission

```
POST /individuals/calculations/self-assessment/{nino}/{taxYear}/{calculationId}/final-declaration
```

**Request Body**:
```json
{
  "finalDeclaration": true
}
```

**Response** (204 No Content)

**Note**: This is the legal equivalent of submitting a paper SA100.

---

## Calculation Breakdown

### Income Sources

| Source | Description | Field Path |
|--------|-------------|------------|
| Self-Employment | Trading income | `inputs.incomeSources.selfEmployments` |
| UK Property | Rental income | `inputs.incomeSources.ukProperty` |
| Foreign Property | Overseas rental | `inputs.incomeSources.foreignProperty` |
| Employment | PAYE income | `inputs.incomeSources.employments` |
| Savings | Interest | `inputs.incomeSources.ukSavingsAndGains` |
| Dividends | Dividend income | `inputs.incomeSources.ukDividends` |

### Tax Bands (2024-25)

| Band | Rate | Income Range |
|------|------|--------------|
| Personal Allowance | 0% | £0 - £12,570 |
| Basic Rate | 20% | £12,571 - £50,270 |
| Higher Rate | 40% | £50,271 - £125,140 |
| Additional Rate | 45% | Over £125,140 |

### National Insurance Rates (Class 4)

| Band | Rate | Threshold |
|------|------|-----------|
| Below Lower Limit | 0% | £0 - £12,570 |
| Main Rate | 6% | £12,571 - £50,270 |
| Upper Rate | 2% | Over £50,270 |

---

## Data Model

### Calculation Entity

```typescript
interface TaxCalculation {
  id: string;
  clientId: string;
  nino: string;
  taxYear: string;

  // HMRC reference
  hmrcCalculationId: string;

  // Type and status
  calculationType: 'inYear' | 'intentToCrystallise' | 'finalDeclaration';
  status: 'pending' | 'completed' | 'error';

  // Timestamps
  requestedAt: Date;
  completedAt?: Date;

  // Results (cached from HMRC)
  totalIncome: number;
  totalAllowances: number;
  totalTaxableIncome: number;
  incomeTaxDue: number;
  class2Nics: number;
  class4Nics: number;
  totalNicsDue: number;
  totalTaxAndNicsDue: number;

  // Tax deducted at source
  taxDeductedAtSource: number;

  // Final liability
  amountDue: number;

  // Messages/warnings from HMRC
  messages: CalculationMessage[];

  createdAt: Date;
  updatedAt: Date;
}

interface CalculationMessage {
  id: string;
  text: string;
  type: 'info' | 'warning' | 'error';
}
```

### Calculation Request Entity

```typescript
interface CalculationRequest {
  id: string;
  clientId: string;
  nino: string;
  taxYear: string;

  // Request tracking
  hmrcCalculationId?: string;
  status: 'requested' | 'processing' | 'completed' | 'failed';

  // Error handling
  errorCode?: string;
  errorMessage?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Integration Workflow

### In-Year Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IN-YEAR CALCULATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User clicks "Calculate Tax"                                            │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  VALIDATE DATA COMPLETENESS                                      │   │
│  │  - Check all quarterly updates submitted                         │   │
│  │  - Verify annual adjustments entered                             │   │
│  │  - Confirm all income sources declared                           │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  POST /individuals/calculations/self-assessment/{nino}/{taxYear}        │
│         │                                                                │
│         ▼                                                                │
│  Receive calculationId                                                   │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  POLL FOR COMPLETION (max 30 seconds)                            │   │
│  │  GET /individuals/calculations/...//{calculationId}              │   │
│  │  - Check metadata.calculationTimestamp exists                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│         │                                                                │
│         ▼                                                                │
│  Display calculation results to user                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Final Declaration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FINAL DECLARATION FLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Ensure all obligations fulfilled                                     │
│     - All 4 quarterly updates submitted                                  │
│     - End of Period Statement submitted                                  │
│                                                                          │
│  2. Trigger intent to crystallise calculation                            │
│     POST /calculations/.../2024-25                                       │
│     Body: { "calculationType": "crystallisation" }                       │
│                                                                          │
│  3. Display final calculation for user review                            │
│     - Total income                                                       │
│     - Total tax due                                                      │
│     - Total NICs due                                                     │
│     - Any messages/warnings                                              │
│                                                                          │
│  4. User confirms accuracy                                               │
│     ⚠️ "I declare the information is correct and complete"              │
│                                                                          │
│  5. Submit final declaration                                             │
│     POST /calculations/.../{calculationId}/final-declaration             │
│     Body: { "finalDeclaration": true }                                   │
│                                                                          │
│  6. Record confirmation                                                  │
│     - Store HMRC response                                                │
│     - Generate confirmation for user                                     │
│     - Update obligation status                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## UI Components

### Tax Calculation Summary Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  TAX CALCULATION 2024-25                    Calculated: 15 Jul  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INCOME SUMMARY                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  Self-employment (Freelance Consulting)      £60,000.00          │
│  UK Property Income                          £15,000.00          │
│  Bank Interest                                  £500.00          │
│                                              ──────────          │
│  Total Income                                £75,500.00          │
│                                                                  │
│  ALLOWANCES & DEDUCTIONS                                         │
│  ─────────────────────────────────────────────────────────────── │
│  Personal Allowance                          £12,570.00          │
│  Gift Aid (gross)                             £1,000.00          │
│                                              ──────────          │
│  Total Deductions                            £13,570.00          │
│                                                                  │
│  TAXABLE INCOME                              £61,930.00          │
│                                                                  │
│  TAX CALCULATION                                                 │
│  ─────────────────────────────────────────────────────────────── │
│  Basic Rate (20% on £37,700)                  £7,540.00          │
│  Higher Rate (40% on £24,230)                 £9,692.00          │
│                                              ──────────          │
│  Income Tax Due                              £17,232.00          │
│                                                                  │
│  Less: Tax Reliefs                            (£500.00)          │
│                                              ──────────          │
│  Income Tax After Reliefs                    £16,732.00          │
│                                                                  │
│  NATIONAL INSURANCE                                              │
│  ─────────────────────────────────────────────────────────────── │
│  Class 2 NICs (52 weeks @ £3.45)               £179.40           │
│  Class 4 NICs                                £2,500.60           │
│                                              ──────────          │
│  Total NICs Due                              £2,680.00           │
│                                                                  │
│  ═══════════════════════════════════════════════════════════════ │
│  TOTAL TAX & NICs DUE                       £19,412.00           │
│  ═══════════════════════════════════════════════════════════════ │
│                                                                  │
│  ℹ️ This is an estimate based on data submitted so far.          │
│                                                                  │
│  [Recalculate]                    [Proceed to Final Declaration] │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tax Bands Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│  TAX BANDS BREAKDOWN                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Personal Allowance (0%)     ████████████░░░░░░░░░░  £12,570    │
│                                                                  │
│  Basic Rate (20%)            ████████████████████████  £37,700   │
│                              Tax: £7,540                         │
│                                                                  │
│  Higher Rate (40%)           ██████████████░░░░░░░░░  £24,230   │
│                              Tax: £9,692                         │
│                                                                  │
│  Additional Rate (45%)       ░░░░░░░░░░░░░░░░░░░░░░  £0         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## What-If Scenario Planning

### Use Case

Allow users to explore "what-if" scenarios:
- "What if I contribute £10k to pension?"
- "What if I make Gift Aid donation?"
- "What if I invest in EIS/VCT?"

### Implementation

```typescript
interface WhatIfScenario {
  id: string;
  clientId: string;
  taxYear: string;

  // Base calculation
  baseCalculationId: string;
  baseTaxDue: number;

  // Scenario modifications
  modifications: Modification[];

  // Projected outcome
  projectedTaxDue: number;
  taxSaving: number;

  createdAt: Date;
}

interface Modification {
  type: 'pension_contribution' | 'gift_aid' | 'eis_relief' | 'vct_relief';
  amount: number;
  taxRelief: number;
}
```

**Note**: For what-if scenarios, TaxSorted calculates locally (not via HMRC API) using the same tax rules. HMRC API is used for official calculations only.

---

## Error Handling

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `FORMAT_NINO` | Invalid NINO format |
| 400 | `FORMAT_TAX_YEAR` | Invalid tax year format |
| 400 | `RULE_FINAL_DECLARATION_ALREADY_EXISTS` | Already crystallised |
| 400 | `RULE_FINAL_DECLARATION_TAX_YEAR` | Can't crystallise future year |
| 403 | `CLIENT_NOT_SUBSCRIBED` | Not in MTD ITSA |
| 404 | `NO_CALCULATION_FOUND` | Calculation not found |
| 404 | `NO_INCOME_SUBMISSIONS_EXIST` | No data to calculate |

---

## Timing Considerations

### Calculation Latency

| Scenario | Typical Time |
|----------|--------------|
| Simple (1 income source) | 2-5 seconds |
| Complex (multiple sources) | 5-15 seconds |
| Peak periods (Jan) | Up to 30 seconds |

### Polling Strategy

```typescript
async function waitForCalculation(
  nino: string,
  taxYear: string,
  calculationId: string
): Promise<TaxCalculation> {
  const maxAttempts = 10;
  const delayMs = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    const result = await getCalculation(nino, taxYear, calculationId);

    if (result.metadata?.calculationTimestamp) {
      return result;
    }

    await sleep(delayMs);
  }

  throw new Error('Calculation timeout');
}
```

---

## Implementation Checklist

### Setup
- [ ] OAuth scope: `read:self-assessment` + `write:self-assessment`
- [ ] Fraud prevention headers

### Endpoints
- [ ] POST trigger calculation
- [ ] GET retrieve calculation
- [ ] GET list calculations
- [ ] POST final declaration

### Data Layer
- [ ] TaxCalculation entity
- [ ] CalculationRequest tracking
- [ ] Result caching

### UI
- [ ] Calculate button
- [ ] Calculation summary view
- [ ] Tax bands visualization
- [ ] Final declaration flow
- [ ] What-if scenario builder

### Business Logic
- [ ] Pre-calculation validation
- [ ] Polling with timeout
- [ ] Result parsing and display
- [ ] Local what-if calculator

---

## Related APIs

| API | Relationship |
|-----|--------------|
| **Obligations** | Check all obligations fulfilled before crystallisation |
| **Self Employment** | Provides income data for calculation |
| **Property Business** | Provides property income for calculation |
| **Business Details** | Provides business IDs for income sources |

---

*Integration spec created: 2026-02-01*
