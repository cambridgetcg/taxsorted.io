import { configFor } from "./config";
import type { Pence } from "./types";

export type TradingAllowanceExcludedIncome = "none" | "present" | "unknown";
export type TradingAllowanceFactPeriodState =
  | "full-year-projection"
  | "completed-tax-year"
  | "year-to-date"
  | "unknown";
export type TradingAllowanceRentARoomReceipts = "none" | "present" | "unknown";
export type TradingAllowanceRelevantIncomeBoundary =
  | "complete-continuing-trade"
  | "needs-review"
  | "unknown";
export type TradingAllowanceTradeScope =
  | "single-trade-complete"
  | "additional-relevant-income"
  | "unknown";
export type TradingAllowanceBasisPeriodTransitionProfit =
  | "no-amount-arises"
  | "amount-arises"
  | "unknown";
export type TradingAllowanceRoute = "trading-allowance" | "ordinary-method" | "same";

export interface TradingAllowancePositionInput {
  totalRelevantIncome: Pence;
  ordinaryMethodDeductions: Pence;
  excludedIncome: TradingAllowanceExcludedIncome;
  factPeriodState: TradingAllowanceFactPeriodState;
  rentARoomReceipts: TradingAllowanceRentARoomReceipts;
  relevantIncomeBoundary: TradingAllowanceRelevantIncomeBoundary;
  tradeScope: TradingAllowanceTradeScope;
  basisPeriodTransitionProfit: TradingAllowanceBasisPeriodTransitionProfit;
  taxYear: "2026-27";
  evaluationDate: string;
}

export interface TradingAllowanceTrustBoundary {
  sources: readonly {
    label: string;
    href: string;
    kind: "primary legislation" | "official guidance" | "HMRC internal manual";
    force: "law" | "guidance";
    retrievedOn: string;
    supports: string;
    doesNotProve: string;
  }[];
  rulesetVersion: string;
  taxYear: "2026-27";
  taxYearStart: "2026-04-06";
  taxYearEnd: "2027-04-05";
  effectiveFrom: string;
  legalBasisFrom: string;
  reviewedOn: string;
  reviewDueOn: string;
  evaluatedOn: string;
  capability: {
    maximumState: "calculated";
    wholeBurdenCompared: false;
  };
  supports: readonly string[];
  doesNotProve: readonly string[];
}

export interface TradingAllowanceReviewReason {
  code:
    | "evaluation-date-invalid"
    | "tax-year-unsupported"
    | "source-review-not-yet-valid"
    | "source-overdue"
    | "fact-period-state-invalid"
    | "fact-period-state-unknown"
    | "year-to-date-figures"
    | "tax-year-not-complete"
    | "trade-scope-invalid"
    | "trade-scope-unknown"
    | "additional-relevant-income"
    | "relevant-income-boundary-invalid"
    | "relevant-income-boundary-unknown"
    | "relevant-income-boundary-needs-review"
    | "basis-period-transition-profit-invalid"
    | "basis-period-transition-profit-unknown"
    | "basis-period-transition-profit-present"
    | "rent-a-room-receipts-invalid"
    | "rent-a-room-receipts-unknown"
    | "rent-a-room-receipts-present"
    | "excluded-income-unknown"
    | "excluded-income-invalid"
    | "possible-loss";
  text: string;
  nextFact: string;
}

export interface TradingAllowanceRouteActions {
  tradingAllowance: string | null;
  ordinaryMethod: string;
  normalElectionDeadline: string | null;
  lateElectionReview: string | null;
}

interface TradingAllowanceCalculationBase {
  factPeriodState: "full-year-projection" | "completed-tax-year";
  totalRelevantIncome: Pence;
  ordinaryMethodDeductions: Pence;
  ordinaryMethodProfit: Pence;
  allowanceLimit: Pence;
  routeActions: TradingAllowanceRouteActions;
}

export type TradingAllowanceCalculation =
  | (TradingAllowanceCalculationBase & {
      route: "ordinary-method";
      allowanceDeduction: null;
      allowanceAvailable: false;
      tradingAllowanceProfit: null;
    })
  | (TradingAllowanceCalculationBase & {
      route: TradingAllowanceRoute;
      allowanceDeduction: Pence;
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

function electionDeadlineFor(taxYear: "2026-27"): string {
  const startYear = Number.parseInt(taxYear.split("-")[0], 10);
  return `${startYear + 3}-01-31`;
}

function isTradingAllowanceExcludedIncome(value: unknown): value is TradingAllowanceExcludedIncome {
  return value === "unknown" || value === "none" || value === "present";
}

function isTradingAllowanceFactPeriodState(
  value: unknown,
): value is TradingAllowanceFactPeriodState {
  return value === "unknown"
    || value === "full-year-projection"
    || value === "completed-tax-year"
    || value === "year-to-date";
}

function isTradingAllowanceRentARoomReceipts(
  value: unknown,
): value is TradingAllowanceRentARoomReceipts {
  return value === "unknown" || value === "none" || value === "present";
}

function isTradingAllowanceRelevantIncomeBoundary(
  value: unknown,
): value is TradingAllowanceRelevantIncomeBoundary {
  return value === "unknown" || value === "complete-continuing-trade" || value === "needs-review";
}

function isTradingAllowanceTradeScope(value: unknown): value is TradingAllowanceTradeScope {
  return value === "unknown" || value === "single-trade-complete" || value === "additional-relevant-income";
}

function isTradingAllowanceBasisPeriodTransitionProfit(
  value: unknown,
): value is TradingAllowanceBasisPeriodTransitionProfit {
  return value === "unknown" || value === "no-amount-arises" || value === "amount-arises";
}

function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * A bounded trading-allowance position evaluator.
 *
 * It calculates only when the visitor confirms that all figures and boundary facts describe
 * either a full-year scenario or a completed tax year for one sole trade, that no other relevant
 * trade or miscellaneous-income source exists, and that no basis-period transition-profit amount
 * arises. Year-to-date figures, prematurely claimed completed years and material unknowns return
 * `needs_review` without figures. It does not estimate final tax, filing duties or suitability.
 */
export function tradingAllowancePosition(
  input: TradingAllowancePositionInput,
): TradingAllowancePosition {
  assertPence(input.totalRelevantIncome, "Total relevant income");
  assertPence(input.ordinaryMethodDeductions, "Ordinary-method deductions");

  const config = configFor("2026-27");
  const allowance = config.tradingAllowance.value;
  const trust: TradingAllowanceTrustBoundary = {
    sources: [
      {
        label: "ITTOIA 2005 section 783A — statutory relief framework",
        href: "https://www.legislation.gov.uk/ukpga/2005/5/section/783A",
        kind: "primary legislation",
        force: "law",
        retrievedOn: "2026-08-25",
        supports: "That the statutory chapter provides full and partial relief for relevant trade and miscellaneous income, using alternative methods and subject to exclusions.",
        doesNotProve: "That a person's facts qualify, that an election was made or that every prospective legislative change is in force for this tax year.",
      },
      {
        label: "HMRC BIM86000 — elections, claims and overview",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86000",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That partial relief above £1,000 requires an election and that an individual can elect out of full relief at £1,000 or below.",
        doesNotProve: "That a particular election was made, was in time or is suitable for this person's wider tax position.",
      },
      {
        label: "GOV.UK — trading and property income allowances",
        href: config.tradingAllowance.source,
        kind: "official guidance",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "The allowance amount, its alternative relationship with expenses, payer exclusions and the partnership-income boundary.",
        doesNotProve: "That this person's income is eligible or that the allowance is suitable for their wider position.",
      },
      {
        label: "HMRC BIM86027 — election timing",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86027",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "The statutory time limit for making a trading-allowance election.",
        doesNotProve: "That an election was actually made, received or accepted.",
      },
      {
        label: "HMRC BIM86029 — late elections",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86029",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That a late return can include a trading-allowance election after the normal election time limit, within the general four-year claim limit.",
        doesNotProve: "That a late return or election is available, complete or in time for this person.",
      },
      {
        label: "HMRC BIM86007 — measuring relevant income",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86007",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That relevant income is measured before expenses under the applicable cash-basis or GAAP rules and includes own-use values and balancing charges.",
        doesNotProve: "Which accounting basis applies or that every receipt, own-use value and balancing charge has been measured correctly.",
      },
      {
        label: "HMRC BIM86010 — total relevant income",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86010",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That the £1,000 test uses the individual's total relevant income from every relevant trade and miscellaneous-income source for the year.",
        doesNotProve: "That the visitor has identified and included every relevant trade or miscellaneous-income source.",
      },
      {
        label: "HMRC BIM86015 — relevant income and partial relief",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86015",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "How relevant income and partial relief feed the bounded trading-profit calculation.",
        doesNotProve: "That every relevant income source or payer relationship has been captured.",
      },
      {
        label: "HMRC BIM86018 — more than one trade",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86018",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That each trade needs a separate computation before relevant income, expenses and relief are brought together under the multi-trade rules.",
        doesNotProve: "How a real person's activities divide into trades or whether any stated trade loss is complete and allowable.",
      },
      {
        label: "HMRC BIM81310 — spread transition profit",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim81310",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That spread transition profit can be treated as arising in 2026–27 and increases chargeable trading profits for the year.",
        doesNotProve: "Whether transition profit arose, what remains after prior spreading or elections, or the amount chargeable for this person's scenario.",
      },
      {
        label: "HMRC BIM86030 — trading allowance exclusions",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86030",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That an exclusion can remove trading-allowance eligibility from every trading and miscellaneous-income source for the tax year, and that Rent-a-Room receipts have their own exclusion rules.",
        doesNotProve: "Which exclusion or Rent-a-Room treatment applies to a particular person's facts.",
      },
      {
        label: "HMRC BIM86032 — connected-partnership exclusions",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86032",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That a partnership payment is excluded when the individual is a partner or is connected with a partner, including the common family relationships HMRC lists.",
        doesNotProve: "Whether a partnership exists or whether the full statutory connected-person definition applies to a particular relationship.",
      },
      {
        label: "HMRC BIM86036 — employer exclusions",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86036",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That the employer exclusion depends on the person's or their spouse's or civil partner's employment status at the time of payment.",
        doesNotProve: "Who employed whom when a payment was made or whether the receipt is trading, miscellaneous or employment income.",
      },
      {
        label: "HMRC BIM86074 — source-specific exclusion example",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86074",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That an excluded payment included in relevant income removes the trading allowance from all relevant income, while separate partnership income is not itself folded into that relevant-income amount.",
        doesNotProve: "That a particular receipt belongs to trading, miscellaneous or property income, or that the separate property-allowance rules apply.",
      },
      {
        label: "HMRC BIM86034 — Rent-a-Room interactions",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86034",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That Rent-a-Room receipts are not a relevant trade and that particular Rent-a-Room elections or ordinary-expense choices can remove trading-allowance relief from other relevant income.",
        doesNotProve: "Whether Rent-a-Room relief applies, which election was made, or how that choice affects this person's wider property position.",
      },
      {
        label: "HMRC BIM86038 — close-company exclusions",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86038",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That a close-company payment is excluded when the individual is a participator or an associate of a participator at the time of payment.",
        doesNotProve: "Whether a company is close or whether a person meets the statutory participator or associate definitions.",
      },
      {
        label: "HMRC BIM86050 — capital allowances",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86050",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That the trading allowance replaces expenses and capital allowances for this route rather than being added to them.",
        doesNotProve: "That the stated ordinary-method deductions or capital allowances are complete, allowable or evidenced.",
      },
      {
        label: "HMRC BIM86046 — post-cessation receipts",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86046",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That the trading allowance cannot reduce gross income from post-cessation receipts.",
        doesNotProve: "Whether a receipt is post-cessation or how its separate charge and any post-cessation expense should be handled.",
      },
      {
        label: "HMRC BIM86048 — adjustment income",
        href: "https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim86048",
        kind: "HMRC internal manual",
        force: "guidance",
        retrievedOn: "2026-08-25",
        supports: "That the trading allowance cannot reduce the charge on adjustment income arising from a change of accounting basis.",
        doesNotProve: "Whether adjustment income exists or how it should be calculated or spread.",
      },
    ],
    rulesetVersion: "uk-itsa-trading-allowance/2026-27.2",
    taxYear: "2026-27",
    taxYearStart: "2026-04-06",
    taxYearEnd: "2027-04-05",
    effectiveFrom: config.tradingAllowance.effectiveFrom,
    legalBasisFrom: "2017-04-06",
    reviewedOn: "2026-08-25",
    reviewDueOn: "2026-11-25",
    evaluatedOn: input.evaluationDate,
    capability: {
      maximumState: "calculated",
      wholeBurdenCompared: false,
    },
    supports: [
      "An eligible individual may use the trading allowance instead of allowable expenses and capital allowances for the same income.",
      "The trading allowance and ordinary-method deductions are alternative routes, never a combined deduction.",
      "The trading allowance is unavailable if relevant trading or miscellaneous income includes a payment made while an excluded payer relationship exists.",
      "The trading allowance does not apply to partnership trading income.",
      "Each trade needs its own computation; this first module accepts exactly one sole trade and never nets separate trade losses.",
      "A full-year projection stays visibly separate from completed tax-year facts; year-to-date figures never become a whole-year result.",
      "Relevant income must be measured under the applicable accounting basis before expenses, including required own-use values and balancing charges.",
      "Post-cessation receipts and adjustment income cannot be reduced by the trading allowance; this first module stops when those items may exist.",
      "Spread transition profit can increase chargeable trading profit in 2026–27; this first module stops when it may exist.",
      "Rent-a-Room receipts can interact with trading-allowance eligibility; this first module stops instead of assuming which Rent-a-Room treatment applies.",
      "Close-company exclusions use the statutory participator and associate tests, not an ownership shortcut.",
      "Partial relief above £1,000 requires an election, while an individual can elect for full relief not to apply at £1,000 or below; late-return rules need separate review.",
    ],
    doesNotProve: [
      "That a real person's income is eligible for the allowance.",
      "That a full-year projection will match the person's eventual records or completed tax-year figures.",
      "That all relevant income, allowable expenses and capital allowances have been captured.",
      "That the visitor chose the correct accounting basis or classified any special receipt correctly.",
      "That the stated ordinary-method deductions are allowable or adequately evidenced.",
      "Any final tax liability, filing duty, HMRC decision or personal recommendation.",
    ],
  };

  if (input.taxYear !== "2026-27") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "tax-year-unsupported",
        text: "This published ruleset covers 2026–27 only. No figures are produced for a different or malformed tax year.",
        nextFact: "Use a reviewed ruleset published for the tax year you need.",
      },
      trust,
    };
  }

  if (!isIsoCalendarDate(input.evaluationDate)) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "evaluation-date-invalid",
        text: "The calculation date is missing or malformed, so source freshness cannot be established.",
        nextFact: "Run the module with a real calendar date before using the ruleset.",
      },
      trust,
    };
  }

  if (input.evaluationDate > trust.reviewDueOn) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "source-overdue",
        text: "This ruleset is overdue for source review. No figures are produced from guidance that may have changed.",
        nextFact: "Check the current official sources and publish a reviewed ruleset before calculating.",
      },
      trust,
    };
  }

  if (input.evaluationDate < trust.reviewedOn) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "source-review-not-yet-valid",
        text: "The calculation date predates this source review, so the receipt cannot truthfully claim that these rules had been checked then.",
        nextFact: "Use the real current date with a ruleset that had already been reviewed on that date.",
      },
      trust,
    };
  }

  if (!isTradingAllowanceFactPeriodState(input.factPeriodState)) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "fact-period-state-invalid",
        text: "The fact-period state is not recognised. Malformed input is never treated as a complete tax-year scenario.",
        nextFact: "State whether every supplied figure and boundary fact describes a full-year projection, a completed tax year or only the year to date.",
      },
      trust,
    };
  }

  if (input.factPeriodState === "unknown") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "fact-period-state-unknown",
        text: "The figures and boundary facts are not confirmed as one full 2026–27 scenario or a completed tax year. An unfinished period cannot be presented as a whole-year result.",
        nextFact: "Either build one full-year scenario through 5 April 2027 or wait for the tax year to end and complete the records.",
      },
      trust,
    };
  }

  if (input.factPeriodState === "year-to-date") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "year-to-date-figures",
        text: "These are year-to-date or partial-period figures. Later income, deductions, relationships, Rent-a-Room activity, transition profit or cessation could change both routes, so no full-year projection is emitted.",
        nextFact: "Replace the partial figures with a clearly labelled full-year scenario before comparing the two routes.",
      },
      trust,
    };
  }

  if (input.factPeriodState === "completed-tax-year" && input.evaluationDate <= trust.taxYearEnd) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "tax-year-not-complete",
        text: "The 2026–27 tax year has not ended, so its facts cannot yet be labelled completed. No completed-year result is emitted.",
        nextFact: "Use a clearly labelled full-year projection now, or return after 5 April 2027 with complete records and a freshly reviewed ruleset.",
      },
      trust,
    };
  }

  if (!isTradingAllowanceTradeScope(input.tradeScope)) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "trade-scope-invalid",
        text: "The trade-scope fact is not recognised. Combined activity is never assumed to be one trade.",
        nextFact: "State whether the figures belong to exactly one sole trade.",
      },
      trust,
    };
  }

  if (input.tradeScope === "unknown") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "trade-scope-unknown",
        text: "The figures are not confirmed as one sole trade. Separate trades can contain separate profits and losses, so aggregation could hide a material loss.",
        nextFact: "Identify each trade and confirm that these income and deduction figures belong to exactly one of them.",
      },
      trust,
    };
  }

  if (input.tradeScope === "additional-relevant-income") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "additional-relevant-income",
        text: "The supplied whole-year state includes another relevant trade or miscellaneous-income source. Total relevant income and each trade computation must be established before relief choices can be assessed.",
        nextFact: "Identify every relevant trade and miscellaneous-income source, then separate each trade's income, deductions and any loss.",
      },
      trust,
    };
  }

  if (!isTradingAllowanceRelevantIncomeBoundary(input.relevantIncomeBoundary)) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "relevant-income-boundary-invalid",
        text: "The relevant-income measurement fact is not recognised. Malformed input is never treated as a complete income figure.",
        nextFact: "Confirm how the one-trade income figure was measured before comparing relief routes.",
      },
      trust,
    };
  }

  if (input.relevantIncomeBoundary === "unknown") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "relevant-income-boundary-unknown",
        text: "The income measure has not been checked. Cash-basis and GAAP timing, own-use values and balancing charges can change total relevant income and which relief rules apply.",
        nextFact: "Establish the accounting basis and a complete before-expenses relevant-income figure for the continuing trade.",
      },
      trust,
    };
  }

  if (input.relevantIncomeBoundary === "needs-review") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "relevant-income-boundary-needs-review",
        text: "The income figure may omit a required own-use value or balancing charge, or the year includes adjustment income or a post-cessation receipt that the trading allowance cannot reduce. No route comparison is produced.",
        nextFact: "Measure relevant income under the applicable accounting basis and separate any adjustment income or post-cessation receipt before using this module.",
      },
      trust,
    };
  }

  if (!isTradingAllowanceBasisPeriodTransitionProfit(input.basisPeriodTransitionProfit)) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "basis-period-transition-profit-invalid",
        text: "The basis-period transition-profit fact is not recognised. Malformed input cannot establish the full 2026–27 chargeable-profit boundary.",
        nextFact: "Check whether any spread transition profit from 2023–24 is treated as arising in this 2026–27 scenario.",
      },
      trust,
    };
  }

  if (input.basisPeriodTransitionProfit === "unknown") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "basis-period-transition-profit-unknown",
        text: "Spread transition profit has not been checked. An amount treated as arising in 2026–27 would increase chargeable trading profit outside both figures shown by this first module.",
        nextFact: "Check the 2023–24 transition-profit calculation, spreading and any acceleration election before using this comparison.",
      },
      trust,
    };
  }

  if (input.basisPeriodTransitionProfit === "amount-arises") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "basis-period-transition-profit-present",
        text: "Transition profit is treated as arising in this 2026–27 scenario. This first module does not add that separate chargeable-profit component, so displaying either route as the whole trading profit would be incomplete.",
        nextFact: "Calculate the 2026–27 transition-profit amount and use a full trading-profit computation before comparing relief routes.",
      },
      trust,
    };
  }

  const possibleLoss = input.ordinaryMethodDeductions > input.totalRelevantIncome;

  if (!isTradingAllowanceRentARoomReceipts(input.rentARoomReceipts)) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "rent-a-room-receipts-invalid",
        text: "The Rent-a-Room fact is not recognised. The allowance route stays closed rather than treating malformed input as no receipts.",
        nextFact: "State whether any Rent-a-Room receipts arose during the tax year.",
      },
      trust,
    };
  }

  if (input.rentARoomReceipts === "unknown") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "rent-a-room-receipts-unknown",
        text: possibleLoss
          ? "Two independent boundaries remain: Rent-a-Room receipts are unresolved and ordinary-method deductions exceed this trade's income. No route comparison can safely run."
          : "Rent-a-Room receipts are unresolved. Their treatment can affect trading-allowance eligibility for other income, so the comparison must stop.",
        nextFact: possibleLoss
          ? "Establish any Rent-a-Room receipts, then use the full profit, loss and relief rules before comparing routes."
          : "Check whether you received income from letting furnished accommodation in your home during the tax year.",
      },
      trust,
    };
  }

  if (input.rentARoomReceipts === "present") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "rent-a-room-receipts-present",
        text: possibleLoss
          ? "Rent-a-Room receipts and a possible trade loss both require rules outside this first module. No route comparison is produced."
          : "Rent-a-Room receipts can change whether trading-allowance relief is due on other relevant income, depending on the Rent-a-Room relief and election facts. This first module does not assume the answer.",
        nextFact: "Establish the Rent-a-Room receipts, relief limit and any election or ordinary-expense choice before assessing the trading allowance.",
      },
      trust,
    };
  }

  if (!isTradingAllowanceExcludedIncome(input.excludedIncome)) {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "excluded-income-invalid",
        text:
          "The income-source fact is not recognised. The allowance route stays closed rather than treating malformed input as eligibility.",
        nextFact: "Provide one recognised income-source fact before running the comparison.",
      },
      trust,
    };
  }

  if (input.excludedIncome === "unknown") {
    return {
      status: "needs_review",
      calculation: null,
      reason: {
        code: "excluded-income-unknown",
        text: possibleLoss
          ? "Two independent boundaries remain: the payer relationship is unresolved and ordinary-method deductions exceed total relevant income. No route comparison can safely run."
          : "The payer relationship is unresolved. One excluded payment within relevant trading or miscellaneous income can remove the allowance route for the tax year, so the comparison must stop.",
        nextFact: possibleLoss
          ? "Identify every payer, then use the full profit, loss and relief rules before comparing routes."
          : "Check who made every payment within relevant trading or miscellaneous income, and which employment, partnership or close-company relationship existed when each payment was made.",
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
  const normalElectionDeadline = electionDeadlineFor(input.taxYear);
  const electionDeadlineLabel = `31 January ${normalElectionDeadline.slice(0, 4)}`;
  const lateElectionReview = "A late return may include the election after this date within the general four-year claim limit. This module does not decide whether that route is available or in time.";
  const actionCondition = input.factPeriodState === "full-year-projection"
    ? "If completed facts match this scenario, "
    : "On the completed facts supplied, ";
  const routeActions: TradingAllowanceRouteActions = input.totalRelevantIncome <= allowance
    ? {
        tradingAllowance: `${actionCondition}full relief can apply without a partial-relief election, subject to the person's filing and excluded-income facts.`,
        ordinaryMethod: `${actionCondition}the ordinary route requires an election for full relief not to apply. The normal on-time limit is ${electionDeadlineLabel}; keep evidence for the deductions claimed.`,
        normalElectionDeadline,
        lateElectionReview,
      }
    : {
        tradingAllowance: `${actionCondition}partial relief requires an election in Self Assessment. The normal on-time limit is ${electionDeadlineLabel}. This result does not make that election.`,
        ordinaryMethod: `${actionCondition}the ordinary profit rules apply; retain evidence for every deduction claimed.`,
        normalElectionDeadline,
        lateElectionReview,
      };

  if (input.excludedIncome === "present") {
    return {
      status: "calculated",
      calculation: {
        factPeriodState: input.factPeriodState,
        route: "ordinary-method",
        totalRelevantIncome: input.totalRelevantIncome,
        ordinaryMethodDeductions: input.ordinaryMethodDeductions,
        allowanceLimit: allowance,
        routeActions: {
          tradingAllowance: null,
          ordinaryMethod: `${actionCondition}the allowance is unavailable under this payer fact. Use the ordinary profit rules and retain evidence for every deduction; no allowance election is available in this bounded result.`,
          normalElectionDeadline: null,
          lateElectionReview: null,
        },
        allowanceDeduction: null,
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
      factPeriodState: input.factPeriodState,
      route: routeFor(tradingAllowanceProfit, ordinaryMethodProfit),
      totalRelevantIncome: input.totalRelevantIncome,
      ordinaryMethodDeductions: input.ordinaryMethodDeductions,
      allowanceLimit: allowance,
      routeActions,
      allowanceDeduction,
      allowanceAvailable: true,
      tradingAllowanceProfit,
      ordinaryMethodProfit,
    },
    reason: null,
    trust,
  };
}
