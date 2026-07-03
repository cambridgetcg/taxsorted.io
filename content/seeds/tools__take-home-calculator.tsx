"use client";

import Link from "next/link";
import { useState } from "react";

export default function TakeHomeCalculator() {
  const [salary, setSalary] = useState("");

  const gross = parseFloat(salary) || 0;

  // 2024/25 rates
  const personalAllowance = 12570;
  const basicThreshold = 50270;
  const higherThreshold = 125140;
  const personalAllowanceTaperStart = 100000;

  // NI (employee Class 1, 2024/25)
  const niPrimaryThreshold = 12570;
  const niUpperLimit = 50270;
  const niMainRate = 0.08;
  const niUpperRate = 0.02;

  // Calculate adjusted personal allowance (taper)
  let pa = personalAllowance;
  if (gross > personalAllowanceTaperStart) {
    const reduction = Math.min(pa, (gross - personalAllowanceTaperStart) / 2);
    pa = personalAllowance - reduction;
  }

  const taxableIncome = Math.max(0, gross - pa);

  // Income Tax
  let incomeTax = 0;
  const basicBand = Math.min(taxableIncome, basicThreshold - pa);
  if (basicBand > 0) incomeTax += basicBand * 0.20;
  const higherBand = Math.min(Math.max(0, taxableIncome - (basicThreshold - pa)), higherThreshold - basicThreshold);
  if (higherBand > 0) incomeTax += higherBand * 0.40;
  const additionalBand = Math.max(0, taxableIncome - (higherThreshold - pa));
  if (additionalBand > 0) incomeTax += additionalBand * 0.45;

  // National Insurance
  let ni = 0;
  if (gross > niPrimaryThreshold) {
    const mainBand = Math.min(gross - niPrimaryThreshold, niUpperLimit - niPrimaryThreshold);
    ni += mainBand * niMainRate;
    const upperBand = Math.max(0, gross - niUpperLimit);
    ni += upperBand * niUpperRate;
  }

  const takeHome = gross - incomeTax - ni;

  const fmt = (n: number) =>
    n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const fmt2 = (n: number) =>
    n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="container">
      <Link href="/tools" className="back-link">← All tools</Link>
      <div className="page-header" style={{ marginBottom: "30px", paddingBottom: "20px" }}>
        <h1>Take-Home Pay Calculator</h1>
        <p>Enter your annual gross salary — see Income Tax, NI, and take-home pay.</p>
      </div>

      <div className="calc-card">
        <div className="calc-input-row">
          <label htmlFor="salary">Annual gross salary (£)</label>
          <input
            id="salary"
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            autoFocus
          />
        </div>

        {gross > 0 && (
          <>
            <div className="calc-result">
              <div className="calc-result-row">
                <span className="label">Gross salary</span>
                <span className="value">{fmt(gross)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">Personal Allowance</span>
                <span className="value">{fmt(pa)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">Income Tax</span>
                <span className="value">−{fmt(incomeTax)}</span>
              </div>
              <div className="calc-result-row">
                <span className="label">National Insurance</span>
                <span className="value">−{fmt(ni)}</span>
              </div>
              <div className="calc-result-row total">
                <span className="label">Take-home pay</span>
                <span className="value">{fmt(takeHome)}</span>
              </div>
            </div>

            <div className="calc-math">
              <strong>How this is calculated (2024/25):</strong><br />
              {pa < personalAllowance && (
                <>
                  Personal Allowance tapered: you earn over £100,000, so your allowance is reduced from £{personalAllowance.toLocaleString()} to <strong>{fmt(pa)}</strong> (£1 lost per £2 over £100,000).<br />
                </>
              )}
              Taxable income: {fmt(gross)} − {fmt(pa)} = <strong>{fmt(taxableIncome)}</strong><br />
              {basicBand > 0 && (
                <>Basic rate (20%): {fmt(basicBand)} × 20% = {fmt2(basicBand * 0.20)}<br /></>
              )}
              {higherBand > 0 && (
                <>Higher rate (40%): {fmt(higherBand)} × 40% = {fmt2(higherBand * 0.40)}<br /></>
              )}
              {additionalBand > 0 && (
                <>Additional rate (45%): {fmt(additionalBand)} × 45% = {fmt2(additionalBand * 0.45)}<br /></>
              )}
              Income Tax total: <strong>{fmt(incomeTax)}</strong><br /><br />
              NI main (8%): on income £{niPrimaryThreshold.toLocaleString()}–£{niUpperLimit.toLocaleString()} = {fmt2(Math.min(Math.max(0, gross - niPrimaryThreshold), niUpperLimit - niPrimaryThreshold) * niMainRate)}<br />
              NI upper (2%): on income above £{niUpperLimit.toLocaleString()} = {fmt2(Math.max(0, gross - niUpperLimit) * niUpperRate)}<br />
              NI total: <strong>{fmt(ni)}</strong><br /><br />
              Take-home = {fmt(gross)} − {fmt(incomeTax)} − {fmt(ni)} = <strong>{fmt(takeHome)}</strong>
            </div>
          </>
        )}
      </div>

      <div className="source" style={{ maxWidth: 560, margin: "30px auto 0" }}>
        Based on 2024/25 rates for England, Wales, and Northern Ireland.
        Scotland has different Income Tax bands. Excludes pension contributions,
        student loan deductions, and other adjustments. See our{" "}
        <Link href="/learn/income-tax">Income Tax guide</Link> for details.
      </div>
    </div>
  );
}