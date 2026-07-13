import { describe, expect, it } from "vitest";
import { parseVatExampleGuidedAmount } from "../guided";
import { vatExampleGuidedAmountLimit } from "../example-amount";

const maximum = vatExampleGuidedAmountLimit(0.2);

describe("parseVatExampleGuidedAmount", () => {
  it("requires an explicit amount instead of treating blank as zero", () => {
    expect(parseVatExampleGuidedAmount("", "sales", maximum)).toEqual({
      ok: false,
      error: "Enter sales, or enter 0 if there was none.",
    });
    expect(parseVatExampleGuidedAmount("0", "sales", maximum)).toEqual({
      ok: true,
      value: 0,
    });
  });

  it("accepts at most two decimal places", () => {
    expect(parseVatExampleGuidedAmount("12.34", "sales", maximum)).toEqual({
      ok: true,
      value: 12.34,
    });
    expect(parseVatExampleGuidedAmount("12.345", "sales", maximum).ok).toBe(false);
    expect(parseVatExampleGuidedAmount("1e3", "sales", maximum).ok).toBe(false);
  });

  it("keeps the example non-negative", () => {
    expect(parseVatExampleGuidedAmount("-1", "sales", maximum)).toEqual({
      ok: false,
      error: "sales cannot be negative in this example.",
    });
  });

  it("accepts familiar grouping and a pasted pound sign", () => {
    expect(parseVatExampleGuidedAmount("1,000.00", "sales", maximum)).toEqual({
      ok: true,
      value: 1000,
    });
    expect(parseVatExampleGuidedAmount("£ 1,000.00", "sales", maximum)).toEqual({
      ok: true,
      value: 1000,
    });
    expect(parseVatExampleGuidedAmount("1,00", "sales", maximum)).toEqual({
      ok: false,
      error: "Use commas in sales only between groups of three digits.",
    });
  });

  it("keeps every generated 20% example inside the Box 5 contract limit", () => {
    expect(maximum).toBe(499_999_999_999.95);
    expect(parseVatExampleGuidedAmount(String(maximum), "sales", maximum).ok).toBe(true);
    expect(parseVatExampleGuidedAmount("500000000000", "sales", maximum).ok).toBe(false);
  });
});
