// ITSA through the rail, read-only for now: status and obligations straight
// from HMRC's sandbox — no submission until write:self-assessment lands.
// Sandbox-only, exactly like the test-user door: this rail does not exist in
// production yet (no HMRC recognition).

import { Hono } from "hono";
import type { Context } from "hono";
import { config } from "../config.js";
import { ownedEntity } from "../session.js";
import { fraudHeaders } from "../fraud.js";
import { hmrcRequest, HmrcError } from "../hmrc.js";

interface EntityRow {
  id: string;
  nino: string;
}

declare module "hono" {
  interface ContextVariableMap {
    itsaEntity: EntityRow;
  }
}

export const itsa = new Hono();

// This whole rail is sandbox-only for now — production filing unlocks with
// HMRC recognition, same door pattern as the practice-taxpayer mint.
itsa.use("*", async (c, next) => {
  if (config.hmrc.env !== "sandbox") return c.json({ error: "no_such_door" }, 404);
  await next();
});

// Every route here acts on a session-owned, NINO-bearing entity — mirrors
// vat.ts's VRN-bearing entity guard.
itsa.use("/:id/*", async (c, next) => {
  const entity = await ownedEntity(c, c.req.param("id"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  if (!entity.nino) return c.json({ error: "nino_required" }, 422);
  c.set("itsaEntity", entity as EntityRow);
  await next();
});

function hmrcFail(c: Context, e: unknown) {
  if (e instanceof HmrcError) {
    const status = e.status === 428 ? 428 : e.status >= 500 ? 502 : e.status;
    return c.json({ error: "hmrc", message: e.message, detail: e.body ?? null }, status as 400);
  }
  throw e;
}

// Accept versions per HMRC endpoint (Global Constraints): SA Individual
// Details v2.0, Obligations v3.0. VAT's default (v1.0) is untouched.
const ACCEPT_ITSA_STATUS = "application/vnd.hmrc.2.0+json";
const ACCEPT_OBLIGATIONS = "application/vnd.hmrc.3.0+json";

const TAX_YEAR_RE = /^\d{4}-\d{2}$/;

interface ItsaStatusResponse {
  itsaStatuses?: Array<{
    taxYear?: string;
    itsaStatusDetails?: Array<{ status?: string }>;
  }>;
}

// SA Individual Details v2.0: GET /individuals/person/itsa-status/{nino}/{taxYear}
itsa.get("/:id/status", async (c) => {
  const entity = c.get("itsaEntity");
  const taxYear = c.req.query("taxYear");
  if (!taxYear || !TAX_YEAR_RE.test(taxYear)) {
    return c.json(
      { error: "tax_year_required", message: "Give taxYear as YYYY-YY (e.g. 2025-26)." },
      422
    );
  }
  try {
    const data = await hmrcRequest<ItsaStatusResponse>({
      entityId: entity.id,
      path: `/individuals/person/itsa-status/${entity.nino}/${taxYear}`,
      accept: ACCEPT_ITSA_STATUS,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    // Passed through, not derived — the status vocabulary is HMRC's, not ours.
    const status = data?.itsaStatuses?.[0]?.itsaStatusDetails?.[0]?.status ?? null;
    return c.json({ taxYear, status, source: "hmrc-sandbox" });
  } catch (e) {
    return hmrcFail(c, e);
  }
});

interface ObligationsResponse {
  obligations?: Array<{
    obligationDetails?: Array<{
      periodStartDate: string;
      periodEndDate: string;
      dueDate: string;
      status: "open" | "fulfilled";
    }>;
  }>;
}

// Obligations v3.0 income-and-expenditure: GET /obligations/details/{nino}/income-and-expenditure
// Flattened across every business income source the sandbox test user carries.
itsa.get("/:id/obligations", async (c) => {
  const entity = c.get("itsaEntity");
  try {
    const data = await hmrcRequest<ObligationsResponse>({
      entityId: entity.id,
      path: `/obligations/details/${entity.nino}/income-and-expenditure`,
      accept: ACCEPT_OBLIGATIONS,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    const obligations = (data?.obligations ?? []).flatMap((business) =>
      (business.obligationDetails ?? []).map((d) => ({
        periodStart: d.periodStartDate,
        periodEnd: d.periodEndDate,
        dueDate: d.dueDate,
        status: d.status,
      }))
    );
    return c.json({ obligations, source: "hmrc-sandbox" });
  } catch (e) {
    return hmrcFail(c, e);
  }
});
