// Read-only, source-resolving case research. The route publishes no claimant
// intake, comments, professional bids, viability scores or private evidence.

import type { Context } from "hono";
import { Hono } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { problemDetails } from "../problem-details.js";
import {
  evaluateTaxDisputeInterpretationPublicationApproval,
  makeTaxDisputeDerivedRelease,
  makeTaxDisputeTrainingResources,
  taxDisputePublicationApprovalCanOpen,
  taxDisputeAgent,
  taxDisputeFramework,
  taxDisputeInterpretationJsonSchema,
  taxDisputeTrainingJsonSchema,
  ukTaxDisputeInterpretationPublicationApproval,
  type TaxDisputeInterpretationPublicationApproval,
} from "../uk-tax-dispute-interpretation.js";
import {
  caseAssessmentJsonSchema,
  caseAssessmentTemplate,
  caseCommonsJsonSchema,
  caseCommonsPacketJsonSchema,
  caseCommonsResponseSchema,
  caseCommonsRights,
  evaluateCaseCommonsPublicationApproval,
  makeCaseCommonsPacket,
  sourcesForCaseCommonsValue,
  ukCaseCommons,
  ukCaseCommonsPublicationApproval,
  ukCaseCommonsSchema,
  validateUkCaseCommons,
  type CaseCommonsPublicationApproval,
  type UkCaseCommons,
} from "../uk-case-commons.js";

const basePath = "/v1/case-commons/uk";
const schemaVersion = "taxsorted.uk.case-commons/1";
const humanGuide = "https://taxsorted.io/uk/cases/";

type CaseCommonsRouteOptions = {
  corpus?: UkCaseCommons;
  publicDataEnabled?: boolean;
  emergencyStop?: boolean;
  interpretationEmergencyStop?: boolean;
  stoppedCaseIds?: readonly string[];
  publicationApproval?: CaseCommonsPublicationApproval;
  interpretationPublicationApproval?: TaxDisputeInterpretationPublicationApproval;
};

type SendOptions = {
  contentType?: string;
  describedBy?: string | null;
  cacheControl?: string;
  schemaVersion?: string;
  headers?: Readonly<Record<string, string>>;
};

const protectedCacheControl = "public, max-age=0, must-revalidate";

function sendJson(
  c: Context,
  value: unknown,
  contentLocation: string,
  corpus: UkCaseCommons,
  options: SendOptions = {},
) {
  return sendRepresentation(
    c,
    canonicalJson(value),
    contentLocation,
    corpus,
    options,
  );
}

function sendRepresentation(
  c: Context,
  body: string,
  contentLocation: string,
  corpus: UkCaseCommons,
  options: SendOptions = {},
) {
  const etag = representationEtag(body);
  const contentType =
    options.contentType ?? "application/json; charset=UTF-8";
  c.header(
    "Cache-Control",
    options.cacheControl ?? "public, max-age=3600, must-revalidate",
  );
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", contentLocation);
  c.header("Content-Type", contentType);
  c.header("ETag", etag);
  c.header("Vary", "Accept");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Corpus-Version", corpus.meta.version);
  c.header("X-Corpus-Reviewed-On", corpus.meta.retrievedAt);
  c.header("X-Schema-Version", options.schemaVersion ?? schemaVersion);
  c.header("X-Checksum-SHA256", etag.slice('"sha256-'.length, -1));
  for (const [name, headerValue] of Object.entries(options.headers ?? {})) {
    c.header(name, headerValue);
  }
  const describedBy =
    options.describedBy === undefined
      ? `${basePath}/schema`
      : options.describedBy;
  c.header(
    "Link",
    [
      `<${contentLocation}>; rel="canonical"`,
      ...(describedBy
        ? [
            `<${describedBy}>; rel="describedby"; type="application/schema+json"`,
          ]
        : []),
      `<${basePath}/rights>; rel="license"; type="application/json"`,
      `</openapi/case-commons-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      `<${humanGuide}>; rel="alternate"; type="text/html"`,
      `<${corpus.publication.corrections}>; rel="help"; type="text/html"`,
    ].join(", "),
  );
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  return c.body(body);
}

function rejectQuery(c: Context) {
  const parameters = [
    ...new Set(new URL(c.req.url).searchParams.keys()),
  ].sort();
  if (!parameters.length) return undefined;
  const detail = "This case-commons resource does not use query parameters.";
  return problemDetails(c, 400, {
    error: "unknown_query_parameter",
    detail,
    extensions: {
      message: detail,
      parameters,
    },
    nextActions: [
      {
        method: "GET",
        href: c.req.path,
        description: "Retry the same public resource without a query string.",
      },
    ],
  });
}

function closedProblem(
  c: Context,
  corpus: UkCaseCommons,
  emergencyStop: boolean,
) {
  const error = emergencyStop
    ? "publication_emergency_stop"
    : "publication_review_pending";
  const detail = emergencyStop
    ? "The independent case-publication stop is active. The method, interpretation framework, agent guide, method-only source ledger, schemas and rights remain readable."
    : "The case packets are awaiting an explicit production-publication decision. The method, interpretation framework, agent guide, method-only source ledger, schemas and rights remain readable.";
  return problemDetails(c, 503, {
    error,
    detail,
    extensions: {
      message: detail,
      publicDataEnabled: false,
      emergencyStop,
    },
    nextActions: [
      {
        method: "GET",
        href: `${basePath}/method`,
        description: "Read the case method and its no-marketplace boundary.",
      },
      {
        method: "GET",
        href: `${basePath}/sources`,
        description: "Read the general method-only source ledger.",
      },
      {
        method: "GET",
        href: `${basePath}/interpretation`,
        description:
          "Read the case-independent interpretation framework.",
      },
    ],
  });
}

function caseLevelStopProblem(
  c: Context,
  stoppedCaseCount: number,
  requestedDetail = false,
) {
  const detail = requestedDetail
    ? "Case detail publication is unavailable while an independent case-level stop is active."
    : "Case publication is unavailable while an independent case-level stop is active.";
  return problemDetails(c, 503, {
    error: "case_publication_stop",
    detail,
    extensions: {
      message: detail,
      availability: "case-level-stops-active",
      stoppedCaseCount,
    },
    nextActions: [
      {
        method: "GET",
        href: `${basePath}/method`,
        description: "Read the general case method without stopped case facts.",
      },
      {
        method: "GET",
        href: `${basePath}/sources`,
        description: "Read only sources for the method and visible cases.",
      },
      {
        method: "GET",
        href: `${basePath}/interpretation`,
        description:
          "Read the case-independent interpretation framework.",
      },
    ],
  });
}

function interpretationPublicationProblem(
  c: Context,
  reason: string,
) {
  const detail =
    "Case-specific TaxSorted interpretation labels are awaiting an exact derived-release publication decision. The approved source packet and case-independent framework remain readable.";
  return problemDetails(c, 503, {
    error: "tax_dispute_interpretation_review_pending",
    detail,
    extensions: {
      message: detail,
      availability: "derived-release-review",
      reason,
    },
    nextActions: [
      {
        method: "GET",
        href: `${basePath}/interpretation`,
        description:
          "Read the case-independent twelve-dimension framework.",
      },
      {
        method: "GET",
        href: `${basePath}/cases`,
        description:
          "List source-packet cases that have their separate corpus approval.",
      },
      {
        method: "GET",
        href: `${basePath}/rights`,
        description: "Read source and curation reuse boundaries.",
      },
    ],
  });
}

function caseSummary(
  caseRecord: UkCaseCommons["cases"][number],
) {
  return {
    id: caseRecord.id,
    slug: caseRecord.slug,
    title: caseRecord.title,
    citation: caseRecord.citation,
    territory: caseRecord.territory,
    subject: caseRecord.subject,
    caseStatus: caseRecord.caseStatus,
    publicationStatus: caseRecord.publicationStatus,
    publicInterestQuestion: caseRecord.publicInterestQuestion,
    whyItMatters: caseRecord.whyItMatters,
    financialHeadline: caseRecord.financialEffect.headline,
    financialStatus: caseRecord.financialEffect.status,
    netRecoveryStatus: caseRecord.financialEffect.netRecovery.status,
    successProbabilityPublished:
      caseRecord.financialEffect.successProbabilityPublished,
    detail: `${basePath}/cases/${caseRecord.id}`,
    interpretation: `${basePath}/cases/${caseRecord.id}/interpretation`,
    whyGraph: `${basePath}/cases/${caseRecord.id}/why-graph`,
    human: `https://taxsorted.io/uk/cases/${caseRecord.slug}/`,
  };
}

export function createUkCaseCommonsRoutes(
  options: CaseCommonsRouteOptions = {},
) {
  const corpus = validateUkCaseCommons(
    ukCaseCommonsSchema.parse(
      structuredClone(options.corpus ?? ukCaseCommons),
    ),
  );
  const emergencyStop = options.emergencyStop ?? false;
  const publicationDecision = evaluateCaseCommonsPublicationApproval(
    corpus,
    options.publicationApproval ?? ukCaseCommonsPublicationApproval,
  );
  const publicDataEnabled =
    (options.publicDataEnabled ?? false) &&
    !emergencyStop &&
    publicationDecision.approved;
  const approvedCaseIds = new Set(publicationDecision.approvedCaseIds);
  const approvedCases = corpus.cases.filter((caseRecord) =>
    approvedCaseIds.has(caseRecord.id),
  );
  const configuredStopIds = [...new Set(options.stoppedCaseIds ?? [])];
  let stopConfigurationValid = true;
  const stoppedCaseIds = new Set<string>();
  for (const requestedId of configuredStopIds) {
    if (
      typeof requestedId !== "string" ||
      requestedId.length > 200 ||
      !/^[a-z0-9][a-z0-9-]*$/u.test(requestedId)
    ) {
      stopConfigurationValid = false;
      continue;
    }
    // The operator contract names the stable ID, not an alias. Requiring the
    // exact ID makes a typo close this surface instead of stopping some other
    // case by an accidentally matching slug.
    const stoppedCase = approvedCases.find(
      (caseRecord) => caseRecord.id === requestedId,
    );
    if (!stoppedCase) {
      stopConfigurationValid = false;
      continue;
    }
    stoppedCaseIds.add(stoppedCase.id);
  }
  const stoppedCaseCount = configuredStopIds.length;
  const caseLevelStopsActive = stoppedCaseCount > 0;
  // A malformed or stale operator value must never open a case by mistake.
  // It also must not throw while the main API module is mounting.
  const visibleCases = stopConfigurationValid
    ? approvedCases.filter(
        (caseRecord) => !stoppedCaseIds.has(caseRecord.id),
      )
    : [];
  const visibleSources = sourcesForCaseCommonsValue(
    { protocol: corpus.protocol, cases: visibleCases },
    corpus,
  );
  const app = new Hono();
  const interpretationPublicationApproval =
    options.interpretationPublicationApproval ??
    ukTaxDisputeInterpretationPublicationApproval;
  const interpretationEmergencyStop =
    options.interpretationEmergencyStop ?? false;
  const packets = new Map(
    approvedCases.map((caseRecord) => [
      caseRecord.id,
      makeCaseCommonsPacket(caseRecord.id, corpus)!,
    ]),
  );
  type PreparedDerivedRelease = ReturnType<
    typeof makeTaxDisputeDerivedRelease
  >;
  let preparedDerivedRelease: PreparedDerivedRelease | undefined;
  let derivedReleaseDecision:
    | {
        approved: true;
        reason: string;
        prepared: PreparedDerivedRelease;
      }
    | {
        approved: false;
        reason: string;
      }
    | undefined;
  let trainingResources:
    | ReturnType<typeof makeTaxDisputeTrainingResources>
    | undefined;
  const getDerivedReleaseDecision = () => {
    if (derivedReleaseDecision) return derivedReleaseDecision;
    if (interpretationEmergencyStop) {
      derivedReleaseDecision = {
        approved: false,
        reason: "derived-release-emergency-stop",
      };
      return derivedReleaseDecision;
    }
    const approvedCaseIdList = approvedCases.map(
      (caseRecord) => caseRecord.id,
    );
    if (
      !taxDisputePublicationApprovalCanOpen(
        interpretationPublicationApproval,
        corpus,
        approvedCaseIdList,
      )
    ) {
      derivedReleaseDecision = {
        approved: false,
        reason:
          interpretationPublicationApproval.status ===
          "pending-review"
            ? "derived-release-review-pending"
            : "derived-release-approval-precheck-failed",
      };
      return derivedReleaseDecision;
    }
    try {
      preparedDerivedRelease = makeTaxDisputeDerivedRelease(
        approvedCases,
        corpus,
      );
      const decision =
        evaluateTaxDisputeInterpretationPublicationApproval(
          preparedDerivedRelease.release,
          interpretationPublicationApproval,
        );
      if (!decision.approved) {
        derivedReleaseDecision = {
          approved: false,
          reason: decision.reason,
        };
        return derivedReleaseDecision;
      }
      derivedReleaseDecision = {
        approved: true,
        reason: decision.reason,
        prepared: preparedDerivedRelease,
      };
      return derivedReleaseDecision;
    } catch {
      // A bad or missing adapter closes only these derived resources. It must
      // never prevent the API, source packets or generic framework booting.
      derivedReleaseDecision = {
        approved: false,
        reason: "derived-release-build-failed",
      };
      return derivedReleaseDecision;
    }
  };
  const getTrainingResources = () => {
    if (trainingResources) return trainingResources;
    const decision = getDerivedReleaseDecision();
    if (!decision.approved) return undefined;
    try {
      trainingResources = makeTaxDisputeTrainingResources(
        approvedCases,
        corpus,
        decision.prepared,
      );
      return trainingResources;
    } catch {
      derivedReleaseDecision = {
        approved: false,
        reason: "derived-training-build-failed",
      };
      return undefined;
    }
  };
  const findVisibleCase = (caseIdOrSlug: string) =>
    visibleCases.find(
      (candidate) =>
        candidate.id === caseIdOrSlug ||
        candidate.slug === caseIdOrSlug,
    );
  const missingCase = (c: Context) => {
    if (caseLevelStopsActive) {
      return caseLevelStopProblem(c, stoppedCaseCount, true);
    }
    const detail =
      "No admitted decided case has that stable case ID or slug.";
    return problemDetails(c, 404, {
      error: "case_not_found",
      detail,
      extensions: { message: detail },
      nextActions: [
        {
          method: "GET",
          href: `${basePath}/cases`,
          description: "List admitted case IDs and their financial status.",
        },
      ],
    });
  };

  app.use("*", async (c, next) => {
    const relativePath = c.req.path.startsWith(basePath)
      ? c.req.path.slice(basePath.length)
      : c.req.path;
    const path = relativePath.replace(/\/+$/, "") || "/";
    const protectedTrainingPath =
      path === "/training" ||
      path === "/training/examples" ||
      path === "/training/examples.ndjson";
    const protectedInterpretationPath =
      /^\/cases\/[^/]+\/(?:interpretation|why-graph)$/u.test(
        path,
      );
    const protectedDerivedPath =
      protectedTrainingPath || protectedInterpretationPath;
    const protectedPath =
      path === "/" ||
      path === "/cases" ||
      path.startsWith("/cases/") ||
      protectedTrainingPath;
    if (!publicDataEnabled && protectedPath) {
      return closedProblem(c, corpus, emergencyStop);
    }
    if (
      publicDataEnabled &&
      !stopConfigurationValid &&
      protectedPath
    ) {
      return caseLevelStopProblem(
        c,
        stoppedCaseCount,
        path.startsWith("/cases/"),
      );
    }
    if (
      publicDataEnabled &&
      visibleCases.length === 0 &&
      protectedPath
    ) {
      return caseLevelStopProblem(
        c,
        stoppedCaseCount,
        path.startsWith("/cases/"),
      );
    }
    if (
      publicDataEnabled &&
      protectedTrainingPath &&
      caseLevelStopsActive
    ) {
      return caseLevelStopProblem(c, stoppedCaseCount);
    }
    if (publicDataEnabled && protectedDerivedPath) {
      const decision = getDerivedReleaseDecision();
      if (!decision.approved) {
        return interpretationPublicationProblem(c, decision.reason);
      }
    }
    await next();
  });

  app.get("/", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      caseCommonsResponseSchema.parse({
        ...corpus,
        sources: visibleSources,
        cases: visibleCases,
        availability: {
          status: caseLevelStopsActive
            ? "case-level-stops-active"
            : "open",
          methods: ["GET", "HEAD"],
          writes: false,
          emergencyStop: "UK_CASE_COMMONS_EMERGENCY_STOP",
          stoppedCaseCount,
        },
        links: {
          self: basePath,
          cases: `${basePath}/cases`,
          caseTemplate: `${basePath}/cases/{caseId}`,
          interpretation: `${basePath}/interpretation`,
          interpretationSchema: `${basePath}/interpretation/schema`,
          agent: `${basePath}/agent`,
          caseInterpretationTemplate:
            `${basePath}/cases/{caseId}/interpretation`,
          caseWhyGraphTemplate:
            `${basePath}/cases/{caseId}/why-graph`,
          training: `${basePath}/training`,
          trainingExamples: `${basePath}/training/examples`,
          trainingExamplesNdjson:
            `${basePath}/training/examples.ndjson`,
          trainingSchema: `${basePath}/training/schema`,
          schema: `${basePath}/schema`,
          packetSchema: `${basePath}/packet-schema`,
          assessmentTemplate: `${basePath}/assessment-template`,
          assessmentSchema: `${basePath}/assessment-schema`,
          sources: `${basePath}/sources`,
          rights: `${basePath}/rights`,
          humanGuide,
          corrections: corpus.publication.corrections,
          openApi: "/openapi/case-commons-uk.json",
        },
      }),
      basePath,
      corpus,
      { cacheControl: protectedCacheControl },
    );
  });

  app.get("/method", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      {
        schema: corpus.schema,
        meta: corpus.meta,
        publication: corpus.publication,
        protocol: corpus.protocol,
        routes: {
          cases: `${basePath}/cases`,
          sources: `${basePath}/sources`,
          interpretation: `${basePath}/interpretation`,
          agent: `${basePath}/agent`,
          training: `${basePath}/training`,
          assessmentTemplate: `${basePath}/assessment-template`,
          rights: `${basePath}/rights`,
        },
      },
      `${basePath}/method`,
      corpus,
      { describedBy: null },
    );
  });

  app.get("/cases", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      {
        schema: corpus.schema,
        version: corpus.meta.version,
        warning: corpus.meta.warning,
        availability: caseLevelStopsActive
          ? "case-level-stops-active"
          : "open",
        stoppedCaseCount,
        cases: visibleCases.map(caseSummary),
      },
      `${basePath}/cases`,
      corpus,
      { describedBy: null, cacheControl: protectedCacheControl },
    );
  });

  app.get("/cases/:caseId", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    const requestedCaseId = c.req.param("caseId");
    const caseRecord = findVisibleCase(requestedCaseId);
    // When any case is stopped, the shared generic response avoids confirming
    // whether a caller-supplied ID or alias resolves to the hidden case.
    if (!caseRecord) return missingCase(c);
    const packet = packets.get(caseRecord.id)!;
    return sendJson(
      c,
      packet,
      `${basePath}/cases/${caseRecord.id}`,
      corpus,
      {
        describedBy: `${basePath}/packet-schema`,
        cacheControl: protectedCacheControl,
      },
    );
  });

  app.get("/interpretation", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      taxDisputeFramework,
      `${basePath}/interpretation`,
      corpus,
      {
        describedBy: null,
        schemaVersion: "taxsorted.uk.tax-dispute-framework/1",
      },
    );
  });

  app.get("/interpretation/schema", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      taxDisputeInterpretationJsonSchema,
      `${basePath}/interpretation/schema`,
      corpus,
      {
        contentType: "application/schema+json; charset=UTF-8",
        describedBy: null,
        schemaVersion: "taxsorted.uk.tax-dispute-interpretation/1",
      },
    );
  });

  app.get("/agent", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      taxDisputeAgent,
      `${basePath}/agent`,
      corpus,
      {
        describedBy: null,
        schemaVersion: "taxsorted.uk.tax-dispute-agent/1",
      },
    );
  });

  app.get("/cases/:caseId/interpretation", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    const requestedCaseId = c.req.param("caseId");
    const caseRecord = findVisibleCase(requestedCaseId);
    if (!caseRecord) return missingCase(c);
    const decision = getDerivedReleaseDecision();
    if (!decision.approved) {
      return interpretationPublicationProblem(c, decision.reason);
    }
    const interpretation = decision.prepared.resources.find(
      (resource) => resource.caseRecord.id === caseRecord.id,
    )?.interpretation;
    if (!interpretation) {
      return interpretationPublicationProblem(
        c,
        "approved-case-missing-from-derived-release",
      );
    }
    return sendJson(
      c,
      interpretation,
      `${basePath}/cases/${caseRecord.id}/interpretation`,
      corpus,
      {
        describedBy: `${basePath}/interpretation/schema`,
        cacheControl: protectedCacheControl,
        schemaVersion: "taxsorted.uk.tax-dispute-interpretation/1",
      },
    );
  });

  app.get("/cases/:caseId/why-graph", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    const requestedCaseId = c.req.param("caseId");
    const caseRecord = findVisibleCase(requestedCaseId);
    if (!caseRecord) return missingCase(c);
    const decision = getDerivedReleaseDecision();
    if (!decision.approved) {
      return interpretationPublicationProblem(c, decision.reason);
    }
    const whyGraph = decision.prepared.resources.find(
      (resource) => resource.caseRecord.id === caseRecord.id,
    )?.whyGraph;
    if (!whyGraph) {
      return interpretationPublicationProblem(
        c,
        "approved-case-missing-from-derived-release",
      );
    }
    return sendJson(
      c,
      whyGraph,
      `${basePath}/cases/${caseRecord.id}/why-graph`,
      corpus,
      {
        describedBy: "/v1/why-graph/schema",
        cacheControl: protectedCacheControl,
        schemaVersion: "taxsorted.why-graph/1",
        headers: {
          "X-TaxSorted-Why-Graph-Adopter":
            "uk.case-commons.tax-dispute",
        },
      },
    );
  });

  app.get("/training", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    const resources = getTrainingResources();
    if (!resources) {
      const decision = getDerivedReleaseDecision();
      return interpretationPublicationProblem(c, decision.reason);
    }
    return sendJson(
      c,
      resources.manifest,
      `${basePath}/training`,
      corpus,
      {
        describedBy: null,
        cacheControl: protectedCacheControl,
        schemaVersion: "taxsorted.uk.tax-dispute-training/1",
      },
    );
  });

  app.get("/training/examples", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    const resources = getTrainingResources();
    if (!resources) {
      const decision = getDerivedReleaseDecision();
      return interpretationPublicationProblem(c, decision.reason);
    }
    return sendJson(
      c,
      resources.bundle,
      `${basePath}/training/examples`,
      corpus,
      {
        describedBy: null,
        cacheControl: protectedCacheControl,
        schemaVersion: "taxsorted.uk.tax-dispute-training-bundle/1",
        headers: {
          "X-Record-Count": String(
            resources.examples.length,
          ),
        },
      },
    );
  });

  app.get("/training/examples.ndjson", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    const resources = getTrainingResources();
    if (!resources) {
      const decision = getDerivedReleaseDecision();
      return interpretationPublicationProblem(c, decision.reason);
    }
    return sendRepresentation(
      c,
      resources.ndjson,
      `${basePath}/training/examples.ndjson`,
      corpus,
      {
        contentType: "application/x-ndjson; charset=UTF-8",
        describedBy: `${basePath}/training/schema`,
        cacheControl: protectedCacheControl,
        schemaVersion:
          "taxsorted.uk.tax-dispute-training-example/1",
        headers: {
          "Content-Disposition":
            `attachment; filename="${resources.filename}"`,
          "X-Record-Count": String(
            resources.examples.length,
          ),
        },
      },
    );
  });

  app.get("/training/schema", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      taxDisputeTrainingJsonSchema,
      `${basePath}/training/schema`,
      corpus,
      {
        contentType: "application/schema+json; charset=UTF-8",
        describedBy: null,
        schemaVersion:
          "taxsorted.uk.tax-dispute-training-example/1",
      },
    );
  });

  app.get("/sources", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    const sourcesForResponse =
      emergencyStop || !publicDataEnabled || !stopConfigurationValid
      ? sourcesForCaseCommonsValue(corpus.protocol, corpus)
      : visibleSources;
    const sourceScope = emergencyStop
      ? "method-only-during-emergency-stop"
      : !publicDataEnabled
        ? "method-only-during-publication-review"
        : !caseLevelStopsActive
          ? "complete-reviewed-ledger"
          : visibleCases.length === 0
            ? "method-only-during-case-level-stop"
            : "visible-case-and-method-ledger";
    return sendJson(
      c,
      {
        schema: corpus.schema,
        version: corpus.meta.version,
        scope: sourceScope,
        availability: emergencyStop
          ? "emergency-stopped"
          : !publicDataEnabled
            ? "publication-review"
            : caseLevelStopsActive
              ? "case-level-stops-active"
              : "open",
        stoppedCaseCount,
        sources: sourcesForResponse,
        sourceUseBoundary:
          "Official self-description supports only the claim named in supports. Read limitations and the source itself before reuse.",
      },
      `${basePath}/sources`,
      corpus,
      {
        describedBy: null,
        cacheControl: protectedCacheControl,
      },
    );
  });

  app.get("/assessment-template", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      caseAssessmentTemplate,
      `${basePath}/assessment-template`,
      corpus,
      { describedBy: `${basePath}/assessment-schema` },
    );
  });

  app.get("/rights", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      caseCommonsRights,
      `${basePath}/rights`,
      corpus,
      { describedBy: null },
    );
  });

  app.get("/schema", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      caseCommonsJsonSchema,
      `${basePath}/schema`,
      corpus,
      {
        contentType: "application/schema+json; charset=UTF-8",
        describedBy: null,
      },
    );
  });

  app.get("/packet-schema", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      caseCommonsPacketJsonSchema,
      `${basePath}/packet-schema`,
      corpus,
      {
        contentType: "application/schema+json; charset=UTF-8",
        describedBy: null,
      },
    );
  });

  app.get("/assessment-schema", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      caseAssessmentJsonSchema,
      `${basePath}/assessment-schema`,
      corpus,
      {
        contentType: "application/schema+json; charset=UTF-8",
        describedBy: null,
      },
    );
  });

  app.all("*", (c) => {
    const detail =
      "No read-only UK case-commons resource matches this path or method.";
    return problemDetails(c, 404, {
      error: "case_commons_route_not_found",
      detail,
      extensions: { message: detail },
      nextActions: [
        {
          method: "GET",
          href: basePath,
          description: "Read the case-commons overview.",
        },
      ],
    });
  });

  return app;
}
