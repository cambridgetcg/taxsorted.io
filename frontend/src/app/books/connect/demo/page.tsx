import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import SyntheticAccountingDemoClient from "./synthetic-accounting-demo-client";

export const metadata: Metadata = {
  title: "Made-up accounting connector proof | TaxSorted",
  description:
    "A local-development proof of TaxSorted's provider-neutral accounting connection and safe sync boundary.",
};

export default function SyntheticAccountingDemoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { href: "/books", label: "Books" },
          { href: "/books/connect", label: "Connect records" },
        ]}
        current="Made-up connector proof"
      />

      <header className="mt-5 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">
          Local-development proof · made-up records
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          Walk through a real connector boundary without real accounts.
        </h1>
        <p className="mt-5 text-lg text-ink-soft">
          This proves the TaxSorted side of the bridge: choose one TaxSorted entity, bind one
          provider organisation to this browser, save each exact page locally, acknowledge it,
          then move the checkpoint only when the whole run completes.
        </p>
      </header>

      <aside className="mt-8 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-sm text-violet-950">
        <strong>Nothing here connects to Xero, QuickBooks, FreeAgent, Sage or HMRC.</strong> Mina’s
        Card Studio and all three transactions are deterministic fiction. There is no provider
        OAuth, token, network call or customer record. The API switch is impossible to enable in
        production.
      </aside>

      <SyntheticAccountingDemoClient />

      <p className="mt-10 text-sm text-ink-soft">
        Want the product map rather than the proof?{" "}
        <Link href="/books/connect" className="font-semibold text-accent underline underline-offset-4">
          Return to accounting sources and HMRC modules
        </Link>
        .
      </p>
    </div>
  );
}
