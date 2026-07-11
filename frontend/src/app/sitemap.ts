import type { MetadataRoute } from "next";

const origin = "https://taxsorted.io";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ["/", 1],
    ["/learn", 0.8],
    ["/uk/personal-tax", 0.9],
    ["/uk/tax-expert", 1],
    ["/uk/tax-industry", 0.9],
    ["/uk/charities", 0.9],
    ["/uk/public-funding", 0.9],
    ["/uk/accountability", 0.9],
    ["/uk/politics", 0.9],
    ["/uk/politics/system", 0.9],
    ["/uk/politics/integrity", 0.9],
    ["/uk/politics/api", 0.8],
    ["/uk/politics/method", 0.7],
    ["/itsa", 0.8],
    ["/itsa/am-i-in", 0.8],
    ["/tools/mileage", 0.7],
    ["/feedback", 0.6],
    ["/from-the-builders", 0.5],
  ].map(([path, priority]) => ({
    url: `${origin}${path}`,
    changeFrequency: "weekly" as const,
    priority: priority as number,
  }));
}
