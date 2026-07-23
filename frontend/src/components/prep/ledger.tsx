"use client";

import { useState } from "react";
import { categoryByKey } from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { gbp } from "@/lib/format";
import type { AccountingEvent, LocalLedger } from "@/lib/local-books";
import type { ReviewEventInput } from "@/lib/records";

export interface LedgerProps {
  events: AccountingEvent[];
  ledgers: LocalLedger[];
  onReview: (id: string, input: ReviewEventInput) => Promise<unknown>;
  onExportJson: () => Promise<string>;
  onExportCsv: () => Promise<string>;
}

function downloadTextFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function Ledger({ events, ledgers, onReview, onExportJson, onExportCsv }: LedgerProps) {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const ledgerById = new Map(ledgers.map((ledger) => [ledger.id, ledger]));
  const ready = events.filter(
    (event) =>
      event.reviewState === "ready" && ledgerById.get(event.ledgerId)?.scopeState === "confirmed"
  );
  const waitingForScope = events.filter(
    (event) =>
      event.reviewState === "ready" && ledgerById.get(event.ledgerId)?.scopeState !== "confirmed"
  ).length;
  const excluded = events.filter((event) => event.reviewState === "excluded");

  const decide = async (
    event: AccountingEvent,
    reviewState: "needs-review" | "excluded"
  ) => {
    if (busyIds.has(event.id)) return;
    setActionError(null);
    setBusyIds((previous) => new Set(previous).add(event.id));
    try {
      await onReview(event.id, { expectedRevision: event.revision, reviewState });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "That change could not be saved.");
    } finally {
      setBusyIds((previous) => {
        const next = new Set(previous);
        next.delete(event.id);
        return next;
      });
    }
  };

  const exportFile = async (
    makeContent: () => Promise<string>,
    filename: string,
    mimeType: string
  ) => {
    if (exporting) return;
    setActionError(null);
    setExporting(true);
    try {
      downloadTextFile(await makeContent(), filename, mimeType);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The export could not be made.");
    } finally {
      setExporting(false);
    }
  };

  let totalIncome = 0;
  let totalExpense = 0;
  for (const event of ready) {
    for (const posting of event.postings) {
      const amount = posting.effect === "decrease" ? -posting.amount : posting.amount;
      if (posting.kind === "income") totalIncome += amount;
      else totalExpense += amount;
    }
  }
  const net = totalIncome - totalExpense;

  return (
    <section aria-labelledby="books-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="books-heading" className="text-xl font-semibold text-ink">Your books</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Ready records in a confirmed book count towards figures. Pending and left-out records
            stay in the full history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              exportFile(onExportJson, "taxsorted-full-history.json", "application/json")
            }
            disabled={events.length === 0 || exporting}
          >
            Full history JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportFile(onExportCsv, "taxsorted-books-v1.csv", "text/csv")}
            disabled={ready.length === 0 || exporting}
          >
            Books CSV
          </Button>
        </div>
      </div>

      <p className="text-sm text-ink-soft">
        Everything remains in this browser unless you export it. The CSV is a structured handoff;
        the JSON also preserves review and revision history.
      </p>

      {actionError ? (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </p>
      ) : null}

      {waitingForScope > 0 ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {waitingForScope} ready record{waitingForScope === 1 ? " is" : "s are"} waiting for you
          to confirm which separate business this book belongs to. It is not in figures or the
          Books CSV yet.
        </p>
      ) : null}

      {ready.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
          {waitingForScope > 0
            ? "No records are in figures yet — confirm the separate-business scope above first."
            : "No ready records yet — confirm an inbox item or add one manually."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-ink-soft">
              <tr>
                <th scope="col" className="p-3 font-medium">Date</th>
                <th scope="col" className="p-3 font-medium">Category</th>
                <th scope="col" className="p-3 font-medium">Description</th>
                <th scope="col" className="p-3 text-right font-medium">Cash</th>
                <th scope="col" className="p-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {ready.map((event) => {
                const ledger = ledgerById.get(event.ledgerId);
                const categories = ledger
                  ? event.postings.map((posting) => categoryByKey(posting.category, ledger.activity).label)
                  : event.postings.map((posting) => posting.category);
                return (
                  <tr key={event.id} className="border-t border-line align-top">
                    <td className="p-3">{event.occurredOn}</td>
                    <td className="p-3">{categories.join(" · ")}</td>
                    <td className="p-3">
                      {event.description || "—"}
                      <span className="mt-1 block text-xs text-ink-soft">
                        revision {event.revision} · {event.origin.kind}
                      </span>
                    </td>
                    <td className={`p-3 text-right ${event.cash.direction === "out" ? "text-red-700" : "text-ink"}`}>
                      {event.cash.direction === "out" ? "−" : "+"}{gbp(event.cash.amount)}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => decide(event, "excluded")}
                        disabled={busyIds.has(event.id)}
                        aria-label={`Leave out ${event.description || "record"} from ${event.occurredOn}`}
                      >
                        Leave out
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-gray-50 font-semibold">
                <td className="p-3" colSpan={3}>
                  Tax postings — income {gbp(totalIncome)}, expenses {gbp(totalExpense)}
                </td>
                <td className="p-3 text-right">{gbp(net)}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {excluded.length > 0 ? (
        <details className="rounded-2xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Left out, kept in history ({excluded.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {excluded.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2 text-sm">
                <span>
                  {event.occurredOn} · {event.description || "Record"} · {gbp(event.cash.amount)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => decide(event, "needs-review")}
                  disabled={busyIds.has(event.id)}
                >
                  Review again
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
