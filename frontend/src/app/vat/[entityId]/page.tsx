// Server component — generateStaticParams must live here (not in "use client" files)
import type { Metadata } from "next";
import VATPageClient from "./vat-page-client";

export const metadata: Metadata = {
  title: "VAT worked example",
  description:
    "A worked VAT example with made-up numbers — no account, no HMRC connection, and no filing capability.",
  robots: {
    index: false,
    follow: false,
  },
};

export function generateStaticParams() {
  return [
    { entityId: "ent_001" },
    { entityId: "ent_002" },
    { entityId: "ent_003" },
  ];
}

interface PageProps {
  params: Promise<{ entityId: string }>;
}

export default async function VATPage({ params }: PageProps) {
  const { entityId } = await params;
  return <VATPageClient entityId={entityId} />;
}
