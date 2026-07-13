"use client";

import { compareUkIncomeAndGains, computeUkIncomeTax } from "@taxsorted/engine/uk/personal-tax";
import { planUKPersonalTax } from "@taxsorted/engine/uk/personal";
import { TaxPlayground } from "@/components/TaxPlayground";
import { PersonalThresholdCheck } from "@/components/tax-expert/PersonalThresholdCheck";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ShortVersion } from "@/components/ui/short-version";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale as SiteLocale } from "@/i18n/dictionaries";
import playbook from "../../../../../research/uk/personal-tax/playbook.json";
import sourceLedger from "../../../../../research/uk/personal-tax/source-ledger.json";
import i18n from "../../../../../research/uk/personal-tax/i18n.json";
import politics from "../../../../../research/uk/personal-tax/politics.json";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 0 });

const comparison = compareUkIncomeAndGains(80_000);
const taper = computeUkIncomeTax({ employmentIncome: 110_000 });
const childBenefitPlan = planUKPersonalTax({ employmentIncome: 70_000, children: 2, partnerAdjustedNetIncome: 30_000 });
const allowancePlan = planUKPersonalTax({ employmentIncome: 112_000 });
const sourceById = new Map(sourceLedger.map((source) => [source.id, source]));

type PersonalLocale = keyof typeof i18n.ui;
const personalLocales = i18n.locales as PersonalLocale[];
const playTranslations = i18n.playTranslations as Record<string, Partial<Record<PersonalLocale, string>>>;

function toPersonalLocale(locale: SiteLocale): PersonalLocale {
  if (locale === "zh-Hant") return "zh-HK";
  if (locale === "zh-Hans") return "zh-CN";
  if (personalLocales.includes(locale as PersonalLocale)) return locale as PersonalLocale;
  return "en";
}

function themeBody(theme: (typeof politics.themes)[number], locale: PersonalLocale) {
  if (locale === "zh-HK" || locale === "zh-CN") return theme.cantonese;
  return theme.plain;
}

export default function UkPersonalTaxPage() {
  const { locale: siteLocale, t: siteT } = useI18n();
  const locale = toPersonalLocale(siteLocale);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ href: "/tools", label: "Do my tax" }]} current="The £60,000 and £100,000 lines" />

      <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          The £60,000 and £100,000 tax lines
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-ink-soft">
          Check what your income level changes: your tax-free Personal Allowance, your Child
          Benefit, and your Tax-Free Childcare.
        </p>
        <ShortVersion className="mt-6 max-w-3xl">
          <li>One number — your adjusted net income (ANI — your income after certain deductions) — decides all three.</li>
          <li>Use the checker below. It runs in your browser; nothing is sent anywhere.</li>
          <li>Further down: the legal moves, and the politics that drew these lines.</li>
        </ShortVersion>
        <p className="mt-4 max-w-3xl rounded-2xl bg-accent-soft p-4 text-base text-ink">
          <strong>The legal line:</strong> {playbook.ethicalLine}
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <Metric label={siteT("playbook.snapshot.pa")} value={gbp.format(playbook.snapshot.personalAllowance)} note={siteT("playbook.snapshot.pa.note")} />
        <Metric label={siteT("playbook.snapshot.isa")} value={gbp.format(playbook.snapshot.isaAnnualAllowance)} note={siteT("playbook.snapshot.isa.note")} />
        <Metric label={siteT("playbook.snapshot.cgt")} value={gbp.format(playbook.snapshot.cgtAnnualExemptAmount)} note={siteT("playbook.snapshot.cgt.note")} />
      </section>

      <PersonalThresholdCheck />

      <section className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-ink">The same £80,000, taxed two ways</h2>
        <p className="mt-2 text-base text-ink-soft">
          Money earned as pay and money made as a capital gain follow different rules.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Metric label="£80k as employment income" value={gbp.format(comparison.asEmploymentIncome)} note={`Income Tax only · effective ${pct.format(comparison.incomeEffectiveRate)}`} />
          <Metric label="£80k as capital gain" value={gbp.format(comparison.asCapitalGain)} note={`Capital Gains Tax (CGT) only · effective ${pct.format(comparison.gainsEffectiveRate)}`} />
          <Metric label="Difference" value={gbp.format(comparison.difference)} note="Not magic. Different rules." />
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold text-ink">{siteT("playbook.trap.title")}</h2>
        <p className="mt-2 text-base text-ink-soft">
          At £110k, the teaching engine shows {gbp.format(taper.personalAllowanceLost)} of personal allowance lost.
          The marginal Income Tax-only rate in this band is about {pct.format(taper.marginalRateApprox)} —
          before National Insurance or student loan effects.
        </p>
      </section>

      <details className="mt-10 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <summary className="cursor-pointer text-xl font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          Two worked examples near the lines
        </summary>
        <p className="mt-3 max-w-3xl text-base text-ink-soft">
          The engine looks at ANI pressure points and suggests lawful moves, with their limits.
          No hiding income, no sham invoices, no pretend residence.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Metric
            label={siteT("playbook.threshold.example.children")}
            value={gbp.format(childBenefitPlan.highIncomeChildBenefitCharge.estimatedCharge)}
            note={`Estimated High Income Child Benefit Charge (HICBC) at ${childBenefitPlan.highIncomeChildBenefitCharge.chargePercent}% clawback; first move targets ${gbp.format(childBenefitPlan.moves[0]?.targetAdjustedNetIncome ?? 0)} ANI.`}
          />
          <Metric
            label={siteT("playbook.threshold.example.income")}
            value={gbp.format(allowancePlan.personalAllowance.lost)}
            note={`Personal Allowance lost; suggested gross ANI reduction ${gbp.format(allowancePlan.moves[0]?.grossAmount ?? 0)}.`}
          />
        </div>
        <ul className="mt-5 list-disc space-y-2 pl-5 text-base text-ink-soft">
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
      </details>

      <details className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <summary className="cursor-pointer text-xl font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          Who drew these lines? The politics
        </summary>
        <p className="mt-3 max-w-3xl text-base text-ink-soft">
          The loud fight is about tax rates. The quiet machinery is frozen allowances, clawbacks,
          and who gets to choose their timing.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {politics.themes.map((theme) => (
            <article key={theme.id} className="rounded-2xl border border-line bg-paper p-4">
              <p className="text-3xl" aria-hidden="true">{theme.emoji}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{theme.label}</h3>
              <p className="mt-2 text-base text-ink-soft">{themeBody(theme, locale)}</p>
              <p className="mt-3 text-base text-ink"><strong>Why it matters:</strong> {theme.whyItMatters}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {theme.sourceIds.map((sourceId) => {
                  const source = sourceById.get(sourceId);
                  return source ? (
                    <a key={sourceId} href={source.url} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm text-accent hover:text-accent-deep">
                      {siteT("playbook.receipt")}: {source.name}
                    </a>
                  ) : null;
                })}
              </div>
            </article>
          ))}
        </div>
      </details>

      <TaxPlayground />

      <details className="mt-12 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <summary className="cursor-pointer text-xl font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          The seven plays — how people with more choices use the rules
        </summary>
        <div className="mt-5 grid gap-5">
          {playbook.plays.map((play) => (
            <article key={play.id} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
              {locale === "zh-HK" ? (
                <p className="text-base font-semibold text-accent" lang="yue-Hant">{play.cantonese}</p>
              ) : null}
              <h3 className="mt-2 text-xl font-semibold text-ink">{play.name}</h3>
              {playTranslations[play.id]?.[locale] ? (
                <p className="mt-3 rounded-2xl bg-accent-soft p-4 text-base text-ink">
                  {playTranslations[play.id]?.[locale]}
                </p>
              ) : null}
              <p className="mt-3 text-base text-ink-soft"><strong className="text-ink">{siteT("playbook.how")}:</strong> {play.howItWorks}</p>
              <p className="mt-3 text-base text-ink-soft"><strong className="text-ink">{siteT("playbook.who")}:</strong> {play.whoCanPlayHard}</p>
              <p className="mt-3 text-base text-ink-soft"><strong className="text-ink">{siteT("playbook.counter")}:</strong> {play.ordinaryCounterMove}</p>
              <p className="mt-3 rounded-2xl bg-paper p-4 text-base text-ink"><strong>The legal line:</strong> {play.legalLine}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {play.sourceIds.map((sourceId) => {
                  const source = sourceById.get(sourceId);
                  return source ? (
                    <a key={sourceId} href={source.url} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm text-accent hover:text-accent-deep">
                      {siteT("playbook.receipt")}: {source.name}
                    </a>
                  ) : null;
                })}
              </div>
            </article>
          ))}
        </div>
      </details>

      <details className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <summary className="cursor-pointer text-xl font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
          Sources — the receipt behind every claim
        </summary>
        <p className="mt-3 text-base text-ink-soft">{siteT("playbook.sources.blurb")}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {sourceLedger.map((source) => (
            <article key={source.id} className="rounded-2xl border border-line p-4">
              <a href={source.url} className="inline-flex min-h-11 items-center font-medium text-accent hover:text-accent-deep">{source.name}</a>
              <p className="mt-2 text-sm text-ink-soft"><strong>{siteT("playbook.supports")}:</strong> {source.supports.join(" ")}</p>
              <p className="mt-2 text-sm text-ink-soft"><strong>{siteT("playbook.notProve")}:</strong> {source.doesNotProve.join(" ")}</p>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <p className="text-base text-ink-soft">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink-soft">{note}</p>
    </div>
  );
}
