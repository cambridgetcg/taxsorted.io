import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // These pages remain reachable for review, but should not be indexed as
      // live directories until their separate production gates open.
      disallow: ["/uk/politics/people", "/uk/politics/funding"],
    },
    sitemap: "https://taxsorted.io/sitemap.xml",
  };
}
