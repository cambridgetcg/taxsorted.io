// First tests for the session middleware. They pin two things that must never
// drift: the anonymous path stays byte-identical (one write, rolling cookie),
// and the new signed-in surface exposes the two-identity model correctly —
// accountId (account-management) vs userId (data), with recovery sign-ins
// earning the former but never the latter.
//
// Postgres is faked in-memory with a template-tag `sql` that string-matches the
// exact statements the middleware emits and throws on anything else, the same
// whole-module mock pattern connections.test.ts uses. The one twist: a
// malformed session cookie makes the fake REJECT, mirroring postgres.js barking
// at an invalid uuid, so we prove the existing catch → insert fallback.

import { describe, it, expect, vi, afterEach } from "vitest";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NEW_ID = "00000000-0000-0000-0000-000000000001";
const SID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const DEVICE = "cccccccc-cccc-cccc-cccc-cccccccccccc";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.doUnmock("../db.js");
});

type SessionRow = {
  id: string;
  user_id: string | null;
  signed_in_at: Date | null;
  mfa_at: Date | null;
  mfa_factor_ref: string | null;
};

/** Fake postgres for session.ts: recognises exactly the last_seen_at UPDATE and
    the default-values INSERT. An invalid-uuid id rejects like the real driver.
    Any other statement throws, so a stray "clear the columns" write blows the
    test up on contact — that is how we assert "no second db write". */
function fakeSessionDb(existing?: { id: string; row: SessionRow | null }) {
  const calls = { update: 0, insert: 0 };
  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const text = strings.join("?").toLowerCase();
    if (text.includes("update sessions set last_seen_at")) {
      calls.update++;
      const id = String(values[0]);
      if (!UUID_RE.test(id)) {
        return Promise.reject(new Error(`invalid input syntax for type uuid: "${id}"`));
      }
      if (existing && existing.id === id && existing.row) {
        return Promise.resolve([existing.row]);
      }
      return Promise.resolve([]);
    }
    if (text.includes("insert into sessions default values")) {
      calls.insert++;
      return Promise.resolve([{ id: NEW_ID }]);
    }
    throw new Error(`fakeSessionDb: unrecognized query — ${text}`);
  }
  return { sql, calls };
}

type ProbeBody = {
  sessionId: string;
  deviceId: string;
  accountId: string | null;
  userId: string | null;
  mfaAt: string | null;
  mfaFactorRef: string | null;
};

/** Mount the real middleware on a fresh app with a probe route that echoes the
    context vars it set. Must import session.ts AFTER the db mock is in place. */
async function mount(sql: (strings: TemplateStringsArray, ...values: unknown[]) => unknown) {
  vi.doMock("../db.js", () => ({ sql }));
  const { Hono } = await import("hono");
  const { session } = await import("../session.js");
  const app = new Hono();
  app.use("*", session);
  app.get("/probe", (c) => {
    const mfaAt = c.get("mfaAt") as Date | undefined;
    return c.json({
      sessionId: c.get("sessionId"),
      deviceId: c.get("deviceId"),
      accountId: c.get("accountId") ?? null,
      userId: c.get("userId") ?? null,
      mfaAt: mfaAt ? mfaAt.toISOString() : null,
      mfaFactorRef: c.get("mfaFactorRef") ?? null,
    });
  });
  return app;
}

function setCookieFor(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}

function cookieValue(header: string): string {
  return header.split(";")[0].slice(header.split(";")[0].indexOf("=") + 1);
}

async function probe(app: Awaited<ReturnType<typeof mount>>, cookie?: string) {
  const res = await app.request("/probe", cookie ? { headers: { Cookie: cookie } } : {});
  const body = (await res.json()) as ProbeBody;
  return { res, body };
}

describe("session middleware — anonymous path (byte-identical)", () => {
  it("1. no cookie → INSERT → new id, ts_session set with exact attrs, context anonymous", async () => {
    const { sql, calls } = fakeSessionDb();
    const app = await mount(sql);

    const { res, body } = await probe(app);

    expect(body.sessionId).toBe(NEW_ID);
    expect(calls.insert).toBe(1);
    expect(calls.update).toBe(0);

    const header = setCookieFor(res, "ts_session")!;
    expect(header).toBeDefined();
    expect(cookieValue(header)).toBe(NEW_ID);
    expect(header).toContain("Max-Age=31536000");
    expect(header).toContain("Path=/");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    // Not production in the test env, so Secure must be absent.
    expect(header).not.toContain("Secure");

    expect(body.accountId).toBeNull();
    expect(body.userId).toBeNull();
    expect(body.mfaAt).toBeNull();
    expect(body.mfaFactorRef).toBeNull();
  });

  it("2. existing anonymous session → UPDATE returns null user_id → anonymous, NO insert", async () => {
    const { sql, calls } = fakeSessionDb({
      id: SID,
      row: { id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null },
    });
    const app = await mount(sql);

    const { body } = await probe(app, `ts_session=${SID}`);

    expect(body.sessionId).toBe(SID);
    expect(calls.update).toBe(1);
    expect(calls.insert).toBe(0);
    expect(body.accountId).toBeNull();
    expect(body.userId).toBeNull();
    expect(body.mfaAt).toBeNull();
    expect(body.mfaFactorRef).toBeNull();
  });
});

describe("session middleware — signed-in surface", () => {
  it("3. signed-in (user + fresh signed_in_at + mfa) → accountId, userId, mfaAt, mfaFactorRef all set", async () => {
    const mfa = new Date();
    const { sql, calls } = fakeSessionDb({
      id: SID,
      row: {
        id: SID,
        user_id: UID,
        signed_in_at: new Date(),
        mfa_at: mfa,
        mfa_factor_ref: "factor-ref-hash",
      },
    });
    const app = await mount(sql);

    const { body } = await probe(app, `ts_session=${SID}`);

    expect(calls.update).toBe(1);
    expect(calls.insert).toBe(0);
    expect(body.sessionId).toBe(SID);
    expect(body.accountId).toBe(UID);
    expect(body.userId).toBe(UID);
    expect(body.mfaAt).toBe(mfa.toISOString());
    expect(body.mfaFactorRef).toBe("factor-ref-hash");
  });

  it("4. recovery (user + fresh signed_in_at, mfa_at null) → accountId set, userId/mfa undefined", async () => {
    const { sql } = fakeSessionDb({
      id: SID,
      row: {
        id: SID,
        user_id: UID,
        signed_in_at: new Date(),
        mfa_at: null,
        mfa_factor_ref: null,
      },
    });
    const app = await mount(sql);

    const { body } = await probe(app, `ts_session=${SID}`);

    expect(body.accountId).toBe(UID);
    expect(body.userId).toBeNull();
    expect(body.mfaAt).toBeNull();
    expect(body.mfaFactorRef).toBeNull();
  });

  it("5. window expired (signed_in_at 31 days ago) → all four undefined, NO second db write", async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const { sql, calls } = fakeSessionDb({
      id: SID,
      row: {
        id: SID,
        user_id: UID,
        signed_in_at: thirtyOneDaysAgo,
        mfa_at: thirtyOneDaysAgo,
        mfa_factor_ref: "factor-ref-hash",
      },
    });
    const app = await mount(sql);

    const { body } = await probe(app, `ts_session=${SID}`);

    expect(body.sessionId).toBe(SID);
    // Exactly one write (the last_seen_at UPDATE); the row is never rewritten
    // to clear the columns, and no INSERT happens.
    expect(calls.update).toBe(1);
    expect(calls.insert).toBe(0);
    expect(body.accountId).toBeNull();
    expect(body.userId).toBeNull();
    expect(body.mfaAt).toBeNull();
    expect(body.mfaFactorRef).toBeNull();
  });

  it("6. malformed uuid cookie → driver rejects → catch → INSERT path, anonymous", async () => {
    const { sql, calls } = fakeSessionDb();
    const app = await mount(sql);

    const { res, body } = await probe(app, "ts_session=not-a-uuid");

    expect(calls.insert).toBe(1);
    expect(body.sessionId).toBe(NEW_ID);
    expect(cookieValue(setCookieFor(res, "ts_session")!)).toBe(NEW_ID);
    expect(body.accountId).toBeNull();
    expect(body.userId).toBeNull();
  });
});

describe("session middleware — device cookie stays pinned", () => {
  it("7a. absent ts_device → a uuid is minted and set", async () => {
    const { sql } = fakeSessionDb();
    const app = await mount(sql);

    const { res, body } = await probe(app);

    expect(UUID_RE.test(body.deviceId)).toBe(true);
    const header = setCookieFor(res, "ts_device")!;
    expect(header).toBeDefined();
    expect(cookieValue(header)).toBe(body.deviceId);
    expect(header).toContain("Max-Age=31536000");
  });

  it("7b. present valid ts_device → preserved untouched", async () => {
    const { sql } = fakeSessionDb();
    const app = await mount(sql);

    const { res, body } = await probe(app, `ts_device=${DEVICE}`);

    expect(body.deviceId).toBe(DEVICE);
    expect(cookieValue(setCookieFor(res, "ts_device")!)).toBe(DEVICE);
  });
});
