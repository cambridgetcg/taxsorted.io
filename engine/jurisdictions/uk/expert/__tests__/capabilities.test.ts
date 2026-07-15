import { describe, expect, it } from "vitest";
import { UK_TAX_EXPERT_MANIFEST } from "../capabilities";

describe("UK tax expert capability routes", () => {
  it("sends VAT readers to its workspace and does not imply production filing", () => {
    const vat = UK_TAX_EXPERT_MANIFEST.capabilities.find((item) => item.id === "uk.vat");

    expect(vat).toBeDefined();
    expect(vat?.humanHref).toBe("/vat");
    expect(vat?.scope).toMatch(/HMRC sandbox connection/i);
    expect(vat?.exclusions).toContain("Production filing before HMRC recognition");
    expect(vat?.scope).not.toMatch(/sandbox\/live/i);
  });
});
