// config.ts reads all environment at module load, so every scenario needs a
// fresh module instance: stub env vars, dynamically import, then reset. No
// Postgres, no network — pure env-in/shape-out.

import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("config.webauthn — defaults", () => {
  it("defaults to localhost/http://localhost:3000 outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    const { config } = await import("../config.js");
    expect(config.webauthn).toEqual({
      rpId: "localhost",
      origin: "http://localhost:3000",
    });
  });

  it("defaults to taxsorted.io/https://taxsorted.io in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    const { config } = await import("../config.js");
    expect(config.webauthn).toEqual({
      rpId: "taxsorted.io",
      origin: "https://taxsorted.io",
    });
  });
});

describe("config.webauthn — env override", () => {
  it("prefers WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN over the production default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_RP_ID", "staging.taxsorted.io");
    vi.stubEnv("WEBAUTHN_ORIGIN", "https://staging.taxsorted.io");
    const { config } = await import("../config.js");
    expect(config.webauthn).toEqual({
      rpId: "staging.taxsorted.io",
      origin: "https://staging.taxsorted.io",
    });
  });

  it("prefers WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN over the dev default", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("WEBAUTHN_RP_ID", "dev.example");
    vi.stubEnv("WEBAUTHN_ORIGIN", "http://dev.example:3000");
    const { config } = await import("../config.js");
    expect(config.webauthn).toEqual({
      rpId: "dev.example",
      origin: "http://dev.example:3000",
    });
  });
});

describe("config.webauthn — not a boot-config requirement", () => {
  it("assertBootConfig does not throw for missing webauthn env (always has a default)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgres://x");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    const { assertBootConfig } = await import("../config.js");
    expect(() => assertBootConfig()).not.toThrow();
  });
});
