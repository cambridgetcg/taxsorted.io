// Public wire contract for the shared why graph. The engine owns semantic
// validation; this module publishes its bounded JSON shape and plain words.

import { z } from "@hono/zod-openapi";
import {
  WHY_GRAPH_AUTHORITIES,
  WHY_GRAPH_EFFECTS,
  WHY_GRAPH_NODE_KINDS,
  WHY_GRAPH_NODE_STATES,
  WHY_GRAPH_RELATIONS,
  WHY_GRAPH_RUNTIME_INVARIANTS,
  WHY_GRAPH_SUBJECT_TYPES,
} from "@taxsorted/engine/why-graph";

const id = z.string().min(1).max(500).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const shortText = z.string().trim().min(1).max(1_000);
const text = z.string().trim().min(1).max(4_000);
const date = z.iso.date();
const href = z.string().max(2_000).regex(/^(?:https:\/\/|\/)/);

export const WhyGraphRecordReferenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("response-record"),
    collection: z.string().min(1).max(160),
    key: z.string().min(1).max(80),
    value: z.string().min(1).max(500),
  }).strict(),
  z.object({
    kind: z.literal("dataset-record"),
    dataset: z.string().min(1).max(160),
    collection: z.string().min(1).max(160),
    recordId: z.string().min(1).max(500),
    href,
  }).strict(),
  z.object({
    kind: z.literal("external-resource"),
    href,
  }).strict(),
]).openapi("WhyGraphRecordReference");

export const WhyGraphNodeSchema = z.object({
  id: id.max(180),
  kind: z.enum(WHY_GRAPH_NODE_KINDS),
  label: z.string().trim().min(1).max(500),
  description: text,
  state: z.enum(WHY_GRAPH_NODE_STATES),
  record: WhyGraphRecordReferenceSchema.nullable(),
}).strict().openapi("WhyGraphNode");

export const WhyGraphEdgeSchema = z.object({
  id,
  from: id.max(180),
  relation: z.enum(WHY_GRAPH_RELATIONS),
  to: id.max(180),
  explanation: shortText,
}).strict().openapi("WhyGraphEdge");

export const WhyGraphSchema = z.object({
  schema: z.literal("taxsorted.why-graph/1"),
  rootNodeId: id.max(180),
  context: z.object({
    subject: z.object({
      id: id.max(180),
      type: z.enum(WHY_GRAPH_SUBJECT_TYPES),
      version: z.string().min(1).max(100),
    }).strict(),
    jurisdiction: z.string().min(1).max(200),
    effectiveDate: date.nullable(),
    evaluatedOn: date,
    knowledgeAsOf: date,
    authority: z.enum(WHY_GRAPH_AUTHORITIES),
    effect: z.enum(WHY_GRAPH_EFFECTS),
    externalStateChange: z.boolean(),
  }).strict(),
  valueHandling: z.object({
    factValues: z.literal("case-financial-and-identity-fact-values-not-copied-into-graph"),
    nodeIds: z.literal("semantic-identifiers-without-fact-values-or-array-positions"),
  }).strict(),
  ordering: z.object({
    nodes: z.literal("id-ascii-ascending"),
    edges: z.literal("id-ascii-ascending"),
    setValues: z.literal("unique-ascii-ascending"),
  }).strict(),
  nodes: z.array(WhyGraphNodeSchema).min(1).max(250),
  edges: z.array(WhyGraphEdgeSchema).max(1_000),
  coverage: z.object({
    scope: shortText,
    completeWithinDeclaredScope: z.boolean(),
    gapNodeIds: z.array(id.max(180)).max(100),
    boundaries: z.array(shortText).max(50),
  }).strict(),
}).strict().openapi("WhyGraph");

const nodeMeanings: Record<(typeof WHY_GRAPH_NODE_KINDS)[number], string> = {
  conclusion: "The answer or public statement whose support and limits are being traced.",
  "reasoning-step": "One reached step in the declared method; its state says whether it was decisive or supporting.",
  fact: "A selector for a canonical provided, derived or unknown fact; the graph does not copy its financial value.",
  rule: "A precisely cited legal or formal rule, kept separate from guidance and commentary.",
  claim: "A sourced statement used by a reasoning step or consequence.",
  source: "The canonical source record carrying publisher, legal force, dates, support and limits.",
  institution: "A public or service institution acting in a declared capacity.",
  "party-role": "A role such as caller or qualified adviser; it is not a named-person record.",
  consequence: "A duty, deadline, amount, penalty position or other result that follows within the declared scope.",
  process: "A collection, enforcement or other institutional process, only where its applicability is evidenced.",
  route: "A reassessment, correction, official-decision, review, appeal or operational next-action route.",
  gap: "A missing fact, authority bridge, source, process or challenge route that limits the graph.",
};

const relationMeanings: Record<(typeof WHY_GRAPH_RELATIONS)[number], string> = {
  "reasoned-by": "from conclusion to a reached reasoning step",
  "uses-fact": "from a reasoning step or named gap to the exact fact selector it reads",
  "uses-claim": "from reasoning, consequence, process or route to a claim",
  "applies-rule": "from reasoning to a rule decisive for this result",
  "considers-rule": "from reasoning to a rule checked but not labelled decisive",
  "supported-by": "from a claim, consequence, process, route or gap to a source",
  "legal-authority-from": "from a rule to the admitted binding source that creates its authority",
  "published-by": "from a source to its publishing institution",
  "administered-by": "from a rule, consequence or process to its administrator",
  "responsibility-held-by": "from a consequence to the role on whom the mapped duty legally rests",
  "performed-by": "from an obligation or route to the party that carries out the action",
  "decision-made-by": "from a conclusion, process or route to the competent official decision-maker",
  "leads-to": "from a conclusion to a consequence or useful next route",
  "grounded-in": "from a consequence or process to its supporting claim or rule",
  "enforced-through": "from a consequence to an evidenced enforcement process",
  "reviewable-through": "from a conclusion, consequence or process to a review or correction route",
  "handled-by": "from a route to the institution or party that handles it",
  "blocked-by": "from a conclusion or reasoning step to a gap preventing determination or reliance",
  "limited-by": "from a node to a declared non-blocking boundary or unmapped link",
  "addressed-by": "from a gap to a route that can address it",
};

export const whyGraphFramework = {
  schema: "taxsorted.why-graph-framework/1",
  graphSchema: "taxsorted.why-graph/1",
  title: "TaxSorted shared why-graph contract",
  status: "first-adopter-live",
  purpose:
    "Let a person or agent walk from a conclusion to the facts, rules, claims, sources, institutions, consequences, routes and gaps that actually support or limit it.",
  direction:
    "Edges read naturally from their from-node to their to-node. Traversal begins at the conclusion and moves outward toward support, responsibility, effects, challenge and limits.",
  canonicalTruth:
    "The graph is a derived connective layer. Referenced answer and dataset records remain canonical and keep their native authority, evidence, rights and correction rules.",
  representation: {
    current: "bounded-typed-json-adjacency",
    why: "Ordinary JSON plus OpenAPI is directly usable by agents and existing clients without resolving an external semantic context.",
    futureProjection: "Stable node IDs and naturally directed relations can be projected into JSON-LD, RDF or another linked-data protocol later without changing the v1 meanings.",
  },
  recordReferences: [
    {
      kind: "response-record",
      meaning: "Select one canonical record in the containing response by its declared collection, stable key and exact value; never interpret value as an array position.",
    },
    {
      kind: "dataset-record",
      meaning: "Resolve the exact dataset, collection and recordId through href. The referenced dataset record remains canonical and may carry its own version and rights limits.",
    },
    {
      kind: "external-resource",
      meaning: "Follow href to an external or service resource. The link identifies the resource but does not prove its content, authority or applicability.",
    },
  ],
  nodeKinds: WHY_GRAPH_NODE_KINDS.map((kind) => ({ kind, meaning: nodeMeanings[kind] })),
  relations: WHY_GRAPH_RELATIONS.map((relation) => ({ relation, meaning: relationMeanings[relation] })),
  runtimeInvariants: [...WHY_GRAPH_RUNTIME_INVARIANTS],
  readingOrder: [
    "Start at rootNodeId.",
    "Follow reasoned-by to reached reasoning steps.",
    "Follow uses-fact, applies-rule or considers-rule and uses-claim.",
    "Follow legal-authority-from or supported-by to admitted sources and publishers.",
    "Follow leads-to, responsibility-held-by, administered-by, performed-by and decision-made-by without merging those roles.",
    "Finish every missing process, review or appeal link at an explicit gap.",
  ],
  adoption: {
    status: "first-adopter",
    endpoint: "/v1/uk/tax-expert/mtd-income-tax/assessments",
    responsePath: "/reasoning/whyGraph",
    capabilityVersion: "2026-07-11.5",
    wireCompatibility:
      "The tax-answer v1 OpenAPI field is optional for forward-compatible additive reading; this adopter emits it on every successful assessment, so strict validators need the current OpenAPI and capability version.",
  },
  routes: {
    framework: "/v1/why-graph",
    schema: "/v1/why-graph/schema",
    openApi: "/openapi/why-graph.json",
  },
  boundaries: [
    "A graph is not proof that a referenced source is correct, current or legally sufficient.",
    "A TaxSorted conclusion is not an HMRC, regulator, court or tribunal decision.",
    "Complaint, correction, administrative review, statutory appeal and judicial review remain different routes.",
    "Missing evidence is unknown, not proof that a duty, right, relation or event does not exist.",
    "JSON Schema checks structure; runtime invariants and source admission check meaning.",
    "No ingestion, people graph, source crawler, trust score or external state-changing operation is created by this framework.",
  ],
} as const;

export const WhyGraphFrameworkSchema = z.object({
  schema: z.literal("taxsorted.why-graph-framework/1"),
  graphSchema: z.literal("taxsorted.why-graph/1"),
  title: z.string(),
  status: z.literal("first-adopter-live"),
  purpose: text,
  direction: text,
  canonicalTruth: text,
  representation: z.object({
    current: z.literal("bounded-typed-json-adjacency"),
    why: text,
    futureProjection: text,
  }).strict(),
  recordReferences: z.array(z.object({
    kind: z.enum(["response-record", "dataset-record", "external-resource"]),
    meaning: text,
  }).strict()).length(3),
  nodeKinds: z.array(z.object({
    kind: z.enum(WHY_GRAPH_NODE_KINDS),
    meaning: text,
  }).strict()).length(WHY_GRAPH_NODE_KINDS.length),
  relations: z.array(z.object({
    relation: z.enum(WHY_GRAPH_RELATIONS),
    meaning: text,
  }).strict()).length(WHY_GRAPH_RELATIONS.length),
  runtimeInvariants: z.array(text).min(1).max(30),
  readingOrder: z.array(text).min(1).max(20),
  adoption: z.object({
    status: z.literal("first-adopter"),
    endpoint: z.literal("/v1/uk/tax-expert/mtd-income-tax/assessments"),
    responsePath: z.literal("/reasoning/whyGraph"),
    capabilityVersion: z.literal("2026-07-11.5"),
    wireCompatibility: text,
  }).strict(),
  routes: z.object({
    framework: z.literal("/v1/why-graph"),
    schema: z.literal("/v1/why-graph/schema"),
    openApi: z.literal("/openapi/why-graph.json"),
  }).strict(),
  boundaries: z.array(text).min(1).max(20),
}).strict().openapi("WhyGraphFramework");

export const whyGraphJsonSchemaDocument = {
  ...z.toJSONSchema(WhyGraphSchema),
  $id: "https://api.taxsorted.io/v1/why-graph/schema",
  title: "TaxSorted why graph",
  description:
    "Structural JSON Schema for taxsorted.why-graph/1. Runtime graph, domain, source-admission and publication invariants remain separate checks.",
  "x-taxsorted-runtime-invariants": [...WHY_GRAPH_RUNTIME_INVARIANTS],
  "x-taxsorted-validation-scope": "structural-shape-only",
} as const;

export const WhyGraphJsonSchemaDocumentSchema = z.object({}).passthrough()
  .openapi("WhyGraphJsonSchemaDocument");
