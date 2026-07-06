// ITSA through the rail, read-only for now: status and obligations straight
// from HMRC's sandbox — no submission until write:self-assessment lands.
// Sandbox-only, exactly like the test-user door: this rail does not exist in
// production yet (no HMRC recognition).

import { Hono } from "hono";
import { config } from "../config.js";
import { ownedEntity } from "../session.js";
import { fraudHeaders } from "../fraud.js";
import { hmrcRequest, HmrcError } from "../hmrc.js";
import { hmrcFail } from "../hmrc-fail.js";

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
      rail: "itsa",
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
      rail: "itsa",
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

// ---------------------------------------------------------------------------
// Individual Calculations API v8.0: trigger + retrieve. Wire shapes verified
// against the fetched OAS (URLs in the task report):
//   - trigger.yaml: POST /individuals/calculations/{nino}/self-assessment/
//     {taxYear}/trigger/{calculationType}. calculationType's own enum grew a
//     third value (intent-to-amend) in the tax-years-2025-26-onwards wave,
//     but the value this endpoint always sends stays "in-year" — the same
//     value HMRC has accepted since the very first version of this
//     parameter, for exactly the case this route serves ("call whenever
//     income data is updated" — never a final declaration, which is M3
//     surface). Response body: { calculationId } (202 Accepted).
//   - retrieve.yaml: GET /individuals/calculations/{nino}/self-assessment/
//     {taxYear}/{calculationId}. Response is `oneOf` four huge tax-year-keyed
//     schemas (def1..def4 — def4 covers TY 2026-27 onwards); only
//     calculation.taxCalculation.totalIncomeTaxAndNicsDue and
//     calculation.taxCalculation.incomeTax.totalTaxableIncome are mapped
//     through here, per the plan (the rest — messages, every income-source
//     breakdown, CGT, previousCalculation, endOfYearEstimate, ... — is M3
//     surface). The OAS's own retrieve description is explicit that a
//     calculation triggered moments ago answers 404 while HMRC computes it
//     ("if the calculation has ... not yet completed, this endpoint will
//     return 404 Not Found") — the SAME status code the OAS also documents
//     for a genuinely-unknown calculationId (MATCHING_RESOURCE_NOT_FOUND).
//     HMRC gives no way to tell those two apart from here, so any 404 is
//     surfaced honestly as { status: 'computing' } rather than an error —
//     the frontend (Task 4) polls this endpoint (max 5 tries, backoff) until
//     it sees something other than 'computing'.
// ---------------------------------------------------------------------------
const ACCEPT_CALCULATIONS = "application/vnd.hmrc.8.0+json";

itsa.post("/:id/calculation", async (c) => {
  const entity = c.get("itsaEntity");
  const body = await c.req.json().catch(() => ({}));
  const taxYear = (body as { taxYear?: unknown })?.taxYear;
  if (typeof taxYear !== "string" || !TAX_YEAR_RE.test(taxYear)) {
    return c.json(
      { error: "tax_year_required", message: "Give taxYear as YYYY-YY (e.g. 2026-27)." },
      422
    );
  }
  try {
    const data = await hmrcRequest<{ calculationId?: string }>({
      entityId: entity.id,
      rail: "itsa",
      method: "POST",
      path: `/individuals/calculations/${entity.nino}/self-assessment/${taxYear}/trigger/in-year`,
      accept: ACCEPT_CALCULATIONS,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    return c.json({ calculationId: data?.calculationId ?? null }, 202);
  } catch (e) {
    return hmrcFail(c, e);
  }
});

interface CalculationResponse {
  calculation?: {
    taxCalculation?: {
      totalIncomeTaxAndNicsDue?: number;
      incomeTax?: {
        totalTaxableIncome?: number;
      };
    };
  };
}

// The OAS's own calculationId pattern (common/pathParameters.yaml — the same
// pattern the trigger response schema declares): an 8-digit id or a v1-v5
// UUID. HMRC's regex as published anchors sloppily (its `^` binds only to
// the first alternative), so the alternation is grouped here to match the
// clear intent — either form must span the whole string.
const CALCULATION_ID_RE =
  /^([0-9]{8}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

itsa.get("/:id/calculation/:calcId", async (c) => {
  const entity = c.get("itsaEntity");
  const calcId = c.req.param("calcId");
  const taxYear = c.req.query("taxYear");
  if (!taxYear || !TAX_YEAR_RE.test(taxYear)) {
    return c.json(
      { error: "tax_year_required", message: "Give taxYear as YYYY-YY (e.g. 2026-27)." },
      422
    );
  }
  // Never splice an unvalidated segment into the HMRC path — every other
  // input in this file is gated the same way (nino by the entity guard,
  // taxYear by TAX_YEAR_RE).
  if (!CALCULATION_ID_RE.test(calcId)) {
    return c.json(
      {
        error: "calculation_id_invalid",
        message: "calculationId must be the id the trigger endpoint returned.",
      },
      422
    );
  }
  try {
    const data = await hmrcRequest<CalculationResponse>({
      entityId: entity.id,
      rail: "itsa",
      path: `/individuals/calculations/${entity.nino}/self-assessment/${taxYear}/${calcId}`,
      accept: ACCEPT_CALCULATIONS,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    const taxCalculation = data?.calculation?.taxCalculation;
    return c.json({
      status: "complete",
      // HMRC's decimal pounds, NOT pence — do not divide by 100. Everything
      // else in this codebase is integer pence; the Pounds suffix keeps
      // these two from ever being fed through a pence formatter (which
      // would show HMRC's figure 100x too small).
      incomeTaxAndNicsDuePounds: taxCalculation?.totalIncomeTaxAndNicsDue ?? null,
      taxableIncomePounds: taxCalculation?.incomeTax?.totalTaxableIncome ?? null,
      source: "hmrc-sandbox",
    });
  } catch (e) {
    // Honest, not evasive: this is the ONE HMRC status code this route does
    // not hand to hmrcFail, because the OAS documents it as the expected
    // shape of "still computing", not a failure.
    if (e instanceof HmrcError && e.status === 404) {
      return c.json({ status: "computing", source: "hmrc-sandbox" });
    }
    return hmrcFail(c, e);
  }
});
