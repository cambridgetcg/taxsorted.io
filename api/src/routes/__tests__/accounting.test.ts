import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AccountingError,
  type AccountingServiceContract,
} from "../../accounting.js";
import { createAccountingRoutes } from "../accounting.js";

const USER = "11111111-1111-4111-8111-111111111111";
const DEVICE = "22222222-2222-4222-8222-222222222222";
const SOURCE = "33333333-3333-4333-8333-333333333333";
const REPLICA = "44444444-4444-4444-8444-444444444444";
const LOCAL_REPLICA = "44444444-4444-4444-9444-444444444444";
const OTHER_LOCAL_REPLICA = "44444444-4444-4444-a444-444444444444";
const RUN = "55555555-5555-4555-8555-555555555555";
const MANIFEST = "66666666-6666-4666-8666-666666666666";
const DIGEST = `sha256:${"a".repeat(64)}`;
const ORIGIN = "https://taxsorted.io";

function fakeService(): AccountingServiceContract {
  return {
    startAuthorisation: vi.fn(async () => ({ authorisation: { id: "auth" } })),
    listOrganisations: vi.fn(async () => ({ organisations: [] })),
    createSourceConnection: vi.fn(async () => ({ sourceConnection: { id: SOURCE } })),
    sourceStatus: vi.fn(async () => ({ sourceConnection: { id: SOURCE } })),
    createReplica: vi.fn(async () => ({ replica: { id: REPLICA } })),
    startRun: vi.fn(async () => ({ run: { id: RUN } })),
    renewLease: vi.fn(async () => ({ run: { id: RUN } })),
    pullPage: vi.fn(async () => ({ manifest: { id: MANIFEST }, records: [] })),
    acknowledgePage: vi.fn(async () => ({ changed: true })),
    completeRun: vi.fn(async () => ({ run: { id: RUN, state: "completed" } })),
    cancelRun: vi.fn(async () => ({
      run: { id: RUN, state: "cancelled" },
      changed: true,
    })),
  };
}

function mounted(input: {
  service?: AccountingServiceContract;
  userId?: string;
  accountId?: string;
  syntheticEnabled?: boolean;
  connectorEmergencyStop?: boolean;
  syncEmergencyStop?: boolean;
} = {}) {
  const service = input.service ?? fakeService();
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("requestId", "route-test");
    c.set("deviceId", DEVICE);
    if (input.userId) c.set("userId", input.userId);
    if (input.accountId) c.set("accountId", input.accountId);
    await next();
  });
  app.route(
    "/v1/accounting",
    createAccountingRoutes({
      service,
      allowedOrigins: [ORIGIN],
      syntheticEnabled: input.syntheticEnabled ?? true,
      connectorEmergencyStop: input.connectorEmergencyStop ?? false,
      syncEmergencyStop: input.syncEmergencyStop ?? false,
    }),
  );
  return { app, service };
}

function post(body: unknown, origin = ORIGIN): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  };
}

describe("accounting connector routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a recovery-only account because data access needs userId", async () => {
    const { app, service } = mounted({ accountId: USER });
    const response = await app.request(
      "/v1/accounting/authorisations/synthetic/start",
      post({}),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "passkey_needed",
      requestId: "route-test",
    });
    expect(service.startAuthorisation).not.toHaveBeenCalled();
  });

  it("requires an exact known Origin for every mutation", async () => {
    const { app, service } = mounted({ userId: USER });
    const response = await app.request(
      "/v1/accounting/authorisations/synthetic/start",
      post({}, `${ORIGIN}.attacker.example`),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "bad_origin" });
    expect(service.startAuthorisation).not.toHaveBeenCalled();
  });

  it("keeps the made-up provider closed when its explicit local flag is off", async () => {
    const { app, service } = mounted({ userId: USER, syntheticEnabled: false });
    const response = await app.request(
      "/v1/accounting/authorisations/synthetic/start",
      post({}),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: "synthetic_provider_disabled",
    });
    expect(service.startAuthorisation).not.toHaveBeenCalled();
  });

  it("passes the account and device binding into sync operations", async () => {
    const { app, service } = mounted({ userId: USER });
    const response = await app.request(
      `/v1/accounting/source-connections/${SOURCE}/sync-runs`,
      post({
        replicaId: REPLICA,
        localReplicaId: LOCAL_REPLICA,
        expectedCompletedRunId: null,
        dataset: "bank-transactions",
        kind: "initial",
      }),
    );

    expect(response.status).toBe(201);
    expect(service.startRun).toHaveBeenCalledWith(USER, DEVICE, SOURCE, {
      replicaId: REPLICA,
      localReplicaId: LOCAL_REPLICA,
      expectedCompletedRunId: null,
      dataset: "bank-transactions",
      kind: "initial",
    });
  });

  it.each(["repair", "pre-filing"])(
    "rejects the unimplemented %s sync kind at the route boundary",
    async (kind) => {
      const { app, service } = mounted({ userId: USER });
      const response = await app.request(
        `/v1/accounting/source-connections/${SOURCE}/sync-runs`,
        post({
          replicaId: REPLICA,
          localReplicaId: LOCAL_REPLICA,
          expectedCompletedRunId: null,
          dataset: "bank-transactions",
          kind,
        }),
      );

      expect(response.status).toBe(422);
      expect(service.startRun).not.toHaveBeenCalled();
    },
  );

  it("requires and forwards the browser's local-ledger replica identity", async () => {
    const { app, service } = mounted({ userId: USER });
    const response = await app.request(
      `/v1/accounting/source-connections/${SOURCE}/replicas`,
      post({ localReplicaId: LOCAL_REPLICA }),
    );

    expect(response.status).toBe(201);
    expect(service.createReplica).toHaveBeenCalledWith(USER, DEVICE, SOURCE, {
      localReplicaId: LOCAL_REPLICA,
    });

    const missing = await app.request(
      `/v1/accounting/source-connections/${SOURCE}/replicas`,
      post({}),
    );
    expect(missing.status).toBe(422);
  });

  it("requires and forwards the exact local replica when status is read", async () => {
    const { app, service } = mounted({ userId: USER });

    const missing = await app.request(
      `/v1/accounting/source-connections/${SOURCE}/status`,
    );
    expect(missing.status).toBe(422);
    expect(service.sourceStatus).not.toHaveBeenCalled();

    const response = await app.request(
      `/v1/accounting/source-connections/${SOURCE}/status?localReplicaId=${LOCAL_REPLICA}`,
    );
    expect(response.status).toBe(200);
    expect(service.sourceStatus).toHaveBeenCalledWith(
      USER,
      DEVICE,
      SOURCE,
      LOCAL_REPLICA,
    );
  });

  it("accepts only the full strict acknowledgement and binds its run twice", async () => {
    const { app, service } = mounted({ userId: USER });
    const acknowledgement = {
      manifestId: MANIFEST,
      runId: RUN,
      replicaId: REPLICA,
      dataset: "bank-transactions",
      sequence: 0,
      fence: "9007199254740993",
      digest: DIGEST,
      localReplicaId: LOCAL_REPLICA,
    };
    const accepted = await app.request(
      `/v1/accounting/sync-runs/${RUN}/acknowledgements`,
      post(acknowledgement),
    );
    expect(accepted.status).toBe(200);
    expect(service.acknowledgePage).toHaveBeenCalledWith(
      USER,
      DEVICE,
      RUN,
      acknowledgement,
    );

    const otherRun = "77777777-7777-4777-8777-777777777777";
    const wrongRun = await app.request(
      `/v1/accounting/sync-runs/${RUN}/acknowledgements`,
      post({ ...acknowledgement, runId: otherRun }),
    );
    expect(wrongRun.status).toBe(409);
    expect(await wrongRun.json()).toMatchObject({ error: "page_manifest_mismatch" });

    const looseBody = await app.request(
      `/v1/accounting/sync-runs/${RUN}/acknowledgements`,
      post({ ...acknowledgement, extra: true }),
    );
    expect(looseBody.status).toBe(422);
  });

  it("keeps connector and sync stops independent while status remains readable", async () => {
    const syncStopped = mounted({ userId: USER, syncEmergencyStop: true });
    const start = await syncStopped.app.request(
      `/v1/accounting/source-connections/${SOURCE}/sync-runs`,
      post({ replicaId: REPLICA, dataset: "bank-transactions" }),
    );
    expect(start.status).toBe(503);
    expect(await start.json()).toMatchObject({ error: "accounting_sync_stopped" });

    const authorise = await syncStopped.app.request(
      "/v1/accounting/authorisations/synthetic/start",
      post({}),
    );
    expect(authorise.status).toBe(201);

    const connectorStopped = mounted({
      userId: USER,
      connectorEmergencyStop: true,
      syncEmergencyStop: true,
    });
    const connectorStart = await connectorStopped.app.request(
      "/v1/accounting/authorisations/synthetic/start",
      post({}),
    );
    expect(connectorStart.status).toBe(503);
    expect(await connectorStart.json()).toMatchObject({
      error: "accounting_connector_stopped",
    });

    const status = await connectorStopped.app.request(
      `/v1/accounting/source-connections/${SOURCE}/status?localReplicaId=${LOCAL_REPLICA}`,
    );
    expect(status.status).toBe(200);
    expect(connectorStopped.service.sourceStatus).toHaveBeenCalledWith(
      USER,
      DEVICE,
      SOURCE,
      LOCAL_REPLICA,
    );
  });

  it("keeps exact cancellation available under both emergency stops", async () => {
    const { app, service } = mounted({
      userId: USER,
      syntheticEnabled: false,
      connectorEmergencyStop: true,
      syncEmergencyStop: true,
    });
    const body = { fence: "9007199254740993", localReplicaId: LOCAL_REPLICA };

    const response = await app.request(
      `/v1/accounting/sync-runs/${RUN}/cancel`,
      post(body),
    );

    expect(response.status).toBe(200);
    expect(service.cancelRun).toHaveBeenCalledWith(
      USER,
      DEVICE,
      RUN,
      body.fence,
      LOCAL_REPLICA,
    );

    const loose = await app.request(
      `/v1/accounting/sync-runs/${RUN}/cancel`,
      post({ ...body, extra: true }),
    );
    expect(loose.status).toBe(422);
  });

  it("does not relax passkey or Origin checks for cancellation cleanup", async () => {
    const body = { fence: "9007199254740993", localReplicaId: LOCAL_REPLICA };
    const signedOut = mounted({
      connectorEmergencyStop: true,
      syncEmergencyStop: true,
    });
    const noPasskey = await signedOut.app.request(
      `/v1/accounting/sync-runs/${RUN}/cancel`,
      post(body),
    );
    expect(noPasskey.status).toBe(403);
    expect(signedOut.service.cancelRun).not.toHaveBeenCalled();

    const signedIn = mounted({
      userId: USER,
      connectorEmergencyStop: true,
      syncEmergencyStop: true,
    });
    const badOrigin = await signedIn.app.request(
      `/v1/accounting/sync-runs/${RUN}/cancel`,
      post(body, `${ORIGIN}.attacker.example`),
    );
    expect(badOrigin.status).toBe(403);
    expect(signedIn.service.cancelRun).not.toHaveBeenCalled();
  });

  it("passes the exact local replica into non-enumerable cancellation", async () => {
    const service = fakeService();
    vi.mocked(service.cancelRun).mockRejectedValueOnce(
      new AccountingError(
        "sync_run_not_found",
        "That sync run was not found.",
        404,
      ),
    );
    const { app } = mounted({ userId: USER, service });

    const response = await app.request(
      `/v1/accounting/sync-runs/${RUN}/cancel`,
      post({
        fence: "9007199254740993",
        localReplicaId: OTHER_LOCAL_REPLICA,
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "sync_run_not_found" });
    expect(service.cancelRun).toHaveBeenCalledWith(
      USER,
      DEVICE,
      RUN,
      "9007199254740993",
      OTHER_LOCAL_REPLICA,
    );
  });

  it("renews the exact text fence for the owned local replica", async () => {
    const { app, service } = mounted({ userId: USER });
    const response = await app.request(
      `/v1/accounting/sync-runs/${RUN}/lease`,
      post({ fence: "9007199254740993", localReplicaId: LOCAL_REPLICA }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ run: { id: RUN } });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(service.renewLease).toHaveBeenCalledWith(
      USER,
      DEVICE,
      RUN,
      "9007199254740993",
      LOCAL_REPLICA,
    );
  });

  it("returns private no-store responses and rejects numeric fences", async () => {
    const { app, service } = mounted({ userId: USER });
    const response = await app.request(
      `/v1/accounting/sync-runs/${RUN}/lease`,
      post({ fence: 12, localReplicaId: LOCAL_REPLICA }),
    );

    expect(response.status).toBe(422);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(service.renewLease).not.toHaveBeenCalled();
  });
});
