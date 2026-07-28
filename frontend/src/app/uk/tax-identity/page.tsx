import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import taxIdentityJson from "../../../../../research/uk/tax-identity/data/uk-tax-identity.json";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "UK tax identity framework — TaxSorted",
  description:
    "See legal form, tax attribution, residence, activity, control, reporting and filing identity as separate, dated dimensions — with UK sources and synthetic examples.",
};

type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  authorityLevel: string;
  jurisdiction: string;
  retrievedAt: string;
  supports: string[];
  limitations: string[];
};

type ClassificationValue = {
  id: string;
  label: string;
  meaning: string;
  doesNotMean: string;
  sourceIds: string[];
};

type Dimension = {
  id: string;
  label: string;
  question: string;
  meaning: string;
  cardinality: "one" | "many";
  origin: string;
  classificationValues: ClassificationValue[];
  reviewWhen: string[];
  sourceIds: string[];
};

type TaxRole = {
  taxOrRegime: string;
  subject: string;
  role: string;
  caveat: string;
};

type Archetype = {
  id: string;
  label: string;
  subjectKind: string;
  territory: string;
  summary: string;
  dimensionHighlights: string[];
  taxRoles: TaxRole[];
  commonMisreadings: string[];
  sourceIds: string[];
};

type Overlap = {
  id: string;
  label: string;
  archetypeIds: string[];
  dimensionIds: string[];
  requires: Array<{
    id: string;
    dimensionId: string;
    classificationId: string;
  }>;
  relations: Array<{
    leftRequirementId: string;
    rightRequirementId: string;
    field:
      | "subjectRef"
      | "jurisdiction"
      | "taxOrRegime"
      | "activityOrContext"
      | "ruleset";
    operator: "same" | "different";
  }>;
  meaning: string;
  dangerousShortcut: string;
  questions: string[];
  reviewTriggers: string[];
  sourceIds: string[];
};

type Milestone = {
  id: string;
  date: string;
  eventType: string;
  title: string;
  change: string;
  continuity: string;
  dimensionIds: string[];
  archetypeIds: string[];
  sourceIds: string[];
};

type ExampleAssertion = {
  dimensionId: string;
  classificationId: string;
  status:
    | "established"
    | "conditional"
    | "disputed"
    | "unknown"
    | "not-applicable";
  scope: {
    subjectRef: string;
    jurisdiction: string;
    taxOrRegime: string;
    activityOrContext: string;
    ruleset: string;
  };
  effectiveDateBasis:
    | "stated-interval"
    | "current-at-corpus-review"
    | "unknown"
    | "not-applicable";
  basis: string;
  sourceIds: string[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
};

type ExampleProfile = {
  id: string;
  label: string;
  summary: string;
  jurisdiction: string;
  asOf: string;
  archetypeIds: string[];
  subjects: Array<{
    id: string;
    label: string;
    kind: string;
  }>;
  assertions: ExampleAssertion[];
  reviewTriggers: string[];
  notDetermined: string[];
};

type Gap = {
  id: string;
  title: string;
  status: string;
  why: string;
  safeNextStep: string;
};

type TaxIdentityCorpus = {
  schema: string;
  meta: {
    title: string;
    version: string;
    reviewedOn: string;
    lawAsAt: string;
    jurisdiction: string;
    purpose: string;
    portability: string;
    warning: string;
    contentLicence: { name: string; url: string; scope: string };
    editorialRules: string[];
    boundaries: string[];
  };
  sources: Source[];
  dimensions: Dimension[];
  archetypes: Archetype[];
  overlaps: Overlap[];
  milestones: Milestone[];
  exampleProfiles: ExampleProfile[];
  gaps: Gap[];
};

const identity = taxIdentityJson as unknown as TaxIdentityCorpus;
const sourceById = new Map(identity.sources.map((source) => [source.id, source]));
const dimensionById = new Map(
  identity.dimensions.map((dimension) => [dimension.id, dimension]),
);
const classificationById = new Map(
  identity.dimensions.flatMap((dimension) =>
    dimension.classificationValues.map((classification) => [
      classification.id,
      classification,
    ] as const),
  ),
);
const archetypeById = new Map(
  identity.archetypes.map((archetype) => [archetype.id, archetype]),
);

function formatCorpusDate(value: string) {
  const parts = value.split("-");
  if (parts.length === 1) return parts[0];

  const date = new Date(
    Date.UTC(
      Number(parts[0]),
      Number(parts[1]) - 1,
      parts.length === 3 ? Number(parts[2]) : 1,
    ),
  );
  return new Intl.DateTimeFormat("en-GB", {
    day: parts.length === 3 ? "numeric" : undefined,
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function humanise(value: string) {
  return value.replaceAll("-", " ");
}

function SourceLinks({ ids = [] }: { ids?: string[] }) {
  const sources = ids
    .map((id) => sourceById.get(id))
    .filter((source): source is Source => Boolean(source));

  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
      {sources.map((source) => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          title={`${source.title} — ${source.publisher}`}
          className="inline-flex min-h-11 items-center text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
        >
          {source.title} <span aria-hidden="true">&nbsp;↗</span>
        </a>
      ))}
    </div>
  );
}

function scopeFieldLabel(
  field: Overlap["relations"][number]["field"],
) {
  return {
    subjectRef: "subject",
    jurisdiction: "jurisdiction",
    taxOrRegime: "tax or regime",
    activityOrContext: "activity or context",
    ruleset: "rule set",
  }[field];
}

function effectiveDateLabel(
  assertion: ExampleAssertion,
  corpusReviewDate: string,
) {
  if (assertion.effectiveDateBasis === "not-applicable") {
    return "Effective time is not applicable to this assertion.";
  }
  if (assertion.effectiveDateBasis === "unknown") {
    return "Effective time is unknown and needs review.";
  }
  if (assertion.effectiveDateBasis === "current-at-corpus-review") {
    return `Current at the corpus review on ${formatCorpusDate(corpusReviewDate)}; no earlier interval is claimed.`;
  }

  const start = assertion.effectiveFrom
    ? `from ${formatCorpusDate(assertion.effectiveFrom)}`
    : "from an unstated start";
  const end = assertion.effectiveTo
    ? ` to ${formatCorpusDate(assertion.effectiveTo)}`
    : " with no stated end";
  return `Stated interval ${start}${end}.`;
}

export default function TaxIdentityPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs
        items={[{ href: "/uk", label: "The UK system" }]}
        current="Tax identity"
        className="mb-6"
      />

      <header className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10 lg:p-12">
        <div
          className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute right-8 top-8 h-28 w-28 rounded-full bg-accent/40"
          aria-hidden="true"
        />
        <div className="relative max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            UK tax identity · law reviewed {formatCorpusDate(identity.meta.lawAsAt)}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            One subject can carry several tax identities at once.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/80">
            A person, company, relationship, arrangement or tax group can sit in
            several categories. Legal form is only one axis: attribution, activity,
            residence, registration, control, reporting and obligations can each
            point somewhere different. Time, sources and certainty qualify every
            assertion.
          </p>
          <a
            href="#dimensions"
            className="mt-7 inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-base font-semibold text-ink hover:bg-accent-soft"
          >
            Read the {identity.dimensions.length} dimensions
          </a>
        </div>
      </header>

      <ShortVersion className="mt-6">
        <li>Tax identity is a dated vector, not a permanent label.</li>
        <li>
          Always name the jurisdiction, tax or reporting regime, activity or
          capacity, rule set and effective period.
        </li>
        <li>
          Registration numbers are evidence. They do not settle the underlying
          legal or tax classification.
        </li>
        <li>
          The examples are synthetic teaching records. This page asks for no facts
          about a real person or organisation and makes no tax decision.
        </li>
      </ShortVersion>

      <section
        className="mt-7 overflow-hidden rounded-3xl border border-line bg-white shadow-sm"
        aria-labelledby="vector-title"
      >
        <div className="grid gap-px bg-line lg:grid-cols-[1.35fr_1fr]">
          <div className="bg-accent-soft p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              The unit of interpretation
            </p>
            <h2
              id="vector-title"
              className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
            >
              One assertion, one scope, one period.
            </h2>
            <p className="mt-4 overflow-x-auto rounded-2xl bg-ink px-5 py-4 font-mono text-sm leading-7 text-white sm:text-base">
              subject × jurisdiction × tax/regime × activity/context × rule set ×
              dimension × effective time
            </p>
            <p className="mt-4 text-base leading-7 text-ink-soft">
              A complete profile holds several such assertions together. Changing a
              tax, country, activity, rule set or date may change the answer without
              changing the underlying subject.
            </p>
          </div>
          <div className="bg-white p-6 sm:p-8">
            <p className="text-3xl font-semibold tabular-nums text-ink">
              {identity.dimensions.length}
            </p>
            <h3 className="mt-2 font-semibold text-ink">Separate dimensions</h3>
            <p className="mt-2 text-base leading-7 text-ink-soft">
              Each has its own origin, possible values, review triggers and source
              trail. “Unknown”, “conditional” and “disputed” remain visible.
            </p>
          </div>
        </div>
        <p className="border-t border-line px-6 py-4 text-sm leading-6 text-ink-soft sm:px-8">
          {identity.meta.warning}
        </p>
      </section>

      <nav
        className="mt-6 rounded-3xl border border-line bg-white p-4"
        aria-label="On this page"
      >
        <div className="flex flex-wrap gap-2">
          {[
            ["#dimensions", `${identity.dimensions.length} dimensions`],
            ["#archetypes", "Legal and tax archetypes"],
            ["#overlaps", "Grey areas"],
            ["#evolution", "Origins and evolution"],
            ["#examples", "Worked examples"],
            ["#method", "Method and limits"],
            ["#sources", "Sources"],
            ["#developers", "Public API"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 py-2 text-base text-ink hover:border-accent hover:bg-accent-soft"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section
        id="dimensions"
        className="mt-16 scroll-mt-6"
        aria-labelledby="dimensions-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Interpretation framework
        </p>
        <h2
          id="dimensions-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          {identity.dimensions.length} questions before any answer.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Work across the vector instead of guessing from the organisation’s name.
          Some dimensions allow several simultaneous values because a person can act
          in more than one capacity or carry more than one obligation.
        </p>

        <ol className="mt-8 grid gap-6 xl:grid-cols-2">
          {identity.dimensions.map((dimension, index) => {
            const milestones = identity.milestones.filter((milestone) =>
              milestone.dimensionIds.includes(dimension.id),
            );
            return (
              <li
                key={dimension.id}
                data-testid="dimension-card"
                className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                      {dimension.cardinality === "many"
                        ? "Several values may coexist"
                        : "One value within a stated scope"}
                    </p>
                    <h3 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
                      {dimension.label}
                    </h3>
                  </div>
                </div>

                <p className="mt-5 text-lg font-semibold leading-7 text-ink">
                  {dimension.question}
                </p>
                <p className="mt-3 text-base leading-7 text-ink-soft">
                  {dimension.meaning}
                </p>

                <div className="mt-5 rounded-2xl bg-paper p-5">
                  <h4 className="font-semibold text-ink">Where this category came from</h4>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{dimension.origin}</p>
                </div>

                <details className="group mt-5 rounded-2xl border border-line">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold text-ink marker:hidden">
                    <span>{dimension.classificationValues.length} possible values</span>
                    <span className="text-accent group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <dl className="border-t border-line px-4 pb-4">
                    {dimension.classificationValues.map((classification) => (
                      <div
                        key={classification.id}
                        data-testid="classification-value"
                        className="border-b border-line py-4 last:border-0"
                      >
                        <dt className="font-semibold text-ink">{classification.label}</dt>
                        <dd className="mt-1 text-sm leading-6 text-ink-soft">
                          {classification.meaning}
                        </dd>
                        <dd className="mt-2 text-sm leading-6 text-ink">
                          <strong>Does not mean:</strong> {classification.doesNotMean}
                        </dd>
                        <dd className="mt-2">
                          <SourceLinks ids={classification.sourceIds} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>

                <div className="mt-5">
                  <h4 className="font-semibold text-ink">Evolution recorded here</h4>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-ink-soft">
                    {milestones.map((milestone) => (
                      <li key={milestone.id}>
                        <strong className="text-ink">
                          {formatCorpusDate(milestone.date)}:
                        </strong>{" "}
                        {milestone.title}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5">
                  <h4 className="font-semibold text-ink">Pause and review when</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                    {dimension.reviewWhen.map((trigger) => (
                      <li key={trigger}>{trigger}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <SourceLinks ids={dimension.sourceIds} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section
        id="archetypes"
        className="mt-20 scroll-mt-6"
        aria-labelledby="archetypes-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Familiar forms, separated roles
        </p>
        <h2
          id="archetypes-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          {identity.archetypes.length} legal and tax archetypes, viewed across
          regimes.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          These are maps, not lookup-table conclusions. Each role names the regime,
          the subject and the duty separately.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {identity.archetypes.map((archetype) => (
            <article
              key={archetype.id}
              data-testid="archetype-card"
              className="rounded-3xl border border-line bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {archetype.territory} · {humanise(archetype.subjectKind)}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{archetype.label}</h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">{archetype.summary}</p>

              <div className="mt-5 space-y-3">
                {archetype.taxRoles.map((taxRole) => (
                  <div
                    key={`${archetype.id}-${taxRole.taxOrRegime}-${taxRole.role}`}
                    className="rounded-2xl bg-paper p-4"
                  >
                    <p className="font-semibold text-ink">{taxRole.taxOrRegime}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">
                      <strong className="text-ink">{taxRole.subject}</strong> · {taxRole.role}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-ink-soft">{taxRole.caveat}</p>
                  </div>
                ))}
              </div>

              <details className="group mt-5 rounded-2xl border border-line">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold text-ink marker:hidden">
                  <span>Common misreadings</span>
                  <span className="text-accent group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <ul className="border-t border-line px-8 py-4 list-disc space-y-2 text-sm leading-6 text-ink-soft">
                  {archetype.commonMisreadings.map((misreading) => (
                    <li key={misreading}>{misreading}</li>
                  ))}
                </ul>
              </details>
              <div className="mt-4">
                <SourceLinks ids={archetype.sourceIds} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="overlaps"
        className="mt-20 scroll-mt-6"
        aria-labelledby="overlaps-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Grey areas are relationships
        </p>
        <h2
          id="overlaps-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          {identity.overlaps.length} places where scoped classifications overlap.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          The safer response is not to choose the louder label. Keep both claims,
          state their scope and ask what fact or rule joins them.
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {identity.overlaps.map((overlap) => {
              const requirementById = new Map(
                overlap.requires.map((requirement) => [
                  requirement.id,
                  requirement,
                ]),
              );
              const requirementLabel = (
                requirement: Overlap["requires"][number] | undefined,
              ) => {
                if (!requirement) return "unknown requirement";
                const dimension = dimensionById.get(requirement.dimensionId);
                const classification = classificationById.get(
                  requirement.classificationId,
                );
                return `${dimension?.label ?? requirement.dimensionId}: ${
                  classification?.label ?? requirement.classificationId
                }`;
              };

            return (
                <article
                  key={overlap.id}
                  data-testid="overlap-card"
                  className="rounded-3xl border border-line bg-white p-6 shadow-sm"
                >
                  <h3 className="text-xl font-semibold text-ink">{overlap.label}</h3>
                  <p className="mt-3 text-base leading-7 text-ink-soft">
                    {overlap.meaning}
                  </p>

                  <div className="mt-4 rounded-2xl bg-paper p-4">
                    <h4 className="font-semibold text-ink">
                      Classifications that must match
                    </h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                      {overlap.requires.map((requirement) => (
                        <li key={requirement.id}>
                          {requirementLabel(requirement)}
                        </li>
                      ))}
                    </ul>
                    <h4 className="mt-4 font-semibold text-ink">
                      Scope relations that must hold
                    </h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                      {overlap.relations.map((relation, index) => (
                        <li
                          key={`${relation.leftRequirementId}-${relation.rightRequirementId}-${relation.field}-${index}`}
                          data-testid="overlap-relation"
                        >
                          <strong className="text-ink">
                            {requirementLabel(
                              requirementById.get(relation.leftRequirementId),
                            )}
                          </strong>{" "}
                          and{" "}
                          <strong className="text-ink">
                            {requirementLabel(
                              requirementById.get(relation.rightRequirementId),
                            )}
                          </strong>{" "}
                          must have{" "}
                          {relation.operator === "same"
                            ? "the same "
                            : "different "}
                          {scopeFieldLabel(relation.field)}.
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                      Dangerous shortcut
                    </p>
                    <p className="mt-2 text-sm leading-6 text-amber-950">
                      {overlap.dangerousShortcut}
                    </p>
                  </div>
                  <h4 className="mt-5 font-semibold text-ink">
                    Questions that separate the claims
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                    {overlap.questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                  <h4 className="mt-5 font-semibold text-ink">
                    Pause and review when
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                    {overlap.reviewTriggers.map((trigger) => (
                      <li key={trigger} data-testid="overlap-review-trigger">
                        {trigger}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Dimensions:{" "}
                    {overlap.dimensionIds
                      .map((id) => dimensionById.get(id)?.label ?? id)
                      .join(" · ")}
                  </p>
                  <div className="mt-4">
                    <SourceLinks ids={overlap.sourceIds} />
                  </div>
                </article>
            );
          })}
        </div>
      </section>

      <section
        id="evolution"
        className="mt-20 scroll-mt-6"
        aria-labelledby="evolution-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Category lineage
        </p>
        <h2
          id="evolution-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          The categories arrived at different times for different reasons.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          This is not a story of one entity taxonomy becoming more precise. Private
          law, charging rules, administrative groupings and reporting standards added
          separate layers.
        </p>

        <ol className="relative mt-8 border-l-2 border-line pl-7 sm:pl-10">
          {identity.milestones.map((milestone) => (
            <li key={milestone.id} data-testid="milestone" className="relative pb-9 last:pb-0">
              <span
                className="absolute -left-[2.15rem] top-1 h-4 w-4 rounded-full border-4 border-white bg-accent sm:-left-[2.9rem]"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                {formatCorpusDate(milestone.date)} · {humanise(milestone.eventType)}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-ink">{milestone.title}</h3>
              <p className="mt-2 max-w-4xl text-base leading-7 text-ink-soft">
                {milestone.change}
              </p>
              <p className="mt-2 max-w-4xl rounded-2xl bg-paper px-4 py-3 text-sm leading-6 text-ink">
                <strong>What stayed separate:</strong> {milestone.continuity}
              </p>
              <div className="mt-3">
                <SourceLinks ids={milestone.sourceIds} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="examples"
        className="mt-20 scroll-mt-6"
        aria-labelledby="examples-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Worked examples · no real people
        </p>
        <h2
          id="examples-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          {identity.exampleProfiles.length} synthetic profiles show the vector in
          motion.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Every assertion names its subject, jurisdiction, tax or regime, activity,
          rule set, status, effective-date basis and sources. Open a profile to see
          what is supported and what the framework deliberately leaves undecided.
        </p>

        <div className="mt-8 space-y-5">
          {identity.exampleProfiles.map((example) => {
            const subjectById = new Map(
              example.subjects.map((subject) => [subject.id, subject]),
            );

            return (
              <details
                key={example.id}
                data-testid="example-profile"
                className="group rounded-[2rem] border border-line bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 marker:hidden sm:p-8">
                  <span className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    Synthetic · as at {formatCorpusDate(example.asOf)}
                  </span>
                  <span className="mt-2 block text-xl font-semibold text-ink sm:text-2xl">
                    {example.label}
                  </span>
                  <span className="mt-2 block max-w-4xl text-base leading-7 text-ink-soft">
                    {example.summary}
                  </span>
                  </span>
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-lg text-accent transition group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>

                <div className="border-t border-line p-6 sm:p-8">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <article className="rounded-2xl border border-line p-4">
                      <h4 className="font-semibold text-ink">
                        Subjects in this example
                      </h4>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-ink-soft">
                        {example.subjects.map((subject) => (
                          <li key={subject.id} data-testid="example-subject">
                            <strong className="text-ink">{subject.label}</strong> ·{" "}
                            {humanise(subject.kind)}
                          </li>
                        ))}
                      </ul>
                    </article>
                    <article className="rounded-2xl border border-line p-4">
                      <h4 className="font-semibold text-ink">
                        Legal and tax archetypes
                      </h4>
                      <ul className="mt-2 space-y-2 text-sm leading-6 text-ink-soft">
                        {example.archetypeIds.map((archetypeId) => (
                          <li key={archetypeId}>
                            {archetypeById.get(archetypeId)?.label ?? archetypeId}
                          </li>
                        ))}
                      </ul>
                    </article>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {example.assertions.map((assertion, index) => {
                      const dimension = dimensionById.get(assertion.dimensionId);
                      const classification = classificationById.get(
                        assertion.classificationId,
                      );
                      const subject = subjectById.get(assertion.scope.subjectRef);
                      return (
                        <article
                          key={`${assertion.dimensionId}-${assertion.classificationId}-${assertion.scope.subjectRef}-${assertion.scope.taxOrRegime}-${assertion.scope.activityOrContext}-${index}`}
                          data-testid="assertion-card"
                          className="rounded-2xl bg-paper p-4"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                            {dimension?.label ?? assertion.dimensionId} ·{" "}
                            {humanise(assertion.status)}
                          </p>
                          <h4 className="mt-1 font-semibold text-ink">
                            {classification?.label ?? assertion.classificationId}
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-ink-soft">
                            {assertion.basis}
                          </p>

                          <div className="mt-3 rounded-xl border border-line bg-white p-3">
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-ink">
                              Assertion scope
                            </h5>
                            <dl className="mt-2 grid gap-x-3 gap-y-1 text-xs leading-5 text-ink-soft sm:grid-cols-[max-content_1fr]">
                              <dt className="font-semibold text-ink">Subject</dt>
                              <dd>
                                {subject?.label ?? assertion.scope.subjectRef}
                              </dd>
                              <dt className="font-semibold text-ink">
                                Jurisdiction
                              </dt>
                              <dd>{assertion.scope.jurisdiction}</dd>
                              <dt className="font-semibold text-ink">
                                Tax or regime
                              </dt>
                              <dd>{assertion.scope.taxOrRegime}</dd>
                              <dt className="font-semibold text-ink">
                                Activity or context
                              </dt>
                              <dd>{assertion.scope.activityOrContext}</dd>
                              <dt className="font-semibold text-ink">Rule set</dt>
                              <dd>{assertion.scope.ruleset}</dd>
                            </dl>
                          </div>

                          <p className="mt-3 text-xs leading-5 text-ink-soft">
                            <strong className="text-ink">
                              Effective-date basis:
                            </strong>{" "}
                            {humanise(assertion.effectiveDateBasis)}.{" "}
                            {effectiveDateLabel(
                              assertion,
                              identity.meta.reviewedOn,
                            )}
                          </p>
                          <div className="mt-2">
                            <SourceLinks ids={assertion.sourceIds} />
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <div>
                      <h4 className="font-semibold text-ink">Needs review</h4>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                        {example.reviewTriggers.map((trigger) => (
                          <li key={trigger}>{trigger}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-ink">Not determined</h4>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                        {example.notDetermined.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <a
                    href={`https://api.taxsorted.io/v1/tax-identity/uk/examples/${example.id}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-5 inline-flex min-h-11 items-center font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
                  >
                    Read this example as JSON{" "}
                    <span aria-hidden="true">&nbsp;↗</span>
                  </a>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <section
        id="method"
        className="mt-20 scroll-mt-6"
        aria-labelledby="method-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Method and boundaries
        </p>
        <h2
          id="method-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Preserve scope, uncertainty and history.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          {identity.meta.portability}
        </p>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <article className="rounded-3xl border border-line bg-white p-6">
            <h3 className="text-xl font-semibold text-ink">Editorial rules</h3>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-ink-soft">
              {identity.meta.editorialRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </article>
          <article className="rounded-3xl border border-line bg-ink p-6 text-white">
            <h3 className="text-xl font-semibold">Hard boundaries</h3>
            <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-white/80">
              {identity.meta.boundaries.map((boundary) => (
                <li key={boundary}>{boundary}</li>
              ))}
            </ul>
          </article>
        </div>

        <h3 className="mt-10 text-2xl font-semibold text-ink">
          Deliberate gaps are part of the answer
        </h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {identity.gaps.map((gap) => (
            <article key={gap.id} className="rounded-3xl border border-line bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {humanise(gap.status)}
              </p>
              <h4 className="mt-2 text-lg font-semibold text-ink">{gap.title}</h4>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{gap.why}</p>
              <p className="mt-3 text-sm leading-6 text-ink">
                <strong>Safe next step:</strong> {gap.safeNextStep}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="sources"
        className="mt-20 scroll-mt-6"
        aria-labelledby="sources-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Source register
        </p>
        <h2
          id="sources-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          {identity.sources.length} primary and official sources.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          A source supports only the claims named in the corpus. Its limitations stay
          attached, and guidance is not silently promoted into legislation.
        </p>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {identity.sources.map((source) => (
            <article
              key={source.id}
              data-testid="source-card"
              className="rounded-2xl border border-line bg-white p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {humanise(source.authorityLevel)} · {source.publisher}
              </p>
              <h3 className="mt-2 font-semibold text-ink">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="underline decoration-line underline-offset-4 hover:text-accent"
                >
                  {source.title} <span aria-hidden="true">↗</span>
                </a>
              </h3>
              <p className="mt-2 text-xs leading-5 text-ink-soft">
                {source.jurisdiction} · retrieved{" "}
                {formatCorpusDate(source.retrievedAt)}
              </p>
              <h4 className="mt-4 text-sm font-semibold text-ink">Supports</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                {source.supports.map((claim) => (
                  <li key={claim} data-testid="source-support">
                    {claim}
                  </li>
                ))}
              </ul>
              <h4 className="mt-4 text-sm font-semibold text-ink">Limitations</h4>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-soft">
                {source.limitations.map((limitation) => (
                  <li key={limitation} data-testid="source-limitation">
                    {limitation}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        id="developers"
        className="mt-20 scroll-mt-6 rounded-[2rem] border border-line bg-paper p-6 sm:p-8"
        aria-labelledby="developers-title"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Public, read-only API
        </p>
        <h2
          id="developers-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-ink"
        >
          Carry the dimensions and boundaries into software.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          The API publishes this versioned corpus, its graph, schema and synthetic
          examples without an account. It accepts no taxpayer facts and produces no
          filing position.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Framework index", "https://api.taxsorted.io/v1/tax-identity/uk"],
            ["Full identity graph", "https://api.taxsorted.io/v1/tax-identity/uk/graph"],
            ["Synthetic examples", "https://api.taxsorted.io/v1/tax-identity/uk/examples"],
            ["Source register", "https://api.taxsorted.io/v1/tax-identity/uk/sources"],
            ["JSON Schema", "https://api.taxsorted.io/v1/tax-identity/uk/schema"],
            ["OpenAPI slice", "https://api.taxsorted.io/openapi/tax-identity-uk.json"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-11 items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 font-semibold text-accent hover:border-accent"
            >
              {label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-line bg-white p-4 text-sm leading-6 text-ink-soft">
          <p>
            Corpus version {identity.meta.version} · reviewed{" "}
            {formatCorpusDate(identity.meta.reviewedOn)} ·{" "}
            <a
              href={identity.meta.contentLicence.url}
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-accent underline underline-offset-4"
            >
              {identity.meta.contentLicence.name}
            </a>
          </p>
          <p className="mt-2">
            <strong className="text-ink">Licence scope:</strong>{" "}
            {identity.meta.contentLicence.scope}
          </p>
        </div>
      </section>
    </div>
  );
}
