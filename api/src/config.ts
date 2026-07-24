import {
  isPoliticsBulkPublicationApproval,
  type PoliticsBulkPublicationApproval,
} from "./uk-politics-datasets.js";
import { databaseUrl } from "./runtime-environment.js";

// Server configuration is assembled here. The database URL is read by the
// small runtime module so database-only tools do not load the full server.
// The api boots without HMRC credentials; that rail reports itself
// unconfigured until they arrive.

const env = process.env;
const politicsPersonalDataEmergencyStop =
  env.POLITICS_PERSONAL_DATA_EMERGENCY_STOP === "true";
const politicsPersonalDataEnabled =
  !politicsPersonalDataEmergencyStop &&
  (env.NODE_ENV !== "production" || env.POLITICS_PERSONAL_DATA_ENABLED === "true");
const politicsBulkDataEmergencyStop =
  env.POLITICS_BULK_DATA_EMERGENCY_STOP === "true";
const politicsBulkApprovalCandidate: PoliticsBulkPublicationApproval = {
  approver: env.POLITICS_BULK_APPROVED_BY || "",
  approvedOn: env.POLITICS_BULK_APPROVED_ON || "",
  admissionDigest: env.POLITICS_BULK_ADMISSION_DIGEST || "",
  confidentialIntakeUrl: env.POLITICS_CONFIDENTIAL_INTAKE_URL || "",
};
const politicsBulkDataApproval = isPoliticsBulkPublicationApproval(
  politicsBulkApprovalCandidate
)
  ? politicsBulkApprovalCandidate
  : null;
const politicsBulkDataEnabled =
  !politicsBulkDataEmergencyStop &&
  // Production enablement records a human publication decision; it is not an
  // identity, account or payment gate for callers.
  (env.NODE_ENV !== "production" ||
    (env.POLITICS_BULK_DATA_ENABLED === "true" &&
      politicsBulkDataApproval !== null));
const charitiesEmergencyStop = env.UK_CHARITIES_EMERGENCY_STOP === "true";
const charitiesPublicDataEnabled =
  !charitiesEmergencyStop &&
  (env.NODE_ENV !== "production" ||
    env.UK_CHARITIES_PUBLIC_DATA_ENABLED === "true");
const publicFundingEmergencyStop =
  env.UK_PUBLIC_FUNDING_EMERGENCY_STOP === "true";
const publicFundingPublicDataEnabled =
  !publicFundingEmergencyStop &&
  (env.NODE_ENV !== "production" ||
    env.UK_PUBLIC_FUNDING_PUBLIC_DATA_ENABLED === "true");
const caseCommonsEmergencyStop =
  env.UK_CASE_COMMONS_EMERGENCY_STOP === "true";
const caseCommonsPublicDataEnabled =
  !caseCommonsEmergencyStop &&
  (env.NODE_ENV !== "production" ||
    env.UK_CASE_COMMONS_PUBLIC_DATA_ENABLED === "true");
// Keep distinct operator values here. The case-commons route checks them
// against the validated corpus and closes only its own surface if one is
// malformed or stale.
const caseCommonsStoppedCaseIds = [
  ...new Set(
    (env.UK_CASE_COMMONS_STOPPED_CASE_IDS || "")
      .split(",")
      .map((caseId) => caseId.trim())
      .filter(Boolean),
  ),
];

export const config = {
  port: Number(env.PORT || 8787),
  databaseUrl,
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
  // Politics data is public, but production publication stays closed until
  // the method/privacy review is complete. Electoral Commission reuse is a
  // second, independent permission decision and therefore has its own gate.
  politics: {
    // Independent containment for a bulk projection later found unsafe. It
    // does not hide the catalogue, rights statement or bulk dataset schemas.
    bulkDataEmergencyStop: politicsBulkDataEmergencyStop,
    bulkDataEnabled: politicsBulkDataEnabled,
    bulkDataApproval: politicsBulkDataApproval,
    personalDataEmergencyStop: politicsPersonalDataEmergencyStop,
    personalDataEnabled: politicsPersonalDataEnabled,
    publicDataEnabled:
      politicsPersonalDataEnabled &&
      (env.NODE_ENV !== "production" ||
        env.POLITICS_PUBLIC_DATA_ENABLED === "true"),
    electoralCommissionReuseConfirmed:
      politicsPersonalDataEnabled && env.POLITICS_EC_REUSE_CONFIRMED === "true",
    electoralFinanceReviewApproved:
      politicsPersonalDataEnabled &&
      (env.NODE_ENV !== "production" ||
        env.POLITICS_EC_PRIVACY_REVIEW_APPROVED === "true"),
    ministerialBenefitsEnabled:
      politicsPersonalDataEnabled &&
      (env.NODE_ENV !== "production" ||
        env.POLITICS_GOV_BENEFITS_ENABLED === "true"),
    enforcementLeadersEnabled:
      politicsPersonalDataEnabled &&
      (env.NODE_ENV !== "production" ||
        env.POLITICS_ENFORCEMENT_LEADERS_ENABLED === "true"),
    parliamentaryStaffEnabled:
      politicsPersonalDataEnabled &&
      (env.NODE_ENV !== "production" ||
        env.POLITICS_PARLIAMENTARY_STAFF_ENABLED === "true"),
    parliamentaryInterestsEnabled:
      politicsPersonalDataEnabled &&
      (env.NODE_ENV !== "production" ||
        env.POLITICS_PARLIAMENTARY_INTERESTS_ENABLED === "true"),
  },
  // The corpus itself contains only reviewed public institutional facts, but
  // production publication is still an explicit act. Source and gap routes
  // remain readable while this switch is closed.
  taxSystem: {
    publicDataEnabled:
      env.NODE_ENV !== "production" || env.UK_TAX_SYSTEM_PUBLIC_DATA_ENABLED === "true",
  },
  // Industry entry data carries the same explicit production-publication
  // boundary as the tax-system graph. Sources, gaps and the manifest stay
  // readable while the full map is closed.
  taxIndustry: {
    publicDataEnabled:
      env.NODE_ENV !== "production" || env.UK_TAX_INDUSTRY_PUBLIC_DATA_ENABLED === "true",
  },
  // This first charity release describes the sector, official register doors,
  // legal conditions and organisation-level disclosure rules. It contains no
  // charity-by-charity mirror or people directory. The independent stop still wins
  // so a disputed release can be contained without affecting tax filing.
  charities: {
    emergencyStop: charitiesEmergencyStop,
    publicDataEnabled: charitiesPublicDataEnabled,
  },
  // This corpus contains institutional structures, formal offices, aggregate
  // allocations and generic public contact routes. It deliberately keeps
  // people and personal contact details out. Production publication is still
  // explicit, with an independent stop that leaves sources and gaps readable.
  publicFunding: {
    emergencyStop: publicFundingEmergencyStop,
    publicDataEnabled: publicFundingPublicDataEnabled,
  },
  // Only reviewed, decided public records can enter this corpus. Production
  // publication remains an explicit act and the independent stop closes every
  // case packet without affecting tax filing or a professional's local file.
  caseCommons: {
    emergencyStop: caseCommonsEmergencyStop,
    publicDataEnabled: caseCommonsPublicDataEnabled,
    stoppedCaseIds: caseCommonsStoppedCaseIds,
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
