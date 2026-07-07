// Register ceremonies for the account router (Task 7): create-an-account,
// add-another-passkey, and the recovery-session upgrade — plus the shared
// origin guard.
//
// House pattern: Postgres is faked in-memory with a template-tag `sql` that
// string-matches the exact statements the router emits and models every table
// it touches (webauthn_challenges, users, passkeys, recovery_codes, sessions,
// entities), so ownership, rotation, adoption and single-use consumption are
// REAL assertions on state, not call counts. Only ../../db.js is mocked — the
// WebAuthn helpers, the real @simplewebauthn verifier, and the software
// authenticator all run for real, driving each ceremony end to end.

import { describe, it, expect, vi, afterEach } from "vitest";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { createSoftAuthenticator } from "../../__tests__/webauthn-authenticator.js";
import { mfaFactorRef } from "../../webauthn.js";

// In the (non-production) test env, config defaults these; corsOrigins carries
// localhost:3000, so it is the Origin every legitimate request sends.
const ORIGIN = "http://localhost:3000";
const SID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // this browser's old session
const UID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"; // an existing account
const OTHER_UID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
// A valid opaque base64url handle (32 zero bytes) for seeded accounts.
const WAU = isoBase64URL.fromBuffer(new Uint8Array(32));
const CODE_RE = /^[a-z2-7]{4}(-[a-z2-7]{4})*(-[a-z2-7]{1,4})?$/;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("../../db.js");
  vi.unstubAllEnvs();
});

type ChallengeRow = {
  session_id: string;
  challenge: string;
  kind: string;
  webauthn_user_id: string | null;
  user_name: string | null;
  expires_at: Date;
};
type UserRow = { id: string; webauthn_user_id: string; name: string };
type PasskeyRow = {
  id: string;
  user_id: string;
  public_key: unknown;
  counter: number;
  transports: string[] | null;
  nickname: string | null;
};
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
  sessions?: SessionRow[];
  entities?: EntityRow[];
}

/** A single in-memory Postgres covering every table the register routes touch.
    Statements are matched by substring on the lowercased template; anything
    unrecognised throws, so an unexpected write blows the test up on contact. */
function makeDb(seed: Seed = {}) {
  const db = {
    challenges: [] as ChallengeRow[],
    users: [...(seed.users ?? [])] as UserRow[],
    passkeys: [...(seed.passkeys ?? [])] as PasskeyRow[],
    recoveryCodes: [] as { code_hash: string; user_id: string }[],
    sessions: [...(seed.sessions ?? [])] as SessionRow[],
    entities: [...(seed.entities ?? [])] as EntityRow[],
  };
  const uuid = () => globalThis.crypto.randomUUID();

  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const t = strings.join("?").toLowerCase();
    // A bare JS undefined would silently mis-bind on the real driver.
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

    // ---- users ----
    if (t.includes("select webauthn_user_id, name from users")) {
      const [id] = values as string[];
      const u = db.users.find((r) => r.id === id);
      return Promise.resolve(u ? [{ webauthn_user_id: u.webauthn_user_id, name: u.name }] : []);
    }
    if (t.includes("insert into users")) {
      const [wau, name] = values as string[];
      const row: UserRow = { id: uuid(), webauthn_user_id: wau, name };
      db.users.push(row);
      return Promise.resolve([{ id: row.id, name: row.name }]);
    }

    // ---- passkeys ----
    if (t.includes("select id, transports from passkeys")) {
      const [uid] = values as string[];
      return Promise.resolve(
        db.passkeys
          .filter((p) => p.user_id === uid)
          .map((p) => ({ id: p.id, transports: p.transports }))
      );
    }
    if (t.includes("insert into passkeys")) {
      const [id, uid, publicKey, counter, transports, nickname] = values as [
        string,
        string,
        unknown,
        number,
        string[] | null,
        string | null,
      ];
      if (db.passkeys.some((p) => p.id === id)) {
        // unique_violation on the credential-id primary key.
        return Promise.reject(Object.assign(new Error("duplicate key"), { code: "23505" }));
      }
      db.passkeys.push({ id, user_id: uid, public_key: publicKey, counter, transports, nickname });
      return Promise.resolve([]);
    }

    // ---- entities ----
    if (t.includes("update entities set user_id")) {
      // adoption: claim this session's anonymous entities into the account.
      const [uid, sid] = values as string[];
      const claimed = db.entities.filter((e) => e.session_id === sid && e.user_id === null);
      for (const e of claimed) {
        e.user_id = uid;
        e.session_id = null;
      }
      return Promise.resolve(claimed.map((e) => ({ id: e.id })));
    }
    if (t.includes("update entities set session_id")) {
      // rotation re-parent: anonymous entities follow the new session.
      const [newSid, oldSid] = values as string[];
      for (const e of db.entities) {
        if (e.session_id === oldSid && e.user_id === null) e.session_id = newSid;
      }
      return Promise.resolve([]);
    }

    // ---- recovery_codes ----
    if (t.includes("insert into recovery_codes")) {
      const [hash, uid] = values as string[];
      db.recoveryCodes.push({ code_hash: hash, user_id: uid });
      return Promise.resolve([]);
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

async function start(app: App, body: Record<string, unknown> = {}, origin: string = ORIGIN) {
  return app.request("/v1/account/passkey/register/start", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
async function finish(
  app: App,
  response: unknown,
  extra: { nickname?: string; origin?: string } = {}
) {
  const body: Record<string, unknown> = { response };
  if (extra.nickname) body.nickname = extra.nickname;
  return app.request("/v1/account/passkey/register/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: extra.origin ?? ORIGIN },
    body: JSON.stringify(body),
  });
}

/** Run a real ceremony from start options through the software authenticator,
    letting the caller bend origin / rpId / uv to force failures. */
async function ceremony(
  options: { challenge: string; rp: { id: string } },
  opts: { origin?: string; rpId?: string; uv?: boolean } = {}
) {
  const auth = await createSoftAuthenticator();
  const response = await auth.register({
    challenge: options.challenge,
    origin: opts.origin ?? ORIGIN,
    rpId: opts.rpId ?? options.rp.id,
    uv: opts.uv ?? true,
  });
  return { auth, response };
}

// ---------------------------------------------------------------------------

describe("register — create an account (anonymous)", () => {
  function anonApp() {
    const { sql, db } = makeDb({
      sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
      entities: [
        { id: "e1", session_id: SID, user_id: null },
        { id: "e2", session_id: SID, user_id: null },
      ],
    });
    return { sql, db };
  }

  it("full happy path: ceremony → account, adoption, 10 codes, rotation", async () => {
    const { sql, db } = anonApp();
    const app = await mount(sql, { sessionId: SID });

    const startRes = await start(app, { name: "Ada" });
    expect(startRes.status).toBe(200);
    const options = (await startRes.json()) as { challenge: string; rp: { id: string }; user: { name: string } };
    expect(options.user.name).toBe("Ada");
    // The stored challenge equals the options challenge (byte-for-byte).
    expect(db.challenges).toHaveLength(1);
    expect(db.challenges[0].challenge).toBe(options.challenge);

    const { response } = await ceremony(options);
    const finRes = await finish(app, response, { nickname: "MacBook" });

    expect(finRes.status).toBe(200);
    const body = (await finRes.json()) as {
      signedIn: boolean;
      account: { id: string; name: string };
      adoptedEntities: number;
      recoveryCodes: string[];
    };
    expect(body.signedIn).toBe(true);
    expect(body.account.name).toBe("Ada");
    expect(body.adoptedEntities).toBe(2);
    expect(body.recoveryCodes).toHaveLength(10);
    for (const code of body.recoveryCodes) expect(code).toMatch(CODE_RE);

    // A user + a passkey exist; recovery hashes stored; challenge consumed.
    expect(db.users).toHaveLength(1);
    expect(db.users[0].id).toBe(body.account.id);
    expect(db.passkeys).toHaveLength(1);
    expect(db.passkeys[0].id).toBe(response.id);
    expect(db.passkeys[0].user_id).toBe(body.account.id);
    expect(db.passkeys[0].nickname).toBe("MacBook");
    expect(db.recoveryCodes).toHaveLength(10);
    expect(db.challenges).toHaveLength(0);

    // Entities adopted: account-owned, session cleared.
    expect(db.entities.every((e) => e.user_id === body.account.id && e.session_id === null)).toBe(true);

    // Rotation: the old row is gone, exactly one new signed-in row remains,
    // and the ts_session cookie carries its id.
    expect(db.sessions.find((s) => s.id === SID)).toBeUndefined();
    expect(db.sessions).toHaveLength(1);
    const rotated = db.sessions[0];
    expect(rotated.id).not.toBe(SID);
    expect(rotated.user_id).toBe(body.account.id);
    expect(rotated.mfa_at).not.toBeNull();
    expect(rotated.mfa_factor_ref).toBe(mfaFactorRef(response.id));

    const cookie = setCookieFor(finRes, "ts_session")!;
    expect(cookie).toBeDefined();
    expect(cookieValue(cookie)).toBe(rotated.id);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=31536000");
  });

  it("no name → default picker label", async () => {
    const { sql } = anonApp();
    const app = await mount(sql, { sessionId: SID });
    const startRes = await start(app);
    const options = (await startRes.json()) as { user: { name: string } };
    expect(options.user.name).toBe("TaxSorted user");
  });

  it("start alone creates NO user row — an abandoned ceremony leaves only a challenge", async () => {
    const { sql, db } = anonApp();
    const app = await mount(sql, { sessionId: SID });

    const res = await start(app, { name: "Ada" });
    expect(res.status).toBe(200);
    expect(db.users).toHaveLength(0);
    expect(db.passkeys).toHaveLength(0);
    expect(db.challenges).toHaveLength(1);
    expect(db.challenges[0].user_name).toBe("Ada");
    expect(db.challenges[0].webauthn_user_id).toBeTruthy();
  });
});

describe("register — add another passkey (full passkey session)", () => {
  function addApp() {
    const { sql, db } = makeDb({
      users: [{ id: UID, webauthn_user_id: WAU, name: "Existing" }],
      passkeys: [
        {
          id: "existing-cred-id",
          user_id: UID,
          public_key: new Uint8Array([1]),
          counter: 0,
          transports: ["internal"],
          nickname: "First",
        },
      ],
      sessions: [
        { id: SID, user_id: UID, signed_in_at: new Date(), mfa_at: new Date(), mfa_factor_ref: "ref" },
      ],
    });
    return { sql, db };
  }

  it("excludeCredentials lists the account's existing credential; finish adds a passkey for the SAME user, no rotation", async () => {
    const { sql, db } = addApp();
    const app = await mount(sql, {
      sessionId: SID,
      accountId: UID,
      userId: UID,
      mfaAt: new Date(),
      mfaFactorRef: "ref",
    });

    const startRes = await start(app);
    expect(startRes.status).toBe(200);
    const options = (await startRes.json()) as {
      challenge: string;
      rp: { id: string };
      user: { id: string; name: string };
      excludeCredentials: { id: string }[];
    };
    expect(options.excludeCredentials.map((x) => x.id)).toContain("existing-cred-id");
    // Reuses the account's stored handle + label.
    expect(options.user.id).toBe(WAU);
    expect(options.user.name).toBe("Existing");

    const { response } = await ceremony(options);
    const finRes = await finish(app, response, { nickname: "Phone" });

    expect(finRes.status).toBe(200);
    const body = (await finRes.json()) as { signedIn: boolean; passkey: { id: string; nickname: string } };
    expect(body.signedIn).toBe(true);
    expect(body.passkey.id).toBe(response.id);

    // Same user, no new user row, no rotation (session untouched).
    expect(db.users).toHaveLength(1);
    expect(db.passkeys).toHaveLength(2);
    expect(db.passkeys.find((p) => p.id === response.id)!.user_id).toBe(UID);
    expect(db.sessions).toHaveLength(1);
    expect(db.sessions[0].id).toBe(SID);
    // No session rotation → no ts_session Set-Cookie from this route.
    expect(setCookieFor(finRes, "ts_session")).toBeUndefined();
  });

  it("duplicate credential id → 409 passkey_already_registered", async () => {
    const { sql, db } = addApp();
    const app = await mount(sql, {
      sessionId: SID,
      accountId: UID,
      userId: UID,
      mfaAt: new Date(),
      mfaFactorRef: "ref",
    });
    const startRes = await start(app);
    const options = (await startRes.json()) as { challenge: string; rp: { id: string } };
    const { auth, response } = await ceremony(options);
    // Pre-seed the very credential this authenticator will present, under
    // another account — the global primary key collides on insert.
    db.passkeys.push({
      id: auth.credentialId,
      user_id: OTHER_UID,
      public_key: new Uint8Array([9]),
      counter: 0,
      transports: null,
      nickname: null,
    });

    const finRes = await finish(app, response);
    expect(finRes.status).toBe(409);
    expect((await finRes.json()).error).toBe("passkey_already_registered");
  });
});

describe("register — recovery-session upgrade (accountId without userId)", () => {
  function recoveryApp() {
    const { sql, db } = makeDb({
      users: [{ id: UID, webauthn_user_id: WAU, name: "Existing" }],
      passkeys: [
        {
          id: "old-cred",
          user_id: UID,
          public_key: new Uint8Array([1]),
          counter: 0,
          transports: ["internal"],
          nickname: "Lost device",
        },
      ],
      sessions: [
        { id: SID, user_id: UID, signed_in_at: new Date(), mfa_at: null, mfa_factor_ref: null },
      ],
    });
    return { sql, db };
  }

  it("finish adds a passkey and rotates to a FULL session (mfa_at + factor ref of the new credential)", async () => {
    const { sql, db } = recoveryApp();
    const app = await mount(sql, { sessionId: SID, accountId: UID }); // no userId

    const startRes = await start(app);
    const options = (await startRes.json()) as { challenge: string; rp: { id: string } };
    const { response } = await ceremony(options);
    const finRes = await finish(app, response, { nickname: "New phone" });

    expect(finRes.status).toBe(200);
    const body = (await finRes.json()) as { signedIn: boolean; mfa: boolean; passkey: { id: string } };
    expect(body.signedIn).toBe(true);
    expect(body.mfa).toBe(true);
    expect(body.passkey.id).toBe(response.id);

    // Passkey added to the account.
    expect(db.passkeys.find((p) => p.id === response.id)!.user_id).toBe(UID);

    // Rotated: old row gone, a new full session carries mfa_at + the new ref.
    expect(db.sessions.find((s) => s.id === SID)).toBeUndefined();
    expect(db.sessions).toHaveLength(1);
    const rotated = db.sessions[0];
    expect(rotated.user_id).toBe(UID);
    expect(rotated.mfa_at).not.toBeNull();
    expect(rotated.mfa_factor_ref).toBe(mfaFactorRef(response.id));
    expect(cookieValue(setCookieFor(finRes, "ts_session")!)).toBe(rotated.id);
  });
});

describe("register — origin guard", () => {
  it("missing Origin on a POST → 403 bad_origin", async () => {
    const { sql } = makeDb({
      sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
    });
    const app = await mount(sql, { sessionId: SID });
    const res = await app.request("/v1/account/passkey/register/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string; message: string };
    expect(body.error).toBe("bad_origin");
    expect(body.message).toBe("This request came from somewhere we don't recognise.");
  });

  it("foreign Origin → 403 bad_origin", async () => {
    const { sql } = makeDb({
      sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
    });
    const app = await mount(sql, { sessionId: SID });
    const res = await start(app, {}, "https://evil.example.com");
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("bad_origin");
  });
});

describe("register — ceremony negatives", () => {
  function anonApp() {
    return makeDb({
      sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
      entities: [],
    });
  }

  it("ceremony at the wrong page origin → 422 ceremony_failed (no user/passkey written)", async () => {
    const { sql, db } = anonApp();
    const app = await mount(sql, { sessionId: SID });
    const options = (await (await start(app)).json()) as { challenge: string; rp: { id: string } };
    const { response } = await ceremony(options, { origin: "https://evil.example.com" });

    const finRes = await finish(app, response);
    expect(finRes.status).toBe(422);
    expect((await finRes.json()).error).toBe("ceremony_failed");
    expect(db.users).toHaveLength(0);
    expect(db.passkeys).toHaveLength(0);
  });

  it("ceremony against the wrong rpID → 422 ceremony_failed", async () => {
    const { sql } = anonApp();
    const app = await mount(sql, { sessionId: SID });
    const options = (await (await start(app)).json()) as { challenge: string; rp: { id: string } };
    const { response } = await ceremony(options, { rpId: "evil.example.com" });

    const finRes = await finish(app, response);
    expect(finRes.status).toBe(422);
    expect((await finRes.json()).error).toBe("ceremony_failed");
  });

  it("user verification not performed (uv=false) → 422 ceremony_failed", async () => {
    const { sql } = anonApp();
    const app = await mount(sql, { sessionId: SID });
    const options = (await (await start(app)).json()) as { challenge: string; rp: { id: string } };
    const { response } = await ceremony(options, { uv: false });

    const finRes = await finish(app, response);
    expect(finRes.status).toBe(422);
    expect((await finRes.json()).error).toBe("ceremony_failed");
  });

  it("replayed finish (challenge already consumed) → 422 challenge_expired", async () => {
    const { sql } = anonApp();
    const app = await mount(sql, { sessionId: SID });
    const options = (await (await start(app)).json()) as { challenge: string; rp: { id: string } };
    const { response } = await ceremony(options);

    const first = await finish(app, response);
    expect(first.status).toBe(200);
    const second = await finish(app, response);
    expect(second.status).toBe(422);
    const body = (await second.json()) as { error: string; message: string };
    expect(body.error).toBe("challenge_expired");
    expect(body.message).toBe("That attempt took too long. Start again.");
  });

  it("expired challenge → 422 challenge_expired", async () => {
    const { sql, db } = anonApp();
    const app = await mount(sql, { sessionId: SID });
    const options = (await (await start(app)).json()) as { challenge: string; rp: { id: string } };
    const { response } = await ceremony(options);
    // Age the stored challenge past its window before finishing.
    db.challenges[0].expires_at = new Date(Date.now() - 1000);

    const finRes = await finish(app, response);
    expect(finRes.status).toBe(422);
    expect((await finRes.json()).error).toBe("challenge_expired");
  });
});

// ---------------------------------------------------------------------------
// The app is served from both the apex and www — config.webauthn.origins
// carries both under prod defaults, so a ceremony minted on either door must
// verify. These tests stub NODE_ENV=production (clearing the RP_ID/ORIGIN
// overrides) to exercise the real prod defaults, then reset via the shared
// afterEach above (resetModules + unstubAllEnvs) so later files see fresh env.
describe("register — apex + www origin acceptance (prod-config defaults)", () => {
  function prodAnonApp() {
    return makeDb({
      sessions: [{ id: SID, user_id: null, signed_in_at: null, mfa_at: null, mfa_factor_ref: null }],
      entities: [],
    });
  }

  const WWW = "https://www.taxsorted.io";

  it("a ceremony minted at https://www.taxsorted.io verifies (both doors accepted)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    const { sql, db } = prodAnonApp();
    const app = await mount(sql, { sessionId: SID });

    const startRes = await start(app, { name: "Ada" }, WWW);
    expect(startRes.status).toBe(200);
    const options = (await startRes.json()) as { challenge: string; rp: { id: string } };
    expect(options.rp.id).toBe("taxsorted.io");

    const { response } = await ceremony(options, { origin: WWW });
    const finRes = await finish(app, response, { origin: WWW });

    expect(finRes.status).toBe(200);
    expect(db.users).toHaveLength(1);
    expect(db.passkeys).toHaveLength(1);
  });

  it("widening to two doors is not widening to any door — a ceremony minted elsewhere still 422s", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    const { sql, db } = prodAnonApp();
    const app = await mount(sql, { sessionId: SID });

    const startRes = await start(app, {}, WWW);
    const options = (await startRes.json()) as { challenge: string; rp: { id: string } };
    // The HTTP Origin header (guard) says www — a recognised door — but the
    // ceremony itself was minted on a foreign origin baked into clientDataJSON.
    const { response } = await ceremony(options, { origin: "https://evil.example.com" });
    const finRes = await finish(app, response, { origin: WWW });

    expect(finRes.status).toBe(422);
    expect((await finRes.json()).error).toBe("ceremony_failed");
    expect(db.users).toHaveLength(0);
  });
});
