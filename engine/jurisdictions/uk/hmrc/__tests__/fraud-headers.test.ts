// Format-exactness tests for the HMRC fraud-prevention headers,
// WEB_APP_VIA_SERVER connection method. Every case below cites the line(s)
// in regs/research/fraud-headers.md (the v3.3 spec ground truth) it locks in.

import { describe, it, expect } from "vitest";
import {
  percentEncode,
  encodeAsciiPassthrough,
  kvStructure,
  listOfStructures,
  formatTimezone,
  formatTimestampMillis,
  buildScreens,
  buildWindowSize,
  buildUserIds,
  buildMultiFactor,
  buildLicenseIds,
  buildVendorForwarded,
  buildVendorVersion,
  buildVendorProductName,
  collectFraudPreventionHeaders,
  headersToRecord,
  validateFraudHeaders,
} from "../fraud-headers";
import { VENDOR_VERSION } from "../config";

describe("percentEncode (research §2.1, lines 86-98)", () => {
  it("percent-encodes a space", () => {
    expect(percentEncode("alice example")).toBe("alice%20example");
  });

  it("percent-encodes a comma (a separator when unescaped in the assembled string)", () => {
    expect(percentEncode("a,b")).toBe("a%2Cb");
  });

  it("percent-encodes an equals sign", () => {
    expect(percentEncode("a=b")).toBe("a%3Db");
  });

  it("percent-encodes an ampersand", () => {
    expect(percentEncode("a&b")).toBe("a%26b");
  });

  it("percent-encodes colons (IPv6 / ISO timestamp separators)", () => {
    expect(percentEncode("2021-11-21T13:23Z")).toBe("2021-11-21T13%3A23Z");
  });

  it("percent-encodes @ (email addresses in User-IDs)", () => {
    expect(percentEncode("alice@example.com")).toBe("alice%40example.com");
  });

  it("leaves the full unreserved set untouched: A-Z a-z 0-9 - . _ ~", () => {
    const unreserved = "AZaz09-._~";
    expect(percentEncode(unreserved)).toBe(unreserved);
  });

  it("percent-encodes characters encodeURIComponent alone would leave raw: ! ' ( ) *", () => {
    expect(percentEncode("!'()*")).toBe("%21%27%28%29%2A");
  });

  it("uses uppercase hex digits", () => {
    expect(percentEncode(" ")).toBe("%20");
    expect(percentEncode(":")).toBe("%3A");
  });
});

describe("encodeAsciiPassthrough (research line 88, 106)", () => {
  it("passes a realistic JS user-agent string through byte-for-byte, per the spec's own example", () => {
    const ua =
      "Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405";
    expect(encodeAsciiPassthrough(ua)).toBe(ua);
  });

  it("does not touch ASCII punctuation: parens, semicolons, commas, slashes stay literal", () => {
    const value = "a;b,c/d(e)f";
    expect(encodeAsciiPassthrough(value)).toBe(value);
  });

  it("percent-encodes non-ASCII characters (UTF-8 bytes)", () => {
    expect(encodeAsciiPassthrough("café")).toBe("caf%C3%A9");
  });

  it("percent-encodes control characters", () => {
    expect(encodeAsciiPassthrough("a\nb")).toBe("a%0Ab");
  });
});

describe("kvStructure / listOfStructures — separators never percent-encoded", () => {
  it("joins pairs with literal = and &", () => {
    expect(kvStructure([["width", "1920"], ["height", "1080"]])).toBe(
      "width=1920&height=1080"
    );
  });

  it("percent-encodes keys and values, never the = or & joining them", () => {
    expect(kvStructure([["my key", "a=b"]])).toBe("my%20key=a%3Db");
  });

  it("joins structures with a literal comma, never percent-encoded", () => {
    expect(listOfStructures(["a=1", "b=2"])).toBe("a=1,b=2");
  });
});

describe("Gov-Client-Timezone: formatTimezone (research lines 145-147)", () => {
  it("formats UTC exactly (offset 0) — never bare UTC", () => {
    expect(formatTimezone(0)).toBe("UTC+00:00");
  });

  it("formats BST (UTC+01:00, offset -60)", () => {
    expect(formatTimezone(-60)).toBe("UTC+01:00");
  });

  it("formats US Eastern (UTC-05:00, offset +300)", () => {
    expect(formatTimezone(300)).toBe("UTC-05:00");
  });

  it("formats a fractional-hour zone: Nepal UTC+05:45 (offset -345)", () => {
    expect(formatTimezone(-345)).toBe("UTC+05:45");
  });

  it("formats India UTC+05:30 (offset -330)", () => {
    expect(formatTimezone(-330)).toBe("UTC+05:30");
  });

  it("always matches UTC±hh:mm, never a bare UTC or IANA name", () => {
    for (const offset of [0, -60, 300, -345, -330, 720, -720]) {
      expect(formatTimezone(offset)).toMatch(/^UTC[+-]\d{2}:\d{2}$/);
    }
  });
});

describe("Gov-Client-Public-IP-Timestamp: formatTimestampMillis (research lines 129-134)", () => {
  it("includes seconds and milliseconds, matching the spec's own example", () => {
    expect(formatTimestampMillis(new Date("2020-09-21T14:30:05.123Z"))).toBe(
      "2020-09-21T14:30:05.123Z"
    );
  });

  it("keeps trailing zero milliseconds — never stripped", () => {
    expect(formatTimestampMillis(new Date("2020-09-21T14:30:05.000Z"))).toBe(
      "2020-09-21T14:30:05.000Z"
    );
  });

  it("matches yyyy-MM-ddThh:mm:ss.sssZ exactly", () => {
    expect(formatTimestampMillis(new Date())).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
  });
});

describe("Gov-Client-Screens: buildScreens (research lines 140-143)", () => {
  it("matches the spec's single-screen example exactly", () => {
    expect(
      buildScreens([{ width: 1920, height: 1080, scalingFactor: 1, colourDepth: 16 }])
    ).toBe("width=1920&height=1080&scaling-factor=1&colour-depth=16");
  });

  it("matches the spec's multi-screen example exactly (comma-joined list of structures)", () => {
    expect(
      buildScreens([
        { width: 1920, height: 1080, scalingFactor: 1, colourDepth: 16 },
        { width: 3000, height: 2000, scalingFactor: 1.25, colourDepth: 16 },
      ])
    ).toBe(
      "width=1920&height=1080&scaling-factor=1&colour-depth=16,width=3000&height=2000&scaling-factor=1.25&colour-depth=16"
    );
  });

  it("rounds width/height to positive whole numbers (v3.3 clarification)", () => {
    expect(
      buildScreens([{ width: 1920.7, height: 1079.4, scalingFactor: 1, colourDepth: 16 }])
    ).toBe("width=1921&height=1079&scaling-factor=1&colour-depth=16");
  });

  it("allows a fractional scaling-factor", () => {
    expect(
      buildScreens([{ width: 100, height: 100, scalingFactor: 1.25, colourDepth: 24 }])
    ).toContain("scaling-factor=1.25");
  });

  it("throws rather than emit an empty list (research line 95: list values must not be empty)", () => {
    expect(() => buildScreens([])).toThrow();
  });
});

describe("Gov-Client-Window-Size: buildWindowSize (research lines 155-156)", () => {
  it("matches the spec's example exactly", () => {
    expect(buildWindowSize(1256, 803)).toBe("width=1256&height=803");
  });

  it("rounds to positive whole numbers", () => {
    expect(buildWindowSize(1256.6, 802.2)).toBe("width=1257&height=802");
  });
});

describe("Gov-Client-User-IDs: buildUserIds (research lines 149-153, unhashed)", () => {
  it("matches the spec's example exactly", () => {
    expect(buildUserIds([["my-application", "alice123"]])).toBe(
      "my-application=alice123"
    );
  });

  it("percent-encodes a value with special characters (e.g. an email sign-in identifier)", () => {
    expect(buildUserIds([["taxsorted", "alice@example.com"]])).toBe(
      "taxsorted=alice%40example.com"
    );
  });

  it("supports multiple identifiers (sign-in id + internal id) joined with &", () => {
    expect(
      buildUserIds([
        ["taxsorted", "alice123"],
        ["internal-id", "usr_9f8"],
      ])
    ).toBe("taxsorted=alice123&internal-id=usr_9f8");
  });
});

describe("Gov-Client-Multi-Factor: buildMultiFactor (research lines 114-124, cannot-collect today)", () => {
  it("returns undefined for no factors — the cannot-collect omission, never an empty header", () => {
    expect(buildMultiFactor([])).toBeUndefined();
  });

  it("builds a single factor with T + 24h timestamp, percent-encoded colons", () => {
    const result = buildMultiFactor([
      {
        type: "AUTH_CODE",
        timestamp: new Date("2021-11-21T13:23:00.000Z"),
        uniqueReference: "fc4b5f",
      },
    ]);
    expect(result).toBe(
      "type=AUTH_CODE&timestamp=2021-11-21T13%3A23%3A00.000Z&unique-reference=fc4b5f"
    );
  });

  it("joins multiple factors with a comma, matching the spec's multi-factor example shape", () => {
    const result = buildMultiFactor([
      {
        type: "AUTH_CODE",
        timestamp: new Date("2021-11-21T13:23:00.000Z"),
        uniqueReference: "fc4b5f",
      },
      {
        type: "TOTP",
        timestamp: new Date("2021-11-21T13:20:00.000Z"),
        uniqueReference: "0283da",
      },
    ]);
    expect(result).toBe(
      "type=AUTH_CODE&timestamp=2021-11-21T13%3A23%3A00.000Z&unique-reference=fc4b5f," +
        "type=TOTP&timestamp=2021-11-21T13%3A20%3A00.000Z&unique-reference=0283da"
    );
  });
});

describe("Gov-Vendor-License-IDs: buildLicenseIds (research lines 173-177, cannot-collect today)", () => {
  it("returns undefined for no licenses — the cannot-collect omission, never an empty header", () => {
    expect(buildLicenseIds({})).toBeUndefined();
  });

  it("matches the spec's example exactly", () => {
    expect(buildLicenseIds({ "my-licensed-software": "8D796349" })).toBe(
      "my-licensed-software=8D796349"
    );
  });

  it("joins multiple licenses with &", () => {
    expect(
      buildLicenseIds({ "software-a": "HASH1", "software-b": "HASH2" })
    ).toBe("software-a=HASH1&software-b=HASH2");
  });
});

describe("Gov-Vendor-Forwarded: buildVendorForwarded (research lines 158-171) — the malformed-Forwarded regression", () => {
  it("matches the spec's simple example when both IPs are present", () => {
    expect(buildVendorForwarded("203.0.113.6", "198.51.100.0")).toBe(
      "by=203.0.113.6&for=198.51.100.0"
    );
  });

  it("returns undefined — NOT a malformed by=&for=<ip> — when the vendor IP is missing", () => {
    expect(buildVendorForwarded("", "198.51.100.0")).toBeUndefined();
  });

  it("returns undefined — NOT a malformed by=<ip>&for= — when the client IP is missing", () => {
    expect(buildVendorForwarded("203.0.113.6", "")).toBeUndefined();
  });

  it("returns undefined when both are missing", () => {
    expect(buildVendorForwarded("", "")).toBeUndefined();
  });

  it("percent-encodes IPv6 colons on both sides", () => {
    expect(
      buildVendorForwarded(
        "2001:0db8:0000:0000:0000:0000:0000:0001",
        "198.51.100.0"
      )
    ).toBe("by=2001%3A0db8%3A0000%3A0000%3A0000%3A0000%3A0000%3A0001&for=198.51.100.0");
  });
});

describe("Gov-Vendor-Version: buildVendorVersion (research lines 187-193)", () => {
  it("matches the spec's single example shape", () => {
    expect(buildVendorVersion([["my-web-app", "2.2.2"]])).toBe("my-web-app=2.2.2");
  });

  it("builds both a client and a server entry (avoids the single-entry warning)", () => {
    expect(
      buildVendorVersion([
        ["taxsorted-frontend", "1.4.0"],
        ["taxsorted-server", "1.4.0"],
      ])
    ).toBe("taxsorted-frontend=1.4.0&taxsorted-server=1.4.0");
  });
});

describe("Gov-Vendor-Product-Name: buildVendorProductName (research lines 179-181)", () => {
  it("matches the spec's own two-word example exactly", () => {
    expect(buildVendorProductName("Tax Sorted")).toBe("Tax%20Sorted");
  });

  it("leaves a one-word name unchanged", () => {
    expect(buildVendorProductName("TaxSorted")).toBe("TaxSorted");
  });
});

describe("collectFraudPreventionHeaders — browser collection, server-side no-window guard", () => {
  it("returns server-safe defaults with no window (never throws)", () => {
    const headers = collectFraudPreventionHeaders("alice");
    expect(headers["Gov-Client-Connection-Method"]).toBe("WEB_APP_VIA_SERVER");
    expect(headers["Gov-Client-Device-ID"]).toBe("server-generated");
    expect(headers["Gov-Client-Timezone"]).toMatch(/^UTC[+-]\d{2}:\d{2}$/);
  });

  it("does not collect Gov-Client-Browser-Plugins or Gov-Client-Browser-Do-Not-Track (dropped from the required list, research lines 76-82)", () => {
    const headers = collectFraudPreventionHeaders("alice") as unknown as Record<string, unknown>;
    expect(headers["Gov-Client-Browser-Plugins"]).toBeUndefined();
    expect(headers["Gov-Client-Browser-Do-Not-Track"]).toBeUndefined();
  });

  it("builds Gov-Vendor-Version from the single VENDOR_VERSION constant for both client and server entries", () => {
    const headers = collectFraudPreventionHeaders();
    expect(headers["Gov-Vendor-Version"]).toBe(
      `taxsorted-frontend=${VENDOR_VERSION}&taxsorted-server=${VENDOR_VERSION}`
    );
  });

  it("percent-encodes the Gov-Vendor-Product-Name", () => {
    const headers = collectFraudPreventionHeaders();
    expect(headers["Gov-Vendor-Product-Name"]).toBe("TaxSorted");
  });

  it("omits Gov-Client-User-IDs (empty string) when no userId is given, never a fabricated identifier", () => {
    const headers = collectFraudPreventionHeaders();
    expect(headers["Gov-Client-User-IDs"]).toBe("");
  });

  it("builds Gov-Client-User-IDs via the taxsorted realm when a userId is given", () => {
    const headers = collectFraudPreventionHeaders("alice123");
    expect(headers["Gov-Client-User-IDs"]).toBe("taxsorted=alice123");
  });
});

describe("headersToRecord", () => {
  it("drops empty-string values (never sends an empty placeholder header)", () => {
    const record = headersToRecord({
      "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
      "Gov-Client-Device-ID": "d1",
      "Gov-Client-User-IDs": "",
      "Gov-Client-Timezone": "UTC+00:00",
      "Gov-Vendor-Version": "a=1",
      "Gov-Vendor-Product-Name": "TaxSorted",
    });
    expect(record["Gov-Client-User-IDs"]).toBeUndefined();
    expect(record["Gov-Client-Device-ID"]).toBe("d1");
  });
});

describe("validateFraudHeaders", () => {
  it("flags all required headers missing from an empty object", () => {
    expect(validateFraudHeaders({})).toEqual(
      expect.arrayContaining([
        "Gov-Client-Connection-Method",
        "Gov-Client-Device-ID",
        "Gov-Client-Timezone",
        "Gov-Vendor-Version",
        "Gov-Vendor-Product-Name",
      ])
    );
  });

  it("returns empty when all required headers are present", () => {
    expect(
      validateFraudHeaders({
        "Gov-Client-Connection-Method": "WEB_APP_VIA_SERVER",
        "Gov-Client-Device-ID": "d1",
        "Gov-Client-Timezone": "UTC+00:00",
        "Gov-Vendor-Version": "a=1",
        "Gov-Vendor-Product-Name": "TaxSorted",
      })
    ).toEqual([]);
  });
});
