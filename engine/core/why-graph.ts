// A why graph is connective tissue, not a second source of truth. Its nodes
// point to records that remain canonical in their own answer or dataset.

export const WHY_GRAPH_SCHEMA = "taxsorted.why-graph/1" as const;

export const WHY_GRAPH_NODE_KINDS = [
  "conclusion",
  "reasoning-step",
  "fact",
  "rule",
  "claim",
  "source",
  "institution",
  "party-role",
  "consequence",
  "process",
  "route",
  "gap",
] as const;

export const WHY_GRAPH_NODE_STATES = [
  "decisive",
  "supporting",
  "checked-not-decisive",
  "conditional",
  "blocking",
  "available",
  "not-mapped",
  "not-applicable",
  "context",
] as const;

export const WHY_GRAPH_RELATIONS = [
  "reasoned-by",
  "uses-fact",
  "uses-claim",
  "applies-rule",
  "considers-rule",
  "supported-by",
  "legal-authority-from",
  "published-by",
  "administered-by",
  "responsibility-held-by",
  "performed-by",
  "decision-made-by",
  "leads-to",
  "grounded-in",
  "enforced-through",
  "reviewable-through",
  "handled-by",
  "blocked-by",
  "limited-by",
  "addressed-by",
] as const;

export const WHY_GRAPH_SUBJECT_TYPES = [
  "assessment",
  "calculation",
  "dataset-record",
  "comparison",
  "explanation",
] as const;

export const WHY_GRAPH_AUTHORITIES = [
  "taxsorted-analysis",
  "official-decision",
  "source-reported-claim",
  "deterministic-calculation",
] as const;

export const WHY_GRAPH_EFFECTS = [
  "advisory",
  "calculation",
  "preparation",
  "official-decision",
  "external-state-change",
] as const;

export const WHY_GRAPH_RUNTIME_INVARIANTS = [
  "the root exists and is a conclusion with no incoming edge",
  "node and edge IDs are semantic, unique and ASCII sorted",
  "every edge endpoint resolves and every relation joins compatible node kinds",
  "every node is reachable from the root and the directed graph is acyclic",
  "response selectors and exact dataset IDs carry identity; names and array positions do not",
  "fact nodes reference canonical response records without copying supplied case financial or identity fact values into graph text or IDs",
  "every applied tax rule has its own admitted binding authority edge; unrelated law elsewhere in the ledger cannot substitute",
  "every rule node has a legal-authority edge or an explicit authority gap",
  "legal-authority-from ends at an admitted binding source; guidance remains guidance",
  "legal responsibility, administration, actual performance and official decision authority remain separate relations",
  "a TaxSorted-analysis conclusion cannot name an official decision-maker",
  "every applicable consequence is grounded in a rule or claim and every gap node is declared in coverage",
  "missing enforcement, review or appeal coverage ends in a named gap and never becomes an inferred right",
  "JSON Schema proves structural shape only; runtime invariants and source admission remain separate checks",
] as const;

export type WhyGraphNodeKind = (typeof WHY_GRAPH_NODE_KINDS)[number];
export type WhyGraphNodeState = (typeof WHY_GRAPH_NODE_STATES)[number];
export type WhyGraphRelation = (typeof WHY_GRAPH_RELATIONS)[number];
export type WhyGraphSubjectType = (typeof WHY_GRAPH_SUBJECT_TYPES)[number];
export type WhyGraphAuthority = (typeof WHY_GRAPH_AUTHORITIES)[number];
export type WhyGraphEffect = (typeof WHY_GRAPH_EFFECTS)[number];

export type WhyGraphRecordReference =
  | {
      kind: "response-record";
      collection: string;
      key: string;
      value: string;
    }
  | {
      kind: "dataset-record";
      dataset: string;
      collection: string;
      recordId: string;
      href: string;
    }
  | {
      kind: "external-resource";
      href: string;
    };

export interface WhyGraphNode {
  id: string;
  kind: WhyGraphNodeKind;
  label: string;
  description: string;
  state: WhyGraphNodeState;
  record: WhyGraphRecordReference | null;
}

export interface WhyGraphEdge {
  id: string;
  from: string;
  relation: WhyGraphRelation;
  to: string;
  explanation: string;
}

export interface WhyGraph {
  schema: typeof WHY_GRAPH_SCHEMA;
  rootNodeId: string;
  context: {
    subject: {
      id: string;
      type: WhyGraphSubjectType;
      version: string;
    };
    jurisdiction: string;
    effectiveDate: string | null;
    evaluatedOn: string;
    knowledgeAsOf: string;
    authority: WhyGraphAuthority;
    effect: WhyGraphEffect;
    externalStateChange: boolean;
  };
  valueHandling: {
    factValues: "case-financial-and-identity-fact-values-not-copied-into-graph";
    nodeIds: "semantic-identifiers-without-fact-values-or-array-positions";
  };
  ordering: {
    nodes: "id-ascii-ascending";
    edges: "id-ascii-ascending";
    setValues: "unique-ascii-ascending";
  };
  nodes: WhyGraphNode[];
  edges: WhyGraphEdge[];
  coverage: {
    scope: string;
    completeWithinDeclaredScope: boolean;
    gapNodeIds: string[];
    boundaries: string[];
  };
}

type KindPair = `${WhyGraphNodeKind}->${WhyGraphNodeKind}`;

const relationKinds: Record<WhyGraphRelation, ReadonlySet<KindPair>> = {
  "reasoned-by": new Set(["conclusion->reasoning-step"]),
  "uses-fact": new Set([
    "reasoning-step->fact",
    "gap->fact",
  ]),
  "uses-claim": new Set([
    "reasoning-step->claim",
    "consequence->claim",
    "process->claim",
    "route->claim",
  ]),
  "applies-rule": new Set(["reasoning-step->rule"]),
  "considers-rule": new Set(["reasoning-step->rule"]),
  "supported-by": new Set([
    "claim->source",
    "consequence->source",
    "process->source",
    "route->source",
    "gap->source",
  ]),
  "legal-authority-from": new Set(["rule->source"]),
  "published-by": new Set(["source->institution"]),
  "administered-by": new Set([
    "rule->institution",
    "consequence->institution",
    "process->institution",
  ]),
  "responsibility-held-by": new Set(["consequence->party-role"]),
  "performed-by": new Set([
    "consequence->party-role",
    "consequence->institution",
    "route->party-role",
    "route->institution",
  ]),
  "decision-made-by": new Set([
    "conclusion->institution",
    "route->institution",
    "process->institution",
  ]),
  "leads-to": new Set([
    "conclusion->consequence",
    "conclusion->route",
  ]),
  "grounded-in": new Set([
    "consequence->claim",
    "consequence->rule",
    "process->claim",
    "process->rule",
  ]),
  "enforced-through": new Set(["consequence->process"]),
  "reviewable-through": new Set([
    "conclusion->route",
    "consequence->route",
    "process->route",
  ]),
  "handled-by": new Set([
    "route->institution",
    "route->party-role",
  ]),
  "blocked-by": new Set([
    "conclusion->gap",
    "reasoning-step->gap",
  ]),
  "limited-by": new Set([
    "conclusion->gap",
    "reasoning-step->gap",
    "rule->gap",
    "consequence->gap",
    "process->gap",
    "route->gap",
  ]),
  "addressed-by": new Set(["gap->route"]),
};

const semanticId = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const resourceHref = /^(?:https:\/\/|\/)/;

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertSortedUnique(values: string[], label: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (compareAscii(values[index - 1], values[index]) >= 0) {
      throw new Error(`${label} must be unique and ASCII sorted`);
    }
  }
}

function assertText(value: string, label: string, maximum: number): void {
  if (value.trim().length === 0 || value.length > maximum) {
    throw new Error(`${label} must contain 1 to ${maximum} characters`);
  }
}

export function whyGraphEdge(
  from: string,
  relation: WhyGraphRelation,
  to: string,
  explanation: string,
): WhyGraphEdge {
  return {
    id: `edge:${from}:${relation}:${to}`,
    from,
    relation,
    to,
    explanation,
  };
}

export function canonicaliseWhyGraph(graph: WhyGraph): WhyGraph {
  return {
    ...graph,
    nodes: [...graph.nodes].sort((left, right) => compareAscii(left.id, right.id)),
    edges: [...graph.edges].sort((left, right) => compareAscii(left.id, right.id)),
    coverage: {
      ...graph.coverage,
      gapNodeIds: [...new Set(graph.coverage.gapNodeIds)].sort(compareAscii),
      boundaries: [...new Set(graph.coverage.boundaries)].sort(compareAscii),
    },
  };
}

/**
 * Validate the shared graph semantics that JSON Schema cannot express. Domain
 * adapters add stricter checks for native facts, rules and source authority.
 */
export function assertWhyGraphInvariants(graph: WhyGraph): void {
  if (graph.schema !== WHY_GRAPH_SCHEMA) throw new Error("WhyGraph schema is not supported");
  if (graph.nodes.length === 0 || graph.nodes.length > 250) {
    throw new Error("WhyGraph must contain 1 to 250 nodes");
  }
  if (graph.edges.length > 1_000) throw new Error("WhyGraph cannot exceed 1000 edges");
  if (!isoDate.test(graph.context.evaluatedOn) || !isoDate.test(graph.context.knowledgeAsOf)) {
    throw new Error("WhyGraph context dates must use YYYY-MM-DD");
  }
  if (graph.context.effectiveDate !== null && !isoDate.test(graph.context.effectiveDate)) {
    throw new Error("WhyGraph effectiveDate must be null or YYYY-MM-DD");
  }
  if (graph.context.externalStateChange !== (graph.context.effect === "external-state-change")) {
    throw new Error("WhyGraph effect and externalStateChange disagree");
  }
  if (!WHY_GRAPH_AUTHORITIES.includes(graph.context.authority)) {
    throw new Error("WhyGraph context authority is not supported");
  }
  if (!WHY_GRAPH_EFFECTS.includes(graph.context.effect)) {
    throw new Error("WhyGraph context effect is not supported");
  }
  if (!WHY_GRAPH_SUBJECT_TYPES.includes(graph.context.subject.type)) {
    throw new Error("WhyGraph subject type is not supported");
  }
  if (!semanticId.test(graph.context.subject.id) || graph.context.subject.id.length > 180) {
    throw new Error("WhyGraph subject ID must be a bounded semantic ID");
  }
  assertText(graph.context.subject.version, "WhyGraph subject version", 100);
  assertText(graph.context.jurisdiction, "WhyGraph jurisdiction", 200);

  const nodes = new Map<string, WhyGraphNode>();
  for (const node of graph.nodes) {
    if (!WHY_GRAPH_NODE_KINDS.includes(node.kind) || !WHY_GRAPH_NODE_STATES.includes(node.state)) {
      throw new Error(`WhyGraph node ${node.id} has an unsupported kind or state`);
    }
    if (!semanticId.test(node.id) || node.id.length > 180) {
      throw new Error(`WhyGraph node ID is not a bounded semantic ID: ${node.id}`);
    }
    if (nodes.has(node.id)) throw new Error(`WhyGraph node ID is duplicated: ${node.id}`);
    assertText(node.label, `WhyGraph node ${node.id} label`, 500);
    assertText(node.description, `WhyGraph node ${node.id} description`, 4_000);
    if (node.record?.kind === "response-record") {
      assertText(node.record.collection, `WhyGraph node ${node.id} response collection`, 160);
      assertText(node.record.key, `WhyGraph node ${node.id} response key`, 80);
      assertText(node.record.value, `WhyGraph node ${node.id} response selector`, 500);
    } else if (node.record?.kind === "dataset-record") {
      assertText(node.record.dataset, `WhyGraph node ${node.id} dataset`, 160);
      assertText(node.record.collection, `WhyGraph node ${node.id} dataset collection`, 160);
      assertText(node.record.recordId, `WhyGraph node ${node.id} dataset record ID`, 500);
      if (!resourceHref.test(node.record.href) || node.record.href.length > 2_000) {
        throw new Error(`WhyGraph node ${node.id} has an invalid dataset href`);
      }
    } else if (node.record?.kind === "external-resource") {
      if (!resourceHref.test(node.record.href) || node.record.href.length > 2_000) {
        throw new Error(`WhyGraph node ${node.id} has an invalid external href`);
      }
    }
    nodes.set(node.id, node);
  }
  assertSortedUnique(graph.nodes.map((node) => node.id), "WhyGraph nodes");

  const root = nodes.get(graph.rootNodeId);
  if (!root) throw new Error("WhyGraph rootNodeId does not resolve");
  if (root.kind !== "conclusion") throw new Error("WhyGraph root must be a conclusion");

  const edgeIds = new Set<string>();
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!WHY_GRAPH_RELATIONS.includes(edge.relation)) {
      throw new Error(`WhyGraph edge ${edge.id} has an unsupported relation`);
    }
    if (!semanticId.test(edge.id) || edge.id.length > 500) {
      throw new Error(`WhyGraph edge ID is not a bounded semantic ID: ${edge.id}`);
    }
    if (edgeIds.has(edge.id)) throw new Error(`WhyGraph edge ID is duplicated: ${edge.id}`);
    if (edge.id !== `edge:${edge.from}:${edge.relation}:${edge.to}`) {
      throw new Error(`WhyGraph edge ID does not match its semantic endpoints: ${edge.id}`);
    }
    edgeIds.add(edge.id);
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) throw new Error(`WhyGraph edge ${edge.id} has a dangling endpoint`);
    if (edge.from === edge.to) throw new Error(`WhyGraph edge ${edge.id} is self-referential`);
    const pair = `${from.kind}->${to.kind}` as KindPair;
    if (!relationKinds[edge.relation].has(pair)) {
      throw new Error(`WhyGraph edge ${edge.id} cannot use ${edge.relation} for ${pair}`);
    }
    if (edge.relation === "applies-rule" && to.state !== "decisive") {
      throw new Error(`WhyGraph applies-rule edge ${edge.id} must target a decisive rule`);
    }
    if (edge.relation === "considers-rule" && to.state !== "checked-not-decisive") {
      throw new Error(`WhyGraph considers-rule edge ${edge.id} must target a checked-not-decisive rule`);
    }
    assertText(edge.explanation, `WhyGraph edge ${edge.id} explanation`, 1_000);
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
  }
  assertSortedUnique(graph.edges.map((edge) => edge.id), "WhyGraph edges");

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (nodeId: string): void => {
    if (visiting.has(nodeId)) throw new Error(`WhyGraph contains a cycle at ${nodeId}`);
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) walk(next);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  walk(graph.rootNodeId);
  if (visited.size !== nodes.size) {
    const unreachable = [...nodes.keys()].filter((id) => !visited.has(id)).sort(compareAscii);
    throw new Error(`WhyGraph has unreachable nodes: ${unreachable.join(", ")}`);
  }

  if (graph.edges.some((edge) => edge.to === graph.rootNodeId)) {
    throw new Error("WhyGraph root cannot have an incoming edge");
  }
  if (
    graph.context.authority === "taxsorted-analysis"
    && graph.edges.some((edge) => (
      edge.from === graph.rootNodeId && edge.relation === "decision-made-by"
    ))
  ) {
    throw new Error("A TaxSorted-analysis conclusion cannot name an official decision-maker");
  }
  const rootRelations = graph.edges
    .filter((edge) => edge.from === graph.rootNodeId)
    .map((edge) => edge.relation);
  if (!rootRelations.some((relation) => ["reasoned-by", "blocked-by", "limited-by"].includes(relation))) {
    throw new Error("WhyGraph conclusion needs reasoning or an explicit gap");
  }
  for (const node of graph.nodes.filter((candidate) => candidate.kind === "rule")) {
    if (!graph.edges.some((edge) => (
      edge.from === node.id
      && (edge.relation === "legal-authority-from" || edge.relation === "limited-by")
    ))) {
      throw new Error(`WhyGraph rule ${node.id} needs binding authority or an explicit gap`);
    }
  }

  assertSortedUnique(graph.coverage.gapNodeIds, "WhyGraph coverage gapNodeIds");
  if (graph.coverage.gapNodeIds.length > 100 || graph.coverage.boundaries.length > 50) {
    throw new Error("WhyGraph coverage arrays exceed their bounded sizes");
  }
  for (const gapNodeId of graph.coverage.gapNodeIds) {
    if (nodes.get(gapNodeId)?.kind !== "gap") {
      throw new Error(`WhyGraph coverage gap does not resolve to a gap node: ${gapNodeId}`);
    }
  }
  const graphGapIds = graph.nodes
    .filter((node) => node.kind === "gap")
    .map((node) => node.id);
  if (
    graphGapIds.length !== graph.coverage.gapNodeIds.length
    || graphGapIds.some((id) => !graph.coverage.gapNodeIds.includes(id))
  ) {
    throw new Error("Every WhyGraph gap node must appear in coverage.gapNodeIds");
  }
  if (graph.coverage.completeWithinDeclaredScope !== (graphGapIds.length === 0)) {
    throw new Error("WhyGraph completeness must agree with its declared gaps");
  }
  assertSortedUnique(graph.coverage.boundaries, "WhyGraph coverage boundaries");
  assertText(graph.coverage.scope, "WhyGraph coverage scope", 1_000);
}
