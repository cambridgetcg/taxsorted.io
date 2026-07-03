import type { Metadata } from "next";
import QuarterClient from "./quarter-client";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Quarterly figures & estimate — Making Tax Digital for Income Tax | TaxSorted",
  description:
    "Your cumulative quarterly figures, ready to copy into any MTD software, plus a cited estimate of your Self Assessment bill.",
};

export default function QuarterPage() {
  return <QuarterClient />;
}
