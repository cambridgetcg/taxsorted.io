import { ACCOUNTING_SYNC_SCHEMA, type PageManifest, type SyncRun } from "@taxsorted/engine/accounting-sync";
import { describe, expect, it, vi } from "vitest";
import { runSyntheticAccountingSync } from "../accounting-sync";
import { accountingPageDigest } from "../synthetic-accounting-normalizer";
import { createRecordsStore } from "../records";

const RUN: SyncRun = {
  schema: ACCOUNTING_SYNC_SCHEMA,
  id: "run-1",
  sourceConnectionId: "source-1",
  replicaId: "replica-1",
  dataset: "bank-transactions",
  kind: "initial",
  state: "active",
  lease: { fence: "90071992547409930001", expiresAt: "2099-08-01T12:10:00.000Z" },
  startedDirtyGeneration: "0",
  nextSequence: 0,
  stagedCursor: null,
  stagedCoverageMarker: null,
  acknowledgedRecordCount: 0,
  acknowledgedPages: [],
};

async function manifest(
  id: string,
  sequence: number,
  currentCursor: string | null,
  nextCursor: string,
  records: readonly unknown[],
  final: boolean
): Promise<PageManifest> {
  return {
    schema: ACCOUNTING_SYNC_SCHEMA,
    id,
    runId: RUN.id,
    sourceConnectionId: RUN.sourceConnectionId,
    replicaId: RUN.replicaId,
    dataset: RUN.dataset,
    sequence,
    fence: RUN.lease.fence,
    digest: await accountingPageDigest(records),
    recordCount: records.length,
    currentCursor,
    nextCursor,
    coverageMarker: final ? "complete-v1" : null,
    dirtyGeneration: RUN.startedDirtyGeneration,
    final,
    expiresAt: "2099-08-01T12:10:00.000Z",
  };
}

const emptyNormalization = async () => ({
  rawVersions: [],
  normalizedVersions: [],
  candidates: [],
});

describe("synthetic accounting sync orchestration", () => {
  it("commits and acknowledges every page, then completes the API before the local checkpoint", async () => {
    const firstRecords = [{ id: "one" }, { id: "two" }];
    const secondRecords = [{ id: "three" }];
    const first = await manifest("manifest-1", 0, null, "2", firstRecords, false);
    const second = await manifest("manifest-2", 1, "2", "3", secondRecords, true);
    const order: string[] = [];
    const pullAccountingSyncPage = vi
      .fn()
      .mockImplementationOnce(async () => {
        order.push("pull-1");
        return { manifest: first, records: firstRecords };
      })
      .mockImplementationOnce(async () => {
        order.push("pull-2");
        return { manifest: second, records: secondRecords };
      });
    const acknowledgeAccountingSyncPage = vi.fn(async (_runId, acknowledgement) => {
      order.push(`api-ack-${acknowledgement.sequence + 1}`);
      return { acknowledgement, changed: true, nextSequence: acknowledgement.sequence + 1 };
    });
    const completeAccountingSyncRun = vi.fn(async () => {
      order.push("api-complete");
      return {
        run: {
          ...RUN,
          state: "completed" as const,
          nextSequence: 2,
          stagedCursor: "3",
          stagedCoverageMarker: "complete-v1",
          acknowledgedRecordCount: 3,
          acknowledgedPages: [first, second].map((page) => ({
            manifestId: page.id,
            digest: page.digest,
            sequence: page.sequence,
            recordCount: page.recordCount,
            currentCursor: page.currentCursor,
            nextCursor: page.nextCursor,
            coverageMarker: page.coverageMarker,
            fence: page.fence,
            dirtyGeneration: page.dirtyGeneration,
            acknowledgedAt: "2026-08-01T12:00:08.000Z",
            final: page.final,
          })),
        },
        checkpoint: {
          schema: ACCOUNTING_SYNC_SCHEMA,
          sourceConnectionId: RUN.sourceConnectionId,
          replicaId: RUN.replicaId,
          dataset: RUN.dataset,
          completedRunId: RUN.id,
          committedCursor: "3",
          coverageMarker: "complete-v1",
          committedDirtyGeneration: "0",
          pageCount: 2,
          recordCount: 3,
          completedAt: "2026-08-01T12:00:09.000Z",
        },
        needsAnotherSync: false,
      };
    });
    const commitProviderPage = vi.fn(async ({ manifest: page }: { manifest: PageManifest }) => {
      order.push(`local-commit-${page.sequence + 1}`);
      return {
        manifestId: page.id,
        digest: page.digest,
        added: page.recordCount,
        duplicates: 0,
        conflicts: 0,
        replayed: false,
      };
    });
    const markProviderPageAcknowledged = vi.fn(async ({ manifestId }) => {
      order.push(`local-ack-${manifestId.at(-1)}`);
    });
    const completeProviderSync = vi.fn(async ({ checkpoint }) => {
      order.push("local-checkpoint");
      return checkpoint;
    });

    const result = await runSyntheticAccountingSync(
      {
        run: RUN,
        localReplicaId: "local-replica-1",
        organisationId: "synthetic-uk-sole-trader",
        organisationName: "Mina's Card Studio (made-up)",
        activity: "self-employment",
      },
      {
        client: {
          pullAccountingSyncPage,
          acknowledgeAccountingSyncPage,
          completeAccountingSyncRun,
        },
        store: { commitProviderPage, markProviderPageAcknowledged, completeProviderSync },
        normalize: emptyNormalization,
        now: () => "2026-08-01T12:00:00.000Z",
      }
    );

    expect(result).toMatchObject({ pageCount: 2, added: 3, needsAnotherSync: false });
    expect(pullAccountingSyncPage).toHaveBeenCalledTimes(2);
    expect(order).toEqual([
      "pull-1",
      "local-commit-1",
      "api-ack-1",
      "local-ack-1",
      "pull-2",
      "local-commit-2",
      "api-ack-2",
      "local-ack-2",
      "api-complete",
      "local-checkpoint",
    ]);
  });

  it("does not write or acknowledge a page whose exact raw-record digest differs", async () => {
    const records = [{ id: "changed-in-transit" }];
    const page = await manifest("manifest-1", 0, null, "1", [{ id: "original" }], true);
    const commitProviderPage = vi.fn();
    const acknowledgeAccountingSyncPage = vi.fn();

    await expect(
      runSyntheticAccountingSync(
        {
          run: RUN,
          localReplicaId: "local-replica-1",
          organisationId: "synthetic-uk-sole-trader",
          organisationName: "Mina's Card Studio (made-up)",
          activity: "self-employment",
        },
        {
          client: {
            pullAccountingSyncPage: vi.fn(async () => ({ manifest: page, records })),
            acknowledgeAccountingSyncPage,
            completeAccountingSyncRun: vi.fn(),
          },
          store: {
            commitProviderPage,
            markProviderPageAcknowledged: vi.fn(),
            completeProviderSync: vi.fn(),
          },
          normalize: emptyNormalization,
        }
      )
    ).rejects.toThrow(/changed in transit/i);
    expect(commitProviderPage).not.toHaveBeenCalled();
    expect(acknowledgeAccountingSyncPage).not.toHaveBeenCalled();
  });

  it("never acknowledges when the atomic local page write fails", async () => {
    const records = [{ id: "one" }];
    const page = await manifest("manifest-1", 0, null, "1", records, true);
    const acknowledgeAccountingSyncPage = vi.fn();

    await expect(
      runSyntheticAccountingSync(
        {
          run: RUN,
          localReplicaId: "local-replica-1",
          organisationId: "synthetic-uk-sole-trader",
          organisationName: "Mina's Card Studio (made-up)",
          activity: "self-employment",
        },
        {
          client: {
            pullAccountingSyncPage: vi.fn(async () => ({ manifest: page, records })),
            acknowledgeAccountingSyncPage,
            completeAccountingSyncRun: vi.fn(),
          },
          store: {
            commitProviderPage: vi.fn(async () => {
              throw new Error("IndexedDB write failed");
            }),
            markProviderPageAcknowledged: vi.fn(),
            completeProviderSync: vi.fn(),
          },
          normalize: emptyNormalization,
        }
      )
    ).rejects.toThrow(/IndexedDB write failed/i);
    expect(acknowledgeAccountingSyncPage).not.toHaveBeenCalled();
  });

  it("crosses the real normalizer and local-store seams, retrying only ambiguous response loss", async () => {
    const firstRecords = [
      {
        id: "synthetic-bank-001",
        type: "bank-transaction",
        revision: "1",
        updatedAt: "2026-04-07T09:00:00.000Z",
        date: "2026-04-06",
        direction: "inflow",
        amountMinor: 125_000,
        currency: "GBP",
        description: "Synthetic property rent",
        status: "reconciled",
      },
      {
        id: "synthetic-bank-002",
        type: "bank-transaction",
        revision: "1",
        updatedAt: "2026-04-08T09:00:00.000Z",
        date: "2026-04-08",
        direction: "outflow",
        amountMinor: 2_500,
        currency: "GBP",
        description: "Synthetic software subscription",
        status: "reconciled",
      },
    ];
    const secondRecords = [
      {
        id: "synthetic-bank-003",
        type: "bank-transaction",
        revision: "2",
        updatedAt: "2026-04-10T14:15:00.000Z",
        date: "2026-04-10",
        direction: "outflow",
        amountMinor: 8_750,
        currency: "GBP",
        description: "Synthetic train travel",
        status: "unreconciled",
      },
    ];
    const first = await manifest("manifest-1", 0, null, "2", firstRecords, false);
    const second = await manifest("manifest-2", 1, "2", "3", secondRecords, true);
    const store = createRecordsStore(new Map());
    const localReplicaId = (await store.state()).replica.id;
    await store.bindProviderConnection({
      expectedLocalReplicaId: localReplicaId,
      sourceConnectionId: RUN.sourceConnectionId,
      entityId: "entity-1",
      entityName: "Mina",
      syncReplicaId: RUN.replicaId,
      provider: "synthetic",
      environment: "sandbox",
      organisationId: "synthetic-uk-sole-trader",
      organisationName: "Mina's Card Studio (made-up)",
      activity: "uk-property",
      capabilities: [],
      boundAt: "2026-08-01T12:00:00.000Z",
    });

    const pullAccountingSyncPage = vi
      .fn()
      .mockResolvedValueOnce({ manifest: first, records: firstRecords })
      .mockResolvedValueOnce({ manifest: second, records: secondRecords });
    let lostFirstAcknowledgement = true;
    const acknowledgeAccountingSyncPage = vi.fn(async (_runId, acknowledgement) => {
      if (lostFirstAcknowledgement) {
        lostFirstAcknowledgement = false;
        throw new TypeError("response lost after acknowledgement");
      }
      return { acknowledgement, changed: true, nextSequence: acknowledgement.sequence + 1 };
    });
    const checkpoint = {
      schema: ACCOUNTING_SYNC_SCHEMA,
      sourceConnectionId: RUN.sourceConnectionId,
      replicaId: RUN.replicaId,
      dataset: RUN.dataset,
      completedRunId: RUN.id,
      committedCursor: "3",
      coverageMarker: "complete-v1",
      committedDirtyGeneration: "0",
      pageCount: 2,
      recordCount: 3,
      completedAt: "2026-08-01T12:00:09.000Z",
    } as const;
    const completedRun = {
      ...RUN,
      state: "completed" as const,
      nextSequence: 2,
      stagedCursor: "3",
      stagedCoverageMarker: "complete-v1",
      acknowledgedRecordCount: 3,
      acknowledgedPages: [first, second].map((page) => ({
        manifestId: page.id,
        digest: page.digest,
        sequence: page.sequence,
        recordCount: page.recordCount,
        currentCursor: page.currentCursor,
        nextCursor: page.nextCursor,
        coverageMarker: page.coverageMarker,
        fence: page.fence,
        dirtyGeneration: page.dirtyGeneration,
        acknowledgedAt: "2026-08-01T12:00:08.000Z",
        final: page.final,
      })),
    };
    const completeAccountingSyncRun = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("response lost after completion"))
      .mockResolvedValueOnce({
        run: completedRun,
        checkpoint,
        needsAnotherSync: false,
      });

    const result = await runSyntheticAccountingSync(
      {
        run: RUN,
        localReplicaId,
        organisationId: "synthetic-uk-sole-trader",
        organisationName: "Mina's Card Studio (made-up)",
        activity: "uk-property",
      },
      {
        client: {
          pullAccountingSyncPage,
          acknowledgeAccountingSyncPage,
          completeAccountingSyncRun,
        },
        store,
        now: () => "2026-08-01T12:00:00.000Z",
      }
    );

    const state = await store.state();
    expect(result).toMatchObject({ pageCount: 2, added: 3, conflicts: 0 });
    expect(acknowledgeAccountingSyncPage).toHaveBeenCalledTimes(3);
    expect(completeAccountingSyncRun).toHaveBeenCalledTimes(2);
    expect(state.events.map((event) => event.postings[0]?.category)).toEqual([
      "periodAmount",
      "other",
      "travelCosts",
    ]);
    expect(state.rawProviderVersions).toHaveLength(3);
    expect(state.normalizedProviderVersions).toHaveLength(3);
    expect(state.syncRuns[0].pages).toHaveLength(2);
    expect(state.syncRuns[0].pages.every((page) => page.acknowledgedAt)).toBe(true);
    expect(state.datasetCheckpoints).toEqual([
      expect.objectContaining({ completedRunId: RUN.id, pageCount: 2, recordCount: 3 }),
    ]);
  });
});
