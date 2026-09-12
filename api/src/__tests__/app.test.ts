import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { signState } from "../crypto.js";

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
const origin = "https://taxsorted.io";
const userId = "44444444-4444-4444-8444-444444444444";
const otherUserId = "55555555-5555-4555-8555-555555555555";
const entityId = "66666666-6666-4666-8666-666666666666";
const sessionEntityId = "77777777-7777-4777-8777-777777777777";
const tokenKey = "aa".repeat(32);
const browserCookie = `ts_session=${sessionId}; ts_device=${workspaceId}`;
let sessionRow: {
  id: string;
  user_id: string | null;
  signed_in_at: Date | null;
  mfa_at: Date | null;
  mfa_factor_ref: string | null;
};
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
  vi.stubEnv("TOKEN_KEY", tokenKey);
  vi.stubEnv("APP_ORIGIN", origin);
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
  sessionRow = {
    id: sessionId,
    user_id: null,
    signed_in_at: null,
    mfa_at: null,
    mfa_factor_ref: null,
  };
  query.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const statement = strings.join("?");
    if (statement.includes("insert into sessions default values")) {
      return [{ id: sessionId }];
    }
    if (statement.includes("update sessions set last_seen_at")) return [sessionRow];
    if (statement.includes("insert into entities")) {
      return [{ id: entityId, name: "Origin fixture", kind: "business" }];
    }
    if (statement.includes("select * from entities")) {
      // Model the two ownership predicates, including SQL NULL's inability to
      // match another NULL. This stub does not establish live Postgres behavior.
      const fixtures = [
        { id: entityId, session_id: null, user_id: userId, vrn: "123456789" },
        { id: sessionEntityId, session_id: sessionId, user_id: null, vrn: "123456789" },
      ];
      return fixtures.filter((entity) => entity.id === values[0] && (
        entity.session_id === values[1] ||
        (values[2] !== null && entity.user_id === values[2])
      ));
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

describe("browser mutation protection in the assembled API", () => {
  const protectedMutations = [
    ["POST", "/v1/entities"],
    ["POST", "/v1/entities/"],
    ["PATCH", `/v1/entities/${entityId}`],
    ["POST", `/v1/entities/${entityId}/returns`],
    ["POST", "/v1/hmrc/test-user"],
    ["DELETE", `/v1/hmrc/connection/${entityId}`],
    ["POST", `/v1/itsa/${entityId}/calculation`],
    ["POST", `/v1/itsa/${entityId}/quarterly-update`],
    ["POST", "/v1/account/login/start"],
    ["DELETE", "/v1/account/passkey/credential"],
    ["POST", "/v1/accounting/authorisations/synthetic/start"],
    ["DELETE", `/v1/accounting/source-connections/${entityId}`],
  ] as const;

  describe.each([
    ["missing", undefined],
    ["opaque", "null"],
    ["unapproved sibling", "https://untrusted.taxsorted.io"],
    ["malformed", "https://taxsorted.io/path"],
  ])("with a %s Origin", (_label, requestOrigin) => {
    it.each(protectedMutations)("blocks %s %s before session, database or provider work", async (method, path) => {
      const headers: Record<string, string> = {
        Cookie: browserCookie,
        "Content-Type": "application/json",
      };
      if (requestOrigin !== undefined) headers.Origin = requestOrigin;
      const response = await app.request(path, { method, headers, body: "{}" });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        error: "bad_origin",
        requestId: response.headers.get("x-request-id"),
      });
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(query).not.toHaveBeenCalled();
      expect(network).not.toHaveBeenCalled();
    });
  });

  it.each([
    "https://taxsorted.io/",
    "https://taxsorted.io.evil.example",
    "https://taxsorted.io@evil.example",
    "https://taxsorted.io, https://evil.example",
    "https://taxsorted.io https://evil.example",
    "//taxsorted.io",
    "http://taxsorted.io",
    "http://localhost:3000",
    "not an origin",
  ])("does not reinterpret or partially match Origin %s", async (requestOrigin) => {
    const response = await app.request("/v1/entities", {
      method: "POST",
      headers: { Origin: requestOrigin, Cookie: browserCookie },
    });
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("bad_origin");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });

  it.each(["application/json", "text/plain", "application/x-www-form-urlencoded"])(
    "requires Origin even without cookies for %s requests",
    async (contentType) => {
      const response = await app.request("/v1/entities", {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          Referer: `${origin}/books/`,
          "Sec-Fetch-Site": "same-origin",
        },
        body: "{}",
      });
      expect(response.status).toBe(403);
      expect((await response.json()).error).toBe("bad_origin");
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(query).not.toHaveBeenCalled();
      expect(network).not.toHaveBeenCalled();
    },
  );

  it.each(["PUT", "PATCH", "DELETE"])("protects an unmapped %s inside a browser route tree", async (method) => {
    const response = await app.request("/v1/account/unmapped", { method });
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("bad_origin");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it.each([origin, "https://www.taxsorted.io"])("allows an entity mutation from %s with session ownership", async (requestOrigin) => {
    const response = await app.request("/v1/entities", {
      method: "POST",
      headers: { Origin: requestOrigin, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Origin fixture", kind: "business" }),
    });
    expect(response.status).toBe(201);
    expect((await response.json()).entity.id).toBe(entityId);
    expect(response.headers.get("set-cookie")).toContain(`ts_session=${sessionId}`);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0].join("?")).toContain("insert into entities (session_id,");
    expect(query.mock.calls[1][1]).toBe(sessionId);
    expect(network).not.toHaveBeenCalled();
  });

  it("keeps account ownership for an approved passkey-backed entity mutation", async () => {
    Object.assign(sessionRow, { user_id: userId, signed_in_at: new Date(), mfa_at: new Date() });
    const response = await app.request("/v1/entities", {
      method: "POST",
      headers: { Origin: origin, Cookie: browserCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Origin fixture", kind: "business" }),
    });
    expect(response.status).toBe(201);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0].join("?")).toContain("insert into entities (user_id, session_id,");
    expect(query.mock.calls[1].slice(1, 3)).toEqual([userId, null]);
    expect(network).not.toHaveBeenCalled();
  });

  it("keeps body validation after an approved Origin", async () => {
    const response = await app.request("/v1/entities", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe("invalid_entity");
    expect(query).toHaveBeenCalledOnce();
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    ["PATCH", `/v1/entities/${entityId}`],
    ["POST", `/v1/entities/${entityId}/returns`],
    ["DELETE", `/v1/hmrc/connection/${entityId}`],
  ])("keeps cross-account ownership checks on %s %s", async (method, path) => {
    Object.assign(sessionRow, { user_id: otherUserId, signed_in_at: new Date(), mfa_at: new Date() });
    const response = await app.request(path, {
      method,
      headers: { Origin: origin, Cookie: browserCookie, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("not_found");
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1].slice(1)).toEqual([entityId, sessionId, otherUserId]);
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    ["/v1/account/adopt", 403, "passkey_needed"],
    ["/v1/accounting/authorisations/synthetic/start", 403, "passkey_needed"],
    [`/v1/entities/${entityId}/returns`, 404, "not_found"],
    [`/v1/entities/${sessionEntityId}/returns`, 403, "account_needed"],
  ] as const)("does not upgrade a recovery-only session on %s", async (path, status, error) => {
    Object.assign(sessionRow, { user_id: userId, signed_in_at: new Date() });
    const response = await app.request(path, {
      method: "POST",
      headers: { Origin: origin, Cookie: browserCookie, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(status);
    expect((await response.json()).error).toBe(error);
    expect(query.mock.calls[0][0].join("?")).toContain("update sessions set last_seen_at");
    expect(query.mock.calls.slice(1).every(([strings]) =>
      strings.join("?").includes("select * from entities"),
    )).toBe(true);
    expect(network).not.toHaveBeenCalled();
  });

  it("leaves HEAD reads available without Origin", async () => {
    const response = await app.request("/v1/hmrc/status", { method: "HEAD" });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(query).toHaveBeenCalledOnce();
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    "/v1/entities", "/v1/entities/",
    "/v1/hmrc", "/v1/hmrc/",
    "/v1/itsa", "/v1/itsa/",
    "/v1/account", "/v1/account/",
    "/v1/accounting", "/v1/accounting/",
  ])("runs session middleware exactly once on the browser root %s", async (path) => {
    const response = await app.request(path);
    expect([200, 403, 404]).toContain(response.status);
    expect(response.headers.get("set-cookie")).toContain(`ts_session=${sessionId}`);
    const sessionQueries = query.mock.calls.filter(([strings]) =>
      strings.join("?").includes("insert into sessions default values"),
    );
    expect(sessionQueries).toHaveLength(1);
    expect(network).not.toHaveBeenCalled();
  });

  it("leaves browser preflight outside session mutations", async () => {
    const response = await app.request("/v1/entities", {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "POST" },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(origin);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });

  it.each(["invalid", "other-session", "expired"])("keeps HMRC callback state checks for %s state without Origin", async (stateKind) => {
    const state = stateKind === "invalid" ? "invalid" : signState({
      entityId,
      sessionId: stateKind === "other-session" ? otherUserId : sessionId,
      rail: "vat",
    }, tokenKey, stateKind === "expired" ? -1 : 600);
    const response = await app.request(`/v1/hmrc/callback?code=fixture&state=${encodeURIComponent(state)}`, {
      headers: { Cookie: browserCookie },
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${origin}/vat/?hmrc=invalid`);
    expect(query).toHaveBeenCalledOnce();
    expect(network).not.toHaveBeenCalled();
  });

  it("leaves Xero's callback sign-in boundary available without Origin", async () => {
    const response = await app.request("/v1/accounting/oauth/xero/callback");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${origin}/books/connect/?xero=sign-in`);
    expect(query).toHaveBeenCalledOnce();
    expect(network).not.toHaveBeenCalled();
  });

  it.each([undefined, "https://machine.example"])("allows workspace-key POST requests without an approved browser Origin (%s)", async (requestOrigin) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${rawKey}`,
      "Content-Type": "application/json",
      Cookie: browserCookie,
    };
    if (requestOrigin !== undefined) headers.Origin = requestOrigin;
    const response = await app.request("/v1/uk/sdlt/calculations", {
      method: "POST",
      headers,
      body: JSON.stringify({
        effectiveDate: "2026-07-10",
        chargeableConsiderationPence: 29_500_000,
        land: { jurisdiction: "england", use: "residential", interest: "freehold", dwellingCount: 1 },
        buyerKind: "individual",
        treatment: { firstTimeBuyerRelief: "do-not-claim", higherRates: "standard", nonResidentSurcharge: "do-not-apply" },
        specialCases: { linkedTransactions: false, sharedOwnership: false, otherReliefClaimed: false, complexConsideration: false, transitionalContractMayApply: false },
      }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("calculated");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][0].join("?")).toContain("from api_keys");
    expect(network).not.toHaveBeenCalled();
  });

  it("still requires a workspace key for machine POSTs carrying a browser cookie", async () => {
    const response = await app.request("/v1/uk/sdlt/calculations", {
      method: "POST",
      headers: { Cookie: browserCookie, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe("invalid_api_key");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    "/v1/entities-unlisted", "/v1/hmrc-unlisted", "/v1/itsa-unlisted",
    "/v1/account-unlisted", "/v1/accounting-unlisted", "/v1/health",
  ])("does not attach the browser guard to a POST outside its route trees: %s", async (path) => {
    const response = await app.request(path, { method: "POST" });
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("no_such_door");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(query).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });
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
