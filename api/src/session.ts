// Anonymous device sessions: a cookie is the key to your entities.
// No signup wall in the sandbox era; accounts arrive with production rails.

import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { randomUUID } from "node:crypto";
import { sql } from "./db.js";
import { config } from "./config.js";

const SESSION_COOKIE = "ts_session";
const DEVICE_COOKIE = "ts_device";
const YEAR = 60 * 60 * 24 * 365;
// A passkey sign-in is trusted for thirty days. Past that the session keeps its
// entities but presents as anonymous until it signs in again. We never rewrite
// the row when the window lapses — the clock does the expiring, not a write —
// so every request stays exactly one UPDATE (or one INSERT), same as before.
const SIGNED_IN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Host-only cookies: scoped to the api host alone, never the whole domain —
// no other subdomain can read or plant them.
const cookieBase = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: "Lax" as const,
  path: "/",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Two identities ride on one signed-in session, and they are NOT the same:
//   • accountId — the ACCOUNT-MANAGEMENT identity. Set whenever the session
//     signed in within the window, by ANY means. A recovery-code sign-in earns
//     accountId so its holder can add a passkey or manage the account — but it
//     grants nothing that touches tax data.
//   • userId — the DATA identity. Set only when the sign-in also cleared a
//     passkey prompt (mfa_at present). So a recovery sign-in has accountId but
//     never userId: it can heal an account it still cannot read from.
// mfaAt / mfaFactorRef travel with userId (they feed the Gov-Client MFA
// fraud-prevention headers) and are absent exactly when userId is.
declare module "hono" {
  interface ContextVariableMap {
    sessionId: string;
    deviceId: string;
    accountId: string | undefined;
    userId: string | undefined;
    mfaAt: Date | undefined;
    mfaFactorRef: string | undefined;
  }
}

export async function session(c: Context, next: Next) {
  let accountId: string | undefined;
  let userId: string | undefined;
  let mfaAt: Date | undefined;
  let mfaFactorRef: string | undefined;

  let sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    const [row] = await sql`
      update sessions set last_seen_at = now() where id = ${sessionId}
      returning id, user_id, signed_in_at, mfa_at, mfa_factor_ref
    `.catch(() => []);
    if (!row) {
      sessionId = undefined;
    } else if (row.user_id && row.signed_in_at) {
      const signedInAt = new Date(row.signed_in_at as string | Date);
      if (Date.now() - signedInAt.getTime() < SIGNED_IN_WINDOW_MS) {
        // Signed in and still inside the window: account-management identity.
        accountId = row.user_id as string;
        if (row.mfa_at) {
          // A passkey also asserted: unlock the data identity too.
          userId = row.user_id as string;
          mfaAt = new Date(row.mfa_at as string | Date);
          mfaFactorRef = (row.mfa_factor_ref as string | null) ?? undefined;
        }
      }
      // Expired window: leave the row untouched — it simply presents anonymous.
    }
  }
  if (!sessionId) {
    const [row] = await sql`insert into sessions default values returning id`;
    sessionId = row.id as string;
  }
  setCookie(c, SESSION_COOKIE, sessionId, { ...cookieBase, maxAge: YEAR });

  // The device id feeds Gov-Client-Device-ID; durable, per-browser, and
  // regenerated if anyone hands us something that isn't ours.
  let deviceId = getCookie(c, DEVICE_COOKIE);
  if (!deviceId || !UUID_RE.test(deviceId)) deviceId = randomUUID();
  // One year, same as the session: browsers cap cookies at 400 days anyway.
  setCookie(c, DEVICE_COOKIE, deviceId, { ...cookieBase, maxAge: YEAR });

  c.set("sessionId", sessionId);
  c.set("deviceId", deviceId);
  c.set("accountId", accountId);
  c.set("userId", userId);
  c.set("mfaAt", mfaAt);
  c.set("mfaFactorRef", mfaFactorRef);
  await next();
}

/** Load an entity only if this session or this account owns it — an entity
    has exactly one owner, so either half of the predicate is sufficient.
    userId is undefined for anonymous and recovery callers; it must be
    coerced to null explicitly (never left as bare undefined) so the query
    reads `user_id = null`, which — per SQL's three-valued logic — never
    matches, including against a row whose own user_id is null. */
export async function ownedEntity(c: Context, entityId: string) {
  const [entity] = await sql`
    select * from entities
    where id = ${entityId} and (session_id = ${c.get("sessionId")} or user_id = ${c.get("userId") ?? null})
  `.catch(() => []);
  return entity ?? null;
}
