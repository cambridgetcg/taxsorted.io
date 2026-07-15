import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { authenticateApiKey } from "../api-key.js";
import {
  professionalAuthenticationResponseHeaders,
  professionalTaskResponseHeaders,
  professionalToolsAccess,
  professionalToolsOpenApiPath,
  professionalToolsPath,
} from "../professional-tools-contract.js";

export { apiWorkspacePath } from "../professional-tools-contract.js";

const NextAction = z.object({
  id: z.string(),
  method: z.literal("GET"),
  href: z.string(),
  accepts: z.array(z.string()),
  description: z.string(),
}).strict();

const AuthenticationError = z.object({
  error: z.literal("invalid_api_key"),
  message: z.string(),
  requestId: z.string().optional(),
  access: z.object({
    availability: z.literal("credentialed-design-partner"),
    publicSelfServiceKeyProvisioning: z.literal(false),
    confidentialAccessRequestIntake: z.literal(false),
    browserAccountProvidesWorkspaceKey: z.literal(false),
    workspaceKeyIdentifiesCallingWorkspace: z.literal(true),
    requestFactsMayBePersonalData: z.literal(true),
  }).strict(),
  nextActions: z.array(NextAction),
}).strict().openapi("ApiWorkspaceAuthenticationError");

const ApiWorkspaceError = z.object({
  error: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
}).strict().openapi("ApiWorkspaceError");

const SdltCapability = z.object({
  id: z.literal("residential-sdlt-calculation"),
  authorized: z.boolean(),
  method: z.literal("POST"),
  href: z.literal("/v1/uk/sdlt/calculations"),
  requiredScope: z.literal("sdlt:calculate"),
}).strict();

const MtdCapability = z.object({
  id: z.literal("mtd-income-tax-readiness"),
  authorized: z.boolean(),
  method: z.literal("POST"),
  href: z.literal("/v1/uk/tax-expert/mtd-income-tax/assessments"),
  requiredScope: z.literal("tax-expert:assess"),
}).strict();

const ApiWorkspaceResponse = z.object({
  schema: z.literal("taxsorted.api-workspace/1"),
  evaluatedAt: z.iso.datetime(),
  workspace: z.object({
    id: z.uuid(),
  }).strict(),
  presentedKey: z.object({
    id: z.uuid(),
    prefix: z.string().regex(/^ts_(test|live)_[A-Za-z0-9_-]{8}$/),
    mode: z.enum(["test", "live"]),
    scopes: z.array(z.string()).min(1).openapi({ uniqueItems: true }),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime().nullable(),
  }).strict(),
  capabilities: z.tuple([SdltCapability, MtdCapability]),
  boundaries: z.object({
    intendedClient: z.literal("server-to-server"),
    browserCorsAuthorizationHeaderAllowed: z.literal(false),
    acceptsQueryParameters: z.literal(false),
    acceptsRequestBody: z.literal(false),
    acceptsClientFacts: z.literal(false),
    storesClientFacts: z.literal(false),
    revealsOtherKeys: z.literal(false),
    workspaceNameReturned: z.literal(false),
    keyNameReturned: z.literal(false),
    keyHashReturned: z.literal(false),
    revocationHistoryReturned: z.literal(false),
    browserAccountLinked: z.literal(false),
    hmrcConnectionLinked: z.literal(false),
    mutatesWorkspaceOrKey: z.literal(false),
    statement: z.string(),
  }).strict(),
}).strict().openapi("ApiWorkspaceResponse");

type ApiWorkspaceCapabilities = z.infer<
  typeof ApiWorkspaceResponse
>["capabilities"];

const inspectRoute = createRoute({
  method: "get",
  path: "/",
  operationId: "inspectAuthenticatedApiWorkspace",
  summary: "Inspect the workspace represented by this API key",
  description:
    "Returns only the authenticated workspace UUID, safe metadata for the presented key and its current task authorization. Any query string or declared request body is rejected with 400 before authentication. It accepts no client facts, reveals no sibling keys and changes no state.",
  tags: ["UK professional tools"],
  security: [{ WorkspaceKey: [] }],
  "x-taxsorted-required-workspace-scopes": [],
  responses: {
    200: {
      description:
        "The workspace identity and capabilities represented by the presented active key.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: ApiWorkspaceResponse } },
    },
    400: {
      description:
        "The URL contains a query string or the request declares a body. Client, matter and credential facts are not accepted by this route.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: ApiWorkspaceError } },
    },
    401: {
      description: "The workspace key is missing, malformed, expired or revoked.",
      headers: professionalAuthenticationResponseHeaders,
      content: { "application/json": { schema: AuthenticationError } },
    },
    500: {
      description:
        "An unexpected server error. No credential, query value or workspace metadata is echoed.",
      headers: professionalTaskResponseHeaders,
      content: { "application/json": { schema: ApiWorkspaceError } },
    },
  },
});

export interface ApiWorkspaceRouteOptions {
  now?: () => Date;
}

export function createApiWorkspaceRoutes(options: ApiWorkspaceRouteOptions = {}) {
  const now = options.now ?? (() => new Date());
  const routes = new OpenAPIHono();

  routes.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header(
      "Link",
      [
        `<${professionalToolsPath}>; rel="help"; type="application/json"`,
        `<${professionalToolsOpenApiPath}>; rel="service-desc"; type="application/vnd.oai.openapi+json;version=3.1"`,
      ].join(", "),
    );
    if (c.req.url.includes("?")) {
      return c.json({
        error: "query_not_allowed",
        message:
          "Call this path without a query string. Do not put client, matter or credential facts in a URL.",
        requestId: c.get("requestId") ?? "unavailable",
      }, 400);
    }
    const contentLength = c.req.header("content-length");
    const transferEncoding = c.req.header("transfer-encoding");
    if (
      transferEncoding !== undefined ||
      (contentLength !== undefined && contentLength !== "0")
    ) {
      return c.json({
        error: "request_body_not_allowed",
        message:
          "Call this path without a request body. Client, matter and credential facts are not accepted here.",
        requestId: c.get("requestId") ?? "unavailable",
      }, 400);
    }
    await next();
  });
  routes.use("*", authenticateApiKey());

  routes.openapi(inspectRoute, (c) => {
    const workspace = c.get("apiWorkspace");
    const key = c.get("apiPresentedKey");
    const scopes = [...new Set(key.scopes)].sort();
    const capabilities: ApiWorkspaceCapabilities = [
      {
        id: "residential-sdlt-calculation",
        authorized: scopes.includes("sdlt:calculate"),
        method: "POST",
        href: "/v1/uk/sdlt/calculations",
        requiredScope: "sdlt:calculate",
      },
      {
        id: "mtd-income-tax-readiness",
        authorized: scopes.includes("tax-expert:assess"),
        method: "POST",
        href: "/v1/uk/tax-expert/mtd-income-tax/assessments",
        requiredScope: "tax-expert:assess",
      },
    ];
    return c.json({
      schema: "taxsorted.api-workspace/1" as const,
      evaluatedAt: now().toISOString(),
      workspace: { id: workspace.id },
      presentedKey: {
        id: key.id,
        prefix: key.prefix,
        mode: key.mode,
        scopes,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
      },
      capabilities,
      boundaries: {
        intendedClient: "server-to-server" as const,
        browserCorsAuthorizationHeaderAllowed: false as const,
        acceptsQueryParameters: false as const,
        acceptsRequestBody: false as const,
        acceptsClientFacts: false as const,
        storesClientFacts: false as const,
        revealsOtherKeys: false as const,
        workspaceNameReturned: false as const,
        keyNameReturned: false as const,
        keyHashReturned: false as const,
        revocationHistoryReturned: false as const,
        browserAccountLinked: false as const,
        hmrcConnectionLinked: false as const,
        mutatesWorkspaceOrKey: false as const,
        statement:
          "This read-only response describes only the presented key. A query string or declared request body is rejected. It accepts and stores no client facts, reveals no other key, and is not linked to a browser account or HMRC connection.",
      },
    }, 200);
  });

  return routes;
}
