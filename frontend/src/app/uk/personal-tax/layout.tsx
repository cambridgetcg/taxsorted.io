import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Adjusted net income and UK personal tax thresholds | TaxSorted",
  description:
    "A private, browser-local 2026/27 adjusted-net-income check for Personal Allowance, the High Income Child Benefit Charge and Tax-Free Childcare's income condition.",
  alternates: { canonical: "https://taxsorted.io/uk/personal-tax/" },
  openGraph: {
    title: "Adjusted net income and UK personal tax thresholds | TaxSorted",
    description:
      "Map the £60,000 and £100,000 UK tax thresholds from one evidence-backed calculation.",
    url: "https://taxsorted.io/uk/personal-tax/",
    type: "website",
  },
};

export default function PersonalTaxLayout({ children }: { children: ReactNode }) {
  return children;
}
