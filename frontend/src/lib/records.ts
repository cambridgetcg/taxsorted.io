// Browser-only persistence for local books. The stored v3 envelope keeps
// accounting events, provider source versions and sync evidence together;
// list() projects only reviewed events into the tax engine's small shape.

import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import type {
  LedgerRecord,
  NewLedgerRecord,
  Pence,
  SourceType,
} from "@taxsorted/engine/uk/itsa";
import {
  assertPageManifest,
  canonicalAccountingJson,
} from "@taxsorted/engine/accounting-sync";
import {
  LEGACY_LOCAL_BOOKS_SCHEMA,
  LOCAL_BOOKS_SCHEMA,
  emptyLocalBooks,
  ensurePrimaryLedger,
  eventFromRecord,
  exactOriginKey,
  invalidateLedgerScope,
  isLocalBooksState,
  migrateLegacyRecords,
  possibleDuplicateKey,
  providerRecordIdentityKey,
  projectReadyRecords,
  validateAccountingEvent,
  type AccountingEvent,
  type AccountingProvider,
  type CapabilityObservation,
  type DatasetCheckpoint,
  type ImportCandidate,
  type ImportConflict,
  type LocalBooksState,
  type LocalLedger,
  type LocalSyncRun,
  type NormalizedProviderRecordVersion,
  type ProviderEnvironment,
  type ProviderLedgerBinding,
  type ProviderPageManifest,
  type ProviderRecordIdentity,
  type RawProviderRecordVersion,
  type ReviewState,
} from "@/lib/local-books";

// Keep the established key while the envelope advances to /3. An old /2 tab
// re-reads before every mutation, rejects /3 and therefore fails closed rather
// than overwriting a second key with stale books.
const STORAGE_KEY = "taxsorted-local-books-v2";
const STORAGE_KEY_V1 = "taxsorted-records-v1";
const SYNTHETIC_DEMO_STORAGE_PREFIX = "taxsorted-synthetic-accounting-demo:";
const BOOKS_CSV_SCHEMA = "taxsorted.books.csv/1";

async function accountingDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalAccountingJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

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

export interface BindProviderConnectionInput {
  expectedLocalReplicaId: string;
  sourceConnectionId: string;
  entityId: string;
  entityName: string;
  syncReplicaId: string;
  provider: AccountingProvider;
  environment: ProviderEnvironment;
  organisationId: string;
  organisationName: string;
  activity: SourceType;
  capabilities: CapabilityObservation[];
  boundAt?: string;
}

export interface ProviderSyncRunInput {
  id: string;
  sourceConnectionId: string;
  syncReplicaId: string;
  localReplicaId: string;
  dataset: string;
  kind: LocalSyncRun["kind"];
  fence: string;
  startedAt: string;
}

export interface CommitProviderPageInput {
  run: ProviderSyncRunInput;
  manifest: ProviderPageManifest;
  rawVersions: RawProviderRecordVersion[];
  normalizedVersions: NormalizedProviderRecordVersion[];
  candidates: ImportCandidate[];
  committedAt?: string;
}

export interface ProviderPageCommitResult {
  manifestId: string;
  digest: string;
  added: number;
  duplicates: number;
  conflicts: number;
  replayed: boolean;
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
  bindProviderConnection(input: BindProviderConnectionInput): Promise<ProviderLedgerBinding>;
  commitProviderPage(input: CommitProviderPageInput): Promise<ProviderPageCommitResult>;
  markProviderPageAcknowledged(input: {
    localReplicaId: string;
    runId: string;
    manifestId: string;
    digest: string;
    acknowledgedAt?: string;
  }): Promise<void>;
  completeProviderSync(input: {
    localReplicaId: string;
    runId: string;
    checkpoint: DatasetCheckpoint;
    finishedAt?: string;
  }): Promise<DatasetCheckpoint>;
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

function assertProviderCandidateMapping(input: CommitProviderPageInput): void {
  const normalizedByCandidate = new Map<string, NormalizedProviderRecordVersion[]>();
  for (const version of input.normalizedVersions) {
    const externalId = version.candidateExternalId;
    const digest = version.candidateContentDigest;
    if ((externalId === undefined) !== (digest === undefined)) {
      throw new Error("A normalised provider candidate needs both its source ID and content digest.");
    }
    if (externalId === undefined || digest === undefined) continue;
    if (
      typeof externalId !== "string" ||
      !externalId.trim() ||
      typeof digest !== "string" ||
      !digest.trim()
    ) {
      throw new Error("A normalised provider candidate needs a stable source ID and content digest.");
    }
    const key = JSON.stringify([externalId, digest]);
    const matches = normalizedByCandidate.get(key) ?? [];
    matches.push(version);
    normalizedByCandidate.set(key, matches);
  }

  const candidateKeys = new Set<string>();
  const candidateExternalIds = new Set<string>();
  for (const candidate of input.candidates) {
    if (
      typeof candidate.origin.externalId !== "string" ||
      !candidate.origin.externalId.trim() ||
      typeof candidate.contentDigest !== "string" ||
      !candidate.contentDigest.trim()
    ) {
      throw new Error("A provider review candidate needs a stable source ID and content digest.");
    }
    const key = JSON.stringify([candidate.origin.externalId, candidate.contentDigest]);
    if (
      candidateExternalIds.has(candidate.origin.externalId) ||
      candidateKeys.has(key) ||
      normalizedByCandidate.get(key)?.length !== 1
    ) {
      throw new Error("Each provider review candidate must link to one normalised outcome.");
    }
    candidateExternalIds.add(candidate.origin.externalId);
    candidateKeys.add(key);
  }
  for (const [key, versions] of normalizedByCandidate) {
    if (versions.length !== 1 || !candidateKeys.has(key)) {
      throw new Error("Each normalised provider candidate must link to one review candidate.");
    }
  }
}

function assertSyntheticPageMapping(input: CommitProviderPageInput): void {
  if (input.normalizedVersions.some((version) => version.mappedEventId !== undefined)) {
    throw new Error("Only the local store may link a normalised outcome to a review event.");
  }
  if (input.normalizedVersions.length !== input.rawVersions.length) {
    throw new Error("Each raw provider record needs exactly one normalised outcome on this adapter.");
  }
  if (input.candidates.length !== input.normalizedVersions.length) {
    throw new Error("Each made-up normalised outcome needs exactly one review candidate.");
  }
  const rawById = new Map(input.rawVersions.map((version) => [version.id, version]));
  const candidateIds = new Set<string>();
  const normalizedRawIds = new Set<string>();
  for (const version of input.normalizedVersions) {
    const raw = rawById.get(version.rawVersionId);
    const candidate = input.candidates.find(
      (item) => item.origin.externalId === version.candidateExternalId
    );
    if (
      !raw ||
      normalizedRawIds.has(version.rawVersionId) ||
      !version.candidateExternalId ||
      candidateIds.has(version.candidateExternalId) ||
      !candidate ||
      candidate.origin.externalId !== raw.identity.objectId ||
      candidate.record.date !== version.occurredOn ||
      candidate.record.amount !== version.amountPence ||
      candidate.record.kind !== version.suggestedKind ||
      candidate.record.category !== version.suggestedCategory ||
      candidate.record.source !== version.activity ||
      (candidate.record.description ?? undefined) !== version.description ||
      candidate.contentDigest !== version.candidateContentDigest
    ) {
      throw new Error("A made-up review candidate does not match its normalised source outcome.");
    }
    normalizedRawIds.add(version.rawVersionId);
    candidateIds.add(version.candidateExternalId);
  }
}

function immutableNormalizedVersion(version: NormalizedProviderRecordVersion) {
  const immutable = { ...version };
  delete immutable.mappedEventId;
  return immutable;
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

interface StoredLocalBooksV2 {
  schema: typeof LEGACY_LOCAL_BOOKS_SCHEMA;
  storeRevision: number;
  ledgers: LocalLedger[];
  events: AccountingEvent[];
  history: LocalBooksState["history"];
  imports: LocalBooksState["imports"];
}

function isStoredLocalBooksV2(value: unknown): value is StoredLocalBooksV2 {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredLocalBooksV2>;
  return (
    candidate.schema === LEGACY_LOCAL_BOOKS_SCHEMA &&
    Number.isInteger(candidate.storeRevision) &&
    Array.isArray(candidate.ledgers) &&
    Array.isArray(candidate.events) &&
    Array.isArray(candidate.history) &&
    Array.isArray(candidate.imports)
  );
}

function withOpaqueRevision<T extends { origin: AccountingEvent["origin"] }>(value: T): T {
  const cloned = structuredClone(value);
  const oldRevision = (cloned.origin as { sourceRevision?: unknown }).sourceRevision;
  if (oldRevision !== undefined) cloned.origin.sourceRevision = String(oldRevision);
  return cloned;
}

function migrateStoredV2(
  legacy: StoredLocalBooksV2,
  migratedAt: string,
  replicaId = crypto.randomUUID()
): LocalBooksState {
  const state = emptyLocalBooks({ replicaId, createdAt: migratedAt });
  state.storeRevision = legacy.storeRevision + 1;
  state.ledgers = structuredClone(legacy.ledgers);
  state.events = legacy.events.map(withOpaqueRevision);
  state.history = legacy.history.map((revision) => ({
    ...structuredClone(revision),
    before: withOpaqueRevision(revision.before),
  }));
  state.imports = legacy.imports.map((batch) => ({
    ...structuredClone(batch),
    conflicts: batch.conflicts.map((conflict) => ({
      ...structuredClone(conflict),
      candidate: withOpaqueRevision(conflict.candidate),
    })),
  }));
  state.conflictCases = state.imports.flatMap((batch) =>
    batch.conflicts.map((conflict, index) => ({
      id: `legacy-import:${batch.id}:${index}`,
      kind: "changed-source" as const,
      status: "open" as const,
      openedAt: batch.importedAt || migratedAt,
      sourceKey: exactOriginKey({ origin: conflict.candidate.origin }) ??
        `${conflict.candidate.origin.kind}:${conflict.externalId}`,
      existingEventId: conflict.existingEventId,
      candidate: structuredClone(conflict.candidate),
    }))
  );
  return state;
}

function validateState(state: LocalBooksState): void {
  if (!state.replica.id || !state.replica.createdAt) {
    throw new Error("local books need one browser installation identity");
  }
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

  const bindingIds = state.providerBindings.map((binding) => binding.sourceConnectionId);
  if (new Set(bindingIds).size !== bindingIds.length) {
    throw new Error("duplicate provider source connection binding");
  }
  const syncReplicaIds = new Set<string>();
  for (const binding of state.providerBindings) {
    if (
      !binding.sourceConnectionId ||
      !binding.entityId ||
      !binding.syncReplicaId ||
      !binding.organisationId ||
      !binding.organisationName ||
      !ledgerIds.includes(binding.ledgerId)
    ) {
      throw new Error("invalid provider ledger binding");
    }
    if (syncReplicaIds.has(binding.syncReplicaId)) {
      throw new Error("duplicate provider sync replica binding");
    }
    syncReplicaIds.add(binding.syncReplicaId);
    if (!Array.isArray(binding.capabilities)) throw new Error("invalid provider capabilities");
    const boundLedger = state.ledgers.find((ledger) => ledger.id === binding.ledgerId);
    if (boundLedger?.ownerEntityId !== binding.entityId) {
      throw new Error("provider source entity does not match its local ledger");
    }
  }

  const rawIds = state.rawProviderVersions.map((version) => version.id);
  if (new Set(rawIds).size !== rawIds.length) throw new Error("duplicate raw provider version ID");
  const rawIdentityVersions = new Set<string>();
  for (const version of state.rawProviderVersions) {
    if (!version.id || !version.payloadDigest || !version.observedAt) {
      throw new Error("invalid raw provider version");
    }
    const identityKey = providerRecordIdentityKey(version.identity);
    const versionKey = JSON.stringify([identityKey, version.payloadDigest]);
    if (rawIdentityVersions.has(versionKey)) {
      throw new Error("duplicate raw provider identity version");
    }
    rawIdentityVersions.add(versionKey);
  }

  const rawIdSet = new Set(rawIds);
  const normalizedIds = state.normalizedProviderVersions.map((version) => version.id);
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new Error("duplicate normalized provider version ID");
  }
  for (const version of state.normalizedProviderVersions) {
    if (!version.id || !version.mapperVersion || !rawIdSet.has(version.rawVersionId)) {
      throw new Error("invalid normalized provider version");
    }
    if (!Array.isArray(version.limitations)) throw new Error("invalid normalized limitations");
  }

  const decimal = /^(0|[1-9]\d*)$/;
  const runIds = state.syncRuns.map((run) => run.id);
  if (new Set(runIds).size !== runIds.length) throw new Error("duplicate provider sync run ID");
  for (const run of state.syncRuns) {
    const binding = state.providerBindings.find(
      (candidate) => candidate.sourceConnectionId === run.sourceConnectionId
    );
    if (
      !binding ||
      binding.syncReplicaId !== run.syncReplicaId ||
      !decimal.test(run.fence) ||
      !Array.isArray(run.pages)
    ) {
      throw new Error("invalid provider sync run");
    }
    const manifests = run.pages.map((page) => page.manifest.id);
    const sequences = run.pages.map((page) => page.manifest.sequence);
    if (
      new Set(manifests).size !== manifests.length ||
      new Set(sequences).size !== sequences.length ||
      run.pages.some(
        (page, index) => {
          assertPageManifest(page.manifest);
          const prior = index > 0 ? run.pages[index - 1]!.manifest : null;
          const pageRawIds = new Set(page.rawVersionIds);
          const pageNormalized = page.normalizedVersionIds.map((id) =>
            state.normalizedProviderVersions.find((version) => version.id === id)
          );
          return (
            page.manifest.runId !== run.id ||
            page.manifest.sourceConnectionId !== run.sourceConnectionId ||
            page.manifest.replicaId !== run.syncReplicaId ||
            page.manifest.dataset !== run.dataset ||
            page.manifest.fence !== run.fence ||
            page.manifest.sequence !== index ||
            (prior !== null &&
              (prior.final ||
                page.manifest.currentCursor !== prior.nextCursor ||
                page.manifest.dirtyGeneration !== prior.dirtyGeneration)) ||
            page.rawVersionIds.length !== page.manifest.recordCount ||
            page.rawVersionIds.some((id) => !rawIdSet.has(id)) ||
            page.normalizedVersionIds.some((id) => !normalizedIds.includes(id)) ||
            pageRawIds.size !== page.rawVersionIds.length ||
            new Set(page.normalizedVersionIds).size !== page.normalizedVersionIds.length ||
            pageNormalized.some(
              (version) => !version || !pageRawIds.has(version.rawVersionId)
            )
          );
        }
      )
    ) {
      throw new Error("invalid provider sync page history");
    }
  }

  const checkpointKeys = new Set<string>();
  for (const checkpoint of state.datasetCheckpoints) {
    const key = JSON.stringify([
      checkpoint.sourceConnectionId,
      checkpoint.syncReplicaId,
      checkpoint.dataset,
    ]);
    if (
      checkpointKeys.has(key) ||
      !checkpoint.completedRunId ||
      !checkpoint.committedCursor ||
      !checkpoint.coverageMarker ||
      !decimal.test(checkpoint.dirtyGeneration) ||
      !Number.isSafeInteger(checkpoint.recordCount) ||
      checkpoint.recordCount < 0 ||
      !Number.isSafeInteger(checkpoint.pageCount) ||
      checkpoint.pageCount < 1
    ) {
      throw new Error("invalid provider dataset checkpoint");
    }
    checkpointKeys.add(key);
  }

  const conflictIds = state.conflictCases.map((conflict) => conflict.id);
  if (new Set(conflictIds).size !== conflictIds.length) {
    throw new Error("duplicate provider conflict case ID");
  }
  for (const conflict of state.conflictCases) {
    if (!conflict.id || !conflict.sourceKey || !conflict.openedAt) {
      throw new Error("invalid provider conflict case");
    }
    if (conflict.existingEventId && !eventIdSet.has(conflict.existingEventId)) {
      throw new Error("provider conflict refers to an unknown event");
    }
  }
}

function providerIdentityFromCandidate(candidate: ImportCandidate): ProviderRecordIdentity | null {
  if (candidate.origin.kind !== "accounting-provider" || !candidate.origin.provider) return null;
  return {
    ...candidate.origin.provider,
    objectId: candidate.origin.externalId,
  };
}

function applyImportCandidates(
  state: LocalBooksState,
  candidates: ImportCandidate[],
  context: {
    now: string;
    batchId?: string;
    source?: ImportCandidate["origin"]["kind"];
  }
): ImportRecordsResult {
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
    const key = exactOriginKey({ origin: candidate.origin });
    if (!key) throw new Error("imported provider records need a complete source namespace");
    const existing = exact.get(key);
    if (existing) {
      if (existing.contentDigest === candidate.contentDigest) duplicates.push(existing.id);
      else {
        const conflict: ImportConflict = {
          externalId: candidate.origin.externalId,
          existingEventId: existing.id,
          candidate: structuredClone(candidate),
        };
        conflicts.push(conflict);
        const sourceIdentity = providerIdentityFromCandidate(candidate);
        if (sourceIdentity) {
          const conflictId = JSON.stringify([
            "changed-source",
            providerRecordIdentityKey(sourceIdentity),
            candidate.contentDigest,
          ]);
          if (!state.conflictCases.some((item) => item.id === conflictId)) {
            state.conflictCases.push({
              id: conflictId,
              kind: "changed-source",
              status: "open",
              openedAt: context.now,
              sourceKey: key,
              sourceIdentity,
              existingEventId: existing.id,
              candidate: structuredClone(candidate),
            });
          }
        }
      }
      continue;
    }

    const ledger = ensurePrimaryLedger(state, candidate.record.source);
    const event = eventFromRecord(candidate.record, {
      id: crypto.randomUUID(),
      ledgerId: ledger.id,
      now: context.now,
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
    id: context.batchId ?? crypto.randomUUID(),
    source: context.source ?? candidates[0]?.origin.kind ?? "bank-csv",
    importedAt: context.now,
    addedEventIds: added.map((event) => event.id),
    duplicateEventIds: duplicates,
    conflicts,
  });

  return { added, duplicateCount: duplicates.length, conflicts };
}

// Every store instance in this tab shares one queue for IndexedDB. Map-like
// test backends share a queue when they share the same backend object.
let idbMutationChain: Promise<unknown> = Promise.resolve();
const backendMutationChains = new WeakMap<object, Promise<unknown>>();

export function createRecordsStore(
  backend: RecordsBackend | "idb" = "idb",
  scope: { storagePrefix?: string; channelName?: string } = {}
): RecordsStore {
  const useIdb = backend === "idb";
  const map = useIdb ? null : (backend as RecordsBackend);
  const storagePrefix = useIdb ? (scope.storagePrefix ?? "") : "";
  const physicalKey = (key: string) => storagePrefix + key;
  const lockName = physicalKey(STORAGE_KEY);
  const subscribers = new Set<() => void>();
  const channel =
    useIdb && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(scope.channelName ?? "taxsorted-local-books")
      : null;
  if (channel) {
    channel.onmessage = () => {
      for (const listener of subscribers) listener();
    };
  }

  const getValue = async <T>(key: string): Promise<T | undefined> =>
    useIdb
      ? await idbGet<T>(physicalKey(key))
      : ((await map!.get(key)) as T | undefined);

  const setValue = async (key: string, value: unknown): Promise<void> => {
    if (useIdb) await idbSet(physicalKey(key), value);
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
        return navigator.locks.request(lockName, operation) as unknown as Promise<T>;
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
    const stored = await getValue<unknown>(STORAGE_KEY);
    if (stored !== undefined) {
      let state: LocalBooksState;
      if (isLocalBooksState(stored)) {
        state = structuredClone(stored);
      } else if (isStoredLocalBooksV2(stored)) {
        state = migrateStoredV2(stored, new Date().toISOString());
        validateState(state);
        await writeState(state);
      } else {
        throw new Error("Local books could not be read. Your earlier v1 records were not changed.");
      }
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
    await setValue(STORAGE_KEY, state);
    channel?.postMessage({ schema: LOCAL_BOOKS_SCHEMA, storeRevision: state.storeRevision });
  }

  const read = <T>(pick: (state: LocalBooksState) => T): Promise<T> =>
    serialize(async () => structuredClone(pick(await loadState())));

  const mutate = <T>(change: (state: LocalBooksState) => T | Promise<T>): Promise<T> =>
    serialize(async () => {
      const state = await loadState();
      const result = await change(state);
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
      mutate((state) => applyImportCandidates(state, candidates, { now: new Date().toISOString() })),

    bindProviderConnection: (input) =>
      mutate((state) => {
        if (state.replica.id !== input.expectedLocalReplicaId) {
          throw new Error("The local books changed browser identity before the source was bound.");
        }
        const duplicateReplica = state.providerBindings.find(
          (binding) =>
            binding.syncReplicaId === input.syncReplicaId &&
            binding.sourceConnectionId !== input.sourceConnectionId
        );
        if (duplicateReplica) throw new Error("That sync replica already belongs to another source.");

        const ledger = ensurePrimaryLedger(state, input.activity);
        if (ledger.ownerEntityId && ledger.ownerEntityId !== input.entityId) {
          throw new Error(
            "This local ledger already belongs to another TaxSorted entity. Choose the matching entity or a different activity."
          );
        }
        const existing = state.providerBindings.find(
          (binding) => binding.sourceConnectionId === input.sourceConnectionId
        );
        if (existing) {
          if (
            existing.entityId !== input.entityId ||
            existing.provider !== input.provider ||
            existing.environment !== input.environment ||
            existing.organisationId !== input.organisationId ||
            existing.syncReplicaId !== input.syncReplicaId ||
            existing.ledgerId !== ledger.id
          ) {
            throw new Error(
              "A source connection cannot be rebound to another provider organisation, replica or ledger."
            );
          }
          existing.organisationName = input.organisationName;
          existing.state = "active";
          existing.capabilities = structuredClone(input.capabilities);
          ledger.ownerEntityName = input.entityName;
          return existing;
        }

        const boundAt = input.boundAt ?? new Date().toISOString();
        ledger.ownerEntityId = input.entityId;
        ledger.ownerEntityName = input.entityName;
        ledger.entityLinkedAt ??= boundAt;
        invalidateLedgerScope(ledger);
        const binding: ProviderLedgerBinding = {
          sourceConnectionId: input.sourceConnectionId,
          entityId: input.entityId,
          syncReplicaId: input.syncReplicaId,
          provider: input.provider,
          environment: input.environment,
          organisationId: input.organisationId,
          organisationName: input.organisationName,
          ledgerId: ledger.id,
          state: "active",
          boundAt,
          capabilities: structuredClone(input.capabilities),
        };
        state.providerBindings.push(binding);
        return binding;
      }),

    commitProviderPage: async (untrustedInput) => {
      // Hash and persist one private snapshot. Caller-owned objects cannot be
      // changed while the digest is awaiting Web Crypto.
      const input = structuredClone(untrustedInput);
      const payloads = input.rawVersions.map((version) => version.payload);
      if ((await accountingDigest(payloads)) !== input.manifest.digest) {
        throw new Error("The raw provider bodies do not match the API page digest.");
      }
      for (const version of input.rawVersions) {
        if ((await accountingDigest(version.payload)) !== version.payloadDigest) {
          throw new Error("A raw provider body does not match its stored payload digest.");
        }
      }
      return mutate((state) => {
        if (state.replica.id !== input.run.localReplicaId) {
          throw new Error("The local books changed browser identity before this page was saved.");
        }
        const { manifest } = input;
        assertPageManifest(manifest);
        const binding = state.providerBindings.find(
          (candidate) => candidate.sourceConnectionId === input.run.sourceConnectionId
        );
        if (!binding || binding.state !== "active") {
          throw new Error("The provider source is not active in these local books.");
        }
        if (
          binding.syncReplicaId !== input.run.syncReplicaId ||
          manifest.replicaId !== input.run.syncReplicaId ||
          manifest.sourceConnectionId !== input.run.sourceConnectionId ||
          manifest.runId !== input.run.id ||
          manifest.dataset !== input.run.dataset ||
          manifest.fence !== input.run.fence ||
          !/^(0|[1-9]\d*)$/.test(input.run.fence)
        ) {
          throw new Error("Provider sync page does not belong to this source and replica.");
        }
        if (!Number.isInteger(manifest.sequence) || manifest.sequence < 0) {
          throw new Error("Provider sync page sequence is invalid.");
        }
        if (manifest.recordCount !== input.rawVersions.length) {
          throw new Error("Provider sync page count does not match its manifest.");
        }
        if (input.normalizedVersions.some((version) => version.mappedEventId !== undefined)) {
          throw new Error("Only the local store may link a normalised outcome to a review event.");
        }
        assertProviderCandidateMapping(input);
        if (binding.provider === "synthetic") assertSyntheticPageMapping(input);

        let run = state.syncRuns.find((candidate) => candidate.id === input.run.id);
        const replay = run?.pages.find((page) => page.manifest.id === manifest.id);
        if (replay) {
          const exactRawVersions = input.rawVersions.every((version) => {
            const saved = state.rawProviderVersions.find((candidate) => candidate.id === version.id);
            return saved && canonicalAccountingJson(saved) === canonicalAccountingJson(version);
          });
          const exactNormalizedVersions = input.normalizedVersions.every((version) => {
            const saved = state.normalizedProviderVersions.find(
              (candidate) => candidate.id === version.id
            );
            return saved &&
              canonicalAccountingJson(immutableNormalizedVersion(saved)) ===
                canonicalAccountingJson(version);
          });
          if (
            canonicalAccountingJson(replay.manifest) !== canonicalAccountingJson(manifest) ||
            canonicalAccountingJson(replay.rawVersionIds) !==
              canonicalAccountingJson(input.rawVersions.map((version) => version.id)) ||
            canonicalAccountingJson(replay.normalizedVersionIds) !==
              canonicalAccountingJson(input.normalizedVersions.map((version) => version.id)) ||
            !exactRawVersions ||
            !exactNormalizedVersions
          ) {
            throw new Error("A replayed provider page does not match its committed manifest.");
          }
          return {
            manifestId: replay.manifest.id,
            digest: replay.manifest.digest,
            added: replay.summary.added,
            duplicates: replay.summary.duplicates,
            conflicts: replay.summary.conflicts,
            replayed: true,
          };
        }

        if (run) {
          if (
            run.sourceConnectionId !== input.run.sourceConnectionId ||
            run.syncReplicaId !== input.run.syncReplicaId ||
            run.dataset !== input.run.dataset ||
            run.fence !== input.run.fence ||
            run.kind !== input.run.kind ||
            run.status === "committed" ||
            run.status === "cancelled"
          ) {
            throw new Error("Provider sync run cannot accept this page.");
          }
        } else {
          run = {
            id: input.run.id,
            sourceConnectionId: input.run.sourceConnectionId,
            syncReplicaId: input.run.syncReplicaId,
            dataset: input.run.dataset,
            kind: input.run.kind,
            fence: input.run.fence,
            baseCompletedRunId:
              state.datasetCheckpoints.find(
                (checkpoint) =>
                  checkpoint.sourceConnectionId === input.run.sourceConnectionId &&
                  checkpoint.syncReplicaId === input.run.syncReplicaId &&
                  checkpoint.dataset === input.run.dataset
              )?.completedRunId ?? null,
            status: "fetching",
            startedAt: input.run.startedAt,
            pages: [],
          };
          state.syncRuns.push(run);
        }
        if (manifest.sequence !== run.pages.length) {
          throw new Error("Provider sync pages must be committed in exact sequence.");
        }
        const priorManifest = run.pages.at(-1)?.manifest;
        if (
          priorManifest &&
          (priorManifest.final ||
            manifest.currentCursor !== priorManifest.nextCursor ||
            manifest.dirtyGeneration !== priorManifest.dirtyGeneration)
        ) {
          throw new Error("Provider sync page does not continue the locally committed cursor chain.");
        }

        const rawVersionIds: string[] = [];
        for (const version of input.rawVersions) {
          if (
            version.identity.provider !== binding.provider ||
            version.identity.environment !== binding.environment ||
            version.identity.organisationId !== binding.organisationId
          ) {
            throw new Error("Provider record escaped the selected organisation namespace.");
          }
          const existing = state.rawProviderVersions.find((candidate) => candidate.id === version.id);
          if (existing) {
            if (
              existing.payloadDigest !== version.payloadDigest ||
              providerRecordIdentityKey(existing.identity) !== providerRecordIdentityKey(version.identity)
            ) {
              throw new Error("Raw provider version ID was reused for different source content.");
            }
          } else {
            state.rawProviderVersions.push(structuredClone(version));
          }
          rawVersionIds.push(version.id);
        }

        const pageRawIds = new Set(rawVersionIds);
        const normalizedVersionIds: string[] = [];
        for (const version of input.normalizedVersions) {
          if (!pageRawIds.has(version.rawVersionId)) {
            throw new Error("A normalised provider version must refer to a raw record on this page.");
          }
          if (normalizedVersionIds.includes(version.id)) {
            throw new Error("A provider page cannot repeat a normalised version ID.");
          }
          const existing = state.normalizedProviderVersions.find(
            (candidate) => candidate.id === version.id
          );
          if (existing) {
            if (
              canonicalAccountingJson(immutableNormalizedVersion(existing)) !==
              canonicalAccountingJson(version)
            ) {
              throw new Error("Normalized provider version ID was reused for another mapping.");
            }
          } else {
            state.normalizedProviderVersions.push(structuredClone(version));
          }
          normalizedVersionIds.push(version.id);
        }

        for (const candidate of input.candidates) {
          const identity = providerIdentityFromCandidate(candidate);
          if (
            !identity ||
            identity.provider !== binding.provider ||
            identity.environment !== binding.environment ||
            identity.organisationId !== binding.organisationId
          ) {
            throw new Error("Provider review candidate escaped the selected organisation namespace.");
          }
        }

        const committedAt = input.committedAt ?? new Date().toISOString();
        const imported = applyImportCandidates(state, input.candidates, {
          now: committedAt,
          batchId: manifest.id,
          source: "accounting-provider",
        });
        for (const version of state.normalizedProviderVersions) {
          if (
            !normalizedVersionIds.includes(version.id) ||
            !version.candidateExternalId ||
            !version.candidateContentDigest
          ) {
            continue;
          }
          const candidate = input.candidates.find(
            (item) =>
              item.origin.externalId === version.candidateExternalId &&
              item.contentDigest === version.candidateContentDigest
          );
          if (!candidate) continue;
          const candidateOriginKey = exactOriginKey({ origin: candidate.origin });
          version.mappedEventId = state.events.find(
            (event) =>
              event.contentDigest === candidate.contentDigest &&
              exactOriginKey(event) === candidateOriginKey
          )?.id;
        }

        const summary = {
          added: imported.added.length,
          duplicates: imported.duplicateCount,
          conflicts: imported.conflicts.length,
        };
        run.pages.push({
          manifest: structuredClone(manifest),
          committedAt,
          rawVersionIds,
          normalizedVersionIds,
          summary,
        });
        run.status = "staged";
        return {
          manifestId: manifest.id,
          digest: manifest.digest,
          ...summary,
          replayed: false,
        };
      });
    },

    markProviderPageAcknowledged: (input) =>
      mutate((state) => {
        if (state.replica.id !== input.localReplicaId) {
          throw new Error("The local books changed browser identity before acknowledgement.");
        }
        const run = state.syncRuns.find((candidate) => candidate.id === input.runId);
        const page = run?.pages.find((candidate) => candidate.manifest.id === input.manifestId);
        if (!run || !page || page.manifest.digest !== input.digest) {
          throw new Error("Provider page acknowledgement does not match a local commit.");
        }
        page.acknowledgedAt ??= input.acknowledgedAt ?? new Date().toISOString();
      }),

    completeProviderSync: (input) =>
      mutate(async (state) => {
        if (state.replica.id !== input.localReplicaId) {
          throw new Error("The local books changed browser identity before checkpoint completion.");
        }
        const run = state.syncRuns.find((candidate) => candidate.id === input.runId);
        if (!run) throw new Error("Provider sync run was not found locally.");
        if (run.pages.length === 0 || run.pages.some((page) => !page.acknowledgedAt)) {
          throw new Error("Provider sync cannot complete before every local page is acknowledged.");
        }
        const rawById = new Map(
          state.rawProviderVersions.map((version) => [version.id, version])
        );
        for (const page of run.pages) {
          const raws = page.rawVersionIds.map((id) => rawById.get(id));
          if (
            raws.length !== page.manifest.recordCount ||
            raws.some((version) => version === undefined)
          ) {
            throw new Error("A completed provider page has lost one of its raw source records.");
          }
          for (const raw of raws) {
            if ((await accountingDigest(raw!.payload)) !== raw!.payloadDigest) {
              throw new Error("A completed provider page has a changed raw source record.");
            }
          }
          if ((await accountingDigest(raws.map((raw) => raw!.payload))) !== page.manifest.digest) {
            throw new Error("A completed provider page no longer matches its saved page digest.");
          }
        }
        const lastManifest = run.pages.at(-1)!.manifest;
        const recordCount = run.pages.reduce(
          (sum, page) => sum + page.manifest.recordCount,
          0
        );
        if (
          input.checkpoint.sourceConnectionId !== run.sourceConnectionId ||
          input.checkpoint.syncReplicaId !== run.syncReplicaId ||
          input.checkpoint.dataset !== run.dataset ||
          input.checkpoint.completedRunId !== run.id ||
          input.checkpoint.pageCount !== run.pages.length ||
          input.checkpoint.recordCount !== recordCount ||
          !lastManifest.final ||
          input.checkpoint.committedCursor !== lastManifest.nextCursor ||
          input.checkpoint.coverageMarker !== lastManifest.coverageMarker ||
          input.checkpoint.dirtyGeneration !== lastManifest.dirtyGeneration
        ) {
          throw new Error("Provider checkpoint does not belong to this completed sync run.");
        }
        const index = state.datasetCheckpoints.findIndex(
          (checkpoint) =>
            checkpoint.sourceConnectionId === input.checkpoint.sourceConnectionId &&
            checkpoint.syncReplicaId === input.checkpoint.syncReplicaId &&
            checkpoint.dataset === input.checkpoint.dataset
        );
        const current = index < 0 ? null : state.datasetCheckpoints[index]!;
        if (current?.completedRunId === run.id) {
          if (canonicalAccountingJson(current) !== canonicalAccountingJson(input.checkpoint)) {
            throw new Error("A completed provider checkpoint cannot change during replay.");
          }
        } else {
          if (
            run.baseCompletedRunId === undefined ||
            (current?.completedRunId ?? null) !== run.baseCompletedRunId
          ) {
            throw new Error("An older or out-of-order provider run cannot move the local checkpoint.");
          }
          if (index < 0) state.datasetCheckpoints.push(structuredClone(input.checkpoint));
          else state.datasetCheckpoints[index] = structuredClone(input.checkpoint);
        }
        run.status = "committed";
        run.finishedAt = input.finishedAt ?? input.checkpoint.completedAt;
        return input.checkpoint;
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

/** A separate browser store for the made-up connector; ordinary Starter Books stay untouched. */
export function createSyntheticDemoRecordsStore(): RecordsStore {
  return createRecordsStore("idb", {
    storagePrefix: SYNTHETIC_DEMO_STORAGE_PREFIX,
    channelName: "taxsorted-synthetic-accounting-demo",
  });
}

/** Remove only the two namespaced keys owned by the made-up connector demo. */
export async function clearSyntheticDemoRecords(): Promise<void> {
  const clear = async () => {
    await idbDel(SYNTHETIC_DEMO_STORAGE_PREFIX + STORAGE_KEY);
    await idbDel(SYNTHETIC_DEMO_STORAGE_PREFIX + STORAGE_KEY_V1);
  };
  const lockName = SYNTHETIC_DEMO_STORAGE_PREFIX + STORAGE_KEY;
  if (typeof navigator !== "undefined" && navigator.locks) {
    await navigator.locks.request(lockName, clear);
    return;
  }
  await clear();
}
