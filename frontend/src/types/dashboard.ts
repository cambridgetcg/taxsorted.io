// Entity Types
export type EntityType =
  | "private-limited-company"
  | "public-limited-company"
  | "llp"
  | "general-partnership"
  | "individual-self-employed"
  | "individual-employed"
  | "cic"
  | "charitable-company"
  | "cio"
  | "discretionary-trust"
  | "cooperative-society";

export interface EntityIdentifiers {
  crn?: string; // Company Registration Number
  utr?: string; // Unique Taxpayer Reference
  vrn?: string; // VAT Registration Number
  charityNumber?: string;
  payeRef?: string;
}

export interface EntityAttributes {
  vatRegistered: boolean;
  hasEmployees: boolean;
  accountingPeriodEnd?: string;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  identifiers: EntityIdentifiers;
  attributes: EntityAttributes;
}

// Filing Types
export type FilingType =
  | "vat-return"
  | "ct600"
  | "paye-fps"
  | "paye-eps"
  | "sa100"
  | "sa800"
  | "confirmation-statement"
  | "annual-accounts";

export type ObligationStatus =
  | "future"
  | "open"
  | "draft"
  | "ready"
  | "submitted"
  | "fulfilled"
  | "overdue";

export type UrgencyLevel = "overdue" | "critical" | "warning";

export interface AttentionFiling {
  id: string;
  filingType: FilingType;
  displayName: string;
  periodDescription: string;
  dueDate: string;
  status: ObligationStatus;
  urgency: UrgencyLevel;
  daysRemaining: number;
  amount?: number;
  amountLabel?: string;
  penaltyInfo?: string;
}

export interface Deadline {
  id: string;
  filingType: FilingType;
  displayName: string;
  description: string;
  dueDate: string;
  dayOfMonth: number;
  monthAbbrev: string;
  daysRemaining: number;
  status: ObligationStatus;
  urgencyIndicator: "critical" | "warning" | "normal";
  amount?: number;
  actionLabel: string;
  actionHref: string;
}

export interface DeadlineGroup {
  monthYear: string;
  deadlines: Deadline[];
}

// Submission Types
export type SubmissionStatus =
  | "submitted"
  | "processing"
  | "accepted"
  | "rejected";

export interface Submission {
  id: string;
  filingType: FilingType;
  displayName: string;
  periodDescription: string;
  submittedAt: string;
  status: SubmissionStatus;
  hmrcReference?: string;
  amount?: number;
}

// Compliance Types
export interface ComplianceData {
  score: number | null;
  onTimeCount: number;
  totalCount: number;
  overdueCount: number;
  period: "year" | "all-time";
}

export type ScoreLevel = "excellent" | "good" | "needs-improvement" | "no-data";

// Connection Types
export type ConnectionType = "vat-mtd" | "paye-rti" | "ct" | "sa";

export type ConnectionStatus =
  | "connected"
  | "not-connected"
  | "expiring"
  | "expired";

export interface HMRCConnection {
  type: ConnectionType;
  displayName: string;
  status: ConnectionStatus;
  identifier?: string;
  expiresAt?: string;
  daysUntilExpiry?: number;
}

// Quick Action Types
export interface QuickAction {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  priority: number;
}

// Dashboard Data
export interface DashboardData {
  entity: Entity;
  attentionFilings: AttentionFiling[];
  upcomingDeadlines: DeadlineGroup[];
  recentSubmissions: Submission[];
  complianceScore: ComplianceData;
  connections: HMRCConnection[];
  quickActions: QuickAction[];
}

export interface DashboardResponse {
  data: DashboardData;
  meta: {
    fetchedAt: string;
    entityId: string;
  };
}

// Entity Icon Mapping
export const ENTITY_ICONS: Record<EntityType, string> = {
  "private-limited-company": "🏢",
  "public-limited-company": "🏛️",
  llp: "🤝",
  "general-partnership": "👥",
  "individual-self-employed": "👤",
  "individual-employed": "👤",
  cic: "🌍",
  "charitable-company": "💝",
  cio: "💝",
  "discretionary-trust": "🏦",
  "cooperative-society": "👥",
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  "private-limited-company": "Private Limited Company",
  "public-limited-company": "Public Limited Company",
  llp: "Limited Liability Partnership",
  "general-partnership": "General Partnership",
  "individual-self-employed": "Self-Employed Individual",
  "individual-employed": "Employed Individual",
  cic: "Community Interest Company",
  "charitable-company": "Charitable Company",
  cio: "Charitable Incorporated Organisation",
  "discretionary-trust": "Discretionary Trust",
  "cooperative-society": "Co-operative Society",
};
