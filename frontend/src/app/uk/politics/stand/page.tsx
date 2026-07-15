import type { Metadata } from "next";
import { PoliticsNav } from "@/components/politics/politics-nav";
import { StandGuide } from "./stand-guide";

export const metadata: Metadata = {
  title: "Stand for public office in the UK — TaxSorted",
  description:
    "A non-partisan, source-linked path through the work, eligibility, nomination, money, support, safety, pay and duties of becoming an MP or an English principal councillor.",
};

export default function StandForOfficePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PoliticsNav />

      <header className="mt-8 overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/65">
          Public Office Pathfinder · no account · no political profile
        </p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight sm:text-6xl">
          Start with the work, not the title.
        </h1>
        <p className="mt-4 text-lg text-white/70">揀工作，唔係先揀名銜。</p>
        <p className="mt-5 max-w-4xl text-lg text-white/80">
          Compare two real elected-office routes, see every formal gate and practical burden,
          and leave through the right official door. TaxSorted will not ask how you vote,
          recommend a party, judge your suitability or pretend to certify legal eligibility.
        </p>
      </header>

      <StandGuide />
    </div>
  );
}
