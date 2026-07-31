import {
  configFor,
  estimateLiability,
  mileageDeduction,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { gbp, gbpCompact } from "@/lib/format";

export type LearningValueKind =
  | "cost-kept-visible"
  | "deduction-found"
  | "estimated-tax-kept";

export interface LearningValue {
  kind: LearningValueKind;
  label: string;
  amount: number;
}

export interface LearningAnswer {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface LearningRound {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  setup: string;
  facts: string[];
  question: string;
  answers: LearningAnswer[];
  explanation: string;
  explainBack: string;
  reward: {
    label: string;
    headline: string;
    values: LearningValue[];
    boundary: string;
  };
  assumptions: string[];
  source: { label: string; href: string };
  next: { label: string; href: string };
}

const TAX_YEAR: TaxYear = "2026-27";
const config = configFor(TAX_YEAR);

const grossSale = 18_000;
const marketplaceFee = 1_800;
const bankPayout = grossSale - marketplaceFee;

const grossTradingIncome = 500_000;
const actualTradingExpenses = 60_000;
const allowanceProfit = grossTradingIncome - config.tradingAllowance.value;
const actualExpenseProfit = grossTradingIncome - actualTradingExpenses;
const otherIncome = 3_000_000;

function estimatedLiability(tradingProfit: number, otherNonSavingsIncome = 0): number {
  return estimateLiability({
    taxYear: TAX_YEAR,
    tradingProfit,
    propertyIncome: 0,
    propertyExpenses: 0,
    residentialFinanceCosts: 0,
    otherNonSavingsIncome,
  }).totalLiability;
}

const allowanceTaxKept =
  estimatedLiability(actualExpenseProfit, otherIncome) -
  estimatedLiability(allowanceProfit, otherIncome);

const businessMiles = 1_200;
const mileage = mileageDeduction(businessMiles, "car-or-van", TAX_YEAR);
const profitBeforeMileage = 3_000_000;
const mileageTaxKept =
  estimatedLiability(profitBeforeMileage) -
  estimatedLiability(profitBeforeMileage - mileage.amount);

/**
 * Three finite worked examples. Money meanings stay separate: a visible cost,
 * a deduction and an estimated tax difference are never added into one total.
 */
export const LEARNING_ROUNDS: readonly LearningRound[] = [
  {
    id: "payout-puzzle",
    number: 1,
    title: "The payout is not the sale",
    shortTitle: "Payout puzzle",
    setup:
      "Mina sells one card through a marketplace. The buyer pays more than the amount that reaches her bank.",
    facts: [
      `Buyer paid ${gbp(grossSale)}.`,
      `Marketplace kept ${gbp(marketplaceFee)} as its fee.`,
      `Bank received ${gbp(bankPayout)}.`,
    ],
    question: "What should Mina keep visible in her books?",
    answers: [
      {
        id: "payout-only",
        label: `${gbp(bankPayout)} sale and no separate fee`,
        correct: false,
        feedback:
          "That matches the bank, but it hides part of the sale and the marketplace cost. The bank line is evidence, not the whole event.",
      },
      {
        id: "gross-fee-payout",
        label: `${gbp(grossSale)} sale, ${gbp(marketplaceFee)} fee and ${gbp(bankPayout)} payout`,
        correct: true,
        feedback:
          "Yes. The three figures reconcile: gross sale minus fee equals the cash that arrived.",
      },
      {
        id: "fee-as-sale",
        label: `${gbp(grossSale)} sale and ${gbp(bankPayout)} fee`,
        correct: false,
        feedback:
          "The sale is right, but the fee is not. Follow each figure back to the marketplace report and bank statement.",
      },
    ],
    explanation:
      "Accounting keeps the event and the cash settlement together without pretending they are the same thing. That makes the fee inspectable instead of burying it inside the payout.",
    explainBack:
      "The bank tells Mina what arrived. The marketplace report explains why that amount is smaller than the sale.",
    reward: {
      label: "Value spotted in this worked example",
      headline: `${gbp(marketplaceFee)} of business cost kept in view`,
      values: [
        {
          kind: "cost-kept-visible",
          label: "Business cost kept visible",
          amount: marketplaceFee,
        },
      ],
      boundary:
        "This is not £18 of accounting income or guaranteed tax saved. Any tax effect depends on whether the fee is allowable and on Mina's full facts.",
    },
    assumptions: [
      "The marketplace collected the buyer's money for Mina and charged the fee shown.",
      "The example is for learning only; it is not saved or filed.",
    ],
    source: {
      label: "GOV.UK — cash-basis income and expenses",
      href: "https://www.gov.uk/simpler-income-tax-cash-basis/income-and-expenses-under-cash-basis",
    },
    next: { label: "Open the full accounting walkthrough", href: "/books#example" },
  },
  {
    id: "allowance-choice",
    number: 2,
    title: "The £1,000 choice",
    shortTitle: "Allowance choice",
    setup:
      "A made-up sole trader has £5,000 gross trading income, £600 verified allowable expenses and £30,000 of other non-savings income.",
    facts: [
      `Trading allowance: ${gbpCompact(config.tradingAllowance.value)}.`,
      `Actual allowable expenses: ${gbp(actualTradingExpenses)}.`,
      "TaxSorted compares two like-for-like bounded rest-of-UK 2026–27 estimates; it never claims both deductions.",
    ],
    question: "Which route leaves the smaller trading profit in this worked example?",
    answers: [
      {
        id: "actual-expenses",
        label: `Actual expenses → ${gbp(actualExpenseProfit)} trading profit`,
        correct: false,
        feedback:
          "The arithmetic is real, but the £1,000 allowance is a larger deduction than £600 of actual expenses in this example.",
      },
      {
        id: "trading-allowance",
        label: `Trading allowance → ${gbp(allowanceProfit)} trading profit`,
        correct: true,
        feedback:
          `Correct. The allowance removes ${gbp(config.tradingAllowance.value - actualTradingExpenses)} more from the example's taxable trading profit.`,
      },
      {
        id: "claim-both",
        label: `Claim both → ${gbp(grossTradingIncome - config.tradingAllowance.value - actualTradingExpenses)} trading profit`,
        correct: false,
        feedback:
          "That would count two mutually exclusive routes. Above £1,000 gross income, the allowance replaces actual expenses; it does not sit on top of them.",
      },
    ],
    explanation:
      `The allowance route reduces the example's trading profit by an extra ${gbp(config.tradingAllowance.value - actualTradingExpenses)}. In TaxSorted's bounded rest-of-UK estimate, that leaves ${gbp(allowanceTaxKept)} less Income Tax to pay.`,
    explainBack:
      "Compare the two permitted deductions first. Only after choosing one route should the tax calculation run.",
    reward: {
      label: "Estimated value revealed in this worked example",
      headline: `${gbp(allowanceTaxKept)} estimated tax kept`,
      values: [
        {
          kind: "deduction-found",
          label: "Extra deduction compared",
          amount: config.tradingAllowance.value - actualTradingExpenses,
        },
        {
          kind: "estimated-tax-kept",
          label: "Estimated tax kept",
          amount: allowanceTaxKept,
        },
      ],
      boundary:
        "The £400 deduction difference and £80 estimate are different facts. This is not income, a refund or your result; eligibility, losses, Scotland, other income and personal facts can change the answer.",
    },
    assumptions: [
      "The person qualifies for the trading allowance and every £600 expense is otherwise allowable.",
      "The estimate uses rest-of-UK non-savings rates for 2026–27 and excludes savings, dividends, pensions and Gift Aid.",
      "A person using full relief at or below £1,000 gross may still face reporting exceptions and must keep records.",
    ],
    source: {
      label: "GOV.UK — trading and property income allowances",
      href: config.tradingAllowance.source,
    },
    next: { label: "Read the self-employed guide", href: "/learn/self-employed" },
  },
  {
    id: "mileage-move",
    number: 3,
    title: "The forgotten mileage",
    shortTitle: "Mileage move",
    setup:
      `A made-up eligible sole trader drove ${businessMiles.toLocaleString("en-GB")} business miles in a car during 2026–27 and had ${gbp(profitBeforeMileage)} profit before any vehicle deduction.`,
    facts: [
      `2026–27 first-10,000-mile rate: ${config.mileageFirst10k.value}p per business mile.`,
      "No vehicle capital allowance or actual running-cost claim has already been used for this car.",
      "TaxSorted compares like-for-like bounded estimates before and after the mileage deduction.",
    ],
    question: "What simplified vehicle expense does the mileage record produce?",
    answers: [
      {
        id: "old-rate",
        label: "£540.00 — 1,200 miles × 45p",
        correct: false,
        feedback:
          "That uses the old first-tier rate. For 2026–27 the car and goods-vehicle rate for the first 10,000 miles is 55p.",
      },
      {
        id: "current-rate",
        label: `${gbp(mileage.amount)} — ${mileage.breakdown}`,
        correct: true,
        feedback:
          `Correct. The mileage log supports a ${gbp(mileage.amount)} simplified-expense deduction in this example.`,
      },
      {
        id: "miles-as-pounds",
        label: "£1,200.00 — one pound for every mile",
        correct: false,
        feedback:
          "Miles are evidence, not pounds. Apply the official pence-per-mile rate to the business-mile record.",
      },
    ],
    explanation:
      `The engine derives a ${gbp(mileage.amount)} deduction. Comparing the bounded rest-of-UK estimates before and after it leaves ${gbp(mileageTaxKept)} less estimated Income Tax and Class 4 National Insurance in this worked example.`,
    explainBack:
      "The mileage log is the evidence; the dated rate turns that evidence into a deduction; the tax estimate comes last.",
    reward: {
      label: "Estimated value revealed in this worked example",
      headline: `${gbp(mileageTaxKept)} estimated tax kept`,
      values: [
        { kind: "deduction-found", label: "Deduction found", amount: mileage.amount },
        {
          kind: "estimated-tax-kept",
          label: "Estimated tax kept",
          amount: mileageTaxKept,
        },
      ],
      boundary:
        "The £660 deduction and £171.60 estimated tax effect are different facts. Neither is income or a guaranteed saving for you.",
    },
    assumptions: [
      "The miles are wholly business miles in an eligible car or goods vehicle.",
      "This example claims business expenses rather than the mutually exclusive trading allowance.",
      "Simplified mileage is available and replaces actual vehicle running costs for this vehicle.",
      "The estimate uses one rest-of-UK 2026–27 sole trade and does not represent HMRC's final calculation.",
    ],
    source: {
      label: "GOV.UK — simplified vehicle expenses",
      href: mileage.source,
    },
    next: { label: "Use the mileage calculator", href: "/tools/mileage" },
  },
] as const;

export const LEARNING_ROUND_IDS = LEARNING_ROUNDS.map((round) => round.id);
