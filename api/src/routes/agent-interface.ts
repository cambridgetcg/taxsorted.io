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
  apiWorkspacePath,
  professionalToolsAccess,
  professionalToolsOpenApiPath,
  professionalToolsPath,
} from "../professional-tools-contract.js";
import { ukCharities } from "../uk-charities.js";
import {
  whyGraphAdoptersPath,
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
const caseCommonsPath = "/v1/case-commons/uk";
const caseCommonsCasesPath = "/v1/case-commons/uk/cases";
const caseCommonsSchemaPath = "/v1/case-commons/uk/schema";
const caseCommonsPacketSchemaPath =
  "/v1/case-commons/uk/packet-schema";
const caseCommonsAssessmentPath =
  "/v1/case-commons/uk/assessment-template";
const caseCommonsOpenApiPath = "/openapi/case-commons-uk.json";
const caseCommonsAgentToolGuide =
  "https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/case-commons/AGENTTOOL.md";
const professionalOpportunitiesPath =
  "/v1/professional-opportunities/uk";
const professionalOpportunitiesMethodPath =
  "/v1/professional-opportunities/uk/method";
const professionalOpportunitiesListPath =
  "/v1/professional-opportunities/uk/opportunities";
const professionalOpportunitiesScrutinyPath =
  "/v1/professional-opportunities/uk/scrutiny";
const professionalOpportunitiesSourcesPath =
  "/v1/professional-opportunities/uk/sources";
const professionalOpportunitiesSchemaPath =
  "/v1/professional-opportunities/uk/schema";
const professionalOpportunitiesPacketSchemaPath =
  "/v1/professional-opportunities/uk/packet-schema";
const professionalOpportunitiesAssessmentPath =
  "/v1/professional-opportunities/uk/assessment-template";
const professionalOpportunitiesAssessmentSchemaPath =
  "/v1/professional-opportunities/uk/assessment-schema";
const professionalOpportunitiesRightsPath =
  "/v1/professional-opportunities/uk/rights";
const professionalOpportunitiesOpenApiPath =
  "/openapi/professional-opportunities-uk.json";
const professionalOpportunitiesAgentToolGuide =
  "https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/professional-opportunities/AGENTTOOL.md";
const publicOfficePathwaysPath = "/v1/politics/uk/public-office-pathways";
const publicOfficePathwaysSchemaPath =
  "/v1/politics/uk/public-office-pathways/schema";
const publicDecisionPathwaysPath =
  "/v1/politics/uk/public-decision-pathways";
const publicDecisionPathwaysSchemaPath =
  "/v1/politics/uk/public-decision-pathways/schema";
const taxExpertManifestPath = "/v1/uk/tax-expert";
const taxExpertAssessmentPath =
  "/v1/uk/tax-expert/mtd-income-tax/assessments";
const taxExpertOpenApiPath = "/openapi/tax-expert-uk.json";
const taxPositionPassportSchemaPath =
  "/v1/uk/tax-expert/tax-position-passport/schema";
const taxPositionPassportExamplePath =
  "/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax";
const sdltCalculationPath = "/v1/uk/sdlt/calculations";

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
why-graph-adopters: GET ${apiOrigin}${whyGraphAdoptersPath}
why-graph-schema: GET ${apiOrigin}${whyGraphSchemaPath}
why-graph-openapi: GET ${apiOrigin}${whyGraphOpenApiPath}
why-graph-writes: none; read-only framework with no ingestion route
health: GET ${apiOrigin}/v1/health
release-ledger: GET ${apiOrigin}${releaseDiscoveryHandles.ledger}
release-json-feed: GET ${apiOrigin}${releaseDiscoveryHandles.jsonFeed}
release-atom-feed: GET ${apiOrigin}${releaseDiscoveryHandles.atom}
public-funding-changes: GET ${apiOrigin}/v1/public-funding/uk/changes
window-tax-story: GET ${humanOrigin}/learn/history/window-tax/
window-tax-media-manifest: GET ${humanOrigin}/media/window-tax/manifest.json
window-tax-scope: sourced public history; image rights and evidence strength remain separate
window-tax-effects: read-only; no account, session, tracking or writes
charity-accountability: GET ${apiOrigin}${charityAccountabilityPath}
charity-accountability-schema: GET ${apiOrigin}${charityAccountabilitySchemaPath}
charity-accountability-status: schema-only-not-admitted
charity-accountability-records: none
charity-tax-treatment-why-graph: GET ${apiOrigin}/v1/charities/uk/tax-treatments/{id}/why-graph
charity-tax-treatment-why-graph-scope: sector record explanation only; no organisation or case facts
observer-accountability: GET ${apiOrigin}${observerAccountabilityPath}
observer-accountability-schema: GET ${apiOrigin}${observerAccountabilitySchemaPath}
observer-accountability-status: schema-only-not-admitted
observer-accountability-records: none
case-commons: GET ${apiOrigin}${caseCommonsPath}
case-commons-cases: GET ${apiOrigin}${caseCommonsCasesPath}
case-commons-schema: GET ${apiOrigin}${caseCommonsSchemaPath}
case-commons-packet-schema: GET ${apiOrigin}${caseCommonsPacketSchemaPath}
case-commons-assessment-template: GET ${apiOrigin}${caseCommonsAssessmentPath}
case-commons-openapi: GET ${apiOrigin}${caseCommonsOpenApiPath}
case-commons-agenttool-local-mirror: ${caseCommonsAgentToolGuide}
case-commons-agenttool-sdk: optional @agenttool/sdk 0.16.2 DataClient; exact official GitHub release artifact; one verified public packet to a caller-operated loopback agent-data/v1 node; dry-run by default; no hosted AgentTool write
case-commons-scope: decided public records; one England-and-Wales deep case; source-resolving packets; remedies and money meanings; local assessment template
case-commons-effects: read-only research; no personal intake, private upload, viability score, expected value, matching, ranking, outreach, recommendation, representation or referral fee
case-commons-private-material: stays with the prospective client or instructed professional in their approved matter system
professional-opportunities: GET ${apiOrigin}${professionalOpportunitiesPath}
professional-opportunities-method: GET ${apiOrigin}${professionalOpportunitiesMethodPath}
professional-opportunities-list: GET ${apiOrigin}${professionalOpportunitiesListPath}
professional-opportunities-scrutiny: GET ${apiOrigin}${professionalOpportunitiesScrutinyPath}
professional-opportunities-sources: GET ${apiOrigin}${professionalOpportunitiesSourcesPath}
professional-opportunities-schema: GET ${apiOrigin}${professionalOpportunitiesSchemaPath}
professional-opportunities-packet-schema: GET ${apiOrigin}${professionalOpportunitiesPacketSchemaPath}
professional-opportunities-assessment-template: GET ${apiOrigin}${professionalOpportunitiesAssessmentPath}
professional-opportunities-assessment-schema: GET ${apiOrigin}${professionalOpportunitiesAssessmentSchemaPath}
professional-opportunities-rights: GET ${apiOrigin}${professionalOpportunitiesRightsPath}
professional-opportunities-openapi: GET ${apiOrigin}${professionalOpportunitiesOpenApiPath}
professional-opportunities-agenttool-guide: ${professionalOpportunitiesAgentToolGuide}
professional-opportunities-agenttool-sdk: optional @agenttool/sdk 0.16.2; exact official GitHub release artifact; direct HTTPS remains the universal door; no hosted AgentTool write
professional-opportunities-scope: source-backed classes of specialist UK tax work, institutional scrutiny, separate money meanings and a blank finite local assessment
professional-opportunities-status-boundary: the user must independently verify the status required for the exact work; TaxSorted verifies no professional; no claim that all UK tax work has one universal licence
professional-opportunities-effects: read-only research; no client intake, private upload, probability, expected value, ranking, matching, outreach, recommendation, case assignment, representation, filing, payment or referral fee
professional-opportunities-private-material: stays with the prospective client or instructed professional in their approved matter system
professional-tools: GET ${apiOrigin}${professionalToolsPath}
professional-tools-openapi: GET ${apiOrigin}${professionalToolsOpenApiPath}
professional-tools-status: credentialed design partner; two executable stateless tasks
professional-tools-audiences: solicitors and conveyancers; accountants and tax advisers
professional-tools-access: operator-issued workspace keys for existing design partners
professional-tools-access-gap: no public self-service key provisioning and no confidential access-request intake
professional-workspace-key: GET ${apiOrigin}${apiWorkspacePath}
professional-workspace-key-authentication: Bearer TaxSorted workspace key; no task scope required
professional-workspace-key-cors: server-to-server; browser bearer calls are not supported
professional-workspace-key-input: no query string and no declared request body; either is rejected with 400 before authentication; no client or tax facts
professional-workspace-key-output: presented key and workspace IDs, key prefix, mode, scopes, creation and expiry or null for a legacy non-expiring key; no workspace name, sibling keys, hashes or secrets
professional-key-lifecycle: operator-managed inspect, finite-expiry issue, overlapping rotate and explicit revoke; no self-service, public delivery or authenticated admin audit trail
professional-tools-data-boundary: the key identifies the calling workspace; minimized financial or transaction facts may still be personal data without direct identifiers
professional-tools-client-matter-records: none
professional-tools-filing: none; the separate browser HMRC rail is sandbox-only and is not connected to workspace-key tasks
professional-tools-evidence-archive: none; caller must retain the exact request, response, X-Request-ID, versions, sources and professional sign-off
professional-tools-production-contract-gaps: no published rate limit, professional privacy and retention policy, security assessment, self-service key lifecycle, authenticated admin audit trail, high-availability contract or SLA
sdlt-calculation: POST ${apiOrigin}${sdltCalculationPath}
sdlt-calculation-required-scope: sdlt:calculate
sdlt-calculation-kind: stateless deterministic computation for one ordinary residential dwelling in England or Northern Ireland
sdlt-calculation-review-boundary: recognised complex, unknown, out-of-scope or future-effective-date cases return needs_review without a tax figure
sdlt-calculation-effects: calculation only; no client record, return preparation, filing or external state change
sdlt-calculation-trust: request hash covers normalized facts and ruleset revision; evaluatedOn reports the separate server-date boundary
politics-public-office-pathways: GET ${apiOrigin}${publicOfficePathwaysPath}
politics-public-office-pathways-schema: GET ${apiOrigin}${publicOfficePathwaysSchemaPath}
politics-public-office-pathways-scope: current-law, non-partisan routes for UK MP elections in Great Britain and England principal councillors; named gaps for other offices
politics-public-office-pathways-availability: public outside the pending bulk-record and named-person gates; returns 503 while the politics bulk emergency stop is active
politics-public-office-pathways-effects: read-only guidance; no eligibility decision, application, nomination, account, tracking or political recommendation
politics-public-office-pathways-rights: GET ${apiOrigin}${publicOfficePathwaysPath}/rights
politics-public-office-pathways-corrections: GET ${apiOrigin}/v1/politics/uk/integrity/corrections
politics-public-decision-pathways: GET ${apiOrigin}${publicDecisionPathwaysPath}
politics-public-decision-pathways-decisions: GET ${apiOrigin}${publicDecisionPathwaysPath}/decisions
politics-public-decision-pathways-doors: GET ${apiOrigin}${publicDecisionPathwaysPath}/doors
politics-public-decision-pathways-schema: GET ${apiOrigin}${publicDecisionPathwaysSchemaPath}
politics-public-decision-pathways-openapi: GET ${apiOrigin}/openapi/politics-uk.json
politics-public-decision-pathways-scope: one deep UK central-tax primary-law path; formal power, public doors, dated event windows, personal appeal and complaint hand-offs, and named gaps for other decision families
politics-public-decision-pathways-availability: public outside the pending bulk-record and named-person gates; returns 503 while the politics bulk emergency stop is active
politics-public-decision-pathways-effects: read-only general guidance; no political profile; no personalised, ideological or ranked recommendation; no effectiveness score, account, tracking, message, submission, appeal decision or legal representation
politics-public-decision-pathways-event-status: every event window is dated; compare checkedOn and closesOn, then verify the official source before acting
politics-public-decision-pathways-rights: GET ${apiOrigin}${publicDecisionPathwaysPath}/rights
politics-public-decision-pathways-corrections: GET ${apiOrigin}/v1/politics/uk/integrity/corrections
tax-expert-manifest: GET ${apiOrigin}${taxExpertManifestPath}
tax-expert-openapi: GET ${apiOrigin}${taxExpertOpenApiPath}
tax-position-passport-schema: GET ${apiOrigin}${taxPositionPassportSchemaPath}
tax-position-passport-example: GET ${apiOrigin}${taxPositionPassportExamplePath}
tax-position-passport-generation: browser-local only; no upload, cloud Passport, share link or server CRUD endpoint
tax-position-passport-data: portable income-source facts, user-named evidence states and complete replayable MTD request plus TaxAnswer
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
tax-expert-assessment-retry-effects: none; no application state write or external submission
tax-expert-assessment-result-stability: not byte-stable across trusted evaluation date or admitted ruleset/source ledger changes
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
wall: case party positions, court findings, later outcomes, TaxSorted analysis and unknowns remain separate
wall: an amount demanded or affected is not automatically an award, refund, recovery or net gain
wall: the case commons has no claimant intake, lawyer bid, ranking, probability or outreach route
wall: regulator scrutiny states the evidence type, what it does not prove, the public-body response or counterweight and a lawful correction route
wall: the professional-opportunity atlas has no client intake, professional marketplace, case assignment, probability, expected value, ranking or outreach route
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

type AgentInterfaceOptions = OpenDataRouteOptions & {
  caseCommonsPublic?: boolean;
  caseCommonsEmergencyStop?: boolean;
  caseCommonsStoppedCaseIds?: string[];
  professionalOpportunitiesPublic?: boolean;
  professionalOpportunitiesEmergencyStop?: boolean;
  professionalOpportunitiesStoppedIds?: string[];
};

export function buildAgentWakePayload(options: AgentInterfaceOptions = {}) {
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
      {
        id: "case-outcomes-stay-labelled",
        statement:
          "Case party positions, court findings, later procedural outcomes, TaxSorted analysis and unknowns remain separate; a public-law win is not automatically a monetary recovery.",
      },
      {
        id: "no-case-marketplace-or-intake",
        statement:
          "The public case commons has no personal intake, private upload, viability score, expected value, lawyer ranking, matching, outreach, recommendation or referral fee.",
      },
      {
        id: "regulator-scrutiny-keeps-proof-limits",
        statement:
          "Institutional scrutiny states its evidence type, what it does not prove, the public-body response or counterweight and a lawful correction or review route.",
      },
      {
        id: "no-opportunity-marketplace-or-intake",
        statement:
          "The professional-opportunity atlas has no client intake, private upload, professional marketplace, case assignment, probability, expected value, ranking, matching, outreach, recommendation or referral fee.",
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
          caseCommons: caseCommonsOpenApiPath,
          professionalOpportunities:
            professionalOpportunitiesOpenApiPath,
          whyGraph: whyGraphOpenApiPath,
        },
        taskSlices: {
          taxExpert: taxExpertOpenApiPath,
          professionalTools: professionalToolsOpenApiPath,
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
      caseCommons: {
        href: caseCommonsPath,
        cases: caseCommonsCasesPath,
        schema: caseCommonsSchemaPath,
        packetSchema: caseCommonsPacketSchemaPath,
        assessmentTemplate: caseCommonsAssessmentPath,
        openApi: caseCommonsOpenApiPath,
        humanGuide: `${humanOrigin}/uk/cases/`,
        availability: options.caseCommonsEmergencyStop
          ? "emergency-stopped"
          : !options.caseCommonsPublic
            ? "publication-review"
            : options.caseCommonsStoppedCaseIds?.length
              ? "case-level-stops-active"
              : "open",
        stoppedCaseCount: new Set(
          options.caseCommonsStoppedCaseIds ?? [],
        ).size,
        writes: false,
        personalIntake: false,
        privateUploads: false,
        professionalMarketplace: false,
        probabilityOrExpectedValue: false,
        optionalAgentToolBridge: {
          required: false,
          sdk: "@agenttool/sdk",
          version: "0.16.2",
          client: "DataClient",
          custody: "caller-operated-loopback-agent-data-node",
          guide: caseCommonsAgentToolGuide,
          defaultEffect: "dry-run-verification-only",
          writeEffect:
            "One explicit caller-directed local collect operation containing only the verified public packet.",
          hostedAgentToolWrite: false,
          privateCaseFacts: false,
        },
        effects:
          "Read-only decided-case research and blank local assessment; no matching, ranking, outreach, recommendation, representation or external state change.",
      },
      professionalOpportunities: {
        href: professionalOpportunitiesPath,
        method: professionalOpportunitiesMethodPath,
        opportunities: professionalOpportunitiesListPath,
        scrutiny: professionalOpportunitiesScrutinyPath,
        sources: professionalOpportunitiesSourcesPath,
        schema: professionalOpportunitiesSchemaPath,
        packetSchema: professionalOpportunitiesPacketSchemaPath,
        assessmentTemplate: professionalOpportunitiesAssessmentPath,
        assessmentSchema:
          professionalOpportunitiesAssessmentSchemaPath,
        rights: professionalOpportunitiesRightsPath,
        openApi: professionalOpportunitiesOpenApiPath,
        humanGuide: `${humanOrigin}/uk/opportunities/`,
        availability: options.professionalOpportunitiesEmergencyStop
          ? "emergency-stopped"
          : !options.professionalOpportunitiesPublic
            ? "publication-review"
            : options.professionalOpportunitiesStoppedIds?.length
              ? "record-level-stops-active"
              : "open",
        stoppedOpportunityCount: new Set(
          options.professionalOpportunitiesStoppedIds ?? [],
        ).size,
        writes: false,
        clientIntake: false,
        privateUploads: false,
        professionalMarketplace: false,
        caseAssignment: false,
        probabilityOrExpectedValue: false,
        professionalStatusBoundary:
          "The user must independently verify the status required for the exact work; TaxSorted verifies no professional, and UK tax work does not have one universal professional licence.",
        optionalAgentToolBridge: {
          required: false,
          sdk: "@agenttool/sdk",
          version: "0.16.2",
          guide: professionalOpportunitiesAgentToolGuide,
          directHttpsIsUniversalDoor: true,
          hostedAgentToolWrite: false,
          privateMatterFacts: false,
        },
        effects:
          "Read-only public research and a blank finite local assessment; no matching, ranking, outreach, recommendation, representation, filing, payment or external state change.",
      },
      publicOfficePathways: {
        href: publicOfficePathwaysPath,
        schema: publicOfficePathwaysSchemaPath,
        humanGuide: `${humanOrigin}/uk/politics/stand/`,
        availability: "conditional-public",
        unavailableWhen: "politics-bulk-data-emergency-stop",
        rights: `${publicOfficePathwaysPath}/rights`,
        corrections: "/v1/politics/uk/integrity/corrections",
        effects:
          "Read-only guidance; no eligibility decision, application, nomination, account, tracking or political recommendation.",
      },
      publicDecisionPathways: {
        href: publicDecisionPathwaysPath,
        decisions: `${publicDecisionPathwaysPath}/decisions`,
        doors: `${publicDecisionPathwaysPath}/doors`,
        schema: publicDecisionPathwaysSchemaPath,
        openApi: "/openapi/politics-uk.json",
        humanGuide: `${humanOrigin}/uk/politics/decisions/`,
        availability: "conditional-public",
        unavailableWhen: "politics-bulk-data-emergency-stop",
        rights: `${publicDecisionPathwaysPath}/rights`,
        corrections: "/v1/politics/uk/integrity/corrections",
        effects:
          "Read-only general institutional guidance; no political profile; no personalised, ideological or ranked recommendation; no effectiveness score, account, tracking, message, submission, appeal decision or legal representation.",
        eventStatus:
          "Every event window is dated; compare checkedOn and closesOn, then verify the official source before acting.",
      },
      whyGraph: {
        framework: whyGraphBasePath,
        adopters: whyGraphAdoptersPath,
        schema: whyGraphSchemaPath,
        openApi: whyGraphOpenApiPath,
        graphSchema: "taxsorted.why-graph/1",
        status: "first-adopter",
        adopterCount: 2,
        legacyStatusMeaning:
          "Compatibility marker that MTD was the first adopter; use the adopter index for all current producers.",
        firstAdopter: {
          endpoint: taxExpertAssessmentPath,
          responsePath: "/reasoning/whyGraph",
          capabilityVersion: "2026-07-11.5",
          runtimeEmitted: true,
          wireSchemaOptionalForForwardCompatibleV1Readers: true,
        },
        secondAdopter: {
          endpointTemplate:
            "/v1/charities/uk/tax-treatments/{id}/why-graph",
          subjectVersion: ukCharities.meta.version,
          runtimeEmitted: true,
          standaloneResource: true,
          publicationControlledBy: "/v1/charities/uk",
          organisationOrCaseFacts: false,
        },
        access: {
          appliesTo: [
            whyGraphBasePath,
            whyGraphAdoptersPath,
            whyGraphSchemaPath,
          ],
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
      professionalTools: {
        publicManifest: {
          method: "GET",
          href: professionalToolsPath,
          authentication: "none",
        },
        taskContract: {
          method: "GET",
          href: professionalToolsOpenApiPath,
          authentication: "none",
        },
        credentialInspection: {
          method: "GET",
          href: apiWorkspacePath,
          authentication: "Bearer TaxSorted workspace key",
          requiredWorkspaceScopes: [],
          intendedClient: "server-to-server",
          browserCorsAuthorizationHeaderAllowed: false,
          acceptsQueryParameters: false,
          acceptsRequestBody: false,
          acceptsClientFacts: false,
          changesState: false,
          returnsOtherKeys: false,
        },
        operatorKeyLifecycle: {
          inspect: true,
          issueWithFiniteExpiry: true,
          overlappingRotation: true,
          explicitRevocation: true,
          selfService: false,
          securePublicDelivery: false,
          authenticatedAdminAuditTrail: false,
        },
        status: "credentialed-design-partner",
        audiences: [
          "solicitors-and-conveyancers",
          "accountants-and-tax-advisers",
        ],
        executableTaskCount: 2,
        access: {
          ...professionalToolsAccess,
          authentication: "Bearer TaxSorted workspace key",
          intendedClient: "server-to-server",
        },
        boundaries: {
          clientOrMatterRecords: false,
          portfolioOrBatchOperations: false,
          filingOrSubmission: false,
          immutableEvidenceArchive: false,
          workspaceNameReturnedToCaller: false,
          productionSla: false,
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
          idempotencyMeaning:
            "no-Idempotency-Key-protocol; duplicate-calls-have-no-state-effect",
          retry: {
            applicationOrExternalStateChange: false,
            duplicateRequestStateEffect: "none",
            byteStabilityGuaranteedAcrossTime: false,
            compareWhenRepeating: [
              "capability version",
              "evaluatedOn and knowledgeAsOf",
              "source IDs, retrievedOn and reviewDueOn",
            ],
          },
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
        id: "inspect-case-commons",
        method: "GET",
        href: caseCommonsPath,
        accepts: ["application/json"],
        description:
          "Read decided public-law cases, exact remedy and money meanings, digest-bearing source packets, and the closed marketplace boundary.",
      },
      {
        id: "inspect-professional-opportunities",
        method: "GET",
        href: professionalOpportunitiesPath,
        accepts: ["application/json"],
        description:
          "Read source-backed specialist-work classes, institutional scrutiny, separate money meanings and the local professional-assessment boundary.",
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
        id: "inspect-why-graph-adopters",
        method: "GET",
        href: whyGraphAdoptersPath,
        accepts: ["application/json"],
        description:
          "List current graph-producing endpoints, native subject versions, access boundaries and adopter-owned semantic checks.",
      },
      {
        id: "inspect-professional-tools",
        method: "GET",
        href: professionalToolsPath,
        accepts: ["application/json"],
        description:
          "Read the two executable professional tasks, complete examples, access gap, audit responsibilities and capabilities that are not live.",
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

export function createAgentInterfaceRoutes(options: AgentInterfaceOptions = {}) {
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
