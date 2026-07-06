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

// Individual Calculations API v8.0: trigger an in-year calculation, then
// retrieve its mapped summary. Wire shapes verified against the fetched OAS
// (recorded in the task report): trigger.yaml (POST .../trigger/{calculationType},
// calculationType=in-year for this endpoint) and retrieve.yaml (GET
// .../{calculationId}, oneOf def1..def4 — def4 is the TY 2026-27-onwards
// shape). The retrieve response is huge; only
// calculation.taxCalculation.totalIncomeTaxAndNicsDue and
// calculation.taxCalculation.incomeTax.totalTaxableIncome are mapped through,
// as the plan specifies — everything else is M3 surface.
describe("POST /:id/calculation (trigger)", () => {
  it("does not exist in production", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    mockEntity({ id: "e1", nino: "AA123456A" });
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/calculation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxYear: "2026-27" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });

  it("requires a well-formed taxYear", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/calculation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxYear: "202627" }),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("tax_year_required");
  });

  it("triggers an in-year calculation and returns the calculationId HMRC hands back", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    const calls: Array<Record<string, unknown>> = [];
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async (call: Record<string, unknown>) => {
          calls.push(call);
          return { calculationId: "f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c" };
        }),
      };
    });
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/calculation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxYear: "2026-27" }),
    });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ calculationId: "f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c" });
    expect(calls[0]?.rail).toBe("itsa");
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.path).toBe(
      "/individuals/calculations/AA123456A/self-assessment/2026-27/trigger/in-year"
    );
    expect(calls[0]?.accept).toBe("application/vnd.hmrc.8.0+json");
  });

  it("an unconnected entity fails clean, not crashed (HmrcError bubbles through hmrcFail)", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async () => {
          throw new actual.HmrcError(428, "not connected to HMRC");
        }),
      };
    });
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/calculation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxYear: "2026-27" }),
    });
    expect(res.status).toBe(428);
    expect((await res.json()).error).toBe("hmrc");
  });
});

describe("GET /:id/calculation/:calcId (retrieve)", () => {
  it("does not exist in production", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    mockEntity({ id: "e1", nino: "AA123456A" });
    const app = await freshItsaApp();
    const res = await app.request("/v1/itsa/e1/calculation/calc-1?taxYear=2026-27");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });

  it("surfaces HMRC's 404-while-computing honestly, as a computing status rather than an error", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async () => {
          throw new actual.HmrcError(404, "MATCHING_RESOURCE_NOT_FOUND");
        }),
      };
    });
    const app = await freshItsaApp();
    const res = await app.request(
      "/v1/itsa/e1/calculation/f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c?taxYear=2026-27"
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "computing", source: "hmrc-sandbox" });
  });

  it("rejects a calculationId that does not match HMRC's own pattern, before any HMRC call", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    let hmrcCalls = 0;
    mockHmrcRequest(async () => {
      hmrcCalls += 1;
      return {};
    });
    const app = await freshItsaApp();
    // Path-shaped garbage: matches neither the 8-digit nor the UUID form.
    const res = await app.request("/v1/itsa/e1/calculation/not-a-calc-id?taxYear=2026-27");
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("calculation_id_invalid");
    expect(hmrcCalls).toBe(0);
  });

  it("maps only status/incomeTaxAndNicsDuePounds/taxableIncomePounds from a realistic (huge) OAS retrieve payload", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    const calls: Array<Record<string, unknown>> = [];
    // Shape trimmed from the fetched def4 (TY 2026-27 onwards) example —
    // metadata/inputs/messages are real siblings in the OAS example but are
    // M3 surface, so this mock omits them to prove they're NOT read.
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async (call: Record<string, unknown>) => {
          calls.push(call);
          return {
            calculation: {
              taxCalculation: {
                totalIncomeTaxAndNicsDue: 1234.56,
                totalIncomeTaxNicsCharged: 1234.56,
                incomeTax: {
                  totalIncomeReceivedFromAllSources: 30000,
                  totalTaxableIncome: 17430,
                },
                nics: { nic2Amount: 0, nic4Amount: 0 },
              },
            },
          };
        }),
      };
    });
    const app = await freshItsaApp();
    const res = await app.request(
      "/v1/itsa/e1/calculation/f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c?taxYear=2026-27"
    );
    expect(res.status).toBe(200);
    // The Pounds suffix is load-bearing: these are HMRC's decimal pounds
    // passed through untouched — NOT this codebase's integer pence. A
    // bare-named field here would invite the frontend's pence formatter and
    // show HMRC's figure 100x too small.
    expect(await res.json()).toEqual({
      status: "complete",
      incomeTaxAndNicsDuePounds: 1234.56,
      taxableIncomePounds: 17430,
      source: "hmrc-sandbox",
    });
    expect(calls[0]?.rail).toBe("itsa");
    expect(calls[0]?.path).toBe(
      "/individuals/calculations/AA123456A/self-assessment/2026-27/f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c"
    );
    expect(calls[0]?.accept).toBe("application/vnd.hmrc.8.0+json");
  });

  it("an unconnected entity fails clean, not crashed (HmrcError bubbles through hmrcFail)", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: "AA123456A" });
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async () => {
          throw new actual.HmrcError(428, "not connected to HMRC");
        }),
      };
    });
    const app = await freshItsaApp();
    const res = await app.request(
      "/v1/itsa/e1/calculation/f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c?taxYear=2026-27"
    );
    expect(res.status).toBe(428);
    expect((await res.json()).error).toBe("hmrc");
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

  it("requests both self-assessment scopes on the authorize URL in sandbox (the cumulative PUTs need write:self-assessment)", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", vrn: null, nino: "AA123456A" });
    const { Hono } = await import("hono");
    const { connect } = await import("../connect.js");
    const app = new Hono().route("/v1/hmrc", connect);
    const res = await app.request("/v1/hmrc/start/e1?rail=itsa", { redirect: "manual" });
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") ?? "", "https://example.com");
    expect(location.searchParams.get("scope")).toBe("read:self-assessment write:self-assessment");
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
