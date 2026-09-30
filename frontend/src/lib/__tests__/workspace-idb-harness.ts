// Staged request/transaction harness: proves API atomicity, not native IndexedDB implementation.
export const workspaceTestDb = {
  values: new Map<string, unknown>(), modes: [] as IDBTransactionMode[], failCommit: false,
  queue: Promise.resolve(),
  reset() { this.values.clear(); this.modes.length = 0; this.failCommit = false; this.queue = Promise.resolve(); },
  async store<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => T): Promise<Awaited<T>> {
    workspaceTestDb.modes.push(mode);
    const previous = workspaceTestDb.queue;
    let release!: () => void;
    workspaceTestDb.queue = new Promise<void>(resolve => { release = resolve; });
    await previous;
    const data = structuredClone(workspaceTestDb.values);
    let ended = false;
    let pending = 0;
    const tx = {
      oncomplete: null as null | (() => void), onabort: null as null | (() => void), onerror: null as null | (() => void), error: null,
      abort() { if (ended) return; ended = true; queueMicrotask(() => { tx.onabort?.(); release(); }); },
    };
    const store = {
      transaction: tx,
      get(key: string) {
        pending += 1;
        const request = { result: undefined as unknown, onsuccess: null as null | (() => void), onerror: null as null | (() => void) };
        queueMicrotask(() => {
          if (ended) return;
          request.result = structuredClone(data.get(key)); request.onsuccess?.(); pending -= 1;
          if (pending === 0) queueMicrotask(() => {
            if (ended) return;
            if (mode === "readwrite" && workspaceTestDb.failCommit) { tx.abort(); return; }
            ended = true;
            if (mode === "readwrite") workspaceTestDb.values = data;
            tx.oncomplete?.(); release();
          });
        });
        return request;
      },
      put(value: unknown, key: string) { if (mode !== "readwrite") throw new Error("Unexpected write"); data.set(key, structuredClone(value)); },
      delete(key: string) { if (mode !== "readwrite") throw new Error("Unexpected delete"); data.delete(key); },
    };
    return await operation(store as unknown as IDBObjectStore);
  },
};
