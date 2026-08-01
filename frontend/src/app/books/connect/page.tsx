import type { Metadata } from "next";
import Link from "next/link";
import { HMRC_MODULES } from "@taxsorted/engine/uk/hmrc";
import {
  ACCOUNTING_SOURCES,
  OFFICIAL_FILING_HELP,
  RECORDS_TO_RECEIPT,
  type DeliveryState,
} from "@/lib/accounting-integrations";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = {
  title: "Connect records to tax — without losing the trail | TaxSorted",
  description:
    "A plain source-to-receipt path for bank CSV, planned accounting providers and separate HMRC VAT and Income Tax modules.",
};

const STATE_STYLE: Record<DeliveryState, string> = {
  "open-now": "bg-green-50 text-green-800",
  "partly-open": "bg-blue-50 text-blue-800",
  next: "bg-amber-50 text-amber-900",
  planned: "bg-paper text-ink-soft",
  "sandbox-only": "bg-violet-50 text-violet-800",
};

const FINISHED_FLOW_TARGETS = [
  {
    title: "Connection truth",
    body: "See the chosen organisation, access used, last complete sync, coverage gaps and the exact recovery step. Connected never means reconciled.",
  },
  {
    title: "One readiness queue",
    body: "Uncategorised, unexplained, duplicated, changed, late, unsupported and missing-evidence items meet in one place before filing.",
  },
  {
    title: "Every total opens",
    body: "Move from a return box or Income Tax category to mapped records, source evidence, the reason for the treatment and current official guidance.",
  },
  {
    title: "Filing is not one tick",
    body: "Prepared, approved, declared, submitting, accepted, rejected, marked elsewhere, paid and corrected remain distinct inspectable states.",
  },
] as const;

export default function BooksConnectPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/books", label: "Books" }]} current="Connect records" />

      <header className="mt-4 max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Records → tax → receipt
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Connect records. Keep each boundary clear.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          Bring accounting records into one visible review path, then connect only the HMRC tax
          module you need. A source connection never means the books are checked, and a prepared
          figure never means it was filed.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/books/workspace?start=csv"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-7 text-base font-semibold text-white hover:bg-accent-deep"
          >
            Import a bank CSV
          </Link>
          <Link
            href="/books/workspace?start=manual"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-6 text-base font-medium text-ink hover:bg-accent-soft"
          >
            Add one transaction
          </Link>
          {process.env.NODE_ENV !== "production" ? (
            <Link
              href="/books/connect/demo"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-violet-300 bg-violet-50 px-6 text-base font-semibold text-violet-900 hover:bg-violet-100"
            >
              Try the made-up connector proof
            </Link>
          ) : null}
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          CSV is open now and stays in this browser. Xero, QuickBooks, FreeAgent and Sage
          connectors are not live, so this page cannot ask them for access or collect provider
          data. The local-development proof uses fictional records only.
        </p>
      </header>

      <section aria-labelledby="flow-title" className="mt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          The actual path
        </p>
        <h2 id="flow-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">
          One line from source to receipt
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          Open steps work now. The others name the missing gate rather than hiding it behind a
          green connection light.
        </p>
        <ol className="mt-7 grid gap-4 lg:grid-cols-2">
          {RECORDS_TO_RECEIPT.map((step) => (
            <li key={step.number} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                >
                  {step.number}
                </span>
                <h3 className="text-xl font-semibold text-ink">{step.name}</h3>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[step.state]}`}>
                  {step.stateLabel}
                </span>
              </div>
              <p className="mt-3 text-ink-soft">{step.plain}</p>
              <p className="mt-3 rounded-xl bg-paper p-3 text-sm text-ink">
                <strong>Proof:</strong> {step.proof}
              </p>
              {step.action ? (
                <Link
                  href={step.action.href}
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
                >
                  {step.action.label} →
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="sources-title" className="mt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Accounting sources
        </p>
        <h2 id="sources-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">
          One review boundary, different capabilities
        </h2>
        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {ACCOUNTING_SOURCES.map((source) => (
            <article key={source.id} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-ink">{source.name}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    source.state === "open-now" ? STATE_STYLE["open-now"] : STATE_STYLE.planned
                  }`}
                >
                  {source.stateLabel}
                </span>
              </div>
              <p className="mt-3 text-ink-soft">{source.plain}</p>
              <p className="mt-4 text-sm font-semibold text-ink">
                {source.state === "planned" ? "The planned adapter must keep" : "The source trail keeps"}
              </p>
              <ul className="mt-2 grid gap-1 text-sm text-ink-soft sm:grid-cols-2">
                {source.keeps.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl border border-line bg-paper p-3 text-sm text-ink">
                <strong>Boundary:</strong> {source.boundary}
              </p>
              {source.action ? (
                <Link
                  href={source.action.href}
                  className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
                >
                  {source.action.label} →
                </Link>
              ) : null}
              {source.needSoftware ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line p-3 text-sm">
                    <p className="font-semibold text-ink">Already use it</p>
                    <p className="mt-1 text-ink-soft">
                      Connector not live. No access request is shown until it is built and has its
                      own off-switch.
                    </p>
                  </div>
                  <div className="rounded-xl border border-line p-3 text-sm">
                    <p className="font-semibold text-ink">Need accounting software</p>
                    <a
                      href={source.needSoftware.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
                    >
                      {source.needSoftware.label} ↗
                    </a>
                    <p className="text-xs text-ink-soft">
                      Neutral official link. No referral or suitability claim.
                    </p>
                  </div>
                </div>
              ) : null}
              <ul className="mt-3 space-y-1 text-sm">
                {source.official.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent underline underline-offset-4 hover:text-accent-deep"
                    >
                      {item.publisher} — {item.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="hmrc-title" className="mt-16 rounded-3xl border border-line bg-paper p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Separate HMRC modules
        </p>
        <h2 id="hmrc-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">
          Connect only the tax module you need
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          VAT and Income Tax use separate permissions, identifiers, obligations and receipts.
          TaxSorted keeps each connection independent, so one module can be reauthorised or
          disconnected without silently moving the other.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-ink">VAT</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_STYLE["sandbox-only"]}`}>
                Test service only
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              HMRC obligations, return submission, receipts and liability lookup exist in the
              practice backend. Payments and penalties are not built, and the current screen does
              not yet show liabilities. Starter Books does not yet derive a VAT return, and
              TaxSorted makes no production-filing claim.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              <Link href="/vat" className="text-accent underline underline-offset-4">
                Open VAT practice →
              </Link>
              <a
                href={HMRC_MODULES.vat.official.guidanceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent underline underline-offset-4"
              >
                Official VAT guidance ↗
              </a>
              <a
                href={HMRC_MODULES.vat.official.developerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent underline underline-offset-4"
              >
                HMRC VAT developer guide ↗
              </a>
            </div>
          </article>

          <article className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-ink">Income Tax</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_STYLE["sandbox-only"]}`}>
                Quarterly test service
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Status, obligations, business IDs, cumulative quarterly updates, a narrow in-year
              calculation and receipts work in the sandbox. Year-end adjustments, other income,
              final declaration, liabilities and payment follow-through are not live.
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              <Link href="/dashboard" className="text-accent underline underline-offset-4">
                Connect Income Tax practice →
              </Link>
              <Link href="/itsa/quarter" className="text-accent underline underline-offset-4">
                Review a quarter →
              </Link>
              <a
                href={HMRC_MODULES.itsa.official.guidanceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent underline underline-offset-4"
              >
                Official MTD Income Tax guidance ↗
              </a>
              <a
                href={HMRC_MODULES.itsa.official.developerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-accent underline underline-offset-4"
              >
                HMRC Income Tax guide ↗
              </a>
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="promise-title" className="mt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Gaps the finished flow must close
        </p>
        <h2 id="promise-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">
          What the next integrations must make true
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          These are product commitments, not claims about today&apos;s build. The delivery state for
          each working step remains shown above.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FINISHED_FLOW_TARGETS.map((promise) => (
            <article key={promise.title} className="rounded-2xl border border-line bg-white p-5">
              <h3 className="text-lg font-semibold text-ink">{promise.title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{promise.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="official-title" className="mt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Official help, in filing order
        </p>
        <h2 id="official-title" className="mt-2 text-3xl font-bold tracking-tight text-ink">
          Open the authority, not a blog summary
        </h2>
        <p className="mt-3 max-w-3xl text-ink-soft">
          These links follow the work from deciding whether MTD applies through records,
          quarterly updates, year-end adjustments, the return, payment, corrections and VAT
          digital links. Each was checked on 1 August 2026.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {OFFICIAL_FILING_HELP.map((item) => (
            <li key={item.href} className="rounded-xl border border-line bg-white p-4">
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
              >
                {item.label} ↗
              </a>
              <p className="mt-1 text-xs text-ink-soft">
                {item.publisher} · checked {item.checkedOn}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <aside className="mt-12 rounded-2xl border border-line bg-accent-soft p-5 text-sm text-ink">
        <strong>Honest boundary:</strong> sign-in connections to accounting providers are not live,
        reconciliation is the next gate, HMRC filing is sandbox-only, and TaxSorted is not yet
        recognised for production filing. For the authority&apos;s current rules and steps, read{" "}
        <a
          href={HMRC_MODULES.itsa.official.guidanceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="font-semibold text-accent underline underline-offset-4"
        >
          GOV.UK&apos;s MTD Income Tax guidance ↗
        </a>
        .
      </aside>
    </div>
  );
}
