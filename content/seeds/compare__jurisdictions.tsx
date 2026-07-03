import Link from "next/link";

export const metadata = {
  title: "Jurisdiction Comparison: UK vs Ireland — TaxSorted",
  description: "Corporation Tax, Income Tax, and overall tax burden: UK vs Ireland side by side.",
};

export default function JurisdictionsCompare() {
  return (
    <div className="container">
      <Link href="/compare" className="back-link">← All comparisons</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Jurisdictions: UK vs Ireland</h1>
        <p>Corporation Tax, Income Tax, and overall tax burden compared side by side.</p>
      </div>

      <div className="section">
        <h2>Corporation Tax</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th></th><th>UK</th><th>Ireland</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Standard rate</strong></td>
                <td>25%</td>
                <td>12.5%</td>
              </tr>
              <tr>
                <td><strong>Small profits rate</strong></td>
                <td>19% (under £50,000)</td>
                <td>12.5% (same rate, up to €50m under relief)</td>
              </tr>
              <tr>
                <td><strong>Effective rate (trading income)</strong></td>
                <td>19–25%</td>
                <td>12.5% on trading; 25% on non-trading (investment)</td>
              </tr>
              <tr>
                <td><strong>R&D super-deduction</strong></td>
                <td>Full expensing (100% on qualifying assets)</td>
                <td>25% R&D tax credit (refundable)</td>
              </tr>
              <tr>
                <td><strong>Patent box (IP income)</strong></td>
                <td>10% effective rate</td>
                <td>6.25% on qualifying patent income</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Ireland's headline 12.5% Corporation Tax rate is among the lowest in
          the EU and is a major reason multinationals (Apple, Google, Meta,
          Pfizer) base their European operations there. The UK's 25% main rate
          (raised from 19% in April 2023) is the highest in the G7.
        </p>
      </div>

      <div className="section">
        <h2>Income Tax</h2>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Band</th><th>UK rate</th><th>Ireland rate</th></tr>
            </thead>
            <tbody>
              <tr><td>Standard rate</td><td>20% (to £50,270)</td><td>20% (to €42,000 single)</td></tr>
              <tr><td>Higher rate</td><td>40% (£50,271–£125,140)</td><td>40% (above €42,000)</td></tr>
              <tr><td>Additional rate</td><td>45% (above £125,140)</td><td>40% (no additional rate)</td></tr>
              <tr><td>USC (Ireland only)</td><td>—</td><td>0.5%–8% (universal social charge)</td></tr>
              <tr><td>Personal allowance</td><td>£12,570</td><td>None (taxed from €1)</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Ireland has no Personal Allowance equivalent — income is taxed from
          the first euro. But the standard-rate band is lower, so higher-rate
          tax kicks in sooner. The USC adds a layer the UK doesn't have. For
          most earners, overall Income Tax + USC in Ireland is comparable to
          or slightly higher than the UK.
        </p>
      </div>

      <div className="section">
        <h2>VAT</h2>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th></th><th>UK</th><th>Ireland</th></tr>
            </thead>
            <tbody>
              <tr><td>Standard rate</td><td>20%</td><td>23%</td></tr>
              <tr><td>Reduced rate</td><td>5%</td><td>13.5% (9% for hospitality)</td></tr>
              <tr><td>Zero rate</td><td>Most food, books, children's clothes</td><td>Limited (some food, books, children's clothes/shoes)</td></tr>
              <tr><td>Registration threshold</td><td>£90,000</td><td>€85,000 (goods), €42,500 (services)</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>Overall tax burden</h2>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th></th><th>UK</th><th>Ireland</th></tr>
            </thead>
            <tbody>
              <tr><td>Tax-to-GDP ratio (2023)</td><td>~33.5%</td><td>~27.6%</td></tr>
              <tr><td>Corporation Tax share of revenue</td><td>~8%</td><td>~21% (unusually high, driven by multinationals)</td></tr>
              <tr><td>Key advantage</td><td>Larger market, global finance hub</td><td>Low Corporation Tax, EU access, English-speaking</td></tr>
              <tr><td>Key disadvantage</td><td>Higher Corp Tax post-2023</td><td>High housing costs, concentration risk in multinational revenue</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>The honest tradeoff</h2>
        <div className="callout callout-do">
          <h4>Why companies move to Ireland</h4>
          <p>
            If your company makes significant profits from IP (software,
            pharmaceuticals, patents) or exports, Ireland's 12.5% rate
            (effectively 6.25% on patent income) vs the UK's 25% is a genuine
            and substantial saving. On £1 million of trading profit, Ireland
            saves £125,000/year. For IP-heavy businesses, the case is strong.
          </p>
        </div>
        <div className="callout callout-skip">
          <h4>When it doesn't make sense</h4>
          <p>
            If your business is UK-focused (most customers are in the UK),
            small (under £50k profit), or service-based with no IP, the cost of
            establishing and running an Irish entity (registered office,
            director residency requirements, annual filings, cross-border tax
            complications, double taxation agreements) can outweigh the saving.
            The OECD's global minimum tax (Pillar Two, 15% effective minimum)
            also starts to erode the Irish advantage for large multinationals
            from 2024.
          </p>
        </div>
      </div>

      <div className="section">
        <h2>Coming soon: UK vs Germany, UK vs US</h2>
        <p style={{ color: "var(--fg-muted)" }}>
          We're building comparisons with Germany (45% top income tax rate, 15%
          VAT, trade tax) and the US (federal + state, S-corp vs C-corp, no
          national VAT). Sign up for updates or check back.
        </p>
      </div>

      <div className="source">
        Sources: Revenue (Ireland) tax rates, HMRC Corporation Tax rates,
        OECD tax-to-GDP data, European Commission VAT rates. Rates current as
        of 2024. See{" "}
        <a href="https://www.revenue.ie" target="_blank" rel="noopener">revenue.ie</a>
        {" "}and{" "}
        <a href="https://www.gov.uk/government/publications/corporation-tax-rates" target="_blank" rel="noopener">gov.uk corporation tax rates</a>.
      </div>
    </div>
  );
}