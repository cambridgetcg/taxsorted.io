#!/usr/bin/env -S npx tsx
// Validates TaxSorted's fraud-prevention headers against HMRC's own Test
// Fraud Prevention Headers API (sandbox only — application-restricted /
// client-credentials, so this runs headlessly, no browser or human needed).
// Ground truth: regs/research/fraud-headers.md §3.
//
// The headers under test come from `assembleFraudHeaders` in
// `api/src/fraud.ts` — the exact function the live request handler
// (`fraudHeaders(c)`) calls in production. This script supplies
// representative values only where a real HTTP request would normally
// supply them (the browser-collected fields, and the client's public IP);
// everything else — the server-side assertions, the percent-encoding, the
// never-fabricate omissions — is byte-for-byte the production code path.
//
// Usage: `cd api && npx tsx scripts/validate-fraud-headers.ts`
// Required env: HMRC_CLIENT_ID, HMRC_CLIENT_SECRET (see RUNBOOK.md
// "Validating fraud-prevention headers against HMRC's Test API"). Optional:
// GOV_VENDOR_PUBLIC_IP (the api's real egress IP — when unset, Gov-Vendor-
// Public-IP and Gov-Vendor-Forwarded are omitted, same as production).
// FRAUD_HEADERS_VALIDATE_API selects the `{api}` path segment for the
// validation-feedback call (default: vat-mtd, the one MTD API TaxSorted has
// live end-to-end today).
//
// Exit code: non-zero when HMRC's validator returns INVALID_HEADERS (or an
// unrecognised response shape — fail closed). POTENTIALLY_INVALID_HEADERS
// (warnings/advisories) exits 0 but the warnings are printed verbatim —
// treat them as findings per the HMRC guide ("you still need to fix any
// issues we find when we test it manually").

import { createHash, randomUUID } from "node:crypto";
import { HMRC_CONFIG, buildScreens, buildWindowSize, encodeAsciiPassthrough } from "@taxsorted/engine/uk/hmrc";
import { assembleFraudHeaders } from "../src/fraud.js";
import { config } from "../src/config.js";

type FetchImpl = typeof fetch;

export function assertCredentials(clientId: string, clientSecret: string): void {
  const missing: string[] = [];
  if (!clientId) missing.push("HMRC_CLIENT_ID");
  if (!clientSecret) missing.push("HMRC_CLIENT_SECRET");
  if (missing.length) {
    throw new Error(
      `Missing ${missing.join(", ")} — see api/RUNBOOK.md "Validating fraud-prevention headers against HMRC's Test API".`
    );
  }
}

/** Client-credentials grant — the Test Fraud Prevention Headers API is
    application-restricted, same app-token pattern as
    `createTestOrganisation`/`createTestIndividual` in api/src/hmrc.ts. */
export async function getAppAccessToken(
  base: string,
  clientId: string,
  clientSecret: string,
  fetchImpl: FetchImpl = fetch
): Promise<string> {
  const res = await fetchImpl(`${base}${HMRC_CONFIG.oauth.token}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`client-credentials token request failed: HTTP ${res.status} ${detail.slice(0, 200)}`);
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("token response missing access_token");
  return body.access_token;
}

/** Builds the full WEB_APP_VIA_SERVER header set via the real production
    assembly function, with representative values standing in only for the
    fields a live browser request would normally supply. */
export function buildRepresentativeHeaders(
  overrides: { clientIp?: string; vendorIp?: string } = {}
): Record<string, string> {
  const clientIp = overrides.clientIp ?? "198.51.100.0"; // RFC 5737 documentation address — no live browser request in a CI/script context
  const vendorIp = overrides.vendorIp ?? (process.env.GOV_VENDOR_PUBLIC_IP || "");

  return assembleFraudHeaders({
    clientHeaders: {
      "gov-client-timezone": "UTC+00:00",
      "gov-client-screens": buildScreens([{ width: 1920, height: 1080, scalingFactor: 1, colourDepth: 24 }]),
      "gov-client-window-size": buildWindowSize(1920, 940),
      "gov-client-browser-js-user-agent": encodeAsciiPassthrough(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
      ),
    },
    sessionId: randomUUID(),
    accountId: randomUUID(),
    deviceId: randomUUID(),
    // A representative passkey assertion so HMRC's validator sees the
    // Gov-Client-Multi-Factor a real signed-in request now carries: type=OTHER
    // (user-verifying passkey), captured just now, and a sha256-hex reference
    // shaped exactly like production's precomputed mfa_factor_ref (never a raw
    // credential id). Not a live sign-in — a stand-in for one, same as the
    // browser-collected fields above.
    mfaFactors: [
      {
        type: "OTHER",
        timestamp: new Date(),
        uniqueReference: createHash("sha256")
          .update("taxsorted-mfa-v1:representative-passkey-credential")
          .digest("hex"),
      },
    ],
    clientIp,
    vendorIp,
  });
}

export interface TestApiResult {
  status: number;
  body: Record<string, unknown>;
}

/** `GET /test/fraud-prevention-headers/validate` — call with the exact
    headers the app will send (research §3.1). */
export async function validateHeaders(
  base: string,
  token: string,
  headers: Record<string, string>,
  fetchImpl: FetchImpl = fetch
): Promise<TestApiResult> {
  const res = await fetchImpl(`${base}/test/fraud-prevention-headers/validate`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.hmrc.1.0+json",
      ...headers,
    },
  });
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

/** `GET /test/fraud-prevention-headers/{api}/validation-feedback` — per-header
    breakdown of the most recent request to that API (research §3.2). */
export async function getValidationFeedback(
  base: string,
  token: string,
  api: string,
  connectionMethod: string,
  fetchImpl: FetchImpl = fetch
): Promise<TestApiResult> {
  const url = `${base}/test/fraud-prevention-headers/${api}/validation-feedback?connectionMethod=${connectionMethod}`;
  const res = await fetchImpl(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.hmrc.1.0+json",
    },
  });
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

/** The two headers TaxSorted documents as spec-recognised cannot-collect
    cases (RUNBOOK.md "Fraud-prevention headers", the missing-data protocol):
    no licensed software on the device, and no client source port behind Fly's
    proxy. HMRC's validator may report either as a MISSING_HEADER — a
    considered, SDSTeam-notified omission, not a bug. Gov-Client-Multi-Factor
    used to be a third here; it ships now (this task), so its absence is once
    again a real failure. Lowercased to compare case-insensitively. */
const TOLERATED_MISSING_HEADERS = new Set([
  "gov-vendor-license-ids",
  "gov-client-public-port",
]);

/** One entry in an INVALID_HEADERS `errors[]` (research §3.1): each carries a
    `code` (INVALID_HEADER | MISSING_HEADER | cross-header INVALID_HEADERS), a
    human `message`, and the `headers[]` it concerns. */
interface ValidationError {
  code?: string;
  message?: string;
  headers?: string[];
}

/** Non-zero on INVALID_HEADERS, and fail closed (non-zero) on any shape we
    don't recognise — VALID_HEADERS and POTENTIALLY_INVALID_HEADERS (warnings
    only) exit clean. One narrow exception: an INVALID_HEADERS response whose
    errors are ALL MISSING_HEADER for exactly the documented cannot-collect duo
    (and nothing else) also exits clean — those omissions are intentional and
    notified. A missing header outside the duo, a format (INVALID_HEADER)
    error, or an INVALID_HEADERS with no error detail all still fail closed. */
export function decideExitCode(
  body: { code?: string; errors?: ValidationError[] } | undefined
): number {
  const code = body?.code;
  if (code === "VALID_HEADERS" || code === "POTENTIALLY_INVALID_HEADERS") return 0;
  if (code === "INVALID_HEADERS") {
    const errors = body?.errors;
    if (!errors || errors.length === 0) return 1; // INVALID with no detail → fail closed
    const everyErrorIsAToleratedMissingHeader = errors.every(
      (e) =>
        e.code === "MISSING_HEADER" &&
        Array.isArray(e.headers) &&
        e.headers.length > 0 &&
        e.headers.every((h) => TOLERATED_MISSING_HEADERS.has(h.toLowerCase()))
    );
    return everyErrorIsAToleratedMissingHeader ? 0 : 1;
  }
  return 1;
}

async function main() {
  assertCredentials(config.hmrc.clientId, config.hmrc.clientSecret);

  // The Test Fraud Prevention Headers API exists in sandbox only (its own
  // OAS `servers:` block lists nothing else) — always sandbox, regardless
  // of HMRC_ENV.
  const base = HMRC_CONFIG.sandbox.api;
  const token = await getAppAccessToken(base, config.hmrc.clientId, config.hmrc.clientSecret);

  const headers = buildRepresentativeHeaders();
  console.log("Fraud-prevention headers under test (WEB_APP_VIA_SERVER):");
  console.log(JSON.stringify(headers, null, 2));

  const validation = await validateHeaders(base, token, headers);
  console.log(`\nGET /test/fraud-prevention-headers/validate -> HTTP ${validation.status}`);
  console.log(JSON.stringify(validation.body, null, 2));

  const api = process.env.FRAUD_HEADERS_VALIDATE_API || "vat-mtd";
  const feedback = await getValidationFeedback(base, token, api, "WEB_APP_VIA_SERVER");
  console.log(`\nGET /test/fraud-prevention-headers/${api}/validation-feedback -> HTTP ${feedback.status}`);
  console.log(JSON.stringify(feedback.body, null, 2));

  const exitCode = decideExitCode(validation.body as { code?: string });
  if (exitCode !== 0) {
    console.error(
      `\nFraud-prevention header validation FAILED (code: ${String(validation.body.code)}) — see errors[]/warnings[] above.`
    );
  }
  process.exitCode = exitCode;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
