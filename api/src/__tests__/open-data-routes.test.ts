import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { createOpenDataRoutes } from "../routes/open-data.js";
import { politicsDatasetAdmissionDigest } from "../uk-politics-datasets.js";

function mount() {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/open-data",
    createOpenDataRoutes({
      taxSystemPublic: true,
      taxIndustryPublic: false,
      charitiesPublic: true,
      publicFundingPublic: true,
    })
  );
  app.use("/v1/*", async (c, next) => {
    sessionCalls += 1;
    c.header("Set-Cookie", "ts_session=should-not-exist; HttpOnly");
    await next();
  });
  return { app, sessionCalls: () => sessionCalls };
}

describe("open-data catalog", () => {
  it("is a public, sessionless discovery door with explicit reuse terms", async () => {
    expect(isPublicCivicPath("/v1/open-data")).toBe(true);
    expect(isPublicCivicPath("/v1/open-data-evil")).toBe(false);
    expect(isPublicCivicPath("/openapi.json")).toBe(true);
    expect(isPublicCivicPath("/openapi-public.json")).toBe(true);
    expect(isPublicCivicPath("/openapi/charities-uk.json")).toBe(true);
    expect(isPublicCivicPath("/openapi/politics-uk.json")).toBe(true);
    expect(isPublicCivicPath("/openapi/tax-expert-uk.json")).toBe(true);
    expect(isPublicCivicPath("/openapi/private.json")).toBe(false);
    expect(isPublicCivicPath("/openapi/charities-uk.json/evil")).toBe(false);
    expect(isPublicCivicPath("/openapi-public.json-evil")).toBe(false);
    expect(isPublicCivicPath("/agent.txt")).toBe(true);
    expect(isPublicCivicPath("/.well-known/agent.txt")).toBe(true);
    expect(isPublicCivicPath("/agent.txt-evil")).toBe(false);
    expect(isPublicCivicPath("/.well-known/agent.txt/evil")).toBe(false);
    expect(isPublicCivicPath("/v1/charities/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/charities/uk-evil")).toBe(false);
    expect(isPublicCivicPath("/v1/public-funding/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/public-funding/uk-evil")).toBe(false);
    expect(isPublicCivicPath("/v1/uk/tax-expert")).toBe(true);
    expect(
      isPublicCivicPath(
        "/v1/uk/tax-expert/tax-position-passport/schema",
      ),
    ).toBe(true);
    expect(
      isPublicCivicPath(
        "/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax",
      ),
    ).toBe(true);
    expect(isPublicCivicPath("/v1/uk/tax-expert/mtd-income-tax/assessments")).toBe(false);

    const { app, sessionCalls } = mount();
    const openApiPreflight = await app.request(
      "/openapi/charities-uk.json",
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://law-stack.example",
          "Access-Control-Request-Method": "GET",
          "Access-Control-Request-Headers": "If-None-Match",
        },
      },
    );
    expect(openApiPreflight.status).toBe(204);
    expect(openApiPreflight.headers.get("access-control-allow-origin")).toBe(
      "*",
    );
    expect(
      openApiPreflight.headers.get("access-control-allow-headers"),
    ).toContain("If-None-Match");

    const response = await app.request("/v1/open-data", {
      headers: { Origin: "https://law-stack.example", Cookie: "existing=1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("link")).toContain('rel="license"');
    expect(response.headers.get("link")).toContain(
      '</v1/open-data/rights>; rel="license"'
    );
    expect(response.headers.get("link")).toContain(
      '</agent.txt>; rel="related"; type="text/plain"; title="Agent discovery"'
    );
    expect(response.headers.get("link")).toContain(
      '</openapi-public.json>; rel="service-desc"',
    );
    expect(response.headers.get("link")).toContain(
      '</openapi.json>; rel="related"',
    );
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(sessionCalls()).toBe(0);
    expect(body.access).toMatchObject({
      authentication: "none",
      price: "free",
      agentDiscovery: "/agent.txt",
      openApi: "/openapi.json",
      openApiPublic: "/openapi-public.json",
      openApiSlices: {
        taxSystem: "/openapi/tax-system-uk.json",
        charities: "/openapi/charities-uk.json",
        taxIdentity: "/openapi/tax-identity-uk.json",
      },
    });
    expect(body.datasets).toHaveLength(5);
    expect(body.frameworks).toHaveLength(1);
    expect(body.frameworks[0]).toMatchObject({
      id: "uk-tax-identity-framework",
      kind: "interpretation-framework",
      title: "UK tax identity framework",
      jurisdiction: "United Kingdom",
      schema: "taxsorted.uk.tax-identity/1",
      version: expect.stringMatching(/^\d{4}-\d{2}-\d{2}\.\d+$/),
      reviewedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      lawAsAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      updatePolicy: {
        cadence: expect.stringMatching(/evidence-driven/i),
        nextReviewDate: null,
      },
      access: {
        methods: ["GET", "HEAD", "OPTIONS"],
        authentication: "none",
        session: "none",
        cookies: "none",
        writes: false,
        personalFactsAccepted: false,
        cors: "*",
      },
      availability: {
        status: "open",
        contentAvailable: true,
        discoveryAvailable: true,
        schemaAvailable: true,
        rightsAvailable: true,
        openApiAvailable: true,
        humanGuideAvailable: true,
        emergencyStop: false,
      },
      licence: {
        name: "CC BY-SA 4.0",
        scope: expect.stringMatching(/TaxSorted/i),
        sourceRights: expect.stringMatching(/publishers' rights/i),
      },
      boundaries: {
        sourceBackedOnly: true,
        syntheticExamplesOnly: true,
        personalFactsAccepted: false,
        realTaxpayerDecision: false,
        legalAdvice: false,
        filingOrSubmission: false,
        externalStateChange: false,
        statements: expect.any(Array),
      },
    });
    expect(body.frameworks[0].resources).toEqual({
      overview: "/v1/tax-identity/uk",
      graph: "/v1/tax-identity/uk/graph",
      dimensions: "/v1/tax-identity/uk/dimensions",
      archetypes: "/v1/tax-identity/uk/archetypes",
      overlaps: "/v1/tax-identity/uk/overlaps",
      timeline: "/v1/tax-identity/uk/timeline",
      examples: "/v1/tax-identity/uk/examples",
      exampleTemplate: "/v1/tax-identity/uk/examples/{exampleId}",
      sources: "/v1/tax-identity/uk/sources",
      gaps: "/v1/tax-identity/uk/gaps",
      schema: "/v1/tax-identity/uk/schema",
      rights: "/v1/tax-identity/uk/rights",
      openApi: "/openapi/tax-identity-uk.json",
      humanGuide: "https://taxsorted.io/uk/tax-identity/",
    });
    expect(body.frameworks[0].resources).not.toHaveProperty("records");
    expect(body.frameworks[0].resources).not.toHaveProperty("exports");
    expect(body.datasets[0].publication.fullDatasetAvailable).toBe(true);
    expect(body.datasets[1].publication.fullDatasetAvailable).toBe(false);
    expect(body.datasets[1].resources.exports).toBe(
      "/v1/tax-industry/uk/exports"
    );
    expect(body.datasets[0].resources.recordResolver).toBe(
      "/v1/tax-system/uk/records/{id}"
    );
    expect(body.datasets[1].resources.recordResolver).toBe(
      "/v1/tax-industry/uk/records/{id}"
    );
    expect(body.datasets[0].updatePolicy).toMatchObject({
      cadence: expect.stringMatching(/evidence-driven/),
      nextReleaseDate: null,
    });
    expect(body.datasets[0].correctionChannel).toMatchObject({
      accountRequired: true,
      privateOrSensitiveIntakeAvailable: false,
    });
    expect(body.datasets[2]).toMatchObject({
      id: "uk-charities-sector",
      publication: {
        status: "open",
        fullDatasetAvailable: true,
        scopeBoundary: expect.stringMatching(/no mirrored charity-by-charity records/i),
      },
      resources: {
        overview: "/v1/charities/uk",
        registers: "/v1/charities/uk/registers",
        recordResolver: "/v1/charities/uk/records/{id}",
        releaseLedger: "/v1/open-data/releases",
        accountability: "/v1/charities/uk/accountability",
        accountabilitySchema: "/v1/charities/uk/accountability/schema",
        humanGuide: "https://taxsorted.io/uk/charities",
      },
    });
    expect(body.datasets[3]).toMatchObject({
      id: "uk-public-funding",
      publication: {
        status: "open",
        fullDatasetAvailable: true,
        scopeBoundary: expect.stringMatching(/no copied holder names/i),
      },
      resources: {
        overview: "/v1/public-funding/uk",
        humanGuide: "https://taxsorted.io/uk/public-funding",
        changes: "/v1/public-funding/uk/changes",
        recordResolver: "/v1/public-funding/uk/records/{id}",
      },
    });
    expect(body.datasets[4]).toMatchObject({
      id: "uk-politics-public-integrity",
      datasetCount: expect.any(Number),
      publication: { status: "development-preview" },
      resources: {
        catalog: "/v1/politics/uk/datasets",
        rights: "/v1/politics/uk/datasets/rights",
        admissions: "/v1/politics/uk/datasets/admissions",
      },
    });
    expect(body.reuse.sourceRights).toMatch(/leave uncertainty explicit/);
    expect(body.releaseDiscovery).toMatchObject({
      ledger: "/v1/open-data/releases",
      jsonFeed: "/v1/open-data/releases/feed.json",
      atom: "/v1/open-data/releases/feed.atom",
    });
    expect(body.reuse.corrections).toBe(
      "https://github.com/cambridgetcg/taxsorted.io/issues"
    );
  });

  it("supports HEAD and representation-specific conditional requests", async () => {
    const { app } = mount();
    const first = await app.request("/v1/open-data");
    const etag = first.headers.get("etag")!;

    const head = await app.request("/v1/open-data", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(etag);

    const second = await app.request("/v1/open-data", {
      headers: { "If-None-Match": `"other", W/${etag}` },
    });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
  });

  it("publishes one machine-readable mixed-rights statement", async () => {
    const { app } = mount();
    const response = await app.request("/v1/open-data/rights");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("mixed-rights-read-before-reuse");
    expect(body.datasetRights.politics).toBe(
      "/v1/politics/uk/datasets/rights"
    );
    expect(body.datasetRights.charities).toBe(
      "/v1/charities/uk/sources"
    );
    expect(body.datasetRights.publicFunding).toBe(
      "/v1/public-funding/uk/sources"
    );
    expect(body.frameworkRights).toEqual({
      taxIdentity: "/v1/tax-identity/uk/rights",
    });
    expect(body.automationRule).toMatch(/not.*blanket licence/i);
    expect(body.correctionChannel).toMatchObject({
      accountRequired: true,
      privateOrSensitiveIntakeAvailable: false,
      warning: expect.stringMatching(/not live/),
    });
    expect(response.headers.get("link")).toContain(
      '<https://creativecommons.org/licenses/by-sa/4.0/>; rel="license"'
    );
  });

  it("reports the independent politics bulk stop without hiding discovery", async () => {
    const app = new Hono();
    app.route(
      "/v1/open-data",
      createOpenDataRoutes({ politicsBulkDataAvailable: false })
    );
    const response = await app.request("/v1/open-data");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.datasets[4].publication.fullDatasetAvailable).toBe(false);
    expect(body.datasets[4].publication.status).toBe("publication-review");
  });

  it("reports an approved politics release with the same digest and intake", async () => {
    const app = new Hono();
    app.route(
      "/v1/open-data",
      createOpenDataRoutes({
        politicsBulkDataAvailable: true,
        politicsBulkDataApproval: {
          approver: "Yu",
          approvedOn: "2026-07-10",
          admissionDigest: politicsDatasetAdmissionDigest,
          confidentialIntakeUrl: "https://intake.taxsorted.io/politics",
        },
      })
    );

    const body = await (await app.request("/v1/open-data")).json();
    expect(body.datasets[4]).toMatchObject({
      admissionDigest: politicsDatasetAdmissionDigest,
      humanApproval: {
        status: "approved",
        approver: "Yu",
        approvedOn: "2026-07-10",
        admissionDigest: politicsDatasetAdmissionDigest,
      },
      correctionChannel: {
        privateOrSensitiveIntakeAvailable: true,
        privateUrl: "https://intake.taxsorted.io/politics",
        warning: expect.stringMatching(/Use the confidential intake/),
      },
      publication: {
        status: "open",
        fullDatasetAvailable: true,
        confidentialIntake: {
          status: "live",
          url: "https://intake.taxsorted.io/politics",
        },
      },
    });
  });

  it("gives an emergency stop precedence over approved-disabled centrally", async () => {
    const app = new Hono();
    app.route(
      "/v1/open-data",
      createOpenDataRoutes({
        politicsBulkDataAvailable: false,
        politicsBulkDataEmergencyStop: true,
        politicsBulkDataApproval: {
          approver: "Yu",
          approvedOn: "2026-07-10",
          admissionDigest: politicsDatasetAdmissionDigest,
          confidentialIntakeUrl: "https://intake.taxsorted.io/politics",
        },
      })
    );

    const body = await (await app.request("/v1/open-data")).json();
    expect(body.datasets[4].publication).toMatchObject({
      status: "emergency-stopped",
      fullDatasetAvailable: false,
      humanApproval: { status: "approved" },
      confidentialIntake: { status: "live" },
    });
  });

  it("shows the charity emergency stop without hiding official register discovery", async () => {
    const app = new Hono();
    app.route(
      "/v1/open-data",
      createOpenDataRoutes({
        charitiesPublic: true,
        charitiesEmergencyStop: true,
      })
    );

    const body = await (await app.request("/v1/open-data")).json();
    expect(body.datasets[2]).toMatchObject({
      id: "uk-charities-sector",
      publication: {
        status: "emergency-stopped",
        fullDatasetAvailable: false,
        reviewBoundary: expect.stringMatching(/official register doors/i),
      },
    });
  });

  it("shows the public-funding stop without hiding sources and known gaps", async () => {
    const app = new Hono();
    app.route(
      "/v1/open-data",
      createOpenDataRoutes({
        publicFundingPublic: true,
        publicFundingEmergencyStop: true,
      })
    );

    const body = await (await app.request("/v1/open-data")).json();
    expect(body.datasets[3]).toMatchObject({
      id: "uk-public-funding",
      publication: {
        status: "emergency-stopped",
        fullDatasetAvailable: false,
        reviewBoundary: expect.stringMatching(/source ledger, known gaps/i),
      },
    });
  });

  it("reports the tax-identity stop while keeping contract discovery available", async () => {
    const app = new Hono();
    app.route(
      "/v1/open-data",
      createOpenDataRoutes({ taxIdentityEmergencyStop: true }),
    );

    const body = await (await app.request("/v1/open-data")).json();
    expect(body.datasets).toHaveLength(5);
    expect(body.frameworks[0]).toMatchObject({
      id: "uk-tax-identity-framework",
      availability: {
        status: "emergency-stopped",
        contentAvailable: false,
        discoveryAvailable: true,
        schemaAvailable: true,
        rightsAvailable: true,
        openApiAvailable: true,
        humanGuideAvailable: true,
        emergencyStop: true,
      },
      resources: {
        schema: "/v1/tax-identity/uk/schema",
        rights: "/v1/tax-identity/uk/rights",
        openApi: "/openapi/tax-identity-uk.json",
      },
    });
  });

  it("rejects meaningless query parameters instead of creating cache variants", async () => {
    const { app } = mount();
    for (const path of ["/v1/open-data?format=csv", "/v1/open-data/rights?raw=true"]) {
      const response = await app.request(path);
      expect(response.status, path).toBe(400);
      expect(response.headers.get("cache-control"), path).toBe("no-store");
      expect(response.headers.get("content-type"), path).toContain(
        "application/problem+json",
      );
      expect(await response.json(), path).toMatchObject({
        error: "unknown_query_parameter",
      });
    }
  });
});
