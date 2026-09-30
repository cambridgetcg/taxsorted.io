import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PrepareEntry } from "./prepare-entry";

export const metadata: Metadata = {
  title: "Prepare my tax return | TaxSorted",
  description:
    "Gather your circumstances, documents and employment figures for one tax year, with a preparation draft saved only when you choose.",
};

export default function PreparePage() {
  return (
    <div
      lang="en"
      dir="ltr"
      className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
    >
      <Breadcrumbs
        items={[{ href: "/services", label: "Tax services" }]}
        current="Prepare my tax return"
      />
      <header className="mt-7 max-w-3xl">
        <p className="section-label">Gather, understand, review</p>
        <h1 className="hero-title mt-4 text-ink">Prepare my tax return</h1>
        <p className="mt-6 text-lg leading-8 text-ink-soft">
          Work through one tax year at a time. Find the documents you need,
          record what you know and keep the questions that still need an answer.
        </p>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          This is preparation, not a tax calculation or a filing service. It
          does not decide whether you need a return or whether your return is
          complete.
        </p>
      </header>
      <Suspense fallback={<p className="mt-9" role="status">Loading preparation choices…</p>}>
        <PrepareEntry />
      </Suspense>
    </div>
  );
}
