import type { Metadata } from "next";
import Link from "next/link";
import { configFor, categoriesFor } from "@taxsorted/engine/uk/itsa";
import { Cited } from "@/components/prep/cited";
import { gbpCompact } from "@/lib/format";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "For landlords — TaxSorted",
  description:
    "UK property income for 2026-27: the Property Allowance, Rent-a-Room, the Section 24 finance-cost credit, and what changed with Furnished Holiday Lettings — every figure cited.",
};

// Verified: regs/research/substance.md §5e "Source (fetched)", re-confirmed 200 via WebFetch 2026-07-06.
const FHL_URL =
  "https://www.gov.uk/government/publications/furnished-holiday-lettings-tax-regime-abolition/abolition-of-the-furnished-holiday-lettings-tax-regime";

export default function ForLandlordsGuide() {
  const config = configFor("2026-27");
  const propertyCategories = categoriesFor("uk-property");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/learn" className="text-sm text-accent hover:text-accent-deep">
        ← All guides
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">For landlords</h1>
      <p className="mt-3 text-ink-soft">
        UK property income for the 2026-27 tax year: what&apos;s tax-free, what&apos;s
        restricted, and what Making Tax Digital asks you to track.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">What it means</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Rental income is taxed as income, not capital gains — it&apos;s added to your other
          income and taxed at your marginal Income Tax rate, reported through Self Assessment (or
          Making Tax Digital for Income Tax, once you&apos;re mandated).
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you must do</h2>
        <ul className="mt-2 space-y-3 text-sm text-ink-soft">
          <li>
            <Cited cite={config.propertyAllowance}>
              The {gbpCompact(config.propertyAllowance.value)} Property Allowance is automatic —
              rental income at or below it is tax-free and doesn&apos;t need declaring.
            </Cited>{" "}
            Above it, choose between the allowance or claiming actual expenses — whichever gives
            the bigger deduction, never both.
          </li>
          <li>
            <Cited cite={config.rentARoom}>
              Renting a furnished room in your own home: the Rent-a-Room limit is{" "}
              {gbpCompact(config.rentARoom.value)}
            </Cited>
            , halved to{" "}
            <Cited cite={config.rentARoomShared}>
              {gbpCompact(config.rentARoomShared.value)}
            </Cited>{" "}
            when you share the income with someone else. At or below the limit, relief is
            automatic; above it, you must actively elect between the Rent-a-Room method and the
            ordinary expenses method.
          </li>
          <li>
            <Cited cite={config.s24CreditRate}>
              Mortgage interest and other residential finance costs aren&apos;t deducted from
              rental income directly — instead you get a {config.s24CreditRate.value * 100}%
              tax credit (Section 24) on the lowest of your finance costs, your property profit,
              and your adjusted total income.
            </Cited>{" "}
            This hits higher-rate taxpayers hardest, since the credit is capped at basic rate
            regardless of the rate you actually pay.
          </li>
          <li>
            <Cited cite={config.propertyCashBasisLimit}>
              Cash basis (tax on rent received, not rent invoiced) is the default up to{" "}
              {gbpCompact(config.propertyCashBasisLimit.value)} of property receipts
            </Cited>
            . Above that you can still elect into it, or use accruals accounting.
          </li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What changed: Furnished Holiday Lettings</h2>
        <p className="mt-2 text-sm text-ink">
          The separate Furnished Holiday Lettings tax regime has been abolished — qualifying
          holiday lets are now taxed as ordinary property income, with no special capital
          allowances and no special treatment for pension purposes.{" "}
          <a
            href={FHL_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            gov.uk: repeal of the Furnished Holiday Lettings regime
          </a>
          .
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you can safely skip</h2>
        <p className="mt-2 text-sm text-ink-soft">
          If your gross rental income is at or below the Property Allowance, or fully covered by
          Rent-a-Room, there&apos;s nothing to declare and nothing to optimise — the relief is
          automatic.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">How to optimise</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Weigh the Property Allowance against your actual expenses every year — whichever is
          bigger wins, and the allowance can never create a loss. If you have residential finance
          costs, check whether the actual-expenses route (which keeps the Section 24 credit
          alive) beats the flat allowance before you claim it.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">MTD property categories</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Once you&apos;re mandated, each quarterly update reports totals against HMRC&apos;s own
          property categories — the same fields our{" "}
          <Link href="/itsa/records" className="text-accent underline hover:text-accent-deep">
            records tool
          </Link>{" "}
          sorts into:
        </p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink-soft sm:grid-cols-2">
          {propertyCategories.map((c) => (
            <li key={c.key}>{c.label}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          Residential finance costs are always tracked separately, even under simplified
          reporting — that&apos;s what feeds the Section 24 credit above.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Related guides</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link href="/learn/income-tax" className="text-accent underline hover:text-accent-deep">
              Income Tax — bands, allowances, Self Assessment
            </Link>
          </li>
          <li>
            <Link href="/learn/mtd-income-tax" className="text-accent underline hover:text-accent-deep">
              MTD Income Tax — don&apos;t panic
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
