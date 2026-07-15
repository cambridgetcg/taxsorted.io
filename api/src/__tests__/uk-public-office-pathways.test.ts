import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createUkPoliticsRoutes } from "../routes/uk-politics.js";
import {
  publicOfficePathways,
  publicOfficePathwaysJsonSchema,
  publicOfficePathwaysResponseSchema,
  validatePublicOfficePathwaySourceReferences,
} from "../uk-public-office-pathways.js";

function mountClosed(bulkDataEmergencyStop = false) {
  const fetchImpl = vi.fn(async () => {
    throw new Error("Public-office pathway routes must never fetch upstream data.");
  });
  const app = new Hono();
  app.route(
    "/v1/politics/uk",
    createUkPoliticsRoutes({
      publicDataEnabled: false,
      bulkDataEnabled: false,
      bulkDataEmergencyStop,
      electoralCommissionReuseConfirmed: false,
      fetchImpl,
    }),
  );
  return { app, fetchImpl };
}

describe("UK public-office pathways API", () => {
  it("ships the reviewed politics corpus in the production API image", () => {
    const dockerfile = readFileSync(
      fileURLToPath(new URL("../../Dockerfile", import.meta.url)),
      "utf8",
    );
    const dockerignore = readFileSync(
      fileURLToPath(new URL("../../../.dockerignore", import.meta.url)),
      "utf8",
    );

    expect(dockerfile).toContain(
      "COPY research/uk/politics/data/ research/uk/politics/data/",
    );
    expect(dockerignore).toContain("!research/uk/politics/data/**");
  });

  it("keeps this narrow, non-personal rules guide readable while bulk and people gates are closed", async () => {
    const { app, fetchImpl } = mountClosed();
    const response = await app.request(
      "/v1/politics/uk/public-office-pathways",
    );
    const body = await response.json();
    const system = await app.request("/v1/politics/uk/system");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("public");
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.uk.public-office-pathways/1",
    );
    expect(body.schema).toBe("taxsorted.uk.public-office-pathways/1");
    expect(body.meta.personalisedDecisionPolicy).toMatch(/never|does not/i);
    expect(body.links.humanGuide).toBe(
      "https://taxsorted.io/uk/politics/stand/",
    );
    expect(body.availability).toEqual({
      status: "open",
      normalPublicationGates: "independent",
      emergencyStop: "politics-bulk-data-emergency-stop",
      methods: ["GET", "HEAD"],
      writes: false,
    });
    expect(body.links.rights).toBe(
      "/v1/politics/uk/public-office-pathways/rights",
    );
    expect(response.headers.get("link")).toContain('rel="license"');
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=3600, must-revalidate",
    );
    expect(body.officePaths).toHaveLength(2);
    expect(() => publicOfficePathwaysResponseSchema.parse(body)).not.toThrow();
    expect(response.headers.get("link")).toContain('rel="describedby"');
    expect(system.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps the politics emergency stop as a real off-switch", async () => {
    const { app } = mountClosed(true);
    const response = await app.request(
      "/v1/politics/uk/public-office-pathways",
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("bulk_data_emergency_stop");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not let future writes or new child routes inherit the read-only gate exemption", async () => {
    const { app } = mountClosed();
    const write = await app.request(
      "/v1/politics/uk/public-office-pathways",
      { method: "POST" },
    );
    const unreviewedChild = await app.request(
      "/v1/politics/uk/public-office-pathways/eligibility-evaluator",
    );

    expect(write.status).toBe(503);
    expect((await write.json()).error).toBe(
      "bulk_data_publication_review_needed",
    );
    expect(unreviewedChild.status).toBe(503);
    expect((await unreviewedChild.json()).error).toBe(
      "bulk_data_publication_review_needed",
    );
  });

  it("returns office-specific nomination and pay rules without flattening them", async () => {
    const { app } = mountClosed();
    const mpResponse = await app.request(
      "/v1/politics/uk/public-office-pathways/offices/uk-mp-great-britain",
    );
    const councillorResponse = await app.request(
      "/v1/politics/uk/public-office-pathways/offices/england-principal-councillor",
    );
    const mp = (await mpResponse.json()).office;
    const councillor = (await councillorResponse.json()).office;

    expect(mpResponse.status).toBe(200);
    expect(councillorResponse.status).toBe(200);
    expect(mpResponse.headers.get("link")).not.toContain('rel="describedby"');
    expect(mp.nomination.subscribers.count).toBe(10);
    expect(mp.nomination.deposit).toMatchObject({
      applicable: true,
      amountMinor: 50_000,
    });
    expect(mp.remuneration).toMatchObject({
      kind: "national-salary",
      amountMinor: 9_859_900,
    });
    expect(councillor.nomination.subscribers.count).toBe(2);
    expect(councillor.nomination.deposit).toMatchObject({
      applicable: false,
      amountMinor: null,
    });
    expect(councillor.remuneration.kind).toBe("local-allowance-scheme");
    expect(mp.finance.reportingDeadlines.map((item: { id: string }) => item.id)).toContain(
      "mp-candidate-personal-expenses",
    );
    expect(councillor.finance.reportingDeadlines.map((item: { id: string }) => item.id)).toContain(
      "local-candidate-personal-expenses",
    );
    expect(
      mp.finance.reportingDeadlines.find(
        (item: { id: string }) => item.id === "mp-candidate-declaration",
      ).due,
    ).toMatch(/14 days after returning/i);
    expect(councillor.nomination.consentTiming).toMatch(/one calendar month/i);
    expect(councillor.agent.appointmentDeadlineExpression).toMatch(
      /4pm on the nineteenth working day/i,
    );
    expect(
      councillor.eligibility.rules.find(
        (item: { id: string }) => item.id === "local-elector-route-continuity",
      ),
    ).toMatchObject({ appliesAt: "while-in-office" });
    expect(
      mp.nomination.documents.find(
        (item: { id: string }) => item.id === "mp-consent-form",
      ).deliveryExceptions,
    ).toEqual(expect.arrayContaining([expect.stringMatching(/electronically/i)]));
    expect(councillor.remuneration.sourceIds).toContain(
      "hmrc-councillor-tax-treatment",
    );
    expect(councillor.finance.spendingLimit.warning).toMatch(
      /21 November 2023/i,
    );
    expect(councillor.finance.spendingLimit.warning).not.toMatch(/2 April 2026/i);
    expect(mp.finance.enforcement.join(" ")).toMatch(
      /£100 for each day they sit or vote/i,
    );
    expect(councillor.finance.enforcement.join(" ")).toMatch(
      /£50 for each day they sit or vote/i,
    );
    expect(
      mp.eligibility.disqualifications
        .map((item: { plainLanguage: string }) => item.plainLanguage)
        .join(" "),
    ).toMatch(/while detained in a listed territory or unlawfully at large/i);
    expect(
      councillor.eligibility.disqualifications
        .map((item: { plainLanguage: string }) => item.plainLanguage)
        .join(" "),
    ).not.toMatch(/controlled body|company it controls/i);
    expect(mp.nomination.delivery.join(" ")).toMatch(
      /party authorisation.*may be posted/i,
    );
    expect(councillor.nomination.delivery.join(" ")).toMatch(
      /party authorisation.*may be posted/i,
    );
    expect(
      mp.nomination.documents.find(
        (item: { id: string }) => item.id === "mp-party-certificate",
      ).deliveryExceptions,
    ).toEqual(expect.arrayContaining([expect.stringMatching(/may be posted/i)]));
  });

  it("publishes support, barriers, a strict schema and useful missing-ID recovery", async () => {
    const { app } = mountClosed();
    const supportResponse = await app.request(
      "/v1/politics/uk/public-office-pathways/support",
    );
    const support = await supportResponse.json();
    const rightsResponse = await app.request(
      "/v1/politics/uk/public-office-pathways/rights",
    );
    const rights = await rightsResponse.json();
    const schemaResponse = await app.request(
      "/v1/politics/uk/public-office-pathways/schema",
    );
    const missingResponse = await app.request(
      "/v1/politics/uk/public-office-pathways/offices/not-an-office",
    );
    const missing = await missingResponse.json();

    expect(supportResponse.status).toBe(200);
    expect(support.barriers.length).toBeGreaterThan(3);
    expect(support.supportRoutes.length).toBeGreaterThan(2);
    expect(support.sources.length).toBeGreaterThan(2);
    expect(rightsResponse.status).toBe(200);
    expect(rightsResponse.headers.get("x-schema-version")).toBe(rights.schema);
    expect(rights).toMatchObject({
      status: "mixed-rights-read-before-reuse",
      curation: { name: "CC BY-SA 4.0" },
      software: { name: "AGPL-3.0" },
    });
    expect(rights.sourceResolution).toMatch(/embeds the source records/i);
    expect(schemaResponse.status).toBe(200);
    expect(schemaResponse.headers.get("content-type")).toContain(
      "application/schema+json",
    );
    expect((await schemaResponse.json()).$id).toBe(
      publicOfficePathwaysJsonSchema.$id,
    );
    expect(publicOfficePathwaysJsonSchema.required).toContain("links");
    expect(missingResponse.status).toBe(404);
    expect(missing.error).toBe("public_office_pathway_not_found");
    expect(missing.nextActions[0].href).toBe(
      "/v1/politics/uk/public-office-pathways/offices",
    );
  });

  it("supports conditional reads and resolves every source ID", async () => {
    const { app } = mountClosed();
    const first = await app.request(
      "/v1/politics/uk/public-office-pathways/offices",
    );
    const unchanged = await app.request(
      "/v1/politics/uk/public-office-pathways/offices",
      { headers: { "If-None-Match": `W/${first.headers.get("etag")}` } },
    );
    const head = await app.request(
      "/v1/politics/uk/public-office-pathways/offices",
      { method: "HEAD" },
    );

    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(first.headers.get("etag"));
    expect(() =>
      validatePublicOfficePathwaySourceReferences(publicOfficePathways),
    ).not.toThrow();
    expect(
      publicOfficePathways.legalWatch.map((item) => item.status),
    ).toEqual(
      expect.arrayContaining(["proposed"]),
    );
    expect(publicOfficePathways.officePaths.every((office) => office.routes.some((route) => route.kind === "independent"))).toBe(true);
  });
});
