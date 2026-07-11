import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { createUkCharitiesRoutes } from "../routes/uk-charities.js";
import { ukCharities } from "../uk-charities.js";

function mount(
  publicDataEnabled: boolean | "route-default" = true,
  emergencyStop = false
) {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/charities/uk",
    publicDataEnabled === "route-default"
      ? createUkCharitiesRoutes({ corpus: ukCharities, emergencyStop })
      : createUkCharitiesRoutes({
          corpus: ukCharities,
          publicDataEnabled,
          emergencyStop,
        })
  );
  // Mirrors index.ts: this namespace must finish before taxpayer identity can
  // create a browser cookie or a session row.
  app.use("/v1/*", async (c, next) => {
    sessionCalls++;
    c.header("Set-Cookie", "ts_session=should-not-exist; HttpOnly");
    await next();
  });
  app.get("/v1/private-probe", (c) => c.json({ ok: true }));
  return { app, sessionCalls: () => sessionCalls };
}

describe("public UK charity-sector API", () => {
  it("has an exact public, sessionless boundary without charity-by-charity subject rows", async () => {
    expect(isPublicCivicPath("/v1/charities/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/charities/uk/regulators")).toBe(true);
    expect(isPublicCivicPath("/v1/charities/uk-evil")).toBe(false);

    const { app, sessionCalls } = mount();
    const response = await app.request("/v1/charities/uk", {
      headers: {
        Origin: "https://public-interest-stack.example",
        Cookie: "ts_session=existing-browser-cookie",
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, must-revalidate"
    );
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(sessionCalls()).toBe(0);
    expect(body.dataset).toBe("uk-charities-sector");
    expect(body.publication.status).toBe("open");
    expect(body.access).toEqual({
      authentication: "none",
      methods: ["GET", "HEAD"],
      writeMethods: false,
      agentDiscovery: "/agent.txt",
    });
    expect(body.scope).toMatchObject({
      kind: "sector-system-map",
      organisationDirectory: false,
      peopleRecords: false,
      personalReligionOrBeliefData: false,
      namedPay: false,
      automatedWordsActionsVerdict: false,
    });
    expect(body.routes).toMatchObject({
      accountability: "/v1/charities/uk/accountability",
      accountabilitySchema: "/v1/charities/uk/accountability/schema",
    });
    expect(body.counts).not.toHaveProperty("organisations");
    expect(body.counts).not.toHaveProperty("people");
    expect(body.routes.filters).not.toEqual(
      expect.arrayContaining(["name", "personId", "trusteeId", "religion", "belief"])
    );
  });

  it("supports GET, HEAD and exact representation validators", async () => {
    const { app } = mount();
    const get = await app.request("/v1/charities/uk/manifest");
    const etag = get.headers.get("etag");
    expect(get.status).toBe(200);
    expect(etag).toBeTruthy();

    const head = await app.request("/v1/charities/uk/manifest", {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(etag);

    const unchanged = await app.request("/v1/charities/uk/manifest", {
      headers: { "If-None-Match": `"not-this-one", W/${etag}` },
    });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");
    expect(unchanged.headers.get("etag")).toBe(etag);

    const graph = await app.request("/v1/charities/uk/graph");
    const manifest = await get.json();
    expect(manifest.datasetHash).toBe(
      graph.headers
        .get("etag")!
        .replace(/^"sha256-/, "sha256:")
        .replace(/"$/, "")
    );
  });

  it("publishes a schema-only words-and-actions contract without organisation rows", async () => {
    for (const { app } of [mount(), mount(false), mount(true, true)]) {
      const index = await app.request("/v1/charities/uk/accountability");
      const body = await index.json();
      expect(index.status).toBe(200);
      expect(index.headers.get("cache-control")).toBe(
        "public, max-age=300, must-revalidate"
      );
      expect(index.headers.get("set-cookie")).toBeNull();
      expect(index.headers.get("link")).toContain(
        '</v1/charities/uk/accountability/schema>; rel="related"; type="application/schema+json"; title="Candidate dataset schema"'
      );
      expect(index.headers.get("link")).not.toContain(
        '</v1/charities/uk/schema>; rel="describedby"'
      );
      expect(body).toMatchObject({
        id: "uk-charity-accountability",
        status: "schema-only-not-admitted",
        publicationBlockers: [
          { id: "confidential-correction-safety-intake", status: "blocking" },
          { id: "asset-level-rights-admission-digest", status: "blocking" },
        ],
        inconsistencyRule: {
          relation: "inconsistent-with",
          requirements: expect.arrayContaining([
            "human-approved review",
            "exact published organisation identifier",
            "same organisation",
            "same period",
            "same scope key and scope definition",
            "same metric key and metric definition",
          ]),
        },
      });
      expect(body.admissionConditions).toHaveLength(9);
      expect(body.admissionConditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "formal-dpia-decision" }),
          expect.objectContaining({ id: "monitored-emergency-stop" }),
        ])
      );
      expect(body.hardBoundaries).toEqual(
        expect.arrayContaining([
          "no natural-person records or identifiers",
          "no personal belief data and no belief inference",
          "no fuzzy, probabilistic or name-only joins",
        ])
      );
      expect(body).not.toHaveProperty("organisations");

      const schema = await app.request(
        "/v1/charities/uk/accountability/schema"
      );
      const schemaBody = await schema.json();
      expect(schema.status).toBe(200);
      expect(schema.headers.get("content-type")).toContain(
        "application/schema+json"
      );
      expect(schema.headers.get("link")).toContain(
        '</v1/charities/uk/accountability>; rel="related"; type="application/json"; title="Accountability framework"'
      );
      expect(schema.headers.get("link")).not.toContain(
        '</v1/charities/uk/schema>; rel="describedby"'
      );
      expect(schemaBody.$id).toBe(
        "https://api.taxsorted.io/v1/charities/uk/accountability/schema"
      );
      expect(schemaBody.properties).toHaveProperty("organisations");
      expect(schemaBody.properties).toHaveProperty("claims");
      expect(schemaBody.properties).toHaveProperty("observations");
      expect(schemaBody.properties).toHaveProperty("comparisons");
      expect(schemaBody.properties).not.toHaveProperty("people");
      expect(schemaBody.properties).not.toHaveProperty("contacts");

      const etag = schema.headers.get("etag")!;
      const head = await app.request(
        "/v1/charities/uk/accountability/schema",
        { method: "HEAD" }
      );
      expect(head.status).toBe(200);
      expect(await head.text()).toBe("");
      expect(head.headers.get("etag")).toBe(etag);
      const unchanged = await app.request(
        "/v1/charities/uk/accountability/schema",
        { headers: { "If-None-Match": etag } }
      );
      expect(unchanged.status).toBe(304);
    }

    const invalid = await mount().app.request(
      "/v1/charities/uk/accountability?organisationId=anything"
    );
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("content-type")).toContain(
      "application/problem+json"
    );
    const invalidBody = await invalid.json();
    expect(invalidBody).toMatchObject({
      type: "https://api.taxsorted.io/problems/unknown_query_parameter",
      title: "Unknown query parameter",
      status: 400,
      detail:
        "This static representation does not accept query parameters; use a collection query for filtering.",
      reason:
        "This static representation does not accept query parameters; use a collection query for filtering.",
      instance: "/v1/charities/uk/accountability",
      schema: "taxsorted.charity-error/1",
      error: "unknown_query_parameter",
      method: "GET",
      path: "/v1/charities/uk/accountability",
      walls_intact: true,
      nextActions: expect.any(Array),
      next_actions: expect.any(Array),
    });
    expect(invalidBody.nextActions).toEqual(invalidBody.next_actions);
  });

  it("applies only meaningful exact filters and bounded paging", async () => {
    const { app } = mount();
    const regulator = ukCharities.regulators[0];
    const jurisdiction = regulator.jurisdictions[0];
    const regulators = await app.request(
      `/v1/charities/uk/regulators?jurisdiction=${encodeURIComponent(jurisdiction)}&regulatorId=${encodeURIComponent(regulator.id)}&limit=1`
    );
    const regulatorBody = await regulators.json();
    expect(regulators.status).toBe(200);
    expect(regulatorBody.data).toHaveLength(1);
    expect(regulatorBody.data[0].id).toBe(regulator.id);
    expect(regulatorBody.data[0].jurisdictions).toContain(jurisdiction);

    const funding = ukCharities.fundingMechanisms[0];
    const byFundingType = await app.request(
      `/v1/charities/uk/funding?fundingType=${encodeURIComponent(funding.category)}`
    );
    const fundingBody = await byFundingType.json();
    expect(byFundingType.status).toBe(200);
    expect(fundingBody.data.length).toBeGreaterThan(0);
    expect(
      fundingBody.data.every(
        (item: { category: string }) => item.category === funding.category
      )
    ).toBe(true);

    const disclosure = ukCharities.financeDisclosures[0];
    const byDisclosureType = await app.request(
      `/v1/charities/uk/finance?type=${encodeURIComponent(disclosure.disclosureType)}`
    );
    const disclosureBody = await byDisclosureType.json();
    expect(byDisclosureType.status).toBe(200);
    expect(
      disclosureBody.data.every(
        (item: { disclosureType: string }) =>
          item.disclosureType === disclosure.disclosureType
      )
    ).toBe(true);

    const exactSource = await app.request(
      `/v1/charities/uk/sources?sourceId=${encodeURIComponent(ukCharities.sources[0].id)}`
    );
    expect(await exactSource.json()).toMatchObject({
      data: [{ id: ukCharities.sources[0].id }],
      page: { total: 1, returned: 1 },
    });

    const search = await app.request(
      `/v1/charities/uk/regulators?q=${encodeURIComponent(regulator.id)}&offset=0&limit=100`
    );
    expect((await search.json()).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: regulator.id })])
    );

    const treatment = ukCharities.taxTreatments[0];
    const detail = await app.request(
      `/v1/charities/uk/tax-treatments/${treatment.id}`
    );
    const detailBody = await detail.json();
    expect(detail.status).toBe(200);
    expect(detailBody.data.id).toBe(treatment.id);
    expect(detailBody.evidence.map((source: { id: string }) => source.id)).toEqual(
      expect.arrayContaining(treatment.sourceIds)
    );
  });

  it("resolves a stable ID without making the caller guess its collection", async () => {
    const { app } = mount();
    const regulator = ukCharities.regulators[0];
    const resolved = await app.request(
      `/v1/charities/uk/records/${regulator.id}`
    );
    expect(resolved.status).toBe(200);
    expect(resolved.headers.get("content-location")).toBe(
      `/v1/charities/uk/records/${regulator.id}`
    );
    expect(resolved.headers.get("link")).toContain(
      `</v1/charities/uk/regulators/${regulator.id}>; rel="canonical"`
    );
    expect(await resolved.json()).toMatchObject({
      collection: "regulators",
      corpusKey: "regulators",
      canonicalUrl: `/v1/charities/uk/regulators/${regulator.id}`,
      data: { id: regulator.id },
      links: {
        self: `/v1/charities/uk/records/${regulator.id}`,
        canonical: `/v1/charities/uk/regulators/${regulator.id}`,
      },
    });

    const missing = await app.request(
      "/v1/charities/uk/records/record-not-real"
    );
    expect(missing.status).toBe(404);
    const missingBody = await missing.json();
    expect(missingBody).toMatchObject({
      type: "https://api.taxsorted.io/problems/not_found",
      status: 404,
      error: "not_found",
      nextActions: [{ href: "/v1/charities/uk" }],
      next_actions: [{ href: "/v1/charities/uk" }],
    });
    expect(missingBody.nextActions).toEqual(missingBody.next_actions);

    const queried = await app.request(
      `/v1/charities/uk/records/${regulator.id}?expand=true`
    );
    expect(queried.status).toBe(400);
    expect(await queried.json()).toMatchObject({
      error: "unknown_query_parameter",
      parameters: ["expand"],
    });
  });

  it("rejects unknown, irrelevant, repeated and invalid query values", async () => {
    const { app } = mount();
    for (const filter of [
      "name=someone",
      "personId=person-1",
      "trusteeId=trustee-1",
      "religion=anything",
      "belief=anything",
    ]) {
      const response = await app.request(`/v1/charities/uk/regulators?${filter}`);
      expect(response.status, filter).toBe(400);
      expect(response.headers.get("cache-control"), filter).toBe("no-store");
      expect(await response.json(), filter).toMatchObject({ error: "unknown_filter" });
    }

    const irrelevant = await app.request(
      "/v1/charities/uk/legal-forms?taxType=corporation-tax"
    );
    expect(irrelevant.status).toBe(400);
    expect(await irrelevant.json()).toMatchObject({
      error: "unknown_filter",
      filters: ["taxType"],
      collection: "legal-forms",
      walls_intact: true,
      next_actions: expect.any(Array),
    });

    const repeated = await app.request(
      "/v1/charities/uk/regulators?kind=charity-regulator&kind=tax-authority"
    );
    expect(repeated.status).toBe(400);
    expect(await repeated.json()).toMatchObject({
      error: "repeated_filter",
      filters: ["kind"],
      collection: "regulators",
      walls_intact: true,
      next_actions: expect.any(Array),
    });

    const badSource = await app.request(
      "/v1/charities/uk/obligations?sourceId=source-not-real"
    );
    expect(badSource.status).toBe(400);
    expect(await badSource.json()).toMatchObject({
      error: "invalid_filter",
      filter: "sourceId",
    });

    const badEnum = await app.request(
      "/v1/charities/uk/funding?fundingType=not-a-funding-type"
    );
    expect(badEnum.status).toBe(400);
    expect(await badEnum.json()).toMatchObject({
      error: "invalid_filter",
      filter: "fundingType",
    });

    const badPage = await app.request("/v1/charities/uk/sources?limit=101");
    expect(badPage.status).toBe(400);
    expect(await badPage.json()).toMatchObject({
      type: "https://api.taxsorted.io/problems/invalid_page",
      status: 400,
      error: "invalid_page",
      nextActions: expect.any(Array),
      next_actions: expect.any(Array),
    });

    const longQuery = await app.request(
      `/v1/charities/uk/sources?q=${"x".repeat(101)}`
    );
    expect(longQuery.status).toBe(400);
    expect(await longQuery.json()).toMatchObject({
      error: "query_too_long",
      maximum: 100,
      collection: "sources",
      walls_intact: true,
      next_actions: expect.any(Array),
    });
  });

  it("publishes schema, dictionary and deterministic JSON, NDJSON and CSV", async () => {
    const { app, sessionCalls } = mount();
    const schema = await app.request("/v1/charities/uk/schema");
    const schemaBody = await schema.json();
    expect(schema.status).toBe(200);
    expect(schema.headers.get("content-type")).toContain("application/schema+json");
    expect(schemaBody.properties).toHaveProperty("taxTreatments");
    expect(schemaBody.properties).not.toHaveProperty("people");
    expect(schemaBody.properties).not.toHaveProperty("organisations");

    const dictionary = await app.request("/v1/charities/uk/dictionary");
    const dictionaryBody = await dictionary.json();
    expect(dictionaryBody.dataset).toBe("uk-charities-sector");
    expect(dictionaryBody.correctionSafety).toMatch(/Do not post personal/i);
    expect(dictionaryBody.scope).toMatchObject({
      organisationDirectory: false,
      peopleRecords: false,
      personalReligionOrBeliefData: false,
    });
    const finance = dictionaryBody.collections.find(
      (collection: { pathName: string }) => collection.pathName === "finance"
    );
    expect(finance).toMatchObject({
      corpusKey: "financeDisclosures",
      identityField: "id",
      queryFilters: expect.arrayContaining(["type", "sourceId"]),
    });

    const index = await app.request("/v1/charities/uk/exports");
    const indexBody = await index.json();
    expect(indexBody.dataset).toBe("uk-charities-sector");
    const sources = indexBody.collections.find(
      (collection: { pathName: string }) => collection.pathName === "sources"
    );
    expect(sources).toMatchObject({
      available: true,
      count: ukCharities.sources.length,
    });

    const json = await app.request("/v1/charities/uk/exports/sources/json");
    const ndjson = await app.request("/v1/charities/uk/exports/sources/ndjson");
    const csv = await app.request("/v1/charities/uk/exports/sources/csv", {
      headers: { Origin: "https://public-interest-stack.example" },
    });
    expect((await json.json()).length).toBe(ukCharities.sources.length);
    const ndjsonText = await ndjson.text();
    expect(ndjsonText.trimEnd().split("\n")).toHaveLength(ukCharities.sources.length);
    ndjsonText
      .trimEnd()
      .split("\n")
      .forEach((row) => expect(() => JSON.parse(row)).not.toThrow());
    expect((await csv.text()).split("\r\n", 1)[0]).toBe(
      sources.csvColumns.join(",")
    );
    expect(csv.headers.get("content-disposition")).toContain(
      "taxsorted-uk-charities-sources"
    );
    expect(csv.headers.get("link")).toContain('rel="alternate"');
    expect(csv.headers.get("link")).toContain('rel="license"');
    expect(json.headers.get("etag")).toBe(sources.formats.json.etag);
    expect(ndjson.headers.get("etag")).toBe(sources.formats.ndjson.etag);
    expect(csv.headers.get("etag")).toBe(sources.formats.csv.etag);
    expect(new Set([
      json.headers.get("etag"),
      ndjson.headers.get("etag"),
      csv.headers.get("etag"),
    ]).size).toBe(3);

    const head = await app.request("/v1/charities/uk/exports/sources/csv", {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(csv.headers.get("etag"));
    expect(head.headers.get("content-disposition")).toBe(
      csv.headers.get("content-disposition")
    );
    expect(sessionCalls()).toBe(0);
  });

  it("keeps every advertised export link, count and exact-byte ETag true", async () => {
    const { app } = mount();
    const index = await (await app.request("/v1/charities/uk/exports")).json();

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
          expect((await response.json()).length, collection.pathName).toBe(
            collection.count
          );
        } else if (format === "ndjson") {
          const rows = (await response.text()).trimEnd().split("\n");
          expect(rows.length, collection.pathName).toBe(collection.count);
          rows.forEach((row) => expect(() => JSON.parse(row)).not.toThrow());
        } else {
          expect(
            (await response.text()).split("\r\n", 1)[0],
            collection.pathName
          ).toBe(collection.csvColumns.join(","));
        }
      }
    }
  });

  it("rejects query parameters on static resources before conditional handling", async () => {
    const { app } = mount();
    for (const path of [
      "graph?ignored=true",
      "map?ignored=true",
      "manifest?ignored=true",
      "schema?ignored=true",
      "dictionary?ignored=true",
      "exports?ignored=true",
      "exports/sources/csv?status=current",
    ]) {
      for (const method of ["GET", "HEAD"]) {
        const response = await app.request(`/v1/charities/uk/${path}`, {
          method,
        });
        expect(response.status, `${method} ${path}`).toBe(400);
        expect(response.headers.get("cache-control"), `${method} ${path}`).toBe(
          "no-store"
        );
      }
    }

    const overview = await app.request("/v1/charities/uk?ignored=true");
    expect(overview.status).toBe(400);
    const detail = await app.request(
      `/v1/charities/uk/sources/${ukCharities.sources[0].id}?ignored=true`
    );
    expect(detail.status).toBe(400);
  });

  it("owns an immutable corpus snapshot after route construction", async () => {
    const corpus = structuredClone(ukCharities);
    const sourceCount = corpus.sources.length;
    const app = new Hono();
    app.route(
      "/v1/charities/uk",
      createUkCharitiesRoutes({ corpus, publicDataEnabled: true })
    );
    corpus.sources.length = 0;

    const overview = await (await app.request("/v1/charities/uk")).json();
    const graph = await (await app.request("/v1/charities/uk/graph")).json();
    expect(overview.counts.sources).toBe(sourceCount);
    expect(graph.sources).toHaveLength(sourceCount);
  });

  it("keeps baseline evidence and metadata open while publication is closed", async () => {
    const defaultRoute = mount("route-default");
    expect((await defaultRoute.app.request("/v1/charities/uk/graph")).status).toBe(
      503
    );

    const { app, sessionCalls } = mount(false);
    for (const path of [
      "",
      "sources",
      "registers",
      "gaps",
      "manifest",
      "schema",
      "dictionary",
      "exports",
    ]) {
      const response = await app.request(`/v1/charities/uk${path ? `/${path}` : ""}`);
      expect(response.status, path || "overview").toBe(200);
    }

    expect(
      (await app.request("/v1/charities/uk/exports/registers/csv")).status
    ).toBe(200);
    expect(
      (await app.request("/v1/charities/uk/exports/tax-treatments/csv")).status
    ).toBe(503);

    const graph = await app.request("/v1/charities/uk/graph");
    expect(graph.status).toBe(503);
    expect(graph.headers.get("cache-control")).toBe("no-store");
    expect(await graph.json()).toMatchObject({
      error: "publication_review_pending",
    });

    const existingId = ukCharities.taxTreatments[0].id;
    const existing = await app.request(
      `/v1/charities/uk/tax-treatments/${existingId}`
    );
    const missing = await app.request(
      "/v1/charities/uk/tax-treatments/treatment-not-real"
    );
    expect(existing.status).toBe(503);
    expect(missing.status).toBe(503);

    const publicSource = await app.request(
      `/v1/charities/uk/records/${ukCharities.sources[0].id}`
    );
    const protectedTreatment = await app.request(
      `/v1/charities/uk/records/${ukCharities.taxTreatments[0].id}`
    );
    const protectedUnknown = await app.request(
      "/v1/charities/uk/records/record-not-real"
    );
    expect(publicSource.status).toBe(200);
    expect(protectedTreatment.status).toBe(503);
    expect(protectedUnknown.status).toBe(503);
    expect(protectedTreatment.headers.get("content-type")).toBe(
      protectedUnknown.headers.get("content-type")
    );
    expect(protectedTreatment.headers.get("cache-control")).toBe(
      protectedUnknown.headers.get("cache-control")
    );
    const {
      instance: _knownInstance,
      path: _knownPath,
      ...knownProblem
    } = await protectedTreatment.json();
    const {
      instance: _unknownInstance,
      path: _unknownPath,
      ...unknownProblem
    } = await protectedUnknown.json();
    expect(unknownProblem).toEqual(knownProblem);

    const protectedHead = await app.request(
      `/v1/charities/uk/records/${ukCharities.taxTreatments[0].id}`,
      { method: "HEAD" }
    );
    expect(protectedHead.status).toBe(503);
    expect(await protectedHead.text()).toBe("");

    const exports = await (await app.request("/v1/charities/uk/exports")).json();
    expect(
      exports.collections.find(
        (collection: { pathName: string }) => collection.pathName === "sources"
      ).available
    ).toBe(true);
    expect(
      exports.collections.find(
        (collection: { pathName: string }) =>
          collection.pathName === "tax-treatments"
      ).available
    ).toBe(false);
    expect(sessionCalls()).toBe(0);
  });

  it("lets the emergency stop override an enabled publication switch", async () => {
    const { app, sessionCalls } = mount(true, true);
    const overview = await app.request("/v1/charities/uk");
    expect(await overview.json()).toMatchObject({
      publication: {
        status: "emergency-stopped",
        publicDataEnabled: true,
        emergencyStop: true,
        fullCorpusAvailable: false,
      },
    });

    expect((await app.request("/v1/charities/uk/sources")).status).toBe(200);
    expect((await app.request("/v1/charities/uk/registers")).status).toBe(200);
    const stopped = await app.request("/v1/charities/uk/obligations");
    expect(stopped.status).toBe(503);
    expect(stopped.headers.get("cache-control")).toBe("no-store");
    expect(await stopped.json()).toMatchObject({
      error: "publication_emergency_stop",
    });

    const manifest = await app.request("/v1/charities/uk/manifest");
    expect(await manifest.json()).toMatchObject({
      publication: { status: "emergency-stopped", fullCorpusAvailable: false },
    });
    expect(sessionCalls()).toBe(0);
  });

  it("has no write methods and returns clean no-store 404s", async () => {
    const { app, sessionCalls } = mount();
    const missing = await app.request(
      "/v1/charities/uk/help/help-route-not-real"
    );
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    expect(await missing.json()).toMatchObject({
      error: "not_found",
      collection: "help",
      id: "help-route-not-real",
      walls_intact: true,
      next_actions: expect.any(Array),
    });

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await app.request("/v1/charities/uk/sources", { method });
      expect(response.status, method).toBe(404);
      expect(response.headers.get("cache-control"), method).toBe("no-store");
      expect(response.headers.get("set-cookie"), method).toBeNull();
    }
    expect(sessionCalls()).toBe(0);

    for (const stopped of [mount(false), mount(true, true)]) {
      const response = await stopped.app.request(
        "/v1/charities/uk/obligations",
        { method: "POST" }
      );
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toMatchObject({
        error: "not_found",
        method: "POST",
        walls_intact: true,
        next_actions: expect.any(Array),
      });
      expect(stopped.sessionCalls()).toBe(0);
    }
  });
});
