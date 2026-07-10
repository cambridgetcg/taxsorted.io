import { describe, expect, it } from "vitest";
import {
  calculateResidentialSdlt,
  type ResidentialSdltInput,
} from "../index";

const base: ResidentialSdltInput = {
  effectiveDate: "2026-07-10",
  chargeableConsiderationPence: 30_000_000,
  land: {
    jurisdiction: "northern-ireland",
    use: "residential",
    interest: "existing-lease",
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
};

describe("SDLT engine surface", () => {
  it("does not mutate its input and is deterministic", () => {
    const snapshot = structuredClone(base);
    const first = calculateResidentialSdlt(base);
    const second = calculateResidentialSdlt(base);
    expect(base).toEqual(snapshot);
    expect(first).toEqual(second);
  });

  it("keeps the result monotonic across every threshold edge under standard rates", () => {
    const values = [
      0,
      3_999_999,
      4_000_000,
      12_499_999,
      12_500_000,
      12_500_001,
      24_999_999,
      25_000_000,
      25_000_001,
      92_499_999,
      92_500_000,
      92_500_001,
      149_999_999,
      150_000_000,
      150_000_001,
      200_000_000,
    ];
    const taxes = values.map((chargeableConsiderationPence) => {
      const result = calculateResidentialSdlt({ ...base, chargeableConsiderationPence });
      if (result.status !== "calculated") throw new Error(`unexpected ${result.status}`);
      return result.calculation.taxDuePence;
    });
    for (let index = 1; index < taxes.length; index += 1) {
      expect(taxes[index]).toBeGreaterThanOrEqual(taxes[index - 1]!);
    }
  });

  it("rejects unsafe money rather than producing a plausible number", () => {
    for (const value of [
      -1,
      1.2,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      1_000_000_000_001,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      const result = calculateResidentialSdlt({ ...base, chargeableConsiderationPence: value });
      expect(result.status).toBe("invalid_input");
      if (result.status === "invalid_input") {
        expect(result.errors[0]?.code).toBe("invalid-consideration");
      }
    }
  });

  it("rejects impossible calendar dates", () => {
    const result = calculateResidentialSdlt({ ...base, effectiveDate: "2026-02-30" });
    expect(result.status).toBe("invalid_input");
    if (result.status === "invalid_input") {
      expect(result.errors[0]?.code).toBe("invalid-effective-date");
    }
  });
});
