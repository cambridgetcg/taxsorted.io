import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_SYNC_SCHEMA,
  acknowledgePage,
  assertPageManifest,
  assertSyncRun,
  canonicalAccountingJson,
  canPromoteCheckpoint,
  effectiveSyncControl,
  promoteCheckpoint,
  type PageAcknowledgement,
  type PageManifest,
  type SyncRun,
} from "../accounting-sync";

const NOW = "2026-08-01T12:00:00.000Z";
const LATER = "2026-08-01T12:01:00.000Z";
const DIGEST = `sha256:${"a".repeat(64)}`;

function run(): SyncRun {
  return {
    schema: ACCOUNTING_SYNC_SCHEMA,
    id: "run-1",
    sourceConnectionId: "connection-1",
    replicaId: "replica-1",
    dataset: "bank-transactions",
    kind: "initial",
    state: "active",
    lease: { fence: "90071992547409930001", expiresAt: "2026-08-01T12:05:00.000Z" },
    startedDirtyGeneration: "8",
    nextSequence: 0,
    stagedCursor: null,
    stagedCoverageMarker: null,
    acknowledgedRecordCount: 0,
    acknowledgedPages: [],
  };
}

function manifest(overrides: Partial<PageManifest> = {}): PageManifest {
  return {
    schema: ACCOUNTING_SYNC_SCHEMA,
    id: "manifest-1",
    runId: "run-1",
    sourceConnectionId: "connection-1",
    replicaId: "replica-1",
    dataset: "bank-transactions",
    sequence: 0,
    fence: "90071992547409930001",
    digest: DIGEST,
    recordCount: 2,
    currentCursor: null,
    nextCursor: "page-2",
    coverageMarker: null,
    dirtyGeneration: "8",
    final: false,
    expiresAt: "2026-08-01T12:04:00.000Z",
    ...overrides,
  };
}

function acknowledgement(page: PageManifest): PageAcknowledgement {
  return {
    manifestId: page.id,
    runId: page.runId,
    replicaId: page.replicaId,
    dataset: page.dataset,
    sequence: page.sequence,
    fence: page.fence,
    digest: page.digest,
  };
}

describe("accounting sync contract", () => {
  it("canonicalises object keys without changing array order", () => {
    expect(canonicalAccountingJson({ z: 1, a: [{ y: 2, x: 1 }] })).toBe(
      '{"a":[{"x":1,"y":2}],"z":1}',
    );
  });

  it("keeps fences as decimal strings beyond JavaScript's safe integer", () => {
    expect(() => assertPageManifest(manifest())).not.toThrow();
    expect(() => assertPageManifest(manifest({ fence: "01" }))).toThrow(/decimal string/);
    expect(() => assertPageManifest(manifest({ fence: "0" }))).toThrow(/positive decimal/);
    expect(() => assertPageManifest(manifest({ recordCount: 0 }))).toThrow(/final manifest/);
  });

  it("requires an exact acknowledgement and makes an identical replay idempotent", () => {
    const page = manifest();
    const first = acknowledgePage(run(), page, acknowledgement(page), LATER);
    const replay = acknowledgePage(first, page, acknowledgement(page), LATER);

    expect(first.nextSequence).toBe(1);
    expect(first.stagedCursor).toBe("page-2");
    expect(replay).toBe(first);
    expect(() =>
      acknowledgePage(run(), page, { ...acknowledgement(page), digest: `sha256:${"b".repeat(64)}` }, LATER),
    ).toThrow(/exactly match/);
    expect(() =>
      acknowledgePage(first, page, { ...acknowledgement(page), fence: "2" }, LATER),
    ).toThrow(/exactly match/);
    expect(() =>
      acknowledgePage(
        first,
        { ...page, nextCursor: "tampered-cursor" },
        acknowledgement(page),
        LATER,
      ),
    ).toThrow(/cannot change/);
  });

  it("does not promote a partial run, but promotes an acknowledged empty final page", () => {
    const firstPage = manifest();
    const partial = acknowledgePage(run(), firstPage, acknowledgement(firstPage), LATER);
    expect(canPromoteCheckpoint(partial)).toBe(false);

    const finalPage = manifest({
      id: "manifest-2",
      sequence: 1,
      currentCursor: "page-2",
      nextCursor: "page-2",
      coverageMarker: "coverage-v1",
      recordCount: 0,
      final: true,
    });
    const complete = acknowledgePage(partial, finalPage, acknowledgement(finalPage), LATER);
    expect(acknowledgePage(complete, finalPage, acknowledgement(finalPage), LATER)).toBe(
      complete,
    );
    const promoted = promoteCheckpoint(complete, "2026-08-01T12:02:00.000Z", "9");

    expect(promoted.checkpoint).toMatchObject({
      committedCursor: "page-2",
      coverageMarker: "coverage-v1",
      committedDirtyGeneration: "8",
      pageCount: 2,
      recordCount: 2,
    });
    expect(promoted.dirty).toBe(true);
    expect(promoted.run.state).toBe("completed");
  });

  it("rejects malformed deserialised run proofs before acknowledgement or promotion", () => {
    const firstPage = manifest();
    const partial = acknowledgePage(run(), firstPage, acknowledgement(firstPage), LATER);
    const finalPage = manifest({
      id: "manifest-2",
      sequence: 1,
      currentCursor: "page-2",
      nextCursor: "page-2",
      coverageMarker: "coverage-v1",
      recordCount: 0,
      final: true,
    });
    const complete = acknowledgePage(partial, finalPage, acknowledgement(finalPage), LATER);
    const malformed: SyncRun[] = [
      { ...complete, nextSequence: 3 },
      {
        ...complete,
        acknowledgedPages: complete.acknowledgedPages.map((page, index) =>
          index === 1 ? { ...page, sequence: 7 } : page
        ),
      },
      {
        ...complete,
        acknowledgedPages: complete.acknowledgedPages.map((page, index) =>
          index === 1 ? { ...page, currentCursor: "broken-chain" } : page
        ),
      },
      { ...complete, acknowledgedRecordCount: 99 },
      { ...complete, stagedCoverageMarker: "different-coverage" },
      { ...complete, lease: { ...complete.lease, expiresAt: "not-a-time" } },
    ];

    for (const candidate of malformed) {
      expect(() => assertSyncRun(candidate)).toThrow();
      expect(() => canPromoteCheckpoint(candidate)).toThrow();
    }
  });

  it("lets the narrowest stop close sync without blurring its reason", () => {
    expect(effectiveSyncControl({ syncStopped: true })).toEqual({
      allowed: false,
      reason: "sync-stopped",
    });
    expect(effectiveSyncControl({ allConnectorsStopped: true, syncStopped: true })).toEqual({
      allowed: false,
      reason: "all-connectors-stopped",
    });
    expect(effectiveSyncControl({})).toEqual({ allowed: true });
  });
});
