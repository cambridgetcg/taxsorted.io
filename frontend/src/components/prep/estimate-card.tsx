"use client";

// i18n: deferred to M2 — plain English for launch

import { useId, useState } from "react";
import {
  estimateLiability,
  quarterForDate,
  type LedgerRecord,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cited } from "@/components/prep/cited";
import { deriveFigures } from "@/lib/derive-figures";
import { gbp, formatUkDate } from "@/lib/format";
import { parsePounds, INVALID_AMOUNT_MESSAGE } from "@/lib/parse";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";

export interface EstimateCardProps {
  records: LedgerRecord[];
  taxYear: TaxYear;
  election: "standard" | "calendar";
}

// M1 covers a single taxpayer, rest-of-UK rates only — see estimate.ts's
// file header. Every config value used here is pinned to this one tax year,
// so the citation date the estimator's lines carry is fixed the same way
// (matches the estimate.ts config's own effectiveFrom).
const EFFECTIVE_FROM = "2026-04-06";

/**
 * The quarter whose cumulative window should feed the estimate: whichever
 * quarter today actually falls in, or Q4 (the full tax year to date) once
 * the year's four periods are behind us — never a quarter the user merely
 * happens to be browsing in QuarterCard. The estimate is always "where you
 * stand right now", independent of that picker.
 */
function currentQuarterIndex(taxYear: TaxYear, election: "standard" | "calendar"): 1 | 2 | 3 | 4 {
  const q = quarterForDate(todayIsoLocal(), taxYear, election);
  return q ? q.index : 4;
}

/**
 * The cited liability estimate: self-employment + property figures pulled
 * straight from records (year-to-date), fed to `estimateLiability`, every
 * line individually sourced. Nothing here is a bill — the headline says so
 * loudly, and `paymentsOnAccount` only appears once a prior-year figure
 * (typed here, session-only — never persisted) triggers it.
 */
export function EstimateCard({ records, taxYear, election }: EstimateCardProps) {
  // Same mount-guard reasoning as QuarterCard: "today" must not differ
  // between the server-rendered shell and the first client paint. Q4 (the
  // full year) is the deterministic pre-mount default; the real "today's
  // quarter" lands as a client-only correction straight after.
  const mounted = useMounted();

  const [priorYearInput, setPriorYearInput] = useState("");
  const priorYearId = useId();

  const quarterIndex = mounted ? currentQuarterIndex(taxYear, election) : 4;
  const figures = deriveFigures(records, taxYear, election, quarterIndex);

  const parsedPriorYear = parsePounds(priorYearInput);
  const priorYearError = parsedPriorYear === "invalid" ? INVALID_AMOUNT_MESSAGE : null;
  const priorYearSaBill = typeof parsedPriorYear === "number" ? parsedPriorYear : undefined;

  const estimate = estimateLiability({
    taxYear,
    tradingProfit: figures.tradingProfit,
    propertyIncome: figures.propertyIncome,
    propertyExpenses: figures.propertyExpenses,
    residentialFinanceCosts: figures.residentialFinanceCosts,
    priorYearSaBill,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimated Self Assessment bill</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert>
          <AlertTitle>Estimate — HMRC&apos;s calculation is the number that counts</AlertTitle>
          <AlertDescription>
            This is our arithmetic against your records so far this tax year, cited line by line —
            it is not a bill and nothing has been sent to HMRC.
          </AlertDescription>
        </Alert>

        <p className="text-4xl font-bold text-ink">{gbp(estimate.totalLiability)}</p>

        {figures.recordCount === 0 ? (
          <p className="text-sm text-ink-soft">
            No records yet — this estimate assumes zero income and expenses until you add some.
          </p>
        ) : null}

        {figures.tradingProfitRaw < 0 ? (
          <p className="text-sm text-amber-700">
            Your self-employment records show a loss so far this year, shown here as £0 profit —
            loss relief against other income isn&apos;t part of this estimate yet.
          </p>
        ) : null}

        <ul className="space-y-1.5 text-sm text-ink-soft">
          {estimate.lines.map((line, i) => (
            <li key={i}>
              <Cited cite={{ source: line.cite, effectiveFrom: EFFECTIVE_FROM }}>
                {line.label}: {gbp(line.amount)}
              </Cited>
            </li>
          ))}
        </ul>

        <div className="space-y-1.5">
          <Label htmlFor={priorYearId}>
            Last year&apos;s Self Assessment bill (£, optional — used only to forecast payments on
            account, and never saved)
          </Label>
          <Input
            id={priorYearId}
            type="text"
            inputMode="decimal"
            placeholder="£0"
            value={priorYearInput}
            aria-invalid={priorYearError ? true : undefined}
            aria-describedby={priorYearError ? `${priorYearId}-error` : undefined}
            onChange={(e) => setPriorYearInput(e.target.value)}
          />
          {priorYearError ? (
            <p id={`${priorYearId}-error`} className="text-sm text-red-600">
              {priorYearError}
            </p>
          ) : null}
        </div>

        {estimate.paymentsOnAccount ? (
          <div className="rounded-2xl border border-line bg-accent-soft p-3 text-sm text-ink sm:p-4">
            <p className="font-semibold">Payments on account</p>
            <p className="mt-1 text-ink-soft">
              {gbp(estimate.paymentsOnAccount.each)} due {formatUkDate(estimate.paymentsOnAccount.dates[0])},
              and the same again due {formatUkDate(estimate.paymentsOnAccount.dates[1])}.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
