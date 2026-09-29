import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileUp, PencilLine } from "lucide-react";
import { HMRC_MODULES } from "@taxsorted/engine/uk/hmrc";
import { ACCOUNTING_SOURCES, OFFICIAL_FILING_HELP, RECORDS_TO_RECEIPT } from "@/lib/accounting-integrations";
import { BooksActivityLink } from "@/components/books/activity-link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Bring in your records | TaxSorted",
  description:
    "Import a bank CSV or add money by hand, review your records and prepare quarterly figures. See which accounting connections are still planned.",
};

const csvSource = ACCOUNTING_SOURCES.find((source) => source.id === "csv")!;
const providers = ACCOUNTING_SOURCES.filter((source) => source.id !== "csv");

const NEXT_STEPS = [
  {
    title: "Check your business",
    body: "Make sure each group of records belongs to one sole-trader or UK property business.",
    href: "/books/workspace/business",
    action: "Check my business",
  },
  {
    title: "Review money in and out",
    body: "Check each imported or added item before it counts towards your figures.",
    href: "/books/workspace/money",
    action: "Review my records",
  },
  {
    title: "See quarterly totals",
    body: "Follow checked records into Income Tax categories, with each business kept separate.",
    href: "/books/workspace/tax",
    action: "See my quarterly totals",
  },
] as const;

export default function BooksConnectPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Breadcrumbs items={[{ href: "/services", label: "Services" }, { href: "/books", label: "Keep records" }]} current="Bring in records" />

      <header className="mt-7 max-w-3xl">
        <p className="section-label">Your records · your starting point</p>
        <h1 className="hero-title mt-4 text-ink">Bring in your records.</h1>
        <p className="mt-5 text-lg leading-8 text-ink-soft">
          Start with a bank file or add money by hand. Review what each item was for,
          then see the figures for your sole trade or UK property business.
        </p>
      </header>

      <section aria-labelledby="start-title" className="mt-8">
        <h2 id="start-title" className="sr-only">Choose how to add records</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="flex flex-col rounded-[2rem] border border-accent/25 bg-accent-soft p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <FileUp aria-hidden="true" className="h-7 w-7 text-accent" strokeWidth={1.5} />
              <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-accent">Available now</span>
            </div>
            <h3 className="mt-5 font-display text-3xl font-semibold text-ink">I have a bank CSV</h3>
            <p className="mt-3 grow text-sm leading-6 text-ink-soft">
              Choose a file with one amount column: positive for money in, negative for money out.
              You will review every row before it counts.
            </p>
            <BooksActivityLink href={csvSource.action!.href} className="mt-6 inline-flex min-h-12 items-center justify-between gap-4 rounded-xl bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-deep">
              {csvSource.action!.label}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </BooksActivityLink>
          </article>
          <article className="flex flex-col rounded-[2rem] border border-line bg-surface p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <PencilLine aria-hidden="true" className="h-7 w-7 text-accent" strokeWidth={1.5} />
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">Available now</span>
            </div>
            <h3 className="mt-5 font-display text-3xl font-semibold text-ink">I want to add money by hand</h3>
            <p className="mt-3 grow text-sm leading-6 text-ink-soft">
              Record a payment or expense with its date, amount and purpose. A useful place to start
              if you have only a few items.
            </p>
            <BooksActivityLink href="/books/workspace/money?start=manual" className="mt-6 inline-flex min-h-12 items-center justify-between gap-4 rounded-xl border border-line-strong px-5 py-3 font-semibold text-accent hover:border-accent hover:bg-accent-soft">
              Add a money item<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </BooksActivityLink>
          </article>
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-soft">
          No account needed. Records stay in this browser; signing in does not back them up.
          Download a backup in your books before clearing browser data.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 text-sm font-semibold text-accent">
          <BooksActivityLink href="/books/workspace/money" className="inline-flex min-h-11 items-center underline underline-offset-4">Continue reviewing my records</BooksActivityLink>
          <a href="#accounting-sources" className="inline-flex min-h-11 items-center underline underline-offset-4">I use accounting software</a>
        </div>
        <details className="mt-4 rounded-xl border border-line bg-surface px-4">
          <summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold text-ink">CSV format and current limits</summary>
          <div className="border-t border-line py-4 text-sm leading-6 text-ink-soft">
            <p>{csvSource.boundary}</p>
            <p className="mt-2">Keep your original receipts and invoices separately; attachments are not stored in these books.</p>
            {csvSource.official.map((source) => (
              <a key={source.href} href={source.href} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex min-h-11 items-center text-accent underline underline-offset-4">{source.publisher} — {source.label} ↗</a>
            ))}
          </div>
        </details>
      </section>

      <section aria-labelledby="next-title" className="mt-14 border-t border-line pt-10">
        <p className="section-label">After adding your records</p>
        <h2 id="next-title" className="section-title mt-3 text-ink">Three steps to useful figures</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {NEXT_STEPS.map((step, index) => (
            <li key={step.href} className="flex flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <span aria-hidden="true" className="font-mono text-sm text-accent">0{index + 1}</span>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 grow text-sm leading-6 text-ink-soft">{step.body}</p>
              <BooksActivityLink href={step.href} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">{step.action} →</BooksActivityLink>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm leading-6 text-ink-soft">
          Importing records does not confirm your books are complete or reconciled. Quarterly
          totals are prepared figures, not tax due or a filed return.{" "}
          <Link href="/file" className="font-semibold text-accent underline underline-offset-4">See what you can prepare</Link>.
        </p>
      </section>

      <section id="accounting-sources" aria-labelledby="providers-title" className="mt-14 scroll-mt-24">
        <p className="section-label">Accounting software</p>
        <h2 id="providers-title" className="section-title mt-3 text-ink">Already keep your books elsewhere?</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink-soft">
          Public connections to these providers are not available yet. This page cannot ask them
          for access or import their records. You can use a compatible bank CSV in the meantime.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {providers.map((source) => (
            <article key={source.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-2xl font-semibold text-ink">{source.name}</h3>
                <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-soft">{source.stateLabel}</span>
              </div>
              <details className="mt-3">
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-accent">Plans, limits and official links for {source.name}</summary>
                <div className="space-y-3 border-t border-line pt-4 text-sm leading-6 text-ink-soft">
                  {source.availabilityNote ? (
                    <p className="rounded-xl bg-surface-muted p-3 text-ink">{source.availabilityNote}</p>
                  ) : null}
                  <p>{source.plain}</p>
                  <p><strong className="text-ink">Current limits:</strong> {source.boundary}</p>
                  <p><strong className="text-ink">The planned connection must keep:</strong> {source.keeps.join(", ")}.</p>
                  {source.needSoftware ? (
                    <div>
                      <a href={source.needSoftware.href} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4">{source.needSoftware.label} ↗</a>
                      <p className="text-xs">Official provider link. No referral or suitability claim.</p>
                    </div>
                  ) : null}
                  <ul className="space-y-1">
                    {source.official.map((link) => (
                      <li key={link.href}>
                        <a href={link.href} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">{link.publisher} — {link.label} ↗</a>
                        <p className="text-xs">Source checked {link.checkedOn}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="hmrc-title" className="mt-14 rounded-[2rem] border border-line bg-surface-muted/60 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="hmrc-title" className="font-display text-2xl font-semibold text-ink">HMRC test connections</h2>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">Test system only</span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-soft">
          VAT and Income Tax connect separately. A test submission does not file your tax.
          TaxSorted is not yet recognised for production filing.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-ink">Income Tax</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Prepare quarterly updates from reviewed records and explore test submissions and receipts. A complete year-end return is not available.</p>
            <div className="mt-3 flex flex-wrap gap-x-5 text-sm font-semibold text-accent">
              <Link href="/itsa/quarter" className="inline-flex min-h-11 items-center underline underline-offset-4">Review a quarterly update →</Link>
              <Link href="/dashboard" className="inline-flex min-h-11 items-center underline underline-offset-4">Open Income Tax test connection →</Link>
            </div>
          </article>
          <article className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-semibold text-ink">VAT</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Review manually entered VAT figures and try a test submission. Starter Books does not yet derive a VAT return.</p>
            <Link href="/vat" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">Open VAT test journey →</Link>
          </article>
        </div>
      </section>

      <details className="mt-8 rounded-2xl border border-line bg-surface px-5 sm:px-6">
        <summary className="min-h-14 cursor-pointer py-5 font-semibold text-ink">What connects today and what comes next</summary>
        <p className="border-t border-line pt-5 text-sm leading-6 text-ink-soft">These are the delivery states for the full records-to-receipt journey. Planned steps do not describe a working feature.</p>
        <ol className="divide-y divide-line">
          {RECORDS_TO_RECEIPT.map((step) => (
            <li key={step.number} className="py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-ink">{step.number}. {step.name}</h3>
                <span className="text-xs font-semibold text-ink-soft">{step.stateLabel}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{step.plain}</p>
              <p className="mt-2 text-sm leading-6 text-ink">{step.proof}</p>
              {step.action ? (
                <BooksActivityLink href={step.action.href} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">{step.action.label} →</BooksActivityLink>
              ) : null}
            </li>
          ))}
        </ol>
        {process.env.NODE_ENV !== "production" ? (
          <Link href="/books/connect/demo" className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline underline-offset-4">Open the fictional connector test →</Link>
        ) : null}
      </details>

      <details className="mt-4 rounded-2xl border border-line bg-surface px-5 sm:px-6">
        <summary className="min-h-14 cursor-pointer py-5 font-semibold text-ink">Official guidance and integration sources</summary>
        <div className="border-t border-line py-5">
          <p className="text-sm leading-6 text-ink-soft">Source checks below are dated. Open the official guidance for the current rules and your circumstances.</p>
          <ol className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {OFFICIAL_FILING_HELP.map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline underline-offset-4">{item.label} ↗</a>
                <p className="text-xs text-ink-soft">{item.publisher} · checked {item.checkedOn}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-x-5 border-t border-line pt-3 text-sm text-accent">
            <a href={HMRC_MODULES.vat.official.guidanceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center underline underline-offset-4">Official VAT guidance ↗</a>
            <a href={HMRC_MODULES.itsa.official.guidanceUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center underline underline-offset-4">Official MTD Income Tax guidance ↗</a>
            <a href={HMRC_MODULES.vat.official.developerUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center underline underline-offset-4">HMRC VAT developer guide ↗</a>
            <a href={HMRC_MODULES.itsa.official.developerUrl} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center underline underline-offset-4">HMRC Income Tax developer guide ↗</a>
          </div>
        </div>
      </details>

      <nav aria-label="More ways to get help" className="mt-8 flex flex-wrap gap-x-6 text-sm font-semibold text-accent">
        <Link href="/checkup" className="inline-flex min-h-11 items-center underline underline-offset-4">Not sure where to start? Check my tax</Link>
        <Link href="/services" className="inline-flex min-h-11 items-center underline underline-offset-4">All services</Link>
      </nav>
    </div>
  );
}
