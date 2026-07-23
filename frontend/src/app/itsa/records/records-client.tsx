"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  quarterForDate,
  type LedgerRecord,
  type NewLedgerRecord,
  type SourceType,
  type TaxYear,
} from "@taxsorted/engine/uk/itsa";
import { createRecordsStore, type RecordsStore, type ReviewEventInput } from "@/lib/records";
import {
  projectReadyRecords,
  type AccountingEvent,
  type ImportCandidate,
  type LocalBooksState,
  type LocalLedger,
} from "@/lib/local-books";
import { quarterSummaryFor } from "@/lib/quarter-summary";
import { SOURCES } from "@/lib/sources";
import { EducationNotice } from "@/components/prep/education-notice";
import { RecordForm } from "@/components/prep/record-form";
import { CsvImport } from "@/components/prep/csv-import";
import { Ledger } from "@/components/prep/ledger";
import { MoneyInbox, PracticeShop } from "@/components/prep/money-inbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUkDate, gbpCompact } from "@/lib/format";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";

const TAX_YEAR: TaxYear = "2026-27";
const ELECTION = "standard" as const;

export default function RecordsClient() {
  const store = useMemo<RecordsStore>(() => createRecordsStore(), []);
  const [books, setBooks] = useState<LocalBooksState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mounted = useMounted();

  const refresh = useCallback(async () => {
    try {
      setBooks(await store.state());
      setLoadError(null);
    } catch (caught) {
      setBooks(null);
      setLoadError(
        caught instanceof Error ? caught.message : "Your local books could not be read."
      );
      throw caught;
    }
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      store.state().then(
        (state) => {
          if (!cancelled) {
            setBooks(state);
            setLoadError(null);
          }
        },
        (caught) => {
          if (!cancelled) {
            setBooks(null);
            setLoadError(
              caught instanceof Error ? caught.message : "Your local books could not be read."
            );
          }
        }
      );
    };
    load();
    const unsubscribe = store.subscribe(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store]);

  const events = books?.events ?? [];
  const ledgers = books?.ledgers ?? [];
  const records = useMemo(() => (books ? projectReadyRecords(books) : []), [books]);

  const addRecord = useCallback(
    async (record: NewLedgerRecord) => {
      const added = await store.add(record);
      await refresh();
      return added;
    },
    [store, refresh]
  );

  const importRecords = useCallback(
    async (candidates: ImportCandidate[]) => {
      const result = await store.importMany(candidates);
      await refresh();
      return result;
    },
    [store, refresh]
  );

  const reviewEvent = useCallback(
    async (id: string, input: ReviewEventInput) => {
      const reviewed = await store.review(id, input);
      await refresh();
      return reviewed;
    },
    [store, refresh]
  );

  const confirmLedger = useCallback(
    async (ledgerId: string) => {
      await store.confirmLedger(ledgerId);
      await refresh();
    },
    [store, refresh]
  );

  const reopenLedger = useCallback(
    async (ledgerId: string) => {
      await store.reopenLedger(ledgerId);
      await refresh();
    },
    [store, refresh]
  );

  const quarter = mounted ? quarterForDate(todayIsoLocal(), TAX_YEAR, ELECTION) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/tools", label: "Do my tax" },
          { href: "/itsa", label: "Income Tax" },
        ]}
        current="Starter Books"
      />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Starter Books</h1>
      <p className="mt-3 text-base text-ink-soft">
        Bring in money movements, answer one plain question at a time, and keep books you can
        explain. Suggestions never enter your figures until you confirm them.
      </p>

      <div className="mt-6"><EducationNotice /></div>

      {books === null ? (
        <div
          role={loadError ? "alert" : "status"}
          className="mt-8 rounded-2xl border border-line bg-white p-5 text-base text-ink-soft"
        >
          <p>{loadError ?? "Loading your local books…"}</p>
          {loadError ? (
            <Button type="button" variant="outline" className="mt-3" onClick={() => void refresh().catch(() => undefined)}>
              Try reading them again
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-8"><PracticeShop /></div>

          <div className="mt-6"><CsvImport onImport={importRecords} /></div>

          <div className="mt-8">
            <MoneyInbox events={events} ledgers={ledgers} onReview={reviewEvent} />
          </div>

          <div className="mt-8">
            <LedgerScopeCheck
              events={events}
              ledgers={ledgers}
              onConfirm={confirmLedger}
              onReopen={reopenLedger}
            />
          </div>

          <div className="mt-8">
            {quarter ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-medium text-ink">
                  Ready figures — Q{quarter.index} {TAX_YEAR} ({formatUkDate(quarter.periodStart)} to{" "}
                  {formatUkDate(quarter.periodEnd)}):
                </span>
                {SOURCES.map((source) => (
                  <QuarterChip
                    key={source.value}
                    label={source.label}
                    records={records}
                    source={source.value}
                    quarterIndex={quarter.index}
                  />
                ))}
              </div>
            ) : (
              <p className="text-base text-ink-soft">
                Today falls outside the {TAX_YEAR} quarterly periods. Your books are unaffected.
              </p>
            )}
          </div>

          <details className="mt-6 rounded-2xl border border-line p-4 sm:p-5">
            <summary className="cursor-pointer font-semibold text-ink">Add one record manually</summary>
            <div className="mt-4"><RecordForm onAdd={addRecord} /></div>
          </details>

          <div className="mt-8">
            <Ledger
              events={events}
              ledgers={ledgers}
              onReview={reviewEvent}
              onExportJson={() => store.exportJson()}
              onExportCsv={() => store.exportCsv()}
            />
          </div>
        </>
      )}
    </div>
  );
}

function LedgerScopeCheck({
  events,
  ledgers,
  onConfirm,
  onReopen,
}: {
  events: AccountingEvent[];
  ledgers: LocalLedger[];
  onConfirm: (ledgerId: string) => Promise<void>;
  onReopen: (ledgerId: string) => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = ledgers.filter((ledger) =>
    events.some((event) => event.ledgerId === ledger.id)
  );
  if (active.length === 0) return null;

  return (
    <section aria-labelledby="ledger-scope-heading" className="rounded-2xl border border-line p-4 sm:p-5">
      <h2 id="ledger-scope-heading" className="text-lg font-semibold text-ink">
        Keep separate businesses separate
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        HMRC quarterly updates belong to one trade or property business at a time. Confirm only
        when every record in this book belongs to the same separate business.
      </p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <ul className="mt-4 space-y-3">
        {active.map((ledger) => (
          <li key={ledger.id} className="rounded-xl bg-paper p-3">
            <p className="font-medium text-ink">{ledger.name}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {events.filter((event) => event.ledgerId === ledger.id).length} saved event(s)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ledger.scopeState === "needs-confirmation" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busyId === ledger.id}
                  onClick={async () => {
                    setBusyId(ledger.id);
                    setError(null);
                    try {
                      await onConfirm(ledger.id);
                    } catch (caught) {
                      setError(
                        caught instanceof Error
                          ? caught.message
                          : "Could not confirm that book. Nothing changed."
                      );
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Yes — one separate business
                </Button>
              ) : (
                <>
                  <Badge variant="outline">Scope confirmed</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === ledger.id}
                    onClick={async () => {
                      setBusyId(ledger.id);
                      setError(null);
                      try {
                        await onReopen(ledger.id);
                      } catch (caught) {
                        setError(
                          caught instanceof Error
                            ? caught.message
                            : "Could not reopen that scope check. Nothing changed."
                        );
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Review this business scope again
                  </Button>
                </>
              )}
            </div>
            {ledger.scopeState === "needs-confirmation" ? (
              <details className="mt-2 text-sm text-ink-soft">
                <summary className="cursor-pointer">I have more than one</summary>
                <p className="mt-1">
                  Do not confirm this combined book. Separate-ledger setup is not in this first
                  slice, so sandbox sending stays unsafe for that situation.
                </p>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

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
