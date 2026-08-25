import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  type AccountingSql,
  type AccountingTransaction,
} from "../accounting.js";
import { AccountingTokenVault } from "../accounting-token-vault.js";
import { XeroFoundationService } from "../accounting-xero.js";
import {
  XERO_SCOPE,
  XeroOidcError,
  type XeroConnection,
  type XeroInitialTokenSet,
  type XeroOidcClient,
  type XeroOrganisation,
  type XeroTokenSet,
} from "../xero-oidc.js";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER_USER = "22222222-2222-4222-8222-222222222222";
const SESSION = "33333333-3333-4333-8333-333333333333";
const OTHER_SESSION = "44444444-4444-4444-8444-444444444444";
const ATTEMPT = "55555555-5555-4555-8555-555555555555";
const AUTHORISATION = "66666666-6666-4666-8666-666666666666";
const QUARANTINED_AUTHORISATION = "12121212-1212-4212-8212-121212121212";
const SOURCE = "77777777-7777-4777-8777-777777777777";
const REFRESH_LOCK = "88888888-8888-4888-8888-888888888888";
const CALLBACK_OPERATION = "13131313-1313-4313-8313-131313131313";
const SOURCE_DISCONNECT_LOCK = "10101010-1010-4010-8010-101010101010";
const REVOCATION_LOCK = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const DEMO_TENANT = "99999999-9999-4999-8999-999999999999";
const LIVE_TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INACTIVE_TENANT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DEMO_CONNECTION = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const LIVE_CONNECTION = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const INACTIVE_CONNECTION = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CALLBACK_URI =
  "https://api.taxsorted.io/v1/accounting/oauth/xero/callback";
const NOW = new Date("2026-08-25T12:00:00.000Z");
const STATE = "state_value_abcdefghijklmnopqrstuvwxyz0123456789";
const NONCE = "nonce_value_abcdefghijklmnopqrstuvwxyz0123456789";
const OTHER_NONCE = "other_nonce_abcdefghijklmnopqrstuvwxyz0123456789";
const CODE_VERIFIER =
  "verifier_value_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
const ACCESS_TOKEN = "xero-access-token-secret";
const REFRESH_TOKEN = "xero-refresh-token-secret";
const NEW_ACCESS_TOKEN = "xero-new-access-token-secret";
const NEW_REFRESH_TOKEN = "xero-new-refresh-token-secret";
const SUBJECT = "validated-xero-subject";

interface Query {
  text: string;
  values: unknown[];
}

type Response =
  | readonly object[]
  | Error
  | ((query: Query) => readonly object[] | PromiseLike<readonly object[]>);

function fakeSql(
  responses: Response[],
  fenceResponses: Response[] = [],
  sourceGuardResponses: Response[] = [],
  callbackSessionResponses: Response[] = [],
) {
  const queries: Query[] = [];
  const pending = [...responses];
  const pendingFences = [...fenceResponses];
  const pendingSourceGuards = [...sourceGuardResponses];
  const pendingCallbackSessions = [...callbackSessionResponses];
  const invoke = (<Row extends object>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => {
    const query = {
      text: strings.join("?").replace(/\s+/gu, " ").trim(),
      values,
    };
    queries.push(query);
    const isGlobalFence = query.text.includes(
      "accounting_xero_operation_fence",
    );
    const isSourceGuard =
      query.text.includes("from accounting_source_connections") &&
      query.text.includes("provider_disconnect_lock_id is not null");
    const isCallbackSessionGuard =
      query.text.startsWith("select u.id from users u join sessions") &&
      !query.text.includes("xero_lifecycle_generation");
    const response = isGlobalFence
      ? pendingFences.length > 0
        ? pendingFences.shift()
        : query.text.startsWith("select operation_id")
          ? [{ operation_id: null }]
          : [{ singleton: true }]
      : isSourceGuard
        ? pendingSourceGuards.length > 0
          ? pendingSourceGuards.shift()
          : Array.isArray(pending[0]) && pending[0].length === 0
            ? pending.shift()
            : []
        : isCallbackSessionGuard
          ? pendingCallbackSessions.length > 0
            ? pendingCallbackSessions.shift()
            : [{ id: query.values[0] }]
          : pending.shift();
    if (!response) {
      return Promise.reject(new Error(`No fake response for: ${query.text}`));
    }
    if (response instanceof Error) return Promise.reject(response);
    try {
      const rows = typeof response === "function" ? response(query) : response;
      return Promise.resolve(rows as readonly Row[]);
    } catch (error) {
      return Promise.reject(error);
    }
  }) as unknown as AccountingSql;
  invoke.begin = async <T>(
    operation: (transaction: AccountingTransaction) => Promise<T>,
  ) => await operation(invoke);
  return {
    sql: invoke,
    queries,
    pending,
    pendingFences,
    pendingSourceGuards,
    pendingCallbackSessions,
  };
}

const vault = new AccountingTokenVault({
  activeVersion: 7,
  keys: new Map([[7, "a".repeat(64)]]),
});

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function attemptRow(overrides: Record<string, unknown> = {}) {
  const sealedState = vault.seal(STATE, {
    provider: "xero",
    environment: "production",
    recordType: "oauth-attempt",
    recordId: ATTEMPT,
    field: "oauth-state",
  });
  const sealedNonce = vault.seal(NONCE, {
    provider: "xero",
    environment: "production",
    recordType: "oauth-attempt",
    recordId: ATTEMPT,
    field: "oidc-nonce",
  });
  const sealedVerifier = vault.seal(CODE_VERIFIER, {
    provider: "xero",
    environment: "production",
    recordType: "oauth-attempt",
    recordId: ATTEMPT,
    field: "pkce-code-verifier",
  });
  return {
    id: ATTEMPT,
    user_id: USER,
    session_id: SESSION,
    oauth_state_hash: digest(STATE),
    oauth_state_ciphertext: sealedState.ciphertext,
    oidc_nonce_hash: digest(NONCE),
    oidc_nonce_ciphertext: sealedNonce.ciphertext,
    pkce_verifier_ciphertext: sealedVerifier.ciphertext,
    key_version: 7,
    user_lifecycle_generation: "0",
    requested_scopes: XERO_SCOPE.split(" "),
    expires_at: new Date(NOW.getTime() + 10 * 60_000),
    ...overrides,
  };
}

function tokenRow(
  overrides: Record<string, unknown> = {},
  accessToken = ACCESS_TOKEN,
  refreshToken = REFRESH_TOKEN,
) {
  const access = vault.seal(accessToken, {
    provider: "xero",
    environment: "production",
    recordType: "provider-token-set",
    recordId: AUTHORISATION,
    field: "access-token",
  });
  const refresh = vault.seal(refreshToken, {
    provider: "xero",
    environment: "production",
    recordType: "provider-token-set",
    recordId: AUTHORISATION,
    field: "refresh-token",
  });
  return {
    authorisation_id: AUTHORISATION,
    user_id: USER,
    access_token_ciphertext: access.ciphertext,
    refresh_token_ciphertext: refresh.ciphertext,
    key_version: 7,
    access_expires_at: new Date(NOW.getTime() + 20 * 60_000),
    refresh_expires_at: new Date(NOW.getTime() + 50 * 24 * 60 * 60_000),
    token_generation: "1",
    authorisation_generation: "1",
    refresh_lock_id: null,
    refresh_lock_expires_at: null,
    refresh_lock_active: false,
    revocation_confirmed_at: null,
    revocation_lock_id: null,
    revocation_lock_expires_at: null,
    ...overrides,
  };
}

function initialTokens(
  overrides: Partial<XeroInitialTokenSet> = {},
): XeroInitialTokenSet {
  return {
    accessToken: ACCESS_TOKEN,
    refreshToken: REFRESH_TOKEN,
    expiresInSeconds: 1_800,
    scope: XERO_SCOPE,
    subject: SUBJECT,
    idToken: "verified-id-token",
    ...overrides,
  };
}

function refreshedTokens(
  overrides: Partial<XeroTokenSet> = {},
): XeroTokenSet {
  return {
    accessToken: NEW_ACCESS_TOKEN,
    refreshToken: NEW_REFRESH_TOKEN,
    expiresInSeconds: 1_800,
    scope: XERO_SCOPE,
    ...overrides,
  };
}

function fakeClient(overrides: Partial<XeroOidcClient> = {}): XeroOidcClient {
  return {
    beginAuthorization: vi.fn(async () => ({
      authorizationUrl: `https://login.xero.com/identity/connect/authorize?state=${STATE}`,
      codeVerifier: CODE_VERIFIER,
      state: STATE,
      nonce: NONCE,
    })),
    completeAuthorization: vi.fn(async () => initialTokens()),
    refresh: vi.fn(async () => refreshedTokens()),
    revoke: vi.fn(async () => undefined),
    listConnections: vi.fn(async () => []),
    getOrganisation: vi.fn(async () => {
      throw new Error("No fake Xero organisation");
    }),
    disconnectConnection: vi.fn(async () => undefined),
    ...overrides,
  };
}

function service(
  database: AccountingSql,
  client: XeroOidcClient,
  options: {
    ids?: string[];
    pilotUserIds?: ReadonlySet<string>;
    allowedNonDemoTenantIds?: ReadonlySet<string>;
    providerNetworkEnabled?: boolean | (() => boolean);
    tokenVault?: AccountingTokenVault;
  } = {},
) {
  const ids = [...(options.ids ?? [CALLBACK_OPERATION])];
  return new XeroFoundationService({
    database,
    client,
    vault: options.tokenVault ?? vault,
    callbackUri: CALLBACK_URI,
    pilotUserIds: options.pilotUserIds ?? new Set([USER]),
    allowedNonDemoTenantIds:
      options.allowedNonDemoTenantIds ?? new Set<string>(),
    providerNetworkEnabled: options.providerNetworkEnabled ?? true,
    now: () => new Date(NOW.getTime()),
    newId: () => {
      const id = ids.shift();
      if (!id) throw new Error("The test did not provide the next UUID");
      return id;
    },
  });
}

function connection(
  tenantId: string,
  connectionId: string,
  tenantType = "ORGANISATION",
): XeroConnection {
  return {
    connectionId,
    authEventId: null,
    tenantId,
    tenantType,
    tenantName: `Tenant ${tenantId}`,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  } as XeroConnection;
}

function organisation(
  organisationId: string,
  options: { demo?: boolean; status?: string; name?: string } = {},
): XeroOrganisation {
  return {
    organisationId,
    name: options.name ?? `Organisation ${organisationId}`,
    countryCode: "GB",
    baseCurrency: "GBP",
    isDemoCompany: options.demo ?? false,
    status: options.status ?? "ACTIVE",
  };
}

function valuesText(queries: readonly Query[]): string {
  return JSON.stringify(queries.map((query) => query.values));
}

function queryWith(queries: readonly Query[], ...fragments: string[]): Query {
  const query = queries.find((candidate) =>
    fragments.every((fragment) => candidate.text.includes(fragment))
  );
  expect(query, `Missing SQL query containing: ${fragments.join(", ")}`)
    .toBeDefined();
  return query!;
}

describe("Xero authorisation foundation", () => {
  it("fails expired work and stores one passkey-session-bound attempt with only hashed or encrypted transaction material", async () => {
    const database = fakeSql([
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
      [],
      [],
      [],
      [{ id: ATTEMPT }],
    ]);
    const client = fakeClient();

    const result = await service(database.sql, client, {
      ids: [ATTEMPT],
    }).startAuthorisation(USER, SESSION);

    expect(result).toEqual({
      provider: "xero",
      authorizationUrl:
        `https://login.xero.com/identity/connect/authorize?state=${STATE}`,
      expiresAt: "2026-08-25T12:10:00.000Z",
    });
    expect(database.queries[0]?.text).toContain(
      "from accounting_xero_operation_fence",
    );
    const accountLock = database.queries[1]!;
    expect(accountLock.text).toContain("join sessions");
    expect(accountLock.text).toContain("for update of u, s");
    expect(accountLock.values).toEqual([USER, SESSION]);
    const expireOldAttempt = database.queries[2]!;
    expect(expireOldAttempt.text).toContain("set status = 'failed'");
    expect(expireOldAttempt.text).toContain(
      "status = 'pending' and expires_at <= clock_timestamp()",
    );
    const unfinished = database.queries[3]!;
    expect(unfinished.text).toContain("status in ('pending', 'exchanging')");
    expect(unfinished.text).toContain("for update");
    const existingAuthorisations = database.queries[4]!;
    expect(existingAuthorisations.text).toContain(
      "status in ('active', 'failed')",
    );
    const providerOperations = database.queries[5]!;
    expect(providerOperations.text).toContain("ts.refresh_lock_id is not null");
    expect(providerOperations.text).toContain("ts.revocation_lock_id is not null");
    expect(database.queries[6]?.text).toContain(
      "provider_disconnect_lock_id is not null",
    );
    const insert = database.queries[7]!;
    expect(insert.text).toContain("insert into accounting_oauth_attempts");
    expect(insert.values).toEqual([
      ATTEMPT,
      USER,
      SESSION,
      digest(STATE),
      expect.stringMatching(/^atsv1\./u),
      digest(NONCE),
      expect.stringMatching(/^atsv1\./u),
      expect.stringMatching(/^atsv1\./u),
      7,
      "0",
      XERO_SCOPE.split(" "),
      new Date("2026-08-25T12:10:00.000Z"),
    ]);
    expect(valuesText(database.queries)).not.toContain(STATE);
    expect(valuesText(database.queries)).not.toContain(NONCE);
    expect(valuesText(database.queries)).not.toContain(CODE_VERIFIER);
    expect(
      vault.open(
        { ciphertext: insert.values[4] as string, keyVersion: 7 },
        {
          provider: "xero",
          environment: "production",
          recordType: "oauth-attempt",
          recordId: ATTEMPT,
          field: "oauth-state",
        },
      ),
    ).toBe(STATE);
    expect(
      vault.open(
        { ciphertext: insert.values[6] as string, keyVersion: 7 },
        {
          provider: "xero",
          environment: "production",
          recordType: "oauth-attempt",
          recordId: ATTEMPT,
          field: "oidc-nonce",
        },
      ),
    ).toBe(NONCE);
    expect(
      vault.open(
        { ciphertext: insert.values[7] as string, keyVersion: 7 },
        {
          provider: "xero",
          environment: "production",
          recordType: "oauth-attempt",
          recordId: ATTEMPT,
          field: "pkce-code-verifier",
        },
      ),
    ).toBe(CODE_VERIFIER);
  });

  it("refuses a second authorisation while any pending or exchanging attempt exists", async () => {
    const database = fakeSql([
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{ id: ATTEMPT }],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [ATTEMPT] })
        .startAuthorisation(USER, SESSION),
    ).rejects.toMatchObject({
      code: "xero_authorisation_in_progress",
      status: 409,
    });

    expect(database.queries[2]?.text).toContain(
      "expires_at <= clock_timestamp()",
    );
    expect(database.queries[3]?.text).toContain(
      "status in ('pending', 'exchanging')",
    );
    expect(
      database.queries.some((query) =>
        query.text.startsWith("insert into accounting_oauth_attempts"),
      ),
    ).toBe(false);
    expect(database.pending).toHaveLength(0);
  });

  it("refuses start while the global Xero provider-operation fence is held", async () => {
    const database = fakeSql([], [[{
      operation_id: SOURCE_DISCONNECT_LOCK,
    }]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [ATTEMPT] })
        .startAuthorisation(USER, SESSION),
    ).rejects.toMatchObject({
      code: "xero_global_operation_busy",
      status: 409,
    });

    expect(database.queries).toHaveLength(1);
    expect(database.queries[0]?.text).toContain("for update");
    expect(database.queries[0]?.values).toEqual([]);
    expect(database.queries.some((query) =>
      query.text.includes("insert into accounting_oauth_attempts")
    )).toBe(false);
  });

  it("refuses start while an organisation disconnect lock is present", async () => {
    const database = fakeSql([
      [{ id: USER, xero_lifecycle_generation: "4" }],
      [],
      [],
      [],
      [],
    ], [], [[{ id: SOURCE }]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [ATTEMPT] })
        .startAuthorisation(USER, SESSION),
    ).rejects.toMatchObject({
      code: "xero_provider_operation_busy",
      status: 409,
    });

    expect(queryWith(
      database.queries,
      "provider_disconnect_lock_id is not null",
      "for update of sc",
    )).toBeDefined();
    expect(database.queries.some((query) =>
      query.text.includes("insert into accounting_oauth_attempts")
    )).toBe(false);
  });

  it.each([
    { status: "active", code: "xero_authorisation_active" },
    { status: "failed", code: "xero_identity_quarantined" },
  ])(
    "does not insert an OAuth attempt while a $status Xero authorisation exists",
    async ({ status, code }) => {
      const database = fakeSql([
        [{ id: USER, xero_lifecycle_generation: "4" }],
        [],
        [],
        [{ id: AUTHORISATION, status }],
      ]);
      const client = fakeClient();

      await expect(
        service(database.sql, client, { ids: [ATTEMPT] })
          .startAuthorisation(USER, SESSION),
      ).rejects.toMatchObject({ code, status: 409 });

      expect(database.queries[4]?.text).toContain(
        "status in ('active', 'failed')",
      );
      expect(
        database.queries.some((query) =>
          query.text.startsWith("insert into accounting_oauth_attempts")
        ),
      ).toBe(false);
      expect(database.pending).toHaveLength(0);
    },
  );

  it("does not take over an expired but non-null provider-operation lock at start", async () => {
    const database = fakeSql([
      [{ id: USER, xero_lifecycle_generation: "4" }],
      [],
      [],
      [],
      [{ authorisation_id: AUTHORISATION }],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [ATTEMPT] })
        .startAuthorisation(USER, SESSION),
    ).rejects.toMatchObject({
      code: "xero_provider_operation_busy",
      status: 409,
    });

    const lockCheck = database.queries[5]!;
    expect(lockCheck.text).toContain("ts.refresh_lock_id is not null");
    expect(lockCheck.text).toContain("ts.revocation_lock_id is not null");
    expect(lockCheck.text).not.toContain("lock_expires_at <=");
    expect(
      database.queries.some((query) =>
        query.text.startsWith("insert into accounting_oauth_attempts")
      ),
    ).toBe(false);
    expect(database.pending).toHaveLength(0);
  });

  it("consumes a callback once for the exact user, session and state, then stores only encrypted tokens", async () => {
    const storedAttempt = attemptRow();
    const database = fakeSql([
      [storedAttempt],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
      [],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
        created_at: NOW,
        updated_at: NOW,
      }],
      [],
      [{ authorisation_id: AUTHORISATION }],
      [{ id: USER }],
      [{ id: ATTEMPT }],
      [],
    ]);
    const client = fakeClient();
    const foundation = service(database.sql, client, {
      ids: [CALLBACK_OPERATION, AUTHORISATION, CALLBACK_OPERATION],
    });
    const callbackSearch = `?code=provider-code&state=${STATE}`;

    const result = await foundation.completeAuthorisation(
      USER,
      SESSION,
      callbackSearch,
    );

    expect(result).toMatchObject({
      authorisation: {
        id: AUTHORISATION,
        provider: "xero",
        environment: "production",
        status: "active",
        grantedScopes: XERO_SCOPE.split(" "),
        synthetic: false,
      },
    });
    expect(vi.mocked(client.completeAuthorization)).toHaveBeenCalledWith({
      callbackUrl: new URL(`${CALLBACK_URI}${callbackSearch}`),
      codeVerifier: CODE_VERIFIER,
      expectedState: STATE,
      expectedNonce: NONCE,
    });
    expect(
      vault.open(
        {
          ciphertext: storedAttempt.oauth_state_ciphertext,
          keyVersion: storedAttempt.key_version,
        },
        {
          provider: "xero",
          environment: "production",
          recordType: "oauth-attempt",
          recordId: ATTEMPT,
          field: "oauth-state",
        },
      ),
    ).toBe(vi.mocked(client.completeAuthorization).mock.calls[0]![0].expectedState);
    const acquireCallbackFence = database.queries[0]!;
    expect(acquireCallbackFence.text).toContain(
      "update accounting_xero_operation_fence",
    );
    expect(acquireCallbackFence.values.slice(0, 2)).toEqual([
      CALLBACK_OPERATION,
      "callback-exchange",
    ]);
    const callbackSession = database.queries[1]!;
    expect(callbackSession.text).toContain("join sessions");
    expect(callbackSession.text).toContain("for update of u, s");
    expect(callbackSession.values).toEqual([USER, SESSION]);
    const consume = database.queries[2]!;
    expect(consume.text).toContain("set status = 'exchanging'");
    expect(consume.text).toContain("and user_id = ?");
    expect(consume.text).toContain("and session_id = ?");
    expect(consume.text).toContain("and status = 'pending'");
    expect(consume.text).toContain("and expires_at > clock_timestamp()");
    expect(consume.values).toEqual([USER, SESSION, digest(STATE)]);
    expect(queryWith(database.queries, "pg_advisory_xact_lock").values)
      .toEqual([`taxsorted-xero-subject:${SUBJECT}`]);

    const advanceUserLifecycle = queryWith(
      database.queries,
      "update users",
      "xero_lifecycle_generation = xero_lifecycle_generation + 1",
    );
    expect(advanceUserLifecycle.text).toContain(
      "xero_lifecycle_generation = xero_lifecycle_generation + 1",
    );
    expect(advanceUserLifecycle.values).toEqual([USER, "0"]);
    const releasedCallbackFence = queryWith(
      database.queries,
      "set operation_id = null",
    );
    expect(releasedCallbackFence.values).toEqual([CALLBACK_OPERATION]);

    const tokenInsert = database.queries.find((query) =>
      query.text.startsWith("insert into accounting_provider_token_sets"),
    )!;
    expect(tokenInsert.values[0]).toBe(AUTHORISATION);
    expect(tokenInsert.values[1]).toMatch(/^atsv1\./u);
    expect(tokenInsert.values[2]).toMatch(/^atsv1\./u);
    expect(valuesText(database.queries)).not.toContain(ACCESS_TOKEN);
    expect(valuesText(database.queries)).not.toContain(REFRESH_TOKEN);
    expect(
      vault.open(
        { ciphertext: tokenInsert.values[1] as string, keyVersion: 7 },
        {
          provider: "xero",
          environment: "production",
          recordType: "provider-token-set",
          recordId: AUTHORISATION,
          field: "access-token",
        },
      ),
    ).toBe(ACCESS_TOKEN);
    expect(
      vault.open(
        { ciphertext: tokenInsert.values[2] as string, keyVersion: 7 },
        {
          provider: "xero",
          environment: "production",
          recordType: "provider-token-set",
          recordId: AUTHORISATION,
          field: "refresh-token",
        },
      ),
    ).toBe(REFRESH_TOKEN);

    await expect(
      foundation.completeAuthorisation(USER, SESSION, callbackSearch),
    ).rejects.toMatchObject({
      code: "xero_callback_expired",
      status: 409,
    });
    expect(vi.mocked(client.completeAuthorization)).toHaveBeenCalledTimes(1);
    expect(database.pending).toHaveLength(0);
  });

  it("quarantines an issued token if the one-time callback attempt disappears before commit", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
      [],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
        created_at: NOW,
        updated_at: NOW,
      }],
      [],
      [{ authorisation_id: AUTHORISATION }],
      [{ id: USER }],
      [],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{ id: AUTHORISATION }],
      [],
      [{ id: USER }],
      [],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, {
        ids: [CALLBACK_OPERATION, AUTHORISATION],
      }).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({
      code: "xero_callback_not_committed",
      status: 503,
    });

    const callbackCommit = queryWith(
      database.queries,
      "update accounting_oauth_attempts",
      "set status = 'completed'",
      "returning id",
      "status = 'exchanging'",
    );
    expect(callbackCommit.values).toEqual([ATTEMPT, USER, SESSION]);
    expect(queryWith(
      database.queries,
      "when status = 'failed' then 0 else 1 end",
    )).toBeDefined();
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(queryWith(database.queries, "set operation_id = null").values)
      .toEqual([CALLBACK_OPERATION]);
    expect(database.pending).toHaveLength(0);
  });

  it("quarantines issued callback tokens rather than persisting across a source disconnect lock", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
      [],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
      [{ id: QUARANTINED_AUTHORISATION }],
      [],
      [{ id: USER }],
      [],
      [],
    ], [], [[{ id: SOURCE }]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({
      code: "xero_provider_operation_busy",
      status: 409,
    });

    expect(queryWith(
      database.queries,
      "provider_disconnect_lock_id is not null",
      "for update",
    )).toBeDefined();
    expect(database.queries.some((query) =>
      query.text.startsWith("insert into accounting_provider_token_sets") ||
      (query.text.startsWith("insert into accounting_authorisations") &&
        query.text.includes("'active'"))
    )).toBe(false);
    expect(queryWith(
      database.queries,
      "insert into accounting_authorisations",
      "'failed'",
    )).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(queryWith(database.queries, "set operation_id = null").values)
      .toEqual([CALLBACK_OPERATION]);
    expect(database.pending).toHaveLength(0);
  });

  it("does not exchange a callback belonging to another passkey session", async () => {
    const database = fakeSql([[]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        OTHER_SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({ code: "xero_callback_expired", status: 409 });

    expect(database.queries[1]?.text).toContain("join sessions");
    expect(database.queries[2]?.values).toEqual([
      USER,
      OTHER_SESSION,
      digest(STATE),
    ]);
    expect(vi.mocked(client.completeAuthorization)).not.toHaveBeenCalled();
  });

  it("rolls back callback acquisition if the passkey session disappeared before exchange", async () => {
    const database = fakeSql([], [], [], [[]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({
      code: "passkey_session_changed",
      status: 403,
    });

    expect(database.queries).toHaveLength(2);
    expect(database.queries[0]?.text).toContain(
      "update accounting_xero_operation_fence",
    );
    expect(database.queries[1]?.text).toContain("join sessions");
    expect(database.queries[1]?.text).toContain("for update of u, s");
    expect(database.queries.some((query) =>
      query.text.includes("set status = 'exchanging'") ||
      query.text.includes("set operation_id = null")
    )).toBe(false);
    expect(vi.mocked(client.completeAuthorization)).not.toHaveBeenCalled();
  });

  it("keeps a delayed non-denial exchange failure fenced as an unknown provider outcome", async () => {
    const database = fakeSql([[attemptRow()]]);
    let rejectDelayedExchange!: (reason?: unknown) => void;
    const delayedExchange = new Promise<XeroInitialTokenSet>((_resolve, reject) => {
      rejectDelayedExchange = reject;
    });
    const client = fakeClient({
      completeAuthorization: vi.fn(() => delayedExchange),
    });

    const completion = service(database.sql, client).completeAuthorisation(
      USER,
      SESSION,
      `?code=provider-code&state=${STATE}`,
    );
    const outcome = completion.then(
      () => undefined,
      (error: unknown) => error,
    );
    await vi.waitFor(() => {
      expect(vi.mocked(client.completeAuthorization)).toHaveBeenCalledTimes(1);
    });
    expect(database.queries).toHaveLength(3);
    expect(database.queries[2]?.text).toContain("set status = 'exchanging'");

    // A transport failure can arrive after Xero has begun exchanging the
    // code, so the one-time row remains the durable schedule fence.
    rejectDelayedExchange(new Error("The delayed exchange connection closed"));
    await expect(outcome).resolves.toMatchObject({
      code: "xero_authorisation_outcome_unknown",
      status: 503,
    });

    expect(database.queries).toHaveLength(3);
    expect(
      database.queries.some((query) =>
        query.text.includes("set operation_id = null")
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("finishes only an explicit provider denial as denied", async () => {
    const database = fakeSql([
      [attemptRow()],
      [],
    ]);
    const client = fakeClient({
      completeAuthorization: vi.fn(async () => {
        throw new Error("The user denied Xero access");
      }),
    });

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?error=access_denied&state=${STATE}`,
      ),
    ).rejects.toMatchObject({
      code: "xero_authorisation_denied",
      status: 409,
    });

    expect(database.queries).toHaveLength(5);
    expect(database.queries[3]?.values).toEqual(["denied", ATTEMPT]);
    expect(database.queries[4]?.text).toContain("set operation_id = null");
    expect(database.pending).toHaveLength(0);
  });

  it("fails a consumed attempt before provider exchange if the encrypted nonce was substituted", async () => {
    const database = fakeSql([
      [attemptRow({ oidc_nonce_hash: digest(OTHER_NONCE) })],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({ code: "xero_callback_invalid", status: 409 });

    expect(vi.mocked(client.completeAuthorization)).not.toHaveBeenCalled();
    expect(database.queries[3]?.text).toContain("set status = ?");
    expect(database.queries[3]?.values).toContain("failed");
  });

  it("fails a consumed attempt before provider exchange if encrypted OAuth state was substituted", async () => {
    const substitutedState = vault.seal(
      "substituted_state_abcdefghijklmnopqrstuvwxyz0123456789",
      {
        provider: "xero",
        environment: "production",
        recordType: "oauth-attempt",
        recordId: ATTEMPT,
        field: "oauth-state",
      },
    );
    const database = fakeSql([
      [attemptRow({ oauth_state_ciphertext: substitutedState.ciphertext })],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({ code: "xero_callback_invalid", status: 409 });

    expect(vi.mocked(client.completeAuthorization)).not.toHaveBeenCalled();
    expect(database.queries[3]?.values).toEqual(["failed", ATTEMPT]);
  });

  it("finishes a consumed attempt safely when encrypted transaction material cannot be opened", async () => {
    const database = fakeSql([
      [attemptRow({ oauth_state_ciphertext: "atsv1.damaged" })],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({
      code: "xero_callback_unavailable",
      status: 503,
    });

    expect(database.queries[2]?.text).toContain("set status = 'exchanging'");
    expect(database.queries[3]?.text).toContain("set status = ?");
    expect(database.queries[3]?.values).toEqual(["failed", ATTEMPT]);
    expect(database.queries[4]?.text).toContain("set operation_id = null");
    expect(vi.mocked(client.completeAuthorization)).not.toHaveBeenCalled();
  });

  it("requires the validated subject and revokes new provider tokens on an identity conflict", async () => {
    const otherSubject = "different-validated-xero-subject";
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
      [{ id: QUARANTINED_AUTHORISATION }],
      [],
      [{ id: USER }],
      [],
    ]);
    const client = fakeClient({
      completeAuthorization: vi.fn(async () =>
        initialTokens({ subject: otherSubject })),
    });

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({ code: "xero_identity_conflict", status: 409 });

    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    const quarantine = queryWith(
      database.queries,
      "insert into accounting_authorisations",
      "'failed'",
    );
    expect(quarantine.values).toContain(otherSubject);
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(
      database.queries.some((query) =>
        query.text.startsWith("insert into accounting_provider_token_sets"),
      ),
    ).toBe(false);
    expect(queryWith(
      database.queries,
      "update accounting_oauth_attempts",
      "status = ?",
    ).values).toEqual(["failed", ATTEMPT]);
  });

  it.each([
    {
      order: "the competing provider exchange finishes after the database owner",
      callbackUser: USER,
      callbackSession: SESSION,
      ownerUser: OTHER_USER,
    },
    {
      order: "an earlier provider exchange persists after the competing database owner",
      callbackUser: OTHER_USER,
      callbackSession: OTHER_SESSION,
      ownerUser: USER,
    },
  ])(
    "fails and pauses both cross-user race orders when $order",
    async ({ callbackUser, callbackSession, ownerUser }) => {
      const database = fakeSql([
        [attemptRow({
          user_id: callbackUser,
          session_id: callbackSession,
        })],
        [{ id: callbackUser, xero_lifecycle_generation: "0" }],
        [],
        [{
          id: AUTHORISATION,
          user_id: ownerUser,
          provider_subject_id: SUBJECT,
          status: "active",
        }],
        [],
        [],
        [{ id: ATTEMPT }],
        [{ id: callbackUser, xero_lifecycle_generation: "0" }],
        [],
        [{
          id: AUTHORISATION,
          user_id: ownerUser,
          provider_subject_id: SUBJECT,
          status: "failed",
        }],
        [{ id: AUTHORISATION }],
        [],
        [{ id: callbackUser }],
        [],
        [],
      ]);
      const client = fakeClient();

      await expect(
        service(database.sql, client, {
          pilotUserIds: new Set([USER, OTHER_USER]),
        }).completeAuthorisation(
          callbackUser,
          callbackSession,
          `?code=provider-code&state=${STATE}`,
        ),
      ).rejects.toMatchObject({
        code: "xero_identity_owned_elsewhere",
        status: 409,
      });

      const subjectFence = queryWith(
        database.queries,
        "pg_advisory_xact_lock",
      );
      expect(subjectFence.text).toContain("pg_advisory_xact_lock");
      expect(subjectFence.values).toEqual([
        `taxsorted-xero-subject:${SUBJECT}`,
      ]);
      const failOwner = queryWith(
        database.queries,
        "update accounting_authorisations",
        "set status = 'failed'",
        "lifecycle_generation = lifecycle_generation + 1",
      );
      expect(failOwner.text).toContain("set status = 'failed'");
      expect(failOwner.text).toContain(
        "lifecycle_generation = lifecycle_generation + 1",
      );
      expect(failOwner.values).toEqual([AUTHORISATION]);
      expect(database.queries.filter((query) =>
        query.text.includes("pg_advisory_xact_lock")
      )).toHaveLength(2);
      expect(database.queries.filter((query) =>
        query.text.includes("set status = 'paused'")
      ).length).toBeGreaterThanOrEqual(2);
      expect(queryWith(
        database.queries,
        "when status = 'failed' then 0 else 1 end",
      )).toBeDefined();
      expect(queryWith(
        database.queries,
        "update users",
        "xero_lifecycle_generation = xero_lifecycle_generation + 1",
      )).toBeDefined();
      expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
      expect(
        database.queries.some((query) =>
          query.text.startsWith("insert into accounting_provider_token_sets")
        ),
      ).toBe(false);
      expect(database.pending).toHaveLength(0);
    },
  );

  it("does not schedule a cross-user callback revoke when quarantine confirmation is unknown", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: OTHER_USER,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [],
      [],
      [{ id: ATTEMPT }],
      new Error("The independent quarantine transaction did not commit"),
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, {
        pilotUserIds: new Set([USER, OTHER_USER]),
      }).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({
      code: "xero_identity_owned_elsewhere",
      status: 409,
    });

    expect(queryWith(
      database.queries,
      "update accounting_authorisations",
      "set status = 'failed'",
    )).toBeDefined();
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(queryWith(
      database.queries,
      "select id, xero_lifecycle_generation",
    )).toBeDefined();
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.queries.some((query) =>
      query.text.includes("set operation_id = null")
    )).toBe(false);
    expect(database.pending).toHaveLength(0);
  });

  it("keeps a same-owner failed subject permanently quarantined", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "failed",
      }],
      [{ id: ATTEMPT }],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "failed",
      }],
      [{ id: AUTHORISATION }],
      [],
      [{ id: USER }],
      [],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({
      code: "xero_identity_quarantined",
      status: 409,
    });

    const ownerLookup = queryWith(
      database.queries,
      "select id, user_id, provider_subject_id, status",
      "provider_subject_id = ?",
    );
    expect(ownerLookup.text).toContain("provider_subject_id = ?");
    expect(ownerLookup.text).not.toContain("user_id = ?");
    expect(queryWith(
      database.queries,
      "update accounting_oauth_attempts",
      "status = 'failed'",
    )).toBeDefined();
    const quarantine = queryWith(
      database.queries,
      "when status = 'failed' then 0 else 1 end",
    );
    expect(quarantine.text).toContain("set status = 'failed'");
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(
      database.queries.some((query) =>
        query.text.startsWith("insert into accounting_authorisations")
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(database.pending).toHaveLength(0);
  });

  it("does not revoke provider tokens from a callback fenced by a newer user lifecycle", async () => {
    const database = fakeSql([
      [attemptRow({ user_lifecycle_generation: "0" })],
      [{ id: USER, xero_lifecycle_generation: "1" }],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({
      code: "xero_callback_superseded",
      status: 409,
    });

    expect(database.queries).toHaveLength(6);
    expect(database.queries[4]?.text).toContain("xero_lifecycle_generation");
    expect(
      database.queries.some((query) =>
        query.text.includes("pg_advisory_xact_lock")
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.queries.some((query) =>
      query.text.includes("set operation_id = null")
    )).toBe(false);
    expect(database.pending).toHaveLength(0);
  });

  it("independently quarantines and pauses a same-owner subject after token sealing fails", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{ id: AUTHORISATION }],
      [],
      [{ id: USER }],
      [],
      [],
    ]);
    const failingVault = new AccountingTokenVault({
      activeVersion: 7,
      keys: new Map([[7, "a".repeat(64)]]),
    });
    const workingSeal = failingVault.seal.bind(failingVault);
    vi.spyOn(failingVault, "seal").mockImplementation((plaintext, context) => {
      if (plaintext === ACCESS_TOKEN) {
        throw new Error("Initial access token sealing failed");
      }
      return workingSeal(plaintext, context);
    });
    const client = fakeClient();

    await expect(
      service(database.sql, client, { tokenVault: failingVault })
        .completeAuthorisation(
          USER,
          SESSION,
          `?code=provider-code&state=${STATE}`,
        ),
    ).rejects.toMatchObject({
      code: "xero_authorisation_not_saved",
      status: 503,
    });

    expect(queryWith(
      database.queries,
      "from accounting_provider_token_sets",
      "for update",
    )).toBeDefined();
    const quarantine = queryWith(
      database.queries,
      "when status = 'failed' then 0 else 1 end",
    );
    expect(quarantine.text).toContain("set status = 'failed'");
    expect(quarantine.text).toContain(
      "when status = 'failed' then 0 else 1 end",
    );
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(queryWith(
      database.queries,
      "update users",
      "xero_lifecycle_generation = xero_lifecycle_generation + 1",
    )).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(database.pending).toHaveLength(0);
  });

  it("quarantines after the late token-upsert compare-and-swap loses custody", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [],
      [],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{ id: AUTHORISATION }],
      [],
      [{ id: USER }],
      [],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({ code: "xero_tokens_not_saved", status: 503 });

    const tokenCas = queryWith(
      database.queries,
      "insert into accounting_provider_token_sets",
    );
    expect(tokenCas.text).toContain("insert into accounting_provider_token_sets");
    expect(tokenCas.text).toContain(
      "accounting_provider_token_sets.refresh_lock_id is null",
    );
    expect(tokenCas.text).toContain(
      "accounting_provider_token_sets.revocation_lock_id is null",
    );
    expect(queryWith(
      database.queries,
      "when status = 'failed' then 0 else 1 end",
    )).toBeDefined();
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(database.pending).toHaveLength(0);
  });

  it("does not quarantine or revoke when failure cleanup sees a newer user lifecycle", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [],
      [{ id: USER, xero_lifecycle_generation: "1" }],
      [],
    ]);
    const failingVault = new AccountingTokenVault({
      activeVersion: 7,
      keys: new Map([[7, "a".repeat(64)]]),
    });
    const workingSeal = failingVault.seal.bind(failingVault);
    vi.spyOn(failingVault, "seal").mockImplementation((plaintext, context) => {
      if (plaintext === ACCESS_TOKEN) {
        throw new Error("Initial access token sealing failed late");
      }
      return workingSeal(plaintext, context);
    });
    const client = fakeClient();

    await expect(
      service(database.sql, client, { tokenVault: failingVault })
        .completeAuthorisation(
          USER,
          SESSION,
          `?code=provider-code&state=${STATE}`,
        ),
    ).rejects.toMatchObject({
      code: "xero_authorisation_not_saved",
      status: 503,
    });

    expect(
      database.queries.filter((query) =>
        query.text.includes("pg_advisory_xact_lock")
      ),
    ).toHaveLength(1);
    expect(
      database.queries.some((query) =>
        query.text.includes("set status = 'failed'") ||
        query.text.includes("set status = 'paused'") ||
        query.text.includes(
          "xero_lifecycle_generation = xero_lifecycle_generation + 1",
        )
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("keeps the attempt exchanging when the quarantine transaction itself fails", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
      }],
      [],
      new Error("Quarantine database transaction failed"),
    ]);
    const failingVault = new AccountingTokenVault({
      activeVersion: 7,
      keys: new Map([[7, "a".repeat(64)]]),
    });
    const workingSeal = failingVault.seal.bind(failingVault);
    vi.spyOn(failingVault, "seal").mockImplementation((plaintext, context) => {
      if (plaintext === ACCESS_TOKEN) {
        throw new Error("Initial access token sealing failed");
      }
      return workingSeal(plaintext, context);
    });
    const client = fakeClient();

    await expect(
      service(database.sql, client, { tokenVault: failingVault })
        .completeAuthorisation(
          USER,
          SESSION,
          `?code=provider-code&state=${STATE}`,
        ),
    ).rejects.toMatchObject({
      code: "xero_authorisation_not_saved",
      status: 503,
    });

    expect(database.queries).toHaveLength(13);
    expect(database.queries[2]?.text).toContain("set status = 'exchanging'");
    expect(database.queries[12]?.text).toContain(
      "select id, xero_lifecycle_generation",
    );
    expect(
      database.queries.filter((query) =>
        query.text.includes("update accounting_oauth_attempts")
      ),
    ).toHaveLength(1);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("never persists an initial token set without its validated OpenID subject", async () => {
    const database = fakeSql([
      [attemptRow()],
    ]);
    const client = fakeClient({
      completeAuthorization: vi.fn(async () => ({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        expiresInSeconds: 1_800,
        scope: XERO_SCOPE,
        idToken: "verified-id-token",
      } as unknown as XeroInitialTokenSet)),
    });

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({ code: "xero_identity_invalid", status: 503 });

    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(
      database.queries.some((query) =>
        query.text.startsWith("insert into accounting_authorisations"),
      ),
    ).toBe(false);
    expect(database.queries).toHaveLength(3);
    expect(database.queries[2]?.text).toContain("set status = 'exchanging'");
  });

  it("rejects reconnect while prior provider cleanup is pending and revokes the newly issued callback token", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "revoked",
      }],
      [],
      [{
        revocation_confirmed_at: null,
        revocation_lock_id: REVOCATION_LOCK,
      }],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "revoked",
      }],
      [{ id: AUTHORISATION }],
      [],
      [{ id: USER }],
      [],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({ code: "xero_cleanup_pending", status: 409 });

    const cleanup = queryWith(
      database.queries,
      "select revocation_confirmed_at, revocation_lock_id",
    );
    expect(cleanup.text).toContain("for update");
    expect(
      database.queries.some((query) =>
        query.text.startsWith("insert into accounting_authorisations"),
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(queryWith(
      database.queries,
      "when status = 'failed' then 0 else 1 end",
    )).toBeDefined();
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(queryWith(
      database.queries,
      "update accounting_oauth_attempts",
      "status = ?",
    ).values).toEqual(["failed", ATTEMPT]);
    expect(database.pending).toHaveLength(0);
  });

  it("allows reconnect only after prior cleanup is confirmed with no revocation lease", async () => {
    const database = fakeSql([
      [attemptRow()],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [{
        id: AUTHORISATION,
        user_id: USER,
        provider_subject_id: SUBJECT,
        status: "revoked",
      }],
      [],
      [{
        revocation_confirmed_at: NOW,
        revocation_lock_id: null,
      }],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "active",
        created_at: NOW,
        updated_at: NOW,
      }],
      [],
      [{ authorisation_id: AUTHORISATION }],
      [{ id: USER }],
      [{ id: ATTEMPT }],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).resolves.toMatchObject({
      authorisation: {
        id: AUTHORISATION,
        provider: "xero",
        status: "active",
      },
    });

    expect(queryWith(
      database.queries,
      "select revocation_confirmed_at, revocation_lock_id",
      "for update",
    )).toBeDefined();
    const tokenSave = queryWith(
      database.queries,
      "insert into accounting_provider_token_sets",
    );
    expect(tokenSave.text).toContain("revocation_confirmed_at = null");
    expect(tokenSave.text).toContain("revocation_lock_id = null");
    expect(tokenSave.text).toContain("revocation_lock_expires_at = null");
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });
});

describe("Xero organisation directory", () => {
  it("offers active demo companies by default and admits a non-demo company only by exact tenant allowlist", async () => {
    const connections = [
      connection(DEMO_TENANT, DEMO_CONNECTION),
      connection(LIVE_TENANT, LIVE_CONNECTION),
      connection(INACTIVE_TENANT, INACTIVE_CONNECTION),
    ];
    const organisations = new Map([
      [DEMO_TENANT, organisation(DEMO_TENANT, { demo: true, name: "Demo Company" })],
      [LIVE_TENANT, organisation(LIVE_TENANT, { name: "Real Company" })],
      [
        INACTIVE_TENANT,
        organisation(INACTIVE_TENANT, {
          demo: true,
          status: "ARCHIVED",
          name: "Old Demo",
        }),
      ],
    ]);
    const client = fakeClient({
      listConnections: vi.fn(async () => connections),
      getOrganisation: vi.fn(async (_accessToken, tenantId) =>
        organisations.get(tenantId)!),
    });
    const defaultDatabase = fakeSql([
      [{ user_id: USER }],
      [tokenRow()],
    ]);

    const defaultOffer = await service(
      defaultDatabase.sql,
      client,
    ).listOrganisations(AUTHORISATION);

    expect(defaultOffer).toEqual([{
      id: DEMO_TENANT,
      name: "Demo Company",
      countryCode: "GB",
      baseCurrency: "GBP",
      datasets: [],
      synthetic: false,
    }]);

    const allowlistedDatabase = fakeSql([
      [{ user_id: USER }],
      [tokenRow()],
    ]);
    const allowlistedOffer = await service(
      allowlistedDatabase.sql,
      client,
      { allowedNonDemoTenantIds: new Set([LIVE_TENANT.toUpperCase()]) },
    ).listOrganisations(AUTHORISATION);

    expect(allowlistedOffer.map((candidate) => candidate.id)).toEqual([
      DEMO_TENANT,
      LIVE_TENANT,
    ]);
    expect(allowlistedOffer.every((candidate) => candidate.datasets.length === 0))
      .toBe(true);
  });

  it("binds a selected tenant to Xero's server-returned connection ID", async () => {
    const database = fakeSql([
      [{ user_id: USER }],
      [tokenRow()],
    ]);
    const client = fakeClient({
      listConnections: vi.fn(async () => [
        connection(DEMO_TENANT, DEMO_CONNECTION),
      ]),
      getOrganisation: vi.fn(async () =>
        organisation(DEMO_TENANT, { demo: true, name: "Demo Company" })),
    });

    const binding = await service(database.sql, client).resolveOrganisation(
      AUTHORISATION,
      DEMO_TENANT,
    );

    expect(binding).toEqual({
      organisation: {
        id: DEMO_TENANT,
        name: "Demo Company",
        countryCode: "GB",
        baseCurrency: "GBP",
        datasets: [],
        synthetic: false,
      },
      providerConnectionId: DEMO_CONNECTION,
    });
    expect(vi.mocked(client.listConnections)).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(vi.mocked(client.getOrganisation)).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      DEMO_TENANT,
    );
  });

  it("is deliberately not a financial page reader", () => {
    const database = fakeSql([]);
    const foundation = service(database.sql, fakeClient()) as unknown as Record<
      string,
      unknown
    >;

    expect(foundation.id).toBe("xero");
    expect(foundation.environment).toBe("production");
    expect(foundation.beginAuthorisation).toBeUndefined();
    expect(foundation.pullPage).toBeUndefined();
  });
});

describe("Xero token lifecycle", () => {
  it("takes a short refresh lease and persists rotating tokens with generation compare-and-swap", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "7",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "1" }],
      [{ authorisation_id: AUTHORISATION }],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => refreshedTokens()),
      listConnections: vi.fn(async () => []),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).resolves.toEqual([]);

    expect(vi.mocked(client.refresh)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(vi.mocked(client.listConnections)).toHaveBeenCalledWith(
      NEW_ACCESS_TOKEN,
    );
    expect(database.queries[3]?.text).toContain("for update of u");
    expect(database.queries[4]?.text).toContain(
      "oa.status in ('pending', 'exchanging')",
    );
    const refreshFence = database.queries[2]!;
    expect(refreshFence.text).toContain("update accounting_xero_operation_fence");
    expect(refreshFence.values.slice(0, 2)).toEqual([
      REFRESH_LOCK,
      "token-refresh",
    ]);
    const lease = database.queries[5]!;
    expect(lease.text).toContain("set refresh_lock_id = ?");
    expect(lease.text).toContain("ts.refresh_lock_id is null");
    expect(lease.text).not.toContain(
      "refresh_lock_expires_at <= clock_timestamp()",
    );
    expect(lease.text).toContain("ts.revocation_requested_at is null");
    expect(lease.text).toContain("ts.revocation_lock_id is null");
    expect(lease.values).toEqual([
      REFRESH_LOCK,
      30,
      AUTHORISATION,
    ]);
    expect(database.queries[6]?.text).toContain(
      "provider_disconnect_lock_id is not null",
    );
    const authorisationLock = database.queries[8]!;
    expect(authorisationLock.text).toContain("select status");
    expect(authorisationLock.text).toContain("for update");
    expect(authorisationLock.values).toEqual([AUTHORISATION]);
    const compareAndSwap = database.queries[9]!;
    expect(compareAndSwap.text).toContain("token_generation = token_generation + 1");
    expect(compareAndSwap.text).toContain("and token_generation = ?");
    expect(compareAndSwap.text).toContain("and refresh_lock_id = ?");
    expect(compareAndSwap.values.slice(-3)).toEqual([
      AUTHORISATION,
      "7",
      REFRESH_LOCK,
    ]);
    expect(database.queries[10]?.text).toContain("set operation_id = null");
    expect(database.queries[10]?.values).toEqual([REFRESH_LOCK]);
    expect(valuesText(database.queries)).not.toContain(REFRESH_TOKEN);
    expect(valuesText(database.queries)).not.toContain(NEW_ACCESS_TOKEN);
    expect(valuesText(database.queries)).not.toContain(NEW_REFRESH_TOKEN);
    expect(
      vault.open(
        { ciphertext: compareAndSwap.values[0] as string, keyVersion: 7 },
        {
          provider: "xero",
          environment: "production",
          recordType: "provider-token-set",
          recordId: AUTHORISATION,
          field: "access-token",
        },
      ),
    ).toBe(NEW_ACCESS_TOKEN);
    expect(
      vault.open(
        { ciphertext: compareAndSwap.values[1] as string, keyVersion: 7 },
        {
          provider: "xero",
          environment: "production",
          recordType: "provider-token-set",
          recordId: AUTHORISATION,
          field: "refresh-token",
        },
      ),
    ).toBe(NEW_REFRESH_TOKEN);
  });

  it("does not take over an expired but non-null refresh lock", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      refresh_lock_id: "abababab-abab-4bab-8bab-abababababab",
      refresh_lock_expires_at: new Date(NOW.getTime() - 60_000),
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({ code: "xero_refresh_busy", status: 409 });

    const lease = queryWith(
      database.queries,
      "set refresh_lock_id = ?",
      "ts.refresh_lock_id is null",
    );
    expect(lease.text).toContain("ts.refresh_lock_id is null");
    expect(lease.text).not.toContain("refresh_lock_expires_at <=");
    expect(vi.mocked(client.refresh)).not.toHaveBeenCalled();
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("does not refresh while an organisation disconnect lock is present", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "18",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
    ], [], [[{ id: SOURCE }]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_provider_operation_busy",
      status: 409,
    });

    const acquire = queryWith(
      database.queries,
      "update accounting_xero_operation_fence",
      "operation_id is null",
    );
    const lease = queryWith(
      database.queries,
      "set refresh_lock_id = ?",
      "ts.refresh_lock_id is null",
    );
    const sourceGuard = queryWith(
      database.queries,
      "provider_disconnect_lock_id is not null",
      "for update",
    );
    expect(database.queries.indexOf(acquire)).toBeLessThan(
      database.queries.indexOf(lease),
    );
    expect(database.queries.indexOf(lease)).toBeLessThan(
      database.queries.indexOf(sourceGuard),
    );
    expect(vi.mocked(client.refresh)).not.toHaveBeenCalled();
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
  });

  it("quarantines and pauses after lost refresh custody even when provider revocation fails", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "4",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "1" }],
      [],
      [{ token_generation: "4", refresh_lock_id: REFRESH_LOCK }],
      [{ id: AUTHORISATION }],
      [],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => refreshedTokens()),
      revoke: vi.fn(async () => {
        throw new Error("Provider revocation timed out");
      }),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_identity_quarantined",
      status: 409,
    });

    expect(queryWith(
      database.queries,
      "set access_token_ciphertext",
      "and token_generation = ?",
    )).toBeDefined();
    expect(queryWith(
      database.queries,
      "select token_generation, refresh_lock_id",
    )).toBeDefined();
    expect(queryWith(
      database.queries,
      "set status = 'failed'",
    )).toBeDefined();
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(NEW_REFRESH_TOKEN);
    expect(database.queries.some((query) =>
      query.text.includes("set operation_id = null")
    )).toBe(false);
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();

    const reconnectDatabase = fakeSql([
      [{ id: USER, xero_lifecycle_generation: "2" }],
      [],
      [],
      [{ id: AUTHORISATION, status: "failed" }],
    ]);
    await expect(
      service(reconnectDatabase.sql, fakeClient(), { ids: [ATTEMPT] })
        .startAuthorisation(USER, SESSION),
    ).rejects.toMatchObject({
      code: "xero_identity_quarantined",
      status: 409,
    });
    expect(
      reconnectDatabase.queries.some((query) =>
        query.text.startsWith("insert into accounting_oauth_attempts")
      ),
    ).toBe(false);
  });

  it("does not save after concurrent local revocation and revokes the newly rotated token", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "5",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "revoked", lifecycle_generation: "1" }],
      [],
      [],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => refreshedTokens()),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_identity_quarantined",
      status: 409,
    });

    expect(
      database.queries.some((query) =>
        query.text.startsWith("update accounting_provider_token_sets") &&
        query.text.includes("set access_token_ciphertext"),
      ),
    ).toBe(false);
    expect(queryWith(database.queries, "set status = 'failed'")).toBeDefined();
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(NEW_REFRESH_TOKEN);
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("does not demote or revoke a rotated token from a stale authorisation lifecycle", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "6",
      authorisation_generation: "1",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "2" }],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => refreshedTokens()),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({ code: "xero_refresh_superseded", status: 409 });

    expect(vi.mocked(client.refresh)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(
      database.queries.some((query) =>
        query.text.includes("set status = 'reauthorisation-required'") ||
        query.text.includes("set status = 'paused'") ||
        query.text.includes("set access_token_ciphertext")
      ),
    ).toBe(false);
    expect(database.pending).toHaveLength(0);
  });

  it("releases the refresh lease, requires reauthorisation and pauses live sources on invalid_grant", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "9",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "1" }],
      [{ authorisation_id: AUTHORISATION }],
      [{ id: AUTHORISATION }],
      [],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => {
        throw new XeroOidcError(
          "invalid_grant",
          "The rotating refresh grant is no longer valid",
        );
      }),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_reauthorisation_required",
      status: 409,
    });

    const releasedLease = queryWith(
      database.queries,
      "set refresh_lock_id = null",
      "returning authorisation_id",
    );
    expect(releasedLease.values).toEqual([
      "invalid_grant",
      AUTHORISATION,
      REFRESH_LOCK,
    ]);
    expect(queryWith(
      database.queries,
      "update accounting_authorisations",
      "set status = ?",
    ).values[0]).toBe("reauthorisation-required");
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(queryWith(database.queries, "set operation_id = null").values)
      .toEqual([REFRESH_LOCK]);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
  });

  it("quarantines an ambiguous refresh outcome while retaining its exact lock", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "17",
      authorisation_generation: "1",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "1" }],
      [{ authorisation_id: AUTHORISATION }],
      [],
      [],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => {
        throw new Error("Xero closed the refresh connection without a result");
      }),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_refresh_outcome_unknown",
      status: 503,
    });

    expect(vi.mocked(client.refresh)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.refresh)).toHaveBeenCalledWith(REFRESH_TOKEN);
    const exactLock = queryWith(
      database.queries,
      "last_refresh_error_code = 'provider_refresh_outcome_unknown'",
    );
    expect(exactLock.text).toContain(
      "last_refresh_error_code = 'provider_refresh_outcome_unknown'",
    );
    expect(exactLock.text).toContain("and refresh_lock_id = ?");
    expect(exactLock.text).not.toContain("refresh_lock_id = null");
    expect(exactLock.values).toEqual([AUTHORISATION, REFRESH_LOCK]);
    const quarantine = queryWith(
      database.queries,
      "update accounting_authorisations",
      "set status = 'failed'",
    );
    expect(quarantine.text).toContain("set status = 'failed'");
    expect(quarantine.text).toContain("and lifecycle_generation = ?");
    expect(quarantine.values).toEqual([AUTHORISATION, "1"]);
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(
      database.queries.some((query) =>
        query.text.includes("set refresh_lock_id = null")
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.queries.some((query) =>
      query.text.includes("set operation_id = null")
    )).toBe(false);
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("does not let a stale invalid_grant pause newer tokens after losing its refresh lease", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "10",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "1" }],
      [],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => {
        throw new XeroOidcError(
          "invalid_grant",
          "This refresh lost its lease before Xero answered",
        );
      }),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_reauthorisation_required",
      status: 409,
    });

    expect(database.queries).toHaveLength(10);
    expect(queryWith(
      database.queries,
      "set refresh_lock_id = null",
      "returning authorisation_id",
    )).toBeDefined();
    expect(
      database.queries.some((query) =>
        query.text.includes("set status = 'reauthorisation-required'") ||
        query.text.includes("set status = 'paused'"),
      ),
    ).toBe(false);
    expect(database.queries.some((query) =>
      query.text.includes("set operation_id = null")
    )).toBe(false);
  });

  it("does not release or demote a newer lifecycle after a stale invalid_grant", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "16",
      authorisation_generation: "1",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "2" }],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => {
        throw new XeroOidcError(
          "invalid_grant",
          "This refresh belongs to the previous lifecycle",
        );
      }),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_reauthorisation_required",
      status: 409,
    });

    expect(database.queries).toHaveLength(9);
    expect(database.queries[8]?.text).toContain("lifecycle_generation");
    expect(
      database.queries.some((query) =>
        query.text.includes("set refresh_lock_id = null") ||
        query.text.includes("set status = 'reauthorisation-required'") ||
        query.text.includes("set status = 'paused'")
      ),
    ).toBe(false);
    expect(database.queries.some((query) =>
      query.text.includes("set operation_id = null")
    )).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("releases its refresh lease when encrypted refresh-token custody cannot be opened", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      refresh_token_ciphertext: "atsv1.damaged",
      token_generation: "11",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "1" }],
      [{ authorisation_id: AUTHORISATION }],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({ code: "xero_token_unavailable", status: 503 });

    const releasedLease = queryWith(
      database.queries,
      "set refresh_lock_id = null",
      "returning authorisation_id",
    );
    expect(releasedLease.values).toEqual([
      "token_decryption_failed",
      AUTHORISATION,
      REFRESH_LOCK,
    ]);
    expect(queryWith(database.queries, "set operation_id = null").values)
      .toEqual([REFRESH_LOCK]);
    expect(vi.mocked(client.refresh)).not.toHaveBeenCalled();
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
  });

  it("pauses the authorisation if a newly rotated refresh token cannot be sealed", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "12",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "1" }],
      [{ authorisation_id: AUTHORISATION }],
      [{ id: AUTHORISATION }],
      [],
    ]);
    const failingVault = new AccountingTokenVault({
      activeVersion: 7,
      keys: new Map([[7, "a".repeat(64)]]),
    });
    const workingSeal = failingVault.seal.bind(failingVault);
    vi.spyOn(failingVault, "seal").mockImplementation((plaintext, context) => {
      if (plaintext === NEW_ACCESS_TOKEN) {
        throw new Error("Simulated custody failure after provider rotation");
      }
      return workingSeal(plaintext, context);
    });
    const client = fakeClient({
      refresh: vi.fn(async () => refreshedTokens()),
    });

    await expect(
      service(database.sql, client, {
        ids: [REFRESH_LOCK],
        tokenVault: failingVault,
      }).listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({ code: "xero_token_unavailable", status: 503 });

    expect(vi.mocked(client.refresh)).toHaveBeenCalledWith(REFRESH_TOKEN);
    const failedLease = queryWith(
      database.queries,
      "set refresh_lock_id = null",
      "returning authorisation_id",
    );
    expect(failedLease.values).toEqual([
      "token_encryption_failed",
      AUTHORISATION,
      REFRESH_LOCK,
    ]);
    expect(queryWith(
      database.queries,
      "update accounting_authorisations",
      "set status = ?",
    ).values[0]).toBe("failed");
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(NEW_REFRESH_TOKEN);
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
  });

  it("closes the rail and revokes the rotated token if token key versions change while sealing", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "14",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      [{ status: "active", lifecycle_generation: "1" }],
      [{ authorisation_id: AUTHORISATION }],
      [{ id: AUTHORISATION }],
      [],
    ]);
    const changingVault = new AccountingTokenVault({
      activeVersion: 7,
      keys: new Map([[7, "a".repeat(64)]]),
    });
    const workingSeal = changingVault.seal.bind(changingVault);
    vi.spyOn(changingVault, "seal").mockImplementation((plaintext, context) => {
      const sealed = workingSeal(plaintext, context);
      return plaintext === NEW_REFRESH_TOKEN
        ? { ...sealed, keyVersion: 8 }
        : sealed;
    });
    const client = fakeClient({
      refresh: vi.fn(async () => refreshedTokens()),
    });

    await expect(
      service(database.sql, client, {
        ids: [REFRESH_LOCK],
        tokenVault: changingVault,
      }).listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({ code: "token_key_changed", status: 503 });

    const failedLease = queryWith(
      database.queries,
      "set refresh_lock_id = null",
      "returning authorisation_id",
    );
    expect(failedLease.values).toEqual([
      "token_key_changed",
      AUTHORISATION,
      REFRESH_LOCK,
    ]);
    expect(queryWith(
      database.queries,
      "update accounting_authorisations",
      "set status = ?",
    ).values[0]).toBe("failed");
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(NEW_REFRESH_TOKEN);
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
  });

  it("best-effort closes the rail and revokes the rotated token after a final save transaction error", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "13",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      new Error("Final refresh transaction failed"),
      [{ status: "active", lifecycle_generation: "1" }],
      [{ authorisation_id: AUTHORISATION }],
      [{ id: AUTHORISATION }],
      [],
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => refreshedTokens()),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_refresh_not_saved",
      status: 503,
    });

    expect(database.queries.filter((query) =>
      query.text.includes("select status, lifecycle_generation")
    )).toHaveLength(2);
    const failedLease = queryWith(
      database.queries,
      "set refresh_lock_id = null",
      "returning authorisation_id",
    );
    expect(failedLease.values).toEqual([
      "token_save_failed",
      AUTHORISATION,
      REFRESH_LOCK,
    ]);
    expect(queryWith(
      database.queries,
      "update accounting_authorisations",
      "set status = ?",
    ).values[0]).toBe("failed");
    expect(queryWith(database.queries, "set status = 'paused'")).toBeDefined();
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(NEW_REFRESH_TOKEN);
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("does not revoke a rotated token when failed cleanup cannot prove lease ownership", async () => {
    const expiredAccess = tokenRow({
      access_expires_at: new Date(NOW.getTime() + 30_000),
      token_generation: "15",
    });
    const database = fakeSql([
      [{ user_id: USER }],
      [expiredAccess],
      [{ id: USER }],
      [],
      [{ ...expiredAccess, refresh_lock_id: REFRESH_LOCK }],
      [],
      new Error("Final refresh transaction failed"),
      new Error("Best-effort local close failed"),
    ]);
    const client = fakeClient({
      refresh: vi.fn(async () => refreshedTokens()),
    });

    await expect(
      service(database.sql, client, { ids: [REFRESH_LOCK] })
        .listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_refresh_not_saved",
      status: 503,
    });

    expect(database.queries.filter((query) =>
      query.text.includes("select status, lifecycle_generation")
    )).toHaveLength(2);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.queries.some((query) =>
      query.text.includes("set operation_id = null")
    )).toBe(false);
    expect(vi.mocked(client.listConnections)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });
});

describe("Xero local-first cleanup", () => {
  it("blocks revocation at the global fence while a source disconnect owns it", async () => {
    const database = fakeSql([], [[]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [REVOCATION_LOCK] })
        .revokeAuthorisation(USER, AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_global_operation_busy",
      status: 409,
    });

    expect(database.queries).toHaveLength(1);
    expect(database.queries[0]?.values.slice(0, 2)).toEqual([
      REVOCATION_LOCK,
      "authorisation-revoke",
    ]);
    expect(database.queries.some((query) =>
      query.text.includes("set status = 'revoked'") ||
      query.text.includes("set status = 'disconnected'") ||
      query.text.includes("revocation_lock_id =")
    )).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
  });

  it("blocks source cleanup before local mutation while revocation owns the global fence", async () => {
    const database = fakeSql([], [[{
      operation_id: REVOCATION_LOCK,
    }]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [SOURCE_DISCONNECT_LOCK] })
        .disconnectSourceConnection(USER, SOURCE),
    ).rejects.toMatchObject({
      code: "xero_global_operation_busy",
      status: 409,
    });

    expect(database.queries).toHaveLength(1);
    expect(database.queries[0]?.text).toContain("for update");
    expect(database.queries.some((query) =>
      query.text.includes("update accounting_sync_replicas") ||
      query.text.includes("update accounting_sync_runs") ||
      query.text.includes("update accounting_source_connections")
    )).toBe(false);
    expect(vi.mocked(client.disconnectConnection)).not.toHaveBeenCalled();
  });

  it.each([
    {
      operation: "a pending callback",
      providerState: {
        authorisation_id: AUTHORISATION,
        status: "active",
        refresh_lock_id: null,
        revocation_requested_at: null,
        revocation_confirmed_at: null,
        revocation_lock_id: null,
      },
      attempts: [{ id: ATTEMPT }],
    },
    {
      operation: "a refresh lock",
      providerState: {
        authorisation_id: AUTHORISATION,
        status: "active",
        refresh_lock_id: REFRESH_LOCK,
        revocation_requested_at: null,
        revocation_confirmed_at: null,
        revocation_lock_id: null,
      },
      attempts: null,
    },
    {
      operation: "a revocation lock",
      providerState: {
        authorisation_id: AUTHORISATION,
        status: "active",
        refresh_lock_id: null,
        revocation_requested_at: NOW,
        revocation_confirmed_at: null,
        revocation_lock_id: REVOCATION_LOCK,
      },
      attempts: null,
    },
  ])(
    "does not acquire a source provider lock across $operation",
    async ({ providerState, attempts }) => {
      const source = {
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "active",
        dirty_generation: "20",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      };
      const responses: Response[] = [
        [{ id: USER }],
        [source],
        [],
        [],
        [],
        [tokenRow()],
        [{ id: USER }],
        [providerState],
      ];
      if (attempts) responses.push(attempts);
      const database = fakeSql(responses);
      const client = fakeClient();

      await expect(
        service(database.sql, client, { ids: [SOURCE_DISCONNECT_LOCK] })
          .disconnectSourceConnection(USER, SOURCE),
      ).rejects.toMatchObject({
        code: "xero_provider_operation_busy",
        status: 409,
      });

      expect(queryWith(
        database.queries,
        "update accounting_xero_operation_fence",
        "operation_id is null",
      ).values[0]).toBe(SOURCE_DISCONNECT_LOCK);
      expect(database.queries.some((query) =>
        query.text.includes("set provider_disconnect_lock_id = ?")
      )).toBe(false);
      expect(vi.mocked(client.disconnectConnection)).not.toHaveBeenCalled();
      expect(database.pending).toHaveLength(0);
    },
  );

  it("rejects revocation before lifecycle mutation when a source cleanup lock remains", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{ id: AUTHORISATION, provider_subject_id: SUBJECT, status: "active" }],
      [tokenRow()],
      [{ id: SOURCE, provider_disconnect_lock_id: SOURCE_DISCONNECT_LOCK }],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, { ids: [REVOCATION_LOCK] })
        .revokeAuthorisation(USER, AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_provider_operation_busy",
      status: 409,
    });

    expect(database.queries.some((query) =>
      query.text.includes(
        "xero_lifecycle_generation = xero_lifecycle_generation + 1",
      ) ||
      query.text.includes("set status = 'revoked'") ||
      query.text.includes("set status = 'disconnected'")
    )).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("retires locally once, retains a timed-out disconnect lock, and suppresses D2", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "active",
        dirty_generation: "4",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      }],
      [],
      [],
      [],
      [tokenRow()],
      [{ id: USER }],
      [{
        authorisation_id: AUTHORISATION,
        status: "active",
        refresh_lock_id: null,
        revocation_requested_at: null,
        revocation_confirmed_at: null,
        revocation_lock_id: null,
      }],
      [],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "5",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "5",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: SOURCE_DISCONNECT_LOCK,
        provider_disconnect_lock_expires_at: new Date(NOW.getTime() + 30_000),
      }],
    ]);
    const client = fakeClient({
      disconnectConnection: vi.fn(async () => {
        expect(database.queries.slice(3, 6).map((query) => query.text)).toEqual([
          expect.stringContaining("update accounting_sync_replicas"),
          expect.stringContaining("update accounting_sync_runs"),
          expect.stringContaining("update accounting_source_connections"),
        ]);
        throw new XeroOidcError(
          "xero_request_failed",
          "Temporary provider failure",
          503,
        );
      }),
    });

    const result = await service(database.sql, client, {
      ids: [SOURCE_DISCONNECT_LOCK],
    })
      .disconnectSourceConnection(USER, SOURCE);

    expect(result).toEqual({
      disconnected: true,
      providerDisconnected: false,
    });
    expect(database.queries[5]?.text).toContain("set status = 'disconnected'");
    expect(database.queries[5]?.text).toContain(
      "dirty_generation = dirty_generation + 1",
    );
    expect(database.queries[3]?.text).toContain(
      "update accounting_sync_replicas",
    );
    expect(database.queries[4]?.text).toContain("update accounting_sync_runs");
    const lease = database.queries[12]!;
    const sourceFence = queryWith(
      database.queries,
      "update accounting_xero_operation_fence",
      "operation_id is null",
    );
    expect(sourceFence.values.slice(0, 2)).toEqual([
      SOURCE_DISCONNECT_LOCK,
      "source-disconnect",
    ]);
    expect(database.queries.indexOf(sourceFence)).toBeLessThan(
      database.queries.indexOf(lease),
    );
    expect(lease.text).toContain("set provider_disconnect_lock_id = ?");
    expect(lease.text).toContain("and provider_disconnect_lock_id is null");
    expect(lease.values).toEqual([
      SOURCE_DISCONNECT_LOCK,
      30,
      SOURCE,
      USER,
      AUTHORISATION,
      "5",
      DEMO_CONNECTION,
    ]);
    expect(vi.mocked(client.disconnectConnection)).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      { connectionId: DEMO_CONNECTION },
    );
    expect(database.queries).toHaveLength(13);
    expect(
      database.queries.some((query) =>
        query.text.includes("provider_disconnect_lock_id = null")
      ),
    ).toBe(false);
    expect(valuesText(database.queries)).not.toContain(ACCESS_TOKEN);

    const retryDatabase = fakeSql([
      [{ id: USER }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "5",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: SOURCE_DISCONNECT_LOCK,
        provider_disconnect_lock_expires_at: new Date(NOW.getTime() - 60_000),
      }],
    ]);
    const retryClient = fakeClient();
    await expect(
      service(retryDatabase.sql, retryClient, {
        ids: [SOURCE_DISCONNECT_LOCK],
      }).disconnectSourceConnection(USER, SOURCE),
    ).rejects.toMatchObject({
      code: "xero_source_cleanup_busy",
      status: 409,
    });
    expect(retryDatabase.queries).toHaveLength(3);
    expect(vi.mocked(retryClient.disconnectConnection)).not.toHaveBeenCalled();
    expect(vi.mocked(retryClient.refresh)).not.toHaveBeenCalled();
  });

  it("treats Xero's already-missing connection as confirmed cleanup", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "active",
        dirty_generation: "7",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      }],
      [],
      [],
      [],
      [tokenRow()],
      [{ id: USER }],
      [{
        authorisation_id: AUTHORISATION,
        status: "active",
        refresh_lock_id: null,
        revocation_requested_at: null,
        revocation_confirmed_at: null,
        revocation_lock_id: null,
      }],
      [],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "8",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "8",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: SOURCE_DISCONNECT_LOCK,
        provider_disconnect_lock_expires_at: new Date(NOW.getTime() + 30_000),
      }],
      [{ id: SOURCE }],
    ]);
    const client = fakeClient({
      disconnectConnection: vi.fn(async () => {
        throw new XeroOidcError(
          "xero_request_failed",
          "Connection does not exist",
          404,
        );
      }),
    });

    await expect(
      service(database.sql, client, {
        ids: [SOURCE_DISCONNECT_LOCK],
      }).disconnectSourceConnection(USER, SOURCE),
    ).resolves.toEqual({
      disconnected: true,
      providerDisconnected: true,
    });
    const confirmation = database.queries.find((query) =>
      query.text.includes("set provider_disconnected_at = coalesce")
    )!;
    expect(confirmation.text).toContain(
      "set provider_disconnected_at = coalesce",
    );
    expect(confirmation.text).toContain(
      "and provider_connection_id = ?",
    );
    expect(confirmation.text).toContain(
      "and dirty_generation = ?",
    );
    expect(confirmation.text).toContain(
      "and provider_disconnect_lock_id = ?",
    );
    expect(confirmation.text).toContain(
      "provider_disconnect_lock_id = null",
    );
    expect(confirmation.values).toEqual([
      SOURCE,
      USER,
      DEMO_CONNECTION,
      "8",
      SOURCE_DISCONNECT_LOCK,
    ]);
    expect(queryWith(database.queries, "set operation_id = null").values)
      .toEqual([SOURCE_DISCONNECT_LOCK]);
  });

  it("returns an already-confirmed disconnect without retiring state or contacting Xero again", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [
      {
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "9",
        provider_disconnected_at: NOW,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      },
    ]]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, {
        ids: [SOURCE_DISCONNECT_LOCK],
      }).disconnectSourceConnection(USER, SOURCE),
    ).resolves.toEqual({
      disconnected: true,
      providerDisconnected: true,
    });

    expect(database.queries).toHaveLength(3);
    expect(
      database.queries.some((query) =>
        query.text.startsWith("update accounting_sync_runs") ||
        query.text.startsWith("update accounting_sync_replicas") ||
        query.text.startsWith("update accounting_source_connections"),
      ),
    ).toBe(false);
    expect(vi.mocked(client.disconnectConnection)).not.toHaveBeenCalled();
    expect(vi.mocked(client.refresh)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("cannot stamp a rebound lifecycle with a stale old-connection provider confirmation", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "active",
        dirty_generation: "10",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      }],
      [],
      [],
      [],
      [tokenRow()],
      [{ id: USER }],
      [{
        authorisation_id: AUTHORISATION,
        status: "active",
        refresh_lock_id: null,
        revocation_requested_at: null,
        revocation_confirmed_at: null,
        revocation_lock_id: null,
      }],
      [],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "11",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "11",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: SOURCE_DISCONNECT_LOCK,
        provider_disconnect_lock_expires_at: new Date(NOW.getTime() + 30_000),
      }],
      [],
    ]);
    const client = fakeClient({
      disconnectConnection: vi.fn(async () => undefined),
    });

    await expect(
      service(database.sql, client, {
        ids: [SOURCE_DISCONNECT_LOCK],
      }).disconnectSourceConnection(USER, SOURCE),
    ).resolves.toEqual({
      disconnected: true,
      providerDisconnected: false,
    });

    expect(vi.mocked(client.disconnectConnection)).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      { connectionId: DEMO_CONNECTION },
    );
    const staleConfirmation = database.queries.find((query) =>
      query.text.includes("set provider_disconnected_at = coalesce")
    )!;
    expect(staleConfirmation.text).toContain(
      "and provider_connection_id = ?",
    );
    expect(staleConfirmation.text).toContain("and dirty_generation = ?");
    expect(staleConfirmation.text).toContain(
      "and provider_disconnect_lock_id = ?",
    );
    expect(staleConfirmation.values).toEqual([
      SOURCE,
      USER,
      DEMO_CONNECTION,
      "11",
      SOURCE_DISCONNECT_LOCK,
    ]);
    expect(staleConfirmation.values).not.toContain(LIVE_CONNECTION);
    // The empty fake response represents a row already rebound to a new
    // connection/generation: the exact old lifecycle CAS updates nothing.
    expect(database.pending).toHaveLength(0);
  });

  it("treats even an expired non-null refresh lock as busy during revocation", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{ id: AUTHORISATION, provider_subject_id: SUBJECT, status: "active" }],
      [tokenRow({
        refresh_lock_id: REFRESH_LOCK,
        refresh_lock_expires_at: new Date(NOW.getTime() - 20_000),
        refresh_lock_active: true,
      })],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).revokeAuthorisation(USER, AUTHORISATION),
    ).rejects.toMatchObject({ code: "xero_refresh_busy", status: 409 });

    expect(database.queries[0]?.text).toContain(
      "update accounting_xero_operation_fence",
    );
    expect(database.queries[1]?.text).toContain(
      "select id from users where id = ? for update",
    );
    expect(database.queries[5]?.text).toContain("refresh_lock_active");
    expect(
      database.queries.some((query) =>
        query.text.includes("set status = 'revoked'") ||
        query.text.includes("set status = 'disconnected'") ||
        query.text.includes("revocation_lock_id ="),
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("rejects revocation while a callback's provider-exchange lease is active", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [],
      [{ id: ATTEMPT }],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).revokeAuthorisation(USER, AUTHORISATION),
    ).rejects.toMatchObject({ code: "xero_callback_busy", status: 409 });

    expect(database.queries[0]?.text).toContain(
      "update accounting_xero_operation_fence",
    );
    expect(database.queries[1]?.text).toContain("for update");
    expect(database.queries[2]?.text).toContain("status = 'pending'");
    expect(database.queries[2]?.text).not.toContain("status = 'exchanging'");
    expect(database.queries[3]?.text).toContain("status = 'exchanging'");
    expect(database.queries[3]?.text).not.toContain("consumed_at >");
    expect(
      database.queries.some((query) =>
        query.text.includes("set status = 'revoked'"),
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("does not let DELETE clear a permanently failed Xero quarantine", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{
        id: AUTHORISATION,
        provider_subject_id: SUBJECT,
        status: "failed",
      }],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).revokeAuthorisation(USER, AUTHORISATION),
    ).rejects.toMatchObject({
      code: "xero_identity_quarantined",
      status: 409,
    });

    expect(database.queries).toHaveLength(5);
    expect(database.queries[4]?.text).toContain("for update");
    expect(
      database.queries.some((query) =>
        query.text.includes("from accounting_provider_token_sets") ||
        query.text.includes("set status = 'revoked'") ||
        query.text.includes("set status = 'disconnected'") ||
        query.text.includes(
          "xero_lifecycle_generation = xero_lifecycle_generation + 1",
        )
      ),
    ).toBe(false);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("cancels a pending callback attempt before revoking local authorisation state", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{ id: AUTHORISATION, provider_subject_id: SUBJECT, status: "active" }],
      [],
      [],
      [{ id: USER }],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client).revokeAuthorisation(USER, AUTHORISATION),
    ).resolves.toEqual({ revoked: true, providerRevoked: false });

    const cancelAttempt = database.queries[2]!;
    expect(cancelAttempt.text).toContain("set status = 'failed'");
    expect(cancelAttempt.text).toContain("status = 'pending'");
    expect(database.queries[7]?.text).toContain(
      "xero_lifecycle_generation = xero_lifecycle_generation + 1",
    );
    expect(database.queries[8]?.text).toContain("set status = 'revoked'");
    expect(database.queries.indexOf(cancelAttempt)).toBeLessThan(
      database.queries.findIndex((query) =>
        query.text.includes("set status = 'revoked'")),
    );
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("suppresses provider cleanup while any non-null revocation lease remains", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{ id: AUTHORISATION, provider_subject_id: SUBJECT, status: "revoked" }],
      [tokenRow({
        revocation_lock_id: "abababab-abab-4bab-8bab-abababababab",
        revocation_lock_expires_at: new Date(NOW.getTime() - 20_000),
      })],
      [],
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, {
        ids: [REVOCATION_LOCK],
      }).revokeAuthorisation(USER, AUTHORISATION),
    ).rejects.toMatchObject({ code: "xero_revoke_busy", status: 409 });

    const leaseAttempt = database.queries[9]!;
    expect(leaseAttempt.text).toContain("revocation_lock_id is null");
    expect(leaseAttempt.text).not.toContain(
      "revocation_lock_expires_at <= clock_timestamp()",
    );
    expect(leaseAttempt.values).toEqual([
      REVOCATION_LOCK,
      30,
      AUTHORISATION,
    ]);
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("retains the revocation lock and encrypted token when provider cleanup is ambiguous", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{ id: AUTHORISATION, provider_subject_id: SUBJECT, status: "active" }],
      [tokenRow()],
      [{ id: SOURCE, provider_disconnect_lock_id: null }],
      [{ id: USER }],
      [],
      [],
      [],
      [],
      [{ authorisation_id: AUTHORISATION }],
    ]);
    const client = fakeClient({
      revoke: vi.fn(async () => {
        expect(database.queries.map((query) => query.text)).toEqual(
          expect.arrayContaining([
            expect.stringContaining("set status = 'revoked'"),
            expect.stringContaining("update accounting_sync_runs"),
            expect.stringContaining("update accounting_sync_replicas"),
            expect.stringContaining("set status = 'disconnected'"),
            expect.stringContaining("set revocation_requested_at"),
          ]),
        );
        throw new Error("Provider revocation endpoint unavailable");
      }),
    });

    const result = await service(database.sql, client, {
      ids: [REVOCATION_LOCK],
    })
      .revokeAuthorisation(USER, AUTHORISATION);

    expect(result).toEqual({ revoked: true, providerRevoked: false });
    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(valuesText(database.queries)).not.toContain(REFRESH_TOKEN);
    const revocationLease = database.queries.find((query) =>
      query.text.includes("set revocation_requested_at") &&
      query.text.includes("revocation_lock_id = ?")
    )!;
    expect(revocationLease.values).toEqual([
      REVOCATION_LOCK,
      30,
      AUTHORISATION,
    ]);
    const revokeFence = queryWith(
      database.queries,
      "update accounting_xero_operation_fence",
      "operation_id is null",
    );
    expect(revokeFence.values.slice(0, 2)).toEqual([
      REVOCATION_LOCK,
      "authorisation-revoke",
    ]);
    expect(database.queries.indexOf(revokeFence)).toBeLessThan(
      database.queries.indexOf(revocationLease),
    );
    expect(database.queries).toHaveLength(13);
    expect(
      database.queries.some((query) =>
        query.text.includes("set revocation_lock_id = null") ||
        query.text.includes("delete from accounting_provider_token_sets")
      ),
    ).toBe(false);
    expect(database.pending).toHaveLength(0);

    const restartDatabase = fakeSql([], [[{
      operation_id: REVOCATION_LOCK,
    }]]);
    await expect(
      service(restartDatabase.sql, fakeClient(), { ids: [ATTEMPT] })
        .startAuthorisation(USER, SESSION),
    ).rejects.toMatchObject({
      code: "xero_global_operation_busy",
      status: 409,
    });
    expect(
      restartDatabase.queries.some((query) =>
        query.text.startsWith("insert into accounting_oauth_attempts")
      ),
    ).toBe(false);
  });

  it("keeps local revocation authoritative when encrypted provider cleanup material is damaged", async () => {
    const damagedToken = tokenRow({
      refresh_token_ciphertext: "atsv1.damaged",
    });
    const database = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{ id: AUTHORISATION, provider_subject_id: SUBJECT, status: "active" }],
      [damagedToken],
      [],
      [{ id: USER }],
      [],
      [{ authorisation_id: AUTHORISATION }],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, {
        ids: [REVOCATION_LOCK],
      }).revokeAuthorisation(USER, AUTHORISATION),
    ).resolves.toEqual({ revoked: true, providerRevoked: false });

    expect(database.queries[8]?.text).toContain("set status = 'revoked'");
    expect(database.queries[9]?.text).toContain("revocation_lock_id = ?");
    expect(database.queries).toHaveLength(10);
    expect(database.queries.at(-1)?.text).not.toContain(
      "revocation_lock_id = null",
    );
    expect(vi.mocked(client.revoke)).not.toHaveBeenCalled();
    expect(database.pending).toHaveLength(0);
  });

  it("confirms provider cleanup only for the exact token generation and revocation lease", async () => {
    const database = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{ id: AUTHORISATION, provider_subject_id: SUBJECT, status: "active" }],
      [tokenRow({ token_generation: "7" })],
      [],
      [{ id: USER }],
      [],
      [{ authorisation_id: AUTHORISATION }],
      [{ status: "revoked" }],
      [{ authorisation_id: AUTHORISATION }],
      [],
    ]);
    const client = fakeClient();

    await expect(
      service(database.sql, client, {
        ids: [REVOCATION_LOCK],
      }).revokeAuthorisation(USER, AUTHORISATION),
    ).resolves.toEqual({ revoked: true, providerRevoked: true });

    expect(vi.mocked(client.revoke)).toHaveBeenCalledWith(REFRESH_TOKEN);
    expect(database.queries[11]?.text).toContain("for update");
    const confirmation = database.queries[12]!;
    expect(confirmation.text).toContain("revocation_confirmed_at = coalesce");
    expect(confirmation.text).toContain("and token_generation = ?");
    expect(confirmation.text).toContain("and revocation_lock_id = ?");
    expect(confirmation.text).toContain(
      "and revocation_requested_at is not null",
    );
    expect(confirmation.values).toEqual([
      AUTHORISATION,
      "7",
      REVOCATION_LOCK,
    ]);
    expect(database.queries[13]?.text).toContain(
      "set provider_disconnected_at = coalesce",
    );
    expect(queryWith(database.queries, "set operation_id = null").values)
      .toEqual([REVOCATION_LOCK]);
    expect(database.pending).toHaveLength(0);
  });

  it("performs local-only disconnect and revocation while provider traffic is stopped and the pilot was removed", async () => {
    const disconnectDatabase = fakeSql([
      [{ id: USER }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "active",
        dirty_generation: "2",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      }],
      [],
      [],
      [],
    ]);
    const disconnectClient = fakeClient();

    await expect(
      service(disconnectDatabase.sql, disconnectClient, {
        ids: [SOURCE_DISCONNECT_LOCK],
        pilotUserIds: new Set(),
        providerNetworkEnabled: false,
      }).disconnectSourceConnection(USER, SOURCE),
    ).resolves.toEqual({ disconnected: true, providerDisconnected: false });

    expect(disconnectDatabase.queries).toHaveLength(6);
    expect(disconnectDatabase.queries[5]?.text).toContain(
      "set status = 'disconnected'",
    );
    expect(vi.mocked(disconnectClient.disconnectConnection)).not.toHaveBeenCalled();
    expect(vi.mocked(disconnectClient.refresh)).not.toHaveBeenCalled();
    expect(
      disconnectDatabase.queries.some((query) =>
        query.text.includes("set provider_disconnect_lock_id")
      ),
    ).toBe(false);

    const retryDisconnectDatabase = fakeSql([
      [{ id: USER }],
      [{
        id: SOURCE,
        authorisation_id: AUTHORISATION,
        provider_connection_id: DEMO_CONNECTION,
        status: "disconnected",
        dirty_generation: "3",
        provider_disconnected_at: null,
        provider_disconnect_lock_id: null,
        provider_disconnect_lock_expires_at: null,
      }],
      [],
      [],
      [],
    ]);
    await expect(
      service(retryDisconnectDatabase.sql, fakeClient(), {
        ids: [SOURCE_DISCONNECT_LOCK],
        pilotUserIds: new Set(),
        providerNetworkEnabled: false,
      }).disconnectSourceConnection(USER, SOURCE),
    ).resolves.toEqual({ disconnected: true, providerDisconnected: false });
    expect(retryDisconnectDatabase.queries).toHaveLength(6);
    expect(
      retryDisconnectDatabase.queries.some((query) =>
        query.text.includes("set provider_disconnect_lock_id")
      ),
    ).toBe(false);

    const revokeDatabase = fakeSql([
      [{ id: USER }],
      [],
      [],
      [{ id: AUTHORISATION, provider_subject_id: SUBJECT, status: "active" }],
      [tokenRow()],
      [],
      [{ id: USER }],
      [],
      [],
    ]);
    const revokeClient = fakeClient();

    await expect(
      service(revokeDatabase.sql, revokeClient, {
        pilotUserIds: new Set(),
        providerNetworkEnabled: false,
      }).revokeAuthorisation(USER, AUTHORISATION),
    ).resolves.toEqual({ revoked: true, providerRevoked: false });

    expect(revokeDatabase.queries[8]?.text).toContain("set status = 'revoked'");
    expect(revokeDatabase.queries[9]?.text).toContain(
      "set revocation_requested_at",
    );
    expect(vi.mocked(revokeClient.revoke)).not.toHaveBeenCalled();
    expect(revokeDatabase.pending).toHaveLength(0);
  });

  it("rejects cleanup of another account's source before mutating local state", async () => {
    const database = fakeSql([[{ id: OTHER_USER }], []]);

    await expect(
      service(database.sql, fakeClient(), { ids: [SOURCE_DISCONNECT_LOCK] })
        .disconnectSourceConnection(OTHER_USER, SOURCE),
    ).rejects.toMatchObject({
      code: "source_connection_not_found",
      status: 404,
    });

    expect(database.queries).toHaveLength(3);
    expect(database.queries[2]?.text).toContain("and sc.user_id = ?");
    expect(database.queries[2]?.values).toEqual([SOURCE, OTHER_USER]);
  });
});

describe("Xero service configuration boundary", () => {
  it("requires the one fixed HTTPS callback door", () => {
    const database = fakeSql([]);
    const base = {
      database: database.sql,
      client: fakeClient(),
      vault,
      allowedNonDemoTenantIds: new Set<string>(),
      pilotUserIds: new Set([USER]),
    };

    expect(() => new XeroFoundationService({
      ...base,
      callbackUri: "http://api.taxsorted.io/v1/accounting/oauth/xero/callback",
    })).toThrow(/fixed HTTPS callback door/iu);
    expect(() => new XeroFoundationService({
      ...base,
      callbackUri: `${CALLBACK_URI}?next=https://example.com`,
    })).toThrow(/fixed HTTPS callback door/iu);
    expect(() => new XeroFoundationService({
      ...base,
      callbackUri: "https://api.taxsorted.io/v1/accounting/oauth/xero/other",
    })).toThrow(/fixed HTTPS callback door/iu);
  });

  it("uses a lazy client once and retries discovery after a failed construction", async () => {
    const database = fakeSql([
      [{ id: USER, xero_lifecycle_generation: "0" }],
      [],
      [],
      [],
      [],
      [],
      [{ id: ATTEMPT }],
    ]);
    const client = fakeClient();
    const factory = vi
      .fn<() => Promise<XeroOidcClient>>()
      .mockRejectedValueOnce(new Error("Discovery temporarily unavailable"))
      .mockResolvedValue(client);
    const ids = [ATTEMPT, ATTEMPT];
    const foundation = new XeroFoundationService({
      database: database.sql,
      client: factory,
      vault,
      callbackUri: CALLBACK_URI,
      pilotUserIds: new Set([USER]),
      allowedNonDemoTenantIds: new Set(),
      now: () => new Date(NOW.getTime()),
      newId: () => ids.shift()!,
    });

    await expect(
      foundation.startAuthorisation(USER, SESSION),
    ).rejects.toThrow("Discovery temporarily unavailable");
    await expect(
      foundation.startAuthorisation(USER, SESSION),
    ).resolves.toMatchObject({ provider: "xero" });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("keeps removed pilot users away from OAuth and organisation provider calls", async () => {
    const startDatabase = fakeSql([]);
    const startClient = fakeClient();
    const removedPilotService = service(startDatabase.sql, startClient, {
      pilotUserIds: new Set(),
    });

    await expect(
      removedPilotService.startAuthorisation(USER, SESSION),
    ).rejects.toMatchObject({ code: "provider_unavailable", status: 404 });
    await expect(
      removedPilotService.completeAuthorisation(
        USER,
        SESSION,
        `?code=provider-code&state=${STATE}`,
      ),
    ).rejects.toMatchObject({ code: "provider_unavailable", status: 404 });
    expect(startDatabase.queries).toHaveLength(0);
    expect(vi.mocked(startClient.beginAuthorization)).not.toHaveBeenCalled();
    expect(vi.mocked(startClient.completeAuthorization)).not.toHaveBeenCalled();

    const directoryDatabase = fakeSql([[{ user_id: USER }]]);
    const directoryClient = fakeClient();
    await expect(
      service(directoryDatabase.sql, directoryClient, {
        pilotUserIds: new Set(),
      }).listOrganisations(AUTHORISATION),
    ).rejects.toMatchObject({ code: "provider_unavailable", status: 404 });
    expect(directoryDatabase.queries).toHaveLength(1);
    expect(directoryDatabase.queries[0]?.text).toContain(
      "from accounting_authorisations",
    );
    expect(vi.mocked(directoryClient.listConnections)).not.toHaveBeenCalled();
    expect(vi.mocked(directoryClient.refresh)).not.toHaveBeenCalled();
  });
});
