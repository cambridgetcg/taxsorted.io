import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
      <Breadcrumbs
        items={[
          { href: "/uk/money", label: "Follow the money" },
          { href: "/uk/politics", label: "UK politics" },
        ]}
        current="Party donations"
        className="mb-4"
      />
      <PoliticsNav />
      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Party donations · official returns</p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          See who gave money to political parties.
        </h1>
        <p className="mt-4 max-w-4xl text-lg font-medium text-ink-soft">
          We keep the claim no larger than the record.
        </p>
        <p className="mt-5 max-w-4xl text-lg text-ink-soft">
          Parties report qualifying donations to the Electoral Commission. A donation record shows
          what was declared or accepted — not control, motive or wrongdoing. Our view is still
          waiting for approval; once open, every line keeps its source, reporting date and register,
          and leaves out donor addresses.
        </p>
      </header>
      <FundingRegister />
    </div>
  );
}
