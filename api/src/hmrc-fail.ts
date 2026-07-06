// One error-shaping helper for every HMRC-backed route (extracted from the
// identical copies that used to live in vat.ts and itsa.ts). HMRC's own error
// bodies are safe, even useful, to show back in sandbox — they're how a
// developer diagnoses a shape mismatch. In production they must never reach
// the response: an HMRC error body can carry taxpayer-identifying fragments
// (the createTestOrganisation/createTestIndividual comments make the same
// point about mint responses). So production gets a generic message and the
// real detail only ever goes to the server log.

import { config } from "./config.js";
import { HmrcError } from "./hmrc.js";

/** The minimal Hono Context surface this needs — narrower than the full
    Context type so a plain `{ json }` object is enough to unit-test this
    without booting a Hono app. */
export interface JsonResponder {
  json: (body: unknown, status?: number) => Response;
}

const GENERIC_MESSAGE = "HMRC could not complete that request just now.";

export function hmrcFail(c: JsonResponder, e: unknown) {
  if (e instanceof HmrcError) {
    const status = e.status === 428 ? 428 : e.status >= 500 ? 502 : e.status;
    const sandbox = config.hmrc.env === "sandbox";
    if (!sandbox) {
      // The only place this detail is allowed to land in production.
      console.error(`hmrc error (scrubbed from response): ${e.message}`, e.body ?? "");
    }
    return c.json(
      {
        error: "hmrc",
        message: sandbox ? e.message : GENERIC_MESSAGE,
        detail: sandbox ? (e.body ?? null) : null,
      },
      status as 400
    );
  }
  throw e;
}
