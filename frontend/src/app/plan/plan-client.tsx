"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  tradingAllowancePosition,
  type TradingAllowanceBasisPeriodTransitionProfit,
  type TradingAllowanceExcludedIncome,
  type TradingAllowanceFactPeriodState,
  type TradingAllowancePosition,
  type TradingAllowanceRelevantIncomeBoundary,
  type TradingAllowanceRentARoomReceipts,
  type TradingAllowanceTradeScope,
} from "@taxsorted/engine/uk/itsa";
import { formatUkDate, gbp } from "@/lib/format";
import { INVALID_AMOUNT_MESSAGE, parsePounds } from "@/lib/parse";

type FieldErrors = Partial<Record<"income" | "deductions", string>>;

const payerOptions: readonly {
  value: TradingAllowanceExcludedIncome;
  label: string;
  detail: string;
}[] = [
  {
    value: "unknown",
    label: "I am not sure yet",
    detail: "The comparison will pause and tell you which payer fact to check.",
  },
  {
    value: "none",
    label: "No — I checked every relevant trading and miscellaneous-income payment",
    detail: "No payment was made by or on behalf of an employer while you were employed by it or while your spouse or civil partner was employed by it; a partnership while you were a partner or connected with a partner; or a close company while you were a participator or an associate of a participator. Common partnership connections include spouses or civil partners, siblings, parents or grandparents, children or grandchildren, and the equivalent relatives of a spouse or civil partner; section 993 has further connections. Choose ‘not sure’ unless you checked the full rule and the status when each payment was made.",
  },
  {
    value: "present",
    label: "Yes — at least one excluded payment is included",
    detail: "One excluded payment within relevant trading or miscellaneous income removes the trading-allowance route for the tax year in this bounded check.",
  },
] as const;

const factPeriodOptions: readonly {
  value: TradingAllowanceFactPeriodState;
  label: string;
  detail: string;
}[] = [
  {
    value: "unknown",
    label: "I have not matched every fact to one whole-year state",
    detail: "The comparison will pause rather than treat figures to date as a full tax year.",
  },
  {
    value: "full-year-projection",
    label: "A full 2026–27 projection through 5 April 2027",
    detail: "Every money figure and answer below is a scenario assumption for the whole tax year, including expected later receipts, deductions, activities, payer relationships, Rent a Room activity and cessation.",
  },
  {
    value: "year-to-date",
    label: "Only figures or facts to date",
    detail: "This first module will stop because later events could change both routes.",
  },
  {
    value: "completed-tax-year",
    label: "Completed records for the whole 2026–27 tax year",
    detail: "This is possible only after 5 April 2027. Choosing it earlier stops safely rather than calling an unfinished year complete.",
  },
] as const;

const tradeScopeOptions: readonly {
  value: TradingAllowanceTradeScope;
  label: string;
  detail: string;
}[] = [
  {
    value: "unknown",
    label: "I am not sure whether these figures combine activities",
    detail: "The calculation will stop until each trade is identified.",
  },
  {
    value: "single-trade-complete",
    label: "Exactly one relevant sole trade, fully included here",
    detail: "Across the whole-year state there is no other relevant trade or miscellaneous income, and the figures above include every projected or completed receipt and deduction for this one trade.",
  },
  {
    value: "additional-relevant-income",
    label: "Another trade or miscellaneous-income source is included",
    detail: "Total relevant income and each trade computation must be established; this first module will not net or omit them.",
  },
] as const;

const transitionProfitOptions: readonly {
  value: TradingAllowanceBasisPeriodTransitionProfit;
  label: string;
  detail: string;
}[] = [
  {
    value: "unknown",
    label: "I have not checked the 2023–24 transition-profit position",
    detail: "The comparison will pause because a spread or accelerated amount can increase 2026–27 chargeable trading profit.",
  },
  {
    value: "no-amount-arises",
    label: "No basis-period transition-profit amount arises in 2026–27",
    detail: "You checked the 2023–24 transition-profit calculation, spreading and any acceleration election for this scenario.",
  },
  {
    value: "amount-arises",
    label: "A transition-profit amount arises, or may arise",
    detail: "This first module will stop rather than omit that separate chargeable-profit amount or apply the allowance to it.",
  },
] as const;

const rentARoomOptions: readonly {
  value: TradingAllowanceRentARoomReceipts;
  label: string;
  detail: string;
}[] = [
  {
    value: "unknown",
    label: "I have not checked for Rent a Room receipts",
    detail: "The comparison will pause because the Rent a Room treatment can affect trading-allowance eligibility.",
  },
  {
    value: "none",
    label: "No Rent a Room receipts",
    detail: "The whole-year state contains no income from letting furnished accommodation in your home.",
  },
  {
    value: "present",
    label: "Yes — Rent a Room receipts are included",
    detail: "This first module will stop until the Rent a Room relief and election facts are established.",
  },
] as const;

const relevantIncomeOptions: readonly {
  value: TradingAllowanceRelevantIncomeBoundary;
  label: string;
  detail: string;
}[] = [
  {
    value: "unknown",
    label: "I have not checked how this figure was measured",
    detail: "The comparison will pause rather than assume the accounting basis or special items.",
  },
  {
    value: "complete-continuing-trade",
    label: "Complete relevant income for one continuing trade",
    detail: "Measured before expenses under the applicable cash-basis or traditional accounting rules; includes any own-use values and balancing charges; and the whole-year state contains no adjustment income or post-cessation receipts.",
  },
  {
    value: "needs-review",
    label: "A special item exists, or the measure is incomplete",
    detail: "Choose this if the basis is uncertain, an own-use value or balancing charge may be missing, the trade ceased, or adjustment income or a post-cessation receipt arose.",
  },
] as const;

function routeSentence(result: Extract<TradingAllowancePosition, { status: "calculated" }>) {
  const route = result.calculation.route;
  const isProjection = result.calculation.factPeriodState === "full-year-projection";
  const boundary = isProjection ? "in this full-year scenario" : "from the supplied completed-year facts";
  const profitLabel = isProjection ? "projected trading profit" : "trading profit";
  if (route === "same") return `Both routes leave the same ${profitLabel} ${boundary}.`;
  if (route === "trading-allowance") {
    return `The trading-allowance route leaves lower ${profitLabel} ${boundary}.`;
  }
  if (!result.calculation.allowanceAvailable) {
    return `The allowance route is unavailable under the payer fact ${boundary}.`;
  }
  return `The ordinary-method route leaves lower ${profitLabel} ${boundary}.`;
}

export function PlanClient() {
  const [income, setIncome] = useState("");
  const [deductions, setDeductions] = useState("");
  const [excludedIncome, setExcludedIncome] =
    useState<TradingAllowanceExcludedIncome>("unknown");
  const [factPeriodState, setFactPeriodState] =
    useState<TradingAllowanceFactPeriodState>("unknown");
  const [tradeScope, setTradeScope] =
    useState<TradingAllowanceTradeScope>("unknown");
  const [rentARoomReceipts, setRentARoomReceipts] =
    useState<TradingAllowanceRentARoomReceipts>("unknown");
  const [relevantIncomeBoundary, setRelevantIncomeBoundary] =
    useState<TradingAllowanceRelevantIncomeBoundary>("unknown");
  const [basisPeriodTransitionProfit, setBasisPeriodTransitionProfit] =
    useState<TradingAllowanceBasisPeriodTransitionProfit>("unknown");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<TradingAllowancePosition | null>(null);

  const compare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const incomePence = parsePounds(income);
    const deductionsPence = parsePounds(deductions);
    const nextErrors: FieldErrors = {};

    if (incomePence === "blank") nextErrors.income = "Enter your total relevant income.";
    else if (incomePence === "invalid") nextErrors.income = INVALID_AMOUNT_MESSAGE;
    if (deductionsPence === "blank") {
      nextErrors.deductions = "Enter the complete ordinary-method deductions, even if the amount is zero.";
    } else if (deductionsPence === "invalid") {
      nextErrors.deductions = INVALID_AMOUNT_MESSAGE;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setResult(null);
      return;
    }

    setResult(
      tradingAllowancePosition({
        totalRelevantIncome: incomePence as number,
        ordinaryMethodDeductions: deductionsPence as number,
        basisPeriodTransitionProfit,
        excludedIncome,
        factPeriodState,
        rentARoomReceipts,
        relevantIncomeBoundary,
        tradeScope,
        taxYear: "2026-27",
        evaluationDate: new Date().toISOString().slice(0, 10),
      }),
    );
  };

  const trust = result?.trust;

  const downloadReceipt = () => {
    if (!result) return;
    const receipt = {
      schema: "taxsorted.uk.trading-allowance-calculation/2",
      generatedAt: new Date().toISOString(),
      input: {
        totalRelevantIncomePence: parsePounds(income),
        ordinaryMethodDeductionsPence: parsePounds(deductions),
        basisPeriodTransitionProfit,
        excludedIncome,
        factPeriodState,
        rentARoomReceipts,
        relevantIncomeBoundary,
        tradeScope,
        taxYear: "2026-27",
        evaluationDate: result.trust.evaluatedOn,
      },
      result,
    };
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "taxsorted-trading-allowance-receipt.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  };

  return (
    <section id="first-comparison" aria-labelledby="comparison-title" className="mt-20 scroll-mt-24">
      <p className="section-label">02 · First bounded calculation</p>
      <h2 id="comparison-title" className="section-title mt-4 text-ink">
        Put two trading-profit routes side by side.
      </h2>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-ink-soft">
        This narrow 2026–27 module calculates two ways of reaching trading profit from either a
        clearly labelled full-year projection or completed whole-year facts. It has earned the
        <strong className="font-semibold text-ink"> calculated</strong> state, not a complete
        whole-burden comparison: final tax, cash flow, work and wider consequences remain
        unassessed. Year-to-date figures, transition profit, unknown eligibility and possible
        losses stop instead of becoming guesses.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={compare} noValidate className="rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="mb-5 rounded-xl border border-warm/40 bg-warm/5 p-3 text-sm font-medium text-ink">
              Check the marked money fields. Nothing was calculated.
            </p>
          ) : null}
          <fieldset>
            <legend className="font-semibold text-ink">What period state does every answer below describe?</legend>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              This one answer governs the money, activities, payer relationships and every other
              boundary fact. A projection never silently becomes a return figure.
            </p>
            <div className="mt-3 space-y-3">
              {factPeriodOptions.map((option) => (
                <label
                  key={option.value}
                  className={`block cursor-pointer rounded-2xl border p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                    factPeriodState === option.value ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-accent/60"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="fact-period-state"
                      value={option.value}
                      checked={factPeriodState === option.value}
                      onChange={() => {
                        setFactPeriodState(option.value);
                        setResult(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block font-medium text-ink">{option.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-ink-soft">{option.detail}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-7">
            <label htmlFor="plan-income" className="block font-semibold text-ink">
              Total relevant income for the tax year
            </label>
            <p id="plan-income-hint" className="mt-1 text-sm leading-6 text-ink-soft">
              Enter the before-expenses relevant income for one continuing sole trade. Do not add
              property, partnership, post-cessation or adjustment income.
            </p>
            <div className="relative mt-3">
              <span aria-hidden="true" className="absolute inset-y-0 start-0 flex items-center ps-4 text-ink-soft">£</span>
              <input
                id="plan-income"
                name="income"
                inputMode="decimal"
                value={income}
                onChange={(event) => {
                  setIncome(event.target.value);
                  setResult(null);
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.income;
                    return next;
                  });
                }}
                aria-describedby={`plan-income-hint${errors.income ? " plan-income-error" : ""}`}
                aria-invalid={Boolean(errors.income)}
                className="min-h-12 w-full rounded-xl border border-line bg-white ps-8 pe-4 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="5,000"
              />
            </div>
            {errors.income ? <p id="plan-income-error" className="mt-2 text-sm font-medium text-warm">{errors.income}</p> : null}
          </div>

          <div className="mt-6">
            <label htmlFor="plan-deductions" className="block font-semibold text-ink">
              Complete ordinary-method deductions
            </label>
            <p id="plan-deductions-hint" className="mt-1 text-sm leading-6 text-ink-soft">
              Include every allowable expense and capital allowance for that same sole trade under the ordinary method.
            </p>
            <div className="relative mt-3">
              <span aria-hidden="true" className="absolute inset-y-0 start-0 flex items-center ps-4 text-ink-soft">£</span>
              <input
                id="plan-deductions"
                name="deductions"
                inputMode="decimal"
                value={deductions}
                onChange={(event) => {
                  setDeductions(event.target.value);
                  setResult(null);
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.deductions;
                    return next;
                  });
                }}
                aria-describedby={`plan-deductions-hint${errors.deductions ? " plan-deductions-error" : ""}`}
                aria-invalid={Boolean(errors.deductions)}
                className="min-h-12 w-full rounded-xl border border-line bg-white ps-8 pe-4 text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                placeholder="600"
              />
            </div>
            {errors.deductions ? <p id="plan-deductions-error" className="mt-2 text-sm font-medium text-warm">{errors.deductions}</p> : null}
          </div>

          <fieldset className="mt-7">
            <legend className="font-semibold text-ink">How complete is this relevant-income figure?</legend>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              The accounting basis and certain non-cash or special items can change the amount to
              which the £1,000 test applies.
            </p>
            <div className="mt-3 space-y-3">
              {relevantIncomeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`block cursor-pointer rounded-2xl border p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                    relevantIncomeBoundary === option.value ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-accent/60"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="relevant-income-boundary"
                      value={option.value}
                      checked={relevantIncomeBoundary === option.value}
                      onChange={() => {
                        setRelevantIncomeBoundary(option.value);
                        setResult(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block font-medium text-ink">{option.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-ink-soft">{option.detail}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="font-semibold text-ink">Does a basis-period transition-profit amount arise in 2026–27?</legend>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              This is the spread or accelerated amount from the 2023–24 basis-period transition.
              It is separate from relevant income and this first module will not quietly omit it.
            </p>
            <div className="mt-3 space-y-3">
              {transitionProfitOptions.map((option) => (
                <label
                  key={option.value}
                  className={`block cursor-pointer rounded-2xl border p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                    basisPeriodTransitionProfit === option.value ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-accent/60"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="basis-period-transition-profit"
                      value={option.value}
                      checked={basisPeriodTransitionProfit === option.value}
                      onChange={() => {
                        setBasisPeriodTransitionProfit(option.value);
                        setResult(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block font-medium text-ink">{option.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-ink-soft">{option.detail}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="font-semibold text-ink">Across the whole-year state, what relevant trading or miscellaneous income is included?</legend>
            <div className="mt-3 space-y-3">
              {tradeScopeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`block cursor-pointer rounded-2xl border p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                    tradeScope === option.value ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-accent/60"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="trade-scope"
                      value={option.value}
                      checked={tradeScope === option.value}
                      onChange={() => {
                        setTradeScope(option.value);
                        setResult(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block font-medium text-ink">{option.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-ink-soft">{option.detail}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="font-semibold text-ink">Does the whole-year state include any Rent a Room receipts?</legend>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              This means income from letting furnished accommodation in your home. Rent a Room
              choices can affect relief on otherwise separate trading income.
            </p>
            <div className="mt-3 space-y-3">
              {rentARoomOptions.map((option) => (
                <label
                  key={option.value}
                  className={`block cursor-pointer rounded-2xl border p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                    rentARoomReceipts === option.value ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-accent/60"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="rent-a-room-receipts"
                      value={option.value}
                      checked={rentARoomReceipts === option.value}
                      onChange={() => {
                        setRentARoomReceipts(option.value);
                        setResult(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block font-medium text-ink">{option.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-ink-soft">{option.detail}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="font-semibold text-ink">Does relevant trading or miscellaneous income include a payment made while an excluded relationship exists?</legend>
            <div className="mt-3 space-y-3">
              {payerOptions.map((option) => (
                <label
                  key={option.value}
                  className={`block cursor-pointer rounded-2xl border p-4 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
                    excludedIncome === option.value ? "border-accent bg-accent-soft" : "border-line bg-white hover:border-accent/60"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="income-source"
                      value={option.value}
                      checked={excludedIncome === option.value}
                      onChange={() => {
                        setExcludedIncome(option.value);
                        setResult(null);
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block font-medium text-ink">{option.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-ink-soft">{option.detail}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-6 font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            Calculate the two routes
          </button>
          <p className="mt-4 text-sm leading-6 text-ink-soft">
            These entries stay in this page&apos;s memory. TaxSorted does not save or send them.
          </p>
        </form>

        <div aria-live="polite">
          {!result ? (
            <div className="flex min-h-full items-center rounded-[2rem] border border-dashed border-line bg-paper p-6 sm:p-8">
              <div>
                <p className="section-label">Nothing assumed</p>
                <h3 className="mt-3 font-display text-3xl font-semibold text-ink">Your calculation will appear here.</h3>
                <p className="mt-3 leading-7 text-ink-soft">
                  Enter two money figures and six boundary facts. Blank never means
                  zero, and “not sure” is a valid answer.
                </p>
              </div>
            </div>
          ) : result.status === "needs_review" ? (
            <div className="rounded-[2rem] border border-warm/50 bg-warm/5 p-6 sm:p-8">
              <p className="section-label">Calculation paused · needs review</p>
              <h3 className="mt-3 font-display text-3xl font-semibold text-ink">The calculation stopped safely.</h3>
              <p className="mt-4 leading-7 text-ink">{result.reason.text}</p>
              <div className="mt-5 rounded-2xl border border-warm/40 bg-white/70 p-4">
                <p className="text-sm font-semibold text-ink">Next fact to establish</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">{result.reason.nextFact}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
              <p className="section-label">
                {result.calculation.factPeriodState === "full-year-projection"
                  ? "Projected calculation · comparison incomplete · not a recommendation"
                  : "Calculated from completed-year facts · comparison incomplete · not a recommendation"}
              </p>
              <h3 className="mt-3 font-display text-3xl font-semibold text-ink">{routeSentence(result)}</h3>
              <p className="mt-3 leading-7 text-ink-soft">
                {result.calculation.factPeriodState === "full-year-projection"
                  ? "This is scenario arithmetic, not a return figure. "
                  : "This uses the completed-year facts supplied, but is not a return figure. "}
                It compares {result.calculation.factPeriodState === "full-year-projection" ? "projected trading profit" : "trading profit"} only. Income Tax, National Insurance, losses, benefits,
                pensions, cash flow and personal suitability remain outside this result.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <article className={`rounded-2xl border p-5 ${result.calculation.allowanceAvailable ? "border-line bg-paper" : "border-line bg-surface-muted opacity-75"}`}>
                  <p className="text-sm font-semibold text-accent">Trading allowance route</p>
                  {result.calculation.allowanceAvailable && result.calculation.tradingAllowanceProfit !== null ? (
                    <>
                      <p className="mt-3 font-display text-3xl font-semibold text-ink">{gbp(result.calculation.tradingAllowanceProfit)}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {result.calculation.factPeriodState === "full-year-projection" ? "projected trading profit" : "trading profit"} after a {gbp(result.calculation.allowanceDeduction)} allowance deduction (up to the {gbp(result.calculation.allowanceLimit)} limit)
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 font-semibold text-ink">Unavailable under this payer fact</p>
                  )}
                </article>
                <article className="rounded-2xl border border-line bg-paper p-5">
                  <p className="text-sm font-semibold text-accent">Ordinary-method route</p>
                  <p className="mt-3 font-display text-3xl font-semibold text-ink">{gbp(result.calculation.ordinaryMethodProfit)}</p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {result.calculation.factPeriodState === "full-year-projection" ? "projected trading profit" : "trading profit"} after {gbp(result.calculation.ordinaryMethodDeductions)} of stated deductions
                  </p>
                </article>
              </div>

              <div className="mt-7 overflow-hidden rounded-2xl border border-line">
                <table className="w-full border-collapse text-left text-sm">
                  <caption className="bg-paper px-4 py-3 text-left font-semibold text-ink">Whole-burden checks still to make</caption>
                  <tbody className="divide-y divide-line">
                    {[
                      ["Final tax and cash flow", "Not calculated. Trading profit is only one input to the final position."],
                      ["Evidence and work", "Records remain required. The ordinary method also needs support for every deduction."],
                      ["Losses and future years", "The allowance cannot create a loss. This module stops when a possible loss appears."],
                      ["Other consequences", "Benefits, National Insurance, finance, contracts and legal rights are not modelled."],
                      ["Choice and correction", "The person chooses. Keep the inputs and reasoning with the return or professional handoff."],
                    ].map(([label, text]) => (
                      <tr key={label} className="align-top">
                        <th scope="row" className="w-2/5 bg-surface-muted/50 px-4 py-3 font-medium text-ink">{label}</th>
                        <td className="px-4 py-3 leading-6 text-ink-soft">{text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-2xl border border-line bg-paper p-5">
                <h4 className="font-display text-2xl font-semibold text-ink">Action and election boundary</h4>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  This is a calculation only. {result.calculation.factPeriodState === "full-year-projection"
                    ? "If completed facts differ, the result and action boundary can change. "
                    : null}
                  No election, claim or return entry has been made.
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="font-semibold text-ink">Trading allowance route</dt>
                    <dd className="mt-1 leading-6 text-ink-soft">
                      {result.calculation.routeActions.tradingAllowance ?? "Unavailable under the payer fact supplied."}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Ordinary-method route</dt>
                    <dd className="mt-1 leading-6 text-ink-soft">{result.calculation.routeActions.ordinaryMethod}</dd>
                  </div>
                  {result.calculation.routeActions.normalElectionDeadline ? (
                    <div>
                      <dt className="font-semibold text-ink">Normal on-time election limit</dt>
                      <dd className="mt-1 leading-6 text-ink-soft">
                        {formatUkDate(result.calculation.routeActions.normalElectionDeadline)} for 2026–27.
                        Keep evidence of when and how the election was made.{" "}
                        {result.calculation.routeActions.lateElectionReview}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>

      {trust ? (
        <div className="mt-8 grid gap-5 rounded-[2rem] border border-line bg-paper p-6 sm:p-8 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-2xl font-semibold text-ink">Source receipt</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Ruleset {trust.rulesetVersion} for 2026–27, effective in this engine from {formatUkDate(trust.effectiveFrom)}.
              The legal allowance dates from {formatUkDate(trust.legalBasisFrom)}. TaxSorted reviewed
              the sources on {formatUkDate(trust.reviewedOn)} and must review them again by {formatUkDate(trust.reviewDueOn)}.
              This result evaluated source freshness on {formatUkDate(trust.evaluatedOn)}.
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              Maximum capability: {trust.capability.maximumState}. A projection remains a
              projection even when its arithmetic is calculated. A complete whole-burden
              comparison is not yet live.
            </p>
            <ul className="mt-4 space-y-4 text-sm">
              {trust.sources.map((source) => (
                <li key={source.href}>
                  <a href={source.href} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline underline-offset-4 hover:text-accent-deep">
                    {source.label} ↗ <span className="sr-only">(opens in a new tab)</span>
                  </a>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    {source.kind} · {source.force} · retrieved {formatUkDate(source.retrievedOn)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    <strong className="font-semibold text-ink">Supports:</strong> {source.supports}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    <strong className="font-semibold text-ink">Does not prove:</strong> {source.doesNotProve}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-2xl font-semibold text-ink">What these sources do not prove</h3>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-6 text-ink-soft">
              {trust.doesNotProve.map((limit) => <li key={limit}>{limit}</li>)}
            </ul>
          </div>
        </div>
      ) : null}

      {result ? (
        <section aria-labelledby="keep-receipt-title" className="mt-8 rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
          <p className="section-label">Keep the proof</p>
          <h3 id="keep-receipt-title" className="mt-3 font-display text-2xl font-semibold text-ink">
            Download the facts, result and source boundary together.
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-soft">
            The JSON receipt includes the pence inputs, whole-year fact state, income measurement,
            transition-profit, trade, Rent a Room and payer facts, calculation or stop reason,
            ruleset version and sources. It is not a
            return or proof that an election was made. The downloaded file is not encrypted, so
            keep it somewhere suitable.
          </p>
          <button
            type="button"
            onClick={downloadReceipt}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-paper px-6 font-semibold text-ink hover:border-accent hover:bg-accent-soft"
          >
            Download calculation receipt
          </button>
        </section>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/books/workspace" className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-deep">
          Build the records
        </Link>
        <Link href="/file" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-surface px-6 font-medium text-ink hover:border-accent hover:bg-accent-soft">
          Follow the filing path
        </Link>
        <Link href="/put-it-right" className="inline-flex min-h-12 items-center justify-center px-4 font-medium text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">
          Correct or challenge something →
        </Link>
      </div>
    </section>
  );
}
