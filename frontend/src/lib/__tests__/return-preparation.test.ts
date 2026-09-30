import { describe, expect, it } from "vitest";
import {
  assertPreparationDraft,
  createEmploymentSource,
  createPreparationDraft,
  derivePreparationReview,
  employmentReviewIssues,
  exportPreparationSummary,
  PREPARATION_CIRCUMSTANCES,
  reviewEmploymentSource,
  updateEmploymentSource,
  type EmploymentSource,
} from "../return-preparation";

const NOW = "2026-09-30T12:00:00.000Z";
const TODAY = "2026-09-30";
function draft() { return createPreparationDraft("2025-26", "prepare-return", NOW); }
function source(patch: Partial<EmploymentSource> = {}): EmploymentSource {
  return {
    ...createEmploymentSource("employment-1"), employerName: "Example employer", documentType: "P60",
    documentYear: "2025-26", sourceLabel: "P60 from employer portal", pay: "31000.50", tax: "2800.25", ...patch,
  };
}

describe("year-specific return preparation", () => {
  it("begins with untouched circumstances, blank unknown amounts and missing evidence", () => {
    const value = draft();
    const review = derivePreparationReview(value, TODAY);
    expect(value.revision).toBe(0);
    expect(value.year).toBe("2025-26");
    expect(Object.values(value.circumstances)).toEqual(Array(8).fill(null));
    expect(Object.values(value.evidence)).toEqual(Array(7).fill("missing"));
    expect(review.unanswered).toHaveLength(8);
    expect(review.uncertain).toEqual([]);
    expect(review.unresolved).toBe(8);
    expect(createEmploymentSource("new")).toMatchObject({ pay: "", tax: "", documentYear: "unknown", reviewed: false });
  });

  it("separates unanswered, explicit uncertainty, No and generic evidence review", () => {
    const value = draft();
    value.circumstances.trading = "unknown";
    value.circumstances.property = "no";
    value.circumstances.pension = "yes";
    value.evidence.pension = "reviewed";
    const review = derivePreparationReview(value, TODAY);
    expect(review.unanswered).toHaveLength(5);
    expect(review.uncertain).toEqual(["trading"]);
    expect(review.checklist.find(item => item.id === "property")?.status).toBe("not-applicable");
    expect(review.checklist.find(item => item.id === "pension")?.status).toBe("reviewed");
    expect(review.unresolved).toBe(6);
  });

  it("does not call employment evidence complete when Yes has no documents", () => {
    const value = draft();
    value.circumstances.employment = "yes";
    expect(derivePreparationReview(value, TODAY).checklist[0].status).toBe("missing");
  });

  it("requires explicit confirmation for a valid completed-year P60 and accepts explicit zero", () => {
    const document = source({ pay: "0", tax: "0.00" });
    expect(employmentReviewIssues(document, "2025-26", TODAY)).toEqual([]);
    expect(reviewEmploymentSource(document, "2025-26", false, TODAY).reviewed).toBe(false);
    expect(reviewEmploymentSource(document, "2025-26", true, TODAY).reviewed).toBe(true);
    expect(document.reviewed).toBe(false);
  });

  it.each(["-100.50", "-0.01", "0", "1234.5"])("retains exact signed tax input without stripping or rounding: %s", tax => {
    const value = draft();
    value.employmentSources = [reviewEmploymentSource(source({ tax }), "2025-26", true, TODAY)];
    expect(() => assertPreparationDraft(value)).not.toThrow();
    expect(value.employmentSources[0].tax).toBe(tax);
  });

  it.each(["", "100R", "£100", "1,000", "1e3", "12.345", "NaN", " 0 ", "1000000000000"])("does not coerce unsupported tax input into zero or a reviewed figure: %j", tax => {
    const document = source({ tax });
    expect(employmentReviewIssues(document, "2025-26", TODAY).length).toBeGreaterThan(0);
    expect(() => reviewEmploymentSource(document, "2025-26", true, TODAY)).toThrow(/details/);
    expect(document.tax).toBe(tax);
  });

  it.each(["", "-1", "100.999", "1,000"])("does not review unknown, negative or over-precise pay: %j", pay => {
    expect(() => reviewEmploymentSource(source({ pay }), "2025-26", true, TODAY)).toThrow();
  });

  it.each(["P45", "other"] as const)("keeps %s unresolved even when all numeric fields are populated", documentType => {
    const value = draft();
    value.circumstances.employment = "yes";
    value.employmentSources = [source({ documentType })];
    expect(derivePreparationReview(value, TODAY).employment).toMatchObject({ total: 1, reviewed: 0, unresolved: 1 });
    expect(() => reviewEmploymentSource(value.employmentSources[0], "2025-26", true, TODAY)).toThrow();
  });

  it.each([
    { employerName: " " }, { sourceLabel: "" }, { documentYear: "unknown" }, { documentYear: "2026-27" },
  ] as Partial<EmploymentSource>[])("blocks review when source attribution or year is incomplete: %j", patch => {
    expect(() => reviewEmploymentSource(source(patch), "2025-26", true, TODAY)).toThrow();
  });

  it("keeps current-year P60 data unresolved through the final day, including an imported reviewed flag", () => {
    const value = createPreparationDraft("2026-27", "organise-records", NOW);
    value.circumstances.employment = "yes";
    value.employmentSources = [source({ documentYear: "2026-27", reviewed: true })];
    expect(() => assertPreparationDraft(value)).not.toThrow();
    expect(derivePreparationReview(value, "2027-04-05").employment.reviewed).toBe(0);
    expect(() => reviewEmploymentSource(value.employmentSources[0], "2026-27", true, "2027-04-05")).toThrow();
    expect(derivePreparationReview(value, "2027-04-06").employment.reviewed).toBe(1);
    expect(exportPreparationSummary(value, {}, TODAY)).toContain("This tax year has not ended");
    expect(exportPreparationSummary(value, {}, TODAY)).not.toContain("Review: confirmed by you");
  });

  it.each([
    { employerName: "Changed employer" }, { documentType: "other" }, { documentYear: "2026-27" },
    { sourceLabel: "replacement document" }, { pay: "32000" }, { tax: "-100" }, { notes: "New uncertainty" },
  ] as Partial<Omit<EmploymentSource, "id" | "reviewed">>[])("invalidates review for every material edit: %j", patch => {
    const reviewed = reviewEmploymentSource(source(), "2025-26", true, TODAY);
    const updated = updateEmploymentSource(reviewed, patch);
    expect(updated.reviewed).toBe(false);
    expect(reviewed.reviewed).toBe(true);
    expect(updated.id).toBe(reviewed.id);
  });

  it("retains review for an unchanged field and never lets a patch change identity or force review", () => {
    const reviewed = reviewEmploymentSource(source(), "2025-26", true, TODAY);
    expect(updateEmploymentSource(reviewed, { pay: reviewed.pay }).reviewed).toBe(true);
    const result = updateEmploymentSource(source(), { id: "replacement", reviewed: true } as never);
    expect(result).toMatchObject({ id: "employment-1", reviewed: false });
  });

  it.each(["no", "unknown", null] as const)("retains inactive employment records and explicitly labels them in export for %j", answer => {
    const value = draft();
    value.circumstances.employment = answer;
    value.employmentSources = [reviewEmploymentSource(source({ notes: "Retained note" }), "2025-26", true, TODAY)];
    const before = structuredClone(value);
    expect(derivePreparationReview(value, TODAY).employment).toEqual({ active: false, total: 1, reviewed: 0, unresolved: 0, inactive: 1 });
    const summary = exportPreparationSummary(value, { includeFigures: true, includeNotes: true }, TODAY);
    expect(summary).toContain("Inactive employment documents");
    expect(summary).toContain("Example employer");
    expect(summary).toContain("31000.50");
    expect(summary).toContain("Retained note");
    expect(value).toEqual(before);
    value.circumstances.employment = "yes";
    expect(derivePreparationReview(value, TODAY).employment.reviewed).toBe(1);
  });

  it("retains inactive generic evidence without counting it as active reviewed evidence", () => {
    const value = draft();
    value.circumstances.property = "no";
    value.evidence.property = "collected";
    expect(exportPreparationSummary(value, {}, TODAY)).toContain("Inactive saved evidence note: collected");
    value.circumstances.property = "yes";
    expect(derivePreparationReview(value, TODAY).checklist.find(item => item.id === "property")?.status).toBe("collected");
  });

  it("warns about repeated employer or source labels without merging records or adding figures", () => {
    const value = draft();
    value.circumstances.employment = "yes";
    value.employmentSources = [source(), source({ id: "second", employerName: "  EXAMPLE EMPLOYER ", documentType: "P45", sourceLabel: "P45" })];
    const before = structuredClone(value);
    expect(derivePreparationReview(value, TODAY).warnings).toHaveLength(1);
    const summary = exportPreparationSummary(value, { includeFigures: true }, TODAY);
    expect(summary).toContain("Check for overlap");
    expect(summary).toContain("Document 2:");
    expect(summary).not.toContain("62001");
    expect(value).toEqual(before);
    value.employmentSources[1].employerName = "Different employer";
    value.employmentSources[1].sourceLabel = value.employmentSources[0].sourceLabel;
    expect(derivePreparationReview(value, TODAY).warnings).toHaveLength(1);
  });

  it("exports an honest summary with figures and notes omitted by default", () => {
    const value = draft();
    value.employmentSources = [source({ notes: "Sensitive private note" })];
    const summary = exportPreparationSummary(value, {}, TODAY);
    expect(summary).toContain("2025–26 (2025-04-06 to 2026-04-05)");
    expect(summary).toContain("plaintext preparation summary, not a backup");
    expect(summary).toContain("may include unsaved edits");
    expect(summary).not.toContain("31000.50");
    expect(summary).not.toContain("2800.25");
    expect(summary).not.toContain("Sensitive private note");
    expect(summary).toContain("not inspected documents");
    expect(summary).toContain("No information has been sent to HMRC");
  });

  it("keeps blank and explicit zero distinct in a figures-included summary", () => {
    const value = draft();
    value.employmentSources = [source({ pay: "", tax: "0" })];
    expect(exportPreparationSummary(value, { includeFigures: true }, TODAY)).toContain("Pay in this employment: unknown; tax in this employment: 0");
  });

  it("does not turn all user-reviewed evidence into a filing-readiness assertion", () => {
    const value = draft();
    for (const { id } of PREPARATION_CIRCUMSTANCES) value.circumstances[id] = "no";
    value.circumstances.employment = "yes";
    value.employmentSources = [reviewEmploymentSource(source(), "2025-26", true, TODAY)];
    const review = derivePreparationReview(value, TODAY);
    expect(review.unresolved).toBe(0);
    expect(review).not.toHaveProperty("readyToFile");
    expect(exportPreparationSummary(value, {}, TODAY)).toContain("not inspected documents or established completeness, liability or readiness to file");
  });

  it.each(["schema", "year", "purpose", "unknown-field", "missing-answer", "bad-evidence", "duplicate-source", "reviewed-p45", "bad-date", "long-note", "control-label", "invalid-amount", "too-many"])("rejects malformed persisted data: %s", damage => {
    const value = draft();
    value.employmentSources = [source()];
    if (damage === "schema") Object.assign(value, { schema: "future" });
    if (damage === "year") Object.assign(value, { year: "2024-25" });
    if (damage === "purpose") Object.assign(value, { purpose: "file-now" });
    if (damage === "unknown-field") Object.assign(value, { secret: "not permitted" });
    if (damage === "missing-answer") Reflect.deleteProperty(value.circumstances, "property");
    if (damage === "bad-evidence") Object.assign(value.evidence, { pension: "verified" });
    if (damage === "duplicate-source") value.employmentSources.push(source());
    if (damage === "reviewed-p45") Object.assign(value.employmentSources[0], { reviewed: true, documentType: "P45" });
    if (damage === "bad-date") value.createdAt = "2026-02-30T12:00:00.000Z";
    if (damage === "long-note") value.employmentSources[0].notes = "x".repeat(2001);
    if (damage === "control-label") value.employmentSources[0].sourceLabel = "forged\nheading";
    if (damage === "invalid-amount") value.employmentSources[0].pay = "12.999";
    if (damage === "too-many") value.employmentSources = Array.from({ length: 51 }, (_, index) => source({ id: `source-${index}` }));
    expect(() => assertPreparationDraft(value)).toThrow();
    expect(() => exportPreparationSummary(value, {}, TODAY)).toThrow();
  });
});
