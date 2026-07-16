import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("../db.js", () => ({ sql: query }));

import { Hono } from "hono";
import {
  authenticateApiKey,
  hashApiKey,
  requireApiKey,
} from "../api-key.js";
import { requestId } from "../request-id.js";

const rawKey = `ts_test_${"a".repeat(43)}`;
const workspaceId = "11111111-1111-4111-8111-111111111111";
const keyId = "22222222-2222-4222-8222-222222222222";

function activeKeyRow(scopes = ["other:read"]) {
  return {
    id: keyId,
    workspace_id: workspaceId,
    key_prefix: rawKey.slice(0, 16),
    mode: "test",
    scopes,
    created_at: new Date("2026-07-10T09:30:00.000Z"),
    expires_at: new Date("2027-07-10T09:30:00.000Z"),
  };
}

function appFor(scope = "sdlt:calculate") {
  const app = new Hono();
  app.use("*", requestId);
  app.use("*", requireApiKey(scope));
  app.get("/", (c) =>
    c.json({
      workspaceId: c.get("apiWorkspaceId"),
      keyId: c.get("apiKeyId"),
      mode: c.get("apiKeyMode"),
    })
  );
  return app;
}

function authenticationApp() {
  const app = new Hono();
  app.use("*", requestId);
  app.use("*", authenticateApiKey());
  app.get("/", (c) => c.json({
    workspace: c.get("apiWorkspace"),
    presentedKey: c.get("apiPresentedKey"),
  }));
  return app;
}

beforeEach(() => query.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("machine API keys", () => {
  it("hashes a key deterministically without retaining it", () => {
    expect(hashApiKey(rawKey)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey(rawKey)).toBe(hashApiKey(rawKey));
    expect(hashApiKey(rawKey)).not.toContain(rawKey);
  });

  it.each([undefined, "", "Basic abc", "Bearer broken"])(
    "makes a missing or malformed key look the same (%s)",
    async (authorization) => {
      const headers = authorization ? { Authorization: authorization } : undefined;
      const response = await appFor().request("/", { headers });
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe(
        'Bearer realm="TaxSorted API", error="invalid_token"',
      );
      expect(response.headers.get("link")).toContain(
        "</v1/uk/professional-tools>; rel=\"help\"",
      );
      expect(response.headers.get("link")).toContain(
        "</openapi/professional-tools-uk.json>; rel=\"service-desc\"",
      );
      expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
      expect(await response.json()).toMatchObject({
        error: "invalid_api_key",
        message: "Give a valid TaxSorted API key.",
        requiredScope: "sdlt:calculate",
        access: {
          availability: "credentialed-design-partner",
          publicSelfServiceKeyProvisioning: false,
          confidentialAccessRequestIntake: false,
          browserAccountProvidesWorkspaceKey: false,
        },
        nextActions: expect.arrayContaining([
          expect.objectContaining({
            id: "inspect-professional-tools",
            href: "/v1/uk/professional-tools",
          }),
          expect.objectContaining({
            id: "inspect-professional-openapi",
            href: "/openapi/professional-tools-uk.json",
          }),
        ]),
      });
      expect(query).not.toHaveBeenCalled();
    }
  );

  it("accepts an active key with the required scope", async () => {
    query.mockResolvedValue([
      {
        id: "key-1",
        workspace_id: "workspace-1",
        mode: "test",
        scopes: ["sdlt:calculate"],
      },
    ]);
    const response = await appFor().request("/", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      workspaceId: "workspace-1",
      keyId: "key-1",
      mode: "test",
    });
    expect(query).toHaveBeenCalledOnce();
    const submittedValues = query.mock.calls[0]?.slice(1) ?? [];
    expect(submittedValues).toContain(hashApiKey(rawKey));
    expect(submittedValues).not.toContain(rawKey);
  });

  it("authenticates an active key without requiring a task scope", async () => {
    query.mockResolvedValue([activeKeyRow()]);
    const response = await authenticationApp().request("/", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      workspace: { id: workspaceId },
      presentedKey: {
        id: keyId,
        prefix: rawKey.slice(0, 16),
        mode: "test",
        scopes: ["other:read"],
        createdAt: "2026-07-10T09:30:00.000Z",
        expiresAt: "2027-07-10T09:30:00.000Z",
      },
    });
  });

  it("does not invent a required scope for authentication-only failures", async () => {
    const response = await authenticationApp().request("/", {
      headers: { Authorization: "Bearer broken" },
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer realm="TaxSorted API", error="invalid_token"',
    );
    const body = await response.json();
    expect(body).not.toHaveProperty("requiredScope");
    expect(JSON.stringify(body)).not.toContain("selected task");
    expect(body.nextActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "inspect-professional-openapi",
        description: expect.stringContaining("each operation's required workspace scope"),
      }),
    ]));
    expect(query).not.toHaveBeenCalled();
  });

  it("treats the standard Bearer scheme name as case-insensitive", async () => {
    query.mockResolvedValue([
      {
        id: "key-1",
        workspace_id: "workspace-1",
        mode: "test",
        scopes: ["sdlt:calculate"],
      },
    ]);
    const response = await appFor().request("/", {
      headers: { Authorization: `bearer ${rawKey}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ keyId: "key-1" });
  });

  it("returns 403 when the key is real but lacks the scope", async () => {
    query.mockResolvedValue([
      { id: "key-1", workspace_id: "workspace-1", mode: "test", scopes: ["other:read"] },
    ]);
    const response = await appFor().request("/", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(response.status).toBe(403);
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer realm="TaxSorted API", error="insufficient_scope", scope="sdlt:calculate"',
    );
    expect(await response.json()).toMatchObject({
      error: "insufficient_scope",
      requiredScope: "sdlt:calculate",
      access: {
        publicSelfServiceKeyProvisioning: false,
        confidentialAccessRequestIntake: false,
      },
      nextActions: expect.arrayContaining([
        expect.objectContaining({ href: "/v1/uk/professional-tools" }),
      ]),
    });
  });

  it("does not accept a test-prefixed secret stored as a live key", async () => {
    query.mockResolvedValue([
      {
        id: "key-1",
        workspace_id: "workspace-1",
        mode: "live",
        scopes: ["sdlt:calculate"],
      },
    ]);
    const response = await appFor().request("/", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(response.status).toBe(401);
  });
});
