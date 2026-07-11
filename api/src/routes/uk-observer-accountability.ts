// Public, sessionless doorway for the observer-accountability protocol. The
// framework has official source doors but intentionally contains no case or
// people records. The schema validates future candidates; it does not admit
// them for publication.

import { Hono, type Context } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { problemDetails } from "../problem-details.js";
import {
  ukObserverAccountabilityFramework,
  ukObserverAccountabilitySchemaDocument,
} from "../uk-observer-accountability.js";

const basePath = "/v1/accountability/uk";
const frameworkSchema = "taxsorted.uk.observer-accountability-framework/1";
const candidateSchema = "taxsorted.uk.observer-accountability-candidate/1";

function queryParameters(c: Context) {
  return [...new Set(new URL(c.req.url).searchParams.keys())].sort();
}

function queryError(
  c: Context,
  parameters: string[],
  retryHref: string,
  accepts: string[],
) {
  const detail = "This static accountability resource does not use query parameters.";
  return problemDetails(c, 400, {
    error: "unknown_query_parameter",
    detail,
    extensions: {
      schema: "taxsorted.observer-accountability-error/1",
      parameters,
      wallsIntact: true,
    },
    nextActions: [
      {
        id: "retry-without-query",
        method: "GET",
        href: retryHref,
        accepts,
        description: "Retry the same public resource without a query string.",
      },
    ],
  });
}

function methodError(c: Context, path: string, accepts: string[]) {
  c.header("Allow", "GET, HEAD, OPTIONS");
  return problemDetails(c, 405, {
    error: "method_not_allowed",
    detail: "The observer-accountability doorway is read-only.",
    extensions: {
      schema: "taxsorted.observer-accountability-error/1",
      wallsIntact: true,
    },
    nextActions: [
      {
        id: "read-resource",
        method: "GET",
        href: path,
        accepts,
        description: "Read the public resource without creating or changing state.",
      },
    ],
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
      contentLocation === basePath
        ? `<${basePath}/schema>; rel="related"; type="application/schema+json"; title="Candidate record schema"`
        : `<${basePath}>; rel="related"; type="application/json"; title="Observer-accountability framework"`,
      `</openapi/accountability-uk.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      `</agent.txt>; rel="service"; type="text/plain"`,
    ].join(", "),
  );

  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  if (c.req.method === "HEAD") return c.body(null, 200);
  return c.body(representation, 200);
}

export function createUkObserverAccountabilityRoutes() {
  const app = new Hono();
  const frameworkRepresentation = canonicalJson(
    ukObserverAccountabilityFramework,
  );
  const candidateSchemaRepresentation = canonicalJson(
    ukObserverAccountabilitySchemaDocument,
  );
  const frameworkEtag = representationEtag(frameworkRepresentation);
  const candidateSchemaEtag = representationEtag(candidateSchemaRepresentation);

  app.on(["GET", "HEAD"], "/", (c) =>
    send(
      c,
      frameworkRepresentation,
      frameworkEtag,
      basePath,
      "application/json",
      frameworkSchema,
    ),
  );
  app.on(["GET", "HEAD"], "/schema", (c) =>
    send(
      c,
      candidateSchemaRepresentation,
      candidateSchemaEtag,
      `${basePath}/schema`,
      "application/schema+json",
      candidateSchema,
    ),
  );

  app.all("/", (c) => methodError(c, basePath, ["application/json"]));
  app.all("/schema", (c) =>
    methodError(c, `${basePath}/schema`, ["application/schema+json"]),
  );
  return app;
}
