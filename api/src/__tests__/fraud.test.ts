// Server-side fraud-header assembly (WEB_APP_VIA_SERVER). Ground truth:
// regs/research/fraud-headers.md. Covers the malformed-Forwarded regression
// (GOV_VENDOR_PUBLIC_IP unset used to produce `by=&for=<ip>`) and version
// alignment (engine/api/frontend all read the one VENDOR_VERSION constant).

import { describe, it, expect, afterEach, vi } from "vitest";
import type { Context } from "hono";
import { fraudHeaders } from "../fraud.js";
import { VENDOR_VERSION } from "@taxsorted/engine/uk/hmrc";

afterEach(() => {
  vi.unstubAllEnvs();
});

/** A minimal stand-in for Hono's Context — fraudHeaders only ever calls
    `c.req.header(name)` and `c.get(key)`. */
function fakeContext(opts: {
  headers?: Record<string, string>;
  sessionId?: string;
  deviceId?: string;
}): Context {
  const headers = opts.headers ?? {};
  const vars: Record<string, string> = {
    sessionId: opts.sessionId ?? "session-abc",
    deviceId: opts.deviceId ?? "11111111-1111-4111-8111-111111111111",
  };
  return {
    req: {
      header: (name: string) => headers[name.toLowerCase()],
    },
    get: (key: string) => vars[key],
  } as unknown as Context;
}

describe("fraudHeaders — always-present headers", () => {
  it("sets the fixed connection method", () => {
    const headers = fraudHeaders(fakeContext({}));
    expect(headers["Gov-Client-Connection-Method"]).toBe("WEB_APP_VIA_SERVER");
  });

  it("asserts the device id from session context, not the browser", () => {
    const headers = fraudHeaders(fakeContext({ deviceId: "d-123" }));
    expect(headers["Gov-Client-Device-ID"]).toBe("d-123");
  });

  it("builds Gov-Client-User-IDs from the taxsorted realm + session id", () => {
    const headers = fraudHeaders(fakeContext({ sessionId: "sess-xyz" }));
    expect(headers["Gov-Client-User-IDs"]).toBe("taxsorted=sess-xyz");
  });

  it("percent-encodes the session id inside Gov-Client-User-IDs when it has special characters", () => {
    const headers = fraudHeaders(fakeContext({ sessionId: "a b" }));
    expect(headers["Gov-Client-User-IDs"]).toBe("taxsorted=a%20b");
  });

  it("RFC-3986-strict percent-encodes !'()* in Gov-Client-User-IDs (plain encodeURIComponent leaves these unescaped — dormant drift once account identifiers stop being UUIDs)", () => {
    const headers = fraudHeaders(fakeContext({ sessionId: "sess!'()*id" }));
    expect(headers["Gov-Client-User-IDs"]).toBe("taxsorted=sess%21%27%28%29%2Aid");
  });
});

describe("fraudHeaders — Gov-Vendor-Version alignment (was: engine 1.0.0 vs api 0.1.0)", () => {
  it("uses the single VENDOR_VERSION constant for both client and server entries", () => {
    const headers = fraudHeaders(fakeContext({}));
    expect(headers["Gov-Vendor-Version"]).toBe(
      `taxsorted-frontend=${VENDOR_VERSION}&taxsorted-server=${VENDOR_VERSION}`
    );
  });
});

describe("fraudHeaders — Gov-Vendor-Product-Name", () => {
  it("sends the percent-encoded product name", () => {
    const headers = fraudHeaders(fakeContext({}));
    expect(headers["Gov-Vendor-Product-Name"]).toBe("TaxSorted");
  });
});

describe("fraudHeaders — Gov-Client-Public-IP / Public-IP-Timestamp (fly-client-ip only)", () => {
  it("sets Public-IP and a millisecond-precision timestamp when fly-client-ip is present", () => {
    const headers = fraudHeaders(
      fakeContext({ headers: { "fly-client-ip": "198.51.100.0" } })
    );
    expect(headers["Gov-Client-Public-IP"]).toBe("198.51.100.0");
    expect(headers["Gov-Client-Public-IP-Timestamp"]).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });

  it("never trusts X-Forwarded-For — omits Public-IP when only XFF is present", () => {
    const headers = fraudHeaders(
      fakeContext({ headers: { "x-forwarded-for": "1.2.3.4" } })
    );
    expect(headers["Gov-Client-Public-IP"]).toBeUndefined();
    expect(headers["Gov-Client-Public-IP-Timestamp"]).toBeUndefined();
  });

  it("omits Public-IP entirely (not empty) when fly-client-ip is absent", () => {
    const headers = fraudHeaders(fakeContext({}));
    expect("Gov-Client-Public-IP" in headers).toBe(false);
  });
});

describe("fraudHeaders — Gov-Vendor-Public-IP (GOV_VENDOR_PUBLIC_IP env)", () => {
  it("omits Gov-Vendor-Public-IP when the env var is unset — never fabricated", () => {
    vi.stubEnv("GOV_VENDOR_PUBLIC_IP", "");
    const headers = fraudHeaders(fakeContext({}));
    expect("Gov-Vendor-Public-IP" in headers).toBe(false);
  });

  it("sets Gov-Vendor-Public-IP from the env var when present", () => {
    vi.stubEnv("GOV_VENDOR_PUBLIC_IP", "203.0.113.6");
    const headers = fraudHeaders(fakeContext({}));
    expect(headers["Gov-Vendor-Public-IP"]).toBe("203.0.113.6");
  });
});

describe("fraudHeaders — Gov-Vendor-Forwarded: the malformed-Forwarded regression", () => {
  it("REGRESSION: never emits by=&for=<ip> when only the client IP is known (GOV_VENDOR_PUBLIC_IP unset)", () => {
    vi.stubEnv("GOV_VENDOR_PUBLIC_IP", "");
    const headers = fraudHeaders(
      fakeContext({ headers: { "fly-client-ip": "198.51.100.0" } })
    );
    expect(headers["Gov-Vendor-Forwarded"]).toBeUndefined();
    // Nothing in the object should even resemble the old malformed value.
    expect(JSON.stringify(headers)).not.toContain("by=&for=");
  });

  it("never emits by=<ip>&for= when only the vendor IP is known (no fly-client-ip)", () => {
    vi.stubEnv("GOV_VENDOR_PUBLIC_IP", "203.0.113.6");
    const headers = fraudHeaders(fakeContext({}));
    expect(headers["Gov-Vendor-Forwarded"]).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("&for=");
  });

  it("emits the correct by=<vendor-ip>&for=<client-ip> only when both are present", () => {
    vi.stubEnv("GOV_VENDOR_PUBLIC_IP", "203.0.113.6");
    const headers = fraudHeaders(
      fakeContext({ headers: { "fly-client-ip": "198.51.100.0" } })
    );
    expect(headers["Gov-Vendor-Forwarded"]).toBe(
      "by=203.0.113.6&for=198.51.100.0"
    );
  });
});

describe("fraudHeaders — browser-collected subset (CLIENT_ALLOWLIST)", () => {
  it("forwards timezone, screens, window-size, and JS user agent when supplied", () => {
    const headers = fraudHeaders(
      fakeContext({
        headers: {
          "gov-client-timezone": "UTC+00:00",
          "gov-client-screens": "width=1920&height=1080&scaling-factor=1&colour-depth=16",
          "gov-client-window-size": "width=1256&height=803",
          "gov-client-browser-js-user-agent": "Mozilla/5.0 (X11; Linux x86_64)",
        },
      })
    );
    expect(headers["Gov-Client-Timezone"]).toBe("UTC+00:00");
    expect(headers["Gov-Client-Screens"]).toBe(
      "width=1920&height=1080&scaling-factor=1&colour-depth=16"
    );
    expect(headers["Gov-Client-Window-Size"]).toBe("width=1256&height=803");
    expect(headers["Gov-Client-Browser-JS-User-Agent"]).toBe(
      "Mozilla/5.0 (X11; Linux x86_64)"
    );
  });

  it("never forwards Gov-Client-Browser-Plugins or Gov-Client-Browser-Do-Not-Track even if a client sends them (dropped from the required list)", () => {
    const headers = fraudHeaders(
      fakeContext({
        headers: {
          "gov-client-browser-plugins": "Flash,QuickTime",
          "gov-client-browser-do-not-track": "true",
        },
      })
    );
    expect("Gov-Client-Browser-Plugins" in headers).toBe(false);
    expect("Gov-Client-Browser-Do-Not-Track" in headers).toBe(false);
  });

  it("omits a browser-collected header entirely when the client didn't send it", () => {
    const headers = fraudHeaders(fakeContext({}));
    expect("Gov-Client-Timezone" in headers).toBe(false);
    expect("Gov-Client-Screens" in headers).toBe(false);
    expect("Gov-Client-Window-Size" in headers).toBe(false);
    expect("Gov-Client-Browser-JS-User-Agent" in headers).toBe(false);
  });
});

describe("fraudHeaders — the cannot-collect trio: never sent, never empty, never fabricated", () => {
  it("never sends Gov-Client-Multi-Factor (no MFA exists yet)", () => {
    const headers = fraudHeaders(fakeContext({}));
    expect("Gov-Client-Multi-Factor" in headers).toBe(false);
  });

  it("never sends Gov-Vendor-License-IDs (no licensed software)", () => {
    const headers = fraudHeaders(fakeContext({}));
    expect("Gov-Vendor-License-IDs" in headers).toBe(false);
  });

  it("never sends Gov-Client-Public-Port (unobtainable behind Fly's proxy)", () => {
    const headers = fraudHeaders(fakeContext({}));
    expect("Gov-Client-Public-Port" in headers).toBe(false);
  });

  it("never sends any of the three with an empty-string placeholder value", () => {
    const headers = fraudHeaders(fakeContext({})) as Record<string, unknown>;
    expect(headers["Gov-Client-Multi-Factor"]).not.toBe("");
    expect(headers["Gov-Vendor-License-IDs"]).not.toBe("");
    expect(headers["Gov-Client-Public-Port"]).not.toBe("");
  });
});
