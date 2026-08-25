import type { Metadata } from "next";
import Link from "next/link";
import { RecourseSourceFreshness } from "./source-freshness";

export const metadata: Metadata = {
  title: "Put it right — correct, appeal or get help | TaxSorted",
  description:
    "A calm UK route for correcting records and returns, challenging an HMRC decision, complaining about service or getting help when tax cannot be paid on time.",
};

const ROUTES = [
  {
    number: "01",
    title: "My records or calculation are wrong",
    body: "Correct the underlying evidence or record first, rebuild every derived figure, and keep the old version connected to the correction. Never edit an authority receipt into saying something new.",
    links: [
      ["Open Starter Books", "/books/workspace", false],
      ["Review an MTD quarter (sandbox only)", "/itsa/quarter", false],
    ],
  },
  {
    number: "02",
    title: "I need to amend a filed return",
    body: "HMRC says a filed Self Assessment return can normally be corrected within 12 months of the filing deadline. VAT errors have their own amount, period and deliberate-error rules. Check the tax, period and current instructions before acting.",
    links: [
      ["HMRC — change a Self Assessment return", "https://www.gov.uk/self-assessment-tax-returns/corrections", true],
      ["HMRC — correct errors in a VAT return", "https://www.gov.uk/submit-vat-return/correct-errors-in-your-vat-return", true],
    ],
  },
  {
    number: "03",
    title: "I disagree with an HMRC decision or penalty",
    body: "Read the decision letter first. It says whether and how to appeal. HMRC says the deadline is usually 30 days; a statutory review is carried out by a different officer, and tribunal rights may remain afterward.",
    links: [
      ["HMRC — disagree with a decision", "https://www.gov.uk/tax-appeals/decision", true],
      ["HMRC — ask for a statutory review", "https://www.gov.uk/tax-appeals/review-of-a-tax-or-penalty-decision", true],
      ["Tax tribunal overview", "https://www.gov.uk/tax-tribunal", true],
    ],
  },
  {
    number: "04",
    title: "I cannot pay on time",
    body: "Do not turn silence into a plan. HMRC may agree monthly instalments based on the tax, your circumstances and affordability. Contacting HMRC and agreeing Time to Pay does not erase the tax or necessarily stop interest.",
    links: [["HMRC — payment plans and Time to Pay", "https://www.gov.uk/difficulties-paying-hmrc/pay-in-instalments", true]],
  },
  {
    number: "05",
    title: "HMRC’s service was the problem",
    body: "A complaint is for service failures such as delay, communication or case handling. It is not a substitute for an appeal against the tax or penalty itself. HMRC’s complaint route has first- and second-tier review stages.",
    links: [["HMRC — make a complaint", "https://www.gov.uk/complain-about-hmrc", true]],
  },
  {
    number: "06",
    title: "I need extra support or another person to help",
    body: "Health, disability, financial hardship or personal circumstances can change how help should be provided. Authority for someone to speak with HMRC is separate from authority to edit records, file, pay or conduct a dispute.",
    links: [
      ["HMRC — extra support", "https://www.gov.uk/get-help-hmrc-extra-support", true],
      ["HMRC — dealing with HMRC", "https://www.gov.uk/browse/tax/dealing-with-hmrc", true],
    ],
  },
  {
    number: "07",
    title: "I have not declared some income",
    body: "Use HMRC’s disclosure route rather than trying to make later records look as if the income was always present. The correct route depends on the tax, years involved and whether a return was already filed.",
    links: [["HMRC — tell HMRC about undeclared income", "https://www.gov.uk/undeclared-income", true]],
  },
] as const;

const EVIDENCE = [
  "The decision, penalty, return or receipt exactly as received",
  "A short timeline: what happened, when, and who said what",
  "The facts and records that support the figure you say is right",
  "Your calculation, assumptions, sources and the tax period involved",
  "Copies of messages, letters, submissions and delivery acknowledgements",
  "The remedy you are asking for, stated plainly",
] as const;

export default function PutItRightPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-center lg:gap-14">
        <div className="max-w-4xl">
          <p className="section-label">Put it right · power to challenge</p>
          <h1 className="hero-title mt-5 text-ink">A mistake is not the end of the road.</h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-ink-soft">
            Correct your own records, amend a return, challenge a decision, complain about service,
            or ask for help paying. The right route depends on what is wrong, so TaxSorted keeps
            correction, appeal, complaint and payment support separate.
          </p>
        </div>
        <aside className="soft-shadow rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
          <p className="section-label">Start here</p>
          <ol className="mt-5 space-y-4 text-sm leading-6 text-ink-soft">
            <li><strong className="text-ink">1. Name the thing.</strong> Record, return, bill, penalty, decision, service or payment problem?</li>
            <li><strong className="text-ink">2. Read the notice.</strong> It carries the route, reference and deadline that matter.</li>
            <li><strong className="text-ink">3. Preserve the proof.</strong> Correct by adding a connected version, not rewriting history.</li>
            <li><strong className="text-ink">4. Act deliberately.</strong> Keep what you sent and what came back.</li>
          </ol>
        </aside>
      </header>

      <RecourseSourceFreshness />

      <section aria-labelledby="routes-title" className="mt-24">
        <p className="section-label">01 · Choose the right route</p>
        <h2 id="routes-title" className="section-title mt-4 text-ink">What needs putting right?</h2>
        <div className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line md:grid-cols-2 lg:grid-cols-3">
          {ROUTES.map((route) => (
            <article key={route.number} className="bg-surface p-6">
              <span aria-hidden="true" className="font-display text-3xl text-accent">{route.number}</span>
              <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{route.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{route.body}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {route.links.map(([label, href, external]) => (
                  <li key={href}>
                    {external ? (
                      <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-accent underline underline-offset-4 hover:text-accent-deep">{label} ↗ <span className="sr-only">(opens in a new tab)</span></a>
                    ) : (
                      <Link href={href} className="font-medium text-accent underline underline-offset-4 hover:text-accent-deep">{label} →</Link>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="evidence-title" className="mt-24 grid gap-7 rounded-[2rem] border border-line bg-paper p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.7fr)]">
        <div>
          <p className="section-label">02 · Build the evidence pack</p>
          <h2 id="evidence-title" className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">Make the disagreement inspectable.</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {EVIDENCE.map((item) => (
              <li key={item} className="rounded-2xl border border-line bg-surface p-4 text-sm leading-6 text-ink-soft">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <aside className="rounded-2xl border border-warm/40 bg-warm/5 p-5 text-sm leading-6 text-ink-soft">
          <h3 className="font-display text-2xl font-semibold text-ink">Urgent means the real deadline.</h3>
          <p className="mt-3">
            TaxSorted does not run a countdown or manufacture pressure. A decision letter or
            statutory rule may impose a real time limit. Use the date and route on the notice and
            seek suitable help promptly if the amount, facts or consequences are material.
          </p>
          <p className="mt-3">
            This page explains public routes. It does not assess the merits of a real dispute,
            accept confidential case files or act for you before HMRC or a tribunal.
          </p>
        </aside>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/checkup" className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-deep">Check my wider position</Link>
      </div>
    </div>
  );
}
