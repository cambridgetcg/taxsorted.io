import {
  makePendingProfessionalOpportunityReviewPack,
  professionalOpportunityReviewPackDigest,
  professionalOpportunityReviewPackSchema,
  type ProfessionalOpportunityReviewPack,
} from "../uk-professional-opportunity-review.js";
import {
  professionalOpportunityCorpusDigest,
  type UkProfessionalOpportunities,
} from "../uk-professional-opportunities.js";

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function completeProfessionalOpportunityReviewPackFixture(
  corpus: UkProfessionalOpportunities,
): ProfessionalOpportunityReviewPack {
  const pack = structuredClone(
    makePendingProfessionalOpportunityReviewPack(
      corpus,
      professionalOpportunityCorpusDigest(corpus),
    ),
  ) as any;
  const reviewDate = corpus.meta.retrievedAt;
  const evidenceIds = {
    qualification: "synthetic-qualification-evidence",
    independence: "synthetic-independence-evidence",
    review: "synthetic-review-work-evidence",
    reply: "synthetic-reply-evidence",
    privacy: "synthetic-privacy-evidence",
    surface: "synthetic-surface-evidence",
    drill: "synthetic-drill-evidence",
    correction: "synthetic-correction-evidence",
    withdrawal: "synthetic-withdrawal-evidence",
  } as const;
  pack.status = "complete";
  pack.evidenceIndex.push(
    ...Object.entries(evidenceIds).map(([purpose, id]) => ({
      id,
      purpose:
        purpose === "qualification"
          ? "reviewer-qualification"
          : purpose === "independence"
            ? "reviewer-independence"
            : purpose === "review"
              ? "review-work"
              : purpose === "reply"
                ? "institutional-reply"
                : purpose === "privacy"
                  ? "privacy-security"
                  : purpose === "surface"
                    ? "public-surface"
                    : purpose === "drill"
                      ? "emergency-stop-drill"
                      : purpose === "correction"
                        ? "correction-control"
                        : "withdrawal-control",
      visibility: "public-https",
      url: `https://example.test/${purpose}-evidence`,
    })),
  );
  pack.reviewers = [
    {
      id: "synthetic-review-lead",
      publicName: "Synthetic qualified-review test fixture",
      capacity: "Scoped multidisciplinary UK publication test reviewer",
      capacityBasis: "Synthetic test-only capacity",
      capacityVerification: {
        verifierPublicLabel: "Synthetic qualification register",
        verifiedOn: reviewDate,
        evidenceIds: [evidenceIds.qualification],
      },
      independence: {
        independentOfCorpusAuthors: true,
        independentOfAffectedInstitutionsInScope: true,
        noUndisclosedRelevantInterest: true,
        declarationEvidenceIds: [evidenceIds.independence],
      },
      roles: [
        "tax-technical",
        "legal-procedure",
        "editorial-fairness",
        "privacy-security",
      ],
      scope: {
        opportunityIds: [...pack.corpus.opportunityIds],
        scrutinyIds: [...pack.corpus.scrutinyIds],
      },
      qualificationEvidenceIds: [evidenceIds.qualification],
      verifiedOn: reviewDate,
      consentToPublishLabel: true,
    },
    {
      id: "synthetic-release-operator",
      publicName: "Synthetic release operator test fixture",
      capacity: "Release-operations test reviewer",
      capacityBasis: "Synthetic test-only operational authority",
      capacityVerification: {
        verifierPublicLabel: "Synthetic operations authority",
        verifiedOn: reviewDate,
        evidenceIds: [evidenceIds.qualification],
      },
      independence: {
        independentOfCorpusAuthors: true,
        independentOfAffectedInstitutionsInScope: true,
        noUndisclosedRelevantInterest: true,
        declarationEvidenceIds: [evidenceIds.independence],
      },
      roles: ["release-operations"],
      scope: { opportunityIds: [], scrutinyIds: [] },
      qualificationEvidenceIds: [evidenceIds.qualification],
      verifiedOn: reviewDate,
      consentToPublishLabel: true,
    },
  ];

  for (const source of pack.sourceChecks) {
    source.reviewerIds = ["synthetic-review-lead"];
    source.checkedOn = reviewDate;
    source.result = "supports-stated-use";
    source.versionOrPublicationDate = "Synthetic fixture version";
    source.pinpointOrScope = "Synthetic fixture scope";
  }
  Object.assign(pack.methodAndWorkflowReview, {
    reviewerIds: ["synthetic-review-lead"],
    completedOn: reviewDate,
    result: "confirmed",
    professionalStatusBoundaryConfirmed: true,
    deadlineControlConfirmed: true,
    challengeSeparationConfirmed: true,
    moneyStateSeparationConfirmed: true,
    localCustodyAndNoSubmissionConfirmed: true,
    evidenceIds: [evidenceIds.review],
  });
  for (const opportunity of pack.opportunityReviews) {
    Object.assign(opportunity, {
      reviewerIds: ["synthetic-review-lead"],
      completedOn: reviewDate,
      result: "confirmed",
      lawAndSourceHierarchyConfirmed: true,
      territoryConfirmed: true,
      deadlinesAndClockConfirmed: true,
      routesAndRemedySeparationConfirmed: true,
      professionalGatesAndAuthorityConfirmed: true,
      sourceSupportConfirmed: true,
      moneyAndOutcomeBoundariesConfirmed: true,
      evidenceIds: [evidenceIds.review],
    });
  }
  for (const scrutiny of pack.scrutinyReviews) {
    Object.assign(scrutiny, {
      reviewerIds: ["synthetic-review-lead"],
      completedOn: reviewDate,
      result: "confirmed",
      statementSupportConfirmed: true,
      evidenceStateConfirmed: true,
      doesNotProveConfirmed: true,
      counterweightOrResponseConfirmed: true,
      correctionOrReviewRouteConfirmed: true,
      noPersonalTargetOrMotiveInferenceConfirmed: true,
      evidenceIds: [evidenceIds.review],
    });
    for (const reply of scrutiny.rightOfReply) {
      Object.assign(reply, {
        disposition: "not-applicable-with-reason",
        resolvedOn: reviewDate,
        publicBasis:
          "Synthetic unit-test corpus has no institutional subject.",
        evidenceIds: [evidenceIds.reply],
      });
    }
  }

  pack.controls.privacySecurityThreatReview = {
    reviewerIds: ["synthetic-review-lead"],
    completedOn: reviewDate,
    result: "pass",
    evidenceIds: [evidenceIds.privacy],
  };
  pack.controls.publicSurfaceInspection = {
    reviewerIds: [
      "synthetic-review-lead",
      "synthetic-release-operator",
    ],
    completedOn: reviewDate,
    result: "pass",
    noIntake: true,
    noMarketplace: true,
    noSubmission: true,
    noPrivateUpload: true,
    evidenceIds: [evidenceIds.surface],
  };
  pack.controls.emergencyStopDrill = {
    operatorReviewerId: "synthetic-release-operator",
    result: "pass",
    corpusDigest: pack.corpus.digest,
    commitSha: "a".repeat(40),
    environment: "production-closed-release",
    startedAt: `${reviewDate}T10:00:00.000Z`,
    stopActivatedAt: `${reviewDate}T10:01:00.000Z`,
    apiContainedAt: `${reviewDate}T10:02:00.000Z`,
    frontendContainedAt: `${reviewDate}T10:03:00.000Z`,
    restoredClosedAt: `${reviewDate}T10:04:00.000Z`,
    apiProtectedRoutesReturned503: true,
    wakeReportedStopped: true,
    safeSchemasRightsAndBlankTemplateRemainedReadable: true,
    frontendContainedOnlyClosedShells: true,
    cacheDisposition: "purged",
    evidenceIds: [evidenceIds.drill],
  };
  pack.controls.ownership = {
    result: "pass",
    reviewerIds: ["synthetic-release-operator"],
    assignedOn: reviewDate,
    correction: {
      primaryPublicLabel: "Synthetic correction primary",
      backupPublicLabel: "Synthetic correction backup",
      publicRouteOrControl: "https://example.test/corrections",
      accessTestedAt: `${reviewDate}T10:05:00.000Z`,
      evidenceIds: [evidenceIds.correction],
    },
    withdrawal: {
      primaryPublicLabel: "Synthetic withdrawal primary",
      backupPublicLabel: "Synthetic withdrawal backup",
      publicRouteOrControl: "synthetic-withdrawal-control",
      accessTestedAt: `${reviewDate}T10:06:00.000Z`,
      evidenceIds: [evidenceIds.withdrawal],
    },
  };
  pack.declaration = {
    reviewLeadId: "synthetic-review-lead",
    reviewStartedOn: reviewDate,
    rightOfReplyResolvedOn: reviewDate,
    completedOn: reviewDate,
    reviewBy: addDays(reviewDate, 90),
    publicFieldsDisclosureChecked: true,
    privateEvidenceOutsideRepository: true,
    publicGithubDisclosureAcknowledged: true,
    packDoesNotApproveHostedDistribution: true,
  };
  pack.integrity.digest = professionalOpportunityReviewPackDigest(pack);
  return professionalOpportunityReviewPackSchema.parse(pack);
}
