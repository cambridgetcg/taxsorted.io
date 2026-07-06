// The OAuth dance with HMRC. State is HMAC-signed and bound to the session,
// so a callback can only ever land on the entity that started it.

import { Hono } from "hono";
import { config } from "../config.js";
import { sql } from "../db.js";
import { signState, verifyState } from "../crypto.js";
import { ownedEntity } from "../session.js";
import {
  authorizeUrl,
  createTestIndividual,
  createTestOrganisation,
  exchangeCode,
  HmrcError,
  revokeConnection,
  storeConnection,
  type Rail,
} from "../hmrc.js";

interface ConnectState {
  entityId: string;
  sessionId: string;
  /** Which rail began the dance — decides where the callback lands (ITSA
      connects start on the dashboard, VAT on the VAT cockpit). Absent in
      states signed before this field existed, which all meant VAT. */
  rail?: Rail;
}

export const connect = new Hono();

connect.get("/status", (c) => {
  return c.json({
    configured: config.hmrc.configured,
    env: config.hmrc.env,
  });
});

function railFrom(c: { req: { query: (name: string) => string | undefined } }): Rail {
  return c.req.query("rail") === "itsa" ? "itsa" : "vat";
}

// Sandbox practice door: mint a pretend taxpayer to file as.
// In production this door does not exist. ?rail=itsa mints an ITSA
// individual (NINO) instead of a VAT organisation (VRN) — default
// unchanged, so existing VAT callers are byte-identical.
connect.post("/test-user", async (c) => {
  if (config.hmrc.env !== "sandbox") return c.json({ error: "no_such_door" }, 404);
  if (!config.hmrc.configured) {
    return c.json(
      { error: "rail_not_configured", message: "HMRC sandbox credentials are not set yet." },
      503
    );
  }
  const rail = railFrom(c);
  try {
    const testUser = rail === "itsa" ? await createTestIndividual() : await createTestOrganisation();
    return c.json({ testUser }, 201);
  } catch (e) {
    // App-level HMRC messages only (no taxpayer data flows through this door).
    const detail = e instanceof HmrcError ? e.message : undefined;
    console.error(`test user mint failed: ${detail ?? e}`);
    return c.json(
      {
        error: "test_user_failed",
        message: "HMRC would not mint a practice taxpayer just now.",
        detail,
      },
      502
    );
  }
});

connect.get("/start/:entityId", async (c) => {
  const rail = railFrom(c);
  // ITSA is sandbox-only until HMRC recognition (no production credentials yet).
  // Same door pattern as the test-user mint.
  if (rail === "itsa" && config.hmrc.env !== "sandbox") {
    return c.json({ error: "no_such_door" }, 404);
  }
  if (!config.hmrc.configured) {
    return c.json(
      { error: "rail_not_configured", message: "HMRC sandbox credentials are not set yet." },
      503
    );
  }
  const entity = await ownedEntity(c, c.req.param("entityId"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  if (rail === "itsa") {
    if (!entity.nino) {
      return c.json(
        { error: "nino_required", message: "Add the entity's National Insurance number before connecting." },
        422
      );
    }
  } else if (!entity.vrn) {
    return c.json({ error: "vrn_required", message: "Add the entity's VRN before connecting." }, 422);
  }
  const state = signState(
    { entityId: entity.id, sessionId: c.get("sessionId"), rail } satisfies ConnectState,
    config.tokenKey
  );
  return c.redirect(authorizeUrl(state, rail));
});

// Severing the link is always available: revoke at HMRC (best effort), then
// delete the tokens. The grant can also be revoked from HMRC's side any time.
connect.delete("/connection/:entityId", async (c) => {
  const entity = await ownedEntity(c, c.req.param("entityId"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  await revokeConnection(entity.id);
  await sql`delete from hmrc_connections where entity_id = ${entity.id}`;
  return c.json({ disconnected: true });
});

connect.get("/callback", async (c) => {
  const { code, state, error } = c.req.query();
  // Verify state up front (when present) so "back" knows which cockpit
  // began the dance. An unverifiable state can't tell us its rail — those
  // land on the VAT cockpit exactly as every callback did before rails.
  const parsed = state ? verifyState<ConnectState>(state, config.tokenKey) : null;
  const valid = parsed && parsed.sessionId === c.get("sessionId") ? parsed : null;
  const back = (outcome: string, entityId?: string) =>
    valid?.rail === "itsa"
      ? c.redirect(`${config.appOrigin}/dashboard?hmrc=${outcome}`)
      : c.redirect(
          `${config.appOrigin}/vat/?${entityId ? `e=${entityId}&` : ""}hmrc=${outcome}`
        );

  if (error) return back("denied");
  if (!code || !state || !valid) return back("invalid");

  try {
    const tokens = await exchangeCode(code);
    await storeConnection(valid.entityId, tokens);
    return back("connected", valid.entityId);
  } catch (e) {
    console.error("hmrc token exchange failed", e);
    return back("failed", valid.entityId);
  }
});
