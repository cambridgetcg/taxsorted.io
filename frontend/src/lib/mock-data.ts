import type {
  Entity,
  AttentionFiling,
  DeadlineGroup,
  Submission,
  ComplianceData,
  HMRCConnection,
  QuickAction,
  DashboardData,
} from "@/types/dashboard";

export const mockEntity: Entity = {
  id: "ent_001",
  name: "ABC Limited",
  type: "private-limited-company",
  identifiers: {
    crn: "12345678",
    utr: "1234567890",
    vrn: "123456789",
  },
  attributes: {
    vatRegistered: true,
    hasEmployees: true,
    accountingPeriodEnd: "2025-03-31",
  },
};

export const mockEntities: Entity[] = [
  mockEntity,
  {
    id: "ent_002",
    name: "XYZ Consulting LLP",
    type: "llp",
    identifiers: {
      crn: "OC123456",
      utr: "9876543210",
    },
    attributes: {
      vatRegistered: false,
      hasEmployees: false,
    },
  },
  {
    id: "ent_003",
    name: "John Smith",
    type: "individual-self-employed",
    identifiers: {
      utr: "5555555555",
    },
    attributes: {
      vatRegistered: false,
      hasEmployees: false,
    },
  },
];

export const mockAttentionFilings: AttentionFiling[] = [
  {
    id: "fil_001",
    filingType: "vat-return",
    displayName: "VAT Q3 2024",
    periodDescription: "Oct - Dec 2024",
    dueDate: "2025-02-07",
    status: "ready",
    urgency: "critical",
    daysRemaining: 3,
    amount: 9250,
    amountLabel: "Net VAT payable",
  },
  {
    id: "fil_002",
    filingType: "paye-eps",
    displayName: "PAYE EPS January",
    periodDescription: "January 2025",
    dueDate: "2025-02-19",
    status: "open",
    urgency: "warning",
    daysRemaining: 15,
  },
  {
    id: "fil_003",
    filingType: "confirmation-statement",
    displayName: "Confirmation Statement",
    periodDescription: "Review period: December 2024",
    dueDate: "2025-01-14",
    status: "overdue",
    urgency: "overdue",
    daysRemaining: -20,
    penaltyInfo: "£150 penalty may apply",
  },
];

export const mockUpcomingDeadlines: DeadlineGroup[] = [
  {
    monthYear: "FEBRUARY 2025",
    deadlines: [
      {
        id: "dl_001",
        filingType: "vat-return",
        displayName: "VAT Q3 2024",
        description: "Quarterly VAT Return",
        dueDate: "2025-02-07",
        dayOfMonth: 7,
        monthAbbrev: "FEB",
        daysRemaining: 3,
        status: "ready",
        urgencyIndicator: "critical",
        amount: 9250,
        actionLabel: "Submit",
        actionHref: "/filings/fil_001/submit",
      },
      {
        id: "dl_002",
        filingType: "paye-eps",
        displayName: "PAYE EPS January",
        description: "Monthly Employer Summary",
        dueDate: "2025-02-19",
        dayOfMonth: 19,
        monthAbbrev: "FEB",
        daysRemaining: 15,
        status: "open",
        urgencyIndicator: "warning",
        actionLabel: "Start",
        actionHref: "/filings/fil_002/prepare",
      },
    ],
  },
  {
    monthYear: "MARCH 2025",
    deadlines: [
      {
        id: "dl_003",
        filingType: "ct600",
        displayName: "CT600 Corporation Tax",
        description: "Year ending Mar 2024",
        dueDate: "2025-03-31",
        dayOfMonth: 31,
        monthAbbrev: "MAR",
        daysRemaining: 55,
        status: "draft",
        urgencyIndicator: "normal",
        actionLabel: "Edit",
        actionHref: "/filings/fil_004/prepare",
      },
    ],
  },
  {
    monthYear: "MAY 2025",
    deadlines: [
      {
        id: "dl_004",
        filingType: "vat-return",
        displayName: "VAT Q4 2024-25",
        description: "Quarterly VAT Return",
        dueDate: "2025-05-07",
        dayOfMonth: 7,
        monthAbbrev: "MAY",
        daysRemaining: 92,
        status: "future",
        urgencyIndicator: "normal",
        actionLabel: "",
        actionHref: "",
      },
    ],
  },
];

export const mockSubmissions: Submission[] = [
  {
    id: "sub_001",
    filingType: "vat-return",
    displayName: "VAT Q2 2024",
    periodDescription: "Jul-Sep 2024",
    submittedAt: "2024-11-07T14:32:00Z",
    status: "accepted",
    hmrcReference: "XQ123456789012",
    amount: 8450,
  },
  {
    id: "sub_002",
    filingType: "paye-fps",
    displayName: "PAYE FPS Jan",
    periodDescription: "January 2025",
    submittedAt: "2025-01-31T09:15:00Z",
    status: "accepted",
    hmrcReference: "RTI-2025-01-001",
  },
  {
    id: "sub_003",
    filingType: "paye-eps",
    displayName: "PAYE EPS Dec",
    periodDescription: "December 2024",
    submittedAt: "2025-01-19T11:45:00Z",
    status: "accepted",
    hmrcReference: "RTI-2024-12-EPS",
  },
  {
    id: "sub_004",
    filingType: "vat-return",
    displayName: "VAT Q1 2024",
    periodDescription: "Apr-Jun 2024",
    submittedAt: "2024-08-07T16:20:00Z",
    status: "accepted",
    hmrcReference: "XQ987654321098",
    amount: 7200,
  },
];

export const mockComplianceScore: ComplianceData = {
  score: 94,
  onTimeCount: 17,
  totalCount: 18,
  overdueCount: 1,
  period: "year",
};

export const mockConnections: HMRCConnection[] = [
  {
    type: "vat-mtd",
    displayName: "VAT MTD",
    status: "connected",
    identifier: "123 456 789",
  },
  {
    type: "paye-rti",
    displayName: "PAYE RTI",
    status: "connected",
    identifier: "123/AB12345",
  },
];

export const mockQuickActions: QuickAction[] = [
  {
    id: "qa_001",
    icon: "send",
    title: "Submit VAT Return",
    subtitle: "VAT Q3 2024 ready to submit",
    href: "/filings/fil_001/submit",
    priority: 1,
  },
  {
    id: "qa_002",
    icon: "bar-chart-3",
    title: "Export CT600 Data",
    subtitle: "For portal submission",
    href: "/filings/fil_004/export",
    priority: 2,
  },
  {
    id: "qa_003",
    icon: "plus",
    title: "Add PAYE Submission",
    subtitle: "Record January FPS",
    href: "/filings/new?type=paye-fps",
    priority: 3,
  },
];

export const mockDashboardData: DashboardData = {
  entity: mockEntity,
  attentionFilings: mockAttentionFilings,
  upcomingDeadlines: mockUpcomingDeadlines,
  recentSubmissions: mockSubmissions,
  complianceScore: mockComplianceScore,
  connections: mockConnections,
  quickActions: mockQuickActions,
};
