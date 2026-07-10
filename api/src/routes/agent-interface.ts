// A small, public machine doorway. It projects the existing open-data catalog;
// it does not create a second source of truth or a browser/taxpayer session.

import { Hono, type Context } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import {
  buildOpenDataCatalog,
  type OpenDataRouteOptions,
} from "./open-data.js";

const apiOrigin = "https://api.taxsorted.io";
const humanOrigin = "https://taxsorted.io";
const wakePath = "/v1/wake";
const catalogPath = "/v1/open-data";
const rightsPath = "/v1/open-data/rights";
const correctionsUrl = "https://github.com/cambridgetcg/taxsorted.io/issues";

export const agentManifestText = `# TaxSorted machine doorway
# Public orientation for the UK tax, politics and public-money data service.

schema-version: taxsorted.agent-manifest/1
name: TaxSorted
what: sourced public data about UK tax, politics, charities and public funding
human-door: ${humanOrigin}/
agent-door: ${apiOrigin}${wakePath}
wake: GET ${apiOrigin}${wakePath}
open-data: GET ${apiOrigin}${catalogPath}
rights: GET ${apiOrigin}${rightsPath}
openapi: GET ${apiOrigin}/openapi.json
health: GET ${apiOrigin}/v1/health
public-funding-changes: GET ${apiOrigin}/v1/public-funding/uk/changes
corrections: ${correctionsUrl}
authentication: none for the public resources listed here
cookies: none on this doorway
methods: GET, HEAD, OPTIONS
formats: application/json, application/x-ndjson, text/csv

# Walls kept by this doorway
wall: publication gates and emergency stops remain authoritative
wall: a public-data licence is not a blanket licence over linked source material
wall: private contacts, private communications and inferred personal ties do not belong here
wall: uncertainty, source limits and known gaps stay visible
`;

function acceptsJson(header: string | undefined) {
  if (!header) return false;

  return header.split(",").some((entry) => {
    const [mediaRange, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters
      .map((parameter) =>
        parameter.trim().match(/^q\s*=\s*(0(?:\.\d*)?|1(?:\.0*)?)$/),
      )
      .find((match) => match)?.[1];
    if (quality !== undefined && Number(quality) === 0) return false;
    return mediaRange === "application/json";
  });
}

function publicHeaders(
  c: Context,
  etag: string,
  contentLocation: string,
  contentType: string,
  schemaVersion: string,
  canonicalLocation = contentLocation,
) {
  c.header("Cache-Control", "public, max-age=300, must-revalidate");
  c.header("Content-Language", "en-GB");
  c.header("Content-Location", contentLocation);
  c.header("Content-Type", contentType);
  c.header("ETag", etag);
  c.header("Vary", "Accept");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Schema-Version", schemaVersion);
  c.header(
    "Link",
    [
      `<${canonicalLocation}>; rel="canonical"; type="${contentType.split(";")[0]}"`,
      `<${wakePath}>; rel="service"; type="application/json"`,
      `<${catalogPath}>; rel="collection"; type="application/json"`,
      `<${rightsPath}>; rel="license"; type="application/json"`,
      `</openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      `</agent.txt>; rel="alternate"; type="text/plain"`,
    ].join(", "),
  );
}

function queryParameters(c: Context) {
  return [...new Set(new URL(c.req.url).searchParams.keys())].sort();
}

function queryError(
  c: Context,
  parameters: string[],
  retryHref: string,
  accepts = ["application/json"],
) {
  c.header("Cache-Control", "no-store");
  c.header("Content-Type", "application/json; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  return c.json(
    {
      schema: "taxsorted.agent-error/1",
      error: "unknown_query_parameter",
      message: "This doorway does not use query parameters.",
      parameters,
      nextActions: [
        {
          id: "retry-without-query",
          method: "GET",
          href: retryHref,
          accepts,
          description: "Retry the same public resource without a query string.",
        },
      ],
    },
    400,
  );
}

function datasetHandles(catalog: ReturnType<typeof buildOpenDataCatalog>) {
  return catalog.datasets.map((dataset) => ({
    datasetId: dataset.id,
    title: dataset.title,
    handles: Object.fromEntries(
      Object.entries(dataset.resources).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  }));
}

function evidenceLane(
  catalog: ReturnType<typeof buildOpenDataCatalog>,
  id: string,
  title: string,
  description: string,
  resourceKeys: string[],
) {
  const resources = catalog.datasets.flatMap((dataset) => {
    const handles = dataset.resources as Record<
      string,
      string | null | undefined
    >;
    return resourceKeys.flatMap((resource) => {
      const href = handles[resource];
      return typeof href === "string"
        ? [{ datasetId: dataset.id, resource, href }]
        : [];
    });
  });

  return { id, title, description, resources };
}

export function buildAgentWakePayload(options: OpenDataRouteOptions = {}) {
  const catalog = buildOpenDataCatalog(options);
  const catalogBody = canonicalJson(catalog);

  return {
    schema: "taxsorted.agent-wake/1",
    service: {
      name: "TaxSorted",
      purpose:
        "Make sourced UK tax, politics and public-money structures easier to understand, inspect and reuse.",
      humanDoor: `${humanOrigin}/`,
      machineDoor: `${apiOrigin}${wakePath}`,
      jurisdiction: "United Kingdom",
    },
    access: {
      scope: "TaxSorted public API resources listed by this doorway",
      authentication: "none",
      price: "free",
      cookies: "none",
      methods: ["GET", "HEAD", "OPTIONS"],
      cors: "*",
    },
    wallScope: {
      appliesTo: ["/", "/agent.txt", "/.well-known/agent.txt", wakePath],
      meaning:
        "These doorway responses report existing publication controls and do not override them or create an identity session.",
      doesNotCertify:
        "This is not a service-wide security, privacy, accuracy or legal-compliance certification for every linked dataset and source.",
    },
    walls: [
      {
        id: "publication-controls-hold",
        statement:
          "Dataset publication gates and emergency stops remain authoritative; this doorway never opens a closed collection.",
      },
      {
        id: "source-rights-remain",
        statement:
          "TaxSorted's curation licence is not a blanket licence over linked source material; upstream rights remain attached.",
      },
      {
        id: "public-evidence-only",
        statement:
          "Private contacts, private communications, home addresses, inferred personal ties and personality dossiers do not belong in this public service.",
      },
      {
        id: "uncertainty-stays-visible",
        statement:
          "Known gaps, source limits, accounting boundaries and non-comparability warnings remain visible.",
      },
      {
        id: "no-session-on-doorway",
        statement:
          "The manifest, orientation and open-data resources do not create a taxpayer or browser identity session and do not set cookies.",
      },
    ],
    publicationStates: catalog.datasets.map((dataset) => ({
      datasetId: dataset.id,
      version: dataset.version,
      reviewedOn: dataset.reviewedOn,
      status: dataset.publication.status,
      fullDatasetAvailable: dataset.publication.fullDatasetAvailable,
      reviewBoundary: dataset.publication.reviewBoundary,
      scopeBoundary:
        "scopeBoundary" in dataset.publication
          ? dataset.publication.scopeBoundary
          : null,
    })),
    resources: {
      catalog: {
        href: catalogPath,
        schema: catalog.schema,
        etag: representationEtag(catalogBody),
      },
      rights: { href: rightsPath },
      openApi: { href: "/openapi.json" },
      health: { href: "/v1/health" },
      corrections: { href: correctionsUrl },
      manifests: {
        primary: "/agent.txt",
        wellKnownMirror: "/.well-known/agent.txt",
      },
      datasets: datasetHandles(catalog),
    },
    evidenceLanes: [
      evidenceLane(
        catalog,
        "official-sources",
        "Official sources",
        "Dated primary-source ledgers and source-specific reuse notes.",
        ["sources"],
      ),
      evidenceLane(
        catalog,
        "known-gaps",
        "Known gaps",
        "Explicitly unresolved coverage, evidence and comparability limits.",
        ["gaps"],
      ),
      evidenceLane(
        catalog,
        "data-contracts",
        "Data contracts",
        "Schemas and field dictionaries for building on the datasets.",
        ["schema", "dictionary"],
      ),
      evidenceLane(
        catalog,
        "bulk-reuse",
        "Bulk reuse",
        "Export indexes and screened dataset catalogues for efficient reuse.",
        ["exports", "catalog"],
      ),
      evidenceLane(
        catalog,
        "release-history",
        "Append-only release history",
        "Caller-held cursors for detecting reviewed dataset publication changes without creating an identity session.",
        ["changes"],
      ),
      {
        id: "rights-and-corrections",
        title: "Rights and corrections",
        description:
          "Mixed-rights guidance and the public correction channel. Never submit private or safety-sensitive material to the public issue tracker.",
        resources: [
          { resource: "rights", href: rightsPath },
          { resource: "corrections", href: correctionsUrl },
        ],
      },
    ],
    nextActions: [
      {
        id: "read-open-data-catalog",
        method: "GET",
        href: catalogPath,
        accepts: ["application/json"],
        description:
          "Read every dataset's publication state, version, licence and resource handles.",
      },
      {
        id: "read-rights-first",
        method: "GET",
        href: rightsPath,
        accepts: ["application/json"],
        description:
          "Read the mixed-rights boundary before copying linked source material.",
      },
      {
        id: "inspect-api-contract",
        method: "GET",
        href: "/openapi.json",
        accepts: ["application/json"],
        description: "Inspect the typed API contract and available filters.",
      },
      {
        id: "resume-public-funding-mirror",
        method: "GET",
        href: "/v1/public-funding/uk/changes",
        accepts: ["application/json"],
        description:
          "Read the append-only release checkpoint and keep the returned cursor for the next poll.",
      },
      {
        id: "report-a-public-correction",
        method: "GET",
        href: correctionsUrl,
        accepts: ["text/html"],
        description:
          "Report a non-sensitive correction publicly. Do not submit private or safety-sensitive material there.",
      },
    ],
  } as const;
}

function sendWake(c: Context, body: string, etag: string) {
  const parameters = queryParameters(c);
  if (parameters.length) return queryError(c, parameters, wakePath);

  publicHeaders(
    c,
    etag,
    wakePath,
    "application/json; charset=utf-8",
    "taxsorted.agent-wake/1",
  );
  if (ifNoneMatchMatches(c.req.header("If-None-Match"), etag)) {
    return c.body(null, 304);
  }
  if (c.req.method === "HEAD") return c.body(null, 200);
  return c.body(body, 200);
}

export function createAgentInterfaceRoutes(options: OpenDataRouteOptions = {}) {
  const app = new Hono();
  const payload = buildAgentWakePayload(options);
  const wakeBody = canonicalJson(payload);
  const wakeEtag = representationEtag(wakeBody);
  const manifestEtag = representationEtag(agentManifestText);

  const manifest = (canonicalPath: string) => (c: Context) => {
    const parameters = queryParameters(c);
    if (parameters.length)
      return queryError(c, parameters, canonicalPath, ["text/plain"]);

    publicHeaders(
      c,
      manifestEtag,
      canonicalPath,
      "text/plain; charset=utf-8",
      "taxsorted.agent-manifest/1",
      "/agent.txt",
    );
    if (ifNoneMatchMatches(c.req.header("If-None-Match"), manifestEtag)) {
      return c.body(null, 304);
    }
    if (c.req.method === "HEAD") return c.body(null, 200);
    return c.body(agentManifestText, 200);
  };

  app.on(["GET", "HEAD"], "/agent.txt", manifest("/agent.txt"));
  app.on(
    ["GET", "HEAD"],
    "/.well-known/agent.txt",
    manifest("/.well-known/agent.txt"),
  );
  app.on(["GET", "HEAD"], wakePath, (c) => sendWake(c, wakeBody, wakeEtag));
  app.on(["GET", "HEAD"], "/", (c) => {
    if (!acceptsJson(c.req.header("Accept"))) {
      c.header("Cache-Control", "no-store");
      return c.json({ error: "no_such_door" }, 404);
    }
    return sendWake(c, wakeBody, wakeEtag);
  });

  return app;
}
