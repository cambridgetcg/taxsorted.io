import { describe, expect, it } from "vitest";
import sitemap from "../sitemap";
import robots from "../robots";
import { ukProfessionalOpportunityCorpus } from "@/lib/uk-professional-opportunities";

describe("public sitemap", () => {
  it("includes every substantive Learn guide", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const path of [
      "/learn/mtd-income-tax/",
      "/learn/income-tax/",
      "/learn/for-landlords/",
      "/learn/self-employed/",
      "/learn/history/window-tax/",
      "/learn/gov/how-tax-law-is-made/",
      "/learn/gov/who-runs-your-taxes/",
      "/learn/gov/what-we-send-hmrc/",
      "/learn/gov/your-levers/",
      "/learn/gov/receipts/",
    ]) {
      expect(urls).toContain(`https://taxsorted.io${path}`);
    }
  });

  it("publishes canonical trailing-slash URLs for the static export", () => {
    for (const entry of sitemap()) {
      const path = new URL(entry.url).pathname;
      expect(path === "/" || path.endsWith("/")).toBe(true);
    }
  });

  it("keeps the deep tax paths and ITSA tools discoverable", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const path of [
      "/books/",
      "/checkup/",
      "/plan/",
      "/file/",
      "/put-it-right/",
      "/passport/",
      "/trust/",
      "/uk/",
      "/uk/personal-tax/",
      "/uk/tax-expert/",
      "/uk/cases/",
      "/uk/cases/haworth-v-hmrc/",
      "/uk/politics/decisions/",
      "/uk/politics/stand/",
      "/itsa/quarter/",
    ]) {
      expect(urls).toContain(`https://taxsorted.io${path}`);
    }
  });

  it("keeps pending professional-opportunity research out of discovery", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(ukProfessionalOpportunityCorpus).toBeNull();
    expect(urls).not.toContain("https://taxsorted.io/uk/opportunities/");
    expect(urls).not.toContain("https://taxsorted.io/uk/regulator-scrutiny/");
  });

  it("lists the section hubs, About, and the once-orphaned routes", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const path of [
      "/about/",
      "/books/",
      "/books/connect/",
      "/tools/",
      "/understanding/",
      "/checkup/",
      "/plan/",
      "/file/",
      "/put-it-right/",
      "/passport/",
      "/trust/",
      "/vat/",
    ]) {
      expect(urls).toContain(`https://taxsorted.io${path}`);
    }
    expect(urls).not.toContain("https://taxsorted.io/books/workspace/");
    expect(urls).not.toContain("https://taxsorted.io/itsa/records/");
  });

  it("never advertises a robots-disallowed route in the sitemap", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    const disallowed: string[] = Array.isArray(rule.disallow)
      ? rule.disallow
      : rule.disallow
        ? [rule.disallow]
        : [];

    for (const path of disallowed) {
      expect(urls.some((url) => url === path || url.startsWith(`${path}/`))).toBe(false);
    }
  });
});
