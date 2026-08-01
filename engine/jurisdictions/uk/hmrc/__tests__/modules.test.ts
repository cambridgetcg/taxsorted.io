import { describe, expect, it } from "vitest";
import {
  HMRC_MODULE_LIST,
  HMRC_MODULES,
  HMRC_RAILS,
  hmrcModuleFor,
  isHmrcRail,
} from "../index";

describe("HMRC module registry", () => {
  it("keeps a stable, complete public module list", () => {
    expect(HMRC_MODULE_LIST.map((module) => module.rail)).toEqual(HMRC_RAILS);
    expect(HMRC_MODULE_LIST).toHaveLength(2);
    expect(hmrcModuleFor("vat")).toBe(HMRC_MODULES.vat);
    expect(hmrcModuleFor("itsa")).toBe(HMRC_MODULES.itsa);
  });

  it("pins each module's exact OAuth grant and required entity identifier", () => {
    expect(HMRC_MODULES.vat.scopes).toEqual(["read:vat", "write:vat"]);
    expect(HMRC_MODULES.vat.identifier).toEqual({
      required: true,
      name: "VAT registration number",
      abbreviation: "VRN",
      entityField: "vrn",
    });

    expect(HMRC_MODULES.itsa.scopes).toEqual([
      "read:self-assessment",
      "write:self-assessment",
    ]);
    expect(HMRC_MODULES.itsa.identifier).toEqual({
      required: true,
      name: "National Insurance number",
      abbreviation: "NINO",
      entityField: "nino",
    });
  });

  it("links each plain module name to official public and developer guidance", () => {
    expect(HMRC_MODULES.vat.name).toBe("Making Tax Digital for VAT");
    expect(HMRC_MODULES.vat.official).toEqual({
      guidanceUrl: "https://www.gov.uk/government/collections/making-tax-digital-for-vat",
      developerUrl: "https://developer.service.hmrc.gov.uk/guides/vat-mtd-end-to-end-service-guide/",
    });

    expect(HMRC_MODULES.itsa.name).toBe("Making Tax Digital for Income Tax");
    expect(HMRC_MODULES.itsa.official).toEqual({
      guidanceUrl: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax",
      developerUrl: "https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/",
    });
  });

  it("says exactly which work is local, sandbox-only, or not available yet", () => {
    const states = HMRC_MODULE_LIST.flatMap((module) =>
      module.capabilities.map((capability) => capability.state)
    );
    expect(new Set(states)).toEqual(new Set(["available", "sandbox-only", "not-yet"]));

    expect(HMRC_MODULES.vat.capabilities).toContainEqual({
      id: "prepare-return",
      name: "Enter and validate VAT return figures",
      state: "available",
    });
    expect(HMRC_MODULES.vat.capabilities).toContainEqual({
      id: "connect",
      name: "Connect to HMRC",
      state: "sandbox-only",
    });
    expect(HMRC_MODULES.vat.capabilities).toContainEqual({
      id: "submit-return",
      name: "Submit a VAT return to HMRC",
      state: "sandbox-only",
    });
    expect(HMRC_MODULES.itsa.capabilities).toContainEqual({
      id: "submit-quarterly-update",
      name: "Send a quarterly update to HMRC",
      state: "sandbox-only",
    });
    expect(HMRC_MODULES.itsa.capabilities).toContainEqual({
      id: "submit-tax-return",
      name: "Submit the annual tax return",
      state: "not-yet",
    });
    for (const module of HMRC_MODULE_LIST) {
      expect(module.capabilities).toContainEqual({
        id: "production-access",
        name: "Use the live HMRC service",
        state: "not-yet",
      });
    }
  });

  it("recognises only registered rail names", () => {
    expect(isHmrcRail("vat")).toBe(true);
    expect(isHmrcRail("itsa")).toBe(true);
    expect(isHmrcRail("corporation-tax")).toBe(false);
  });
});
