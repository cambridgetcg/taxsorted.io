import {
  FIRST_TIME_BUYER_BANDS,
  SDLT_RULESET,
  STANDARD_RESIDENTIAL_BANDS,
} from "./config";
import { bandLabel, explainBands } from "./explain";
import type {
  ResidentialSdltInput,
  ResidentialSdltOutcome,
  SdltBandResult,
  SdltDecision,
  SdltReviewReason,
  SdltRulesetIdentity,
  SdltSource,
  SdltTreatmentApplied,
  SdltTrust,
} from "./types";

const RULESET_IDENTITY: SdltRulesetIdentity = {
  id: SDLT_RULESET.id,
  revision: SDLT_RULESET.revision,
  effectiveFrom: SDLT_RULESET.effectiveFrom,
  effectiveTo: SDLT_RULESET.effectiveTo,
  reviewedOn: SDLT_RULESET.reviewedOn,
};

function trust(): SdltTrust {
  return {
    method: "deterministic",
    ruleset: { ...RULESET_IDENTITY },
    sources: SDLT_RULESET.sources.map((source: SdltSource) => ({ ...source })),
    assumptions: [
      {
        code: "caller-supplied-effective-date",
        message:
          "The caller supplied the legal SDLT effective date, which can be earlier than completion.",
      },
      {
        code: "caller-supplied-chargeable-consideration",
        message:
          "The caller supplied total chargeable consideration, including any amount the law treats as consideration.",
      },
      {
        code: "caller-classified-treatment",
        message:
          "The caller determined the first-time-buyer, higher-rates and non-resident treatment statuses.",
      },
    ],
  };
}

function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function reviewReason(code: string, message: string, sourceIds: string[]): SdltReviewReason {
  return { code, message, sourceIds };
}

function reviewReasons(input: ResidentialSdltInput): SdltReviewReason[] {
  const reasons: SdltReviewReason[] = [];
  const add = (code: string, message: string, sourceIds: string[]) => {
    if (!reasons.some((reason) => reason.code === code)) {
      reasons.push(reviewReason(code, message, sourceIds));
    }
  };

  if (input.effectiveDate < SDLT_RULESET.effectiveFrom) {
    add(
      "rule-date-unsupported",
      "This ruleset starts on 1 April 2025; an earlier transaction needs its own effective-dated table.",
      ["fa2003-s55"]
    );
  }

  if (input.land.jurisdiction === "scotland" || input.land.jurisdiction === "wales") {
    add(
      "outside-sdlt-jurisdiction",
      "SDLT applies here only to land in England and Northern Ireland.",
      ["hmrc-residential-rates"]
    );
  } else if (input.land.jurisdiction === "unknown") {
    add(
      "jurisdiction-unknown",
      "The land's jurisdiction must be known before SDLT can be calculated.",
      ["hmrc-residential-rates"]
    );
  }

  if (input.land.use === "mixed" || input.land.use === "non-residential") {
    add(
      "mixed-or-non-residential",
      "Mixed-use and non-residential land use different SDLT rates.",
      ["fa2003-s55"]
    );
  } else if (input.land.use === "unknown") {
    add(
      "land-use-unknown",
      "Residential status must be settled before this residential calculator can act.",
      ["fa2003-s55"]
    );
  }

  if (input.land.interest === "new-lease") {
    add(
      "new-lease-rent",
      "A new lease can also be taxed on the rent's net present value.",
      ["hmrc-residential-rates"]
    );
  } else if (input.land.interest === "unknown") {
    add(
      "interest-unknown",
      "The interest must be known as a freehold or an assigned existing lease.",
      ["hmrc-residential-rates"]
    );
  }

  if (input.land.dwellingCount === "unknown") {
    add(
      "dwelling-count-unknown",
      "The number of dwellings must be settled before choosing the rate rules.",
      ["hmrc-higher-rates"]
    );
  } else if (input.land.dwellingCount >= 6) {
    add(
      "six-or-more-dwellings",
      "A purchase of six or more dwellings uses the non-residential rules.",
      ["hmrc-higher-rates"]
    );
  } else if (input.land.dwellingCount !== 1) {
    add(
      "multiple-dwellings",
      "This first ruleset covers one ordinary dwelling only.",
      ["hmrc-higher-rates"]
    );
  }

  if (input.buyerKind === "company") {
    add(
      "company-purchaser",
      "Companies can face different residential rates and relief rules.",
      ["hmrc-higher-rates"]
    );
  } else if (input.buyerKind === "trust" || input.buyerKind === "partnership") {
    add(
      "trust-or-partnership-purchaser",
      "Trust and partnership purchases need their own purchaser tests.",
      ["fa2003-sch4za", "fa2003-sch9a"]
    );
  } else if (input.buyerKind === "other" || input.buyerKind === "unknown") {
    add(
      "buyer-kind-unsupported",
      "This first ruleset covers individual purchasers only.",
      ["fa2003-sch4za", "fa2003-sch6za"]
    );
  }

  const specialCases: Array<[
    keyof ResidentialSdltInput["specialCases"],
    string,
    string,
    string,
    string[]
  ]> = [
    [
      "linkedTransactions",
      "linked-transactions",
      "Linked transactions must be aggregated and apportioned under separate rules.",
      "It is not known whether this transaction is linked to another transaction.",
      ["fa2003-s55"],
    ],
    [
      "sharedOwnership",
      "shared-ownership",
      "Shared ownership has special market-value and staircasing choices.",
      "It is not known whether shared-ownership rules apply.",
      ["fa2003-sch9"],
    ],
    [
      "otherReliefClaimed",
      "other-relief",
      "This first ruleset implements first-time-buyer relief only.",
      "It is not known whether another SDLT relief will be claimed.",
      ["hmrc-residential-rates"],
    ],
    [
      "complexConsideration",
      "complex-consideration",
      "Contingent, uncertain, non-cash or disputed consideration needs professional review.",
      "It is not known whether the supplied consideration needs special valuation rules.",
      ["fa2003-sch4"],
    ],
    [
      "transitionalContractMayApply",
      "transitional-contract",
      "A protected older contract can retain earlier higher-rate or non-resident surcharge treatment.",
      "It is not known whether an older protected contract retains earlier surcharge treatment.",
      ["fa2025-s51", "hmrc-higher-rates-transitional", "fa2021-sch16"],
    ],
  ];

  for (const [field, code, message, unknownMessage, sourceIds] of specialCases) {
    const value = input.specialCases[field];
    if (value === true) add(code, message, sourceIds);
    if (value === "unknown") {
      add(`${code}-status-unknown`, unknownMessage, sourceIds);
    }
  }

  const surchargeCanApply = input.chargeableConsiderationPence >= SDLT_RULESET.surchargeMinimumPence;
  if (surchargeCanApply && input.treatment.higherRates === "unknown") {
    add(
      "higher-rates-status-unknown",
      "The caller must determine whether Schedule 4ZA higher rates apply.",
      ["fa2003-sch4za", "hmrc-higher-rates"]
    );
  }
  if (surchargeCanApply && input.treatment.nonResidentSurcharge === "unknown") {
    add(
      "non-resident-status-unknown",
      "The caller must determine whether this is a non-resident transaction.",
      ["fa2003-s75za", "fa2003-sch9a"]
    );
  }

  const higherRatesDefinitelyApply =
    surchargeCanApply && input.treatment.higherRates === "additional-dwelling";
  const firstTimeBuyerCouldChangeTax =
    input.chargeableConsiderationPence <= SDLT_RULESET.firstTimeBuyerMaximumPence &&
    !higherRatesDefinitelyApply;
  if (firstTimeBuyerCouldChangeTax && input.treatment.firstTimeBuyerRelief === "unknown") {
    add(
      "first-time-buyer-status-unknown",
      "The caller must determine whether first-time-buyer relief will be claimed.",
      ["fa2003-sch6za"]
    );
  }

  return reasons;
}

function decimalPence(rawPenceTimesBasisPoints: bigint): number {
  const wholePence = rawPenceTimesBasisPoints / 10_000n;
  const fraction = rawPenceTimesBasisPoints % 10_000n;
  return Number(wholePence) + Number(fraction) / 10_000;
}

export function calculateResidentialSdlt(input: ResidentialSdltInput): ResidentialSdltOutcome {
  if (
    !Number.isSafeInteger(input.chargeableConsiderationPence) ||
    input.chargeableConsiderationPence < 0 ||
    input.chargeableConsiderationPence > SDLT_RULESET.maximumConsiderationPence
  ) {
    return {
      status: "invalid_input",
      errors: [
        {
          code: "invalid-consideration",
          path: "chargeableConsiderationPence",
          message:
            "Chargeable consideration must be integer pence between £0 and £10 billion.",
        },
      ],
    };
  }
  if (!isIsoCalendarDate(input.effectiveDate)) {
    return {
      status: "invalid_input",
      errors: [
        {
          code: "invalid-effective-date",
          path: "effectiveDate",
          message: "Effective date must be a real calendar date in YYYY-MM-DD form.",
        },
      ],
    };
  }

  const reasons = reviewReasons(input);
  if (reasons.length > 0) {
    return {
      status: "needs_review",
      calculation: null,
      reviewReasons: reasons,
      trust: trust(),
    };
  }

  const surchargeCanApply = input.chargeableConsiderationPence >= SDLT_RULESET.surchargeMinimumPence;
  const higherRatesApplied =
    surchargeCanApply && input.treatment.higherRates === "additional-dwelling";
  const nonResidentApplied =
    surchargeCanApply && input.treatment.nonResidentSurcharge === "apply";
  const firstTimeBuyerWithinCap =
    input.chargeableConsiderationPence <= SDLT_RULESET.firstTimeBuyerMaximumPence;
  const firstTimeBuyerApplied =
    input.treatment.firstTimeBuyerRelief === "claim" &&
    firstTimeBuyerWithinCap &&
    !higherRatesApplied;

  const decisions: SdltDecision[] = [];
  if (
    input.treatment.firstTimeBuyerRelief === "claim" &&
    !firstTimeBuyerWithinCap
  ) {
    decisions.push({
      code: "first-time-buyer-over-cap",
      message: "First-time-buyer relief is unavailable above £500,000, so the whole price uses ordinary rates.",
      sourceIds: ["fa2003-sch6za"],
    });
  }
  if (input.treatment.firstTimeBuyerRelief === "claim" && higherRatesApplied) {
    decisions.push({
      code: "first-time-buyer-barred-by-higher-rates",
      message: "Schedule 6ZA bars first-time-buyer relief when Schedule 4ZA higher rates apply.",
      sourceIds: ["fa2003-sch4za", "fa2003-sch6za"],
    });
  }
  if (!surchargeCanApply) {
    if (input.treatment.higherRates !== "standard") {
      decisions.push({
        code: "higher-rates-below-minimum",
        message: "Higher rates do not apply below £40,000 chargeable consideration.",
        sourceIds: ["fa2003-sch4za"],
      });
    }
    if (input.treatment.nonResidentSurcharge !== "do-not-apply") {
      decisions.push({
        code: "non-resident-below-minimum",
        message: "The non-resident surcharge does not apply below £40,000 in this ordinary purchase scope.",
        sourceIds: ["fa2003-sch9a"],
      });
    }
  }

  const regime = higherRatesApplied
    ? ("higher-rates" as const)
    : firstTimeBuyerApplied
      ? ("first-time-buyer" as const)
      : ("standard" as const);
  const baseBands = firstTimeBuyerApplied
    ? FIRST_TIME_BUYER_BANDS
    : STANDARD_RESIDENTIAL_BANDS;
  const surchargeBasisPoints =
    (higherRatesApplied ? SDLT_RULESET.higherRatesAdditionBasisPoints : 0) +
    (nonResidentApplied ? SDLT_RULESET.nonResidentAdditionBasisPoints : 0);

  const bands: SdltBandResult[] = [];
  let lower = 0;
  let totalRaw = 0n;
  for (const band of baseBands) {
    const upper = band.upToPence ?? input.chargeableConsiderationPence;
    const amountTaxedPence = Math.max(
      0,
      Math.min(input.chargeableConsiderationPence, upper) - lower
    );
    if (amountTaxedPence > 0) {
      const rateBasisPoints = band.rateBasisPoints + surchargeBasisPoints;
      const raw = BigInt(amountTaxedPence) * BigInt(rateBasisPoints);
      totalRaw += raw;
      const sourceIds = [firstTimeBuyerApplied ? "fa2003-sch6za" : "fa2003-s55"];
      if (higherRatesApplied) sourceIds.push("fa2003-sch4za");
      if (nonResidentApplied) sourceIds.push("fa2003-s75za");
      bands.push({
        label: bandLabel(lower, band.upToPence),
        fromPence: lower,
        upToPence: band.upToPence,
        amountTaxedPence,
        baseRateBasisPoints: band.rateBasisPoints,
        surchargeBasisPoints,
        rateBasisPoints,
        taxPenceBeforeFinalRounding: decimalPence(raw),
        sourceIds,
      });
    }
    if (band.upToPence === null || input.chargeableConsiderationPence <= upper) break;
    lower = upper;
  }

  // raw is pence × basis points. Divide by 10,000 for exact tax pence, then
  // by 100 for whole pounds. Combining those divisors and multiplying back
  // by 100 performs HMRC's one final round-down without floating-point math.
  const taxDuePence = Number(totalRaw / 1_000_000n) * 100;
  const roundingAdjustmentPence = Number(totalRaw % 1_000_000n) / 10_000;
  const taxBeforeRoundingPence = taxDuePence + roundingAdjustmentPence;

  const treatmentsApplied: SdltTreatmentApplied[] = higherRatesApplied
    ? ["higher-rates-transaction"]
    : firstTimeBuyerApplied
      ? ["first-time-buyer-relief"]
      : ["standard-residential"];
  if (nonResidentApplied) treatmentsApplied.push("non-resident-surcharge");

  const calculation = {
    currency: "GBP" as const,
    effectiveDate: input.effectiveDate,
    chargeableConsiderationPence: input.chargeableConsiderationPence,
    taxBeforeRoundingPence,
    taxDuePence,
    rounding: "down-to-whole-pound" as const,
    roundingAdjustmentPence,
    regime,
    treatmentsApplied,
    bands,
    decisions,
    explanation: explainBands(bands, taxDuePence),
  };

  return {
    status: "calculated",
    calculation,
    reviewReasons: [],
    trust: trust(),
  };
}
