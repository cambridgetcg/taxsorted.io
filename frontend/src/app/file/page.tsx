import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, House, UserRound } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { OFFICIAL_RETURN_ROUTES } from "@/lib/accounting-integrations";

export const metadata: Metadata = {
  title: "Prepare a return | TaxSorted",
  description:
    "Find your next step for personal, sole-trader or landlord tax. Review records, prepare quarterly figures and find the official HMRC filing route.",
};

const STATES = [
  ["Prepared", "The figures and information are ready for your review. Nothing has been authorised."],
  ["Approved", "You deliberately approved the exact action and information shown."],
  ["Submitted", "The exact approved information reached the authority submission service, proven by a conclusive response. A click or pre-send failure is not submitted."],
  ["Delivery unknown", "An attempt ended without proof of delivery. It is not submitted, accepted or safe to retry blindly."],
  ["Received", "The authority returned an acknowledgement tied to the exact information sent. Its meaning still needs to be read."],
  ["Accepted", "The authority explicitly accepted the return or update represented by that information."],
  ["Rejected", "The authority did not accept it. The reason, response and original information remain connected."],
  ["Settled", "Payment, repayment or closure of the balance is evidenced. Merely knowing the amount is not settlement."],
  ["Corrected", "A later amendment or challenge stays connected to the original receipt."],
] as const;

const STARTING_POINTS = [
  {
    title: "My personal tax",
    description: "Start with your circumstances and find the checks that apply to you.",
    action: "Check my next steps",
    href: "/checkup",
    icon: UserRound,
  },
  {
    title: "My sole-trader tax",
    description: "Bring your business income and costs together, then review the figures.",
    action: "Prepare my business records",
    href: "/books/workspace?activity=self-employment",
    icon: BriefcaseBusiness,
  },
  {
    title: "My landlord tax",
    description: "Keep UK property income and costs separate from your other work.",
    action: "Prepare my property records",
    href: "/books/workspace?activity=uk-property",
    icon: House,
  },
] as const;

export default function FilePage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs items={[{ href: "/services", label: "Services" }]} current="Prepare a return" />
      <header className="mt-7 max-w-3xl">
        <p className="section-label">UK tax · preparation</p>
        <h1 className="hero-title mt-4 text-ink">Prepare a return.</h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">
          Get your records in order, understand the figures and know what to do next.
          Choose the part of your tax you want to work on.
        </p>
      </header>

      <aside aria-label="Filing availability" className="mt-7 rounded-2xl border border-warm/30 bg-warm/5 px-5 py-4 text-sm leading-6 text-ink-soft">
        <p className="font-semibold text-ink">Live filing with HMRC is not available in TaxSorted yet.</p>
        <p className="mt-1">
          You can organise records and prepare quarterly Income Tax figures here. A complete
          year-end return is not available. HMRC submissions here use its test system and do not
          file your tax.{" "}
          <a href="#official-filing" className="font-semibold text-accent underline underline-offset-4">
            Find the official filing route
          </a>.
        </p>
      </aside>

      <section aria-labelledby="starting-points-title" className="mt-10">
        <h2 id="starting-points-title" className="font-display text-2xl font-semibold text-ink">What are you preparing?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {STARTING_POINTS.map(({ title, description, action, href, icon: Icon }) => (
            <Link key={title} href={href} className="group flex flex-col rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-accent/50 hover:bg-accent-soft">
              <Icon aria-hidden="true" className="h-6 w-6 text-accent" strokeWidth={1.5} />
              <h3 className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h3>
              <p className="mt-3 grow text-sm leading-6 text-ink-soft">{description}</p>
              <span className="mt-6 flex min-h-11 items-center justify-between gap-3 text-sm font-semibold text-accent">
                {action}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Have more than one kind of income? Work through each that applies. These paths do not
          combine into a full Self Assessment return.
        </p>
      </section>

      <section aria-labelledby="prepare-title" className="mt-14 grid gap-8 border-t border-line pt-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="section-label">Pick up where you are</p>
          <h2 id="prepare-title" className="section-title mt-4 text-ink">What you can prepare today</h2>
          <p className="mt-4 text-sm leading-6 text-ink-soft">
            Your books stay in this browser. Download a backup from the workspace to keep a copy;
            signing in does not back them up.
          </p>
          <Link href="/books" className="mt-3 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">How record keeping works</Link>
        </div>
        <ol className="divide-y divide-line rounded-2xl border border-line bg-surface px-5 sm:px-6">
          <li className="py-5">
            <h3 className="font-semibold text-ink">1. Check your records</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Confirm the business, purpose and treatment of each money item. Items waiting for review stay out of tax figures.</p>
            <Link href="/books/workspace/money" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">Review my records →</Link>
          </li>
          <li className="py-5">
            <h3 className="font-semibold text-ink">2. Review quarterly Income Tax figures</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">See category totals from checked sole-trader or UK property records. These are not a tax bill or a complete annual return.</p>
            <div className="mt-2 flex flex-wrap gap-x-5">
              <Link href="/books/workspace/tax" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">See my quarterly totals →</Link>
              <Link href="/itsa/quarter" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">Review a quarterly update →</Link>
            </div>
          </li>
          <li className="py-5">
            <h3 className="font-semibold text-ink">3. Prepare a handover</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Use a Tax Position Passport to collect your facts, unanswered questions and evidence states for a professional. It is not a filed return.</p>
            <Link href="/passport" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">Build my handover →</Link>
          </li>
        </ol>
      </section>

      <section id="official-filing" aria-labelledby="official-title" className="mt-14 scroll-mt-24 rounded-[2rem] border border-accent/20 bg-accent-soft p-6 sm:p-8">
        <p className="section-label">When you need to file</p>
        <h2 id="official-title" className="section-title mt-3 text-ink">Continue with HMRC&apos;s guidance</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink-soft">Choose the route for your return. These links open GOV.UK; TaxSorted does not send your records with them.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {OFFICIAL_RETURN_ROUTES.map((route) => (
            <article key={route.id} className="rounded-2xl border border-accent/15 bg-surface p-5">
              <a href={route.href} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">{route.label} ↗</a>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{route.plain}</p>
              <p className="mt-3 text-xs text-ink-soft">{route.publisher} · checked {route.checkedOn}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-ink-soft">Check the guidance for your circumstances and tax year.</p>
      </section>

      <section aria-labelledby="practice-title" className="mt-14">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="practice-title" className="font-display text-2xl font-semibold text-ink">Explore the HMRC test journeys</h2>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">Test system only</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">Practice submissions do not satisfy a filing obligation. TaxSorted is not yet recognised for production filing.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-ink">Income Tax quarterly updates</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Review quarterly figures and explore approval and test receipts. Year-end adjustments and final returns are not available.</p>
            <Link href="/itsa" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">Explore Income Tax preparation and tests →</Link>
          </article>
          <article className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-ink">VAT returns</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Review manually entered figures and try a test submission. Starter Books does not yet derive a VAT return.</p>
            <Link href="/vat" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">Explore the VAT test journey →</Link>
          </article>
        </div>
      </section>

      <details className="mt-8 rounded-2xl border border-line bg-surface px-5 sm:px-6">
        <summary className="min-h-14 cursor-pointer py-5 font-semibold text-ink">What prepared, submitted and accepted mean</summary>
        <p className="border-t border-line pt-5 text-sm leading-6 text-ink-soft">These words describe different stages, not features all available today. A test receipt only records what happened in the test system.</p>
        <dl className="grid gap-x-8 gap-y-5 py-6 sm:grid-cols-2 lg:grid-cols-3">
          {STATES.map(([name, body]) => (
            <div key={name}>
              <dt className="font-semibold text-ink">{name}</dt>
              <dd className="mt-2 text-sm leading-6 text-ink-soft">{body}</dd>
            </div>
          ))}
        </dl>
      </details>

      <nav aria-label="More ways to get help" className="mt-8 flex flex-wrap gap-x-6 text-sm font-semibold text-accent">
        <Link href="/checkup" className="inline-flex min-h-11 items-center underline underline-offset-4">Not sure? Start a tax check</Link>
        <Link href="/plan" className="inline-flex min-h-11 items-center underline underline-offset-4">Plan before you act</Link>
        <Link href="/services" className="inline-flex min-h-11 items-center underline underline-offset-4">All services</Link>
      </nav>
    </div>
  );
}
