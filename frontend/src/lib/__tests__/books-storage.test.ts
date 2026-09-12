// This exercises the IndexedDB request/transaction contract with staged writes.
// It is a deterministic harness, not evidence from a native browser database.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRecordsStore } from "../records";
import { BOOKS_STORAGE_KEY, BOOKS_LEGACY_STORAGE_KEY, BOOKS_MIGRATION_CLOSED_KEY } from "../books-storage";
import type { LocalBooksState } from "../local-books";

const database = vi.hoisted(() => ({
  data: new Map<string, unknown>(),
  abortAtCommit: false,
  failMarkerWrite: false,
  beforeUpdate: null as null | (() => void),
  requestedLocks: [] as string[],
  openedModes: [] as string[],
}));

vi.mock("idb-keyval", () => ({
  get: async (key: string) => structuredClone(database.data.get(key)),
  getMany: async (keys: string[]) => keys.map(key => structuredClone(database.data.get(key))),
  set: async (key: string, value: unknown) => { database.data.set(key, structuredClone(value)); },
  del: async (key: string) => { database.data.delete(key); },
  update: async (key: string, update: (value: unknown) => unknown) => {
    database.beforeUpdate?.();
    database.beforeUpdate = null;
    database.data.set(key, structuredClone(update(structuredClone(database.data.get(key)))));
  },
  createStore: (name: string, objectStore: string) => {
    if (name !== "keyval-store" || objectStore !== "keyval") throw new Error("Unexpected database schema");
    return async (mode: string, operation: (store: IDBObjectStore) => Promise<void>) => {
      database.openedModes.push(mode);
      const draft = new Map(structuredClone([...database.data]));
      let aborted = false;
      let pending = 0;
      const transaction = {
        oncomplete: null as null | (() => void), onabort: null as null | (() => void), onerror: null as null | (() => void), error: null as Error | null,
        abort() {
          aborted = true;
          this.error ??= new DOMException("Interrupted database transaction", "AbortError");
          queueMicrotask(() => this.onabort?.());
        },
      };
      const store = {
        transaction,
        get(key: string) {
          pending += 1;
          const request = { result: structuredClone(draft.get(key)), onsuccess: null as null | (() => void) };
          queueMicrotask(() => {
            if (aborted) return;
            request.onsuccess?.();
            pending -= 1;
            if (pending !== 0 || aborted) return;
            queueMicrotask(() => {
              if (aborted) return;
              if (database.abortAtCommit) { transaction.abort(); return; }
              database.data.clear();
              for (const [key, value] of draft) database.data.set(key, value);
              transaction.oncomplete?.();
            });
          });
          return request;
        },
        put(value: unknown, key: string) {
          if (database.failMarkerWrite && key.endsWith(BOOKS_MIGRATION_CLOSED_KEY)) throw new DOMException("No room for marker", "QuotaExceededError");
          draft.set(key, structuredClone(value));
        },
        delete(key: string) { draft.delete(key); },
      };
      return operation(store as unknown as IDBObjectStore);
    };
  },
}));

const INCOME = { date: "2026-05-01", amount: 12345, kind: "income" as const, category: "turnover", source: "self-employment" as const };

beforeEach(() => {
  database.data.clear();
  database.abortAtCommit = database.failMarkerWrite = false;
  database.beforeUpdate = null;
  database.requestedLocks.length = database.openedModes.length = 0;
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.stubGlobal("navigator", { locks: { request: async (name: string, operation: () => Promise<unknown>) => { database.requestedLocks.push(name); return operation(); } } });
});
afterEach(() => vi.unstubAllGlobals());

async function fixture(prefix = "") {
  const source = createRecordsStore(new Map());
  const incoming = await source.add({ ...INCOME, amount: 7700 });
  const json = await source.exportBackup();
  const store = createRecordsStore("idb", { storagePrefix: prefix });
  const current = await store.add(INCOME);
  database.data.set(prefix + BOOKS_LEGACY_STORAGE_KEY, [{ ...INCOME, id: "legacy-1" }]);
  const preview = await store.previewRestore(json);
  return { store, current, incoming, json, preview };
}

describe("Books restore storage boundary", () => {
  it("commits all three keys together using the same scoped Web Lock as other Books mutations", async () => {
    const prefix = "disposable:";
    const { store, incoming, json, preview } = await fixture(prefix);
    database.data.set(BOOKS_STORAGE_KEY, { untouchedOrdinaryBooks: true });
    database.data.set("taxsorted-synthetic-accounting-demo:" + BOOKS_STORAGE_KEY, { untouchedDemo: true });
    database.data.set("taxsorted-account-preferences", "untouched");
    await store.restoreBackup(json, preview);
    const restored = await store.state();
    expect(restored.events[0].id).toBe(incoming.id);
    expect(restored.replica.id).not.toBe(preview.expectedReplicaId);
    expect(database.data.has(prefix + BOOKS_LEGACY_STORAGE_KEY)).toBe(false);
    expect(database.data.get(prefix + BOOKS_MIGRATION_CLOSED_KEY)).toBe(true);
    expect(database.data.get(BOOKS_STORAGE_KEY)).toEqual({ untouchedOrdinaryBooks: true });
    expect(database.data.get("taxsorted-synthetic-accounting-demo:" + BOOKS_STORAGE_KEY)).toEqual({ untouchedDemo: true });
    expect(database.data.get("taxsorted-account-preferences")).toBe("untouched");
    expect(database.requestedLocks.length).toBeGreaterThan(2);
    expect(new Set(database.requestedLocks)).toEqual(new Set([prefix + BOOKS_STORAGE_KEY]));
    expect(database.openedModes).toEqual(["readwrite"]);
  });

  it.each(["abortAtCommit", "failMarkerWrite"] as const)("rolls back main, legacy and marker keys on %s", async flag => {
    const { store, json, preview } = await fixture();
    const before = structuredClone([...database.data]);
    database[flag] = true;
    await expect(store.restoreBackup(json, preview)).rejects.toThrow();
    expect([...database.data]).toEqual(before);
    expect(database.data.has(BOOKS_LEGACY_STORAGE_KEY)).toBe(true);
    expect(database.data.has(BOOKS_MIGRATION_CLOSED_KEY)).toBe(false);
    database[flag] = false;
    await store.restoreBackup(json, preview);
    expect(database.data.get(BOOKS_MIGRATION_CLOSED_KEY)).toBe(true);
  });

  it("aborts when a legacy writer appended after the preview", async () => {
    const { store, json, preview } = await fixture();
    database.data.set(BOOKS_LEGACY_STORAGE_KEY, [{ ...INCOME, id: "late-legacy" }]);
    const before = structuredClone([...database.data]);
    await expect(store.restoreBackup(json, preview)).rejects.toThrow(/changed after the preview/);
    expect([...database.data]).toEqual(before);
  });

  it("blocks native restore without Web Locks but still permits backup downloads", async () => {
    const { store, json, preview } = await fixture();
    vi.stubGlobal("navigator", {});
    const before = structuredClone([...database.data]);
    await expect(store.previewRestore(json)).rejects.toThrow(/supports Web Locks/);
    await expect(store.restoreBackup(json, preview)).rejects.toThrow(/supports Web Locks/);
    await expect(store.exportBackup()).resolves.toContain("taxsorted.books-backup/1");
    expect([...database.data]).toEqual(before);
    expect(database.openedModes).toEqual([]);
  });

  it("refuses to write a stale installation over a replaced store", async () => {
    const { store } = await fixture();
    const replacement = structuredClone(database.data.get(BOOKS_STORAGE_KEY)) as LocalBooksState;
    replacement.replica.id = "replacement-installation";
    database.beforeUpdate = () => { database.data.set(BOOKS_STORAGE_KEY, replacement); };
    await expect(store.add({ ...INCOME, amount: 3300 })).rejects.toThrow(/changed after the preview/);
    expect(database.data.get(BOOKS_STORAGE_KEY)).toEqual(replacement);
  });

  it("does not turn a committed restore into failure when broadcasting fails", async () => {
    let fail = false;
    vi.stubGlobal("BroadcastChannel", class { onmessage = null; postMessage() { if (fail) throw new Error("Channel closed"); } });
    const { store, json, preview, incoming } = await fixture();
    fail = true;
    await expect(store.restoreBackup(json, preview)).resolves.toBeUndefined();
    expect((await store.state()).events[0].id).toBe(incoming.id);
  });
});
