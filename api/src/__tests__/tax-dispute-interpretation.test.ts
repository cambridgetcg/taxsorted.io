import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { apiCors, isPublicCivicPath } from "../cors.js";
import { createUkCaseCommonsRoutes } from "../routes/uk-case-commons.js";
import {
  makeTaxDisputeDerivedRelease,
  taxDisputeInterpretationSchema,
  taxDisputeTrainingBundleSchema,
  taxDisputeTrainingExampleSchema,
  taxDisputeWhyGraphSchema,
  ukTaxDisputeInterpretationPublicationApproval,
  type TaxDisputeInterpretationPublicationApproval,
} from "../uk-tax-dispute-interpretation.js";
import {
  caseCommonsCorpusDigest,
  ukCaseCommons,
  type UkCaseCommons,
} from "../uk-case-commons.js";

const testDerivedRelease = makeTaxDisputeDerivedRelease(
  ukCaseCommons.cases,
  ukCaseCommons,
);
const approvedInterpretationRelease = {
  schema:
    "taxsorted.uk.tax-dispute-interpretation-publication-approval/1",
  status: "approved-for-publication",
  decisionRecordedOn: "2026-07-28",
  frameworkVersion: testDerivedRelease.release.frameworkVersion,
  corpusVersion: testDerivedRelease.release.corpusVersion,
  releaseDigest: testDerivedRelease.release.digest,
  caseIds: testDerivedRelease.release.cases.map(({ caseId }) => caseId),
  effects: "Test-only approval of the exact deterministic derived release.",
} satisfies TaxDisputeInterpretationPublicationApproval;

function mount(
  publicDataEnabled = true,
  emergencyStop = false,
  stoppedCaseIds: string[] = [],
  interpretationPublicationApproval:
    TaxDisputeInterpretationPublicationApproval =
    approvedInterpretationRelease,
  interpretationEmergencyStop = false,
) {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/case-commons/uk",
    createUkCaseCommonsRoutes({
      publicDataEnabled,
      emergencyStop,
      stoppedCaseIds,
      interpretationPublicationApproval,
      interpretationEmergencyStop,
    }),
  );
  app.use("/v1/*", async (c, next) => {
    sessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    await next();
  });
  return { app, sessionCalls: () => sessionCalls };
}

describe("tax-dispute interpretation", () => {
  it("publishes a stable twelve-dimension framework without opening a case", async () => {
    const { app, sessionCalls } = mount(false);
    const response = await app.request(
      "/v1/case-commons/uk/interpretation",
      { headers: { Origin: "https://agent.example", Cookie: "existing=1" } },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.uk.tax-dispute-framework/1",
    );
    expect(sessionCalls()).toBe(0);
    expect(body).toMatchObject({
      schema: "taxsorted.uk.tax-dispute-framework/1",
      interpretationSchema: "taxsorted.uk.tax-dispute-interpretation/1",
    });
    expect(body.dimensions).toHaveLength(12);
    expect(body.reasoning).toMatchObject({
      hiddenChainOfThought: false,
      publicRationaleOnly: true,
    });
    expect(body.boundaries.join(" ")).toMatch(
      /not legal advice|no outcome prediction/i,
    );
  });

  it("projects an approved case into dimensions, challenges and decisive reasons", async () => {
    const { app } = mount();
    const response = await app.request(
      "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/interpretation",
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.uk.tax-dispute-interpretation/1",
    );
    expect(() => taxDisputeInterpretationSchema.parse(body)).not.toThrow();
    expect(body).toMatchObject({
      schema: "taxsorted.uk.tax-dispute-interpretation/1",
      case: {
        id: "haworth-v-hmrc-2021",
        citation: "[2021] UKSC 25",
      },
      reasoning: {
        hiddenChainOfThought: false,
      },
      review: {
        qualifiedLegalReviewAsserted: false,
      },
    });
    expect(body.packet.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(body.dimensions).toHaveLength(12);
    expect(body.dimensions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "party-arguments",
          state: "not-mapped",
        }),
        expect.objectContaining({
          id: "evidence-burden-and-standard",
          state: "partial",
        }),
        expect.objectContaining({
          id: "questions-and-issues",
          state: "partial",
          gaps: expect.arrayContaining([
            expect.stringMatching(/Issue 3/i),
            expect.stringMatching(/Issue 4/i),
          ]),
        }),
        expect.objectContaining({
          id: "decisive-reasoning",
          state: "partial",
          gaps: expect.arrayContaining([
            expect.stringMatching(/section 31\(2A\)/i),
          ]),
        }),
      ]),
    );
    expect(body.reasoning.decisiveReasonIds).toEqual(
      expect.arrayContaining([
        "reason:threshold-not-met",
        "reason:earlier-ruling-overstated",
      ]),
    );
    expect(body.reasoning.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "reason:access-to-justice",
          decisiveness: "supporting",
        }),
        expect.objectContaining({
          id: "reason:threshold-not-met",
          decisiveness: "decisive",
          issueBranch: "issue-1-statutory-threshold",
        }),
      ]),
    );
    expect(body.reasoning.steps.flatMap(
      (step: { casePointers: string[] }) => step.casePointers,
    )).toContain("/findings/0");
    expect(JSON.stringify(body)).not.toMatch(
      /successProbability|winScore|expectedValuePence/i,
    );
  });

  it("serves the same public rationale as a valid shared WhyGraph", async () => {
    const { app } = mount();
    const response = await app.request(
      "/v1/case-commons/uk/cases/haworth-v-hmrc/why-graph",
    );
    const graph = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.why-graph/1",
    );
    expect(response.headers.get("x-taxsorted-why-graph-adopter")).toBe(
      "uk.case-commons.tax-dispute",
    );
    expect(() => taxDisputeWhyGraphSchema.parse(graph)).not.toThrow();
    expect(graph.context).toMatchObject({
      subject: {
        id: "haworth-v-hmrc-2021",
        version: "2026-07-24.1",
      },
      authority: "taxsorted-analysis",
      effect: "advisory",
      externalStateChange: false,
    });
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "conclusion", state: "decisive" }),
        expect.objectContaining({
          id: "gap:party-arguments",
          kind: "gap",
          state: "not-mapped",
        }),
        expect.objectContaining({
          id: "gap:issue-3-factual-findings",
          kind: "gap",
        }),
        expect.objectContaining({
          id: "gap:issue-4-notice-invalidity",
          kind: "gap",
        }),
        expect.objectContaining({
          id: "gap:s31-2a-materiality-relief",
          kind: "gap",
        }),
      ]),
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: "reason:earlier-ruling-overstated",
          relation: "limited-by",
          to: "gap:s31-2a-materiality-relief",
        }),
      ]),
    );
  });

  it("provides agent instructions and training records only from approved public packets", async () => {
    const { app } = mount();
    const agent = await (
      await app.request("/v1/case-commons/uk/agent")
    ).json();
    const manifestResponse = await app.request(
      "/v1/case-commons/uk/training",
    );
    const manifest = await manifestResponse.json();
    const examplesResponse = await app.request(
      "/v1/case-commons/uk/training/examples",
    );
    const bundle = await examplesResponse.json();

    expect(agent).toMatchObject({
      schema: "taxsorted.uk.tax-dispute-agent/1",
      access: {
        authentication: "none",
        writes: false,
      },
      dataUse: {
        runtimeRequestsUsedForTraining: false,
        privateAssessmentsUsedForTraining: false,
      },
    });
    expect(agent.steps.map((step: { id: string }) => step.id)).toEqual([
      "read-framework",
      "list-cases",
      "read-packet",
      "read-interpretation",
      "walk-why-graph",
      "verify-sources",
    ]);

    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.headers.get("link")).not.toContain(
      'rel="describedby"',
    );
    expect(manifest).toMatchObject({
      schema: "taxsorted.uk.tax-dispute-training/1",
      currentUse: "format-and-evaluation-seed",
      outcomePrediction: false,
      sourcePolicy:
        "approved-public-case-packets-plus-taxsorted-derived-labels",
      caseCount: 1,
      frameworkVersion: testDerivedRelease.release.frameworkVersion,
      derivedRelease: {
        digest: testDerivedRelease.release.digest,
      },
      labelReview: {
        taxSortedDerivedLabels: true,
        qualifiedLegalReviewAsserted: false,
        exactDerivedReleaseApprovalRequired: true,
      },
    });
    expect(manifest.sufficiency.claimed).toBe(false);
    expect(manifest.taskFamilies).toHaveLength(4);

    expect(examplesResponse.status).toBe(200);
    expect(examplesResponse.headers.get("link")).not.toContain(
      'rel="describedby"',
    );
    expect(examplesResponse.headers.get("x-record-count")).toBe("4");
    expect(() => taxDisputeTrainingBundleSchema.parse(bundle)).not.toThrow();
    expect(bundle.examples).toHaveLength(4);
    expect(new Set(bundle.examples.map(
      (example: { case: { id: string }; split: string }) =>
        `${example.case.id}:${example.split}`,
    )).size).toBe(1);
    for (const example of bundle.examples) {
      expect(() => taxDisputeTrainingExampleSchema.parse(example)).not.toThrow();
      expect(example.case.packetDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
      expect(example.case.packetHref).toBe(
        `/v1/case-commons/uk/cases/${example.case.id}`,
      );
      expect(example.input.packet).toEqual({
        href: example.case.packetHref,
        digest: example.case.packetDigest,
      });
      expect(example.provenance.sourceIds.length).toBeGreaterThan(0);
      expect(example.provenance.casePointers.length).toBeGreaterThan(0);
      expect(example.safety).toMatchObject({
        sourcePacketApproved: true,
        taxSortedDerivedLabels: true,
        qualifiedLegalReviewAsserted: false,
        containsPrivateMatterFacts: false,
        hiddenChainOfThought: false,
        outcomePrediction: false,
      });
      expect(example.derived).toMatchObject({
        frameworkVersion: testDerivedRelease.release.frameworkVersion,
        taxSortedDerivedLabels: true,
        qualifiedLegalReviewAsserted: false,
      });
    }
    const decisiveExample = bundle.examples.find(
      (example: { taskFamily: string }) =>
        example.taskFamily === "identify-decisive-reasons",
    );
    expect(decisiveExample.expectedOutput.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "reason:earlier-ruling-overstated",
          gaps: expect.arrayContaining([
            expect.stringMatching(/section 31\(2A\)/i),
          ]),
        }),
      ]),
    );
    const unsafeExample = structuredClone(bundle.examples[0]);
    unsafeExample.expectedOutput.hiddenChainOfThought =
      "must never be accepted";
    expect(() =>
      taxDisputeTrainingExampleSchema.parse(unsafeExample),
    ).toThrow();
  });

  it("offers deterministic NDJSON with one complete record per line", async () => {
    const { app } = mount();
    const first = await app.request(
      "/v1/case-commons/uk/training/examples.ndjson",
    );
    const second = await app.request(
      "/v1/case-commons/uk/training/examples.ndjson",
    );
    const firstText = await first.text();
    const lines = firstText.trim().split("\n");

    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe(
      "application/x-ndjson; charset=UTF-8",
    );
    expect(first.headers.get("content-disposition")).toContain(
      "taxsorted-uk-tax-dispute-examples-2026-07-24.1-2026-07-28.2-",
    );
    expect(first.headers.get("etag")).toBe(second.headers.get("etag"));
    expect(firstText).toBe(await second.text());
    expect(lines).toHaveLength(4);
    for (const line of lines) {
      expect(() =>
        taxDisputeTrainingExampleSchema.parse(JSON.parse(line)),
      ).not.toThrow();
    }
  });

  it("keeps derived case and training material behind every source-packet stop", async () => {
    for (const [publicDataEnabled, emergencyStop, stoppedCaseIds, error] of [
      [false, false, [], "publication_review_pending"],
      [true, true, [], "publication_emergency_stop"],
      [true, false, ["haworth-v-hmrc-2021"], "case_publication_stop"],
    ] as const) {
      const { app } = mount(
        publicDataEnabled,
        emergencyStop,
        [...stoppedCaseIds],
      );
      for (const path of [
        "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/interpretation",
        "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/why-graph",
        "/v1/case-commons/uk/training",
        "/v1/case-commons/uk/training/examples",
        "/v1/case-commons/uk/training/examples.ndjson",
      ]) {
        const response = await app.request(path);
        const problem = await response.json();
        expect(response.status, path).toBe(503);
        expect(problem.error, path).toBe(error);
        expect(JSON.stringify(problem), path).not.toMatch(
          /8,786,288|threshold-not-met/i,
        );
      }
      expect(
        (await app.request("/v1/case-commons/uk/interpretation")).status,
      ).toBe(200);
      expect(
        (await app.request("/v1/case-commons/uk/interpretation/schema")).status,
      ).toBe(200);
      expect(
        (await app.request("/v1/case-commons/uk/training/schema")).status,
      ).toBe(200);
      expect(
        (await app.request("/v1/case-commons/uk/agent")).status,
      ).toBe(200);
    }
  });

  it("keeps source packets open while the independent derived release remains pending", async () => {
    const { app } = mount(
      true,
      false,
      [],
      ukTaxDisputeInterpretationPublicationApproval,
    );

    expect(
      (
        await app.request(
          "/v1/case-commons/uk/cases/haworth-v-hmrc-2021",
        )
      ).status,
    ).toBe(200);
    expect(
      (await app.request("/v1/case-commons/uk/interpretation"))
        .status,
    ).toBe(200);

    for (const path of [
      "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/interpretation",
      "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/why-graph",
      "/v1/case-commons/uk/training",
      "/v1/case-commons/uk/training/examples",
      "/v1/case-commons/uk/training/examples.ndjson",
    ]) {
      const response = await app.request(path);
      const problem = await response.json();
      expect(response.status, path).toBe(503);
      expect(problem.error, path).toBe(
        "tax_dispute_interpretation_review_pending",
      );
      expect(problem.reason, path).toBe(
        "derived-release-review-pending",
      );
    }
  });

  it("contains a missing adapter without preventing the API or source packet from starting", async () => {
    const corpus = structuredClone(ukCaseCommons) as UkCaseCommons;
    corpus.cases[0]!.id = "unmapped-case";
    corpus.cases[0]!.slug = "unmapped-case";
    const app = new Hono();

    expect(() =>
      app.route(
        "/v1/case-commons/uk",
        createUkCaseCommonsRoutes({
          corpus,
          publicDataEnabled: true,
          publicationApproval: {
            schema:
              "taxsorted.uk.case-commons-publication-approval/1",
            status: "approved-for-publication",
            decisionRecordedOn: "2026-07-28",
            corpusVersion: corpus.meta.version,
            corpusDigest: caseCommonsCorpusDigest(corpus),
            caseIds: ["unmapped-case"],
            effects: "Test-only exact corpus approval.",
          },
          interpretationPublicationApproval: {
            schema:
              "taxsorted.uk.tax-dispute-interpretation-publication-approval/1",
            status: "approved-for-publication",
            decisionRecordedOn: "2026-07-28",
            frameworkVersion:
              testDerivedRelease.release.frameworkVersion,
            corpusVersion: corpus.meta.version,
            releaseDigest: `sha256:${"f".repeat(64)}`,
            caseIds: ["unmapped-case"],
            effects:
              "Test-only candidate approval used to exercise containment.",
          },
        }),
      ),
    ).not.toThrow();

    expect(
      (
        await app.request(
          "/v1/case-commons/uk/cases/unmapped-case",
        )
      ).status,
    ).toBe(200);
    const derived = await app.request(
      "/v1/case-commons/uk/cases/unmapped-case/interpretation",
    );
    const problem = await derived.json();
    expect(derived.status).toBe(503);
    expect(problem.error).toBe(
      "tax_dispute_interpretation_review_pending",
    );
    expect(problem.reason).toBe("derived-release-build-failed");
    expect((await app.request("/v1/case-commons/uk/method")).status)
      .toBe(200);
  });

  it("stops only the derived release when its independent emergency stop is active", async () => {
    const { app } = mount(
      true,
      false,
      [],
      approvedInterpretationRelease,
      true,
    );
    expect(
      (
        await app.request(
          "/v1/case-commons/uk/cases/haworth-v-hmrc-2021",
        )
      ).status,
    ).toBe(200);
    const response = await app.request(
      "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/interpretation",
    );
    const problem = await response.json();
    expect(response.status).toBe(503);
    expect(problem.reason).toBe("derived-release-emergency-stop");
  });

  it("keeps every new namespace read-only, sessionless and query-strict", async () => {
    const { app, sessionCalls } = mount();
    for (const path of [
      "/v1/case-commons/uk/interpretation",
      "/v1/case-commons/uk/interpretation/schema",
      "/v1/case-commons/uk/agent",
      "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/interpretation",
      "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/why-graph",
      "/v1/case-commons/uk/training",
      "/v1/case-commons/uk/training/examples",
      "/v1/case-commons/uk/training/examples.ndjson",
      "/v1/case-commons/uk/training/schema",
    ]) {
      expect(isPublicCivicPath(path), path).toBe(true);
      const head = await app.request(path, { method: "HEAD" });
      expect(head.status, path).toBe(200);
      expect(await head.text(), path).toBe("");
    }
    expect(sessionCalls()).toBe(0);

    const query = await app.request(
      "/v1/case-commons/uk/training/examples?split=train",
    );
    expect(query.status).toBe(400);
    expect((await query.json()).error).toBe("unknown_query_parameter");

    const write = await app.request(
      "/v1/case-commons/uk/cases/haworth-v-hmrc-2021/interpretation",
      { method: "POST", body: "{}" },
    );
    expect(write.status).toBe(404);
  });
});
