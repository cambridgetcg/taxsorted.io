export const professionalToolsPath = "/v1/uk/professional-tools";
export const professionalToolsOpenApiPath =
  "/openapi/professional-tools-uk.json";

export const professionalToolsAccess = {
  availability: "credentialed-design-partner",
  publicSelfServiceKeyProvisioning: false,
  confidentialAccessRequestIntake: false,
  browserAccountProvidesWorkspaceKey: false,
  workspaceKeyIdentifiesCallingWorkspace: true,
  requestFactsMayBePersonalData: true,
} as const;

export const professionalTaskResponseHeaders = {
  "X-Request-ID": {
    description:
      "The request identifier to retain with the exact request and response in the caller's matter file.",
    schema: { type: "string", format: "uuid" },
  },
  Link: {
    description:
      "Links to the task-sized OpenAPI description or the professional-tools contract.",
    schema: { type: "string" },
  },
  "Cache-Control": {
    description:
      "Every task success and error is private to the call and is returned with no-store.",
    schema: { type: "string", enum: ["no-store"] as string[] },
  },
} as const;

export const professionalAuthenticationResponseHeaders = {
  ...professionalTaskResponseHeaders,
  "WWW-Authenticate": {
    description:
      "Bearer challenge. A 401 reports invalid_token; a 403 reports insufficient_scope and the required scope.",
    schema: { type: "string" },
  },
} as const;

export function workspaceKeyRecoveryActions(requiredScope: string) {
  return [
    {
      id: "inspect-professional-tools",
      method: "GET",
      href: professionalToolsPath,
      accepts: ["application/json"],
      description:
        "Read the available professional tasks, scope boundary and current access gap.",
    },
    {
      id: "inspect-professional-openapi",
      method: "GET",
      href: professionalToolsOpenApiPath,
      accepts: [
        "application/vnd.oai.openapi+json;version=3.1",
        "application/json",
      ],
      description: `Inspect complete request examples and the operation that requires the ${requiredScope} scope.`,
    },
  ] as const;
}
