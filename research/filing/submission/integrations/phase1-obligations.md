# Phase 1: Obligations API Integration Specification

> **Priority**: 2
> **Complexity**: Low
> **Value**: High (Central to deadline management)

---

## Overview

| Aspect | Detail |
|--------|--------|
| **API Name** | Obligations (MTD) |
| **Version** | 3.0 |
| **Type** | REST |
| **Base URL (Sandbox)** | `https://test-api.service.hmrc.gov.uk` |
| **Base URL (Production)** | `https://api.service.hmrc.gov.uk` |
| **Authentication** | OAuth 2.0 |
| **Fraud Headers** | Mandatory |

---

## Purpose

The Obligations API is **central to TaxSorted's value proposition**:
- Shows what filings are due
- Shows filing status (fulfilled/outstanding)
- Enables proactive deadline alerts
- Single source of truth for compliance status

---

## Endpoints

### 1. Retrieve Income Tax Obligations

**Purpose**: Get all Income Tax obligations for a taxpayer

```
GET /obligations/details/{nino}/income-tax
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `nino` | String | National Insurance Number |

**Query Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `from` | No | Start date (YYYY-MM-DD) |
| `to` | No | End date (YYYY-MM-DD) |
| `status` | No | `Open` or `Fulfilled` |

**Response** (200 OK):
```json
{
  "obligations": [
    {
      "typeOfBusiness": "self-employment",
      "businessId": "XAIS12345678901",
      "obligationDetails": [
        {
          "status": "Fulfilled",
          "inboundCorrespondenceFromDate": "2024-04-06",
          "inboundCorrespondenceToDate": "2024-07-05",
          "inboundCorrespondenceDueDate": "2024-08-05",
          "inboundCorrespondenceDateReceived": "2024-07-28",
          "periodKey": "#001"
        },
        {
          "status": "Open",
          "inboundCorrespondenceFromDate": "2024-07-06",
          "inboundCorrespondenceToDate": "2024-10-05",
          "inboundCorrespondenceDueDate": "2024-11-05",
          "periodKey": "#002"
        }
      ]
    },
    {
      "typeOfBusiness": "uk-property",
      "businessId": "XPIS12345678901",
      "obligationDetails": [
        {
          "status": "Open",
          "inboundCorrespondenceFromDate": "2024-04-06",
          "inboundCorrespondenceToDate": "2024-07-05",
          "inboundCorrespondenceDueDate": "2024-08-05",
          "periodKey": "#001"
        }
      ]
    }
  ]
}
```

---

### 2. Retrieve End of Period Statement (EOPS) Obligations

**Purpose**: Get EOPS obligations for annual submissions

```
GET /obligations/details/{nino}/end-of-period-statement
```

**Response** (200 OK):
```json
{
  "obligations": [
    {
      "typeOfBusiness": "self-employment",
      "businessId": "XAIS12345678901",
      "obligationDetails": [
        {
          "status": "Open",
          "inboundCorrespondenceFromDate": "2024-04-06",
          "inboundCorrespondenceToDate": "2025-04-05",
          "inboundCorrespondenceDueDate": "2026-01-31",
          "periodKey": "EOPS"
        }
      ]
    }
  ]
}
```

---

### 3. Retrieve Crystallisation Obligations

**Purpose**: Get final declaration obligations

```
GET /obligations/details/{nino}/crystallisation
```

**Response** (200 OK):
```json
{
  "obligations": [
    {
      "obligationDetails": [
        {
          "status": "Open",
          "inboundCorrespondenceFromDate": "2024-04-06",
          "inboundCorrespondenceToDate": "2025-04-05",
          "inboundCorrespondenceDueDate": "2026-01-31",
          "periodKey": "ITSA"
        }
      ]
    }
  ]
}
```

---

## Obligation Types

| Type | Description | Frequency |
|------|-------------|-----------|
| **Quarterly Update** | Self-employment/property income & expenses | 4x per year |
| **End of Period Statement (EOPS)** | Annual summary per business | Annual |
| **Crystallisation** | Final tax declaration | Annual |

---

## Quarterly Deadlines (MTD ITSA)

| Quarter | Period | Due Date |
|---------|--------|----------|
| Q1 | 6 Apr - 5 Jul | 5 August |
| Q2 | 6 Jul - 5 Oct | 5 November |
| Q3 | 6 Oct - 5 Jan | 5 February |
| Q4 | 6 Jan - 5 Apr | 5 May |

**EOPS Deadline**: 31 January following tax year
**Final Declaration**: 31 January following tax year

---

## Business Types

| typeOfBusiness | Description |
|----------------|-------------|
| `self-employment` | Self-employed business |
| `uk-property` | UK rental property |
| `foreign-property` | Overseas rental property |

---

## Integration Strategy

### Sync Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    OBLIGATIONS SYNC                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. For each connected client:                               │
│     ┌────────────────────────────────────────────────────┐  │
│     │ GET /obligations/details/{nino}/income-tax         │  │
│     │ GET /obligations/details/{nino}/end-of-period      │  │
│     │ GET /obligations/details/{nino}/crystallisation    │  │
│     └────────────────────────────────────────────────────┘  │
│                                                              │
│  2. Store/update obligations in database                     │
│                                                              │
│  3. Calculate days until due                                 │
│                                                              │
│  4. Trigger alerts:                                          │
│     - 30 days before: Email reminder                         │
│     - 7 days before: Urgent notification                     │
│     - Overdue: Alert + penalty warning                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Sync Frequency

| Trigger | Action |
|---------|--------|
| **Daily (overnight)** | Sync all client obligations |
| **On login** | Sync current user's obligations |
| **After submission** | Refresh to confirm fulfilled |
| **Manual refresh** | User-triggered sync |

---

## Data Model

### Obligation Entity

```typescript
interface Obligation {
  id: string;
  clientId: string;
  nino: string;

  // Classification
  obligationType: 'quarterly' | 'eops' | 'crystallisation';
  businessType: 'self-employment' | 'uk-property' | 'foreign-property' | 'income-tax';
  businessId?: string;

  // Period
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;

  // Status
  status: 'open' | 'fulfilled';
  receivedDate?: Date;

  // Sync
  lastSyncedAt: Date;

  // Computed
  daysUntilDue: number;
  isOverdue: boolean;
}
```

### Alert Configuration

```typescript
interface ObligationAlert {
  obligationId: string;
  alertType: '30_day' | '7_day' | '1_day' | 'overdue';
  sentAt?: Date;
  channel: 'email' | 'sms' | 'in_app';
}
```

---

## Dashboard Integration

### Client Overview Component

```
┌─────────────────────────────────────────────────────────────┐
│  UPCOMING OBLIGATIONS                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔴 OVERDUE (2)                                              │
│  ├─ John Smith - Q2 Update (Self-employment) - 3 days late  │
│  └─ ABC Ltd - VAT Return Q1 - 5 days late                   │
│                                                              │
│  🟡 DUE THIS WEEK (4)                                        │
│  ├─ Jane Doe - Q2 Update (Property) - Due in 3 days         │
│  ├─ XYZ Ltd - VAT Return Q2 - Due in 5 days                 │
│  └─ 2 more...                                                │
│                                                              │
│  🟢 DUE THIS MONTH (12)                                      │
│  └─ View all →                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Calendar View

```
┌─────────────────────────────────────────────────────────────┐
│  AUGUST 2024                                                 │
├─────────────────────────────────────────────────────────────┤
│  Sun   Mon   Tue   Wed   Thu   Fri   Sat                    │
│                          1     2     3                       │
│  4     5●    6     7●    8     9     10                     │
│  11    12    13    14    15    16    17                     │
│  18    19    20    21    22    23    24                     │
│  25    26    27    28    29    30    31                     │
├─────────────────────────────────────────────────────────────┤
│  ● 5 Aug: 3 obligations due                                  │
│  ● 7 Aug: 1 obligation due                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## API Response Mapping

### HMRC → TaxSorted Field Mapping

| HMRC Field | TaxSorted Field |
|------------|-----------------|
| `typeOfBusiness` | `businessType` |
| `businessId` | `businessId` |
| `inboundCorrespondenceFromDate` | `periodStart` |
| `inboundCorrespondenceToDate` | `periodEnd` |
| `inboundCorrespondenceDueDate` | `dueDate` |
| `inboundCorrespondenceDateReceived` | `receivedDate` |
| `status` | `status` (lowercase) |
| `periodKey` | `periodKey` |

---

## Error Handling

| Status | Code | Action |
|--------|------|--------|
| 400 | `INVALID_NINO` | Validate NINO format |
| 400 | `INVALID_DATE_RANGE` | Check date parameters |
| 401 | `UNAUTHORIZED` | Refresh token |
| 403 | `FORBIDDEN` | Re-authorize client |
| 404 | `NO_DATA_FOUND` | No obligations (may be expected) |
| 429 | `RATE_LIMITED` | Back off and retry |

---

## Implementation Checklist

### Setup
- [ ] Reuse OAuth 2.0 from VAT integration
- [ ] Add `read:self-assessment` scope

### Endpoints
- [ ] GET income-tax obligations
- [ ] GET end-of-period-statement obligations
- [ ] GET crystallisation obligations

### Data Layer
- [ ] Create Obligation entity/table
- [ ] Create sync job
- [ ] Create alert configuration

### UI
- [ ] Dashboard widget
- [ ] Calendar view
- [ ] Client obligation list
- [ ] Alert preferences

### Notifications
- [ ] Email templates
- [ ] In-app notifications
- [ ] Scheduled alert job

---

## Test Scenarios (Sandbox)

| Header Value | Description |
|--------------|-------------|
| `ALL_FULFILLED` | All obligations fulfilled |
| `ALL_OPEN` | All obligations open |
| `MIXED` | Combination of statuses |
| `NO_DATA` | No obligations found |

---

*Integration spec created: 2026-02-01*
