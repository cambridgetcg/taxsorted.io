import {
  assertWhyGraphInvariants,
  canonicaliseWhyGraph,
  whyGraphEdge,
  type WhyGraph,
  type WhyGraphNode,
} from "../../../core/why-graph";
import type {
  TaxDisputeReasonStep,
  UkTaxDisputeInterpretation,
} from "./contract";

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareAscii);
}

function caseRecord(
  interpretation: UkTaxDisputeInterpretation,
): NonNullable<WhyGraphNode["record"]> {
  return {
    kind: "dataset-record",
    dataset: "uk-case-commons",
    collection: "cases",
    recordId: interpretation.case.id,
    href: `/v1/case-commons/uk/cases/${interpretation.case.id}`,
  };
}

function sourceRecord(
  sourceId: string,
): NonNullable<WhyGraphNode["record"]> {
  return {
    kind: "dataset-record",
    dataset: "uk-case-commons",
    collection: "sources",
    recordId: sourceId,
    href: "/v1/case-commons/uk/sources",
  };
}

function graphReasonState(
  reason: TaxDisputeReasonStep,
): "decisive" | "supporting" | "checked-not-decisive" {
  if (reason.decisiveness === "decisive") return "decisive";
  if (reason.decisiveness === "supporting") return "supporting";
  return "checked-not-decisive";
}

export function buildTaxDisputeWhyGraph(
  interpretation: UkTaxDisputeInterpretation,
): WhyGraph {
  const reachedReasons = interpretation.reasoning.steps.filter(
    (step) => step.decisiveness !== "boundary",
  );
  const sourceIds = uniqueSorted([
    ...reachedReasons.flatMap((step) => step.sourceIds),
    ...interpretation.outcomes.procedural.sourceIds,
  ]);
  const graphCaseRecord = caseRecord(interpretation);
  const gapNodes: WhyGraphNode[] = [
    {
      id: "gap:evidence-burden-standard",
      kind: "gap",
      label: "Complete evidence, burden and standard map",
      description:
        "The packet exposes the decision-maker's stated confidence but does not map every evidential item, burden or standard.",
      state: "not-mapped",
      record: graphCaseRecord,
    },
    {
      id: "gap:party-arguments",
      kind: "gap",
      label: "Complete party-argument map",
      description:
        "The packet does not give a complete side-by-side account of each party's grounds, submissions, concessions and requested disposition.",
      state: "not-mapped",
      record: graphCaseRecord,
    },
    {
      id: "gap:issue-3-factual-findings",
      kind: "gap",
      label: "Issue 3 factual-findings question",
      description:
        "The canonical case record does not separately map whether factual findings in an earlier ruling can form part of the principles laid down or reasoning given for Finance Act 2014 section 205(3)(b).",
      state: "not-mapped",
      record: graphCaseRecord,
    },
    {
      id: "gap:issue-4-notice-invalidity",
      kind: "gap",
      label: "Issue 4 notice-invalidity question",
      description:
        "The canonical case record does not separately map whether the deficient Finance Act 2014 section 206 explanation invalidated the follower notice.",
      state: "not-mapped",
      record: graphCaseRecord,
    },
    {
      id: "gap:s31-2a-materiality-relief",
      kind: "gap",
      label: "Section 31(2A) materiality and relief",
      description:
        "The canonical case record does not separately map the Senior Courts Act 1981 section 31(2A) step attached to the Smallwood misdirection. The graph must not imply that every legal misdirection requires quashing.",
      state: "not-mapped",
      record: graphCaseRecord,
    },
    {
      id: "gap:source-pinpoints",
      kind: "gap",
      label: "Complete source pinpoints",
      description:
        "Decisive and supporting reasons have listed locators, but every boundary, outcome and linked source does not yet have a complete pinpoint.",
      state: "not-mapped",
      record: graphCaseRecord,
    },
  ];
  const nodes: WhyGraphNode[] = [
    {
      id: "holding",
      kind: "conclusion",
      label: "Recorded holding",
      description: interpretation.reasoning.holding,
      state: "decisive",
      record: graphCaseRecord,
    },
    ...reachedReasons.flatMap((reason): WhyGraphNode[] => {
      const claimId = reason.id.replace(/^reason:/u, "claim:");
      return [
        {
          id: reason.id,
          kind: "reasoning-step",
          label:
            reason.id === "reason:threshold-not-met"
              ? "Statutory threshold not met"
              : reason.id === "reason:earlier-ruling-overstated"
                ? "Earlier authority overstated"
                : "Restrictive reading protects access to justice",
          description: reason.proposition,
          state: graphReasonState(reason),
          record: graphCaseRecord,
        },
        {
          id: claimId,
          kind: "claim",
          label: "Public judicial reason",
          description: reason.proposition,
          state: graphReasonState(reason),
          record: graphCaseRecord,
        },
      ];
    }),
    {
      id: "consequence:notices-quashed",
      kind: "consequence",
      label: "Follower and accelerated-payment notices quashed",
      description: interpretation.outcomes.procedural.summary,
      state: "decisive",
      record: graphCaseRecord,
    },
    {
      id: "claim:procedural-outcome",
      kind: "claim",
      label: "Procedural outcome in the approved packet",
      description: interpretation.outcomes.procedural.summary,
      state: "decisive",
      record: graphCaseRecord,
    },
    ...sourceIds.map(
      (sourceId): WhyGraphNode => ({
        id: `source:${sourceId}`,
        kind: "source",
        label: sourceId,
        description:
          "Approved case-commons source record. Resolve it through the source ledger and read its support and limitations before relying on it.",
        state: "context",
        record: sourceRecord(sourceId),
      }),
    ),
    ...gapNodes,
  ];

  const edges = [
    ...reachedReasons.flatMap((reason) => {
      const claimId = reason.id.replace(/^reason:/u, "claim:");
      return [
        whyGraphEdge(
          "holding",
          "reasoned-by",
          reason.id,
          reason.decisiveness === "decisive"
            ? `This public reason is labelled outcome-determinative within ${reason.issueBranch} or part of that independently sufficient issue branch.`
            : "This public reason supports the route to the recorded holding.",
        ),
        whyGraphEdge(
          reason.id,
          "uses-claim",
          claimId,
          "The reasoning step restates a source-linked public judicial proposition.",
        ),
        ...reason.sourceIds.map((sourceId) =>
          whyGraphEdge(
            claimId,
            "supported-by",
            `source:${sourceId}`,
            "The approved case record cites this source for the public judicial proposition.",
          ),
        ),
        ...(reason.id === "reason:earlier-ruling-overstated"
          ? [
              whyGraphEdge(
                reason.id,
                "limited-by",
                "gap:s31-2a-materiality-relief",
                "This mapped Smallwood proposition does not include the separate section 31(2A) materiality and relief step needed to connect that issue branch safely to quashing.",
              ),
            ]
          : []),
      ];
    }),
    whyGraphEdge(
      "holding",
      "leads-to",
      "consequence:notices-quashed",
      "The recorded disposition left both notices quashed.",
    ),
    whyGraphEdge(
      "consequence:notices-quashed",
      "grounded-in",
      "claim:procedural-outcome",
      "The consequence is bounded by the procedural outcome recorded in the approved packet.",
    ),
    ...interpretation.outcomes.procedural.sourceIds.map((sourceId) =>
      whyGraphEdge(
        "claim:procedural-outcome",
        "supported-by",
        `source:${sourceId}`,
        "The approved packet cites this source for the procedural outcome.",
      ),
    ),
    ...gapNodes.map((gap) =>
      whyGraphEdge(
        "holding",
        "limited-by",
        gap.id,
        "This named gap limits reuse beyond the graph's declared public-reason scope.",
      ),
    ),
  ];

  const graph = canonicaliseWhyGraph({
    schema: "taxsorted.why-graph/1",
    rootNodeId: "holding",
    context: {
      subject: {
        id: interpretation.case.id,
        type: "dataset-record",
        version: interpretation.packet.corpusVersion,
      },
      jurisdiction: interpretation.case.territory,
      effectiveDate: null,
      evaluatedOn: interpretation.packet.lawAsAt,
      knowledgeAsOf: interpretation.packet.lawAsAt,
      authority: "taxsorted-analysis",
      effect: "advisory",
      externalStateChange: false,
    },
    valueHandling: {
      factValues:
        "case-financial-and-identity-fact-values-not-copied-into-graph",
      nodeIds:
        "semantic-identifiers-without-fact-values-or-array-positions",
    },
    ordering: {
      nodes: "id-ascii-ascending",
      edges: "id-ascii-ascending",
      setValues: "unique-ascii-ascending",
    },
    nodes,
    edges,
    coverage: {
      scope:
        "A TaxSorted analytical map of the recorded holding, decisive-branch and supporting public reasons, procedural remedy, admitted source records and named interpretation gaps for one approved case packet.",
      completeWithinDeclaredScope: false,
      gapNodeIds: gapNodes.map((node) => node.id).sort(compareAscii),
      boundaries: [
        "A derived graph is not a second court record or source of truth.",
        "Graph structure and reasoning labels are TaxSorted analysis; source-linked judicial propositions remain attributable to the official decision.",
        "No outcome prediction, new-matter assessment or hidden chain-of-thought is present.",
        "Source locators are editorial pointers and must be checked against the official documents.",
        "The later underlying tax result and money meaning remain in the interpretation; they are not reasons for the 2021 public-law holding.",
      ].sort(compareAscii),
    },
  });
  assertWhyGraphInvariants(graph);
  return graph;
}
