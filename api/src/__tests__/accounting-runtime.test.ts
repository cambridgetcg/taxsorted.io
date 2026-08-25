import { describe, expect, it, vi } from "vitest";
import {
  AccountingError,
  type AccountingSql,
} from "../accounting.js";
import { createAccountingRuntime } from "../accounting-runtime.js";
import { AccountingTokenVault } from "../accounting-token-vault.js";

const KEY = "11".repeat(32);

function unusedDatabase(): AccountingSql {
  const query = vi.fn(async () => []);
  return Object.assign(query, {
    begin: vi.fn(async (operation: (tx: AccountingSql) => Promise<unknown>) =>
      operation(query as unknown as AccountingSql)),
  }) as unknown as AccountingSql;
}

function xeroConfig(enabled: boolean) {
  return {
    requestedEnabled: enabled,
    configured: enabled,
    enabled,
    clientId: "client-id",
    clientSecret: "client-secret",
    callbackUri:
      "https://api.taxsorted.io/v1/accounting/oauth/xero/callback",
    pilotUserIds: new Set(["11111111-1111-4111-8111-111111111111"]),
    allowedNonDemoTenantIds: new Set<string>(),
    tokenKeys: new Map([[1, KEY]]),
    tokenActiveKeyVersion: 1,
  };
}

function runtimeConfig(xeroEnabled: boolean, syntheticEnabled = false) {
  return {
    syntheticEnabled,
    xero: xeroConfig(xeroEnabled),
  };
}

describe("accounting runtime", () => {
  it("does not construct any Xero secret or network boundary while disabled", () => {
    const createVault = vi.fn();
    const createClient = vi.fn();
    const runtime = createAccountingRuntime(
      unusedDatabase(),
      {
        ...runtimeConfig(false),
        xero: {
          ...xeroConfig(false),
          clientId: "",
          clientSecret: "",
          tokenKeys: new Map(),
          tokenActiveKeyVersion: null,
        },
      },
      { createVault, createClient },
    );

    expect(runtime.xero).toBeUndefined();
    expect(createVault).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("keeps discovery lazy and leaves Xero outside the financial page-reader registry", async () => {
    const createClient = vi.fn();
    const createVault = vi.fn(
      (keyRing: ConstructorParameters<typeof AccountingTokenVault>[0]) =>
        new AccountingTokenVault(keyRing),
    );
    const runtime = createAccountingRuntime(
      unusedDatabase(),
      runtimeConfig(true),
      { createVault, createClient },
    );

    expect(runtime.xero).toBeDefined();
    expect(createVault).toHaveBeenCalledOnce();
    expect(createClient).not.toHaveBeenCalled();
    await expect(
      runtime.service.startAuthorisation(
        "11111111-1111-4111-8111-111111111111",
        "xero",
      ),
    ).rejects.toMatchObject({
      code: "provider_unavailable",
      status: 404,
    } satisfies Partial<AccountingError>);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("refuses an enabled runtime without an active token key", () => {
    expect(() =>
      createAccountingRuntime(unusedDatabase(), {
        ...runtimeConfig(true),
        xero: {
          ...xeroConfig(true),
          tokenActiveKeyVersion: null,
        },
      }),
    ).toThrow("Enabled Xero accounting has no active token key");
  });

  it("mounts local cleanup under an emergency stop without mounting Xero's directory", async () => {
    const createClient = vi.fn();
    const runtime = createAccountingRuntime(
      unusedDatabase(),
      {
        ...runtimeConfig(false),
        xero: {
          ...xeroConfig(false),
          requestedEnabled: true,
          configured: true,
        },
      },
      { createClient },
    );

    expect(runtime.xero).toBeDefined();
    await expect(
      runtime.service.startAuthorisation(
        "11111111-1111-4111-8111-111111111111",
        "xero",
      ),
    ).rejects.toMatchObject({ code: "provider_unavailable", status: 404 });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("does not register the synthetic directory or page reader when its local flag is off", async () => {
    const runtime = createAccountingRuntime(
      unusedDatabase(),
      runtimeConfig(false, false),
    );

    await expect(
      runtime.service.startAuthorisation(
        "11111111-1111-4111-8111-111111111111",
        "synthetic",
      ),
    ).rejects.toMatchObject({ code: "provider_unavailable", status: 404 });
  });
});
