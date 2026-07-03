"use client";

// i18n: deferred to M2 — plain English for launch

import { useState } from "react";
import { categoryByKey, type LedgerRecord } from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { gbp } from "@/lib/format";

export interface LedgerProps {
  records: LedgerRecord[];
  onDelete: (id: string) => Promise<unknown>;
  onExportJson: () => Promise<string>;
  onExportCsv: () => Promise<string>;
}

/** The category's plain HMRC-field label, falling back to the raw key if it's somehow unrecognised. */
function categoryLabel(record: LedgerRecord): string {
  try {
    return categoryByKey(record.category, record.source).label;
  } catch {
    return record.category;
  }
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

/**
 * The ledger table: every record, a running total, and the two export
 * buttons. Deletion is one click with no confirmation dialog — records are
 * always re-addable and exportable first, so the stakes of a mistaken
 * delete are low — but each row tracks its own in-flight delete so a fast
 * double click can't fire the same removal twice.
 */
export function Ledger({ records, onDelete, onExportJson, onExportCsv }: LedgerProps) {
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(new Set());

  const handleDelete = async (id: string) => {
    if (deletingIds.has(id)) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await onDelete(id);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleExportJson = async () => {
    downloadTextFile(await onExportJson(), "taxsorted-records.json", "application/json");
  };

  const handleExportCsv = async () => {
    downloadTextFile(await onExportCsv(), "taxsorted-records.csv", "text/csv");
  };

  const totalIncome = records.filter((r) => r.kind === "income").reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = records.filter((r) => r.kind === "expense").reduce((sum, r) => sum + r.amount, 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">Your records never leave this browser.</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportJson}
            disabled={records.length === 0}
          >
            Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={records.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">
          No records yet — add your first income or expense above.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-ink-soft">
              <tr>
                <th scope="col" className="p-3 font-medium">
                  Date
                </th>
                <th scope="col" className="p-3 font-medium">
                  Category
                </th>
                <th scope="col" className="p-3 font-medium">
                  Description
                </th>
                <th scope="col" className="p-3 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="p-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="p-3">{r.date}</td>
                  <td className="p-3">{categoryLabel(r)}</td>
                  <td className="p-3">{r.description || "—"}</td>
                  <td className={`p-3 text-right ${r.kind === "expense" ? "text-red-700" : "text-ink"}`}>
                    {r.kind === "expense" ? "−" : ""}
                    {gbp(r.amount)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingIds.has(r.id)}
                      aria-label={`Delete record: ${categoryLabel(r)}, ${gbp(r.amount)} on ${r.date}`}
                      className="rounded-md px-2 py-1 text-ink-soft hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-gray-50 font-semibold">
                <td className="p-3" colSpan={3}>
                  Totals — income {gbp(totalIncome)}, expenses {gbp(totalExpense)}
                </td>
                <td className="p-3 text-right">{gbp(net)}</td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
