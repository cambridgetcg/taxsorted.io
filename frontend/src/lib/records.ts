// The only place that touches storage. Records live entirely in the
// browser (IndexedDB via idb-keyval, by default) — nothing here ever
// reaches a server. Tests inject a plain Map instead of touching IndexedDB.
//
// Concurrency: every mutation is a read-modify-write of the whole record
// list, so all mutations are serialized through one promise chain — two
// interleaved unserialized writes (a quick add-then-delete, or two calls
// racing in the same tab) would otherwise each start from the same snapshot
// and the later write would silently erase the earlier one. This covers
// same-tab interleaving only; cross-tab sync (BroadcastChannel/storage
// events) is a known M2 item.

import { get as idbGet, set as idbSet } from "idb-keyval";
import {
  categoryByKey,
  type LedgerRecord,
} from "@taxsorted/engine/uk/itsa";

const STORAGE_KEY = "taxsorted-records-v1";

export interface RecordsStore {
  list(): Promise<LedgerRecord[]>;
  add(r: Omit<LedgerRecord, "id">): Promise<LedgerRecord>;
  addMany(rs: Omit<LedgerRecord, "id">[]): Promise<LedgerRecord[]>;
  remove(id: string): Promise<void>;
  exportJson(): Promise<string>;
  exportCsv(): Promise<string>;
  clearAll(): Promise<void>;
}

/**
 * A key/value surface the store can persist through. A plain `Map` satisfies
 * this (tests pass one); so does anything whose `get`/`set` return promises —
 * the store awaits both, so sync and async backends behave identically.
 */
export interface RecordsBackend {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
  delete(key: string): unknown;
}

// A description is the one free-text field a person can type into this
// ledger, and CSV files opened in Excel/Sheets treat a cell starting with
// =, +, -, @ (or a leading tab/CR, even behind leading whitespace) as a
// formula to evaluate — "CSV injection". A description like "=SUM(A1)" or
// " =cmd|'/c calc'!A1" must never execute, so any field matching this gets
// a defusing apostrophe prefixed onto the ORIGINAL string (whitespace
// preserved) before the normal RFC 4180 quoting below runs. The apostrophe
// makes the spreadsheet display the text as-is; it isn't part of the
// record's real data (exportJson is untouched by this).
const FORMULA_PREFIX = /^\s*[=+\-@\t\r]/;

/** RFC 4180: quote a CSV field if it contains a comma, quote or newline; double any quotes inside. */
function csvField(value: string): string {
  const defused = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(defused)) {
    return `"${defused.replace(/"/g, '""')}"`;
  }
  return defused;
}

/** Integer pence -> pounds with exactly 2dp, no currency symbol or thousands separator (CSV, not display). */
function poundsString(pence: number): string {
  return (pence / 100).toFixed(2);
}

/**
 * The records store. `backend` is either a Map-like key/value surface
 * (tests pass a real `Map`) or the string `'idb'` (default), which persists
 * the whole record list under one IndexedDB key via idb-keyval — the only
 * branch that actually leaves this process's memory, and even then it never
 * leaves the browser.
 */
export function createRecordsStore(
  backend: RecordsBackend | "idb" = "idb"
): RecordsStore {
  const useIdb = backend === "idb";
  const map = useIdb ? null : (backend as RecordsBackend);

  // All mutations queue behind this chain, one at a time, in call order. A
  // rejected operation still rejects its own caller, but never breaks the
  // chain for the operations queued behind it.
  let chain: Promise<unknown> = Promise.resolve();
  const serialize = <T>(op: () => Promise<T>): Promise<T> => {
    const r = chain.then(op);
    chain = r.then(
      () => undefined,
      () => undefined
    );
    return r;
  };

  async function readAll(): Promise<LedgerRecord[]> {
    const stored = useIdb
      ? await idbGet<LedgerRecord[]>(STORAGE_KEY)
      : ((await map!.get(STORAGE_KEY)) as LedgerRecord[] | undefined);
    // Defensive copy: what callers get back is theirs to mutate — it must
    // never alias the store's own state.
    return stored ? structuredClone(stored) : [];
  }

  async function writeAll(records: LedgerRecord[]): Promise<void> {
    if (useIdb) {
      await idbSet(STORAGE_KEY, records); // IndexedDB structured-clones on write
    } else {
      await map!.set(STORAGE_KEY, structuredClone(records));
    }
  }

  function validate(r: Omit<LedgerRecord, "id">): void {
    // Pence are integers by definition, and a zero or negative record is a
    // direction error (direction comes from `kind`, never from sign).
    if (!Number.isInteger(r.amount) || r.amount <= 0) {
      throw new Error(
        `invalid amount: ${r.amount} — expected a positive whole number of pence`
      );
    }
    // Throws `unknown category: '<key>'` for a bad category. `source` is
    // always passed through, so a key that exists in both the
    // self-employment and property lists never hits the ambiguous-key throw.
    categoryByKey(r.category, r.source);
  }

  // The unserialized body — only ever called from inside serialize()
  // (calling a serialized method from another serialized op would deadlock).
  async function addOne(r: Omit<LedgerRecord, "id">): Promise<LedgerRecord> {
    validate(r);
    const record: LedgerRecord = { ...r, id: crypto.randomUUID() };
    const all = await readAll();
    all.push(record);
    await writeAll(all);
    return record;
  }

  return {
    list: () => readAll(),

    add: (r) => serialize(() => addOne(r)),

    addMany: (rs) =>
      serialize(async () => {
        const added: LedgerRecord[] = [];
        for (const r of rs) {
          added.push(await addOne(r));
        }
        return added;
      }),

    remove: (id) =>
      serialize(async () => {
        const all = await readAll();
        await writeAll(all.filter((r) => r.id !== id));
      }),

    async exportJson() {
      const all = await readAll();
      return JSON.stringify(all, null, 2);
    },

    async exportCsv() {
      const all = await readAll();
      const header = "date,kind,category,amount,source,description";
      const rows = all.map((r) =>
        [
          r.date,
          r.kind,
          r.category,
          poundsString(r.amount),
          r.source,
          csvField(r.description ?? ""),
        ].join(",")
      );
      return [header, ...rows].join("\n");
    },

    clearAll: () => serialize(() => writeAll([])),
  };
}
