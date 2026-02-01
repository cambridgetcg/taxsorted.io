# HMRC API Research: Comprehensive Coverage Analysis

> **Purpose**: Extensive research on HMRC API coverage for TaxSorted.io integration
> **Research Date**: 2026-02-01
> **PP Mode**: UNDERSTANDING (External API Documentation)

---

## Executive Summary

HMRC provides **two distinct API ecosystems**:

| Ecosystem | Type | Filing Coverage | Status |
|-----------|------|-----------------|--------|
| **MTD APIs** | REST (JSON) | VAT, Income Tax (SA for self-employed/landlords) | Live, expanding |
| **XML APIs** | SOAP/XML | CT600, PAYE/RTI, SA (legacy), CIS | Live, stable |

**Key Insight**: There is NO single unified API. Different filings require different API types, authentication methods, and data formats.

---

## Part 1: API Architecture Overview

### 1.1 REST APIs (Making Tax Digital)

**Base URLs**:
- Sandbox: `https://test-api.service.hmrc.gov.uk`
- Production: `https://api.service.hmrc.gov.uk`

**Authentication**: OAuth 2.0

**Format**: JSON

**Fraud Prevention**: Mandatory HTTP headers required by law

### 1.2 XML APIs (Legacy/Established)

**Gateway**: HMRC XML Gateway

**Authentication**: Government Gateway credentials + Vendor credentials

**Format**: XML with specific schemas per service

**iXBRL**: Required for CT600 accounts

---

## Part 2: Complete API Catalogue (Relevant to Filing)

### 2.1 VAT (MTD) API

| Aspect | Detail |
|--------|--------|
| **Version** | 1.0 (beta) |
| **Type** | REST |
| **Filing** | VAT100 return |
| **Status** | Live (mandatory for all VAT-registered) |

**Endpoints**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/organisations/vat/{vrn}/obligations` | GET | Retrieve VAT obligations (what's due) |
| `/organisations/vat/{vrn}/returns` | POST | Submit VAT return |
| `/organisations/vat/{vrn}/returns/{periodKey}` | GET | View submitted return |
| `/organisations/vat/{vrn}/liabilities` | GET | View VAT liabilities |
| `/organisations/vat/{vrn}/payments` | GET | View VAT payments |
| `/organisations/vat/{vrn}/penalties` | GET | View penalties |

**Data Submitted** (VAT Return):
```json
{
  "periodKey": "A001",
  "vatDueSales": 100.00,
  "vatDueAcquisitions": 0.00,
  "totalVatDue": 100.00,
  "vatReclaimedCurrPeriod": 50.00,
  "netVatDue": 50.00,
  "totalValueSalesExVAT": 500,
  "totalValuePurchasesExVAT": 250,
  "totalValueGoodsSuppliedExVAT": 0,
  "totalAcquisitionsExVAT": 0,
  "finalised": true
}
```

**Source**: [HMRC VAT MTD End-to-End Guide](https://developer.service.hmrc.gov.uk/guides/vat-mtd-end-to-end-service-guide/)

---

### 2.2 Income Tax (MTD) APIs

**Covers**: Self-employed, landlords (property income), partnerships (members)

**NOT Covers**: Employment income (reported by employer), dividends from companies, trusts

#### 2.2.1 Business Details API (v2.0)

| Purpose | List businesses linked to individual |
|---------|--------------------------------------|
| **Endpoint** | `/individuals/business/details/{nino}/list` |
| **Returns** | Business IDs, types, commencement dates |

#### 2.2.2 Obligations API (v3.0)

| Purpose | Retrieve filing obligations |
|---------|----------------------------|
| **Endpoint** | `/obligations/details/{nino}/income-tax` |
| **Returns** | Quarterly deadlines, EOPS deadlines, fulfilled status |

**Quarterly Update Deadlines** (MTD ITSA):

| Quarter | Period | Deadline |
|---------|--------|----------|
| Q1 | 6 Apr - 5 Jul | 5 August |
| Q2 | 6 Jul - 5 Oct | 5 November |
| Q3 | 6 Oct - 5 Jan | 5 February |
| Q4 | 6 Jan - 5 Apr | 5 May |

#### 2.2.3 Self Employment Business API (v5.0)

| Purpose | Submit self-employment income/expenses |
|---------|---------------------------------------|
| **Quarterly updates** | Income and expenses per quarter |
| **Annual adjustments** | Year-end adjustments (BSAS) |

**Income Categories**:
- Turnover
- Other income

**Expense Categories** (detailed or consolidated):
- Cost of goods sold
- Premises running costs
- Travel costs
- Staff costs
- Professional fees
- Advertising/marketing
- Interest
- Depreciation
- Other expenses

#### 2.2.4 Property Business API (v6.0)

| Purpose | Submit property income/expenses |
|---------|--------------------------------|
| **UK Property** | Rental income, FHL |
| **Foreign Property** | Overseas rental |

**Income Categories**:
- Rent received
- Premium for lease
- Reverse premiums
- Other income

**Expense Categories**:
- Premises costs
- Repairs and maintenance
- Financial costs (interest)
- Professional fees
- Other allowable costs

#### 2.2.5 Individual Calculations API (v8.0)

| Purpose | Trigger and retrieve tax calculations |
|---------|--------------------------------------|
| **Trigger** | Request calculation based on submitted data |
| **Retrieve** | Get calculation results, breakdown |
| **Final Declaration** | Submit crystallisation |

**Calculation Output**:
- Income summary
- Allowances and deductions
- Tax due by source
- NI calculations
- Total liability

#### 2.2.6 Additional Income APIs

| API | Version | Purpose |
|-----|---------|---------|
| **Employments Income** | v2.0 | Employment income (view/amend) |
| **Dividends Income** | v2.0 | Dividend income |
| **Savings Income** | v2.0 | Interest, savings |
| **Pensions Income** | v2.0 | Pension income |
| **Foreign Income** | v2.0 | Overseas income |
| **Other Income** | v2.0 | Miscellaneous income |
| **Capital Gains Income** | v3.0 | CGT disposals |
| **State Benefits** | v2.0 | Taxable state benefits |

#### 2.2.7 Reliefs and Deductions APIs

| API | Version | Purpose |
|-----|---------|---------|
| **Individual Reliefs** | v3.0 | Investment reliefs, SEIS/EIS |
| **Individual Losses** | v6.0 | Loss claims, carry forward |
| **Individuals Charges** | v3.0 | Pension charges |
| **Individuals Expenses** | v3.0 | Employment expenses |
| **Other Deductions** | v2.0 | Other deductible items |

**Source**: [HMRC Income Tax MTD End-to-End Guide](https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/)

---

### 2.3 Corporation Tax Online (XML API)

| Aspect | Detail |
|--------|--------|
| **Type** | XML |
| **Filing** | CT600 + iXBRL accounts |
| **Status** | Live |
| **From April 2026** | Commercial software mandatory |

**Submission Components**:
1. CT600 XML (return data)
2. iXBRL Computations (tax calculations)
3. iXBRL Accounts (statutory accounts)

**Authentication**:
- Government Gateway (company)
- Vendor credentials (software provider)
- UTR (Unique Taxpayer Reference)

**Technical Resources**:
- [CT600 Technical Specifications](https://www.gov.uk/government/collections/corporation-tax-online-support-for-software-developers)
- CT600 RIM Artefacts (schemas)
- CT600 Valid XML Samples
- XBRL/iXBRL Format specifications

**iXBRL Taxonomies**:
- UK GAAP (FRS 102)
- FRS 101 (reduced disclosure)
- FRS 105 (micro-entities)
- IFRS
- Charities SORP

**IRMark**: Cryptographic hash of submission for integrity verification

---

### 2.4 PAYE/RTI Online (XML API)

| Aspect | Detail |
|--------|--------|
| **Type** | XML |
| **Filing** | FPS, EPS, NVR, EYU |
| **Status** | Live (mandatory since 2013) |

**Submission Types**:

| Submission | Purpose | Frequency |
|------------|---------|-----------|
| **FPS** | Full Payment Submission | Per payday |
| **EPS** | Employer Payment Summary | Monthly (by 19th) |
| **NVR** | National Insurance Verification Request | As needed |
| **EYU** | Earlier Year Update | Corrections to previous year |

**FPS Data Elements**:
- Employee details (NI number, name, DOB)
- Pay period
- Gross pay (this period, YTD)
- Tax deducted (this period, YTD)
- NI contributions (employee, employer)
- Student loan deductions
- Pension contributions
- Starter/leaver information
- Statutory payments

**Technical Resources**:
- [RTI Technical Specifications](https://www.gov.uk/government/collections/real-time-information-online-internet-submissions-support-for-software-developers)
- Year-specific schemas (2026-27 available)
- Local Test Service for development

**Contact**: SDSTeam@hmrc.gov.uk

---

### 2.5 Self Assessment Online (XML API)

| Aspect | Detail |
|--------|--------|
| **Type** | XML |
| **Filing** | SA100 and supplements |
| **Status** | Live (being superseded by MTD ITSA) |

**Note**: For individuals NOT mandated into MTD ITSA, the XML API remains available for SA100 submission.

**Supplements Available**:
- SA102 (Employment)
- SA103 (Self-employment)
- SA104 (Partnership)
- SA105 (Property)
- SA106 (Foreign)
- SA108 (Capital gains)
- SA109 (Residence)

---

### 2.6 Construction Industry Scheme (CIS)

| API | Type | Purpose |
|-----|------|---------|
| **CIS Deductions (MTD)** | REST v3.0 | Manage CIS deductions suffered |
| **CIS Online** | XML | Verify subcontractors, submit monthly returns |

**CIS Online Capabilities**:
- Verify subcontractor status
- Submit monthly CIS300 returns
- Manage subcontractor records

---

### 2.7 Agent Authorisation API (v2.0)

| Aspect | Detail |
|--------|--------|
| **Type** | REST |
| **Purpose** | Agents request/manage client authorisation |
| **Fraud Headers** | Not required |

**Capabilities**:
- Request authorisation (MTD VAT or MTD ITSA)
- Cancel pending requests
- Query request status
- Check active agent-client relationships

**Agent-Client Flow**:
1. Agent requests authorisation via API
2. Client receives invitation
3. Client approves/rejects via HMRC online
4. Relationship established (queryable via API)

---

### 2.8 Other Relevant APIs

| API | Purpose | Type |
|-----|---------|------|
| **Charities Online** | Gift Aid claims | XML |
| **Pension Schemes Online** | Scheme registration, declarations | XML |
| **Stamp Taxes Online** | SDLT returns | XML |
| **EC Sales List Online** | EU sales lists | XML |
| **Trust Registration** | TRS registration | REST (via HMRC APIs) |

---

## Part 3: Authentication & Authorization

### 3.1 OAuth 2.0 (REST APIs)

**Grant Types**:

| Type | Use Case |
|------|----------|
| **Authorization Code Grant** | User-restricted endpoints (most filings) |
| **Client Credentials Grant** | Application-restricted endpoints |

**Flow (Authorization Code)**:
1. Redirect user to HMRC authorize endpoint
2. User logs in via Government Gateway
3. User grants consent to application
4. HMRC redirects back with authorization code
5. Exchange code for access token + refresh token
6. Use access token for API calls
7. Refresh token when expired

**Token Lifetime**:
- Access token: 4 hours
- Refresh token: 18 months

**Scopes** (per service):
- `read:vat` - Read VAT data
- `write:vat` - Submit VAT returns
- `read:self-assessment` - Read SA data
- `write:self-assessment` - Submit SA data

### 3.2 Government Gateway (XML APIs)

**Components Required**:
- Government Gateway User ID
- Government Gateway Password
- Vendor credentials (from HMRC)
- Service activation (CT, PAYE, etc.)

**Enrolment Required**: Each service must be enrolled to the Gateway account

---

## Part 4: Fraud Prevention Headers

### 4.1 Legal Requirement

> "You are required by law to submit header data for the VAT (MTD) and Income Tax Self Assessment (MTD) APIs."

**Non-compliance consequences**:
- Fines for software providers
- Blocked from using HMRC APIs

### 4.2 Header Categories

| Category | Examples |
|----------|----------|
| **Device information** | Screen resolution, OS, browser |
| **Connection method** | Direct, via agent, batch |
| **User identifiers** | Government Gateway ID (hashed) |
| **Timestamps** | Local time, timezone |
| **Multi-factor authentication** | If MFA used |
| **Client IP** | Originating IP addresses |

### 4.3 Header Names

Key headers include:
- `Gov-Client-Connection-Method`
- `Gov-Client-Device-ID`
- `Gov-Client-User-IDs`
- `Gov-Client-Timezone`
- `Gov-Client-Local-IPs`
- `Gov-Client-Screens`
- `Gov-Client-Window-Size`
- `Gov-Client-Browser-JS-User-Agent`
- `Gov-Client-Browser-Plugins`
- `Gov-Client-Multi-Factor`
- `Gov-Vendor-Version`
- `Gov-Vendor-License-IDs`

**Validation Tool**: HMRC provides Test Fraud Prevention Headers API for validation during development.

**Source**: [HMRC Fraud Prevention Guide](https://developer.service.hmrc.gov.uk/guides/fraud-prevention/)

---

## Part 5: Rate Limits & Technical Constraints

### 5.1 Standard Rate Limits

| Limit | Value |
|-------|-------|
| **Default** | 3 requests per second per application |
| **CDS (Customs)** | 8 requests per second |
| **Custom limits** | Contact HMRC to discuss |

### 5.2 Rate Limit Response

| HTTP Status | Meaning |
|-------------|---------|
| **429** | Too Many Requests |

**Handling**:
- Stop making requests temporarily
- Add random delay before retry
- Implement exponential backoff
- Consider local rate limiting in high-volume scenarios

### 5.3 Design Recommendations

- Avoid batching requests
- Design for real-time interactions
- Spread requests across time (not spikes)
- Contact HMRC if consistent rate limiting

**Source**: [HMRC Reference Guide](https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide)

---

## Part 6: Testing & Sandbox

### 6.1 Sandbox Environment

| Aspect | Detail |
|--------|--------|
| **URL** | `https://test-api.service.hmrc.gov.uk` |
| **Purpose** | Development and testing |
| **Data** | Synthetic test data |

### 6.2 Test User API

Create test users via `/create-test-user/` endpoints for different scenarios.

### 6.3 Gov-Test-Scenario Header

Use `Gov-Test-Scenario` header to trigger specific test scenarios (errors, edge cases).

### 6.4 Local Test Service (XML APIs)

HMRC provides downloadable Local Test Service for:
- CT600 validation
- RTI validation
- Schema compliance testing

---

## Part 7: Integration Recommendations for TaxSorted.io

### 7.1 Phased Integration Approach

**Phase 1: High-Value REST APIs** (Recommended first)

| Priority | API | Filing | Complexity |
|----------|-----|--------|------------|
| 1 | VAT (MTD) | VAT100 | Medium |
| 2 | Obligations | Check what's due | Low |
| 3 | Agent Authorisation | Client management | Medium |

**Phase 2: MTD ITSA APIs**

| Priority | API | Filing | Complexity |
|----------|-----|--------|------------|
| 4 | Business Details | Business lookup | Low |
| 5 | Self Employment | SE quarterly updates | Medium |
| 6 | Property Business | Property quarterly updates | Medium |
| 7 | Individual Calculations | Tax calculation | Medium |
| 8 | Additional Income APIs | Other income types | Medium |

**Phase 3: XML APIs** (Higher complexity)

| Priority | API | Filing | Complexity |
|----------|-----|--------|------------|
| 9 | PAYE/RTI | FPS, EPS | High |
| 10 | CT600 | Corporation Tax | High (iXBRL) |

### 7.2 Technical Requirements

**For REST APIs**:
- OAuth 2.0 implementation
- Fraud prevention header collection & submission
- JSON handling
- Token refresh management
- Webhook/polling for async operations

**For XML APIs**:
- XML schema validation
- Government Gateway integration
- Vendor credential management
- iXBRL generation (for CT600)

### 7.3 Agent vs Direct Filing

| Model | Description | APIs |
|-------|-------------|------|
| **Agent filing** | TaxSorted acts as agent | Agent Authorisation + all filing APIs |
| **Client direct** | Client authorises, TaxSorted facilitates | Filing APIs only |

**Recommendation**: Support both models. Agent model provides better UX for accountants.

### 7.4 Data Architecture Considerations

**Store locally**:
- Business/client details
- Income/expense records
- Calculation results
- Submission history
- Obligation tracking

**Fetch from HMRC**:
- Current obligations (real-time)
- Submission confirmations
- Liability/payment status
- Penalty information

### 7.5 Compliance Checklist

| Requirement | Detail |
|-------------|--------|
| ☐ HMRC Developer Registration | Create account on Developer Hub |
| ☐ Sandbox Application | Test application created |
| ☐ Fraud Prevention Headers | Implement all required headers |
| ☐ Header Validation | Pass HMRC header validation |
| ☐ Production Application | Apply for production credentials |
| ☐ HMRC Approval | Production access granted |
| ☐ Recognised Software | Listed on HMRC software list |

---

## Part 8: API Coverage Gaps

### 8.1 What HMRC APIs DO NOT Cover

| Filing | API Available? | Workaround |
|--------|----------------|------------|
| **SA800 (Partnership)** | No REST API | XML API or portal |
| **SA900 (Trust)** | No dedicated API | Portal only |
| **IHT100** | No API | Portal only |
| **SDLT** | XML API (limited) | Portal recommended |
| **CT600 (REST)** | Not yet | XML API only |
| **P11D** | No submission API | Portal / PAYE tools |
| **P60** | No API | Generated from PAYE data |

### 8.2 Portal-Only Filings (No API)

For TaxSorted.io, these require:
- Data export functionality (pre-fill format)
- User guidance to complete in portal
- Reminder/deadline tracking

---

## Part 9: Key Sources & Documentation

### Official HMRC Resources

| Resource | URL |
|----------|-----|
| **Developer Hub** | https://developer.service.hmrc.gov.uk/ |
| **API Documentation** | https://developer.service.hmrc.gov.uk/api-documentation |
| **VAT MTD Guide** | https://developer.service.hmrc.gov.uk/guides/vat-mtd-end-to-end-service-guide/ |
| **ITSA MTD Guide** | https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/ |
| **Fraud Prevention** | https://developer.service.hmrc.gov.uk/guides/fraud-prevention/ |
| **Reference Guide** | https://developer.service.hmrc.gov.uk/api-documentation/docs/reference-guide |

### XML API Resources

| Resource | URL |
|----------|-----|
| **CT600 Specs** | https://www.gov.uk/government/collections/corporation-tax-online-support-for-software-developers |
| **RTI Specs** | https://www.gov.uk/government/collections/real-time-information-online-internet-submissions-support-for-software-developers |
| **Software Dev Overview** | https://www.gov.uk/topic/dealing-with-hmrc/software-development |

### GitHub Repositories

| Repository | Content |
|------------|---------|
| **HMRC income-tax-mtd-changelog** | API changelogs, field mappings |
| **cybermaggedon/ct600** | Open-source CT600 submission tool |
| **craigfrancis/hmrc-rti** | PHP RTI implementation |

---

## Part 10: Key Insights for TaxSorted.io

### 10.1 Strategic Insights

1. **MTD is the future** - Invest primarily in REST APIs; XML will eventually be superseded
2. **VAT first** - Most mature, mandatory for all VAT-registered, good starting point
3. **Agent model essential** - Most accountants operate as agents; API support is good
4. **Fraud headers are serious** - Non-compliance = blocked from APIs
5. **iXBRL is a barrier** - CT600 requires iXBRL; consider partnering or using existing tools

### 10.2 Technical Insights

1. **Two ecosystems** - REST (MTD) and XML (legacy) require different implementations
2. **OAuth complexity** - Token management, refresh, multi-user sessions need robust handling
3. **Rate limits matter** - 3/second is low; design for efficiency
4. **Sandbox testing mandatory** - Must demonstrate testing before production access
5. **Field mappings available** - HMRC provides CSV mapping API fields → SA boxes

### 10.3 Product Insights

1. **Obligations API is powerful** - Single source for "what's due when"
2. **Calculations API valuable** - Show users tax position in real-time
3. **Agent Auth enables scale** - One connection, many clients
4. **Some filings = portal only** - Build good data export for these
5. **Penalties visible via API** - Surface this proactively to users

---

*Research completed: 2026-02-01*
*Sources: HMRC Developer Hub, GOV.UK, Web search*
