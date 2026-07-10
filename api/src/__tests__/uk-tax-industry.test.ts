import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { createUkTaxIndustryRoutes } from "../routes/uk-tax-industry.js";
import {
  ukTaxIndustry,
  ukTaxIndustrySchema,
  validateUkTaxIndustryGraph,
  type UkTaxIndustry,
} from "../uk-tax-industry.js";

function mount(publicDataEnabled: boolean | "route-default" = true) {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/tax-industry/uk",
    publicDataEnabled === "route-default"
      ? createUkTaxIndustryRoutes({ corpus: ukTaxIndustry })
      : createUkTaxIndustryRoutes({ corpus: ukTaxIndustry, publicDataEnabled })
  );
  // Mirrors index.ts: public reference data must finish before any taxpayer
  // identity middleware can create a cookie or session row.
  app.use("/v1/*", async (c, next) => {
    sessionCalls++;
    c.header("Set-Cookie", "ts_session=should-not-exist; HttpOnly");
    await next();
  });
  app.get("/v1/private-probe", (c) => c.json({ ok: true }));
  return { app, sessionCalls: () => sessionCalls };
}

describe("UK tax-industry corpus integrity", () => {
  it("loads every declared layer from one reviewed snapshot", () => {
    expect(ukTaxIndustry.meta.reviewedOn).toBe("2026-07-10");
    expect(ukTaxIndustry.sources.length).toBeGreaterThanOrEqual(50);
    expect(ukTaxIndustry.institutions.length).toBeGreaterThanOrEqual(10);
    for (const collection of [
      ukTaxIndustry.roles,
      ukTaxIndustry.qualifications,
      ukTaxIndustry.gates,
      ukTaxIndustry.pathways,
      ukTaxIndustry.studyResources,
      ukTaxIndustry.compensation,
      ukTaxIndustry.barriers,
      ukTaxIndustry.transparencyGaps,
    ]) {
      expect(collection.length).toBeGreaterThan(0);
    }
  });

  it("rejects a dangling gate and a broken field-evidence pointer", () => {
    const dangling = structuredClone(ukTaxIndustry) as UkTaxIndustry;
    dangling.roles[0].requiredGateIds.push("gate-does-not-exist");
    expect(() => validateUkTaxIndustryGraph(dangling)).toThrow(
      /unknown gate: gate-does-not-exist/
    );

    const pointer = structuredClone(ukTaxIndustry) as UkTaxIndustry;
    pointer.institutions[0].evidence[0].fields = ["/field-that-does-not-exist"];
    expect(() => validateUkTaxIndustryGraph(pointer)).toThrow(
      /evidence points to a missing field/
    );
  });

  it("rejects malformed dates, unsafe URLs, unknown fields and ambiguous money", () => {
    const badDate = structuredClone(ukTaxIndustry) as unknown as Record<string, any>;
    badDate.sources[0].reviewedOn = "2026-02-31";
    expect(() => ukTaxIndustrySchema.parse(badDate)).toThrow(/invalid calendar date/);

    const badUrl = structuredClone(ukTaxIndustry) as unknown as Record<string, any>;
    badUrl.institutions[0].website = "javascript:alert(1)";
    expect(() => ukTaxIndustrySchema.parse(badUrl)).toThrow(/URL must use HTTPS/);

    const unknown = structuredClone(ukTaxIndustry) as unknown as Record<string, any>;
    unknown.meta.reviewdOn = unknown.meta.reviewedOn;
    expect(() => ukTaxIndustrySchema.parse(unknown)).toThrow(/Unrecognized key/);

    const ambiguous = structuredClone(ukTaxIndustry) as unknown as Record<string, any>;
    const fee = ambiguous.qualifications.find(
      (qualification: { feeItems: unknown[] }) => qualification.feeItems.length > 0
    ).feeItems[0];
    fee.rangeGbp = { low: 1, high: 2 };
    expect(() => ukTaxIndustrySchema.parse(ambiguous)).toThrow(/exactly one/);
  });

  it("rejects one-sided edges, overlapping gate status and non-contiguous steps", () => {
    const edge = structuredClone(ukTaxIndustry) as UkTaxIndustry;
    edge.roles[0].pathwayIds = [];
    expect(() => validateUkTaxIndustryGraph(edge)).toThrow(/reciprocal pathway edge/);

    const overlap = structuredClone(ukTaxIndustry) as UkTaxIndustry;
    overlap.roles[0].conditionalGateIds.push(overlap.roles[0].requiredGateIds[0]);
    expect(() => validateUkTaxIndustryGraph(overlap)).toThrow(/required and conditional/);

    const order = structuredClone(ukTaxIndustry) as UkTaxIndustry;
    order.pathways[0].steps[0].order = 2;
    expect(() => validateUkTaxIndustryGraph(order)).toThrow(/contiguous order/);

    const selfEvidence = structuredClone(ukTaxIndustry) as UkTaxIndustry;
    selfEvidence.institutions[0].evidence[0].fields = ["/sourceIds"];
    expect(() => validateUkTaxIndustryGraph(selfEvidence)).toThrow(
      /cannot cite provenance metadata/
    );
  });

  it("keeps law, professional status and market convention machine-distinct", () => {
    expect(new Set(ukTaxIndustry.gates.map((gate) => gate.legalStatus))).toEqual(
      new Set(["mandatory", "conditional", "voluntary-market-gate"])
    );
    expect(
      ukTaxIndustry.qualifications.some(
        (qualification) => qualification.status === "voluntary-designation"
      )
    ).toBe(true);
    expect(
      ukTaxIndustry.barriers.some((barrier) => barrier.type === "employer-convention")
    ).toBe(true);
  });
});

describe("public UK tax-industry API", () => {
  it("uses an exact wildcard-CORS boundary", () => {
    expect(isPublicCivicPath("/v1/tax-industry/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/tax-industry/uk/roles")).toBe(true);
    expect(isPublicCivicPath("/v1/tax-industry/uk-evil")).toBe(false);
  });

  it("is cacheable and sessionless even when a browser cookie is supplied", async () => {
    const { app, sessionCalls } = mount();
    const response = await app.request("/v1/tax-industry/uk", {
      headers: {
        Origin: "https://law-stack.example",
        Cookie: "ts_session=existing-browser-cookie",
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("public, max-age=300, must-revalidate");
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(response.headers.get("access-control-expose-headers")).toContain("ETag");
    expect(sessionCalls()).toBe(0);
    expect(body.manifest.datasetHash).toMatch(/^sha256:/);
    expect(body.routes.fullGraph).toBe("/v1/tax-industry/uk/graph");
    expect(body.related.collectionAndEnforcementPipeline).toBe("/v1/tax-system/uk");

    const preflight = await app.request("/v1/tax-industry/uk/roles", {
      method: "OPTIONS",
      headers: {
        Origin: "https://law-stack.example",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "If-None-Match",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-headers")).toContain("If-None-Match");
  });

  it("filters roles, resolves joined detail and rejects unsupported filters", async () => {
    const { app } = mount();
    const role = ukTaxIndustry.roles[0];
    const list = await app.request(
      `/v1/tax-industry/uk/roles?category=${encodeURIComponent(role.category)}`
    );
    const listBody = await list.json();
    expect(list.status).toBe(200);
    expect(listBody.data.length).toBeGreaterThan(0);
    expect(
      listBody.data.every((item: { category: string }) => item.category === role.category)
    ).toBe(true);

    const detail = await app.request(`/v1/tax-industry/uk/roles/${role.id}`);
    const detailBody = await detail.json();
    expect(detail.status).toBe(200);
    expect(detailBody.data.id).toBe(role.id);
    expect(detailBody.evidence.length).toBeGreaterThan(0);
    expect(detailBody).toMatchObject({
      gates: expect.any(Array),
      qualifications: expect.any(Array),
      pathways: expect.any(Array),
      compensation: expect.any(Array),
    });

    const invalid = await app.request("/v1/tax-industry/uk/roles?catgory=tax-advice");
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: "unknown_filter",
      filters: ["catgory"],
    });
    expect(invalid.headers.get("cache-control")).toBe("no-store");

    const irrelevant = await app.request(
      "/v1/tax-industry/uk/institutions?category=tax-advice"
    );
    expect(irrelevant.status).toBe(400);
    expect(await irrelevant.json()).toEqual({
      error: "unknown_filter",
      filters: ["category"],
    });

    const falseOwnId = await app.request(
      `/v1/tax-industry/uk/roles?qualificationId=${encodeURIComponent(role.id)}`
    );
    expect(falseOwnId.status).toBe(400);
    expect(await falseOwnId.json()).toMatchObject({
      error: "invalid_filter",
      filter: "qualificationId",
      value: role.id,
    });

    const repeated = await app.request(
      "/v1/tax-industry/uk/roles?category=tax-advice&category=tax-compliance"
    );
    expect(repeated.status).toBe(400);
    expect(await repeated.json()).toEqual({
      error: "repeated_filter",
      filters: ["category"],
    });

    const validButUnobserved = await app.request(
      "/v1/tax-industry/uk/qualifications?status=apprenticeship-standard"
    );
    expect(validButUnobserved.status).toBe(200);
    expect(await validButUnobserved.json()).toMatchObject({
      data: [],
      page: { total: 0 },
      filters: { status: "apprenticeship-standard" },
    });

    const invalidEnum = await app.request(
      "/v1/tax-industry/uk/qualifications?status=not-a-real-status"
    );
    expect(invalidEnum.status).toBe(400);
    expect(await invalidEnum.json()).toMatchObject({ error: "invalid_filter" });
  });

  it("filters nested pathway steps and only returns matching records", async () => {
    const { app } = mount();
    for (const key of ["gateId", "qualificationId"] as const) {
      const pathway = ukTaxIndustry.pathways.find((candidate) =>
        candidate.steps.some((step) => step[key] !== undefined)
      );
      expect(pathway, key).toBeDefined();
      const value = pathway!.steps.find((step) => step[key] !== undefined)![key]!;
      const response = await app.request(
        `/v1/tax-industry/uk/pathways?${key}=${encodeURIComponent(value)}`
      );
      const body = await response.json();
      expect(response.status, key).toBe(200);
      expect(body.data.map((item: { id: string }) => item.id)).toContain(pathway!.id);
      expect(
        body.data.every((item: { steps: Array<Record<string, string>> }) =>
          item.steps.some((step) => step[key] === value)
        )
      ).toBe(true);
    }
  });

  it("does not infer an institution-to-role relationship through qualifications", async () => {
    const { app } = mount();
    const institution = ukTaxIndustry.institutions[0];
    const response = await app.request(
      `/v1/tax-industry/uk/institutions/${institution.id}`
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty("roles");
    expect(
      body.qualifications.every((qualification: { awardingInstitutionIds: string[] }) =>
        qualification.awardingInstitutionIds.includes(institution.id)
      )
    ).toBe(true);
    expect(
      body.gates.every((gate: { controllerInstitutionIds: string[] }) =>
        gate.controllerInstitutionIds.includes(institution.id)
      )
    ).toBe(true);
  });

  it("validates a query before applying its representation-specific ETag", async () => {
    const { app } = mount();
    const manifest = await app.request("/v1/tax-industry/uk/manifest");
    const manifestEtag = manifest.headers.get("etag");
    const graph = await app.request("/v1/tax-industry/uk/graph", {
      headers: { "If-None-Match": manifestEtag! },
    });
    const graphEtag = graph.headers.get("etag");
    expect(graph.status).toBe(200);
    expect(graphEtag).toBeTruthy();
    expect(graphEtag).not.toBe(manifestEtag);
    expect((await manifest.json()).datasetHash).toBe(
      graphEtag!.replace(/^"sha256-/, "sha256:").replace(/"$/, "")
    );

    const second = await app.request("/v1/tax-industry/uk/graph", {
      headers: { "If-None-Match": graphEtag! },
    });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
    expect(second.headers.get("etag")).toBe(graphEtag);

    const weakList = await app.request("/v1/tax-industry/uk/graph", {
      headers: { "If-None-Match": `"not-this-one", W/${graphEtag}` },
    });
    expect(weakList.status).toBe(304);

    const wildcard = await app.request("/v1/tax-industry/uk/graph", {
      headers: { "If-None-Match": "*" },
    });
    expect(wildcard.status).toBe(304);

    const missing = await app.request(
      "/v1/tax-industry/uk/roles/role-not-real",
      { headers: { "If-None-Match": graphEtag! } }
    );
    expect(missing.status).toBe(404);

    const roles = await app.request("/v1/tax-industry/uk/roles");
    const invalid = await app.request("/v1/tax-industry/uk/roles?catgory=tax-advice", {
      headers: { "If-None-Match": roles.headers.get("etag")! },
    });
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("cache-control")).toBe("no-store");
  });

  it("publishes schema, a plain dictionary and complete multi-format exports", async () => {
    const { app, sessionCalls } = mount();
    const schema = await app.request("/v1/tax-industry/uk/schema");
    const schemaBody = await schema.json();
    expect(schema.status).toBe(200);
    expect(schema.headers.get("content-type")).toContain("application/schema+json");
    expect(schemaBody.properties.qualifications.items.properties.assessments).toBeDefined();

    const dictionary = await app.request("/v1/tax-industry/uk/dictionary");
    const dictionaryBody = await dictionary.json();
    const study = dictionaryBody.collections.find(
      (collection: { pathName: string }) => collection.pathName === "study"
    );
    expect(study).toMatchObject({ corpusKey: "studyResources", identityField: "id" });
    expect(study.references.qualificationIds).toBe("qualifications");
    expect(study.fields.find((field: { name: string }) => field.name === "id")).toMatchObject({
      type: "string",
      required: true,
      nullable: false,
      meaning: expect.stringMatching(/stable identity/i),
    });
    expect(study.fields.map((field: { name: string }) => field.name)).toEqual(
      expect.arrayContaining(Object.keys(ukTaxIndustry.studyResources[0]))
    );
    expect(dictionaryBody.conventions.idStability).toMatch(/not yet available/);

    const index = await app.request("/v1/tax-industry/uk/exports");
    const indexBody = await index.json();
    const roles = indexBody.collections.find(
      (collection: { pathName: string }) => collection.pathName === "roles"
    );
    expect(roles.available).toBe(true);
    expect(roles.count).toBe(ukTaxIndustry.roles.length);
    expect(roles.formats.ndjson.etag).toMatch(/^"sha256-/);

    const json = await app.request("/v1/tax-industry/uk/exports/roles/json");
    const ndjson = await app.request("/v1/tax-industry/uk/exports/roles/ndjson");
    const csv = await app.request("/v1/tax-industry/uk/exports/roles/csv", {
      headers: { Origin: "https://law-stack.example" },
    });
    expect((await json.json()).length).toBe(ukTaxIndustry.roles.length);
    const ndjsonRows = (await ndjson.text())
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(ndjsonRows).toHaveLength(ukTaxIndustry.roles.length);
    expect((await csv.text()).split("\r\n")[0]).toContain("id");
    expect(csv.headers.get("content-disposition")).toContain("taxsorted-uk-tax-industry-roles");
    expect(csv.headers.get("link")).toContain('rel="alternate"');
    expect(csv.headers.get("link")).toContain('rel="license"');
    expect(csv.headers.get("access-control-expose-headers")).toContain("Content-Disposition");
    expect(json.headers.get("etag")).not.toBe(ndjson.headers.get("etag"));
    expect(ndjson.headers.get("etag")).not.toBe(csv.headers.get("etag"));
    expect(json.headers.get("etag")).toBe(roles.formats.json.etag);
    expect(ndjson.headers.get("etag")).toBe(roles.formats.ndjson.etag);
    expect(csv.headers.get("etag")).toBe(roles.formats.csv.etag);

    const unchanged = await app.request("/v1/tax-industry/uk/exports/roles/ndjson", {
      headers: { "If-None-Match": ndjson.headers.get("etag")! },
    });
    expect(unchanged.status).toBe(304);

    const head = await app.request("/v1/tax-industry/uk/exports/roles/csv", {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("content-disposition")).toBe(csv.headers.get("content-disposition"));

    const unsupported = await app.request("/v1/tax-industry/uk/exports/roles/xml");
    expect(unsupported.status).toBe(404);
    expect(unsupported.headers.get("cache-control")).toBe("no-store");
    expect(sessionCalls()).toBe(0);
  });

  it("keeps every advertised export link, count and exact-byte ETag true", async () => {
    const { app } = mount();
    const indexResponse = await app.request("/v1/tax-industry/uk/exports");
    const index = await indexResponse.json();

    for (const collection of index.collections as Array<{
      pathName: string;
      count: number;
      csvColumns: string[];
      formats: Record<string, { href: string; etag: string }>;
    }>) {
      for (const format of ["json", "ndjson", "csv"] as const) {
        const advertised = collection.formats[format];
        const response = await app.request(advertised.href);
        expect(response.status, `${collection.pathName}/${format}`).toBe(200);
        expect(response.headers.get("etag"), `${collection.pathName}/${format}`).toBe(
          advertised.etag
        );
        if (format === "json") {
          expect((await response.json()).length, collection.pathName).toBe(collection.count);
        } else if (format === "ndjson") {
          const text = await response.text();
          const rows = text === "" ? [] : text.trimEnd().split("\n");
          expect(rows.length, collection.pathName).toBe(collection.count);
          rows.forEach((row) => expect(() => JSON.parse(row)).not.toThrow());
        } else {
          expect((await response.text()).split("\r\n", 1)[0], collection.pathName).toBe(
            collection.csvColumns.join(",")
          );
        }
      }
    }
  });

  it("rejects meaningless query parameters on static resources", async () => {
    const { app } = mount();
    for (const path of [
      "graph?ignored=true",
      "map?ignored=true",
      "manifest?ignored=true",
      "schema?ignored=true",
      "dictionary?ignored=true",
      "exports?ignored=true",
      "exports/roles/csv?category=tax-advice",
    ]) {
      const response = await app.request(`/v1/tax-industry/uk/${path}`);
      expect(response.status, path).toBe(400);
      expect(response.headers.get("cache-control"), path).toBe("no-store");
      expect(await response.json(), path).toMatchObject({
        error: "unknown_query_parameter",
      });
    }
    const overview = await app.request("/v1/tax-industry/uk?ignored=true");
    expect(overview.status).toBe(400);
    expect(overview.headers.get("cache-control")).toBe("no-store");
    const map = await app.request("/v1/tax-industry/uk/map");
    expect(map.status).toBe(308);
    expect(map.headers.get("location")).toBe("/v1/tax-industry/uk");
    expect(map.headers.get("link")).toContain(
      '</v1/tax-industry/uk>; rel="canonical"'
    );
    expect(map.headers.get("link")).not.toContain(
      '</v1/tax-industry/uk/map>; rel="canonical"'
    );
    const detailUrl = `/v1/tax-industry/uk/roles/${ukTaxIndustry.roles[0].id}?ignored=true`;
    for (const method of ["GET", "HEAD"]) {
      const detail = await app.request(detailUrl, { method });
      expect(detail.status, method).toBe(400);
      expect(detail.headers.get("cache-control"), method).toBe("no-store");
    }
  });

  it("owns an immutable release snapshot after route creation", async () => {
    const corpus = structuredClone(ukTaxIndustry);
    const expectedRoles = corpus.roles.length;
    const app = new Hono();
    app.route(
      "/v1/tax-industry/uk",
      createUkTaxIndustryRoutes({ corpus, publicDataEnabled: true })
    );
    corpus.roles.length = 0;

    const overview = await (await app.request("/v1/tax-industry/uk")).json();
    const graph = await (await app.request("/v1/tax-industry/uk/graph")).json();
    expect(overview.counts.roles).toBe(expectedRoles);
    expect(graph.roles).toHaveLength(expectedRoles);
  });

  it("closes by default without revealing which protected item IDs exist", async () => {
    const defaultRoute = mount("route-default");
    expect((await defaultRoute.app.request("/v1/tax-industry/uk/graph")).status).toBe(503);

    const { app, sessionCalls } = mount(false);
    for (const path of ["sources", "gaps", "manifest", "schema", "dictionary", "exports"]) {
      const response = await app.request(`/v1/tax-industry/uk/${path}`);
      expect(response.status, path).toBe(200);
    }

    expect((await app.request("/v1/tax-industry/uk/exports/sources/csv")).status).toBe(200);
    expect((await app.request("/v1/tax-industry/uk/exports/roles/csv")).status).toBe(503);

    const graph = await app.request("/v1/tax-industry/uk/graph");
    expect(graph.status).toBe(503);
    expect(graph.headers.get("cache-control")).toBe("no-store");
    expect((await graph.json()).error).toBe("publication_review_pending");

    const existing = await app.request(
      `/v1/tax-industry/uk/roles/${ukTaxIndustry.roles[0].id}`
    );
    const missing = await app.request("/v1/tax-industry/uk/roles/role-not-real");
    expect(existing.status).toBe(503);
    expect(missing.status).toBe(503);
    expect(await missing.json()).toMatchObject({ error: "publication_review_pending" });

    const unknown = await app.request("/v1/tax-industry/uk/not-a-route");
    expect(unknown.status).toBe(404);
    expect(sessionCalls()).toBe(0);
  });
});
