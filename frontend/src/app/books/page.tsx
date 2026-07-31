import type { Metadata } from "next";
import Link from "next/link";
import { TransactionWalkthrough } from "./transaction-walkthrough";

export const metadata: Metadata = {
  title: "Books — accounting you can understand | TaxSorted",
  description:
    "UK Starter Books for sole traders and landlords, built as the first step towards accounting software people can inspect from evidence to tax rule.",
};

const AUDIENCES = [
  {
    title: "Sole trader",
    status: "Open now",
    body: "Bring in a bank CSV, review each movement, keep a source trail and derive UK Income Tax quarter figures.",
    href: "/books/workspace",
    action: "Open Starter Books",
  },
  {
    title: "UK landlord",
    status: "Open now",
    body: "Keep UK property income and costs separate, review the proposed category and derive running totals.",
    href: "/books/workspace?activity=uk-property",
    action: "Open property books",
  },
  {
    title: "Individual",
    status: "Bounded tools open",
    body: "Map what changed, keep your known facts and unknowns, and follow source-backed personal-tax checks.",
    href: "/checkup",
    action: "Start a Tax Checkup",
  },
  {
    title: "Limited company or small organisation",
    status: "Not yet",
    body: "TaxSorted does not yet prepare statutory accounts, a balance sheet or a Company Tax Return. We name that gap before asking for data.",
    href: "/feedback",
    action: "Tell us what you need",
  },
] as const;

const STACK = [
  {
    number: "1",
    name: "Evidence",
    plain: "What proves the event?",
    deep: "Invoice, receipt, statement, contract, source identity and revision.",
    now: "Source trail now; document attachments not yet.",
  },
  {
    number: "2",
    name: "Event",
    plain: "What actually happened?",
    deep: "Date, parties, amount, currency, cash direction, purpose and review state.",
    now: "Local accounting events are open now.",
  },
  {
    number: "3",
    name: "Books",
    plain: "Where does it belong?",
    deep: "Journal, ledger, account, debit, credit, corrections and reconciliation.",
    now: "Cash and tax postings now; full double-entry is not yet claimed.",
  },
  {
    number: "4",
    name: "Accounts",
    plain: "What does the business look like?",
    deep: "Turnover, costs, profit and loss, assets, debts, capital and balance sheet.",
    now: "Running income and cost totals now; statutory accounts not yet.",
  },
  {
    number: "5",
    name: "Tax",
    plain: "Which local rules change the accounts?",
    deep: "Jurisdiction, taxpayer, period, allowances, disallowances, adjustments and cited law.",
    now: "Bounded UK rules with dates and sources.",
  },
  {
    number: "6",
    name: "File",
    plain: "What was sent, when, and what came back?",
    deep: "Prepared return, human approval, submission, authority response and receipt.",
    now: "HMRC sandbox paths only; no production filing claim.",
  },
] as const;

export default function BooksPage() {
  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Starter Books for UK sole traders and landlords
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Know where every number came from.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          TaxSorted is growing into accounting software for people and small organisations
          without an in-house accounting team. Open today: local record-keeping for one UK sole
          trade or one UK property business. Start with money in and money out; open the deeper
          layers only when you want them.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/books/workspace"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-deep"
          >
            Start my books
          </Link>
          <a
            href="#example"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-6 text-base font-medium text-ink transition-colors hover:bg-accent-soft"
          >
            Play with one sale
          </a>
        </div>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm text-ink-soft" aria-label="Books promises">
          <li className="rounded-full border border-line bg-white px-3 py-1">No account to start</li>
          <li className="rounded-full border border-line bg-white px-3 py-1">Records stay in this browser</li>
          <li className="rounded-full border border-line bg-white px-3 py-1">Suggestions wait for your review</li>
          <li className="rounded-full border border-line bg-white px-3 py-1">Nothing filed silently</li>
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          Browser storage is not a cloud backup and is not encrypted by a TaxSorted Account.
          Clearing site data can erase these books; export them for a portable backup.
        </p>
      </header>

      <section aria-labelledby="who-title" className="mt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Begin where you are
        </p>
        <h2 id="who-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">
          Built wide. Open honestly.
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          The aim is accounting for every kind of person and organisation. The live UK product is
          narrower today, so each door says exactly what exists.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <article key={audience.title} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-ink">{audience.title}</h3>
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-deep">
                  {audience.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{audience.body}</p>
              <Link
                href={audience.href}
                className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
              >
                {audience.action} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <TransactionWalkthrough />

      <section id="stack" aria-labelledby="stack-title" className="mt-16 scroll-mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Beginner-friendly by going deep
        </p>
        <h2 id="stack-title" className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          One calm surface. Six inspectable layers.
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Simple does not mean hiding the machinery. It means showing the right layer first and
          keeping every deeper layer close enough to inspect.
        </p>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {STACK.map((layer) => (
            <li key={layer.number} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                >
                  {layer.number}
                </span>
                <h3 className="text-xl font-semibold text-ink">{layer.name}</h3>
              </div>
              <p className="mt-3 font-medium text-ink">{layer.plain}</p>
              <p className="mt-1 text-sm text-ink-soft">{layer.deep}</p>
              <p className="mt-3 rounded-xl bg-paper p-3 text-sm text-ink">
                <strong>Today:</strong> {layer.now}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="source-title" className="mt-16 rounded-3xl border border-line bg-paper p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">The UK boundary</p>
        <h2 id="source-title" className="mt-2 text-2xl font-bold tracking-tight text-ink">
          Official rules stay one click away
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          For many UK sole traders, cash basis records income when money is received and expenses
          when paid. Limited companies follow different accounting and filing duties. TaxSorted
          keeps those worlds separate.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>
            <a
              href="https://www.gov.uk/simpler-income-tax-cash-basis"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-accent underline underline-offset-4"
            >
              GOV.UK — cash basis for sole traders and partnerships ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.gov.uk/self-employed-records/what-records-to-keep"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-accent underline underline-offset-4"
            >
              GOV.UK — records and proof a self-employed person keeps ↗
            </a>
          </li>
          <li>
            <a
              href="https://www.gov.uk/running-a-limited-company/company-and-accounting-records"
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-accent underline underline-offset-4"
            >
              GOV.UK — company and accounting records ↗
            </a>
          </li>
        </ul>
      </section>

      <aside className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 text-sm text-ink">
        <strong>Honest boundary:</strong> TaxSorted is education and preparation software. The
        current books cover UK self-employment and UK property cash movements; they are not yet a
        complete general ledger or statutory-accounts product. Tax depends on your full facts.
      </aside>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/books/workspace"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-7 text-base font-semibold text-white hover:bg-accent-deep"
        >
          Open my local books
        </Link>
        <Link
          href="/checkup"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-6 text-base font-medium text-ink hover:bg-accent-soft"
        >
          I need a tax check first
        </Link>
      </div>
    </div>
  );
}
