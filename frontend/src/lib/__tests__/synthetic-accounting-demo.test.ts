import { ACCOUNTING_SYNC_SCHEMA, type DatasetCheckpoint, type SyncRun } from "@taxsorted/engine/accounting-sync";
import { describe, expect, it, vi } from "vitest";
import {
  emptyLocalBooks,
  type LocalBooksState,
  type NormalizedProviderRecordVersion,
  type ProviderLedgerBinding,
  type RawProviderRecordVersion,
} from "../local-books";
import { runSyntheticAccountingDemo } from "../synthetic-accounting-demo";
import { accountingPageDigest, accountingValueDigest } from "../synthetic-accounting-normalizer";

const NOW = "2026-08-01T12:00:00.000Z";
const SOURCE = {
  id: "source-1",
  authorisationId: "authorisation-1",
  entityId: "entity-1",
  provider: "synthetic" as const,
  environment: "sandbox" as const,
  organisation: {
    id: "synthetic-uk-sole-trader",
    name: "Mina's Card Studio (made-up)",
    countryCode: "GB",
    baseCurrency: "GBP",
  },
  status: "active" as const,
  dirtyGeneration: "0",
  createdAt: NOW,
};
const REPLICA = {
  id: "replica-1",
  sourceConnectionId: SOURCE.id,
  localReplicaId: "local-replica-1",
  status: "active" as const,
  createdAt: NOW,
};
const RUN: SyncRun = {
  schema: ACCOUNTING_SYNC_SCHEMA,
  id: "run-1",
  sourceConnectionId: SOURCE.id,
  replicaId: REPLICA.id,
  dataset: "bank-transactions",
  kind: "initial",
  state: "active",
  lease: { fence: "1", expiresAt: "2099-08-01T12:00:00.000Z" },
  startedDirtyGeneration: "0",
  nextSequence: 0,
  stagedCursor: null,
  stagedCoverageMarker: null,
  acknowledgedRecordCount: 0,
  acknowledgedPages: [],
};
const CHECKPOINT: DatasetCheckpoint = {
  schema: ACCOUNTING_SYNC_SCHEMA,
  sourceConnectionId: SOURCE.id,
  replicaId: REPLICA.id,
  dataset: "bank-transactions",
  completedRunId: RUN.id,
  committedCursor: "3",
  coverageMarker: "synthetic-bank-transactions-v1",
  committedDirtyGeneration: "0",
  pageCount: 2,
  recordCount: 3,
  completedAt: "2026-08-01T12:00:09.000Z",
};
const SYNC_RESULT = {
  checkpoint: CHECKPOINT,
  needsAnotherSync: false,
  pageCount: 2,
  added: 3,
  duplicates: 0,
  conflicts: 0,
};

async function recoveryProof(currentCursor: string | null) {
  const payloadPages = [
    [{ id: "one" }, { id: "two" }],
    [{ id: "three" }],
  ];
  const rawVersions: RawProviderRecordVersion[] = [];
  const normalizedVersions: NormalizedProviderRecordVersion[] = [];
  const rawIdsByPage: string[][] = [];
  const normalizedIdsByPage: string[][] = [];
  for (const [pageIndex, payloads] of payloadPages.entries()) {
    const rawIds: string[] = [];
    const normalizedIds: string[] = [];
    for (const [recordIndex, payload] of payloads.entries()) {
      const suffix = `${pageIndex + 1}-${recordIndex + 1}`;
      const rawId = `raw-${suffix}`;
      const normalizedId = `normalized-${suffix}`;
      rawVersions.push({
        id: rawId,
        identity: {
          provider: "synthetic",
          environment: "sandbox",
          organisationId: SOURCE.organisation.id,
          objectType: "bank-transaction",
          objectId: payload.id,
        },
        payloadDigest: await accountingValueDigest(payload),
        observedAt: NOW,
        deleted: false,
        payload,
      });
      normalizedVersions.push({
        id: normalizedId,
        rawVersionId: rawId,
        mapperVersion: "recovery-test/1",
        kind: "bank-observation",
        limitations: ["Made-up recovery fixture."],
      });
      rawIds.push(rawId);
      normalizedIds.push(normalizedId);
    }
    rawIdsByPage.push(rawIds);
    normalizedIdsByPage.push(normalizedIds);
  }
  const first = {
    schema: ACCOUNTING_SYNC_SCHEMA,
    id: "manifest-1",
    runId: RUN.id,
    sourceConnectionId: SOURCE.id,
    replicaId: REPLICA.id,
    dataset: "bank-transactions",
    sequence: 0,
    fence: RUN.lease.fence,
    digest: await accountingPageDigest(payloadPages[0]),
    recordCount: 2,
    currentCursor,
    nextCursor: "2",
    coverageMarker: null,
    dirtyGeneration: "0",
    final: false,
    expiresAt: "2099-08-01T12:10:00.000Z",
  } as const;
  const final = {
    ...first,
    id: "manifest-2",
    sequence: 1,
    digest: await accountingPageDigest(payloadPages[1]),
    recordCount: 1,
    currentCursor: "2",
    nextCursor: "3",
    coverageMarker: "synthetic-bank-transactions-v1",
    final: true,
  } as const;
  return {
    pages: [first, final] as const,
    rawVersions,
    normalizedVersions,
    rawIdsByPage,
    normalizedIdsByPage,
  };
}

function binding(): ProviderLedgerBinding {
  return {
    sourceConnectionId: SOURCE.id,
    entityId: SOURCE.entityId,
    syncReplicaId: REPLICA.id,
    provider: "synthetic",
    environment: "sandbox",
    organisationId: SOURCE.organisation.id,
    organisationName: SOURCE.organisation.name,
    ledgerId: "ledger:self-employment:primary",
    state: "active",
    boundAt: NOW,
    capabilities: [],
  };
}

function storeFor(state: LocalBooksState) {
  const current = structuredClone(state);
  return {
    state: vi.fn(async () => structuredClone(current)),
    bindProviderConnection: vi.fn(async (input) => {
      const ledgerId = `ledger:${input.activity}:primary`;
      let ledger = current.ledgers.find((candidate) => candidate.id === ledgerId);
      if (!ledger) {
        ledger = {
          id: ledgerId,
          name: `${input.entityName}'s work`,
          activity: input.activity,
          scopeState: "needs-confirmation",
          ownerEntityId: input.entityId,
          ownerEntityName: input.entityName,
          entityLinkedAt: input.boundAt ?? NOW,
        };
        current.ledgers.push(ledger);
      }
      let saved = current.providerBindings.find(
        (candidate) => candidate.sourceConnectionId === input.sourceConnectionId
      );
      if (!saved) {
        saved = {
          sourceConnectionId: input.sourceConnectionId,
          entityId: input.entityId,
          syncReplicaId: input.syncReplicaId,
          provider: input.provider,
          environment: input.environment,
          organisationId: input.organisationId,
          organisationName: input.organisationName,
          ledgerId,
          state: "active",
          boundAt: input.boundAt ?? NOW,
          capabilities: structuredClone(input.capabilities),
        };
        current.providerBindings.push(saved);
      }
      return structuredClone(saved);
    }),
    commitProviderPage: vi.fn(),
    markProviderPageAcknowledged: vi.fn(),
    completeProviderSync: vi.fn(async ({ runId, checkpoint }) => {
      const index = current.datasetCheckpoints.findIndex(
        (candidate) =>
          candidate.sourceConnectionId === checkpoint.sourceConnectionId &&
          candidate.syncReplicaId === checkpoint.syncReplicaId &&
          candidate.dataset === checkpoint.dataset
      );
      if (index < 0) current.datasetCheckpoints.push(structuredClone(checkpoint));
      else current.datasetCheckpoints[index] = structuredClone(checkpoint);
      const run = current.syncRuns.find((candidate) => candidate.id === runId);
      if (run) run.status = "committed";
      return structuredClone(checkpoint);
    }),
  };
}

function clientFor(options: { replicas?: typeof REPLICA[]; checkpoints?: DatasetCheckpoint[] } = {}) {
  const authorisation = {
    id: SOURCE.authorisationId,
    provider: "synthetic" as const,
    environment: "sandbox" as const,
    status: "active" as const,
    grantedScopes: ["bank-transactions.read"],
    createdAt: NOW,
    updatedAt: NOW,
    synthetic: true,
  };
  return {
    startSyntheticAccountingAuthorisation: vi.fn().mockResolvedValue({ authorisation }),
    listAccountingOrganisations: vi.fn().mockResolvedValue({
      authorisation,
      organisations: [
        {
          ...SOURCE.organisation,
          datasets: ["bank-transactions"],
          synthetic: true,
        },
      ],
      persisted: false as const,
    }),
    createAccountingSourceConnection: vi.fn().mockResolvedValue({ sourceConnection: SOURCE }),
    accountingSourceStatus: vi.fn().mockResolvedValue({
      sourceConnection: SOURCE,
      replicas: options.replicas ?? [],
      checkpoints: options.checkpoints ?? [],
    }),
    createAccountingReplica: vi.fn().mockResolvedValue({ replica: REPLICA }),
    startAccountingSyncRun: vi.fn().mockResolvedValue({ run: RUN }),
    pullAccountingSyncPage: vi.fn(),
    acknowledgeAccountingSyncPage: vi.fn(),
    completeAccountingSyncRun: vi.fn(),
    cancelAccountingSyncRun: vi.fn().mockResolvedValue({
      run: { ...RUN, state: "cancelled" },
      changed: true,
    }),
  };
}

describe("made-up accounting connection journey", () => {
  it("opens the one offered organisation, binds this browser and starts an initial run", async () => {
    const local = emptyLocalBooks({ replicaId: REPLICA.localReplicaId, createdAt: NOW });
    const store = storeFor(local);
    const client = clientFor();
    // Starting a run snapshots the provider's dirty generation atomically. It may
    // legitimately advance after the earlier status read.
    client.startAccountingSyncRun.mockResolvedValue({
      run: { ...RUN, startedDirtyGeneration: "1" },
    });
    const runSync = vi.fn().mockResolvedValue(SYNC_RESULT);
    const stages: string[] = [];

    const result = await runSyntheticAccountingDemo(
      {
        entity: { id: SOURCE.entityId, name: "Mina" },
        activity: "self-employment",
        onProgress: ({ stage }) => stages.push(stage),
      },
      { client, store, runSync, now: () => NOW }
    );

    expect(client.createAccountingSourceConnection).toHaveBeenCalledWith({
      authorisationId: SOURCE.authorisationId,
      entityId: SOURCE.entityId,
      organisationId: SOURCE.organisation.id,
    });
    expect(client.createAccountingReplica).toHaveBeenCalledWith(SOURCE.id, {
      localReplicaId: REPLICA.localReplicaId,
    });
    expect(store.bindProviderConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceConnectionId: SOURCE.id,
        entityId: SOURCE.entityId,
        entityName: "Mina",
        syncReplicaId: REPLICA.id,
      })
    );
    expect(client.startAccountingSyncRun).toHaveBeenCalledWith(SOURCE.id, {
      replicaId: REPLICA.id,
      localReplicaId: REPLICA.localReplicaId,
      expectedCompletedRunId: null,
      dataset: "bank-transactions",
      kind: "initial",
    });
    expect(result).toMatchObject({ kind: "initial", pageCount: 2, added: 3 });
    expect(stages).toEqual(["opening-source", "binding-browser", "starting-sync"]);
  });

  it("resumes only when the local and server checkpoints match exactly", async () => {
    const local = emptyLocalBooks({ replicaId: REPLICA.localReplicaId, createdAt: NOW });
    local.ledgers.push({
      id: "ledger:self-employment:primary",
      name: "Mina's work",
      activity: "self-employment",
      scopeState: "needs-confirmation",
      ownerEntityId: SOURCE.entityId,
      ownerEntityName: "Mina",
      entityLinkedAt: NOW,
    });
    local.providerBindings.push(binding());
    local.datasetCheckpoints.push({
      sourceConnectionId: CHECKPOINT.sourceConnectionId,
      syncReplicaId: CHECKPOINT.replicaId,
      dataset: CHECKPOINT.dataset,
      completedRunId: CHECKPOINT.completedRunId,
      committedCursor: CHECKPOINT.committedCursor,
      coverageMarker: CHECKPOINT.coverageMarker,
      dirtyGeneration: CHECKPOINT.committedDirtyGeneration,
      pageCount: CHECKPOINT.pageCount,
      recordCount: CHECKPOINT.recordCount,
      completedAt: CHECKPOINT.completedAt,
    });
    const store = storeFor(local);
    const client = clientFor({ replicas: [REPLICA], checkpoints: [CHECKPOINT] });
    client.startAccountingSyncRun.mockResolvedValue({
      run: { ...RUN, kind: "incremental", stagedCursor: CHECKPOINT.committedCursor },
    });
    const runSync = vi.fn().mockResolvedValue(SYNC_RESULT);

    const result = await runSyntheticAccountingDemo(
      {
        entity: { id: SOURCE.entityId, name: "Mina" },
        activity: "self-employment",
      },
      { client, store, runSync, now: () => NOW }
    );

    expect(client.startSyntheticAccountingAuthorisation).not.toHaveBeenCalled();
    expect(client.createAccountingReplica).not.toHaveBeenCalled();
    expect(client.startAccountingSyncRun).toHaveBeenCalledWith(
      SOURCE.id,
      expect.objectContaining({ kind: "incremental" })
    );
    expect(result.kind).toBe("incremental");
  });

  it("refuses a server cursor that has no matching local checkpoint", async () => {
    const local = emptyLocalBooks({ replicaId: REPLICA.localReplicaId, createdAt: NOW });
    local.ledgers.push({
      id: "ledger:self-employment:primary",
      name: "Mina's work",
      activity: "self-employment",
      scopeState: "needs-confirmation",
      ownerEntityId: SOURCE.entityId,
      ownerEntityName: "Mina",
      entityLinkedAt: NOW,
    });
    local.providerBindings.push(binding());
    const store = storeFor(local);
    const client = clientFor({ replicas: [REPLICA], checkpoints: [CHECKPOINT] });
    const runSync = vi.fn();

    await expect(
      runSyntheticAccountingDemo(
        {
          entity: { id: SOURCE.entityId, name: "Mina" },
          activity: "self-employment",
        },
        { client, store, runSync, now: () => NOW }
      )
    ).rejects.toThrow(/no exact fully acknowledged proof/i);

    expect(client.startAccountingSyncRun).not.toHaveBeenCalled();
    expect(runSync).not.toHaveBeenCalled();
  });

  it("recovers an incremental server completion from the exact acknowledged local pages", async () => {
    const previousRunId = "run-previous";
    const proof = await recoveryProof("before");
    const pages = proof.pages;
    const local = emptyLocalBooks({ replicaId: REPLICA.localReplicaId, createdAt: NOW });
    local.ledgers.push({
      id: "ledger:self-employment:primary",
      name: "Mina's work",
      activity: "self-employment",
      scopeState: "needs-confirmation",
      ownerEntityId: SOURCE.entityId,
      ownerEntityName: "Mina",
      entityLinkedAt: NOW,
    });
    local.providerBindings.push(binding());
    local.rawProviderVersions.push(...proof.rawVersions);
    local.normalizedProviderVersions.push(...proof.normalizedVersions);
    local.datasetCheckpoints.push({
      sourceConnectionId: SOURCE.id,
      syncReplicaId: REPLICA.id,
      dataset: "bank-transactions",
      completedRunId: previousRunId,
      committedCursor: "before",
      coverageMarker: "previous-coverage",
      dirtyGeneration: "0",
      pageCount: 1,
      recordCount: 2,
      completedAt: "2026-07-31T12:00:00.000Z",
    });
    local.syncRuns.push({
      id: RUN.id,
      sourceConnectionId: SOURCE.id,
      syncReplicaId: REPLICA.id,
      dataset: "bank-transactions",
      kind: "incremental",
      fence: RUN.lease.fence,
      baseCompletedRunId: previousRunId,
      status: "staged",
      startedAt: NOW,
      pages: pages.map((manifest, index) => ({
        manifest,
        committedAt: NOW,
        acknowledgedAt: "2026-08-01T12:00:08.000Z",
        rawVersionIds: proof.rawIdsByPage[index]!,
        normalizedVersionIds: proof.normalizedIdsByPage[index]!,
        summary: { added: 0, duplicates: 0, conflicts: 0 },
      })),
    });
    const completedRun: SyncRun = {
      ...RUN,
      kind: "incremental",
      state: "completed",
      nextSequence: 2,
      stagedCursor: "3",
      stagedCoverageMarker: "synthetic-bank-transactions-v1",
      acknowledgedRecordCount: 3,
      acknowledgedPages: pages.map((manifest) => ({
        manifestId: manifest.id,
        digest: manifest.digest,
        sequence: manifest.sequence,
        recordCount: manifest.recordCount,
        currentCursor: manifest.currentCursor,
        nextCursor: manifest.nextCursor,
        coverageMarker: manifest.coverageMarker,
        fence: manifest.fence,
        dirtyGeneration: manifest.dirtyGeneration,
        acknowledgedAt: "2026-08-01T12:00:08.000Z",
        final: manifest.final,
      })),
    };
    const corrupted = structuredClone(local);
    corrupted.rawProviderVersions[0]!.payload = { id: "tampered-after-save" };
    const corruptedClient = clientFor({ replicas: [REPLICA], checkpoints: [CHECKPOINT] });
    await expect(
      runSyntheticAccountingDemo(
        {
          entity: { id: SOURCE.entityId, name: "Mina" },
          activity: "self-employment",
        },
        {
          client: corruptedClient,
          store: storeFor(corrupted),
          runSync: vi.fn(),
          now: () => NOW,
        }
      )
    ).rejects.toThrow(/no exact fully acknowledged proof/i);
    expect(corruptedClient.completeAccountingSyncRun).not.toHaveBeenCalled();

    const store = storeFor(local);
    const client = clientFor({ replicas: [REPLICA], checkpoints: [CHECKPOINT] });
    client.completeAccountingSyncRun.mockResolvedValue({
      run: completedRun,
      checkpoint: CHECKPOINT,
      needsAnotherSync: false,
    });
    client.startAccountingSyncRun.mockResolvedValue({
      run: {
        ...RUN,
        id: "run-2",
        kind: "incremental",
        stagedCursor: CHECKPOINT.committedCursor,
      },
    });
    const runSync = vi.fn().mockResolvedValue(SYNC_RESULT);

    const result = await runSyntheticAccountingDemo(
      {
        entity: { id: SOURCE.entityId, name: "Mina" },
        activity: "self-employment",
      },
      { client, store, runSync, now: () => NOW }
    );

    expect(client.completeAccountingSyncRun).toHaveBeenCalledWith(
      RUN.id,
      RUN.lease.fence,
      REPLICA.localReplicaId
    );
    expect(store.completeProviderSync).toHaveBeenCalledWith(
      expect.objectContaining({
        localReplicaId: REPLICA.localReplicaId,
        runId: RUN.id,
        checkpoint: expect.objectContaining({ completedRunId: RUN.id }),
      })
    );
    expect(client.startAccountingSyncRun).toHaveBeenCalledWith(
      SOURCE.id,
      expect.objectContaining({
        kind: "incremental",
        expectedCompletedRunId: RUN.id,
      })
    );
    expect(result.kind).toBe("incremental");
  });

  it("releases the exact server run when the browser stops after start", async () => {
    const local = emptyLocalBooks({ replicaId: REPLICA.localReplicaId, createdAt: NOW });
    const store = storeFor(local);
    const client = clientFor();
    const stopped = new DOMException("Accounting sync stopped.", "AbortError");

    await expect(
      runSyntheticAccountingDemo(
        {
          entity: { id: SOURCE.entityId, name: "Mina" },
          activity: "self-employment",
        },
        { client, store, runSync: vi.fn().mockRejectedValue(stopped), now: () => NOW }
      )
    ).rejects.toBe(stopped);

    expect(client.cancelAccountingSyncRun).toHaveBeenCalledWith(
      RUN.id,
      RUN.lease.fence,
      REPLICA.localReplicaId
    );
  });

  it("states the lease deadline when server cancellation cannot be confirmed", async () => {
    const local = emptyLocalBooks({ replicaId: REPLICA.localReplicaId, createdAt: NOW });
    const store = storeFor(local);
    const client = clientFor();
    client.cancelAccountingSyncRun.mockRejectedValue(new TypeError("network unavailable"));

    await expect(
      runSyntheticAccountingDemo(
        {
          entity: { id: SOURCE.entityId, name: "Mina" },
          activity: "self-employment",
        },
        {
          client,
          store,
          runSync: vi.fn().mockRejectedValue(new DOMException("Stopped.", "AbortError")),
          now: () => NOW,
        }
      )
    ).rejects.toThrow(RUN.lease.expiresAt);
  });
});
