# Phase 1: VAT (MTD) API Integration Specification

> **Priority**: 1 (Highest)
> **Complexity**: Medium
> **Status**: Live (Mandatory for all VAT-registered businesses)

---

## Overview

| Aspect | Detail |
|--------|--------|
| **API Name** | VAT (MTD) |
| **Version** | 1.0 |
| **Type** | REST |
| **Base URL (Sandbox)** | `https://test-api.service.hmrc.gov.uk` |
| **Base URL (Production)** | `https://api.service.hmrc.gov.uk` |
| **Authentication** | OAuth 2.0 (Authorization Code Grant) |
| **Fraud Headers** | Mandatory |

---

## Endpoints

### 1. Retrieve VAT Obligations

**Purpose**: Get list of VAT return periods and their status (fulfilled/outstanding)

```
GET /organisations/vat/{vrn}/obligations
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `vrn` | String | 9-digit VAT Registration Number |

**Query Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `from` | Yes | Start date (YYYY-MM-DD) |
| `to` | Yes | End date (YYYY-MM-DD) |
| `status` | No | `O` (Open) or `F` (Fulfilled) |

**Response** (200 OK):
```json
{
  "obligations": [
    {
      "periodKey": "18A1",
      "start": "2024-01-01",
      "end": "2024-03-31",
      "due": "2024-05-07",
      "status": "F",
      "received": "2024-04-15"
    },
    {
      "periodKey": "18A2",
      "start": "2024-04-01",
      "end": "2024-06-30",
      "due": "2024-08-07",
      "status": "O"
    }
  ]
}
```

**Use Case**: Display upcoming VAT deadlines, show compliance status

---

### 2. Submit VAT Return

**Purpose**: Submit a VAT return for a period

```
POST /organisations/vat/{vrn}/returns
```

**Request Body**:
```json
{
  "periodKey": "18A2",
  "vatDueSales": 1000.00,
  "vatDueAcquisitions": 0.00,
  "totalVatDue": 1000.00,
  "vatReclaimedCurrPeriod": 500.00,
  "netVatDue": 500.00,
  "totalValueSalesExVAT": 5000,
  "totalValuePurchasesExVAT": 2500,
  "totalValueGoodsSuppliedExVAT": 0,
  "totalAcquisitionsExVAT": 0,
  "finalised": true
}
```

**Field Definitions**:

| Field | Box | Description | Type |
|-------|-----|-------------|------|
| `periodKey` | - | Period identifier from obligations | String |
| `vatDueSales` | 1 | VAT due on sales | Decimal (2dp) |
| `vatDueAcquisitions` | 2 | VAT due on acquisitions from EU | Decimal (2dp) |
| `totalVatDue` | 3 | Total VAT due (Box 1 + Box 2) | Decimal (2dp) |
| `vatReclaimedCurrPeriod` | 4 | VAT reclaimed on purchases | Decimal (2dp) |
| `netVatDue` | 5 | Net VAT (Box 3 - Box 4) | Decimal (2dp) |
| `totalValueSalesExVAT` | 6 | Total sales ex VAT | Integer |
| `totalValuePurchasesExVAT` | 7 | Total purchases ex VAT | Integer |
| `totalValueGoodsSuppliedExVAT` | 8 | Total supplies to EU | Integer |
| `totalAcquisitionsExVAT` | 9 | Total acquisitions from EU | Integer |
| `finalised` | - | Declaration complete | Boolean |

**Response** (201 Created):
```json
{
  "processingDate": "2024-04-15T12:30:00Z",
  "paymentIndicator": "DD",
  "formBundleNumber": "123456789012",
  "chargeRefNumber": "XQ123456789012"
}
```

---

### 3. View VAT Return

**Purpose**: Retrieve a previously submitted VAT return

```
GET /organisations/vat/{vrn}/returns/{periodKey}
```

**Response** (200 OK):
```json
{
  "periodKey": "18A2",
  "vatDueSales": 1000.00,
  "vatDueAcquisitions": 0.00,
  "totalVatDue": 1000.00,
  "vatReclaimedCurrPeriod": 500.00,
  "netVatDue": 500.00,
  "totalValueSalesExVAT": 5000,
  "totalValuePurchasesExVAT": 2500,
  "totalValueGoodsSuppliedExVAT": 0,
  "totalAcquisitionsExVAT": 0
}
```

---

### 4. Retrieve VAT Liabilities

**Purpose**: Get outstanding VAT liabilities

```
GET /organisations/vat/{vrn}/liabilities
```

**Query Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `from` | Yes | Start date |
| `to` | Yes | End date |

**Response** (200 OK):
```json
{
  "liabilities": [
    {
      "taxPeriod": {
        "from": "2024-04-01",
        "to": "2024-06-30"
      },
      "type": "VAT Return Debit Charge",
      "originalAmount": 500.00,
      "outstandingAmount": 500.00,
      "due": "2024-08-07"
    }
  ]
}
```

---

### 5. Retrieve VAT Payments

**Purpose**: Get VAT payments made

```
GET /organisations/vat/{vrn}/payments
```

**Response** (200 OK):
```json
{
  "payments": [
    {
      "amount": 500.00,
      "received": "2024-05-01"
    }
  ]
}
```

---

### 6. Retrieve VAT Penalties

**Purpose**: Get penalty information

```
GET /organisations/vat/{vrn}/penalties
```

**Response includes**:
- Late submission penalty points
- Financial penalties
- Penalty details

---

## Authentication Flow

### OAuth 2.0 Authorization Code Grant

```
┌─────────┐     ┌─────────────┐     ┌──────────┐
│  User   │     │ TaxSorted   │     │   HMRC   │
└────┬────┘     └──────┬──────┘     └────┬─────┘
     │                 │                  │
     │  1. Click "Connect VAT"           │
     │─────────────────>                 │
     │                 │                  │
     │  2. Redirect to HMRC              │
     │<────────────────────────────────────────────>
     │                 │                  │
     │  3. User logs in & grants consent │
     │<──────────────────────────────────>
     │                 │                  │
     │  4. Redirect with auth code       │
     │─────────────────────────────────────────────>
     │                 │                  │
     │                 │  5. Exchange code for tokens
     │                 │─────────────────>│
     │                 │                  │
     │                 │  6. Access + Refresh tokens
     │                 │<─────────────────│
     │                 │                  │
     │  7. Connected!  │                  │
     │<─────────────────                  │
```

### Authorization URL

```
https://api.service.hmrc.gov.uk/oauth/authorize
  ?response_type=code
  &client_id={client_id}
  &scope=read:vat+write:vat
  &redirect_uri={callback_url}
  &state={csrf_token}
```

### Token Exchange

```
POST https://api.service.hmrc.gov.uk/oauth/token

Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&redirect_uri={callback_url}
&client_id={client_id}
&client_secret={client_secret}
```

### Token Response

```json
{
  "access_token": "abc123...",
  "token_type": "bearer",
  "expires_in": 14400,
  "refresh_token": "xyz789...",
  "scope": "read:vat write:vat"
}
```

### Token Refresh

```
POST https://api.service.hmrc.gov.uk/oauth/token

grant_type=refresh_token
&refresh_token={refresh_token}
&client_id={client_id}
&client_secret={client_secret}
```

---

## Fraud Prevention Headers

### Required Headers

```http
Gov-Client-Connection-Method: WEB_APP_VIA_SERVER
Gov-Client-Device-ID: beec798b-b366-47fa-b1f8-92cede14a1ce
Gov-Client-User-IDs: my-software-user-id
Gov-Client-Timezone: UTC+00:00
Gov-Client-Local-IPs: 10.0.0.1
Gov-Client-Screens: width=1920&height=1080&scaling-factor=1&colour-depth=24
Gov-Client-Window-Size: width=1200&height=800
Gov-Client-Browser-JS-User-Agent: Mozilla/5.0...
Gov-Client-Browser-Plugins: plugin1,plugin2
Gov-Client-Browser-Do-Not-Track: false
Gov-Client-Multi-Factor: type=TOTP
Gov-Vendor-Version: TaxSorted=1.0.0
Gov-Vendor-License-IDs: taxsorted-license-id
Gov-Vendor-Product-Name: TaxSorted
```

### Header Collection (Frontend)

```javascript
// Collect browser information
const fraudHeaders = {
  'Gov-Client-Device-ID': getOrCreateDeviceId(),
  'Gov-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
  'Gov-Client-Screens': `width=${screen.width}&height=${screen.height}&scaling-factor=${window.devicePixelRatio}&colour-depth=${screen.colorDepth}`,
  'Gov-Client-Window-Size': `width=${window.innerWidth}&height=${window.innerHeight}`,
  'Gov-Client-Browser-JS-User-Agent': navigator.userAgent,
  'Gov-Client-Browser-Plugins': getPlugins(),
  'Gov-Client-Browser-Do-Not-Track': navigator.doNotTrack === '1',
  'Gov-Client-Local-IPs': await getLocalIPs() // WebRTC
};
```

---

## Error Handling

### Common Error Responses

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `INVALID_VRN` | VRN format invalid |
| 400 | `INVALID_DATE_RANGE` | Date range invalid |
| 400 | `INVALID_PERIODKEY` | Period key not found |
| 401 | `UNAUTHORIZED` | Token invalid/expired |
| 403 | `FORBIDDEN` | No permission for VRN |
| 404 | `NOT_FOUND` | Resource not found |
| 422 | `DUPLICATE_SUBMISSION` | Return already submitted |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded |

### Error Response Format

```json
{
  "code": "INVALID_VRN",
  "message": "The provided VRN is invalid"
}
```

---

## Data Model (TaxSorted)

### VAT Return Entity

```typescript
interface VATReturn {
  id: string;
  clientId: string;
  vrn: string;
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;

  // Box values
  vatDueSales: number;
  vatDueAcquisitions: number;
  totalVatDue: number;
  vatReclaimedCurrPeriod: number;
  netVatDue: number;
  totalValueSalesExVAT: number;
  totalValuePurchasesExVAT: number;
  totalValueGoodsSuppliedExVAT: number;
  totalAcquisitionsExVAT: number;

  // Status
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: Date;
  hmrcReference?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### VAT Obligation Entity

```typescript
interface VATObligation {
  id: string;
  clientId: string;
  vrn: string;
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  status: 'open' | 'fulfilled';
  receivedDate?: Date;
  syncedAt: Date;
}
```

---

## Implementation Checklist

### Setup
- [ ] Register application on HMRC Developer Hub
- [ ] Create sandbox application
- [ ] Implement OAuth 2.0 flow
- [ ] Implement token storage and refresh
- [ ] Implement fraud prevention header collection

### Endpoints
- [ ] GET obligations
- [ ] POST submit return
- [ ] GET view return
- [ ] GET liabilities
- [ ] GET payments
- [ ] GET penalties

### Testing
- [ ] Test all endpoints in sandbox
- [ ] Test error scenarios
- [ ] Validate fraud prevention headers
- [ ] Test token refresh flow

### Production
- [ ] Apply for production credentials
- [ ] Pass HMRC review
- [ ] Deploy production integration

---

## Test Scenarios (Sandbox)

Use `Gov-Test-Scenario` header:

| Scenario | Description |
|----------|-------------|
| `QUARTERLY_NONE_MET` | No obligations |
| `QUARTERLY_ONE_MET` | One fulfilled |
| `QUARTERLY_TWO_MET` | Two fulfilled |
| `QUARTERLY_THREE_MET` | Three fulfilled |
| `QUARTERLY_FOUR_MET` | All fulfilled |
| `NOT_FOUND` | VRN not found |

---

*Integration spec created: 2026-02-01*
