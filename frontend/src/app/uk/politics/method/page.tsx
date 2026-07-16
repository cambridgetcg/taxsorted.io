import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { PoliticsNav } from "@/components/politics/politics-nav";

export const metadata: Metadata = {
  title: "How TaxSorted publishes UK politics data",
  description:
    "The sources, privacy boundary, licences, coverage limits and production gates behind TaxSorted's UK politics directory.",
};

const included = [
  "Names, roles, parties, constituencies and dates published by UK Parliament.",
  "Parliamentary and constituency office contacts published for that public role.",
  "Declared interests, recent Parliamentary activity and election results from the official register and APIs.",
  "Non-personal election responsibilities, current finance rules, public-money accountability and source maps.",
  "Versioned formal-power assessments attached to offices, with every dimension, limit and source visible.",
];

const pending = [
  "Named staff and job details: built, but not approved until necessity and reasonable expectations are assessed.",
  "Named professional contact details: require a field-by-field freshness and objection decision.",
  "Party donations: disabled until Political Finance Online reuse terms and the Article 9 basis are confirmed.",
  "Peers' party affiliation: requires a separate Article 9 decision from elected MPs.",
];

const excluded = [
  "Home or residential addresses, private phone numbers and private email addresses.",
  "Donor street addresses or postcodes, even when an upstream register contains them.",
  "Guessed relationships, inferred beliefs, personality scores or claims without a source.",
  "Bulk-contact or campaigning tools. This is a public record, not a targeting list.",
];

export default function PoliticsMethodPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/uk", label: "The UK system" },
          { href: "/uk/politics", label: "UK politics" },
        ]}
        current="Our rules"
        className="mb-4"
      />
      <PoliticsNav />

      <header className="mt-8 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Our publishing rules</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          How we publish this data — and where we stop.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          TaxSorted maps source-linked records that public bodies publish. Dataset records carry
          source identifiers, dates and coverage notes; live views add retrieval time where their
          contract says so. We do not enrich the record with private data or guesses.
        </p>
      </header>

      <ShortVersion className="mt-6">
        <li>We only show what official bodies publish, with a source on every claim.</li>
        <li>Private addresses, guessed links and personality claims never appear.</li>
        <li>Some fields stay off until privacy and licence checks are approved.</li>
      </ShortVersion>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-line bg-white p-6" aria-labelledby="included">
          <h2 id="included" className="text-2xl font-semibold text-ink">What we publish</h2>
          <ul className="mt-4 space-y-3 text-base text-ink-soft">
            {included.map((item) => <li key={item}><span aria-hidden="true">✓</span> {item}</li>)}
          </ul>
        </section>
        <section className="rounded-3xl border border-line bg-white p-6" aria-labelledby="excluded">
          <h2 id="excluded" className="text-2xl font-semibold text-ink">What stays out</h2>
          <ul className="mt-4 space-y-3 text-base text-ink-soft">
            {excluded.map((item) => <li key={item}><span aria-hidden="true">—</span> {item}</li>)}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-line bg-paper p-6" aria-labelledby="pending-fields">
        <h2 id="pending-fields" className="text-2xl font-semibold text-ink">Fields still waiting for a decision</h2>
        <p className="mt-2 max-w-3xl text-base text-ink-soft">
          Article 9 is the UK GDPR rule that gives extra protection to political-opinion data.
        </p>
        <ul className="mt-4 grid gap-3 text-base text-ink-soft md:grid-cols-2">
          {pending.map((item) => <li key={item}><span aria-hidden="true">○</span> {item}</li>)}
        </ul>
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-accent-soft p-6" aria-labelledby="corrections">
        <h2 id="corrections" className="text-2xl font-semibold text-ink">Corrections travel back to the source</h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          TaxSorted is a window onto official records, not the authority that creates them. If an
          official record is wrong, correct it with the publishing body first; our live view then
          follows. If our mapping or redaction is wrong and the report contains no private,
          personal or safety-sensitive evidence, use the public issue tracker. Never post such
          evidence publicly. A confidential TaxSorted intake is not live yet, so the project cannot
          safely receive that material until one exists.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="https://members.parliament.uk/members/commons"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-base font-medium text-accent"
          >
            UK Parliament members
          </a>
          <a
            href="https://search.electoralcommission.org.uk/"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-base font-medium text-accent"
          >
            Electoral Commission records
          </a>
          <Link
            href="/uk/politics/api"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-base font-medium text-white"
          >
            Read the API contract
          </Link>
          <a
            href="https://github.com/cambridgetcg/taxsorted.io/issues"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-base font-medium text-accent"
          >
            Public issue tracker
          </a>
        </div>
      </section>

      <section className="mt-8 border-t border-line pt-6 text-base text-ink-soft" aria-labelledby="coverage">
        <h2 id="coverage" className="font-semibold text-ink">Coverage, honestly</h2>
        <p className="mt-2">
          The first prepared layer covers Westminster: current Commons and Lords members and
          Parliamentary posts. Party donations have their own licence gate. Devolved legislatures
          (Scotland, Wales and Northern Ireland), local government, party officers, special
          advisers, lobbying records and ministerial meetings need separate official feeds. Their
          official source lanes are mapped, but they are not silently treated as normalized or
          complete here.
        </p>
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-paper p-6 text-base text-ink-soft" aria-labelledby="formal-power-method">
        <h2 id="formal-power-method" className="text-xl font-semibold text-ink">The power number rates an office, not a human</h2>
        <p className="mt-3">
          Six sourced dimensions — executive, law-making, oversight, enforcement, public money and
          appointments — are each scored from 0 to 5 under a published rubric (a fixed scoring
          guide). Jurisdiction and legal limits sit beside the result. Several offices held by one
          person are never added, and no funding, meeting, interest or corporate relationship
          changes the number.
        </p>
        <p className="mt-3">
          The first calibrations are explicitly provisional — early scores that may still move. A
          method change creates a new version; a legal change creates a new dated assessment, so
          history does not get silently rewritten.
        </p>
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-white p-6 text-base text-ink-soft" aria-labelledby="launch-gate">
        <h2 id="launch-gate" className="text-xl font-semibold text-ink">The production gate</h2>
        <p className="mt-3">
          Publicly visible personal data is still personal data. Before this directory is switched
          on in production, TaxSorted needs a written legitimate-interests assessment (a documented
          check that our reasons outweigh the privacy risk), an Article 9 condition for
          political-affiliation fields, a data-protection impact assessment (DPIA) and a clear
          privacy and correction notice. Building the source-safe software does not replace that
          decision.
        </p>
        <p className="mt-3">
          The non-personal system, process, rule and methodology endpoints remain readable while
          that people-data gate is closed. Their job is to make the framework inspectable without
          using a privacy switch as a secrecy switch.
        </p>
        <p className="mt-3">
          The Electoral Commission publishes party-finance downloads, but its Political Finance
          Online database does not currently state general bulk-reuse terms. TaxSorted links to the
          official record and keeps its donation feed off until the Commission confirms the reuse
          and attribution terms in writing.
        </p>
      </section>
    </div>
  );
}
