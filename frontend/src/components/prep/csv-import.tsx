"use client";

// i18n: deferred to M2 — plain English for launch

import { useId, useMemo, useRef, useState } from "react";
import { categoryByKey, type SourceType } from "@taxsorted/engine/uk/itsa";
import { Button } from "@/components/ui/button";
import { SOURCES } from "@/lib/sources";
import { PillRadioGroup } from "@/components/prep/pill-radio-group";
import {
  csvImportId,
  parseCsv,
  guessMapping,
  isDebitOrCreditColumn,
  SEPARATE_DEBIT_CREDIT_ERROR,
  toRecords,
  type CsvMapping,
  type CsvImportRow,
  type ParsedCsv,
} from "@/lib/csv-import";
import type { ImportRecordsResult } from "@/lib/records";
import type { ImportCandidate } from "@/lib/local-books";

export interface CsvImportProps {
  /** Stages every eligible row in one atomic import for the Money Inbox. */
  onImport: (records: ImportCandidate[]) => Promise<ImportRecordsResult>;
}

const PREVIEW_ROWS = 10;
const MAX_IMPORT_ROWS = 10_000;
const WARNING_PAGE_SIZE = 20;

type Status =
  | { kind: "idle" }
  | { kind: "success"; count: number; duplicateCount: number; conflictCount: number }
  | { kind: "error"; message: string };

const EMPTY_MAPPING: CsvMapping = { date: "", amount: "" };

/**
 * A row is hard-invalid (never importable, no matter what the user does)
 * when its date or amount couldn't be understood — toRecords signals both
 * with a placeholder (amount 0 / date ""), which is also exactly what
 * RecordsStore.validate would reject. Everything else with a warning (the
 * mortgage-interest note, a DD/MM-vs-MM/DD ambiguity, an auto-adjusted
 * category) is a soft warning carried into the Money Inbox.
 */
function isHardInvalid(row: CsvImportRow): boolean {
  return row.record.amount <= 0 || row.record.date === "";
}

/**
 * File input → preview (first 10 rows) → column mapping → one atomic staging
 * call with every eligible row. Category decisions happen in Money Inbox.
 * default; the whole flow stays client-side, same as the rest of this page.
 */
export function CsvImport({ onImport }: CsvImportProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [importId, setImportId] = useState<string | null>(null);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>(EMPTY_MAPPING);
  const [source, setSource] = useState<SourceType | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [importing, setImporting] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [warningPage, setWarningPage] = useState(0);
  const fileRequest = useRef(0);

  const fileInputId = useId();

  // Full parse, every time — RFC 4180 quoting can span lines, so there's no
  // cheap way to "only read the first 10 lines" without the same quote
  // tracking parseCsv already does. Parsing 10k rows of text is still
  // milliseconds; what would freeze the page is *rendering* 10k rows, which
  // `preview` below avoids by slicing after the parse, not before it.
  const rows: CsvImportRow[] = useMemo(() => {
    if (!parsed || !mapping.date || !mapping.amount || !source) return [];
    return toRecords(
      parsed,
      mapping,
      source,
      importId && fileName ? { importId, fileName } : undefined
    );
  }, [parsed, mapping, source, importId, fileName]);

  const resolvedRows = rows;

  const eligibleIndexes = resolvedRows
    .map((_, i) => i)
    .filter((i) => {
      const r = resolvedRows[i];
      if (isHardInvalid(r)) return false;
      if (!r.importDetails) return false;
      return true;
    });

  // Every soft warning follows its row into Money Inbox. The import screen
  // surfaces all of them, but this is not a second approval gate.
  const warningIndexes = resolvedRows
    .map((_, i) => i)
    .filter((i) => !isHardInvalid(resolvedRows[i]) && resolvedRows[i].warning);
  const hardInvalidCount = resolvedRows.filter(isHardInvalid).length;
  const tooManyRows = resolvedRows.length > MAX_IMPORT_ROWS;
  const amountColumnUnsupported = isDebitOrCreditColumn(mapping.amount);
  const warningPageCount = Math.max(1, Math.ceil(warningIndexes.length / WARNING_PAGE_SIZE));
  const currentWarningPage = Math.min(warningPage, warningPageCount - 1);
  const firstWarning = currentWarningPage * WARNING_PAGE_SIZE;
  const visibleWarningIndexes = warningIndexes.slice(firstWarning, firstWarning + WARNING_PAGE_SIZE);

  const resetFile = () => {
    fileRequest.current += 1;
    setParsed(null);
    setMapping(EMPTY_MAPPING);
    setFileName(null);
    setImportId(null);
    setSource(null);
    setWarningPage(0);
    setFileInputVersion((value) => value + 1);
  };

  // Remapping columns re-derives every staged row.
  const changeMapping = (patch: Partial<CsvMapping>) => {
    setMapping((m) => ({ ...m, ...patch }));
    setWarningPage(0);
  };

  const handleFile = async (file: File) => {
    const request = ++fileRequest.current;
    setReadError(null);
    setStatus({ kind: "idle" });
    setFileName(file.name);
    // Never pair the new file name with facts from the previous file while
    // this read/hash is still in flight.
    setParsed(null);
    setImportId(null);
    setMapping(EMPTY_MAPPING);
    setSource(null);
    setWarningPage(0);
    try {
      const text = await file.text();
      if (request !== fileRequest.current) return;
      const p = parseCsv(text);
      const id = await csvImportId(text);
      if (request !== fileRequest.current) return;
      setParsed(p);
      setImportId(id);
      setMapping(guessMapping(p.headers) ?? EMPTY_MAPPING);
    } catch {
      if (request !== fileRequest.current) return;
      setReadError("Could not read that file — is it a CSV export?");
      setParsed(null);
      setImportId(null);
      setMapping(EMPTY_MAPPING);
    }
  };

  const handleImport = async () => {
    if (eligibleIndexes.length === 0 || tooManyRows) return;
    setImporting(true);
    setStatus({ kind: "idle" });
    try {
      const records = eligibleIndexes.map((i) => ({
        record: resolvedRows[i].record,
        ...resolvedRows[i].importDetails!,
      }));
      const result = await onImport(records);
      setStatus({
        kind: "success",
        count: result.added.length,
        duplicateCount: result.duplicateCount,
        conflictCount: result.conflicts.length,
      });
      resetFile();
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Import failed." });
    } finally {
      setImporting(false);
    }
  };

  const headers = parsed?.headers ?? [];
  const previewCount = Math.min(resolvedRows.length, PREVIEW_ROWS);

  return (
    <details className="rounded-2xl border border-line p-4 sm:p-5">
      <summary className="cursor-pointer select-none text-sm font-semibold text-ink">Bring in a CSV</summary>

      <div className="mt-4 space-y-4">
        <p className="text-sm text-ink-soft">
          Bring in a bank or bookkeeping export. Categories are suggestions, not decisions. Valid
          rows go to your Money Inbox first and do not affect any figure until you confirm them.
          An exact repeat of the same file is recognised and skipped.
        </p>
        <p className="text-sm text-ink-soft">
          Use one signed amount column: positive amounts mean money in and negative amounts mean
          money out. Files with separate Debit and Credit columns are not supported yet.
        </p>

        <div className="space-y-1.5">
          <label htmlFor={fileInputId} className="text-sm font-medium text-ink">
            CSV file
          </label>
          <input
            key={fileInputVersion}
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
          {readError ? <p role="alert" className="text-sm text-red-600">{readError}</p> : null}
        </div>

        {parsed ? (
          parsed.rows.length === 0 && headers.length > 0 && mapping.date && mapping.amount ? (
            <p className="text-sm text-ink-soft">
              That file has a header row but no data rows — nothing to import.
            </p>
          ) : (
            <>
              <PillRadioGroup
                label="Which activity do these rows belong to?"
                options={SOURCES.map((item) => ({
                  value: item.value,
                  label: item.label,
                  title: item.plain,
                }))}
                value={source}
                onChange={(value) => {
                  setSource(value);
                  setWarningPage(0);
                }}
              />

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

              {amountColumnUnsupported ? (
                <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  {SEPARATE_DEBIT_CREDIT_ERROR}
                </p>
              ) : mapping.date && mapping.amount && source ? (
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
                                <span className="font-medium text-ink">
                                  {categoryByKey(r.record.category, source).label}
                                </span>
                                <span className="block text-xs text-ink-soft">Suggestion only</span>
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

                  {tooManyRows ? (
                    <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                      This file has {resolvedRows.length.toLocaleString()} rows. Split it into files
                      of {MAX_IMPORT_ROWS.toLocaleString()} rows or fewer so the browser stays responsive.
                    </p>
                  ) : null}

                  {warningIndexes.length > 0 ? (
                    <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 sm:p-4">
                      <p className="text-sm font-semibold text-ink">
                        Warnings going to Money Inbox ({warningIndexes.length})
                      </p>
                      <p className="text-xs text-ink-soft">
                        These rows parsed, but each needs extra attention. They are staged, not
                        counted, and the warning remains beside the row until you review it.
                      </p>
                      <ul className="space-y-2">
                        {visibleWarningIndexes.map((i) => {
                          const r = resolvedRows[i];
                          return (
                            <li
                              key={i}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-amber-200 pt-2 text-sm"
                            >
                              <span className="text-xs text-ink-soft">Row {i + 2}</span>
                              <span>{r.record.date}</span>
                              <span className="max-w-56 truncate" title={r.record.description}>
                                {r.record.description ?? "—"}
                              </span>
                              <span>
                                {r.record.kind === "expense" ? "−" : ""}
                                {(r.record.amount / 100).toFixed(2)}
                              </span>
                              <span className="basis-full text-xs text-amber-800">{r.warning}</span>
                            </li>
                          );
                        })}
                      </ul>
                      {warningIndexes.length > WARNING_PAGE_SIZE ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 pt-3">
                          <p className="text-xs text-ink-soft">
                            Showing warnings {firstWarning + 1}–
                            {Math.min(firstWarning + WARNING_PAGE_SIZE, warningIndexes.length)} of{
                              " "
                            }
                            {warningIndexes.length}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={currentWarningPage === 0}
                              onClick={() => setWarningPage((page) => Math.max(0, page - 1))}
                            >
                              Previous warnings
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={currentWarningPage >= warningPageCount - 1}
                              onClick={() =>
                                setWarningPage((page) => Math.min(warningPageCount - 1, page + 1))
                              }
                            >
                              Next warnings
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleImport}
                      disabled={importing || eligibleIndexes.length === 0 || tooManyRows}
                    >
                      {importing
                        ? "Adding to inbox…"
                        : `Add ${eligibleIndexes.length} to Money Inbox`}
                    </Button>
                    {hardInvalidCount > 0 ? (
                      <span className="text-sm text-ink-soft">
                        {hardInvalidCount} row{hardInvalidCount === 1 ? "" : "s"} can&apos;t be
                        staged because the date or amount could not be read.
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-sm text-red-600">
                  {!mapping.date || !mapping.amount
                    ? "Choose a date column and a signed amount column before importing."
                    : "Choose which activity these rows belong to before importing."}
                </p>
              )}
            </>
          )
        ) : null}

        {status.kind === "success" ? (
          <p className="text-sm text-green-700" aria-live="polite">
            Added {status.count} record{status.count === 1 ? "" : "s"} to your Money Inbox.
            {status.duplicateCount > 0
              ? ` Skipped ${status.duplicateCount} exact duplicate${status.duplicateCount === 1 ? "" : "s"}.`
              : ""}
            {status.conflictCount > 0
              ? ` Held back ${status.conflictCount} changed source item${status.conflictCount === 1 ? "" : "s"} for safety.`
              : ""}
          </p>
        ) : null}
        {status.kind === "error" ? <p role="alert" className="text-sm text-red-600">{status.message}</p> : null}
      </div>
    </details>
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
