// HMRC fraud-prevention headers, WEB_APP_VIA_SERVER flavour.
// The browser collects what only it can see (engine's collectFraudPreventionHeaders);
// we accept that allowlisted set and overlay what only the server knows.
//
// Three of the 16 required headers are spec-recognised "cannot-collect" cases
// for TaxSorted today (regs/research/fraud-headers.md §2.3, the missing-data
// protocol) — see RUNBOOK.md "Fraud-prevention headers" for the SDSTeam-
// notification drafts. None are sent empty and none are fabricated:
//   - Gov-Client-Multi-Factor: no MFA exists yet (anonymous device sessions;
//     ships once accounts + real MFA land — plan C).
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
  VENDOR_VERSION,
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
  deviceId: string;
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
  headers["Gov-Client-User-IDs"] = buildUserIds([["taxsorted", input.sessionId]]);
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

  // Gov-Client-Multi-Factor, Gov-Vendor-License-IDs, Gov-Client-Public-Port:
  // deliberately absent — see the file-header comment and RUNBOOK.md.

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
    deviceId: c.get("deviceId"),
    // Only Fly's own header — X-Forwarded-For is client-spoofable and never trusted.
    clientIp: c.req.header("fly-client-ip") || "",
    vendorIp: serverIp(),
  });
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
