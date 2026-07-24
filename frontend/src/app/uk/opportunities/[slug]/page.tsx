import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  professionalGateLabels,
  professionalOpportunityBySlug,
  professionalOpportunitySources,
  regulatorScrutinyByIds,
  ukProfessionalOpportunityCorpus,
  type UkProfessionalOpportunity,
} from "@/lib/uk-professional-opportunities";

export const dynamic = "force-static";
export const dynamicParams = false;
const closedPublicationSlug = "publication-status";

function humanise(value: string) {
  const words = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function generateStaticParams() {
  if (!ukProfessionalOpportunityCorpus) {
    // Static export requires one finite parameter for a dynamic route. This
    // reserved, noindex status page contains no corpus content.
    return [{ slug: closedPublicationSlug }];
  }
  return ukProfessionalOpportunityCorpus.opportunities.map((opportunity) => ({
    slug: opportunity.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (
    slug === closedPublicationSlug &&
    !ukProfessionalOpportunityCorpus
  ) {
    return {
      title: "Professional tax research awaiting review — TaxSorted",
      description:
        "No professional-opportunity detail is public until the exact corpus completes independent review.",
      robots: { index: false, follow: false },
    };
  }
  const opportunity = professionalOpportunityBySlug(slug);
  if (!opportunity) return {};
  return {
    title: `${opportunity.title} — TaxSorted`,
    description: opportunity.whySpecialistJudgmentMatters.join(" "),
  };
}

function sourceIdsForOpportunity(opportunity: UkProfessionalOpportunity) {
  const sourceIds = new Set<string>();
  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, nested] of Object.entries(value)) {
      if (key === "sourceIds" && Array.isArray(nested)) {
        nested.forEach((sourceId) => sourceIds.add(String(sourceId)));
      } else {
        visit(nested);
      }
    }
  }
  visit(opportunity);
  return [...sourceIds].sort();
}

function ClaimSourceLinks({
  sourceIds,
}: {
  sourceIds: readonly string[];
}) {
  const resolved = professionalOpportunitySources(sourceIds);
  const resolvedIds = new Set(resolved.map((source) => source.id));
  const missing = sourceIds.filter((sourceId) => !resolvedIds.has(sourceId));

  return (
    <p className="mt-3 text-xs leading-5 text-ink-soft">
      Sources:{" "}
      {resolved.map((source, index) => (
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
      {missing.length > 0 ? (
        <span className="font-semibold text-rose-900">
          {resolved.length > 0 ? " · " : ""}
          Missing source record: {missing.join(", ")}
        </span>
      ) : null}
    </p>
  );
}

export function ProfessionalOpportunityDetail({
  opportunity,
}: {
  opportunity: UkProfessionalOpportunity;
}) {
  if (!ukProfessionalOpportunityCorpus) notFound();
  const corpus = ukProfessionalOpportunityCorpus;
  const sources = professionalOpportunitySources(
    sourceIdsForOpportunity(opportunity),
  );
  const scrutiny = regulatorScrutinyByIds(opportunity.scrutinyIds);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/uk", label: "The UK system" },
          { href: "/uk/opportunities", label: "Professional opportunities" },
        ]}
        current={opportunity.title}
        className="mb-6"
      />

      <header className="rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10 lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
          {opportunity.taxArea} · professional review class
        </p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight sm:text-6xl">
          {opportunity.title}
        </h1>
        <p className="mt-5 max-w-4xl text-lg leading-8 text-white/80">
          {opportunity.whySpecialistJudgmentMatters.join(" ")}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {opportunity.territories.map((territory) => (
            <span
              key={territory}
              className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80"
            >
              {territory}
            </span>
          ))}
        </div>
      </header>

      <section
        className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 sm:p-8"
        aria-labelledby="clock-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-900">
          Freeze the clock first
        </p>
        <h2
          id="clock-title"
          className="mt-2 text-2xl font-semibold tracking-tight text-ink"
        >
          A complaint does not preserve an appeal.
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {opportunity.deadlineWarnings.map((warning) => (
            <article
              key={warning.warning}
              className="rounded-2xl border border-rose-200 bg-white p-5"
            >
              <h3 className="font-semibold text-ink">{warning.warning}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                {warning.immediateCheck}
              </p>
              <ClaimSourceLinks sourceIds={warning.sourceIds} />
            </article>
          ))}
        </div>
      </section>

      <section
        className="mt-16 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"
        aria-labelledby="signals-title"
      >
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Observable signals
          </p>
          <h2
            id="signals-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            What can justify a careful first look
          </h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 text-base leading-7 text-ink-soft">
            {opportunity.issuePatterns.map((pattern) => (
              <li key={pattern}>{pattern}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">
            What can defeat or reverse the thesis
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Counterweights travel with the opportunity.
          </h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 text-base leading-7 text-amber-950">
            {opportunity.counterweights.map((counterweight) => (
              <li key={counterweight.statement}>
                {counterweight.statement}
                <ClaimSourceLinks sourceIds={counterweight.sourceIds} />
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-16" aria-labelledby="professionals-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Competence before economics
        </p>
        <h2
          id="professionals-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Verify the exact role and gate.
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {opportunity.professionalRoles.map((role) => (
            <article
              key={role.role}
              className="rounded-3xl border border-line bg-white p-6"
            >
              <div className="flex flex-wrap gap-2">
                {role.gates.map((gate) => (
                  <span
                    key={gate.kind}
                    className="rounded-full bg-paper px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft"
                  >
                    {
                      professionalGateLabels[
                        gate.kind as keyof typeof professionalGateLabels
                      ]
                    }
                  </span>
                ))}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-ink">
                {role.role}
              </h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {role.purpose}
              </p>
              <dl className="mt-4 space-y-3">
                {role.gates.map((gate) => (
                  <div key={gate.kind} className="rounded-2xl bg-paper p-4">
                    <dt className="text-sm font-semibold text-ink">
                      {
                        professionalGateLabels[
                          gate.kind as keyof typeof professionalGateLabels
                        ]
                      }
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-ink-soft">
                      Applies: {gate.appliesWhen}
                    </dd>
                    <dd className="mt-1 text-sm font-medium leading-6 text-ink">
                      Verify: {gate.verification}
                    </dd>
                    <dd>
                      <ClaimSourceLinks sourceIds={gate.sourceIds} />
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section
        className="mt-16 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"
        aria-labelledby="authority-title"
      >
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Authority and procedure
          </p>
          <h2
            id="authority-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            Start with the legal route, not the hoped-for result.
          </h2>
          <dl className="mt-6 space-y-4 text-sm leading-6">
            <div>
              <dt className="font-semibold text-ink">Legal basis</dt>
              <dd className="mt-1 text-ink-soft">
                {opportunity.authorityAndProcedure.legalBasis}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Procedure</dt>
              <dd className="mt-1 text-ink-soft">
                {opportunity.authorityAndProcedure.procedure}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-ink">Scope limits</dt>
              <dd className="mt-1 text-ink-soft">
                {opportunity.authorityAndProcedure.scopeLimits}
              </dd>
            </div>
          </dl>
          <ClaimSourceLinks
            sourceIds={opportunity.authorityAndProcedure.sourceIds}
          />
        </article>

        <article className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
            Lawful value mechanisms
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Where useful professional work can change an outcome
          </h2>
          <ul className="mt-5 space-y-4">
            {opportunity.lawfulValueMechanisms.map((mechanism) => (
              <li
                key={mechanism.mechanism}
                className="rounded-2xl border border-emerald-200 bg-white p-4"
              >
                <h3 className="font-semibold text-ink">
                  {mechanism.mechanism}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {mechanism.valuePath}
                </p>
                <p className="mt-2 text-sm leading-6 text-emerald-950">
                  Limit: {mechanism.limit}
                </p>
                <ClaimSourceLinks sourceIds={mechanism.sourceIds} />
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-16" aria-labelledby="workflow-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Route-specific pipeline
        </p>
        <h2
          id="workflow-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Inputs become bounded outputs, one stage at a time.
        </h2>
        <ol className="mt-7 space-y-4">
          {opportunity.workflow.map((stage, index) => (
            <li
              key={stage.stage}
              className="grid gap-4 rounded-3xl border border-line bg-white p-5 sm:grid-cols-[3rem_1fr] sm:p-6"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-deep">
                {index + 1}
              </span>
              <div>
                <h3 className="text-xl font-semibold text-ink">
                  {humanise(stage.stage)}
                </h3>
                <dl className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-paper p-4">
                    <dt className="font-semibold text-ink">Action</dt>
                    <dd className="mt-1 text-sm leading-6 text-ink-soft">
                      {stage.action}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-paper p-4">
                    <dt className="font-semibold text-ink">Output</dt>
                    <dd className="mt-1 text-sm leading-6 text-ink-soft">
                      {stage.output}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm font-medium leading-6 text-rose-900">
                  Stop if: {stage.stopCondition}
                </p>
                <ClaimSourceLinks sourceIds={stage.sourceIds} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        className="mt-16 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"
        aria-labelledby="money-title"
      >
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Honest money model
          </p>
          <h2
            id="money-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            One number cannot do twelve jobs.
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            {opportunity.moneyModel.calculationMethod}
          </p>
          <dl className="mt-5 grid gap-3">
            {corpus.sharedWorkflow.moneyStateOrder.map((state) => (
              <div
                key={state}
                className="rounded-2xl border border-line bg-paper p-4"
              >
                <dt className="text-sm font-semibold text-ink">
                  {humanise(state)}
                </dt>
                <dd className="mt-1 text-sm leading-6 text-ink-soft">
                  {
                    opportunity.moneyModel[
                      state as keyof typeof opportunity.moneyModel
                    ]
                  }
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            Not this: {opportunity.moneyModel.notMeaning}
          </p>
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950">
            {opportunity.moneyModel.zeroOrNegativeScenario}
          </p>
        </article>

        <article className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
            Evidence pack
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            What the professional must actually inspect
          </h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-6 text-emerald-950">
            {opportunity.evidenceChecklist.map((item) => (
              <li key={item.item}>
                <span className="font-semibold">{item.item}:</span>{" "}
                {item.purpose} Minimum proof: {item.minimumProof}
                <ClaimSourceLinks sourceIds={item.sourceIds} />
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="mt-16" aria-labelledby="routes-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Routes are not interchangeable
        </p>
        <h2
          id="routes-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Name what each route can—and cannot—do.
        </h2>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {opportunity.challengeRoutes.map((route) => (
            <article
              key={route.route}
              className="rounded-3xl border border-line bg-white p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {humanise(route.route)}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-ink">
                {route.purpose}
              </h3>
              <p className="mt-3 text-sm font-medium leading-6 text-rose-900">
                Clock or trigger: {route.deadlineOrTrigger}
              </p>
              <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-ink">
                Does not replace: {route.doesNotReplace}
              </p>
              <ClaimSourceLinks sourceIds={route.sourceIds} />
            </article>
          ))}
        </div>
      </section>

      {scrutiny.length ? (
        <section
          className="mt-16 rounded-[2rem] border border-violet-200 bg-violet-50 p-6 sm:p-8"
          aria-labelledby="scrutiny-title"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-900">
            The public body is reviewable too
          </p>
          <h2
            id="scrutiny-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            Relevant institutional evidence, with its limits attached.
          </h2>
          <ul className="mt-6 space-y-4">
            {scrutiny.map((record) => (
              <li
                key={record.id}
                className="rounded-2xl border border-violet-200 bg-white p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-900">
                  Evidence state: {humanise(record.evidenceState)}
                </p>
                <h3 className="text-lg font-semibold text-ink">
                  {record.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">
                  {record.statement}
                </p>
                <p className="mt-3 text-sm font-medium leading-6 text-ink">
                  This does not prove: {record.doesNotProve}
                </p>
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                  Response or counterweight: {record.counterweightOrResponse}
                </p>
                <p className="mt-3 text-sm leading-6 text-violet-950">
                  Correction or review route: {record.correctionOrReviewRoute}
                </p>
                <ClaimSourceLinks sourceIds={record.sourceIds} />
              </li>
            ))}
          </ul>
          <Link
            href="/uk/regulator-scrutiny"
            className="mt-6 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
          >
            Read the full regulator-scrutiny ledger →
          </Link>
        </section>
      ) : null}

      <section className="mt-16" aria-labelledby="sources-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Official and primary sources
        </p>
        <h2
          id="sources-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Check the current source before acting.
        </h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {sources.map((source) => (
            <li
              key={source.id}
              className="rounded-2xl border border-line bg-white p-5"
            >
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-accent underline underline-offset-4"
              >
                {source.title} ↗
              </a>
              <p className="mt-2 text-sm text-ink-soft">{source.publisher}</p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {source.notes}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 rounded-[2rem] border border-line bg-paper p-6 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight text-ink">
          Take the public packet, not somebody&apos;s case.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Anyone can download the source-resolving packet and blank assessment
          contract. Professional use still requires the user to verify the
          needed status, consent, competence and conflicts before working
          privately. TaxSorted verifies no professional and accepts no completed
          file.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={`https://api.taxsorted.io/v1/professional-opportunities/uk/opportunities/${opportunity.id}`}
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-deep"
          >
            Complete public packet JSON ↗
          </a>
          <a
            href="https://api.taxsorted.io/v1/professional-opportunities/uk/assessment-template"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-5 py-2.5 font-semibold text-accent hover:bg-accent-soft"
          >
            Blank local assessment JSON ↗
          </a>
        </div>
      </section>
    </div>
  );
}

export default async function ProfessionalOpportunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (
    slug === closedPublicationSlug &&
    !ukProfessionalOpportunityCorpus
  ) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Publication gate closed
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">
          No opportunity detail is published yet.
        </h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">
          The exact research corpus still needs its required independent review
          and explicit deployment approval. This status page contains no tax
          opportunity, institutional finding or private intake.
        </p>
        <Link
          href="/uk/opportunities"
          className="mt-7 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          Return to the publication gate
        </Link>
      </div>
    );
  }
  const opportunity = professionalOpportunityBySlug(slug);
  if (!opportunity) notFound();
  return <ProfessionalOpportunityDetail opportunity={opportunity} />;
}
