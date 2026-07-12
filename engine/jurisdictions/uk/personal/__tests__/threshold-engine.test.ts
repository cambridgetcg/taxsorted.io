import { describe, expect, it } from "vitest";
import {
  assessThresholdInteractions,
  computeRestOfUkNonSavingsIncomeTaxPence,
} from "../index";

const pounds = (value: number) => Math.round(value * 100);
const noPartners = {
  hicbcPartner: { status: "none" as const },
  taxFreeChildcarePartner: { status: "none" as const },
};

describe("strict UK ANI threshold interactions — 2026/27", () => {
  it("keeps a missing total income unknown instead of turning it into zero", () => {
    const result = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: {},
      ...noPartners,
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });

    expect(result.adjustedNetIncome.status).toBe("needs-facts");
    expect(result.adjustedNetIncome.amountPence).toBeNull();
    expect(result.personalAllowance.status).toBe("needs-facts");
    expect(result.taxFreeChildcare.status).toBe("needs-facts");
    expect(result.taxFreeChildcare.missingFacts).toContain(
      "individual.totalTaxableIncomePence",
    );
  });

  it("rejects malformed and negative money rather than silently reading it as zero", () => {
    expect(() => assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: -1 },
      ...noPartners,
    })).toThrow(/non-negative integer number of pence/i);

    expect(() => assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: 100.5 },
      ...noPartners,
    })).toThrow(/integer number of pence/i);
  });

  it("follows HMRC's ANI steps, including grossed-up Gift Aid", () => {
    const result = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: {
        totalTaxableIncomePence: pounds(115_000),
        netIncomeDeductionsPence: pounds(10_000),
        giftAidDonationsNetPence: pounds(10_000),
      },
      ...noPartners,
    });

    expect(result.adjustedNetIncome.giftAidGrossedUpPence).toBe(pounds(12_500));
    expect(result.adjustedNetIncome.amountPence).toBe(pounds(92_500));
  });

  it("preserves quarter-pence gross-ups through the exact £100,000 test", () => {
    const twoPenceGiftAid = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: {
        totalTaxableIncomePence: pounds(100_000) + 3,
        giftAidDonationsNetPence: 2,
      },
      ...noPartners,
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });

    expect(twoPenceGiftAid.adjustedNetIncome.giftAidGrossedUpQuarterPence).toBe(10);
    expect(twoPenceGiftAid.adjustedNetIncome.amountQuarterPence).toBe(
      pounds(100_000) * 4 + 2,
    );
    expect(twoPenceGiftAid.adjustedNetIncome.amountPence).toBe(pounds(100_000) + 1);
    expect(twoPenceGiftAid.taxFreeChildcare.status).toBe("fails-income-test");
    expect(twoPenceGiftAid.taxFreeChildcare.individualOverByQuarterPence).toBe(2);
    expect(twoPenceGiftAid.taxFreeChildcare.individualOverByPence).toBe(1);

    const twoSeparatePennies = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: {
        totalTaxableIncomePence: pounds(100_000) + 3,
        reliefAtSourcePensionContributionsNetPence: 1,
        giftAidDonationsNetPence: 1,
      },
      ...noPartners,
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });
    expect(twoSeparatePennies.adjustedNetIncome.amountQuarterPence).toBe(
      twoPenceGiftAid.adjustedNetIncome.amountQuarterPence,
    );
    expect(twoSeparatePennies.taxFreeChildcare.status).toBe("fails-income-test");

    const grossedQuarterPence = [1, 2, 3].map((netPence) => assessThresholdInteractions({
      taxYear: "2026-27",
      individual: {
        totalTaxableIncomePence: pounds(1),
        giftAidDonationsNetPence: netPence,
      },
      ...noPartners,
    }).adjustedNetIncome.giftAidGrossedUpQuarterPence);
    expect(grossedQuarterPence).toEqual([5, 10, 15]);

    const sourcePartner = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: {
        totalTaxableIncomePence: pounds(100_000) + 4,
        giftAidDonationsNetPence: 3,
      },
      ...noPartners,
    });
    const exactPartnerAni = sourcePartner.adjustedNetIncome.amountQuarterPence as number;
    expect(sourcePartner.adjustedNetIncome.amountPence).toBe(pounds(100_000));
    const roundTrippedPartner = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(90_000) },
      hicbcPartner: { status: "none" },
      taxFreeChildcarePartner: {
        status: "known",
        adjustedNetIncomeQuarterPence: exactPartnerAni,
      },
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });
    expect(roundTrippedPartner.taxFreeChildcare.status).toBe("fails-income-test");
    expect(roundTrippedPartner.taxFreeChildcare.partnerOverByQuarterPence).toBe(1);
  });

  it("enforces the £100 ANI add-back ceiling", () => {
    expect(() => assessThresholdInteractions({
      taxYear: "2026-27",
      individual: {
        totalTaxableIncomePence: pounds(100_000),
        tradeUnionOrPoliceReliefAddBackPence: pounds(100) + 1,
      },
      ...noPartners,
    })).toThrow(/cannot exceed £100/i);

    expect(assessThresholdInteractions({
      taxYear: "2026-27",
      individual: {
        totalTaxableIncomePence: pounds(100_000),
        tradeUnionOrPoliceReliefAddBackPence: pounds(100),
      },
      ...noPartners,
    }).adjustedNetIncome.amountPence).toBe(pounds(100_100));
  });

  it("keeps Tax-Free Childcare's exact £100,000 boundary penny-precise", () => {
    const atBoundary = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(100_000) },
      ...noPartners,
      taxFreeChildcareChildren: { ordinary: 1, disabled: 1 },
    });
    expect(atBoundary.taxFreeChildcare.status).toBe("passes-income-test");
    expect(atBoundary.taxFreeChildcare.potentialAnnualTopUpPence).toBe(pounds(6_000));
    expect(atBoundary.ruleset).toEqual({
      version: "uk-personal-thresholds/2026-27.2",
      effectiveFrom: "2026-04-06",
      reviewedOn: "2026-07-12",
    });
    expect(atBoundary.sources.taxFreeChildcareEligibility).toMatch(/^https:\/\/www\.gov\.uk\//);

    const onePennyOver = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(100_000) + 1 },
      ...noPartners,
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });
    expect(onePennyOver.taxFreeChildcare.status).toBe("fails-income-test");
    expect(onePennyOver.taxFreeChildcare.individualOverByPence).toBe(1);
    // Tax-Free Childcare fails immediately above £100,000, while HMRC rounds
    // the Personal Allowance taper reduction down to a whole pound.
    expect(onePennyOver.personalAllowance.amountPence).toBe(pounds(12_570));
  });

  it("rounds the Personal Allowance taper reduction down to whole pounds", () => {
    const allowanceAt = (totalTaxableIncomePence: number) => assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence },
      ...noPartners,
    }).personalAllowance;

    expect(allowanceAt(pounds(100_001) + 99).amountPence).toBe(pounds(12_570));
    expect(allowanceAt(pounds(100_002)).amountPence).toBe(pounds(12_569));
    expect(allowanceAt(pounds(125_139) + 99).amountPence).toBe(pounds(1));
    expect(allowanceAt(pounds(125_140)).amountPence).toBe(0);
  });

  it("checks each partner separately and preserves an unknown partner", () => {
    const partnerOver = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(90_000) },
      hicbcPartner: { status: "none" },
      taxFreeChildcarePartner: {
        status: "known",
        adjustedNetIncomePence: pounds(100_000) + 1,
      },
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });
    expect(partnerOver.taxFreeChildcare.status).toBe("fails-income-test");
    expect(partnerOver.taxFreeChildcare.partnerOverByPence).toBe(1);

    const partnerUnknown = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(90_000) },
      hicbcPartner: { status: "none" },
      taxFreeChildcarePartner: { status: "unknown" },
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });
    expect(partnerUnknown.taxFreeChildcare.status).toBe("needs-facts");
    expect(partnerUnknown.taxFreeChildcare.missingFacts).toEqual([
      "taxFreeChildcarePartner.adjustedNetIncome",
    ]);

    const individualAlreadyOver = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(100_000) + 1 },
      hicbcPartner: { status: "none" },
      taxFreeChildcarePartner: { status: "unknown" },
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });
    expect(individualAlreadyOver.taxFreeChildcare.status).toBe("fails-income-test");
    expect(individualAlreadyOver.taxFreeChildcare.missingFacts).toEqual([]);
  });

  it("keeps the distinct HICBC and Tax-Free Childcare partner definitions separate", () => {
    const result = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(70_000) },
      hicbcPartner: { status: "known", adjustedNetIncomePence: pounds(75_000) },
      taxFreeChildcarePartner: { status: "none" },
      annualChildBenefitPence: pounds(2_382.35),
      taxFreeChildcareChildren: { ordinary: 1, disabled: 0 },
    });

    expect(result.highIncomeChildBenefitCharge.liablePerson).toBe("partner");
    expect(result.highIncomeChildBenefitCharge.chargePercent).toBe(75);
    expect(result.taxFreeChildcare.status).toBe("passes-income-test");
    expect(result.taxFreeChildcare.partnerOverByPence).toBeNull();
  });

  it("uses the higher partner's ANI for HICBC and stops on an unresolved tie", () => {
    const partnerHigher = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(65_000) },
      hicbcPartner: { status: "known", adjustedNetIncomePence: pounds(75_000) },
      taxFreeChildcarePartner: { status: "none" },
      annualChildBenefitPence: pounds(2_337.40),
    });
    expect(partnerHigher.highIncomeChildBenefitCharge.liablePerson).toBe("partner");
    expect(partnerHigher.highIncomeChildBenefitCharge.chargePercent).toBe(75);
    expect(partnerHigher.highIncomeChildBenefitCharge.estimatedChargePence).toBe(
      pounds(1_753),
    );

    const equalUnknownClaimant = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(70_000) },
      hicbcPartner: { status: "known", adjustedNetIncomePence: pounds(70_000) },
      taxFreeChildcarePartner: { status: "none" },
      annualChildBenefitPence: pounds(1_406.60),
    });
    expect(equalUnknownClaimant.highIncomeChildBenefitCharge.status).toBe("needs-facts");
    expect(equalUnknownClaimant.highIncomeChildBenefitCharge.missingFacts).toContain(
      "childBenefitClaimant",
    );
  });

  it("does not name a liable person when the HICBC result is no charge", () => {
    const belowThreshold = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(60_000) },
      hicbcPartner: { status: "known", adjustedNetIncomePence: pounds(50_000) },
      taxFreeChildcarePartner: { status: "none" },
      annualChildBenefitPence: pounds(1_406.60),
    });

    expect(belowThreshold.highIncomeChildBenefitCharge.status).toBe("no-charge");
    expect(belowThreshold.highIncomeChildBenefitCharge.liablePerson).toBeNull();
    expect(belowThreshold.highIncomeChildBenefitCharge.liableAdjustedNetIncomePence).toBeNull();

    const unresolvedTieBeforeFirstWholePercent = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(60_199) + 99 },
      hicbcPartner: { status: "known", adjustedNetIncomePence: pounds(60_199) + 99 },
      taxFreeChildcarePartner: { status: "none" },
      annualChildBenefitPence: pounds(1_433.65),
    });
    expect(unresolvedTieBeforeFirstWholePercent.highIncomeChildBenefitCharge.status).toBe("no-charge");
    expect(unresolvedTieBeforeFirstWholePercent.highIncomeChildBenefitCharge.missingFacts).toEqual([]);
  });

  it("keeps very large but safe HICBC inputs integer-exact", () => {
    const result = assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(64_000) },
      ...noPartners,
      annualChildBenefitPence: 9_007_199_254_740_599,
    });

    expect(result.highIncomeChildBenefitCharge.chargePercent).toBe(20);
    expect(result.highIncomeChildBenefitCharge.estimatedChargePence).toBe(
      1_801_439_850_948_100,
    );
  });

  it("matches HMRC's pence-accurate benefit calculation before final pound rounding", () => {
    const chargeAt = (adjustedNetIncome: number) => assessThresholdInteractions({
      taxYear: "2026-27",
      individual: { totalTaxableIncomePence: pounds(adjustedNetIncome) },
      ...noPartners,
      annualChildBenefitPence: pounds(1_433.65),
    }).highIncomeChildBenefitCharge;

    expect(chargeAt(75_000).chargePercent).toBe(75);
    expect(chargeAt(75_000).estimatedChargePence).toBe(pounds(1_075));
    expect(chargeAt(79_800).chargePercent).toBe(99);
    expect(chargeAt(79_800).estimatedChargePence).toBe(pounds(1_419));
  });
});

describe("canonical rest-of-UK non-savings bands", () => {
  it("does not start the additional rate early when the Personal Allowance tapers", () => {
    const result = computeRestOfUkNonSavingsIncomeTaxPence({
      totalIncomePence: pounds(125_140),
    });

    expect(result.personalAllowancePence).toBe(0);
    expect(result.basicRateSlicePence).toBe(pounds(37_700));
    expect(result.higherRateSlicePence).toBe(pounds(87_440));
    expect(result.additionalRateSlicePence).toBe(0);
    expect(result.totalIncomeTaxPence).toBe(pounds(42_516));
  });

  it("applies 45% only to taxable income over £125,140", () => {
    const result = computeRestOfUkNonSavingsIncomeTaxPence({
      totalIncomePence: pounds(130_000),
    });

    expect(result.additionalRateSlicePence).toBe(pounds(4_860));
    expect(result.additionalTaxPence).toBe(pounds(2_187));
    expect(result.totalIncomeTaxPence).toBe(pounds(44_703));
  });

  it("rounds each band's tax down to whole pence", () => {
    const result = computeRestOfUkNonSavingsIncomeTaxPence({
      totalIncomePence: pounds(12_570) + 3,
    });

    expect(result.taxableIncomePence).toBe(3);
    expect(result.basicTaxPence).toBe(0);
    expect(result.totalIncomeTaxPence).toBe(0);
  });
});
