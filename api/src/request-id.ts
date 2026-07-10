import { randomUUID } from "node:crypto";
import type { Context, Next } from "hono";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
  }
}

/** One server-issued identifier per call. Caller values are never trusted or reflected. */
export async function requestId(c: Context, next: Next) {
  const id = randomUUID();
  c.set("requestId", id);
  await next();
  c.header("X-Request-Id", id);
}
