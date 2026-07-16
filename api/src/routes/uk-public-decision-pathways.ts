// Public, non-personal routes into a public decision. This surface explains
// institutional power and lawful participation without collecting a political
// view, selecting a campaign tactic, or sending anything for the caller.

import type { Context } from "hono";
import { Hono } from "hono";
import {
  findPublicDecisionPath,
  publicDecisionPathwayRelatedData,
  publicDecisionPathwayRights,
  publicDecisionPathwaySourcesFor,
  publicDecisionPathways,
  publicDecisionPathwaysJsonSchema,
  publicDecisionPathwaysResponseSchema,
} from "../uk-public-decision-pathways.js";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { problemDetails } from "../problem-details.js";

const ROOT = "/v1/politics/uk/public-decision-pathways";
const RIGHTS = `${ROOT}/rights`;
const SCHEMA = "taxsorted.uk.public-decision-pathways/1";

type DeterministicJsonOptions = {
  contentType?: string;
  describedByRootSchema?: boolean;
  schemaVersion?: string;
};

function deterministicJson(
  c: Context,
  value: unknown,
  contentLocation: string,
  options: DeterministicJsonOptions = {},
) {
  const contentType = options.contentType ?? "application/json; charset=UTF-8";
  const body = canonicalJson(value);
  const etag = representationEtag(body);
  c.header("Cache-Control", "public, max-age=3600, must-revalidate");
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", contentLocation);
  c.header("Content-Type", contentType);
  c.header("ETag", etag);
  c.header("Vary", "Accept");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Schema-Version", options.schemaVersion ?? SCHEMA);
  const links = [
    `<${contentLocation}>; rel="canonical"`,
    ...(options.describedByRootSchema
      ? [`<${ROOT}/schema>; rel="describedby"; type="application/schema+json"`]
      : []),
    `</openapi/politics-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
    `<https://taxsorted.io/uk/politics/decisions/>; rel="alternate"; type="text/html"`,
    `<${RIGHTS}>; rel="license"; type="application/json"`,
    `</v1/politics/uk/integrity/corrections>; rel="help"; type="application/json"`,
  ];
  c.header("Link", links.join(", "));
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  return c.body(body);
}

function decisionSummary(
  pathway: (typeof publicDecisionPathways.pathways)[number],
) {
  return {
    id: pathway.id,
    title: pathway.title,
    decisionKind: pathway.decisionKind,
    jurisdiction: pathway.jurisdiction,
    coverageStatus: pathway.coverageStatus,
    summary: pathway.summary,
    currentLawAsAt: pathway.currentLawAsAt,
    stageCount: pathway.stages.length,
    publicDoorIds: pathway.publicDoorIds,
    participantIds: pathway.participantIds,
    linkedOfficePaths: pathway.linkedOfficePaths,
    detail: `${ROOT}/decisions/${pathway.id}`,
  };
}

export function createUkPublicDecisionPathwayRoutes() {
  const routes = new Hono();

  routes.get("/public-decision-pathways", (c) =>
    deterministicJson(
      c,
      publicDecisionPathwaysResponseSchema.parse({
        ...publicDecisionPathways,
        availability: {
          status: "open",
          normalPublicationGates: "independent",
          emergencyStop: "politics-bulk-data-emergency-stop",
          methods: ["GET", "HEAD"],
          writes: false,
        },
        links: {
          self: ROOT,
          decisions: `${ROOT}/decisions`,
          doors: `${ROOT}/doors`,
          schema: `${ROOT}/schema`,
          humanGuide: "https://taxsorted.io/uk/politics/decisions/",
          openApi: "/openapi/politics-uk.json",
          rights: RIGHTS,
          corrections: "/v1/politics/uk/integrity/corrections",
        },
      }),
      ROOT,
      { describedByRootSchema: true },
    ),
  );

  routes.get("/public-decision-pathways/decisions", (c) =>
    deterministicJson(
      c,
      {
        schema: SCHEMA,
        meta: publicDecisionPathways.meta,
        routingRule:
          "Choose the exact outcome and territory before choosing a public door. A public-policy change, HMRC administration question, personal appeal and service complaint are different routes.",
        decisionIntents: publicDecisionPathways.decisionIntents,
        decisions: publicDecisionPathways.pathways.map(decisionSummary),
        personalRoutes: publicDecisionPathways.personalRoutes,
        officialHandoffs: publicDecisionPathways.officialHandoffs,
        coverageGaps: publicDecisionPathways.coverageGaps,
        sources: publicDecisionPathways.sources,
      },
      `${ROOT}/decisions`,
    ),
  );

  routes.get("/public-decision-pathways/decisions/:decisionId", (c) => {
    const pathway = findPublicDecisionPath(c.req.param("decisionId"));
    const related = publicDecisionPathwayRelatedData(
      c.req.param("decisionId"),
    );
    if (!pathway || !related) {
      const detail =
        "No deeply mapped public-decision pathway has that stable decision ID.";
      return problemDetails(c, 404, {
        error: "public_decision_pathway_not_found",
        detail,
        extensions: { message: detail },
        nextActions: [
          {
            method: "GET",
            href: `${ROOT}/decisions`,
            description:
              "List the public-decision pathways and bounded hand-offs in this release.",
          },
        ],
      });
    }
    const eventWindows = publicDecisionPathways.eventWindows.filter(
      (window) => window.pathwayId === pathway.id,
    );
    const eventSources = publicDecisionPathwaySourcesFor(eventWindows);
    const sources = Array.from(
      new Map(
        [...related.sources, ...eventSources].map((source) => [
          source.id,
          source,
        ]),
      ).values(),
    );
    return deterministicJson(
      c,
      {
        schema: SCHEMA,
        meta: publicDecisionPathways.meta,
        ...related,
        eventWindows,
        sources,
      },
      `${ROOT}/decisions/${pathway.id}`,
    );
  });

  routes.get("/public-decision-pathways/doors", (c) =>
    deterministicJson(
      c,
      {
        schema: SCHEMA,
        meta: publicDecisionPathways.meta,
        selectionRule:
          "Doors are listed by formal procedural effect, not estimated influence. TaxSorted does not rank a best route, send a message or record a choice.",
        publicDoors: publicDecisionPathways.publicDoors,
        eventWindows: publicDecisionPathways.eventWindows,
        sources: publicDecisionPathwaySourcesFor([
          publicDecisionPathways.publicDoors,
          publicDecisionPathways.eventWindows,
        ]),
      },
      `${ROOT}/doors`,
    ),
  );

  routes.get("/public-decision-pathways/rights", (c) =>
    deterministicJson(c, publicDecisionPathwayRights, RIGHTS, {
      schemaVersion: "taxsorted.uk.public-decision-pathways-rights/1",
    }),
  );

  routes.get("/public-decision-pathways/schema", (c) =>
    deterministicJson(
      c,
      publicDecisionPathwaysJsonSchema,
      `${ROOT}/schema`,
      { contentType: "application/schema+json; charset=UTF-8" },
    ),
  );

  return routes;
}
