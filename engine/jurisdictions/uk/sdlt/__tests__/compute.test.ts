import { describe, expect, it } from "vitest";
import {
  calculateResidentialSdlt,
  type ResidentialSdltInput,
  type SdltCalculated,
} from "../index";

function ordinaryInput(
  chargeableConsiderationPence: number,
  overrides: Partial<ResidentialSdltInput> = {}
): ResidentialSdltInput {
  return {
    effectiveDate: "2026-07-10",
    chargeableConsiderationPence,
    land: {
      jurisdiction: "england",
      use: "residential",
      interest: "freehold",
      dwellingCount: 1,
    },
    buyerKind: "individual",
    treatment: {
      firstTimeBuyerRelief: "do-not-claim",
      higherRates: "standard",
      nonResidentSurcharge: "do-not-apply",
    },
    specialCases: {
      linkedTransactions: false,
      sharedOwnership: false,
      otherReliefClaimed: false,
      complexConsideration: false,
      transitionalContractMayApply: false,
    },
    ...overrides,
  };
}

function calculated(input: ResidentialSdltInput): SdltCalculated {
  const result = calculateResidentialSdlt(input);
  expect(result.status).toBe("calculated");
  if (result.status !== "calculated") {
    throw new Error(`expected calculated, got ${result.status}`);
  }
  return result;
}

describe("ordinary residential SDLT", () => {
  it.each([
    [0, 0],
    [3_999_999, 0],
    [4_000_000, 0],
    [12_500_000, 0],
    [25_000_000, 250_000],
    [30_000_000, 500_000],
    [92_500_000, 3_625_000],
    [150_000_000, 9_375_000],
    [200_000_000, 15_375_000],
  ])("calculates standard tax on %i pence", (consideration, taxDue) => {
    expect(calculated(ordinaryInput(consideration)).calculation.taxDuePence).toBe(taxDue);
  });

  it("matches HMRC's £295,000 worked example and shows every band", () => {
    const result = calculated(ordinaryInput(29_500_000));
    expect(result.calculation.taxDuePence).toBe(475_000);
    expect(result.calculation.bands.map((band) => [band.amountTaxedPence, band.rateBasisPoints])).toEqual([
      [12_500_000, 0],
      [12_500_000, 200],
      [4_500_000, 500],
    ]);
    expect(result.calculation.bands.reduce((sum, band) => sum + band.amountTaxedPence, 0)).toBe(
      29_500_000
    );
  });

  it.each([
    [12_500_001, 0],
    [12_504_999, 0],
    [12_505_000, 100],
    [24_999_999, 249_900],
    [25_000_000, 250_000],
    [25_000_001, 250_000],
    [92_499_999, 3_624_900],
    [92_500_000, 3_625_000],
    [149_999_999, 9_374_900],
    [150_000_000, 9_375_000],
  ])("rounds only the final tax down to whole pounds at %i pence", (consideration, taxDue) => {
    const result = calculated(ordinaryInput(consideration));
    expect(result.calculation.taxDuePence).toBe(taxDue);
    expect(result.calculation.taxDuePence % 100).toBe(0);
    expect(result.calculation.roundingAdjustmentPence).toBeGreaterThanOrEqual(0);
    expect(result.calculation.roundingAdjustmentPence).toBeLessThan(100);
  });
});

describe("reliefs and surcharges", () => {
  it("matches HMRC's £300,000 additional-dwelling example", () => {
    const result = calculated(
      ordinaryInput(30_000_000, {
        treatment: {
          firstTimeBuyerRelief: "do-not-claim",
          higherRates: "additional-dwelling",
          nonResidentSurcharge: "do-not-apply",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(2_000_000);
    expect(result.calculation.treatmentsApplied).toContain("higher-rates-transaction");
  });

  it("matches HMRC's £700,000 non-resident example", () => {
    const result = calculated(
      ordinaryInput(70_000_000, {
        treatment: {
          firstTimeBuyerRelief: "do-not-claim",
          higherRates: "standard",
          nonResidentSurcharge: "apply",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(3_900_000);
  });

  it("stacks the additional-dwelling and non-resident surcharges", () => {
    const result = calculated(
      ordinaryInput(30_000_000, {
        treatment: {
          firstTimeBuyerRelief: "do-not-claim",
          higherRates: "additional-dwelling",
          nonResidentSurcharge: "apply",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(2_600_000);
    expect(result.calculation.bands.map((band) => band.rateBasisPoints)).toEqual([700, 900, 1_200]);
  });

  it("does not apply either surcharge below £40,000, even when the classifications are unknown", () => {
    const result = calculated(
      ordinaryInput(3_999_999, {
        treatment: {
          firstTimeBuyerRelief: "do-not-claim",
          higherRates: "unknown",
          nonResidentSurcharge: "unknown",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(0);
    expect(result.calculation.treatmentsApplied).toEqual(["standard-residential"]);
  });

  it("activates both surcharges at exactly £40,000", () => {
    const result = calculated(
      ordinaryInput(4_000_000, {
        treatment: {
          firstTimeBuyerRelief: "do-not-claim",
          higherRates: "additional-dwelling",
          nonResidentSurcharge: "apply",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(280_000);
  });

  it("applies first-time-buyer relief at £500,000", () => {
    const result = calculated(
      ordinaryInput(50_000_000, {
        treatment: {
          firstTimeBuyerRelief: "claim",
          higherRates: "standard",
          nonResidentSurcharge: "do-not-apply",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(1_000_000);
    expect(result.calculation.regime).toBe("first-time-buyer");
  });

  it("stacks first-time-buyer relief with the non-resident surcharge", () => {
    const result = calculated(
      ordinaryInput(50_000_000, {
        treatment: {
          firstTimeBuyerRelief: "claim",
          higherRates: "standard",
          nonResidentSurcharge: "apply",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(2_000_000);
    expect(result.calculation.bands.map((band) => band.rateBasisPoints)).toEqual([200, 700]);
  });

  it("falls wholly back to standard rates one penny above the relief cap", () => {
    const result = calculated(
      ordinaryInput(50_000_001, {
        treatment: {
          firstTimeBuyerRelief: "claim",
          higherRates: "standard",
          nonResidentSurcharge: "do-not-apply",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(1_500_000);
    expect(result.calculation.regime).toBe("standard");
    expect(result.calculation.decisions.map((decision) => decision.code)).toContain(
      "first-time-buyer-over-cap"
    );
  });

  it("uses higher rates and bars first-time relief when both are requested", () => {
    const result = calculated(
      ordinaryInput(50_000_000, {
        treatment: {
          firstTimeBuyerRelief: "claim",
          higherRates: "additional-dwelling",
          nonResidentSurcharge: "do-not-apply",
        },
      })
    );
    expect(result.calculation.taxDuePence).toBe(4_000_000);
    expect(result.calculation.regime).toBe("higher-rates");
    expect(result.calculation.decisions.map((decision) => decision.code)).toContain(
      "first-time-buyer-barred-by-higher-rates"
    );
  });
});

describe("honest review boundary", () => {
  it("does not guess either surcharge at or above £40,000", () => {
    const result = calculateResidentialSdlt(
      ordinaryInput(4_000_000, {
        treatment: {
          firstTimeBuyerRelief: "do-not-claim",
          higherRates: "unknown",
          nonResidentSurcharge: "unknown",
        },
      })
    );
    expect(result.status).toBe("needs_review");
    if (result.status === "needs_review") {
      expect(result.reviewReasons.map((reason) => reason.code)).toEqual([
        "higher-rates-status-unknown",
        "non-resident-status-unknown",
      ]);
      expect("calculation" in result && result.calculation).toBeNull();
    }
  });

  it("does not guess first-time-buyer treatment when it could change the result", () => {
    const result = calculateResidentialSdlt(
      ordinaryInput(30_000_000, {
        treatment: {
          firstTimeBuyerRelief: "unknown",
          higherRates: "standard",
          nonResidentSurcharge: "do-not-apply",
        },
      })
    );
    expect(result.status).toBe("needs_review");
    if (result.status === "needs_review") {
      expect(result.reviewReasons.map((reason) => reason.code)).toContain(
        "first-time-buyer-status-unknown"
      );
    }
  });

  it.each([
    ["new lease", { land: { jurisdiction: "england", use: "residential", interest: "new-lease", dwellingCount: 1 } }, "new-lease-rent"],
    ["mixed land", { land: { jurisdiction: "england", use: "mixed", interest: "freehold", dwellingCount: 1 } }, "mixed-or-non-residential"],
    ["company", { buyerKind: "company" }, "company-purchaser"],
    ["linked transactions", { specialCases: { linkedTransactions: true, sharedOwnership: false, otherReliefClaimed: false, complexConsideration: false, transitionalContractMayApply: false } }, "linked-transactions"],
    ["more than one dwelling", { land: { jurisdiction: "england", use: "residential", interest: "freehold", dwellingCount: 2 } }, "multiple-dwellings"],
  ] as const)("returns needs_review for %s", (_label, override, code) => {
    const result = calculateResidentialSdlt(ordinaryInput(30_000_000, override));
    expect(result.status).toBe("needs_review");
    if (result.status === "needs_review") {
      expect(result.reviewReasons.map((reason) => reason.code)).toContain(code);
      expect(result.calculation).toBeNull();
    }
  });

  it("will not use the current table for a date before its legal coverage", () => {
    const old = calculateResidentialSdlt(ordinaryInput(30_000_000, { effectiveDate: "2025-03-31" }));
    expect(old.status).toBe("needs_review");
    if (old.status === "needs_review") {
      expect(old.reviewReasons.map((reason) => reason.code)).toContain("rule-date-unsupported");
    }
  });

  it("keeps an ongoing legal table separate from its visible research review date", () => {
    const result = calculated(ordinaryInput(30_000_000, { effectiveDate: "2026-07-11" }));
    expect(result.calculation.taxDuePence).toBe(500_000);
    expect(result.trust.ruleset.effectiveTo).toBeNull();
    expect(result.trust.ruleset.reviewedOn).toBe("2026-07-10");
  });

  it("links shared ownership and complex consideration to their actual schedules", () => {
    const shared = calculateResidentialSdlt(
      ordinaryInput(30_000_000, {
        specialCases: {
          linkedTransactions: false,
          sharedOwnership: true,
          otherReliefClaimed: false,
          complexConsideration: false,
          transitionalContractMayApply: false,
        },
      })
    );
    const complex = calculateResidentialSdlt(
      ordinaryInput(30_000_000, {
        specialCases: {
          linkedTransactions: false,
          sharedOwnership: false,
          otherReliefClaimed: false,
          complexConsideration: true,
          transitionalContractMayApply: false,
        },
      })
    );
    expect(shared.status).toBe("needs_review");
    expect(complex.status).toBe("needs_review");
    if (shared.status === "needs_review") {
      expect(
        shared.reviewReasons.find((reason) => reason.code === "shared-ownership")?.sourceIds
      ).toEqual(["fa2003-sch9"]);
    }
    if (complex.status === "needs_review") {
      expect(
        complex.reviewReasons.find((reason) => reason.code === "complex-consideration")
          ?.sourceIds
      ).toEqual(["fa2003-sch4"]);
    }
  });
});
