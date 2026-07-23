import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createUkPoliticsRoutes } from "../routes/uk-politics.js";
import {
  publicDecisionPathways,
  publicDecisionPathwaysJsonSchema,
  publicDecisionPathwaysResponseSchema,
  validatePublicDecisionPathwayReferences,
} from "../uk-public-decision-pathways.js";

function mountClosed(bulkDataEmergencyStop = false) {
  const fetchImpl = vi.fn(async () => {
    throw new Error("Public-decision pathway routes must never fetch upstream data.");
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

describe("UK public-decision pathways API", () => {
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

  it("keeps the non-personal power map readable while record gates stay closed", async () => {
    const { app, fetchImpl } = mountClosed();
    const response = await app.request(
      "/v1/politics/uk/public-decision-pathways",
    );
    const body = await response.json();
    const system = await app.request("/v1/politics/uk/system");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=3600, must-revalidate",
    );
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.uk.public-decision-pathways/1",
    );
    expect(response.headers.get("link")).toContain('rel="describedby"');
    expect(response.headers.get("link")).toContain('rel="license"');
    expect(body.schema).toBe("taxsorted.uk.public-decision-pathways/1");
    expect(body.meta.personalisedDecisionPolicy).toMatch(/no personal|no decision/i);
    expect(body.links.humanGuide).toBe(
      "https://taxsorted.io/uk/politics/decisions/",
    );
    expect(body.availability).toEqual({
      status: "open",
      normalPublicationGates: "independent",
      emergencyStop: "politics-bulk-data-emergency-stop",
      methods: ["GET", "HEAD"],
      writes: false,
    });
    expect(body.pathways).toHaveLength(1);
    expect(body.publicDoors).toHaveLength(8);
    expect(body.decisionIntents.length).toBeGreaterThan(5);
    expect(() => publicDecisionPathwaysResponseSchema.parse(body)).not.toThrow();
    expect(system.status).toBe(503);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("keeps the politics emergency stop as the final off-switch", async () => {
    const { app } = mountClosed(true);
    const response = await app.request(
      "/v1/politics/uk/public-decision-pathways",
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("bulk_data_emergency_stop");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not expose future writes or unreviewed child routes", async () => {
    const { app } = mountClosed();
    const write = await app.request(
      "/v1/politics/uk/public-decision-pathways",
      { method: "POST" },
    );
    const unreviewedChild = await app.request(
      "/v1/politics/uk/public-decision-pathways/message-an-official",
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

  it("maps proposal, authorisation, scrutiny, administration and remedy separately", async () => {
    const { app } = mountClosed();
    const response = await app.request(
      "/v1/politics/uk/public-decision-pathways/decisions/uk-central-tax-policy-primary-law",
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pathway.stages).toHaveLength(10);
    expect(body.pathway.powerMap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: "uk-government",
          powerType: "propose-taxation",
        }),
        expect.objectContaining({
          actorId: "house-commons",
          powerType: "authorise-taxation",
        }),
        expect.objectContaining({
          actorId: "hmrc",
          powerType: "administer",
        }),
      ]),
    );
    expect(
      body.actors.find((actor: { id: string }) => actor.id === "house-lords")
        .cannot,
    ).toContain("Amend the Finance Bill");
    expect(
      body.publicDoors.find(
        (door: { id: string }) => door.id === "start-or-sign-petition",
      ),
    ).toMatchObject({
      directEffect: "response-or-debate-threshold",
      taxSortedEffects: "no-storage-no-submission",
    });
    expect(body.eventWindows[0]).toMatchObject({
      id: "finance-bill-2026-27-draft-technical-consultation",
      statusAsAt: "open",
      checkedOn: "2026-07-16",
      closesOn: "2026-09-07",
      legalStatus: "draft-legislation",
      scopeStatus: "partly-fixed",
    });
  });

  it("routes individual appeals and service complaints away from policy advocacy", async () => {
    const { app } = mountClosed();
    const response = await app.request(
      "/v1/politics/uk/public-decision-pathways/decisions",
    );
    const body = await response.json();
    const appeal = body.personalRoutes.find(
      (route: { id: string }) => route.id === "hmrc-tax-decision-appeal-review",
    );
    const complaint = body.personalRoutes.find(
      (route: { id: string }) => route.id === "hmrc-service-complaint",
    );

    expect(response.status).toBe(200);
    expect(appeal.steps[0].deadline).toMatch(/30 days/i);
    expect(appeal.steps[2].deadline).toMatch(/45 days/i);
    expect(appeal.notFor).toMatch(/policy|service/i);
    expect(complaint.notFor).toMatch(/appeal|policy/i);
    expect(
      body.decisionIntents.find(
        (intent: { id: string }) => intent.id === "challenge-my-tax-decision",
      ),
    ).toMatchObject({
      routeType: "personal-route",
      destinationId: "hmrc-tax-decision-appeal-review",
    });
  });

  it("publishes doors, rights, a strict schema and useful missing-ID recovery", async () => {
    const { app } = mountClosed();
    const doorsResponse = await app.request(
      "/v1/politics/uk/public-decision-pathways/doors",
    );
    const doors = await doorsResponse.json();
    const rightsResponse = await app.request(
      "/v1/politics/uk/public-decision-pathways/rights",
    );
    const rights = await rightsResponse.json();
    const schemaResponse = await app.request(
      "/v1/politics/uk/public-decision-pathways/schema",
    );
    const missingResponse = await app.request(
      "/v1/politics/uk/public-decision-pathways/decisions/not-a-decision",
    );
    const missing = await missingResponse.json();

    expect(doorsResponse.status).toBe(200);
    expect(doors.publicDoors).toHaveLength(8);
    expect(doors.selectionRule).toMatch(/not rank|does not rank/i);
    expect(rightsResponse.status).toBe(200);
    expect(rightsResponse.headers.get("x-schema-version")).toBe(rights.schema);
    expect(rights).toMatchObject({
      status: "mixed-rights-read-before-reuse",
      curation: { name: "CC BY-SA 4.0" },
      software: { name: "AGPL-3.0" },
    });
    expect(schemaResponse.status).toBe(200);
    expect(schemaResponse.headers.get("content-type")).toContain(
      "application/schema+json",
    );
    expect((await schemaResponse.json()).$id).toBe(
      publicDecisionPathwaysJsonSchema.$id,
    );
    expect(publicDecisionPathwaysJsonSchema.required).toContain("links");
    expect(missingResponse.status).toBe(404);
    expect(missing.error).toBe("public_decision_pathway_not_found");
    expect(missing.nextActions[0].href).toBe(
      "/v1/politics/uk/public-decision-pathways/decisions",
    );
  });

  it("supports HEAD, conditional reads and complete source resolution", async () => {
    const { app } = mountClosed();
    const first = await app.request(
      "/v1/politics/uk/public-decision-pathways/doors",
    );
    const etag = first.headers.get("etag");
    const conditional = await app.request(
      "/v1/politics/uk/public-decision-pathways/doors",
      { headers: { "If-None-Match": etag ?? "" } },
    );
    const head = await app.request(
      "/v1/politics/uk/public-decision-pathways/schema",
      { method: "HEAD" },
    );

    expect(first.status).toBe(200);
    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe("");
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toMatch(/^"sha256-/);
    expect(() =>
      validatePublicDecisionPathwayReferences(publicDecisionPathways),
    ).not.toThrow();
    expect(publicDecisionPathways.sources.every((source) =>
      source.retrievedAt === publicDecisionPathways.meta.retrievedAt
    )).toBe(true);
    expect(
      publicDecisionPathways.publicDoors.every(
        (door) =>
          door.relevantStageIds.length > 0 &&
          !Object.hasOwn(door, "bestAtStageIds"),
      ),
    ).toBe(true);
  });

  it("fails closed on broken office links and impossible open-window dates", () => {
    const brokenOffice = structuredClone(publicDecisionPathways);
    brokenOffice.pathways[0]!.linkedOfficePaths[0]!.officePathId =
      "unknown-office-path";
    expect(() =>
      validatePublicDecisionPathwayReferences(brokenOffice),
    ).toThrow(/unknown public-office path/i);

    const impossibleWindow = structuredClone(publicDecisionPathways);
    impossibleWindow.eventWindows[0]!.checkedOn = "2026-09-08";
    expect(() =>
      validatePublicDecisionPathwayReferences(impossibleWindow),
    ).toThrow(/cannot be open outside its dated window/i);
  });

  it("uses the current tax-policy principles and labels access analysis honestly", () => {
    const currentPrinciples = publicDecisionPathways.sources.find(
      (source) => source.id === "hmt-tax-policy-principles-2025",
    );
    const accessBarrier = publicDecisionPathways.barriers.find(
      (barrier) => barrier.id === "professional-access-asymmetry",
    );

    expect(currentPrinciples?.status).toBe("current");
    expect(currentPrinciples?.url).toContain("tax-policy-making-principles");
    expect(
      publicDecisionPathways.sources.some(
        (source) => source.title === "Tax consultation framework",
      ),
    ).toBe(false);
    expect(accessBarrier?.mechanismAnalysisStatus).toBe(
      "taxsorted-inference",
    );
    expect(accessBarrier?.generalOptionsStatus).toBe(
      "taxsorted-written-general-guidance",
    );
    expect(accessBarrier?.mechanism).toMatch(/prioritise.*tax professionals/i);
  });

  it("keeps delegated law, petition privacy and judicial review inside honest boundaries", () => {
    const primaryIntent = publicDecisionPathways.decisionIntents.find(
      (intent) => intent.id === "change-tax-rule-for-everyone",
    );
    const secondaryIntent = publicDecisionPathways.decisionIntents.find(
      (intent) => intent.id === "change-secondary-or-unknown-tax-rule",
    );
    const consultationBarrier = publicDecisionPathways.barriers.find(
      (barrier) => barrier.id === "consultation-not-guaranteed",
    );
    const petition = publicDecisionPathways.publicDoors.find(
      (door) => door.id === "start-or-sign-petition",
    );
    const appeal = publicDecisionPathways.personalRoutes.find(
      (route) => route.id === "hmrc-tax-decision-appeal-review",
    );

    expect(primaryIntent?.title).toMatch(/primary legislation/i);
    expect(primaryIntent?.doNotUseWhen).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/regulations.*order.*delegated power/i),
      ]),
    );
    expect(secondaryIntent).toMatchObject({
      routeType: "coverage-gap",
      destinationId: "secondary-tax-legislation",
    });
    expect(consultationBarrier?.mechanism).toMatch(
      /simple rate or threshold.*forestalling risk/i,
    );
    expect(consultationBarrier?.mechanism).not.toMatch(/avoidance/i);
    expect(petition?.privacyAndPublication).toMatch(
      /creator's name is published/i,
    );
    expect(petition?.sourceIds).toContain("parliament-petitions-privacy");
    expect(appeal?.steps).toHaveLength(4);
    expect(appeal?.exceptionalRoutes[0]).toMatchObject({
      id: "judicial-review-parallel-route",
      territory: "England and Wales court procedure only",
    });
    expect(appeal?.exceptionalRoutes[0]?.timing).toMatch(
      /promptly.*three months/i,
    );
    expect(appeal?.exceptionalRoutes[0]?.caution).toMatch(
      /Scotland and Northern Ireland.*different court procedures/i,
    );
    expect(
      publicDecisionPathways.barriers.every(
        (barrier) =>
          barrier.generalOptionsStatus ===
            "taxsorted-written-general-guidance" &&
          barrier.generalLowerFrictionOptions.length > 0,
      ),
    ).toBe(true);
  });
});
