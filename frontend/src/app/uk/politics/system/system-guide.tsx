"use client";

import { useEffect, useMemo, useState } from "react";
import {
  politicsApi,
  type PoliticsSystemResponse,
  type PoliticsSystemSource,
} from "@/lib/politics-api";

const enforcementStates = [
  "Allegation",
  "Investigation",
  "Finding",
  "Sanction",
  "Correction",
  "Referral",
  "Appeal",
];

const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 1,
});

function SourceLinks({
  sourceIds,
  sourceById,
}: {
  sourceIds: string[];
  sourceById: Map<string, PoliticsSystemSource>;
}) {
  const sources = Array.from(new Set(sourceIds))
    .map((id) => sourceById.get(id))
    .filter((source): source is PoliticsSystemSource => Boolean(source));

  if (sources.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Official sources">
      {sources.map((source) => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm text-accent underline decoration-line underline-offset-2 hover:text-accent-deep"
        >
          {source.title} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}

export function SystemGuide() {
  const [data, setData] = useState<PoliticsSystemResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    politicsApi.system().then(
      (response) => {
        if (!cancelled) setData(response);
      },
      (reason: unknown) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "The political-system record could not be loaded.",
          );
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const actorById = useMemo(
    () => new Map(data?.actors.map((actor) => [actor.id, actor]) ?? []),
    [data],
  );
  const sourceById = useMemo(
    () => new Map(data?.sources.map((source) => [source.id, source]) ?? []),
    [data],
  );

  if (!data && !error) {
    return (
      <p className="mt-8 rounded-3xl border border-line bg-white p-8 text-ink-soft" aria-live="polite">
        Reading the public system record…
      </p>
    );
  }

  if (!data) {
    return (
      <div className="mt-8 rounded-3xl border border-line bg-white p-8" role="alert">
        <h2 className="text-xl font-semibold text-ink">The system record is unavailable.</h2>
        <p className="mt-3 max-w-3xl text-sm text-ink-soft">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
          className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep"
        >
          Try again
        </button>
      </div>
    );
  }

  const { formalPower } = data;

  return (
    <>
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Rules for reading this page">
        {[
          ["Office, not person", "Formal-power assessments belong to a public office. They do not rate its holder."],
          ["Scores never add", "If one person holds several offices, each assessment stays separate."],
          ["Budget authority ≠ personal money", "Public money belongs to public bodies and authorised purposes, not politicians."],
          ["Relationship ≠ influence", "A reported meeting, donation, interest or contract proves only what its source records."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-3xl border border-line bg-paper p-5">
            <h2 className="font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-base text-ink-soft">{body}</p>
          </article>
        ))}
      </section>

      <nav className="mt-6 rounded-3xl border border-line bg-white p-4" aria-label="On this page">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">On this page</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["#elections", "Elections"],
            ["#formal-power", "Formal power"],
            ["#campaign-finance", "Campaign finance"],
            ["#public-money", "Public money"],
            ["#relationships", "Relationship evidence"],
            ["#enforcement", "Enforcement"],
            ["#history-law", "History & law"],
            ["#coverage", "Gaps & sources"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-base text-ink hover:border-accent hover:bg-accent-soft"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section id="elections" className="mt-12 scroll-mt-6" aria-labelledby="elections-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Responsibility chain</p>
        <h2 id="elections-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Who does what in a UK Parliamentary election
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">
          Parliament makes the framework. Local statutory officers run Great Britain polls and count
          the votes; the Chief Electoral Officer does so in Northern Ireland. The Electoral Commission
          guides and regulates, but does not run Great Britain polling stations or declare those results.
        </p>

        <details className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-6">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">Read each step of an election, and who is responsible</summary>
          <ol className="mt-4 space-y-4">
            {data.electionProcess.map((stage) => (
              <li key={stage.id} className="grid gap-3 sm:grid-cols-[3rem_minmax(0,1fr)]">
                <p className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white" aria-hidden="true">
                  {stage.order}
                </p>
                <article className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="text-xl font-semibold text-ink">{stage.title}</h3>
                  <p className="mt-2 text-base text-ink-soft">{stage.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2" aria-label="Responsible offices and bodies">
                    {stage.responsibleActorIds.map((actorId) => (
                      <span key={actorId} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-ink">
                        {actorById.get(actorId)?.name ?? actorId}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">
                    <strong className="text-ink">Public trail:</strong> {stage.publicRecords.join(" · ")}
                  </p>
                  <SourceLinks sourceIds={stage.sourceIds} sourceById={sourceById} />
                </article>
              </li>
            ))}
          </ol>
        </details>

        <details className="mt-5 rounded-3xl border border-line bg-paper p-5 sm:p-6">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">What each office is — and is not — responsible for</summary>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {data.actors.map((actor) => (
              <article key={actor.id} className="rounded-2xl border border-line bg-white p-4">
                <h3 className="font-semibold text-ink">{actor.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">{actor.kind}</p>
                <p className="mt-3 text-sm text-ink-soft">{actor.chosenBy}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink">Responsible for</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                      {actor.responsibleFor.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink">Not responsible for</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                      {actor.notResponsibleFor.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
                <SourceLinks sourceIds={actor.sourceIds} sourceById={sourceById} />
              </article>
            ))}
          </div>
        </details>

        <details className="mt-5 rounded-3xl border border-line bg-white p-5 sm:p-6">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">Find the right office to contact</summary>
          <p className="mt-2 max-w-4xl text-base text-ink-soft">
            These links lead to the office that holds the duty — never a private address or a
            guessed personal contact. Use a postcode lookup once; do not keep the result.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {data.electionContactRoutes.map((route) => (
              <article key={`${route.contactType}-${route.url}`} className="rounded-2xl bg-paper p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {route.actorIds.map((id) => actorById.get(id)?.name ?? id).join(" · ")}
                </p>
                <a
                  href={route.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block font-semibold text-accent underline decoration-line underline-offset-2"
                >
                  {route.label} <span aria-hidden="true">↗</span>
                </a>
                <p className="mt-2 text-base text-ink-soft">{route.note}</p>
              </article>
            ))}
          </div>
        </details>
      </section>

      <section id="formal-power" className="mt-14 scroll-mt-6" aria-labelledby="formal-power-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Formal office power · draft method</p>
        <h2 id="formal-power-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Six published powers, scored without judging the person
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">{formalPower.method.warning}</p>
        <p className="mt-4 max-w-4xl rounded-2xl bg-accent-soft p-4 text-base text-ink">
          <strong>Office, not person.</strong> Examples stay in source order, never a leaderboard.
          A person&apos;s separate offices and their scores never add together.
        </p>

        <details className="mt-6 rounded-3xl border border-line bg-paper p-5">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">What each of the six scores measures</summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {formalPower.method.dimensions.map((dimension) => (
              <article key={dimension.id} className="rounded-2xl border border-line bg-white p-4">
                <h3 className="font-semibold text-ink">{dimension.label}</h3>
                <p className="mt-1 text-base text-ink-soft">{dimension.meaning}</p>
              </article>
            ))}
          </div>
        </details>

        <details className="mt-4 rounded-2xl border border-line bg-white p-5">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">How the scores are worked out</summary>
          <p className="mt-4 text-base text-ink-soft">{formalPower.method.calculation}</p>
          <ol className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            {formalPower.method.rubric.map((row) => (
              <li key={row.score} className="rounded-2xl bg-paper p-3 text-ink-soft">
                <strong className="text-ink">{row.score}/5:</strong> {row.meaning}
              </li>
            ))}
          </ol>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ink-soft">
            {formalPower.method.comparisonRules.map((rule) => <li key={rule}>{rule}</li>)}
          </ul>
        </details>

        <details className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-6">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">See each scored office, with its evidence and limits</summary>
          <div className="mt-4 space-y-5">
          {formalPower.assessments.map((assessment) => (
            <article key={assessment.assessmentId} className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
              <header className="grid gap-4 border-b border-line pb-5 md:grid-cols-[minmax(0,1fr)_8rem] md:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{assessment.officeFamily}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-ink">{assessment.officeName}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{assessment.jurisdiction.competence}</p>
                  <p className="mt-2 text-xs text-ink-soft">{assessment.jurisdiction.territories.join(" · ")}</p>
                  <p className="mt-2 text-xs text-ink-soft">
                    {assessment.calibrationStatus.replaceAll("-", " ")} · evidence {assessment.evidenceStatus} · law checked {assessment.lawAsAt}
                  </p>
                </div>
                <div className="rounded-2xl bg-paper p-4 md:text-right" aria-label={`Total formal-power score ${assessment.calculation.display} out of 100`}>
                  <p className="text-3xl font-semibold tabular-nums text-ink">
                    {assessment.calculation.display}<span className="text-base text-ink-soft">/100</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">{assessment.calculation.band}</p>
                </div>
              </header>

              <div className="mt-6 grid gap-x-8 gap-y-5 lg:grid-cols-2">
                {formalPower.method.dimensions.map((dimension) => {
                  const assessed = assessment.dimensions[dimension.id];
                  return (
                    <div key={dimension.id}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <p className="font-medium text-ink">{dimension.label}</p>
                        <p className="tabular-nums text-ink-soft">{assessed.score}/5</p>
                      </div>
                      <div
                        role="meter"
                        aria-label={`${dimension.label} formal authority`}
                        aria-valuemin={0}
                        aria-valuemax={5}
                        aria-valuenow={assessed.score}
                        aria-valuetext={`${assessed.score} out of 5`}
                        className="mt-2 h-2 overflow-hidden rounded-full bg-line"
                      >
                        <div
                          className="h-full rounded-full bg-ink-soft"
                          style={{ width: `${(assessed.score / 5) * 100}%` }}
                        />
                      </div>
                      <p className="mt-2 text-sm text-ink-soft">{assessed.reason}</p>
                    </div>
                  );
                })}
              </div>

              <details className="mt-6 rounded-2xl bg-paper p-4">
                <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">Evidence, legal basis and limits</summary>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {formalPower.method.dimensions.map((dimension) => {
                    const assessed = assessment.dimensions[dimension.id];
                    return (
                      <div key={dimension.id} className="rounded-2xl border border-line bg-white p-4">
                        <h4 className="font-semibold text-ink">{dimension.label} · {assessed.score}/5</h4>
                        <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">
                          {assessed.exercise} · {assessed.basis.join(" · ")}
                        </p>
                        <p className="mt-3 text-sm text-ink-soft">{assessed.reason}</p>
                        <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-ink-soft">
                          {assessed.limits.map((limit) => <li key={limit}>{limit}</li>)}
                        </ul>
                        <SourceLinks sourceIds={assessed.sourceIds} sourceById={sourceById} />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-2xl border border-line bg-white p-4">
                  <h4 className="font-semibold text-ink">Checks on the office</h4>
                  <ul className="mt-2 list-disc space-y-2 pl-4 text-sm text-ink-soft">
                    {assessment.checks.map((check) => <li key={check.description}>{check.description}</li>)}
                  </ul>
                  <SourceLinks sourceIds={assessment.sourceIds} sourceById={sourceById} />
                </div>
              </details>
            </article>
          ))}
          </div>
        </details>
      </section>

      <section id="campaign-finance" className="mt-14 scroll-mt-6" aria-labelledby="campaign-finance-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Campaign finance</p>
        <h2 id="campaign-finance-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Campaign money has four separate sets of rules
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">
          Candidates, parties, non-party campaigners and regulated funding each follow their own rules.
          Limits, responsible people, reporting routes and enforcement depend on which set applies, and on the date.
        </p>
        <details className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">Read the four rule-sets — limits, returns and enforcement</summary>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {data.campaignFinanceRules.map((rule) => {
            const actor = actorById.get(rule.responsibleActorId);
            return (
              <article key={rule.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">{rule.lane.replaceAll("-", " ")}</p>
                <h3 className="mt-2 text-xl font-semibold text-ink">
                  {actor?.name ?? rule.responsibleActorId.replaceAll("-", " ")}
                </h3>
                <p className="mt-2 text-xs text-ink-soft">
                  Rule checked {rule.currentRuleSnapshot.asAt} · {rule.currentRuleSnapshot.election}
                </p>
                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="font-semibold text-ink">Limit or threshold</dt>
                    <dd className="mt-1 text-ink-soft">{rule.currentRuleSnapshot.limit}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Public return</dt>
                    <dd className="mt-1 text-ink-soft">{rule.currentRuleSnapshot.reporting}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Enforcement boundary</dt>
                    <dd className="mt-1 text-ink-soft">{rule.currentRuleSnapshot.enforcement}</dd>
                  </div>
                </dl>
                <SourceLinks sourceIds={rule.sourceIds} sourceById={sourceById} />
              </article>
            );
          })}
        </div>
        </details>

        <aside className="mt-6 rounded-[2rem] border border-line bg-paper p-6 sm:p-8" aria-labelledby="public-funding-title">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">A separate public-support lane</p>
          <h3 id="public-funding-title" className="mt-2 text-2xl font-semibold text-ink">
            Public political funding is not a private donation
          </h3>
          <p className="mt-3 max-w-4xl text-base text-ink-soft">{data.publicPoliticalFunding.principle}</p>
          <details className="mt-5 rounded-3xl border border-line bg-white p-5">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">See each public-support scheme</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.publicPoliticalFunding.schemes.map((scheme) => (
              <article key={scheme.id} className="rounded-2xl border border-line bg-white p-5">
                <h4 className="font-semibold text-ink">{scheme.name}</h4>
                <p className="mt-1 text-xs text-ink-soft">{scheme.recipient}</p>
                <p className="mt-3 text-sm text-ink-soft">{scheme.purpose}</p>
                <p className="mt-3 text-xs font-medium text-ink">
                  {scheme.currentSnapshot.amountKind}
                  {scheme.currentSnapshot.annualPoolGbp !== null
                    ? ` · ${gbpCompact.format(scheme.currentSnapshot.annualPoolGbp)} annual pool`
                    : " · no single annual pool stated here"}
                  {` · checked ${scheme.currentSnapshot.asAt}`}
                </p>
                <SourceLinks sourceIds={scheme.sourceIds} sourceById={sourceById} />
              </article>
            ))}
          </div>
          </details>
        </aside>
      </section>

      <section id="public-money" className="mt-14 scroll-mt-6" aria-labelledby="public-money-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Budget accountability</p>
        <h2 id="public-money-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Permission to spend, the plan and the actual spending are three different numbers
        </h2>
        <p className="mt-4 max-w-5xl rounded-2xl bg-accent-soft p-4 text-base text-ink">
          <strong>A budget is not a politician&apos;s personal money.</strong> {data.budgetAccountability.principle}
        </p>

        <details className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">See the current totals and who answers for them</summary>
        <article className="mt-4 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,1fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Current aggregate snapshot</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">
                {data.budgetAccountability.currentAggregateSnapshot.period}
              </h3>
              <p className="mt-2 text-sm text-ink-soft">{data.budgetAccountability.currentAggregateSnapshot.status}</p>
              <p className="mt-4 rounded-2xl bg-paper p-4 text-sm text-ink-soft">
                {data.budgetAccountability.currentAggregateSnapshot.warning}
              </p>
              <SourceLinks
                sourceIds={data.budgetAccountability.currentAggregateSnapshot.sourceIds}
                sourceById={sourceById}
              />
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {data.budgetAccountability.currentAggregateSnapshot.figures.map((figure) => (
                <div key={figure.category} className="rounded-2xl border border-line bg-paper p-4">
                  <dt className="text-xs text-ink-soft">{figure.category}</dt>
                  <dd className="mt-2 text-2xl font-semibold tabular-nums text-ink">
                    {gbpCompact.format(figure.amountGbp)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </article>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {data.budgetAccountability.lanes.map((lane, index) => (
            <article key={lane.id} className="rounded-3xl border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Accountability lane {index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{lane.name}</h3>
              <p className="mt-2 text-sm text-ink-soft">{lane.answer}</p>
              <SourceLinks sourceIds={lane.sourceIds} sourceById={sourceById} />
            </article>
          ))}
        </div>
        </details>
      </section>

      <section id="relationships" className="mt-14 scroll-mt-6" aria-labelledby="relationships-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Corporate and organisational records</p>
        <h2 id="relationships-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          A recorded meeting or donation is not proof of influence
        </h2>
        <p className="mt-4 max-w-4xl rounded-2xl bg-accent-soft p-4 text-base text-ink">
          <strong>A relationship record is not influence.</strong> A published record proves exactly the
          recorded donation, declaration, meeting, lobbying return or contract — not a favour, motive,
          policy result or wrongdoing.
        </p>
        <details className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">Read each record type — what it proves, and what it does not</summary>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {data.relationshipEvidenceLanes.map((lane) => (
            <article key={lane.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-ink">{lane.label}</h3>
                <span className="rounded-full bg-paper px-3 py-1 text-xs text-ink-soft">{lane.apiStatus}</span>
              </div>
              <dl className="mt-5 space-y-4 text-sm">
                <div className="rounded-2xl border border-line p-4">
                  <dt className="font-semibold text-ink">What the record proves</dt>
                  <dd className="mt-1 text-ink-soft">{lane.proves}</dd>
                </div>
                <div className="rounded-2xl bg-paper p-4">
                  <dt className="font-semibold text-ink">What it does not prove</dt>
                  <dd className="mt-1 text-ink-soft">{lane.doesNotProve}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Safe joining rule</dt>
                  <dd className="mt-1 text-ink-soft">{lane.joinRule}</dd>
                </div>
              </dl>
              <SourceLinks sourceIds={lane.sourceIds} sourceById={sourceById} />
            </article>
          ))}
        </div>
        </details>
      </section>

      <section id="enforcement" className="mt-14 scroll-mt-6" aria-labelledby="enforcement-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Enforcement</p>
        <h2 id="enforcement-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          An allegation is not a finding — every stage stays separate
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">
          {data.enforcementSnapshot.caseStateRule} These are record states, not a claim that every
          case follows every step.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7" aria-label="Separate enforcement record states">
          {enforcementStates.map((state, index) => (
            <li key={state} className="rounded-2xl border border-line bg-white p-4">
              <p className="text-xs text-ink-soft">State {index + 1}</p>
              <p className="mt-1 font-semibold text-ink">{state}</p>
            </li>
          ))}
        </ol>

        <details className="mt-5 rounded-3xl border border-line bg-paper p-6">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">
            What the Electoral Commission can fine, and where its power ends
          </summary>
          <p className="mt-2 text-sm text-ink-soft">Checked {data.enforcementSnapshot.asAt}</p>
          <p className="mt-3 text-base text-ink-soft">{data.enforcementSnapshot.electoralCommission.remit}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="rounded-2xl bg-white p-4 text-base text-ink">
              <strong>Civil fine range:</strong>{" "}
              {gbpCompact.format(data.enforcementSnapshot.electoralCommission.civilFineRangeGbp.minimum)} to{" "}
              {gbpCompact.format(data.enforcementSnapshot.electoralCommission.civilFineRangeGbp.maximumPerOffence)} per offence where authorised.
            </p>
            <p className="rounded-2xl bg-white p-4 text-base text-ink">
              <strong>Candidate boundary:</strong>{" "}
              {data.enforcementSnapshot.electoralCommission.candidateBoundary}
            </p>
          </div>
          <SourceLinks
            sourceIds={data.enforcementSnapshot.electoralCommission.sourceIds}
            sourceById={sourceById}
          />
        </details>

        <details className="mt-5 rounded-3xl border border-line bg-paper p-6">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">
            How enforcement records are published, and by whom
          </summary>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-xl font-semibold text-ink">Publication rules</h3>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-base text-ink-soft">
              {data.enforcementPrinciples.map((principle) => <li key={principle}>{principle}</li>)}
            </ul>
          </article>
          <div className="space-y-4">
            {data.actors
              .filter((actor) => ["electoral-commission", "police-prosecutors-courts"].includes(actor.id))
              .map((actor) => (
                <article key={actor.id} className="rounded-3xl border border-line bg-white p-5">
                  <h3 className="font-semibold text-ink">{actor.name}</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-ink-soft">
                    {actor.responsibleFor.map((responsibility) => <li key={responsibility}>{responsibility}</li>)}
                  </ul>
                  <SourceLinks sourceIds={actor.sourceIds} sourceById={sourceById} />
                </article>
              ))}
          </div>
          </div>
        </details>
      </section>

      <section id="history-law" className="mt-14 scroll-mt-6" aria-labelledby="history-law-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">History and changing law</p>
        <h2 id="history-law-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Old rules and proposed rules stay separate from current law
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">{data.historyCoverage.model}</p>

        <details className="mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">See which history this map covers so far</summary>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-xl font-semibold text-ink">History represented in this map</h3>
            <div className="mt-4 space-y-4">
              {data.historyCoverage.availableNow.map((record) => (
                <div key={record.record} className="rounded-2xl bg-paper p-4">
                  <h4 className="font-semibold text-ink">{record.record}</h4>
                  <p className="mt-2 text-sm text-ink-soft">{record.coverage}</p>
                  <p className="mt-2 font-mono text-xs text-accent">{record.endpoint}</p>
                  <p className="mt-2 text-xs text-ink-soft">Limit: {record.limits}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-xl font-semibold text-ink">Mapped next</h3>
            <div className="mt-4 space-y-4">
              {data.historyCoverage.licensedSourceMapped.map((record) => (
                <div key={record.record} className="rounded-2xl bg-paper p-4">
                  <h4 className="font-semibold text-ink">{record.record}</h4>
                  <p className="mt-2 text-sm text-ink-soft">{record.coverage}</p>
                  <p className="mt-2 text-xs text-ink-soft">{record.ingestionStatus}</p>
                  <SourceLinks sourceIds={record.sourceIds} sourceById={sourceById} />
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-2xl border border-line p-4 text-sm text-ink-soft">
              <strong className="text-ink">Privacy boundary:</strong> {data.historyCoverage.privacy}
            </p>
          </article>
        </div>
        </details>

        <details className="mt-5 rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">See the proposed law changes we are watching</summary>
        <div className="mt-4 space-y-4">
          {data.legislativeWatch.map((item) => (
            <article key={item.id} className="rounded-3xl border border-line bg-accent-soft p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Legislative watch</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">{item.title}</h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">
                  {item.lawStatus.replaceAll("-", " ")}
                </span>
              </div>
              <p className="mt-4 text-sm text-ink-soft">{item.nextKnownStage}</p>
              <p className="mt-3 rounded-2xl bg-white p-4 text-sm font-medium text-ink">{item.rule}</p>
              <p className="mt-3 text-xs text-ink-soft">Status checked {item.statusAt}</p>
              <SourceLinks sourceIds={item.sourceIds} sourceById={sourceById} />
            </article>
          ))}
        </div>
        </details>
      </section>

      <section id="coverage" className="mt-14 scroll-mt-6" aria-labelledby="coverage-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Coverage and receipts</p>
        <h2 id="coverage-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          What this map does not cover yet
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">
          {data.scope.release} · law checked {data.scope.lawAsAt} · record updated {data.updatedAt}
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-line bg-paper p-6">
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">Read the list of known gaps</summary>
              <ul className="mt-2 list-disc space-y-3 pl-5 text-base text-ink-soft">
                {data.scope.notYetComplete.map((gap) => <li key={gap}>{gap}</li>)}
              </ul>
            </details>
            <p className="mt-5 rounded-2xl bg-white p-4 text-base font-medium text-ink">{data.scope.rule}</p>
          </article>
          <details className="rounded-3xl border border-line bg-white p-6">
            <summary className="min-h-11 cursor-pointer py-2 text-xl font-semibold text-ink">
              Browse all {data.sources.length} official sources
            </summary>
            <div className="mt-5 max-h-[34rem] space-y-3 overflow-y-auto pr-2">
              {data.sources.map((source) => (
                <article key={source.id} className="rounded-2xl border border-line p-4">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-medium text-accent underline decoration-line underline-offset-2 hover:text-accent-deep"
                  >
                    {source.title} ↗
                  </a>
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">
                    {source.publisher} · {source.kind.replaceAll("-", " ")} · retrieved {source.retrievedAt}
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">{source.supports}</p>
                </article>
              ))}
            </div>
          </details>
        </div>

        <section className="mt-5 rounded-3xl border border-line bg-accent-soft p-6" aria-labelledby="source-use-title">
          <h3 id="source-use-title" className="text-xl font-semibold text-ink">Publishing a fact and reusing a source are separate checks</h3>
          <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-semibold text-ink">How we may reuse each source</summary>
          <p className="mt-3 text-base text-ink-soft">{data.sourceUsePolicy.rule}</p>
          <p className="mt-2 text-base text-ink-soft">{data.sourceUsePolicy.curatedFacts}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {data.sourceUsePolicy.dataFamilies.map((family) => (
              <article key={family.id} className="rounded-2xl bg-white p-4">
                <p className="font-mono text-xs text-ink">{family.id}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent">
                  {family.status.replaceAll("-", " ")}
                </p>
                <p className="mt-2 text-sm text-ink-soft">{family.reuse}</p>
                <a
                  href={family.termsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-2"
                >
                  Read the source terms <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
          </details>
        </section>
      </section>
    </>
  );
}
