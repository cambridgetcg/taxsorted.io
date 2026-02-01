# Phase 3: PAYE/RTI XML API Integration Specification

> **Priority**: 7
> **Complexity**: High
> **Status**: Live (Mandatory for all employers)

---

## Overview

| Aspect | Detail |
|--------|--------|
| **API Name** | PAYE Real Time Information (RTI) |
| **Type** | XML (SOAP-like) |
| **Protocol** | HTTPS |
| **Gateway URL (Sandbox)** | `https://test-transaction-engine.tax.service.gov.uk/submission` |
| **Gateway URL (Production)** | `https://transaction-engine.tax.service.gov.uk/submission` |
| **Authentication** | Government Gateway (User ID + Password + PAYE credentials) |
| **Message Format** | XML with GovTalk envelope |

---

## Purpose

PAYE/RTI enables employers to submit:
- Employee pay and deductions in real-time
- Starter and leaver information
- Year-end summaries
- Recovery claims for statutory payments

---

## ⚠️ Important: XML vs REST

Unlike MTD APIs, PAYE/RTI uses **legacy XML-based submission**:
- No OAuth 2.0 (uses Government Gateway credentials)
- XML message format with GovTalk wrapper
- Polling-based responses
- Different error handling model

---

## Submission Types

| Code | Name | Purpose | Frequency |
|------|------|---------|-----------|
| **FPS** | Full Payment Submission | Report pay/deductions | On or before payday |
| **EPS** | Employer Payment Summary | Report NICs, statutory pay recovery | Monthly (by 19th) |
| **EYU** | Earlier Year Update | Corrections to previous years | As needed |
| **NVR** | NINO Verification Request | Verify employee NINO | As needed |
| **P45** | Leaver | Employee leaving | On departure |
| **P46** | Starter | New employee (no P45) | On start |

---

## GovTalk Message Structure

### Request Envelope

```xml
<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-FPS</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
      <TransactionID>12345678901234</TransactionID>
      <AuditID/>
      <CorrelationID/>
      <Transformation>XML</Transformation>
      <GatewayTest>1</GatewayTest> <!-- 1 for test, 0 for live -->
      <GatewayTimestamp/>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>YOUR_SENDER_ID</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Role>principal</Role>
          <Value>YOUR_PASSWORD</Value>
        </Authentication>
      </IDAuthentication>
      <EmailAddress>employer@example.com</EmailAddress>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys>
      <Key Type="TaxOfficeNumber">123</Key>
      <Key Type="TaxOfficeReference">AB12345</Key>
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
    <!-- Submission content here -->
  </Body>
</GovTalkMessage>
```

---

## Full Payment Submission (FPS)

### Purpose

Report employee pay and deductions **on or before payday**.

### XML Structure

```xml
<IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/FullPaymentSubmission/24-25/1">
  <IRheader>
    <Keys>
      <Key Type="TaxOfficeNumber">123</Key>
      <Key Type="TaxOfficeReference">AB12345</Key>
    </Keys>
    <PeriodEnd>2024-07-05</PeriodEnd>
    <DefaultCurrency>GBP</DefaultCurrency>
    <IRmark Type="generic"><!-- calculated hash --></IRmark>
    <Sender>Employer</Sender>
  </IRheader>
  <FullPaymentSubmission>
    <EmpRefs>
      <OfficeNo>123</OfficeNo>
      <PayeRef>AB12345</PayeRef>
      <AORef>123PA00012345</AORef>
    </EmpRefs>
    <RelatedTaxYear>24-25</RelatedTaxYear>
    <FinalSubmission>
      <DateSchemeEnded>2024-07-05</DateSchemeEnded>
    </FinalSubmission>
    <Employee>
      <EmployeeDetails>
        <Name>
          <Ttl>Mr</Ttl>
          <Fore>John</Fore>
          <Sur>Smith</Sur>
        </Name>
        <NINO>AB123456C</NINO>
        <Address>
          <Line>123 High Street</Line>
          <Line>London</Line>
          <Postcode>SW1A 1AA</Postcode>
        </Address>
        <BirthDate>1980-05-15</BirthDate>
        <Gender>M</Gender>
        <PassportNumber/>
      </EmployeeDetails>
      <Employment>
        <PayId>EMP001</PayId>
        <FiguresToDate>
          <TaxablePay>25000.00</TaxablePay>
          <TotalTax>2500.00</TotalTax>
          <StudentLoanRecovered>0.00</StudentLoanRecovered>
          <PostgraduateLoanRecovered>0.00</PostgraduateLoanRecovered>
        </FiguresToDate>
        <Payment>
          <PayFreq>M1</PayFreq>
          <PMDYr>24-25</PMDYr>
          <PMDPd>3</PMDPd>
          <PaidOnDate>2024-07-05</PaidOnDate>
          <WeeklyPdNum>13</WeeklyPdNum>
          <MonthlyPdNum>3</MonthlyPdNum>
          <HoursWorked>A</HoursWorked>
          <TaxCode>1257L</TaxCode>
          <TaxablePay>2500.00</TaxablePay>
          <TaxDeducted>250.00</TaxDeducted>
          <NIlettersAndValues>
            <NIletter>A</NIletter>
            <GrossEarningsForNICs>2500.00</GrossEarningsForNICs>
            <AtLEL>0.00</AtLEL>
            <LELtoPT>0.00</LELtoPT>
            <PTtoUEL>2500.00</PTtoUEL>
            <AboveUEL>0.00</AboveUEL>
            <EmpNIContribution>246.84</EmpNIContribution>
            <EesNIContribution>149.84</EesNIContribution>
          </NIlettersAndValues>
          <BenefitsTaxedViaPayroll>0.00</BenefitsTaxedViaPayroll>
        </Payment>
        <NetPay>1900.32</NetPay>
        <PayAfterStatDeducns>2100.16</PayAfterStatDeducns>
      </Employment>
    </Employee>
  </FullPaymentSubmission>
</IRenvelope>
```

### Key Fields Explained

| Field | Description |
|-------|-------------|
| `OfficeNo` | HMRC Tax Office Number (3 digits) |
| `PayeRef` | PAYE Reference (e.g., AB12345) |
| `NINO` | Employee's National Insurance Number |
| `PayFreq` | W1=Weekly, M1=Monthly, etc. |
| `TaxCode` | Employee's tax code |
| `TaxablePay` | Gross taxable pay this period |
| `TaxDeducted` | PAYE tax deducted this period |
| `NIletter` | NI category letter (A, B, C, H, M, etc.) |
| `EmpNIContribution` | Employer NI for this period |
| `EesNIContribution` | Employee NI for this period |

---

## Employer Payment Summary (EPS)

### Purpose

Report:
- NICs payment reclaims
- Statutory payment recovery
- CIS deductions
- Apprenticeship Levy

### XML Structure

```xml
<IRenvelope xmlns="http://www.govtalk.gov.uk/taxation/PAYE/RTI/EPS/24-25/1">
  <IRheader>
    <Keys>
      <Key Type="TaxOfficeNumber">123</Key>
      <Key Type="TaxOfficeReference">AB12345</Key>
    </Keys>
    <PeriodEnd>2024-07-05</PeriodEnd>
    <DefaultCurrency>GBP</DefaultCurrency>
    <IRmark Type="generic"><!-- calculated hash --></IRmark>
    <Sender>Employer</Sender>
  </IRheader>
  <EmployerPaymentSummary>
    <EmpRefs>
      <OfficeNo>123</OfficeNo>
      <PayeRef>AB12345</PayeRef>
      <AORef>123PA00012345</AORef>
    </EmpRefs>
    <RelatedTaxYear>24-25</RelatedTaxYear>
    <NoPaymentDates>
      <PeriodEnd>2024-07-05</PeriodEnd>
    </NoPaymentDates>
    <RecoverableAmountsYTD>
      <TaxMonth>3</TaxMonth>
      <SMPRecovered>500.00</SMPRecovered>
      <SPPRecovered>0.00</SPPRecovered>
      <SAPRecovered>0.00</SAPRecovered>
      <ShPPRecovered>0.00</ShPPRecovered>
      <SPBPRecovered>0.00</SPBPRecovered>
      <NICCompensationOnSMP>0.00</NICCompensationOnSMP>
      <NICCompensationOnSPP>0.00</NICCompensationOnSPP>
      <NICCompensationOnSAP>0.00</NICCompensationOnSAP>
      <NICCompensationOnShPP>0.00</NICCompensationOnShPP>
      <NICCompensationOnSPBP>0.00</NICCompensationOnSPBP>
      <CISDeductionsSuffered>1000.00</CISDeductionsSuffered>
    </RecoverableAmountsYTD>
    <ApprenticeshipLevy>
      <TaxMonth>3</TaxMonth>
      <AnnualAllce>15000.00</AnnualAllce>
      <LevyDueYTD>2500.00</LevyDueYTD>
    </ApprenticeshipLevy>
  </EmployerPaymentSummary>
</IRenvelope>
```

### EPS Deadlines

| Period | EPS Deadline | Payment Deadline |
|--------|--------------|------------------|
| Month 1 (Apr) | 19 May | 22 May (electronic) |
| Month 2 (May) | 19 Jun | 22 Jun (electronic) |
| ... | ... | ... |
| Month 12 (Mar) | 19 Apr | 22 Apr (electronic) |

---

## Submission Flow

### Request-Response Cycle

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RTI SUBMISSION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. BUILD XML MESSAGE                                                    │
│     - Create IRenvelope with employee data                               │
│     - Generate IRmark (hash)                                             │
│     - Wrap in GovTalk envelope                                           │
│         │                                                                │
│         ▼                                                                │
│  2. SUBMIT                                                               │
│     POST to Transaction Engine                                           │
│     Content-Type: application/xml                                        │
│         │                                                                │
│         ▼                                                                │
│  3. ACKNOWLEDGEMENT RESPONSE                                             │
│     <GovTalkMessage>                                                     │
│       <Header>                                                           │
│         <MessageDetails>                                                 │
│           <Qualifier>acknowledgement</Qualifier>                         │
│           <CorrelationID>ABC123</CorrelationID>                          │
│         </MessageDetails>                                                │
│       </Header>                                                          │
│     </GovTalkMessage>                                                    │
│         │                                                                │
│         ▼                                                                │
│  4. POLL FOR RESULT                                                      │
│     POST to Transaction Engine                                           │
│     <GovTalkMessage>                                                     │
│       <Header>                                                           │
│         <MessageDetails>                                                 │
│           <Class>HMRC-PAYE-RTI-FPS</Class>                               │
│           <Qualifier>poll</Qualifier>                                    │
│           <CorrelationID>ABC123</CorrelationID>                          │
│         </MessageDetails>                                                │
│       </Header>                                                          │
│     </GovTalkMessage>                                                    │
│         │                                                                │
│         ▼                                                                │
│  5. RESPONSE (Success or Error)                                          │
│     <GovTalkMessage>                                                     │
│       <Header>                                                           │
│         <MessageDetails>                                                 │
│           <Qualifier>response</Qualifier>                                │
│         </MessageDetails>                                                │
│       </Header>                                                          │
│       <Body>                                                             │
│         <SuccessResponse>                                                │
│           <IRmarkReceipt>                                                │
│             <Message>HMRC has received...</Message>                      │
│           </IRmarkReceipt>                                               │
│         </SuccessResponse>                                               │
│       </Body>                                                            │
│     </GovTalkMessage>                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## IRmark Calculation

The IRmark is a digital signature/hash of the submission content.

### Algorithm

```typescript
function calculateIRmark(xmlContent: string): string {
  // 1. Canonicalize XML (C14N)
  const canonicalized = canonicalizeXML(xmlContent);

  // 2. Calculate SHA-512 hash
  const hash = crypto.createHash('sha512').update(canonicalized).digest();

  // 3. Base64 encode
  return hash.toString('base64');
}
```

### Placement in XML

```xml
<IRheader>
  <Keys>...</Keys>
  <PeriodEnd>2024-07-05</PeriodEnd>
  <DefaultCurrency>GBP</DefaultCurrency>
  <IRmark Type="generic">kW3xY7zP9...</IRmark>
  <Sender>Employer</Sender>
</IRheader>
```

---

## Authentication

### Government Gateway Credentials

Unlike OAuth-based MTD APIs, RTI uses direct credential authentication:

```xml
<SenderDetails>
  <IDAuthentication>
    <SenderID>123456789012</SenderID>  <!-- Government Gateway ID -->
    <Authentication>
      <Method>clear</Method>
      <Role>principal</Role>
      <Value>PASSWORD123</Value>  <!-- Government Gateway password -->
    </Authentication>
  </IDAuthentication>
</SenderDetails>
```

### Credential Storage

```typescript
interface PAYECredentials {
  clientId: string;
  gatewayUserId: string;  // Encrypted
  gatewayPassword: string;  // Encrypted
  taxOfficeNumber: string;
  taxOfficeReference: string;
  accountsOfficeReference: string;
}
```

**Security Note**: Store credentials encrypted. Never log plaintext passwords.

---

## Data Model

### Payroll Run Entity

```typescript
interface PayrollRun {
  id: string;
  clientId: string;
  employerId: string;

  // Period
  taxYear: string;  // "24-25"
  taxMonth: number;  // 1-12
  payPeriod: number;  // Week/month number
  periodEnd: Date;
  paymentDate: Date;

  // Totals
  totalGrossPay: number;
  totalTaxDeducted: number;
  totalEmployerNI: number;
  totalEmployeeNI: number;
  totalNetPay: number;

  // Employees
  employees: PayrollEmployee[];

  // Submission
  fpsSubmitted: boolean;
  fpsSubmissionId?: string;
  fpsSubmittedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

interface PayrollEmployee {
  id: string;
  payrollRunId: string;

  // Employee
  employeeId: string;
  nino: string;
  payId: string;

  // Tax code
  taxCode: string;
  niCategory: string;

  // Earnings
  grossPay: number;
  taxablePay: number;
  taxDeducted: number;

  // NI
  niablePay: number;
  employerNI: number;
  employeeNI: number;

  // Net
  netPay: number;

  // Year to date
  taxablePayYTD: number;
  taxYTD: number;
}
```

### FPS Submission Entity

```typescript
interface FPSSubmission {
  id: string;
  payrollRunId: string;

  // HMRC references
  correlationId: string;
  transactionId: string;

  // Status
  status: 'pending' | 'acknowledged' | 'accepted' | 'rejected';

  // Response
  responseXml?: string;
  errorCodes?: string[];
  errorMessages?: string[];

  // Timestamps
  submittedAt: Date;
  acknowledgedAt?: Date;
  processedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Error Handling

### Error Response Structure

```xml
<GovTalkMessage>
  <Header>
    <MessageDetails>
      <Qualifier>error</Qualifier>
    </MessageDetails>
  </Header>
  <GovTalkErrors>
    <Error>
      <RaisedBy>Department</RaisedBy>
      <Number>3001</Number>
      <Type>business</Type>
      <Text>The NINO AB123456C is not valid</Text>
      <Location>/FullPaymentSubmission/Employee[1]/NINO</Location>
    </Error>
  </GovTalkErrors>
</GovTalkMessage>
```

### Common Error Codes

| Code | Type | Description |
|------|------|-------------|
| 1001 | Fatal | Authentication failure |
| 1002 | Fatal | Invalid sender ID |
| 2001 | Recoverable | Service temporarily unavailable |
| 3001 | Business | Invalid NINO |
| 3002 | Business | Tax code not valid |
| 3003 | Business | Duplicate submission |
| 3004 | Business | Period already submitted |
| 3100 | Business | Employee not on scheme |
| 4001 | Business | IRmark mismatch |

### Error Recovery

```typescript
async function handleRTIError(error: RTIError): Promise<void> {
  switch (error.type) {
    case 'fatal':
      // Log and alert - requires manual intervention
      await notifyAdmin(error);
      break;

    case 'recoverable':
      // Retry after delay
      await scheduleRetry(error.submissionId, 300000); // 5 minutes
      break;

    case 'business':
      // Fix data and resubmit
      await notifyUser(error);
      break;
  }
}
```

---

## UI Components

### Payroll Submission Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  PAYROLL SUBMISSION                                              │
│  Tax Month 3 (Jun 2024) | Payment Date: 30 Jun 2024             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  EMPLOYER: ABC Limited                                           │
│  PAYE Ref: 123/AB12345                                          │
│                                                                  │
│  SUMMARY                                                         │
│  ─────────────────────────────────────────────────────────────── │
│  Employees:              15                                      │
│  Total Gross Pay:        £45,000.00                             │
│  Total Tax:              £7,500.00                              │
│  Total Employer NI:      £4,200.00                              │
│  Total Employee NI:      £3,600.00                              │
│  Total Net Pay:          £33,900.00                             │
│                                                                  │
│  EMPLOYEES                                                       │
│  ─────────────────────────────────────────────────────────────── │
│  Name              Gross      Tax      E'ee NI    Net            │
│  John Smith       £3,000    £500.00   £240.00   £2,260.00       │
│  Jane Doe         £3,500    £600.00   £280.00   £2,620.00       │
│  Bob Wilson       £2,800    £450.00   £220.00   £2,130.00       │
│  ... (12 more)                                                   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  FPS Status: ⏳ Not Submitted                                    │
│                                                                  │
│  [Preview FPS XML]           [Submit to HMRC]                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Submission Status

```
┌─────────────────────────────────────────────────────────────────┐
│  RTI SUBMISSION STATUS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Submission ID: FPS-2024-06-001                                  │
│  Correlation ID: 12345678901234                                  │
│                                                                  │
│  Timeline:                                                       │
│  ────────────────────────────────────────────────────────────── │
│  ✓ 14:30:00  Submitted to HMRC                                  │
│  ✓ 14:30:02  Acknowledgement received                           │
│  ⏳ 14:30:05  Polling for result...                              │
│  ✓ 14:30:15  Accepted by HMRC                                   │
│                                                                  │
│  HMRC Message:                                                   │
│  "HMRC has received the RTI for PAYE scheme 123/AB12345         │
│   for pay period ending 30 June 2024"                           │
│                                                                  │
│  [Download Confirmation]        [View Full Response]             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Considerations

### Why Use RTI API?

| Use Case | Benefit |
|----------|---------|
| Payroll software integration | Automate monthly FPS submissions |
| Bureau/agent services | Manage multiple employer schemes |
| Year-end processing | Automated P60/P45 generation |
| Real-time validation | Immediate feedback on errors |

### Alternative: Basic PAYE Tools

For simpler cases, employers can use HMRC's free **Basic PAYE Tools** instead of API integration. Consider API when:
- Managing 10+ employees
- Running payroll bureau
- Need automation
- Require custom reporting

---

## Implementation Checklist

### Setup
- [ ] Obtain test Government Gateway credentials
- [ ] Register software vendor ID
- [ ] Set up test employer scheme in sandbox

### XML Processing
- [ ] XML builder for FPS
- [ ] XML builder for EPS
- [ ] IRmark calculation
- [ ] GovTalk envelope wrapper

### Submission Flow
- [ ] Submit to Transaction Engine
- [ ] Handle acknowledgement
- [ ] Polling mechanism
- [ ] Response parsing

### Data Layer
- [ ] PayrollRun entity
- [ ] PayrollEmployee entity
- [ ] FPSSubmission tracking
- [ ] Credential storage (encrypted)

### UI
- [ ] Payroll summary screen
- [ ] Employee list
- [ ] XML preview
- [ ] Submission status tracker

### Testing
- [ ] Test FPS submission
- [ ] Test EPS submission
- [ ] Error scenario testing
- [ ] IRmark validation

---

## Test Scenarios (Sandbox)

### Test Credentials

Request test credentials from HMRC Developer Hub for:
- Test employer PAYE reference
- Test Accounts Office reference
- Test Government Gateway ID

### Validation Rules

Test submissions validate against schema but don't affect real HMRC systems.

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Credential storage | Encrypt at rest, use secure vault |
| Transmission | HTTPS only |
| Employee data | PII protection, access controls |
| Audit trail | Log all submissions (sans passwords) |

---

*Integration spec created: 2026-02-01*
