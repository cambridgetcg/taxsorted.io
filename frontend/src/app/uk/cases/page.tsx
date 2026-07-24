import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ukCaseCommons } from "@/lib/uk-case-commons";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "UK public-power case commons — TaxSorted",
  description:
    "Source-backed deep dives into decided UK challenges to public bodies, with remedies, honest recovery meanings and a local-first professional review packet.",
};

const routeAccents = [
  "border-emerald-200 bg-emerald-50",
  "border-sky-200 bg-sky-50",
  "border-violet-200 bg-violet-50",
  "border-amber-200 bg-amber-50",
  "border-stone-200 bg-stone-50",
] as const;

export default function UkCaseCommonsPage() {
  const { meta, protocol, publication, cases } = ukCaseCommons;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs
        items={[{ href: "/uk", label: "The UK system" }]}
        current="Case commons"
        className="mb-6"
      />

      <header className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10 lg:p-12">
        <div
          className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute right-12 top-12 h-28 w-28 rounded-full bg-accent/40"
          aria-hidden="true"
        />
        <div className="relative max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
            England and Wales first · decided records only
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            Public power, checked in daylight.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/80">
            A forkable case library for asking what a public body could lawfully
            do, what a court actually found, which remedy followed, and whether
            any money was truly recovered—or merely affected.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#deep-case"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-base font-semibold text-ink hover:bg-accent-soft"
            >
              Read the first deep case
            </a>
            <a
              href="#method"
              className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 py-2.5 text-base font-semibold text-white hover:bg-white/10"
            >
              Follow the case test
            </a>
          </div>
        </div>
      </header>

      <section
        className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8"
        aria-labelledby="boundary-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          The honest boundary
        </p>
        <h2
          id="boundary-title"
          className="mt-2 text-2xl font-semibold tracking-tight text-ink"
        >
          Research commons, not a lawsuit marketplace.
        </h2>
        <p className="mt-3 max-w-5xl text-base leading-7 text-ink-soft">
          TaxSorted does not take a case, predict a win, sell a lead, rank a
          lawyer, contact a claimant or share in damages. The first release has
          no intake and no private uploads. A qualified professional makes any
          case-specific assessment in a confidential matter system.
        </p>
        <p className="mt-4 text-sm leading-6 text-amber-950">
          {meta.warning}
        </p>
      </section>

      <section id="method" className="mt-16 scroll-mt-6" aria-labelledby="method-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Choose the lawful route first
        </p>
        <h2
          id="method-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          “The body was wrong” is only the beginning.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Appeal, judicial review, a rights claim, a separate money cause and a
          complaint have different powers and clocks. They must not be folded
          into one giant “sue” button.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {protocol.routeMap.map((route, index) => (
            <article
              key={route.id}
              className={`rounded-3xl border p-5 ${routeAccents[index] ?? routeAccents[0]}`}
            >
              <h3 className="text-lg font-semibold text-ink">{route.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{route.mayDo}</p>
              <p className="mt-4 border-t border-black/10 pt-4 text-sm font-medium leading-6 text-ink">
                Money: {route.moneyBoundary}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]" aria-labelledby="money-title">
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Potential gain, with the costume removed
          </p>
          <h2
            id="money-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            Every pound gets a state.
          </h2>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Amount affected", protocol.financialLanguage.amountAffected],
              ["Gross recovery", protocol.financialLanguage.grossRecovery],
              ["Net recovery", protocol.financialLanguage.netRecovery],
              ["Expected value", protocol.financialLanguage.expectedValue],
            ].map(([term, meaning]) => (
              <div key={term} className="rounded-2xl bg-paper p-5">
                <dt className="font-semibold text-ink">{term}</dt>
                <dd className="mt-2 text-sm leading-6 text-ink-soft">{meaning}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950">
            {protocol.financialLanguage.illustrativeRangeRule}
          </p>
        </article>

        <article className="rounded-[2rem] border border-line bg-accent-soft p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Eight gates, independent stops
          </p>
          <ol className="mt-5 space-y-3">
            {protocol.steps.map((step) => (
              <li key={step.id} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-accent">
                  {step.order}
                </span>
                <p className="pt-1 text-sm leading-6 text-ink">{step.question}</p>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section id="deep-case" className="mt-16 scroll-mt-6" aria-labelledby="case-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          First admitted deep case
        </p>
        <h2 id="case-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          One case, followed all the way through.
        </h2>
        <div className="mt-7 grid gap-5">
          {cases.map((caseRecord) => (
            <article
              key={caseRecord.id}
              className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-sm"
            >
              <div className="grid lg:grid-cols-[1fr_18rem]">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-900">
                      Decided
                    </span>
                    <span className="rounded-full bg-paper px-3 py-1.5 text-ink-soft">
                      {caseRecord.citation}
                    </span>
                    <span className="rounded-full bg-paper px-3 py-1.5 text-ink-soft">
                      No win score
                    </span>
                  </div>
                  <h3 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
                    {caseRecord.title}
                  </h3>
                  <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
                    {caseRecord.publicInterestQuestion}
                  </p>
                  <p className="mt-5 max-w-4xl text-base leading-7 text-ink">
                    {caseRecord.whyItMatters}
                  </p>
                  <Link
                    href={`/uk/cases/${caseRecord.slug}`}
                    className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-base font-semibold text-white hover:bg-accent-deep"
                  >
                    Open the evidence file →
                  </Link>
                </div>
                <div className="border-t border-line bg-ink p-6 text-white lg:border-l lg:border-t-0 sm:p-8">
                  <p className="text-sm font-semibold uppercase tracking-wide text-white/65">
                    Money status
                  </p>
                  <p className="mt-3 text-2xl font-semibold">
                    {caseRecord.financialEffect.headline}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-white/75">
                    Not a payout. Net recovery is not established and the
                    underlying tax appeal later failed.
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-5 lg:grid-cols-3" aria-labelledby="local-title">
        <div className="lg:col-span-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Decentralised by custody, not by hype
          </p>
          <h2 id="local-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Public packet here. Private case with its rightful keeper.
          </h2>
        </div>
        {[
          ["Mirror the public packet", protocol.decentralisation.publicPacket],
          ["Keep private evidence local", protocol.decentralisation.privateSupplement],
          ["Verify what a digest proves", protocol.decentralisation.digestMeaning],
        ].map(([title, body]) => (
          <article key={title} className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8 lg:p-10" aria-labelledby="professional-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          For qualified professionals
        </p>
        <h2 id="professional-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Pick up the method locally—not somebody&apos;s identity.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Download a blank assessment packet, verify the public sources, then
          work inside your own approved matter system. There is no submission
          endpoint and no public bid.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://api.taxsorted.io/v1/case-commons/uk/assessment-template"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-base font-semibold text-white hover:bg-accent-deep"
          >
            Blank local assessment JSON ↗
          </a>
          <a
            href="https://api.taxsorted.io/v1/case-commons/uk/schema"
            className="inline-flex min-h-11 items-center rounded-full border border-line px-5 py-2.5 text-base font-semibold text-accent hover:bg-paper"
          >
            Case schema ↗
          </a>
          <a
            href="https://github.com/cambridgetcg/taxsorted.io/tree/main/research/uk/case-commons"
            className="inline-flex min-h-11 items-center rounded-full border border-line px-5 py-2.5 text-base font-semibold text-accent hover:bg-paper"
          >
            Fork the research ↗
          </a>
          <a
            href="https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/case-commons/AGENTTOOL.md"
            className="inline-flex min-h-11 items-center rounded-full border border-line px-5 py-2.5 text-base font-semibold text-accent hover:bg-paper"
          >
            AgentTool local mirror ↗
          </a>
        </div>
        <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950">
          {publication.activationGap}
        </p>
      </section>

      <p className="mt-8 text-sm leading-6 text-ink-soft">
        Corpus {meta.version}, reviewed {meta.retrievedAt}.{" "}
        <a
          href={publication.corrections}
          className="font-medium text-accent underline underline-offset-4"
        >
          Public factual corrections
        </a>{" "}
        require a GitHub account. Never post private case material there.
      </p>
    </div>
  );
}
