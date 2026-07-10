export type Pence = number;
export type BasisPoints = number;

export type SdltJurisdiction =
  | "england"
  | "northern-ireland"
  | "scotland"
  | "wales"
  | "unknown";
export type SdltLandUse = "residential" | "mixed" | "non-residential" | "unknown";
export type SdltInterest = "freehold" | "existing-lease" | "new-lease" | "unknown";
export type SdltBuyerKind = "individual" | "company" | "trust" | "partnership" | "other" | "unknown";
export type SdltFirstTimeBuyerTreatment = "claim" | "do-not-claim" | "unknown";
export type SdltHigherRatesTreatment = "standard" | "additional-dwelling" | "unknown";
export type SdltNonResidentTreatment = "apply" | "do-not-apply" | "unknown";
export type SdltKnownAnswer = boolean | "unknown";

export interface ResidentialSdltInput {
  /** The legal SDLT effective date, which can be earlier than completion. */
  effectiveDate: string;
  /** Total chargeable consideration, supplied by the caller, in integer pence. */
  chargeableConsiderationPence: Pence;
  land: {
    jurisdiction: SdltJurisdiction;
    use: SdltLandUse;
    interest: SdltInterest;
    dwellingCount: number | "unknown";
  };
  buyerKind: SdltBuyerKind;
  treatment: {
    firstTimeBuyerRelief: SdltFirstTimeBuyerTreatment;
    higherRates: SdltHigherRatesTreatment;
    nonResidentSurcharge: SdltNonResidentTreatment;
  };
  specialCases: {
    linkedTransactions: SdltKnownAnswer;
    sharedOwnership: SdltKnownAnswer;
    otherReliefClaimed: SdltKnownAnswer;
    complexConsideration: SdltKnownAnswer;
    transitionalContractMayApply: SdltKnownAnswer;
  };
}

export interface SdltRateBand {
  /** Inclusive consideration threshold; the next penny enters the next band. null has no upper edge. */
  upToPence: Pence | null;
  /** 100 basis points = 1 percentage point. */
  rateBasisPoints: BasisPoints;
}

export interface SdltSource {
  id: string;
  title: string;
  authority: "UK Parliament" | "HM Revenue & Customs";
  url: string;
  checkedOn: string;
}

export interface SdltRulesetIdentity {
  id: string;
  revision: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  reviewedOn: string;
}

export interface SdltAssumption {
  code: string;
  message: string;
}

export interface SdltTrust {
  method: "deterministic";
  ruleset: SdltRulesetIdentity;
  sources: SdltSource[];
  assumptions: SdltAssumption[];
}

export interface SdltInputError {
  code: "invalid-consideration" | "invalid-effective-date";
  path: string;
  message: string;
}

export interface SdltReviewReason {
  code: string;
  message: string;
  sourceIds: string[];
}

export interface SdltDecision {
  code: string;
  message: string;
  sourceIds: string[];
}

export interface SdltBandResult {
  label: string;
  fromPence: Pence;
  upToPence: Pence | null;
  amountTaxedPence: Pence;
  baseRateBasisPoints: BasisPoints;
  surchargeBasisPoints: BasisPoints;
  rateBasisPoints: BasisPoints;
  /** Exact to 1/10,000 of a penny; the legal whole-pound rounding happens only on the final total. */
  taxPenceBeforeFinalRounding: number;
  sourceIds: string[];
}

export type SdltRegime = "standard" | "first-time-buyer" | "higher-rates";
export type SdltTreatmentApplied =
  | "standard-residential"
  | "first-time-buyer-relief"
  | "higher-rates-transaction"
  | "non-resident-surcharge";

export interface SdltCalculation {
  currency: "GBP";
  effectiveDate: string;
  chargeableConsiderationPence: Pence;
  taxBeforeRoundingPence: number;
  taxDuePence: Pence;
  rounding: "down-to-whole-pound";
  roundingAdjustmentPence: number;
  regime: SdltRegime;
  treatmentsApplied: SdltTreatmentApplied[];
  bands: SdltBandResult[];
  decisions: SdltDecision[];
  explanation: string[];
}

export interface SdltInvalidInput {
  status: "invalid_input";
  errors: SdltInputError[];
}

export interface SdltNeedsReview {
  status: "needs_review";
  calculation: null;
  reviewReasons: SdltReviewReason[];
  trust: SdltTrust;
}

export interface SdltCalculated {
  status: "calculated";
  calculation: SdltCalculation;
  reviewReasons: [];
  trust: SdltTrust;
}

export type ResidentialSdltOutcome = SdltInvalidInput | SdltNeedsReview | SdltCalculated;
