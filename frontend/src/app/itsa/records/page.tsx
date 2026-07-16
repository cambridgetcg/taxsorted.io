import type { Metadata } from "next";
import RecordsClient from "./records-client";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Your records — Making Tax Digital for Income Tax | TaxSorted",
  description:
    "Keep self-employment and UK property income and expenses in your own browser, sorted into HMRC's own MTD categories. Nothing here leaves your device.",
};

export default function RecordsPage() {
  return <RecordsClient />;
}
