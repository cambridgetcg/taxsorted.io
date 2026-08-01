import {
  ACCOUNTING_SYNC_SCHEMA,
  assertPageManifest,
  type DatasetCheckpoint as ApiDatasetCheckpoint,
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

type AccountingSyncClient = Pick<
  typeof api,
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

function stopped(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Accounting sync stopped.", "AbortError");
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
  const maxPages = input.maxPages ?? 10;
  if (!Number.isSafeInteger(maxPages) || maxPages < 1) {
    throw new Error("Accounting sync needs a positive page limit.");
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

  for (let sequence = 0; sequence < maxPages; sequence += 1) {
    stopped(input.signal);
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
    const computedDigest = await digest(page.records);
    if (computedDigest !== page.manifest.digest) {
      throw new Error("The accounting page changed in transit; nothing was saved or acknowledged.");
    }
    if (page.records.length !== page.manifest.recordCount) {
      throw new Error("The accounting page count does not match its signed manifest.");
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
    const acknowledgement = {
      fence: input.run.lease.fence,
      manifestId: page.manifest.id,
      runId: input.run.id,
      replicaId: input.run.replicaId,
      dataset: input.run.dataset,
      sequence: page.manifest.sequence,
      digest: page.manifest.digest,
      localReplicaId: input.localReplicaId,
    };
    let acknowledged;
    try {
      acknowledged = await client.acknowledgeAccountingSyncPage(
        input.run.id,
        acknowledgement
      );
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      stopped(input.signal);
      acknowledged = await client.acknowledgeAccountingSyncPage(
        input.run.id,
        acknowledgement
      );
    }
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

    added += committed.added;
    duplicates += committed.duplicates;
    conflicts += committed.conflicts;
    recordCount += page.manifest.recordCount;
    if (!Number.isSafeInteger(recordCount)) {
      throw new Error("The accounting record total exceeds a safe JSON number.");
    }
    prior = page.manifest;
    if (!page.manifest.final) continue;

    stopped(input.signal);
    input.onProgress?.({ stage: "completing-run", page: sequence + 1 });
    let completed;
    try {
      completed = await client.completeAccountingSyncRun(
        input.run.id,
        input.run.lease.fence,
        input.localReplicaId
      );
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      stopped(input.signal);
      completed = await client.completeAccountingSyncRun(
        input.run.id,
        input.run.lease.fence,
        input.localReplicaId
      );
    }
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
      completed.run.acknowledgedPages.length !== sequence + 1
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

  throw new Error(`Accounting sync stopped after the ${maxPages}-page safety limit.`);
}
