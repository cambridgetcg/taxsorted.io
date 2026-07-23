import type { Metadata } from "next";
import { PoliticsNav } from "@/components/politics/politics-nav";
import { DecisionGuide } from "./decision-guide";

export const metadata: Metadata = {
  title: "Find where a UK tax decision lives — TaxSorted",
  description:
    "A neutral, source-linked map from a desired UK tax change to the institutions, legal stages, public doors, limits and personal remedy hand-offs that actually apply.",
};

export default function PublicDecisionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PoliticsNav />

      <header className="mt-8 overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/65">
          Public decision pathways · no account · no political profile
        </p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight sm:text-6xl">
          Find where the decision lives.
        </h1>
        <p className="mt-4 text-lg text-white/70">
          搵到權力喺邊，再揀你想行嘅門。
        </p>
        <p className="mt-5 max-w-4xl text-lg text-white/80">
          Start with the change—not a politician, party or campaign tactic. See who can propose,
          authorise, scrutinise, administer and review it; what every public door can legally do;
          and where a personal appeal must leave the policy path.
        </p>
      </header>

      <DecisionGuide />
    </div>
  );
}
