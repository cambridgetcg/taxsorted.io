import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../../dictionaries";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function ForLandlordsGuide({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="container">
      <Link href={`/${lang}/learn`} className="back-link">{dict.roles.backToLearn}</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>{dict.home.roleLandlords}</h1>
        <p>{dict.home.roleLandlordsDesc}</p>
      </div>

      <article className="guide-article">
        <h2>{dict.roles.whatMatters}</h2>
        <div className="callout callout-do">
          <h4>{dict.roles.keyPoints}</h4>
          <ul>
            <li><strong>The £1,000 Property Allowance is automatic.</strong> Rental income under £1,000/year is tax-free and doesn&apos;t need declaring. Above £1,000, choose between the allowance or claiming actual expenses — whichever saves more.</li>
            <li><strong>Rental income is taxed as income, not capital gains.</strong> It goes on top of your other income and is taxed at your marginal rate (20%, 40%, or 45%). File via Self-Assessment.</li>
            <li><strong>Mortgage interest relief is restricted to 20% as a tax credit.</strong> You can&apos;t deduct full mortgage interest from rental income anymore (since 2020). Instead, you get a 20% tax credit on the interest. This hits higher-rate taxpayers hard.</li>
            <li><strong>Allowable expenses reduce your taxable rental profit.</strong> Repairs, maintenance, insurance, letting agent fees, ground rent, service charges, council tax (between tenants), cleaning, and legal fees related to the let.</li>
            <li><strong>Capital Gains Tax applies when you sell a rental property.</strong> Not your main home — that&apos;s exempt. But buy-to-let and second homes are taxed at 18% (basic rate) or 24% (higher rate) on the gain. Annual allowance is £3,000 (2024/25). Report within 60 days of completion.</li>
          </ul>
        </div>

        <h2>{dict.roles.relatedGuides}</h2>
        <ul>
          <li><Link href={`/${lang}/learn/income-tax`}>Income Tax — bands, Self-Assessment, allowances</Link></li>
          <li><Link href={`/${lang}/learn/capital-gains-tax`}>Capital Gains Tax — rates, reliefs, reporting</Link></li>
        </ul>

        <h2>{dict.roles.yearlyChecklist}</h2>
        <div className="callout callout-opt">
          <h4>✓ {dict.roles.yearlyChecklist}</h4>
          <ul>
            <li>Declare rental income on your Self-Assessment (by 31 January)</li>
            <li>Track all allowable expenses — keep receipts</li>
            <li>If selling a rental property, report CGT within 60 days of completion</li>
            <li>Review whether the £1,000 Property Allowance or actual expenses saves more</li>
            <li>If mortgage interest is significant, track it for the 20% tax credit</li>
            <li>Consider transferring property to spouse if it doubles your CGT allowance on sale</li>
          </ul>
        </div>
      </article>
    </div>
  );
}