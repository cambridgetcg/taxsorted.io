export const TAX_IDENTITY_ASSERTION_STATUSES = [
  "established",
  "conditional",
  "disputed",
  "unknown",
  "not-applicable",
] as const;

export type TaxIdentityAssertionStatus =
  (typeof TAX_IDENTITY_ASSERTION_STATUSES)[number];

export type TaxIdentityDimension = {
  id: string;
  label: string;
  cardinality: "one" | "many";
};

export type TaxIdentitySubject = {
  id: string;
  label: string;
  kind: string;
};

export type TaxIdentityScope = {
  subjectRef: string;
  jurisdiction: string;
  taxOrRegime: string;
  activityOrContext: string;
  ruleset: string;
};

export const TAX_IDENTITY_EFFECTIVE_DATE_BASES = [
  "stated-interval",
  "current-at-corpus-review",
  "unknown",
  "not-applicable",
] as const;

export type TaxIdentityEffectiveDateBasis =
  (typeof TAX_IDENTITY_EFFECTIVE_DATE_BASES)[number];

export type TaxIdentityAssertion = {
  dimensionId: string;
  classificationId: string;
  status: TaxIdentityAssertionStatus;
  scope: TaxIdentityScope;
  effectiveDateBasis: TaxIdentityEffectiveDateBasis;
  basis: string;
  sourceIds: string[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

export const TAX_IDENTITY_RELATION_FIELDS = [
  "subjectRef",
  "jurisdiction",
  "taxOrRegime",
  "activityOrContext",
  "ruleset",
] as const;

export type TaxIdentityRelationField =
  (typeof TAX_IDENTITY_RELATION_FIELDS)[number];

export const TAX_IDENTITY_RELATION_OPERATORS = [
  "same",
  "different",
] as const;

export type TaxIdentityRelationOperator =
  (typeof TAX_IDENTITY_RELATION_OPERATORS)[number];

export type TaxIdentityOverlapRequirement = {
  id: string;
  dimensionId: string;
  classificationId: string;
};

export type TaxIdentityOverlapRelation = {
  leftRequirementId: string;
  rightRequirementId: string;
  field: TaxIdentityRelationField;
  operator: TaxIdentityRelationOperator;
};

export type TaxIdentityOverlapRule = {
  id: string;
  label: string;
  archetypeIds: string[];
  requires: TaxIdentityOverlapRequirement[];
  relations: TaxIdentityOverlapRelation[];
  meaning: string;
  dangerousShortcut: string;
  reviewTriggers: string[];
  sourceIds: string[];
};

export type TaxIdentityExample = {
  id: string;
  label: string;
  summary: string;
  jurisdiction: string;
  asOf: string;
  archetypeIds: string[];
  subjects: TaxIdentitySubject[];
  assertions: TaxIdentityAssertion[];
  reviewTriggers: string[];
  notDetermined: string[];
};

export type TaxIdentityMatchedAssertion = {
  dimensionId: string;
  classificationId: string;
  scope: TaxIdentityScope;
  status: "established" | "conditional" | "disputed";
};

export type TaxIdentityInterpretation = {
  schema: "taxsorted.tax-identity-interpretation/1";
  example: {
    id: string;
    label: string;
    summary: string;
    jurisdiction: string;
    asOf: string;
    archetypeIds: string[];
    subjects: TaxIdentitySubject[];
  };
  identityVector: Array<{
    dimensionId: string;
    dimensionLabel: string;
    assertions: TaxIdentityAssertion[];
  }>;
  overlaps: Array<{
    id: string;
    label: string;
    meaning: string;
    dangerousShortcut: string;
    status: "established" | "conditional" | "disputed";
    matchedAssertions: Record<string, TaxIdentityMatchedAssertion>;
    sourceIds: string[];
  }>;
  unresolvedDimensionIds: string[];
  review: {
    status: "worked-example" | "review-before-use" | "needs-review";
    reasons: string[];
    conflictingDimensionIds: string[];
    inactiveAssertionIds: string[];
  };
  sourceIds: string[];
  notDetermined: string[];
  boundary: {
    syntheticExample: true;
    personalFactsAccepted: false;
    legalAdvice: false;
    filingOrSubmission: false;
    singleLabelSufficient: false;
  };
};
