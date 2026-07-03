import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../../dictionaries";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function ForPensionersGuide({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="container">
      <Link href={`/${lang}/learn`} className="back-link">{dict.roles.backToLearn}</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>{dict.home.rolePensioners}</h1>
        <p>{dict.home.rolePensionersDesc}</p>
      </div>

      <article className="guide-article">
        <h2>{dict.roles.whatMatters}</h2>
        <div className="callout callout-do">
          <h4>{dict.roles.keyPoints}</h4>
          <ul>
            <li><strong>The State Pension is taxable income.</strong> For 2024/25, the full new State Pension is £11,502/year. It&apos;s below the Personal Allowance (£12,570), so most pensioners pay no tax on it alone. But any additional income (workplace pension, savings, rental) is taxed on top.</li>
            <li><strong>Workplace and personal pensions: 25% tax-free lump sum.</strong> You can take 25% of your pension pot tax-free from age 55 (rising to 57 in 2028). The remaining 75% is taxed as income when withdrawn.</li>
            <li><strong>Pension income uses your Personal Allowance.</strong> If your only income is the State Pension + a small workplace pension, you may still pay no tax. If your total income exceeds £12,570, the excess is taxed at 20% (basic rate).</li>
            <li><strong>Drawdown vs annuity: choose carefully.</strong> Drawdown keeps your money invested (growth potential, but market risk and you can run out). Annuity gives guaranteed income for life (no market risk, but fixed and may be lower). You can mix both.</li>
            <li><strong>Marriage Allowance: transfer £1,260 of Personal Allowance.</strong> If one spouse earns below £12,570 and the other is a basic-rate taxpayer, transfer £1,260 of unused allowance — saves £252/year.</li>
          </ul>
        </div>

        <h2>{dict.roles.relatedGuides}</h2>
        <ul>
          <li><Link href={`/${lang}/learn/income-tax`}>Income Tax — how pension income is taxed</Link></li>
          <li><Link href={`/${lang}/learn/capital-gains-tax`}>Capital Gains Tax — if selling investments in retirement</Link></li>
          <li><Link href={`/${lang}/compare/practices`}>Sensible vs risky — pension recycling schemes to avoid</Link></li>
        </ul>

        <h2>{dict.roles.yearlyChecklist}</h2>
        <div className="callout callout-opt">
          <h4>✓ {dict.roles.yearlyChecklist}</h4>
          <ul>
            <li>Check your tax code — HMRC often issues emergency codes for pensioners</li>
            <li>Review total income: State Pension + workplace pensions + other income</li>
            <li>If total income is under £12,570, you may not need to pay any tax</li>
            <li>Claim Marriage Allowance if eligible (saves £252/year)</li>
            <li>Review drawdown strategy if in flexible drawdown — is it sustainable?</li>
            <li>Consider deferring State Pension (increases by 1% for every 9 weeks deferred)</li>
            <li>If still working part-time, check whether you&apos;re paying unnecessary emergency tax</li>
          </ul>
        </div>
      </article>
    </div>
  );
}