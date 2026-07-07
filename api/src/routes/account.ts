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
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  Uint8Array_,
  WebAuthnCredential,
} from "@simplewebauthn/server";
import { generateUserID, isoBase64URL } from "@simplewebauthn/server/helpers";
import { config } from "../config.js";
import { sql } from "../db.js";
import { setSessionCookie } from "../session.js";
import { consumeChallenge, mfaFactorRef, mintRecoveryCodes, putChallenge } from "../webauthn.js";

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
