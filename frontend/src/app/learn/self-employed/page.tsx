import type { Metadata } from "next";
import Link from "next/link";
import { configFor, categoriesFor } from "@taxsorted/engine/uk/itsa";
import { Cited } from "@/components/prep/cited";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { gbpCompact, formatUkDate } from "@/lib/format";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Self-employed — TaxSorted",
  description:
    "Running your own business for 2026-27: trading allowance, Class 4 and Class 2 National Insurance, cash basis, simplified expenses, and the MTD timeline — every figure cited.",
};

export default function SelfEmployedGuide() {
  const config = configFor("2026-27");
  const seCategories = categoriesFor("self-employment");
  const mtdEarliestStep = config.mtdThresholds.value[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/learn", label: "Learn" }]} current="Self-employed" />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Self-employed</h1>
      <p className="mt-3 text-base text-ink-soft">
        This guide shows what tax you pay on your own business in 2026-27: what&apos;s tax-free,
        what National Insurance you actually owe, and what Making Tax Digital changes.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">What it means</h2>
        <p className="mt-2 text-base text-ink-soft">
          Trading profit — turnover less allowable expenses — is taxed as income through Self
          Assessment, alongside Class 4 and Class 2 National Insurance. There&apos;s no separate
          &ldquo;self-employment tax&rdquo;: it&apos;s the same Income Tax bands as everyone else, plus these
          two additional charges.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you must do</h2>
        <ul className="mt-2 space-y-3 text-base text-ink-soft">
          <li>
            <Cited cite={config.tradingAllowance}>
              The {gbpCompact(config.tradingAllowance.value)} trading allowance shelters small
              trading income completely — at or below it, there&apos;s nothing to declare and no
              tax to pay.
            </Cited>{" "}
            Above it, claim the allowance or your actual expenses, never both.
          </li>
          <li>
            Class 4 National Insurance:{" "}
            <Cited cite={config.class4MainRate}>
              {config.class4MainRate.value * 100}% on profits between{" "}
              {gbpCompact(config.class4LowerLimit.value)} and{" "}
              {gbpCompact(config.class4UpperLimit.value)}
            </Cited>
            ,{" "}
            <Cited cite={config.class4UpperRate}>
              {config.class4UpperRate.value * 100}% above that
            </Cited>
            .
          </li>
          <li>
            Class 2 National Insurance:{" "}
            <Cited cite={config.class2SmallProfitsThreshold}>
              treated as paid — protecting your state pension record — once profits reach the{" "}
              {gbpCompact(config.class2SmallProfitsThreshold.value)} Small Profits Threshold
            </Cited>
            . Below it, voluntary Class 2 is available at{" "}
            <Cited cite={config.class2VoluntaryWeekly}>
              {gbpCompact(config.class2VoluntaryWeekly.value)} a week
            </Cited>
            .
          </li>
          <li>
            <Cited cite={config.consolidatedExpensesTurnoverLimit}>
              Digital records are required for every business item, but under{" "}
              {gbpCompact(config.consolidatedExpensesTurnoverLimit.value)} turnover you can
              consolidate expenses into one combined total instead of splitting them by category
            </Cited>
            .
          </li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you can safely skip</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={config.tradingAllowance}>
            If your gross trading income is at or below the {gbpCompact(config.tradingAllowance.value)}{" "}
            trading allowance
          </Cited>
          , you don&apos;t need to tell HMRC about it at all — no return, no records for that
          income. If you use the cash basis (the default), you also don&apos;t need to track
          debtors, creditors or depreciation — just money in and money out.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">How to optimise: simplified expenses</h2>
        <p className="mt-2 text-base text-ink-soft">
          Simplified expenses swap actual costs for a flat rate, so you don&apos;t need to keep
          every receipt:
        </p>
        <ul className="mt-2 space-y-3 text-base text-ink-soft">
          <li>
            <Cited cite={config.mileageFirst10k}>
              Mileage: {config.mileageFirst10k.value}p per mile for the first 10,000 business
              miles in a car or van
            </Cited>
            , then{" "}
            <Cited cite={config.mileageAfter10k}>
              {config.mileageAfter10k.value}p per mile after that
            </Cited>{" "}
            (
            <Cited cite={config.mileageMotorcycle}>
              {config.mileageMotorcycle.value}p per mile for a motorcycle, no tiering
            </Cited>
            ). See our{" "}
            <Link href="/tools/mileage" className="text-accent underline hover:text-accent-deep">
              mileage tool
            </Link>{" "}
            to work it out.
          </li>
          <li>
            Working from home: flat monthly rates banded by hours worked —{" "}
            {config.wfhFlatRates.value.map((band, i) => (
              <span key={band.minHours}>
                {i > 0 ? "; " : ""}
                <Cited cite={config.wfhFlatRates}>
                  {gbpCompact(band.monthly)}/month for {band.minHours}
                  {band.maxHours ? `–${band.maxHours}` : "+"} hours
                </Cited>
              </span>
            ))}
            .
          </li>
          <li>
            Living at your business premises: a flat monthly deduction from actual costs for your
            own personal use, banded by household size —{" "}
            {config.premisesFlatRates.value.map((band, i) => (
              <span key={band.people}>
                {i > 0 ? "; " : ""}
                <Cited cite={config.premisesFlatRates}>
                  {gbpCompact(band.monthly)}/month for {band.people}
                  {band.people === 3 ? "+" : ""} people
                </Cited>
              </span>
            ))}
            .
          </li>
        </ul>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">The MTD timeline</h2>
        <p className="mt-2 text-base text-ink">
          <Cited cite={config.mtdThresholds}>
            Self-employment and UK property income together are what&apos;s measured for Making
            Tax Digital for Income Tax — mandation starts from{" "}
            {formatUkDate(mtdEarliestStep.mandatedFrom)}, once your gross turnover for{" "}
            {mtdEarliestStep.incomeYear} passed {gbpCompact(mtdEarliestStep.qualifyingIncomeOver)}
          </Cited>
          , with the threshold stepping down in later years.{" "}
          <Link href="/learn/mtd-income-tax" className="font-medium text-accent underline hover:text-accent-deep">
            Read the full MTD guide
          </Link>{" "}
          for the deadlines and penalty position, or{" "}
          <Link href="/itsa/am-i-in" className="font-medium text-accent underline hover:text-accent-deep">
            check your own eligibility
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Making Tax Digital categories</h2>
        <p className="mt-2 text-base text-ink-soft">
          Once the rules apply to you, each{" "}
          <Link href="/learn/mtd-income-tax" className="text-accent underline hover:text-accent-deep">
            quarterly update
          </Link>{" "}
          reports totals against the {seCategories.length} boxes HMRC wants — the
          same fields our{" "}
          <Link href="/itsa/records" className="text-accent underline hover:text-accent-deep">
            records tool
          </Link>{" "}
          sorts into:
        </p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-base text-ink-soft sm:grid-cols-2">
          {seCategories.map((c) => (
            <li key={c.key}>{c.label}</li>
          ))}
        </ul>
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
            <Link href="/learn/for-landlords" className="text-accent underline hover:text-accent-deep">
              For landlords — property income
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
