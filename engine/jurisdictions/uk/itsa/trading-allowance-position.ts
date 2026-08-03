import { configFor } from "./config";
import type { Pence, TaxYear } from "./types";

export type TradingAllowanceIncomeSource =
  | "unconnected-customers"
  | "employer"
  | "unknown";
export type TradingAllowanceRoute = "trading-allowance" | "ordinary-method" | "same";

export interface TradingAllowancePositionInput {
  totalRelevantIncome: Pence;
  ordinaryMethodDeductions: Pence;
  incomeSource: TradingAllowanceIncomeSource;
  taxYear: TaxYear;
}

export interface TradingAllowanceTrustBoundary {
  sources: readonly {
    label: string;
    href: string;
  }[];
  effectiveFrom: string;
  reviewedOn: string;
  supports: readonly string[];
  doesNotProve: readonly string[];
}

export interface TradingAllowanceReviewReason {
  code: "income-source-unknown" | "income-source-invalid" | "possible-loss";
  text: string;
  nextFact: string;
}

interface TradingAllowanceCalculationBase {
  totalRelevantIncome: Pence;
  ordinaryMethodDeductions: Pence;
  ordinaryMethodProfit: Pence;
}

export type TradingAllowanceCalculation =
  | (TradingAllowanceCalculationBase & {
      route: "ordinary-method";
      allowance: null;
      allowanceAvailable: false;
      tradingAllowanceProfit: null;
    })
  | (TradingAllowanceCalculationBase & {
      route: TradingAllowanceRoute;
      allowance: Pence;
      allowanceAvailable: true;
      tradingAllowanceProfit: Pence;
    });

export type TradingAllowancePosition =
  | {
      status: "needs_review";
      calculation: null;
      reason: TradingAllowanceReviewReason;
      trust: TradingAllowanceTrustBoundary;
    }
  | {
      status: "calculated";
      calculation: TradingAllowanceCalculation;
      reason: null;
      trust: TradingAllowanceTrustBoundary;
    };

function assertPence(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of pence.`);
  }
}

function routeFor(allowanceProfit: Pence, ordinaryMethodProfit: Pence): TradingAllowanceRoute {
  if (allowanceProfit < ordinaryMethodProfit) return "trading-allowance";
  if (ordinaryMethodProfit < allowanceProfit) return "ordinary-method";
  return "same";
}

function isTradingAllowanceIncomeSource(value: unknown): value is TradingAllowanceIncomeSource {
  return value === "unknown" || value === "unconnected-customers" || value === "employer";
}

/**
 * A narrow teaching evaluator for the Review Line.
 *
 * Unlike `tradingAllowanceCheck`, this function never keys in an eligibility conclusion. It
 * derives the Review Line from one observable income-source fact. An unresolved source is a
 * successful `needs_review` result with no calculation. Income from the fictional trader's
 * employer removes the allowance route and calculates only the ordinary-method profit. It does
 * not estimate final tax, filing duties or personal suitability.
 */
export function tradingAllowancePosition(
  input: TradingAllowancePositionInput,
): TradingAllowancePosition {
  assertPence(input.totalRelevantIncome, "Total relevant income");
  assertPence(input.ordinaryMethodDeductions, "Ordinary-method deductions");

  const config = configFor(input.taxYear);
  const allowance = config.tradingAllowance.value;
  const trust: TradingAllowanceTrustBoundary = {
    sources: [
      {
        label: "GOV.UK — trading and property income allowances",
        href: config.tradingAllowance.source,
      },
      {
        label: "HMRC BIM86015 — relevant income and partial relief",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86015",
      },
      {
        label: "HMRC BIM86050 — capital allowances",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86050",
      },
    ],
    effectiveFrom: config.tradingAllowance.effectiveFrom,
    reviewedOn: "2026-08-04",
    supports: [
      "An eligible individual may use the trading allowance instead of ordinary-method expenses and other allowances.",
      "The trading allowance and ordinary-method deductions are alternative routes, never a combined deduction.",
      "The allowances are unavailable if any trade or property income comes from an employer or another payer relationship listed by HMRC.",
      "The trading allowance does not apply to partnership trading income.",
    ],
    doesNotProve: [
      "That a real person's income is eligible for the allowance.",
      "That all relevant income, allowable expenses and capital allowances have been captured.",
      "That the stated ordinary-method deductions are allowable or adequately evidenced.",
      "Any final tax liability, filing duty, HMRC decision or personal recommendation.",
    ],
  };

  if (!isTradingAllowanceIncomeSource(input.incomeSource)) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "income-source-invalid",
        text:
          "The income-source fact is not recognised. The allowance route stays closed rather than treating malformed input as eligibility.",
        nextFact: "Provide one recognised income-source fact before running the comparison.",
      },
      trust,
    };
  }

  const possibleLoss = input.ordinaryMethodDeductions > input.totalRelevantIncome;

  if (input.incomeSource === "unknown") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "income-source-unknown",
        text: possibleLoss
          ? "Two independent boundaries remain: the payer relationship is unresolved and ordinary-method deductions exceed total relevant income. No route comparison can safely run."
          : "The payer relationship is unresolved. One excluded income source can remove the allowance route for the tax year, so the comparison must stop.",
        nextFact: possibleLoss
          ? "Identify every payer, then use the full profit, loss and relief rules before comparing routes."
          : "Check the invoices and bank records to identify who paid every income item in this fictional sole trade.",
      },
      trust,
    };
  }

  if (possibleLoss) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "possible-loss",
        text:
          "Ordinary-method deductions exceed total relevant income. Loss and relief choices sit outside this no-loss worked example.",
        nextFact: "Use the full profit and loss rules before choosing a relief route.",
      },
      trust,
    };
  }

  const ordinaryMethodProfit = input.totalRelevantIncome - input.ordinaryMethodDeductions;

  if (input.incomeSource === "employer") {
    return {
      status: "calculated",
      calculation: {
        route: "ordinary-method",
        totalRelevantIncome: input.totalRelevantIncome,
        ordinaryMethodDeductions: input.ordinaryMethodDeductions,
        allowance: null,
        allowanceAvailable: false,
        tradingAllowanceProfit: null,
        ordinaryMethodProfit,
      },
      reason: null,
      trust,
    };
  }

  const allowanceDeduction = Math.min(input.totalRelevantIncome, allowance);
  const tradingAllowanceProfit = input.totalRelevantIncome - allowanceDeduction;

  return {
    status: "calculated",
    calculation: {
      route: routeFor(tradingAllowanceProfit, ordinaryMethodProfit),
      totalRelevantIncome: input.totalRelevantIncome,
      ordinaryMethodDeductions: input.ordinaryMethodDeductions,
      allowance,
      allowanceAvailable: true,
      tradingAllowanceProfit,
      ordinaryMethodProfit,
    },
    reason: null,
    trust,
  };
}
