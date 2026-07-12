// Public, sessionless framework for traversable explanations. It publishes a
// contract and structural schema, never taxpayer facts or graph-ingestion APIs.

import { Hono, type Context } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { problemDetails } from "../problem-details.js";
import {
  whyGraphAdopters,
  whyGraphFramework,
  whyGraphJsonSchemaDocument,
} from "../why-graph.js";

export const whyGraphBasePath = "/v1/why-graph";
export const whyGraphSchemaPath = `${whyGraphBasePath}/schema`;
export const whyGraphAdoptersPath = `${whyGraphBasePath}/adopters`;
export const whyGraphOpenApiPath = "/openapi/why-graph.json";

function queryParameters(c: Context) {
  return [...new Set(new URL(c.req.url).searchParams.keys())].sort();
}

function queryError(
  c: Context,
  parameters: string[],
  retryHref: string,
  accepts: string[],
) {
  return problemDetails(c, 400, {
    error: "unknown_query_parameter",
    detail: "This static why-graph resource does not use query parameters.",
    extensions: {
      schema: "taxsorted.why-graph-error/1",
      parameters,
      graphCreated: false,
      externalStateChanged: false,
    },
    nextActions: [{
      id: "retry-without-query",
      method: "GET",
      href: retryHref,
      accepts,
      description: "Retry the same public resource without a query string.",
    }],
  });
}

function methodError(c: Context, path: string, accepts: string[]) {
  c.header("Allow", "GET, HEAD, OPTIONS");
  return problemDetails(c, 405, {
    error: "method_not_allowed",
    detail: "The why-graph framework is read-only and has no ingestion route.",
    extensions: {
      schema: "taxsorted.why-graph-error/1",
      graphCreated: false,
      externalStateChanged: false,
    },
    nextActions: [{
      id: "read-resource",
      method: "GET",
      href: path,
      accepts,
      description: "Read the public resource without creating or changing state.",
    }],
  });
}

function send(
  c: Context,
  representation: string,
  etag: string,
  contentLocation: string,
  contentType: string,
  schemaVersion: string,
) {
  const parameters = queryParameters(c);
  if (parameters.length) {
    return queryError(c, parameters, contentLocation, [contentType]);
  }

  c.header("Cache-Control", "public, max-age=300, must-revalidate");
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", contentLocation);
  c.header("Content-Type", `${contentType}; charset=utf-8`);
  c.header("ETag", etag);
  c.header("Vary", "Accept");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Schema-Version", schemaVersion);
  c.header(
    "Link",
    [
      `<${contentLocation}>; rel="canonical"; type="${contentType}"`,
      ...(contentLocation === whyGraphBasePath
        ? [`<${whyGraphSchemaPath}>; rel="describedby"; type="application/schema+json"; title="Why-graph structural schema"`]
        : [`<${whyGraphBasePath}>; rel="related"; type="application/json"; title="Why-graph framework"`]),
      ...(contentLocation === whyGraphAdoptersPath
        ? [`<${whyGraphSchemaPath}>; rel="describedby"; type="application/schema+json"; title="Why-graph structural schema"`]
        : [`<${whyGraphAdoptersPath}>; rel="related"; type="application/json"; title="Why-graph adopters"`]),
      `<${whyGraphOpenApiPath}>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      `</agent.txt>; rel="service"; type="text/plain"`,
    ].join(", "),
  );

  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  if (c.req.method === "HEAD") return c.body(null, 200);
  return c.body(representation, 200);
}

export function createWhyGraphRoutes() {
  const app = new Hono();
  const frameworkRepresentation = canonicalJson(whyGraphFramework);
  const adoptersRepresentation = canonicalJson(whyGraphAdopters);
  const schemaRepresentation = canonicalJson(whyGraphJsonSchemaDocument);
  const frameworkEtag = representationEtag(frameworkRepresentation);
  const adoptersEtag = representationEtag(adoptersRepresentation);
  const schemaEtag = representationEtag(schemaRepresentation);

  app.on(["GET", "HEAD"], "/", (c) =>
    send(
      c,
      frameworkRepresentation,
      frameworkEtag,
      whyGraphBasePath,
      "application/json",
      "taxsorted.why-graph-framework/1",
    ),
  );
  app.on(["GET", "HEAD"], "/schema", (c) =>
    send(
      c,
      schemaRepresentation,
      schemaEtag,
      whyGraphSchemaPath,
      "application/schema+json",
      "taxsorted.why-graph/1",
    ),
  );
  app.on(["GET", "HEAD"], "/adopters", (c) =>
    send(
      c,
      adoptersRepresentation,
      adoptersEtag,
      whyGraphAdoptersPath,
      "application/json",
      "taxsorted.why-graph-adopters/1",
    ),
  );

  app.all("/", (c) => methodError(c, whyGraphBasePath, ["application/json"]));
  app.all("/schema", (c) =>
    methodError(c, whyGraphSchemaPath, ["application/schema+json"]),
  );
  app.all("/adopters", (c) =>
    methodError(c, whyGraphAdoptersPath, ["application/json"]),
  );
  return app;
}
