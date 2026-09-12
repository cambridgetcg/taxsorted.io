import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "File and pay — prepare, approve, submit, keep the receipt | TaxSorted",
  description:
    "Move from reviewed records to a prepared UK tax position without blurring preparation, approval, submission, receipt or payment.",
};

const STATES = [
  ["Prepared", "The figures and payload are ready for your review. Nothing has been authorised."],
  ["Approved", "You deliberately approved the exact action and information shown."],
  ["Submitted", "The exact approved payload reached the authority submission service, proven by a conclusive transport response. A click or pre-send failure is not submitted."],
  ["Delivery unknown", "An attempt ended without proof of delivery. It is not submitted, accepted or safe to retry blindly."],
  ["Received", "The authority returned an acknowledgement tied to the exact payload. Its meaning still needs to be read."],
  ["Accepted", "The authority explicitly accepted the return or update represented by that payload."],
  ["Rejected", "The authority did not accept it. The reason, response and original payload remain connected."],
  ["Settled", "Payment, repayment or closure of the balance is evidenced. Merely knowing the amount is not settlement."],
  ["Corrected", "A later amendment or challenge stays connected to the original receipt."],
] as const;

const LIVE_PATHS = [
  {
    title: "MTD Income Tax",
    state: "Preparation open · sandbox only",
    body: "Check eligibility, keep records, derive cumulative quarter figures and inspect the sandbox submission path.",
    href: "/itsa",
    action: "Open the Income Tax path",
  },
  {
    title: "VAT",
    state: "Preparation open · sandbox only",
    body: "Review manually entered VAT figures and approve a sandbox submission. Starter Books does not yet derive VAT returns.",
    href: "/vat",
    action: "Open the VAT path",
  },
  {
    title: "Starter Books",
    state: "Browser-local",
    body: "Review evidence and categories before any figure enters tax preparation.",
    href: "/books/workspace",
    action: "Review my records",
  },
  {
    title: "Tax Position Passport",
    state: "Portable handoff",
    body: "Carry stated facts, unknowns, evidence states and bounded answers to a professional without presenting it as a filed return.",
    href: "/passport",
    action: "Build my Passport",
  },
] as const;

export default function FilePage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <header className="max-w-4xl">
        <p className="section-label">File and pay · power to execute</p>
        <h1 className="hero-title mt-5 text-ink">Nothing moves without your eyes and consent.</h1>
        <p className="mt-7 max-w-3xl text-lg leading-8 text-ink-soft">
          Start from reviewed records, inspect every derived figure, approve the exact action, and
          keep the authority&apos;s receipt. TaxSorted is not yet recognised for production filing:
          the live submission paths remain HMRC sandbox practice, clearly labelled at every step.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/books" className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-7 font-semibold text-white hover:bg-accent-deep">
            Start from my books
          </Link>
          <Link href="/plan" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-surface px-6 font-medium text-ink hover:border-accent hover:bg-accent-soft">
            Compare choices first
          </Link>
        </div>
      </header>

      <section aria-labelledby="states-title" className="mt-24">
        <p className="section-label">01 · Words with exact meanings</p>
        <h2 id="states-title" className="section-title mt-4 text-ink">“Filed” is not one state.</h2>
        <ol className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line sm:grid-cols-2 lg:grid-cols-3">
          {STATES.map(([name, body], index) => (
            <li key={name} className="bg-surface p-6">
              <span aria-hidden="true" className="font-display text-3xl text-accent">0{index + 1}</span>
              <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="paths-title" className="mt-24">
        <p className="section-label">02 · Available paths</p>
        <h2 id="paths-title" className="section-title mt-4 text-ink">Use what is live. See what is not.</h2>
        <div className="hairline-grid mt-8 grid overflow-hidden rounded-[2rem] border border-line md:grid-cols-2">
          {LIVE_PATHS.map((path) => (
            <article key={path.title} className="bg-surface p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">{path.state}</p>
              <h3 className="mt-3 font-display text-2xl font-semibold text-ink">{path.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{path.body}</p>
              <Link href={path.href} className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline decoration-line-strong underline-offset-4 hover:text-accent-deep">
                {path.action} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="spine-title" className="mt-24 rounded-[2rem] border border-line bg-paper p-6 sm:p-8">
        <p className="section-label">03 · The compliance spine</p>
        <h2 id="spine-title" className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">Actual evidence becomes an accountable receipt.</h2>
        <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Compliance journey">
          {["Evidence", "Event", "Books", "Accounts", "Tax", "Approval", "Submission", "Receipt"].map((step, index) => (
            <li key={step} className="rounded-2xl border border-line bg-surface p-4">
              <span className="text-xs font-semibold text-accent">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-1 font-semibold text-ink">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm leading-6 text-ink-soft">
          Planning scenarios never enter this spine silently. Once you act, the resulting real-world
          evidence joins through the Evidence door like every other record.
        </p>
      </section>

      <aside className="mt-10 rounded-[2rem] border border-warm/40 bg-warm/5 p-6 text-sm leading-6 text-ink-soft">
        <strong className="text-ink">Current production boundary:</strong>{" "}
        TaxSorted does not claim that VAT or MTD Income Tax submissions can be filed to HMRC in
        production. Do not mistake a prepared calculation, sandbox response or local receipt for a
        production filing acknowledgement.
      </aside>
    </div>
  );
}
