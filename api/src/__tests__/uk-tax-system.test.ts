import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { createUkTaxSystemRoutes } from "../routes/uk-tax-system.js";
import {
  ukTaxSystem,
  ukTaxSystemSchema,
  validateUkTaxSystemGraph,
  type UkTaxSystem,
} from "../uk-tax-system.js";

const problemTitles = {
  invalid_filter: "Invalid filter",
  invalid_page: "Invalid page",
  not_found: "Resource not found",
  publication_review_pending: "Publication review pending",
  query_too_long: "Query too long",
  repeated_filter: "Repeated filter",
  unknown_filter: "Unknown filter",
  unknown_query_parameter: "Unknown query parameter",
} as const;

async function expectPublicProblem(
  response: Response,
  expected: {
    error: keyof typeof problemTitles;
    status: 400 | 404 | 503;
    instance: string;
    extensions?: Record<string, unknown>;
  }
) {
  expect(response.status).toBe(expected.status);
  expect(response.headers.get("content-type")).toContain(
    "application/problem+json"
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.json();
  expect(body).toMatchObject({
    type: `https://api.taxsorted.io/problems/${expected.error}`,
    title: problemTitles[expected.error],
    status: expected.status,
    detail: expect.any(String),
    instance: expected.instance,
    error: expected.error,
    nextActions: expect.any(Array),
    ...expected.extensions,
  });
  return body;
}

function mount(publicDataEnabled: boolean | "route-default" = true) {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/tax-system/uk",
    publicDataEnabled === "route-default"
      ? createUkTaxSystemRoutes({ corpus: ukTaxSystem })
      : createUkTaxSystemRoutes({ corpus: ukTaxSystem, publicDataEnabled })
  );
  // Mirrors index.ts: a public route must finish before any taxpayer identity
  // middleware can create a cookie or session row.
  app.use("/v1/*", async (c, next) => {
    sessionCalls++;
    c.header("Set-Cookie", "ts_session=should-not-exist; HttpOnly");
    await next();
  });
  app.get("/v1/private-probe", (c) => c.json({ ok: true }));
  return { app, sessionCalls: () => sessionCalls };
}

describe("UK tax-system corpus integrity", () => {
  it("loads the reviewed graph and keeps each major layer non-trivial", () => {
    expect(ukTaxSystem.meta.reviewedOn).toBe("2026-07-10");
    expect(ukTaxSystem.sources.length).toBeGreaterThanOrEqual(70);
    expect(ukTaxSystem.actors.length).toBeGreaterThanOrEqual(40);
    expect(ukTaxSystem.relationships.length).toBeGreaterThanOrEqual(35);
    expect(ukTaxSystem.pipelineStages.length).toBeGreaterThanOrEqual(25);
    expect(ukTaxSystem.permissions.length).toBeGreaterThanOrEqual(10);
    expect(ukTaxSystem.cases.length).toBeGreaterThanOrEqual(8);
    expect(ukTaxSystem.transparencyGaps.length).toBeGreaterThanOrEqual(15);
  });

  it("rejects a dangling actor edge and a broken evidence pointer", () => {
    const dangling = structuredClone(ukTaxSystem) as UkTaxSystem;
    dangling.relationships[0].toActorId = "actor-does-not-exist";
    expect(() => validateUkTaxSystemGraph(dangling)).toThrow(
      /unknown actor: actor-does-not-exist/
    );

    const pointer = structuredClone(ukTaxSystem) as UkTaxSystem;
    pointer.actors[0].evidence[0].fields = ["/field-that-does-not-exist"];
    expect(() => validateUkTaxSystemGraph(pointer)).toThrow(
      /evidence points to a missing field/
    );
  });

  it("rejects impossible dates and unknown fields instead of silently stripping them", () => {
    const badDate = structuredClone(ukTaxSystem) as unknown as Record<string, any>;
    badDate.meta.reviewedOn = "2026-99-99";
    expect(() => ukTaxSystemSchema.parse(badDate)).toThrow(/invalid calendar date/);

    const unknownTopLevel = structuredClone(ukTaxSystem) as unknown as Record<string, any>;
    unknownTopLevel.meta.reviewdOn = unknownTopLevel.meta.reviewedOn;
    expect(() => ukTaxSystemSchema.parse(unknownTopLevel)).toThrow(/Unrecognized key/);

    const unknownNested = structuredClone(ukTaxSystem) as unknown as Record<string, any>;
    unknownNested.actors[0].contacts[0].privateNote = "must not disappear silently";
    expect(() => ukTaxSystemSchema.parse(unknownNested)).toThrow(/Unrecognized key/);
  });

  it("preserves the permission boundaries most likely to mislead callers", () => {
    const adviser = ukTaxSystem.permissions.find(
      (item) => item.id === "permission-hmrc-adviser-registration"
    );
    expect(adviser?.notEquivalentTo).toContain("HMRC endorsement");
    expect(adviser?.notEquivalentTo).toContain("licence for all tax advice");

    const dca = ukTaxSystem.pipelineStages.find(
      (item) => item.id === "stage-private-debt-contact"
    );
    expect(dca?.rightsAndSafeguards).toContain("The agency never visits");
    expect(dca?.collectorActorIds).not.toContain("actor-enforcement-agents");

    const complaint = ukTaxSystem.pipelineStages.find(
      (item) => item.id === "stage-service-complaint"
    );
    expect(complaint?.accountEffects).toMatch(/does not itself change liability/i);
  });

  it("publishes the live taking-control source conflict instead of hiding it", () => {
    const gap = ukTaxSystem.transparencyGaps.find(
      (item) => item.id === "gap-taking-control-fee-conflict"
    );
    expect(gap?.status).toBe("source-conflict");
    expect(gap?.detail).toContain("£75");
    expect(gap?.detail).toContain("£79");
    expect(gap?.sourceIds).toEqual(
      expect.arrayContaining(["src-nonpayment", "src-tcog-manual", "src-tcog-2026"])
    );
  });
});

describe("public UK tax-system API", () => {
  it("uses an exact public-CORS boundary", () => {
    expect(isPublicCivicPath("/v1/tax-system/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/tax-system/uk/actors")).toBe(true);
    expect(isPublicCivicPath("/v1/tax-system/uk-evil")).toBe(false);
    expect(isPublicCivicPath("/v1/politics/uk/people")).toBe(true);
  });

  it("is wildcard-CORS, cacheable and sessionless even when a cookie is supplied", async () => {
    const { app, sessionCalls } = mount();
    const response = await app.request("/v1/tax-system/uk", {
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
    expect(sessionCalls()).toBe(0);
    expect(body.manifest.datasetHash).toMatch(/^sha256:/);
    expect(body.startHere).toContain("Read gaps before treating the map as complete.");
  });

  it("filters collections, resolves evidence on detail and rejects unknown filters", async () => {
    const { app } = mount();
    const list = await app.request(
      "/v1/tax-system/uk/actors?sector=private&q=banking"
    );
    const listBody = await list.json();
    expect(list.status).toBe(200);
    expect(listBody.data.length).toBeGreaterThan(0);
    expect(
      listBody.data.every((item: { sector: string }) => item.sector === "private")
    ).toBe(true);

    const detail = await app.request("/v1/tax-system/uk/actors/actor-hmrc");
    const detailBody = await detail.json();
    expect(detail.status).toBe(200);
    expect(detailBody.data.name).toContain("HM Revenue");
    expect(detailBody.evidence.length).toBeGreaterThan(1);
    expect(detailBody.relationships.length).toBeGreaterThan(5);
    expect(detailBody.pipelineStages.length).toBeGreaterThan(5);

    const invalid = await app.request("/v1/tax-system/uk/actors?sectro=public");
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: "unknown_filter",
      filters: ["sectro"],
    });
    expect(invalid.headers.get("cache-control")).toBe("no-store");

    const irrelevant = await app.request("/v1/tax-system/uk/actors?lane=hmrc-main");
    expect(irrelevant.status).toBe(400);
    expect(await irrelevant.json()).toMatchObject({
      error: "unknown_filter",
      filters: ["lane"],
    });

    const repeated = await app.request(
      "/v1/tax-system/uk/actors?sector=public&sector=private"
    );
    expect(repeated.status).toBe(400);
    expect(await repeated.json()).toMatchObject({
      error: "repeated_filter",
      filters: ["sector"],
    });

    const unknownActor = await app.request(
      "/v1/tax-system/uk/relationships?actorId=actor-not-real"
    );
    expect(unknownActor.status).toBe(400);
    expect(await unknownActor.json()).toMatchObject({
      error: "invalid_filter",
      filter: "actorId",
    });

    const validButUnobserved = await app.request(
      "/v1/tax-system/uk/cases?status=pending"
    );
    expect(validButUnobserved.status).toBe(200);
    expect(await validButUnobserved.json()).toMatchObject({
      data: [],
      page: { total: 0 },
      filters: { status: "pending" },
    });

    const invalidEnum = await app.request(
      "/v1/tax-system/uk/cases?status=definitely-not-a-status"
    );
    expect(invalidEnum.status).toBe(400);
    expect(await invalidEnum.json()).toMatchObject({ error: "invalid_filter" });
  });

  it("uses one backward-compatible Problem Details contract for every public error lane", async () => {
    const { app } = mount();
    const longQuery = "x".repeat(101);
    const cases = [
      {
        url: "/v1/tax-system/uk/manifest?ignored=true",
        error: "unknown_query_parameter",
        status: 400,
        extensions: { parameters: ["ignored"] },
      },
      {
        url: "/v1/tax-system/uk/exports/actors/xml",
        error: "not_found",
        status: 404,
      },
      {
        url: "/v1/tax-system/uk/actors?sectro=public",
        error: "unknown_filter",
        status: 400,
        extensions: { filters: ["sectro"] },
      },
      {
        url: "/v1/tax-system/uk/actors?sector=public&sector=private",
        error: "repeated_filter",
        status: 400,
        extensions: { filters: ["sector"] },
      },
      {
        url: `/v1/tax-system/uk/actors?q=${longQuery}`,
        error: "query_too_long",
        status: 400,
        extensions: { maximum: 100 },
      },
      {
        url: "/v1/tax-system/uk/actors?limit=0",
        error: "invalid_page",
        status: 400,
        extensions: {
          limits: { limit: [1, 100], offset: "0 or greater" },
        },
      },
      {
        url: "/v1/tax-system/uk/relationships?actorId=actor-not-real",
        error: "invalid_filter",
        status: 400,
        extensions: { filter: "actorId", value: "actor-not-real" },
      },
      {
        url: "/v1/tax-system/uk/permissions/permission-not-real",
        error: "not_found",
        status: 404,
        extensions: {
          collection: "permissions",
          id: "permission-not-real",
        },
      },
      {
        url: "/v1/tax-system/uk/records/record-not-real",
        error: "not_found",
        status: 404,
        extensions: {
          message: "No UK tax-system record has this stable dataset ID.",
          id: "record-not-real",
        },
      },
      {
        url: "/v1/tax-system/uk/not-a-route",
        error: "not_found",
        status: 404,
      },
    ] as const;

    for (const candidate of cases) {
      await expectPublicProblem(await app.request(candidate.url), {
        error: candidate.error,
        status: candidate.status,
        instance: new URL(candidate.url, "https://api.taxsorted.io").pathname,
        ...("extensions" in candidate
          ? { extensions: candidate.extensions as Record<string, unknown> }
          : {}),
      });
    }

    const closed = await mount(false).app.request(
      "/v1/tax-system/uk/graph"
    );
    await expectPublicProblem(closed, {
      error: "publication_review_pending",
      status: 503,
      instance: "/v1/tax-system/uk/graph",
      extensions: {
        message:
          "The reviewed source ledger and gap register remain public while the full graph is closed.",
        sources: "/v1/tax-system/uk/sources",
        gaps: "/v1/tax-system/uk/gaps",
      },
    });
  });

  it("resolves a stable ID without making the caller guess its collection", async () => {
    const { app } = mount();
    const actor = ukTaxSystem.actors[0];
    const resolved = await app.request(
      `/v1/tax-system/uk/records/${actor.id}`
    );
    expect(resolved.status).toBe(200);
    expect(resolved.headers.get("content-location")).toBe(
      `/v1/tax-system/uk/records/${actor.id}`
    );
    expect(resolved.headers.get("link")).toContain(
      `</v1/tax-system/uk/actors/${actor.id}>; rel="canonical"`
    );
    expect(await resolved.json()).toMatchObject({
      collection: "actors",
      corpusKey: "actors",
      canonicalUrl: `/v1/tax-system/uk/actors/${actor.id}`,
      data: { id: actor.id },
      links: {
        self: `/v1/tax-system/uk/records/${actor.id}`,
        canonical: `/v1/tax-system/uk/actors/${actor.id}`,
      },
    });

    const missing = await app.request(
      "/v1/tax-system/uk/records/record-not-real"
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: "not_found",
      nextActions: [{ href: "/v1/tax-system/uk" }],
    });

    const queried = await app.request(
      `/v1/tax-system/uk/records/${actor.id}?expand=true`
    );
    expect(queried.status).toBe(400);
    expect(await queried.json()).toMatchObject({
      error: "unknown_query_parameter",
      parameters: ["expand"],
    });
  });

  it("uses exact representation ETags after route and query validation", async () => {
    const { app } = mount();
    const first = await app.request("/v1/tax-system/uk/manifest");
    const manifestEtag = first.headers.get("etag");
    expect(manifestEtag).toBeTruthy();

    const graph = await app.request("/v1/tax-system/uk/graph", {
      headers: { "If-None-Match": manifestEtag! },
    });
    const graphEtag = graph.headers.get("etag");
    expect(graph.status).toBe(200);
    expect(graphEtag).toBeTruthy();
    expect(graphEtag).not.toBe(manifestEtag);
    expect((await first.json()).datasetHash).toBe(
      graphEtag!.replace(/^"sha256-/, "sha256:").replace(/"$/, "")
    );

    const second = await app.request("/v1/tax-system/uk/graph", {
      headers: { "If-None-Match": `"not-this-one", W/${graphEtag}` },
    });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe("");
    expect(second.headers.get("etag")).toBe(graphEtag);

    const missing = await app.request(
      "/v1/tax-system/uk/actors/actor-not-real",
      { headers: { "If-None-Match": graphEtag! } }
    );
    expect(missing.status).toBe(404);

    const actors = await app.request("/v1/tax-system/uk/actors");
    const invalid = await app.request("/v1/tax-system/uk/actors?sectro=public", {
      headers: { "If-None-Match": actors.headers.get("etag")! },
    });
    expect(invalid.status).toBe(400);
    expect(invalid.headers.get("cache-control")).toBe("no-store");
  });

  it("publishes schema, a plain dictionary and complete multi-format exports", async () => {
    const { app, sessionCalls } = mount();
    const schema = await app.request("/v1/tax-system/uk/schema");
    const schemaBody = await schema.json();
    expect(schema.status).toBe(200);
    expect(schema.headers.get("content-type")).toContain("application/schema+json");
    expect(schemaBody.properties.pipelineStages.items.properties.nextStageIds).toBeDefined();

    const dictionary = await app.request("/v1/tax-system/uk/dictionary");
    const dictionaryBody = await dictionary.json();
    const accounts = dictionaryBody.collections.find(
      (collection: { pathName: string }) => collection.pathName === "accounts"
    );
    expect(accounts).toMatchObject({ corpusKey: "accountTypes", identityField: "id" });
    expect(accounts.references.operatorActorIds).toBe("actors");
    expect(
      accounts.fields.find((field: { name: string }) => field.name === "operatorActorIds")
    ).toMatchObject({
      type: "array<string>",
      required: true,
      meaning: expect.stringMatching(/actors/),
    });
    expect(accounts.fields.map((field: { name: string }) => field.name)).toEqual(
      expect.arrayContaining(Object.keys(ukTaxSystem.accountTypes[0]))
    );

    const index = await app.request("/v1/tax-system/uk/exports");
    const indexBody = await index.json();
    const actors = indexBody.collections.find(
      (collection: { pathName: string }) => collection.pathName === "actors"
    );
    expect(actors.available).toBe(true);
    expect(actors.formats.csv.filename).toContain(ukTaxSystem.meta.version);

    const json = await app.request("/v1/tax-system/uk/exports/actors/json");
    const ndjson = await app.request("/v1/tax-system/uk/exports/actors/ndjson");
    const csv = await app.request("/v1/tax-system/uk/exports/actors/csv", {
      headers: { Origin: "https://law-stack.example" },
    });
    expect((await json.json()).length).toBe(ukTaxSystem.actors.length);
    const ndjsonRows = (await ndjson.text())
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(ndjsonRows).toHaveLength(ukTaxSystem.actors.length);
    expect((await csv.text()).split("\r\n")[0]).toContain("id");
    expect(csv.headers.get("content-disposition")).toContain("taxsorted-uk-tax-system-actors");
    expect(csv.headers.get("link")).toContain('rel="alternate"');
    expect(csv.headers.get("link")).toContain('rel="license"');
    expect(csv.headers.get("access-control-expose-headers")).toContain("Content-Disposition");
    expect(json.headers.get("etag")).not.toBe(ndjson.headers.get("etag"));
    expect(ndjson.headers.get("etag")).not.toBe(csv.headers.get("etag"));
    expect(json.headers.get("etag")).toBe(actors.formats.json.etag);
    expect(ndjson.headers.get("etag")).toBe(actors.formats.ndjson.etag);
    expect(csv.headers.get("etag")).toBe(actors.formats.csv.etag);

    const unchanged = await app.request("/v1/tax-system/uk/exports/actors/csv", {
      headers: { "If-None-Match": csv.headers.get("etag")! },
    });
    expect(unchanged.status).toBe(304);

    const head = await app.request("/v1/tax-system/uk/exports/actors/csv", {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("content-disposition")).toBe(csv.headers.get("content-disposition"));

    const unsupported = await app.request("/v1/tax-system/uk/exports/actors/xml");
    expect(unsupported.status).toBe(404);
    expect(unsupported.headers.get("cache-control")).toBe("no-store");
    expect(sessionCalls()).toBe(0);
  });

  it("keeps every advertised export link, count and exact-byte ETag true", async () => {
    const { app } = mount();
    const indexResponse = await app.request("/v1/tax-system/uk/exports");
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
      "exports/actors/csv?sector=public",
    ]) {
      const response = await app.request(`/v1/tax-system/uk/${path}`);
      expect(response.status, path).toBe(400);
      expect(response.headers.get("cache-control"), path).toBe("no-store");
      expect(await response.json(), path).toMatchObject({
        error: "unknown_query_parameter",
      });
    }
    const overview = await app.request("/v1/tax-system/uk?ignored=true");
    expect(overview.status).toBe(400);
    expect(overview.headers.get("cache-control")).toBe("no-store");
    const map = await app.request("/v1/tax-system/uk/map");
    expect(map.status).toBe(308);
    expect(map.headers.get("location")).toBe("/v1/tax-system/uk");
    expect(map.headers.get("link")).toContain(
      '</v1/tax-system/uk>; rel="canonical"'
    );
    expect(map.headers.get("link")).not.toContain(
      '</v1/tax-system/uk/map>; rel="canonical"'
    );
    const detailUrl = `/v1/tax-system/uk/actors/${ukTaxSystem.actors[0].id}?ignored=true`;
    for (const method of ["GET", "HEAD"]) {
      const detail = await app.request(detailUrl, { method });
      expect(detail.status, method).toBe(400);
      expect(detail.headers.get("cache-control"), method).toBe("no-store");
    }
  });

  it("owns an immutable release snapshot after route creation", async () => {
    const corpus = structuredClone(ukTaxSystem);
    const expectedActors = corpus.actors.length;
    const app = new Hono();
    app.route(
      "/v1/tax-system/uk",
      createUkTaxSystemRoutes({ corpus, publicDataEnabled: true })
    );
    corpus.actors.length = 0;

    const overview = await (await app.request("/v1/tax-system/uk")).json();
    const graph = await (await app.request("/v1/tax-system/uk/graph")).json();
    expect(overview.counts.actors).toBe(expectedActors);
    expect(graph.actors).toHaveLength(expectedActors);
  });

  it("keeps schema columns in an empty CSV collection", async () => {
    const corpus = structuredClone(ukTaxSystem);
    corpus.relationships = [];
    const app = new Hono();
    app.route(
      "/v1/tax-system/uk",
      createUkTaxSystemRoutes({ corpus, publicDataEnabled: true })
    );

    const csv = await app.request("/v1/tax-system/uk/exports/relationships/csv");
    const ndjson = await app.request(
      "/v1/tax-system/uk/exports/relationships/ndjson"
    );
    expect(await csv.text()).toMatch(/^evidence,explanation,fromActorId,id,/);
    expect(await ndjson.text()).toBe("");
    expect(csv.headers.get("etag")).not.toBe(ndjson.headers.get("etag"));
  });

  it("keeps sources, gaps and manifest open while the production publication gate is closed", async () => {
    const defaultRoute = mount("route-default");
    expect((await defaultRoute.app.request("/v1/tax-system/uk/graph")).status).toBe(503);

    const { app, sessionCalls } = mount(false);
    for (const path of ["sources", "gaps", "manifest", "schema", "dictionary", "exports"]) {
      const response = await app.request(`/v1/tax-system/uk/${path}`);
      expect(response.status, path).toBe(200);
    }

    expect((await app.request("/v1/tax-system/uk/exports/sources/csv")).status).toBe(200);
    expect((await app.request("/v1/tax-system/uk/exports/actors/csv")).status).toBe(503);

    const graph = await app.request("/v1/tax-system/uk/graph");
    expect(graph.status).toBe(503);
    expect(graph.headers.get("cache-control")).toBe("no-store");
    expect((await graph.json()).error).toBe("publication_review_pending");

    const existing = await app.request(`/v1/tax-system/uk/actors/${ukTaxSystem.actors[0].id}`);
    const missing = await app.request("/v1/tax-system/uk/actors/actor-not-real");
    expect(existing.status).toBe(503);
    expect(missing.status).toBe(503);

    const publicSource = await app.request(
      `/v1/tax-system/uk/records/${ukTaxSystem.sources[0].id}`
    );
    const protectedActor = await app.request(
      `/v1/tax-system/uk/records/${ukTaxSystem.actors[0].id}`
    );
    const protectedUnknown = await app.request(
      "/v1/tax-system/uk/records/record-not-real"
    );
    expect(publicSource.status).toBe(200);
    expect(protectedActor.status).toBe(503);
    expect(protectedUnknown.status).toBe(503);
    expect(protectedActor.headers.get("content-type")).toBe(
      protectedUnknown.headers.get("content-type"),
    );
    expect(protectedActor.headers.get("cache-control")).toBe(
      protectedUnknown.headers.get("cache-control"),
    );
    const { instance: _knownInstance, ...knownProblem } =
      await protectedActor.json();
    const { instance: _unknownInstance, ...unknownProblem } =
      await protectedUnknown.json();
    expect(unknownProblem).toEqual(knownProblem);

    const protectedHead = await app.request(
      `/v1/tax-system/uk/records/${ukTaxSystem.actors[0].id}`,
      { method: "HEAD" },
    );
    expect(protectedHead.status).toBe(503);
    expect(await protectedHead.text()).toBe("");

    const unknown = await app.request("/v1/tax-system/uk/not-a-route");
    expect(unknown.status).toBe(404);
    expect(sessionCalls()).toBe(0);
  });

  it("returns a clean evidence-backed 404", async () => {
    const { app } = mount();
    const response = await app.request(
      "/v1/tax-system/uk/permissions/permission-not-real"
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: "not_found",
      collection: "permissions",
      id: "permission-not-real",
    });
  });
});
