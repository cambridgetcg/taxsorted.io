import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// The description repeats the root layout's; keep the two in step. "browser"
// display: a home-screen shortcut opens an ordinary tab, not an app window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaxSorted.io",
    short_name: "TaxSorted.io",
    description:
      "Practical UK tax tools for individuals, sole traders and landlords. Find your next steps, organise income and expenses, prepare figures and get help with tax problems.",
    start_url: "/",
    display: "browser",
    background_color: "#f7f4ee",
    theme_color: "#f7f4ee",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
