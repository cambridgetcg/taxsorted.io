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
    expect(isPublicCivicPath("/v1/charities/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/charities/uk-evil")).toBe(false);
    expect(isPublicCivicPath("/v1/public-funding/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/public-funding/uk-evil")).toBe(false);

    const { app, sessionCalls } = mount();
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
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(sessionCalls()).toBe(0);
    expect(body.access).toMatchObject({ authentication: "none", price: "free" });
    expect(body.datasets).toHaveLength(5);
    expect(body.datasets[0].publication.fullDatasetAvailable).toBe(true);
    expect(body.datasets[1].publication.fullDatasetAvailable).toBe(false);
    expect(body.datasets[1].resources.exports).toBe(
      "/v1/tax-industry/uk/exports"
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

  it("rejects meaningless query parameters instead of creating cache variants", async () => {
    const { app } = mount();
    for (const path of ["/v1/open-data?format=csv", "/v1/open-data/rights?raw=true"]) {
      const response = await app.request(path);
      expect(response.status, path).toBe(400);
      expect(response.headers.get("cache-control"), path).toBe("no-store");
      expect(await response.json(), path).toMatchObject({
        error: "unknown_query_parameter",
      });
    }
  });
});
