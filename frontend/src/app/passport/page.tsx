import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PassportClient } from "./passport-client";

export const metadata: Metadata = {
  title: "Tax Position Passport — TaxSorted",
  description:
    "Build a browser-local UK tax position from explicit facts, unknowns, evidence states and a source-backed MTD Income Tax check, then export a portable JSON or accountant handoff.",
};

export default function PassportPage() {
  return (
    <div
      lang="en"
      dir="ltr"
      className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="print:hidden">
        <Breadcrumbs
          items={[
            { href: "/tools", label: "Do my tax" },
            { href: "/checkup", label: "Tax Checkup" },
          ]}
          current="Tax Position Passport"
        />

        <header className="mt-6 max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Tax Position Passport
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
            Understanding that travels.
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-ink-soft">
            Map the income sources you know, keep unknown facts visible, name the
            evidence you hold and carry a complete source-backed MTD check into a
            JSON or printable accountant handoff.
          </p>
        </header>

        <section
          aria-labelledby="passport-boundary-title"
          className="mt-8 rounded-3xl border border-accent/30 bg-accent-soft p-5 sm:p-6"
        >
          <h2
            id="passport-boundary-title"
            className="text-lg font-semibold text-ink"
          >
            Local by consent
          </h2>
          <ul className="mt-3 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
            <li>No name, address, NINO value, UTR or document upload.</li>
            <li>
              Opening creates no Passport record and stores no tax facts.
            </li>
            <li>Only “Save this Passport” stores the Passport facts.</li>
            <li>
              Saved facts are ordinary browser site data, not encrypted by
              TaxSorted. Anyone with access to this browser profile may be able
              to read them.
            </li>
            <li>
              Clearing site data or browser storage may erase the Passport.
              Export a copy if you need one.
            </li>
            <li>Exported files leave the browser unencrypted — handle them carefully.</li>
          </ul>
        </section>
      </div>

      <PassportClient />

      <section
        aria-labelledby="passport-contract-title"
        className="mt-12 rounded-3xl border border-line bg-paper p-6 print:hidden"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          For accountants, apps and agents
        </p>
        <h2
          id="passport-contract-title"
          className="mt-2 text-2xl font-semibold text-ink"
        >
          The handoff has a public contract
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-ink-soft">
          The schema and example contain synthetic data only. TaxSorted does
          not provide a Passport upload or cloud-storage endpoint.
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          <a
            href="https://api.taxsorted.io/v1/uk/tax-expert/tax-position-passport/schema"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
          >
            JSON Schema ↗
          </a>
          <a
            href="https://api.taxsorted.io/v1/uk/tax-expert/tax-position-passport/examples/mtd-income-tax"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center font-semibold text-accent underline underline-offset-4 hover:text-accent-deep"
          >
            Synthetic example ↗
          </a>
        </div>
      </section>
    </div>
  );
}
