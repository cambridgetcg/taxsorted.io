import { describe, expect, it } from "vitest";
import {
  isVatExampleDetailedInput,
  parseVatExampleDetailedAmount,
} from "../detailed";

describe("detailed VAT draft input", () => {
  it("keeps incomplete human input separate from numeric zero", () => {
    expect(isVatExampleDetailedInput("")).toBe(true);
    expect(isVatExampleDetailedInput("12.")).toBe(true);
    expect(isVatExampleDetailedInput("12.345")).toBe(false);
    expect(parseVatExampleDetailedAmount("", "Box 1", false).ok).toBe(false);
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
    expect(isVatExampleDetailedInput("-10")).toBe(true);
    expect(parseVatExampleDetailedAmount("-10", "Box 1", false)).toEqual({
      ok: false,
      error: "Box 1: negative adjustments are outside this example calculator.",
    });
  });
});
