import type { Metadata } from "next";
import Link from "next/link";
import {
  configFor,
  quartersFor,
  penaltyPosition,
  MTD_ELIGIBILITY_URL,
} from "@taxsorted/engine/uk/itsa";
import { Cited } from "@/components/prep/cited";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { formatUkDate, gbpCompact } from "@/lib/format";

// i18n: deferred to M2 — plain English for launch

export const metadata: Metadata = {
  title: "MTD Income Tax: don't panic — TaxSorted",
  description:
    "What's actually true about Making Tax Digital for Income Tax: who's in, what you send, the real deadlines, and the real penalty position for 2026-27 — every figure cited.",
};

const QUARTERLY_UPDATES_URL =
  "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates";
// Verified via WebFetch 2026-07-06: this IS the Income Tax (Digital Requirements) (Amendment)
// Regulations 2024, amending SI 2021/1076 — substitutes "quarterly update period" (cumulative
// reporting) and omits the End of Period Statement provisions. Matches regs/research/mandate.md §3a.
const SI_2024_167_URL = "https://www.legislation.gov.uk/uksi/2024/167/made";
const SIGN_UP_URL =
  "https://www.gov.uk/guidance/sign-up-your-business-for-making-tax-digital-for-income-tax";
const REPO_URL = "https://github.com/cambridgetcg/taxsorted.io";

export default function MtdDePanicPage() {
  const config = configFor("2026-27");
  const thresholds = config.mtdThresholds;
  const quarters = quartersFor("2026-27", "standard");
  const penalty = penaltyPosition("2026-27");
  const firstDeadline = quarters[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[{ href: "/learn", label: "Learn" }]}
        current="Making Tax Digital: don’t panic"
      />

      <h1 className="mt-4 text-3xl font-bold text-ink sm:text-4xl">
        Making Tax Digital: don&apos;t panic — here&apos;s what&apos;s actually true
      </h1>
      <p className="mt-3 text-base text-ink-soft">
        Making Tax Digital (MTD) for Income Tax gets talked about like a cliff edge. It
        isn&apos;t. Here&apos;s who it applies to, what it asks you to send, the real dates, and
        the real cost of getting something wrong. Every figure is cited to its source, so you
        can check it yourself.
      </p>

      {/* Who's in */}
      <section className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Who&apos;s in</h2>
        <p className="mt-2 text-base text-ink-soft">
          People are brought in (&ldquo;mandated&rdquo;) in phases. What counts is your
          qualifying income — self-employment plus UK property income, before expenses —
          measured in an earlier tax year:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-full text-left text-base">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-2 pr-4 font-medium">Qualifying income measured in</th>
                <th className="py-2 pr-4 font-medium">Threshold</th>
                <th className="py-2 font-medium">Mandated from</th>
              </tr>
            </thead>
            <tbody>
              {thresholds.value.map((step) => (
                <tr key={step.incomeYear} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4 text-ink">{step.incomeYear}</td>
                  <td className="py-2 pr-4 text-ink">
                    <Cited cite={thresholds}>over {gbpCompact(step.qualifyingIncomeOver)}</Cited>
                  </td>
                  <td className="py-2 text-ink">{formatUkDate(step.mandatedFrom)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-base text-ink-soft">
          This schedule is set in law:{" "}
          <a
            href={thresholds.source}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            {thresholds.si}
          </a>
          .
        </p>
        <div className="mt-4 rounded-xl border border-line bg-accent-soft p-4 text-base text-ink">
          <p>
            <strong>The gotcha:</strong>{" "}
            <Cited
              cite={{
                source: MTD_ELIGIBILITY_URL,
                effectiveFrom: "2026-04-06",
                note: "Qualifying income is gross turnover, before any expenses are deducted — not profit.",
              }}
            >
              Whether you&apos;re in is worked out on your GROSS turnover — self-employment
              income plus UK property income, added together before you deduct a single expense.
              A sole trader with a big turnover and small profit is judged on the turnover
              figure, not the profit.
            </Cited>
          </p>
        </div>
      </section>

      {/* What you actually send */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What you actually send</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited
            cite={{
              source: QUARTERLY_UPDATES_URL,
              si: "SI 2024/167",
              effectiveFrom: "2026-04-06",
              note: "Cumulative reporting was introduced by the Income Tax (Digital Requirements) (Amendment) Regulations 2024.",
            }}
          >
            Each quarterly update is cumulative — it covers everything from the start of the tax
            year to the end of that update period, not just the last three months. Category
            totals only; no transaction-level detail crosses to HMRC, and no accounting
            adjustments are made at this stage.
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          That cumulative design has a practical upside:{" "}
          <strong>miss one, the next one heals it.</strong> A late or wrong update is corrected by
          resending the year-to-date figures in the next update — there is no separate amendment
          process to learn.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Cumulative reporting was introduced by the Income Tax (Digital Requirements)
          (Amendment) Regulations 2024:{" "}
          <a
            href={SI_2024_167_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            SI 2024/167
          </a>
          .
        </p>
      </section>

      {/* The deadlines */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">The deadlines</h2>
        <p className="mt-2 text-base text-ink-soft">
          <Cited cite={{ source: QUARTERLY_UPDATES_URL, effectiveFrom: "2026-04-06" }}>
            Four quarterly updates a year. The standard quarters (starting on the 6th of the
            month) are shown below; choosing calendar quarters instead shifts the period edges,
            but not the deadlines.
          </Cited>
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-full text-left text-base">
            <thead>
              <tr className="border-b border-line text-ink-soft">
                <th className="py-2 pr-4 font-medium">Quarter</th>
                <th className="py-2 pr-4 font-medium">Period covered</th>
                <th className="py-2 font-medium">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((q) => (
                <tr key={q.index} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4 text-ink">Q{q.index}</td>
                  <td className="py-2 pr-4 text-ink">
                    {formatUkDate(q.cumulativeStart)} – {formatUkDate(q.periodEnd)}
                  </td>
                  <td className="py-2 text-ink">{formatUkDate(q.deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-base text-ink-soft">
          The 31 January return deadline for the full year sits after all four — unchanged by any
          of this.
        </p>
      </section>

      {/* The penalty truth */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">The penalty truth</h2>
        <p className="mt-2 text-base text-ink-soft">
          HMRC fines lateness with points, a bit like a driving licence — collect enough points
          and a fine follows. Here is the official position for this first year:
        </p>
        <p className="mt-3 text-base text-ink">
          <Cited cite={{ source: penalty.source, effectiveFrom: "2026-04-06" }}>
            {penalty.note}
          </Cited>
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Read both halves of that: the let-off covers points for LATE quarterly updates only.
          It changes nothing about paying what you owe on time.
        </p>
        <p className="mt-3 text-base text-ink-soft">
          Angry about MTD?{" "}
          <Link
            href="/learn/gov/your-levers"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Here&apos;s who decided — and how to say so
          </Link>
          .
        </p>
      </section>

      {/* What it costs elsewhere vs here */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What it costs elsewhere vs here</h2>
        <p className="mt-2 text-base text-ink-soft">
          Commercial MTD software is usually a paid monthly subscription. TaxSorted is free, and
          the code that produces every figure on this site is open — AGPL-3.0 licensed, published
          on GitHub. If you don&apos;t trust a number, go read the function that made it.
        </p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-block text-base font-medium text-accent underline hover:text-accent-deep"
        >
          Read the code on GitHub
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </section>

      {/* What to do this month */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">What to do this month</h2>
        <ol className="mt-3 space-y-3 text-base text-ink-soft">
          <li className="flex gap-3">
            <span className="font-semibold text-accent">1.</span>
            <span>
              <Link
                href="/itsa/am-i-in"
                className="font-medium text-accent underline hover:text-accent-deep"
              >
                Check if I&apos;m in
              </Link>{" "}
              — enter your gross self-employment and UK property income and see whether, and
              from when, the rules apply to you.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">2.</span>
            <span>
              <Link
                href="/itsa/records"
                className="font-medium text-accent underline hover:text-accent-deep"
              >
                Start your records
              </Link>{" "}
              — a local-first ledger sorted into HMRC&apos;s own MTD categories, ready whenever
              you are.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-accent">3.</span>
            <span>
              Note the date: the first quarterly update deadline of the 2026-27 tax year falls on{" "}
              <strong>{formatUkDate(firstDeadline.deadline)}</strong>, if you&apos;re mandated in.
            </span>
          </li>
        </ol>
        <p className="mt-4 text-base text-ink-soft">
          Signing up itself stays manual, directly with HMRC — no software can enrol you.{" "}
          <a
            href={SIGN_UP_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-accent underline hover:text-accent-deep"
          >
            Sign up for Making Tax Digital for Income Tax on GOV.UK
          </a>
          .
        </p>
      </section>
    </div>
  );
}
