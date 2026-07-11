import {
  assertWhyGraphInvariants,
  type WhyGraph,
} from "../../../core/why-graph";

export type TaxAnswerStatus =
  | "determined"
  | "needs_facts"
  | "needs_professional_review"
  | "conflicting_authority"
  | "unsupported";

export type TaxTask = "explain" | "classify" | "calculate" | "plan" | "prepare";

export type TaxFactValue = string | number | boolean | null;

export interface TaxFact {
  path: string;
  label: string;
  value: TaxFactValue;
  material: boolean;
}

export interface UnknownTaxFact {
  path: string;
  label: string;
  whyItMatters: string;
  material: boolean;
}

export interface TaxAssumption {
  id: string;
  statement: string;
  material: boolean;
  acceptedByCaller: boolean;
}

export type TaxSourceKind =
  | "primary-legislation"
  | "secondary-legislation"
  | "tertiary-legislation"
  | "case-law"
  | "hmrc-guidance"
  | "hmrc-manual"
  | "official-form"
  | "policy-announcement"
  | "professional-commentary";

export type TaxSourceLegalForce =
  | "binding-law"
  | "binding-in-stated-part"
  | "precedent"
  | "hmrc-position"
  | "official-explanation"
  | "proposal-only"
  | "commentary";

export type TaxSourceStatus =
  | "proposed"
  | "enacted-not-commenced"
  | "in-force"
  | "partly-in-force"
  | "superseded"
  | "historical";

export interface TaxSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  kind: TaxSourceKind;
  legalForce: TaxSourceLegalForce;
  status: TaxSourceStatus;
  citation?: string;
  territorialExtent: string[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
  versionAsAt?: string;
  publishedOn?: string;
  updatedOn?: string;
  retrievedOn: string;
  reviewDueOn: string;
  contentHash?: string;
  supports: string[];
  doesNotProve: string[];
}

export interface EvidenceClaim {
  id: string;
  statement: string;
  kind: "law" | "hmrc-position" | "taxsorted-analysis" | "calculation";
  support: "direct" | "derived" | "contrary";
  sourceIds: string[];
}

export interface ReasoningStep {
  id: string;
  statement: string;
  factPaths: string[];
  claimIds: string[];
}

export interface TaxNextAction {
  id: string;
  label: string;
  href?: string;
  responsibleParty: "caller" | "HMRC" | "TaxSorted" | "qualified-adviser";
}

export interface TaxAnswer<T> {
  schema: "taxsorted.tax-answer/1";
  capability: {
    id: string;
    version: string;
    jurisdiction: string;
    taxType: string;
    task: TaxTask;
  };
  status: TaxAnswerStatus;
  applicability: {
    effectiveDate: string;
    evaluatedOn: string;
    knowledgeAsOf: string;
    taxPeriod?: { start: string; end: string; label: string };
    territories: string[];
    taxpayerTypes: string[];
    covered: boolean;
    ruleIds: string[];
  };
  facts: {
    provided: TaxFact[];
    derived: TaxFact[];
    unknown: UnknownTaxFact[];
    assumptions: TaxAssumption[];
  };
  answer: T | null;
  reasoning: { steps: ReasoningStep[]; whyGraph: WhyGraph };
  evidence: { claims: EvidenceClaim[]; sources: TaxSource[] };
  confidence: {
    level: "high" | "medium" | "low";
    basis: string[];
    blockers: string[];
    notProbability: true;
  };
  escalation: {
    required: boolean;
    reasonCodes: string[];
    factsNeeded: string[];
    nextActions: TaxNextAction[];
  };
  dataUse: {
    stored: false;
    retention: string;
    usedForTraining: false;
  };
}

/**
 * Cross-capability invariants. This validates the meaning of a TaxAnswer, not
 * merely its JSON shape. It deliberately throws during development if an
 * answer claims more certainty than its facts or evidence support.
 */
export function assertTaxAnswerInvariants<T>(answer: TaxAnswer<T>): void {
  assertWhyGraphInvariants(answer.reasoning.whyGraph);
  if (answer.reasoning.whyGraph.context.subject.id !== answer.capability.id) {
    throw new Error("TaxAnswer why graph subject must match the capability ID");
  }
  if (answer.reasoning.whyGraph.context.subject.version !== answer.capability.version) {
    throw new Error("TaxAnswer why graph subject version must match the capability version");
  }
  if (
    answer.reasoning.whyGraph.context.authority !== "taxsorted-analysis"
    || answer.reasoning.whyGraph.context.externalStateChange
  ) {
    throw new Error("TaxAnswer why graph must remain non-authoritative and without external state change");
  }
  const providedFacts = new Map(answer.facts.provided.map((fact) => [fact.path, fact]));
  if (providedFacts.size !== answer.facts.provided.length) {
    throw new Error("TaxAnswer provided fact paths must be unique");
  }
  const derivedFacts = new Map(answer.facts.derived.map((fact) => [fact.path, fact]));
  if (derivedFacts.size !== answer.facts.derived.length) {
    throw new Error("TaxAnswer derived fact paths must be unique");
  }
  const unknownFacts = new Map(answer.facts.unknown.map((fact) => [fact.path, fact]));
  if (unknownFacts.size !== answer.facts.unknown.length) {
    throw new Error("TaxAnswer unknown fact paths must be unique");
  }
  for (const fact of answer.facts.provided) {
    if ((fact.value === null || fact.value === "unknown") && !unknownFacts.has(fact.path)) {
      throw new Error(`Unknown provided fact ${fact.path} must be reconciled in facts.unknown`);
    }
  }

  const sources = new Map(answer.evidence.sources.map((source) => [source.id, source]));
  if (sources.size !== answer.evidence.sources.length) {
    throw new Error("TaxAnswer source IDs must be unique");
  }

  const claims = new Map(answer.evidence.claims.map((claim) => [claim.id, claim]));
  if (claims.size !== answer.evidence.claims.length) {
    throw new Error("TaxAnswer claim IDs must be unique");
  }
  const reasoningSteps = new Map(answer.reasoning.steps.map((step) => [step.id, step]));
  if (reasoningSteps.size !== answer.reasoning.steps.length) {
    throw new Error("TaxAnswer reasoning step IDs must be unique");
  }
  const nextActions = new Map(answer.escalation.nextActions.map((action) => [action.id, action]));
  if (nextActions.size !== answer.escalation.nextActions.length) {
    throw new Error("TaxAnswer next-action IDs must be unique");
  }

  for (const claim of answer.evidence.claims) {
    if (claim.sourceIds.length === 0 && claim.kind !== "calculation") {
      throw new Error(`Evidence claim ${claim.id} has no source`);
    }
    for (const sourceId of claim.sourceIds) {
      const source = sources.get(sourceId);
      if (!source) throw new Error(`Evidence claim ${claim.id} references missing source ${sourceId}`);
      if (claim.kind === "law" && source.legalForce !== "binding-law" && source.legalForce !== "binding-in-stated-part") {
        throw new Error(`Evidence claim ${claim.id} labels a non-binding source as law`);
      }
    }
  }

  for (const step of answer.reasoning.steps) {
    for (const factPath of step.factPaths) {
      if (!providedFacts.has(factPath) && !derivedFacts.has(factPath) && !unknownFacts.has(factPath)) {
        throw new Error(`Reasoning step ${step.id} references missing fact ${factPath}`);
      }
    }
    for (const claimId of step.claimIds) {
      if (!claims.has(claimId)) throw new Error(`Reasoning step ${step.id} references missing claim ${claimId}`);
    }
  }
  if (answer.status === "determined" && answer.reasoning.steps.length === 0) {
    throw new Error("A determined TaxAnswer must show its reasoning");
  }

  const graphNodes = new Map(
    answer.reasoning.whyGraph.nodes.map((node) => [node.id, node]),
  );
  const nativeAnswer = typeof answer.answer === "object" && answer.answer !== null
    ? answer.answer as Record<string, unknown>
    : null;
  const nativeObligations = Array.isArray(nativeAnswer?.obligations)
    ? nativeAnswer.obligations.filter(
      (value): value is Record<string, unknown> => typeof value === "object" && value !== null,
    )
    : [];
  const nativeObligationIds = nativeObligations
    .map((obligation) => obligation.id)
    .filter((id): id is string => typeof id === "string");
  if (new Set(nativeObligationIds).size !== nativeObligationIds.length) {
    throw new Error("TaxAnswer native obligation IDs must be unique");
  }
  const nativeReasonCodes = Array.isArray(nativeAnswer?.reasonCodes)
    ? nativeAnswer.reasonCodes.filter((value): value is string => typeof value === "string")
    : [];
  if (new Set(nativeReasonCodes).size !== nativeReasonCodes.length) {
    throw new Error("TaxAnswer native reason codes must be unique");
  }
  for (const node of answer.reasoning.whyGraph.nodes) {
    const record = node.record;
    if (record?.kind !== "response-record") continue;
    if (record.collection === "answer") {
      if (node.id !== answer.reasoning.whyGraph.rootNodeId || node.kind !== "conclusion"
        || record.key !== "json-pointer" || record.value !== "/answer/decision"
        || typeof nativeAnswer?.decision !== "string") {
        throw new Error(`WhyGraph conclusion ${node.id} has an invalid answer selector`);
      }
      continue;
    }
    if (["facts.provided", "facts.derived", "facts.unknown"].includes(record.collection)) {
      const expectedKind = record.collection === "facts.unknown" ? "gap" : "fact";
      const expectedFacts = record.collection === "facts.provided"
        ? providedFacts
        : record.collection === "facts.derived" ? derivedFacts : unknownFacts;
      if (record.key !== "path" || node.kind !== expectedKind || !expectedFacts.has(record.value)) {
        throw new Error(`WhyGraph ${expectedKind} node ${node.id} references missing fact ${record.value}`);
      }
      continue;
    }
    if (record.collection === "reasoning.steps") {
      if (record.key !== "id" || node.kind !== "reasoning-step"
        || !reasoningSteps.has(record.value)) {
        throw new Error(`WhyGraph reasoning node ${node.id} references missing step ${record.value}`);
      }
      continue;
    }
    if (record.collection === "evidence.claims") {
      if (record.key !== "id" || node.kind !== "claim" || !claims.has(record.value)) {
        throw new Error(`WhyGraph claim node ${node.id} references missing claim ${record.value}`);
      }
      continue;
    }
    if (record.collection === "evidence.sources") {
      if (record.key !== "id" || node.kind !== "source" || !sources.has(record.value)) {
        throw new Error(`WhyGraph source node ${node.id} references missing authoritative evidence source ${record.value}`);
      }
      continue;
    }
    if (record.collection === "escalation.nextActions") {
      if (record.key !== "id" || node.kind !== "route"
        || !nextActions.has(record.value)) {
        throw new Error(`WhyGraph route node ${node.id} references missing next action ${record.value}`);
      }
      continue;
    }
    if (record.collection === "answer.obligations") {
      if (record.key !== "id" || node.kind !== "consequence"
        || !nativeObligations.some((obligation) => obligation.id === record.value)) {
        throw new Error(`WhyGraph consequence ${node.id} references missing obligation ${record.value}`);
      }
      continue;
    }
    if (record.collection === "answer.penaltyPosition") {
      if (record.key !== "json-pointer" || record.value !== "/answer/penaltyPosition"
        || node.kind !== "consequence" || nativeAnswer?.penaltyPosition === null
        || typeof nativeAnswer?.penaltyPosition !== "object") {
        throw new Error(`WhyGraph consequence ${node.id} has an invalid penalty selector`);
      }
      continue;
    }
    if (record.collection === "answer.reasonCodes") {
      if (record.key !== "value" || node.kind !== "gap" || !nativeReasonCodes.includes(record.value)) {
        throw new Error(`WhyGraph gap ${node.id} references missing reason code ${record.value}`);
      }
      continue;
    }
    throw new Error(`WhyGraph node ${node.id} uses unsupported response collection ${record.collection}`);
  }
  const graphRoot = graphNodes.get(answer.reasoning.whyGraph.rootNodeId);
  if (
    graphRoot?.record?.kind !== "response-record"
    || graphRoot.record.collection !== "answer"
    || graphRoot.record.key !== "json-pointer"
    || graphRoot.record.value !== "/answer/decision"
  ) {
    throw new Error("TaxAnswer why-graph root must select /answer/decision");
  }

  const legalAuthorityEdges = answer.reasoning.whyGraph.edges.filter(
    (edge) => edge.relation === "legal-authority-from",
  );
  for (const edge of legalAuthorityEdges) {
    const sourceRecord = graphNodes.get(edge.to)?.record;
    if (sourceRecord?.kind !== "response-record" || sourceRecord.collection !== "evidence.sources") {
      throw new Error(`WhyGraph authority edge ${edge.id} does not resolve to a TaxAnswer source`);
    }
    const source = sources.get(sourceRecord.value);
    if (!source || !["binding-law", "binding-in-stated-part", "precedent"].includes(source.legalForce)) {
      throw new Error(`WhyGraph authority edge ${edge.id} points to non-binding material`);
    }
  }

  const appliedRuleNodeIds = new Set(
    answer.reasoning.whyGraph.edges
      .filter((edge) => edge.relation === "applies-rule")
      .map((edge) => edge.to),
  );
  const appliedRuleIds = [...appliedRuleNodeIds].map((nodeId) => {
    const node = graphNodes.get(nodeId);
    if (node?.kind !== "rule" || node.state !== "decisive"
      || node.record?.kind !== "dataset-record") {
      throw new Error(`WhyGraph applied rule ${nodeId} has no exact decisive rule record`);
    }
    const authorityEdges = legalAuthorityEdges.filter((edge) => edge.from === nodeId);
    if (authorityEdges.length === 0) {
      throw new Error(`WhyGraph applied rule ${nodeId} has no binding authority edge`);
    }
    return node.record.recordId;
  }).sort();
  if (
    new Set(answer.applicability.ruleIds).size !== answer.applicability.ruleIds.length
    || answer.applicability.ruleIds.some((id, index) => id !== [...answer.applicability.ruleIds].sort()[index])
    || JSON.stringify(answer.applicability.ruleIds) !== JSON.stringify(appliedRuleIds)
  ) {
    throw new Error("TaxAnswer applicability.ruleIds must equal the sorted applied why-graph rules");
  }

  for (const node of answer.reasoning.whyGraph.nodes) {
    if (node.kind !== "consequence" || node.state === "not-applicable") continue;
    if (!answer.reasoning.whyGraph.edges.some((edge) => (
      edge.from === node.id && edge.relation === "grounded-in"
    ))) {
      throw new Error(`WhyGraph consequence ${node.id} needs claim or rule grounding`);
    }
  }

  const materialUnknowns = answer.facts.unknown.filter((fact) => fact.material);
  const materialAssumptions = answer.facts.assumptions.filter(
    (assumption) => assumption.material && !assumption.acceptedByCaller,
  );
  if (answer.status === "determined" && (materialUnknowns.length > 0 || materialAssumptions.length > 0)) {
    throw new Error("A determined TaxAnswer cannot contain unresolved material facts or assumptions");
  }
  if (answer.status === "determined" && answer.answer === null) {
    throw new Error("A determined TaxAnswer must contain an answer");
  }
  if (answer.status === "determined") {
    if (!answer.applicability.covered) {
      throw new Error("A determined TaxAnswer must be inside the capability's declared coverage");
    }
    if (answer.applicability.ruleIds.length === 0) {
      throw new Error("A determined TaxAnswer must identify the rules it applied");
    }
    if (answer.reasoning.steps.length === 0) {
      throw new Error("A determined TaxAnswer must show its reasoning");
    }
    const authoritativeClaims = answer.evidence.claims.filter(
      (claim) => (claim.kind === "law" || claim.kind === "hmrc-position") && claim.sourceIds.length > 0,
    );
    if (authoritativeClaims.length === 0) {
      throw new Error("A determined TaxAnswer needs authoritative evidence for its legal classification");
    }
    const usedSourceIds = new Set(answer.evidence.claims.flatMap((claim) => claim.sourceIds));
    for (const sourceId of usedSourceIds) {
      const source = sources.get(sourceId)!;
      if (["proposed", "enacted-not-commenced", "superseded", "historical"].includes(source.status)) {
        throw new Error(`Determined TaxAnswer uses non-current source ${sourceId}`);
      }
      if (source.reviewDueOn < answer.applicability.evaluatedOn) {
        throw new Error(`Determined TaxAnswer uses overdue source ${sourceId}`);
      }
      if (source.effectiveFrom && source.effectiveFrom > answer.applicability.effectiveDate) {
        throw new Error(`Determined TaxAnswer uses source ${sourceId} before it takes effect`);
      }
      if (source.effectiveTo && source.effectiveTo < answer.applicability.effectiveDate) {
        throw new Error(`Determined TaxAnswer uses source ${sourceId} after it ceased to apply`);
      }
    }
  }
  if (answer.confidence.level === "high" && answer.status !== "determined") {
    throw new Error("High confidence is reserved for determined answers");
  }
  if (answer.status === "needs_facts" && answer.escalation.factsNeeded.length === 0) {
    throw new Error("A needs_facts answer must name the smallest facts needed next");
  }
  if (answer.escalation.required && answer.escalation.nextActions.length === 0) {
    throw new Error("Required escalation must provide a useful next action");
  }
}
