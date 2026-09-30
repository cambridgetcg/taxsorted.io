import { createWorkspaceSession } from "@/lib/workspace-storage";
import { assertPreparationDraft, PREPARATION_YEARS, type PreparationDraft, type PreparationYear } from "@/lib/return-preparation";

export interface PreparationStoreBackend {
  get(key: string): unknown | Promise<unknown>;
  set(key: string, value: unknown): unknown | Promise<unknown>;
}
export interface ReturnPreparationStore {
  load(): Promise<PreparationDraft | null>;
  save(draft: PreparationDraft): Promise<PreparationDraft>;
}
export const PREPARATION_CHANGED_MESSAGE = "This preparation changed or was deleted after you opened it. Load the saved preparation again before saving; your current entries have not overwritten it.";
export function preparationStorageKey(year: PreparationYear): string {
  if (!PREPARATION_YEARS.includes(year)) throw new Error("Choose a supported preparation year.");
  return `taxsorted-return-preparation-v1:${year}`;
}
const backendQueues = new WeakMap<object, Promise<unknown>>();

/** Constructor has no reads, writes, subscriptions, migrations or network. */
export function createReturnPreparationStore(
  year: PreparationYear,
  backend: PreparationStoreBackend | "idb" = "idb",
  now: () => string = () => new Date().toISOString(),
): ReturnPreparationStore {
  const key = preparationStorageKey(year);
  const session = backend === "idb" ? createWorkspaceSession() : null;
  function readValue(value: unknown): PreparationDraft | null {
    if (value === undefined) return null;
    assertPreparationDraft(value);
    if (value.year !== year || value.revision < 1) throw new Error("The saved preparation does not match its year or saved revision. It has not been replaced.");
    return structuredClone(value);
  }
  function serialize<T>(action: () => Promise<T>): Promise<T> {
    if (backend === "idb") return action(); // Native update is one atomic read/write transaction.
    const previous = backendQueues.get(backend) ?? Promise.resolve();
    const result = previous.then(action);
    backendQueues.set(backend, result.then(() => undefined, () => undefined));
    return result;
  }
  return {
    load: () => serialize(async () => readValue(session ? await session.read(key) : await (backend as PreparationStoreBackend).get(key))),
    save(draft) {
      // Capture caller state before async work, so edits during a pending save
      // cannot silently become the committed value.
      let proposed: PreparationDraft;
      try {
        assertPreparationDraft(draft);
        if (draft.year !== year) throw new Error("Choose the matching preparation year before saving.");
        proposed = structuredClone(draft);
      } catch (error) { return Promise.reject(error); }
      return serialize(async () => {
        let saved: PreparationDraft | undefined;
        const replace = (raw: unknown): PreparationDraft => {
          const existing = readValue(raw);
          if ((existing && (existing.revision !== proposed.revision || existing.createdAt !== proposed.createdAt))
            || (!existing && proposed.revision !== 0)) throw new Error(PREPARATION_CHANGED_MESSAGE);
          saved = {
            ...proposed,
            revision: proposed.revision + 1,
            createdAt: existing?.createdAt ?? proposed.createdAt,
            updatedAt: now(),
          };
          if (existing && saved.updatedAt < existing.updatedAt) throw new Error("The device clock is earlier than the saved preparation. Check the clock before saving.");
          assertPreparationDraft(saved);
          return saved;
        };
        if (session) await session.update(key, replace);
        else await (backend as PreparationStoreBackend).set(key, structuredClone(replace(await (backend as PreparationStoreBackend).get(key))));
        return structuredClone(saved!);
      });
    },
  };
}
