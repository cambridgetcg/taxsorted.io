"use client";

import { useMemo, useState } from "react";
import pathways from "../../../../../../research/uk/politics/data/public-decision-pathways.json";

type Source = (typeof pathways.sources)[number];
type DecisionIntent = (typeof pathways.decisionIntents)[number];
type PublicDoor = (typeof pathways.publicDoors)[number];

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
          className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm text-accent underline decoration-line underline-offset-2 hover:text-accent-deep"
        >
          {source.publisher}: {source.title} <span aria-hidden="true">↗</span>
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

function effectLabel(effect: PublicDoor["directEffect"]) {
  return {
    "informs-decision": "Evidence may inform the decision",
    "correspondence-only": "Correspondence only",
    "representative-discretion": "The representative decides whether to act",
    "committee-evidence": "Evidence for Parliamentary scrutiny",
    "response-or-debate-threshold": "Threshold creates a response or debate consideration",
    "information-right": "A right to request recorded information",
    "electoral-route": "A route to seek elected office",
  }[effect] ?? effect;
}

function routeTypeLabel(routeType: DecisionIntent["routeType"]) {
  return {
    "deep-pathway": "Deep map",
    "personal-route": "Personal remedy hand-off",
    "official-handoff": "Official hand-off",
    "coverage-gap": "Separate power map needed",
  }[routeType] ?? routeType;
}

function PersonalRoute({
  destinationId,
  sourceById,
}: {
  destinationId: string;
  sourceById: Map<string, Source>;
}) {
  const route = pathways.personalRoutes.find((item) => item.id === destinationId);
  if (!route) return null;
  return (
    <section className="mt-10 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">
        Leave the public-policy path here
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{route.title}</h2>
      <p className="mt-4 max-w-4xl text-ink-soft">
        <strong className="text-ink">Use when:</strong> {route.useWhen}
      </p>
      <p className="mt-2 max-w-4xl text-ink-soft">
        <strong className="text-ink">Not for:</strong> {route.notFor}
      </p>
      <ol className="mt-6 space-y-4">
        {route.steps.map((step) => (
          <li key={step.order} className="grid gap-3 rounded-3xl border border-amber-200 bg-white p-5 sm:grid-cols-[3rem_minmax(0,1fr)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-900 text-sm font-semibold text-white">
              {step.order}
            </span>
            <div>
              <h3 className="font-semibold text-ink">{step.action}</h3>
              <p className="mt-2 text-sm text-ink-soft">
                <strong className="text-ink">Timing:</strong> {step.deadline}
              </p>
              <p className="mt-2 text-sm text-amber-950">{step.caution}</p>
              <SourceLinks sourceIds={step.sourceIds} sourceById={sourceById} />
            </div>
          </li>
        ))}
      </ol>
      {route.exceptionalRoutes.map((exceptionalRoute) => (
        <aside
          key={exceptionalRoute.id}
          className="mt-6 rounded-3xl border-2 border-red-300 bg-red-50 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
            Parallel exceptional route · do not wait for the numbered sequence
          </p>
          <h3 className="mt-2 text-xl font-semibold text-red-950">
            {exceptionalRoute.title}
          </h3>
          <p className="mt-3 inline-flex rounded-full bg-red-900 px-3 py-1 text-xs font-semibold text-white">
            Territory: {exceptionalRoute.territory}
          </p>
          <p className="mt-3 text-sm text-red-900">{exceptionalRoute.useWhen}</p>
          <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-red-950">
            <strong>Timing:</strong> {exceptionalRoute.timing}
          </p>
          <p className="mt-3 text-sm text-red-900">{exceptionalRoute.caution}</p>
          <SourceLinks
            sourceIds={exceptionalRoute.sourceIds}
            sourceById={sourceById}
          />
          <a
            href={exceptionalRoute.officialUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-red-900 px-5 text-sm font-semibold text-white hover:bg-red-800"
          >
            Read the official court procedure{" "}
            <span aria-hidden="true" className="ml-1">↗</span>
          </a>
        </aside>
      ))}
      <p className="mt-6 rounded-2xl bg-white p-4 text-sm text-ink-soft">
        <strong className="text-ink">Possible effect:</strong> {route.possibleEffect}
      </p>
      <h3 className="mt-6 font-semibold text-ink">Limits</h3>
      <List items={route.limits} />
      <p className="mt-3 text-sm text-amber-950">{route.notLegalAdvice}</p>
      <a
        href={route.officialUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-soft"
      >
        Open the official route <span aria-hidden="true" className="ml-1">↗</span>
      </a>
    </section>
  );
}

function OfficialHandoff({
  destinationId,
  sourceById,
}: {
  destinationId: string;
  sourceById: Map<string, Source>;
}) {
  const handoff = pathways.officialHandoffs.find(
    (item) => item.id === destinationId,
  );
  if (!handoff) return null;
  return (
    <section className="mt-10 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Bounded hand-off</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{handoff.title}</h2>
      <p className="mt-4 max-w-4xl text-ink-soft">{handoff.useWhen}</p>
      <h3 className="mt-6 font-semibold text-ink">Useful next actions</h3>
      <List items={handoff.actions} />
      <h3 className="mt-6 font-semibold text-ink">Limits</h3>
      <List items={handoff.limits} />
      <SourceLinks sourceIds={handoff.sourceIds} sourceById={sourceById} />
      <a
        href={handoff.officialUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-deep"
      >
        Open the official hand-off <span aria-hidden="true" className="ml-1">↗</span>
      </a>
    </section>
  );
}

function CoverageGap({
  destinationId,
  sourceById,
}: {
  destinationId: string;
  sourceById: Map<string, Source>;
}) {
  const gap = pathways.coverageGaps.find((item) => item.id === destinationId);
  if (!gap) return null;
  return (
    <section className="mt-10 rounded-[2rem] border border-red-200 bg-red-50 p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-red-800">
        Do not reuse the Westminster route
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-red-950">{gap.title}</h2>
      <p className="mt-4 max-w-4xl text-red-900">{gap.whySeparate}</p>
      <p className="mt-4 rounded-2xl bg-white p-4 text-sm text-red-950">
        <strong>Safe next step:</strong> {gap.safeFallback}
      </p>
      <SourceLinks sourceIds={gap.sourceIds} sourceById={sourceById} />
    </section>
  );
}

export function DecisionGuide() {
  const [selectedIntentId, setSelectedIntentId] = useState(
    pathways.decisionIntents[0]?.id ?? "",
  );
  const sourceById = useMemo(
    () => new Map(pathways.sources.map((source) => [source.id, source])),
    [],
  );
  const actorById = useMemo(
    () => new Map(pathways.actors.map((actor) => [actor.id, actor])),
    [],
  );
  const selectedIntent =
    pathways.decisionIntents.find((intent) => intent.id === selectedIntentId)
    ?? pathways.decisionIntents[0];
  const pathway = selectedIntent?.routeType === "deep-pathway"
    ? pathways.pathways.find((item) => item.id === selectedIntent.destinationId)
    : undefined;

  if (!selectedIntent) return null;

  const selectedDoors = pathway
    ? pathways.publicDoors.filter((door) => pathway.publicDoorIds.includes(door.id))
    : [];
  const selectedBarriers = pathway
    ? pathways.barriers.filter((barrier) => pathway.barrierIds.includes(barrier.id))
    : [];
  const selectedParticipants = pathway
    ? pathways.participants.filter((participant) =>
      pathway.participantIds.includes(participant.id))
    : [];
  const selectedWindows = pathway
    ? pathways.eventWindows.filter((window) => window.pathwayId === pathway.id)
    : [];

  return (
    <>
      <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <p className="font-semibold">Power map checked {pathways.meta.lawAsAt}.</p>
        <p className="mt-2 max-w-5xl">
          This is institutional orientation, not political advice or a personalised legal route.
          A live consultation, Bill, commencement rule or tax decision letter controls the real
          deadline. TaxSorted never receives your choice or sends anything for you.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="intent-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">1 · Name the change</p>
        <h2 id="intent-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Which thing are you actually trying to change?
        </h2>
        <p className="mt-3 max-w-4xl text-ink-soft">
          The choice changes this page only. It is not saved, sent, analysed or used to infer a
          political belief.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pathways.decisionIntents.map((intent) => {
            const selected = intent.id === selectedIntent.id;
            return (
              <button
                key={intent.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedIntentId(intent.id)}
                className={`rounded-3xl border p-5 text-left shadow-sm transition ${selected ? "border-accent bg-accent text-white" : "border-line bg-white text-ink hover:border-accent hover:bg-accent-soft"}`}
              >
                <span className={`text-xs font-semibold uppercase tracking-wide ${selected ? "text-white/90" : "text-accent"}`}>
                  {routeTypeLabel(intent.routeType)}
                </span>
                <span className="mt-2 block text-xl font-semibold">{intent.title}</span>
                <span className={`mt-3 block text-sm ${selected ? "text-white/90" : "text-ink-soft"}`}>
                  {intent.question}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 grid gap-4 rounded-3xl border border-line bg-paper p-5 md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-ink">Choose this when</h3>
            <List items={selectedIntent.chooseWhen} />
          </div>
          <div>
            <h3 className="font-semibold text-ink">Use another door when</h3>
            <List items={selectedIntent.doNotUseWhen} />
          </div>
        </div>
      </section>

      {selectedIntent.routeType === "personal-route" ? (
        <PersonalRoute destinationId={selectedIntent.destinationId} sourceById={sourceById} />
      ) : null}
      {selectedIntent.routeType === "official-handoff" ? (
        <OfficialHandoff destinationId={selectedIntent.destinationId} sourceById={sourceById} />
      ) : null}
      {selectedIntent.routeType === "coverage-gap" ? (
        <CoverageGap destinationId={selectedIntent.destinationId} sourceById={sourceById} />
      ) : null}

      {pathway ? (
        <>
          <section className="mt-12" aria-labelledby="truth-title">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">2 · Where power sits</p>
            <h2 id="truth-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Four truths before choosing a door.
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Government proposes", "The Chancellor, Treasury and HMRC policy partnership develop the government proposal."],
                ["Commons authorises", "Taxation needs the Commons financial and legislative process."],
                ["Scrutiny is not decision", "The OBR, committees and Lords can test, expose and recommend within their limits."],
                ["HMRC administers", "HMRC implements enacted law impartially; a personal dispute follows appeal, not lobbying."],
              ].map(([title, body]) => (
                <article key={title} className="rounded-3xl border border-line bg-white p-5 shadow-sm">
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{body}</p>
                </article>
              ))}
            </div>
          </section>

          {selectedWindows.map((window) => (
            <section key={window.id} className="mt-10 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">
                Dated public window · verify before responding
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">{window.title}</h2>
              <p className="mt-3 text-sm text-emerald-900">
                Recorded as <strong>{window.statusAsAt}</strong> when checked {window.checkedOn};
                official closing date {window.closesOn}. Scope: {window.scopeStatus.replace("-", " ")}.
              </p>
              <p className="mt-4 max-w-5xl text-emerald-950">{window.scope}</p>
              <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-ink-soft">
                <strong className="text-ink">What can still change:</strong> {window.whatCanStillChange}
              </p>
              <p className="mt-3 text-sm text-emerald-900">
                <strong>Formal effect:</strong> {window.proceduralEffect}
              </p>
              <p className="mt-2 text-sm text-emerald-900">
                <strong>No promise:</strong> {window.cannotPromise}
              </p>
              <SourceLinks sourceIds={window.sourceIds} sourceById={sourceById} />
              <a
                href={window.officialUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-5 inline-flex min-h-11 items-center rounded-full bg-emerald-900 px-5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Verify the live official window <span aria-hidden="true" className="ml-1">↗</span>
              </a>
            </section>
          ))}

          <section className="mt-12" aria-labelledby="chain-title">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">3 · The decision chain</p>
            <h2 id="chain-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              Ten stages. Every institution has limits.
            </h2>
            <p className="mt-3 max-w-4xl text-ink-soft">{pathway.summary}</p>
            <ol className="mt-6 space-y-4">
              {pathway.stages.map((stage) => (
                <li key={stage.id} className="grid gap-3 sm:grid-cols-[3rem_minmax(0,1fr)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                    {stage.order}
                  </span>
                  <article className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                      {stage.phase.replaceAll("-", " ")}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">{stage.title}</h3>
                    <List items={stage.whatHappens} />
                    <div className="mt-4 flex flex-wrap gap-2" aria-label="Institutions at this stage">
                      {stage.actorIds.map((actorId) => (
                        <span key={actorId} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-ink">
                          {actorById.get(actorId)?.name ?? actorId}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <p className="rounded-2xl bg-paper p-4 text-sm text-ink-soft">
                        <strong className="text-ink">Can still change:</strong> {stage.changeStillPossible}
                      </p>
                      <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">
                        <strong>Not guaranteed:</strong> {stage.notGuaranteed}
                      </p>
                    </div>
                    <SourceLinks sourceIds={stage.sourceIds} sourceById={sourceById} />
                  </article>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12" aria-labelledby="doors-title">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">4 · Public doors</p>
            <h2 id="doors-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              No “best” route. Read the formal effect.
            </h2>
            <p className="mt-3 max-w-4xl text-ink-soft">
              Choose by the current stage, deadline, evidence, identity requirement and public
              exposure—not by a promise that one tactic will work.
            </p>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {selectedDoors.map((door) => (
                <article key={door.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                      {door.availability.replace("-", " ")}
                    </span>
                    <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-soft">
                      {effectLabel(door.directEffect)}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-ink">{door.title}</h3>
                  <p className="mt-3 text-sm text-ink-soft">{door.whoCanUse}</p>
                  <h4 className="mt-5 font-semibold text-ink">What to do</h4>
                  <List items={door.action} />
                  <p className="mt-5 rounded-2xl bg-paper p-4 text-sm text-ink-soft">
                    <strong className="text-ink">Deadline:</strong> {door.deadlineRule}
                  </p>
                  <p className="mt-3 text-sm text-ink-soft">
                    <strong className="text-ink">Expected output:</strong> {door.expectedOutput}
                  </p>
                  <p className="mt-2 text-sm text-red-800">
                    <strong>No promise:</strong> {door.cannotPromise}
                  </p>
                  <details className="mt-4 rounded-2xl border border-line p-4">
                    <summary className="min-h-11 cursor-pointer py-2 font-medium text-ink">
                      Identity, privacy and publication
                    </summary>
                    <p className="mt-3 text-sm text-ink-soft">{door.accountOrIdentity}</p>
                    <p className="mt-2 text-sm text-ink-soft">{door.privacyAndPublication}</p>
                  </details>
                  <SourceLinks sourceIds={door.sourceIds} sourceById={sourceById} />
                  <a
                    href={door.officialUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-soft"
                  >
                    Open the official door <span aria-hidden="true" className="ml-1">↗</span>
                  </a>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-12 grid gap-5 xl:grid-cols-2" aria-label="Participants and barriers">
            <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">5 · Participants</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                Influence is not formal power.
              </h2>
              <div className="mt-6 space-y-4">
                {selectedParticipants.map((participant) => (
                  <details key={participant.id} className="rounded-2xl border border-line p-4">
                    <summary className="min-h-11 cursor-pointer py-2 font-semibold text-ink">
                      {participant.name}
                    </summary>
                    <p className="mt-3 text-sm text-ink-soft">{participant.accessPattern}</p>
                    <h3 className="mt-4 text-sm font-semibold text-ink">Can contribute</h3>
                    <List items={participant.canContribute} />
                    <h3 className="mt-4 text-sm font-semibold text-ink">Cannot do</h3>
                    <List items={participant.cannotDo} />
                    <SourceLinks sourceIds={participant.sourceIds} sourceById={sourceById} />
                  </details>
                ))}
              </div>
            </article>

            <article className="rounded-[2rem] border border-line bg-paper p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">6 · Barriers</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
                See the gate and why it exists.
              </h2>
              <div className="mt-6 space-y-4">
                {selectedBarriers.map((barrier) => (
                  <details key={barrier.id} className="rounded-2xl border border-line bg-white p-4">
                    <summary className="min-h-11 cursor-pointer py-2 font-semibold text-ink">
                      {barrier.title}
                    </summary>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent">
                      Mechanism: {barrier.mechanismAnalysisStatus.replaceAll("-", " ")}
                    </p>
                    <p className="mt-3 text-sm text-ink-soft">{barrier.mechanism}</p>
                    <p className="mt-3 text-sm text-ink-soft">
                      <strong className="text-ink">Public purpose:</strong> {barrier.publicPurpose}
                    </p>
                    <h3 className="mt-4 text-sm font-semibold text-ink">
                      TaxSorted-written general options · not personalised or ranked
                    </h3>
                    <List items={barrier.generalLowerFrictionOptions} />
                    <p className="mt-4 rounded-2xl bg-accent-soft p-3 text-sm text-ink">
                      <strong>Does not mean:</strong> {barrier.doesNotMean}
                    </p>
                    <SourceLinks sourceIds={barrier.sourceIds} sourceById={sourceById} />
                  </details>
                ))}
              </div>
            </article>
          </section>

          <section className="mt-12 rounded-[2rem] border border-line bg-ink p-6 text-white sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/60">7 · Office is optional</p>
            <h2 className="mt-2 text-3xl font-semibold">Most doors do not require becoming a politician.</h2>
            <p className="mt-4 max-w-4xl text-white/75">
              Consultations, committee evidence, petitions, information rights and constituency
              representation already exist. If the chosen path is elected Commons office, the
              separate guide shows that route without recommending a party.
            </p>
            <a
              href="/uk/politics/stand"
              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink hover:bg-paper"
            >
              Read the Public Office Pathfinder
            </a>
          </section>

          <section className="mt-12" aria-labelledby="gaps-title">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">8 · Named gaps</p>
            <h2 id="gaps-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              These decision chains are not “basically the same.”
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {pathways.coverageGaps.map((gap) => (
                <article key={gap.id} className="rounded-3xl border border-line bg-white p-5">
                  <h3 className="font-semibold text-ink">{gap.title}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{gap.whySeparate}</p>
                  <p className="mt-3 text-sm text-accent">
                    <strong>Safe fallback:</strong> {gap.safeFallback}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-12 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Build on the map</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              The same reviewed facts, shaped for agents.
            </h2>
            <p className="mt-3 max-w-4xl text-ink-soft">
              Stable IDs, source records, strict JSON Schema, OpenAPI, GET/HEAD, strong ETags and
              explicit no-write effects. TaxSorted curation and upstream rights stay separate.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://api.taxsorted.io/v1/politics/uk/public-decision-pathways"
                className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-deep"
              >
                Read the JSON
              </a>
              <a
                href="https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/schema"
                className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-accent hover:bg-accent-soft"
              >
                Read the schema
              </a>
              <a
                href="https://api.taxsorted.io/v1/politics/uk/public-decision-pathways/rights"
                className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-accent hover:bg-accent-soft"
              >
                Read reuse rights
              </a>
              <a
                href="https://api.taxsorted.io/openapi/politics-uk.json"
                className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-accent hover:bg-accent-soft"
              >
                Read the OpenAPI description
              </a>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
