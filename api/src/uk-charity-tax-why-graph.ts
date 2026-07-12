// Domain adapter from one reviewed charity tax-treatment record to the shared
// why graph. The native corpus remains canonical; this file admits only exact
// record identities and field-level evidence links already present there.

import {
  assertAdmittedWhyGraph,
  canonicalAdmissionJson,
  canonicaliseWhyGraph,
  type WhyGraph,
  type WhyGraphAdopter,
  type WhyGraphEdge,
  type WhyGraphNode,
  whyGraphEdge,
} from "@taxsorted/engine/why-graph";
import type { UkCharities } from "./uk-charities.js";

export const UK_CHARITY_TAX_WHY_GRAPH_ADOPTER_ID =
  "uk.charities.tax-treatment" as const;
export const UK_CHARITY_TAX_WHY_GRAPH_TEMPLATE =
  "/v1/charities/uk/tax-treatments/{id}/why-graph" as const;
export const UK_CHARITY_TAX_WHY_GRAPH_RELEASED_ON = "2026-07-12" as const;

type TaxTreatment = UkCharities["taxTreatments"][number];
type Source = UkCharities["sources"][number];
type TransparencyGap = UkCharities["transparencyGaps"][number];

type ClaimCluster = {
  id: string;
  label: string;
  description: string;
  pointers: readonly string[];
  reasoningStep: "classification" | "conditions" | "effects" | "source-reading";
};

const claimClusters: readonly ClaimCluster[] = [
  {
    id: "tax-type",
    label: "Tax type",
    description:
      "Read taxType on the canonical treatment record. It classifies the sector statement; it does not determine a case.",
    pointers: ["/taxType"],
    reasoningStep: "classification",
  },
  {
    id: "position",
    label: "Treatment position",
    description:
      "Read position on the canonical treatment record. It keeps conditional relief, taxable boundaries and TaxSorted analysis distinct.",
    pointers: ["/position"],
    reasoningStep: "classification",
  },
  {
    id: "eligibility",
    label: "Eligibility boundary",
    description:
      "Read eligibility on the canonical treatment record. It is a general boundary, not proof that an organisation qualifies.",
    pointers: ["/eligibility"],
    reasoningStep: "conditions",
  },
  {
    id: "conditions",
    label: "Conditions that keep the treatment conditional",
    description:
      "Read conditions on the canonical treatment record. Array positions are not identifiers and are not copied into this graph.",
    pointers: ["/conditions"],
    reasoningStep: "conditions",
  },
  {
    id: "benefit",
    label: "Potential tax benefit",
    description:
      "Read benefit on the canonical treatment record. The graph does not turn the described benefit into an entitlement.",
    pointers: ["/benefit"],
    reasoningStep: "effects",
  },
  {
    id: "tax-or-clawback",
    label: "When tax, recovery or clawback can arise",
    description:
      "Read whenTaxOrClawbackCanArise on the canonical record. No case amount, notice or enforcement event is asserted.",
    pointers: ["/whenTaxOrClawbackCanArise"],
    reasoningStep: "effects",
  },
  {
    id: "reasoning-status",
    label: "Declared reasoning voice",
    description:
      "Read reasoningStatus on the canonical treatment record so an official summary never becomes TaxSorted analysis, or vice versa.",
    pointers: ["/reasoningStatus"],
    reasoningStep: "source-reading",
  },
  {
    id: "reasoning",
    label: "Declared reasoning",
    description:
      "Read reasoning on the canonical treatment record while preserving the separate reasoningStatus voice label.",
    pointers: ["/reasoning"],
    reasoningStep: "source-reading",
  },
  {
    id: "not-equivalent-to",
    label: "What the treatment does not establish",
    description:
      "Read notEquivalentTo on the canonical treatment record before carrying the statement into another system.",
    pointers: ["/notEquivalentTo"],
    reasoningStep: "source-reading",
  },
] as const;

export const UK_CHARITY_TAX_WHY_GRAPH_CLAIM_SELECTORS = claimClusters.map(
  (cluster) => ({
    nodeId: `claim:${cluster.id}`,
    jsonPointer: cluster.pointers[0],
  }),
);

const reasoningLabels: Record<ClaimCluster["reasoningStep"], string> = {
  classification: "Classify the treatment without applying it to a case",
  conditions: "Keep eligibility and conditions attached",
  effects: "Separate the possible benefit from the reverse tax path",
  "source-reading": "Preserve source voice and stated limits",
};

const fixedGapIds = [
  "gap:binding-provision-not-mapped",
  "gap:case-applicability-not-assessed",
  "gap:case-enforcement-and-challenge-not-mapped",
] as const;

const admittedNonLawAuthorityLevels = new Set([
  "government-guidance",
  "statutory-regulator",
  "tax-authority-guidance",
]);

function ascii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function treatmentHref(id: string): string {
  return `/v1/charities/uk/tax-treatments/${id}`;
}

function whyGraphHref(id: string): string {
  return `${treatmentHref(id)}/why-graph`;
}

function treatmentJurisdiction(treatment: TaxTreatment): string {
  if (treatment.jurisdictions.length === 1) return treatment.jurisdictions[0];
  if (
    treatment.id === "tax-sdlt-charity-relief"
    && JSON.stringify(treatment.jurisdictions) === JSON.stringify([
      "England",
      "Northern Ireland",
    ])
  ) {
    return "England and Northern Ireland";
  }
  throw new Error(
    `Charity tax treatment ${treatment.id} needs an admitted jurisdiction label before graph publication`,
  );
}

function treatmentRecord(treatment: TaxTreatment) {
  return {
    kind: "dataset-record" as const,
    dataset: "uk-charities-sector",
    collection: "taxTreatments",
    recordId: treatment.id,
    href: treatmentHref(treatment.id),
  };
}

function sourceRecord(source: Source) {
  return {
    kind: "dataset-record" as const,
    dataset: "uk-charities-sector",
    collection: "sources",
    recordId: source.id,
    href: `/v1/charities/uk/sources/${source.id}`,
  };
}

function gapRecord(gap: TransparencyGap) {
  return {
    kind: "dataset-record" as const,
    dataset: "uk-charities-sector",
    collection: "transparencyGaps",
    recordId: gap.id,
    href: `/v1/charities/uk/gaps/${gap.id}`,
  };
}

function evidenceSourceIds(
  treatment: TaxTreatment,
  cluster: ClaimCluster,
): string[] {
  return treatment.evidence
    .filter((evidence) => (
      cluster.pointers.every((pointer) => evidence.fields.includes(pointer))
    ))
    .map((evidence) => evidence.sourceId)
    .filter((sourceId, index, values) => values.indexOf(sourceId) === index)
    .sort(ascii);
}

function evidencedPointers(
  treatment: TaxTreatment,
  cluster: ClaimCluster,
  sourceId: string,
): string[] {
  const fields = new Set(
    treatment.evidence
      .filter((evidence) => evidence.sourceId === sourceId)
      .flatMap((evidence) => evidence.fields),
  );
  return cluster.pointers.filter((pointer) => fields.has(pointer)).sort(ascii);
}

function relevantTransparencyGaps(
  corpus: UkCharities,
  treatment: TaxTreatment,
): TransparencyGap[] {
  return corpus.transparencyGaps
    .filter((gap) => gap.affectedIds.includes(treatment.id))
    .sort((left, right) => ascii(left.id, right.id));
}

function exactSet(actual: string[], expected: string[], label: string): void {
  if (new Set(actual).size !== actual.length || new Set(expected).size !== expected.length) {
    throw new Error(`${label} must be unique`);
  }
  const left = [...new Set(actual)].sort(ascii);
  const right = [...new Set(expected)].sort(ascii);
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} does not match the charity tax-treatment admission map`);
  }
}

export type UkCharityTaxWhyGraphNative = {
  corpus: UkCharities;
  treatmentId: string;
};

export const ukCharityTaxWhyGraphAdopter:
  WhyGraphAdopter<UkCharityTaxWhyGraphNative> = {
    id: UK_CHARITY_TAX_WHY_GRAPH_ADOPTER_ID,
    graphSchema: "taxsorted.why-graph/1",
    assertDomainInvariants(graph, native) {
      const { corpus, treatmentId } = native;
      const treatment = corpus.taxTreatments.find(
        (candidate) => candidate.id === treatmentId,
      );
      if (!treatment) {
        throw new Error("Charity tax why graph subject is not a canonical corpus treatment");
      }
      const authority = treatment.reasoningStatus === "official-summary"
        ? "source-reported-claim"
        : "taxsorted-analysis";
      if (
        graph.context.subject.id !== `uk-charities-sector.taxTreatments.${treatment.id}`
        || graph.context.subject.type !== "dataset-record"
        || graph.context.subject.version !== corpus.meta.version
        || graph.context.jurisdiction !== treatmentJurisdiction(treatment)
        || graph.context.effectiveDate !== null
        || graph.context.evaluatedOn !== corpus.meta.reviewedOn
        || graph.context.knowledgeAsOf !== corpus.meta.reviewedOn
        || graph.context.authority !== authority
        || graph.context.effect !== "advisory"
        || graph.context.externalStateChange
      ) {
        throw new Error("Charity tax why graph context is outside the admitted record envelope");
      }

      const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
      const root = nodes.get(graph.rootNodeId);
      if (
        graph.rootNodeId !== `conclusion:tax-treatment:${treatment.id}`
        || root?.record?.kind !== "dataset-record"
        || canonicalAdmissionJson(root.record)
          !== canonicalAdmissionJson(treatmentRecord(treatment))
      ) {
        throw new Error("Charity tax why graph root does not select the exact treatment record");
      }

      if (graph.nodes.some((node) => (
        node.kind === "rule"
        || node.kind === "institution"
        || node.kind === "party-role"
        || node.kind === "process"
        || node.kind === "fact"
        || node.record?.kind === "response-record"
      ))) {
        throw new Error("Charity tax v1 cannot invent rules, roles, processes, facts or response selectors");
      }
      if (graph.edges.some((edge) => [
        "applies-rule",
        "considers-rule",
        "legal-authority-from",
        "published-by",
        "administered-by",
        "responsibility-held-by",
        "performed-by",
        "decision-made-by",
        "enforced-through",
        "handled-by",
      ].includes(edge.relation))) {
        throw new Error("Charity tax v1 contains a relation not admitted by the native treatment record");
      }

      const sourceIds = new Set(treatment.sourceIds);
      const relevantGapIds = new Set(
        relevantTransparencyGaps(corpus, treatment).map((gap) => gap.id),
      );
      for (const node of graph.nodes) {
        const record = node.record;
        if (record?.kind !== "dataset-record") continue;
        if (record.dataset !== "uk-charities-sector") {
          throw new Error(`Charity tax node ${node.id} leaves the admitted dataset`);
        }
        if (record.collection === "taxTreatments") {
          if (canonicalAdmissionJson(record)
            !== canonicalAdmissionJson(treatmentRecord(treatment))) {
            throw new Error(`Charity tax node ${node.id} selects a different treatment`);
          }
          continue;
        }
        if (record.collection === "sources") {
          const source = corpus.sources.find((candidate) => candidate.id === record.recordId);
          const expectedMethod = treatment.reasoningStatus === "official-summary"
            ? "manual-review"
            : "editorial-analysis";
          if (
            !source
            || !sourceIds.has(source.id)
            || canonicalAdmissionJson(record)
              !== canonicalAdmissionJson(sourceRecord(source))
            || node.id !== `source:${source.id}`
            || source.status !== "current"
            || !admittedNonLawAuthorityLevels.has(source.authorityLevel)
            || source.reuseStatus !== "confirmed"
            || source.publicationMode !== "normalised-summary"
            || source.reviewAfter < graph.context.knowledgeAsOf
            || source.reviewAfter < UK_CHARITY_TAX_WHY_GRAPH_RELEASED_ON
            || treatment.evidence
              .filter((entry) => entry.sourceId === source.id)
              .some((entry) => entry.method !== expectedMethod)
          ) {
            throw new Error(`Charity tax node ${node.id} selects an unadmitted source`);
          }
          continue;
        }
        if (record.collection === "transparencyGaps") {
          const gap = corpus.transparencyGaps.find(
            (candidate) => candidate.id === record.recordId,
          );
          if (
            !gap
            || !relevantGapIds.has(gap.id)
            || canonicalAdmissionJson(record)
              !== canonicalAdmissionJson(gapRecord(gap))
            || node.id !== `gap:dataset:${gap.id}`
          ) {
            throw new Error(`Charity tax node ${node.id} selects an unrelated gap`);
          }
          continue;
        }
        throw new Error(`Charity tax node ${node.id} uses unsupported collection ${record.collection}`);
      }

      const claimNodeIds = graph.nodes
        .filter((node) => node.kind === "claim")
        .map((node) => node.id);
      exactSet(
        claimNodeIds,
        claimClusters.map((cluster) => `claim:${cluster.id}`),
        "Charity tax claim nodes",
      );
      exactSet(
        graph.nodes
          .filter((node) => node.kind === "reasoning-step")
          .map((node) => node.id),
        [
          "reasoning:classification",
          "reasoning:conditions",
          "reasoning:effects",
          "reasoning:source-reading",
        ],
        "Charity tax reasoning nodes",
      );
      exactSet(
        graph.nodes
          .filter((node) => node.kind === "consequence")
          .map((node) => node.id),
        [
          "consequence:treatment-effect",
          "consequence:tax-recovery-or-clawback",
        ],
        "Charity tax consequence nodes",
      );
      exactSet(
        graph.nodes
          .filter((node) => node.kind === "source")
          .map((node) => node.id),
        [...new Set(
          claimClusters.flatMap((cluster) => evidenceSourceIds(treatment, cluster)),
        )].sort(ascii).map((sourceId) => `source:${sourceId}`),
        "Charity tax source nodes",
      );
      exactSet(
        graph.nodes
          .filter((node) => node.kind === "route")
          .map((node) => node.id),
        ["route:taxsorted-public-correction"],
        "Charity tax route nodes",
      );
      const correctionRoute = nodes.get("route:taxsorted-public-correction");
      if (
        correctionRoute?.record?.kind !== "external-resource"
        || correctionRoute.record.href
          !== "https://github.com/cambridgetcg/taxsorted.io/issues"
      ) {
        throw new Error("Charity tax correction route leaves its admitted public channel");
      }
      for (const node of graph.nodes) {
        if (
          node.record?.kind === "external-resource"
          && node.id !== "route:taxsorted-public-correction"
        ) {
          throw new Error(`Charity tax node ${node.id} uses an unadmitted external resource`);
        }
      }
      for (const cluster of claimClusters) {
        const claimId = `claim:${cluster.id}`;
        const claim = nodes.get(claimId);
        if (
          claim?.record?.kind !== "dataset-record"
          || canonicalAdmissionJson(claim.record)
            !== canonicalAdmissionJson(treatmentRecord(treatment))
        ) {
          throw new Error(`Charity tax claim ${claimId} loses its native record selector`);
        }
        const supportedSourceIds = graph.edges
          .filter((edge) => edge.from === claimId && edge.relation === "supported-by")
          .map((edge) => {
            const record = nodes.get(edge.to)?.record;
            if (record?.kind !== "dataset-record" || record.collection !== "sources") {
              throw new Error(`Charity tax claim ${claimId} points outside the source ledger`);
            }
            return record.recordId;
          });
        exactSet(
          supportedSourceIds,
          evidenceSourceIds(treatment, cluster),
          `Charity tax claim ${claimId} evidence`,
        );
      }

      const benefitGroundings = graph.edges
        .filter((edge) => (
          edge.from === "consequence:treatment-effect"
          && edge.relation === "grounded-in"
        ))
        .map((edge) => edge.to);
      exactSet(benefitGroundings, ["claim:benefit"], "Charity tax benefit grounding");
      const reverseGroundings = graph.edges
        .filter((edge) => (
          edge.from === "consequence:tax-recovery-or-clawback"
          && edge.relation === "grounded-in"
        ))
        .map((edge) => edge.to);
      exactSet(
        reverseGroundings,
        ["claim:tax-or-clawback"],
        "Charity tax reverse-path grounding",
      );

      exactSet(
        graph.coverage.gapNodeIds,
        [
          ...fixedGapIds,
          ...[...relevantGapIds].map((id) => `gap:dataset:${id}`),
        ],
        "Charity tax coverage gaps",
      );
      for (const gapId of fixedGapIds) {
        if (nodes.get(gapId)?.record !== null) {
          throw new Error(`Charity tax fixed gap ${gapId} must not invent a record`);
        }
      }

      const expectedEdgeIds = [
        ...[
          "classification",
          "conditions",
          "effects",
          "source-reading",
        ].map((step) => whyGraphEdge(
          graph.rootNodeId,
          "reasoned-by",
          `reasoning:${step}`,
          "expected",
        ).id),
        ...claimClusters.map((cluster) => whyGraphEdge(
          `reasoning:${cluster.reasoningStep}`,
          "uses-claim",
          `claim:${cluster.id}`,
          "expected",
        ).id),
        ...claimClusters.flatMap((cluster) => (
          evidenceSourceIds(treatment, cluster).map((sourceId) => whyGraphEdge(
            `claim:${cluster.id}`,
            "supported-by",
            `source:${sourceId}`,
            "expected",
          ).id)
        )),
        whyGraphEdge(
          graph.rootNodeId,
          "leads-to",
          "consequence:treatment-effect",
          "expected",
        ).id,
        whyGraphEdge(
          "consequence:treatment-effect",
          "grounded-in",
          "claim:benefit",
          "expected",
        ).id,
        whyGraphEdge(
          graph.rootNodeId,
          "leads-to",
          "consequence:tax-recovery-or-clawback",
          "expected",
        ).id,
        whyGraphEdge(
          "consequence:tax-recovery-or-clawback",
          "grounded-in",
          "claim:tax-or-clawback",
          "expected",
        ).id,
        ...fixedGapIds.map((gapId) => whyGraphEdge(
          graph.rootNodeId,
          "limited-by",
          gapId,
          "expected",
        ).id),
        ...[...relevantGapIds].map((gapId) => whyGraphEdge(
          graph.rootNodeId,
          "limited-by",
          `gap:dataset:${gapId}`,
          "expected",
        ).id),
        whyGraphEdge(
          graph.rootNodeId,
          "reviewable-through",
          "route:taxsorted-public-correction",
          "expected",
        ).id,
      ];
      exactSet(
        graph.edges.map((edge) => edge.id),
        expectedEdgeIds,
        "Charity tax edges",
      );
      const expectedGraph = buildUkCharityTaxWhyGraphUnchecked(corpus, treatmentId);
      if (canonicalAdmissionJson(graph) !== canonicalAdmissionJson(expectedGraph)) {
        throw new Error(
          "Charity tax why graph differs from its exact adopter-owned semantic projection",
        );
      }
    },
  };

function buildUkCharityTaxWhyGraphUnchecked(
  corpus: UkCharities,
  treatmentId: string,
): WhyGraph {
  const treatment = corpus.taxTreatments.find(
    (candidate) => candidate.id === treatmentId,
  );
  if (!treatment) {
    throw new Error(`Unknown canonical charity tax treatment: ${treatmentId}`);
  }
  const jurisdiction = treatmentJurisdiction(treatment);
  const sources = new Map(corpus.sources.map((source) => [source.id, source]));
  const nodes = new Map<string, WhyGraphNode>();
  const edges = new Map<string, WhyGraphEdge>();
  const addNode = (node: WhyGraphNode): void => {
    if (nodes.has(node.id)) throw new Error(`Duplicate charity tax why-graph node ${node.id}`);
    nodes.set(node.id, node);
  };
  const addEdge = (
    from: string,
    relation: Parameters<typeof whyGraphEdge>[1],
    to: string,
    explanation: string,
  ): void => {
    const edge = whyGraphEdge(from, relation, to, explanation);
    edges.set(edge.id, edge);
  };

  const rootNodeId = `conclusion:tax-treatment:${treatment.id}`;
  addNode({
    id: rootNodeId,
    kind: "conclusion",
    label: treatment.name,
    description:
      "A trace of one reviewed sector tax-treatment record. It explains the record and its evidence; it does not decide eligibility or tax for an organisation.",
    state: "supporting",
    record: treatmentRecord(treatment),
  });

  for (const reasoningStep of [
    "classification",
    "conditions",
    "effects",
    "source-reading",
  ] as const) {
    const nodeId = `reasoning:${reasoningStep}`;
    addNode({
      id: nodeId,
      kind: "reasoning-step",
      label: reasoningLabels[reasoningStep],
      description:
        "This step groups stable fields on the canonical treatment record; it does not copy an array position or create a new legal conclusion.",
      state: "supporting",
      record: treatmentRecord(treatment),
    });
    addEdge(
      rootNodeId,
      "reasoned-by",
      nodeId,
      "This field group is part of the published explanation trace.",
    );
  }

  const usedSourceIds = new Set<string>();
  for (const cluster of claimClusters) {
    const nodeId = `claim:${cluster.id}`;
    addNode({
      id: nodeId,
      kind: "claim",
      label: cluster.label,
      description: cluster.description,
      state: "supporting",
      record: treatmentRecord(treatment),
    });
    addEdge(
      `reasoning:${cluster.reasoningStep}`,
      "uses-claim",
      nodeId,
      "The reasoning step reads these named fields on the canonical treatment record.",
    );
    const supportingSourceIds = evidenceSourceIds(treatment, cluster);
    if (supportingSourceIds.length === 0) {
      throw new Error(
        `Charity tax treatment ${treatment.id} has no field-level evidence for ${cluster.id}`,
      );
    }
    for (const sourceId of supportingSourceIds) usedSourceIds.add(sourceId);
  }

  for (const sourceId of [...usedSourceIds].sort(ascii)) {
    const source = sources.get(sourceId);
    if (!source) {
      throw new Error(`Charity tax treatment ${treatment.id} references missing source ${sourceId}`);
    }
    addNode({
      id: `source:${source.id}`,
      kind: "source",
      label: source.title,
      description:
        "Read the canonical source record for publisher, authority level, review dates, reuse status, supported statements and stated limits.",
      state: "supporting",
      record: sourceRecord(source),
    });
  }
  for (const cluster of claimClusters) {
    for (const sourceId of evidenceSourceIds(treatment, cluster)) {
      addEdge(
        `claim:${cluster.id}`,
        "supported-by",
        `source:${sourceId}`,
        `The treatment evidence entry names this source for ${evidencedPointers(treatment, cluster, sourceId).join(" and ")}.`,
      );
    }
  }

  addNode({
    id: "consequence:treatment-effect",
    kind: "consequence",
    label: "Treatment effect described by the benefit field",
    description:
      "The canonical benefit field may describe relief or state that no additional benefit exists. It is not a computed entitlement or amount.",
    state: "conditional",
    record: treatmentRecord(treatment),
  });
  addEdge(
    rootNodeId,
    "leads-to",
    "consequence:treatment-effect",
    "The treatment keeps its stated effect separate from eligibility and failure paths.",
  );
  addEdge(
    "consequence:treatment-effect",
    "grounded-in",
    "claim:benefit",
    "The canonical benefit field grounds this conditional consequence.",
  );

  addNode({
    id: "consequence:tax-recovery-or-clawback",
    kind: "consequence",
    label: "Tax, recovery or clawback may arise",
    description:
      "The canonical reverse-path field names general circumstances only; no case liability, amount, notice or enforcement event is asserted.",
    state: "conditional",
    record: treatmentRecord(treatment),
  });
  addEdge(
    rootNodeId,
    "leads-to",
    "consequence:tax-recovery-or-clawback",
    "The reverse path stays visible beside the possible relief.",
  );
  addEdge(
    "consequence:tax-recovery-or-clawback",
    "grounded-in",
    "claim:tax-or-clawback",
    "The canonical tax-or-clawback field grounds this conditional consequence.",
  );

  const fixedGaps: Array<Omit<WhyGraphNode, "id" | "kind" | "record"> & { id: string }> = [
    {
      id: "gap:binding-provision-not-mapped",
      label: "Exact binding provision not mapped",
      description:
        "The current treatment ledger cites guidance or an official summary, not an admitted exact primary-law provision record. No guidance source is promoted to binding law.",
      state: "not-mapped",
    },
    {
      id: "gap:case-applicability-not-assessed",
      label: "Case applicability not assessed",
      description:
        "No organisation, transaction, accounting period, tax facts, HMRC recognition state or amount is supplied or inferred by this sector-record graph.",
      state: "not-applicable",
    },
    {
      id: "gap:case-enforcement-and-challenge-not-mapped",
      label: "Case enforcement and official challenge route not mapped",
      description:
        "An exact notice, decision, date, competent authority and legal route are needed before mapping collection, review, appeal or enforcement for a case.",
      state: "not-mapped",
    },
  ];
  for (const gap of fixedGaps) {
    addNode({ ...gap, kind: "gap", record: null });
    addEdge(
      rootNodeId,
      "limited-by",
      gap.id,
      "This named boundary prevents the sector explanation from claiming case-level or legal completeness.",
    );
  }

  const datasetGaps = relevantTransparencyGaps(corpus, treatment);
  for (const gap of datasetGaps) {
    const nodeId = `gap:dataset:${gap.id}`;
    addNode({
      id: nodeId,
      kind: "gap",
      label: gap.title,
      description:
        "This canonical transparency-gap record names a limit that directly affects the treatment. Follow the record for its detail, consequence, status and evidence.",
      state: "not-mapped",
      record: gapRecord(gap),
    });
    addEdge(
      rootNodeId,
      "limited-by",
      nodeId,
      "The native corpus declares this gap as affecting the treatment record.",
    );
  }

  addNode({
    id: "route:taxsorted-public-correction",
    kind: "route",
    label: "Correct this TaxSorted explanation",
    description:
      "The public GitHub tracker needs an account and is only for non-personal factual corrections. Never post tax facts, identity data, confidential client material or safeguarding information.",
    state: "available",
    record: {
      kind: "external-resource",
      href: "https://github.com/cambridgetcg/taxsorted.io/issues",
    },
  });
  addEdge(
    rootNodeId,
    "reviewable-through",
    "route:taxsorted-public-correction",
    "This route can correct TaxSorted's derived explanation, not challenge an HMRC or court decision.",
  );

  const graph = canonicaliseWhyGraph({
    schema: "taxsorted.why-graph/1",
    rootNodeId,
    context: {
      subject: {
        id: `uk-charities-sector.taxTreatments.${treatment.id}`,
        type: "dataset-record",
        version: corpus.meta.version,
      },
      jurisdiction,
      effectiveDate: null,
      evaluatedOn: corpus.meta.reviewedOn,
      knowledgeAsOf: corpus.meta.reviewedOn,
      authority: treatment.reasoningStatus === "official-summary"
        ? "source-reported-claim"
        : "taxsorted-analysis",
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
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    coverage: {
      scope:
        "The reviewed statement, field-level evidence trace, possible benefit, reverse tax path and declared gaps for one UK charity-sector tax-treatment record; not case advice or a complete map of binding law, administration, collection, review or appeal.",
      completeWithinDeclaredScope: false,
      gapNodeIds: [
        ...fixedGapIds,
        ...datasetGaps.map((gap) => `gap:dataset:${gap.id}`),
      ].sort(ascii),
      boundaries: [
        "Array positions are never record identity; each graph reference uses the stable treatment, source or gap ID.",
        "Guidance and official summaries remain claims and sources; they are not labelled binding legal authority.",
        "No charity, trustee, donor, beneficiary, belief, contact, transaction, tax amount or case file is present.",
        "The SDLT treatment's context label is an admitted display union of its canonical England and Northern Ireland jurisdiction array; other future multi-territory labels fail closed.",
        "The graph is derived from the immutable reviewed corpus snapshot and does not alter its hash or canonical records.",
        "Record hrefs resolve the live dataset, not an immutable historical snapshot. Retain referenced records or compare context.subject.version before reusing a stored graph; no tombstone feed exists yet.",
        "The public correction route corrects TaxSorted analysis and is not an official tax review or appeal.",
      ],
    },
  });
  return graph;
}

export function buildUkCharityTaxWhyGraph(
  corpus: UkCharities,
  treatmentId: string,
): WhyGraph {
  const graph = buildUkCharityTaxWhyGraphUnchecked(corpus, treatmentId);
  assertAdmittedWhyGraph(
    graph,
    { corpus, treatmentId },
    ukCharityTaxWhyGraphAdopter,
  );
  return graph;
}

export function ukCharityTaxWhyGraphPath(id: string): string {
  return whyGraphHref(id);
}
