import { apiBase } from "@/lib/api";

export type HouseName = "Commons" | "Lords";

export interface PoliticsSource {
  name: string;
  url: string;
  retrievedAt: string;
  attribution?: string;
  licence?: { name: string; url: string };
}

export interface PoliticsParty {
  id: number;
  name: string;
  abbreviation: string | null;
  colour: string | null;
}

export interface PersonSummary {
  id: number;
  name: string;
  fullTitle: string | null;
  house: HouseName;
  party: PoliticsParty | null;
  seat: { id: number; name: string } | null;
  membershipStartDate: string | null;
  profileUrl: string;
}

export interface PeopleResponse {
  people: PersonSummary[];
  total: number;
  skip: number;
  take: number;
  source: PoliticsSource;
}

export interface PublicContact {
  type: string;
  address: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
}

export interface BiographyEntry {
  id: number;
  name: string;
  house?: HouseName | null;
  startDate: string | null;
  endDate: string | null;
  additionalInfo: string | null;
  url: string | null;
}

export interface PersonBiography {
  representations: BiographyEntry[];
  electionsContested: BiographyEntry[];
  houseMemberships: BiographyEntry[];
  partyAffiliations: BiographyEntry[];
}

export type PublicRole = BiographyEntry;

export interface PersonRoles {
  government: PublicRole[];
  opposition: PublicRole[];
  other: PublicRole[];
  committees: PublicRole[];
}

export interface DeclaredInterest {
  id: number;
  parentId: number | null;
  category: { id: number; name: string };
  text: string;
  updatedAt: string | null;
  sourceUrl: string;
}

export interface PublicStaffMember {
  name: string;
  title: string | null;
  details: string | null;
}

export interface ActivityItem {
  title: string;
  date: string | null;
  house: string | null;
  section: string | null;
  totalContributions: number;
  speechCount: number;
  questionCount: number;
  supplementaryQuestionCount: number;
  interventionCount: number;
  answerCount: number;
  pointsOfOrderCount: number;
  statementsCount: number;
  url: string | null;
}

export interface ElectionResult {
  title: string | null;
  date: string | null;
  result: string | null;
  constituency: string | null;
  electorate: number | null;
  turnout: number | null;
  majority: number | null;
  isGeneralElection: boolean;
  candidates: Array<{
    name: string;
    party: PoliticsParty | null;
    votes: number | null;
    voteShare: number | null;
    rank: number | null;
  }>;
}

export interface PersonDetailResponse {
  person: PersonSummary;
  contacts: PublicContact[];
  biography: PersonBiography;
  roles: PersonRoles;
  formalPower: {
    basis: "office-not-person";
    methodPath: string;
    assessmentIds: string[];
    unassessedCurrentRoles: string[];
    combinationRule: string;
    gap: string | null;
  };
  interests: DeclaredInterest[];
  staff: PublicStaffMember[];
  activity: ActivityItem[];
  election: ElectionResult | null;
  privacy: {
    professionalContactsOnly: boolean;
    residentialContactsExcluded: boolean;
    interestDonorAndAddressLinesExcluded: boolean;
    interestDestinationAndFamilyLinesExcluded: boolean;
    interestFamilyCategoriesExcluded: boolean;
  };
  source: PoliticsSource;
}

export interface Donation {
  reference: string;
  recipient: string;
  recipientType: string | null;
  accountingUnit: string | null;
  amountPence: number;
  acceptedDate: string | null;
  receivedDate: string | null;
  reportedDate: string | null;
  donorName: string;
  donorType: string | null;
  companyNumber: string | null;
  donationType: string | null;
  nature: string | null;
  reportingPeriod: string | null;
  register: string | null;
}

export interface DonationsResponse {
  donations: Donation[];
  total: number;
  skip: number;
  take: number;
  source: PoliticsSource;
}

export interface PoliticsSystemSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: "legislation" | "official-guidance" | "official-data" | "official-explanation";
  retrievedAt: string;
  supports: string;
}

export interface PoliticsSystemScope {
  jurisdiction: string;
  release: string;
  lawAsAt: string;
  included: string[];
  notYetComplete: string[];
  rule: string;
}

export interface PoliticsSourceUsePolicy {
  rule: string;
  curatedFacts: string;
  dataFamilies: Array<{
    id: string;
    status: string;
    reuse: string;
    termsUrl: string;
  }>;
}

export interface ElectionActor {
  id: string;
  name: string;
  kind: string;
  chosenBy: string;
  responsibleFor: string[];
  notResponsibleFor: string[];
  sourceIds: string[];
}

export interface ElectionContactRoute {
  actorIds: string[];
  label: string;
  url: string;
  contactType: string;
  note: string;
}

export interface ElectionProcessStage {
  order: number;
  id: string;
  title: string;
  summary: string;
  responsibleActorIds: string[];
  publicRecords: string[];
  sourceIds: string[];
}

export interface CampaignFinanceRule {
  id: string;
  lane: string;
  responsibleActorId: string;
  currentRuleSnapshot: {
    asAt: string;
    election: string;
    limit: string;
    reporting: string;
    enforcement: string;
  };
  sourceIds: string[];
}

export interface RelationshipEvidenceLane {
  id: string;
  label: string;
  proves: string;
  doesNotProve: string;
  joinRule: string;
  sourceIds: string[];
  apiStatus: string;
}

export interface BudgetAccountability {
  principle: string;
  currentAggregateSnapshot: {
    period: string;
    status: string;
    currency: string;
    nominal: boolean;
    figures: Array<{ category: string; amountGbp: number }>;
    warning: string;
    sourceIds: string[];
  };
  lanes: Array<{
    id: string;
    name: string;
    answer: string;
    sourceIds: string[];
  }>;
}

export interface PublicPoliticalFunding {
  principle: string;
  amountKinds: string[];
  schemes: Array<{
    id: string;
    name: string;
    recipient: string;
    currentSnapshot: {
      asAt: string;
      annualPoolGbp: number | null;
      amountKind: string;
    };
    purpose: string;
    sourceIds: string[];
  }>;
}

export interface PoliticsHistoryCoverage {
  model: string;
  availableNow: Array<{
    record: string;
    coverage: string;
    endpoint: string;
    limits: string;
  }>;
  licensedSourceMapped: Array<{
    record: string;
    coverage: string;
    ingestionStatus: string;
    sourceIds: string[];
  }>;
  privacy: string;
}

export interface LegislativeWatchItem {
  id: string;
  title: string;
  statusAt: string;
  lawStatus: string;
  nextKnownStage: string;
  rule: string;
  sourceIds: string[];
}

export interface EnforcementSnapshot {
  asAt: string;
  electoralCommission: {
    remit: string;
    civilFineRangeGbp: { minimum: number; maximumPerOffence: number };
    candidateBoundary: string;
    sourceIds: string[];
  };
  caseStateRule: string;
}

export type PowerDimensionId =
  | "executive"
  | "legislative"
  | "oversight"
  | "enforcement"
  | "budget"
  | "appointments";

export interface FormalPowerMethod {
  schema: string;
  version: string;
  name: string;
  warning: string;
  dimensions: Array<{ id: PowerDimensionId; label: string; meaning: string }>;
  rubric: Array<{ score: number; meaning: string }>;
  calculation: string;
  bands: Array<{ raw: string; label: string }>;
  comparisonRules: string[];
  depthPolicy: Array<{ dimensionScore: string; coverage: string }>;
}

export interface OfficePowerDimension {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  exercise: string;
  basis: string[];
  reason: string;
  limits: string[];
  sourceIds: string[];
}

export interface OfficePowerAssessment {
  schema: string;
  assessmentId: string;
  methodVersion: string;
  officeId: string;
  officeName: string;
  officeFamily: string;
  jurisdiction: {
    level: string;
    territories: string[];
    competence: string;
    activeWhen?: string;
  };
  dimensions: Record<PowerDimensionId, OfficePowerDimension>;
  checks: Array<{ description: string; sourceIds: string[] }>;
  sourceIds: string[];
  calibrationStatus: string;
  calculation: { raw: number; maximum: number; display: number; band: string };
  researchDepth: { rule: string; deepDomains: PowerDimensionId[] };
  evidenceStatus: string;
  lawAsAt: string;
  reviewedAt: string;
}

export interface PoliticsSystemResponse {
  schema: string;
  updatedAt: string;
  scope: PoliticsSystemScope;
  sourceUsePolicy: PoliticsSourceUsePolicy;
  actors: ElectionActor[];
  electionContactRoutes: ElectionContactRoute[];
  electionProcess: ElectionProcessStage[];
  campaignFinanceRules: CampaignFinanceRule[];
  relationshipEvidenceLanes: RelationshipEvidenceLane[];
  budgetAccountability: BudgetAccountability;
  publicPoliticalFunding: PublicPoliticalFunding;
  historyCoverage: PoliticsHistoryCoverage;
  legislativeWatch: LegislativeWatchItem[];
  enforcementSnapshot: EnforcementSnapshot;
  formalPower: {
    method: FormalPowerMethod;
    assessments: OfficePowerAssessment[];
  };
  enforcementPrinciples: string[];
  sources: PoliticsSystemSource[];
}

export class PoliticsApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public sourceUrl?: string,
  ) {
    super(message);
  }
}

function queryString(values: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const built = query.toString();
  return built ? `?${built}` : "";
}

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${apiBase()}/v1/politics/uk${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = body as {
        error?: string;
        message?: string;
        sourceUrl?: string;
        source?: { url?: string };
      };
      throw new PoliticsApiError(
        response.status,
        error.error ?? `http_${response.status}`,
        error.message ?? `The public record could not be loaded (${response.status}).`,
        error.sourceUrl ?? error.source?.url,
      );
    }
    return body as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const politicsApi = {
  system: () => get<PoliticsSystemResponse>("/system"),

  people: (input: {
    q?: string;
    house?: "commons" | "lords" | "all";
    partyId?: number;
    skip?: number;
    take?: number;
  }) => get<PeopleResponse>(`/people${queryString(input)}`),

  person: (id: number) => get<PersonDetailResponse>(`/people/${id}`),

  donations: (input: {
    from: string;
    to: string;
    recipient?: string;
    skip?: number;
    take?: number;
  }) => get<DonationsResponse>(`/funding/donations${queryString(input)}`),
};
