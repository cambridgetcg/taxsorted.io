// vat.ts's route-level test home. Previously only pure engine/zod contract
// tests existed for VAT (return-contract.test.ts at api/__tests__/) — no
// request-level suite hit the Hono router directly, so Task 10 (production
// filing needs a passkey) starts one here, house pattern: stubEnv + doMock
// db/session + dynamic import, mirroring itsa-submit.test.ts / connections.test.ts.

import { describe, it, expect, vi, afterEach } from "vitest";

const KEY = "a".repeat(64);

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.doUnmock("../../db.js");
  vi.doUnmock("../../session.js");
  vi.doUnmock("../../hmrc.js");
});

function sandboxEnv() {
  vi.stubEnv("HMRC_ENV", "sandbox");
  vi.stubEnv("HMRC_CLIENT_ID", "id");
  vi.stubEnv("HMRC_CLIENT_SECRET", "secret");
  vi.stubEnv("TOKEN_KEY", KEY);
}

function productionEnv() {
  vi.stubEnv("HMRC_ENV", "production");
  vi.stubEnv("HMRC_CLIENT_ID", "id");
  vi.stubEnv("HMRC_CLIENT_SECRET", "secret");
  vi.stubEnv("TOKEN_KEY", KEY);
}

function mockEntity(entity: unknown) {
  vi.doMock("../../session.js", () => ({
    ownedEntity: vi.fn(async () => entity),
  }));
}

function mockHmrcRequest(impl: (call: Record<string, unknown>) => unknown) {
  vi.doMock("../../hmrc.js", async () => {
    const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
    return { ...actual, hmrcRequest: vi.fn(impl) };
  });
}

/** A tiny in-memory stand-in for postgres.js's `sql`, purpose-built for the
    two statement shapes vat.ts's returns route issues: the pre-check select
    (already-filed?) and the insert-returning. Same spirit as
    fakeReceiptsDb in itsa-submit.test.ts. */
function fakeSubmissionsDb() {
  const rows: Array<Record<string, unknown>> = [];
  let nextId = 1;
  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const text = strings.join("?").toLowerCase();
    if (text.includes("select") && text.includes("from submissions")) {
      const [entityId, periodKey] = values as string[];
      const existing = rows.find((r) => r.entity_id === entityId && r.period_key === periodKey);
      return Promise.resolve(
        existing ? [{ receipt: existing.receipt, submitted_at: existing.submitted_at }] : []
      );
    }
    if (text.includes("insert into submissions")) {
      const [entityId, periodKey, hmrcEnv, , receiptParam] = values as [
        string,
        string,
        string,
        unknown,
        { __json: unknown } | null,
      ];
      const row = {
        id: `sub-${nextId++}`,
        entity_id: entityId,
        period_key: periodKey,
        hmrc_env: hmrcEnv,
        receipt:
          receiptParam && typeof receiptParam === "object" && "__json" in receiptParam
            ? receiptParam.__json
            : receiptParam,
        submitted_at: new Date().toISOString(),
      };
      rows.push(row);
      return Promise.resolve([row]);
    }
    throw new Error(`fakeSubmissionsDb: unrecognized query — ${text}`);
  }
  sql.json = (v: unknown) => ({ __json: v });
  return { sql, rows };
}

async function freshVatApp() {
  const { Hono } = await import("hono");
  const { vat } = await import("../vat.js");
  return new Hono().route("/v1/vat", vat);
}

function goodReturnBody(overrides?: Partial<Record<string, unknown>>) {
  return {
    periodKey: "24A1",
    vatDueSales: 1000.5,
    vatDueAcquisitions: 0,
    totalVatDue: 1000.5,
    vatReclaimedCurrPeriod: 500.25,
    netVatDue: 500.25,
    totalValueSalesExVAT: 5000,
    totalValuePurchasesExVAT: 2500,
    totalValueGoodsSuppliedExVAT: 0,
    totalAcquisitionsExVAT: 0,
    finalised: true,
    ...overrides,
  };
}

const ENTITY = { id: "e1", vrn: "123456789" };

describe("production gate — POST /:id/returns needs a passkey to file for real", () => {
  it("HMRC_ENV=production + anonymous → 403 account_needed", async () => {
    productionEnv();
    mockEntity(ENTITY);
    const app = await freshVatApp();
    const res = await app.request("/v1/vat/e1/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goodReturnBody()),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "account_needed",
      message: "Sign in with a passkey to file for real.",
    });
  });

  it("HMRC_ENV=production + signed in (userId set) → gate passes, files as normal", async () => {
    productionEnv();
    mockEntity(ENTITY);
    const { sql } = fakeSubmissionsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    mockHmrcRequest(async () => ({}));
    const { Hono } = await import("hono");
    const { vat } = await import("../vat.js");
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("userId", "u1");
      await next();
    });
    app.route("/v1/vat", vat);

    const res = await app.request("/v1/vat/e1/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goodReturnBody()),
    });
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(201);
  });

  it("HMRC_ENV=sandbox + anonymous → unchanged, files as normal (no gate)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeSubmissionsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    mockHmrcRequest(async () => ({}));
    const app = await freshVatApp();
    const res = await app.request("/v1/vat/e1/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goodReturnBody()),
    });
    expect(res.status).toBe(201);
  });
});
