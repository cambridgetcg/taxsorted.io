import { createHash } from "node:crypto";
import opportunityCorpusJson from "../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json";
import publicationApprovalJson from "../../../research/uk/professional-opportunities/data/publication-approval.json";
import qualifiedReviewPackJson from "../../../research/uk/professional-opportunities/review/qualified-review-pack.json";
import type { ProfessionalOpportunityEdgeGateManifest } from "./uk-professional-opportunity-edge-guard";

// Static publication is a separate decision from adding research to the
// corpus. It binds the exact canonical bytes, version and reviewed record IDs.
// Any later edit therefore closes the human projection until it is reviewed
// and approved again.

type PublicationCorpus = {
  meta: { version: string; lawAsAt: string; retrievedAt: string };
  sources: Array<{
    id: string;
    title: string;
    publisher: string;
    url: string;
    [key: string]: unknown;
  }>;
  scrutiny: Array<{
    id: string;
    title: string;
    affectedInstitutions: string[];
    [key: string]: unknown;
  }>;
  opportunities: Array<{
    id: string;
    title: string;
    territories: string[];
    [key: string]: unknown;
  }>;
};

export type PublicationApproval = {
  schema: string;
  status: string;
  decisionRecordedOn: string | null;
  corpusVersion: string;
  corpusDigest: string;
  opportunityIds: string[];
  hostedDistributionDecision: {
    status: string;
    decisionMakerName: string | null;
    decisionMakerCapacity: string | null;
    decisionEvidenceReference: string | null;
    reviewPackReference: string | null;
    exactCorpusAndPackReviewed: boolean;
    activationRemainsSeparate: boolean;
  };
  qualifiedReview: {
    status: string;
    reviewerName: string | null;
    reviewerCapacity: string | null;
    completedOn: string | null;
    evidenceReference: string | null;
    institutionalRightOfReply: {
      status: string;
      basis: string | null;
      evidenceReference: string | null;
    };
    confirmations: {
      currentLawTerritoryDeadlineAndRoute: boolean;
      privacySecurityAndThreatReview: boolean;
      noIntakeMarketplaceOrSubmission: boolean;
      emergencyStopExercised: boolean;
      correctionAndWithdrawalOwnersAssigned: boolean;
    };
  };
  effects: string;
};

const calendarDatePattern =
  /^(?:(?:[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8])))|(?:(?:[0-9]{2}(?:0[48]|[2468][048]|[13579][26])|(?:[02468][048]|[13579][26])00)-02-29))$/;
const idPattern = /^[a-z0-9][a-z0-9-]*$/u;
const sha256Pattern = /^sha256:[a-f0-9]{64}$/u;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const shortTextMaxLength = 1_000;
const millisecondsPerDay = 24 * 60 * 60 * 1_000;
const maximumReviewDays = 93;
const reviewRoles = [
  "tax-technical",
  "legal-procedure",
  "editorial-fairness",
  "privacy-security",
  "release-operations",
] as const;
const evidencePurposes = [
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
const reviewPackBoundaries = [
  "This pack is public-safe review evidence, not hosted-distribution approval.",
  "A complete pack does not change an API, frontend, deployment, intake or marketplace switch.",
  "Keep client facts, contact details, private documents and filesystem paths outside this pack.",
  "A private evidence reference is an opaque UUID held by a named custodian role; it is never the evidence itself.",
  "The corpus is already visible in the public GitHub repository; this pack governs later official TaxSorted hosting and endorsement.",
] as const;
const reviewPackDigestScope =
  "Canonical JSON of this pack excluding the integrity object.";

function isStoredText(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === "string" &&
    value === value.trim() &&
    value.length > 0 &&
    value.length <= maximumLength
  );
}

function isShortText(value: unknown): value is string {
  return isStoredText(value, shortTextMaxLength);
}

function hasExactKeys(
  value: unknown,
  keys: readonly string[],
) {
  const object = record(value);
  if (!object) return false;
  const actual = Object.keys(object).sort();
  const expected = [...keys].sort();
  return exactStrings(actual, expected);
}

function isId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 160 &&
    idPattern.test(value)
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && sha256Pattern.test(value);
}

function isPublicRoleLabel(value: unknown): value is string {
  return (
    isShortText(value) &&
    !/[\\/@]/u.test(value) &&
    !/^~/u.test(value) &&
    !/^[a-z]:/iu.test(value)
  );
}

function isPublicSafeText(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    isStoredText(value, maximumLength) &&
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
    !/\bfile:\/\//iu.test(value)
  );
}

function isPublicSafeNarrative(value: unknown): value is string {
  return isPublicSafeText(value, shortTextMaxLength);
}

function isValidHttpsUrl(value: string) {
  if (!value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

function isPublicControlReference(value: unknown): value is string {
  if (!isShortText(value)) return false;
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) {
    return isValidHttpsUrl(value);
  }
  return isPublicSafeNarrative(value);
}

function isOffsetIsoDateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const [datePart, timePart, ...rest] = value.split("T");
  return (
    rest.length === 0 &&
    calendarDatePattern.test(datePart) &&
    /^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9](?:\.[0-9]+)?)?(?:Z|[+-](?:[01][0-9]|2[0-3]):[0-5][0-9])$/u.test(
      timePart ?? "",
    ) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isPublicEvidenceReference(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return (
    isValidHttpsUrl(value) ||
    /^[a-z0-9][a-z0-9.-]{0,159}@sha256:[a-f0-9]{64}(?:#[a-z0-9][a-z0-9-]{0,159})?$/u.test(
      value,
    )
  );
}

function canonicalPublicationJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalPublicationJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalPublicationJson(object[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strings(value: unknown): string[] | null {
  return Array.isArray(value) &&
    value.every((item): item is string => typeof item === "string")
    ? value
    : null;
}

function exactStrings(actual: unknown, expected: readonly string[]) {
  const values = strings(actual);
  return (
    values !== null &&
    values.length === expected.length &&
    values.every((value, index) => value === expected[index])
  );
}

function sha256Canonical(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(canonicalPublicationJson(value), "utf8")
    .digest("hex")}`;
}

export function qualifiedReviewPackDigest(value: unknown) {
  const pack = record(value);
  if (!pack) return null;
  const preimage = { ...pack };
  delete preimage.integrity;
  return sha256Canonical(preimage);
}

type ReviewPackFacts = {
  reference: string;
  rightOfReplyReference: string;
  reviewerName: string;
  reviewerCapacity: string;
  completedOn: string;
};

function completeQualifiedReviewPack(
  corpus: PublicationCorpus,
  corpusDigest: string,
  value: unknown,
  asOf: string,
): ReviewPackFacts | null {
  const pack = record(value);
  const binding = record(pack?.corpus);
  const integrity = record(pack?.integrity);
  const declaration = record(pack?.declaration);
  const reviewers = Array.isArray(pack?.reviewers)
    ? pack.reviewers.map(record)
    : [];
  const evidenceIndex = Array.isArray(pack?.evidenceIndex)
    ? pack.evidenceIndex.map(record)
    : [];
  const sourceChecks = Array.isArray(pack?.sourceChecks)
    ? pack.sourceChecks.map(record)
    : [];
  const opportunityReviews = Array.isArray(pack?.opportunityReviews)
    ? pack.opportunityReviews.map(record)
    : [];
  const scrutinyReviews = Array.isArray(pack?.scrutinyReviews)
    ? pack.scrutinyReviews.map(record)
    : [];
  const controls = record(pack?.controls);
  if (
    !pack ||
    !binding ||
    !integrity ||
    !declaration ||
    reviewers.some((reviewer) => !reviewer) ||
    evidenceIndex.some((evidence) => !evidence) ||
    sourceChecks.some((review) => !review) ||
    opportunityReviews.some((review) => !review) ||
    scrutinyReviews.some((review) => !review) ||
    reviewers.length > 50 ||
    evidenceIndex.length > 1_000 ||
    sourceChecks.length > 500 ||
    opportunityReviews.length > 500 ||
    scrutinyReviews.length > 500 ||
    !controls ||
    !hasExactKeys(pack, [
      "schema",
      "status",
      "corpus",
      "reviewers",
      "evidenceIndex",
      "sourceChecks",
      "methodAndWorkflowReview",
      "opportunityReviews",
      "scrutinyReviews",
      "controls",
      "declaration",
      "boundaries",
      "integrity",
    ]) ||
    !hasExactKeys(binding, [
      "version",
      "digest",
      "lawAsAt",
      "retrievedAt",
      "opportunityIds",
      "scrutinyIds",
      "sourceIds",
    ]) ||
    !hasExactKeys(integrity, [
      "algorithm",
      "digest",
      "digestScope",
    ]) ||
    !hasExactKeys(declaration, [
      "reviewLeadId",
      "reviewStartedOn",
      "rightOfReplyResolvedOn",
      "completedOn",
      "reviewBy",
      "publicFieldsDisclosureChecked",
      "privateEvidenceOutsideRepository",
      "publicGithubDisclosureAcknowledged",
      "packDoesNotApproveHostedDistribution",
    ]) ||
    !hasExactKeys(controls, [
      "privacySecurityThreatReview",
      "publicSurfaceInspection",
      "emergencyStopDrill",
      "ownership",
    ]) ||
    pack.schema !==
      "taxsorted.uk.professional-opportunities-qualified-review-pack/1" ||
    pack.status !== "complete" ||
    integrity.algorithm !== "sha256" ||
    integrity.digestScope !== reviewPackDigestScope ||
    !isSha256(integrity.digest) ||
    integrity.digest !== qualifiedReviewPackDigest(pack) ||
    binding.version !== corpus.meta.version ||
    binding.digest !== corpusDigest ||
    binding.lawAsAt !== corpus.meta.lawAsAt ||
    binding.retrievedAt !== corpus.meta.retrievedAt ||
    !exactStrings(pack.boundaries, reviewPackBoundaries) ||
    !exactStrings(
      binding.sourceIds,
      corpus.sources.map((source) => source.id),
    ) ||
    !exactStrings(
      binding.opportunityIds,
      corpus.opportunities.map((opportunity) => opportunity.id),
    ) ||
    !exactStrings(
      binding.scrutinyIds,
      corpus.scrutiny.map((scrutiny) => scrutiny.id),
    )
  ) {
    return null;
  }

  const completedOn =
    typeof declaration.completedOn === "string"
      ? declaration.completedOn
      : "";
  const reviewBy =
    typeof declaration.reviewBy === "string"
      ? declaration.reviewBy
      : "";
  const reviewLeadId =
    typeof declaration.reviewLeadId === "string"
      ? declaration.reviewLeadId
      : "";
  const reviewStartedOn =
    typeof declaration.reviewStartedOn === "string"
      ? declaration.reviewStartedOn
      : "";
  const rightOfReplyResolvedOn =
    typeof declaration.rightOfReplyResolvedOn === "string"
      ? declaration.rightOfReplyResolvedOn
      : "";
  if (
    !calendarDatePattern.test(completedOn) ||
    !calendarDatePattern.test(reviewBy) ||
    !calendarDatePattern.test(reviewStartedOn) ||
    !calendarDatePattern.test(rightOfReplyResolvedOn) ||
    !calendarDatePattern.test(asOf) ||
    reviewStartedOn < corpus.meta.retrievedAt ||
    reviewStartedOn > completedOn ||
    Date.parse(`${completedOn}T00:00:00.000Z`) -
      Date.parse(`${reviewStartedOn}T00:00:00.000Z`) >
      maximumReviewDays * millisecondsPerDay ||
    rightOfReplyResolvedOn < reviewStartedOn ||
    rightOfReplyResolvedOn > completedOn ||
    completedOn < corpus.meta.retrievedAt ||
    completedOn > asOf ||
    reviewBy < asOf ||
    reviewBy <= completedOn ||
    Date.parse(`${reviewBy}T00:00:00.000Z`) -
      Date.parse(`${completedOn}T00:00:00.000Z`) >
      maximumReviewDays * millisecondsPerDay ||
    declaration.publicFieldsDisclosureChecked !== true ||
    declaration.privateEvidenceOutsideRepository !== true ||
    declaration.publicGithubDisclosureAcknowledged !== true ||
    declaration.packDoesNotApproveHostedDistribution !== true
  ) {
    return null;
  }

  const evidenceById = new Map<string, Record<string, unknown>>();
  for (const evidence of evidenceIndex) {
    const purpose = String(evidence?.purpose);
    const visibility = String(evidence?.visibility);
    if (
      !evidence ||
      !isId(evidence.id) ||
      !evidencePurposes.includes(
        purpose as (typeof evidencePurposes)[number],
      ) ||
      evidenceById.has(String(evidence.id)) ||
      (visibility === "public-https"
        ? !hasExactKeys(evidence, [
            "id",
            "purpose",
            "visibility",
            "url",
          ]) ||
          !isValidHttpsUrl(String(evidence.url))
        : visibility === "private-custodian-record"
          ? !hasExactKeys(evidence, [
              "id",
              "purpose",
              "visibility",
              "custodianRole",
              "opaqueRecordId",
            ]) ||
            !isPublicRoleLabel(evidence.custodianRole) ||
            !uuidPattern.test(String(evidence.opaqueRecordId))
          : true)
    ) {
      return null;
    }
    evidenceById.set(String(evidence.id), evidence);
  }
  const refsResolve = (
    value: unknown,
    purpose: (typeof evidencePurposes)[number],
    maximumIds = 200,
  ) => {
    const ids = strings(value);
    return (
      ids !== null &&
      ids.length > 0 &&
      ids.length <= maximumIds &&
      new Set(ids).size === ids.length &&
      ids.every(
        (evidenceId) =>
          evidenceById.get(evidenceId)?.purpose === purpose,
      )
    );
  };

  const opportunityIdSet = new Set(
    corpus.opportunities.map((opportunity) => opportunity.id),
  );
  const scrutinyIdSet = new Set(
    corpus.scrutiny.map((scrutiny) => scrutiny.id),
  );
  const reviewerById = new Map<string, Record<string, unknown>>();
  const roleSet = new Set<string>();
  for (const reviewer of reviewers) {
    if (!reviewer) return null;
    const roles = strings(reviewer.roles);
    const scope = record(reviewer.scope);
    const capacityVerification = record(
      reviewer.capacityVerification,
    );
    const independence = record(reviewer.independence);
    const opportunityScope = strings(scope?.opportunityIds);
    const scrutinyScope = strings(scope?.scrutinyIds);
    if (
      !hasExactKeys(reviewer, [
        "id",
        "publicName",
        "capacity",
        "capacityBasis",
        "capacityVerification",
        "independence",
        "roles",
        "scope",
        "qualificationEvidenceIds",
        "verifiedOn",
        "consentToPublishLabel",
      ]) ||
      !isId(reviewer.id) ||
      !roles?.length ||
      new Set(roles).size !== roles.length ||
      roles.some(
        (role) =>
          !reviewRoles.includes(
            role as (typeof reviewRoles)[number],
          ),
      ) ||
      !scope ||
      !hasExactKeys(scope, ["opportunityIds", "scrutinyIds"]) ||
      !opportunityScope ||
      new Set(opportunityScope).size !== opportunityScope.length ||
      opportunityScope.some((scopeId) => !opportunityIdSet.has(scopeId)) ||
      !scrutinyScope ||
      new Set(scrutinyScope).size !== scrutinyScope.length ||
      scrutinyScope.some((scopeId) => !scrutinyIdSet.has(scopeId)) ||
      !capacityVerification ||
      !hasExactKeys(capacityVerification, [
        "verifierPublicLabel",
        "verifiedOn",
        "evidenceIds",
      ]) ||
      !isPublicRoleLabel(capacityVerification.verifierPublicLabel) ||
      capacityVerification.verifierPublicLabel === reviewer.publicName ||
      !calendarDatePattern.test(
        String(capacityVerification.verifiedOn),
      ) ||
      !refsResolve(
        capacityVerification.evidenceIds,
        "reviewer-qualification",
        20,
      ) ||
      !independence ||
      !hasExactKeys(independence, [
        "independentOfCorpusAuthors",
        "independentOfAffectedInstitutionsInScope",
        "noUndisclosedRelevantInterest",
        "declarationEvidenceIds",
      ]) ||
      independence.independentOfCorpusAuthors !== true ||
      independence.independentOfAffectedInstitutionsInScope !== true ||
      independence.noUndisclosedRelevantInterest !== true ||
      !refsResolve(
        independence.declarationEvidenceIds,
        "reviewer-independence",
        20,
      ) ||
      reviewer.consentToPublishLabel !== true ||
      !isPublicRoleLabel(reviewer.publicName) ||
      !isPublicSafeNarrative(reviewer.capacity) ||
      !isPublicSafeNarrative(reviewer.capacityBasis) ||
      !calendarDatePattern.test(String(reviewer.verifiedOn)) ||
      !refsResolve(
        reviewer.qualificationEvidenceIds,
        "reviewer-qualification",
        20,
      ) ||
      reviewerById.has(String(reviewer.id))
    ) {
      return null;
    }
    reviewerById.set(String(reviewer.id), reviewer);
    roles.forEach((role) => roleSet.add(role));
  }
  for (const role of reviewRoles) {
    if (!roleSet.has(role)) return null;
  }
  const lead = reviewerById.get(reviewLeadId);
  if (!lead) return null;
  const reviewersResolve = (value: unknown) => {
    const ids = strings(value);
    return (
      ids !== null &&
      ids.length > 0 &&
      ids.length <= 30 &&
      new Set(ids).size === ids.length &&
      ids.every((reviewerId) => reviewerById.has(reviewerId))
    );
  };
  const reviewerHasRoleAndScope = (
    value: unknown,
    role: string,
    scopeKey: "opportunityIds" | "scrutinyIds",
    scopeId: string,
  ) => {
    const ids = strings(value);
    return (
      ids?.some((reviewerId) => {
        const reviewer = reviewerById.get(reviewerId);
        const scope = record(reviewer?.scope);
        return (
          strings(reviewer?.roles)?.includes(role) === true &&
          strings(scope?.[scopeKey])?.includes(scopeId) === true
        );
      }) === true
    );
  };
  const reviewerHasRole = (value: unknown, roles: readonly string[]) => {
    const ids = strings(value);
    return (
      ids?.some((reviewerId) => {
        const assignedRoles = strings(
          reviewerById.get(reviewerId)?.roles,
        );
        return roles.some((role) => assignedRoles?.includes(role));
      }) === true
    );
  };
  const reviewDateIsCurrent = (value: unknown) =>
    typeof value === "string" &&
    calendarDatePattern.test(value) &&
    value >= reviewStartedOn &&
    value <= completedOn;
  if (
    reviewers.some(
      (reviewer) => {
        const capacityVerification = record(
          reviewer?.capacityVerification,
        );
        return (
          !reviewer ||
          !reviewDateIsCurrent(reviewer.verifiedOn) ||
          !reviewDateIsCurrent(capacityVerification?.verifiedOn)
        );
      },
    )
  ) {
    return null;
  }

  if (
    sourceChecks.length !== corpus.sources.length ||
    sourceChecks.some((review, index) => {
      const source = corpus.sources[index];
      return (
        !review ||
        !hasExactKeys(review, [
          "sourceId",
          "title",
          "publisher",
          "url",
          "sourceRecordDigest",
          "reviewerIds",
          "checkedOn",
          "result",
          "versionOrPublicationDate",
          "pinpointOrScope",
          "evidenceIds",
        ]) ||
        review.sourceId !== source.id ||
        review.title !== source.title ||
        review.publisher !== source.publisher ||
        review.url !== source.url ||
        review.sourceRecordDigest !== sha256Canonical(source) ||
        review.result !== "supports-stated-use" ||
        !reviewDateIsCurrent(review.checkedOn) ||
        !isPublicSafeNarrative(review.versionOrPublicationDate) ||
        !isPublicSafeNarrative(review.pinpointOrScope) ||
        !reviewersResolve(review.reviewerIds) ||
        !reviewerHasRole(review.reviewerIds, [
          "tax-technical",
          "legal-procedure",
          "editorial-fairness",
        ]) ||
        !refsResolve(review.evidenceIds, "source-material")
      );
    })
  ) {
    return null;
  }

  const allTrue = (
    review: Record<string, unknown>,
    keys: readonly string[],
  ) => keys.every((key) => review[key] === true);
  if (
    opportunityReviews.length !== corpus.opportunities.length ||
    opportunityReviews.some((review, index) => {
      const opportunity = corpus.opportunities[index];
      return (
        !review ||
        !hasExactKeys(review, [
          "opportunityId",
          "title",
          "territories",
          "opportunityRecordDigest",
          "reviewerIds",
          "completedOn",
          "result",
          "lawAndSourceHierarchyConfirmed",
          "territoryConfirmed",
          "deadlinesAndClockConfirmed",
          "routesAndRemedySeparationConfirmed",
          "professionalGatesAndAuthorityConfirmed",
          "sourceSupportConfirmed",
          "moneyAndOutcomeBoundariesConfirmed",
          "evidenceIds",
        ]) ||
        review.opportunityId !== opportunity.id ||
        review.title !== opportunity.title ||
        !exactStrings(review.territories, opportunity.territories) ||
        review.opportunityRecordDigest !==
          sha256Canonical(opportunity) ||
        review.result !== "confirmed" ||
        !reviewDateIsCurrent(review.completedOn) ||
        !reviewersResolve(review.reviewerIds) ||
        !reviewerHasRoleAndScope(
          review.reviewerIds,
          "tax-technical",
          "opportunityIds",
          opportunity.id,
        ) ||
        !reviewerHasRoleAndScope(
          review.reviewerIds,
          "legal-procedure",
          "opportunityIds",
          opportunity.id,
        ) ||
        !refsResolve(review.evidenceIds, "review-work") ||
        !allTrue(review, [
          "lawAndSourceHierarchyConfirmed",
          "territoryConfirmed",
          "deadlinesAndClockConfirmed",
          "routesAndRemedySeparationConfirmed",
          "professionalGatesAndAuthorityConfirmed",
          "sourceSupportConfirmed",
          "moneyAndOutcomeBoundariesConfirmed",
        ])
      );
    })
  ) {
    return null;
  }

  if (
    scrutinyReviews.length !== corpus.scrutiny.length ||
    scrutinyReviews.some((review, index) => {
      const scrutiny = corpus.scrutiny[index];
      const framingDigest = sha256Canonical(scrutiny);
      const replies = Array.isArray(review?.rightOfReply)
        ? review.rightOfReply.map(record)
        : [];
      const scrutinyCompletedOn =
        typeof review?.completedOn === "string"
          ? review.completedOn
          : "";
      return (
        !review ||
        !hasExactKeys(review, [
          "scrutinyId",
          "title",
          "scrutinyFramingDigest",
          "reviewerIds",
          "completedOn",
          "result",
          "statementSupportConfirmed",
          "evidenceStateConfirmed",
          "doesNotProveConfirmed",
          "counterweightOrResponseConfirmed",
          "correctionOrReviewRouteConfirmed",
          "noPersonalTargetOrMotiveInferenceConfirmed",
          "evidenceIds",
          "rightOfReply",
        ]) ||
        review.scrutinyId !== scrutiny.id ||
        review.title !== scrutiny.title ||
        review.scrutinyFramingDigest !== framingDigest ||
        review.result !== "confirmed" ||
        !reviewDateIsCurrent(review.completedOn) ||
        !reviewersResolve(review.reviewerIds) ||
        !reviewerHasRoleAndScope(
          review.reviewerIds,
          "editorial-fairness",
          "scrutinyIds",
          scrutiny.id,
        ) ||
        !reviewerHasRoleAndScope(
          review.reviewerIds,
          "legal-procedure",
          "scrutinyIds",
          scrutiny.id,
        ) ||
        !refsResolve(review.evidenceIds, "review-work") ||
        !allTrue(review, [
          "statementSupportConfirmed",
          "evidenceStateConfirmed",
          "doesNotProveConfirmed",
          "counterweightOrResponseConfirmed",
          "correctionOrReviewRouteConfirmed",
          "noPersonalTargetOrMotiveInferenceConfirmed",
        ]) ||
        replies.length > 100 ||
        replies.length !== scrutiny.affectedInstitutions.length ||
        replies.some(
          (reply, replyIndex) =>
            !reply ||
            !hasExactKeys(reply, [
              "institution",
              "scrutinyFramingDigest",
              "disposition",
              "sentOn",
              "replyDueOn",
              "receivedOn",
              "resolvedOn",
              "publicBasis",
              "evidenceIds",
            ]) ||
            reply.institution !==
              scrutiny.affectedInstitutions[replyIndex] ||
            reply.scrutinyFramingDigest !== framingDigest ||
            ![
              "official-response-documented",
              "fresh-reply-completed",
              "no-response-after-deadline",
              "not-applicable-with-reason",
            ].includes(String(reply.disposition)) ||
            !reviewDateIsCurrent(reply.resolvedOn) ||
            String(reply.resolvedOn) > scrutinyCompletedOn ||
            String(reply.resolvedOn) >
              rightOfReplyResolvedOn ||
            !isPublicSafeNarrative(reply.publicBasis) ||
            !refsResolve(
              reply.evidenceIds,
              "institutional-reply",
            ) ||
            (reply.disposition ===
              "not-applicable-with-reason"
              ? reply.sentOn !== null ||
                reply.replyDueOn !== null ||
                reply.receivedOn !== null
              : !reviewDateIsCurrent(reply.sentOn) ||
                !reviewDateIsCurrent(reply.replyDueOn) ||
                String(reply.replyDueOn) <
                  String(reply.sentOn) ||
                (reply.disposition ===
                "no-response-after-deadline"
                  ? reply.receivedOn !== null ||
                    String(reply.resolvedOn) <
                      String(reply.replyDueOn)
                  : !reviewDateIsCurrent(reply.receivedOn) ||
                    String(reply.receivedOn) <
                      String(reply.sentOn) ||
                    String(reply.receivedOn) >
                      String(reply.resolvedOn))),
        )
      );
    })
  ) {
    return null;
  }

  const method = record(pack.methodAndWorkflowReview);
  const privacy = record(controls.privacySecurityThreatReview);
  const surface = record(controls.publicSurfaceInspection);
  const drill = record(controls.emergencyStopDrill);
  const ownership = record(controls.ownership);
  const correction = record(ownership?.correction);
  const withdrawal = record(ownership?.withdrawal);
  const operatorId =
    typeof drill?.operatorReviewerId === "string"
      ? drill.operatorReviewerId
      : "";
  const operator = reviewerById.get(operatorId);
  const validInstant = (value: unknown) =>
    isOffsetIsoDateTime(value) &&
    value.slice(0, 10) >= reviewStartedOn &&
    value.slice(0, 10) <= completedOn;
  const drillInstants = [
    drill?.startedAt,
    drill?.stopActivatedAt,
    drill?.apiContainedAt,
    drill?.frontendContainedAt,
    drill?.restoredClosedAt,
  ];
  if (
    !method ||
    !hasExactKeys(method, [
      "reviewerIds",
      "completedOn",
      "result",
      "professionalStatusBoundaryConfirmed",
      "deadlineControlConfirmed",
      "challengeSeparationConfirmed",
      "moneyStateSeparationConfirmed",
      "localCustodyAndNoSubmissionConfirmed",
      "evidenceIds",
    ]) ||
    method.result !== "confirmed" ||
    !reviewDateIsCurrent(method.completedOn) ||
    !reviewersResolve(method.reviewerIds) ||
    !reviewerHasRole(method.reviewerIds, ["tax-technical"]) ||
    !reviewerHasRole(method.reviewerIds, ["legal-procedure"]) ||
    !refsResolve(method.evidenceIds, "review-work") ||
    !allTrue(method, [
      "professionalStatusBoundaryConfirmed",
      "deadlineControlConfirmed",
      "challengeSeparationConfirmed",
      "moneyStateSeparationConfirmed",
      "localCustodyAndNoSubmissionConfirmed",
    ]) ||
    !privacy ||
    !hasExactKeys(privacy, [
      "reviewerIds",
      "completedOn",
      "result",
      "evidenceIds",
    ]) ||
    privacy.result !== "pass" ||
    !reviewDateIsCurrent(privacy.completedOn) ||
    !reviewersResolve(privacy.reviewerIds) ||
    !reviewerHasRole(privacy.reviewerIds, ["privacy-security"]) ||
    !refsResolve(privacy.evidenceIds, "privacy-security") ||
    !surface ||
    !hasExactKeys(surface, [
      "reviewerIds",
      "completedOn",
      "result",
      "noIntake",
      "noMarketplace",
      "noSubmission",
      "noPrivateUpload",
      "evidenceIds",
    ]) ||
    surface.result !== "pass" ||
    !reviewDateIsCurrent(surface.completedOn) ||
    !reviewersResolve(surface.reviewerIds) ||
    !reviewerHasRole(surface.reviewerIds, ["privacy-security"]) ||
    !reviewerHasRole(surface.reviewerIds, ["release-operations"]) ||
    !refsResolve(surface.evidenceIds, "public-surface") ||
    !allTrue(surface, [
      "noIntake",
      "noMarketplace",
      "noSubmission",
      "noPrivateUpload",
    ]) ||
    !drill ||
    !hasExactKeys(drill, [
      "operatorReviewerId",
      "result",
      "corpusDigest",
      "commitSha",
      "environment",
      "startedAt",
      "stopActivatedAt",
      "apiContainedAt",
      "frontendContainedAt",
      "restoredClosedAt",
      "apiProtectedRoutesReturned503",
      "wakeReportedStopped",
      "safeSchemasRightsAndBlankTemplateRemainedReadable",
      "frontendContainedOnlyClosedShells",
      "cacheDisposition",
      "evidenceIds",
    ]) ||
    drill.result !== "pass" ||
    drill.corpusDigest !== corpusDigest ||
    drill.environment !== "production-closed-release" ||
    typeof drill.commitSha !== "string" ||
    !/^[a-f0-9]{40}$/u.test(drill.commitSha) ||
    drill.cacheDisposition !== "purged" ||
    drillInstants.some((instant) => !validInstant(instant)) ||
    drillInstants.some(
      (instant, index) =>
        index > 0 &&
        Date.parse(String(instant)) <
          Date.parse(String(drillInstants[index - 1])),
    ) ||
    operatorId === reviewLeadId ||
    operator?.publicName === lead.publicName ||
    !strings(operator?.roles)?.includes("release-operations") ||
    !refsResolve(drill.evidenceIds, "emergency-stop-drill") ||
    !allTrue(drill, [
      "apiProtectedRoutesReturned503",
      "wakeReportedStopped",
      "safeSchemasRightsAndBlankTemplateRemainedReadable",
      "frontendContainedOnlyClosedShells",
    ]) ||
    !ownership ||
    !hasExactKeys(ownership, [
      "result",
      "reviewerIds",
      "assignedOn",
      "correction",
      "withdrawal",
    ]) ||
    ownership.result !== "pass" ||
    !reviewDateIsCurrent(ownership.assignedOn) ||
    !reviewersResolve(ownership.reviewerIds) ||
    !reviewerHasRole(ownership.reviewerIds, [
      "release-operations",
    ]) ||
    !correction ||
    !withdrawal ||
    !hasExactKeys(correction, [
      "primaryPublicLabel",
      "backupPublicLabel",
      "publicRouteOrControl",
      "accessTestedAt",
      "evidenceIds",
    ]) ||
    !hasExactKeys(withdrawal, [
      "primaryPublicLabel",
      "backupPublicLabel",
      "publicRouteOrControl",
      "accessTestedAt",
      "evidenceIds",
    ]) ||
    !isPublicRoleLabel(correction.primaryPublicLabel) ||
    !isPublicRoleLabel(correction.backupPublicLabel) ||
    correction.primaryPublicLabel === correction.backupPublicLabel ||
    !isPublicControlReference(correction.publicRouteOrControl) ||
    !validInstant(correction.accessTestedAt) ||
    !refsResolve(correction.evidenceIds, "correction-control") ||
    !isPublicRoleLabel(withdrawal.primaryPublicLabel) ||
    !isPublicRoleLabel(withdrawal.backupPublicLabel) ||
    withdrawal.primaryPublicLabel === withdrawal.backupPublicLabel ||
    !isPublicControlReference(withdrawal.publicRouteOrControl) ||
    !validInstant(withdrawal.accessTestedAt) ||
    !refsResolve(withdrawal.evidenceIds, "withdrawal-control")
  ) {
    return null;
  }

  const reference = `qualified-review-pack@${integrity.digest}`;
  return {
    reference,
    rightOfReplyReference: `${reference}#right-of-reply`,
    reviewerName: String(lead.publicName),
    reviewerCapacity: String(lead.capacity),
    completedOn,
  };
}

export function evaluateUkProfessionalOpportunityStaticPublication(
  corpus: PublicationCorpus,
  approval: PublicationApproval,
  reviewPack: unknown = qualifiedReviewPackJson,
  asOf = new Date().toISOString().slice(0, 10),
) {
  const corpusDigest = `sha256:${createHash("sha256")
    .update(canonicalPublicationJson(corpus), "utf8")
    .digest("hex")}`;
  const knownIds = new Set(
    corpus.opportunities.map((opportunity) => opportunity.id),
  );
  const uniqueIds = new Set(approval.opportunityIds);
  const qualifiedReview = approval.qualifiedReview;
  const hostedDecision = approval.hostedDistributionDecision;
  const decisionRecordedOn =
    typeof approval.decisionRecordedOn === "string"
      ? approval.decisionRecordedOn
      : "";
  const completedOn =
    typeof qualifiedReview?.completedOn === "string"
      ? qualifiedReview.completedOn
      : "";
  const rightOfReply = qualifiedReview?.institutionalRightOfReply;
  const reviewPackFacts = completeQualifiedReviewPack(
    corpus,
    corpusDigest,
    reviewPack,
    asOf,
  );
  const approvalShapeValid =
    hasExactKeys(approval as unknown as Record<string, unknown>, [
      "schema",
      "status",
      "decisionRecordedOn",
      "corpusVersion",
      "corpusDigest",
      "opportunityIds",
      "hostedDistributionDecision",
      "qualifiedReview",
      "effects",
    ]) &&
    hasExactKeys(
      hostedDecision as unknown as Record<string, unknown>,
      [
        "status",
        "decisionMakerName",
        "decisionMakerCapacity",
        "decisionEvidenceReference",
        "reviewPackReference",
        "exactCorpusAndPackReviewed",
        "activationRemainsSeparate",
      ],
    ) &&
    hasExactKeys(
      qualifiedReview as unknown as Record<string, unknown>,
      [
        "status",
        "reviewerName",
        "reviewerCapacity",
        "completedOn",
        "evidenceReference",
        "institutionalRightOfReply",
        "confirmations",
      ],
    ) &&
    hasExactKeys(
      qualifiedReview.institutionalRightOfReply as unknown as Record<
        string,
        unknown
      >,
      ["status", "basis", "evidenceReference"],
    ) &&
    hasExactKeys(
      qualifiedReview.confirmations as unknown as Record<
        string,
        unknown
      >,
      [
        "currentLawTerritoryDeadlineAndRoute",
        "privacySecurityAndThreatReview",
        "noIntakeMarketplaceOrSubmission",
        "emergencyStopExercised",
        "correctionAndWithdrawalOwnersAssigned",
      ],
    ) &&
    isPublicSafeText(approval.effects, 8_000);
  const hostedDecisionComplete =
    hostedDecision?.status === "approved" &&
    isPublicRoleLabel(hostedDecision.decisionMakerName) &&
    isPublicSafeNarrative(hostedDecision.decisionMakerCapacity) &&
    hostedDecision.decisionMakerName !== qualifiedReview?.reviewerName &&
    isPublicEvidenceReference(
      hostedDecision.decisionEvidenceReference,
    ) &&
    hostedDecision.decisionEvidenceReference !==
      hostedDecision.reviewPackReference &&
    reviewPackFacts !== null &&
    hostedDecision.reviewPackReference === reviewPackFacts.reference &&
    hostedDecision.exactCorpusAndPackReviewed === true &&
    hostedDecision.activationRemainsSeparate === true;
  const qualifiedReviewComplete =
    qualifiedReview?.status === "complete" &&
    isPublicRoleLabel(qualifiedReview.reviewerName) &&
    isPublicSafeNarrative(qualifiedReview.reviewerCapacity) &&
    calendarDatePattern.test(completedOn) &&
    calendarDatePattern.test(corpus.meta.retrievedAt) &&
    completedOn >= corpus.meta.retrievedAt &&
    calendarDatePattern.test(decisionRecordedOn) &&
    decisionRecordedOn >= completedOn &&
    decisionRecordedOn <= asOf &&
    reviewPackFacts !== null &&
    qualifiedReview.reviewerName === reviewPackFacts.reviewerName &&
    qualifiedReview.reviewerCapacity ===
      reviewPackFacts.reviewerCapacity &&
    completedOn === reviewPackFacts.completedOn &&
    isPublicEvidenceReference(qualifiedReview.evidenceReference) &&
    qualifiedReview.evidenceReference === reviewPackFacts.reference &&
    rightOfReply?.status === "completed" &&
    isPublicSafeNarrative(rightOfReply.basis) &&
    isPublicEvidenceReference(rightOfReply.evidenceReference) &&
    rightOfReply.evidenceReference ===
      reviewPackFacts.rightOfReplyReference &&
    qualifiedReview.confirmations
      ?.currentLawTerritoryDeadlineAndRoute === true &&
    qualifiedReview.confirmations.privacySecurityAndThreatReview === true &&
    qualifiedReview.confirmations.noIntakeMarketplaceOrSubmission === true &&
    qualifiedReview.confirmations.emergencyStopExercised === true &&
    qualifiedReview.confirmations
      .correctionAndWithdrawalOwnersAssigned === true;
  const approved =
    approvalShapeValid &&
    approval.schema ===
      "taxsorted.uk.professional-opportunities-publication-approval/3" &&
    approval.status === "approved-for-hosted-distribution" &&
    hostedDecisionComplete &&
    qualifiedReviewComplete &&
    calendarDatePattern.test(decisionRecordedOn) &&
    approval.corpusVersion === corpus.meta.version &&
    approval.corpusDigest === corpusDigest &&
    approval.opportunityIds.length === corpus.opportunities.length &&
    uniqueIds.size === approval.opportunityIds.length &&
    approval.opportunityIds.every(
      (opportunityId, index) =>
        knownIds.has(opportunityId) &&
        opportunityId === corpus.opportunities[index]?.id,
    );
  return {
    approved,
    corpusDigest,
    approvedOpportunityIds: approved ? approval.opportunityIds : [],
  };
}

export function parseUkProfessionalOpportunityEmergencyStop(
  value: string | undefined,
) {
  return value !== undefined && value !== "" && value !== "false";
}

const staticEmergencyStop = parseUkProfessionalOpportunityEmergencyStop(
  process.env.UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP,
);
const staticPublicDataEnabled =
  process.env.UK_PROFESSIONAL_OPPORTUNITIES_PUBLIC_DATA_ENABLED === "true";
const publicationDecision =
  evaluateUkProfessionalOpportunityStaticPublication(
    opportunityCorpusJson,
    publicationApprovalJson,
  );

export const ukProfessionalOpportunityStaticPublication = {
  ...publicationApprovalJson,
  exactCorpusApproved: publicationDecision.approved,
  computedCorpusDigest: publicationDecision.corpusDigest,
  publicDataEnabled: staticPublicDataEnabled,
  emergencyStop: staticEmergencyStop,
} as const;

const edgeGateOpen =
  ukProfessionalOpportunityStaticPublication.exactCorpusApproved &&
  ukProfessionalOpportunityStaticPublication.publicDataEnabled &&
  !ukProfessionalOpportunityStaticPublication.emergencyStop;

export const professionalOpportunityEdgeGateManifest = {
  schema: "taxsorted.uk.professional-opportunity-edge-gate/1",
  state: edgeGateOpen ? "open" : "closed",
  corpusDigest: publicationDecision.corpusDigest,
  reviewBy: edgeGateOpen
    ? qualifiedReviewPackJson.declaration.reviewBy
    : null,
} satisfies ProfessionalOpportunityEdgeGateManifest;

const publishedOpportunityIds = new Set<string>(
  edgeGateOpen
    ? publicationDecision.approvedOpportunityIds
    : [],
);

export function isUkProfessionalOpportunityStaticallyPublished(
  opportunityId: string,
) {
  return publishedOpportunityIds.has(opportunityId);
}
