import type { Metadata } from "next";
import { PoliticsNav } from "@/components/politics/politics-nav";
import { SystemGuide } from "./system-guide";

export const metadata: Metadata = {
  title: "How power works in UK politics — TaxSorted",
  description:
    "A source-linked map of UK elections, formal office powers, political finance, public money, relationship evidence and enforcement boundaries.",
};

export default function PoliticsSystemPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PoliticsNav />

      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Westminster foundation · public system records
        </p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          How power works — and where it stops.
        </h1>
        <p className="mt-5 max-w-4xl text-lg text-ink-soft">
          Follow responsibility from election rules to the count, inspect the published powers of
          an office, and see how campaign money, public budgets, relationship records and enforcement
          fit together. Every claim stays attached to an official source and a stated coverage limit.
        </p>
      </header>

      <SystemGuide />
    </div>
  );
}
