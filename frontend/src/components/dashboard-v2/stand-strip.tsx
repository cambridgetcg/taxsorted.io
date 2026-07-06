"use client";

// i18n: deferred to M2 — plain English for launch

import Link from "next/link";
import {
  penaltyPosition,
  quartersFor,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cited } from "@/components/prep/cited";
import { formatUkDate } from "@/lib/format";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";

export interface StandStripProps {
  taxYear: TaxYear;
  election: "standard" | "calendar";
  /**
   * Overrides "today" for deterministic tests. Production never passes
   * this — it waits for `useMounted()` before reading the reader's own
   * clock, same hydration discipline as QuarterCard/EstimateCard.
   */
  today?: string;
}

/** Whole days from `fromIso` to `toIso`, both parsed at local midnight. */
function daysBetweenIso(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

// `days` is never negative here: the deadline it words always comes from
// `find(q => q.deadline >= todayIso)`, so a passed deadline simply stops
// being "next" — there is no overdue case for this strip to phrase.
function daysRemainingText(days: number): string {
  if (days === 0) return "due today";
  return `${days} day${days === 1 ? "" : "s"} left`;
}

/**
 * Row 1 — "Where you stand": the next quarterly deadline counting down, the
 * honest penalty-points position for the tax year (never softened — HMRC
 * doesn't soften it either), and an eligibility prompt that owns up to there
 * being no stored "am I in?" verdict anywhere in this app yet.
 */
export function StandStrip({ taxYear, election, today }: StandStripProps) {
  const mounted = useMounted();
  const todayIso = today ?? (mounted ? todayIsoLocal() : null);

  const quarters = quartersFor(taxYear, election);
  const nextQuarter = todayIso ? quarters.find((q) => q.deadline >= todayIso) ?? null : null;
  const penalty = penaltyPosition(taxYear);
  const taxYearStart = quarters[0].cumulativeStart;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-ink-soft">
            Next deadline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayIso === null ? (
            <p className="text-sm text-ink-soft">Loading your next deadline…</p>
          ) : nextQuarter ? (
            <>
              <p className="text-3xl font-bold text-ink">{formatUkDate(nextQuarter.deadline)}</p>
              <p className="mt-1 text-sm text-ink-soft">
                Q{nextQuarter.index} {taxYear} update —{" "}
                {daysRemainingText(daysBetweenIso(todayIso, nextQuarter.deadline))}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">
              All four quarterly deadlines for {taxYear} have passed.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-ink-soft">
            Penalty position
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant={penalty.quarterlyPoints ? "warning" : "success"}>
            {penalty.quarterlyPoints ? "Points-based regime" : `No points — ${taxYear} easement`}
          </Badge>
          <p className="text-sm text-ink-soft">
            <Cited cite={{ source: penalty.source, effectiveFrom: taxYearStart }}>
              {penalty.note}
            </Cited>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wide text-ink-soft">
            Am I in?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-ink-soft">
            We don&apos;t store a verdict here — a 60-second check against your gross income
            tells you whether, and from when, MTD for Income Tax applies to you.
          </p>
          <Link
            href="/itsa/am-i-in"
            className="inline-block text-sm font-medium text-accent underline hover:text-accent-deep"
          >
            Check in 60 seconds →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
