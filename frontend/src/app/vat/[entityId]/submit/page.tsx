// Server component — generateStaticParams + Suspense boundary for useSearchParams
import type { Metadata } from "next";
import { Suspense } from "react";
import VATSubmitPageClient from "./submit-page-client";

export const metadata: Metadata = {
  title: "VAT example draft calculator",
  description:
    "A browser-only VAT example with made-up numbers — it does not connect to HMRC, save a draft or file a return.",
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

export default async function VATSubmitPage({ params }: PageProps) {
  const { entityId } = await params;
  return (
    <Suspense
      fallback={
        <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-ink-soft">
          Opening the browser-only example…
        </p>
      }
    >
      <VATSubmitPageClient entityId={entityId} />
    </Suspense>
  );
}
