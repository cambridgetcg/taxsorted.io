import {
  TAX_IDENTITY_EFFECTIVE_DATE_BASES,
  TAX_IDENTITY_RELATION_FIELDS,
  TAX_IDENTITY_RELATION_OPERATORS,
  type TaxIdentityAssertion,
  type TaxIdentityDimension,
  type TaxIdentityExample,
  type TaxIdentityInterpretation,
  type TaxIdentityMatchedAssertion,
  type TaxIdentityOverlapRule,
  type TaxIdentityScope,
} from "./types.js";

type MatchStatus = TaxIdentityMatchedAssertion["status"];

const matchStatuses = new Set<TaxIdentityAssertion["status"]>([
  "established",
  "conditional",
  "disputed",
]);

const coverageStatuses = new Set<TaxIdentityAssertion["status"]>([
  ...matchStatuses,
  "not-applicable",
]);

const certaintyRank: Record<MatchStatus, number> = {
  established: 0,
  conditional: 1,
  disputed: 2,
};

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function scopeKey(scope: TaxIdentityScope): string {
  return [
    scope.subjectRef,
    scope.jurisdiction,
    scope.taxOrRegime,
    scope.activityOrContext,
    scope.ruleset,
  ].join("|");
}

function assertionKey(assertion: TaxIdentityAssertion): string {
  return `${assertion.dimensionId}:${assertion.classificationId}@${scopeKey(assertion.scope)}`;
}

function assertionIsActiveOn(
  assertion: TaxIdentityAssertion,
  asOf: string,
): boolean {
  if (assertion.effectiveDateBasis === "unknown") return false;
  if (assertion.effectiveFrom && assertion.effectiveFrom > asOf) return false;
  if (assertion.effectiveTo && assertion.effectiveTo < asOf) return false;
  return true;
}

function assertionCanMatch(
  assertion: TaxIdentityAssertion,
): assertion is TaxIdentityAssertion & { status: MatchStatus } {
  return matchStatuses.has(assertion.status);
}

function relationIsSatisfied(
  rule: TaxIdentityOverlapRule,
  selected: ReadonlyMap<string, TaxIdentityAssertion>,
): boolean {
  return rule.relations.every((relation) => {
    const left = selected.get(relation.leftRequirementId);
    const right = selected.get(relation.rightRequirementId);
    if (!left || !right) return true;

    const valuesAreEqual =
      left.scope[relation.field] === right.scope[relation.field];
    return relation.operator === "same" ? valuesAreEqual : !valuesAreEqual;
  });
}

function combinationStatus(
  assertions: readonly (TaxIdentityAssertion & { status: MatchStatus })[],
): MatchStatus {
  return assertions.reduce<MatchStatus>(
    (leastCertain, assertion) =>
      certaintyRank[assertion.status] > certaintyRank[leastCertain]
        ? assertion.status
        : leastCertain,
    "established",
  );
}

function combinationSortKey(
  assertions: readonly (TaxIdentityAssertion & { status: MatchStatus })[],
): string {
  const status = combinationStatus(assertions);
  const rankTotal = assertions.reduce(
    (total, assertion) => total + certaintyRank[assertion.status],
    0,
  );
  return [
    certaintyRank[status].toString(),
    rankTotal.toString().padStart(4, "0"),
    ...assertions.map(assertionKey),
  ].join("\u0000");
}

function matchingCombination(
  rule: TaxIdentityOverlapRule,
  activeAssertions: readonly (TaxIdentityAssertion & {
    status: MatchStatus;
  })[],
): Array<TaxIdentityAssertion & { status: MatchStatus }> | null {
  const candidateGroups = rule.requires.map((requirement) =>
    activeAssertions
      .filter(
        (assertion) =>
          assertion.dimensionId === requirement.dimensionId &&
          assertion.classificationId === requirement.classificationId,
      )
      .sort((left, right) => assertionKey(left).localeCompare(assertionKey(right))),
  );
  if (candidateGroups.some((candidates) => candidates.length === 0)) return null;

  const matches: Array<
    Array<TaxIdentityAssertion & { status: MatchStatus }>
  > = [];
  const selected = new Map<string, TaxIdentityAssertion>();
  const combination: Array<TaxIdentityAssertion & { status: MatchStatus }> = [];

  function visit(requirementIndex: number): void {
    if (requirementIndex === rule.requires.length) {
      matches.push([...combination]);
      return;
    }

    const requirement = rule.requires[requirementIndex];
    const candidates = candidateGroups[requirementIndex];
    if (!requirement || !candidates) return;

    for (const candidate of candidates) {
      selected.set(requirement.id, candidate);
      combination.push(candidate);
      if (relationIsSatisfied(rule, selected)) {
        visit(requirementIndex + 1);
      }
      combination.pop();
      selected.delete(requirement.id);
    }
  }

  visit(0);
  matches.sort((left, right) =>
    combinationSortKey(left).localeCompare(combinationSortKey(right)),
  );
  return matches[0] ?? null;
}

function validateNonEmptyString(value: string, label: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function validateModel(
  dimensions: readonly TaxIdentityDimension[],
  overlapRules: readonly TaxIdentityOverlapRule[],
  example: TaxIdentityExample,
): Map<string, TaxIdentityDimension> {
  const dimensionById = new Map(
    dimensions.map((dimension) => [dimension.id, dimension]),
  );
  if (dimensionById.size !== dimensions.length) {
    throw new Error("Tax identity dimension IDs must be unique.");
  }

  const subjectIds = new Set<string>();
  for (const subject of example.subjects) {
    validateNonEmptyString(subject.id, "Tax identity subject ID");
    validateNonEmptyString(subject.label, `Tax identity subject ${subject.id} label`);
    validateNonEmptyString(subject.kind, `Tax identity subject ${subject.id} kind`);
    if (subjectIds.has(subject.id)) {
      throw new Error(`Tax identity subject ID ${subject.id} is not unique.`);
    }
    subjectIds.add(subject.id);
  }

  for (const assertion of example.assertions) {
    if (!dimensionById.has(assertion.dimensionId)) {
      throw new Error(
        `Tax identity assertion uses unknown dimension ${assertion.dimensionId}.`,
      );
    }
    if (!subjectIds.has(assertion.scope.subjectRef)) {
      throw new Error(
        `Tax identity assertion ${assertion.dimensionId}:${assertion.classificationId} uses unknown subject ${assertion.scope.subjectRef}.`,
      );
    }
    validateNonEmptyString(
      assertion.scope.jurisdiction,
      "Tax identity assertion scope jurisdiction",
    );
    validateNonEmptyString(
      assertion.scope.taxOrRegime,
      "Tax identity assertion scope tax or regime",
    );
    validateNonEmptyString(
      assertion.scope.activityOrContext,
      "Tax identity assertion scope activity or context",
    );
    validateNonEmptyString(
      assertion.scope.ruleset,
      "Tax identity assertion scope ruleset",
    );
    if (
      !TAX_IDENTITY_EFFECTIVE_DATE_BASES.includes(
        assertion.effectiveDateBasis as (typeof TAX_IDENTITY_EFFECTIVE_DATE_BASES)[number],
      )
    ) {
      throw new Error(
        `Tax identity assertion ${assertion.dimensionId}:${assertion.classificationId} uses unknown effective-date basis ${String(assertion.effectiveDateBasis)}.`,
      );
    }
    if (
      assertion.effectiveDateBasis === "stated-interval" &&
      assertion.effectiveFrom === null &&
      assertion.effectiveTo === null
    ) {
      throw new Error(
        `Tax identity assertion ${assertion.dimensionId}:${assertion.classificationId} has a stated interval without a date bound.`,
      );
    }
    if (
      assertion.effectiveFrom !== null &&
      assertion.effectiveTo !== null &&
      assertion.effectiveFrom > assertion.effectiveTo
    ) {
      throw new Error(
        `Tax identity assertion ${assertion.dimensionId}:${assertion.classificationId} has an inverted effective interval.`,
      );
    }
    if (
      assertion.effectiveDateBasis !== "stated-interval" &&
      (assertion.effectiveFrom !== null ||
        assertion.effectiveTo !== null)
    ) {
      throw new Error(
        `Tax identity assertion ${assertion.dimensionId}:${assertion.classificationId} has date bounds without a stated-interval basis.`,
      );
    }
    if (
      (assertion.status === "not-applicable") !==
      (assertion.effectiveDateBasis === "not-applicable")
    ) {
      throw new Error(
        `Tax identity assertion ${assertion.dimensionId}:${assertion.classificationId} must pair not-applicable status and effective-date basis.`,
      );
    }
  }

  const overlapIds = new Set<string>();
  for (const overlap of overlapRules) {
    if (overlapIds.has(overlap.id)) {
      throw new Error(`Tax identity overlap ID ${overlap.id} is not unique.`);
    }
    overlapIds.add(overlap.id);
    if (overlap.archetypeIds.length === 0) {
      throw new Error(
        `Tax identity overlap ${overlap.id} must name at least one archetype.`,
      );
    }
    const overlapArchetypeIds = new Set(overlap.archetypeIds);
    if (overlapArchetypeIds.size !== overlap.archetypeIds.length) {
      throw new Error(
        `Tax identity overlap ${overlap.id} archetype IDs must be unique.`,
      );
    }
    for (const archetypeId of overlap.archetypeIds) {
      validateNonEmptyString(
        archetypeId,
        `Tax identity overlap ${overlap.id} archetype ID`,
      );
    }
    if (overlap.requires.length === 0) {
      throw new Error(
        `Tax identity overlap ${overlap.id} must have at least one requirement.`,
      );
    }

    const requirementIds = new Set<string>();
    for (const requirement of overlap.requires) {
      if (requirementIds.has(requirement.id)) {
        throw new Error(
          `Tax identity overlap ${overlap.id} requirement ID ${requirement.id} is not unique.`,
        );
      }
      requirementIds.add(requirement.id);
      if (!dimensionById.has(requirement.dimensionId)) {
        throw new Error(
          `Tax identity overlap ${overlap.id} uses unknown dimension ${requirement.dimensionId}.`,
        );
      }
    }

    for (const relation of overlap.relations) {
      if (
        !TAX_IDENTITY_RELATION_FIELDS.includes(
          relation.field as (typeof TAX_IDENTITY_RELATION_FIELDS)[number],
        )
      ) {
        throw new Error(
          `Tax identity overlap ${overlap.id} uses unknown relation field ${String(relation.field)}.`,
        );
      }
      if (
        !TAX_IDENTITY_RELATION_OPERATORS.includes(
          relation.operator as (typeof TAX_IDENTITY_RELATION_OPERATORS)[number],
        )
      ) {
        throw new Error(
          `Tax identity overlap ${overlap.id} uses unknown relation operator ${String(relation.operator)}.`,
        );
      }
      if (!requirementIds.has(relation.leftRequirementId)) {
        throw new Error(
          `Tax identity overlap ${overlap.id} relation uses unknown requirement ${relation.leftRequirementId}.`,
        );
      }
      if (!requirementIds.has(relation.rightRequirementId)) {
        throw new Error(
          `Tax identity overlap ${overlap.id} relation uses unknown requirement ${relation.rightRequirementId}.`,
        );
      }
      if (relation.leftRequirementId === relation.rightRequirementId) {
        throw new Error(
          `Tax identity overlap ${overlap.id} relation must join two different requirements.`,
        );
      }
    }
  }

  return dimensionById;
}

/**
 * Read one synthetic profile through every declared dimension.
 *
 * This deliberately does not decide a person's tax position. The public API
 * exposes only reviewed examples; callers can use the same pure function
 * locally after selecting and sourcing their own assertions.
 */
export function interpretTaxIdentity(
  dimensions: readonly TaxIdentityDimension[],
  overlapRules: readonly TaxIdentityOverlapRule[],
  example: TaxIdentityExample,
): TaxIdentityInterpretation {
  validateModel(dimensions, overlapRules, example);

  if (example.archetypeIds.length === 0) {
    throw new Error("Tax identity example must name at least one archetype.");
  }
  if (new Set(example.archetypeIds).size !== example.archetypeIds.length) {
    throw new Error("Tax identity example archetype IDs must be unique.");
  }
  for (const archetypeId of example.archetypeIds) {
    validateNonEmptyString(archetypeId, "Tax identity example archetype ID");
  }
  const exampleArchetypeIds = new Set(example.archetypeIds);

  const activeAssertions = example.assertions.filter(
    (assertion): assertion is TaxIdentityAssertion & { status: MatchStatus } =>
      assertionCanMatch(assertion) &&
      assertionIsActiveOn(assertion, example.asOf),
  );

  const identityVector = dimensions.map((dimension) => ({
    dimensionId: dimension.id,
    dimensionLabel: dimension.label,
    assertions: example.assertions
      .filter((assertion) => assertion.dimensionId === dimension.id)
      .sort((left, right) => assertionKey(left).localeCompare(assertionKey(right))),
  }));

  const unresolvedDimensionIds = identityVector
    .filter(
      (entry) =>
        !entry.assertions.some(
          (assertion) =>
            coverageStatuses.has(assertion.status) &&
            assertionIsActiveOn(assertion, example.asOf),
        ),
    )
    .map((entry) => entry.dimensionId);

  const conflictingDimensionIds = dimensions
    .filter((dimension) => {
      if (dimension.cardinality !== "one") return false;

      const classificationIdsByScope = new Map<string, Set<string>>();
      for (const assertion of activeAssertions) {
        if (assertion.dimensionId !== dimension.id) continue;
        const key = scopeKey(assertion.scope);
        const classificationIds =
          classificationIdsByScope.get(key) ?? new Set<string>();
        classificationIds.add(assertion.classificationId);
        classificationIdsByScope.set(key, classificationIds);
      }
      return [...classificationIdsByScope.values()].some(
        (classificationIds) => classificationIds.size > 1,
      );
    })
    .map((dimension) => dimension.id);

  const inactiveAssertionIds = example.assertions
    .filter(
      (assertion) =>
        coverageStatuses.has(assertion.status) &&
        !assertionIsActiveOn(assertion, example.asOf),
    )
    .map(assertionKey);

  const matchedOverlaps = overlapRules
    .filter((rule) =>
      rule.archetypeIds.some((archetypeId) =>
        exampleArchetypeIds.has(archetypeId),
      ),
    )
    .map((rule) => ({
      rule,
      assertions: matchingCombination(rule, activeAssertions),
    }))
    .filter(
      (
        match,
      ): match is {
        rule: TaxIdentityOverlapRule;
        assertions: Array<TaxIdentityAssertion & { status: MatchStatus }>;
      } => match.assertions !== null,
    );

  const overlaps = matchedOverlaps
    .map(({ rule, assertions }) => {
      const matchedAssertions: Record<string, TaxIdentityMatchedAssertion> = {};
      rule.requires.forEach((requirement, index) => {
        const assertion = assertions[index];
        if (!assertion) return;
        matchedAssertions[requirement.id] = {
          dimensionId: assertion.dimensionId,
          classificationId: assertion.classificationId,
          scope: { ...assertion.scope },
          status: assertion.status,
        };
      });
      return {
        id: rule.id,
        label: rule.label,
        meaning: rule.meaning,
        dangerousShortcut: rule.dangerousShortcut,
        status: combinationStatus(assertions),
        matchedAssertions,
        sourceIds: [...rule.sourceIds].sort(),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  const needsReviewReasons = [
    ...conflictingDimensionIds.map(
      (dimensionId) =>
        `The one-value dimension ${dimensionId} has competing active assertions within the same scope.`,
    ),
    ...inactiveAssertionIds.map(
      (id) => `Assertion ${id} is outside its stated effective dates.`,
    ),
    ...example.assertions
      .filter((assertion) =>
        ["disputed", "unknown"].includes(assertion.status),
      )
      .map(
        (assertion) =>
          `Assertion ${assertionKey(assertion)} is ${assertion.status}.`,
      ),
    ...unresolvedDimensionIds.map(
      (dimensionId) =>
        `No active established, conditional, disputed or not-applicable assertion covers ${dimensionId}.`,
    ),
    ...overlaps
      .filter((overlap) => overlap.status === "disputed")
      .map(
        (overlap) =>
          `Overlap ${overlap.id} is matched by at least one disputed assertion.`,
      ),
  ];
  const ordinaryReviewReasons = [
    ...example.reviewTriggers,
    ...matchedOverlaps.flatMap(({ rule }) => rule.reviewTriggers),
    ...overlaps
      .filter((overlap) => overlap.status === "conditional")
      .map(
        (overlap) =>
          `Overlap ${overlap.id} is conditional on at least one assertion.`,
      ),
  ];
  const reasons = uniqueSorted([
    ...needsReviewReasons,
    ...ordinaryReviewReasons,
  ]);

  return {
    schema: "taxsorted.tax-identity-interpretation/1",
    example: {
      id: example.id,
      label: example.label,
      summary: example.summary,
      jurisdiction: example.jurisdiction,
      asOf: example.asOf,
      archetypeIds: [...example.archetypeIds].sort(),
      subjects: example.subjects
        .map((subject) => ({ ...subject }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    },
    identityVector,
    overlaps,
    unresolvedDimensionIds,
    review: {
      status:
        needsReviewReasons.length > 0
          ? "needs-review"
          : reasons.length > 0
            ? "review-before-use"
            : "worked-example",
      reasons,
      conflictingDimensionIds,
      inactiveAssertionIds,
    },
    sourceIds: uniqueSorted([
      ...example.assertions.flatMap((assertion) => assertion.sourceIds),
      ...matchedOverlaps.flatMap(({ rule }) => rule.sourceIds),
    ]),
    notDetermined: [...example.notDetermined],
    boundary: {
      syntheticExample: true,
      personalFactsAccepted: false,
      legalAdvice: false,
      filingOrSubmission: false,
      singleLabelSufficient: false,
    },
  };
}
