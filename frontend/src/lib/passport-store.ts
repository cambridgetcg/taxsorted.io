import {
  buildTaxPositionPassport,
  PASSPORT_EVIDENCE_IDS,
  PASSPORT_INCOME_SOURCE_IDS,
  type MtdIncomeTaxPassportPosition,
  type PassportAnswer,
  type PassportEvidenceId,
  type PassportEvidenceState,
  type PassportIncomeSourceId,
  type TaxPositionPassport,
} from "@taxsorted/engine/uk/passport";
import {
  del as idbDelete,
  get as idbGet,
  set as idbSet,
} from "idb-keyval";

export const TAX_POSITION_PASSPORT_DRAFT_SCHEMA =
  "taxsorted.uk.tax-position-passport.draft/1" as const;

const STORAGE_KEY = "taxsorted-tax-position-passport-draft-v1";

export interface TaxPositionPassportDraft {
  schema: typeof TAX_POSITION_PASSPORT_DRAFT_SCHEMA;
  revision: number;
  createdAt: string;
  updatedAt: string;
  answeredIncomeSourceIds: PassportIncomeSourceId[];
  incomeSources: Record<PassportIncomeSourceId, PassportAnswer>;
  evidence: Record<PassportEvidenceId, PassportEvidenceState>;
  mtdIncomeTaxPosition: MtdIncomeTaxPassportPosition | null;
}

export interface PassportStoreBackend {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
  delete(key: string): unknown;
}

export interface PassportStoreChange {
  source: "local" | "external";
  kind: "saved" | "deleted";
  revision?: number;
}

export interface PassportStore {
  /** Read without creating a Passport value or storing tax facts. */
  load(): Promise<TaxPositionPassportDraft | null>;
  save(draft: TaxPositionPassportDraft): Promise<TaxPositionPassportDraft>;
  delete(expectedRevision: number): Promise<void>;
  subscribe(listener: (change: PassportStoreChange) => void): () => void;
  exportPassport(
    draft: TaxPositionPassportDraft,
    options: {
      selfCheckedAt: string | null;
      storedInBrowser: boolean;
    },
  ): TaxPositionPassport;
  exportJson(
    draft: TaxPositionPassportDraft,
    options: {
      selfCheckedAt: string | null;
      storedInBrowser: boolean;
    },
  ): string;
}

function isIsoInstant(value: unknown): value is string {
  return (
    typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && !Number.isNaN(new Date(value).getTime())
  );
}

function hasExactKeys<T extends string>(
  value: unknown,
  keys: readonly T[],
  allowedValues: ReadonlySet<string>,
): value is Record<T, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length === keys.length
    && entries.every(
      ([key, answer]) =>
        keys.includes(key as T)
        && typeof answer === "string"
        && allowedValues.has(answer),
    )
  );
}

function isUniqueSubset<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T[] {
  return (
    Array.isArray(value)
    && value.every((item): item is T =>
      typeof item === "string" && allowed.includes(item as T)
    )
    && new Set(value).size === value.length
  );
}

export function assertPassportDraft(
  value: unknown,
): asserts value is TaxPositionPassportDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Tax Position Passport could not be read.");
  }
  const draft = value as Partial<TaxPositionPassportDraft>;
  if (
    draft.schema !== TAX_POSITION_PASSPORT_DRAFT_SCHEMA
    || !Number.isInteger(draft.revision)
    || (draft.revision ?? -1) < 0
    || !isIsoInstant(draft.createdAt)
    || !isIsoInstant(draft.updatedAt)
  ) {
    throw new Error("Tax Position Passport has an unsupported or damaged version.");
  }
  if (
    !isUniqueSubset(
      draft.answeredIncomeSourceIds,
      PASSPORT_INCOME_SOURCE_IDS,
    )
    ||
    !hasExactKeys(
      draft.incomeSources,
      PASSPORT_INCOME_SOURCE_IDS,
      new Set(["yes", "no", "unknown"]),
    )
  ) {
    throw new Error("Tax Position Passport income-source facts are invalid.");
  }
  if (
    !hasExactKeys(
      draft.evidence,
      PASSPORT_EVIDENCE_IDS,
      new Set(["held", "missing", "not-checked", "not-expected"]),
    )
  ) {
    throw new Error("Tax Position Passport evidence states are invalid.");
  }
  if (
    !Object.prototype.hasOwnProperty.call(draft, "mtdIncomeTaxPosition")
    || (
      draft.mtdIncomeTaxPosition !== null
      && (
        typeof draft.mtdIncomeTaxPosition !== "object"
        || Array.isArray(draft.mtdIncomeTaxPosition)
      )
    )
  ) {
    throw new Error("Tax Position Passport MTD position is invalid.");
  }
  if (draft.mtdIncomeTaxPosition !== null) {
    buildTaxPositionPassport({
      createdAt: draft.updatedAt,
      storedInBrowser: (draft.revision ?? 0) > 0,
      incomeSources: draft.incomeSources,
      evidence: draft.evidence,
      mtdIncomeTaxPosition: draft.mtdIncomeTaxPosition,
    });
  }
}

export function createEmptyPassportDraft(
  now = new Date().toISOString(),
): TaxPositionPassportDraft {
  return {
    schema: TAX_POSITION_PASSPORT_DRAFT_SCHEMA,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    answeredIncomeSourceIds: [],
    incomeSources: {
      employment: "unknown",
      "self-employment": "unknown",
      "uk-property": "unknown",
      "foreign-property": "unknown",
      "other-or-complex": "unknown",
    },
    evidence: {
      "employment-pay-and-tax": "not-checked",
      "self-employment-return": "not-checked",
      "self-employment-records": "not-checked",
      "uk-property-return": "not-checked",
      "uk-property-records": "not-checked",
      "foreign-property-return": "not-checked",
      "foreign-property-records": "not-checked",
      "mtd-exemption-evidence": "not-checked",
    },
    mtdIncomeTaxPosition: null,
  };
}

function assertCompleteSourceMap(draft: TaxPositionPassportDraft): void {
  if (
    draft.answeredIncomeSourceIds.length
    !== PASSPORT_INCOME_SOURCE_IDS.length
  ) {
    throw new Error(
      "Answer every income-source question before exporting. Not sure is a valid answer.",
    );
  }
}

let idbMutationChain: Promise<unknown> = Promise.resolve();
const backendMutationChains = new WeakMap<object, Promise<unknown>>();

export function createPassportStore(
  backend: PassportStoreBackend | "idb" = "idb",
  now: () => string = () => new Date().toISOString(),
): PassportStore {
  const useIdb = backend === "idb";
  const map = useIdb ? null : backend;
  const subscribers = new Set<(change: PassportStoreChange) => void>();
  const channel =
    useIdb && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("taxsorted-tax-position-passport")
      : null;

  if (channel) {
    channel.onmessage = (event: MessageEvent<{
      revision?: number;
      deleted?: boolean;
    }>) => {
      const change: PassportStoreChange = event.data?.deleted
        ? { source: "external", kind: "deleted" }
        : {
            source: "external",
            kind: "saved",
            revision: event.data?.revision,
          };
      for (const listener of subscribers) listener(change);
    };
  }

  const getValue = async (): Promise<unknown> =>
    useIdb ? await idbGet(STORAGE_KEY) : await map!.get(STORAGE_KEY);

  const setValue = async (value: unknown): Promise<void> => {
    if (useIdb) await idbSet(STORAGE_KEY, value);
    else await map!.set(STORAGE_KEY, structuredClone(value));
  };

  const deleteValue = async (): Promise<void> => {
    if (useIdb) await idbDelete(STORAGE_KEY);
    else await map!.delete(STORAGE_KEY);
  };

  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const prior = useIdb
      ? idbMutationChain
      : (backendMutationChains.get(map as object) ?? Promise.resolve());
    const run = (): Promise<T> => {
      if (useIdb && typeof navigator !== "undefined" && navigator.locks) {
        return navigator.locks.request(STORAGE_KEY, operation) as unknown as Promise<T>;
      }
      return operation();
    };
    const result = prior.then(run);
    const settled = result.then(
      () => undefined,
      () => undefined,
    );
    if (useIdb) idbMutationChain = settled;
    else backendMutationChains.set(map as object, settled);
    return result;
  };

  const load = async (): Promise<TaxPositionPassportDraft | null> => {
    const stored = await getValue();
    if (stored === undefined || stored === null) return null;
    assertPassportDraft(stored);
    return structuredClone(stored);
  };

  return {
    load: () => serialize(load),

    save: (draft) =>
      serialize(async () => {
        assertPassportDraft(draft);
        const stored = await getValue();
        let existing: TaxPositionPassportDraft | null = null;
        if (stored !== undefined && stored !== null) {
          assertPassportDraft(stored);
          existing = stored;
        }
        if (
          (existing && draft.revision !== existing.revision)
          || (!existing && draft.revision !== 0)
        ) {
          throw new Error(
            "This Passport changed in another tab or was deleted. Reload before saving so newer facts are not overwritten.",
          );
        }
        const savedAt = now();
        if (!isIsoInstant(savedAt)) {
          throw new Error("Passport clock must return an ISO UTC instant.");
        }
        const saved: TaxPositionPassportDraft = {
          ...structuredClone(draft),
          revision: (existing?.revision ?? 0) + 1,
          createdAt: existing?.createdAt ?? draft.createdAt,
          updatedAt: savedAt,
        };
        assertPassportDraft(saved);
        await setValue(saved);
        channel?.postMessage({
          schema: TAX_POSITION_PASSPORT_DRAFT_SCHEMA,
          revision: saved.revision,
        });
        for (const listener of subscribers) {
          listener({
            source: "local",
            kind: "saved",
            revision: saved.revision,
          });
        }
        return structuredClone(saved);
      }),

    delete: (expectedRevision) =>
      serialize(async () => {
        const stored = await getValue();
        if (stored !== undefined && stored !== null) {
          assertPassportDraft(stored);
          if (stored.revision !== expectedRevision) {
            throw new Error(
              "This Passport changed in another tab. Reload before deleting so newer facts are not removed.",
            );
          }
        }
        await deleteValue();
        channel?.postMessage({
          schema: TAX_POSITION_PASSPORT_DRAFT_SCHEMA,
          deleted: true,
        });
        for (const listener of subscribers) {
          listener({ source: "local", kind: "deleted" });
        }
      }),

    subscribe: (listener) => {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },

    exportPassport: (draft, options) => {
      assertPassportDraft(draft);
      assertCompleteSourceMap(draft);
      return buildTaxPositionPassport({
        createdAt: now(),
        storedInBrowser: options.storedInBrowser,
        incomeSources: draft.incomeSources,
        evidence: draft.evidence,
        mtdIncomeTaxPosition: draft.mtdIncomeTaxPosition,
        selfCheckedAt: options.selfCheckedAt,
      });
    },

    exportJson: (draft, options) => {
      assertPassportDraft(draft);
      assertCompleteSourceMap(draft);
      return JSON.stringify(
        buildTaxPositionPassport({
          createdAt: now(),
          storedInBrowser: options.storedInBrowser,
          incomeSources: draft.incomeSources,
          evidence: draft.evidence,
          mtdIncomeTaxPosition: draft.mtdIncomeTaxPosition,
          selfCheckedAt: options.selfCheckedAt,
        }),
        null,
        2,
      );
    },
  };
}
