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

export type Rail = "vat" | "itsa";

/** Additive scope selection: VAT keeps its historical two-scope grant; ITSA
    gets read-only self-assessment access — no write scope until submission
    lands (Global Constraints: read:self-assessment only, for now). */
export function scopeFor(rail: Rail): string {
  return rail === "itsa" ? "read:self-assessment" : "read:vat write:vat";
}

export function authorizeUrl(state: string, rail: Rail = "vat"): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.hmrc.clientId,
    scope: scopeFor(rail),
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

/** Each rail keeps its own row per entity (unique(entity_id, rail) — see
    migration 003) so connecting one rail never clobbers the other's tokens. */
export async function storeConnection(entityId: string, rail: Rail, tokens: TokenSet) {
  const access = encrypt(tokens.access_token, config.tokenKey);
  const refresh = encrypt(tokens.refresh_token, config.tokenKey);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  await sql`
    insert into hmrc_connections (entity_id, rail, hmrc_env, access_token_enc, refresh_token_enc, expires_at, scope)
    values (${entityId}, ${rail}, ${config.hmrc.env}, ${access}, ${refresh}, ${expiresAt}, ${tokens.scope})
    on conflict (entity_id, rail) do update set
      hmrc_env = excluded.hmrc_env,
      access_token_enc = excluded.access_token_enc,
      refresh_token_enc = excluded.refresh_token_enc,
      expires_at = excluded.expires_at,
      scope = excluded.scope,
      connected_at = now()
  `;
}

export async function getConnection(entityId: string, rail: Rail) {
  const [row] = await sql`
    select * from hmrc_connections where entity_id = ${entityId} and rail = ${rail}
  `;
  return row ?? null;
}

/** Best-effort revocation at HMRC for every rail this entity holds; the row
    deletion is the caller's job. Queried directly (not per-rail via
    getConnection) so disconnecting an entity that holds both a VAT and an
    ITSA connection revokes both tokens, not just one. */
export async function revokeConnection(entityId: string) {
  const conns = await sql`select * from hmrc_connections where entity_id = ${entityId}`;
  for (const conn of conns) {
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
}

/** A valid access token for the entity's given rail, refreshing through HMRC
    when stale. */
async function accessToken(entityId: string, rail: Rail): Promise<string> {
  const conn = await getConnection(entityId, rail);
  if (!conn) throw new HmrcError(428, "not connected to HMRC");
  if (new Date(conn.expires_at).getTime() - Date.now() > 60_000) {
    return decrypt(conn.access_token_enc, config.tokenKey);
  }
  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    refresh_token: decrypt(conn.refresh_token_enc, config.tokenKey),
  });
  await storeConnection(entityId, rail, tokens);
  return tokens.access_token;
}

/** Sandbox only: mint a pretend VAT-registered organisation to file as.
    Uses the app's own credentials — no human ever handles a secret. */
export async function createTestOrganisation(): Promise<{
  userId: string;
  password: string;
  vrn: string;
  name: string | null;
}> {
  const tokenRes = await fetch(`${base}${HMRC_CONFIG.oauth.token}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.hmrc.clientId,
      client_secret: config.hmrc.clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    throw new HmrcError(tokenRes.status, `app token failed: ${detail.slice(0, 200)}`);
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  await rateLimit();
  const res = await fetch(`${base}${HMRC_CONFIG.testSupport.createTestOrganisation}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.hmrc.1.0+json",
    },
    body: JSON.stringify({ serviceNames: ["mtd-vat"] }),
  });
  const body = (await res.json().catch(() => undefined)) as
    | {
        userId?: string;
        password?: string;
        vrn?: string;
        vatRegistrationNumber?: string;
        organisationDetails?: { name?: string };
        userFullName?: string;
        message?: string;
      }
    | undefined;
  const vrn = body?.vatRegistrationNumber ?? body?.vrn;
  if (!res.ok || !body?.userId || !body.password || !vrn) {
    // Sandbox door: name the keys we got (never the values) so a shape
    // mismatch diagnoses itself.
    const shape = body ? `got fields: ${Object.keys(body).join(", ")}` : "unparseable body";
    throw new HmrcError(res.status, body?.message || `HMRC ${res.status} — ${shape}`, body);
  }
  return {
    userId: body.userId,
    password: body.password,
    vrn,
    name: body.organisationDetails?.name ?? body.userFullName ?? null,
  };
}

/** Sandbox only: mint a pretend ITSA individual (a National Insurance number,
    not a VRN — ITSA identifies people). Same app-credentials pattern as
    createTestOrganisation — no human ever handles a secret. */
export async function createTestIndividual(): Promise<{
  userId: string;
  password: string;
  nino: string;
  name: string | null;
}> {
  const tokenRes = await fetch(`${base}${HMRC_CONFIG.oauth.token}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.hmrc.clientId,
      client_secret: config.hmrc.clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    throw new HmrcError(tokenRes.status, `app token failed: ${detail.slice(0, 200)}`);
  }
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  await rateLimit();
  const res = await fetch(`${base}/create-test-user/individuals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.hmrc.1.0+json",
    },
    body: JSON.stringify({ serviceNames: ["mtd-income-tax"] }),
  });
  const body = (await res.json().catch(() => undefined)) as
    | {
        userId?: string;
        password?: string;
        nino?: string;
        userFullName?: string;
        message?: string;
      }
    | undefined;
  if (!res.ok || !body?.userId || !body.password || !body.nino) {
    const shape = body ? `got fields: ${Object.keys(body).join(", ")}` : "unparseable body";
    throw new HmrcError(res.status, body?.message || `HMRC ${res.status} — ${shape}`, body);
  }
  return {
    userId: body.userId,
    password: body.password,
    nino: body.nino,
    name: body.userFullName ?? null,
  };
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
  /** Which rail's connection to spend a token from. Defaults to "vat" —
      every VAT caller predates rails and stays byte-identical; ITSA callers
      pass "itsa" explicitly. */
  rail?: Rail;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  fraud: Record<string, string>;
  testScenario?: string;
  /** Per-endpoint Accept version (e.g. Obligations v3.0, ITSA status v2.0).
      Defaults to the VAT API's v1.0 — additive, VAT callers untouched. */
  accept?: string;
}

export async function hmrcRequest<T>(call: HmrcCall): Promise<T> {
  await rateLimit();
  const token = await accessToken(call.entityId, call.rail ?? "vat");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: call.accept ?? "application/vnd.hmrc.1.0+json",
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
