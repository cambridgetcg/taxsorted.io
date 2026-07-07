// The first ITSA WRITE path: business discovery + the quarterly cumulative
// update PUT + the receipts store. HMRC is mocked (no real network); db is a
// tiny in-memory fake purpose-built for itsa_receipts, mirroring the
// whole-module mock pattern already used in itsa.test.ts / connections.test.ts.
//
// Wire shapes below come straight from the fetched OAS (recorded in the task
// report): self-employment-business-api v5.0's
// createAmendCumulativePeriodSummary (periodDates/periodIncome/periodExpenses)
// and property-business-api v6.0's uk_property_cumulative_summary_create_and_amend
// (fromDate/toDate/ukProperty.income|expenses) — the latter's nesting is NOT
// what the SE shape would suggest by analogy, which is exactly the "v6 needs
// verification" flag the research raised.

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

function mockEntity(entity: unknown) {
  vi.doMock("../../session.js", () => ({
    ownedEntity: vi.fn(async () => entity),
  }));
}

function mockHmrcRequest(impl: (call: Record<string, unknown>) => unknown) {
  const calls: Array<Record<string, unknown>> = [];
  vi.doMock("../../hmrc.js", async () => {
    const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
    return {
      ...actual,
      hmrcRequest: vi.fn(async (call: Record<string, unknown>) => {
        calls.push(call);
        return impl(call);
      }),
    };
  });
  return calls;
}

/** A tiny in-memory stand-in for postgres.js's `sql`, purpose-built for the
    one statement shape itsa-submit.ts issues against itsa_receipts: the
    upsert (insert ... on conflict (entity_id, tax_year, period_end,
    business_id) do update ... returning ...) and the plain list select.
    Not a general SQL engine — same spirit as fakeConnectionsDb in
    connections.test.ts. */
function fakeReceiptsDb() {
  const rows: Array<Record<string, unknown>> = [];
  let nextId = 1;
  // A monotonic write counter, not wall-clock time: two awaited requests in
  // the same test can land in the same millisecond, which would make
  // "order by submitted_at desc" flaky here even though real Postgres
  // timestamps (and real elapsed wall-clock time between two HTTP round
  // trips) don't tie in practice. `seq` is this fake's stand-in for "insert/
  // update order", which is what the production ORDER BY is actually
  // trying to express.
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
  return { sql, rows };
}

async function freshItsaSubmitApp() {
  const { Hono } = await import("hono");
  const { itsaSubmit } = await import("../itsa-submit.js");
  return new Hono().route("/v1/itsa", itsaSubmit);
}

const ENTITY = { id: "e1", nino: "AA123456A" };

describe("the ITSA submit sandbox door", () => {
  it("does not exist in production", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    mockEntity(ENTITY);
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/businesses");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });
});

describe("entity guard", () => {
  it("requires a nino on the entity", async () => {
    sandboxEnv();
    mockEntity({ id: "e1", nino: null });
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/businesses");
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("nino_required");
  });

  it("404s for an entity this session does not own", async () => {
    sandboxEnv();
    mockEntity(null);
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/businesses");
    expect(res.status).toBe(404);
  });
});

describe("GET /:id/businesses", () => {
  it("maps listOfBusinesses to businesses, dropping tradingName when absent", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const calls = mockHmrcRequest(async () => ({
      listOfBusinesses: [
        { typeOfBusiness: "self-employment", businessId: "XAIS12345678910", tradingName: "RCDTS" },
        { typeOfBusiness: "uk-property", businessId: "XAIS23456789101" },
      ],
    }));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/businesses");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      businesses: [
        { businessId: "XAIS12345678910", typeOfBusiness: "self-employment", tradingName: "RCDTS" },
        { businessId: "XAIS23456789101", typeOfBusiness: "uk-property" },
      ],
    });
    expect(calls[0]?.rail).toBe("itsa");
    expect(calls[0]?.path).toBe("/individuals/business/details/AA123456A/list");
    expect(calls[0]?.accept).toBe("application/vnd.hmrc.2.0+json");
  });

  it("an unconnected entity fails clean, not crashed (HmrcError bubbles through hmrcFail)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async () => {
          throw new actual.HmrcError(428, "not connected to HMRC");
        }),
      };
    });
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/businesses");
    expect(res.status).toBe(428);
    expect((await res.json()).error).toBe("hmrc");
  });
});

function quarterlyBody(overrides?: Partial<Record<string, unknown>>) {
  return {
    taxYear: "2026-27",
    businessId: "XAIS12345678910",
    typeOfBusiness: "self-employment",
    quarterIndex: 1,
    election: "standard",
    totals: { turnover: 500000, costOfGoods: 120000 },
    ...overrides,
  };
}

// HMRC's SE doc requires zero values, not absent fields ("if there is no
// income for the period, submit a periodIncome object with 'turnover' and
// 'other' values of zero") — so every wire body carries the full category
// set for the source, zero-filled, with the caller's totals overlaid.
const SE_ZERO_INCOME = { turnover: 0, other: 0 };
const SE_ZERO_EXPENSES = {
  costOfGoods: 0,
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
};
const PROPERTY_ZERO_INCOME = {
  periodAmount: 0,
  otherIncome: 0,
  premiumsOfLeaseGrant: 0,
  reversePremiums: 0,
};
const PROPERTY_ZERO_EXPENSES = {
  premisesRunningCosts: 0,
  repairsAndMaintenance: 0,
  financialCosts: 0,
  professionalFees: 0,
  costOfServices: 0,
  travelCosts: 0,
  other: 0,
  residentialFinancialCost: 0,
  residentialFinancialCostsCarriedForward: 0,
};

describe("POST /:id/quarterly-update — self-employment happy path", () => {
  it("PUTs the exact SE cumulative-period-summary shape and stores a receipt", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = mockHmrcRequest(async () => ({}));

    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody()),
    });

    expect(res.status).toBe(201);
    const call = calls[0];
    expect(call?.method).toBe("PUT");
    expect(call?.rail).toBe("itsa");
    expect(call?.accept).toBe("application/vnd.hmrc.5.0+json");
    expect(call?.path).toBe(
      "/individuals/business/self-employment/AA123456A/XAIS12345678910/cumulative/2026-27"
    );
    // Standard election, quarter 1 of 2026-27: 2026-04-06 .. 2026-07-05,
    // cumulativeStart === periodStart for quarter 1. Categories the caller
    // did not send arrive zero-filled, per HMRC's zero-values requirement.
    expect(call?.body).toEqual({
      periodDates: { periodStartDate: "2026-04-06", periodEndDate: "2026-07-05" },
      periodIncome: { ...SE_ZERO_INCOME, turnover: 5000 },
      periodExpenses: { ...SE_ZERO_EXPENSES, costOfGoods: 1200 },
    });

    const body = (await res.json()) as { receipt: Record<string, unknown> };
    expect(body.receipt).toMatchObject({
      taxYear: "2026-27",
      quarterIndex: 1,
      periodEnd: "2026-07-05",
      businessId: "XAIS12345678910",
      typeOfBusiness: "self-employment",
      supersededCount: 0,
    });
    expect(body.receipt.id).toBeTruthy();
    expect(body.receipt.submittedAt).toBeTruthy();
  });
});

describe("POST /:id/quarterly-update — uk-property happy path", () => {
  it("PUTs the v6 fromDate/toDate + ukProperty.income|expenses shape", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = mockHmrcRequest(async () => ({}));

    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        quarterlyBody({
          businessId: "XAIS23456789101",
          typeOfBusiness: "uk-property",
          totals: { periodAmount: 987654, residentialFinancialCost: 250099 },
        })
      ),
    });

    expect(res.status).toBe(201);
    const call = calls[0];
    expect(call?.accept).toBe("application/vnd.hmrc.6.0+json");
    expect(call?.path).toBe(
      "/individuals/business/property/uk/AA123456A/XAIS23456789101/cumulative/2026-27"
    );
    // v6's shape is NOT periodDates/periodIncome/periodExpenses like SE —
    // top-level fromDate/toDate, income+expenses nested under ukProperty.
    // Unsent categories arrive zero-filled here too.
    expect(call?.body).toEqual({
      fromDate: "2026-04-06",
      toDate: "2026-07-05",
      ukProperty: {
        income: { ...PROPERTY_ZERO_INCOME, periodAmount: 9876.54 },
        expenses: { ...PROPERTY_ZERO_EXPENSES, residentialFinancialCost: 2500.99 },
      },
    });

    const body = (await res.json()) as { receipt: Record<string, unknown> };
    expect(body.receipt).toMatchObject({ typeOfBusiness: "uk-property", periodEnd: "2026-07-05" });
  });
});

describe("POST /:id/quarterly-update — pence -> pounds conversion exactness", () => {
  it("converts 1p, 99p and a large value with no float artefacts, straight into the wire body", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = mockHmrcRequest(async () => ({}));

    const app = await freshItsaSubmitApp();
    await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        quarterlyBody({ totals: { turnover: 1, other: 99, costOfGoods: 123456 } })
      ),
    });

    expect(calls[0]?.body).toMatchObject({
      periodIncome: { turnover: 0.01, other: 0.99 },
      periodExpenses: { costOfGoods: 1234.56 },
    });
  });
});

describe("validation before any HMRC call", () => {
  it("422s an unknown category, naming the bad key — never calls HMRC", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ totals: { turnover: 100, notACategory: 500 } })),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("unknown_category");
    expect(body.key).toBe("notACategory");
    expect(calls.length).toBe(0);
  });

  it("422s a negative income value (OAS: income minimum is 0), naming the bad key — never calls HMRC", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ totals: { turnover: -500 } })),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("invalid_amount");
    expect(body.key).toBe("turnover");
    expect(calls.length).toBe(0);
  });

  it("accepts a negative expense where the OAS allows it (SE costOfGoods, minimum -99999999999.99)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ totals: { turnover: 100, costOfGoods: -50000 } })),
    });
    expect(res.status).toBe(201);
    expect(calls[0]?.body).toMatchObject({
      periodExpenses: { costOfGoods: -500 },
    });
  });

  it("422s a negative residentialFinancialCost (property OAS: minimum 0 — Section 24 credit can't be negative)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        quarterlyBody({
          typeOfBusiness: "uk-property",
          businessId: "XAIS23456789101",
          totals: { residentialFinancialCost: -100 },
        })
      ),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("invalid_amount");
    expect(body.key).toBe("residentialFinancialCost");
    expect(calls.length).toBe(0);
  });

  it("422s a non-integer pence value — never calls HMRC", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ totals: { turnover: 100.5 } })),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("invalid_amount");
    expect(calls.length).toBe(0);
  });

  it("allows residentialFinancialCost for uk-property (alwaysSeparate category, not folded away)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        quarterlyBody({
          typeOfBusiness: "uk-property",
          businessId: "XAIS23456789101",
          totals: { residentialFinancialCost: 100 },
        })
      ),
    });
    expect(res.status).toBe(201);
  });

  it("allows consolidatedExpenses — the wire body carries just that expense key (no itemised zero-fill), income still zero-filled", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ totals: { consolidatedExpenses: 250000 } })),
    });
    expect(res.status).toBe(201);
    // Zero-filling itemised keys alongside consolidatedExpenses would trip
    // HMRC's RULE_BOTH_EXPENSES_SUPPLIED — consolidated mode sends only the
    // consolidated key.
    expect(calls[0]?.body).toEqual({
      periodDates: { periodStartDate: "2026-04-06", periodEndDate: "2026-07-05" },
      periodIncome: SE_ZERO_INCOME,
      periodExpenses: { consolidatedExpenses: 2500 },
    });
  });

  it("422s consolidatedExpenses mixed with an itemised expense (RULE_BOTH_EXPENSES_SUPPLIED, caught locally)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        quarterlyBody({ totals: { consolidatedExpenses: 100000, costOfGoods: 50000 } })
      ),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("both_expenses_supplied");
    expect(body.key).toBe("costOfGoods");
    expect(calls.length).toBe(0);
  });

  it("allows property consolidatedExpenses WITH residentialFinancialCost (the v6 schema's explicit carve-out)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        quarterlyBody({
          typeOfBusiness: "uk-property",
          businessId: "XAIS23456789101",
          totals: { consolidatedExpenses: 100000, residentialFinancialCost: 20000 },
        })
      ),
    });
    expect(res.status).toBe(201);
    expect(calls[0]?.body).toMatchObject({
      ukProperty: {
        expenses: { consolidatedExpenses: 1000, residentialFinancialCost: 200 },
      },
    });
  });

  it("422s a malformed request body (bad taxYear shape)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ taxYear: "2026" })),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("invalid_request");
  });

  it("422s a taxYear spanning two years (2026-28)", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ taxYear: "2026-28" })),
    });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("invalid_request");
    expect(calls.length).toBe(0);
  });
});

describe("one-sided quarters still send complete objects (HMRC's zero-values rule)", () => {
  it("SE expenses-only startup: periodIncome arrives as { turnover: 0, other: 0 }", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ totals: { costOfGoods: 120000 } })),
    });
    expect(res.status).toBe(201);
    expect(calls[0]?.body).toEqual({
      periodDates: { periodStartDate: "2026-04-06", periodEndDate: "2026-07-05" },
      periodIncome: { turnover: 0, other: 0 },
      periodExpenses: { ...SE_ZERO_EXPENSES, costOfGoods: 1200 },
    });
  });

  it("property between-tenants (expenses only): ukProperty.income arrives fully zero-filled", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    const calls = mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        quarterlyBody({
          typeOfBusiness: "uk-property",
          businessId: "XAIS23456789101",
          totals: { repairsAndMaintenance: 50000 },
        })
      ),
    });
    expect(res.status).toBe(201);
    expect(calls[0]?.body).toEqual({
      fromDate: "2026-04-06",
      toDate: "2026-07-05",
      ukProperty: {
        income: PROPERTY_ZERO_INCOME,
        expenses: { ...PROPERTY_ZERO_EXPENSES, repairsAndMaintenance: 500 },
      },
    });
  });
});

describe("resubmission — cumulative correction, not a duplicate", () => {
  it("updates the same receipt row and increments supersededCount", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql, rows } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();

    const first = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ totals: { turnover: 500000 } })),
    });
    expect(first.status).toBe(201);
    const firstReceipt = ((await first.json()) as { receipt: { id: string; supersededCount: number } }).receipt;
    expect(firstReceipt.supersededCount).toBe(0);

    const second = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ totals: { turnover: 600000 } })),
    });
    expect(second.status).toBe(201);
    const secondReceipt = ((await second.json()) as { receipt: { id: string; supersededCount: number } }).receipt;

    expect(secondReceipt.id).toBe(firstReceipt.id); // same row, updated — never a second row
    expect(secondReceipt.supersededCount).toBe(1);
    expect(rows.filter((r) => r.business_id === "XAIS12345678910")).toHaveLength(1); // no double-insert
  });
});

describe("GET /:id/receipts", () => {
  it("lists receipts newest first", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();

    await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ quarterIndex: 1, totals: { turnover: 100 } })),
    });
    await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody({ quarterIndex: 2, totals: { turnover: 100 } })),
    });

    const res = await app.request("/v1/itsa/e1/receipts");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { receipts: Array<{ quarterIndex: number }> };
    expect(body.receipts).toHaveLength(2);
    expect(body.receipts[0].quarterIndex).toBe(2); // most recently submitted first
  });
});

describe("HMRC accepted but the receipt write failed (the narrow honest window)", () => {
  it("returns a distinct 500, never fakes success, and the correlation id reaches the server log", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    // HMRC says yes (204 + correlation id) …
    mockHmrcRequest(async () => ({ _correlationId: "corr-abc-123" }));
    // … then the receipt upsert blows up.
    vi.doMock("../../db.js", () => {
      const sql = () => {
        throw new Error("db down");
      };
      sql.json = (v: unknown) => v;
      return { sql };
    });
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody()),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "receipt_write_failed",
      message:
        "HMRC accepted the submission but we could not record the receipt — do not resubmit blindly; refresh to check.",
      hmrcCorrelationId: "corr-abc-123",
    });
    // The only trace HMRC gives back must survive server-side.
    const logged = logSpy.mock.calls.map((args) => args.join(" ")).join("\n");
    expect(logged).toContain("receipt write failed AFTER successful HMRC submission");
    expect(logged).toContain("corr-abc-123");
    logSpy.mockRestore();
  });
});

describe("insufficient scope (pre-write-scope connections)", () => {
  it("HMRC's 403 passes through hmrcFail with full detail in sandbox — the fix diagnoses itself", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    vi.doMock("../../hmrc.js", async () => {
      const actual = await vi.importActual<typeof import("../../hmrc.js")>("../../hmrc.js");
      return {
        ...actual,
        hmrcRequest: vi.fn(async () => {
          throw new actual.HmrcError(403, "Invalid scope", { code: "INVALID_SCOPE" });
        }),
      };
    });
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody()),
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: "hmrc",
      message: "Invalid scope",
      detail: { code: "INVALID_SCOPE" },
    });
  });
});

// Task 10: production filing needs a passkey. The quarterly-update POST now
// carries the same account_needed gate as vat.ts/connect.ts, placed right
// after entity resolution — but this whole router already 404s ANY request
// outside sandbox (the file-level "*" middleware above, unchanged since DASH
// Task 1: ITSA has no HMRC production recognition yet). That gate always
// fires first, so the new check is presently unreachable in practice; it's
// kept for parity so the day ITSA earns production recognition, this route
// needs zero extra wiring. These tests prove the addition changed nothing:
// production still 404s "no_such_door" regardless of account state.
describe("production gate — quarterly-update (currently shadowed by the ITSA sandbox-only door)", () => {
  it("HMRC_ENV=production + anonymous → still 404 no_such_door, unchanged", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    mockEntity(ENTITY);
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody()),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });

  it("HMRC_ENV=production + signed in (userId set) → still 404 no_such_door — the account gate never gets a chance to run", async () => {
    vi.stubEnv("HMRC_ENV", "production");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    mockEntity(ENTITY);
    const { Hono } = await import("hono");
    const { itsaSubmit } = await import("../itsa-submit.js");
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("userId", "u1");
      await next();
    });
    app.route("/v1/itsa", itsaSubmit);

    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody()),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "no_such_door" });
  });

  it("HMRC_ENV=sandbox + anonymous → unchanged, still files as normal", async () => {
    sandboxEnv();
    mockEntity(ENTITY);
    const { sql } = fakeReceiptsDb();
    vi.doMock("../../db.js", () => ({ sql }));
    mockHmrcRequest(async () => ({}));
    const app = await freshItsaSubmitApp();
    const res = await app.request("/v1/itsa/e1/quarterly-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quarterlyBody()),
    });
    expect(res.status).toBe(201);
  });
});

describe("pence <-> pounds money boundary (round-trip exactness)", () => {
  it("round-trips 1p, 99p, 123456p, 0p, negatives, and HMRC's own declared maximum with zero float artefacts", async () => {
    const { penceToPounds } = await import("../itsa-submit.js");
    const cases: Array<[number, number]> = [
      [1, 0.01],
      [99, 0.99],
      [123456, 1234.56],
      [0, 0],
      [-1, -0.01],
      [-12345, -123.45], // negative expenses are wire-legal on OAS-permitted keys
      [9999999999999, 99999999999.99], // = HMRC schema's declared max, 99999999999.99
      [-9999999999999, -99999999999.99], // = HMRC schema's declared min for negatable fields
    ];
    for (const [pence, pounds] of cases) {
      const got = penceToPounds(pence);
      expect(got).toBe(pounds);
      expect(Math.round(got * 100)).toBe(pence); // the round trip back to pence
    }
  });

  it("refuses to convert a non-integer pence value (never float math on the pounds side)", async () => {
    const { penceToPounds } = await import("../itsa-submit.js");
    expect(() => penceToPounds(100.5)).toThrow();
  });
});
