// Public, sessionless UK tax-identity framework. It serves reviewed concepts
// and synthetic examples only, and has no endpoint for taxpayer facts.

import { Hono, type Context } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { problemDetails } from "../problem-details.js";
import {
  makeUkTaxIdentityExampleDetail,
  ukTaxIdentity,
  ukTaxIdentityArchetypesResponseSchema,
  ukTaxIdentityDimensionsResponseSchema,
  ukTaxIdentityExampleDetailSchema,
  ukTaxIdentityExamplesResponseSchema,
  ukTaxIdentityGapsResponseSchema,
  ukTaxIdentityJsonSchemaDocument,
  ukTaxIdentityOverlapsResponseSchema,
  ukTaxIdentityOverviewSchema,
  ukTaxIdentityRightsSchema,
  ukTaxIdentitySourcesResponseSchema,
  ukTaxIdentityTimelineResponseSchema,
  validateUkTaxIdentity,
  type ValidatedUkTaxIdentity,
} from "../uk-tax-identity.js";

export const taxIdentityBasePath = "/v1/tax-identity/uk";
export const taxIdentitySchemaPath = `${taxIdentityBasePath}/schema`;
export const taxIdentityOpenApiPath = "/openapi/tax-identity-uk.json";
export const taxIdentityHumanGuidePath = "/uk/tax-identity/";

const correctionsUrl =
  "https://github.com/cambridgetcg/taxsorted.io/issues";
const errorSchema = "taxsorted.uk.tax-identity-error/1";
const collectionSchema = "taxsorted.uk.tax-identity-collection/1";
const exampleDetailSchema =
  "taxsorted.uk.tax-identity-example-detail/1";

export const ukTaxIdentityRights = ukTaxIdentityRightsSchema.parse({
  schema: "taxsorted.uk.tax-identity-rights/1",
  status: "mixed-rights-read-before-reuse",
  curation: {
    name: "CC BY-SA 4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
    attribution: "TaxSorted (taxsorted.io)",
    appliesTo:
      "TaxSorted-written selection, structure, short summaries and method text where TaxSorted has rights to license them.",
  },
  sourceMaterial:
    "Linked legislation, manuals, standards, directives and guidance keep their publishers' copyright, database, contractual and attribution terms.",
  reuseRule:
    "Keep source IDs and limitations with reused statements, check the current official source, and never treat this curation licence as a blanket licence over upstream material.",
  corrections: {
    url: correctionsUrl,
    safety:
      "Use the public issue tracker only for non-personal factual corrections. Do not post names, tax identifiers, addresses, ownership records or private taxpayer facts.",
  },
  software: {
    name: "AGPL-3.0",
    source: "https://github.com/cambridgetcg/taxsorted.io",
  },
  boundaries: [
    "The corpus is educational public reference material, not legal advice or an authority determination.",
    "Source links identify the reviewed basis; they do not prove that a classification applies to a particular person, entity, tax, place or period.",
    "No endpoint accepts personal or organisation facts, makes a tax-identity decision, files anything or changes external state.",
  ],
});

export type UkTaxIdentityRouteOptions = {
  corpus?: unknown;
  emergencyStop?: boolean;
};

type StaticResource = {
  representation: string;
  etag: string;
  contentLocation: string;
  contentType: "application/json" | "application/schema+json";
  schemaVersion: string;
  corpusVersion: string;
  graphSchema: boolean;
};

function publicCorsHeaders(c: Context) {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  c.header(
    "Access-Control-Allow-Headers",
    "Accept, Content-Type, If-None-Match",
  );
  c.header(
    "Access-Control-Expose-Headers",
    [
      "ETag",
      "Link",
      "Content-Location",
      "X-Corpus-Version",
      "X-Corpus-Reviewed-On",
      "X-Schema-Version",
    ].join(", "),
  );
}

function queryParameters(c: Context) {
  return [...new Set(new URL(c.req.url).searchParams.keys())].sort();
}

function queryError(c: Context, parameters: string[], retryHref: string) {
  return problemDetails(c, 400, {
    error: "unknown_query_parameter",
    detail:
      "This static tax-identity resource does not use query parameters.",
    extensions: {
      schema: errorSchema,
      parameters,
      personalFactsAccepted: false,
      externalStateChanged: false,
    },
    nextActions: [
      {
        id: "retry-without-query",
        method: "GET",
        href: retryHref,
        accepts: ["application/json"],
        description:
          "Retry the same public resource without a query string.",
      },
    ],
  });
}

function notFoundError(c: Context) {
  return problemDetails(c, 404, {
    error: "tax_identity_resource_not_found",
    detail:
      "No reviewed UK tax-identity resource or synthetic example matches this path.",
    extensions: {
      schema: errorSchema,
      personalFactsAccepted: false,
      externalStateChanged: false,
    },
    nextActions: [
      {
        id: "list-framework-resources",
        method: "GET",
        href: taxIdentityBasePath,
        accepts: ["application/json"],
        description:
          "Read the overview and its stable route map.",
      },
      {
        id: "list-synthetic-examples",
        method: "GET",
        href: `${taxIdentityBasePath}/examples`,
        accepts: ["application/json"],
        description:
          "List the reviewed synthetic example IDs.",
      },
    ],
  });
}

function methodError(c: Context) {
  c.header("Allow", "GET, HEAD, OPTIONS");
  return problemDetails(c, 405, {
    error: "method_not_allowed",
    detail:
      "The UK tax-identity framework is read-only and has no fact intake, interpretation submission or filing route.",
    extensions: {
      schema: errorSchema,
      personalFactsAccepted: false,
      externalStateChanged: false,
      writes: false,
    },
    nextActions: [
      {
        id: "read-framework",
        method: "GET",
        href: taxIdentityBasePath,
        accepts: ["application/json"],
        description:
          "Read the public framework without creating or changing state.",
      },
    ],
  });
}

function emergencyStopError(c: Context) {
  return problemDetails(c, 503, {
    error: "tax_identity_emergency_stop",
    title: "Tax-identity publication emergency stop",
    detail:
      "The reviewed tax-identity content is temporarily unavailable. Its structural schema and rights statement remain readable.",
    extensions: {
      schema: errorSchema,
      available: false,
      emergencyStop: true,
      personalFactsAccepted: false,
      externalStateChanged: false,
      writes: false,
    },
    nextActions: [
      {
        id: "read-structural-schema",
        method: "GET",
        href: taxIdentitySchemaPath,
        accepts: ["application/schema+json"],
        description:
          "Read the stable structural contract without accessing framework content.",
      },
      {
        id: "read-rights",
        method: "GET",
        href: `${taxIdentityBasePath}/rights`,
        accepts: ["application/json"],
        description:
          "Read the rights, source-material and correction boundaries.",
      },
    ],
  });
}

function makeResource(
  value: unknown,
  contentLocation: string,
  schemaVersion: string,
  corpus: ValidatedUkTaxIdentity,
  options: {
    contentType?: StaticResource["contentType"];
    graphSchema?: boolean;
  } = {},
): StaticResource {
  const representation = canonicalJson(value);
  return {
    representation,
    etag: representationEtag(representation),
    contentLocation,
    contentType: options.contentType ?? "application/json",
    schemaVersion,
    corpusVersion: corpus.meta.version,
    graphSchema: options.graphSchema ?? false,
  };
}

function sendResource(
  c: Context,
  resource: StaticResource,
  reviewedOn: string,
) {
  const parameters = queryParameters(c);
  if (parameters.length) {
    return queryError(c, parameters, resource.contentLocation);
  }

  c.header("Cache-Control", "public, max-age=300, must-revalidate");
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", resource.contentLocation);
  c.header(
    "Content-Type",
    `${resource.contentType}; charset=utf-8`,
  );
  c.header("ETag", resource.etag);
  c.header("Vary", "Accept");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Corpus-Version", resource.corpusVersion);
  c.header("X-Corpus-Reviewed-On", reviewedOn);
  c.header("X-Schema-Version", resource.schemaVersion);
  c.header(
    "Link",
    [
      `<${resource.contentLocation}>; rel="canonical"; type="${resource.contentType}"`,
      ...(resource.graphSchema
        ? [
            `<${taxIdentitySchemaPath}>; rel="describedby"; type="application/schema+json"`,
          ]
        : resource.contentLocation === taxIdentitySchemaPath
          ? []
          : [
              `<${taxIdentitySchemaPath}>; rel="related"; type="application/schema+json"; title="Full corpus schema"`,
            ]),
      `<${taxIdentityBasePath}/rights>; rel="license"; type="application/json"`,
      `<${taxIdentityOpenApiPath}>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      `<${taxIdentityHumanGuidePath}>; rel="alternate"; type="text/html"`,
      `<${correctionsUrl}>; rel="help"; type="text/html"`,
      `</agent.txt>; rel="service"; type="text/plain"`,
    ].join(", "),
  );

  if (ifNoneMatchMatches(c.req.header("If-None-Match"), resource.etag)) {
    return c.body(null, 304);
  }
  if (c.req.method === "HEAD") return c.body(null, 200);
  return c.body(resource.representation, 200);
}

function collectionEnvelope(
  corpus: ValidatedUkTaxIdentity,
  collection: string,
  records: readonly unknown[],
) {
  return {
    schema: collectionSchema,
    corpusVersion: corpus.meta.version,
    warning: corpus.meta.warning,
    collection,
    count: records.length,
  };
}

export function createUkTaxIdentityRoutes(
  options: UkTaxIdentityRouteOptions = {},
) {
  const corpus = validateUkTaxIdentity(
    structuredClone(options.corpus ?? ukTaxIdentity),
  );
  const routes = {
    overview: taxIdentityBasePath,
    graph: `${taxIdentityBasePath}/graph`,
    dimensions: `${taxIdentityBasePath}/dimensions`,
    archetypes: `${taxIdentityBasePath}/archetypes`,
    overlaps: `${taxIdentityBasePath}/overlaps`,
    timeline: `${taxIdentityBasePath}/timeline`,
    examples: `${taxIdentityBasePath}/examples`,
    exampleTemplate: `${taxIdentityBasePath}/examples/{exampleId}`,
    sources: `${taxIdentityBasePath}/sources`,
    gaps: `${taxIdentityBasePath}/gaps`,
    schema: taxIdentitySchemaPath,
    rights: `${taxIdentityBasePath}/rights`,
    openApi: taxIdentityOpenApiPath,
    humanGuide: taxIdentityHumanGuidePath,
  };
  const overview = ukTaxIdentityOverviewSchema.parse({
    schema: "taxsorted.uk.tax-identity-overview/1",
    framework: "uk-tax-identity-framework",
    version: corpus.meta.version,
    reviewedOn: corpus.meta.reviewedOn,
    lawAsAt: corpus.meta.lawAsAt,
    jurisdiction: corpus.meta.jurisdiction,
    purpose: corpus.meta.purpose,
    portability: corpus.meta.portability,
    warning: corpus.meta.warning,
    access: {
      authentication: "none",
      methods: ["GET", "HEAD"],
      writeMethods: false,
      personalFactsAccepted: false,
      externalStateChanged: false,
    },
    counts: {
      sources: corpus.sources.length,
      dimensions: corpus.dimensions.length,
      archetypes: corpus.archetypes.length,
      overlaps: corpus.overlaps.length,
      milestones: corpus.milestones.length,
      exampleProfiles: corpus.exampleProfiles.length,
      gaps: corpus.gaps.length,
    },
    dimensionSummaries: corpus.dimensions.map((dimension) => ({
      id: dimension.id,
      label: dimension.label,
      question: dimension.question,
      cardinality: dimension.cardinality,
      classificationCount: dimension.classificationValues.length,
    })),
    archetypeSummaries: corpus.archetypes.map((archetype) => ({
      id: archetype.id,
      label: archetype.label,
      subjectKind: archetype.subjectKind,
      territory: archetype.territory,
      summary: archetype.summary,
    })),
    routes,
    boundaries: corpus.meta.boundaries,
  });

  const dimensions = ukTaxIdentityDimensionsResponseSchema.parse({
    ...collectionEnvelope(
      corpus,
      "dimensions",
      corpus.dimensions,
    ),
    dimensions: corpus.dimensions,
  });
  const archetypes = ukTaxIdentityArchetypesResponseSchema.parse({
    ...collectionEnvelope(
      corpus,
      "archetypes",
      corpus.archetypes,
    ),
    archetypes: corpus.archetypes,
  });
  const overlaps = ukTaxIdentityOverlapsResponseSchema.parse({
    ...collectionEnvelope(corpus, "overlaps", corpus.overlaps),
    overlaps: corpus.overlaps,
  });
  const timeline = ukTaxIdentityTimelineResponseSchema.parse({
    ...collectionEnvelope(
      corpus,
      "milestones",
      corpus.milestones,
    ),
    milestones: corpus.milestones,
  });
  const examples = ukTaxIdentityExamplesResponseSchema.parse({
    ...collectionEnvelope(
      corpus,
      "exampleProfiles",
      corpus.exampleProfiles,
    ),
    exampleProfiles: corpus.exampleProfiles,
  });
  const sources = ukTaxIdentitySourcesResponseSchema.parse({
    ...collectionEnvelope(corpus, "sources", corpus.sources),
    sources: corpus.sources,
  });
  const gaps = ukTaxIdentityGapsResponseSchema.parse({
    ...collectionEnvelope(corpus, "gaps", corpus.gaps),
    gaps: corpus.gaps,
  });

  const resources = new Map<string, StaticResource>([
    [
      "/",
      makeResource(
        overview,
        taxIdentityBasePath,
        overview.schema,
        corpus,
      ),
    ],
    [
      "/graph",
      makeResource(
        corpus,
        `${taxIdentityBasePath}/graph`,
        corpus.schema,
        corpus,
        { graphSchema: true },
      ),
    ],
    [
      "/dimensions",
      makeResource(
        dimensions,
        `${taxIdentityBasePath}/dimensions`,
        collectionSchema,
        corpus,
      ),
    ],
    [
      "/archetypes",
      makeResource(
        archetypes,
        `${taxIdentityBasePath}/archetypes`,
        collectionSchema,
        corpus,
      ),
    ],
    [
      "/overlaps",
      makeResource(
        overlaps,
        `${taxIdentityBasePath}/overlaps`,
        collectionSchema,
        corpus,
      ),
    ],
    [
      "/timeline",
      makeResource(
        timeline,
        `${taxIdentityBasePath}/timeline`,
        collectionSchema,
        corpus,
      ),
    ],
    [
      "/examples",
      makeResource(
        examples,
        `${taxIdentityBasePath}/examples`,
        collectionSchema,
        corpus,
      ),
    ],
    [
      "/sources",
      makeResource(
        sources,
        `${taxIdentityBasePath}/sources`,
        collectionSchema,
        corpus,
      ),
    ],
    [
      "/gaps",
      makeResource(
        gaps,
        `${taxIdentityBasePath}/gaps`,
        collectionSchema,
        corpus,
      ),
    ],
    [
      "/schema",
      makeResource(
        ukTaxIdentityJsonSchemaDocument,
        taxIdentitySchemaPath,
        corpus.schema,
        corpus,
        { contentType: "application/schema+json" },
      ),
    ],
    [
      "/rights",
      makeResource(
        ukTaxIdentityRights,
        `${taxIdentityBasePath}/rights`,
        ukTaxIdentityRights.schema,
        corpus,
      ),
    ],
  ]);

  const exampleResources = new Map(
    corpus.exampleProfiles.map((example) => {
      const detail = ukTaxIdentityExampleDetailSchema.parse(
        makeUkTaxIdentityExampleDetail(example.id, corpus),
      );
      return [
        example.id,
        makeResource(
          detail,
          `${taxIdentityBasePath}/examples/${example.id}`,
          exampleDetailSchema,
          corpus,
        ),
      ] as const;
    }),
  );

  const app = new Hono();
  app.use("*", async (c, next) => {
    publicCorsHeaders(c);
    await next();
  });
  app.options("*", (c) => {
    c.header("Allow", "GET, HEAD, OPTIONS");
    return c.body(null, 204);
  });

  for (const [relativePath, resource] of resources) {
    app.on(["GET", "HEAD"], relativePath, (c) => {
      if (
        options.emergencyStop === true &&
        relativePath !== "/schema" &&
        relativePath !== "/rights"
      ) {
        return emergencyStopError(c);
      }
      return sendResource(c, resource, corpus.meta.reviewedOn);
    });
  }

  app.on(["GET", "HEAD"], "/examples/:exampleId", (c) => {
    if (options.emergencyStop === true) return emergencyStopError(c);
    const parameters = queryParameters(c);
    if (parameters.length) {
      return queryError(
        c,
        parameters,
        `${taxIdentityBasePath}/examples/${c.req.param("exampleId")}`,
      );
    }
    const resource = exampleResources.get(c.req.param("exampleId"));
    if (!resource) return notFoundError(c);
    return sendResource(c, resource, corpus.meta.reviewedOn);
  });

  app.all("*", (c) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      return methodError(c);
    }
    return notFoundError(c);
  });
  return app;
}
