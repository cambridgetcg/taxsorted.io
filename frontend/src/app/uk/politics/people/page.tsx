import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
      <Breadcrumbs
        items={[
          { href: "/uk/money", label: "Follow the money" },
          { href: "/uk/politics", label: "UK politics" },
        ]}
        current="Your MP"
        className="mb-4"
      />
      <PoliticsNav />
      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Westminster · official records</p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Look up your MP — and what the public record says.
        </h1>
        <p className="mt-5 max-w-4xl text-lg text-ink-soft">
          The directory covers every current MP and peer (a member of the House of Lords). Open a
          record for their office contacts, roles, declared interests, recent work in Parliament and
          election result. No private contacts, no guesswork.
        </p>
        <p className="mt-5 rounded-2xl bg-accent-soft p-4 text-base text-ink">
          <strong>Not switched on yet:</strong> the directory is built and testable, but live people
          data stays off until the privacy checks and public notice are approved.
        </p>
      </header>
      <PeopleDirectory />
    </div>
  );
}
