import { createStore } from "idb-keyval";
import { canonicalAccountingJson } from "@taxsorted/engine/accounting-sync";
import type { LocalBooksState } from "@/lib/local-books";

// The existing idb-keyval database and object store; no database upgrade.
export const booksIdbStore = createStore("keyval-store", "keyval");
export const BOOKS_STORAGE_KEY = "taxsorted-local-books-v2";
export const BOOKS_LEGACY_STORAGE_KEY = "taxsorted-records-v1";
export const BOOKS_MIGRATION_CLOSED_KEY = "taxsorted-books-legacy-migration-closed";
export const BOOKS_STORAGE_KEYS = [BOOKS_STORAGE_KEY, BOOKS_LEGACY_STORAGE_KEY, BOOKS_MIGRATION_CLOSED_KEY] as const;

export function booksStorageFingerprint(values: unknown[]): string {
  return canonicalAccountingJson(values.map(value => value ?? null));
}

export const BOOKS_CHANGED_MESSAGE = "Your Books changed after the preview. Choose the backup again and save a fresh copy before replacing them.";

/** Read all compared keys in the same transaction; the caller supplies no async work. */
export function replaceBooksInTransaction(
  store: IDBObjectStore,
  keys: readonly string[],
  expectedFingerprint: string,
  replacement: LocalBooksState,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = store.transaction;
    let failure: unknown;
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(failure ?? transaction.error ?? new Error("The backup could not be saved. Your earlier Books are unchanged."));
    const values: unknown[] = [];
    let remaining = keys.length;
    for (const [index, key] of keys.entries()) {
      const request = store.get(key);
      request.onsuccess = () => {
        values[index] = request.result;
        if (--remaining !== 0) return;
        try {
          if (booksStorageFingerprint(values) !== expectedFingerprint) throw new Error(BOOKS_CHANGED_MESSAGE);
          store.put(replacement, keys[0]);
          store.delete(keys[1]);
          store.put(true, keys[2]);
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
    }
  });
}
