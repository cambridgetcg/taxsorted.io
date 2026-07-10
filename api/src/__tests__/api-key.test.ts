import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("../db.js", () => ({ sql: query }));

import { Hono } from "hono";
import { hashApiKey, requireApiKey } from "../api-key.js";
import { requestId } from "../request-id.js";

const rawKey = `ts_test_${"a".repeat(43)}`;

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
      expect(response.headers.get("www-authenticate")).toContain("Bearer");
      expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
      expect(await response.json()).toMatchObject({
        error: "invalid_api_key",
        message: "Give a valid TaxSorted API key.",
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

  it("returns 403 when the key is real but lacks the scope", async () => {
    query.mockResolvedValue([
      { id: "key-1", workspace_id: "workspace-1", mode: "test", scopes: ["other:read"] },
    ]);
    const response = await appFor().request("/", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "insufficient_scope" });
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
