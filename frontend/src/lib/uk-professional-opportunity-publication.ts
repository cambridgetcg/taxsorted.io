import { createHash } from "node:crypto";
import opportunityCorpusJson from "../../../research/uk/professional-opportunities/data/uk-professional-opportunities.json";
import publicationApprovalJson from "../../../research/uk/professional-opportunities/data/publication-approval.json";

// Static publication is a separate decision from adding research to the
// corpus. It binds the exact canonical bytes, version and reviewed record IDs.
// Any later edit therefore closes the human projection until it is reviewed
// and approved again.

type PublicationCorpus = {
  meta: { version: string; retrievedAt: string };
  opportunities: Array<{ id: string }>;
};

export type PublicationApproval = {
  schema: string;
  status: string;
  decisionRecordedOn: string;
  corpusVersion: string;
  corpusDigest: string;
  opportunityIds: string[];
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
const urlLikeReferencePattern = /^[a-z][a-z0-9+.-]*:\/\//iu;
const shortTextMaxLength = 1_000;

function isShortText(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= shortTextMaxLength
  );
}

function isValidHttpsUrl(value: string) {
  if (!value.startsWith("https://")) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isPublicEvidenceReference(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return (
    isValidHttpsUrl(value) ||
    (isShortText(value) &&
      !urlLikeReferencePattern.test(value.trim()))
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

export function evaluateUkProfessionalOpportunityStaticPublication(
  corpus: PublicationCorpus,
  approval: PublicationApproval,
) {
  const corpusDigest = `sha256:${createHash("sha256")
    .update(canonicalPublicationJson(corpus), "utf8")
    .digest("hex")}`;
  const knownIds = new Set(
    corpus.opportunities.map((opportunity) => opportunity.id),
  );
  const uniqueIds = new Set(approval.opportunityIds);
  const qualifiedReview = approval.qualifiedReview;
  const completedOn =
    typeof qualifiedReview?.completedOn === "string"
      ? qualifiedReview.completedOn
      : "";
  const rightOfReply = qualifiedReview?.institutionalRightOfReply;
  const qualifiedReviewComplete =
    qualifiedReview?.status === "complete" &&
    isShortText(qualifiedReview.reviewerName) &&
    isShortText(qualifiedReview.reviewerCapacity) &&
    calendarDatePattern.test(completedOn) &&
    calendarDatePattern.test(corpus.meta.retrievedAt) &&
    completedOn >= corpus.meta.retrievedAt &&
    approval.decisionRecordedOn >= completedOn &&
    isPublicEvidenceReference(qualifiedReview.evidenceReference) &&
    rightOfReply?.status !== "pending" &&
    (rightOfReply?.status === "completed" ||
      rightOfReply?.status === "not-applicable-with-reason" ||
      rightOfReply?.status === "official-response-documented") &&
    isShortText(rightOfReply.basis) &&
    isPublicEvidenceReference(rightOfReply.evidenceReference) &&
    qualifiedReview.confirmations
      ?.currentLawTerritoryDeadlineAndRoute === true &&
    qualifiedReview.confirmations.privacySecurityAndThreatReview === true &&
    qualifiedReview.confirmations.noIntakeMarketplaceOrSubmission === true &&
    qualifiedReview.confirmations.emergencyStopExercised === true &&
    qualifiedReview.confirmations
      .correctionAndWithdrawalOwnersAssigned === true;
  const approved =
    approval.schema ===
      "taxsorted.uk.professional-opportunities-publication-approval/2" &&
    approval.status === "approved-for-publication" &&
    qualifiedReviewComplete &&
    calendarDatePattern.test(approval.decisionRecordedOn) &&
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

const publishedOpportunityIds = new Set<string>(
  ukProfessionalOpportunityStaticPublication.exactCorpusApproved &&
    ukProfessionalOpportunityStaticPublication.publicDataEnabled &&
    !ukProfessionalOpportunityStaticPublication.emergencyStop
    ? publicationDecision.approvedOpportunityIds
    : [],
);

export function isUkProfessionalOpportunityStaticallyPublished(
  opportunityId: string,
) {
  return publishedOpportunityIds.has(opportunityId);
}
