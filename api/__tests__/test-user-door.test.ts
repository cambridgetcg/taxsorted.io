// The practice-taxpayer door exists only in the sandbox. In production the
// route answers like any other door that isn't there.

import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

async function freshConnect() {
  const { Hono } = await import("hono");
  const { connect } = await import("../src/routes/connect.js");
  return new Hono().route("/v1/hmrc", connect);
}

describe("the sandbox practice door", () => {
  it("does not exist in production", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("HMRC_CLIENT_ID", "id");
    vi.stubEnv("HMRC_CLIENT_SECRET", "secret");
    const app = await freshConnect();
    const res = await app.request("/v1/hmrc/test-user", { method: "POST" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });

  it("says so plainly when the rail is not configured", async () => {
    vi.stubEnv("HMRC_ENV", "sandbox");
    vi.stubEnv("HMRC_CLIENT_ID", "");
    vi.stubEnv("HMRC_CLIENT_SECRET", "");
    const app = await freshConnect();
    const res = await app.request("/v1/hmrc/test-user", { method: "POST" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("rail_not_configured");
  });
});
