// Public UK politics data, kept deliberately separate from taxpayer sessions.
// Upstream data is narrowed at this boundary: professional contacts only,
// residential details removed, and every response names where it came from.

import type { Context } from "hono";
import { Hono } from "hono";
import { config } from "../config.js";
import {
  isPoliticsBulkPublicationApproval,
  type PoliticsBulkPublicationApproval,
} from "../uk-politics-datasets.js";
import { formalPowerReferencesForPerson } from "../uk-politics-system.js";
import { createUkPoliticsDatasetRoutes } from "./uk-politics-datasets.js";
import { createUkPublicOfficePathwayRoutes } from "./uk-public-office-pathways.js";
import { createUkPoliticsSystemRoutes } from "./uk-politics-system.js";
import { createUkPublicIntegrityRoutes } from "./uk-public-integrity.js";
import { problemDetails, type ProblemNextAction } from "../problem-details.js";

const MEMBERS_API = "https://members-api.parliament.uk";
const MEMBERS_DOCS = `${MEMBERS_API}/index.html`;
const MEMBERS_WEBSITE = "https://members.parliament.uk";
const EC_SEARCH = "https://search.electoralcommission.org.uk";
const EC_DONATIONS_SEARCH = `${EC_SEARCH}/Search/Donations`;
const OPL_URL =
  "https://www.parliament.uk/site-information/copyright/open-parliament-licence/";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DONATION_SPAN_DAYS = 92;
const MAX_CSV_BYTES = 15 * 1024 * 1024;

const ALWAYS_PUBLIC_SYSTEM_PATHS = [
  "/",
  "/datasets",
  "/datasets/schema",
  "/manifest",
  "/sources",
  "/system",
  "/elections/process",
  "/funding/rules",
  "/funding/public",
  "/power",
  "/budgets/accountability",
  "/relationships/method",
  "/relationships/schema",
  "/relationships/datasets",
  "/relationships/contracts",
  "/relationships/ministerial-benefits",
  "/enforcement/method",
  "/enforcement/forces",
  "/enforcement/institutions",
  "/enforcement/governance",
  "/enforcement/ranks",
  "/enforcement/pay-benefits",
  "/enforcement/workforce",
  "/enforcement/funding",
  "/enforcement/vacancies",
  "/enforcement/activities",
  "/enforcement/private-security",
  "/enforcement/power/method",
  "/enforcement/power/offices",
  "/enforcement/communication-method",
  "/integrity",
  "/integrity/sources",
  "/integrity/corrections",
  "/history/method",
  "/law/watch",
];

function politicsRelativePath(path: string): string {
  const marker = "/v1/politics/uk";
  const start = path.indexOf(marker);
  const relative = start >= 0 ? path.slice(start + marker.length) : path;
  if (relative.length > 1 && relative.endsWith("/")) return relative.slice(0, -1);
  return relative || "/";
}

function isPublicOfficePathwayRead(method: string, path: string) {
  if (method !== "GET" && method !== "HEAD") return false;
  const relative = politicsRelativePath(path);
  return (
    [
      "/public-office-pathways",
      "/public-office-pathways/offices",
      "/public-office-pathways/support",
      "/public-office-pathways/rights",
      "/public-office-pathways/schema",
    ].includes(relative) ||
    /^\/public-office-pathways\/offices\/[a-z0-9][a-z0-9-]*$/.test(relative)
  );
}

function isAlwaysPublicSystemPath(path: string, method: string): boolean {
  const relative = politicsRelativePath(path);
  return (
    ALWAYS_PUBLIC_SYSTEM_PATHS.includes(relative) ||
    relative.startsWith("/datasets/") ||
    isPublicOfficePathwayRead(method, path) ||
    relative.startsWith("/power/") ||
    relative.startsWith("/enforcement/institutions/") ||
    relative.startsWith("/enforcement/power/offices/") ||
    relative.startsWith("/enforcement/forces/")
  );
}

const BULK_STOP_EXEMPT_PATHS = new Set([
  "/",
  "/datasets",
  "/datasets/schema",
  "/datasets/rights",
  "/datasets/admissions",
  "/manifest",
  "/integrity/corrections",
]);

const BULK_STOP_INDEPENDENT_ROUTE_PREFIXES = [
  "/people",
  "/parties",
  "/roles",
  "/funding/donations",
  "/relationships/contracts",
  "/relationships/ministerial-benefits",
  "/enforcement/forces",
];

function isBulkStopExempt(path: string) {
  const relative = politicsRelativePath(path);
  return (
    BULK_STOP_EXEMPT_PATHS.has(relative) ||
    /^\/datasets\/[a-z0-9-]+\/schema$/.test(relative) ||
    BULK_STOP_INDEPENDENT_ROUTE_PREFIXES.some(
      (prefix) => relative === prefix || relative.startsWith(`${prefix}/`)
    )
  );
}

type HouseName = "Commons" | "Lords";

export type PoliticsSource = {
  name: string;
  url: string;
  retrievedAt: string;
  attribution?: string;
  licence?: { name: string; url: string };
};

export type PersonSummary = {
  id: number;
  name: string;
  fullTitle: string;
  house: HouseName;
  party: {
    id: number;
    name: string;
    abbreviation: string;
    colour: string | null;
  } | null;
  seat: { id: number; name: string } | null;
  membershipStartDate: string | null;
  profileUrl: string;
};

export type BiographyEntry = {
  id: number;
  name: string;
  house: HouseName | null;
  startDate: string | null;
  endDate: string | null;
  additionalInfo: string | null;
  url: string | null;
};

export type Donation = {
  reference: string;
  recipient: string;
  recipientType: string | null;
  amountPence: number;
  acceptedDate: string | null;
  donorName: string;
  donorType: string | null;
  companyNumber: string | null;
  donationType: string | null;
  nature: string | null;
  accountingUnit: string | null;
  receivedDate: string | null;
  reportedDate: string | null;
  reportingPeriod: string | null;
  register: string | null;
};

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type UkPoliticsOptions = {
  fetchImpl?: FetchLike;
  now?: () => Date;
  timeoutMs?: number;
  bulkDataEmergencyStop?: boolean;
  bulkDataEnabled?: boolean;
  bulkDataApproval?: PoliticsBulkPublicationApproval | null;
  electoralCommissionReuseConfirmed?: boolean;
  electoralFinanceReviewApproved?: boolean;
  publicDataEnabled?: boolean;
  ministerialBenefitsEnabled?: boolean;
  enforcementLeadersEnabled?: boolean;
  parliamentaryStaffEnabled?: boolean;
  parliamentaryInterestsEnabled?: boolean;
};

type UpstreamParty = {
  id?: number;
  name?: string;
  abbreviation?: string;
  backgroundColour?: string | null;
  foregroundColour?: string | null;
  governmentType?: number | null;
  isIndependentParty?: boolean;
};

type UpstreamMember = {
  id?: number;
  nameDisplayAs?: string;
  nameFullTitle?: string;
  latestParty?: UpstreamParty | null;
  latestHouseMembership?: {
    membershipFrom?: string;
    membershipFromId?: number;
    house?: number;
    membershipStartDate?: string | null;
    membershipEndDate?: string | null;
    membershipStatus?: { statusIsActive?: boolean } | null;
  } | null;
  thumbnailUrl?: string | null;
};

type Link = { href?: string | null };
type Item<T> = { value?: T; links?: Link[] };
type SearchResult<T> = {
  items?: Item<T>[];
  totalResults?: number;
  skip?: number;
  take?: number;
};

type UpstreamContact = {
  type?: string;
  typeDescription?: string | null;
  isWebAddress?: boolean;
  notes?: string | null;
  line1?: string | null;
  line2?: string | null;
  line3?: string | null;
  line4?: string | null;
  line5?: string | null;
  postcode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

type UpstreamBiographyEntry = {
  id?: number;
  name?: string;
  house?: number;
  startDate?: string | null;
  endDate?: string | null;
  additionalInfo?: string | null;
  additionalInfoLink?: string | null;
};

type UpstreamBiography = {
  representations?: UpstreamBiographyEntry[];
  electionsContested?: UpstreamBiographyEntry[];
  houseMemberships?: UpstreamBiographyEntry[];
  governmentPosts?: UpstreamBiographyEntry[];
  oppositionPosts?: UpstreamBiographyEntry[];
  otherPosts?: UpstreamBiographyEntry[];
  partyAffiliations?: UpstreamBiographyEntry[];
  committeeMemberships?: UpstreamBiographyEntry[];
};

type UpstreamInterest = {
  id?: number;
  interest?: string;
  createdWhen?: string | null;
  lastAmendedWhen?: string | null;
  childInterests?: UpstreamInterest[];
};

type UpstreamInterestCategory = {
  id?: number;
  name?: string;
  interests?: UpstreamInterest[];
};

type UpstreamStaff = {
  surname?: string;
  forename?: string;
  title?: string | null;
  details?: string | null;
};

type UpstreamContribution = {
  totalContributions?: number;
  debateTitle?: string;
  sittingDate?: string | null;
  section?: string | null;
  house?: string | null;
  speechCount?: number;
  questionCount?: number;
  supplementaryQuestionCount?: number;
  interventionCount?: number;
  answerCount?: number;
  pointsOfOrderCount?: number;
  statementsCount?: number;
};

type UpstreamElection = {
  result?: string | null;
  electorate?: number | null;
  turnout?: number | null;
  majority?: number | null;
  electionTitle?: string | null;
  electionDate?: string | null;
  isGeneralElection?: boolean;
  constituencyName?: string | null;
  candidates?: Array<{
    name?: string;
    party?: UpstreamParty | null;
    votes?: number | null;
    voteShare?: number | null;
    rankOrder?: number | null;
  }>;
};

type UpstreamPost = {
  id?: number;
  name?: string;
  hansardName?: string | null;
  postHolders?: Array<{
    member?: Item<UpstreamMember>;
    startDate?: string | null;
    endDate?: string | null;
    layingMinisterName?: string | null;
    isPaid?: boolean;
  }>;
  governmentDepartments?: Array<{ id?: number; name?: string; url?: string | null }>;
};

class UpstreamError extends Error {
  constructor(
    message: string,
    readonly reason: "timeout" | "unavailable" | "invalid",
    readonly upstreamStatus?: number
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

function parliamentSource(url: string, retrievedAt: string): PoliticsSource {
  return {
    name: "UK Parliament Members API",
    url,
    retrievedAt,
    attribution:
      "Contains Parliamentary information licensed under the Open Parliament Licence v3.0.",
    licence: { name: "Open Parliament Licence v3.0", url: OPL_URL },
  };
}

function commissionSource(url: string, retrievedAt: string): PoliticsSource {
  return { name: "Electoral Commission Political Finance Online", url, retrievedAt };
}

function cachedJson(c: Context, body: unknown, maxAge = 300, status = 200) {
  c.header("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 6}`);
  return c.json(body, status as 200);
}

function personalJson(c: Context, body: unknown) {
  // Named records must never survive a publication emergency stop in a shared
  // browser, CDN or intermediary cache.
  c.header("Cache-Control", "no-store");
  return c.json(body);
}

function errorJson(c: Context, body: unknown, status: 400 | 404 | 422 | 502 | 503 | 504) {
  const extensions =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const error =
    typeof extensions.error === "string" ? extensions.error : "request_failed";
  const detail =
    typeof extensions.message === "string"
      ? extensions.message
      : "The requested UK politics resource could not be served.";
  const suppliedActions = Array.isArray(extensions.nextActions)
    ? extensions.nextActions.filter(
        (action): action is ProblemNextAction =>
          typeof action === "object" && action !== null,
      )
    : [];
  return problemDetails(c, status, {
    error,
    detail,
    extensions,
    nextActions:
      suppliedActions.length > 0
        ? suppliedActions
        : [
            {
              method: "GET",
              href: "/v1/politics/uk",
              description:
                "Read the politics route map, publication state and public methods.",
            },
          ],
  });
}

function houseName(value: number | undefined): HouseName | null {
  if (value === 1) return "Commons";
  if (value === 2) return "Lords";
  return null;
}

function colour(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = value.trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(clean) ? `#${clean}` : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapParty(party: UpstreamParty | null | undefined) {
  if (!party || typeof party.id !== "number" || !party.name) return null;
  return {
    id: party.id,
    name: party.name,
    abbreviation: party.abbreviation ?? "",
    colour: colour(party.backgroundColour),
  };
}

function mapMember(member: UpstreamMember): PersonSummary {
  const house = houseName(member.latestHouseMembership?.house);
  if (typeof member.id !== "number" || !member.nameDisplayAs || !house) {
    throw new UpstreamError("The Members API returned an incomplete member record.", "invalid");
  }
  const membership = member.latestHouseMembership;
  const seat =
    typeof membership?.membershipFromId === "number" && membership.membershipFrom
      ? { id: membership.membershipFromId, name: membership.membershipFrom }
      : null;
  return {
    id: member.id,
    name: member.nameDisplayAs,
    fullTitle: member.nameFullTitle ?? member.nameDisplayAs,
    house,
    party: mapParty(member.latestParty),
    seat,
    membershipStartDate: textOrNull(membership?.membershipStartDate),
    profileUrl: `${MEMBERS_WEBSITE}/member/${member.id}`,
  };
}

function isExplicitlyCurrentMember(member: UpstreamMember): boolean {
  const membership = member.latestHouseMembership;
  return (
    Boolean(houseName(membership?.house)) &&
    membership?.membershipEndDate === null &&
    membership.membershipStatus?.statusIsActive === true
  );
}

function mapBiographyEntry(entry: UpstreamBiographyEntry): BiographyEntry | null {
  if (typeof entry.id !== "number" || !entry.name) return null;
  return {
    id: entry.id,
    name: entry.name,
    house: houseName(entry.house),
    startDate: textOrNull(entry.startDate),
    endDate: textOrNull(entry.endDate),
    additionalInfo: textOrNull(entry.additionalInfo),
    url: textOrNull(entry.additionalInfoLink),
  };
}

function mapBiographyEntries(entries: UpstreamBiographyEntry[] | undefined): BiographyEntry[] {
  return (entries ?? []).map(mapBiographyEntry).filter((entry): entry is BiographyEntry => Boolean(entry));
}

const UNSAFE_CONTACT =
  /\b(?:home address|private(?: address)?|residential(?: address)?|personal address|place of residence)\b/i;
const PROFESSIONAL_CONTACT =
  /\b(parliament|constituency|minister|government|party|official|office|website|twitter|facebook|instagram|linkedin|bluesky|youtube|mastodon|x \(formerly twitter\))\b/i;

function mapContact(contact: UpstreamContact) {
  const type = textOrNull(contact.type);
  if (!type) return null;
  const allText = [
    contact.type,
    contact.typeDescription,
    contact.notes,
    contact.line1,
    contact.line2,
    contact.line3,
    contact.line4,
    contact.line5,
  ]
    .filter(Boolean)
    .join(" ");
  if (
    UNSAFE_CONTACT.test(allText) ||
    /^(?:home|residence)$/i.test(type) ||
    !PROFESSIONAL_CONTACT.test(type)
  ) {
    return null;
  }

  const lines = [contact.line1, contact.line2, contact.line3, contact.line4, contact.line5]
    .map(textOrNull)
    .filter((line): line is string => Boolean(line));
  const webFromLine = contact.isWebAddress ? lines[0] ?? null : null;
  const website = textOrNull(contact.website) ?? webFromLine;
  const address = contact.isWebAddress
    ? []
    : [...lines, textOrNull(contact.postcode)].filter((line): line is string => Boolean(line));
  const mapped = {
    type,
    address,
    phone: textOrNull(contact.phone),
    email: textOrNull(contact.email),
    website,
    notes: textOrNull(contact.notes),
  };
  return mapped.address.length || mapped.phone || mapped.email || mapped.website || mapped.notes
    ? mapped
    : null;
}

const INTEREST_PRIVATE_LINE =
  /^(?:name of donor|donor(?:'s)? (?:name|address)|donor|address of donor|payer|address|property address|location|destination(?: of visit)?|family(?: member)?(?: name)?|name|relationship(?: to (?:the )?member)?)\s*:/i;
const UK_POSTCODE = /\b(?:GIR ?0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})\b/i;

export function sanitiseInterestText(value: string): string {
  const kept = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (INTEREST_PRIVATE_LINE.test(line)) return false;
      if (UNSAFE_CONTACT.test(line)) return false;
      if (UK_POSTCODE.test(line)) return false;
      return true;
    });
  return kept.join("\n") || "Details omitted by the privacy filter.";
}

function flattenInterests(
  categories: UpstreamInterestCategory[],
  memberId: number
): Array<{
  category: { id: number; name: string };
  id: number;
  parentId: number | null;
  text: string;
  updatedAt: string | null;
  sourceUrl: string;
}> {
  const result: Array<{
    category: { id: number; name: string };
    id: number;
    parentId: number | null;
    text: string;
    updatedAt: string | null;
    sourceUrl: string;
  }> = [];
  const sourceUrl = `${MEMBERS_WEBSITE}/member/${memberId}/registeredinterests`;

  for (const category of categories) {
    if (typeof category.id !== "number" || !category.name) continue;
    // Family categories remain identifying even after name/relationship lines
    // are stripped: a relative's role, employer, or client can identify them
    // by inference. Omit the whole category when Parliament labels it as such.
    if (/\b(?:family members?|spouses?|civil partners?)\b/i.test(category.name)) continue;
    const visit = (interest: UpstreamInterest, parentId: number | null) => {
      if (typeof interest.id !== "number" || typeof interest.interest !== "string") return;
      result.push({
        category: { id: category.id!, name: category.name! },
        id: interest.id,
        parentId,
        text: sanitiseInterestText(interest.interest),
        updatedAt: textOrNull(interest.lastAmendedWhen) ?? textOrNull(interest.createdWhen),
        sourceUrl,
      });
      for (const child of interest.childInterests ?? []) visit(child, interest.id!);
    };
    for (const interest of category.interests ?? []) visit(interest, null);
  }
  return result;
}

function absoluteParliamentUrl(value: string | null | undefined): string | null {
  const href = textOrNull(value);
  if (!href) return null;
  if (/^https:\/\//i.test(href)) return href;
  return new URL(href, MEMBERS_API).toString();
}

function strictInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number | null {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function parseIsoDate(value: string | undefined): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const time = Date.UTC(year!, month! - 1, day!);
  const date = new Date(time);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month! - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return time;
}

function ukDateToIso(value: string | undefined): string | null {
  const text = textOrNull(value);
  if (!text) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i]!;
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new UpstreamError("The Electoral Commission CSV was incomplete.", "invalid");
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (rows[0]?.[0]?.charCodeAt(0) === 0xfeff) rows[0]![0] = rows[0]![0]!.slice(1);
  return rows;
}

function amountToPence(value: string | undefined): number | null {
  if (!value) return null;
  const amount = Number(value.replace(/[£,\s]/g, ""));
  const pence = Math.round(amount * 100);
  return Number.isFinite(amount) && amount >= 0 && Number.isSafeInteger(pence) ? pence : null;
}

function companyNumberOrNull(value: string | undefined, donorType: string | null): string | null {
  if (!donorType || !/company/i.test(donorType)) return null;
  const normalized = textOrNull(value)?.replace(/\s+/g, "").toUpperCase() ?? null;
  return normalized && /^[A-Z0-9]{8}$/.test(normalized) ? normalized : null;
}

function donationsFromCsv(csv: string): Donation[] {
  const [headers, ...rows] = parseCsv(csv);
  if (!headers) throw new UpstreamError("The Electoral Commission CSV had no header.", "invalid");
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const required = ["ECRef", "RegulatedEntityName", "Value", "DonorName"];
  if (required.some((header) => !indexes.has(header))) {
    throw new UpstreamError("The Electoral Commission CSV shape changed.", "invalid");
  }
  const read = (row: string[], header: string) => row[indexes.get(header) ?? -1];

  return rows.flatMap((row) => {
    if (!row.some((field) => field.trim())) return [];
    const amountPence = amountToPence(read(row, "Value"));
    const reference = textOrNull(read(row, "ECRef"));
    const recipient = textOrNull(read(row, "RegulatedEntityName"));
    const donorName = textOrNull(read(row, "DonorName"));
    const donorType = textOrNull(read(row, "DonorStatus"));
    const companyNumber = companyNumberOrNull(
      read(row, "CompanyRegistrationNumber"),
      donorType
    );
    // The first republished projection is company-only. The upstream bulk CSV
    // can contain individual political donors; those rows are discarded here
    // and never become API records.
    if (
      amountPence === null ||
      !reference ||
      !recipient ||
      !donorName ||
      !companyNumber
    ) {
      return [];
    }
    return [
      {
        reference,
        recipient,
        recipientType: textOrNull(read(row, "RegulatedEntityType")),
        amountPence,
        acceptedDate: ukDateToIso(read(row, "AcceptedDate")),
        donorName,
        donorType,
        companyNumber,
        donationType: textOrNull(read(row, "DonationType")),
        nature: textOrNull(read(row, "NatureOfDonation")),
        accountingUnit: textOrNull(read(row, "AccountingUnitName")),
        receivedDate: ukDateToIso(read(row, "ReceivedDate")),
        reportedDate: ukDateToIso(read(row, "ReportedDate")),
        reportingPeriod: textOrNull(read(row, "ReportingPeriodName")),
        register: textOrNull(read(row, "RegisterName")),
      },
    ];
  });
}

function donationCsvUrl(from: string, to: string, recipient: string | undefined): URL {
  const url = new URL("/api/csv/Donations", EC_SEARCH);
  // This official route returns the full export regardless of start/rows.
  // Pagination happens only after the complete bounded-date CSV is parsed.
  url.searchParams.set("query", recipient ?? "");
  url.searchParams.set("sort", "AcceptedDate");
  url.searchParams.set("order", "desc");
  url.searchParams.set("et", "pp");
  url.searchParams.set("date", "Accepted");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("prePoll", "false");
  url.searchParams.set("postPoll", "true");
  url.searchParams.append("register", "gb");
  url.searchParams.append("register", "ni");
  url.searchParams.set("isIrishSourceYes", "true");
  url.searchParams.set("isIrishSourceNo", "true");
  url.searchParams.set("includeOutsideSection75", "true");
  return url;
}

export function createUkPoliticsRoutes(options: UkPoliticsOptions = {}) {
  const routes = new Hono();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? 8_000;
  const bulkDataEmergencyStop =
    options.bulkDataEmergencyStop ?? config.politics.bulkDataEmergencyStop;
  const bulkDataEnabled = options.bulkDataEnabled ?? config.politics.bulkDataEnabled;
  const bulkDataApprovalCandidate =
    options.bulkDataApproval === undefined
      ? config.politics.bulkDataApproval
      : options.bulkDataApproval;
  const bulkDataApproval = isPoliticsBulkPublicationApproval(
    bulkDataApprovalCandidate
  )
    ? bulkDataApprovalCandidate
    : null;
  const bulkDataAvailable =
    bulkDataEnabled &&
    !bulkDataEmergencyStop &&
    (!config.isProd || bulkDataApproval !== null);
  const ecReuseConfirmed =
    options.electoralCommissionReuseConfirmed ??
    config.politics.electoralCommissionReuseConfirmed;
  const electoralFinanceReviewApproved =
    options.electoralFinanceReviewApproved ??
    config.politics.electoralFinanceReviewApproved;
  const publicDataEnabled = options.publicDataEnabled ?? config.politics.publicDataEnabled;
  const ministerialBenefitsEnabled =
    options.ministerialBenefitsEnabled ?? config.politics.ministerialBenefitsEnabled;
  const enforcementLeadersEnabled =
    options.enforcementLeadersEnabled ?? config.politics.enforcementLeadersEnabled;
  const parliamentaryStaffEnabled =
    publicDataEnabled &&
    (options.parliamentaryStaffEnabled ?? config.politics.parliamentaryStaffEnabled);
  const parliamentaryInterestsEnabled =
    publicDataEnabled &&
    (options.parliamentaryInterestsEnabled ?? config.politics.parliamentaryInterestsEnabled);

  // A misclassified static projection needs one containment switch across
  // both the distribution API and the older static reading routes.
  routes.use("*", async (c, next) => {
    if (
      !bulkDataAvailable &&
      c.req.method !== "OPTIONS" &&
      !isBulkStopExempt(c.req.path) &&
      !(
        !bulkDataEmergencyStop &&
        isPublicOfficePathwayRead(c.req.method, c.req.path)
      )
    ) {
      return errorJson(
        c,
        {
          error: bulkDataEmergencyStop
            ? "bulk_data_emergency_stop"
            : bulkDataApproval
              ? "bulk_data_publication_disabled"
              : "bulk_data_publication_review_needed",
          message:
            bulkDataEmergencyStop
              ? "Static UK politics record bodies are temporarily stopped for safety review. Discovery, the catalogue, admission ledger, rights statement, bulk dataset schemas and correction method remain readable."
              : bulkDataApproval
                ? "The admission ledger is approved, but hosted bulk publication is disabled. Discovery, the catalogue, admission ledger, rights statement, bulk dataset schemas and correction method remain readable."
                : "Static UK politics record bodies are closed until a human approves the public-distribution review and a confidential safety-reporting route exists. Discovery, the catalogue, admission ledger, rights statement, bulk dataset schemas and correction method remain readable.",
          catalogue: "/v1/politics/uk/datasets",
          rights: "/v1/politics/uk/datasets/rights",
          admissions: "/v1/politics/uk/datasets/admissions",
        },
        503
      );
    }
    await next();
  });

  // A production deploy must not publish people records merely because code
  // landed. Non-personal system/method records remain visible so the closed
  // door and the rules around it can still be audited.
  routes.use("*", async (c, next) => {
    if (
      !publicDataEnabled &&
      !isAlwaysPublicSystemPath(c.req.path, c.req.method)
    ) {
      const retrievedAt = now().toISOString();
      return errorJson(
        c,
        {
          error: "publication_review_needed",
          message:
            "UK politics people-data publication is paused until the method, privacy, LIA/DPIA, and Article 14 review is complete. Non-personal system and methodology endpoints remain public.",
          methodUrl: "https://taxsorted.io/uk/politics/method/",
          privacyNotice: "pending_publication_review",
          source: {
            name: "TaxSorted UK politics publication gate",
            url: "https://taxsorted.io/uk/politics/method/",
            retrievedAt,
          },
        },
        503
      );
    }
    await next();
  });

  routes.route("/", createUkPoliticsSystemRoutes());
  routes.route("/", createUkPublicOfficePathwayRoutes());
  routes.route(
    "/",
    createUkPoliticsDatasetRoutes({
      bulkDataEmergencyStop,
      bulkDataEnabled: bulkDataAvailable,
      bulkDataApproval,
    })
  );
  routes.route(
    "/",
    createUkPublicIntegrityRoutes({
      fetchImpl,
      now,
      timeoutMs,
      electoralCommissionReuseConfirmed: ecReuseConfirmed,
      electoralFinanceReviewApproved,
      ministerialBenefitsEnabled,
      enforcementLeadersEnabled,
      parliamentaryStaffEnabled,
      parliamentaryInterestsEnabled,
    })
  );

  async function upstream<T>(
    url: URL,
    accept: "json" | "csv",
    read: (response: Response) => Promise<T>
  ): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new UpstreamError("The official source took too long to answer.", "timeout"));
      }, timeoutMs);
    });
    try {
      const operation = (async () => {
        const response = await fetchImpl(url, {
          signal: controller.signal,
          headers: {
            Accept: accept === "json" ? "application/json" : "text/csv",
            "User-Agent": "taxsorted.io/0.1 (+https://taxsorted.io)",
          },
        });
        if (!response.ok) {
          throw new UpstreamError(
            `The official source answered with HTTP ${response.status}.`,
            "unavailable",
            response.status
          );
        }
        return read(response);
      })();
      return await Promise.race([operation, timedOut]);
    } catch (error) {
      if (error instanceof UpstreamError) throw error;
      if (controller.signal.aborted) {
        throw new UpstreamError("The official source took too long to answer.", "timeout");
      }
      throw new UpstreamError("The official source could not be reached.", "unavailable");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function upstreamJson<T>(url: URL): Promise<T> {
    return upstream(url, "json", async (response) => {
      try {
        return (await response.json()) as T;
      } catch {
        throw new UpstreamError("The official source returned invalid JSON.", "invalid");
      }
    });
  }

  async function upstreamCsv(url: URL): Promise<string> {
    return upstream(url, "csv", async (response) => {
      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > MAX_CSV_BYTES) {
        throw new UpstreamError("The official CSV was larger than the safe limit.", "invalid");
      }
      const body = await response.text();
      if (Buffer.byteLength(body, "utf8") > MAX_CSV_BYTES) {
        throw new UpstreamError("The official CSV was larger than the safe limit.", "invalid");
      }
      return body;
    });
  }

  function upstreamFailure(c: Context, error: unknown, source: PoliticsSource) {
    const failure =
      error instanceof UpstreamError
        ? error
        : new UpstreamError("The official source could not be read.", "unavailable");
    const status = failure.reason === "timeout" ? 504 : 502;
    return errorJson(
      c,
      {
        error: failure.reason === "timeout" ? "upstream_timeout" : "upstream_unavailable",
        message: failure.message,
        source,
      },
      status
    );
  }

  routes.get("/people", async (c) => {
    const retrievedAt = now().toISOString();
    const url = new URL("/api/Members/Search", MEMBERS_API);
    const source = parliamentSource(url.toString(), retrievedAt);
    const skip = strictInteger(c.req.query("skip"), 0, 0, 10_000);
    const take = strictInteger(c.req.query("take"), 20, 1, 20);
    const partyId = c.req.query("partyId");
    const party = partyId === undefined ? undefined : strictInteger(partyId, 0, 1, 100_000);
    const house = (c.req.query("house") ?? "all").toLowerCase();
    if (skip === null || take === null || party === null || !["all", "commons", "lords"].includes(house)) {
      return errorJson(
        c,
        {
          error: "invalid_query",
          message: "Use house=commons|lords|all, skip>=0, take=1..20, and a numeric partyId.",
          source,
        },
        422
      );
    }
    url.searchParams.set("IsCurrentMember", "true");
    url.searchParams.set("skip", String(skip));
    url.searchParams.set("take", String(take));
    if (house !== "all") url.searchParams.set("House", house === "commons" ? "1" : "2");
    if (party !== undefined) url.searchParams.set("PartyId", String(party));
    const query = textOrNull(c.req.query("q"));
    if (query) url.searchParams.set("Name", query.slice(0, 100));
    source.url = url.toString();

    try {
      const result = await upstreamJson<SearchResult<UpstreamMember>>(url);
      const people = (result.items ?? []).flatMap((item) => (item.value ? [mapMember(item.value)] : []));
      return personalJson(c, {
        people,
        total: result.totalResults ?? people.length,
        skip: result.skip ?? skip,
        take: result.take ?? take,
        source,
      });
    } catch (error) {
      return upstreamFailure(c, error, source);
    }
  });

  routes.get("/people/:id", async (c) => {
    const retrievedAt = now().toISOString();
    const rawId = c.req.param("id");
    const id = strictInteger(rawId, 0, 1, 100_000);
    const memberUrl = new URL(`/api/Members/${rawId}`, MEMBERS_API);
    const source = parliamentSource(memberUrl.toString(), retrievedAt);
    if (id === null) {
      return errorJson(c, { error: "invalid_person_id", message: "The person id must be numeric.", source }, 422);
    }

    try {
      let memberEnvelope: { value?: UpstreamMember };
      try {
        memberEnvelope = await upstreamJson<{ value?: UpstreamMember }>(memberUrl);
      } catch (error) {
        if (error instanceof UpstreamError && error.upstreamStatus === 404) {
          return errorJson(c, { error: "person_not_found", source }, 404);
        }
        throw error;
      }
      if (!memberEnvelope.value) throw new UpstreamError("The member record was empty.", "invalid");
      // Stop before fetching contacts, interests, or staff unless Parliament
      // explicitly marks this latest House membership active and open-ended.
      if (!isExplicitlyCurrentMember(memberEnvelope.value)) {
        return errorJson(c, { error: "person_not_current", source }, 404);
      }

      const endpoint = (name: string) => new URL(`/api/Members/${id}/${name}`, MEMBERS_API);
      const optionalJson = async <T>(url: URL, empty: T): Promise<T> => {
        try {
          return await upstreamJson<T>(url);
        } catch (error) {
          if (error instanceof UpstreamError && error.upstreamStatus === 404) return empty;
          throw error;
        }
      };
      const [contacts, biography, interests, staff, contributions, election] = await Promise.all([
        optionalJson<{ value?: UpstreamContact[] }>(endpoint("Contact"), {}),
        optionalJson<{ value?: UpstreamBiography }>(endpoint("Biography"), {}),
        parliamentaryInterestsEnabled
          ? optionalJson<{ value?: UpstreamInterestCategory[] }>(endpoint("RegisteredInterests"), {})
          : Promise.resolve<{ value?: UpstreamInterestCategory[] }>({}),
        parliamentaryStaffEnabled
          ? optionalJson<{ value?: UpstreamStaff[] }>(endpoint("Staff"), {})
          : Promise.resolve<{ value?: UpstreamStaff[] }>({}),
        optionalJson<SearchResult<UpstreamContribution>>(endpoint("ContributionSummary"), {}),
        optionalJson<{ value?: UpstreamElection }>(endpoint("LatestElectionResult"), {}),
      ]);

      const bio = biography.value ?? {};
      const mappedRoles = {
        government: mapBiographyEntries(bio.governmentPosts),
        opposition: mapBiographyEntries(bio.oppositionPosts),
        other: mapBiographyEntries(bio.otherPosts),
        committees: mapBiographyEntries(bio.committeeMemberships),
      };
      const activity = (contributions.items ?? []).slice(0, 10).flatMap((item) => {
        const value = item.value;
        if (!value?.debateTitle) return [];
        return [
          {
            title: value.debateTitle,
            date: textOrNull(value.sittingDate),
            house: textOrNull(value.house),
            section: textOrNull(value.section),
            totalContributions: numberOrNull(value.totalContributions) ?? 0,
            speechCount: numberOrNull(value.speechCount) ?? 0,
            questionCount: numberOrNull(value.questionCount) ?? 0,
            supplementaryQuestionCount: numberOrNull(value.supplementaryQuestionCount) ?? 0,
            interventionCount: numberOrNull(value.interventionCount) ?? 0,
            answerCount: numberOrNull(value.answerCount) ?? 0,
            pointsOfOrderCount: numberOrNull(value.pointsOfOrderCount) ?? 0,
            statementsCount: numberOrNull(value.statementsCount) ?? 0,
            url: absoluteParliamentUrl(item.links?.[0]?.href),
          },
        ];
      });
      const electionValue = election.value;
      const mappedElection = electionValue
        ? {
            result: textOrNull(electionValue.result),
            title: textOrNull(electionValue.electionTitle),
            date: textOrNull(electionValue.electionDate),
            constituency: textOrNull(electionValue.constituencyName),
            electorate: numberOrNull(electionValue.electorate),
            turnout: numberOrNull(electionValue.turnout),
            majority: numberOrNull(electionValue.majority),
            isGeneralElection: Boolean(electionValue.isGeneralElection),
            candidates: (electionValue.candidates ?? []).map((candidate) => ({
              name: candidate.name ?? "",
              party: mapParty(candidate.party),
              votes: numberOrNull(candidate.votes),
              voteShare: numberOrNull(candidate.voteShare),
              rank: numberOrNull(candidate.rankOrder),
            })),
          }
        : null;

      return personalJson(c, {
        person: mapMember(memberEnvelope.value),
        contacts: (contacts.value ?? []).map(mapContact).filter((contact) => Boolean(contact)),
        biography: {
          representations: mapBiographyEntries(bio.representations),
          electionsContested: mapBiographyEntries(bio.electionsContested),
          houseMemberships: mapBiographyEntries(bio.houseMemberships),
          partyAffiliations: mapBiographyEntries(bio.partyAffiliations),
        },
        roles: mappedRoles,
        formalPower: formalPowerReferencesForPerson(
          houseName(memberEnvelope.value.latestHouseMembership?.house)!,
          mappedRoles
        ),
        interests: flattenInterests(interests.value ?? [], id),
        staff: (staff.value ?? []).flatMap((person) => {
          const name = [person.title, person.forename, person.surname].filter(Boolean).join(" ").trim();
          return name
            ? [{ name, title: textOrNull(person.title), details: textOrNull(person.details) }]
            : [];
        }),
        activity,
        election: mappedElection,
        privacy: {
          professionalContactsOnly: true,
          residentialContactsExcluded: true,
          interestDonorAndAddressLinesExcluded: true,
          interestDestinationAndFamilyLinesExcluded: true,
          interestFamilyCategoriesExcluded: true,
          parliamentaryStaffPublication: parliamentaryStaffEnabled
            ? "enabled_after_separate_review"
            : "blocked_pending_separate_review",
          parliamentaryInterestsPublication: parliamentaryInterestsEnabled
            ? "enabled_after_separate_review"
            : "blocked_pending_separate_review",
        },
        source,
      });
    } catch (error) {
      return upstreamFailure(c, error, source);
    }
  });

  routes.get("/parties", async (c) => {
    const retrievedAt = now().toISOString();
    const house = (c.req.query("house") ?? "all").toLowerCase();
    const source = parliamentSource(MEMBERS_DOCS, retrievedAt);
    if (!["all", "commons", "lords"].includes(house)) {
      return errorJson(
        c,
        { error: "invalid_query", message: "Use house=commons|lords|all.", source },
        422
      );
    }
    const houses: Array<{ name: HouseName; id: number }> =
      house === "all"
        ? [
            { name: "Commons", id: 1 },
            { name: "Lords", id: 2 },
          ]
        : [{ name: house === "commons" ? "Commons" : "Lords", id: house === "commons" ? 1 : 2 }];
    try {
      const results = await Promise.all(
        houses.map(async ({ name, id }) => ({
          name,
          result: await upstreamJson<SearchResult<UpstreamParty>>(
            new URL(`/api/Parties/GetActive/${id}`, MEMBERS_API)
          ),
        }))
      );
      const merged = new Map<
        number,
        {
          id: number;
          name: string;
          abbreviation: string;
          colour: string | null;
          foregroundColour: string | null;
          governmentType: number | null;
          isIndependent: boolean;
          houses: HouseName[];
        }
      >();
      for (const { name, result } of results) {
        for (const item of result.items ?? []) {
          const party = item.value;
          if (!party || typeof party.id !== "number" || !party.name) continue;
          const existing = merged.get(party.id);
          if (existing) {
            if (!existing.houses.includes(name)) existing.houses.push(name);
          } else {
            merged.set(party.id, {
              id: party.id,
              name: party.name,
              abbreviation: party.abbreviation ?? "",
              colour: colour(party.backgroundColour),
              foregroundColour: colour(party.foregroundColour),
              governmentType: numberOrNull(party.governmentType),
              isIndependent: Boolean(party.isIndependentParty),
              houses: [name],
            });
          }
        }
      }
      const parties = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
      return cachedJson(c, { parties, house, source }, 600);
    } catch (error) {
      return upstreamFailure(c, error, source);
    }
  });

  routes.get("/roles", async (c) => {
    const retrievedAt = now().toISOString();
    const kind = c.req.query("kind");
    const suffix = kind === "government" ? "GovernmentPosts" : "OppositionPosts";
    const url = new URL(`/api/Posts/${suffix}`, MEMBERS_API);
    const source = parliamentSource(url.toString(), retrievedAt);
    if (kind !== "government" && kind !== "opposition") {
      return errorJson(
        c,
        { error: "invalid_query", message: "Use kind=government or kind=opposition.", source },
        422
      );
    }
    try {
      const result = await upstreamJson<Item<UpstreamPost>[]>(url);
      const roles = result.flatMap((item) => {
        const post = item.value;
        if (!post || typeof post.id !== "number" || !post.name) return [];
        const holders = (post.postHolders ?? []).flatMap((holder) => {
          if (holder.endDate || !holder.member?.value) return [];
          return [
            {
              person: mapMember(holder.member.value),
              startDate: textOrNull(holder.startDate),
              isPaid: Boolean(holder.isPaid),
              layingMinisterName: textOrNull(holder.layingMinisterName),
            },
          ];
        });
        if (!holders.length) return [];
        return [
          {
            id: post.id,
            name: post.name,
            hansardName: textOrNull(post.hansardName),
            departments: (post.governmentDepartments ?? []).flatMap((department) =>
              typeof department.id === "number" && department.name
                ? [
                    {
                      id: department.id,
                      name: department.name,
                      url: textOrNull(department.url),
                    },
                  ]
                : []
            ),
            holders,
          },
        ];
      });
      return personalJson(c, { kind, roles, source });
    } catch (error) {
      return upstreamFailure(c, error, source);
    }
  });

  routes.get("/funding/donations", async (c) => {
    const retrievedAt = now().toISOString();
    const officialSearchUrl = EC_DONATIONS_SEARCH;
    if (!ecReuseConfirmed) {
      return errorJson(
        c,
        {
          error: "source_terms_confirmation_needed",
          message:
            "TaxSorted has not yet confirmed permission to republish Political Finance Online records through an API. Use the official search and CSV download while that is checked.",
          source: commissionSource(officialSearchUrl, retrievedAt),
        },
        503
      );
    }
    if (!electoralFinanceReviewApproved) {
      return errorJson(
        c,
        {
          error: "source_privacy_review_needed",
          message:
            "The company-only output filter is built, but the official bulk CSV can contain individual political-donor data. Upstream processing stays closed until the separate Article 9, minimisation and retention review is approved.",
          source: commissionSource(officialSearchUrl, retrievedAt),
        },
        503
      );
    }

    const from = c.req.query("from");
    const to = c.req.query("to");
    const fromTime = parseIsoDate(from);
    const toTime = parseIsoDate(to);
    const skip = strictInteger(c.req.query("skip"), 0, 0, 100_000);
    const take = strictInteger(c.req.query("take"), 50, 1, 100);
    const recipient = textOrNull(c.req.query("recipient"))?.slice(0, 100);
    const sourceUrl = from && to ? donationCsvUrl(from, to, recipient).toString() : officialSearchUrl;
    const source = commissionSource(sourceUrl, retrievedAt);
    if (
      fromTime === null ||
      toTime === null ||
      fromTime > toTime ||
      toTime - fromTime > MAX_DONATION_SPAN_DAYS * DAY_MS ||
      skip === null ||
      take === null
    ) {
      return errorJson(
        c,
        {
          error: "invalid_query",
          message: `Use valid from/to dates spanning no more than ${MAX_DONATION_SPAN_DAYS} days, skip>=0, and take=1..100.`,
          source,
        },
        422
      );
    }

    const csvUrl = donationCsvUrl(from!, to!, recipient);
    source.url = csvUrl.toString();
    try {
      let donations = donationsFromCsv(await upstreamCsv(csvUrl));
      if (recipient) {
        const needle = recipient.toLocaleLowerCase("en-GB");
        donations = donations.filter(
          (donation) =>
            donation.recipient.toLocaleLowerCase("en-GB").includes(needle) ||
            donation.accountingUnit?.toLocaleLowerCase("en-GB").includes(needle)
        );
      }
      return personalJson(
        c,
        {
          donations: donations.slice(skip, skip + take),
          total: donations.length,
          skip,
          take,
          source,
          coverage:
            "Verified company donors with a valid published company registration number only. Individual and other non-company donor rows are not returned.",
        }
      );
    } catch (error) {
      return upstreamFailure(c, error, source);
    }
  });

  routes.get("/sources", (c) => {
    const retrievedAt = now().toISOString();
    const source = {
      name: "TaxSorted UK politics source and coverage manifest",
      url: "https://api.taxsorted.io/v1/politics/uk/sources",
      retrievedAt,
    };
    return cachedJson(
      c,
      {
        country: "United Kingdom",
        sources: [
          {
            id: "uk-parliament-members",
            publisher: "UK Parliament",
            dataset: "Members API",
            url: MEMBERS_DOCS,
            status: publicDataEnabled ? "live" : "blocked_pending_people_review",
            coverage:
              "Current Commons and Lords members, public professional contacts, biography, recent contributions, latest election result, active parties, and government/opposition roles. Registered interests and publicly listed staff are separately gated.",
            attribution:
              "Contains Parliamentary information licensed under the Open Parliament Licence v3.0.",
            licence: { name: "Open Parliament Licence v3.0", url: OPL_URL },
          },
          {
            id: "electoral-commission-political-finance",
            publisher: "Electoral Commission",
            dataset: "Political Finance Online party donations CSV export",
            url: EC_DONATIONS_SEARCH,
            status: !publicDataEnabled
              ? "blocked_pending_people_review"
              : !ecReuseConfirmed
                ? "blocked_pending_reuse_confirmation"
                : electoralFinanceReviewApproved
                  ? "live_company_only_projection"
                  : "blocked_pending_finance_privacy_review",
            coverage: !publicDataEnabled
              ? "No records are republished while the named politics-data review is closed."
              : !ecReuseConfirmed
                ? "No records are republished until the reuse terms for Political Finance Online are confirmed."
                : electoralFinanceReviewApproved
                  ? `Verified-company political-party donations in caller-selected date windows of at most ${MAX_DONATION_SPAN_DAYS} days.`
                  : "No bulk CSV is fetched until the separate political-donor privacy and minimisation review is approved.",
          },
          {
            id: "uk-political-system-curation",
            publisher: "TaxSorted, citing UK Parliament, UK Government and Electoral Commission sources",
            dataset: "UK political system, office-power method and accountability map",
            url: "https://api.taxsorted.io/v1/politics/uk/system",
            status: "live",
            coverage:
              "Non-personal UK Parliamentary election process, responsibility hand-offs, current campaign-finance rules, provisional office-power assessments, budget accountability, public funding, relationship evidence, enforcement states, history coverage and current-versus-proposed law status.",
            attribution:
              "Every curated assertion carries official source IDs. Follow each source's own licence and attribution; the API software licence does not replace a dataset licence.",
          },
          {
            id: "uk-public-office-pathways-curation",
            publisher: "TaxSorted, citing Electoral Commission, UK Parliament, GOV.UK and local-government sources",
            dataset: "Non-partisan public-office entry pathways",
            url: "https://api.taxsorted.io/v1/politics/uk/public-office-pathways",
            status: "live_rules_only",
            coverage:
              "Current-law pathway records for UK Parliamentary candidates in Great Britain and principal-council candidates in England, plus explicit gaps for office families whose rules differ.",
            attribution:
              "TaxSorted-written summaries link to primary or first-party sources. Follow each linked source's own reuse terms.",
          },
          {
            id: "uk-public-integrity-source-registry",
            publisher: "TaxSorted, citing official UK registers, APIs, legislation and guidance",
            dataset: "Finance, corporate-relationship and law-enforcement source registry",
            url: "https://api.taxsorted.io/v1/politics/uk/integrity/sources",
            status: "live",
            coverage:
              "Typed evidence-event schema, finance dataset publication states, UK law-enforcement institutions and accountability edges, pay/workforce/vacancy source maps, and formal office-power assessments.",
            attribution:
              "The registry links each fact family to its publisher and reuse status. An open copyright licence does not itself authorise personal-data processing.",
          },
          {
            id: "contracts-finder-awards",
            publisher: "Cabinet Office",
            dataset: "Contracts Finder OCDS award releases",
            url: "https://www.contractsfinder.service.gov.uk/apidocumentation/home",
            status: "live_organisation_only_projection",
            coverage:
              "Award releases in caller-selected windows of no more than 31 days. Addresses and contacts are removed; supplier names require a verified public organisation identifier.",
          },
          {
            id: "data-police-forces",
            publisher: "Home Office",
            dataset: "data.police.uk force institutions and senior officers",
            url: "https://data.police.uk/docs/",
            status: enforcementLeadersEnabled
              ? "institution_records_and_gated_senior_offices_live"
              : "institution_records_live_senior_offices_blocked_pending_review",
            coverage:
              "Force names and institutional contact data are open. Named senior-office records have an independent safety and publication gate; biographies and direct contacts are never returned.",
          },
        ],
        endpoints: [
          {
            path: "/, /manifest, /datasets and /datasets/:datasetId[/download|/schema]",
            coverage:
              "No-key discovery plus deterministic public-safe JSON, CSV and NDJSON distributions with schemas, ETags, checksums and source IDs",
            status: "live",
          },
          {
            path: "/people",
            coverage: "Current Commons and Lords membership",
            status: publicDataEnabled ? "live" : "blocked_pending_review",
          },
          {
            path: "/people/:id",
            coverage: "Current member public record",
            status: publicDataEnabled ? "live" : "blocked_pending_review",
          },
          {
            path: "/people/:id staff field",
            coverage: "Names and role details of staff whom Parliament lists publicly",
            status: !publicDataEnabled
              ? "blocked_pending_people_review"
              : parliamentaryStaffEnabled
                ? "live"
                : "blocked_pending_separate_staff_review",
          },
          {
            path: "/people/:id interests field",
            coverage: "Minimised Commons registered-interest entries with family and address lines excluded",
            status: !publicDataEnabled
              ? "blocked_pending_people_review"
              : parliamentaryInterestsEnabled
                ? "live"
                : "blocked_pending_separate_interests_review",
          },
          {
            path: "/parties",
            coverage: "Parties with an active member",
            status: publicDataEnabled ? "live" : "blocked_pending_review",
          },
          {
            path: "/roles",
            coverage: "Current government and opposition post holders",
            status: publicDataEnabled ? "live" : "blocked_pending_review",
          },
          {
            path: "/funding/donations",
            coverage: "Political-party donations only",
            status: !publicDataEnabled
              ? "blocked_pending_review"
              : !ecReuseConfirmed
                ? "blocked_pending_reuse_confirmation"
                : electoralFinanceReviewApproved
                  ? "live_company_only_projection"
                  : "blocked_pending_finance_privacy_review",
          },
          {
            path: "/system",
            coverage: "Non-personal political-system record and source registry",
            status: "live",
          },
          {
            path: "/public-office-pathways and /public-office-pathways/offices/:officeId",
            coverage:
              "Read-only, non-personal candidacy steps, legal boundaries, nomination, money, support, safety and after-election duties",
            status: "live_rules_only",
          },
          {
            path: "/elections/process",
            coverage: "UK Parliamentary general-election stages, responsible bodies and records",
            status: "live",
          },
          {
            path: "/funding/rules and /funding/public",
            coverage: "Current campaign-finance rules and public political-funding scheme map",
            status: "live",
          },
          {
            path: "/power/method and /power/offices",
            coverage: "Versioned formal-office-power method and provisional sourced assessments",
            status: "live",
          },
          {
            path: "/budgets/accountability",
            coverage: "Public-money authority, accountability lanes and a dated Estimates snapshot",
            status: "live",
          },
          {
            path: "/relationships/method",
            coverage: "Evidence-safe corporate and organisational relationship model",
            status: "live",
          },
          {
            path: "/integrity, /integrity/sources, /integrity/corrections, /relationships/schema and /relationships/datasets",
            coverage: "Public-integrity scope, official source registry, correction/restriction method, typed evidence-event schema and finance dataset publication states",
            status: "live",
          },
          {
            path: "/relationships/contracts",
            coverage: "Organisation-only projection of Contracts Finder award releases",
            status: "live",
          },
          {
            path: "/relationships/ministerial-benefits",
            coverage: "Department/month gift and hospitality records, with no name-based joins",
            status: ministerialBenefitsEnabled ? "live" : "blocked_pending_review",
          },
          {
            path: "/enforcement/method",
            coverage: "Enforcement responsibilities, current boundary and case-state method",
            status: "live",
          },
          {
            path: "/enforcement/institutions, /enforcement/governance and /enforcement/power/*",
            coverage: "UK institutional accountability chains and sourced formal-authority cards",
            status: "live",
          },
          {
            path: "/enforcement/ranks, /pay-benefits, /workforce, /funding, /vacancies, /activities and /private-security",
            coverage: "Generic rank structures, official aggregate/source collections and the private-security publication boundary",
            status: "live",
          },
          {
            path: "/enforcement/forces and /enforcement/forces/:forceId",
            coverage: "Live force institution directory and whitelisted public institutional contacts",
            status: "live",
          },
          {
            path: "/enforcement/forces/:forceId/leaders",
            coverage: "Officially published senior-office names and ranks only",
            status: enforcementLeadersEnabled ? "live" : "blocked_pending_review",
          },
          {
            path: "/enforcement/communication-method",
            coverage: "Reproducible official-text metrics method; identifiable analysis is not enabled",
            status: "method_live_analysis_blocked_pending_lia_dpia",
          },
          {
            path: "/history/method and /law/watch",
            coverage: "Effective-dated history plan and strict separation of proposed from current law",
            status: "live",
          },
        ],
        privacy: {
          included: [
            "Official parliamentary, constituency, ministerial, party, website, and public social contacts",
            "Verified company donor names and registration numbers only when both source reuse and the finance privacy review are approved",
            "Verified public-organisation identifiers and names in public contract awards",
            "Official institution contacts and source-linked generic law-enforcement roles",
            "Current senior law-enforcement names and ranks only when their independent gate is approved",
            "Names of staff whom Parliament lists publicly only when the separate Parliamentary-staff gate is approved",
            "Minimised registered interests only when the separate interests and third-party-data gate is approved",
          ],
          excluded: [
            "Home, private, residential, and personal-address contacts",
            "Donor, payer, address, location, and postcode lines in registered interests",
            "Destination, family-member, name, and relationship lines in registered interests",
            "Entire registered-interest categories explicitly concerning family members, spouses, or civil partners",
            "Donation postcodes, addresses, and source-internal person identifiers",
            "Buyer and supplier addresses, contact people, emails and telephone numbers in procurement payloads",
            "Natural-person reverse property search and exact personal property locations",
            "Rank-and-file rosters, collar numbers, shifts, deployments, tactics and direct officer contacts",
            "Victim, witness, suspect, allegation, complaint, disciplinary and conviction dossiers",
            "Inferred influence, quid pro quo, corruption, personality, ideology, intent or management style",
          ],
        },
        publication: {
          status: publicDataEnabled ? "enabled" : "blocked_pending_review",
          peopleDataStatus: publicDataEnabled ? "enabled" : "blocked_pending_review",
          nonPersonalSystemStatus: "live",
          electoralFinanceStatus: !publicDataEnabled
            ? "blocked_pending_people_review"
            : !ecReuseConfirmed
              ? "blocked_pending_reuse_confirmation"
              : electoralFinanceReviewApproved
                ? "enabled_company_only_projection"
                : "blocked_pending_finance_privacy_review",
          ministerialBenefitsStatus: ministerialBenefitsEnabled
            ? "enabled"
            : "blocked_pending_review",
          enforcementLeadersStatus: enforcementLeadersEnabled
            ? "enabled"
            : "blocked_pending_review",
          parliamentaryStaffStatus: parliamentaryStaffEnabled
            ? "enabled"
            : "blocked_pending_review",
          parliamentaryInterestsStatus: parliamentaryInterestsEnabled
            ? "enabled"
            : "blocked_pending_review",
          methodUrl: "https://taxsorted.io/uk/politics/method/",
          privacyNotice: "pending_publication_review",
        },
        source,
      },
      3600
    );
  });

  return routes;
}
