// Assemble the accounting connector boundary without opening a provider
// connection. The Xero client stays lazy. A configured cleanup service remains
// mounted when the pilot allowlist is empty or a stop is active, while the
// organisation directory is present only when provider traffic is enabled.

import {
  AccountingService,
  type AccountingSql,
} from "./accounting.js";
import { syntheticAccountingProvider } from "./accounting-synthetic.js";
import {
  AccountingTokenVault,
  type AccountingTokenKeyRing,
} from "./accounting-token-vault.js";
import { XeroFoundationService } from "./accounting-xero.js";
import {
  createXeroOidcClient,
  type CreateXeroOidcClientOptions,
  type XeroOidcClient,
} from "./xero-oidc.js";

export interface AccountingXeroRuntimeConfig {
  requestedEnabled: boolean;
  configured: boolean;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  callbackUri: string;
  pilotUserIds: ReadonlySet<string>;
  allowedNonDemoTenantIds: ReadonlySet<string>;
  tokenKeys: ReadonlyMap<number, string>;
  tokenActiveKeyVersion: number | null;
}

export interface AccountingRuntimeConfig {
  syntheticEnabled: boolean;
  xero: AccountingXeroRuntimeConfig;
}

export interface AccountingRuntime {
  service: AccountingService;
  xero?: XeroFoundationService;
}

export interface AccountingRuntimeDependencies {
  createClient?: (
    options: CreateXeroOidcClientOptions,
  ) => Promise<XeroOidcClient>;
  createVault?: (keyRing: AccountingTokenKeyRing) => AccountingTokenVault;
}

export function createAccountingRuntime(
  database: AccountingSql,
  config: AccountingRuntimeConfig,
  dependencies: AccountingRuntimeDependencies = {},
): AccountingRuntime {
  const xeroConfig = config.xero;
  const pageProviders = config.syntheticEnabled
    ? [syntheticAccountingProvider]
    : [];
  const baseDirectories = config.syntheticEnabled
    ? [syntheticAccountingProvider]
    : [];
  if (!xeroConfig.requestedEnabled || !xeroConfig.configured) {
    return {
      service: new AccountingService(database, pageProviders, baseDirectories),
    };
  }

  if (xeroConfig.tokenActiveKeyVersion === null) {
    throw new Error("Enabled Xero accounting has no active token key");
  }

  const createVault = dependencies.createVault ??
    ((keyRing: AccountingTokenKeyRing) => new AccountingTokenVault(keyRing));
  const vault = createVault({
    activeVersion: xeroConfig.tokenActiveKeyVersion,
    keys: xeroConfig.tokenKeys,
  });
  const createClient = dependencies.createClient ?? createXeroOidcClient;
  const xero = new XeroFoundationService({
    database,
    vault,
    callbackUri: xeroConfig.callbackUri,
    pilotUserIds: xeroConfig.pilotUserIds,
    allowedNonDemoTenantIds: xeroConfig.allowedNonDemoTenantIds,
    providerNetworkEnabled: xeroConfig.enabled,
    client: () => createClient({
      clientId: xeroConfig.clientId,
      clientSecret: xeroConfig.clientSecret,
      callbackUri: xeroConfig.callbackUri,
    }),
  });

  return {
    service: new AccountingService(
      database,
      pageProviders,
      xeroConfig.enabled
        ? [...baseDirectories, xero]
        : baseDirectories,
    ),
    xero,
  };
}
