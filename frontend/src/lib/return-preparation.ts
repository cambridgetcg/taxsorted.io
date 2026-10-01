export const RETURN_PREPARATION_SCHEMA = "taxsorted.return-preparation/1" as const;
export const PREPARATION_YEARS = ["2025-26", "2026-27"] as const;
export type PreparationYear = (typeof PREPARATION_YEARS)[number];
export const PREPARATION_PERIODS = {
  "2025-26": { label: "2025–26", start: "2025-04-06", end: "2026-04-05" },
  "2026-27": { label: "2026–27", start: "2026-04-06", end: "2027-04-05" },
} as const;
export const PREPARATION_PURPOSES = [
  { id: "prepare-return", label: "Prepare an annual return" },
  { id: "organise-records", label: "Organise records for this year" },
] as const;
export type PreparationPurpose = (typeof PREPARATION_PURPOSES)[number]["id"];
export const PREPARATION_CIRCUMSTANCES = [
  { id: "employment", label: "Employment", evidenceHint: "P60, P45 or another employment document for this year." },
  { id: "trading", label: "Trading or freelance work", evidenceHint: "Income, expense and business records for this year." },
  { id: "property", label: "Property income", evidenceHint: "Property income, costs and ownership records for this year." },
  { id: "pension", label: "Pensions", evidenceHint: "Pension income and contribution statements for this year." },
  { id: "savings-investments", label: "Savings and investments", evidenceHint: "Interest, dividend, investment and disposal statements for this year." },
  { id: "other-income", label: "Other income", evidenceHint: "Documents explaining income not covered by the other questions." },
  { id: "life-changes", label: "Changes in your circumstances", evidenceHint: "Dates and documents that explain the change." },
  { id: "hmrc-letter", label: "An HMRC letter or notice", evidenceHint: "The letter, its date and the year or action it refers to." },
] as const;
export type CircumstanceId = (typeof PREPARATION_CIRCUMSTANCES)[number]["id"];
export type PreparationAnswer = "yes" | "no" | "unknown" | null;
export type EvidenceStatus = "missing" | "collected" | "reviewed" | "unresolved";
export type GenericEvidenceId = Exclude<CircumstanceId, "employment">;
export type EmploymentDocumentType = "P60" | "P45" | "other";
export interface EmploymentSource {
  id: string;
  employerName: string;
  documentType: EmploymentDocumentType;
  documentYear: PreparationYear | "unknown";
  sourceLabel: string;
  /** Exact pounds, blank means unknown. Only tax may be negative (a refund). */
  pay: string;
  tax: string;
  notes: string;
  reviewed: boolean;
}
export interface PreparationDraft {
  schema: typeof RETURN_PREPARATION_SCHEMA;
  revision: number;
  createdAt: string;
  updatedAt: string;
  year: PreparationYear;
  purpose: PreparationPurpose;
  circumstances: Record<CircumstanceId, PreparationAnswer>;
  evidence: Record<GenericEvidenceId, EvidenceStatus>;
  employmentSources: EmploymentSource[];
}
export interface PreparationChecklistItem {
  id: CircumstanceId;
  label: string;
  status: EvidenceStatus | "unanswered" | "not-applicable";
  detail: string;
}
export interface PreparationReview {
  unanswered: CircumstanceId[];
  uncertain: CircumstanceId[];
  checklist: PreparationChecklistItem[];
  employment: { active: boolean; total: number; reviewed: number; unresolved: number; inactive: number };
  /** Unanswered/uncertain circumstances and active evidence still to review. */
  unresolved: number;
  warnings: string[];
}

const circumstanceIds = PREPARATION_CIRCUMSTANCES.map(item => item.id);
const genericEvidenceIds = circumstanceIds.filter((id): id is GenericEvidenceId => id !== "employment");
const statuses = ["missing", "collected", "reviewed", "unresolved"];
const sourceKeys = ["id", "employerName", "documentType", "documentYear", "sourceLabel", "pay", "tax", "notes", "reviewed"];
const draftKeys = ["schema", "revision", "createdAt", "updatedAt", "year", "purpose", "circumstances", "evidence", "employmentSources"];
export const PREPARATION_MAX_EMPLOYMENT_SOURCES = 50;

function exactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}
function text(value: unknown, max: number, multiline = false): value is string {
  return typeof value === "string" && value.length <= max
    && !(multiline ? /[\u0000-\u0008\u000b-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value);
}
function instant(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}
function validAmount(value: string, signed = false): boolean {
  return (signed ? /^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/ : /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/).test(value);
}
function today(): string { return new Date().toISOString().slice(0, 10); }

export function createPreparationDraft(
  year: PreparationYear,
  purpose: PreparationPurpose,
  now = new Date().toISOString(),
): PreparationDraft {
  const draft: PreparationDraft = {
    schema: RETURN_PREPARATION_SCHEMA, revision: 0, createdAt: now, updatedAt: now, year, purpose,
    circumstances: Object.fromEntries(circumstanceIds.map(id => [id, null])) as PreparationDraft["circumstances"],
    evidence: Object.fromEntries(genericEvidenceIds.map(id => [id, "missing"])) as PreparationDraft["evidence"],
    employmentSources: [],
  };
  assertPreparationDraft(draft);
  return draft;
}

export function createEmploymentSource(id = crypto.randomUUID()): EmploymentSource {
  return { id, employerName: "", documentType: "P60", documentYear: "unknown", sourceLabel: "", pay: "", tax: "", notes: "", reviewed: false };
}

/** All editable source fields are material. IDs and review are separate actions. */
export function updateEmploymentSource(
  source: EmploymentSource,
  patch: Partial<Omit<EmploymentSource, "id" | "reviewed">>,
): EmploymentSource {
  const changed = Object.entries(patch).some(([key, value]) => source[key as keyof EmploymentSource] !== value);
  return { ...source, ...patch, id: source.id, reviewed: changed ? false : source.reviewed };
}

export function employmentReviewIssues(source: EmploymentSource, year: PreparationYear, asOfDate = today()): string[] {
  const issues: string[] = [];
  if (source.documentType !== "P60") issues.push("Only P60 figures can be reviewed here. Keep P45 or other documents unresolved for the next preparation step.");
  if (source.documentYear !== year) issues.push("Check that the document year matches the selected preparation year.");
  if (asOfDate <= PREPARATION_PERIODS[year].end) issues.push("This tax year has not ended. Keep its P60 record unresolved until the year has finished.");
  if (!source.employerName.trim()) issues.push("Name the employer shown on the document.");
  if (!source.sourceLabel.trim()) issues.push("Add a label that lets you find the source document again.");
  if (!source.pay) issues.push("Enter pay from the P60's In this employment field; blank remains unknown.");
  else if (!validAmount(source.pay)) issues.push("Enter pay as a non-negative number in pounds with at most two decimal places, without commas or symbols.");
  if (!source.tax) issues.push("Enter tax from the P60's In this employment field; blank remains unknown.");
  else if (!validAmount(source.tax, true)) issues.push("Enter tax in pounds with at most two decimal places; use a minus sign for a refund marked R.");
  return issues;
}

export function reviewEmploymentSource(source: EmploymentSource, year: PreparationYear, confirmed: boolean, asOfDate = today()): EmploymentSource {
  if (!confirmed) return { ...source, reviewed: false };
  if (employmentReviewIssues(source, year, asOfDate).length > 0) throw new Error("Check the employment document details before confirming your review.");
  return { ...source, reviewed: true };
}

/** Strict persisted shape; unfinished entries may be blank, never implicit zero. */
export function assertPreparationDraft(value: unknown): asserts value is PreparationDraft {
  if (!exactObject(value, draftKeys) || value.schema !== RETURN_PREPARATION_SCHEMA
    || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0
    || !PREPARATION_YEARS.includes(value.year as PreparationYear)
    || !PREPARATION_PURPOSES.some(item => item.id === value.purpose)
    || !instant(value.createdAt) || !instant(value.updatedAt) || value.updatedAt < value.createdAt
    || !exactObject(value.circumstances, circumstanceIds)
    || !Object.values(value.circumstances).every(answer => answer === null || ["yes", "no", "unknown"].includes(answer as string))
    || !exactObject(value.evidence, genericEvidenceIds)
    || !Object.values(value.evidence).every(status => statuses.includes(status as string))
    || !Array.isArray(value.employmentSources) || value.employmentSources.length > PREPARATION_MAX_EMPLOYMENT_SOURCES
  ) throw new Error("This preparation has an unsupported or damaged format. It has not been replaced.");
  const ids = new Set<string>();
  for (const source of value.employmentSources) {
    if (!exactObject(source, sourceKeys)
      || !text(source.id, 100) || !source.id.trim() || ids.has(source.id)
      || !text(source.employerName, 200) || !text(source.sourceLabel, 300) || !text(source.notes, 2000, true)
      || !["P60", "P45", "other"].includes(source.documentType as string)
      || ![...PREPARATION_YEARS, "unknown"].includes(source.documentYear as PreparationYear | "unknown")
      || !text(source.pay, 16) || !text(source.tax, 17) || typeof source.reviewed !== "boolean"
    ) throw new Error("An employment record has an unsupported or damaged format. Saved data has not been replaced.");
    if ((source.pay !== "" && !validAmount(source.pay)) || (source.tax !== "" && !validAmount(source.tax, true))) {
      throw new Error("Use plain pounds with at most two decimal places, or leave an unknown amount blank. Only tax refunds may be negative.");
    }
    // Time-dependent applicability is derived at display/export; preserving a
    // future reviewed flag must never imply that the year has finished.
    if (source.reviewed && employmentReviewIssues(source as unknown as EmploymentSource, value.year as PreparationYear, "9999-12-31").length > 0) {
      throw new Error("An employment review no longer matches its document. Review the details again before saving.");
    }
    ids.add(source.id);
  }
}

export function derivePreparationReview(draft: PreparationDraft, asOfDate = today()): PreparationReview {
  const unanswered = circumstanceIds.filter(id => draft.circumstances[id] === null);
  const uncertain = circumstanceIds.filter(id => draft.circumstances[id] === "unknown");
  const active = draft.circumstances.employment === "yes";
  const reviewed = active ? draft.employmentSources.filter(source => source.reviewed && employmentReviewIssues(source, draft.year, asOfDate).length === 0).length : 0;
  const employment = {
    active, total: draft.employmentSources.length, reviewed,
    unresolved: active ? draft.employmentSources.length - reviewed : 0,
    inactive: active ? 0 : draft.employmentSources.length,
  };
  const checklist = PREPARATION_CIRCUMSTANCES.map(({ id, label, evidenceHint }): PreparationChecklistItem => {
    const answer = draft.circumstances[id];
    if (answer === null) return { id, label, status: "unanswered", detail: "Answer this circumstance question; untouched is not No." };
    if (answer === "unknown") return { id, label, status: "unresolved", detail: "You marked this Not sure. Check the circumstances before treating it as absent." };
    if (answer === "no") return { id, label, status: "not-applicable", detail: "You answered No. Previously entered evidence stays stored and is not counted as active." };
    if (id !== "employment") return { id, label, status: draft.evidence[id], detail: `${evidenceHint} Status is your own note; documents are not inspected here.` };
    const status: EvidenceStatus = !employment.total ? "missing"
      : reviewed === employment.total ? "reviewed"
      : draft.employmentSources.some(source => employmentReviewIssues(source, draft.year, asOfDate).length > 0) ? "unresolved" : "collected";
    return { id, label, status, detail: `${reviewed} of ${employment.total} employment records reviewed by you. No annual totals or filing readiness are calculated.` };
  });
  const employers = new Set<string>();
  const labels = new Set<string>();
  let repeated = false;
  for (const source of draft.employmentSources) {
    const employer = source.employerName.trim().toLocaleLowerCase("en-GB");
    const label = source.sourceLabel.trim().toLocaleLowerCase("en-GB");
    if ((employer && employers.has(employer)) || (label && labels.has(label))) repeated = true;
    if (employer) employers.add(employer);
    if (label) labels.add(label);
  }
  return {
    unanswered, uncertain, checklist, employment,
    unresolved: checklist.filter(item => item.status !== "reviewed" && item.status !== "not-applicable").length,
    warnings: repeated ? ["More than one employment record names the same employer or source. Check for overlap, including P45 and P60 figures. Records have not been combined or removed."] : [],
  };
}

/** A human-readable preparation summary, deliberately not a restorable backup. */
export function exportPreparationSummary(
  draft: PreparationDraft,
  options: { includeFigures?: boolean; includeNotes?: boolean } = {},
  asOfDate = today(),
): string {
  assertPreparationDraft(draft);
  const review = derivePreparationReview(draft, asOfDate);
  const period = PREPARATION_PERIODS[draft.year];
  const lines = [
    "TaxSorted preparation summary", `Tax year: ${period.label} (${period.start} to ${period.end})`,
    `Purpose: ${PREPARATION_PURPOSES.find(item => item.id === draft.purpose)!.label}`,
    "This is a plaintext preparation summary, not a backup, tax calculation or filed return.",
    "Statements and review marks are supplied by you. TaxSorted has not inspected documents or established completeness, liability or readiness to file.",
    "No information has been sent to HMRC. Sharing this summary does not authorise anyone to act for you.",
    `Draft revision: ${draft.revision}; this summary may include unsaved edits.`,
    `Figures: ${options.includeFigures ? "included as entered, without totals" : "omitted"}. Notes: ${options.includeNotes ? "included" : "omitted"}.`,
    "", "Circumstances and evidence",
  ];
  for (const item of review.checklist) {
    const answer = draft.circumstances[item.id];
    lines.push(`${item.label}: ${answer === null ? "unanswered" : answer === "unknown" ? "not sure" : answer}; evidence ${item.status}.`);
    if (item.id !== "employment" && answer !== "yes") lines.push(`  Inactive saved evidence note: ${draft.evidence[item.id]}; excluded from active progress.`);
  }
  lines.push("", review.employment.active ? "Employment documents" : "Inactive employment documents — employment was not answered Yes; records are retained, not counted as active");
  if (!draft.employmentSources.length) lines.push("No employment documents entered. This does not establish that none are needed.");
  for (const [index, source] of draft.employmentSources.entries()) {
    const issues = employmentReviewIssues(source, draft.year, asOfDate);
    lines.push(`Document ${index + 1}: ${source.employerName || "employer not provided"}`,
      `  Type: ${source.documentType}; document year: ${source.documentYear}; source: ${source.sourceLabel || "not provided"}.`,
      `  Review: ${source.reviewed && !issues.length ? "confirmed by you" : "unresolved / not reviewed"}${review.employment.active ? "" : " (inactive)"}.`);
    if (options.includeFigures) lines.push(`  Pay in this employment: ${source.pay || "unknown"}; tax in this employment: ${source.tax || "unknown"}. Amounts are pounds; negative tax means a refund.`);
    if (options.includeNotes) lines.push(`  Notes: ${source.notes ? source.notes.replace(/\n/g, "\n    ") : "not provided"}`);
    for (const issue of issues) lines.push(`  To check: ${issue}`);
  }
  if (review.warnings.length) lines.push("", "Overlap checks", ...review.warnings);
  lines.push("", "Next review", ...review.checklist.filter(item => item.status !== "reviewed" && item.status !== "not-applicable").map(item => `${item.label}: ${item.detail}`),
    "This summary does not calculate annual income, tax paid, a balance due or a filing obligation.");
  return lines.join("\n");
}
