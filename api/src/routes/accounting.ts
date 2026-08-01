// Browser routes for the first provider-neutral accounting connector proof.
// The only mounted provider is deterministic and synthetic. Every door needs
// a full passkey session; every mutation also needs an exact allowlisted Origin.

import { Hono, type Context } from "hono";
import { z } from "zod";
import {
  AccountingError,
  type AccountingServiceContract,
  type SyncKind,
} from "../accounting.js";

type Flag = boolean | (() => boolean);

export interface AccountingRouteOptions {
  service: AccountingServiceContract;
  allowedOrigins: readonly string[];
  syntheticEnabled: Flag;
  connectorEmergencyStop: Flag;
  syncEmergencyStop: Flag;
}

const Uuid = z.string().uuid();
const Fence = z.string().regex(/^[1-9]\d*$/u);
const Digest = z.string().regex(/^sha256:[0-9a-f]{64}$/u);

const EmptyBody = z.object({}).strict();
const ReplicaBody = z.object({ localReplicaId: Uuid }).strict();
const SourceConnectionBody = z
  .object({
    authorisationId: Uuid,
    entityId: Uuid,
    organisationId: z.string().trim().min(1).max(240),
  })
  .strict();
const StartRunBody = z
  .object({
    replicaId: Uuid,
    localReplicaId: Uuid,
    expectedCompletedRunId: Uuid.nullable(),
    dataset: z.literal("bank-transactions"),
    kind: z.enum(["initial", "incremental"]).default("initial"),
  })
  .strict();
const FenceBody = z.object({ fence: Fence, localReplicaId: Uuid }).strict();
const AcknowledgementBody = z
  .object({
    manifestId: Uuid,
    runId: Uuid,
    replicaId: Uuid,
    dataset: z.literal("bank-transactions"),
    sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    fence: Fence,
    digest: Digest,
    localReplicaId: Uuid,
  })
  .strict();

function enabled(flag: Flag): boolean {
  return typeof flag === "function" ? flag() : flag;
}

function errorBody(c: Context, error: string, message: string) {
  return {
    error,
    message,
    requestId: c.get("requestId") ?? "unavailable",
  };
}

function invalidBody(c: Context, issues: z.core.$ZodIssue[]) {
  return c.json(
    {
      ...errorBody(c, "invalid_request", "Some connector details need fixing."),
      issues: issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
        message: issue.message,
      })),
    },
    422,
  );
}

async function jsonBody(c: Context): Promise<unknown> {
  return await c.req.json().catch(() => ({}));
}

async function answer(
  c: Context,
  operation: () => Promise<Record<string, unknown>>,
  successStatus: 200 | 201 = 200,
) {
  try {
    return c.json(await operation(), successStatus);
  } catch (error) {
    if (error instanceof AccountingError) {
      return c.json(errorBody(c, error.code, error.message), error.status);
    }
    throw error;
  }
}

function connectorGate(c: Context, options: AccountingRouteOptions) {
  if (enabled(options.connectorEmergencyStop)) {
    return c.json(
      errorBody(
        c,
        "accounting_connector_stopped",
        "The accounting connector emergency stop is active.",
      ),
      503,
    );
  }
  if (!enabled(options.syntheticEnabled)) {
    return c.json(
      errorBody(
        c,
        "synthetic_provider_disabled",
        "The made-up accounting provider is disabled in this environment.",
      ),
      404,
    );
  }
  return null;
}

function syncGate(c: Context, options: AccountingRouteOptions) {
  const connector = connectorGate(c, options);
  if (connector) return connector;
  if (enabled(options.syncEmergencyStop)) {
    return c.json(
      errorBody(
        c,
        "accounting_sync_stopped",
        "The accounting sync emergency stop is active. No checkpoint can advance.",
      ),
      503,
    );
  }
  return null;
}

export function createAccountingRoutes(options: AccountingRouteOptions) {
  const routes = new Hono();

  routes.use("*", async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    c.header("Pragma", "no-cache");
    c.header("X-Content-Type-Options", "nosniff");

    const userId = c.get("userId");
    if (!userId) {
      return c.json(
        errorBody(
          c,
          "passkey_needed",
          "Sign in with a passkey before connecting accounting software.",
        ),
        403,
      );
    }

    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const origin = c.req.header("Origin");
      if (!origin || !options.allowedOrigins.includes(origin)) {
        return c.json(
          errorBody(
            c,
            "bad_origin",
            "This request came from somewhere we do not recognise.",
          ),
          403,
        );
      }
    }
    await next();
  });

  routes.post("/authorisations/:provider/start", async (c) => {
    const gate = connectorGate(c, options);
    if (gate) return gate;
    if (c.req.param("provider") !== "synthetic") {
      return c.json(
        errorBody(c, "provider_unavailable", "That accounting provider is not available."),
        404,
      );
    }
    const parsed = EmptyBody.safeParse(await jsonBody(c));
    if (!parsed.success) return invalidBody(c, parsed.error.issues);
    return answer(
      c,
      () => options.service.startAuthorisation(c.get("userId")!, "synthetic"),
      201,
    );
  });

  routes.get("/authorisations/:id/organisations", async (c) => {
    const gate = connectorGate(c, options);
    if (gate) return gate;
    const parsed = Uuid.safeParse(c.req.param("id"));
    if (!parsed.success) return invalidBody(c, parsed.error.issues);
    return answer(c, () =>
      options.service.listOrganisations(c.get("userId")!, parsed.data),
    );
  });

  routes.post("/source-connections", async (c) => {
    const gate = connectorGate(c, options);
    if (gate) return gate;
    const parsed = SourceConnectionBody.safeParse(await jsonBody(c));
    if (!parsed.success) return invalidBody(c, parsed.error.issues);
    return answer(
      c,
      () => options.service.createSourceConnection(c.get("userId")!, parsed.data),
      201,
    );
  });

  // Status remains readable while either stop is active so the person can see
  // what is linked and what last completed. It never contacts the provider.
  routes.get("/source-connections/:id/status", async (c) => {
    const parsed = Uuid.safeParse(c.req.param("id"));
    if (!parsed.success) return invalidBody(c, parsed.error.issues);
    const localReplicaId = Uuid.safeParse(c.req.query("localReplicaId"));
    if (!localReplicaId.success) return invalidBody(c, localReplicaId.error.issues);
    return answer(c, () =>
      options.service.sourceStatus(
        c.get("userId")!,
        c.get("deviceId"),
        parsed.data,
        localReplicaId.data,
      ),
    );
  });

  routes.post("/source-connections/:id/replicas", async (c) => {
    const gate = connectorGate(c, options);
    if (gate) return gate;
    const id = Uuid.safeParse(c.req.param("id"));
    if (!id.success) return invalidBody(c, id.error.issues);
    const body = ReplicaBody.safeParse(await jsonBody(c));
    if (!body.success) return invalidBody(c, body.error.issues);
    return answer(
      c,
      () => options.service.createReplica(
        c.get("userId")!,
        c.get("deviceId"),
        id.data,
        body.data,
      ),
      201,
    );
  });

  routes.post("/source-connections/:id/sync-runs", async (c) => {
    const gate = syncGate(c, options);
    if (gate) return gate;
    const id = Uuid.safeParse(c.req.param("id"));
    if (!id.success) return invalidBody(c, id.error.issues);
    const body = StartRunBody.safeParse(await jsonBody(c));
    if (!body.success) return invalidBody(c, body.error.issues);
    return answer(
      c,
      () => options.service.startRun(
        c.get("userId")!,
        c.get("deviceId"),
        id.data,
        body.data as {
          replicaId: string;
          localReplicaId: string;
          expectedCompletedRunId: string | null;
          dataset: string;
          kind: SyncKind;
        },
      ),
      201,
    );
  });

  routes.post("/sync-runs/:id/lease", async (c) => {
    const gate = syncGate(c, options);
    if (gate) return gate;
    const id = Uuid.safeParse(c.req.param("id"));
    if (!id.success) return invalidBody(c, id.error.issues);
    const body = FenceBody.safeParse(await jsonBody(c));
    if (!body.success) return invalidBody(c, body.error.issues);
    return answer(c, () =>
      options.service.renewLease(
        c.get("userId")!,
        c.get("deviceId"),
        id.data,
        body.data.fence,
        body.data.localReplicaId,
      ),
    );
  });

  routes.post("/sync-runs/:id/pages/:dataset", async (c) => {
    const gate = syncGate(c, options);
    if (gate) return gate;
    const id = Uuid.safeParse(c.req.param("id"));
    if (!id.success) return invalidBody(c, id.error.issues);
    if (c.req.param("dataset") !== "bank-transactions") {
      return c.json(
        errorBody(c, "dataset_unavailable", "That dataset is not available."),
        422,
      );
    }
    const body = FenceBody.safeParse(await jsonBody(c));
    if (!body.success) return invalidBody(c, body.error.issues);
    return answer(c, () =>
      options.service.pullPage(
        c.get("userId")!,
        c.get("deviceId"),
        id.data,
        "bank-transactions",
        body.data.fence,
        body.data.localReplicaId,
      ),
    );
  });

  routes.post("/sync-runs/:id/acknowledgements", async (c) => {
    const gate = syncGate(c, options);
    if (gate) return gate;
    const id = Uuid.safeParse(c.req.param("id"));
    if (!id.success) return invalidBody(c, id.error.issues);
    const body = AcknowledgementBody.safeParse(await jsonBody(c));
    if (!body.success) return invalidBody(c, body.error.issues);
    if (body.data.runId !== id.data) {
      return c.json(
        errorBody(
          c,
          "page_manifest_mismatch",
          "The acknowledgement run does not match the route.",
        ),
        409,
      );
    }
    return answer(c, () =>
      options.service.acknowledgePage(
        c.get("userId")!,
        c.get("deviceId"),
        id.data,
        body.data,
      ),
    );
  });

  routes.post("/sync-runs/:id/complete", async (c) => {
    const gate = syncGate(c, options);
    if (gate) return gate;
    const id = Uuid.safeParse(c.req.param("id"));
    if (!id.success) return invalidBody(c, id.error.issues);
    const body = FenceBody.safeParse(await jsonBody(c));
    if (!body.success) return invalidBody(c, body.error.issues);
    return answer(c, () =>
      options.service.completeRun(
        c.get("userId")!,
        c.get("deviceId"),
        id.data,
        body.data.fence,
        body.data.localReplicaId,
      ),
    );
  });

  // Cancellation is cleanup, so it deliberately remains available while
  // either emergency stop is active. The shared middleware still requires a
  // passkey session and an exact allowlisted Origin.
  routes.post("/sync-runs/:id/cancel", async (c) => {
    const id = Uuid.safeParse(c.req.param("id"));
    if (!id.success) return invalidBody(c, id.error.issues);
    const body = FenceBody.safeParse(await jsonBody(c));
    if (!body.success) return invalidBody(c, body.error.issues);
    return answer(c, () =>
      options.service.cancelRun(
        c.get("userId")!,
        c.get("deviceId"),
        id.data,
        body.data.fence,
        body.data.localReplicaId,
      ),
    );
  });

  return routes;
}
