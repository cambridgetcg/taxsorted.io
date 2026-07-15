import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  ApiKeyLifecycleError,
  createWorkspaceWithFirstKey,
  inspectApiKey,
  issueApiKey,
  parseZonedRfc3339,
  revokeApiKey,
  rotateApiKey,
  type ApiKeyMode,
  type LifecycleSql,
  type LifecycleTransaction,
} from "../api-key-lifecycle.js";
import { main as manageApiKey } from "../../scripts/manage-api-key.js";
import {
  main as createApiKey,
  parseCreateApiKeyArguments,
} from "../../scripts/create-api-key.js";

const KEY_ID = "11111111-1111-4111-8111-111111111111";
const NEW_KEY_ID = "22222222-2222-4222-8222-222222222222";
const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const DATABASE_NOW = new Date("2026-07-15T12:00:00.000Z");
const CREATED_AT = new Date("2026-07-01T12:00:00.000Z");
const FUTURE_EXPIRY = "2027-07-15T00:00:00Z";

interface RecordedQuery {
  text: string;
  values: unknown[];
}

type Response =
  | readonly object[]
  | ((query: RecordedQuery) => readonly object[]);

class FakeSql implements LifecycleSql {
  readonly queries: RecordedQuery[] = [];
  beginCalls = 0;

  constructor(private readonly responses: Response[]) {}

  async begin<T>(
    operation: (transaction: LifecycleTransaction) => Promise<T>,
  ): Promise<T> {
    this.beginCalls += 1;
    const transaction = (<Row extends object>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      const query = {
        text: strings.join("?").replace(/\s+/gu, " ").trim(),
        values,
      };
      this.queries.push(query);
      const response = this.responses.shift();
      if (!response) throw new Error(`No fake response for: ${query.text}`);
      return Promise.resolve(
        (typeof response === "function" ? response(query) : response) as readonly Row[],
      );
    }) as LifecycleTransaction;
    return await operation(transaction);
  }
}

function material(mode: ApiKeyMode, character = "n") {
  const plaintext = `ts_${mode}_${character.repeat(43)}`;
  return {
    plaintext,
    hash: createHash("sha256").update(plaintext, "utf8").digest("hex"),
    prefix: plaintext.slice(0, 16),
  };
}

function keyRow(overrides: Record<string, unknown> = {}) {
  return {
    key_id: KEY_ID,
    key_name: "primary key",
    key_prefix: "ts_test_aaaaaaaa",
    mode: "test",
    scopes: ["sdlt:calculate"],
    expires_at: new Date("2027-01-01T00:00:00Z"),
    revoked_at: null,
    created_at: CREATED_AT,
    workspace_id: WORKSPACE_ID,
    workspace_name: "North & Co",
    workspace_status: "active",
    database_now: DATABASE_NOW,
    ...overrides,
  };
}

function mutationPrelude(
  source = keyRow(),
  freshNow: Date = DATABASE_NOW,
): Response[] {
  return [
    [{ workspace_id: source.workspace_id }],
    [
      workspaceRow({
        workspace_id: source.workspace_id,
        workspace_name: source.workspace_name,
        workspace_status: source.workspace_status,
        database_now: source.database_now,
      }),
    ],
    [source],
    [{ database_now: freshNow }],
  ];
}

function workspaceRow(overrides: Record<string, unknown> = {}) {
  return {
    workspace_id: WORKSPACE_ID,
    workspace_name: "North & Co",
    workspace_status: "active",
    database_now: DATABASE_NOW,
    ...overrides,
  };
}

function createdKeyRow() {
  return { key_id: NEW_KEY_ID, created_at: DATABASE_NOW };
}

function expectCode(code: string) {
  return expect.objectContaining({
    name: "ApiKeyLifecycleError",
    code,
  });
}

describe("API key lifecycle", () => {
  it("accepts only valid zoned RFC3339 expiry values", () => {
    expect(parseZonedRfc3339("2027-01-02T03:04:05Z").toISOString()).toBe(
      "2027-01-02T03:04:05.000Z",
    );
    expect(parseZonedRfc3339("2027-01-02T04:04:05+01:00").toISOString()).toBe(
      "2027-01-02T03:04:05.000Z",
    );
    for (const invalid of [
      "2027-01-02",
      "2027-02-30T00:00:00Z",
      "2027-01-02T25:00:00Z",
      "2027-01-02T00:00:00",
    ]) {
      expect(() => parseZonedRfc3339(invalid)).toThrow(ApiKeyLifecycleError);
    }
  });

  it("inspects safe, canonical metadata without selecting or returning secrets", async () => {
    const database = new FakeSql([
      [
        keyRow({
          scopes: [
            "tax-expert:assess",
            "sdlt:calculate",
            "sdlt:calculate",
          ],
        }),
      ],
    ]);
    const inspected = await inspectApiKey(database, KEY_ID);

    expect(inspected.key.scopes).toEqual([
      "sdlt:calculate",
      "tax-expert:assess",
    ]);
    expect(inspected.key.status).toBe("active");
    expect(JSON.stringify(inspected)).not.toMatch(/key_hash|plaintext|[0-9a-f]{64}/i);
    expect(database.queries[0]?.text).not.toContain("key_hash");
    expect(database.queries[0]?.values).toEqual([KEY_ID]);
  });

  it("derives expiry from database time rather than the local clock", async () => {
    const database = new FakeSql([
      [keyRow({ expires_at: new Date("2026-07-15T11:59:59Z") })],
    ]);
    expect((await inspectApiKey(database, KEY_ID)).key.status).toBe("expired");
  });

  it.each([
    [[], "key_not_found"],
    [[keyRow(), keyRow()], "key_not_found_not_unique"],
  ])("distinguishes zero and multiple key rows", async (rows, code) => {
    const database = new FakeSql([rows]);
    await expect(inspectApiKey(database, KEY_ID)).rejects.toMatchObject(
      expectCode(code),
    );
  });

  it("rejects terminal control characters and a prefix that disagrees with mode", async () => {
    await expect(
      inspectApiKey(
        new FakeSql([[keyRow({ workspace_name: "Firm\nforged output" })]]),
        KEY_ID,
      ),
    ).rejects.toMatchObject(expectCode("invalid_label"));
    await expect(
      inspectApiKey(
        new FakeSql([[keyRow({ key_prefix: "ts_live_aaaaaaaa" })]]),
        KEY_ID,
      ),
    ).rejects.toMatchObject(expectCode("invalid_stored_prefix"));
  });

  it("creates a workspace with the existing default test scope and a finite expiry", async () => {
    const generated = material("test");
    const database = new FakeSql([
      [{ database_now: DATABASE_NOW }],
      [{ workspace_id: WORKSPACE_ID }],
      [createdKeyRow()],
    ]);
    const result = await createWorkspaceWithFirstKey(
      database,
      {
        workspaceName: "North & Co",
        mode: "test",
        scopes: [],
        expiresAt: FUTURE_EXPIRY,
      },
      () => generated,
    );

    expect(result.plaintext).toBe(generated.plaintext);
    expect(result.metadata.key.scopes).toEqual(["sdlt:calculate"]);
    expect(result.metadata.key.expiresAt).toBe("2027-07-15T00:00:00.000Z");
    const insert = database.queries.find((query) =>
      query.text.startsWith("insert into api_keys"),
    )!;
    expect(insert.values).toContain(generated.hash);
    expect(insert.values).not.toContain(generated.plaintext);
    expect(insert.values).toContainEqual(new Date(FUTURE_EXPIRY));
  });

  it.each([
    ["wrong full format", { ...material("test"), plaintext: "not-a-key" }],
    ["wrong hash", { ...material("test"), hash: "0".repeat(64) }],
    ["wrong prefix", { ...material("test"), prefix: "ts_test_bbbbbbbb" }],
  ])("refuses generated material with %s before any insert", async (_case, generated) => {
    const database = new FakeSql([[{ database_now: DATABASE_NOW }]]);
    await expect(
      createWorkspaceWithFirstKey(
        database,
        {
          workspaceName: "North & Co",
          mode: "test",
          scopes: [],
          expiresAt: FUTURE_EXPIRY,
        },
        () => generated,
      ),
    ).rejects.toMatchObject(expectCode("invalid_key_material"));
    expect(database.queries.some((query) => query.text.startsWith("insert into"))).toBe(false);
  });

  it("rejects overlong operator labels before opening a transaction", async () => {
    const database = new FakeSql([]);
    await expect(
      createWorkspaceWithFirstKey(database, {
        workspaceName: "x".repeat(161),
        mode: "test",
        scopes: [],
        expiresAt: FUTURE_EXPIRY,
      }),
    ).rejects.toMatchObject(expectCode("invalid_label"));
    expect(database.beginCalls).toBe(0);
  });

  it("issues an explicit key to an existing active workspace", async () => {
    const generated = material("live", "l");
    const database = new FakeSql([
      [workspaceRow()],
      [{ database_now: DATABASE_NOW }],
      [createdKeyRow()],
    ]);
    const issued = await issueApiKey(
      database,
      {
        workspaceId: WORKSPACE_ID,
        name: "production calculator",
        mode: "live",
        scopes: ["sdlt:calculate", "sdlt:calculate"],
        expiresAt: FUTURE_EXPIRY,
      },
      () => generated,
    );
    expect(issued.metadata.key).toMatchObject({
      mode: "live",
      scopes: ["sdlt:calculate"],
      name: "production calculator",
    });
    expect(database.queries[0]?.text).toContain("where id = ? for update");
    expect(database.queries[0]?.values).toEqual([WORKSPACE_ID]);
  });

  it.each([
    [[], "workspace_not_found"],
    [[workspaceRow(), workspaceRow()], "workspace_not_found_not_unique"],
  ])("distinguishes zero and multiple workspace rows", async (rows, code) => {
    await expect(
      issueApiKey(new FakeSql([rows]), {
        workspaceId: WORKSPACE_ID,
        mode: "test",
        scopes: ["sdlt:calculate"],
        expiresAt: FUTURE_EXPIRY,
      }),
    ).rejects.toMatchObject(expectCode(code));
  });

  it("does not issue into a suspended workspace", async () => {
    const database = new FakeSql([
      [workspaceRow({ workspace_status: "suspended" })],
    ]);
    await expect(
      issueApiKey(database, {
        workspaceId: WORKSPACE_ID,
        mode: "test",
        scopes: ["sdlt:calculate"],
        expiresAt: FUTURE_EXPIRY,
      }),
    ).rejects.toMatchObject(expectCode("workspace_not_active"));
    expect(database.queries).toHaveLength(1);
  });

  it.each([
    ["2026-07-15T12:00:00Z", "expiry_not_future"],
    ["2027-08-20T12:00:00Z", "expiry_too_distant"],
  ])("checks new expiry against database time (%s)", async (expiresAt, code) => {
    const database = new FakeSql([
      [workspaceRow()],
      [{ database_now: DATABASE_NOW }],
    ]);
    await expect(
      issueApiKey(database, {
        workspaceId: WORKSPACE_ID,
        mode: "test",
        scopes: ["sdlt:calculate"],
        expiresAt,
      }),
    ).rejects.toMatchObject(expectCode(code));
    expect(database.queries).toHaveLength(2);
  });

  it("rotates only by locked UUID, preserves mode/scopes, and leaves the old key active", async () => {
    const generated = material("live", "r");
    const source = keyRow({
      mode: "live",
      key_prefix: "ts_live_aaaaaaaa",
      scopes: ["tax-expert:assess", "sdlt:calculate"],
    });
    const database = new FakeSql([
      ...mutationPrelude(source),
      [createdKeyRow()],
    ]);
    const rotated = await rotateApiKey(
      database,
      { keyId: KEY_ID, expiresAt: FUTURE_EXPIRY },
      () => generated,
    );

    expect(rotated.metadata.workspace.id).toBe(WORKSPACE_ID);
    expect(rotated.metadata.key.mode).toBe("live");
    expect(rotated.metadata.key.scopes).toEqual([
      "sdlt:calculate",
      "tax-expert:assess",
    ]);
    expect(database.queries[0]?.text).toContain("select workspace_id from api_keys where id = ?");
    expect(database.queries[0]?.values).toEqual([KEY_ID]);
    expect(database.queries[1]?.text).toContain("from api_workspaces where id = ? for update");
    expect(database.queries[2]?.text).toContain("where k.id = ? and w.id = ? for update of k");
    expect(database.queries[2]?.values).toEqual([KEY_ID, WORKSPACE_ID]);
    expect(database.queries[3]?.text).toBe("select clock_timestamp() as database_now");
    expect(database.queries[4]?.text).toContain("created_at");
    expect(database.queries[4]?.text).toContain("clock_timestamp()");
    expect(database.queries.some((query) => query.text.startsWith("update api_keys"))).toBe(false);
  });

  it.each([
    [{ revoked_at: new Date("2026-07-10T00:00:00Z") }, "key_revoked"],
    [{ expires_at: new Date("2026-07-15T11:00:00Z") }, "key_expired"],
    [{ workspace_status: "suspended" }, "workspace_not_active"],
  ])("refuses an ineligible rotation source", async (override, code) => {
    const database = new FakeSql(mutationPrelude(keyRow(override)));
    await expect(
      rotateApiKey(database, { keyId: KEY_ID, expiresAt: FUTURE_EXPIRY }),
    ).rejects.toMatchObject(expectCode(code));
    expect(database.queries).toHaveLength(4);
  });

  it("rechecks a rotation source against wall time after a simulated lock wait", async () => {
    const source = keyRow({
      database_now: new Date("2026-07-15T12:00:00Z"),
      expires_at: new Date("2026-07-15T12:05:00Z"),
    });
    const database = new FakeSql(
      mutationPrelude(source, new Date("2026-07-15T12:10:00Z")),
    );
    await expect(
      rotateApiKey(database, { keyId: KEY_ID, expiresAt: FUTURE_EXPIRY }),
    ).rejects.toMatchObject(expectCode("key_expired"));
    expect(database.queries[3]?.text).toContain("clock_timestamp()");
    expect(database.queries).toHaveLength(4);
  });

  it("rechecks an issued key expiry after a simulated workspace-lock wait", async () => {
    const database = new FakeSql([
      [workspaceRow()],
      [{ database_now: new Date("2026-07-15T12:10:00Z") }],
    ]);
    await expect(
      issueApiKey(database, {
        workspaceId: WORKSPACE_ID,
        mode: "test",
        scopes: ["sdlt:calculate"],
        expiresAt: "2026-07-15T12:05:00Z",
      }),
    ).rejects.toMatchObject(expectCode("expiry_not_future"));
    expect(database.queries[1]?.text).toContain("clock_timestamp()");
  });

  it("requires the exact stored prefix before revocation", async () => {
    const database = new FakeSql(mutationPrelude());
    await expect(
      revokeApiKey(database, {
        keyId: KEY_ID,
        confirmPrefix: "ts_test_bbbbbbbb",
      }),
    ).rejects.toMatchObject(expectCode("prefix_mismatch"));
    expect(database.queries).toHaveLength(4);
  });

  it("makes a matching already-revoked retry idempotent", async () => {
    const revokedAt = new Date("2026-07-14T10:00:00Z");
    const database = new FakeSql(mutationPrelude(keyRow({ revoked_at: revokedAt })));
    await expect(
      revokeApiKey(database, {
        keyId: KEY_ID,
        confirmPrefix: "ts_test_aaaaaaaa",
      }),
    ).resolves.toEqual({
      keyId: KEY_ID,
      prefix: "ts_test_aaaaaaaa",
      revokedAt: revokedAt.toISOString(),
      changed: false,
    });
    expect(database.queries).toHaveLength(4);
  });

  it.each([
    ["different-mode replacement", "mode = ?"],
    ["replacement missing a source scope", "scopes @> ?"],
    ["replacement expiring within five minutes", "clock_timestamp() + interval '5 minutes'"],
  ])("refuses the last capability key when only a %s exists", async (_case, clause) => {
    const database = new FakeSql([...mutationPrelude(), []]);
    await expect(
      revokeApiKey(database, {
        keyId: KEY_ID,
        confirmPrefix: "ts_test_aaaaaaaa",
      }),
    ).rejects.toMatchObject(expectCode("last_active_key"));
    expect(database.queries[4]?.text).toContain(clause);
    expect(database.queries[4]?.values).toEqual([
      WORKSPACE_ID,
      KEY_ID,
      "test",
      ["sdlt:calculate"],
    ]);
  });

  it("accepts an active same-mode scope-superset replacement", async () => {
    const revokedAt = new Date("2026-07-15T12:01:00Z");
    const database = new FakeSql([
      ...mutationPrelude(),
      [{ key_id: NEW_KEY_ID }],
      [{ revoked_at: revokedAt }],
    ]);
    await expect(
      revokeApiKey(database, {
        keyId: KEY_ID,
        confirmPrefix: "ts_test_aaaaaaaa",
      }),
    ).resolves.toMatchObject({ changed: true, revokedAt: revokedAt.toISOString() });
    expect(database.queries[4]?.text).toContain("clock_timestamp() + interval '5 minutes'");
    expect(database.queries[5]?.text).toContain("set revoked_at = clock_timestamp()");
    expect(database.queries[5]?.text).toContain("where id = ? and key_prefix = ?");
    expect(database.queries[5]?.values).toEqual([
      KEY_ID,
      "ts_test_aaaaaaaa",
    ]);
  });

  it("allows an explicit last-key off-switch without weakening exact targeting", async () => {
    const revokedAt = new Date("2026-07-15T12:01:00Z");
    const database = new FakeSql([
      ...mutationPrelude(),
      [{ revoked_at: revokedAt }],
    ]);
    await revokeApiKey(database, {
      keyId: KEY_ID,
      confirmPrefix: "ts_test_aaaaaaaa",
      allowLastKey: true,
    });
    expect(database.queries).toHaveLength(5);
    expect(database.queries[4]?.values).toEqual([
      KEY_ID,
      "ts_test_aaaaaaaa",
    ]);
  });

  it("lets the explicit off-switch revoke legacy rows with unsafe display metadata", async () => {
    const revokedAt = new Date("2026-07-15T12:01:00Z");
    const database = new FakeSql([
      ...mutationPrelude(
        keyRow({
          key_name: "legacy\nkey",
          workspace_name: "x".repeat(500),
          created_at: "not-a-date",
        }),
      ),
      [{ revoked_at: revokedAt }],
    ]);
    await expect(
      revokeApiKey(database, {
        keyId: KEY_ID,
        confirmPrefix: "ts_test_aaaaaaaa",
        allowLastKey: true,
      }),
    ).resolves.toMatchObject({ changed: true });
    expect(database.queries).toHaveLength(5);
  });

  it("requires the exact boolean true for the last-key off-switch", async () => {
    const database = new FakeSql([...mutationPrelude(), []]);
    await expect(
      revokeApiKey(database, {
        keyId: KEY_ID,
        confirmPrefix: "ts_test_aaaaaaaa",
        allowLastKey: "false" as unknown as boolean,
      }),
    ).rejects.toMatchObject(expectCode("last_active_key"));
  });

  it("prints a rotated plaintext once and states that the old key remains active", async () => {
    const database = new FakeSql([
      ...mutationPrelude(),
      [createdKeyRow()],
    ]);
    const output: string[] = [];
    const migrate = vi.fn(async () => {});
    const close = vi.fn(async () => {});
    await manageApiKey(
      [
        "rotate",
        `--key-id=${KEY_ID}`,
        `--expires-at=${FUTURE_EXPIRY}`,
      ],
      { database, migrate, close, output: (line) => output.push(line) },
    );
    expect(migrate).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(output.filter((line) => /^ts_test_[A-Za-z0-9_-]{43}$/u.test(line))).toHaveLength(1);
    expect(output).toContain(`Old key ${KEY_ID} remains active. Verify the replacement before revoking it.`);
  });

  it("shows help without touching the database", async () => {
    const output: string[] = [];
    const migrate = vi.fn(async () => {});
    const close = vi.fn(async () => {});
    await manageApiKey(["--help"], {
      database: new FakeSql([]),
      migrate,
      close,
      output: (line) => output.push(line),
    });
    expect(migrate).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(output.join("\n")).toMatch(/old key remains active/i);
    expect(output.join("\n")).toMatch(/plaintext key exactly once/i);
  });

  it("closes the database when migration fails", async () => {
    const close = vi.fn(async () => {});
    await expect(
      manageApiKey(["inspect", `--key-id=${KEY_ID}`], {
        database: new FakeSql([]),
        migrate: vi.fn(async () => {
          throw new Error("migration failed");
        }),
        close,
        output: vi.fn(),
      }),
    ).rejects.toThrow("migration failed");
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects command-specific flag errors before migration or database access", async () => {
    const database = new FakeSql([]);
    const migrate = vi.fn(async () => {});
    const close = vi.fn(async () => {});
    await expect(
      manageApiKey(
        ["inspect", `--key-id=${KEY_ID}`, "--expires-at=wrong-place"],
        { database, migrate, close, output: vi.fn() },
      ),
    ).rejects.toMatchObject(expectCode("unknown_flag"));
    expect(migrate).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(database.beginCalls).toBe(0);
  });

  it("rejects a duplicated destructive override before migration", async () => {
    const database = new FakeSql([]);
    const migrate = vi.fn(async () => {});
    await expect(
      manageApiKey(
        [
          "revoke",
          `--key-id=${KEY_ID}`,
          "--confirm-prefix=ts_test_aaaaaaaa",
          "--allow-last-key",
          "--allow-last-key",
        ],
        { database, migrate, close: vi.fn(async () => {}), output: vi.fn() },
      ),
    ).rejects.toMatchObject(expectCode("duplicate_flag"));
    expect(migrate).not.toHaveBeenCalled();
    expect(database.beginCalls).toBe(0);
  });
});

describe("create API key CLI", () => {
  it("preserves test mode and default-scope input while requiring expiry", () => {
    expect(
      parseCreateApiKeyArguments([
        "North & Co",
        `--expires-at=${FUTURE_EXPIRY}`,
      ]),
    ).toEqual({
      workspaceName: "North & Co",
      mode: "test",
      scopes: [],
      expiresAt: FUTURE_EXPIRY,
    });
    expect(
      parseCreateApiKeyArguments([
        "North & Co",
        "--live",
        "--scope=tax-expert:assess",
        `--expires-at=${FUTURE_EXPIRY}`,
      ]),
    ).toMatchObject({ mode: "live", scopes: ["tax-expert:assess"] });
  });

  it.each([
    [["Firm", "--unknown=yes", `--expires-at=${FUTURE_EXPIRY}`], "unknown_flag"],
    [["Firm", "--live", "--live", `--expires-at=${FUTURE_EXPIRY}`], "duplicate_live_flag"],
    [["Firm", `--expires-at=${FUTURE_EXPIRY}`, `--expires-at=${FUTURE_EXPIRY}`], "expiry_count"],
    [["Firm", "--scope=", `--expires-at=${FUTURE_EXPIRY}`], "empty_scope"],
    [["Firm"], "expiry_count"],
  ])("fails closed for ambiguous create arguments", (argv, code) => {
    expect(() => parseCreateApiKeyArguments(argv)).toThrowError(
      expectCode(code),
    );
  });

  it("prints a first key once and closes after migration", async () => {
    const database = new FakeSql([
      [{ database_now: DATABASE_NOW }],
      [{ workspace_id: WORKSPACE_ID }],
      [createdKeyRow()],
    ]);
    const output: string[] = [];
    const close = vi.fn(async () => {});
    await createApiKey(
      ["North & Co", `--expires-at=${FUTURE_EXPIRY}`],
      {
        database,
        migrate: vi.fn(async () => {}),
        close,
        output: (line) => output.push(line),
      },
    );
    expect(close).toHaveBeenCalledOnce();
    expect(output.filter((line) => /^ts_test_[A-Za-z0-9_-]{43}$/u.test(line))).toHaveLength(1);
    expect(output).toContain("API key (shown once):");
  });

  it.each([
    [["Firm", "--scope=unknown", `--expires-at=${FUTURE_EXPIRY}`], "unsupported_scope"],
    [["Firm", "--expires-at=2027-07-15"], "invalid_expiry"],
    [[`bad\nname`, `--expires-at=${FUTURE_EXPIRY}`], "invalid_label"],
  ])("rejects pure create validation errors before migration", async (argv, code) => {
    const database = new FakeSql([]);
    const migrate = vi.fn(async () => {});
    const close = vi.fn(async () => {});
    await expect(
      createApiKey(argv, { database, migrate, close, output: vi.fn() }),
    ).rejects.toMatchObject(expectCode(code));
    expect(migrate).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(database.beginCalls).toBe(0);
  });

  it("closes create-key database resources when migration fails", async () => {
    const close = vi.fn(async () => {});
    await expect(
      createApiKey(
        ["Firm", `--expires-at=${FUTURE_EXPIRY}`],
        {
          database: new FakeSql([]),
          migrate: vi.fn(async () => {
            throw new Error("migration failed");
          }),
          close,
          output: vi.fn(),
        },
      ),
    ).rejects.toThrow("migration failed");
    expect(close).toHaveBeenCalledOnce();
  });
});
