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
  reasoning: { steps: ReasoningStep[] };
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
