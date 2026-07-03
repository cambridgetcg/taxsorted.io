import Link from "next/link";

export const metadata = {
  title: "Salary vs Dividend — TaxSorted",
  description: "How to take money out of a company efficiently. The optimal mix of salary and dividends.",
};

export default function SalaryVsDividendCompare() {
  return (
    <div className="container">
      <Link href="/compare" className="back-link">← All comparisons</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Salary vs Dividend</h1>
        <p>How to take money out of a company efficiently — the optimal mix of salary and dividends.</p>
      </div>

      <div className="section">
        <h2>The basic idea</h2>
        <p>
          If you run a limited company and you're the only shareholder, you
          have two ways to pay yourself: <strong>salary</strong> (subject to
          Income Tax and NI, but deductible for Corporation Tax) and
          <strong> dividends</strong> (paid from after-tax profits, subject to
          Dividend Tax but no NI). The optimal approach uses both.
        </p>
      </div>

      <div className="section">
        <h2>The two levers</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th></th><th>Salary</th><th>Dividend</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Corporation Tax deductible?</strong></td><td>Yes (reduces Corp Tax)</td><td>No (paid from after-tax profit)</td></tr>
              <tr><td><strong>Income Tax</strong></td><td>20%/40%/45%</td><td>8.75%/33.75%/39.35% (lower)</td></tr>
              <tr><td><strong>National Insurance</strong></td><td>Yes (employee 8% + employer 13.8%)</td><td>No NI</td></tr>
              <tr><td><strong>Counts for state pension?</strong></td><td>Yes (if above LEL)</td><td>No</td></tr>
              <tr><td><strong>Counts toward annual allowance?</strong></td><td>Yes (pension contribution base)</td><td>No</td></tr>
              <tr><td><strong>When payable?</strong></td><td>Regular schedule (PAYE/RTI)</td><td>When company declares (flexible)</td></tr>
              <tr><td><strong>Must be profitable to pay?</strong></td><td>No (can pay even if loss-making)</td><td>Yes (from distributable reserves)</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>The optimal salary (2024/25)</h2>
        <p>
          For most owner-directors, the optimal salary is <strong>£12,570</strong>
          {" "}per year — the Personal Allowance. Here's why:
        </p>
        <ul>
          <li><strong>No Income Tax:</strong> £12,570 is within the Personal Allowance.</li>
          <li><strong>No employee NI:</strong> £12,570 is the primary threshold — 0% employee NI.</li>
          <li><strong>No employer NI:</strong> £12,570 is above the secondary threshold (£9,100), so employer NI would normally apply at 13.8%. But the Employment Allowance covers it (up to £10,500/year).</li>
          <li><strong>Corp Tax saving:</strong> The £12,570 is deductible, saving 19–25% in Corporation Tax.</li>
          <li><strong>State pension:</strong> £12,570 is above the Lower Earnings Limit (£6,396), so you qualify for the year.</li>
          <li><strong>Pension annual allowance:</strong> Salary counts toward pension — you can contribute to a pension and get tax relief.</li>
        </ul>
        <p>
          If you can't claim Employment Allowance (sole director with no other
          employees, though recent changes allow claim if you have any second
          employee), the optimal salary drops to <strong>£9,100</strong> —
          the secondary NI threshold. Above that, employer NI kicks in and the
          numbers shift.
        </p>
      </div>

      <div className="section">
        <h2>After the salary — dividends</h2>
        <p>Dividend tax rates (2024/25):</p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Band</th><th>Dividend income range</th><th>Rate</th></tr>
            </thead>
            <tbody>
              <tr><td>Dividend Allowance</td><td>First £500</td><td>0%</td></tr>
              <tr><td>Basic rate</td><td>£500 – £50,270</td><td>8.75%</td></tr>
              <tr><td>Higher rate</td><td>£50,271 – £125,140</td><td>33.75%</td></tr>
              <tr><td>Additional rate</td><td>Above £125,140</td><td>39.35%</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          The first £500 of dividends is tax-free. After that, dividends are
          taxed at lower rates than salary — 8.75% vs 20% basic, 33.75% vs 40%
          higher, 39.35% vs 45% additional. The saving is roughly 11p per pound
          at basic rate, 6p at higher, 6p at additional.
        </p>
      </div>

      <div className="section">
        <h2>Worked example: £50,000 profit</h2>
        <p>Company profit £50,000, single director-shareholder, claiming Employment Allowance:</p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Step</th><th>Amount</th><th>Running total</th></tr>
            </thead>
            <tbody>
              <tr><td>Company profit (before salary)</td><td>£50,000</td><td>—</td></tr>
              <tr><td>Pay director salary (£12,570/yr)</td><td>−£12,570</td><td>£37,430 taxable profit</td></tr>
              <tr><td>Corporation Tax @ 19% (small profits rate)</td><td>−£7,112</td><td>£30,318 distributable reserves</td></tr>
              <tr><td>Declare dividend</td><td>+£30,318</td><td>£30,318 dividend received</td></tr>
              <tr><td>Personal tax on salary (£12,570)</td><td>£0</td><td>(within Personal Allowance)</td></tr>
              <tr><td>Personal tax on dividend: first £500 free</td><td>£0</td><td>(Dividend Allowance)</td></tr>
              <tr><td>Dividend tax @ 8.75% on £29,818</td><td>−£2,609</td><td>£2,609 dividend tax</td></tr>
              <tr><td><strong>Total tax (Corp + Personal)</strong></td><td></td><td><strong>£9,721</strong></td></tr>
              <tr><td><strong>Take-home</strong></td><td></td><td><strong>£40,279</strong></td></tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "14px", color: "var(--fg-muted)" }}>
          If you'd taken the same £50,000 as pure salary, the tax bill would be
          ~£9,860 Income Tax + ~£4,000 employee NI + ~£6,900 employer NI =
          ~£20,760. Salary + dividend saves roughly £11,000. Even accounting
          for the fact that salary reduces Corporation Tax, dividends remain
          more efficient for amounts above the optimal salary.
        </p>
      </div>

      <div className="section">
        <h2>Honest tradeoffs</h2>
        <div className="callout callout-do">
          <h4>Why the mix works</h4>
          <p>
            Salary up to £12,570 costs the company 19–25% less in Corporation Tax
            while costing you nothing in personal tax or NI. Dividends above
            that point save 6–11p per pound vs salary due to lower personal tax
            and no NI. You also retain flexibility — you don't have to take
            dividends if the company can't afford them (unlike salary, which
            you owe regardless).
          </p>
        </div>
        <div className="callout callout-skip">
          <h4>The tradeoffs</h4>
          <p>
            Salary counts toward your state pension, dividends don't. Only
            salary counts as "relevant earnings" for pension tax relief
            purposes. If you want to build a big pension, you need salary.
            Mortgage lenders often look at salary (not dividends) when
            assessing affordability — taking a higher salary can help with
            borrowing. Dividends can only be paid from distributable reserves —
            if your company has losses or accumulated deficits, you can't pay
            them.
          </p>
        </div>
      </div>

      <div className="section">
        <h2>Use the dividend calculator</h2>
        <p>
          See the exact numbers for your profit level in our{" "}
          <Link href="/tools/dividend-calculator">Dividend Calculator</Link>.
        </p>
      </div>

      <div className="source">
        Sources: HMRC dividend tax rates 2024/25, Corporation Tax rates,
        National Insurance thresholds, Employment Allowance rules 2025/26.
        Example simplified — assumes no other income, Employment Allowance
        claim, small profits rate. See{" "}
        <a href="https://www.gov.uk/dividends" target="_blank" rel="noopener">gov.uk/dividends</a>.
      </div>
    </div>
  );
}