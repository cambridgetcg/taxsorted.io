import { describe, expect, it } from "vitest";
import {
  assertWhyGraphInvariants,
  canonicaliseWhyGraph,
  type WhyGraph,
  whyGraphEdge,
} from "../why-graph";

function graph(): WhyGraph {
  return canonicaliseWhyGraph({
    schema: "taxsorted.why-graph/1",
    rootNodeId: "conclusion:test",
    context: {
      subject: { id: "test.answer", type: "assessment", version: "1" },
      jurisdiction: "Test jurisdiction",
      effectiveDate: "2026-07-11",
      evaluatedOn: "2026-07-11",
      knowledgeAsOf: "2026-07-11",
      authority: "taxsorted-analysis",
      effect: "advisory",
      externalStateChange: false,
    },
    valueHandling: {
      factValues: "case-financial-and-identity-fact-values-not-copied-into-graph",
      nodeIds: "semantic-identifiers-without-fact-values-or-array-positions",
    },
    ordering: {
      nodes: "id-ascii-ascending",
      edges: "id-ascii-ascending",
      setValues: "unique-ascii-ascending",
    },
    nodes: [
      {
        id: "source:test-law",
        kind: "source",
        label: "Test Act",
        description: "The admitted source.",
        state: "supporting",
        record: {
          kind: "external-resource",
          href: "https://www.legislation.gov.uk/",
        },
      },
      {
        id: "rule:test-rule",
        kind: "rule",
        label: "Test rule",
        description: "The rule used by the example.",
        state: "decisive",
        record: null,
      },
      {
        id: "reasoning:test-step",
        kind: "reasoning-step",
        label: "Apply the test rule",
        description: "The only reasoning step.",
        state: "decisive",
        record: {
          kind: "response-record",
          collection: "reasoning.steps",
          key: "id",
          value: "test-step",
        },
      },
      {
        id: "conclusion:test",
        kind: "conclusion",
        label: "Test conclusion",
        description: "A synthetic conclusion with no legal effect.",
        state: "decisive",
        record: {
          kind: "response-record",
          collection: "answer",
          key: "json-pointer",
          value: "/answer/decision",
        },
      },
    ],
    edges: [
      whyGraphEdge(
        "reasoning:test-step",
        "applies-rule",
        "rule:test-rule",
        "The step applies the rule.",
      ),
      whyGraphEdge(
        "rule:test-rule",
        "legal-authority-from",
        "source:test-law",
        "The source supplies the rule's legal authority.",
      ),
      whyGraphEdge(
        "conclusion:test",
        "reasoned-by",
        "reasoning:test-step",
        "The step explains the conclusion.",
      ),
    ],
    coverage: {
      scope: "Synthetic invariant example.",
      completeWithinDeclaredScope: true,
      gapNodeIds: [],
      boundaries: ["This example creates no external state."],
    },
  });
}

describe("shared why-graph contract", () => {
  it("accepts one sorted, reachable and acyclic explanation", () => {
    expect(() => assertWhyGraphInvariants(graph())).not.toThrow();
  });

  it("rejects dangling and semantically incompatible edges", () => {
    const dangling = graph();
    dangling.edges[0] = { ...dangling.edges[0], to: "rule:not-real" };
    expect(() => assertWhyGraphInvariants(dangling)).toThrow(/edge ID|dangling endpoint/i);

    const wrongRelation = graph();
    wrongRelation.edges[0] = {
      ...wrongRelation.edges[0],
      relation: "published-by",
    };
    expect(() => assertWhyGraphInvariants(wrongRelation)).toThrow(/edge ID|cannot use published-by/i);
  });

  it("rejects cycles and unreachable ornament", () => {
    const cycle = graph();
    cycle.edges.push(
      whyGraphEdge(
        "source:test-law",
        "published-by",
        "conclusion:test",
        "Invalid reverse edge.",
      ),
    );
    cycle.edges.sort((left, right) => left.id < right.id ? -1 : 1);
    expect(() => assertWhyGraphInvariants(cycle)).toThrow(/cannot use published-by|cycle/i);

    const unreachable = graph();
    unreachable.nodes.push({
      id: "gap:ornament",
      kind: "gap",
      label: "Unconnected gap",
      description: "A node cannot merely decorate the graph.",
      state: "not-mapped",
      record: null,
    });
    unreachable.nodes.sort((left, right) => left.id < right.id ? -1 : 1);
    expect(() => assertWhyGraphInvariants(unreachable)).toThrow(/unreachable nodes/i);
  });

  it("canonicalises node, edge, boundary and gap ordering", () => {
    const value = graph();
    value.coverage.boundaries = ["z", "a", "z"];
    const canonical = canonicaliseWhyGraph(value);
    expect(canonical.nodes.map((node) => node.id)).toEqual(
      [...canonical.nodes.map((node) => node.id)].sort(),
    );
    expect(canonical.edges.map((edge) => edge.id)).toEqual(
      [...canonical.edges.map((edge) => edge.id)].sort(),
    );
    expect(canonical.coverage.boundaries).toEqual(["a", "z"]);
  });

  it("requires coverage to declare every gap and agree with completeness", () => {
    const value = graph();
    value.nodes.push({
      id: "gap:test-boundary",
      kind: "gap",
      label: "Test boundary",
      description: "A connected but undeclared gap.",
      state: "not-mapped",
      record: null,
    });
    value.edges.push(
      whyGraphEdge(
        value.rootNodeId,
        "limited-by",
        "gap:test-boundary",
        "The conclusion is limited by this boundary.",
      ),
    );
    const canonical = canonicaliseWhyGraph(value);
    expect(() => assertWhyGraphInvariants(canonical)).toThrow(/every.*gap node/i);

    canonical.coverage.gapNodeIds = ["gap:test-boundary"];
    expect(() => assertWhyGraphInvariants(canonical)).toThrow(/completeness/i);
  });
});
