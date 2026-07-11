import type { Context } from "hono";

type ProblemStatus =
  | 400
  | 401
  | 403
  | 404
  | 405
  | 406
  | 408
  | 409
  | 410
  | 412
  | 413
  | 415
  | 422
  | 429
  | 500
  | 501
  | 502
  | 503
  | 504;

export type ProblemNextAction = Readonly<Record<string, unknown>>;

const problemTitles: Readonly<Record<string, string>> = {
  bulk_data_emergency_stop: "Bulk publication emergency stop",
  bulk_data_publication_disabled: "Bulk publication disabled",
  bulk_data_publication_review_needed: "Bulk publication review pending",
  dataset_not_found: "Dataset not found",
  department_records_not_found: "Department records not found",
  enforcement_institution_not_found: "Enforcement institution not found",
  enforcement_office_not_found: "Enforcement office not found",
  invalid_cursor: "Invalid cursor",
  invalid_filter: "Invalid filter",
  invalid_format: "Invalid format",
  invalid_force_id: "Invalid force ID",
  invalid_page: "Invalid page",
  invalid_person_id: "Invalid person ID",
  invalid_query: "Invalid query",
  method_not_allowed: "Method not allowed",
  no_such_door: "Resource not found",
  not_found: "Resource not found",
  office_power_assessment_not_found: "Office assessment not found",
  person_not_current: "Current person record not found",
  person_not_found: "Person not found",
  publication_emergency_stop: "Publication emergency stop",
  publication_emergency_stopped: "Publication emergency stop",
  publication_review_needed: "Publication review pending",
  publication_review_pending: "Publication review pending",
  query_too_long: "Query too long",
  repeated_filter: "Repeated filter",
  repeated_query_parameter: "Repeated query parameter",
  request_failed: "Request failed",
  server_error: "Server error",
  source_privacy_review_needed: "Source privacy review pending",
  source_terms_confirmation_needed: "Source terms review pending",
  unknown_filter: "Unknown filter",
  unknown_query_parameter: "Unknown query parameter",
  upstream_timeout: "Upstream source timeout",
  upstream_unavailable: "Upstream source unavailable",
};

function requestInstance(c: Context) {
  const url = new URL(c.req.url);
  // Query values can contain credentials, personal data or other secrets.
  // The route identifies the failed operation without reflecting those values.
  return url.pathname;
}

function explicitlyRequestsLegacyJson(accept: string | undefined) {
  if (!accept) return false;
  const qualities = new Map<string, number>();
  for (const entry of accept.split(",")) {
    const [mediaType, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters
      .map((parameter) =>
        parameter
          .trim()
          .match(/^q\s*=\s*(0(?:\.\d*)?|1(?:\.0*)?)$/u),
      )
      .find(Boolean)?.[1];
    const parsedQuality = quality === undefined ? 1 : Number(quality);
    qualities.set(
      mediaType,
      Math.max(qualities.get(mediaType) ?? -1, parsedQuality),
    );
  }
  const jsonQuality = qualities.get("application/json") ?? -1;
  const problemQuality = qualities.get("application/problem+json") ?? -1;
  return jsonQuality > 0 && jsonQuality > problemQuality;
}

/**
 * Return an RFC 9457 problem while retaining TaxSorted's established `error`
 * code and endpoint-specific extensions. Public callers can therefore migrate
 * without losing their current recovery logic.
 */
export function problemDetails(
  c: Context,
  status: ProblemStatus,
  options: {
    error: string;
    detail: string;
    title?: string;
    nextActions?: readonly ProblemNextAction[];
    extensions?: Readonly<Record<string, unknown>>;
  },
) {
  const nextActions = [...(options.nextActions ?? [])];
  const body = {
    ...options.extensions,
    type: `https://api.taxsorted.io/problems/${encodeURIComponent(options.error)}`,
    title: options.title ?? problemTitles[options.error] ?? "Request failed",
    status,
    detail: options.detail,
    instance: requestInstance(c),
    error: options.error,
    nextActions,
  };

  c.header("Cache-Control", "no-store");
  c.header(
    "Content-Type",
    explicitlyRequestsLegacyJson(c.req.header("Accept"))
      ? "application/json; charset=utf-8"
      : "application/problem+json; charset=utf-8",
  );
  c.header("Vary", "Accept");
  c.header("X-Content-Type-Options", "nosniff");
  if (c.req.method === "HEAD") return c.body(null, status);
  return c.body(JSON.stringify(body), status);
}

export function noSuchDoorProblem(c: Context) {
  return problemDetails(c, 404, {
    error: "no_such_door",
    detail: "No public API route matches this request.",
    nextActions: [
      {
        id: "discover-api",
        method: "GET",
        href: "/agent.txt",
        accepts: ["text/plain"],
        description: "Read the public machine doorway and its resource map.",
      },
    ],
  });
}
