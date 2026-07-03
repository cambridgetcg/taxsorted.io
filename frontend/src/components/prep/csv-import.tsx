"use client";

// i18n: deferred to M2 — plain English for launch

import { useId, useMemo, useState } from "react";
import { categoriesFor, categoryByKey, type LedgerRecord, type SourceType } from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SOURCES } from "@/lib/sources";
import { parseCsv, guessMapping, toRecords, type CsvMapping, type CsvImportRow, type ParsedCsv } from "@/lib/csv-import";

export interface CsvImportProps {
  /** Adds every eligible row in one call — never one-by-one (see RecordsStore.addMany's mid-batch note). */
  onImport: (records: Omit<LedgerRecord, "id">[]) => Promise<unknown>;
}

const PREVIEW_ROWS = 10;

type Status = { kind: "idle" } | { kind: "success"; count: number } | { kind: "error"; message: string };

const EMPTY_MAPPING: CsvMapping = { date: "", amount: "" };

/**
 * A row is hard-invalid (never importable, no matter what the user does)
 * when its date or amount couldn't be understood — toRecords signals both
 * with a placeholder (amount 0 / date ""), which is also exactly what
 * RecordsStore.validate would reject. Everything else with a warning (the
 * mortgage-interest note, a DD/MM-vs-MM/DD ambiguity, an auto-adjusted
 * category) is a soft warning the user resolves in the decision list.
 */
function isHardInvalid(row: CsvImportRow): boolean {
  return row.record.amount <= 0 || row.record.date === "";
}

/**
 * File input → preview (first 10 rows) → column mapping → per-row category
 * review → one `onImport` call with every eligible row. Collapsed by
 * default; the whole flow stays client-side, same as the rest of this page.
 */
export function CsvImport({ onImport }: CsvImportProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>(EMPTY_MAPPING);
  const [source, setSource] = useState<SourceType>("self-employment");
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [includeOverrides, setIncludeOverrides] = useState<Record<number, boolean>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [importing, setImporting] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const fileInputId = useId();

  // Full parse, every time — RFC 4180 quoting can span lines, so there's no
  // cheap way to "only read the first 10 lines" without the same quote
  // tracking parseCsv already does. Parsing 10k rows of text is still
  // milliseconds; what would freeze the page is *rendering* 10k rows, which
  // `preview` below avoids by slicing after the parse, not before it.
  const rows: CsvImportRow[] = useMemo(() => {
    if (!parsed || !mapping.date || !mapping.amount) return [];
    return toRecords(parsed, mapping, source);
  }, [parsed, mapping, source]);

  const resolvedRows = useMemo(
    () =>
      rows.map((r, i) => {
        const override = categoryOverrides[i];
        if (!override) return r;
        // Belt and braces: an override that no longer matches the row's kind
        // (stale state from a mapping/source change the resets below missed)
        // must never reach addMany — the store rejects kind mismatches, and
        // one bad row would fail mid-batch. Fall back to the row's own guess.
        try {
          if (categoryByKey(override, source).kind !== r.record.kind) return r;
        } catch {
          return r;
        }
        return { ...r, record: { ...r.record, category: override } };
      }),
    [rows, categoryOverrides, source]
  );

  const eligibleIndexes = resolvedRows
    .map((_, i) => i)
    .filter((i) => {
      const r = resolvedRows[i];
      if (isHardInvalid(r)) return false;
      if (r.warning) return includeOverrides[i] === true;
      return true;
    });

  // Every soft-warned row — regardless of whether it made the 10-row
  // preview — gets its decision UI in the list below the preview, so a row
  // on line 4,000 of a bank export is exactly as includable as row 1.
  const decisionIndexes = resolvedRows
    .map((_, i) => i)
    .filter((i) => !isHardInvalid(resolvedRows[i]) && resolvedRows[i].warning);
  const hardInvalidCount = resolvedRows.filter(isHardInvalid).length;
  const unresolvedWarnedCount = decisionIndexes.filter((i) => includeOverrides[i] !== true).length;

  const resetFile = () => {
    setParsed(null);
    setMapping(EMPTY_MAPPING);
    setFileName(null);
    setCategoryOverrides({});
    setIncludeOverrides({});
  };

  // Remapping columns re-derives every row, so per-row decisions made under
  // the old mapping (category picks, include ticks) no longer refer to the
  // same data — drop them rather than let them land on different rows.
  const changeMapping = (patch: Partial<CsvMapping>) => {
    setMapping((m) => ({ ...m, ...patch }));
    setCategoryOverrides({});
    setIncludeOverrides({});
  };

  const handleFile = async (file: File) => {
    setReadError(null);
    setStatus({ kind: "idle" });
    setFileName(file.name);
    setCategoryOverrides({});
    setIncludeOverrides({});
    try {
      const text = await file.text();
      const p = parseCsv(text);
      setParsed(p);
      setMapping(guessMapping(p.headers) ?? EMPTY_MAPPING);
    } catch {
      setReadError("Could not read that file — is it a CSV export?");
      setParsed(null);
      setMapping(EMPTY_MAPPING);
    }
  };

  const handleImport = async () => {
    if (eligibleIndexes.length === 0) return;
    setImporting(true);
    setStatus({ kind: "idle" });
    try {
      const records = eligibleIndexes.map((i) => resolvedRows[i].record);
      await onImport(records);
      setStatus({ kind: "success", count: records.length });
      resetFile();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Import failed." });
    } finally {
      setImporting(false);
    }
  };

  const categories = categoriesFor(source);
  const headers = parsed?.headers ?? [];
  const previewCount = Math.min(resolvedRows.length, PREVIEW_ROWS);

  return (
    <details className="rounded-2xl border border-line p-4 sm:p-5">
      <summary className="cursor-pointer select-none text-sm font-semibold text-ink">Import CSV</summary>

      <div className="mt-4 space-y-4">
        <p className="text-sm text-ink-soft">
          Bring in a bank or bookkeeping export. Categories below are guessed from each
          description — check them before importing. Importing the same file twice adds the rows
          twice, so only import a file once.
        </p>

        <div className="space-y-1.5">
          <label htmlFor={fileInputId} className="text-sm font-medium text-ink">
            CSV file
          </label>
          <input
            id={fileInputId}
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink"
          />
          {fileName ? <p className="text-xs text-ink-soft">Selected: {fileName}</p> : null}
          {readError ? <p className="text-sm text-red-600">{readError}</p> : null}
        </div>

        {parsed ? (
          resolvedRows.length === 0 && headers.length > 0 && mapping.date && mapping.amount ? (
            <p className="text-sm text-ink-soft">
              That file has a header row but no data rows — nothing to import.
            </p>
          ) : (
            <>
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium text-ink">Source</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="Source">
                  {SOURCES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      role="radio"
                      aria-checked={source === s.value}
                      title={s.plain}
                      onClick={() => {
                        setSource(s.value);
                        setCategoryOverrides({});
                        setIncludeOverrides({});
                      }}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                        source === s.value
                          ? "border-accent bg-accent text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-3 sm:grid-cols-3">
                <MappingSelect
                  label="Date column"
                  headers={headers}
                  value={mapping.date}
                  onChange={(value) => changeMapping({ date: value })}
                />
                <MappingSelect
                  label="Amount column"
                  headers={headers}
                  value={mapping.amount}
                  onChange={(value) => changeMapping({ amount: value })}
                />
                <MappingSelect
                  label="Description column (optional)"
                  headers={headers}
                  value={mapping.description ?? ""}
                  onChange={(value) => changeMapping({ description: value || undefined })}
                />
              </div>

              {mapping.date && mapping.amount ? (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-line">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-ink-soft">
                        <tr>
                          <th scope="col" className="p-2 font-medium">Date</th>
                          <th scope="col" className="p-2 font-medium">Description</th>
                          <th scope="col" className="p-2 text-right font-medium">Amount</th>
                          <th scope="col" className="p-2 font-medium">Category</th>
                          <th scope="col" className="p-2 font-medium">Warning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resolvedRows.slice(0, PREVIEW_ROWS).map((r, i) => {
                          const hardInvalid = isHardInvalid(r);
                          return (
                            <tr key={i} className="border-t border-line align-top">
                              <td className="p-2">{r.record.date || "—"}</td>
                              <td className="p-2">{r.record.description ?? "—"}</td>
                              <td className="p-2 text-right">
                                {r.record.kind === "expense" ? "−" : ""}
                                {(r.record.amount / 100).toFixed(2)}
                              </td>
                              <td className="p-2">
                                <RowCategorySelect
                                  row={r}
                                  categories={categories}
                                  onChange={(value) =>
                                    setCategoryOverrides((prev) => ({ ...prev, [i]: value }))
                                  }
                                />
                              </td>
                              <td className="p-2 text-ink-soft">
                                {r.warning ? (
                                  hardInvalid ? (
                                    <span className="text-red-700">{r.warning} — can&apos;t be imported</span>
                                  ) : (
                                    <span>{r.warning} — decide below</span>
                                  )
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {resolvedRows.length > PREVIEW_ROWS ? (
                    <p className="text-xs text-ink-soft">
                      Showing the first {previewCount} of {resolvedRows.length} rows — every valid
                      row is imported, not just the ones shown here.
                    </p>
                  ) : null}

                  {decisionIndexes.length > 0 ? (
                    <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 sm:p-4">
                      <p className="text-sm font-semibold text-ink">
                        Needs your decision ({decisionIndexes.length})
                      </p>
                      <p className="text-xs text-ink-soft">
                        These rows parsed, but each carries a warning. A row stays out of the
                        import until you tick &quot;include&quot; here — every warned row in the
                        file is listed, not just the previewed ones.
                      </p>
                      <ul className="space-y-2">
                        {decisionIndexes.map((i) => {
                          const r = resolvedRows[i];
                          return (
                            <li
                              key={i}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-amber-200 pt-2 text-sm"
                            >
                              <span className="text-xs text-ink-soft">Row {i + 1}</span>
                              <span>{r.record.date}</span>
                              <span className="max-w-56 truncate" title={r.record.description}>
                                {r.record.description ?? "—"}
                              </span>
                              <span>
                                {r.record.kind === "expense" ? "−" : ""}
                                {(r.record.amount / 100).toFixed(2)}
                              </span>
                              <RowCategorySelect
                                row={r}
                                categories={categories}
                                onChange={(value) =>
                                  setCategoryOverrides((prev) => ({ ...prev, [i]: value }))
                                }
                              />
                              <span className="basis-full text-xs text-amber-800">{r.warning}</span>
                              <label className="flex items-center gap-1.5 text-xs font-medium text-ink">
                                <input
                                  type="checkbox"
                                  checked={includeOverrides[i] === true}
                                  onChange={(e) =>
                                    setIncludeOverrides((prev) => ({ ...prev, [i]: e.target.checked }))
                                  }
                                />
                                include this row
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleImport}
                      disabled={importing || eligibleIndexes.length === 0}
                    >
                      {importing
                        ? "Importing…"
                        : `Import ${eligibleIndexes.length} record${eligibleIndexes.length === 1 ? "" : "s"}`}
                    </Button>
                    {hardInvalidCount > 0 || unresolvedWarnedCount > 0 ? (
                      <span className="text-sm text-ink-soft">
                        {hardInvalidCount > 0
                          ? `${hardInvalidCount} row${hardInvalidCount === 1 ? "" : "s"} can't be imported (bad date or amount)`
                          : null}
                        {hardInvalidCount > 0 && unresolvedWarnedCount > 0 ? "; " : null}
                        {unresolvedWarnedCount > 0
                          ? `${unresolvedWarnedCount} warned row${unresolvedWarnedCount === 1 ? "" : "s"} excluded until ticked in the decision list above`
                          : null}
                        .
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-red-600">
                  Choose a date column and an amount column before importing.
                </p>
              )}
            </>
          )
        ) : null}

        {status.kind === "success" ? (
          <p className="text-sm text-green-700">
            Imported {status.count} record{status.count === 1 ? "" : "s"}.
          </p>
        ) : null}
        {status.kind === "error" ? <p className="text-sm text-red-600">{status.message}</p> : null}
      </div>
    </details>
  );
}

/**
 * Per-row category select. Options are filtered to the row's own kind
 * (mirrors record-form.tsx's guard) so a `kind`/`category` mismatch is
 * impossible to pick — the store would reject it, and it would corrupt
 * quarterly aggregation if it ever got through.
 */
function RowCategorySelect({
  row,
  categories,
  onChange,
}: {
  row: CsvImportRow;
  categories: ReturnType<typeof categoriesFor>;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={row.record.category}
      aria-label="Category"
      title={row.guessed ? "Guessed from the description — check it" : undefined}
      className={cn(
        "h-8 rounded-md border bg-white px-2 text-sm",
        row.guessed ? "border-accent bg-accent-soft" : "border-input"
      )}
      onChange={(e) => onChange(e.target.value)}
    >
      {categories
        .filter((c) => c.kind === row.record.kind)
        .map((c) => (
          <option key={c.key} value={c.key} title={c.plain}>
            {c.label}
          </option>
        ))}
    </select>
  );
}

function MappingSelect({
  label,
  headers,
  value,
  onChange,
}: {
  label: string;
  headers: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        <option value="">— choose —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  );
}
