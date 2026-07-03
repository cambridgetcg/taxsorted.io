import Link from "next/link";

export const metadata = {
  title: "Business Types Comparison — TaxSorted",
  description: "Sole trader vs partnership vs LTD vs LLP — tax implications side by side.",
};

export default function BusinessTypesCompare() {
  return (
    <div className="container">
      <Link href="/compare" className="back-link">← All comparisons</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Business types</h1>
        <p>Sole trader vs Partnership vs LTD vs LLP — tax implications side by side.</p>
      </div>

      <div className="section">
        <h2>At a glance</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Sole trader</th>
                <th>Partnership</th>
                <th>Limited company (LTD)</th>
                <th>LLP</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Legal entity</strong></td>
                <td>You and the business are the same</td>
                <td>Partners + business share liability</td>
                <td>Separate legal entity</td>
                <td>Separate legal entity</td>
              </tr>
              <tr>
                <td><strong>Personal liability</strong></td>
                <td><span className="pill pill-red">Unlimited</span></td>
                <td><span className="pill pill-red">Unlimited (joint)</span></td>
                <td><span className="pill pill-green">Limited</span></td>
                <td><span className="pill pill-green">Limited</span></td>
              </tr>
              <tr>
                <td><strong>Tax on profits</strong></td>
                <td>Income Tax + NI</td>
                <td>Income Tax + NI (per partner)</td>
                <td>Corporation Tax (19–25%)</td>
                <td>Income Tax + NI (per member)</td>
              </tr>
              <tr>
                <td><strong>Filing</strong></td>
                <td>Self-Assessment</td>
                <td>Partnership return + individual SA</td>
                <td>CT600 + Companies House accounts</td>
                <td>LLP return + individual SA</td>
              </tr>
              <tr>
                <td><strong>Registration</strong></td>
                <td>HMRC (free, simple)</td>
                <td>HMRC + partnership registration</td>
                <td>Companies House (~£12)</td>
                <td>Companies House (~£12–50)</td>
              </tr>
              <tr>
                <td><strong>Accounts public?</strong></td>
                <td>No</td>
                <td>No</td>
                <td>Yes — filed at Companies House</td>
                <td>Yes — filed at Companies House</td>
              </tr>
              <tr>
                <td><strong>Best for</strong></td>
                <td>Low-risk, small, simple</td>
                <td>Small group, low risk</td>
                <td>Profits &gt; £30k, or want protection</td>
                <td>Professional firms (law, accounting)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>The tax math (at £50,000 profit)</h2>
        <p>Approximate tax on £50,000 annual profit, 2024/25 rates, assuming single owner, no other income:</p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Structure</th><th>Tax type</th><th>Tax due</th><th>Take-home</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Sole trader</td>
                <td>Income Tax + Class 4 NI</td>
                <td>~£8,600</td>
                <td>~£41,400</td>
              </tr>
              <tr>
                <td>LTD (salary £12,570 + dividends)</td>
                <td>Corp Tax + Dividend Tax</td>
                <td>~£6,700</td>
                <td>~£43,300</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "14px", color: "var(--fg-muted)" }}>
          The LTD saves roughly £1,900/year at this profit level. The gap widens
          as profits rise — Corporation Tax is capped at 25% while Income Tax
          goes to 45%, and dividends have their own lower-rate bands.
        </p>
      </div>

      <div className="section">
        <h2>When each makes sense</h2>
        <div className="compare-grid">
          <div className="compare-card sensible">
            <div className="icon">✓ Sole trader</div>
            <ul>
              <li>Profits under ~£25,000/year</li>
              <li>Low personal risk (consultant, freelancer, online seller)</li>
              <li>You value simplicity over tax savings</li>
              <li>You're testing a business idea</li>
            </ul>
          </div>
          <div className="compare-card sensible">
            <div className="icon">✓ Partnership</div>
            <ul>
              <li>2–4 founders, shared risk</li>
              <li>Profits split roughly evenly</li>
              <li>Everyone wants to stay self-employed (not a company)</li>
              <li>Short-term or project-based collaboration</li>
            </ul>
          </div>
          <div className="compare-card sensible">
            <div className="icon">✓ LTD</div>
            <ul>
              <li>Profits over ~£30,000/year</li>
              <li>You want to reinvest (corporation tax is lower)</li>
              <li>Personal liability is a real risk</li>
              <li>You might sell or attract investors</li>
              <li>You want to control when you take income (dividends)</li>
            </ul>
          </div>
          <div className="compare-card sensible">
            <div className="icon">✓ LLP</div>
            <ul>
              <li>Professional services (law, accounting, consulting)</li>
              <li>Members want limited liability but self-employed tax treatment</li>
              <li>Large partnership (10+ members)</li>
              <li>You need a formal structure but want profit flexibility</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Honest tradeoffs</h2>
        <div className="callout callout-do">
          <h4>The LTD tax advantage</h4>
          <p>
            At most profit levels, a LTD pays less tax than a sole trader. The
            savings come from: (1) Corporation Tax being 19–25% vs Income Tax
            at 20–45%, (2) no NI on dividends, (3) the ability to time when you
            take money out. On £60,000 profit, a LTD typically saves £3,000–£5,000
            per year vs sole trader.
          </p>
        </div>
        <div className="callout callout-skip">
          <h4>The LTD cost</h4>
          <p>
            More paperwork: CT600, Companies House accounts (public), annual
            confirmation statement, payroll if you pay yourself a salary, and
            often an accountant (£800–£2,000/year). Your finances are on public
            record — competitors, customers, and anyone can see your company's
            turnover and profit. If the administrative cost and privacy loss
            outweigh the tax saving, stay sole trader.
          </p>
        </div>
      </div>

      <div className="source">
        Sources: HMRC Self-Assessment, Corporation Tax, and partnership
        taxation guidance. Calculations approximate, based on 2024/25 rates.
        Actual tax depends on personal circumstances, other income, and
        allowances used. See{" "}
        <a href="https://www.gov.uk/business-tax" target="_blank" rel="noopener">gov.uk/business-tax</a>.
      </div>
    </div>
  );
}