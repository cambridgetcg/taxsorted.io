import type { Metadata } from "next";
import Link from "next/link";
import { UK_TAX_EXPERT_MANIFEST } from "@taxsorted/engine/uk/expert";
import { MtdExpertCheck } from "@/components/tax-expert/MtdExpertCheck";

export const metadata: Metadata = {
  title: "UK tax expert — evidence, dates and honest boundaries | TaxSorted",
  description: "Understand UK tax through explicit facts, effective-dated rules and official sources. Deep paths: MTD Income Tax readiness and adjusted-net-income threshold interactions.",
};

const statusLabel = {
  available: "Deep path available",
  limited: "Useful, bounded",
  planned: "Mapped next",
} as const;

export default function UkTaxExpertPage() {
  const available = UK_TAX_EXPERT_MANIFEST.capabilities.filter((item) => item.status === "available");
  const rest = UK_TAX_EXPERT_MANIFEST.capabilities.filter((item) => item.status !== "available");
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-accent hover:text-accent-deep">← Back to TaxSorted</Link>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Architecture of understanding</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-6xl">A UK tax expert that knows where the edge is.</h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">No mystery score. No confident guessing. Every result shows the facts used, what is unknown, the rule that fired, when it applies, the official receipts and the next honest action.</p>
        <p className="mt-5 rounded-2xl bg-accent-soft p-4 text-sm font-medium text-ink"><span lang="yue-Hant">唔估、唔嚇、逐條規則畀你睇。</span> Unknown is never zero. Explain, classify, calculate, prepare and file are different powers.</p>
      </section>

      <section className="mt-12" aria-labelledby="first-deep-path">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Coverage first. Depth where time matters.</p>
        <h2 id="first-deep-path" className="mt-2 text-3xl font-bold tracking-tight text-ink">Deep path one: MTD Income Tax</h2>
        <p className="mt-3 max-w-3xl text-ink-soft">The regime is live. For the first cohort, the first quarterly update deadline is 7 August 2026. This check uses the existing ITSA rules engine and stops automatically when its official-source review is overdue.</p>
        <div className="mt-7"><MtdExpertCheck /></div>
      </section>

      <section className="mt-16 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="ani-deep-path">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">One number. Three consequences.</p>
        <h2 id="ani-deep-path" className="mt-2 text-3xl font-bold tracking-tight text-ink">Deep path two: adjusted net income</h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          The same evidence-backed ANI calculation now maps the Personal Allowance taper,
          a simplified full-year Child Benefit charge and Tax-Free Childcare&apos;s distinct
          household-partner income test.
          Blank partner income remains unknown, exactly £100,000 stays inside the childcare
          limit, and the checker runs entirely in the browser.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/uk/personal-tax#threshold-check" className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-deep">
            Map my £60k / £100k thresholds
          </Link>
          <a href="https://www.gov.uk/guidance/adjusted-net-income" className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:bg-accent-soft">
            Read HMRC&apos;s ANI method
          </a>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="coverage-map">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">The whole path</p>
            <h2 id="coverage-map" className="mt-2 text-3xl font-bold tracking-tight text-ink">What TaxSorted actually covers</h2>
          </div>
          <p className="max-w-xl text-sm text-ink-soft">A capability only claims the stages it can perform today. “Mapped” does not secretly mean “calculated”; “prepared” does not secretly mean “filed”.</p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {[...available, ...rest].map((capability) => (
            <article key={capability.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">{capability.journey}</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">{capability.title}</h3>
                </div>
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft">{statusLabel[capability.status]}</span>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{capability.scope}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {UK_TAX_EXPERT_MANIFEST.stages.map((stage) => (
                  <span key={stage} className={`rounded-full px-3 py-1 text-xs ${capability.stages.includes(stage) ? "bg-accent text-white" : "border border-line text-ink-soft"}`}>{stage}</span>
                ))}
              </div>
              <details className="mt-4 text-sm text-ink-soft">
                <summary className="cursor-pointer font-medium text-ink">Boundaries</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">{capability.exclusions.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>
              {capability.humanHref && capability.humanHref !== "/uk/tax-expert" ? <Link href={capability.humanHref} className="mt-4 inline-block text-sm font-medium text-accent hover:text-accent-deep">Open current tool →</Link> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-16 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">For agents and builders</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">The same understanding has a machine form.</h2>
        <p className="mt-3 max-w-3xl text-ink-soft">The public capability registry needs no key. Stateless assessments use a workspace key and return the versioned <code className="rounded bg-paper px-1 py-0.5">taxsorted.tax-answer/1</code> envelope. Request bodies are strict, bounded and reject duplicate fields.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="https://api.taxsorted.io/v1/uk/tax-expert" className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent-deep">Capability JSON</a>
          <a href="https://api.taxsorted.io/openapi/tax-expert-uk.json" className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:bg-accent-soft">Task-sized OpenAPI 3.1</a>
          <Link href="/uk/personal-tax" className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:bg-accent-soft">Personal-tax playbook</Link>
        </div>
      </section>
    </div>
  );
}
