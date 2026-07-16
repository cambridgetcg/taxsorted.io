import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
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
      <Breadcrumbs
        items={[
          { href: "/uk", label: "The UK system" },
          { href: "/uk/politics", label: "UK politics" },
        ]}
        current="How power works"
        className="mb-4"
      />
      <PoliticsNav />

      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          The UK political system · official records
        </p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          See how power works in UK politics — and where each office stops.
        </h1>
        <p className="mt-5 max-w-4xl text-lg text-ink-soft">
          This page maps elections, office powers, campaign money, public budgets and enforcement.
          Every claim links to an official source and says what it does not cover.
        </p>
      </header>

      <ShortVersion className="mt-6">
        <li>Elections are run by named offices — see who does each step.</li>
        <li>Each public office gets a 0–5 score for its published legal powers.</li>
        <li>Every claim links to an official source and states its limits.</li>
      </ShortVersion>

      <SystemGuide />
    </div>
  );
}
