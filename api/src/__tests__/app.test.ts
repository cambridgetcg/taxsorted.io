import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { query, migrate, serve } = vi.hoisted(() => ({
  query: vi.fn(),
  migrate: vi.fn(),
  serve: vi.fn(),
}));
vi.mock("../db.js", () => ({ sql: query, migrate }));
vi.mock("@hono/node-server", () => ({ serve }));

const sessionId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const keyId = "33333333-3333-4333-8333-333333333333";
const rawKey = `ts_test_${"a".repeat(43)}`;
const network = vi.fn(() => {
  throw new Error("App composition tests must not contact a provider");
});

let createApp: typeof import("../app.js").createApp;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("HMRC_ENV", "production");
  vi.stubEnv("HMRC_CLIENT_ID", "");
  vi.stubEnv("HMRC_CLIENT_SECRET", "");
  vi.stubEnv("ACCOUNTING_XERO_ENABLED", "false");
  vi.stubEnv("UK_TAX_SYSTEM_PUBLIC_DATA_ENABLED", "false");
  vi.stubEnv("UK_TAX_IDENTITY_EMERGENCY_STOP", "false");
  vi.stubGlobal("fetch", network);
  ({ createApp } = await import("../app.js"));
  app = createApp();
  expect(query).not.toHaveBeenCalled();
  expect(migrate).not.toHaveBeenCalled();
  expect(serve).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
});

beforeEach(() => {
  query.mockReset();
  network.mockClear();
  query.mockImplementation(async (strings: TemplateStringsArray) => {
    const statement = strings.join("?");
    if (statement.includes("insert into sessions default values")) {
      return [{ id: sessionId }];
    }
    if (statement.includes("from entities e")) return [];
    if (statement.includes("from api_keys")) {
      return [{
        id: keyId,
        workspace_id: workspaceId,
        key_prefix: rawKey.slice(0, 16),
        mode: "test",
        scopes: ["sdlt:calculate"],
        created_at: new Date("2026-07-10T09:30:00.000Z"),
        expires_at: null,
      }];
    }
    throw new Error(`Unexpected database query: ${statement}`);
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("the assembled API", () => {
  it("can be imported and constructed without migrations, a listener or provider calls", () => {
    expect(createApp()).not.toBe(app);
    expect(query).not.toHaveBeenCalled();
    expect(migrate).not.toHaveBeenCalled();
    expect(serve).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    "/v1/health",
    "/v1/wake",
    "/agent.txt",
    "/v1/open-data",
    "/v1/why-graph",
    "/v1/tax-identity/uk",
    "/v1/uk/professional-tools",
    "/openapi.json",
  ])("serves %s without creating a browser identity", async (path) => {
    const response = await app.request(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(query).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    "/v1/unmapped",
    "/v1/entities-unlisted",
    "/v1/accounting-unlisted",
  ])("keeps an unknown path %s outside browser sessions", async (path) => {
    const response = await app.request(path);
    expect(response.status).toBe(404);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("keeps the production publication gate on the mounted tax-system corpus", async () => {
    const response = await app.request("/v1/tax-system/uk/actors");
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a machine caller without opening a browser session", async () => {
    const response = await app.request("/v1/api-workspace");
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("invalid_api_key");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("authenticates a machine key through its workspace alone", async () => {
    const response = await app.request("/v1/api-workspace", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      workspace: { id: workspaceId },
      presentedKey: { id: keyId },
      boundaries: { browserAccountLinked: false, hmrcConnectionLinked: false },
    });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0].join("?")).toContain("from api_keys");
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    ["/v1/entities", 200],
    ["/v1/hmrc/status", 200],
    ["/v1/itsa/11111111-1111-4111-8111-111111111111/status", 404],
    ["/v1/account", 200],
    ["/v1/accounting/source-connections/11111111-1111-4111-8111-111111111111/status", 403],
  ] as const)("keeps the browser session middleware on %s", async (path, status) => {
    const response = await app.request(path);
    expect(response.status).toBe(status);
    const cookies = response.headers.get("set-cookie");
    expect(cookies).toContain(`ts_session=${sessionId}`);
    expect(cookies).toContain("ts_device=");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("Secure");
    expect(query.mock.calls.some(([strings]) =>
      strings.join("?").includes("insert into sessions default values"),
    )).toBe(true);
    expect(network).not.toHaveBeenCalled();
    if (path.startsWith("/v1/accounting/")) {
      expect((await response.json()).error).toBe("passkey_needed");
    }
  });
});
