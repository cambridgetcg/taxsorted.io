import {
  ACCOUNTING_SYNC_SCHEMA,
  assertPageManifest,
  assertSyncRun,
  type AcknowledgedPage,
  type DatasetCheckpoint as ApiDatasetCheckpoint,
  type PageAcknowledgement,
  type PageManifest,
  type SyncRun,
} from "@taxsorted/engine/accounting-sync";
import type { SourceType } from "@taxsorted/engine/uk/itsa";
import { api } from "@/lib/api";
import { createRecordsStore, type ProviderSyncRunInput, type RecordsStore } from "@/lib/records";
import {
  accountingPageDigest,
  normalizeSyntheticAccountingPage,
  type NormalizedSyntheticPage,
} from "@/lib/synthetic-accounting-normalizer";

export type AccountingSyncClient = Pick<
  typeof api,
  | "renewAccountingSyncLease"
  | "pullAccountingSyncPage"
  | "acknowledgeAccountingSyncPage"
  | "completeAccountingSyncRun"
>;

type AccountingSyncStore = Pick<
  RecordsStore,
  "commitProviderPage" | "markProviderPageAcknowledged" | "completeProviderSync"
>;

export type AccountingSyncStage =
  | "reading-page"
  | "checking-page"
  | "saving-page"
  | "acknowledging-page"
  | "completing-run";

export interface RunSyntheticAccountingSyncInput {
  run: SyncRun;
  /** Non-enumerable browser-store proof required again on every API operation. */
  localReplicaId: string;
  organisationId: string;
  organisationName: string;
  activity: SourceType;
  signal?: AbortSignal;
  /** A bounded off-switch for malformed or unexpectedly large providers. */
  maxPages?: number;
  /** Raw provider records allowed on one page before any local write. */
  maxRecordsPerPage?: number;
  /** Raw provider records allowed across the whole run before any local write. */
  maxRecords?: number;
  onProgress?: (progress: { stage: AccountingSyncStage; page: number }) => void;
}

export interface SyntheticAccountingSyncResult {
  checkpoint: ApiDatasetCheckpoint;
  needsAnotherSync: boolean;
  pageCount: number;
  added: number;
  duplicates: number;
  conflicts: number;
}

export interface AccountingSyncDependencies {
  client?: AccountingSyncClient;
  store?: AccountingSyncStore;
  digest?: (records: readonly unknown[]) => Promise<string>;
  normalize?: (
    records: readonly unknown[],
    context: {
      organisationId: string;
      organisationName: string;
      observedAt: string;
      activity: SourceType;
    }
  ) => Promise<NormalizedSyntheticPage>;
  now?: () => string;
}

/** Conservative browser ceilings. Provider policy may impose smaller limits. */
export const DEFAULT_ACCOUNTING_SYNC_PAGE_LIMIT = 1_000;
export const DEFAULT_ACCOUNTING_SYNC_RECORDS_PER_PAGE_LIMIT = 1_000;
export const DEFAULT_ACCOUNTING_SYNC_RECORD_LIMIT = 100_000;

type AcknowledgedPageProof = Omit<AcknowledgedPage, "acknowledgedAt">;

function acknowledgedProof(page: AcknowledgedPage | PageManifest): AcknowledgedPageProof {
  return {
    manifestId: "manifestId" in page ? page.manifestId : page.id,
    digest: page.digest,
    sequence: page.sequence,
    recordCount: page.recordCount,
    currentCursor: page.currentCursor,
    nextCursor: page.nextCursor,
    coverageMarker: page.coverageMarker,
    fence: page.fence,
    dirtyGeneration: page.dirtyGeneration,
    final: page.final,
  };
}

function exactAcknowledgedPages(
  actual: readonly AcknowledgedPage[],
  expected: readonly AcknowledgedPageProof[]
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((page, index) => {
      const proof = expected[index];
      return (
        proof !== undefined &&
        page.manifestId === proof.manifestId &&
        page.digest === proof.digest &&
        page.sequence === proof.sequence &&
        page.recordCount === proof.recordCount &&
        page.currentCursor === proof.currentCursor &&
        page.nextCursor === proof.nextCursor &&
        page.coverageMarker === proof.coverageMarker &&
        page.fence === proof.fence &&
        page.dirtyGeneration === proof.dirtyGeneration &&
        page.final === proof.final
      );
    })
  );
}

function stopped(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Accounting sync stopped.", "AbortError");
}

async function retryAmbiguousResponse<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    stopped(signal);
    return operation();
  }
}

async function renewLease(
  client: AccountingSyncClient,
  run: SyncRun,
  localReplicaId: string,
  expected: {
    nextSequence: number;
    acknowledgedRecordCount: number;
    stagedCursor: string | null;
    stagedCoverageMarker: string | null;
    acknowledgedPages: readonly AcknowledgedPageProof[];
  },
  signal?: AbortSignal
): Promise<void> {
  stopped(signal);
  const renewed = await retryAmbiguousResponse(
    () => client.renewAccountingSyncLease(run.id, run.lease.fence, localReplicaId),
    signal
  );
  assertSyncRun(renewed.run);
  if (
    renewed.run.id !== run.id ||
    renewed.run.state !== "active" ||
    renewed.run.sourceConnectionId !== run.sourceConnectionId ||
    renewed.run.replicaId !== run.replicaId ||
    renewed.run.dataset !== run.dataset ||
    renewed.run.kind !== run.kind ||
    renewed.run.lease.fence !== run.lease.fence ||
    renewed.run.startedDirtyGeneration !== run.startedDirtyGeneration ||
    renewed.run.nextSequence !== expected.nextSequence ||
    renewed.run.acknowledgedRecordCount !== expected.acknowledgedRecordCount ||
    renewed.run.stagedCursor !== expected.stagedCursor ||
    renewed.run.stagedCoverageMarker !== expected.stagedCoverageMarker ||
    !exactAcknowledgedPages(renewed.run.acknowledgedPages, expected.acknowledgedPages)
  ) {
    throw new Error("The accounting API renewed a different sync run.");
  }
}

function requireFreshRun(run: SyncRun): void {
  if (
    run.state !== "active" ||
    run.nextSequence !== 0 ||
    run.acknowledgedPages.length !== 0 ||
    run.acknowledgedRecordCount !== 0 ||
    run.stagedCoverageMarker !== null
  ) {
    throw new Error("Start a fresh accounting sync run for this local browser replica.");
  }
  if (!/^[1-9]\d*$/u.test(run.lease.fence)) {
    throw new Error("The accounting sync run has an invalid fence.");
  }
  if (!/^(0|[1-9]\d*)$/u.test(run.startedDirtyGeneration)) {
    throw new Error("The accounting sync run has an invalid dirty generation.");
  }
}

function bindManifest(manifest: PageManifest, run: SyncRun, sequence: number): void {
  assertPageManifest(manifest);
  if (
    manifest.runId !== run.id ||
    manifest.sourceConnectionId !== run.sourceConnectionId ||
    manifest.replicaId !== run.replicaId ||
    manifest.dataset !== run.dataset ||
    manifest.fence !== run.lease.fence ||
    manifest.dirtyGeneration !== run.startedDirtyGeneration ||
    manifest.sequence !== sequence ||
    (sequence === 0 && manifest.currentCursor !== run.stagedCursor)
  ) {
    throw new Error("The accounting page manifest does not belong to this sync run.");
  }
}

function bindCheckpoint(checkpoint: ApiDatasetCheckpoint, run: SyncRun, final: PageManifest): void {
  if (
    checkpoint.schema !== ACCOUNTING_SYNC_SCHEMA ||
    checkpoint.sourceConnectionId !== run.sourceConnectionId ||
    checkpoint.replicaId !== run.replicaId ||
    checkpoint.dataset !== run.dataset ||
    checkpoint.completedRunId !== run.id ||
    checkpoint.committedCursor !== final.nextCursor ||
    checkpoint.coverageMarker !== final.coverageMarker ||
    checkpoint.committedDirtyGeneration !== final.dirtyGeneration
  ) {
    throw new Error("The completed accounting checkpoint does not match the local sync proof.");
  }
  if (
    !Number.isSafeInteger(checkpoint.pageCount) ||
    checkpoint.pageCount < 1 ||
    !Number.isSafeInteger(checkpoint.recordCount) ||
    checkpoint.recordCount < 0 ||
    !Number.isFinite(Date.parse(checkpoint.completedAt))
  ) {
    throw new Error("The completed accounting checkpoint is invalid.");
  }
}

/**
 * Pull every page from the made-up provider using the same protocol a real
 * adapter will use. Each exact raw page is hashed, normalised and written with
 * its full manifest before the API can be acknowledged. The local checkpoint
 * advances only after the API completes the whole run.
 */
export async function runSyntheticAccountingSync(
  input: RunSyntheticAccountingSyncInput,
  dependencies: AccountingSyncDependencies = {}
): Promise<SyntheticAccountingSyncResult> {
  requireFreshRun(input.run);
  if (!input.localReplicaId.trim()) {
    throw new Error("Accounting sync needs this browser's local replica proof.");
  }
  if (input.run.dataset !== "bank-transactions") {
    throw new Error("The made-up provider only offers bank transactions.");
  }
  const client = dependencies.client ?? api;
  const store = dependencies.store ?? createRecordsStore();
  const digest = dependencies.digest ?? accountingPageDigest;
  const normalize = dependencies.normalize ?? normalizeSyntheticAccountingPage;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const maxPages = input.maxPages ?? DEFAULT_ACCOUNTING_SYNC_PAGE_LIMIT;
  const maxRecordsPerPage =
    input.maxRecordsPerPage ?? DEFAULT_ACCOUNTING_SYNC_RECORDS_PER_PAGE_LIMIT;
  const maxRecords = input.maxRecords ?? DEFAULT_ACCOUNTING_SYNC_RECORD_LIMIT;
  if (!Number.isSafeInteger(maxPages) || maxPages < 1) {
    throw new Error("Accounting sync needs a positive page limit.");
  }
  if (!Number.isSafeInteger(maxRecordsPerPage) || maxRecordsPerPage < 1) {
    throw new Error("Accounting sync needs a positive per-page record limit.");
  }
  if (!Number.isSafeInteger(maxRecords) || maxRecords < 1) {
    throw new Error("Accounting sync needs a positive total record limit.");
  }

  const localRun: ProviderSyncRunInput = {
    id: input.run.id,
    sourceConnectionId: input.run.sourceConnectionId,
    syncReplicaId: input.run.replicaId,
    localReplicaId: input.localReplicaId,
    dataset: input.run.dataset,
    kind: input.run.kind,
    fence: input.run.lease.fence,
    startedAt: now(),
  };
  let prior: PageManifest | null = null;
  let added = 0;
  let duplicates = 0;
  let conflicts = 0;
  let recordCount = 0;
  const acknowledgedPages = input.run.acknowledgedPages.map(acknowledgedProof);
  const seenContinuationCursors = new Set<string>();
  if (input.run.stagedCursor !== null) seenContinuationCursors.add(input.run.stagedCursor);

  for (let sequence = 0; sequence < maxPages; sequence += 1) {
    stopped(input.signal);
    const expectedProgress = {
      nextSequence: sequence,
      acknowledgedRecordCount: input.run.acknowledgedRecordCount + recordCount,
      stagedCursor: prior?.nextCursor ?? input.run.stagedCursor,
      stagedCoverageMarker: prior?.coverageMarker ?? input.run.stagedCoverageMarker,
      acknowledgedPages,
    };
    await renewLease(
      client,
      input.run,
      input.localReplicaId,
      expectedProgress,
      input.signal
    );
    input.onProgress?.({ stage: "reading-page", page: sequence + 1 });
    const page = await client.pullAccountingSyncPage(
      input.run.id,
      "bank-transactions",
      input.run.lease.fence,
      input.localReplicaId
    );

    stopped(input.signal);
    input.onProgress?.({ stage: "checking-page", page: sequence + 1 });
    bindManifest(page.manifest, input.run, sequence);
    if (
      prior &&
      (prior.final ||
        page.manifest.currentCursor !== prior.nextCursor ||
        page.manifest.dirtyGeneration !== prior.dirtyGeneration)
    ) {
      throw new Error("The accounting provider returned a discontinuous page chain.");
    }
    if (!page.manifest.final && sequence + 1 === maxPages) {
      throw new Error(
        `Accounting sync reached its ${maxPages}-page safety limit before the provider finished.`
      );
    }
    if (
      !page.manifest.final &&
      (page.manifest.nextCursor === page.manifest.currentCursor ||
        seenContinuationCursors.has(page.manifest.nextCursor))
    ) {
      throw new Error("The accounting provider returned a repeating page cursor.");
    }
    if (page.records.length !== page.manifest.recordCount) {
      throw new Error("The accounting page count does not match its signed manifest.");
    }
    if (
      page.manifest.recordCount > maxRecordsPerPage ||
      page.records.length > maxRecordsPerPage
    ) {
      throw new Error("The accounting provider page exceeds the local record safety limit.");
    }
    const totalRecordCount =
      input.run.acknowledgedRecordCount + recordCount + page.manifest.recordCount;
    if (!Number.isSafeInteger(totalRecordCount) || totalRecordCount > maxRecords) {
      throw new Error("The accounting sync exceeds the local total record safety limit.");
    }
    const computedDigest = await digest(page.records);
    if (computedDigest !== page.manifest.digest) {
      throw new Error("The accounting page changed in transit; nothing was saved or acknowledged.");
    }
    const observedAt = now();
    const normalized = await normalize(page.records, {
      organisationId: input.organisationId,
      organisationName: input.organisationName,
      observedAt,
      activity: input.activity,
    });

    stopped(input.signal);
    input.onProgress?.({ stage: "saving-page", page: sequence + 1 });
    const committed = await store.commitProviderPage({
      run: localRun,
      manifest: page.manifest,
      rawVersions: normalized.rawVersions,
      normalizedVersions: normalized.normalizedVersions,
      candidates: normalized.candidates,
      committedAt: observedAt,
    });

    stopped(input.signal);
    input.onProgress?.({ stage: "acknowledging-page", page: sequence + 1 });
    await renewLease(
      client,
      input.run,
      input.localReplicaId,
      expectedProgress,
      input.signal
    );
    const acknowledgement: PageAcknowledgement & { localReplicaId: string } = {
      fence: input.run.lease.fence,
      manifestId: page.manifest.id,
      runId: input.run.id,
      replicaId: input.run.replicaId,
      dataset: input.run.dataset,
      sequence: page.manifest.sequence,
      digest: page.manifest.digest,
      localReplicaId: input.localReplicaId,
    };
    const acknowledged = await retryAmbiguousResponse(
      () => client.acknowledgeAccountingSyncPage(
        input.run.id,
        acknowledgement
      ),
      input.signal
    );
    if (
      acknowledged.acknowledgement.manifestId !== page.manifest.id ||
      acknowledged.acknowledgement.runId !== input.run.id ||
      acknowledged.acknowledgement.replicaId !== input.run.replicaId ||
      acknowledged.acknowledgement.dataset !== input.run.dataset ||
      acknowledged.acknowledgement.sequence !== page.manifest.sequence ||
      acknowledged.acknowledgement.fence !== input.run.lease.fence ||
      acknowledged.acknowledgement.digest !== page.manifest.digest ||
      acknowledged.nextSequence !== sequence + 1
    ) {
      throw new Error("The accounting API acknowledged a different page.");
    }
    await store.markProviderPageAcknowledged({
      localReplicaId: input.localReplicaId,
      runId: input.run.id,
      manifestId: page.manifest.id,
      digest: page.manifest.digest,
      acknowledgedAt: now(),
    });
    acknowledgedPages.push(acknowledgedProof(page.manifest));

    added += committed.added;
    duplicates += committed.duplicates;
    conflicts += committed.conflicts;
    recordCount += page.manifest.recordCount;
    if (!Number.isSafeInteger(recordCount)) {
      throw new Error("The accounting record total exceeds a safe JSON number.");
    }
    prior = page.manifest;
    if (!page.manifest.final) seenContinuationCursors.add(page.manifest.nextCursor);
    if (!page.manifest.final) continue;

    stopped(input.signal);
    input.onProgress?.({ stage: "completing-run", page: sequence + 1 });
    await renewLease(
      client,
      input.run,
      input.localReplicaId,
      {
        nextSequence: sequence + 1,
        acknowledgedRecordCount: input.run.acknowledgedRecordCount + recordCount,
        stagedCursor: page.manifest.nextCursor,
        stagedCoverageMarker: page.manifest.coverageMarker,
        acknowledgedPages,
      },
      input.signal
    );
    const completed = await retryAmbiguousResponse(
      () =>
        client.completeAccountingSyncRun(
          input.run.id,
          input.run.lease.fence,
          input.localReplicaId
        ),
      input.signal
    );
    assertSyncRun(completed.run);
    if (
      completed.run.id !== input.run.id ||
      completed.run.state !== "completed" ||
      completed.run.sourceConnectionId !== input.run.sourceConnectionId ||
      completed.run.replicaId !== input.run.replicaId ||
      completed.run.dataset !== input.run.dataset ||
      completed.run.kind !== input.run.kind ||
      completed.run.lease.fence !== input.run.lease.fence ||
      completed.run.startedDirtyGeneration !== input.run.startedDirtyGeneration ||
      completed.run.nextSequence !== sequence + 1 ||
      completed.run.stagedCursor !== page.manifest.nextCursor ||
      completed.run.stagedCoverageMarker !== page.manifest.coverageMarker ||
      completed.run.acknowledgedRecordCount !== recordCount ||
      !exactAcknowledgedPages(completed.run.acknowledgedPages, acknowledgedPages)
    ) {
      throw new Error("The accounting API completed a different sync run.");
    }
    bindCheckpoint(completed.checkpoint, input.run, page.manifest);
    if (
      completed.checkpoint.pageCount !== sequence + 1 ||
      completed.checkpoint.recordCount !== input.run.acknowledgedRecordCount + recordCount
    ) {
      throw new Error("The accounting checkpoint totals do not match the pages just saved.");
    }
    await store.completeProviderSync({
      localReplicaId: input.localReplicaId,
      runId: input.run.id,
      checkpoint: {
        sourceConnectionId: completed.checkpoint.sourceConnectionId,
        syncReplicaId: completed.checkpoint.replicaId,
        dataset: completed.checkpoint.dataset,
        completedRunId: completed.checkpoint.completedRunId,
        committedCursor: completed.checkpoint.committedCursor,
        coverageMarker: completed.checkpoint.coverageMarker,
        dirtyGeneration: completed.checkpoint.committedDirtyGeneration,
        pageCount: completed.checkpoint.pageCount,
        recordCount: completed.checkpoint.recordCount,
        completedAt: completed.checkpoint.completedAt,
      },
      finishedAt: completed.checkpoint.completedAt,
    });
    return {
      checkpoint: completed.checkpoint,
      needsAnotherSync: completed.needsAnotherSync,
      pageCount: sequence + 1,
      added,
      duplicates,
      conflicts,
    };
  }

  throw new Error(`Accounting sync reached its ${maxPages}-page safety limit.`);
}
