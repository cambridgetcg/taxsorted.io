"use client";

import { useEffect, useRef, useState } from "react";
import { categoryByKey } from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { ActionError } from "@/components/ui/action-error";
import { formatUkDate, gbp } from "@/lib/format";
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

function plainSource(event: AccountingEvent): string {
  const { origin } = event;

  if (origin.kind === "manual") return "Added by hand";
  if (origin.kind === "bank-csv") {
    const file = origin.label ? ` ${origin.label}` : " a CSV file";
    const row = origin.row ? `, row ${origin.row}` : "";
    return `Imported from${file}${row}`;
  }
  if (origin.kind === "cambridge-tcg") {
    return origin.label ? `Imported from ${origin.label}` : "Imported from Cambridge TCG";
  }
  if (origin.kind === "legacy") return "Brought forward from earlier TaxSorted records";

  if (origin.label) return `Imported from ${origin.label}`;
  switch (origin.provider?.provider) {
    case "xero":
      return "Imported from Xero";
    case "quickbooks":
      return "Imported from QuickBooks";
    case "freeagent":
      return "Imported from FreeAgent";
    case "sage-accounting-uk":
      return "Imported from Sage Accounting";
    case "synthetic":
      return "Imported from the made-up accounting connection";
    default:
      return "Imported from a connected accounting app";
  }
}

export function Ledger({ events, ledgers, onReview, onExportJson, onExportCsv }: LedgerProps) {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [actionError, setActionError] = useState<{
    message: string;
    technical?: string;
  } | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const actionStatusRef = useRef<HTMLParagraphElement>(null);
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

  useEffect(() => {
    if (actionStatus) actionStatusRef.current?.focus();
  }, [actionStatus]);

  const decide = async (
    event: AccountingEvent,
    reviewState: "needs-review" | "excluded"
  ) => {
    if (busyIds.has(event.id)) return;
    setActionError(null);
    setActionStatus(null);
    setBusyIds((previous) => new Set(previous).add(event.id));
    try {
      await onReview(event.id, { expectedRevision: event.revision, reviewState });
      const record = event.description || "this record";
      const date = formatUkDate(event.occurredOn);
      setActionStatus(
        reviewState === "excluded"
          ? `Stopped counting ${record} from ${date}. It is still kept in your complete history.`
          : `Moved ${record} from ${date} back to To check.`
      );
    } catch (error) {
      setActionError({
        message: "We couldn’t change this record. Nothing was changed. Try again.",
        ...(error instanceof Error && error.message ? { technical: error.message } : {}),
      });
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
      setActionError({
        message: "We couldn’t make this download. Your records were not changed. Try again.",
        ...(error instanceof Error && error.message ? { technical: error.message } : {}),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <section aria-labelledby="books-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="books-heading" className="text-xl font-semibold text-ink">Checked records and backup</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Only items you confirmed inside a confirmed business count in totals. Waiting and
            left-out items stay in the complete history.
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
            Download complete history (.json)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportFile(onExportCsv, "taxsorted-books-v1.csv", "text/csv")}
            disabled={ready.length === 0 || exporting}
          >
            Download checked records (.csv)
          </Button>
        </div>
      </div>

      <p className="text-sm text-ink-soft">
        Your records stay in this browser. Download a copy before clearing site data or changing
        browser. The CSV opens in spreadsheets; the JSON also keeps suggestions, decisions and
        revision history.
      </p>

      {actionError ? (
        <ActionError message={actionError.message} technical={actionError.technical} />
      ) : null}

      {actionStatus ? (
        <p
          ref={actionStatusRef}
          role="status"
          tabIndex={-1}
          className="rounded-xl border border-green-300 bg-green-50 p-3 text-sm text-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {actionStatus}
        </p>
      ) : null}

      {waitingForScope > 0 ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {waitingForScope} checked item{waitingForScope === 1 ? " is" : "s are"} waiting for you
          to finish a business-group check. Confirm that each group contains records for one
          separate business. {waitingForScope === 1 ? "It is" : "They are"} not in totals or the
          records CSV yet.
        </p>
      ) : null}

      {ready.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
          {waitingForScope > 0
            ? "Your items are checked, but they do not count yet. Confirm that each group contains records for one business first."
            : "No checked records yet. Review an item in To check."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-ink-soft">
              <tr>
                <th scope="col" className="p-3 font-medium">Date</th>
                <th scope="col" className="p-3 font-medium">Business</th>
                <th scope="col" className="p-3 font-medium">What it was for</th>
                <th scope="col" className="p-3 font-medium">Your note and source</th>
                <th scope="col" className="p-3 text-right font-medium">Money movement</th>
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
                    <td className="p-3">{formatUkDate(event.occurredOn)}</td>
                    <td className="p-3">{ledger?.name ?? "Unknown business"}</td>
                    <td className="p-3">{categories.join(" · ")}</td>
                    <td className="p-3">
                      {event.description || "—"}
                      <span className="mt-1 block text-xs text-ink-soft">
                        {plainSource(event)}
                      </span>
                      <details className="mt-1 text-xs text-ink-soft">
                        <summary className="cursor-pointer">Record details</summary>
                        <p className="mt-1">Saved version {event.revision}.</p>
                      </details>
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
                        aria-label={`Stop counting ${event.description || "record"} from ${formatUkDate(event.occurredOn)}; keep it in history`}
                      >
                        Stop counting
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {excluded.length > 0 ? (
        <details className="rounded-2xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">
            Not counted, kept in history ({excluded.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {excluded.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2 text-sm">
                <span>
                  {formatUkDate(event.occurredOn)} · {event.description || "Record"} · {gbp(event.cash.amount)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => decide(event, "needs-review")}
                  disabled={busyIds.has(event.id)}
                >
                  Check again
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
