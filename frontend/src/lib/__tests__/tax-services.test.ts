import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AUDIENCES, SERVICES, allServicesForAudience, getAudience, servicesForAudience } from "../tax-services";

describe("tax service routing", () => {
  it("puts the three supported personal journeys first and keeps each list useful", () => {
    expect(AUDIENCES.slice(0, 3).map((audience) => audience.id)).toEqual(["individuals", "sole-traders", "landlords"]);
    for (const audience of AUDIENCES) {
      expect(servicesForAudience(audience.id)).toHaveLength(audience.serviceIds.length);
      expect(audience.serviceIds.length).toBeLessThanOrEqual(6);
    }
  });

  it("routes landlords into property records without offering the sole-trade comparison", () => {
    const landlordServices = servicesForAudience("landlords");
    expect(landlordServices.find((service) => service.id === "property-records")?.href)
      .toBe("/books/workspace/money?activity=uk-property");
    expect(landlordServices.some((service) => service.href.startsWith("/plan"))).toBe(false);
    expect(servicesForAudience("sole-traders").some((service) => service.id === "sole-trader-choices")).toBe(true);
  });

  it("links to existing pages and distinguishes preparation, guidance and test filing", () => {
    for (const service of SERVICES) {
      const path = new URL(service.href, "https://taxsorted.io").pathname.replace(/^\//, "");
      expect(existsSync(fileURLToPath(new URL(`../../app/${path}/page.tsx`, import.meta.url))), service.href).toBe(true);
    }
    expect(SERVICES.find((service) => service.id === "quarter-figures")?.availability).toBe("available");
    expect(SERVICES.find((service) => service.id === "prepare-return")?.availability).toBe("guidance");
    expect(SERVICES.find((service) => service.id === "vat")?.availability).toBe("sandbox");
  });

  it("does not invent a journey from an unknown URL value", () => {
    expect(getAudience("__proto__")).toBeUndefined();
    expect(getAudience(null)).toBeUndefined();
    expect(servicesForAudience("not-supported")).toEqual([]);
    expect(allServicesForAudience("not-supported")).toEqual([]);
  });

  it("includes related tools in the directory and carries landlord context into imports", () => {
    const services = allServicesForAudience("landlords");
    expect(services.find((service) => service.id === "csv-import")?.href)
      .toBe("/books/workspace/money?start=csv&activity=uk-property");
    expect(services.find((service) => service.id === "record-connections")?.href)
      .toBe("/books/connect?activity=uk-property");
    expect(services.some((service) => service.id === "mtd-detail")).toBe(true);
    expect(services.some((service) => service.id === "fix-problem")).toBe(true);
    expect(services.some((service) => service.id === "sole-trader-choices")).toBe(false);
    expect(servicesForAudience("landlords")).toHaveLength(6);
  });

  it("gives organisations relevant guidance without sending company accounts into personal books", () => {
    const services = allServicesForAudience("organisations");
    expect(services.some((service) => service.href.startsWith("/books"))).toBe(false);
    expect(services.find((service) => service.id === "charity-guide")?.href).toBe("/uk/charities");
    expect(services.find((service) => service.id === "vat")?.availability).toBe("sandbox");
  });
});
