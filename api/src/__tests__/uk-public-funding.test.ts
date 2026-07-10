import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { createUkPublicFundingRoutes } from "../routes/uk-public-funding.js";
import {
  ukPublicFunding,
  ukPublicFundingSchema,
  validateUkPublicFundingGraph,
  type UkPublicFunding,
} from "../uk-public-funding.js";

function mount(publicDataEnabled: boolean | "route-default" = true) {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/public-funding/uk",
    publicDataEnabled === "route-default"
      ? createUkPublicFundingRoutes({ corpus: ukPublicFunding })
      : createUkPublicFundingRoutes({
          corpus: ukPublicFunding,
          publicDataEnabled,
        }),
  );
  // Mirrors index.ts: the public route must finish before taxpayer identity
  // middleware can create a cookie or a session row.
  app.use("/v1/*", async (c, next) => {
    sessionCalls++;
    c.header("Set-Cookie", "ts_session=should-not-exist; HttpOnly");
    await next();
  });
  app.get("/v1/private-probe", (c) => c.json({ ok: true }));
  return { app, sessionCalls: () => sessionCalls };
}

describe("UK public-funding corpus integrity", () => {
  it("loads one reviewed coverage-first graph with every declared layer", () => {
    expect(ukPublicFunding.schema).toBe("taxsorted.uk.public-funding/1");
    expect(ukPublicFunding.meta.jurisdiction).toBe("United Kingdom");
    for (const collection of [
      ukPublicFunding.sources,
      ukPublicFunding.institutions,
      ukPublicFunding.governanceUnits,
      ukPublicFunding.offices,
      ukPublicFunding.relationships,
      ukPublicFunding.funds,
      ukPublicFunding.programmes,
      ukPublicFunding.fundingMechanisms,
      ukPublicFunding.allocations,
      ukPublicFunding.contacts,
      ukPublicFunding.officeLocations,
      ukPublicFunding.pipelineStages,
      ukPublicFunding.transparencyGaps,
    ]) {
      expect(collection.length).toBeGreaterThan(0);
    }
    expect(
      ukPublicFunding.programmes.every(
        (programme) => programme.beneficiaryTags.length > 0,
      ),
    ).toBe(true);
  });

  it("rejects dangling references and broken evidence pointers", () => {
    const dangling = structuredClone(ukPublicFunding) as UkPublicFunding;
    dangling.institutions[0].taxSystemRefs.push("not-a-tax-system-record");
    expect(() => validateUkPublicFundingGraph(dangling)).toThrow(
      /unknown tax-system record: not-a-tax-system-record/,
    );

    const pointer = structuredClone(ukPublicFunding) as UkPublicFunding;
    pointer.institutions[0].evidence[0].fields = ["/field-that-does-not-exist"];
    expect(() => validateUkPublicFundingGraph(pointer)).toThrow(
      /evidence points to a missing field/,
    );

    const provenance = structuredClone(ukPublicFunding) as UkPublicFunding;
    provenance.allocations[0].evidence[0].fields = ["/sourceIds"];
    expect(() => validateUkPublicFundingGraph(provenance)).toThrow(
      /cannot cite provenance metadata/,
    );
  });

  it("requires integer GBP money and all comparison dimensions", () => {
    const fractional = structuredClone(ukPublicFunding) as unknown as Record<
      string,
      any
    >;
    fractional.allocations[0].amountMinor = 1.5;
    expect(() => ukPublicFundingSchema.parse(fractional)).toThrow();

    const wrongCurrency = structuredClone(ukPublicFunding) as unknown as Record<
      string,
      any
    >;
    wrongCurrency.allocations[0].currency = "USD";
    expect(() => ukPublicFundingSchema.parse(wrongCurrency)).toThrow();

    const badYear = structuredClone(ukPublicFunding) as unknown as Record<
      string,
      any
    >;
    badYear.allocations[0].financialYear = "2026-29";
    expect(() => ukPublicFundingSchema.parse(badYear)).toThrow(
      /consecutive years/,
    );

    const missingBasis = structuredClone(ukPublicFunding) as unknown as Record<
      string,
      any
    >;
    delete missingBasis.allocations[0].accountingBasis;
    expect(() => ukPublicFundingSchema.parse(missingBasis)).toThrow();

    const unexplainedNegative = structuredClone(
      ukPublicFunding,
    ) as unknown as Record<string, any>;
    unexplainedNegative.allocations[0].amountMinor = -1;
    expect(() => ukPublicFundingSchema.parse(unexplainedNegative)).toThrow(
      /negative allocation needs an explicit explanation/,
    );
  });

  it("rejects unsafe allocation containment and self-comparison", () => {
    const contained = structuredClone(ukPublicFunding) as UkPublicFunding;
    contained.allocations[0].containedInAllocationId =
      contained.allocations[0].id;
    expect(() => validateUkPublicFundingGraph(contained)).toThrow(
      /cannot contain itself/,
    );

    const comparison = structuredClone(ukPublicFunding) as UkPublicFunding;
    comparison.allocations[0].notComparableToIds = [
      comparison.allocations[0].id,
    ];
    expect(() => validateUkPublicFundingGraph(comparison)).toThrow(
      /cannot be not-comparable with itself/,
    );

    if (ukPublicFunding.allocations.length > 1) {
      const oneWay = structuredClone(ukPublicFunding) as UkPublicFunding;
      oneWay.allocations[0].notComparableToIds = [oneWay.allocations[1].id];
      oneWay.allocations[1].notComparableToIds = [];
      expect(() => validateUkPublicFundingGraph(oneWay)).toThrow(
        /non-reciprocal not-comparable allocation/,
      );
    }
  });

  it("keeps people out of offices, contacts and locations by construction", () => {
    for (const office of ukPublicFunding.offices) {
      expect(office.currentHolderPublication.mode).toBe(
        "official-source-link-only",
      );
      expect(office.currentHolderPublication).not.toHaveProperty("name");
      expect(office).not.toHaveProperty("holderName");
    }
    expect(
      ukPublicFunding.contacts.every((contact) => contact.functionalOnly),
    ).toBe(true);
    expect(
      ukPublicFunding.officeLocations.every(
        (location) => location.residential === false,
      ),
    ).toBe(true);

    const named = structuredClone(ukPublicFunding) as unknown as Record<
      string,
      any
    >;
    named.offices[0].currentHolderPublication.name = "A copied holder name";
    expect(() => ukPublicFundingSchema.parse(named)).toThrow(
      /Unrecognized key/,
    );

    const malformedUrl = structuredClone(ukPublicFunding) as unknown as Record<
      string,
      any
    >;
    malformedUrl.contacts[0].kind = "contact-page";
    malformedUrl.contacts[0].value = "http://example.test/contact";
    expect(() => ukPublicFundingSchema.parse(malformedUrl)).toThrow(
      /HTTPS URLs/,
    );

    const malformedEmail = structuredClone(
      ukPublicFunding,
    ) as unknown as Record<string, any>;
    malformedEmail.contacts[0].kind = "email";
    malformedEmail.contacts[0].value = "not-an-email";
    expect(() => ukPublicFundingSchema.parse(malformedEmail)).toThrow(
      /valid email/,
    );

    const unprovedContact = structuredClone(ukPublicFunding) as UkPublicFunding;
    unprovedContact.contacts[0].evidence.forEach((entry) => {
      entry.fields = entry.fields.filter((field) => field !== "/value");
    });
    expect(() => validateUkPublicFundingGraph(unprovedContact)).toThrow(
      /no field evidence for its public contact value/,
    );
  });
});

describe("public UK public-funding API", () => {
  it("is wildcard-CORS, cacheable and sessionless", async () => {
    expect(isPublicCivicPath("/v1/public-funding/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/public-funding/uk/allocations")).toBe(true);
    expect(isPublicCivicPath("/v1/public-funding/uk-evil")).toBe(false);

    const { app, sessionCalls } = mount();
    const response = await app.request("/v1/public-funding/uk", {
      headers: {
        Origin: "https://public-money.example",
        Cookie: "ts_session=existing-browser-cookie",
      },
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, must-revalidate",
    );
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(body.manifest.datasetHash).toMatch(/^sha256:/);
    expect(body.routes.fullGraph).toBe("/v1/public-funding/uk/graph");
    expect(sessionCalls()).toBe(0);
  });

  it("filters lists, enriches institution detail and rejects unsupported filters", async () => {
    const { app } = mount();
    const institution = ukPublicFunding.institutions[0];
    const sector = institution.sectors[0];
    const list = await app.request(
      `/v1/public-funding/uk/institutions?sector=${encodeURIComponent(sector)}`,
    );
    const listBody = await list.json();
    expect(list.status).toBe(200);
    expect(listBody.data.length).toBeGreaterThan(0);
    expect(
      listBody.data.every((item: { sectors: string[] }) =>
        item.sectors.includes(sector),
      ),
    ).toBe(true);

    const detail = await app.request(
      `/v1/public-funding/uk/institutions/${institution.id}`,
    );
    const detailBody = await detail.json();
    expect(detail.status).toBe(200);
    expect(detailBody.data.id).toBe(institution.id);
    expect(detailBody.evidence.length).toBeGreaterThan(0);
    expect(detailBody).toHaveProperty("relationships");
    expect(detailBody).toHaveProperty("allocations");

    const allocation = ukPublicFunding.allocations[0];
    const filtered = await app.request(
      `/v1/public-funding/uk/allocations?financialYear=${allocation.financialYear}&accountingBasis=${allocation.accountingBasis}`,
    );
    const filteredBody = await filtered.json();
    expect(filtered.status).toBe(200);
    expect(
      filteredBody.data.every(
        (item: { financialYear: string; accountingBasis: string }) =>
          item.financialYear === allocation.financialYear &&
          item.accountingBasis === allocation.accountingBasis,
      ),
    ).toBe(true);

    const invalid = await app.request(
      "/v1/public-funding/uk/allocations?holderName=x",
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: "unknown_filter",
      filters: ["holderName"],
    });
    expect(invalid.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps offset pages traversable in the body and HTTP Link header", async () => {
    const { app } = mount();
    const first = await app.request(
      "/v1/public-funding/uk/institutions?jurisdiction=United%20Kingdom&limit=2",
    );
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(firstBody.page).toMatchObject({
      returned: 2,
      limit: 2,
      offset: 0,
      hasMore: true,
    });
    expect(firstBody.links.self).toBe(
      "/v1/public-funding/uk/institutions?jurisdiction=United%20Kingdom&limit=2",
    );
    expect(firstBody.links.prev).toBeNull();
    expect(firstBody.links.next).toContain("jurisdiction=United+Kingdom");
    expect(firstBody.links.next).toContain("offset=2");
    expect(first.headers.get("link")).toContain(
      `<${firstBody.links.next}>; rel="next"`,
    );

    const second = await app.request(firstBody.links.next);
    const secondBody = await second.json();
    expect(second.status).toBe(200);
    expect(secondBody.page.offset).toBe(2);
    expect(secondBody.links.prev).toContain("offset=0");
    expect(second.headers.get("link")).toContain(
      `<${secondBody.links.prev}>; rel="prev"`,
    );
    expect(secondBody.data.map((item: { id: string }) => item.id)).not.toEqual(
      firstBody.data.map((item: { id: string }) => item.id),
    );

    const invalid = await app.request(
      "/v1/public-funding/uk/institutions?limit=0",
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: "invalid_page",
      nextActions: [{ method: "GET" }],
    });
  });

  it("publishes one honest append-only checkpoint with caller-held cursors", async () => {
    const { app, sessionCalls } = mount();
    const manifest = await (
      await app.request("/v1/public-funding/uk/manifest")
    ).json();
    const response = await app.request("/v1/public-funding/uk/changes?limit=1");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      schema: "taxsorted.uk.public-funding.changes/1",
      dataset: "uk-public-funding",
      appendOnly: true,
      page: { limit: 1, returned: 1, hasMore: false },
    });
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      sequence: 1,
      cursor: "pf-1",
      operation: "snapshot-established",
      version: ukPublicFunding.meta.version,
      reviewedOn: ukPublicFunding.meta.reviewedOn,
      publishedOn: "2026-07-10",
      releaseCommit: "96e202b491b6272ccdf7d83930fca0712861cf25",
      previousEventHash: null,
      eventHash: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
      datasetHash: manifest.datasetHash,
    });
    expect(body.data[0].doesNotClaim.join(" ")).toMatch(
      /does not claim that every record was individually added/i,
    );
    expect(body.page.nextCursor).toBe(body.data[0].cursor);
    expect(body.links.next).toBeNull();
    expect(body.links.poll).toContain("after=pf-1");

    const poll = await app.request(body.links.poll);
    const pollBody = await poll.json();
    expect(poll.status).toBe(200);
    expect(pollBody.data).toEqual([]);
    expect(pollBody.page).toMatchObject({
      returned: 0,
      hasMore: false,
      nextCursor: "pf-1",
    });

    const invalid = await app.request(
      "/v1/public-funding/uk/changes?after=made-up-cursor",
    );
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("cache-control")).toBe("no-store");
    expect(await invalid.json()).toMatchObject({
      error: "invalid_cursor",
      nextActions: [{ href: "/v1/public-funding/uk/changes" }],
    });
    expect(sessionCalls()).toBe(0);
  });

  it("refuses to serve a corpus whose reviewed checkpoint is stale", () => {
    const versionChanged = structuredClone(ukPublicFunding) as UkPublicFunding;
    versionChanged.meta.version = "2099-01-01.1";

    const bytesChanged = structuredClone(ukPublicFunding) as UkPublicFunding;
    bytesChanged.sources[0].title = `${bytesChanged.sources[0].title} corrected`;

    const countChanged = structuredClone(ukPublicFunding) as UkPublicFunding;
    countChanged.transparencyGaps.pop();

    for (const corpus of [versionChanged, bytesChanged, countChanged]) {
      expect(() =>
        createUkPublicFundingRoutes({ corpus, publicDataEnabled: true }),
      ).toThrow(/change feed is stale/i);
    }
  });

  it("resolves every stable ID without making callers guess its collection", async () => {
    const { app } = mount();
    const institution = ukPublicFunding.institutions[0];
    const resolved = await app.request(
      `/v1/public-funding/uk/records/${institution.id}`,
    );
    expect(resolved.status).toBe(200);
    expect(resolved.headers.get("content-location")).toBe(
      `/v1/public-funding/uk/records/${institution.id}`,
    );
    expect(resolved.headers.get("link")).toContain(
      `</v1/public-funding/uk/institutions/${institution.id}>; rel="canonical"`,
    );
    expect(await resolved.json()).toMatchObject({
      collection: "institutions",
      corpusKey: "institutions",
      canonicalUrl: `/v1/public-funding/uk/institutions/${institution.id}`,
      data: { id: institution.id },
      links: {
        self: `/v1/public-funding/uk/records/${institution.id}`,
        canonical: `/v1/public-funding/uk/institutions/${institution.id}`,
      },
    });

    const source = ukPublicFunding.sources[0];
    expect(
      await (
        await app.request(`/v1/public-funding/uk/records/${source.id}`)
      ).json(),
    ).toMatchObject({ collection: "sources", data: { id: source.id } });

    const missing = await app.request(
      "/v1/public-funding/uk/records/record-not-real",
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: "not_found",
      nextActions: [{ href: "/v1/public-funding/uk" }],
    });

    const queried = await app.request(
      `/v1/public-funding/uk/records/${institution.id}?expand=true`,
    );
    expect(queried.status).toBe(400);
    expect(await queried.json()).toMatchObject({
      error: "unknown_query_parameter",
      nextActions: [{ method: "GET" }],
    });
  });

  it("serves a byte-verifiable graph and conditional HEAD/GET responses", async () => {
    const { app } = mount();
    const manifest = await app.request("/v1/public-funding/uk/manifest");
    const manifestBody = await manifest.json();
    const graph = await app.request("/v1/public-funding/uk/graph");
    const graphEtag = graph.headers.get("etag")!;
    expect(graph.status).toBe(200);
    expect(manifestBody.datasetHash).toBe(
      graphEtag.replace(/^"sha256-/, "sha256:").replace(/"$/, ""),
    );
    expect(await graph.json()).toEqual(ukPublicFunding);

    const unchanged = await app.request("/v1/public-funding/uk/graph", {
      headers: { "If-None-Match": `W/${graphEtag}` },
    });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");

    const head = await app.request("/v1/public-funding/uk/graph", {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(graphEtag);
  });

  it("publishes schema, dictionary and complete JSON, NDJSON and CSV exports", async () => {
    const { app, sessionCalls } = mount();
    const schema = await app.request("/v1/public-funding/uk/schema");
    const schemaBody = await schema.json();
    expect(schema.status).toBe(200);
    expect(schema.headers.get("content-type")).toContain(
      "application/schema+json",
    );
    expect(
      schemaBody.properties.allocations.items.properties.amountMinor,
    ).toBeDefined();

    const dictionary = await app.request("/v1/public-funding/uk/dictionary");
    const dictionaryBody = await dictionary.json();
    const allocationsDictionary = dictionaryBody.collections.find(
      (collection: { pathName: string }) =>
        collection.pathName === "allocations",
    );
    expect(
      allocationsDictionary.fields.find(
        (field: { name: string }) => field.name === "amountMinor",
      ),
    ).toMatchObject({ meaning: expect.stringMatching(/integer pence/i) });

    const index = await app.request("/v1/public-funding/uk/exports");
    const indexBody = await index.json();
    const advertised = indexBody.collections.find(
      (collection: { pathName: string }) =>
        collection.pathName === "allocations",
    );
    expect(advertised).toMatchObject({
      available: true,
      count: ukPublicFunding.allocations.length,
    });

    const json = await app.request(
      "/v1/public-funding/uk/exports/allocations/json",
    );
    const ndjson = await app.request(
      "/v1/public-funding/uk/exports/allocations/ndjson",
    );
    const csv = await app.request(
      "/v1/public-funding/uk/exports/allocations/csv",
    );
    expect(await json.json()).toHaveLength(ukPublicFunding.allocations.length);
    expect((await ndjson.text()).trimEnd().split("\n")).toHaveLength(
      ukPublicFunding.allocations.length,
    );
    expect((await csv.text()).split("\r\n", 1)[0]).toContain("amountMinor");
    expect(csv.headers.get("content-disposition")).toContain(
      "taxsorted-uk-public-funding-allocations",
    );
    expect(json.headers.get("etag")).toBe(advertised.formats.json.etag);
    expect(ndjson.headers.get("etag")).toBe(advertised.formats.ndjson.etag);
    expect(csv.headers.get("etag")).toBe(advertised.formats.csv.etag);

    const head = await app.request(
      "/v1/public-funding/uk/exports/allocations/csv",
      {
        method: "HEAD",
      },
    );
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("content-disposition")).toBe(
      csv.headers.get("content-disposition"),
    );
    expect(sessionCalls()).toBe(0);
  });

  it("keeps every advertised export count and exact-byte ETag true", async () => {
    const { app } = mount();
    const index = await (
      await app.request("/v1/public-funding/uk/exports")
    ).json();
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
        expect(
          response.headers.get("etag"),
          `${collection.pathName}/${format}`,
        ).toBe(advertised.etag);
        if (format === "json") {
          expect((await response.json()).length, collection.pathName).toBe(
            collection.count,
          );
        } else if (format === "ndjson") {
          const text = await response.text();
          const rows = text === "" ? [] : text.trimEnd().split("\n");
          expect(rows.length, collection.pathName).toBe(collection.count);
          rows.forEach((row) => expect(() => JSON.parse(row)).not.toThrow());
        } else {
          expect(
            (await response.text()).split("\r\n", 1)[0],
            collection.pathName,
          ).toBe(collection.csvColumns.join(","));
        }
      }
    }
  });

  it("rejects meaningless static queries and missing resources without cacheable errors", async () => {
    const { app } = mount();
    for (const path of [
      "graph?ignored=true",
      "manifest?ignored=true",
      "schema?ignored=true",
      "dictionary?ignored=true",
      "exports?ignored=true",
      "exports/allocations/csv?status=outturn",
    ]) {
      const response = await app.request(`/v1/public-funding/uk/${path}`);
      expect(response.status, path).toBe(400);
      expect(response.headers.get("cache-control"), path).toBe("no-store");
    }
    const missing = await app.request(
      "/v1/public-funding/uk/institutions/institution-not-real",
    );
    expect(missing.status).toBe(404);
    expect(missing.headers.get("cache-control")).toBe("no-store");
    const format = await app.request(
      "/v1/public-funding/uk/exports/allocations/xml",
    );
    expect(format.status).toBe(404);
    expect(format.headers.get("cache-control")).toBe("no-store");
  });

  it("closes protected bodies by default without exposing which IDs exist", async () => {
    expect(
      (await mount("route-default").app.request("/v1/public-funding/uk/graph"))
        .status,
    ).toBe(503);

    const { app, sessionCalls } = mount(false);
    for (const path of [
      "",
      "sources",
      "gaps",
      "manifest",
      "schema",
      "dictionary",
      "exports",
      "changes",
    ]) {
      const response = await app.request(
        `/v1/public-funding/uk${path ? `/${path}` : ""}`,
      );
      expect(response.status, path || "overview").toBe(200);
    }
    expect(
      (await app.request("/v1/public-funding/uk/exports/sources/csv")).status,
    ).toBe(200);
    expect(
      (await app.request("/v1/public-funding/uk/exports/allocations/csv"))
        .status,
    ).toBe(503);

    const existing = await app.request(
      `/v1/public-funding/uk/institutions/${ukPublicFunding.institutions[0].id}`,
    );
    const missing = await app.request(
      "/v1/public-funding/uk/institutions/institution-not-real",
    );
    expect(existing.status).toBe(503);
    expect(missing.status).toBe(503);
    expect(await missing.json()).toMatchObject({
      error: "publication_review_pending",
    });
    expect(missing.headers.get("cache-control")).toBe("no-store");

    const publicSource = await app.request(
      `/v1/public-funding/uk/records/${ukPublicFunding.sources[0].id}`,
    );
    const protectedInstitution = await app.request(
      `/v1/public-funding/uk/records/${ukPublicFunding.institutions[0].id}`,
    );
    const protectedUnknown = await app.request(
      "/v1/public-funding/uk/records/record-not-real",
    );
    expect(publicSource.status).toBe(200);
    expect(protectedInstitution.status).toBe(503);
    expect(protectedUnknown.status).toBe(503);
    const protectedBody = await protectedInstitution.json();
    expect(protectedBody.error).toBe("publication_review_pending");
    expect(protectedBody.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/v1/public-funding/uk/sources",
        }),
      ]),
    );

    const unknown = await app.request("/v1/public-funding/uk/not-a-route");
    expect(unknown.status).toBe(404);
    expect(sessionCalls()).toBe(0);
  });

  it("names an emergency stop while leaving discovery, sources and gaps readable", async () => {
    const app = new Hono();
    app.route(
      "/v1/public-funding/uk",
      createUkPublicFundingRoutes({
        corpus: ukPublicFunding,
        publicDataEnabled: true,
        emergencyStop: true,
      }),
    );

    const overview = await app.request("/v1/public-funding/uk");
    expect(overview.status).toBe(200);
    expect(await overview.json()).toMatchObject({
      manifest: { publicationStatus: "emergency-stopped" },
    });
    expect((await app.request("/v1/public-funding/uk/sources")).status).toBe(
      200,
    );
    expect((await app.request("/v1/public-funding/uk/gaps")).status).toBe(200);
    expect((await app.request("/v1/public-funding/uk/changes")).status).toBe(
      200,
    );
    expect(
      (
        await app.request(
          `/v1/public-funding/uk/records/${ukPublicFunding.sources[0].id}`,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request(
          `/v1/public-funding/uk/records/${ukPublicFunding.institutions[0].id}`,
        )
      ).status,
    ).toBe(503);

    const graph = await app.request("/v1/public-funding/uk/graph");
    expect(graph.status).toBe(503);
    expect(await graph.json()).toMatchObject({
      error: "publication_emergency_stopped",
    });
    expect(graph.headers.get("cache-control")).toBe("no-store");
  });
});
