// HMRC fraud-prevention headers, WEB_APP_VIA_SERVER flavour.
// The browser collects what only it can see (engine's collectFraudPreventionHeaders);
// we accept that allowlisted set and overlay what only the server knows.
//
// Gov-Client-Multi-Factor now ships for passkey sessions (plan C, accounts +
// real MFA landed): sent iff the session signed in within the window AND a
// passkey asserted (mfa_at set) — type=OTHER, timestamp = mfa_at, and the
// precomputed mfa_factor_ref as unique-reference. Recovery and anonymous
// sessions have no passkey event, so the header stays honestly absent.
//
// TWO of the 16 required headers remain spec-recognised "cannot-collect" cases
// for TaxSorted (regs/research/fraud-headers.md §2.3, the missing-data
// protocol) — see RUNBOOK.md "Fraud-prevention headers" for the SDSTeam-
// notification drafts. Neither is sent empty and neither is fabricated:
//   - Gov-Vendor-License-IDs: no licensed software in this free/open commons.
//   - Gov-Client-Public-Port: Fly's proxy exposes Fly-Forwarded-Port (the
//     SERVER port the client connected to, e.g. 443) and X-Forwarded-Port
//     (the port the client set out to connect to) — never the client's
//     ephemeral TCP source port. Genuinely unobtainable behind Fly's proxy.

import type { Context } from "hono";
import {
  buildVendorForwarded,
  buildVendorVersion,
  buildVendorProductName,
  buildUserIds,
  buildMultiFactor,
  VENDOR_VERSION,
  type MultiFactorEntry,
} from "@taxsorted/engine/uk/hmrc";

// Headers the browser may supply; everything else is ours to assert. Only
// the four headers the WEB_APP_VIA_SERVER spec actually names as browser-
// observable (research §1) — Gov-Client-Browser-Plugins and
// Gov-Client-Browser-Do-Not-Track were dropped from this connection method's
// required list and are no longer forwarded (research lines 76-82).
const CLIENT_ALLOWLIST = [
  "gov-client-timezone",
  "gov-client-screens",
  "gov-client-window-size",
  "gov-client-browser-js-user-agent",
] as const;

const VENDOR_PRODUCT_NAME = "TaxSorted";

type ClientAllowlistName = (typeof CLIENT_ALLOWLIST)[number];

export interface FraudHeaderInputs {
  /** Values the browser sent, keyed by the lowercase allowlisted header name
      (as received over the wire) — everything else is ours to assert. */
  clientHeaders: Partial<Record<ClientAllowlistName, string | undefined>>;
  sessionId: string;
  /** The signed-in account's uuid, when the session is signed in within the
      window (by any means, passkey or recovery). Undefined for anonymous
      sessions. Server-asserted from session context only — never read from
      CLIENT_ALLOWLIST or any browser header. Drives Gov-Client-User-IDs:
      the account is the sign-in identity once present, the session id before. */
  accountId?: string;
  deviceId: string;
  /** The multi-factor events to report in Gov-Client-Multi-Factor —
      server-asserted from session context only (never browser-supplied).
      One OTHER entry per passkey assertion this session; empty (or absent)
      for recovery and anonymous sessions, which omit the header honestly. */
  mfaFactors?: MultiFactorEntry[];
  /** Only ever Fly's own header in production — X-Forwarded-For is
      client-spoofable and never trusted. Empty string means unknown. */
  clientIp: string;
  /** The api's own public egress IP (GOV_VENDOR_PUBLIC_IP). Empty string
      means unknown — never fabricated. */
  vendorIp: string;
}

/**
 * The pure, context-independent header assembly — the single code path both
 * the live request handler (`fraudHeaders` below) and the CI validation
 * script (`api/scripts/validate-fraud-headers.ts`) go through, so what's
 * validated against HMRC's Test API is never a copy of production's logic.
 */
export function assembleFraudHeaders(input: FraudHeaderInputs): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const name of CLIENT_ALLOWLIST) {
    const value = input.clientHeaders[name];
    if (value) headers[canonical(name)] = value;
  }

  const now = new Date().toISOString();

  headers["Gov-Client-Connection-Method"] = "WEB_APP_VIA_SERVER";
  headers["Gov-Client-Device-ID"] = input.deviceId;
  // RFC-3986-strict percent-encoding (buildUserIds → percentEncode), not JS's
  // own encodeURIComponent — the latter leaves `! ' ( ) *` unescaped, dormant
  // drift that would reopen the moment account identifiers stop being UUIDs.
  // The account uuid IS the sign-in identifier once signed in (a no-PII
  // account: no email, no name — the uuid is all there is); the session id
  // stands in for it while anonymous.
  headers["Gov-Client-User-IDs"] = buildUserIds([
    ["taxsorted", input.accountId ?? input.sessionId],
  ]);
  if (input.clientIp) {
    headers["Gov-Client-Public-IP"] = input.clientIp;
    headers["Gov-Client-Public-IP-Timestamp"] = now;
  }

  headers["Gov-Vendor-Version"] = buildVendorVersion([
    ["taxsorted-frontend", VENDOR_VERSION],
    ["taxsorted-server", VENDOR_VERSION],
  ]);
  headers["Gov-Vendor-Product-Name"] = buildVendorProductName(VENDOR_PRODUCT_NAME);
  if (input.vendorIp) headers["Gov-Vendor-Public-IP"] = input.vendorIp;

  // Never emit a malformed by=&for=<ip> (the deployed bug this fixes) — only
  // when BOTH sides of the hop are known does the header go out at all.
  const forwarded = buildVendorForwarded(input.vendorIp, input.clientIp);
  if (forwarded) headers["Gov-Vendor-Forwarded"] = forwarded;

  // Gov-Client-Multi-Factor: sent iff a passkey asserted this session (the
  // caller passes one OTHER factor built from mfa_at + mfa_factor_ref). The
  // engine builder returns undefined for an empty list, so recovery and
  // anonymous sessions leave the header honestly absent — never empty.
  if (input.mfaFactors && input.mfaFactors.length > 0) {
    const multiFactor = buildMultiFactor(input.mfaFactors);
    if (multiFactor) headers["Gov-Client-Multi-Factor"] = multiFactor;
  }

  // Gov-Vendor-License-IDs, Gov-Client-Public-Port: deliberately absent —
  // see the file-header comment and RUNBOOK.md (the cannot-collect duo).

  return headers;
}

export function fraudHeaders(c: Context): Record<string, string> {
  const clientHeaders: FraudHeaderInputs["clientHeaders"] = {};
  for (const name of CLIENT_ALLOWLIST) {
    clientHeaders[name] = c.req.header(name);
  }

  return assembleFraudHeaders({
    clientHeaders,
    sessionId: c.get("sessionId"),
    accountId: c.get("accountId"),
    deviceId: c.get("deviceId"),
    mfaFactors: mfaFactorsFrom(c),
    // Only Fly's own header — X-Forwarded-For is client-spoofable and never trusted.
    clientIp: c.req.header("fly-client-ip") || "",
    vendorIp: serverIp(),
  });
}

/** The Gov-Client-Multi-Factor factors for this request, read straight from
    the session context the middleware set — never recomputed here. A passkey
    sign-in stamps mfa_at (the last time the prompt was passed) and precomputes
    mfa_factor_ref (sha256 of the credential id, the header's unique-reference
    and the revocation join key); recovery and anonymous sessions have neither.
    We report the user-verifying passkey as a single type=OTHER factor and send
    nothing (empty list ⇒ header omitted) when either half is missing — the
    reference is the source of truth, never re-derived from a credential id. */
function mfaFactorsFrom(c: Context): MultiFactorEntry[] {
  const mfaAt = c.get("mfaAt");
  const mfaFactorRef = c.get("mfaFactorRef");
  if (!mfaAt || !mfaFactorRef) return [];
  return [{ type: "OTHER", timestamp: mfaAt, uniqueReference: mfaFactorRef }];
}

function serverIp(): string {
  return process.env.GOV_VENDOR_PUBLIC_IP || "";
}

function canonical(lower: string): string {
  return lower
    .split("-")
    .map((part) =>
      part === "js" ? "JS" : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("-");
}
