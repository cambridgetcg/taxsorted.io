import Link from "next/link";

export const metadata = {
  title: "Income Tax Guide — TaxSorted",
  description: "Plain-words guide to UK Income Tax: bands, allowances, PAYE, and self-assessment.",
};

export default function IncomeTaxGuide() {
  return (
    <div className="container">
      <Link href="/learn" className="back-link">← All guides</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Income Tax</h1>
        <p>Bands, allowances, how PAYE works, and self-assessment explained.</p>
      </div>

      <article className="guide-article">
        <h2>What it means</h2>
        <p>
          Income Tax is a tax on your earnings. If you're employed, it's taken
          from your pay before you receive it through PAYE (Pay As You Earn).
          If you're self-employed, you pay it through Self-Assessment. Either
          way, you only pay tax on income above your Personal Allowance.
        </p>

        <div className="callout callout-do">
          <h4>What you must do</h4>
          <p>
            If employed: nothing extra — your employer handles it through
            PAYE. If self-employed or with income above £1,000 from trading,
            property, or investments: file a Self-Assessment tax return each
            year. Pay what you owe by 31 January and 31 July (payments on
            account).
          </p>
        </div>

        <h2>Allowances</h2>
        <p>For 2024/25:</p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Allowance</th><th>Amount</th><th>What it covers</th></tr>
            </thead>
            <tbody>
              <tr><td>Personal Allowance</td><td>£12,570</td><td>Tax-free income — most people get this</td></tr>
              <tr><td>Trading Allowance</td><td>£1,000</td><td>Tax-free self-employment income</td></tr>
              <tr><td>Property Allowance</td><td>£1,000</td><td>Tax-free rental income</td></tr>
              <tr><td>Dividend Allowance</td><td>£500</td><td>Tax-free dividends (2024/25)</td></tr>
              <tr><td>Starting Rate for Savings</td><td>£5,000</td><td>Tax-free savings interest (if non-savings income &lt; £12,570)</td></tr>
              <tr><td>Personal Savings Allowance</td><td>£1,000 (basic), £500 (higher), £0 (additional)</td><td>Tax-free savings interest on top of starting rate</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          The Personal Allowance reduces by £1 for every £2 you earn above
          £100,000. By £125,140, you get no Personal Allowance at all —
          effectively a 60% tax rate on the £100,000–£125,140 band.
        </p>

        <h2>Bands and rates (2024/25)</h2>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Band</th><th>Taxable income</th><th>Rate</th></tr>
            </thead>
            <tbody>
              <tr><td>Personal Allowance</td><td>£0 – £12,570</td><td>0%</td></tr>
              <tr><td>Basic rate</td><td>£12,571 – £50,270</td><td>20%</td></tr>
              <tr><td>Higher rate</td><td>£50,271 – £125,140</td><td>40%</td></tr>
              <tr><td>Additional rate</td><td>Over £125,140</td><td>45%</td></tr>
            </tbody>
          </table>
        </div>
        <p>Scotland has different bands and rates — see{" "}
          <a href="https://www.gov.uk/scottish-income-tax" target="_blank" rel="noopener">gov.uk/scottish-income-tax</a>.
        </p>

        <h2>How PAYE works</h2>
        <p>
          PAYE (Pay As You Earn) is how employers collect Income Tax and
          National Insurance from your wages before paying you. Each pay day:
        </p>
        <ol>
          <li>Your employer calculates your gross pay.</li>
          <li>They apply your tax code (usually 1257L for the standard Personal Allowance).</li>
          <li>Tax and NI are deducted and sent to HMRC in real-time via RTI (see our PAYE/RTI guide).</li>
          <li>You receive net pay with a payslip showing deductions.</li>
        </ol>
        <p>
          Your tax code tells your employer how much tax-free pay you're
          entitled to. <strong>1257L</strong> means £12,570 tax-free (the
          standard allowance). Codes with W1, M1, or X at the end are
          "non-cumulative" — tax is calculated on that pay period only, which
          can lead to over/underpayment if your income fluctuates.
        </p>

        <div className="callout callout-skip">
          <h4>What you can safely skip</h4>
          <p>
            If you're employed with one job, no benefits, and no other income
            over £1,000: you don't need to file a Self-Assessment return.
            PAYE handles it. Check your tax code once a year — that's enough for
            most people.
          </p>
        </div>

        <h2>Self-Assessment</h2>
        <p>You must file a Self-Assessment tax return if:</p>
        <ul>
          <li>You're self-employed with income over £1,000.</li>
          <li>Your income from renting property exceeds £1,000 (after expenses).</li>
          <li>Your total income exceeds £100,000.</li>
          <li>You have foreign income, or income from trusts or estates.</li>
          <li>You're a company director (unless you're a director of a non-profit with no income from the role).</li>
          <li>You have Capital Gains Tax to pay.</li>
          <li>You or your partner claimed Child Benefit and your income is over £50,000 (the High Income Child Benefit Charge applies).</li>
        </ul>
        <p>Key deadlines:</p>
        <ul>
          <li><strong>Register</strong> by 5 October after the tax year ends.</li>
          <li><strong>File online</strong> by 31 January after the tax year ends.</li>
          <li><strong>Pay</strong> by 31 January. Payments on account: two advance payments towards next year's tax, due 31 January and 31 July.</li>
        </ul>
        <p>
          If you miss the filing deadline, you get an automatic £100 fine. It
          escalates the longer you leave it. If you miss the payment deadline,
          interest accrues at the HMRC interest rate.
        </p>

        <div className="callout callout-opt">
          <h4>How to optimise</h4>
          <p>
            Use all available allowances. The Trading Allowance (£1,000) and
            Property Allowance (£1,000) let you earn small amounts tax-free
            without declaring them. If your actual expenses are higher than
            £1,000, claim expenses instead — but then you can't use the
            allowance. Pension contributions reduce taxable income (good if
            you're near a band threshold). If you're self-employed, keep
            receipts for all legitimate business expenses — mileage, home
            office, equipment, professional fees.
          </p>
        </div>

        <h2>National Insurance — the companion tax</h2>
        <p>
          NI is technically separate from Income Tax but works alongside it.
          For employees in 2024/25:
        </p>
        <ul>
          <li><strong>Class 1 (employee):</strong> 8% on earnings between £12,570 and £50,270. 2% above £50,270.</li>
          <li><strong>Class 1 (employer):</strong> 13.8% on earnings above £9,100.</li>
        </ul>
        <p>
          For the self-employed:
        </p>
        <ul>
          <li><strong>Class 2</strong> was abolished from 6 January 2024.</li>
          <li><strong>Class 4</strong>: 6% on profits between £12,570 and £50,270. 2% above £50,270.</li>
        </ul>

        <div className="source">
          Sources: HMRC Income Tax rates and allowances, Self-Assessment
          guidance, National Insurance contributions rates 2024/25. Check{" "}
          <a href="https://www.gov.uk/income-tax" target="_blank" rel="noopener">gov.uk/income-tax</a>
          {" "}for current rates — they change each tax year.
        </div>
      </article>
    </div>
  );
}