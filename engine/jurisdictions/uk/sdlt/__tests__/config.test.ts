import { describe, expect, it } from "vitest";
import {
  FIRST_TIME_BUYER_BANDS,
  SDLT_RULESET,
  STANDARD_RESIDENTIAL_BANDS,
} from "../index";

describe("current SDLT rules", () => {
  it("pins the ordinary residential bands effective from 1 April 2025", () => {
    expect(STANDARD_RESIDENTIAL_BANDS).toEqual([
      { upToPence: 12_500_000, rateBasisPoints: 0 },
      { upToPence: 25_000_000, rateBasisPoints: 200 },
      { upToPence: 92_500_000, rateBasisPoints: 500 },
      { upToPence: 150_000_000, rateBasisPoints: 1_000 },
      { upToPence: null, rateBasisPoints: 1_200 },
    ]);
  });

  it("pins first-time-buyer relief to its post-1-April-2025 cap", () => {
    expect(FIRST_TIME_BUYER_BANDS).toEqual([
      { upToPence: 30_000_000, rateBasisPoints: 0 },
      { upToPence: 50_000_000, rateBasisPoints: 500 },
    ]);
    expect(SDLT_RULESET.firstTimeBuyerMaximumPence).toBe(50_000_000);
  });

  it("carries effective dates and primary sources with the rules", () => {
    expect(SDLT_RULESET.id).toBe("uk.sdlt.residential.individual.2025-04-01");
    expect(SDLT_RULESET.revision).toBe("2026-07-10.1");
    expect(SDLT_RULESET.effectiveFrom).toBe("2025-04-01");
    expect(SDLT_RULESET.reviewedOn).toBe("2026-07-10");
    expect(SDLT_RULESET.maximumConsiderationPence).toBe(1_000_000_000_000);
    expect(SDLT_RULESET.sources.map((source) => source.id)).toEqual(
      expect.arrayContaining([
        "fa2003-s55",
        "fa2003-sch4",
        "fa2003-sch4za",
        "fa2003-sch6za",
        "fa2003-sch9",
        "fa2003-s75za",
        "fa2003-sch9a",
        "fa2025-s51",
        "fa2021-sch16",
        "hmrc-higher-rates-transitional",
        "hmrc-rounding",
      ])
    );
    expect(SDLT_RULESET.sources.every((source) => source.url.startsWith("https://"))).toBe(true);
  });
});
