// Passkey accounts, part 1: the origin guard every mutating door on this
// router shares, plus the two register ceremonies —
//   • create-an-account  (anonymous caller): mint the account, adopt this
//     browser's anonymous entities, hand back ten recovery codes, and rotate
//     into a fresh signed-in session;
//   • add-another-passkey (full passkey session): register one more credential
//     against the same account;
//   • recovery-upgrade    (recovery session — accountId but no userId): the
//     ceremony IS a fresh user-verified assertion, so it earns back the full
//     data identity a recovery-code sign-in was denied.
// Login / recover / logout / manage land in this same router in Tasks 8-9; the
// guard and the rotateSession helper below are written to carry them.

import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  Uint8Array_,
  WebAuthnCredential,
} from "@simplewebauthn/server";
import { generateUserID, isoBase64URL } from "@simplewebauthn/server/helpers";
import { config } from "../config.js";
import { sql } from "../db.js";
import { setSessionCookie } from "../session.js";
import {
  consumeChallenge,
  hashRecoveryCode,
  mfaFactorRef,
  mintRecoveryCodes,
  putChallenge,
} from "../webauthn.js";

export const account = new Hono();

const RP_NAME = "TaxSorted";
// The picker label a brand-new account carries until it is renamed (renaming
// is an explicit v1 cut). Mirrors the users.name column default.
const DEFAULT_NAME = "TaxSorted user";

// Per-file origin guard (repo convention): every mutating call must carry an
// Origin header we recognise, else 403. SameSite=Lax still lets a sibling
// subdomain POST with our cookies attached; this closes that CSRF gap. GETs are
// exempt — they mutate nothing and every read is already owner-scoped.
account.use("*", async (c, next) => {
  if (c.req.method === "POST" || c.req.method === "DELETE") {
    const origin = c.req.header("Origin");
    if (!origin || !config.corsOrigins.includes(origin)) {
      return c.json(
        { error: "bad_origin", message: "This request came from somewhere we don't recognise." },
        403
      );
    }
  }
  await next();
});

const StartBody = z.object({
  // Only the label the passkey picker shows. Not an identifier.
  name: z.string().trim().max(64).optional(),
});

const FinishBody = z.object({
  // The ceremony JSON; @simplewebauthn does the deep validation, so we only
  // insist it is present and an object here.
  response: z.record(z.string(), z.unknown()),
  nickname: z.string().trim().max(64).optional(),
});

// login/finish carries only the assertion; there is no nickname to set on a
// sign-in (the passkey already exists).
const AuthFinishBody = z.object({
  response: z.record(z.string(), z.unknown()),
});

// recover redeems one recovery code. Any string; hashRecoveryCode normalises
// (strips spaces/dashes, lowercases) before the equality lookup.
const RecoverBody = z.object({
  code: z.string(),
});

// logout: optional "sign out of every browser" flag.
const LogoutBody = z.object({
  everywhere: z.boolean().optional(),
});

/** Rotate this request's session into a fresh signed-in row: fixation defeated
    (a brand-new id), this browser's still-anonymous entities re-parented so
    they follow the person, the old row deleted, and the ts_session cookie
    re-issued with the middleware's exact attributes. Statement order is
    deliberate — new row first, delete last — so a crash mid-rotation can only
    ever leave the person with a valid session, never none. */
async function rotateSession(
  c: Context,
  opts: { userId: string; mfaAt: Date | null; mfaFactorRef: string | null }
): Promise<string> {
  const oldSid = c.get("sessionId");
  const [row] = await sql`
    insert into sessions (user_id, signed_in_at, mfa_at, mfa_factor_ref)
    values (${opts.userId}, now(), ${opts.mfaAt}, ${opts.mfaFactorRef})
    returning id
  `;
  const newSid = row.id as string;
  await sql`
    update entities set session_id = ${newSid}
    where session_id = ${oldSid} and user_id is null
  `;
  await sql`delete from sessions where id = ${oldSid}`;
  setSessionCookie(c, newSid);
  return newSid;
}

/** Insert one passkey. Returns true on a duplicate credential id (Postgres
    23505 on the primary key) so the caller can answer 409; any other error
    propagates. */
async function insertPasskey(
  userId: string,
  cred: WebAuthnCredential,
  nickname: string | null
): Promise<{ duplicate: boolean }> {
  try {
    await sql`
      insert into passkeys (id, user_id, public_key, counter, transports, nickname)
      values (${cred.id}, ${userId}, ${cred.publicKey}, ${cred.counter}, ${cred.transports ?? null}, ${nickname})
    `;
    return { duplicate: false };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return { duplicate: true };
    throw e;
  }
}

function duplicatePasskey(c: Context) {
  return c.json(
    { error: "passkey_already_registered", message: "That passkey is already registered." },
    409
  );
}

function ceremonyFailed(c: Context) {
  return c.json(
    { error: "ceremony_failed", message: "That passkey didn't check out. Try again." },
    422
  );
}

// The [passkey] route-guard marker the plan defines. A handler calls it at its
// top and returns the result if it is truthy, else proceeds:
//   const gate = requirePasskey(c); if (gate) return gate;
// It demands a full data session (userId present); a recovery session — accountId
// but no userId — is turned away here, which is exactly how its restriction is
// enforced. Login / recover / logout in this file are open to anonymous and
// recovery callers by design, so they take no guard; Task 9's manage doors
// (adopt, delete passkey, regenerate codes) are the [passkey] doors that reuse
// this. ([signed-in] needs no helper: GET /account is anonymous-OK and logout is
// intentionally ungated for idempotency, so no route gates on accountId alone.)
function requirePasskey(c: Context) {
  if (!c.get("userId")) {
    return c.json({ error: "passkey_needed", message: "Add a passkey to open this door." }, 403);
  }
  return null;
}

// ---- POST /passkey/register/start -----------------------------------------
// Three moods, keyed off the caller's identity:
//   anonymous            → new account (fresh handle + label stashed on the
//                          challenge row; NO user row until a ceremony lands);
//   signed in (any means) → add a passkey to the existing account, reusing its
//                          stored handle and excluding credentials on file.
account.post("/passkey/register/start", async (c) => {
  const parsed = StartBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", message: "That name is too long." }, 422);
  }
  const sessionId = c.get("sessionId");
  const accountId = c.get("accountId");

  let userIdBytes: Uint8Array_;
  let webauthnUserId: string;
  let userName: string;
  let excludeCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];

  if (accountId) {
    // Signed in by ANY means (a full passkey session or a recovery session):
    // add another passkey to this account. Reuse the stored handle so a device
    // re-registering overwrites rather than duplicates, and exclude the
    // credentials already on file. The label is the account's own name; any
    // body name is ignored on this path.
    const [user] = await sql`select webauthn_user_id, name from users where id = ${accountId}`;
    webauthnUserId = user.webauthn_user_id as string;
    userName = user.name as string;
    userIdBytes = isoBase64URL.toBuffer(webauthnUserId);
    const existing = await sql`select id, transports from passkeys where user_id = ${accountId}`;
    excludeCredentials = existing.map((p) => ({
      id: p.id as string,
      transports: (p.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    }));
  } else {
    // Anonymous: a brand-new account. Mint a fresh opaque handle now, but write
    // NO user row — the handle and label ride on the challenge row, so an
    // abandoned ceremony leaves nothing behind.
    userIdBytes = await generateUserID();
    webauthnUserId = isoBase64URL.fromBuffer(userIdBytes);
    userName = parsed.data.name || DEFAULT_NAME;
  }

  const challenge = await putChallenge(sql, sessionId, "registration", { webauthnUserId, userName });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: config.webauthn.rpId,
    userName,
    userID: userIdBytes,
    // Hand generateRegistrationOptions the stored challenge's raw bytes so the
    // options.challenge string it emits is byte-for-byte what we persisted —
    // verify compares expectedChallenge against exactly that.
    challenge: isoBase64URL.toBuffer(challenge),
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });

  return c.json(options);
});

// ---- POST /passkey/register/finish ----------------------------------------
account.post("/passkey/register/finish", async (c) => {
  const parsed = FinishBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", message: "That didn't look like a passkey response." }, 422);
  }
  const sessionId = c.get("sessionId");
  const accountId = c.get("accountId");
  const userId = c.get("userId");
  const nickname = parsed.data.nickname ?? null;

  // Atomic single-use: the challenge is deleted as it is read, so a replay or
  // two racing verifies can never both find it. Absent/expired → start again.
  const challengeRow = await consumeChallenge(sql, sessionId, "registration");
  if (!challengeRow) {
    return c.json({ error: "challenge_expired", message: "That attempt took too long. Start again." }, 422);
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: parsed.data.response as unknown as RegistrationResponseJSON,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: config.webauthn.origin,
      expectedRPID: config.webauthn.rpId,
      requireUserVerification: true,
    });
  } catch (e) {
    // Detail stays server-side only — the caller learns nothing that would help
    // forge a passing ceremony.
    console.error(`registration ceremony_failed: ${(e as Error).message}`);
    return ceremonyFailed(c);
  }
  if (!verification.verified || !verification.registrationInfo) {
    return ceremonyFailed(c);
  }
  const cred = verification.registrationInfo.credential;

  // ---- NEW ACCOUNT (anonymous caller) ----
  if (!accountId) {
    const [user] = await sql`
      insert into users (webauthn_user_id, name)
      values (${challengeRow.webauthn_user_id}, ${challengeRow.user_name ?? DEFAULT_NAME})
      returning id, name
    `;
    const newUserId = user.id as string;
    const { duplicate } = await insertPasskey(newUserId, cred, nickname);
    if (duplicate) return duplicatePasskey(c);

    // Auto-adopt this browser's anonymous entities — the same person the
    // anonymous model already trusted, now with an account to hang them on.
    // Clearing session_id makes ownership permanent, so deleting the old
    // session row during rotation can never cascade them away.
    const adopted = await sql`
      update entities set user_id = ${newUserId}, session_id = null
      where session_id = ${sessionId} and user_id is null
      returning id
    `;

    const { codes, hashes } = mintRecoveryCodes(10);
    for (const hash of hashes) {
      await sql`insert into recovery_codes (code_hash, user_id) values (${hash}, ${newUserId})`;
    }

    await rotateSession(c, {
      userId: newUserId,
      mfaAt: new Date(),
      mfaFactorRef: mfaFactorRef(cred.id),
    });

    return c.json({
      signedIn: true,
      account: { id: newUserId, name: user.name },
      adoptedEntities: adopted.length,
      recoveryCodes: codes,
    });
  }

  // ---- ADD PASSKEY (full passkey session) ----
  if (userId) {
    const { duplicate } = await insertPasskey(userId, cred, nickname);
    if (duplicate) return duplicatePasskey(c);
    return c.json({ signedIn: true, passkey: { id: cred.id, nickname } });
  }

  // ---- RECOVERY UPGRADE (accountId set, no userId) ----
  // The ceremony is a fresh user-verified assertion, so rotate the restricted
  // recovery session up to a full one: mfa_at now, the NEW credential as the
  // factor reference the fraud header reads.
  const { duplicate } = await insertPasskey(accountId, cred, nickname);
  if (duplicate) return duplicatePasskey(c);
  await rotateSession(c, {
    userId: accountId,
    mfaAt: new Date(),
    mfaFactorRef: mfaFactorRef(cred.id),
  });
  return c.json({ signedIn: true, passkey: { id: cred.id, nickname }, mfa: true });
});

// ---- POST /login/start ----------------------------------------------------
// Usernameless / discoverable sign-in: no allowCredentials, so the browser
// offers whatever resident passkey it holds for this rpID and the picker — not
// us — chooses the account. UV is required, which is what makes the resulting
// session honest enough to assert Gov-Client-Multi-Factor. Anonymous-accessible
// (this IS the sign-in door); the challenge rides one row per session.
account.post("/login/start", async (c) => {
  const sessionId = c.get("sessionId");
  const challenge = await putChallenge(sql, sessionId, "authentication");
  const options = await generateAuthenticationOptions({
    rpID: config.webauthn.rpId,
    userVerification: "required",
    // Empty on purpose — discoverable credentials, chosen by the authenticator.
    allowCredentials: [],
    // Emit exactly the bytes we stored, so verify's expectedChallenge matches.
    challenge: isoBase64URL.toBuffer(challenge),
  });
  return c.json(options);
});

// ---- POST /login/finish ---------------------------------------------------
// Verify the assertion, advance the stored counter, and rotate into a fresh
// FULL session. Rotation re-parents this browser's still-anonymous entities so
// they follow the person, but login NEVER claims them — they stay claimable and
// an explicit adopt door (Task 9) is the only thing that hangs them on the
// account.
account.post("/login/finish", async (c) => {
  const parsed = AuthFinishBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", message: "That didn't look like a passkey response." }, 422);
  }
  const sessionId = c.get("sessionId");
  const response = parsed.data.response as unknown as AuthenticationResponseJSON;

  // Atomic single-use: the challenge is deleted as it is read, so a replay or
  // two racing verifies can never both find it. Absent/expired → start again.
  const challengeRow = await consumeChallenge(sql, sessionId, "authentication");
  if (!challengeRow) {
    return c.json({ error: "challenge_expired", message: "That attempt took too long. Start again." }, 422);
  }

  // Discoverable sign-in hands us the credential id; look up the passkey it
  // names. No row → they are asserting a credential we have never seen.
  const [passkey] = await sql`
    select id, user_id, public_key, counter from passkeys where id = ${response.id}
  `;
  if (!passkey) {
    return c.json(
      {
        error: "unknown_passkey",
        message: "We don't recognise that passkey. Lost them all? Use a recovery code.",
      },
      401
    );
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: config.webauthn.origin,
      expectedRPID: config.webauthn.rpId,
      requireUserVerification: true,
      credential: {
        id: passkey.id as string,
        publicKey: passkey.public_key as Uint8Array_,
        // Postgres bigint arrives as a string; the verifier wants a number. A
        // regression against this stored value is the clone signal — the
        // library hard-fails it and we keep that, surfacing it as ceremony_failed.
        counter: Number(passkey.counter),
      },
    });
  } catch (e) {
    // Detail stays server-side only. A counter regression lands here too — log
    // it loudly, it is a genuine clone signal, not just a fumbled ceremony.
    console.error(`login ceremony_failed: ${(e as Error).message}`);
    return ceremonyFailed(c);
  }
  if (!verification.verified) {
    return ceremonyFailed(c);
  }

  const accountId = passkey.user_id as string;
  // Persist the advanced counter + touch last_used_at BEFORE rotating, so a
  // crash after this leaves the replay defence updated either way.
  await sql`
    update passkeys set counter = ${verification.authenticationInfo.newCounter}, last_used_at = now()
    where id = ${passkey.id}
  `;

  const newSid = await rotateSession(c, {
    userId: accountId,
    mfaAt: new Date(),
    mfaFactorRef: mfaFactorRef(passkey.id as string),
  });

  const [user] = await sql`select id, name from users where id = ${accountId}`;
  // The entities rotation just re-parented onto the new session — still
  // anonymous, so still claimable until the person explicitly adopts them.
  const [{ n: claimableEntities }] = await sql`
    select count(*)::int as n from entities where session_id = ${newSid} and user_id is null
  `;

  return c.json({
    signedIn: true,
    account: { id: accountId, name: user.name },
    claimableEntities,
  });
});

// ---- POST /recover --------------------------------------------------------
// The passkey-less way back in: redeem one single-use recovery code. The redeem
// is atomic (update ... where used_at is null returning) so a code can never be
// spent twice, even under a race. Success earns a RESTRICTED session — accountId
// but no userId (mfa_at NULL) — enough to add a passkey or sign out, nothing
// that touches tax data. Anonymous-accessible: you recover precisely when you
// cannot sign in.
account.post("/recover", async (c) => {
  const parsed = RecoverBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", message: "Enter a recovery code." }, 422);
  }
  const codeHash = hashRecoveryCode(parsed.data.code);
  const [redeemed] = await sql`
    update recovery_codes set used_at = now()
    where code_hash = ${codeHash} and used_at is null
    returning user_id
  `;
  if (!redeemed) {
    return c.json(
      { error: "bad_recovery_code", message: "That code didn't match. Each code works exactly once." },
      401
    );
  }
  const accountId = redeemed.user_id as string;

  // Restricted: signed_in_at now (accountId lights up) but mfa_at / factor ref
  // NULL, so the data identity stays dark until a passkey is added.
  await rotateSession(c, { userId: accountId, mfaAt: null, mfaFactorRef: null });

  const [{ n: recoveryCodesLeft }] = await sql`
    select count(*)::int as n from recovery_codes where user_id = ${accountId} and used_at is null
  `;

  return c.json({ signedIn: true, mfa: false, addPasskeyNow: true, recoveryCodesLeft });
});

// ---- POST /logout ---------------------------------------------------------
// Clear the four signed-in columns. Idempotent by design — no signed-in gate,
// so a repeat call on an already-anonymous session still answers 200. Recovery
// sessions are included (accountId is enough to sign out). "everywhere" clears
// every session of the account; it is guarded on accountId so an anonymous
// caller can never trigger a `where user_id = null` sweep, falling back to a
// harmless this-browser clear instead.
account.post("/logout", async (c) => {
  const parsed = LogoutBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: "invalid_request", message: "That request didn't look right." }, 422);
  }
  const accountId = c.get("accountId");

  if (parsed.data.everywhere && accountId) {
    await sql`
      update sessions set user_id = null, signed_in_at = null, mfa_at = null, mfa_factor_ref = null
      where user_id = ${accountId}
    `;
    return c.json({ signedOut: "everywhere" });
  }

  await sql`
    update sessions set user_id = null, signed_in_at = null, mfa_at = null, mfa_factor_ref = null
    where id = ${c.get("sessionId")}
  `;
  return c.json({ signedOut: "this-browser" });
});

// ---- GET / (mounted as GET /v1/account) ------------------------------------
// Anonymous OK — the one door on this router that answers strangers instead
// of turning them away. Three shapes ride on the accountId/userId pair the
// middleware already computed:
//   • anonymous (no accountId)                 → {signedIn:false}
//   • full passkey session (userId present)    → mfa:true, every field below
//   • recovery session (accountId, no userId)  → mfa:false, same shape — a
//     recovery caller can see their own account, just not sign it as
//     MFA-asserted.
account.get("/", async (c) => {
  const accountId = c.get("accountId");
  if (!accountId) return c.json({ signedIn: false });

  const [user] = await sql`select id, name, created_at from users where id = ${accountId}`;
  const passkeys = await sql`
    select id, nickname, created_at, last_used_at from passkeys
    where user_id = ${accountId}
    order by created_at
  `;
  const [{ n: recoveryCodesLeft }] = await sql`
    select count(*)::int as n from recovery_codes where user_id = ${accountId} and used_at is null
  `;
  const [{ n: claimableEntities }] = await sql`
    select count(*)::int as n from entities
    where session_id = ${c.get("sessionId")} and user_id is null
  `;

  return c.json({
    signedIn: true,
    account: { id: user.id as string, name: user.name as string, createdAt: user.created_at },
    mfa: Boolean(c.get("userId")),
    passkeys: passkeys.map((p) => ({
      id: p.id as string,
      nickname: p.nickname as string | null,
      createdAt: p.created_at,
      lastUsedAt: p.last_used_at,
    })),
    recoveryCodesLeft,
    claimableEntities,
  });
});

// ---- POST /adopt ------------------------------------------------------------
// [passkey]. Claims this browser's still-anonymous entities into the account
// — the explicit door login never walks through on its own (see login/finish's
// comment). Idempotent: a second call simply finds nothing left to claim.
account.post("/adopt", async (c) => {
  const gate = requirePasskey(c);
  if (gate) return gate;
  const userId = c.get("userId") ?? null;
  const adopted = await sql`
    update entities set user_id = ${userId}, session_id = null
    where session_id = ${c.get("sessionId")} and user_id is null
    returning id
  `;
  return c.json({ adopted: adopted.length });
});

// ---- DELETE /passkey/:credentialId ------------------------------------------
// [passkey]. Same 404 whether the credential is unknown or belongs to someone
// else's account — no enumeration. Refuses to remove the account's last
// passkey (zero passkeys would mean never signing back in to add another).
// Otherwise signs out every session that credential opened — found by
// re-deriving its mfa_factor_ref, the same join key sign-in stamps — THEN
// deletes the row. That can end the caller's OWN current session if they
// delete the passkey they used to get in; that is correct, not a bug.
account.delete("/passkey/:credentialId", async (c) => {
  const gate = requirePasskey(c);
  if (gate) return gate;
  const userId = c.get("userId") ?? null;
  const credentialId = c.req.param("credentialId");

  const [passkey] = await sql`select id, user_id from passkeys where id = ${credentialId}`;
  if (!passkey || passkey.user_id !== userId) {
    return c.json({ error: "no_such_door" }, 404);
  }

  const [{ n: passkeyCount }] = await sql`
    select count(*)::int as n from passkeys where user_id = ${userId}
  `;
  if (passkeyCount <= 1) {
    return c.json(
      { error: "last_passkey", message: "This is your only passkey. Add another before removing it." },
      422
    );
  }

  const signedOut = await sql`
    update sessions set user_id = null, signed_in_at = null, mfa_at = null, mfa_factor_ref = null
    where mfa_factor_ref = ${mfaFactorRef(credentialId)}
    returning id
  `;
  await sql`delete from passkeys where id = ${credentialId}`;

  return c.json({ ok: true, sessionsSignedOut: signedOut.length });
});

// ---- POST /recovery-codes ----------------------------------------------------
// [passkey]. Regenerate: every UNUSED code this account holds is discarded
// (used ones keep their row — the audit trail of what has already been
// redeemed stays put) and ten fresh ones take their place.
account.post("/recovery-codes", async (c) => {
  const gate = requirePasskey(c);
  if (gate) return gate;
  const userId = c.get("userId") ?? null;

  await sql`delete from recovery_codes where user_id = ${userId} and used_at is null`;
  const { codes, hashes } = mintRecoveryCodes(10);
  for (const hash of hashes) {
    await sql`insert into recovery_codes (code_hash, user_id) values (${hash}, ${userId})`;
  }
  return c.json({ recoveryCodes: codes });
});
