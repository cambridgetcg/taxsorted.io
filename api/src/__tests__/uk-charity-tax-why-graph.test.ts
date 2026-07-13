import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import {
  assertAdmittedWhyGraph,
  canonicaliseWhyGraph,
  whyGraphEdge,
  type WhyGraph,
} from "@taxsorted/engine/why-graph";
import { runWhyGraphAdopterContract } from "@taxsorted/engine/why-graph-test";
import { ukCharities } from "../uk-charities";
import {
  buildUkCharityTaxWhyGraph,
  ukCharityTaxWhyGraphAdopter,
} from "../uk-charity-tax-why-graph";
import { WhyGraphSchema } from "../why-graph";

function graphFor(id: string) {
  const corpus = structuredClone(ukCharities);
  const treatment = corpus.taxTreatments.find((candidate) => candidate.id === id)!;
  return {
    corpus,
    treatment,
    graph: buildUkCharityTaxWhyGraph(corpus, treatment.id),
  };
}

function assertMutationFails(
  candidate: WhyGraph,
  native: ReturnType<typeof graphFor>,
  message: RegExp,
) {
  expect(() => assertAdmittedWhyGraph(
    candidate,
    { corpus: native.corpus, treatmentId: native.treatment.id },
    ukCharityTaxWhyGraphAdopter,
  )).toThrow(message);
}

runWhyGraphAdopterContract({
  name: "UK charity tax-treatment adopter mutation contract",
  adopter: ukCharityTaxWhyGraphAdopter,
  makeFixture() {
    const fixture = graphFor("tax-hmrc-recognition");
    return {
      graph: fixture.graph,
      native: {
        corpus: fixture.corpus,
        treatmentId: fixture.treatment.id,
      },
    };
  },
  cases: [
    {
      name: "node order is a shared-contract failure",
      layer: "shared",
      mutate(fixture) {
        fixture.graph.nodes.reverse();
      },
      error: /ASCII sorted/i,
    },
    {
      name: "a valid selector cannot change the canonical treatment collection",
      layer: "domain",
      mutate(fixture) {
        const root = fixture.graph.nodes.find(
          (node) => node.id === fixture.graph.rootNodeId,
        )!;
        if (root.record?.kind !== "dataset-record") throw new Error("fixture");
        root.record.collection = "tax-treatments";
      },
      error: /root.*exact treatment|unsupported collection/i,
    },
    {
      name: "authority words cannot drift behind stable node IDs",
      layer: "domain",
      mutate(fixture) {
        fixture.graph.nodes.find(
          (node) => node.id === "gap:binding-provision-not-mapped",
        )!.description = "This is complete binding law and proves entitlement.";
      },
      error: /exact adopter-owned semantic projection/i,
    },
    {
      name: "a native coverage gap cannot be removed consistently",
      layer: "domain",
      mutate(fixture) {
        const gapId = "gap:binding-provision-not-mapped";
        fixture.graph.nodes = fixture.graph.nodes.filter((node) => node.id !== gapId);
        fixture.graph.edges = fixture.graph.edges.filter(
          (edge) => edge.from !== gapId && edge.to !== gapId,
        );
        fixture.graph.coverage.gapNodeIds =
          fixture.graph.coverage.gapNodeIds.filter((id) => id !== gapId);
      },
      error: /coverage gaps|semantic projection/i,
    },
    {
      name: "the public correction route cannot drift",
      layer: "domain",
      mutate(fixture) {
        const route = fixture.graph.nodes.find(
          (node) => node.id === "route:taxsorted-public-correction",
        )!;
        if (route.record?.kind !== "external-resource") throw new Error("fixture");
        route.record.href = "https://example.org/corrections";
      },
      error: /correction route.*admitted public channel/i,
    },
    {
      name: "a stale native source is not admitted",
      layer: "domain",
      mutate(fixture) {
        fixture.native.corpus.sources.find(
          (source) => source.id === "src-hmrc-recognition",
        )!.reviewAfter = "2026-07-11";
      },
      error: /unadmitted source/i,
    },
    {
      name: "a guidance source cannot be relabelled as primary law",
      layer: "domain",
      mutate(fixture) {
        fixture.native.corpus.sources.find(
          (source) => source.id === "src-hmrc-recognition",
        )!.authorityLevel = "primary-law";
      },
      error: /unadmitted source/i,
    },
    {
      name: "a publisher string cannot become an invented institution edge",
      layer: "domain",
      mutate(fixture) {
        fixture.graph.nodes.push({
          id: "institution:invented-publisher",
          kind: "institution",
          label: "Invented publisher identity",
          description: "A source publisher string is not an admitted institution join.",
          state: "context",
          record: null,
        });
        fixture.graph.edges.push(whyGraphEdge(
          "source:src-hmrc-recognition",
          "published-by",
          "institution:invented-publisher",
          "This invented join must be rejected by the domain adapter.",
        ));
        fixture.graph = canonicaliseWhyGraph(fixture.graph);
      },
      error: /cannot invent rules, roles, processes/i,
    },
    {
      name: "an extra consequence cannot ride an admitted claim",
      layer: "domain",
      mutate(fixture) {
        fixture.graph.nodes.push({
          id: "consequence:invented",
          kind: "consequence",
          label: "Invented consequence",
          description: "This has valid shape but no native treatment meaning.",
          state: "conditional",
          record: {
            kind: "dataset-record",
            dataset: "uk-charities-sector",
            collection: "taxTreatments",
            recordId: fixture.native.treatmentId,
            href: `/v1/charities/uk/tax-treatments/${fixture.native.treatmentId}`,
          },
        });
        fixture.graph.edges.push(
          whyGraphEdge(
            fixture.graph.rootNodeId,
            "leads-to",
            "consequence:invented",
            "This extra consequence must not be admitted.",
          ),
          whyGraphEdge(
            "consequence:invented",
            "grounded-in",
            "claim:benefit",
            "An existing claim cannot legitimise a new consequence.",
          ),
        );
        fixture.graph = canonicaliseWhyGraph(fixture.graph);
      },
      error: /consequence nodes/i,
    },
    {
      name: "a people collection cannot hide behind a valid dataset record shape",
      layer: "domain",
      mutate(fixture) {
        const node = fixture.graph.nodes.find(
          (candidate) => candidate.id === "reasoning:classification",
        )!;
        if (node.record?.kind !== "dataset-record") throw new Error("fixture");
        node.record.collection = "people";
      },
      error: /unsupported collection people/i,
    },
  ],
});

describe("UK charity tax-treatment why-graph adapter", () => {
  it("builds one deterministic, strict graph for every reviewed treatment", () => {
    for (const treatment of ukCharities.taxTreatments) {
      const corpus = structuredClone(ukCharities);
      const first = buildUkCharityTaxWhyGraph(corpus, treatment.id);
      const second = buildUkCharityTaxWhyGraph(corpus, treatment.id);

      expect(WhyGraphSchema.safeParse(first).success, treatment.id).toBe(true);
      expect(JSON.stringify(first), treatment.id).toBe(JSON.stringify(second));
      const bytes = Buffer.from(JSON.stringify(first));
      const hasLawSpine = treatment.id === "tax-non-charitable-expenditure";
      expect(bytes.byteLength, `${treatment.id} raw size`).toBeLessThanOrEqual(
        (hasLawSpine ? 64 : 32) * 1024,
      );
      expect(gzipSync(bytes).byteLength, `${treatment.id} gzip size`)
        .toBeLessThanOrEqual((hasLawSpine ? 8 : 6) * 1024);
      expect(first.rootNodeId, treatment.id).toBe(
        `conclusion:tax-treatment:${treatment.id}`,
      );
      expect(first.context).toMatchObject({
        subject: {
          id: `uk-charities-sector.taxTreatments.${treatment.id}`,
          type: "dataset-record",
          version: ukCharities.meta.version,
        },
        jurisdiction: treatment.id === "tax-sdlt-charity-relief"
          ? "England and Northern Ireland"
          : treatment.jurisdictions[0],
        effectiveDate: null,
        evaluatedOn: ukCharities.meta.reviewedOn,
        knowledgeAsOf: ukCharities.meta.reviewedOn,
        authority: treatment.reasoningStatus === "official-summary"
          ? "source-reported-claim"
          : "taxsorted-analysis",
        effect: "advisory",
        externalStateChange: false,
      });

      const root = first.nodes.find((node) => node.id === first.rootNodeId)!;
      expect(root.record).toEqual({
        kind: "dataset-record",
        dataset: "uk-charities-sector",
        collection: "taxTreatments",
        recordId: treatment.id,
        href: `/v1/charities/uk/tax-treatments/${treatment.id}`,
      });
      expect(first.nodes.some((node) => node.kind === "rule"), treatment.id)
        .toBe(hasLawSpine);
      expect(first.edges.some((edge) => edge.relation === "legal-authority-from"))
        .toBe(hasLawSpine);
      expect(first.coverage.gapNodeIds).toEqual(expect.arrayContaining([
        hasLawSpine
          ? "gap:binding-provision-coverage-incomplete"
          : "gap:binding-provision-not-mapped",
        "gap:case-applicability-not-assessed",
        "gap:case-enforcement-and-challenge-not-mapped",
      ]));
      expect(JSON.stringify(first)).not.toMatch(
        /accountability|organisationId|personId|trusteeId|donorId|beneficiaryId/i,
      );
    }
  });

  it("maps exact law for the reverse-relief treatment without deciding a case", () => {
    const native = graphFor("tax-non-charitable-expenditure");
    const rules = native.graph.nodes.filter((node) => node.kind === "rule");
    const institutions = native.graph.nodes.filter(
      (node) => node.kind === "institution",
    );
    const coreRules = native.corpus.taxRules.filter(
      (rule) => rule.explanationScope === "treatment-core"
    );

    expect(rules).toHaveLength(coreRules.length);
    expect(coreRules).toHaveLength(16);
    expect(institutions.map((node) => node.id)).toEqual([
      "institution:reg-hmrc-charities",
    ]);
    expect(rules.every((node) => node.state === "checked-not-decisive")).toBe(true);
    expect(native.graph.edges.some((edge) => edge.relation === "applies-rule"))
      .toBe(false);
    expect(native.graph.nodes.some((node) => node.kind === "process")).toBe(false);
    expect(native.graph.coverage.boundaries).toEqual(expect.arrayContaining([
      expect.stringMatching(/separate conditional doors across attribution, administration/),
    ]));

    for (const rule of coreRules) {
      const ruleNodeId = `rule:${rule.id}`;
      expect(native.graph.edges).toContainEqual(expect.objectContaining({
        from: ruleNodeId,
        relation: "legal-authority-from",
        to: `source:${rule.authoritySourceId}`,
      }));
      expect(native.graph.edges).toContainEqual(expect.objectContaining({
        from: ruleNodeId,
        relation: "administered-by",
        to: "institution:reg-hmrc-charities",
      }));
      for (const step of rule.reasoningStepIds) {
        expect(native.graph.edges).toContainEqual(expect.objectContaining({
          from: `reasoning:${step}`,
          relation: "considers-rule",
          to: ruleNodeId,
        }));
      }
    }
    expect(native.corpus.taxRules.some(
      (rule) => rule.explanationScope === "supplementary-substantive"
    )).toBe(true);
    expect(rules.some((node) => node.id.includes("tcga-1992"))).toBe(false);
    expect(native.graph.coverage.gapNodeIds).toEqual(expect.arrayContaining([
      "gap:binding-provision-coverage-incomplete",
      "gap:case-applicability-not-assessed",
      "gap:case-enforcement-and-challenge-not-mapped",
    ]));
  });

  it("rejects decisive law, valid-provision substitution and invented enforcement", () => {
    const native = graphFor("tax-non-charitable-expenditure");

    const decisive = structuredClone(native.graph);
    decisive.nodes.find((node) => node.kind === "rule")!.state = "decisive";
    assertMutationFails(
      decisive,
      native,
      /unadmitted tax rule|exact adopter-owned|checked-not-decisive/i,
    );

    const substituted = structuredClone(native.graph);
    const authorityNodes = substituted.nodes.filter((node) => (
      node.kind === "source"
      && node.record?.kind === "dataset-record"
      && node.record.recordId.startsWith("src-ita-2007-s")
    ));
    expect(authorityNodes.length).toBeGreaterThan(1);
    const first = authorityNodes[0];
    const second = authorityNodes[1];
    if (
      first.record?.kind !== "dataset-record"
      || second.record?.kind !== "dataset-record"
    ) throw new Error("fixture");
    first.record.recordId = second.record.recordId;
    first.record.href = second.record.href;
    assertMutationFails(substituted, native, /unadmitted source/i);

    const applied = structuredClone(native.graph);
    const considered = applied.edges.find((edge) => edge.relation === "considers-rule")!;
    considered.relation = "applies-rule";
    considered.id = whyGraphEdge(
      considered.from,
      "applies-rule",
      considered.to,
      considered.explanation,
    ).id;
    assertMutationFails(
      canonicaliseWhyGraph(applied),
      native,
      /relation not admitted|must target a decisive rule/i,
    );
  });

  it("revalidates the native corpus before deriving an exported graph", () => {
    const invalid = structuredClone(ukCharities);
    const rule = invalid.taxRules[0];
    invalid.sources.find((source) => source.id === rule.authoritySourceId)!.url =
      "https://www.legislation.gov.uk/ukpga/2007/3";
    expect(() => buildUkCharityTaxWhyGraph(
      invalid,
      "tax-non-charitable-expenditure",
    )).toThrow(/exact current primary-law/);
  });

  it("keeps the composite editorial analysis on its exact collective source matrix", () => {
    const native = graphFor("tax-public-benefit-bargain-analysis");
    const nodes = new Map(native.graph.nodes.map((node) => [node.id, node]));
    const sourcesFor = (claimId: string) => native.graph.edges
      .filter((edge) => edge.from === claimId && edge.relation === "supported-by")
      .map((edge) => nodes.get(edge.to)?.record)
      .map((record) => record?.kind === "dataset-record" ? record.recordId : null);

    const expected: Record<string, string[]> = {
      "claim:tax-type": ["src-hmrc-tax-exemptions"],
      "claim:position": ["src-hmrc-tax-exemptions"],
      "claim:eligibility": [
        "src-charitable-purposes",
        "src-hmrc-tax-exemptions",
      ],
      "claim:conditions": [
        "src-charitable-purposes",
        "src-hmrc-non-charitable-expenditure",
        "src-hmrc-tax-exemptions",
      ],
      "claim:benefit": ["src-hmrc-tax-exemptions"],
      "claim:tax-or-clawback": [
        "src-hmrc-non-charitable-expenditure",
        "src-hmrc-tax-exemptions",
      ],
      "claim:reasoning-status": ["src-hmrc-tax-exemptions"],
      "claim:reasoning": [
        "src-charitable-purposes",
        "src-hmrc-non-charitable-expenditure",
        "src-hmrc-tax-exemptions",
      ],
      "claim:not-equivalent-to": [
        "src-charitable-purposes",
        "src-hmrc-tax-exemptions",
      ],
    };
    for (const [claimId, sourceIds] of Object.entries(expected)) {
      expect(sourcesFor(claimId), claimId).toEqual(sourceIds);
    }
  });

  it("uses a neutral treatment effect when the native benefit denies a benefit", () => {
    const native = graphFor("tax-non-charitable-expenditure");
    expect(native.treatment.benefit).toMatch(/^No additional benefit/);
    expect(native.graph.nodes.find(
      (node) => node.id === "consequence:treatment-effect",
    )).toMatchObject({
      label: "Treatment effect described by the benefit field",
      state: "conditional",
    });
  });

  it("resolves each claim only to sources admitted for its exact native fields", () => {
    const native = graphFor("tax-hmrc-recognition");
    const nodes = new Map(native.graph.nodes.map((node) => [node.id, node]));

    for (const claim of native.graph.nodes.filter((node) => node.kind === "claim")) {
      const sourceIds = native.graph.edges
        .filter((edge) => edge.from === claim.id && edge.relation === "supported-by")
        .map((edge) => nodes.get(edge.to)?.record)
        .map((record) => record?.kind === "dataset-record" ? record.recordId : null);
      expect(sourceIds.every((sourceId) => sourceId !== null), claim.id).toBe(true);
    }

    const eligibilitySources = native.graph.edges
      .filter((edge) => edge.from === "claim:eligibility" && edge.relation === "supported-by")
      .map((edge) => nodes.get(edge.to)?.record)
      .map((record) => record?.kind === "dataset-record" ? record.recordId : null);
    expect(eligibilitySources).toEqual(["src-hmrc-recognition"]);
  });

  it("rejects wrong treatment identity, source admission and field provenance", () => {
    const native = graphFor("tax-hmrc-recognition");

    const wrongRoot = structuredClone(native.graph);
    const root = wrongRoot.nodes.find((node) => node.id === wrongRoot.rootNodeId)!;
    if (root.record?.kind !== "dataset-record") throw new Error("test fixture");
    root.record.collection = "tax-treatments";
    assertMutationFails(wrongRoot, native, /root.*exact treatment|unsupported collection/i);

    const wrongSource = structuredClone(native.graph);
    const source = wrongSource.nodes.find((node) => node.id === "source:src-hmrc-recognition")!;
    if (source.record?.kind !== "dataset-record") throw new Error("test fixture");
    const outside = native.corpus.sources.find(
      (candidate) => !native.treatment.sourceIds.includes(candidate.id),
    )!;
    source.record.recordId = outside.id;
    source.record.href = `/v1/charities/uk/sources/${outside.id}`;
    assertMutationFails(wrongSource, native, /unadmitted source/i);

    const overlinked = structuredClone(native.graph);
    overlinked.edges.push(whyGraphEdge(
      "claim:eligibility",
      "supported-by",
      "source:src-hmrc-tax-overview",
      "This deliberately over-links a source that does not support eligibility.",
    ));
    const canonicalOverlink = canonicaliseWhyGraph(overlinked);
    assertMutationFails(canonicalOverlink, native, /claim:eligibility evidence/i);
  });

  it("rejects a changed source voice and any promoted guidance rule", () => {
    const native = graphFor("tax-income-and-gains");
    const changedVoice = structuredClone(native.graph);
    changedVoice.context.authority = "taxsorted-analysis";
    assertMutationFails(changedVoice, native, /context.*admitted record envelope/i);

    const promoted = structuredClone(native.graph);
    promoted.nodes.push({
      id: "rule:guidance-promoted",
      kind: "rule",
      label: "Guidance promoted to law",
      description: "This mutation must be rejected even though its graph shape is valid.",
      state: "checked-not-decisive",
      record: {
        kind: "dataset-record",
        dataset: "uk-charities-sector",
        collection: "sources",
        recordId: "src-hmrc-tax-exemptions",
        href: "/v1/charities/uk/sources/src-hmrc-tax-exemptions",
      },
    });
    promoted.edges.push(
      whyGraphEdge(
        "reasoning:source-reading",
        "considers-rule",
        "rule:guidance-promoted",
        "This invalid mutation pretends guidance is a formal rule.",
      ),
      whyGraphEdge(
        "rule:guidance-promoted",
        "limited-by",
        "gap:binding-provision-not-mapped",
        "The shared shape remains valid, leaving the domain adapter to reject the promotion.",
      ),
    );
    assertMutationFails(
      canonicaliseWhyGraph(promoted),
      native,
      /cannot invent rules/i,
    );
  });

  it("fails closed if a future treatment has more than one jurisdiction", () => {
    const corpus = structuredClone(ukCharities);
    const treatment = corpus.taxTreatments[0];
    treatment.jurisdictions.push("England");
    expect(() => buildUkCharityTaxWhyGraph(corpus, treatment.id))
      .toThrow(/admitted jurisdiction label/i);
  });
});
