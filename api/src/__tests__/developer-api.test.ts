import { beforeEach, describe, expect, it, vi } from "vitest";

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
    expect(document.paths).toHaveProperty("/v1/uk/sdlt/calculations");
    expect(document.paths).toHaveProperty("/v1/open-data");
    expect(document.paths).toHaveProperty("/v1/open-data/rights");
    expect(document.paths["/v1/open-data/rights"].head.security).toEqual([]);
    expect(document.paths["/v1/open-data"].get).toMatchObject({
      operationId: "listOpenDataDatasets",
      security: [],
    });
    expect(document.paths).toHaveProperty("/v1/tax-system/uk");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/{collection}");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/{collection}/{id}");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/graph");
    expect(document.paths["/v1/tax-system/uk/map"].get.responses).toHaveProperty("308");
    expect(document.paths["/v1/tax-system/uk/map"].head.responses).toHaveProperty("400");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/manifest");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/schema");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/dictionary");
    expect(document.paths).toHaveProperty("/v1/tax-system/uk/exports");
    expect(document.paths).toHaveProperty(
      "/v1/tax-system/uk/exports/{collection}/{format}"
    );
    expect(document.paths["/v1/tax-system/uk"].get.security).toEqual([]);
    expect(document.paths["/v1/tax-system/uk"].head.security).toEqual([]);
    expect(
      document.paths["/v1/tax-system/uk/exports/{collection}/{format}"].head
        .parameters
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "If-None-Match", in: "header" }),
      ])
    );
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/{collection}");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/{collection}/{id}");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/graph");
    expect(document.paths["/v1/tax-industry/uk/map"].get.responses).toHaveProperty("308");
    expect(document.paths["/v1/tax-industry/uk/map"].head.responses).toHaveProperty("400");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/manifest");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/schema");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/dictionary");
    expect(document.paths).toHaveProperty("/v1/tax-industry/uk/exports");
    expect(document.paths).toHaveProperty(
      "/v1/tax-industry/uk/exports/{collection}/{format}"
    );
    expect(document.paths["/v1/tax-industry/uk"].get.security).toEqual([]);
    expect(document.paths["/v1/tax-industry/uk"].head.security).toEqual([]);
    expect(
      document.paths["/v1/tax-industry/uk/exports/{collection}/{format}"].head
        .responses[200].headers
    ).toHaveProperty("Content-Disposition");
    expect(document.paths).toHaveProperty("/v1/open-data");
    expect(document.paths).toHaveProperty("/v1/politics/uk");
    expect(document.paths).toHaveProperty("/v1/politics/uk/datasets");
    expect(document.paths).toHaveProperty("/v1/politics/uk/manifest");
    expect(document.paths).toHaveProperty("/v1/politics/uk/datasets/schema");
    expect(document.paths).toHaveProperty("/v1/politics/uk/datasets/rights");
    expect(document.paths).toHaveProperty("/v1/politics/uk/datasets/admissions");
    expect(document.paths["/v1/politics/uk/datasets/admissions"].head.security).toEqual([]);
    expect(document.paths).toHaveProperty("/v1/politics/uk/datasets/{datasetId}");
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/datasets/{datasetId}/schema"
    );
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/datasets/{datasetId}/download"
    );
    expect(document.paths).toHaveProperty("/v1/politics/uk/relationships/contracts");
    expect(document.paths).toHaveProperty("/v1/politics/uk/enforcement/forces");
    expect(document.paths).toHaveProperty("/v1/politics/uk/system");
    expect(document.paths).toHaveProperty("/v1/politics/uk/power/offices/{officeId}");
    expect(document.paths).toHaveProperty("/v1/politics/uk/people");
    expect(document.paths).toHaveProperty("/v1/politics/uk/people/{id}");
    expect(document.paths).toHaveProperty("/v1/politics/uk/funding/donations");
    expect(document.paths).toHaveProperty(
      "/v1/politics/uk/relationships/ministerial-benefits"
    );
    expect(document.paths["/v1/politics/uk"].get.security).toEqual([]);
    expect(document.paths["/v1/politics/uk/datasets"].get.security).toEqual([]);
    expect(document.paths["/v1/politics/uk/datasets"].head.security).toEqual([]);
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}/download"].get.security
    ).toEqual([]);
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}/download"].get.parameters
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "format",
          in: "query",
          schema: expect.objectContaining({ enum: ["json", "csv", "ndjson"] }),
        }),
      ])
    );
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}"].get.parameters
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "datasetId",
          in: "path",
          schema: expect.objectContaining({ pattern: "^[a-z0-9-]+$" }),
        }),
      ])
    );
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}/download"].get.responses[200]
        .headers
    ).toHaveProperty("X-Checksum-SHA256");
    expect(
      document.paths["/v1/politics/uk/datasets/{datasetId}/download"].get.responses[200]
        .headers
    ).toHaveProperty("Content-Disposition");
    expect(
      document.paths["/v1/tax-industry/uk/{collection}"].get.parameters
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "gateId", in: "query" }),
      ])
    );
    for (const path of ["/v1/open-data", "/v1/open-data/rights"]) {
      expect(document.paths[path].get.responses, `${path} GET`).toHaveProperty("400");
      expect(document.paths[path].head.responses, `${path} HEAD`).toHaveProperty("400");
    }
    for (const family of ["tax-system", "tax-industry"]) {
      for (const suffix of ["", "/map", "/graph", "/manifest", "/schema", "/dictionary", "/exports"]) {
        const path = `/v1/${family}/uk${suffix}`;
        expect(document.paths[path].get.responses, `${path} GET`).toHaveProperty("400");
        expect(document.paths[path].head.responses, `${path} HEAD`).toHaveProperty("400");
      }
      for (const suffix of ["/{collection}/{id}", "/exports/{collection}/{format}"]) {
        const path = `/v1/${family}/uk${suffix}`;
        expect(document.paths[path].get.responses, `${path} GET`).toHaveProperty("400");
        expect(document.paths[path].head.responses, `${path} HEAD`).toHaveProperty("400");
      }
    }
    expect(document.components.schemas.DataDictionary.required).not.toContain("updatePolicy");
    expect(document.components.schemas.DataDictionary.required).not.toContain(
      "correctionChannel"
    );
    expect(
      document.paths["/v1/tax-system/uk/graph"].get.responses[200].content[
        "application/json"
      ].schema.properties.pipelineStages
    ).toBeDefined();
    expect(document.info.license.name).toContain("CC BY-SA 4.0");
    expect(document.components.securitySchemes.WorkspaceKey.scheme).toBe("bearer");
    expect(document.info.description).toContain("server source code uses AGPL-3.0");
    expect(
      document.components.schemas.SdltCalculatedResponse.properties.reviewReasons
    ).toMatchObject({ type: "array", maxItems: 0 });
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
    expect(await response.json()).toMatchObject({ error: "unsupported_media_type" });
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
