import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = await readFile(
  new URL("../../migrations/007_accounting_connectors.sql", import.meta.url),
  "utf8",
);

describe("accounting connector migration", () => {
  it("binds a server replica to source, device and local-ledger identity", () => {
    expect(migration).toContain("local_replica_id uuid not null");
    expect(migration).toContain(
      "unique (source_connection_id, device_id, local_replica_id)",
    );
  });

  it("binds promoted checkpoints to the exact completed replica run and dataset", () => {
    expect(migration).toContain("unique (id, replica_id, dataset)");
    expect(migration).toContain(
      "foreign key (completed_run_id, replica_id, dataset)",
    );
    expect(migration).toContain(
      "references accounting_sync_runs(id, replica_id, dataset)",
    );
  });

  it("has no column capable of storing provider record or token bodies", () => {
    expect(migration).not.toMatch(/\b(?:json|jsonb|bytea)\b/iu);
    expect(migration).not.toMatch(/\b(?:access_token|refresh_token|provider_token)\b/iu);
  });
});
