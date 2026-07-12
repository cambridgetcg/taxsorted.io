import { UK_PERSONAL_2026_27 } from "./config";
import type {
  ThresholdInteractionAssessment,
  ThresholdInteractionInput,
} from "./types";

const PENCE = 100;
const QUARTER_PENCE_PER_PENCE = 4;

function requiredPence(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer number of pence`);
  }
  return value;
}

function optionalPence(value: number | undefined, label: string): number {
  return value === undefined ? 0 : requiredPence(value, label);
}

function childCount(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative whole number`);
  }
  return value;
}

function knownPartnerQuarterPence(
  partner: ThresholdInteractionInput["hicbcPartner"],
  label: string,
): number | null {
  if (partner.status !== "known") return null;
  if (partner.adjustedNetIncomeQuarterPence !== undefined) {
    const value = partner.adjustedNetIncomeQuarterPence;
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(
        `${label}.adjustedNetIncomeQuarterPence must be a non-negative integer number of quarter-pence`,
      );
    }
    return value;
  }
  return toQuarterPence(
    requiredPence(
      partner.adjustedNetIncomePence as number,
      `${label}.adjustedNetIncomePence`,
    ),
    `${label}.adjustedNetIncomePence`,
  );
}

function scaledPence(valuePence: number, multiplier: number, label: string): number {
  const scaled = valuePence * multiplier;
  if (!Number.isSafeInteger(scaled)) {
    throw new RangeError(`${label} is too large to calculate safely`);
  }
  return scaled;
}

function toQuarterPence(valuePence: number, label: string): number {
  return scaledPence(valuePence, QUARTER_PENCE_PER_PENCE, label);
}

function nearestPence(quarterPence: number): number {
  return Math.round(quarterPence / QUARTER_PENCE_PER_PENCE);
}

function positiveCeilingPence(quarterPence: number): number {
  return quarterPence <= 0 ? 0 : Math.ceil(quarterPence / QUARTER_PENCE_PER_PENCE);
}

function grossUpBasicRateQuarterPence(netPence: number, label: string): number {
  // Relief-at-source pension payments and Gift Aid are grossed up by 20%:
  // gross = net × 5 / 4. Quarter-pence units preserve that exact result.
  return scaledPence(netPence, 5, label);
}

function allowanceFromAniQuarterPence(adjustedNetIncomeQuarterPence: number) {
  const full = UK_PERSONAL_2026_27.personalAllowance * PENCE;
  const taperStarts = UK_PERSONAL_2026_27.personalAllowanceIncomeLimit
    * PENCE
    * QUARTER_PENCE_PER_PENCE;
  // HMRC's calculation rounds the allowance reduction down to a whole pound.
  // Express the £1 reduction per £2 of excess ANI as one £1 unit per 200p,
  // then restore the result to pence for the machine contract.
  const lost = Math.min(
    full,
    Math.floor(
      Math.max(0, adjustedNetIncomeQuarterPence - taperStarts)
      / (2 * PENCE * QUARTER_PENCE_PER_PENCE),
    ) * PENCE,
  );
  const amount = full - lost;
  return { amountPence: amount, lostPence: lost, fullyLost: amount === 0 };
}

function childBenefitCharge(adjustedNetIncomeQuarterPence: number, benefitPence: number) {
  const cfg = UK_PERSONAL_2026_27.highIncomeChildBenefitCharge;
  const threshold = cfg.threshold * PENCE * QUARTER_PENCE_PER_PENCE;
  const fullChargeAt = cfg.fullChargeAt * PENCE * QUARTER_PENCE_PER_PENCE;
  const step = cfg.percentPer * PENCE * QUARTER_PENCE_PER_PENCE;

  if (benefitPence === 0 || adjustedNetIncomeQuarterPence <= threshold) {
    return { chargePercent: 0, estimatedChargePence: 0 };
  }
  const chargePercent = adjustedNetIncomeQuarterPence >= fullChargeAt
    ? 100
    : Math.min(100, Math.floor((adjustedNetIncomeQuarterPence - threshold) / step));
  // ITEPA 2003 s 681C applies the whole-number percentage to the pence-accurate
  // benefit and rounds the resulting charge down to a whole pound. Divide before
  // multiplying the residual to avoid unsafe large-number intermediates.
  const chargedWholePounds = (
    Math.floor(benefitPence / 10_000) * chargePercent
    + Math.floor(((benefitPence % 10_000) * chargePercent) / 10_000)
  );
  return {
    chargePercent,
    estimatedChargePence: chargedWholePounds * PENCE,
  };
}

/**
 * The strict, machine-shaped ANI threshold classifier.
 *
 * Input money is integer pence, with an explicit scaled quarter-pence option for
 * piping exact partner ANI. A missing total stays missing; malformed and negative
 * amounts throw instead of quietly becoming zero. The TFC result is only the
 * statutory income condition — age, work, immigration and conflicting-support
 * conditions remain outside this bounded assessment.
 */
export function assessThresholdInteractions(
  input: ThresholdInteractionInput,
): ThresholdInteractionAssessment {
  if (input.taxYear !== UK_PERSONAL_2026_27.taxYear) {
    throw new RangeError(`Unsupported UK personal tax year: ${input.taxYear}`);
  }

  const total = input.individual.totalTaxableIncomePence;
  const totalTaxableIncomePence = total === undefined
    ? null
    : requiredPence(total, "totalTaxableIncomePence");
  const netIncomeDeductionsPence = optionalPence(
    input.individual.netIncomeDeductionsPence,
    "netIncomeDeductionsPence",
  );
  const pensionNetPence = optionalPence(
    input.individual.reliefAtSourcePensionContributionsNetPence,
    "reliefAtSourcePensionContributionsNetPence",
  );
  const giftAidNetPence = optionalPence(
    input.individual.giftAidDonationsNetPence,
    "giftAidDonationsNetPence",
  );
  const tradeUnionOrPoliceReliefAddBackPence = optionalPence(
    input.individual.tradeUnionOrPoliceReliefAddBackPence,
    "tradeUnionOrPoliceReliefAddBackPence",
  );
  if (
    tradeUnionOrPoliceReliefAddBackPence
    > UK_PERSONAL_2026_27.adjustedNetIncomeTradeUnionPoliceAddBackMaximum * PENCE
  ) {
    throw new RangeError("tradeUnionOrPoliceReliefAddBackPence cannot exceed £100");
  }
  const reliefAtSourcePensionGrossedUpQuarterPence = grossUpBasicRateQuarterPence(
    pensionNetPence,
    "reliefAtSourcePensionContributionsNetPence",
  );
  const giftAidGrossedUpQuarterPence = grossUpBasicRateQuarterPence(
    giftAidNetPence,
    "giftAidDonationsNetPence",
  );
  const aniMissingFacts = totalTaxableIncomePence === null
    ? ["individual.totalTaxableIncomePence"]
    : [];
  const adjustedNetIncomeQuarterPence = totalTaxableIncomePence === null
    ? null
    : Math.max(
      0,
      toQuarterPence(totalTaxableIncomePence, "totalTaxableIncomePence")
        - toQuarterPence(netIncomeDeductionsPence, "netIncomeDeductionsPence")
        - reliefAtSourcePensionGrossedUpQuarterPence
        - giftAidGrossedUpQuarterPence
        + toQuarterPence(
          tradeUnionOrPoliceReliefAddBackPence,
          "tradeUnionOrPoliceReliefAddBackPence",
        ),
    );
  if (
    adjustedNetIncomeQuarterPence !== null
    && !Number.isSafeInteger(adjustedNetIncomeQuarterPence)
  ) {
    throw new RangeError("adjusted net income is too large to calculate safely");
  }
  const adjustedNetIncomePence = adjustedNetIncomeQuarterPence === null
    ? null
    : nearestPence(adjustedNetIncomeQuarterPence);

  const hicbcPartnerAdjustedNetIncomeQuarterPence = knownPartnerQuarterPence(
    input.hicbcPartner,
    "hicbcPartner",
  );
  const childcarePartnerAdjustedNetIncomeQuarterPence = knownPartnerQuarterPence(
    input.taxFreeChildcarePartner,
    "taxFreeChildcarePartner",
  );

  const personalAllowance = adjustedNetIncomeQuarterPence === null
    ? {
      status: "needs-facts" as const,
      amountPence: null,
      lostPence: null,
      fullyLost: null,
    }
    : {
      status: "determined" as const,
      ...allowanceFromAniQuarterPence(adjustedNetIncomeQuarterPence),
    };

  const benefit = input.annualChildBenefitPence;
  let highIncomeChildBenefitCharge: ThresholdInteractionAssessment["highIncomeChildBenefitCharge"];
  if (benefit === undefined) {
    highIncomeChildBenefitCharge = {
      status: "not-checked",
      liablePerson: null,
      liableAdjustedNetIncomePence: null,
      liableAdjustedNetIncomeQuarterPence: null,
      chargePercent: null,
      estimatedChargePence: null,
      missingFacts: [],
    };
  } else {
    const benefitPence = requiredPence(benefit, "annualChildBenefitPence");
    if (benefitPence < PENCE) {
      highIncomeChildBenefitCharge = {
        status: "no-charge",
        liablePerson: null,
        liableAdjustedNetIncomePence: null,
        liableAdjustedNetIncomeQuarterPence: null,
        chargePercent: 0,
        estimatedChargePence: 0,
        missingFacts: [],
      };
    } else {
      const missingFacts: string[] = [];
      if (adjustedNetIncomeQuarterPence === null) {
        missingFacts.push("individual.totalTaxableIncomePence");
      }
      if (input.hicbcPartner.status === "unknown") {
        missingFacts.push("hicbcPartner.adjustedNetIncome");
      }

      const partnerAniQuarterPence = hicbcPartnerAdjustedNetIncomeQuarterPence;
      const equalKnownIncomes = adjustedNetIncomeQuarterPence !== null
        && partnerAniQuarterPence !== null
        && adjustedNetIncomeQuarterPence === partnerAniQuarterPence;
      if (
        equalKnownIncomes
        && childBenefitCharge(
          adjustedNetIncomeQuarterPence as number,
          benefitPence,
        ).estimatedChargePence > 0
        && input.childBenefitClaimant === undefined
      ) {
        missingFacts.push("childBenefitClaimant");
      }

      if (missingFacts.length > 0) {
        highIncomeChildBenefitCharge = {
          status: "needs-facts",
          liablePerson: "unknown",
          liableAdjustedNetIncomePence: null,
          liableAdjustedNetIncomeQuarterPence: null,
          chargePercent: null,
          estimatedChargePence: null,
          missingFacts,
        };
      } else {
        const individualAniQuarterPence = adjustedNetIncomeQuarterPence as number;
        let liablePerson: "individual" | "partner";
        let liableAniQuarterPence: number;
        if (
          partnerAniQuarterPence !== null
          && partnerAniQuarterPence > individualAniQuarterPence
        ) {
          liablePerson = "partner";
          liableAniQuarterPence = partnerAniQuarterPence;
        } else if (
          partnerAniQuarterPence !== null
          && partnerAniQuarterPence === individualAniQuarterPence
          && input.childBenefitClaimant === "partner"
        ) {
          // Finance Act 2012 explanatory notes: equal incomes put the charge on the claimant.
          liablePerson = "partner";
          liableAniQuarterPence = partnerAniQuarterPence;
        } else {
          liablePerson = "individual";
          liableAniQuarterPence = individualAniQuarterPence;
        }
        const charge = childBenefitCharge(liableAniQuarterPence, benefitPence);
        const hasCharge = charge.estimatedChargePence > 0;
        highIncomeChildBenefitCharge = {
          status: hasCharge ? "charge" : "no-charge",
          liablePerson: hasCharge ? liablePerson : null,
          liableAdjustedNetIncomePence: hasCharge
            ? nearestPence(liableAniQuarterPence)
            : null,
          liableAdjustedNetIncomeQuarterPence: hasCharge ? liableAniQuarterPence : null,
          chargePercent: charge.chargePercent,
          estimatedChargePence: charge.estimatedChargePence,
          missingFacts: [],
        };
      }
    }
  }

  const incomeLimitPence = UK_PERSONAL_2026_27.taxFreeChildcare.adjustedNetIncomeLimit * PENCE;
  const incomeLimitQuarterPence = incomeLimitPence * QUARTER_PENCE_PER_PENCE;
  let taxFreeChildcare: ThresholdInteractionAssessment["taxFreeChildcare"];
  if (input.taxFreeChildcareChildren === undefined) {
    taxFreeChildcare = {
      status: "not-checked",
      incomeLimitPence,
      individualOverByPence: null,
      partnerOverByPence: null,
      individualOverByQuarterPence: null,
      partnerOverByQuarterPence: null,
      potentialAnnualTopUpPence: null,
      missingFacts: [],
      fullEligibilityDetermined: false,
    };
  } else {
    const ordinary = childCount(
      input.taxFreeChildcareChildren.ordinary,
      "ordinary childcare children",
    );
    const disabled = childCount(
      input.taxFreeChildcareChildren.disabled,
      "disabled childcare children",
    );
    const potentialAnnualTopUpPence = (
      ordinary * UK_PERSONAL_2026_27.taxFreeChildcare.ordinaryChildAnnualTopUp
      + disabled * UK_PERSONAL_2026_27.taxFreeChildcare.disabledChildAnnualTopUp
    ) * PENCE;
    if (!Number.isSafeInteger(potentialAnnualTopUpPence)) {
      throw new RangeError("childcare child counts are too large to calculate safely");
    }
    const missingFacts: string[] = [];
    if (adjustedNetIncomeQuarterPence === null) {
      missingFacts.push("individual.totalTaxableIncomePence");
    }
    if (input.taxFreeChildcarePartner.status === "unknown") {
      missingFacts.push("taxFreeChildcarePartner.adjustedNetIncome");
    }
    const partnerAniQuarterPence = childcarePartnerAdjustedNetIncomeQuarterPence;
    const individualOverByQuarterPence = adjustedNetIncomeQuarterPence === null
      ? null
      : Math.max(0, adjustedNetIncomeQuarterPence - incomeLimitQuarterPence);
    const partnerOverByQuarterPence = partnerAniQuarterPence === null
      ? null
      : Math.max(0, partnerAniQuarterPence - incomeLimitQuarterPence);
    const individualOverByPence = individualOverByQuarterPence === null
      ? null
      : positiveCeilingPence(individualOverByQuarterPence);
    const partnerOverByPence = partnerOverByQuarterPence === null
      ? null
      : positiveCeilingPence(partnerOverByQuarterPence);

    let status: ThresholdInteractionAssessment["taxFreeChildcare"]["status"];
    if (
      (individualOverByQuarterPence ?? 0) > 0
      || (partnerOverByQuarterPence ?? 0) > 0
    ) {
      status = "fails-income-test";
    } else if (missingFacts.length > 0) {
      status = "needs-facts";
    } else {
      status = "passes-income-test";
    }
    taxFreeChildcare = {
      status,
      incomeLimitPence,
      individualOverByPence,
      partnerOverByPence,
      individualOverByQuarterPence,
      partnerOverByQuarterPence,
      potentialAnnualTopUpPence,
      missingFacts: status === "fails-income-test" ? [] : missingFacts,
      fullEligibilityDetermined: false,
    };
  }

  return {
    schema: "taxsorted.uk.personal-thresholds/1",
    taxYear: input.taxYear,
    ruleset: { ...UK_PERSONAL_2026_27.ruleset },
    adjustedNetIncome: {
      status: adjustedNetIncomePence === null ? "needs-facts" : "determined",
      totalTaxableIncomePence,
      netIncomeDeductionsPence,
      reliefAtSourcePensionGrossedUpPence: nearestPence(
        reliefAtSourcePensionGrossedUpQuarterPence,
      ),
      reliefAtSourcePensionGrossedUpQuarterPence,
      giftAidGrossedUpPence: nearestPence(giftAidGrossedUpQuarterPence),
      giftAidGrossedUpQuarterPence,
      tradeUnionOrPoliceReliefAddBackPence,
      amountPence: adjustedNetIncomePence,
      amountQuarterPence: adjustedNetIncomeQuarterPence,
      calculationPrecision: "quarter-pence",
      missingFacts: aniMissingFacts,
    },
    personalAllowance,
    highIncomeChildBenefitCharge,
    taxFreeChildcare,
    sources: { ...UK_PERSONAL_2026_27.sources },
  };
}

export interface RestOfUkNonSavingsIncomeTaxInput {
  totalIncomePence: number;
  adjustedNetIncomePence?: number;
}

export interface RestOfUkNonSavingsIncomeTaxResult {
  personalAllowancePence: number;
  personalAllowanceLostPence: number;
  taxableIncomePence: number;
  basicRateSlicePence: number;
  higherRateSlicePence: number;
  additionalRateSlicePence: number;
  basicTaxPence: number;
  higherTaxPence: number;
  additionalTaxPence: number;
  totalIncomeTaxPence: number;
  marginalRateApprox: number;
}

function taxAtPercentagePence(slicePence: number, percentage: number): number {
  // HMRC rounds each tax-band result down to two decimal places. Split pounds
  // and residual pence so the calculation stays integer-safe and deterministic.
  const wholePounds = Math.floor(slicePence / PENCE);
  const residualPence = slicePence % PENCE;
  return wholePounds * percentage + Math.floor((residualPence * percentage) / PENCE);
}

/**
 * Canonical 2026/27 rest-of-UK non-savings band calculation.
 * Band-extension reliefs are intentionally outside this teaching slice.
 */
export function computeRestOfUkNonSavingsIncomeTaxPence(
  input: RestOfUkNonSavingsIncomeTaxInput,
): RestOfUkNonSavingsIncomeTaxResult {
  const totalIncomePence = requiredPence(input.totalIncomePence, "totalIncomePence");
  const aniPence = input.adjustedNetIncomePence === undefined
    ? totalIncomePence
    : requiredPence(input.adjustedNetIncomePence, "adjustedNetIncomePence");
  const allowance = allowanceFromAniQuarterPence(
    toQuarterPence(aniPence, "adjustedNetIncomePence"),
  );
  const taxableIncomePence = Math.max(0, totalIncomePence - allowance.amountPence);
  const basicTop = UK_PERSONAL_2026_27.bandsEnglandWalesNI.basic.taxableTo * PENCE;
  const higherTop = UK_PERSONAL_2026_27.bandsEnglandWalesNI.higher.taxableTo * PENCE;
  const basicRateSlicePence = Math.min(taxableIncomePence, basicTop);
  const higherRateSlicePence = Math.min(
    Math.max(0, taxableIncomePence - basicTop),
    higherTop - basicTop,
  );
  const additionalRateSlicePence = Math.max(0, taxableIncomePence - higherTop);
  const basicTaxPence = taxAtPercentagePence(basicRateSlicePence, 20);
  const higherTaxPence = taxAtPercentagePence(higherRateSlicePence, 40);
  const additionalTaxPence = taxAtPercentagePence(additionalRateSlicePence, 45);
  let marginalRateApprox: number = UK_PERSONAL_2026_27.bandsEnglandWalesNI.basic.rate;
  if (
    aniPence > UK_PERSONAL_2026_27.personalAllowanceIncomeLimit * PENCE
    && allowance.amountPence > 0
  ) {
    marginalRateApprox = UK_PERSONAL_2026_27.bandsEnglandWalesNI.higher.rate * 1.5;
  } else if (additionalRateSlicePence > 0 || taxableIncomePence >= higherTop) {
    marginalRateApprox = UK_PERSONAL_2026_27.bandsEnglandWalesNI.additional.rate;
  } else if (higherRateSlicePence > 0) {
    marginalRateApprox = UK_PERSONAL_2026_27.bandsEnglandWalesNI.higher.rate;
  } else if (taxableIncomePence === 0) {
    marginalRateApprox = 0;
  }

  return {
    personalAllowancePence: allowance.amountPence,
    personalAllowanceLostPence: allowance.lostPence,
    taxableIncomePence,
    basicRateSlicePence,
    higherRateSlicePence,
    additionalRateSlicePence,
    basicTaxPence,
    higherTaxPence,
    additionalTaxPence,
    totalIncomeTaxPence: basicTaxPence + higherTaxPence + additionalTaxPence,
    marginalRateApprox,
  };
}
