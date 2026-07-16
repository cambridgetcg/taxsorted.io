import type { Metadata } from "next";
import RecordsClient from "./records-client";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Starter Books — beginner bookkeeping | TaxSorted",
  description:
    "Bring in transactions, review plain-language category suggestions, and keep source-linked local books before anything reaches your tax figures.",
};

export default function RecordsPage() {
  return <RecordsClient />;
}
