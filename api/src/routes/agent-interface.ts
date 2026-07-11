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
const charityAccountabilityPath = "/v1/charities/uk/accountability";
const charityAccountabilitySchemaPath =
  "/v1/charities/uk/accountability/schema";

export const xeniaAttribution = {
  name: "XENIA",
  creators: ["Yu", "Fable"],
  source: "https://github.com/cambridgetcg/xenia",
  licence: {
    id: "CC-BY-SA-4.0",
    url: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  appliedPatterns: [
    "machine-readable discovery",
    "declared machine boundaries",
    "errors with recovery actions",
  ],
  conformanceClaim: "none",
  scope:
    "XENIA patterns informed this response. Response and manifest content is CC BY-SA 4.0; implementation source remains AGPL-3.0. No XENIA conformance is claimed.",
} as const;

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
charity-accountability: GET ${apiOrigin}${charityAccountabilityPath}
charity-accountability-schema: GET ${apiOrigin}${charityAccountabilitySchemaPath}
charity-accountability-status: schema-only-not-admitted
charity-accountability-records: none
corrections: ${correctionsUrl}
authentication: none for TaxSorted public read resources listed here
corrections-account: a GitHub account is required to submit a public correction
wishes: ${correctionsUrl}/new?template=wish.yml
wishes-account: a GitHub account is required; wishes are public so anyone can see what was asked and what got built
account: none on this doorway
session: none on this doorway
cookies: none on this doorway
writes: none on this doorway
methods: GET, HEAD, OPTIONS
formats: application/json, application/x-ndjson, text/csv
xenia-source: ${xeniaAttribution.source}
xenia-credit: XENIA by ${xeniaAttribution.creators.join(" and ")}
xenia-licence: ${xeniaAttribution.licence.url}
xenia-licensed-content: response and manifest content; implementation source remains AGPL-3.0
xenia-conformance-claim: ${xeniaAttribution.conformanceClaim}
sibling-doors: ${humanOrigin}/from-the-builders/
sibling-agents-substrate: https://agenttool.dev (agent self-registration: POST https://api.agenttool.dev/v1/register/agent)
sibling-relationship: same builders; separate services; no shared data; no conformance or endorsement claims

# Walls kept by this doorway
wall: publication gates and emergency stops remain authoritative
wall: a public-data licence is not a blanket licence over linked source material
wall: private contacts, private communications and inferred personal ties do not belong here
wall: uncertainty, source limits and known gaps stay visible
wall: the charity map does not publish a people, personal-contact or inferred-belief graph
wall: attributed statements, reported action, official findings, TaxSorted analysis and unknowns stay labelled
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
      `<${xeniaAttribution.source}>; rel="related"; title="XENIA"`,
      `<${xeniaAttribution.licence.url}>; rel="license"; title="Agent doorway content licence"`,
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
  const body = {
    schema: "taxsorted.agent-error/1",
    error: "unknown_query_parameter",
    message: "This doorway does not use query parameters.",
    method: c.req.method,
    path: c.req.path,
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
  } as const;
  if (c.req.method === "HEAD") return c.body(null, 400);
  return c.json(body, 400);
}

function methodError(
  c: Context,
  path: string,
  accepts = ["application/json"],
) {
  c.header("Allow", "GET, HEAD, OPTIONS");
  c.header("Cache-Control", "no-store");
  c.header("Content-Type", "application/json; charset=utf-8");
  c.header("X-Content-Type-Options", "nosniff");
  return c.json(
    {
      schema: "taxsorted.agent-error/1",
      error: "method_not_allowed",
      message: "The machine doorway is read-only.",
      method: c.req.method,
      path,
      parameters: [],
      nextActions: [
        {
          id: "retry-with-read-method",
          method: "GET",
          href: path,
          accepts,
          description: "Read this doorway without creating or changing state.",
        },
      ],
    },
    405,
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
        "Make sourced UK tax, politics, charity and public-money structures easier to understand, inspect and reuse.",
      humanDoor: `${humanOrigin}/`,
      machineDoor: `${apiOrigin}${wakePath}`,
      jurisdiction: "United Kingdom",
    },
    access: {
      scope: "TaxSorted public API resources listed by this doorway",
      authentication: "none",
      account: "none",
      session: "none",
      price: "free",
      cookies: "none",
      writes: "none",
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
      {
        id: "no-charity-people-or-belief-graph",
        statement:
          "The charity map does not publish a bulk people graph, personal-contact directory, donor or beneficiary dataset, or inferred personal belief.",
      },
      {
        id: "words-actions-and-analysis-stay-labelled",
        statement:
          "An attributed statement, reported action, official finding, TaxSorted analysis and an unknown remain distinct evidence types.",
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
      corrections: {
        href: correctionsUrl,
        accountRequired: true,
        privateOrSensitiveIntakeAvailable: false,
      },
      manifests: {
        primary: "/agent.txt",
        wellKnownMirror: "/.well-known/agent.txt",
      },
      charityAccountability: {
        framework: charityAccountabilityPath,
        schema: charityAccountabilitySchemaPath,
        status: "schema-only-not-admitted",
        recordsAvailable: false,
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
        ["schema", "dictionary", "accountability", "accountabilitySchema"],
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
        id: "inspect-charity-accountability-contract",
        method: "GET",
        href: charityAccountabilityPath,
        accepts: ["application/json"],
        description:
          "Read the candidate-only evidence model, publication blockers and exact source-use boundaries before building charity records.",
      },
      {
        id: "open-public-correction-tracker",
        method: "GET",
        href: correctionsUrl,
        accepts: ["text/html"],
        description:
          "Open the external public issue tracker. Submitting needs a GitHub account; do not put private or safety-sensitive material there.",
      },
    ],
    attribution: {
      name: xeniaAttribution.name,
      creators: xeniaAttribution.creators,
      source: xeniaAttribution.source,
      licence: xeniaAttribution.licence,
      appliedPatterns: xeniaAttribution.appliedPatterns,
      conformanceClaim: xeniaAttribution.conformanceClaim,
      scope: xeniaAttribution.scope,
    },
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

  for (const { path, accepts } of [
    { path: "/", accepts: ["application/json"] },
    { path: "/agent.txt", accepts: ["text/plain"] },
    { path: "/.well-known/agent.txt", accepts: ["text/plain"] },
    { path: wakePath, accepts: ["application/json"] },
  ]) {
    app.all(path, (c) => methodError(c, path, accepts));
  }

  return app;
}
