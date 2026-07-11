// Candidate-only contract for observing public investigators and oversight
// institutions. It records institutional capacity and public procedure, never
// a person's private essence. The public framework contains official source
// doors but no investigation, action, response or relationship records.

import { z } from "zod";

const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();
const id = z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*$/);
const text = z.string().trim().min(1).max(4_000);
const shortText = z.string().trim().min(1).max(500);
const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "URL must use HTTPS");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "invalid calendar date");
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const nonEmptyText = z.array(shortText).min(1).max(20);

const organisationReferenceSchema = strictObject({
  datasetId: id,
  organisationId: id,
  referenceMethod: z.literal("exact-base-dataset-record-id"),
});

const documentReferenceSchema = strictObject({
  datasetId: id,
  documentId: id,
  locator: shortText,
  referenceMethod: z.literal("exact-base-dataset-record-id"),
  sourceBodyStored: z.literal(false),
});

const institutionalPrivacyReviewSchema = strictObject({
  scope: z.literal("processed-record"),
  organisationLevelOnly: z.literal(true),
  naturalPersonRecordsStored: z.literal(false),
  personalContactDataStored: z.literal(false),
  homeAddressDataStored: z.literal(false),
  personalBeliefDataStored: z.literal(false),
  personalityOrMotiveInferencePerformed: z.literal(false),
  fuzzyOrProbabilisticJoinPerformed: z.literal(false),
  freeTextReviewed: z.literal(true),
  status: z.literal("human-approved-for-candidate"),
  reviewedOn: date,
  assessmentNature: z.literal(
    "human-assertion-not-automated-semantic-or-legal-proof",
  ),
});

const relationTypeSchema = z.enum([
  "commissioned-by",
  "funded-by",
  "appointed-by",
  "sponsored-by",
  "overseen-by",
  "audited-by",
  "complaints-handled-by",
  "appealable-to",
  "reviewable-by",
  "reports-to",
  "refers-cases-to",
  "cooperates-with",
]);

const challengeRelationTypes = new Set<z.infer<typeof relationTypeSchema>>([
  "overseen-by",
  "audited-by",
  "complaints-handled-by",
  "appealable-to",
  "reviewable-by",
]);

export const observerAccountabilityRuntimeInvariants = [
  "all record IDs are dataset-wide unique and each collection is ASCII ID sorted",
  "all organisation and document references use a declared exact base dataset",
  "every observer on an engagement has a sourced challenge relation for that engagement or an engagement-specific unmapped-route gap",
  "gap engagement references, action engagement references and response action references resolve",
  "actions stay within the declared engagement period and use an outcome state compatible with the action type",
  "a challenge relation must be effective at the engagement accountability date and an unresolved gap must not be overdue",
  "nested organisation, relation, document and action references contain no duplicates",
  "empty commissioner, funder, method and output arrays carry explicit disclosure states; unknown or unpublished evidence creates a scoped gap",
  "an active disclosure gap cannot contradict a fully published, published-none or not-applicable state",
  "actions name exact declared-subject targets and referral destinations where the action type or substantive outcome requires them",
  "each action states whether its actor acts as an investigator or commissioner and that role resolves on the engagement",
  "corrections, retractions and withdrawn responses append, preserve institutional actor and capacity, and point to the earlier records they change",
  "privacy, action, response and gap dates do not claim knowledge after candidate generation",
] as const;

const institutionalRelationSchema = strictObject({
  id,
  fromOrganisation: organisationReferenceSchema,
  relationType: relationTypeSchema,
  toOrganisation: organisationReferenceSchema,
  directionMeaning: z.literal(
    "from-organisation-is-related-by-the-named-type-to-to-organisation",
  ),
  publicMeaning: text,
  controlInferred: z.literal(false),
  controlRelationsBelongInBaseDataset: z.literal(true),
  validFrom: date.nullable(),
  validTo: date.nullable(),
  sourceDocuments: z.array(documentReferenceSchema).min(1).max(20),
  privacyReview: institutionalPrivacyReviewSchema,
}).superRefine((value, context) => {
  if (
    value.validFrom !== null &&
    value.validTo !== null &&
    value.validTo < value.validFrom
  ) {
    context.addIssue({
      code: "custom",
      path: ["validTo"],
      message: "validTo must not precede validFrom",
    });
  }
  if (
    value.fromOrganisation.datasetId === value.toOrganisation.datasetId &&
    value.fromOrganisation.organisationId ===
      value.toOrganisation.organisationId
  ) {
    context.addIssue({
      code: "custom",
      path: ["toOrganisation"],
      message: "an institutional relation cannot point to itself",
    });
  }
});

const investigationEngagementSchema = strictObject({
  id,
  investigatorOrganisations: z.array(organisationReferenceSchema).min(1).max(20),
  subjectOrganisations: z.array(organisationReferenceSchema).min(1).max(100),
  commissioningOrganisations: z.array(organisationReferenceSchema).max(20),
  commissioningDocuments: z.array(documentReferenceSchema).max(20),
  commissioningDisclosureState: z.enum([
    "published",
    "published-none",
    "not-applicable",
    "not-published",
    "unknown",
  ]),
  fundingOrganisations: z.array(organisationReferenceSchema).max(20),
  fundingDocuments: z.array(documentReferenceSchema).max(20),
  fundingDisclosureState: z.enum([
    "published",
    "published-none",
    "not-applicable",
    "not-published",
    "unknown",
  ]),
  jurisdiction: shortText,
  status: z.enum([
    "announced",
    "open",
    "findings-published",
    "closed",
    "corrected",
    "withdrawn",
  ]),
  scope: text,
  period: strictObject({
    startDate: date.nullable(),
    endDate: date.nullable(),
    basis: shortText,
  }),
  mandateDocuments: z.array(documentReferenceSchema).min(1).max(20),
  methodDocuments: z.array(documentReferenceSchema).max(20),
  standardDocuments: z.array(documentReferenceSchema).max(20),
  outputDocuments: z.array(documentReferenceSchema).max(100),
  outputDisclosureDocuments: z.array(documentReferenceSchema).max(20),
  publishedMethods: z.array(shortText).max(20),
  evidenceSelectionRules: z.array(shortText).max(20),
  methodDisclosureState: z.enum([
    "published",
    "partly-published",
    "not-published",
    "unknown",
  ]),
  outputDisclosureState: z.enum([
    "published",
    "not-yet-published",
    "published-none",
    "not-applicable",
    "not-published",
    "unknown",
  ]),
  limitations: nonEmptyText,
  independenceStatus: z.enum([
    "statutory-independent",
    "institutionally-independent",
    "commissioned",
    "internal",
    "mixed",
    "not-stated",
  ]),
  independenceBasis: z.enum([
    "publisher-description",
    "statutory-structure",
    "taxsorted-classification",
    "not-stated",
  ]),
  independenceDocuments: z.array(documentReferenceSchema).max(20),
  publicProcedureUrl: httpsUrl,
  publicCorrectionUrl: httpsUrl,
  accountabilityRelationIds: z.array(id).max(30),
  observerEffectClaimed: z.literal(false),
  observerEffectBoundary: z.literal(
    "record-public-procedure-changes-only-never-infer-motive-or-causation",
  ),
  privacyReview: institutionalPrivacyReviewSchema,
}).superRefine((value, context) => {
  if (
    value.period.startDate !== null &&
    value.period.endDate !== null &&
    value.period.endDate < value.period.startDate
  ) {
    context.addIssue({
      code: "custom",
      path: ["period", "endDate"],
      message: "investigation period endDate must not precede startDate",
    });
  }
});

const investigationActionSchema = strictObject({
  id,
  engagementId: id,
  actorOrganisation: organisationReferenceSchema,
  actorCapacity: z.enum(["investigator", "commissioner"]),
  targetOrganisations: z.array(organisationReferenceSchema).max(100),
  destinationOrganisations: z.array(organisationReferenceSchema).max(20),
  actionType: z.enum([
    "opened",
    "scope-changed",
    "evidence-requested",
    "interviewed",
    "site-visited",
    "referred",
    "provisional-finding-published",
    "final-finding-published",
    "sanction-imposed",
    "report-published",
    "corrected",
    "retracted",
    "closed",
  ]),
  outcomeState: z.enum([
    "procedural-only",
    "allegation-not-determined",
    "no-determination",
    "no-breach-found",
    "breach-found",
    "decision-under-appeal",
    "final-subject-to-judicial-review",
    "corrected",
    "withdrawn",
  ]),
  occurredOn: date,
  normalisedDescription: text,
  verbatimTextStored: z.literal(false),
  normalisationMethod: z.literal("human-reviewed-faithful-paraphrase"),
  correctsActionIds: z.array(id).max(20),
  sourceDocuments: z.array(documentReferenceSchema).min(1).max(20),
  privacyReview: institutionalPrivacyReviewSchema,
});

const outcomesByAction = {
  opened: ["procedural-only"],
  "scope-changed": ["procedural-only"],
  "evidence-requested": ["procedural-only"],
  interviewed: ["procedural-only"],
  "site-visited": ["procedural-only"],
  referred: ["procedural-only"],
  "provisional-finding-published": ["allegation-not-determined"],
  "final-finding-published": [
    "no-determination",
    "no-breach-found",
    "breach-found",
    "decision-under-appeal",
    "final-subject-to-judicial-review",
  ],
  "sanction-imposed": [
    "breach-found",
    "decision-under-appeal",
    "final-subject-to-judicial-review",
  ],
  "report-published": [
    "procedural-only",
    "no-determination",
    "no-breach-found",
    "breach-found",
    "decision-under-appeal",
    "final-subject-to-judicial-review",
  ],
  corrected: ["corrected"],
  retracted: ["withdrawn"],
  closed: [
    "no-determination",
    "no-breach-found",
    "breach-found",
    "final-subject-to-judicial-review",
  ],
} as const satisfies Record<
  z.infer<typeof investigationActionSchema>["actionType"],
  readonly z.infer<typeof investigationActionSchema>["outcomeState"][]
>;

const institutionalResponseSchema = strictObject({
  id,
  engagementId: id,
  respondingOrganisation: organisationReferenceSchema,
  respondsToActionIds: z.array(id).min(1).max(20),
  stance: z.enum([
    "acknowledges",
    "accepts",
    "accepts-in-part",
    "disputes",
    "requests-correction",
    "appeals",
    "withdraws-earlier-response",
  ]),
  publishedOn: date,
  normalisedStatement: text,
  verbatimTextStored: z.literal(false),
  normalisationMethod: z.literal("human-reviewed-faithful-paraphrase"),
  supersedesResponseIds: z.array(id).max(20),
  sourceDocuments: z.array(documentReferenceSchema).min(1).max(20),
  privacyReview: institutionalPrivacyReviewSchema,
});

const coverageGapSchema = strictObject({
  id,
  gapType: z.enum([
    "observer-accountability-route-unmapped",
    "mandate-not-published",
    "method-not-published",
    "commissioner-not-published",
    "funding-not-published",
    "output-not-permanent",
    "output-not-published",
    "response-not-published",
    "source-rights-not-cleared",
  ]),
  affectedOrganisation: organisationReferenceSchema.nullable(),
  affectedEngagementId: id.nullable(),
  description: text,
  consequence: text,
  searchMethod: text,
  checkedDocuments: z.array(documentReferenceSchema).min(1).max(50),
  doesNotProveAbsence: z.literal(true),
  status: z.enum(["open", "under-review", "accepted-boundary", "resolved"]),
  observedOn: date,
  reviewAfter: date,
  privacyReview: institutionalPrivacyReviewSchema,
});

const baseDatasetReferenceSchema = strictObject({
  datasetId: id,
  schemaId: shortText,
  releaseReference: shortText,
  datasetDigest: sha256,
  recordResolverTemplate: shortText.refine(
    (value) =>
      value.startsWith("/v1/") &&
      value.endsWith("/{id}") &&
      !value.includes("?") &&
      !value.includes("#"),
    "recordResolverTemplate must be a relative /v1/.../{id} route without query or fragment",
  ),
});

const candidateBaseSchema = strictObject({
  schema: z.literal("taxsorted.uk.observer-accountability-candidate/1"),
  meta: strictObject({
    title: z.literal("UK observer accountability candidate extension"),
    status: z.literal("candidate-not-admitted"),
    jurisdiction: z.literal("United Kingdom"),
    generatedOn: date,
    baseDatasets: z.array(baseDatasetReferenceSchema).min(1).max(20),
    recordMeaning: z.literal(
      "public-institutional-capacity-and-procedure-not-person-profile",
    ),
  }),
  institutionalRelations: z.array(institutionalRelationSchema),
  investigationEngagements: z.array(investigationEngagementSchema),
  investigationActions: z.array(investigationActionSchema),
  institutionalResponses: z.array(institutionalResponseSchema),
  coverageGaps: z.array(coverageGapSchema),
});

type Candidate = z.infer<typeof candidateBaseSchema>;

function organisationKey(
  reference: z.infer<typeof organisationReferenceSchema>,
) {
  return `${reference.datasetId}/${reference.organisationId}`;
}

function addIssue(
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
) {
  context.addIssue({ code: "custom", path, message });
}

function validateCandidate(candidate: Candidate, context: z.RefinementCtx) {
  const collectionEntries = [
    ["institutionalRelations", candidate.institutionalRelations],
    ["investigationEngagements", candidate.investigationEngagements],
    ["investigationActions", candidate.investigationActions],
    ["institutionalResponses", candidate.institutionalResponses],
    ["coverageGaps", candidate.coverageGaps],
  ] as const;
  const globalIds = new Map<string, string>();
  const requireUnique = <T>(
    values: readonly T[],
    key: (value: T) => string,
    path: PropertyKey[],
    label: string,
  ) => {
    const seen = new Set<string>();
    for (const [index, value] of values.entries()) {
      const valueKey = key(value);
      if (seen.has(valueKey)) {
        addIssue(context, [...path, index], `duplicate ${label}: ${valueKey}`);
      }
      seen.add(valueKey);
    }
  };
  const documentKey = (reference: z.infer<typeof documentReferenceSchema>) =>
    `${reference.datasetId}/${reference.documentId}/${reference.locator}`;

  for (const [index, baseDataset] of candidate.meta.baseDatasets.entries()) {
    if (
      index > 0 &&
      candidate.meta.baseDatasets[index - 1].datasetId >= baseDataset.datasetId
    ) {
      addIssue(
        context,
        ["meta", "baseDatasets", index, "datasetId"],
        "baseDatasets must be unique and sorted by ASCII datasetId ascending",
      );
    }
  }

  for (const [collection, records] of collectionEntries) {
    for (const [index, record] of records.entries()) {
      if (index > 0 && records[index - 1].id >= record.id) {
        addIssue(
          context,
          [collection, index, "id"],
          `${collection} must be sorted by ASCII id ascending`,
        );
      }
      const owner = globalIds.get(record.id);
      if (owner) {
        addIssue(
          context,
          [collection, index, "id"],
          `record id already used by ${owner}: ${record.id}`,
        );
      } else {
        globalIds.set(record.id, collection);
      }
    }
  }

  const baseDatasetIds = new Set(
    candidate.meta.baseDatasets.map((record) => record.datasetId),
  );
  const references: Array<{
    reference: z.infer<typeof organisationReferenceSchema>;
    path: PropertyKey[];
  }> = [];
  for (const [index, relation] of candidate.institutionalRelations.entries()) {
    references.push(
      {
        reference: relation.fromOrganisation,
        path: ["institutionalRelations", index, "fromOrganisation"],
      },
      {
        reference: relation.toOrganisation,
        path: ["institutionalRelations", index, "toOrganisation"],
      },
    );
  }
  for (const [index, engagement] of candidate.investigationEngagements.entries()) {
    for (const [field, values] of [
      ["investigatorOrganisations", engagement.investigatorOrganisations],
      ["subjectOrganisations", engagement.subjectOrganisations],
      ["commissioningOrganisations", engagement.commissioningOrganisations],
      ["fundingOrganisations", engagement.fundingOrganisations],
    ] as const) {
      requireUnique(
        values,
        organisationKey,
        ["investigationEngagements", index, field],
        "organisation reference",
      );
      for (const [referenceIndex, reference] of values.entries()) {
        references.push({
          reference,
          path: ["investigationEngagements", index, field, referenceIndex],
        });
      }
    }
  }
  for (const [index, action] of candidate.investigationActions.entries()) {
    requireUnique(
      action.correctsActionIds,
      (value) => value,
      ["investigationActions", index, "correctsActionIds"],
      "corrected action reference",
    );
    references.push({
      reference: action.actorOrganisation,
      path: ["investigationActions", index, "actorOrganisation"],
    });
    for (const [field, values] of [
      ["targetOrganisations", action.targetOrganisations],
      ["destinationOrganisations", action.destinationOrganisations],
    ] as const) {
      requireUnique(
        values,
        organisationKey,
        ["investigationActions", index, field],
        "organisation reference",
      );
      values.forEach((reference, referenceIndex) =>
        references.push({
          reference,
          path: ["investigationActions", index, field, referenceIndex],
        }),
      );
    }
  }
  for (const [index, response] of candidate.institutionalResponses.entries()) {
    references.push({
      reference: response.respondingOrganisation,
      path: ["institutionalResponses", index, "respondingOrganisation"],
    });
  }
  for (const [index, gap] of candidate.coverageGaps.entries()) {
    if (gap.affectedOrganisation !== null) {
      references.push({
        reference: gap.affectedOrganisation,
        path: ["coverageGaps", index, "affectedOrganisation"],
      });
    }
  }
  for (const { reference, path } of references) {
    if (!baseDatasetIds.has(reference.datasetId)) {
      addIssue(
        context,
        [...path, "datasetId"],
        `organisation reference uses undeclared base dataset: ${reference.datasetId}`,
      );
    }
  }

  const documentReferences: Array<{
    reference: z.infer<typeof documentReferenceSchema>;
    path: PropertyKey[];
  }> = [];
  for (const [index, relation] of candidate.institutionalRelations.entries()) {
    requireUnique(
      relation.sourceDocuments,
      documentKey,
      ["institutionalRelations", index, "sourceDocuments"],
      "source document reference",
    );
    relation.sourceDocuments.forEach((reference, referenceIndex) =>
      documentReferences.push({
        reference,
        path: ["institutionalRelations", index, "sourceDocuments", referenceIndex],
      }),
    );
  }
  for (const [index, engagement] of candidate.investigationEngagements.entries()) {
    requireUnique(
      engagement.accountabilityRelationIds,
      (value) => value,
      ["investigationEngagements", index, "accountabilityRelationIds"],
      "accountability relation reference",
    );
    for (const [field, values] of [
      ["commissioningDocuments", engagement.commissioningDocuments],
      ["fundingDocuments", engagement.fundingDocuments],
      ["mandateDocuments", engagement.mandateDocuments],
      ["methodDocuments", engagement.methodDocuments],
      ["standardDocuments", engagement.standardDocuments],
      ["outputDocuments", engagement.outputDocuments],
      ["outputDisclosureDocuments", engagement.outputDisclosureDocuments],
      ["independenceDocuments", engagement.independenceDocuments],
    ] as const) {
      requireUnique(
        values,
        documentKey,
        ["investigationEngagements", index, field],
        "source document reference",
      );
      values.forEach((reference, referenceIndex) =>
        documentReferences.push({
          reference,
          path: ["investigationEngagements", index, field, referenceIndex],
        }),
      );
    }
  }
  for (const [index, action] of candidate.investigationActions.entries()) {
    requireUnique(
      action.sourceDocuments,
      documentKey,
      ["investigationActions", index, "sourceDocuments"],
      "source document reference",
    );
    action.sourceDocuments.forEach((reference, referenceIndex) =>
      documentReferences.push({
        reference,
        path: ["investigationActions", index, "sourceDocuments", referenceIndex],
      }),
    );
  }
  for (const [index, response] of candidate.institutionalResponses.entries()) {
    requireUnique(
      response.supersedesResponseIds,
      (value) => value,
      ["institutionalResponses", index, "supersedesResponseIds"],
      "superseded response reference",
    );
    requireUnique(
      response.respondsToActionIds,
      (value) => value,
      ["institutionalResponses", index, "respondsToActionIds"],
      "investigation action reference",
    );
    requireUnique(
      response.sourceDocuments,
      documentKey,
      ["institutionalResponses", index, "sourceDocuments"],
      "source document reference",
    );
    response.sourceDocuments.forEach((reference, referenceIndex) =>
      documentReferences.push({
        reference,
        path: ["institutionalResponses", index, "sourceDocuments", referenceIndex],
      }),
    );
  }
  for (const [index, gap] of candidate.coverageGaps.entries()) {
    requireUnique(
      gap.checkedDocuments,
      documentKey,
      ["coverageGaps", index, "checkedDocuments"],
      "checked document reference",
    );
    gap.checkedDocuments.forEach((reference, referenceIndex) =>
      documentReferences.push({
        reference,
        path: ["coverageGaps", index, "checkedDocuments", referenceIndex],
      }),
    );
  }
  for (const { reference, path } of documentReferences) {
    if (!baseDatasetIds.has(reference.datasetId)) {
      addIssue(
        context,
        [...path, "datasetId"],
        `document reference uses undeclared base dataset: ${reference.datasetId}`,
      );
    }
  }

  const generatedOn = candidate.meta.generatedOn;
  for (const [collection, records] of collectionEntries) {
    for (const [index, record] of records.entries()) {
      if (record.privacyReview.reviewedOn > generatedOn) {
        addIssue(
          context,
          [collection, index, "privacyReview", "reviewedOn"],
          "privacy review cannot be after candidate meta.generatedOn",
        );
      }
    }
  }
  for (const [index, action] of candidate.investigationActions.entries()) {
    if (action.occurredOn > generatedOn) {
      addIssue(
        context,
        ["investigationActions", index, "occurredOn"],
        "investigation action cannot occur after candidate meta.generatedOn",
      );
    }
  }
  for (const [index, response] of candidate.institutionalResponses.entries()) {
    if (response.publishedOn > generatedOn) {
      addIssue(
        context,
        ["institutionalResponses", index, "publishedOn"],
        "institutional response cannot be published after candidate meta.generatedOn",
      );
    }
  }
  for (const [index, gap] of candidate.coverageGaps.entries()) {
    if (gap.observedOn > generatedOn) {
      addIssue(
        context,
        ["coverageGaps", index, "observedOn"],
        "coverage gap cannot be observed after candidate meta.generatedOn",
      );
    }
    if (gap.reviewAfter < gap.observedOn) {
      addIssue(
        context,
        ["coverageGaps", index, "reviewAfter"],
        "coverage gap reviewAfter must not precede observedOn",
      );
    }
    if (gap.status !== "resolved" && gap.reviewAfter < generatedOn) {
      addIssue(
        context,
        ["coverageGaps", index, "reviewAfter"],
        "an unresolved coverage gap cannot be overdue at candidate generation",
      );
    }
  }

  const relations = new Map(
    candidate.institutionalRelations.map((record) => [record.id, record]),
  );
  const engagements = new Map(
    candidate.investigationEngagements.map((record) => [record.id, record]),
  );
  const actions = new Map(
    candidate.investigationActions.map((record) => [record.id, record]),
  );
  const responses = new Map(
    candidate.institutionalResponses.map((record) => [record.id, record]),
  );
  for (const [index, gap] of candidate.coverageGaps.entries()) {
    const gapEngagement =
      gap.affectedEngagementId === null
        ? undefined
        : engagements.get(gap.affectedEngagementId);
    if (gap.affectedEngagementId !== null && !gapEngagement) {
      addIssue(
        context,
        ["coverageGaps", index, "affectedEngagementId"],
        `unknown investigation engagement: ${gap.affectedEngagementId}`,
      );
    }
    if (gap.gapType === "observer-accountability-route-unmapped") {
      if (gap.affectedEngagementId === null) {
        addIssue(
          context,
          ["coverageGaps", index, "affectedEngagementId"],
          "an unmapped observer-accountability route gap must name one engagement",
        );
      }
      if (gap.affectedOrganisation === null) {
        addIssue(
          context,
          ["coverageGaps", index, "affectedOrganisation"],
          "an unmapped observer-accountability route gap must name one observer organisation",
        );
      } else if (
        gapEngagement &&
        !gapEngagement.investigatorOrganisations
          .map(organisationKey)
          .includes(organisationKey(gap.affectedOrganisation))
      ) {
        addIssue(
          context,
          ["coverageGaps", index, "affectedOrganisation"],
          "an unmapped observer-accountability route gap must name an observer on its engagement",
        );
      }
    }
  }
  const accountabilityGaps = new Set(
    candidate.coverageGaps
      .filter(
        (record) =>
          record.gapType === "observer-accountability-route-unmapped" &&
          record.status !== "resolved" &&
          record.reviewAfter >= generatedOn &&
          record.affectedOrganisation !== null &&
          record.affectedEngagementId !== null,
      )
      .map(
        (record) =>
          `${record.affectedEngagementId}\u0000${organisationKey(record.affectedOrganisation!)}`,
      ),
  );
  const activeGapKeys = new Set(
    candidate.coverageGaps
      .filter(
        (record) =>
          record.status !== "resolved" &&
          record.reviewAfter >= generatedOn &&
          record.affectedEngagementId !== null,
      )
      .map((record) => `${record.affectedEngagementId}\u0000${record.gapType}`),
  );

  for (const [index, engagement] of candidate.investigationEngagements.entries()) {
    const accountabilityDate = engagement.period.endDate ?? generatedOn;
    const requireDisclosureState = (
      state: string,
      evidenceCount: number,
      evidenceStates: readonly string[],
      path: PropertyKey[],
      label: string,
    ) => {
      const shouldHaveEvidence = evidenceStates.includes(state);
      if (shouldHaveEvidence && evidenceCount === 0) {
        addIssue(
          context,
          path,
          `${label} disclosure state ${state} needs published evidence`,
        );
      }
      if (!shouldHaveEvidence && evidenceCount > 0) {
        addIssue(
          context,
          path,
          `${label} disclosure state ${state} cannot carry published values`,
        );
      }
    };
    requireDisclosureState(
      engagement.commissioningDisclosureState,
      engagement.commissioningOrganisations.length,
      ["published"],
      ["investigationEngagements", index, "commissioningDisclosureState"],
      "commissioning",
    );
    requireDisclosureState(
      engagement.commissioningDisclosureState,
      engagement.commissioningDocuments.length,
      ["published", "published-none", "not-applicable"],
      ["investigationEngagements", index, "commissioningDocuments"],
      "commissioning-document",
    );
    requireDisclosureState(
      engagement.fundingDisclosureState,
      engagement.fundingOrganisations.length,
      ["published"],
      ["investigationEngagements", index, "fundingDisclosureState"],
      "funding",
    );
    requireDisclosureState(
      engagement.fundingDisclosureState,
      engagement.fundingDocuments.length,
      ["published", "published-none", "not-applicable"],
      ["investigationEngagements", index, "fundingDocuments"],
      "funding-document",
    );
    requireDisclosureState(
      engagement.methodDisclosureState,
      engagement.methodDocuments.length +
        engagement.publishedMethods.length +
        engagement.evidenceSelectionRules.length,
      ["published", "partly-published"],
      ["investigationEngagements", index, "methodDisclosureState"],
      "method",
    );
    requireDisclosureState(
      engagement.outputDisclosureState,
      engagement.outputDocuments.length,
      ["published"],
      ["investigationEngagements", index, "outputDisclosureState"],
      "output",
    );
    requireDisclosureState(
      engagement.outputDisclosureState,
      engagement.outputDisclosureDocuments.length,
      ["not-yet-published", "published-none", "not-applicable"],
      ["investigationEngagements", index, "outputDisclosureDocuments"],
      "output-disclosure",
    );
    if (
      (engagement.independenceStatus === "not-stated") !==
      (engagement.independenceBasis === "not-stated")
    ) {
      addIssue(
        context,
        ["investigationEngagements", index, "independenceBasis"],
        "not-stated independence status and basis must be used together",
      );
    }
    if (
      (engagement.independenceBasis === "not-stated") !==
      (engagement.independenceDocuments.length === 0)
    ) {
      addIssue(
        context,
        ["investigationEngagements", index, "independenceDocuments"],
        engagement.independenceBasis === "not-stated"
          ? "not-stated independence cannot carry supporting documents"
          : "a stated independence basis needs at least one supporting document",
      );
    }
    for (const [state, missingStates, gapType, field] of [
      [
        engagement.commissioningDisclosureState,
        ["not-published", "unknown"],
        "commissioner-not-published",
        "commissioningDisclosureState",
      ],
      [
        engagement.fundingDisclosureState,
        ["not-published", "unknown"],
        "funding-not-published",
        "fundingDisclosureState",
      ],
      [
        engagement.methodDisclosureState,
        ["partly-published", "not-published", "unknown"],
        "method-not-published",
        "methodDisclosureState",
      ],
      [
        engagement.outputDisclosureState,
        ["not-published", "unknown"],
        "output-not-published",
        "outputDisclosureState",
      ],
    ] as const) {
      const gapKey = `${engagement.id}\u0000${gapType}`;
      const stateNeedsGap = (missingStates as readonly string[]).includes(state);
      const hasActiveGap = activeGapKeys.has(gapKey);
      if (stateNeedsGap && !hasActiveGap) {
        addIssue(
          context,
          ["investigationEngagements", index, field],
          `${state} requires an active ${gapType} coverage gap for this engagement`,
        );
      }
      if (!stateNeedsGap && hasActiveGap) {
        addIssue(
          context,
          ["investigationEngagements", index, field],
          `${state} contradicts an active ${gapType} coverage gap for this engagement`,
        );
      }
    }
    const namedRelations = engagement.accountabilityRelationIds.flatMap(
      (relationId, relationIndex) => {
        const relation = relations.get(relationId);
        if (!relation) {
          addIssue(
            context,
            [
              "investigationEngagements",
              index,
              "accountabilityRelationIds",
              relationIndex,
            ],
            `unknown institutional relation: ${relationId}`,
          );
          return [];
        }
        if (!challengeRelationTypes.has(relation.relationType)) {
          addIssue(
            context,
            [
              "investigationEngagements",
              index,
              "accountabilityRelationIds",
              relationIndex,
            ],
            `${relation.relationType} is not an accountability or challenge route`,
          );
        }
        return [relation];
      },
    );

    for (const [investigatorIndex, investigator] of
      engagement.investigatorOrganisations.entries()) {
      const key = organisationKey(investigator);
      const hasRoute = namedRelations.some(
        (relation) =>
          organisationKey(relation.fromOrganisation) === key &&
          challengeRelationTypes.has(relation.relationType) &&
          (relation.validFrom === null || relation.validFrom <= accountabilityDate) &&
          (relation.validTo === null || relation.validTo >= accountabilityDate),
      );
      if (
        !hasRoute &&
        !accountabilityGaps.has(`${engagement.id}\u0000${key}`)
      ) {
        addIssue(
          context,
          [
            "investigationEngagements",
            index,
            "investigatorOrganisations",
            investigatorIndex,
          ],
          "every observer needs a sourced accountability route or an explicit unmapped-route coverage gap",
        );
      }
    }
  }

  for (const [index, action] of candidate.investigationActions.entries()) {
    const engagement = engagements.get(action.engagementId);
    if (!engagement) {
      addIssue(
        context,
        ["investigationActions", index, "engagementId"],
        `unknown investigation engagement: ${action.engagementId}`,
      );
      continue;
    }
    const isCorrection =
      action.actionType === "corrected" || action.actionType === "retracted";
    if (isCorrection !== (action.correctsActionIds.length > 0)) {
      addIssue(
        context,
        ["investigationActions", index, "correctsActionIds"],
        isCorrection
          ? "a correction or retraction must point to at least one earlier action"
          : "only a correction or retraction may carry correctsActionIds",
      );
    }
    for (const [correctedIndex, correctedId] of action.correctsActionIds.entries()) {
      const corrected = actions.get(correctedId);
      if (!corrected) {
        addIssue(
          context,
          ["investigationActions", index, "correctsActionIds", correctedIndex],
          `unknown investigation action: ${correctedId}`,
        );
      } else if (corrected.id === action.id) {
        addIssue(
          context,
          ["investigationActions", index, "correctsActionIds", correctedIndex],
          "an action cannot correct or retract itself",
        );
      } else if (corrected.engagementId !== action.engagementId) {
        addIssue(
          context,
          ["investigationActions", index, "correctsActionIds", correctedIndex],
          "a corrected action must belong to the same engagement",
        );
      } else if (
        organisationKey(corrected.actorOrganisation) !==
        organisationKey(action.actorOrganisation)
      ) {
        addIssue(
          context,
          ["investigationActions", index, "correctsActionIds", correctedIndex],
          "only the same institutional actor may correct or retract its earlier action",
        );
      } else if (corrected.actorCapacity !== action.actorCapacity) {
        addIssue(
          context,
          ["investigationActions", index, "correctsActionIds", correctedIndex],
          "a correction or retraction must preserve the earlier action actor capacity",
        );
      } else if (
        `${corrected.occurredOn}\u0000${corrected.id}` >=
        `${action.occurredOn}\u0000${action.id}`
      ) {
        addIssue(
          context,
          ["investigationActions", index, "correctsActionIds", correctedIndex],
          "a correction must point backward by occurredOn then ASCII id",
        );
      }
    }
    const allowedOutcomes = outcomesByAction[action.actionType] as readonly string[];
    if (!allowedOutcomes.includes(action.outcomeState)) {
      addIssue(
        context,
        ["investigationActions", index, "outcomeState"],
        `${action.actionType} cannot use outcome state ${action.outcomeState}`,
      );
    }
    const targetRequiredActionTypes = new Set([
      "evidence-requested",
      "interviewed",
      "site-visited",
      "referred",
      "provisional-finding-published",
      "final-finding-published",
      "sanction-imposed",
    ]);
    const substantiveTargetOutcomes = new Set([
      "no-determination",
      "no-breach-found",
      "breach-found",
      "decision-under-appeal",
      "final-subject-to-judicial-review",
    ]);
    const actionRequiresTargets =
      targetRequiredActionTypes.has(action.actionType) ||
      substantiveTargetOutcomes.has(action.outcomeState);
    if (
      actionRequiresTargets &&
      action.targetOrganisations.length === 0
    ) {
      addIssue(
        context,
        ["investigationActions", index, "targetOrganisations"],
        `${action.actionType} must name at least one exact institutional target`,
      );
    }
    if (
      !actionRequiresTargets &&
      action.targetOrganisations.length > 0
    ) {
      addIssue(
        context,
        ["investigationActions", index, "targetOrganisations"],
        `${action.actionType} uses the engagement subjects or correction links and cannot carry separate targets`,
      );
    }
    if (
      action.actionType === "referred" &&
      action.destinationOrganisations.length === 0
    ) {
      addIssue(
        context,
        ["investigationActions", index, "destinationOrganisations"],
        "a referral must name at least one exact institutional destination",
      );
    }
    if (
      action.actionType !== "referred" &&
      action.destinationOrganisations.length > 0
    ) {
      addIssue(
        context,
        ["investigationActions", index, "destinationOrganisations"],
        "only a referral action may name destination organisations",
      );
    }
    const subjectKeys = new Set(
      engagement.subjectOrganisations.map(organisationKey),
    );
    for (const [targetIndex, target] of action.targetOrganisations.entries()) {
      if (!subjectKeys.has(organisationKey(target))) {
        addIssue(
          context,
          ["investigationActions", index, "targetOrganisations", targetIndex],
          `${action.actionType} targets must be declared subject organisations`,
        );
      }
    }
    if (
      engagement.period.startDate !== null &&
      action.occurredOn < engagement.period.startDate
    ) {
      addIssue(
        context,
        ["investigationActions", index, "occurredOn"],
        "an investigation action cannot precede its engagement period",
      );
    }
    if (
      engagement.period.endDate !== null &&
      action.occurredOn > engagement.period.endDate
    ) {
      addIssue(
        context,
        ["investigationActions", index, "occurredOn"],
        "an investigation action cannot follow its engagement period",
      );
    }
    const actorsForCapacity =
      action.actorCapacity === "investigator"
        ? engagement.investigatorOrganisations
        : engagement.commissioningOrganisations;
    if (
      !actorsForCapacity
        .map(organisationKey)
        .includes(organisationKey(action.actorOrganisation))
    ) {
      addIssue(
        context,
        ["investigationActions", index, "actorCapacity"],
        `the action actor must be a declared ${action.actorCapacity} organisation on its engagement`,
      );
    }
  }

  for (const [index, response] of candidate.institutionalResponses.entries()) {
    const engagement = engagements.get(response.engagementId);
    if (!engagement) {
      addIssue(
        context,
        ["institutionalResponses", index, "engagementId"],
        `unknown investigation engagement: ${response.engagementId}`,
      );
      continue;
    }
    if (
      response.stance === "withdraws-earlier-response" &&
      response.supersedesResponseIds.length === 0
    ) {
      addIssue(
        context,
        ["institutionalResponses", index, "supersedesResponseIds"],
        "a withdrawn response must point to the earlier response",
      );
    }
    for (const [supersededIndex, supersededId] of
      response.supersedesResponseIds.entries()) {
      const superseded = responses.get(supersededId);
      if (!superseded) {
        addIssue(
          context,
          [
            "institutionalResponses",
            index,
            "supersedesResponseIds",
            supersededIndex,
          ],
          `unknown institutional response: ${supersededId}`,
        );
      } else if (superseded.id === response.id) {
        addIssue(
          context,
          [
            "institutionalResponses",
            index,
            "supersedesResponseIds",
            supersededIndex,
          ],
          "an institutional response cannot supersede itself",
        );
      } else if (superseded.engagementId !== response.engagementId) {
        addIssue(
          context,
          [
            "institutionalResponses",
            index,
            "supersedesResponseIds",
            supersededIndex,
          ],
          "a superseded response must belong to the same engagement",
        );
      } else if (
        organisationKey(superseded.respondingOrganisation) !==
        organisationKey(response.respondingOrganisation)
      ) {
        addIssue(
          context,
          [
            "institutionalResponses",
            index,
            "supersedesResponseIds",
            supersededIndex,
          ],
          "only the same responding organisation may supersede its earlier response",
        );
      } else if (
        `${superseded.publishedOn}\u0000${superseded.id}` >=
        `${response.publishedOn}\u0000${response.id}`
      ) {
        addIssue(
          context,
          [
            "institutionalResponses",
            index,
            "supersedesResponseIds",
            supersededIndex,
          ],
          "a response must supersede backward by publishedOn then ASCII id",
        );
      }
    }
    if (
      !engagement.subjectOrganisations
        .map(organisationKey)
        .includes(organisationKey(response.respondingOrganisation))
    ) {
      addIssue(
        context,
        ["institutionalResponses", index, "respondingOrganisation"],
        "an institutional response must come from a declared subject organisation",
      );
    }
    for (const [actionIndex, actionId] of response.respondsToActionIds.entries()) {
      const action = actions.get(actionId);
      if (!action) {
        addIssue(
          context,
          ["institutionalResponses", index, "respondsToActionIds", actionIndex],
          `unknown investigation action: ${actionId}`,
        );
      } else if (action.engagementId !== response.engagementId) {
        addIssue(
          context,
          ["institutionalResponses", index, "respondsToActionIds", actionIndex],
          "a response and its action must belong to the same engagement",
        );
      } else if (response.publishedOn < action.occurredOn) {
        addIssue(
          context,
          ["institutionalResponses", index, "publishedOn"],
          "an institutional response cannot be published before the action it answers",
        );
      }
    }
  }
}

export const ukObserverAccountabilityCandidateSchema =
  candidateBaseSchema.superRefine(validateCandidate);

export type UkObserverAccountabilityCandidate = z.infer<
  typeof ukObserverAccountabilityCandidateSchema
>;

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

export const ukObserverAccountabilitySchemaDocument = deepFreeze({
  ...z.toJSONSchema(ukObserverAccountabilityCandidateSchema),
  $id: "https://api.taxsorted.io/v1/accountability/uk/schema",
  title: "UK observer accountability candidate extension",
  description:
    "Structural candidate shape for institution-level investigation relations, engagements, actions, responses and gaps. Cross-record and semantic rules require the runtime validator; neither layer is publication admission.",
  "x-taxsorted-validation-scope": {
    jsonSchema: "structural-shape-only",
    runtimeSemanticValidationRequired: true,
    runtimeValidatorSource:
      "https://github.com/cambridgetcg/taxsorted.io/blob/main/api/src/uk-observer-accountability.ts",
    copyableValidationCommand:
      "npm --prefix api run validate:observer-accountability-candidate -- <candidate.json>",
    externalChecksStillRequired:
      "Base-record existence at the pinned release, source meaning, source rights, human review, legal basis and operational publication approval remain external checks.",
  },
  "x-taxsorted-runtime-invariants": observerAccountabilityRuntimeInvariants,
});

const officialDoors = [
  {
    id: "hmrc-compliance-checks",
    system: "tax",
    publisher: "HM Revenue & Customs",
    title: "HMRC compliance checks: help and support",
    url: "https://www.gov.uk/guidance/hmrc-compliance-checks-help-and-support",
    letsYouInspect:
      "How a compliance check works and the ordinary routes for review, appeal and alternative dispute resolution.",
  },
  {
    id: "hmrc-criminal-investigation",
    system: "tax",
    publisher: "HM Revenue & Customs",
    title: "HMRC criminal investigation powers and safeguards",
    url: "https://www.gov.uk/government/publications/criminal-investigation/criminal-investigation",
    letsYouInspect:
      "HMRC's published criminal-investigation remit, judicial warrants and orders, authorised roles, civil/criminal separation, independent prosecution and scope-specific oversight.",
  },
  {
    id: "hmrc-service-complaints",
    system: "tax",
    publisher: "HM Revenue & Customs",
    title: "Complain about HMRC",
    url: "https://www.gov.uk/complain-about-hmrc",
    letsYouInspect:
      "The separation between a service complaint and a legal appeal, including HMRC's two review tiers.",
  },
  {
    id: "adjudicator-role",
    system: "tax",
    publisher: "The Adjudicator's Office and HM Revenue & Customs",
    title: "The role of the Adjudicator",
    url: "https://www.gov.uk/guidance/the-role-of-the-adjudicator",
    letsYouInspect:
      "The external complaint-review lane after HMRC or the Valuation Office Agency has completed both internal reviews.",
  },
  {
    id: "adjudicator-service-structure",
    system: "tax",
    publisher: "The Adjudicator's Office, HM Revenue & Customs and the Valuation Office Agency",
    title: "Adjudicator's Office service level agreement",
    url: "https://www.gov.uk/government/publications/adjudicators-office-service-level-agreement-with-hmrc-and-voa/service-level-agreement-for-the-provision-of-complaints-adjudication-services-for-hm-revenue-and-customs-and-valuation-office-agency-by-the-adjudicato",
    letsYouInspect:
      "The distinction between the Adjudicator's personal independence and the office's staffing, funding, premises and legal-entity relationship with HMRC.",
  },
  {
    id: "tax-tribunal-appeal",
    system: "tax",
    publisher: "HM Courts & Tribunals Service",
    title: "How to appeal to the First-tier Tax Tribunal",
    url: "https://www.gov.uk/government/publications/appeal-to-the-tax-chamber-of-the-first-tier-tribunal-t242/how-to-appeal-to-the-first-tier-tax-tribunal",
    letsYouInspect:
      "Which tax decisions the independent tribunal can hear, its process and the distinction between an appeal and a conduct complaint.",
  },
  {
    id: "charity-statutory-inquiries",
    system: "charities",
    publisher: "The Charity Commission",
    title: "Statutory inquiries into charities",
    url: "https://www.gov.uk/government/publications/statutory-inquiries-into-charities-guidance-for-charities-cc46/statutory-inquiries-into-charities-guidance-for-charities",
    letsYouInspect:
      "The Commission's inquiry purpose, powers, procedural duties, decision review and tribunal challenge routes.",
  },
  {
    id: "charity-commission-complaints",
    system: "charities",
    publisher: "The Charity Commission",
    title: "Charity Commission complaints procedure",
    url: "https://www.gov.uk/government/organisations/charity-commission/about/complaints-procedure",
    letsYouInspect:
      "How to challenge service and conduct, what the complaint team cannot decide, and the route to the Ombudsman.",
  },
  {
    id: "charity-tribunal-appeal",
    system: "charities",
    publisher: "HM Courts & Tribunals Service",
    title: "Appeal against a Charity Commission decision",
    url: "https://www.gov.uk/guidance/appeal-against-a-charity-commission-decision-about-your-charity",
    letsYouInspect:
      "Which Commission decisions may be appealed or reviewed by the General Regulatory Chamber and the ordinary time limit.",
  },
  {
    id: "nao-governance",
    system: "public-money",
    publisher: "National Audit Office",
    title: "NAO governance and transparency",
    url: "https://www.nao.org.uk/about-us/governance/",
    letsYouInspect:
      "Who oversees the public spending watchdog, how its own accounts are externally audited, and where its independence sits.",
  },
  {
    id: "phso-role",
    system: "complaints",
    publisher: "Parliamentary and Health Service Ombudsman",
    title: "Who the Ombudsman is",
    url: "https://www.ombudsman.org.uk/about-us/who-we-are",
    letsYouInspect:
      "The Ombudsman's complaint-review role and its institutional relationship with Parliament.",
  },
  {
    id: "phso-own-review-route",
    system: "complaints",
    publisher: "Parliamentary and Health Service Ombudsman",
    title: "Feedback about the Ombudsman's service",
    url: "https://www.ombudsman.org.uk/about-us/feedback-about-our-service",
    letsYouInspect:
      "How to raise feedback about PHSO service and the exceptional independent review boundary for serious injustice or public-interest concerns, while preserving the separate judicial-review route.",
  },
  {
    id: "electoral-investigation-method",
    system: "politics",
    publisher: "Electoral Commission",
    title: "How Electoral Commission investigations work",
    url: "https://www.electoralcommission.org.uk/political-registration-and-regulation/our-enforcement-work/investigations/how-investigations-work",
    letsYouInspect:
      "Opening tests, evidence gathering, decision separation, outcome states, sanctions, publication and appeal.",
  },
  {
    id: "electoral-closed-investigations",
    system: "politics",
    publisher: "Electoral Commission",
    title: "Closed Electoral Commission investigations",
    url: "https://www.electoralcommission.org.uk/political-registration-and-regulation/our-enforcement-work/investigations",
    letsYouInspect:
      "The Commission's published subjects, suspected offences, determinations, sanctions and reasons for recently closed work.",
  },
  {
    id: "electoral-speakers-committee",
    system: "politics",
    publisher: "UK Parliament",
    title: "Speaker's Committee on the Electoral Commission",
    url: "https://committees.parliament.uk/committee/144/speakers-committee-on-the-electoral-commission/role/",
    letsYouInspect:
      "The statutory parliamentary body that scrutinises Electoral Commission estimates, plans and appointments without becoming its case decision-maker.",
  },
  {
    id: "ico-public-actions",
    system: "information-rights",
    publisher: "Information Commissioner's Office",
    title: "ICO action taken",
    url: "https://ico.org.uk/action-weve-taken/",
    letsYouInspect:
      "Published enforcement, audits, decision notices, complaint trends, investigations and fine recovery.",
  },
  {
    id: "ico-complaints-about-ico",
    system: "information-rights",
    publisher: "Information Commissioner's Office",
    title: "Complain about the ICO",
    url: "https://ico.org.uk/make-a-complaint/complaints-and-compliments-about-us/complain-about-us/",
    letsYouInspect:
      "Service complaints, tribunal appeal boundaries, Ombudsman review and judicial-review routes for the regulator itself.",
  },
  {
    id: "sia-public-body-review",
    system: "private-investigation",
    publisher: "Home Office",
    title: "Security Industry Authority public body review 2025",
    url: "https://www.gov.uk/government/publications/security-industry-authority-public-body-review-2025/security-industry-authority-public-body-review-2025",
    letsYouInspect:
      "The review's scope, method, findings and limits, alongside SIA mandate, Home Office sponsorship, regulated activities, qualifications, enforcement, funding and accountability arrangements as examined in 2025.",
  },
  {
    id: "sia-activity-based-licensing-guidance",
    system: "private-investigation",
    publisher: "Security Industry Authority",
    title: "Find out if you need an SIA licence",
    url: "https://www.gov.uk/guidance/find-out-if-you-need-an-sia-licence",
    letsYouInspect:
      "The regulator's current activity-based licensing list. TaxSorted infers from that published list that private investigation is not itself named; other laws and activity-specific rules still apply.",
  },
] as const;

export const ukObserverAccountabilityFramework = deepFreeze({
  schema: "taxsorted.uk.observer-accountability-framework/1",
  id: "uk-observer-accountability",
  title: "Watching the watchers",
  status: "schema-only-not-admitted",
  reviewedOn: "2026-07-11",
  reviewAfter: "2026-10-11",
  purpose:
    "Make public investigation power inspectable without turning investigators or subjects into people dossiers.",
  principle: {
    name: "the-observer-is-also-observed",
    operationalMeaning:
      "An investigator is not an invisible eye outside the graph. Its public identity, mandate, commissioning, funding, method, evidence choices, limits, words, actions, corrections and challenge routes are themselves sourced public acts.",
    notAMetaphysicalClaim:
      "The investigator role and investigated role remain analytically distinct, even when one institution investigates internally. This framework does not claim literal oneness, mind-reading or motive detection.",
    observerEffectBoundary:
      "Observation may change conduct, but candidate version 1 never encodes a causal observer-effect claim. It records sourced public procedural changes without attributing motive or causation.",
  },
  sourceEpistemicBoundary:
    "An official page is evidence of what an institution publishes about itself. It is not independent proof that every practice matches the description.",
  dignityAndIdentity: {
    beings:
      "A being's dignity is not conditional on a finding. Public capacity and public conduct can be examined; private essence is not a data field.",
    identity:
      "Use exact official organisation identifiers or canonical institutional pages and role-based public doors only.",
    organisationLevelCaveat:
      "Organisation-level text can still identify or affect a person, especially for sole traders, one-person bodies and small groups. The declaration is not proof of anonymity or safe content.",
    excluded: [
      "natural-person profiles",
      "home addresses or private contacts",
      "private relationships or communications",
      "belief, personality, honesty, trust or motive inference",
      "face recognition, location tracking or social-graph enrichment",
      "fuzzy name, address, domain or person joins",
    ],
  },
  networkRule: {
    meaning:
      "Network means typed, published institution-to-institution relations such as commissioned-by, funded-by, overseen-by, audited-by, complaints-handled-by and appealable-to.",
    notEquivalentTo:
      "Funding, appointment, sponsorship, cooperation, oversight and control are different relations. None may be silently converted into influence, collusion or control.",
  },
  wordsAndDoings: {
    words:
      "Store a human-reviewed faithful paraphrase, institutional voice, modality, date and publisher door. Read the linked source for exact words.",
    doings:
      "Record sourced public procedural events such as opening, requesting evidence, publishing, correcting, referring, sanctioning or closing.",
    actionReferenceRule:
      "Each action names its exact institutional actor and whether it acts as investigator or commissioner. Evidence requests, interviews, visits, referrals, findings, sanctions and any report or closure carrying a substantive outcome also name exact declared subject institutions; referrals separately name their exact institutional destination.",
    outcomeStates: [
      "procedural-only",
      "allegation-not-determined",
      "no-determination",
      "no-breach-found",
      "breach-found",
      "decision-under-appeal",
      "final-subject-to-judicial-review",
      "corrected",
      "withdrawn",
    ],
    separationRule:
      "An allegation, provisional finding, final finding, sanction, appeal, institutional response and TaxSorted analysis are different record types and must never collapse into one verdict.",
    correctionRule:
      "Corrections, retractions and withdrawn responses append new records that point to the earlier records they change; action corrections preserve the same institutional actor and capacity, and nothing is silently overwritten.",
  },
  reciprocityInvariant: {
    rule:
      "Every observer named on an investigation engagement must have a sourced accountability or challenge relation, or an explicit observer-accountability-route-unmapped coverage gap.",
    taxsortedIncluded:
      "When TaxSorted later publishes records, its selection, paraphrase, comparison, omission, correction and publication decisions must be represented as observations too and follow the same provenance and correction rules.",
    taxsortedRecordStatus:
      "principle-declared-no-curation-or-investigation-records-admitted",
    noRanking:
      "No observer, subject, charity, regulator or investigator receives a trust, character, credibility or virtue score.",
    terminationRule:
      "The graph may terminate at a final court, statute, Parliament, election or public disclosure. The endpoint and its limit must be stated; no infinite watcher chain is claimed.",
  },
  inquiryLoop: {
    informalName: "fuck-around-and-find-out-with-receipts",
    publicMeaning:
      "Explore a bounded public-interest question freely; findings earn weight through evidence, limits, counterevidence, challenge and correction.",
    steps: [
      {
        id: "hypothesis",
        action: "Name one falsifiable question about a public investigation process.",
      },
      {
        id: "pilot",
        action: "Choose one small territorial source set and a tiny field allowlist.",
      },
      {
        id: "observe",
        action: "Collect only public institutional artefacts and preserve source voice.",
      },
      {
        id: "evidence",
        action: "Attach exact identities, dated source pointers, method and limits.",
      },
      {
        id: "counterevidence",
        action: "Seek the subject's published response and a real challenge route.",
      },
      {
        id: "risk",
        action: "Test rights, privacy, observer effect, misleading joins and hostile reuse.",
      },
      {
        id: "decide",
        action: "Observe, adopt, adapt or discard; publish the reason and uncertainty.",
      },
      {
        id: "stop",
        action: "Abort or contain the experiment when a stop condition is met.",
      },
    ],
    stopConditions: [
      "unclear source rights",
      "natural-person or sensitive data appears",
      "exact institutional identity cannot be established",
      "the proposed network edge is inferred rather than published",
      "a fair correction or challenge path does not exist",
      "the emergency stop or rollback cannot be exercised",
    ],
    offSwitch:
      "Every collection loop must be bounded, manually stoppable and reversible to the last reviewed public release.",
  },
  candidateContract: {
    schema: "/v1/accountability/uk/schema",
    example:
      "https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/observer-accountability/examples/zero-row-candidate.json",
    status: "candidate-shape-only",
    recordsAvailable: false,
    validation: {
      jsonSchema: "structural-shape-only",
      runtimeValidatorRequired: true,
      runtimeValidatorSource:
        "https://github.com/cambridgetcg/taxsorted.io/blob/main/api/src/uk-observer-accountability.ts",
      command:
        "npm --prefix api run validate:observer-accountability-candidate -- <candidate.json>",
      runtimeInvariants: observerAccountabilityRuntimeInvariants,
      validationDoesNotProve:
        "Base-record existence at the pinned release, source meaning, rights, legality, absence of personal or allegation content in free text, reviewer identity or publication approval.",
    },
    externalAdmissionChecks: [
      "resolve every organisation and document reference against the pinned base release",
      "review source meaning, permanence, link permission and derived-use rights",
      "record controller, purpose, lawful basis, retention, rights handling and DPIA decision",
      "human review of every free-text field for personal data, allegations, indirect identification and unsafe context",
      "record human editorial, privacy and publication approval in an operational audit store",
      "exercise confidential correction, urgent containment, emergency stop and rollback",
    ],
    collections: [
      {
        name: "institutionalRelations",
        question: "Which formal public relation connects the observer to another institution?",
      },
      {
        name: "investigationEngagements",
        question: "Who investigated what, under which mandate, method, limits and challenge routes?",
      },
      {
        name: "investigationActions",
        question: "Which sourced procedural action happened, who acted on whom, where did a referral go and what is its outcome state?",
      },
      {
        name: "institutionalResponses",
        question: "What did the observed organisation publicly accept, dispute, correct or appeal?",
      },
      {
        name: "coverageGaps",
        question: "Which mandate, method, funding, output, response, rights or accountability route remains unknown?",
      },
    ],
    counts: {
      institutionalRelations: 0,
      investigationEngagements: 0,
      investigationActions: 0,
      institutionalResponses: 0,
      coverageGaps: 0,
    },
  },
  officialDoors: officialDoors.map((door) => ({
    ...door,
    reviewedOn: "2026-07-11",
    publicationMode: "link-and-reviewed-summary",
    copiedSourceBodyStored: false,
    mayContainNaturalPersonDataAtSource: true,
    reviewMethod: "agent-assisted-editorial-review-of-linked-official-page",
    humanApprovalStatus: "not-recorded",
    assessmentNature:
      "source-link-and-taxsorted-summary-not-independent-proof-of-practice",
  })),
  existingTaxSortedDoors: [
    {
      href: "/v1/tax-system/uk",
      scope: "Tax authority, tribunal, complaint, enforcement and oversight machinery.",
    },
    {
      href: "/v1/tax-industry/uk",
      scope: "Professional bodies, licences, qualifications, industry roles and barriers.",
    },
    {
      href: "/v1/charities/uk",
      scope: "Charity regulators, legal forms, obligations, finance and challenge routes.",
    },
    {
      href: "/v1/public-funding/uk",
      scope: "Public-money institutions, governance, audit and parliamentary scrutiny.",
    },
    {
      href: "/v1/politics/uk/integrity",
      scope: "Political enforcement, oversight and public-integrity methods.",
    },
  ],
  publicationBlockers: [
    "No confidential correction and safety intake exists.",
    "No completed operational lawful-basis, retention and DPIA decision covers real engagement records.",
    "No per-source derived-use admission ledger covers copied investigator outputs.",
    "No operational audit store proves source, editorial, privacy and publication approvals for these future records.",
    "No monitored shared emergency stop and rollback exercise covers these future records.",
  ],
  hardWalls: [
    "The framework and official doors are public; investigation records remain zero-row.",
    "A public source is not blanket permission to republish its body or personal data.",
    "Missing evidence remains unknown, not false and not suspicious by default.",
    "Observer effects, motives, affiliations and private networks are not inferred.",
    "Corrections append; unsafe content may be replaced by a fixed safe tombstone rather than repeated.",
  ],
  rights: {
    taxsortedCuration: {
      id: "CC-BY-SA-4.0",
      url: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    linkedSources:
      "Linked source material keeps its publisher's rights. A TaxSorted link or summary does not relicense the source body.",
  },
  corrections: {
    publicNonPersonalFacts:
      "https://github.com/cambridgetcg/taxsorted.io/issues",
    accountRequired: true,
    confidentialOrSensitiveIntakeAvailable: false,
    warning:
      "Never post private, personal, legal-case or safety-sensitive evidence to the public issue tracker.",
  },
} as const);
