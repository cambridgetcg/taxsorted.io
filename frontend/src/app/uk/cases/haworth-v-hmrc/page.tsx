import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  caseBySlug,
  formatGbp,
  sourcesById,
  ukCaseCommons,
} from "@/lib/uk-case-commons";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Haworth v HMRC deep case — TaxSorted",
  description:
    "Why HMRC's notices were quashed, what the £8.786m figure actually meant, why it was not a payout, and how a qualified professional should assess a similar case.",
};

const directCaseSourceIds = [
  "uksc-haworth-2021-case",
  "uksc-haworth-2021-judgment",
  "uksc-haworth-2021-press-summary",
  "ukut-haworth-2024",
  "uksc-haworth-2025-permission",
] as const;

function ExternalSource({
  sourceId,
  children,
}: {
  sourceId: string;
  children: React.ReactNode;
}) {
  const source = ukCaseCommons.sources.find((item) => item.id === sourceId);
  if (!source) return null;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer noopener"
      className="font-semibold text-accent underline decoration-line underline-offset-4 hover:text-accent-deep"
    >
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}

export default function HaworthCasePage() {
  const caseRecord = caseBySlug("haworth-v-hmrc");
  if (!caseRecord) notFound();

  const demand = caseRecord.financialEffect.documentedAmounts.find(
    (amount) => amount.id === "accelerated-demand",
  )!;
  const penaltyLow = caseRecord.financialEffect.documentedAmounts.find(
    (amount) => amount.id === "then-potential-penalty-low",
  )!;
  const penaltyHigh = caseRecord.financialEffect.documentedAmounts.find(
    (amount) => amount.id === "then-potential-penalty-high",
  )!;
  const directSources = sourcesById(directCaseSourceIds);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/uk", label: "The UK system" },
          { href: "/uk/cases", label: "Case commons" },
        ]}
        current="Haworth v HMRC"
        className="mb-6"
      />

      <header className="rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10 lg:p-12">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-900">
            Decided public record
          </span>
          <span className="rounded-full bg-paper px-3 py-1.5 text-ink-soft">
            {caseRecord.citation}
          </span>
          <span className="rounded-full bg-paper px-3 py-1.5 text-ink-soft">
            England and Wales
          </span>
          <span className="rounded-full bg-paper px-3 py-1.5 text-ink-soft">
            No probability score
          </span>
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Deep case 001 · tax administration and judicial review
        </p>
        <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          HMRC lost the notice case. The taxpayer later lost the tax case.
        </h1>
        <p className="mt-5 max-w-4xl text-lg leading-8 text-ink-soft">
          {caseRecord.publicInterestQuestion}
        </p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3" aria-label="Case outcome summary">
        <article className="rounded-3xl bg-ink p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/65">
            Amount affected
          </p>
          <p className="mt-3 text-3xl font-semibold">{formatGbp(demand.amountPence)}</p>
          <p className="mt-3 text-sm leading-6 text-white/75">
            An up-front demand set aside with the notice. Not an award or final tax saving.
          </p>
        </article>
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
            Public-law remedy
          </p>
          <p className="mt-3 text-3xl font-semibold text-ink">2 notices quashed</p>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            The follower notice and linked accelerated-payment notice were set aside.
          </p>
        </article>
        <article className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-900">
            Money recovered
          </p>
          <p className="mt-3 text-3xl font-semibold text-ink">Not established</p>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            No damages award was identified. The accelerated sum had not been
            paid; the underlying tax appeal failed.
          </p>
        </article>
      </section>

      <section className="mt-16 grid gap-5 lg:grid-cols-2" aria-labelledby="finding-title">
        <article className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
            What the Supreme Court found
          </p>
          <h2 id="finding-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            The statutory threshold mattered.
          </h2>
          <ul className="mt-6 space-y-4">
            {caseRecord.findings.map((finding) => (
              <li key={finding.id} className="rounded-2xl bg-white/75 p-4 text-base leading-7 text-ink">
                {finding.statement}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-6 text-ink-soft">
            Read the{" "}
            <ExternalSource sourceId="uksc-haworth-2021-judgment">
              full judgment
            </ExternalSource>
            , not only the summary.
          </p>
        </article>

        <article className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-900">
            What the win did not prove
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Procedure and underlying liability stayed separate.
          </h2>
          <ul className="mt-6 space-y-4">
            {caseRecord.counterweights.map((counterweight) => (
              <li key={counterweight.id} className="rounded-2xl bg-white/75 p-4 text-base leading-7 text-ink">
                {counterweight.statement}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-6 text-ink-soft">
            The{" "}
            <ExternalSource sourceId="uksc-haworth-2025-permission">
              2025 permission decision
            </ExternalSource>{" "}
            records the end of the separate substantive appeal.
          </p>
        </article>
      </section>

      <section className="mt-16" aria-labelledby="timeline-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Follow the whole record
        </p>
        <h2 id="timeline-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          Twenty-five years, six distinct procedural moments.
        </h2>
        <ol className="mt-7 border-l-2 border-line pl-6 sm:pl-8">
          {caseRecord.timeline.map((event) => (
            <li key={`${event.date}-${event.event}`} className="relative pb-8 last:pb-0">
              <span
                className="absolute -left-[2.05rem] top-1 h-4 w-4 rounded-full border-4 border-paper bg-accent sm:-left-[2.55rem]"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                {event.datePrecision === "year"
                  ? event.date.slice(0, 4)
                  : event.datePrecision === "month"
                    ? new Date(`${event.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })
                    : new Date(`${event.date}T00:00:00Z`).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
              </p>
              <p className="mt-2 max-w-4xl text-base leading-7 text-ink-soft">{event.event}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-8 lg:p-10" aria-labelledby="gain-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Potential gain, stated without theatre
        </p>
        <h2 id="gain-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          The large numbers describe pressure—not a payday.
        </h2>
        <div className="mt-7 overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <caption className="sr-only">
              Documented figures, what each meant and what it did not mean
            </caption>
            <thead className="bg-paper text-sm font-semibold text-ink">
              <tr>
                <th scope="col" className="w-48 px-4 py-3">
                  Figure
                </th>
                <th scope="col" className="px-4 py-3">
                  What it meant
                </th>
                <th scope="col" className="px-4 py-3">
                  What it did not mean
                </th>
              </tr>
            </thead>
            <tbody>
              {caseRecord.financialEffect.documentedAmounts.map((amount) => (
                <tr key={amount.id} className="border-t border-line align-top">
                  <th scope="row" className="px-4 py-5 text-lg font-semibold text-ink">
                    {formatGbp(amount.amountPence)}
                  </th>
                  <td className="px-4 py-5 text-sm leading-6 text-ink-soft">
                    {amount.meaning}
                  </td>
                  <td className="px-4 py-5">
                    <p className="rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-950">
                      {amount.notMeaning}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <h3 className="font-semibold text-rose-950">Always model the downside</h3>
            <p className="mt-2 text-sm leading-6 text-rose-950">
              {caseRecord.financialEffect.downside.minimumScenario}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-paper p-5">
            <h3 className="font-semibold text-ink">Net recovery remains unknown</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              {caseRecord.financialEffect.netRecovery.reason}
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm leading-6 text-ink-soft">
          The historical contingent penalty range shown by the then-law was{" "}
          {formatGbp(penaltyLow.amountPence)} to {formatGbp(penaltyHigh.amountPence)}.
          No penalty was imposed in time. It is contextual exposure, not recovered money.
        </p>
      </section>

      <section className="mt-16 grid gap-5 lg:grid-cols-2" aria-labelledby="similar-title">
        <article className="rounded-[2rem] border border-line bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Pattern worth assessing
          </p>
          <h2 id="similar-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Could a similar challenge exist?
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            {caseRecord.applicability.reasoningPattern}
          </p>
          <ul className="mt-6 list-disc space-y-3 pl-5 text-base leading-7 text-ink-soft">
            {caseRecord.applicability.possibleSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </article>
        <article className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-900">
            Not enough on its own
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Similarity is not viability.
          </h2>
          <ul className="mt-6 list-disc space-y-3 pl-5 text-base leading-7 text-ink-soft">
            {caseRecord.applicability.notEnough.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-6 rounded-2xl bg-white/75 p-4 text-sm leading-6 text-rose-950">
            {caseRecord.applicability.assessmentRoute}
          </p>
        </article>
      </section>

      <section className="mt-16" aria-labelledby="contact-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Who a law firm should contact
        </p>
        <h2 id="contact-title" className="mt-2 text-3xl font-semibold tracking-tight text-ink">
          The client first. The public body only through the proper route.
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-soft">
          This is a historical example, so there is no live claimant to pick up.
          For a new matter, the order below protects consent, privilege,
          conflicts and valid service.
        </p>
        <ol className="mt-7 grid gap-4 md:grid-cols-2">
          {caseRecord.professionalHandoff.whoToContact.map((contact) => (
            <li key={contact.order} className="rounded-3xl border border-line bg-white p-6">
              <div className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {contact.order}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-ink">{contact.party}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{contact.when}</p>
                  <p className="mt-3 text-sm font-medium leading-6 text-ink">{contact.why}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          TaxSorted publishes no claimant contact and receives no expression of
          interest. Verify a solicitor or firm through the{" "}
          <ExternalSource sourceId="sra-solicitors-register">
            SRA Solicitors Register
          </ExternalSource>{" "}
          and a barrister&apos;s exact permissions through the{" "}
          <ExternalSource sourceId="bsb-barristers-register">
            Bar Standards Board register
          </ExternalSource>
          . Registration is not an endorsement of expertise or outcome.
        </div>
      </section>

      <section className="mt-16 rounded-[2rem] bg-ink p-6 text-white sm:p-8 lg:p-10" aria-labelledby="packet-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/65">
          Forkable case packet
        </p>
        <h2 id="packet-title" className="mt-2 text-3xl font-semibold tracking-tight">
          Take the public evidence. Keep the private matter private.
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-white/75">
          The JSON packet resolves every source and carries a SHA-256 identifier
          for its substantive fields. The response checksum covers the exact
          delivered bytes. Neither proves truth, identity, qualification or a
          viable claim.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="https://api.taxsorted.io/v1/case-commons/uk/cases/haworth-v-hmrc-2021"
            className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-base font-semibold text-ink hover:bg-accent-soft"
          >
            Complete case packet JSON ↗
          </a>
          <a
            href="https://api.taxsorted.io/v1/case-commons/uk/assessment-template"
            className="inline-flex min-h-11 items-center rounded-full border border-white/30 px-5 py-2.5 text-base font-semibold text-white hover:bg-white/10"
          >
            Blank local assessment JSON ↗
          </a>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="sources-title">
        <h2 id="sources-title" className="text-2xl font-semibold tracking-tight text-ink">
          Direct case sources
        </h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {directSources.map((source) => (
            <li key={source.id}>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block h-full rounded-2xl border border-line bg-white p-5 hover:border-accent hover:bg-accent-soft"
              >
                <span className="font-semibold text-accent">{source.title} ↗</span>
                <span className="mt-2 block text-sm leading-6 text-ink-soft">
                  {source.publisher} · {source.status}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm leading-6 text-ink-soft">
          Reviewed 24 July 2026. Read each source&apos;s limitations in the{" "}
          <a
            href="https://api.taxsorted.io/v1/case-commons/uk/sources"
            className="font-semibold text-accent underline underline-offset-4"
          >
            machine source ledger
          </a>
          . This page is public research, not legal advice.
        </p>
      </section>

      <p className="mt-10">
        <Link
          href="/uk/cases"
          className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4"
        >
          ← Back to the case commons
        </Link>
      </p>
    </div>
  );
}
