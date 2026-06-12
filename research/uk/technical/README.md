# Technical Integration: How Do We Connect to HMRC?

> **PP Dimension**: CREATIVITY
> **Core Question**: What APIs and systems must we integrate with?

---

## HMRC Integration Landscape

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TAXSORTED.IO                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   HMRC Developer Hub  │
                    │   developer.service   │
                    │      .hmrc.gov.uk     │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼────┐            ┌─────▼─────┐          ┌──────▼──────┐
   │  MTD    │            │    SA     │          │    VAT      │
   │  ITSA   │            │   APIs    │          │    APIs     │
   └────┬────┘            └─────┬─────┘          └──────┬──────┘
        │                       │                       │
   Income Tax              Self Assessment          VAT Returns
   (from 2026)             (current)                (live now)
```

---

## HMRC API Categories

### 1. Self Assessment APIs (Current Priority)

| API | Purpose | Status |
|-----|---------|--------|
| **Individual Details** | Get taxpayer info | Live |
| **Individual Calculations** | Tax calculation | Live |
| **Individual Losses** | Loss claims | Live |
| **Self Assessment** | Submit returns | Live |
| **Self Assessment BSAS** | Business summary | Live |
| **Property Business** | Rental income | Live |
| **Self Employment Business** | Trading income | Live |

### 2. MTD APIs (Future - from April 2026)

| API | Purpose | Status |
|-----|---------|--------|
| **MTD ITSA** | Income Tax Self Assessment | In development |
| **Business Details** | Business registration | Live |
| **Obligations** | Filing obligations | Live |

### 3. VAT APIs (If expanding)

| API | Purpose | Status |
|-----|---------|--------|
| **VAT (MTD)** | Submit VAT returns | Live |
| **VAT Returns** | Retrieve returns | Live |
| **VAT Obligations** | Filing requirements | Live |
| **VAT Liabilities** | Payment info | Live |
| **VAT Payments** | Payment history | Live |

---

## Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  User   │────►│ TaxSorted   │────►│   HMRC       │────►│ Gov.UK   │
│         │     │   App       │     │   OAuth      │     │ Verify   │
└─────────┘     └─────────────┘     └──────────────┘     └──────────┘
     │                                     │                    │
     │         ┌───────────────────────────┘                    │
     │         │                                                │
     │         ▼                                                │
     │    ┌─────────────┐                                       │
     │    │ Government  │◄──────────────────────────────────────┘
     │    │   Gateway   │
     │    │   Login     │
     │    └──────┬──────┘
     │           │
     │           ▼
     │    ┌─────────────┐
     │    │   Access    │
     │    │   Token     │
     │    └──────┬──────┘
     │           │
     └───────────┴───────── Back to TaxSorted with token
```

### OAuth 2.0 Scopes Required

| Scope | Description |
|-------|-------------|
| `read:self-assessment` | Read SA data |
| `write:self-assessment` | Submit SA returns |
| `read:vat` | Read VAT data |
| `write:vat` | Submit VAT returns |
| `read:individual-details` | Personal info |

---

## API Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| **Sandbox** | `https://test-api.service.hmrc.gov.uk` | Development & testing |
| **Production** | `https://api.service.hmrc.gov.uk` | Live submissions |

---

## Key Technical Requirements

### 1. Registration Process
- [ ] Register as software developer on HMRC Developer Hub
- [ ] Create sandbox application
- [ ] Test with sandbox users
- [ ] Apply for production credentials
- [ ] Pass HMRC recognition process

### 2. Fraud Prevention Headers
HMRC requires anti-fraud headers on all API calls:

| Header | Description |
|--------|-------------|
| `Gov-Client-Connection-Method` | How client connects |
| `Gov-Client-Device-ID` | Unique device identifier |
| `Gov-Client-User-IDs` | User identifiers |
| `Gov-Client-Timezone` | Client timezone |
| `Gov-Client-Local-IPs` | Client IP addresses |
| `Gov-Client-Screens` | Screen information |
| `Gov-Client-Window-Size` | Browser window size |
| `Gov-Client-Browser-Plugins` | Browser plugins |
| `Gov-Client-Browser-JS-User-Agent` | JS user agent |
| `Gov-Client-Browser-Do-Not-Track` | DNT setting |
| `Gov-Client-Multi-Factor` | MFA methods used |
| `Gov-Client-Public-IP` | Public IP |
| `Gov-Client-Public-Port` | Public port |
| `Gov-Vendor-Version` | Software version |
| `Gov-Vendor-License-IDs` | License identifiers |
| `Gov-Vendor-Product-Name` | Product name |

### 3. Test Data
HMRC provides test individuals with different scenarios:
- Standard individual
- Individual with multiple income sources
- Individual with losses
- Scottish taxpayer
- Welsh taxpayer

---

## Data Formats

### Request/Response Format
- **Format**: JSON
- **Content-Type**: `application/json`
- **Accept**: `application/vnd.hmrc.2.0+json`

### Date Formats
- **Tax Year**: `2024-25` format
- **Dates**: ISO 8601 (`2024-01-31`)

### Amount Formats
- **Currency**: GBP implied
- **Precision**: 2 decimal places
- **Negative**: Allowed for losses

---

## Security Requirements

### 1. TLS
- TLS 1.2+ required
- Certificate pinning recommended

### 2. Token Storage
- Secure storage for access/refresh tokens
- Token encryption at rest
- Automatic token refresh

### 3. Data Protection
- GDPR compliance
- Data minimization
- Right to deletion support
- Audit logging

---

## Research Tasks

### API Documentation Review
- [ ] Complete API endpoint inventory
- [ ] Document all request/response schemas
- [ ] Map error codes and handling
- [ ] Identify rate limits

### Authentication
- [ ] OAuth 2.0 flow implementation
- [ ] Government Gateway integration
- [ ] Token refresh strategy
- [ ] Multi-factor authentication requirements

### Testing Strategy
- [ ] Sandbox test scenarios
- [ ] Test data management
- [ ] API mocking for development
- [ ] End-to-end test suite

### Production Readiness
- [ ] HMRC recognition requirements
- [ ] Security assessment
- [ ] Privacy impact assessment
- [ ] Support and SLA requirements

---

## Files to Create

```
technical/
├── README.md (this file)
├── hmrc-apis/
│   ├── overview.md
│   ├── self-assessment-api.md
│   ├── mtd-itsa-api.md
│   ├── vat-api.md
│   └── endpoints.md
├── authentication/
│   ├── oauth-flow.md
│   ├── government-gateway.md
│   └── token-management.md
├── security-requirements/
│   ├── fraud-headers.md
│   ├── tls-requirements.md
│   └── data-protection.md
├── data-formats/
│   ├── request-schemas.md
│   ├── response-schemas.md
│   └── error-codes.md
└── mtd-specifications/
    ├── mtd-overview.md
    ├── quarterly-obligations.md
    └── final-declaration.md
```

---

## Key Sources

- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk/)
- [API Documentation](https://developer.service.hmrc.gov.uk/api-documentation)
- [Fraud Prevention Specification](https://developer.service.hmrc.gov.uk/guides/fraud-prevention/)
- [MTD for Income Tax](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/)
- [OAuth 2.0 Guide](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation)
- [Test Users](https://developer.service.hmrc.gov.uk/api-documentation/docs/testing)
