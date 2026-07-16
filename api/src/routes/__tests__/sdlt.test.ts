import { describe, expect, it } from "vitest";
import { createSdltRoutes, sdltRoutes } from "../sdlt.js";

function body(overrides: Record<string, unknown> = {}) {
  return {
    effectiveDate: "2026-07-10",
    chargeableConsiderationPence: 29_500_000,
    land: {
      jurisdiction: "england",
      use: "residential",
      interest: "freehold",
      dwellingCount: 1,
    },
    buyerKind: "individual",
    treatment: {
      firstTimeBuyerRelief: "do-not-claim",
      higherRates: "standard",
      nonResidentSurcharge: "do-not-apply",
    },
    specialCases: {
      linkedTransactions: false,
      sharedOwnership: false,
      otherReliefClaimed: false,
      complexConsideration: false,
      transitionalContractMayApply: false,
    },
    ...overrides,
  };
}

async function post(payload: unknown) {
  return sdltRoutes.request("/calculations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /calculations", () => {
  it("returns HMRC's worked £295,000 result with sources and a stable request hash", async () => {
    const first = await post(body());
    const second = await post(body());
    expect(first.status).toBe(200);
    const result = await first.json();
    const repeated = await second.json();
    expect(result.status).toBe("calculated");
    expect(result.calculation.taxDuePence).toBe(475_000);
    expect(result.calculation.rounding).toBe("down-to-whole-pound");
    expect(result.trust.method).toBe("deterministic");
    expect(result.trust.requestHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.trust.evaluatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(repeated.trust.requestHash).toBe(result.trust.requestHash);
    expect(result.trust.sources.some((source: { authority: string }) => source.authority === "UK Parliament")).toBe(true);
    expect(first.headers.get("set-cookie")).toBeNull();
  });

  it("returns needs_review with no zero-looking calculation for a new lease", async () => {
    const response = await post(
      body({
        land: {
          jurisdiction: "northern-ireland",
          use: "residential",
          interest: "new-lease",
          dwellingCount: 1,
        },
      })
    );
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reviewReasons.map((reason: { code: string }) => reason.code)).toContain(
      "new-lease-rent"
    );
    expect(result).not.toHaveProperty("taxDuePence");
  });

  it("rejects omitted facts and unknown misspelled fields", async () => {
    const missing = body();
    delete (missing as { specialCases?: unknown }).specialCases;
    const missingResponse = await post(missing);
    expect(missingResponse.status).toBe(422);
    expect(await missingResponse.json()).toMatchObject({ error: "invalid_request" });

    const misspelledResponse = await post({ ...body(), chargeableConsiderationPens: 123 });
    expect(misspelledResponse.status).toBe(422);
    const misspelled = await misspelledResponse.json();
    expect(misspelled.issues.some((issue: { code: string }) => issue.code === "unrecognized_keys")).toBe(true);
  });

  it("does not guess unknown surcharge classifications at the £40,000 cliff", async () => {
    const response = await post(
      body({
        chargeableConsiderationPence: 4_000_000,
        treatment: {
          firstTimeBuyerRelief: "do-not-claim",
          higherRates: "unknown",
          nonResidentSurcharge: "unknown",
        },
      })
    );
    const result = await response.json();
    expect(result.status).toBe("needs_review");
    expect(result.reviewReasons.map((reason: { code: string }) => reason.code)).toEqual([
      "higher-rates-status-unknown",
      "non-resident-status-unknown",
    ]);
  });

  it("stacks first-time-buyer relief with the non-resident surcharge", async () => {
    const response = await post(
      body({
        chargeableConsiderationPence: 50_000_000,
        treatment: {
          firstTimeBuyerRelief: "claim",
          higherRates: "standard",
          nonResidentSurcharge: "apply",
        },
      })
    );
    const result = await response.json();
    expect(result.status).toBe("calculated");
    expect(result.calculation.taxDuePence).toBe(2_000_000);
  });

  it("does not project the ongoing table onto a future legal effective date", async () => {
    const routes = createSdltRoutes({ today: () => "2026-07-10" });
    const response = await routes.request("/calculations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body({ effectiveDate: "2026-07-11" })),
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.status).toBe("needs_review");
    expect(result.calculation).toBeNull();
    expect(result.reviewReasons[0]).toMatchObject({ code: "future-effective-date" });
    expect(result.trust.ruleset.effectiveTo).toBeNull();
    expect(result.trust.ruleset.reviewedOn).toBe("2026-07-10");
    expect(result.trust.evaluatedOn).toBe("2026-07-10");
  });
});
