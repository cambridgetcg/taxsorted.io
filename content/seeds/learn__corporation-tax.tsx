import Link from "next/link";

export const metadata = {
  title: "Corporation Tax Guide — TaxSorted",
  description: "Plain-words guide to UK Corporation Tax: rates, allowances, filing CT600, and deductions.",
};

export default function CorporationTaxGuide() {
  return (
    <div className="container">
      <Link href="/learn" className="back-link">← All guides</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Corporation Tax</h1>
        <p>Rates, allowances, filing your CT600, and what you can deduct.</p>
      </div>

      <article className="guide-article">
        <h2>What it means</h2>
        <p>
          Corporation Tax is the tax companies pay on their profits. If you run
          a limited company (LTD), your company pays Corporation Tax on its
          trading profits, investment gains, and chargeable gains (selling
          company assets). Sole traders and partnerships don't pay Corporation
          Tax — they pay Income Tax on business profits instead.
        </p>

        <div className="callout callout-do">
          <h4>What you must do</h4>
          <p>
            Register your company for Corporation Tax within 3 months of
            starting to trade. File a Company Tax Return (CT600) and pay the tax
            owed within 12 months of your accounting period end. Keep records of
            all income and expenses for at least 6 years.
          </p>
        </div>

        <h2>Rates (2024/25)</h2>
        <p>The main rate is <strong>25%</strong> for profits over £250,000.</p>
        <p>There's a <strong>small profits rate of 19%</strong> for profits under £50,000.</p>
        <p>Between £50,000 and £250,000, <strong>marginal relief</strong> tapers the rate from 19% up to 25%.</p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Profits</th><th>Effective rate</th><th>How it works</th></tr>
            </thead>
            <tbody>
              <tr><td>Up to £50,000</td><td>19%</td><td>Small profits rate</td></tr>
              <tr><td>£50,001 – £250,000</td><td>19% → 25% (tapered)</td><td>Marginal relief bridges the two</td></tr>
              <tr><td>Over £250,000</td><td>25%</td><td>Main rate</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          The £50,000 and £250,000 thresholds are divided by the number of
          "associated companies" — if you control multiple companies, the
          thresholds are split between them.
        </p>

        <div className="callout callout-skip">
          <h4>What you can safely skip</h4>
          <p>
            If your profits are consistently under £50,000, you don't need to
            worry about marginal relief calculations — you're at the 19% rate
            and the math is simple. If your profits are over £250,000, same
            thing — flat 25%. The complexity only matters in the middle band.
          </p>
        </div>

        <h2>What you can deduct</h2>
        <p>
          Corporation Tax is paid on <strong>profits</strong>, not turnover.
          That means you deduct legitimate business expenses first:
        </p>
        <ul>
          <li>Salaries (including directors' salaries — these are deductible before Corporation Tax)</li>
          <li>Rent, utilities, and office costs</li>
          <li>Raw materials and stock</li>
          <li>Professional fees (accountant, legal, bank charges)</li>
          <li>Travel and subsistence for business</li>
          <li>Marketing and advertising</li>
          <li>Software and subscriptions</li>
        </ul>
        <p>
          Note: dividends paid to shareholders are <strong>not</strong> a
          deductible expense — they're paid from after-tax profits. This is
          why the salary-vs-dividend decision matters (see our Compare
          section).
        </p>

        <h3>Capital allowances</h3>
        <p>
          When you buy equipment, machinery, or vehicles, you can't deduct the
          full cost immediately. Instead, you get <strong>capital
          allowances</strong> — a tax deduction spread over time:
        </p>
        <ul>
          <li><strong>Annual Investment Allowance (AIA):</strong> 100% deduction on qualifying equipment up to £1,000,000 per year. Most plant and machinery qualifies.</li>
          <li><strong>Full Expensing:</strong> 100% deduction on qualifying new main-rate plant and machinery (not cars, not used equipment). Permanent from April 2023.</li>
          <li><strong>50% First-Year Allowance:</strong> for special-rate assets like long-life assets and integral features.</li>
          <li><strong>Writing Down Allowance (WDA):</strong> 18% per year (main pool) or 6% per year (special pool) for things that don't qualify for the above.</li>
        </ul>

        <h2>Filing the CT600</h2>
        <p>
          The Company Tax Return (form CT600) is filed with HMRC. Key points:
        </p>
        <ul>
          <li><strong>Deadline: 12 months</strong> after the end of your accounting period.</li>
          <li><strong>Pay the tax: 9 months and 1 day</strong> after the accounting period end (so payment is due before the filing deadline).</li>
          <li>File online using HMRC-approved software or commercial software (Xero, QuickBooks, etc.).</li>
          <li>Include the company's statutory accounts and computations.</li>
        </ul>
        <p>
          You also need to file <strong>Accounts</strong> with Companies House
          within 9 months of the accounting period end, and file a
          <strong> Confirmation Statement</strong> annually. These are separate
          from HMRC — Companies House is the company registry, HMRC is the tax
          authority.
        </p>

        <div className="callout callout-opt">
          <h4>How to optimise</h4>
          <p>
            Pay a director's salary up to the National Insurance threshold
            (£12,570 in 2024/25) — it's deductible for Corporation Tax, costs
            no employer NI (below the £9,100 secondary threshold), and counts
            towards state pension qualification. Take additional profit as
            dividends. Time major equipment purchases to your accounting
            period end to get the AIA benefit in that year. If profits are
            rising, consider shortening your accounting period to lock in
            lower-rate thresholds before they change.
          </p>
        </div>

        <h2>Filing late, paying late</h2>
        <p>
          HMRC penalties for late CT600 filing: £100 immediately, another £100
          after 3 months. After 6 months, HMRC can estimate your tax and add
          10% of the unpaid tax. After 12 months, another 10%. Interest also
          accrues on late payment.
        </p>

        <blockquote>
          <p>
            <strong>Prepared means ready; filed means sent.</strong> TaxSorted
            never blurs the two. You can prepare your CT600 weeks in advance,
            review it, adjust it — but it's not filed until you submit it to
            HMRC.
          </p>
        </blockquote>

        <div className="source">
          Sources: HMRC Corporation Tax guidance, Companies House filing
          requirements, Capital Allowances manual. Current as of 2024/25. Check{" "}
          <a href="https://www.gov.uk/corporation-tax" target="_blank" rel="noopener">gov.uk/corporation-tax</a>
          {" "}for the latest rates and thresholds.
        </div>
      </article>
    </div>
  );
}