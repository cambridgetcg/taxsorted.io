# Phase 3: CT600 Corporation Tax XML + iXBRL Integration Specification

> **Priority**: 8
> **Complexity**: Very High
> **Status**: Live (Mandatory for all UK companies)

---

## Overview

| Aspect | Detail |
|--------|--------|
| **API Name** | Corporation Tax Online (COTAX) |
| **Type** | XML (GovTalk) + iXBRL |
| **Protocol** | HTTPS |
| **Gateway URL (Sandbox)** | `https://test-transaction-engine.tax.service.gov.uk/submission` |
| **Gateway URL (Production)** | `https://transaction-engine.tax.service.gov.uk/submission` |
| **Authentication** | Government Gateway |
| **Message Format** | XML with embedded iXBRL attachments |

---

## Purpose

Submit complete Corporation Tax returns to HMRC:
- CT600 return (tax computation)
- Full accounts (iXBRL)
- Tax computations (iXBRL)
- Supplementary pages (as applicable)

---

## ⚠️ Critical: iXBRL Requirement

Since April 2011, **all companies** must submit:
- Accounts in **iXBRL format** (inline XBRL embedded in XHTML)
- Tax computations in **iXBRL format**

This is **mandatory** - there is no alternative submission format for accounts.

---

## Submission Components

| Component | Format | Purpose |
|-----------|--------|---------|
| **CT600** | XML | Corporation tax return data |
| **Accounts** | iXBRL | Statutory accounts (tagged) |
| **Computations** | iXBRL | Tax computation (tagged) |
| **CT600A** | XML | Loans to participators |
| **CT600B** | XML | Controlled foreign companies |
| **CT600C** | XML | Group/consortium relief |
| **CT600D** | XML | Insurance |
| **CT600E** | XML | Charities |
| **CT600J** | XML | Creative industry claims |

---

## GovTalk Envelope Structure

### Request Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-CT-CT600</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <TransactionID>CT600-2024-001</TransactionID>
      <AuditID/>
      <CorrelationID/>
      <Transformation>XML</Transformation>
      <GatewayTest>1</GatewayTest>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>YOUR_GATEWAY_ID</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Role>principal</Role>
          <Value>YOUR_PASSWORD</Value>
        </Authentication>
      </IDAuthentication>
      <EmailAddress>accounts@company.co.uk</EmailAddress>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys>
      <Key Type="UTR">1234567890</Key>
    </Keys>
    <TargetDetails>
      <Organisation>HMRC</Organisation>
    </TargetDetails>
    <ChannelRouting>
      <Channel>
        <URI>YOUR_SOFTWARE_ID</URI>
        <Product>TaxSorted</Product>
        <Version>1.0</Version>
      </Channel>
    </ChannelRouting>
  </GovTalkDetails>
  <Body>
    <IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/CT/3">
      <!-- CT600 content -->
    </IRenvelope>
  </Body>
</GovTalkMessage>
```

---

## CT600 XML Structure

### Core Return

```xml
<IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/CT/3">
  <IRheader>
    <Keys>
      <Key Type="UTR">1234567890</Key>
    </Keys>
    <PeriodStart>2023-04-01</PeriodStart>
    <PeriodEnd>2024-03-31</PeriodEnd>
    <Principal>
      <Contact>
        <Name>
          <Title>Mr</Title>
          <Forename>John</Forename>
          <Surname>Smith</Surname>
        </Name>
        <Email>john.smith@company.co.uk</Email>
        <Telephone>02071234567</Telephone>
      </Contact>
    </Principal>
    <Agent>
      <AgentID>12345678</AgentID>
      <Contact>
        <Name>
          <Title>Mrs</Title>
          <Forename>Jane</Forename>
          <Surname>Doe</Surname>
        </Name>
        <Email>jane@accountants.co.uk</Email>
        <Telephone>02079876543</Telephone>
      </Contact>
    </Agent>
    <IRmark Type="generic"><!-- calculated hash --></IRmark>
    <Sender>Agent</Sender>
  </IRheader>
  <CompanyInformation>
    <CompanyName>ABC Trading Limited</CompanyName>
    <RegistrationNumber>12345678</RegistrationNumber>
    <CompanyType>Private Limited Company</CompanyType>
    <RegisteredAddress>
      <Line1>123 Business Park</Line1>
      <Line2>Industrial Estate</Line2>
      <PostCode>SW1A 1AA</PostCode>
    </RegisteredAddress>
  </CompanyInformation>
  <Turnover>1500000.00</Turnover>
  <TradingResults>
    <TradingProfits>250000.00</TradingProfits>
    <TradingLosses>0.00</TradingLosses>
  </TradingResults>
  <TotalProfitsBeforeDeductions>250000.00</TotalProfitsBeforeDeductions>
  <ChargeableGains>
    <TotalGains>50000.00</TotalGains>
    <AllowableLosses>10000.00</AllowableLosses>
    <NetGains>40000.00</NetGains>
  </ChargeableGains>
  <InvestmentIncome>
    <FrankedInvestmentIncome>0.00</FrankedInvestmentIncome>
    <UnfrankedInvestmentIncome>5000.00</UnfrankedInvestmentIncome>
  </InvestmentIncome>
  <LoanRelationships>
    <NonTradingCredits>2000.00</NonTradingCredits>
    <NonTradingDebits>500.00</NonTradingDebits>
  </LoanRelationships>
  <TaxCalculation>
    <TaxableProfit>295000.00</TaxableProfit>
    <CorporationTaxRate>25</CorporationTaxRate>
    <CorporationTaxChargeable>73750.00</CorporationTaxChargeable>
    <MarginalRelief>0.00</MarginalRelief>
    <CorporationTaxPayable>73750.00</CorporationTaxPayable>
  </TaxCalculation>
  <Declaration>
    <DeclarationStatus>Accepted</DeclarationStatus>
    <DeclarationName>John Smith</DeclarationName>
    <DeclarationDate>2024-12-15</DeclarationDate>
  </Declaration>
  <Attachments>
    <Attachment>
      <AttachmentType>Accounts</AttachmentType>
      <Encoding>base64</Encoding>
      <Filename>accounts-2024.html</Filename>
      <Content><!-- Base64 encoded iXBRL --></Content>
    </Attachment>
    <Attachment>
      <AttachmentType>Computations</AttachmentType>
      <Encoding>base64</Encoding>
      <Filename>computations-2024.html</Filename>
      <Content><!-- Base64 encoded iXBRL --></Content>
    </Attachment>
  </Attachments>
</IRenvelope>
```

---

## iXBRL (Inline XBRL)

### What is iXBRL?

iXBRL embeds XBRL tags directly into an XHTML document:
- Human-readable HTML for viewing
- Machine-readable XBRL tags for processing
- Uses UK GAAP or IFRS taxonomies

### Example iXBRL Accounts Fragment

```html
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"
      xmlns:uk-gaap="http://www.xbrl.org/uk/gaap/core/2009-09-01"
      xmlns:uk-bus="http://www.xbrl.org/uk/cd/business/2009-09-01">
<head>
  <title>Annual Accounts - ABC Trading Limited</title>
  <ix:header>
    <ix:references>
      <link:schemaRef xlink:href="http://www.xbrl.org/uk/gaap/core/2009-09-01"/>
    </ix:references>
    <ix:resources>
      <xbrli:context id="FY2024">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">12345678</xbrli:identifier>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:startDate>2023-04-01</xbrli:startDate>
          <xbrli:endDate>2024-03-31</xbrli:endDate>
        </xbrli:period>
      </xbrli:context>
      <xbrli:unit id="GBP">
        <xbrli:measure>iso4217:GBP</xbrli:measure>
      </xbrli:unit>
    </ix:resources>
  </ix:header>
</head>
<body>
  <h1>ABC Trading Limited</h1>
  <h2>Annual Report and Financial Statements</h2>
  <h3>For the year ended 31 March 2024</h3>

  <h2>Profit and Loss Account</h2>
  <table>
    <tr>
      <td>Turnover</td>
      <td>
        <ix:nonFraction name="uk-gaap:Turnover" contextRef="FY2024" unitRef="GBP" decimals="0">
          1,500,000
        </ix:nonFraction>
      </td>
    </tr>
    <tr>
      <td>Cost of Sales</td>
      <td>
        <ix:nonFraction name="uk-gaap:CostSales" contextRef="FY2024" unitRef="GBP" decimals="0" sign="-">
          (900,000)
        </ix:nonFraction>
      </td>
    </tr>
    <tr>
      <td>Gross Profit</td>
      <td>
        <ix:nonFraction name="uk-gaap:GrossProfit" contextRef="FY2024" unitRef="GBP" decimals="0">
          600,000
        </ix:nonFraction>
      </td>
    </tr>
    <tr>
      <td>Operating Profit</td>
      <td>
        <ix:nonFraction name="uk-gaap:OperatingProfit" contextRef="FY2024" unitRef="GBP" decimals="0">
          250,000
        </ix:nonFraction>
      </td>
    </tr>
    <tr>
      <td>Profit Before Tax</td>
      <td>
        <ix:nonFraction name="uk-gaap:ProfitLossOnOrdinaryActivitiesBeforeTax" contextRef="FY2024" unitRef="GBP" decimals="0">
          250,000
        </ix:nonFraction>
      </td>
    </tr>
  </table>

  <h2>Balance Sheet</h2>
  <table>
    <tr>
      <td>Fixed Assets</td>
      <td>
        <ix:nonFraction name="uk-gaap:FixedAssets" contextRef="FY2024End" unitRef="GBP" decimals="0">
          350,000
        </ix:nonFraction>
      </td>
    </tr>
    <tr>
      <td>Current Assets</td>
      <td>
        <ix:nonFraction name="uk-gaap:CurrentAssets" contextRef="FY2024End" unitRef="GBP" decimals="0">
          450,000
        </ix:nonFraction>
      </td>
    </tr>
    <tr>
      <td>Creditors: amounts falling due within one year</td>
      <td>
        <ix:nonFraction name="uk-gaap:CreditorsDueWithinOneYear" contextRef="FY2024End" unitRef="GBP" decimals="0" sign="-">
          (200,000)
        </ix:nonFraction>
      </td>
    </tr>
    <tr>
      <td>Net Assets</td>
      <td>
        <ix:nonFraction name="uk-gaap:NetAssets" contextRef="FY2024End" unitRef="GBP" decimals="0">
          600,000
        </ix:nonFraction>
      </td>
    </tr>
  </table>

  <h2>Director's Declaration</h2>
  <p>
    For the year ending <ix:nonNumeric name="uk-bus:EndDateForPeriodCoveredByReport" contextRef="FY2024">31 March 2024</ix:nonNumeric>,
    the company was entitled to exemption from audit under section 477 of the Companies Act 2006.
  </p>
  <p>
    Signed: <ix:nonNumeric name="uk-bus:NameApprovingDirector" contextRef="FY2024">John Smith</ix:nonNumeric>
  </p>
  <p>
    Director
  </p>
  <p>
    Date: <ix:nonNumeric name="uk-bus:DateApprovalAccounts" contextRef="FY2024">15 December 2024</ix:nonNumeric>
  </p>
</body>
</html>
```

---

## XBRL Taxonomies

### UK Taxonomies Used

| Taxonomy | Purpose | Version |
|----------|---------|---------|
| **UK-GAAP** | UK accounting standards | 2009-09-01 |
| **FRS 101** | Reduced disclosures | 2022-01-01 |
| **FRS 102** | Full FRS 102 | 2022-01-01 |
| **UK-IFRS** | International standards | 2022-01-01 |
| **UK-DPL** | Detailed P&L | 2009-09-01 |
| **UK-CT** | Corporation Tax computations | 2021-01-01 |

### Tagging Requirements

| Element | Must Be Tagged? | Example Tag |
|---------|-----------------|-------------|
| Company name | Yes | `uk-bus:EntityCurrentLegalOrRegisteredName` |
| Registration number | Yes | `uk-bus:UKCompaniesHouseRegisteredNumber` |
| Period end | Yes | `uk-bus:EndDateForPeriodCoveredByReport` |
| Turnover | Yes | `uk-gaap:Turnover` |
| Profit before tax | Yes | `uk-gaap:ProfitLossOnOrdinaryActivitiesBeforeTax` |
| Total assets | Yes | `uk-gaap:TotalAssets` |
| Net assets | Yes | `uk-gaap:NetAssets` |

---

## CT600 Boxes Reference

### Key Boxes

| Box | Description | Field |
|-----|-------------|-------|
| 1 | Company name | `CompanyInformation/CompanyName` |
| 2 | Company registration number | `CompanyInformation/RegistrationNumber` |
| 3 | Company UTR | Header UTR key |
| 30 | Turnover | `Turnover` |
| 35 | Trading profits | `TradingResults/TradingProfits` |
| 145 | Total profits before deductions | `TotalProfitsBeforeDeductions` |
| 155 | Net chargeable gains | `ChargeableGains/NetGains` |
| 235 | Profits chargeable to CT | `TaxCalculation/TaxableProfit` |
| 440 | Tax chargeable | `TaxCalculation/CorporationTaxChargeable` |
| 470 | Corporation Tax payable | `TaxCalculation/CorporationTaxPayable` |

---

## Submission Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CT600 SUBMISSION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. PREPARE DATA                                                         │
│     - Extract financial data from accounts                               │
│     - Calculate tax position                                             │
│     - Identify supplementary pages needed                                │
│         │                                                                │
│         ▼                                                                │
│  2. GENERATE iXBRL                                                       │
│     - Build XHTML structure                                              │
│     - Add XBRL tags to numeric values                                    │
│     - Add contexts (periods, entities)                                   │
│     - Validate against taxonomy                                          │
│         │                                                                │
│         ▼                                                                │
│  3. VALIDATE iXBRL                                                       │
│     - Schema validation                                                  │
│     - Taxonomy validation                                                │
│     - Calculation linkbase checks                                        │
│     - Minimum tagging requirements                                       │
│         │                                                                │
│         ▼                                                                │
│  4. BUILD CT600 XML                                                      │
│     - Populate CT600 boxes                                               │
│     - Base64 encode iXBRL attachments                                    │
│     - Calculate IRmark                                                   │
│         │                                                                │
│         ▼                                                                │
│  5. WRAP IN GOVTALK                                                      │
│     - Add authentication                                                 │
│     - Add routing keys (UTR)                                             │
│         │                                                                │
│         ▼                                                                │
│  6. SUBMIT                                                               │
│     POST to Transaction Engine                                           │
│         │                                                                │
│         ▼                                                                │
│  7. POLL FOR RESPONSE                                                    │
│     - Wait for acknowledgement                                           │
│     - Poll for final response                                            │
│         │                                                                │
│         ▼                                                                │
│  8. HANDLE RESULT                                                        │
│     - Success: Store confirmation                                        │
│     - Error: Parse and display issues                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Corporation Tax Return Entity

```typescript
interface CTReturn {
  id: string;
  clientId: string;
  companyId: string;

  // Company details
  companyName: string;
  companyNumber: string;
  utr: string;

  // Accounting period
  periodStart: Date;
  periodEnd: Date;

  // Core figures
  turnover: number;
  tradingProfits: number;
  tradingLosses: number;
  chargeableGains: number;
  allowableLosses: number;
  investmentIncome: number;
  loanRelationshipsCredit: number;
  loanRelationshipsDebit: number;

  // Deductions and reliefs
  qualifyingDonations: number;
  groupRelief: number;
  lossesUsed: number;
  capitalAllowances: number;

  // Tax calculation
  taxableProfit: number;
  corporationTaxRate: number;
  corporationTaxChargeable: number;
  marginalRelief: number;
  corporationTaxPayable: number;

  // R&D claims
  rdEnhancedExpenditure?: number;
  rdTaxCredit?: number;

  // Status
  status: 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';

  // Attachments
  accountsIXBRL?: string;  // Stored iXBRL
  computationsIXBRL?: string;

  // HMRC response
  hmrcCorrelationId?: string;
  hmrcResponseDate?: Date;
  hmrcResponseMessage?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  submittedBy?: string;
}
```

### Company Entity

```typescript
interface Company {
  id: string;
  clientId: string;

  // Companies House details
  name: string;
  registrationNumber: string;
  incorporationDate: Date;
  companyType: 'private-limited' | 'public' | 'llp' | 'charity' | 'cic';

  // HMRC details
  utr: string;
  taxOffice: string;

  // Accounting reference
  accountingReferenceDate: string;  // e.g., "31 March"
  firstPeriodEnd: Date;

  // Address
  registeredAddress: Address;

  // Directors/Officers
  directors: Director[];

  createdAt: Date;
  updatedAt: Date;
}
```

---

## iXBRL Generation Options

### Option 1: Generate from Templates

```typescript
interface IXBRLGenerator {
  generateAccounts(data: AccountsData): string;
  generateComputations(data: ComputationsData): string;
  validateIXBRL(ixbrl: string): ValidationResult;
}

interface AccountsData {
  company: Company;
  period: AccountingPeriod;
  profitAndLoss: ProfitAndLossAccount;
  balanceSheet: BalanceSheet;
  notes: AccountNotes[];
  directors: Director[];
}
```

### Option 2: Use Third-Party iXBRL Service

| Service | Description |
|---------|-------------|
| **Arelle** | Open source XBRL processor |
| **CoreFiling** | Commercial iXBRL generation |
| **Workiva** | Cloud-based XBRL platform |
| **Certent** | Disclosure management |

### Option 3: Import from Accounts Software

Many accounting packages can export iXBRL:
- Sage
- QuickBooks
- Xero (via add-ons)
- FreeAgent

---

## Validation Requirements

### Pre-Submission Checks

```typescript
interface CT600Validator {
  // Data validation
  validateCompanyDetails(company: Company): ValidationResult;
  validatePeriod(periodStart: Date, periodEnd: Date): ValidationResult;
  validateTaxCalculation(ctReturn: CTReturn): ValidationResult;

  // iXBRL validation
  validateIXBRLSchema(ixbrl: string): ValidationResult;
  validateIXBRLTaxonomy(ixbrl: string): ValidationResult;
  validateMinimumTags(ixbrl: string): ValidationResult;
  validateCalculations(ixbrl: string): ValidationResult;

  // Cross-validation
  validateConsistency(ctReturn: CTReturn, accounts: string, computations: string): ValidationResult;
}
```

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Missing mandatory tag | Required element not tagged | Add tag |
| Invalid taxonomy reference | Wrong namespace | Update schema reference |
| Calculation inconsistency | Sum doesn't match total | Fix arithmetic |
| Period mismatch | Dates don't align | Align period contexts |
| Invalid sign | Negative where positive expected | Fix sign |

---

## UI Components

### CT600 Summary Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  CORPORATION TAX RETURN                                          │
│  ABC Trading Limited (12345678)                                  │
│  Period: 1 April 2023 - 31 March 2024                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRADING RESULTS                                                 │
│  ─────────────────────────────────────────────────────────────── │
│  Turnover (Box 30)                        £1,500,000.00          │
│  Trading Profits (Box 35)                   £250,000.00          │
│                                                                  │
│  OTHER INCOME                                                    │
│  ─────────────────────────────────────────────────────────────── │
│  Chargeable Gains (Box 155)                  £40,000.00          │
│  Investment Income                            £5,000.00          │
│  Loan Relationships (net)                     £1,500.00          │
│                                                                  │
│  TOTAL PROFITS                                                   │
│  ─────────────────────────────────────────────────────────────── │
│  Profits before deductions (Box 145)        £296,500.00          │
│  Less: Qualifying donations                  (£1,500.00)         │
│  Taxable Profit (Box 235)                   £295,000.00          │
│                                                                  │
│  TAX CALCULATION                                                 │
│  ─────────────────────────────────────────────────────────────── │
│  CT at 25% (Box 440)                         £73,750.00          │
│  Less: Marginal Relief                            £0.00          │
│  ═══════════════════════════════════════════════════════════════ │
│  Corporation Tax Payable (Box 470)           £73,750.00          │
│  ═══════════════════════════════════════════════════════════════ │
│                                                                  │
│  Due Date: 1 January 2025                                        │
│                                                                  │
│  ATTACHMENTS                                                     │
│  ─────────────────────────────────────────────────────────────── │
│  ✓ Accounts (iXBRL)              [View] [Replace]               │
│  ✓ Tax Computation (iXBRL)       [View] [Replace]               │
│                                                                  │
│  [Validate]  [Preview XML]       [Submit to HMRC]               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Corporation Tax Rates (2024-25)

| Profits | Rate | Notes |
|---------|------|-------|
| Up to £50,000 | 19% | Small profits rate |
| £50,001 - £250,000 | 19-25% | Marginal relief applies |
| Over £250,000 | 25% | Main rate |

### Marginal Relief Formula

```
Marginal Relief = (Upper Limit - Profits) × Standard Fraction × (Profits / Profits)
Standard Fraction = 3/200 = 1.5%
```

---

## Error Handling

### Common HMRC Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 1001 | Authentication failure | Check credentials |
| 1002 | Invalid UTR | Verify UTR format |
| 2001 | Invalid period | Check dates |
| 3001 | Invalid iXBRL | Run taxonomy validation |
| 3002 | Missing mandatory tags | Add required tags |
| 3003 | Calculation error | Fix arithmetic |
| 4001 | IRmark mismatch | Recalculate IRmark |
| 5001 | Duplicate submission | Check if already filed |

---

## Implementation Complexity

### Why CT600 is Complex

| Challenge | Reason |
|-----------|--------|
| **iXBRL generation** | Requires deep understanding of XBRL taxonomies |
| **Multiple taxonomies** | UK-GAAP, FRS 102, IFRS variations |
| **Validation rules** | Hundreds of business rules |
| **Supplementary pages** | Different schemas per page type |
| **Year-specific schemas** | Updates each tax year |

### Recommended Approach

1. **Phase 1**: Import iXBRL from other software
2. **Phase 2**: Basic iXBRL generation for simple cases
3. **Phase 3**: Full iXBRL generation (if justified)

---

## Implementation Checklist

### Setup
- [ ] Government Gateway credentials
- [ ] Software vendor registration
- [ ] Download current taxonomies
- [ ] Set up iXBRL validator

### CT600 Core
- [ ] CT600 XML builder
- [ ] IRmark calculation
- [ ] GovTalk envelope
- [ ] Submission to Transaction Engine
- [ ] Polling and response handling

### iXBRL
- [ ] iXBRL template system OR
- [ ] iXBRL import from files OR
- [ ] Third-party iXBRL service integration
- [ ] iXBRL validation

### Data Layer
- [ ] CTReturn entity
- [ ] Company entity
- [ ] Submission tracking
- [ ] Credential storage (encrypted)

### UI
- [ ] CT600 data entry screens
- [ ] iXBRL upload/generation
- [ ] Pre-submission validation
- [ ] Submission status tracker

### Testing
- [ ] Sandbox submissions
- [ ] Various company types
- [ ] Error scenario handling

---

## Alternative: Joint Filing with Companies House

Since 2015, companies can submit both:
- CT600 to HMRC
- Annual accounts to Companies House

...in a single submission. This requires additional integration with Companies House joint filing service.

---

## Resources

| Resource | URL |
|----------|-----|
| HMRC CT XML schemas | gov.uk/government/collections/corporation-tax-online |
| UK XBRL taxonomies | xbrl.org.uk |
| iXBRL tagging guide | gov.uk/guidance/corporation-tax-submit-company-tax-return |
| Arelle (XBRL processor) | arelle.org |

---

## Deadline Reference

| Period End | Filing Deadline | Payment Deadline |
|------------|-----------------|------------------|
| 31 Mar 2024 | 31 Mar 2025 | 1 Jan 2025 |
| 30 Jun 2024 | 30 Jun 2025 | 1 Apr 2025 |
| 30 Sep 2024 | 30 Sep 2025 | 1 Jul 2025 |
| 31 Dec 2024 | 31 Dec 2025 | 1 Oct 2025 |

**Filing deadline**: 12 months after period end
**Payment deadline**: 9 months and 1 day after period end

---

*Integration spec created: 2026-02-01*
