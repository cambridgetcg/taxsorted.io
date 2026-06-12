# Entity-Centric Submission Workflow

> **Purpose**: Unified workflow design for tax form submissions with entity as entry point
> **Design Date**: 2026-02-01
> **PP Mode**: CREATIVITY (Uncharted territory)

---

## Design Philosophy

**Core Principle**: The ENTITY is the source of truth for all filing requirements.

```
ENTITY → determines → FILINGS REQUIRED → routes to → SUBMISSION METHOD
```

Rather than asking "what forms exist?", we ask "what does THIS entity need to file?"

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUBMISSION WORKFLOW ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         1. ENTITY LAYER                              │    │
│  │                    (Source of Truth)                                 │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │Individual│ │Partner- │ │ Limited │ │ Charity │ │  Trust  │ ...   │    │
│  │  │(SE/Empl)│ │  ship   │ │ Company │ │(CIO/CLG)│ │         │       │    │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │    │
│  └───────┼──────────┼──────────┼──────────┼──────────┼─────────────────┘    │
│          │          │          │          │          │                       │
│          ▼          ▼          ▼          ▼          ▼                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                  2. OBLIGATION RESOLVER                              │    │
│  │         (Determines what this entity must file)                      │    │
│  │                                                                      │    │
│  │   EntityType + Attributes → Filing Requirements                      │    │
│  │   • VAT registered? → VAT100                                         │    │
│  │   • Employees? → PAYE/RTI                                           │    │
│  │   • Income >£50k? → MTD ITSA                                        │    │
│  │   • Company? → CT600 + Accounts                                      │    │
│  └───────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   3. FILING REGISTRY                                 │    │
│  │         (All filings required for this entity)                       │    │
│  │                                                                      │    │
│  │   Filing 1: CT600 (Annual)     - Due: 12m after period              │    │
│  │   Filing 2: VAT100 (Quarterly) - Due: Period + 37d                   │    │
│  │   Filing 3: PAYE FPS (Monthly) - Due: On payday                      │    │
│  │   Filing 4: CS01 (Annual)      - Due: Review + 14d                   │    │
│  └───────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   4. SUBMISSION ROUTER                               │    │
│  │         (Routes to appropriate submission channel)                   │    │
│  │                                                                      │    │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │    │
│  │   │   MTD REST API  │  │   XML Gateway   │  │   Portal Only   │     │    │
│  │   │   (OAuth 2.0)   │  │  (Gov Gateway)  │  │   (Export Data) │     │    │
│  │   │                 │  │                 │  │                 │     │    │
│  │   │ • VAT MTD       │  │ • CT600+iXBRL   │  │ • SA900 (Trust) │     │    │
│  │   │ • MTD ITSA      │  │ • PAYE/RTI      │  │ • IHT100        │     │    │
│  │   │ • Obligations   │  │ • SA (legacy)   │  │ • SDLT          │     │    │
│  │   │ • Calculations  │  │ • CIS           │  │ • P11D          │     │    │
│  │   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │    │
│  └────────────┼─────────────────────┼─────────────────────┼────────────┘    │
│               │                     │                     │                  │
│               ▼                     ▼                     ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   5. STATUS TRACKER                                  │    │
│  │         (Unified view of all submission states)                      │    │
│  │                                                                      │    │
│  │   [ Draft ] → [ Ready ] → [ Submitted ] → [ Accepted/Rejected ]     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Entity Model

### Entity Types Supported

```typescript
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
```

### Entity Definition

```typescript
interface Entity {
  id: string;
  type: EntityType;

  // Core identifiers
  identifiers: {
    nino?: string;            // Individuals
    utr?: string;             // All taxpayers
    vrn?: string;             // VAT registered
    crn?: string;             // Companies House
    charityNumber?: string;   // Charities
    frnNumber?: string;       // FCA registered
  };

  // Attributes that affect filing requirements
  attributes: {
    vatRegistered: boolean;
    vatScheme?: 'standard' | 'flat-rate' | 'annual-accounting' | 'cash-accounting';
    hasEmployees: boolean;
    employeeCount?: number;
    turnover?: number;
    isAgent: boolean;

    // For MTD
    mtdVatMandated: boolean;
    mtdItsaMandated: boolean;
    mtdItsaVoluntary: boolean;

    // Accounting
    accountingPeriodEnd?: Date;
    vatPeriodEnd?: 'march' | 'june' | 'september' | 'december' | 'monthly';
    firstAccountingPeriod?: boolean;

    // Special statuses
    dormant?: boolean;
    inLiquidation?: boolean;
    exempt?: boolean;
  };

  // Connected entities (for multi-entity scenarios)
  relatedEntities?: {
    entityId: string;
    relationship: 'subsidiary' | 'parent' | 'partner' | 'beneficiary' | 'settlor';
  }[];

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Layer 2: Obligation Resolver

### Filing Requirement Rules Engine

```typescript
interface FilingRequirement {
  filingType: FilingType;
  frequency: 'annual' | 'quarterly' | 'monthly' | 'per-payday' | 'event-based';
  mandatory: boolean;
  condition?: string;  // Human-readable condition
  submissionMethod: SubmissionMethod;
  regulatorTarget: Regulator;
}

type FilingType =
  // HMRC Tax
  | 'sa100' | 'sa800' | 'sa900' | 'ct600' | 'vat100'
  // HMRC PAYE
  | 'paye-fps' | 'paye-eps' | 'p11d' | 'p60'
  // HMRC MTD
  | 'mtd-itsa-quarterly' | 'mtd-itsa-eops' | 'mtd-itsa-final'
  // Companies House
  | 'ch-accounts' | 'ch-confirmation-statement'
  // Charity Commission
  | 'cc-annual-return' | 'cc-accounts'
  // FCA
  | 'fca-annual-return'
  // Other
  | 'cic-report' | 'trs-registration' | 'trs-update';

type SubmissionMethod = 'mtd-rest-api' | 'xml-gateway' | 'portal-only' | 'paper';
type Regulator = 'hmrc' | 'companies-house' | 'charity-commission' | 'fca' | 'cic-regulator';
```

### Resolver Logic

```typescript
function resolveFilingRequirements(entity: Entity): FilingRequirement[] {
  const requirements: FilingRequirement[] = [];

  // ═══════════════════════════════════════════════════════════════
  // HMRC TAX FILINGS
  // ═══════════════════════════════════════════════════════════════

  // SA100 - Self Assessment (Individuals)
  if (isIndividual(entity) && requiresSelfAssessment(entity)) {
    if (entity.attributes.mtdItsaMandated) {
      // MTD ITSA replaces SA100
      requirements.push({
        filingType: 'mtd-itsa-quarterly',
        frequency: 'quarterly',
        mandatory: true,
        submissionMethod: 'mtd-rest-api',
        regulatorTarget: 'hmrc'
      });
      requirements.push({
        filingType: 'mtd-itsa-eops',
        frequency: 'annual',
        mandatory: true,
        submissionMethod: 'mtd-rest-api',
        regulatorTarget: 'hmrc'
      });
      requirements.push({
        filingType: 'mtd-itsa-final',
        frequency: 'annual',
        mandatory: true,
        submissionMethod: 'mtd-rest-api',
        regulatorTarget: 'hmrc'
      });
    } else {
      // Traditional SA100
      requirements.push({
        filingType: 'sa100',
        frequency: 'annual',
        mandatory: true,
        submissionMethod: 'xml-gateway',  // or portal
        regulatorTarget: 'hmrc'
      });
    }
  }

  // SA800 - Partnership Return
  if (isPartnership(entity)) {
    requirements.push({
      filingType: 'sa800',
      frequency: 'annual',
      mandatory: true,
      submissionMethod: 'xml-gateway',
      regulatorTarget: 'hmrc'
    });
  }

  // SA900 - Trust Return
  if (isTrust(entity) && isTaxable(entity)) {
    requirements.push({
      filingType: 'sa900',
      frequency: 'annual',
      mandatory: true,
      submissionMethod: 'portal-only',  // No API
      regulatorTarget: 'hmrc'
    });
  }

  // CT600 - Corporation Tax
  if (requiresCT600(entity)) {
    requirements.push({
      filingType: 'ct600',
      frequency: 'annual',
      mandatory: true,
      submissionMethod: 'xml-gateway',
      regulatorTarget: 'hmrc'
    });
  }

  // VAT100 - VAT Return
  if (entity.attributes.vatRegistered) {
    requirements.push({
      filingType: 'vat100',
      frequency: entity.attributes.vatScheme === 'annual-accounting' ? 'annual' : 'quarterly',
      mandatory: true,
      submissionMethod: entity.attributes.mtdVatMandated ? 'mtd-rest-api' : 'portal-only',
      regulatorTarget: 'hmrc'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYE FILINGS
  // ═══════════════════════════════════════════════════════════════

  if (entity.attributes.hasEmployees) {
    requirements.push({
      filingType: 'paye-fps',
      frequency: 'per-payday',
      mandatory: true,
      submissionMethod: 'xml-gateway',
      regulatorTarget: 'hmrc'
    });
    requirements.push({
      filingType: 'paye-eps',
      frequency: 'monthly',
      mandatory: true,
      submissionMethod: 'xml-gateway',
      regulatorTarget: 'hmrc'
    });
    requirements.push({
      filingType: 'p11d',
      frequency: 'annual',
      mandatory: hasBenefitsInKind(entity),
      condition: 'If benefits in kind provided',
      submissionMethod: 'portal-only',
      regulatorTarget: 'hmrc'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPANIES HOUSE FILINGS
  // ═══════════════════════════════════════════════════════════════

  if (requiresCHFilings(entity)) {
    requirements.push({
      filingType: 'ch-accounts',
      frequency: 'annual',
      mandatory: true,
      submissionMethod: 'portal-only',  // API available but complex
      regulatorTarget: 'companies-house'
    });
    requirements.push({
      filingType: 'ch-confirmation-statement',
      frequency: 'annual',
      mandatory: true,
      submissionMethod: 'portal-only',
      regulatorTarget: 'companies-house'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CHARITY COMMISSION FILINGS
  // ═══════════════════════════════════════════════════════════════

  if (isCharity(entity)) {
    requirements.push({
      filingType: 'cc-annual-return',
      frequency: 'annual',
      mandatory: true,
      submissionMethod: 'portal-only',
      regulatorTarget: 'charity-commission'
    });
    if (entity.attributes.turnover > 25000) {
      requirements.push({
        filingType: 'cc-accounts',
        frequency: 'annual',
        mandatory: true,
        submissionMethod: 'portal-only',
        regulatorTarget: 'charity-commission'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRUST REGISTRATION
  // ═══════════════════════════════════════════════════════════════

  if (isTrust(entity)) {
    requirements.push({
      filingType: 'trs-update',
      frequency: 'annual',
      mandatory: isTaxable(entity),
      submissionMethod: 'portal-only',
      regulatorTarget: 'hmrc'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SPECIAL ENTITY FILINGS
  // ═══════════════════════════════════════════════════════════════

  if (entity.type === 'cic') {
    requirements.push({
      filingType: 'cic-report',
      frequency: 'annual',
      mandatory: true,
      submissionMethod: 'portal-only',
      regulatorTarget: 'cic-regulator'
    });
  }

  if (entity.type === 'cooperative-society' || entity.type === 'community-benefit-society') {
    requirements.push({
      filingType: 'fca-annual-return',
      frequency: 'annual',
      mandatory: true,
      submissionMethod: 'portal-only',
      regulatorTarget: 'fca'
    });
  }

  return requirements;
}
```

---

## Layer 3: Filing Registry

### Obligation Instance

```typescript
interface FilingObligation {
  id: string;
  entityId: string;

  // Filing classification
  filingType: FilingType;
  filingRequirement: FilingRequirement;

  // Period
  periodStart: Date;
  periodEnd: Date;
  taxYear?: string;  // e.g., "2024-25"

  // Deadlines
  dueDate: Date;
  finalDeadline: Date;  // After penalties apply

  // Status
  status: ObligationStatus;

  // Submission reference
  submissionId?: string;
  hmrcReference?: string;

  // Tracking
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  acknowledgedAt?: Date;
}

type ObligationStatus =
  | 'future'       // Not yet due
  | 'open'         // Due, not started
  | 'draft'        // In progress
  | 'ready'        // Ready to submit
  | 'submitted'    // Sent to regulator
  | 'processing'   // Awaiting response
  | 'accepted'     // Confirmed by regulator
  | 'rejected'     // Rejected by regulator
  | 'overdue'      // Past due, not submitted
  | 'fulfilled';   // Completed successfully
```

### Deadline Calculation Engine

```typescript
interface DeadlineCalculator {
  calculateDueDate(filingType: FilingType, periodEnd: Date, entity: Entity): Date;
}

function calculateDueDate(filingType: FilingType, periodEnd: Date, entity: Entity): Date {
  switch (filingType) {
    // Annual tax returns
    case 'sa100':
    case 'sa800':
    case 'sa900':
      // 31 January following tax year
      return new Date(periodEnd.getFullYear() + 1, 0, 31);

    case 'ct600':
      // 12 months after accounting period end
      return addMonths(periodEnd, 12);

    // VAT
    case 'vat100':
      // Period end + 1 month + 7 days
      return addDays(addMonths(periodEnd, 1), 7);

    // MTD ITSA quarterly
    case 'mtd-itsa-quarterly':
      // 5th of 2nd month after quarter end
      const quarterDeadlines: Record<number, { month: number; day: number }> = {
        7: { month: 7, day: 5 },   // Q1 (Apr-Jun) → 5 Aug
        10: { month: 10, day: 5 }, // Q2 (Jul-Sep) → 5 Nov
        1: { month: 1, day: 5 },   // Q3 (Oct-Dec) → 5 Feb (next year)
        4: { month: 4, day: 5 },   // Q4 (Jan-Mar) → 5 May
      };
      const qEnd = periodEnd.getMonth() + 1;
      const deadline = quarterDeadlines[qEnd];
      const year = qEnd === 1 ? periodEnd.getFullYear() + 1 : periodEnd.getFullYear();
      return new Date(year, deadline.month - 1, deadline.day);

    // PAYE
    case 'paye-fps':
      // On or before payday
      return periodEnd;  // periodEnd is payday in this context

    case 'paye-eps':
      // 19th of following month
      return new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 19);

    // Companies House
    case 'ch-accounts':
      // 9 months for private, 6 for public
      const monthsAllowed = entity.type === 'public-limited-company' ? 6 : 9;
      return addMonths(periodEnd, monthsAllowed);

    case 'ch-confirmation-statement':
      // 14 days after review date
      return addDays(periodEnd, 14);

    // Charity
    case 'cc-annual-return':
    case 'cc-accounts':
      // 10 months after financial year end
      return addMonths(periodEnd, 10);

    // FCA
    case 'fca-annual-return':
      // 7 months after financial year end
      return addMonths(periodEnd, 7);

    default:
      throw new Error(`Unknown filing type: ${filingType}`);
  }
}
```

---

## Layer 4: Submission Router

### Router Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUBMISSION ROUTER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   FilingObligation                                                          │
│        │                                                                     │
│        ▼                                                                     │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │                    ROUTE SELECTOR                                   │    │
│   │                                                                     │    │
│   │   switch (obligation.filingRequirement.submissionMethod) {          │    │
│   │     case 'mtd-rest-api':  → MTD Submission Handler                 │    │
│   │     case 'xml-gateway':   → XML Gateway Handler                    │    │
│   │     case 'portal-only':   → Portal Export Handler                  │    │
│   │   }                                                                 │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│        │                    │                    │                          │
│        ▼                    ▼                    ▼                          │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                   │
│   │ MTD Handler  │   │ XML Handler  │   │Portal Handler│                   │
│   ├──────────────┤   ├──────────────┤   ├──────────────┤                   │
│   │ • OAuth 2.0  │   │ • Gov Gateway│   │ • PDF Export │                   │
│   │ • Fraud Hdrs │   │ • IRmark     │   │ • CSV Export │                   │
│   │ • JSON       │   │ • XML Schema │   │ • Form Fill  │                   │
│   │ • REST calls │   │ • Poll resp  │   │ • Checklist  │                   │
│   └──────────────┘   └──────────────┘   └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Submission Handler Interface

```typescript
interface SubmissionHandler {
  canHandle(obligation: FilingObligation): boolean;
  validate(data: FilingData): ValidationResult;
  prepare(data: FilingData): PreparedSubmission;
  submit(prepared: PreparedSubmission): Promise<SubmissionResult>;
  checkStatus(submissionId: string): Promise<SubmissionStatus>;
}

interface SubmissionResult {
  success: boolean;
  submissionId?: string;
  hmrcReference?: string;
  timestamp: Date;
  errors?: SubmissionError[];
  nextAction?: 'poll' | 'complete' | 'retry' | 'manual';
}
```

### MTD REST API Handler

```typescript
class MTDSubmissionHandler implements SubmissionHandler {

  canHandle(obligation: FilingObligation): boolean {
    return obligation.filingRequirement.submissionMethod === 'mtd-rest-api';
  }

  async submit(prepared: PreparedSubmission): Promise<SubmissionResult> {
    // 1. Ensure valid OAuth token
    const token = await this.tokenManager.getValidToken(prepared.entityId);

    // 2. Collect fraud prevention headers
    const fraudHeaders = await this.fraudHeaderCollector.collect();

    // 3. Make API call
    const endpoint = this.getEndpoint(prepared.filingType);
    const response = await this.httpClient.post(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...fraudHeaders
      },
      body: JSON.stringify(prepared.payload)
    });

    // 4. Handle response
    if (response.status === 201) {
      return {
        success: true,
        submissionId: response.body.submissionId,
        hmrcReference: response.body.formBundleNumber,
        timestamp: new Date(),
        nextAction: 'complete'
      };
    }

    return this.handleError(response);
  }
}
```

### XML Gateway Handler

```typescript
class XMLGatewayHandler implements SubmissionHandler {

  canHandle(obligation: FilingObligation): boolean {
    return obligation.filingRequirement.submissionMethod === 'xml-gateway';
  }

  async submit(prepared: PreparedSubmission): Promise<SubmissionResult> {
    // 1. Build GovTalk envelope
    const govTalkMessage = this.buildGovTalkEnvelope(prepared);

    // 2. Calculate IRmark
    const irmark = this.calculateIRmark(prepared.payload);

    // 3. Insert IRmark into envelope
    const signedMessage = this.insertIRmark(govTalkMessage, irmark);

    // 4. Submit to Transaction Engine
    const acknowledgement = await this.submitToGateway(signedMessage);

    // 5. Return with polling instruction
    return {
      success: true,
      submissionId: acknowledgement.correlationId,
      timestamp: new Date(),
      nextAction: 'poll'
    };
  }

  async checkStatus(correlationId: string): Promise<SubmissionStatus> {
    // Poll the gateway for response
    const pollMessage = this.buildPollRequest(correlationId);
    const response = await this.submitToGateway(pollMessage);

    if (response.qualifier === 'response') {
      return {
        status: response.hasErrors ? 'rejected' : 'accepted',
        hmrcReference: response.formBundleNumber,
        errors: response.errors
      };
    }

    return { status: 'processing' };
  }
}
```

### Portal-Only Handler

```typescript
class PortalExportHandler implements SubmissionHandler {

  canHandle(obligation: FilingObligation): boolean {
    return obligation.filingRequirement.submissionMethod === 'portal-only';
  }

  async prepare(data: FilingData): Promise<PreparedSubmission> {
    return {
      ...data,
      exports: {
        pdf: await this.generatePDF(data),
        csv: await this.generateCSV(data),
        prefillData: await this.generatePrefillFormat(data)
      },
      portalUrl: this.getPortalUrl(data.filingType),
      checklist: this.generateChecklist(data.filingType)
    };
  }

  async submit(prepared: PreparedSubmission): Promise<SubmissionResult> {
    // For portal-only, we mark as "ready for manual submission"
    return {
      success: true,
      submissionId: generateInternalId(),
      timestamp: new Date(),
      nextAction: 'manual',
      manualInstructions: {
        portalUrl: prepared.portalUrl,
        exports: prepared.exports,
        checklist: prepared.checklist,
        deadline: prepared.obligation.dueDate
      }
    };
  }
}
```

---

## Layer 5: Submission State Machine

### State Transitions

```
                                    ┌─────────────────┐
                                    │     FUTURE      │
                                    │   (Not yet due) │
                                    └────────┬────────┘
                                             │ due date approaching
                                             ▼
┌─────────────┐                    ┌─────────────────┐
│   OVERDUE   │◄──── deadline ─────│      OPEN       │
│(Past due,   │      passed        │   (Due, ready   │
│not submitted│                    │   to start)     │
└─────────────┘                    └────────┬────────┘
                                            │ user starts
                                            ▼
                                   ┌─────────────────┐
                                   │     DRAFT       │
                                   │  (In progress)  │
                                   └────────┬────────┘
                                            │ user completes
                                            ▼
                                   ┌─────────────────┐
                                   │     READY       │
                              ┌────│ (Ready to file) │────┐
                              │    └────────┬────────┘    │
                              │             │ user        │
                              │             │ submits     │
               validation     │             ▼             │ portal-only
               fails          │    ┌─────────────────┐    │ (manual)
                              │    │   SUBMITTED     │    │
                              │    │ (Sent to HMRC)  │    │
                              │    └────────┬────────┘    │
                              │             │             │
                              │             ▼             │
                              │    ┌─────────────────┐    │
                              │    │   PROCESSING    │    │
                              │    │(Awaiting resp)  │    │
                              │    └────────┬────────┘    │
                              │             │             │
                              │    ┌────────┴────────┐    │
                              │    │                 │    │
                              ▼    ▼                 ▼    ▼
                       ┌───────────────┐     ┌───────────────┐
                       │   REJECTED    │     │   ACCEPTED    │
                       │ (Errors found)│     │ (Successful)  │
                       └───────────────┘     └───────┬───────┘
                              │                      │
                              │ fix & resubmit       │
                              │                      ▼
                              └──────────────►┌───────────────┐
                                              │  FULFILLED    │
                                              │ (Complete)    │
                                              └───────────────┘
```

### State Machine Implementation

```typescript
interface FilingStateMachine {
  currentState: ObligationStatus;
  transitions: Record<ObligationStatus, ObligationStatus[]>;

  canTransition(to: ObligationStatus): boolean;
  transition(to: ObligationStatus, context?: TransitionContext): void;
}

const FILING_TRANSITIONS: Record<ObligationStatus, ObligationStatus[]> = {
  'future':     ['open'],
  'open':       ['draft', 'overdue'],
  'draft':      ['ready', 'open'],  // can go back to open
  'ready':      ['submitted', 'draft'],  // can edit again
  'submitted':  ['processing'],
  'processing': ['accepted', 'rejected'],
  'accepted':   ['fulfilled'],
  'rejected':   ['draft'],  // fix and resubmit
  'overdue':    ['draft', 'submitted'],  // can still submit late
  'fulfilled':  []  // terminal state
};
```

---

## Complete Workflow: Entity to Submission

### Example: Private Limited Company

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           WORKFLOW: Private Limited Company (ABC Ltd)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. ENTITY CREATED                                                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│  {                                                                           │
│    type: 'private-limited-company',                                         │
│    identifiers: { utr: '1234567890', crn: '12345678', vrn: '123456789' },   │
│    attributes: {                                                             │
│      vatRegistered: true,                                                    │
│      mtdVatMandated: true,                                                  │
│      hasEmployees: true,                                                     │
│      employeeCount: 5,                                                       │
│      accountingPeriodEnd: '2024-03-31'                                      │
│    }                                                                         │
│  }                                                                           │
│                                                                              │
│  2. OBLIGATION RESOLVER OUTPUT                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────┬────────────┬───────────────┬──────────────────┐         │
│  │ Filing         │ Frequency  │ Method        │ Regulator        │         │
│  ├────────────────┼────────────┼───────────────┼──────────────────┤         │
│  │ CT600          │ Annual     │ xml-gateway   │ HMRC             │         │
│  │ VAT100         │ Quarterly  │ mtd-rest-api  │ HMRC             │         │
│  │ PAYE FPS       │ Per payday │ xml-gateway   │ HMRC             │         │
│  │ PAYE EPS       │ Monthly    │ xml-gateway   │ HMRC             │         │
│  │ CH Accounts    │ Annual     │ portal-only   │ Companies House  │         │
│  │ CS01           │ Annual     │ portal-only   │ Companies House  │         │
│  └────────────────┴────────────┴───────────────┴──────────────────┘         │
│                                                                              │
│  3. FILING REGISTRY (Current Period)                                        │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌────────────────┬──────────────────┬────────────┬──────────────┐          │
│  │ Filing         │ Period           │ Due Date   │ Status       │          │
│  ├────────────────┼──────────────────┼────────────┼──────────────┤          │
│  │ VAT Q1         │ Apr-Jun 2024     │ 7 Aug 2024 │ ✓ Fulfilled  │          │
│  │ VAT Q2         │ Jul-Sep 2024     │ 7 Nov 2024 │ 🟡 Ready     │          │
│  │ PAYE FPS Oct   │ October 2024     │ 31 Oct     │ ✓ Fulfilled  │          │
│  │ PAYE EPS Oct   │ October 2024     │ 19 Nov     │ 🟡 Open      │          │
│  │ CT600          │ YE 31 Mar 2024   │ 31 Mar 2025│ 🔵 Draft     │          │
│  │ CH Accounts    │ YE 31 Mar 2024   │ 31 Dec 2024│ 🟡 Open      │          │
│  │ CS01           │ Review Dec 2024  │ 14 Jan 2025│ ⚪ Future    │          │
│  └────────────────┴──────────────────┴────────────┴──────────────┘          │
│                                                                              │
│  4. USER SUBMITS VAT Q2                                                      │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [User clicks "Submit VAT Q2"]                                              │
│          │                                                                   │
│          ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SUBMISSION ROUTER                                                    │    │
│  │ Filing: VAT100                                                       │    │
│  │ Method: mtd-rest-api                                                │    │
│  │ → Route to: MTDSubmissionHandler                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│          │                                                                   │
│          ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ MTD SUBMISSION HANDLER                                               │    │
│  │                                                                      │    │
│  │ 1. ✓ Validate OAuth token (refresh if needed)                       │    │
│  │ 2. ✓ Collect fraud prevention headers                               │    │
│  │ 3. ✓ Build VAT return JSON payload                                  │    │
│  │ 4. ✓ POST to /organisations/vat/123456789/returns                   │    │
│  │ 5. ✓ Receive 201 Created                                            │    │
│  │                                                                      │    │
│  │ Response: { submissionId: "...", formBundleNumber: "XQ123..." }     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│          │                                                                   │
│          ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ STATUS TRACKER                                                       │    │
│  │                                                                      │    │
│  │ VAT Q2: Ready → Submitted → Accepted → Fulfilled ✓                  │    │
│  │                                                                      │    │
│  │ Stored: HMRC Reference XQ123456789012                               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Flow: Entity Dashboard

### Entity Filing Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ABC LIMITED (12345678)                                     [Settings] [?]  │
│  Private Limited Company | VAT: 123456789 | UTR: 1234567890                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ⚠️ ATTENTION REQUIRED (2)                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ 🔴 VAT Q2 2024          Due: 7 Nov 2024 (3 days)     [Submit Now]     │  │
│  │ 🟡 PAYE EPS October     Due: 19 Nov 2024             [Complete]       │  │
│                                                                              │
│  📅 UPCOMING DEADLINES                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ Dec 2024 │ CH Accounts (YE Mar 2024)              31 Dec    [Start]  │  │
│  │ Jan 2025 │ Confirmation Statement                 14 Jan    [Start]  │  │
│  │ Mar 2025 │ CT600 (YE Mar 2024)                    31 Mar    [In Prog]│  │
│  │ Apr 2025 │ VAT Q4 2024-25                         7 May     [Future] │  │
│                                                                              │
│  ✅ RECENT SUBMISSIONS                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ VAT Q1 2024-25         Accepted    7 Aug 2024    XQ123456789012      │  │
│  │ PAYE FPS October       Accepted    31 Oct 2024   RTI-2024-10-001    │  │
│  │ PAYE FPS September     Accepted    30 Sep 2024   RTI-2024-09-001    │  │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ 📊 Filing Compliance Score: 94%                                       │  │
│  │ All filings on time: 17 of 18 this year                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model Summary

```typescript
// Core entities
Entity              → defines the taxpayer/organization
FilingRequirement   → rules engine output (what entity must file)
FilingObligation    → specific instance of a filing (period, deadline)

// Submission tracking
Submission          → actual submission attempt
SubmissionResult    → response from regulator

// Supporting
OAuthToken          → stored tokens for MTD APIs
GatewayCredential   → Government Gateway for XML APIs
FraudPreventionData → collected headers for MTD
```

---

## Implementation Sequence

### Phase 1: Foundation
1. Entity model and storage
2. Obligation resolver (filing rules engine)
3. Filing registry (obligation tracking)
4. Deadline calculator

### Phase 2: MTD Integration
1. OAuth 2.0 flow
2. Fraud header collection
3. VAT MTD submission handler
4. MTD ITSA submission handler

### Phase 3: XML Integration
1. Government Gateway auth
2. GovTalk envelope builder
3. IRmark calculator
4. PAYE/RTI handler
5. CT600 handler (with iXBRL support)

### Phase 4: Portal Support
1. PDF/CSV export generation
2. Portal URL mapping
3. Checklist generation
4. Manual submission tracking

### Phase 5: Dashboard & UX
1. Entity filing dashboard
2. Submission wizard
3. Status tracking UI
4. Notifications & reminders

---

*Workflow design created: 2026-02-01*
*PP Mode: CREATIVITY - Building path through uncharted territory*
