import { createStore } from "idb-keyval";
import { canonicalAccountingJson } from "@taxsorted/engine/accounting-sync";

export const WORKSPACE_STORAGE_KEY = "taxsorted-local-workspace-v1";
export const WORKSPACE_SCHEMA = "taxsorted.local-workspace/1";
export const WORKSPACE_CHECKLIST_KEY = "taxsorted.tax-checklist-v1";
export const WORKSPACE_KEYS = [
  "taxsorted-local-books-v2", "taxsorted-records-v1", "taxsorted-books-legacy-migration-closed",
  "taxsorted-tax-position-passport-draft-v1", "taxsorted-return-preparation-v1:2025-26",
  "taxsorted-return-preparation-v1:2026-27", WORKSPACE_CHECKLIST_KEY,
] as const;
export const WORKSPACE_CHANGED_MESSAGE = "This workspace changed after you opened it. Reload before saving so restored or newer work is not overwritten. Your current entries are still here.";
export interface WorkspaceSnapshot { generation: string | null; values: Record<string, unknown> }
interface Envelope extends WorkspaceSnapshot { schema: typeof WORKSPACE_SCHEMA }
const database = createStore("keyval-store", "keyval");
const own = (value: object, key: string) => Object.hasOwn(value, key);
const clone = <T,>(value: T): T => structuredClone(value);
function comparisonValue(value: unknown): unknown {
  if (value === undefined) return ["absent"];
  if (Array.isArray(value)) return ["array", value.map(comparisonValue)];
  if (value !== null && typeof value === "object") return ["object", Object.keys(value).sort().map(key => [key, comparisonValue((value as Record<string, unknown>)[key])])];
  return ["value", value];
}
const fingerprint = (value: unknown) => canonicalAccountingJson(comparisonValue(value));

function envelope(raw: unknown): Envelope | null {
  if (raw === undefined) return null;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("The saved workspace could not be read. It has been left untouched.");
  const value = raw as Envelope;
  if (Object.keys(value).sort().join(",") !== "generation,schema,values" || value.schema !== WORKSPACE_SCHEMA
    || !(value.generation === null || (typeof value.generation === "string" && value.generation.length > 0 && value.generation.length <= 128))
    || !value.values || typeof value.values !== "object" || Array.isArray(value.values)
    || Object.keys(value.values).some(key => !WORKSPACE_KEYS.includes(key as typeof WORKSPACE_KEYS[number]))
    || WORKSPACE_KEYS.some(key => !own(value.values, key))) {
    throw new Error("The saved workspace could not be read. It has been left untouched.");
  }
  return value;
}
function assertKeys(keys: readonly string[]) {
  if (keys.some(key => !WORKSPACE_KEYS.includes(key as typeof WORKSPACE_KEYS[number]))) throw new Error("Unknown workspace storage key.");
}
function legacyChecklist(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(WORKSPACE_CHECKLIST_KEY); }
  catch { throw new Error("The saved checklist could not be read. The workspace has been left untouched."); }
}

/** All request callbacks and mutations are synchronous; crypto belongs outside this transaction. */
function transact<T>(keys: readonly string[], mode: IDBTransactionMode,
  operation: (snapshot: WorkspaceSnapshot, current: Envelope | null, store: IDBObjectStore) => T): Promise<T> {
  assertKeys(keys);
  return database(mode, store => new Promise<T>((resolve, reject) => {
    let result: T;
    let failure: unknown;
    const tx = store.transaction;
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () => reject(failure ?? new Error("The workspace could not be saved. Earlier saved work is unchanged."));
    const requested = [WORKSPACE_STORAGE_KEY, ...keys];
    const raw: Record<string, unknown> = {};
    let pending = requested.length;
    for (const key of requested) {
      const request = store.get(key);
      request.onerror = () => { failure = new Error("The workspace could not be read. Earlier saved work is unchanged."); };
      request.onsuccess = () => {
        raw[key] = request.result;
        if (--pending) return;
        try {
          const current = envelope(raw[WORKSPACE_STORAGE_KEY]);
          const values: Record<string, unknown> = {};
          for (const slot of keys) values[slot] = current && own(current.values, slot)
            ? current.values[slot]
            : slot === WORKSPACE_CHECKLIST_KEY && raw[slot] === undefined ? legacyChecklist() : raw[slot];
          result = operation({ generation: current?.generation ?? null, values: clone(values) }, current, store);
        } catch (error) { failure = error; tx.abort(); }
      };
    }
  }));
}

export function readWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  return transact(WORKSPACE_KEYS, "readonly", snapshot => snapshot);
}

/** Each editor pins its first observed generation; a later restore never silently rebinds it. */
export function createWorkspaceSession() {
  let pinned: string | null | undefined;
  const observed = new Map<string, unknown>();
  const check = (generation: string | null) => {
    if (pinned !== undefined && pinned !== generation) throw new Error(WORKSPACE_CHANGED_MESSAGE);
  };
  const remember = (snapshot: WorkspaceSnapshot) => {
    pinned = snapshot.generation;
    for (const [key, value] of Object.entries(snapshot.values)) observed.set(key, clone(value));
  };
  return {
    async readMany(keys: readonly string[]): Promise<unknown[]> {
      const snapshot = await transact(keys, "readonly", value => { check(value.generation); return value; });
      check(snapshot.generation); remember(snapshot);
      return keys.map(key => clone(snapshot.values[key]));
    },
    async read(key: string): Promise<unknown> { return (await this.readMany([key]))[0]; },
    async updateMany(keys: readonly string[], change: (values: Record<string, unknown>) => Record<string, unknown>): Promise<void> {
      const committed = await transact(keys, "readwrite", (snapshot, current, store) => {
        check(snapshot.generation);
        for (const key of keys) if (observed.has(key) && fingerprint(snapshot.values[key]) !== fingerprint(observed.get(key))) throw new Error(WORKSPACE_CHANGED_MESSAGE);
        const updates = clone(change(clone(snapshot.values)));
        assertKeys(Object.keys(updates));
        if (Object.keys(updates).some(key => !keys.includes(key))) throw new Error("A workspace update included an unrequested key.");
        if (current) store.put({ ...current, values: { ...current.values, ...updates } } satisfies Envelope, WORKSPACE_STORAGE_KEY);
        else for (const [key, value] of Object.entries(updates)) {
          if (value === undefined) store.delete(key);
          else store.put(value, key);
        }
        return { generation: snapshot.generation, values: { ...snapshot.values, ...updates } };
      });
      remember(committed);
    },
    async update(key: string, change: (value: unknown) => unknown): Promise<void> {
      await this.updateMany([key], values => ({ [key]: change(values[key]) }));
    },
  };
}

function coordinated<T>(action: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || typeof navigator.locks?.request !== "function") {
    return Promise.reject(new Error("This browser cannot safely coordinate workspace recovery. Use a browser that supports Web Locks."));
  }
  return navigator.locks.request(WORKSPACE_KEYS[0], () => navigator.locks.request(WORKSPACE_KEYS[3], action)) as unknown as Promise<T>;
}
function closeLegacyWriters(store: IDBObjectStore) {
  const tombstone = { schema: "taxsorted.workspace-moved/1" };
  for (const key of [WORKSPACE_KEYS[0], WORKSPACE_KEYS[3], WORKSPACE_KEYS[4], WORKSPACE_KEYS[5]]) store.put(tombstone, key);
  store.put(true, WORKSPACE_KEYS[2]);
}
export function activateWorkspace(expected?: WorkspaceSnapshot): Promise<WorkspaceSnapshot> {
  const comparison = expected ? fingerprint(expected) : undefined;
  return coordinated(() => transact(WORKSPACE_KEYS, "readwrite", (snapshot, current, store) => {
    if (comparison !== undefined && fingerprint(snapshot) !== comparison) throw new Error(WORKSPACE_CHANGED_MESSAGE);
    if (current) return snapshot;
    const activated = snapshot;
    store.put({ schema: WORKSPACE_SCHEMA, ...activated } satisfies Envelope, WORKSPACE_STORAGE_KEY);
    closeLegacyWriters(store);
    return activated;
  }));
}
export function replaceWorkspace(expected: WorkspaceSnapshot, values: Record<string, unknown>): Promise<void> {
  const proposed = clone(values);
  if (Object.keys(proposed).length !== WORKSPACE_KEYS.length || WORKSPACE_KEYS.some(key => !own(proposed, key))) return Promise.reject(new Error("The replacement workspace must include every saved section."));
  const comparison = fingerprint(expected);
  return coordinated(() => transact(WORKSPACE_KEYS, "readwrite", (snapshot, _current, store) => {
    if (fingerprint(snapshot) !== comparison) throw new Error(WORKSPACE_CHANGED_MESSAGE);
    store.put({ schema: WORKSPACE_SCHEMA, generation: crypto.randomUUID(), values: proposed } satisfies Envelope, WORKSPACE_STORAGE_KEY);
    closeLegacyWriters(store);
  }));
}
