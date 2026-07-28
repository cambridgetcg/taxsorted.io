import { createHash } from "node:crypto";
import {
  TAX_DISPUTE_FRAMEWORK,
  buildTaxDisputeTrainingExamples,
  buildTaxDisputeWhyGraph,
  buildUkTaxDisputeInterpretation,
  type UkTaxDisputeInterpretation,
} from "@taxsorted/engine/uk/disputes";
import caseCommonsJson from "../../../research/uk/case-commons/data/uk-case-commons.json";
import interpretationPublicationApprovalJson from "../../../research/uk/case-commons/data/interpretation-publication-approval.json";
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

type InterpretationPublicationApproval = {
  schema: string;
  status: string;
  decisionRecordedOn: string | null;
  frameworkVersion: string;
  corpusVersion: string;
  releaseDigest: string | null;
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

function sha256Canonical(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(canonicalPublicationJson(value), "utf8")
    .digest("hex")}`;
}

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function sourceIdsIn(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(sourceIdsIn);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, nested]) =>
    key === "sourceIds" && Array.isArray(nested)
      ? nested.map(String)
      : sourceIdsIn(nested),
  );
}

type InterpretationPublicationCorpus = typeof caseCommonsJson;

type DerivedReleaseCase = {
  caseId: string;
  packetDigest: string;
  adapter: string;
  interpretationDigest: string;
  whyGraphDigest: string;
  trainingExampleDigests: string[];
};

type DerivedReleaseResources = {
  preimage: {
    schema: "taxsorted.uk.tax-dispute-derived-release/1";
    frameworkVersion: string;
    corpusVersion: string;
    lawAsAt: string;
    cases: DerivedReleaseCase[];
  };
  interpretations: Map<string, UkTaxDisputeInterpretation>;
};

function buildUkTaxDisputeDerivedRelease(
  corpus: InterpretationPublicationCorpus,
  caseIds: readonly string[],
): DerivedReleaseResources {
  const interpretations = new Map<string, UkTaxDisputeInterpretation>();
  const cases = [...caseIds].sort(compareAscii).map((caseId) => {
    const caseRecord = corpus.cases.find((candidate) => candidate.id === caseId);
    if (!caseRecord) {
      throw new Error(`Unknown tax-dispute interpretation case ${caseId}`);
    }
    const wantedSourceIds = new Set(
      sourceIdsIn({
        protocol: corpus.protocol,
        case: caseRecord,
      }),
    );
    const packetPreimage = {
      schema: "taxsorted.uk.case-packet/1" as const,
      corpusVersion: corpus.meta.version,
      lawAsAt: corpus.meta.lawAsAt,
      jurisdiction: corpus.meta.jurisdiction,
      warning: corpus.meta.warning,
      protocol: corpus.protocol,
      case: caseRecord,
      sources: corpus.sources.filter((source) => wantedSourceIds.has(source.id)),
    };
    const packetDigest = sha256Canonical(packetPreimage);
    const interpretation = buildUkTaxDisputeInterpretation({
      caseRecord,
      corpusVersion: corpus.meta.version,
      lawAsAt: corpus.meta.lawAsAt,
      sourcePacket: {
        schema: packetPreimage.schema,
        digest: packetDigest,
      },
    });
    const whyGraph = buildTaxDisputeWhyGraph(interpretation);
    const trainingExamples = buildTaxDisputeTrainingExamples(interpretation);
    interpretations.set(caseId, interpretation);
    return {
      caseId,
      packetDigest,
      adapter: interpretation.review.adapter,
      interpretationDigest: sha256Canonical(interpretation),
      whyGraphDigest: sha256Canonical(whyGraph),
      trainingExampleDigests: trainingExamples.map(sha256Canonical),
    };
  });
  return {
    preimage: {
      schema: "taxsorted.uk.tax-dispute-derived-release/1",
      frameworkVersion: TAX_DISPUTE_FRAMEWORK.version,
      corpusVersion: corpus.meta.version,
      lawAsAt: corpus.meta.lawAsAt,
      cases,
    },
    interpretations,
  };
}

export function evaluateUkTaxDisputeInterpretationStaticPublication(
  corpus: InterpretationPublicationCorpus,
  approval: InterpretationPublicationApproval,
  basePublishedCaseIds: readonly string[],
) {
  const knownCaseIds = new Set(corpus.cases.map((caseRecord) => caseRecord.id));
  const basePublishedIds = new Set(basePublishedCaseIds);
  const uniqueCaseIds = new Set(approval.caseIds);
  const releaseReady =
    approval.schema ===
      "taxsorted.uk.tax-dispute-interpretation-publication-approval/1" &&
    approval.status === "approved-for-publication" &&
    approval.decisionRecordedOn !== null &&
    isCalendarDate(approval.decisionRecordedOn) &&
    approval.frameworkVersion === TAX_DISPUTE_FRAMEWORK.version &&
    approval.corpusVersion === corpus.meta.version &&
    approval.releaseDigest !== null &&
    /^sha256:[0-9a-f]{64}$/.test(approval.releaseDigest) &&
    approval.caseIds.length > 0 &&
    uniqueCaseIds.size === approval.caseIds.length &&
    approval.caseIds.every(
      (caseId) => knownCaseIds.has(caseId) && basePublishedIds.has(caseId),
    );

  // A pending or malformed decision must not build any engine-derived
  // artifacts. This keeps the default path both fail-closed and cheap.
  if (!releaseReady) {
    return {
      approved: false,
      releaseDigest: null,
      approvedCaseIds: [] as string[],
      interpretations: new Map<string, UkTaxDisputeInterpretation>(),
    };
  }

  try {
    const release = buildUkTaxDisputeDerivedRelease(corpus, approval.caseIds);
    const releaseDigest = sha256Canonical(release.preimage);
    const preimageCaseIds = release.preimage.cases.map((entry) => entry.caseId);
    const approvalCaseIds = [...approval.caseIds].sort(compareAscii);
    const exactCaseIds =
      preimageCaseIds.length === approvalCaseIds.length &&
      preimageCaseIds.every(
        (caseId, index) => caseId === approvalCaseIds[index],
      );
    const approved = exactCaseIds && approval.releaseDigest === releaseDigest;
    return {
      approved,
      releaseDigest,
      approvedCaseIds: approved ? preimageCaseIds : [],
      interpretations: approved
        ? release.interpretations
        : new Map<string, UkTaxDisputeInterpretation>(),
    };
  } catch {
    return {
      approved: false,
      releaseDigest: null,
      approvedCaseIds: [] as string[],
      interpretations: new Map<string, UkTaxDisputeInterpretation>(),
    };
  }
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

const interpretationPublicationDecision =
  evaluateUkTaxDisputeInterpretationStaticPublication(
    caseCommonsJson,
    interpretationPublicationApprovalJson,
    [...publishedCaseIds],
  );

export const ukTaxDisputeInterpretationStaticPublication = {
  ...interpretationPublicationApprovalJson,
  exactReleaseApproved: interpretationPublicationDecision.approved,
  computedReleaseDigest: interpretationPublicationDecision.releaseDigest,
  emergencyStop: staticEmergencyStop,
} as const;

const publishedInterpretationCaseIds = new Set<string>(
  ukTaxDisputeInterpretationStaticPublication.exactReleaseApproved &&
    !ukTaxDisputeInterpretationStaticPublication.emergencyStop
    ? interpretationPublicationDecision.approvedCaseIds
    : [],
);

export function isUkTaxDisputeInterpretationStaticallyPublished(
  caseId: string,
) {
  return publishedInterpretationCaseIds.has(caseId);
}

export function staticallyPublishedUkTaxDisputeInterpretation(caseId: string) {
  if (!isUkTaxDisputeInterpretationStaticallyPublished(caseId)) {
    return undefined;
  }
  return interpretationPublicationDecision.interpretations.get(caseId);
}
