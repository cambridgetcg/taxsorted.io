"use client";

// i18n: deferred to M2 — plain English for launch

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  quarterForDate,
  type LedgerRecord,
  type SourceType,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { createRecordsStore, type RecordsStore } from "@/lib/records";
import { quarterSummaryFor } from "@/lib/quarter-summary";
import { SOURCES } from "@/lib/sources";
import { EducationNotice } from "@/components/prep/education-notice";
import { RecordForm } from "@/components/prep/record-form";
import { Ledger } from "@/components/prep/ledger";
import { Badge } from "@/components/ui/badge";
import { gbpCompact } from "@/lib/format";

// MTD ITSA is mandatory from 2026-27 onward, so quarter-to-date chips are
// pinned to that year until a real tax-year picker exists.
const TAX_YEAR: TaxYear = "2026-27";
const ELECTION = "standard" as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function RecordsClient() {
  // One store for the lifetime of this page; the browser's IndexedDB by
  // default, or a Map if a test ever renders this component directly.
  const store = useMemo<RecordsStore>(() => createRecordsStore(), []);
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    store.list().then((all) => {
      if (!cancelled) {
        setRecords(all);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const addRecord = useCallback(
    async (record: Omit<LedgerRecord, "id">) => {
      const added = await store.add(record);
      setRecords((prev) => [...prev, added]);
      return added;
    },
    [store]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      await store.remove(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    },
    [store]
  );

  const quarter = quarterForDate(todayIso(), TAX_YEAR, ELECTION);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-accent hover:text-accent-deep">
        ← Back to TaxSorted
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Your records</h1>
      <p className="mt-3 text-ink-soft">
        Keep a running ledger of self-employment and UK property income and expenses, sorted
        into HMRC&apos;s own categories as you go — ready for a quarterly update whenever you
        need one.
      </p>

      <div className="mt-6">
        <EducationNotice />
      </div>

      <div className="mt-8">
        {quarter ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-ink">
              Quarter to date — Q{quarter.index} {TAX_YEAR} ({quarter.periodStart} to{" "}
              {quarter.periodEnd}):
            </span>
            {SOURCES.map((s) => (
              <QuarterChip
                key={s.value}
                label={s.label}
                records={records}
                source={s.value}
                quarterIndex={quarter.index}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            Today&apos;s date falls outside the {TAX_YEAR} quarterly periods, so there&apos;s no
            quarter-to-date summary to show right now — your records below are unaffected.
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <RecordForm onAdd={addRecord} />
        <Ledger
          records={loaded ? records : []}
          onDelete={removeRecord}
          onExportJson={() => store.exportJson()}
          onExportCsv={() => store.exportCsv()}
        />
      </div>
    </div>
  );
}

/**
 * One source's year-to-date position for the current quarter, income and
 * expenses kept apart — one combined figure would mean nothing. Renders
 * nothing if the summary can't be computed (see quarterSummaryFor).
 */
function QuarterChip({
  label,
  records,
  source,
  quarterIndex,
}: {
  label: string;
  records: LedgerRecord[];
  source: SourceType;
  quarterIndex: 1 | 2 | 3 | 4;
}) {
  const summary = quarterSummaryFor(records, source, TAX_YEAR, quarterIndex, ELECTION);
  if (!summary) return null;

  return (
    <Badge variant="outline">
      {label}: income {gbpCompact(summary.income)} · expenses {gbpCompact(summary.expenses)}
    </Badge>
  );
}
