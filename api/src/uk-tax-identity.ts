// Public, source-backed vocabulary for UK tax identity. The corpus contains
// reviewed concepts and synthetic examples only: no names, identifiers,
// addresses, ownership records or private taxpayer facts.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  TAX_IDENTITY_ASSERTION_STATUSES,
  TAX_IDENTITY_EFFECTIVE_DATE_BASES,
  TAX_IDENTITY_RELATION_FIELDS,
  TAX_IDENTITY_RELATION_OPERATORS,
  interpretTaxIdentity,
} from "@taxsorted/engine/uk/identity";
import { z } from "zod";
import { assertNoDuplicateJsonKeys } from "./strict-json.js";

const text = z.string().trim().min(1).max(4_000);
const shortText = z.string().trim().min(1).max(1_000);
const recordId = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const classificationId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/);
const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "URL must use HTTPS");
const path = z.string().regex(/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/?{}-]*$/);
const nonEmptyText = z.array(text).min(1).max(100);
const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();

function isCalendarDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDate, "invalid calendar date");

const partialDate = z
  .string()
  .regex(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/)
  .refine((value) => {
    if (value.length === 4) return true;
    if (value.length === 7) {
      const month = Number(value.slice(5, 7));
      return month >= 1 && month <= 12;
    }
    return isCalendarDate(value);
  }, "invalid calendar date or date prefix");

export const ukTaxIdentitySourceSchema = strictObject({
  id: recordId,
  title: shortText,
  publisher: shortText,
  url: httpsUrl,
  authorityLevel: z.enum([
    "legislation",
    "official-guidance",
    "model-standard",
    "regulation-or-directive",
  ]),
  jurisdiction: shortText,
  retrievedAt: date,
  supports: nonEmptyText,
  limitations: nonEmptyText,
});

export const ukTaxIdentityClassificationSchema = strictObject({
  id: classificationId,
  label: shortText,
  meaning: text,
  doesNotMean: text,
  sourceIds: z.array(recordId).min(1).max(100),
});

export const ukTaxIdentityDimensionSchema = strictObject({
  id: recordId,
  label: shortText,
  question: text,
  meaning: text,
  cardinality: z.enum(["one", "many"]),
  origin: text,
  classificationValues: z
    .array(ukTaxIdentityClassificationSchema)
    .min(1)
    .max(100),
  reviewWhen: nonEmptyText,
  sourceIds: z.array(recordId).min(1).max(100),
});

export const ukTaxIdentityArchetypeSchema = strictObject({
  id: recordId,
  label: shortText,
  subjectKind: recordId,
  territory: shortText,
  summary: text,
  dimensionHighlights: z.array(classificationId).min(1).max(100),
  taxRoles: z
    .array(
      strictObject({
        taxOrRegime: shortText,
        subject: shortText,
        role: shortText,
        caveat: text,
      }),
    )
    .min(1)
    .max(50),
  commonMisreadings: nonEmptyText,
  sourceIds: z.array(recordId).min(1).max(100),
});

const taxIdentityRequiredClassificationSchema = strictObject({
  id: recordId,
  dimensionId: recordId,
  classificationId,
});

const taxIdentityOverlapRelationSchema = strictObject({
  leftRequirementId: recordId,
  rightRequirementId: recordId,
  field: z.enum(TAX_IDENTITY_RELATION_FIELDS),
  operator: z.enum(TAX_IDENTITY_RELATION_OPERATORS),
});

export const ukTaxIdentityOverlapSchema = strictObject({
  id: recordId,
  label: shortText,
  archetypeIds: z.array(recordId).min(1).max(100),
  dimensionIds: z.array(recordId).min(1).max(100),
  requires: z
    .array(taxIdentityRequiredClassificationSchema)
    .min(1)
    .max(100),
  relations: z.array(taxIdentityOverlapRelationSchema).max(500),
  meaning: text,
  dangerousShortcut: text,
  questions: nonEmptyText,
  reviewTriggers: nonEmptyText,
  sourceIds: z.array(recordId).min(1).max(100),
});

export const ukTaxIdentityMilestoneSchema = strictObject({
  id: recordId,
  date: partialDate,
  eventType: z.enum([
    "changed-connecting-factor",
    "codified",
    "consolidated",
    "consolidated-standard",
    "created-form",
    "introduced-election",
    "introduced-rule",
    "strengthened-standard",
  ]),
  title: shortText,
  change: text,
  continuity: text,
  dimensionIds: z.array(recordId).min(1).max(100),
  archetypeIds: z.array(recordId).min(1).max(100),
  sourceIds: z.array(recordId).min(1).max(100),
});

export const taxIdentityAssertionSchema = strictObject({
  dimensionId: recordId,
  classificationId,
  status: z.enum(TAX_IDENTITY_ASSERTION_STATUSES),
  scope: strictObject({
    subjectRef: recordId,
    jurisdiction: shortText,
    taxOrRegime: shortText,
    activityOrContext: shortText,
    ruleset: shortText,
  }),
  effectiveDateBasis: z.enum(TAX_IDENTITY_EFFECTIVE_DATE_BASES),
  basis: text,
  sourceIds: z.array(recordId).min(1).max(100),
  effectiveFrom: date.nullable(),
  effectiveTo: date.nullable(),
});

export const taxIdentitySubjectSchema = strictObject({
  id: recordId,
  label: shortText,
  kind: recordId,
});

export const ukTaxIdentityExampleProfileSchema = strictObject({
  id: recordId,
  label: shortText,
  summary: text,
  jurisdiction: shortText,
  asOf: date,
  archetypeIds: z.array(recordId).min(1).max(100),
  subjects: z.array(taxIdentitySubjectSchema).min(1).max(100),
  assertions: z.array(taxIdentityAssertionSchema).min(1).max(100),
  reviewTriggers: nonEmptyText,
  notDetermined: nonEmptyText,
});

export const ukTaxIdentityGapSchema = strictObject({
  id: recordId,
  title: shortText,
  status: z.enum([
    "coverage-gap",
    "effect-boundary",
    "intentionally-not-generalised",
    "method-boundary",
    "privacy-boundary",
  ]),
  why: text,
  safeNextStep: text,
});

const ukTaxIdentityStructuralSchema = strictObject({
  schema: z.literal("taxsorted.uk.tax-identity/1"),
  meta: strictObject({
    title: z.literal("UK tax identity framework"),
    version: z.string().regex(/^\d{4}-\d{2}-\d{2}\.\d+$/),
    reviewedOn: date,
    lawAsAt: date,
    jurisdiction: z.literal("United Kingdom"),
    purpose: text,
    portability: text,
    warning: text,
    contentLicence: strictObject({
      name: z.literal("CC BY-SA 4.0"),
      url: httpsUrl,
      scope: text,
    }),
    editorialRules: nonEmptyText,
    boundaries: nonEmptyText,
  }),
  sources: z.array(ukTaxIdentitySourceSchema).min(1).max(500),
  dimensions: z.array(ukTaxIdentityDimensionSchema).min(1).max(100),
  archetypes: z.array(ukTaxIdentityArchetypeSchema).min(1).max(500),
  overlaps: z.array(ukTaxIdentityOverlapSchema).min(1).max(500),
  milestones: z.array(ukTaxIdentityMilestoneSchema).min(1).max(500),
  exampleProfiles: z
    .array(ukTaxIdentityExampleProfileSchema)
    .min(1)
    .max(500),
  gaps: z.array(ukTaxIdentityGapSchema).min(1).max(500),
});

export type UkTaxIdentity = z.infer<typeof ukTaxIdentityStructuralSchema>;
export type UkTaxIdentitySource = z.infer<
  typeof ukTaxIdentitySourceSchema
>;
export type UkTaxIdentityExampleProfile = z.infer<
  typeof ukTaxIdentityExampleProfileSchema
>;

function duplicateValues(values: readonly string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function collectIntegrityIssues(corpus: UkTaxIdentity) {
  const issues: string[] = [];
  const sourceIds = new Set(corpus.sources.map((source) => source.id));
  const dimensionIds = new Set(
    corpus.dimensions.map((dimension) => dimension.id),
  );
  const archetypeIds = new Set(
    corpus.archetypes.map((archetype) => archetype.id),
  );
  const classificationOwner = new Map<string, string>();
  const usedSourceIds = new Set<string>();

  const checkUnique = (
    owner: string,
    values: readonly string[],
    kind: string,
  ) => {
    for (const value of duplicateValues(values)) {
      issues.push(`${owner} repeats ${kind}: ${value}`);
    }
  };
  const checkReferences = (
    owner: string,
    values: readonly string[],
    known: ReadonlySet<string>,
    kind: string,
  ) => {
    checkUnique(owner, values, `${kind} reference`);
    for (const value of values) {
      if (!known.has(value)) {
        issues.push(`${owner} refers to unknown ${kind}: ${value}`);
      }
    }
  };
  const checkSources = (owner: string, values: readonly string[]) => {
    checkReferences(owner, values, sourceIds, "source");
    for (const value of values) usedSourceIds.add(value);
  };

  const recordCollections: Array<readonly { id: string }[]> = [
    corpus.sources,
    corpus.dimensions,
    corpus.archetypes,
    corpus.overlaps,
    corpus.milestones,
    corpus.exampleProfiles,
    corpus.gaps,
  ];
  const recordIds = recordCollections.flatMap((collection) =>
    collection.map((record) => record.id),
  );
  for (const value of duplicateValues(recordIds)) {
    issues.push(`duplicate corpus record ID: ${value}`);
  }

  if (corpus.meta.lawAsAt > corpus.meta.reviewedOn) {
    issues.push("meta.lawAsAt cannot be after meta.reviewedOn");
  }
  for (const source of corpus.sources) {
    if (source.retrievedAt > corpus.meta.reviewedOn) {
      issues.push(
        `${source.id} was retrieved after the corpus review date`,
      );
    }
    checkUnique(source.id, source.supports, "supported claim");
    checkUnique(source.id, source.limitations, "limitation");
  }

  for (const dimension of corpus.dimensions) {
    checkSources(dimension.id, dimension.sourceIds);
    checkUnique(dimension.id, dimension.reviewWhen, "review trigger");
    checkUnique(
      dimension.id,
      dimension.classificationValues.map((value) => value.id),
      "classification",
    );
    for (const classification of dimension.classificationValues) {
      if (/(?:unknown|unresolved)$/u.test(classification.id)) {
        issues.push(
          `${classification.id} encodes uncertainty as a classification; use assertion status with the concrete proposition instead`,
        );
      }
      checkSources(
        `${dimension.id} ${classification.id}`,
        classification.sourceIds,
      );
      for (const sourceId of classification.sourceIds) {
        if (!dimension.sourceIds.includes(sourceId)) {
          issues.push(
            `${dimension.id} classification ${classification.id} uses source ${sourceId} that is missing from the dimension sourceIds`,
          );
        }
      }
      const existing = classificationOwner.get(classification.id);
      if (existing) {
        issues.push(
          `classification ${classification.id} belongs to both ${existing} and ${dimension.id}`,
        );
      } else {
        classificationOwner.set(classification.id, dimension.id);
      }
    }
  }

  const classificationIds = new Set(classificationOwner.keys());
  for (const archetype of corpus.archetypes) {
    checkSources(archetype.id, archetype.sourceIds);
    checkReferences(
      archetype.id,
      archetype.dimensionHighlights,
      classificationIds,
      "classification",
    );
    checkUnique(
      archetype.id,
      archetype.commonMisreadings,
      "common misreading",
    );
  }

  for (const overlap of corpus.overlaps) {
    checkSources(overlap.id, overlap.sourceIds);
    checkReferences(
      overlap.id,
      overlap.archetypeIds,
      archetypeIds,
      "archetype",
    );
    checkReferences(
      overlap.id,
      overlap.dimensionIds,
      dimensionIds,
      "dimension",
    );
    checkUnique(
      overlap.id,
      overlap.requires.map((required) => required.id),
      "requirement ID",
    );
    const requirementIds = new Set(
      overlap.requires.map((required) => required.id),
    );
    for (const required of overlap.requires) {
      if (!dimensionIds.has(required.dimensionId)) {
        issues.push(
          `${overlap.id} requirement refers to unknown dimension: ${required.dimensionId}`,
        );
      }
      const owner = classificationOwner.get(required.classificationId);
      if (!owner) {
        issues.push(
          `${overlap.id} requirement refers to unknown classification: ${required.classificationId}`,
        );
      } else if (owner !== required.dimensionId) {
        issues.push(
          `${overlap.id} pairs ${required.classificationId} with ${required.dimensionId}, but it belongs to ${owner}`,
        );
      }
      if (!overlap.dimensionIds.includes(required.dimensionId)) {
        issues.push(
          `${overlap.id} requirement dimension is missing from dimensionIds: ${required.dimensionId}`,
        );
      }
    }
    const relationKeys: string[] = [];
    const relationOperators = new Map<string, string>();
    for (const relation of overlap.relations) {
      if (!requirementIds.has(relation.leftRequirementId)) {
        issues.push(
          `${overlap.id} relation refers to unknown requirement: ${relation.leftRequirementId}`,
        );
      }
      if (!requirementIds.has(relation.rightRequirementId)) {
        issues.push(
          `${overlap.id} relation refers to unknown requirement: ${relation.rightRequirementId}`,
        );
      }
      if (relation.leftRequirementId === relation.rightRequirementId) {
        issues.push(
          `${overlap.id} relation must join two different requirements: ${relation.leftRequirementId}`,
        );
      }
      const pair = [
        relation.leftRequirementId,
        relation.rightRequirementId,
      ].sort().join(":");
      const relationKey = `${pair}:${relation.field}`;
      relationKeys.push(`${relationKey}:${relation.operator}`);
      const existingOperator = relationOperators.get(relationKey);
      if (
        existingOperator &&
        existingOperator !== relation.operator
      ) {
        issues.push(
          `${overlap.id} gives conflicting ${relation.field} relations for ${pair}`,
        );
      } else {
        relationOperators.set(relationKey, relation.operator);
      }
    }
    checkUnique(overlap.id, relationKeys, "scope relation");
    checkUnique(overlap.id, overlap.questions, "question");
    checkUnique(overlap.id, overlap.reviewTriggers, "review trigger");
  }

  const milestoneDimensionIds = new Set<string>();
  const milestoneArchetypeIds = new Set<string>();
  for (const milestone of corpus.milestones) {
    checkSources(milestone.id, milestone.sourceIds);
    checkReferences(
      milestone.id,
      milestone.dimensionIds,
      dimensionIds,
      "dimension",
    );
    checkReferences(
      milestone.id,
      milestone.archetypeIds,
      archetypeIds,
      "archetype",
    );
    for (const dimensionId of milestone.dimensionIds) {
      milestoneDimensionIds.add(dimensionId);
    }
    for (const archetypeId of milestone.archetypeIds) {
      milestoneArchetypeIds.add(archetypeId);
    }
    if (milestone.date.slice(0, 10) > corpus.meta.lawAsAt) {
      issues.push(`${milestone.id} starts after meta.lawAsAt`);
    }
  }
  for (const dimensionId of dimensionIds) {
    if (!milestoneDimensionIds.has(dimensionId)) {
      issues.push(
        `dimension ${dimensionId} has no origin or evolution milestone`,
      );
    }
  }
  for (const archetypeId of archetypeIds) {
    if (!milestoneArchetypeIds.has(archetypeId)) {
      issues.push(
        `archetype ${archetypeId} has no origin or evolution milestone`,
      );
    }
  }

  for (const example of corpus.exampleProfiles) {
    if (example.asOf > corpus.meta.lawAsAt) {
      issues.push(`${example.id} asOf is after meta.lawAsAt`);
    }
    checkUnique(example.id, example.reviewTriggers, "review trigger");
    checkUnique(example.id, example.notDetermined, "undetermined matter");
    checkReferences(
      example.id,
      example.archetypeIds,
      archetypeIds,
      "archetype",
    );
    checkUnique(
      example.id,
      example.subjects.map((subject) => subject.id),
      "subject ID",
    );
    const subjectIds = new Set(
      example.subjects.map((subject) => subject.id),
    );
    const assertionKeys = example.assertions.map(
      (assertion) =>
        [
          assertion.dimensionId,
          assertion.classificationId,
          assertion.scope.subjectRef,
          assertion.scope.jurisdiction,
          assertion.scope.taxOrRegime,
          assertion.scope.activityOrContext,
          assertion.scope.ruleset,
          assertion.effectiveFrom ?? "",
          assertion.effectiveTo ?? "",
        ].join("|"),
    );
    checkUnique(example.id, assertionKeys, "assertion");
    const coveredDimensions = new Set<string>();
    const usedSubjectIds = new Set<string>();
    for (const assertion of example.assertions) {
      coveredDimensions.add(assertion.dimensionId);
      usedSubjectIds.add(assertion.scope.subjectRef);
      if (!dimensionIds.has(assertion.dimensionId)) {
        issues.push(
          `${example.id} assertion refers to unknown dimension: ${assertion.dimensionId}`,
        );
      }
      const owner = classificationOwner.get(assertion.classificationId);
      if (!owner) {
        issues.push(
          `${example.id} assertion refers to unknown classification: ${assertion.classificationId}`,
        );
      } else if (owner !== assertion.dimensionId) {
        issues.push(
          `${example.id} pairs ${assertion.classificationId} with ${assertion.dimensionId}, but it belongs to ${owner}`,
        );
      }
      if (!subjectIds.has(assertion.scope.subjectRef)) {
        issues.push(
          `${example.id} assertion ${assertion.dimensionId}:${assertion.classificationId} refers to unknown subject: ${assertion.scope.subjectRef}`,
        );
      }
      checkSources(
        `${example.id} ${assertion.dimensionId}:${assertion.classificationId}`,
        assertion.sourceIds,
      );
      if (
        assertion.effectiveFrom &&
        assertion.effectiveTo &&
        assertion.effectiveFrom > assertion.effectiveTo
      ) {
        issues.push(
          `${example.id} assertion ${assertion.dimensionId}:${assertion.classificationId} has an inverted effective interval`,
        );
      }
      if (
        assertion.effectiveDateBasis === "stated-interval" &&
        !assertion.effectiveFrom &&
        !assertion.effectiveTo
      ) {
        issues.push(
          `${example.id} assertion ${assertion.dimensionId}:${assertion.classificationId} states an interval without a date bound`,
        );
      }
      if (
        assertion.effectiveDateBasis !== "stated-interval" &&
        (assertion.effectiveFrom || assertion.effectiveTo)
      ) {
        issues.push(
          `${example.id} assertion ${assertion.dimensionId}:${assertion.classificationId} has date bounds but does not use stated-interval`,
        );
      }
      if (
        assertion.effectiveDateBasis === "current-at-corpus-review" &&
        example.asOf !== corpus.meta.lawAsAt
      ) {
        issues.push(
          `${example.id} uses current-at-corpus-review for an example not dated to meta.lawAsAt`,
        );
      }
      if (
        (assertion.status === "not-applicable") !==
        (assertion.effectiveDateBasis === "not-applicable")
      ) {
        issues.push(
          `${example.id} assertion ${assertion.dimensionId}:${assertion.classificationId} must pair not-applicable status and effective-date basis`,
        );
      }
    }
    for (const dimensionId of dimensionIds) {
      if (!coveredDimensions.has(dimensionId)) {
        issues.push(
          `${example.id} has no assertion for dimension ${dimensionId}`,
        );
      }
    }
    for (const subjectId of subjectIds) {
      if (!usedSubjectIds.has(subjectId)) {
        issues.push(
          `${example.id} declares subject ${subjectId} without a scoped assertion`,
        );
      }
    }
  }

  for (const sourceId of sourceIds) {
    if (!usedSourceIds.has(sourceId)) {
      issues.push(`unreferenced source: ${sourceId}`);
    }
  }
  return issues;
}

export const ukTaxIdentityRuntimeInvariants = [
  "Every corpus record ID and classification ID is unique in its declared namespace.",
  "Every source, subject, dimension, archetype, requirement and classification reference resolves.",
  "Every classification is individually sourced and every source is used.",
  "Unknown and unresolved are assertion states, never classification values.",
  "Every required overlap classification belongs to its declared dimension and every pairwise scope relation resolves.",
  "Every synthetic example covers every declared identity dimension and declares its subjects and archetypes.",
  "Every assertion names a full scope and an explicit, coherent effective-date basis.",
  "Every stated assertion interval is bounded and ordered.",
  "Every dimension and archetype appears in the origin and evolution timeline.",
  "Corpus law, source and example dates do not run beyond the review boundary.",
] as const;

export const ukTaxIdentitySchema =
  ukTaxIdentityStructuralSchema.superRefine((corpus, context) => {
    for (const issue of collectIntegrityIssues(corpus)) {
      context.addIssue({ code: "custom", message: issue });
    }
  });

export type ValidatedUkTaxIdentity = z.infer<typeof ukTaxIdentitySchema>;

export const taxIdentityInterpretationSchema = strictObject({
  schema: z.literal("taxsorted.tax-identity-interpretation/1"),
  example: strictObject({
    id: recordId,
    label: shortText,
    summary: text,
    jurisdiction: shortText,
    asOf: date,
    archetypeIds: z.array(recordId).min(1).max(100),
    subjects: z.array(taxIdentitySubjectSchema).min(1).max(100),
  }),
  identityVector: z.array(
    strictObject({
      dimensionId: recordId,
      dimensionLabel: shortText,
      assertions: z.array(taxIdentityAssertionSchema).min(1).max(100),
    }),
  ).min(1).max(100),
  overlaps: z.array(
    strictObject({
      id: recordId,
      label: shortText,
      meaning: text,
      dangerousShortcut: text,
      status: z.enum(["established", "conditional", "disputed"]),
      matchedAssertions: z.record(
        recordId,
        strictObject({
          dimensionId: recordId,
          classificationId,
          scope: strictObject({
            subjectRef: recordId,
            jurisdiction: shortText,
            taxOrRegime: shortText,
            activityOrContext: shortText,
            ruleset: shortText,
          }),
          status: z.enum(["established", "conditional", "disputed"]),
        }),
      ),
      sourceIds: z.array(recordId).min(1).max(100),
    }),
  ).max(500),
  unresolvedDimensionIds: z.array(recordId).max(100),
  review: strictObject({
    status: z.enum([
      "worked-example",
      "review-before-use",
      "needs-review",
    ]),
    reasons: z.array(text).max(500),
    conflictingDimensionIds: z.array(recordId).max(100),
    inactiveAssertionIds: z.array(text).max(500),
  }),
  sourceIds: z.array(recordId).min(1).max(500),
  notDetermined: nonEmptyText,
  boundary: strictObject({
    syntheticExample: z.literal(true),
    personalFactsAccepted: z.literal(false),
    legalAdvice: z.literal(false),
    filingOrSubmission: z.literal(false),
    singleLabelSufficient: z.literal(false),
  }),
});

export const ukTaxIdentityOverviewSchema = strictObject({
  schema: z.literal("taxsorted.uk.tax-identity-overview/1"),
  framework: z.literal("uk-tax-identity-framework"),
  version: text,
  reviewedOn: date,
  lawAsAt: date,
  jurisdiction: z.literal("United Kingdom"),
  purpose: text,
  portability: text,
  warning: text,
  access: strictObject({
    authentication: z.literal("none"),
    methods: z.tuple([z.literal("GET"), z.literal("HEAD")]),
    writeMethods: z.literal(false),
    personalFactsAccepted: z.literal(false),
    externalStateChanged: z.literal(false),
  }),
  counts: strictObject({
    sources: z.number().int().nonnegative(),
    dimensions: z.number().int().nonnegative(),
    archetypes: z.number().int().nonnegative(),
    overlaps: z.number().int().nonnegative(),
    milestones: z.number().int().nonnegative(),
    exampleProfiles: z.number().int().nonnegative(),
    gaps: z.number().int().nonnegative(),
  }),
  dimensionSummaries: z.array(
    strictObject({
      id: recordId,
      label: shortText,
      question: text,
      cardinality: z.enum(["one", "many"]),
      classificationCount: z.number().int().positive(),
    }),
  ).min(1).max(100),
  archetypeSummaries: z.array(
    strictObject({
      id: recordId,
      label: shortText,
      subjectKind: recordId,
      territory: shortText,
      summary: text,
    }),
  ).min(1).max(500),
  routes: strictObject({
    overview: path,
    graph: path,
    dimensions: path,
    archetypes: path,
    overlaps: path,
    timeline: path,
    examples: path,
    exampleTemplate: path,
    sources: path,
    gaps: path,
    schema: path,
    rights: path,
    openApi: path,
    humanGuide: path,
  }),
  boundaries: nonEmptyText,
});

const collectionEnvelope = {
  schema: z.literal("taxsorted.uk.tax-identity-collection/1"),
  corpusVersion: text,
  warning: text,
  count: z.number().int().nonnegative(),
} as const;

export const ukTaxIdentityDimensionsResponseSchema = strictObject({
  ...collectionEnvelope,
  collection: z.literal("dimensions"),
  dimensions: z.array(ukTaxIdentityDimensionSchema),
});
export const ukTaxIdentityArchetypesResponseSchema = strictObject({
  ...collectionEnvelope,
  collection: z.literal("archetypes"),
  archetypes: z.array(ukTaxIdentityArchetypeSchema),
});
export const ukTaxIdentityOverlapsResponseSchema = strictObject({
  ...collectionEnvelope,
  collection: z.literal("overlaps"),
  overlaps: z.array(ukTaxIdentityOverlapSchema),
});
export const ukTaxIdentityTimelineResponseSchema = strictObject({
  ...collectionEnvelope,
  collection: z.literal("milestones"),
  milestones: z.array(ukTaxIdentityMilestoneSchema),
});
export const ukTaxIdentityExamplesResponseSchema = strictObject({
  ...collectionEnvelope,
  collection: z.literal("exampleProfiles"),
  exampleProfiles: z.array(ukTaxIdentityExampleProfileSchema),
});
export const ukTaxIdentitySourcesResponseSchema = strictObject({
  ...collectionEnvelope,
  collection: z.literal("sources"),
  sources: z.array(ukTaxIdentitySourceSchema),
});
export const ukTaxIdentityGapsResponseSchema = strictObject({
  ...collectionEnvelope,
  collection: z.literal("gaps"),
  gaps: z.array(ukTaxIdentityGapSchema),
});

export const ukTaxIdentityExampleDetailSchema = strictObject({
  schema: z.literal("taxsorted.uk.tax-identity-example-detail/1"),
  corpusVersion: text,
  exampleProfile: ukTaxIdentityExampleProfileSchema,
  interpretation: taxIdentityInterpretationSchema,
  sources: z.array(ukTaxIdentitySourceSchema).min(1).max(500),
});

export const ukTaxIdentityRightsSchema = strictObject({
  schema: z.literal("taxsorted.uk.tax-identity-rights/1"),
  status: z.literal("mixed-rights-read-before-reuse"),
  curation: strictObject({
    name: z.literal("CC BY-SA 4.0"),
    url: httpsUrl,
    attribution: text,
    appliesTo: text,
  }),
  sourceMaterial: text,
  reuseRule: text,
  corrections: strictObject({
    url: httpsUrl,
    safety: text,
  }),
  software: strictObject({
    name: z.literal("AGPL-3.0"),
    source: httpsUrl,
  }),
  boundaries: nonEmptyText,
});

const defaultDataPath = fileURLToPath(
  new URL(
    "../../research/uk/tax-identity/data/uk-tax-identity.json",
    import.meta.url,
  ),
);

export function loadUkTaxIdentity(
  dataPath = defaultDataPath,
): ValidatedUkTaxIdentity {
  const body = readFileSync(dataPath, "utf8");
  assertNoDuplicateJsonKeys(body);
  return ukTaxIdentitySchema.parse(JSON.parse(body));
}

export function validateUkTaxIdentity(
  value: unknown,
): ValidatedUkTaxIdentity {
  return ukTaxIdentitySchema.parse(value);
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export const ukTaxIdentity = deepFreeze(loadUkTaxIdentity());

export function interpretUkTaxIdentityExample(
  exampleId: string,
  corpus: ValidatedUkTaxIdentity = ukTaxIdentity,
) {
  const example = corpus.exampleProfiles.find(
    (candidate) => candidate.id === exampleId,
  );
  if (!example) return undefined;
  const interpretation = interpretTaxIdentity(
    corpus.dimensions.map(({ id, label, cardinality }) => ({
      id,
      label,
      cardinality,
    })),
    corpus.overlaps,
    example,
  );
  return taxIdentityInterpretationSchema.parse(interpretation);
}

export function makeUkTaxIdentityExampleDetail(
  exampleId: string,
  corpus: ValidatedUkTaxIdentity = ukTaxIdentity,
) {
  const exampleProfile = corpus.exampleProfiles.find(
    (candidate) => candidate.id === exampleId,
  );
  if (!exampleProfile) return undefined;
  const interpretation = interpretUkTaxIdentityExample(exampleId, corpus);
  if (!interpretation) return undefined;
  const referencedSourceIds = new Set(interpretation.sourceIds);
  return ukTaxIdentityExampleDetailSchema.parse({
    schema: "taxsorted.uk.tax-identity-example-detail/1",
    corpusVersion: corpus.meta.version,
    exampleProfile,
    interpretation,
    sources: corpus.sources.filter((source) =>
      referencedSourceIds.has(source.id),
    ),
  });
}

export const ukTaxIdentityJsonSchemaDocument = deepFreeze({
  ...z.toJSONSchema(ukTaxIdentityStructuralSchema),
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://api.taxsorted.io/v1/tax-identity/uk/schema",
  title: "UK tax identity framework corpus",
  description:
    "Structural schema for the source-backed UK tax-identity dimensions, archetypes, overlaps, timeline and synthetic examples. Runtime integrity checks remain required.",
  "x-taxsorted-validation-scope": {
    jsonSchema: "structural-shape-only",
    runtimeSemanticValidationRequired: true,
    personalFactsAccepted: false,
    externalStateChanged: false,
  },
  "x-taxsorted-runtime-invariants": ukTaxIdentityRuntimeInvariants,
});
