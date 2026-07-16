import type { Metadata } from "next";
import Link from "next/link";
import { UK_TAX_EXPERT_MANIFEST } from "@taxsorted/engine/uk/expert";
import { MtdExpertCheck } from "@/components/tax-expert/MtdExpertCheck";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";

export const metadata: Metadata = {
  title: "Check my tax position — which UK tax rules apply to you | TaxSorted",
  description: "Answer a few questions about your income. See exactly which tax rules apply to you — and why. Starts with Making Tax Digital (MTD) for Income Tax.",
};

const statusLabel = {
  available: "Ready to use",
  limited: "Works, with limits",
  planned: "Planned next",
} as const;

export default function UkTaxExpertPage() {
  const available = UK_TAX_EXPERT_MANIFEST.capabilities.filter((item) => item.status === "available");
  const rest = UK_TAX_EXPERT_MANIFEST.capabilities.filter((item) => item.status !== "available");
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/tools", label: "Do my tax" }]} current="Check my tax position" />

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-line bg-white p-6 shadow-sm sm:p-10">
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">Check which tax rules apply to you</h1>
        <p className="mt-4 max-w-3xl text-lg text-ink-soft">
          Answer a few questions about your income. See exactly which tax rules apply to you — and why.
        </p>
        <ShortVersion className="mt-6 max-w-3xl">
          <li>The check below covers Making Tax Digital (MTD): digital records and updates every 3 months, run by HM Revenue &amp; Customs (HMRC — the UK tax office).</li>
          <li>Everything runs in your browser. Nothing you type is sent anywhere.</li>
          <li>Every answer shows the rule it used and the official source.</li>
        </ShortVersion>
      </section>

      <section className="mt-12" aria-labelledby="first-deep-path">
        <h2 id="first-deep-path" className="text-3xl font-bold tracking-tight text-ink">Does Making Tax Digital apply to you?</h2>
        <p className="mt-3 max-w-3xl text-base text-ink-soft">
          MTD for Income Tax is live. For the first group of people, the first 3-monthly update is due 7 August 2026.
          This check uses the Income Tax Self Assessment (ITSA) rules. It stops itself when its official sources are overdue for review.
        </p>
        <div className="mt-7"><MtdExpertCheck /></div>
      </section>

      <section className="mt-16 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8" aria-labelledby="ani-deep-path">
        <h2 id="ani-deep-path" className="text-3xl font-bold tracking-tight text-ink">Earning near £60,000 or £100,000?</h2>
        <p className="mt-3 max-w-3xl text-base text-ink-soft">
          One number — your adjusted net income (ANI — your income after certain deductions) — decides three things.
          Your tax-free Personal Allowance. Whether you repay Child Benefit. Your Tax-Free Childcare.
          Check all three privately, in your browser.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/uk/personal-tax#threshold-check" className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-base font-medium text-white hover:bg-accent-deep">
            Check my £60,000 and £100,000 position
          </Link>
          <a href="https://www.gov.uk/guidance/adjusted-net-income" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-base font-medium text-ink hover:bg-accent-soft">
            Read HMRC&apos;s ANI method
          </a>
        </div>
      </section>

      <details className="mt-16 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <summary className="cursor-pointer text-xl font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          What this site can and cannot do — the full list
        </summary>
        <p className="mt-4 max-w-3xl text-base text-ink-soft">
          Each card claims only what it can truly do today. &ldquo;Mapped&rdquo; never secretly means &ldquo;calculated&rdquo;;
          &ldquo;prepared&rdquo; never secretly means &ldquo;filed&rdquo;.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {[...available, ...rest].map((capability) => (
            <article key={capability.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">{capability.journey}</p>
                  <h3 className="mt-2 text-xl font-semibold text-ink">{capability.title}</h3>
                </div>
                <span className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft">{statusLabel[capability.status]}</span>
              </div>
              <p className="mt-3 text-base text-ink-soft">{capability.scope}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {UK_TAX_EXPERT_MANIFEST.stages.map((stage) => (
                  <span key={stage} className={`rounded-full px-3 py-1 text-xs ${capability.stages.includes(stage) ? "bg-accent text-white" : "border border-line text-ink-soft"}`}>{stage}</span>
                ))}
              </div>
              <details className="mt-4 text-sm text-ink-soft">
                <summary className="cursor-pointer font-medium text-ink">What this card does not cover</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">{capability.exclusions.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>
              {capability.humanHref && capability.humanHref !== "/uk/tax-expert" ? (
                <Link href={capability.humanHref} className="mt-4 inline-flex min-h-11 items-center text-base font-medium text-accent hover:text-accent-deep">
                  Open this tool<span aria-hidden="true"> →</span>
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </details>

      <details className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <summary className="cursor-pointer text-xl font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          How this checker thinks — our promise
        </summary>
        <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-base text-ink-soft">
          <li>No mystery score. No confident guessing.</li>
          <li>Every result shows the facts used, what is unknown, the rule that fired, when it applies, and the official sources.</li>
          <li>An unknown answer is never quietly treated as zero.</li>
          <li>Explaining, classifying, calculating, preparing and filing are different powers. We say which one you are getting.</li>
        </ul>
      </details>

      <details className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <summary className="cursor-pointer text-xl font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          For developers and software agents
        </summary>
        <p className="mt-4 max-w-3xl text-base text-ink-soft">
          The same rules have a machine form. The public capability list needs no key.
          Stateless assessments use a workspace key and return the versioned <code className="rounded bg-paper px-1 py-0.5">taxsorted.tax-answer/1</code> envelope.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="https://api.taxsorted.io/v1/uk/tax-expert" className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-base font-medium text-white hover:bg-accent-deep">Capability JSON</a>
          <a href="https://api.taxsorted.io/openapi/tax-expert-uk.json" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-base font-medium text-ink hover:bg-accent-soft">OpenAPI 3.1 description</a>
        </div>
      </details>
    </div>
  );
}
