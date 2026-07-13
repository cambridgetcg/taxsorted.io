import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import taxIndustryJson from "../../../../../research/uk/tax-industry/data/uk-tax-industry.json";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "How the UK tax industry works — TaxSorted",
  description:
    "Who may legally do tax work, what the exams and licences cost, and what the work pays — every rule, barrier and pay figure linked to its public source.",
};

type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
};

type Institution = {
  id: string;
  name: string;
  kind: string;
  legalForm: string;
  originDate?: string | null;
  originPeriod?: string | null;
  origin: string;
  whyItExists: string;
  governance: string;
  fundingModel: string;
  powerAndLimits: string[];
  website: string;
  sourceIds: string[];
  transparencyNotes: string[];
};

type Role = {
  id: string;
  name: string;
  category: string;
  work: string[];
  legallyReserved: string[];
  generallyUnreserved: string[];
  requiredGateIds: string[];
  conditionalGateIds: string[];
  commonQualificationIds: string[];
  protectedTitles: string[];
  employeeEntry: string;
  independentEntry: string;
  riskBoundary: string[];
  compensationIds: string[];
  sourceIds: string[];
};

type Assessment = {
  name: string;
  format: string;
  choice?: string;
  durationMinutes?: number;
};

type Qualification = {
  id: string;
  name: string;
  status: string;
  designation?: string | null;
  entryRequirements: string[];
  assessments: Assessment[];
  experienceRequirement: string;
  typicalDuration: string;
  costSummary: string;
  exemptions: string;
  membershipAndMaintenance: string;
  studyResourceIds: string[];
  barrierNotes: string[];
  leastFrictionRoute: string;
  notEquivalentTo: string[];
  sourceIds: string[];
};

type FeeItem = {
  label: string;
  amountGbp: number;
  cadence: string;
  note: string;
};

type Gate = {
  id: string;
  name: string;
  type: string;
  legalStatus: "mandatory" | "conditional" | "voluntary-market-gate";
  trigger: string;
  steps: string[];
  requirements: string[];
  feeItems: FeeItem[];
  refusalOrBreach: string;
  notEquivalentTo: string[];
  leastFriction: string;
  sourceIds: string[];
};

type PathwayStep = {
  order: number;
  action: string;
  gateId?: string;
  qualificationId?: string;
  mandatory: boolean;
  why: string;
  personalCost: string;
  time: string;
};

type Pathway = {
  id: string;
  name: string;
  outcome: string;
  startingPoint: string;
  legalMinimum: string[];
  marketCredibility: string[];
  steps: PathwayStep[];
  estimatedTime: string;
  directCost: string;
  lowestFriction: string;
  tradeoffs: string[];
  stopConditions: string[];
  sourceIds: string[];
};

type StudyResource = {
  id: string;
  name: string;
  format: string;
  access: string;
  officialStatus: string;
  qualificationIds: string[];
  costAndAccess: string;
  limitations: string[];
  url: string;
};

type Compensation = {
  id: string;
  label: string;
  measure: string;
  amountGbp?: number;
  rangeGbp?: { low: number; high: number };
  period: string;
  geography: string;
  referencePeriod: string;
  sourceMethod: string;
  comparabilityWarning: string;
  sourceIds: string[];
};

type Barrier = {
  id: string;
  name: string;
  type: string;
  mechanism: string;
  statedRationale: string;
  burden: string[];
  whoBenefits: string[];
  whoBearsIt: string[];
  lawfulLowFriction: string;
  countervailingSafeguard: string;
  sourceIds: string[];
};

type IndustryCorpus = {
  meta: {
    title: string;
    version: string;
    reviewedOn: string;
    coverage: string[];
    editorialRules: string[];
    warning: string;
  };
  sources: Source[];
  institutions: Institution[];
  roles: Role[];
  qualifications: Qualification[];
  gates: Gate[];
  pathways: Pathway[];
  studyResources: StudyResource[];
  compensation: Compensation[];
  barriers: Barrier[];
};

const industry = taxIndustryJson as unknown as IndustryCorpus;
const sourceById = new Map(industry.sources.map((source) => [source.id, source]));
const gateById = new Map(industry.gates.map((gate) => [gate.id, gate]));
const qualificationById = new Map(
  industry.qualifications.map((qualification) => [qualification.id, qualification]),
);
const compensationById = new Map(
  industry.compensation.map((compensation) => [compensation.id, compensation]),
);

const pounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const reviewedDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${industry.meta.reviewedOn}T00:00:00Z`));

const gateStatusCopy = {
  mandatory: {
    label: "Mandatory",
    description: "The gate is compulsory when its stated activity is performed.",
    tone: "border-rose-200 bg-rose-50 text-rose-900",
  },
  conditional: {
    label: "Conditional",
    description: "The gate activates only when the product, service, data or contract crosses its trigger.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
  },
  "voluntary-market-gate": {
    label: "Market or member rule",
    description: "Not a universal state licence, but real when claiming a status, following a body route or seeking a job.",
    tone: "border-sky-200 bg-sky-50 text-sky-900",
  },
} satisfies Record<Gate["legalStatus"], { label: string; description: string; tone: string }>;

const qualificationStatus: Record<string, string> = {
  "voluntary-designation": "Voluntary professional designation",
  "professional-membership": "Professional membership route",
  "statutory-precondition": "Statutory route for protected or reserved work",
};

const measureLabels: Record<string, string> = {
  "advertised-apprenticeship-wage": "One advertised wage",
  "salary-range": "Employment pay",
  "tax-service-revenue": "Firm service-line revenue",
  "average-distributable-profit-per-partner": "Owner profit allocation",
};

function humanise(value: string) {
  return value.replaceAll("-", " ");
}

function SourceLinks({ ids, limit = 3 }: { ids: string[]; limit?: number }) {
  const sources = ids
    .map((id) => sourceById.get(id))
    .filter((source): source is Source => Boolean(source))
    .slice(0, limit);

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

function gateAuthority(gate: Gate) {
  if (["professional-membership", "practising-certificate"].includes(gate.type)) {
    return "Professional-body rule";
  }
  if (gate.type === "employer-selection") return "Employer or training-route condition";
  if (gate.type === "platform-access") return "Platform access condition";
  if (gate.type === "insurance") return "Body, contract or risk condition";
  if (gate.legalStatus === "mandatory") return "Law or state authorisation";
  return "Conditional legal or administrative duty";
}

function compensationValue(item: Compensation) {
  if (item.rangeGbp) {
    return `${pounds.format(item.rangeGbp.low)}–${pounds.format(item.rangeGbp.high)}`;
  }
  return item.amountGbp === undefined ? "Not published" : pounds.format(item.amountGbp);
}

function originLabel(institution: Institution) {
  const labels: string[] = [];
  if (institution.originDate) {
    labels.push(
      new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${institution.originDate}T00:00:00Z`)),
    );
  }
  if (institution.originPeriod) labels.push(institution.originPeriod);
  return labels.join(" · ") || "Long institutional lineage";
}

/** A collapsed catalogue section: plain h2 summary on top, the full detail inside. */
function DetailsSection({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      className="group mt-6 scroll-mt-6 rounded-[2rem] border border-line bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 marker:hidden sm:p-8">
        <span>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-4xl text-base leading-7 text-ink-soft">{hint}</p>
        </span>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-lg text-accent transition group-open:rotate-45"
          aria-hidden="true"
        >
          +
        </span>
      </summary>
      <div className="border-t border-line p-6 sm:p-8">{children}</div>
    </details>
  );
}

const ordinaryAdviser = industry.roles.find((role) => role.id === "role-independent-tax-adviser")!;
const bodyMembershipGate = industry.gates.find((gate) => gate.id === "gate-ciot-membership")!;
const employerGate = industry.gates.find((gate) => gate.id === "gate-employer-selection")!;
const statutoryGate = industry.gates.find((gate) => gate.id === "gate-insolvency-authorisation")!;

export default function TaxIndustryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs
        items={[{ href: "/uk/money", label: "Follow the money" }]}
        current="The tax industry"
        className="mb-6"
      />

      <header className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-sm sm:p-10 lg:p-12">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -right-5 -top-8 h-44 w-44 rounded-full bg-accent/50" aria-hidden="true" />
        <div className="relative max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
            UK tax industry · reviewed {reviewedDate}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            How people get into tax work — and what it really costs.
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-white/80">
            For anyone weighing a tax career, or wondering who may legally do tax work.
            Exams, licences, employer filters and pay — each shown separately, with its
            source.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#routes"
              className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-base font-semibold text-ink hover:bg-accent-soft"
            >
              See the routes in
            </a>
          </div>
        </div>
      </header>

      <ShortVersion className="mt-6">
        <li>
          Ordinary tax advice is generally not a reserved profession — no specific qualification
          is required just to give it (other duties, like money-laundering supervision, still
          apply to paid advisers).
        </li>
        <li>A few activities — like insolvency work — are reserved and need state authorisation.</li>
        <li>
          Exams, professional memberships and employer hiring filters are three separate
          hurdles with separate costs.
        </li>
        <li>Open each section for the full catalogue. Every fact links to its public source.</li>
      </ShortVersion>

      <section className="mt-7" aria-labelledby="core-truth-title">
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <div className="grid gap-px bg-line lg:grid-cols-[1.4fr_1fr_1fr]">
            <article className="bg-accent-soft p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Core truth</p>
              <h2 id="core-truth-title" className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Ordinary tax advice is generally not a reserved profession.
              </h2>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                {ordinaryAdviser.generallyUnreserved.join(" ")}
              </p>
              <div className="mt-5">
                <SourceLinks ids={ordinaryAdviser.sourceIds} />
              </div>
            </article>
            <article className="bg-white p-6 sm:p-8">
              <p className="text-3xl font-semibold tabular-nums text-ink">{industry.gates.length}</p>
              <h3 className="mt-2 font-semibold text-ink">Different access gates</h3>
              <p className="mt-2 text-base leading-7 text-ink-soft">
                {industry.gates.filter((gate) => gate.legalStatus === "mandatory").length} mandatory, {" "}
                {industry.gates.filter((gate) => gate.legalStatus === "conditional").length} conditional and {" "}
                {industry.gates.filter((gate) => gate.legalStatus === "voluntary-market-gate").length} market or member rules.
              </p>
            </article>
            <article className="bg-white p-6 sm:p-8">
              <p className="text-3xl font-semibold tabular-nums text-ink">{industry.sources.length}</p>
              <h3 className="mt-2 font-semibold text-ink">Reviewed public sources</h3>
              <p className="mt-2 text-base leading-7 text-ink-soft">
                The page is rendered from corpus version {industry.meta.version}; facts are linked back to their publishers.
              </p>
            </article>
          </div>
          <p className="border-t border-line px-6 py-4 text-sm leading-6 text-ink-soft sm:px-8">
            {industry.meta.warning}
          </p>
        </div>
      </section>

      <nav className="mt-6 rounded-3xl border border-line bg-white p-4" aria-label="On this page">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">On this page</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["#rules", "Which rules are law?"],
            ["#roles", "The jobs"],
            ["#qualifications", "Exams and costs"],
            ["#routes", "Routes in"],
            ["#gates", "All the gates"],
            ["#barriers", "Barriers"],
            ["#economics", "What it pays"],
            ["#origins", "Who runs the industry"],
            ["#developers", "For developers"],
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

      <section id="rules" className="mt-16 scroll-mt-6" aria-labelledby="rules-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Do not collapse the rules</p>
        <h2 id="rules-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Three gates can feel identical. They are not.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          Each one can stop a person in practice, but only the first is state-backed permission.
          The second governs a designation or membership. The third is how an employer allocates a paid seat.
        </p>
        <div className="mt-7 grid gap-5 lg:grid-cols-3">
          {[
            {
              eyebrow: "Law or state authorisation",
              gate: statutoryGate,
              truth: "Required for the reserved office or act. Performing it without authority can itself be unlawful.",
            },
            {
              eyebrow: "Professional-body rule",
              gate: bodyMembershipGate,
              truth: "Required to use the body's designation and remain a member. It is not a universal licence for ordinary tax advice.",
            },
            {
              eyebrow: "Employer convention",
              gate: employerGate,
              truth: "A firm may demand grades, tests or a degree beyond the law or examining body's entry rule.",
            },
          ].map(({ eyebrow, gate, truth }) => (
            <article key={gate.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm" data-testid="rule-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{eyebrow}</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{gate.name}</h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">{truth}</p>
              <p className="mt-4 rounded-2xl bg-paper p-4 text-base leading-7 text-ink">
                <strong>Trigger:</strong> {gate.trigger}
              </p>
              <div className="mt-5">
                <SourceLinks ids={gate.sourceIds} limit={2} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-16">
        <DetailsSection
          id="roles"
          title={`The ${industry.roles.length} jobs in tax — and what each may legally do`}
          hint="A job title does not tell you its legal boundary. Open for every role's open work, reserved limits and pay reference."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {industry.roles.map((role) => {
              const requiredGates = role.requiredGateIds.map((id) => gateById.get(id)).filter(Boolean) as Gate[];
              const conditionalGates = role.conditionalGateIds.map((id) => gateById.get(id)).filter(Boolean) as Gate[];
              const commonQualifications = role.commonQualificationIds
                .map((id) => qualificationById.get(id))
                .filter(Boolean) as Qualification[];
              const compensation = role.compensationIds
                .map((id) => compensationById.get(id))
                .filter(Boolean) as Compensation[];

              return (
                <article key={role.id} className="flex flex-col rounded-3xl border border-line bg-white p-6 shadow-sm" data-testid="role-card">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">{humanise(role.category)}</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">{role.name}</h3>

                  <div className="mt-5 space-y-4 text-base leading-7">
                    <div>
                      <p className="font-semibold text-ink">Usually open</p>
                      <p className="mt-1 text-ink-soft">
                        {role.generallyUnreserved[0] ?? "No generally unreserved activity recorded for this role."}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-ink">Reserved or protected boundary</p>
                      <p className="mt-1 text-ink-soft">
                        {role.legallyReserved[0] ?? role.protectedTitles[0] ?? "No activity is reserved to this title in the reviewed corpus."}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-5 space-y-3 rounded-2xl bg-paper p-4 text-sm leading-6">
                    <div>
                      <dt className="font-semibold text-ink">Required gate</dt>
                      <dd className="mt-1 text-ink-soft">
                        {requiredGates.map((gate) => gate.name).join(" · ") || "None universal for this role"}
                      </dd>
                    </div>
                    {conditionalGates.length ? (
                      <div>
                        <dt className="font-semibold text-ink">Only when the activity triggers it</dt>
                        <dd className="mt-1 text-ink-soft">
                          {conditionalGates.map((gate) => gate.name).join(" · ")}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="font-semibold text-ink">Common qualification—not automatically law</dt>
                      <dd className="mt-1 text-ink-soft">
                        {commonQualifications.map((qualification) => qualification.designation ?? qualification.name).join(" · ") || "None specified"}
                      </dd>
                    </div>
                    {compensation[0] ? (
                      <div>
                        <dt className="font-semibold text-ink">Published pay reference</dt>
                        <dd className="mt-1 text-ink-soft">{compensationValue(compensation[0])} / {compensation[0].period}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="mt-auto pt-5">
                    <SourceLinks ids={role.sourceIds} limit={2} />
                  </div>
                </article>
              );
            })}
          </div>
        </DetailsSection>

        <DetailsSection
          id="qualifications"
          title={`The ${industry.qualifications.length} qualifications: entry, exams, cost and time`}
          hint="Passing exams is only one part of qualifying. Open each route for entry requirements, direct cost, experience sign-off, study material and what the credential does not authorise."
        >
          <div className="space-y-4">
            {industry.qualifications.map((qualification) => {
              const resources = qualification.studyResourceIds
                .map((id) => industry.studyResources.find((resource) => resource.id === id))
                .filter(Boolean) as StudyResource[];

              return (
                <details key={qualification.id} className="group/qual rounded-3xl border border-line bg-white shadow-sm" data-testid="qualification-card">
                  <summary className="cursor-pointer list-none p-5 marker:hidden sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                          {qualificationStatus[qualification.status] ?? humanise(qualification.status)}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-ink">{qualification.name}</h3>
                        <p className="mt-2 text-base leading-7 text-ink-soft">
                          {qualification.assessments.length} assessment group{qualification.assessments.length === 1 ? "" : "s"} · {qualification.typicalDuration}
                        </p>
                      </div>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-lg text-accent group-open/qual:rotate-45" aria-hidden="true">+</span>
                    </div>
                  </summary>

                  <div className="grid gap-6 border-t border-line p-5 sm:p-6 lg:grid-cols-2">
                    <div>
                      <h4 className="font-semibold text-ink">Entry and assessments</h4>
                      <ul className="mt-3 space-y-2 text-base leading-7 text-ink-soft">
                        {qualification.entryRequirements.map((requirement) => (
                          <li key={requirement} className="flex gap-2"><span className="text-accent" aria-hidden="true">•</span><span>{requirement}</span></li>
                        ))}
                      </ul>
                      <ol className="mt-5 grid gap-2 sm:grid-cols-2">
                        {qualification.assessments.map((assessment, index) => (
                          <li key={`${assessment.name}-${index}`} className="rounded-2xl bg-paper p-3 text-sm leading-6 text-ink-soft">
                            <strong className="block text-ink">{assessment.name}</strong>
                            <span>{assessment.format}</span>
                            {assessment.choice ? <span className="mt-1 block">{assessment.choice}</span> : null}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="space-y-4 text-base leading-7">
                      <div className="rounded-2xl bg-accent-soft p-4">
                        <h4 className="font-semibold text-ink">Cost shown honestly</h4>
                        <p className="mt-2 text-ink-soft">{qualification.costSummary}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-ink">Experience and sign-off</h4>
                        <p className="mt-2 text-ink-soft">{qualification.experienceRequirement}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-ink">Lowest-friction lawful route</h4>
                        <p className="mt-2 text-ink-soft">{qualification.leastFrictionRoute}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-ink">It is not the same as</h4>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
                          {qualification.notEquivalentTo.map((boundary) => <li key={boundary}>{boundary}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <h4 className="font-semibold text-ink">Study material</h4>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {resources.map((resource) => (
                          <a
                            key={resource.id}
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="rounded-2xl border border-line p-4 hover:border-accent hover:bg-accent-soft"
                          >
                            <span className="text-xs font-semibold uppercase tracking-wide text-accent">{resource.access} · {humanise(resource.officialStatus)}</span>
                            <strong className="mt-1 block text-base text-ink">{resource.name} <span aria-hidden="true">↗</span></strong>
                            <span className="mt-2 block text-sm leading-6 text-ink-soft">{resource.costAndAccess}</span>
                          </a>
                        ))}
                      </div>
                      <div className="mt-5"><SourceLinks ids={qualification.sourceIds} /></div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </DetailsSection>

        <DetailsSection
          id="routes"
          title={`${industry.pathways.length} step-by-step routes in`}
          hint="From starting point to stop condition — each route with its direct cost and its simplest lawful path."
        >
          <p className="max-w-4xl text-base leading-7 text-ink-soft">
            “Lowest friction” means the simplest lawful route for the actual work. It never means
            hiding a personalised service, protected title or reserved act behind different wording.
          </p>
          <div className="mt-7 grid gap-5 xl:grid-cols-2">
            {industry.pathways.map((pathway) => (
              <article key={pathway.id} className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-7" data-testid="pathway-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">{pathway.estimatedTime}</p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{pathway.name}</h3>
                <p className="mt-3 text-base leading-7 text-ink-soft">{pathway.outcome}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-paper p-4 text-base leading-7">
                    <p className="font-semibold text-ink">Direct cost</p>
                    <p className="mt-2 text-ink-soft">{pathway.directCost}</p>
                  </div>
                  <div className="rounded-2xl bg-accent-soft p-4 text-base leading-7">
                    <p className="font-semibold text-ink">Lowest friction</p>
                    <p className="mt-2 text-ink-soft">{pathway.lowestFriction}</p>
                  </div>
                </div>

                <ol className="mt-6 space-y-3">
                  {pathway.steps.map((step) => (
                    <li key={step.order} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white" aria-hidden="true">{step.order}</span>
                      <div>
                        <p className="text-base font-semibold leading-7 text-ink">
                          {step.action}{" "}
                          <span className="text-xs font-medium uppercase tracking-wide text-accent">
                            {step.mandatory ? "route step" : "optional or conditional"}
                          </span>
                        </p>
                        <p className="mt-1 text-base text-ink-soft">{step.why}</p>
                        <p className="mt-1 text-sm text-accent">{step.personalCost} · {step.time}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                {pathway.stopConditions.length ? (
                  <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-base leading-7 text-rose-950">
                    <p className="font-semibold">Stop and reassess when</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                      {pathway.stopConditions.map((condition) => <li key={condition}>{condition}</li>)}
                    </ul>
                  </div>
                ) : null}
                <div className="mt-5"><SourceLinks ids={pathway.sourceIds} limit={2} /></div>
              </article>
            ))}
          </div>
        </DetailsSection>

        <DetailsSection
          id="gates"
          title="Every gate, grouped by what kind of rule it is"
          hint="Mandatory law, conditional duties, and market or member rules — with steps, fees and what happens on refusal."
        >
          <div className="space-y-5">
            {(["mandatory", "conditional", "voluntary-market-gate"] as const).map((status) => {
              const copy = gateStatusCopy[status];
              const gates = industry.gates.filter((gate) => gate.legalStatus === status);
              return (
                <div key={status} className="rounded-[2rem] border border-line bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold text-ink">{copy.label}</h3>
                      <p className="mt-1 max-w-3xl text-base leading-7 text-ink-soft">{copy.description}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${copy.tone}`}>{gates.length} gates</span>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {gates.map((gate) => (
                      <details key={gate.id} className="rounded-2xl border border-line p-4" data-testid="gate-card">
                        <summary className="cursor-pointer list-none marker:hidden">
                          <p className="text-xs font-semibold uppercase tracking-wide text-accent">{gateAuthority(gate)}</p>
                          <h4 className="mt-1 font-semibold text-ink">{gate.name}</h4>
                          <p className="mt-2 text-base text-ink-soft">{gate.trigger}</p>
                        </summary>
                        <div className="mt-4 border-t border-line pt-4 text-sm leading-6 text-ink-soft">
                          <ol className="space-y-2">
                            {gate.steps.map((step, index) => (
                              <li key={step} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2">
                                <span className="font-semibold text-accent" aria-hidden="true">{index + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                          <p className="mt-4"><strong className="text-ink">Lowest friction:</strong> {gate.leastFriction}</p>
                          <p className="mt-3"><strong className="text-ink">If refused or breached:</strong> {gate.refusalOrBreach}</p>
                          {gate.feeItems.length ? (
                            <ul className="mt-3 space-y-1">
                              {gate.feeItems.map((fee) => <li key={`${fee.label}-${fee.amountGbp}`}>{fee.label}: {pounds.format(fee.amountGbp)} ({humanise(fee.cadence)})</li>)}
                            </ul>
                          ) : null}
                          <div className="mt-4"><SourceLinks ids={gate.sourceIds} limit={2} /></div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DetailsSection>

        <DetailsSection
          id="barriers"
          title="How barriers work — who they protect and who pays"
          hint="Each barrier names its mechanism, its stated reason, who carries the burden and a lawful route around needless friction."
        >
          <p className="max-w-4xl text-base leading-7 text-ink-soft">
            Structure alone is not proof of misconduct or capture.
          </p>
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {industry.barriers.map((barrier) => (
              <article key={barrier.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm" data-testid="barrier-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">{humanise(barrier.type)}</p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{barrier.name}</h3>
                <p className="mt-3 text-base leading-7 text-ink-soft">{barrier.mechanism}</p>
                <dl className="mt-5 space-y-4 text-base leading-7">
                  <div>
                    <dt className="font-semibold text-ink">Why its maker says it exists</dt>
                    <dd className="mt-1 text-ink-soft">{barrier.statedRationale}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Who bears it</dt>
                    <dd className="mt-1 text-ink-soft">{barrier.whoBearsIt.join(" ")}</dd>
                  </div>
                  <div className="rounded-2xl bg-accent-soft p-4">
                    <dt className="font-semibold text-ink">Lawful low-friction move</dt>
                    <dd className="mt-1 text-ink-soft">{barrier.lawfulLowFriction}</dd>
                  </div>
                </dl>
                <div className="mt-5"><SourceLinks ids={barrier.sourceIds} limit={2} /></div>
              </article>
            ))}
          </div>
        </DetailsSection>

        <DetailsSection
          id="economics"
          title="What the work pays — wages, firm revenue and owner profit"
          hint="Three different money measures. None of them proves what a qualification causes someone to earn."
        >
          <p className="max-w-4xl text-base font-semibold leading-7 text-ink">
            Salary ≠ revenue ≠ owner profit.
          </p>
          <p className="mt-2 max-w-4xl text-base leading-7 text-ink-soft">
            A wage pays an employee. Revenue is customer income before costs. Distributable partner profit is an owner allocation.
          </p>
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {industry.compensation.map((item) => (
              <article key={item.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm" data-testid="compensation-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">{measureLabels[item.measure] ?? humanise(item.measure)}</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums text-ink">{compensationValue(item)}</p>
                <h3 className="mt-2 font-semibold text-ink">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">per {humanise(item.period)} · {item.geography} · {item.referencePeriod}</p>
                <p className="mt-4 rounded-2xl bg-paper p-4 text-sm leading-6 text-ink-soft">
                  <strong className="text-ink">Do not overread it:</strong> {item.comparabilityWarning}
                </p>
                <div className="mt-5"><SourceLinks ids={item.sourceIds} limit={2} /></div>
              </article>
            ))}
          </div>
        </DetailsSection>

        <DetailsSection
          id="origins"
          title="The institutions behind the industry"
          hint="State departments, chartered bodies, courts, trainers, platforms and partnerships hold different kinds of power. Their legal forms explain more than their logos do."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            {industry.institutions.map((institution) => (
              <article key={institution.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm" data-testid="institution-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent">{humanise(institution.kind)}</p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">{institution.name}</h3>
                  </div>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink-soft">{originLabel(institution)}</span>
                </div>
                <p className="mt-4 text-base leading-7 text-ink-soft">{institution.origin}</p>
                <dl className="mt-5 grid gap-4 text-base leading-7 sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-ink">Legal establishment</dt>
                    <dd className="mt-1 text-ink-soft">{institution.legalForm}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Funding</dt>
                    <dd className="mt-1 text-ink-soft">{institution.fundingModel}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-ink">Power and limit</dt>
                    <dd className="mt-1 text-ink-soft">{institution.powerAndLimits.join(" ")}</dd>
                  </div>
                </dl>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-semibold">
                  <a href={institution.website} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-accent underline decoration-line underline-offset-4 hover:text-accent-deep">
                    Institution website <span aria-hidden="true">&nbsp;↗</span>
                  </a>
                  <SourceLinks ids={institution.sourceIds} limit={2} />
                </div>
              </article>
            ))}
          </div>
        </DetailsSection>

        <DetailsSection
          id="developers"
          title="For developers"
          hint="The versioned corpus behind this page: source ledger, known gaps, exports and the data dictionary."
        >
          <h3 className="text-xl font-semibold text-ink">
            The page does not keep a second hand-written industry list.
          </h3>
          <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
            It renders the same versioned JSON that feeds the API. Every substantive record carries source identifiers;
            each source says what it supports and what it does not prove. Review date: {reviewedDate}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="https://api.taxsorted.io/v1/tax-industry/uk" target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 py-2 text-base font-semibold text-white hover:bg-accent-deep">
              Open the source API <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a href="https://api.taxsorted.io/v1/tax-industry/uk/sources" target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 py-2 text-base font-semibold text-accent hover:bg-paper">
              Browse the source ledger <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a href="https://api.taxsorted.io/v1/tax-industry/uk/gaps" target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 py-2 text-base font-semibold text-accent hover:bg-paper">
              See known gaps <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a href="https://api.taxsorted.io/v1/tax-industry/uk/exports" target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 py-2 text-base font-semibold text-accent hover:bg-paper">
              Download complete datasets <span aria-hidden="true">&nbsp;↗</span>
            </a>
            <a href="https://api.taxsorted.io/v1/tax-industry/uk/dictionary" target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 py-2 text-base font-semibold text-accent hover:bg-paper">
              Read the data dictionary <span aria-hidden="true">&nbsp;↗</span>
            </a>
          </div>
        </DetailsSection>
      </div>
    </div>
  );
}
