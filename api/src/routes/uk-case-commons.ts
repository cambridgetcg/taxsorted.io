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
  stoppedCaseIds?: readonly string[];
  publicationApproval?: CaseCommonsPublicationApproval;
};

type SendOptions = {
  contentType?: string;
  describedBy?: string | null;
  cacheControl?: string;
};

const protectedCacheControl = "public, max-age=0, must-revalidate";

function sendJson(
  c: Context,
  value: unknown,
  contentLocation: string,
  corpus: UkCaseCommons,
  options: SendOptions = {},
) {
  const body = canonicalJson(value);
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
  c.header("X-Schema-Version", schemaVersion);
  c.header("X-Checksum-SHA256", etag.slice('"sha256-'.length, -1));
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
    ? "The independent case-publication stop is active. The method, method-only source ledger, schemas and rights remain readable."
    : "The case packets are awaiting an explicit production-publication decision. The method, method-only source ledger, schemas and rights remain readable.";
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
  const packets = new Map(
    approvedCases.map((caseRecord) => [
      caseRecord.id,
      makeCaseCommonsPacket(caseRecord.id, corpus)!,
    ]),
  );

  app.use("*", async (c, next) => {
    const relativePath = c.req.path.startsWith(basePath)
      ? c.req.path.slice(basePath.length)
      : c.req.path;
    const path = relativePath.replace(/\/+$/, "") || "/";
    const protectedPath =
      path === "/" || path === "/cases" || path.startsWith("/cases/");
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
      (path === "/" || path === "/cases")
    ) {
      return caseLevelStopProblem(c, stoppedCaseCount);
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
    const caseRecord = visibleCases.find(
      (candidate) =>
        candidate.id === requestedCaseId ||
        candidate.slug === requestedCaseId,
    );
    if (!caseRecord) {
      // When any case is stopped, a generic response avoids confirming
      // whether a caller-supplied ID or alias resolves to the hidden case.
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
    }
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
