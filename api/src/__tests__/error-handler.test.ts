import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiErrorHandler } from "../error-handler.js";
import { requestId } from "../request-id.js";
import { sdltRoutes } from "../routes/sdlt.js";

function appWithPublicErrors() {
  const app = new OpenAPIHono();
  app.use("*", requestId);
  app.route("/v1/uk/sdlt", sdltRoutes);
  app.get("/unexpected", () => {
    throw new Error("private diagnostic");
  });
  app.get("/v1/open-data/unexpected", () => {
    throw new Error("private diagnostic");
  });
  app.onError(apiErrorHandler);
  return app;
}

afterEach(() => vi.restoreAllMocks());

describe("public API errors", () => {
  it.each(["{", ""])("turns malformed JSON into a structured 400 (%j)", async (body) => {
    const response = await appWithPublicErrors().request("/v1/uk/sdlt/calculations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(await response.json()).toMatchObject({
      error: "invalid_json",
      message: "Send one complete JSON object as the calculation request.",
    });
  });

  it("keeps an unexpected 500 generic and schema-shaped", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await appWithPublicErrors().request("/unexpected");
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      error: "server_error",
      message: "Something went wrong while handling the request.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringMatching(/^server_error request_id=[0-9a-f-]{36} name=Error$/)
    );
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("private diagnostic");
  });

  it("uses the public problem contract without exposing the thrown error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await appWithPublicErrors().request(
      "/v1/open-data/unexpected?token=private",
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(body).toMatchObject({
      type: "https://api.taxsorted.io/problems/server_error",
      title: "Server error",
      status: 500,
      instance: "/v1/open-data/unexpected",
      error: "server_error",
      nextActions: [{ href: "/v1/health" }],
    });
    expect(JSON.stringify(body)).not.toContain("private diagnostic");
    expect(JSON.stringify(body)).not.toContain("token=private");
  });
});
