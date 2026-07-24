// config.ts reads all environment at module load, so every scenario needs a
// fresh module instance: stub env vars, dynamically import, then reset. No
// Postgres, no network — pure env-in/shape-out.

import { describe, it, expect, afterEach, vi } from "vitest";
import { politicsDatasetAdmissionDigest } from "../uk-politics-datasets.js";

function stubBulkApproval() {
  vi.stubEnv("POLITICS_BULK_APPROVED_BY", "Yu");
  vi.stubEnv("POLITICS_BULK_APPROVED_ON", "2026-07-10");
  vi.stubEnv("POLITICS_BULK_ADMISSION_DIGEST", politicsDatasetAdmissionDigest);
  vi.stubEnv(
    "POLITICS_CONFIDENTIAL_INTAKE_URL",
    "https://intake.taxsorted.io/politics"
  );
}

function clearBulkApproval() {
  vi.stubEnv("POLITICS_BULK_APPROVED_BY", "");
  vi.stubEnv("POLITICS_BULK_APPROVED_ON", "");
  vi.stubEnv("POLITICS_BULK_ADMISSION_DIGEST", "");
  vi.stubEnv("POLITICS_CONFIDENTIAL_INTAKE_URL", "");
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("config.webauthn — defaults", () => {
  it("defaults to localhost/http://localhost:3000 outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    const { config } = await import("../config.js");
    expect(config.webauthn).toEqual({
      rpId: "localhost",
      origins: ["http://localhost:3000"],
    });
  });

  it("defaults to taxsorted.io / both the apex and www origins in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    const { config } = await import("../config.js");
    expect(config.webauthn).toEqual({
      rpId: "taxsorted.io",
      origins: ["https://taxsorted.io", "https://www.taxsorted.io"],
    });
  });
});

describe("config.webauthn — env override", () => {
  it("prefers WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN over the production default", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_RP_ID", "staging.taxsorted.io");
    vi.stubEnv("WEBAUTHN_ORIGIN", "https://staging.taxsorted.io");
    const { config } = await import("../config.js");
    expect(config.webauthn).toEqual({
      rpId: "staging.taxsorted.io",
      origins: ["https://staging.taxsorted.io"],
    });
  });

  it("prefers WEBAUTHN_RP_ID / WEBAUTHN_ORIGIN over the dev default", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("WEBAUTHN_RP_ID", "dev.example");
    vi.stubEnv("WEBAUTHN_ORIGIN", "http://dev.example:3000");
    const { config } = await import("../config.js");
    expect(config.webauthn).toEqual({
      rpId: "dev.example",
      origins: ["http://dev.example:3000"],
    });
  });

  it("splits a comma-separated WEBAUTHN_ORIGIN into multiple origins", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv(
      "WEBAUTHN_ORIGIN",
      "https://staging.taxsorted.io, https://staging-2.taxsorted.io"
    );
    const { config } = await import("../config.js");
    expect(config.webauthn.origins).toEqual([
      "https://staging.taxsorted.io",
      "https://staging-2.taxsorted.io",
    ]);
  });
});

describe("config.webauthn — not a boot-config requirement", () => {
  it("assertBootConfig does not throw for missing webauthn env (always has a default)", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgres://x");
    vi.stubEnv("TOKEN_KEY", "a".repeat(64));
    vi.stubEnv("WEBAUTHN_RP_ID", "");
    vi.stubEnv("WEBAUTHN_ORIGIN", "");
    const { assertBootConfig } = await import("../config.js");
    expect(() => assertBootConfig()).not.toThrow();
  });
});

describe("config.databaseUrl", () => {
  it("shares the database-only runtime value and refreshes after a module reset", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://first");
    let loaded = await import("../config.js");
    let runtime = await import("../runtime-environment.js");
    expect(loaded.config.databaseUrl).toBe("postgres://first");
    expect(runtime.databaseUrl).toBe("postgres://first");

    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgres://second");
    loaded = await import("../config.js");
    runtime = await import("../runtime-environment.js");
    expect(loaded.config.databaseUrl).toBe("postgres://second");
    expect(runtime.databaseUrl).toBe("postgres://second");
  });
});

describe("config.politics — publication gates", () => {
  it("is open for local/test work but keeps Electoral Commission reuse closed", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("POLITICS_BULK_DATA_EMERGENCY_STOP", "");
    vi.stubEnv("POLITICS_BULK_DATA_ENABLED", "");
    clearBulkApproval();
    vi.stubEnv("POLITICS_PERSONAL_DATA_EMERGENCY_STOP", "");
    vi.stubEnv("POLITICS_PERSONAL_DATA_ENABLED", "");
    vi.stubEnv("POLITICS_PUBLIC_DATA_ENABLED", "");
    vi.stubEnv("POLITICS_EC_REUSE_CONFIRMED", "");
    vi.stubEnv("POLITICS_EC_PRIVACY_REVIEW_APPROVED", "");
    vi.stubEnv("POLITICS_GOV_BENEFITS_ENABLED", "");
    vi.stubEnv("POLITICS_ENFORCEMENT_LEADERS_ENABLED", "");
    vi.stubEnv("POLITICS_PARLIAMENTARY_STAFF_ENABLED", "");
    vi.stubEnv("POLITICS_PARLIAMENTARY_INTERESTS_ENABLED", "");
    const { config } = await import("../config.js");
    expect(config.politics).toEqual({
      bulkDataEmergencyStop: false,
      bulkDataEnabled: true,
      bulkDataApproval: null,
      personalDataEmergencyStop: false,
      personalDataEnabled: true,
      publicDataEnabled: true,
      electoralCommissionReuseConfirmed: false,
      electoralFinanceReviewApproved: true,
      ministerialBenefitsEnabled: true,
      enforcementLeadersEnabled: true,
      parliamentaryStaffEnabled: true,
      parliamentaryInterestsEnabled: true,
    });
  });

  it("is closed in production unless each exact switch is true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POLITICS_BULK_DATA_EMERGENCY_STOP", "TRUE");
    vi.stubEnv("POLITICS_BULK_DATA_ENABLED", "TRUE");
    clearBulkApproval();
    vi.stubEnv("POLITICS_PERSONAL_DATA_EMERGENCY_STOP", "");
    vi.stubEnv("POLITICS_PERSONAL_DATA_ENABLED", "TRUE");
    vi.stubEnv("POLITICS_PUBLIC_DATA_ENABLED", "TRUE");
    vi.stubEnv("POLITICS_EC_REUSE_CONFIRMED", "true");
    vi.stubEnv("POLITICS_EC_PRIVACY_REVIEW_APPROVED", "true");
    vi.stubEnv("POLITICS_GOV_BENEFITS_ENABLED", "true");
    vi.stubEnv("POLITICS_ENFORCEMENT_LEADERS_ENABLED", "true");
    vi.stubEnv("POLITICS_PARLIAMENTARY_STAFF_ENABLED", "true");
    vi.stubEnv("POLITICS_PARLIAMENTARY_INTERESTS_ENABLED", "true");
    let loaded = await import("../config.js");
    expect(loaded.config.politics).toEqual({
      bulkDataEmergencyStop: false,
      bulkDataEnabled: false,
      bulkDataApproval: null,
      personalDataEmergencyStop: false,
      personalDataEnabled: false,
      publicDataEnabled: false,
      electoralCommissionReuseConfirmed: false,
      electoralFinanceReviewApproved: false,
      ministerialBenefitsEnabled: false,
      enforcementLeadersEnabled: false,
      parliamentaryStaffEnabled: false,
      parliamentaryInterestsEnabled: false,
    });

    vi.resetModules();
    vi.stubEnv("POLITICS_PERSONAL_DATA_ENABLED", "true");
    vi.stubEnv("POLITICS_BULK_DATA_ENABLED", "true");
    stubBulkApproval();
    vi.stubEnv("POLITICS_PUBLIC_DATA_ENABLED", "true");
    vi.stubEnv("POLITICS_EC_REUSE_CONFIRMED", "true");
    vi.stubEnv("POLITICS_EC_PRIVACY_REVIEW_APPROVED", "true");
    vi.stubEnv("POLITICS_GOV_BENEFITS_ENABLED", "true");
    vi.stubEnv("POLITICS_ENFORCEMENT_LEADERS_ENABLED", "true");
    vi.stubEnv("POLITICS_PARLIAMENTARY_STAFF_ENABLED", "true");
    vi.stubEnv("POLITICS_PARLIAMENTARY_INTERESTS_ENABLED", "true");
    loaded = await import("../config.js");
    expect(loaded.config.politics).toEqual({
      bulkDataEmergencyStop: false,
      bulkDataEnabled: true,
      bulkDataApproval: {
        approver: "Yu",
        approvedOn: "2026-07-10",
        admissionDigest: politicsDatasetAdmissionDigest,
        confidentialIntakeUrl: "https://intake.taxsorted.io/politics",
      },
      personalDataEmergencyStop: false,
      personalDataEnabled: true,
      publicDataEnabled: true,
      electoralCommissionReuseConfirmed: true,
      electoralFinanceReviewApproved: true,
      ministerialBenefitsEnabled: true,
      enforcementLeadersEnabled: true,
      parliamentaryStaffEnabled: true,
      parliamentaryInterestsEnabled: true,
    });
  });

  it("lets the emergency stop override every named-person publication gate", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POLITICS_BULK_DATA_EMERGENCY_STOP", "");
    vi.stubEnv("POLITICS_BULK_DATA_ENABLED", "true");
    stubBulkApproval();
    vi.stubEnv("POLITICS_PERSONAL_DATA_EMERGENCY_STOP", "true");
    vi.stubEnv("POLITICS_PERSONAL_DATA_ENABLED", "true");
    vi.stubEnv("POLITICS_PUBLIC_DATA_ENABLED", "true");
    vi.stubEnv("POLITICS_EC_REUSE_CONFIRMED", "true");
    vi.stubEnv("POLITICS_EC_PRIVACY_REVIEW_APPROVED", "true");
    vi.stubEnv("POLITICS_GOV_BENEFITS_ENABLED", "true");
    vi.stubEnv("POLITICS_ENFORCEMENT_LEADERS_ENABLED", "true");
    vi.stubEnv("POLITICS_PARLIAMENTARY_STAFF_ENABLED", "true");
    vi.stubEnv("POLITICS_PARLIAMENTARY_INTERESTS_ENABLED", "true");
    const { config } = await import("../config.js");
    expect(config.politics).toEqual({
      bulkDataEmergencyStop: false,
      bulkDataEnabled: true,
      bulkDataApproval: {
        approver: "Yu",
        approvedOn: "2026-07-10",
        admissionDigest: politicsDatasetAdmissionDigest,
        confidentialIntakeUrl: "https://intake.taxsorted.io/politics",
      },
      personalDataEmergencyStop: true,
      personalDataEnabled: false,
      publicDataEnabled: false,
      electoralCommissionReuseConfirmed: false,
      electoralFinanceReviewApproved: false,
      ministerialBenefitsEnabled: false,
      enforcementLeadersEnabled: false,
      parliamentaryStaffEnabled: false,
      parliamentaryInterestsEnabled: false,
    });
  });

  it("lets the independent bulk stop close static records without enabling personal data", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POLITICS_BULK_DATA_EMERGENCY_STOP", "true");
    vi.stubEnv("POLITICS_BULK_DATA_ENABLED", "true");
    clearBulkApproval();
    vi.stubEnv("POLITICS_PERSONAL_DATA_EMERGENCY_STOP", "");
    vi.stubEnv("POLITICS_PERSONAL_DATA_ENABLED", "");
    const { config } = await import("../config.js");

    expect(config.politics.bulkDataEmergencyStop).toBe(true);
    expect(config.politics.bulkDataEnabled).toBe(false);
    expect(config.politics.personalDataEmergencyStop).toBe(false);
    expect(config.politics.personalDataEnabled).toBe(false);
  });

  it("keeps production bulk data closed when approval metadata is incomplete or stale", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POLITICS_BULK_DATA_ENABLED", "true");
    vi.stubEnv("POLITICS_BULK_APPROVED_BY", "Yu");
    vi.stubEnv("POLITICS_BULK_APPROVED_ON", "2026-07-10");
    vi.stubEnv("POLITICS_BULK_ADMISSION_DIGEST", "sha256-stale");
    vi.stubEnv(
      "POLITICS_CONFIDENTIAL_INTAKE_URL",
      "https://intake.taxsorted.io/politics"
    );

    const { config } = await import("../config.js");
    expect(config.politics.bulkDataApproval).toBeNull();
    expect(config.politics.bulkDataEnabled).toBe(false);
  });

  it("rejects an impossible approval calendar date instead of normalising it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POLITICS_BULK_DATA_ENABLED", "true");
    vi.stubEnv("POLITICS_BULK_APPROVED_BY", "Yu");
    vi.stubEnv("POLITICS_BULK_APPROVED_ON", "2026-11-31");
    vi.stubEnv("POLITICS_BULK_ADMISSION_DIGEST", politicsDatasetAdmissionDigest);
    vi.stubEnv(
      "POLITICS_CONFIDENTIAL_INTAKE_URL",
      "https://intake.taxsorted.io/politics"
    );

    const { config } = await import("../config.js");
    expect(config.politics.bulkDataApproval).toBeNull();
    expect(config.politics.bulkDataEnabled).toBe(false);
  });
});

describe("config.taxSystem — publication gate", () => {
  it("is open locally and requires the exact production switch", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UK_TAX_SYSTEM_PUBLIC_DATA_ENABLED", "");
    let loaded = await import("../config.js");
    expect(loaded.config.taxSystem.publicDataEnabled).toBe(true);

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UK_TAX_SYSTEM_PUBLIC_DATA_ENABLED", "TRUE");
    loaded = await import("../config.js");
    expect(loaded.config.taxSystem.publicDataEnabled).toBe(false);

    vi.resetModules();
    vi.stubEnv("UK_TAX_SYSTEM_PUBLIC_DATA_ENABLED", "true");
    loaded = await import("../config.js");
    expect(loaded.config.taxSystem.publicDataEnabled).toBe(true);
  });
});

describe("config.taxIndustry — publication gate", () => {
  it("is open locally and requires the exact production switch", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UK_TAX_INDUSTRY_PUBLIC_DATA_ENABLED", "");
    let loaded = await import("../config.js");
    expect(loaded.config.taxIndustry.publicDataEnabled).toBe(true);

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UK_TAX_INDUSTRY_PUBLIC_DATA_ENABLED", "TRUE");
    loaded = await import("../config.js");
    expect(loaded.config.taxIndustry.publicDataEnabled).toBe(false);

    vi.resetModules();
    vi.stubEnv("UK_TAX_INDUSTRY_PUBLIC_DATA_ENABLED", "true");
    loaded = await import("../config.js");
    expect(loaded.config.taxIndustry.publicDataEnabled).toBe(true);
  });
});

describe("config.charities — publication gate and stop", () => {
  it("opens locally, requires the exact production switch and lets the stop win", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UK_CHARITIES_PUBLIC_DATA_ENABLED", "");
    vi.stubEnv("UK_CHARITIES_EMERGENCY_STOP", "");
    let loaded = await import("../config.js");
    expect(loaded.config.charities).toEqual({
      emergencyStop: false,
      publicDataEnabled: true,
    });

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UK_CHARITIES_PUBLIC_DATA_ENABLED", "TRUE");
    loaded = await import("../config.js");
    expect(loaded.config.charities.publicDataEnabled).toBe(false);

    vi.resetModules();
    vi.stubEnv("UK_CHARITIES_PUBLIC_DATA_ENABLED", "true");
    loaded = await import("../config.js");
    expect(loaded.config.charities.publicDataEnabled).toBe(true);

    vi.resetModules();
    vi.stubEnv("UK_CHARITIES_EMERGENCY_STOP", "true");
    loaded = await import("../config.js");
    expect(loaded.config.charities).toEqual({
      emergencyStop: true,
      publicDataEnabled: false,
    });
  });
});

describe("config.publicFunding — publication gate and stop", () => {
  it("opens locally, requires the exact production switch and lets the stop win", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UK_PUBLIC_FUNDING_PUBLIC_DATA_ENABLED", "");
    vi.stubEnv("UK_PUBLIC_FUNDING_EMERGENCY_STOP", "");
    let loaded = await import("../config.js");
    expect(loaded.config.publicFunding).toEqual({
      emergencyStop: false,
      publicDataEnabled: true,
    });

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UK_PUBLIC_FUNDING_PUBLIC_DATA_ENABLED", "TRUE");
    loaded = await import("../config.js");
    expect(loaded.config.publicFunding.publicDataEnabled).toBe(false);

    vi.resetModules();
    vi.stubEnv("UK_PUBLIC_FUNDING_PUBLIC_DATA_ENABLED", "true");
    loaded = await import("../config.js");
    expect(loaded.config.publicFunding.publicDataEnabled).toBe(true);

    vi.resetModules();
    vi.stubEnv("UK_PUBLIC_FUNDING_EMERGENCY_STOP", "true");
    loaded = await import("../config.js");
    expect(loaded.config.publicFunding).toEqual({
      emergencyStop: true,
      publicDataEnabled: false,
    });
  });
});

describe("config.caseCommons — publication gate and stop", () => {
  it("opens locally, requires the exact production switch and lets the stop win", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UK_CASE_COMMONS_PUBLIC_DATA_ENABLED", "");
    vi.stubEnv("UK_CASE_COMMONS_EMERGENCY_STOP", "");
    vi.stubEnv("UK_CASE_COMMONS_STOPPED_CASE_IDS", "");
    let loaded = await import("../config.js");
    expect(loaded.config.caseCommons).toEqual({
      emergencyStop: false,
      publicDataEnabled: true,
      stoppedCaseIds: [],
    });

    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UK_CASE_COMMONS_PUBLIC_DATA_ENABLED", "TRUE");
    loaded = await import("../config.js");
    expect(loaded.config.caseCommons.publicDataEnabled).toBe(false);

    vi.resetModules();
    vi.stubEnv("UK_CASE_COMMONS_PUBLIC_DATA_ENABLED", "true");
    loaded = await import("../config.js");
    expect(loaded.config.caseCommons.publicDataEnabled).toBe(true);

    vi.resetModules();
    vi.stubEnv("UK_CASE_COMMONS_EMERGENCY_STOP", "true");
    loaded = await import("../config.js");
    expect(loaded.config.caseCommons).toEqual({
      emergencyStop: true,
      publicDataEnabled: false,
      stoppedCaseIds: [],
    });

    vi.resetModules();
    vi.stubEnv("UK_CASE_COMMONS_EMERGENCY_STOP", "");
    vi.stubEnv(
      "UK_CASE_COMMONS_STOPPED_CASE_IDS",
      "haworth-v-hmrc-2021, haworth-v-hmrc-2021",
    );
    loaded = await import("../config.js");
    expect(loaded.config.caseCommons.stoppedCaseIds).toEqual([
      "haworth-v-hmrc-2021",
    ]);
  });

  it("preserves an invalid stop value for the route to isolate safely", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UK_CASE_COMMONS_PUBLIC_DATA_ENABLED", "true");
    vi.stubEnv("UK_CASE_COMMONS_EMERGENCY_STOP", "");
    vi.stubEnv(
      "UK_CASE_COMMONS_STOPPED_CASE_IDS",
      "not-a-case, NOT A CASE",
    );

    const loaded = await import("../config.js");

    expect(loaded.config.caseCommons).toEqual({
      emergencyStop: false,
      publicDataEnabled: true,
      stoppedCaseIds: ["not-a-case", "NOT A CASE"],
    });
  });
});

describe("config.professionalOpportunities — publication gate and stop", () => {
  it("requires the exact public enable value in every environment", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("UK_PROFESSIONAL_OPPORTUNITIES_PUBLIC_DATA_ENABLED", "");
    vi.stubEnv("UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP", "");
    vi.stubEnv("UK_PROFESSIONAL_OPPORTUNITIES_STOPPED_IDS", "");
    let loaded = await import("../config.js");
    expect(loaded.config.professionalOpportunities).toEqual({
      emergencyStop: false,
      publicDataEnabled: false,
      stoppedOpportunityIds: [],
    });

    for (const value of ["TRUE", "1", "malformed"]) {
      vi.resetModules();
      vi.stubEnv(
        "UK_PROFESSIONAL_OPPORTUNITIES_PUBLIC_DATA_ENABLED",
        value,
      );
      loaded = await import("../config.js");
      expect(
        loaded.config.professionalOpportunities.publicDataEnabled,
      ).toBe(false);
    }

    vi.resetModules();
    vi.stubEnv(
      "UK_PROFESSIONAL_OPPORTUNITIES_PUBLIC_DATA_ENABLED",
      "true",
    );
    loaded = await import("../config.js");
    expect(
      loaded.config.professionalOpportunities.publicDataEnabled,
    ).toBe(true);
  });

  it.each(["true", "TRUE", "1", "malformed", " false "])(
    "fails closed for non-empty emergency-stop value %j",
    async (value) => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv(
        "UK_PROFESSIONAL_OPPORTUNITIES_PUBLIC_DATA_ENABLED",
        "true",
      );
      vi.stubEnv(
        "UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP",
        value,
      );
      vi.stubEnv("UK_PROFESSIONAL_OPPORTUNITIES_STOPPED_IDS", "");

      const loaded = await import("../config.js");
      expect(loaded.config.professionalOpportunities).toEqual({
        emergencyStop: true,
        publicDataEnabled: false,
        stoppedOpportunityIds: [],
      });
    },
  );

  it.each(["", "false"])(
    "leaves the emergency stop off only for %j",
    async (value) => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv(
        "UK_PROFESSIONAL_OPPORTUNITIES_PUBLIC_DATA_ENABLED",
        "true",
      );
      vi.stubEnv(
        "UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP",
        value,
      );
      vi.stubEnv("UK_PROFESSIONAL_OPPORTUNITIES_STOPPED_IDS", "");

      const loaded = await import("../config.js");
      expect(loaded.config.professionalOpportunities).toEqual({
        emergencyStop: false,
        publicDataEnabled: true,
        stoppedOpportunityIds: [],
      });
    },
  );

  it("deduplicates stop IDs but leaves validation to the route", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "UK_PROFESSIONAL_OPPORTUNITIES_PUBLIC_DATA_ENABLED",
      "true",
    );
    vi.stubEnv("UK_PROFESSIONAL_OPPORTUNITIES_EMERGENCY_STOP", "");
    vi.stubEnv(
      "UK_PROFESSIONAL_OPPORTUNITIES_STOPPED_IDS",
      "hmrc-decision-and-deadline-audit, hmrc-decision-and-deadline-audit, NOT VALID",
    );

    const loaded = await import("../config.js");

    expect(
      loaded.config.professionalOpportunities.stoppedOpportunityIds,
    ).toEqual([
      "hmrc-decision-and-deadline-audit",
      "NOT VALID",
    ]);
  });
});
