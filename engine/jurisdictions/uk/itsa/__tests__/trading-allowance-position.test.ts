import { describe, expect, it } from "vitest";
import { tradingAllowancePosition } from "../index";

const base = {
  totalRelevantIncome: 500_000,
  ordinaryMethodDeductions: 60_000,
  incomeSource: "unconnected-customers" as const,
  taxYear: "2026-27" as const,
};

describe("trading allowance Review Line position", () => {
  it("returns needs_review without figures when payer records are unresolved", () => {
    const result = tradingAllowancePosition({ ...base, incomeSource: "unknown" });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason).toMatchObject({
      code: "income-source-unknown",
      nextFact: expect.stringMatching(/invoices and bank records/i),
    });
  });

  it("derives allowance availability from checked unconnected-customer records", () => {
    const result = tradingAllowancePosition(base);

    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;
    expect(result.calculation).toEqual({
      route: "trading-allowance",
      totalRelevantIncome: 500_000,
      ordinaryMethodDeductions: 60_000,
      allowance: 100_000,
      allowanceAvailable: true,
      tradingAllowanceProfit: 400_000,
      ordinaryMethodProfit: 440_000,
    });
  });

  it("derives the exclusion and removes the allowance route for employer income", () => {
    const result = tradingAllowancePosition({ ...base, incomeSource: "employer" });

    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;
    expect(result.calculation).toMatchObject({
      route: "ordinary-method",
      allowance: null,
      allowanceAvailable: false,
      tradingAllowanceProfit: null,
      ordinaryMethodProfit: 440_000,
    });
  });

  it("locates the arithmetic hinge without turning it into advice", () => {
    const tie = tradingAllowancePosition({ ...base, ordinaryMethodDeductions: 100_000 });
    const ordinaryMethod = tradingAllowancePosition({
      ...base,
      ordinaryMethodDeductions: 140_000,
    });

    expect(tie.status === "calculated" && tie.calculation.route).toBe("same");
    expect(ordinaryMethod.status === "calculated" && ordinaryMethod.calculation.route)
      .toBe("ordinary-method");
  });

  it("stops before silently flattening a possible loss", () => {
    const result = tradingAllowancePosition({ ...base, ordinaryMethodDeductions: 600_000 });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason?.code).toBe("possible-loss");
  });

  it("keeps both independent review boundaries visible", () => {
    const result = tradingAllowancePosition({
      ...base,
      incomeSource: "unknown",
      ordinaryMethodDeductions: 600_000,
    });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason?.text).toMatch(/payer relationship.*deductions exceed/i);
    expect(result.reason?.nextFact).toMatch(/full profit, loss and relief rules/i);
  });

  it("carries source scope and proof limits with every result", () => {
    const result = tradingAllowancePosition(base);

    expect(result.trust.sources.map((source) => source.href)).toEqual([
      "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86015",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86050",
    ]);
    expect(result.trust.effectiveFrom).toBe("2026-04-06");
    expect(result.trust.reviewedOn).toBe("2026-08-04");
    expect(result.trust.doesNotProve.join(" ")).toMatch(/final tax liability/i);
    expect(result.trust.doesNotProve.join(" ")).toMatch(/capital allowances/i);
  });

  it("rejects invalid money rather than silently repairing it", () => {
    expect(() => tradingAllowancePosition({ ...base, ordinaryMethodDeductions: -1 })).toThrow(
      /non-negative integer number of pence/i,
    );
    expect(() => tradingAllowancePosition({ ...base, totalRelevantIncome: 1.5 })).toThrow(
      /non-negative integer number of pence/i,
    );
  });

  it("fails closed when a JavaScript caller supplies a malformed income source", () => {
    for (const incomeSource of [undefined, null, "typo", false]) {
      const result = tradingAllowancePosition({
        ...base,
        incomeSource: incomeSource as never,
      });

      expect(result.status).toBe("needs_review");
      expect(result.calculation).toBeNull();
      expect(result.reason?.code).toBe("income-source-invalid");
    }
  });
});
