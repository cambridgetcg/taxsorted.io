# Phase 1: Agent Authorisation API Integration Specification

> **Priority**: 3
> **Complexity**: Medium
> **Value**: Critical for accountant/agent use cases

---

## Overview

| Aspect | Detail |
|--------|--------|
| **API Name** | Agent Authorisation |
| **Version** | 2.0 |
| **Type** | REST |
| **Base URL (Sandbox)** | `https://test-api.service.hmrc.gov.uk` |
| **Base URL (Production)** | `https://api.service.hmrc.gov.uk` |
| **Authentication** | OAuth 2.0 |
| **Fraud Headers** | Not required |

---

## Purpose

Enables TaxSorted to support the **agent model** where:
- Accountants/agents can manage multiple clients
- Clients authorize the agent to act on their behalf
- Single software connection manages many tax affairs

---

## Supported Services

| Service | Code | Description |
|---------|------|-------------|
| **MTD VAT** | `HMRC-MTD-VAT` | VAT returns via MTD |
| **MTD ITSA** | `HMRC-MTD-IT` | Income Tax Self Assessment |

---

## Endpoints

### 1. Create Authorisation Request (Invitation)

**Purpose**: Agent invites client to authorize them

```
POST /agents/{arn}/invitations
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `arn` | String | Agent Reference Number |

**Request Body** (for Individual - MTD ITSA):
```json
{
  "service": "HMRC-MTD-IT",
  "clientIdType": "ni",
  "clientId": "AB123456C",
  "knownFact": "AA11AA"
}
```

**Request Body** (for Business - MTD VAT):
```json
{
  "service": "HMRC-MTD-VAT",
  "clientIdType": "vrn",
  "clientId": "123456789",
  "knownFact": "2020-01-01"
}
```

**Field Definitions**:

| Field | Description | Values |
|-------|-------------|--------|
| `service` | Service to authorize | `HMRC-MTD-IT`, `HMRC-MTD-VAT` |
| `clientIdType` | Type of client identifier | `ni` (NINO), `vrn` (VAT Reg Number) |
| `clientId` | Client's identifier | NINO or VRN |
| `knownFact` | Verification fact | Postcode (ITSA) or VAT reg date (VAT) |

**Response** (201 Created):
```json
{
  "invitationId": "ABERULMHCKKW3",
  "expiresDate": "2024-03-15",
  "status": "Pending"
}
```

**Headers in Response**:
- `Location`: Link to check invitation status

---

### 2. Get Invitation Status

**Purpose**: Check if client has accepted/rejected

```
GET /agents/{arn}/invitations/{invitationId}
```

**Response** (200 OK):
```json
{
  "invitationId": "ABERULMHCKKW3",
  "service": "HMRC-MTD-IT",
  "status": "Accepted",
  "created": "2024-02-15T10:30:00Z",
  "expiresDate": "2024-03-15",
  "updated": "2024-02-16T14:22:00Z",
  "arn": "AARN1234567",
  "clientId": "AB123456C",
  "clientIdType": "ni"
}
```

**Status Values**:

| Status | Meaning |
|--------|---------|
| `Pending` | Awaiting client response |
| `Accepted` | Client authorized agent |
| `Rejected` | Client declined |
| `Expired` | 21 days passed without response |
| `Cancelled` | Agent cancelled request |

---

### 3. Cancel Invitation

**Purpose**: Cancel pending invitation

```
PUT /agents/{arn}/invitations/{invitationId}/cancel
```

**Response**: 204 No Content

---

### 4. Get All Invitations

**Purpose**: List all invitations (with filters)

```
GET /agents/{arn}/invitations
```

**Query Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `service` | No | Filter by service |
| `status` | No | Filter by status |
| `clientId` | No | Filter by client |

**Response** (200 OK):
```json
{
  "invitations": [
    {
      "invitationId": "ABERULMHCKKW3",
      "service": "HMRC-MTD-IT",
      "status": "Accepted",
      "expiresDate": "2024-03-15",
      "clientId": "AB123456C"
    },
    {
      "invitationId": "XYZABC123DEF4",
      "service": "HMRC-MTD-VAT",
      "status": "Pending",
      "expiresDate": "2024-03-20",
      "clientId": "123456789"
    }
  ]
}
```

---

### 5. Check Active Relationships

**Purpose**: Check if agent-client relationship exists

```
GET /agents/{arn}/relationships
```

**Query Parameters**:
| Parameter | Required | Description |
|-----------|----------|-------------|
| `service` | Yes | Service code |
| `clientIdType` | Yes | `ni` or `vrn` |
| `clientId` | Yes | Client identifier |

**Response** (200 OK) - Relationship exists:
```json
{
  "arn": "AARN1234567",
  "service": "HMRC-MTD-IT",
  "clientId": "AB123456C",
  "clientIdType": "ni",
  "active": true
}
```

**Response** (404) - No relationship

---

### 6. Terminate Relationship

**Purpose**: End agent-client relationship

```
DELETE /agents/{arn}/relationships/service/{service}/clientIdType/{clientIdType}/clientId/{clientId}
```

**Response**: 204 No Content

---

## Client Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     AGENT AUTHORIZATION FLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  AGENT (TaxSorted)              CLIENT                    HMRC          │
│  ──────────────────             ──────                    ────          │
│                                                                          │
│  1. Agent adds client                                                    │
│     (enters NINO/VRN)                                                    │
│         │                                                                │
│         ▼                                                                │
│  2. POST /invitations ─────────────────────────────────────────────────►│
│         │                                                                │
│         ▼                                                                │
│  3. Receive invitationId                                                 │
│         │                                                                │
│         ▼                                                                │
│  4. Show "Pending" status                                                │
│         │                                                                │
│  ───────┼────────────────────────────────────────────────────────────── │
│         │                                                                │
│                              5. Client receives                          │
│                                 email from HMRC                          │
│                                      │                                   │
│                                      ▼                                   │
│                              6. Client logs into                         │
│                                 HMRC online ───────────────────────────►│
│                                      │                                   │
│                                      ▼                                   │
│                              7. Client clicks                            │
│                                 "Accept" ──────────────────────────────►│
│         │                                                                │
│  ───────┼────────────────────────────────────────────────────────────── │
│         │                                                                │
│  8. Poll GET /invitations/{id}                                           │
│         │                                                                │
│         ▼                                                                │
│  9. Status = "Accepted"                                                  │
│         │                                                                │
│         ▼                                                                │
│  10. Agent can now access                                                │
│      client's tax data                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Known Facts

### MTD ITSA (Individuals)

| knownFact | Description |
|-----------|-------------|
| Postcode | Client's registered postcode (e.g., "AA11AA") |

### MTD VAT (Businesses)

| knownFact | Description |
|-----------|-------------|
| VAT Registration Date | Date of VAT registration (YYYY-MM-DD) |

---

## Authentication

### Agent OAuth Scope

```
scope=read:sent-invitations write:sent-invitations read:relationships
```

### Agent Credentials

Agent authenticates with their **Agent Services Account** credentials, not individual client credentials.

---

## Data Model

### Client Entity (Extended)

```typescript
interface Client {
  id: string;
  agentId: string;  // Link to agent/firm

  // Client details
  name: string;
  email: string;
  phone?: string;

  // Identifiers
  nino?: string;
  vrn?: string;
  utr?: string;

  // Authorization status
  mtdItAuthorized: boolean;
  mtdVatAuthorized: boolean;

  // Invitation tracking
  pendingInvitations: Invitation[];

  createdAt: Date;
  updatedAt: Date;
}
```

### Invitation Entity

```typescript
interface Invitation {
  id: string;
  hmrcInvitationId: string;
  clientId: string;
  agentId: string;

  service: 'HMRC-MTD-IT' | 'HMRC-MTD-VAT';
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Expired' | 'Cancelled';

  createdAt: Date;
  expiresAt: Date;
  updatedAt?: Date;
}
```

---

## UI Components

### Add Client Flow

```
┌─────────────────────────────────────────────────────────────┐
│  ADD NEW CLIENT                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client Name: [_________________________]                    │
│                                                              │
│  Email:       [_________________________]                    │
│                                                              │
│  ─────────────────────────────────────────                   │
│  HMRC Authorization                                          │
│  ─────────────────────────────────────────                   │
│                                                              │
│  □ MTD for VAT                                               │
│    VAT Number:    [___________]                              │
│    Registration:  [YYYY-MM-DD]                               │
│                                                              │
│  □ MTD for Income Tax                                        │
│    NI Number:     [___________]                              │
│    Postcode:      [___________]                              │
│                                                              │
│  [Cancel]                      [Send Authorization Request]  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Client List with Status

```
┌─────────────────────────────────────────────────────────────┐
│  MY CLIENTS                                         [+ Add]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Name              VAT        ITSA       Actions             │
│  ───────────────   ───        ────       ───────             │
│  John Smith        ✅ Auth    🟡 Pending  [Manage]           │
│  ABC Ltd           ✅ Auth    N/A         [Manage]           │
│  Jane Doe          ❌ Not     🟡 Pending  [Resend] [Manage]  │
│  XYZ Partnership   ✅ Auth    ✅ Auth     [Manage]           │
│                                                              │
│  Legend: ✅ Authorized  🟡 Pending  ❌ Not connected         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Polling Strategy

### Invitation Status Check

```typescript
// Poll for invitation status
async function pollInvitationStatus(invitationId: string): Promise<string> {
  const maxAttempts = 10;
  const intervalMs = 5000; // 5 seconds

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getInvitationStatus(invitationId);

    if (status !== 'Pending') {
      return status;
    }

    await sleep(intervalMs);
  }

  return 'Pending'; // Still pending after polling
}
```

### Background Sync Job

```typescript
// Daily job to sync all pending invitations
async function syncPendingInvitations() {
  const pendingInvitations = await db.invitations.findAll({
    where: { status: 'Pending' }
  });

  for (const invitation of pendingInvitations) {
    const hmrcStatus = await getInvitationStatus(invitation.hmrcInvitationId);

    if (hmrcStatus !== 'Pending') {
      await db.invitations.update(invitation.id, {
        status: hmrcStatus,
        updatedAt: new Date()
      });

      // Update client authorization status
      if (hmrcStatus === 'Accepted') {
        await updateClientAuthorization(invitation.clientId, invitation.service);
      }
    }
  }
}
```

---

## Error Handling

| Status | Code | Meaning |
|--------|------|---------|
| 400 | `INVALID_ARN` | ARN format invalid |
| 400 | `INVALID_CLIENT_ID` | NINO/VRN invalid |
| 400 | `KNOWN_FACT_MISMATCH` | Postcode/date doesn't match |
| 401 | `UNAUTHORIZED` | Token expired |
| 403 | `NOT_AN_AGENT` | Account is not agent |
| 404 | `INVITATION_NOT_FOUND` | Invitation doesn't exist |
| 409 | `ALREADY_AUTHORISED` | Relationship exists |
| 409 | `DUPLICATE_INVITATION` | Pending invitation exists |

---

## Implementation Checklist

### Setup
- [ ] Register as agent on HMRC
- [ ] Obtain Agent Reference Number (ARN)
- [ ] Configure OAuth with agent scopes

### Endpoints
- [ ] POST create invitation
- [ ] GET invitation status
- [ ] GET all invitations
- [ ] PUT cancel invitation
- [ ] GET check relationships
- [ ] DELETE terminate relationship

### UI
- [ ] Add client form
- [ ] Client list with status
- [ ] Invitation management
- [ ] Resend invitation

### Background Jobs
- [ ] Poll pending invitations
- [ ] Expire old invitations
- [ ] Sync relationship status

---

## Test Scenarios (Sandbox)

### Create Test Agent

Use Create Test User API to create agent account:
```
POST /create-test-user/agents
```

### Test Invitations

| Gov-Test-Scenario | Result |
|-------------------|--------|
| `ACCEPTED` | Invitation auto-accepted |
| `REJECTED` | Invitation rejected |
| `EXPIRED` | Invitation expired |

---

*Integration spec created: 2026-02-01*
