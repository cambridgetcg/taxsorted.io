import { describe, expect, it } from "vitest";
import { parseVatExampleGuidedAmount } from "../guided";

describe("parseVatExampleGuidedAmount", () => {
  it("requires an explicit amount instead of treating blank as zero", () => {
    expect(parseVatExampleGuidedAmount("", "sales")).toEqual({
      ok: false,
      error: "Enter sales, or enter 0 if there was none.",
    });
    expect(parseVatExampleGuidedAmount("0", "sales")).toEqual({ ok: true, value: 0 });
  });

  it("accepts at most two decimal places", () => {
    expect(parseVatExampleGuidedAmount("12.34", "sales")).toEqual({ ok: true, value: 12.34 });
    expect(parseVatExampleGuidedAmount("12.345", "sales").ok).toBe(false);
    expect(parseVatExampleGuidedAmount("1e3", "sales").ok).toBe(false);
  });

  it("keeps the example non-negative", () => {
    expect(parseVatExampleGuidedAmount("-1", "sales")).toEqual({
      ok: false,
      error: "sales cannot be negative in this example.",
    });
  });
});
