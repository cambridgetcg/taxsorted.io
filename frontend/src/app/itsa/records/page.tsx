import type { Metadata } from "next";
import RecordsClient from "@/features/books/records-client";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Starter Books — beginner bookkeeping | TaxSorted",
  description:
    "Bring in transactions, review plain-language category suggestions, and keep source-traced local books before anything reaches your tax figures.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/books/workspace" },
};

export default function RecordsPage() {
  return <RecordsClient />;
}
