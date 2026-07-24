import { createHash } from "node:crypto";
import caseCommonsJson from "../../../research/uk/case-commons/data/uk-case-commons.json";
import publicationApprovalJson from "../../../research/uk/case-commons/data/publication-approval.json";

// Static publication is a separate decision from admitting a case to the
// research corpus. The approval binds the exact canonical corpus bytes,
// corpus version and reviewed case IDs. A later data edit therefore closes the
// human projection until a new reviewed approval is recorded.

type PublicationCorpus = {
  meta: { version: string };
  cases: Array<{ id: string }>;
};

type PublicationApproval = {
  schema: string;
  status: string;
  decisionRecordedOn: string;
  corpusVersion: string;
  corpusDigest: string;
  caseIds: string[];
  effects: string;
};

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

export function evaluateUkCaseStaticPublication(
  corpus: PublicationCorpus,
  approval: PublicationApproval,
) {
  const corpusDigest = `sha256:${createHash("sha256")
    .update(canonicalPublicationJson(corpus), "utf8")
    .digest("hex")}`;
  const knownCaseIds = new Set(corpus.cases.map((caseRecord) => caseRecord.id));
  const uniqueCaseIds = new Set(approval.caseIds);
  const approved =
    approval.schema ===
      "taxsorted.uk.case-commons-publication-approval/1" &&
    approval.status === "approved-for-publication" &&
    /^\d{4}-\d{2}-\d{2}$/.test(approval.decisionRecordedOn) &&
    approval.corpusVersion === corpus.meta.version &&
    approval.corpusDigest === corpusDigest &&
    approval.caseIds.length > 0 &&
    uniqueCaseIds.size === approval.caseIds.length &&
    approval.caseIds.every((caseId) => knownCaseIds.has(caseId));
  return {
    approved,
    corpusDigest,
    approvedCaseIds: approved ? approval.caseIds : [],
  };
}

const staticEmergencyStop = false;
const publicationDecision = evaluateUkCaseStaticPublication(
  caseCommonsJson,
  publicationApprovalJson,
);

export const ukCaseStaticPublication = {
  ...publicationApprovalJson,
  exactCorpusApproved: publicationDecision.approved,
  computedCorpusDigest: publicationDecision.corpusDigest,
  emergencyStop: staticEmergencyStop,
} as const;

const publishedCaseIds = new Set<string>(
  ukCaseStaticPublication.exactCorpusApproved &&
    !ukCaseStaticPublication.emergencyStop
    ? publicationDecision.approvedCaseIds
    : [],
);

export function isUkCaseStaticallyPublished(caseId: string) {
  return publishedCaseIds.has(caseId);
}
