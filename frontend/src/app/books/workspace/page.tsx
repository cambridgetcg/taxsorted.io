import type { Metadata } from "next";
import RecordsClient from "@/features/books/records-client";

export const metadata: Metadata = {
  title: "Your books — local accounting workspace | TaxSorted",
  description:
    "Bring in UK self-employment or property money movements, review every suggestion and derive figures from records held in this browser.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/books/workspace" },
};

export default function BooksWorkspacePage() {
  return <RecordsClient entry="books" view="today" />;
}
