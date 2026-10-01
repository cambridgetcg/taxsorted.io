// Real idb-keyval get/update run against a staged request/transaction harness.
// This proves the atomic API contract, not native-browser IndexedDB behaviour.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPreparationDraft, type PreparationDraft } from "../return-preparation";
import { createReturnPreparationStore, preparationStorageKey, type PreparationStoreBackend } from "../return-preparation-store";

const NOW = "2026-09-30T12:00:00.000Z";
const LATER = "2026-09-30T12:00:01.000Z";
const YEAR = "2025-26";
function draft() { return createPreparationDraft(YEAR, "prepare-return", NOW); }
function backendSpy() {
  const values = new Map<string, unknown>();
  const backend: PreparationStoreBackend = {
    get: vi.fn((key: string) => structuredClone(values.get(key))),
    set: vi.fn((key: string, value: unknown) => values.set(key, structuredClone(value))),
  };
  return { values, backend };
}

const database = {
  values: new Map<string, unknown>(),
  modes: [] as IDBTransactionMode[],
  queue: Promise.resolve(),
  opens: 0,
  failCommit: false,
  failRead: false,
};
function transaction(mode: IDBTransactionMode) {
  database.modes.push(mode);
  let state: Map<string, unknown>;
  let ended = false;
  let release: () => void;
  const previous = database.queue;
  database.queue = new Promise<void>(resolve => { release = resolve; });
  const ready = previous.then(() => { state = structuredClone(database.values); });
  const tx = {
    oncomplete: null as null | (() => void), onabort: null as null | (() => void), onerror: null as null | (() => void),
    error: null as DOMException | null,
    abort() {
      if (ended) return;
      ended = true;
      tx.error ??= new DOMException("Aborted", "AbortError");
      queueMicrotask(() => { tx.onabort?.(); release(); });
    },
    objectStore() {
      return {
        transaction: tx,
        get(key: string) {
          const request = { result: undefined as unknown, error: null as DOMException | null, onsuccess: null as null | (() => void), onerror: null as null | (() => void) };
          void ready.then(() => {
            if (database.failRead) {
              request.error = new DOMException("Read failed", "UnknownError");
              request.onerror?.(); tx.abort(); return;
            }
            request.result = structuredClone(state.get(key));
            request.onsuccess?.();
            queueMicrotask(() => {
              if (ended) return;
              if (database.failCommit && mode === "readwrite") { tx.abort(); return; }
              ended = true;
              if (mode === "readwrite") database.values = state;
              tx.oncomplete?.(); release();
            });
          });
          return request;
        },
        put(value: unknown, key: string) {
          if (mode !== "readwrite") throw new Error("Write in readonly transaction");
          state.set(key, structuredClone(value));
        },
      };
    },
  };
  return tx;
}

beforeEach(() => {
  database.values.clear();
  database.modes.length = 0;
  database.opens = 0;
  database.failCommit = database.failRead = false;
  vi.stubGlobal("indexedDB", {
    open() {
      database.opens += 1;
      const request = {
        result: { transaction: (_name: string, mode: IDBTransactionMode) => transaction(mode), onclose: null },
        onsuccess: null as null | (() => void),
      };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("explicit preparation persistence", () => {
  it("performs no I/O when constructing a store and no writes when explicitly loading an absent year", async () => {
    const { backend } = backendSpy();
    const store = createReturnPreparationStore(YEAR, backend);
    const idb = createReturnPreparationStore(YEAR);
    expect(backend.get).not.toHaveBeenCalled();
    expect(backend.set).not.toHaveBeenCalled();
    expect(database.opens).toBe(0);
    expect(await store.load()).toBeNull();
    expect(await idb.load()).toBeNull();
    expect(backend.set).not.toHaveBeenCalled();
    expect(database.modes).toEqual(["readonly"]);
    expect(database.values.size).toBe(0);
  });

  it("saves explicitly with revision/timestamp and returns isolated copies", async () => {
    const { backend, values } = backendSpy();
    const store = createReturnPreparationStore(YEAR, backend, () => LATER);
    const original = draft();
    const saved = await store.save(original);
    expect(saved).toMatchObject({ revision: 1, createdAt: NOW, updatedAt: LATER, year: YEAR });
    expect(original.revision).toBe(0);
    saved.circumstances.employment = "yes";
    expect((await store.load())?.circumstances.employment).toBeNull();
    expect(values.size).toBe(1);
  });

  it("isolates years and never reads or writes Books, Passport or checklist keys", async () => {
    const { backend, values } = backendSpy();
    values.set("taxsorted-tax-position-passport-draft-v1", { private: true });
    const old = createReturnPreparationStore(YEAR, backend, () => LATER);
    const current = createReturnPreparationStore("2026-27", backend, () => LATER);
    await old.save(draft());
    expect(await current.load()).toBeNull();
    await current.save(createPreparationDraft("2026-27", "organise-records", NOW));
    expect((await old.load())?.purpose).toBe("prepare-return");
    expect((await current.load())?.purpose).toBe("organise-records");
    expect(values.get("taxsorted-tax-position-passport-draft-v1")).toEqual({ private: true });
    expect(new Set(vi.mocked(backend.get).mock.calls.map(([key]) => key))).toEqual(new Set([preparationStorageKey(YEAR), preparationStorageKey("2026-27")]));
  });

  it.each(["memory", "idb"])("rejects a stale writer across store instances using %s", async kind => {
    const storage = kind === "memory" ? new Map<string, unknown>() : "idb";
    const a = createReturnPreparationStore(YEAR, storage, () => LATER);
    const b = createReturnPreparationStore(YEAR, storage, () => LATER);
    const initial = await a.save(draft());
    const left = structuredClone(initial); left.circumstances.employment = "yes";
    const right = structuredClone(initial); right.circumstances.employment = "no";
    const results = await Promise.allSettled([a.save(left), b.save(right)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    expect(await a.load()).toMatchObject({ revision: 2, circumstances: { employment: "yes" } });
    if (kind === "idb") expect(database.modes.filter(mode => mode === "readwrite")).toHaveLength(3);
  });

  it.each(["memory", "idb"])("never overwrites a saved draft with a fresh Start through %s", async kind => {
    const storage = kind === "memory" ? new Map<string, unknown>() : "idb";
    const store = createReturnPreparationStore(YEAR, storage, () => LATER);
    const saved = await store.save(draft());
    await expect(createReturnPreparationStore(YEAR, storage, () => LATER).save(draft())).rejects.toThrow(/changed/);
    expect(await store.load()).toEqual(saved);
  });

  it.each([null, { schema: "future" }, { arbitrary: "private source content" }])("preserves malformed stored data during load and attempted save: %j", async damaged => {
    database.values.set(preparationStorageKey(YEAR), damaged);
    const store = createReturnPreparationStore(YEAR, "idb", () => LATER);
    await expect(store.load()).rejects.toThrow(/format/);
    await expect(store.save(draft())).rejects.toThrow(/format/);
    expect(database.values.get(preparationStorageKey(YEAR))).toEqual(damaged);
  });

  it("rejects a saved value in the wrong year's slot and a forged unsaved revision", async () => {
    const values = new Map<string, unknown>();
    const store = createReturnPreparationStore(YEAR, values, () => LATER);
    const misplaced = createPreparationDraft("2026-27", "organise-records", NOW);
    misplaced.revision = 1;
    values.set(preparationStorageKey(YEAR), misplaced);
    await expect(store.load()).rejects.toThrow(/year/);
    await expect(store.save(draft())).rejects.toThrow(/year/);
    values.set(preparationStorageKey(YEAR), draft());
    await expect(store.load()).rejects.toThrow(/revision/);
  });

  it("does not resurrect an externally deleted saved draft", async () => {
    const values = new Map<string, unknown>();
    const store = createReturnPreparationStore(YEAR, values, () => LATER);
    const saved = await store.save(draft());
    values.delete(preparationStorageKey(YEAR));
    await expect(store.save(saved)).rejects.toThrow(/deleted/);
    expect(values.size).toBe(0);
  });

  it("rejects a replacement draft with the same revision but a different creation identity", async () => {
    const values = new Map<string, unknown>();
    const store = createReturnPreparationStore(YEAR, values, () => LATER);
    const saved = await store.save(draft());
    values.set(preparationStorageKey(YEAR), { ...saved, createdAt: "2026-09-29T12:00:00.000Z" });
    await expect(store.save(saved)).rejects.toThrow(/changed/);
  });

  it("captures input before asynchronous storage work so later typing is not silently saved", async () => {
    let release: () => void = () => {};
    const waiting = new Promise<void>(resolve => { release = resolve; });
    const values = new Map<string, unknown>();
    const backend: PreparationStoreBackend = {
      get: async key => { await waiting; return values.get(key); },
      set: (key, value) => values.set(key, value),
    };
    const original = draft();
    original.circumstances.employment = "yes";
    const saving = createReturnPreparationStore(YEAR, backend, () => LATER).save(original);
    original.circumstances.employment = "no";
    release();
    expect((await saving).circumstances.employment).toBe("yes");
    expect(original.circumstances.employment).toBe("no");
  });

  it("reports an aborted native transaction without returning a successful saved revision", async () => {
    const store = createReturnPreparationStore(YEAR, "idb", () => LATER);
    const saved = await store.save(draft());
    const update = structuredClone(saved); update.circumstances.employment = "yes";
    database.failCommit = true;
    await expect(store.save(update)).rejects.toThrow();
    expect(database.values.get(preparationStorageKey(YEAR))).toEqual(saved);
    database.failCommit = false;
    expect(await store.save(update)).toMatchObject({ revision: 2 });
  });

  it("keeps read failure distinct from an absent draft", async () => {
    database.failRead = true;
    await expect(createReturnPreparationStore(YEAR).load()).rejects.toThrow();
    expect(database.values.size).toBe(0);
  });

  it("rejects cross-year saves, malformed edits and invalid/backwards clocks without writes", async () => {
    const { backend, values } = backendSpy();
    const store = createReturnPreparationStore(YEAR, backend, () => LATER);
    await expect(store.save(createPreparationDraft("2026-27", "organise-records", NOW))).rejects.toThrow(/matching/);
    const invalid = { ...draft(), unexpected: true };
    await expect(store.save(invalid)).rejects.toThrow(/format/);
    expect(backend.set).not.toHaveBeenCalled();
    const saved = await store.save(draft());
    const backwards = createReturnPreparationStore(YEAR, backend, () => NOW);
    await expect(backwards.save(saved)).rejects.toThrow(/clock/);
    const badClock = createReturnPreparationStore(YEAR, backend, () => "not-a-time");
    await expect(badClock.save(saved)).rejects.toThrow();
    expect(values.get(preparationStorageKey(YEAR))).toEqual(saved);
  });

  it("recovers the shared backend queue after a failed save", async () => {
    const values = new Map<string, unknown>();
    const store = createReturnPreparationStore(YEAR, values, () => LATER);
    await expect(store.save({ ...draft(), revision: 2 } as PreparationDraft)).rejects.toThrow();
    expect(await store.save(draft())).toMatchObject({ revision: 1 });
  });
});
