"use client";

// i18n: deferred to M2 — plain English for launch
//
// The moment of truth: the first UI where a user's own figures actually
// leave their device for HMRC. Every branch below is written to be read
// literally — a locked state says exactly why it's locked, a receipt only
// ever renders after a genuine 2xx (this session's, or a server-stored one
// from a past session: the receipt list survives reload, so a quarter that
// was already sent greets the reader with its receipt and a resubmit door,
// never a bare submit button that hides the history), and every api/HMRC
// failure is shown in its own words (never softened — receipt_write_failed
// specifically tells the reader not to resubmit blindly, and paraphrasing
// that would be actively harmful).
//
// Money boundary discipline: `update` (from cumulativeUpdate, the SAME call
// QuarterCard renders from) is derived exactly once per render via useMemo
// and its `.totals` feed BOTH the review rows below and the submit payload
// — there is no second derivation that could drift from what the reader was
// shown before they pressed send. HMRC's own calculation figures come back
// as decimal POUNDS (incomeTaxAndNicsDuePounds/taxableIncomePounds) — always
// formatted via gbpFromPounds, never divided by 100 (that's for pence).

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  cumulativeUpdate,
  categoriesFor,
  estimateLiability,
  type LedgerRecord,
  type SourceType,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import {
  api,
  ApiError,
  type ItsaBusiness,
  type ItsaCalculation,
  type ItsaReceipt,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PillRadioGroup } from "@/components/prep/pill-radio-group";
import { deriveFigures } from "@/lib/derive-figures";
import { gbp, gbpFromPounds, formatUkDate, formatUkDateTime } from "@/lib/format";
import { SOURCES } from "@/lib/sources";

export interface SubmitFlowProps {
  /** Null until the entity/connection lookup resolves — treated as locked,
      same as `connectedItsa === false`. */
  entityId: string | null;
  /** From the same `connections.itsa` the HMRC panel reads — never the
      legacy any-rail `connected`, so a VAT-only connection never unlocks
      this. */
  connectedItsa: boolean;
  records: LedgerRecord[];
  source: SourceType;
  taxYear: TaxYear;
  quarterIndex: 1 | 2 | 3 | 4;
  election: "standard" | "calendar";
  /** Override for tests only — production callers should omit this and get
      the real backoff plan (1.5s, 3s, 5s, 8s, 12s). */
  pollBackoffMs?: number[];
}

const DEFAULT_POLL_BACKOFF_MS = [1500, 3000, 5000, 8000, 12000];
const MAX_CALC_TRIES = 5;

type BusinessesState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "none" }
  | { kind: "choose"; businesses: ItsaBusiness[] }
  | { kind: "ready"; business: ItsaBusiness };

type FlowStep =
  /** Undecided: a server-stored receipt may already claim this quarter (the
      receipt list survives reload) — until the receipts check settles, the
      flow must not show a bare submit button that would invite a confused
      "did it go?" resend. */
  | { kind: "start" }
  | { kind: "review" }
  | { kind: "submitting" }
  | { kind: "submit-error"; message: string }
  | { kind: "submitted"; receipt: ItsaReceipt };

type ReceiptsState =
  | { kind: "loading" }
  | { kind: "loaded"; receipts: ItsaReceipt[] }
  /** Non-blocking: the flow still works without the history — the review
      screen just carries a quiet notice that the check didn't happen. */
  | { kind: "error" };

type CalcState =
  | { kind: "idle" }
  | { kind: "computing" }
  | { kind: "poll-cap" }
  | { kind: "error"; message: string }
  | {
      kind: "complete";
      incomeTaxAndNicsDuePounds: number | null;
      taxableIncomePounds: number | null;
    };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unreachableMessage(e: unknown): string {
  return e instanceof ApiError
    ? e.message
    : "We can't reach our server right now — nothing was lost. Try again in a minute.";
}

/** Every card in this flow wears the same header: a title and a permanent
    SANDBOX badge, so the badge can never go missing from a render path just
    because a branch changed (same discipline as HmrcPanel's PanelShell). */
function FlowShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          {title}
          <Badge variant="outline">SANDBOX</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function SubmitFlow({
  entityId,
  connectedItsa,
  records,
  source,
  taxYear,
  quarterIndex,
  election,
  pollBackoffMs = DEFAULT_POLL_BACKOFF_MS,
}: SubmitFlowProps) {
  const sourceLabel = SOURCES.find((s) => s.value === source)?.label ?? source;

  // Derived exactly once per render from the same inputs QuarterCard uses —
  // this is the ONE cumulativeUpdate call whose totals feed both the review
  // rows and the submit payload below.
  const update = useMemo(
    () => cumulativeUpdate(records, source, taxYear, quarterIndex, { election }),
    [records, source, taxYear, quarterIndex, election]
  );
  const rows = useMemo(
    () => categoriesFor(source).filter((c) => c.key in update.totals),
    [source, update]
  );

  const unlocked = connectedItsa && update.recordCount > 0;

  const [businessesState, setBusinessesState] = useState<BusinessesState>({ kind: "loading" });
  const [receiptsState, setReceiptsState] = useState<ReceiptsState>({ kind: "loading" });
  const [flowStep, setFlowStep] = useState<FlowStep>({ kind: "start" });
  const [calcState, setCalcState] = useState<CalcState>({ kind: "idle" });
  // Bumped whenever the quarter/business context moves on — guards a poll
  // chain in flight against writing state for a context the reader has left.
  const pollToken = useRef(0);

  // Business discovery depends only on the entity/NINO, not on which
  // quarter is being browsed — HMRC's sandbox answer is the same either way,
  // so a quarterIndex/election change must not refetch it.
  useEffect(() => {
    if (!unlocked || !entityId) return;
    let cancelled = false;

    async function loadBusinesses() {
      setBusinessesState({ kind: "loading" });
      try {
        const { businesses } = await api.businesses(entityId as string);
        if (cancelled) return;
        const matches = businesses.filter((b) => b.typeOfBusiness === source);
        if (matches.length === 0) setBusinessesState({ kind: "none" });
        else if (matches.length === 1) setBusinessesState({ kind: "ready", business: matches[0] });
        else setBusinessesState({ kind: "choose", businesses: matches });
      } catch (e) {
        if (cancelled) return;
        setBusinessesState({ kind: "error", message: unreachableMessage(e) });
      }
    }

    loadBusinesses();
    return () => {
      cancelled = true;
    };
  }, [entityId, unlocked, source]);

  // The receipt list survives reload server-side — fetched up front so a
  // quarter that was already submitted greets the reader with its receipt
  // rather than a plain submit screen with no sign a submission exists.
  useEffect(() => {
    if (!unlocked || !entityId) return;
    let cancelled = false;

    async function loadReceipts() {
      setReceiptsState({ kind: "loading" });
      try {
        const { receipts } = await api.receipts(entityId as string);
        if (cancelled) return;
        setReceiptsState({ kind: "loaded", receipts });
      } catch {
        if (cancelled) return;
        setReceiptsState({ kind: "error" });
      }
    }

    loadReceipts();
    return () => {
      cancelled = true;
    };
  }, [entityId, unlocked]);

  // Switching quarter/election means a DIFFERENT cumulative figure — any
  // prior submitted/error/calc state belongs to the old quarter, so it is
  // cleared here rather than left to read as stale. Back to "start", not
  // "review": the new quarter may itself already carry a server-stored
  // receipt.
  useEffect(() => {
    function resetForNewQuarter() {
      setFlowStep({ kind: "start" });
      setCalcState({ kind: "idle" });
      pollToken.current += 1;
    }
    resetForNewQuarter();
  }, [quarterIndex, election, source]);

  if (!connectedItsa) {
    return (
      <FlowShell title={`Send ${sourceLabel} to HMRC`}>
        <p className="text-base text-ink-soft">
          Connect to HMRC (sandbox) on your dashboard to practice a real submission.{" "}
          <Link href="/dashboard" className="underline hover:text-ink">
            Go to your dashboard
          </Link>
        </p>
      </FlowShell>
    );
  }

  if (update.recordCount === 0) {
    return (
      <FlowShell title={`Send ${sourceLabel} to HMRC`}>
        <p className="text-base text-ink-soft">
          No {sourceLabel.toLowerCase()} records yet for Q{quarterIndex} {taxYear} — add some
          before there is anything to send.
        </p>
      </FlowShell>
    );
  }

  async function submit(business: ItsaBusiness) {
    if (!entityId) return;
    setFlowStep({ kind: "submitting" });
    try {
      const { receipt } = await api.submitQuarterlyUpdate(entityId, {
        taxYear,
        businessId: business.businessId,
        typeOfBusiness: source,
        quarterIndex,
        election,
        totals: update.totals,
      });
      setFlowStep({ kind: "submitted", receipt });
      // Keep the fetched receipt list in step with what the server now holds,
      // so browsing away to another quarter and back still finds this one.
      setReceiptsState((prev) =>
        prev.kind === "loaded"
          ? { kind: "loaded", receipts: [receipt, ...prev.receipts.filter((r) => r.id !== receipt.id)] }
          : prev
      );
    } catch (e) {
      setFlowStep({ kind: "submit-error", message: unreachableMessage(e) });
    }
  }

  async function runCalc() {
    if (!entityId) return;
    const myToken = ++pollToken.current;
    setCalcState({ kind: "computing" });
    try {
      const { calculationId } = await api.triggerCalc(entityId, taxYear);
      if (pollToken.current !== myToken) return;
      if (!calculationId) {
        setCalcState({ kind: "error", message: "HMRC did not return a calculation id." });
        return;
      }
      for (let attempt = 0; attempt < MAX_CALC_TRIES; attempt++) {
        let result: ItsaCalculation;
        try {
          result = await api.getCalc(entityId, calculationId, taxYear);
        } catch (e) {
          if (pollToken.current !== myToken) return;
          setCalcState({ kind: "error", message: unreachableMessage(e) });
          return;
        }
        if (pollToken.current !== myToken) return;
        if (result.status === "complete") {
          setCalcState({
            kind: "complete",
            incomeTaxAndNicsDuePounds: result.incomeTaxAndNicsDuePounds,
            taxableIncomePounds: result.taxableIncomePounds,
          });
          return;
        }
        if (attempt < MAX_CALC_TRIES - 1) {
          await sleep(pollBackoffMs[attempt] ?? pollBackoffMs[pollBackoffMs.length - 1]);
          if (pollToken.current !== myToken) return;
        }
      }
      setCalcState({ kind: "poll-cap" });
    } catch (e) {
      if (pollToken.current !== myToken) return;
      setCalcState({ kind: "error", message: unreachableMessage(e) });
    }
  }

  // A server-stored receipt for exactly this {taxYear, quarter periodEnd,
  // businessId} — the reload-survivor. Only consulted while the flow is
  // undecided ("start"): once the reader explicitly chooses to resubmit, or
  // a fresh submission lands, this render no longer second-guesses them.
  // periodEnd is compared on its date part so a timestamp-serialized date
  // column still matches the engine's plain yyyy-mm-dd.
  const priorReceipt =
    flowStep.kind === "start" && businessesState.kind === "ready" && receiptsState.kind === "loaded"
      ? (receiptsState.receipts.find(
          (r) =>
            r.taxYear === taxYear &&
            String(r.periodEnd).slice(0, 10) === update.quarter.periodEnd &&
            r.businessId === businessesState.business.businessId
        ) ?? null)
      : null;
  // The receipt this render shows: a fresh 2xx receipt always wins; failing
  // that, the restored one. Never anything a 2xx (now or in a past session)
  // didn't produce.
  const shownReceipt = flowStep.kind === "submitted" ? flowStep.receipt : priorReceipt;
  // While the receipts check is still in flight, showing the submit screen
  // would flash exactly the resubmission-confusing state this exists to
  // prevent — hold with an honest one-liner instead.
  const checkingReceipts = flowStep.kind === "start" && receiptsState.kind === "loading";

  return (
    <FlowShell title={`Send ${sourceLabel} to HMRC`}>
      {businessesState.kind === "loading" && (
        <p className="text-base text-ink-soft">Checking your HMRC businesses…</p>
      )}

      {businessesState.kind === "error" && (
        <Alert>
          <AlertTitle>HMRC didn&apos;t answer</AlertTitle>
          <AlertDescription>{businessesState.message}</AlertDescription>
        </Alert>
      )}

      {businessesState.kind === "none" && (
        <p className="text-base text-ink-soft">
          HMRC&apos;s practice system (the sandbox) has no {sourceLabel.toLowerCase()} business
          registered for your National Insurance number yet — nothing to send to.
        </p>
      )}

      {businessesState.kind === "choose" && (
        <div className="space-y-2">
          <p className="text-base text-ink-soft">
            More than one {sourceLabel.toLowerCase()} business — pick which one this quarter&apos;s
            figures belong to:
          </p>
          <PillRadioGroup
            label="Business"
            hideLabel
            options={businessesState.businesses.map((b) => ({
              value: b.businessId,
              label: b.tradingName ?? b.businessId,
            }))}
            value={null}
            onChange={(businessId) => {
              const business = businessesState.businesses.find(
                (b) => b.businessId === businessId
              );
              if (business) setBusinessesState({ kind: "ready", business });
            }}
          />
        </div>
      )}

      {businessesState.kind === "ready" && checkingReceipts && (
        <p className="text-base text-ink-soft">Checking for earlier submissions…</p>
      )}

      {businessesState.kind === "ready" && !checkingReceipts && !shownReceipt && (
        <div className="space-y-4">
          {flowStep.kind === "start" && receiptsState.kind === "error" && (
            <p className="text-base text-ink-soft">
              Couldn&apos;t check for earlier submissions just now — if you already sent this
              quarter, resending simply replaces the totals with your current figures.
            </p>
          )}
          <p className="text-base text-ink" aria-live="polite">
            Submitting for{" "}
            <span className="font-medium">
              {businessesState.business.tradingName ?? businessesState.business.businessId}
            </span>
          </p>
          <p className="text-base font-medium text-ink">
            HMRC receives these totals — never your individual records.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-ink-soft">
                <tr>
                  <th scope="col" className="p-3 font-medium">
                    Category
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Running total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.key} className="border-t border-line">
                    <td className="p-3">{c.label}</td>
                    <td className="p-3 text-right">{gbp(update.totals[c.key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {flowStep.kind === "submit-error" && (
            <Alert>
              <AlertTitle>HMRC didn&apos;t accept that</AlertTitle>
              <AlertDescription>{flowStep.message}</AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            disabled={flowStep.kind === "submitting"}
            onClick={() => submit(businessesState.business)}
          >
            {flowStep.kind === "submitting" ? "Sending…" : "Send to HMRC (sandbox demo)"}
          </Button>
        </div>
      )}

      {shownReceipt && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-accent-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-ink">
              Receipt
              <Badge variant="outline">SANDBOX</Badge>
            </p>
            <p className="mt-1 text-base text-ink-soft">
              Q{shownReceipt.quarterIndex} {shownReceipt.taxYear} — period ending{" "}
              {formatUkDate(shownReceipt.periodEnd)}
            </p>
            <p className="text-base text-ink-soft">
              Submitted {formatUkDateTime(shownReceipt.submittedAt)}
            </p>
            {shownReceipt.hmrcCorrelationId ? (
              <p className="text-base text-ink">
                HMRC&apos;s reference number (keep this): {shownReceipt.hmrcCorrelationId}
              </p>
            ) : null}
            {shownReceipt.supersededCount > 0 ? (
              <p className="text-xs text-ink-soft">Resent ×{shownReceipt.supersededCount}</p>
            ) : null}
          </div>

          {flowStep.kind === "submitted" ? (
            <p className="text-base text-ink-soft">
              Added or corrected a record since?{" "}
              <button
                type="button"
                className="underline hover:text-ink"
                onClick={() => setFlowStep({ kind: "review" })}
              >
                Review and resubmit this quarter
              </button>{" "}
              — quarterly updates are designed to be corrected this way.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-base text-ink-soft">
                This quarter was already sent to HMRC&apos;s sandbox — resubmitting replaces
                those totals with your current figures.
              </p>
              <Button type="button" variant="outline" onClick={() => setFlowStep({ kind: "review" })}>
                Resubmit with updated figures
              </Button>
            </div>
          )}

          <CalcPanel
            calcState={calcState}
            onTrigger={runCalc}
            taxYear={taxYear}
            records={records}
            election={election}
            quarterIndex={quarterIndex}
          />
        </div>
      )}
    </FlowShell>
  );
}

function CalcPanel({
  calcState,
  onTrigger,
  taxYear,
  records,
  election,
  quarterIndex,
}: {
  calcState: CalcState;
  onTrigger: () => void;
  taxYear: TaxYear;
  records: LedgerRecord[];
  election: "standard" | "calendar";
  quarterIndex: 1 | 2 | 3 | 4;
}) {
  // Same figures->estimate pipeline EstimateCard uses, at this submission's
  // quarter (not "today's" quarter) — the point-in-time comparison against
  // HMRC's own calculation for that same cumulative position.
  const figures = useMemo(
    () => deriveFigures(records, taxYear, election, quarterIndex),
    [records, taxYear, election, quarterIndex]
  );
  const ourEstimate = useMemo(
    () =>
      estimateLiability({
        taxYear,
        tradingProfit: figures.tradingProfit,
        propertyIncome: figures.propertyIncome,
        propertyExpenses: figures.propertyExpenses,
        residentialFinanceCosts: figures.residentialFinanceCosts,
      }),
    [taxYear, figures]
  );

  const diverges =
    calcState.kind === "complete" &&
    calcState.incomeTaxAndNicsDuePounds !== null &&
    Math.round(calcState.incomeTaxAndNicsDuePounds * 100) !== ourEstimate.totalLiability;

  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="font-semibold text-ink">What HMRC calculates</p>

      {calcState.kind === "idle" && (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onTrigger}>
          Get HMRC&apos;s calculation (sandbox)
        </Button>
      )}

      {calcState.kind === "computing" && (
        <p className="mt-2 text-sm text-ink-soft">HMRC is computing this…</p>
      )}

      {calcState.kind === "poll-cap" && (
        <p className="mt-2 text-sm text-ink-soft">
          Still computing — check back in a moment. This is not an error, HMRC just hasn&apos;t
          finished yet.
        </p>
      )}

      {calcState.kind === "error" && (
        <Alert className="mt-2">
          <AlertTitle>HMRC didn&apos;t answer</AlertTitle>
          <AlertDescription>{calcState.message}</AlertDescription>
        </Alert>
      )}

      {calcState.kind === "complete" && (
        <div className="mt-2 space-y-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line p-3">
              <p className="text-xs text-ink-soft">HMRC&apos;s calculation (sandbox)</p>
              <p className="text-xl font-bold text-ink">
                {calcState.incomeTaxAndNicsDuePounds === null
                  ? "Not returned"
                  : gbpFromPounds(calcState.incomeTaxAndNicsDuePounds)}
              </p>
            </div>
            <div className="rounded-lg border border-line p-3">
              <p className="text-xs text-ink-soft">TaxSorted estimate</p>
              <p className="text-xl font-bold text-ink">{gbp(ourEstimate.totalLiability)}</p>
            </div>
          </div>
          {diverges ? (
            <p className="text-sm text-ink-soft">
              HMRC&apos;s number wins — ours is an estimate; differences usually mean records we
              can&apos;t see.
            </p>
          ) : null}
          {calcState.taxableIncomePounds !== null ? (
            <p className="text-xs text-ink-soft">
              HMRC also calculated taxable income of{" "}
              {gbpFromPounds(calcState.taxableIncomePounds)} for this figure.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
