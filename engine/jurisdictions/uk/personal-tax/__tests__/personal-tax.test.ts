import { describe, expect, it } from "vitest";
import { compareUkIncomeAndGains, computeUkCgt, computeUkIncomeTax, personalAllowanceFor } from "../index";

describe("UK personal tax teaching engine", () => {
  it("computes the personal allowance taper", () => {
    expect(personalAllowanceFor(100_000).allowance).toBe(12_570);
    expect(personalAllowanceFor(110_000).allowance).toBe(7_570);
    expect(personalAllowanceFor(125_140).allowance).toBe(0);
  });

  it("shows the 60% marginal income-tax trap between £100k and £125,140", () => {
    const result = computeUkIncomeTax({ employmentIncome: 110_000 });
    expect(result.personalAllowanceLost).toBe(5_000);
    expect(result.marginalRateApprox).toBeCloseTo(0.60, 6);
  });

  it("keeps £125,140 entirely out of the additional-rate slice", () => {
    const result = computeUkIncomeTax({ employmentIncome: 125_140 });
    expect(result.personalAllowance).toBe(0);
    expect(result.additionalTax).toBe(0);
    expect(result.totalIncomeTax).toBe(42_516);
  });

  it("computes simple employment income tax for an £80k earner", () => {
    const result = computeUkIncomeTax({ employmentIncome: 80_000 });
    expect(result.personalAllowance).toBe(12_570);
    expect(result.taxableIncome).toBe(67_430);
    expect(result.basicTax).toBe(7_540);
    expect(result.higherTax).toBe(11_892);
    expect(result.totalIncomeTax).toBe(19_432);
  });

  it("compares £80k as work income vs capital gain", () => {
    const result = compareUkIncomeAndGains(80_000);
    expect(result.asEmploymentIncome).toBe(19_432);
    expect(result.asCapitalGain).toBe(16_218);
    expect(result.difference).toBe(3_214);
  });

  it("applies annual exempt amount and higher-rate CGT", () => {
    const result = computeUkCgt({ gains: 80_000, taxableIncomeBeforeGains: 67_430 });
    expect(result.annualExemptAmount).toBe(3_000);
    expect(result.taxableGains).toBe(77_000);
    expect(result.cgt).toBe(18_480);
  });

  it("uses 18% for BADR in 2026/27 teaching config", () => {
    const result = computeUkCgt({ gains: 1_000_000, relief: "badr" });
    expect(result.cgt).toBe(179_460); // (1,000,000 - 3,000) * 18%
  });
});
