// Public, read-only specialist-work research. Private assessments remain in
// the professional's own approved matter system and are never accepted here.

import type { Context } from "hono";
import { Hono } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { problemDetails } from "../problem-details.js";
import {
  evaluateProfessionalOpportunityPublicationApproval,
  makeProfessionalOpportunityPacket,
  professionalOpportunityAssessmentJsonSchema,
  professionalOpportunityAssessmentTemplate,
  professionalOpportunityCorpusJsonSchema,
  professionalOpportunityPacketJsonSchema,
  professionalOpportunityResponseSchema,
  professionalOpportunityRights,
  scrutinyForProfessionalOpportunityValue,
  sourcesForProfessionalOpportunityValue,
  ukProfessionalOpportunities,
  ukProfessionalOpportunityPublicationApproval,
  ukProfessionalOpportunityReviewPack,
  ukProfessionalOpportunitiesSchema,
  validateUkProfessionalOpportunities,
  type ProfessionalOpportunityPublicationApproval,
  type UkProfessionalOpportunities,
} from "../uk-professional-opportunities.js";
import type { ProfessionalOpportunityReviewPack } from "../uk-professional-opportunity-review.js";

const basePath = "/v1/professional-opportunities/uk";
const openApiPath = "/openapi/professional-opportunities-uk.json";
const humanGuide = "https://taxsorted.io/uk/opportunities/";
const protectedCacheControl = "public, max-age=0, must-revalidate";

export type ProfessionalOpportunityRouteOptions = {
  corpus?: UkProfessionalOpportunities;
  enabled?: boolean;
  emergencyStop?: boolean;
  stoppedOpportunityIds?: readonly string[];
  publicationApproval?: ProfessionalOpportunityPublicationApproval | null;
  reviewPack?: ProfessionalOpportunityReviewPack | null;
  now?: () => Date;
};

type SendOptions = {
  contentType?: string;
  describedBy?: string | null;
  cacheControl?: string;
  schemaVersion?: string;
};

function publicCorsHeaders(c: Context) {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, If-None-Match",
  );
  c.header(
    "Access-Control-Expose-Headers",
    [
      "ETag",
      "Link",
      "Content-Location",
      "X-Corpus-Version",
      "X-Corpus-Retrieved-On",
      "X-Schema-Version",
      "X-Checksum-SHA256",
    ].join(", "),
  );
}

function sendJson(
  c: Context,
  value: unknown,
  contentLocation: string,
  corpus: UkProfessionalOpportunities,
  options: SendOptions = {},
) {
  const body = canonicalJson(value);
  const etag = representationEtag(body);
  publicCorsHeaders(c);
  c.header(
    "Cache-Control",
    options.cacheControl ?? "public, max-age=3600, must-revalidate",
  );
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", contentLocation);
  c.header(
    "Content-Type",
    options.contentType ?? "application/json; charset=UTF-8",
  );
  c.header("ETag", etag);
  c.header("Vary", "Accept");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Corpus-Version", corpus.meta.version);
  c.header("X-Corpus-Retrieved-On", corpus.meta.retrievedAt);
  c.header(
    "X-Schema-Version",
    options.schemaVersion ?? corpus.schema,
  );
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
      `<${openApiPath}>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      `<${humanGuide}>; rel="alternate"; type="text/html"`,
      `<${corpus.publication.corrections}>; rel="help"; type="text/html"`,
    ].join(", "),
  );
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  if (c.req.method === "HEAD") return c.body(null, 200);
  return c.body(body, 200);
}

function rejectQuery(c: Context) {
  const parameters = [
    ...new Set(new URL(c.req.url).searchParams.keys()),
  ].sort();
  if (!parameters.length) return undefined;
  const detail =
    "This professional-opportunity resource does not use query parameters.";
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
  emergencyStop: boolean,
) {
  publicCorsHeaders(c);
  const error = emergencyStop
    ? "publication_emergency_stop"
    : "publication_review_pending";
  const detail = emergencyStop
    ? "The independent opportunity-publication stop is active. Schemas, rights and the blank local template remain readable."
    : "The opportunity atlas, method and source ledger await qualified review and an exact production-publication decision. Schemas, rights and the blank local template remain readable.";
  return problemDetails(c, 503, {
    error,
    detail,
    extensions: {
      message: detail,
      enabled: false,
      emergencyStop,
    },
    nextActions: [
      {
        method: "GET",
        href: `${basePath}/assessment-template`,
        description: "Download the blank local assessment contract.",
      },
      {
        method: "GET",
        href: `${basePath}/schema`,
        description: "Read the corpus structure without research claims.",
      },
    ],
  });
}

function recordStopProblem(
  c: Context,
  stoppedOpportunityCount: number,
  requestedDetail = false,
) {
  publicCorsHeaders(c);
  const detail = requestedDetail
    ? "Opportunity detail publication is unavailable while an independent record-level stop is active."
    : "Opportunity publication is unavailable while an independent record-level stop is active.";
  return problemDetails(c, 503, {
    error: "opportunity_publication_stop",
    detail,
    extensions: {
      message: detail,
      availability: "record-level-stops-active",
      stoppedOpportunityCount,
    },
    nextActions: [
      {
        method: "GET",
        href: `${basePath}/method`,
        description: "Read the general method without stopped record facts.",
      },
      {
        method: "GET",
        href: `${basePath}/sources`,
        description:
          "Read sources for the method and opportunities that remain visible.",
      },
    ],
  });
}

function opportunitySummary(
  opportunity: UkProfessionalOpportunities["opportunities"][number],
) {
  return {
    id: opportunity.id,
    slug: opportunity.slug,
    title: opportunity.title,
    taxArea: opportunity.taxArea,
    territories: opportunity.territories,
    publicationStatus: opportunity.publicationStatus,
    issuePatterns: opportunity.issuePatterns,
    whySpecialistJudgmentMatters:
      opportunity.whySpecialistJudgmentMatters,
    lawfulValueMechanisms: opportunity.lawfulValueMechanisms.map(
      ({ mechanism, valuePath, limit, sourceIds }) => ({
        mechanism,
        valuePath,
        limit,
        sourceIds,
      }),
    ),
    moneyModel: opportunity.moneyModel,
    sourceIds: opportunity.sourceIds,
    detail: `${basePath}/opportunities/${opportunity.id}`,
    human: `${humanGuide}${opportunity.slug}/`,
  };
}

export function createUkProfessionalOpportunityRoutes(
  options: ProfessionalOpportunityRouteOptions = {},
) {
  const corpus = validateUkProfessionalOpportunities(
    ukProfessionalOpportunitiesSchema.parse(
      structuredClone(options.corpus ?? ukProfessionalOpportunities),
    ),
  );
  const emergencyStop = options.emergencyStop ?? false;
  const approval =
    options.publicationApproval === undefined
      ? ukProfessionalOpportunityPublicationApproval
      : options.publicationApproval;
  const reviewPack =
    options.reviewPack === undefined
      ? ukProfessionalOpportunityReviewPack
      : options.reviewPack;
  const now = options.now ?? (() => new Date());
  const publicationDecision =
    evaluateProfessionalOpportunityPublicationApproval(
      corpus,
      approval,
      reviewPack,
      now().toISOString().slice(0, 10),
    );
  const enabled =
    (options.enabled ?? false) &&
    !emergencyStop &&
    publicationDecision.approved;
  const approvedIds = new Set(publicationDecision.approvedOpportunityIds);
  const approvedOpportunities = corpus.opportunities.filter((opportunity) =>
    approvedIds.has(opportunity.id),
  );

  const configuredStopIds = [
    ...new Set(options.stoppedOpportunityIds ?? []),
  ];
  const stoppedIds = new Set<string>();
  let stopConfigurationValid = true;
  for (const requestedId of configuredStopIds) {
    if (
      typeof requestedId !== "string" ||
      requestedId.length > 200 ||
      !/^[a-z0-9][a-z0-9-]*$/u.test(requestedId)
    ) {
      stopConfigurationValid = false;
      continue;
    }
    if (
      !approvedOpportunities.some(
        (opportunity) => opportunity.id === requestedId,
      )
    ) {
      stopConfigurationValid = false;
      continue;
    }
    stoppedIds.add(requestedId);
  }
  const stoppedOpportunityCount = configuredStopIds.length;
  const recordStopsActive = stoppedOpportunityCount > 0;
  const visibleOpportunities = stopConfigurationValid
    ? approvedOpportunities.filter(
        (opportunity) => !stoppedIds.has(opportunity.id),
      )
    : [];
  const visibleScrutiny = scrutinyForProfessionalOpportunityValue(
    { opportunities: visibleOpportunities },
    corpus,
  );
  const visibleSources = sourcesForProfessionalOpportunityValue(
    {
      method: corpus.method,
      sharedWorkflow: corpus.sharedWorkflow,
      scrutiny: visibleScrutiny,
      opportunities: visibleOpportunities,
    },
    corpus,
  );
  const visibleMeta = recordStopsActive
    ? {
        ...corpus.meta,
        coverage: visibleOpportunities.map(
          (opportunity) =>
            `${opportunity.taxArea} — ${opportunity.territories.join(", ")}`,
        ),
        recordCounts: {
          opportunities: visibleOpportunities.length,
          scrutiny: visibleScrutiny.length,
          sources: visibleSources.length,
        },
      }
    : corpus.meta;
  const {
    coverage: _recordCoverage,
    recordCounts: _recordCounts,
    ...methodMeta
  } = corpus.meta;
  const packets = new Map(
    approvedOpportunities.map((opportunity) => [
      opportunity.id,
      makeProfessionalOpportunityPacket(opportunity.id, corpus)!,
    ]),
  );

  const app = new Hono();

  app.use("*", async (c, next) => {
    publicCorsHeaders(c);
    if (c.req.method === "OPTIONS") {
      await next();
      return;
    }
    if (!["GET", "HEAD"].includes(c.req.method)) {
      await next();
      return;
    }
    const relativePath = c.req.path.startsWith(basePath)
      ? c.req.path.slice(basePath.length)
      : c.req.path;
    const path = relativePath.replace(/\/+$/, "") || "/";
    const protectedPath =
      path === "/" ||
      path === "/method" ||
      path === "/opportunities" ||
      path.startsWith("/opportunities/") ||
      path === "/scrutiny" ||
      path === "/sources";
    const reviewStillCurrent =
      enabled &&
      evaluateProfessionalOpportunityPublicationApproval(
        corpus,
        approval,
        reviewPack,
        now().toISOString().slice(0, 10),
      ).approved;
    if (!reviewStillCurrent && protectedPath) {
      return closedProblem(c, emergencyStop);
    }
    if (enabled && !stopConfigurationValid && protectedPath) {
      return recordStopProblem(
        c,
        stoppedOpportunityCount,
        path.startsWith("/opportunities/"),
      );
    }
    if (
      enabled &&
      visibleOpportunities.length === 0 &&
      protectedPath
    ) {
      return recordStopProblem(
        c,
        stoppedOpportunityCount,
        path.startsWith("/opportunities/"),
      );
    }
    await next();
  });

  app.options("*", (c) => {
    publicCorsHeaders(c);
    c.header("Allow", "GET, HEAD, OPTIONS");
    return c.body(null, 204);
  });

  app.on(["GET", "HEAD"], "/", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      professionalOpportunityResponseSchema.parse({
        ...corpus,
        meta: visibleMeta,
        sources: visibleSources,
        scrutiny: visibleScrutiny,
        opportunities: visibleOpportunities,
        availability: {
          status: recordStopsActive
            ? "record-level-stops-active"
            : "open",
          methods: ["GET", "HEAD"],
          writes: false,
          emergencyStop:
            "UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP",
          stoppedOpportunityCount,
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
          humanGuide,
          corrections: corpus.publication.corrections,
          openApi: openApiPath,
        },
      }),
      basePath,
      corpus,
      { cacheControl: protectedCacheControl },
    );
  });

  app.on(["GET", "HEAD"], "/method", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      {
        schema: corpus.schema,
        meta: methodMeta,
        publication: corpus.publication,
        method: corpus.method,
        sharedWorkflow: corpus.sharedWorkflow,
        routes: {
          opportunities: `${basePath}/opportunities`,
          scrutiny: `${basePath}/scrutiny`,
          sources: `${basePath}/sources`,
          assessmentTemplate: `${basePath}/assessment-template`,
          rights: `${basePath}/rights`,
        },
      },
      `${basePath}/method`,
      corpus,
      { describedBy: null, cacheControl: protectedCacheControl },
    );
  });

  app.on(["GET", "HEAD"], "/opportunities", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      {
        schema: corpus.schema,
        version: corpus.meta.version,
        warning: corpus.meta.warning,
        availability: recordStopsActive
          ? "record-level-stops-active"
          : "open",
        stoppedOpportunityCount,
        opportunities: visibleOpportunities.map(opportunitySummary),
      },
      `${basePath}/opportunities`,
      corpus,
      { describedBy: null, cacheControl: protectedCacheControl },
    );
  });

  app.on(["GET", "HEAD"], "/opportunities/:opportunityId", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    const requestedId = c.req.param("opportunityId");
    const opportunity = visibleOpportunities.find(
      (candidate) =>
        candidate.id === requestedId || candidate.slug === requestedId,
    );
    if (!opportunity) {
      if (recordStopsActive) {
        return recordStopProblem(c, stoppedOpportunityCount, true);
      }
      const detail =
        "No admitted professional opportunity has that stable ID or slug.";
      return problemDetails(c, 404, {
        error: "professional_opportunity_not_found",
        detail,
        extensions: { message: detail },
        nextActions: [
          {
            method: "GET",
            href: `${basePath}/opportunities`,
            description: "List admitted professional-opportunity IDs.",
          },
        ],
      });
    }
    return sendJson(
      c,
      packets.get(opportunity.id)!,
      `${basePath}/opportunities/${opportunity.id}`,
      corpus,
      {
        describedBy: `${basePath}/packet-schema`,
        cacheControl: protectedCacheControl,
        schemaVersion:
          "taxsorted.uk.professional-opportunity-packet/1",
      },
    );
  });

  app.on(["GET", "HEAD"], "/scrutiny", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      {
        schema: corpus.schema,
        version: corpus.meta.version,
        scope: recordStopsActive
          ? "visible-opportunity-scrutiny"
          : "complete-reviewed-scrutiny",
        availability: recordStopsActive
          ? "record-level-stops-active"
          : "open",
        stoppedOpportunityCount,
        scrutiny: visibleScrutiny,
      },
      `${basePath}/scrutiny`,
      corpus,
      { describedBy: null, cacheControl: protectedCacheControl },
    );
  });

  app.on(["GET", "HEAD"], "/sources", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      {
        schema: corpus.schema,
        version: corpus.meta.version,
        scope: recordStopsActive
          ? "visible-opportunity-and-method-ledger"
          : "complete-reviewed-ledger",
        availability: recordStopsActive
          ? "record-level-stops-active"
          : "open",
        stoppedOpportunityCount,
        sources: visibleSources,
        sourceUseBoundary:
          "Use each source only for the claimed use that points to its source ID. Read its notes and the official source itself before reuse.",
      },
      `${basePath}/sources`,
      corpus,
      { describedBy: null, cacheControl: protectedCacheControl },
    );
  });

  app.on(["GET", "HEAD"], "/assessment-template", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      professionalOpportunityAssessmentTemplate,
      `${basePath}/assessment-template`,
      corpus,
      {
        describedBy: `${basePath}/assessment-schema`,
        schemaVersion:
          "taxsorted.uk.professional-opportunity-assessment/1",
      },
    );
  });

  app.on(["GET", "HEAD"], "/rights", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      professionalOpportunityRights,
      `${basePath}/rights`,
      corpus,
      {
        describedBy: null,
        schemaVersion:
          "taxsorted.uk.professional-opportunities-rights/1",
      },
    );
  });

  app.on(["GET", "HEAD"], "/schema", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      professionalOpportunityCorpusJsonSchema,
      `${basePath}/schema`,
      corpus,
      {
        contentType: "application/schema+json; charset=UTF-8",
        describedBy: null,
        schemaVersion: "taxsorted.uk.professional-opportunities.v1",
      },
    );
  });

  app.on(["GET", "HEAD"], "/packet-schema", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      professionalOpportunityPacketJsonSchema,
      `${basePath}/packet-schema`,
      corpus,
      {
        contentType: "application/schema+json; charset=UTF-8",
        describedBy: null,
        schemaVersion:
          "taxsorted.uk.professional-opportunity-packet/1",
      },
    );
  });

  app.on(["GET", "HEAD"], "/assessment-schema", (c) => {
    const invalid = rejectQuery(c);
    if (invalid) return invalid;
    return sendJson(
      c,
      professionalOpportunityAssessmentJsonSchema,
      `${basePath}/assessment-schema`,
      corpus,
      {
        contentType: "application/schema+json; charset=UTF-8",
        describedBy: null,
        schemaVersion:
          "taxsorted.uk.professional-opportunity-assessment/1",
      },
    );
  });

  app.all("*", (c) => {
    publicCorsHeaders(c);
    c.header("Allow", "GET, HEAD, OPTIONS");
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const detail =
        "The UK professional-opportunity atlas is read-only.";
      return problemDetails(c, 405, {
        error: "method_not_allowed",
        detail,
        extensions: {
          message: detail,
          writes: false,
        },
        nextActions: [
          {
            method: "GET",
            href: basePath,
            description: "Read the public atlas without creating state.",
          },
        ],
      });
    }
    const detail =
      "No read-only UK professional-opportunity resource matches this path.";
    return problemDetails(c, 404, {
      error: "professional_opportunity_route_not_found",
      detail,
      extensions: { message: detail },
      nextActions: [
        {
          method: "GET",
          href: basePath,
          description: "Read the professional-opportunity overview.",
        },
      ],
    });
  });

  return app;
}
