import { describe, it, expect } from "vitest";
import {
  adjustedNetIncome,
  annualChildBenefit,
  highIncomeChildBenefitCharge,
  pensionAnnualAllowance,
  personalAllowanceFor,
  planUKPersonalTax,
} from "../index";

describe("UK personal threshold optimiser — 2026/27", () => {
  it("computes adjusted net income with grossed-up pension and Gift Aid reliefs", () => {
    const ani = adjustedNetIncome({
      employmentIncome: 110_000,
      dividendIncome: 1_000,
      reliefAtSourcePensionContributionsNet: 8_000,
      giftAidDonationsNet: 800,
    });
    expect(ani.totalTaxableIncome).toBe(111_000);
    expect(ani.reliefs.reliefAtSourcePensionGrossedUp).toBe(10_000);
    expect(ani.reliefs.giftAidGrossedUp).toBe(1_000);
    expect(ani.adjustedNetIncome).toBe(100_000);
  });

  it("models the Personal Allowance taper", () => {
    expect(personalAllowanceFor(100_000)).toEqual({ amount: 12_570, lost: 0, fullyLost: false });
    expect(personalAllowanceFor(110_000)).toEqual({ amount: 7_570, lost: 5_000, fullyLost: false });
    expect(personalAllowanceFor(125_140)).toEqual({ amount: 0, lost: 12_570, fullyLost: true });
    expect(personalAllowanceFor(200_000)).toEqual({ amount: 0, lost: 12_570, fullyLost: true });
  });

  it("estimates Child Benefit and HICBC across the 60k–80k band", () => {
    expect(annualChildBenefit(0)).toBe(0);
    expect(annualChildBenefit(1)).toBeCloseTo(1406.6, 2);
    expect(annualChildBenefit(2)).toBeCloseTo(2337.4, 2);

    expect(highIncomeChildBenefitCharge(60_000, 2_337.4)).toEqual({ applies: false, chargePercent: 0, estimatedCharge: 0 });
    expect(highIncomeChildBenefitCharge(70_000, 2_337.4)).toEqual({ applies: true, chargePercent: 50, estimatedCharge: 1168.7 });
    expect(highIncomeChildBenefitCharge(80_000, 2_337.4)).toEqual({ applies: true, chargePercent: 100, estimatedCharge: 2337.4 });
  });

  it("surfaces legal moves to escape the Child Benefit clawback", () => {
    const plan = planUKPersonalTax({ employmentIncome: 70_000, children: 2, partnerAdjustedNetIncome: 30_000 });
    expect(plan.adjustedNetIncome.adjustedNetIncome).toBe(70_000);
    expect(plan.highIncomeChildBenefitCharge.chargePercent).toBe(50);
    expect(plan.highIncomeChildBenefitCharge.estimatedCharge).toBeCloseTo(1168.7, 2);
    expect(plan.warnings.some((w) => w.code === "HICBC_TAPER")).toBe(true);
    const move = plan.moves.find((m) => m.title.includes("£60,000"));
    expect(move?.grossAmount).toBe(10_000);
    expect(move?.estimatedNetCost).toBe(8_000);
    expect(move?.lever).toBe("pension");
  });

  it("surfaces the Personal Allowance 60% trap around £100k", () => {
    const plan = planUKPersonalTax({ employmentIncome: 112_000 });
    expect(plan.personalAllowance.lost).toBe(6_000);
    expect(plan.warnings.some((w) => w.code === "PERSONAL_ALLOWANCE_TAPER")).toBe(true);
    const move = plan.moves.find((m) => m.title.includes("£100,000"));
    expect(move?.grossAmount).toBe(12_000);
    expect(move?.estimatedNetCost).toBe(9_600);
    expect(move?.why).toMatch(/60%/);
  });

  it("removes the Personal Allowance warning when relief-at-source pension brings ANI back to 100k", () => {
    const plan = planUKPersonalTax({
      employmentIncome: 112_000,
      reliefAtSourcePensionContributionsNet: 9_600,
    });
    expect(plan.adjustedNetIncome.adjustedNetIncome).toBe(100_000);
    expect(plan.personalAllowance.lost).toBe(0);
    expect(plan.warnings.some((w) => w.code === "PERSONAL_ALLOWANCE_TAPER")).toBe(false);
  });

  it("checks pension annual allowance taper and excess input", () => {
    const pa = pensionAnnualAllowance({
      pensionInputAmount: 55_000,
      thresholdIncomeForPensionTaper: 230_000,
      adjustedIncomeForPensionTaper: 300_000,
    }, 230_000);
    expect(pa.tapered).toBe(true);
    expect(pa.annualAllowance).toBe(40_000);
    expect(pa.excessInput).toBe(15_000);
  });

  it("applies the Money Purchase Annual Allowance warning when flexibly accessed", () => {
    const plan = planUKPersonalTax({ employmentIncome: 50_000, pensionInputAmount: 12_000, flexiblyAccessedPension: true });
    expect(plan.pensionAnnualAllowance.annualAllowance).toBe(10_000);
    expect(plan.pensionAnnualAllowance.excessInput).toBe(2_000);
    expect(plan.warnings.some((w) => w.code === "PENSION_ANNUAL_ALLOWANCE")).toBe(true);
  });

  it("flags dividend and CGT planning reminders without inventing fake loopholes", () => {
    const plan = planUKPersonalTax({ employmentIncome: 40_000, dividendIncome: 2_000, capitalGains: 10_000 });
    expect(plan.warnings.some((w) => w.code === "DIVIDEND_ALLOWANCE")).toBe(true);
    expect(plan.warnings.some((w) => w.code === "CGT_AEA")).toBe(true);
    expect(plan.moves.some((m) => m.lever === "isa")).toBe(true);
    expect(plan.moves.some((m) => m.lever === "timing")).toBe(true);
    expect(plan.moves.flatMap((m) => m.caveats).join(" ")).toMatch(/artificial|lawful|documented|eligibility/i);
  });

  it("states the Scotland scope caveat", () => {
    const plan = planUKPersonalTax({ employmentIncome: 90_000, taxpayerRegion: "scotland" });
    expect(plan.warnings.some((w) => w.code === "SCOTTISH_RATES_SCOPE")).toBe(true);
  });
});
