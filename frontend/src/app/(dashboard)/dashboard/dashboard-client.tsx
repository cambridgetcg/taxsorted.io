"use client";

// i18n: deferred to M2 — plain English for launch
//
// The honest ITSA cockpit. Everything on this page is either engine-derived
// or read straight from this browser's own records store — the mock-data
// dashboard (compliance scores, fake HMRC connections, sample filings) is
// retired, not softened. Where a feature genuinely isn't built yet (the
// HMRC sandbox connect panel, the civic voice panel), the page says so
// plainly instead of showing a placeholder that looks real.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  estimateLiability,
  quarterForDate,
  type LedgerRecord,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { createRecordsStore, type RecordsStore } from "@/lib/records";
import { quarterSummaryFor } from "@/lib/quarter-summary";
import { deriveFigures } from "@/lib/derive-figures";
import { SOURCES } from "@/lib/sources";
import { EducationNotice } from "@/components/prep/education-notice";
import { StandStrip } from "@/components/dashboard-v2/stand-strip";
import { QuarterTimeline } from "@/components/dashboard-v2/quarter-timeline";
import { HmrcPanel } from "@/components/dashboard-v2/hmrc-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { gbp, gbpCompact } from "@/lib/format";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";

// MTD ITSA is mandatory from 2026-27 onward, so the cockpit is pinned to
// that year and the standard quarter election until a real tax-year picker
// exists (same convention as quarter-client.tsx / records-client.tsx).
const TAX_YEAR: TaxYear = "2026-27";
const ELECTION = "standard" as const;

export interface DashboardClientProps {
  /**
   * Overrides "today" for deterministic tests. Production never passes
   * this — it waits for `useMounted()` before reading the reader's own
   * clock, same hydration discipline as StandStrip/QuarterTimeline.
   */
  today?: string;
  /** Test seam: a Map-backed store instead of the browser's IndexedDB (jsdom has none). */
  store?: RecordsStore;
}

export default function DashboardClient({ today, store: injectedStore }: DashboardClientProps = {}) {
  // One store for the lifetime of this page; the browser's IndexedDB by
  // default, or an injected Map-backed one when a test renders this
  // component directly.
  const store = useMemo<RecordsStore>(() => injectedStore ?? createRecordsStore(), [injectedStore]);
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const mounted = useMounted();

  useEffect(() => {
    let cancelled = false;
    store.list().then((all) => {
      if (!cancelled) setRecords(all);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  // "Today" can only be known client-side — null until mounted (the
  // deterministic pre-hydration state), then the reader's own clock. Two
  // DIFFERENT null-ish situations hang off this and the UI keeps them
  // apart: todayIso === null means "still loading"; todayIso set but
  // quarter === null means today genuinely falls outside the 2026-27
  // quarterly periods (permanently true after 5 April 2027) — that gets
  // honest copy, never a stuck "Loading…".
  const todayIso = today ?? (mounted ? todayIsoLocal() : null);
  const quarter = todayIso ? quarterForDate(todayIso, TAX_YEAR, ELECTION) : null;
  // Q4 = the full tax year: the same deterministic fallback convention as
  // estimate-card.tsx, used both pre-mount and when today sits outside the
  // year's periods (the full year's records are then what's worth showing).
  const quarterIndex = quarter?.index ?? 4;

  const figures = deriveFigures(records, TAX_YEAR, ELECTION, quarterIndex);
  const estimate = estimateLiability({
    taxYear: TAX_YEAR,
    tradingProfit: figures.tradingProfit,
    propertyIncome: figures.propertyIncome,
    propertyExpenses: figures.propertyExpenses,
    residentialFinanceCosts: figures.residentialFinanceCosts,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">Your ITSA cockpit</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Where you stand on Making Tax Digital for Income Tax, from your own records — nothing
          invented, nothing assumed.
        </p>
      </div>

      <EducationNotice />

      {/* Row 1 — Where you stand */}
      <StandStrip taxYear={TAX_YEAR} election={ELECTION} today={today} />

      {/* Row 2 — Records, estimate, quarter timeline */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Records year to date</CardTitle>
            <CardDescription>
              {todayIso === null
                ? "Loading your quarter…"
                : quarter
                  ? `Q${quarter.index} ${TAX_YEAR}, cumulative from 6 April`
                  : `${TAX_YEAR} — outside the quarterly periods`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayIso === null ? (
              <p className="text-sm text-ink-soft">Loading your quarter-to-date totals…</p>
            ) : quarter === null ? (
              <p className="text-sm text-ink-soft">
                Today&apos;s date falls outside the {TAX_YEAR} quarterly periods, so there&apos;s
                no quarter-to-date summary to show right now — your records are unaffected.
              </p>
            ) : records.length === 0 ? (
              <p className="text-sm text-ink-soft">
                No records yet — add your first one and totals will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {SOURCES.map((s) => {
                  const summary = quarterSummaryFor(
                    records,
                    s.value,
                    TAX_YEAR,
                    quarter.index,
                    ELECTION
                  );
                  if (!summary) return null;
                  return (
                    <li key={s.value} className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">{s.label}</span>
                      <span className="font-semibold text-ink">
                        {gbpCompact(summary.income)} in · {gbpCompact(summary.expenses)} out
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/itsa/records"
              className="inline-block text-sm font-medium text-accent underline hover:text-accent-deep"
            >
              Add or review your records →
            </Link>
          </CardContent>
        </Card>

        <Card className="border-accent/30">
          <CardHeader className="pb-2">
            <CardTitle>Estimated Self Assessment bill</CardTitle>
            <CardDescription>
              Not a bill — HMRC&apos;s own calculation is the number that counts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-4xl font-bold text-ink">{gbp(estimate.totalLiability)}</p>
            {figures.recordCount === 0 ? (
              <p className="text-sm text-ink-soft">
                No records yet — this estimate assumes zero income and expenses until you add
                some.
              </p>
            ) : null}
            <Link
              href="/itsa/quarter"
              className="inline-block text-sm font-medium text-accent underline hover:text-accent-deep"
            >
              See the full cited breakdown →
            </Link>
          </CardContent>
        </Card>
      </div>

      <QuarterTimeline records={records} taxYear={TAX_YEAR} election={ELECTION} today={today} />

      {/* Row 3 — HMRC connect panel (real sandbox OAuth) + your voice (arriving next) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <HmrcPanel taxYear={TAX_YEAR} />
        <ComingSoonCard
          title="Your voice"
          description="Find your MP and see who's accountable for tax policy, plus how tax law actually gets made — arriving in this build."
        />
      </div>

      {/* Row 4 — VAT stays its own cockpit */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Run a VAT-registered business too?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            The VAT cockpit lives at <span className="font-medium text-ink">/vat</span> — its own
            entities, HMRC connection and receipts, kept separate from Income Tax.
          </p>
          <Link href="/vat/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open the VAT cockpit →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function ComingSoonCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-ink-soft">{description}</p>
      </CardContent>
    </Card>
  );
}
