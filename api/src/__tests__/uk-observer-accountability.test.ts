import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { apiCors, isPublicCivicPath } from "../cors.js";
import {
  ukObserverAccountabilityCandidateSchema,
  ukObserverAccountabilityFramework,
  ukObserverAccountabilitySchemaDocument,
  type UkObserverAccountabilityCandidate,
} from "../uk-observer-accountability.js";
import { createUkObserverAccountabilityRoutes } from "../routes/uk-observer-accountability.js";

const privacyReview = {
  scope: "processed-record" as const,
  organisationLevelOnly: true as const,
  naturalPersonRecordsStored: false as const,
  personalContactDataStored: false as const,
  homeAddressDataStored: false as const,
  personalBeliefDataStored: false as const,
  personalityOrMotiveInferencePerformed: false as const,
  fuzzyOrProbabilisticJoinPerformed: false as const,
  freeTextReviewed: true as const,
  status: "human-approved-for-candidate" as const,
  reviewedOn: "2026-07-11",
  assessmentNature:
    "human-assertion-not-automated-semantic-or-legal-proof" as const,
};

const observer = {
  datasetId: "uk-charity-accountability",
  organisationId: "observer-alpha",
  referenceMethod: "exact-base-dataset-record-id" as const,
};
const subject = {
  datasetId: "uk-charity-accountability",
  organisationId: "subject-alpha",
  referenceMethod: "exact-base-dataset-record-id" as const,
};
const reviewer = {
  datasetId: "uk-charity-accountability",
  organisationId: "reviewer-alpha",
  referenceMethod: "exact-base-dataset-record-id" as const,
};
const sourceDocument = {
  datasetId: "uk-charity-accountability",
  documentId: "document-alpha",
  locator: "Published procedure",
  referenceMethod: "exact-base-dataset-record-id" as const,
  sourceBodyStored: false as const,
};

function emptyCandidate(): UkObserverAccountabilityCandidate {
  return {
    schema: "taxsorted.uk.observer-accountability-candidate/1" as const,
    meta: {
      title: "UK observer accountability candidate extension" as const,
      status: "candidate-not-admitted" as const,
      jurisdiction: "United Kingdom" as const,
      generatedOn: "2026-07-11",
      baseDatasets: [
        {
          datasetId: "uk-charity-accountability",
          schemaId: "taxsorted.uk.charity-accountability/1",
          releaseReference: "urn:taxsorted:release-checkpoint:uk-charity-accountability:test",
          datasetDigest: `sha256:${"0".repeat(64)}`,
          recordResolverTemplate: "/v1/charities/uk/records/{id}",
        },
      ],
      recordMeaning:
        "public-institutional-capacity-and-procedure-not-person-profile" as const,
    },
    institutionalRelations: [],
    investigationEngagements: [],
    investigationActions: [],
    institutionalResponses: [],
    coverageGaps: [],
  };
}

function engagement(): UkObserverAccountabilityCandidate["investigationEngagements"][number] {
  return {
    id: "engagement-alpha",
    investigatorOrganisations: [observer],
    subjectOrganisations: [subject],
    commissioningOrganisations: [],
    commissioningDocuments: [sourceDocument],
    commissioningDisclosureState: "not-applicable" as const,
    fundingOrganisations: [],
    fundingDocuments: [sourceDocument],
    fundingDisclosureState: "not-applicable" as const,
    jurisdiction: "United Kingdom",
    status: "open" as const,
    scope: "A bounded public institutional process.",
    period: {
      startDate: "2026-01-01",
      endDate: null,
      basis: "Opening date to current public status.",
    },
    mandateDocuments: [sourceDocument],
    methodDocuments: [sourceDocument],
    standardDocuments: [],
    outputDocuments: [],
    outputDisclosureDocuments: [sourceDocument],
    publishedMethods: ["Review public institutional records."],
    evidenceSelectionRules: ["Use exact organisation identifiers."],
    methodDisclosureState: "published" as const,
    outputDisclosureState: "not-yet-published" as const,
    limitations: ["Candidate fixture only."],
    independenceStatus: "statutory-independent" as const,
    independenceBasis: "statutory-structure" as const,
    independenceDocuments: [sourceDocument],
    publicProcedureUrl: "https://example.gov.uk/procedure",
    publicCorrectionUrl: "https://example.gov.uk/corrections",
    accountabilityRelationIds: [],
    observerEffectClaimed: false as const,
    observerEffectBoundary:
      "record-public-procedure-changes-only-never-infer-motive-or-causation" as const,
    privacyReview,
  };
}

describe("UK observer-accountability contract", () => {
  it("ships a frozen zero-row framework and strict candidate schema", () => {
    expect(ukObserverAccountabilityFramework.status).toBe(
      "schema-only-not-admitted",
    );
    expect(ukObserverAccountabilityFramework.candidateContract.counts).toEqual({
      institutionalRelations: 0,
      investigationEngagements: 0,
      investigationActions: 0,
      institutionalResponses: 0,
      coverageGaps: 0,
    });
    expect(Object.isFrozen(ukObserverAccountabilityFramework)).toBe(true);
    expect(Object.isFrozen(ukObserverAccountabilityFramework.inquiryLoop)).toBe(
      true,
    );
    expect(ukObserverAccountabilityFramework.officialDoors.length).toBeGreaterThan(
      10,
    );
    expect(
      ukObserverAccountabilityFramework.officialDoors.map((door) => door.id),
    ).toEqual(
      expect.arrayContaining([
        "adjudicator-service-structure",
        "nao-governance",
        "electoral-investigation-method",
        "sia-activity-based-licensing-guidance",
      ]),
    );
    expect(ukObserverAccountabilitySchemaDocument.$id).toBe(
      "https://api.taxsorted.io/v1/accountability/uk/schema",
    );
    expect(ukObserverAccountabilitySchemaDocument.additionalProperties).toBe(
      false,
    );
    expect(ukObserverAccountabilitySchemaDocument.properties).toHaveProperty(
      "investigationEngagements",
    );
    expect(ukObserverAccountabilitySchemaDocument).toHaveProperty(
      "properties.investigationEngagements.items.properties.outputDisclosureDocuments",
    );
    expect(ukObserverAccountabilitySchemaDocument).toHaveProperty(
      "properties.investigationActions.items.properties.targetOrganisations",
    );
    expect(ukObserverAccountabilitySchemaDocument).toHaveProperty(
      "properties.investigationActions.items.properties.actorCapacity",
    );
    expect(ukObserverAccountabilitySchemaDocument).toHaveProperty(
      "properties.investigationActions.items.properties.destinationOrganisations",
    );
    expect(
      ukObserverAccountabilitySchemaDocument["x-taxsorted-validation-scope"],
    ).toMatchObject({
      jsonSchema: "structural-shape-only",
      runtimeSemanticValidationRequired: true,
    });
    expect(
      ukObserverAccountabilitySchemaDocument[
        "x-taxsorted-runtime-invariants"
      ],
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/every observer/i),
        expect.stringMatching(/corrections.*append/i),
      ]),
    );
    expect(
      ukObserverAccountabilityFramework.officialDoors.every(
        (door) => door.humanApprovalStatus === "not-recorded",
      ),
    ).toBe(true);
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(emptyCandidate()),
    ).not.toThrow();
  });

  it("ships a copyable zero-row candidate that passes the runtime validator", async () => {
    const candidate = JSON.parse(
      await readFile(
        new URL(
          "../../../research/uk/observer-accountability/examples/zero-row-candidate.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(candidate),
    ).not.toThrow();
  });

  it("requires every observer to have a challenge route or explicit gap", () => {
    const withoutReciprocity = emptyCandidate();
    withoutReciprocity.investigationEngagements.push(engagement());
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(withoutReciprocity),
    ).toThrow(/every observer needs a sourced accountability route/i);

    const withGap = structuredClone(withoutReciprocity);
    withGap.coverageGaps.push({
      id: "gap-accountability-alpha",
      gapType: "observer-accountability-route-unmapped",
      affectedOrganisation: observer,
      affectedEngagementId: "engagement-alpha",
      description: "No official challenge route has yet been mapped.",
      consequence: "Do not treat this observer as unaccountable or final.",
      searchMethod: "Reviewed the declared official procedure source.",
      checkedDocuments: [sourceDocument],
      doesNotProveAbsence: true,
      status: "open",
      observedOn: "2026-07-11",
      reviewAfter: "2026-10-11",
      privacyReview,
    });
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(withGap),
    ).not.toThrow();

    const withRoute = emptyCandidate();
    withRoute.institutionalRelations.push({
      id: "relation-observer-review",
      fromOrganisation: observer,
      relationType: "reviewable-by",
      toOrganisation: reviewer,
      directionMeaning:
        "from-organisation-is-related-by-the-named-type-to-to-organisation",
      publicMeaning: "The observer's public decision can be reviewed here.",
      controlInferred: false,
      controlRelationsBelongInBaseDataset: true,
      validFrom: null,
      validTo: null,
      sourceDocuments: [sourceDocument],
      privacyReview,
    });
    const routedEngagement = engagement();
    routedEngagement.accountabilityRelationIds = [
      "relation-observer-review",
    ];
    withRoute.investigationEngagements.push(routedEngagement);
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(withRoute),
    ).not.toThrow();

    const expiredRoute = structuredClone(withRoute);
    expiredRoute.institutionalRelations[0].validTo = "2025-12-31";
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(expiredRoute),
    ).toThrow(/every observer needs a sourced accountability route/i);

    const overdueGap = structuredClone(withGap);
    overdueGap.coverageGaps[0].reviewAfter = "2026-07-10";
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(overdueGap),
    ).toThrow(/unresolved coverage gap cannot be overdue/i);
  });

  it("keeps gap, action and nested-reference invariants executable", () => {
    const wrongEngagementGap = emptyCandidate();
    wrongEngagementGap.investigationEngagements.push(engagement());
    wrongEngagementGap.coverageGaps.push({
      id: "gap-accountability-alpha",
      gapType: "observer-accountability-route-unmapped",
      affectedOrganisation: observer,
      affectedEngagementId: "engagement-missing",
      description: "A gap attached to the wrong engagement.",
      consequence: "It cannot satisfy reciprocity for another engagement.",
      searchMethod: "Reviewed the declared official procedure source.",
      checkedDocuments: [sourceDocument],
      doesNotProveAbsence: true,
      status: "open",
      observedOn: "2026-07-11",
      reviewAfter: "2026-10-11",
      privacyReview,
    });
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(wrongEngagementGap),
    ).toThrow(/unknown investigation engagement/i);

    const invalidAction = emptyCandidate();
    invalidAction.coverageGaps.push({
      id: "gap-accountability-alpha",
      gapType: "observer-accountability-route-unmapped",
      affectedOrganisation: observer,
      affectedEngagementId: "engagement-alpha",
      description: "No accountability route is mapped in this fixture.",
      consequence: "Do not treat the observer as final.",
      searchMethod: "Reviewed the declared official procedure source.",
      checkedDocuments: [sourceDocument],
      doesNotProveAbsence: true,
      status: "open",
      observedOn: "2026-07-11",
      reviewAfter: "2026-10-11",
      privacyReview,
    });
    invalidAction.investigationEngagements.push(engagement());
    invalidAction.investigationActions.push({
      id: "action-alpha",
      engagementId: "engagement-alpha",
      actorOrganisation: observer,
      actorCapacity: "investigator",
      targetOrganisations: [],
      destinationOrganisations: [],
      actionType: "opened",
      outcomeState: "breach-found",
      occurredOn: "2025-12-31",
      normalisedDescription: "The observer opened an engagement.",
      verbatimTextStored: false,
      normalisationMethod: "human-reviewed-faithful-paraphrase",
      correctsActionIds: [],
      sourceDocuments: [sourceDocument],
      privacyReview,
    });
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(invalidAction),
    ).toThrow(/opened cannot use outcome state breach-found/i);
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(invalidAction),
    ).toThrow(/cannot precede its engagement period/i);

    const duplicateObserver = emptyCandidate();
    const duplicateEngagement = engagement();
    duplicateEngagement.investigatorOrganisations.push(observer);
    duplicateObserver.investigationEngagements.push(duplicateEngagement);
    duplicateObserver.coverageGaps.push({
      id: "gap-accountability-alpha",
      gapType: "observer-accountability-route-unmapped",
      affectedOrganisation: observer,
      affectedEngagementId: "engagement-alpha",
      description: "A fixture gap.",
      consequence: "Do not infer a route.",
      searchMethod: "Reviewed the declared official procedure source.",
      checkedDocuments: [sourceDocument],
      doesNotProveAbsence: true,
      status: "open",
      observedOn: "2026-07-11",
      reviewAfter: "2026-10-11",
      privacyReview,
    });
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(duplicateObserver),
    ).toThrow(/duplicate organisation reference/i);

    const emptyPublishedDisclosure = structuredClone(invalidAction);
    emptyPublishedDisclosure.investigationActions = [];
    emptyPublishedDisclosure.investigationEngagements[0].commissioningDisclosureState =
      "published";
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(emptyPublishedDisclosure),
    ).toThrow(/commissioning disclosure state published needs published evidence/i);

    const missingDisclosureGap = structuredClone(invalidAction);
    missingDisclosureGap.investigationActions = [];
    missingDisclosureGap.investigationEngagements[0].fundingDisclosureState =
      "unknown";
    missingDisclosureGap.investigationEngagements[0].fundingDocuments = [];
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(missingDisclosureGap),
    ).toThrow(/unknown requires an active funding-not-published coverage gap/i);

    const missingOutputReceipt = structuredClone(invalidAction);
    missingOutputReceipt.investigationActions = [];
    missingOutputReceipt.investigationEngagements[0].outputDisclosureDocuments =
      [];
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(missingOutputReceipt),
    ).toThrow(/output-disclosure.*needs published evidence/i);

    const contradictoryFundingGap = structuredClone(invalidAction);
    contradictoryFundingGap.investigationActions = [];
    contradictoryFundingGap.investigationEngagements[0].fundingOrganisations = [
      reviewer,
    ];
    contradictoryFundingGap.investigationEngagements[0].fundingDocuments = [
      sourceDocument,
    ];
    contradictoryFundingGap.investigationEngagements[0].fundingDisclosureState =
      "published";
    contradictoryFundingGap.coverageGaps.push({
      id: "gap-funding-alpha",
      gapType: "funding-not-published",
      affectedOrganisation: observer,
      affectedEngagementId: "engagement-alpha",
      description: "A deliberately contradictory funding gap.",
      consequence: "The candidate must reject this contradiction.",
      searchMethod: "Reviewed the declared official procedure source.",
      checkedDocuments: [sourceDocument],
      doesNotProveAbsence: true,
      status: "open",
      observedOn: "2026-07-11",
      reviewAfter: "2026-10-11",
      privacyReview,
    });
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(contradictoryFundingGap),
    ).toThrow(/published contradicts an active funding-not-published coverage gap/i);

    const incompleteReferral = structuredClone(invalidAction);
    incompleteReferral.investigationActions = [
      {
        id: "action-referral",
        engagementId: "engagement-alpha",
        actorOrganisation: observer,
        actorCapacity: "investigator",
        targetOrganisations: [],
        destinationOrganisations: [],
        actionType: "referred",
        outcomeState: "procedural-only",
        occurredOn: "2026-02-01",
        normalisedDescription: "The observer referred the public matter.",
        verbatimTextStored: false,
        normalisationMethod: "human-reviewed-faithful-paraphrase",
        correctsActionIds: [],
        sourceDocuments: [sourceDocument],
        privacyReview,
      },
    ];
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(incompleteReferral),
    ).toThrow(/referred must name at least one exact institutional target/i);
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(incompleteReferral),
    ).toThrow(/referral must name at least one exact institutional destination/i);

    const completeReferral = structuredClone(incompleteReferral);
    completeReferral.investigationActions[0].targetOrganisations = [subject];
    completeReferral.investigationActions[0].destinationOrganisations = [reviewer];
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(completeReferral),
    ).not.toThrow();

    const collateralTarget = structuredClone(invalidAction);
    collateralTarget.investigationActions[0].outcomeState = "procedural-only";
    collateralTarget.investigationActions[0].occurredOn = "2026-02-01";
    collateralTarget.investigationActions[0].targetOrganisations = [reviewer];
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(collateralTarget),
    ).toThrow(/opened.*cannot carry separate targets/i);

    const falseActorCapacity = structuredClone(invalidAction);
    falseActorCapacity.investigationActions[0].actorCapacity = "commissioner";
    falseActorCapacity.investigationActions[0].outcomeState = "procedural-only";
    falseActorCapacity.investigationActions[0].occurredOn = "2026-02-01";
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(falseActorCapacity),
    ).toThrow(/must be a declared commissioner organisation/i);

    const ambiguousSubstantiveReport = structuredClone(invalidAction);
    ambiguousSubstantiveReport.investigationActions[0].actionType =
      "report-published";
    ambiguousSubstantiveReport.investigationActions[0].outcomeState =
      "no-breach-found";
    ambiguousSubstantiveReport.investigationActions[0].occurredOn =
      "2026-02-01";
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(ambiguousSubstantiveReport),
    ).toThrow(/report-published must name at least one exact institutional target/i);

    ambiguousSubstantiveReport.investigationActions[0].targetOrganisations = [
      subject,
    ];
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(ambiguousSubstantiveReport),
    ).not.toThrow();
  });

  it("keeps append-only correction and response chains actor-owned and acyclic", () => {
    const candidate = emptyCandidate();
    candidate.investigationEngagements.push(engagement());
    candidate.coverageGaps.push({
      id: "gap-accountability-alpha",
      gapType: "observer-accountability-route-unmapped",
      affectedOrganisation: observer,
      affectedEngagementId: "engagement-alpha",
      description: "No route is mapped in this correction fixture.",
      consequence: "Do not treat the observer as final.",
      searchMethod: "Reviewed the declared official procedure source.",
      checkedDocuments: [sourceDocument],
      doesNotProveAbsence: true,
      status: "open",
      observedOn: "2026-07-11",
      reviewAfter: "2026-10-11",
      privacyReview,
    });
    for (const [id, correctsActionIds] of [
      ["action-alpha", ["action-beta"]],
      ["action-beta", ["action-alpha"]],
    ] as const) {
      candidate.investigationActions.push({
        id,
        engagementId: "engagement-alpha",
        actorOrganisation: observer,
        actorCapacity: "investigator",
        targetOrganisations: [],
        destinationOrganisations: [],
        actionType: "corrected",
        outcomeState: "corrected",
        occurredOn: "2026-02-01",
        normalisedDescription: "A candidate correction.",
        verbatimTextStored: false,
        normalisationMethod: "human-reviewed-faithful-paraphrase",
        correctsActionIds: [...correctsActionIds],
        sourceDocuments: [sourceDocument],
        privacyReview,
      });
    }
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(candidate),
    ).toThrow(/must point backward by occurredOn then ASCII id/i);

    const crossCapacity = emptyCandidate();
    const crossCapacityEngagement = engagement();
    crossCapacityEngagement.commissioningOrganisations = [observer];
    crossCapacityEngagement.commissioningDisclosureState = "published";
    crossCapacity.investigationEngagements.push(crossCapacityEngagement);
    crossCapacity.coverageGaps.push(structuredClone(candidate.coverageGaps[0]));
    crossCapacity.investigationActions.push(
      {
        id: "action-alpha",
        engagementId: "engagement-alpha",
        actorOrganisation: observer,
        actorCapacity: "investigator",
        targetOrganisations: [],
        destinationOrganisations: [],
        actionType: "opened",
        outcomeState: "procedural-only",
        occurredOn: "2026-01-15",
        normalisedDescription: "The institution opened the engagement as investigator.",
        verbatimTextStored: false,
        normalisationMethod: "human-reviewed-faithful-paraphrase",
        correctsActionIds: [],
        sourceDocuments: [sourceDocument],
        privacyReview,
      },
      {
        id: "action-beta",
        engagementId: "engagement-alpha",
        actorOrganisation: observer,
        actorCapacity: "commissioner",
        targetOrganisations: [],
        destinationOrganisations: [],
        actionType: "corrected",
        outcomeState: "corrected",
        occurredOn: "2026-02-01",
        normalisedDescription: "The same institution tried to correct under another capacity.",
        verbatimTextStored: false,
        normalisationMethod: "human-reviewed-faithful-paraphrase",
        correctsActionIds: ["action-alpha"],
        sourceDocuments: [sourceDocument],
        privacyReview,
      },
    );
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(crossCapacity),
    ).toThrow(/must preserve the earlier action actor capacity/i);

    const otherSubject = {
      ...subject,
      organisationId: "subject-beta",
    };
    const responses = emptyCandidate();
    const responseEngagement = engagement();
    responseEngagement.subjectOrganisations.push(otherSubject);
    responses.investigationEngagements.push(responseEngagement);
    responses.coverageGaps.push(structuredClone(candidate.coverageGaps[0]));
    responses.investigationActions.push({
      id: "action-alpha",
      engagementId: "engagement-alpha",
      actorOrganisation: observer,
      actorCapacity: "investigator",
      targetOrganisations: [],
      destinationOrganisations: [],
      actionType: "report-published",
      outcomeState: "procedural-only",
      occurredOn: "2026-02-01",
      normalisedDescription: "A report was published.",
      verbatimTextStored: false,
      normalisationMethod: "human-reviewed-faithful-paraphrase",
      correctsActionIds: [],
      sourceDocuments: [sourceDocument],
      privacyReview,
    });
    responses.institutionalResponses.push(
      {
        id: "response-alpha",
        engagementId: "engagement-alpha",
        respondingOrganisation: subject,
        respondsToActionIds: ["action-alpha"],
        stance: "withdraws-earlier-response",
        publishedOn: "2026-02-02",
        normalisedStatement: "The first subject withdraws a response.",
        verbatimTextStored: false,
        normalisationMethod: "human-reviewed-faithful-paraphrase",
        supersedesResponseIds: ["response-beta"],
        sourceDocuments: [sourceDocument],
        privacyReview,
      },
      {
        id: "response-beta",
        engagementId: "engagement-alpha",
        respondingOrganisation: otherSubject,
        respondsToActionIds: ["action-alpha"],
        stance: "disputes",
        publishedOn: "2026-02-01",
        normalisedStatement: "The second subject disputes the report.",
        verbatimTextStored: false,
        normalisationMethod: "human-reviewed-faithful-paraphrase",
        supersedesResponseIds: [],
        sourceDocuments: [sourceDocument],
        privacyReview,
      },
    );
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(responses),
    ).toThrow(/only the same responding organisation may supersede/i);
  });

  it("rejects dossier-shaped keys, false privacy declarations and undeclared source datasets", () => {
    const personProfile = emptyCandidate() as Record<string, unknown>;
    personProfile.investigators = [];
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(personProfile),
    ).toThrow(/Unrecognized key/);

    const fuzzy = emptyCandidate();
    fuzzy.coverageGaps.push({
      id: "gap-accountability-alpha",
      gapType: "observer-accountability-route-unmapped",
      affectedOrganisation: {
        ...observer,
        datasetId: "not-declared",
      },
      affectedEngagementId: null,
      description: "A candidate gap.",
      consequence: "Do not infer a missing relation.",
      searchMethod: "Reviewed the declared official procedure source.",
      checkedDocuments: [sourceDocument],
      doesNotProveAbsence: true,
      status: "open",
      observedOn: "2026-07-11",
      reviewAfter: "2026-10-11",
      privacyReview,
    });
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(fuzzy),
    ).toThrow(/undeclared base dataset/);

    const unsafe = emptyCandidate() as Record<string, any>;
    unsafe.coverageGaps.push({
      id: "gap-accountability-alpha",
      gapType: "observer-accountability-route-unmapped",
      affectedOrganisation: observer,
      affectedEngagementId: null,
      description: "A candidate gap.",
      consequence: "Do not infer a missing relation.",
      searchMethod: "Reviewed the declared official procedure source.",
      checkedDocuments: [sourceDocument],
      doesNotProveAbsence: true,
      status: "open",
      observedOn: "2026-07-11",
      reviewAfter: "2026-10-11",
      privacyReview: {
        ...privacyReview,
        personalityOrMotiveInferencePerformed: true,
      },
    });
    expect(() =>
      ukObserverAccountabilityCandidateSchema.parse(unsafe),
    ).toThrow();
  });
});

function mount() {
  const app = new Hono();
  let sessionCalls = 0;
  app.use("*", apiCors);
  app.route(
    "/v1/accountability/uk",
    createUkObserverAccountabilityRoutes(),
  );
  app.use("/v1/*", async (c, next) => {
    sessionCalls += 1;
    c.header("Set-Cookie", "ts_session=must-not-exist; HttpOnly");
    await next();
  });
  return { app, sessionCalls: () => sessionCalls };
}

describe("UK observer-accountability routes", () => {
  it("serves framework and schema without a session, with CORS and validators", async () => {
    expect(isPublicCivicPath("/v1/accountability/uk")).toBe(true);
    expect(isPublicCivicPath("/v1/accountability/uk/schema")).toBe(true);
    expect(isPublicCivicPath("/v1/accountability/uk-evil")).toBe(false);

    const { app, sessionCalls } = mount();
    const response = await app.request("/v1/accountability/uk", {
      headers: { Origin: "https://builder.example" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("etag")).toMatch(/^"sha256-/);
    expect(response.headers.get("x-schema-version")).toBe(
      "taxsorted.uk.observer-accountability-framework/1",
    );
    expect(response.headers.get("link")).toContain(
      '</openapi/accountability-uk.json>; rel="service-desc"',
    );
    expect(await response.json()).toEqual(ukObserverAccountabilityFramework);
    expect(sessionCalls()).toBe(0);

    const schema = await app.request("/v1/accountability/uk/schema");
    expect(schema.status).toBe(200);
    expect(schema.headers.get("content-type")).toBe(
      "application/schema+json; charset=utf-8",
    );
    expect(await schema.json()).toEqual(ukObserverAccountabilitySchemaDocument);

    const head = await app.request("/v1/accountability/uk", {
      method: "HEAD",
    });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
    expect(head.headers.get("etag")).toBe(response.headers.get("etag"));

    const unchanged = await app.request("/v1/accountability/uk", {
      headers: { "If-None-Match": `W/${response.headers.get("etag")}` },
    });
    expect(unchanged.status).toBe(304);
  });

  it("fails closed on queries and writes without reflecting query values", async () => {
    const { app } = mount();
    const query = await app.request(
      "/v1/accountability/uk?secret=private-value",
    );
    const queryBody = await query.json();
    expect(query.status).toBe(400);
    expect(query.headers.get("cache-control")).toBe("no-store");
    expect(JSON.stringify(queryBody)).not.toContain("private-value");
    expect(queryBody).toMatchObject({
      error: "unknown_query_parameter",
      parameters: ["secret"],
      wallsIntact: true,
    });

    const write = await app.request("/v1/accountability/uk", {
      method: "POST",
    });
    expect(write.status).toBe(405);
    expect(write.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    expect(await write.json()).toMatchObject({
      error: "method_not_allowed",
      wallsIntact: true,
    });
  });
});
