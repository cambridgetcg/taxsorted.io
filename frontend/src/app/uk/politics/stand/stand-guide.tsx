"use client";

import { useMemo, useState } from "react";
import pathways from "../../../../../../research/uk/politics/data/public-office-pathways.json";

type OfficePath = (typeof pathways.officePaths)[number];
type Source = (typeof pathways.sources)[number];

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function money(minor: number) {
  return gbp.format(minor / 100);
}

function SourceLinks({
  sourceIds,
  sourceById,
}: {
  sourceIds: readonly string[];
  sourceById: Map<string, Source>;
}) {
  const sources = Array.from(new Set(sourceIds))
    .map((id) => sourceById.get(id))
    .filter((source): source is Source => Boolean(source));

  if (sources.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Sources for this section">
      {sources.map((source) => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-full border border-line bg-white px-3 py-1 text-xs text-accent underline decoration-line underline-offset-2 hover:text-accent-deep"
        >
          {source.publisher}: {source.title} ↗
        </a>
      ))}
    </div>
  );
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm text-ink-soft">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true" className="mt-0.5 text-accent">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Deposit({ office }: { office: OfficePath }) {
  const { deposit } = office.nomination;
  if (!deposit.applicable || deposit.amountMinor === null || deposit.returnedWhen === null) {
    return (
      <p className="mt-2 text-sm text-ink-soft">
        <strong className="text-ink">Deposit:</strong> not applicable—not “£0”, and not a rule
        that should be copied to another local-election family. {deposit.note}
      </p>
    );
  }
  return (
    <p className="mt-2 text-sm text-ink-soft">
      <strong className="text-ink">Deposit:</strong> {money(deposit.amountMinor)}. {deposit.note}{" "}
      It is returned only when the candidate receives {deposit.returnedWhen.plainLanguage}.
    </p>
  );
}

function Remuneration({ office }: { office: OfficePath }) {
  const remuneration = office.remuneration;
  if (
    remuneration.kind === "national-salary"
    && remuneration.amountMinor !== null
    && remuneration.effectiveFrom !== null
  ) {
    return (
      <>
        <p className="mt-3 text-3xl font-semibold text-ink">
          {money(remuneration.amountMinor)} <span className="text-base font-normal text-ink-soft">a year</span>
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Effective {remuneration.effectiveFrom}. {remuneration.description}
        </p>
        <p className="mt-3 rounded-2xl bg-paper p-4 text-sm text-ink-soft">
          <strong className="text-ink">Business costs are not salary:</strong>{" "}
          {remuneration.businessCosts}
        </p>
      </>
    );
  }
  return (
    <>
      <p className="mt-3 text-xl font-semibold text-ink">No national salary or single UK amount</p>
      <p className="mt-2 text-sm text-ink-soft">{remuneration.description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {remuneration.examples.map((example) => (
          <p key={example.authority} className="rounded-2xl bg-paper p-4 text-sm text-ink-soft">
            <strong className="block text-ink">{example.authority}</strong>
            {money(example.basicAllowanceMinor)} basic allowance · {example.financialYear}
          </p>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        Examples show local variation; they are not a promised range or an estimate for another council.
      </p>
    </>
  );
}

export function StandGuide() {
  const [selectedId, setSelectedId] = useState(pathways.officePaths[0]?.id ?? "");
  const sourceById = useMemo(
    () => new Map(pathways.sources.map((source) => [source.id, source])),
    [],
  );
  const office = pathways.officePaths.find((item) => item.id === selectedId)
    ?? pathways.officePaths[0];

  if (!office) return null;

  const barriers = pathways.barriers.filter((barrier) =>
    barrier.officePathIds.includes(office.id),
  );
  const supportRoutes = pathways.supportRoutes.filter((route) =>
    route.officePathIds.includes(office.id),
  );

  return (
    <>
      <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <p className="font-semibold">Current law checked {pathways.meta.lawAsAt}.</p>
        <p className="mt-2 max-w-5xl">
          This is orientation, not legal advice or an eligibility certificate. Election law has
          edge cases; recheck the exact Electoral Commission guide and official timetable when a
          poll is called. Proposed reforms stay in the law-watch section until enacted and in force.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="pick-work">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">1 · Pick the work</p>
        <h2 id="pick-work" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Where do you want to do the work?
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          This choice only changes what is shown in your browser. It is not sent, saved or used to
          infer a political belief.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {pathways.officePaths.map((candidate) => {
            const selected = candidate.id === office.id;
            return (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedId(candidate.id)}
                className={`rounded-3xl border p-6 text-left shadow-sm transition ${selected ? "border-accent bg-accent text-white" : "border-line bg-white text-ink hover:border-accent hover:bg-accent-soft"}`}
              >
                <span className={`text-xs font-semibold uppercase tracking-wide ${selected ? "text-white/70" : "text-accent"}`}>
                  {candidate.identity.jurisdiction}
                </span>
                <span className="mt-2 block text-2xl font-semibold">{candidate.identity.name}</span>
                <span className={`mt-3 block text-sm ${selected ? "text-white/80" : "text-ink-soft"}`}>
                  {candidate.summary}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Selected office facts">
        {[
          ["Election area", office.identity.contestGeography],
          ["Voting system", office.identity.electoralSystem],
          ["Term", office.identity.term],
          ["Administered by", office.identity.administratorRoles.join("; ")],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-line bg-paper p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
            <p className="mt-2 text-sm font-medium text-ink">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-12" aria-labelledby="journey-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">2 · The whole route</p>
        <h2 id="journey-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Nine hand-offs. No mystery jump.
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">{pathways.sharedJourney.summary}</p>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pathways.sharedJourney.steps.map((step) => (
            <li key={step.id} className="rounded-3xl border border-line bg-white p-5 shadow-sm">
              <p className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                {step.order}
              </p>
              <h3 className="mt-4 text-lg font-semibold text-ink">{step.title}</h3>
              <List items={step.whatToDo} />
              <p className="mt-4 rounded-2xl bg-paper p-3 text-xs text-ink-soft">{step.caution}</p>
              <SourceLinks sourceIds={step.sourceIds} sourceById={sourceById} />
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-5 xl:grid-cols-2" aria-label="Party and independent routes">
        {office.routes.map((route) => (
          <article key={route.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              {route.kind === "registered-party" ? "Party route" : "Independent route"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">{route.title}</h2>
            <p className="mt-3 text-sm text-ink-soft">{route.description}</p>
            <h3 className="mt-5 font-semibold text-ink">What this route adds</h3>
            <List items={route.requirements} />
            <h3 className="mt-5 font-semibold text-ink">Trade-offs to see plainly</h3>
            <List items={route.tradeoffs} />
            <SourceLinks sourceIds={route.sourceIds} sourceById={sourceById} />
          </article>
        ))}
      </section>

      <section className="mt-12 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" aria-label="Eligibility and nomination">
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">3 · Legal gate</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Check before you commit.</h2>
          <p className="mt-4 text-sm text-ink-soft">
            <strong className="text-ink">Minimum age:</strong> {office.eligibility.minimumAge}.{" "}
            <strong className="text-ink">Local connection:</strong> {office.eligibility.localConnection}
          </p>
          <h3 className="mt-5 font-semibold text-ink">Citizenship routes</h3>
          <List items={office.eligibility.citizenship} />
          <h3 className="mt-6 font-semibold text-ink">Current qualification rules</h3>
          <div className="mt-3 space-y-3">
            {office.eligibility.rules.map((rule) => (
              <details key={rule.id} className="rounded-2xl border border-line p-4">
                <summary className="cursor-pointer font-medium text-ink">{rule.title}</summary>
                <p className="mt-3 text-sm text-ink-soft">{rule.plainLanguage}</p>
                <p className="mt-2 text-xs text-ink-soft">If unclear: {rule.seekAdviceWhen}</p>
                <SourceLinks sourceIds={rule.sourceIds} sourceById={sourceById} />
              </details>
            ))}
          </div>
          <h3 className="mt-6 font-semibold text-ink">Disqualifications need care</h3>
          <div className="mt-3 space-y-3">
            {office.eligibility.disqualifications.map((rule) => (
              <details key={rule.id} className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <summary className="cursor-pointer font-medium text-red-950">{rule.title}</summary>
                <p className="mt-3 text-sm text-red-900">{rule.plainLanguage}</p>
                <p className="mt-2 text-xs text-red-900">Get help when: {rule.seekAdviceWhen}</p>
                <SourceLinks sourceIds={rule.sourceIds} sourceById={sourceById} />
              </details>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
            {office.eligibility.evaluation.warning}
          </p>
        </article>

        <article className="rounded-[2rem] border border-line bg-accent-soft p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">4 · Nomination</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Make the ballot lawfully.</h2>
          <p className="mt-3 text-sm text-ink-soft">{office.nomination.summary}</p>
          <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-ink">
            <strong>Deadline rule:</strong> {office.nomination.deadlineExpression}
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            <strong className="text-ink">Consent timing:</strong> {office.nomination.consentTiming}
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            <strong className="text-ink">Event date:</strong> {office.nomination.eventDateRule}
          </p>
          <h3 className="mt-5 font-semibold text-ink">Documents</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            {office.nomination.documents.map((document) => (
              <li key={document.id}>
                <strong className="text-ink">{document.name}:</strong> {document.note}
                {document.deliveryExceptions.length > 0 ? (
                  <span className="mt-1 block text-xs">
                    Delivery exception: {document.deliveryExceptions.join(" ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-ink-soft">
            <strong className="text-ink">Subscribers:</strong> exactly {office.nomination.subscribers.count}{" "}
            electors from {office.nomination.subscribers.geography}.{" "}
            {office.nomination.subscribers.roles.join(", ")}.
          </p>
          <Deposit office={office} />
          <h3 className="mt-5 font-semibold text-ink">Delivery</h3>
          <List items={office.nomination.delivery} />
          <SourceLinks sourceIds={office.nomination.sourceIds} sourceById={sourceById} />
        </article>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2" aria-label="Agent and finance">
        <article className="rounded-3xl border border-line bg-ink p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/60">5 · Election agent</p>
          <h2 className="mt-2 text-3xl font-semibold">A named legal responsibility.</h2>
          <p className="mt-4 text-sm text-white/75">{office.agent.defaultWhenNoneAppointed}</p>
          <p className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-white/85">
            <strong>Appointment deadline:</strong> {office.agent.appointmentDeadlineExpression}
          </p>
          <ul className="mt-5 space-y-2 text-sm text-white/75">
            {office.agent.responsibilities.map((item) => <li key={item}>• {item}</li>)}
          </ul>
          <p className="mt-5 text-sm text-white/75">
            <strong className="text-white">Office address:</strong> {office.agent.addressRequirement}
          </p>
          <p className="mt-3 text-sm text-white/75">
            <strong className="text-white">Cannot be the agent:</strong>{" "}
            {office.agent.ineligiblePeople.join("; ")}.
          </p>
          <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-white/80">
            <strong>Privacy boundary:</strong> {office.agent.privacyNote}
          </p>
          <SourceLinks sourceIds={office.agent.sourceIds} sourceById={sourceById} />
        </article>

        <article className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">6 · Campaign money</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">One office, one exact formula.</h2>
          <p className="mt-4 rounded-2xl bg-paper p-4 font-mono text-sm text-ink">
            {office.finance.spendingLimit.expression}
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            Donations above {money(office.finance.donations.thresholdMinor)} enter the controlled
            candidate-donation rules. {office.finance.donations.controlledRule}
          </p>
          <h3 className="mt-5 font-semibold text-ink">Returns and declarations</h3>
          <ul className="mt-3 space-y-3 text-sm text-ink-soft">
            {office.finance.reportingDeadlines.map((deadline) => (
              <li key={deadline.id} className="rounded-2xl border border-line p-4">
                <strong className="text-ink">{deadline.responsibleRole}:</strong> {deadline.due}{" "}
                {deadline.nilReturnRequired ? "A nil return is still required where stated." : ""}
              </li>
            ))}
          </ul>
          <h3 className="mt-5 font-semibold text-ink">If rules are missed or breached</h3>
          <List items={office.finance.enforcement} />
          <SourceLinks sourceIds={office.finance.sourceIds} sourceById={sourceById} />
        </article>
      </section>

      <section className="mt-12 grid gap-5 xl:grid-cols-2" aria-label="After election">
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">7 · If elected</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Enter office before exercising it.</h2>
          <ol className="mt-5 space-y-4">
            {office.takingOffice.map((step) => (
              <li key={step.order} className="rounded-2xl border border-line p-4">
                <p className="font-semibold text-ink">{step.order}. {step.action}</p>
                <p className="mt-2 text-sm text-ink-soft"><strong>Deadline:</strong> {step.deadline}</p>
                <p className="mt-1 text-sm text-ink-soft"><strong>If missed:</strong> {step.consequence}</p>
              </li>
            ))}
          </ol>
          <h3 className="mt-6 font-semibold text-ink">Ongoing public duties</h3>
          <ul className="mt-3 space-y-3 text-sm text-ink-soft">
            {office.officeObligations.map((obligation) => (
              <li key={obligation.id}>
                <strong className="text-ink">{obligation.action}</strong> — {obligation.deadline}. {obligation.oversight}
              </li>
            ))}
          </ul>
          <SourceLinks
            sourceIds={[
              ...office.takingOffice.flatMap((step) => step.sourceIds),
              ...office.officeObligations.flatMap((obligation) => obligation.sourceIds),
            ]}
            sourceById={sourceById}
          />
        </article>

        <article className="rounded-[2rem] border border-line bg-accent-soft p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">8 · Pay is not power</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Salary, allowance and costs stay separate.</h2>
          <Remuneration office={office} />
          <p className="mt-4 text-sm text-ink-soft">{office.remuneration.taxTreatment}</p>
          <SourceLinks sourceIds={office.remuneration.sourceIds} sourceById={sourceById} />
        </article>
      </section>

      <section className="mt-12" aria-labelledby="barriers-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">9 · Barriers in daylight</p>
        <h2 id="barriers-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Why a lawful route can still be hard to enter.
        </h2>
        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {barriers.map((barrier) => (
            <article key={barrier.id} className="rounded-3xl border border-line bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-ink">{barrier.title}</h3>
              <p className="mt-3 text-sm text-ink-soft">{barrier.mechanism}</p>
              <p className="mt-4 rounded-2xl bg-paper p-3 text-sm text-ink-soft">
                <strong className="text-ink">Why the rule exists:</strong> {barrier.intendedSafeguard}
              </p>
              <h4 className="mt-4 text-sm font-semibold text-ink">Lawful low-friction routes</h4>
              <List items={barrier.lawfulLowFrictionRoutes} />
              <p className="mt-4 text-xs text-ink-soft">{barrier.doesNotMean}</p>
              <SourceLinks sourceIds={barrier.sourceIds} sourceById={sourceById} />
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="support-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Useful doors, not endorsements</p>
        <h2 id="support-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Who can help with which part.
        </h2>
        <p className="mt-3 max-w-4xl text-sm text-ink-soft">
          This is a sourced, non-exhaustive set of official and public-interest routes. Party
          selection stays party-controlled; election administration stays with the proper statutory office.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {supportRoutes.map((route) => (
              <article key={route.id} className="rounded-3xl border border-line bg-paper p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">{route.availability.replaceAll("-", " ")}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{route.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{route.purpose}</p>
                <p className="mt-3 text-xs text-ink-soft"><strong>Access:</strong> {route.access}</p>
                <p className="mt-2 text-xs text-ink-soft"><strong>Limit:</strong> {route.limitation}</p>
                <SourceLinks sourceIds={route.sourceIds} sourceById={sourceById} />
              </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 sm:p-8" aria-labelledby="law-watch-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">Law watch · not current law</p>
        <h2 id="law-watch-title" className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">
          Proposed changes stay outside the checklist.
        </h2>
        <div className="mt-5 space-y-4">
          {pathways.legalWatch.map((change) => (
            <article key={change.id} className="rounded-2xl bg-white p-5">
              <h3 className="font-semibold text-ink">{change.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{change.currentLawImpact}</p>
              <p className="mt-2 text-xs text-ink-soft"><strong>Only activate when:</strong> {change.activateOnlyWhen}</p>
              <SourceLinks sourceIds={change.sourceIds} sourceById={sourceById} />
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="gaps-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Coverage honesty</p>
        <h2 id="gaps-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          These offices are not “basically the same”.
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pathways.coverageGaps.map((gap) => (
            <article key={gap.id} className="rounded-3xl border border-line bg-paper p-5">
              <h3 className="font-semibold text-ink">{gap.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{gap.whySeparate}</p>
              <p className="mt-3 text-xs text-ink-soft"><strong>Safe next door:</strong> {gap.safeFallback}</p>
              <SourceLinks sourceIds={gap.sourceIds} sourceById={sourceById} />
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-[2rem] border border-line bg-ink p-6 text-white sm:p-8" aria-labelledby="api-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/60">Build on it</p>
        <h2 id="api-title" className="mt-2 text-3xl font-semibold">The same map is an open API.</h2>
        <p className="mt-3 max-w-4xl text-sm text-white/75">
          Stable IDs, source IDs, dates, current-versus-proposed status and JSON Schema travel with
          the facts. No key, account, cookie, applicant record or write method.
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
          <a href="https://api.taxsorted.io/v1/politics/uk/public-office-pathways" className="text-white underline underline-offset-4">Read the JSON ↗</a>
          <a href="https://api.taxsorted.io/v1/politics/uk/public-office-pathways/schema" className="text-white underline underline-offset-4">Read the schema ↗</a>
          <a href="https://api.taxsorted.io/v1/politics/uk/public-office-pathways/rights" className="text-white underline underline-offset-4">Read reuse rights ↗</a>
          <a href="https://api.taxsorted.io/openapi/politics-uk.json" className="text-white underline underline-offset-4">Read OpenAPI ↗</a>
        </div>
      </section>
    </>
  );
}
