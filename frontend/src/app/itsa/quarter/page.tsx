import type { Metadata } from "next";
import QuarterClient from "./quarter-client";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Quarterly figures & estimate — Making Tax Digital for Income Tax | TaxSorted",
  description:
    "Your cumulative quarterly figures from reviewed digital records, with structured export and a cited Self Assessment estimate.",
};

export default function QuarterPage() {
  return <QuarterClient />;
}
