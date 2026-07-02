import Link from "next/link";
import { compareUkIncomeAndGains, computeUkIncomeTax } from "@taxsorted/engine/uk/personal-tax";
import { planUKPersonalTax } from "@taxsorted/engine/uk/personal";
import playbook from "../../../../../research/uk/personal-tax/playbook.json";
import sourceLedger from "../../../../../research/uk/personal-tax/source-ledger.json";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 0 });

const comparison = compareUkIncomeAndGains(80_000);
const taper = computeUkIncomeTax({ employmentIncome: 110_000 });
const childBenefitPlan = planUKPersonalTax({ employmentIncome: 70_000, children: 2, partnerAdjustedNetIncome: 30_000 });
const allowancePlan = planUKPersonalTax({ employmentIncome: 112_000 });
const sourceById = new Map(sourceLedger.map((source) => [source.id, source]));

export default function UkPersonalTaxPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/" className="text-sm text-accent hover:text-accent-deep">
        ← TaxSorted
      </Link>

      <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">UK 個税 · spicy but safe</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink sm:text-6xl">
          玩爆英國個税 — but legally, plainly, with receipts.
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-ink-soft">
          有錢人唔係識魔法；佢哋識 rules, wrappers, timing, residence, reliefs.
          TaxSorted turns the playbook into plain language: what the trick is, why it works,
          who can really use it, and where optimisation ends and evasion begins.
        </p>
        <p className="mt-4 rounded-2xl bg-accent-soft p-4 text-sm text-ink">
          <strong>Legal line:</strong> {playbook.ethicalLine}
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Metric label="Personal allowance" value={gbp.format(playbook.snapshot.personalAllowance)} note="Then tapers after £100k adjusted net income." />
        <Metric label="ISA allowance" value={gbp.format(playbook.snapshot.isaAnnualAllowance)} note="A legal wrapper, not a magic loophole." />
        <Metric label="CGT annual exemption" value={gbp.format(playbook.snapshot.cgtAnnualExemptAmount)} note="Tiny compared with the asset game." />
      </section>

      <section className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-ink">Same £80k, different lane</h2>
        <p className="mt-2 text-ink-soft">
          This is the core pattern: work is taxed as income, wealth may be realised as gains.
          Same pounds, different lane. This simplified engine ignores NI, student loans, Scottish rates,
          and special reliefs — it is a teaching lens, not filing advice.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Metric label="£80k as employment income" value={gbp.format(comparison.asEmploymentIncome)} note={`Income Tax only · effective ${pct.format(comparison.incomeEffectiveRate)}`} />
          <Metric label="£80k as capital gain" value={gbp.format(comparison.asCapitalGain)} note={`CGT only · effective ${pct.format(comparison.gainsEffectiveRate)}`} />
          <Metric label="Difference" value={gbp.format(comparison.difference)} note="Not magic. Different rules." />
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-ink">The £100k trap</h2>
        <p className="mt-2 text-ink-soft">
          At £110k, the teaching engine shows {gbp.format(taper.personalAllowanceLost)} of personal allowance lost.
          The marginal Income Tax-only rate in this band is about {pct.format(taper.marginalRateApprox)} —
          before National Insurance or student loan effects.
        </p>
      </section>

      <section className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-ink">Threshold scanner — legal levers, no fake loopholes</h2>
        <p className="mt-2 text-ink-soft">
          The engine now scans adjusted net income pressure points and suggests lawful moves with caveats.
          It is optimisation/compliance tooling: no hiding income, no sham invoices, no pretend residence.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Metric
            label="£70k + 2 children"
            value={gbp.format(childBenefitPlan.highIncomeChildBenefitCharge.estimatedCharge)}
            note={`Estimated HICBC at ${childBenefitPlan.highIncomeChildBenefitCharge.chargePercent}% clawback; first move targets ${gbp.format(childBenefitPlan.moves[0]?.targetAdjustedNetIncome ?? 0)} ANI.`}
          />
          <Metric
            label="£112k income"
            value={gbp.format(allowancePlan.personalAllowance.lost)}
            note={`Personal Allowance lost; suggested gross ANI reduction ${gbp.format(allowancePlan.moves[0]?.grossAmount ?? 0)}.`}
          />
        </div>
        <ul className="mt-5 list-disc space-y-2 pl-5 text-ink-soft">
          {allowancePlan.moves.slice(0, 2).map((move) => (
            <li key={move.title}>
              <strong className="text-ink">{move.title}:</strong> {move.action}
            </li>
          ))}
          {childBenefitPlan.moves.slice(0, 2).map((move) => (
            <li key={move.title}>
              <strong className="text-ink">{move.title}:</strong> {move.action}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-ink">7 UK personal-tax plays</h2>
        <div className="mt-5 grid gap-5">
          {playbook.plays.map((play) => (
            <article key={play.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-accent">{play.cantonese}</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{play.name}</h3>
              <p className="mt-3 text-ink-soft"><strong className="text-ink">How it works:</strong> {play.howItWorks}</p>
              <p className="mt-3 text-ink-soft"><strong className="text-ink">Who can play hard:</strong> {play.whoCanPlayHard}</p>
              <p className="mt-3 text-ink-soft"><strong className="text-ink">Ordinary counter-move:</strong> {play.ordinaryCounterMove}</p>
              <p className="mt-3 rounded-2xl bg-paper p-4 text-sm text-ink"><strong>Legal line:</strong> {play.legalLine}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {play.sourceIds.map((sourceId) => {
                  const source = sourceById.get(sourceId);
                  return source ? (
                    <a key={sourceId} href={source.url} className="rounded-full border border-line px-3 py-1 text-sm text-accent hover:text-accent-deep">
                      receipt: {source.name}
                    </a>
                  ) : null;
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-ink">Source ledger</h2>
        <p className="mt-2 text-ink-soft">Every spicy claim above has a receipt and a boundary.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {sourceLedger.map((source) => (
            <article key={source.id} className="rounded-2xl border border-line p-4">
              <a href={source.url} className="font-medium text-accent hover:text-accent-deep">{source.name}</a>
              <p className="mt-2 text-sm text-ink-soft"><strong>Supports:</strong> {source.supports.join(" ")}</p>
              <p className="mt-2 text-sm text-ink-soft"><strong>Does not prove:</strong> {source.doesNotProve.join(" ")}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink-soft">{note}</p>
    </div>
  );
}
