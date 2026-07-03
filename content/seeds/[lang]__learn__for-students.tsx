import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../../dictionaries";

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function ForStudentsGuide({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <div className="container">
      <Link href={`/${lang}/learn`} className="back-link">{dict.roles.backToLearn}</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>{dict.home.roleStudents}</h1>
        <p>{dict.home.roleStudentsDesc}</p>
      </div>

      <article className="guide-article">
        <h2>{dict.roles.whatMatters}</h2>
        <div className="callout callout-do">
          <h4>{dict.roles.keyPoints}</h4>
          <ul>
            <li><strong>Student loan repayments are automatic if you earn above the threshold.</strong> Plan 5 (new undergraduates from 2023): 9% of income above £25,000. Plan 2: 9% above £27,295. Plan 1: 9% above £24,990. They&apos;re deducted via PAYE, like an extra tax.</li>
            <li><strong>Grants and scholarships are generally tax-free.</strong> Maintenance grants, tuition fee payments, scholarships, and bursaries are not taxable income. You don&apos;t declare them on Self-Assessment.</li>
            <li><strong>Part-time work uses PAYE — your employer handles it.</strong> The £12,570 Personal Allowance applies. If you earn less than that, you pay no Income Tax. NI starts at £12,570 too.</li>
            <li><strong>The £1,000 Trading Allowance covers side hustles.</strong> If you sell things online, tutor, or freelance and earn under £1,000/year, it&apos;s tax-free. Above that, declare via Self-Assessment.</li>
            <li><strong>Interest on savings has a £1,000 allowance (basic rate payers).</strong> If you&apos;re a student with savings, the first £1,000 of interest is tax-free if you&apos;re a basic-rate taxpayer. £500 for higher-rate payers.</li>
          </ul>
        </div>

        <h2>{dict.roles.relatedGuides}</h2>
        <ul>
          <li><Link href={`/${lang}/learn/income-tax`}>Income Tax — bands, allowances, PAYE</Link></li>
          <li><Link href={`/${lang}/tools/take-home-calculator`}>Take-Home Pay Calculator — see your after-tax income</Link></li>
        </ul>

        <h2>{dict.roles.yearlyChecklist}</h2>
        <div className="callout callout-opt">
          <h4>✓ {dict.roles.yearlyChecklist}</h4>
          <ul>
            <li>Check your tax code if you&apos;re working (usually 1257L)</li>
            <li>Track student loan deductions on your payslip</li>
            <li>If you have a side hustle earning over £1,000, register for Self-Assessment</li>
            <li>Review whether you&apos;re on the right student loan plan (affects threshold)</li>
            <li>If graduating this year, update HMRC when you start full-time work</li>
          </ul>
        </div>
      </article>
    </div>
  );
}