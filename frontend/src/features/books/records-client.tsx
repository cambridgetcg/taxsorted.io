"use client";

// Shared local-books workspace for the Books views and the Income Tax records route.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  BooksWorkspaceNav,
  type BooksWorkspaceNavView,
} from "@/components/books/workspace-nav";
import { BooksToday } from "@/components/books/today";
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
import { ActionError } from "@/components/ui/action-error";
import { formatUkDate, gbpCompact } from "@/lib/format";
import { todayIsoLocal } from "@/lib/local-date";
import { useMounted } from "@/lib/use-mounted";
import { summariseBooks, type BooksSummary } from "@/lib/books-summary";
import { BooksBackup } from "@/features/books/books-backup";

const TAX_YEAR: TaxYear = "2026-27";
const TAX_YEAR_START = "2026-04-06";
const ELECTION = "standard" as const;

export type BooksWorkspaceView = BooksWorkspaceNavView;

export interface RecordsClientProps {
  /** The same local books can be entered from the accounting or MTD path. */
  entry?: "books" | "mtd";
  /** Books uses separate, linkable task views. MTD keeps the existing composite. */
  view?: BooksWorkspaceView;
}

export default function RecordsClient({
  entry = "mtd",
  view = "today",
}: RecordsClientProps = {}) {
  const store = useMemo<RecordsStore>(() => createRecordsStore(), []);
  const [books, setBooks] = useState<LocalBooksState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startChoice, setStartChoice] = useState<"manual" | "csv" | "closed" | null>(null);
  const manualStartTitle = useRef<HTMLHeadingElement>(null);
  const csvStartTitle = useRef<HTMLHeadingElement>(null);
  const focusedStart = useRef<"manual" | "csv" | null>(null);
  const mounted = useMounted();
  const enteredFromBooks = entry === "books";
  const requestedStart =
    enteredFromBooks && mounted && typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("start")
      : null;
  const queryStart = requestedStart === "manual" || requestedStart === "csv" ? requestedStart : null;
  const emptyStart =
    startChoice === null ? queryStart : startChoice === "closed" ? null : startChoice;
  const setEmptyStart = (next: "manual" | "csv" | null) => {
    setStartChoice(next ?? "closed");
  };
  const preferredSource: SourceType =
    enteredFromBooks &&
    mounted &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("activity") === "uk-property"
      ? "uk-property"
      : "self-employment";

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

  useEffect(() => {
    if (!emptyStart) {
      focusedStart.current = null;
      return;
    }
    if (!books || focusedStart.current === emptyStart) return;
    if (emptyStart === "manual") manualStartTitle.current?.focus();
    if (emptyStart === "csv") csvStartTitle.current?.focus();
    focusedStart.current = emptyStart;
  }, [books, emptyStart]);

  const events = books?.events ?? [];
  const ledgers = books?.ledgers ?? [];
  const records = useMemo(() => (books ? projectReadyRecords(books) : []), [books]);
  const booksSummary = useMemo(() => (books ? summariseBooks(books) : null), [books]);

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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={
          enteredFromBooks
            ? [{ href: "/books", label: "Books" }]
            : [
                { href: "/file", label: "File and pay" },
                { href: "/itsa", label: "Income Tax" },
              ]
        }
        current={enteredFromBooks ? "Your records" : "Starter Books"}
      />

      <header className="mt-5">
        {enteredFromBooks ? <p className="section-label">Books in plain words</p> : null}
        <h1 className={`${enteredFromBooks ? "font-display" : ""} mt-4 text-3xl font-bold text-ink sm:text-4xl`}>
          {enteredFromBooks ? "Your business money" : "Starter Books"}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">
          {enteredFromBooks
            ? "Keep a checked record of money in and money out. We show what each item changes before it counts."
            : "Bring in money movements, answer one plain question at a time, and keep books you can explain. Suggestions never enter your figures until you confirm them."}
        </p>
        {enteredFromBooks ? (
          <p className="mt-5 rounded-2xl border border-line bg-paper p-4 text-sm leading-6 text-ink-soft">
            <strong className="text-ink">Available now:</strong>{" "}up to one UK sole-trader
            business and one UK property business, kept separate, in pounds, with a 2026–27
            Income Tax view. These records stay only in this browser. TaxSorted does not encrypt
            or automatically back them up, and signing in does not put them on another device. Limited companies
            and full annual accounts are not supported yet.
          </p>
        ) : null}
      </header>

      {enteredFromBooks ? (
        <div className="mt-6 border-y border-line py-3">
          <BooksWorkspaceNav view={view} />
        </div>
      ) : (
        <div className="mt-6"><EducationNotice /></div>
      )}

      {books === null ? (
        <div
          role={loadError ? "alert" : "status"}
          className="mt-8 rounded-2xl border border-line bg-white p-5 text-base text-ink-soft"
        >
          <p>{loadError ? "We couldn’t open your records." : "Opening your records…"}</p>
          {loadError ? (
            <>
              <p className="mt-2">Nothing was changed or deleted. Try again.</p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-medium text-ink">Technical detail</summary>
                <p className="mt-1 break-words">{loadError}</p>
              </details>
              <Button type="button" variant="outline" className="mt-3" onClick={() => void refresh().catch(() => undefined)}>
                Try again
              </Button>
            </>
          ) : null}
        </div>
      ) : (
        <>
          {enteredFromBooks && view === "today" && booksSummary ? (
            <div className="mt-8"><BooksToday summary={booksSummary} /></div>
          ) : null}

          {(!enteredFromBooks || view === "money") ? (
            <>
              {events.length === 0 || emptyStart !== null ? (
                <section
                  aria-labelledby="empty-start-title"
                  className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6"
                >
                  <h2 id="empty-start-title" className="font-display text-2xl font-bold text-ink">
                    {events.length === 0 ? "No records yet" : "Add more records"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-base leading-7 text-ink-soft">
                    Add one amount that came in or went out, or bring in a CSV file. Every item
                    goes to To check first and changes no total until you confirm it.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      aria-controls="manual-start-panel"
                      aria-expanded={emptyStart === "manual"}
                      onClick={() => setEmptyStart("manual")}
                    >
                      Add money in or out
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-controls="csv-start-panel"
                      aria-expanded={emptyStart === "csv"}
                      onClick={() => setEmptyStart("csv")}
                    >
                      Bring in a CSV file
                    </Button>
                  </div>
                  <div className="mt-6">
                    <section
                      id="manual-start-panel"
                      aria-labelledby="manual-start-title"
                      hidden={emptyStart !== "manual"}
                    >
                      <h3
                        ref={manualStartTitle}
                        id="manual-start-title"
                        tabIndex={-1}
                        className="mb-3 text-lg font-semibold text-ink"
                      >
                        Add money in or out
                      </h3>
                      <RecordForm
                        key={`manual-${preferredSource}`}
                        onAdd={addRecord}
                        initialSource={preferredSource}
                      />
                    </section>
                    <section
                      id="csv-start-panel"
                      aria-labelledby="csv-start-title"
                      hidden={emptyStart !== "csv"}
                    >
                      <h3
                        ref={csvStartTitle}
                        id="csv-start-title"
                        tabIndex={-1}
                        className="mb-3 text-lg font-semibold text-ink"
                      >
                        Bring in a CSV file
                      </h3>
                      <CsvImport
                        key={`csv-${preferredSource}`}
                        onImport={importRecords}
                        expanded
                        initialSource={preferredSource}
                      />
                    </section>
                  </div>
                  {events.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-5"
                      onClick={() => setEmptyStart(null)}
                    >
                      Finish adding for now
                    </Button>
                  ) : null}
                </section>
              ) : null}

              {events.length === 0 ? <div className="mt-6"><PracticeShop /></div> : null}

              {events.length > 0 ? (
                <>
                  {emptyStart === null ? (
                    <div className="mt-8">
                      <CsvImport onImport={importRecords} initialSource={preferredSource} />
                    </div>
                  ) : null}

                  <div className="mt-8">
                    <MoneyInbox events={events} ledgers={ledgers} onReview={reviewEvent} />
                  </div>

                  {enteredFromBooks && emptyStart === null ? (
                    <details className="mt-6 rounded-2xl border border-line p-4 sm:p-5">
                      <summary className="min-h-11 cursor-pointer font-semibold text-ink">
                        Add money in or out
                      </summary>
                      <div className="mt-4">
                        <RecordForm onAdd={addRecord} initialSource={preferredSource} />
                      </div>
                    </details>
                  ) : null}

                  {enteredFromBooks ? (
                    <div className="mt-8">
                      <Ledger
                        events={events}
                        ledgers={ledgers}
                        onReview={reviewEvent}
                        onExportJson={() => store.exportJson()}
                        onExportCsv={() => store.exportCsv()}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}

          {enteredFromBooks && view === "business" && booksSummary ? (
            <div className="mt-8 space-y-8">
              <LedgerScopeCheck
                events={events}
                ledgers={ledgers}
                onConfirm={confirmLedger}
                onReopen={reopenLedger}
              />
              <BooksBusinessSummary
                events={events}
                ledgers={ledgers}
                summary={booksSummary}
              />
            </div>
          ) : null}

          {enteredFromBooks && view === "tax" && booksSummary ? (
            <div className="mt-8">
              <BooksTaxView books={books} summary={booksSummary} quarter={quarter} />
            </div>
          ) : null}

          {!enteredFromBooks && events.length > 0 ? (
            <>
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
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-ink">
                        Cumulative Income Tax category totals from ready records — {formatUkDate(TAX_YEAR_START)} to {formatUkDate(quarter.periodEnd)}:
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
                    {records.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                        <Link
                          href="/itsa/quarter"
                          className="inline-flex min-h-11 items-center text-accent underline underline-offset-4"
                        >
                          Review this Income Tax quarter →
                        </Link>
                        <Link
                          href="/books/connect"
                          className="inline-flex min-h-11 items-center text-accent underline underline-offset-4"
                        >
                          See how records could reach HMRC →
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-base text-ink-soft">
                    Today falls outside the {TAX_YEAR} quarterly periods. Your books are unaffected.
                  </p>
                )}
              </div>

              {emptyStart === null ? (
                <details className="mt-6 rounded-2xl border border-line p-4 sm:p-5">
                  <summary className="min-h-11 cursor-pointer font-semibold text-ink">
                    Add money in or out
                  </summary>
                  <div className="mt-4">
                    <RecordForm onAdd={addRecord} initialSource={preferredSource} />
                  </div>
                </details>
              ) : null}

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
          ) : null}
          <BooksBackup store={store} onRestored={refresh} />
        </>
      )}
    </div>
  );
}

function BooksBusinessSummary({
  events,
  ledgers,
  summary,
}: {
  events: AccountingEvent[];
  ledgers: LocalLedger[];
  summary: BooksSummary;
}) {
  const ledgerById = new Map(ledgers.map((ledger) => [ledger.id, ledger]));
  const activeIds = new Set(events.map((event) => event.ledgerId));
  const active = summary.ledgers.filter((ledger) => activeIds.has(ledger.ledgerId));

  return (
    <section aria-labelledby="business-summary-heading">
      <p className="section-label">What the records show</p>
      <h2 id="business-summary-heading" className="mt-3 font-display text-3xl font-semibold text-ink">
        Each business stays separate
      </h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">
        These add up the checked records saved for each business across all the dates shown. They
        are not a tax-period total, bank balance, full accounts or final profit.
      </p>

      {active.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">
          No business totals yet. Add and check at least one money item first.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {active.map((ledgerSummary) => {
            const ledger = ledgerById.get(ledgerSummary.ledgerId);
            const ledgerEvents = events.filter((event) => event.ledgerId === ledgerSummary.ledgerId);
            const notIncluded = ledgerEvents.filter((event) => event.reviewState !== "ready").length;
            const sourceName = SOURCES.find((source) => source.value === ledgerSummary.activity)?.label;

            return (
              <article key={ledgerSummary.ledgerId} className="rounded-[2rem] border border-line bg-surface p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-accent">{sourceName}</p>
                    <h3 className="mt-1 font-display text-2xl font-semibold text-ink">
                      {ledgerSummary.ledgerName}
                    </h3>
                  </div>
                  <Badge variant={ledger?.scopeState === "confirmed" ? "success" : "warning"}>
                    {ledger?.scopeState === "confirmed" ? "Business checked" : "Business check needed"}
                  </Badge>
                </div>

                {ledger?.scopeState !== "confirmed" ? (
                  <p className="mt-5 rounded-xl bg-paper p-4 text-sm leading-6 text-ink">
                    Checked items do not count yet. Confirm above that they all belong to this one
                    separate business.
                  </p>
                ) : ledgerSummary.confirmedEventCount === 0 ? (
                  <p className="mt-5 rounded-xl bg-paper p-4 text-sm leading-6 text-ink-soft">
                    No checked item in this business currently counts in the totals.
                  </p>
                ) : (
                  <>
                    <dl className="mt-6 grid overflow-hidden rounded-2xl border border-line sm:grid-cols-3">
                      {[
                        ["Income recorded", ledgerSummary.income],
                        ["Costs recorded", ledgerSummary.expenses],
                        ["Income less recorded costs", ledgerSummary.incomeLessCosts],
                      ].map(([label, amount], index) => (
                        <div key={label} className={`p-4 sm:p-5 ${index > 0 ? "border-t border-line sm:border-s sm:border-t-0" : ""}`}>
                          <dt className="text-sm text-ink-soft">{label}</dt>
                          <dd className="mt-2 font-display text-2xl font-semibold text-ink">
                            {gbpCompact(Number(amount))}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-4 text-sm leading-6 text-ink-soft">
                      {ledgerSummary.confirmedEventCount} checked item{ledgerSummary.confirmedEventCount === 1 ? "" : "s"}
                      {ledgerSummary.firstRecordOn && ledgerSummary.latestRecordOn
                        ? ` from ${formatUkDate(ledgerSummary.firstRecordOn)} through ${formatUkDate(ledgerSummary.latestRecordOn)}`
                        : ""}. These totals are not bank cash or final profit.
                      {notIncluded > 0
                        ? ` ${notIncluded} waiting or left-out item${notIncluded === 1 ? " is" : "s are"} not included.`
                        : ""}
                    </p>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p role="note" className="mt-6 rounded-2xl border border-line bg-paper p-4 text-sm leading-6 text-ink-soft">
        Bank checking, invoices and bills, assets and debts, a balance sheet and statutory annual
        accounts are not live in this first version.
      </p>
    </section>
  );
}

function BooksTaxView({
  books,
  summary,
  quarter,
}: {
  books: LocalBooksState;
  summary: BooksSummary;
  quarter: ReturnType<typeof quarterForDate>;
}) {
  const totals = quarter
    ? summary.ledgers.flatMap((ledgerSummary) => {
        if (ledgerSummary.confirmedEventCount === 0) return [];
        const recordsForLedger = projectReadyRecords(books, ledgerSummary.ledgerId);
        const quarterTotals = quarterSummaryFor(
          recordsForLedger,
          ledgerSummary.activity,
          TAX_YEAR,
          quarter.index,
          ELECTION,
        );
        return quarterTotals ? [{ ledgerSummary, quarterTotals }] : [];
      })
    : [];
  return (
    <div className="space-y-8">
      <BooksTaxBoundaryNote />
      <section aria-labelledby="tax-view-heading">
        <p className="section-label">Income Tax</p>
        <h2 id="tax-view-heading" className="mt-3 font-display text-3xl font-semibold text-ink">
          Income Tax totals from checked records
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-ink-soft">
          These are prepared category totals, not tax due. Each business stays separate and
          nothing has been sent to HMRC.
        </p>

        {!quarter ? (
          <p className="mt-6 rounded-2xl border border-line bg-paper p-5 text-ink-soft">
            Today is outside the {TAX_YEAR} quarterly periods. Your records are safe; no
            current-quarter total is shown.
          </p>
        ) : totals.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-ink-soft">
            No totals yet. Check at least one item, then confirm that each group contains records
            for one separate business.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {totals.map(({ ledgerSummary, quarterTotals }) => (
              <article key={ledgerSummary.ledgerId} className="rounded-[2rem] border border-line bg-surface p-5 sm:p-7">
                <p className="text-sm font-medium text-accent">
                  {SOURCES.find((source) => source.value === ledgerSummary.activity)?.label}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-ink">
                  {ledgerSummary.ledgerName}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  Cumulative from {formatUkDate(TAX_YEAR_START)} through {formatUkDate(quarter.periodEnd)},
                  not just the latest quarter.
                </p>
                <dl className="mt-5 grid overflow-hidden rounded-2xl border border-line sm:grid-cols-2">
                  <div className="p-4 sm:p-5">
                    <dt className="text-sm text-ink-soft">Income recorded</dt>
                    <dd className="mt-2 font-display text-2xl font-semibold text-ink">
                      {gbpCompact(quarterTotals.income)}
                    </dd>
                  </div>
                  <div className="border-t border-line p-4 sm:border-s sm:border-t-0 sm:p-5">
                    <dt className="text-sm text-ink-soft">Costs recorded</dt>
                    <dd className="mt-2 font-display text-2xl font-semibold text-ink">
                      {gbpCompact(quarterTotals.expenses)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-6 text-ink-soft">
                  Built from {quarterTotals.recordCount} checked category entr{quarterTotals.recordCount === 1 ? "y" : "ies"}
                  for this business. Nothing has been sent.
                </p>
              </article>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-3">
          {summary.needsReviewCount > 0 ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              {summary.needsReviewCount} waiting item{summary.needsReviewCount === 1 ? " is" : "s are"}
              {" "}not included.
            </p>
          ) : null}
          {summary.readyWaitingForScopeCount > 0 ? (
            <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              {summary.readyWaitingForScopeCount} checked item{summary.readyWaitingForScopeCount === 1 ? " is" : "s are"}
              {" "}waiting for a business check and not included.
            </p>
          ) : null}
          {summary.excludedCount > 0 ? (
            <p className="rounded-xl border border-line bg-paper p-4 text-sm leading-6 text-ink-soft">
              {summary.excludedCount} saved item{summary.excludedCount === 1 ? " is" : "s are"}
              {" "}marked not counted and left out of this view.
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/itsa/quarter" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
            Check this quarter before sending anything →
          </Link>
          <Link href="/books/connect" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
            See how records could reach HMRC →
          </Link>
        </div>
      </section>
    </div>
  );
}

function BooksTaxBoundaryNote() {
  return (
    <div
      role="note"
      className="rounded-2xl border border-line bg-accent-soft p-4 text-base text-ink sm:p-5"
    >
      <p>
        <strong>Recorded totals, not tax advice.</strong>{" "}These figures exactly add up the
        checked records included below. They may still be incomplete because TaxSorted cannot see
        every fact, and they do not calculate tax due. TaxSorted cannot file to live HMRC; the
        clearly labelled practice flow uses HMRC&apos;s sandbox only.
      </p>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        Dates use HMRC&apos;s standard update periods: 6 April to 5 July, then through 5 October,
        5 January and 5 April. Calendar-quarter periods are not supported yet.
      </p>
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
  const [error, setError] = useState<{
    message: string;
    technical?: string;
  } | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const savedStatusRef = useRef<HTMLParagraphElement>(null);
  const announceSaved = (message: string) => {
    setSavedStatus(message);
    window.setTimeout(() => savedStatusRef.current?.focus(), 0);
  };
  const active = ledgers.filter((ledger) =>
    events.some((event) => event.ledgerId === ledger.id)
  );
  if (active.length === 0) return null;

  return (
    <section aria-labelledby="ledger-scope-heading" className="rounded-2xl border border-line p-4 sm:p-5">
      <h2 id="ledger-scope-heading" className="text-lg font-semibold text-ink">
        Do all the records in each group belong to one business?
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Income Tax updates cover one sole-trader business or one property business at a time.
        Check each group below. Confirm it only if every item in that group belongs to the same
        separate business.
      </p>
      {error ? (
        <ActionError
          className="mt-3"
          message={error.message}
          technical={error.technical}
        />
      ) : null}
      {savedStatus ? (
        <p
          ref={savedStatusRef}
          role="status"
          tabIndex={-1}
          className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-800"
        >
          {savedStatus}
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {active.map((ledger) => {
          const savedCount = events.filter((event) => event.ledgerId === ledger.id).length;
          return (
          <li key={ledger.id} className="rounded-xl bg-paper p-3">
            <h3
              aria-label={`${ledger.name} business check`}
              className="font-medium text-ink"
            >
              {ledger.name}
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {savedCount} saved item{savedCount === 1 ? "" : "s"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ledger.scopeState === "needs-confirmation" ? (
                <Button
                  type="button"
                  size="sm"
                  aria-label={`Yes, these all belong to one business — ${ledger.name}`}
                  disabled={busyId === ledger.id}
                  onClick={async () => {
                    setBusyId(ledger.id);
                    setError(null);
                    setSavedStatus(null);
                    try {
                      await onConfirm(ledger.id);
                      announceSaved(`Business check saved for ${ledger.name}.`);
                    } catch (caught) {
                      setError({
                        message:
                          "We couldn’t save this business check. Nothing was changed. Try again.",
                        technical: caught instanceof Error ? caught.message : undefined,
                      });
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Yes, these all belong to one business
                </Button>
              ) : (
                <>
                  <Badge variant="success">Business checked</Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Check this again — ${ledger.name}`}
                    disabled={busyId === ledger.id}
                    onClick={async () => {
                      setBusyId(ledger.id);
                      setError(null);
                      setSavedStatus(null);
                      try {
                        await onReopen(ledger.id);
                        announceSaved(`Another business check is ready for ${ledger.name}.`);
                      } catch (caught) {
                        setError({
                          message:
                            "We couldn’t reopen this business check. Nothing was changed. Try again.",
                          technical: caught instanceof Error ? caught.message : undefined,
                        });
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Check this again
                  </Button>
                </>
              )}
            </div>
            {ledger.scopeState === "needs-confirmation" ? (
              <details className="mt-2 text-sm text-ink-soft">
                <summary className="cursor-pointer">They cover more than one business</summary>
                <p className="mt-1">
                  Do not confirm yet. This version cannot split a combined set of records. Your
                  records stay saved, but totals and practice filing remain locked until they are
                  separated.
                </p>
              </details>
            ) : null}
          </li>
          );
        })}
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
      {label}: income recorded {gbpCompact(summary.income)} · costs recorded {gbpCompact(summary.expenses)}
    </Badge>
  );
}
