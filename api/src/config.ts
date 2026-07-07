// All environment in one place. The api boots without HMRC credentials —
// the rail simply reports itself unconfigured until they arrive.

const env = process.env;

export const config = {
  port: Number(env.PORT || 8787),
  databaseUrl: env.DATABASE_URL || "",
  // 64 hex chars = 32 bytes. Encrypts tokens at rest, signs OAuth state.
  tokenKey: env.TOKEN_KEY || "",
  appOrigin: env.APP_ORIGIN || "https://taxsorted.io",
  apiOrigin: env.API_ORIGIN || "https://api.taxsorted.io",
  isProd: env.NODE_ENV === "production",
  hmrc: {
    env: (env.HMRC_ENV === "production" ? "production" : "sandbox") as
      | "sandbox"
      | "production",
    clientId: env.HMRC_CLIENT_ID || "",
    clientSecret: env.HMRC_CLIENT_SECRET || "",
    get configured() {
      return Boolean(this.clientId && this.clientSecret);
    },
  },
  corsOrigins:
    env.NODE_ENV === "production"
      ? ["https://taxsorted.io", "https://www.taxsorted.io"]
      : ["https://taxsorted.io", "https://www.taxsorted.io", "http://localhost:3000"],
  // WebAuthn ceremonies run on the page origin, fixed on purpose — kept
  // separate from corsOrigins (which can widen independently of rpID/origin).
  // The app is served from both the apex and www — a passkey ceremony can
  // start on either, so expectedOrigin must accept both, never derived from
  // corsOrigins (that stays its own security decision).
  webauthn: {
    rpId: env.WEBAUTHN_RP_ID || (env.NODE_ENV === "production" ? "taxsorted.io" : "localhost"),
    origins: env.WEBAUTHN_ORIGIN
      ? env.WEBAUTHN_ORIGIN.split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : env.NODE_ENV === "production"
        ? ["https://taxsorted.io", "https://www.taxsorted.io"]
        : ["http://localhost:3000"],
  },
};

export function assertBootConfig() {
  const missing: string[] = [];
  if (!config.databaseUrl) missing.push("DATABASE_URL");
  if (!/^[0-9a-f]{64}$/i.test(config.tokenKey)) missing.push("TOKEN_KEY (64 hex chars)");
  if (missing.length) {
    throw new Error(`Missing required environment: ${missing.join(", ")}`);
  }
}
