import Link from "next/link";

export const metadata = {
  title: "Capital Gains Tax Guide — TaxSorted",
  description: "Plain-words guide to UK Capital Gains Tax: allowances, rates, reporting, and how to reduce what you owe.",
};

export default function CGTGuide() {
  return (
    <div className="container">
      <Link href="/learn" className="back-link">← All guides</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Capital Gains Tax</h1>
        <p>Allowances, rates, reporting, and how to reduce what you owe.</p>
      </div>

      <article className="guide-article">
        <h2>What it means</h2>
        <p>
          Capital Gains Tax (CGT) is a tax on the profit (gain) when you sell
          something that's gone up in value — shares, a second property,
          business assets, most things that aren't your main home. You pay tax
          on the <strong>gain</strong>, not the sale price.
        </p>
        <p>
          Example: you buy shares for £10,000 and sell them for £25,000. Your
          gain is £15,000. CGT applies to the £15,000, not the £25,000.
        </p>

        <div className="callout callout-do">
          <h4>What you must do</h4>
          <p>
            Report and pay CGT in the tax year you made the gain. For property
            (residential, not your main home): report and pay within 60 days of
            the sale completion. For other assets: report via Self-Assessment
            by 31 January after the tax year ends. If your total gains are
            above the annual allowance, you must report them even if no tax is
            due.
          </p>
        </div>

        <h2>The annual allowance</h2>
        <p>The Annual Exempt Amount (AEA) — how much gain is tax-free each year:</p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Tax year</th><th>Allowance</th></tr>
            </thead>
            <tbody>
              <tr><td>2022/23</td><td>£12,300</td></tr>
              <tr><td>2023/24</td><td>£6,000</td></tr>
              <tr><td>2024/25</td><td>£3,000</td></tr>
              <tr><td>2025/26</td><td>£3,000</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          The allowance was cut sharply. Plan accordingly — if you have assets
          to sell, spreading them across tax years so each year's gain stays
          within the £3,000 allowance can save you real money.
        </p>

        <h2>Rates</h2>
        <p>CGT rates depend on your Income Tax band and the asset type:</p>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>Asset</th><th>Basic rate payer</th><th>Higher/Additional rate</th></tr>
            </thead>
            <tbody>
              <tr><td>Most assets (shares, business assets)</td><td>10%</td><td>20%</td></tr>
              <tr><td>Residential property (not main home)</td><td>18%</td><td>24%</td></tr>
              <tr><td>Carried interest (fund managers)</td><td colSpan={2}>Special rules</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Your gains are added to your income to determine which band they fall
          in. If your income uses up the basic rate band, your gains are taxed
          at the higher rate.
        </p>
        <p>
          <strong>Note:</strong> The residential property CGT rates were reduced
          from 28% to 24% from 6 April 2024. The non-property rates (10%/20%)
          were raised to 18%/24% from 30 October 2024. Always check current
          rates.
        </p>

        <div className="callout callout-skip">
          <h4>What you can safely skip</h4>
          <p>
            You don't pay CGT on your main home (it's exempt under Private
            Residence Relief). You don't pay CGT on ISAs, PEPs, Premium Bonds,
            UK government bonds (gilts), or personal possessions worth less than
            £6,000. You don't pay CGT on gifts to your spouse or civil partner,
            or to charity.
          </p>
        </div>

        <h2>How to report</h2>
        <h3>Property gains</h3>
        <p>
          Since the 60-day reporting window was introduced (October 2019,
          extended from 30 to 60 days in October 2020), you must:
        </p>
        <ol>
          <li>Calculate your gain (sale price minus purchase price minus allowable costs).</li>
          <li>Apply the annual allowance if not already used.</li>
          <li>Calculate tax based on your Income Tax band.</li>
          <li>Report via HMRC's online CGT on UK property service within 60 days of completion.</li>
          <li>Pay the tax owed.</li>
        </ol>
        <h3>Other gains (shares, business assets)</h3>
        <p>
          Report via Self-Assessment. If you don't normally file a return, you
          can use HMRC's "report capital gains" online service. Deadline: 31
          January after the tax year ends.
        </p>

        <h2>Reliefs that reduce CGT</h2>
        <h3>Private Residence Relief</h3>
        <p>
          Your main home is exempt from CGT. If you've lived in it the whole
          time you owned it, no CGT. If you let part of it out, or used part for
          business, or were away for extended periods, partial relief applies
          — there are specific rules for each.
        </p>
        <h3>Business Asset Disposal Relief (BADR, formerly Entrepreneurs' Relief)</h3>
        <p>
          If you sell shares in your own trading company (and you meet the
          qualifying conditions), the CGT rate is <strong>10%</strong> on the
          first £1 million of gains in your lifetime. For 2024/25 and earlier,
          it's 10%. From 6 April 2025, it rises to 14%, and from 6 April 2026,
          to 18%. This is a significant relief — if you're selling a business,
          timing matters.
        </p>
        <h3>Investors' Relief</h3>
        <p>
          Similar to BADR but for external investors in unlisted trading
          companies. 10% rate on up to £10 million lifetime gains. Conditions
          include holding shares for at least 3 years (raised to 5 years for
          disposals after 6 April 2025).
        </p>
        <h3>Losses</h3>
        <p>
          If you make a loss on a sale, you can offset it against other gains
          in the same year, or carry it forward to future years. You must
          report losses to HMRC to preserve them — they don't apply
          automatically.
        </p>

        <div className="callout callout-opt">
          <h4>How to optimise</h4>
          <p>
            <strong>Time sales across tax years</strong> — split a large sale
            across April so part falls in each year's allowance.{" "}
            <strong>Transfer assets to your spouse</strong> — transfers are
            tax-free, doubling the household allowance to £6,000 (2024/25).{" "}
            <strong>Use BADR</strong> if you're selling your business — 10%
            instead of 20% on up to £1m. <strong>Hold shares in ISAs</strong>{" "}
            — gains inside an ISA are CGT-free. <strong>Report losses</strong>{" "}
            — they carry forward forever and offset future gains.
          </p>
        </div>

        <blockquote>
          <p>
            <strong>Bed and ISA</strong> — selling shares outside an ISA and
            repurchasing them inside an ISA (same-day repurchase is now allowed
            again) can move assets into the CGT-free wrapper. The 30-day "bed
            and breakfast" rule was a complication; same-day purchases are now
            treated as a repurchase, not a new buy, which simplifies this.
          </p>
        </blockquote>

        <div className="source">
          Sources: HMRC Capital Gains Tax guidance, BADR rules, Private
          Residence Relief, Annual Exempt Amount changes, HMRC CGT on UK
          property service. Current as of 2024/25 with announced changes for
          2025/26 and 2026/27. Check{" "}
          <a href="https://www.gov.uk/capital-gains-tax" target="_blank" rel="noopener">gov.uk/capital-gains-tax</a>
          {" "}for the latest.
        </div>
      </article>
    </div>
  );
}