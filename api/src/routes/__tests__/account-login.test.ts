// Sign-in ceremonies for the account router (Task 8): login start/finish
// (usernameless, discoverable), recover (single-use recovery code → restricted
// session), and logout (this-browser / everywhere, idempotent, recovery
// INCLUDED).
//
// House pattern (mirrors account-register.test.ts): Postgres is faked in-memory
// with a template-tag `sql` that string-matches the exact statements the router
// emits and models every table it touches, so counter persistence, rotation,
// entity re-parenting and single-use redemption are REAL assertions on state,
// not call counts. Only ../../db.js is mocked — the WebAuthn helpers, the real
// @simplewebauthn verifier, and the software authenticator all run for real.

import { describe, it, expect, vi, afterEach } from "vitest";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type { SoftAuthenticator } from "../../__tests__/webauthn-authenticator.js";
import { createSoftAuthenticator } from "../../__tests__/webauthn-authenticator.js";
import { hashRecoveryCode, mfaFactorRef } from "../../webauthn.js";

const ORIGIN = "http://localhost:3000";
const SID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // this browser's session
const SID2 = "cccccccc-cccc-cccc-cccc-cccccccccccc"; // another session, same account
const OTHER_SID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"; // a different account's session
const UID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; // the account signing in
const OTHER_UID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const WAU = isoBase64URL.fromBuffer(new Uint8Array(32));

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../../db.js");
});

type UserRow = { id: string; webauthn_user_id: string; name: string };
type PasskeyRow = {
  id: string;
  user_id: string;
  public_key: unknown;
  counter: number;
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
type ChallengeRow = {
  session_id: string;
  challenge: string;
  kind: string;
  webauthn_user_id: string | null;
  user_name: string | null;
  expires_at: Date;
};

interface Seed {
  users?: UserRow[];
  passkeys?: PasskeyRow[];
  recoveryCodes?: RecoveryRow[];
  sessions?: SessionRow[];
  entities?: EntityRow[];
}

/** In-memory Postgres covering every table the login/recover/logout routes
    touch. Substring-matched on the lowercased template; anything unrecognised
    throws so an unexpected write blows the test up on contact. */
function makeDb(seed: Seed = {}) {
  const db = {
    challenges: [] as ChallengeRow[],
    users: [...(seed.users ?? [])] as UserRow[],
    passkeys: [...(seed.passkeys ?? [])] as PasskeyRow[],
    recoveryCodes: [...(seed.recoveryCodes ?? [])] as RecoveryRow[],
    sessions: [...(seed.sessions ?? [])] as SessionRow[],
    entities: [...(seed.entities ?? [])] as EntityRow[],
  };
  const uuid = () => globalThis.crypto.randomUUID();

  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const t = strings.join("?").toLowerCase();
    if (values.some((v) => v === undefined)) {
      return Promise.reject(new Error("undefined value bound"));
    }

    // ---- webauthn_challenges ----
    if (t.includes("insert into webauthn_challenges")) {
      const [sid, challenge, kind, wau, name] = values as (string | null)[];
      const row: ChallengeRow = {
        session_id: sid as string,
        challenge: challenge as string,
        kind: kind as string,
        webauthn_user_id: wau,
        user_name: name,
        expires_at: new Date(Date.now() + 5 * 60 * 1000),
      };
      const i = db.challenges.findIndex((r) => r.session_id === sid);
      if (i >= 0) db.challenges[i] = row;
      else db.challenges.push(row);
      return Promise.resolve([row]);
    }
    if (t.includes("delete from webauthn_challenges") && t.includes("returning")) {
      const [sid, kind] = values as string[];
      const i = db.challenges.findIndex(
        (r) => r.session_id === sid && r.kind === kind && r.expires_at.getTime() > Date.now()
      );
      if (i === -1) return Promise.resolve([]);
      const [row] = db.challenges.splice(i, 1);
      return Promise.resolve([row]);
    }
    if (t.includes("delete from webauthn_challenges")) {
      return Promise.resolve([]); // opportunistic GC
    }

    // ---- passkeys ----
    if (t.includes("select id, user_id, public_key, counter from passkeys")) {
      const [id] = values as string[];
      const p = db.passkeys.find((r) => r.id === id);
      return Promise.resolve(
        p ? [{ id: p.id, user_id: p.user_id, public_key: p.public_key, counter: p.counter }] : []
      );
    }
    if (t.includes("update passkeys set counter")) {
      const [counter, id] = values as [number, string];
      const p = db.passkeys.find((r) => r.id === id);
      if (p) {
        p.counter = counter;
        p.last_used_at = new Date();
      }
      return Promise.resolve([]);
    }

    // ---- users ----
    if (t.includes("select id, name from users")) {
      const [id] = values as string[];
      const u = db.users.find((r) => r.id === id);
      return Promise.resolve(u ? [{ id: u.id, name: u.name }] : []);
    }

    // ---- entities ----
    if (t.includes("update entities set session_id")) {
      // rotation re-parent: anonymous entities follow the new session.
      const [newSid, oldSid] = values as string[];
      for (const e of db.entities) {
        if (e.session_id === oldSid && e.user_id === null) e.session_id = newSid;
      }
      return Promise.resolve([]);
    }
    if (t.includes("select count(*)::int as n from entities")) {
      const [sid] = values as string[];
      const n = db.entities.filter((e) => e.session_id === sid && e.user_id === null).length;
      return Promise.resolve([{ n }]);
    }

    // ---- recovery_codes ----
    if (t.includes("update recovery_codes set used_at")) {
      const [hash] = values as string[];
      const rc = db.recoveryCodes.find((r) => r.code_hash === hash && r.used_at === null);
      if (!rc) return Promise.resolve([]);
      rc.used_at = new Date();
      return Promise.resolve([{ user_id: rc.user_id }]);
    }
    if (t.includes("select count(*)::int as n from recovery_codes")) {
      const [uid] = values as string[];
      const n = db.recoveryCodes.filter((r) => r.user_id === uid && r.used_at === null).length;
      return Promise.resolve([{ n }]);
    }

    // ---- sessions ----
    if (t.includes("insert into sessions")) {
      const [uid, mfaAt, factorRef] = values as [string, Date | null, string | null];
      const row: SessionRow = {
        id: uuid(),
        user_id: uid,
        signed_in_at: new Date(),
        mfa_at: mfaAt,
        mfa_factor_ref: factorRef,
      };
      db.sessions.push(row);
      return Promise.resolve([{ id: row.id }]);
    }
    if (t.includes("delete from sessions")) {
      const [id] = values as string[];
      const i = db.sessions.findIndex((s) => s.id === id);
      if (i >= 0) db.sessions.splice(i, 1);
      return Promise.resolve([]);
    }
    if (t.includes("update sessions set user_id = null")) {
      // logout: clear the four signed-in columns.
      const clear = (s: SessionRow) => {
        s.user_id = null;
        s.signed_in_at = null;
        s.mfa_at = null;
        s.mfa_factor_ref = null;
      };
      if (t.includes("where user_id")) {
        const [uid] = values as string[];
        for (const s of db.sessions) if (s.user_id === uid) clear(s);
      } else {
        const [id] = values as string[];
        const s = db.sessions.find((r) => r.id === id);
        if (s) clear(s);
      }
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

function setCookieFor(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}
function cookieValue(header: string): string {
  const first = header.split(";")[0];
  return first.slice(first.indexOf("=") + 1);
}

async function loginStart(app: App, origin: string = ORIGIN) {
  return app.request("/v1/account/login/start", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: "{}",
  });
}
async function loginFinish(app: App, response: unknown, origin: string = ORIGIN) {
  return app.request("/v1/account/login/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ response }),
  });
}
async function recover(app: App, code: string, origin: string = ORIGIN) {
  return app.request("/v1/account/recover", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ code }),
  });
}
async function logout(app: App, body: Record<string, unknown> = {}, origin: string = ORIGIN) {
  return app.request("/v1/account/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

/** Drive an authentication ceremony through the software authenticator against
    the challenge login/start emitted; bend origin / rpId / uv / signCount to
    force failures. */
async function assert(
  auth: SoftAuthenticator,
  options: { challenge: string; rpId?: string },
  opts: { origin?: string; rpId?: string; uv?: boolean; signCount?: number } = {}
) {
  return auth.authenticate({
    challenge: options.challenge,
    origin: opts.origin ?? ORIGIN,
    rpId: opts.rpId ?? options.rpId ?? "localhost",
    uv: opts.uv ?? true,
    signCount: opts.signCount,
  });
}

/** A seeded account with one passkey (from a fresh soft authenticator) on an
    anonymous browser session that carries two anonymous entities. */
async function seededLogin(passkeyCounter = 0) {
  const auth = await createSoftAuthenticator();
  const { sql, db } = makeDb({
    users: [{ id: UID, webauthn_user_id: WAU, name: "Ada" }],
    passkeys: [
      {
        id: auth.credentialId,
        user_id: UID,
        public_key: auth.publicKey,
        counter: passkeyCounter,
        last_used_at: null,
      },
    ],
    sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
    entities: [
      { id: "e1", session_id: SID, user_id: null },
      { id: "e2", session_id: SID, user_id: null },
    ],
  });
  return { auth, sql, db };
}

// ---------------------------------------------------------------------------

describe("login — usernameless sign-in", () => {
  it("start emits a discoverable request (UV required, empty allowCredentials) and stashes the challenge", async () => {
    const { sql, db } = await seededLogin();
    const app = await mount(sql, { sessionId: SID });

    const res = await loginStart(app);
    expect(res.status).toBe(200);
    const options = (await res.json()) as {
      challenge: string;
      userVerification: string;
      allowCredentials?: unknown[];
    };
    expect(options.userVerification).toBe("required");
    expect(options.allowCredentials ?? []).toHaveLength(0);
    // Stored challenge is byte-for-byte the one the options carry, kind auth.
    expect(db.challenges).toHaveLength(1);
    expect(db.challenges[0].challenge).toBe(options.challenge);
    expect(db.challenges[0].kind).toBe("authentication");
  });

  it("full happy path: counter persisted, last_used set, session rotated, mfa_at set, entities re-parented NOT adopted", async () => {
    const { auth, sql, db } = await seededLogin();
    const app = await mount(sql, { sessionId: SID });

    const options = (await (await loginStart(app)).json()) as { challenge: string; rpId?: string };
    const response = await assert(auth, options);
    const res = await loginFinish(app, response);

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      signedIn: boolean;
      account: { id: string; name: string };
      claimableEntities: number;
    };
    expect(body.signedIn).toBe(true);
    expect(body.account).toEqual({ id: UID, name: "Ada" });
    // Anonymous entities followed the session but were NOT claimed.
    expect(body.claimableEntities).toBe(2);

    // Counter advanced (soft authenticator reports 1) and last_used_at stamped.
    const pk = db.passkeys[0];
    expect(pk.counter).toBe(1);
    expect(pk.last_used_at).not.toBeNull();

    // Rotation: old row gone, exactly one new full session remains.
    expect(db.sessions.find((s) => s.id === SID)).toBeUndefined();
    expect(db.sessions).toHaveLength(1);
    const rotated = db.sessions[0];
    expect(rotated.id).not.toBe(SID);
    expect(rotated.user_id).toBe(UID);
    expect(rotated.mfa_at).not.toBeNull();
    expect(rotated.mfa_factor_ref).toBe(mfaFactorRef(auth.credentialId));

    // Entities re-parented to the new session, still anonymous (login never adopts).
    expect(db.entities.every((e) => e.user_id === null && e.session_id === rotated.id)).toBe(true);

    // Cookie carries the rotated id, exact attributes.
    const cookie = setCookieFor(res, "ts_session")!;
    expect(cookieValue(cookie)).toBe(rotated.id);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=31536000");
  });

  it("unknown passkey (credential not on file) → 401 unknown_passkey", async () => {
    // Seed NO passkeys — the presented credential is a stranger.
    const auth = await createSoftAuthenticator();
    const { sql } = makeDb({
      sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
    });
    const app = await mount(sql, { sessionId: SID });

    const options = (await (await loginStart(app)).json()) as { challenge: string; rpId?: string };
    const response = await assert(auth, options);
    const res = await loginFinish(app, response);

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("unknown_passkey");
    expect(body.message).toBe(
      "We don't recognise that passkey. Lost them all? Use a recovery code."
    );
  });

  it("replayed finish (challenge already consumed) → 422 challenge_expired", async () => {
    const { auth, sql } = await seededLogin();
    const app = await mount(sql, { sessionId: SID });

    const options = (await (await loginStart(app)).json()) as { challenge: string; rpId?: string };
    const response = await assert(auth, options);
    expect((await loginFinish(app, response)).status).toBe(200);

    const second = await loginFinish(app, response);
    expect(second.status).toBe(422);
    expect((await second.json()).error).toBe("challenge_expired");
  });

  it("expired challenge → 422 challenge_expired", async () => {
    const { auth, sql, db } = await seededLogin();
    const app = await mount(sql, { sessionId: SID });

    const options = (await (await loginStart(app)).json()) as { challenge: string; rpId?: string };
    const response = await assert(auth, options);
    db.challenges[0].expires_at = new Date(Date.now() - 1000);

    const res = await loginFinish(app, response);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("challenge_expired");
  });

  it("ceremony at the wrong page origin → 422 ceremony_failed", async () => {
    const { auth, sql } = await seededLogin();
    const app = await mount(sql, { sessionId: SID });

    const options = (await (await loginStart(app)).json()) as { challenge: string; rpId?: string };
    const response = await assert(auth, options, { origin: "https://evil.example.com" });

    const res = await loginFinish(app, response);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("ceremony_failed");
  });

  it("counter regression (stored counter above the asserted one) → 422 ceremony_failed, hard fail kept", async () => {
    // Stored counter 5; the authenticator asserts 1 — the clone signal.
    const { auth, sql, db } = await seededLogin(5);
    const app = await mount(sql, { sessionId: SID });

    const options = (await (await loginStart(app)).json()) as { challenge: string; rpId?: string };
    const response = await assert(auth, options, { signCount: 1 });

    const res = await loginFinish(app, response);
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("ceremony_failed");
    // Counter left untouched — no session minted.
    expect(db.passkeys[0].counter).toBe(5);
    expect(db.sessions.find((s) => s.id === SID)).toBeDefined();
  });

  it("missing Origin on login/start → 403 bad_origin (per-file guard)", async () => {
    const { sql } = await seededLogin();
    const app = await mount(sql, { sessionId: SID });
    const res = await app.request("/v1/account/login/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("bad_origin");
  });
});

describe("recover — single-use recovery code → restricted session", () => {
  function recoverApp(goodCode: string) {
    return makeDb({
      users: [{ id: UID, webauthn_user_id: WAU, name: "Ada" }],
      sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
      recoveryCodes: [
        { code_hash: hashRecoveryCode("used-1"), user_id: UID, used_at: new Date() },
        { code_hash: hashRecoveryCode("used-2"), user_id: UID, used_at: new Date() },
        { code_hash: hashRecoveryCode("used-3"), user_id: UID, used_at: new Date() },
        { code_hash: hashRecoveryCode(goodCode), user_id: UID, used_at: null },
        { code_hash: hashRecoveryCode("spare-a"), user_id: UID, used_at: null },
        { code_hash: hashRecoveryCode("spare-b"), user_id: UID, used_at: null },
      ],
    });
  }

  it("happy: redeems the code, rotates to a RESTRICTED session (mfa_at NULL), reports codes left", async () => {
    const good = "wxyz-2345-6789";
    const { sql, db } = recoverApp(good);
    const app = await mount(sql, { sessionId: SID });

    const res = await recover(app, good);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      signedIn: boolean;
      mfa: boolean;
      addPasskeyNow: boolean;
      recoveryCodesLeft: number;
    };
    expect(body).toEqual({ signedIn: true, mfa: false, addPasskeyNow: true, recoveryCodesLeft: 2 });

    // The code is now spent.
    expect(db.recoveryCodes.find((r) => r.code_hash === hashRecoveryCode(good))!.used_at).not.toBeNull();

    // Rotation to a restricted session: old row gone, mfa_at + factor ref NULL.
    expect(db.sessions.find((s) => s.id === SID)).toBeUndefined();
    expect(db.sessions).toHaveLength(1);
    const rotated = db.sessions[0];
    expect(rotated.user_id).toBe(UID);
    expect(rotated.signed_in_at).not.toBeNull();
    expect(rotated.mfa_at).toBeNull();
    expect(rotated.mfa_factor_ref).toBeNull();
    expect(cookieValue(setCookieFor(res, "ts_session")!)).toBe(rotated.id);
  });

  it("normalises the code (spaces/dashes/case) before matching", async () => {
    const good = "wxyz-2345-6789";
    const { sql } = recoverApp(good);
    const app = await mount(sql, { sessionId: SID });
    // Same code, differently formatted.
    const res = await recover(app, "  WXYZ2345 6789 ");
    expect(res.status).toBe(200);
  });

  it("second redemption of the same code → 401 bad_recovery_code", async () => {
    const good = "wxyz-2345-6789";
    const { sql } = recoverApp(good);
    const app = await mount(sql, { sessionId: SID });

    expect((await recover(app, good)).status).toBe(200);
    const second = await recover(app, good);
    expect(second.status).toBe(401);
    const body = (await second.json()) as { error: string; message: string };
    expect(body.error).toBe("bad_recovery_code");
    expect(body.message).toBe("That code didn't match. Each code works exactly once.");
  });

  it("unknown code → 401 bad_recovery_code", async () => {
    const { sql } = recoverApp("wxyz-2345-6789");
    const app = await mount(sql, { sessionId: SID });
    const res = await recover(app, "nope-nope-nope");
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("bad_recovery_code");
  });

  it("restricted session can still sign out (logout works from a recovery session)", async () => {
    // A recovery session: accountId set, userId NOT (mfa_at null).
    const { sql, db } = makeDb({
      sessions: [{ id: SID, user_id: UID, signed_in_at: new Date(), mfa_at: null, mfa_factor_ref: null }],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID }); // no userId

    const res = await logout(app);
    expect(res.status).toBe(200);
    expect((await res.json()).signedOut).toBe("this-browser");
    const s = db.sessions.find((r) => r.id === SID)!;
    expect(s.user_id).toBeNull();
    expect(s.signed_in_at).toBeNull();
  });
});

describe("logout — this browser / everywhere / idempotent", () => {
  it("signed-in → this-browser clears the four columns on this session only", async () => {
    const { sql, db } = makeDb({
      sessions: [
        { id: SID, user_id: UID, signed_in_at: new Date(), mfa_at: new Date(), mfa_factor_ref: "ref" },
        { id: SID2, user_id: UID, signed_in_at: new Date(), mfa_at: new Date(), mfa_factor_ref: "ref" },
      ],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID, mfaAt: new Date(), mfaFactorRef: "ref" });

    const res = await logout(app);
    expect(res.status).toBe(200);
    expect((await res.json()).signedOut).toBe("this-browser");

    const here = db.sessions.find((s) => s.id === SID)!;
    expect(here).toMatchObject({ user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null });
    // The account's OTHER session is untouched.
    const other = db.sessions.find((s) => s.id === SID2)!;
    expect(other.user_id).toBe(UID);
  });

  it("everywhere → clears every session of this account, leaves other accounts alone", async () => {
    const { sql, db } = makeDb({
      sessions: [
        { id: SID, user_id: UID, signed_in_at: new Date(), mfa_at: new Date(), mfa_factor_ref: "ref" },
        { id: SID2, user_id: UID, signed_in_at: new Date(), mfa_at: new Date(), mfa_factor_ref: "ref" },
        { id: OTHER_SID, user_id: OTHER_UID, signed_in_at: new Date(), mfa_at: new Date(), mfa_factor_ref: "z" },
      ],
    });
    const app = await mount(sql, { sessionId: SID, accountId: UID, userId: UID, mfaAt: new Date(), mfaFactorRef: "ref" });

    const res = await logout(app, { everywhere: true });
    expect(res.status).toBe(200);
    expect((await res.json()).signedOut).toBe("everywhere");

    expect(db.sessions.find((s) => s.id === SID)!.user_id).toBeNull();
    expect(db.sessions.find((s) => s.id === SID2)!.user_id).toBeNull();
    // A different account keeps its session.
    expect(db.sessions.find((s) => s.id === OTHER_SID)!.user_id).toBe(OTHER_UID);
  });

  it("anonymous logout → 200 idempotent this-browser (no signed-in gate)", async () => {
    const { sql } = makeDb({
      sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
    });
    const app = await mount(sql, { sessionId: SID }); // anonymous

    const res = await logout(app);
    expect(res.status).toBe(200);
    expect((await res.json()).signedOut).toBe("this-browser");

    // everywhere from an anonymous caller must NOT clear by user_id (=null) —
    // it falls back to this-browser and never touches other rows.
    const res2 = await logout(app, { everywhere: true });
    expect(res2.status).toBe(200);
    expect((await res2.json()).signedOut).toBe("this-browser");
  });
});
