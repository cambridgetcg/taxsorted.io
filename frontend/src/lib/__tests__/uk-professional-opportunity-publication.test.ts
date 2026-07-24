import { describe, expect, it } from "vitest";
import opportunityCorpusJson from "../../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json";
import publicationApprovalJson from "../../../../research/uk/professional-opportunities/data/publication-approval.json";
import {
  projectUkProfessionalOpportunityCorpus,
  ukProfessionalOpportunityCorpus,
} from "../uk-professional-opportunities";
import {
  evaluateUkProfessionalOpportunityStaticPublication,
  isUkProfessionalOpportunityStaticallyPublished,
  parseUkProfessionalOpportunityEmergencyStop,
  ukProfessionalOpportunityStaticPublication,
  type PublicationApproval,
} from "../uk-professional-opportunity-publication";

const exactTechnicalApproval = {
  ...publicationApprovalJson,
  status: "approved-for-publication",
  corpusVersion: opportunityCorpusJson.meta.version,
  corpusDigest: evaluateUkProfessionalOpportunityStaticPublication(
    opportunityCorpusJson,
    publicationApprovalJson,
  ).corpusDigest,
  opportunityIds: opportunityCorpusJson.opportunities.map(
    (opportunity) => opportunity.id,
  ),
  qualifiedReview: {
    status: "complete",
    reviewerName: "Fixture reviewer",
    reviewerCapacity: "Qualified UK professional test fixture",
    completedOn: opportunityCorpusJson.meta.preparedAt,
    evidenceReference: "test-fixture-review-record",
    institutionalRightOfReply: {
      status: "official-response-documented",
      basis: "Each scrutiny record carries the material official response.",
      evidenceReference: "test-fixture-right-of-reply-record",
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
