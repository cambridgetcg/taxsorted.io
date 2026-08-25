import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_SYNC_SCHEMA,
  canonicalAccountingJson,
  type PageAcknowledgement,
} from "@taxsorted/engine/accounting-sync";
import {
  AccountingError,
  AccountingService,
  type AccountingOrganisationDirectory,
  type AccountingSql,
  type AccountingTransaction,
} from "../accounting.js";
import { syntheticAccountingProvider } from "../accounting-synthetic.js";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "22222222-2222-4222-8222-222222222222";
const DEVICE = "33333333-3333-4333-8333-333333333333";
const OTHER_DEVICE = "44444444-4444-4444-8444-444444444444";
const AUTH = "55555555-5555-4555-8555-555555555555";
const SOURCE = "66666666-6666-4666-8666-666666666666";
const ENTITY = "66666666-6666-4666-9666-666666666666";
const REBOUND_ENTITY = "66666666-6666-4666-a666-666666666666";
const REPLICA = "77777777-7777-4777-8777-777777777777";
const OTHER_REPLICA = "77777777-7777-4777-9777-777777777777";
const LOCAL_REPLICA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_LOCAL_REPLICA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RUN = "88888888-8888-4888-8888-888888888888";
const OTHER_RUN = "88888888-8888-4888-9888-888888888888";
const MANIFEST = "99999999-9999-4999-8999-999999999999";
const XERO_TENANT = "12345678-1234-4234-8234-123456789abc";
const XERO_CONNECTION = "abcdefab-cdef-4abc-8def-abcdefabcdef";
const FENCE = "9007199254740993";
const NOW = new Date("2026-08-01T12:00:00.000Z");
const FUTURE = new Date("2026-08-01T12:02:00.000Z");
const MANIFEST_FUTURE = new Date("2026-08-01T12:10:00.000Z");

interface Query {
  text: string;
  values: unknown[];
}

type Response = readonly object[] | ((query: Query) => readonly object[]);

function fakeSql(responses: Response[]) {
  const queries: Query[] = [];
  const invoke = (<Row extends object>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => {
    const query = {
      text: strings.join("?").replace(/\s+/gu, " ").trim(),
      values,
    };
    queries.push(query);
    const response = responses.shift();
    if (!response) throw new Error(`No fake response for: ${query.text}`);
    return Promise.resolve(
      (typeof response === "function" ? response(query) : response) as readonly Row[],
    );
  }) as unknown as AccountingSql;
  invoke.begin = async <T>(
    operation: (transaction: AccountingTransaction) => Promise<T>,
  ) => await operation(invoke);
  return { sql: invoke, queries, remaining: responses };
}

function replicaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: REPLICA,
    user_id: USER,
    source_connection_id: SOURCE,
    device_id: DEVICE,
    local_replica_id: LOCAL_REPLICA,
    status: "active",
    next_fence: "9007199254740992",
    created_at: NOW,
    source_status: "active",
    dirty_generation: "0",
    provider_organisation_id: "synthetic-uk-sole-trader",
    authorisation_id: AUTH,
    provider: "synthetic",
    provider_environment: "sandbox",
    authorisation_status: "active",
    ...overrides,
  };
}

function authorisationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: AUTH,
    user_id: USER,
    provider: "synthetic",
    provider_environment: "sandbox",
    provider_subject_id: `synthetic-subject:${USER}`,
    status: "active",
    granted_scopes: ["bank-transactions.read"],
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function sourceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SOURCE,
    user_id: USER,
    authorisation_id: AUTH,
    entity_id: ENTITY,
    provider_organisation_id: "synthetic-uk-sole-trader",
    organisation_name: "Mina's Card Studio (made-up)",
    country_code: "GB",
    base_currency: "GBP",
    status: "active",
    dirty_generation: "0",
    provider: "synthetic",
    provider_environment: "sandbox",
    provider_connection_id: null,
    created_at: NOW,
    ...overrides,
  };
}

function runRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RUN,
    source_connection_id: SOURCE,
    replica_id: REPLICA,
    dataset: "bank-transactions",
    kind: "initial",
    status: "active",
    fence: FENCE,
    lease_expires_at: FUTURE,
    base_cursor: null,
    staged_cursor: null,
    staged_coverage_marker: null,
    next_sequence: 0,
    acknowledged_page_count: 0,
    acknowledged_record_count: "0",
    started_dirty_generation: "0",
    started_at: NOW,
    provider: "synthetic",
    provider_environment: "sandbox",
    authorisation_id: AUTH,
    provider_organisation_id: "synthetic-uk-sole-trader",
    replica_status: "active",
    source_status: "active",
    authorisation_status: "active",
    current_dirty_generation: "0",
    ...overrides,
  };
}

function manifestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: MANIFEST,
    run_id: RUN,
    dataset: "bank-transactions",
    sequence: 0,
    fence: FENCE,
    page_digest: `sha256:${"a".repeat(64)}`,
    record_count: 2,
    current_cursor: null,
    next_cursor: "2",
    is_final: false,
    coverage_marker: null,
    expires_at: MANIFEST_FUTURE,
    created_at: NOW,
    acknowledged_at: null,
    ...overrides,
  };
}

function checkpointRow(overrides: Record<string, unknown> = {}) {
  return {
    replica_id: REPLICA,
    dataset: "bank-transactions",
    completed_run_id: RUN,
    committed_cursor: "3",
    committed_coverage_marker: "synthetic-bank-transactions-v1",
    committed_dirty_generation: "0",
    page_count: 2,
    record_count: "3",
    completed_at: NOW,
    ...overrides,
  };
}

function service(database: AccountingSql) {
  return new AccountingService(database, [syntheticAccountingProvider]);
}

const xeroOrganisation = {
  id: XERO_TENANT,
  name: "Demo Company (UK)",
  countryCode: "GB",
  baseCurrency: "GBP",
  datasets: [],
  synthetic: false,
} as const;

const xeroDirectory: AccountingOrganisationDirectory = {
  id: "xero",
  environment: "production",
  async listOrganisations() {
    return [xeroOrganisation];
  },
  async resolveOrganisation(_authorisationId, organisationId) {
    return organisationId === XERO_TENANT
      ? { organisation: xeroOrganisation, providerConnectionId: XERO_CONNECTION }
      : null;
  },
};

function serviceWithXeroDirectory(database: AccountingSql) {
  return new AccountingService(
    database,
    [syntheticAccountingProvider],
    [syntheticAccountingProvider, xeroDirectory],
  );
}

describe("accounting sync service", () => {
  it("refuses to bind a provider organisation to an entity the account does not own", async () => {
    const db = fakeSql([
      [authorisationRow()],
      [],
    ]);

    await expect(
      service(db.sql).createSourceConnection(USER, {
        authorisationId: AUTH,
        entityId: ENTITY,
        organisationId: "synthetic-uk-sole-trader",
      }),
    ).rejects.toMatchObject({
      code: "connection_owner_mismatch",
      status: 403,
    });
    expect(
      db.queries.some((query) =>
        query.text.startsWith("insert into accounting_source_connections"),
      ),
    ).toBe(false);
  });

  it("persists only the exact organisation offered by the owned authorisation", async () => {
    const db = fakeSql([
      [authorisationRow()],
      [{ ...authorisationRow(), entity_id: ENTITY }],
      [sourceRow()],
    ]);

    const result = await service(db.sql).createSourceConnection(USER, {
      authorisationId: AUTH,
      entityId: ENTITY,
      organisationId: "synthetic-uk-sole-trader",
    });

    expect(result).toMatchObject({
      sourceConnection: {
        id: SOURCE,
        authorisationId: AUTH,
        entityId: ENTITY,
        provider: "synthetic",
        organisation: {
          id: "synthetic-uk-sole-trader",
          name: "Mina's Card Studio (made-up)",
          countryCode: "GB",
          baseCurrency: "GBP",
        },
      },
    });
    const insert = db.queries.find((query) =>
      query.text.startsWith("insert into accounting_source_connections"),
    );
    expect(insert?.values).toContain("synthetic-uk-sole-trader");
    expect(insert?.values).toContain("Mina's Card Studio (made-up)");
  });

  it("persists Xero's server-resolved connection ID, never a browser value", async () => {
    const xeroAuthorisation = authorisationRow({
      provider: "xero",
      provider_environment: "production",
      provider_subject_id: "xero-user",
      granted_scopes: ["openid", "offline_access", "accounting.settings.read"],
    });
    const db = fakeSql([
      [xeroAuthorisation],
      [{ ...xeroAuthorisation, entity_id: ENTITY }],
      [sourceRow({
        provider: "xero",
        provider_environment: "production",
        provider_organisation_id: XERO_TENANT,
        provider_connection_id: XERO_CONNECTION,
        organisation_name: "Demo Company (UK)",
      })],
    ]);

    const result = await serviceWithXeroDirectory(db.sql).createSourceConnection(
      USER,
      {
        authorisationId: AUTH,
        entityId: ENTITY,
        organisationId: XERO_TENANT,
      },
    );

    expect(result).toMatchObject({
      sourceConnection: {
        provider: "xero",
        organisation: { id: XERO_TENANT, name: "Demo Company (UK)" },
      },
    });
    const insert = db.queries.find((query) =>
      query.text.startsWith("insert into accounting_source_connections"),
    );
    expect(insert?.values).toContain(XERO_CONNECTION);
    expect(insert?.text).toContain("provider_connection_id");
  });

  it("rebinds a paused Xero source using the current server-resolved connection", async () => {
    const xeroAuthorisation = authorisationRow({
      provider: "xero",
      provider_environment: "production",
      provider_subject_id: "xero-user",
      granted_scopes: ["openid", "offline_access", "accounting.settings.read"],
    });
    const paused = sourceRow({
      provider: "xero",
      provider_environment: "production",
      provider_organisation_id: XERO_TENANT,
      provider_connection_id: "11111111-2222-4333-8444-555555555555",
      organisation_name: "Old Demo Company",
      status: "paused",
      dirty_generation: "3",
    });
    const db = fakeSql([
      [xeroAuthorisation],
      [{ ...xeroAuthorisation, entity_id: REBOUND_ENTITY }],
      [],
      [paused],
      [{ ...xeroAuthorisation, entity_id: REBOUND_ENTITY }],
      [{
        ...paused,
        entity_id: REBOUND_ENTITY,
        organisation_name: "Demo Company (UK)",
        provider_connection_id: XERO_CONNECTION,
        status: "active",
        dirty_generation: "4",
      }],
    ]);

    const result = await serviceWithXeroDirectory(db.sql).createSourceConnection(
      USER,
      {
        authorisationId: AUTH,
        entityId: REBOUND_ENTITY,
        organisationId: XERO_TENANT,
      },
    );

    expect(result.sourceConnection).toMatchObject({
      entityId: REBOUND_ENTITY,
      status: "active",
      dirtyGeneration: "4",
      organisation: { id: XERO_TENANT, name: "Demo Company (UK)" },
    });
    const update = db.queries.find((query) =>
      query.text.startsWith("update accounting_source_connections"),
    );
    expect(update?.values).toContain(XERO_CONNECTION);
    expect(update?.text).toContain("dirty_generation = dirty_generation + 1");
    expect(update?.text).toContain("and dirty_generation = ?");
    expect(update?.text).toContain("provider_connection_id is not distinct from ?");
    expect(update?.text).toContain("provider_disconnected_at = null");
    expect(update?.text).toContain("provider_disconnect_lock_id is null");
  });

  it("does not rebind a locally disconnected Xero source before provider cleanup is confirmed", async () => {
    const xeroAuthorisation = authorisationRow({
      provider: "xero",
      provider_environment: "production",
      provider_subject_id: "xero-user",
      granted_scopes: ["openid", "offline_access", "accounting.settings.read"],
    });
    const db = fakeSql([
      [xeroAuthorisation],
      [{ ...xeroAuthorisation, entity_id: ENTITY }],
      [],
      [sourceRow({
        provider: "xero",
        provider_environment: "production",
        provider_organisation_id: XERO_TENANT,
        provider_connection_id: XERO_CONNECTION,
        status: "disconnected",
        disconnected_at: NOW,
        provider_disconnected_at: null,
      })],
    ]);

    await expect(
      serviceWithXeroDirectory(db.sql).createSourceConnection(USER, {
        authorisationId: AUTH,
        entityId: ENTITY,
        organisationId: XERO_TENANT,
      }),
    ).rejects.toMatchObject({
      code: "organisation_already_linked",
      status: 409,
    });
    expect(
      db.queries.some((query) =>
        query.text.startsWith("update accounting_source_connections"),
      ),
    ).toBe(false);
  });

  it("rebinds a disconnected Xero source after provider cleanup is confirmed", async () => {
    const xeroAuthorisation = authorisationRow({
      provider: "xero",
      provider_environment: "production",
      provider_subject_id: "xero-user",
      granted_scopes: ["openid", "offline_access", "accounting.settings.read"],
    });
    const disconnected = sourceRow({
      provider: "xero",
      provider_environment: "production",
      provider_organisation_id: XERO_TENANT,
      provider_connection_id: XERO_CONNECTION,
      status: "disconnected",
      dirty_generation: "8",
      disconnected_at: NOW,
      provider_disconnected_at: NOW,
    });
    const db = fakeSql([
      [xeroAuthorisation],
      [{ ...xeroAuthorisation, entity_id: ENTITY }],
      [],
      [disconnected],
      [{ ...xeroAuthorisation, entity_id: ENTITY }],
      [{
        ...disconnected,
        status: "active",
        dirty_generation: "9",
        disconnected_at: null,
        provider_disconnected_at: null,
      }],
    ]);

    const result = await serviceWithXeroDirectory(db.sql).createSourceConnection(
      USER,
      {
        authorisationId: AUTH,
        entityId: ENTITY,
        organisationId: XERO_TENANT,
      },
    );

    expect(result.sourceConnection).toMatchObject({
      status: "active",
      dirtyGeneration: "9",
      provider: "xero",
    });
    expect(
      db.queries.some((query) =>
        query.text.startsWith("update accounting_source_connections"),
      ),
    ).toBe(true);
  });

  it("refuses a Xero rebind when the source lifecycle advances during revalidation", async () => {
    const xeroAuthorisation = authorisationRow({
      provider: "xero",
      provider_environment: "production",
      provider_subject_id: "xero-user",
      granted_scopes: ["openid", "offline_access", "accounting.settings.read"],
    });
    const disconnected = sourceRow({
      provider: "xero",
      provider_environment: "production",
      provider_organisation_id: XERO_TENANT,
      provider_connection_id: XERO_CONNECTION,
      status: "disconnected",
      dirty_generation: "12",
      disconnected_at: NOW,
      provider_disconnected_at: NOW,
    });
    const db = fakeSql([
      [xeroAuthorisation],
      [{ ...xeroAuthorisation, entity_id: ENTITY }],
      [],
      [disconnected],
      [{ ...xeroAuthorisation, entity_id: ENTITY }],
      [],
    ]);

    await expect(
      serviceWithXeroDirectory(db.sql).createSourceConnection(USER, {
        authorisationId: AUTH,
        entityId: ENTITY,
        organisationId: XERO_TENANT,
      }),
    ).rejects.toMatchObject({
      code: "source_connection_conflict",
      status: 409,
    });
    const fencedUpdate = db.queries.at(-1)!;
    expect(fencedUpdate.text).toContain("and dirty_generation = ?");
    expect(fencedUpdate.text).toContain(
      "provider_disconnected_at is not distinct from ?",
    );
    expect(fencedUpdate.text).toContain("provider_disconnect_lock_id is null");
    expect(fencedUpdate.values).toContain("12");
  });

  it("creates one idempotent server replica for an exact local-ledger identity", async () => {
    const db = fakeSql([
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [],
      [replicaRow()],
    ]);

    const result = await service(db.sql).createReplica(USER, DEVICE, SOURCE, {
      localReplicaId: LOCAL_REPLICA,
    });

    expect(result).toEqual({
      replica: {
        id: REPLICA,
        sourceConnectionId: SOURCE,
        localReplicaId: LOCAL_REPLICA,
        status: "active",
        createdAt: NOW.toISOString(),
      },
    });
    expect(db.queries[2]?.text).toContain(
      "on conflict (source_connection_id, device_id, local_replica_id) do nothing",
    );
    expect(db.queries[3]?.text).toContain("rp.local_replica_id = ?");
    expect(db.queries[1]?.text).toContain("for update of sc");
  });

  it("gives a newly-created local ledger a fresh server replica", async () => {
    const db = fakeSql([
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [replicaRow()],
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [replicaRow({
        id: OTHER_REPLICA,
        local_replica_id: OTHER_LOCAL_REPLICA,
      })],
    ]);

    const first = await service(db.sql).createReplica(USER, DEVICE, SOURCE, {
      localReplicaId: LOCAL_REPLICA,
    });
    const second = await service(db.sql).createReplica(USER, DEVICE, SOURCE, {
      localReplicaId: OTHER_LOCAL_REPLICA,
    });

    expect((first.replica as { id: string }).id).toBe(REPLICA);
    expect(second).toMatchObject({
      replica: {
        id: OTHER_REPLICA,
        localReplicaId: OTHER_LOCAL_REPLICA,
      },
    });
    expect(db.queries[2]?.values).toContain(LOCAL_REPLICA);
    expect(db.queries[5]?.values).toContain(OTHER_LOCAL_REPLICA);
  });

  it("does not revive a retired local replica", async () => {
    const db = fakeSql([
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [],
      [replicaRow({ status: "retired" })],
    ]);

    await expect(
      service(db.sql).createReplica(USER, DEVICE, SOURCE, {
        localReplicaId: LOCAL_REPLICA,
      }),
    ).rejects.toMatchObject({ code: "replica_retired" });
  });

  it("revalidates and locks the source before inserting a replica", async () => {
    const db = fakeSql([
      [{ provider: "synthetic", provider_environment: "sandbox" }],
      [],
    ]);

    await expect(
      service(db.sql).createReplica(USER, DEVICE, SOURCE, {
        localReplicaId: LOCAL_REPLICA,
      }),
    ).rejects.toMatchObject({
      code: "source_connection_not_active",
      status: 409,
    });
    expect(db.queries[1]?.text).toContain("for update of sc");
    expect(
      db.queries.some((query) =>
        query.text.startsWith("insert into accounting_sync_replicas"),
      ),
    ).toBe(false);
  });

  it("discovers Xero organisations without registering a financial page reader", async () => {
    const db = fakeSql([
      [authorisationRow({
        provider: "xero",
        provider_environment: "production",
        provider_subject_id: "xero-user",
        granted_scopes: ["openid", "offline_access", "accounting.settings.read"],
      })],
    ]);

    const result = await serviceWithXeroDirectory(db.sql).listOrganisations(USER, AUTH);

    expect(result).toMatchObject({
      authorisation: { provider: "xero", environment: "production" },
      organisations: [{
        id: "12345678-1234-4234-8234-123456789abc",
        name: "Demo Company (UK)",
        datasets: [],
      }],
      persisted: false,
    });
  });

  it("rejects a Xero replica before connector state can be mutated", async () => {
    const db = fakeSql([
      [{ provider: "xero", provider_environment: "production" }],
    ]);

    await expect(
      serviceWithXeroDirectory(db.sql).createReplica(USER, DEVICE, SOURCE, {
        localReplicaId: LOCAL_REPLICA,
      }),
    ).rejects.toMatchObject({ code: "dataset_unavailable", status: 422 });
    expect(db.queries).toHaveLength(1);
    expect(db.queries.some((query) => /^(?:insert|update|delete) /u.test(query.text)))
      .toBe(false);
  });

  it("rejects a Xero sync run before a fence or run can be created", async () => {
    const db = fakeSql([
      [replicaRow({
        provider: "xero",
        provider_environment: "production",
        provider_organisation_id: "12345678-1234-4234-8234-123456789abc",
      })],
    ]);

    await expect(
      serviceWithXeroDirectory(db.sql).startRun(USER, DEVICE, SOURCE, {
        replicaId: REPLICA,
        localReplicaId: LOCAL_REPLICA,
        expectedCompletedRunId: null,
        dataset: "bank-transactions",
        kind: "initial",
      }),
    ).rejects.toMatchObject({ code: "dataset_unavailable", status: 422 });
    expect(db.queries).toHaveLength(1);
    expect(db.queries.some((query) => /^(?:insert|update|delete) /u.test(query.text)))
      .toBe(false);
  });

  it("acquires a DB-clock lease under the device-bound replica lock and returns bigint fence as text", async () => {
    const db = fakeSql([
      [sourceRow({ authorisation_status: "active" })],
      [replicaRow()],
      [{ database_now: NOW }],
      [],
      [],
      [{ next_fence: FENCE }],
      [runRow()],
    ]);

    const result = await service(db.sql).startRun(USER, DEVICE, SOURCE, {
      replicaId: REPLICA,
      localReplicaId: LOCAL_REPLICA,
      expectedCompletedRunId: null,
      dataset: "bank-transactions",
      kind: "initial",
    });

    expect(result).toMatchObject({
      run: {
        schema: ACCOUNTING_SYNC_SCHEMA,
        id: RUN,
        state: "active",
        lease: { fence: FENCE },
        startedDirtyGeneration: "0",
        acknowledgedPages: [],
      },
    });
    expect(typeof (result.run as { lease: { fence: unknown } }).lease.fence).toBe("string");
    expect(db.queries[0]?.text).toContain("for update of sc");
    expect(db.queries[1]?.text).toContain("rp.device_id = ?");
    expect(db.queries[1]?.values).toContain(DEVICE);
    expect(db.queries.some((query) => query.text.includes("for update of rp"))).toBe(true);
    expect(db.queries.some((query) => query.text.includes("clock_timestamp()"))).toBe(true);
    expect(db.remaining).toHaveLength(0);
  });

  it("renews the exact active fence under the database clock", async () => {
    const renewedExpiry = new Date("2026-08-01T12:03:00.000Z");
    const db = fakeSql([
      [runRow()],
      [{ database_now: NOW }],
      [runRow({ lease_expires_at: renewedExpiry })],
      [],
    ]);

    const result = await service(db.sql).renewLease(
      USER,
      DEVICE,
      RUN,
      FENCE,
      LOCAL_REPLICA,
    );

    expect(result).toMatchObject({
      run: {
        schema: ACCOUNTING_SYNC_SCHEMA,
        id: RUN,
        state: "active",
        lease: { fence: FENCE, expiresAt: renewedExpiry.toISOString() },
        nextSequence: 0,
        acknowledgedPages: [],
      },
    });
    expect(db.queries[0]?.values).toContain(DEVICE);
    expect(db.queries[0]?.values).toContain(LOCAL_REPLICA);
    expect(db.queries[2]?.text).toContain("lease_expires_at = clock_timestamp()");
    expect(db.queries[2]?.values).toContain(120);
    expect(db.remaining).toHaveLength(0);
  });

  it("does not renew an expired fence", async () => {
    const db = fakeSql([
      [runRow({ lease_expires_at: NOW })],
      [{ database_now: NOW }],
    ]);

    await expect(
      service(db.sql).renewLease(USER, DEVICE, RUN, FENCE, LOCAL_REPLICA),
    ).rejects.toMatchObject({ code: "stale_sync_fence", status: 409 });
    expect(db.queries.some((query) => query.text.startsWith("update accounting_sync_runs")))
      .toBe(false);
  });

  it("cannot acquire another device's replica", async () => {
    const db = fakeSql([
      [sourceRow({ authorisation_status: "active" })],
      [],
    ]);

    await expect(
      service(db.sql).startRun(USER, OTHER_DEVICE, SOURCE, {
        replicaId: REPLICA,
        localReplicaId: LOCAL_REPLICA,
        expectedCompletedRunId: null,
        dataset: "bank-transactions",
        kind: "initial",
      }),
    ).rejects.toMatchObject({
      name: "AccountingError",
      code: "replica_not_found",
    });
    expect(db.queries[1]?.values).toContain(OTHER_DEVICE);
  });

  it("cannot mutate a sync run through a different local browser replica", async () => {
    const db = fakeSql([[]]);

    await expect(
      service(db.sql).acknowledgePage(USER, DEVICE, RUN, {
        manifestId: MANIFEST,
        runId: RUN,
        replicaId: REPLICA,
        dataset: "bank-transactions",
        sequence: 0,
        fence: FENCE,
        digest: `sha256:${"a".repeat(64)}`,
        localReplicaId: OTHER_LOCAL_REPLICA,
      }),
    ).rejects.toMatchObject({ code: "sync_run_not_found" });
    expect(db.queries[0]?.values).toContain(OTHER_LOCAL_REPLICA);
    expect(db.queries.some((query) => /^(?:insert|update|delete) /u.test(query.text)))
      .toBe(false);
  });

  it.each(["repair", "pre-filing"] as const)(
    "rejects the unimplemented %s sync kind before touching connector state",
    async (kind) => {
      const db = fakeSql([]);

      await expect(
        service(db.sql).startRun(USER, DEVICE, SOURCE, {
          replicaId: REPLICA,
          localReplicaId: LOCAL_REPLICA,
          expectedCompletedRunId: null,
          dataset: "bank-transactions",
          kind,
        }),
      ).rejects.toMatchObject({ code: "sync_kind_unavailable", status: 422 });
      expect(db.queries).toHaveLength(0);
    },
  );

  it("rejects an initial run when that replica already has a checkpoint", async () => {
    const db = fakeSql([
      [sourceRow({ authorisation_status: "active" })],
      [replicaRow()],
      [{ database_now: NOW }],
      [],
      [checkpointRow()],
    ]);

    await expect(
      service(db.sql).startRun(USER, DEVICE, SOURCE, {
        replicaId: REPLICA,
        localReplicaId: LOCAL_REPLICA,
        expectedCompletedRunId: RUN,
        dataset: "bank-transactions",
        kind: "initial",
      }),
    ).rejects.toMatchObject({ code: "initial_sync_has_checkpoint" });
    expect(db.queries.some((query) => query.text.startsWith("update accounting_sync_replicas")))
      .toBe(false);
  });

  it("rejects an incremental run when that replica has no checkpoint", async () => {
    const db = fakeSql([
      [sourceRow({ authorisation_status: "active" })],
      [replicaRow()],
      [{ database_now: NOW }],
      [],
      [],
    ]);

    await expect(
      service(db.sql).startRun(USER, DEVICE, SOURCE, {
        replicaId: REPLICA,
        localReplicaId: LOCAL_REPLICA,
        expectedCompletedRunId: null,
        dataset: "bank-transactions",
        kind: "incremental",
      }),
    ).rejects.toMatchObject({ code: "incremental_sync_needs_checkpoint" });
    expect(db.queries.some((query) => query.text.startsWith("update accounting_sync_replicas")))
      .toBe(false);
  });

  it("rejects a run when the completed checkpoint changed after status was read", async () => {
    const db = fakeSql([
      [sourceRow({ authorisation_status: "active" })],
      [replicaRow()],
      [{ database_now: NOW }],
      [],
      [checkpointRow()],
    ]);

    await expect(
      service(db.sql).startRun(USER, DEVICE, SOURCE, {
        replicaId: REPLICA,
        localReplicaId: LOCAL_REPLICA,
        expectedCompletedRunId: OTHER_RUN,
        dataset: "bank-transactions",
        kind: "incremental",
      }),
    ).rejects.toMatchObject({ code: "sync_checkpoint_changed" });
    expect(db.queries.some((query) => query.text.startsWith("update accounting_sync_replicas")))
      .toBe(false);
  });

  it("does not take over an unexpired active run", async () => {
    const db = fakeSql([
      [sourceRow({ authorisation_status: "active" })],
      [replicaRow()],
      [{ database_now: NOW }],
      [runRow()],
    ]);

    await expect(
      service(db.sql).startRun(USER, DEVICE, SOURCE, {
        replicaId: REPLICA,
        localReplicaId: LOCAL_REPLICA,
        expectedCompletedRunId: null,
        dataset: "bank-transactions",
        kind: "initial",
      }),
    ).rejects.toMatchObject({ code: "sync_run_already_active" });
    expect(db.queries.some((query) => query.text.startsWith("update accounting_sync_replicas"))).toBe(false);
  });

  it("stores only manifest facts while returning provider records to the browser", async () => {
    const firstPage = await syntheticAccountingProvider.pullPage({
      authorisationId: AUTH,
      organisationId: "synthetic-uk-sole-trader",
      dataset: "bank-transactions",
      cursor: null,
    });
    const digest = `sha256:${createHash("sha256")
      .update(canonicalAccountingJson(firstPage.records))
      .digest("hex")}`;
    const db = fakeSql([
      [runRow()],
      [runRow()],
      [{ database_now: NOW }],
      [],
      [manifestRow({ page_digest: digest })],
    ]);

    const result = await service(db.sql).pullPage(
      USER,
      DEVICE,
      RUN,
      "bank-transactions",
      FENCE,
      LOCAL_REPLICA,
    );

    expect((result.records as unknown[])).toHaveLength(2);
    expect(result).toMatchObject({
      manifest: {
        schema: ACCOUNTING_SYNC_SCHEMA,
        sourceConnectionId: SOURCE,
        replicaId: REPLICA,
        dirtyGeneration: "0",
        fence: FENCE,
        digest,
        recordCount: 2,
        final: false,
      },
    });
    const insert = db.queries.find((query) =>
      query.text.startsWith("insert into accounting_page_manifests"),
    )!;
    expect(insert.text).not.toMatch(/records|payload|description/u);
    expect(JSON.stringify(insert.values)).not.toContain("Synthetic design work receipt");
    expect(db.queries[1]?.values).toContain(DEVICE);
  });

  it("issues a zero-record final manifest at the completed incremental cursor", async () => {
    const emptyDigest = `sha256:${createHash("sha256")
      .update(canonicalAccountingJson([]))
      .digest("hex")}`;
    const current = runRow({
      kind: "incremental",
      base_cursor: "3",
      staged_cursor: "3",
      next_sequence: 2,
      acknowledged_page_count: 2,
      acknowledged_record_count: "3",
    });
    const finalManifest = manifestRow({
      sequence: 2,
      page_digest: emptyDigest,
      record_count: 0,
      current_cursor: "3",
      next_cursor: "3",
      is_final: true,
      coverage_marker: "synthetic-bank-transactions-v1",
    });
    const db = fakeSql([
      [current],
      [current],
      [{ database_now: NOW }],
      [],
      [finalManifest],
    ]);

    const result = await service(db.sql).pullPage(
      USER,
      DEVICE,
      RUN,
      "bank-transactions",
      FENCE,
      LOCAL_REPLICA,
    );

    expect(result.records).toEqual([]);
    expect(result).toMatchObject({
      manifest: {
        fence: FENCE,
        digest: emptyDigest,
        recordCount: 0,
        final: true,
        currentCursor: "3",
        nextCursor: "3",
      },
    });
  });

  it("rejects a digest mismatch before acknowledgement can advance", async () => {
    const db = fakeSql([
      [runRow()],
      [{ database_now: NOW }],
      [manifestRow()],
    ]);

    await expect(
      service(db.sql).acknowledgePage(USER, DEVICE, RUN, {
        manifestId: MANIFEST,
        runId: RUN,
        replicaId: REPLICA,
        dataset: "bank-transactions",
        sequence: 0,
        fence: FENCE,
        digest: `sha256:${"b".repeat(64)}`,
        localReplicaId: LOCAL_REPLICA,
      }),
    ).rejects.toMatchObject({ code: "page_manifest_mismatch" });
    expect(db.queries.some((query) => query.text.startsWith("update accounting_"))).toBe(false);
  });

  it("acknowledges the zero-record final manifest once and treats an exact replay as idempotent", async () => {
    const emptyDigest = `sha256:${createHash("sha256")
      .update(canonicalAccountingJson([]))
      .digest("hex")}`;
    const current = runRow({
      kind: "incremental",
      base_cursor: "3",
      staged_cursor: "3",
      next_sequence: 2,
      acknowledged_page_count: 2,
      acknowledged_record_count: "3",
    });
    const final = manifestRow({
      sequence: 2,
      page_digest: emptyDigest,
      record_count: 0,
      current_cursor: "3",
      next_cursor: "3",
      is_final: true,
      coverage_marker: "synthetic-bank-transactions-v1",
    });
    const firstDb = fakeSql([
      [current],
      [{ database_now: NOW }],
      [final],
      [],
      [{ next_sequence: 3 }],
    ]);
    const input: PageAcknowledgement & { localReplicaId: string } = {
      manifestId: MANIFEST,
      runId: RUN,
      replicaId: REPLICA,
      dataset: "bank-transactions",
      sequence: 2,
      fence: FENCE,
      digest: emptyDigest,
      localReplicaId: LOCAL_REPLICA,
    };

    const first = await service(firstDb.sql).acknowledgePage(
      USER,
      DEVICE,
      RUN,
      input,
    );
    expect(first).toEqual({
      acknowledgement: {
        manifestId: MANIFEST,
        runId: RUN,
        replicaId: REPLICA,
        dataset: "bank-transactions",
        sequence: 2,
        fence: FENCE,
        digest: emptyDigest,
      },
      changed: true,
      nextSequence: 3,
    });
    expect(firstDb.queries[0]?.values).toContain(DEVICE);

    const replayDb = fakeSql([
      [runRow({
        kind: "incremental",
        staged_cursor: "3",
        staged_coverage_marker: "synthetic-bank-transactions-v1",
        next_sequence: 3,
        acknowledged_page_count: 3,
        acknowledged_record_count: "3",
      })],
      [{ database_now: NOW }],
      [{ ...final, acknowledged_at: NOW }],
    ]);
    const replay = await service(replayDb.sql).acknowledgePage(
      USER,
      DEVICE,
      RUN,
      input,
    );
    expect(replay).toMatchObject({ changed: false, nextSequence: 3 });
    expect(replayDb.queries.some((query) => query.text.startsWith("update accounting_"))).toBe(false);
  });

  it("promotes the whole zero-record incremental run atomically with safe JSON field types", async () => {
    const complete = runRow({
      kind: "incremental",
      staged_cursor: "3",
      staged_coverage_marker: "synthetic-bank-transactions-v1",
      next_sequence: 3,
      acknowledged_page_count: 3,
      acknowledged_record_count: "3",
      current_dirty_generation: "1",
    });
    const final = manifestRow({
      sequence: 2,
      record_count: 0,
      current_cursor: "3",
      next_cursor: "3",
      is_final: true,
      coverage_marker: "synthetic-bank-transactions-v1",
      acknowledged_at: NOW,
    });
    const acknowledgedManifests = [
      manifestRow({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        acknowledged_at: NOW,
      }),
      manifestRow({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sequence: 1,
        record_count: 1,
        current_cursor: "2",
        next_cursor: "3",
        acknowledged_at: NOW,
      }),
      final,
    ];
    const checkpoint = {
      replica_id: REPLICA,
      dataset: "bank-transactions",
      completed_run_id: RUN,
      committed_cursor: "3",
      committed_coverage_marker: "synthetic-bank-transactions-v1",
      committed_dirty_generation: "0",
      page_count: 3,
      record_count: "3",
      completed_at: NOW,
    };
    const db = fakeSql([
      [complete],
      [{ database_now: NOW }],
      acknowledgedManifests,
      [checkpoint],
      [{ completed_at: NOW }],
    ]);

    const result = await service(db.sql).completeRun(
      USER,
      DEVICE,
      RUN,
      FENCE,
      LOCAL_REPLICA,
    );

    expect(result).toMatchObject({
      run: {
        schema: ACCOUNTING_SYNC_SCHEMA,
        id: RUN,
        state: "completed",
        lease: { fence: FENCE },
        acknowledgedRecordCount: 3,
      },
      checkpoint: {
        schema: ACCOUNTING_SYNC_SCHEMA,
        sourceConnectionId: SOURCE,
        committedDirtyGeneration: "0",
        recordCount: 3,
        coverageMarker: "synthetic-bank-transactions-v1",
      },
      needsAnotherSync: true,
    });
    expect(typeof (result.run as { lease: { fence: unknown } }).lease.fence).toBe("string");
    expect(
      typeof (result.checkpoint as { committedDirtyGeneration: unknown })
        .committedDirtyGeneration,
    ).toBe("string");
    expect(db.queries[0]?.values).toContain(DEVICE);
    expect(db.queries.find((query) =>
      query.text.startsWith("insert into accounting_dataset_checkpoints"),
    )).toBeDefined();
    expect(db.queries.at(-1)?.text.startsWith("update accounting_sync_runs")).toBe(true);

    const replayDb = fakeSql([
      [{ ...complete, status: "completed" }],
      [{ database_now: NOW }],
      acknowledgedManifests,
      [checkpoint],
    ]);
    const replay = await service(replayDb.sql).completeRun(
      USER,
      DEVICE,
      RUN,
      FENCE,
      LOCAL_REPLICA,
    );
    expect(replay).toEqual(result);
    expect(replayDb.queries.some((query) =>
      /^(?:insert|update|delete) /u.test(query.text),
    )).toBe(false);
  });

  it("replays the exact completed proof without writing connector state again", async () => {
    const final = manifestRow({
      record_count: 3,
      next_cursor: "3",
      is_final: true,
      coverage_marker: "synthetic-bank-transactions-v1",
      acknowledged_at: NOW,
    });
    const completed = runRow({
      status: "completed",
      staged_cursor: "3",
      staged_coverage_marker: "synthetic-bank-transactions-v1",
      next_sequence: 1,
      acknowledged_page_count: 1,
      acknowledged_record_count: "3",
    });
    const db = fakeSql([
      [completed],
      [{ database_now: NOW }],
      [final],
      [checkpointRow({ page_count: 1 })],
    ]);

    const replay = await service(db.sql).completeRun(
      USER,
      DEVICE,
      RUN,
      FENCE,
      LOCAL_REPLICA,
    );

    expect(replay).toMatchObject({
      run: {
        id: RUN,
        state: "completed",
        acknowledgedPages: [{ manifestId: MANIFEST, final: true }],
      },
      checkpoint: {
        completedRunId: RUN,
        committedCursor: "3",
        pageCount: 1,
        recordCount: 3,
      },
      needsAnotherSync: false,
    });
    expect(db.queries[0]?.values).toEqual([
      RUN,
      USER,
      DEVICE,
      LOCAL_REPLICA,
    ]);
    expect(db.queries.some((query) => /^(?:insert|update|delete) /u.test(query.text)))
      .toBe(false);
    expect(db.remaining).toHaveLength(0);
  });

  it("refuses completion before a final page is acknowledged", async () => {
    const db = fakeSql([
      [runRow()],
      [{ database_now: NOW }],
    ]);

    await expect(
      service(db.sql).completeRun(USER, DEVICE, RUN, FENCE, LOCAL_REPLICA),
    ).rejects.toBeInstanceOf(AccountingError);
    expect(db.queries.some((query) =>
      query.text.startsWith("insert into accounting_dataset_checkpoints"),
    )).toBe(false);
  });

  it("cancels an active run after its lease expires and its connection stops", async () => {
    const expired = new Date("2026-08-01T11:59:00.000Z");
    const acknowledged = manifestRow({ acknowledged_at: NOW });
    const active = runRow({
      lease_expires_at: expired,
      replica_status: "retired",
      source_status: "revoked",
      authorisation_status: "revoked",
      staged_cursor: "2",
      next_sequence: 1,
      acknowledged_page_count: 1,
      acknowledged_record_count: "2",
    });
    const db = fakeSql([
      [active],
      [{ ...active, status: "cancelled" }],
      [acknowledged],
    ]);

    const result = await service(db.sql).cancelRun(
      USER,
      DEVICE,
      RUN,
      FENCE,
      LOCAL_REPLICA,
    );

    expect(result).toMatchObject({
      changed: true,
      run: {
        id: RUN,
        state: "cancelled",
        acknowledgedPages: [{ manifestId: MANIFEST, sequence: 0 }],
      },
    });
    expect(db.queries[0]?.values).toEqual([
      RUN,
      USER,
      DEVICE,
      LOCAL_REPLICA,
    ]);
    expect(db.queries[0]?.text).not.toContain("lease_expires_at >");
    expect(db.queries[0]?.text).not.toContain("source_status");
    expect(db.queries[1]?.text).toContain("set status = 'cancelled'");
  });

  it("replays the same cancelled run without another write", async () => {
    const cancelled = runRow({ status: "cancelled" });
    const db = fakeSql([[cancelled], []]);

    const result = await service(db.sql).cancelRun(
      USER,
      DEVICE,
      RUN,
      FENCE,
      LOCAL_REPLICA,
    );

    expect(result).toMatchObject({
      run: { id: RUN, state: "cancelled" },
      changed: false,
    });
    expect(db.queries.some((query) =>
      /^(?:insert|update|delete) /u.test(query.text),
    )).toBe(false);
    expect(db.remaining).toHaveLength(0);
  });

  it("returns a completed run unchanged when completion wins the row lock", async () => {
    const completed = runRow({
      status: "completed",
      staged_cursor: "2",
      staged_coverage_marker: "synthetic-bank-transactions-v1",
      next_sequence: 1,
      acknowledged_page_count: 1,
      acknowledged_record_count: "2",
    });
    const final = manifestRow({
      next_cursor: "2",
      is_final: true,
      coverage_marker: "synthetic-bank-transactions-v1",
      acknowledged_at: NOW,
    });
    const db = fakeSql([[completed], [final]]);

    const result = await service(db.sql).cancelRun(
      USER,
      DEVICE,
      RUN,
      FENCE,
      LOCAL_REPLICA,
    );

    expect(result).toMatchObject({
      changed: false,
      run: {
        id: RUN,
        state: "completed",
        acknowledgedPages: [{ manifestId: MANIFEST, final: true }],
      },
    });
    expect(db.queries.some((query) =>
      /^(?:insert|update|delete) /u.test(query.text),
    )).toBe(false);
  });

  it("does not reveal a run to the wrong user, device or local replica", async () => {
    const wrongBindings = [
      [OTHER_USER, DEVICE, LOCAL_REPLICA],
      [USER, OTHER_DEVICE, LOCAL_REPLICA],
      [USER, DEVICE, OTHER_LOCAL_REPLICA],
    ] as const;

    for (const [userId, deviceId, localReplicaId] of wrongBindings) {
      const db = fakeSql([[]]);
      await expect(
        service(db.sql).cancelRun(
          userId,
          deviceId,
          RUN,
          FENCE,
          localReplicaId,
        ),
      ).rejects.toMatchObject({ code: "sync_run_not_found", status: 404 });
      expect(db.queries[0]?.values).toEqual([
        RUN,
        userId,
        deviceId,
        localReplicaId,
      ]);
      expect(db.queries.some((query) =>
        /^(?:insert|update|delete) /u.test(query.text),
      )).toBe(false);
    }
  });

  it("rejects a wrong cancellation fence and other terminal states", async () => {
    const wrongFence = fakeSql([[runRow()]]);
    await expect(
      service(wrongFence.sql).cancelRun(
        USER,
        DEVICE,
        RUN,
        "9007199254740994",
        LOCAL_REPLICA,
      ),
    ).rejects.toMatchObject({ code: "stale_sync_fence", status: 409 });

    const failed = fakeSql([[runRow({ status: "failed" })]]);
    await expect(
      service(failed.sql).cancelRun(
        USER,
        DEVICE,
        RUN,
        FENCE,
        LOCAL_REPLICA,
      ),
    ).rejects.toMatchObject({ code: "sync_run_not_cancellable", status: 409 });
    expect([...wrongFence.queries, ...failed.queries].some((query) =>
      /^(?:insert|update|delete) /u.test(query.text),
    )).toBe(false);
  });

  it("keeps account and device isolation predicates on status", async () => {
    const db = fakeSql([[]]);
    await expect(
      service(db.sql).sourceStatus(
        OTHER_USER,
        OTHER_DEVICE,
        SOURCE,
        LOCAL_REPLICA,
      ),
    ).rejects.toMatchObject({ code: "source_connection_not_found" });
    expect(db.queries[0]?.values).toEqual([SOURCE, OTHER_USER]);
  });

  it("returns status only for the exact local browser replica", async () => {
    const db = fakeSql([
      [sourceRow()],
      [],
      [],
    ]);

    const result = await service(db.sql).sourceStatus(
      USER,
      DEVICE,
      SOURCE,
      LOCAL_REPLICA,
    );

    expect(result).toMatchObject({ replicas: [], checkpoints: [] });
    expect(db.queries[1]?.values).toEqual([
      SOURCE,
      USER,
      DEVICE,
      LOCAL_REPLICA,
    ]);
    expect(db.queries[2]?.values).toEqual([
      SOURCE,
      USER,
      DEVICE,
      LOCAL_REPLICA,
    ]);
  });
});
