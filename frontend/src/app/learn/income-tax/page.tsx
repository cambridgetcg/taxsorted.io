import type { Metadata } from "next";
import Link from "next/link";
import { configFor } from "@taxsorted/engine/uk/itsa";
import { Cited } from "@/components/prep/cited";
import { gbpCompact } from "@/lib/format";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "Income Tax — TaxSorted",
  description:
    "Plain-words guide to UK Income Tax for 2026-27: Personal Allowance, bands and rates, the taper trap, and National Insurance for the self-employed — every figure cited.",
};

const REGISTER_URL = "https://www.gov.uk/register-for-self-assessment";
const SCOTTISH_URL = "https://www.gov.uk/scottish-income-tax";

export default function IncomeTaxGuide() {
  const config = configFor("2026-27");

  const pa = config.personalAllowance.value;
  const basicRateTop = pa + config.basicRateBand.value; // total-income edge of basic rate
  const additionalRateFrom = config.higherRateLimit.value; // total-income edge of higher rate
  const taperZeroPoint = config.paTaperThreshold.value + 2 * pa; // where PA reaches £0
  const trapRate = config.higherRate.value + config.higherRate.value / 2; // marginal rate in the taper band
  const taxCodeNumber = Math.floor(pa / 100 / 10); // PA in pounds, /10, no decimals — HMRC's own tax-code convention

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/learn" className="text-sm text-accent hover:text-accent-deep">
        ← All guides
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">Income Tax</h1>
      <p className="mt-3 text-ink-soft">
        Bands, allowances, how PAYE works, and Self Assessment — for the 2026-27 tax year, every
        figure cited to its source.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">What it means</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Income Tax is charged on your earnings above your Personal Allowance. If you&apos;re
          employed, it&apos;s deducted from your pay through PAYE before you receive it. If
          you&apos;re self-employed or have other untaxed income, you report it and pay it through
          Self Assessment.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Bands and rates, 2026-27</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-2 pr-4 font-medium">Band</th>
                <th className="py-2 pr-4 font-medium">Taxable income</th>
                <th className="py-2 font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2 pr-4 text-ink">Personal Allowance</td>
                <td className="py-2 pr-4 text-ink">
                  <Cited cite={config.personalAllowance}>£0 – {gbpCompact(pa)}</Cited>
                </td>
                <td className="py-2 text-ink">
                  <Cited cite={config.personalAllowance}>0%</Cited>
                </td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-4 text-ink">Basic rate</td>
                <td className="py-2 pr-4 text-ink">
                  {gbpCompact(pa + 1)} – {gbpCompact(basicRateTop)}
                </td>
                <td className="py-2 text-ink">
                  <Cited cite={config.basicRate}>{config.basicRate.value * 100}%</Cited>
                </td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2 pr-4 text-ink">Higher rate</td>
                <td className="py-2 pr-4 text-ink">
                  {gbpCompact(basicRateTop + 1)} – {gbpCompact(additionalRateFrom)}
                </td>
                <td className="py-2 text-ink">
                  <Cited cite={config.higherRate}>{config.higherRate.value * 100}%</Cited>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-ink">Additional rate</td>
                <td className="py-2 pr-4 text-ink">Over {gbpCompact(additionalRateFrom)}</td>
                <td className="py-2 text-ink">
                  <Cited cite={config.additionalRate}>{config.additionalRate.value * 100}%</Cited>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-ink-soft">
          Scotland has different bands and rates — see{" "}
          <a
            href={SCOTTISH_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline hover:text-accent-deep"
          >
            gov.uk/scottish-income-tax
          </a>
          .
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-accent-soft p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">The taper trap</h2>
        <p className="mt-2 text-sm text-ink">
          <Cited cite={config.paTaperThreshold}>
            Your Personal Allowance shrinks once your adjusted net income passes{" "}
            {gbpCompact(config.paTaperThreshold.value)}: {config.paTaperThreshold.note}
          </Cited>
          , reaching £0 at {gbpCompact(taperZeroPoint)}. Inside that band, an extra £1 of income
          costs you{" "}
          <Cited cite={config.higherRate}>{(trapRate * 100).toFixed(0)}%</Cited> in combined
          tax — higher rate tax on the £1 itself, plus higher rate tax on the sliver of
          allowance it costs you.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you must do</h2>
        <p className="mt-2 text-sm text-ink-soft">
          If you&apos;re employed with one job: nothing extra — PAYE handles it. Your tax code
          tells your employer how much pay is tax-free; the standard code for 2026-27 is{" "}
          <Cited cite={config.personalAllowance}>{taxCodeNumber}L</Cited> (the Personal Allowance,
          divided by ten, plus a letter). If you&apos;re self-employed, or your trading or
          property income is above the relevant allowance below, you must register and file a
          Self Assessment return.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          Register with HMRC by 5 October after the end of the tax year you need to report; file
          and pay by the following 31 January. See{" "}
          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline hover:text-accent-deep"
          >
            gov.uk/register-for-self-assessment
          </a>
          . If you&apos;re mandated onto Making Tax Digital for Income Tax, the deadlines and
          penalty position are different in detail —{" "}
          <Link href="/learn/mtd-income-tax" className="text-accent underline hover:text-accent-deep">
            see the MTD guide
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you can safely skip</h2>
        <p className="mt-2 text-sm text-ink-soft">
          If you&apos;re employed with one job, no benefits, and no other income above the trading
          or property allowances below: you don&apos;t need to file a Self Assessment return.
          Check your tax code once a year — that&apos;s enough for most people on PAYE alone.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">National Insurance for the self-employed</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Class 4:{" "}
          <Cited cite={config.class4MainRate}>
            {config.class4MainRate.value * 100}% on profits between{" "}
            {gbpCompact(config.class4LowerLimit.value)} and{" "}
            {gbpCompact(config.class4UpperLimit.value)}
          </Cited>
          ,{" "}
          <Cited cite={config.class4UpperRate}>
            {config.class4UpperRate.value * 100}% above that
          </Cited>
          . Class 2 is{" "}
          <Cited cite={config.class2SmallProfitsThreshold}>
            treated as paid — for state pension purposes — once profits reach the{" "}
            {gbpCompact(config.class2SmallProfitsThreshold.value)} Small Profits Threshold
          </Cited>
          ; below it, voluntary Class 2 is available at{" "}
          <Cited cite={config.class2VoluntaryWeekly}>
            {gbpCompact(config.class2VoluntaryWeekly.value)} a week
          </Cited>{" "}
          to protect your state pension record.
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">How to optimise</h2>
        <p className="mt-2 text-sm text-ink-soft">
          The{" "}
          <Cited cite={config.tradingAllowance}>
            {gbpCompact(config.tradingAllowance.value)} trading allowance
          </Cited>{" "}
          and{" "}
          <Cited cite={config.propertyAllowance}>
            {gbpCompact(config.propertyAllowance.value)} property allowance
          </Cited>{" "}
          let small amounts of trading or rental income go completely tax-free without
          declaring them — but you can claim the allowance or your actual expenses, never both.
          Pension contributions reduce your adjusted net income, which is the lever that matters
          most if you&apos;re inside the taper trap above.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Related guides</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link href="/learn/self-employed" className="text-accent underline hover:text-accent-deep">
              Self-employed — trading allowance, NIC, cash basis, simplified expenses
            </Link>
          </li>
          <li>
            <Link href="/learn/for-landlords" className="text-accent underline hover:text-accent-deep">
              For landlords — property allowance, Rent-a-Room, Section 24
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
