import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createUkPoliticsRoutes } from "../routes/uk-politics.js";
import { officePowerAssessments, politicsSystemData } from "../uk-politics-system.js";

function sourceReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(sourceReferences);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) => {
    if (key === "sourceIds" && Array.isArray(nested)) {
      return nested.filter((id): id is string => typeof id === "string");
    }
    return sourceReferences(nested);
  });
}

function mount(publicDataEnabled: boolean) {
  const app = new Hono();
  app.route(
    "/v1/politics/uk",
    createUkPoliticsRoutes({
      publicDataEnabled,
      electoralCommissionReuseConfirmed: false,
      now: () => new Date("2026-07-10T08:00:00.000Z"),
      fetchImpl: async () => {
        throw new Error("A static system endpoint must not fetch an upstream source.");
      },
    })
  );
  return app;
}

describe("UK political-system API", () => {
  it("keeps non-personal system records readable while the people gate is closed", async () => {
    const app = mount(false);
    const system = await app.request("/v1/politics/uk/system");
    const people = await app.request("/v1/politics/uk/people");

    expect(system.status).toBe(200);
    expect(system.headers.get("cache-control")).toContain("public, max-age=3600");
    expect((await system.json()).schema).toBe("taxsorted.uk.political-system/1");
    expect(people.status).toBe(503);
    expect((await people.json()).error).toBe("publication_review_needed");
  });

  it("publishes the election responsibility chain and separate finance lanes", async () => {
    const app = mount(false);
    const processResponse = await app.request("/v1/politics/uk/elections/process");
    const fundingResponse = await app.request("/v1/politics/uk/funding/rules");
    const process = await processResponse.json();
    const funding = await fundingResponse.json();

    expect(processResponse.status).toBe(200);
    expect(process.stages).toHaveLength(8);
    expect(process.actors.find((actor: { id: string }) => actor.id === "electoral-commission").notResponsibleFor)
      .toContain("Counting Great Britain votes or declaring those results");
    expect(
      process.contactRoutes.find((route: { actorIds: string[] }) =>
        route.actorIds.includes("returning-officer-gb")
      ).contactType
    ).toBe("postcode-selected-institutional-office");
    expect(fundingResponse.status).toBe(200);
    expect(funding.rules.map((rule: { lane: string }) => rule.lane)).toEqual([
      "candidate",
      "registered-party",
      "non-party-campaigner",
      "regulated-funding",
    ]);
  });

  it("exposes auditable office vectors without a global leaderboard", async () => {
    const app = mount(false);
    const listResponse = await app.request("/v1/politics/uk/power/offices");
    const detailResponse = await app.request(
      "/v1/politics/uk/power/offices/uk:office:prime-minister"
    );
    const list = await listResponse.json();
    const detail = await detailResponse.json();

    expect(listResponse.status).toBe(200);
    expect(list.comparison).toContain("no global power sort");
    expect(detailResponse.status).toBe(200);
    expect(detail.assessment.calculation).toEqual({
      raw: 19,
      maximum: 30,
      display: 65,
      band: "major authority",
    });
    expect(detail.assessment.dimensions.enforcement.score).toBe(0);
    expect(detail.sources.some((source: { id: string }) => source.id === "pm-responsibilities")).toBe(true);
    expect(detail.sources.some((source: { id: string }) => source.id === "supply-estimates-manual-2026")).toBe(true);
  });

  it("keeps evidence of corporate relationships separate from claims of influence", async () => {
    const app = mount(false);
    const response = await app.request("/v1/politics/uk/relationships/method");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.rule).toContain("Never convert");
    expect(body.lanes).toHaveLength(6);
    for (const lane of body.lanes) {
      expect(lane.proves).toBeTruthy();
      expect(lane.doesNotProve).toBeTruthy();
      expect(lane.joinRule).toBeTruthy();
    }
  });
});

describe("UK political-system data integrity", () => {
  it("resolves every source reference", () => {
    const known = new Set(politicsSystemData.sources.map((source) => source.id));
    const references = sourceReferences(politicsSystemData);

    expect(references.length).toBeGreaterThan(30);
    expect([...new Set(references.filter((id) => !known.has(id)))]).toEqual([]);
  });

  it("calculates every published rating directly from six visible dimensions", () => {
    for (const assessment of officePowerAssessments) {
      const scores = Object.values(assessment.dimensions).map((dimension) => dimension.score);
      expect(scores).toHaveLength(6);
      expect(assessment.calculation.raw).toBe(
        scores.reduce<number>((sum, score) => sum + score, 0)
      );
      expect(assessment.calculation.display % 5).toBe(0);
      expect(assessment.methodVersion).toBe("1.0.0-draft");
      expect(assessment.jurisdiction.territories.length).toBeGreaterThan(0);
      expect(assessment.lawAsAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(assessment.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(assessment.checks.length).toBeGreaterThan(0);
      for (const dimension of Object.values(assessment.dimensions)) {
        expect(dimension.sourceIds.length).toBeGreaterThan(0);
        expect(dimension.limits.length).toBeGreaterThan(0);
      }
      expect(assessment.researchDepth.deepDomains).toEqual(
        Object.entries(assessment.dimensions)
          .filter(([, dimension]) => dimension.score >= 3)
          .map(([id]) => id)
      );
    }
    expect(
      officePowerAssessments.find(
        (assessment) => assessment.officeId === "uk:office:ukpge-returning-officer-gb"
      )?.calculation
    ).toMatchObject({ raw: 12, display: 40, band: "bounded authority" });
  });
});
