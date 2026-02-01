# Dashboard: Complete Path Map

> **Purpose**: Comprehensive design specification for TaxSorted.io Dashboard
> **Design Date**: 2026-02-01
> **Component**: `/app/(dashboard)/dashboard/page.tsx`

---

## Dashboard Philosophy

### Core Principle
```
"Show me what needs my attention, when it's due, and how I'm doing."
```

### Design Goals
1. **Urgency First** - Critical deadlines surface immediately
2. **Actionable** - Every item has a clear next action
3. **At-a-Glance** - Key metrics visible without scrolling
4. **Entity-Centric** - All data flows from selected entity

---

## Dashboard Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DASHBOARD GRID SYSTEM                                         │
│                                    (12-column responsive)                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   DESKTOP (≥1280px)                                                                             │
│   ═══════════════════════════════════════════════════════════════════════════════════════════   │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ ZONE A: ENTITY HEADER (col-span-12)                                                      │  │
│   │ Height: 80px | Sticky on scroll                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────┐ ┌─────────────────────────────────┐  │
│   │ ZONE B: MAIN CONTENT (col-span-8)                   │ │ ZONE C: SIDEBAR (col-span-4)    │  │
│   │                                                      │ │                                 │  │
│   │ ┌──────────────────────────────────────────────────┐│ │ ┌─────────────────────────────┐ │  │
│   │ │ B1: Attention Required                           ││ │ │ C1: Compliance Score        │ │  │
│   │ │ Priority: Critical                               ││ │ │ Height: 160px               │ │  │
│   │ │ Height: Auto (expands)                           ││ │ └─────────────────────────────┘ │  │
│   │ └──────────────────────────────────────────────────┘│ │                                 │  │
│   │                                                      │ │ ┌─────────────────────────────┐ │  │
│   │ ┌──────────────────────────────────────────────────┐│ │ │ C2: HMRC Connections        │ │  │
│   │ │ B2: Upcoming Deadlines                           ││ │ │ Height: 140px               │ │  │
│   │ │ Priority: High                                   ││ │ └─────────────────────────────┘ │  │
│   │ │ Height: 320px                                    ││ │                                 │  │
│   │ └──────────────────────────────────────────────────┘│ │ ┌─────────────────────────────┐ │  │
│   │                                                      │ │ │ C3: Quick Actions           │ │  │
│   │ ┌──────────────────────────────────────────────────┐│ │ │ Height: 180px               │ │  │
│   │ │ B3: Recent Submissions                           ││ │ └─────────────────────────────┘ │  │
│   │ │ Priority: Medium                                 ││ │                                 │  │
│   │ │ Height: 280px                                    ││ │ ┌─────────────────────────────┐ │  │
│   │ └──────────────────────────────────────────────────┘│ │ │ C4: Helpful Links           │ │  │
│   │                                                      │ │ │ Height: 120px               │ │  │
│   └─────────────────────────────────────────────────────┘ │ └─────────────────────────────┘ │  │
│                                                            │                                 │  │
│                                                            └─────────────────────────────────┘  │
│                                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                                  │
│   TABLET (768px - 1279px)                                                                       │
│   ═══════════════════════════════════════════════════════════════════════════════════════════   │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ ZONE A: ENTITY HEADER (col-span-12)                                                      │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌──────────────────────────────────┐ ┌──────────────────────────────────┐                    │
│   │ C1: Compliance Score (col-span-6)│ │ C2: HMRC Connections (col-span-6)│                    │
│   └──────────────────────────────────┘ └──────────────────────────────────┘                    │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ B1: Attention Required (col-span-12)                                                     │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ B2: Upcoming Deadlines (col-span-12)                                                     │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ B3: Recent Submissions (col-span-12)                                                     │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ─────────────────────────────────────────────────────────────────────────────────────────────  │
│                                                                                                  │
│   MOBILE (<768px)                                                                               │
│   ═══════════════════════════════════════════════════════════════════════════════════════════   │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ A: Entity Header (compact)                                                               │  │
│   ├─────────────────────────────────────────────────────────────────────────────────────────┤  │
│   │ C1: Compliance Score (collapsed to single metric)                                        │  │
│   ├─────────────────────────────────────────────────────────────────────────────────────────┤  │
│   │ B1: Attention Required (stacked cards)                                                   │  │
│   ├─────────────────────────────────────────────────────────────────────────────────────────┤  │
│   │ B2: Upcoming Deadlines (scrollable list)                                                 │  │
│   ├─────────────────────────────────────────────────────────────────────────────────────────┤  │
│   │ C3: Quick Actions (bottom sheet trigger)                                                 │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Zone A: Entity Header

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ZONE A: ENTITY HEADER                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   ┌────┐                                                                                │  │
│   │   │ 🏢 │  ABC LIMITED                                              [Switch Entity ▼]   │  │
│   │   └────┘  Private Limited Company                                                       │  │
│   │                                                                                          │  │
│   │           CRN: 12345678  •  UTR: 1234567890  •  VRN: 123456789                          │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   STATES:                                                                                       │
│   ───────                                                                                       │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ LOADING                                                                                  │  │
│   │ ┌────┐                                                                                  │  │
│   │ │ ▓▓ │  ████████████████████                               [████████████]              │  │
│   │ └────┘  ██████████████████████████████                                                  │  │
│   │         ████████  •  ██████████  •  █████████                                           │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ NO ENTITY (First-time user)                                                              │  │
│   │                                                                                          │  │
│   │   Welcome! Let's set up your first entity.                                              │  │
│   │                                                                                          │  │
│   │   [+ Add Your First Entity]                                                             │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ MULTIPLE ENTITIES (Dropdown expanded)                                                    │  │
│   │                                                                                          │  │
│   │   ┌────┐  ABC LIMITED                                              [Switch Entity ▲]   │  │
│   │   │ 🏢 │  Private Limited Company                                                       │  │
│   │   └────┘  ─────────────────────────────────────────────────────────────────────────    │  │
│   │           ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│   │           │ ✓ ABC LIMITED              Private Limited Company                      │  │  │
│   │           │   XYZ CONSULTING LLP       LLP                                          │  │  │
│   │           │   John Smith               Self-Employed Individual                     │  │  │
│   │           │ ─────────────────────────────────────────────────────────────────────── │  │  │
│   │           │   + Add New Entity                                                      │  │  │
│   │           └─────────────────────────────────────────────────────────────────────────┘  │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Entity Header Component

```typescript
// components/dashboard/entity-header.tsx

interface EntityHeaderProps {
  entity: Entity | null;
  entities: Entity[];
  isLoading: boolean;
  onEntityChange: (entityId: string) => void;
}

interface EntityIconMap {
  'private-limited-company': '🏢';
  'public-limited-company': '🏛️';
  'llp': '🤝';
  'general-partnership': '👥';
  'individual-self-employed': '👤';
  'individual-employed': '👤';
  'cic': '🌍';
  'charitable-company': '💝';
  'cio': '💝';
  'discretionary-trust': '🏦';
  'cooperative-society': '👥';
  // ... etc
}

// Identifier display logic
function formatIdentifiers(entity: Entity): IdentifierDisplay[] {
  const displays: IdentifierDisplay[] = [];

  if (entity.identifiers.crn) {
    displays.push({ label: 'CRN', value: entity.identifiers.crn });
  }
  if (entity.identifiers.utr) {
    displays.push({ label: 'UTR', value: entity.identifiers.utr });
  }
  if (entity.identifiers.vrn) {
    displays.push({ label: 'VRN', value: entity.identifiers.vrn });
  }
  if (entity.identifiers.charityNumber) {
    displays.push({ label: 'Charity No', value: entity.identifiers.charityNumber });
  }

  return displays.slice(0, 3); // Max 3 identifiers shown
}
```

---

## Zone B1: Attention Required

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ZONE B1: ATTENTION REQUIRED                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   CARD DESIGN - CRITICAL (Past due or due within 3 days)                                        │
│   ════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ ┌───┐                                                                                    │  │
│   │ │ 🔴│  VAT Q3 2024                                                                      │  │
│   │ └───┘  ─────────────────────────────────────────────────────────────────────────────── │  │
│   │                                                                                          │  │
│   │        Period: Oct - Dec 2024                                                           │  │
│   │        Due: 7 February 2025                                                              │  │
│   │                                                                                          │  │
│   │        ┌──────────────────────────────────────────────────────────────────────────────┐ │  │
│   │        │  ⏰ 3 DAYS REMAINING                                                         │ │  │
│   │        └──────────────────────────────────────────────────────────────────────────────┘ │  │
│   │                                                                                          │  │
│   │        Net VAT payable: £9,250.00                                                       │  │
│   │                                                                                          │  │
│   │        ┌─────────────────────────────────────────────────┐                              │  │
│   │        │          Review & Submit →                       │ ← Primary CTA              │  │
│   │        └─────────────────────────────────────────────────┘                              │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   CARD DESIGN - WARNING (Due within 14 days)                                                    │
│   ════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ ┌───┐                                                                                    │  │
│   │ │ 🟡│  PAYE EPS January                                                                 │  │
│   │ └───┘  ─────────────────────────────────────────────────────────────────────────────── │  │
│   │                                                                                          │  │
│   │        Period: January 2025                                                              │  │
│   │        Due: 19 February 2025                                                             │  │
│   │                                                                                          │  │
│   │        ⏰ 15 days remaining                                                              │  │
│   │                                                                                          │  │
│   │        Status: Not started                                                               │  │
│   │                                                                                          │  │
│   │        ┌─────────────────────────────────────────────────┐                              │  │
│   │        │             Start →                              │ ← Secondary CTA             │  │
│   │        └─────────────────────────────────────────────────┘                              │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   CARD DESIGN - OVERDUE (Past deadline)                                                         │
│   ════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │ ┌───┐                                                                  ⚠️ OVERDUE       │  │
│   │ │ ❌│  Confirmation Statement                                                           │  │
│   │ └───┘  ─────────────────────────────────────────────────────────────────────────────── │  │
│   │                                                                                          │  │
│   │        Review period: December 2024                                                      │  │
│   │        Was due: 14 January 2025                                                          │  │
│   │                                                                                          │  │
│   │        ┌──────────────────────────────────────────────────────────────────────────────┐ │  │
│   │        │  ❌ 20 DAYS OVERDUE - £150 penalty may apply                                 │ │  │
│   │        └──────────────────────────────────────────────────────────────────────────────┘ │  │
│   │                                                                                          │  │
│   │        ┌─────────────────────────────────────────────────┐                              │  │
│   │        │          File Now →                              │ ← Urgent CTA               │  │
│   │        └─────────────────────────────────────────────────┘                              │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   EMPTY STATE                                                                                   │
│   ════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │                                    ✅                                                    │  │
│   │                                                                                          │  │
│   │                        All caught up!                                                    │  │
│   │                                                                                          │  │
│   │               No filings need your attention right now.                                  │  │
│   │                                                                                          │  │
│   │                   [View All Filings →]                                                   │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Attention Card Logic

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ATTENTION CARD DECISION TREE                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│                               ┌─────────────────────────┐                                       │
│                               │   Fetch All Filings     │                                       │
│                               │   for Current Entity    │                                       │
│                               └────────────┬────────────┘                                       │
│                                            │                                                     │
│                                            ▼                                                     │
│                               ┌─────────────────────────┐                                       │
│                               │   Filter: Status NOT    │                                       │
│                               │   'fulfilled' or        │                                       │
│                               │   'future' (>30 days)   │                                       │
│                               └────────────┬────────────┘                                       │
│                                            │                                                     │
│                    ┌───────────────────────┼───────────────────────┐                           │
│                    │                       │                       │                           │
│                    ▼                       ▼                       ▼                           │
│           ┌───────────────┐       ┌───────────────┐       ┌───────────────┐                   │
│           │   OVERDUE     │       │   CRITICAL    │       │   WARNING     │                   │
│           │ dueDate < now │       │ dueDate ≤ 3d  │       │ dueDate ≤ 14d │                   │
│           └───────┬───────┘       └───────┬───────┘       └───────┬───────┘                   │
│                   │                       │                       │                           │
│                   ▼                       ▼                       ▼                           │
│           ┌───────────────┐       ┌───────────────┐       ┌───────────────┐                   │
│           │  Red Card     │       │  Red Card     │       │  Yellow Card  │                   │
│           │  "OVERDUE"    │       │  Days counter │       │  Days counter │                   │
│           │  badge        │       │  highlighted  │       │  muted        │                   │
│           │  Penalty info │       │               │       │               │                   │
│           └───────────────┘       └───────────────┘       └───────────────┘                   │
│                                                                                                  │
│   SORT ORDER:                                                                                   │
│   ───────────                                                                                   │
│   1. Overdue (oldest first)                                                                     │
│   2. Critical (nearest deadline first)                                                          │
│   3. Warning (nearest deadline first)                                                           │
│                                                                                                  │
│   MAX DISPLAY: 3 cards (with "View All" link if more)                                          │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Attention Card Component

```typescript
// components/dashboard/attention-required.tsx

type UrgencyLevel = 'overdue' | 'critical' | 'warning';

interface AttentionFiling {
  id: string;
  filingType: FilingType;
  displayName: string;
  periodDescription: string;
  dueDate: Date;
  status: ObligationStatus;
  urgency: UrgencyLevel;
  daysRemaining: number;

  // Optional financial info
  amount?: number;
  amountLabel?: string;

  // Penalty info (for overdue)
  penaltyInfo?: string;
}

function calculateUrgency(dueDate: Date, status: ObligationStatus): UrgencyLevel {
  const now = new Date();
  const daysRemaining = differenceInDays(dueDate, now);

  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 3) return 'critical';
  return 'warning';
}

function getAttentionFilings(filings: Filing[]): AttentionFiling[] {
  return filings
    .filter(f => {
      const days = differenceInDays(f.dueDate, new Date());
      return f.status !== 'fulfilled' && days <= 14;
    })
    .map(f => ({
      ...f,
      urgency: calculateUrgency(f.dueDate, f.status),
      daysRemaining: differenceInDays(f.dueDate, new Date()),
    }))
    .sort((a, b) => {
      // Overdue first, then by days remaining
      if (a.urgency === 'overdue' && b.urgency !== 'overdue') return -1;
      if (b.urgency === 'overdue' && a.urgency !== 'overdue') return 1;
      return a.daysRemaining - b.daysRemaining;
    })
    .slice(0, 3);
}

// Card color mapping
const URGENCY_STYLES: Record<UrgencyLevel, CardStyle> = {
  overdue: {
    border: 'border-red-500',
    background: 'bg-red-50',
    badge: 'bg-red-500 text-white',
    icon: '❌',
  },
  critical: {
    border: 'border-red-400',
    background: 'bg-red-50/50',
    badge: 'bg-red-100 text-red-700',
    icon: '🔴',
  },
  warning: {
    border: 'border-yellow-400',
    background: 'bg-yellow-50/50',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: '🟡',
  },
};
```

---

## Zone B2: Upcoming Deadlines

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ZONE B2: UPCOMING DEADLINES                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   📅 Upcoming Deadlines                                     [View Calendar →]           │  │
│   │   ─────────────────────────────────────────────────────────────────────────────────────  │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │                                                                                  │   │  │
│   │   │   FEBRUARY 2025                                                                  │   │  │
│   │   │   ────────────                                                                   │   │  │
│   │   │                                                                                  │   │  │
│   │   │   ┌─────┐                                                                        │   │  │
│   │   │   │  7  │  VAT Q3 2024                    🔴 3 days      £9,250 due   [Submit →]│   │  │
│   │   │   │ FEB │  Quarterly VAT Return                                                  │   │  │
│   │   │   └─────┘                                                                        │   │  │
│   │   │                                                                                  │   │  │
│   │   │   ┌─────┐                                                                        │   │  │
│   │   │   │ 19  │  PAYE EPS January              🟡 15 days     -            [Start →] │   │  │
│   │   │   │ FEB │  Monthly Employer Summary                                              │   │  │
│   │   │   └─────┘                                                                        │   │  │
│   │   │                                                                                  │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │                                                                                  │   │  │
│   │   │   MARCH 2025                                                                     │   │  │
│   │   │   ──────────                                                                     │   │  │
│   │   │                                                                                  │   │  │
│   │   │   ┌─────┐                                                                        │   │  │
│   │   │   │ 31  │  CT600 Corporation Tax         ⚪ 52 days     -            [Edit →]  │   │  │
│   │   │   │ MAR │  Year ending Mar 2024                                                  │   │  │
│   │   │   └─────┘                                                                        │   │  │
│   │   │                                                                                  │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │                                                                                  │   │  │
│   │   │   MAY 2025                                                                       │   │  │
│   │   │   ────────                                                                       │   │  │
│   │   │                                                                                  │   │  │
│   │   │   ┌─────┐                                                                        │   │  │
│   │   │   │  7  │  VAT Q4 2024-25                ⚪ Future      -                      │   │  │
│   │   │   │ MAY │  Quarterly VAT Return                                                  │   │  │
│   │   │   └─────┘                                                                        │   │  │
│   │   │                                                                                  │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   + 4 more deadlines this year                              [View All →]                │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   EMPTY STATE                                                                                   │
│   ════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │                                    📅                                                    │  │
│   │                                                                                          │  │
│   │                      No upcoming deadlines                                               │  │
│   │                                                                                          │  │
│   │               All your filings are up to date.                                           │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Deadline Row Component

```typescript
// components/dashboard/upcoming-deadlines.tsx

interface DeadlineGroup {
  monthYear: string;  // "FEBRUARY 2025"
  deadlines: Deadline[];
}

interface Deadline {
  id: string;
  filingType: FilingType;
  displayName: string;
  description: string;
  dueDate: Date;
  dayOfMonth: number;
  monthAbbrev: string;
  daysRemaining: number;
  status: ObligationStatus;
  urgencyIndicator: '🔴' | '🟡' | '⚪';
  amount?: number;
  actionLabel: string;
  actionHref: string;
}

function groupDeadlinesByMonth(deadlines: Deadline[]): DeadlineGroup[] {
  const groups = new Map<string, Deadline[]>();

  deadlines.forEach(d => {
    const key = format(d.dueDate, 'MMMM yyyy').toUpperCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  });

  return Array.from(groups.entries())
    .map(([monthYear, deadlines]) => ({ monthYear, deadlines }))
    .sort((a, b) =>
      new Date(a.deadlines[0].dueDate).getTime() -
      new Date(b.deadlines[0].dueDate).getTime()
    );
}

function getActionLabel(status: ObligationStatus): string {
  switch (status) {
    case 'open': return 'Start';
    case 'draft': return 'Edit';
    case 'ready': return 'Submit';
    case 'future': return '';
    default: return 'View';
  }
}

// Display limit
const MAX_DEADLINES = 6;
const MAX_MONTHS = 3;
```

---

## Zone B3: Recent Submissions

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ZONE B3: RECENT SUBMISSIONS                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   ✅ Recent Submissions                                     [View All →]                │  │
│   │   ─────────────────────────────────────────────────────────────────────────────────────  │  │
│   │                                                                                          │  │
│   │   ┌──────────────────────────────────────────────────────────────────────────────────┐  │  │
│   │   │                                                                                   │  │  │
│   │   │    Filing             Period           Submitted        Status      Reference    │  │  │
│   │   │   ─────────────────────────────────────────────────────────────────────────────  │  │  │
│   │   │                                                                                   │  │  │
│   │   │    VAT Q2 2024        Jul-Sep 2024     7 Nov 2024       ✓ Accepted  XQ123456... │  │  │
│   │   │                                                                                   │  │  │
│   │   │    PAYE FPS Jan       January 2025     31 Jan 2025      ✓ Accepted  RTI-2025... │  │  │
│   │   │                                                                                   │  │  │
│   │   │    PAYE EPS Dec       December 2024    19 Jan 2025      ✓ Accepted  RTI-2024... │  │  │
│   │   │                                                                                   │  │  │
│   │   │    VAT Q1 2024        Apr-Jun 2024     7 Aug 2024       ✓ Accepted  XQ987654... │  │  │
│   │   │                                                                                   │  │  │
│   │   └──────────────────────────────────────────────────────────────────────────────────┘  │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   STATUS BADGES                                                                                 │
│   ═════════════                                                                                 │
│                                                                                                  │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│   │ ✓ Accepted │  │ ⏳ Processing│  │ ❌ Rejected │  │ 📤 Submitted│  │ 📋 Pending  │              │
│   │ (green)    │  │ (blue)      │  │ (red)       │  │ (blue)      │  │ (gray)      │              │
│   └────────────┘  └────────────┘  └────────────┘  └────────────┘  └────────────┘              │
│                                                                                                  │
│   EMPTY STATE                                                                                   │
│   ════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │                                    📤                                                    │  │
│   │                                                                                          │  │
│   │                      No submissions yet                                                  │  │
│   │                                                                                          │  │
│   │           Your submission history will appear here once                                  │  │
│   │                    you file your first return.                                           │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ROW INTERACTION                                                                               │
│   ═══════════════                                                                               │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │    VAT Q2 2024        Jul-Sep 2024     7 Nov 2024       ✓ Accepted  XQ123456789012     │  │
│   │                                                                      ─────────────────  │  │
│   │    └─ Click row to expand details                                    └─ Copy on click   │  │
│   │                                                                                          │  │
│   │   ┌──────────────────────────────────────────────────────────────────────────────────┐  │  │
│   │   │  EXPANDED VIEW                                                                    │  │  │
│   │   │  ─────────────────────────────────────────────────────────────────────────────── │  │  │
│   │   │                                                                                   │  │  │
│   │   │  HMRC Reference: XQ123456789012                                                  │  │  │
│   │   │  Submission ID: sub_2024_vat_q2_001                                              │  │  │
│   │   │  Submitted: 7 November 2024 at 14:32                                             │  │  │
│   │   │  Accepted: 7 November 2024 at 14:33                                              │  │  │
│   │   │                                                                                   │  │  │
│   │   │  Net VAT Paid: £8,450.00                                                         │  │  │
│   │   │                                                                                   │  │  │
│   │   │  [Download PDF Receipt]    [View Full Details]                                   │  │  │
│   │   │                                                                                   │  │  │
│   │   └──────────────────────────────────────────────────────────────────────────────────┘  │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Recent Submissions Component

```typescript
// components/dashboard/recent-submissions.tsx

interface Submission {
  id: string;
  filingType: FilingType;
  displayName: string;
  periodDescription: string;
  submittedAt: Date;
  status: SubmissionStatus;
  hmrcReference?: string;
  amount?: number;
}

type SubmissionStatus =
  | 'submitted'   // Sent, awaiting response
  | 'processing'  // HMRC processing
  | 'accepted'    // Successfully filed
  | 'rejected';   // Errors, needs resubmission

const STATUS_CONFIG: Record<SubmissionStatus, StatusConfig> = {
  accepted: {
    icon: '✓',
    label: 'Accepted',
    className: 'bg-green-100 text-green-700',
  },
  processing: {
    icon: '⏳',
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700',
  },
  submitted: {
    icon: '📤',
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-700',
  },
  rejected: {
    icon: '❌',
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
  },
};

// Truncate reference for display
function formatReference(ref: string): string {
  if (ref.length <= 12) return ref;
  return `${ref.slice(0, 10)}...`;
}

// Display limit
const MAX_SUBMISSIONS = 5;
```

---

## Zone C1: Compliance Score

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ZONE C1: COMPLIANCE SCORE                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   EXCELLENT (90-100%)                                                                           │
│   ═══════════════════                                                                           │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   📊 Compliance Score                                                                    │  │
│   │   ─────────────────────────────────────────────────────────────────────────────────────  │  │
│   │                                                                                          │  │
│   │                          ┌───────────────────────┐                                      │  │
│   │                          │                       │                                      │  │
│   │                          │     ╭───────────╮     │                                      │  │
│   │                          │    ╱             ╲    │                                      │  │
│   │                          │   │      94%     │    │  ← Circular progress                │  │
│   │                          │    ╲             ╱    │    (green fill)                     │  │
│   │                          │     ╰───────────╯     │                                      │  │
│   │                          │                       │                                      │  │
│   │                          └───────────────────────┘                                      │  │
│   │                                                                                          │  │
│   │                              Excellent                                                   │  │
│   │                                                                                          │  │
│   │                     17 of 18 filings on time                                            │  │
│   │                           this year                                                      │  │
│   │                                                                                          │  │
│   │                        [View History →]                                                  │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   GOOD (70-89%)                                                                                 │
│   ═════════════                                                                                 │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                          │      78%      │        (yellow/amber fill)                   │  │
│   │                                                                                          │  │
│   │                               Good                                                       │  │
│   │                      14 of 18 filings on time                                           │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   NEEDS IMPROVEMENT (<70%)                                                                      │
│   ════════════════════════                                                                      │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                          │      52%      │        (red fill)                            │  │
│   │                                                                                          │  │
│   │                         Needs Improvement                                                │  │
│   │                      9 of 18 filings on time                                            │  │
│   │                                                                                          │  │
│   │               ⚠️ 3 overdue filings - file now to improve                                │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   NO DATA (New entity)                                                                          │
│   ════════════════════                                                                          │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                          │      --       │        (gray)                                │  │
│   │                                                                                          │  │
│   │                           No data yet                                                    │  │
│   │                   Complete your first filing to                                          │  │
│   │                      see your compliance score                                           │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Compliance Score Component

```typescript
// components/dashboard/compliance-score.tsx

interface ComplianceData {
  score: number;           // 0-100
  onTimeCount: number;
  totalCount: number;
  overdueCount: number;
  period: 'year' | 'all-time';
}

type ScoreLevel = 'excellent' | 'good' | 'needs-improvement' | 'no-data';

function getScoreLevel(score: number | null): ScoreLevel {
  if (score === null) return 'no-data';
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  return 'needs-improvement';
}

const SCORE_CONFIG: Record<ScoreLevel, ScoreConfig> = {
  'excellent': {
    label: 'Excellent',
    color: 'text-green-600',
    progressColor: 'stroke-green-500',
    bgColor: 'bg-green-50',
  },
  'good': {
    label: 'Good',
    color: 'text-yellow-600',
    progressColor: 'stroke-yellow-500',
    bgColor: 'bg-yellow-50',
  },
  'needs-improvement': {
    label: 'Needs Improvement',
    color: 'text-red-600',
    progressColor: 'stroke-red-500',
    bgColor: 'bg-red-50',
  },
  'no-data': {
    label: 'No data yet',
    color: 'text-gray-400',
    progressColor: 'stroke-gray-200',
    bgColor: 'bg-gray-50',
  },
};

function calculateComplianceScore(filings: Filing[]): ComplianceData {
  const currentYear = new Date().getFullYear();
  const yearFilings = filings.filter(f =>
    f.dueDate.getFullYear() === currentYear &&
    f.status === 'fulfilled'
  );

  const onTime = yearFilings.filter(f =>
    f.submittedAt && f.submittedAt <= f.dueDate
  ).length;

  const total = yearFilings.length;
  const overdue = filings.filter(f => f.status === 'overdue').length;

  return {
    score: total > 0 ? Math.round((onTime / total) * 100) : 0,
    onTimeCount: onTime,
    totalCount: total,
    overdueCount: overdue,
    period: 'year',
  };
}
```

---

## Zone C2: HMRC Connections

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ZONE C2: HMRC CONNECTIONS                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   FULLY CONNECTED                                                                               │
│   ═══════════════                                                                               │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   🔗 HMRC Connections                                      [Manage →]                   │  │
│   │   ─────────────────────────────────────────────────────────────────────────────────────  │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  ✓ VAT MTD                                                                       │   │  │
│   │   │    Connected • VRN: 123 456 789                                                  │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  ✓ PAYE RTI                                                                      │   │  │
│   │   │    Connected • PAYE: 123/AB12345                                                 │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   PARTIALLY CONNECTED                                                                           │
│   ═══════════════════                                                                           │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   🔗 HMRC Connections                                      [Manage →]                   │  │
│   │   ─────────────────────────────────────────────────────────────────────────────────────  │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  ✓ VAT MTD                     Connected • VRN: 123 456 789                      │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  ⚠ PAYE RTI                    Not connected            [Connect →]             │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   ⚠️ Connect PAYE to submit payroll filings automatically                               │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   NOT CONNECTED                                                                                 │
│   ═════════════                                                                                 │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   🔗 HMRC Connections                                                                    │  │
│   │   ─────────────────────────────────────────────────────────────────────────────────────  │  │
│   │                                                                                          │  │
│   │   Connect to HMRC to submit your tax returns directly.                                  │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  ○ VAT MTD                                               [Connect →]            │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  ○ PAYE RTI                                              [Connect →]            │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   TOKEN EXPIRING                                                                                │
│   ══════════════                                                                                │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  ⚠ VAT MTD                     Expires in 5 days        [Renew →]               │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### HMRC Connections Component

```typescript
// components/dashboard/hmrc-connections.tsx

type ConnectionType = 'vat-mtd' | 'paye-rti' | 'ct' | 'sa';

interface HMRCConnection {
  type: ConnectionType;
  displayName: string;
  status: 'connected' | 'not-connected' | 'expiring' | 'expired';
  identifier?: string;        // VRN, PAYE ref, etc.
  expiresAt?: Date;
  daysUntilExpiry?: number;
}

function getRequiredConnections(entity: Entity): ConnectionType[] {
  const required: ConnectionType[] = [];

  if (entity.attributes.vatRegistered) {
    required.push('vat-mtd');
  }
  if (entity.attributes.hasEmployees) {
    required.push('paye-rti');
  }
  // CT600 is portal-only for now, so not included

  return required;
}

const CONNECTION_CONFIG: Record<ConnectionType, ConnectionConfig> = {
  'vat-mtd': {
    displayName: 'VAT MTD',
    identifierLabel: 'VRN',
    oauthScope: 'read:vat write:vat',
  },
  'paye-rti': {
    displayName: 'PAYE RTI',
    identifierLabel: 'PAYE',
    oauthScope: 'read:paye write:paye',
  },
  'ct': {
    displayName: 'Corporation Tax',
    identifierLabel: 'UTR',
    oauthScope: 'read:corporation-tax',
  },
  'sa': {
    displayName: 'Self Assessment',
    identifierLabel: 'UTR',
    oauthScope: 'read:self-assessment write:self-assessment',
  },
};

// Show warning if token expires within 7 days
const EXPIRY_WARNING_DAYS = 7;
```

---

## Zone C3: Quick Actions

### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ZONE C3: QUICK ACTIONS                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   CONTEXT-AWARE ACTIONS                                                                         │
│   ═════════════════════                                                                         │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   💡 Quick Actions                                                                       │  │
│   │   ─────────────────────────────────────────────────────────────────────────────────────  │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  📤 Submit VAT Return                                                            │   │  │
│   │   │     VAT Q3 2024 ready to submit                                                  │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  📊 Export CT600 Data                                                            │   │  │
│   │   │     For portal submission                                                        │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   │   ┌─────────────────────────────────────────────────────────────────────────────────┐   │  │
│   │   │  ➕ Add PAYE Submission                                                          │   │  │
│   │   │     Record January FPS                                                           │   │  │
│   │   └─────────────────────────────────────────────────────────────────────────────────┘   │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ACTION LOGIC                                                                                  │
│   ════════════                                                                                  │
│                                                                                                  │
│   Actions are prioritized based on:                                                             │
│   1. Urgency (overdue/critical filings first)                                                   │
│   2. Filing status (ready > draft > open)                                                       │
│   3. Submission method (API-submittable first)                                                  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Quick Actions Component

```typescript
// components/dashboard/quick-actions.tsx

interface QuickAction {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  priority: number;  // Lower = higher priority
}

function generateQuickActions(
  entity: Entity,
  filings: Filing[],
  connections: HMRCConnection[]
): QuickAction[] {
  const actions: QuickAction[] = [];

  // 1. Ready filings that can be submitted via API
  const readyFilings = filings.filter(f => f.status === 'ready');
  readyFilings.forEach(f => {
    if (f.submissionMethod === 'mtd-rest-api') {
      actions.push({
        id: `submit-${f.id}`,
        icon: '📤',
        title: `Submit ${f.displayName}`,
        subtitle: `${f.periodDescription} ready to submit`,
        href: `/filings/${f.id}/submit`,
        priority: 1,
      });
    }
  });

  // 2. Draft filings
  const draftFilings = filings.filter(f => f.status === 'draft');
  draftFilings.forEach(f => {
    actions.push({
      id: `continue-${f.id}`,
      icon: '📝',
      title: `Continue ${f.displayName}`,
      subtitle: 'Resume where you left off',
      href: `/filings/${f.id}/prepare`,
      priority: 2,
    });
  });

  // 3. Export actions for portal-only filings
  const portalFilings = filings.filter(f =>
    f.submissionMethod === 'portal-only' &&
    f.status === 'ready'
  );
  portalFilings.forEach(f => {
    actions.push({
      id: `export-${f.id}`,
      icon: '📊',
      title: `Export ${f.displayName} Data`,
      subtitle: 'For portal submission',
      href: `/filings/${f.id}/export`,
      priority: 3,
    });
  });

  // 4. Connection prompts
  const missingConnections = connections.filter(c =>
    c.status === 'not-connected'
  );
  if (missingConnections.length > 0) {
    actions.push({
      id: 'connect-hmrc',
      icon: '🔗',
      title: 'Connect to HMRC',
      subtitle: `${missingConnections.length} connection(s) needed`,
      href: '/settings/connections',
      priority: 4,
    });
  }

  return actions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}
```

---

## Data Requirements

### Dashboard Data Model

```typescript
// types/dashboard.ts

interface DashboardData {
  entity: Entity;
  attentionFilings: AttentionFiling[];
  upcomingDeadlines: DeadlineGroup[];
  recentSubmissions: Submission[];
  complianceScore: ComplianceData;
  connections: HMRCConnection[];
  quickActions: QuickAction[];
}

// API Response
interface DashboardResponse {
  data: DashboardData;
  meta: {
    fetchedAt: string;
    entityId: string;
  };
}
```

### API Endpoint

```typescript
// app/api/dashboard/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entityId');

  // Parallel data fetching
  const [
    entity,
    filings,
    submissions,
    connections
  ] = await Promise.all([
    getEntity(entityId),
    getFilings(entityId),
    getSubmissions(entityId, { limit: 5 }),
    getConnections(entityId),
  ]);

  // Derive computed data
  const attentionFilings = getAttentionFilings(filings);
  const upcomingDeadlines = getUpcomingDeadlines(filings);
  const complianceScore = calculateComplianceScore(filings);
  const quickActions = generateQuickActions(entity, filings, connections);

  return Response.json({
    data: {
      entity,
      attentionFilings,
      upcomingDeadlines,
      recentSubmissions: submissions,
      complianceScore,
      connections,
      quickActions,
    },
    meta: {
      fetchedAt: new Date().toISOString(),
      entityId,
    },
  });
}
```

---

## State Management

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD STATE FLOW                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              REACT QUERY SETUP                                           │  │
│   │                                                                                          │  │
│   │   // hooks/use-dashboard.ts                                                             │  │
│   │                                                                                          │  │
│   │   export function useDashboard(entityId: string) {                                      │  │
│   │     return useQuery({                                                                   │  │
│   │       queryKey: ['dashboard', entityId],                                                │  │
│   │       queryFn: () => fetchDashboard(entityId),                                          │  │
│   │       staleTime: 1000 * 60 * 5,        // 5 minutes                                     │  │
│   │       refetchOnWindowFocus: true,                                                       │  │
│   │       refetchInterval: 1000 * 60 * 5,  // Auto-refresh every 5 min                      │  │
│   │     });                                                                                 │  │
│   │   }                                                                                     │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              DATA FLOW                                                   │  │
│   │                                                                                          │  │
│   │   EntityContext                                                                          │  │
│   │       │                                                                                  │  │
│   │       │ currentEntityId                                                                 │  │
│   │       │                                                                                  │  │
│   │       ▼                                                                                  │  │
│   │   useDashboard(entityId)                                                                │  │
│   │       │                                                                                  │  │
│   │       │ { data, isLoading, error }                                                      │  │
│   │       │                                                                                  │  │
│   │       ├─────────────────────┬─────────────────────┬─────────────────────┐               │  │
│   │       │                     │                     │                     │               │  │
│   │       ▼                     ▼                     ▼                     ▼               │  │
│   │   EntityHeader         AttentionRequired    UpcomingDeadlines    ComplianceScore        │  │
│   │   (entity)             (attentionFilings)   (upcomingDeadlines)  (complianceScore)      │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                              CACHE INVALIDATION                                          │  │
│   │                                                                                          │  │
│   │   After submission:                                                                      │  │
│   │   queryClient.invalidateQueries(['dashboard', entityId])                                │  │
│   │   queryClient.invalidateQueries(['filings', entityId])                                  │  │
│   │   queryClient.invalidateQueries(['submissions', entityId])                              │  │
│   │                                                                                          │  │
│   │   After entity change:                                                                   │  │
│   │   queryClient.invalidateQueries(['dashboard', oldEntityId])                             │  │
│   │   // New entity data fetches automatically                                              │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Loading & Error States

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              LOADING & ERROR STATES                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   INITIAL LOADING (Skeleton)                                                                    │
│   ══════════════════════════                                                                    │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │  ┌────┐                                                                                  │  │
│   │  │ ▓▓ │  ████████████████████████████████                       [████████████]          │  │
│   │  └────┘  ██████████████████████████████████████████                                      │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────┐ ┌─────────────────────────────────┐  │
│   │                                                      │ │                                 │  │
│   │  ⚠️ Attention Required                               │ │  ┌───────────────────────┐     │  │
│   │  ──────────────────────────────────────────────     │ │  │                       │     │  │
│   │                                                      │ │  │    ████████████████   │     │  │
│   │  ┌──────────────────────────────────────────────┐   │ │  │                       │     │  │
│   │  │ ████████████████████████████████████████████ │   │ │  └───────────────────────┘     │  │
│   │  │ ████████████████████████████████████████████ │   │ │                                 │  │
│   │  │ ████████████████████████████████████████████ │   │ │  ██████████████████████████    │  │
│   │  └──────────────────────────────────────────────┘   │ │                                 │  │
│   │                                                      │ │  ████████████████              │  │
│   │  ┌──────────────────────────────────────────────┐   │ │                                 │  │
│   │  │ ████████████████████████████████████████████ │   │ └─────────────────────────────────┘  │
│   │  │ ████████████████████████████████████████████ │   │                                      │
│   │  └──────────────────────────────────────────────┘   │                                      │
│   │                                                      │                                      │
│   └─────────────────────────────────────────────────────┘                                      │
│                                                                                                  │
│   ERROR STATE                                                                                   │
│   ═══════════                                                                                   │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │                                       ⚠️                                                 │  │
│   │                                                                                          │  │
│   │                          Something went wrong                                            │  │
│   │                                                                                          │  │
│   │                  We couldn't load your dashboard data.                                   │  │
│   │                                                                                          │  │
│   │                           [Try Again]                                                    │  │
│   │                                                                                          │  │
│   │                    ─────────────────────────                                             │  │
│   │                                                                                          │  │
│   │                  If this persists, contact support                                       │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
│   PARTIAL ERROR (One section fails)                                                             │
│   ═════════════════════════════════                                                             │
│                                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                          │  │
│   │   ✅ Recent Submissions                                                                  │  │
│   │   ─────────────────────────────────────────────────────────────────────────────────────  │  │
│   │                                                                                          │  │
│   │   ⚠️ Failed to load submissions                                 [Retry]                 │  │
│   │                                                                                          │  │
│   └─────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Implementation

```typescript
// app/(dashboard)/dashboard/page.tsx

import { Suspense } from 'react';
import { EntityHeader } from '@/components/dashboard/entity-header';
import { AttentionRequired } from '@/components/dashboard/attention-required';
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines';
import { RecentSubmissions } from '@/components/dashboard/recent-submissions';
import { ComplianceScore } from '@/components/dashboard/compliance-score';
import { HMRCConnections } from '@/components/dashboard/hmrc-connections';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Zone A: Entity Header */}
      <EntityHeader />

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">

        {/* Zone B: Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-6">

          {/* B1: Attention Required */}
          <ErrorBoundary fallback={<AttentionRequiredError />}>
            <Suspense fallback={<AttentionRequiredSkeleton />}>
              <AttentionRequired />
            </Suspense>
          </ErrorBoundary>

          {/* B2: Upcoming Deadlines */}
          <ErrorBoundary fallback={<DeadlinesError />}>
            <Suspense fallback={<DeadlinesSkeleton />}>
              <UpcomingDeadlines />
            </Suspense>
          </ErrorBoundary>

          {/* B3: Recent Submissions */}
          <ErrorBoundary fallback={<SubmissionsError />}>
            <Suspense fallback={<SubmissionsSkeleton />}>
              <RecentSubmissions />
            </Suspense>
          </ErrorBoundary>

        </div>

        {/* Zone C: Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">

          {/* C1: Compliance Score */}
          <ComplianceScore />

          {/* C2: HMRC Connections */}
          <HMRCConnections />

          {/* C3: Quick Actions */}
          <QuickActions />

          {/* C4: Helpful Links */}
          <HelpfulLinks />

        </div>

      </div>
    </div>
  );
}
```

---

## Accessibility Requirements

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ACCESSIBILITY CHECKLIST                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   KEYBOARD NAVIGATION                                                                           │
│   ═══════════════════                                                                           │
│                                                                                                  │
│   ✓ All interactive elements focusable via Tab                                                  │
│   ✓ Entity dropdown navigable with arrow keys                                                   │
│   ✓ Card actions have visible focus states                                                      │
│   ✓ Escape closes dropdowns and modals                                                          │
│                                                                                                  │
│   SCREEN READER                                                                                 │
│   ═════════════                                                                                 │
│                                                                                                  │
│   ✓ Proper heading hierarchy (h1 > h2 > h3)                                                     │
│   ✓ ARIA labels for icon-only buttons                                                          │
│   ✓ Live regions for status updates                                                            │
│   ✓ Descriptive link text (not "click here")                                                   │
│                                                                                                  │
│   COLOR CONTRAST                                                                                │
│   ══════════════                                                                                │
│                                                                                                  │
│   ✓ Text meets WCAG AA (4.5:1 for normal, 3:1 for large)                                       │
│   ✓ Status colors have text labels (not color-only)                                            │
│   ✓ Focus states visible in all color modes                                                    │
│                                                                                                  │
│   ARIA LABELS                                                                                   │
│   ═══════════                                                                                   │
│                                                                                                  │
│   Compliance Score:  aria-label="Compliance score 94 percent, excellent"                        │
│   Deadline Card:     aria-label="VAT Q3 2024, due in 3 days"                                   │
│   Status Badge:      aria-label="Status: Accepted"                                              │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Considerations

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              PERFORMANCE OPTIMIZATIONS                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│   DATA FETCHING                                                                                 │
│   ═════════════                                                                                 │
│                                                                                                  │
│   1. Single API call for dashboard data (aggregated endpoint)                                   │
│   2. React Query caching (5-minute stale time)                                                  │
│   3. Optimistic updates after submissions                                                       │
│   4. Prefetch on entity selector hover                                                          │
│                                                                                                  │
│   RENDERING                                                                                     │
│   ═════════                                                                                     │
│                                                                                                  │
│   1. Server Components for static sections                                                      │
│   2. Suspense boundaries for independent loading                                                │
│   3. Virtualized lists for large datasets (if needed)                                           │
│   4. Memoized components for expensive renders                                                  │
│                                                                                                  │
│   BUNDLE SIZE                                                                                   │
│   ═══════════                                                                                   │
│                                                                                                  │
│   1. Dynamic imports for heavy components (charts)                                              │
│   2. Tree-shaking for UI component library                                                      │
│   3. Route-based code splitting                                                                 │
│                                                                                                  │
│   TARGET METRICS                                                                                │
│   ══════════════                                                                                │
│                                                                                                  │
│   • Time to First Byte: < 200ms                                                                │
│   • Largest Contentful Paint: < 2.5s                                                           │
│   • First Input Delay: < 100ms                                                                 │
│   • Cumulative Layout Shift: < 0.1                                                             │
│                                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

*Dashboard Design Map created: 2026-02-01*
*Path Builder: Complete specification for TaxSorted.io Dashboard*
