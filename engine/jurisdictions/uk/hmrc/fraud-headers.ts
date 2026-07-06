/// <reference lib="dom" />
// HMRC Fraud Prevention Headers — WEB_APP_VIA_SERVER connection method.
// Required by law for MTD VAT + MTD ITSA API calls (SI 2019/360 + the
// Commissioners' Directions). Ground truth: regs/research/fraud-headers.md
// (spec v3.3). Browser-side collection lives here — guarded so it is safe to
// import on a server; the api's server-side assembly (api/src/fraud.ts)
// imports the pure builders below for the headers only the server can know.
//
// Every builder function cites the research-file section it implements.
// Three of the 16 headers are spec-recognised "cannot-collect" cases for
// TaxSorted today (research §2.3, the missing-data protocol) — they are
// documented in api/RUNBOOK.md with SDSTeam-notification drafts, never sent
// empty and never fabricated:
//   - Gov-Client-Multi-Factor: no MFA exists yet (anonymous device sessions).
//   - Gov-Vendor-License-IDs: no licensed software in this free/open commons.
//   - Gov-Client-Public-Port: Fly's proxy exposes Fly-Forwarded-Port (the
//     SERVER port the client connected to) and X-Forwarded-Port (client-
//     intended port), never the client's ephemeral TCP source port.
// The builders for the first two are implemented and tested below so they
// are ready the moment they become collectible (Multi-Factor: plan C,
// accounts + real MFA; License-IDs: if TaxSorted ever bundles licensed
// software). Public-Port has no builder — there is nothing to build.

import { getHMRCConfig, VENDOR_VERSION } from "./config";
import type { FraudPreventionHeaders } from "../vat/types";

// Connection methods
export type ConnectionMethod =
  | "WEB_APP_VIA_SERVER"
  | "DESKTOP_APP_DIRECT"
  | "MOBILE_APP_DIRECT"
  | "BATCH_PROCESS_DIRECT";

// Device ID storage key
const DEVICE_ID_KEY = "taxsorted_device_id";

// ============================================================================
// Encoding primitives — research §2.1 (lines 86-98)
// ============================================================================

/**
 * RFC 3986 §2.1 percent-encoding, strict unreserved-set version: only
 * `A-Z a-z 0-9 - . _ ~` pass through unescaped; everything else (including
 * space, comma, equals, colon, and the punctuation JS's own
 * `encodeURIComponent` leaves alone — `! ' ( ) *`) is percent-encoded.
 *
 * Used for every key and value inside a key-value STRUCTURE or LIST
 * structure (Screens, Window-Size, User-IDs, Multi-Factor, License-IDs,
 * Vendor-Forwarded, Vendor-Version, Vendor-Product-Name). Callers encode
 * each component individually, then join with the LITERAL separators
 * `=`, `&`, `,` — those must never themselves be percent-encoded
 * (research line 96: "Do not percent-encode the separators").
 */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

/**
 * For plain single-value headers that are NOT a key-value/list structure
 * (only Gov-Client-Browser-JS-User-Agent today) — the spec's own example
 * (research line 106) shows the raw user-agent string, parens/spaces/
 * semicolons and all. The "US-ASCII, other characters percent encoded" rule
 * (research line 88) means only bytes OUTSIDE printable US-ASCII need
 * encoding; ordinary ASCII punctuation is not "another character" and stays
 * literal, matching the spec example byte-for-byte.
 */
export function encodeAsciiPassthrough(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x20 && code <= 0x7e) {
      out += ch;
    } else {
      for (const byte of new TextEncoder().encode(ch)) {
        out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
      }
    }
  }
  return out;
}

/** One key-value pair inside a key-value STRUCTURE: `<key>=<value>`, both
 * percent-encoded (research line 92: "Keys and values must be percent
 * encoded"). */
function kv(key: string, value: string): string {
  return `${percentEncode(key)}=${percentEncode(value)}`;
}

/** Join key-value pairs into one key-value STRUCTURE: `k1=v1&k2=v2&…`
 * (research line 90-93). */
export function kvStructure(pairs: Array<[string, string]>): string {
  return pairs.map(([k, v]) => kv(k, v)).join("&");
}

/** Join several key-value STRUCTURES into a LIST: `struct1,struct2,…`
 * (research line 94-95: list structure, comma-separated, values must not be
 * empty). Each inner structure keeps its own literal `=`/`&`; only the outer
 * commas separate list entries. */
export function listOfStructures(structures: string[]): string {
  return structures.join(",");
}

// ============================================================================
// Pure per-header formatters — each cites its research-file lines
// ============================================================================

/**
 * Gov-Client-Timezone (research lines 145-147): "a recognised timezone in
 * UTC format, expressed as UTC±<hh>:<mm>" — bare "UTC" fails validation.
 * `offsetMinutes` is `Date.prototype.getTimezoneOffset()`'s convention:
 * positive when local time is BEHIND UTC, negative when AHEAD.
 */
export function formatTimezone(offsetMinutes: number): string {
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const sign = offsetMinutes <= 0 ? "+" : "-";
  return `UTC${sign}${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Gov-Client-Public-IP-Timestamp (research lines 129-134): "You must include
 * seconds and milliseconds, including trailing zeros" — format
 * `yyyy-MM-ddThh:mm:ss.sssZ`. Also reused for Multi-Factor's `timestamp`
 * field (research line 117-118: minimum `yyyy-MM-ddThh:mmZ`, seconds and
 * milliseconds optional but allowed) — sending full precision everywhere
 * keeps one formatter as the single source of truth.
 */
export function formatTimestampMillis(date: Date): string {
  return date.toISOString();
}

/**
 * Gov-Client-Screens (research lines 140-143): a LIST of key-value
 * STRUCTURES, one per screen — width/height must be positive whole numbers,
 * scaling-factor may be fractional, colour-depth in bits. Order matches the
 * spec's own example: width, height, scaling-factor, colour-depth.
 */
export interface ScreenSpec {
  width: number;
  height: number;
  scalingFactor: number;
  colourDepth: number;
}

export function buildScreens(screens: ScreenSpec[]): string {
  if (screens.length === 0) {
    throw new Error(
      "Gov-Client-Screens: list values must not be empty (research §2.1, line 95)"
    );
  }
  return listOfStructures(
    screens.map((s) =>
      kvStructure([
        ["width", String(Math.round(s.width))],
        ["height", String(Math.round(s.height))],
        ["scaling-factor", String(s.scalingFactor)],
        ["colour-depth", String(Math.round(s.colourDepth))],
      ])
    )
  );
}

/** Gov-Client-Window-Size (research lines 155-156): key-value structure,
 * `width`/`height` in pixels, positive whole numbers. */
export function buildWindowSize(width: number, height: number): string {
  return kvStructure([
    ["width", String(Math.round(width))],
    ["height", String(Math.round(height))],
  ]);
}

/** Gov-Client-User-IDs (research lines 149-153): key-value structure, one
 * pair per account the user holds — key is your realm/product, value is the
 * sign-in identifier. NOT required to be hashed (unlike License-IDs and
 * Multi-Factor's unique-reference). */
export function buildUserIds(entries: Array<[string, string]>): string {
  return kvStructure(entries);
}

/** Gov-Client-Multi-Factor (research lines 114-124): list of key-value
 * structures, one per factor — `type`, `timestamp` (T + 24h format
 * mandatory), `unique-reference` (hashed, never the raw secret). Returns
 * `undefined` when there are no factors — the cannot-collect case (no MFA)
 * omits the header entirely, never an empty value. */
export type MultiFactorType = "TOTP" | "AUTH_CODE" | "OTHER";

export interface MultiFactorEntry {
  type: MultiFactorType;
  timestamp: Date;
  uniqueReference: string;
}

export function buildMultiFactor(factors: MultiFactorEntry[]): string | undefined {
  if (factors.length === 0) return undefined;
  return listOfStructures(
    factors.map((f) =>
      kvStructure([
        ["type", f.type],
        ["timestamp", formatTimestampMillis(f.timestamp)],
        ["unique-reference", f.uniqueReference],
      ])
    )
  );
}

/** Gov-Vendor-License-IDs (research lines 173-177): key-value structure of
 * hashed licence keys, `<software-name>=<hashed-license-value>`. Returns
 * `undefined` when there are no licences — the cannot-collect case (free/
 * open-source, no licensed software) omits the header entirely. */
export function buildLicenseIds(licenses: Record<string, string>): string | undefined {
  const entries = Object.entries(licenses);
  if (entries.length === 0) return undefined;
  return kvStructure(entries);
}

/**
 * Gov-Vendor-Forwarded (research lines 158-171): a LIST of key-value
 * structures, one per TLS-terminating hop, `by` (server's own public IP —
 * Gov-Vendor-Public-IP for the first hop) and `for` (the sender's public IP
 * — Gov-Client-Public-IP for the first hop). HMRC cross-validates this
 * against Gov-Vendor-Public-IP and Gov-Client-Public-IP, so it must NEVER be
 * emitted with one side missing (that produced the deployed bug
 * `by=&for=<ip>` this task fixes) — returns `undefined` unless BOTH IPs are
 * known, so the caller can omit the header rather than send it malformed.
 */
export function buildVendorForwarded(vendorIp: string, clientIp: string): string | undefined {
  if (!vendorIp || !clientIp) return undefined;
  return kvStructure([
    ["by", vendorIp],
    ["for", clientIp],
  ]);
}

/** Gov-Vendor-Version (research lines 187-193): key-value structure
 * `<software-name>=<version-number>&…`. The Test API warns on a single entry
 * for client-server architectures — always pass at least a client and a
 * server entry. */
export function buildVendorVersion(entries: Array<[string, string]>): string {
  return kvStructure(entries);
}

/** Gov-Vendor-Product-Name (research lines 179-181): "name of the product
 * marketed to end users", percent encoded — spec's own example is
 * `Tax%20Sorted` for a two-word name. */
export function buildVendorProductName(name: string): string {
  return percentEncode(name);
}

// ============================================================================
// Browser-side collection (only what a browser can see)
// ============================================================================

/**
 * Get or create a persistent device ID
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-generated";
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get screen information — Gov-Client-Screens, one screen (a browser only
 * ever exposes its own `window.screen`; multi-monitor enumeration has no
 * universally-supported JS API).
 */
function getScreenInfo(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return buildScreens([
    {
      width: screen.width,
      height: screen.height,
      scalingFactor: window.devicePixelRatio,
      colourDepth: screen.colorDepth,
    },
  ]);
}

/**
 * Get window size — Gov-Client-Window-Size.
 */
function getWindowSize(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return buildWindowSize(window.innerWidth, window.innerHeight);
}

/**
 * Get timezone in HMRC format — Gov-Client-Timezone.
 */
function getTimezone(): string {
  return formatTimezone(new Date().getTimezoneOffset());
}

/**
 * Collect fraud prevention headers for browser-based requests.
 *
 * NOTE: `Gov-Client-Browser-Plugins` and `Gov-Client-Browser-Do-Not-Track`
 * were deliberately removed (were sent here previously) — both were dropped
 * from the WEB_APP_VIA_SERVER required list (research lines 76-82: Plugins
 * dropped 31 Jan 2022, Do-Not-Track dropped in spec v3.2). Sending them was
 * privacy expansion beyond the legal requirement with no spec basis —
 * removed per the Global Constraint "collect only what the spec names".
 */
export function collectFraudPreventionHeaders(
  userId?: string,
  connectionMethod: ConnectionMethod = "WEB_APP_VIA_SERVER"
): FraudPreventionHeaders {
  const config = getHMRCConfig();

  const headers: FraudPreventionHeaders = {
    "Gov-Client-Connection-Method": connectionMethod,
    "Gov-Client-Device-ID": getDeviceId(),
    "Gov-Client-User-IDs": userId ? buildUserIds([["taxsorted", userId]]) : "",
    "Gov-Client-Timezone": getTimezone(),
    "Gov-Vendor-Version": buildVendorVersion([
      ["taxsorted-frontend", VENDOR_VERSION],
      ["taxsorted-server", VENDOR_VERSION],
    ]),
    "Gov-Vendor-Product-Name": buildVendorProductName(config.vendor.name),
  };

  // Browser-specific headers (only available in browser environment)
  if (typeof window !== "undefined") {
    headers["Gov-Client-Screens"] = getScreenInfo();
    headers["Gov-Client-Window-Size"] = getWindowSize();
    headers["Gov-Client-Browser-JS-User-Agent"] = encodeAsciiPassthrough(navigator.userAgent);
  }

  return headers;
}

/**
 * Convert headers object to HTTP headers format
 */
export function headersToRecord(headers: FraudPreventionHeaders): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Validate fraud prevention headers
 * Returns list of missing required headers
 */
export function validateFraudHeaders(headers: Partial<FraudPreventionHeaders>): string[] {
  const required = [
    "Gov-Client-Connection-Method",
    "Gov-Client-Device-ID",
    "Gov-Client-Timezone",
    "Gov-Vendor-Version",
    "Gov-Vendor-Product-Name",
  ];

  return required.filter((key) => !headers[key as keyof FraudPreventionHeaders]);
}
