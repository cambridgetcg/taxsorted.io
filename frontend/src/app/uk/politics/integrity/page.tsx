import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { PoliticsNav } from "@/components/politics/politics-nav";
import {
  accountabilityMaps,
  englandWalesPolicePay,
  enforcementPowerCards,
  excludedIntegrityMaterial,
  financeDatasets,
  gatedIntegrityMaterial,
  integrityApiDoors,
  integrityDistributionDoors,
  politicsApiBase,
  powerDimensions,
  type DatasetStatus,
} from "./integrity-data";

export const metadata: Metadata = {
  title: "Public money, corporate records and law enforcement — TaxSorted",
  description:
    "A source-linked UK public-integrity map with explicit legal and privacy gates: finance datasets, institutional law-enforcement accountability and formal office powers.",
};

const statusTone: Record<DatasetStatus, string> = {
  Live: "border-accent bg-accent-soft text-accent-deep",
  "Review gate": "border-amber-200 bg-amber-50 text-amber-900",
  Mapped: "border-sky-200 bg-sky-50 text-sky-900",
  "Licence gate": "border-stone-300 bg-stone-100 text-stone-700",
};

function ApiLink({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <a
      href={`${politicsApiBase}${path}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex min-h-11 items-center break-all font-mono text-sm font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
    >
      {children}
    </a>
  );
}

const pounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export default function PoliticsIntegrityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/uk", label: "The UK system" },
          { href: "/uk/politics", label: "UK politics" },
        ]}
        current="Police & public money"
        className="mb-4"
      />
      <PoliticsNav />

      <header className="relative mt-8 overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -right-4 -top-10 h-40 w-40 rounded-full bg-accent/40" aria-hidden="true" />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/85">
            Police & public money · official records
          </p>
          <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight sm:text-6xl">
            Follow the record on contracts, police powers and public money.
          </h1>
          <p className="mt-5 max-w-4xl text-lg text-white/85">
            Contracts, declared benefits, company records, land titles and political money are kept
            as separate, source-linked records. Police power is mapped by institution and office.
            Two names looking alike never becomes a “deal”, a favour or an allegation here.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={`${politicsApiBase}/integrity`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-base font-semibold text-ink hover:bg-accent-soft"
            >
              Open the integrity API <span aria-hidden="true">↗</span>
            </a>
            <a
              href="#finance"
              className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 text-base font-semibold text-white hover:bg-white/10"
            >
              See what is live now
            </a>
          </div>
        </div>
      </header>

      <ShortVersion className="mt-6">
        <li>Every money record here links to its official source and says what it proves.</li>
        <li>No single person runs UK policing — see who answers for what.</li>
        <li>Some records are still switched off, waiting for privacy or licence checks.</li>
      </ShortVersion>

      <section className="mt-8" aria-labelledby="truth-rule">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3">
          {[
            ["1 · Published observation", "Keep the publisher, source URL, dates and exact public identifiers beside the published record."],
            ["2 · Typed evidence event", "State what the publisher records: donation, meeting, award, benefit, filing or corporate land title."],
            ["3 · Reviewed join", "Join only on an exact official identifier or a documented manual review. A name match is only a candidate."],
          ].map(([title, body]) => (
            <article key={title} className="bg-white p-6">
              <h2 className="font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-base text-ink-soft">{body}</p>
            </article>
          ))}
        </div>
        <div id="truth-rule" className="rounded-b-3xl border-x border-b border-line bg-accent-soft p-5 text-base text-ink sm:px-6">
          <strong>Hard rule:</strong> donation + meeting + contract does not equal an exchange of
          benefits. A further relationship appears only when a competent official finding establishes it.
          Corrections and withdrawals stay visible as evidence states; causal inference stays “none”.
        </div>
      </section>

      <nav className="mt-6 rounded-3xl border border-line bg-white p-4" aria-label="On this page">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">On this page</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["#finance", "Money records"],
            ["#enforcement", "Who answers for the police"],
            ["#power", "Office power scores"],
            ["#public-work", "Jobs, pay & public work"],
            ["#api-doors", "For developers"],
            ["#boundaries", "What we hold back"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-base text-ink hover:border-accent hover:bg-accent-soft">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section id="finance" className="mt-14 scroll-mt-6" aria-labelledby="finance-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Finances · corporates · land · benefits</p>
        <div className="mt-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div>
            <h2 id="finance-title" className="text-3xl font-semibold tracking-tight text-ink">
              Every dataset says whether it is live, mapped or stopped.
            </h2>
            <p className="mt-3 max-w-4xl text-ink-soft">
              A public register is a starting point, not permission to copy everything.
              We separately check copyright, database rights (legal protection over collections),
              personal-data limits and correction routes.
            </p>
          </div>
          <ApiLink path="/relationships/datasets">GET /relationships/datasets ↗</ApiLink>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {financeDatasets.map((dataset) => (
            <article key={dataset.id} className="flex flex-col rounded-3xl border border-line bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">{dataset.title}</h3>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone[dataset.status]}`}>
                  {dataset.status}
                </span>
              </div>
              <p className="mt-3 text-base text-ink-soft">{dataset.summary}</p>
              <details className="mt-4">
                <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">What we publish — and what we leave out</summary>
                <div className="mt-2 space-y-3 text-base">
                  <p className="rounded-2xl bg-accent-soft p-3 text-ink"><strong>Included:</strong> {dataset.published}</p>
                  <p className="rounded-2xl bg-paper p-3 text-ink-soft"><strong className="text-ink">Left out:</strong> {dataset.withheld}</p>
                </div>
              </details>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-5 text-sm font-semibold">
                <a href={dataset.sourceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-accent underline decoration-line underline-offset-4">
                  Official source <span aria-hidden="true">↗</span>
                </a>
                {dataset.endpoint ? <ApiLink path={dataset.endpoint}>API status ↗</ApiLink> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="enforcement" className="mt-16 scroll-mt-6" aria-labelledby="enforcement-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Law enforcement · four separate maps</p>
        <h2 id="enforcement-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          No single person commands UK policing.
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">
          Strategy, appointments, funding, operational command, inspection, complaints and prosecution
          are different legal relationships. The map keeps them separate — Scotland and Northern
          Ireland run their own (devolved) systems.
        </p>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          {accountabilityMaps.map((map) => (
            <article key={map.id} className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{map.jurisdiction}</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{map.summary}</h3>
              <details className="mt-4">
              <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">See the chain of offices, step by step</summary>
              <ol className="mt-3 space-y-3">
                {map.steps.map((step, index) => (
                  <li key={step.office} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
                    {index < map.steps.length - 1 ? <span className="absolute bottom-[-0.75rem] left-[1.08rem] top-8 w-px bg-line" aria-hidden="true" /> : null}
                    <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="rounded-2xl bg-paper p-4">
                      <h4 className="font-semibold text-ink">{step.office}</h4>
                      <p className="mt-2 text-sm text-ink-soft">{step.responsibility}</p>
                      <p className="mt-3 border-l-2 border-accent pl-3 text-xs text-ink"><strong>Boundary:</strong> {step.boundary}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-2xl bg-accent-soft p-4 text-base text-ink"><strong>Checks:</strong> {map.checks}</p>
              </details>
            </article>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`${politicsApiBase}/enforcement/institutions`} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-base font-semibold text-white hover:bg-accent-deep">
            Browse the institutions <span aria-hidden="true">↗</span>
          </a>
          <a href={`${politicsApiBase}/enforcement/governance`} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-base font-semibold text-accent hover:bg-accent-soft">
            See who answers to whom <span aria-hidden="true">↗</span>
          </a>
          <a href={`${politicsApiBase}/enforcement/forces`} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-base font-semibold text-accent hover:bg-accent-soft">
            Open the police-force list <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section id="power" className="mt-16 scroll-mt-6" aria-labelledby="power-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Seven scored powers · set by law</p>
        <h2 id="power-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          What each enforcement office can legally do
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">
          The number rates an office&apos;s published legal powers — not the holder&apos;s character,
          performance, importance, network or integrity. Cards stay in institutional order, never a leaderboard.
          Compare only within the same office family, jurisdiction and method version.
        </p>

        <div className="mt-7 grid gap-5 lg:grid-cols-2">
          {enforcementPowerCards.map((card) => (
            <article key={card.officeId} className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-7">
              <header className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-4 border-b border-line pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{card.family}</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">{card.office}</h3>
                  <p className="mt-2 text-xs text-ink-soft">{card.jurisdiction} · {card.methodVersion}</p>
                </div>
                <div className="rounded-2xl bg-ink p-3 text-center text-white" aria-label={`Formal authority rating ${card.rating} out of 100`}>
                  <p className="text-2xl font-semibold tabular-nums">{card.rating}</p>
                  <p className="text-xs uppercase tracking-wide text-white/85">of 100</p>
                </div>
              </header>

              <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {powerDimensions.map((dimension) => {
                  const score = card.scores[dimension.id];
                  return (
                    <div key={dimension.id}>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <p className="font-medium text-ink">{dimension.label}</p>
                        <p className="tabular-nums text-ink-soft">{score}/5</p>
                      </div>
                      <div
                        role="meter"
                        aria-label={`${card.office}: ${dimension.label}`}
                        aria-valuemin={0}
                        aria-valuemax={5}
                        aria-valuenow={score}
                        className="mt-2 grid grid-cols-5 gap-1"
                      >
                        {[1, 2, 3, 4, 5].map((step) => (
                          <span key={step} className={`h-2 rounded-full ${step <= score ? "bg-accent" : "bg-line"}`} aria-hidden="true" />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <details className="mt-6 rounded-2xl bg-paper p-4">
                <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">Read the office&apos;s legal limits</summary>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-ink-soft">
                  {card.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}
                </ul>
                <p className="mt-4 text-sm text-ink-soft">
                  <strong className="text-ink">Evidence source IDs:</strong> {card.sourceIds.join(", ")}
                </p>
                <p className="mt-4"><ApiLink path={`/enforcement/power/offices/${card.officeId}`}>Open sourced card ↗</ApiLink></p>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section id="public-work" className="mt-16 scroll-mt-6" aria-labelledby="public-work-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Jobs, pay and public words</p>
        <h2 id="public-work-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          We track institutions and jobs — never private lives.
        </h2>
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-xl font-semibold text-ink">Workforce & pay</h3>
            <p className="mt-3 text-base text-ink-soft">
              Pay bands, allowances, pensions and senior pay stay separate, each with its own dates.
              Workforce numbers are totals only — never small groups a person could be picked out of.
            </p>
            <div className="mt-5 space-y-2">
              <p><ApiLink path="/enforcement/pay-benefits">Pay and benefits sources ↗</ApiLink></p>
              <p><ApiLink path="/enforcement/workforce">Aggregate workforce sources ↗</ApiLink></p>
            </div>
          </article>
          <article className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-xl font-semibold text-ink">Vacancies & public activity</h3>
            <p className="mt-3 text-base text-ink-soft">
              Job openings link to official application pages; we never collect applicant data. Public work
              means board meetings, minutes, inspection reports, strategies, annual reports and official
              speeches — not officer logs.
            </p>
            <div className="mt-5 space-y-2">
              <p><ApiLink path="/enforcement/vacancies">Official vacancy routes ↗</ApiLink></p>
              <p><ApiLink path="/enforcement/activities">Safe activity coverage ↗</ApiLink></p>
            </div>
          </article>
          <article className="rounded-3xl border border-line bg-accent-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Method only · not switched on</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Counting words in official texts</h3>
            <p className="mt-3 text-base text-ink-soft">
              A future collection of official texts may count sentence length, questions, pronouns,
              modal words (like &ldquo;must&rdquo; and &ldquo;may&rdquo;), numbers and speaking-turn length.
              Minimum: 10 documents, 5,000 words, 3 dates and 30 days.
            </p>
            <p className="mt-3 text-base font-medium text-ink">
              No sentiment, honesty, aggression, manipulation, ideology, competence, emotion, personality,
              intent or management-style label.
            </p>
            <p className="mt-5"><ApiLink path="/enforcement/communication-method">Read the proposed method ↗</ApiLink></p>
          </article>
          <article className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-xl font-semibold text-ink">Private security</h3>
            <p className="mt-3 text-base text-ink-soft">
              The Security Industry Authority (SIA — the private-security regulator), verified companies
              and public awards belong in the institution map. The individual licence checker stays an
              official link for one purpose, never a bulk worker directory.
            </p>
            <p className="mt-3 text-base font-medium text-ink">
              A private-security job or licence is not general police power.
            </p>
            <p className="mt-5"><ApiLink path="/enforcement/private-security">Read the boundary ↗</ApiLink></p>
          </article>
        </div>

        <article className="mt-5 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <div className="grid gap-4 border-b border-line p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">England &amp; Wales · current published base ranges</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Police pay by rank</h3>
              <p className="mt-2 text-base text-ink-soft">
                Effective {englandWalesPolicePay.effectiveFrom}; checked {englandWalesPolicePay.asAt}.
                London and other allowances are separate from these annual base-pay ranges.
              </p>
            </div>
            <a
              href={englandWalesPolicePay.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-semibold text-accent underline decoration-line underline-offset-4"
            >
              Home Office evidence ↗
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="bg-paper text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-6 py-3 font-semibold">Rank</th>
                  <th className="px-6 py-3 text-right font-semibold">Minimum</th>
                  <th className="px-6 py-3 text-right font-semibold">Maximum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {englandWalesPolicePay.ranks.map((range) => (
                  <tr key={range.rank}>
                    <th scope="row" className="px-6 py-3 font-medium text-ink">{range.rank}</th>
                    <td className="px-6 py-3 text-right tabular-nums text-ink-soft">{pounds.format(range.minimum)}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-ink-soft">{pounds.format(range.maximum)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 border-t border-line bg-accent-soft p-5 md:grid-cols-3">
            {englandWalesPolicePay.benefits.map((benefit) => (
              <p key={benefit} className="text-sm text-ink">{benefit}</p>
            ))}
          </div>
        </article>
      </section>

      <section id="api-doors" className="mt-16 scroll-mt-6" aria-labelledby="api-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">No key · release state visible · open formats</p>
        <h2 id="api-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">For developers</h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Once this release is deployed, the catalogue, rights statement and schemas stay readable
          while records wait for human approval. The catalogue says so plainly instead of showing an
          empty dataset. An open dataset carries stable IDs, a schema, source IDs, licence notes and
          JSON, CSV and NDJSON links.
        </p>
        <details className="mt-6 rounded-3xl border border-line bg-paper p-5">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">See the download doors</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrityDistributionDoors.map((door) => (
              <article key={door.path} className="rounded-2xl border border-line bg-accent-soft p-5">
                <ApiLink path={door.path}>GET {door.path}</ApiLink>
                <p className="mt-2 text-sm text-ink-soft">{door.label}</p>
              </article>
            ))}
          </div>
        </details>
        <p className="mt-5 text-base font-semibold">
          <Link href="/uk/politics/api" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
            Check what is open now, and how to mirror it <span aria-hidden="true">→</span>
          </Link>
        </p>
        <details className="mt-6 rounded-3xl border border-line bg-paper p-5">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">See the query and method doors</summary>
          <p className="mt-2 max-w-3xl text-sm text-ink-soft">
            Each door states its coverage, source and safety limits. A blocked source says so clearly
            instead of pretending to be empty.
          </p>
          <div className="mt-4 overflow-hidden rounded-3xl border border-line bg-white">
            <div className="divide-y divide-line">
              {integrityApiDoors.map((door) => (
                <article key={door.path} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(12rem,1fr)] sm:items-center sm:px-6">
                  <ApiLink path={door.path}>GET {door.path}</ApiLink>
                  <p className="text-sm text-ink-soft">{door.label}</p>
                </article>
              ))}
            </div>
          </div>
        </details>
      </section>

      <section id="boundaries" className="mt-16 scroll-mt-6" aria-labelledby="boundaries-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">The boundary is part of the product</p>
        <h2 id="boundaries-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          What is waiting for approval, and what we never publish
        </h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-xl font-semibold text-amber-950">Waiting for a human decision</h3>
            <details className="mt-2">
              <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-amber-950">Read the list</summary>
              <ul className="mt-2 space-y-3 text-base text-amber-950/90">
                {gatedIntegrityMaterial.map((item) => <li key={item}>○ {item}</li>)}
              </ul>
            </details>
          </article>
          <article className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-xl font-semibold text-ink">Never published, by design</h3>
            <details className="mt-2">
              <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">Read the list</summary>
              <ul className="mt-2 space-y-3 text-base text-ink-soft">
                {excludedIntegrityMaterial.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </details>
          </article>
        </div>
        <p className="mt-6 rounded-2xl bg-ink p-5 text-base text-white/90">
          <strong className="text-white">Emergency stop:</strong> any named-person record can be switched
          off without taking down the non-personal institution, method, source and accountability records.{" "}
          <ApiLink path="/integrity/corrections">Read the correction and restriction method ↗</ApiLink>
        </p>
      </section>

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6 text-base text-ink-soft">
        <p>This is a public-accountability map, not a universal people search.</p>
        <div className="flex gap-4 font-semibold">
          <Link href="/uk/politics/system" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">How power works</Link>
          <Link href="/uk/politics/method" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">Our publishing rules</Link>
        </div>
      </footer>
    </div>
  );
}
