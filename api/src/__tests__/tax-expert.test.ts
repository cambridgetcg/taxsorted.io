import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("../db.js", () => ({ sql: query }));

import { OpenAPIHono } from "@hono/zod-openapi";
import { apiCors } from "../cors.js";
import { registerDeveloperApi } from "../developer-api.js";
import { apiErrorHandler } from "../error-handler.js";
import { requestId } from "../request-id.js";
import { TaxPositionPassportSchema } from "../routes/tax-expert.js";
import { TAX_POSITION_PASSPORT_EXAMPLE } from "@taxsorted/engine/uk/passport";

const rawKey = `ts_test_${"e".repeat(43)}`;

function assessmentBody() {
  return {
    schema: "taxsorted.uk.mtd-income-tax.request/1",
    asOfDate: "2026-07-11",
    person: {
      relevantReturnPosition: "required-and-submitted",
      hadNationalInsuranceNumberAtStartOf2026To27: true,
    },
    income: {
      taxYears: {
        "2024-25": {
          basis: "submitted-return",
          residence: "uk-resident",
          selfEmploymentGrossPence: 5_000_001,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
        "2025-26": {
          basis: "working-estimate",
          residence: "uk-resident",
          selfEmploymentGrossPence: 0,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
        "2026-27": {
          basis: "working-estimate",
          residence: "uk-resident",
          selfEmploymentGrossPence: 0,
          ukPropertyGrossPence: 0,
          foreignPropertyGrossPence: 0,
        },
      },
      atLeastOneRelevantReturnActivityContinuedAtEntry: true,
      lastRelevantActivityCessationDate: "at-least-one-continues",
      relevantReturnWasAmended: false,
      annualisationOrOtherSpecialRulesMayApply: false,
    },
    exemption: {
      returnIndicators: [],
      digitalExclusion: "not-approved-or-pending",
      otherExemptionApplication: "none",
    },
    reporting: { updatePeriod: "standard" },
  };
}

function mount() {
  const app = new OpenAPIHono();
  let browserSessionCalls = 0;
  app.use("*", apiCors);
  app.use("*", requestId);
  registerDeveloperApi(app, "https://api.taxsorted.io");
  app.use("/v1/*", async (c) => {
    browserSessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    return c.json({ error: "browser_session_touched" }, 418);
  });
  app.onError(apiErrorHandler);
  return { app, browserSessionCalls: () => browserSessionCalls };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-07-11T12:00:00Z"));
  query.mockReset();
  query.mockResolvedValue([{
    id: "key-1",
    workspace_id: "workspace-1",
    mode: "test",
    scopes: ["sdlt:calculate", "tax-expert:assess"],
  }]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UK tax expert API", () => {
  it("publishes the coverage registry without a key, session, cookie or database call", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/v1/uk/tax-expert");
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toMatch(/max-age=300/);
    expect(response.headers.get("link")).toContain("/openapi/tax-expert-uk.json");
    expect(browserSessionCalls()).toBe(0);
    expect(query).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.schema).toBe("taxsorted.uk.tax-expert/1");
    expect(body.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "uk.tax-position-passport",
        status: "available",
        humanHref: "/passport",
        apiHref:
          "/v1/uk/tax-expert/tax-position-passport/schema",
      }),
      expect.objectContaining({ id: "uk.mtd-income-tax.readiness", status: "available" }),
      expect.objectContaining({
        id: "uk.personal-tax.thresholds",
        status: "available",
        stages: expect.arrayContaining(["classified", "calculated"]),
        humanHref: "/uk/personal-tax#threshold-check",
      }),
      expect.objectContaining({ id: "uk.corporation-tax", status: "planned" }),
    ]));
  });

  it("publishes a task-sized OpenAPI contract", async () => {
    const { app } = mount();
    const response = await app.request("/openapi/tax-expert-uk.json");
    expect(response.status).toBe(200);
    const document = await response.json();
    expect(document.openapi).toBe("3.1.0");
    expect(document.paths).toHaveProperty("/v1/uk/tax-expert");
    expect(document.paths).toHaveProperty(
      "/v1/uk/tax-expert/tax-position-passport/schema",
    );
    expect(document.paths).toHaveProperty(
      "/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax",
    );
    expect(document.paths).toHaveProperty("/v1/uk/tax-expert/mtd-income-tax/assessments");
    expect(document.paths["/v1/uk/tax-expert"].get.security).toEqual([]);
    expect(
      document.paths[
        "/v1/uk/tax-expert/tax-position-passport/schema"
      ].get.security,
    ).toEqual([]);
    expect(document.paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post.security).toEqual([{ WorkspaceKey: [] }]);
    expect(
      document.paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post[
        "x-taxsorted-required-workspace-scopes"
      ],
    ).toEqual(["tax-expert:assess"]);
    expect(
      document.paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post[
        "x-taxsorted-why-graph"
      ],
    ).toEqual(expect.objectContaining({
      schema: "taxsorted.why-graph/1",
      responseJsonPointer: "/reasoning/whyGraph",
      currentlyEmitted: true,
    }));
    expect(
      document.components.schemas.MtdIncomeTaxAssessmentResponse.properties
        .reasoning.properties.whyGraph.$ref,
    ).toBe("#/components/schemas/WhyGraph");
    expect(
      document.components.schemas.MtdIncomeTaxAssessmentResponse.properties
        .reasoning.required,
    ).not.toContain("whyGraph");
    expect(
      document.components.schemas.MtdIncomeTaxAssessmentRequest
        .properties.exemption.properties.returnIndicators.anyOf[0].uniqueItems,
    ).toBe(true);
    expect(
      document.components.schemas.MtdIncomeTaxAssessmentResponse
        .properties.answer.properties.obligations.items.properties.condition.type,
    ).toEqual(["string", "null"]);
    expect(query).not.toHaveBeenCalled();
  });

  it("publishes a cacheable Passport schema and synthetic example without a session", async () => {
    const { app, browserSessionCalls } = mount();
    const schemaResponse = await app.request(
      "/v1/uk/tax-expert/tax-position-passport/schema",
      { headers: { Origin: "https://passport-builder.example" } },
    );

    expect(schemaResponse.status).toBe(200);
    expect(schemaResponse.headers.get("content-type")).toMatch(
      /^application\/schema\+json/,
    );
    expect(schemaResponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(schemaResponse.headers.get("set-cookie")).toBeNull();
    expect(schemaResponse.headers.get("etag")).toMatch(/^"sha256-[a-f0-9]{64}"$/);
    expect(schemaResponse.headers.get("link")).toContain('rel="example"');
    const schema = await schemaResponse.json();
    expect(schema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id:
        "https://api.taxsorted.io/v1/uk/tax-expert/tax-position-passport/schema",
      title: "TaxSorted UK Tax Position Passport",
      type: "object",
    });
    expect(schema.properties).toHaveProperty("positions");
    expect(
      schema.properties.profile.properties.incomeSources.prefixItems.map(
        (item: { properties: { id: { const: string } } }) =>
          item.properties.id.const,
      ),
    ).toEqual([
      "employment",
      "self-employment",
      "uk-property",
      "foreign-property",
      "other-or-complex",
    ]);
    expect(
      schema.properties.profile.properties.evidence.prefixItems,
    ).toHaveLength(8);
    expect(schema.properties.createdAt.pattern).toContain("\\.\\d{3}");

    const unchanged = await app.request(
      "/v1/uk/tax-expert/tax-position-passport/schema",
      {
        headers: {
          "If-None-Match": schemaResponse.headers.get("etag")!,
        },
      },
    );
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");

    const exampleResponse = await app.request(
      "/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax",
    );
    expect(exampleResponse.status).toBe(200);
    expect(exampleResponse.headers.get("set-cookie")).toBeNull();
    expect(await exampleResponse.json()).toMatchObject({
      schema: "taxsorted.uk.tax-position-passport/1",
      assurance: {
        identityVerified: false,
        signed: false,
        professionallyReviewed: false,
        filed: false,
      },
      dataHandling: {
        generationMode: "browser-local",
        sentToTaxSorted: false,
        rawDocumentsIncluded: false,
      },
      positions: [
        {
          kind: "mtd-income-tax-readiness",
          request: { schema: "taxsorted.uk.mtd-income-tax.request/1" },
          answer: {
            schema: "taxsorted.tax-answer/1",
            capability: { id: "uk.mtd-income-tax.readiness" },
          },
        },
      ],
    });
    expect(browserSessionCalls()).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("keeps the public Passport validator aligned with canonical provenance and complete MTD answers", () => {
    expect(
      TaxPositionPassportSchema.safeParse(TAX_POSITION_PASSPORT_EXAMPLE)
        .success,
    ).toBe(true);

    const duplicateSource = structuredClone(TAX_POSITION_PASSPORT_EXAMPLE);
    duplicateSource.profile.incomeSources[0] = structuredClone(
      duplicateSource.profile.incomeSources[1],
    );
    expect(TaxPositionPassportSchema.safeParse(duplicateSource).success).toBe(
      false,
    );

    const wrongCapability = structuredClone(TAX_POSITION_PASSPORT_EXAMPLE);
    wrongCapability.positions[0].answer.capability.id = "uk.other";
    expect(TaxPositionPassportSchema.safeParse(wrongCapability).success).toBe(
      false,
    );

    const missingWhyGraph = structuredClone(
      TAX_POSITION_PASSPORT_EXAMPLE,
    ) as unknown as {
      positions: Array<{ answer: { reasoning: { whyGraph?: unknown } } }>;
    };
    delete missingWhyGraph.positions[0].answer.reasoning.whyGraph;
    expect(TaxPositionPassportSchema.safeParse(missingWhyGraph).success).toBe(
      false,
    );

    const looseTimestamp = structuredClone(TAX_POSITION_PASSPORT_EXAMPLE);
    looseTimestamp.createdAt = "2026-07-16T12:00:00Z";
    expect(TaxPositionPassportSchema.safeParse(looseTimestamp).success).toBe(
      false,
    );
  });

  it("does not advertise the secured assessment through public wildcard browser CORS", async () => {
    const { app } = mount();
    const untrusted = await app.request(
      "/v1/uk/tax-expert/mtd-income-tax/assessments",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://untrusted.example",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "authorization,content-type",
        },
      },
    );

    expect(untrusted.headers.get("access-control-allow-origin")).toBeNull();

    const configuredOrigin = await app.request(
      "/v1/uk/tax-expert/mtd-income-tax/assessments",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://taxsorted.io",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "authorization,content-type",
        },
      },
    );
    expect(configuredOrigin.headers.get("access-control-allow-origin")).toBe(
      "https://taxsorted.io",
    );
    expect(
      configuredOrigin.headers.get("access-control-allow-headers")?.toLowerCase(),
    ).not.toContain("authorization");
  });

  it("returns a stateless evidence-backed answer with a correctly scoped key", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(assessmentBody()),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(browserSessionCalls()).toBe(0);
    const body = await response.json();
    expect(body).toMatchObject({
      schema: "taxsorted.tax-answer/1",
      status: "determined",
      answer: { decision: "in_scope" },
      dataUse: { stored: false, usedForTraining: false },
    });
    expect(body.evidence.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "uksi-2026-336", legalForce: "binding-law" }),
      expect.objectContaining({ id: "hmrc-mtd-exemptions", legalForce: "official-explanation" }),
    ]));
    expect(body.answer.obligations).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "quarterly-update-1", condition: null }),
      expect.objectContaining({ id: "pay-self-assessment-tax", conditional: false }),
    ]));
    expect(body.reasoning.whyGraph).toMatchObject({
      schema: "taxsorted.why-graph/1",
      context: {
        authority: "taxsorted-analysis",
        effect: "advisory",
        externalStateChange: false,
      },
      valueHandling: {
        factValues: "case-financial-and-identity-fact-values-not-copied-into-graph",
      },
    });
    expect(JSON.stringify(body.reasoning.whyGraph)).not.toContain("5000001");
    expect(body.reasoning.whyGraph.coverage.gapNodeIds).toContain(
      "gap:official-enforcement-and-review-route",
    );
    expect(body.reasoning.whyGraph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        relation: "responsibility-held-by",
        to: "party-role:relevant-person",
      }),
      expect.objectContaining({
        relation: "limited-by",
        to: "gap:actual-performer-and-agent-authority",
      }),
    ]));
  });

  it("returns an unsupported answer instead of applying the current ruleset to 2030", async () => {
    const { app } = mount();
    const body = assessmentBody();
    body.asOfDate = "2030-07-11";
    const response = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      status: "unsupported",
      answer: { decision: "outside_supported_date", reasonCodes: ["AS_OF_DATE_IN_FUTURE"] },
    });
  });

  it("requires the assessment scope but never a browser session", async () => {
    const { app, browserSessionCalls } = mount();
    const missing = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessmentBody()),
    });
    expect(missing.status).toBe(401);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(missing.headers.get("www-authenticate")).toBe(
      'Bearer realm="TaxSorted API", error="invalid_token"',
    );
    expect(missing.headers.get("link")).toContain(
      "/openapi/professional-tools-uk.json",
    );
    expect(await missing.json()).toMatchObject({
      requiredScope: "tax-expert:assess",
      access: {
        publicSelfServiceKeyProvisioning: false,
        confidentialAccessRequestIntake: false,
      },
      nextActions: expect.arrayContaining([
        expect.objectContaining({ href: "/v1/uk/professional-tools" }),
      ]),
    });
    expect(browserSessionCalls()).toBe(0);

    query.mockResolvedValueOnce([{
      id: "key-1",
      workspace_id: "workspace-1",
      mode: "test",
      scopes: ["sdlt:calculate"],
    }]);
    const insufficient = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(assessmentBody()),
    });
    expect(insufficient.status).toBe(403);
    expect(insufficient.headers.get("cache-control")).toBe("no-store");
    expect(insufficient.headers.get("www-authenticate")).toContain(
      'error="insufficient_scope"',
    );
    expect(await insufficient.json()).toMatchObject({
      message: expect.stringContaining("tax-expert:assess"),
      requiredScope: "tax-expert:assess",
    });
    expect(browserSessionCalls()).toBe(0);
  });

  it("rejects an omitted fact instead of defaulting it to false or zero", async () => {
    const { app } = mount();
    const body = assessmentBody();
    delete (body.person as Partial<typeof body.person>).relevantReturnPosition;
    const response = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const error = await response.json();
    expect(error.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "person.relevantReturnPosition" }),
    ]));
  });

  it("rejects a future cessation as a semantic request error", async () => {
    const { app } = mount();
    const body = assessmentBody();
    body.income.lastRelevantActivityCessationDate = "2026-07-12";
    const response = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "income.lastRelevantActivityCessationDate" }),
      ]),
    });
  });

  it("rejects duplicate JSON fields before semantic parsing and does not echo their values", async () => {
    const { app } = mount();
    const ordinary = JSON.stringify(assessmentBody());
    const ambiguous = ordinary.replace('"asOfDate":"2026-07-11"', '"asOfDate":"2026-07-11","asOfDate":"1999-secret"');
    const response = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
      body: ambiguous,
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const text = await response.text();
    expect(text).toContain("duplicate_json_key");
    expect(text).not.toContain("1999-secret");
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects the wrong media type before reading a key", async () => {
    const { app } = mount();
    const response = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify(assessmentBody()),
    });
    expect(response.status).toBe(415);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a body over 16 KiB before authentication", async () => {
    const { app } = mount();
    const response = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...assessmentBody(), padding: "x".repeat(20_000) }),
    });
    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects non-JSON Unicode whitespace before authentication", async () => {
    const { app } = mount();
    const response = await app.request("/v1/uk/tax-expert/mtd-income-tax/assessments", {
      method: "POST",
      headers: { Authorization: `Bearer ${rawKey}`, "Content-Type": "application/json" },
      body: `\u00a0${JSON.stringify(assessmentBody())}`,
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ error: "invalid_json" });
    expect(query).not.toHaveBeenCalled();
  });
});
