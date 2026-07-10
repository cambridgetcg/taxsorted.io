import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { createUkPoliticsRoutes } from "../routes/uk-politics.js";
import {
  enforcementInstitutions,
  enforcementPowerCards,
  enforcementRelationships,
  enforcementTransparencyCollections,
  financeDatasetCatalog,
  integritySources,
  observableOfficialLanguageMethod,
} from "../uk-integrity-system.js";

function sourceReferences(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(sourceReferences);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    key === "sourceIds" && Array.isArray(nested)
      ? nested.filter((id): id is string => typeof id === "string")
      : sourceReferences(nested)
  );
}

function closedPeopleApp() {
  const fetchImpl = vi.fn(async () => {
    throw new Error("Static and closed endpoints must not fetch upstream data.");
  });
  const app = new Hono();
  app.route(
    "/v1/politics/uk",
    createUkPoliticsRoutes({
      publicDataEnabled: false,
      electoralCommissionReuseConfirmed: false,
      ministerialBenefitsEnabled: false,
      enforcementLeadersEnabled: false,
      now: () => new Date("2026-07-10T08:00:00.000Z"),
      fetchImpl,
    })
  );
  return { app, fetchImpl };
}

describe("UK public-integrity data", () => {
  it("resolves every source reference and marks personal source families explicitly", () => {
    const known = new Set(integritySources.map((source) => source.id));
    const references = sourceReferences([
      financeDatasetCatalog,
      enforcementInstitutions,
      enforcementRelationships,
      enforcementPowerCards,
    ]);

    expect(references.length).toBeGreaterThan(40);
    expect([...new Set(references.filter((id) => !known.has(id)))]).toEqual([]);
    expect(integritySources.filter((source) => source.personalData).length).toBeGreaterThan(5);
    expect(
      integritySources
        .filter((source) => source.personalData)
        .every((source) => source.reuse !== "open" || source.id === "contracts-finder-api" || source.id === "find-a-tender-api" || source.id === "police-api")
    ).toBe(true);
  });

  it("keeps every relationship typed, sourced and bounded by a negative constraint", () => {
    for (const relationship of enforcementRelationships) {
      expect(relationship.type).toBeTruthy();
      expect(relationship.sourceIds.length).toBeGreaterThan(0);
      expect(relationship.negativeConstraint.length).toBeGreaterThan(20);
    }
    expect(
      enforcementRelationships.find((relationship) => relationship.id === "ew-pcc-strategy")
        ?.negativeConstraint
    ).toContain("Does not direct an investigation");
  });

  it("calculates office power from seven visible dimensions without scoring people", () => {
    for (const card of enforcementPowerCards) {
      const scores = Object.values(card.scores);
      expect(scores).toHaveLength(7);
      expect(card.calculation.raw).toBe(
        scores.reduce<number>((total, score) => total + score, 0)
      );
      expect(card.calculation.display % 5).toBe(0);
      expect(card.constraints.length).toBeGreaterThan(0);
      expect(card.sourceIds.length).toBeGreaterThan(0);
      expect(card.jurisdiction.length).toBeGreaterThan(0);
      expect(card.lawAsAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(card.methodVersion).toBe("taxsorted.uk.enforcement-office-power/1.0.0-draft");
      expect(card).not.toHaveProperty("holderName");
      expect(card.warning).toContain("office's formal authority");
    }
  });

  it("does not turn official-text metrics into personality or manipulation scores", () => {
    expect(observableOfficialLanguageMethod.status).toContain("blocked");
    expect(observableOfficialLanguageMethod.prohibited).toContain("personality label");
    expect(observableOfficialLanguageMethod.prohibited).toContain("rhetorical manipulation score");
    expect(observableOfficialLanguageMethod.minimumCorpus).toEqual({
      documents: 10,
      words: 5_000,
      dates: 3,
      spanDays: 30,
    });
  });

  it("stores current England and Wales pay ranges as integer minor units", () => {
    const pay = enforcementTransparencyCollections.payAndBenefits.currentEnglandWales;
    expect(pay.effectiveFrom).toBe("2025-09-01");
    expect(pay.rankRanges).toHaveLength(6);
    expect(pay.rankRanges.find((range) => range.rank === "Constable")).toEqual({
      rank: "Constable",
      minimumMinor: 3_116_400,
      maximumMinor: 5_025_600,
    });
    expect(
      pay.rankRanges.every(
        (range) => Number.isSafeInteger(range.minimumMinor) && Number.isSafeInteger(range.maximumMinor)
      )
    ).toBe(true);
  });
});

describe("UK public-integrity publication gates", () => {
  it("keeps institutional methods open while people records stay closed", async () => {
    const { app, fetchImpl } = closedPeopleApp();
    const paths = [
      "/v1/politics/uk/integrity",
      "/v1/politics/uk/integrity/sources",
      "/v1/politics/uk/integrity/corrections",
      "/v1/politics/uk/relationships/schema",
      "/v1/politics/uk/relationships/datasets",
      "/v1/politics/uk/enforcement/institutions",
      "/v1/politics/uk/enforcement/governance",
      "/v1/politics/uk/enforcement/power/offices",
      "/v1/politics/uk/enforcement/private-security",
      "/v1/politics/uk/enforcement/communication-method",
    ];

    for (const path of paths) {
      const response = await app.request(path);
      expect(response.status, path).toBe(200);
      expect(response.headers.get("cache-control"), path).toContain("public");
    }

    const people = await app.request("/v1/politics/uk/people");
    expect(people.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed for ministerial benefits and named police leadership without fetching", async () => {
    const { app, fetchImpl } = closedPeopleApp();
    const benefits = await app.request(
      "/v1/politics/uk/relationships/ministerial-benefits?month=2026-05&department=Home%20Office"
    );
    const leaders = await app.request(
      "/v1/politics/uk/enforcement/forces/metropolitan/leaders"
    );

    expect(benefits.status).toBe(503);
    expect((await benefits.json()).error).toBe("publication_review_needed");
    expect(leaders.status).toBe(503);
    expect((await leaders.json()).error).toBe("publication_review_needed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
