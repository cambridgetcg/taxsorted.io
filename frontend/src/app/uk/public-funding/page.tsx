import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import publicFundingJson from "../../../../../research/uk/public-funding/data/uk-public-funding.json";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Where UK public money goes — TaxSorted",
  description:
    "How UK taxes become budgets for hospitals, schools and services in all four nations — every step linked to its official source, every gap in the trail named.",
};

type Source = {
  id: string;
  title: string;
  publisher: string;
  url: string;
};

type Programme = {
  id: string;
  name: string;
  sector: string;
  jurisdictions: string[];
  status: string;
  purpose: string;
  populationScope: string;
  beneficiaryTags: string[];
  transparencyNotes: string[];
};

type Allocation = {
  id: string;
  name: string;
  amountMinor: number;
  currency: "GBP";
  financialYear: string;
  status: string;
  budgetBoundary: string;
  accountingBasis: string;
  grossOrNet: string;
  priceBasis: string;
  notComparableToIds?: string[];
  traceabilityWarning: string;
};

type TransparencyGap = {
  id: string;
  title: string;
  detail: string;
  consequence: string;
  status: string;
};

type PublicFundingCorpus = {
  meta: {
    version: string;
    reviewedOn: string;
    warning: string;
    exclusions: string[];
  };
  sources: Source[];
  institutions: Array<{ id: string }>;
  governanceUnits: Array<{ id: string }>;
  offices: Array<{ id: string }>;
  programmes: Programme[];
  allocations: Allocation[];
  contacts: Array<{ id: string }>;
  pipelineStages: Array<{ id: string }>;
  transparencyGaps: TransparencyGap[];
};

const corpus = publicFundingJson as unknown as PublicFundingCorpus;
const apiBase = "https://api.taxsorted.io/v1/public-funding/uk";

const reviewedDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${corpus.meta.reviewedOn}T00:00:00Z`));

const beneficiaryTags = Array.from(
  new Set(corpus.programmes.flatMap((programme) => programme.beneficiaryTags)),
).sort((left, right) => left.localeCompare(right));

const tagCounts = new Map(
  beneficiaryTags.map((tag) => [
    tag,
    corpus.programmes.filter((programme) => programme.beneficiaryTags.includes(tag)).length,
  ]),
);

const featuredSourceIds = [
  "src-hmt-supply-guide-2026",
  "src-hmt-block-grants-2025",
  "src-dhsc-nhs-directions-2026-27",
  "src-nhs-allocations-2026-29",
  "src-dfe-accounts-2024-25",
  "src-dsg-2026-27",
  "src-scottish-budget-2026-27",
  "src-welsh-budget-2026-27",
  "src-ni-draft-budget-2026-29",
];

const featuredSources = featuredSourceIds
  .map((id) => corpus.sources.find((source) => source.id === id))
  .filter((source): source is Source => Boolean(source));

const financialYears = Array.from(
  new Set(corpus.allocations.map((allocation) => allocation.financialYear)),
).sort();

const exampleFinancialYear = financialYears.at(-1) ?? "2026-27";

const snapshotAllocationIds = [
  "allocation-nhs-england-directed-resource",
  "allocation-public-health-grant",
  "allocation-core-schools-plan",
  "allocation-scotland-education-total",
  "allocation-wales-health-resource",
  "allocation-ni-education-rdel-plan",
];

const snapshotAllocations = snapshotAllocationIds
  .map((id) => corpus.allocations.find((allocation) => allocation.id === id))
  .filter((allocation): allocation is Allocation => Boolean(allocation));

const exactPounds = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const allocationStatusTone: Record<string, string> = {
  forecast: "bg-violet-100 text-violet-900",
  plan: "bg-amber-100 text-amber-900",
  authorised: "bg-emerald-100 text-emerald-900",
  revised: "bg-sky-100 text-sky-900",
  outturn: "bg-slate-200 text-slate-900",
};

const fiscalStages = [
  {
    number: "01",
    title: "Revenue enters public funds",
    copy: "Most tax and other central receipts enter the Consolidated Fund. That pooled record does not identify a particular service or provider recipient.",
  },
  {
    number: "02",
    title: "Government proposes a plan",
    copy: "Budgets and Spending Reviews set intended boundaries. They do not themselves prove legal authority, payment or delivery.",
  },
  {
    number: "03",
    title: "Parliament authorises Supply",
    copy: "Estimates ask Parliament for spending limits. The applicable Supply and Appropriation law creates authority; an Estimate alone does not.",
  },
  {
    number: "04",
    title: "Treasuries control the boundary",
    copy: "HM Treasury controls UK departmental limits. Devolved governments receive block grants and combine them with their own revenue before making portfolio choices.",
  },
  {
    number: "05",
    title: "Funders allocate or commission",
    copy: "Departments, NHS bodies, councils and funding councils use grants, formulae, loans, pooled budgets and contracts. Each route has different conditions.",
  },
  {
    number: "06",
    title: "Providers deliver services",
    copy: "Public, charitable, social-enterprise and verified private providers may receive money. An allocation is still not proof of a payment or outcome.",
  },
  {
    number: "07",
    title: "Accounts and scrutiny look back",
    copy: "Audited accounts and official returns report outturn after the period. Auditors and committees scrutinise; they do not become the service manager.",
  },
];

const moneyFacts = [
  {
    name: "Budget",
    meaning: "A plan or settlement for a stated boundary and period.",
    limit: "Not legal authority, payment or actual spend.",
  },
  {
    name: "Estimate",
    meaning: "A request to Parliament for resource, capital and cash limits.",
    limit: "Not enacted authority before the relevant Supply law passes.",
  },
  {
    name: "Authorisation",
    meaning: "The legal permission and upper limit to use public resources.",
    limit: "Not proof that the full amount was allocated or used.",
  },
  {
    name: "Allocation",
    meaning: "A decision assigning money to a body, place, programme or formula.",
    limit: "Not proof of cash receipt, delivery or final cost.",
  },
  {
    name: "Payment",
    meaning: "A cash transfer proved by a transaction or settlement record.",
    limit: "Not the same as accrued expense, performance or outcome.",
  },
  {
    name: "Outturn",
    meaning: "What an official account or final return reports after the period.",
    limit: "Only comparable within the stated accounting boundary.",
  },
];

const nations = [
  {
    name: "England",
    tone: "border-emerald-200 bg-emerald-50",
    health:
      "The Department of Health and Social Care (DHSC) funds NHS England. NHS England funds 36 integrated care boards and other commissioners, who pay providers. Public-health grants also flow to local authorities.",
    education:
      "The Department for Education (DfE) funds councils, academy trusts and providers. The Office for Students (OfS) and the Student Loans Company (SLC) cover higher education and student finance. The Department for Science, Innovation and Technology (DSIT) funds UK Research and Innovation (UKRI) for research.",
    caution:
      "Future NHS structural reform stays labelled as proposed until official evidence supports an operative change.",
  },
  {
    name: "Scotland",
    tone: "border-sky-200 bg-sky-50",
    health:
      "The Scottish budget funds territorial and national NHS boards, with health and social-care integration through local statutory arrangements.",
    education:
      "Councils fund schools; the Scottish Funding Council funds colleges and universities; the Student Awards Agency Scotland (SAAS) delivers student support.",
    caution:
      "Changes under the Barnett formula are not ring-fenced Scottish health or education allocations.",
  },
  {
    name: "Wales",
    tone: "border-rose-200 bg-rose-50",
    health:
      "The Welsh budget funds local health boards, NHS trusts and special health authorities; the joint committee commissions specified national services.",
    education:
      "Councils set school formulas from a wider settlement; Medr (the Welsh tertiary education and research body) covers tertiary education, apprenticeships and research.",
    caution: "A proposed supplementary budget is not treated as authorised before its approval stage.",
  },
  {
    name: "Northern Ireland",
    tone: "border-amber-200 bg-amber-50",
    health:
      "The Department of Health and its planning group fund and commission through health and social-care trusts, primary care and other providers.",
    education:
      "The Education Authority funds grant-aided schools; the Economy Department funds further and higher education (FE and HE) institutions and sets student-support policy.",
    caution:
      "Draft budget proposals and a Vote on Account stay distinct while no verified final full multi-year budget is available.",
  },
];

function humanise(value: string) {
  return value.replaceAll(/[-_]/g, " ");
}

function ApiLink({ path, children, className = "" }: { path: string; children: ReactNode; className?: string }) {
  const href = path.startsWith("https://") ? path : `${apiBase}${path}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-flex min-h-11 items-center font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep ${className}`}
    >
      <span>
        {children} <span aria-hidden="true">↗</span>
      </span>
    </a>
  );
}

/** A collapsed section: plain h2 summary on top, the full sourced detail inside. */
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

export default function UkPublicFundingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Breadcrumbs
        items={[{ href: "/uk/money", label: "Follow the money" }]}
        current="Public money"
        className="mb-6"
      />

      <header className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-9 text-white shadow-sm sm:px-10 sm:py-12 lg:px-14">
        <div
          className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/5"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-28 right-24 h-64 w-64 rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div className="relative max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
            UK public funding · reviewed {reviewedDate}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Where your tax money goes.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80 sm:text-xl">
            See how taxes become budgets for hospitals, schools and other services in all
            four UK nations. Every step links to its official source — and we say where the
            trail honestly stops.
          </p>
        </div>

        <dl className="relative mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/15 sm:grid-cols-4">
          {[
            [corpus.sources.length, "official sources"],
            [corpus.institutions.length, "institutions and classes"],
            [corpus.programmes.length, "mapped programmes"],
            [corpus.transparencyGaps.length, "visible gaps"],
          ].map(([value, label]) => (
            <div key={label} className="bg-ink/80 px-4 py-4 sm:px-5">
              <dt className="text-xs uppercase tracking-wide text-white/80">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <ShortVersion className="mt-6">
        <li>
          Most tax goes into one shared pot. No one can trace your exact pounds to one
          hospital or school.
        </li>
        <li>
          Parliament sets legal spending limits. Departments and the devolved governments
          choose within them.
        </li>
        <li>A budget, an allocation and a payment are different things. We never mix them up.</li>
        <li>Open any section below for the full, sourced detail.</li>
      </ShortVersion>

      <nav
        aria-label="On this page"
        className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-line bg-white p-2 text-base"
      >
        {[
          ["#pooled-tax", "The shared pot"],
          ["#money-states", "Six meanings of £"],
          ["#snapshots", "Real examples"],
          ["#pipeline", "Seven steps"],
          ["#services", "Health & schools"],
          ["#nations", "Four nations"],
          ["#next-generation", "Children & students"],
          ["#governance", "Who is responsible"],
          ["#evidence", "Sources & gaps"],
          ["#api", "For developers"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 py-2 font-medium text-ink-soft hover:bg-accent-soft hover:text-accent-deep"
          >
            {label}
          </a>
        ))}
      </nav>

      <section
        id="pooled-tax"
        className="mt-12 scroll-mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]"
        aria-labelledby="pooled-tax-title"
      >
        <div className="rounded-[2rem] border border-line bg-white p-6 sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">The starting truth</p>
          <h2 id="pooled-tax-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Most tax joins a pool before a service gets a budget.
          </h2>
          <div className="mt-5 max-w-3xl space-y-4 text-base leading-7 text-ink-soft">
            <p>
              Income tax, VAT (Value Added Tax), corporation tax and most other central
              receipts enter the Consolidated Fund — the government&apos;s main account.
              Parliament authorises limits; HM Treasury controls them; departments and
              devolved governments make later choices. Official accounts do not let us
              trace your payment to a particular school, hospital or university.
            </p>
            <p>
              <a
                href="https://www.gov.uk/government/publications/national-insurance-fund-accounts/great-britain-national-insurance-fund-account-for-the-year-ended-31-march-2024"
                target="_blank"
                rel="noreferrer noopener"
                className="font-medium text-accent underline decoration-line underline-offset-4"
              >
                National Insurance has a narrow statutory NHS allocation
              </a>
              , but even that does not create a taxpayer-to-hospital trail. Extra amounts
              under the Barnett formula (“Barnett consequentials”) change a devolved
              government&apos;s overall block grant; they are not ring-fenced copies of English
              spending.
            </p>
          </div>
        </div>

        <aside className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 sm:p-8" aria-label="Traceability limit">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Traceability limit</p>
          <h3 className="mt-2 text-2xl font-semibold text-amber-950">What we can honestly show</h3>
          <ul className="mt-5 space-y-3 text-base leading-7 text-amber-950">
            <li><span aria-hidden="true">✓</span> which body had authority;</li>
            <li><span aria-hidden="true">✓</span> which allocation or mechanism was published;</li>
            <li><span aria-hidden="true">✓</span> the year, boundary and accounting basis;</li>
            <li><span aria-hidden="true">✓</span> what later accounts reported; and</li>
            <li><span aria-hidden="true">✗</span> no invented journey for an individual tax payment.</li>
          </ul>
        </aside>
      </section>

      <div className="mt-10">
        <DetailsSection
          id="money-states"
          title="One pound sign, six meanings"
          hint="A budget, an estimate, an authorisation, an allocation, a payment and an outturn are different facts. Open for what each one proves — read the state before reading the amount."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moneyFacts.map((fact, index) => (
              <article
                key={fact.name}
                data-testid="money-fact"
                className="rounded-3xl border border-line bg-white p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-ink">{fact.name}</h3>
                  <span className="rounded-full bg-paper px-3 py-1 text-xs font-semibold tabular-nums text-ink-soft">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-4 text-base leading-7 text-ink-soft">{fact.meaning}</p>
                <p className="mt-4 border-t border-line pt-4 text-base font-medium leading-7 text-ink">
                  {fact.limit}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-accent-soft px-5 py-4 text-base leading-7 text-accent-deep">
            <strong>Period check:</strong> a financial year (FY 2026-27) runs from April to
            March. An academic year (AY 2026/27) follows a teaching cycle. TaxSorted does
            not convert or add them without an official bridge.
          </p>
        </DetailsSection>

        <DetailsSection
          id="snapshots"
          title="Six real examples of published amounts"
          hint="Six official amounts, each with its year, boundary and accounting basis. They are not comparable, and there is no grand total."
        >
          <p className="max-w-4xl text-base leading-7 text-ink-soft">
            These records show how different official amounts are described. They are not a
            league table, are not like-for-like, and must not be added together.
          </p>

          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {snapshotAllocations.map((allocation) => (
              <article
                key={allocation.id}
                data-testid="money-snapshot"
                className="flex flex-col rounded-3xl border border-line bg-white p-6"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className="rounded-full bg-paper px-3 py-1.5 text-ink-soft">
                    FY {allocation.financialYear}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 ${allocationStatusTone[allocation.status] ?? "bg-paper text-ink"}`}>
                    {humanise(allocation.status)}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-6 text-ink">{allocation.name}</h3>
                <p className="mt-4 break-words text-2xl font-semibold tabular-nums tracking-tight text-ink">
                  {exactPounds.format(allocation.amountMinor / 100)}
                </p>
                <p className="mt-4 text-base leading-7 text-ink-soft">{allocation.budgetBoundary}</p>
                <p className="mt-4 border-t border-line pt-4 text-xs font-semibold uppercase leading-5 tracking-wide text-ink-soft">
                  {humanise(allocation.accountingBasis)} basis · {humanise(allocation.grossOrNet)} · {humanise(allocation.priceBasis)} prices
                </p>
                <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-base leading-7 text-amber-950">
                  {allocation.traceabilityWarning}
                </p>
                <p className="mt-auto pt-5 text-base">
                  <ApiLink path={`/allocations/${allocation.id}`}>Open amount and evidence</ApiLink>
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-base leading-7 text-rose-950 sm:flex-row sm:items-center sm:justify-between">
            <p>
              <strong>Comparison boundary:</strong> nation, service scope, status and accounting basis differ.
              The API carries explicit non-comparability links where the source supports them.
            </p>
            <ApiLink path={`/allocations?financialYear=${encodeURIComponent(exampleFinancialYear)}`}>
              Query every FY {exampleFinancialYear} record
            </ApiLink>
          </div>
        </DetailsSection>

        <DetailsSection
          id="pipeline"
          title="From tax receipt to audited accounts: seven steps"
          hint="Money passes seven gates: pooling, planning, legal authority, control, allocation, delivery and audit."
        >
          <ol className="overflow-hidden rounded-[2rem] border border-line bg-white">
            {fiscalStages.map((stage, index) => (
              <li
                key={stage.number}
                data-testid="fiscal-stage"
                className={`grid gap-3 p-5 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-5 sm:p-7 ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink font-mono text-sm font-semibold text-white">
                  {stage.number}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{stage.title}</h3>
                  <p className="mt-2 max-w-4xl text-base leading-7 text-ink-soft">{stage.copy}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-base">
            <ApiLink path="/pipeline">Open the sourced pipeline</ApiLink>
          </p>
        </DetailsSection>

        <DetailsSection
          id="services"
          title="How health and education money flows in England"
          hint="Two lanes, one level deeper: who holds the budget, who commissions, and who provides."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="overflow-hidden rounded-[2rem] border border-line bg-white">
              <div className="border-b border-line bg-emerald-50 p-6 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Health lane</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">Budget, commission, provide.</h3>
                <p className="mt-3 text-base leading-7 text-ink-soft">
                  A commissioner&apos;s job, a payment administrator&apos;s job and a provider&apos;s job are not interchangeable.
                </p>
              </div>
              <ol className="space-y-5 p-6 sm:p-8">
                {[
                  ["The Department of Health and Social Care (DHSC)", "holds the departmental boundary and gives NHS England financial directions."],
                  ["NHS England", "allocates to 36 integrated care boards (ICBs) and retains or delegates specified commissioning."],
                  ["ICBs and other commissioners", "select and contract with NHS, primary-care, charitable, social-enterprise and independent providers."],
                  ["Local authorities", "receive a separate ring-fenced public-health grant and can pool money with ICBs under a legal pooling power (section 75 arrangements)."],
                  ["Accounts and audit", "report what happened after the period within their own consolidation boundaries."],
                ].map(([label, copy], index) => (
                  <li key={label} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                    <span className="font-mono text-xs font-semibold text-emerald-700">{index + 1}</span>
                    <p className="text-base leading-7 text-ink-soft">
                      <strong className="text-ink">{label}</strong> {copy}
                    </p>
                  </li>
                ))}
              </ol>
              <div className="border-t border-line px-6 py-5 text-base sm:px-8">
                <ApiLink path="/programmes?sector=health">Query health programmes</ApiLink>
              </div>
            </article>

            <article className="overflow-hidden rounded-[2rem] border border-line bg-white">
              <div className="border-b border-line bg-sky-50 p-6 sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-800">Education lane</p>
                <h3 className="mt-2 text-2xl font-semibold text-ink">Formula, grant, loan, research.</h3>
                <p className="mt-3 text-base leading-7 text-ink-soft">
                  School budgets, high-needs top-ups, student loans and research awards are different instruments.
                </p>
              </div>
              <ol className="space-y-5 p-6 sm:p-8">
                {[
                  ["Early years", "the Department for Education (DfE) funds local authorities, which must pass through the required share to eligible providers."],
                  ["Schools and high needs", "the Dedicated Schools Grant splits into blocks; maintained schools, academies, places and needs-led top-ups follow distinct routes."],
                  ["Further education and skills", "DfE, the Department for Work and Pensions (DWP), devolved authorities, employers and the apprenticeship service each hold a bounded role."],
                  ["Higher education", "funding from the Office for Students (OfS) and loan delivery by the Student Loans Company (SLC) stay separate from provider fees and borrower repayments."],
                  ["Research", "the Department for Science, Innovation and Technology (DSIT) funds UK Research and Innovation (UKRI); its councils use formulae, grants, fellowships, contracts or loans according to the scheme."],
                ].map(([label, copy], index) => (
                  <li key={label} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3">
                    <span className="font-mono text-xs font-semibold text-sky-700">{index + 1}</span>
                    <p className="text-base leading-7 text-ink-soft">
                      <strong className="text-ink">{label}</strong> {copy}
                    </p>
                  </li>
                ))}
              </ol>
              <div className="border-t border-line px-6 py-5 text-base sm:px-8">
                <ApiLink path="/programmes?sector=education">Query education programmes</ApiLink>
              </div>
            </article>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["A price rule is not a budget", "The NHS Payment Scheme sets payment rules. It is not itself an allocation or proof of payment."],
              ["A formula table may be notional", "A schools national funding formula (NFF) table does not automatically equal a maintained school or academy's final budget."],
              ["A loan has several values", "Cash outlay, face value, carrying value, repayment and forecast subsidy must remain separate."],
            ].map(([title, copy]) => (
              <article key={title} className="rounded-3xl border border-line bg-paper p-5">
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-base leading-7 text-ink-soft">{copy}</p>
              </article>
            ))}
          </div>
        </DetailsSection>

        <DetailsSection
          id="nations"
          title="Scotland, Wales and Northern Ireland run their own systems"
          hint="Four nations, four systems — not one England diagram recoloured."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            {nations.map((nation) => (
              <article
                key={nation.name}
                data-testid="nation-card"
                className={`rounded-[2rem] border p-6 sm:p-8 ${nation.tone}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-2xl font-semibold text-ink">{nation.name}</h3>
                  <ApiLink path={`/institutions?jurisdiction=${encodeURIComponent(nation.name)}`}>
                    Institutions
                  </ApiLink>
                </div>
                <dl className="mt-5 space-y-4 text-base leading-7">
                  <div>
                    <dt className="font-semibold text-ink">Health</dt>
                    <dd className="mt-1 text-ink-soft">{nation.health}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink">Education</dt>
                    <dd className="mt-1 text-ink-soft">{nation.education}</dd>
                  </div>
                </dl>
                <p className="mt-5 rounded-2xl bg-white/65 p-4 text-base font-medium leading-7 text-ink">
                  {nation.caution}
                </p>
              </article>
            ))}
          </div>
        </DetailsSection>

        <DetailsSection
          id="next-generation"
          title="Money aimed at children, students and trainees"
          hint="Programmes tagged by who they serve — early years, school age, students, apprentices — without records about individual people."
        >
          <div className="grid gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div>
              <h3 className="text-xl font-semibold text-ink">
                Find the programmes. Do not invent the total.
              </h3>
              <p className="mt-4 text-base leading-7 text-ink-soft">
                Each programme has a plain aggregate population scope and machine-readable
                beneficiary tags. They help builders find early-years, school-age, high-needs,
                apprentice, student, workforce-training and research programmes without creating
                records about individual people.
              </p>
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-base font-medium leading-7 text-rose-950">
                Tags overlap. One programme can cover several groups and one person can fit several
                tags. TaxSorted does not add tagged amounts into a made-up “next-generation budget”.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                Queryable beneficiary tags
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {beneficiaryTags.map((tag) => (
                  <a
                    key={tag}
                    data-testid="beneficiary-tag"
                    href={`${apiBase}/programmes?beneficiaryTag=${encodeURIComponent(tag)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-4 py-2 text-base font-medium text-ink hover:border-accent hover:text-accent-deep"
                  >
                    {humanise(tag)}&nbsp;<span className="text-ink-soft">· {tagCounts.get(tag)}</span>
                  </a>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {corpus.programmes.slice(0, 6).map((programme) => (
                  <details key={programme.id} data-testid="programme-card" className="rounded-2xl border border-line bg-white p-4">
                    <summary className="cursor-pointer font-semibold text-ink marker:text-accent">
                      {programme.name}
                    </summary>
                    <p className="mt-3 text-base leading-7 text-ink-soft">{programme.purpose}</p>
                    <p className="mt-3 text-base leading-7 text-ink">
                      <strong>Population scope:</strong> {programme.populationScope}
                    </p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                      {programme.jurisdictions.join(" · ")} · {programme.status}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </DetailsSection>

        <DetailsSection
          id="governance"
          title="Who is responsible — offices, boards and public contacts"
          hint="Responsibility maps to the office and the board, not to private lives."
        >
          <div className="grid gap-5 md:grid-cols-3">
            <article className="rounded-3xl border border-line bg-white p-6">
              <p className="text-3xl font-semibold tabular-nums text-ink">{corpus.offices.length}</p>
              <h3 className="mt-3 text-xl font-semibold text-ink">Formal offices</h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                Responsibility, appointment and constraints belong to the office. The current
                holder stays on a dated official-source link; names are not copied into the bulk graph.
              </p>
              <p className="mt-5 text-base"><ApiLink path="/offices">Inspect offices</ApiLink></p>
            </article>

            <article className="rounded-3xl border border-line bg-white p-6">
              <p className="text-3xl font-semibold tabular-nums text-ink">{corpus.governanceUnits.length}</p>
              <h3 className="mt-3 text-xl font-semibold text-ink">Boards, panels and committees</h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                The map records collective remit, powers, limits, membership source and meetings.
                Collective authority is not copied to each member.
              </p>
              <p className="mt-5 text-base"><ApiLink path="/governance">Inspect governance</ApiLink></p>
            </article>

            <article className="rounded-3xl border border-line bg-white p-6">
              <p className="text-3xl font-semibold tabular-nums text-ink">{corpus.contacts.length}</p>
              <h3 className="mt-3 text-xl font-semibold text-ink">Functional public contacts</h3>
              <p className="mt-3 text-base leading-7 text-ink-soft">
                Shared mailboxes, switchboards, forms, freedom of information (FOI) and
                complaints routes only. No inferred emails, personal mobiles, home addresses
                or junior-staff directory.
              </p>
              <p className="mt-5 text-base"><ApiLink path="/contacts">Inspect public contacts</ApiLink></p>
            </article>
          </div>

          <aside className="mt-5 grid gap-4 rounded-3xl border border-line bg-accent-soft p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
            <div>
              <h3 className="font-semibold text-ink">Formal power is scored for offices, not people.</h3>
              <p className="mt-2 text-base leading-7 text-ink-soft">
                This coverage-first funding corpus maps an office&apos;s decision scope, constraints and
                accountability. It does not score a holder&apos;s character or supposed influence, and it
                does not create a person leaderboard.
              </p>
            </div>
            <ApiLink path="https://api.taxsorted.io/v1/politics/uk/power/method">
              Read the formal office-power method
            </ApiLink>
          </aside>
        </DetailsSection>

        <DetailsSection
          id="evidence"
          title="The sources and the known gaps"
          hint="Every claim travels with its official source. Every gap is recorded instead of papered over."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-line bg-white p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">Official evidence</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">The source travels with the claim.</h3>
              <p className="mt-4 text-base leading-7 text-ink-soft">
                A source says what it supports and what it does not prove. Search results and
                commentary can help discovery, but they do not become the authority for a record.
              </p>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {featuredSources.map((source) => (
                  <li key={source.id} className="py-4">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group/source block"
                    >
                      <span className="text-base font-semibold text-ink underline decoration-line underline-offset-4 group-hover/source:text-accent">
                        {source.title} <span aria-hidden="true">↗</span>
                      </span>
                      <span className="mt-1 block text-xs uppercase tracking-wide text-ink-soft">
                        {source.publisher}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-base"><ApiLink path="/sources">Read the complete source ledger</ApiLink></p>
            </article>

            <article className="rounded-[2rem] border border-line bg-ink p-6 text-white sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-200">Caveats are data</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">Unknown is better than invented.</h3>
              <p className="mt-4 text-base leading-7 text-white/80">{corpus.meta.warning}</p>

              <div className="mt-6 space-y-3">
                {corpus.transparencyGaps.slice(0, 6).map((gap) => (
                  <details key={gap.id} data-testid="gap-card" className="rounded-2xl bg-white/10 p-4">
                    <summary className="cursor-pointer font-semibold marker:text-amber-200">
                      {gap.title}
                    </summary>
                    <p className="mt-3 text-base leading-7 text-white/80">{gap.detail}</p>
                    <p className="mt-3 text-base font-medium leading-7 text-white">{gap.consequence}</p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-amber-200">{humanise(gap.status)}</p>
                  </details>
                ))}
              </div>

              <ul className="mt-6 list-disc space-y-2 pl-5 text-base leading-7 text-white/80">
                {corpus.meta.exclusions.slice(0, 3).map((exclusion) => <li key={exclusion}>{exclusion}</li>)}
              </ul>
              <p className="mt-6 text-base"><ApiLink path="/gaps" className="text-amber-200 hover:text-white">Read every open gap</ApiLink></p>
            </article>
          </div>
        </DetailsSection>

        <DetailsSection
          id="api"
          title="For developers"
          hint="Query the collections, mirror the exports, and check the release state before trusting record bodies."
        >
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-ink">
                The map is shaped for people and software.
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">
                Query one collection, follow stable IDs and source IDs, or mirror a complete
                JSON, CSV or NDJSON (newline-delimited JSON) collection. Read each source&apos;s
                reuse terms; TaxSorted&apos;s curation licence does not relicense every upstream
                document.
              </p>
              <p className="mt-5 overflow-x-auto rounded-2xl bg-ink p-4 font-mono text-sm text-white">
                {apiBase}
              </p>
            </div>

            <aside className="rounded-3xl border border-amber-200 bg-amber-50 p-6" aria-label="API release truth">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Release truth</p>
              <p className="mt-3 text-base leading-7 text-amber-950">
                The live overview is authoritative. Check <code>manifest.publicationStatus</code>:
                while protected bodies are paused they return <code>503</code>, but source, gap and
                release-history records remain readable. A serving switch is not confidentiality or recall.
              </p>
            </aside>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Start and release state", "", "Metadata, counts, route discovery and the publication flag."],
              ["Manifest", "/manifest", "Version, checksum, counts, ID policy and correction route."],
              ["Fiscal pipeline", "/pipeline", "Collection, authority, allocation, delivery, accounts and audit."],
              ["Programmes by beneficiary", beneficiaryTags[0] ? `/programmes?beneficiaryTag=${encodeURIComponent(beneficiaryTags[0])}` : "/programmes", "Aggregate purpose tags, never people or recipient records."],
              ["Allocations by year", `/allocations?financialYear=${encodeURIComponent(exampleFinancialYear)}`, "Amounts with status, boundary, accounting basis and traceability warning."],
              ["Data dictionary", "/dictionary", "Fields, filters, references, aliases and comparison rules."],
              ["JSON Schema", "/schema", "The structural record contract for validation."],
              ["Export catalogue", "/exports", "Complete JSON, CSV and NDJSON collection metadata."],
              ["Agent wake", "https://api.taxsorted.io/v1/wake", "One-call machine orientation: publication states, rights, evidence lanes, walls and next actions."],
              ["Release changes", "/changes", "Append-only publication checkpoints with caller-held cursors; not government-domain events."],
              ["Resolve a stable ID", `/records/${corpus.institutions[0]?.id ?? "institution-hmt"}`, "Find a record and its canonical collection without guessing its type."],
              ["OpenAPI 3.1", "https://api.taxsorted.io/openapi.json", "The wider service contract and route descriptions."],
            ].map(([label, path, copy]) => (
              <article key={label} className="rounded-2xl border border-line bg-paper p-5">
                <h4 className="text-base"><ApiLink path={path}>{label}</ApiLink></h4>
                <p className="mt-2 text-base leading-7 text-ink-soft">{copy}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-3xl bg-ink p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Check the release state</p>
              <pre aria-label="Public-funding API curl example" className="mt-4 overflow-x-auto text-sm leading-7 text-white">
                <code>{`curl -fsS '${apiBase}' | jq '{version: .meta.version, status: .manifest.publicationStatus, counts}'`}</code>
              </pre>
            </div>
            <div className="rounded-3xl border border-line bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">When record bodies are open</p>
              <div className="mt-4 flex flex-wrap gap-3 text-base">
                <ApiLink path="/exports/allocations/json">Allocations JSON</ApiLink>
                <ApiLink path="/exports/allocations/csv">CSV</ApiLink>
                <ApiLink path="/exports/allocations/ndjson">NDJSON</ApiLink>
              </div>
              <p className="mt-4 text-base leading-7 text-ink-soft">
                Keep stable IDs, source IDs, dates, attribution and limitations with reused copies.
                Corpus version <strong className="text-ink">{corpus.meta.version}</strong>.
              </p>
            </div>
          </div>

          <aside className="mt-8 rounded-3xl border border-line bg-accent-soft p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">Words and actions · proposed evidence contract</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">A statement, vote, decision, allocation and outturn are different records.</h3>
            <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
              The next politics layer is designed as institutional official events, separately gated named
              attributions and append-only corrections. It will link to official text and publish a short factual
              summary—not copy speeches, infer missing votes, score rhetoric or build personality dossiers.
              The contract is published for review; no endpoint is claimed live yet.
            </p>
            <a
              href="https://github.com/cambridgetcg/taxsorted.io/blob/main/research/uk/politics/official-events-method.md"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4"
            >
              Read the proposed official-events method <span aria-hidden="true">&nbsp;↗</span>
            </a>
          </aside>
        </DetailsSection>
      </div>
    </div>
  );
}
