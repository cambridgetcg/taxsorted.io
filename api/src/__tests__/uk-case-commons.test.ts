import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { canonicalJson, representationEtag } from "../open-data.js";
import { createUkCaseCommonsRoutes } from "../routes/uk-case-commons.js";
import {
  caseAssessmentSchema,
  caseAssessmentTemplateSchema,
  caseCommonsCorpusDigest,
  caseCommonsResponseSchema,
  evaluateCaseCommonsPublicationApproval,
  makeCaseCommonsPacket,
  sourcesForCaseCommonsValue,
  ukCaseCommons,
  ukCaseCommonsPublicationApproval,
  ukCaseCommonsPublicationDecision,
  ukCaseCommonsSchema,
  validateUkCaseCommons,
  type UkCaseCommons,
} from "../uk-case-commons.js";

function mount(
  publicDataEnabled = true,
  emergencyStop = false,
  stoppedCaseIds: string[] = [],
) {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/case-commons/uk",
    createUkCaseCommonsRoutes({
      corpus: ukCaseCommons,
      publicDataEnabled,
      emergencyStop,
      stoppedCaseIds,
    }),
  );
  app.use("/v1/*", async (c, next) => {
    sessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    await next();
  });
  return { app, sessionCalls: () => sessionCalls };
}

describe("UK case commons", () => {
  it("ships the reviewed corpus in the production API image", () => {
    const dockerfile = readFileSync(
      fileURLToPath(new URL("../../Dockerfile", import.meta.url)),
      "utf8",
    );
    const dockerignore = readFileSync(
      fileURLToPath(new URL("../../../.dockerignore", import.meta.url)),
      "utf8",
    );

    expect(dockerfile).toContain(
      "COPY research/uk/case-commons/data/ research/uk/case-commons/data/",
    );
    expect(dockerignore).toContain("!research/uk/case-commons/data/**");
  });

  it("binds production publication to the exact corpus and reviewed case IDs", async () => {
    expect(ukCaseCommonsPublicationDecision).toMatchObject({
      approved: true,
      approvedCaseIds: ["haworth-v-hmrc-2021"],
      corpusDigest: caseCommonsCorpusDigest(ukCaseCommons),
    });
    expect(
      evaluateCaseCommonsPublicationApproval(
        ukCaseCommons,
        ukCaseCommonsPublicationApproval,
      ).approved,
    ).toBe(true);

    const changedCorpus = structuredClone(ukCaseCommons) as UkCaseCommons;
    changedCorpus.meta.title = "Changed without a new publication approval";
    const app = new Hono();
    app.route(
      "/v1/case-commons/uk",
      createUkCaseCommonsRoutes({
        corpus: changedCorpus,
        publicDataEnabled: true,
      }),
    );

    const cases = await app.request("/v1/case-commons/uk/cases");
    const problem = await cases.json();
    expect(cases.status).toBe(503);
    expect(problem.error).toBe("publication_review_pending");

    const sources = await (
      await app.request("/v1/case-commons/uk/sources")
    ).json();
    expect(sources.scope).toBe("method-only-during-publication-review");
    expect(JSON.stringify(sources.sources)).not.toMatch(
      /Haworth|8,786,288|uksc-haworth/i,
    );
  });

  it("publishes one decided case with no intake, market or prediction", async () => {
    const { app, sessionCalls } = mount();
    const response = await app.request("/v1/case-commons/uk");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.uk.case-commons/1",
    );
    expect(response.headers.get("link")).toContain('rel="license"');
    expect(response.headers.get("link")).toContain('rel="service-desc"');
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(sessionCalls()).toBe(0);
    expect(body.cases).toHaveLength(1);
    expect(body.availability).toMatchObject({
      status: "open",
      stoppedCaseCount: 0,
    });
    expect(body.availability).not.toHaveProperty("stoppedCaseIds");
    expect(body.cases[0]).toMatchObject({
      id: "haworth-v-hmrc-2021",
      caseStatus: "decided",
      publicationStatus: "admitted-decided-public-record",
      financialEffect: {
        damagesAward: {
          status: "none-identified",
          amountPence: null,
        },
        successProbabilityPublished: false,
      },
    });
    expect(body.publication).toMatchObject({
      writes: false,
      publicIntake: false,
      professionalMarketplace: false,
      confidentialCorrectionChannel: null,
    });
    expect(body.protocol.marketplaceBoundary.status).toBe(
      "closed-pending-regulatory-review",
    );
    expect(() => caseCommonsResponseSchema.parse(body)).not.toThrow();
  });

  it("keeps amount affected, contingent exposure and recovery separate", () => {
    const caseRecord = ukCaseCommons.cases[0]!;
    const amounts = Object.fromEntries(
      caseRecord.financialEffect.documentedAmounts.map((amount) => [
        amount.id,
        amount,
      ]),
    );

    expect(amounts["accelerated-demand"]?.amountPence).toBe(878_628_840);
    expect(amounts["accelerated-demand"]?.notMeaning).toMatch(
      /not money awarded.*not a refund.*not net gain/i,
    );
    expect(amounts["then-potential-penalty-low"]?.amountPence).toBe(
      87_862_884,
    );
    expect(amounts["then-potential-penalty-high"]?.amountPence).toBe(
      439_314_420,
    );
    expect(caseRecord.financialEffect.netRecovery).toMatchObject({
      status: "not-established",
      amountPence: null,
    });
    expect(caseRecord.financialEffect.downside.minimumScenario).toMatch(
      /£0.*negative/i,
    );
  });

  it("returns a stable complete packet and says exactly what its digest proves", async () => {
    const firstPacket = makeCaseCommonsPacket("haworth-v-hmrc-2021")!;
    const secondPacket = makeCaseCommonsPacket("haworth-v-hmrc")!;
    expect(firstPacket.integrity.digest).toBe(secondPacket.integrity.digest);
    expect(firstPacket.integrity.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(firstPacket.integrity.doesNotProve).toMatch(
      /truth.*source freshness.*professional status/i,
    );
    expect(firstPacket.sources.length).toBe(ukCaseCommons.sources.length);

    const { app } = mount();
    const response = await app.request(
      "/v1/case-commons/uk/cases/haworth-v-hmrc-2021",
    );
    const packet = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("x-checksum-sha256")).toBe(
      representationEtag(canonicalJson(firstPacket)).slice('"sha256-'.length, -1),
    );
    expect(packet.integrity.digest).toBe(firstPacket.integrity.digest);
    expect(packet.case.id).toBe("haworth-v-hmrc-2021");
    expect(packet.sources.map((source: { id: string }) => source.id)).toEqual(
      sourcesForCaseCommonsValue({
        protocol: ukCaseCommons.protocol,
        case: ukCaseCommons.cases[0],
      }).map((source) => source.id),
    );
  });

  it("publishes a blank local assessment with no submission endpoint", async () => {
    const { app } = mount(false);
    const response = await app.request(
      "/v1/case-commons/uk/assessment-template",
    );
    const template = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("link")).toContain(
      "/v1/case-commons/uk/assessment-schema",
    );
    expect(template).toMatchObject({
      status: "local-template-not-submitted",
      privacy: {
        containsClientFacts: false,
        taxSortedSubmissionEndpoint: null,
        storage: "your-local-or-approved-matter-system",
      },
    });
    expect(template.assessor.registrationId).toBe("");
    expect(template.checks.every(
      (check: { state: string; privateMatterFileNote: string }) =>
        check.state === "not-assessed" &&
        check.privateMatterFileNote === "",
    )).toBe(true);
    expect(() => caseAssessmentTemplateSchema.parse(template)).not.toThrow();
    expect(() => caseAssessmentSchema.parse(template)).not.toThrow();

    const completed: Record<string, any> = structuredClone(template);
    completed.status = "local-assessment-private-complete";
    completed.casePacket = {
      caseId: "haworth-v-hmrc-2021",
      corpusVersion: ukCaseCommons.meta.version,
      sha256: makeCaseCommonsPacket("haworth-v-hmrc-2021")!.integrity.digest,
      verifiedOn: "2026-07-24",
    };
    completed.assessor = {
      professionalStatus: "register-checked",
      regulator: "Example regulator checked independently",
      registrationId: "example-id",
      registerCheckedOn: "2026-07-24",
      competenceConfirmed: true,
      conflictsChecked: true,
    };
    completed.instruction = {
      prospectiveClientConsentConfirmed: true,
      identityAndAuthorityChecked: true,
      confidentialChannelAgreed: true,
    };
    completed.checks = completed.checks.map(
      (check: Record<string, unknown>) => ({
        ...check,
        state: "supports-further-review",
        privateMatterFileNote:
          "Example private note, never sent to TaxSorted.",
      }),
    );
    completed.decision = {
      state: "needs-evidence",
      decidedOn: "2026-07-24",
      reasonsKeptInPrivateMatterFile: true,
      zeroOrNegativeFinancialScenarioConsidered: true,
    };
    completed.privacy.containsClientFacts = true;

    expect(() => caseAssessmentSchema.parse(completed)).not.toThrow();
    expect(() => caseAssessmentTemplateSchema.parse(completed)).toThrow();
  });

  it("closes only case packets while method, sources and schemas remain inspectable", async () => {
    for (const emergencyStop of [false, true]) {
      const { app } = mount(false, emergencyStop);
      const collection = await app.request("/v1/case-commons/uk/cases");
      const problem = await collection.json();
      expect(collection.status).toBe(503);
      expect(problem.error).toBe(
        emergencyStop
          ? "publication_emergency_stop"
          : "publication_review_pending",
      );
      expect((await app.request("/v1/case-commons/uk/method")).status).toBe(200);
      const sourcesResponse = await app.request(
        "/v1/case-commons/uk/sources",
      );
      const sources = await sourcesResponse.json();
      expect(sourcesResponse.status).toBe(200);
      expect(sources.scope).toBe(
        emergencyStop
          ? "method-only-during-emergency-stop"
          : "method-only-during-publication-review",
      );
      expect(sources.availability).toBe(
        emergencyStop ? "emergency-stopped" : "publication-review",
      );
      expect(sources.stoppedCaseCount).toBe(0);
      expect(sources).not.toHaveProperty("stoppedCaseIds");
      expect(JSON.stringify(sources.sources)).not.toMatch(
        /Haworth|8,786,288|uksc-haworth/i,
      );
      expect((await app.request("/v1/case-commons/uk/schema")).status).toBe(200);
      expect(
        (await app.request("/v1/case-commons/uk/packet-schema")).status,
      ).toBe(200);
    }
  });

  it("can stop one stable case independently and removes its facts from API discovery", async () => {
    const { app } = mount(true, false, ["haworth-v-hmrc-2021"]);
    const root = await app.request("/v1/case-commons/uk");
    const rootProblem = await root.json();
    const cases = await app.request("/v1/case-commons/uk/cases");
    const casesProblem = await cases.json();
    const detail = await app.request(
      "/v1/case-commons/uk/cases/haworth-v-hmrc",
    );
    const problem = await detail.json();
    const unknownDetail = await app.request(
      "/v1/case-commons/uk/cases/not-a-case",
    );
    const unknownProblem = await unknownDetail.json();
    const sourcesResponse = await app.request(
      "/v1/case-commons/uk/sources",
    );
    const sources = await sourcesResponse.json();

    expect(root.status).toBe(503);
    expect(cases.status).toBe(503);
    expect(detail.status).toBe(503);
    expect(unknownDetail.status).toBe(503);
    for (const generalProblem of [rootProblem, casesProblem]) {
      expect(generalProblem).toMatchObject({
        error: "case_publication_stop",
        availability: "case-level-stops-active",
        stoppedCaseCount: 1,
      });
      expect(generalProblem).not.toHaveProperty("stoppedCaseIds");
      expect(generalProblem).not.toHaveProperty("requestedCaseId");
      expect(JSON.stringify(generalProblem)).not.toContain(
        "haworth-v-hmrc-2021",
      );
    }
    for (const detailProblem of [problem, unknownProblem]) {
      expect(detailProblem).toMatchObject({
        error: "case_publication_stop",
        availability: "case-level-stops-active",
        stoppedCaseCount: 1,
      });
      expect(detailProblem).not.toHaveProperty("stoppedCaseIds");
      expect(detailProblem).not.toHaveProperty("requestedCaseId");
    }
    expect(sources.scope).toBe("method-only-during-case-level-stop");
    expect(sources).toMatchObject({
      availability: "case-level-stops-active",
      stoppedCaseCount: 1,
    });
    expect(sources).not.toHaveProperty("stoppedCaseIds");
    expect(JSON.stringify(sources.sources)).not.toMatch(
      /Haworth|8,786,288|uksc-haworth/i,
    );
    expect((await app.request("/v1/case-commons/uk/method")).status).toBe(200);
  });

  it.each(["not-a-case", "NOT A CASE"])(
    "keeps the API alive and closes case publication for an invalid stop value: %s",
    async (configuredStopId) => {
      const app = new Hono();
      app.get("/v1/health", (c) => c.json({ ok: true }));

      expect(() =>
        app.route(
          "/v1/case-commons/uk",
          createUkCaseCommonsRoutes({
            corpus: ukCaseCommons,
            publicDataEnabled: true,
            stoppedCaseIds: [configuredStopId],
          }),
        ),
      ).not.toThrow();

      const health = await app.request("/v1/health");
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ ok: true });

      for (const path of [
        "/v1/case-commons/uk",
        "/v1/case-commons/uk/cases",
        "/v1/case-commons/uk/cases/caller-supplied-value",
      ]) {
        const response = await app.request(path);
        const problem = await response.json();
        expect(response.status).toBe(503);
        expect(problem).toMatchObject({
          error: "case_publication_stop",
          availability: "case-level-stops-active",
          stoppedCaseCount: 1,
        });
        expect(problem).not.toHaveProperty("stoppedCaseIds");
        expect(problem).not.toHaveProperty("requestedCaseId");
        expect(JSON.stringify(problem)).not.toContain(configuredStopId);
      }

      const sourcesResponse = await app.request(
        "/v1/case-commons/uk/sources",
      );
      const sources = await sourcesResponse.json();
      expect(sourcesResponse.status).toBe(200);
      expect(sources).toMatchObject({
        scope: "method-only-during-case-level-stop",
        availability: "case-level-stops-active",
        stoppedCaseCount: 1,
      });
      expect(sources).not.toHaveProperty("stoppedCaseIds");
      expect(JSON.stringify(sources.sources)).not.toMatch(
        /Haworth|8,786,288|uksc-haworth/i,
      );
      expect(
        (await app.request("/v1/case-commons/uk/method")).status,
      ).toBe(200);
    },
  );

  it("supports conditional reads, HEAD and useful missing-case recovery", async () => {
    const { app } = mount();
    const first = await app.request("/v1/case-commons/uk/cases");
    const conditional = await app.request("/v1/case-commons/uk/cases", {
      headers: { "If-None-Match": first.headers.get("etag") ?? "" },
    });
    const head = await app.request("/v1/case-commons/uk/schema", {
      method: "HEAD",
    });
    const missing = await app.request(
      "/v1/case-commons/uk/cases/not-a-case",
    );
    const problem = await missing.json();

    expect(conditional.status).toBe(304);
    expect(await conditional.text()).toBe("");
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(missing.status).toBe(404);
    expect(problem.error).toBe("case_not_found");
    expect(problem.nextActions[0].href).toBe(
      "/v1/case-commons/uk/cases",
    );
    expect(
      first.headers.get("cache-control"),
    ).toBe("public, max-age=0, must-revalidate");
  });

  it("rejects query strings and keeps the namespace public and read-only", async () => {
    const { app } = mount();
    const query = await app.request(
      "/v1/case-commons/uk/cases?person=somebody",
    );
    const problem = await query.json();
    const write = await app.request("/v1/case-commons/uk/cases", {
      method: "POST",
      body: JSON.stringify({ allegation: "not accepted" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(query.status).toBe(400);
    expect(problem.error).toBe("unknown_query_parameter");
    expect(problem.parameters).toEqual(["person"]);
    expect(write.status).toBe(404);
    expect(isPublicCivicPath("/v1/case-commons/uk/cases")).toBe(true);
    expect(isPublicCivicPath("/openapi/case-commons-uk.json")).toBe(true);
  });

  it("fails closed on dangling sources, unknown fields and probability-shaped fields", () => {
    const dangling = structuredClone(ukCaseCommons) as UkCaseCommons;
    dangling.cases[0]!.findings[0]!.sourceIds = ["not-a-source"];
    expect(() => validateUkCaseCommons(dangling)).toThrow(
      /unknown source not-a-source/i,
    );

    const ambiguous = structuredClone(ukCaseCommons) as UkCaseCommons;
    ambiguous.cases.push({
      ...structuredClone(ambiguous.cases[0]!),
      id: "second-case",
      slug: ambiguous.cases[0]!.id,
    });
    expect(() => validateUkCaseCommons(ambiguous)).toThrow(
      /identifier haworth-v-hmrc-2021 is ambiguous/i,
    );

    const unknown = structuredClone(ukCaseCommons) as unknown as Record<
      string,
      any
    >;
    unknown.cases[0].privateEmail = "must never survive";
    expect(() => ukCaseCommonsSchema.parse(unknown)).toThrow(/Unrecognized key/);

    const probability = structuredClone(ukCaseCommons) as unknown as Record<
      string,
      any
    >;
    probability.cases[0].successProbability = 0.8;
    expect(() => ukCaseCommonsSchema.parse(probability)).toThrow(
      /Unrecognized key/,
    );

  });
});
