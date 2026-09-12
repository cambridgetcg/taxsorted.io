// An explicit file format, separate from the evolving browser persistence envelope.
// No attachment bytes, authentication state or browser storage outside Books is included.
import { canonicalAccountingJson, ACCOUNTING_SYNC_SCHEMA } from "@taxsorted/engine/accounting-sync";
import { categoryByKey } from "@taxsorted/engine/uk/itsa";
import { LOCAL_BOOKS_SCHEMA, exactOriginKey, providerRecordIdentityKey, type LocalBooksState } from "@/lib/local-books";
import { validateLocalBooksState } from "@/lib/local-books-validation";

export const BOOKS_BACKUP_SCHEMA = "taxsorted.books-backup/1" as const;
export const BOOKS_BACKUP_MAX_BYTES = 10 * 1024 * 1024;
export const BOOKS_BACKUP_MAX_ITEMS = 20_000;

export interface BooksBackup {
  schema: typeof BOOKS_BACKUP_SCHEMA;
  exportedAt: string;
  books: LocalBooksState;
}

export interface BooksBackupSummary {
  businesses: number;
  records: number;
  checked: number;
  toCheck: number;
  excluded: number;
  revisions: number;
  imports: number;
  sourceVersions: number;
  conflicts: number;
  connections: number;
  syncRuns: number;
  checkpoints: number;
  linkedBusinesses: number;
}

export interface BooksRestorePreflight {
  expectedReplicaId: string;
  expectedStoreRevision: number;
  /** Includes the legacy migration baseline in the compare-and-replace guard. */
  expectedStorageFingerprint: string;
  expectedBackupDigest: string;
  existingBackup: string;
  existing: BooksBackupSummary;
  incoming: BooksBackupSummary;
  exportedAt: string;
}

type Check = (value: unknown, path: string) => void;
type Field = Check | { optional: Check };
const bad = (path: string): never => { throw new Error(`The backup has an invalid or unsupported value at ${path}.`); };
const text: Check = (v, p) => { if (typeof v !== "string" || !v.trim() || v.length > 20_000) bad(p); };
const note: Check = (v, p) => { if (typeof v !== "string" || v.length > 20_000) bad(p); };
const integer: Check = (v, p) => { if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) bad(p); };
const positive: Check = (v, p) => { integer(v, p); if (v === 0) bad(p); };
const bool: Check = (v, p) => { if (typeof v !== "boolean") bad(p); };
const oneOf = (...values: unknown[]): Check => (v, p) => { if (!values.includes(v)) bad(p); };
const optional = (check: Check): Field => ({ optional: check });
const nullable = (check: Check): Check => (v, p) => { if (v !== null) check(v, p); };
const array = (check: Check, max = BOOKS_BACKUP_MAX_ITEMS): Check => (v, p) => {
  if (!Array.isArray(v) || v.length > max) bad(p);
  (v as unknown[]).forEach((item, index) => check(item, `${p}[${index}]`));
};
const object = (fields: Record<string, Field>): Check => (v, p) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) bad(p);
  const value = v as Record<string, unknown>;
  for (const key of Object.keys(value)) if (!Object.hasOwn(fields, key)) bad(`${p}.${key}`);
  for (const [key, check] of Object.entries(fields)) {
    if (typeof check === "function") check(value[key], `${p}.${key}`);
    else if (Object.hasOwn(value, key)) check.optional(value[key], `${p}.${key}`);
  }
};
const timestamp: Check = (v, p) => {
  text(v, p);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v as string) || !Number.isFinite(Date.parse(v as string))) bad(p);
};
const date: Check = (v, p) => {
  text(v, p);
  const parsed = new Date(`${v}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v as string) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== v) bad(p);
};
const decimal: Check = (v, p) => { text(v, p); if (!/^(0|[1-9]\d*)$/.test(v as string)) bad(p); };
const digest: Check = (v, p) => { text(v, p); if (!/^sha256:[a-f0-9]{64}$/.test(v as string)) bad(p); };
const activity = oneOf("self-employment", "uk-property");
const kind = oneOf("income", "expense");
const direction = oneOf("in", "out");
const effect = oneOf("increase", "decrease");
const provider = oneOf("synthetic", "xero", "quickbooks", "freeagent", "sage-accounting-uk");
const environment = oneOf("demo", "sandbox", "production");
const originKind = oneOf("manual", "bank-csv", "cambridge-tcg", "legacy", "accounting-provider");
const namespace = { provider, environment, organisationId: text, objectType: text };
const identity = object({ ...namespace, objectId: text });
const origin = object({ kind: originKind, accountScope: optional(text), externalId: optional(text), label: optional(note), row: optional(positive), sourceRevision: optional(note), provider: optional(object(namespace)) });
const suggestion = object({ basis: text, limitation: text });
const record: Check = (v, p) => {
  object({ date, amount: positive, kind, category: text, source: activity, description: optional(note), effect: optional(effect) })(v, p);
  const value = v as { category: string; kind: string; source: "self-employment" | "uk-property" };
  if (categoryByKey(value.category, value.source).kind !== value.kind) bad(`${p}.category`);
};
const candidate: Check = (v, p) => {
  object({ record, origin, contentDigest: text, suggestion: optional(suggestion), reviewNote: optional(note) })(v, p);
  const value = v as { origin: { kind: string; externalId?: string; provider?: unknown } };
  text(value.origin.externalId, `${p}.origin.externalId`);
  if ((value.origin.kind === "accounting-provider") !== (value.origin.provider !== undefined)) bad(`${p}.origin.provider`);
};
const event = object({
  id: text, ledgerId: text, revision: positive, reviewState: oneOf("needs-review", "ready", "excluded"), occurredOn: date,
  cash: object({ amount: positive, currency: oneOf("GBP"), direction }), description: optional(note),
  postings: array(object({ kind, category: text, amount: positive, effect }), 100), origin, contentDigest: text,
  possibleDuplicateKey: optional(text), possibleDuplicateOf: optional(array(text)), suggestion: optional(suggestion), reviewNote: optional(note),
  reversalOf: optional(object({ eventId: text, revision: positive })), createdAt: timestamp, updatedAt: timestamp,
});
const manifest = object({
  schema: oneOf(ACCOUNTING_SYNC_SCHEMA), id: text, runId: text, sourceConnectionId: text, replicaId: text, dataset: text,
  sequence: integer, fence: decimal, digest, recordCount: integer, currentCursor: nullable(text), nextCursor: text,
  coverageMarker: nullable(text), dirtyGeneration: decimal, final: bool, expiresAt: timestamp,
});
const backupShape = object({
  schema: oneOf(BOOKS_BACKUP_SCHEMA), exportedAt: timestamp,
  books: object({
    schema: oneOf(LOCAL_BOOKS_SCHEMA), storeRevision: integer, replica: object({ id: text, createdAt: timestamp }),
    ledgers: array(object({ id: text, name: text, activity, scopeState: oneOf("needs-confirmation", "confirmed"), scopeConfirmedAt: optional(timestamp), ownerEntityId: optional(text), ownerEntityName: optional(text), entityLinkedAt: optional(timestamp), hmrcBusinessId: optional(text) }), 100),
    events: array(event),
    history: array(object({ eventId: text, revision: positive, changedAt: timestamp, reason: text, before: event })),
    imports: array(object({ id: text, source: originKind, importedAt: timestamp, addedEventIds: array(text), duplicateEventIds: array(text), conflicts: array(object({ externalId: text, existingEventId: text, candidate })) })),
    providerBindings: array(object({ sourceConnectionId: text, entityId: text, syncReplicaId: text, provider, environment, organisationId: text, organisationName: text, ledgerId: text, state: oneOf("active", "paused", "disconnected"), boundAt: timestamp, capabilities: array(object({ capability: text, state: oneOf("available", "partial", "unavailable", "permission-missing", "unknown", "degraded", "disabled"), observedAt: timestamp, limitation: optional(note), recovery: optional(note) }), 100) }), 100),
    rawProviderVersions: array(object({ id: text, identity, payloadDigest: digest, providerRevision: optional(note), sourceUpdatedAt: optional(timestamp), observedAt: timestamp, deleted: bool, payload: (v, p) => { if (v === undefined) bad(p); } })),
    normalizedProviderVersions: array(object({ id: text, rawVersionId: text, mapperVersion: text, kind: text, occurredOn: optional(date), amountPence: optional(integer), currency: optional(text), direction: optional(direction), description: optional(note), suggestedCategory: optional(text), suggestedKind: optional(kind), activity: optional(activity), candidateContentDigest: optional(text), limitations: array(note, 100), candidateExternalId: optional(text), mappedEventId: optional(text) })),
    syncRuns: array(object({ id: text, sourceConnectionId: text, syncReplicaId: text, dataset: text, kind: oneOf("initial", "incremental", "repair", "pre-filing"), fence: decimal, baseCompletedRunId: optional(nullable(text)), status: oneOf("fetching", "staged", "committed", "failed", "cancelled"), startedAt: timestamp, finishedAt: optional(timestamp), error: optional(object({ code: text, message: text, recovery: text })), pages: array(object({ manifest, committedAt: timestamp, acknowledgedAt: optional(timestamp), rawVersionIds: array(text), normalizedVersionIds: array(text), summary: object({ added: integer, duplicates: integer, conflicts: integer }) })) })),
    datasetCheckpoints: array(object({ sourceConnectionId: text, syncReplicaId: text, dataset: text, completedRunId: text, committedCursor: text, coverageMarker: text, dirtyGeneration: decimal, pageCount: positive, completedAt: timestamp, recordCount: integer })),
    conflictCases: array(object({ id: text, kind: oneOf("changed-source", "deleted-source", "possible-duplicate", "mapping-change"), status: oneOf("open", "resolved"), openedAt: timestamp, sourceKey: text, sourceIdentity: optional(identity), existingEventId: optional(text), candidate: optional(candidate), resolvedAt: optional(timestamp), resolution: optional(note) })),
  }),
});

// Bound arbitrary provider JSON too. Reject keys that can acquire special meaning
// when data is subsequently copied into ordinary JavaScript objects.
function checkJsonTree(root: unknown): void {
  const pending: { value: unknown; depth: number }[] = [{ value: root, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const { value, depth } = pending.pop()!;
    if (++count > 300_000 || depth > 32) throw new Error("The backup contains too much nested data.");
    if (typeof value === "number" && !Number.isFinite(value)) bad("number");
    if (typeof value === "string" && value.length > 1_000_000) bad("text length");
    if (!value || typeof value !== "object") continue;
    for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) bad("object key");
      pending.push({ value: child, depth: depth + 1 });
    }
  }
}

export async function booksBackupDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalAccountingJson(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function summariseBooksBackup(books: LocalBooksState): BooksBackupSummary {
  return {
    businesses: books.ledgers.length, records: books.events.length,
    checked: books.events.filter(event => event.reviewState === "ready").length,
    toCheck: books.events.filter(event => event.reviewState === "needs-review").length,
    excluded: books.events.filter(event => event.reviewState === "excluded").length,
    revisions: books.history.length, imports: books.imports.length,
    sourceVersions: books.rawProviderVersions.length, conflicts: books.conflictCases.length,
    connections: books.providerBindings.length, syncRuns: books.syncRuns.length,
    checkpoints: books.datasetCheckpoints.length,
    linkedBusinesses: books.ledgers.filter(ledger => ledger.ownerEntityId || ledger.hmrcBusinessId).length,
  };
}

export async function parseBooksBackup(json: string): Promise<BooksBackup> {
  if (json.length > BOOKS_BACKUP_MAX_BYTES || new TextEncoder().encode(json).byteLength > BOOKS_BACKUP_MAX_BYTES) {
    throw new Error("Choose a Books backup no larger than 10 MB.");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { throw new Error("This file is not valid JSON. Choose a TaxSorted Books backup."); }
  checkJsonTree(parsed);
  backupShape(parsed, "backup");
  const backup = parsed as BooksBackup;
  const state = backup.books;
  validateLocalBooksState(state);

  const events = new Map(state.events.map(event => [event.id, event]));
  const raws = new Map(state.rawProviderVersions.map(version => [version.id, version]));
  const histories = new Map<string, Set<number>>();
  for (const revision of state.history) {
    const current = events.get(revision.eventId)!;
    if (revision.revision >= current.revision) bad("history revision order");
    if (canonicalAccountingJson(revision.before.origin) !== canonicalAccountingJson(current.origin) || revision.before.contentDigest !== current.contentDigest || revision.before.createdAt !== current.createdAt) bad("history source provenance");
    const revisions = histories.get(revision.eventId) ?? new Set<number>();
    revisions.add(revision.revision);
    histories.set(revision.eventId, revisions);
  }
  for (const event of state.events) {
    if ((histories.get(event.id)?.size ?? 0) !== event.revision - 1) bad("missing review history");
  }
  for (const event of [...state.events, ...state.history.map(revision => revision.before)]) {
    if (event.possibleDuplicateOf?.some(id => !events.has(id) || id === event.id)) bad("duplicate record reference");
    if (event.reversalOf) {
      const reversed = events.get(event.reversalOf.eventId);
      if (!reversed || reversed.id === event.id || event.reversalOf.revision > reversed.revision) bad("reversal reference");
    }
  }
  for (const batch of state.imports) for (const conflict of batch.conflicts) {
    if (exactOriginKey({ origin: conflict.candidate.origin }) !== exactOriginKey(events.get(conflict.existingEventId)!)) bad("import conflict source reference");
  }
  for (const conflict of state.conflictCases) {
    if (conflict.sourceIdentity && providerRecordIdentityKey(conflict.sourceIdentity) !== conflict.sourceKey) bad("conflict source identity");
    if (conflict.candidate && exactOriginKey({ origin: conflict.candidate.origin }) !== conflict.sourceKey) bad("conflict candidate source");
    if (conflict.kind === "changed-source" && conflict.existingEventId && exactOriginKey(events.get(conflict.existingEventId)!) !== conflict.sourceKey) bad("changed-source conflict reference");
  }
  for (const version of state.normalizedProviderVersions) {
    if (version.mappedEventId && !events.has(version.mappedEventId)) bad("source record reference");
    if ((version.candidateExternalId === undefined) !== (version.candidateContentDigest === undefined)) bad("source candidate identity");
    if (version.mappedEventId) {
      const mapped = events.get(version.mappedEventId)!;
      const source = raws.get(version.rawVersionId)!.identity;
      if (mapped.origin.kind !== "accounting-provider" || mapped.origin.externalId !== version.candidateExternalId || mapped.contentDigest !== version.candidateContentDigest ||
        mapped.origin.provider?.provider !== source.provider || mapped.origin.provider.environment !== source.environment || mapped.origin.provider.organisationId !== source.organisationId) bad("source record provenance");
    }
  }
  const runs = new Map(state.syncRuns.map(run => [run.id, run]));
  for (const run of state.syncRuns) {
    if (run.baseCompletedRunId && !runs.has(run.baseCompletedRunId)) bad("previous sync run reference");
  }
  for (const checkpoint of state.datasetCheckpoints) {
    const run = runs.get(checkpoint.completedRunId);
    const last = run?.pages.at(-1)?.manifest;
    if (!run || run.status !== "committed" || run.sourceConnectionId !== checkpoint.sourceConnectionId || run.syncReplicaId !== checkpoint.syncReplicaId || run.dataset !== checkpoint.dataset || !last?.final || last.nextCursor !== checkpoint.committedCursor || last.coverageMarker !== checkpoint.coverageMarker || last.dirtyGeneration !== checkpoint.dirtyGeneration || run.pages.length !== checkpoint.pageCount || run.pages.reduce((total, page) => total + page.manifest.recordCount, 0) !== checkpoint.recordCount) bad("checkpoint reference");
  }
  for (const version of state.rawProviderVersions) {
    if (await booksBackupDigest(version.payload) !== version.payloadDigest) bad("source evidence digest");
  }
  for (const run of state.syncRuns) for (const page of run.pages) {
    if (await booksBackupDigest(page.rawVersionIds.map(id => raws.get(id)!.payload)) !== page.manifest.digest) bad("source page digest");
  }
  return backup;
}

export async function exportBooksBackup(books: LocalBooksState): Promise<string> {
  const json = JSON.stringify({ schema: BOOKS_BACKUP_SCHEMA, exportedAt: new Date().toISOString(), books }, null, 2);
  // Never offer a backup that this version cannot restore.
  await parseBooksBackup(json);
  return json;
}

export function restoredBooks(backup: BooksBackup, previousRevision: number): LocalBooksState {
  if (!Number.isSafeInteger(previousRevision + 1)) throw new Error("The local Books revision cannot be advanced safely.");
  const state = structuredClone(backup.books);
  state.storeRevision = previousRevision + 1;
  state.replica = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  for (const ledger of state.ledgers) {
    ledger.scopeState = "needs-confirmation";
    delete ledger.scopeConfirmedAt;
    delete ledger.ownerEntityId;
    delete ledger.ownerEntityName;
    delete ledger.entityLinkedAt;
    delete ledger.hmrcBusinessId;
  }
  // Source versions, their mapped-event links and review history do not reference
  // these operational identities. Old page proofs remain in the original file;
  // they cannot authorize work from a new browser installation.
  state.providerBindings = [];
  state.syncRuns = [];
  state.datasetCheckpoints = [];
  validateLocalBooksState(state);
  return state;
}
