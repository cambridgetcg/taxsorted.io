export type PlanningLever = "pension" | "giftAid" | "salarySacrifice" | "isa" | "spouseTransfer" | "timing" | "claimChildBenefit";

export type KnownPartnerIncome =
  | { status: "none" }
  | { status: "unknown" }
  | {
    status: "known";
    /** Whole-pence ANI supplied directly, when no sub-penny gross-up precision is available. */
    adjustedNetIncomePence: number;
    adjustedNetIncomeQuarterPence?: never;
  }
  | {
    status: "known";
    /** Exact scaled ANI, suitable for piping from amountQuarterPence without a boundary drift. */
    adjustedNetIncomeQuarterPence: number;
    adjustedNetIncomePence?: never;
  };

export interface ThresholdInteractionInput {
  taxYear: "2026-27";
  individual: {
    /** Total taxable income before Personal Allowance and the ANI adjustments below. */
    totalTaxableIncomePence?: number;
    /** Reliefs deducted when arriving at net income, such as qualifying losses or gross pension payments. */
    netIncomeDeductionsPence?: number;
    /** What actually left the bank; the engine grosses this up at the basic rate. */
    reliefAtSourcePensionContributionsNetPence?: number;
    /** What actually left the bank; the engine grosses this up at the basic rate. */
    giftAidDonationsNetPence?: number;
    /** Step 4 of HMRC's ANI method: relief previously deducted for specified trade-union/police payments. */
    tradeUnionOrPoliceReliefAddBackPence?: number;
  };
  /** HICBC partner under ITEPA 2003 s 681G, for one unchanged assessment period. */
  hicbcPartner: KnownPartnerIncome;
  /** Tax-Free Childcare partner under Childcare Payments (Eligibility) Regulations 2015 reg 3. */
  taxFreeChildcarePartner: KnownPartnerIncome;
  /**
   * Payments received for the unchanged HICBC partner period. Omit to leave unassessed; explicit
   * zero means no payment (including a full-period opt-out). Split changed periods outside.
   */
  annualChildBenefitPence?: number;
  /** Needed only for an equal-income tie; a claimant outside this modelled pair is out of scope. */
  childBenefitClaimant?: "individual" | "partner";
  /** Omit to leave the Tax-Free Childcare income test unassessed. Counts are mutually exclusive. */
  taxFreeChildcareChildren?: { ordinary: number; disabled: number };
}

export interface ThresholdInteractionAssessment {
  schema: "taxsorted.uk.personal-thresholds/1";
  taxYear: "2026-27";
  ruleset: { version: string; effectiveFrom: string; reviewedOn: string };
  adjustedNetIncome: {
    status: "determined" | "needs-facts";
    totalTaxableIncomePence: number | null;
    netIncomeDeductionsPence: number;
    /** Nearest-penny presentation value; exact gross-up is retained below. */
    reliefAtSourcePensionGrossedUpPence: number;
    reliefAtSourcePensionGrossedUpQuarterPence: number;
    giftAidGrossedUpPence: number;
    giftAidGrossedUpQuarterPence: number;
    tradeUnionOrPoliceReliefAddBackPence: number;
    /** Nearest-penny presentation value; threshold comparisons use amountQuarterPence. */
    amountPence: number | null;
    amountQuarterPence: number | null;
    calculationPrecision: "quarter-pence";
    missingFacts: string[];
  };
  personalAllowance: {
    status: "determined" | "needs-facts";
    amountPence: number | null;
    lostPence: number | null;
    fullyLost: boolean | null;
  };
  highIncomeChildBenefitCharge: {
    status: "not-checked" | "needs-facts" | "no-charge" | "charge";
    liablePerson: "individual" | "partner" | "unknown" | null;
    /** Nearest-penny presentation value; classification retains the exact scaled value below. */
    liableAdjustedNetIncomePence: number | null;
    liableAdjustedNetIncomeQuarterPence: number | null;
    chargePercent: number | null;
    estimatedChargePence: number | null;
    missingFacts: string[];
  };
  taxFreeChildcare: {
    status: "not-checked" | "needs-facts" | "passes-income-test" | "fails-income-test";
    incomeLimitPence: number;
    /** Ceilings to pence for an actionable distance; exact classification uses quarter-pence. */
    individualOverByPence: number | null;
    partnerOverByPence: number | null;
    individualOverByQuarterPence: number | null;
    partnerOverByQuarterPence: number | null;
    potentialAnnualTopUpPence: number | null;
    missingFacts: string[];
    /** Passing this income test is not a full eligibility decision. */
    fullEligibilityDetermined: false;
  };
  sources: Record<string, string>;
}

export interface UKPersonalProfile {
  /** Employment income, bonus, benefits, trading profit, rent, savings, dividends etc before Personal Allowance. */
  employmentIncome?: number;
  selfEmploymentProfit?: number;
  propertyIncome?: number;
  pensionIncome?: number;
  savingsInterest?: number;
  dividendIncome?: number;
  foreignIncome?: number;
  trustIncome?: number;
  taxableStateBenefits?: number;
  capitalGains?: number;
  otherTaxableIncome?: number;

  /** Reliefs used for adjusted net income. Net Gift Aid / relief-at-source pension payments are grossed up at 20%. */
  tradingLosses?: number;
  grossPensionContributions?: number;
  reliefAtSourcePensionContributionsNet?: number;
  giftAidDonationsNet?: number;
  tradeUnionOrPoliceReliefAddBack?: number;

  /**
   * Full-year Child Benefit payment context for HICBC. If annualChildBenefit is supplied it wins;
   * otherwise children estimates 53 weekly 2026/27 payment points. Use zero for a full-year
   * payment opt-out; part-year awards or elections need an explicit annual amount/period check.
   */
  children?: number;
  annualChildBenefit?: number;
  hasPartner?: boolean;
  partnerAdjustedNetIncome?: number;
  /** HICBC-specific overrides; otherwise the legacy generic partner fields above are used. */
  hicbcHasPartner?: boolean;
  hicbcPartnerAdjustedNetIncome?: number;
  /** TFC uses a household-based partner definition, so it can legitimately differ from HICBC. */
  taxFreeChildcareHasPartner?: boolean;
  taxFreeChildcarePartnerAdjustedNetIncome?: number;
  childBenefitClaimant?: "you" | "partner";
  /** Children being checked for TFC, split so the two different top-up caps are not double-counted. */
  taxFreeChildcareChildren?: { ordinary: number; disabled: number };

  /** Pension annual allowance context. Supply actual pension input amount where known. */
  pensionInputAmount?: number;
  employerPensionContributions?: number;
  thresholdIncomeForPensionTaper?: number;
  adjustedIncomeForPensionTaper?: number;
  flexiblyAccessedPension?: boolean;

  /** Optional flag: Scotland has different non-savings earned-income rates. The scanner still reports UK-wide thresholds. */
  taxpayerRegion?: "england-wales-ni" | "scotland";
}

export interface AdjustedNetIncomeBreakdown {
  totalTaxableIncome: number;
  reliefs: {
    tradingLosses: number;
    grossPensionContributions: number;
    reliefAtSourcePensionGrossedUp: number;
    giftAidGrossedUp: number;
  };
  addBacks: { tradeUnionOrPoliceRelief: number };
  adjustedNetIncome: number;
}

export interface PlanningMove {
  lever: PlanningLever;
  title: string;
  action: string;
  grossAmount?: number;
  estimatedNetCost?: number;
  targetAdjustedNetIncome?: number;
  estimatedTaxSaved?: number;
  potentialAnnualSupportProtected?: number;
  why: string;
  caveats: string[];
}

export interface ThresholdWarning {
  code: string;
  severity: "info" | "warning" | "high";
  title: string;
  message: string;
  amountAtRisk?: number;
  currentValue?: number;
  threshold?: number;
  source: string;
}

export interface UKPersonalTaxPlan {
  taxYear: string;
  scope: string;
  adjustedNetIncome: AdjustedNetIncomeBreakdown;
  personalAllowance: { amount: number; lost: number; fullyLost: boolean };
  highIncomeChildBenefitCharge: {
    applies: boolean;
    annualChildBenefit: number;
    chargePercent: number;
    estimatedCharge: number;
    liablePerson?: "you" | "partner" | "unknown";
    liableAdjustedNetIncome: number;
    provisional: boolean;
  };
  taxFreeChildcare: {
    status: ThresholdInteractionAssessment["taxFreeChildcare"]["status"];
    incomeLimit: number;
    individualOverBy: number | null;
    partnerOverBy: number | null;
    potentialAnnualTopUp: number | null;
    missingFacts: string[];
    fullEligibilityDetermined: false;
  };
  pensionAnnualAllowance: {
    annualAllowance: number;
    tapered: boolean;
    excessInput: number;
    notes: string[];
  };
  warnings: ThresholdWarning[];
  moves: PlanningMove[];
  ruleset: { version: string; effectiveFrom: string; reviewedOn: string };
  sources: Record<string, string>;
}
