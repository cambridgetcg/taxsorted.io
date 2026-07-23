import { describe, expect, it } from "vitest";
import sitemap from "../sitemap";

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
      "/checkup/",
      "/passport/",
      "/uk/",
      "/uk/personal-tax/",
      "/uk/tax-expert/",
      "/uk/politics/decisions/",
      "/uk/politics/stand/",
      "/itsa/records/",
      "/itsa/quarter/",
    ]) {
      expect(urls).toContain(`https://taxsorted.io${path}`);
    }
  });

  it("lists the section hubs, About, and the once-orphaned routes", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const path of [
      "/about/",
      "/tools/",
      "/checkup/",
      "/passport/",
      "/vat/",
      "/uk/politics/people/",
      "/uk/politics/funding/",
    ]) {
      expect(urls).toContain(`https://taxsorted.io${path}`);
    }
  });
});
