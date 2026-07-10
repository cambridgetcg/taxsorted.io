import type { Metadata } from "next";
import { PoliticsNav } from "@/components/politics/politics-nav";
import { PeopleDirectory } from "./people-directory";

export const metadata: Metadata = {
  title: "UK political people and public offices — TaxSorted",
  description:
    "A staged directory of current MPs and peers, sourced public offices, roles, declared interests and Parliamentary records.",
};

export default function PoliticsPeoplePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <PoliticsNav />
      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Westminster · official-source preview</p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Who they are. Where their office is. What the record says.
        </h1>
        <p className="mt-5 max-w-4xl text-lg text-ink-soft">
          The built directory covers every current MP and peer. Open one record for their published professional
          contacts, roles, declared interests, recent work in Parliament and election result. A
          publicly listed staff field is built but remains part of the privacy decision. No private
          contacts, no profiles by guesswork.
        </p>
        <p className="mt-5 rounded-2xl bg-accent-soft p-4 text-sm text-ink">
          <strong>Publication gate:</strong> the interface and API are ready for testing, but production
          people data stays off until the privacy assessment and public notice are approved.
        </p>
      </header>
      <PeopleDirectory />
    </div>
  );
}
