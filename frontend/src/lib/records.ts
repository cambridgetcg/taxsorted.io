// Browser-only persistence for local books. The stored v2 envelope keeps
// accounting events and their history; list() projects only reviewed events
// into the small LedgerRecord shape used by the tax engine.

import { get as idbGet, set as idbSet } from "idb-keyval";
import type {
  LedgerRecord,
  NewLedgerRecord,
  Pence,
  SourceType,
} from "@taxsorted/engine/uk/itsa";
import {
  LOCAL_BOOKS_SCHEMA,
  emptyLocalBooks,
  ensurePrimaryLedger,
  eventFromRecord,
  exactOriginKey,
  invalidateLedgerScope,
  isLocalBooksState,
  migrateLegacyRecords,
  possibleDuplicateKey,
  projectReadyRecords,
  validateAccountingEvent,
  type AccountingEvent,
  type ImportCandidate,
  type ImportConflict,
  type LocalBooksState,
  type LocalLedger,
  type ReviewState,
} from "@/lib/local-books";

const STORAGE_KEY_V2 = "taxsorted-local-books-v2";
const STORAGE_KEY_V1 = "taxsorted-records-v1";
const BOOKS_CSV_SCHEMA = "taxsorted.books.csv/1";

export interface ImportRecordsResult {
  added: AccountingEvent[];
  duplicateCount: number;
  conflicts: ImportConflict[];
}

export interface ReviewEventInput {
  expectedRevision: number;
  reviewState: ReviewState;
  occurredOn?: string;
  amount?: Pence;
  cashDirection?: "in" | "out";
  activity?: SourceType;
  category?: string;
  description?: string | null;
}

export interface RecordsStore {
  /** All reviewed tax projections, across local ledgers. */
  list(): Promise<LedgerRecord[]>;
  listForLedger(ledgerId: string): Promise<LedgerRecord[]>;
  listEvents(): Promise<AccountingEvent[]>;
  state(): Promise<LocalBooksState>;
  add(record: NewLedgerRecord): Promise<AccountingEvent>;
  addMany(records: NewLedgerRecord[]): Promise<AccountingEvent[]>;
  importMany(candidates: ImportCandidate[]): Promise<ImportRecordsResult>;
  review(id: string, input: ReviewEventInput): Promise<AccountingEvent>;
  confirmLedger(ledgerId: string): Promise<LocalLedger>;
  reopenLedger(ledgerId: string): Promise<LocalLedger>;
  linkLedgerToEntity(
    ledgerId: string,
    entity: { entityId: string; entityName: string; hmrcBusinessId?: string } | null
  ): Promise<LocalLedger>;
  /** Refresh when another tab changes these local books or this tab becomes visible. */
  subscribe(listener: () => void): () => void;
  exportJson(): Promise<string>;
  exportCsv(): Promise<string>;
}

export interface RecordsBackend {
  get(key: string): unknown;
  set(key: string, value: unknown): unknown;
  delete(key: string): unknown;
}

const FORMULA_PREFIX = /^\s*[=+\-@\t\r]/;

function csvField(value: string): string {
  const defused = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(defused)) return `"${defused.replace(/"/g, '""')}"`;
  return defused;
}

function poundsString(pence: number): string {
  return (pence / 100).toFixed(2);
}

function validateState(state: LocalBooksState): void {
  const ledgerIds = state.ledgers.map((ledger) => ledger.id);
  const eventIds = state.events.map((event) => event.id);
  if (new Set(ledgerIds).size !== ledgerIds.length) throw new Error("duplicate local ledger ID");
  if (new Set(eventIds).size !== eventIds.length) throw new Error("duplicate accounting event ID");
  for (const ledger of state.ledgers) {
    if (!ledger.id || !ledger.name || !["self-employment", "uk-property"].includes(ledger.activity)) {
      throw new Error("invalid local ledger");
    }
    if (!["needs-confirmation", "confirmed"].includes(ledger.scopeState)) {
      throw new Error("invalid local ledger scope state");
    }
    if (ledger.scopeState === "confirmed" && !ledger.scopeConfirmedAt) {
      throw new Error("confirmed local ledger needs a confirmation time");
    }
    if (ledger.ownerEntityId && (!ledger.ownerEntityName || !ledger.entityLinkedAt)) {
      throw new Error("linked local ledger needs an entity name and link time");
    }
    if (!ledger.ownerEntityId && (ledger.ownerEntityName || ledger.entityLinkedAt)) {
      throw new Error("incomplete local ledger entity link");
    }
    if (ledger.hmrcBusinessId && !ledger.ownerEntityId) {
      throw new Error("HMRC business link needs a TaxSorted entity link");
    }
  }
  state.events.forEach((event) => validateAccountingEvent(event, state.ledgers));

  const exactKeys = state.events
    .map((event) => exactOriginKey(event))
    .filter((key): key is string => key !== null);
  if (new Set(exactKeys).size !== exactKeys.length) {
    throw new Error("duplicate exact source identity");
  }

  const eventIdSet = new Set(eventIds);
  const historyKeys = new Set<string>();
  for (const revision of state.history) {
    const key = `${revision.eventId}:${revision.revision}`;
    if (historyKeys.has(key)) throw new Error("duplicate accounting event revision");
    historyKeys.add(key);
    if (!eventIdSet.has(revision.eventId) || revision.before.id !== revision.eventId) {
      throw new Error("accounting history refers to an unknown event");
    }
    if (revision.before.revision !== revision.revision) {
      throw new Error("accounting history revision does not match its snapshot");
    }
    validateAccountingEvent(revision.before, state.ledgers);
  }

  const importIds = state.imports.map((batch) => batch.id);
  if (new Set(importIds).size !== importIds.length) throw new Error("duplicate import batch ID");
  for (const batch of state.imports) {
    for (const eventId of [...batch.addedEventIds, ...batch.duplicateEventIds]) {
      if (!eventIdSet.has(eventId)) throw new Error("import batch refers to an unknown event");
    }
    for (const conflict of batch.conflicts) {
      if (!eventIdSet.has(conflict.existingEventId)) {
        throw new Error("import conflict refers to an unknown event");
      }
      if (!conflict.externalId || conflict.candidate.origin.externalId !== conflict.externalId) {
        throw new Error("import conflict source identity does not match its candidate");
      }
    }
  }
}

// Every store instance in this tab shares one queue for IndexedDB. Map-like
// test backends share a queue when they share the same backend object.
let idbMutationChain: Promise<unknown> = Promise.resolve();
const backendMutationChains = new WeakMap<object, Promise<unknown>>();

export function createRecordsStore(
  backend: RecordsBackend | "idb" = "idb"
): RecordsStore {
  const useIdb = backend === "idb";
  const map = useIdb ? null : (backend as RecordsBackend);
  const subscribers = new Set<() => void>();
  const channel =
    useIdb && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel("taxsorted-local-books")
      : null;
  if (channel) {
    channel.onmessage = () => {
      for (const listener of subscribers) listener();
    };
  }

  const getValue = async <T>(key: string): Promise<T | undefined> =>
    useIdb
      ? await idbGet<T>(key)
      : ((await map!.get(key)) as T | undefined);

  const setValue = async (key: string, value: unknown): Promise<void> => {
    if (useIdb) await idbSet(key, value);
    else await map!.set(key, structuredClone(value));
  };

  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const prior = useIdb
      ? idbMutationChain
      : (backendMutationChains.get(map as object) ?? Promise.resolve());
    const run = (): Promise<T> => {
      if (useIdb && typeof navigator !== "undefined" && navigator.locks) {
        // Web Locks awaits a promise returned by the callback at runtime; the
        // DOM type bundled with this project models that as a nested promise.
        return navigator.locks.request(STORAGE_KEY_V2, operation) as unknown as Promise<T>;
      }
      return operation();
    };
    const result = prior.then(run);
    const settled = result.then(
      () => undefined,
      () => undefined
    );
    if (useIdb) idbMutationChain = settled;
    else backendMutationChains.set(map as object, settled);
    return result;
  };

  async function loadState(): Promise<LocalBooksState> {
    const stored = await getValue<unknown>(STORAGE_KEY_V2);
    if (stored !== undefined) {
      if (!isLocalBooksState(stored)) {
        throw new Error("Local books could not be read. Your earlier v1 records were not changed.");
      }
      const state = structuredClone(stored);
      validateState(state);

      // An older tab can still append to the v1 array after the first migration.
      // Treat v1 as an append-only migration baseline: merge unseen IDs, but
      // never interpret an absent old ID as a deletion from the v2 books.
      const legacy = await getValue<unknown>(STORAGE_KEY_V1);
      if (Array.isArray(legacy)) {
        const existingIds = new Set(state.events.map((event) => event.id));
        let added = 0;
        const now = new Date().toISOString();
        for (const record of legacy as LedgerRecord[]) {
          if (!record?.id || existingIds.has(record.id)) continue;
          const ledger = ensurePrimaryLedger(state, record.source);
          const event = eventFromRecord(record, {
            id: record.id,
            ledgerId: ledger.id,
            now,
            reviewState: "ready",
            origin: { kind: "legacy", externalId: record.id },
            contentDigest: `legacy:${record.id}`,
            reviewNote:
              "Moved from the earlier local record format. Confirm which separate business this belongs to before filing.",
          });
          validateAccountingEvent(event, state.ledgers);
          state.events.push(event);
          existingIds.add(event.id);
          invalidateLedgerScope(ledger);
          added += 1;
        }
        if (added > 0) {
          state.storeRevision += 1;
          await writeState(state);
        }
      }
      return state;
    }

    const legacy = await getValue<unknown>(STORAGE_KEY_V1);
    const state = Array.isArray(legacy)
      ? migrateLegacyRecords(legacy as LedgerRecord[], new Date().toISOString())
      : emptyLocalBooks();
    await writeState(state);
    // The v1 key deliberately remains untouched as a migration baseline.
    return structuredClone(state);
  }

  async function writeState(state: LocalBooksState): Promise<void> {
    validateState(state);
    await setValue(STORAGE_KEY_V2, state);
    channel?.postMessage({ schema: LOCAL_BOOKS_SCHEMA, storeRevision: state.storeRevision });
  }

  const read = <T>(pick: (state: LocalBooksState) => T): Promise<T> =>
    serialize(async () => structuredClone(pick(await loadState())));

  const mutate = <T>(change: (state: LocalBooksState) => T): Promise<T> =>
    serialize(async () => {
      const state = await loadState();
      const result = change(state);
      state.storeRevision += 1;
      await writeState(state);
      return structuredClone(result);
    });

  function makeManualEvent(
    state: LocalBooksState,
    record: NewLedgerRecord,
    now: string
  ): AccountingEvent {
    const ledger = ensurePrimaryLedger(state, record.source);
    const id = crypto.randomUUID();
    return eventFromRecord(record, {
      id,
      ledgerId: ledger.id,
      now,
      reviewState: "ready",
      origin: { kind: "manual", externalId: id },
      contentDigest: `manual:${id}:1`,
    });
  }

  return {
    list: () => read((state) => projectReadyRecords(state)),

    listForLedger: (ledgerId) => read((state) => projectReadyRecords(state, ledgerId)),

    listEvents: () => read((state) => state.events),

    state: () => read((state) => state),

    subscribe: (listener) => {
      subscribers.add(listener);
      const onVisible = () => {
        if (document.visibilityState === "visible") listener();
      };
      if (useIdb && typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onVisible);
      }
      return () => {
        subscribers.delete(listener);
        if (useIdb && typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", onVisible);
        }
      };
    },

    add: (record) =>
      mutate((state) => {
        const event = makeManualEvent(state, record, new Date().toISOString());
        validateAccountingEvent(event, state.ledgers);
        state.events.push(event);
        invalidateLedgerScope(state.ledgers.find((ledger) => ledger.id === event.ledgerId)!);
        return event;
      }),

    addMany: (records) =>
      mutate((state) => {
        // Build and validate every member before adding any of them.
        const now = new Date().toISOString();
        const events = records.map((record) => makeManualEvent(state, record, now));
        events.forEach((event) => validateAccountingEvent(event, state.ledgers));
        state.events.push(...events);
        for (const ledgerId of new Set(events.map((event) => event.ledgerId))) {
          invalidateLedgerScope(state.ledgers.find((ledger) => ledger.id === ledgerId)!);
        }
        return events;
      }),

    importMany: (candidates) =>
      mutate((state) => {
        const now = new Date().toISOString();
        const exact = new Map(
          state.events
            .map((event) => [exactOriginKey(event), event] as const)
            .filter((entry): entry is readonly [string, AccountingEvent] => entry[0] !== null)
        );
        const possible = new Map<string, AccountingEvent[]>();
        for (const event of state.events) {
          if (!event.possibleDuplicateKey) continue;
          const matches = possible.get(event.possibleDuplicateKey) ?? [];
          matches.push(event);
          possible.set(event.possibleDuplicateKey, matches);
        }

        const added: AccountingEvent[] = [];
        const duplicates: string[] = [];
        const conflicts: ImportConflict[] = [];

        for (const candidate of candidates) {
          if (!candidate.origin.externalId || !candidate.contentDigest) {
            throw new Error("imported records need a stable source ID and content digest");
          }
          // Source identity is independent of accounting activity. Check it
          // before creating the candidate's target ledger; a held correction
          // must not leave behind a permanent empty book.
          const key = exactOriginKey({ origin: candidate.origin })!;
          const existing = exact.get(key);
          if (existing) {
            if (existing.contentDigest === candidate.contentDigest) duplicates.push(existing.id);
            else {
              conflicts.push({
                externalId: candidate.origin.externalId,
                existingEventId: existing.id,
                candidate: structuredClone(candidate),
              });
            }
            continue;
          }

          const ledger = ensurePrimaryLedger(state, candidate.record.source);
          const event = eventFromRecord(candidate.record, {
            id: crypto.randomUUID(),
            ledgerId: ledger.id,
            now,
            reviewState: "needs-review",
            origin: candidate.origin,
            contentDigest: candidate.contentDigest,
            suggestion: candidate.suggestion,
            reviewNote: candidate.reviewNote,
          });

          const similar = event.possibleDuplicateKey
            ? (possible.get(event.possibleDuplicateKey) ?? [])
            : [];
          if (similar.length > 0) {
            event.possibleDuplicateOf = similar.map((match) => match.id);
            const note = `Possible match with ${similar.length} existing record${similar.length === 1 ? "" : "s"}. Keep both if these are genuinely separate payments.`;
            event.reviewNote = event.reviewNote ? `${event.reviewNote}; ${note}` : note;
          }

          validateAccountingEvent(event, state.ledgers);
          state.events.push(event);
          invalidateLedgerScope(ledger);
          added.push(event);
          exact.set(key, event);
          if (event.possibleDuplicateKey) {
            const matches = possible.get(event.possibleDuplicateKey) ?? [];
            matches.push(event);
            possible.set(event.possibleDuplicateKey, matches);
          }
        }

        state.imports.push({
          id: crypto.randomUUID(),
          source: candidates[0]?.origin.kind ?? "bank-csv",
          importedAt: now,
          addedEventIds: added.map((event) => event.id),
          duplicateEventIds: duplicates,
          conflicts,
        });

        return { added, duplicateCount: duplicates.length, conflicts };
      }),

    review: (id, input) =>
      mutate((state) => {
        const index = state.events.findIndex((event) => event.id === id);
        if (index < 0) throw new Error("record not found");
        const current = state.events[index];
        if (current.revision !== input.expectedRevision) {
          throw new Error("This record changed in another view. Reload it before deciding.");
        }
        const editsPosting =
          input.occurredOn !== undefined ||
          input.amount !== undefined ||
          input.cashDirection !== undefined ||
          input.activity !== undefined ||
          input.category !== undefined ||
          input.description !== undefined;
        if (editsPosting && current.postings.length !== 1) {
          throw new Error("A multi-part event must be reviewed posting by posting.");
        }

        const before = structuredClone(current);
        const currentLedger = state.ledgers.find((ledger) => ledger.id === current.ledgerId);
        if (!currentLedger) throw new Error("ledger not found");
        const nextLedger =
          input.activity && input.activity !== currentLedger.activity
            ? ensurePrimaryLedger(state, input.activity)
            : currentLedger;
        const nextDirection = input.cashDirection ?? current.cash.direction;
        const currentPosting = current.postings[0];
        const nextPosting = editsPosting
          ? {
              ...currentPosting,
              amount: input.amount ?? currentPosting.amount,
              kind:
                input.cashDirection === undefined
                  ? currentPosting.kind
                  : input.cashDirection === "in"
                    ? ("income" as const)
                    : ("expense" as const),
              effect:
                input.cashDirection === undefined
                  ? currentPosting.effect
                  : ("increase" as const),
              category: input.category ?? currentPosting.category,
            }
          : currentPosting;
        const next: AccountingEvent = {
          ...current,
          ledgerId: nextLedger.id,
          revision: current.revision + 1,
          reviewState: input.reviewState,
          occurredOn: input.occurredOn ?? current.occurredOn,
          cash: {
            ...current.cash,
            amount: input.amount ?? current.cash.amount,
            direction: nextDirection,
          },
          updatedAt: new Date().toISOString(),
          postings: editsPosting ? [nextPosting] : current.postings,
        };
        if (input.description !== undefined) {
          if (input.description === null || input.description.trim() === "") delete next.description;
          else next.description = input.description;
        }
        if (editsPosting) {
          next.possibleDuplicateKey = possibleDuplicateKey(
            {
              date: next.occurredOn,
              amount: next.cash.amount,
              kind: nextPosting.kind,
              category: nextPosting.category,
              source: nextLedger.activity,
              description: next.description,
              effect: nextPosting.effect,
            },
            nextLedger.id
          );
        }
        validateAccountingEvent(next, state.ledgers);
        if (nextLedger.id !== currentLedger.id) {
          invalidateLedgerScope(currentLedger);
          invalidateLedgerScope(nextLedger);
        }
        state.history.push({
          eventId: current.id,
          revision: current.revision,
          changedAt: next.updatedAt,
          reason:
            input.reviewState === "excluded"
              ? "Left out after review"
              : input.reviewState === "needs-review"
                ? "Returned to the inbox for review"
                : current.reviewState === "excluded"
                  ? "Restored after review"
                  : "Confirmed after review",
          before,
        });
        state.events[index] = next;
        return next;
      }),

    confirmLedger: (ledgerId) =>
      mutate((state) => {
        const ledger = state.ledgers.find((candidate) => candidate.id === ledgerId);
        if (!ledger) throw new Error("ledger not found");
        ledger.scopeState = "confirmed";
        ledger.scopeConfirmedAt = new Date().toISOString();
        return ledger;
      }),

    reopenLedger: (ledgerId) =>
      mutate((state) => {
        const ledger = state.ledgers.find((candidate) => candidate.id === ledgerId);
        if (!ledger) throw new Error("ledger not found");
        invalidateLedgerScope(ledger);
        return ledger;
      }),

    linkLedgerToEntity: (ledgerId, entity) =>
      mutate((state) => {
        const ledger = state.ledgers.find((candidate) => candidate.id === ledgerId);
        if (!ledger) throw new Error("ledger not found");
        if (entity && (!entity.entityId.trim() || !entity.entityName.trim())) {
          throw new Error("entity link needs an ID and name");
        }
        if (entity?.hmrcBusinessId !== undefined && !entity.hmrcBusinessId.trim()) {
          throw new Error("HMRC business ID cannot be blank");
        }
        if (entity) {
          ledger.ownerEntityId = entity.entityId;
          ledger.ownerEntityName = entity.entityName;
          ledger.entityLinkedAt = new Date().toISOString();
          if (entity.hmrcBusinessId) ledger.hmrcBusinessId = entity.hmrcBusinessId;
          else delete ledger.hmrcBusinessId;
        } else {
          delete ledger.ownerEntityId;
          delete ledger.ownerEntityName;
          delete ledger.entityLinkedAt;
          delete ledger.hmrcBusinessId;
        }
        invalidateLedgerScope(ledger);
        return ledger;
      }),

    exportJson: async () => {
      const state = await read((value) => value);
      return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
    },

    exportCsv: async () => {
      const state = await read((value) => value);
      const ledgerById = new Map(state.ledgers.map((ledger) => [ledger.id, ledger]));
      const header = [
        "schema_version",
        "event_id",
        "event_revision",
        "ledger_id",
        "posting_number",
        "date",
        "cash_amount",
        "cash_direction",
        "kind",
        "effect",
        "category",
        "amount",
        "currency",
        "source",
        "ledger_name",
        "owner_entity_id",
        "owner_entity_name",
        "hmrc_business_id",
        "account_scope",
        "description",
        "origin",
        "external_id",
        "source_revision",
        "reversal_event_id",
        "reversal_event_revision",
      ].join(",");
      const rows: string[] = [];
      for (const event of state.events) {
        if (event.reviewState !== "ready") continue;
        const ledger = ledgerById.get(event.ledgerId);
        if (!ledger) continue;
        if (ledger.scopeState !== "confirmed") continue;
        event.postings.forEach((posting, index) => {
          rows.push(
            [
              BOOKS_CSV_SCHEMA,
              event.id,
              String(event.revision),
              event.ledgerId,
              String(index + 1),
              event.occurredOn,
              poundsString(event.cash.amount),
              event.cash.direction,
              posting.kind,
              posting.effect,
              posting.category,
              poundsString(posting.amount),
              event.cash.currency,
              ledger.activity,
              ledger.name,
              ledger.ownerEntityId ?? "",
              ledger.ownerEntityName ?? "",
              ledger.hmrcBusinessId ?? "",
              event.origin.accountScope ?? "",
              event.description ?? "",
              event.origin.kind,
              event.origin.externalId ?? "",
              event.origin.sourceRevision === undefined ? "" : String(event.origin.sourceRevision),
              event.reversalOf?.eventId ?? "",
              event.reversalOf === undefined ? "" : String(event.reversalOf.revision),
            ]
              .map(csvField)
              .join(",")
          );
        });
      }
      return [header, ...rows].join("\n");
    },
  };
}
