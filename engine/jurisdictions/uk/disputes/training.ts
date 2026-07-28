import type {
  TaxDisputeDimensionId,
  TaxDisputeDimensionState,
  TaxDisputeTrainingExample,
  TaxDisputeTrainingTaskFamily,
  UkTaxDisputeInterpretation,
} from "./contract";

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareAscii);
}

function sourceIdsForInterpretation(
  interpretation: UkTaxDisputeInterpretation,
): string[] {
  return uniqueSorted([
    ...interpretation.dimensions.flatMap((dimension) => dimension.sourceIds),
    ...interpretation.majorChallenges.flatMap(
      (challenge) => challenge.sourceIds,
    ),
    ...interpretation.reasoning.steps.flatMap((step) => step.sourceIds),
  ]);
}

function pointersForInterpretation(
  interpretation: UkTaxDisputeInterpretation,
): string[] {
  return uniqueSorted([
    ...interpretation.dimensions.flatMap(
      (dimension) => dimension.casePointers,
    ),
    ...interpretation.majorChallenges.flatMap(
      (challenge) => challenge.casePointers,
    ),
    ...interpretation.reasoning.steps.flatMap(
      (step) => step.casePointers,
    ),
  ]);
}

function commonExample(
  interpretation: UkTaxDisputeInterpretation,
  taskFamily: TaxDisputeTrainingTaskFamily,
  instruction: string,
  provenance: TaxDisputeTrainingExample["provenance"],
) {
  const packetDigest = interpretation.packet.digest;
  if (!packetDigest) {
    throw new Error(
      "Tax-dispute training examples require an exact source-packet digest",
    );
  }
  const packetHref =
    `/v1/case-commons/uk/cases/${interpretation.case.id}`;
  return {
    schema: "taxsorted.uk.tax-dispute-training-example/1" as const,
    id:
      `${interpretation.case.id}:${interpretation.frameworkVersion}:${taskFamily}`,
    taskFamily,
    split: "evaluation" as const,
    derived: {
      frameworkVersion: interpretation.frameworkVersion,
      adapter: interpretation.review.adapter,
      taxSortedDerivedLabels: true as const,
      qualifiedLegalReviewAsserted: false as const,
    },
    case: {
      id: interpretation.case.id,
      slug: interpretation.case.slug,
      citation: interpretation.case.citation,
      packetDigest,
      packetHref,
    },
    instruction,
    packetInput: {
      packet: {
        href: packetHref,
        digest: packetDigest,
      },
    },
    provenance: {
      sourceIds: uniqueSorted(provenance.sourceIds),
      casePointers: uniqueSorted(provenance.casePointers),
    },
    safety: {
      sourcePacketApproved: true as const,
      taxSortedDerivedLabels: true as const,
      qualifiedLegalReviewAsserted: false as const,
      containsPrivateMatterFacts: false as const,
      hiddenChainOfThought: false as const,
      outcomePrediction: false as const,
    },
  };
}

export function buildTaxDisputeTrainingExamples(
  interpretation: UkTaxDisputeInterpretation,
): TaxDisputeTrainingExample[] {
  const allSourceIds = sourceIdsForInterpretation(interpretation);
  const allPointers = pointersForInterpretation(interpretation);
  const reasonSourceIds = uniqueSorted(
    interpretation.reasoning.steps.flatMap((step) => step.sourceIds),
  );
  const reasonPointers = uniqueSorted(
    interpretation.reasoning.steps.flatMap((step) => step.casePointers),
  );
  const outcomeSourceIds = uniqueSorted(
    Object.values(interpretation.outcomes).flatMap(
      (outcome) => outcome.sourceIds,
    ),
  );
  const outcomePointers = uniqueSorted(
    Object.values(interpretation.outcomes).flatMap(
      (outcome) => outcome.casePointers,
    ),
  );
  const challengeSourceIds = uniqueSorted(
    interpretation.majorChallenges.flatMap(
      (challenge) => challenge.sourceIds,
    ),
  );
  const challengePointers = uniqueSorted(
    interpretation.majorChallenges.flatMap(
      (challenge) => challenge.casePointers,
    ),
  );

  const commonProvenance = {
    sourceIds: allSourceIds,
    casePointers: allPointers,
  };
  const mapDimensions = commonExample(
    interpretation,
    "map-dimensions",
    "Map the approved public case packet across all twelve framework dimensions. Preserve partial and not-mapped states; do not fill gaps from intuition.",
    commonProvenance,
  );
  const identifyReasons = commonExample(
    interpretation,
    "identify-decisive-reasons",
    "Identify concise public reasons that were outcome-determinative within an issue or formed an independently sufficient branch. Keep supporting reasons, incomplete steps and boundaries distinct. Do not provide hidden chain-of-thought.",
    {
      sourceIds: reasonSourceIds,
      casePointers: reasonPointers,
    },
  );
  const separateOutcomes = commonExample(
    interpretation,
    "separate-outcomes",
    "Separate the procedural disposition, later underlying-merits result and money meaning. Do not turn an affected demand into an award or recovery.",
    {
      sourceIds: outcomeSourceIds,
      casePointers: outcomePointers,
    },
  );
  const identifyChallenges = commonExample(
    interpretation,
    "identify-major-challenges",
    "Identify the difficulties that materially change how the case should be read. Name their impact, evidence needs, blockers and decided resolution without scoring future success.",
    {
      sourceIds: challengeSourceIds,
      casePointers: challengePointers,
    },
  );
  const dimensionStates = Object.fromEntries(
    interpretation.dimensions.map((dimension) => [
      dimension.id,
      dimension.state,
    ]),
  ) as Record<TaxDisputeDimensionId, TaxDisputeDimensionState>;
  const {
    packetInput: mapPacketInput,
    ...mapDimensionsCommon
  } = mapDimensions;
  const {
    packetInput: reasonPacketInput,
    ...identifyReasonsCommon
  } = identifyReasons;
  const {
    packetInput: outcomePacketInput,
    ...separateOutcomesCommon
  } = separateOutcomes;
  const {
    packetInput: challengePacketInput,
    ...identifyChallengesCommon
  } = identifyChallenges;

  return [
    {
      ...mapDimensionsCommon,
      taskFamily: "map-dimensions",
      input: {
        ...mapPacketInput,
        caseId: interpretation.case.id,
        frameworkVersion: interpretation.frameworkVersion,
      },
      expectedOutput: {
        dimensions: interpretation.dimensions.map((dimension) => ({
          id: dimension.id,
          state: dimension.state,
          reading: dimension.reading,
          gaps: dimension.gaps,
        })),
      },
    } satisfies TaxDisputeTrainingExample,
    {
      ...identifyReasonsCommon,
      taskFamily: "identify-decisive-reasons",
      input: {
        ...reasonPacketInput,
        caseId: interpretation.case.id,
        holding: interpretation.reasoning.holding,
      },
      expectedOutput: {
        holding: interpretation.reasoning.holding,
        decisiveReasonIds: interpretation.reasoning.decisiveReasonIds,
        steps: interpretation.reasoning.steps.map((step) => ({
          id: step.id,
          decisiveness: step.decisiveness,
          issueBranch: step.issueBranch,
          proposition: step.proposition,
          gaps: step.gaps,
        })),
      },
    } satisfies TaxDisputeTrainingExample,
    {
      ...separateOutcomesCommon,
      taskFamily: "separate-outcomes",
      input: {
        ...outcomePacketInput,
        caseId: interpretation.case.id,
        holding: interpretation.reasoning.holding,
      },
      expectedOutput: {
        outcomes: interpretation.outcomes,
      },
    } satisfies TaxDisputeTrainingExample,
    {
      ...identifyChallengesCommon,
      taskFamily: "identify-major-challenges",
      input: {
        ...challengePacketInput,
        caseId: interpretation.case.id,
        dimensionStates,
      },
      expectedOutput: {
        majorChallenges: interpretation.majorChallenges,
      },
    } satisfies TaxDisputeTrainingExample,
  ];
}
