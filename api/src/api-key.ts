import { createHash } from "node:crypto";
import type { Context, Next } from "hono";
import { sql } from "./db.js";

const API_KEY = /^ts_(test|live)_[A-Za-z0-9_-]{43}$/;

declare module "hono" {
  interface ContextVariableMap {
    apiWorkspaceId: string;
    apiKeyId: string;
    apiKeyMode: "test" | "live";
    apiScopes: string[];
  }
}

export function hashApiKey(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requestIdFor(c: Context): string {
  return c.get("requestId") ?? "unavailable";
}

function invalidKey(c: Context) {
  c.header("WWW-Authenticate", 'Bearer realm="TaxSorted API"');
  return c.json(
    {
      error: "invalid_api_key",
      message: "Give a valid TaxSorted API key.",
      requestId: requestIdFor(c),
    },
    401
  );
}

/** Require a workspace key with one named scope. The raw key is never stored or logged. */
export function requireApiKey(requiredScope: string) {
  return async (c: Context, next: Next) => {
    const authorization = c.req.header("Authorization") ?? "";
    const match = /^Bearer (.+)$/.exec(authorization);
    const raw = match?.[1] ?? "";
    const format = API_KEY.exec(raw);
    if (!format) return invalidKey(c);

    const [row] = await sql`
      select k.id, k.workspace_id, k.mode, k.scopes
      from api_keys k
      join api_workspaces w on w.id = k.workspace_id
      where k.key_hash = ${hashApiKey(raw)}
        and k.revoked_at is null
        and (k.expires_at is null or k.expires_at > now())
        and w.status = 'active'
      limit 1
    `;

    if (!row || row.mode !== format[1]) return invalidKey(c);
    const scopes = Array.isArray(row.scopes) ? (row.scopes as string[]) : [];
    if (!scopes.includes(requiredScope)) {
      return c.json(
        {
          error: "insufficient_scope",
          message: `This API key needs the ${requiredScope} scope.`,
          requestId: requestIdFor(c),
        },
        403
      );
    }

    c.set("apiWorkspaceId", row.workspace_id as string);
    c.set("apiKeyId", row.id as string);
    c.set("apiKeyMode", row.mode as "test" | "live");
    c.set("apiScopes", scopes);
    await next();
  };
}
