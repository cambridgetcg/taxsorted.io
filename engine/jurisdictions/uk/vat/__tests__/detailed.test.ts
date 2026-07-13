import { describe, expect, it } from "vitest";
import {
  parseVatExampleDetailedAmount,
  validateVatExampleDetailedTotals,
} from "../detailed";

describe("detailed VAT draft input", () => {
  it("keeps incomplete human input separate from numeric zero", () => {
    expect(parseVatExampleDetailedAmount("", "Box 1", false).ok).toBe(false);
    expect(parseVatExampleDetailedAmount("12.", "Box 1", false)).toEqual({
      ok: true,
      value: 12,
    });
  });

  it("accepts pennies only in decimal boxes", () => {
    expect(parseVatExampleDetailedAmount("12.34", "Box 1", false)).toEqual({
      ok: true,
      value: 12.34,
    });
    expect(parseVatExampleDetailedAmount("12.34", "Box 6", true)).toEqual({
      ok: false,
      error: "Box 6: enter whole pounds without pence.",
    });
    expect(parseVatExampleDetailedAmount("12", "Box 6", true)).toEqual({ ok: true, value: 12 });
  });

  it("does not broaden the engine's signed-box semantics", () => {
    expect(parseVatExampleDetailedAmount("-10", "Box 1", false)).toEqual({
      ok: false,
      error: "Box 1: negative adjustments are outside this example calculator.",
    });
  });

  it("accepts grouped or pasted pound amounts and diagnoses bad grouping", () => {
    expect(parseVatExampleDetailedAmount("1,000.25", "Box 1", false)).toEqual({
      ok: true,
      value: 1000.25,
    });
    expect(parseVatExampleDetailedAmount("£1,000", "Box 6", true)).toEqual({
      ok: true,
      value: 1000,
    });
    expect(parseVatExampleDetailedAmount("10,00", "Box 6", true)).toEqual({
      ok: false,
      error: "Box 6: use commas only between groups of three digits.",
    });
  });

  it("enforces direct and calculated HMRC v1 maxima inside the example", () => {
    expect(parseVatExampleDetailedAmount("9999999999999.99", "Box 1", false).ok).toBe(
      true,
    );
    expect(parseVatExampleDetailedAmount("10000000000000", "Box 1", false).ok).toBe(
      false,
    );
    expect(parseVatExampleDetailedAmount("9999999999999", "Box 6", true).ok).toBe(true);
    expect(parseVatExampleDetailedAmount("10000000000000", "Box 6", true).ok).toBe(false);

    expect(
      validateVatExampleDetailedTotals({
        totalVatDue: 10_000_000_000_000,
        netVatDue: 100_000_000_000,
      }).map((error) => error.field),
    ).toEqual(["totalVatDue", "netVatDue"]);
  });
});
