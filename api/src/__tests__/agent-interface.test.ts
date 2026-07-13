import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { canonicalJson } from "../open-data.js";
import { noSuchDoorProblem } from "../problem-details.js";
import {
  agentManifestText,
  buildAgentWakePayload,
  createAgentInterfaceRoutes,
} from "../routes/agent-interface.js";
import { buildOpenDataCatalog } from "../routes/open-data.js";

const options = {
  taxSystemPublic: true,
  taxIndustryPublic: false,
  charitiesPublic: true,
  publicFundingPublic: false,
  publicFundingEmergencyStop: true,
  politicsBulkDataAvailable: false,
};

function mount() {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route("/", createAgentInterfaceRoutes(options));
  app.use("/v1/*", async (c, next) => {
    sessionCalls += 1;
    c.header("Set-Cookie", "ts_session=should-not-exist; HttpOnly");
    await next();
  });
  app.get("/v1/probe", (c) => c.json({ reachable: true }));
  app.notFound(noSuchDoorProblem);
  return { app, sessionCalls: () => sessionCalls };
}

describe("agent interface", () => {
  it("recognises only the exact public machine doors", () => {
    for (const path of [
      "/",
      "/agent.txt",
      "/.well-known/agent.txt",
      "/v1/wake",
      "/v1/health",
    ]) {
      expect(isPublicCivicPath(path), path).toBe(true);
    }
    for (const path of [
      "/agent.txt-evil",
      "/.well-known/agent.txt/extra",
      "/v1/wake-up",
      "/v1/healthcheck",
    ]) {
      expect(isPublicCivicPath(path), path).toBe(false);
    }
  });

  it("serves byte-identical API and static manifests with HEAD and ETags", async () => {
    const { app } = mount();
    const primary = await app.request("/agent.txt", {
      headers: { Origin: "https://builder.example", Cookie: "existing=1" },
    });
    const mirror = await app.request("/.well-known/agent.txt");
    const body = await primary.text();

    expect(primary.status).toBe(200);
    expect(primary.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(primary.headers.get("x-schema-version")).toBe(
      "taxsorted.agent-manifest/1",
    );
    expect(primary.headers.get("link")).toContain(
      '</agent.txt>; rel="canonical"; type="text/plain"',
    );
    expect(primary.headers.get("link")).toContain(
      '<https://github.com/cambridgetcg/xenia>; rel="related"; title="XENIA"',
    );
    expect(primary.headers.get("link")).toContain(
      '<https://creativecommons.org/licenses/by-sa/4.0/>; rel="license"; title="Agent doorway content licence"',
    );
    expect(primary.headers.get("access-control-allow-origin")).toBe("*");
    expect(primary.headers.get("set-cookie")).toBeNull();
    expect(primary.headers.get("etag")).toMatch(/^"sha256-/);
    expect(body).toBe(agentManifestText);
    expect(body).toContain(
      "charity-accountability: GET https://api.taxsorted.io/v1/charities/uk/accountability",
    );
    expect(body).toContain(
      "charity-accountability-status: schema-only-not-admitted",
    );
    expect(body).toContain("charity-accountability-records: none");
    expect(body).toContain(
      "tax-expert-manifest: GET https://api.taxsorted.io/v1/uk/tax-expert",
    );
    expect(body).toContain(
      "tax-expert-openapi: GET https://api.taxsorted.io/openapi/tax-expert-uk.json",
    );
    expect(body).toContain(
      "tax-expert-assessment: POST https://api.taxsorted.io/v1/uk/tax-expert/mtd-income-tax/assessments",
    );
    expect(body).toContain(
      "tax-expert-assessment-required-scope: tax-expert:assess",
    );
    expect(body).toContain(
      "tax-expert-assessment-availability: credentialed design partner; no public self-service key provisioning",
    );
    expect(body).toContain(
      "tax-expert-assessment-request-fact-storage: not written to application storage",
    );
    expect(body).toContain(
      "tax-expert-assessment-idempotency: not declared; do not assume automatic retries are safe",
    );
    expect(body).toContain("methods: GET, HEAD, OPTIONS\n");
    expect(body).toContain("methods-scope: this doorway only");
    expect(body).toContain(
      "openapi-public: GET https://api.taxsorted.io/openapi-public.json",
    );
    expect(body).toContain(
      "why-graph-framework: GET https://api.taxsorted.io/v1/why-graph",
    );
    expect(body).toContain(
      "why-graph-adopters: GET https://api.taxsorted.io/v1/why-graph/adopters",
    );
    expect(body).toContain(
      "charity-tax-treatment-why-graph: GET https://api.taxsorted.io/v1/charities/uk/tax-treatments/{id}/why-graph",
    );
    expect(body).toContain(
      "why-graph-schema: GET https://api.taxsorted.io/v1/why-graph/schema",
    );
    expect(body).toContain(
      "why-graph-openapi: GET https://api.taxsorted.io/openapi/why-graph.json",
    );
    expect(body).toContain(
      "why-graph-writes: none; read-only framework with no ingestion route",
    );
    expect(body).toContain(
      "release-ledger: GET https://api.taxsorted.io/v1/open-data/releases",
    );
    expect(body).toContain(
      "format-selection: follow each export index's explicit representation URLs",
    );
    expect(body).toContain("xenia-credit: XENIA by Yu and Fable");
    expect(body).toContain("xenia-conformance-claim: none");
    expect(body).toContain(
      "corrections-account: a GitHub account is required to submit a public correction",
    );
    expect(await mirror.text()).toBe(body);
    expect(mirror.headers.get("etag")).toBe(primary.headers.get("etag"));
    expect(mirror.headers.get("link")).toContain(
      '</agent.txt>; rel="canonical"; type="text/plain"',
    );

    for (const relativePath of [
      "../../../frontend/public/agent.txt",
      "../../../frontend/public/.well-known/agent.txt",
    ]) {
      expect(
        await readFile(new URL(relativePath, import.meta.url), "utf8"),
      ).toBe(body);
    }

    const head = await app.request("/agent.txt", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(primary.headers.get("etag"));

    const unchanged = await app.request("/.well-known/agent.txt", {
      headers: { "If-None-Match": `W/${primary.headers.get("etag")}` },
    });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");
  });

  it("builds one truthful wake projection from the open-data catalog", async () => {
    const { app, sessionCalls } = mount();
    const response = await app.request("/v1/wake", {
      headers: { Origin: "https://builder.example", Cookie: "existing=1" },
    });
    const body = await response.json();
    const catalog = buildOpenDataCatalog(options);

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.agent-wake/1",
    );
    expect(sessionCalls()).toBe(0);
    expect(body).toEqual(buildAgentWakePayload(options));
    expect(body.wallScope).toMatchObject({
      appliesTo: ["/", "/agent.txt", "/.well-known/agent.txt", "/v1/wake"],
      doesNotCertify: expect.stringMatching(/not a service-wide/i),
    });
    expect(body.walls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "publication-controls-hold" }),
        expect.objectContaining({ id: "public-evidence-only" }),
        expect.objectContaining({ id: "no-session-on-doorway" }),
        expect.objectContaining({ id: "no-charity-people-or-belief-graph" }),
        expect.objectContaining({ id: "words-actions-and-analysis-stay-labelled" }),
      ]),
    );
    expect(body.publicationStates).toEqual(
      catalog.datasets.map((dataset) =>
        expect.objectContaining({
          datasetId: dataset.id,
          version: dataset.version,
          status: dataset.publication.status,
          fullDatasetAvailable: dataset.publication.fullDatasetAvailable,
        }),
      ),
    );
    expect(body.publicationStates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          datasetId: "uk-public-funding",
          status: "emergency-stopped",
          fullDatasetAvailable: false,
        }),
      ]),
    );
    expect(body.resources.catalog).toMatchObject({
      href: "/v1/open-data",
      schema: catalog.schema,
      etag: expect.stringMatching(/^"sha256-/),
    });
    expect(body.resources.openApi).toEqual({
      publicHref: "/openapi-public.json",
      fullHref: "/openapi.json",
      datasetSlices: {
        taxSystem: "/openapi/tax-system-uk.json",
        taxIndustry: "/openapi/tax-industry-uk.json",
        charities: "/openapi/charities-uk.json",
        publicFunding: "/openapi/public-funding-uk.json",
        politics: "/openapi/politics-uk.json",
      },
      frameworkSlices: {
        accountability: "/openapi/accountability-uk.json",
        whyGraph: "/openapi/why-graph.json",
      },
      taskSlices: {
        taxExpert: "/openapi/tax-expert-uk.json",
      },
    });
    expect(body.resources.releases).toEqual({
      ledger: "/v1/open-data/releases",
      jsonFeed: "/v1/open-data/releases/feed.json",
      atom: "/v1/open-data/releases/feed.atom",
    });
    expect(body.resources.charityAccountability).toEqual({
      framework: "/v1/charities/uk/accountability",
      schema: "/v1/charities/uk/accountability/schema",
      status: "schema-only-not-admitted",
      recordsAvailable: false,
    });
    expect(body.resources.observerAccountability).toEqual({
      framework: "/v1/accountability/uk",
      schema: "/v1/accountability/uk/schema",
      status: "schema-only-not-admitted",
      recordsAvailable: false,
    });
    expect(body.resources.whyGraph).toEqual({
      framework: "/v1/why-graph",
      adopters: "/v1/why-graph/adopters",
      schema: "/v1/why-graph/schema",
      openApi: "/openapi/why-graph.json",
      graphSchema: "taxsorted.why-graph/1",
      status: "first-adopter",
      adopterCount: 2,
      legacyStatusMeaning:
        "Compatibility marker that MTD was the first adopter; use the adopter index for all current producers.",
      firstAdopter: {
        endpoint: "/v1/uk/tax-expert/mtd-income-tax/assessments",
        responsePath: "/reasoning/whyGraph",
        capabilityVersion: "2026-07-11.5",
        runtimeEmitted: true,
        wireSchemaOptionalForForwardCompatibleV1Readers: true,
      },
      secondAdopter: {
        endpointTemplate:
          "/v1/charities/uk/tax-treatments/{id}/why-graph",
        subjectVersion: "2026-07-13.1",
        runtimeEmitted: true,
        standaloneResource: true,
        publicationControlledBy: "/v1/charities/uk",
        organisationOrCaseFacts: false,
      },
      access: {
        appliesTo: [
          "/v1/why-graph",
          "/v1/why-graph/adopters",
          "/v1/why-graph/schema",
        ],
        methods: ["GET", "HEAD", "OPTIONS"],
        authentication: "none",
        account: "none",
        session: "none",
        cookies: "none",
        writes: "none",
        cors: "*",
      },
      boundaries: {
        createsGraphRecords: false,
        changesExternalState: false,
        infersOfficialAppealRights: false,
        graphIsDerivedNotCanonical: true,
      },
    });
    expect(body.resources.taxExpert).toEqual({
      humanHref: "https://taxsorted.io/uk/tax-expert",
      publicManifest: {
        method: "GET",
        href: "/v1/uk/tax-expert",
        authentication: "none",
      },
      taskContract: {
        method: "GET",
        href: "/openapi/tax-expert-uk.json",
        authentication: "none",
      },
      assessment: {
        operationId: "assessMtdIncomeTaxReadiness",
        method: "POST",
        href: "/v1/uk/tax-expert/mtd-income-tax/assessments",
        kind: "stateless-computation",
        requestContentType: "application/json",
        responseContentType: "application/json",
        authentication: {
          openApiSecurityScheme: "WorkspaceKey",
          type: "http-bearer",
          credential: "TaxSorted workspace key",
          requiredScope: "tax-expert:assess",
        },
        availability: "credentialed-design-partner",
        publicSelfServiceKeyProvisioning: false,
        inputSensitivity: "financial-facts",
        directIdentifiersRequested: false,
        workspaceKeyIdentifiesWorkspace: true,
        requestFactsStorage: "not-written-to-application-storage",
        generatedAnswerStorage: "not-written-to-application-storage",
        usedForTraining: false,
        applicationStateWrite: false,
        externalSubmission: false,
        sessionCreated: false,
        setsCookies: false,
        cache: "no-store",
        intendedClient: "server-to-server",
        browserCors: "not-supported-for-bearer-assessment",
        browserCorsAuthorizationHeaderAllowed: false,
        maxBodyBytes: 16_384,
        repeatabilityBoundary:
          "same-request-facts-trusted-server-evaluation-date-and-admitted-ruleset-source-ledger",
        idempotency: "not-declared",
        errorContract: {
          mediaType: "application/json",
          schema: "TaxExpertApiError",
          requestFactValuesEchoedInErrors: false,
        },
      },
    });
    expect(body.resources.corrections).toEqual({
      href: "https://github.com/cambridgetcg/taxsorted.io/issues",
      accountRequired: true,
      privateOrSensitiveIntakeAvailable: false,
    });
    expect(body.access).toMatchObject({
      scope: "The four machine doorway representations named by access.appliesTo.",
      appliesTo: ["/", "/agent.txt", "/.well-known/agent.txt", "/v1/wake"],
      linkedTaskAccessDeclaredSeparately: true,
      account: "none",
      session: "none",
      cookies: "none",
      writes: "none",
      methods: ["GET", "HEAD", "OPTIONS"],
    });
    expect(body.access.appliesTo).not.toContain(
      "/v1/uk/tax-expert/mtd-income-tax/assessments",
    );
    expect(body.access.methods).not.toContain("POST");
    expect(body.evidenceLanes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "official-sources" }),
        expect.objectContaining({ id: "known-gaps" }),
        expect.objectContaining({ id: "data-contracts" }),
        expect.objectContaining({
          id: "release-history",
          resources: expect.arrayContaining([
            {
              resource: "releaseLedger",
              href: "/v1/open-data/releases",
            },
          ]),
        }),
      ]),
    );
    expect(body.nextActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "read-open-data-catalog",
          method: "GET",
          href: "/v1/open-data",
          accepts: ["application/json"],
        }),
        expect.objectContaining({
          id: "inspect-charity-accountability-contract",
          href: "/v1/charities/uk/accountability",
        }),
        expect.objectContaining({
          id: "inspect-observer-accountability-contract",
          href: "/v1/accountability/uk",
        }),
        expect.objectContaining({
          id: "watch-release-checkpoints",
          href: "/v1/open-data/releases",
        }),
        expect.objectContaining({
          id: "inspect-why-graph-contract",
          method: "GET",
          href: "/v1/why-graph",
        }),
        expect.objectContaining({
          id: "inspect-why-graph-adopters",
          method: "GET",
          href: "/v1/why-graph/adopters",
        }),
        expect.objectContaining({
          id: "inspect-tax-expert-task-contract",
          method: "GET",
          href: "/openapi/tax-expert-uk.json",
        }),
      ]),
    );
    expect(body.attribution).toMatchObject({
      name: "XENIA",
      creators: ["Yu", "Fable"],
      source: "https://github.com/cambridgetcg/xenia",
      licence: { id: "CC-BY-SA-4.0" },
      conformanceClaim: "none",
    });
  });

  it("negotiates the same wake bytes at the API root without replacing its default 404", async () => {
    const { app } = mount();
    const wake = await app.request("/v1/wake");
    const root = await app.request("/", {
      headers: { Accept: "text/html, application/json;q=0.8" },
    });

    expect(root.status).toBe(200);
    expect(await root.text()).toBe(await wake.text());
    expect(root.headers.get("etag")).toBe(wake.headers.get("etag"));
    expect(root.headers.get("content-location")).toBe("/v1/wake");

    const ordinary = await app.request("/", {
      headers: { Accept: "text/html" },
    });
    expect(ordinary.status).toBe(404);
    expect(ordinary.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(await ordinary.json()).toMatchObject({
      type: "https://api.taxsorted.io/problems/no_such_door",
      title: "Resource not found",
      status: 404,
      detail: "No public API route matches this request.",
      instance: "/",
      error: "no_such_door",
      nextActions: [{ method: "GET", href: "/agent.txt" }],
    });

    const rejectedJson = await app.request("/", {
      headers: { Accept: "application/json;q=0, text/html" },
    });
    expect(rejectedJson.status).toBe(404);

    const vendorJsonOnly = await app.request("/", {
      headers: { Accept: "application/problem+json" },
    });
    expect(vendorJsonOnly.status).toBe(404);
  });

  it("supports conditional GET and HEAD on the canonical wake", async () => {
    const { app } = mount();
    const first = await app.request("/v1/wake");
    const etag = first.headers.get("etag")!;

    const head = await app.request("/v1/wake", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(etag);

    const unchanged = await app.request("/v1/wake", {
      headers: { "If-None-Match": `"elsewhere", W/${etag}` },
    });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");
  });

  it("validates queries before ETags and returns a typed recovery action", async () => {
    const { app } = mount();
    const etag = (await app.request("/v1/wake")).headers.get("etag")!;
    const response = await app.request("/v1/wake?z=1&a=2&a=3", {
      headers: { "If-None-Match": etag },
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(response.headers.get("vary")).toContain("Accept");
    expect(response.headers.get("etag")).toBeNull();
    expect(body).toMatchObject({
      type: "https://api.taxsorted.io/problems/unknown_query_parameter",
      title: "Unknown query parameter",
      status: 400,
      detail: "This doorway does not use query parameters.",
      instance: "/v1/wake",
      schema: "taxsorted.agent-error/1",
      error: "unknown_query_parameter",
      message: "This doorway does not use query parameters.",
      method: "GET",
      path: "/v1/wake",
      parameters: ["a", "z"],
      nextActions: [
        {
          id: "retry-without-query",
          method: "GET",
          href: "/v1/wake",
          accepts: ["application/json"],
          description: "Retry the same public resource without a query string.",
        },
      ],
    });

    const manifestError = await app.request("/agent.txt?format=json");
    const manifestErrorBody = await manifestError.json();
    expect(manifestError.status).toBe(400);
    expect(manifestErrorBody.nextActions[0].href).toBe("/agent.txt");
    expect(manifestErrorBody.nextActions[0].accepts).toEqual(["text/plain"]);

    const headError = await app.request("/v1/wake?bad=1", {
      method: "HEAD",
    });
    expect(headError.status).toBe(400);
    expect(await headError.text()).toBe("");

    const legacyMediaType = await app.request(
      "/v1/wake?token=must-not-be-reflected",
      { headers: { Accept: "application/json" } },
    );
    expect(legacyMediaType.headers.get("content-type")).toContain(
      "application/json",
    );
    expect(legacyMediaType.headers.get("content-type")).not.toContain(
      "application/problem+json",
    );
    expect(await legacyMediaType.json()).toMatchObject({
      error: "unknown_query_parameter",
      instance: "/v1/wake",
      parameters: ["token"],
    });
  });

  it("rejects writes with an instructional 405 and leaves downstream routes reachable", async () => {
    const { app } = mount();
    const rejected = await app.request("/v1/wake", { method: "POST" });
    const body = await rejected.json();

    expect(rejected.status).toBe(405);
    expect(rejected.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(rejected.headers.get("cache-control")).toBe("no-store");
    expect(body).toMatchObject({
      schema: "taxsorted.agent-error/1",
      error: "method_not_allowed",
      method: "POST",
      path: "/v1/wake",
      nextActions: [
        expect.objectContaining({
          id: "retry-with-read-method",
          method: "GET",
          href: "/v1/wake",
        }),
      ],
    });

    const downstream = await app.request("/v1/probe");
    expect(downstream.status).toBe(200);
    expect(await downstream.json()).toEqual({ reachable: true });
  });

  it("answers public preflight without admitting near-match paths", async () => {
    const { app } = mount();
    const preflight = await app.request("/v1/wake", {
      method: "OPTIONS",
      headers: {
        Origin: "https://builder.example",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "If-None-Match",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-headers")).toContain(
      "If-None-Match",
    );

    const nearMatch = await app.request("/v1/wake-up", {
      headers: { Origin: "https://builder.example" },
    });
    expect(nearMatch.status).toBe(404);
    expect(nearMatch.headers.get("access-control-allow-origin")).not.toBe("*");
    expect(await nearMatch.json()).toMatchObject({
      status: 404,
      instance: "/v1/wake-up",
      error: "no_such_door",
    });
  });

  it("keeps deterministic exact bytes for equivalent options", () => {
    expect(canonicalJson(buildAgentWakePayload(options))).toBe(
      canonicalJson(buildAgentWakePayload({ ...options })),
    );
  });
});
