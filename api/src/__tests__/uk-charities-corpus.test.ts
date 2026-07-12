import { describe, expect, it } from "vitest";
import {
  ukCharities,
  ukCharitiesSchema,
  validateUkCharitiesGraph,
  type UkCharities,
} from "../uk-charities.js";

describe("UK charities corpus integrity", () => {
  it("loads a substantive UK-wide system map without organisation or people records", () => {
    expect(ukCharities.meta.reviewedOn).toBe("2026-07-12");
    expect(ukCharities.sources.length).toBeGreaterThanOrEqual(25);
    expect(ukCharities.regulators.length).toBeGreaterThanOrEqual(7);
    expect(ukCharities.registers.length).toBeGreaterThanOrEqual(6);
    expect(ukCharities.taxTreatments.length).toBeGreaterThanOrEqual(9);
    expect(ukCharities.pipelineStages.length).toBeGreaterThanOrEqual(12);
    expect(ukCharities.transparencyGaps.length).toBeGreaterThanOrEqual(12);
    expect(Object.hasOwn(ukCharities, "organisations")).toBe(false);
    expect(Object.hasOwn(ukCharities, "people")).toBe(false);
    expect(Object.hasOwn(ukCharities, "trustees")).toBe(false);
  });

  it("keeps the most important tax and ownership boundaries explicit", () => {
    const vat = ukCharities.taxTreatments.find(
      (item) => item.id === "tax-vat-no-blanket-exemption"
    );
    expect(vat?.position).toBe("no-blanket-exemption");
    expect(vat?.notEquivalentTo).toContain("All purchases being zero-rated.");

    const analysis = ukCharities.taxTreatments.find(
      (item) => item.id === "tax-public-benefit-bargain-analysis"
    );
    expect(analysis?.reasoningStatus).toBe("taxsorted-analysis");
    expect(analysis?.jurisdictions).toEqual(["England and Wales"]);
    expect(analysis?.reasoning).toMatch(/^TaxSorted analysis:/);
    expect(analysis?.notEquivalentTo).toContain(
      "Automatic relief because an organisation is religious."
    );

    const stewardship = ukCharities.controlModels.find(
      (item) => item.id === "control-trustee-stewardship"
    );
    expect(stewardship?.misleadingLabel).toMatch(/false idea/i);
  });

  it("rejects dangling references and evidence pointers into provenance", () => {
    const dangling = structuredClone(ukCharities) as UkCharities;
    dangling.registers[0].regulatorIds = ["regulator-not-real"];
    expect(() => validateUkCharitiesGraph(dangling)).toThrow(
      /unknown regulator: regulator-not-real/
    );

    const provenance = structuredClone(ukCharities) as UkCharities;
    provenance.regulators[0].evidence[0].fields = ["/sourceIds"];
    expect(() => validateUkCharitiesGraph(provenance)).toThrow(
      /evidence points into provenance metadata/
    );
  });

  it("rejects duplicate references and unsupported territorial overclaims", () => {
    const duplicate = structuredClone(ukCharities) as UkCharities;
    duplicate.helpRoutes[0].registerIds.push(duplicate.helpRoutes[0].registerIds[0]);
    expect(() => validateUkCharitiesGraph(duplicate)).toThrow(/repeats register reference/);

    const overclaim = structuredClone(ukCharities) as UkCharities;
    const englandOnly = overclaim.taxTreatments.find(
      (item) => item.id === "tax-charitable-rates-england"
    );
    expect(englandOnly).toBeDefined();
    englandOnly!.jurisdictions = ["United Kingdom"];
    expect(() => validateUkCharitiesGraph(overclaim)).toThrow(
      /lacks source coverage for jurisdiction: Wales/
    );
  });

  it("rejects impossible dates, future provenance and unknown fields", () => {
    const impossible = structuredClone(ukCharities) as unknown as Record<string, any>;
    impossible.sources[0].reviewedOn = "2026-13-40";
    expect(() => ukCharitiesSchema.parse(impossible)).toThrow(/invalid calendar date/);

    const future = structuredClone(ukCharities) as UkCharities;
    future.sources[0].lastUpdated = "2026-07-13";
    expect(() => validateUkCharitiesGraph(future)).toThrow(
      /lastUpdated is after corpus review date/
    );

    const afterSourceReview = structuredClone(ukCharities) as UkCharities;
    afterSourceReview.regulators[0].evidence[0].observedOn = "2026-07-12";
    expect(() => validateUkCharitiesGraph(afterSourceReview)).toThrow(
      /evidence is observed after source review date/
    );

    const unknown = structuredClone(ukCharities) as unknown as Record<string, any>;
    unknown.regulators[0].privateContact = "must never be silently stripped";
    expect(() => ukCharitiesSchema.parse(unknown)).toThrow(/Unrecognized key/);
  });

  it("keeps unavailable or unsafe source doors fail closed", () => {
    expect(
      ukCharities.registers.find((item) => item.id === "register-scotland-charities")
        ?.ingestionStatus
    ).toBe("fail-closed");
    expect(
      ukCharities.registers.find((item) => item.id === "register-ni-charities")
        ?.ingestionStatus
    ).toBe("manual-only");
    expect(
      ukCharities.transparencyGaps.find(
        (item) => item.id === "gap-people-belief-layer-excluded"
      )?.status
    ).toBe("bounded-by-design");
  });
});
