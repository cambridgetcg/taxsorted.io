import { describe, expect, it } from "vitest";
import { CHECKLIST_SCHEMA, emptyChecklistProgress, parseSavedChecklist } from "../checklist-state";

const valid = () => ({
  schema: CHECKLIST_SCHEMA,
  audience: "landlords",
  checked: { ...emptyChecklistProgress(), landlords: ["mtd-check"] },
});

describe("saved checklist contract", () => {
  it("accepts the supported version with known audience-specific steps", () => {
    expect(parseSavedChecklist(JSON.stringify(valid()))).toEqual(valid());
  });

  it.each([
    "{broken",
    "null",
    JSON.stringify({ ...valid(), schema: "taxsorted.tax-checklist/99" }),
    JSON.stringify({ ...valid(), audience: "unknown" }),
    JSON.stringify({ ...valid(), name: "unexpected profile field" }),
    JSON.stringify({ ...valid(), checked: { ...valid().checked, landlords: ["sole-trader-choices"] } }),
    JSON.stringify({ ...valid(), checked: { ...valid().checked, landlords: ["mtd-check", "mtd-check"] } }),
    JSON.stringify({ ...valid(), checked: { ...valid().checked, unexpected: [] } }),
    " ".repeat(16_385),
  ])("rejects malformed, foreign or unscoped data without returning a partial record", (raw) => {
    expect(parseSavedChecklist(raw)).toBeNull();
  });
});
