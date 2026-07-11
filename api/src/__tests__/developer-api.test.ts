import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const query = vi.hoisted(() => vi.fn());
vi.mock("../db.js", () => ({ sql: query }));

import { OpenAPIHono } from "@hono/zod-openapi";
import { hashApiKey } from "../api-key.js";
import { registerDeveloperApi } from "../developer-api.js";
import { apiErrorHandler } from "../error-handler.js";
import { requestId } from "../request-id.js";

const rawKey = `ts_test_${"b".repeat(43)}`;

function requestBody() {
  return {
    effectiveDate: "2026-07-10",
    chargeableConsiderationPence: 29_500_000,
    land: {
      jurisdiction: "england",
      use: "residential",
      interest: "freehold",
      dwellingCount: 1,
    },
    buyerKind: "individual",
    treatment: {
      firstTimeBuyerRelief: "do-not-claim",
      higherRates: "standard",
      nonResidentSurcharge: "do-not-apply",
    },
    specialCases: {
      linkedTransactions: false,
      sharedOwnership: false,
      otherReliefClaimed: false,
      complexConsideration: false,
      transitionalContractMayApply: false,
    },
  };
}

function mount() {
  const app = new OpenAPIHono();
  let browserSessionCalls = 0;
  app.use("*", requestId);
  registerDeveloperApi(app, "https://api.taxsorted.io");
  // Mirrors index.ts ordering. A developer route that falls through creates
  // this obvious failure and cookie, making the boundary regression visible.
  app.use("/v1/*", async (c) => {
    browserSessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    return c.json({ error: "browser_session_touched" }, 418);
  });
  app.onError(apiErrorHandler);
  return { app, browserSessionCalls: () => browserSessionCalls };
}

beforeEach(() => {
  query.mockReset();
  query.mockResolvedValue([
    {
      id: "key-1",
      workspace_id: "workspace-1",
      mode: "test",
      scopes: ["sdlt:calculate"],
    },
  ]);
});

describe("developer API boundary", () => {
  it("publishes an OpenAPI 3.1 contract without authentication or browser cookies", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/openapi.json");
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(browserSessionCalls()).toBe(0);
    expect(query).not.toHaveBeenCalled();

    const document = await response.json();
    expect(document.openapi).toBe("3.1.0");
    expect(document.servers).toEqual([{ url: "https://api.taxsorted.io" }]);
    expect(document.paths).toHaveProperty("/");
    expect(document.paths).toHaveProperty("/agent.txt");
    expect(document.paths).toHaveProperty("/.well-known/agent.txt");
    expect(document.paths).toHaveProperty("/v1/wake");
    expect(document.paths["/v1/wake"].get).toMatchObject({
      operationId: "wakeTaxSortedAgent",
      security: [],
    });
    expect(
      document.paths["/v1/wake"].get.responses[200].content["application/json"]
        .schema.$ref,
    ).toBe("#/components/schemas/AgentWake");
    expect(
      document.components.schemas.AgentWake.properties.resources.properties
        .charityAccountability.properties.recordsAvailable.enum
    ).toEqual([false]);
    expect(
      document.components.schemas.AgentWake.properties.resources.properties
        .corrections.properties.accountRequired.enum
    ).toEqual([true]);
    expect(
      document.components.schemas.AgentWake.properties.resources.properties
        .openApi.required,
    ).toEqual(
      expect.arrayContaining(["publicHref", "fullHref", "datasetSlices"]),
    );
    expect(
      document.components.schemas.AgentWake.properties.resources.properties,
    ).toHaveProperty("releases");
    expect(
      document.components.schemas.AgentWake.properties.evidenceLanes.items
        .properties.resources.items.properties
    ).toHaveProperty("href");
    expect(
      document.paths["/agent.txt"].get.responses[200].content,
    ).toHaveProperty("text/plain");
    expect(document.paths["/"].get.responses).toHaveProperty("404");
    expect(document.paths).toHaveProperty("/v1/uk/sdlt/calculations");
    expect(document.paths).toHaveProperty("/v1/open-data");
    expect(document.paths).toHaveProperty("/v1/open-data/rights");
    expect(document.paths).toHaveProperty("/v1/open-data/releases");
    expect(document.paths).toHaveProperty("/v1/open-data/releases/feed.json");
    expect(document.paths).toHaveProperty("/v1/open-data/releases/feed.atom");
    expect(
      document.paths["/v1/open-data/releases/feed.atom"].get.responses[200]
        .content,
    ).toHaveProperty("application/atom+xml");
    expect(
      document.components.schemas.OpenDataCatalog.properties,
    ).toHaveProperty("releaseDiscovery");
    expect(
      document.components.schemas.OpenDataCatalog.properties.access.properties,
    ).toHaveProperty("agentDiscovery");
    expect(
      document.components.schemas.OpenDataDataset.properties.publication
        .properties,
    ).toHaveProperty("humanApproval");
    expect(
      document.components.schemas.OpenDataDataset.properties.publication
        .properties,
    ).toHaveProperty("confidentialIntake");
    expect(
      document.components.schemas.OpenDataReleaseCheckpoint.required,
    ).toEqual(expect.arrayContaining(["title", "links", "digest"]));
    expect(
      document.components.schemas.OpenDataReleaseCheckpointLinks.properties,
    ).toMatchObject({
      currentGraph: expect.any(Object),
      immutableSnapshot: expect.any(Object),
    });
    for (const field of ["datasetId", "version", "digest"] as const) {
      const pattern =
        document.components.schemas.OpenDataReleaseCheckpoint.properties[field]
          .pattern;
      expect(pattern, field).not.toMatch(/\/[a-z]+$/);
    }
    expect(
      new RegExp(
        document.components.schemas.OpenDataReleaseCheckpoint.properties
          .datasetId.pattern,
      ).test("uk-tax-system"),
    ).toBe(true);
    expect(document.paths["/v1/open-data/rights"].head.security).toEqual([]);
    expect(document.paths["/v1/open-data"].get).toMatchObject({
      operationId: "listOpenDataDatasets",
      security: [],
    });
    expect(document.paths).toHaveProperty("/v1/tax-system/uk");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/{collection}");
    expect(document.paths).toHaveProperty(
      "/v1/tax-system/uk/{collection}/{id}",
    );
    expect(document.paths).toHaveProperty(
      "/v1/tax-system/uk/records/{id}",
    );
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/graph");
    expect(
      document.paths["/v1/tax-system/uk/map"].get.responses,
    ).toHaveProperty("308");
    expect(
      document.paths["/v1/tax-system/uk/map"].head.responses,
    ).toHaveProperty("400");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/manifest");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/schema");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/dictionary");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/exports");
    expect(document.paths).toHaveProperty(
      "/v1/tax-system/uk/exports/{collection}/{format}",
    );
    expect(document.paths["/v1/tax-system/uk"].get.security).toEqual([]);
    expect(document.paths["/v1/tax-system/uk"].head.security).toEqual([]);
    expect(
      document.paths["/v1/tax-system/uk/records/{id}"].get.responses[503]
        .description,
    ).toMatch(/intentionally indistinguishable/i);
    expect(
      document.paths["/v1/tax-system/uk/records/{id}"].get.responses[404]
        .content,
    ).toHaveProperty("application/problem+json");
    expect(document.paths).toHaveProperty(
      "/v1/tax-industry/uk/records/{id}",
    );
    expect(document.paths).toHaveProperty(
      "/v1/charities/uk/records/{id}",
    );
    expect(
      document.paths["/v1/tax-system/uk/exports/{collection}/{format}"].head
        .parameters,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "If-None-Match", in: "header" }),
      ]),
    );
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/{collection}");
    expect(document.paths).toHaveProperty(
      "/v1/tax-industry/uk/{collection}/{id}",
    );
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/graph");
    expect(
      document.paths["/v1/tax-industry/uk/map"].get.responses,
    ).toHaveProperty("308");
    expect(
      document.paths["/v1/tax-industry/uk/map"].head.responses,
    ).toHaveProperty("400");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/manifest");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/schema");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/dictionary");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/exports");
    expect(document.paths).toHaveProperty(
      "/v1/tax-industry/uk/exports/{collection}/{format}",
    );
    expect(document.paths["/v1/tax-industry/uk"].get.security).toEqual([]);
    expect(document.paths["/v1/tax-industry/uk"].head.security).toEqual([]);
    expect(
      document.paths["/v1/tax-industry/uk/exports/{collection}/{format}"].head
        .responses[200].headers,
    ).toHaveProperty("Content-Disposition");
    expect(document.paths).toHaveProperty("/v1/charities/uk");
    expect(document.paths).toHaveProperty("/v1/charities/uk/{collection}");
    expect(document.paths).toHaveProperty("/v1/charities/uk/{collection}/{id}");
    expect(document.paths).toHaveProperty("/v1/charities/uk/graph");
    expect(document.paths["/v1/charities/uk/map"].get.responses).toHaveProperty(
      "308",
    );
    expect(
      document.paths["/v1/charities/uk/map"].head.responses,
    ).toHaveProperty("400");
    expect(document.paths).toHaveProperty("/v1/charities/uk/accountability");
    expect(document.paths).toHaveProperty(
      "/v1/charities/uk/accountability/schema"
    );
    expect(
      document.paths["/v1/charities/uk/accountability"].get.responses[200]
        .content["application/json"].schema.$ref
    ).toBe("#/components/schemas/UkCharityAccountabilityFramework");
    expect(
      document.paths["/v1/charities/uk/accountability/schema"].get.responses[200]
        .content["application/schema+json"].schema.$ref
    ).toBe("#/components/schemas/UkCharityAccountabilityJsonSchema");
    expect(
      document.components.schemas.UkCharityAccountabilityFramework.properties
        .publicationAdmission.properties.datasetStatus.enum
    ).toEqual(["candidate-not-admitted"]);
    expect(
      document.components.schemas.UkCharityAccountabilityFramework.properties
        .publicationAdmission.properties.externalEnvelopeRequired.enum
    ).toEqual([true]);
    expect(
      document.components.schemas.UkCharityAccountabilityFramework.properties
        .admissionConditions.items.properties.status.enum
    ).toEqual(["required-not-satisfied"]);
    expect(
      document.components.schemas.UkCharityAccountabilityFramework.properties
    ).toHaveProperty("collectionGuide");
    expect(
      document.components.schemas.UkCharityAccountabilityFramework.properties
    ).toHaveProperty("comparableMoney");
    expect(document.paths["/v1/charities/uk/accountability"].get.security).toEqual([]);
    expect(document.paths["/v1/charities/uk/accountability"].head.security).toEqual([]);
    expect(document.paths).toHaveProperty("/v1/charities/uk/manifest");
    expect(document.paths).toHaveProperty("/v1/charities/uk/schema");
    expect(document.paths).toHaveProperty("/v1/charities/uk/dictionary");
    expect(document.paths).toHaveProperty("/v1/charities/uk/exports");
    expect(document.paths).toHaveProperty(
      "/v1/charities/uk/exports/{collection}/{format}",
    );
    expect(document.paths["/v1/charities/uk"].get.security).toEqual([]);
    expect(document.paths["/v1/charities/uk"].head.security).toEqual([]);
    const charityQueryParameters =
      document.paths["/v1/charities/uk/{collection}"].get.parameters;
    expect(charityQueryParameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "jurisdiction", in: "query" }),
        expect.objectContaining({ name: "regulatorId", in: "query" }),
      ]),
    );
    expect(charityQueryParameters).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "religion", in: "query" }),
      ]),
    );
    expect(charityQueryParameters).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "name", in: "query" }),
      ]),
    );
    expect(
      document.paths["/v1/charities/uk/exports/{collection}/{format}"].head
        .responses[200].headers,
    ).toHaveProperty("Content-Disposition");
    expect(
      document.paths["/v1/charities/uk/{collection}"].get.responses[400]
        .content["application/json"].schema.$ref
    ).toBe("#/components/schemas/UkCharityInstructionalError");
    expect(
      document.components.schemas.UkCharityInstructionalError.properties
        .next_actions
    ).toMatchObject({ type: "array" });
    expect(
      document.components.schemas.UkCharityInstructionalError.properties.schema
        .enum
    ).toEqual(["taxsorted.charity-error/1"]);
    expect(document.paths).toHaveProperty("/v1/public-funding/uk");
    expect(document.paths).toHaveProperty("/v1/public-funding/uk/{collection}");
    expect(document.paths).toHaveProperty(
      "/v1/public-funding/uk/{collection}/{id}",
    );
    expect(document.paths).toHaveProperty("/v1/public-funding/uk/graph");
    expect(document.paths).toHaveProperty("/v1/public-funding/uk/manifest");
    expect(document.paths).toHaveProperty("/v1/public-funding/uk/schema");
    expect(document.paths).toHaveProperty("/v1/public-funding/uk/dictionary");
    expect(document.paths).toHaveProperty("/v1/public-funding/uk/exports");
    expect(document.paths).toHaveProperty("/v1/public-funding/uk/changes");
    expect(document.paths).toHaveProperty("/v1/public-funding/uk/records/{id}");
    expect(document.paths).toHaveProperty(
      "/v1/public-funding/uk/exports/{collection}/{format}",
    );
    expect(document.paths["/v1/public-funding/uk"].get.security).toEqual([]);
    expect(document.paths["/v1/public-funding/uk"].head.security).toEqual([]);
    const publicFundingQueryParameters =
      document.paths["/v1/public-funding/uk/{collection}"].get.parameters;
    expect(publicFundingQueryParameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "financialYear", in: "query" }),
        expect.objectContaining({ name: "beneficiaryTag", in: "query" }),
      ]),
    );
    expect(publicFundingQueryParameters).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "holderName", in: "query" }),
      ]),
    );
    expect(
      document.paths["/v1/public-funding/uk/exports/{collection}/{format}"].head
        .responses[200].headers,
    ).toHaveProperty("Content-Disposition");
    expect(
      document.paths["/v1/public-funding/uk/{collection}"].get.responses[200]
        .content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/UkPublicFundingList");
    expect(
      document.paths["/v1/public-funding/uk/{collection}/{id}"].get
        .responses[200].content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/UkPublicFundingDetail");
    expect(
      document.paths["/v1/public-funding/uk/exports/{collection}/{format}"].get
        .responses[503].content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/UkPublicFundingUnavailable");
    expect(
      document.components.schemas.UkPublicFundingUnavailable.properties.error
        .enum,
    ).toEqual(["publication_review_pending", "publication_emergency_stopped"]);
    expect(
      document.paths["/v1/public-funding/uk/changes"].get.responses[200]
        .content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/UkPublicFundingChangeFeed");
    expect(
      document.paths["/v1/public-funding/uk/records/{id}"].get.responses[200]
        .content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/UkPublicFundingResolvedRecord");
    expect(
      document.paths["/v1/public-funding/uk/changes"].get.responses[400]
        .content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/UkPublicFundingActionError");
    expect(
      document.paths["/v1/public-funding/uk/records/{id}"].get.responses[404]
        .content["application/json"].schema.$ref,
    ).toBe("#/components/schemas/UkPublicFundingActionError");
    expect(
      document.components.schemas.UkPublicFundingUnavailable.properties,
    ).toHaveProperty("nextActions");
    expect(
      document.components.schemas.UkPublicFundingChange.properties,
    ).toMatchObject({
      previousEventHash: expect.any(Object),
      eventHash: expect.any(Object),
    });
    expect(
      document.components.schemas.UkPublicFundingList.properties.page
        .properties,
    ).toHaveProperty("hasMore");
    expect(document.paths).toHaveProperty("/v1/open-data");
    expect(document.paths).toHaveProperty("/v1/politics/uk");
    expect(document.paths).toHaveProperty("/v1/politics/uk/datasets");
    expect(document.paths).toHaveProperty("/v1/politics/uk/manifest");
    expect(document.paths).toHaveProperty("/v1/politics/uk/datasets/schema");
    expect(document.paths).toHaveProperty("/v1/politics/uk/datasets/rights");
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/datasets/admissions",
    );
    expect(
      document.paths["/v1/politics/uk/datasets/admissions"].head.security,
    ).toEqual([]);
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/datasets/{datasetId}",
    );
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/datasets/{datasetId}/schema",
    );
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/datasets/{datasetId}/download",
    );
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/relationships/contracts",
    );
    expect(document.paths).toHaveProperty("/v1/politics/uk/enforcement/forces");
    expect(document.paths).toHaveProperty("/v1/politics/uk/system");
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/power/offices/{officeId}",
    );
    expect(document.paths).toHaveProperty("/v1/politics/uk/people");
    expect(document.paths).toHaveProperty("/v1/politics/uk/people/{id}");
    expect(document.paths).toHaveProperty("/v1/politics/uk/funding/donations");
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/relationships/ministerial-benefits",
    );
    expect(document.paths["/v1/politics/uk"].get.security).toEqual([]);
    expect(document.paths["/v1/politics/uk/datasets"].get.security).toEqual([]);
    expect(document.paths["/v1/politics/uk/datasets"].head.security).toEqual(
      [],
    );
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}/download"].get
        .security,
    ).toEqual([]);
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}/download"].get
        .parameters,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "format",
          in: "query",
          schema: expect.objectContaining({ enum: ["json", "csv", "ndjson"] }),
        }),
      ]),
    );
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}"].get.parameters,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "datasetId",
          in: "path",
          schema: expect.objectContaining({ pattern: "^[a-z0-9-]+$" }),
        }),
      ]),
    );
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}/download"].get
        .responses[200].headers,
    ).toHaveProperty("X-Checksum-SHA256");
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}/download"].get
        .responses[200].headers,
    ).toHaveProperty("Content-Disposition");
    expect(
      document.paths["/v1/tax-industry/uk/{collection}"].get.parameters,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "gateId", in: "query" }),
      ]),
    );
    for (const path of ["/v1/open-data", "/v1/open-data/rights"]) {
      expect(document.paths[path].get.responses, `${path} GET`).toHaveProperty(
        "400",
      );
      expect(
        document.paths[path].head.responses,
        `${path} HEAD`,
      ).toHaveProperty("400");
    }
    for (const family of ["tax-system", "tax-industry", "charities"]) {
      const staticSuffixes = [
        "",
        "/map",
        "/graph",
        "/manifest",
        "/schema",
        "/dictionary",
        "/exports",
      ];
      for (const suffix of staticSuffixes) {
        const path = `/v1/${family}/uk${suffix}`;
        expect(
          document.paths[path].get.responses,
          `${path} GET`,
        ).toHaveProperty("400");
        expect(
          document.paths[path].head.responses,
          `${path} HEAD`,
        ).toHaveProperty("400");
      }
      for (const suffix of [
        "/{collection}/{id}",
        "/exports/{collection}/{format}",
      ]) {
        const path = `/v1/${family}/uk${suffix}`;
        expect(
          document.paths[path].get.responses,
          `${path} GET`,
        ).toHaveProperty("400");
        expect(
          document.paths[path].head.responses,
          `${path} HEAD`,
        ).toHaveProperty("400");
      }
    }
    expect(document.components.schemas.DataDictionary.required).not.toContain(
      "updatePolicy",
    );
    expect(document.components.schemas.DataDictionary.required).not.toContain(
      "correctionChannel",
    );
    expect(
      document.paths["/v1/tax-system/uk/graph"].get.responses[200].content[
        "application/json"
      ].schema.properties.pipelineStages,
    ).toBeDefined();
    expect(document.info.license.name).toContain("CC BY-SA 4.0");
    expect(document.components.securitySchemes.WorkspaceKey.scheme).toBe(
      "bearer",
    );
    expect(document.info.description).toContain(
      "server source code uses AGPL-3.0",
    );
    expect(
      document.components.schemas.SdltCalculatedResponse.properties
        .reviewReasons,
    ).toMatchObject({ type: "array", maxItems: 0 });
    expect(document.paths).toHaveProperty("/openapi-public.json");
    expect(document.paths).toHaveProperty("/openapi/charities-uk.json");
    expect(document.paths["/openapi-public.json"].get).toMatchObject({
      operationId: "getPublicOpenApiDescription",
      tags: ["OpenAPI descriptions"],
      security: [],
    });
    expect(
      document.paths["/v1/wake"].get.responses[400].content,
    ).toHaveProperty("application/problem+json");
    expect(
      document.paths["/v1/wake"].get.responses[500].content,
    ).toHaveProperty("application/problem+json");
  });

  it("serves self-contained public and dataset OpenAPI slices with stable tool names", async () => {
    const { app, browserSessionCalls } = mount();
    const fullRepresentation = await (await app.request("/openapi.json")).text();
    const definitions = [
      {
        path: "/openapi-public.json",
        id: "public",
        prefix: undefined,
      },
      {
        path: "/openapi/tax-system-uk.json",
        id: "tax-system-uk",
        prefix: "/v1/tax-system/uk",
      },
      {
        path: "/openapi/tax-industry-uk.json",
        id: "tax-industry-uk",
        prefix: "/v1/tax-industry/uk",
      },
      {
        path: "/openapi/charities-uk.json",
        id: "charities-uk",
        prefix: "/v1/charities/uk",
      },
      {
        path: "/openapi/public-funding-uk.json",
        id: "public-funding-uk",
        prefix: "/v1/public-funding/uk",
      },
      {
        path: "/openapi/politics-uk.json",
        id: "politics-uk",
        prefix: "/v1/politics/uk",
      },
    ] as const;
    const methods = [
      "get",
      "put",
      "post",
      "delete",
      "options",
      "head",
      "patch",
      "trace",
    ] as const;

    for (const definition of definitions) {
      const response = await app.request(definition.path);
      const representation = await response.text();
      const document = JSON.parse(representation);

      expect(response.status, definition.path).toBe(200);
      expect(response.headers.get("content-type"), definition.path).toContain(
        "application/vnd.oai.openapi+json",
      );
      expect(response.headers.get("cache-control"), definition.path).toBe(
        "public, max-age=300, must-revalidate",
      );
      expect(response.headers.get("etag"), definition.path).toMatch(
        /^"sha256-[a-f0-9]{64}"$/,
      );
      expect(response.headers.get("etag"), definition.path).toBe(
        `"sha256-${createHash("sha256").update(representation, "utf8").digest("hex")}"`,
      );
      expect(response.headers.get("content-location"), definition.path).toBe(
        definition.path,
      );
      expect(response.headers.get("link"), definition.path).toContain(
        `</openapi.json>; rel="alternate"`,
      );
      expect(document.openapi, definition.path).toBe("3.1.0");
      expect(document.servers, definition.path).toEqual([
        { url: "https://api.taxsorted.io" },
      ]);
      expect(document["x-taxsorted-slice"], definition.path).toMatchObject({
        id: definition.id,
        canonical: definition.path,
        fullSpecification: "/openapi.json",
      });
      expect(
        document["x-taxsorted-slice"].availableSlices,
        definition.path,
      ).toEqual(
        expect.arrayContaining([
          {
            id: "charities-uk",
            href: "/openapi/charities-uk.json",
            title: "TaxSorted UK Charities API",
          },
        ]),
      );
      expect(representation.length, definition.path).toBeLessThan(
        fullRepresentation.length,
      );
      expect(document.components?.securitySchemes?.WorkspaceKey).toBeUndefined();
      expect(document.components?.schemas?.SdltCalculationRequest).toBeUndefined();

      const operationIds = new Set<string>();
      let operationCount = 0;
      for (const [operationPath, pathItem] of Object.entries(document.paths)) {
        if (definition.prefix) {
          expect(
            operationPath === definition.prefix ||
              operationPath.startsWith(`${definition.prefix}/`),
            `${definition.path} leaked ${operationPath}`,
          ).toBe(true);
        }
        for (const method of methods) {
          const operation = (pathItem as Record<string, unknown>)[method];
          if (!operation || typeof operation !== "object") continue;
          const typedOperation = operation as Record<string, unknown>;
          expect(
            typedOperation.operationId,
            `${definition.path}: ${method.toUpperCase()} ${operationPath}`,
          ).toEqual(expect.any(String));
          expect(
            typedOperation.tags,
            `${definition.path}: ${method.toUpperCase()} ${operationPath}`,
          ).toEqual([expect.any(String)]);
          const operationId = typedOperation.operationId as string;
          expect(operationIds.has(operationId), operationId).toBe(false);
          operationIds.add(operationId);
          operationCount += 1;
        }
      }
      expect(operationCount, definition.path).toBeGreaterThan(0);
      expect(document["x-taxsorted-slice"].operationCount).toBe(operationCount);

      const references = [
        ...representation.matchAll(/"\$ref":"(#\/components\/[^"#]+)"/gu),
      ].map((match) => match[1]);
      expect(references.length, definition.path).toBeGreaterThan(0);
      for (const reference of references) {
        const [, , group, name] = reference!.split("/");
        expect(
          document.components?.[group!]?.[name!],
          `${definition.path} does not contain ${reference}`,
        ).toBeDefined();
      }
    }

    const publicDocument = await (
      await app.request("/openapi-public.json")
    ).json();
    expect(publicDocument.paths).toHaveProperty("/v1/wake");
    expect(publicDocument.paths).toHaveProperty("/v1/health");
    expect(publicDocument.paths).toHaveProperty("/v1/open-data/releases");
    expect(publicDocument.paths).toHaveProperty("/v1/charities/uk");
    expect(publicDocument.paths).toHaveProperty("/v1/politics/uk/datasets");
    expect(publicDocument.paths).not.toHaveProperty(
      "/v1/uk/sdlt/calculations",
    );
    expect(publicDocument.paths["/v1/politics/uk"].get).toMatchObject({
      operationId: "getV1PoliticsUk",
      tags: ["UK politics"],
    });
    expect(browserSessionCalls()).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("refuses to place an authenticated operation inside a public slice", () => {
    const app = new OpenAPIHono();
    app.openAPIRegistry.registerPath({
      method: "get",
      path: "/v1/open-data/private-probe",
      summary: "Synthetic authenticated route",
      security: [{ WorkspaceKey: [] }],
      responses: { 200: { description: "Should never enter a public slice." } },
    });

    expect(() => registerDeveloperApi(app, "https://api.taxsorted.io")).toThrow(
      /not explicitly sessionless/i,
    );
  });

  it("revalidates OpenAPI slices by exact representation and supports HEAD", async () => {
    const { app } = mount();
    const path = "/openapi/charities-uk.json";
    const first = await app.request(path);
    const etag = first.headers.get("etag")!;

    const unchanged = await app.request(path, {
      headers: { "If-None-Match": `"elsewhere", W/${etag}` },
    });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");
    expect(unchanged.headers.get("etag")).toBe(etag);

    const head = await app.request(path, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(etag);

    const unchangedHead = await app.request(path, {
      method: "HEAD",
      headers: { "If-None-Match": "*" },
    });
    expect(unchangedHead.status).toBe(304);
    expect(await unchangedHead.text()).toBe("");
  });

  it("authenticates the machine call without touching the browser session rail", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/v1/uk/sdlt/calculations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody()),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(browserSessionCalls()).toBe(0);
    const submittedValues = query.mock.calls[0]?.slice(1) ?? [];
    expect(submittedValues).toContain(hashApiKey(rawKey));
  });

  it("rejects an oversized body before authentication or parsing", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/v1/uk/sdlt/calculations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(17 * 1024) }),
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: "request_too_large" });
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(browserSessionCalls()).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects non-JSON bodies before authentication or parsing", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/v1/uk/sdlt/calculations", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "not json",
    });
    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({
      error: "unsupported_media_type",
    });
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(browserSessionCalls()).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns a structured 400 for malformed JSON after authentication", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/v1/uk/sdlt/calculations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Content-Type": "application/json",
      },
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_json" });
    expect(browserSessionCalls()).toBe(0);
    expect(query).toHaveBeenCalledOnce();
  });

  it("still leaves later /v1 routes to the browser session rail", async () => {
    const { app, browserSessionCalls } = mount();
    const response = await app.request("/v1/private-probe");
    expect(response.status).toBe(418);
    expect(response.headers.get("set-cookie")).toContain("ts_session");
    expect(browserSessionCalls()).toBe(1);
  });
});
