// VAT through the rail: obligations and liabilities read straight from HMRC;
// returns are engine-validated, submitted once, and receipted forever.

import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";
import { validateVATReturnData } from "@taxsorted/engine/uk/hmrc";
import type { VATReturnData } from "@taxsorted/engine/uk/vat";
import { sql } from "../db.js";
import { config } from "../config.js";
import { ownedEntity } from "../session.js";
import { fraudHeaders } from "../fraud.js";
import { hmrcRequest, HmrcError } from "../hmrc.js";

const SubmitReturn = z.object({
  periodKey: z.string().min(1).max(8),
  vatDueSales: z.number(),
  vatDueAcquisitions: z.number(),
  totalVatDue: z.number(),
  vatReclaimedCurrPeriod: z.number(),
  netVatDue: z.number(),
  totalValueSalesExVAT: z.number(),
  totalValuePurchasesExVAT: z.number(),
  totalValueGoodsSuppliedExVAT: z.number(),
  totalAcquisitionsExVAT: z.number(),
  finalised: z.literal(true, {
    error: "You must confirm the figures are final before filing.",
  }),
});

interface EntityRow {
  id: string;
  vrn: string;
}

declare module "hono" {
  interface ContextVariableMap {
    entity: EntityRow;
  }
}

export const vat = new Hono();

// Every route here acts on a session-owned, VRN-bearing entity.
vat.use("/:id/*", async (c, next) => {
  const entity = await ownedEntity(c, c.req.param("id"));
  if (!entity) return c.json({ error: "not_found" }, 404);
  if (!entity.vrn) return c.json({ error: "vrn_required" }, 422);
  c.set("entity", entity as EntityRow);
  await next();
});

function hmrcFail(c: Context, e: unknown) {
  if (e instanceof HmrcError) {
    const status = e.status === 428 ? 428 : e.status >= 500 ? 502 : e.status;
    return c.json({ error: "hmrc", message: e.message, detail: e.body ?? null }, status as 400);
  }
  throw e;
}

vat.get("/:id/obligations", async (c) => {
  const entity = c.get("entity");
  const { from, to, status } = c.req.query();
  const params = new URLSearchParams();
  if (from && to) {
    params.set("from", from);
    params.set("to", to);
  } else {
    params.set("status", "O"); // default: what's open now
  }
  if (status) params.set("status", status);
  try {
    const data = await hmrcRequest<Record<string, unknown>>({
      entityId: entity.id,
      path: `/organisations/vat/${entity.vrn}/obligations?${params}`,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    if (data) delete data._correlationId;
    return c.json(data ?? { obligations: [] });
  } catch (e) {
    return hmrcFail(c, e);
  }
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

vat.get("/:id/liabilities", async (c) => {
  const entity = c.get("entity");
  const { from, to } = c.req.query();
  if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) {
    return c.json(
      { error: "from_and_to_required", message: "Give from and to as YYYY-MM-DD dates." },
      422
    );
  }
  const params = new URLSearchParams({ from, to });
  try {
    const data = await hmrcRequest<Record<string, unknown>>({
      entityId: entity.id,
      path: `/organisations/vat/${entity.vrn}/liabilities?${params}`,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    if (data) delete data._correlationId;
    return c.json(data);
  } catch (e) {
    return hmrcFail(c, e);
  }
});

vat.get("/:id/submissions", async (c) => {
  const entity = c.get("entity");
  const rows = await sql`
    select id, period_key, hmrc_env, receipt, submitted_at
    from submissions where entity_id = ${entity.id}
    order by submitted_at desc
  `;
  return c.json({ submissions: rows });
});

vat.post("/:id/returns", async (c) => {
  const entity = c.get("entity");
  const parsed = SubmitReturn.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      {
        error: "invalid_return",
        message: parsed.error.issues[0]?.message ?? "The return is not valid.",
        issues: parsed.error.issues,
      },
      422
    );
  }
  const data = parsed.data as VATReturnData;

  // One engine, one truth: the same validation the UI ran, re-run here.
  const verdict = validateVATReturnData(data);
  if (!verdict.valid) {
    return c.json(
      {
        error: "engine_rejected",
        message: verdict.errors[0]?.message ?? "The figures don't add up.",
        issues: verdict.errors,
      },
      422
    );
  }

  // A receipt is forever: one submission per period, ever.
  const [existing] = await sql`
    select receipt, submitted_at from submissions
    where entity_id = ${entity.id} and period_key = ${data.periodKey}
  `;
  if (existing) {
    return c.json(
      { error: "already_filed", receipt: existing.receipt, submitted_at: existing.submitted_at },
      409
    );
  }

  try {
    const receipt = await hmrcRequest<Record<string, unknown>>({
      entityId: entity.id,
      path: `/organisations/vat/${entity.vrn}/returns`,
      method: "POST",
      body: data,
      fraud: fraudHeaders(c),
      testScenario: c.req.header("gov-test-scenario"),
    });
    const correlationId = (receipt?._correlationId as string) ?? null;
    if (receipt) delete receipt._correlationId;
    try {
      const [row] = await sql`
        insert into submissions (entity_id, period_key, hmrc_env, payload, receipt, correlation_id)
        values (${entity.id}, ${data.periodKey}, ${config.hmrc.env},
                ${sql.json(data as never)}, ${sql.json((receipt ?? {}) as never)}, ${correlationId})
        returning id, period_key, hmrc_env, receipt, submitted_at
      `;
      return c.json({ filed: true, submission: row }, 201);
    } catch (e) {
      // A concurrent submit won the unique(entity_id, period_key) race after we
      // both passed the pre-check; answer with the receipt that exists.
      if ((e as { code?: string }).code === "23505") {
        const [won] = await sql`
          select receipt, submitted_at from submissions
          where entity_id = ${entity.id} and period_key = ${data.periodKey}
        `;
        return c.json(
          { error: "already_filed", receipt: won?.receipt, submitted_at: won?.submitted_at },
          409
        );
      }
      throw e;
    }
  } catch (e) {
    return hmrcFail(c, e);
  }
});
