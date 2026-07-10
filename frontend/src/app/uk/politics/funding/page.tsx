import type { Metadata } from "next";
import { PoliticsNav } from "@/components/politics/politics-nav";
import { FundingRegister } from "./funding-register";

export const metadata: Metadata = {
  title: "UK political funding — TaxSorted",
  description:
    "Understand reportable UK party donations through attributed Electoral Commission records and explicit coverage limits.",
};

export default function PoliticsFundingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <PoliticsNav />
      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Party funding · official returns</p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Follow the declared money. Keep the claim no larger than the record.
        </h1>
        <p className="mt-5 max-w-4xl text-lg text-ink-soft">
          Political parties report qualifying donations to the Electoral Commission. A published
          donation record reports what was declared or accepted; it is not proof of control, motive
          or wrongdoing. When TaxSorted&apos;s separately gated view is approved, it keeps the source,
          reporting date and register beside every line—and excludes donor addresses.
        </p>
      </header>
      <FundingRegister />
    </div>
  );
}
