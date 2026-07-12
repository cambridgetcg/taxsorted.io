import { describe, expect, it } from "vitest";
import { parsePounds, parsePoundsToQuarterPence } from "../parse";

describe("parsePounds", () => {
  it("keeps blank distinct and accepts human currency formatting", () => {
    expect(parsePounds("  ")).toBe("blank");
    expect(parsePounds("£40,000.50")).toBe(4_000_050);
    expect(parsePounds("40 000.005")).toBe(4_000_001);
  });

  it("rejects negative, malformed and unsafe-pence amounts", () => {
    expect(parsePounds("-1")).toBe("invalid");
    expect(parsePounds("twelve")).toBe("invalid");
    expect(parsePounds("90071992547410")).toBe("invalid");
  });

  it("parses exact quarter-penny ANI without rounding a partner across a boundary", () => {
    expect(parsePoundsToQuarterPence("£100,000.0025")).toBe(40_000_001);
    expect(parsePoundsToQuarterPence("75,000")).toBe(30_000_000);
    expect(parsePoundsToQuarterPence("100000.001")).toBe("invalid");
    expect(parsePoundsToQuarterPence("100000.00251")).toBe("invalid");
  });
});
