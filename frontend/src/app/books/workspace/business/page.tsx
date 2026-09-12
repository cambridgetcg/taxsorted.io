import type { Metadata } from "next";
import RecordsClient from "@/features/books/records-client";

export const metadata: Metadata = {
  title: "Business — your books | TaxSorted",
  description: "Check which UK business your records belong to.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/books/workspace/business" },
};

export default function BooksBusinessPage() {
  return <RecordsClient entry="books" view="business" />;
}
