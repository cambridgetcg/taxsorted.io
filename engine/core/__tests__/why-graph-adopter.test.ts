import { describe, expect, it } from "vitest";
import {
  assertAdmittedWhyGraph,
  canonicalAdmissionJson,
  canonicaliseWhyGraph,
  type WhyGraph,
  type WhyGraphAdopter,
} from "../index";

function graph(): WhyGraph {
  return canonicaliseWhyGraph({
    schema: "taxsorted.why-graph/1",
    rootNodeId: "conclusion:record",
    context: {
      subject: {
        id: "example.record",
        type: "dataset-record",
        version: "1",
      },
      jurisdiction: "United Kingdom",
      effectiveDate: null,
      evaluatedOn: "2026-07-12",
      knowledgeAsOf: "2026-07-12",
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
        id: "conclusion:record",
        kind: "conclusion",
        label: "Example record",
        description: "A structurally valid record whose domain selector still needs admission.",
        state: "blocking",
        record: {
          kind: "dataset-record",
          dataset: "example",
          collection: "records",
          recordId: "record-1",
          href: "/records/record-1",
        },
      },
      {
        id: "gap:domain-admission",
        kind: "gap",
        label: "Domain admission",
        description: "The test adopter decides whether the native record matches.",
        state: "blocking",
        record: null,
      },
    ],
    edges: [
      {
        id: "edge:conclusion:record:blocked-by:gap:domain-admission",
        from: "conclusion:record",
        relation: "blocked-by",
        to: "gap:domain-admission",
        explanation: "The domain selector must be admitted before this graph can be used.",
      },
    ],
    coverage: {
      scope: "A test record.",
      completeWithinDeclaredScope: false,
      gapNodeIds: ["gap:domain-admission"],
      boundaries: ["Structural validity is not domain admission."],
    },
  });
}

describe("why-graph adopter seam", () => {
  const adopter: WhyGraphAdopter<{ recordId: string }> = {
    id: "example.records",
    graphSchema: "taxsorted.why-graph/1",
    assertDomainInvariants(candidate, native) {
      const root = candidate.nodes.find((node) => node.id === candidate.rootNodeId);
      if (
        root?.record?.kind !== "dataset-record"
        || root.record.recordId !== native.recordId
      ) {
        throw new Error("Example root selector does not match the native record");
      }
    },
  };

  it("runs shared invariants before adopter-owned meaning checks", () => {
    expect(() => assertAdmittedWhyGraph(graph(), { recordId: "record-1" }, adopter))
      .not.toThrow();

    expect(() => assertAdmittedWhyGraph(graph(), { recordId: "record-2" }, adopter))
      .toThrow(/root selector.*native record/i);

    const malformed = structuredClone(graph());
    malformed.nodes.reverse();
    expect(() => assertAdmittedWhyGraph(malformed, { recordId: "record-1" }, adopter))
      .toThrow(/ASCII sorted/i);
  });

  it("treats object key order as transport detail", () => {
    const wireRoundTrip = JSON.parse(canonicalAdmissionJson(graph())) as WhyGraph;
    expect(() => assertAdmittedWhyGraph(
      wireRoundTrip,
      { recordId: "record-1" },
      adopter,
    )).not.toThrow();
  });

  it("rejects native values that are not plain JSON data", () => {
    expect(() => canonicalAdmissionJson({ meaning: new Map([["x", 1]]) }))
      .toThrow(/plain JSON objects/i);
    expect(() => canonicalAdmissionJson({ amount: Number.POSITIVE_INFINITY }))
      .toThrow(/non-finite numbers/i);
    expect(() => canonicalAdmissionJson({ missing: undefined }))
      .toThrow(/undefined cannot be used/i);
  });

  it("does not let an adopter mutate the artifact it certifies", () => {
    const candidate = graph();
    const mutating: WhyGraphAdopter<{ recordId: string }> = {
      id: "example.mutating",
      graphSchema: "taxsorted.why-graph/1",
      assertDomainInvariants(domainGraph) {
        (domainGraph.nodes[0] as { label: string }).label = "Changed during validation";
      },
    };
    expect(() => assertAdmittedWhyGraph(
      candidate,
      { recordId: "record-1" },
      mutating,
    )).toThrow(/mutated the graph/i);
    expect(candidate.nodes[0].label).toBe("Example record");
  });

  it("does not let an adopter mutate the native meaning it checks against", () => {
    const native = { recordId: "record-1", review: { admitted: true } };
    const mutating: WhyGraphAdopter<typeof native> = {
      id: "example.mutating-native",
      graphSchema: "taxsorted.why-graph/1",
      assertDomainInvariants(_domainGraph, domainNative) {
        (domainNative.review as { admitted: boolean }).admitted = false;
      },
    };
    expect(() => assertAdmittedWhyGraph(graph(), native, mutating))
      .toThrow(/mutated its native input/i);
    expect(native.review.admitted).toBe(true);
  });
});
