import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  professionalGateLabels,
  professionalOpportunitySources,
  ukProfessionalOpportunityCorpus,
} from "@/lib/uk-professional-opportunities";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  if (!ukProfessionalOpportunityCorpus) {
    return {
      title: "Professional tax research awaiting review — TaxSorted",
      description:
        "This research surface remains closed because its required independent publication checks are incomplete.",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "UK professional tax opportunities — TaxSorted",
    description:
      "Source-backed UK tax workstreams with professional gates, evidence, deadlines, money meanings and finite local review pipelines.",
  };
}

const stageColours = [
  "border-sky-200 bg-sky-50",
  "border-emerald-200 bg-emerald-50",
  "border-violet-200 bg-violet-50",
  "border-amber-200 bg-amber-50",
] as const;

function humanise(value: string) {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function SourceLinks({ sourceIds }: { sourceIds: readonly string[] }) {
  const sources = professionalOpportunitySources(sourceIds);
  return (
    <p className="mt-2 text-xs leading-5 text-ink-soft">
      Source:{" "}
      {sources.map((source, index) => (
        <span key={source.id}>
          {index > 0 ? " · " : ""}
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline underline-offset-2"
          >
            {source.title}
          </a>
        </span>
      ))}
    </p>
  );
}

export default function UkProfessionalOpportunitiesPage() {
  if (!ukProfessionalOpportunityCorpus) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Publication gate closed
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">
          This research is awaiting its required independent review.
        </h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">
          The public workstreams, sources and machine packets stay sealed until
          their exact content passes review and is enabled for this deployment. There
          is no client intake or private-evidence upload here.
        </p>
        <Link
          href="/uk"
          className="mt-7 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          Return to the UK system map
        </Link>
      </div>
    );
  }
  const { meta, method, publication, sharedWorkflow, opportunities } =
    ukProfessionalOpportunityCorpus;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs
        items={[{ href: "/uk", label: "The UK system" }]}
        current="Professional opportunities"
        className="mb-6"
      />

      <header className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10 lg:p-12">
        <div
          className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute right-14 top-14 h-28 w-28 rounded-full bg-accent/40"
          aria-hidden="true"
        />
        <div className="relative max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
            UK first · official sources · private work stays private
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            Specialist work, mapped without the sales pitch.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/80">
            TaxSorted maps recurring tax problems where evidence, deadlines and
            professional judgment can lawfully correct a liability, preserve a
            right, recover an overpayment or stop an avoidable cost. It does not
            turn a person into a lead or a disputed figure into promised profit.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#workstreams"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-base font-semibold text-ink hover:bg-accent-soft"
            >
              Explore the workstreams
            </a>
            <a
              href="#pipeline"
              className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 py-2.5 text-base font-semibold text-white hover:bg-white/10"
            >
              Follow the local pipeline
            </a>
          </div>
        </div>
      </header>

      <section
        className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8"
        aria-labelledby="meaning-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          What opportunity means here
        </p>
        <h2
          id="meaning-title"
          className="mt-2 text-2xl font-semibold tracking-tight text-ink"
        >
          A class of work worth checking—not a claimant, lead or likely payout.
        </h2>
        <p className="mt-3 max-w-5xl text-base leading-7 text-ink-soft">
          {method.opportunityDefinition}
        </p>
        <p className="mt-4 max-w-5xl text-sm leading-6 text-amber-950">
          {meta.warning}
        </p>
      </section>

      <section
        id="workstreams"
        className="mt-16 scroll-mt-6"
        aria-labelledby="workstreams-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Under-covered professional work
        </p>
        <h2
          id="workstreams-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Nine doors where facts and timing matter.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          The order is editorial, not a ranking. Each page names the evidence,
          correct professional gates, challenge route, downside and money
          calculation before anyone decides whether private review is justified.
        </p>
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {opportunities.map((opportunity) => (
            <article
              key={opportunity.id}
              className="flex h-full flex-col rounded-[2rem] border border-line bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                <span className="rounded-full bg-accent-soft px-3 py-1.5 text-accent-deep">
                  {opportunity.taxArea}
                </span>
                <span className="rounded-full bg-paper px-3 py-1.5 text-ink-soft">
                  No win score
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
                {opportunity.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {opportunity.whySpecialistJudgmentMatters[0]}
              </p>
              <p className="mt-5 border-t border-line pt-4 text-sm font-medium leading-6 text-ink">
                Value path: {opportunity.lawfulValueMechanisms[0]?.mechanism}
              </p>
              <SourceLinks
                sourceIds={
                  opportunity.lawfulValueMechanisms[0]?.sourceIds ?? []
                }
              />
              <Link
                href={`/uk/opportunities/${opportunity.slug}`}
                className="mt-6 inline-flex min-h-11 items-center font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
              >
                Open the evidence and workflow →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section
        id="pipeline"
        className="mt-16 scroll-mt-6"
        aria-labelledby="pipeline-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          One finite pipeline
        </p>
        <h2
          id="pipeline-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Every stage can stop. Every completed turn leaves a receipt.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          The public packet contains rules and sources. A client&apos;s identity,
          documents, advice and conflict material remain in the professional&apos;s
          approved matter system. TaxSorted has no assessment upload endpoint.
        </p>
        <ol className="mt-7 grid gap-4 md:grid-cols-2">
          {sharedWorkflow.stages.map((stage, index) => (
            <li
              key={stage.stage}
              className={`rounded-3xl border p-5 ${
                stageColours[index % stageColours.length]
              }`}
            >
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-accent">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {humanise(stage.stage)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    {stage.action}
                  </p>
                  <p className="mt-3 text-sm font-medium leading-6 text-ink">
                    Output: {stage.output}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-rose-900">
                    Stop if: {stage.stopCondition}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-3xl border border-line bg-paper p-6">
          <h3 className="text-lg font-semibold text-ink">
            The only permitted terminal decisions
          </h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {sharedWorkflow.terminalDecisions.map((decision) => (
              <li
                key={decision}
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
              >
                {humanise(decision)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="mt-16 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"
        aria-labelledby="status-title"
      >
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Verify the real gate
          </p>
          <h2
            id="status-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            “Tax professional” is not one universal licence.
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            {method.professionalStatusBoundary.generalRule}
          </p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            {Object.entries(professionalGateLabels).map(([gate, label]) => (
              <div key={gate} className="rounded-2xl bg-paper p-4">
                <dt className="font-semibold text-ink">{label}</dt>
                <dd className="mt-1 text-sm leading-6 text-ink-soft">
                  Kept separate in every role record.
                </dd>
              </div>
            ))}
          </dl>
        </article>

        <aside className="rounded-[2rem] border border-violet-200 bg-violet-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-900">
            Regulators are inside the evidence rule
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Audit the act, not the employee.
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            Official findings, statistics, stakeholder assessments and
            TaxSorted fairness questions use different labels. Every criticism
            carries a counterweight, proof limit, response and correction route.
          </p>
          <Link
            href="/uk/regulator-scrutiny"
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-ink px-5 py-2.5 text-base font-semibold text-white hover:bg-accent-deep"
          >
            Inspect the regulator evidence →
          </Link>
        </aside>
      </section>

      <section className="mt-16" aria-labelledby="practice-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          A sustainable professional practice
        </p>
        <h2
          id="practice-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Keep the map open. Charge honestly for the work.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          A professional can reuse the public workflow without paying for a
          lead or surrendering the client relationship. Their engagement,
          scope, fees and confidential file stay between them and the client,
          under the rules that apply to their exact role.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Understanding stays public",
              body: "Rules, sources, proof limits and blank workflow contracts remain free to read, mirror and improve.",
            },
            {
              title: "Judgment is real work",
              body: "Inspection, evidence, calculation, advice and representation can be charged for under a clear private engagement.",
            },
            {
              title: "No toll on the relationship",
              body: "TaxSorted takes no referral cut, sells no ranking and does not hold the client file. The client chooses whom to instruct.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-line bg-white p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mt-16 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8 lg:p-10"
        aria-labelledby="machine-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Local and decentralised
        </p>
        <h2
          id="machine-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Fork the public understanding. Keep the private matter at home.
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-ink-soft">
          Public packets are source-resolving, versioned and content-addressed.
          A firm or citizen can mirror them without an account. The blank
          assessment contract is portable, but completed files never return to
          TaxSorted.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://api.taxsorted.io/v1/professional-opportunities/uk/assessment-template"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 text-base font-semibold text-white hover:bg-accent-deep"
          >
            Blank local assessment JSON ↗
          </a>
          <a
            href="https://api.taxsorted.io/openapi/professional-opportunities-uk.json"
            className="inline-flex min-h-11 items-center rounded-full border border-line px-5 py-2.5 text-base font-semibold text-accent hover:bg-paper"
          >
            Read-only OpenAPI ↗
          </a>
          <a
            href="https://github.com/cambridgetcg/taxsorted.io/tree/main/research/uk/professional-opportunities"
            className="inline-flex min-h-11 items-center rounded-full border border-line px-5 py-2.5 text-base font-semibold text-accent hover:bg-paper"
          >
            Fork the research ↗
          </a>
        </div>
        <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950">
          {publication.activationGap}
        </p>
      </section>

      <p className="mt-8 text-sm leading-6 text-ink-soft">
        Corpus {meta.version}, sources retrieved {meta.retrievedAt}. Public factual
        corrections can use{" "}
        <a
          href={publication.corrections}
          className="font-medium text-accent underline underline-offset-4"
        >
          the project issue tracker
        </a>
        . Never post a private tax matter there.
      </p>
    </div>
  );
}
