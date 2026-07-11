import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { isPublicCivicPath } from "./cors.js";
import { problemDetails } from "./problem-details.js";

function requestIdFor(c: Context): string {
  return c.get("requestId") ?? "unavailable";
}

/** Keep public failures structured without echoing tax facts or credentials. */
export function apiErrorHandler(error: Error, c: Context) {
  if (
    error instanceof HTTPException &&
    error.status === 400 &&
    c.req.method === "POST" &&
    c.req.path === "/v1/uk/sdlt/calculations"
  ) {
    return c.json(
      {
        error: "invalid_json",
        message: "Send one complete JSON object as the calculation request.",
        requestId: requestIdFor(c),
      },
      400
    );
  }

  if (error instanceof HTTPException) return error.getResponse();

  // Do not print request bodies, headers, database values or stack traces.
  console.error(`server_error request_id=${requestIdFor(c)} name=${error.name}`);
  if (isPublicCivicPath(c.req.path)) {
    const detail = "Something went wrong while handling the request.";
    return problemDetails(c, 500, {
      error: "server_error",
      detail,
      extensions: {
        message: detail,
        requestId: requestIdFor(c),
      },
      nextActions: [
        {
          method: "GET",
          href: "/v1/health",
          description: "Check service health before retrying the request.",
        },
      ],
    });
  }
  return c.json(
    {
      error: "server_error",
      message: "Something went wrong while handling the request.",
      requestId: requestIdFor(c),
    },
    500
  );
}
