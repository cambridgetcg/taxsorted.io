import { describe, expect, it } from "vitest";
import corpus from "../../../../../research/uk/case-commons/data/uk-case-commons.json";
import {
  TAX_DISPUTE_FRAMEWORK,
  buildTaxDisputeTrainingExamples,
  buildTaxDisputeWhyGraph,
  buildUkTaxDisputeInterpretation,
  type TaxDisputeCaseRecord,
} from "../index";

function interpretation() {
  return buildUkTaxDisputeInterpretation({
    caseRecord: corpus.cases[0] as TaxDisputeCaseRecord,
    corpusVersion: corpus.meta.version,
    lawAsAt: corpus.meta.lawAsAt,
    sourcePacket: {
      schema: "taxsorted.uk.case-packet/1",
      digest: `sha256:${"a".repeat(64)}`,
    },
  });
}

describe("UK tax-dispute interpretation engine", () => {
  it("maps Haworth through the complete framework without filling gaps", () => {
    const result = interpretation();

    expect(TAX_DISPUTE_FRAMEWORK.dimensions).toHaveLength(12);
    expect(result.dimensions.map((dimension) => dimension.id)).toEqual(
      TAX_DISPUTE_FRAMEWORK.dimensions.map((dimension) => dimension.id),
    );
    expect(result.dimensions).toEqual(
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
      ]),
    );
    expect(result.reasoning).toMatchObject({
      hiddenChainOfThought: false,
      publicRationaleOnly: true,
      decisiveReasonIds: [
        "reason:threshold-not-met",
        "reason:earlier-ruling-overstated",
      ],
    });
    expect(result.outcomes.procedural.status).toBe("notices-quashed");
    expect(result.outcomes.underlyingMerits.status).toBe(
      "later-tax-appeal-lost",
    );
    expect(result.outcomes.money.status).toBe(
      "documented-amount-affected-not-recovery",
    );
  });

  it("builds a valid graph with the public holding and named gaps", () => {
    const graph = buildTaxDisputeWhyGraph(interpretation());

    expect(graph.context).toMatchObject({
      subject: {
        id: "haworth-v-hmrc-2021",
        version: corpus.meta.version,
      },
      authority: "taxsorted-analysis",
      effect: "advisory",
      externalStateChange: false,
    });
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "holding",
          kind: "conclusion",
          state: "decisive",
        }),
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

  it("creates four deterministic, case-grouped public training tasks", () => {
    const first = buildTaxDisputeTrainingExamples(interpretation());
    const second = buildTaxDisputeTrainingExamples(interpretation());

    expect(first).toEqual(second);
    expect(first.map((example) => example.taskFamily)).toEqual([
      "map-dimensions",
      "identify-decisive-reasons",
      "separate-outcomes",
      "identify-major-challenges",
    ]);
    expect(
      new Set(
        first.map(
          (example) => `${example.case.id}:${example.split}`,
        ),
      ),
    ).toEqual(new Set(["haworth-v-hmrc-2021:evaluation"]));
    for (const example of first) {
      expect(example.input.packet).toEqual({
        href:
          "/v1/case-commons/uk/cases/haworth-v-hmrc-2021",
        digest: `sha256:${"a".repeat(64)}`,
      });
      expect(example.safety).toEqual({
        sourcePacketApproved: true,
        taxSortedDerivedLabels: true,
        qualifiedLegalReviewAsserted: false,
        containsPrivateMatterFacts: false,
        hiddenChainOfThought: false,
        outcomePrediction: false,
      });
    }
    const decisiveExample = first.find(
      (example) =>
        example.taskFamily === "identify-decisive-reasons",
    );
    expect(decisiveExample?.expectedOutput.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "reason:earlier-ruling-overstated",
          gaps: expect.arrayContaining([
            expect.stringMatching(/section 31\(2A\)/i),
          ]),
        }),
      ]),
    );
  });

  it("fails closed when no reviewed case adapter exists", () => {
    const unknownCase = structuredClone(
      corpus.cases[0],
    ) as TaxDisputeCaseRecord;
    unknownCase.id = "unmapped-case";

    expect(() =>
      buildUkTaxDisputeInterpretation({
        caseRecord: unknownCase,
        corpusVersion: corpus.meta.version,
        lawAsAt: corpus.meta.lawAsAt,
      }),
    ).toThrow(/No mapped tax-dispute interpretation adapter/);
  });
});
