import type { Metadata } from "next";
import RecordsClient from "../../../itsa/records/records-client";

export const metadata: Metadata = {
  title: "Money — your books | TaxSorted",
  description: "Add and check money coming into or leaving your UK business.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/books/workspace/money" },
};

export default function BooksMoneyPage() {
  return <RecordsClient entry="books" view="money" />;
}
