import { createHash } from "node:crypto";
import type { Context, Next } from "hono";
import { sql } from "./db.js";
import {
  professionalToolsAccess,
  professionalToolsOpenApiPath,
  professionalToolsPath,
  workspaceKeyRecoveryActions,
} from "./professional-tools-contract.js";

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

function recoveryHeaders(
  c: Context,
  challenge: "invalid_token" | "insufficient_scope",
  requiredScope: string,
) {
  const scope =
    challenge === "insufficient_scope" ? `, scope="${requiredScope}"` : "";
  c.header(
    "WWW-Authenticate",
    `Bearer realm="TaxSorted API", error="${challenge}"${scope}`,
  );
  c.header(
    "Link",
    [
      `<${professionalToolsPath}>; rel="help"; type="application/json"`,
      `<${professionalToolsOpenApiPath}>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
    ].join(", "),
  );
}

function invalidKey(c: Context, requiredScope: string) {
  recoveryHeaders(c, "invalid_token", requiredScope);
  return c.json(
    {
      error: "invalid_api_key",
      message: "Give a valid TaxSorted API key.",
      requestId: requestIdFor(c),
      requiredScope,
      access: professionalToolsAccess,
      nextActions: workspaceKeyRecoveryActions(requiredScope),
    },
    401
  );
}

/** Require a workspace key with one named scope. The raw key is never stored or logged. */
export function requireApiKey(requiredScope: string) {
  return async (c: Context, next: Next) => {
    const authorization = c.req.header("Authorization") ?? "";
    const match = /^Bearer[ \t]+(.+)$/i.exec(authorization);
    const raw = match?.[1] ?? "";
    const format = API_KEY.exec(raw);
    if (!format) return invalidKey(c, requiredScope);

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

    if (!row || row.mode !== format[1]) return invalidKey(c, requiredScope);
    const scopes = Array.isArray(row.scopes) ? (row.scopes as string[]) : [];
    if (!scopes.includes(requiredScope)) {
      recoveryHeaders(c, "insufficient_scope", requiredScope);
      return c.json(
        {
          error: "insufficient_scope",
          message: `This API key needs the ${requiredScope} scope.`,
          requestId: requestIdFor(c),
          requiredScope,
          access: professionalToolsAccess,
          nextActions: workspaceKeyRecoveryActions(requiredScope),
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
