import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "The £60,000 and £100,000 tax lines — check your position | TaxSorted",
  description:
    "A private, browser-only 2026/27 check of your adjusted net income (ANI) for the Personal Allowance, the High Income Child Benefit Charge and Tax-Free Childcare's income test.",
  alternates: { canonical: "https://taxsorted.io/uk/personal-tax/" },
  openGraph: {
    title: "The £60,000 and £100,000 tax lines — check your position | TaxSorted",
    description:
      "Check the £60,000 and £100,000 UK tax thresholds from one evidence-backed calculation, privately in your browser.",
    url: "https://taxsorted.io/uk/personal-tax/",
    type: "website",
  },
};

export default function PersonalTaxLayout({ children }: { children: ReactNode }) {
  return children;
}
