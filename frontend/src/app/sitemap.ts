import type { MetadataRoute } from "next";

const origin = "https://taxsorted.io";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ["/", 1],
    ["/checkup/", 1],
    ["/passport/", 1],
    ["/about/", 0.6],
    ["/tools/", 0.9],
    ["/learn/", 0.9],
    ["/learn/mtd-income-tax/", 0.9],
    ["/learn/income-tax/", 0.8],
    ["/learn/for-landlords/", 0.8],
    ["/learn/self-employed/", 0.8],
    ["/learn/history/window-tax/", 0.8],
    ["/learn/gov/how-tax-law-is-made/", 0.7],
    ["/learn/gov/who-runs-your-taxes/", 0.7],
    ["/learn/gov/what-we-send-hmrc/", 0.7],
    ["/learn/gov/your-levers/", 0.7],
    ["/learn/gov/receipts/", 0.7],
    ["/uk/personal-tax/", 0.9],
    ["/uk/", 0.9],
    ["/uk/tax-expert/", 1],
    ["/uk/tax-industry/", 0.9],
    ["/uk/charities/", 0.9],
    ["/uk/public-funding/", 0.9],
    ["/uk/accountability/", 0.9],
    ["/uk/politics/", 0.9],
    ["/uk/politics/system/", 0.9],
    ["/uk/politics/decisions/", 0.9],
    ["/uk/politics/stand/", 0.9],
    ["/uk/politics/integrity/", 0.9],
    ["/uk/politics/api/", 0.8],
    ["/uk/politics/method/", 0.7],
    ["/uk/politics/people/", 0.7],
    ["/uk/politics/funding/", 0.7],
    ["/vat/", 0.8],
    ["/itsa/", 0.8],
    ["/itsa/am-i-in/", 0.8],
    ["/itsa/records/", 0.7],
    ["/itsa/quarter/", 0.7],
    ["/tools/mileage/", 0.7],
    ["/feedback/", 0.6],
    ["/from-the-builders/", 0.5],
  ].map(([path, priority]) => ({
    url: `${origin}${path}`,
    changeFrequency: "weekly" as const,
    priority: priority as number,
  }));
}
