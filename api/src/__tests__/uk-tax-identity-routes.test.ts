import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { apiCors, isPublicCivicPath } from "../cors.js";
import {
  createUkTaxIdentityRoutes,
  taxIdentityBasePath,
  taxIdentityOpenApiPath,
  taxIdentitySchemaPath,
  ukTaxIdentityRights,
} from "../routes/uk-tax-identity.js";
import {
  taxIdentityInterpretationSchema,
  ukTaxIdentity,
  ukTaxIdentityExampleDetailSchema,
  ukTaxIdentityJsonSchemaDocument,
  ukTaxIdentityOverviewSchema,
} from "../uk-tax-identity.js";

function mount(options: { emergencyStop?: boolean } = {}) {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    taxIdentityBasePath,
    createUkTaxIdentityRoutes({
      emergencyStop: options.emergencyStop,
    }),
  );
  // Mirrors index.ts: a public corpus route must finish before browser
  // identity can create a cookie or session row.
  app.use("/v1/*", async (c, next) => {
    sessionCalls++;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    await next();
  });
  app.get("/v1/private-probe", (c) => c.json({ ok: true }));
  return { app, sessionCalls: () => sessionCalls };
}

describe("public UK tax-identity API", () => {
  it("is an exact, public and sessionless read doorway", async () => {
    expect(isPublicCivicPath(taxIdentityBasePath)).toBe(true);
    expect(isPublicCivicPath(`${taxIdentityBasePath}/examples`)).toBe(
      true,
    );
    expect(isPublicCivicPath(taxIdentitySchemaPath)).toBe(true);
    expect(isPublicCivicPath(taxIdentityOpenApiPath)).toBe(true);
    expect(isPublicCivicPath(`${taxIdentityBasePath}-evil`)).toBe(false);
    expect(isPublicCivicPath(`${taxIdentityOpenApiPath}/evil`)).toBe(
      false,
    );

    const { app, sessionCalls } = mount();
    const response = await app.request(taxIdentityBasePath, {
      headers: {
        Origin: "https://builder.example",
        Cookie: "ts_session=existing-browser-cookie",
      },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(
      response.headers.get("access-control-allow-credentials"),
    ).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(sessionCalls()).toBe(0);

    const body = await response.json();
    expect(() => ukTaxIdentityOverviewSchema.parse(body)).not.toThrow();
    expect(body).toMatchObject({
      schema: "taxsorted.uk.tax-identity-overview/1",
      framework: "uk-tax-identity-framework",
      version: ukTaxIdentity.meta.version,
      access: {
        authentication: "none",
        methods: ["GET", "HEAD"],
        writeMethods: false,
        personalFactsAccepted: false,
        externalStateChanged: false,
      },
      counts: {
        sources: ukTaxIdentity.sources.length,
        dimensions: ukTaxIdentity.dimensions.length,
        archetypes: ukTaxIdentity.archetypes.length,
        overlaps: ukTaxIdentity.overlaps.length,
        milestones: ukTaxIdentity.milestones.length,
        exampleProfiles: ukTaxIdentity.exampleProfiles.length,
        gaps: ukTaxIdentity.gaps.length,
      },
      routes: {
        graph: `${taxIdentityBasePath}/graph`,
        examples: `${taxIdentityBasePath}/examples`,
        exampleTemplate: `${taxIdentityBasePath}/examples/{exampleId}`,
        schema: taxIdentitySchemaPath,
        openApi: taxIdentityOpenApiPath,
      },
    });
    expect(body.routes).not.toHaveProperty("interpret");
    expect(body.routes).not.toHaveProperty("submit");
  });

  it("serves the full graph, each named collection, schema and rights", async () => {
    const { app } = mount();
    const expectations = [
      [
        "/dimensions",
        "dimensions",
        "dimensions",
        ukTaxIdentity.dimensions.length,
      ],
      [
        "/archetypes",
        "archetypes",
        "archetypes",
        ukTaxIdentity.archetypes.length,
      ],
      [
        "/overlaps",
        "overlaps",
        "overlaps",
        ukTaxIdentity.overlaps.length,
      ],
      [
        "/timeline",
        "milestones",
        "milestones",
        ukTaxIdentity.milestones.length,
      ],
      [
        "/examples",
        "exampleProfiles",
        "exampleProfiles",
        ukTaxIdentity.exampleProfiles.length,
      ],
      ["/sources", "sources", "sources", ukTaxIdentity.sources.length],
      ["/gaps", "gaps", "gaps", ukTaxIdentity.gaps.length],
    ] as const;

    const graphResponse = await app.request(
      `${taxIdentityBasePath}/graph`,
    );
    expect(graphResponse.status).toBe(200);
    expect(graphResponse.headers.get("x-schema-version")).toBe(
      ukTaxIdentity.schema,
    );
    expect(graphResponse.headers.get("content-location")).toBe(
      `${taxIdentityBasePath}/graph`,
    );
    expect(graphResponse.headers.get("link")).toContain(
      `<${taxIdentitySchemaPath}>; rel="describedby"`,
    );
    expect(await graphResponse.json()).toEqual(ukTaxIdentity);

    for (const [suffix, collection, recordsKey, count] of expectations) {
      const response = await app.request(`${taxIdentityBasePath}${suffix}`);
      const body = await response.json();
      expect(response.status, suffix).toBe(200);
      expect(response.headers.get("content-language"), suffix).toBe(
        "en-GB",
      );
      expect(response.headers.get("content-location"), suffix).toBe(
        `${taxIdentityBasePath}${suffix}`,
      );
      expect(response.headers.get("x-corpus-version"), suffix).toBe(
        ukTaxIdentity.meta.version,
      );
      expect(response.headers.get("x-corpus-reviewed-on"), suffix).toBe(
        ukTaxIdentity.meta.reviewedOn,
      );
      expect(response.headers.get("x-schema-version"), suffix).toBe(
        "taxsorted.uk.tax-identity-collection/1",
      );
      expect(body, suffix).toMatchObject({
        schema: "taxsorted.uk.tax-identity-collection/1",
        corpusVersion: ukTaxIdentity.meta.version,
        collection,
        count,
      });
      expect(body[recordsKey], suffix).toHaveLength(count);
    }

    const schemaResponse = await app.request(taxIdentitySchemaPath);
    expect(schemaResponse.status).toBe(200);
    expect(schemaResponse.headers.get("content-type")).toContain(
      "application/schema+json",
    );
    expect(await schemaResponse.json()).toEqual(
      ukTaxIdentityJsonSchemaDocument,
    );

    const rightsResponse = await app.request(
      `${taxIdentityBasePath}/rights`,
    );
    expect(rightsResponse.status).toBe(200);
    expect(await rightsResponse.json()).toEqual(ukTaxIdentityRights);
    expect(ukTaxIdentityRights.corrections.safety).toMatch(
      /Do not post names, tax identifiers, addresses/i,
    );
  });

  it("returns a deterministic interpretation for every synthetic example", async () => {
    const { app, sessionCalls } = mount();
    const listResponse = await app.request(
      `${taxIdentityBasePath}/examples`,
    );
    const list = await listResponse.json();
    expect(list).toHaveProperty("exampleProfiles");
    expect(list).not.toHaveProperty("examples");

    for (const profile of list.exampleProfiles as Array<{ id: string }>) {
      const href = `${taxIdentityBasePath}/examples/${profile.id}`;
      const firstResponse = await app.request(href, {
        headers: {
          Origin: "https://builder.example",
          Cookie: "ts_session=existing-browser-cookie",
        },
      });
      const secondResponse = await app.request(href);
      const first = await firstResponse.json();
      const second = await secondResponse.json();
      expect(firstResponse.status, profile.id).toBe(200);
      expect(firstResponse.headers.get("set-cookie"), profile.id).toBeNull();
      expect(firstResponse.headers.get("content-location"), profile.id).toBe(
        href,
      );
      expect(firstResponse.headers.get("x-schema-version"), profile.id).toBe(
        "taxsorted.uk.tax-identity-example-detail/1",
      );
      expect(firstResponse.headers.get("etag"), profile.id).toBe(
        secondResponse.headers.get("etag"),
      );
      expect(first, profile.id).toEqual(second);
      expect(() =>
        ukTaxIdentityExampleDetailSchema.parse(first),
      ).not.toThrow();
      expect(() =>
        taxIdentityInterpretationSchema.parse(first.interpretation),
      ).not.toThrow();
      expect(first.exampleProfile.id).toBe(profile.id);
      expect(first.interpretation.identityVector).toHaveLength(
        ukTaxIdentity.dimensions.length,
      );
      expect(first.interpretation.boundary).toEqual({
        syntheticExample: true,
        personalFactsAccepted: false,
        legalAdvice: false,
        filingOrSubmission: false,
        singleLabelSufficient: false,
      });
      const resolvedSourceIds = first.sources.map(
        (source: { id: string }) => source.id,
      );
      expect(resolvedSourceIds).toEqual(
        ukTaxIdentity.sources
          .filter((source) =>
            first.interpretation.sourceIds.includes(source.id),
          )
          .map((source) => source.id),
      );
    }
    expect(sessionCalls()).toBe(0);
  });

  it("supports HEAD, conditional GET and read-only preflight", async () => {
    const { app } = mount();
    for (const path of [
      taxIdentityBasePath,
      `${taxIdentityBasePath}/graph`,
      `${taxIdentityBasePath}/examples/example-trading-llp`,
    ]) {
      const get = await app.request(path);
      const etag = get.headers.get("etag");
      expect(get.status, path).toBe(200);
      expect(etag, path).toMatch(/^"sha256-/);
      expect(get.headers.get("cache-control"), path).toBe(
        "public, max-age=300, must-revalidate",
      );

      const head = await app.request(path, { method: "HEAD" });
      expect(head.status, path).toBe(200);
      expect(head.headers.get("etag"), path).toBe(etag);
      expect(await head.text(), path).toBe("");

      const unchanged = await app.request(path, {
        headers: {
          "If-None-Match": `"not-current", W/${etag}`,
        },
      });
      expect(unchanged.status, path).toBe(304);
      expect(unchanged.headers.get("etag"), path).toBe(etag);
      expect(await unchanged.text(), path).toBe("");
    }

    const preflight = await app.request(
      `${taxIdentityBasePath}/examples`,
      {
        method: "OPTIONS",
        headers: {
          Origin: "https://builder.example",
          "Access-Control-Request-Method": "GET",
        },
      },
    );
    expect(preflight.status).toBe(204);
    expect(
      preflight.headers.get("access-control-allow-methods"),
    ).toContain("GET");
    expect(
      preflight.headers.get("access-control-allow-methods"),
    ).not.toContain("POST");
  });

  it("rejects query strings, writes and missing examples without intake", async () => {
    const { app, sessionCalls } = mount();
    const queried = await app.request(
      `${taxIdentityBasePath}/examples/example-trading-llp?subject=private-value&taxYear=2026`,
    );
    expect(queried.status).toBe(400);
    expect(queried.headers.get("cache-control")).toBe("no-store");
    const queryProblem = await queried.json();
    expect(queryProblem).toMatchObject({
      error: "unknown_query_parameter",
      parameters: ["subject", "taxYear"],
      personalFactsAccepted: false,
      externalStateChanged: false,
    });
    expect(JSON.stringify(queryProblem)).not.toContain("private-value");

    const write = await app.request(
      `${taxIdentityBasePath}/examples/example-trading-llp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "must not be read" }),
      },
    );
    expect(write.status).toBe(405);
    expect(write.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(write.headers.get("cache-control")).toBe("no-store");
    expect(await write.json()).toMatchObject({
      error: "method_not_allowed",
      personalFactsAccepted: false,
      externalStateChanged: false,
      writes: false,
    });

    const missing = await app.request(
      `${taxIdentityBasePath}/examples/not-a-reviewed-example`,
    );
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(await missing.json()).toMatchObject({
      error: "tax_identity_resource_not_found",
      personalFactsAccepted: false,
      externalStateChanged: false,
    });
    expect(sessionCalls()).toBe(0);
  });

  it("has a bounded emergency stop while keeping schema and rights readable", async () => {
    const { app, sessionCalls } = mount({ emergencyStop: true });

    for (const path of [
      taxIdentityBasePath,
      `${taxIdentityBasePath}/graph`,
      `${taxIdentityBasePath}/examples/example-trading-llp`,
    ]) {
      const response = await app.request(path);
      expect(response.status, path).toBe(503);
      expect(response.headers.get("cache-control"), path).toBe("no-store");
      expect(await response.json(), path).toMatchObject({
        error: "tax_identity_emergency_stop",
        available: false,
        emergencyStop: true,
        personalFactsAccepted: false,
        externalStateChanged: false,
      });
    }

    for (const path of [
      taxIdentitySchemaPath,
      `${taxIdentityBasePath}/rights`,
    ]) {
      const response = await app.request(path);
      expect(response.status, path).toBe(200);
    }
    expect(sessionCalls()).toBe(0);
  });
});
