// Unit tests for the HMRC Test Fraud Prevention Headers API validation
// script — every HMRC call is mocked; nothing here touches the network.
// Ground truth: regs/research/fraud-headers.md §3 (the Test API).

import { describe, it, expect, vi } from "vitest";
import {
  assertCredentials,
  buildRepresentativeHeaders,
  decideExitCode,
  getAppAccessToken,
  getValidationFeedback,
  validateHeaders,
} from "../validate-fraud-headers.js";

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe("assertCredentials", () => {
  it("throws when either half of the client-credentials pair is missing", () => {
    expect(() => assertCredentials("", "secret")).toThrow(/HMRC_CLIENT_ID/);
    expect(() => assertCredentials("id", "")).toThrow(/HMRC_CLIENT_SECRET/);
    expect(() => assertCredentials("", "")).toThrow();
  });

  it("does not throw when both are present", () => {
    expect(() => assertCredentials("id", "secret")).not.toThrow();
  });
});

describe("getAppAccessToken", () => {
  it("POSTs a client-credentials grant and returns the access token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { access_token: "app-token-abc" }));

    const token = await getAppAccessToken(
      "https://test-api.service.hmrc.gov.uk",
      "client-id",
      "client-secret",
      fetchImpl
    );

    expect(token).toBe("app-token-abc");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://test-api.service.hmrc.gov.uk/oauth/token");
    expect(init.method).toBe("POST");
    const body = init.body as URLSearchParams;
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("client_id")).toBe("client-id");
    expect(body.get("client_secret")).toBe("client-secret");
  });

  it("throws with HMRC's own error detail when the token request fails", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, text: async () => "invalid_client" });

    await expect(
      getAppAccessToken("https://test-api.service.hmrc.gov.uk", "bad", "creds", fetchImpl)
    ).rejects.toThrow(/401/);
  });
});

describe("buildRepresentativeHeaders", () => {
  it("goes through the real production assembly (fraud.ts's assembleFraudHeaders) and includes the full representative set", () => {
    const headers = buildRepresentativeHeaders({ vendorIp: "203.0.113.6" });

    expect(headers["Gov-Client-Connection-Method"]).toBe("WEB_APP_VIA_SERVER");
    expect(headers["Gov-Client-Device-ID"]).toBeTruthy();
    expect(headers["Gov-Client-User-IDs"]).toMatch(/^taxsorted=/);
    expect(headers["Gov-Client-Timezone"]).toBe("UTC+00:00");
    expect(headers["Gov-Client-Screens"]).toContain("colour-depth=");
    expect(headers["Gov-Client-Window-Size"]).toMatch(/^width=\d+&height=\d+$/);
    expect(headers["Gov-Client-Browser-JS-User-Agent"]).toContain("Mozilla");
    expect(headers["Gov-Client-Public-IP"]).toBeTruthy();
    expect(headers["Gov-Client-Public-IP-Timestamp"]).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(headers["Gov-Vendor-Version"]).toContain("taxsorted-frontend=");
    expect(headers["Gov-Vendor-Product-Name"]).toBe("TaxSorted");
    expect(headers["Gov-Vendor-Public-IP"]).toBe("203.0.113.6");
    expect(headers["Gov-Vendor-Forwarded"]).toBe("by=203.0.113.6&for=" + headers["Gov-Client-Public-IP"]);
  });

  it("omits Gov-Vendor-Public-IP and Gov-Vendor-Forwarded when no vendor IP is known — same never-fabricate rule as production", () => {
    const headers = buildRepresentativeHeaders({ vendorIp: "" });
    expect("Gov-Vendor-Public-IP" in headers).toBe(false);
    expect("Gov-Vendor-Forwarded" in headers).toBe(false);
  });

  it("includes a syntactically-valid Gov-Client-Multi-Factor (type=OTHER, fresh timestamp, hashed reference) so HMRC's validator sees the header it now ships", () => {
    const headers = buildRepresentativeHeaders({});
    const mf = headers["Gov-Client-Multi-Factor"];
    expect(mf).toBeTruthy();
    expect(mf).toContain("type=OTHER");
    expect(mf).toMatch(/(^|&)timestamp=/);
    expect(mf).toMatch(/(^|&)unique-reference=/);
  });

  it("still omits the two documented cannot-collect headers (License-IDs + Public-Port)", () => {
    const headers = buildRepresentativeHeaders({});
    expect("Gov-Vendor-License-IDs" in headers).toBe(false);
    expect("Gov-Client-Public-Port" in headers).toBe(false);
  });
});

describe("validateHeaders", () => {
  it("calls GET /test/fraud-prevention-headers/validate with the bearer token, Accept version, and every fraud header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        specVersion: "3.1",
        code: "VALID_HEADERS",
        message: "All headers required for your connection method have been supplied and all appear to be valid.",
      })
    );

    const result = await validateHeaders(
      "https://test-api.service.hmrc.gov.uk",
      "bearer-token",
      { "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER" },
      fetchImpl
    );

    expect(result.status).toBe(200);
    expect(result.body.code).toBe("VALID_HEADERS");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://test-api.service.hmrc.gov.uk/test/fraud-prevention-headers/validate");
    expect(init.headers.Authorization).toBe("Bearer bearer-token");
    expect(init.headers.Accept).toBe("application/vnd.hmrc.1.0+json");
    expect(init.headers["Gov-Client-Connection-Method"]).toBe("WEB_APP_VIA_SERVER");
  });
});

describe("getValidationFeedback", () => {
  it("calls GET /test/fraud-prevention-headers/{api}/validation-feedback with the connectionMethod query", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, { code: "VALID_HEADERS" }));

    await getValidationFeedback(
      "https://test-api.service.hmrc.gov.uk",
      "bearer-token",
      "vat-mtd",
      "WEB_APP_VIA_SERVER",
      fetchImpl
    );

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      "https://test-api.service.hmrc.gov.uk/test/fraud-prevention-headers/vat-mtd/validation-feedback?connectionMethod=WEB_APP_VIA_SERVER"
    );
    expect(init.headers.Authorization).toBe("Bearer bearer-token");
  });
});

describe("decideExitCode", () => {
  it("is 0 for VALID_HEADERS", () => {
    expect(decideExitCode({ code: "VALID_HEADERS" })).toBe(0);
  });

  it("is 0 for POTENTIALLY_INVALID_HEADERS (warnings, not errors — still worth printing)", () => {
    expect(decideExitCode({ code: "POTENTIALLY_INVALID_HEADERS" })).toBe(0);
  });

  it("is non-zero for INVALID_HEADERS with no error detail (fail closed)", () => {
    expect(decideExitCode({ code: "INVALID_HEADERS" })).toBe(1);
  });

  it("is non-zero when the response shape is unrecognised (fail closed, not open)", () => {
    expect(decideExitCode({})).toBe(1);
    expect(decideExitCode(undefined)).toBe(1);
  });

  it("tolerates INVALID_HEADERS whose only errors are the documented cannot-collect duo (Public-Port + License-IDs) missing", () => {
    expect(
      decideExitCode({
        code: "INVALID_HEADERS",
        errors: [
          { code: "MISSING_HEADER", message: "Header required", headers: ["Gov-Client-Public-Port"] },
          { code: "MISSING_HEADER", message: "Header required", headers: ["Gov-Vendor-License-IDs"] },
        ],
      })
    ).toBe(0);
  });

  it("no longer tolerates a MISSING Gov-Client-Multi-Factor — it ships now, so its absence is a real failure (the tolerance shrank from the trio to the duo)", () => {
    expect(
      decideExitCode({
        code: "INVALID_HEADERS",
        errors: [
          { code: "MISSING_HEADER", message: "Header required", headers: ["Gov-Client-Multi-Factor"] },
        ],
      })
    ).toBe(1);
  });

  it("fails on any error outside the tolerated duo, even mixed alongside a tolerated one", () => {
    expect(
      decideExitCode({
        code: "INVALID_HEADERS",
        errors: [
          { code: "MISSING_HEADER", message: "Header required", headers: ["Gov-Client-Public-Port"] },
          { code: "MISSING_HEADER", message: "Header required", headers: ["Gov-Vendor-Version"] },
        ],
      })
    ).toBe(1);
  });

  it("fails when a tolerated header is INVALID (a format error), not merely MISSING — tolerance is for absence only", () => {
    expect(
      decideExitCode({
        code: "INVALID_HEADERS",
        errors: [
          { code: "INVALID_HEADER", message: "bad format", headers: ["Gov-Client-Public-Port"] },
        ],
      })
    ).toBe(1);
  });
});
