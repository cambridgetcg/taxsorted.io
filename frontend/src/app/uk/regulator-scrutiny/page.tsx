import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { ukProfessionalOpportunityCorpus } from "@/lib/uk-professional-opportunities";

export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  if (!corpus) {
    return {
      title: "Public-body research awaiting hosted review — TaxSorted",
      description:
        "TaxSorted's hosted evidence ledger remains unavailable until its independent review and hosted-distribution decision are complete.",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: "Public bodies answer to evidence too — TaxSorted",
    description:
      "A source-linked UK ledger of institutional scrutiny, its proof limits, counterweights, correction routes and the legal clocks professionals must keep separate.",
  };
}

type EvidenceState =
  | "court-finding"
  | "oversight-finding"
  | "official-statistic"
  | "stakeholder-assessment"
  | "taxsorted-fairness-question"
  | "unknown";

type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  sourceType: string;
  territories: string[];
  retrievedAt: string;
  notes: string;
};

type ScrutinyRecord = {
  id: string;
  title: string;
  affectedInstitutions: string[];
  evidenceState: EvidenceState;
  statement: string;
  doesNotProve: string;
  counterweightOrResponse: string;
  correctionOrReviewRoute: string;
  sourceIds: string[];
};

type ChallengeRouteGuide = {
  id: string;
  title: string;
  useWhen: string;
  clock: string;
  next: string;
  sourceIds: string[];
};

type OpportunityCorpus = {
  sources: Source[];
  scrutiny: ScrutinyRecord[];
  sharedWorkflow: {
    challengeSeparation: {
      routes: ChallengeRouteGuide[];
    };
  };
};

const corpus =
  ukProfessionalOpportunityCorpus as unknown as OpportunityCorpus | null;
const sourceById = new Map(
  (corpus?.sources ?? []).map((source) => [source.id, source]),
);

const evidenceStateCopy: Record<
  EvidenceState,
  { label: string; meaning: string; tone: string }
> = {
  "court-finding": {
    label: "Court finding",
    meaning:
      "A court or tribunal decided the stated point. Appeal and finality status still matter.",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-950",
  },
  "oversight-finding": {
    label: "Oversight finding",
    meaning:
      "A named oversight body reached a formal institutional finding. It is not a court judgment.",
    tone: "border-violet-300 bg-violet-50 text-violet-950",
  },
  "official-statistic": {
    label: "Official statistic",
    meaning:
      "A defined population was counted. The number does not establish cause, motive or unlawfulness.",
    tone: "border-sky-300 bg-sky-50 text-sky-950",
  },
  "stakeholder-assessment": {
    label: "Stakeholder assessment",
    meaning:
      "An attributed professional or affected-group assessment. It remains that source’s assessment.",
    tone: "border-amber-300 bg-amber-50 text-amber-950",
  },
  "taxsorted-fairness-question": {
    label: "TaxSorted fairness question",
    meaning:
      "An editorial question worth testing against law and evidence. It is not a finding or allegation.",
    tone: "border-rose-300 bg-rose-50 text-rose-950",
  },
  unknown: {
    label: "Unknown",
    meaning:
      "The evidence state is not settled. The gap must remain visible and must not be filled by inference.",
    tone: "border-stone-300 bg-stone-100 text-stone-950",
  },
};

const evidenceStateOrder: EvidenceState[] = [
  "court-finding",
  "oversight-finding",
  "official-statistic",
  "stakeholder-assessment",
  "taxsorted-fairness-question",
  "unknown",
];

const workflow = [
  {
    title: "Confirm authority and competence",
    body: "Identify the exact work, reserved activity, professional rule and jurisdiction. Check status at its official source; a general tax title is not universal authority.",
  },
  {
    title: "Open a private matter locally",
    body: "Run identity, client-authority, confidentiality and conflict checks inside the firm’s approved system. Put no client facts into TaxSorted.",
  },
  {
    title: "Preserve the shortest clock",
    body: "Read the decision notice and governing rule. Calendar appeal, review, complaint and possible judicial-review dates separately before investigating the wider story.",
  },
  {
    title: "Freeze the public evidence packet",
    body: "Keep the corpus version, source IDs, retrieval dates and exact public documents. Record later changes instead of silently overwriting them.",
  },
  {
    title: "Test merits and counterevidence",
    body: "Separate a decided finding, criticism, statistic, stakeholder view and fairness question. Look actively for the institution’s answer and facts that weaken the proposed case.",
  },
  {
    title: "Assess remedy, money, cost and risk",
    body: "Name what the chosen route can actually do. Include a £0 or negative net scenario; do not publish a win probability or turn amount affected into promised recovery.",
  },
  {
    title: "Record a bounded decision",
    body: "Decline, seek more evidence, refer with informed consent, or continue private review. Keep reasons and any client contact outside the public commons.",
  },
] as const;

function humanise(value: string) {
  return value.replaceAll("-", " ");
}

function SourceLinks({ ids }: { ids: string[] }) {
  const resolved = ids
    .map((id) => sourceById.get(id))
    .filter((source): source is Source => Boolean(source));
  const missing = ids.filter((id) => !sourceById.has(id));

  return (
    <>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {resolved.map((source) => (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              data-source-link="true"
              className="flex min-h-11 h-full flex-col justify-center rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink hover:border-accent"
            >
              <span className="font-semibold text-accent underline decoration-line underline-offset-4">
                {source.title} <span aria-hidden="true">↗</span>
              </span>
              <span className="mt-1 text-xs leading-5 text-ink-soft">
                {source.publisher} · {humanise(source.sourceType)} ·{" "}
                {source.territories.join(", ")} · retrieved {source.retrievedAt}
              </span>
              <span className="mt-1 text-xs leading-5 text-ink-soft">
                {source.notes}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {missing.length > 0 ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950">
          Source record missing: {missing.join(", ")}. Do not rely on this entry
          until the corpus is corrected.
        </p>
      ) : null}
    </>
  );
}

export default function RegulatorScrutinyPage() {
  if (!corpus) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Hosted distribution gate closed
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">
          This evidence ledger is awaiting its required independent review.
        </h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">
          TaxSorted&apos;s official hosted ledger stays closed until the exact
          corpus passes review and is enabled for this deployment. The source
          research is already visible in the public GitHub repository. This
          page accepts no allegation, client matter or private document.
        </p>
        <Link
          href="/uk/accountability"
          className="mt-7 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          Return to the accountability map
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/uk", label: "The UK system" },
          { href: "/uk/opportunities", label: "Professional opportunities" },
        ]}
        current="Public-body scrutiny"
        className="mb-6"
      />

      <header className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10 lg:p-12">
        <div
          className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute right-14 top-14 h-28 w-28 rounded-full bg-violet-400/25"
          aria-hidden="true"
        />
        <div className="relative max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            UK institutional scrutiny · evidence before accusation
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            Public bodies answer to evidence too.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/80">
            Public power can be examined without turning public servants into
            targets. This ledger keeps the institution, evidence state, proof
            limit, response, correction route and source together.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#ledger"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-base font-semibold text-ink hover:bg-violet-50"
            >
              Read the evidence ledger
            </a>
            <a
              href="#route-fork"
              className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 py-2.5 text-base font-semibold text-white hover:bg-white/10"
            >
              Protect the right route
            </a>
          </div>
        </div>
      </header>

      <ShortVersion className="mt-6">
        <li>
          This is scrutiny of institutional acts and systems—not an employee
          dossier, motive claim or finding about a person.
        </li>
        <li>
          No finding is inferred. Each record says what its evidence proves,
          what it does not prove, and what the body said or what weighs against it.
        </li>
        <li>
          A statistic must keep its population or denominator beside it; a rate
          alone does not prove why an outcome occurred.
        </li>
        <li>
          Appeal, complaint and judicial review are different routes with
          different clocks. A professional preserves the shortest clock first.
        </li>
      </ShortVersion>

      <section
        className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"
        aria-labelledby="boundary-title"
      >
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            The subject is the institution
          </p>
          <h2
            id="boundary-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            Audit the public act, not the employee.
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-7 text-ink-soft">
            A record may examine a policy, decision process, published
            statistic, complaint system or decided institutional act. It does
            not assemble person profiles, infer intent, invite allegations or
            treat job title, funding or association as proof of control.
          </p>
        </article>
        <aside className="rounded-[2rem] border border-violet-200 bg-violet-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-900">
            No finding is inferred
          </p>
          <p className="mt-3 text-xl font-semibold leading-8 text-ink">
            A complaint is a complaint. A statistic is a statistic. A question
            is a question.
          </p>
          <p className="mt-3 text-base leading-7 text-violet-950">
            The evidence-state label travels with the statement wherever it is
            copied. Silence is not admission, and later correction must remain
            as visible as the original.
          </p>
        </aside>
      </section>

      <section className="mt-16" aria-labelledby="states-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Evidence state
        </p>
        <h2
          id="states-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          These labels must never collapse into one.
        </h2>
        <div
          data-testid="evidence-legend"
          className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          {evidenceStateOrder.map((state) => {
            const copy = evidenceStateCopy[state];
            return (
              <article
                key={state}
                className={`rounded-2xl border p-5 ${copy.tone}`}
              >
                <span
                  data-testid="evidence-state-label"
                  data-evidence-state={state}
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${copy.tone}`}
                >
                  {copy.label}
                </span>
                <p className="mt-3 text-sm leading-6">{copy.meaning}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="ledger"
        className="mt-16 scroll-mt-6"
        aria-labelledby="ledger-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Source-linked scrutiny ledger
        </p>
        <h2
          id="ledger-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Every criticism carries its limit and counterweight.
        </h2>
        <p className="mt-3 max-w-5xl text-base leading-7 text-ink-soft">
          Quantitative statements name the measured population or denominator
          in the statement itself. Read that denominator and the body response
          or counterweight before comparing rates. None of these records alone
          establishes individual liability, motive or a viable client claim.
        </p>

        <div className="mt-8 grid gap-6">
          {corpus.scrutiny.map((record) => {
            const state = evidenceStateCopy[record.evidenceState];
            return (
              <article
                key={record.id}
                data-testid="scrutiny-record"
                data-evidence-state={record.evidenceState}
                className="overflow-hidden rounded-[2rem] border border-line bg-white shadow-sm"
              >
                <div className="border-b border-line bg-paper p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${state.tone}`}
                      >
                        Evidence state: {state.label}
                      </span>
                      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                        {record.title}
                      </h3>
                    </div>
                    <p className="text-xs font-medium text-ink-soft">
                      Record {record.id}
                    </p>
                  </div>
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      Institutions affected
                    </p>
                    <ul
                      className="mt-2 flex flex-wrap gap-2"
                      aria-label={`Institutions affected by ${record.title}`}
                    >
                      {record.affectedInstitutions.map((institution) => (
                        <li
                          key={institution}
                          className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink"
                        >
                          {institution}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid gap-5 p-6 sm:p-8 lg:grid-cols-2">
                  <section
                    className="rounded-2xl border border-line p-5"
                    aria-label="Evidence statement"
                  >
                    <h4 className="font-semibold text-ink">
                      What the evidence says
                    </h4>
                    <p className="mt-3 text-base leading-7 text-ink-soft">
                      {record.statement}
                    </p>
                    {record.evidenceState === "official-statistic" ? (
                      <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm leading-6 text-sky-950">
                        Population check: use only the population or denominator
                        stated above. Do not silently generalise it.
                      </p>
                    ) : null}
                  </section>

                  <section
                    className="rounded-2xl border border-rose-200 bg-rose-50 p-5"
                    aria-label="Proof limit"
                  >
                    <h4 className="font-semibold text-rose-950">
                      What this does not prove
                    </h4>
                    <p className="mt-3 text-base leading-7 text-rose-950">
                      {record.doesNotProve}
                    </p>
                  </section>

                  <section
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                    aria-label="Response or counterweight"
                  >
                    <h4 className="font-semibold text-amber-950">
                      Body response or counterweight
                    </h4>
                    <p className="mt-3 text-base leading-7 text-amber-950">
                      {record.counterweightOrResponse}
                    </p>
                  </section>

                  <section
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
                    aria-label="Correction or review route"
                  >
                    <h4 className="font-semibold text-emerald-950">
                      Lawful correction or review route
                    </h4>
                    <p className="mt-3 text-base leading-7 text-emerald-950">
                      {record.correctionOrReviewRoute}
                    </p>
                  </section>

                  <section
                    className="lg:col-span-2"
                    aria-label={`Sources for ${record.title}`}
                  >
                    <h4 className="font-semibold text-ink">
                      Linked evidence
                    </h4>
                    <SourceLinks ids={record.sourceIds} />
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="route-fork"
        className="mt-16 scroll-mt-6"
        aria-labelledby="route-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Deadline asymmetry
        </p>
        <h2
          id="route-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Scrutiny can take months. A challenge clock can expire in days.
        </h2>
        <p className="mt-3 max-w-5xl text-base leading-7 text-ink-soft">
          That asymmetry is a practical risk, not proof that any body acted
          unlawfully. Identify the legal route from the decision and governing
          rule, then preserve the shortest plausible deadline.
        </p>

        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {corpus.sharedWorkflow.challengeSeparation.routes.map(
            (route, index) => (
              <article
                key={route.id}
                data-testid="route-guide"
                className="flex flex-col rounded-3xl border border-line bg-white p-6 shadow-sm"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                  Route {index + 1}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">
                  {route.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-ink-soft">
                  {route.useWhen}
                </p>
                <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-950">
                  Clock: {route.clock}
                </p>
                <p className="mt-4 text-sm leading-6 text-ink">{route.next}</p>
                <div className="mt-auto pt-5">
                  <h4 className="text-sm font-semibold text-ink">
                    Route sources
                  </h4>
                  <SourceLinks ids={route.sourceIds} />
                </div>
              </article>
            ),
          )}
        </div>

        <p className="mt-6 rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 text-base font-semibold leading-7 text-rose-950">
          A complaint does not by itself pause an appeal, statutory-review,
          payment or judicial-review clock. Check the governing rule and any
          effective written decision; run routes in parallel when the law and
          facts require it.
        </p>
      </section>

      <section
        className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
        aria-labelledby="workflow-title"
      >
        <article className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            For qualified professionals
          </p>
          <h2
            id="workflow-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-ink"
          >
            A local workflow, with the intake door closed.
          </h2>
          <ol className="mt-7 space-y-5">
            {workflow.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <aside className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-900">
            Hard boundary
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Research commons, not an accusation engine.
          </h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-6 text-rose-950">
            <li>No claimant or whistleblower intake.</li>
            <li>No private evidence uploads or public case pickup.</li>
            <li>No employee dossiers, person profiles or motive claims.</li>
            <li>No public contacts, bids, rankings or lead sales.</li>
            <li>No win probabilities or promised recovery.</li>
            <li>
              No claim that a professional licence covers work outside its
              actual scope.
            </li>
          </ul>
          <p className="mt-5 border-t border-rose-200 pt-5 text-sm leading-6 text-rose-950">
            The public packet can be mirrored. Any client facts, instructions,
            conflicts, communications and completed assessment stay in the
            professional’s own approved matter system.
          </p>
        </aside>
      </section>

      <section
        className="mt-16 rounded-[2rem] border border-violet-200 bg-violet-50 p-6 sm:p-8 lg:p-10"
        aria-labelledby="reply-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-violet-900">
          Right of reply and correction
        </p>
        <h2
          id="reply-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Reply and repair are part of the evidence.
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-violet-200 bg-white p-5">
            <h3 className="font-semibold text-ink">Before publication</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Give the institution the exact proposed factual statement,
              evidence state and sources, with a reasonable chance to answer.
            </p>
          </article>
          <article className="rounded-2xl border border-violet-200 bg-white p-5">
            <h3 className="font-semibold text-ink">With the response</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Publish the relevant answer or counterweight beside the claim.
              No response is not an admission, and disagreement is not proof of
              bad faith.
            </p>
          </article>
          <article className="rounded-2xl border border-violet-200 bg-white p-5">
            <h3 className="font-semibold text-ink">After correction</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Correct promptly, date the change and preserve a plain version
              note. A reversal or successful challenge must be as easy to find
              as the original criticism.
            </p>
          </article>
        </div>
      </section>

      <p className="mt-8 text-sm leading-6 text-ink-soft">
        This public ledger is research, not legal advice or a finding about any
        person. Check the live source, governing rule and current deadline
        before acting.
      </p>
    </div>
  );
}
