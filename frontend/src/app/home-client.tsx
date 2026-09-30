"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Check, House, ListChecks, NotebookPen, UserRound } from "lucide-react";
import { AUDIENCES } from "@/lib/tax-services";

const AUDIENCE_ICONS = { individuals: UserRound, "sole-traders": BriefcaseBusiness, landlords: House };
const PRIMARY_AUDIENCES = AUDIENCES.filter(
  (audience) => audience.id === "individuals" || audience.id === "sole-traders" || audience.id === "landlords",
);

const STEPS = [
  {
    number: "01",
    title: "Know what to do next",
    description: "See what needs attention in your saved work, keep a personal checklist and go straight to the next useful task.",
    href: "/checkup",
    action: "Open my tax year",
    icon: ListChecks,
  },
  {
    number: "02",
    title: "Get your records together",
    description: "Add income and expenses by hand or from a CSV. Review your records and keep each business separate.",
    href: "/books",
    action: "Explore money records",
    icon: NotebookPen,
  },
  {
    number: "03",
    title: "Prepare with a clear picture",
    description: "Compare scenarios, review your figures and understand your filing route. See what is ready and what still needs work.",
    href: "/file",
    action: "See preparation and filing",
    icon: Check,
  },
];

export function HomeClient() {
  return (
    // The new service copy is English until reviewed translations are ready.
    // Keep its language and direction explicit under the translated shell.
    <div lang="en" dir="ltr" className="mx-auto max-w-7xl px-4 pb-4 pt-10 sm:px-6 sm:pt-16 lg:px-8">
      <header className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(21rem,0.85fr)] lg:gap-14">
        <div className="max-w-2xl pb-2">
          <p className="section-label flex items-center gap-2.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
            UK tax, made manageable
          </p>
          <h1 className="hero-title mt-6 text-ink">
            A clearer way <br />to sort your tax.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-ink-soft">
            Know where to start, keep your records in order and work through your next steps.
            Practical tools for individuals, sole traders and landlords.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/checkup"
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-accent px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-deep"
            >
              See my tax year <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/books/workspace"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-surface px-6 text-base font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft"
            >
              Continue to my records
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
            <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-accent" />
            Free to use. No account needed to get started.
          </p>
        </div>

        <section aria-labelledby="audience-heading" className="soft-shadow rounded-[2rem] bg-accent-deep p-5 sm:p-7">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-white/75">Your starting point</p>
          <h2 id="audience-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">Who are you sorting tax for?</h2>
          <div className="mt-6 space-y-3">
            {PRIMARY_AUDIENCES.map(({ id, shortName, description }, index) => {
              const Icon = AUDIENCE_ICONS[id];
              return (
                <Link
                  key={id}
                  href={`/services/${id}`}
                  aria-labelledby={`audience-${index}-title`}
                  aria-describedby={`audience-${index}-description`}
                  className="group flex min-h-24 items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-4 text-white transition-colors hover:bg-white/15 focus-visible:outline-white"
                >
                  <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <span className="flex-1">
                    <span id={`audience-${index}-title`} className="block text-base font-semibold">{shortName}</span>
                    <span id={`audience-${index}-description`} className="mt-1 block text-sm leading-5 text-white/80">{description}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-white/75 transition-transform group-hover:translate-x-1" />
                </Link>
              );
            })}
          </div>
          <p className="mt-5 text-sm leading-6 text-white/75">More than one applies? You can keep a separate checklist for each situation.</p>
        </section>
      </header>

      <section aria-labelledby="mtd-heading" className="mt-10 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="section-label">Self-employed or letting property?</p>
          <h2 id="mtd-heading" className="mt-2 text-lg font-semibold text-ink">Check if Making Tax Digital applies to you.</h2>
          <p className="mt-1 text-sm leading-6 text-ink-soft">Start with a quick check, then see the requirements and sources for your situation.</p>
        </div>
        <Link href="/itsa/am-i-in" className="inline-flex min-h-11 shrink-0 items-center gap-3 self-start rounded-full border border-line-strong px-5 text-sm font-semibold text-accent transition-colors hover:border-accent hover:bg-accent-soft md:self-center">
          Check MTD requirements <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>

      <section aria-labelledby="steps-heading" className="mt-20 sm:mt-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">A little more sorted, at every step</p>
            <h2 id="steps-heading" className="section-title mt-4 max-w-xl text-ink">Start where you are. <br />Keep moving.</h2>
          </div>
          <Link href="/services" className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep sm:self-auto">
            Explore all services <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line md:grid-cols-3">
          {STEPS.map(({ number, title, description, href, action, icon: Icon }) => (
            <article key={number} className="flex flex-col bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span aria-hidden="true" className="font-mono text-sm text-ink-faint">{number}</span>
                <Icon aria-hidden="true" className="h-6 w-6 text-accent" strokeWidth={1.5} />
              </div>
              <h3 className="mt-7 font-display text-2xl font-semibold leading-tight tracking-tight text-ink">{title}</h3>
              <p className="mb-5 mt-3 text-sm leading-7 text-ink-soft">{description}</p>
              <Link href={href} className="mt-auto inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">
                {action} <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-ink-soft md:grid-cols-2 md:gap-8">
          <p><span className="font-semibold text-ink">Your records, on this device.</span> Money records stay in this app or browser. Export a backup to keep them safe; an account does not back them up.</p>
          <p><span className="font-semibold text-ink">Clear about what is ready.</span> Preparation tools are available. HMRC filing journeys are sandbox tests; production filing is not live.</p>
        </div>
      </section>

      <section aria-labelledby="support-heading" className="mt-20 grid gap-7 border-y border-line py-9 md:grid-cols-[0.85fr_1.15fr] md:gap-12">
        <div>
          <p className="section-label">Make sense of it</p>
          <h2 id="support-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">A clear explanation. <br />A useful next step.</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Link href="/learn" className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">Read the tax guides <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
            <p className="mt-1 text-sm leading-6 text-ink-soft">Plain explanations with sources, including <Link href="/learn/mtd-income-tax" className="text-accent underline underline-offset-4">Making Tax Digital</Link>.</p>
          </div>
          <div>
            <Link href="/put-it-right" className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">Find help with a problem <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" /></Link>
            <p className="mt-1 text-sm leading-6 text-ink-soft">Find the right route to correct a mistake, challenge a decision or get payment help.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="others-heading" className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="others-heading" className="text-sm font-medium text-ink-soft">Helping someone else, or working as an organisation?</h2>
        <div className="flex flex-wrap gap-x-6">
          <Link href="/services/advisers" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">For advisers <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          <Link href="/services/organisations" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">For organisations <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
      </section>
    </div>
  );
}
