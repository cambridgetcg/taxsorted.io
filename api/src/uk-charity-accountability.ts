// Candidate-shape contract for a future UK charity organisation accountability
// dataset. The public framework endpoint contains no organisation rows. This
// validator can check candidate records, but it cannot authorise publication or
// prove that an external rights, correction or human-review workflow happened.

import { createHash } from "node:crypto";
import { z } from "zod";

export const accountabilityDatasetDigestAlgorithm = "sha256" as const;
export const accountabilityDatasetDigestPreimage =
  "canonical-utf8-dataset-with-current-release-datasetDigest-omitted-v1" as const;
export const accountabilitySourceReviewDigestPreimage =
  "canonical-utf8-document-and-source-review-with-reviewRecordDigest-omitted-v1" as const;

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const text = z.string().trim().min(1).max(4_000);
const shortText = z.string().trim().min(1).max(500);
const id = z.string().max(100).regex(/^[a-z0-9][a-z0-9-]*$/);
const exactIdentifier = z.string().trim().min(1).max(200);
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "invalid calendar date");
const dateTime = z.string().datetime({ offset: true });
const httpsUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"), "URL must use HTTPS");
const ids = z.array(id);
const nonEmptyIds = ids.min(1);
const nonEmptyText = z.array(shortText).min(1);
const sourceReviewNotes = z.array(shortText).min(1).max(5);
const sourceReviewLimitations = z.array(shortText).min(1).max(10);

function validateNullableDateRange(
  value: { validFrom: string | null; validTo: string | null },
  context: z.RefinementCtx
) {
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
}

const jurisdictionSchema = z.enum([
  "United Kingdom",
  "England",
  "Wales",
  "England and Wales",
  "Scotland",
  "Northern Ireland",
]);

const periodSchema = z.discriminatedUnion("kind", [
  strictObject({
    kind: z.literal("instant"),
    asOf: date,
  }),
  strictObject({
    kind: z.literal("date-range"),
    startDate: date,
    endDate: date,
  }).refine((value) => value.endDate >= value.startDate, {
    message: "period endDate must not precede startDate",
    path: ["endDate"],
  }),
  strictObject({
    kind: z.literal("financial-year"),
    label: z.string().regex(/^\d{4}-\d{2}$/),
    startDate: date,
    endDate: date,
  }).superRefine((value, context) => {
    if (value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "financial-year endDate must not precede startDate",
      });
    }
    const startYear = Number(value.label.slice(0, 4));
    const endYear = Number(value.label.slice(5));
    if (endYear !== (startYear + 1) % 100) {
      context.addIssue({
        code: "custom",
        path: ["label"],
        message: "financial-year label must name consecutive years",
      });
    }
    if (Number(value.startDate.slice(0, 4)) !== startYear) {
      context.addIssue({
        code: "custom",
        path: ["startDate"],
        message: "financial-year startDate year must match the label start year",
      });
    }
    if (Number(value.endDate.slice(0, 4)) % 100 !== endYear) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "financial-year endDate year must match the label end year",
      });
    }
  }),
]);

const comparisonContextSchema = strictObject({
  organisationId: id,
  period: periodSchema,
  scopeKey: id,
  scopeDefinition: shortText,
  metricKey: id,
  metricDefinition: shortText,
});

const privacyReviewSchema = strictObject({
  scope: z.literal("processed-record"),
  naturalPersonDataPresent: z.literal(false),
  contactDataPresent: z.literal(false),
  addressDataPresent: z.literal(false),
  namedPayDataPresent: z.literal(false),
  personalBeliefDataPresent: z.literal(false),
  beliefInferencePerformed: z.literal(false),
  joinMethod: z.literal("exact-published-identifier-only"),
  humanReviewStatus: z.literal("approved"),
  freeTextReviewed: z.literal(true),
  assessmentNature: z.literal(
    "human-assertion-not-automated-semantic-proof"
  ),
  reviewedAt: dateTime,
  reviewerRole: z.literal("TaxSorted accountability editor"),
});

const sourceUseTypeSchema = z.enum([
  "organisation-identity",
  "identifier-mapping",
  "voice-attribution",
  "attributed-normalisation",
  "programme-description",
  "funding-event",
  "financial-fact",
  "asset-aggregate",
  "control-relation",
  "reported-observation",
  "reported-outcome",
  "evaluation-finding",
]);

const sourceUseSchema = strictObject({
  documentId: id,
  sourceLocator: shortText,
  useType: sourceUseTypeSchema,
});

const provenanceShape = {
  sourceUses: z.array(sourceUseSchema).min(1),
  observedAt: dateTime,
  privacyReview: privacyReviewSchema,
};

const derivedUseSchema = z.discriminatedUnion("status", [
  strictObject({
    status: z.literal("not-approved"),
    reason: shortText,
  }),
  strictObject({
    status: z.literal("approved"),
    reviewedBasis: z.enum([
      "open-licence",
      "permission",
      "reviewed-facts-only",
      "statutory-basis",
      "other-reviewed-basis",
    ]),
    termsUrl: httpsUrl.nullable(),
    licenceUrl: httpsUrl.nullable(),
    attribution: shortText.nullable(),
    allowedUseTypes: z.array(sourceUseTypeSchema).min(1).max(12),
    allowedLocators: z.array(shortText).min(1).max(100),
    locatorAssessmentNature: z.literal(
      "human-reviewed-source-pointers-not-mechanically-resolved"
    ),
    limitations: sourceReviewLimitations,
  }).superRefine((value, context) => {
    if (value.termsUrl === null && value.licenceUrl === null) {
      context.addIssue({
        code: "custom",
        path: ["termsUrl"],
        message: "approved derived use needs reviewed terms or licence evidence",
      });
    }
    if (value.reviewedBasis === "open-licence" && value.licenceUrl === null) {
      context.addIssue({
        code: "custom",
        path: ["licenceUrl"],
        message: "open-licence derived use needs a licenceUrl",
      });
    }
    for (const [path, values] of [
      ["allowedUseTypes", value.allowedUseTypes],
      ["allowedLocators", value.allowedLocators],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: `${path} must not contain duplicates`,
        });
      }
    }
  }),
]);

const sourceReviewSchema = strictObject({
  reviewId: id,
  reviewRecordDigest: sha256,
  digestScope: z.literal(
    accountabilitySourceReviewDigestPreimage
  ),
  digestDoesNotProve: z.literal("legality-or-reviewer-identity"),
  assessedAt: dateTime,
  reviewExpiresAt: date,
  assessorRole: z.literal("TaxSorted source admission editor"),
  humanDecisionStatus: z.literal("approved"),
  assessmentNature: z.literal("human-review-record-not-legal-certification"),
  linkDecision: z.literal("approved"),
  copiedSourceBodyStored: z.literal(false),
  publicDocumentAndReviewFieldsReview: strictObject({
    decision: z.literal(
      "all-public-document-and-source-review-fields-approved-for-candidate"
    ),
    scope: z.literal(
      "document-metadata-permanence-source-review-derived-use-locators-and-notes"
    ),
    naturalPersonDataPresent: z.literal(false),
    contactDataPresent: z.literal(false),
    addressDataPresent: z.literal(false),
    namedPayDataPresent: z.literal(false),
    personalBeliefDataPresent: z.literal(false),
    beliefInferencePerformed: z.literal(false),
    sourceBodyOrExcerptPresent: z.literal(false),
    identifiersOpaqueOrNonPersonal: z.literal(true),
    locatorsContainPointersOnly: z.literal(true),
    allFreeTextAndUrlsReviewed: z.literal(true),
    assessmentNature: z.literal(
      "human-assertion-not-automated-semantic-proof"
    ),
  }),
  derivedUse: derivedUseSchema,
  notes: sourceReviewNotes,
}).superRefine((value, context) => {
  if (value.reviewExpiresAt < value.assessedAt.slice(0, 10)) {
    context.addIssue({
      code: "custom",
      path: ["reviewExpiresAt"],
      message: "source review expiry cannot precede its assessment date",
    });
  }
});

const documentSchema = strictObject({
  id,
  subjectOrganisationIds: nonEmptyIds,
  authorOrganisationIds: nonEmptyIds,
  publisherOrganisationId: id.nullable(),
  title: shortText,
  documentType: z.enum([
    "register-entry",
    "annual-return",
    "filed-accounts",
    "governing-document",
    "impact-report",
    "grant-award",
    "contract-award",
    "audit-report",
    "evaluation",
    "regulator-action",
    "official-guidance",
    "other-official-record",
  ]),
  publicUrl: httpsUrl,
  publishedAt: date.nullable(),
  retrievedAt: dateTime,
  publicationMode: z.literal("link-only"),
  sourcePermanence: z.discriminatedUnion("mode", [
    strictObject({
      mode: z.literal("publisher-current-url-only"),
      publisherVersionOrContentDigest: z.null(),
      archiveUrl: z.null(),
    }),
    strictObject({
      mode: z.literal("publisher-versioned"),
      publisherVersionOrContentDigest: shortText,
      archiveUrl: z.null(),
    }),
    strictObject({
      mode: z.literal("lawfully-archived-link"),
      publisherVersionOrContentDigest: z.null(),
      archiveUrl: httpsUrl,
    }),
  ]),
  sourceMayContainNaturalPersonData: z.boolean(),
  sourceReview: sourceReviewSchema,
});

const identifierBridgeSchema = strictObject({
  leftMappingId: id,
  rightMappingId: id,
  sourceUse: sourceUseSchema,
  sourcePublishesBothIdentifiers: z.literal(true),
  review: strictObject({
    status: z.literal("human-approved"),
    assertionNature: z.literal(
      "human-assertion-from-reviewed-source-locator-not-automated-semantic-proof"
    ),
    reviewedAt: dateTime,
    reviewerRole: z.literal("TaxSorted accountability editor"),
  }),
});

const organisationSchema = strictObject({
  id,
  canonicalName: shortText,
  role: z.enum([
    "charitable-organisation",
    "trading-subsidiary",
    "corporate-trustee",
    "public-funder",
    "private-funder",
    "delivery-partner",
    "regulator",
    "auditor",
    "evaluator",
  ]),
  jurisdictions: z.array(jurisdictionSchema).min(1),
  legalForm: shortText,
  status: z.enum(["active", "inactive", "removed", "historical", "uncertain"]),
  statusAsOf: date,
  exactIdentifierMappingIds: nonEmptyIds,
  identifierBridges: z.array(identifierBridgeSchema),
  ...provenanceShape,
});

const identifierMappingSchema = strictObject({
  id,
  organisationId: id,
  namespace: z.enum([
    "charity-commission-england-and-wales",
    "oscr",
    "charity-commission-northern-ireland",
    "companies-house",
    "official-institution-uri",
  ]),
  identifierKind: z.enum([
    "legal-or-institutional-organisation-id",
    "official-institution-uri-not-legal-entity-id",
  ]),
  registryName: z.enum([
    "Charity Commission for England and Wales register",
    "Scottish Charity Register",
    "Charity Commission for Northern Ireland register",
    "Companies House register",
    "Official institution canonical page",
  ]),
  canonicalisationRule: z.enum([
    "decimal-digits-preserve-leading-zeroes",
    "uppercase-alphanumeric-remove-spaces-and-hyphens",
    "exact-canonical-https-uri",
  ]),
  value: exactIdentifier,
  canonicalValue: exactIdentifier,
  registerUrl: httpsUrl,
  mappingMethod: z.literal("exact-published-identifier"),
  confidence: z.literal("exact"),
  validFrom: date.nullable(),
  validTo: date.nullable(),
  ...provenanceShape,
}).superRefine(validateNullableDateRange);

const voiceShape = {
  id,
  label: shortText,
  naturalPersonVoice: z.literal(false),
  description: text,
  ...provenanceShape,
};

const voiceSchema = z.discriminatedUnion("voiceType", [
  strictObject({
    ...voiceShape,
    voiceType: z.literal("subject-organisation"),
    speakingOrganisationId: id,
  }),
  strictObject({
    ...voiceShape,
    voiceType: z.literal("regulator"),
    speakingOrganisationId: id,
  }),
  strictObject({
    ...voiceShape,
    voiceType: z.literal("auditor"),
    speakingOrganisationId: id,
  }),
  strictObject({
    ...voiceShape,
    voiceType: z.literal("funder"),
    speakingOrganisationId: id,
  }),
  strictObject({
    ...voiceShape,
    voiceType: z.literal("delivery-partner"),
    speakingOrganisationId: id,
  }),
  strictObject({
    ...voiceShape,
    voiceType: z.literal("evaluator"),
    speakingOrganisationId: id,
  }),
  strictObject({
    ...voiceShape,
    voiceType: z.literal("taxsorted-editorial"),
    speakingOrganisationId: z.null(),
  }),
]);

const normalisationReviewSchema = strictObject({
  status: z.literal("human-approved"),
  method: z.literal("faithful-paraphrase"),
  exactWordsStored: z.literal(false),
  readerInstruction: z.literal("read-linked-source-for-exact-words"),
  assessmentNature: z.literal(
    "human-editorial-judgement-not-verbatim-or-semantic-proof"
  ),
  reviewedAt: dateTime,
  reviewerRole: z.literal("TaxSorted accountability editor"),
});

const sourceAssertionKindSchema = z.enum([
  "subject-organisation-self-report",
  "official-administrative-record",
  "regulator-finding",
  "auditor-opinion",
  "funder-record",
  "delivery-partner-report",
  "independent-evaluation",
  "taxsorted-derived",
]);

const externallyAttributedSourceAssertionKindSchema = z.enum([
  "subject-organisation-self-report",
  "official-administrative-record",
  "regulator-finding",
  "auditor-opinion",
  "funder-record",
  "delivery-partner-report",
  "independent-evaluation",
]);

const statisticalDisclosureReviewSchema = strictObject({
  status: z.literal("human-approved-for-candidate"),
  populationBasis: z.enum([
    "people-derived-aggregate",
    "organisation-only-not-person-derived",
  ]),
  smallestReportedCell: z.number().int().nonnegative().nullable(),
  smallCellDecision: z.enum(["not-applicable", "reviewed-safe-in-context"]),
  suppressionApplied: z.literal(false),
  singlingOutRisk: z.literal("none-identified"),
  specialCategoryInferenceRisk: z.literal("none-identified"),
  freeTextAndContextReviewed: z.literal(true),
  assessmentNature: z.literal(
    "human-disclosure-risk-assessment-not-proof-of-anonymity"
  ),
  reviewedAt: dateTime,
  reviewerRole: z.literal("TaxSorted statistical disclosure editor"),
  limitations: nonEmptyText,
}).superRefine((value, context) => {
  if (
    value.smallCellDecision === "not-applicable" &&
    value.populationBasis !== "organisation-only-not-person-derived"
  ) {
    context.addIssue({
      code: "custom",
      path: ["smallCellDecision"],
      message:
        "not-applicable is reserved for organisation-only, non-person-derived values",
    });
  }
  if (
    value.populationBasis === "people-derived-aggregate" &&
    (value.smallCellDecision !== "reviewed-safe-in-context" ||
      value.smallestReportedCell === null)
  ) {
    context.addIssue({
      code: "custom",
      path: ["smallestReportedCell"],
      message:
        "a people-derived aggregate needs a stated smallest cell and reviewed-safe decision",
    });
  }
  if (
    value.populationBasis === "organisation-only-not-person-derived" &&
    value.smallestReportedCell !== null
  ) {
    context.addIssue({
      code: "custom",
      path: ["smallestReportedCell"],
      message:
        "an organisation-only, non-person-derived value must not claim a people cell size",
    });
  }
});

const claimSchema = strictObject({
  id,
  subjectOrganisationId: id,
  voiceId: id,
  modality: z.enum([
    "states",
    "reports",
    "promises",
    "targets",
    "estimates",
    "evaluates",
    "disputes",
    "regulator-finds",
    "auditor-opines",
    "taxsorted-analysis",
  ]),
  normalisedStatement: text,
  verbatimTextStored: z.literal(false),
  normalisationReview: normalisationReviewSchema,
  comparisonContext: comparisonContextSchema.nullable(),
  validFrom: date.nullable(),
  validTo: date.nullable(),
  ...provenanceShape,
}).superRefine(validateNullableDateRange);

const programmeSchema = strictObject({
  id,
  organisationId: id,
  name: shortText,
  description: text,
  status: z.enum(["planned", "active", "complete", "paused", "cancelled", "uncertain"]),
  period: periodSchema,
  purposeClaimIds: ids,
  aggregatePopulationScope: text,
  individualRecipientDataStored: z.literal(false),
  statisticalDisclosureReview: statisticalDisclosureReviewSchema,
  evidenceVoiceId: id,
  sourceAssertionKind: externallyAttributedSourceAssertionKindSchema,
  recordMeaning: z.literal(
    "source-described-programme-not-independent-proof-of-delivery"
  ),
  ...provenanceShape,
});

const moneyBasisSchema = strictObject({
  currency: z.literal("GBP"),
  accountingBasis: z.enum(["cash", "accrual", "mixed", "not-stated"]),
  grossOrNet: z.enum(["gross", "net", "not-stated"]),
  vatBasis: z.enum(["inclusive", "exclusive", "not-stated"]),
  priceBasis: z.enum(["nominal", "current-price", "real", "not-stated"]),
  priceBaseDate: date.nullable(),
  consolidationScope: z.enum(["standalone", "group", "consolidated", "not-stated"]),
}).superRefine((value, context) => {
  if (value.priceBasis === "real" && value.priceBaseDate === null) {
    context.addIssue({
      code: "custom",
      path: ["priceBaseDate"],
      message: "real-price money needs a priceBaseDate",
    });
  }
  if (value.priceBasis !== "real" && value.priceBaseDate !== null) {
    context.addIssue({
      code: "custom",
      path: ["priceBaseDate"],
      message: "priceBaseDate is only valid for real-price money",
    });
  }
});

const moneySchema = strictObject({
  amountMinor: z.number().int().safe(),
  basis: moneyBasisSchema,
  measurementStage: z.enum([
    "forecast",
    "budgeted",
    "committed",
    "paid",
    "accrued",
    "outturn",
    "estimated",
    "restated",
  ]),
  amountAsOf: date,
});

const awardOrTransactionIdentifierSchema = strictObject({
  namespace: z.enum([
    "government-grant-award",
    "find-a-tender",
    "contracts-finder",
  ]),
  value: exactIdentifier,
  identifierKind: z.literal(
    "award-or-transaction-id-never-an-organisation-join"
  ),
});

const fundingEventSchema = strictObject({
  id,
  recipientOrganisationId: id,
  funderOrganisationId: id.nullable(),
  anonymousOrAggregateFunderClass: z
    .enum(["aggregate-public-donations", "anonymous-organisations", "not-applicable"]),
  programmeId: id.nullable(),
  eventType: z.enum([
    "grant-announced",
    "grant-committed",
    "grant-paid",
    "contract-awarded",
    "contract-paid",
    "aggregate-donations-reported",
    "intercompany-transfer",
    "loan",
    "refund",
  ]),
  exactAwardOrTransactionIdentifier: awardOrTransactionIdentifierSchema.nullable(),
  money: moneySchema,
  comparisonContext: comparisonContextSchema,
  statisticalDisclosureReview: statisticalDisclosureReviewSchema.nullable(),
  evidenceVoiceId: id,
  sourceAssertionKind: externallyAttributedSourceAssertionKindSchema,
  recordMeaning: z.literal(
    "source-reported-funding-stage-not-proof-of-delivery-or-impact"
  ),
  ...provenanceShape,
}).superRefine((value, context) => {
  if (
    value.funderOrganisationId === null &&
    value.anonymousOrAggregateFunderClass === "not-applicable"
  ) {
    context.addIssue({
      code: "custom",
      path: ["anonymousOrAggregateFunderClass"],
      message: "a missing funder needs an aggregate or anonymous organisation class",
    });
  }
  if (
    value.funderOrganisationId !== null &&
    value.anonymousOrAggregateFunderClass !== "not-applicable"
  ) {
    context.addIssue({
      code: "custom",
      path: ["anonymousOrAggregateFunderClass"],
      message: "an exact funder cannot also use an anonymous or aggregate class",
    });
  }
  const needsDisclosureReview =
    value.anonymousOrAggregateFunderClass !== "not-applicable";
  if (needsDisclosureReview !== (value.statisticalDisclosureReview !== null)) {
    context.addIssue({
      code: "custom",
      path: ["statisticalDisclosureReview"],
      message: needsDisclosureReview
        ? "anonymous or aggregate funding needs a publishable statistical disclosure review"
        : "an exact organisation-to-organisation funding event does not use an aggregate disclosure review",
    });
  }
  if (
    value.eventType === "aggregate-donations-reported" &&
    value.anonymousOrAggregateFunderClass !== "aggregate-public-donations"
  ) {
    context.addIssue({
      code: "custom",
      path: ["anonymousOrAggregateFunderClass"],
      message:
        "aggregate-donations-reported must use the aggregate-public-donations class",
    });
  }
  if (
    value.anonymousOrAggregateFunderClass === "aggregate-public-donations" &&
    value.statisticalDisclosureReview?.populationBasis !==
      "people-derived-aggregate"
  ) {
    context.addIssue({
      code: "custom",
      path: ["statisticalDisclosureReview", "populationBasis"],
      message:
        "aggregate public donations must be reviewed as a people-derived aggregate",
    });
  }
});

const financialFactSchema = strictObject({
  id,
  organisationId: id,
  metric: z.enum([
    "income",
    "expenditure",
    "grants-received",
    "grants-made",
    "contract-income",
    "donation-income",
    "staff-costs-aggregate",
    "remuneration-bands-aggregate",
    "trustee-remuneration-aggregate",
    "assets-total",
    "liabilities-total",
    "reserves",
    "cash-flow",
    "tax-charge",
    "other-aggregate",
  ]),
  money: moneySchema,
  comparisonContext: comparisonContextSchema,
  statementStatus: z.enum(["reported", "audited", "restated", "derived-exact-arithmetic"]),
  derivation: strictObject({
    method: z.literal("exact-arithmetic"),
    operation: z.literal("signed-sum-of-minor-unit-inputs"),
    terms: z
      .array(
        strictObject({
          inputFinancialFactId: id,
          coefficient: z.union([z.literal(-1), z.literal(1)]),
        })
      )
      .min(2),
  }).nullable(),
  namedPayDataStored: z.literal(false),
  statisticalDisclosureReview: statisticalDisclosureReviewSchema,
  evidenceVoiceId: id,
  sourceAssertionKind: sourceAssertionKindSchema,
  ...provenanceShape,
}).superRefine((value, context) => {
  if (value.statementStatus === "derived-exact-arithmetic" && value.derivation === null) {
    context.addIssue({
      code: "custom",
      path: ["derivation"],
      message: "a derived financial fact needs its exact arithmetic derivation",
    });
  }
  if (value.statementStatus !== "derived-exact-arithmetic" && value.derivation !== null) {
    context.addIssue({
      code: "custom",
      path: ["derivation"],
      message: "derivation is only valid for a derived financial fact",
    });
  }
});

const assetAggregateSchema = strictObject({
  id,
  organisationId: id,
  category: z.enum([
    "cash",
    "investments",
    "land-and-buildings",
    "equipment",
    "intangibles",
    "programme-assets",
    "other-assets",
  ]),
  money: moneySchema,
  comparisonContext: comparisonContextSchema,
  itemCount: z.number().int().nonnegative().nullable(),
  valuationBasis: shortText,
  itemLevelDataStored: z.literal(false),
  locationDataStored: z.literal(false),
  evidenceVoiceId: id,
  sourceAssertionKind: externallyAttributedSourceAssertionKindSchema,
  ...provenanceShape,
});

const controlRelationSchema = strictObject({
  id,
  controllerOrganisationId: id,
  controlledOrganisationId: id,
  relationType: z.enum([
    "parent-of-subsidiary",
    "corporate-member-of",
    "corporate-trustee-of",
    "holds-voting-rights-in",
    "appoints-governing-organisation-of",
    "jointly-controls",
    "group-member-of",
  ]),
  controllerKind: z.literal("organisation"),
  controlledKind: z.literal("organisation"),
  naturalPersonControlRecordsStored: z.literal(false),
  relationMethod: z.literal("exact-official-identifier-link"),
  percentage: z.number().min(0).max(100).nullable(),
  validFrom: date.nullable(),
  validTo: date.nullable(),
  evidenceVoiceId: id,
  sourceAssertionKind: externallyAttributedSourceAssertionKindSchema,
  ...provenanceShape,
}).superRefine(validateNullableDateRange);

const measuredValueSchema = z.discriminatedUnion("kind", [
  strictObject({ kind: z.literal("number"), value: z.number().finite(), unit: shortText }),
  strictObject({ kind: z.literal("boolean"), value: z.boolean() }),
  strictObject({ kind: z.literal("date"), value: date }),
  strictObject({ kind: z.literal("normalised-text"), value: text }),
]);

const observationSchema = strictObject({
  id,
  organisationId: id,
  programmeId: id.nullable(),
  observationType: z.enum([
    "activity-delivered",
    "output-recorded",
    "deadline-met",
    "deadline-missed",
    "regulatory-event",
    "policy-change",
    "service-change",
  ]),
  value: measuredValueSchema,
  comparisonContext: comparisonContextSchema,
  interpretation: text,
  statisticalDisclosureReview: statisticalDisclosureReviewSchema,
  evidenceVoiceId: id,
  sourceAssertionKind: externallyAttributedSourceAssertionKindSchema,
  recordMeaning: z.literal(
    "source-reported-or-recorded-activity-not-independent-proof"
  ),
  ...provenanceShape,
});

const outcomeSchema = strictObject({
  id,
  organisationId: id,
  programmeId: id.nullable(),
  outcomeType: z.enum([
    "reported-result",
    "measured-change",
    "target-attainment",
    "unintended-result",
    "no-detectable-change",
  ]),
  value: measuredValueSchema,
  comparisonContext: comparisonContextSchema,
  attributionStrength: z.enum([
    "none-stated",
    "association-only",
    "contribution-claim",
    "causal-claim",
  ]),
  aggregatePopulationScope: text,
  individualOutcomeDataStored: z.literal(false),
  statisticalDisclosureReview: statisticalDisclosureReviewSchema,
  evidenceVoiceId: id,
  sourceAssertionKind: externallyAttributedSourceAssertionKindSchema,
  recordMeaning: z.literal(
    "source-reported-or-measured-outcome-not-independent-proof-of-causation"
  ),
  ...provenanceShape,
});

const evaluationSchema = strictObject({
  id,
  organisationId: id,
  programmeId: id.nullable(),
  evaluatorOrganisationId: id.nullable(),
  evaluationType: z.enum([
    "self-evaluation",
    "independent-evaluation",
    "regulatory-review",
    "audit",
    "taxsorted-source-comparison",
  ]),
  normalisedFinding: text,
  normalisationReview: normalisationReviewSchema,
  comparisonContext: comparisonContextSchema,
  methodology: text,
  limitations: nonEmptyText,
  independenceStatus: z.enum([
    "self-reported",
    "commissioned",
    "independent",
    "uncertain",
    "not-applicable-taxsorted-analysis",
  ]),
  statisticalDisclosureReview: statisticalDisclosureReviewSchema,
  evidenceVoiceId: id,
  sourceAssertionKind: sourceAssertionKindSchema,
  ...provenanceShape,
});

const comparableCollectionSchema = z.enum([
  "claims",
  "fundingEvents",
  "financialFacts",
  "assetAggregates",
  "observations",
  "outcomes",
  "evaluations",
]);

const comparableRecordReferenceSchema = strictObject({
  collection: comparableCollectionSchema,
  id,
});

const humanComparisonReviewSchema = strictObject({
  status: z.literal("human-approved"),
  reviewerRole: z.literal("TaxSorted accountability editor"),
  reviewedAt: dateTime,
  rationale: text,
});

const numericComparisonSchema = z
  .discriminatedUnion("operation", [
    strictObject({
      operation: z.literal("difference-right-minus-left"),
      resultMinor: z.number().int().safe(),
      moneyDimensionsMatched: z.literal(true),
    }),
    strictObject({
      operation: z.literal("ratio-right-to-left"),
      numeratorMinor: z.number().int().safe(),
      denominatorMinor: z.number().int().safe(),
      representation: z.literal("exact-rational-source-minor-units"),
      moneyDimensionsMatched: z.literal(true),
    }),
  ])
  .nullable();

const comparisonSchema = strictObject({
  id,
  left: comparableRecordReferenceSchema,
  right: comparableRecordReferenceSchema,
  relation: z.enum([
    "consistent-with",
    "inconsistent-with",
    "not-comparable",
    "change-over-time",
    "supports",
    "qualifies",
  ]),
  comparisonContext: comparisonContextSchema,
  entityMatchMethod: z.literal("exact-published-identifier"),
  dimensionDecision: strictObject({
    sameOrganisation: z.boolean(),
    samePeriod: z.boolean(),
    sameScope: z.boolean(),
    sameMetric: z.boolean(),
  }),
  review: humanComparisonReviewSchema,
  numericComparison: numericComparisonSchema,
  statisticalDisclosureReview: statisticalDisclosureReviewSchema.nullable(),
  explanation: text,
  limitations: nonEmptyText,
  privacyReview: privacyReviewSchema,
}).superRefine((value, context) => {
  if (value.relation === "inconsistent-with") {
    for (const key of ["sameOrganisation", "samePeriod", "sameScope", "sameMetric"] as const) {
      if (!value.dimensionDecision[key]) {
        context.addIssue({
          code: "custom",
          path: ["dimensionDecision", key],
          message: `inconsistent-with requires ${key}`,
        });
      }
    }
  }
});

const dataCollectionSchema = z.enum([
  "organisations",
  "identifierMappings",
  "documents",
  "voices",
  "claims",
  "programmes",
  "fundingEvents",
  "financialFacts",
  "assetAggregates",
  "controlRelations",
  "observations",
  "outcomes",
  "evaluations",
  "comparisons",
  "coverageGaps",
]);

const coverageGapBaseShape = {
  id,
  affectedCollection: dataCollectionSchema,
  organisationId: id.nullable(),
  status: z.enum(["open", "under-review", "resolved", "accepted-boundary"]),
  observedAt: dateTime,
  reviewAfter: date,
  privacyReview: privacyReviewSchema,
};

const safeSuppressedCoverageDescription =
  "A value was omitted after disclosure-risk review." as const;
const safeSuppressedCoverageConsequence =
  "No inference should be made from its absence." as const;

const coverageGapSchema = z.union([
  strictObject({
    ...coverageGapBaseShape,
    gapType: z.literal("suppressed-for-disclosure-risk"),
    description: z.literal(safeSuppressedCoverageDescription),
    consequence: z.literal(safeSuppressedCoverageConsequence),
    sourceDocumentIds: z.array(id).length(0),
  }),
  strictObject({
    ...coverageGapBaseShape,
    gapType: z.enum([
    "not-published",
    "not-collected",
    "rights-unclear",
    "identifier-missing",
    "period-missing",
    "scope-unclear",
    "metric-unclear",
    "source-conflict",
    "temporarily-unavailable",
    "bounded-by-design",
    ]),
    description: text,
    consequence: text,
    sourceDocumentIds: ids,
  }),
]);

const tombstoneReasonSchema = z.enum([
  "corrected",
  "source-withdrawn",
  "rights-withdrawn",
  "safety-withdrawn",
  "duplicate-exact-id",
  "replaced",
]);

const safeTombstoneExplanationByReason = {
  corrected:
    "This record was removed because a corrected record supersedes it. Removed content is not repeated here.",
  "source-withdrawn":
    "This record was removed because its source was withdrawn. Removed content is not repeated here.",
  "rights-withdrawn":
    "This record was removed because its reuse approval no longer applies. Removed content is not repeated here.",
  "safety-withdrawn":
    "This record was removed for safety review. Removed content and sensitive details are not repeated here.",
  "duplicate-exact-id":
    "This record was removed after an exact-identifier duplicate was resolved. Removed content is not repeated here.",
  replaced:
    "This record was replaced by the referenced record. Removed content is not repeated here.",
} as const;

const safeTombstoneExplanationSchema = z.enum([
  safeTombstoneExplanationByReason.corrected,
  safeTombstoneExplanationByReason["source-withdrawn"],
  safeTombstoneExplanationByReason["rights-withdrawn"],
  safeTombstoneExplanationByReason["safety-withdrawn"],
  safeTombstoneExplanationByReason["duplicate-exact-id"],
  safeTombstoneExplanationByReason.replaced,
]);

const tombstoneSchema = strictObject({
  id,
  targetCollection: dataCollectionSchema,
  targetId: id,
  reason: tombstoneReasonSchema,
  effectiveAt: dateTime,
  replacementCollection: dataCollectionSchema.nullable(),
  replacementId: id.nullable(),
  dataRemoved: z.literal(true),
  retainedContent: z.literal(
    "identifier-reason-release-safe-explanation-and-replacement-only"
  ),
  retainedIdentifiersReview: strictObject({
    status: z.literal("human-approved"),
    naturalPersonOrSensitiveDataPresent: z.literal(false),
    identifierPolicy: z.literal("opaque-or-non-personal-public-record-id"),
    scope: z.literal(
      "tombstone-id-target-id-replacement-id-and-release-id"
    ),
    assessmentNature: z.literal(
      "human-assertion-not-automated-semantic-proof"
    ),
    reviewedAt: dateTime,
    reviewerRole: z.literal("TaxSorted accountability editor"),
  }),
  releaseId: id,
  publicExplanation: safeTombstoneExplanationSchema,
}).superRefine((value, context) => {
  const replacementFields = [value.replacementCollection, value.replacementId];
  if (replacementFields.filter((item) => item !== null).length === 1) {
    context.addIssue({
      code: "custom",
      path: ["replacementId"],
      message: "replacementCollection and replacementId must be present or absent together",
    });
  }
  const needsReplacement = value.reason === "replaced" || value.reason === "corrected";
  if (needsReplacement && value.replacementId === null) {
    context.addIssue({
      code: "custom",
      path: ["replacementId"],
      message: "a corrected or replaced tombstone needs a replacement",
    });
  }
  if (!needsReplacement && value.replacementId !== null) {
    context.addIssue({
      code: "custom",
      path: ["replacementId"],
      message: "only a corrected or replaced tombstone may name a replacement",
    });
  }
  if (
    value.reason === "corrected" &&
    value.replacementCollection !== null &&
    value.replacementCollection !== value.targetCollection
  ) {
    context.addIssue({
      code: "custom",
      path: ["replacementCollection"],
      message: "a corrected tombstone replacement must use the same collection",
    });
  }
  if (value.publicExplanation !== safeTombstoneExplanationByReason[value.reason]) {
    context.addIssue({
      code: "custom",
      path: ["publicExplanation"],
      message: "publicExplanation must use the fixed safe text for its reason",
    });
  }
});

const releaseRecordCountsSchema = strictObject({
  organisations: z.number().int().nonnegative(),
  identifierMappings: z.number().int().nonnegative(),
  documents: z.number().int().nonnegative(),
  voices: z.number().int().nonnegative(),
  claims: z.number().int().nonnegative(),
  programmes: z.number().int().nonnegative(),
  fundingEvents: z.number().int().nonnegative(),
  financialFacts: z.number().int().nonnegative(),
  assetAggregates: z.number().int().nonnegative(),
  controlRelations: z.number().int().nonnegative(),
  observations: z.number().int().nonnegative(),
  outcomes: z.number().int().nonnegative(),
  evaluations: z.number().int().nonnegative(),
  comparisons: z.number().int().nonnegative(),
  coverageGaps: z.number().int().nonnegative(),
  tombstones: z.number().int().nonnegative(),
});

const releaseSchema = strictObject({
  id,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: z.literal("candidate"),
  candidateAssembledAt: dateTime,
  previousReleaseId: id.nullable(),
  schemaId: z.literal("taxsorted.uk.charity-accountability/1"),
  datasetDigest: sha256,
  digestAlgorithm: z.literal(accountabilityDatasetDigestAlgorithm),
  digestPreimage: z.literal(accountabilityDatasetDigestPreimage),
  recordCounts: releaseRecordCountsSchema,
  changeSummary: nonEmptyText,
  changeSummaryPrivacyReview: privacyReviewSchema,
  removedOrSensitiveContentRepeated: z.literal(false),
  stableSort: z.literal("collection-order-then-ascii-id-ascending"),
  cursorVersion: z.literal("taxsorted.cursor/1"),
});

const datasetMetaSchema = strictObject({
  datasetId: z.literal("uk-charity-accountability"),
  title: z.literal("UK charity organisation accountability"),
  schemaId: z.literal("taxsorted.uk.charity-accountability/1"),
  currentReleaseId: id,
  jurisdiction: z.literal("United Kingdom"),
  publicationStatus: z.literal("candidate-not-admitted"),
  generatedAt: dateTime,
  recordIdentifierPolicy: z.literal(
    "opaque-or-non-personal-identifiers-human-reviewed-before-candidate"
  ),
  exclusions: z.tuple([
    z.literal("no natural-person records"),
    z.literal("no contact details"),
    z.literal("no addresses"),
    z.literal("no named pay"),
    z.literal("no personal belief data or belief inference"),
    z.literal("no fuzzy or probabilistic joins"),
  ]),
});

const collectionNames = [
  "organisations",
  "identifierMappings",
  "documents",
  "voices",
  "claims",
  "programmes",
  "fundingEvents",
  "financialFacts",
  "assetAggregates",
  "controlRelations",
  "observations",
  "outcomes",
  "evaluations",
  "comparisons",
  "coverageGaps",
  "tombstones",
] as const;

const datasetBaseSchema = strictObject({
  meta: datasetMetaSchema,
  organisations: z.array(organisationSchema),
  identifierMappings: z.array(identifierMappingSchema),
  documents: z.array(documentSchema),
  voices: z.array(voiceSchema),
  claims: z.array(claimSchema),
  programmes: z.array(programmeSchema),
  fundingEvents: z.array(fundingEventSchema),
  financialFacts: z.array(financialFactSchema),
  assetAggregates: z.array(assetAggregateSchema),
  controlRelations: z.array(controlRelationSchema),
  observations: z.array(observationSchema),
  outcomes: z.array(outcomeSchema),
  evaluations: z.array(evaluationSchema),
  comparisons: z.array(comparisonSchema),
  coverageGaps: z.array(coverageGapSchema),
  tombstones: z.array(tombstoneSchema),
  releases: z.array(releaseSchema).min(1),
});

type DatasetForValidation = z.infer<typeof datasetBaseSchema>;
type CollectionName = (typeof collectionNames)[number];
type ComparableCollection = z.infer<typeof comparableCollectionSchema>;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Compute the digest carried by the current release. Only that release's digest
 * value is omitted so the digest is not self-referential; historical digest
 * declarations remain protected by the current digest.
 */
export function computeUkCharityAccountabilityDatasetDigest<
  T extends {
    meta: { currentReleaseId: string };
    releases: Array<{ id: string; datasetDigest?: unknown }>;
  },
>(
  dataset: T
): `sha256:${string}` {
  if (
    !dataset.releases.some(
      (release) => release.id === dataset.meta.currentReleaseId
    )
  ) {
    throw new Error("cannot digest a dataset without its current release");
  }
  const preimage = {
    ...dataset,
    releases: dataset.releases.map((release) => {
      if (release.id !== dataset.meta.currentReleaseId) return release;
      const { datasetDigest: _omitted, ...digestibleRelease } = release;
      return digestibleRelease;
    }),
  };
  return `sha256:${createHash("sha256").update(canonical(preimage), "utf8").digest("hex")}`;
}

/**
 * Detect mutation of a declared document identity and source-review record.
 * Matching this digest proves only byte-level integrity of that declaration;
 * it proves neither legality, reviewer identity nor that an external workflow ran.
 */
export function computeUkCharitySourceReviewDigest<
  T extends {
    sourceReview: { reviewRecordDigest?: unknown } & Record<string, unknown>;
  } & Record<string, unknown>,
>(document: T): `sha256:${string}` {
  const { sourceReview, ...documentIdentity } = document;
  const { reviewRecordDigest: _omitted, ...review } = sourceReview;
  return `sha256:${createHash("sha256")
    .update(canonical({ ...documentIdentity, sourceReview: review }), "utf8")
    .digest("hex")}`;
}

function addIssue(context: z.RefinementCtx, path: PropertyKey[], message: string) {
  context.addIssue({ code: "custom", path, message });
}

function validateDataset(dataset: DatasetForValidation, context: z.RefinementCtx) {
  const collectionMaps = {} as Record<CollectionName, Map<string, unknown>>;
  const globalIds = new Map<string, string>();

  for (const name of collectionNames) {
    const records = dataset[name] as Array<{ id: string }>;
    const map = new Map<string, unknown>();
    collectionMaps[name] = map;
    for (const [index, record] of records.entries()) {
      if (index > 0 && records[index - 1].id >= record.id) {
        addIssue(
          context,
          [name, index, "id"],
          `${name} must be sorted by ASCII id ascending`
        );
      }
      if (map.has(record.id)) {
        addIssue(context, [name, index, "id"], `duplicate ${name} id: ${record.id}`);
      }
      map.set(record.id, record);
      const owner = globalIds.get(record.id);
      if (owner) {
        addIssue(context, [name, index, "id"], `record id already used by ${owner}: ${record.id}`);
      } else {
        globalIds.set(record.id, name);
      }
    }
  }

  const generatedAtMillis = Date.parse(dataset.meta.generatedAt);
  const generatedOn = dataset.meta.generatedAt.slice(0, 10);
  const currentCandidate = dataset.releases.find(
    (release) => release.id === dataset.meta.currentReleaseId
  );
  const currentCandidateCutoffMillis = currentCandidate
    ? Date.parse(currentCandidate.candidateAssembledAt)
    : null;
  const requireNotAfterGenerated = (
    value: string,
    path: PropertyKey[],
    label: string
  ) => {
    if (Date.parse(value) > generatedAtMillis) {
      addIssue(context, path, `${label} cannot be after dataset meta.generatedAt`);
    }
    if (
      currentCandidateCutoffMillis !== null &&
      Date.parse(value) > currentCandidateCutoffMillis
    ) {
      addIssue(
        context,
        path,
        `${label} cannot be after the current candidate assembly time`
      );
    }
  };

  const organisationIds = collectionMaps.organisations;
  const documentIds = collectionMaps.documents;
  const programmeIds = collectionMaps.programmes;
  const claimIds = collectionMaps.claims;
  const voiceIds = collectionMaps.voices;
  const financialFactIds = collectionMaps.financialFacts;
  const releaseIds = new Map(dataset.releases.map((record) => [record.id, record]));
  const seenReleaseIds = new Set<string>();
  for (const [index, release] of dataset.releases.entries()) {
    if (index > 0 && dataset.releases[index - 1].id >= release.id) {
      addIssue(
        context,
        ["releases", index, "id"],
        "releases must be sorted by ASCII id ascending"
      );
    }
    if (seenReleaseIds.has(release.id)) {
      addIssue(context, ["releases", index, "id"], `duplicate release id: ${release.id}`);
    }
    seenReleaseIds.add(release.id);
  }

  const requireRef = (
    known: Map<string, unknown>,
    value: string | null,
    path: PropertyKey[],
    kind: string
  ) => {
    if (value !== null && !known.has(value)) addIssue(context, path, `unknown ${kind}: ${value}`);
  };
  const requireRefs = (
    known: Map<string, unknown>,
    values: string[],
    path: PropertyKey[],
    kind: string
  ) => {
    const seen = new Set<string>();
    for (const [index, value] of values.entries()) {
      if (seen.has(value)) addIssue(context, [...path, index], `duplicate ${kind}: ${value}`);
      seen.add(value);
      requireRef(known, value, [...path, index], kind);
    }
  };
  const documentById = new Map(
    dataset.documents.map((record) => [record.id, record])
  );
  const organisationById = new Map(
    dataset.organisations.map((record) => [record.id, record])
  );
  const programmeById = new Map(
    dataset.programmes.map((record) => [record.id, record])
  );
  const financialFactById = new Map(
    dataset.financialFacts.map((record) => [record.id, record])
  );
  const voiceById = new Map(dataset.voices.map((record) => [record.id, record]));
  const seenSourceReviewIds = new Set<string>();
  for (const [index, document] of dataset.documents.entries()) {
    requireRefs(
      organisationIds,
      document.subjectOrganisationIds,
      ["documents", index, "subjectOrganisationIds"],
      "organisation"
    );
    requireRefs(
      organisationIds,
      document.authorOrganisationIds,
      ["documents", index, "authorOrganisationIds"],
      "author organisation"
    );
    requireRef(
      organisationIds,
      document.publisherOrganisationId,
      ["documents", index, "publisherOrganisationId"],
      "publisher organisation"
    );
    if (seenSourceReviewIds.has(document.sourceReview.reviewId)) {
      addIssue(
        context,
        ["documents", index, "sourceReview", "reviewId"],
        `duplicate source review id: ${document.sourceReview.reviewId}`
      );
    }
    seenSourceReviewIds.add(document.sourceReview.reviewId);
    requireNotAfterGenerated(
      document.retrievedAt,
      ["documents", index, "retrievedAt"],
      "document retrieval"
    );
    requireNotAfterGenerated(
      document.sourceReview.assessedAt,
      ["documents", index, "sourceReview", "assessedAt"],
      "source review assessment"
    );
    if (document.publishedAt !== null && document.publishedAt > document.retrievedAt.slice(0, 10)) {
      addIssue(
        context,
        ["documents", index, "publishedAt"],
        "document publishedAt cannot be after its retrieval date"
      );
    }
    if (
      Date.parse(document.sourceReview.assessedAt) <
      Date.parse(document.retrievedAt)
    ) {
      addIssue(
        context,
        ["documents", index, "sourceReview", "assessedAt"],
        "source review assessment cannot precede document retrieval"
      );
    }
    if (document.sourceReview.reviewExpiresAt < generatedOn) {
      addIssue(
        context,
        ["documents", index, "sourceReview", "reviewExpiresAt"],
        "source review is expired before the candidate generation date"
      );
    }
    const expectedReviewDigest = computeUkCharitySourceReviewDigest(document);
    if (document.sourceReview.reviewRecordDigest !== expectedReviewDigest) {
      addIssue(
        context,
        ["documents", index, "sourceReview", "reviewRecordDigest"],
        `source review digest does not match ${document.sourceReview.digestScope}`
      );
    }
  }

  const provenanceCollections = [
    ["organisations", dataset.organisations],
    ["identifierMappings", dataset.identifierMappings],
    ["voices", dataset.voices],
    ["claims", dataset.claims],
    ["programmes", dataset.programmes],
    ["fundingEvents", dataset.fundingEvents],
    ["financialFacts", dataset.financialFacts],
    ["assetAggregates", dataset.assetAggregates],
    ["controlRelations", dataset.controlRelations],
    ["observations", dataset.observations],
    ["outcomes", dataset.outcomes],
    ["evaluations", dataset.evaluations],
  ] as const;
  const latestSourceReadyMillis = (
    sourceUses: Array<{ documentId: string }>
  ) =>
    sourceUses.reduce((latest, sourceUse) => {
      const document = documentById.get(sourceUse.documentId);
      return document
        ? Math.max(
            latest,
            Date.parse(document.retrievedAt),
            Date.parse(document.sourceReview.assessedAt)
          )
        : latest;
    }, Number.NEGATIVE_INFINITY);
  for (const [name, records] of provenanceCollections) {
    for (const [index, record] of records.entries()) {
      requireNotAfterGenerated(
        record.observedAt,
        [name, index, "observedAt"],
        `${name} observation`
      );
      requireNotAfterGenerated(
        record.privacyReview.reviewedAt,
        [name, index, "privacyReview", "reviewedAt"],
        `${name} privacy review`
      );
      if (Date.parse(record.privacyReview.reviewedAt) < Date.parse(record.observedAt)) {
        addIssue(
          context,
          [name, index, "privacyReview", "reviewedAt"],
          `${name} privacy review cannot precede its observation`
        );
      }
      if (
        Date.parse(record.privacyReview.reviewedAt) <
        latestSourceReadyMillis(record.sourceUses)
      ) {
        addIssue(
          context,
          [name, index, "privacyReview", "reviewedAt"],
          `${name} privacy review cannot precede source retrieval or source admission review`
        );
      }
    }
  }
  for (const [name, records] of [
    ["claims", dataset.claims],
    ["evaluations", dataset.evaluations],
  ] as const) {
    for (const [index, record] of records.entries()) {
      requireNotAfterGenerated(
        record.normalisationReview.reviewedAt,
        [name, index, "normalisationReview", "reviewedAt"],
        `${name} normalisation review`
      );
      if (
        Date.parse(record.normalisationReview.reviewedAt) <
        Date.parse(record.observedAt)
      ) {
        addIssue(
          context,
          [name, index, "normalisationReview", "reviewedAt"],
          `${name} normalisation review cannot precede its observation`
        );
      }
      if (
        Date.parse(record.normalisationReview.reviewedAt) <
        latestSourceReadyMillis(record.sourceUses)
      ) {
        addIssue(
          context,
          [name, index, "normalisationReview", "reviewedAt"],
          `${name} normalisation review cannot precede source retrieval or source admission review`
        );
      }
      if (
        Date.parse(record.privacyReview.reviewedAt) <
        Date.parse(record.normalisationReview.reviewedAt)
      ) {
        addIssue(
          context,
          [name, index, "privacyReview", "reviewedAt"],
          `${name} privacy review cannot precede its approved normalisation`
        );
      }
      if (
        "statisticalDisclosureReview" in record &&
        Date.parse(record.statisticalDisclosureReview.reviewedAt) <
          Date.parse(record.normalisationReview.reviewedAt)
      ) {
        addIssue(
          context,
          [name, index, "statisticalDisclosureReview", "reviewedAt"],
          "evaluation disclosure review cannot precede its approved normalisation"
        );
      }
    }
  }
  const disclosureReviewRecords = [
    ...dataset.programmes.map((record, index) => ({
      name: "programmes",
      index,
      observedAt: record.observedAt,
      sourceUses: record.sourceUses,
      review: record.statisticalDisclosureReview,
      privacyReviewedAt: record.privacyReview.reviewedAt,
    })),
    ...dataset.fundingEvents.flatMap((record, index) =>
      record.statisticalDisclosureReview
        ? [
            {
              name: "fundingEvents",
              index,
              observedAt: record.observedAt,
              sourceUses: record.sourceUses,
              review: record.statisticalDisclosureReview,
              privacyReviewedAt: record.privacyReview.reviewedAt,
            },
          ]
        : []
    ),
    ...dataset.financialFacts.flatMap((record, index) =>
      record.statisticalDisclosureReview
        ? [
            {
              name: "financialFacts",
              index,
              observedAt: record.observedAt,
              sourceUses: record.sourceUses,
              review: record.statisticalDisclosureReview,
              privacyReviewedAt: record.privacyReview.reviewedAt,
            },
          ]
        : []
    ),
    ...dataset.observations.map((record, index) => ({
      name: "observations",
      index,
      observedAt: record.observedAt,
      sourceUses: record.sourceUses,
      review: record.statisticalDisclosureReview,
      privacyReviewedAt: record.privacyReview.reviewedAt,
    })),
    ...dataset.outcomes.map((record, index) => ({
      name: "outcomes",
      index,
      observedAt: record.observedAt,
      sourceUses: record.sourceUses,
      review: record.statisticalDisclosureReview,
      privacyReviewedAt: record.privacyReview.reviewedAt,
    })),
    ...dataset.evaluations.map((record, index) => ({
      name: "evaluations",
      index,
      observedAt: record.observedAt,
      sourceUses: record.sourceUses,
      review: record.statisticalDisclosureReview,
      privacyReviewedAt: record.privacyReview.reviewedAt,
    })),
  ];
  for (const {
    name,
    index,
    observedAt,
    sourceUses,
    review,
    privacyReviewedAt,
  } of disclosureReviewRecords) {
    requireNotAfterGenerated(
      review.reviewedAt,
      [name, index, "statisticalDisclosureReview", "reviewedAt"],
      `${name} statistical disclosure review`
    );
    if (Date.parse(review.reviewedAt) < Date.parse(observedAt)) {
      addIssue(
        context,
        [name, index, "statisticalDisclosureReview", "reviewedAt"],
        `${name} statistical disclosure review cannot precede its observation`
      );
    }
    if (Date.parse(review.reviewedAt) < latestSourceReadyMillis(sourceUses)) {
      addIssue(
        context,
        [name, index, "statisticalDisclosureReview", "reviewedAt"],
        `${name} statistical disclosure review cannot precede source retrieval or source admission review`
      );
    }
    if (Date.parse(privacyReviewedAt) < Date.parse(review.reviewedAt)) {
      addIssue(
        context,
        [name, index, "privacyReview", "reviewedAt"],
        `${name} privacy review cannot precede its statistical disclosure review`
      );
    }
  }
  for (const [index, comparison] of dataset.comparisons.entries()) {
    requireNotAfterGenerated(
      comparison.review.reviewedAt,
      ["comparisons", index, "review", "reviewedAt"],
      "comparison review"
    );
    requireNotAfterGenerated(
      comparison.privacyReview.reviewedAt,
      ["comparisons", index, "privacyReview", "reviewedAt"],
      "comparison privacy review"
    );
  }
  for (const [index, gap] of dataset.coverageGaps.entries()) {
    requireNotAfterGenerated(
      gap.observedAt,
      ["coverageGaps", index, "observedAt"],
      "coverage gap observation"
    );
    requireNotAfterGenerated(
      gap.privacyReview.reviewedAt,
      ["coverageGaps", index, "privacyReview", "reviewedAt"],
      "coverage gap privacy review"
    );
    if (Date.parse(gap.privacyReview.reviewedAt) < Date.parse(gap.observedAt)) {
      addIssue(
        context,
        ["coverageGaps", index, "privacyReview", "reviewedAt"],
        "coverage gap privacy review cannot precede its observation"
      );
    }
    if (
      Date.parse(gap.privacyReview.reviewedAt) <
      latestSourceReadyMillis(
        gap.sourceDocumentIds.map((documentId) => ({ documentId }))
      )
    ) {
      addIssue(
        context,
        ["coverageGaps", index, "privacyReview", "reviewedAt"],
        "coverage gap privacy review cannot precede referenced source retrieval or source admission review"
      );
    }
  }
  for (const [index, tombstone] of dataset.tombstones.entries()) {
    requireNotAfterGenerated(
      tombstone.effectiveAt,
      ["tombstones", index, "effectiveAt"],
      "tombstone effective time"
    );
    requireNotAfterGenerated(
      tombstone.retainedIdentifiersReview.reviewedAt,
      ["tombstones", index, "retainedIdentifiersReview", "reviewedAt"],
      "tombstone identifier review"
    );
    if (
      Date.parse(tombstone.retainedIdentifiersReview.reviewedAt) >
      Date.parse(tombstone.effectiveAt)
    ) {
      addIssue(
        context,
        ["tombstones", index, "retainedIdentifiersReview", "reviewedAt"],
        "tombstone identifier review must be complete by its effective time"
      );
    }
  }
  for (const [index, release] of dataset.releases.entries()) {
    requireNotAfterGenerated(
      release.candidateAssembledAt,
      ["releases", index, "candidateAssembledAt"],
      "candidate assembly time"
    );
    requireNotAfterGenerated(
      release.changeSummaryPrivacyReview.reviewedAt,
      ["releases", index, "changeSummaryPrivacyReview", "reviewedAt"],
      "release change-summary privacy review"
    );
    if (
      Date.parse(release.changeSummaryPrivacyReview.reviewedAt) >
      Date.parse(release.candidateAssembledAt)
    ) {
      addIssue(
        context,
        ["releases", index, "changeSummaryPrivacyReview", "reviewedAt"],
        "release change-summary privacy review must be complete by candidate assembly time"
      );
    }
  }

  const factualSourceUseTypes = new Set<z.infer<typeof sourceUseTypeSchema>>([
    "organisation-identity",
    "identifier-mapping",
    "attributed-normalisation",
    "programme-description",
    "funding-event",
    "financial-fact",
    "asset-aggregate",
    "control-relation",
    "reported-observation",
    "reported-outcome",
    "evaluation-finding",
  ]);

  const validateSourceUse = (
    use: z.infer<typeof sourceUseSchema>,
    path: PropertyKey[],
    expectedUseType: z.infer<typeof sourceUseTypeSchema>,
    subjectOrganisationIds: string[],
    recordName: string
  ) => {
    if (use.useType !== expectedUseType) {
      addIssue(
        context,
        [...path, "useType"],
        `${recordName} source use must be ${expectedUseType}`
      );
    }
    const document = documentById.get(use.documentId);
    if (!document) {
      addIssue(context, [...path, "documentId"], `unknown document: ${use.documentId}`);
      return;
    }
    const derivedUse = document.sourceReview.derivedUse;
    if (derivedUse.status !== "approved") {
      addIssue(
        context,
        path,
        `document ${use.documentId} is link-only and not approved for derived use`
      );
    } else {
      if (!derivedUse.allowedUseTypes.includes(use.useType)) {
        addIssue(
          context,
          [...path, "useType"],
          `document ${use.documentId} does not admit ${use.useType}`
        );
      }
      if (!derivedUse.allowedLocators.includes(use.sourceLocator)) {
        addIssue(
          context,
          [...path, "sourceLocator"],
          `document ${use.documentId} does not admit this reviewed source locator`
        );
      }
    }
    for (const subjectOrganisationId of subjectOrganisationIds) {
      if (!document.subjectOrganisationIds.includes(subjectOrganisationId)) {
        addIssue(
          context,
          [...path, "documentId"],
          `document ${use.documentId} does not name subject organisation ${subjectOrganisationId}`
        );
      }
    }
    if (
      document.documentType === "official-guidance" &&
      factualSourceUseTypes.has(use.useType)
    ) {
      addIssue(
        context,
        [...path, "documentId"],
        "general official guidance cannot serve as the factual source for an organisation record"
      );
    }
  };

  const requireSourceUses = (
    sourceUses: Array<z.infer<typeof sourceUseSchema>>,
    name: string,
    index: number,
    expectedUseType: z.infer<typeof sourceUseTypeSchema>,
    subjectOrganisationIds: string[]
  ) => {
    const seen = new Set<string>();
    for (const [sourceIndex, use] of sourceUses.entries()) {
      const path = [name, index, "sourceUses", sourceIndex] as PropertyKey[];
      const key = `${use.documentId}\u0000${use.sourceLocator}\u0000${use.useType}`;
      if (seen.has(key)) addIssue(context, path, "duplicate source use");
      seen.add(key);
      validateSourceUse(use, path, expectedUseType, subjectOrganisationIds, name);
    }
  };

  const assertionVoiceTypes = {
    "subject-organisation-self-report": ["subject-organisation"],
    "official-administrative-record": ["regulator"],
    "regulator-finding": ["regulator"],
    "auditor-opinion": ["auditor"],
    "funder-record": ["funder"],
    "delivery-partner-report": ["delivery-partner"],
    "independent-evaluation": ["evaluator"],
    "taxsorted-derived": ["taxsorted-editorial"],
  } as const;

  const requireVoiceEvidence = (
    voiceId: string,
    assertionKind: z.infer<typeof sourceAssertionKindSchema>,
    sourceUses: Array<z.infer<typeof sourceUseSchema>>,
    name: string,
    index: number,
    subjectOrganisationId: string
  ) => {
    const voice = voiceById.get(voiceId);
    if (!voice) {
      addIssue(context, [name, index, "evidenceVoiceId"], `unknown voice: ${voiceId}`);
      return;
    }
    const allowedVoiceTypes = assertionVoiceTypes[assertionKind] as readonly string[];
    if (!allowedVoiceTypes.includes(voice.voiceType)) {
      addIssue(
        context,
        [name, index, "sourceAssertionKind"],
        `${assertionKind} cannot use a ${voice.voiceType} voice`
      );
    }
    if (
      assertionKind === "subject-organisation-self-report" &&
      voice.speakingOrganisationId !== subjectOrganisationId
    ) {
      addIssue(
        context,
        [name, index, "evidenceVoiceId"],
        "a self-report voice must be the record subject organisation"
      );
    }
    const recordDocumentIds = new Set(sourceUses.map((use) => use.documentId));
    if (!voice.sourceUses.some((use) => recordDocumentIds.has(use.documentId))) {
      addIssue(
        context,
        [name, index, "evidenceVoiceId"],
        "evidence voice and record must share an admitted source document"
      );
    }
  };

  const identifierOwners = new Map<string, string>();
  const registryRules = {
    "charity-commission-england-and-wales": {
      registryName: "Charity Commission for England and Wales register",
      canonicalisationRule: "decimal-digits-preserve-leading-zeroes",
    },
    oscr: {
      registryName: "Scottish Charity Register",
      canonicalisationRule: "uppercase-alphanumeric-remove-spaces-and-hyphens",
    },
    "charity-commission-northern-ireland": {
      registryName: "Charity Commission for Northern Ireland register",
      canonicalisationRule: "uppercase-alphanumeric-remove-spaces-and-hyphens",
    },
    "companies-house": {
      registryName: "Companies House register",
      canonicalisationRule: "uppercase-alphanumeric-remove-spaces-and-hyphens",
      identifierKind: "legal-or-institutional-organisation-id",
    },
    "official-institution-uri": {
      registryName: "Official institution canonical page",
      canonicalisationRule: "exact-canonical-https-uri",
      identifierKind: "official-institution-uri-not-legal-entity-id",
    },
  } as const;
  for (const [index, mapping] of dataset.identifierMappings.entries()) {
    requireRef(
      organisationIds,
      mapping.organisationId,
      ["identifierMappings", index, "organisationId"],
      "organisation"
    );
    requireSourceUses(
      mapping.sourceUses,
      "identifierMappings",
      index,
      "identifier-mapping",
      [mapping.organisationId]
    );
    const mappedOrganisation = organisationById.get(mapping.organisationId);
    if (
      mappedOrganisation &&
      !mappedOrganisation.exactIdentifierMappingIds.includes(mapping.id)
    ) {
      addIssue(
        context,
        ["identifierMappings", index, "organisationId"],
        "every identifier mapping must be listed by its referenced organisation"
      );
    }
    const registryRule = registryRules[mapping.namespace];
    if (mapping.registryName !== registryRule.registryName) {
      addIssue(
        context,
        ["identifierMappings", index, "registryName"],
        `registryName must match ${mapping.namespace}`
      );
    }
    if (mapping.canonicalisationRule !== registryRule.canonicalisationRule) {
      addIssue(
        context,
        ["identifierMappings", index, "canonicalisationRule"],
        `canonicalisationRule must match ${mapping.namespace}`
      );
    }
    if (
      "identifierKind" in registryRule &&
      mapping.identifierKind !== registryRule.identifierKind
    ) {
      addIssue(
        context,
        ["identifierMappings", index, "identifierKind"],
        `identifierKind must match ${mapping.namespace}`
      );
    }
    const expectedCanonical =
      mapping.canonicalisationRule === "decimal-digits-preserve-leading-zeroes"
        ? /^\d+$/.test(mapping.value)
          ? mapping.value
          : null
        : mapping.canonicalisationRule === "exact-canonical-https-uri"
          ? httpsUrl.safeParse(mapping.value).success
            ? mapping.value
            : null
          : /^(?=.*[A-Za-z0-9])[A-Za-z0-9 -]+$/.test(mapping.value)
            ? mapping.value.toUpperCase().replace(/[ -]/g, "")
            : null;
    if (expectedCanonical === null || mapping.canonicalValue !== expectedCanonical) {
      addIssue(
        context,
        ["identifierMappings", index, "canonicalValue"],
        "canonicalValue does not match the declared namespace normalisation"
      );
    }
    if (mapping.namespace === "official-institution-uri") {
      const role = organisationById.get(mapping.organisationId)?.role;
      if (role !== "regulator" && role !== "public-funder") {
        addIssue(
          context,
          ["identifierMappings", index, "namespace"],
          "official institution URI is restricted to regulator and public-funder organisations"
        );
      }
      if (mapping.canonicalValue !== mapping.registerUrl) {
        addIssue(
          context,
          ["identifierMappings", index, "registerUrl"],
          "official institution URI canonicalValue must equal its reviewed registerUrl"
        );
      }
    } else if (mapping.identifierKind !== "legal-or-institutional-organisation-id") {
      addIssue(
        context,
        ["identifierMappings", index, "identifierKind"],
        "register identifiers must use the legal-or-institutional identifier kind"
      );
    }
    const key = `${mapping.namespace}\u0000${mapping.canonicalValue}`;
    const existing = identifierOwners.get(key);
    if (existing && existing !== mapping.organisationId) {
      addIssue(
        context,
        ["identifierMappings", index, "canonicalValue"],
        `exact identifier maps to more than one organisation: ${mapping.namespace}/${mapping.canonicalValue}`
      );
    }
    identifierOwners.set(key, mapping.organisationId);
  }

  const mappingById = new Map(dataset.identifierMappings.map((record) => [record.id, record]));
  for (const [index, organisation] of dataset.organisations.entries()) {
    requireNotAfterGenerated(
      organisation.statusAsOf,
      ["organisations", index, "statusAsOf"],
      "organisation status date"
    );
    requireSourceUses(
      organisation.sourceUses,
      "organisations",
      index,
      "organisation-identity",
      [organisation.id]
    );
    requireRefs(
      mappingById,
      organisation.exactIdentifierMappingIds,
      ["organisations", index, "exactIdentifierMappingIds"],
      "identifier mapping"
    );
    for (const mappingId of organisation.exactIdentifierMappingIds) {
      if (mappingById.get(mappingId)?.organisationId !== organisation.id) {
        addIssue(
          context,
          ["organisations", index, "exactIdentifierMappingIds"],
          `identifier mapping ${mappingId} belongs to another organisation`
        );
      }
    }
    const organisationMappingIds = new Set(organisation.exactIdentifierMappingIds);
    const bridgePairs = new Set<string>();
    const bridgeAdjacency = new Map<string, Set<string>>(
      organisation.exactIdentifierMappingIds.map((mappingId) => [mappingId, new Set()])
    );
    let previousBridgeKey: string | null = null;
    for (const [bridgeIndex, bridge] of organisation.identifierBridges.entries()) {
      const bridgePath = [
        "organisations",
        index,
        "identifierBridges",
        bridgeIndex,
      ] as PropertyKey[];
      if (bridge.leftMappingId >= bridge.rightMappingId) {
        addIssue(
          context,
          [...bridgePath, "leftMappingId"],
          "identifier bridge mapping IDs must be distinct and in ASCII ascending order"
        );
      }
      const bridgeKey = `${bridge.leftMappingId}\u0000${bridge.rightMappingId}`;
      if (previousBridgeKey !== null && previousBridgeKey >= bridgeKey) {
        addIssue(
          context,
          bridgePath,
          "identifier bridges must be sorted by leftMappingId then rightMappingId"
        );
      }
      previousBridgeKey = bridgeKey;
      if (bridgePairs.has(bridgeKey)) {
        addIssue(context, bridgePath, "duplicate identifier bridge");
      }
      bridgePairs.add(bridgeKey);
      for (const [field, mappingId] of [
        ["leftMappingId", bridge.leftMappingId],
        ["rightMappingId", bridge.rightMappingId],
      ] as const) {
        if (!organisationMappingIds.has(mappingId)) {
          addIssue(
            context,
            [...bridgePath, field],
            `identifier bridge mapping is not assigned to organisation ${organisation.id}: ${mappingId}`
          );
        }
      }
      validateSourceUse(
        bridge.sourceUse,
        [...bridgePath, "sourceUse"],
        "identifier-mapping",
        [organisation.id],
        "identifier bridge"
      );
      requireNotAfterGenerated(
        bridge.review.reviewedAt,
        [...bridgePath, "review", "reviewedAt"],
        "identifier bridge review"
      );
      const bridgeDocument = documentById.get(bridge.sourceUse.documentId);
      if (
        bridgeDocument &&
        Date.parse(bridge.review.reviewedAt) <
          Math.max(
            Date.parse(bridgeDocument.retrievedAt),
            Date.parse(bridgeDocument.sourceReview.assessedAt)
          )
      ) {
        addIssue(
          context,
          [...bridgePath, "review", "reviewedAt"],
          "identifier bridge review cannot precede source retrieval or source admission review"
        );
      }
      bridgeAdjacency.get(bridge.leftMappingId)?.add(bridge.rightMappingId);
      bridgeAdjacency.get(bridge.rightMappingId)?.add(bridge.leftMappingId);
    }
    const firstMappingId = organisation.exactIdentifierMappingIds[0];
    const reachableMappings = new Set<string>();
    const bridgeQueue = firstMappingId ? [firstMappingId] : [];
    while (bridgeQueue.length > 0) {
      const mappingId = bridgeQueue.pop()!;
      if (reachableMappings.has(mappingId)) continue;
      reachableMappings.add(mappingId);
      for (const adjacentId of bridgeAdjacency.get(mappingId) ?? []) {
        if (!reachableMappings.has(adjacentId)) bridgeQueue.push(adjacentId);
      }
    }
    if (reachableMappings.size !== organisation.exactIdentifierMappingIds.length) {
      addIssue(
        context,
        ["organisations", index, "identifierBridges"],
        "every exact identifier assigned to an organisation must be connected by a human-reviewed source that publishes both identifiers"
      );
    }
  }

  for (const [index, voice] of dataset.voices.entries()) {
    requireSourceUses(
      voice.sourceUses,
      "voices",
      index,
      "voice-attribution",
      []
    );
    if (voice.speakingOrganisationId !== null) {
      requireRef(
        organisationIds,
        voice.speakingOrganisationId,
        ["voices", index, "speakingOrganisationId"],
        "speaking organisation"
      );
      const speaker = organisationById.get(voice.speakingOrganisationId);
      const validRole =
        voice.voiceType === "subject-organisation" ||
        (voice.voiceType === "regulator" && speaker?.role === "regulator") ||
        (voice.voiceType === "auditor" && speaker?.role === "auditor") ||
        (voice.voiceType === "funder" &&
          (speaker?.role === "public-funder" || speaker?.role === "private-funder")) ||
        (voice.voiceType === "delivery-partner" && speaker?.role === "delivery-partner") ||
        (voice.voiceType === "evaluator" && speaker?.role === "evaluator");
      if (!validRole) {
        addIssue(
          context,
          ["voices", index, "speakingOrganisationId"],
          `${voice.voiceType} voice needs an organisation with the matching role`
        );
      }
      for (const [sourceIndex, use] of voice.sourceUses.entries()) {
        const document = documentById.get(use.documentId);
        if (
          document &&
          !document.authorOrganisationIds.includes(voice.speakingOrganisationId) &&
          document.publisherOrganisationId !== voice.speakingOrganisationId
        ) {
          addIssue(
            context,
            ["voices", index, "sourceUses", sourceIndex, "documentId"],
            "non-editorial voice must match an exact source author or publisher organisation"
          );
        }
      }
    }
  }
  for (const [index, claim] of dataset.claims.entries()) {
    requireRef(organisationIds, claim.subjectOrganisationId, ["claims", index, "subjectOrganisationId"], "organisation");
    requireRef(voiceIds, claim.voiceId, ["claims", index, "voiceId"], "voice");
    requireSourceUses(
      claim.sourceUses,
      "claims",
      index,
      "attributed-normalisation",
      [claim.subjectOrganisationId]
    );
    const voice = voiceById.get(claim.voiceId);
    if (voice) {
      const sourceDocumentIds = new Set(claim.sourceUses.map((use) => use.documentId));
      if (!voice.sourceUses.some((use) => sourceDocumentIds.has(use.documentId))) {
        addIssue(
          context,
          ["claims", index, "voiceId"],
          "claim and attributed voice must share an admitted source document"
        );
      }
      const requiredVoiceType =
        claim.modality === "regulator-finds"
          ? "regulator"
          : claim.modality === "auditor-opines"
            ? "auditor"
            : claim.modality === "taxsorted-analysis"
              ? "taxsorted-editorial"
              : null;
      if (requiredVoiceType && voice.voiceType !== requiredVoiceType) {
        addIssue(
          context,
          ["claims", index, "modality"],
          `${claim.modality} requires a ${requiredVoiceType} voice`
        );
      }
      if (
        (claim.modality === "promises" || claim.modality === "targets") &&
        (voice.voiceType !== "subject-organisation" ||
          voice.speakingOrganisationId !== claim.subjectOrganisationId)
      ) {
        addIssue(
          context,
          ["claims", index, "modality"],
          `${claim.modality} must be attributed to the subject organisation`
        );
      }
      if (
        claim.modality === "evaluates" &&
        voice.voiceType !== "evaluator" &&
        voice.voiceType !== "subject-organisation"
      ) {
        addIssue(
          context,
          ["claims", index, "modality"],
          "evaluates requires an evaluator or subject-organisation voice"
        );
      }
      if (
        claim.modality !== "taxsorted-analysis" &&
        voice.voiceType === "taxsorted-editorial"
      ) {
        addIssue(
          context,
          ["claims", index, "modality"],
          "TaxSorted editorial voice must use taxsorted-analysis"
        );
      }
    }
    if (claim.comparisonContext && claim.comparisonContext.organisationId !== claim.subjectOrganisationId) {
      addIssue(context, ["claims", index, "comparisonContext", "organisationId"], "claim comparison context must use its subject organisation");
    }
  }
  for (const [index, programme] of dataset.programmes.entries()) {
    requireRef(organisationIds, programme.organisationId, ["programmes", index, "organisationId"], "organisation");
    requireRefs(claimIds, programme.purposeClaimIds, ["programmes", index, "purposeClaimIds"], "claim");
    requireSourceUses(programme.sourceUses, "programmes", index, "programme-description", [programme.organisationId]);
    requireVoiceEvidence(programme.evidenceVoiceId, programme.sourceAssertionKind, programme.sourceUses, "programmes", index, programme.organisationId);
    for (const claimId of programme.purposeClaimIds) {
      const purposeClaim = dataset.claims.find((candidate) => candidate.id === claimId);
      if (purposeClaim && purposeClaim.subjectOrganisationId !== programme.organisationId) {
        addIssue(context, ["programmes", index, "purposeClaimIds"], `purpose claim ${claimId} belongs to another organisation`);
      }
    }
  }
  for (const [index, event] of dataset.fundingEvents.entries()) {
    requireRef(organisationIds, event.recipientOrganisationId, ["fundingEvents", index, "recipientOrganisationId"], "recipient organisation");
    requireRef(organisationIds, event.funderOrganisationId, ["fundingEvents", index, "funderOrganisationId"], "funder organisation");
    requireRef(programmeIds, event.programmeId, ["fundingEvents", index, "programmeId"], "programme");
    if (
      event.programmeId !== null &&
      programmeById.get(event.programmeId)?.organisationId !==
        event.recipientOrganisationId
    ) {
      addIssue(
        context,
        ["fundingEvents", index, "programmeId"],
        "funding event programme must belong to the recipient organisation"
      );
    }
    requireSourceUses(
      event.sourceUses,
      "fundingEvents",
      index,
      "funding-event",
      [event.recipientOrganisationId, ...(event.funderOrganisationId ? [event.funderOrganisationId] : [])]
    );
    requireVoiceEvidence(event.evidenceVoiceId, event.sourceAssertionKind, event.sourceUses, "fundingEvents", index, event.recipientOrganisationId);
    const eventVoice = voiceById.get(event.evidenceVoiceId);
    if (
      event.sourceAssertionKind === "funder-record" &&
      (event.funderOrganisationId === null ||
        eventVoice?.speakingOrganisationId !== event.funderOrganisationId)
    ) {
      addIssue(context, ["fundingEvents", index, "evidenceVoiceId"], "a funder record needs the exact funder organisation voice");
    }
    if (event.comparisonContext.organisationId !== event.recipientOrganisationId) {
      addIssue(context, ["fundingEvents", index, "comparisonContext", "organisationId"], "funding event context must use its recipient organisation");
    }
  }
  for (const [index, fact] of dataset.financialFacts.entries()) {
    requireRef(organisationIds, fact.organisationId, ["financialFacts", index, "organisationId"], "organisation");
    if (fact.comparisonContext.organisationId !== fact.organisationId) {
      addIssue(context, ["financialFacts", index, "comparisonContext", "organisationId"], "financial fact context must use its organisation");
    }
    requireSourceUses(fact.sourceUses, "financialFacts", index, "financial-fact", [fact.organisationId]);
    requireVoiceEvidence(fact.evidenceVoiceId, fact.sourceAssertionKind, fact.sourceUses, "financialFacts", index, fact.organisationId);
    const metricMustBePeopleDerived =
      fact.metric === "staff-costs-aggregate" ||
      fact.metric === "remuneration-bands-aggregate" ||
      fact.metric === "trustee-remuneration-aggregate";
    if (
      metricMustBePeopleDerived &&
      fact.statisticalDisclosureReview.populationBasis !==
        "people-derived-aggregate"
    ) {
      addIssue(
        context,
        ["financialFacts", index, "statisticalDisclosureReview", "populationBasis"],
        "staff-cost and remuneration metrics are people-derived aggregates"
      );
    }
    if (
      fact.statementStatus === "derived-exact-arithmetic" &&
      fact.sourceAssertionKind !== "taxsorted-derived"
    ) {
      addIssue(context, ["financialFacts", index, "sourceAssertionKind"], "derived arithmetic needs a TaxSorted-derived assertion");
    }
    if (
      fact.statementStatus !== "derived-exact-arithmetic" &&
      fact.sourceAssertionKind === "taxsorted-derived"
    ) {
      addIssue(
        context,
        ["financialFacts", index, "sourceAssertionKind"],
        "a TaxSorted-derived financial fact must use structured derived-exact-arithmetic"
      );
    }
    if (fact.statementStatus === "audited" && fact.sourceAssertionKind !== "auditor-opinion") {
      addIssue(context, ["financialFacts", index, "sourceAssertionKind"], "audited status needs an auditor opinion");
    }
    if (fact.derivation) {
      const inputIds = fact.derivation.terms.map(
        (term) => term.inputFinancialFactId
      );
      requireRefs(
        financialFactIds,
        inputIds,
        ["financialFacts", index, "derivation", "terms"],
        "financial fact"
      );
      if (new Set(inputIds).size !== inputIds.length) {
        addIssue(
          context,
          ["financialFacts", index, "derivation", "terms"],
          "financial fact derivation cannot repeat an input"
        );
      }
      if (inputIds.includes(fact.id)) {
        addIssue(
          context,
          ["financialFacts", index, "derivation"],
          "financial fact derivation cannot include itself"
        );
      }
      let derivedAmountMinor = 0;
      let arithmeticSafe = true;
      let latestInputReadyMillis = Number.NEGATIVE_INFINITY;
      let hasPeopleDerivedInput = false;
      for (const [termIndex, term] of fact.derivation.terms.entries()) {
        const input = financialFactById.get(term.inputFinancialFactId);
        if (!input) continue;
        latestInputReadyMillis = Math.max(
          latestInputReadyMillis,
          Date.parse(input.observedAt),
          Date.parse(input.privacyReview.reviewedAt),
          input.statisticalDisclosureReview
            ? Date.parse(input.statisticalDisclosureReview.reviewedAt)
            : Number.NEGATIVE_INFINITY
        );
        if (
          input.statisticalDisclosureReview?.populationBasis ===
          "people-derived-aggregate"
        ) {
          hasPeopleDerivedInput = true;
        }
        const termPath = [
          "financialFacts",
          index,
          "derivation",
          "terms",
          termIndex,
        ] as PropertyKey[];
        if (input.organisationId !== fact.organisationId) {
          addIssue(
            context,
            [...termPath, "inputFinancialFactId"],
            "derived financial facts and inputs must use the same organisation"
          );
        }
        if (canonical(input.comparisonContext.period) !== canonical(fact.comparisonContext.period)) {
          addIssue(
            context,
            [...termPath, "inputFinancialFactId"],
            "derived financial facts and inputs must use the same period"
          );
        }
        if (
          canonical(input.money.basis) !== canonical(fact.money.basis) ||
          input.money.measurementStage !== fact.money.measurementStage ||
          input.money.amountAsOf !== fact.money.amountAsOf
        ) {
          addIssue(
            context,
            [...termPath, "inputFinancialFactId"],
            "derived financial facts and inputs must use the same money basis, measurement stage and amount date"
          );
        }
        if (
          input.comparisonContext.scopeKey !== fact.comparisonContext.scopeKey ||
          input.comparisonContext.scopeDefinition !==
            fact.comparisonContext.scopeDefinition
        ) {
          addIssue(
            context,
            [...termPath, "inputFinancialFactId"],
            "derived financial facts and inputs must use the same scope key and definition"
          );
        }
        const nextAmount =
          derivedAmountMinor + term.coefficient * input.money.amountMinor;
        if (!Number.isSafeInteger(nextAmount)) arithmeticSafe = false;
        derivedAmountMinor = nextAmount;
      }
      if (Date.parse(fact.observedAt) < latestInputReadyMillis) {
        addIssue(
          context,
          ["financialFacts", index, "observedAt"],
          "derived financial fact cannot precede its inputs and their required reviews"
        );
      }
      if (
        hasPeopleDerivedInput &&
        fact.statisticalDisclosureReview?.populationBasis !==
          "people-derived-aggregate"
      ) {
        addIssue(
          context,
          [
            "financialFacts",
            index,
            "statisticalDisclosureReview",
            "populationBasis",
          ],
          "a derived financial fact with a people-derived input must be reviewed as people-derived"
        );
      }
      if (!arithmeticSafe) {
        addIssue(
          context,
          ["financialFacts", index, "derivation"],
          "derived minor-unit arithmetic exceeds the safe integer range"
        );
      } else if (derivedAmountMinor !== fact.money.amountMinor) {
        addIssue(
          context,
          ["financialFacts", index, "money", "amountMinor"],
          "derived financial fact amount does not equal its signed minor-unit inputs"
        );
      }
    }
  }
  const derivationDependencies = new Map(
    dataset.financialFacts.map((fact) => [
      fact.id,
      fact.derivation?.terms.map((term) => term.inputFinancialFactId) ?? [],
    ])
  );
  const completedDerivations = new Set<string>();
  for (const [index, fact] of dataset.financialFacts.entries()) {
    if (completedDerivations.has(fact.id)) continue;
    const path = new Set<string>();
    const visit = (factId: string) => {
      if (path.has(factId)) {
        addIssue(
          context,
          ["financialFacts", index, "derivation"],
          `financial fact derivation graph contains a cycle through ${factId}`
        );
        return;
      }
      if (completedDerivations.has(factId)) return;
      path.add(factId);
      for (const inputId of derivationDependencies.get(factId) ?? []) {
        if (derivationDependencies.has(inputId)) visit(inputId);
      }
      path.delete(factId);
      completedDerivations.add(factId);
    };
    visit(fact.id);
  }
  for (const [index, asset] of dataset.assetAggregates.entries()) {
    requireRef(organisationIds, asset.organisationId, ["assetAggregates", index, "organisationId"], "organisation");
    requireSourceUses(asset.sourceUses, "assetAggregates", index, "asset-aggregate", [asset.organisationId]);
    requireVoiceEvidence(asset.evidenceVoiceId, asset.sourceAssertionKind, asset.sourceUses, "assetAggregates", index, asset.organisationId);
    if (asset.comparisonContext.organisationId !== asset.organisationId) {
      addIssue(context, ["assetAggregates", index, "comparisonContext", "organisationId"], "asset context must use its organisation");
    }
  }
  for (const [index, relation] of dataset.controlRelations.entries()) {
    requireRef(organisationIds, relation.controllerOrganisationId, ["controlRelations", index, "controllerOrganisationId"], "controller organisation");
    requireRef(organisationIds, relation.controlledOrganisationId, ["controlRelations", index, "controlledOrganisationId"], "controlled organisation");
    requireSourceUses(relation.sourceUses, "controlRelations", index, "control-relation", [relation.controllerOrganisationId, relation.controlledOrganisationId]);
    requireVoiceEvidence(relation.evidenceVoiceId, relation.sourceAssertionKind, relation.sourceUses, "controlRelations", index, relation.controlledOrganisationId);
    if (relation.controllerOrganisationId === relation.controlledOrganisationId) {
      addIssue(context, ["controlRelations", index], "an organisation cannot control itself");
    }
  }

  for (const [name, records] of [
    ["observations", dataset.observations],
    ["outcomes", dataset.outcomes],
    ["evaluations", dataset.evaluations],
  ] as const) {
    for (const [index, record] of records.entries()) {
      requireRef(organisationIds, record.organisationId, [name, index, "organisationId"], "organisation");
      requireRef(programmeIds, record.programmeId, [name, index, "programmeId"], "programme");
      if (
        record.programmeId !== null &&
        programmeById.get(record.programmeId)?.organisationId !==
          record.organisationId
      ) {
        addIssue(
          context,
          [name, index, "programmeId"],
          `${name} programme must belong to the record organisation`
        );
      }
      const sourceUseType =
        name === "observations"
          ? "reported-observation"
          : name === "outcomes"
            ? "reported-outcome"
            : "evaluation-finding";
      requireSourceUses(record.sourceUses, name, index, sourceUseType, [record.organisationId]);
      requireVoiceEvidence(record.evidenceVoiceId, record.sourceAssertionKind, record.sourceUses, name, index, record.organisationId);
      if (record.comparisonContext.organisationId !== record.organisationId) {
        addIssue(context, [name, index, "comparisonContext", "organisationId"], `${name} context must use its organisation`);
      }
      if ("evaluatorOrganisationId" in record) {
        requireRef(
          organisationIds,
          record.evaluatorOrganisationId,
          [name, index, "evaluatorOrganisationId"],
          "evaluator organisation"
        );
        const evaluationVoice = voiceById.get(record.evidenceVoiceId);
        const evaluator = record.evaluatorOrganisationId
          ? organisationById.get(record.evaluatorOrganisationId)
          : undefined;
        if (record.evaluationType === "self-evaluation") {
          if (
            record.evaluatorOrganisationId !== record.organisationId ||
            record.sourceAssertionKind !== "subject-organisation-self-report" ||
            evaluationVoice?.speakingOrganisationId !== record.organisationId ||
            record.independenceStatus !== "self-reported"
          ) {
            addIssue(context, [name, index, "evaluationType"], "self-evaluation must be tied to the subject organisation and labelled self-reported");
          }
        } else if (record.evaluationType === "independent-evaluation") {
          if (
            !record.evaluatorOrganisationId ||
            record.evaluatorOrganisationId === record.organisationId ||
            evaluator?.role !== "evaluator" ||
            record.sourceAssertionKind !== "independent-evaluation" ||
            evaluationVoice?.speakingOrganisationId !== record.evaluatorOrganisationId ||
            record.independenceStatus !== "independent"
          ) {
            addIssue(context, [name, index, "evaluationType"], "independent evaluation needs an exact, separate evaluator organisation and matching voice");
          }
        } else if (record.evaluationType === "regulatory-review") {
          if (
            !record.evaluatorOrganisationId ||
            evaluator?.role !== "regulator" ||
            record.sourceAssertionKind !== "regulator-finding" ||
            evaluationVoice?.speakingOrganisationId !== record.evaluatorOrganisationId
          ) {
            addIssue(context, [name, index, "evaluationType"], "regulatory review needs an exact regulator organisation and matching voice");
          }
        } else if (record.evaluationType === "audit") {
          if (
            !record.evaluatorOrganisationId ||
            evaluator?.role !== "auditor" ||
            record.sourceAssertionKind !== "auditor-opinion" ||
            evaluationVoice?.speakingOrganisationId !== record.evaluatorOrganisationId
          ) {
            addIssue(context, [name, index, "evaluationType"], "audit needs an exact auditor organisation and matching voice");
          }
        } else if (record.evaluationType === "taxsorted-source-comparison") {
          if (
            record.evaluatorOrganisationId !== null ||
            record.sourceAssertionKind !== "taxsorted-derived" ||
            evaluationVoice?.voiceType !== "taxsorted-editorial" ||
            record.independenceStatus !== "not-applicable-taxsorted-analysis"
          ) {
            addIssue(
              context,
              [name, index, "evaluationType"],
              "TaxSorted source comparison needs the editorial voice, no external evaluator and a not-applicable independence label"
            );
          }
        }
        if (
          record.evaluationType !== "taxsorted-source-comparison" &&
          record.independenceStatus === "not-applicable-taxsorted-analysis"
        ) {
          addIssue(
            context,
            [name, index, "independenceStatus"],
            "not-applicable-taxsorted-analysis is reserved for TaxSorted source comparisons"
          );
        }
        if (
          record.evaluationType !== "self-evaluation" &&
          record.independenceStatus === "self-reported"
        ) {
          addIssue(
            context,
            [name, index, "independenceStatus"],
            "self-reported independence is reserved for self-evaluation"
          );
        }
      }
    }
  }

  type ComparableRecord = {
    comparisonContext: z.infer<typeof comparisonContextSchema> | null;
    observedAt: string;
    privacyReview: { reviewedAt: string };
    normalisationReview?: { reviewedAt: string };
    statisticalDisclosureReview?: {
      reviewedAt: string;
      populationBasis:
        | "people-derived-aggregate"
        | "organisation-only-not-person-derived";
    } | null;
    money?: z.infer<typeof moneySchema>;
  };
  const comparableMaps: Record<ComparableCollection, Map<string, ComparableRecord>> = {
    claims: new Map(dataset.claims.map((record) => [record.id, record])),
    fundingEvents: new Map(dataset.fundingEvents.map((record) => [record.id, record])),
    financialFacts: new Map(dataset.financialFacts.map((record) => [record.id, record])),
    assetAggregates: new Map(dataset.assetAggregates.map((record) => [record.id, record])),
    observations: new Map(dataset.observations.map((record) => [record.id, record])),
    outcomes: new Map(dataset.outcomes.map((record) => [record.id, record])),
    evaluations: new Map(dataset.evaluations.map((record) => [record.id, record])),
  };
  const moneyBasisKeys = [
    "currency",
    "accountingBasis",
    "grossOrNet",
    "vatBasis",
    "priceBasis",
    "priceBaseDate",
    "consolidationScope",
  ] as const;

  for (const [index, comparison] of dataset.comparisons.entries()) {
    const left = comparableMaps[comparison.left.collection].get(comparison.left.id);
    const right = comparableMaps[comparison.right.collection].get(comparison.right.id);
    if (!left) addIssue(context, ["comparisons", index, "left"], `unknown comparable record: ${comparison.left.collection}/${comparison.left.id}`);
    if (!right) addIssue(context, ["comparisons", index, "right"], `unknown comparable record: ${comparison.right.collection}/${comparison.right.id}`);
    if (left && right) {
      const recordReadyMillis = (record: ComparableRecord) =>
        Math.max(
          Date.parse(record.observedAt),
          Date.parse(record.privacyReview.reviewedAt),
          record.normalisationReview
            ? Date.parse(record.normalisationReview.reviewedAt)
            : Number.NEGATIVE_INFINITY,
          record.statisticalDisclosureReview
            ? Date.parse(record.statisticalDisclosureReview.reviewedAt)
            : Number.NEGATIVE_INFINITY
        );
      const latestEvidenceReadyMillis = Math.max(
        recordReadyMillis(left),
        recordReadyMillis(right)
      );
      if (
        Date.parse(comparison.review.reviewedAt) < latestEvidenceReadyMillis
      ) {
        addIssue(
          context,
          ["comparisons", index, "review", "reviewedAt"],
          "comparison review cannot precede either referenced record's observation and required reviews"
        );
      }
      const numericDisclosureReviewRequired =
        comparison.numericComparison !== null;
      if (
        numericDisclosureReviewRequired !==
        (comparison.statisticalDisclosureReview !== null)
      ) {
        addIssue(
          context,
          ["comparisons", index, "statisticalDisclosureReview"],
          numericDisclosureReviewRequired
            ? "every numeric comparison needs a fresh statistical disclosure review"
            : "a non-numeric comparison does not use a statistical disclosure review"
        );
      }
      const hasPeopleDerivedInput = [left, right].some(
        (record) =>
          record.statisticalDisclosureReview?.populationBasis ===
          "people-derived-aggregate"
      );
      if (
        comparison.numericComparison !== null &&
        hasPeopleDerivedInput &&
        comparison.statisticalDisclosureReview?.populationBasis !==
          "people-derived-aggregate"
      ) {
        addIssue(
          context,
          [
            "comparisons",
            index,
            "statisticalDisclosureReview",
            "populationBasis",
          ],
          "a numeric comparison with a people-derived input must be reviewed as people-derived"
        );
      }
      if (comparison.statisticalDisclosureReview !== null) {
        requireNotAfterGenerated(
          comparison.statisticalDisclosureReview.reviewedAt,
          ["comparisons", index, "statisticalDisclosureReview", "reviewedAt"],
          "comparison statistical disclosure review"
        );
        if (
          Date.parse(comparison.statisticalDisclosureReview.reviewedAt) <
          Math.max(
            latestEvidenceReadyMillis,
            Date.parse(comparison.review.reviewedAt)
          )
        ) {
          addIssue(
            context,
            [
              "comparisons",
              index,
              "statisticalDisclosureReview",
              "reviewedAt",
            ],
            "comparison statistical disclosure review cannot precede its evidence or editorial review"
          );
        }
      }
      if (
        Date.parse(comparison.privacyReview.reviewedAt) <
        Math.max(
          latestEvidenceReadyMillis,
          Date.parse(comparison.review.reviewedAt),
          comparison.statisticalDisclosureReview
            ? Date.parse(comparison.statisticalDisclosureReview.reviewedAt)
            : Number.NEGATIVE_INFINITY
        )
      ) {
        addIssue(
          context,
          ["comparisons", index, "privacyReview", "reviewedAt"],
          "comparison privacy review cannot precede its evidence or editorial review"
        );
      }
    }
    if (comparison.left.collection === comparison.right.collection && comparison.left.id === comparison.right.id) {
      addIssue(context, ["comparisons", index], "a record cannot be compared with itself");
    }
    if (left && left.comparisonContext === null) {
      addIssue(context, ["comparisons", index, "left"], "compared record has no comparison context");
    }
    if (right && right.comparisonContext === null) {
      addIssue(context, ["comparisons", index, "right"], "compared record has no comparison context");
    }

    const leftContext = left?.comparisonContext ?? null;
    const rightContext = right?.comparisonContext ?? null;
    let actualDimensions:
      | {
          sameOrganisation: boolean;
          samePeriod: boolean;
          sameScope: boolean;
          sameMetric: boolean;
        }
      | undefined;

    if (leftContext && rightContext) {
      // The comparison-level context is the stable left-record anchor. The
      // right record may intentionally differ for not-comparable and
      // change-over-time; dimensionDecision records those exact differences.
      if (canonical(comparison.comparisonContext) !== canonical(leftContext)) {
        addIssue(
          context,
          ["comparisons", index, "comparisonContext"],
          "comparison context must exactly match the left record context"
        );
      }

      actualDimensions = {
        sameOrganisation:
          leftContext.organisationId === rightContext.organisationId,
        samePeriod: canonical(leftContext.period) === canonical(rightContext.period),
        sameScope:
          leftContext.scopeKey === rightContext.scopeKey &&
          leftContext.scopeDefinition === rightContext.scopeDefinition,
        sameMetric:
          leftContext.metricKey === rightContext.metricKey &&
          leftContext.metricDefinition === rightContext.metricDefinition,
      };

      for (const key of [
        "sameOrganisation",
        "samePeriod",
        "sameScope",
        "sameMetric",
      ] as const) {
        if (comparison.dimensionDecision[key] !== actualDimensions[key]) {
          addIssue(
            context,
            ["comparisons", index, "dimensionDecision", key],
            `${key} must match the two referenced record contexts`
          );
        }
      }

      const exactContextRelations = new Set([
        "consistent-with",
        "inconsistent-with",
        "supports",
        "qualifies",
      ]);
      if (
        exactContextRelations.has(comparison.relation) &&
        Object.values(actualDimensions).some((matched) => !matched)
      ) {
        addIssue(
          context,
          ["comparisons", index, "relation"],
          `${comparison.relation} requires the same organisation, period, scope and metric`
        );
      }

      if (comparison.relation === "change-over-time") {
        if (
          !actualDimensions.sameOrganisation ||
          !actualDimensions.sameScope ||
          !actualDimensions.sameMetric ||
          actualDimensions.samePeriod
        ) {
          addIssue(
            context,
            ["comparisons", index, "relation"],
            "change-over-time requires the same organisation, scope and metric across different periods"
          );
        }
      }
      const leftMoney = left?.money;
      const rightMoney = right?.money;
      if (
        comparison.relation === "inconsistent-with" &&
        leftMoney &&
        rightMoney
      ) {
        const moneyBasisDiffers = moneyBasisKeys.some(
          (key) => leftMoney.basis[key] !== rightMoney.basis[key]
        );
        if (
          moneyBasisDiffers ||
          leftMoney.measurementStage !== rightMoney.measurementStage ||
          leftMoney.amountAsOf !== rightMoney.amountAsOf
        ) {
          addIssue(
            context,
            ["comparisons", index, "relation"],
            "inconsistent money records require the same money basis, measurement stage and amount date"
          );
        }
      }
    }

    if (
      comparison.relation === "not-comparable" &&
      comparison.numericComparison !== null
    ) {
      addIssue(
        context,
        ["comparisons", index, "numericComparison"],
        "not-comparable cannot carry a numeric comparison"
      );
    }
    if (comparison.numericComparison !== null) {
      if (
        actualDimensions &&
        (!actualDimensions.sameOrganisation ||
          !actualDimensions.sameScope ||
          !actualDimensions.sameMetric ||
          (!actualDimensions.samePeriod &&
            comparison.relation !== "change-over-time"))
      ) {
        addIssue(
          context,
          ["comparisons", index, "numericComparison"],
          "numeric comparison needs matching organisation, scope and metric; a period difference is allowed only for change-over-time"
        );
      }
      if (!left?.money || !right?.money) {
        addIssue(context, ["comparisons", index, "numericComparison"], "numeric money comparison needs money records on both sides");
      } else {
        for (const key of moneyBasisKeys) {
          if (left.money.basis[key] !== right.money.basis[key]) {
            addIssue(context, ["comparisons", index, "numericComparison"], `money is not comparable: ${key} differs`);
          }
        }
        if (
          comparison.numericComparison.operation ===
          "difference-right-minus-left"
        ) {
          const expected = right.money.amountMinor - left.money.amountMinor;
          if (!Number.isSafeInteger(expected)) {
            addIssue(
              context,
              ["comparisons", index, "numericComparison", "resultMinor"],
              "money difference exceeds the safe integer range"
            );
          } else if (comparison.numericComparison.resultMinor !== expected) {
            addIssue(
              context,
              ["comparisons", index, "numericComparison", "resultMinor"],
              "numeric comparison result does not exactly match the source minor-unit amounts"
            );
          }
        } else if (left.money.amountMinor === 0) {
          addIssue(
            context,
            ["comparisons", index, "numericComparison", "denominatorMinor"],
            "ratio denominator cannot be zero"
          );
        } else if (
          comparison.numericComparison.numeratorMinor !==
            right.money.amountMinor ||
          comparison.numericComparison.denominatorMinor !==
            left.money.amountMinor
        ) {
          addIssue(
            context,
            ["comparisons", index, "numericComparison"],
            "ratio must preserve the exact source minor-unit numerator and denominator"
          );
        }
      }
    }
  }

  for (const [index, gap] of dataset.coverageGaps.entries()) {
    requireRef(organisationIds, gap.organisationId, ["coverageGaps", index, "organisationId"], "organisation");
    requireRefs(documentIds, gap.sourceDocumentIds, ["coverageGaps", index, "sourceDocumentIds"], "document");
  }

  const tombstonesByCarrierRelease = new Map<string, number>();
  for (const [index, tombstone] of dataset.tombstones.entries()) {
    requireRef(releaseIds, tombstone.releaseId, ["tombstones", index, "releaseId"], "release");
    const tombstoneRelease = releaseIds.get(tombstone.releaseId);
    if (tombstoneRelease) {
      tombstonesByCarrierRelease.set(
        tombstone.releaseId,
        (tombstonesByCarrierRelease.get(tombstone.releaseId) ?? 0) + 1
      );
    }
    if (
      tombstoneRelease &&
      Date.parse(tombstone.effectiveAt) >
        Date.parse(tombstoneRelease.candidateAssembledAt)
    ) {
      addIssue(
        context,
        ["tombstones", index, "releaseId"],
        "a tombstone cannot take effect after the candidate release named as its first carrier was assembled"
      );
    }
    if (collectionMaps[tombstone.targetCollection].has(tombstone.targetId)) {
      addIssue(context, ["tombstones", index, "targetId"], "tombstoned record must not remain in the active collection");
    }
    if (tombstone.replacementCollection && tombstone.replacementId) {
      requireRef(collectionMaps[tombstone.replacementCollection], tombstone.replacementId, ["tombstones", index, "replacementId"], "replacement record");
    }
  }

  const currentRelease = releaseIds.get(dataset.meta.currentReleaseId);
  if (!currentRelease) {
    addIssue(context, ["meta", "currentReleaseId"], `unknown release: ${dataset.meta.currentReleaseId}`);
  }
  for (const [index, release] of dataset.releases.entries()) {
    requireRef(releaseIds, release.previousReleaseId, ["releases", index, "previousReleaseId"], "previous release");
    if (release.previousReleaseId === release.id) {
      addIssue(context, ["releases", index, "previousReleaseId"], "a release cannot precede itself");
    }
    const predecessor = release.previousReleaseId
      ? releaseIds.get(release.previousReleaseId)
      : undefined;
    if (
      predecessor &&
      Date.parse(predecessor.candidateAssembledAt) >
        Date.parse(release.candidateAssembledAt)
    ) {
      addIssue(
        context,
        ["releases", index, "previousReleaseId"],
        "a predecessor candidate cannot be assembled after its child"
      );
    }
  }
  const checkedReleaseIds = new Set<string>();
  const releaseIndexes = new Map(
    dataset.releases.map((release, index) => [release.id, index])
  );
  for (const release of dataset.releases) {
    if (checkedReleaseIds.has(release.id)) continue;
    const chain = new Set<string>();
    let cursor: (typeof dataset.releases)[number] | undefined = release;
    while (cursor) {
      if (chain.has(cursor.id)) {
        addIssue(
          context,
          ["releases", releaseIndexes.get(cursor.id) ?? 0, "previousReleaseId"],
          `release predecessor graph contains a cycle through ${cursor.id}`
        );
        break;
      }
      if (checkedReleaseIds.has(cursor.id)) break;
      chain.add(cursor.id);
      cursor = cursor.previousReleaseId
        ? releaseIds.get(cursor.previousReleaseId)
        : undefined;
    }
    for (const releaseId of chain) checkedReleaseIds.add(releaseId);
  }
  for (const [index, release] of dataset.releases.entries()) {
    let expectedTombstones = 0;
    const countedReleaseIds = new Set<string>();
    let countCursor: (typeof dataset.releases)[number] | undefined = release;
    while (countCursor && !countedReleaseIds.has(countCursor.id)) {
      countedReleaseIds.add(countCursor.id);
      expectedTombstones +=
        tombstonesByCarrierRelease.get(countCursor.id) ?? 0;
      countCursor = countCursor.previousReleaseId
        ? releaseIds.get(countCursor.previousReleaseId)
        : undefined;
    }
    if (release.recordCounts.tombstones !== expectedTombstones) {
      addIssue(
        context,
        ["releases", index, "recordCounts", "tombstones"],
        "release tombstone count must equal the cumulative retained ledger through that release"
      );
    }
  }
  if (currentRelease) {
    const currentChain = new Set<string>();
    let chainCursor: (typeof dataset.releases)[number] | undefined =
      currentRelease;
    while (chainCursor && !currentChain.has(chainCursor.id)) {
      currentChain.add(chainCursor.id);
      chainCursor = chainCursor.previousReleaseId
        ? releaseIds.get(chainCursor.previousReleaseId)
        : undefined;
    }
    for (const [index, release] of dataset.releases.entries()) {
      if (!currentChain.has(release.id)) {
        addIssue(
          context,
          ["releases", index, "id"],
          "every release must be reachable from meta.currentReleaseId in one predecessor chain"
        );
      }
    }
    for (const name of collectionNames) {
      if (currentRelease.recordCounts[name] !== dataset[name].length) {
        addIssue(context, ["releases", dataset.releases.indexOf(currentRelease), "recordCounts", name], `current release count does not match ${name}`);
      }
    }
    const expectedDigest = computeUkCharityAccountabilityDatasetDigest(dataset);
    if (currentRelease.datasetDigest !== expectedDigest) {
      addIssue(
        context,
        [
          "releases",
          dataset.releases.indexOf(currentRelease),
          "datasetDigest",
        ],
        `current release datasetDigest does not match ${currentRelease.digestPreimage}`
      );
    }
  }
}

export const ukCharityAccountabilitySchema = datasetBaseSchema.superRefine(validateDataset);

export type UkCharityAccountabilityDataset = z.infer<
  typeof ukCharityAccountabilitySchema
>;

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}

export const ukCharityAccountabilitySchemaDocument = deepFreeze({
  ...z.toJSONSchema(ukCharityAccountabilitySchema),
  $id: "https://api.taxsorted.io/v1/charities/uk/accountability/schema",
  title: "UK charity organisation accountability dataset",
  description:
    "Candidate-only shape for organisation-level UK charity accountability records. The public endpoint returns no rows, and this schema is not publication admission.",
});

export const ukCharityAccountabilityFramework = deepFreeze({
  id: "uk-charity-accountability",
  schemaId: "taxsorted.uk.charity-accountability/1",
  status: "schema-only-not-admitted",
  purpose:
    "Keep attributed normalisations of what sources report organisations said, funded and did traceable without building a people or belief graph or presenting reports as independent proof.",
  orientation: {
    startHere: [
      "publicationBlockers",
      "admissionConditions",
      "hardBoundaries",
      "collectionOrder",
    ],
    readingPath: [
      "organisations and exact identifiers establish which registered organisation or official institution is in view",
      "documents establish the public source door, link decision and separately reviewed derived uses",
      "voices and claims attribute a human-approved faithful paraphrase and point readers to the publisher's words as available at review time; source permanence fields say whether a version or lawful archive is known",
      "programmes, funding, finance, assets and control preserve what admitted sources report about the organisation-level machinery",
      "observations, outcomes and evaluations keep reported activity, result and judgement separate without treating any one as independent proof",
      "comparisons expose aligned evidence and coverage gaps preserve what is not known",
    ],
    safeNextActions: [
      "read the JSON Schema before producing a candidate dataset",
      "treat every validated dataset as a candidate-not-admitted shape",
      "use exact published identifiers and create a coverage gap when an exact join is unavailable",
      "send sensitive corrections through the future confidential intake, never a public issue",
    ],
  },
  publicationBlockers: [
    {
      id: "confidential-correction-safety-intake",
      status: "blocking",
      requirement:
        "A confidential correction and safety intake with identity-safe triage, urgent suppression and an auditable resolution path must exist and be tested.",
    },
    {
      id: "asset-level-rights-admission-digest",
      status: "blocking",
      requirement:
        "Every source asset needs a separate link decision and locator-specific derived-use decision. Locator equality is checked, but meaning and resolvability are human assertions. Its digest detects mutation of the declared review record; it does not prove legality or reviewer identity.",
    },
  ],
  publicationBlockerScope:
    "These are the two immediate missing systems, not the complete publication test. Every admissionConditions item must also be evidenced and approved.",
  admissionConditions: [
    {
      id: "named-blockers-resolved",
      status: "required-not-satisfied",
      requirement: "Both immediate publication blockers are resolved and tested.",
    },
    {
      id: "controller-lawful-basis-retention-and-rights",
      status: "required-not-satisfied",
      requirement:
        "The real controller, processors, purposes, lawful basis, retention, privacy information and rights handling are recorded for the operational pipeline.",
    },
    {
      id: "formal-dpia-decision",
      status: "required-not-satisfied",
      requirement:
        "A formal DPIA decision covers the actual sources, fields, combinations, screening and publication interface.",
    },
    {
      id: "asset-rights-expiry-and-locator-review",
      status: "required-not-satisfied",
      requirement:
        "Every exact source asset has separate link and derived-use decisions, a mutation-detection digest, human-reviewed locators and a review-expiry date.",
    },
    {
      id: "small-territorial-field-set-reviewed",
      status: "required-not-satisfied",
      requirement:
        "One deliberately small territorial source and field allowlist passes legal, privacy, security and editorial review.",
    },
    {
      id: "end-to-end-correction-and-rollback-exercised",
      status: "required-not-satisfied",
      requirement:
        "Exact-ID bridges, source change, correction, urgent suppression, tombstones, cache handling and full rollback are exercised end to end.",
    },
    {
      id: "comparison-review-guidance-calibrated",
      status: "required-not-satisfied",
      requirement:
        "Human comparison reviewers have written guidance, calibration examples, appeal handling and periodic error review.",
    },
    {
      id: "public-meaning-and-limits-explained",
      status: "required-not-satisfied",
      requirement:
        "The public interface keeps source voice, TaxSorted analysis, uncertainty, money dimensions, source permanence and non-equivalence visible.",
    },
    {
      id: "monitored-emergency-stop",
      status: "required-not-satisfied",
      requirement:
        "A monitored off-switch can stop organisation records without removing the sector framework or official source doors.",
    },
  ],
  hardBoundaries: [
    "organisation-level records only",
    "no natural-person records or identifiers",
    "no contact details or addresses",
    "no named pay",
    "no personal belief data and no belief inference",
    "no fuzzy, probabilistic or name-only joins",
    "every identifier mapping is listed by its referenced organisation and every listed mapping points back; uppercase-alphanumeric canonicalisation accepts only ASCII letters, digits, spaces and hyphens",
    "multiple official identifiers need a human-reviewed source bridge that explicitly publishes both identifiers; a privacy flag alone is not a bridge",
    "documents store reviewed metadata plus bounded public source-review declarations and notes; source bodies, excerpts, images and attachments remain external and are not stored",
    "every public document and source-review field is human-reviewed to exclude people, contacts, addresses, named pay, personal belief detail or belief inference about a person, and source excerpts; locators are pointers only and free-text arrays are bounded",
    "source locators are human-reviewed editorial assertions, not mechanically verified anchors or a source archive",
    "a value needing statistical suppression is omitted from value-bearing collections and represented by a coverage gap with fixed safe wording and no source-document pointer",
    "every financial fact has a disclosure review and states whether it is genuinely organisation-only or people-derived; staff costs and remuneration are always people-derived",
    "every derived financial fact and numeric comparison has a fresh disclosure review; people-derived status propagates from inputs",
    "taxsorted-derived is reserved for structured exact-arithmetic financial facts and labelled TaxSorted source-comparison evaluations; other action and money records remain externally attributed",
    "asset values remain aggregates; no item-level asset or location records",
    "control relations connect organisations only",
    "public record IDs and retained tombstone target IDs must be opaque or non-personal and human-reviewed",
  ],
  publicationAdmission: {
    currentSchema: "candidate-shape-only",
    datasetStatus: "candidate-not-admitted",
    externalEnvelopeRequired: true,
    requirement:
      "A later versioned publication envelope must resolve every admission condition and real confidential-intake, source-review, emergency-stop and human-approval check ID against an operational audit store. Fields supplied inside this dataset cannot prove those checks happened.",
    digestMeaning:
      "Dataset and source-review digests detect mutation of declared bytes only; they prove neither legality, reviewer identity nor external workflow completion.",
  },
  validationLayers: {
    jsonSchema:
      "Validates strict record shapes, required fields, literals, formats and local constraints.",
    runtimeZod:
      "Also validates the declared all-public document/source-review field scope, bounded review text, reviewed source-use permission and locator equality, source subjects, voice roles and modalities, bidirectional identifier membership, identifier alphabets, ownership and bridge connectivity, programme ownership, reserved TaxSorted-derived assertions, every financial fact's disclosure decision, forced people-derived treatment for staff costs and remuneration, publishable and propagated disclosure reviews, final privacy-after-disclosure ordering, safe suppression gaps, structured integer arithmetic and derivation cycles, comparison alignment, review-time ordering, release counts, sorting and safe tombstones.",
    requirement:
      "A candidate producer should pass the runtime Zod schema. Neither JSON Schema nor Zod validation is publication admission.",
  },
  collectionOrder: [
    "organisations",
    "identifierMappings",
    "documents",
    "voices",
    "claims",
    "programmes",
    "fundingEvents",
    "financialFacts",
    "assetAggregates",
    "controlRelations",
    "observations",
    "outcomes",
    "evaluations",
    "comparisons",
    "coverageGaps",
    "tombstones",
    "releases",
  ],
  collectionGuide: [
    {
      collection: "organisations",
      question: "Which registered organisation or official institution is in view?",
      boundary: "Organisation-only identity with exact public identifiers; no people or contacts.",
    },
    {
      collection: "identifierMappings",
      question: "Which exact official identifier establishes the join?",
      boundary: "Bidirectional organisation membership and declared ASCII canonicalisation; no name, address, domain, person, award-ID or probabilistic join.",
    },
    {
      collection: "documents",
      question: "Which reviewed public source door supports the record?",
      boundary: "Reviewed document metadata plus bounded public review declarations and notes; every field is screened, locators are pointers, and source bodies, excerpts, images and attachments stay external.",
    },
    {
      collection: "voices",
      question: "Which institution is attributed as speaking?",
      boundary: "Organisation capacity or TaxSorted editorial voice; never a natural-person profile.",
    },
    {
      collection: "claims",
      question: "What does the source report the attributed institution said?",
      boundary: "Human-reviewed paraphrase and modality, not quotation or truth verdict.",
    },
    {
      collection: "programmes",
      question: "What organised work was planned or delivered?",
      boundary: "Aggregate programme scope only; no beneficiary rows.",
    },
    {
      collection: "fundingEvents",
      question: "What organisation-level award, commitment, payment or aggregate flow was reported?",
      boundary: "Money stage stays explicit; anonymous or aggregate funding needs disclosure review.",
    },
    {
      collection: "financialFacts",
      question: "What aggregate financial fact was filed or exactly derived?",
      boundary: "Integer GBP minor units, complete basis and aggregate pay only; every fact has a disclosure review, staff costs and remuneration are always people-derived, every TaxSorted-derived number uses structured exact arithmetic with a fresh result review, and named pay is never stored.",
    },
    {
      collection: "assetAggregates",
      question: "What aggregate asset value was reported?",
      boundary: "Category totals only; no asset identity, address or location.",
    },
    {
      collection: "controlRelations",
      question: "Which organisation controls or is formally linked to which organisation?",
      boundary: "Organisation-to-organisation exact official links; no person-control graph.",
    },
    {
      collection: "observations",
      question: "What organisation-level action or event was recorded?",
      boundary: "Source-backed observation with disclosure review, separate from outcome or proof.",
    },
    {
      collection: "outcomes",
      question: "What aggregate result was reported or measured?",
      boundary: "Aggregate scope and attribution strength; no individual outcome rows.",
    },
    {
      collection: "evaluations",
      question: "Who evaluated the work, by what method and with what independence?",
      boundary: "Organisation evaluator and reviewed finding; TaxSorted analysis is never labelled independent.",
    },
    {
      collection: "comparisons",
      question: "How do two exact candidate records relate?",
      boundary: "Human-approved rule and visible context; every numeric result has a fresh disclosure review; no trust, faith, honesty or impact score.",
    },
    {
      collection: "coverageGaps",
      question: "What is unknown, unavailable, conflicting, unsafe or deliberately excluded?",
      boundary: "Absence stays visible. Suppression uses fixed safe wording and no source-document pointer, so the omitted value and its context are not repeated.",
    },
    {
      collection: "tombstones",
      question: "Which record was removed, when and by which safe reason?",
      boundary: "Fixed explanation and reviewed non-personal identifiers; removed content is never repeated, and effective time cannot postdate the named candidate's assembly.",
    },
    {
      collection: "releases",
      question: "Which immutable candidate chain was assembled?",
      boundary: "Candidate history only; a digest detects declared-byte mutation but is not publication approval.",
    },
  ],
  stableSort: {
    rule: "collection-order-then-ascii-id-ascending",
    reason:
      "Record IDs are restricted to 1–100 lowercase ASCII letters, digits and hyphens, making bytewise ascending order stable across runtimes and locales and bounding identifier metadata.",
    ties: "forbidden because IDs are unique within and across record collections",
  },
  cursor: {
    version: "taxsorted.cursor/1",
    encoding: "base64url of canonical UTF-8 JSON",
    payloadFieldsInOrder: ["version", "releaseId", "collection", "lastId"],
    stability:
      "A cursor is valid only for its immutable release. A different release requires a new cursor; records are never inserted into an old release.",
    invalidCursor:
      "Fail with a typed error and a safe next action to restart at the first page of the requested release.",
  },
  releaseIntegrity: {
    digestAlgorithm: accountabilityDatasetDigestAlgorithm,
    digestPreimage: accountabilityDatasetDigestPreimage,
    verification:
      "The current candidate digest is recomputed and must match during validation. It detects mutation of declared bytes and is not proof of source rights, review identity or publication approval.",
    predecessorRule:
      "Every previousReleaseId must resolve, be assembled no later than its child and form one acyclic chain in which every candidate is reachable from meta.currentReleaseId. A tombstone cannot take effect after the candidate named by its releaseId was assembled; that is the first candidate carrying it. The tombstone remains in every later candidate, whose tombstone count must equal the cumulative retained ledger.",
  },
  comparableMoney: {
    storage: "signed integer minor units; GBP only in version 1",
    exactContextFields: [
      "organisationId",
      "period",
      "scopeKey",
      "scopeDefinition",
      "metricKey",
      "metricDefinition",
    ],
    exactBasisFields: [
      "currency",
      "accountingBasis",
      "grossOrNet",
      "vatBasis",
      "priceBasis",
      "priceBaseDate",
      "consolidationScope",
    ],
    stageRule:
      "Measurement stage must be displayed. A forecast, commitment, payment and outturn are different stages even when arithmetic comparison is possible.",
    mismatchRule:
      "If organisation, scope, definition, metric or a money-basis field differs, do not calculate a delta or ratio; record not-comparable in the candidate and name the differing dimensions. A period difference permits arithmetic only for an explicit change-over-time relation.",
    calculationRule:
      "Differences use right amount minus left amount and must remain a safe integer. Ratios preserve right and left minor-unit amounts as an exact numerator and non-zero denominator; no floating-point quotient is stored. A derived financial fact follows its inputs and reviews, then receives a fresh disclosure review. A numeric comparison's fresh disclosure review follows both records and the human comparison review. People-derived status propagates to either result.",
  },
  comparisonContract: {
    contextAnchor:
      "comparisonContext repeats the left record's exact context; the right record retains its own context.",
    dimensions:
      "sameOrganisation, samePeriod, sameScope and sameMetric are declared by the producer, recomputed from the referenced records and must match. For inconsistent-with between two money records, money basis, measurement stage and amount date must also match.",
    exactContextRelations: [
      "consistent-with",
      "inconsistent-with",
      "supports",
      "qualifies",
    ],
    notComparable:
      "not-comparable may preserve differing contexts or money bases and cannot carry numericComparison.",
    changeOverTime:
      "change-over-time requires the same organisation, scope and metric across different periods.",
  },
  inconsistencyRule: {
    relation: "inconsistent-with",
    requirements: [
      "human-approved review",
      "exact published organisation identifier",
      "same organisation",
      "same period",
      "same scope key and scope definition",
      "same metric key and metric definition",
      "for two money records: same money basis, measurement stage and amount date",
    ],
    warning:
      "A numerical difference, changed measurement stage or missing record is not by itself evidence of inconsistency.",
  },
});
