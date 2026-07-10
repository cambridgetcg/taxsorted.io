import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  accountabilityDatasetDigestAlgorithm,
  accountabilityDatasetDigestPreimage,
  accountabilitySourceReviewDigestPreimage,
  computeUkCharityAccountabilityDatasetDigest,
  computeUkCharitySourceReviewDigest,
  ukCharityAccountabilityFramework,
  ukCharityAccountabilitySchema,
  ukCharityAccountabilitySchemaDocument,
  type UkCharityAccountabilityDataset,
} from "../uk-charity-accountability.js";

const ZERO_DIGEST = `sha256:${"0".repeat(64)}`;
const NOW = "2026-07-10T12:00:00.000Z";
const TODAY = "2026-07-10";

const privacyReview = {
  scope: "processed-record" as const,
  naturalPersonDataPresent: false as const,
  contactDataPresent: false as const,
  addressDataPresent: false as const,
  namedPayDataPresent: false as const,
  personalBeliefDataPresent: false as const,
  beliefInferencePerformed: false as const,
  joinMethod: "exact-published-identifier-only" as const,
  humanReviewStatus: "approved" as const,
  freeTextReviewed: true as const,
  assessmentNature: "human-assertion-not-automated-semantic-proof" as const,
  reviewedAt: NOW,
  reviewerRole: "TaxSorted accountability editor" as const,
};

const period = {
  kind: "financial-year" as const,
  label: "2025-26",
  startDate: "2025-04-01",
  endDate: "2026-03-31",
};

const moneyBasis = {
  currency: "GBP" as const,
  accountingBasis: "accrual" as const,
  grossOrNet: "gross" as const,
  vatBasis: "not-stated" as const,
  priceBasis: "nominal" as const,
  priceBaseDate: null,
  consolidationScope: "standalone" as const,
};

const normalisationReview = {
  status: "human-approved" as const,
  method: "faithful-paraphrase" as const,
  exactWordsStored: false as const,
  readerInstruction: "read-linked-source-for-exact-words" as const,
  assessmentNature:
    "human-editorial-judgement-not-verbatim-or-semantic-proof" as const,
  reviewedAt: NOW,
  reviewerRole: "TaxSorted accountability editor" as const,
};

const statisticalDisclosureReview = {
  status: "human-approved-for-candidate" as const,
  populationBasis: "people-derived-aggregate" as const,
  smallestReportedCell: 50,
  smallCellDecision: "reviewed-safe-in-context" as const,
  suppressionApplied: false as const,
  singlingOutRisk: "none-identified" as const,
  specialCategoryInferenceRisk: "none-identified" as const,
  freeTextAndContextReviewed: true as const,
  assessmentNature:
    "human-disclosure-risk-assessment-not-proof-of-anonymity" as const,
  reviewedAt: NOW,
  reviewerRole: "TaxSorted statistical disclosure editor" as const,
  limitations: ["This is a human disclosure-risk judgement, not proof of anonymity."],
};

const organisationOnlyDisclosureReview = {
  ...statisticalDisclosureReview,
  populationBasis: "organisation-only-not-person-derived" as const,
  smallestReportedCell: null,
  smallCellDecision: "not-applicable" as const,
};

const retainedIdentifiersReview = {
  status: "human-approved" as const,
  naturalPersonOrSensitiveDataPresent: false as const,
  identifierPolicy: "opaque-or-non-personal-public-record-id" as const,
  scope: "tombstone-id-target-id-replacement-id-and-release-id" as const,
  assessmentNature: "human-assertion-not-automated-semantic-proof" as const,
  reviewedAt: NOW,
  reviewerRole: "TaxSorted accountability editor" as const,
};

function zeroCounts() {
  return {
    organisations: 0,
    identifierMappings: 0,
    documents: 0,
    voices: 0,
    claims: 0,
    programmes: 0,
    fundingEvents: 0,
    financialFacts: 0,
    assetAggregates: 0,
    controlRelations: 0,
    observations: 0,
    outcomes: 0,
    evaluations: 0,
    comparisons: 0,
    coverageGaps: 0,
    tombstones: 0,
  };
}

function sealCurrentRelease<T extends {
  meta: { currentReleaseId: string };
  releases: Array<{ id: string; datasetDigest: string }>;
}>(dataset: T): T {
  const current = dataset.releases.find(
    (release) => release.id === dataset.meta.currentReleaseId
  );
  if (!current) throw new Error("test dataset has no current release");
  current.datasetDigest = computeUkCharityAccountabilityDatasetDigest(dataset);
  return dataset;
}

function sealCandidate(dataset: UkCharityAccountabilityDataset) {
  for (const document of dataset.documents) {
    document.sourceReview.reviewRecordDigest =
      computeUkCharitySourceReviewDigest(document);
  }
  return sealCurrentRelease(dataset);
}

function emptyDataset(): UkCharityAccountabilityDataset {
  const dataset = {
    meta: {
      datasetId: "uk-charity-accountability",
      title: "UK charity organisation accountability",
      schemaId: "taxsorted.uk.charity-accountability/1",
      currentReleaseId: "release-2026-07-10",
      jurisdiction: "United Kingdom",
      publicationStatus: "candidate-not-admitted",
      generatedAt: NOW,
      recordIdentifierPolicy:
        "opaque-or-non-personal-identifiers-human-reviewed-before-candidate",
      exclusions: [
        "no natural-person records",
        "no contact details",
        "no addresses",
        "no named pay",
        "no personal belief data or belief inference",
        "no fuzzy or probabilistic joins",
      ],
    },
    organisations: [],
    identifierMappings: [],
    documents: [],
    voices: [],
    claims: [],
    programmes: [],
    fundingEvents: [],
    financialFacts: [],
    assetAggregates: [],
    controlRelations: [],
    observations: [],
    outcomes: [],
    evaluations: [],
    comparisons: [],
    coverageGaps: [],
    tombstones: [],
    releases: [
      {
        id: "release-2026-07-10",
        version: "0.0.1",
        status: "candidate",
        candidateAssembledAt: NOW,
        previousReleaseId: null,
        schemaId: "taxsorted.uk.charity-accountability/1",
        datasetDigest: ZERO_DIGEST,
        digestAlgorithm: accountabilityDatasetDigestAlgorithm,
        digestPreimage: accountabilityDatasetDigestPreimage,
        recordCounts: zeroCounts(),
        changeSummary: ["Schema contract fixture; no organisation records."],
        changeSummaryPrivacyReview: privacyReview,
        removedOrSensitiveContentRepeated: false,
        stableSort: "collection-order-then-ascii-id-ascending",
        cursorVersion: "taxsorted.cursor/1",
      },
    ],
  };
  return ukCharityAccountabilitySchema.parse(sealCurrentRelease(dataset));
}

function organisationDataset(): UkCharityAccountabilityDataset {
  const dataset = structuredClone(emptyDataset());
  dataset.documents.push({
    id: "document-alpha",
    subjectOrganisationIds: ["organisation-alpha"],
    authorOrganisationIds: ["organisation-alpha"],
    publisherOrganisationId: "organisation-alpha",
    title: "Official register entry",
    documentType: "register-entry",
    publicUrl: "https://example.gov.uk/register/alpha",
    publishedAt: TODAY,
    retrievedAt: NOW,
    publicationMode: "link-only",
    sourcePermanence: {
      mode: "publisher-current-url-only",
      publisherVersionOrContentDigest: null,
      archiveUrl: null,
    },
    sourceMayContainNaturalPersonData: true,
    sourceReview: {
      reviewId: "source-review-alpha",
      reviewRecordDigest: ZERO_DIGEST,
      digestScope: accountabilitySourceReviewDigestPreimage,
      digestDoesNotProve: "legality-or-reviewer-identity",
      assessedAt: NOW,
      reviewExpiresAt: "2026-08-10",
      assessorRole: "TaxSorted source admission editor",
      humanDecisionStatus: "approved",
      assessmentNature: "human-review-record-not-legal-certification",
      linkDecision: "approved",
      copiedSourceBodyStored: false,
      publicDocumentAndReviewFieldsReview: {
        decision:
          "all-public-document-and-source-review-fields-approved-for-candidate",
        scope:
          "document-metadata-permanence-source-review-derived-use-locators-and-notes",
        naturalPersonDataPresent: false,
        contactDataPresent: false,
        addressDataPresent: false,
        namedPayDataPresent: false,
        personalBeliefDataPresent: false,
        beliefInferencePerformed: false,
        sourceBodyOrExcerptPresent: false,
        identifiersOpaqueOrNonPersonal: true,
        locatorsContainPointersOnly: true,
        allFreeTextAndUrlsReviewed: true,
        assessmentNature: "human-assertion-not-automated-semantic-proof",
      },
      derivedUse: {
        status: "approved",
        reviewedBasis: "open-licence",
        termsUrl: "https://example.gov.uk/terms",
        licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
        attribution: "Example public register",
        allowedUseTypes: [
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
        ],
        allowedLocators: [
          "Register header",
          "Organisation filing",
          "claim-alpha",
          "claim-beta",
          "fact-alpha",
          "fact-beta",
          "programme-alpha",
          "funding-alpha",
          "asset-alpha",
          "control-alpha",
          "cross-register-bridge",
          "fact-derived",
          "observation-alpha",
          "outcome-alpha",
          "evaluation-alpha",
        ],
        locatorAssessmentNature:
          "human-reviewed-source-pointers-not-mechanically-resolved",
        limitations: ["Candidate fixture only."],
      },
      notes: [
        "The digest protects this declared review record from unnoticed mutation; it is not legal certification.",
      ],
    },
  });
  dataset.identifierMappings.push({
    id: "identifier-alpha",
    organisationId: "organisation-alpha",
    namespace: "charity-commission-england-and-wales",
    identifierKind: "legal-or-institutional-organisation-id",
    registryName: "Charity Commission for England and Wales register",
    canonicalisationRule: "decimal-digits-preserve-leading-zeroes",
    value: "1234567",
    canonicalValue: "1234567",
    registerUrl: "https://example.gov.uk/register/alpha",
    mappingMethod: "exact-published-identifier",
    confidence: "exact",
    validFrom: null,
    validTo: null,
    sourceUses: [
      {
        documentId: "document-alpha",
        sourceLocator: "Register header",
        useType: "identifier-mapping",
      },
    ],
    observedAt: NOW,
    privacyReview,
  });
  dataset.organisations.push({
    id: "organisation-alpha",
    canonicalName: "Example Charity",
    role: "charitable-organisation",
    jurisdictions: ["England and Wales"],
    legalForm: "Charitable incorporated organisation",
    status: "active",
    statusAsOf: TODAY,
    exactIdentifierMappingIds: ["identifier-alpha"],
    identifierBridges: [],
    sourceUses: [
      {
        documentId: "document-alpha",
        sourceLocator: "Register header",
        useType: "organisation-identity",
      },
    ],
    observedAt: NOW,
    privacyReview,
  });
  Object.assign(dataset.releases[0].recordCounts, {
    organisations: 1,
    identifierMappings: 1,
    documents: 1,
  });
  return ukCharityAccountabilitySchema.parse(sealCandidate(dataset));
}

function ensureSubjectVoice(dataset: UkCharityAccountabilityDataset) {
  if (dataset.voices.some((voice) => voice.id === "voice-alpha")) return;
  dataset.voices.push({
    id: "voice-alpha",
    label: "Organisation filing",
    voiceType: "subject-organisation",
    speakingOrganisationId: "organisation-alpha",
    naturalPersonVoice: false,
    description: "Normalised organisation-level statements from the linked filing.",
    sourceUses: [
      {
        documentId: "document-alpha",
        sourceLocator: "Organisation filing",
        useType: "voice-attribution",
      },
    ],
    observedAt: NOW,
    privacyReview,
  });
  dataset.releases[0].recordCounts.voices = 1;
}

function ensureTaxSortedVoice(dataset: UkCharityAccountabilityDataset) {
  if (dataset.voices.some((voice) => voice.id === "voice-taxsorted")) return;
  dataset.voices.push({
    id: "voice-taxsorted",
    label: "TaxSorted editorial analysis",
    voiceType: "taxsorted-editorial",
    speakingOrganisationId: null,
    naturalPersonVoice: false,
    description:
      "TaxSorted-authored analysis of admitted source records, not an independent evaluator voice.",
    sourceUses: [
      {
        documentId: "document-alpha",
        sourceLocator: "Organisation filing",
        useType: "voice-attribution",
      },
    ],
    observedAt: NOW,
    privacyReview,
  });
  dataset.releases[0].recordCounts.voices = dataset.voices.length;
}

function addSecondOrganisation(dataset: UkCharityAccountabilityDataset) {
  if (dataset.organisations.some((record) => record.id === "organisation-beta")) return;
  dataset.documents[0].subjectOrganisationIds.push("organisation-beta");
  dataset.documents[0].authorOrganisationIds.push("organisation-beta");
  dataset.identifierMappings.push({
    ...structuredClone(dataset.identifierMappings[0]),
    id: "identifier-beta",
    organisationId: "organisation-beta",
    value: "7654321",
    canonicalValue: "7654321",
  });
  dataset.organisations.push({
    ...structuredClone(dataset.organisations[0]),
    id: "organisation-beta",
    canonicalName: "Second Example Charity",
    exactIdentifierMappingIds: ["identifier-beta"],
    identifierBridges: [],
  });
  Object.assign(dataset.releases[0].recordCounts, {
    organisations: 2,
    identifierMappings: 2,
  });
}

function ensureSecondSubjectVoice(dataset: UkCharityAccountabilityDataset) {
  ensureSubjectVoice(dataset);
  if (dataset.voices.some((voice) => voice.id === "voice-beta")) return;
  dataset.voices.push({
    id: "voice-beta",
    label: "Second organisation filing",
    voiceType: "subject-organisation",
    speakingOrganisationId: "organisation-beta",
    naturalPersonVoice: false,
    description:
      "Normalised organisation-level statements from the second linked filing.",
    sourceUses: [
      {
        documentId: "document-alpha",
        sourceLocator: "Organisation filing",
        useType: "voice-attribution",
      },
    ],
    observedAt: NOW,
    privacyReview,
  });
  dataset.releases[0].recordCounts.voices = dataset.voices.length;
}

function addProgrammeAlpha(dataset: UkCharityAccountabilityDataset) {
  ensureSubjectVoice(dataset);
  dataset.programmes.push({
    id: "programme-alpha",
    organisationId: "organisation-alpha",
    name: "Example programme",
    description: "A candidate programme used to test organisation ownership.",
    status: "active",
    period: structuredClone(period),
    purposeClaimIds: [],
    aggregatePopulationScope: "Programme-wide aggregate; no beneficiary rows.",
    individualRecipientDataStored: false,
    statisticalDisclosureReview: structuredClone(statisticalDisclosureReview),
    evidenceVoiceId: "voice-alpha",
    sourceAssertionKind: "subject-organisation-self-report",
    recordMeaning:
      "source-described-programme-not-independent-proof-of-delivery",
    sourceUses: [
      {
        documentId: "document-alpha",
        sourceLocator: "programme-alpha",
        useType: "programme-description",
      },
    ],
    observedAt: NOW,
    privacyReview,
  });
  dataset.releases[0].recordCounts.programmes = 1;
}

function addComparableClaims(dataset: UkCharityAccountabilityDataset) {
  ensureSubjectVoice(dataset);
  for (const [id, modality, statement] of [
    ["claim-alpha", "promises", "The organisation says it will deliver 100 sessions."],
    ["claim-beta", "reports", "The organisation reports that it delivered 80 sessions."],
  ] as const) {
    dataset.claims.push({
      id,
      subjectOrganisationId: "organisation-alpha",
      voiceId: "voice-alpha",
      modality,
      normalisedStatement: statement,
      verbatimTextStored: false,
      normalisationReview,
      comparisonContext: {
        organisationId: "organisation-alpha",
        period: structuredClone(period),
        scopeKey: "programme-whole",
        scopeDefinition: "The whole programme described in the filing.",
        metricKey: "sessions-delivered",
        metricDefinition: "Number of sessions the source says were delivered.",
      },
      validFrom: null,
      validTo: null,
      sourceUses: [
        {
          documentId: "document-alpha",
          sourceLocator: id,
          useType: "attributed-normalisation",
        },
      ],
      observedAt: NOW,
      privacyReview,
    });
  }
  dataset.releases[0].recordCounts.claims = 2;
}

function addMoneyFacts(dataset: UkCharityAccountabilityDataset) {
  ensureSubjectVoice(dataset);
  for (const [id, amountMinor] of [
    ["fact-alpha", 10_000],
    ["fact-beta", 13_000],
  ] as const) {
    dataset.financialFacts.push({
      id,
      organisationId: "organisation-alpha",
      metric: "income",
      money: {
        amountMinor,
        basis: { ...moneyBasis },
        measurementStage: "outturn",
        amountAsOf: TODAY,
      },
      comparisonContext: {
        organisationId: "organisation-alpha",
        period: structuredClone(period),
        scopeKey: "whole-organisation",
        scopeDefinition: "The standalone reporting organisation.",
        metricKey: "income",
        metricDefinition: "Total reported income for the stated period.",
      },
      statementStatus: "reported",
      derivation: null,
      namedPayDataStored: false,
      statisticalDisclosureReview: structuredClone(
        organisationOnlyDisclosureReview
      ),
      evidenceVoiceId: "voice-alpha",
      sourceAssertionKind: "subject-organisation-self-report",
      sourceUses: [
        {
          documentId: "document-alpha",
          sourceLocator: id,
          useType: "financial-fact",
        },
      ],
      observedAt: NOW,
      privacyReview,
    });
  }
  dataset.releases[0].recordCounts.financialFacts = 2;
}

describe("UK charity accountability contract", () => {
  it("exports a frozen schema-only framework and a generated strict JSON Schema", () => {
    expect(ukCharityAccountabilityFramework.status).toBe("schema-only-not-admitted");
    expect(ukCharityAccountabilityFramework.publicationBlockers.map((item) => item.id)).toEqual([
      "confidential-correction-safety-intake",
      "asset-level-rights-admission-digest",
    ]);
    expect(Object.isFrozen(ukCharityAccountabilityFramework)).toBe(true);
    expect(Object.isFrozen(ukCharityAccountabilityFramework.orientation)).toBe(true);
    expect(ukCharityAccountabilitySchemaDocument.$id).toBe(
      "https://api.taxsorted.io/v1/charities/uk/accountability/schema"
    );
    expect(ukCharityAccountabilitySchemaDocument.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema"
    );
    expect(ukCharityAccountabilitySchemaDocument.additionalProperties).toBe(false);
    expect(ukCharityAccountabilitySchemaDocument.properties).toHaveProperty("comparisons");
    expect(ukCharityAccountabilitySchemaDocument.properties).toHaveProperty("tombstones");
    expect(ukCharityAccountabilitySchemaDocument.properties).toHaveProperty("releases");
    expect(
      (ukCharityAccountabilitySchemaDocument as any).properties.financialFacts
        .items.required
    ).toContain("statisticalDisclosureReview");
    expect(
      (ukCharityAccountabilitySchemaDocument as any).properties.comparisons
        .items.required
    ).toContain("statisticalDisclosureReview");
    expect(ukCharityAccountabilityFramework.hardBoundaries).toContain(
      "every financial fact has a disclosure review and states whether it is genuinely organisation-only or people-derived; staff costs and remuneration are always people-derived"
    );
    expect(ukCharityAccountabilityFramework.hardBoundaries).toContain(
      "every identifier mapping is listed by its referenced organisation and every listed mapping points back; uppercase-alphanumeric canonicalisation accepts only ASCII letters, digits, spaces and hyphens"
    );
    expect(ukCharityAccountabilityFramework.hardBoundaries).toContain(
      "taxsorted-derived is reserved for structured exact-arithmetic financial facts and labelled TaxSorted source-comparison evaluations; other action and money records remain externally attributed"
    );
    expect(
      ukCharityAccountabilityFramework.inconsistencyRule.requirements
    ).toContain(
      "for two money records: same money basis, measurement stage and amount date"
    );
    expect(
      ukCharityAccountabilityFramework.releaseIntegrity.predecessorRule
    ).toMatch(/tombstone cannot take effect after the candidate/);
    expect(
      ukCharityAccountabilityFramework.releaseIntegrity.predecessorRule
    ).toMatch(/cumulative retained ledger/);
  });

  it("admits a release containing zero organisation records", () => {
    const dataset = emptyDataset();
    expect(dataset.organisations).toEqual([]);
    expect(dataset.releases[0].recordCounts.organisations).toBe(0);
  });

  it("ships a copyable zero-row candidate that passes the runtime validator", async () => {
    const candidate = JSON.parse(
      await readFile(
        new URL(
          "../../../research/uk/charity-accountability/examples/zero-row-candidate.json",
          import.meta.url
        ),
        "utf8"
      )
    );
    expect(() => ukCharityAccountabilitySchema.parse(candidate)).not.toThrow();
  });

  it("keeps version 1 candidate-only and leaves operational admission outside the schema", () => {
    const published = structuredClone(emptyDataset()) as unknown as Record<string, any>;
    published.meta.publicationStatus = "published";
    published.releases[0].status = "published";
    expect(() => ukCharityAccountabilitySchema.parse(published)).toThrow();

    expect(ukCharityAccountabilityFramework.publicationAdmission).toMatchObject({
      currentSchema: "candidate-shape-only",
      externalEnvelopeRequired: true,
    });
  });

  it("separates link permission from exact derived-use admission and verifies review integrity", () => {
    const linkOnly = structuredClone(organisationDataset());
    linkOnly.documents[0].sourceReview.derivedUse = {
      status: "not-approved",
      reason: "Only the source link may be distributed.",
    };
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCandidate(linkOnly))
    ).toThrow(/link-only and not approved for derived use/);

    const wrongLocator = structuredClone(organisationDataset());
    addComparableClaims(wrongLocator);
    wrongLocator.claims[0].sourceUses[0].sourceLocator = "not-admitted";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(wrongLocator))
    ).toThrow(/does not admit this reviewed source locator/);

    const tamperedReview = structuredClone(organisationDataset());
    tamperedReview.documents[0].sourceReview.notes.push("Changed after review.");
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(tamperedReview))
    ).toThrow(/source review digest does not match/);

    const guidance = structuredClone(organisationDataset());
    guidance.documents[0].documentType = "official-guidance";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCandidate(guidance))
    ).toThrow(/general official guidance cannot serve as the factual source/);

    const expired = structuredClone(organisationDataset());
    expired.documents[0].sourceReview.reviewExpiresAt = "2026-01-01";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCandidate(expired))
    ).toThrow(/source review expiry cannot precede its assessment date/);

    const staleAtGeneration = structuredClone(organisationDataset());
    staleAtGeneration.documents[0].retrievedAt = "2026-01-01T12:00:00.000Z";
    staleAtGeneration.documents[0].sourceReview.assessedAt =
      "2026-01-01T12:00:00.000Z";
    staleAtGeneration.documents[0].sourceReview.reviewExpiresAt = "2026-06-30";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCandidate(staleAtGeneration))
    ).toThrow(/source review is expired before the candidate generation date/);

    const futureRetrieval = structuredClone(organisationDataset());
    futureRetrieval.documents[0].retrievedAt = "2026-07-11T12:00:00.000Z";
    futureRetrieval.documents[0].sourceReview.assessedAt =
      "2026-07-11T12:00:00.000Z";
    futureRetrieval.documents[0].sourceReview.reviewExpiresAt = "2026-08-11";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCandidate(futureRetrieval))
    ).toThrow(/document retrieval cannot be after dataset meta.generatedAt/);

    const futureOrganisationStatus = structuredClone(organisationDataset());
    futureOrganisationStatus.organisations[0].statusAsOf = "2099-01-01";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(futureOrganisationStatus)
      )
    ).toThrow(/organisation status date cannot be after dataset meta.generatedAt/);

    const contradictoryPermanence = structuredClone(
      organisationDataset()
    ) as unknown as Record<string, any>;
    contradictoryPermanence.documents[0].sourcePermanence.archiveUrl =
      "https://archive.example.org/document-alpha";
    expect(() =>
      ukCharityAccountabilitySchema.parse(contradictoryPermanence)
    ).toThrow();
  });

  it("rejects people, contacts, addresses, named pay, belief inference and fuzzy joins", () => {
    const people = structuredClone(emptyDataset()) as unknown as Record<string, unknown>;
    people.people = [];
    expect(() => ukCharityAccountabilitySchema.parse(people)).toThrow(/Unrecognized key/);

    const contact = structuredClone(organisationDataset()) as unknown as Record<string, any>;
    contact.organisations[0].contactEmail = "not-allowed@example.org";
    expect(() => ukCharityAccountabilitySchema.parse(contact)).toThrow(/Unrecognized key/);

    const unsafeDocumentMetadata = structuredClone(
      organisationDataset()
    ) as unknown as Record<string, any>;
    unsafeDocumentMetadata.documents[0].sourceReview.publicDocumentAndReviewFieldsReview.naturalPersonDataPresent =
      true;
    expect(() =>
      ukCharityAccountabilitySchema.parse(unsafeDocumentMetadata)
    ).toThrow();

    const copiedSourceExcerpt = structuredClone(
      organisationDataset()
    ) as unknown as Record<string, any>;
    copiedSourceExcerpt.documents[0].sourceReview.publicDocumentAndReviewFieldsReview.sourceBodyOrExcerptPresent =
      true;
    copiedSourceExcerpt.documents[0].sourceReview.notes = [
      "A copied passage from the source would be forbidden here.",
    ];
    expect(() =>
      ukCharityAccountabilitySchema.parse(copiedSourceExcerpt)
    ).toThrow();

    const quotationLocator = structuredClone(
      organisationDataset()
    ) as unknown as Record<string, any>;
    quotationLocator.documents[0].sourceReview.publicDocumentAndReviewFieldsReview.locatorsContainPointersOnly =
      false;
    quotationLocator.documents[0].sourceReview.derivedUse.allowedLocators = [
      "A quotation presented as a locator.",
    ];
    expect(() =>
      ukCharityAccountabilitySchema.parse(quotationLocator)
    ).toThrow();

    const unboundedReviewNotes = structuredClone(
      organisationDataset()
    ) as unknown as Record<string, any>;
    unboundedReviewNotes.documents[0].sourceReview.notes = Array.from(
      { length: 6 },
      (_, index) => `Review note ${index + 1}.`
    );
    expect(() =>
      ukCharityAccountabilitySchema.parse(unboundedReviewNotes)
    ).toThrow();

    const address = structuredClone(organisationDataset()) as unknown as Record<string, any>;
    address.organisations[0].address = "Not admitted";
    expect(() => ukCharityAccountabilitySchema.parse(address)).toThrow(/Unrecognized key/);

    const namedPay = structuredClone(organisationDataset()) as unknown as Record<string, any>;
    namedPay.organisations[0].privacyReview.namedPayDataPresent = true;
    expect(() => ukCharityAccountabilitySchema.parse(namedPay)).toThrow();

    const beliefInference = structuredClone(organisationDataset()) as unknown as Record<string, any>;
    beliefInference.organisations[0].privacyReview.beliefInferencePerformed = true;
    expect(() => ukCharityAccountabilitySchema.parse(beliefInference)).toThrow();

    const fuzzy = structuredClone(organisationDataset()) as unknown as Record<string, any>;
    fuzzy.identifierMappings[0].mappingMethod = "fuzzy-name-match";
    expect(() => ukCharityAccountabilitySchema.parse(fuzzy)).toThrow();

    const awardAsOrganisation = structuredClone(
      organisationDataset()
    ) as unknown as Record<string, any>;
    awardAsOrganisation.identifierMappings[0].namespace = "government-grant-award";
    expect(() => ukCharityAccountabilitySchema.parse(awardAsOrganisation)).toThrow();
  });

  it("binds attributed paraphrases to the exact voice, role, source and subject", () => {
    const wrongRole = structuredClone(organisationDataset());
    addComparableClaims(wrongRole);
    (wrongRole.voices[0] as unknown as Record<string, unknown>).voiceType =
      "regulator";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(wrongRole))
    ).toThrow(/regulator voice needs an organisation with the matching role/);

    const wrongModality = structuredClone(organisationDataset());
    addComparableClaims(wrongModality);
    wrongModality.claims[0].modality = "regulator-finds";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(wrongModality))
    ).toThrow(/regulator-finds requires a regulator voice/);

    const wrongSubject = structuredClone(organisationDataset());
    addComparableClaims(wrongSubject);
    wrongSubject.claims[0].subjectOrganisationId = "organisation-missing";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(wrongSubject))
    ).toThrow(/does not name subject organisation organisation-missing/);
  });

  it("keeps exact identifiers unique to one organisation", () => {
    const dataset = structuredClone(organisationDataset());
    dataset.documents[0].subjectOrganisationIds.push("organisation-beta");
    dataset.identifierMappings.push({
      ...dataset.identifierMappings[0],
      id: "identifier-beta",
      organisationId: "organisation-beta",
    });
    dataset.organisations.push({
      ...dataset.organisations[0],
      id: "organisation-beta",
      canonicalName: "Another Charity",
      exactIdentifierMappingIds: ["identifier-beta"],
    });
    Object.assign(dataset.releases[0].recordCounts, {
      organisations: 2,
      identifierMappings: 2,
    });
    expect(() => ukCharityAccountabilitySchema.parse(dataset)).toThrow(
      /exact identifier maps to more than one organisation/
    );

    const orphanedMapping = structuredClone(organisationDataset());
    orphanedMapping.identifierMappings.push({
      ...structuredClone(orphanedMapping.identifierMappings[0]),
      id: "identifier-orphaned",
      namespace: "companies-house",
      registryName: "Companies House register",
      canonicalisationRule:
        "uppercase-alphanumeric-remove-spaces-and-hyphens",
      value: "01234567",
      canonicalValue: "01234567",
    });
    orphanedMapping.releases[0].recordCounts.identifierMappings = 2;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(orphanedMapping)
      )
    ).toThrow(/every identifier mapping must be listed by its referenced organisation/);

    for (const invalidValue of ["SC/012345", "ＳＣ012345"]) {
      const invalidAlphabet = structuredClone(organisationDataset());
      Object.assign(invalidAlphabet.identifierMappings[0], {
        namespace: "oscr",
        registryName: "Scottish Charity Register",
        canonicalisationRule:
          "uppercase-alphanumeric-remove-spaces-and-hyphens",
        value: invalidValue,
        canonicalValue: invalidValue,
      });
      expect(() =>
        ukCharityAccountabilitySchema.parse(
          sealCurrentRelease(invalidAlphabet)
        )
      ).toThrow(/canonicalValue does not match the declared namespace normalisation/);
    }

    const reversedIdentifierDates = structuredClone(organisationDataset());
    reversedIdentifierDates.identifierMappings[0].validFrom = "2026-07-10";
    reversedIdentifierDates.identifierMappings[0].validTo = "2026-07-09";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(reversedIdentifierDates)
      )
    ).toThrow(/validTo must not precede validFrom/);

    const reversedClaimDates = structuredClone(organisationDataset());
    addComparableClaims(reversedClaimDates);
    reversedClaimDates.claims[0].validFrom = "2026-07-10";
    reversedClaimDates.claims[0].validTo = "2026-07-09";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(reversedClaimDates)
      )
    ).toThrow(/validTo must not precede validFrom/);
  });

  it("represents an exact official institution without pretending it has a legal register ID", () => {
    const institution = structuredClone(organisationDataset());
    institution.organisations[0].role = "regulator";
    Object.assign(institution.identifierMappings[0], {
      namespace: "official-institution-uri",
      identifierKind: "official-institution-uri-not-legal-entity-id",
      registryName: "Official institution canonical page",
      canonicalisationRule: "exact-canonical-https-uri",
      value: "https://example.gov.uk/regulator",
      canonicalValue: "https://example.gov.uk/regulator",
      registerUrl: "https://example.gov.uk/regulator",
    });
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(institution))
    ).not.toThrow();

    institution.organisations[0].role = "charitable-organisation";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(institution))
    ).toThrow(/restricted to regulator and public-funder organisations/);
  });

  it("requires an explicit human-reviewed source bridge for multiple official identifiers", () => {
    const unbridged = structuredClone(organisationDataset());
    unbridged.identifierMappings.push({
      ...unbridged.identifierMappings[0],
      id: "identifier-company",
      namespace: "companies-house",
      registryName: "Companies House register",
      canonicalisationRule: "uppercase-alphanumeric-remove-spaces-and-hyphens",
      value: "01234567",
      canonicalValue: "01234567",
      registerUrl: "https://example.gov.uk/company/01234567",
    });
    unbridged.organisations[0].exactIdentifierMappingIds.push(
      "identifier-company"
    );
    unbridged.releases[0].recordCounts.identifierMappings = 2;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCandidate(unbridged))
    ).toThrow(/must be connected by a human-reviewed source/);

    const bridged = structuredClone(unbridged);
    bridged.organisations[0].identifierBridges.push({
      leftMappingId: "identifier-alpha",
      rightMappingId: "identifier-company",
      sourceUse: {
        documentId: "document-alpha",
        sourceLocator: "cross-register-bridge",
        useType: "identifier-mapping",
      },
      sourcePublishesBothIdentifiers: true,
      review: {
        status: "human-approved",
        assertionNature:
          "human-assertion-from-reviewed-source-locator-not-automated-semantic-proof",
        reviewedAt: NOW,
        reviewerRole: "TaxSorted accountability editor",
      },
    });
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCandidate(bridged))
    ).not.toThrow();
  });

  it("keeps programmes attached to their exact organisation across funding and observations", () => {
    const base = structuredClone(organisationDataset());
    addSecondOrganisation(base);
    ensureSecondSubjectVoice(base);
    addProgrammeAlpha(base);
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCandidate(base))
    ).not.toThrow();

    const wrongFundingRecipient = structuredClone(base);
    wrongFundingRecipient.fundingEvents.push({
      id: "funding-alpha",
      recipientOrganisationId: "organisation-beta",
      funderOrganisationId: null,
      anonymousOrAggregateFunderClass: "aggregate-public-donations",
      programmeId: "programme-alpha",
      eventType: "aggregate-donations-reported",
      exactAwardOrTransactionIdentifier: null,
      money: {
        amountMinor: 10_000,
        basis: structuredClone(moneyBasis),
        measurementStage: "outturn",
        amountAsOf: TODAY,
      },
      comparisonContext: {
        organisationId: "organisation-beta",
        period: structuredClone(period),
        scopeKey: "programme-whole",
        scopeDefinition: "The whole programme.",
        metricKey: "donations-reported",
        metricDefinition: "Aggregate donations reported for the period.",
      },
      statisticalDisclosureReview: structuredClone(
        statisticalDisclosureReview
      ),
      evidenceVoiceId: "voice-beta",
      sourceAssertionKind: "subject-organisation-self-report",
      recordMeaning:
        "source-reported-funding-stage-not-proof-of-delivery-or-impact",
      sourceUses: [
        {
          documentId: "document-alpha",
          sourceLocator: "funding-alpha",
          useType: "funding-event",
        },
      ],
      observedAt: NOW,
      privacyReview,
    });
    wrongFundingRecipient.releases[0].recordCounts.fundingEvents = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCandidate(wrongFundingRecipient)
      )
    ).toThrow(/programme must belong to the recipient organisation/);

    const missingDonationReview = structuredClone(
      wrongFundingRecipient
    ) as any;
    missingDonationReview.fundingEvents[0].programmeId = null;
    missingDonationReview.fundingEvents[0].statisticalDisclosureReview = null;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCandidate(missingDonationReview)
      )
    ).toThrow(/anonymous or aggregate funding needs a publishable statistical disclosure review/);

    const wrongObservationOrganisation = structuredClone(base);
    wrongObservationOrganisation.observations.push({
      id: "observation-alpha",
      organisationId: "organisation-beta",
      programmeId: "programme-alpha",
      observationType: "output-recorded",
      value: { kind: "number", value: 50, unit: "sessions" },
      comparisonContext: {
        organisationId: "organisation-beta",
        period: structuredClone(period),
        scopeKey: "programme-whole",
        scopeDefinition: "The whole programme.",
        metricKey: "sessions-recorded",
        metricDefinition: "Sessions recorded in the admitted source.",
      },
      interpretation: "The source reports an aggregate output.",
      statisticalDisclosureReview: structuredClone(
        statisticalDisclosureReview
      ),
      evidenceVoiceId: "voice-beta",
      sourceAssertionKind: "subject-organisation-self-report",
      recordMeaning:
        "source-reported-or-recorded-activity-not-independent-proof",
      sourceUses: [
        {
          documentId: "document-alpha",
          sourceLocator: "observation-alpha",
          useType: "reported-observation",
        },
      ],
      observedAt: NOW,
      privacyReview,
    });
    wrongObservationOrganisation.releases[0].recordCounts.observations = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCandidate(wrongObservationOrganisation)
      )
    ).toThrow(/observations programme must belong to the record organisation/);

    const missingObservationReview = structuredClone(
      wrongObservationOrganisation
    ) as any;
    delete missingObservationReview.observations[0].statisticalDisclosureReview;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCandidate(missingObservationReview)
      )
    ).toThrow();
  });

  it("requires human approval and exact entity, period, scope and metric for inconsistent-with", () => {
    const unapproved = structuredClone(organisationDataset());
    addComparableClaims(unapproved);
    unapproved.comparisons.push({
      id: "comparison-alpha",
      left: { collection: "claims", id: "claim-alpha" },
      right: { collection: "claims", id: "claim-beta" },
      relation: "inconsistent-with",
      comparisonContext: unapproved.claims[0].comparisonContext!,
      entityMatchMethod: "exact-published-identifier",
      dimensionDecision: {
        sameOrganisation: true,
        samePeriod: true,
        sameScope: true,
        sameMetric: true,
      },
      review: {
        status: "human-approved",
        reviewerRole: "TaxSorted accountability editor",
        reviewedAt: NOW,
        rationale: "A human reviewed the exact source pair.",
      },
      numericComparison: null,
      statisticalDisclosureReview: null,
      explanation: "The two normalised statements differ.",
      limitations: ["A difference is not automatically an inconsistency."],
      privacyReview,
    });
    unapproved.releases[0].recordCounts.comparisons = 1;
    (unapproved.comparisons[0].review as { status: string }).status =
      "machine-proposed";
    expect(() => ukCharityAccountabilitySchema.parse(unapproved)).toThrow();

    const wrongPeriod = structuredClone(unapproved) as unknown as Record<string, any>;
    wrongPeriod.comparisons[0].review.status = "human-approved";
    wrongPeriod.claims[1].comparisonContext.period = {
      kind: "financial-year",
      label: "2026-27",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
    };
    expect(() => ukCharityAccountabilitySchema.parse(wrongPeriod)).toThrow(
      /inconsistent-with requires the same organisation, period, scope and metric/
    );

    const approved = structuredClone(unapproved);
    (approved.comparisons[0].review as { status: string }).status =
      "human-approved";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(approved))
    ).not.toThrow();
  });

  it("represents honest non-comparability and change over time from actual dimensions", () => {
    const notComparable = structuredClone(organisationDataset());
    addComparableClaims(notComparable);
    notComparable.claims[1].comparisonContext!.metricKey = "sessions-reported";
    notComparable.comparisons.push({
      id: "comparison-not-comparable",
      left: { collection: "claims", id: "claim-alpha" },
      right: { collection: "claims", id: "claim-beta" },
      relation: "not-comparable",
      comparisonContext: notComparable.claims[0].comparisonContext!,
      entityMatchMethod: "exact-published-identifier",
      dimensionDecision: {
        sameOrganisation: true,
        samePeriod: true,
        sameScope: true,
        sameMetric: false,
      },
      review: {
        status: "human-approved",
        reviewerRole: "TaxSorted accountability editor",
        reviewedAt: NOW,
        rationale: "The source records use different metrics.",
      },
      numericComparison: null,
      statisticalDisclosureReview: null,
      explanation: "The two records are not directly comparable.",
      limitations: ["Different metrics remain visible rather than being coerced."],
      privacyReview,
    });
    notComparable.releases[0].recordCounts.comparisons = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(notComparable))
    ).not.toThrow();

    const falseDimension = structuredClone(notComparable);
    falseDimension.comparisons[0].dimensionDecision.sameMetric = true;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(falseDimension))
    ).toThrow(/sameMetric must match the two referenced record contexts/);

    const definitionMismatch = structuredClone(organisationDataset());
    addComparableClaims(definitionMismatch);
    definitionMismatch.claims[1].comparisonContext!.metricDefinition =
      "A different definition hidden behind the same key.";
    definitionMismatch.comparisons.push({
      ...notComparable.comparisons[0],
      id: "comparison-definition-mismatch",
      relation: "consistent-with",
      comparisonContext: definitionMismatch.claims[0].comparisonContext!,
      dimensionDecision: {
        sameOrganisation: true,
        samePeriod: true,
        sameScope: true,
        sameMetric: true,
      },
    });
    definitionMismatch.releases[0].recordCounts.comparisons = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(definitionMismatch)
      )
    ).toThrow(/sameMetric must match the two referenced record contexts/);

    const overTime = structuredClone(organisationDataset());
    addComparableClaims(overTime);
    overTime.claims[1].comparisonContext!.period = {
      kind: "financial-year",
      label: "2026-27",
      startDate: "2026-04-01",
      endDate: "2027-03-31",
    };
    overTime.comparisons.push({
      ...notComparable.comparisons[0],
      id: "comparison-over-time",
      relation: "change-over-time",
      comparisonContext: overTime.claims[0].comparisonContext!,
      dimensionDecision: {
        sameOrganisation: true,
        samePeriod: false,
        sameScope: true,
        sameMetric: true,
      },
      explanation: "The same metric is reported for two different periods.",
      limitations: ["A time difference is not evidence of inconsistency."],
    });
    overTime.releases[0].recordCounts.comparisons = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(overTime))
    ).not.toThrow();
  });

  it("calculates money only when comparison contexts and bases match exactly", () => {
    const dataset = structuredClone(organisationDataset());
    addMoneyFacts(dataset);
    dataset.comparisons.push({
      id: "comparison-money",
      left: { collection: "financialFacts", id: "fact-alpha" },
      right: { collection: "financialFacts", id: "fact-beta" },
      relation: "consistent-with",
      comparisonContext: dataset.financialFacts[0].comparisonContext,
      entityMatchMethod: "exact-published-identifier",
      dimensionDecision: {
        sameOrganisation: true,
        samePeriod: true,
        sameScope: true,
        sameMetric: true,
      },
      review: {
        status: "human-approved",
        reviewerRole: "TaxSorted accountability editor",
        reviewedAt: NOW,
        rationale: "The official records use the same money dimensions.",
      },
      numericComparison: {
        operation: "difference-right-minus-left",
        resultMinor: 3_000,
        moneyDimensionsMatched: true,
      },
      statisticalDisclosureReview: structuredClone(
        organisationOnlyDisclosureReview
      ),
      explanation: "The later stated amount is GBP 30.00 higher.",
      limitations: ["Measurement stage remains visible."],
      privacyReview,
    });
    dataset.releases[0].recordCounts.comparisons = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(dataset))
    ).not.toThrow();

    const missingNumericDisclosureReview = structuredClone(dataset);
    missingNumericDisclosureReview.comparisons[0].statisticalDisclosureReview =
      null;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(missingNumericDisclosureReview)
      )
    ).toThrow(/every numeric comparison needs a fresh statistical disclosure review/);

    const earlyNumericDisclosureReview = structuredClone(dataset);
    earlyNumericDisclosureReview.comparisons[0].statisticalDisclosureReview!.reviewedAt =
      "2026-07-10T11:00:00.000Z";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(earlyNumericDisclosureReview)
      )
    ).toThrow(/comparison statistical disclosure review cannot precede/);

    const peopleDerivedComparison = structuredClone(dataset);
    for (const input of peopleDerivedComparison.financialFacts) {
      input.metric = "staff-costs-aggregate";
      input.statisticalDisclosureReview = structuredClone(
        statisticalDisclosureReview
      );
    }
    peopleDerivedComparison.comparisons[0].statisticalDisclosureReview = null;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(peopleDerivedComparison)
      )
    ).toThrow(/every numeric comparison needs a fresh statistical disclosure review/);

    peopleDerivedComparison.comparisons[0].statisticalDisclosureReview =
      structuredClone(organisationOnlyDisclosureReview);
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(peopleDerivedComparison)
      )
    ).toThrow(/numeric comparison with a people-derived input/);

    peopleDerivedComparison.comparisons[0].statisticalDisclosureReview =
      structuredClone(statisticalDisclosureReview);
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(peopleDerivedComparison)
      )
    ).not.toThrow();

    const mismatchedBasisInconsistency = structuredClone(dataset);
    mismatchedBasisInconsistency.comparisons[0].relation =
      "inconsistent-with";
    mismatchedBasisInconsistency.comparisons[0].numericComparison = null;
    mismatchedBasisInconsistency.comparisons[0].statisticalDisclosureReview =
      null;
    mismatchedBasisInconsistency.financialFacts[1].money.basis.grossOrNet =
      "net";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(mismatchedBasisInconsistency)
      )
    ).toThrow(/inconsistent money records require the same money basis/);

    const comparisonBeforeEvidenceReady = structuredClone(dataset);
    comparisonBeforeEvidenceReady.comparisons[0].review.reviewedAt =
      "2026-07-10T11:00:00.000Z";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(comparisonBeforeEvidenceReady)
      )
    ).toThrow(/comparison review cannot precede either referenced record/);

    const wrongArithmetic = structuredClone(dataset);
    if (
      wrongArithmetic.comparisons[0].numericComparison?.operation ===
      "difference-right-minus-left"
    ) {
      wrongArithmetic.comparisons[0].numericComparison.resultMinor = 2_999;
    }
    expect(() => ukCharityAccountabilitySchema.parse(wrongArithmetic)).toThrow(
      /does not exactly match the source minor-unit amounts/
    );

    const mismatchedBasis = structuredClone(dataset);
    mismatchedBasis.financialFacts[1].money.basis.grossOrNet = "net";
    expect(() => ukCharityAccountabilitySchema.parse(mismatchedBasis)).toThrow(
      /money is not comparable: grossOrNet differs/
    );

    const exactRatio = structuredClone(dataset);
    exactRatio.comparisons[0].numericComparison = {
      operation: "ratio-right-to-left",
      numeratorMinor: 13_000,
      denominatorMinor: 10_000,
      representation: "exact-rational-source-minor-units",
      moneyDimensionsMatched: true,
    };
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(exactRatio))
    ).not.toThrow();

    exactRatio.comparisons[0].numericComparison.numeratorMinor = 12_999;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(exactRatio))
    ).toThrow(/must preserve the exact source minor-unit numerator and denominator/);

    const zeroDenominator = structuredClone(dataset);
    zeroDenominator.financialFacts[0].money.amountMinor = 0;
    zeroDenominator.comparisons[0].numericComparison = {
      operation: "ratio-right-to-left",
      numeratorMinor: 13_000,
      denominatorMinor: 0,
      representation: "exact-rational-source-minor-units",
      moneyDimensionsMatched: true,
    };
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(zeroDenominator)
      )
    ).toThrow(/ratio denominator cannot be zero/);

    const unsafeDifference = structuredClone(dataset);
    unsafeDifference.financialFacts[0].money.amountMinor =
      Number.MIN_SAFE_INTEGER;
    unsafeDifference.financialFacts[1].money.amountMinor =
      Number.MAX_SAFE_INTEGER;
    if (
      unsafeDifference.comparisons[0].numericComparison?.operation ===
      "difference-right-minus-left"
    ) {
      unsafeDifference.comparisons[0].numericComparison.resultMinor = 0;
    }
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(unsafeDifference)
      )
    ).toThrow(/money difference exceeds the safe integer range/);
  });

  it("recomputes structured minor-unit derivations and rejects cycles or mismatched scope", () => {
    const derived = structuredClone(organisationDataset());
    addMoneyFacts(derived);
    ensureTaxSortedVoice(derived);
    derived.financialFacts.push({
      ...structuredClone(derived.financialFacts[0]),
      id: "fact-derived",
      metric: "other-aggregate",
      money: {
        ...structuredClone(derived.financialFacts[0].money),
        amountMinor: 3_000,
      },
      comparisonContext: {
        ...structuredClone(derived.financialFacts[0].comparisonContext),
        metricKey: "income-difference",
        metricDefinition:
          "Signed difference between the two admitted income facts.",
      },
      statementStatus: "derived-exact-arithmetic",
      derivation: {
        method: "exact-arithmetic",
        operation: "signed-sum-of-minor-unit-inputs",
        terms: [
          { inputFinancialFactId: "fact-beta", coefficient: 1 },
          { inputFinancialFactId: "fact-alpha", coefficient: -1 },
        ],
      },
      evidenceVoiceId: "voice-taxsorted",
      sourceAssertionKind: "taxsorted-derived",
      statisticalDisclosureReview: structuredClone(
        organisationOnlyDisclosureReview
      ),
      sourceUses: [
        {
          documentId: "document-alpha",
          sourceLocator: "fact-derived",
          useType: "financial-fact",
        },
      ],
    });
    derived.releases[0].recordCounts.financialFacts = 3;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(derived))
    ).not.toThrow();

    const editorialReportedNumber = structuredClone(derived);
    Object.assign(editorialReportedNumber.financialFacts[0], {
      statementStatus: "reported",
      derivation: null,
      evidenceVoiceId: "voice-taxsorted",
      sourceAssertionKind: "taxsorted-derived",
    });
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(editorialReportedNumber)
      )
    ).toThrow(/TaxSorted-derived financial fact must use structured/);

    const editorialProgramme = structuredClone(organisationDataset()) as any;
    addProgrammeAlpha(editorialProgramme);
    ensureTaxSortedVoice(editorialProgramme);
    editorialProgramme.programmes[0].evidenceVoiceId = "voice-taxsorted";
    editorialProgramme.programmes[0].sourceAssertionKind =
      "taxsorted-derived";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(editorialProgramme)
      )
    ).toThrow();

    const missingDerivedDisclosureReview = structuredClone(derived) as any;
    missingDerivedDisclosureReview.financialFacts[2].statisticalDisclosureReview =
      null;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(missingDerivedDisclosureReview)
      )
    ).toThrow();

    const derivedBeforeInputs = structuredClone(derived);
    derivedBeforeInputs.financialFacts[2].observedAt =
      "2026-07-10T11:00:00.000Z";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(derivedBeforeInputs)
      )
    ).toThrow(/derived financial fact cannot precede its inputs/);

    const peopleDerivedBypass = structuredClone(derived);
    for (const input of peopleDerivedBypass.financialFacts.slice(0, 2)) {
      input.metric = "staff-costs-aggregate";
      input.statisticalDisclosureReview = structuredClone(
        statisticalDisclosureReview
      );
    }
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(peopleDerivedBypass)
      )
    ).toThrow(/derived financial fact with a people-derived input/);

    peopleDerivedBypass.financialFacts[2].statisticalDisclosureReview =
      structuredClone(statisticalDisclosureReview);
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(peopleDerivedBypass)
      )
    ).not.toThrow();

    const wrongResult = structuredClone(derived);
    wrongResult.financialFacts[2].money.amountMinor = 2_999;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(wrongResult))
    ).toThrow(/does not equal its signed minor-unit inputs/);

    const wrongScope = structuredClone(derived);
    wrongScope.financialFacts[1].comparisonContext.scopeDefinition =
      "A different reporting scope.";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(wrongScope))
    ).toThrow(/must use the same scope key and definition/);

    const overflow = structuredClone(derived);
    overflow.financialFacts[0].money.amountMinor = Number.MIN_SAFE_INTEGER;
    overflow.financialFacts[1].money.amountMinor = Number.MAX_SAFE_INTEGER;
    overflow.financialFacts[2].money.amountMinor = 0;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(overflow))
    ).toThrow(/minor-unit arithmetic exceeds the safe integer range/);

    const cycle = structuredClone(derived);
    Object.assign(cycle.financialFacts[0], {
      statementStatus: "derived-exact-arithmetic",
      derivation: {
        method: "exact-arithmetic",
        operation: "signed-sum-of-minor-unit-inputs",
        terms: [
          { inputFinancialFactId: "fact-beta", coefficient: 1 },
          { inputFinancialFactId: "fact-derived", coefficient: -1 },
        ],
      },
      evidenceVoiceId: "voice-taxsorted",
      sourceAssertionKind: "taxsorted-derived",
    });
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(cycle))
    ).toThrow(/derivation graph contains a cycle/);
  });

  it("requires publishable disclosure reviews and omits values that need suppression", () => {
    const remuneration = structuredClone(organisationDataset());
    addMoneyFacts(remuneration);
    remuneration.financialFacts[0].metric = "remuneration-bands-aggregate";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(remuneration))
    ).toThrow(/staff-cost and remuneration metrics are people-derived aggregates/);

    remuneration.financialFacts[0].statisticalDisclosureReview =
      structuredClone(statisticalDisclosureReview);
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(remuneration))
    ).not.toThrow();

    const donationIncome = structuredClone(organisationDataset());
    addMoneyFacts(donationIncome);
    donationIncome.financialFacts[0].metric = "donation-income";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(donationIncome)
      )
    ).not.toThrow();

    const missingDonationIncomeReview = structuredClone(donationIncome) as any;
    missingDonationIncomeReview.financialFacts[0].statisticalDisclosureReview =
      null;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(missingDonationIncomeReview)
      )
    ).toThrow();

    donationIncome.financialFacts[0].statisticalDisclosureReview =
      structuredClone(statisticalDisclosureReview);
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(donationIncome)
      )
    ).not.toThrow();

    const falseOrganisationOnlyPay = structuredClone(remuneration);
    Object.assign(
      falseOrganisationOnlyPay.financialFacts[0].statisticalDisclosureReview!,
      {
        populationBasis: "organisation-only-not-person-derived",
        smallestReportedCell: null,
        smallCellDecision: "not-applicable",
      }
    );
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(falseOrganisationOnlyPay)
      )
    ).toThrow(/staff-cost and remuneration metrics are people-derived aggregates/);

    const suppressed = structuredClone(remuneration) as any;
    Object.assign(suppressed.financialFacts[0].statisticalDisclosureReview, {
      smallestReportedCell: 1,
      smallCellDecision: "suppressed",
      suppressionApplied: true,
      singlingOutRisk: "mitigated-by-suppression",
      specialCategoryInferenceRisk: "mitigated-by-suppression",
    });
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(suppressed))
    ).toThrow();

    const safeSuppressionGap = structuredClone(organisationDataset());
    safeSuppressionGap.coverageGaps.push({
      id: "gap-suppressed-value",
      affectedCollection: "financialFacts",
      organisationId: "organisation-alpha",
      gapType: "suppressed-for-disclosure-risk",
      status: "accepted-boundary",
      description: "A value was omitted after disclosure-risk review.",
      consequence: "No inference should be made from its absence.",
      sourceDocumentIds: [],
      observedAt: NOW,
      reviewAfter: "2026-08-10",
      privacyReview,
    });
    safeSuppressionGap.releases[0].recordCounts.coverageGaps = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(safeSuppressionGap)
      )
    ).not.toThrow();

    const leakingSuppressionText = structuredClone(safeSuppressionGap) as any;
    leakingSuppressionText.coverageGaps[0].description =
      "The omitted amount was GBP 100 and concerned one person.";
    leakingSuppressionText.coverageGaps[0].consequence =
      "The amount probably means the programme had one beneficiary.";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(leakingSuppressionText)
      )
    ).toThrow();

    const linkedSuppressionGap = structuredClone(safeSuppressionGap) as any;
    linkedSuppressionGap.coverageGaps[0].sourceDocumentIds = [
      "document-alpha",
    ];
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(linkedSuppressionGap)
      )
    ).toThrow();

    const gapReviewedBeforeSource = structuredClone(organisationDataset());
    gapReviewedBeforeSource.coverageGaps.push({
      id: "gap-source-not-published",
      affectedCollection: "claims",
      organisationId: "organisation-alpha",
      gapType: "not-published",
      status: "open",
      description: "No compatible claim was found in the reviewed source.",
      consequence: "The absence does not make a claim false.",
      sourceDocumentIds: ["document-alpha"],
      observedAt: "2026-07-10T10:00:00.000Z",
      reviewAfter: "2026-08-10",
      privacyReview: {
        ...privacyReview,
        reviewedAt: "2026-07-10T11:00:00.000Z",
      },
    });
    gapReviewedBeforeSource.releases[0].recordCounts.coverageGaps = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(gapReviewedBeforeSource)
      )
    ).toThrow(/coverage gap privacy review cannot precede referenced source/);

    const unreviewedPeopleAggregate = structuredClone(remuneration) as any;
    Object.assign(
      unreviewedPeopleAggregate.financialFacts[0].statisticalDisclosureReview,
      {
        smallestReportedCell: null,
        smallCellDecision: "not-applicable",
      }
    );
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(unreviewedPeopleAggregate)
      )
    ).toThrow(/people-derived aggregate needs a stated smallest cell/);

    const staffCosts = structuredClone(organisationDataset());
    addMoneyFacts(staffCosts);
    staffCosts.financialFacts[0].metric = "staff-costs-aggregate";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(staffCosts))
    ).toThrow(/staff-cost and remuneration metrics are people-derived aggregates/);

    staffCosts.financialFacts[0].statisticalDisclosureReview =
      structuredClone(statisticalDisclosureReview);
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(staffCosts))
    ).not.toThrow();

    const privacyBeforeDisclosure = structuredClone(organisationDataset());
    privacyBeforeDisclosure.documents[0].retrievedAt =
      "2026-07-10T09:00:00.000Z";
    privacyBeforeDisclosure.documents[0].sourceReview.assessedAt =
      "2026-07-10T09:00:00.000Z";
    addProgrammeAlpha(privacyBeforeDisclosure);
    privacyBeforeDisclosure.programmes[0].observedAt =
      "2026-07-10T10:00:00.000Z";
    privacyBeforeDisclosure.programmes[0].statisticalDisclosureReview = {
      ...statisticalDisclosureReview,
      reviewedAt: "2026-07-10T11:00:00.000Z",
    };
    privacyBeforeDisclosure.programmes[0].privacyReview = {
      ...privacyReview,
      reviewedAt: "2026-07-10T10:30:00.000Z",
    };
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCandidate(privacyBeforeDisclosure)
      )
    ).toThrow(/privacy review cannot precede its statistical disclosure review/);
  });

  it("validates financial-year labels", () => {

    const wrongYear = structuredClone(organisationDataset());
    addComparableClaims(wrongYear);
    wrongYear.claims[0].comparisonContext!.period = {
      kind: "financial-year",
      label: "2025-26",
      startDate: "2024-04-01",
      endDate: "2026-03-31",
    };
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(wrongYear))
    ).toThrow(/startDate year must match the label start year/);
  });

  it("keeps a self-evaluation attributed and rejects a false independent label", () => {
    const dataset = structuredClone(organisationDataset());
    ensureSubjectVoice(dataset);
    dataset.evaluations.push({
      id: "evaluation-alpha",
      organisationId: "organisation-alpha",
      programmeId: null,
      evaluatorOrganisationId: "organisation-alpha",
      evaluationType: "self-evaluation",
      normalisedFinding: "The organisation reports that the programme met its target.",
      normalisationReview,
      comparisonContext: {
        organisationId: "organisation-alpha",
        period: structuredClone(period),
        scopeKey: "programme-whole",
        scopeDefinition: "The whole programme described in the filing.",
        metricKey: "target-attainment",
        metricDefinition: "The source organisation's reported target result.",
      },
      methodology: "Attributed faithful paraphrase of the linked self-evaluation.",
      limitations: ["This is self-reported and is not an independent evaluation."],
      independenceStatus: "self-reported",
      statisticalDisclosureReview: structuredClone(statisticalDisclosureReview),
      evidenceVoiceId: "voice-alpha",
      sourceAssertionKind: "subject-organisation-self-report",
      sourceUses: [
        {
          documentId: "document-alpha",
          sourceLocator: "evaluation-alpha",
          useType: "evaluation-finding",
        },
      ],
      observedAt: NOW,
      privacyReview,
    });
    dataset.releases[0].recordCounts.evaluations = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(dataset))
    ).not.toThrow();

    const privacyBeforeNormalisation = structuredClone(dataset);
    privacyBeforeNormalisation.evaluations[0].observedAt =
      "2026-07-10T10:00:00.000Z";
    privacyBeforeNormalisation.evaluations[0].privacyReview.reviewedAt =
      "2026-07-10T11:00:00.000Z";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(privacyBeforeNormalisation)
      )
    ).toThrow(/privacy review cannot precede its approved normalisation/);

    const disclosureBeforeNormalisation = structuredClone(dataset);
    disclosureBeforeNormalisation.evaluations[0].observedAt =
      "2026-07-10T10:00:00.000Z";
    disclosureBeforeNormalisation.evaluations[0].statisticalDisclosureReview.reviewedAt =
      "2026-07-10T11:00:00.000Z";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(disclosureBeforeNormalisation)
      )
    ).toThrow(/disclosure review cannot precede its approved normalisation/);

    const falseTaxSortedIndependence = structuredClone(dataset);
    Object.assign(falseTaxSortedIndependence.voices[0], {
      voiceType: "taxsorted-editorial",
      speakingOrganisationId: null,
    });
    Object.assign(falseTaxSortedIndependence.evaluations[0], {
      evaluatorOrganisationId: null,
      evaluationType: "taxsorted-source-comparison",
      sourceAssertionKind: "taxsorted-derived",
      independenceStatus: "independent",
    });
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(falseTaxSortedIndependence)
      )
    ).toThrow(/not-applicable independence label/);

    falseTaxSortedIndependence.evaluations[0].independenceStatus =
      "not-applicable-taxsorted-analysis";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(falseTaxSortedIndependence)
      )
    ).not.toThrow();

    const falseIndependentEvaluator = structuredClone(dataset);
    falseIndependentEvaluator.evaluations[0].evaluationType =
      "independent-evaluation";
    falseIndependentEvaluator.evaluations[0].independenceStatus = "independent";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(falseIndependentEvaluator)
      )
    ).toThrow(/needs an exact, separate evaluator organisation and matching voice/);
  });

  it("enforces stable record order, release counts and tombstone removal", () => {
    const unsorted = structuredClone(organisationDataset());
    unsorted.coverageGaps.push(
      {
        id: "gap-zulu",
        affectedCollection: "claims",
        organisationId: "organisation-alpha",
        gapType: "not-published",
        status: "open",
        description: "Later gap.",
        consequence: "The claim cannot be checked.",
        sourceDocumentIds: [],
        observedAt: NOW,
        reviewAfter: "2026-08-10",
        privacyReview,
      },
      {
        id: "gap-alpha",
        affectedCollection: "claims",
        organisationId: "organisation-alpha",
        gapType: "not-published",
        status: "open",
        description: "Earlier gap.",
        consequence: "The claim cannot be checked.",
        sourceDocumentIds: [],
        observedAt: NOW,
        reviewAfter: "2026-08-10",
        privacyReview,
      }
    );
    unsorted.releases[0].recordCounts.coverageGaps = 2;
    expect(() => ukCharityAccountabilitySchema.parse(unsorted)).toThrow(
      /coverageGaps must be sorted by ASCII id ascending/
    );

    const wrongCount = structuredClone(organisationDataset());
    wrongCount.releases[0].recordCounts.organisations = 0;
    expect(() => ukCharityAccountabilitySchema.parse(wrongCount)).toThrow(
      /current release count does not match organisations/
    );

    const liveTombstone = structuredClone(organisationDataset());
    liveTombstone.tombstones.push({
      id: "tombstone-alpha",
      targetCollection: "organisations",
      targetId: "organisation-alpha",
      reason: "safety-withdrawn",
      effectiveAt: NOW,
      replacementCollection: null,
      replacementId: null,
      dataRemoved: true,
      retainedContent:
        "identifier-reason-release-safe-explanation-and-replacement-only",
      retainedIdentifiersReview,
      releaseId: "release-2026-07-10",
      publicExplanation:
        "This record was removed for safety review. Removed content and sensitive details are not repeated here.",
    });
    liveTombstone.releases[0].recordCounts.tombstones = 1;
    expect(() => ukCharityAccountabilitySchema.parse(liveTombstone)).toThrow(
      /tombstoned record must not remain in the active collection/
    );

    const unsafeTombstone = structuredClone(emptyDataset());
    (unsafeTombstone.tombstones as unknown as Array<Record<string, unknown>>).push({
      id: "tombstone-unsafe",
      targetCollection: "claims",
      targetId: "claim-removed",
      reason: "safety-withdrawn",
      effectiveAt: NOW,
      replacementCollection: null,
      replacementId: null,
      dataRemoved: true,
      retainedContent:
        "identifier-reason-release-safe-explanation-and-replacement-only",
      retainedIdentifiersReview,
      releaseId: "release-2026-07-10",
      publicExplanation: "Sensitive details that must not be repeated.",
    });
    unsafeTombstone.releases[0].recordCounts.tombstones = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(unsafeTombstone)
      )
    ).toThrow();

    (unsafeTombstone.tombstones[0] as unknown as Record<string, unknown>).publicExplanation =
      "This record was removed for safety review. Removed content and sensitive details are not repeated here.";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(unsafeTombstone)
      )
    ).not.toThrow();

    const correctedWithoutReplacement = structuredClone(emptyDataset());
    correctedWithoutReplacement.tombstones.push({
      id: "tombstone-corrected",
      targetCollection: "claims",
      targetId: "claim-old",
      reason: "corrected",
      effectiveAt: NOW,
      replacementCollection: null,
      replacementId: null,
      dataRemoved: true,
      retainedContent:
        "identifier-reason-release-safe-explanation-and-replacement-only",
      retainedIdentifiersReview,
      releaseId: "release-2026-07-10",
      publicExplanation:
        "This record was removed because a corrected record supersedes it. Removed content is not repeated here.",
    });
    correctedWithoutReplacement.releases[0].recordCounts.tombstones = 1;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(correctedWithoutReplacement)
      )
    ).toThrow(/corrected or replaced tombstone needs a replacement/);

    const unsafeRetainedIdentifier = structuredClone(unsafeTombstone) as any;
    unsafeRetainedIdentifier.tombstones[0].retainedIdentifiersReview.naturalPersonOrSensitiveDataPresent =
      true;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(unsafeRetainedIdentifier)
      )
    ).toThrow();

    const unsafeReleaseSummary = structuredClone(emptyDataset()) as any;
    unsafeReleaseSummary.releases[0].removedOrSensitiveContentRepeated = true;
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(unsafeReleaseSummary)
      )
    ).toThrow();

    const backAttributedTombstone = structuredClone(unsafeTombstone);
    backAttributedTombstone.releases[0].previousReleaseId =
      "release-2026-07-01";
    backAttributedTombstone.releases.unshift({
      ...structuredClone(backAttributedTombstone.releases[0]),
      id: "release-2026-07-01",
      candidateAssembledAt: "2026-07-01T12:00:00.000Z",
      previousReleaseId: null,
      datasetDigest: ZERO_DIGEST,
      recordCounts: zeroCounts(),
      changeSummary: ["Earlier empty candidate."],
      changeSummaryPrivacyReview: {
        ...privacyReview,
        reviewedAt: "2026-07-01T12:00:00.000Z",
      },
    });
    backAttributedTombstone.tombstones[0].releaseId =
      "release-2026-07-01";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(backAttributedTombstone)
      )
    ).toThrow(/tombstone cannot take effect after the candidate release/);

    const falseHistoricalCount = structuredClone(unsafeTombstone);
    falseHistoricalCount.releases[0].previousReleaseId =
      "release-2026-07-01";
    falseHistoricalCount.releases.unshift({
      ...structuredClone(falseHistoricalCount.releases[0]),
      id: "release-2026-07-01",
      candidateAssembledAt: "2026-07-01T12:00:00.000Z",
      previousReleaseId: null,
      datasetDigest: ZERO_DIGEST,
      recordCounts: zeroCounts(),
      changeSummary: ["Earlier candidate carrying one removal tombstone."],
      changeSummaryPrivacyReview: {
        ...privacyReview,
        reviewedAt: "2026-07-01T12:00:00.000Z",
      },
    });
    falseHistoricalCount.tombstones[0].releaseId =
      "release-2026-07-01";
    falseHistoricalCount.tombstones[0].effectiveAt =
      "2026-07-01T12:00:00.000Z";
    falseHistoricalCount.tombstones[0].retainedIdentifiersReview.reviewedAt =
      "2026-07-01T12:00:00.000Z";
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(falseHistoricalCount)
      )
    ).toThrow(/release tombstone count must equal the cumulative retained ledger/);
  });

  it("rejects cyclic release history and verifies the current release digest", () => {
    const cyclic = structuredClone(emptyDataset());
    cyclic.releases[0].id = "release-alpha";
    cyclic.releases[0].previousReleaseId = "release-beta";
    cyclic.releases.push({
      ...cyclic.releases[0],
      id: "release-beta",
      previousReleaseId: "release-alpha",
      datasetDigest: ZERO_DIGEST,
    });
    cyclic.meta.currentReleaseId = "release-beta";
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(cyclic))
    ).toThrow(/release predecessor graph contains a cycle/);

    const reversedChronology = structuredClone(emptyDataset());
    reversedChronology.releases[0].id = "release-alpha";
    reversedChronology.meta.currentReleaseId = "release-beta";
    reversedChronology.releases.push({
      ...structuredClone(reversedChronology.releases[0]),
      id: "release-beta",
      previousReleaseId: "release-alpha",
      candidateAssembledAt: "2026-07-09T12:00:00.000Z",
      datasetDigest: ZERO_DIGEST,
    });
    expect(() =>
      ukCharityAccountabilitySchema.parse(
        sealCurrentRelease(reversedChronology)
      )
    ).toThrow(/predecessor candidate cannot be assembled after its child/);

    const orphanedHistory = structuredClone(emptyDataset());
    orphanedHistory.releases[0].id = "release-alpha";
    orphanedHistory.meta.currentReleaseId = "release-beta";
    orphanedHistory.releases.push(
      {
        ...structuredClone(orphanedHistory.releases[0]),
        id: "release-beta",
        previousReleaseId: "release-alpha",
        datasetDigest: ZERO_DIGEST,
      },
      {
        ...structuredClone(orphanedHistory.releases[0]),
        id: "release-gamma",
        previousReleaseId: null,
        datasetDigest: ZERO_DIGEST,
      }
    );
    expect(() =>
      ukCharityAccountabilitySchema.parse(sealCurrentRelease(orphanedHistory))
    ).toThrow(/every release must be reachable from meta.currentReleaseId/);

    const tampered = structuredClone(organisationDataset());
    tampered.releases[0].datasetDigest = ZERO_DIGEST;
    expect(() => ukCharityAccountabilitySchema.parse(tampered)).toThrow(
      /current release datasetDigest does not match/
    );

    const sealed = sealCurrentRelease(structuredClone(organisationDataset()));
    expect(sealed.releases[0].datasetDigest).toBe(
      computeUkCharityAccountabilityDatasetDigest(sealed)
    );
  });
});
