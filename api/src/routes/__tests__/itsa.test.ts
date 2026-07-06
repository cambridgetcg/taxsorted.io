// The ITSA sandbox rail: status + obligations through the vault, and the
// itsa-scope connect start. Session/hmrc are mocked (no real DB, no real
// network) — mirrors the sandbox-guard pattern in test-user-door.test.ts.

import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.doUnmock("../../session.js");
  vi.doUnmock("../../hmrc.js");
});

function sandboxEnv() {
  vi.stubEnv("HMRC_ENV", "sandbox");
  vi.stubEnv("HMRC_CLIENT_ID", "id");
  vi.stubEnv("HMRC_CLIENT_SECRET", "secret");
  vi.stubEnv("TOKEN_KEY", "a".repeat(64));
}

function mockEntity(entity: unknown) {
  vi.doMock("../../session.js", () => ({
    ownedEntity: vi.fn(async () => entity),
  }));
}

function mockHmrcRequest(impl: (call: unknown) => unknown) {
  vi.doMock("../../hmrc.js", async () => {
    const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
    return { ...actual, hmrcRequest: vi.fn(impl) };
  });
}

async function freshItsaApp() {
  const { Hono } = await import("hono");
  const { itsa } = await import("../itsa.js");
  return new Hono().route("/v1/itsa", itsa);
}

describe("the ITSA sandbox door", () => {
  it("does not exist in production", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    mockEntity({ id: "e1", nino: "AA123456A" });
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/obligations");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });
});

describe("ITSA status", () => {
  it("requires a nino on the entity", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: null });
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/status?taxYear=2025-26");
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("nino_required");
  });

  it("maps the HMRC itsaStatusDetails value through", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    mockHmrcRequest(async () => ({
      itsaStatuses: [{ taxYear: "2025-26", itsaStatusDetails: [{ status: "MTD Mandated" }] }],
    }));
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/status?taxYear=2025-26");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      taxYear: "2025-26",
      status: "MTD Mandated",
      source: "hmrc-sandbox",
    });
  });
});

describe("ITSA obligations", () => {
  it("maps periods, due dates and status, flattened across businesses", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    mockHmrcRequest(async () => ({
      obligations: [
        {
          typeOfBusiness: "self-employment",
          businessId: "XAIS12345678910",
          obligationDetails: [
            {
              periodStartDate: "2025-04-06",
              periodEndDate: "2025-07-05",
              dueDate: "2025-08-05",
              status: "open",
            },
            {
              periodStartDate: "2025-01-06",
              periodEndDate: "2025-04-05",
              dueDate: "2025-05-05",
              receivedDate: "2025-05-01",
              status: "fulfilled",
            },
          ],
        },
      ],
    }));
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/obligations");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      obligations: [
        { periodStart: "2025-04-06", periodEnd: "2025-07-05", dueDate: "2025-08-05", status: "open" },
        { periodStart: "2025-01-06", periodEnd: "2025-04-05", dueDate: "2025-05-05", status: "fulfilled" },
      ],
      source: "hmrc-sandbox",
    });
  });
});

// Pins the ITSA side of the collision fix: these routes must spend a token
// from the itsa rail's connection, never fall through to vat's default.
describe("rail-scoped connection reads", () => {
  it("status asks hmrcRequest for the itsa rail", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    const calls: Array<{ rail?: string }> = [];
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async (call: { rail?: string }) => {
          calls.push(call);
          return { itsaStatuses: [] };
        }),
      };
    });
    const app = await freshItsaApp();
    await app.request("/v1/itsa/e1/status?taxYear=2025-26");
    expect(calls[0]?.rail).toBe("itsa");
  });

  it("obligations asks hmrcRequest for the itsa rail", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    const calls: Array<{ rail?: string }> = [];
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async (call: { rail?: string }) => {
          calls.push(call);
          return { obligations: [] };
        }),
      };
    });
    const app = await freshItsaApp();
    await app.request("/v1/itsa/e1/obligations");
    expect(calls[0]?.rail).toBe("itsa");
  });
});

describe("connect with rail=itsa", () => {
  it("does not exist in production", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    mockEntity({ id: "e1", vrn: null, nino: "AA123456A" });
    const { Hono } = await import("hono");
    const { connect } = await import("../connect.js");
    const app = new Hono().route("/v1/hmrc", connect);
    const res = await app.request("/v1/hmrc/start/e1?rail=itsa");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });

  it("requests the read:self-assessment scope on the authorize URL in sandbox", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", vrn: null, nino: "AA123456A" });
    const { Hono } = await import("hono");
    const { connect } = await import("../connect.js");
    const app = new Hono().route("/v1/hmrc", connect);
    const res = await app.request("/v1/hmrc/start/e1?rail=itsa", { redirect: "manual" });
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") ?? "", "https://example.com");
    expect(location.searchParams.get("scope")).toBe("read:self-assessment");
  });

  it("still requests the vat scope when rail is omitted (byte-identical default)", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", vrn: "123456789", nino: null });
    const { Hono } = await import("hono");
    const { connect } = await import("../connect.js");
    const app = new Hono().route("/v1/hmrc", connect);
    const res = await app.request("/v1/hmrc/start/e1", { redirect: "manual" });
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") ?? "", "https://example.com");
    expect(location.searchParams.get("scope")).toBe("read:vat write:vat");
  });
});

// The callback lands the reader back where the dance began: ITSA connects
// start on the dashboard, VAT connects on the VAT cockpit. The rail rides
// inside the HMAC-signed state, so a callback can never be steered to a
// different cockpit than the one that started it.
describe("OAuth callback, rail-aware", () => {
  const SESSION = "s1";
  const KEY = "a".repeat(64);

  function mockExchange() {
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        exchangeCode: vi.fn(async () => ({
          access_token: "at",
          refresh_token: "rt",
          expires_in: 3600,
          scope: "read:self-assessment",
        })),
        storeConnection: vi.fn(async () => {}),
      };
    });
  }

  async function callbackApp() {
    const { Hono } = await import("hono");
    const { connect } = await import("../connect.js");
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("sessionId", SESSION);
      await next();
    });
    return app.route("/v1/hmrc", connect);
  }

  it("itsa: success lands on the dashboard", async () => {
    sandboxEnv();
    mockExchange();
    const { signState } = await import("../../crypto.js");
    const state = signState({ entityId: "e1", sessionId: SESSION, rail: "itsa" }, KEY);
    const app = await callbackApp();
    const res = await app.request(
      `/v1/hmrc/callback?code=abc&state=${encodeURIComponent(state)}`,
      { redirect: "manual" }
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://taxsorted.io/dashboard?hmrc=connected");
  });

  it("itsa: denial lands on the dashboard too", async () => {
    sandboxEnv();
    const { signState } = await import("../../crypto.js");
    const state = signState({ entityId: "e1", sessionId: SESSION, rail: "itsa" }, KEY);
    const app = await callbackApp();
    const res = await app.request(
      `/v1/hmrc/callback?error=access_denied&state=${encodeURIComponent(state)}`,
      { redirect: "manual" }
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://taxsorted.io/dashboard?hmrc=denied");
  });

  it("vat: success lands on the VAT cockpit, byte-identical to before", async () => {
    sandboxEnv();
    mockExchange();
    const { signState } = await import("../../crypto.js");
    // No rail field — exactly what every pre-rail state looked like.
    const state = signState({ entityId: "e1", sessionId: SESSION }, KEY);
    const app = await callbackApp();
    const res = await app.request(
      `/v1/hmrc/callback?code=abc&state=${encodeURIComponent(state)}`,
      { redirect: "manual" }
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://taxsorted.io/vat/?e=e1&hmrc=connected");
  });

  it("invalid state still lands on the VAT cockpit (rail unknowable)", async () => {
    sandboxEnv();
    const app = await callbackApp();
    const res = await app.request("/v1/hmrc/callback?code=abc&state=garbage", {
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://taxsorted.io/vat/?hmrc=invalid");
  });
});
