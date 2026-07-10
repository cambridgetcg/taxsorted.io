// Public reference data is meant to be reusable by anyone. Tax routes keep their
// narrower credentialed browser policy; the two policies never overlap.

import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { config } from "./config.js";

const publicCivicCors = cors({
  origin: "*",
  allowMethods: ["GET", "HEAD", "OPTIONS"],
  allowHeaders: ["Content-Type", "If-None-Match"],
  exposeHeaders: [
    "ETag",
    "X-Corpus-Version",
    "X-Corpus-Reviewed-On",
    "Link",
    "Content-Disposition",
    "Content-Location",
    "Last-Modified",
    "X-Dataset-Id",
    "X-Dataset-Version",
    "X-Schema-Version",
    "X-Record-Count",
    "X-Checksum-SHA256",
  ],
  maxAge: 86_400,
});

const publicCivicBases = [
  "/v1/open-data",
  "/v1/politics/uk",
  "/v1/tax-system/uk",
  "/v1/tax-industry/uk",
  "/v1/charities/uk",
];

export function isPublicCivicPath(path: string) {
  return path === "/openapi.json" ||
    publicCivicBases.some((base) => path === base || path.startsWith(`${base}/`));
}

const taxCors = cors({
  origin: config.corsOrigins,
  credentials: true,
  allowHeaders: [
    "Content-Type",
    "Gov-Test-Scenario",
    // Mirrors CLIENT_ALLOWLIST in fraud.ts — only the browser-observable
    // headers WEB_APP_VIA_SERVER actually names (research §1). Plugins and
    // Do-Not-Track were dropped from the required list (research lines
    // 76-82) and are not collected or forwarded.
    "Gov-Client-Timezone",
    "Gov-Client-Screens",
    "Gov-Client-Window-Size",
    "Gov-Client-Browser-JS-User-Agent",
  ],
});

export function apiCors(c: Context, next: Next) {
  return isPublicCivicPath(c.req.path)
    ? publicCivicCors(c, next)
    : taxCors(c, next);
}
