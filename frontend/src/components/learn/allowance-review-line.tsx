"use client";

import { useState, type FormEvent } from "react";
import {
  tradingAllowancePosition,
  type TradingAllowanceIncomeSource,
  type TradingAllowancePosition,
  type TradingAllowanceRoute,
} from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ALLOWANCE_CHOICE_CASE } from "@/lib/learning-scenarios";
import { formatUkDate, gbp } from "@/lib/format";

type Prediction = "needs_review" | TradingAllowanceRoute;

const INCOME_SOURCE_STATES: readonly {
  value: TradingAllowanceIncomeSource;
  label: string;
  detail: string;
}[] = [
  {
    value: "unknown",
    label: "Payer records not checked",
    detail: "The records do not yet identify every payer relationship.",
  },
  {
    value: "unconnected-customers",
    label: "Unconnected customers only",
    detail:
      "Complete payer check: no payer is Mina’s employer or her spouse’s or civil partner’s employer; a company Mina or a connected person owns or controls; or a partnership where Mina or a connected person is a partner.",
  },
  {
    value: "employer",
    label: "Mina’s employer",
    detail: "The invoice and bank record show Mina’s employer paid the £5,000.",
  },
] as const;

const PREDICTIONS: readonly { value: Prediction; label: string }[] = [
  {
    value: "needs_review",
    label: "Stop — one material fact is still missing",
  },
  {
    value: "trading-allowance",
    label: "Compare — the trading allowance route leaves lower profit",
  },
  {
    value: "ordinary-method",
    label: "Use the ordinary method — it is the available or lower-profit route",
  },
  {
    value: "same",
    label: "Compare — both routes leave the same profit",
  },
] as const;

function positionFor(result: TradingAllowancePosition): Prediction {
  return result.status === "needs_review" ? "needs_review" : result.calculation.route;
}

function routeLabel(route: TradingAllowanceRoute): string {
  if (route === "trading-allowance") return "Trading allowance route";
  if (route === "ordinary-method") return "Ordinary-method route";
  return "Same trading profit";
}

function reasoningReward(result: TradingAllowancePosition): string {
  if (result.status === "needs_review") return "Material unknown kept visible";
  if (!result.calculation.allowanceAvailable) return "Unavailable route removed before calculation";
  return "Eligibility derived from checked payer records";
}

export function AllowanceReviewLine() {
  const [incomeSource, setIncomeSource] = useState<TradingAllowanceIncomeSource>("unknown");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [result, setResult] = useState<TradingAllowancePosition | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [caseNotice, setCaseNotice] = useState(
    "The payer records have not been checked. Place the review line.",
  );

  const changeIncomeSource = (next: TradingAllowanceIncomeSource) => {
    setIncomeSource(next);
    setPrediction(null);
    setResult(null);
    setFeedback(null);
    const state = INCOME_SOURCE_STATES.find((candidate) => candidate.value === next);
    setCaseNotice(`${state?.label ?? "Case"}: ${state?.detail ?? "The case changed."}`);
  };

  const checkPosition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prediction) {
      setFeedback("Choose where the review line belongs before opening the receipt.");
      setResult(null);
      return;
    }

    const next = tradingAllowancePosition({
      totalRelevantIncome: ALLOWANCE_CHOICE_CASE.grossTradingIncome,
      ordinaryMethodDeductions: ALLOWANCE_CHOICE_CASE.ordinaryMethodDeductions,
      incomeSource,
      taxYear: ALLOWANCE_CHOICE_CASE.taxYear,
    });
    const correct = prediction === positionFor(next);
    setResult(next);

    if (next.status === "needs_review") {
      setFeedback(
        correct
          ? "Good stop. You kept an unknown from turning into an assumed ‘no’, so no profit route or tax figure was invented."
          : "Useful miss. The £1,000 arithmetic is real, but it is not yet available because the payer records are unresolved.",
      );
    } else if (correct && !next.calculation.allowanceAvailable) {
      setFeedback(
        "Good line. The exclusion removes the allowance route before the arithmetic can pretend it is available.",
      );
    } else if (correct) {
      setFeedback(
        "Good line. The checked payer records establish the source fact, so the two permitted profit routes can now be compared.",
      );
    } else if (!next.calculation.allowanceAvailable) {
      setFeedback(
        "Useful miss. Employer income removes the allowance route; only the ordinary method remains in this lab.",
      );
    } else {
      setFeedback(
        `Useful miss. With the payer records established, the bounded comparison reaches: ${routeLabel(next.calculation.route).toLowerCase()}.`,
      );
    }
  };

  const trust = result?.trust ?? tradingAllowancePosition({
    totalRelevantIncome: ALLOWANCE_CHOICE_CASE.grossTradingIncome,
    ordinaryMethodDeductions: ALLOWANCE_CHOICE_CASE.ordinaryMethodDeductions,
    incomeSource: "unknown",
    taxYear: ALLOWANCE_CHOICE_CASE.taxYear,
  }).trust;

  return (
    <section
      aria-labelledby="allowance-review-line-title"
      className="mt-6 overflow-hidden rounded-2xl border-2 border-ink bg-white"
    >
      <div className="bg-ink p-5 text-paper sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-paper/75">
          Depth turn · The Review Line
        </p>
        <h4 id="allowance-review-line-title" className="mt-2 scroll-mt-24 text-2xl font-bold">
          The arithmetic was easy. Were you allowed to run it?
        </h4>
        <p className="mt-3 max-w-3xl text-base leading-7 text-paper/80">
          Round 2 compared £600 of expenses with a £1,000 allowance. Now change one payer fact.
          Your move is to calculate only as far as the evidence safely carries.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <section aria-labelledby="review-case-title">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Fictional case · 2026–27
          </p>
          <h5 id="review-case-title" className="mt-1 text-xl font-semibold text-ink">
            Mina’s £5,000 sole trade
          </h5>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Case boundary: this is Mina’s only trade, with no other trading, miscellaneous or
            property income. She has no capital allowances or brought-forward losses. The £600
            below is her full ordinary-method deduction for the tax year.
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-paper p-3">
              <dt className="text-sm text-ink-soft">Total relevant income</dt>
              <dd className="mt-1 font-semibold text-ink">
                {gbp(ALLOWANCE_CHOICE_CASE.grossTradingIncome)}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-paper p-3">
              <dt className="text-sm text-ink-soft">Ordinary-method deductions</dt>
              <dd className="mt-1 font-semibold text-ink">
                {gbp(ALLOWANCE_CHOICE_CASE.ordinaryMethodDeductions)}
              </dd>
            </div>
            <div className="rounded-xl border border-line bg-paper p-3">
              <dt className="text-sm text-ink-soft">One material fact</dt>
              <dd className="mt-1 font-semibold text-ink">
                {INCOME_SOURCE_STATES.find((state) => state.value === incomeSource)?.label}
              </dd>
            </div>
          </dl>
        </section>

        <fieldset className="mt-6">
          <legend className="text-lg font-semibold text-ink">
            Change one fact: who paid the income
          </legend>
          <p id="income-source-help" className="mt-1 text-sm leading-6 text-ink-soft">
            Change only what the fictional invoices and bank records establish. The engine derives
            whether the allowance route is available; the player does not declare eligibility.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {INCOME_SOURCE_STATES.map((state) => (
              <label
                key={state.value}
                className={`flex min-h-24 cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 ${
                  incomeSource === state.value
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line bg-white text-ink hover:border-accent"
                }`}
              >
                <input
                  type="radio"
                  name="income-source-fact"
                  value={state.value}
                  checked={incomeSource === state.value}
                  onChange={() => changeIncomeSource(state.value)}
                  aria-describedby="income-source-help"
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                />
                <span>
                  <span className="block font-semibold">{state.label}</span>{" "}
                  <span className="mt-1 block text-sm leading-5 text-ink-soft">
                    {state.detail}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p role="status" aria-live="polite" className="mt-3 text-sm text-ink-soft">
            {caseNotice}
          </p>
        </fieldset>

        <details className="mt-6 rounded-xl border border-line bg-paper p-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink">
            Open the rule card before deciding
          </summary>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <h5 className="font-semibold text-ink">Supports</h5>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-ink-soft">
                {trust.supports.map((claim) => <li key={claim}>{claim}</li>)}
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-ink">Does not prove</h5>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-ink-soft">
                {trust.doesNotProve.map((claim) => <li key={claim}>{claim}</li>)}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            Effective in this engine from {formatUkDate(trust.effectiveFrom)} · sources checked {formatUkDate(trust.reviewedOn)}
          </p>
          <h5 className="mt-3 font-semibold text-ink">Official sources</h5>
          <ul className="mt-1 space-y-1">
            {trust.sources.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
                >
                  {source.label}
                  <span aria-hidden="true">&nbsp;↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </details>

        <form className="mt-6" onSubmit={checkPosition} noValidate>
          <fieldset>
            <legend className="text-lg font-semibold text-ink">
              Where does the review line belong now?
            </legend>
            <div className="mt-3 space-y-3">
              {PREDICTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-white p-3 text-base text-ink hover:border-accent"
                >
                  <input
                    type="radio"
                    name="review-line-position"
                    value={option.value}
                    checked={prediction === option.value}
                    onChange={() => {
                      setPrediction(option.value);
                      setResult(null);
                      setFeedback(null);
                    }}
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Button className="mt-4" type="submit">Open the reasoning receipt</Button>
        </form>

        {feedback ? (
          <p
            role={prediction ? "status" : "alert"}
            aria-live={prediction ? "polite" : "assertive"}
            className={`mt-5 rounded-xl border p-4 text-base ${
              result && prediction === positionFor(result)
                ? "border-green-300 bg-green-50 text-green-900"
                : result
                  ? "border-yellow-300 bg-yellow-50 text-yellow-900"
                  : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            {feedback}
          </p>
        ) : null}

        {result ? (
          <section aria-labelledby="reasoning-receipt-title" className="mt-5 rounded-2xl border border-line bg-paper p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                  Reasoning receipt · not a filing receipt
                </p>
                <h5 id="reasoning-receipt-title" className="mt-1 text-xl font-semibold text-ink">
                  {result.status === "needs_review" ? "A clean stop" : "A bounded calculation"}
                </h5>
              </div>
              <Badge variant="info">
                {result.status === "needs_review" ? "Needs review · valid boundary" : "Calculated · bounded"}
              </Badge>
            </div>

            {result.status === "needs_review" ? (
              <div className="mt-4 space-y-3">
                <p className="text-base leading-7 text-ink">{result.reason.text}</p>
                <div className="rounded-xl border border-dashed border-line bg-white p-4">
                  <p className="font-semibold text-ink">No profit route or tax figure emitted.</p>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    Next fact: {result.reason.nextFact}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line bg-white p-4">
                    <dt className="font-semibold text-ink">Trading allowance route</dt>
                    <dd className="mt-2 text-sm leading-6 text-ink-soft">
                      {result.calculation.allowanceAvailable && result.calculation.tradingAllowanceProfit !== null
                        ? `${gbp(result.calculation.allowance)} deduction → ${gbp(result.calculation.tradingAllowanceProfit)} trading profit`
                        : "Unavailable because the payer records show Mina’s employer paid the income."}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-line bg-white p-4">
                    <dt className="font-semibold text-ink">Ordinary-method route</dt>
                    <dd className="mt-2 text-sm leading-6 text-ink-soft">
                      {gbp(result.calculation.ordinaryMethodDeductions)} total deductions → {gbp(result.calculation.ordinaryMethodProfit)} trading profit
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 font-semibold text-ink">
                  Review line: {routeLabel(result.calculation.route)}.
                </p>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  This receipt compares one fictional profit route. It does not establish final tax, filing duty, evidence quality, HMRC agreement or what a real person should choose.
                </p>
              </div>
            )}

            {prediction === positionFor(result) ? (
              <div className="mt-4 rounded-xl bg-accent-soft p-4">
                <p className="text-sm font-semibold uppercase tracking-wide text-accent-deep">
                  Non-money learning value
                </p>
                <p className="mt-1 text-lg font-semibold text-ink">{reasoningReward(result)}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <p className="mt-5 text-sm leading-6 text-ink-soft">
          This depth turn saves nothing. Reloading clears the case fact and prediction. The original round completion keeps only its existing stable round ID.
        </p>
      </div>
    </section>
  );
}
