// Account management doors for the account router (Task 9): GET /v1/account
// (the three signed-in shapes), adopt (claim this browser's anonymous
// entities), DELETE /passkey/:credentialId (revoke — last-passkey refusal,
// cascades to every session it opened), and recovery-codes regeneration.
//
// House pattern (mirrors account-register.test.ts / account-login.test.ts):
// Postgres is faked in-memory with a template-tag `sql` that string-matches
// the exact statements the router emits and models every table it touches, so
// ownership, counts and cascades are REAL assertions on state, not call
// counts. Only ../../db.js is mocked.
//
// Mount-smoke note: index.ts starts a real server (serve(...), top-level
// await migrate()) at import time, so — same precedent as every other
// account-*.test.ts in this directory — it is never imported here. The mount
// line (`app.route('/v1/account', account)` after the session middleware) is
// verified by reading api/src/index.ts directly; see the self-review in
// task-9-report.md.

import { describe, it, expect, vi, afterEach } from "vitest";
import { mfaFactorRef } from "../../webauthn.js";

const ORIGIN = "http://localhost:3000";
const SID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // this browser's session
const SID2 = "cccccccc-cccc-cccc-cccc-cccccccccccc"; // another session, same account
const UID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; // the account under test
const OTHER_UID = "dddddddd-dddd-dddd-dddd-dddddddddddd"; // a different account
const CRED_A = "cred-a";
const CRED_B = "cred-b";
const CRED_OTHER = "cred-other"; // belongs to OTHER_UID
const CODE_RE = /^[a-z2-7]{4}(-[a-z2-7]{4})*(-[a-z2-7]{1,4})?$/;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../../db.js");
});

type UserRow = { id: string; name: string; created_at: Date };
type PasskeyRow = {
  id: string;
  user_id: string;
  nickname: string | null;
  created_at: Date;
  last_used_at: Date | null;
};
type RecoveryRow = { code_hash: string; user_id: string; used_at: Date | null };
type SessionRow = {
  id: string;
  user_id: string | null;
  signed_in_at: Date | null;
  mfa_at: Date | null;
  mfa_factor_ref: string | null;
};
type EntityRow = { id: string; session_id: string | null; user_id: string | null };

interface Seed {
  users?: UserRow[];
  passkeys?: PasskeyRow[];
  recoveryCodes?: RecoveryRow[];
  sessions?: SessionRow[];
  entities?: EntityRow[];
}

/** In-memory Postgres covering every table the manage routes touch.
    Substring-matched on the lowercased template; anything unrecognised
    throws so an unexpected write blows the test up on contact. */
function makeDb(seed: Seed = {}) {
  const db = {
    users: [...(seed.users ?? [])] as UserRow[],
    passkeys: [...(seed.passkeys ?? [])] as PasskeyRow[],
    recoveryCodes: [...(seed.recoveryCodes ?? [])] as RecoveryRow[],
    sessions: [...(seed.sessions ?? [])] as SessionRow[],
    entities: [...(seed.entities ?? [])] as EntityRow[],
  };

  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const t = strings.join("?").toLowerCase();
    if (values.some((v) => v === undefined)) {
      return Promise.reject(new Error("undefined value bound"));
    }

    // ---- GET / : who-am-I reads ----
    if (t.includes("select id, name, created_at from users")) {
      const [id] = values as string[];
      const u = db.users.find((r) => r.id === id);
      return Promise.resolve(u ? [{ id: u.id, name: u.name, created_at: u.created_at }] : []);
    }
    if (t.includes("select id, nickname, created_at, last_used_at from passkeys")) {
      const [uid] = values as string[];
      const rows = db.passkeys
        .filter((p) => p.user_id === uid)
        .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          created_at: p.created_at,
          last_used_at: p.last_used_at,
        }));
      return Promise.resolve(rows);
    }
    if (t.includes("select count(*)::int as n from recovery_codes")) {
      const [uid] = values as string[];
      const n = db.recoveryCodes.filter((r) => r.user_id === uid && r.used_at === null).length;
      return Promise.resolve([{ n }]);
    }
    if (t.includes("select count(*)::int as n from entities")) {
      const [sid] = values as string[];
      const n = db.entities.filter((e) => e.session_id === sid && e.user_id === null).length;
      return Promise.resolve([{ n }]);
    }

    // ---- adopt ----
    if (t.includes("update entities set user_id")) {
      const [uid, sid] = values as string[];
      const claimed = db.entities.filter((e) => e.session_id === sid && e.user_id === null);
      for (const e of claimed) {
        e.user_id = uid;
        e.session_id = null;
      }
      return Promise.resolve(claimed.map((e) => ({ id: e.id })));
    }

    // ---- delete passkey ----
    if (t.includes("select id, user_id from passkeys")) {
      const [id] = values as string[];
      const p = db.passkeys.find((r) => r.id === id);
      return Promise.resolve(p ? [{ id: p.id, user_id: p.user_id }] : []);
    }
    if (t.includes("select count(*)::int as n from passkeys")) {
      const [uid] = values as string[];
      const n = db.passkeys.filter((r) => r.user_id === uid).length;
      return Promise.resolve([{ n }]);
    }
    if (t.includes("update sessions set user_id = null") && t.includes("where mfa_factor_ref")) {
      const [ref] = values as string[];
      const affected = db.sessions.filter((s) => s.mfa_factor_ref === ref);
      for (const s of affected) {
        s.user_id = null;
        s.signed_in_at = null;
        s.mfa_at = null;
        s.mfa_factor_ref = null;
      }
      return Promise.resolve(affected.map((s) => ({ id: s.id })));
    }
    if (t.includes("delete from passkeys")) {
      const [id] = values as string[];
      const i = db.passkeys.findIndex((r) => r.id === id);
      if (i >= 0) db.passkeys.splice(i, 1);
      return Promise.resolve([]);
    }

    // ---- recovery-codes regen ----
    if (t.includes("delete from recovery_codes")) {
      const [uid] = values as string[];
      db.recoveryCodes = db.recoveryCodes.filter((r) => !(r.user_id === uid && r.used_at === null));
      return Promise.resolve([]);
    }
    if (t.includes("insert into recovery_codes")) {
      const [hash, uid] = values as string[];
      db.recoveryCodes.push({ code_hash: hash, user_id: uid, used_at: null });
      return Promise.resolve([]);
    }

    throw new Error(`makeDb: unrecognized query — ${t}`);
  }

  return { sql, db };
}

interface Ctx {
  sessionId: string;
  accountId?: string;
  userId?: string;
  mfaAt?: Date;
  mfaFactorRef?: string;
}

async function mount(sql: (s: TemplateStringsArray, ...v: unknown[]) => unknown, ctx: Ctx) {
  vi.doMock("../../db.js", () => ({ sql }));
  const { Hono } = await import("hono");
  const { account } = await import("../account.js");
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("sessionId", ctx.sessionId);
    c.set("accountId", ctx.accountId);
    c.set("userId", ctx.userId);
    c.set("mfaAt", ctx.mfaAt);
    c.set("mfaFactorRef", ctx.mfaFactorRef);
    await next();
  });
  app.route("/v1/account", account);
  return app;
}

type App = Awaited<ReturnType<typeof mount>>;

async function getAccount(app: App) {
  return app.request("/v1/account");
}
async function adopt(app: App, origin: string = ORIGIN) {
  return app.request("/v1/account/adopt", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: "{}",
  });
}
async function deletePasskey(app: App, credentialId: string, origin: string = ORIGIN) {
  return app.request(`/v1/account/passkey/${credentialId}`, {
    method: "DELETE",
    headers: { Origin: origin },
  });
}
async function regenCodes(app: App, origin: string = ORIGIN) {
  return app.request("/v1/account/recovery-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: "{}",
  });
}

// ---------------------------------------------------------------------------

describe("GET /v1/account — who am I", () => {
  it("anonymous → {signedIn:false}, nothing else", async () => {
    const { sql } = makeDb();
    const app = await mount(sql, { sessionId: SID });
    const res = await getAccount(app);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ signedIn: false });
  });

  it("full passkey session → every field, recoveryCodesLeft counts only unused, claimableEntities from THIS session", async () => {
    const created = new Date("2026-01-01T00:00:00.000Z");
    const pkCreatedA = new Date("2026-01-02T00:00:00.000Z");
    const pkCreatedB = new Date("2026-01-03T00:00:00.000Z");
    const lastUsedB = new Date("2026-01-04T00:00:00.000Z");
    const { sql } = makeDb({
      users: [{ id: UID, name: "Ada", created_at: created }],
      passkeys: [
        { id: CRED_A, user_id: UID, nickname: "MacBook", created_at: pkCreatedA, last_used_at: null },
        { id: CRED_B, user_id: UID, nickname: null, created_at: pkCreatedB, last_used_at: lastUsedB },
      ],
      recoveryCodes: [
        { code_hash: "used-1", user_id: UID, used_at: new Date() },
        { code_hash: "used-2", user_id: UID, used_at: new Date() },
        { code_hash: "used-3", user_id: UID, used_at: new Date() },
        { code_hash: "unused-1", user_id: UID, used_at: null },
        { code_hash: "unused-2", user_id: UID, used_at: null },
        { code_hash: "unused-3", user_id: UID, used_at: null },
        { code_hash: "unused-4", user_id: UID, used_at: null },
        // Another account's codes must never leak into this count.
        { code_hash: "other-unused", user_id: OTHER_UID, used_at: null },
      ],
      entities: [
        { id: "e1", session_id: SID, user_id: null },
        { id: "e2", session_id: SID, user_id: null },
        // Already adopted — must not count as claimable.
        { id: "e3", session_id: null, user_id: UID },
        // A different session's anonymous entity must not leak in either.
        { id: "e4", session_id: SID2, user_id: null },
      ],
    });
    const app = await mount(sql, {
      sessionId: SID,
      accountId: UID,
      userId: UID,
      mfaAt: new Date(),
      mfaFactorRef: "ref",
    });

    const res = await getAccount(app);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      signedIn: boolean;
      account: { id: string; name: string; createdAt: string };
      mfa: boolean;
      passkeys: { id: string; nickname: string | null; createdAt: string; lastUsedAt: string | null }[];
      recoveryCodesLeft: number;
      claimableEntities: number;
    };
    expect(body.signedIn).toBe(true);
    expect(body.account).toEqual({ id: UID, name: "Ada", createdAt: created.toISOString() });
    expect(body.mfa).toBe(true);
    expect(body.passkeys).toEqual([
      { id: CRED_A, nickname: "MacBook", createdAt: pkCreatedA.toISOString(), lastUsedAt: null },
      { id: CRED_B, nickname: null, createdAt: pkCreatedB.toISOString(), lastUsedAt: lastUsedB.toISOString() },
    ]);
    expect(body.recoveryCodesLeft).toBe(4);
    expect(body.claimableEntities).toBe(2);
  });

  it("recovery session (accountId, no userId) → signedIn:true, mfa:false", async () => {
    const { sql } = makeDb({
      users: [{ id: UID, name: "Ada", created_at: new Date() }],
      recoveryCodes: [],
      passkeys: [],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID }); // no userId

    const res = await getAccount(app);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { signedIn: boolean; mfa: boolean; account: { id: string } };
    expect(body.signedIn).toBe(true);
    expect(body.mfa).toBe(false);
    expect(body.account.id).toBe(UID);
  });
});

describe("POST /v1/account/adopt — claim this browser's anonymous entities", () => {
  function adoptApp() {
    return makeDb({
      entities: [
        { id: "e1", session_id: SID, user_id: null },
        { id: "e2", session_id: SID, user_id: null },
        // A different session's anonymous entity must never be swept in.
        { id: "e3", session_id: SID2, user_id: null },
      ],
    });
  }

  it("happy: claims this session's anonymous entities, session_id cleared", async () => {
    const { sql, db } = adoptApp();
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID });

    const res = await adopt(app);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ adopted: 2 });

    expect(db.entities.find((e) => e.id === "e1")).toMatchObject({ user_id: UID, session_id: null });
    expect(db.entities.find((e) => e.id === "e2")).toMatchObject({ user_id: UID, session_id: null });
    // The other session's entity stays exactly as it was.
    expect(db.entities.find((e) => e.id === "e3")).toMatchObject({ user_id: null, session_id: SID2 });
  });

  it("idempotent: a second call finds nothing left to claim", async () => {
    const { sql } = adoptApp();
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID });

    expect((await (await adopt(app)).json())).toEqual({ adopted: 2 });
    const second = await adopt(app);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ adopted: 0 });
  });

  it("recovery session (no passkey) → 403 passkey_needed", async () => {
    const { sql } = adoptApp();
    const app = await mount(sql, { sessionId: SID, accountId: UID }); // no userId
    const res = await adopt(app);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("passkey_needed");
    expect(body.message).toBe("Add a passkey to open this door.");
  });

  it("anonymous → 403 passkey_needed", async () => {
    const { sql } = adoptApp();
    const app = await mount(sql, { sessionId: SID });
    const res = await adopt(app);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("passkey_needed");
  });
});

describe("DELETE /v1/account/passkey/:credentialId — revoke", () => {
  it("the account's LAST passkey → 422 last_passkey, nothing deleted", async () => {
    const { sql, db } = makeDb({
      passkeys: [
        { id: CRED_A, user_id: UID, nickname: null, created_at: new Date(), last_used_at: null },
      ],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID });

    const res = await deletePasskey(app, CRED_A);
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("last_passkey");
    expect(body.message).toBe("This is your only passkey. Add another before removing it.");
    expect(db.passkeys).toHaveLength(1);
  });

  it("two passkeys: deleting one signs out every session it opened (cleared, not deleted) and removes the passkey row", async () => {
    const { sql, db } = makeDb({
      passkeys: [
        { id: CRED_A, user_id: UID, nickname: "Old", created_at: new Date(), last_used_at: null },
        { id: CRED_B, user_id: UID, nickname: "Spare", created_at: new Date(), last_used_at: null },
      ],
      sessions: [
        {
          id: SID,
          user_id: UID,
          signed_in_at: new Date(),
          mfa_at: new Date(),
          mfa_factor_ref: mfaFactorRef(CRED_A),
        },
        // A second session opened by the SAME credential — must also clear.
        {
          id: SID2,
          user_id: UID,
          signed_in_at: new Date(),
          mfa_at: new Date(),
          mfa_factor_ref: mfaFactorRef(CRED_A),
        },
      ],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID });

    const res = await deletePasskey(app, CRED_A);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, sessionsSignedOut: 2 });

    // Passkey row is gone; the other passkey survives.
    expect(db.passkeys.find((p) => p.id === CRED_A)).toBeUndefined();
    expect(db.passkeys.find((p) => p.id === CRED_B)).toBeDefined();

    // Sessions are CLEARED (rows still exist), not deleted.
    expect(db.sessions).toHaveLength(2);
    for (const sid of [SID, SID2]) {
      const s = db.sessions.find((r) => r.id === sid)!;
      expect(s).toMatchObject({ user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null });
    }
  });

  it("someone else's credentialId → 404 no_such_door (same answer as unknown, no enumeration)", async () => {
    const { sql, db } = makeDb({
      passkeys: [
        { id: CRED_A, user_id: UID, nickname: null, created_at: new Date(), last_used_at: null },
        { id: CRED_OTHER, user_id: OTHER_UID, nickname: null, created_at: new Date(), last_used_at: null },
      ],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID });

    const res = await deletePasskey(app, CRED_OTHER);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
    // Untouched — the wrong-owner passkey survives.
    expect(db.passkeys.find((p) => p.id === CRED_OTHER)).toBeDefined();
  });

  it("unknown credentialId → 404 no_such_door", async () => {
    const { sql } = makeDb({
      passkeys: [
        { id: CRED_A, user_id: UID, nickname: null, created_at: new Date(), last_used_at: null },
      ],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID });

    const res = await deletePasskey(app, "does-not-exist");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });

  it("recovery session (no passkey) → 403 passkey_needed", async () => {
    const { sql } = makeDb({
      passkeys: [
        { id: CRED_A, user_id: UID, nickname: null, created_at: new Date(), last_used_at: null },
      ],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID }); // no userId

    const res = await deletePasskey(app, CRED_A);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("passkey_needed");
  });
});

describe("POST /v1/account/recovery-codes — regenerate", () => {
  function regenApp() {
    return makeDb({
      recoveryCodes: [
        { code_hash: "used-1", user_id: UID, used_at: new Date() },
        { code_hash: "used-2", user_id: UID, used_at: new Date() },
        { code_hash: "unused-1", user_id: UID, used_at: null },
        { code_hash: "unused-2", user_id: UID, used_at: null },
        { code_hash: "unused-3", user_id: UID, used_at: null },
        // A different account's rows must be left completely alone.
        { code_hash: "other-used", user_id: OTHER_UID, used_at: new Date() },
        { code_hash: "other-unused", user_id: OTHER_UID, used_at: null },
      ],
    });
  }

  it("old unused rows gone, used rows KEPT, exactly 10 fresh codes minted", async () => {
    const { sql, db } = regenApp();
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID });

    const res = await regenCodes(app);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recoveryCodes: string[] };
    expect(body.recoveryCodes).toHaveLength(10);
    for (const code of body.recoveryCodes) expect(code).toMatch(CODE_RE);

    // Old used rows survive (the audit trail of what has been redeemed).
    expect(db.recoveryCodes.find((r) => r.code_hash === "used-1")).toBeDefined();
    expect(db.recoveryCodes.find((r) => r.code_hash === "used-2")).toBeDefined();
    // Old unused rows are gone — replaced, not left valid alongside the new ones.
    expect(db.recoveryCodes.find((r) => r.code_hash === "unused-1")).toBeUndefined();
    expect(db.recoveryCodes.find((r) => r.code_hash === "unused-2")).toBeUndefined();
    expect(db.recoveryCodes.find((r) => r.code_hash === "unused-3")).toBeUndefined();
    // Exactly 10 unused rows remain for this account (the freshly minted ones).
    expect(db.recoveryCodes.filter((r) => r.user_id === UID && r.used_at === null)).toHaveLength(10);
    // Another account's rows are completely untouched.
    expect(db.recoveryCodes.find((r) => r.code_hash === "other-used")).toBeDefined();
    expect(db.recoveryCodes.find((r) => r.code_hash === "other-unused")).toBeDefined();
  });

  it("recovery session (no passkey) → 403 passkey_needed", async () => {
    const { sql } = regenApp();
    const app = await mount(sql, { sessionId: SID, accountId: UID }); // no userId
    const res = await regenCodes(app);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("passkey_needed");
  });
});
