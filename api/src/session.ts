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

// Host-only cookies: scoped to the api host alone, never the whole domain —
// no other subdomain can read or plant them.
const cookieBase = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: "Lax" as const,
  path: "/",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare module "hono" {
  interface ContextVariableMap {
    sessionId: string;
    deviceId: string;
  }
}

export async function session(c: Context, next: Next) {
  let sessionId = getCookie(c, SESSION_COOKIE);
  if (sessionId) {
    const [row] = await sql`
      update sessions set last_seen_at = now() where id = ${sessionId} returning id
    `.catch(() => []);
    if (!row) sessionId = undefined;
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
  await next();
}

/** Load an entity only if this session owns it. */
export async function ownedEntity(c: Context, entityId: string) {
  const [entity] = await sql`
    select * from entities
    where id = ${entityId} and session_id = ${c.get("sessionId")}
  `.catch(() => []);
  return entity ?? null;
}
