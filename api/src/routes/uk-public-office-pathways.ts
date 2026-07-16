// Public, non-personal routes into elected office. This surface is separate
// from candidate and member records: it explains rules and support without
// collecting applicant facts or deciding whether any person is eligible.

import type { Context } from "hono";
import { Hono } from "hono";
import {
  findPublicOfficePath,
  publicOfficePathwayRights,
  publicOfficePathwaySourcesFor,
  publicOfficePathways,
  publicOfficePathwaysJsonSchema,
  publicOfficePathwaysResponseSchema,
} from "../uk-public-office-pathways.js";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { problemDetails } from "../problem-details.js";

const ROOT = "/v1/politics/uk/public-office-pathways";
const RIGHTS = `${ROOT}/rights`;
const SCHEMA = "taxsorted.uk.public-office-pathways/1";

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
    `<https://taxsorted.io/uk/politics/stand/>; rel="alternate"; type="text/html"`,
    `<${RIGHTS}>; rel="license"; type="application/json"`,
    `</v1/politics/uk/integrity/corrections>; rel="help"; type="application/json"`,
  ];
  c.header("Link", links.join(", "));
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  return c.body(body);
}

function officeSummary(office: (typeof publicOfficePathways.officePaths)[number]) {
  return {
    id: office.id,
    name: office.identity.name,
    officeType: office.identity.officeType,
    jurisdiction: office.identity.jurisdiction,
    contestGeography: office.identity.contestGeography,
    electoralSystem: office.identity.electoralSystem,
    coverageStatus: office.coverageStatus,
    summary: office.summary,
    routeKinds: office.routes.map((route) => route.kind),
    currentLawAsAt: office.currentLawAsAt,
    sourceIds: office.sourceIds,
    detail: `${ROOT}/offices/${office.id}`,
  };
}

export function createUkPublicOfficePathwayRoutes() {
  const routes = new Hono();

  routes.get("/public-office-pathways", (c) =>
    deterministicJson(
      c,
      publicOfficePathwaysResponseSchema.parse({
        ...publicOfficePathways,
        availability: {
          status: "open",
          normalPublicationGates: "independent",
          emergencyStop: "politics-bulk-data-emergency-stop",
          methods: ["GET", "HEAD"],
          writes: false,
        },
        links: {
          self: ROOT,
          offices: `${ROOT}/offices`,
          support: `${ROOT}/support`,
          schema: `${ROOT}/schema`,
          humanGuide: "https://taxsorted.io/uk/politics/stand/",
          openApi: "/openapi/politics-uk.json",
          rights: RIGHTS,
          corrections: "/v1/politics/uk/integrity/corrections",
        },
      }),
      ROOT,
      { describedByRootSchema: true },
    ),
  );

  routes.get("/public-office-pathways/offices", (c) =>
    deterministicJson(
      c,
      {
        schema: SCHEMA,
        meta: publicOfficePathways.meta,
        comparisonRules: publicOfficePathways.meta.editorialRules,
        offices: publicOfficePathways.officePaths.map(officeSummary),
        sources: publicOfficePathways.sources,
      },
      `${ROOT}/offices`,
    ),
  );

  routes.get("/public-office-pathways/offices/:officeId", (c) => {
    const office = findPublicOfficePath(c.req.param("officeId"));
    if (!office) {
      const detail =
        "No deeply mapped public-office pathway has that stable office ID.";
      return problemDetails(c, 404, {
        error: "public_office_pathway_not_found",
        detail,
        extensions: { message: detail },
        nextActions: [
          {
            method: "GET",
            href: `${ROOT}/offices`,
            description: "List the public-office pathways in this release.",
          },
        ],
      });
    }
    return deterministicJson(
      c,
      {
        schema: SCHEMA,
        meta: publicOfficePathways.meta,
        office,
        sources: publicOfficePathwaySourcesFor(office.id),
      },
      `${ROOT}/offices/${office.id}`,
    );
  });

  routes.get("/public-office-pathways/support", (c) =>
    deterministicJson(
      c,
      {
        schema: SCHEMA,
        meta: publicOfficePathways.meta,
        selectionRule:
          "These are sourced official and public-interest routes, not a ranking, endorsement or complete market list. Check each provider's current audience and access terms.",
        barriers: publicOfficePathways.barriers,
        supportRoutes: publicOfficePathways.supportRoutes,
        sources: publicOfficePathways.sources,
      },
      `${ROOT}/support`,
    ),
  );

  routes.get("/public-office-pathways/rights", (c) =>
    deterministicJson(c, publicOfficePathwayRights, RIGHTS, {
      schemaVersion: "taxsorted.uk.public-office-pathways-rights/1",
    }),
  );

  routes.get("/public-office-pathways/schema", (c) =>
    deterministicJson(
      c,
      publicOfficePathwaysJsonSchema,
      `${ROOT}/schema`,
      { contentType: "application/schema+json; charset=UTF-8" },
    ),
  );

  return routes;
}
