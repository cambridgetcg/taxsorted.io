/**
 * Provider-neutral accounting sync control.
 *
 * Financial records do not live here. This module describes the small proof
 * that a provider page was issued, committed by a browser replica, acknowledged
 * exactly once and promoted only after a whole dataset run completed.
 */

export const ACCOUNTING_SYNC_SCHEMA = "taxsorted.accounting-sync/1" as const;

export type DecimalString = string;
export type SyncDatasetId = string;
export type OpaqueProviderCursor = string;
export type SyncRunKind = "initial" | "incremental" | "repair" | "pre-filing";
export type SyncRunState = "active" | "completed" | "cancelled" | "expired" | "failed";

export interface SyncLease {
  /** Database bigint encoded as decimal text; never narrowed to a JS number. */
  fence: DecimalString;
  expiresAt: string;
}

export interface AcknowledgedPage {
  manifestId: string;
  digest: string;
  sequence: number;
  recordCount: number;
  currentCursor: OpaqueProviderCursor | null;
  nextCursor: OpaqueProviderCursor;
  coverageMarker: OpaqueProviderCursor | null;
  fence: DecimalString;
  dirtyGeneration: DecimalString;
  acknowledgedAt: string;
  final: boolean;
}

export interface SyncRun {
  schema: typeof ACCOUNTING_SYNC_SCHEMA;
  id: string;
  sourceConnectionId: string;
  replicaId: string;
  dataset: SyncDatasetId;
  kind: SyncRunKind;
  state: SyncRunState;
  lease: SyncLease;
  startedDirtyGeneration: DecimalString;
  nextSequence: number;
  stagedCursor: OpaqueProviderCursor | null;
  stagedCoverageMarker: OpaqueProviderCursor | null;
  acknowledgedRecordCount: number;
  acknowledgedPages: readonly AcknowledgedPage[];
}

export interface PageManifest {
  schema: typeof ACCOUNTING_SYNC_SCHEMA;
  id: string;
  runId: string;
  sourceConnectionId: string;
  replicaId: string;
  dataset: SyncDatasetId;
  sequence: number;
  fence: DecimalString;
  digest: string;
  recordCount: number;
  currentCursor: OpaqueProviderCursor | null;
  /** Post-page cursor. A final page keeps it as the next run's base cursor. */
  nextCursor: OpaqueProviderCursor;
  /** Present only on a final page; proves the bounded comparison completed. */
  coverageMarker: OpaqueProviderCursor | null;
  dirtyGeneration: DecimalString;
  final: boolean;
  expiresAt: string;
}

export interface PageAcknowledgement {
  manifestId: string;
  runId: string;
  replicaId: string;
  dataset: SyncDatasetId;
  sequence: number;
  fence: DecimalString;
  digest: string;
}

export interface DatasetCheckpoint {
  schema: typeof ACCOUNTING_SYNC_SCHEMA;
  sourceConnectionId: string;
  replicaId: string;
  dataset: SyncDatasetId;
  completedRunId: string;
  committedCursor: OpaqueProviderCursor;
  coverageMarker: OpaqueProviderCursor;
  committedDirtyGeneration: DecimalString;
  pageCount: number;
  recordCount: number;
  completedAt: string;
}

export interface AccountingSyncControl {
  allConnectorsStopped?: boolean;
  providerStopped?: boolean;
  connectionStopped?: boolean;
  datasetStopped?: boolean;
  syncStopped?: boolean;
}

export type SyncControlDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | "all-connectors-stopped"
        | "provider-stopped"
        | "connection-stopped"
        | "dataset-stopped"
        | "sync-stopped";
    };

const DECIMAL = /^(0|[1-9]\d*)$/u;
const POSITIVE_DECIMAL = /^[1-9]\d*$/u;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;
const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

function requirePlainText(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be non-empty text`);
  }
}

function requireDecimal(value: unknown, field: string): asserts value is DecimalString {
  if (typeof value !== "string" || !DECIMAL.test(value)) {
    throw new Error(`${field} must be an unsigned decimal string`);
  }
}

function requireTime(value: unknown, field: string): asserts value is string {
  requirePlainText(value, field);
  if (!ISO_DATE_TIME.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${field} must be an ISO date-time`);
  }
}

function encodeCanonical(value: unknown, seen: Set<object>): string | undefined {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite numbers are not JSON");
    return JSON.stringify(value);
  }
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "object") throw new TypeError(`unsupported JSON value: ${typeof value}`);
  if (seen.has(value)) throw new TypeError("cyclic values are not JSON");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return `[${value.map((item) => encodeCanonical(item, seen) ?? "null").join(",")}]`;
    }
    const object = value as Record<string, unknown>;
    const entries = Object.keys(object)
      .sort()
      .flatMap((key) => {
        const encoded = encodeCanonical(object[key], seen);
        return encoded === undefined ? [] : [`${JSON.stringify(key)}:${encoded}`];
      });
    return `{${entries.join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

/** Deterministic TaxSorted JSON for page hashing. This is not RFC 8785/JCS. */
export function canonicalAccountingJson(value: unknown): string {
  const encoded = encodeCanonical(value, new Set());
  if (encoded === undefined) throw new TypeError("the top-level value is not JSON");
  return encoded;
}

export function assertPageManifest(manifest: PageManifest): void {
  if (manifest.schema !== ACCOUNTING_SYNC_SCHEMA) throw new Error("unknown sync schema");
  for (const [field, value] of [
    ["manifest id", manifest.id],
    ["run id", manifest.runId],
    ["source connection id", manifest.sourceConnectionId],
    ["replica id", manifest.replicaId],
    ["dataset", manifest.dataset],
  ] as const) {
    requirePlainText(value, field);
  }
  if (!Number.isSafeInteger(manifest.sequence) || manifest.sequence < 0) {
    throw new Error("manifest sequence must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(manifest.recordCount) || manifest.recordCount < 0) {
    throw new Error("manifest record count must be a non-negative safe integer");
  }
  if (typeof manifest.fence !== "string" || !POSITIVE_DECIMAL.test(manifest.fence)) {
    throw new Error("manifest fence must be a positive decimal string");
  }
  requireDecimal(manifest.dirtyGeneration, "dirty generation");
  if (!SHA256.test(manifest.digest)) throw new Error("manifest digest must be sha256 hex");
  requireTime(manifest.expiresAt, "manifest expiry");
  if (manifest.currentCursor !== null && typeof manifest.currentCursor !== "string") {
    throw new Error("current cursor must be text or null");
  }
  requirePlainText(manifest.nextCursor, "next cursor");
  if (!manifest.final && manifest.recordCount === 0) {
    throw new Error("only a final manifest may contain no records");
  }
  if (manifest.final !== (manifest.coverageMarker !== null)) {
    throw new Error("only a final manifest may carry a coverage marker");
  }
  if (manifest.coverageMarker !== null) requirePlainText(manifest.coverageMarker, "coverage marker");
}

/**
 * Validate the complete, serialisable run proof. Call this at trust boundaries:
 * a structurally typed object can otherwise claim totals or a final page that
 * its acknowledged page chain does not prove.
 */
export function assertSyncRun(run: SyncRun): void {
  if (run.schema !== ACCOUNTING_SYNC_SCHEMA) throw new Error("unknown sync schema");
  for (const [field, value] of [
    ["run id", run.id],
    ["source connection id", run.sourceConnectionId],
    ["replica id", run.replicaId],
    ["dataset", run.dataset],
  ] as const) {
    requirePlainText(value, field);
  }
  if (!["initial", "incremental", "repair", "pre-filing"].includes(run.kind)) {
    throw new Error("unknown sync run kind");
  }
  if (!["active", "completed", "cancelled", "expired", "failed"].includes(run.state)) {
    throw new Error("unknown sync run state");
  }
  if (typeof run.lease?.fence !== "string" || !POSITIVE_DECIMAL.test(run.lease.fence)) {
    throw new Error("run fence must be a positive decimal string");
  }
  requireTime(run.lease.expiresAt, "run lease expiry");
  requireDecimal(run.startedDirtyGeneration, "started dirty generation");
  if (!Number.isSafeInteger(run.nextSequence) || run.nextSequence < 0) {
    throw new Error("next sequence must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(run.acknowledgedRecordCount) || run.acknowledgedRecordCount < 0) {
    throw new Error("acknowledged record count must be a non-negative safe integer");
  }
  if (run.stagedCursor !== null && typeof run.stagedCursor !== "string") {
    throw new Error("staged cursor must be text or null");
  }
  if (run.stagedCoverageMarker !== null) {
    requirePlainText(run.stagedCoverageMarker, "staged coverage marker");
  }
  if (!Array.isArray(run.acknowledgedPages)) {
    throw new Error("acknowledged pages must be an array");
  }
  if (run.acknowledgedPages.length !== run.nextSequence) {
    throw new Error("acknowledged page count does not match the next sequence");
  }

  const ids = new Set<string>();
  let total = 0;
  let prior: AcknowledgedPage | null = null;
  for (const [index, page] of run.acknowledgedPages.entries()) {
    requirePlainText(page.manifestId, "acknowledged manifest id");
    if (ids.has(page.manifestId)) throw new Error("acknowledged manifest ids must be unique");
    ids.add(page.manifestId);
    if (!SHA256.test(page.digest)) throw new Error("acknowledged digest must be sha256 hex");
    if (page.sequence !== index) throw new Error("acknowledged pages must be in exact sequence");
    if (!Number.isSafeInteger(page.recordCount) || page.recordCount < 0) {
      throw new Error("acknowledged page count must be a non-negative safe integer");
    }
    if (page.currentCursor !== null && typeof page.currentCursor !== "string") {
      throw new Error("acknowledged current cursor must be text or null");
    }
    requirePlainText(page.nextCursor, "acknowledged next cursor");
    if (page.coverageMarker !== null) {
      requirePlainText(page.coverageMarker, "acknowledged coverage marker");
    }
    if (page.final !== (page.coverageMarker !== null)) {
      throw new Error("only a final acknowledged page may carry a coverage marker");
    }
    if (page.fence !== run.lease.fence) throw new Error("acknowledged page fence changed");
    if (page.dirtyGeneration !== run.startedDirtyGeneration) {
      throw new Error("acknowledged page dirty generation changed");
    }
    requireTime(page.acknowledgedAt, "page acknowledgement time");
    if (Date.parse(page.acknowledgedAt) >= Date.parse(run.lease.expiresAt)) {
      throw new Error("an acknowledged page falls outside the run lease");
    }
    if (prior && (prior.final || page.currentCursor !== prior.nextCursor)) {
      throw new Error("acknowledged page cursor chain is discontinuous");
    }
    total += page.recordCount;
    if (!Number.isSafeInteger(total)) {
      throw new Error("acknowledged record count exceeds a safe JSON number");
    }
    prior = page;
  }

  if (total !== run.acknowledgedRecordCount) {
    throw new Error("acknowledged page totals do not match the run");
  }
  if (prior) {
    if (
      run.stagedCursor !== prior.nextCursor ||
      run.stagedCoverageMarker !== prior.coverageMarker
    ) {
      throw new Error("staged run markers do not match the acknowledged page chain");
    }
  } else if (run.stagedCoverageMarker !== null) {
    throw new Error("an empty run cannot carry a staged coverage marker");
  }
}

export function effectiveSyncControl(control: AccountingSyncControl): SyncControlDecision {
  if (control.allConnectorsStopped) return { allowed: false, reason: "all-connectors-stopped" };
  if (control.providerStopped) return { allowed: false, reason: "provider-stopped" };
  if (control.connectionStopped) return { allowed: false, reason: "connection-stopped" };
  if (control.datasetStopped) return { allowed: false, reason: "dataset-stopped" };
  if (control.syncStopped) return { allowed: false, reason: "sync-stopped" };
  return { allowed: true };
}

export function acknowledgePage(
  run: SyncRun,
  manifest: PageManifest,
  acknowledgement: PageAcknowledgement,
  acknowledgedAt: string,
): SyncRun {
  assertSyncRun(run);
  assertPageManifest(manifest);
  requireTime(acknowledgedAt, "acknowledgement time");
  if (run.state !== "active") throw new Error("only an active run can acknowledge a page");
  if (Date.parse(run.lease.expiresAt) <= Date.parse(acknowledgedAt)) {
    throw new Error("the sync lease expired before acknowledgement");
  }
  const bound =
    manifest.runId === run.id &&
    manifest.sourceConnectionId === run.sourceConnectionId &&
    manifest.replicaId === run.replicaId &&
    manifest.dataset === run.dataset &&
    manifest.fence === run.lease.fence &&
    manifest.dirtyGeneration === run.startedDirtyGeneration &&
    acknowledgement.manifestId === manifest.id &&
    acknowledgement.runId === manifest.runId &&
    acknowledgement.replicaId === manifest.replicaId &&
    acknowledgement.dataset === manifest.dataset &&
    acknowledgement.sequence === manifest.sequence &&
    acknowledgement.fence === manifest.fence &&
    acknowledgement.digest === manifest.digest;
  if (!bound) throw new Error("the acknowledgement does not exactly match the current manifest");
  const existing = run.acknowledgedPages.find((page) => page.manifestId === manifest.id);
  if (existing) {
    if (
      existing.digest !== acknowledgement.digest ||
      existing.sequence !== acknowledgement.sequence ||
      existing.recordCount !== manifest.recordCount ||
      existing.currentCursor !== manifest.currentCursor ||
      existing.nextCursor !== manifest.nextCursor ||
      existing.coverageMarker !== manifest.coverageMarker ||
      existing.fence !== manifest.fence ||
      existing.dirtyGeneration !== manifest.dirtyGeneration ||
      existing.final !== manifest.final
    ) {
      throw new Error("an acknowledged manifest cannot change");
    }
    return run;
  }
  if (run.stagedCoverageMarker !== null) {
    throw new Error("a final page has already completed this run");
  }
  if (manifest.sequence !== run.nextSequence || manifest.currentCursor !== run.stagedCursor) {
    throw new Error("only the current page may be acknowledged");
  }
  if (Date.parse(manifest.expiresAt) <= Date.parse(acknowledgedAt)) {
    throw new Error("the page manifest expired before acknowledgement");
  }
  const acknowledgedRecordCount = run.acknowledgedRecordCount + manifest.recordCount;
  if (!Number.isSafeInteger(acknowledgedRecordCount)) {
    throw new Error("acknowledged record count exceeds a safe JSON number");
  }
  return {
    ...run,
    nextSequence: run.nextSequence + 1,
    stagedCursor: manifest.nextCursor,
    stagedCoverageMarker: manifest.coverageMarker,
    acknowledgedRecordCount,
    acknowledgedPages: [
      ...run.acknowledgedPages,
      {
        manifestId: manifest.id,
        digest: manifest.digest,
        sequence: manifest.sequence,
        recordCount: manifest.recordCount,
        currentCursor: manifest.currentCursor,
        nextCursor: manifest.nextCursor,
        coverageMarker: manifest.coverageMarker,
        fence: manifest.fence,
        dirtyGeneration: manifest.dirtyGeneration,
        acknowledgedAt,
        final: manifest.final,
      },
    ],
  };
}

export function canPromoteCheckpoint(run: SyncRun): boolean {
  assertSyncRun(run);
  if (run.state !== "active" || run.stagedCoverageMarker === null) return false;
  if (run.acknowledgedPages.length !== run.nextSequence || run.nextSequence === 0) return false;
  return run.acknowledgedPages.at(-1)?.final === true;
}

export function promoteCheckpoint(
  run: SyncRun,
  completedAt: string,
  currentDirtyGeneration: DecimalString,
): { run: SyncRun; checkpoint: DatasetCheckpoint; dirty: boolean } {
  requireTime(completedAt, "checkpoint completion time");
  requireDecimal(currentDirtyGeneration, "current dirty generation");
  if (!canPromoteCheckpoint(run)) throw new Error("the whole dataset run is not complete");
  const checkpoint: DatasetCheckpoint = {
    schema: ACCOUNTING_SYNC_SCHEMA,
    sourceConnectionId: run.sourceConnectionId,
    replicaId: run.replicaId,
    dataset: run.dataset,
    completedRunId: run.id,
    committedCursor: run.stagedCursor!,
    coverageMarker: run.stagedCoverageMarker!,
    committedDirtyGeneration: run.startedDirtyGeneration,
    pageCount: run.acknowledgedPages.length,
    recordCount: run.acknowledgedRecordCount,
    completedAt,
  };
  return {
    run: { ...run, state: "completed" },
    checkpoint,
    dirty: currentDirtyGeneration !== run.startedDirtyGeneration,
  };
}
