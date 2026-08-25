import type { Metadata } from "next";
import Link from "next/link";
import { PlanClient } from "./plan-client";

export const metadata: Metadata = {
  title: "Plan — compare lawful tax choices | TaxSorted",
  description:
    "Compare lawful tax choices across tax, cash flow, work, uncertainty, evidence and wider consequences without being steered.",
};

const POWERS = [
  ["Know", "Facts, entities, periods, evidence and unknowns stay visible."],
  ["See", "Duties, entitlements, deadlines, sources and boundaries sit together."],
  ["Choose", "Like-for-like scenarios show their whole cost. You decide."],
  ["Do", "Only the action you deliberately approve moves forward."],
  ["Prove", "Keep the records, derivation, rule version and receipt."],
  ["Challenge", "Correction, review, appeal and payment-help paths remain open."],
] as const;

const AREAS = [
  ["Work, PAYE and benefits", "Threshold interactions and entitlements", "/uk/personal-tax#threshold-check", "Bounded check open"],
  ["Self-employment", "Allowances, genuine costs and record choices", "#first-comparison", "First projected calculation open"],
  ["Property income", "Allowance, actual costs, finance and losses", "/learn/for-landlords", "Guide open · deeper comparison next"],
  ["Family and caring", "Child Benefit, childcare and relationship facts", "/uk/tax-expert#ani-deep-path", "Bounded check open"],
  ["Saving and pensions", "Intended wrappers, timing and wider consequences", "/uk/personal-tax", "Explanation only"],
  ["Business and VAT", "Registration, schemes, timing and evidence", "/vat", "Preparation open · planning limited"],
  ["Companies and owner pay", "Legal form, remuneration, profit and extraction", "/feedback", "Not yet"],
  ["Cross-border, trusts and restructuring", "Residence, treaties, control and specialist judgement", "/uk/tax-expert#coverage-map", "Review required"],
] as const;

export default function PlanPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="grid gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:items-center lg:gap-14">
        <div className="max-w-4xl">
          <p className="section-label">Plan · power to choose</p>
          <h1 className="hero-title mt-5 text-ink">See covered lawful choices. Keep the decision yours.</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-ink-soft">
            TaxSorted helps you pay the right tax—no more and no less—while reducing avoidable
            cost, work, uncertainty and loss of control. It compares consequences; it does not
            quietly decide what your life should optimise for.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#first-comparison" className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-7 font-semibold text-white hover:bg-accent-deep">
              Compare a full-year scenario
            </a>
            <Link href="/checkup" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-surface px-6 font-medium text-ink hover:border-accent hover:bg-accent-soft">
              Check my position first
            </Link>
          </div>
        </div>

        <aside className="soft-shadow rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
          <p className="section-label">Total lawful burden</p>
          <p className="mt-4 font-display text-3xl font-semibold leading-tight text-ink">Tax is one line, not the whole answer.</p>
          <ul className="mt-5 divide-y divide-line text-sm text-ink">
            {["Tax due now and later", "Cash flow and direct costs", "Record-keeping and filing work", "Uncertainty and error risk", "Flexibility and wider consequences"].map((part) => (
              <li key={part} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span aria-hidden="true" className="text-accent">+</span>
                <span>{part}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-line pt-5 text-sm leading-6 text-ink-soft">
            TaxSorted never hides these dimensions inside one “best option” score.
          </p>
        </aside>
      </header>

      <section aria-labelledby="powers-title" className="mt-24">
        <p className="section-label">01 · What planning must return</p>
        <h2 id="powers-title" className="section-title mt-4 text-ink">Six powers, held by the person.</h2>
        <ol className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line sm:grid-cols-2 lg:grid-cols-3">
          {POWERS.map(([name, body], index) => (
            <li key={name} className="bg-surface p-6">
              <span aria-hidden="true" className="font-display text-3xl text-accent">0{index + 1}</span>
              <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <PlanClient />

      <section aria-labelledby="areas-title" className="mt-24">
        <p className="section-label">03 · Begin with life, not a tax form</p>
        <h2 id="areas-title" className="section-title mt-4 text-ink">Planning areas and their honest state.</h2>
        <div className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map(([title, body, href, status]) => (
            <article key={title} className="bg-surface p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{status}</p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{body}</p>
              <Link href={href} className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">
                Open this path →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="line-title" className="mt-24 rounded-[2rem] border border-line bg-paper p-6 sm:p-8">
        <p className="section-label">04 · The lawful line</p>
        <h2 id="line-title" className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">Use intended rights. Keep the facts real.</h2>
        <div className="mt-6 grid gap-6 text-sm leading-6 text-ink-soft md:grid-cols-2">
          <div>
            <h3 className="font-semibold text-ink">TaxSorted can help with</h3>
            <ul className="mt-2 list-disc space-y-2 ps-5">
              <li>correct arithmetic, genuine costs and intended entitlements;</li>
              <li>statutory schemes, elections and the timing of real events;</li>
              <li>real business structures, overpayment corrections and official payment help.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-ink">TaxSorted will not help with</h3>
            <ul className="mt-2 list-disc space-y-2 ps-5">
              <li>hidden income, invented expenses or fabricated evidence;</li>
              <li>sham arrangements, false residence or backdated actions;</li>
              <li>contrived steps aimed at a result Parliament did not intend.</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href="https://www.gov.uk/hmrc-internal-manuals/avoidance-handling-process/ahp1300" target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline underline-offset-4">HMRC — tax planning and avoidance ↗ <span className="sr-only">(opens in a new tab)</span></a>
          <a href="https://www.gov.uk/government/publications/hmrc-the-standard-for-agents/the-hmrc-standard-for-agents" target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline underline-offset-4">HMRC — Standard for Agents ↗ <span className="sr-only">(opens in a new tab)</span></a>
        </div>
      </section>
    </div>
  );
}
