"use client";

// i18n: deferred to M2 — plain English for launch

import Link from "next/link";
import {
  quarterForDate,
  quartersFor,
  type LedgerRecord,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatUkDate } from "@/lib/format";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

export interface QuarterTimelineProps {
  records: LedgerRecord[];
  taxYear: TaxYear;
  election: "standard" | "calendar";
  /** Overrides "today" for deterministic tests — see StandStrip's note. */
  today?: string;
}

/**
 * Q1–Q4 at a glance: each quarter's deadline, whether it's the one "today"
 * falls in, and whether ANY local record (either source) falls inside its
 * period. That last part is deliberately a plain date-range presence check,
 * not `cumulativeUpdate` — cumulative totals answer a different question
 * ("what's owed so far"), not "did I touch this quarter at all". Nothing
 * here is an HMRC-confirmed status: no update has been submitted anywhere
 * yet, so "records added" only ever means *your own* records, never
 * "fulfilled" in HMRC's sense.
 */
export function QuarterTimeline({ records, taxYear, election, today }: QuarterTimelineProps) {
  const mounted = useMounted();
  const todayIso = today ?? (mounted ? todayIsoLocal() : null);

  const quarters = quartersFor(taxYear, election);
  const currentIndex = todayIso ? quarterForDate(todayIso, taxYear, election)?.index ?? null : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Quarter timeline</CardTitle>
        <CardDescription>
          Your own records, by quarter — nothing here is confirmed by HMRC until your updates
          go through them, and submission isn&apos;t built yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quarters.map((q) => {
            const hasRecords = records.some(
              (r) => r.date >= q.periodStart && r.date <= q.periodEnd
            );
            const isCurrent = currentIndex === q.index;
            return (
              <li
                key={q.index}
                className={cn(
                  "rounded-2xl border p-3",
                  isCurrent ? "border-accent bg-accent-soft" : "border-line bg-white"
                )}
              >
                <p className="text-sm font-semibold text-ink">
                  Q{q.index}
                  {isCurrent ? (
                    <span className="ml-1.5 text-xs font-normal text-accent">current</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-ink-soft">Due {formatUkDate(q.deadline)}</p>
                <Badge variant={hasRecords ? "success" : "outline"} className="mt-2">
                  {hasRecords ? "records added" : "no records yet"}
                </Badge>
              </li>
            );
          })}
        </ol>
        <Link
          href="/itsa/records"
          className="mt-4 inline-block text-sm font-medium text-accent underline hover:text-accent-deep"
        >
          Add or review your records →
        </Link>
      </CardContent>
    </Card>
  );
}
