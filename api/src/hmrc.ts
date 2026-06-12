// The HMRC rail, server side: OAuth, token vault, rate-limited requests.
// Endpoints and contract come from the engine — one truth.

import { HMRC_CONFIG } from "@taxsorted/engine/uk/hmrc";
import { sql } from "./db.js";
import { config } from "./config.js";
import { encrypt, decrypt } from "./crypto.js";

const base = HMRC_CONFIG[config.hmrc.env].api;

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

// HMRC allows 3 requests/second; a small queue keeps us honest under bursts.
let lastSlots: number[] = [];
async function rateLimit() {
  const now = Date.now();
  lastSlots = lastSlots.filter((t) => now - t < 1000);
  if (lastSlots.length >= HMRC_CONFIG.rateLimit.requestsPerSecond) {
    await new Promise((r) => setTimeout(r, 1000 - (now - lastSlots[0])));
    return rateLimit();
  }
  lastSlots.push(Date.now());
}

export function redirectUri(): string {
  return `${config.apiOrigin}/v1/hmrc/callback`;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.hmrc.clientId,
    scope: "read:vat write:vat",
    redirect_uri: redirectUri(),
    state,
  });
  return `${base}${HMRC_CONFIG.oauth.authorize}?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenSet> {
  const res = await fetch(`${base}${HMRC_CONFIG.oauth.token}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.hmrc.clientId,
      client_secret: config.hmrc.clientSecret,
      ...body,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new HmrcError(res.status, `token exchange failed: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as TokenSet;
}

export function exchangeCode(code: string): Promise<TokenSet> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });
}

export async function storeConnection(entityId: string, tokens: TokenSet) {
  const access = encrypt(tokens.access_token, config.tokenKey);
  const refresh = encrypt(tokens.refresh_token, config.tokenKey);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await sql`
    insert into hmrc_connections (entity_id, hmrc_env, access_token_enc, refresh_token_enc, expires_at, scope)
    values (${entityId}, ${config.hmrc.env}, ${access}, ${refresh}, ${expiresAt}, ${tokens.scope})
    on conflict (entity_id) do update set
      hmrc_env = excluded.hmrc_env,
      access_token_enc = excluded.access_token_enc,
      refresh_token_enc = excluded.refresh_token_enc,
      expires_at = excluded.expires_at,
      scope = excluded.scope,
      connected_at = now()
  `;
}

export async function getConnection(entityId: string) {
  const [row] = await sql`select * from hmrc_connections where entity_id = ${entityId}`;
  return row ?? null;
}

/** Best-effort revocation at HMRC; the row deletion is the caller's job. */
export async function revokeConnection(entityId: string) {
  const conn = await getConnection(entityId);
  if (!conn) return;
  for (const blob of [conn.access_token_enc, conn.refresh_token_enc]) {
    await fetch(`${base}${HMRC_CONFIG.oauth.revoke}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: decrypt(blob, config.tokenKey),
        client_id: config.hmrc.clientId,
        client_secret: config.hmrc.clientSecret,
      }),
    }).catch(() => {});
  }
}

/** A valid access token for the entity, refreshing through HMRC when stale. */
async function accessToken(entityId: string): Promise<string> {
  const conn = await getConnection(entityId);
  if (!conn) throw new HmrcError(428, "not connected to HMRC");
  if (new Date(conn.expires_at).getTime() - Date.now() > 60_000) {
    return decrypt(conn.access_token_enc, config.tokenKey);
  }
  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: decrypt(conn.refresh_token_enc, config.tokenKey),
  });
  await storeConnection(entityId, tokens);
  return tokens.access_token;
}

export class HmrcError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
  }
}

export interface HmrcCall {
  entityId: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  fraud: Record<string, string>;
  testScenario?: string;
}

export async function hmrcRequest<T>(call: HmrcCall): Promise<T> {
  await rateLimit();
  const token = await accessToken(call.entityId);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.hmrc.1.0+json",
    ...call.fraud,
  };
  if (call.body) headers["Content-Type"] = "application/json";
  if (config.hmrc.env === "sandbox" && call.testScenario) {
    headers["Gov-Test-Scenario"] = call.testScenario;
  }
  const res = await fetch(`${base}${call.path}`, {
    method: call.method || "GET",
    headers,
    body: call.body ? JSON.stringify(call.body) : undefined,
  });
  const correlationId = res.headers.get("x-correlationid") || undefined;
  if (!res.ok) {
    const body = await res.json().catch(() => undefined);
    throw new HmrcError(
      res.status,
      (body as { message?: string })?.message || `HMRC ${res.status}`,
      body
    );
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as T;
  if (data && typeof data === "object" && correlationId) {
    (data as Record<string, unknown>)._correlationId = correlationId;
  }
  return data;
}
