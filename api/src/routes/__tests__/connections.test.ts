// The three ledgered M2 blockers, pinned:
//   1. the VAT/ITSA collision — connecting one rail must never clobber the
//      other's tokens on the same entity;
//   2. NINO normalization at the PATCH boundary;
//   3. HMRC error scrubbing — sandbox shows detail, production hides it.
// db/session/network are faked in-memory, no real Postgres, mirroring the
// whole-module mock pattern already used in itsa.test.ts.

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

/** A tiny in-memory stand-in for postgres.js's `sql`, just enough surface for
    hmrc.ts's hmrc_connections queries: the rail-keyed upsert storeConnection
    issues, and the rail-scoped select getConnection issues. Not a general SQL
    engine — coupled to the exact shapes hmrc.ts emits, same spirit as the
    whole-module mocks elsewhere in this suite. */
function fakeConnectionsDb() {
  const rows: Record<string, unknown>[] = [];
  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const text = strings.join("?").toLowerCase();
    if (text.includes("insert into hmrc_connections")) {
      const [entityId, rail, hmrcEnv, access, refresh, expiresAt, scope] = values as string[];
      const existing = rows.find((r) => r.entity_id === entityId && r.rail === rail);
      const patch = {
        entity_id: entityId,
        rail,
        hmrc_env: hmrcEnv,
        access_token_enc: access,
        refresh_token_enc: refresh,
        expires_at: expiresAt,
        scope,
        connected_at: new Date(),
      };
      if (existing) Object.assign(existing, patch);
      else rows.push({ id: `row-${rows.length + 1}`, ...patch });
      return Promise.resolve([]);
    }
    if (text.includes("select * from hmrc_connections") && text.includes("and rail")) {
      const [entityId, rail] = values as string[];
      const row = rows.find((r) => r.entity_id === entityId && r.rail === rail);
      return Promise.resolve(row ? [row] : []);
    }
    if (text.includes("select * from hmrc_connections")) {
      const [entityId] = values as string[];
      return Promise.resolve(rows.filter((r) => r.entity_id === entityId));
    }
    throw new Error(`fakeConnectionsDb: unrecognized query — ${text}`);
  }
  return { sql, rows };
}

describe("the VAT/ITSA collision regression", () => {
  it("storeConnection/getConnection: VAT then ITSA on the same entity — both survive with their own tokens", async () => {
    sandboxEnv();
    const { sql } = fakeConnectionsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const { storeConnection, getConnection } = await import("../../hmrc.js");
    const { decrypt } = await import("../../crypto.js");

    await storeConnection("e1", "vat", {
      access_token: "vat-access",
      refresh_token: "vat-refresh",
      expires_in: 3600,
      scope: "read:vat write:vat",
    });
    await storeConnection("e1", "itsa", {
      access_token: "itsa-access",
      refresh_token: "itsa-refresh",
      expires_in: 3600,
      scope: "read:self-assessment",
    });

    const vatConn = await getConnection("e1", "vat");
    const itsaConn = await getConnection("e1", "itsa");
    expect(vatConn).not.toBeNull();
    expect(itsaConn).not.toBeNull();
    // Distinct tokens on each row — the old on-conflict(entity_id) upsert
    // would have overwritten the VAT row with the ITSA tokens here.
    expect(decrypt(vatConn!.access_token_enc as string, KEY)).toBe("vat-access");
    expect(decrypt(itsaConn!.access_token_enc as string, KEY)).toBe("itsa-access");
    expect(vatConn!.scope).toBe("read:vat write:vat");
    expect(itsaConn!.scope).toBe("read:self-assessment");
  });

  it("connect.ts callback: VAT connect then ITSA connect on one entity through the real route", async () => {
    sandboxEnv();
    const { sql } = fakeConnectionsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        // Mocked HMRC token exchange, per the brief — no real network.
        exchangeCode: vi.fn(async (code: string) => ({
          access_token: `${code}-access`,
          refresh_token: `${code}-refresh`,
          expires_in: 3600,
          scope: code === "vat-code" ? "read:vat write:vat" : "read:self-assessment",
        })),
      };
    });
    const { Hono } = await import("hono");
    const { connect } = await import("../connect.js");
    const { getConnection } = await import("../../hmrc.js");
    const { signState } = await import("../../crypto.js");
    const { decrypt } = await import("../../crypto.js");

    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("sessionId", "s1");
      await next();
    });
    app.route("/v1/hmrc", connect);

    const vatState = signState({ entityId: "e1", sessionId: "s1", rail: "vat" }, KEY);
    const vatRes = await app.request(
      `/v1/hmrc/callback?code=vat-code&state=${encodeURIComponent(vatState)}`,
      { redirect: "manual" }
    );
    expect(vatRes.status).toBe(302);

    const itsaState = signState({ entityId: "e1", sessionId: "s1", rail: "itsa" }, KEY);
    const itsaRes = await app.request(
      `/v1/hmrc/callback?code=itsa-code&state=${encodeURIComponent(itsaState)}`,
      { redirect: "manual" }
    );
    expect(itsaRes.status).toBe(302);

    const vatConn = await getConnection("e1", "vat");
    const itsaConn = await getConnection("e1", "itsa");
    expect(vatConn).not.toBeNull();
    expect(itsaConn).not.toBeNull();
    expect(decrypt(vatConn!.access_token_enc as string, KEY)).toBe("vat-code-access");
    expect(decrypt(itsaConn!.access_token_enc as string, KEY)).toBe("itsa-code-access");
  });
});

describe("NINO normalization at the PATCH boundary", () => {
  function fakeEntityDb(seed: {
    id: string;
    name: string;
    kind: string;
    vrn: string | null;
    nino: string | null;
  }) {
    const captured: unknown[] = [];
    function sql(strings: TemplateStringsArray, ...values: unknown[]) {
      const text = strings.join("?").toLowerCase();
      if (text.includes("update entities set")) {
        captured.push(...values);
        const [vrn, nino] = values as (string | null)[];
        return Promise.resolve([
          {
            id: seed.id,
            name: seed.name,
            kind: seed.kind,
            vrn: vrn ?? seed.vrn,
            nino: nino ?? seed.nino,
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ]);
      }
      if (text.includes("select * from hmrc_connections")) return Promise.resolve([]);
      throw new Error(`fakeEntityDb: unrecognized query — ${text}`);
    }
    return { sql, captured };
  }

  it("lowercase-with-space nino is stored uppercase and space-stripped", async () => {
    sandboxEnv();
    const seed = { id: "e1", name: "Self Assessment", kind: "person", vrn: null, nino: null };
    const { sql, captured } = fakeEntityDb(seed);
    vi.doMock("../../db.js", () => ({ sql }));
    vi.doMock("../../session.js", () => ({ ownedEntity: vi.fn(async () => seed) }));

    const { Hono } = await import("hono");
    const { entities } = await import("../entities.js");
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("sessionId", "s1");
      await next();
    });
    app.route("/v1/entities", entities);

    const res = await app.request("/v1/entities/e1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nino: "px 524196d" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { entity: { nino: string } };
    expect(body.entity.nino).toBe("PX524196D");
    // What actually reached the update statement, not just what came back.
    expect(captured[1]).toBe("PX524196D");
  });

  it("an already-clean nino round-trips unchanged", async () => {
    sandboxEnv();
    const seed = { id: "e1", name: "Self Assessment", kind: "person", vrn: null, nino: null };
    const { sql } = fakeEntityDb(seed);
    vi.doMock("../../db.js", () => ({ sql }));
    vi.doMock("../../session.js", () => ({ ownedEntity: vi.fn(async () => seed) }));

    const { Hono } = await import("hono");
    const { entities } = await import("../entities.js");
    const app = new Hono().route("/v1/entities", entities);

    const res = await app.request("/v1/entities/e1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nino: "AA123456A" }),
    });

    expect(res.status).toBe(200);
    expect(((await res.json()) as { entity: { nino: string } }).entity.nino).toBe("AA123456A");
  });
});

describe("HMRC error scrubbing (hmrcFail)", () => {
  it("sandbox: passes the HMRC message and body through as detail", async () => {
    sandboxEnv();
    const { hmrcFail } = await import("../../hmrc-fail.js");
    const { HmrcError } = await import("../../hmrc.js");
    const json = vi.fn((body: unknown, status?: number) => ({ body, status }) as unknown as Response);

    hmrcFail({ json }, new HmrcError(502, "HMRC said no", { raw: "upstream body" }));

    expect(json).toHaveBeenCalledWith(
      { error: "hmrc", message: "HMRC said no", detail: { raw: "upstream body" } },
      502
    );
  });

  it("production: hides the detail and the raw message, logs server-side instead", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("HMRC_CLIENT_ID", "id");
    vi.stubEnv("HMRC_CLIENT_SECRET", "secret");
    vi.stubEnv("TOKEN_KEY", KEY);
    const { hmrcFail } = await import("../../hmrc-fail.js");
    const { HmrcError } = await import("../../hmrc.js");
    const json = vi.fn((body: unknown, status?: number) => ({ body, status }) as unknown as Response);
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    hmrcFail({ json }, new HmrcError(502, "HMRC said no — taxpayer fragment", { raw: "upstream body" }));

    expect(json).toHaveBeenCalledWith(
      {
        error: "hmrc",
        message: "HMRC could not complete that request just now.",
        detail: null,
      },
      502
    );
    // The real detail still reaches the server log — just never the response.
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("re-throws anything that isn't an HmrcError, in both envs", async () => {
    sandboxEnv();
    const { hmrcFail } = await import("../../hmrc-fail.js");
    const json = vi.fn();
    expect(() => hmrcFail({ json }, new Error("not an hmrc error"))).toThrow(
      "not an hmrc error"
    );
    expect(json).not.toHaveBeenCalled();
  });
});
