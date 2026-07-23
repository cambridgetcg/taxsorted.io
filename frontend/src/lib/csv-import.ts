// i18n: deferred to M2 — plain English for launch

import { categoryByKey, type NewLedgerRecord, type SourceType } from "@taxsorted/engine/uk/itsa";
import type { ImportCandidate } from "@/lib/local-books";

/** Header names in the user's file that map onto a LedgerRecord's fields. */
export interface CsvMapping {
  date: string;
  amount: string;
  description?: string;
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * A content fingerprint gives every row in one file a stable source ID. The
 * same file, even with a different file name, can then be recognised before
 * it creates duplicate records. This is identity, not a security signature.
 */
export async function csvImportId(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Hand-rolled RFC 4180 parser: quoted fields, doubled-quote escaping,
 * commas/newlines embedded inside quotes, and both \n and \r\n line endings.
 * No external CSV dependency — the grammar is small enough to keep in one
 * pass. A leading UTF-8 BOM (Excel's default CSV export) is stripped first
 * so it never ends up glued onto the first header name.
 */
export function parseCsv(text: string): ParsedCsv {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // A fully-blank line (one empty field) is spacing, not data — skip it
    // wherever it appears, mid-file or trailing, so it never becomes a
    // phantom "unrecognised date" row. Real files here always have >= 2
    // columns (date + amount), so a one-empty-field row can't be data.
    if (row.length === 1 && row[0] === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\r") {
      if (src[i + 1] === "\n") i++;
      endRow();
    } else if (c === "\n") {
      endRow();
    } else {
      field += c;
    }
  }
  // Flush a final field/row that wasn't newline-terminated.
  if (field !== "" || row.length > 0) endRow();

  const [headers, ...dataRows] = rows;
  return { headers: headers ?? [], rows: dataRows };
}

const DATE_HEADER_HINTS = ["date"];
// Debit and Credit are deliberately absent. They are separate sides of a
// bank export, not one signed amount column, and guessing either one would
// silently reverse or omit money.
const AMOUNT_HEADER_HINTS = ["amount", "value", "total"];
const DESCRIPTION_HEADER_HINTS = ["description", "narrative", "details", "memo", "payee", "reference"];

export const SEPARATE_DEBIT_CREDIT_ERROR =
  "Separate Debit and Credit columns are not supported yet. Choose one signed amount column: positive means money in and negative means money out.";

/** True when a chosen header names one side of a Debit/Credit pair. */
export function isDebitOrCreditColumn(header: string): boolean {
  const words = header.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  return words.includes("debit") || words.includes("credit");
}

function findHeader(headers: string[], hints: string[]): string | undefined {
  return headers.find((h) => hints.some((hint) => h.toLowerCase().includes(hint)));
}

/** Best-effort column mapping from header names alone; null if date or amount can't be found. */
export function guessMapping(headers: string[]): CsvMapping | null {
  const date = findHeader(headers, DATE_HEADER_HINTS);
  const amount = findHeader(headers, AMOUNT_HEADER_HINTS);
  if (!date || !amount) return null;
  const description = findHeader(headers, DESCRIPTION_HEADER_HINTS);
  return description ? { date, amount, description } : { date, amount };
}

// Keyword -> category rules read top to bottom, first match wins. `null`
// means "this rule doesn't apply to that source" (its category doesn't
// exist there), not "no match" — suggestCategory skips straight past it.
interface CategoryRule {
  keywords: string[];
  se: string | null;
  property: string | null;
}

const CATEGORY_RULES: CategoryRule[] = [
  { keywords: ["petrol", "fuel", "parking", "train"], se: "carVanTravelExpenses", property: null },
  { keywords: ["rent", "rates", "electric", "insurance"], se: "premisesRunningCosts", property: "premisesRunningCosts" },
  { keywords: ["phone", "mobile", "broadband", "stationery"], se: "adminCosts", property: null },
  { keywords: ["wages", "salary"], se: "wagesAndStaffCosts", property: null },
  { keywords: ["interest"], se: "interestOnBankOtherLoans", property: null },
  { keywords: ["bank charge", "fee"], se: "financeCharges", property: null },
  { keywords: ["accountant", "solicitor"], se: "professionalFees", property: "professionalFees" },
  { keywords: ["advert", "ads"], se: "advertisingCosts", property: null },
  { keywords: ["repair"], se: "maintenanceCosts", property: "repairsAndMaintenance" },
  { keywords: ["agent", "management"], se: null, property: "professionalFees" },
  { keywords: ["mortgage"], se: null, property: "residentialFinancialCost" },
];

const DEFAULT_EXPENSE: Record<SourceType, string> = {
  "self-employment": "otherExpenses",
  "uk-property": "other",
};
const DEFAULT_INCOME: Record<SourceType, string> = {
  "self-employment": "turnover",
  "uk-property": "periodAmount",
};

export const MORTGAGE_INTEREST_WARNING =
  "check: residential mortgage interest gets a 20% credit, not an expense deduction";

/**
 * Keyword -> category key, from a bank description alone. Only ever returns
 * expense-flavoured keys (or the source's blind default, otherExpenses/
 * other) — it has no idea whether the row is income or expense. toRecords is
 * the one place that knows a row's direction; it bumps an unmatched income
 * row up to the income default (turnover/periodAmount) itself.
 */
export function suggestCategory(description: string, source: SourceType): string {
  return categorySuggestion(description, source).category;
}

export interface CategorySuggestion {
  category: string;
  basis: string;
  limitation: string;
}

export function categorySuggestion(description: string, source: SourceType): CategorySuggestion {
  const d = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    const target = source === "self-employment" ? rule.se : rule.property;
    if (!target) continue;
    const keyword = rule.keywords.find((candidate) => d.includes(candidate));
    if (keyword) {
      return {
        category: target,
        basis: `The bank description contains “${keyword}”, which often points to this category.`,
        limitation: "A bank description cannot prove the business purpose or tax treatment.",
      };
    }
  }
  return {
    category: DEFAULT_EXPENSE[source],
    basis: "No clear category word was found, so TaxSorted used the broad expense category.",
    limitation: "This is a starting point only. Check what the payment was actually for.",
  };
}

interface DateResult {
  iso: string;
  error?: string;
  /** Soft warning: the date parsed, but a US MM/DD reading was also possible. */
  ambiguity?: string;
}

/** dd/mm/yyyy, dd-mm-yyyy and yyyy-mm-dd only; anything else (or an impossible date) errors, never throws. */
function parseDate(raw: string): DateResult {
  const s = raw.trim();
  let y: number, mo: number, d: number;
  let dayMonthOrder = false;

  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    y = Number(m[1]);
    mo = Number(m[2]);
    d = Number(m[3]);
  } else {
    m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
    if (!m) return { iso: "", error: `unrecognised date: "${raw}"` };
    d = Number(m[1]);
    mo = Number(m[2]);
    y = Number(m[3]);
    dayMonthOrder = true;
  }

  if (mo < 1 || mo > 12 || d < 1 || d > 31) return { iso: "", error: `invalid date: "${raw}"` };

  // Round-trip through Date to reject impossible day/month combinations
  // (31 April, 30 February, ...) that pass the range check above.
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return { iso: "", error: `invalid date: "${raw}"` };
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${y}-${pad(mo)}-${pad(d)}`;

  // A dd/mm date whose day could also be a month (and isn't the same number
  // as the month) reads differently in a US MM/DD file — surface it as a
  // soft, user-resolvable warning rather than silently trusting DD/MM.
  if (dayMonthOrder && d <= 12 && d !== mo) {
    return {
      iso,
      ambiguity: `read as DD/MM (${iso}) — if this file is US-format MM/DD, fix the dates before importing`,
    };
  }

  return { iso };
}

interface AmountResult {
  pence: number;
  kind: "income" | "expense";
  zero: boolean;
  error?: string;
}

/** Sign decides kind (negative -> expense); sanitized like parsePounds (£, commas, spaces stripped). */
function parseAmount(raw: string): AmountResult {
  const trimmed = raw.trim();
  const sanitized = trimmed.replace(/[£,\s]/g, "");
  const n = Number(sanitized);
  if (trimmed === "" || sanitized === "" || !Number.isFinite(n)) {
    return { pence: 0, kind: "expense", zero: false, error: `invalid amount: "${raw}"` };
  }
  if (n === 0) return { pence: 0, kind: "expense", zero: true };
  return { pence: Math.round(Math.abs(n) * 100), kind: n < 0 ? "expense" : "income", zero: false };
}

export interface CsvImportRow {
  record: NewLedgerRecord;
  importDetails?: Omit<ImportCandidate, "record">;
  guessed: boolean;
  warning?: string;
}

export interface CsvImportContext {
  importId: string;
  fileName: string;
}

/**
 * Turns parsed CSV rows into ledger records, one per row, in row order.
 * Never throws: a row that can't be understood comes back with `warning`
 * set and `record.amount === 0` (which RecordsStore.validate would reject),
 * so a caller that only imports warning-free rows can never smuggle a
 * broken one through to addMany.
 *
 * Every category here is a guess (there's no category column in the file to
 * map), so `guessed` is always true — it exists so the UI can flag every
 * pre-filled category select for the user to check.
 */
export function toRecords(
  parsed: ParsedCsv,
  mapping: CsvMapping,
  source: SourceType,
  context?: CsvImportContext
): CsvImportRow[] {
  const { headers, rows } = parsed;
  const dateIdx = headers.indexOf(mapping.date);
  const amountIdx = headers.indexOf(mapping.amount);
  const descIdx = mapping.description ? headers.indexOf(mapping.description) : -1;
  const unsupportedAmountColumn = isDebitOrCreditColumn(mapping.amount);

  return rows.map((row, index) => {
    const rawDate = row[dateIdx] ?? "";
    const rawAmount = row[amountIdx] ?? "";
    const description = descIdx >= 0 ? row[descIdx] ?? "" : "";

    const dateResult = parseDate(rawDate);
    const amountResult: AmountResult = unsupportedAmountColumn
      ? {
          pence: 0,
          kind: "expense",
          zero: false,
          error: SEPARATE_DEBIT_CREDIT_ERROR,
        }
      : parseAmount(rawAmount);

    const warnings: string[] = [];
    if (dateResult.error) warnings.push(dateResult.error);
    else if (dateResult.ambiguity) warnings.push(dateResult.ambiguity);
    if (amountResult.error) warnings.push(amountResult.error);
    else if (amountResult.zero) warnings.push("zero amount — nothing to import");

    const kind = amountResult.kind;
    const suggestion = categorySuggestion(description, source);
    const suggested = suggestion.category;
    let suggestionBasis = suggestion.basis;
    let category = suggested;
    // Guard against a description keyword suggesting a category of the
    // wrong direction (e.g. an income row whose text happens to contain
    // "rent") — fall back to the source's kind-appropriate default instead.
    if (categoryByKey(category, source).kind !== kind) {
      category = kind === "income" ? DEFAULT_INCOME[source] : DEFAULT_EXPENSE[source];
      // Only flag rows where a keyword actually matched and then had to be
      // overruled — a no-keyword income row landing on the income default is
      // just normal defaulting, and warning every income row would bury the
      // real signals.
      if (suggested !== DEFAULT_EXPENSE[source]) {
        warnings.push("category auto-adjusted to match the amount's direction — check it");
        suggestionBasis =
          "The description pointed to an expense, but the positive amount shows money coming in, so TaxSorted used the normal income category.";
      } else if (kind === "income") {
        suggestionBasis =
          "The amount is money coming in and no clearer category word was found, so TaxSorted used the normal business income category.";
      }
    }
    if (category === "residentialFinancialCost") warnings.push(MORTGAGE_INTEREST_WARNING);

    const record: NewLedgerRecord = {
      date: dateResult.iso,
      amount: amountResult.pence,
      kind,
      category,
      source,
      ...(description ? { description } : {}),
    };

    const rowNumber = index + 2;
    const externalId = context ? `${context.importId}:row-${rowNumber}` : undefined;
    // The source identity stays tied to file + row. The content comparison
    // also includes the normalized facts produced by the chosen mapping, so
    // remapping the same bytes cannot look like an exact duplicate.
    const contentDigest = context
      ? JSON.stringify({
          schema: "taxsorted.csv-row-content/1",
          file: context.importId,
          row: rowNumber,
          date: record.date,
          amount: record.amount,
          kind: record.kind,
          category: record.category,
          source: record.source,
          description: record.description ?? "",
        })
      : undefined;

    return {
      record,
      ...(context && externalId && contentDigest
        ? {
            importDetails: {
              origin: {
                kind: "bank-csv" as const,
                // The file fingerprint is the source namespace. It stays
                // fixed if the person corrects which business activity owns
                // the row, so that correction becomes a visible conflict
                // rather than a second event.
                accountScope: `csv:${context.importId}`,
                externalId,
                label: context.fileName,
                row: rowNumber,
                sourceRevision: 1,
              },
              contentDigest,
              suggestion: { basis: suggestionBasis, limitation: suggestion.limitation },
              ...(warnings.length ? { reviewNote: warnings.join("; ") } : {}),
            },
          }
        : {}),
      guessed: true,
      ...(warnings.length ? { warning: warnings.join("; ") } : {}),
    };
  });
}
