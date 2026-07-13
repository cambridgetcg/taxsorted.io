"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DemoNotice } from "@/components/demo-notice";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";

const EXAMPLE = {
  periodKey: "26A2",
  start: "2026-04-01",
  end: "2026-06-30",
  due: "2026-08-07",
  illustrativeBalance: 2500,
};

interface VATPageClientProps {
  entityId: string;
}

/** The fixed legacy exhibit; the real account-backed VAT cockpit is `/vat`. */
export default function VATPortalPage({ entityId }: VATPageClientProps) {
  return (
    <div className="min-h-[70vh] bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 space-y-6">
          <DemoNotice title="Fictional VAT workspace">
            This legacy exhibit uses fixed example data. It is not an account, has no HMRC
            connection, and cannot save or file a return.
          </DemoNotice>

          <header>
            <p className="text-sm font-semibold text-accent">Legacy example</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Explore a fictional VAT period
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-ink-soft">
              The dates and balance below are fixed illustrations. Use them to understand the
              draft calculator without presenting any invented account state as real.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <section className="rounded-lg border border-line bg-white p-5 sm:p-6" aria-labelledby="example-period-heading">
              <h2 id="example-period-heading" className="text-lg font-semibold text-ink">
                Fictional period
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-ink-soft">Period</dt>
                  <dd className="mt-1 font-medium text-ink">
                    {formatPeriod(EXAMPLE.start, EXAMPLE.end)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-soft">Example due date</dt>
                  <dd className="mt-1 font-medium text-ink">{formatDate(EXAMPLE.due)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm text-ink-soft">Illustrative balance</dt>
                  <dd className="mt-1 text-2xl font-semibold text-ink">
                    {formatCurrency(EXAMPLE.illustrativeBalance)}
                    <span className="mt-1 block text-sm font-normal text-ink-soft">
                      Not fetched, owed, paid or attached to any person or business.
                    </span>
                  </dd>
                </div>
              </dl>

              <Link
                href={`/vat/${entityId}/submit?period=${EXAMPLE.periodKey}`}
                className={buttonVariants({ className: "mt-6" })}
              >
                Open fictional draft
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </section>

            <aside className="rounded-lg border border-line bg-accent-soft p-5 sm:p-6" aria-labelledby="real-vat-heading">
              <h2 id="real-vat-heading" className="text-lg font-semibold text-ink">
                Looking for the real VAT cockpit?
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                The current cockpit has its own entities, connection state, obligations and
                receipts. This fictional exhibit does not share any of them.
              </p>
              <Link
                href="/vat/"
                className="mt-4 inline-flex items-center font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
              >
                Open the real VAT cockpit
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
