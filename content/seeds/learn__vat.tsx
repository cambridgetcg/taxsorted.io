import Link from "next/link";

export const metadata = {
  title: "VAT Guide — TaxSorted",
  description: "Plain-words guide to UK VAT: what it is, when to register, how to file, what to claim.",
};

export default function VATGuide() {
  return (
    <div className="container">
      <Link href="/learn" className="back-link">← All guides</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>VAT — Value Added Tax</h1>
        <p>What it is, when to register, how to file, and what you can claim back.</p>
      </div>

      <article className="guide-article">
        <h2>What it means</h2>
        <p>
          VAT is a tax on the value added at each stage of producing and selling
          goods or services. If you're a VAT-registered business, you charge
          VAT on your sales (output VAT) and reclaim VAT on your purchases (input
          VAT). The difference goes to HMRC.
        </p>
        <p>
          The standard rate is <strong>20%</strong>. There's a reduced rate of
          <strong> 5%</strong> (domestic fuel, children's car seats, some
          energy-saving items) and a <strong>zero rate</strong> (most food,
          books, children's clothes). Some things are exempt (insurance, some
          education, some healthcare) — exempt is different from zero-rated,
          and the distinction matters.
        </p>

        <div className="callout callout-do">
          <h4>What you must do</h4>
          <p>
            Register for VAT if your taxable turnover exceeds £90,000 (the
            threshold for 2024/25). Submit VAT returns — usually quarterly —
            and pay what you owe on time. Keep records of all sales and
            purchases with VAT shown separately.
          </p>
        </div>

        <h2>When to register</h2>
        <p>You must register if:</p>
        <ul>
          <li>Your VAT taxable turnover exceeds £90,000 in any 12-month rolling period.</li>
          <li>You expect it to exceed £90,000 in the next 30 days.</li>
        </ul>
        <p>
          You can register voluntarily if your turnover is below the threshold.
          This lets you reclaim input VAT on purchases — useful if you buy a lot
          of equipment or stock and your customers are VAT-registered
          businesses who don't mind being charged VAT.
        </p>

        <div className="callout callout-skip">
          <h4>What you can safely skip</h4>
          <p>
            If your turnover is well below £90,000 and your customers are
            individuals (not VAT-registered businesses), registering
            voluntarily usually makes your prices 20% higher for no benefit.
            Skip it.
          </p>
        </div>

        <h2>How to file</h2>
        <p>Most businesses file VAT returns online through HMRC's Making Tax Digital (MTD) system:</p>
        <ul>
          <li><strong>Quarterly returns</strong> — one per VAT quarter, covering a 3-month period.</li>
          <li><strong>Use MTD-compatible software</strong> — you can't just type numbers into HMRC's portal anymore. You need software that connects to HMRC (Xero, QuickBooks, FreeAgent, or TaxSorted's own filing tools when available).</li>
          <li><strong>Deadline: 1 month and 7 days</strong> after the end of the VAT period.</li>
          <li><strong>Payment deadline is the same</strong> — pay by the same date or face surcharges.</li>
        </ul>
        <p>There are several VAT schemes. The most common:</p>
        <ul>
          <li><strong>Standard scheme</strong> — account for VAT on invoices issued and received.</li>
          <li><strong>Cash accounting</strong> — account for VAT when money actually changes hands. Good if customers pay late.</li>
          <li><strong>Flat Rate Scheme</strong> — pay a fixed percentage of turnover (varies by industry). Simpler, but you can't reclaim input VAT except on capital items over £2,000. Only available for turnover under £150,000.</li>
          <li><strong>Annual accounting</strong> — one return per year, with advance payments. For turnover under £1.35m.</li>
        </ul>

        <h2>What you can claim</h2>
        <p>You can reclaim input VAT on business purchases, including:</p>
        <ul>
          <li>Stock and raw materials</li>
          <li>Equipment and machinery</li>
          <li>Business travel (not commuting)</li>
          <li>Professional fees (accountant, legal)</li>
          <li>Office supplies and software</li>
        </ul>
        <p>You <strong>cannot</strong> reclaim VAT on:</p>
        <ul>
          <li>Business entertainment (except for overseas clients)</li>
          <li>Cars bought for business use (unless you're a taxi firm, car dealer, or self-drive hire — special rules apply)</li>
          <li>Goods for personal use</li>
          <li>Anything exempt from VAT</li>
        </ul>

        <div className="callout callout-opt">
          <h4>How to optimise</h4>
          <p>
            Time major purchases to land in a VAT period where your output VAT
            is high — you'll offset more. Consider cash accounting if customers
            pay slowly. If your input VAT is regularly higher than output VAT
            (e.g., you've just invested in equipment), you'll get a refund from
            HMRC — make sure you claim it.
          </p>
        </div>

        <h2>The distinction that matters</h2>
        <blockquote>
          <p>
            <strong>Zero-rated</strong> means VAT is 0% but the item is still
            within the VAT system — you can still reclaim input VAT on related
            purchases. <strong>Exempt</strong> means the item is outside VAT
            entirely — you cannot reclaim input VAT, and if you sell mostly
            exempt items you may not be able to register for VAT at all.
          </p>
        </blockquote>

        <div className="source">
          Sources: HMRC VAT Notice 700, HMRC Making Tax Digital guidance, VAT
          Regulations 1995. Threshold figures current as of 2024/25 — always
          check{" "}
          <a href="https://www.gov.uk/vat-registration" target="_blank" rel="noopener">
            gov.uk/vat-registration
          </a>{" "}
          for the latest.
        </div>
      </article>
    </div>
  );
}