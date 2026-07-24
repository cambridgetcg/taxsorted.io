import { createHash } from "node:crypto";
import Ajv2020 from "ajv/dist/2020.js";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { canonicalJson } from "../open-data.js";
import { createUkProfessionalOpportunityRoutes } from "../routes/uk-professional-opportunities.js";
import {
  professionalOpportunityReviewPackApprovalFacts,
  type ProfessionalOpportunityReviewPack,
} from "../uk-professional-opportunity-review.js";
import {
  evaluateProfessionalOpportunityPublicationApproval as evaluatePublicationApproval,
  makeProfessionalOpportunityPacket,
  professionalOpportunityCorpusDigest,
  professionalOpportunityCorpusJsonSchema,
  professionalOpportunityPacketJsonSchema,
  professionalOpportunityPacketSchema,
  professionalOpportunityPublicationApprovalSchema,
  professionalOpportunityResponseSchema,
  scrutinyForProfessionalOpportunityValue,
  sourcesForProfessionalOpportunityValue,
  ukProfessionalOpportunities,
  ukProfessionalOpportunityPublicationApproval,
  ukProfessionalOpportunityPublicationDecision,
  validateUkProfessionalOpportunities,
  type ProfessionalOpportunityPublicationApproval,
  type UkProfessionalOpportunities,
} from "../uk-professional-opportunities.js";
import { completeProfessionalOpportunityReviewPackFixture } from "./professional-opportunity-review-fixture.js";

const basePath = "/v1/professional-opportunities/uk";

function reviewPackFor(corpus: UkProfessionalOpportunities) {
  return completeProfessionalOpportunityReviewPackFixture(corpus);
}

function evaluateProfessionalOpportunityPublicationApproval(
  corpus: UkProfessionalOpportunities,
  approval: ProfessionalOpportunityPublicationApproval | null,
  reviewPack: ProfessionalOpportunityReviewPack | null =
    reviewPackFor(corpus),
  asOf = corpus.meta.retrievedAt,
) {
  return evaluatePublicationApproval(
    corpus,
    approval,
    reviewPack,
    asOf,
  );
}

function mount(
  options: Parameters<typeof createUkProfessionalOpportunityRoutes>[0] = {},
) {
  const app = new Hono();
  let sessionCalls = 0;
  const corpus = options.corpus ?? ukProfessionalOpportunities;
  const publicationApproval =
    options.publicationApproval === undefined
      ? approvalFor(corpus)
      : options.publicationApproval;
  const reviewPack =
    options.reviewPack === undefined
      ? reviewPackFor(corpus)
      : options.reviewPack;
  app.route(
    basePath,
    createUkProfessionalOpportunityRoutes({
      enabled: true,
      ...options,
      publicationApproval,
      reviewPack,
      now:
        options.now ??
        (() => new Date(`${corpus.meta.retrievedAt}T12:00:00.000Z`)),
    }),
  );
  app.use("/v1/*", async (c, next) => {
    sessionCalls++;
    c.header("Set-Cookie", "taxsorted_private_session=must-not-exist");
    await next();
  });
  return { app, sessionCalls: () => sessionCalls };
}

function cloneCorpus() {
  return structuredClone(
    ukProfessionalOpportunities,
  ) as UkProfessionalOpportunities;
}

function approvalFor(
  corpus: UkProfessionalOpportunities,
): ProfessionalOpportunityPublicationApproval {
  const reviewPack = reviewPackFor(corpus);
  const reviewFacts =
    professionalOpportunityReviewPackApprovalFacts(reviewPack);
  if (!reviewFacts) {
    throw new Error("synthetic review pack must be complete");
  }
  return {
    schema:
      "taxsorted.uk.professional-opportunities-publication-approval/3",
    status: "approved-for-hosted-distribution",
    decisionRecordedOn: corpus.meta.retrievedAt,
    corpusVersion: corpus.meta.version,
    corpusDigest: professionalOpportunityCorpusDigest(corpus),
    opportunityIds: corpus.opportunities.map(
      (opportunity) => opportunity.id,
    ),
    hostedDistributionDecision: {
      status: "approved",
      decisionMakerName: "Synthetic accountable publisher",
      decisionMakerCapacity: "Synthetic hosted-distribution test authority",
      decisionEvidenceReference:
        "https://example.test/hosted-distribution-decision",
      reviewPackReference: reviewFacts.reference,
      exactCorpusAndPackReviewed: true,
      activationRemainsSeparate: true,
    },
    qualifiedReview: {
      status: "complete",
      reviewerName: reviewFacts.reviewerName,
      reviewerCapacity: reviewFacts.reviewerCapacity,
      completedOn: reviewFacts.completedOn,
      evidenceReference: reviewFacts.reference,
      confirmations: {
        currentLawTerritoryDeadlineAndRoute: true,
        privacySecurityAndThreatReview: true,
        noIntakeMarketplaceOrSubmission: true,
        emergencyStopExercised: true,
        correctionAndWithdrawalOwnersAssigned: true,
      },
      institutionalRightOfReply: {
        status: "completed",
        basis:
          "Synthetic unit-test approval has no institutional subject.",
        evidenceReference: reviewFacts.rightOfReplyReference,
      },
    },
    effects:
      "Approves only this exact reviewed corpus for read-only publication.",
  };
}

function pendingApprovalFor(
  corpus: UkProfessionalOpportunities,
): ProfessionalOpportunityPublicationApproval {
  return {
    ...approvalFor(corpus),
    status: "pending-qualified-review",
    decisionRecordedOn: null,
    hostedDistributionDecision: {
      status: "pending",
      decisionMakerName: null,
      decisionMakerCapacity: null,
      decisionEvidenceReference: null,
      reviewPackReference: null,
      exactCorpusAndPackReviewed: false,
      activationRemainsSeparate: false,
    },
    qualifiedReview: {
      status: "pending",
      reviewerName: null,
      reviewerCapacity: null,
      completedOn: null,
      evidenceReference: null,
      confirmations: {
        currentLawTerritoryDeadlineAndRoute: false,
        privacySecurityAndThreatReview: false,
        noIntakeMarketplaceOrSubmission: false,
        emergencyStopExercised: false,
        correctionAndWithdrawalOwnersAssigned: false,
      },
      institutionalRightOfReply: {
        status: "pending",
        basis: null,
        evidenceReference: null,
      },
    },
  };
}

function visibleArtifactsWithout(opportunityId: string) {
  const opportunities = ukProfessionalOpportunities.opportunities.filter(
    (opportunity) => opportunity.id !== opportunityId,
  );
  const scrutiny = scrutinyForProfessionalOpportunityValue(
    { opportunities },
    ukProfessionalOpportunities,
  );
  const sources = sourcesForProfessionalOpportunityValue(
    {
      method: ukProfessionalOpportunities.method,
      sharedWorkflow: ukProfessionalOpportunities.sharedWorkflow,
      opportunities,
      scrutiny,
    },
    ukProfessionalOpportunities,
  );
  return { opportunities, scrutiny, sources };
}

function stoppableOpportunity() {
  const allScrutinyIds = new Set(
    ukProfessionalOpportunities.scrutiny.map((record) => record.id),
  );
  const allSourceIds = new Set(
    ukProfessionalOpportunities.sources.map((source) => source.id),
  );
  const candidate = ukProfessionalOpportunities.opportunities.find(
    (opportunity) => {
      const visible = visibleArtifactsWithout(opportunity.id);
      return (
        visible.scrutiny.length < allScrutinyIds.size &&
        visible.sources.length < allSourceIds.size
      );
    },
  );
  if (!candidate) {
    throw new Error(
      "test corpus needs an opportunity with private scrutiny and sources",
    );
  }
  return candidate;
}

describe("UK professional-opportunity corpus", () => {
  it("loads the exact source-resolved research corpus", () => {
    const corpus = validateUkProfessionalOpportunities(
      ukProfessionalOpportunities,
    );
    expect(corpus.meta.recordCounts).toEqual({
      opportunities: 9,
      scrutiny: 5,
      sources: 67,
    });
    expect(corpus.publication).toMatchObject({
      status: "professional-opportunity-research",
      writes: false,
      publicIntake: false,
      professionalMarketplace: false,
      publicationRequiresMatchingApproval: true,
      confidentialCorrectionChannel: null,
    });
    expect(corpus.method.professionalStatusBoundary.generalRule).toMatch(
      /not generally a reserved activity|not a universal/i,
    );
    expect(corpus.sharedWorkflow).toMatchObject({
      noSubmissionEndpoint: true,
      terminalDecisions: [
        "declined",
        "needs-more-evidence",
        "refer-with-consent",
        "suitable-for-further-private-review",
      ],
      moneyStateOrder: [
        "amountAffected",
        "qualifyingBase",
        "amountClaimed",
        "amountAccepted",
        "amountReceivedOrCredited",
        "amountPaidByClient",
        "redress",
        "costs",
        "interestReceived",
        "interestPaid",
        "professionalFees",
        "netClientPosition",
      ],
      challengeSeparation: {
        routes: [
          expect.objectContaining({
            id: "appeal-review",
            sourceIds: [
              "hmrc-penalty-appeal",
              "hmrc-tax-decision-appeal",
              "hmrc-tax-decision-review",
              "tax-tribunal-appeal",
            ],
          }),
          expect.objectContaining({
            id: "complaint",
            sourceIds: [
              "adjudicator-complaint-guidance",
              "hmrc-complaints",
              "phso-complaint-boundary",
            ],
          }),
          expect.objectContaining({
            id: "judicial-review",
            sourceIds: [
              "cpr-part-54",
              "judicial-review-protocol",
            ],
          }),
        ],
      },
    });
    expect(
      corpus.opportunities.every(
        (opportunity) =>
          opportunity.publicationStatus ===
          "read-only-research",
      ),
    ).toBe(true);
    for (const opportunity of corpus.opportunities) {
      for (const role of opportunity.professionalRoles) {
        expect(role.gates.length).toBeGreaterThan(0);
        expect(
          role.gates.some((gate) => gate.kind === "prudent-specialism"),
        ).toBe(true);
        expect(role).not.toHaveProperty("gateKind");
        expect(role).not.toHaveProperty("verification");
      }
    }
  });

  it("keeps the checked-in corpus closed pending qualified review", () => {
    expect(ukProfessionalOpportunityPublicationApproval).not.toBeNull();
    expect(ukProfessionalOpportunityPublicationApproval?.status).toBe(
      "pending-qualified-review",
    );
    expect(ukProfessionalOpportunityPublicationDecision).toMatchObject({
      approved: false,
      reason: "pending-qualified-review",
      approvedOpportunityIds: [],
    });
  });

  it.each([
    {
      state: "a complete review status",
      mutate: (approval: any) => {
        approval.qualifiedReview.status = "complete";
      },
    },
    {
      state: "an attestor value",
      mutate: (approval: any) => {
        approval.qualifiedReview.reviewerName =
          "Premature reviewer label";
      },
    },
    {
      state: "a true confirmation",
      mutate: (approval: any) => {
        approval.qualifiedReview.confirmations
          .emergencyStopExercised = true;
      },
    },
    {
      state: "a resolved institutional right of reply",
      mutate: (approval: any) => {
        approval.qualifiedReview.institutionalRightOfReply = {
          status: "completed",
          basis: "Premature right-of-reply claim",
          evidenceReference: "premature-right-of-reply-reference",
        };
      },
    },
  ])("rejects pending approval carrying $state", ({ mutate }) => {
    const approval = structuredClone(
      pendingApprovalFor(ukProfessionalOpportunities),
    ) as any;
    mutate(approval);

    expect(
      professionalOpportunityPublicationApprovalSchema.safeParse(
        approval,
      ).success,
    ).toBe(false);
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        approval,
      ),
    ).toMatchObject({
      approved: false,
      reason: "approval-invalid",
      approvedOpportunityIds: [],
    });
  });

  it("binds a future approval to the exact digest, version and complete ID list", () => {
    const exactApproval = approvalFor(ukProfessionalOpportunities);
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        exactApproval,
      ),
    ).toMatchObject({
      approved: true,
      reason: "approved",
      corpusDigest: professionalOpportunityCorpusDigest(
        ukProfessionalOpportunities,
      ),
    });
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        {
          ...pendingApprovalFor(ukProfessionalOpportunities),
          corpusVersion: "not-yet-reviewed",
          corpusDigest: `sha256:${"0".repeat(64)}`,
        },
      ),
    ).toMatchObject({
      approved: false,
      reason: "pending-qualified-review",
      approvedOpportunityIds: [],
    });

    const changed = cloneCorpus();
    changed.meta.warning = `${changed.meta.warning} Material change.`;
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        changed,
        exactApproval,
      ),
    ).toMatchObject({
      approved: false,
      reason: "corpus-digest-mismatch",
      approvedOpportunityIds: [],
    });

    const incompleteApproval = approvalFor(ukProfessionalOpportunities);
    incompleteApproval.opportunityIds =
      incompleteApproval.opportunityIds.slice(1);
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        incompleteApproval,
      ),
    ).toMatchObject({
      approved: false,
      reason: "opportunity-ids-mismatch",
    });
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        null,
      ),
    ).toMatchObject({ approved: false, reason: "approval-missing" });
  });

  it.each([
    {
      state: "pending qualified-review status",
      mutate: (approval: any) => {
        approval.qualifiedReview.status = "pending";
      },
    },
    {
      state: "missing qualified reviewer",
      mutate: (approval: any) => {
        delete approval.qualifiedReview.reviewerName;
      },
    },
    {
      state: "one unconfirmed release condition",
      mutate: (approval: any) => {
        approval.qualifiedReview.confirmations
          .privacySecurityAndThreatReview = false;
      },
    },
    {
      state: "a missing accountable publisher",
      mutate: (approval: any) => {
        approval.hostedDistributionDecision.decisionMakerName = null;
      },
    },
    {
      state: "a publisher label copied from the review lead",
      mutate: (approval: any) => {
        approval.hostedDistributionDecision.decisionMakerName =
          approval.qualifiedReview.reviewerName;
      },
    },
    {
      state: "a publisher label shaped like a private path",
      mutate: (approval: any) => {
        approval.hostedDistributionDecision.decisionMakerName =
          "/private/reviewer/alice";
      },
    },
    {
      state: "private publisher capacity text",
      mutate: (approval: any) => {
        approval.hostedDistributionDecision.decisionMakerCapacity =
          "Private authority at /Users/alice/matter";
      },
    },
    {
      state: "a private-path publisher decision reference",
      mutate: (approval: any) => {
        approval.hostedDistributionDecision.decisionEvidenceReference =
          "/private/review/decision";
      },
    },
    {
      state: "review evidence reused as the publisher decision",
      mutate: (approval: any) => {
        approval.hostedDistributionDecision.decisionEvidenceReference =
          approval.hostedDistributionDecision.reviewPackReference;
      },
    },
    {
      state: "an activation decision hidden inside review",
      mutate: (approval: any) => {
        approval.hostedDistributionDecision.activationRemainsSeparate =
          false;
      },
    },
    {
      state: "empty public effects text",
      mutate: (approval: any) => {
        approval.effects = "";
      },
    },
    {
      state: "a contact detail in the public reply basis",
      mutate: (approval: any) => {
        approval.qualifiedReview.institutionalRightOfReply.basis =
          "Contact alice@example.test for the private reply";
      },
    },
  ])(
    "never opens approved-for-hosted-distribution with $state",
    ({ mutate }) => {
      const approval = structuredClone(
        approvalFor(ukProfessionalOpportunities),
      ) as any;
      mutate(approval);

      expect(
        professionalOpportunityPublicationApprovalSchema.safeParse(
          approval,
        ).success,
      ).toBe(false);
      expect(
        evaluateProfessionalOpportunityPublicationApproval(
          ukProfessionalOpportunities,
          approval,
        ),
      ).toMatchObject({
        approved: false,
        reason: "approval-invalid",
        approvedOpportunityIds: [],
      });
    },
  );

  it("requires review chronology and a resolved institutional right of reply", () => {
    const beforeRetrieval = structuredClone(
      approvalFor(ukProfessionalOpportunities),
    ) as any;
    beforeRetrieval.qualifiedReview.completedOn = "2026-07-23";
    expect(
      professionalOpportunityPublicationApprovalSchema.safeParse(
        beforeRetrieval,
      ).success,
    ).toBe(true);
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        beforeRetrieval,
      ),
    ).toMatchObject({
      approved: false,
      reason: "approval-invalid",
    });

    const decisionBeforeReview = structuredClone(
      approvalFor(ukProfessionalOpportunities),
    ) as any;
    decisionBeforeReview.decisionRecordedOn = "2026-07-23";
    expect(
      professionalOpportunityPublicationApprovalSchema.safeParse(
        decisionBeforeReview,
      ).success,
    ).toBe(false);
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        decisionBeforeReview,
      ),
    ).toMatchObject({
      approved: false,
      reason: "approval-invalid",
    });

    const pendingRightOfReply = structuredClone(
      approvalFor(ukProfessionalOpportunities),
    ) as any;
    pendingRightOfReply.qualifiedReview.institutionalRightOfReply = {
      status: "pending",
      basis: null,
      evidenceReference: null,
    };
    expect(
      professionalOpportunityPublicationApprovalSchema.safeParse(
        pendingRightOfReply,
      ).success,
    ).toBe(false);
    expect(
      evaluateProfessionalOpportunityPublicationApproval(
        ukProfessionalOpportunities,
        pendingRightOfReply,
      ),
    ).toMatchObject({
      approved: false,
      reason: "approval-invalid",
    });
  });

  it.each([
    "probability",
    "expectedValue",
    "professionalRevenue",
    "referral",
    "ranking",
    "lawFirmContact",
    "payout",
  ])("rejects a hidden sales or dossier field named %s", (field) => {
    const corpus = cloneCorpus() as any;
    corpus.opportunities[0][field] = "not admissible";
    expect(() => validateUkProfessionalOpportunities(corpus)).toThrow();
  });

  it("rejects unresolved, unused, duplicate and nondeterministic references", () => {
    const unresolved = cloneCorpus() as any;
    unresolved.opportunities[0].sourceIds[0] = "source-that-does-not-exist";
    expect(() => validateUkProfessionalOpportunities(unresolved)).toThrow(
      /does not resolve/,
    );

    const unresolvedSharedRoute = cloneCorpus() as any;
    unresolvedSharedRoute.sharedWorkflow.challengeSeparation.routes[0]
      .sourceIds[0] = "source-that-does-not-exist";
    expect(() =>
      validateUkProfessionalOpportunities(unresolvedSharedRoute),
    ).toThrow(/does not resolve/);

    const unused = cloneCorpus() as any;
    unused.sources.push({
      ...unused.sources.at(-1),
      id: "zz-unused-source",
    });
    unused.meta.recordCounts.sources++;
    expect(() => validateUkProfessionalOpportunities(unused)).toThrow(
      /not used/,
    );

    const duplicate = cloneCorpus() as any;
    duplicate.opportunities[0].sourceIds.push(
      duplicate.opportunities[0].sourceIds[0],
    );
    expect(() => validateUkProfessionalOpportunities(duplicate)).toThrow(
      /unique/,
    );

    const reordered = cloneCorpus() as any;
    reordered.scrutiny.reverse();
    expect(() => validateUkProfessionalOpportunities(reordered)).toThrow(
      /ordered deterministically/,
    );

    const reorderedSharedRoutes = cloneCorpus() as any;
    reorderedSharedRoutes.sharedWorkflow.challengeSeparation.routes.reverse();
    expect(() =>
      validateUkProfessionalOpportunities(reorderedSharedRoutes),
    ).toThrow(/shared challenge routes must retain/);
  });

  it("builds complete source-resolved packets with a reproducible digest", () => {
    for (const opportunity of ukProfessionalOpportunities.opportunities) {
      const packet = makeProfessionalOpportunityPacket(
        opportunity.id,
        ukProfessionalOpportunities,
      );
      expect(packet).not.toBeNull();
      const parsed = professionalOpportunityPacketSchema.parse(packet);
      expect(parsed.opportunity.id).toBe(opportunity.id);
      expect(parsed.sources.length).toBeGreaterThan(0);
      expect(parsed.integrity.doesNotProve.join(" ")).toMatch(
        /qualified|probability|viable/i,
      );

      const { integrity, links: _links, ...preimage } = parsed;
      const expectedDigest = `sha256:${createHash("sha256")
        .update(canonicalJson(preimage))
        .digest("hex")}`;
      expect(integrity.digest).toBe(expectedDigest);

      const includedSourceIds = new Set(
        parsed.sources.map((source) => source.id),
      );
      const referenced = sourcesForProfessionalOpportunityValue(
        {
          method: parsed.method,
          sharedWorkflow: parsed.sharedWorkflow,
          opportunity: parsed.opportunity,
          scrutiny: parsed.scrutiny,
        },
        ukProfessionalOpportunities,
      );
      expect(new Set(referenced.map((source) => source.id))).toEqual(
        includedSourceIds,
      );

      const tampered = structuredClone(parsed);
      tampered.opportunity.title = `${tampered.opportunity.title} changed`;
      expect(
        professionalOpportunityPacketSchema.safeParse(tampered).success,
      ).toBe(false);
    }
    expect(
      makeProfessionalOpportunityPacket(
        "not-a-reviewed-opportunity",
        ukProfessionalOpportunities,
      ),
    ).toBeNull();
  });

  it("keeps findings, limits, responses, review routes and money states distinct", () => {
    for (const scrutiny of ukProfessionalOpportunities.scrutiny) {
      expect(scrutiny.statement).not.toBe("");
      expect(scrutiny.doesNotProve).not.toBe("");
      expect(scrutiny.counterweightOrResponse).not.toBe("");
      expect(scrutiny.correctionOrReviewRoute).not.toBe("");
      expect([
        "court-finding",
        "oversight-finding",
        "official-statistic",
        "stakeholder-assessment",
        "taxsorted-fairness-question",
        "unknown",
      ]).toContain(scrutiny.evidenceState);
    }
    for (const opportunity of ukProfessionalOpportunities.opportunities) {
      expect(Object.keys(opportunity.moneyModel)).toEqual([
        "amountAffected",
        "qualifyingBase",
        "amountClaimed",
        "amountAccepted",
        "amountReceivedOrCredited",
        "amountPaidByClient",
        "redress",
        "costs",
        "interestReceived",
        "interestPaid",
        "professionalFees",
        "netClientPosition",
        "calculationMethod",
        "notMeaning",
        "zeroOrNegativeScenario",
      ]);
      expect(opportunity.moneyModel.zeroOrNegativeScenario).not.toBe("");
      expect(JSON.stringify(opportunity)).not.toMatch(
        /"probability"|"expectedValue"|"payout"|"professionalRevenue"/i,
      );
    }
  });

  it("publishes valid portable response and packet JSON Schemas", () => {
    const ajv = new Ajv2020({
      allErrors: true,
      strict: true,
      strictSchema: false,
    });
    const validatePacket = ajv.compile(
      professionalOpportunityPacketJsonSchema,
    );
    const packet = makeProfessionalOpportunityPacket(
      ukProfessionalOpportunities.opportunities[0].id,
      ukProfessionalOpportunities,
    );
    expect(validatePacket(packet), JSON.stringify(validatePacket.errors)).toBe(
      true,
    );

    const response = professionalOpportunityResponseSchema.parse({
      ...ukProfessionalOpportunities,
      availability: {
        status: "open",
        methods: ["GET", "HEAD"],
        writes: false,
        emergencyStop:
          "UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP",
        stoppedOpportunityCount: 0,
      },
      links: {
        self: basePath,
        opportunities: `${basePath}/opportunities`,
        opportunityTemplate: `${basePath}/opportunities/{id}`,
        scrutiny: `${basePath}/scrutiny`,
        sources: `${basePath}/sources`,
        assessmentTemplate: `${basePath}/assessment-template`,
        schema: `${basePath}/schema`,
        packetSchema: `${basePath}/packet-schema`,
        assessmentSchema: `${basePath}/assessment-schema`,
        rights: `${basePath}/rights`,
        humanGuide: "https://taxsorted.io/uk/opportunities/",
        corrections: ukProfessionalOpportunities.publication.corrections,
        openApi: "/openapi/professional-opportunities-uk.json",
      },
    });
    const validateResponse = ajv.compile(
      professionalOpportunityCorpusJsonSchema,
    );
    expect(
      validateResponse(response),
      JSON.stringify(validateResponse.errors),
    ).toBe(true);
  });
});

describe("read-only UK professional-opportunity routes", () => {
  it("seals an already-running route when its review expires", async () => {
    const pack = reviewPackFor(ukProfessionalOpportunities);
    let now = new Date(
      `${ukProfessionalOpportunities.meta.retrievedAt}T12:00:00.000Z`,
    );
    const { app } = mount({
      reviewPack: pack,
      now: () => now,
    });
    expect((await app.request(basePath)).status).toBe(200);
    expect(
      (
        await app.request(`${basePath}/method`)
      ).headers.get("cache-control"),
    ).toBe("public, max-age=0, must-revalidate");

    now = new Date(
      Date.parse(`${pack.declaration.reviewBy}T12:00:00.000Z`) +
        24 * 60 * 60 * 1_000,
    );
    const expired = await app.request(`${basePath}/method`);
    expect(expired.status).toBe(503);
    expect(expired.headers.get("cache-control")).toBe("no-store");
    expect(await expired.json()).toMatchObject({
      error: "publication_review_pending",
    });
  });

  it("serves the approved atlas without authentication, cookies or writes", async () => {
    const { app, sessionCalls } = mount();
    const response = await app.request(basePath, {
      headers: {
        Origin: "https://independent-research.example",
        Cookie: "private_cookie=must-not-be-read",
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("etag")).toMatch(/^"sha256-[a-f0-9]{64}"$/);
    expect(response.headers.get("x-checksum-sha256")).toMatch(/^[a-f0-9]{64}$/);
    expect(response.headers.get("x-corpus-retrieved-on")).toBe(
      ukProfessionalOpportunities.meta.retrievedAt,
    );
    expect(response.headers.get("x-corpus-reviewed-on")).toBeNull();
    expect(response.headers.get("access-control-expose-headers")).toContain(
      "X-Corpus-Retrieved-On",
    );
    expect(response.headers.get("link")).toContain(
      `</openapi/professional-opportunities-uk.json>; rel="service-desc"`,
    );
    expect(body.opportunities).toHaveLength(9);
    expect(body.scrutiny).toHaveLength(5);
    expect(body.sources).toHaveLength(67);
    expect(body.availability).toEqual({
      status: "open",
      methods: ["GET", "HEAD"],
      writes: false,
      emergencyStop:
        "UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP",
      stoppedOpportunityCount: 0,
    });
    expect(sessionCalls()).toBe(0);
  });

  it("supports HEAD, conditional GET, OPTIONS and rejects queries and writes", async () => {
    const { app } = mount();
    const get = await app.request(`${basePath}/opportunities`);
    const etag = get.headers.get("etag")!;
    const list = await get.json();
    const firstSummary = list.opportunities[0];
    const firstOpportunity = ukProfessionalOpportunities.opportunities[0];
    expect(firstSummary.sourceIds).toEqual(firstOpportunity.sourceIds);
    expect(
      firstSummary.lawfulValueMechanisms[0].sourceIds,
    ).toEqual(firstOpportunity.lawfulValueMechanisms[0].sourceIds);

    const head = await app.request(`${basePath}/opportunities`, {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(head.headers.get("etag")).toBe(etag);
    expect(await head.text()).toBe("");

    const unchanged = await app.request(`${basePath}/opportunities`, {
      headers: { "If-None-Match": `W/${etag}` },
    });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");

    const options = await app.request(`${basePath}/opportunities`, {
      method: "OPTIONS",
      headers: { Origin: "https://research.example" },
    });
    expect(options.status).toBe(204);
    expect(options.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(options.headers.get("access-control-allow-methods")).toBe(
      "GET, HEAD, OPTIONS",
    );

    const queried = await app.request(
      `${basePath}/opportunities?probability=high`,
    );
    expect(queried.status).toBe(400);
    expect(await queried.json()).toMatchObject({
      error: "unknown_query_parameter",
    });

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const write = await app.request(`${basePath}/opportunities`, {
        method,
      });
      expect(write.status, method).toBe(405);
      expect(write.headers.get("allow"), method).toBe(
        "GET, HEAD, OPTIONS",
      );
      expect(await write.json(), method).toMatchObject({
        error: "method_not_allowed",
        writes: false,
      });
    }
  });

  it("serves a complete packet and returns an ordinary miss without stops", async () => {
    const { app } = mount();
    const opportunity = ukProfessionalOpportunities.opportunities[0];
    const response = await app.request(
      `${basePath}/opportunities/${opportunity.slug}`,
    );
    const packet = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-location")).toBe(
      `${basePath}/opportunities/${opportunity.id}`,
    );
    expect(response.headers.get("link")).toContain(
      `<${basePath}/packet-schema>; rel="describedby"`,
    );
    expect(
      professionalOpportunityPacketSchema.safeParse(packet).success,
    ).toBe(true);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.uk.professional-opportunity-packet/1",
    );

    const missing = await app.request(
      `${basePath}/opportunities/not-reviewed`,
    );
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: "professional_opportunity_not_found",
    });
  });

  it("removes a stopped record together with its private scrutiny and sources", async () => {
    const stopped = stoppableOpportunity();
    const expected = visibleArtifactsWithout(stopped.id);
    const { app } = mount({ stoppedOpportunityIds: [stopped.id] });

    const root = await app.request(basePath);
    const body = await root.json();
    expect(root.status).toBe(200);
    expect(body.availability).toMatchObject({
      status: "record-level-stops-active",
      stoppedOpportunityCount: 1,
    });
    expect(body.meta.recordCounts).toEqual({
      opportunities: expected.opportunities.length,
      scrutiny: expected.scrutiny.length,
      sources: expected.sources.length,
    });
    expect(body.opportunities.map((record: any) => record.id)).not.toContain(
      stopped.id,
    );
    expect(body.scrutiny.map((record: any) => record.id)).toEqual(
      expected.scrutiny.map((record) => record.id),
    );
    expect(body.sources.map((record: any) => record.id)).toEqual(
      expected.sources.map((record) => record.id),
    );
    expect(JSON.stringify(body)).not.toContain(stopped.id);
    expect(JSON.stringify(body)).not.toContain(stopped.title);

    const method = await (
      await app.request(`${basePath}/method`)
    ).json();
    expect(method.meta).not.toHaveProperty("coverage");
    expect(method.meta).not.toHaveProperty("recordCounts");

    const hidden = await app.request(
      `${basePath}/opportunities/${stopped.id}`,
    );
    const unknown = await app.request(
      `${basePath}/opportunities/not-reviewed`,
    );
    for (const response of [hidden, unknown]) {
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({
        error: "opportunity_publication_stop",
      });
    }

    const sources = await (
      await app.request(`${basePath}/sources`)
    ).json();
    expect(sources.sources.map((source: any) => source.id)).toEqual(
      expected.sources.map((source) => source.id),
    );
  });

  it("fails closed on malformed or unknown record-stop configuration", async () => {
    for (const stoppedOpportunityIds of [
      ["NOT A SAFE ID"],
      ["uk-opportunity-that-does-not-exist"],
    ]) {
      const { app } = mount({ stoppedOpportunityIds });
      const root = await app.request(basePath);
      expect(root.status).toBe(503);
      expect(await root.json()).toMatchObject({
        error: "opportunity_publication_stop",
      });
      for (const path of ["/method", "/sources"]) {
        const response = await app.request(`${basePath}${path}`);
        expect(
          response.status,
          `${stoppedOpportunityIds.join(",")} ${path}`,
        ).toBe(503);
        expect(await response.json()).toMatchObject({
          error: "opportunity_publication_stop",
        });
      }
    }
  });

  it("closes method and sources globally while safe blank artifacts remain readable", async () => {
    for (const options of [
      {
        publicationApproval: pendingApprovalFor(
          ukProfessionalOpportunities,
        ),
      },
      { emergencyStop: true },
      {
        publicationApproval: {
          ...approvalFor(ukProfessionalOpportunities),
          corpusDigest: `sha256:${"0".repeat(64)}` as const,
        },
      },
    ]) {
      const { app } = mount(options);
      for (const path of [
        "",
        "/method",
        "/sources",
        "/opportunities",
        "/scrutiny",
      ]) {
        expect(
          (await app.request(`${basePath}${path}`)).status,
          `${JSON.stringify(options)} ${path}`,
        ).toBe(503);
      }

      for (const path of [
        "/assessment-template",
        "/rights",
        "/schema",
        "/packet-schema",
        "/assessment-schema",
      ]) {
        expect(
          (await app.request(`${basePath}${path}`)).status,
          `${JSON.stringify(options)} ${path}`,
        ).toBe(200);
      }
    }
  });

  it("serves all declared child resources and nothing else", async () => {
    const { app } = mount();
    const versions = [
      ["", "taxsorted.uk.professional-opportunities.v1"],
      ["/method", "taxsorted.uk.professional-opportunities.v1"],
      ["/opportunities", "taxsorted.uk.professional-opportunities.v1"],
      [
        `/opportunities/${ukProfessionalOpportunities.opportunities[0].id}`,
        "taxsorted.uk.professional-opportunity-packet/1",
      ],
      ["/scrutiny", "taxsorted.uk.professional-opportunities.v1"],
      ["/sources", "taxsorted.uk.professional-opportunities.v1"],
      [
        "/assessment-template",
        "taxsorted.uk.professional-opportunity-assessment/1",
      ],
      [
        "/rights",
        "taxsorted.uk.professional-opportunities-rights/1",
      ],
      ["/schema", "taxsorted.uk.professional-opportunities.v1"],
      [
        "/packet-schema",
        "taxsorted.uk.professional-opportunity-packet/1",
      ],
      [
        "/assessment-schema",
        "taxsorted.uk.professional-opportunity-assessment/1",
      ],
    ] as const;
    for (const [path, schemaVersion] of versions) {
      for (const method of ["GET", "HEAD"]) {
        const response = await app.request(`${basePath}${path}`, {
          method,
        });
        expect(response.status, `${method} ${path || "/"}`).toBe(200);
        expect(
          response.headers.get("x-schema-version"),
          `${method} ${path || "/"}`,
        ).toBe(schemaVersion);
      }
    }
    const missing = await app.request(`${basePath}/intake`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      error: "professional_opportunity_route_not_found",
    });
  });
});
