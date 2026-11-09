import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "The £60,000 and £100,000 tax lines — check your position | TaxSorted",
  description:
    "A private, browser-only 2026/27 check of your adjusted net income (ANI) for the Personal Allowance, the High Income Child Benefit Charge and Tax-Free Childcare's income test.",
  alternates: { canonical: "https://taxsorted.io/uk/personal-tax/" },
  // This replaces the root openGraph whole, so the site card, name and locale
  // are named again here (alt text as in app/opengraph-image.alt.txt).
  openGraph: {
    title: "The £60,000 and £100,000 tax lines — check your position | TaxSorted",
    description:
      "Check the £60,000 and £100,000 UK tax thresholds from one evidence-backed calculation, privately in your browser.",
    url: "https://taxsorted.io/uk/personal-tax/",
    type: "website",
    siteName: "TaxSorted.io",
    locale: "en_GB",
    images: {
      url: "/opengraph-image.png",
      width: 1200,
      height: 630,
      alt: "TaxSorted: Tax, understood. Then sorted. Free UK tax help in plain English. Money records stay on your device.",
    },
  },
};

export default function PersonalTaxLayout({ children }: { children: ReactNode }) {
  return children;
}
