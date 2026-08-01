// The local accounting truth. Events preserve cash, evidence, review state
// and revisions; the tax engine receives only a ready LedgerRecord projection.

import {
  categoryByKey,
  type LedgerRecord,
  type NewLedgerRecord,
  type Pence,
  type SourceType,
} from "@taxsorted/engine/uk/itsa";
import type { PageManifest, SyncRunKind } from "@taxsorted/engine/accounting-sync";

export const LEGACY_LOCAL_BOOKS_SCHEMA = "taxsorted.local-books/2" as const;
export const LOCAL_BOOKS_SCHEMA = "taxsorted.local-books/3" as const;

export type AccountingProvider =
  | "synthetic"
  | "xero"
  | "quickbooks"
  | "freeagent"
  | "sage-accounting-uk";

export type ProviderEnvironment = "demo" | "sandbox" | "production";

export interface ProviderRecordIdentity {
  provider: AccountingProvider;
  environment: ProviderEnvironment;
  organisationId: string;
  objectType: string;
  objectId: string;
}

export interface ProviderOriginNamespace {
  provider: AccountingProvider;
  environment: ProviderEnvironment;
  organisationId: string;
  objectType: string;
}

export type CapabilityObservationState =
  | "available"
  | "partial"
  | "unavailable"
  | "permission-missing"
  | "unknown"
  | "degraded"
  | "disabled";

export interface CapabilityObservation {
  capability: string;
  state: CapabilityObservationState;
  observedAt: string;
  limitation?: string;
  recovery?: string;
}

export type ReviewState = "needs-review" | "ready" | "excluded";

export interface LocalLedger {
  /** Local namespace only. It is never an HMRC business ID. */
  id: string;
  name: string;
  activity: SourceType;
  /** A person must confirm this really is one separate trade/property business before filing. */
  scopeState: "needs-confirmation" | "confirmed";
  scopeConfirmedAt?: string;
  /** The TaxSorted person/entity this local book was deliberately linked to. */
  ownerEntityId?: string;
  ownerEntityName?: string;
  entityLinkedAt?: string;
  /** Filled only after this local ledger is deliberately linked to HMRC. */
  hmrcBusinessId?: string;
}

export interface TaxPosting {
  kind: "income" | "expense";
  category: string;
  amount: Pence;
  effect: "increase" | "decrease";
}

export interface EventOrigin {
  kind: "manual" | "bank-csv" | "cambridge-tcg" | "legacy" | "accounting-provider";
  /** A bank account, Cambridge account or other source namespace when known. */
  accountScope?: string;
  /** Stable inside the source namespace. */
  externalId?: string;
  label?: string;
  row?: number;
  /** Provider revisions are opaque. Never parse a Xero timestamp or QuickBooks SyncToken as a number. */
  sourceRevision?: string;
  /** Required when kind is accounting-provider. The object ID remains externalId. */
  provider?: ProviderOriginNamespace;
}

export interface EventSuggestion {
  basis: string;
  limitation: string;
}

export interface AccountingEvent {
  id: string;
  ledgerId: string;
  revision: number;
  reviewState: ReviewState;
  occurredOn: string;
  cash: {
    amount: Pence;
    currency: "GBP";
    direction: "in" | "out";
  };
  description?: string;
  /** Usually one; marketplace payouts may become several without changing the event model. */
  postings: TaxPosting[];
  origin: EventOrigin;
  /** Detects a source revision that reuses an exact identity with changed content. */
  contentDigest: string;
  /** Similarity is a warning only. Legitimate equal payments are never auto-deleted. */
  possibleDuplicateKey?: string;
  possibleDuplicateOf?: string[];
  suggestion?: EventSuggestion;
  reviewNote?: string;
  reversalOf?: { eventId: string; revision: number };
  createdAt: string;
  updatedAt: string;
}

export interface EventRevision {
  eventId: string;
  revision: number;
  changedAt: string;
  reason: string;
  /** Complete previous event, so any revision can be reconstructed. */
  before: AccountingEvent;
}

export interface ImportBatch {
  id: string;
  source: EventOrigin["kind"];
  importedAt: string;
  addedEventIds: string[];
  duplicateEventIds: string[];
  conflicts: ImportConflict[];
}

export interface ImportConflict {
  externalId: string;
  existingEventId: string;
  /** Kept locally so changed source data is held for review, never discarded. */
  candidate: ImportCandidate;
}

export interface LocalBooksReplica {
  /** Fresh for this browser store. A restored export must replace it. */
  id: string;
  createdAt: string;
}

export interface ProviderLedgerBinding {
  sourceConnectionId: string;
  /** The account-owned TaxSorted entity selected when the server source was created. */
  entityId: string;
  /** Server-created sync replica for this one source connection. */
  syncReplicaId: string;
  provider: AccountingProvider;
  environment: ProviderEnvironment;
  organisationId: string;
  organisationName: string;
  ledgerId: string;
  state: "active" | "paused" | "disconnected";
  boundAt: string;
  capabilities: CapabilityObservation[];
}

export interface RawProviderRecordVersion {
  id: string;
  identity: ProviderRecordIdentity;
  payloadDigest: string;
  providerRevision?: string;
  sourceUpdatedAt?: string;
  observedAt: string;
  deleted: boolean;
  /** Provider truth before TaxSorted interpretation. Provider tokens never belong here. */
  payload: unknown;
}

export interface NormalizedProviderRecordVersion {
  id: string;
  rawVersionId: string;
  mapperVersion: string;
  kind: string;
  occurredOn?: string;
  amountPence?: number;
  currency?: string;
  direction?: "in" | "out";
  description?: string;
  /** The tax-facing suggestion emitted beside this provider-neutral observation. */
  suggestedCategory?: string;
  suggestedKind?: "income" | "expense";
  activity?: SourceType;
  candidateContentDigest?: string;
  limitations: string[];
  candidateExternalId?: string;
  mappedEventId?: string;
}

/** Shared control-plane manifest persisted beside the local page commit. */
export type ProviderPageManifest = PageManifest;

export interface LocalSyncPage {
  /** The complete API-issued proof, kept beside the page's local effects. */
  manifest: ProviderPageManifest;
  committedAt: string;
  acknowledgedAt?: string;
  rawVersionIds: string[];
  normalizedVersionIds: string[];
  summary: {
    added: number;
    duplicates: number;
    conflicts: number;
  };
}

export interface LocalSyncRun {
  id: string;
  sourceConnectionId: string;
  syncReplicaId: string;
  dataset: string;
  kind: SyncRunKind;
  fence: string;
  /** Checkpoint observed when the first page was committed; absent only on pre-guard local data. */
  baseCompletedRunId?: string | null;
  status: "fetching" | "staged" | "committed" | "failed" | "cancelled";
  startedAt: string;
  pages: LocalSyncPage[];
  finishedAt?: string;
  error?: { code: string; message: string; recovery: string };
}

export interface DatasetCheckpoint {
  sourceConnectionId: string;
  syncReplicaId: string;
  dataset: string;
  completedRunId: string;
  committedCursor: string;
  coverageMarker: string;
  dirtyGeneration: string;
  pageCount: number;
  completedAt: string;
  recordCount: number;
}

export interface ProviderConflictCase {
  id: string;
  kind: "changed-source" | "deleted-source" | "possible-duplicate" | "mapping-change";
  status: "open" | "resolved";
  openedAt: string;
  sourceKey: string;
  sourceIdentity?: ProviderRecordIdentity;
  existingEventId?: string;
  candidate?: ImportCandidate;
  resolvedAt?: string;
  resolution?: string;
}

export interface LocalBooksState {
  schema: typeof LOCAL_BOOKS_SCHEMA;
  storeRevision: number;
  replica: LocalBooksReplica;
  ledgers: LocalLedger[];
  events: AccountingEvent[];
  history: EventRevision[];
  imports: ImportBatch[];
  providerBindings: ProviderLedgerBinding[];
  rawProviderVersions: RawProviderRecordVersion[];
  normalizedProviderVersions: NormalizedProviderRecordVersion[];
  syncRuns: LocalSyncRun[];
  datasetCheckpoints: DatasetCheckpoint[];
  conflictCases: ProviderConflictCase[];
}

export interface ImportCandidate {
  record: NewLedgerRecord;
  origin: EventOrigin & { externalId: string };
  contentDigest: string;
  suggestion?: EventSuggestion;
  reviewNote?: string;
}

export function emptyLocalBooks(
  options: { replicaId?: string; createdAt?: string } = {}
): LocalBooksState {
  return {
    schema: LOCAL_BOOKS_SCHEMA,
    storeRevision: 0,
    replica: {
      id: options.replicaId ?? crypto.randomUUID(),
      createdAt: options.createdAt ?? new Date().toISOString(),
    },
    ledgers: [],
    events: [],
    history: [],
    imports: [],
    providerBindings: [],
    rawProviderVersions: [],
    normalizedProviderVersions: [],
    syncRuns: [],
    datasetCheckpoints: [],
    conflictCases: [],
  };
}

export function providerRecordIdentityKey(identity: ProviderRecordIdentity): string {
  return JSON.stringify([
    identity.provider,
    identity.environment,
    identity.organisationId,
    identity.objectType,
    identity.objectId,
  ]);
}

export function primaryLedgerId(activity: SourceType): string {
  return `ledger:${activity}:primary`;
}

export function ensurePrimaryLedger(
  state: LocalBooksState,
  activity: SourceType
): LocalLedger {
  const id = primaryLedgerId(activity);
  const existing = state.ledgers.find((ledger) => ledger.id === id);
  if (existing) return existing;

  const ledger: LocalLedger = {
    id,
    name: activity === "self-employment" ? "My first business" : "My UK property business",
    activity,
    scopeState: "needs-confirmation",
  };
  state.ledgers.push(ledger);
  return ledger;
}

/**
 * Mark the ledger as needing a fresh human scope check. The saved events are
 * untouched, and the ledger can be confirmed again after review.
 */
export function invalidateLedgerScope(ledger: LocalLedger): void {
  ledger.scopeState = "needs-confirmation";
  delete ledger.scopeConfirmedAt;
}

function defaultCashDirection(record: NewLedgerRecord): "in" | "out" {
  const effect = record.effect ?? "increase";
  if (record.kind === "income") return effect === "increase" ? "in" : "out";
  return effect === "increase" ? "out" : "in";
}

export function possibleDuplicateKey(record: NewLedgerRecord, ledgerId: string): string {
  const description = (record.description ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return [
    ledgerId,
    record.date,
    String(record.amount),
    defaultCashDirection(record),
    description,
  ].join("\u001f");
}

export function eventFromRecord(
  record: NewLedgerRecord,
  options: {
    id: string;
    ledgerId: string;
    now: string;
    reviewState: ReviewState;
    origin: EventOrigin;
    contentDigest: string;
    suggestion?: EventSuggestion;
    reviewNote?: string;
  }
): AccountingEvent {
  const event: AccountingEvent = {
    id: options.id,
    ledgerId: options.ledgerId,
    revision: 1,
    reviewState: options.reviewState,
    occurredOn: record.date,
    cash: {
      amount: record.amount,
      currency: "GBP",
      direction: defaultCashDirection(record),
    },
    ...(record.description ? { description: record.description } : {}),
    postings: [
      {
        kind: record.kind,
        category: record.category,
        amount: record.amount,
        effect: record.effect ?? "increase",
      },
    ],
    origin: options.origin,
    contentDigest: options.contentDigest,
    possibleDuplicateKey: possibleDuplicateKey(record, options.ledgerId),
    ...(options.suggestion ? { suggestion: options.suggestion } : {}),
    ...(options.reviewNote ? { reviewNote: options.reviewNote } : {}),
    createdAt: options.now,
    updatedAt: options.now,
  };
  return event;
}

export function migrateLegacyRecords(
  records: LedgerRecord[],
  migratedAt: string
): LocalBooksState {
  const state = emptyLocalBooks({ createdAt: migratedAt });
  state.storeRevision = 1;

  for (const record of records) {
    const ledger = ensurePrimaryLedger(state, record.source);
    state.events.push(
      eventFromRecord(record, {
        id: record.id,
        ledgerId: ledger.id,
        now: migratedAt,
        reviewState: "ready",
        origin: { kind: "legacy", externalId: record.id },
        contentDigest: `legacy:${record.id}`,
        reviewNote:
          "Moved from the earlier local record format. Confirm which separate business this belongs to before filing.",
      })
    );
  }
  return state;
}

export function exactOriginKey(event: Pick<AccountingEvent, "origin">): string | null {
  if (!event.origin.externalId) return null;
  if (event.origin.kind === "accounting-provider") {
    if (!event.origin.provider) return null;
    return providerRecordIdentityKey({
      ...event.origin.provider,
      objectId: event.origin.externalId,
    });
  }
  return [
    event.origin.kind,
    event.origin.accountScope ?? "",
    event.origin.externalId,
  ].join("\u001f");
}

export function validateAccountingEvent(event: AccountingEvent, ledgers: LocalLedger[]): void {
  if (!event.id || !event.ledgerId || !Number.isInteger(event.revision) || event.revision < 1) {
    throw new Error("invalid accounting event identity");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.occurredOn)) {
    throw new Error(`invalid date: '${event.occurredOn}' — expected yyyy-mm-dd`);
  }
  const parsedDate = new Date(`${event.occurredOn}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== event.occurredOn) {
    throw new Error(`invalid date: '${event.occurredOn}'`);
  }
  if (!Number.isInteger(event.cash.amount) || event.cash.amount <= 0) {
    throw new Error("invalid cash amount — expected positive whole pence");
  }
  if (event.cash.currency !== "GBP" || !["in", "out"].includes(event.cash.direction)) {
    throw new Error("unsupported cash currency or direction");
  }
  if (!["needs-review", "ready", "excluded"].includes(event.reviewState)) {
    throw new Error("invalid review state");
  }
  if (!event.contentDigest) throw new Error("accounting event needs a content digest");
  if (event.origin.sourceRevision !== undefined && typeof event.origin.sourceRevision !== "string") {
    throw new Error("source revision must be an opaque string");
  }
  if (event.origin.kind === "accounting-provider") {
    if (!event.origin.externalId || !event.origin.provider) {
      throw new Error("provider event needs a complete source identity");
    }
    const identity = { ...event.origin.provider, objectId: event.origin.externalId };
    if (Object.values(identity).some((part) => typeof part !== "string" || part.length === 0)) {
      throw new Error("provider event needs a complete source identity");
    }
  } else if (event.origin.provider) {
    throw new Error("only provider events may carry a provider namespace");
  }
  const ledger = ledgers.find((candidate) => candidate.id === event.ledgerId);
  if (!ledger) throw new Error(`unknown ledger: '${event.ledgerId}'`);
  if (event.postings.length === 0) throw new Error("accounting event needs at least one posting");

  for (const posting of event.postings) {
    if (!Number.isInteger(posting.amount) || posting.amount <= 0) {
      throw new Error("invalid posting amount — expected positive whole pence");
    }
    if (posting.effect !== "increase" && posting.effect !== "decrease") {
      throw new Error("invalid posting effect");
    }
    const definition = categoryByKey(posting.category, ledger.activity);
    if (definition.kind !== posting.kind) {
      throw new Error(
        `kind mismatch: category '${posting.category}' is ${definition.kind}, but this posting is ${posting.kind}`
      );
    }
  }
}

export function projectReadyRecords(
  state: LocalBooksState,
  ledgerId?: string,
  options: { includeUnconfirmed?: boolean } = {}
): LedgerRecord[] {
  const ledgers = new Map(state.ledgers.map((ledger) => [ledger.id, ledger]));
  const records: LedgerRecord[] = [];

  for (const event of state.events) {
    if (event.reviewState !== "ready") continue;
    if (ledgerId && event.ledgerId !== ledgerId) continue;
    const ledger = ledgers.get(event.ledgerId);
    if (!ledger) continue;
    if (!options.includeUnconfirmed && ledger.scopeState !== "confirmed") continue;

    event.postings.forEach((posting, index) => {
      records.push({
        id: event.postings.length === 1 ? event.id : `${event.id}:posting-${index + 1}`,
        date: event.occurredOn,
        amount: posting.amount,
        kind: posting.kind,
        category: posting.category,
        source: ledger.activity,
        ...(event.description ? { description: event.description } : {}),
        ...(posting.effect === "decrease" ? { effect: "decrease" as const } : {}),
      });
    });
  }
  return records;
}

export function isLocalBooksState(value: unknown): value is LocalBooksState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LocalBooksState>;
  return (
    candidate.schema === LOCAL_BOOKS_SCHEMA &&
    Number.isInteger(candidate.storeRevision) &&
    typeof candidate.replica?.id === "string" &&
    typeof candidate.replica?.createdAt === "string" &&
    Array.isArray(candidate.ledgers) &&
    Array.isArray(candidate.events) &&
    Array.isArray(candidate.history) &&
    Array.isArray(candidate.imports) &&
    Array.isArray(candidate.providerBindings) &&
    Array.isArray(candidate.rawProviderVersions) &&
    Array.isArray(candidate.normalizedProviderVersions) &&
    Array.isArray(candidate.syncRuns) &&
    Array.isArray(candidate.datasetCheckpoints) &&
    Array.isArray(candidate.conflictCases)
  );
}
