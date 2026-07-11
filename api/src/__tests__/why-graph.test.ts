import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { apiCors, isPublicCivicPath } from "../cors";
import { createWhyGraphRoutes } from "../routes/why-graph";
import {
  WhyGraphFrameworkSchema,
  WhyGraphSchema,
  whyGraphFramework,
  whyGraphJsonSchemaDocument,
} from "../why-graph";

function mount() {
  const app = new Hono();
  app.use("*", apiCors);
  app.route("/v1/why-graph", createWhyGraphRoutes());
  return app;
}

describe("public why-graph framework", () => {
  it("is a public civic path without admitting prefix lookalikes", () => {
    expect(isPublicCivicPath("/v1/why-graph")).toBe(true);
    expect(isPublicCivicPath("/v1/why-graph/schema")).toBe(true);
    expect(isPublicCivicPath("/openapi/why-graph.json")).toBe(true);
    expect(isPublicCivicPath("/v1/why-graph-evil")).toBe(false);
    expect(isPublicCivicPath("/openapi/why-graph.json/evil")).toBe(false);
  });

  it("publishes a strict, sessionless framework and honest first adopter", async () => {
    const response = await mount().request("/v1/why-graph");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, must-revalidate",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("link")).toContain(
      '</v1/why-graph/schema>; rel="describedby"',
    );
    const body = await response.json();
    expect(body).toEqual(whyGraphFramework);
    expect(() => WhyGraphFrameworkSchema.parse(body)).not.toThrow();
    expect(body.adoption).toMatchObject({
      endpoint: "/v1/uk/tax-expert/mtd-income-tax/assessments",
      responsePath: "/reasoning/whyGraph",
      capabilityVersion: "2026-07-11.5",
    });
    expect(body.boundaries.join(" ")).toMatch(/not an HMRC/i);
    expect(body.boundaries.join(" ")).toMatch(/no ingestion/i);
    expect(body.recordReferences).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "response-record", meaning: expect.stringMatching(/array position/i) }),
      expect.objectContaining({ kind: "dataset-record", meaning: expect.stringMatching(/remains canonical/i) }),
    ]));
    expect(body.representation).toMatchObject({
      current: "bounded-typed-json-adjacency",
      futureProjection: expect.stringMatching(/JSON-LD.*RDF/i),
    });
    expect(body.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        relation: "responsibility-held-by",
        meaning: expect.stringMatching(/duty legally rests/i),
      }),
      expect.objectContaining({
        relation: "performed-by",
        meaning: expect.stringMatching(/carries out/i),
      }),
    ]));
  });

  it("publishes structural JSON Schema without presenting it as semantic proof", async () => {
    const response = await mount().request("/v1/why-graph/schema");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain(
      "application/schema+json",
    );
    const body = await response.json();
    expect(body).toEqual(whyGraphJsonSchemaDocument);
    expect(body.$id).toBe("https://api.taxsorted.io/v1/why-graph/schema");
    expect(body["x-taxsorted-validation-scope"]).toBe(
      "structural-shape-only",
    );
    expect(body.additionalProperties).toBe(false);
    expect(body.properties.nodes.maxItems).toBe(250);
    expect(body.properties.edges.maxItems).toBe(1000);
  });

  it("supports HEAD, conditional GET and wildcard read CORS", async () => {
    const app = mount();
    const first = await app.request("/v1/why-graph");
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();

    const head = await app.request("/v1/why-graph", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("etag")).toBe(etag);
    expect(await head.text()).toBe("");

    const unchanged = await app.request("/v1/why-graph", {
      headers: { "If-None-Match": etag! },
    });
    expect(unchanged.status).toBe(304);

    const preflight = await app.request("/v1/why-graph/schema", {
      method: "OPTIONS",
      headers: {
        Origin: "https://builder.example",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-methods")).toContain("GET");
    expect(preflight.headers.get("access-control-allow-methods")).not.toContain("POST");
  });

  it("rejects query parameters and writes without creating graph state", async () => {
    const app = mount();
    const query = await app.request("/v1/why-graph?case=private-value");
    expect(query.status).toBe(400);
    const queryBody = await query.json();
    expect(queryBody).toMatchObject({
      error: "unknown_query_parameter",
      instance: "/v1/why-graph",
      graphCreated: false,
      externalStateChanged: false,
    });
    expect(JSON.stringify(queryBody)).not.toContain("private-value");

    const write = await app.request("/v1/why-graph", { method: "POST" });
    expect(write.status).toBe(405);
    expect(write.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(write.headers.get("cache-control")).toBe("no-store");
    expect(await write.json()).toMatchObject({
      error: "method_not_allowed",
      graphCreated: false,
      externalStateChanged: false,
    });
  });

  it("keeps the exported graph schema strict at every shared object boundary", () => {
    const minimal = {
      schema: "taxsorted.why-graph/1",
      rootNodeId: "conclusion:test",
      context: {
        subject: { id: "test", type: "explanation", version: "1" },
        jurisdiction: "Test",
        effectiveDate: null,
        evaluatedOn: "2026-07-11",
        knowledgeAsOf: "2026-07-11",
        authority: "taxsorted-analysis",
        effect: "advisory",
        externalStateChange: false,
      },
      valueHandling: {
        factValues: "case-financial-and-identity-fact-values-not-copied-into-graph",
        nodeIds: "semantic-identifiers-without-fact-values-or-array-positions",
      },
      ordering: {
        nodes: "id-ascii-ascending",
        edges: "id-ascii-ascending",
        setValues: "unique-ascii-ascending",
      },
      nodes: [{
        id: "conclusion:test",
        kind: "conclusion",
        label: "Test",
        description: "Test conclusion.",
        state: "decisive",
        record: null,
      }],
      edges: [],
      coverage: {
        scope: "Structural test.",
        completeWithinDeclaredScope: false,
        gapNodeIds: [],
        boundaries: [],
      },
    };
    expect(WhyGraphSchema.safeParse(minimal).success).toBe(true);
    expect(WhyGraphSchema.safeParse({ ...minimal, surprise: true }).success).toBe(false);
    expect(WhyGraphSchema.safeParse({
      ...minimal,
      nodes: [{ ...minimal.nodes[0], surprise: true }],
    }).success).toBe(false);
  });
});
