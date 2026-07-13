import type { Metadata } from "next";
import Link from "next/link";
import { configFor, categoriesFor } from "@taxsorted/engine/uk/itsa";
import { Cited } from "@/components/prep/cited";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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
      <Breadcrumbs items={[{ href: "/learn", label: "Learn" }]} current="For landlords" />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">For landlords</h1>
      <p className="mt-3 text-base text-ink-soft">
        This guide shows what tax you pay on UK rental income in 2026-27: what&apos;s tax-free,
        what&apos;s restricted, and what Making Tax Digital asks you to track.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">What it means</h2>
        <p className="mt-2 text-base text-ink-soft">
          Rental income is taxed as income, not capital gains. It&apos;s added to your other
          income and taxed at your usual Income Tax rate, reported through Self Assessment — or
          Making Tax Digital for Income Tax, once those rules apply to you.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you must do</h2>
        <ul className="mt-2 space-y-3 text-base text-ink-soft">
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
              You no longer deduct mortgage interest (or other residential finance costs) from
              rental income. Instead you get a {config.s24CreditRate.value * 100}% tax credit —
              the &ldquo;Section 24&rdquo; rule.
            </Cited>{" "}
            Higher-rate landlords lose out most: the credit stays at basic rate whatever rate
            you actually pay. The exact rule: the credit is {config.s24CreditRate.value * 100}%
            of the lowest of three amounts — your finance costs, your property profit, or your
            adjusted total income.
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
        <p className="mt-2 text-base text-ink">
          The separate Furnished Holiday Lettings tax rules have been abolished. Qualifying
          holiday lets are now taxed as ordinary property income — no special capital
          allowances, no special pension treatment.{" "}
          <a
            href={FHL_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Read the repeal of the Furnished Holiday Lettings rules on GOV.UK
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you can safely skip</h2>
        <p className="mt-2 text-base text-ink-soft">
          If your gross rental income is at or below the Property Allowance, or fully covered by
          Rent-a-Room, there&apos;s nothing to declare and nothing to optimise — the relief is
          automatic.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">How to optimise</h2>
        <p className="mt-2 text-base text-ink-soft">
          Weigh the Property Allowance against your actual expenses every year — whichever is
          bigger wins, and the allowance can never create a loss. If you have residential finance
          costs, check whether the actual-expenses route (which keeps the Section 24 credit
          alive) beats the flat allowance before you claim it.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Making Tax Digital property categories</h2>
        <p className="mt-2 text-base text-ink-soft">
          Once the Making Tax Digital rules apply to you, each{" "}
          <Link href="/learn/mtd-income-tax" className="text-accent underline hover:text-accent-deep">
            quarterly update
          </Link>{" "}
          reports totals against HMRC&apos;s own property categories — the same fields our{" "}
          <Link href="/itsa/records" className="text-accent underline hover:text-accent-deep">
            records tool
          </Link>{" "}
          sorts into:
        </p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-base text-ink-soft sm:grid-cols-2">
          {propertyCategories.map((c) => (
            <li key={c.key}>{c.label}</li>
          ))}
        </ul>
        <p className="mt-3 text-base text-ink-soft">
          Mortgage interest and other finance costs are always tracked separately, even under
          simplified reporting — that&apos;s what feeds the Section 24 credit above.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Related guides</h2>
        <ul className="mt-2 space-y-1 text-base">
          <li>
            <Link href="/learn/income-tax" className="text-accent underline hover:text-accent-deep">
              Income Tax — bands, allowances, Self Assessment
            </Link>
          </li>
          <li>
            <Link href="/learn/mtd-income-tax" className="text-accent underline hover:text-accent-deep">
              Making Tax Digital — don&apos;t panic
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
