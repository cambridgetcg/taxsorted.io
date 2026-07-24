// A public-safe, finite review record for the UK professional-opportunity
// corpus. The pack can support a later hosted-distribution decision, but it
// cannot approve publication, operate a switch or accept private evidence.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { canonicalJson } from "./open-data.js";
import { assertNoDuplicateJsonKeys } from "./strict-json.js";

const strictObject = <T extends z.ZodRawShape>(shape: T) =>
  z.object(shape).strict();
const id = z
  .string()
  .max(160)
  .regex(/^[a-z0-9][a-z0-9-]*$/);
const sha256 = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const date = z.iso.date();
const dateTime = z.string().datetime({ offset: true });
const shortText = z
  .string()
  .min(1)
  .max(1_000)
  .refine(
    (value) => value === value.trim(),
    "public review text must already be trimmed",
  );
const httpsUrl = z
  .string()
  .url()
  .refine((value) => {
    if (!value.startsWith("https://")) return false;
    const url = new URL(value);
    return url.username === "" && url.password === "";
  }, "URL must use HTTPS without embedded credentials");
const publicSafeNarrative = shortText.refine(
  (value) =>
    !/@/u.test(value) &&
    !/(?:^|[\s("'`])\/(?!\/)[a-z0-9._~-]+(?:\/[a-z0-9._~-]+)+/iu.test(
      value,
    ) &&
    !/\b[a-z0-9._~-]+\/[a-z0-9._~-]+\/[a-z0-9._~/-]+\b/iu.test(
      value,
    ) &&
    !/(?:^|[\s("'`])~\//u.test(value) &&
    !/(?:^|[\s("'`])[a-z]:[\\/]/iu.test(value) &&
    !/\\\\/u.test(value) &&
    !/\bfile:\/\//iu.test(value),
  "public review text must not contain @ contact markers or filesystem-shaped paths",
);
const publicRoleLabel = shortText.refine(
  (value) =>
    !/[\\/]/u.test(value) &&
    !/^~/u.test(value) &&
    !/^[a-z]:/iu.test(value) &&
    !/@/u.test(value),
  "public role labels must not contain paths or contact details",
);
const reviewerIds = z.array(id).max(30);
const evidenceIds = z.array(id).max(200);
const optionalDate = date.nullable();
const optionalDateTime = dateTime.nullable();
const optionalPublicSafeNarrative = publicSafeNarrative.nullable();
const optionalPublicRoleLabel = publicRoleLabel.nullable();
const optionalPublicControlReference = shortText
  .refine((value) => {
    if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) {
      return httpsUrl.safeParse(value).success;
    }
    return publicSafeNarrative.safeParse(value).success;
  }, "public controls must be safe text or credential-free HTTPS URLs")
  .nullable();
const opaqueRecordUuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
  );

export const professionalOpportunityReviewRoles = [
  "tax-technical",
  "legal-procedure",
  "editorial-fairness",
  "privacy-security",
  "release-operations",
] as const;

export const professionalOpportunityReviewEvidencePurposes = [
  "source-material",
  "reviewer-qualification",
  "reviewer-independence",
  "review-work",
  "institutional-reply",
  "privacy-security",
  "public-surface",
  "emergency-stop-drill",
  "correction-control",
  "withdrawal-control",
] as const;

export const professionalOpportunityReviewPackBoundaries = [
  "This pack is public-safe review evidence, not hosted-distribution approval.",
  "A complete pack does not change an API, frontend, deployment, intake or marketplace switch.",
  "Keep client facts, contact details, private documents and filesystem paths outside this pack.",
  "A private evidence reference is an opaque UUID held by a named custodian role; it is never the evidence itself.",
  "The corpus is already visible in the public GitHub repository; this pack governs later official TaxSorted hosting and endorsement.",
] as const;

export const professionalOpportunityReviewPackDigestScope =
  "Canonical JSON of this pack excluding the integrity object.";

export const professionalOpportunityReviewPackReferencePrefix =
  "qualified-review-pack@";

const resultSchema = z.enum([
  "pending",
  "confirmed",
  "changes-required",
]);

const reviewerSchema = strictObject({
  id,
  publicName: publicRoleLabel,
  capacity: publicSafeNarrative,
  capacityBasis: publicSafeNarrative,
  capacityVerification: strictObject({
    verifierPublicLabel: publicRoleLabel,
    verifiedOn: date,
    evidenceIds: z.array(id).min(1).max(20),
  }),
  independence: strictObject({
    independentOfCorpusAuthors: z.boolean(),
    independentOfAffectedInstitutionsInScope: z.boolean(),
    noUndisclosedRelevantInterest: z.boolean(),
    declarationEvidenceIds: z.array(id).min(1).max(20),
  }),
  roles: z
    .array(z.enum(professionalOpportunityReviewRoles))
    .min(1)
    .max(professionalOpportunityReviewRoles.length),
  scope: strictObject({
    opportunityIds: z.array(id).max(500),
    scrutinyIds: z.array(id).max(500),
  }),
  qualificationEvidenceIds: z.array(id).min(1).max(20),
  verifiedOn: date,
  consentToPublishLabel: z.literal(true),
});

const evidenceSchema = z.discriminatedUnion("visibility", [
  strictObject({
    id,
    purpose: z.enum(professionalOpportunityReviewEvidencePurposes),
    visibility: z.literal("public-https"),
    url: httpsUrl,
  }),
  strictObject({
    id,
    purpose: z.enum(professionalOpportunityReviewEvidencePurposes),
    visibility: z.literal("private-custodian-record"),
    custodianRole: publicRoleLabel,
    opaqueRecordId: opaqueRecordUuid,
  }),
]);

const sourceCheckSchema = strictObject({
  sourceId: id,
  title: shortText,
  publisher: shortText,
  url: httpsUrl,
  sourceRecordDigest: sha256,
  reviewerIds,
  checkedOn: optionalDate,
  result: z.enum([
    "pending",
    "supports-stated-use",
    "changes-required",
  ]),
  versionOrPublicationDate: optionalPublicSafeNarrative,
  pinpointOrScope: optionalPublicSafeNarrative,
  evidenceIds,
});

const methodAndWorkflowReviewSchema = strictObject({
  reviewerIds,
  completedOn: optionalDate,
  result: resultSchema,
  professionalStatusBoundaryConfirmed: z.boolean(),
  deadlineControlConfirmed: z.boolean(),
  challengeSeparationConfirmed: z.boolean(),
  moneyStateSeparationConfirmed: z.boolean(),
  localCustodyAndNoSubmissionConfirmed: z.boolean(),
  evidenceIds,
});

const opportunityReviewSchema = strictObject({
  opportunityId: id,
  title: shortText,
  territories: z.array(shortText).min(1).max(10),
  opportunityRecordDigest: sha256,
  reviewerIds,
  completedOn: optionalDate,
  result: resultSchema,
  lawAndSourceHierarchyConfirmed: z.boolean(),
  territoryConfirmed: z.boolean(),
  deadlinesAndClockConfirmed: z.boolean(),
  routesAndRemedySeparationConfirmed: z.boolean(),
  professionalGatesAndAuthorityConfirmed: z.boolean(),
  sourceSupportConfirmed: z.boolean(),
  moneyAndOutcomeBoundariesConfirmed: z.boolean(),
  evidenceIds,
});

const rightOfReplySchema = strictObject({
  institution: shortText,
  scrutinyFramingDigest: sha256,
  disposition: z.enum([
    "pending",
    "official-response-documented",
    "fresh-reply-completed",
    "no-response-after-deadline",
    "not-applicable-with-reason",
  ]),
  sentOn: optionalDate,
  replyDueOn: optionalDate,
  receivedOn: optionalDate,
  resolvedOn: optionalDate,
  publicBasis: optionalPublicSafeNarrative,
  evidenceIds,
});

const scrutinyReviewSchema = strictObject({
  scrutinyId: id,
  title: shortText,
  scrutinyFramingDigest: sha256,
  reviewerIds,
  completedOn: optionalDate,
  result: resultSchema,
  statementSupportConfirmed: z.boolean(),
  evidenceStateConfirmed: z.boolean(),
  doesNotProveConfirmed: z.boolean(),
  counterweightOrResponseConfirmed: z.boolean(),
  correctionOrReviewRouteConfirmed: z.boolean(),
  noPersonalTargetOrMotiveInferenceConfirmed: z.boolean(),
  evidenceIds,
  rightOfReply: z.array(rightOfReplySchema).max(100),
});

const controlResultSchema = z.enum(["pending", "pass", "fail"]);

const privacyControlSchema = strictObject({
  reviewerIds,
  completedOn: optionalDate,
  result: controlResultSchema,
  evidenceIds,
});

const publicSurfaceControlSchema = strictObject({
  reviewerIds,
  completedOn: optionalDate,
  result: controlResultSchema,
  noIntake: z.boolean(),
  noMarketplace: z.boolean(),
  noSubmission: z.boolean(),
  noPrivateUpload: z.boolean(),
  evidenceIds,
});

const emergencyStopDrillSchema = strictObject({
  operatorReviewerId: id.nullable(),
  result: controlResultSchema,
  corpusDigest: sha256.nullable(),
  commitSha: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .nullable(),
  environment: z
    .enum(["isolated-control-path", "production-closed-release"])
    .nullable(),
  startedAt: optionalDateTime,
  stopActivatedAt: optionalDateTime,
  apiContainedAt: optionalDateTime,
  frontendContainedAt: optionalDateTime,
  restoredClosedAt: optionalDateTime,
  apiProtectedRoutesReturned503: z.boolean(),
  wakeReportedStopped: z.boolean(),
  safeSchemasRightsAndBlankTemplateRemainedReadable: z.boolean(),
  frontendContainedOnlyClosedShells: z.boolean(),
  cacheDisposition: z
    .enum(["purged", "non-cacheable-isolated-run"])
    .nullable(),
  evidenceIds,
});

const ownerSchema = strictObject({
  primaryPublicLabel: optionalPublicRoleLabel,
  backupPublicLabel: optionalPublicRoleLabel,
  publicRouteOrControl: optionalPublicControlReference,
  accessTestedAt: optionalDateTime,
  evidenceIds,
});

const ownershipControlSchema = strictObject({
  result: controlResultSchema,
  reviewerIds,
  assignedOn: optionalDate,
  correction: ownerSchema,
  withdrawal: ownerSchema,
});

const declarationSchema = strictObject({
  reviewLeadId: id.nullable(),
  reviewStartedOn: optionalDate,
  rightOfReplyResolvedOn: optionalDate,
  completedOn: optionalDate,
  reviewBy: optionalDate,
  publicFieldsDisclosureChecked: z.boolean(),
  privateEvidenceOutsideRepository: z.literal(true),
  publicGithubDisclosureAcknowledged: z.literal(true),
  packDoesNotApproveHostedDistribution: z.literal(true),
});

const professionalOpportunityReviewPackBaseSchema = strictObject({
  schema: z.literal(
    "taxsorted.uk.professional-opportunities-qualified-review-pack/1",
  ),
  status: z.enum(["pending", "changes-required", "complete"]),
  corpus: strictObject({
    version: shortText,
    digest: sha256,
    lawAsAt: date,
    retrievedAt: date,
    opportunityIds: z.array(id).max(500),
    scrutinyIds: z.array(id).max(500),
    sourceIds: z.array(id).max(500),
  }),
  reviewers: z.array(reviewerSchema).max(50),
  evidenceIndex: z.array(evidenceSchema).max(1_000),
  sourceChecks: z.array(sourceCheckSchema).max(500),
  methodAndWorkflowReview: methodAndWorkflowReviewSchema,
  opportunityReviews: z.array(opportunityReviewSchema).max(500),
  scrutinyReviews: z.array(scrutinyReviewSchema).max(500),
  controls: strictObject({
    privacySecurityThreatReview: privacyControlSchema,
    publicSurfaceInspection: publicSurfaceControlSchema,
    emergencyStopDrill: emergencyStopDrillSchema,
    ownership: ownershipControlSchema,
  }),
  declaration: declarationSchema,
  boundaries: z.tuple(
    professionalOpportunityReviewPackBoundaries.map((boundary) =>
      z.literal(boundary),
    ) as [
      z.ZodLiteral<string>,
      z.ZodLiteral<string>,
      z.ZodLiteral<string>,
      z.ZodLiteral<string>,
      z.ZodLiteral<string>,
    ],
  ),
  integrity: strictObject({
    algorithm: z.literal("sha256"),
    digest: sha256,
    digestScope: z.literal(professionalOpportunityReviewPackDigestScope),
  }),
});

type ProfessionalOpportunityReviewPackBase = z.infer<
  typeof professionalOpportunityReviewPackBaseSchema
>;

function addReviewIssue(
  context: z.RefinementCtx,
  path: PropertyKey[],
  message: string,
) {
  context.addIssue({ code: "custom", path, message });
}

function checkUnique(
  values: readonly string[],
  context: z.RefinementCtx,
  path: PropertyKey[],
  label: string,
) {
  if (new Set(values).size !== values.length) {
    addReviewIssue(context, path, `${label} must be unique`);
  }
}

function checkOrderedDates(
  values: Array<string | null>,
  context: z.RefinementCtx,
  path: PropertyKey[],
) {
  const present = values.filter((value): value is string => value !== null);
  for (let index = 1; index < present.length; index++) {
    if (Date.parse(present[index]) < Date.parse(present[index - 1])) {
      addReviewIssue(
        context,
        path,
        "recorded instants must retain chronological order",
      );
      return;
    }
  }
}

function packPreimage(pack: ProfessionalOpportunityReviewPackBase) {
  const { integrity: _integrity, ...preimage } = pack;
  return preimage;
}

function digestValue(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex")}` as const;
}

function evidenceAssignments(
  pack: ProfessionalOpportunityReviewPackBase,
) {
  const assignments: Array<{
    ids: string[];
    purpose: (typeof professionalOpportunityReviewEvidencePurposes)[number];
    path: PropertyKey[];
  }> = [];
  pack.reviewers.forEach((reviewer, index) => {
    assignments.push(
      {
        ids: reviewer.qualificationEvidenceIds,
        purpose: "reviewer-qualification",
        path: ["reviewers", index, "qualificationEvidenceIds"],
      },
      {
        ids: reviewer.capacityVerification.evidenceIds,
        purpose: "reviewer-qualification",
        path: [
          "reviewers",
          index,
          "capacityVerification",
          "evidenceIds",
        ],
      },
      {
        ids: reviewer.independence.declarationEvidenceIds,
        purpose: "reviewer-independence",
        path: [
          "reviewers",
          index,
          "independence",
          "declarationEvidenceIds",
        ],
      },
    );
  });
  pack.sourceChecks.forEach((review, index) =>
    assignments.push({
      ids: review.evidenceIds,
      purpose: "source-material",
      path: ["sourceChecks", index, "evidenceIds"],
    }),
  );
  assignments.push({
    ids: pack.methodAndWorkflowReview.evidenceIds,
    purpose: "review-work",
    path: ["methodAndWorkflowReview", "evidenceIds"],
  });
  pack.opportunityReviews.forEach((review, index) =>
    assignments.push({
      ids: review.evidenceIds,
      purpose: "review-work",
      path: ["opportunityReviews", index, "evidenceIds"],
    }),
  );
  pack.scrutinyReviews.forEach((review, scrutinyIndex) => {
    assignments.push({
      ids: review.evidenceIds,
      purpose: "review-work",
      path: ["scrutinyReviews", scrutinyIndex, "evidenceIds"],
    });
    review.rightOfReply.forEach((reply, replyIndex) =>
      assignments.push({
        ids: reply.evidenceIds,
        purpose: "institutional-reply",
        path: [
          "scrutinyReviews",
          scrutinyIndex,
          "rightOfReply",
          replyIndex,
          "evidenceIds",
        ],
      }),
    );
  });
  assignments.push(
    {
      ids: pack.controls.privacySecurityThreatReview.evidenceIds,
      purpose: "privacy-security",
      path: ["controls", "privacySecurityThreatReview", "evidenceIds"],
    },
    {
      ids: pack.controls.publicSurfaceInspection.evidenceIds,
      purpose: "public-surface",
      path: ["controls", "publicSurfaceInspection", "evidenceIds"],
    },
    {
      ids: pack.controls.emergencyStopDrill.evidenceIds,
      purpose: "emergency-stop-drill",
      path: ["controls", "emergencyStopDrill", "evidenceIds"],
    },
    {
      ids: pack.controls.ownership.correction.evidenceIds,
      purpose: "correction-control",
      path: [
        "controls",
        "ownership",
        "correction",
        "evidenceIds",
      ],
    },
    {
      ids: pack.controls.ownership.withdrawal.evidenceIds,
      purpose: "withdrawal-control",
      path: [
        "controls",
        "ownership",
        "withdrawal",
        "evidenceIds",
      ],
    },
  );
  return assignments;
}

function referencedEvidenceIds(
  pack: ProfessionalOpportunityReviewPackBase,
) {
  return evidenceAssignments(pack).flatMap(
    (assignment) => assignment.ids,
  );
}

function referencedReviewerGroups(
  pack: ProfessionalOpportunityReviewPackBase,
) {
  const groups: string[][] = [
    ...pack.sourceChecks.map((review) => review.reviewerIds),
    pack.methodAndWorkflowReview.reviewerIds,
    ...pack.opportunityReviews.map((review) => review.reviewerIds),
    ...pack.scrutinyReviews.map((review) => review.reviewerIds),
    pack.controls.privacySecurityThreatReview.reviewerIds,
    pack.controls.publicSurfaceInspection.reviewerIds,
    pack.controls.ownership.reviewerIds,
  ];
  if (pack.controls.emergencyStopDrill.operatorReviewerId !== null) {
    groups.push([
      pack.controls.emergencyStopDrill.operatorReviewerId,
    ]);
  }
  if (pack.declaration.reviewLeadId !== null) {
    groups.push([pack.declaration.reviewLeadId]);
  }
  return groups;
}

function validateRightOfReply(
  reply: ProfessionalOpportunityReviewPackBase["scrutinyReviews"][number]["rightOfReply"][number],
  context: z.RefinementCtx,
  path: PropertyKey[],
  complete: boolean,
) {
  checkUnique(reply.evidenceIds, context, [...path, "evidenceIds"], "evidence IDs");
  if (reply.disposition === "pending") {
    if (
      reply.sentOn !== null ||
      reply.replyDueOn !== null ||
      reply.receivedOn !== null ||
      reply.resolvedOn !== null ||
      reply.publicBasis !== null ||
      reply.evidenceIds.length > 0
    ) {
      addReviewIssue(
        context,
        path,
        "a pending right-of-reply row must not claim completed evidence",
      );
    }
    if (complete) {
      addReviewIssue(
        context,
        [...path, "disposition"],
        "a complete pack cannot retain a pending right of reply",
      );
    }
    return;
  }

  if (
    reply.resolvedOn === null ||
    reply.publicBasis === null ||
    reply.evidenceIds.length === 0
  ) {
    addReviewIssue(
      context,
      path,
      "a resolved right-of-reply row needs a date, public basis and evidence",
    );
  }
  if (reply.disposition === "not-applicable-with-reason") {
    if (
      reply.sentOn !== null ||
      reply.replyDueOn !== null ||
      reply.receivedOn !== null
    ) {
      addReviewIssue(
        context,
        path,
        "a reasoned not-applicable row must not claim correspondence dates",
      );
    }
    return;
  }

  if (reply.sentOn === null || reply.replyDueOn === null) {
    addReviewIssue(
      context,
      path,
      "a reply exercise needs sent and response-due dates",
    );
  }
  if (
    reply.sentOn !== null &&
    reply.replyDueOn !== null &&
    reply.replyDueOn < reply.sentOn
  ) {
    addReviewIssue(
      context,
      [...path, "replyDueOn"],
      "the response due date cannot predate sending",
    );
  }
  if (
    reply.disposition === "no-response-after-deadline" &&
    (reply.receivedOn !== null ||
      (reply.replyDueOn !== null &&
        reply.resolvedOn !== null &&
        reply.resolvedOn < reply.replyDueOn))
  ) {
    addReviewIssue(
      context,
      path,
      "no-response can resolve only after its deadline and without a received date",
    );
  }
  if (
    (reply.disposition === "official-response-documented" ||
      reply.disposition === "fresh-reply-completed") &&
    reply.receivedOn === null
  ) {
    addReviewIssue(
      context,
      [...path, "receivedOn"],
      "a documented response needs a received date",
    );
  }
  if (
    reply.sentOn !== null &&
    reply.receivedOn !== null &&
    reply.receivedOn < reply.sentOn
  ) {
    addReviewIssue(
      context,
      [...path, "receivedOn"],
      "a response cannot predate the request",
    );
  }
  if (
    reply.receivedOn !== null &&
    reply.resolvedOn !== null &&
    reply.receivedOn > reply.resolvedOn
  ) {
    addReviewIssue(
      context,
      [...path, "receivedOn"],
      "a response must be received before the row resolves",
    );
  }
}

function validateCompletePack(
  pack: ProfessionalOpportunityReviewPackBase,
  context: z.RefinementCtx,
) {
  const reviewerById = new Map(
    pack.reviewers.map((reviewer) => [reviewer.id, reviewer]),
  );
  const completedOn = pack.declaration.completedOn;
  const reviewLead =
    pack.declaration.reviewLeadId === null
      ? undefined
      : reviewerById.get(pack.declaration.reviewLeadId);

  if (
    pack.declaration.reviewStartedOn === null ||
    pack.declaration.rightOfReplyResolvedOn === null ||
    completedOn === null ||
    pack.declaration.reviewBy === null ||
    reviewLead === undefined ||
    !pack.declaration.publicFieldsDisclosureChecked
  ) {
    addReviewIssue(
      context,
      ["declaration"],
      "a complete pack needs a lead, review dates, review-by date and disclosure check",
    );
  }

  for (const [index, reviewer] of pack.reviewers.entries()) {
    if (
      reviewer.capacityVerification.verifierPublicLabel ===
        reviewer.publicName ||
      !reviewer.independence.independentOfCorpusAuthors ||
      !reviewer.independence
        .independentOfAffectedInstitutionsInScope ||
      !reviewer.independence.noUndisclosedRelevantInterest
    ) {
      addReviewIssue(
        context,
        ["reviewers", index],
        "every reviewer needs independently verified capacity and a complete conflict declaration",
      );
    }
  }

  const roles = new Set(
    pack.reviewers.flatMap((reviewer) => reviewer.roles),
  );
  for (const role of professionalOpportunityReviewRoles) {
    if (!roles.has(role)) {
      addReviewIssue(
        context,
        ["reviewers"],
        `a complete pack needs the ${role} role`,
      );
    }
  }

  const operatorId =
    pack.controls.emergencyStopDrill.operatorReviewerId;
  const operator =
    operatorId === null ? undefined : reviewerById.get(operatorId);
  if (
    operatorId === null ||
    operatorId === pack.declaration.reviewLeadId ||
    operator?.publicName === reviewLead?.publicName ||
    !operator?.roles.includes("release-operations")
  ) {
    addReviewIssue(
      context,
      ["controls", "emergencyStopDrill", "operatorReviewerId"],
      "the release operator must be assigned, operationally scoped and independent of the review lead",
    );
  }

  for (const source of pack.sourceChecks) {
    const scopedReviewer = source.reviewerIds.some((reviewerId) => {
      const roles = reviewerById.get(reviewerId)?.roles ?? [];
      return roles.some((role) =>
        [
          "tax-technical",
          "legal-procedure",
          "editorial-fairness",
        ].includes(role),
      );
    });
    if (
      source.result !== "supports-stated-use" ||
      source.checkedOn === null ||
      !scopedReviewer ||
      source.versionOrPublicationDate === null ||
      source.pinpointOrScope === null ||
      source.evidenceIds.length === 0
    ) {
      addReviewIssue(
        context,
        ["sourceChecks"],
        "every source needs a dated, scoped supports-stated-use review",
      );
      break;
    }
  }

  const method = pack.methodAndWorkflowReview;
  const methodHasRole = (role: (typeof professionalOpportunityReviewRoles)[number]) =>
    method.reviewerIds.some((reviewerId) =>
      reviewerById.get(reviewerId)?.roles.includes(role),
    );
  if (
    method.result !== "confirmed" ||
    method.completedOn === null ||
    !methodHasRole("tax-technical") ||
    !methodHasRole("legal-procedure") ||
    method.evidenceIds.length === 0 ||
    !method.professionalStatusBoundaryConfirmed ||
    !method.deadlineControlConfirmed ||
    !method.challengeSeparationConfirmed ||
    !method.moneyStateSeparationConfirmed ||
    !method.localCustodyAndNoSubmissionConfirmed
  ) {
    addReviewIssue(
      context,
      ["methodAndWorkflowReview"],
      "the complete method and shared workflow must be confirmed",
    );
  }

  for (const opportunity of pack.opportunityReviews) {
    const hasScopedRole = (
      role: (typeof professionalOpportunityReviewRoles)[number],
    ) =>
      opportunity.reviewerIds.some((reviewerId) => {
        const reviewer = reviewerById.get(reviewerId);
        return (
          reviewer?.roles.includes(role) &&
          reviewer.scope.opportunityIds.includes(
            opportunity.opportunityId,
          )
        );
      });
    if (
      opportunity.result !== "confirmed" ||
      opportunity.completedOn === null ||
      !hasScopedRole("tax-technical") ||
      !hasScopedRole("legal-procedure") ||
      opportunity.evidenceIds.length === 0 ||
      !opportunity.lawAndSourceHierarchyConfirmed ||
      !opportunity.territoryConfirmed ||
      !opportunity.deadlinesAndClockConfirmed ||
      !opportunity.routesAndRemedySeparationConfirmed ||
      !opportunity.professionalGatesAndAuthorityConfirmed ||
      !opportunity.sourceSupportConfirmed ||
      !opportunity.moneyAndOutcomeBoundariesConfirmed
    ) {
      addReviewIssue(
        context,
        ["opportunityReviews"],
        "every opportunity needs scoped technical and legal-procedure reviewers and all confirmations",
      );
      break;
    }
  }

  for (const scrutiny of pack.scrutinyReviews) {
    const hasScopedRole = (
      role: (typeof professionalOpportunityReviewRoles)[number],
    ) =>
      scrutiny.reviewerIds.some((reviewerId) => {
        const reviewer = reviewerById.get(reviewerId);
        return (
          reviewer?.roles.includes(role) &&
          reviewer.scope.scrutinyIds.includes(scrutiny.scrutinyId)
        );
      });
    if (
      scrutiny.result !== "confirmed" ||
      scrutiny.completedOn === null ||
      !hasScopedRole("editorial-fairness") ||
      !hasScopedRole("legal-procedure") ||
      scrutiny.evidenceIds.length === 0 ||
      !scrutiny.statementSupportConfirmed ||
      !scrutiny.evidenceStateConfirmed ||
      !scrutiny.doesNotProveConfirmed ||
      !scrutiny.counterweightOrResponseConfirmed ||
      !scrutiny.correctionOrReviewRouteConfirmed ||
      !scrutiny.noPersonalTargetOrMotiveInferenceConfirmed
    ) {
      addReviewIssue(
        context,
        ["scrutinyReviews"],
        "every scrutiny record needs scoped fairness and legal-procedure review and all confirmations",
      );
      break;
    }
    if (
      scrutiny.rightOfReply.some(
        (reply) =>
          reply.resolvedOn !== null &&
          scrutiny.completedOn !== null &&
          reply.resolvedOn > scrutiny.completedOn,
      )
    ) {
      addReviewIssue(
        context,
        ["scrutinyReviews"],
        "right of reply must resolve before its scrutiny review completes",
      );
      break;
    }
  }

  const privacy = pack.controls.privacySecurityThreatReview;
  if (
    privacy.result !== "pass" ||
    privacy.completedOn === null ||
    privacy.evidenceIds.length === 0 ||
    !privacy.reviewerIds.some((reviewerId) =>
      reviewerById
        .get(reviewerId)
        ?.roles.includes("privacy-security"),
    )
  ) {
    addReviewIssue(
      context,
      ["controls", "privacySecurityThreatReview"],
      "privacy and threat review needs a scoped pass with evidence",
    );
  }

  const surface = pack.controls.publicSurfaceInspection;
  const surfaceHasRole = (
    role: (typeof professionalOpportunityReviewRoles)[number],
  ) =>
    surface.reviewerIds.some((reviewerId) =>
      reviewerById.get(reviewerId)?.roles.includes(role),
    );
  if (
    surface.result !== "pass" ||
    surface.completedOn === null ||
    !surfaceHasRole("privacy-security") ||
    !surfaceHasRole("release-operations") ||
    surface.evidenceIds.length === 0 ||
    !surface.noIntake ||
    !surface.noMarketplace ||
    !surface.noSubmission ||
    !surface.noPrivateUpload
  ) {
    addReviewIssue(
      context,
      ["controls", "publicSurfaceInspection"],
      "the hosted surface needs a dated no-intake inspection",
    );
  }

  const drill = pack.controls.emergencyStopDrill;
  if (
    drill.result !== "pass" ||
    drill.corpusDigest !== pack.corpus.digest ||
    drill.environment !== "production-closed-release" ||
    drill.startedAt === null ||
    drill.stopActivatedAt === null ||
    drill.apiContainedAt === null ||
    drill.frontendContainedAt === null ||
    drill.restoredClosedAt === null ||
    !drill.apiProtectedRoutesReturned503 ||
    !drill.wakeReportedStopped ||
    !drill.safeSchemasRightsAndBlankTemplateRemainedReadable ||
    !drill.frontendContainedOnlyClosedShells ||
    drill.cacheDisposition !== "purged" ||
    drill.evidenceIds.length === 0
  ) {
    addReviewIssue(
      context,
      ["controls", "emergencyStopDrill"],
      "a complete pack needs an evidenced production-closed API and frontend stop drill",
    );
  }
  checkOrderedDates(
    [
      drill.startedAt,
      drill.stopActivatedAt,
      drill.apiContainedAt,
      drill.frontendContainedAt,
      drill.restoredClosedAt,
    ],
    context,
    ["controls", "emergencyStopDrill"],
  );

  const ownership = pack.controls.ownership;
  const completeOwner = (owner: typeof ownership.correction) =>
    owner.primaryPublicLabel !== null &&
    owner.backupPublicLabel !== null &&
    owner.primaryPublicLabel !== owner.backupPublicLabel &&
    owner.publicRouteOrControl !== null &&
    owner.accessTestedAt !== null &&
    owner.evidenceIds.length > 0;
  if (
    ownership.result !== "pass" ||
    ownership.assignedOn === null ||
    !ownership.reviewerIds.some((reviewerId) =>
      reviewerById
        .get(reviewerId)
        ?.roles.includes("release-operations"),
    ) ||
    !completeOwner(ownership.correction) ||
    !completeOwner(ownership.withdrawal)
  ) {
    addReviewIssue(
      context,
      ["controls", "ownership"],
      "correction and withdrawal need distinct tested primary and backup ownership",
    );
  }

  if (completedOn !== null) {
    const reviewStartedOn = pack.declaration.reviewStartedOn;
    const datedChecks = [
      ...pack.reviewers.map((reviewer) => reviewer.verifiedOn),
      ...pack.reviewers.map(
        (reviewer) => reviewer.capacityVerification.verifiedOn,
      ),
      ...pack.sourceChecks.map((review) => review.checkedOn),
      method.completedOn,
      ...pack.opportunityReviews.map((review) => review.completedOn),
      ...pack.scrutinyReviews.flatMap((review) => [
        review.completedOn,
        ...review.rightOfReply.flatMap((reply) => [
          reply.sentOn,
          reply.replyDueOn,
          reply.receivedOn,
          reply.resolvedOn,
        ]),
      ]),
      privacy.completedOn,
      surface.completedOn,
      ownership.assignedOn,
    ].filter((value): value is string => value !== null);
    if (
      reviewStartedOn === null ||
      datedChecks.some(
        (value) =>
          value < reviewStartedOn || value > completedOn,
      )
    ) {
      addReviewIssue(
        context,
        ["declaration", "completedOn"],
        "all review checks must occur between the declared review start and completion",
      );
    }
    if (
      reviewStartedOn !== null &&
      (reviewStartedOn < pack.corpus.retrievedAt ||
        reviewStartedOn > completedOn ||
        Date.parse(`${completedOn}T00:00:00.000Z`) -
          Date.parse(`${reviewStartedOn}T00:00:00.000Z`) >
          93 * 24 * 60 * 60 * 1_000)
    ) {
      addReviewIssue(
        context,
        ["declaration", "reviewStartedOn"],
        "review must start after corpus retrieval and complete within 93 days",
      );
    }
    const replyResolutionDates = pack.scrutinyReviews.flatMap(
      (review) =>
        review.rightOfReply
          .map((reply) => reply.resolvedOn)
          .filter((value): value is string => value !== null),
    );
    if (
      pack.declaration.rightOfReplyResolvedOn !== null &&
      ((reviewStartedOn !== null &&
        pack.declaration.rightOfReplyResolvedOn < reviewStartedOn) ||
        pack.declaration.rightOfReplyResolvedOn > completedOn ||
        replyResolutionDates.some(
          (value) =>
            value > pack.declaration.rightOfReplyResolvedOn!,
        ))
    ) {
      addReviewIssue(
        context,
        ["declaration", "rightOfReplyResolvedOn"],
        "the declared reply resolution must cover every row and precede completion",
      );
    }
    const operationalInstants = [
      drill.startedAt,
      drill.stopActivatedAt,
      drill.apiContainedAt,
      drill.frontendContainedAt,
      drill.restoredClosedAt,
      ownership.correction.accessTestedAt,
      ownership.withdrawal.accessTestedAt,
    ].filter((value): value is string => value !== null);
    if (
      operationalInstants.some(
        (value) =>
          reviewStartedOn === null ||
          value.slice(0, 10) < reviewStartedOn ||
          value.slice(0, 10) > completedOn,
      )
    ) {
      addReviewIssue(
        context,
        ["controls"],
        "operational checks must occur between review start and completion",
      );
    }
    if (
      pack.declaration.reviewBy !== null &&
      (pack.declaration.reviewBy <= completedOn ||
        Date.parse(
          `${pack.declaration.reviewBy}T00:00:00.000Z`,
        ) -
          Date.parse(`${completedOn}T00:00:00.000Z`) >
          93 * 24 * 60 * 60 * 1_000)
    ) {
      addReviewIssue(
        context,
        ["declaration", "reviewBy"],
        "review-by must be after completion and no more than 93 days later",
      );
    }
  }

}

function validateReviewPackSemantics(
  pack: ProfessionalOpportunityReviewPackBase,
  context: z.RefinementCtx,
) {
  const expectedDigest = digestValue(packPreimage(pack));
  if (pack.integrity.digest !== expectedDigest) {
    addReviewIssue(
      context,
      ["integrity", "digest"],
      "review-pack digest does not match its canonical content",
    );
  }

  const collections = [
    ["corpus opportunity IDs", pack.corpus.opportunityIds],
    ["corpus scrutiny IDs", pack.corpus.scrutinyIds],
    ["corpus source IDs", pack.corpus.sourceIds],
    ["reviewer IDs", pack.reviewers.map((reviewer) => reviewer.id)],
    ["evidence IDs", pack.evidenceIndex.map((evidence) => evidence.id)],
    ["source-check IDs", pack.sourceChecks.map((review) => review.sourceId)],
    [
      "opportunity-review IDs",
      pack.opportunityReviews.map((review) => review.opportunityId),
    ],
    [
      "scrutiny-review IDs",
      pack.scrutinyReviews.map((review) => review.scrutinyId),
    ],
  ] as const;
  for (const [label, values] of collections) {
    checkUnique(values, context, [label], label);
  }

  const reviewerIdSet = new Set(
    pack.reviewers.map((reviewer) => reviewer.id),
  );
  const opportunityIdSet = new Set(pack.corpus.opportunityIds);
  const scrutinyIdSet = new Set(pack.corpus.scrutinyIds);
  pack.reviewers.forEach((reviewer, index) => {
    checkUnique(
      reviewer.roles,
      context,
      ["reviewers", index, "roles"],
      "reviewer roles",
    );
    checkUnique(
      reviewer.scope.opportunityIds,
      context,
      ["reviewers", index, "scope", "opportunityIds"],
      "reviewer opportunity scope",
    );
    checkUnique(
      reviewer.scope.scrutinyIds,
      context,
      ["reviewers", index, "scope", "scrutinyIds"],
      "reviewer scrutiny scope",
    );
    if (
      reviewer.scope.opportunityIds.some(
        (scopeId) => !opportunityIdSet.has(scopeId),
      ) ||
      reviewer.scope.scrutinyIds.some(
        (scopeId) => !scrutinyIdSet.has(scopeId),
      )
    ) {
      addReviewIssue(
        context,
        ["reviewers", index, "scope"],
        "reviewer scope must contain only bound corpus IDs",
      );
    }
  });
  for (const group of referencedReviewerGroups(pack)) {
    checkUnique(group, context, ["reviewers"], "reviewer assignments");
    if (group.some((reviewerId) => !reviewerIdSet.has(reviewerId))) {
      addReviewIssue(
        context,
        ["reviewers"],
        "every assigned reviewer ID must resolve",
      );
      break;
    }
  }

  const evidenceById = new Map(
    pack.evidenceIndex.map((evidence) => [evidence.id, evidence]),
  );
  for (const assignment of evidenceAssignments(pack)) {
    checkUnique(
      assignment.ids,
      context,
      assignment.path,
      "evidence assignments",
    );
    if (
      assignment.ids.some(
        (evidenceId) => !evidenceById.has(evidenceId),
      )
    ) {
      addReviewIssue(
        context,
        assignment.path,
        "every referenced evidence ID must resolve",
      );
    }
    if (
      assignment.ids.some(
        (evidenceId) =>
          evidenceById.get(evidenceId)?.purpose !==
          assignment.purpose,
      )
    ) {
      addReviewIssue(
        context,
        assignment.path,
        `evidence must resolve to the ${assignment.purpose} purpose`,
      );
    }
  }

  for (
    let scrutinyIndex = 0;
    scrutinyIndex < pack.scrutinyReviews.length;
    scrutinyIndex++
  ) {
    const scrutiny = pack.scrutinyReviews[scrutinyIndex];
    checkUnique(
      scrutiny.rightOfReply.map((reply) => reply.institution),
      context,
      ["scrutinyReviews", scrutinyIndex, "rightOfReply"],
      "right-of-reply institutions",
    );
    scrutiny.rightOfReply.forEach((reply, replyIndex) =>
      validateRightOfReply(
        reply,
        context,
        [
          "scrutinyReviews",
          scrutinyIndex,
          "rightOfReply",
          replyIndex,
        ],
        pack.status === "complete",
      ),
    );
  }

  if (pack.status === "complete") {
    validateCompletePack(pack, context);
  }
}

export const professionalOpportunityReviewPackSchema =
  professionalOpportunityReviewPackBaseSchema.superRefine(
    validateReviewPackSemantics,
  );

export type ProfessionalOpportunityReviewPack = z.infer<
  typeof professionalOpportunityReviewPackSchema
>;

export type ProfessionalOpportunityReviewCorpus = {
  meta: {
    version: string;
    lawAsAt: string;
    retrievedAt: string;
  };
  method: unknown;
  sharedWorkflow: unknown;
  sources: Array<{
    id: string;
    title: string;
    publisher: string;
    url: string;
  }>;
  scrutiny: Array<{
    id: string;
    title: string;
    affectedInstitutions: string[];
    sourceIds: string[];
    [key: string]: unknown;
  }>;
  opportunities: Array<{
    id: string;
    title: string;
    territories: string[];
    sourceIds: string[];
    [key: string]: unknown;
  }>;
};

function sourceEvidenceId(sourceId: string) {
  return `source-${sourceId}`;
}

function emptyOwner() {
  return {
    primaryPublicLabel: null,
    backupPublicLabel: null,
    publicRouteOrControl: null,
    accessTestedAt: null,
    evidenceIds: [],
  };
}

export function professionalOpportunityReviewPackDigest(
  pack: ProfessionalOpportunityReviewPackBase,
) {
  return digestValue(packPreimage(pack));
}

export function professionalOpportunityReviewPackReference(
  pack: ProfessionalOpportunityReviewPack,
) {
  return `${professionalOpportunityReviewPackReferencePrefix}${pack.integrity.digest}`;
}

export function makePendingProfessionalOpportunityReviewPack(
  corpus: ProfessionalOpportunityReviewCorpus,
  corpusDigest: `sha256:${string}`,
): ProfessionalOpportunityReviewPack {
  const sourceEvidence = corpus.sources.map((source) => ({
    id: sourceEvidenceId(source.id),
    purpose: "source-material" as const,
    visibility: "public-https" as const,
    url: source.url,
  }));
  const preimage = {
    schema:
      "taxsorted.uk.professional-opportunities-qualified-review-pack/1" as const,
    status: "pending" as const,
    corpus: {
      version: corpus.meta.version,
      digest: corpusDigest,
      lawAsAt: corpus.meta.lawAsAt,
      retrievedAt: corpus.meta.retrievedAt,
      opportunityIds: corpus.opportunities.map(
        (opportunity) => opportunity.id,
      ),
      scrutinyIds: corpus.scrutiny.map((scrutiny) => scrutiny.id),
      sourceIds: corpus.sources.map((source) => source.id),
    },
    reviewers: [],
    evidenceIndex: sourceEvidence,
    sourceChecks: corpus.sources.map((source) => ({
      sourceId: source.id,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      sourceRecordDigest: digestValue(source),
      reviewerIds: [],
      checkedOn: null,
      result: "pending" as const,
      versionOrPublicationDate: null,
      pinpointOrScope: null,
      evidenceIds: [sourceEvidenceId(source.id)],
    })),
    methodAndWorkflowReview: {
      reviewerIds: [],
      completedOn: null,
      result: "pending" as const,
      professionalStatusBoundaryConfirmed: false,
      deadlineControlConfirmed: false,
      challengeSeparationConfirmed: false,
      moneyStateSeparationConfirmed: false,
      localCustodyAndNoSubmissionConfirmed: false,
      evidenceIds: [],
    },
    opportunityReviews: corpus.opportunities.map((opportunity) => ({
      opportunityId: opportunity.id,
      title: opportunity.title,
      territories: [...opportunity.territories],
      opportunityRecordDigest: digestValue(opportunity),
      reviewerIds: [],
      completedOn: null,
      result: "pending" as const,
      lawAndSourceHierarchyConfirmed: false,
      territoryConfirmed: false,
      deadlinesAndClockConfirmed: false,
      routesAndRemedySeparationConfirmed: false,
      professionalGatesAndAuthorityConfirmed: false,
      sourceSupportConfirmed: false,
      moneyAndOutcomeBoundariesConfirmed: false,
      evidenceIds: [],
    })),
    scrutinyReviews: corpus.scrutiny.map((scrutiny) => {
      const framingDigest = digestValue(scrutiny);
      return {
        scrutinyId: scrutiny.id,
        title: scrutiny.title,
        scrutinyFramingDigest: framingDigest,
        reviewerIds: [],
        completedOn: null,
        result: "pending" as const,
        statementSupportConfirmed: false,
        evidenceStateConfirmed: false,
        doesNotProveConfirmed: false,
        counterweightOrResponseConfirmed: false,
        correctionOrReviewRouteConfirmed: false,
        noPersonalTargetOrMotiveInferenceConfirmed: false,
        evidenceIds: [],
        rightOfReply: scrutiny.affectedInstitutions.map(
          (institution) => ({
            institution,
            scrutinyFramingDigest: framingDigest,
            disposition: "pending" as const,
            sentOn: null,
            replyDueOn: null,
            receivedOn: null,
            resolvedOn: null,
            publicBasis: null,
            evidenceIds: [],
          }),
        ),
      };
    }),
    controls: {
      privacySecurityThreatReview: {
        reviewerIds: [],
        completedOn: null,
        result: "pending" as const,
        evidenceIds: [],
      },
      publicSurfaceInspection: {
        reviewerIds: [],
        completedOn: null,
        result: "pending" as const,
        noIntake: false,
        noMarketplace: false,
        noSubmission: false,
        noPrivateUpload: false,
        evidenceIds: [],
      },
      emergencyStopDrill: {
        operatorReviewerId: null,
        result: "pending" as const,
        corpusDigest: null,
        commitSha: null,
        environment: null,
        startedAt: null,
        stopActivatedAt: null,
        apiContainedAt: null,
        frontendContainedAt: null,
        restoredClosedAt: null,
        apiProtectedRoutesReturned503: false,
        wakeReportedStopped: false,
        safeSchemasRightsAndBlankTemplateRemainedReadable: false,
        frontendContainedOnlyClosedShells: false,
        cacheDisposition: null,
        evidenceIds: [],
      },
      ownership: {
        result: "pending" as const,
        reviewerIds: [],
        assignedOn: null,
        correction: emptyOwner(),
        withdrawal: emptyOwner(),
      },
    },
    declaration: {
      reviewLeadId: null,
      reviewStartedOn: null,
      rightOfReplyResolvedOn: null,
      completedOn: null,
      reviewBy: null,
      publicFieldsDisclosureChecked: false,
      privateEvidenceOutsideRepository: true as const,
      publicGithubDisclosureAcknowledged: true as const,
      packDoesNotApproveHostedDistribution: true as const,
    },
    boundaries: [...professionalOpportunityReviewPackBoundaries] as [
      string,
      string,
      string,
      string,
      string,
    ],
  };
  const withPlaceholder = professionalOpportunityReviewPackBaseSchema.parse({
    ...preimage,
    integrity: {
      algorithm: "sha256",
      digest: `sha256:${"0".repeat(64)}`,
      digestScope: professionalOpportunityReviewPackDigestScope,
    },
  });
  return professionalOpportunityReviewPackSchema.parse({
    ...withPlaceholder,
    integrity: {
      ...withPlaceholder.integrity,
      digest: digestValue(packPreimage(withPlaceholder)),
    },
  });
}

export class ProfessionalOpportunityReviewPackBindingError extends Error {
  constructor(readonly code: string) {
    super("The review pack does not match the exact current corpus.");
    this.name = "ProfessionalOpportunityReviewPackBindingError";
  }
}

function exactStrings(
  actual: readonly string[],
  expected: readonly string[],
) {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

export function validateProfessionalOpportunityReviewPackForCorpus(
  value: unknown,
  corpus: ProfessionalOpportunityReviewCorpus,
  corpusDigest: `sha256:${string}`,
  asOf = new Date().toISOString().slice(0, 10),
): ProfessionalOpportunityReviewPack {
  const pack = professionalOpportunityReviewPackSchema.parse(value);
  const expected = makePendingProfessionalOpportunityReviewPack(
    corpus,
    corpusDigest,
  );
  if (
    pack.corpus.version !== expected.corpus.version ||
    pack.corpus.digest !== expected.corpus.digest ||
    pack.corpus.lawAsAt !== expected.corpus.lawAsAt ||
    pack.corpus.retrievedAt !== expected.corpus.retrievedAt ||
    !exactStrings(
      pack.corpus.opportunityIds,
      expected.corpus.opportunityIds,
    ) ||
    !exactStrings(
      pack.corpus.scrutinyIds,
      expected.corpus.scrutinyIds,
    ) ||
    !exactStrings(pack.corpus.sourceIds, expected.corpus.sourceIds)
  ) {
    throw new ProfessionalOpportunityReviewPackBindingError(
      "corpus-binding-mismatch",
    );
  }

  const exactRows = [
    [
      pack.sourceChecks,
      expected.sourceChecks,
      ["sourceId", "title", "publisher", "url", "sourceRecordDigest"],
    ],
    [
      pack.opportunityReviews,
      expected.opportunityReviews,
      [
        "opportunityId",
        "title",
        "territories",
        "opportunityRecordDigest",
      ],
    ],
    [
      pack.scrutinyReviews,
      expected.scrutinyReviews,
      ["scrutinyId", "title", "scrutinyFramingDigest"],
    ],
  ] as const;
  for (const [actualRows, expectedRows, keys] of exactRows) {
    if (
      actualRows.length !== expectedRows.length ||
      actualRows.some((row, index) =>
        keys.some(
          (key) =>
            canonicalJson(row[key as keyof typeof row]) !==
            canonicalJson(
              expectedRows[index]?.[
                key as keyof (typeof expectedRows)[number]
              ],
            ),
        ),
      )
    ) {
      throw new ProfessionalOpportunityReviewPackBindingError(
        "record-binding-mismatch",
      );
    }
  }

  for (let index = 0; index < pack.scrutinyReviews.length; index++) {
    const actualReplies =
      pack.scrutinyReviews[index].rightOfReply;
    const expectedReplies =
      expected.scrutinyReviews[index].rightOfReply;
    if (
      actualReplies.length !== expectedReplies.length ||
      actualReplies.some(
        (reply, replyIndex) =>
          reply.institution !==
            expectedReplies[replyIndex]?.institution ||
          reply.scrutinyFramingDigest !==
            expectedReplies[replyIndex]?.scrutinyFramingDigest,
      )
    ) {
      throw new ProfessionalOpportunityReviewPackBindingError(
        "right-of-reply-coverage-mismatch",
      );
    }
  }

  if (pack.status === "complete") {
    const completedOn = pack.declaration.completedOn;
    const reviewBy = pack.declaration.reviewBy;
    if (
      completedOn === null ||
      reviewBy === null ||
      completedOn > asOf ||
      reviewBy < asOf
    ) {
      throw new ProfessionalOpportunityReviewPackBindingError(
        "review-not-current",
      );
    }
  }
  return pack;
}

export function sealProfessionalOpportunityReviewPack(
  value: unknown,
  corpus: ProfessionalOpportunityReviewCorpus,
  corpusDigest: `sha256:${string}`,
  asOf = new Date().toISOString().slice(0, 10),
) {
  const pack = validateProfessionalOpportunityReviewPackDraftForCorpus(
    value,
    corpus,
    corpusDigest,
    asOf,
  );
  if (pack.status !== "complete") {
    throw new ProfessionalOpportunityReviewPackBindingError(
      "review-not-complete",
    );
  }
  return pack;
}

export function validateProfessionalOpportunityReviewPackDraftForCorpus(
  value: unknown,
  corpus: ProfessionalOpportunityReviewCorpus,
  corpusDigest: `sha256:${string}`,
  asOf = new Date().toISOString().slice(0, 10),
) {
  const draft = professionalOpportunityReviewPackBaseSchema.parse(value);
  const sealed = {
    ...draft,
    integrity: {
      ...draft.integrity,
      digest: digestValue(packPreimage(draft)),
    },
  };
  return validateProfessionalOpportunityReviewPackForCorpus(
    sealed,
    corpus,
    corpusDigest,
    asOf,
  );
}

export type ProfessionalOpportunityReviewPackApprovalFacts = {
  reference: string;
  rightOfReplyReference: string;
  reviewerName: string;
  reviewerCapacity: string;
  completedOn: string;
  reviewBy: string;
};

export function professionalOpportunityReviewPackApprovalFacts(
  pack: ProfessionalOpportunityReviewPack,
): ProfessionalOpportunityReviewPackApprovalFacts | null {
  if (
    pack.status !== "complete" ||
    pack.declaration.reviewLeadId === null ||
    pack.declaration.completedOn === null ||
    pack.declaration.reviewBy === null
  ) {
    return null;
  }
  const lead = pack.reviewers.find(
    (reviewer) => reviewer.id === pack.declaration.reviewLeadId,
  );
  if (!lead) return null;
  const reference = professionalOpportunityReviewPackReference(pack);
  return {
    reference,
    rightOfReplyReference: `${reference}#right-of-reply`,
    reviewerName: lead.publicName,
    reviewerCapacity: lead.capacity,
    completedOn: pack.declaration.completedOn,
    reviewBy: pack.declaration.reviewBy,
  };
}

const defaultReviewPackPath = fileURLToPath(
  new URL(
    "../../research/uk/professional-opportunities/review/qualified-review-pack.json",
    import.meta.url,
  ),
);

export function loadProfessionalOpportunityReviewPack(
  path = defaultReviewPackPath,
): ProfessionalOpportunityReviewPack | null {
  if (!existsSync(path)) return null;
  const body = readFileSync(path, "utf8");
  assertNoDuplicateJsonKeys(body);
  return professionalOpportunityReviewPackSchema.parse(JSON.parse(body));
}

export const professionalOpportunityReviewPackJsonSchema = {
  ...(z.toJSONSchema(
    professionalOpportunityReviewPackBaseSchema,
  ) as Record<string, unknown>),
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://api.taxsorted.io/schemas/uk-professional-opportunities-qualified-review-pack-1.json",
  title: "TaxSorted UK professional-opportunity qualified-review pack",
  description:
    "Public-safe, corpus-bound evidence for multidisciplinary review of the hosted professional-opportunity atlas.",
  "x-taxsorted-runtime-invariants": [
    "The pack digest excludes only its integrity object and must match canonical content.",
    "Corpus version, digest, source IDs, opportunity IDs, scrutiny IDs and record digests match exactly.",
    "A complete pack covers every source, opportunity and scrutiny record once.",
    "Right of reply covers every affected institution for each exact scrutiny framing.",
    "A complete pack expires no more than 93 days after review completion.",
    "Private evidence uses only a public-safe custodian role and an opaque random UUID v4.",
    "Reviewer-authored public text rejects @ contact markers and filesystem-shaped paths; public URLs reject embedded credentials.",
    "The independent release operator proves both API and static-frontend containment while the hosted release remains closed.",
    "No pack approves distribution, changes a switch or accepts private evidence.",
  ],
} as const;
