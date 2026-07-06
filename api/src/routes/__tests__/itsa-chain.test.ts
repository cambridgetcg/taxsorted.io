// Task 5 of the M2-rails plan: the cross-endpoint integration proof. Every
// endpoint below already has its own focused unit tests (itsa-submit.test.ts,
// itsa.test.ts) — this file adds no new endpoint behavior. What it proves is
// the SEAM: that the businessId GET /businesses hands back is the same one
// POST /quarterly-update accepts; that the receipt the quarterly-update
// creates is the one GET /receipts lists back; that the calculationId
// POST /calculation hands back is the same one GET /calculation/:id polls;
// and that HMRC's real "still computing" 404 resolves to a complete figure
// on a second poll — all inside ONE continuous session, against ONE
// stateful mock and ONE in-memory receipts table, exactly like a real
// sandbox walk (and the RUNBOOK's manual E2E) would exercise it.

import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.doUnmock("../../db.js");
  vi.doUnmock("../../session.js");
  vi.doUnmock("../../hmrc.js");
});

function sandboxEnv() {
  vi.stubEnv("HMRC_ENV", "sandbox");
  vi.stubEnv("HMRC_CLIENT_ID", "id");
  vi.stubEnv("HMRC_CLIENT_SECRET", "secret");
  vi.stubEnv("TOKEN_KEY", "a".repeat(64));
}

const ENTITY = { id: "e1", nino: "AA123456A" };

function mockEntity() {
  vi.doMock("../../session.js", () => ({
    ownedEntity: vi.fn(async () => ENTITY),
  }));
}

/** The same tiny in-memory itsa_receipts stand-in as itsa-submit.test.ts
    (insert .. on conflict .. do update, plus the plain newest-first list
    select) — copied rather than shared, matching this suite's existing
    per-file fixture convention. Persists across every request the chain
    makes within the test, the way real Postgres would across one session. */
function fakeReceiptsDb() {
  const rows: Array<Record<string, unknown>> = [];
  let nextId = 1;
  let seq = 0;
  function sql(strings: TemplateStringsArray, ...values: unknown[]) {
    const text = strings.join("?").toLowerCase();
    if (text.includes("insert into itsa_receipts")) {
      const [entityId, taxYear, quarterIndex, periodEnd, businessId, typeOfBusiness, correlationId, payloadSummary] =
        values as [string, string, number, string, string, string, string | null, { __json: unknown }];
      const existing = rows.find(
        (r) =>
          r.entity_id === entityId &&
          r.tax_year === taxYear &&
          r.period_end === periodEnd &&
          r.business_id === businessId
      );
      const summary = payloadSummary && typeof payloadSummary === "object" && "__json" in payloadSummary
        ? (payloadSummary as { __json: unknown }).__json
        : payloadSummary;
      if (existing) {
        existing.quarter_index = quarterIndex;
        existing.type_of_business = typeOfBusiness;
        existing.submitted_at = new Date();
        existing._seq = seq++;
        existing.superseded_count = (existing.superseded_count as number) + 1;
        existing.hmrc_correlation_id = correlationId;
        existing.payload_summary = summary;
        return Promise.resolve([{ ...existing }]);
      }
      const row = {
        id: `receipt-${nextId++}`,
        entity_id: entityId,
        tax_year: taxYear,
        quarter_index: quarterIndex,
        period_end: periodEnd,
        business_id: businessId,
        type_of_business: typeOfBusiness,
        submitted_at: new Date(),
        _seq: seq++,
        superseded_count: 0,
        hmrc_correlation_id: correlationId,
        payload_summary: summary,
      };
      rows.push(row);
      return Promise.resolve([{ ...row }]);
    }
    if (text.includes("select") && text.includes("from itsa_receipts")) {
      const [entityId] = values as string[];
      return Promise.resolve(
        rows
          .filter((r) => r.entity_id === entityId)
          .slice()
          .sort((a, b) => (b._seq as number) - (a._seq as number))
      );
    }
    throw new Error(`fakeReceiptsDb: unrecognized query — ${text}`);
  }
  sql.json = (v: unknown) => ({ __json: v });
  return { sql };
}

const BUSINESS_ID = "XAIS12345678910";
const TAX_YEAR = "2026-27";
const CALC_ID = "f2fb30e5-4ab6-4a29-b3c1-c7264259ff1c";

/** One stateful mock spanning every HMRC operation the chain touches, keyed
    off method+path exactly like a real dispatcher would — not four separate
    single-shot mocks. The calculation retrieve leg is genuinely stateful: it
    answers HMRC's real "still computing" 404 (per the OAS, and per itsa.ts's
    own documented handling of it) on the first poll, and a complete
    calculation on the second — the exact shape the frontend's poller is
    built around. */
function statefulHmrcMock() {
  const calls: Array<Record<string, unknown>> = [];
  let calcRetrieveAttempts = 0;
  vi.doMock("../../hmrc.js", async () => {
    const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
    return {
      ...actual,
      hmrcRequest: vi.fn(async (call: Record<string, unknown>) => {
        calls.push(call);
        const path = call.path as string;
        const method = (call.method as string | undefined) ?? "GET";
        const key = `${method} ${path}`;

        if (key === "GET /individuals/business/details/AA123456A/list") {
          return {
            listOfBusinesses: [
              { typeOfBusiness: "self-employment", businessId: BUSINESS_ID, tradingName: "The Sandbox Bakery" },
            ],
          };
        }
        if (
          key ===
          `PUT /individuals/business/self-employment/AA123456A/${BUSINESS_ID}/cumulative/${TAX_YEAR}`
        ) {
          return { _correlationId: "corr-chain-001" };
        }
        if (
          key ===
          `POST /individuals/calculations/AA123456A/self-assessment/${TAX_YEAR}/trigger/in-year`
        ) {
          return { calculationId: CALC_ID };
        }
        if (key === `GET /individuals/calculations/AA123456A/self-assessment/${TAX_YEAR}/${CALC_ID}`) {
          calcRetrieveAttempts += 1;
          if (calcRetrieveAttempts === 1) {
            // HMRC's real behavior: 404 while a just-triggered calculation is
            // still computing (same status code as a genuinely unknown id —
            // itsa.ts surfaces this honestly as { status: 'computing' }).
            throw new actual.HmrcError(404, "MATCHING_RESOURCE_NOT_FOUND");
          }
          return {
            calculation: {
              taxCalculation: {
                totalIncomeTaxAndNicsDue: 987.65,
                incomeTax: { totalTaxableIncome: 4830 },
              },
            },
          };
        }
        throw new Error(`statefulHmrcMock: unexpected call — ${key}`);
      }),
    };
  });
  return calls;
}

async function freshChainApp() {
  const { Hono } = await import("hono");
  const { itsa } = await import("../itsa.js");
  const { itsaSubmit } = await import("../itsa-submit.js");
  // Mirrors index.ts exactly: both ITSA routers mounted side by side under
  // the same prefix — the chain proves they compose the way production does.
  return new Hono().route("/v1/itsa", itsa).route("/v1/itsa", itsaSubmit);
}

describe("ITSA end-to-end chain: businesses -> quarterly-update -> receipts -> calculation", () => {
  it("carries one businessId, one receipt and one calculationId through five requests in one session", async () => {
    sandboxEnv();
    mockEntity();
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = statefulHmrcMock();
    const app = await freshChainApp();

    // 1. GET businesses — the shape the frontend's business picker consumes.
    const businessesRes = await app.request("/v1/itsa/e1/businesses");
    expect(businessesRes.status).toBe(200);
    const businessesBody = (await businessesRes.json()) as {
      businesses: Array<{ businessId: string; typeOfBusiness: string; tradingName?: string }>;
    };
    expect(businessesBody.businesses).toEqual([
      { businessId: BUSINESS_ID, typeOfBusiness: "self-employment", tradingName: "The Sandbox Bakery" },
    ]);
    const businessId = businessesBody.businesses[0].businessId;

    // 2. POST quarterly-update — realistic pence totals for a self-employed
    // sandbox bakery: £12,345.67 turnover, £2,500.00 cost of goods.
    const quarterlyRes = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxYear: TAX_YEAR,
        businessId,
        typeOfBusiness: "self-employment",
        quarterIndex: 1,
        election: "standard",
        totals: { turnover: 1234567, costOfGoods: 250000 },
      }),
    });
    expect(quarterlyRes.status).toBe(201);
    const quarterlyBody = (await quarterlyRes.json()) as { receipt: Record<string, unknown> };
    expect(quarterlyBody.receipt).toMatchObject({
      taxYear: TAX_YEAR,
      quarterIndex: 1,
      periodEnd: "2026-07-05",
      businessId: BUSINESS_ID,
      typeOfBusiness: "self-employment",
      supersededCount: 0,
    });
    const receiptId = quarterlyBody.receipt.id;

    // 3. GET receipts — the receipt from step 2, present, in the shape the
    // dashboard's receipt list consumes.
    const receiptsRes = await app.request("/v1/itsa/e1/receipts");
    expect(receiptsRes.status).toBe(200);
    const receiptsBody = (await receiptsRes.json()) as { receipts: Array<Record<string, unknown>> };
    expect(receiptsBody.receipts).toHaveLength(1);
    expect(receiptsBody.receipts[0]).toMatchObject({
      id: receiptId,
      businessId: BUSINESS_ID,
      periodEnd: "2026-07-05",
    });

    // 4. POST calculation — trigger, the shape the frontend hands to its poller.
    const triggerRes = await app.request("/v1/itsa/e1/calculation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taxYear: TAX_YEAR }),
    });
    expect(triggerRes.status).toBe(202);
    const { calculationId } = (await triggerRes.json()) as { calculationId: string };
    expect(calculationId).toBe(CALC_ID);

    // 5. GET calculation — first call still computing (HMRC's real
    // 404-while-computing), second call complete with pounds figures: the
    // exact two-poll shape the frontend's poller is built to handle.
    const firstPollRes = await app.request(`/v1/itsa/e1/calculation/${calculationId}?taxYear=${TAX_YEAR}`);
    expect(firstPollRes.status).toBe(200);
    expect(await firstPollRes.json()).toEqual({ status: "computing", source: "hmrc-sandbox" });

    const secondPollRes = await app.request(`/v1/itsa/e1/calculation/${calculationId}?taxYear=${TAX_YEAR}`);
    expect(secondPollRes.status).toBe(200);
    expect(await secondPollRes.json()).toEqual({
      status: "complete",
      incomeTaxAndNicsDuePounds: 987.65,
      taxableIncomePounds: 4830,
      source: "hmrc-sandbox",
    });

    // Finally: the actual outbound wire payload HMRC received for the PUT in
    // step 2 — captured straight off the mock, not re-derived — carries the
    // zero-filled income object (HMRC's zero-values rule) and the exact
    // pounds conversions of the pence totals sent in.
    const putCall = calls.find((c) => c.method === "PUT");
    expect(putCall?.body).toEqual({
      periodDates: { periodStartDate: "2026-04-06", periodEndDate: "2026-07-05" },
      periodIncome: { turnover: 12345.67, other: 0 },
      periodExpenses: {
        costOfGoods: 2500,
        paymentsToSubcontractors: 0,
        wagesAndStaffCosts: 0,
        carVanTravelExpenses: 0,
        premisesRunningCosts: 0,
        maintenanceCosts: 0,
        adminCosts: 0,
        advertisingCosts: 0,
        businessEntertainmentCosts: 0,
        interestOnBankOtherLoans: 0,
        financeCharges: 0,
        irrecoverableDebts: 0,
        professionalFees: 0,
        depreciation: 0,
        otherExpenses: 0,
      },
    });
    // Every leg of the chain spent the ITSA rail's connection, never VAT's.
    expect(calls.every((c) => c.rail === "itsa")).toBe(true);
  });
});
