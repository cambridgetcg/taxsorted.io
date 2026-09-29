import type { Metadata } from "next";
import RecordsClient from "@/features/books/records-client";

export const metadata: Metadata = {
  title: "Backups — your Books | TaxSorted",
  description: "Save a password-protected Books backup or review an existing copy before restoring it on this device.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/books/workspace/backups" },
};

export default function BooksBackupsPage() {
  return <RecordsClient entry="books" view="backups" />;
}
