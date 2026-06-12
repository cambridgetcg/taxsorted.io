// HMRC fraud-prevention headers, WEB_APP_VIA_SERVER flavour.
// The browser collects what only it can see (engine's collectFraudPreventionHeaders);
// we accept that allowlisted set and overlay what only the server knows.

import type { Context } from "hono";

// Headers the browser may supply; everything else is ours to assert.
const CLIENT_ALLOWLIST = [
  "gov-client-timezone",
  "gov-client-screens",
  "gov-client-window-size",
  "gov-client-browser-js-user-agent",
  "gov-client-browser-plugins",
  "gov-client-browser-do-not-track",
] as const;

const VENDOR = { name: "TaxSorted", version: "0.1.0" };

export function fraudHeaders(c: Context): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const name of CLIENT_ALLOWLIST) {
    const value = c.req.header(name);
    if (value) headers[canonical(name)] = value;
  }

  // Only Fly's own header — X-Forwarded-For is client-spoofable and never trusted.
  const clientIp = c.req.header("fly-client-ip") || "";
  const now = new Date().toISOString();

  headers["Gov-Client-Connection-Method"] = "WEB_APP_VIA_SERVER";
  headers["Gov-Client-Device-ID"] = c.get("deviceId");
  headers["Gov-Client-User-IDs"] = `taxsorted=${c.get("sessionId")}`;
  if (clientIp) {
    headers["Gov-Client-Public-IP"] = clientIp;
    headers["Gov-Client-Public-IP-Timestamp"] = now;
    headers["Gov-Vendor-Forwarded"] = `by=${serverIp()}&for=${clientIp}`;
  }
  headers["Gov-Vendor-Version"] = `taxsorted-api=${VENDOR.version}`;
  headers["Gov-Vendor-Product-Name"] = VENDOR.name;
  const vendorIp = serverIp();
  if (vendorIp) headers["Gov-Vendor-Public-IP"] = vendorIp;

  return headers;
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
