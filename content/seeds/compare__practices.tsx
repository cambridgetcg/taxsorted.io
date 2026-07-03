import Link from "next/link";

export const metadata = {
  title: "Sensible vs Risky Practices — TaxSorted",
  description: "What's legal tax optimisation vs what crosses the line. Honest tradeoffs, plain words.",
};

export default function PracticesCompare() {
  return (
    <div className="container">
      <Link href="/compare" className="back-link">← All comparisons</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Sensible vs risky practices</h1>
        <p>What's legal tax optimisation vs what crosses the line. Honest tradeoffs, plain words.</p>
      </div>

      <div className="section">
        <h2>The principle</h2>
        <blockquote>
          <p>
            <strong>Tax avoidance</strong> is legal — using the rules as written
            to reduce your tax bill. <strong>Tax evasion</strong> is illegal —
            hiding income, fabricating expenses, not declaring what you owe.
            The line between them can blur, and HMRC has wide powers to challenge
            arrangements that technically follow the letter of the law but
            abuse its spirit.
          </p>
        </blockquote>
        <p>
          The UK has a "Disclosure of Tax Avoidance Schemes" (DOTAS) regime and
          the General Anti-Abuse Rule (GAAR). If a scheme feels too clever,
          requires you to sign an NDA, or involves routing money through
            structures you don't understand, it's probably in the risky zone.
        </p>
      </div>

      <div className="section">
        <h2>Side by side</h2>
        <div className="compare-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div className="compare-card sensible">
            <div className="icon">✓ Sensible</div>
            <h4>Use ISA allowances</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Put savings and investments in an ISA (£20,000/year). All gains and income are tax-free. Designed by Parliament for exactly this purpose.</p>
          </div>
          <div className="compare-card risky">
            <div className="icon">✗ Risky</div>
            <h4>Offshore "investment bonds" with loans</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Schemes that use offshore bonds + loans to defer or avoid tax. Aggressively challenged by HMRC. High penalty exposure if challenged and you lose.</p>
          </div>
        </div>

        <div className="compare-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: "20px" }}>
          <div className="compare-card sensible">
            <div className="icon">✓ Sensible</div>
            <h4>Directors' salary at NI threshold</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Pay £12,570 salary — deductible for Corporation Tax, no NI cost, counts toward state pension. Take the rest as dividends. Standard, well-understood structure.</p>
          </div>
          <div className="compare-card risky">
            <div className="icon">✗ Risky</div>
            <h4>"Managing director gets zero salary" schemes</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Taking all income as dividends via a complex loan arrangement. HMRC's settlement legislation (ITA 2007 s444) and the loans-to-participators rules specifically target this.</p>
          </div>
        </div>

        <div className="compare-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: "20px" }}>
          <div className="compare-card sensible">
            <div className="icon">✓ Sensible</div>
            <h4>Full Expensing / AIA on equipment</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Claim 100% capital allowances on qualifying equipment. Government explicitly introduced this to encourage investment.</p>
          </div>
          <div className="compare-card risky">
            <div className="icon">✗ Risky</div>
            <h4>Film partnership / heritage relief schemes</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Schemes offering 50%+ tax relief on "investments" in films or heritage property. The relief may be real but the investment often loses all your capital. HMRC retroactively challenges many.</p>
          </div>
        </div>

        <div className="compare-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: "20px" }}>
          <div className="compare-card sensible">
            <div className="icon">✓ Sensible</div>
            <h4>Spouse salary (genuine work)</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Employ your spouse for actual work at a market-rate salary. Deductible, shifts income to a lower taxpayer. Legitimate if the work is real and the pay is reasonable.</p>
          </div>
          <div className="compare-card risky">
            <div className="icon">✗ Risky</div>
            <h4>Spouse "salary" with no work</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Paying a spouse who does nothing for the business. If HMRC investigates, the salary is disallowed and back-taxed, with penalties. The work must be real and documented.</p>
          </div>
        </div>

        <div className="compare-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: "20px" }}>
          <div className="compare-card sensible">
            <div className="icon">✓ Sensible</div>
            <h4>Transfer assets to spouse before sale</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Gift shares to your spouse (tax-free transfer), then sell — doubles the £3,000 CGT annual allowance to £6,000. Explicitly allowed by the legislation.</p>
          </div>
          <div className="compare-card risky">
            <div className="icon">✗ Risky</div>
            <h4>Spouse transfer with immediate buy-back</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Transfer to spouse on one day, buy back the next, to use their allowance without genuinely transferring ownership. HMRC treats this as a sham.</p>
          </div>
        </div>

        <div className="compare-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", marginTop: "20px" }}>
          <div className="compare-card sensible">
            <div className="icon">✓ Sensible</div>
            <h4>Pension contributions</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Pay into a pension — gets tax relief at your marginal rate, up to £60,000/year (or your earnings if lower). Employer pension contributions are also deductible for Corporation Tax. Government designed this to encourage saving for retirement.</p>
          </div>
          <div className="compare-card risky">
            <div className="icon">✗ Risky</div>
            <h4>Pension "recycling" schemes</h4>
            <p style={{ fontSize: "15px", color: "var(--fg-muted)" }}>Take tax-free lump sum from pension, immediately reinvest to get more tax relief. HMRC's "recycling" rules specifically target this — can result in 40%–55% tax charge on the lump sum.</p>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>The test we use</h2>
        <div className="callout callout-do">
          <h4>Three questions to ask</h4>
          <p>
            <strong>1. Would this arrangement exist if there were no tax
            advantage?</strong> If yes — it's probably legitimate (pensions,
            ISAs, salary). If no — it's probably avoidance and carries risk.<br/>
            <strong>2. Can I explain it in one sentence without
            embarrassment?</strong> If you can't tell your accountant, your
            spouse, or a journalist what you're doing and why, that's a sign.<br/>
            <strong>3. What happens if HMRC challenges it?</strong> If the
            answer is "I'd owe back tax plus penalties plus interest," the risk
            is real. If the answer is "nothing — it's explicitly allowed by the
            legislation," you're fine.
          </p>
        </div>
      </div>

      <div className="section">
        <h2>What TaxSorted recommends</h2>
        <p>
          Use every allowance and relief that Parliament designed for you. ISAs,
          pensions, capital allowances, directors' salary optimisation, spouse
          transfers with genuine work, BADR on business sales. These are the
          rules working as intended.
        </p>
        <p>
          Avoid anything that requires secrecy, complex offshore structures,
          or schemes that look like tax-driven theatre. The saving is often
          smaller than the penalties, and the stress of an HMRC investigation
          — which can last years and cost £50,000+ in professional fees — is not
          worth it.
        </p>
        <blockquote>
          <p>
            <strong>Built from love, not extraction.</strong> TaxSorted helps
            you optimise within the rules. We never help you break them.
          </p>
        </blockquote>
      </div>

      <div className="source">
        Sources: HMRC tax avoidance guidance, GAAR guidance, DOTAS rules,
        ITA 2007, FA 2020+ provisions. General principles — specific schemes
        change but the tests remain. See{" "}
        <a href="https://www.gov.uk/government/collections/tax-avoidance" target="_blank" rel="noopener">gov.uk tax avoidance</a>.
      </div>
    </div>
  );
}