"use client";

// i18n: deferred to M2 — plain English for launch

import { useState } from "react";
import {
  categoriesFor,
  cumulativeUpdate,
  penaltyPosition,
  type LedgerRecord,
  type SourceType,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cited } from "@/components/prep/cited";
import { gbp, formatUkDate } from "@/lib/format";
import { SOURCES } from "@/lib/sources";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

export interface QuarterCardProps {
  records: LedgerRecord[];
  source: SourceType;
  taxYear: TaxYear;
  quarterIndex: 1 | 2 | 3 | 4;
  election: "standard" | "calendar";
  /** Omit to render an uncontrolled read-only picker (e.g. in isolation/tests). */
  onQuarterChange?: (quarterIndex: 1 | 2 | 3 | 4) => void;
  onElectionChange?: (election: "standard" | "calendar") => void;
}

const QUARTERS: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
const ELECTIONS: { value: "standard" | "calendar"; label: string }[] = [
  { value: "standard", label: "Standard (6th)" },
  { value: "calendar", label: "Calendar (1st)" },
];

const TOGGLE_BASE =
  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
const TOGGLE_ON = "border-accent bg-accent text-white";
const TOGGLE_OFF = "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

/** Whole days from today to an ISO deadline date, floor-of-noon-safe (both sides at midnight). */
function daysUntil(iso: string): number {
  const deadline = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
}

function daysRemainingText(days: number): string {
  if (days === 0) return "due today";
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} left`;
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
}

/**
 * One source's cumulative quarterly update: a Q1–Q4 + election picker, the
 * HMRC category totals table for the chosen quarter, its deadline, the
 * honest penalty-points position (always shown — HMRC never softens this),
 * and a copy-to-clipboard button formatted as the same plain-text block MTD
 * software would send.
 *
 * `quarterIndex`/`election` are controlled by the caller; the buttons here
 * only report the click via `onQuarterChange`/`onElectionChange`, so two
 * QuarterCards on the same page can share one picker state.
 */
export function QuarterCard({
  records,
  source,
  taxYear,
  quarterIndex,
  election,
  onQuarterChange,
  onElectionChange,
}: QuarterCardProps) {
  // Deadline "days remaining" and clipboard feature-detection both depend on
  // the reader's own clock/browser, which the build server and the first
  // client paint can never know — gating them on useMounted() keeps the
  // pre-hydration render identical on server and client, then corrects once
  // real client state is available.
  const mounted = useMounted();
  const [copied, setCopied] = useState(false);

  const sourceLabel = SOURCES.find((s) => s.value === source)?.label ?? source;
  // Consolidated (single-total) expenses are a real HMRC option below the
  // £90,000 digital-record threshold (categories.ts's SE_CONSOLIDATED /
  // PROPERTY_CONSOLIDATED), but M1's UI doesn't offer the toggle yet —
  // deferred, not forgotten; always the itemised view for now.
  const update = cumulativeUpdate(records, source, taxYear, quarterIndex, { election });
  const rows = categoriesFor(source).filter((c) => c.key in update.totals);
  const penalty = penaltyPosition(taxYear);
  const taxYearStart = `${taxYear.slice(0, 4)}-04-06`;

  const daysRemaining = mounted ? daysUntil(update.quarter.deadline) : null;
  const canCopy =
    mounted && typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function";

  const handleCopy = async () => {
    const block = rows.map((c) => `${c.label}: ${gbp(update.totals[c.key])}`).join("\n");
    await navigator.clipboard.writeText(block);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {sourceLabel} — Q{quarterIndex} {taxYear} cumulative
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2" role="radiogroup" aria-label="Quarter">
            {QUARTERS.map((q) => (
              <button
                key={q}
                type="button"
                role="radio"
                aria-checked={quarterIndex === q}
                onClick={() => onQuarterChange?.(q)}
                className={cn(TOGGLE_BASE, quarterIndex === q ? TOGGLE_ON : TOGGLE_OFF)}
              >
                Q{q}
              </button>
            ))}
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="Quarter election">
            {ELECTIONS.map((e) => (
              <button
                key={e.value}
                type="button"
                role="radio"
                aria-checked={election === e.value}
                onClick={() => onElectionChange?.(e.value)}
                className={cn(TOGGLE_BASE, election === e.value ? TOGGLE_ON : TOGGLE_OFF)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">
            No {sourceLabel.toLowerCase()} records yet for this quarter — figures will appear here
            as soon as you add some.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-ink-soft">
                <tr>
                  <th scope="col" className="p-3 font-medium">
                    Category
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Cumulative amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.key} className="border-t border-line">
                    <td className="p-3">
                      <span className="font-medium text-ink">{c.label}</span>
                      <span className="block text-xs text-ink-soft">{c.plain}</span>
                    </td>
                    <td className="p-3 text-right">{gbp(update.totals[c.key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-sm text-ink-soft">
          Deadline: {formatUkDate(update.quarter.deadline)}
          {daysRemaining !== null ? ` — ${daysRemainingText(daysRemaining)}` : null}
        </p>

        {canCopy ? (
          <Button type="button" variant="outline" size="sm" onClick={handleCopy} disabled={rows.length === 0}>
            {copied ? "Copied ✓" : "Copy figures"}
          </Button>
        ) : null}

        <div role="note" className="rounded-2xl border border-line bg-accent-soft p-3 text-sm text-ink">
          <Cited cite={{ source: penalty.source, effectiveFrom: taxYearStart }}>{penalty.note}</Cited>
        </div>
      </CardContent>
    </Card>
  );
}
