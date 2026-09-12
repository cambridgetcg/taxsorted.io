import type { MiddlewareHandler } from "hono";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Cookie-authenticated route trees must reject unsafe requests before session
 * middleware can touch the database or issue cookies, including anonymous
 * account ceremonies. Match complete configured origins without normalising,
 * inferring from Referer/Host, or trusting a sibling subdomain.
 *
 * Mount only on browser routes. OAuth GET callbacks retain their signed-state
 * checks; workspace-key requests have their own authentication boundary.
 */
export function browserMutationOrigin(
  allowedOrigins: readonly string[],
): MiddlewareHandler {
  return async (c, next) => {
    if (!SAFE_METHODS.has(c.req.method)) {
      const origin = c.req.header("Origin");
      if (!origin || !allowedOrigins.includes(origin)) {
        c.header("Cache-Control", "private, no-store");
        c.header("Pragma", "no-cache");
        c.header("X-Content-Type-Options", "nosniff");
        return c.json({
          error: "bad_origin",
          message: "This request came from somewhere we don't recognise.",
          requestId: c.get("requestId") ?? "unavailable",
        }, 403);
      }
    }
    await next();
  };
}
