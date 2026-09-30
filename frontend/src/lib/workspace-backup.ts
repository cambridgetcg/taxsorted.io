// A saved-data format, independent of the local storage generation. It contains
// no account/session credentials, attachment bytes or unsaved form edits.
import {
  BOOKS_BACKUP_SCHEMA, booksBackupDigest, parseBooksBackup, summariseBooksBackup,
  type BooksBackupSummary,
} from "@/lib/books-backup";
import type { LocalBooksState } from "@/lib/local-books";
import { assertPassportDraft, type TaxPositionPassportDraft } from "@/lib/passport-store";
import { assertPreparationDraft, PREPARATION_YEARS, type PreparationDraft, type PreparationYear } from "@/lib/return-preparation";
import { parseSavedChecklist, type SavedChecklist } from "@/app/checkup/checklist-state";
import type { AudienceId } from "@/lib/tax-services";
import { PASSPORT_INCOME_SOURCE_IDS } from "@taxsorted/engine/uk/passport";

export const WORKSPACE_BACKUP_SCHEMA = "taxsorted.workspace-backup/1" as const;
export const WORKSPACE_BACKUP_MAX_BYTES = 12 * 1024 * 1024;

export interface WorkspaceBackupContents {
  books: LocalBooksState | null;
  passport: TaxPositionPassportDraft | null;
  preparations: Record<PreparationYear, PreparationDraft | null>;
  checklist: SavedChecklist | null;
}
export interface WorkspaceBackup extends WorkspaceBackupContents {
  schema: typeof WORKSPACE_BACKUP_SCHEMA;
  exportedAt: string;
}
export interface WorkspaceBackupSummary {
  books: BooksBackupSummary | null;
  passport: { answeredSources: number; totalSources: number; hasMtdCheck: boolean } | null;
  preparations: Record<PreparationYear, { employmentSources: number } | null>;
  /** Total manual checks across all audiences; not an assessment of readiness. */
  checklist: { audience: AudienceId; checked: number } | null;
}

function invalid(): never {
  // Never put imported keys, values, tax facts or provider payloads in errors.
  throw new Error("This workspace backup contains an invalid or unsupported saved-data format. Choose another copy; saved data has not changed.");
}
function exactObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length !== keys.length || keys.some(key => !Object.hasOwn(object, key))) invalid();
  return object;
}
function instant(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

// Bound provider JSON and historical Passport evidence before any domain code.
// Never infer that arbitrary extra fields belong to a supported future format.
function checkJsonTree(root: unknown): void {
  const pending = [{ value: root, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++count > 400_000 || depth > 40) invalid();
    if (value === undefined || ["bigint", "symbol", "function"].includes(typeof value)) invalid();
    if (typeof value === "number" && !Number.isFinite(value)) invalid();
    if (typeof value === "string" && value.length > 1_000_000) invalid();
    if (!value || typeof value !== "object") continue;
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) invalid();
    if (Object.getOwnPropertySymbols(value).length || (array && Object.keys(value).length !== value.length)) invalid();
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (array && key === "length") continue;
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) invalid();
      if (array && !/^(?:0|[1-9]\d*)$/.test(key)) invalid();
      if (["__proto__", "prototype", "constructor"].includes(key) || count + pending.length >= 400_000) invalid();
      pending.push({ value: descriptor.value, depth: depth + 1 });
    }
  }
}

// JSON.parse accepts duplicate members. Refuse even escaped duplicate names and
// values hidden by later members, so importers cannot disagree about content.
function rejectDuplicateMembers(json: string): void {
  const stack: (Set<string> | null)[] = [];
  for (let index = 0; index < json.length; index++) {
    const character = json[index];
    if (character === "{" || character === "[") {
      if (stack.length >= 40) invalid();
      stack.push(character === "{" ? new Set() : null);
    } else if (character === "}" || character === "]") stack.pop();
    else if (character === '"') {
      const start = index++;
      while (json[index] !== '"') {
        if (json[index] === "\\") index++;
        index++;
      }
      let following = index + 1;
      while (/\s/.test(json[following] ?? "")) following++;
      if (json[following] === ":") {
        const key = JSON.parse(json.slice(start, index + 1)) as string;
        const keys = stack.at(-1);
        if (!keys || keys.has(key)) invalid();
        keys.add(key);
      }
    }
  }
}

function validatePassport(value: unknown): asserts value is TaxPositionPassportDraft {
  const draft = exactObject(value, ["schema", "revision", "createdAt", "updatedAt", "answeredIncomeSourceIds", "incomeSources", "evidence", "mtdIncomeTaxPosition"]);
  assertPassportDraft(draft);
  if (!Number.isSafeInteger(draft.revision) || draft.revision < 1 || !instant(draft.createdAt)
    || !instant(draft.updatedAt) || draft.updatedAt < draft.createdAt) invalid();
  if (draft.mtdIncomeTaxPosition !== null) exactObject(draft.mtdIncomeTaxPosition, ["kind", "request", "answer"]);
}

/** Validate a complete saved snapshot. Null is absence, not an empty new draft. */
export async function parseWorkspaceBackup(json: string): Promise<WorkspaceBackup> {
  if (typeof json !== "string" || json.length > WORKSPACE_BACKUP_MAX_BYTES
    || new TextEncoder().encode(json).byteLength > WORKSPACE_BACKUP_MAX_BYTES) {
    throw new Error("Choose a workspace backup payload no larger than 12 MB.");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(json); }
  catch { throw new Error("This is not valid workspace backup JSON. Choose an encrypted TaxSorted workspace backup."); }
  checkJsonTree(parsed);
  rejectDuplicateMembers(json);
  const value = exactObject(parsed, ["schema", "exportedAt", "books", "passport", "preparations", "checklist"]);
  if (value.schema !== WORKSPACE_BACKUP_SCHEMA || !instant(value.exportedAt)) invalid();
  exactObject(value.preparations, PREPARATION_YEARS);
  try {
    if (value.books !== null) {
      // Reuse the existing strict Books format, provenance/digest validation and
      // its 10 MiB bound. Restore must still call restoredBooks to retire links.
      await parseBooksBackup(JSON.stringify({ schema: BOOKS_BACKUP_SCHEMA, exportedAt: value.exportedAt, books: value.books }));
    }
    if (value.passport !== null) validatePassport(value.passport);
    const preparations = value.preparations as Record<PreparationYear, unknown>;
    for (const year of PREPARATION_YEARS) {
      const draft = preparations[year];
      if (draft === null) continue;
      assertPreparationDraft(draft);
      if (draft.year !== year || draft.revision < 1) invalid();
    }
    if (value.checklist !== null && !parseSavedChecklist(JSON.stringify(value.checklist))) invalid();
  } catch { invalid(); }
  return value as unknown as WorkspaceBackup;
}

/** Plaintext is an in-memory intermediate. Download only its encrypted form. */
export async function exportWorkspaceBackup(contents: WorkspaceBackupContents, exportedAt = new Date().toISOString()): Promise<string> {
  if (!instant(exportedAt)) invalid();
  // Validate the original graph too: stringify must not silently replace NaN,
  // drop undefined fields, invoke accessors/toJSON or fill sparse array holes.
  checkJsonTree(contents);
  exactObject(contents, ["books", "passport", "preparations", "checklist"]);
  let json: string;
  try { json = JSON.stringify({ schema: WORKSPACE_BACKUP_SCHEMA, exportedAt, ...contents }, null, 2); }
  catch { invalid(); }
  await parseWorkspaceBackup(json);
  return json;
}

/** Fingerprints compare validated content; they do not authorise storage writes. */
export const workspaceBackupDigest = booksBackupDigest;

export function summariseWorkspaceBackup(backup: WorkspaceBackup): WorkspaceBackupSummary {
  return {
    books: backup.books === null ? null : summariseBooksBackup(backup.books),
    passport: backup.passport === null ? null : {
      answeredSources: backup.passport.answeredIncomeSourceIds.length,
      totalSources: PASSPORT_INCOME_SOURCE_IDS.length,
      hasMtdCheck: backup.passport.mtdIncomeTaxPosition !== null,
    },
    preparations: Object.fromEntries(PREPARATION_YEARS.map(year => [year,
      backup.preparations[year] === null ? null : { employmentSources: backup.preparations[year].employmentSources.length },
    ])) as WorkspaceBackupSummary["preparations"],
    checklist: backup.checklist === null ? null : {
      audience: backup.checklist.audience,
      checked: Object.values(backup.checklist.checked).reduce((sum, items) => sum + items.length, 0),
    },
  };
}
