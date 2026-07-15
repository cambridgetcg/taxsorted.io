import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("../db.js", () => ({ sql: query }));

import { OpenAPIHono } from "@hono/zod-openapi";
import { apiCors } from "../cors.js";
import { registerDeveloperApi } from "../developer-api.js";
import { apiErrorHandler } from "../error-handler.js";
import { requestId } from "../request-id.js";
import {
  apiWorkspacePath,
  createApiWorkspaceRoutes,
} from "../routes/api-workspace.js";

const rawKey = `ts_test_${"b".repeat(43)}`;
const workspaceId = "11111111-1111-4111-8111-111111111111";
const keyId = "22222222-2222-4222-8222-222222222222";
const evaluatedAt = new Date("2026-07-15T14:30:00.000Z");

function activeKeyRow(scopes = ["tax-expert:assess", "sdlt:calculate"]) {
  return {
    id: keyId,
    workspace_id: workspaceId,
    key_prefix: rawKey.slice(0, 16),
    mode: "test",
    scopes,
    created_at: new Date("2026-07-10T09:30:00.000Z"),
    expires_at: new Date("2027-07-10T09:30:00.000Z"),
    // A database test double may contain operator-only fields. The route must
    // still build its response from the explicit safe allowlist.
    workspace_name: "Private practice name",
    key_name: "Private operator label",
    key_hash: "f".repeat(64),
    revoked_at: "private-revocation-history",
    sibling_keys: [{ id: "must-never-leave-the-server" }],
  };
}

function mount() {
  const app = new OpenAPIHono();
  app.openAPIRegistry.registerComponent("securitySchemes", "WorkspaceKey", {
    type: "http",
    scheme: "bearer",
  });
  app.use("*", requestId);
  app.route(
    apiWorkspacePath,
    createApiWorkspaceRoutes({ now: () => evaluatedAt }),
  );
  app.use("/v1/*", async (c) => {
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    return c.json({ error: "browser_session_touched" }, 418);
  });
  return app;
}

function mountFullDeveloperApi() {
  const app = new OpenAPIHono();
  let browserSessionCalls = 0;
  app.use("*", apiCors);
  app.use("*", requestId);
  registerDeveloperApi(app, "https://api.taxsorted.io");
  app.use("/v1/*", async (c) => {
    browserSessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    return c.json({ error: "browser_session_touched" }, 418);
  });
  app.onError(apiErrorHandler);
  return { app, browserSessionCalls: () => browserSessionCalls };
}

beforeEach(() => query.mockReset());

describe("API workspace inspection", () => {
  it("returns only the presented key's safe identity and sorted capabilities", async () => {
    query.mockResolvedValue([
      activeKeyRow([
        "tax-expert:assess",
        "other:read",
        "sdlt:calculate",
        "other:read",
      ]),
    ]);

    const response = await mount().request(apiWorkspacePath, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("link")).toContain(
      "</v1/uk/professional-tools>; rel=\"help\"",
    );
    expect(response.headers.get("link")).toContain(
      "</openapi/professional-tools-uk.json>; rel=\"service-desc\"",
    );
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.headers.get("set-cookie")).toBeNull();

    const body = await response.json();
    expect(body).toEqual({
      schema: "taxsorted.api-workspace/1",
      evaluatedAt: "2026-07-15T14:30:00.000Z",
      workspace: { id: workspaceId },
      presentedKey: {
        id: keyId,
        prefix: rawKey.slice(0, 16),
        mode: "test",
        scopes: ["other:read", "sdlt:calculate", "tax-expert:assess"],
        createdAt: "2026-07-10T09:30:00.000Z",
        expiresAt: "2027-07-10T09:30:00.000Z",
      },
      capabilities: [
        {
          id: "residential-sdlt-calculation",
          authorized: true,
          method: "POST",
          href: "/v1/uk/sdlt/calculations",
          requiredScope: "sdlt:calculate",
        },
        {
          id: "mtd-income-tax-readiness",
          authorized: true,
          method: "POST",
          href: "/v1/uk/tax-expert/mtd-income-tax/assessments",
          requiredScope: "tax-expert:assess",
        },
      ],
      boundaries: {
        intendedClient: "server-to-server",
        browserCorsAuthorizationHeaderAllowed: false,
        acceptsQueryParameters: false,
        acceptsRequestBody: false,
        acceptsClientFacts: false,
        storesClientFacts: false,
        revealsOtherKeys: false,
        workspaceNameReturned: false,
        keyNameReturned: false,
        keyHashReturned: false,
        revocationHistoryReturned: false,
        browserAccountLinked: false,
        hmrcConnectionLinked: false,
        mutatesWorkspaceOrKey: false,
        statement:
          "This read-only response describes only the presented key. A query string or declared request body is rejected. It accepts and stores no client facts, reveals no other key, and is not linked to a browser account or HMRC connection.",
      },
    });

    const serialized = JSON.stringify(body);
    for (const forbidden of [
      rawKey,
      "Private practice name",
      "Private operator label",
      "f".repeat(64),
      "private-revocation-history",
      "must-never-leave-the-server",
      "workspace_name",
      "key_name",
      "key_hash",
      "revoked_at",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }

    const statement = (query.mock.calls[0]?.[0] as readonly string[]).join("?");
    const selectClause = statement.split("from api_keys", 1)[0] ?? "";
    expect(selectClause).not.toMatch(/\bname\b|key_hash|revoked_at/);
    expect(statement).toContain("where k.key_hash");
    expect(statement).toContain("k.revoked_at is null");
    expect(statement).toContain("k.expires_at > now()");
    expect(statement).toContain("w.status = 'active'");
  });

  it("accepts a valid key with no recognized task scope and marks both tasks unauthorized", async () => {
    query.mockResolvedValue([activeKeyRow(["other:read"])]);

    const response = await mount().request(apiWorkspacePath, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.presentedKey.scopes).toEqual(["other:read"]);
    expect(body.capabilities.map((capability: { authorized: boolean }) => capability.authorized))
      .toEqual([false, false]);
  });

  it("represents a legacy non-expiring key without inventing an expiry", async () => {
    query.mockResolvedValue([{ ...activeKeyRow(), expires_at: null }]);

    const response = await mount().request(apiWorkspacePath, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(response.status).toBe(200);
    expect((await response.json()).presentedKey.expiresAt).toBeNull();
  });

  it("returns a standard no-scope Bearer challenge without revealing key state", async () => {
    query.mockResolvedValue([]);

    const response = await mount().request(apiWorkspacePath, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer realm="TaxSorted API", error="invalid_token"',
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    const body = await response.json();
    expect(body).toMatchObject({
      error: "invalid_api_key",
      nextActions: expect.arrayContaining([
        expect.objectContaining({ href: "/v1/uk/professional-tools" }),
        expect.objectContaining({ href: "/openapi/professional-tools-uk.json" }),
      ]),
    });
    expect(body).not.toHaveProperty("requiredScope");
    expect(JSON.stringify(body)).not.toContain("selected task");
    expect(JSON.stringify(body)).not.toContain(rawKey);
  });

  it("fails closed when stored safe-prefix metadata does not match the presented key", async () => {
    query.mockResolvedValue([{
      ...activeKeyRow(),
      key_prefix: `ts_test_${"c".repeat(8)}`,
    }]);

    const response = await mount().request(apiWorkspacePath, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer realm="TaxSorted API", error="invalid_token"',
    );
    expect(JSON.stringify(await response.json())).not.toContain("ts_test_cccccccc");
  });

  it("rejects query strings before authentication without echoing their values", async () => {
    const privateValue = "Example-Client-Do-Not-Echo";
    const response = await mount().request(
      `${apiWorkspacePath}?clientName=${encodeURIComponent(privateValue)}`,
      { headers: { Authorization: `Bearer ${rawKey}` } },
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    const text = await response.text();
    expect(text).toContain("query_not_allowed");
    expect(text).not.toContain(privateValue);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects an empty query delimiter before authentication", async () => {
    const response = await mount().request(`${apiWorkspacePath}?`, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "query_not_allowed" });
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a declared request body before authentication", async () => {
    const response = await mount().request(apiWorkspacePath, {
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Content-Length": "24",
      },
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toMatchObject({
      error: "request_body_not_allowed",
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects transfer encoding before authentication", async () => {
    const response = await mount().request(apiWorkspacePath, {
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Transfer-Encoding": "chunked",
      },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "request_body_not_allowed",
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("stays ahead of browser-session middleware in the full developer API", async () => {
    query.mockResolvedValue([activeKeyRow()]);
    const { app, browserSessionCalls } = mountFullDeveloperApi();

    const response = await app.request(apiWorkspacePath, {
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(browserSessionCalls()).toBe(0);
    expect(await response.json()).toMatchObject({
      schema: "taxsorted.api-workspace/1",
      workspace: { id: workspaceId },
    });
  });

  it("does not allow browser JavaScript to send the bearer header", async () => {
    const { app, browserSessionCalls } = mountFullDeveloperApi();
    const response = await app.request(apiWorkspacePath, {
      method: "OPTIONS",
      headers: {
        Origin: "https://taxsorted.io",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://taxsorted.io",
    );
    expect(
      response.headers.get("access-control-allow-headers")?.toLowerCase(),
    ).not.toContain("authorization");
    expect(browserSessionCalls()).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("publishes authenticated no-scope OpenAPI with no 403 response", () => {
    const document = mount().getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "test", version: "1" },
    });
    const operation = document.paths?.[apiWorkspacePath]?.get;

    expect(operation?.security).toEqual([{ WorkspaceKey: [] }]);
    expect(operation?.["x-taxsorted-required-workspace-scopes"]).toEqual([]);
    expect(operation).not.toHaveProperty("parameters");
    expect(operation).not.toHaveProperty("requestBody");
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "401",
      "500",
    ]);
    expect(operation?.responses).not.toHaveProperty("403");
    expect(
      document.components?.schemas?.ApiWorkspaceResponse,
    ).toMatchObject({ additionalProperties: false });
    expect(
      (document.components?.schemas?.ApiWorkspaceResponse as {
        properties?: { presentedKey?: { properties?: { scopes?: unknown } } };
      }).properties?.presentedKey?.properties?.scopes,
    ).toMatchObject({ minItems: 1, uniqueItems: true });
  });
});
