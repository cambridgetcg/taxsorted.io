// The first ITSA WRITE path: business discovery (Business Details API v2.0)
// and the quarterly cumulative period summary PUT (Self-Employment Business
// API v5.0 / Property Business API v6.0), plus the receipts store. Money
// leaves this device as category totals only — HMRC never sees an
// individual record (see the plan's self-review notes) — and every figure
// crosses from our integer pence into HMRC's decimal pounds exactly once,
// right here, never as float arithmetic.
//
// Wire shapes are pinned against the live OAS, not guessed:
//   - business-details-api v2.0: resources/public/api/conf/2.0/list.yaml
//     + schemas/listAllbusinesses/response.json
//   - self-employment-business-api v5.0: create_amend_cumulative_period_summary.yaml
//     + schemas/createAmendCumulativePeriodSummary/request.json
//   - property-business-api v6.0: uk_property_cumulative_summary_create_or_amend.yaml
//     + schemas/uk_property_cumulative_summary_create_and_amend/def1/request.json
// (full URLs recorded in the task report). The property v6 shape is NOT what
// the self-employment shape would suggest by analogy — top-level
// fromDate/toDate (not a nested periodDates object) and income/expenses
// nested one level deeper under `ukProperty` (not top-level periodIncome/
// periodExpenses) — which is exactly the ambiguity the engine's categories.ts
// CAVEAT flagged as unverified. The leaf field names the engine already uses
// (periodAmount, otherIncome, premisesRunningCosts, residentialFinancialCost,
// …) turned out to match the wire one-for-one; only the envelope differs.
// That envelope difference is owned entirely by this file — the engine's
// category keys stay exactly as they are.

import { Hono } from "hono";
import { z } from "zod";
import { categoriesFor, categoryByKey, quartersFor, type SourceType, type TaxYear } from "@taxsorted/engine/uk/itsa";
import { sql } from "../db.js";
import { config } from "../config.js";
import { ownedEntity } from "../session.js";
import { fraudHeaders } from "../fraud.js";
import { hmrcRequest } from "../hmrc.js";
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

export const itsaSubmit = new Hono();

// Sandbox-only, same door pattern as itsa.ts — no production filing until
// HMRC recognition lands.
itsaSubmit.use("*", async (c, next) => {
  if (config.hmrc.env !== "sandbox") return c.json({ error: "no_such_door" }, 404);
  await next();
});

// Every route here acts on a session-owned, NINO-bearing entity — same guard
// as itsa.ts (duplicated rather than shared, matching this codebase's
// per-file middleware convention: vat.ts and itsa.ts each define their own).
itsaSubmit.use("/:id/*", async (c, next) => {
  const entity = await ownedEntity(c, c.req.param("id"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  if (!entity.nino) return c.json({ error: "nino_required" }, 422);
  c.set("itsaEntity", entity as EntityRow);
  await next();
});

// ---------------------------------------------------------------------------
// Money boundary: integer pence (engine/front) <-> HMRC's decimal pounds.
// This is the ONLY place pence become pounds — never do arithmetic on the
// pounds side; the division happens once, per value, straight into
// toFixed(2), then back to a Number so JSON.stringify emits "1234.56", not a
// float artefact.
// ---------------------------------------------------------------------------
export function penceToPounds(pence: number): number {
  if (!Number.isInteger(pence)) {
    throw new Error(`penceToPounds: not an integer pence value: ${pence}`);
  }
  return Number((pence / 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// GET /:id/businesses — Business Details API v2.0, List All Businesses.
// GET /individuals/business/details/{nino}/list, Accept v2.0.
// ---------------------------------------------------------------------------
const ACCEPT_BUSINESS_DETAILS = "application/vnd.hmrc.2.0+json";

interface ListBusinessesResponse {
  listOfBusinesses?: Array<{
    typeOfBusiness: string;
    businessId: string;
    tradingName?: string;
  }>;
}

itsaSubmit.get("/:id/businesses", async (c) => {
  const entity = c.get("itsaEntity");
  try {
    const data = await hmrcRequest<ListBusinessesResponse>({
      entityId: entity.id,
      rail: "itsa",
      path: `/individuals/business/details/${entity.nino}/list`,
      accept: ACCEPT_BUSINESS_DETAILS,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    const businesses = (data?.listOfBusinesses ?? []).map((b) => ({
      businessId: b.businessId,
      typeOfBusiness: b.typeOfBusiness,
      ...(b.tradingName ? { tradingName: b.tradingName } : {}),
    }));
    return c.json({ businesses });
  } catch (e) {
    return hmrcFail(c, e);
  }
});

// ---------------------------------------------------------------------------
// POST /:id/quarterly-update — the write path.
// ---------------------------------------------------------------------------
const TAX_YEAR_RE = /^\d{4}-\d{2}$/;

/** HMRC's tax-year path param must not span two years: the second pair is
    the first year plus one, mod 100 (so 2099-00 is fine). "2025-27" is the
    OAS's own named counter-example (RULE_TAX_YEAR_RANGE_INVALID). */
function consecutiveTaxYear(taxYear: string): boolean {
  const [start, end] = taxYear.split("-");
  return Number(end) === (Number(start) + 1) % 100;
}

const QuarterlyUpdate = z.object({
  taxYear: z
    .string()
    .regex(TAX_YEAR_RE, "taxYear must look like 2026-27")
    .refine(consecutiveTaxYear, {
      error: "taxYear must not span two years — the second year is the first plus one (e.g. 2026-27)",
    }),
  businessId: z.string().min(1),
  typeOfBusiness: z.enum(["self-employment", "uk-property"]),
  quarterIndex: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  election: z.enum(["standard", "calendar"]),
  totals: z.record(z.string(), z.number()),
});

const ACCEPT_SE = "application/vnd.hmrc.5.0+json";
const ACCEPT_PROPERTY = "application/vnd.hmrc.6.0+json";

/** Every wire key `categoriesFor` will accept for a source — the itemised
    set (includes alwaysSeparate fields like residentialFinancialCost) union
    the consolidated-reporting set (adds the single `consolidatedExpenses`
    key). */
function validKeysFor(source: SourceType): Set<string> {
  const keys = new Set<string>();
  for (const def of categoriesFor(source)) keys.add(def.key);
  for (const def of categoriesFor(source, { consolidated: true })) keys.add(def.key);
  return keys;
}

/** Per-key sign permissions, transcribed from the fetched OAS schemas' own
    `minimum` values — NOT derived from any engine concept, because the wire
    contract is HMRC's to define:
      - self-employment v5.0: every periodExpenses field (incl.
        consolidatedExpenses) has minimum -99999999999.99 — negatives allowed
        (a negative expense is a real bookkeeping event, e.g. a refund
        exceeding the period's costs). All periodIncome fields: minimum 0.
      - uk-property v6.0: expenses allow negatives EXCEPT
        residentialFinancialCost and residentialFinancialCostsCarriedForward
        (both minimum 0 — they feed the Section 24 tax credit and can't be
        negative). All income fields: minimum 0. */
const NEGATIVE_ALLOWED: Record<SourceType, Set<string>> = {
  "self-employment": new Set([
    "consolidatedExpenses",
    "costOfGoods",
    "paymentsToSubcontractors",
    "wagesAndStaffCosts",
    "carVanTravelExpenses",
    "premisesRunningCosts",
    "maintenanceCosts",
    "adminCosts",
    "advertisingCosts",
    "businessEntertainmentCosts",
    "interestOnBankOtherLoans",
    "financeCharges",
    "irrecoverableDebts",
    "professionalFees",
    "depreciation",
    "otherExpenses",
  ]),
  "uk-property": new Set([
    "consolidatedExpenses",
    "premisesRunningCosts",
    "repairsAndMaintenance",
    "financialCosts",
    "professionalFees",
    "costOfServices",
    "travelCosts",
    "other",
  ]),
};

type Split = { income: Record<string, number>; expense: Record<string, number> };
type SplitError = { error: string; message: string; key: string };

/** Splits totals (pence) into HMRC's income/expense buckets (pounds),
    validating every key and value against the engine's category definitions
    and the OAS's sign rules first. Also enforces HMRC's
    RULE_BOTH_EXPENSES_SUPPLIED here, before any network call:
    consolidatedExpenses is mutually exclusive with every itemised expense —
    except, for uk-property, the alwaysSeparate fields
    (residentialFinancialCost, residentialFinancialCostsCarriedForward),
    which the v6 schema explicitly says CAN be submitted alongside
    consolidatedExpenses. The engine's alwaysSeparate flag marks exactly
    those two fields, so it doubles as the carve-out test. */
function splitTotals(totals: Record<string, number>, source: SourceType): Split | SplitError {
  const valid = validKeysFor(source);
  const income: Record<string, number> = {};
  const expense: Record<string, number> = {};
  for (const [key, pence] of Object.entries(totals)) {
    if (!valid.has(key)) {
      return { error: "unknown_category", message: `'${key}' is not a known ${source} category.`, key };
    }
    if (!Number.isInteger(pence)) {
      return { error: "invalid_amount", message: `'${key}' must be a whole number of pence.`, key };
    }
    if (pence < 0 && !NEGATIVE_ALLOWED[source].has(key)) {
      return {
        error: "invalid_amount",
        message: `'${key}' must be a non-negative whole number of pence.`,
        key,
      };
    }
    const def = categoryByKey(key, source);
    const pounds = penceToPounds(pence);
    if (def.kind === "income") income[key] = pounds;
    else expense[key] = pounds;
  }

  // Consolidated vs itemised exclusivity (RULE_BOTH_EXPENSES_SUPPLIED),
  // caught here instead of letting HMRC 400 it.
  if ("consolidatedExpenses" in expense) {
    const clash = Object.keys(expense).find((key) => {
      if (key === "consolidatedExpenses") return false;
      return !categoryByKey(key, source).alwaysSeparate;
    });
    if (clash) {
      return {
        error: "both_expenses_supplied",
        message: `consolidatedExpenses cannot be sent together with itemised expenses ('${clash}').`,
        key: clash,
      };
    }
  }
  return { income, expense };
}

/** HMRC's SE doc, verbatim: "Submissions must include values for income and
    expenses, even if the values are zero. For example, if there is no income
    for the period, submit a periodIncome object with 'turnover' and 'other'
    values of zero." So both buckets are ALWAYS emitted, zero-filled across
    every category the source defines — one-sided quarters (expenses-only
    startups, income-only between-tenants landlords) still send complete
    objects. Expense zero-fill respects the reporting mode: consolidated mode
    sends only what the caller sent (consolidatedExpenses + any alwaysSeparate
    fields — zero-filling itemised keys there would trip
    RULE_BOTH_EXPENSES_SUPPLIED); itemised mode (including the
    nothing-sent-at-all default) zero-fills the full itemised set. */
function zeroFilled(split: Split, source: SourceType): Split {
  const income: Record<string, number> = {};
  for (const def of categoriesFor(source)) {
    if (def.kind === "income") income[def.key] = 0;
  }
  Object.assign(income, split.income);

  let expense: Record<string, number>;
  if ("consolidatedExpenses" in split.expense) {
    expense = { ...split.expense };
  } else {
    expense = {};
    for (const def of categoriesFor(source)) {
      if (def.kind === "expense") expense[def.key] = 0;
    }
    Object.assign(expense, split.expense);
  }
  return { income, expense };
}

function seBody(quarter: { cumulativeStart: string; periodEnd: string }, { income, expense }: Split) {
  return {
    periodDates: { periodStartDate: quarter.cumulativeStart, periodEndDate: quarter.periodEnd },
    periodIncome: income,
    periodExpenses: expense,
  };
}

function propertyBody(quarter: { cumulativeStart: string; periodEnd: string }, { income, expense }: Split) {
  return {
    fromDate: quarter.cumulativeStart,
    toDate: quarter.periodEnd,
    ukProperty: { income, expenses: expense },
  };
}

itsaSubmit.post("/:id/quarterly-update", async (c) => {
  const entity = c.get("itsaEntity");
  const parsed = QuarterlyUpdate.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid_request",
        message: parsed.error.issues[0]?.message ?? "That quarterly update is not valid.",
        issues: parsed.error.issues,
      },
      422
    );
  }
  const { taxYear, businessId, typeOfBusiness, quarterIndex, election, totals } = parsed.data;

  // Validate every total BEFORE any HMRC call — an unknown category or a
  // negative/non-integer pence value never reaches the network.
  const split = splitTotals(totals, typeOfBusiness);
  if ("error" in split) return c.json(split, 422);

  // The regex-validated taxYear string satisfies TaxYear's template-literal
  // shape at runtime; the cast just tells the compiler what the regex
  // already guaranteed (same pattern vat.ts uses for its parsed body).
  const quarter = quartersFor(taxYear as TaxYear, election)[quarterIndex - 1];
  const path =
    typeOfBusiness === "self-employment"
      ? `/individuals/business/self-employment/${entity.nino}/${businessId}/cumulative/${taxYear}`
      : `/individuals/business/property/uk/${entity.nino}/${businessId}/cumulative/${taxYear}`;
  const accept = typeOfBusiness === "self-employment" ? ACCEPT_SE : ACCEPT_PROPERTY;
  const buckets = zeroFilled(split, typeOfBusiness);
  const body =
    typeOfBusiness === "self-employment" ? seBody(quarter, buckets) : propertyBody(quarter, buckets);

  let correlationId: string | null = null;
  try {
    const result = await hmrcRequest<{ _correlationId?: string }>({
      entityId: entity.id,
      rail: "itsa",
      path,
      method: "PUT",
      body,
      accept,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    correlationId = result?._correlationId ?? null;
  } catch (e) {
    // Includes HMRC's insufficient-scope 403 for connections consented
    // before write:self-assessment landed — hmrcFail passes the HMRC error
    // body through as `detail` in sandbox, so the fix ("disconnect and
    // reconnect", see RUNBOOK) diagnoses itself.
    return hmrcFail(c, e);
  }

  // From here the submission EXISTS at HMRC regardless of what happens to
  // our receipt write — so the correlation id (the only trace HMRC gives
  // back) is preserved in the server log BEFORE we touch the database.
  console.log(
    `hmrc accepted quarterly update: entity=${entity.id} business=${businessId} taxYear=${taxYear} quarter=${quarterIndex} periodEnd=${quarter.periodEnd} correlationId=${correlationId ?? "none"}`
  );

  try {
    // Cumulative correction model, not a once-only receipt: resubmitting the
    // same (entity, taxYear, periodEnd, businessId) UPDATES the row — a
    // single atomic upsert, so a concurrent resubmit can never produce a
    // second row for the same key (Postgres resolves the conflict inside
    // the one statement; there is no separate insert-then-catch-23505 step
    // for this path to race on).
    const [row] = await sql`
      insert into itsa_receipts
        (entity_id, tax_year, quarter_index, period_end, business_id, type_of_business,
         hmrc_correlation_id, payload_summary)
      values
        (${entity.id}, ${taxYear}, ${quarterIndex}, ${quarter.periodEnd}, ${businessId}, ${typeOfBusiness},
         ${correlationId}, ${sql.json({ totals, wirePayload: body } as never)})
      on conflict (entity_id, tax_year, period_end, business_id) do update set
        quarter_index = excluded.quarter_index,
        type_of_business = excluded.type_of_business,
        submitted_at = now(),
        superseded_count = itsa_receipts.superseded_count + 1,
        hmrc_correlation_id = excluded.hmrc_correlation_id,
        payload_summary = excluded.payload_summary
      returning id, tax_year, quarter_index, period_end, business_id, type_of_business,
                submitted_at, superseded_count, hmrc_correlation_id
    `;
    return c.json({ receipt: toReceipt(row) }, 201);
  } catch (e) {
    // The narrow, honest failure window: HMRC said yes, our receipt write
    // said no. Never pretend the submission failed (it didn't), never
    // invite a blind resubmit (cumulative PUTs are idempotent-ish but the
    // user should check state first, not spray).
    console.error(
      `receipt write failed AFTER successful HMRC submission: entity=${entity.id} business=${businessId} taxYear=${taxYear} quarter=${quarterIndex} periodEnd=${quarter.periodEnd} correlationId=${correlationId ?? "none"} — ${(e as Error).message}`
    );
    return c.json(
      {
        error: "receipt_write_failed",
        message:
          "HMRC accepted the submission but we could not record the receipt — do not resubmit blindly; refresh to check.",
        hmrcCorrelationId: correlationId,
      },
      500
    );
  }
});

// ---------------------------------------------------------------------------
// GET /:id/receipts — newest first.
// ---------------------------------------------------------------------------
itsaSubmit.get("/:id/receipts", async (c) => {
  const entity = c.get("itsaEntity");
  const rows = await sql`
    select id, tax_year, quarter_index, period_end, business_id, type_of_business,
           submitted_at, superseded_count, hmrc_correlation_id
    from itsa_receipts where entity_id = ${entity.id}
    order by submitted_at desc
  `;
  return c.json({ receipts: rows.map(toReceipt) });
});

function toReceipt(row: Record<string, unknown>) {
  return {
    id: row.id,
    taxYear: row.tax_year,
    quarterIndex: row.quarter_index,
    periodEnd: row.period_end,
    businessId: row.business_id,
    typeOfBusiness: row.type_of_business,
    submittedAt: row.submitted_at,
    supersededCount: row.superseded_count,
    hmrcCorrelationId: row.hmrc_correlation_id ?? null,
  };
}
