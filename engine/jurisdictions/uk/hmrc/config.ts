// HMRC API Configuration
// MTD VAT API v1.0

export const HMRC_CONFIG = {
  // API Base URLs
  sandbox: {
    api: "https://test-api.service.hmrc.gov.uk",
    auth: "https://test-api.service.hmrc.gov.uk",
  },
  production: {
    api: "https://api.service.hmrc.gov.uk",
    auth: "https://api.service.hmrc.gov.uk",
  },

  // OAuth Endpoints
  oauth: {
    authorize: "/oauth/authorize",
    token: "/oauth/token",
    revoke: "/oauth/revoke",
  },

  // VAT API Endpoints
  vat: {
    obligations: "/organisations/vat/{vrn}/obligations",
    submitReturn: "/organisations/vat/{vrn}/returns",
    viewReturn: "/organisations/vat/{vrn}/returns/{periodKey}",
    liabilities: "/organisations/vat/{vrn}/liabilities",
    payments: "/organisations/vat/{vrn}/payments",
    penalties: "/organisations/vat/{vrn}/penalties",
  },

  // OAuth Scopes
  scopes: {
    vat: {
      read: "read:vat",
      write: "write:vat",
    },
  },

  // Test Support (sandbox only — these endpoints do not exist in production)
  testSupport: {
    createTestOrganisation: "/create-test-user/organisations",
  },

  // Token Configuration
  tokens: {
    accessTokenTTL: 4 * 60 * 60, // 4 hours in seconds
    refreshTokenTTL: 18 * 30 * 24 * 60 * 60, // ~18 months in seconds
  },

  // Rate Limits
  rateLimit: {
    requestsPerSecond: 3,
    retryAfterMs: 1000,
    maxRetries: 3,
  },

  // Vendor Information (replace with actual values)
  vendor: {
    name: "TaxSorted",
    version: "1.0.0",
    licenseId: "taxsorted-license",
  },
} as const;

// Get configuration based on environment
export function getHMRCConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  const useProductionAPI = process.env.NEXT_PUBLIC_HMRC_USE_PRODUCTION === "true";

  return {
    ...HMRC_CONFIG,
    baseUrl: useProductionAPI ? HMRC_CONFIG.production : HMRC_CONFIG.sandbox,
    isProduction: isProduction && useProductionAPI,
  };
}

// Build full URL for VAT endpoints
export function buildVATUrl(
  endpoint: keyof typeof HMRC_CONFIG.vat,
  params: { vrn: string; periodKey?: string }
): string {
  const config = getHMRCConfig();
  let path: string = HMRC_CONFIG.vat[endpoint];

  path = path.replace("{vrn}", params.vrn);
  if (params.periodKey) {
    path = path.replace("{periodKey}", params.periodKey);
  }

  return `${config.baseUrl.api}${path}`;
}

// Build OAuth authorization URL
export function buildAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string,
  scopes: string[] = ["read:vat", "write:vat"]
): string {
  const config = getHMRCConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes.join(" "),
    redirect_uri: redirectUri,
    state,
  });

  return `${config.baseUrl.auth}${HMRC_CONFIG.oauth.authorize}?${params.toString()}`;
}
