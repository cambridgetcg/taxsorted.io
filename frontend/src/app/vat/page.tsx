import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import CockpitClient from "./cockpit-client";

// The real VAT home: your business, your HMRC connection, what you must send.
// Businesses are addressed by query (?e=...) because this site is a static export.
// The heading and the one-paragraph explanation below are server-rendered on
// purpose: they are the pre-JavaScript shell, so a slow connection still gets
// a page that says what it is.

export const metadata: Metadata = {
  title: "VAT — your records, your return | TaxSorted",
  description:
    "Practise a VAT return with manually entered figures and HMRC's sandbox. Books does not supply the VAT boxes; production filing is unavailable.",
};

export default function VatCockpitPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/file", label: "Prepare a return" }]} current="VAT" />

      <h1 className="mt-4 text-2xl font-bold text-ink sm:text-3xl">
        VAT — your records, your return
      </h1>
      <p className="mt-2 max-w-2xl text-base text-ink-soft">
        Add a test business and practise entering VAT figures manually. Books does not
        calculate or populate the VAT boxes. Connections and submissions here use HM Revenue
        &amp; Customs&apos; (HMRC) practice system; production filing is not available.
        Your business list stays in this browser, without an account.
      </p>

      <Suspense
        fallback={<p className="mt-6 text-base text-ink-soft">Loading your VAT home…</p>}
      >
        <CockpitClient />
      </Suspense>
    </div>
  );
}
