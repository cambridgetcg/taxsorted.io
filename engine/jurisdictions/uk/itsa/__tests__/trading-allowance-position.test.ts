import { describe, expect, it } from "vitest";
import { tradingAllowancePosition } from "../index";

const base = {
  totalRelevantIncome: 500_000,
  ordinaryMethodDeductions: 60_000,
  excludedIncome: "none" as const,
  factPeriodState: "full-year-projection" as const,
  rentARoomReceipts: "none" as const,
  relevantIncomeBoundary: "complete-continuing-trade" as const,
  tradeScope: "single-trade-complete" as const,
  basisPeriodTransitionProfit: "no-amount-arises" as const,
  taxYear: "2026-27" as const,
  evaluationDate: "2026-08-25",
};

describe("trading allowance Review Line position", () => {
  it("returns needs_review without figures when payer records are unresolved", () => {
    const result = tradingAllowancePosition({ ...base, excludedIncome: "unknown" });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason).toMatchObject({
      code: "excluded-income-unknown",
      nextFact: expect.stringMatching(/every payment within relevant trading or miscellaneous income/i),
    });
  });

  it("derives allowance availability from checked unconnected-customer records", () => {
    const result = tradingAllowancePosition(base);

    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;
    expect(result.calculation).toEqual({
      factPeriodState: "full-year-projection",
      route: "trading-allowance",
      totalRelevantIncome: 500_000,
      ordinaryMethodDeductions: 60_000,
      allowanceLimit: 100_000,
      routeActions: {
        tradingAllowance: "If completed facts match this scenario, partial relief requires an election in Self Assessment. The normal on-time limit is 31 January 2029. This result does not make that election.",
        ordinaryMethod: "If completed facts match this scenario, the ordinary profit rules apply; retain evidence for every deduction claimed.",
        normalElectionDeadline: "2029-01-31",
        lateElectionReview: "A late return may include the election after this date within the general four-year claim limit. This module does not decide whether that route is available or in time.",
      },
      allowanceDeduction: 100_000,
      allowanceAvailable: true,
      tradingAllowanceProfit: 400_000,
      ordinaryMethodProfit: 440_000,
    });
  });

  it("derives the exclusion and removes the allowance route for employer income", () => {
    const result = tradingAllowancePosition({ ...base, excludedIncome: "present" });

    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;
    expect(result.calculation).toMatchObject({
      route: "ordinary-method",
      allowanceDeduction: null,
      allowanceAvailable: false,
      tradingAllowanceProfit: null,
      ordinaryMethodProfit: 440_000,
    });
  });

  it("never invents an opt-out election for excluded employer income below £1,000", () => {
    const result = tradingAllowancePosition({
      ...base,
      totalRelevantIncome: 80_000,
      ordinaryMethodDeductions: 10_000,
      excludedIncome: "present",
    });

    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;
    expect(result.calculation.routeActions.tradingAllowance).toBeNull();
    expect(result.calculation.routeActions.ordinaryMethod).toMatch(/no allowance election is available/i);
    expect(result.calculation.routeActions.ordinaryMethod).not.toMatch(/full relief not to apply/i);
  });

  it("reports the actual deduction when full relief is less than the £1,000 limit", () => {
    const result = tradingAllowancePosition({
      ...base,
      totalRelevantIncome: 80_000,
      ordinaryMethodDeductions: 10_000,
    });

    expect(result.status).toBe("calculated");
    if (result.status !== "calculated") return;
    expect(result.calculation).toMatchObject({
      allowanceLimit: 100_000,
      allowanceDeduction: 80_000,
      tradingAllowanceProfit: 0,
    });
  });

  it("keeps full and partial relief on their exact £1,000 boundary", () => {
    const fullRelief = tradingAllowancePosition({
      ...base,
      totalRelevantIncome: 100_000,
      ordinaryMethodDeductions: 50_000,
    });
    const partialRelief = tradingAllowancePosition({
      ...base,
      totalRelevantIncome: 100_001,
      ordinaryMethodDeductions: 50_000,
    });

    expect(fullRelief.status).toBe("calculated");
    expect(partialRelief.status).toBe("calculated");
    if (fullRelief.status !== "calculated" || partialRelief.status !== "calculated") return;

    expect(fullRelief.calculation).toMatchObject({
      allowanceLimit: 100_000,
      allowanceDeduction: 100_000,
      tradingAllowanceProfit: 0,
    });
    expect(fullRelief.calculation.routeActions.tradingAllowance).toMatch(
      /full relief can apply without a partial-relief election/i,
    );
    expect(fullRelief.calculation.routeActions.ordinaryMethod).toMatch(
      /requires an election for full relief not to apply/i,
    );

    expect(partialRelief.calculation).toMatchObject({
      allowanceLimit: 100_000,
      allowanceDeduction: 100_000,
      tradingAllowanceProfit: 1,
    });
    expect(partialRelief.calculation.routeActions.tradingAllowance).toMatch(
      /partial relief requires an election/i,
    );
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
      excludedIncome: "unknown",
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
      "https://www.legislation.gov.uk/ukpga/2005/5/section/783A",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86000",
      "https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86027",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86029",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86007",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86010",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86015",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86018",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim81310",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86030",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86032",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86036",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86074",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86034",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86038",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86050",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86046",
      "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86048",
    ]);
    expect(result.trust.effectiveFrom).toBe("2026-04-06");
    expect(result.trust.legalBasisFrom).toBe("2017-04-06");
    expect(result.trust.reviewedOn).toBe("2026-08-25");
    expect(result.trust.reviewDueOn).toBe("2026-11-25");
    expect(result.trust.evaluatedOn).toBe("2026-08-25");
    expect(result.trust.rulesetVersion).toBe("uk-itsa-trading-allowance/2026-27.2");
    expect(result.trust.taxYear).toBe("2026-27");
    expect(result.trust.taxYearStart).toBe("2026-04-06");
    expect(result.trust.taxYearEnd).toBe("2027-04-05");
    expect(result.trust.capability).toEqual({
      maximumState: "calculated",
      wholeBurdenCompared: false,
    });
    expect(result.trust.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "primary legislation",
          force: "law",
        }),
        expect.objectContaining({
          kind: expect.any(String),
          force: "guidance",
          retrievedOn: "2026-08-25",
          supports: expect.any(String),
          doesNotProve: expect.any(String),
        }),
      ]),
    );
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

  it("returns a clean stop instead of throwing or mislabelling another tax year", () => {
    const result = tradingAllowancePosition({ ...base, taxYear: "2027-28" as never });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason?.code).toBe("tax-year-unsupported");
    expect(result.trust.taxYear).toBe("2026-27");
  });

  it("fails closed when a JavaScript caller supplies a malformed excluded-income fact", () => {
    for (const excludedIncome of [undefined, null, "typo", false]) {
      const result = tradingAllowancePosition({
        ...base,
        excludedIncome: excludedIncome as never,
      });

      expect(result.status).toBe("needs_review");
      expect(result.calculation).toBeNull();
      expect(result.reason?.code).toBe("excluded-income-invalid");
    }
  });

  it("fails closed unless every fact has an explicit whole-year state", () => {
    for (const factPeriodState of [undefined, null, "typo", false]) {
      const result = tradingAllowancePosition({
        ...base,
        factPeriodState: factPeriodState as never,
      });

      expect(result.status).toBe("needs_review");
      expect(result.calculation).toBeNull();
      expect(result.reason?.code).toBe("fact-period-state-invalid");
    }

    const unknown = tradingAllowancePosition({ ...base, factPeriodState: "unknown" });
    expect(unknown.status).toBe("needs_review");
    expect(unknown.reason?.code).toBe("fact-period-state-unknown");

    const partial = tradingAllowancePosition({ ...base, factPeriodState: "year-to-date" });
    expect(partial.status).toBe("needs_review");
    expect(partial.calculation).toBeNull();
    expect(partial.reason?.code).toBe("year-to-date-figures");
    expect(partial.reason?.text).toMatch(/later income.*transition profit/i);

    const premature = tradingAllowancePosition({ ...base, factPeriodState: "completed-tax-year" });
    expect(premature.status).toBe("needs_review");
    expect(premature.calculation).toBeNull();
    expect(premature.reason?.code).toBe("tax-year-not-complete");
  });

  it("fails closed when the Rent-a-Room fact is malformed", () => {
    for (const rentARoomReceipts of [undefined, null, "typo", false]) {
      const result = tradingAllowancePosition({
        ...base,
        rentARoomReceipts: rentARoomReceipts as never,
      });

      expect(result.status).toBe("needs_review");
      expect(result.calculation).toBeNull();
      expect(result.reason?.code).toBe("rent-a-room-receipts-invalid");
    }
  });

  it("fails closed when the relevant-income boundary is malformed", () => {
    for (const relevantIncomeBoundary of [undefined, null, "typo", false]) {
      const result = tradingAllowancePosition({
        ...base,
        relevantIncomeBoundary: relevantIncomeBoundary as never,
      });

      expect(result.status).toBe("needs_review");
      expect(result.calculation).toBeNull();
      expect(result.reason?.code).toBe("relevant-income-boundary-invalid");
    }
  });

  it("stops when 2026–27 transition profit is unresolved or present", () => {
    for (const basisPeriodTransitionProfit of [undefined, null, "typo", false]) {
      const result = tradingAllowancePosition({
        ...base,
        basisPeriodTransitionProfit: basisPeriodTransitionProfit as never,
      });

      expect(result.status).toBe("needs_review");
      expect(result.reason?.code).toBe("basis-period-transition-profit-invalid");
    }

    const unknown = tradingAllowancePosition({ ...base, basisPeriodTransitionProfit: "unknown" });
    expect(unknown.status).toBe("needs_review");
    expect(unknown.calculation).toBeNull();
    expect(unknown.reason?.code).toBe("basis-period-transition-profit-unknown");

    const present = tradingAllowancePosition({ ...base, basisPeriodTransitionProfit: "amount-arises" });
    expect(present.status).toBe("needs_review");
    expect(present.calculation).toBeNull();
    expect(present.reason?.code).toBe("basis-period-transition-profit-present");
    expect(present.reason?.text).toMatch(/increase.*chargeable trading profit|separate chargeable-profit/i);
  });

  it("stops before applying the allowance to special or incompletely measured income", () => {
    const result = tradingAllowancePosition({
      ...base,
      totalRelevantIncome: 100_000,
      relevantIncomeBoundary: "needs-review",
    });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason?.code).toBe("relevant-income-boundary-needs-review");
    expect(result.reason?.text).toMatch(/adjustment income or a post-cessation receipt/i);
  });

  it("stops for Rent-a-Room receipts instead of assuming their election treatment", () => {
    const result = tradingAllowancePosition({ ...base, rentARoomReceipts: "present" });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason?.code).toBe("rent-a-room-receipts-present");
    expect(result.reason?.nextFact).toMatch(/relief limit and any election/i);
  });

  it("never nets separate trades into one apparently profitable calculation", () => {
    const result = tradingAllowancePosition({
      ...base,
      totalRelevantIncome: 1_200_000,
      ordinaryMethodDeductions: 250_000,
      tradeScope: "additional-relevant-income",
    });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason?.code).toBe("additional-relevant-income");
    expect(result.reason?.text).toMatch(/total relevant income and each trade computation/i);
  });

  it("stops when its source review is overdue", () => {
    const result = tradingAllowancePosition({ ...base, evaluationDate: "2026-11-26" });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason?.code).toBe("source-overdue");
  });

  it("refuses a receipt dated before the source review existed", () => {
    const result = tradingAllowancePosition({ ...base, evaluationDate: "2026-08-24" });

    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reason?.code).toBe("source-review-not-yet-valid");
  });

  it("carries the election needed to turn a calculated route into an action", () => {
    const partial = tradingAllowancePosition(base);
    const full = tradingAllowancePosition({ ...base, totalRelevantIncome: 80_000 });

    expect(partial.status === "calculated" && partial.calculation.routeActions.tradingAllowance)
      .toMatch(/requires an election in Self Assessment/i);
    expect(full.status === "calculated" && full.calculation.routeActions.ordinaryMethod)
      .toMatch(/requires an election for full relief not to apply/i);
    expect(partial.status === "calculated" && partial.calculation.routeActions.normalElectionDeadline)
      .toBe("2029-01-31");
    expect(partial.status === "calculated" && partial.calculation.routeActions.lateElectionReview)
      .toMatch(/late return.*general four-year claim limit/i);
  });
});
