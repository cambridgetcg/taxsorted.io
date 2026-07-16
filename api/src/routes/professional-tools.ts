import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  apiWorkspacePath,
  professionalToolsAccess,
  professionalToolsOpenApiPath,
  workspaceKeyRecoveryActions,
} from "../professional-tools-contract.js";
import {
  mtdIncomeTaxAssessmentRequestExample,
  sdltCalculationRequestExample,
} from "../professional-tools-examples.js";
import { SdltCalculationRequestSchema } from "./sdlt.js";
import { MtdIncomeTaxAssessmentRequestSchema } from "./tax-expert.js";

SdltCalculationRequestSchema.parse(sdltCalculationRequestExample);
MtdIncomeTaxAssessmentRequestSchema.parse(mtdIncomeTaxAssessmentRequestExample);

const ProfessionalNextAction = z.object({
  id: z.string(),
  method: z.literal("GET"),
  href: z.string(),
  accepts: z.array(z.string()),
  description: z.string(),
});

const ProfessionalTask = z.object({
  id: z.string(),
  title: z.string(),
  for: z.array(
    z.enum(["solicitors-and-conveyancers", "accountants-and-tax-advisers"]),
  ),
  stage: z.enum(["classified", "calculated"]),
  availability: z.literal("credentialed-design-partner"),
  operationId: z.string(),
  method: z.literal("POST"),
  href: z.string(),
  requiredScope: z.string(),
  boundedJob: z.string(),
  reviewStops: z.array(z.string()),
  request: z.object({
    contentType: z.literal("application/json"),
    maximumBytes: z.literal(16_384),
    directIdentifiersRequested: z.literal(false),
    doNotSend: z.array(z.string()),
    example: z.object({}).passthrough(),
    shell: z.string(),
  }),
  result: z.object({
    possibleStatuses: z.array(z.string()),
    evidence: z.array(z.string()),
    doesNotDo: z.array(z.string()),
  }),
  retry: z.object({
    applicationOrExternalStateChange: z.literal(false),
    duplicateRequestStateEffect: z.literal("none"),
    byteStabilityGuaranteedAcrossTime: z.literal(false),
    compareWhenRepeating: z.array(z.string()),
  }),
});

export const ProfessionalToolsManifestSchema = z
  .object({
    schema: z.literal("taxsorted.uk.professional-tools/1"),
    reviewedOn: z.iso.date(),
    status: z.literal("credentialed-design-partner"),
    for: z.tuple([
      z.literal("solicitors-and-conveyancers"),
      z.literal("accountants-and-tax-advisers"),
    ]),
    purpose: z.string(),
    access: z.object({
      availability: z.literal("credentialed-design-partner"),
      authentication: z.literal("Bearer TaxSorted workspace key"),
      intendedClient: z.literal("server-to-server"),
      publicSelfServiceKeyProvisioning: z.literal(false),
      confidentialAccessRequestIntake: z.literal(false),
      browserAccountProvidesWorkspaceKey: z.literal(false),
      workspaceKeyIdentifiesCallingWorkspace: z.literal(true),
      requestFactsMayBePersonalData: z.literal(true),
      credentialInspection: z.object({
        method: z.literal("GET"),
        href: z.literal("/v1/api-workspace"),
        authentication: z.literal("Bearer TaxSorted workspace key"),
        requiredWorkspaceScopes: z.array(z.string()).max(0),
        intendedClient: z.literal("server-to-server"),
        browserCorsAuthorizationHeaderAllowed: z.literal(false),
        acceptsQueryParameters: z.literal(false),
        acceptsRequestBody: z.literal(false),
        acceptsClientFacts: z.literal(false),
        changesState: z.literal(false),
      }),
      currentGap: z.string(),
    }),
    openApi: z.object({
      href: z.literal("/openapi/professional-tools-uk.json"),
      mediaType: z.literal("application/vnd.oai.openapi+json;version=3.1"),
    }),
    tasks: z.array(ProfessionalTask).length(2),
    practiceRecord: z.object({
      applicationStoresRequestsOrResults: z.literal(false),
      immutableEvidenceArchiveAvailable: z.literal(false),
      signedEvidencePackAvailable: z.literal(false),
      callerMustRetain: z.array(z.string()),
      statement: z.string(),
    }),
    keyLifecycle: z.object({
      operatorManaged: z.literal(true),
      issueExistingWorkspace: z.literal(true),
      overlappingRotation: z.literal(true),
      explicitRevocation: z.literal(true),
      newKeysRequireFiniteExpiry: z.literal(true),
      selfService: z.literal(false),
      securePublicDeliveryAvailable: z.literal(false),
      authenticatedAdminAuditTrailAvailable: z.literal(false),
      statement: z.string(),
    }),
    boundaries: z.object({
      clientOrMatterRecords: z.literal(false),
      clientMatterReference: z.literal(false),
      portfolioOrBatchOperations: z.literal(false),
      firmUsersRolesOrApprovals: z.literal(false),
      documentUploadOrStorage: z.literal(false),
      hmrcAgentAuthority: z.literal(false),
      filingOrSubmission: z.literal(false),
      taskRoutesConnectToHmrc: z.literal(false),
      productionSla: z.literal(false),
      publishedRateLimitContract: z.literal(false),
      publishedProfessionalPrivacyAndRetentionPolicy: z.literal(false),
      publishedSecurityAssessment: z.literal(false),
      selfServiceKeyRotationOrRevocation: z.literal(false),
      publishedHighAvailabilityContract: z.literal(false),
      statement: z.string(),
    }),
    workflow: z.array(
      z.object({
        step: z.number().int().positive(),
        action: z.string(),
      }),
    ),
    nextActions: z.array(ProfessionalNextAction),
  })
  .openapi("UkProfessionalToolsManifest");

function buildProfessionalToolsManifest(apiOrigin: string) {
  const origin = apiOrigin.replace(/\/+$/u, "");
  return ProfessionalToolsManifestSchema.parse({
    schema: "taxsorted.uk.professional-tools/1",
    reviewedOn: "2026-07-15",
    status: "credentialed-design-partner",
    for: ["solicitors-and-conveyancers", "accountants-and-tax-advisers"],
    purpose:
      "Describe the professional jobs TaxSorted can run now, the evidence a firm must keep, and every material boundary around those jobs.",
    access: {
      ...professionalToolsAccess,
      authentication: "Bearer TaxSorted workspace key",
      intendedClient: "server-to-server",
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
      },
      currentGap:
        "Operators can issue, inspect, overlap-rotate and revoke keys for existing design partners. No public or confidential access-request route or secure public key-delivery channel is live, self-service lifecycle is not available, and a browser account does not supply a workspace key. The key identifies the calling workspace, and minimized financial or transaction facts may still be personal data without direct identifiers.",
    },
    openApi: {
      href: professionalToolsOpenApiPath,
      mediaType: "application/vnd.oai.openapi+json;version=3.1",
    },
    tasks: [
      {
        id: "residential-sdlt-calculation",
        title: "Calculate one ordinary residential SDLT transaction",
        for: ["solicitors-and-conveyancers", "accountants-and-tax-advisers"],
        stage: "calculated",
        availability: professionalToolsAccess.availability,
        operationId: "calculateResidentialSdlt",
        method: "POST",
        href: "/v1/uk/sdlt/calculations",
        requiredScope: "sdlt:calculate",
        boundedJob:
          "Calculate one residential dwelling in England or Northern Ireland after the caller supplies the legal classifications.",
        reviewStops: [
          "An effective date before the admitted ruleset starts on 1 April 2025",
          "A jurisdiction outside England or Northern Ireland",
          "Mixed or non-residential land",
          "A new lease whose rent may also be taxed on net present value",
          "More than one dwelling",
          "A company, trust, partnership, other or unknown buyer kind",
          "Linked transactions, shared ownership, other relief, complex consideration or a possible transitional contract",
          "An unknown material classification or a future effective date",
        ],
        request: {
          contentType: "application/json",
          maximumBytes: 16_384,
          directIdentifiersRequested: false,
          doNotSend: [
            "client name",
            "property address",
            "National Insurance number",
            "Unique Taxpayer Reference",
            "matter file or privileged documents",
          ],
          example: sdltCalculationRequestExample,
          shell: `curl --request POST ${origin}/v1/uk/sdlt/calculations --header "Authorization: Bearer \${TAXSORTED_API_KEY}" --header 'Content-Type: application/json' --data @request.json`,
        },
        result: {
          possibleStatuses: ["calculated", "needs_review"],
          evidence: [
            "deterministic request hash",
            "trusted server evaluation date",
            "ruleset identity and revision",
            "dated primary and HMRC sources",
            "assumptions, decisions and review reasons",
          ],
          doesNotDo: [
            "decide facts or legal classifications for the caller",
            "create a client or matter record",
            "prepare or submit an SDLT return",
            "provide a filing receipt or signed evidence pack",
          ],
        },
        retry: {
          applicationOrExternalStateChange: false,
          duplicateRequestStateEffect: "none",
          byteStabilityGuaranteedAcrossTime: false,
          compareWhenRepeating: [
            "request hash",
            "evaluatedOn",
            "ruleset revision",
            "source review dates",
          ],
        },
      },
      {
        id: "mtd-income-tax-readiness",
        title: "Classify MTD Income Tax readiness and 2026/27 deadlines",
        for: ["accountants-and-tax-advisers"],
        stage: "classified",
        availability: professionalToolsAccess.availability,
        operationId: "assessMtdIncomeTaxReadiness",
        method: "POST",
        href: "/v1/uk/tax-expert/mtd-income-tax/assessments",
        requiredScope: "tax-expert:assess",
        boundedJob:
          "Classify readiness from explicit Self Assessment, gross-income, activity, exemption and reporting-period facts.",
        reviewStops: [
          "A required material fact is unknown or missing",
          "HMRC approval or another HMRC decision is needed",
          "A required return is unsubmitted, amended or affected by a special qualifying-income rule",
          "Entry-continuation and final-cessation facts conflict",
          "A complex return exemption indicator needs its own duration or activity analysis",
          "A calendar-period cessation from 1 to 5 April crosses the tax-year boundary",
          "Non-UK residence conflicts with the supplied SA109 return evidence",
          "The effective source ledger needs review",
          "The requested date is outside the supported boundary",
        ],
        request: {
          contentType: "application/json",
          maximumBytes: 16_384,
          directIdentifiersRequested: false,
          doNotSend: [
            "client name",
            "National Insurance number",
            "Unique Taxpayer Reference",
            "address",
            "tax return or privileged documents",
          ],
          example: mtdIncomeTaxAssessmentRequestExample,
          shell: `curl --request POST ${origin}/v1/uk/tax-expert/mtd-income-tax/assessments --header "Authorization: Bearer \${TAXSORTED_API_KEY}" --header 'Content-Type: application/json' --data @request.json`,
        },
        result: {
          possibleStatuses: [
            "determined",
            "needs_facts",
            "needs_professional_review",
            "conflicting_authority",
            "unsupported",
          ],
          evidence: [
            "capability version and applicability dates",
            "provided, derived, unknown and assumed facts",
            "reasoning steps and why graph",
            "dated sources, legal force and claim links",
            "confidence basis, escalation and next facts",
          ],
          doesNotDo: [
            "store the assessment as a client or matter record",
            "return a deterministic request hash",
            "sign up a person for MTD",
            "prepare or submit an update or return",
            "provide a filing receipt or signed evidence pack",
          ],
        },
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
      },
    ],
    practiceRecord: {
      applicationStoresRequestsOrResults: false,
      immutableEvidenceArchiveAvailable: false,
      signedEvidencePackAvailable: false,
      callerMustRetain: [
        "the exact request body sent",
        "the exact response body received",
        "the X-Request-ID response header",
        "the returned request hash when present",
        "capability or ruleset versions and every relied-on source",
        "the firm's fact classification, reviewer and sign-off record",
      ],
      statement:
        "TaxSorted returns a bounded computation, not a retrievable professional file. The firm must preserve its own evidence and approval record at the time of reliance.",
    },
    keyLifecycle: {
      operatorManaged: true,
      issueExistingWorkspace: true,
      overlappingRotation: true,
      explicitRevocation: true,
      newKeysRequireFiniteExpiry: true,
      selfService: false,
      securePublicDeliveryAvailable: false,
      authenticatedAdminAuditTrailAvailable: false,
      statement:
        "An operator can inspect, mint an expiring replacement without disabling the old key, and explicitly revoke a key by immutable ID plus prefix confirmation. The caller can inspect only the presented key. Public delivery, self-service and an authenticated operator audit trail are not live.",
    },
    boundaries: {
      clientOrMatterRecords: false,
      clientMatterReference: false,
      portfolioOrBatchOperations: false,
      firmUsersRolesOrApprovals: false,
      documentUploadOrStorage: false,
      hmrcAgentAuthority: false,
      filingOrSubmission: false,
      taskRoutesConnectToHmrc: false,
      productionSla: false,
      publishedRateLimitContract: false,
      publishedProfessionalPrivacyAndRetentionPolicy: false,
      publishedSecurityAssessment: false,
      selfServiceKeyRotationOrRevocation: false,
      publishedHighAvailabilityContract: false,
      statement:
        "These task routes are not a practice-management, document-management, approval or filing system. The separate browser HMRC rail is sandbox-only and is not connected to workspace-key tasks. Rate-limit, professional privacy and retention, security assessment, self-service key lifecycle, authenticated operator audit, high-availability and SLA contracts are not published.",
    },
    workflow: [
      {
        step: 1,
        action:
          "Read this manifest and the professional OpenAPI before collecting client facts.",
      },
      {
        step: 2,
        action:
          "With an issued key, inspect its mode, scopes and expiry without sending client facts.",
      },
      {
        step: 3,
        action:
          "Choose one bounded task and classify every required fact; use unknown instead of guessing.",
      },
      {
        step: 4,
        action:
          "Send only the requested facts from a server and keep direct identifiers and documents in the firm's own system.",
      },
      {
        step: 5,
        action:
          "Stop when the result requests review, more facts, an HMRC decision or source review.",
      },
      {
        step: 6,
        action:
          "Archive the exact exchange, source versions, professional decision and sign-off in the firm's matter file.",
      },
    ],
    nextActions: [
      ...workspaceKeyRecoveryActions("selected task"),
      {
        id: "inspect-presented-workspace-key",
        method: "GET",
        href: apiWorkspacePath,
        accepts: ["application/json"],
        description:
          "With a valid workspace key, verify only that key's mode, scopes, expiry and authorised tasks without sending client facts.",
      },
      {
        id: "inspect-tax-capability-registry",
        method: "GET",
        href: "/v1/uk/tax-expert",
        accepts: ["application/json"],
        description:
          "Check which UK tax journeys are available, limited or only planned.",
      },
    ],
  });
}

const manifestRoute = createRoute({
  method: "get",
  path: "/",
  operationId: "getUkProfessionalTools",
  summary: "Discover bounded tools for UK lawyers and accountants",
  description:
    "Public integration contract for the professional tasks that run now, their access and evidence boundaries, and the capabilities that are not live.",
  tags: ["UK professional tools"],
  security: [],
  responses: {
    200: {
      description:
        "Current professional task, access, practice-record and workflow boundaries.",
      content: {
        "application/json": { schema: ProfessionalToolsManifestSchema },
      },
    },
  },
});

export function createProfessionalToolsRoutes(
  apiOrigin = "https://api.taxsorted.io",
) {
  const professionalToolsManifest = buildProfessionalToolsManifest(apiOrigin);
  const routes = new OpenAPIHono();
  routes.openapi(manifestRoute, (c) => {
    c.header("Cache-Control", "public, max-age=300, must-revalidate");
    c.header("X-Schema-Version", professionalToolsManifest.schema);
    c.header(
      "Link",
      `<${professionalToolsOpenApiPath}>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
    );
    return c.json(professionalToolsManifest, 200);
  });
  return routes;
}
