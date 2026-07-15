import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.hoisted(() => vi.fn());
vi.mock("../db.js", () => ({ sql: query }));

import { OpenAPIHono } from "@hono/zod-openapi";
import { apiCors } from "../cors.js";
import { registerDeveloperApi } from "../developer-api.js";
import { apiErrorHandler } from "../error-handler.js";
import {
  mtdIncomeTaxAssessmentRequestExample,
  sdltCalculationRequestExample,
} from "../professional-tools-examples.js";
import { requestId } from "../request-id.js";

function mount(apiOrigin = "https://api.taxsorted.io") {
  const app = new OpenAPIHono();
  let browserSessionCalls = 0;
  app.use("*", apiCors);
  app.use("*", requestId);
  registerDeveloperApi(app, apiOrigin);
  app.use("/v1/*", async (c) => {
    browserSessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    return c.json({ error: "browser_session_touched" }, 418);
  });
  app.onError(apiErrorHandler);
  return { app, browserSessionCalls: () => browserSessionCalls };
}

beforeEach(() => query.mockReset());

describe("UK professional tools API", () => {
  it("publishes the real professional jobs and missing practice capabilities", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/v1/uk/professional-tools", {
      headers: { Origin: "https://builder.example", Cookie: "existing=1" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toMatch(/max-age=300/);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.uk.professional-tools/1",
    );
    expect(response.headers.get("link")).toContain(
      "/openapi/professional-tools-uk.json",
    );
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(browserSessionCalls()).toBe(0);
    expect(query).not.toHaveBeenCalled();

    const body = await response.json();
    expect(body).toMatchObject({
      schema: "taxsorted.uk.professional-tools/1",
      status: "credentialed-design-partner",
      access: {
        availability: "credentialed-design-partner",
        publicSelfServiceKeyProvisioning: false,
        confidentialAccessRequestIntake: false,
        browserAccountProvidesWorkspaceKey: false,
        workspaceKeyIdentifiesCallingWorkspace: true,
        requestFactsMayBePersonalData: true,
      },
      practiceRecord: {
        applicationStoresRequestsOrResults: false,
        immutableEvidenceArchiveAvailable: false,
        signedEvidencePackAvailable: false,
      },
      boundaries: {
        clientOrMatterRecords: false,
        clientMatterReference: false,
        portfolioOrBatchOperations: false,
        firmUsersRolesOrApprovals: false,
        filingOrSubmission: false,
        taskRoutesConnectToHmrc: false,
        productionSla: false,
        publishedRateLimitContract: false,
        publishedProfessionalPrivacyAndRetentionPolicy: false,
        publishedSecurityAssessment: false,
        selfServiceKeyRotationOrRevocation: false,
        publishedHighAvailabilityContract: false,
      },
    });
    expect(body.tasks).toEqual([
      expect.objectContaining({
        id: "residential-sdlt-calculation",
        operationId: "calculateResidentialSdlt",
        requiredScope: "sdlt:calculate",
        request: expect.objectContaining({
          example: sdltCalculationRequestExample,
        }),
        result: expect.objectContaining({
          possibleStatuses: ["calculated", "needs_review"],
        }),
      }),
      expect.objectContaining({
        id: "mtd-income-tax-readiness",
        operationId: "assessMtdIncomeTaxReadiness",
        requiredScope: "tax-expert:assess",
        request: expect.objectContaining({
          example: mtdIncomeTaxAssessmentRequestExample,
        }),
      }),
    ]);
    expect(body.practiceRecord.callerMustRetain).toEqual(
      expect.arrayContaining([
        "the exact request body sent",
        "the exact response body received",
        "the X-Request-ID response header",
      ]),
    );
  });

  it("publishes one self-contained OpenAPI slice for both professional tasks", async () => {
    const { app } = mount();
    const response = await app.request("/openapi/professional-tools-uk.json", {
      headers: { Origin: "https://builder.example" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");

    const document = await response.json();
    expect(document.openapi).toBe("3.1.0");
    expect(document["x-taxsorted-slice"].id).toBe("professional-tools-uk");
    expect(Object.keys(document.paths).sort()).toEqual([
      "/v1/uk/professional-tools",
      "/v1/uk/sdlt/calculations",
      "/v1/uk/tax-expert",
      "/v1/uk/tax-expert/mtd-income-tax/assessments",
    ]);
    expect(document.paths["/v1/uk/professional-tools"].get.security).toEqual(
      [],
    );
    expect(document.paths["/v1/uk/tax-expert"].get.security).toEqual([]);
    expect(
      document.paths["/v1/uk/sdlt/calculations"].post.security,
    ).toEqual([{ WorkspaceKey: [] }]);
    expect(
      document.paths["/v1/uk/sdlt/calculations"].post[
        "x-taxsorted-required-workspace-scopes"
      ],
    ).toEqual(["sdlt:calculate"]);
    expect(
      document.paths["/v1/uk/tax-expert/mtd-income-tax/assessments"].post[
        "x-taxsorted-required-workspace-scopes"
      ],
    ).toEqual(["tax-expert:assess"]);
    expect(
      document.paths["/v1/uk/sdlt/calculations"].post.requestBody.content[
        "application/json"
      ].example,
    ).toEqual(sdltCalculationRequestExample);
    expect(
      document.paths[
        "/v1/uk/tax-expert/mtd-income-tax/assessments"
      ].post.requestBody.content["application/json"].example,
    ).toEqual(mtdIncomeTaxAssessmentRequestExample);
    expect(
      document.paths["/v1/uk/sdlt/calculations"].post[
        "x-taxsorted-retry"
      ],
    ).toMatchObject({
      applicationOrExternalStateChange: false,
      duplicateRequestStateEffect: "none",
      byteStabilityGuaranteedAcrossTime: false,
    });
    expect(
      document.paths["/v1/uk/sdlt/calculations"].post.responses[200].headers,
    ).toHaveProperty("X-Request-ID");
    expect(
      document.paths["/v1/uk/sdlt/calculations"].post.responses[401].headers,
    ).toEqual(
      expect.objectContaining({
        "X-Request-ID": expect.any(Object),
        Link: expect.any(Object),
        "Cache-Control": expect.objectContaining({
          schema: expect.objectContaining({ enum: ["no-store"] }),
        }),
        "WWW-Authenticate": expect.any(Object),
      }),
    );
    expect(
      document.paths[
        "/v1/uk/tax-expert/mtd-income-tax/assessments"
      ].post.responses[403].headers,
    ).toHaveProperty("WWW-Authenticate");
    expect(document.components.securitySchemes.WorkspaceKey).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "ts_(test|live)_<32-byte-secret>",
    });
    expect(document.components.schemas.ApiError.properties).toMatchObject({
      requiredScope: expect.any(Object),
      access: expect.any(Object),
      nextActions: expect.any(Object),
    });
    expect(
      document.components.schemas.TaxExpertApiError.properties,
    ).toMatchObject({
      requiredScope: expect.any(Object),
      access: expect.any(Object),
      nextActions: expect.any(Object),
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("builds quickstarts for the configured API origin", async () => {
    const { app } = mount("https://staging-api.example.test");
    const response = await app.request("/v1/uk/professional-tools");
    const body = await response.json();
    for (const task of body.tasks) {
      expect(task.request.shell).toContain("https://staging-api.example.test/");
      expect(task.request.shell).not.toContain("https://api.taxsorted.io/");
    }
  });
});
