export type PlanningLever = "pension" | "giftAid" | "salarySacrifice" | "isa" | "spouseTransfer" | "timing" | "claimChildBenefit";

export interface UKPersonalProfile {
  /** Employment income, bonus, benefits, trading profit, rent, savings, dividends etc before Personal Allowance. */
  employmentIncome?: number;
  selfEmploymentProfit?: number;
  propertyIncome?: number;
  pensionIncome?: number;
  savingsInterest?: number;
  dividendIncome?: number;
  capitalGains?: number;
  otherTaxableIncome?: number;

  /** Reliefs used for adjusted net income. Net Gift Aid / relief-at-source pension payments are grossed up at 20%. */
  tradingLosses?: number;
  grossPensionContributions?: number;
  reliefAtSourcePensionContributionsNet?: number;
  giftAidDonationsNet?: number;

  /** Family context for HICBC. If annualChildBenefit is supplied it wins; otherwise children count estimates 2026/27 rates. */
  children?: number;
  annualChildBenefit?: number;
  partnerAdjustedNetIncome?: number;

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
  };
  pensionAnnualAllowance: {
    annualAllowance: number;
    tapered: boolean;
    excessInput: number;
    notes: string[];
  };
  warnings: ThresholdWarning[];
  moves: PlanningMove[];
  sources: Record<string, string>;
}
