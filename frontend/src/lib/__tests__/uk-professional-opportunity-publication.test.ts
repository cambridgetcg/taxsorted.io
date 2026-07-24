import { describe, expect, it } from "vitest";
import opportunityCorpusJson from "../../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json";
import publicationApprovalJson from "../../../../research/uk/professional-opportunities/data/publication-approval.json";
import qualifiedReviewPackJson from "../../../../research/uk/professional-opportunities/review/qualified-review-pack.json";
import {
  projectUkProfessionalOpportunityCorpus as projectStaticCorpus,
  ukProfessionalOpportunityCorpus,
} from "../uk-professional-opportunities";
import {
  evaluateUkProfessionalOpportunityStaticPublication as evaluateStaticPublication,
  isUkProfessionalOpportunityStaticallyPublished,
  parseUkProfessionalOpportunityEmergencyStop,
  qualifiedReviewPackDigest,
  ukProfessionalOpportunityStaticPublication,
  type PublicationApproval,
} from "../uk-professional-opportunity-publication";

type MutableRecord = Record<string, unknown>;
type MutableReviewer = MutableRecord & {
  publicName: string;
  capacityBasis?: unknown;
  roles: string[];
  scope: {
    opportunityIds: string[];
    scrutinyIds: string[];
  };
  independence: {
    independentOfCorpusAuthors: boolean;
    independentOfAffectedInstitutionsInScope: boolean;
    noUndisclosedRelevantInterest: boolean;
    declarationEvidenceIds: string[];
  };
};
type MutableReviewPack = {
  status: string;
  corpus: {
    digest: string;
    lawAsAt: string;
    opportunityIds: string[];
    scrutinyIds: string[];
  };
  boundaries: unknown[];
  privateClientPath?: string;
  evidenceIndex: MutableRecord[];
  reviewers: MutableReviewer[];
  sourceChecks: Array<
    MutableRecord & { url: string; evidenceIds: string[] }
  >;
  methodAndWorkflowReview: MutableRecord;
  opportunityReviews: Array<
    MutableRecord & { evidenceIds: string[] }
  >;
  scrutinyReviews: Array<
    MutableRecord & { rightOfReply: MutableRecord[] }
  >;
  controls: {
    privacySecurityThreatReview: MutableRecord;
    publicSurfaceInspection: MutableRecord;
    emergencyStopDrill: MutableRecord;
    ownership: MutableRecord;
  };
  declaration: MutableRecord & { reviewStartedOn: string };
  integrity: { digest: string; digestScope: string };
};

function reviewPackDigestOrThrow(value: unknown) {
  const digest = qualifiedReviewPackDigest(value);
  if (!digest) throw new Error("fixture must be a review-pack object");
  return digest;
}

function completeReviewPackFixture() {
  const pack = structuredClone(
    qualifiedReviewPackJson,
  ) as unknown as MutableReviewPack;
  const reviewDate = opportunityCorpusJson.meta.retrievedAt;
  const evidenceIds = {
    qualification: "fixture-qualification-evidence",
    independence: "fixture-independence-evidence",
    review: "fixture-review-work-evidence",
    reply: "fixture-reply-evidence",
    privacy: "fixture-privacy-evidence",
    surface: "fixture-surface-evidence",
    drill: "fixture-drill-evidence",
    correction: "fixture-correction-evidence",
    withdrawal: "fixture-withdrawal-evidence",
  } as const;
  const evidencePurposes = {
    qualification: "reviewer-qualification",
    independence: "reviewer-independence",
    review: "review-work",
    reply: "institutional-reply",
    privacy: "privacy-security",
    surface: "public-surface",
    drill: "emergency-stop-drill",
    correction: "correction-control",
    withdrawal: "withdrawal-control",
  } as const;
  pack.status = "complete";
  pack.evidenceIndex.push(
    ...Object.entries(evidenceIds).map(([key, id]) => ({
      id,
      purpose:
        evidencePurposes[key as keyof typeof evidencePurposes],
      visibility: "public-https",
      url: `https://example.test/${key}-evidence`,
    })),
  );
  pack.reviewers = [
    {
      id: "fixture-review-lead",
      publicName: "Fixture review lead",
      capacity: "Scoped multidisciplinary test reviewer",
      capacityBasis: "Synthetic test-only capacity",
      capacityVerification: {
        verifierPublicLabel: "Fixture qualification register",
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
      id: "fixture-release-operator",
      publicName: "Fixture release operator",
      capacity: "Synthetic release-operations test fixture",
      capacityBasis: "Synthetic test-only authority",
      capacityVerification: {
        verifierPublicLabel: "Fixture operations authority",
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
    source.reviewerIds = ["fixture-review-lead"];
    source.checkedOn = reviewDate;
    source.result = "supports-stated-use";
    source.versionOrPublicationDate = "Synthetic fixture version";
    source.pinpointOrScope = "Synthetic fixture scope";
  }
  Object.assign(pack.methodAndWorkflowReview, {
    reviewerIds: ["fixture-review-lead"],
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
      reviewerIds: ["fixture-review-lead"],
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
      reviewerIds: ["fixture-review-lead"],
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
        publicBasis: "Synthetic test fixture has no institutional subject.",
        evidenceIds: [evidenceIds.reply],
      });
    }
  }
  pack.controls.privacySecurityThreatReview = {
    reviewerIds: ["fixture-review-lead"],
    completedOn: reviewDate,
    result: "pass",
    evidenceIds: [evidenceIds.privacy],
  };
  pack.controls.publicSurfaceInspection = {
    reviewerIds: ["fixture-review-lead", "fixture-release-operator"],
    completedOn: reviewDate,
    result: "pass",
    noIntake: true,
    noMarketplace: true,
    noSubmission: true,
    noPrivateUpload: true,
    evidenceIds: [evidenceIds.surface],
  };
  pack.controls.emergencyStopDrill = {
    operatorReviewerId: "fixture-release-operator",
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
    reviewerIds: ["fixture-release-operator"],
    assignedOn: reviewDate,
    correction: {
      primaryPublicLabel: "Fixture correction primary",
      backupPublicLabel: "Fixture correction backup",
      publicRouteOrControl: "https://example.test/corrections",
      accessTestedAt: `${reviewDate}T10:05:00.000Z`,
      evidenceIds: [evidenceIds.correction],
    },
    withdrawal: {
      primaryPublicLabel: "Fixture withdrawal primary",
      backupPublicLabel: "Fixture withdrawal backup",
      publicRouteOrControl: "synthetic-test-control",
      accessTestedAt: `${reviewDate}T10:06:00.000Z`,
      evidenceIds: [evidenceIds.withdrawal],
    },
  };
  pack.declaration = {
    reviewLeadId: "fixture-review-lead",
    reviewStartedOn: reviewDate,
    rightOfReplyResolvedOn: reviewDate,
    completedOn: reviewDate,
    reviewBy: "2026-10-24",
    publicFieldsDisclosureChecked: true,
    privateEvidenceOutsideRepository: true,
    publicGithubDisclosureAcknowledged: true,
    packDoesNotApproveHostedDistribution: true,
  };
  pack.integrity.digest = reviewPackDigestOrThrow(pack);
  return pack;
}

const exactReviewPack = completeReviewPackFixture();
const evaluationDate = opportunityCorpusJson.meta.retrievedAt;

function evaluateUkProfessionalOpportunityStaticPublication(
  corpus: Parameters<typeof evaluateStaticPublication>[0],
  approval: PublicationApproval,
) {
  return evaluateStaticPublication(
    corpus,
    approval,
    exactReviewPack,
    evaluationDate,
  );
}

function projectUkProfessionalOpportunityCorpus(
  corpus: Parameters<typeof projectStaticCorpus>[0],
  approval: PublicationApproval,
  options: Parameters<typeof projectStaticCorpus>[2] = {},
) {
  return projectStaticCorpus(corpus, approval, {
    ...options,
    reviewPack: exactReviewPack,
    asOf: evaluationDate,
  });
}

const exactTechnicalApproval = {
  ...publicationApprovalJson,
  status: "approved-for-hosted-distribution",
  decisionRecordedOn: evaluationDate,
  corpusVersion: opportunityCorpusJson.meta.version,
  corpusDigest: evaluateUkProfessionalOpportunityStaticPublication(
    opportunityCorpusJson,
    publicationApprovalJson,
  ).corpusDigest,
  opportunityIds: opportunityCorpusJson.opportunities.map(
    (opportunity) => opportunity.id,
  ),
  hostedDistributionDecision: {
    status: "approved",
    decisionMakerName: "Fixture accountable publisher",
    decisionMakerCapacity: "Synthetic hosted-distribution test authority",
    decisionEvidenceReference:
      "https://example.test/hosted-distribution-decision",
    reviewPackReference: `qualified-review-pack@${exactReviewPack.integrity.digest}`,
    exactCorpusAndPackReviewed: true,
    activationRemainsSeparate: true,
  },
  qualifiedReview: {
    status: "complete",
    reviewerName: "Fixture review lead",
    reviewerCapacity: "Scoped multidisciplinary test reviewer",
    completedOn: opportunityCorpusJson.meta.preparedAt,
    evidenceReference: `qualified-review-pack@${exactReviewPack.integrity.digest}`,
    institutionalRightOfReply: {
      status: "completed",
      basis: "Each scrutiny record carries the material official response.",
      evidenceReference: `qualified-review-pack@${exactReviewPack.integrity.digest}#right-of-reply`,
    },
    confirmations: {
      currentLawTerritoryDeadlineAndRoute: true,
      privacySecurityAndThreatReview: true,
      noIntakeMarketplaceOrSubmission: true,
      emergencyStopExercised: true,
      correctionAndWithdrawalOwnersAssigned: true,
    },
  },
} as const;

describe("UK professional-opportunity static publication approval", () => {
  it("keeps the checked-in corpus closed while qualified review is pending", () => {
    expect(
      ukProfessionalOpportunityStaticPublication.exactCorpusApproved,
    ).toBe(false);
    expect(
      ukProfessionalOpportunityStaticPublication.computedCorpusDigest,
    ).toBe(exactTechnicalApproval.corpusDigest);
    expect(
      isUkProfessionalOpportunityStaticallyPublished(
        "uk-business-rates-valuation",
      ),
    ).toBe(false);
    expect(ukProfessionalOpportunityCorpus).toBeNull();
  });

  it("can project an exact approved fixture without weakening production", () => {
    expect(
      evaluateUkProfessionalOpportunityStaticPublication(
        opportunityCorpusJson,
        exactTechnicalApproval,
      ).approved,
    ).toBe(true);
    const projected = projectUkProfessionalOpportunityCorpus(
      opportunityCorpusJson,
      exactTechnicalApproval,
      { publicDataEnabled: true },
    );
    expect(projected?.opportunities.map((opportunity) => opportunity.id)).toEqual(
      exactTechnicalApproval.opportunityIds,
    );
  });

  it("requires the exact current multidisciplinary pack on the static side too", () => {
    expect(
      evaluateStaticPublication(
        opportunityCorpusJson,
        exactTechnicalApproval,
        exactReviewPack,
        evaluationDate,
      ).approved,
    ).toBe(true);

    const fakeAuthority = structuredClone(
      exactTechnicalApproval,
    ) as unknown as PublicationApproval;
    fakeAuthority.qualifiedReview.reviewerName = "Mickey Mouse";
    fakeAuthority.qualifiedReview.reviewerCapacity =
      "qualified UK reviewer";
    fakeAuthority.qualifiedReview.evidenceReference = "trust me";
    expect(
      evaluateStaticPublication(
        opportunityCorpusJson,
        fakeAuthority,
        exactReviewPack,
        evaluationDate,
      ).approved,
    ).toBe(false);

    const missingInstitution = structuredClone(exactReviewPack);
    missingInstitution.scrutinyReviews[0].rightOfReply.pop();
    missingInstitution.integrity.digest =
      reviewPackDigestOrThrow(missingInstitution);
    const changedReference = structuredClone(
      exactTechnicalApproval,
    ) as unknown as PublicationApproval;
    changedReference.qualifiedReview.evidenceReference =
      `qualified-review-pack@${missingInstitution.integrity.digest}`;
    changedReference.qualifiedReview.institutionalRightOfReply.evidenceReference =
      `qualified-review-pack@${missingInstitution.integrity.digest}#right-of-reply`;
    expect(
      evaluateStaticPublication(
        opportunityCorpusJson,
        changedReference,
        missingInstitution,
        evaluationDate,
      ).approved,
    ).toBe(false);

    expect(
      evaluateStaticPublication(
        opportunityCorpusJson,
        exactTechnicalApproval,
        exactReviewPack,
        "2026-10-25",
      ).approved,
    ).toBe(false);
  });

  it("fails closed after an unapproved corpus edit or ID-list change", () => {
    const changedCorpus = structuredClone(opportunityCorpusJson);
    changedCorpus.meta.title = "Changed without a publication approval";
    expect(
      evaluateUkProfessionalOpportunityStaticPublication(
        changedCorpus,
        exactTechnicalApproval,
      ).approved,
    ).toBe(false);

    const changedApproval = {
      ...exactTechnicalApproval,
      opportunityIds: [
        ...exactTechnicalApproval.opportunityIds,
        "not-in-corpus",
      ],
    };
    expect(
      evaluateUkProfessionalOpportunityStaticPublication(
        opportunityCorpusJson,
        changedApproval,
      ).approved,
    ).toBe(false);

    expect(
      projectUkProfessionalOpportunityCorpus(
        changedCorpus,
        exactTechnicalApproval,
      ),
    ).toBeNull();
    expect(
      projectUkProfessionalOpportunityCorpus(
        opportunityCorpusJson,
        changedApproval,
      ),
    ).toBeNull();

    const omittedApproval = {
      ...exactTechnicalApproval,
      opportunityIds: exactTechnicalApproval.opportunityIds.slice(1),
    };
    expect(
      evaluateUkProfessionalOpportunityStaticPublication(
        opportunityCorpusJson,
        omittedApproval,
      ).approved,
    ).toBe(false);

    const reorderedApproval = {
      ...exactTechnicalApproval,
      opportunityIds: [...exactTechnicalApproval.opportunityIds].reverse(),
    };
    expect(
      evaluateUkProfessionalOpportunityStaticPublication(
        opportunityCorpusJson,
        reorderedApproval,
      ).approved,
    ).toBe(false);

    for (const impossibleDate of ["2026-99-99", "2025-02-29"]) {
      expect(
        evaluateUkProfessionalOpportunityStaticPublication(
          opportunityCorpusJson,
          {
            ...exactTechnicalApproval,
            decisionRecordedOn: impossibleDate,
          },
        ).approved,
      ).toBe(false);
    }
  });

  it("cannot open by changing approval status without a complete qualified review", () => {
    const approvalWithoutQualifiedReview = {
      ...exactTechnicalApproval,
    };
    Reflect.deleteProperty(
      approvalWithoutQualifiedReview,
      "qualifiedReview",
    );
    expect(
      evaluateUkProfessionalOpportunityStaticPublication(
        opportunityCorpusJson,
        // Deliberately exercise malformed runtime JSON, outside the TS contract.
        approvalWithoutQualifiedReview as unknown as typeof exactTechnicalApproval,
      ).approved,
    ).toBe(false);

    expect(
      evaluateUkProfessionalOpportunityStaticPublication(
        opportunityCorpusJson,
        {
          ...exactTechnicalApproval,
          qualifiedReview: publicationApprovalJson.qualifiedReview,
        },
      ).approved,
    ).toBe(false);

    for (const confirmation of Object.keys(
      exactTechnicalApproval.qualifiedReview.confirmations,
    ) as Array<
      keyof typeof exactTechnicalApproval.qualifiedReview.confirmations
    >) {
      expect(
        evaluateUkProfessionalOpportunityStaticPublication(
          opportunityCorpusJson,
          {
            ...exactTechnicalApproval,
            qualifiedReview: {
              ...exactTechnicalApproval.qualifiedReview,
              confirmations: {
                ...exactTechnicalApproval.qualifiedReview.confirmations,
                [confirmation]: false,
              },
            },
          },
        ).approved,
        confirmation,
      ).toBe(false);
    }

    for (const field of [
      "reviewerName",
      "reviewerCapacity",
      "completedOn",
      "evidenceReference",
    ] as const) {
      expect(
        evaluateUkProfessionalOpportunityStaticPublication(
          opportunityCorpusJson,
          {
            ...exactTechnicalApproval,
            qualifiedReview: {
              ...exactTechnicalApproval.qualifiedReview,
              [field]: null,
            },
          },
        ).approved,
        field,
      ).toBe(false);
    }

    for (const completedOn of ["2026-07-23", "2026-07-25"]) {
      expect(
        evaluateUkProfessionalOpportunityStaticPublication(
          opportunityCorpusJson,
          {
            ...exactTechnicalApproval,
            decisionRecordedOn: "2026-07-24",
            qualifiedReview: {
              ...exactTechnicalApproval.qualifiedReview,
              completedOn,
            },
          },
        ).approved,
        completedOn,
      ).toBe(false);
    }

    expect(
      evaluateUkProfessionalOpportunityStaticPublication(
        opportunityCorpusJson,
        {
          ...exactTechnicalApproval,
          qualifiedReview: {
            ...exactTechnicalApproval.qualifiedReview,
            institutionalRightOfReply: {
              status: "pending",
              basis: null,
              evidenceReference: null,
            },
          },
        },
      ).approved,
    ).toBe(false);
  });

  it("rejects unsafe or malformed qualified-review evidence references", () => {
    for (const reference of [
      "http://example.test/review",
      "HTTPS://example.test/review",
      "ftp://example.test/review",
      "https://",
      "https://[invalid-host/review",
      "x".repeat(1_001),
      " ",
    ]) {
      for (const target of ["review", "right-of-reply"] as const) {
        const approval = structuredClone(
          exactTechnicalApproval,
        ) as unknown as PublicationApproval;
        if (target === "review") {
          approval.qualifiedReview.evidenceReference = reference;
        } else {
          approval.qualifiedReview.institutionalRightOfReply.evidenceReference =
            reference;
        }
        expect(
          evaluateUkProfessionalOpportunityStaticPublication(
            opportunityCorpusJson,
            approval,
          ).approved,
          `${target}: ${reference.slice(0, 80)}`,
        ).toBe(false);
      }
    }
  });

  it("enforces API short-text bounds on public reviewer labels and reply basis", () => {
    const mutations: Array<{
      label: string;
      mutate: (
        review: PublicationApproval["qualifiedReview"],
        value: string,
      ) => void;
    }> = [
      {
        label: "reviewerName",
        mutate: (review, value) => {
          review.reviewerName = value;
        },
      },
      {
        label: "reviewerCapacity",
        mutate: (review, value) => {
          review.reviewerCapacity = value;
        },
      },
      {
        label: "institutionalRightOfReply.basis",
        mutate: (review, value) => {
          review.institutionalRightOfReply.basis = value;
        },
      },
    ];

    for (const { label, mutate } of mutations) {
      for (const value of [" ", "x".repeat(1_001)]) {
        const approval = structuredClone(
          exactTechnicalApproval,
        ) as unknown as PublicationApproval;
        mutate(approval.qualifiedReview, value);
        expect(
          evaluateUkProfessionalOpportunityStaticPublication(
            opportunityCorpusJson,
            approval,
          ).approved,
          `${label}: ${value.length}`,
        ).toBe(false);
      }
    }
  });

  it("matches the API guard on adversarial review-pack mutations", () => {
    const mutations: Array<(pack: MutableReviewPack) => void> = [
      (pack) => {
        pack.opportunityReviews[0].evidenceIds = [];
      },
      (pack) => {
        delete pack.reviewers[0].capacityBasis;
      },
      (pack) => {
        pack.reviewers[0].capacityBasis =
          "Private verification at /Users/alice/matter; alice@example.test";
      },
      (pack) => {
        pack.reviewers[0].capacityBasis =
          " Synthetic test-only capacity ";
      },
      (pack) => {
        pack.corpus.lawAsAt = "2099-01-01";
      },
      (pack) => {
        pack.integrity.digestScope = "Everything except inconvenient fields";
      },
      (pack) => {
        pack.boundaries.pop();
      },
      (pack) => {
        pack.sourceChecks[0].url =
          "https://example.test/tampered-source";
      },
      (pack) => {
        pack.reviewers[0].roles.push("unknown-review-role");
      },
      (pack) => {
        pack.privateClientPath = "/private/client/alice";
      },
      (pack) => {
        pack.evidenceIndex.push({
          id: "unsafe-private-evidence",
          purpose: "reviewer-independence",
          visibility: "private-custodian-record",
          custodianRole: "/private/client/alice",
          opaqueRecordId: "not-a-uuid",
          path: "/private/client/alice",
        });
      },
      (pack) => {
        pack.evidenceIndex.push({
          id: "nil-private-evidence",
          purpose: "reviewer-independence",
          visibility: "private-custodian-record",
          custodianRole: "Independent review custodian",
          opaqueRecordId: "00000000-0000-0000-0000-000000000000",
        });
      },
      (pack) => {
        pack.evidenceIndex.push({
          id: "credential-bearing-url",
          purpose: "reviewer-independence",
          visibility: "public-https",
          url: "https://alice:secret@example.test/private",
        });
      },
      (pack) => {
        pack.declaration.reviewStartedOn = "1900-01-01";
      },
      (pack) => {
        pack.reviewers[0].scope.opportunityIds.push(
          "unknown-opportunity",
        );
      },
      (pack) => {
        pack.reviewers[0].independence
          .independentOfAffectedInstitutionsInScope = false;
      },
      (pack) => {
        pack.reviewers[1].publicName = pack.reviewers[0].publicName;
      },
      (pack) => {
        const evidenceId =
          pack.opportunityReviews[0].evidenceIds[0];
        pack.opportunityReviews[0].evidenceIds = [
          evidenceId,
          evidenceId,
        ];
      },
      (pack) => {
        pack.opportunityReviews[0].evidenceIds = [
          pack.sourceChecks[0].evidenceIds[0],
        ];
      },
      (pack) => {
        const ids = Array.from(
          { length: 21 },
          (_, index) => `extra-qualification-${index}`,
        );
        pack.evidenceIndex.push(
          ...ids.map((id) => ({
            id,
            purpose: "reviewer-qualification",
            visibility: "public-https",
            url: `https://example.test/${id}`,
          })),
        );
        pack.reviewers[0].qualificationEvidenceIds = ids;
      },
      (pack) => {
        const reply =
          pack.scrutinyReviews[0].rightOfReply[0];
        Object.assign(reply, {
          disposition: "fresh-reply-completed",
          sentOn: "2026-07-24",
          replyDueOn: "2026-07-24",
          receivedOn: "2026-07-25",
          resolvedOn: "2026-07-24",
        });
      },
      (pack) => {
        pack.controls.emergencyStopDrill.startedAt = "2026-07-24";
      },
    ];

    for (const mutate of mutations) {
      const pack = structuredClone(exactReviewPack);
      mutate(pack);
      pack.integrity.digest = reviewPackDigestOrThrow(pack);
      expect(
        evaluateStaticPublication(
          opportunityCorpusJson,
          exactTechnicalApproval,
          pack,
          evaluationDate,
        ).approved,
      ).toBe(false);
    }
  });

  it("requires a separate accountable hosted-distribution decision", () => {
    const mutations: Array<(approval: PublicationApproval) => void> = [
      (approval) => {
        approval.hostedDistributionDecision.decisionMakerName = null;
      },
      (approval) => {
        approval.hostedDistributionDecision.decisionMakerName =
          approval.qualifiedReview.reviewerName;
      },
      (approval) => {
        approval.hostedDistributionDecision.decisionMakerName =
          "/private/reviewer/alice";
      },
      (approval) => {
        approval.hostedDistributionDecision.decisionMakerCapacity =
          "Private authority at /Users/alice/matter";
      },
      (approval) => {
        approval.hostedDistributionDecision.decisionEvidenceReference =
          "/private/review/decision";
      },
      (approval) => {
        approval.hostedDistributionDecision.decisionEvidenceReference =
          approval.hostedDistributionDecision.reviewPackReference;
      },
      (approval) => {
        approval.hostedDistributionDecision.reviewPackReference =
          "qualified-review-pack@sha256:0000000000000000000000000000000000000000000000000000000000000000";
      },
      (approval) => {
        approval.hostedDistributionDecision.exactCorpusAndPackReviewed =
          false;
      },
      (approval) => {
        approval.hostedDistributionDecision.activationRemainsSeparate =
          false;
      },
      (approval) => {
        approval.effects = "";
      },
      (approval) => {
        approval.qualifiedReview.institutionalRightOfReply.basis =
          "Contact alice@example.test for the private reply";
      },
    ];
    for (const mutate of mutations) {
      const approval = structuredClone(
        exactTechnicalApproval,
      ) as unknown as PublicationApproval;
      mutate(approval);
      expect(
        evaluateUkProfessionalOpportunityStaticPublication(
          opportunityCorpusJson,
          approval,
        ).approved,
      ).toBe(false);
    }
  });

  it("projects no corpus text or record while the static emergency stop is active", () => {
    expect(
      projectUkProfessionalOpportunityCorpus(
        opportunityCorpusJson,
        exactTechnicalApproval,
        { emergencyStop: true },
      ),
    ).toBeNull();
  });

  it("projects no corpus until the independent public-data switch is enabled", () => {
    expect(
      projectUkProfessionalOpportunityCorpus(
        opportunityCorpusJson,
        exactTechnicalApproval,
        { publicDataEnabled: false },
      ),
    ).toBeNull();
  });

  it("treats every nonempty emergency-stop value except exact false as stopped", () => {
    expect(parseUkProfessionalOpportunityEmergencyStop(undefined)).toBe(false);
    expect(parseUkProfessionalOpportunityEmergencyStop("")).toBe(false);
    expect(parseUkProfessionalOpportunityEmergencyStop("false")).toBe(false);
    for (const value of ["true", "TRUE", "1", "yes", " false "]) {
      expect(parseUkProfessionalOpportunityEmergencyStop(value)).toBe(true);
    }
  });
});
