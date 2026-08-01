import {
  ACCOUNTING_SYNC_SCHEMA,
  assertSyncRun,
  type DatasetCheckpoint as ApiDatasetCheckpoint,
  type SyncRun,
  type SyncRunKind,
} from "@taxsorted/engine/accounting-sync";
import type { SourceType } from "@taxsorted/engine/uk/itsa";
import {
  api,
  type AccountingOrganisation,
  type AccountingReplica,
  type AccountingSourceConnection,
} from "@/lib/api";
import {
  runSyntheticAccountingSync,
  type AccountingSyncStage,
  type SyntheticAccountingSyncResult,
} from "@/lib/accounting-sync";
import {
  accountingPageDigest,
  accountingValueDigest,
} from "@/lib/synthetic-accounting-normalizer";
import { primaryLedgerId } from "@/lib/local-books";
import type {
  DatasetCheckpoint as LocalDatasetCheckpoint,
  LocalBooksState,
  LocalSyncRun,
} from "@/lib/local-books";
import { createSyntheticDemoRecordsStore, type RecordsStore } from "@/lib/records";

const SYNTHETIC_ORGANISATION_ID = "synthetic-uk-sole-trader";
const SYNTHETIC_ORGANISATION_NAME = "Mina's Card Studio (made-up)";

type SyntheticDemoClient = Pick<
  typeof api,
  | "startSyntheticAccountingAuthorisation"
  | "listAccountingOrganisations"
  | "createAccountingSourceConnection"
  | "accountingSourceStatus"
  | "createAccountingReplica"
  | "startAccountingSyncRun"
  | "pullAccountingSyncPage"
  | "acknowledgeAccountingSyncPage"
  | "completeAccountingSyncRun"
  | "cancelAccountingSyncRun"
>;

type SyntheticDemoStore = Pick<
  RecordsStore,
  | "state"
  | "bindProviderConnection"
  | "commitProviderPage"
  | "markProviderPageAcknowledged"
  | "completeProviderSync"
>;

export type SyntheticDemoStage =
  | "opening-source"
  | "checking-source"
  | "binding-browser"
  | "starting-sync"
  | AccountingSyncStage;

export interface SyntheticAccountingDemoInput {
  entity: { id: string; name: string };
  activity: SourceType;
  signal?: AbortSignal;
  onProgress?: (progress: { stage: SyntheticDemoStage; page?: number }) => void;
}

export interface SyntheticAccountingDemoResult extends SyntheticAccountingSyncResult {
  sourceConnection: AccountingSourceConnection;
  organisation: AccountingOrganisation;
  replica: AccountingReplica;
  ledgerId: string;
  kind: SyncRunKind;
}

export interface SyntheticAccountingDemoDependencies {
  client?: SyntheticDemoClient;
  store?: SyntheticDemoStore;
  now?: () => string;
  runSync?: typeof runSyntheticAccountingSync;
}

function stopped(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Accounting sync stopped.", "AbortError");
}

function exactOrganisation(organisation: AccountingOrganisation): void {
  if (
    organisation.id !== SYNTHETIC_ORGANISATION_ID ||
    organisation.name !== SYNTHETIC_ORGANISATION_NAME ||
    organisation.countryCode !== "GB" ||
    organisation.baseCurrency !== "GBP" ||
    organisation.synthetic !== true ||
    organisation.datasets.length !== 1 ||
    organisation.datasets[0] !== "bank-transactions"
  ) {
    throw new Error("The made-up provider offered an unexpected organisation or dataset.");
  }
}

function exactSource(
  source: AccountingSourceConnection,
  expected: { id?: string; authorisationId?: string; entityId: string }
): void {
  if (
    (expected.id !== undefined && source.id !== expected.id) ||
    (expected.authorisationId !== undefined &&
      source.authorisationId !== expected.authorisationId) ||
    source.entityId !== expected.entityId ||
    source.provider !== "synthetic" ||
    source.environment !== "sandbox" ||
    source.status !== "active" ||
    source.organisation.id !== SYNTHETIC_ORGANISATION_ID ||
    source.organisation.name !== SYNTHETIC_ORGANISATION_NAME ||
    source.organisation.countryCode !== "GB" ||
    source.organisation.baseCurrency !== "GBP" ||
    !/^(0|[1-9]\d*)$/u.test(source.dirtyGeneration)
  ) {
    throw new Error("The accounting source response does not match the chosen entity and organisation.");
  }
}

function exactReplica(
  replica: AccountingReplica,
  sourceConnectionId: string,
  localReplicaId: string
): void {
  if (
    !replica.id ||
    replica.sourceConnectionId !== sourceConnectionId ||
    replica.localReplicaId !== localReplicaId ||
    replica.status !== "active"
  ) {
    throw new Error("The server sync replica does not match this browser's local books.");
  }
}

function localCheckpointFrom(remote: ApiDatasetCheckpoint): LocalDatasetCheckpoint {
  return {
    sourceConnectionId: remote.sourceConnectionId,
    syncReplicaId: remote.replicaId,
    dataset: remote.dataset,
    completedRunId: remote.completedRunId,
    committedCursor: remote.committedCursor,
    coverageMarker: remote.coverageMarker,
    dirtyGeneration: remote.committedDirtyGeneration,
    pageCount: remote.pageCount,
    recordCount: remote.recordCount,
    completedAt: remote.completedAt,
  };
}

function checkpointsAgree(
  remote: ApiDatasetCheckpoint,
  local: LocalDatasetCheckpoint
): boolean {
  return (
    remote.sourceConnectionId === local.sourceConnectionId &&
    remote.replicaId === local.syncReplicaId &&
    remote.dataset === local.dataset &&
    remote.completedRunId === local.completedRunId &&
    remote.committedCursor === local.committedCursor &&
    remote.coverageMarker === local.coverageMarker &&
    remote.committedDirtyGeneration === local.dirtyGeneration &&
    remote.pageCount === local.pageCount &&
    remote.recordCount === local.recordCount &&
    remote.completedAt === local.completedAt
  );
}

function exactRecoverableRun(
  run: LocalSyncRun | undefined,
  remote: ApiDatasetCheckpoint,
  localBaseRunId: string | null
): run is LocalSyncRun {
  if (
    !run ||
    run.id !== remote.completedRunId ||
    run.sourceConnectionId !== remote.sourceConnectionId ||
    run.syncReplicaId !== remote.replicaId ||
    run.dataset !== remote.dataset ||
    run.baseCompletedRunId === undefined ||
    run.baseCompletedRunId !== localBaseRunId ||
    run.pages.length !== remote.pageCount ||
    run.pages.length === 0 ||
    run.pages.some((page, sequence) =>
      page.manifest.sequence !== sequence || !page.acknowledgedAt
    )
  ) {
    return false;
  }
  const final = run.pages.at(-1)!.manifest;
  const recordCount = run.pages.reduce((total, page) => total + page.manifest.recordCount, 0);
  return (
    Number.isSafeInteger(recordCount) &&
    final.final &&
    final.nextCursor === remote.committedCursor &&
    final.coverageMarker === remote.coverageMarker &&
    final.dirtyGeneration === remote.committedDirtyGeneration &&
    recordCount === remote.recordCount
  );
}

async function verifyRecoverableRunProof(
  state: LocalBooksState,
  run: LocalSyncRun | undefined,
  remote: ApiDatasetCheckpoint,
  localBaseRunId: string | null
): Promise<boolean> {
  if (!exactRecoverableRun(run, remote, localBaseRunId)) return false;
  const rawById = new Map(state.rawProviderVersions.map((version) => [version.id, version]));
  const normalizedById = new Map(
    state.normalizedProviderVersions.map((version) => [version.id, version])
  );
  for (const page of run.pages) {
    if (
      page.rawVersionIds.length !== page.manifest.recordCount ||
      page.normalizedVersionIds.length !== page.rawVersionIds.length ||
      new Set(page.rawVersionIds).size !== page.rawVersionIds.length ||
      new Set(page.normalizedVersionIds).size !== page.normalizedVersionIds.length
    ) {
      return false;
    }
    const pageRawIds = new Set(page.rawVersionIds);
    const payloads: unknown[] = [];
    for (const id of page.rawVersionIds) {
      const raw = rawById.get(id);
      if (!raw || (await accountingValueDigest(raw.payload)) !== raw.payloadDigest) return false;
      payloads.push(raw.payload);
    }
    if ((await accountingPageDigest(payloads)) !== page.manifest.digest) return false;
    const linkedRawIds = new Set<string>();
    for (const id of page.normalizedVersionIds) {
      const normalized = normalizedById.get(id);
      if (
        !normalized ||
        !pageRawIds.has(normalized.rawVersionId) ||
        linkedRawIds.has(normalized.rawVersionId)
      ) {
        return false;
      }
      linkedRawIds.add(normalized.rawVersionId);
    }
    if (linkedRawIds.size !== pageRawIds.size) return false;
  }
  return true;
}

function exactCompletedRecovery(
  completed: { run: SyncRun; checkpoint: ApiDatasetCheckpoint; needsAnotherSync: boolean },
  localRun: LocalSyncRun,
  remote: ApiDatasetCheckpoint
): void {
  assertSyncRun(completed.run);
  const pagesMatch = completed.run.acknowledgedPages.every((page, sequence) => {
    const manifest = localRun.pages[sequence]?.manifest;
    return (
      manifest !== undefined &&
      page.manifestId === manifest.id &&
      page.digest === manifest.digest &&
      page.sequence === manifest.sequence &&
      page.recordCount === manifest.recordCount &&
      page.currentCursor === manifest.currentCursor &&
      page.nextCursor === manifest.nextCursor &&
      page.coverageMarker === manifest.coverageMarker &&
      page.fence === manifest.fence &&
      page.dirtyGeneration === manifest.dirtyGeneration &&
      page.final === manifest.final
    );
  });
  if (
    completed.run.id !== localRun.id ||
    completed.run.state !== "completed" ||
    completed.run.sourceConnectionId !== localRun.sourceConnectionId ||
    completed.run.replicaId !== localRun.syncReplicaId ||
    completed.run.dataset !== localRun.dataset ||
    completed.run.kind !== localRun.kind ||
    completed.run.lease.fence !== localRun.fence ||
    completed.run.nextSequence !== localRun.pages.length ||
    completed.run.acknowledgedPages.length !== localRun.pages.length ||
    !pagesMatch ||
    !checkpointsAgree(completed.checkpoint, localCheckpointFrom(remote)) ||
    typeof completed.needsAnotherSync !== "boolean"
  ) {
    throw new Error("The completed server run does not match the exact locally saved proof.");
  }
}

function checkpointFor(
  state: LocalBooksState,
  sourceConnectionId: string,
  syncReplicaId: string
): LocalDatasetCheckpoint | undefined {
  return state.datasetCheckpoints.find(
    (checkpoint) =>
      checkpoint.sourceConnectionId === sourceConnectionId &&
      checkpoint.syncReplicaId === syncReplicaId &&
      checkpoint.dataset === "bank-transactions"
  );
}

/**
 * Opens or resumes the deterministic provider proof, binds it to exactly one
 * account entity and browser-local replica, then runs the fenced page protocol.
 * Real provider credentials and HMRC are deliberately outside this function.
 */
export async function runSyntheticAccountingDemo(
  input: SyntheticAccountingDemoInput,
  dependencies: SyntheticAccountingDemoDependencies = {}
): Promise<SyntheticAccountingDemoResult> {
  if (!input.entity.id.trim() || !input.entity.name.trim()) {
    throw new Error("Choose one TaxSorted person or organisation first.");
  }
  const client = dependencies.client ?? api;
  const store = dependencies.store ?? createSyntheticDemoRecordsStore();
  const now = dependencies.now ?? (() => new Date().toISOString());
  const runSync = dependencies.runSync ?? runSyntheticAccountingSync;

  stopped(input.signal);
  let local = await store.state();
  const ledgerId = primaryLedgerId(input.activity);
  const ledger = local.ledgers.find((candidate) => candidate.id === ledgerId);
  if (ledger?.ownerEntityId && ledger.ownerEntityId !== input.entity.id) {
    throw new Error(
      "This activity's local ledger already belongs to another TaxSorted entity. Nothing was connected."
    );
  }
  const matchingBindings = local.providerBindings.filter(
    (binding) =>
      binding.provider === "synthetic" &&
      binding.environment === "sandbox" &&
      binding.entityId === input.entity.id &&
      binding.ledgerId === ledgerId &&
      binding.state === "active"
  );
  if (matchingBindings.length > 1) {
    throw new Error("More than one made-up source is bound to this ledger; choose one before syncing.");
  }

  let sourceConnection: AccountingSourceConnection;
  let organisation: AccountingOrganisation = {
    id: SYNTHETIC_ORGANISATION_ID,
    name: SYNTHETIC_ORGANISATION_NAME,
    countryCode: "GB",
    baseCurrency: "GBP",
    datasets: ["bank-transactions"],
    synthetic: true,
  };
  const existingBinding = matchingBindings[0];

  if (existingBinding) {
    input.onProgress?.({ stage: "checking-source" });
    const status = await client.accountingSourceStatus(
      existingBinding.sourceConnectionId,
      local.replica.id
    );
    exactSource(status.sourceConnection, {
      id: existingBinding.sourceConnectionId,
      entityId: input.entity.id,
    });
    sourceConnection = status.sourceConnection;
  } else {
    input.onProgress?.({ stage: "opening-source" });
    const opened = await client.startSyntheticAccountingAuthorisation();
    if (
      !opened.authorisation.id ||
      opened.authorisation.provider !== "synthetic" ||
      opened.authorisation.environment !== "sandbox" ||
      opened.authorisation.status !== "active" ||
      opened.authorisation.synthetic !== true ||
      !opened.authorisation.grantedScopes.includes("bank-transactions.read")
    ) {
      throw new Error("The made-up provider returned an unexpected authorisation.");
    }
    stopped(input.signal);
    const offered = await client.listAccountingOrganisations(opened.authorisation.id);
    if (
      offered.authorisation.id !== opened.authorisation.id ||
      offered.persisted !== false ||
      offered.organisations.length !== 1
    ) {
      throw new Error("The made-up provider did not return exactly one temporary organisation choice.");
    }
    organisation = offered.organisations[0]!;
    exactOrganisation(organisation);
    stopped(input.signal);
    const created = await client.createAccountingSourceConnection({
      authorisationId: opened.authorisation.id,
      entityId: input.entity.id,
      organisationId: organisation.id,
    });
    exactSource(created.sourceConnection, {
      authorisationId: opened.authorisation.id,
      entityId: input.entity.id,
    });
    sourceConnection = created.sourceConnection;
  }

  stopped(input.signal);
  input.onProgress?.({ stage: "binding-browser" });
  const status = await client.accountingSourceStatus(sourceConnection.id, local.replica.id);
  exactSource(status.sourceConnection, {
    id: sourceConnection.id,
    authorisationId: sourceConnection.authorisationId,
    entityId: input.entity.id,
  });
  sourceConnection = status.sourceConnection;
  const exactReplicas = status.replicas.filter(
    (candidate) => candidate.localReplicaId === local.replica.id
  );
  if (exactReplicas.length > 1) {
    throw new Error("The server returned more than one replica for this browser's local books.");
  }
  let replica = exactReplicas[0];
  if (replica?.status === "retired") {
    throw new Error("This browser replica was retired. Export the local books before reconnecting.");
  }
  if (!replica) {
    if (existingBinding) {
      throw new Error("The saved local binding has lost its exact server replica; no checkpoint was reused.");
    }
    replica = (
      await client.createAccountingReplica(sourceConnection.id, {
        localReplicaId: local.replica.id,
      })
    ).replica;
  }
  exactReplica(replica, sourceConnection.id, local.replica.id);
  if (existingBinding && existingBinding.syncReplicaId !== replica.id) {
    throw new Error("The saved source points to a different server replica; no checkpoint was reused.");
  }

  const checkpoints = status.checkpoints.filter(
    (checkpoint) =>
      checkpoint.sourceConnectionId === sourceConnection.id &&
      checkpoint.replicaId === replica.id &&
      checkpoint.dataset === "bank-transactions"
  );
  if (checkpoints.length > 1) {
    throw new Error("The server returned more than one bank-transaction checkpoint.");
  }
  let localCheckpoints = local.datasetCheckpoints.filter(
    (checkpoint) =>
      checkpoint.sourceConnectionId === sourceConnection.id &&
      checkpoint.syncReplicaId === replica.id &&
      checkpoint.dataset === "bank-transactions"
  );
  if (localCheckpoints.length > 1) {
    throw new Error("The local books contain more than one bank-transaction checkpoint.");
  }
  const remoteCheckpoint = checkpoints[0];
  let localCheckpoint = localCheckpoints[0];
  if (remoteCheckpoint && (!localCheckpoint || !checkpointsAgree(remoteCheckpoint, localCheckpoint))) {
    const recoveryRun = local.syncRuns.find(
      (candidate) => candidate.id === remoteCheckpoint.completedRunId
    );
    if (!recoveryRun || !(await verifyRecoverableRunProof(
      local,
      recoveryRun,
      remoteCheckpoint,
      localCheckpoint?.completedRunId ?? null
    ))) {
      throw new Error(
        "The server checkpoint has no exact fully acknowledged proof in these local books; no cursor was reused."
      );
    }
    const completed = await client.completeAccountingSyncRun(
      recoveryRun.id,
      recoveryRun.fence,
      local.replica.id
    );
    exactCompletedRecovery(completed, recoveryRun, remoteCheckpoint);
    await store.completeProviderSync({
      localReplicaId: local.replica.id,
      runId: recoveryRun.id,
      checkpoint: localCheckpointFrom(completed.checkpoint),
      finishedAt: completed.checkpoint.completedAt,
    });
    local = await store.state();
    localCheckpoints = local.datasetCheckpoints.filter(
      (checkpoint) =>
        checkpoint.sourceConnectionId === sourceConnection.id &&
        checkpoint.syncReplicaId === replica.id &&
        checkpoint.dataset === "bank-transactions"
    );
    if (localCheckpoints.length !== 1 || !checkpointsAgree(remoteCheckpoint, localCheckpoints[0]!)) {
      throw new Error("The recovered local checkpoint could not be read back exactly.");
    }
    localCheckpoint = localCheckpoints[0];
  }
  if (!remoteCheckpoint && localCheckpoint) {
    throw new Error(
      "These local books have a checkpoint the server does not recognise; no cursor was reused."
    );
  }
  if (remoteCheckpoint && !localCheckpoint) {
    throw new Error(
      "The server and these local books do not share the same completed checkpoint; no cursor was reused."
    );
  }
  const kind: SyncRunKind = remoteCheckpoint ? "incremental" : "initial";
  const observedAt = now();
  await store.bindProviderConnection({
    expectedLocalReplicaId: local.replica.id,
    sourceConnectionId: sourceConnection.id,
    entityId: input.entity.id,
    entityName: input.entity.name,
    syncReplicaId: replica.id,
    provider: "synthetic",
    environment: "sandbox",
    organisationId: organisation.id,
    organisationName: organisation.name,
    activity: input.activity,
    capabilities: [
      { capability: "bank-transactions.read", state: "available", observedAt },
      {
        capability: "bank-reconciliation.read",
        state: "unavailable",
        observedAt,
        limitation: "The made-up proof supplies records, not a bank reconciliation surface.",
      },
      {
        capability: "attachments.read",
        state: "unavailable",
        observedAt,
        limitation: "The made-up proof has no attachments.",
      },
    ],
    boundAt: observedAt,
  });

  // Re-read after binding so another tab cannot swap the browser identity,
  // ledger binding or checkpoint between inspection and the server start.
  local = await store.state();
  const exactBinding = local.providerBindings.filter(
    (binding) => binding.sourceConnectionId === sourceConnection.id && binding.state === "active"
  );
  const currentCheckpoint = checkpointFor(local, sourceConnection.id, replica.id);
  if (
    local.replica.id !== replica.localReplicaId ||
    exactBinding.length !== 1 ||
    exactBinding[0]!.entityId !== input.entity.id ||
    exactBinding[0]!.syncReplicaId !== replica.id ||
    exactBinding[0]!.ledgerId !== ledgerId ||
    (remoteCheckpoint
      ? !currentCheckpoint || !checkpointsAgree(remoteCheckpoint, currentCheckpoint)
      : currentCheckpoint !== undefined)
  ) {
    throw new Error("The local source binding changed before the sync could start.");
  }

  stopped(input.signal);
  input.onProgress?.({ stage: "starting-sync" });
  const started = await client.startAccountingSyncRun(sourceConnection.id, {
    replicaId: replica.id,
    localReplicaId: local.replica.id,
    expectedCompletedRunId: remoteCheckpoint?.completedRunId ?? null,
    dataset: "bank-transactions",
    kind,
  });
  assertSyncRun(started.run);
  if (
    started.run.schema !== ACCOUNTING_SYNC_SCHEMA ||
    started.run.sourceConnectionId !== sourceConnection.id ||
    started.run.replicaId !== replica.id ||
    started.run.dataset !== "bank-transactions" ||
    started.run.kind !== kind ||
    started.run.state !== "active" ||
    started.run.nextSequence !== 0 ||
    started.run.acknowledgedPages.length !== 0 ||
    started.run.acknowledgedRecordCount !== 0 ||
    started.run.stagedCursor !== (remoteCheckpoint?.committedCursor ?? null) ||
    started.run.stagedCoverageMarker !== null
  ) {
    throw new Error("The accounting API started a different sync run.");
  }

  let result: SyntheticAccountingSyncResult;
  try {
    result = await runSync(
      {
        run: started.run,
        localReplicaId: local.replica.id,
        organisationId: organisation.id,
        organisationName: organisation.name,
        activity: input.activity,
        signal: input.signal,
        onProgress: ({ stage, page }) => input.onProgress?.({ stage, page }),
      },
      { client, store, now }
    );
  } catch (error) {
    try {
      await client.cancelAccountingSyncRun(
        started.run.id,
        started.run.lease.fence,
        local.replica.id
      );
    } catch {
      const prior = error instanceof Error && error.message.trim()
        ? error.message
        : "The accounting sync stopped.";
      throw new Error(
        `${prior} The server run could not be released; retry after ${started.run.lease.expiresAt}.`
      );
    }
    throw error;
  }
  return {
    ...result,
    sourceConnection,
    organisation,
    replica,
    ledgerId,
    kind,
  };
}
