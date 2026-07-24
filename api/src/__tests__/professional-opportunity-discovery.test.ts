import { describe, expect, it } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { registerDeveloperApi } from "../developer-api.js";
import { requestId } from "../request-id.js";
import {
  agentManifestText,
  buildAgentWakePayload,
} from "../routes/agent-interface.js";

function mountDeveloperApi() {
  const app = new OpenAPIHono();
  let browserSessionCalls = 0;
  app.use("*", requestId);
  app.use("*", apiCors);
  registerDeveloperApi(app, "https://api.taxsorted.io");
  app.use("/v1/*", async (c) => {
    browserSessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    return c.json({ error: "browser_session_touched" }, 418);
  });
  return { app, browserSessionCalls: () => browserSessionCalls };
}

describe("professional-opportunity discovery", () => {
  it("projects the publication controls without exposing stopped IDs", () => {
    const wake = buildAgentWakePayload({
      professionalOpportunitiesPublic: true,
      professionalOpportunitiesStoppedIds: [
        "uk-business-rates-valuation",
      ],
    });

    expect(wake.resources.openApi.frameworkSlices).toMatchObject({
      professionalOpportunities:
        "/openapi/professional-opportunities-uk.json",
    });
    expect(wake.resources.professionalOpportunities).toMatchObject({
      href: "/v1/professional-opportunities/uk",
      opportunities:
        "/v1/professional-opportunities/uk/opportunities",
      scrutiny: "/v1/professional-opportunities/uk/scrutiny",
      sources: "/v1/professional-opportunities/uk/sources",
      assessmentTemplate:
        "/v1/professional-opportunities/uk/assessment-template",
      openApi: "/openapi/professional-opportunities-uk.json",
      availability: "record-level-stops-active",
      stoppedOpportunityCount: 1,
      writes: false,
      clientIntake: false,
      privateUploads: false,
      professionalMarketplace: false,
      caseAssignment: false,
      probabilityOrExpectedValue: false,
      optionalAgentToolBridge: {
        required: false,
        sdk: "@agenttool/sdk",
        version: "0.16.2",
        directHttpsIsUniversalDoor: true,
        hostedAgentToolWrite: false,
        privateMatterFacts: false,
      },
    });
    expect(
      JSON.stringify(wake.resources.professionalOpportunities),
    ).not.toContain("uk-business-rates-valuation");
    expect(wake.walls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "regulator-scrutiny-keeps-proof-limits",
        }),
        expect.objectContaining({
          id: "no-opportunity-marketplace-or-intake",
        }),
      ]),
    );
    expect(wake.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "inspect-professional-opportunities",
          method: "GET",
          href: "/v1/professional-opportunities/uk",
        }),
      ]),
    );

    expect(agentManifestText).toContain(
      "professional-opportunities: GET https://api.taxsorted.io/v1/professional-opportunities/uk",
    );
    expect(agentManifestText).toContain(
      "professional-opportunities-openapi: GET https://api.taxsorted.io/openapi/professional-opportunities-uk.json",
    );
    expect(agentManifestText).toContain(
      "no client intake, private upload, probability, expected value, ranking, matching, outreach, recommendation, case assignment, representation, filing, payment or referral fee",
    );
  });

  it("serves a self-contained, sessionless and read-only task slice", async () => {
    const { app, browserSessionCalls } = mountDeveloperApi();
    const path = "/openapi/professional-opportunities-uk.json";

    expect(isPublicCivicPath(path)).toBe(true);
    expect(isPublicCivicPath(`${path}/extra`)).toBe(false);
    expect(
      isPublicCivicPath("/v1/professional-opportunities/uk/scrutiny"),
    ).toBe(true);

    const response = await app.request(path, {
      headers: { Origin: "https://researcher.example" },
    });
    const representation = await response.text();
    const document = JSON.parse(representation);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/vnd.oai.openapi+json",
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-expose-headers")).toContain(
      "X-Corpus-Retrieved-On",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("etag")).toMatch(
      /^"sha256-[a-f0-9]{64}"$/,
    );
    expect(browserSessionCalls()).toBe(0);
    expect(document["x-taxsorted-slice"]).toMatchObject({
      id: "professional-opportunities-uk",
      canonical: path,
      pathCount: 11,
      operationCount: 22,
    });

    const expectedPaths = [
      "/v1/professional-opportunities/uk",
      "/v1/professional-opportunities/uk/method",
      "/v1/professional-opportunities/uk/opportunities",
      "/v1/professional-opportunities/uk/opportunities/{opportunityId}",
      "/v1/professional-opportunities/uk/scrutiny",
      "/v1/professional-opportunities/uk/sources",
      "/v1/professional-opportunities/uk/assessment-template",
      "/v1/professional-opportunities/uk/rights",
      "/v1/professional-opportunities/uk/schema",
      "/v1/professional-opportunities/uk/packet-schema",
      "/v1/professional-opportunities/uk/assessment-schema",
    ];
    expect(Object.keys(document.paths).sort()).toEqual(
      expectedPaths.sort(),
    );
    for (const [operationPath, pathItem] of Object.entries(
      document.paths,
    )) {
      expect(
        Object.keys(pathItem as object).sort(),
        operationPath,
      ).toEqual(["get", "head"]);
      for (const operation of Object.values(pathItem as object)) {
        expect(operation).toMatchObject({
          operationId: expect.any(String),
          security: [],
          tags: ["UK professional opportunities"],
        });
        const responseHeaders = (operation as any).responses["200"]
          .headers;
        expect(responseHeaders).toHaveProperty(
          "X-Corpus-Retrieved-On",
        );
        expect(responseHeaders).not.toHaveProperty(
          "X-Corpus-Reviewed-On",
        );
      }
    }
    expect(
      document.paths["/v1/professional-opportunities/uk/scrutiny"]
        .get.description,
    ).toMatch(/does not prove.*counterweight.*correction or review/);
    expect(
      document.paths[
        "/v1/professional-opportunities/uk/assessment-template"
      ].get.description,
    ).toMatch(/no submission endpoint/i);
    expect(representation).not.toContain('"post"');
    expect(representation).not.toContain('"WorkspaceKey"');

    const head = await app.request(path, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(response.headers.get("etag"));

    const unchanged = await app.request(path, {
      headers: { "If-None-Match": `W/${response.headers.get("etag")}` },
    });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");
    expect(browserSessionCalls()).toBe(0);
  });
});
