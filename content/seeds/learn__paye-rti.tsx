import Link from "next/link";

export const metadata = {
  title: "PAYE / RTI Guide — TaxSorted",
  description: "Plain-words guide to UK PAYE and RTI: employer obligations, FPS/EPS submissions, and deadlines.",
};

export default function PAYERtiGuide() {
  return (
    <div className="container">
      <Link href="/learn" className="back-link">← All guides</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>PAYE / RTI</h1>
        <p>Employer obligations, FPS/EPS submissions, and deadlines that matter.</p>
      </div>

      <article className="guide-article">
        <h2>What it means</h2>
        <p>
          PAYE (Pay As You Earn) is the system by which employers collect Income
          Tax and National Insurance from employees' wages and send it to
          HMRC. RTI (Real Time Information) is the mechanism — every time you
          pay someone, you tell HMRC about it, in real time, via a submission.
        </p>
        <p>
          If you employ anyone — including yourself as a director — and pay
          them above the National Insurance threshold, you need to operate
          PAYE.
        </p>

        <div className="callout callout-do">
          <h4>What you must do</h4>
          <p>
            Register as an employer with HMRC before your first payday. Set up
            payroll (or use a payroll service/software). Submit an FPS every
            time you pay employees. Submit an EPS when you need to adjust. Pay
            what you owe to HMRC by the 22nd of the following month (or the
            19th if paying by post). File P60s for each employee by 31 July.
          </p>
        </div>

        <h2>The two submissions: FPS and EPS</h2>
        <h3>FPS — Full Payment Submission</h3>
        <p>
          The FPS is the main submission. You send it <strong>on or before</strong>
          {" "}each payday. It tells HMRC:
        </p>
        <ul>
          <li>Who you paid</li>
          <li>How much (gross pay, tax, NI, pension contributions)</li>
          <li>For what period</li>
          <li>Any changes (new starter, leaver, change of tax code)</li>
        </ul>
        <p>
          "On or before" is the critical rule. If you pay someone on Friday, the
          FPS must reach HMRC by Friday. Sending it late — even by a day — can
          trigger penalties and causes issues with employees' tax codes.
        </p>

        <h3>EPS — Employer Payment Summary</h3>
        <p>
          The EPS is the adjustment submission. You send it monthly (or
          quarterly, if allowed) to tell HMRC about things that <em>reduce</em>
          {" "}what you owe:
        </p>
        <ul>
          <li>Statutory pay recovered (SMP, SAP, SPP, ShPP, SPBP)</li>
          <li>Construction Industry Scheme (CIS) deductions if you're a contractor in construction</li>
          <li>Employment Allowance (reduces employer NI by up to £10,500/year for 2025/26)</li>
          <li>Negative adjustments — when you overpaid HMRC and want to correct it</li>
        </ul>
        <p>
          The EPS is sent <strong>after</strong> the tax month ends (the 5th of
          each month) but before the payment deadline (the 22nd).
        </p>

        <h2>Key deadlines</h2>
        <div className="table-wrap">
          <table className="compact">
            <thead>
              <tr><th>What</th><th>When</th><th>How</th></tr>
            </thead>
            <tbody>
              <tr><td>FPS submission</td><td>On or before each payday</td><td>Payroll software → HMRC</td></tr>
              <tr><td>EPS submission</td><td>By the 19th of the following tax month</td><td>Payroll software → HMRC</td></tr>
              <tr><td>Payment to HMRC</td><td>By the 22nd of the month after payday (19th by post)</td><td>Bank transfer, Direct Debit, or CHAPS</td></tr>
              <tr><td>P60 to employees</td><td>By 31 July after tax year end</td><td>Give to employees (paper or digital)</td></tr>
              <tr><td>P45 for leavers</td><td>On the date they leave</td><td>Give parts 1A, 2, 3 to employee; submit part 1 to HMRC via FPS</td></tr>
            </tbody>
          </table>
        </div>

        <div className="callout callout-skip">
          <h4>What you can safely skip</h4>
          <p>
            If you're a one-person company paying yourself a salary at or below
            £12,570 with no other employees, and you're not claiming statutory
            pay or CIS deductions, the EPS can often be skipped — you have
            nothing to adjust. You still must send the FPS every payday, even
            if the tax and NI are zero. An FPS of "nil payment" tells HMRC the
            employment is still active.
          </p>
        </div>

        <h2>New starter or leaver</h2>
        <h3>Starter</h3>
        <ol>
          <li>Get the employee's P45 (if they have one) or have them complete a Starter Checklist.</li>
          <li>Use the tax code from the P45, or the emergency code 1257L W1/M1 if no P45.</li>
          <li>Include them on your next FPS with their start date and tax code.</li>
        </ol>
        <h3>Leaver</h3>
        <ol>
          <li>Process their final pay, including any holiday pay owed.</li>
          <li>Issue a P45 on their leaving date (parts 1A, 2, 3 to employee; part 1 to HMRC via FPS).</li>
          <li>Mark them as a leaver on your FPS for that pay period.</li>
        </ol>

        <h2>Payroll software</h2>
        <p>
          RTI submissions must be made through compatible software — you can't
          type them into HMRC's website. Options:
        </p>
        <ul>
          <li><strong>Full-service payroll software:</strong> Xero Payroll, QuickBooks Payroll, FreeAgent, Sage, BrightPay, Moneysoft.</li>
          <li><strong>Bureau/outsourced:</strong> An accountant or payroll bureau handles it for you.</li>
          <li><strong>HMRC's Basic PAYE Tools:</strong> Free, very basic, suitable only for very simple setups.</li>
        </ul>

        <div className="callout callout-opt">
          <h4>How to optimise</h4>
          <p>
            Claim the Employment Allowance — it reduces your employer NI bill
            by up to £10,500 per year (2025/26). You claim it via your EPS.
            Most employers qualify; the main exclusions are companies where
            the sole director earns above £10,500 and has no other employees
            (you can still claim if you have a second employee). Also, if you
            pay a director at or below the NI primary threshold (£12,570), you
            owe zero employee NI and zero employer NI — the salary still
            qualifies them for state pension and counts as a deductible
            expense for Corporation Tax.
          </p>
        </div>

        <h2>Penalties</h2>
        <p>HMRC penalties for RTI failures:</p>
        <ul>
          <li>Late FPS: scaled from £100 to £400 per month depending on employee count.</li>
          <li>Late payment: interest plus potential surcharges (1%–4% of what you owe).</li>
          <li>Incorrect returns: if HMRC believes you were careless or deliberately wrong, penalties scale from 0% to 100% of the tax due.</li>
        </ul>
        <p>
          HMRC generally doesn't charge penalties for occasional, minor late
          submissions — they look at the pattern over the tax year. But they
          can, and do, for repeated lateness.
        </p>

        <div className="source">
          Sources: HMRT PAYE for employers, RTI guidance, Employment Allowance
          rules 2025/26, HMRC late filing and late payment penalties. Check{" "}
          <a href="https://www.gov.uk/running-payroll" target="_blank" rel="noopener">gov.uk/running-payroll</a>
          {" "}for current deadlines and thresholds.
        </div>
      </article>
    </div>
  );
}