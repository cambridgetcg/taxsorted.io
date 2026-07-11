// A small, public machine doorway. It projects the existing open-data catalog;
// it does not create a second source of truth or a browser/taxpayer session.

import { Hono, type Context } from "hono";
import {
  canonicalJson,
  ifNoneMatchMatches,
  representationEtag,
} from "../open-data.js";
import { noSuchDoorProblem, problemDetails } from "../problem-details.js";
import {
  buildOpenDataCatalog,
  type OpenDataRouteOptions,
} from "./open-data.js";
import { releaseDiscoveryHandles } from "../release-discovery-contract.js";
import {
  whyGraphBasePath,
  whyGraphOpenApiPath,
  whyGraphSchemaPath,
} from "./why-graph.js";

const apiOrigin = "https://api.taxsorted.io";
const humanOrigin = "https://taxsorted.io";
const wakePath = "/v1/wake";
const catalogPath = "/v1/open-data";
const rightsPath = "/v1/open-data/rights";
const correctionsUrl = "https://github.com/cambridgetcg/taxsorted.io/issues";
const charityAccountabilityPath = "/v1/charities/uk/accountability";
const charityAccountabilitySchemaPath =
  "/v1/charities/uk/accountability/schema";
const observerAccountabilityPath = "/v1/accountability/uk";
const observerAccountabilitySchemaPath = "/v1/accountability/uk/schema";
const taxExpertManifestPath = "/v1/uk/tax-expert";
const taxExpertAssessmentPath =
  "/v1/uk/tax-expert/mtd-income-tax/assessments";
const taxExpertOpenApiPath = "/openapi/tax-expert-uk.json";

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
# Public orientation for UK tax data and bounded expert tools.

schema-version: taxsorted.agent-manifest/1
name: TaxSorted
what: sourced public data and bounded tools for UK tax, politics, charities and public funding
human-door: ${humanOrigin}/
agent-door: ${apiOrigin}${wakePath}
wake: GET ${apiOrigin}${wakePath}
open-data: GET ${apiOrigin}${catalogPath}
rights: GET ${apiOrigin}${rightsPath}
openapi-public: GET ${apiOrigin}/openapi-public.json
openapi-full: GET ${apiOrigin}/openapi.json
why-graph-framework: GET ${apiOrigin}${whyGraphBasePath}
why-graph-schema: GET ${apiOrigin}${whyGraphSchemaPath}
why-graph-openapi: GET ${apiOrigin}${whyGraphOpenApiPath}
why-graph-writes: none; read-only framework with no ingestion route
health: GET ${apiOrigin}/v1/health
release-ledger: GET ${apiOrigin}${releaseDiscoveryHandles.ledger}
release-json-feed: GET ${apiOrigin}${releaseDiscoveryHandles.jsonFeed}
release-atom-feed: GET ${apiOrigin}${releaseDiscoveryHandles.atom}
public-funding-changes: GET ${apiOrigin}/v1/public-funding/uk/changes
charity-accountability: GET ${apiOrigin}${charityAccountabilityPath}
charity-accountability-schema: GET ${apiOrigin}${charityAccountabilitySchemaPath}
charity-accountability-status: schema-only-not-admitted
charity-accountability-records: none
observer-accountability: GET ${apiOrigin}${observerAccountabilityPath}
observer-accountability-schema: GET ${apiOrigin}${observerAccountabilitySchemaPath}
observer-accountability-status: schema-only-not-admitted
observer-accountability-records: none
tax-expert-manifest: GET ${apiOrigin}${taxExpertManifestPath}
tax-expert-openapi: GET ${apiOrigin}${taxExpertOpenApiPath}
tax-expert-assessment: POST ${apiOrigin}${taxExpertAssessmentPath}
tax-expert-assessment-authentication: Bearer TaxSorted workspace key
tax-expert-assessment-required-scope: tax-expert:assess
tax-expert-assessment-availability: credentialed design partner; no public self-service key provisioning
tax-expert-assessment-kind: stateless computation
tax-expert-assessment-input-sensitivity: financial facts; no name, NINO, UTR or address requested
tax-expert-assessment-workspace-identity: the workspace key identifies the calling workspace
tax-expert-assessment-request-fact-storage: not written to application storage
tax-expert-assessment-generated-answer-storage: not written to application storage
tax-expert-assessment-used-for-training: false
tax-expert-assessment-effects: classification only; no signup, filing or external tax-state change
tax-expert-assessment-cache: no-store
tax-expert-assessment-cors: server-to-server; browser bearer calls are not supported
tax-expert-assessment-repeatability: same facts, trusted server evaluation date and admitted ruleset/source ledger
tax-expert-assessment-idempotency: not declared; do not assume automatic retries are safe
tax-expert-assessment-errors: follow the task OpenAPI TaxExpertApiError contract; request fact values are not echoed in errors
corrections: ${correctionsUrl}
authentication: none on this doorway and public read resources
authentication-scope: secured task tools declare authentication separately
corrections-account: a GitHub account is required to submit a public correction
wishes: ${correctionsUrl}/new?template=wish.yml
wishes-account: a GitHub account is required; wishes are public so anyone can see what was asked and what got built
account: none on this doorway
session: none on this doorway
cookies: none on this doorway
writes: none on this doorway
writes-scope: this doorway only; linked task tools declare effects separately
methods: GET, HEAD, OPTIONS
methods-scope: this doorway only; linked task tools declare methods separately
formats: application/json, application/x-ndjson, text/csv, application/feed+json, application/atom+xml
format-selection: follow each export index's explicit representation URLs; Accept does not switch graph formats
errors: RFC 9457 fields; application/problem+json by default, application/json when explicitly requested
errors-scope: this doorway only; task errors follow their task OpenAPI contract
error-instance: route path only; query values are never reflected
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
wall: every observer needs a sourced accountability route or an explicit coverage gap
wall: a formal institutional relation is not proof of control, collusion, motive or character
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
      `</openapi-public.json>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"; title="Public read API"`,
      `</openapi.json>; rel="related"; type="application/vnd.oai.openapi+json;version=3.1"; title="Full API"`,
      `<${releaseDiscoveryHandles.ledger}>; rel="collection"; type="application/json"; title="Public release checkpoints"`,
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
  const detail = "This doorway does not use query parameters.";
  return problemDetails(c, 400, {
    error: "unknown_query_parameter",
    detail,
    extensions: {
      schema: "taxsorted.agent-error/1",
      message: detail,
      method: c.req.method,
      path: c.req.path,
      parameters,
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

function methodError(
  c: Context,
  path: string,
  accepts = ["application/json"],
) {
  c.header("Allow", "GET, HEAD, OPTIONS");
  const detail = "The machine doorway is read-only.";
  return problemDetails(c, 405, {
    error: "method_not_allowed",
    detail,
    extensions: {
      schema: "taxsorted.agent-error/1",
      message: detail,
      method: c.req.method,
      path,
      parameters: [],
    },
    nextActions: [
        {
          id: "retry-with-read-method",
          method: "GET",
          href: path,
          accepts,
          description: "Read this doorway without creating or changing state.",
        },
    ],
  });
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
  const datasetChangeLane = evidenceLane(
    catalog,
    "release-history",
    "Append-only release history",
    "Caller-held cursors for detecting reviewed dataset publication changes without creating an identity session.",
    ["changes"],
  );

  return {
    schema: "taxsorted.agent-wake/1",
    service: {
      name: "TaxSorted",
      purpose:
        "Make sourced UK tax, politics, charity and public-money structures easier to understand, inspect and reuse, and expose bounded tax tools with separate access contracts.",
      humanDoor: `${humanOrigin}/`,
      machineDoor: `${apiOrigin}${wakePath}`,
      jurisdiction: "United Kingdom",
    },
    access: {
      scope: "The four machine doorway representations named by access.appliesTo.",
      appliesTo: ["/", "/agent.txt", "/.well-known/agent.txt", wakePath],
      linkedTaskAccessDeclaredSeparately: true,
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
      {
        id: "observer-accountability-is-reciprocal",
        statement:
          "Every observer needs a sourced accountability or challenge route, or an explicit coverage gap; institutional links never become character or collusion claims.",
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
      openApi: {
        publicHref: "/openapi-public.json",
        fullHref: "/openapi.json",
        datasetSlices: {
          taxSystem: "/openapi/tax-system-uk.json",
          taxIndustry: "/openapi/tax-industry-uk.json",
          charities: "/openapi/charities-uk.json",
          publicFunding: "/openapi/public-funding-uk.json",
          politics: "/openapi/politics-uk.json",
        },
        frameworkSlices: {
          accountability: "/openapi/accountability-uk.json",
          whyGraph: whyGraphOpenApiPath,
        },
        taskSlices: {
          taxExpert: taxExpertOpenApiPath,
        },
      },
      releases: releaseDiscoveryHandles,
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
      observerAccountability: {
        framework: observerAccountabilityPath,
        schema: observerAccountabilitySchemaPath,
        status: "schema-only-not-admitted",
        recordsAvailable: false,
      },
      whyGraph: {
        framework: whyGraphBasePath,
        schema: whyGraphSchemaPath,
        openApi: whyGraphOpenApiPath,
        graphSchema: "taxsorted.why-graph/1",
        status: "first-adopter",
        firstAdopter: {
          endpoint: taxExpertAssessmentPath,
          responsePath: "/reasoning/whyGraph",
          capabilityVersion: "2026-07-11.5",
          runtimeEmitted: true,
          wireSchemaOptionalForForwardCompatibleV1Readers: true,
        },
        access: {
          methods: ["GET", "HEAD", "OPTIONS"],
          authentication: "none",
          account: "none",
          session: "none",
          cookies: "none",
          writes: "none",
          cors: "*",
        },
        boundaries: {
          createsGraphRecords: false,
          changesExternalState: false,
          infersOfficialAppealRights: false,
          graphIsDerivedNotCanonical: true,
        },
      },
      taxExpert: {
        humanHref: `${humanOrigin}/uk/tax-expert`,
        publicManifest: {
          method: "GET",
          href: taxExpertManifestPath,
          authentication: "none",
        },
        taskContract: {
          method: "GET",
          href: taxExpertOpenApiPath,
          authentication: "none",
        },
        assessment: {
          operationId: "assessMtdIncomeTaxReadiness",
          method: "POST",
          href: taxExpertAssessmentPath,
          kind: "stateless-computation",
          requestContentType: "application/json",
          responseContentType: "application/json",
          authentication: {
            openApiSecurityScheme: "WorkspaceKey",
            type: "http-bearer",
            credential: "TaxSorted workspace key",
            requiredScope: "tax-expert:assess",
          },
          availability: "credentialed-design-partner",
          publicSelfServiceKeyProvisioning: false,
          inputSensitivity: "financial-facts",
          directIdentifiersRequested: false,
          workspaceKeyIdentifiesWorkspace: true,
          requestFactsStorage: "not-written-to-application-storage",
          generatedAnswerStorage: "not-written-to-application-storage",
          usedForTraining: false,
          applicationStateWrite: false,
          externalSubmission: false,
          sessionCreated: false,
          setsCookies: false,
          cache: "no-store",
          intendedClient: "server-to-server",
          browserCors: "not-supported-for-bearer-assessment",
          browserCorsAuthorizationHeaderAllowed: false,
          maxBodyBytes: 16_384,
          repeatabilityBoundary:
            "same-request-facts-trusted-server-evaluation-date-and-admitted-ruleset-source-ledger",
          idempotency: "not-declared",
          errorContract: {
            mediaType: "application/json",
            schema: "TaxExpertApiError",
            requestFactValuesEchoedInErrors: false,
          },
        },
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
      {
        ...datasetChangeLane,
        description:
          "Central dataset-release checkpoints plus any dataset-specific record-level change feeds. Both are caller-held and create no identity session.",
        resources: [
          { resource: "releaseLedger", href: releaseDiscoveryHandles.ledger },
          { resource: "releaseJsonFeed", href: releaseDiscoveryHandles.jsonFeed },
          { resource: "releaseAtomFeed", href: releaseDiscoveryHandles.atom },
          ...datasetChangeLane.resources,
        ],
      },
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
        href: "/openapi-public.json",
        accepts: ["application/json"],
        description:
          "Inspect the bounded public-read API contract, then follow a dataset slice when useful.",
      },
      {
        id: "watch-release-checkpoints",
        method: "GET",
        href: releaseDiscoveryHandles.ledger,
        accepts: ["application/json"],
        description:
          "Read exact dataset-release baselines and forward checkpoints without invented record history.",
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
        id: "inspect-observer-accountability-contract",
        method: "GET",
        href: observerAccountabilityPath,
        accepts: ["application/json"],
        description:
          "Read the reciprocal watching-the-watchers protocol, official source doors, hard walls and zero-row candidate contract.",
      },
      {
        id: "inspect-why-graph-contract",
        method: "GET",
        href: whyGraphBasePath,
        accepts: ["application/json"],
        description:
          "Read how conclusions connect to reached reasoning, facts, rules, sources, institutions, consequences, challenge routes and explicit gaps.",
      },
      {
        id: "inspect-tax-expert-task-contract",
        method: "GET",
        href: taxExpertOpenApiPath,
        accepts: ["application/vnd.oai.openapi+json;version=3.1"],
        description:
          "Inspect the task-sized OpenAPI covering both the public capability manifest and the separately authenticated stateless assessment before supplying tax facts.",
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
      return noSuchDoorProblem(c);
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
