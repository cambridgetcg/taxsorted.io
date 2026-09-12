import type { Metadata } from "next";
import RecordsClient from "@/features/books/records-client";

export const metadata: Metadata = {
  title: "Tax — your books | TaxSorted",
  description: "See the UK Income Tax view derived from checked local records.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/books/workspace/tax" },
};

export default function BooksTaxPage() {
  return <RecordsClient entry="books" view="tax" />;
}
