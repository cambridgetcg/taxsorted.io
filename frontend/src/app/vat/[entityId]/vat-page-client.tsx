"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DemoNotice } from "@/components/demo-notice";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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

/** The fixed worked example; the real account-backed VAT home is `/vat`. */
export default function VATPortalPage({ entityId }: VATPageClientProps) {
  return (
    <div className="min-h-[70vh] bg-paper">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs
          items={[{ href: "/tools", label: "Do my tax" }]}
          current="VAT example"
          className="mb-4"
        />
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 space-y-6">
          <DemoNotice title="A worked example">
            This page uses made-up numbers. It is not an account, has no connection to HM
            Revenue &amp; Customs (HMRC), and cannot save or file a return.
          </DemoNotice>

          <header>
            <p className="text-sm font-semibold text-accent">Practice, not filing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Try VAT with example numbers
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">
              The dates and balance below are made up. Use them to learn how the draft
              calculator works before you touch real figures.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <section className="rounded-lg border border-line bg-white p-5 sm:p-6" aria-labelledby="example-period-heading">
              <h2 id="example-period-heading" className="text-lg font-semibold text-ink">
                The example period
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
                  <dt className="text-sm text-ink-soft">Example balance</dt>
                  <dd className="mt-1 text-2xl font-semibold text-ink">
                    {formatCurrency(EXAMPLE.illustrativeBalance)}
                  </dd>
                </div>
              </dl>

              <Link
                href={`/vat/${entityId}/submit?period=${EXAMPLE.periodKey}`}
                className={buttonVariants({ className: "mt-6" })}
              >
                Open the example draft
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </section>

            <aside className="rounded-lg border border-line bg-accent-soft p-5 sm:p-6" aria-labelledby="real-vat-heading">
              <h2 id="real-vat-heading" className="text-lg font-semibold text-ink">
                Ready to do it for real?
              </h2>
              <p className="mt-2 text-base leading-6 text-ink-soft">
                Your real VAT home keeps its own businesses, HMRC connection and receipts. This
                example shares none of them.
              </p>
              <Link
                href="/vat/"
                className="mt-4 inline-flex items-center font-medium text-accent underline underline-offset-4 hover:text-accent-deep"
              >
                Go to your real VAT home
                <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
